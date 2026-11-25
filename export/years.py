"""The year files: one per observed year, TYNDP 2024 climate year and TYNDP 2026 weather scenario
(SPECIFICATION.md R-DATA-8; docs/PLAN.md §3.1-3.2; schema/year.schema.json).

Each builder returns (year object, lineage map, fills): the lineage map names, for every series
in the file, the dataset ids of the database rows it was made from (R-PROV-1). What the engine
may not see is never read here: no price of EE, LV or LT goes into a year file (R-BND-3); those
prices go to the validation files, which the engine never loads.
"""

from __future__ import annotations

import dataclasses
import math
from collections import defaultdict

import numpy as np
import pandas as pd

from pipeline.config import ZONES

from . import axis
from .write import scalar, series

CORE = ("EE", "LV", "LT")
BOUNDARY = ("FI", "SE4", "PL")
BORDERS = ("EE-FI", "EE-LV", "LV-LT", "LT-SE4", "LT-PL")
# the AC border whose published capacity (A31) still holds what is allocated to balancing
# (R-LINK-5). LV-LT's does not: its day-ahead schedule stops at A31 itself (D-077)
RESERVED_BORDERS = ("EE-LV",)
RESERVES = {("FCR", "sym"): "FCR_sym", ("aFRR", "up"): "aFRR_up", ("aFRR", "down"): "aFRR_down",
            ("mFRR", "up"): "mFRR_up", ("mFRR", "down"): "mFRR_down"}
# the Baltic balancing capacity market delivered from 2025-02-05 00:00 local, 2025-02-04 23:00 UTC
# (R-STO-5); before it no reserve is held out of the day-ahead market (PLAN O-2)
RESERVE_MARKET_START = pd.Timestamp("2025-02-04 23:00")
# fuel-burning technologies whose weekly maximum output is their availability in an observed
# year (R-SUP-6's "week's maximum"; D-022): outages, reserve status and mothballing are in it
THERMAL = ("biomass", "coal_gas", "gas", "hard_coal", "oil", "oil_shale", "peat")
RESERVOIR = ("daugava",)                # units run by a weekly budget and a minimum flow
HYDRO_OBSERVED: dict[str, dict[str, tuple[str, ...]]] = {
    "LV": {"daugava": ("hydro_ror", "hydro_reservoir")}, "LT": {"kruonis": ("hydro_ps",)}}
# observed output the engine takes as given in a replay: wind and solar (scaled by the capacity
# the user sets, R-SUP-2), small run-of-river, waste and the unclassified rest. Hydro that runs
# on a weekly budget, CHP (a fitted must-run, R-SUP-5) and everything dispatched by price are
# the engine's own result: their observed output goes to the validation file only (R-VAL-3).
GIVEN = ("wind_onshore", "wind_offshore", "solar", "hydro_ror", "waste", "other",
         "other_renewable")
# the virtual hub at the Nordic end of a boundary zone's cable to the Baltic states (D-075)
# where a boundary zone's cable clears, when not at the zone's price: (JAO endpoint, hub)
HUB = {"SE4": ("fbDomainShadowPrice", "SE4_NB"), "FI": ("fbDomainShadowPrice", "FI_EL"),
       "PL": ("shadowPrices", "PL")}
MIN_COVERAGE = 0.9                  # share of a year's hours a series must report to be used
# EstLink's offered capacity as Fingrid publishes it: fills the hours A31 does not (R-DATA-11)
FINGRID_NTC = {("EE-FI", "fwd"): "da_cap_ee_fi_mw", ("EE-FI", "rev"): "da_cap_fi_ee_mw"}
J_PER_MWH = 3.6e9                           # SI definition of the watt-hour


class Lineage:
    """series name -> sorted dataset ids."""

    def __init__(self) -> None:
        self.map: dict[str, set[str]] = defaultdict(set)

    def add(self, name: str, ids) -> None:
        ids = [i for i in ids if i]
        if not ids:
            raise ValueError(f"{name}: no lineage")
        self.map[name].update(ids)

    def as_json(self) -> dict[str, list[str]]:
        return {k: sorted(v) for k, v in sorted(self.map.items())}


def _frame(con, sql: str, params) -> pd.DataFrame:
    return con.execute(sql, params).fetchdf()


def daugava_inflow_factor(con) -> tuple[float, list[str], dict[int, float]] | None:
    """D-070 (ERRATA E-063): TYNDP 2024 gives the Daugava cascade about half the water the record
    shows. The factor that brings its weekly inflow to the record's level: the average, over the
    climate years the record also covers in full, of Latvia's observed hydro output (ENTSO-E A75)
    to TYNDP 2024's inflow of that climate year, to two decimals. Returns the factor, the datasets
    behind it and the ratio per year; None where the database holds no such inflow."""
    # the sums exact (math.fsum), never the order the database adds the rows in (ERRATA E-060)
    t = _frame(con, "SELECT climate_year AS y, list(value) AS xs, list(DISTINCT lineage_id) "
                    "AS ids FROM hydro_inflow WHERE zone='LV' AND category='pondage' AND "
                    "variable='INFLOW' AND target_year=2030 GROUP BY 1 ORDER BY 1", [])
    if t.empty:
        return None
    t["mwh"] = [math.fsum(xs) * 1000 for xs in t["xs"]]
    techs = HYDRO_OBSERVED["LV"]["daugava"]
    o = _frame(con, "SELECT year(ts) AS y, list(mw) AS xs, count(DISTINCT ts) AS n, "
                    "list(DISTINCT lineage_id) AS ids FROM generation WHERE zone='LV' AND tech IN "
                    f"({','.join('?' * len(techs))}) GROUP BY 1 ORDER BY 1", list(techs))
    o["mwh"] = [math.fsum(xs) for xs in o["xs"]]
    o = o[o.n >= 8700]                            # a full year of the record
    both = t.merge(o, on="y", suffixes=("_t", "_o"))
    both = both[both.mwh_t > 0]
    if both.empty:
        raise ValueError("no climate year has both TYNDP 2024's Daugava inflow and a full year of "
                         "the record: the inflow factor of D-070 cannot be derived")
    ratios = {int(r.y): float(r.mwh_o / r.mwh_t) for r in both.itertuples()}
    ids = sorted({i for r in both.itertuples() for i in list(r.ids_t) + list(r.ids_o)})
    return round(sum(ratios.values()) / len(ratios), 2), ids, ratios


BAND_YEARS = range(2020, 2026)     # the full observed years the application replays (D-071)


def daugava_band(con) -> dict | None:
    """D-071: the band a scenario holds the Daugava cascade to, read off the record as a replay's
    is (D-044). For every full week of BAND_YEARS with an average output above 20 MW: the week's
    10th and 90th percentile hour over its average. The weeks are split into thirds by their
    average, and each third gives the median of the two ratios, to two decimals, and the highest
    average it holds. None where the record has no such week."""
    techs = HYDRO_OBSERVED["LV"]["daugava"]
    rows, ids = [], set()
    for y in BAND_YEARS:
        g = _frame(con, "SELECT ts, sum(mw) AS mw, list(DISTINCT lineage_id) AS ids FROM "
                        f"generation WHERE zone='LV' AND tech IN ({','.join('?' * len(techs))}) "
                        "AND year(ts)=? GROUP BY ts ORDER BY ts", [*techs, y])
        if len(g) < 8700:
            continue
        a = g.mw.to_numpy(dtype=float)
        full = len(a) // 168
        mean = axis.weekly_sums(a)[:full] / 168
        p10, p90 = axis.weekly_quantile(a, 0.1)[:full], axis.weekly_quantile(a, 0.9)[:full]
        rows += [(m, lo / m, hi / m) for m, lo, hi in zip(mean, p10, p90, strict=True) if m > 20]
        ids |= {i for x in g.ids for i in x}
    if len(rows) < 3:
        return None
    rows.sort()
    third = len(rows) // 3
    bins = []
    for i in range(3):
        part = rows[i * third:(i + 1) * third if i < 2 else len(rows)]
        bins.append({"up_to_mw": scalar(part[-1][0], 0),
                     "p10": round(float(np.median([r[1] for r in part])), 2),
                     "p90": round(float(np.median([r[2] for r in part])), 2)})
    return {"bins": bins, "weeks": len(rows), "years": [BAND_YEARS[0], BAND_YEARS[-1]],
            "src": sorted(ids)}


REAL_YEARS = (2025,)     # observed years offered as a neighbours' profile in scenario runs (D-051)


def _hourly(df: pd.DataFrame, idx, name: str, fills: list, value: str = "mw"):
    s = pd.Series(df[value].to_numpy(dtype=float), index=pd.DatetimeIndex(df["ts"]))
    a, f = axis.align_observed(s, idx, name)
    if f:
        fills.append(f)
    return a


def _boundary_observed(con, k: str, idx, name: str, lin: Lineage, fills: list,
                       notes: list) -> np.ndarray:
    """A boundary zone's observed price at its end of the cable (R-BND-3): its day-ahead price
    (A44) and, since the Nordic flow-based go-live, the price at the virtual hub at the Nordic
    end of the zone's cable — the zone's price plus the network constraints' part of the hub's
    spread (JAO, pipeline.sources.jao.hub_spreads; D-075). Poland's, since the Core flow-based
    go-live, is its day-ahead price less the shadow price of Poland's allocation constraint
    (pipeline.sources.jao.core_spread; D-076)."""
    lo, hi = idx[0], idx[-1] + pd.Timedelta(hours=1)
    d = _frame(con, "SELECT ts, eur_mwh, lineage_id FROM price WHERE zone=? AND ts>=? AND "
                    "ts<? ORDER BY ts", [k, lo, hi])
    price = _hourly(d, idx, name, fills, "eur_mwh")
    lin.add(name, d.lineage_id.unique())
    endpoint, hub = HUB.get(k, (None, None))
    sp = _frame(con, "SELECT ts, value, lineage_id FROM jao_series WHERE endpoint=? AND "
                     "field=? AND ts>=? AND ts<? ORDER BY ts",
                [endpoint, f"spread_{hub}", lo, hi]) if hub else None
    if sp is None or sp.empty:
        return price
    add = pd.Series(sp.value.to_numpy(dtype=float), index=pd.DatetimeIndex(sp.ts))
    add = add.reindex(idx).fillna(0.0).to_numpy()
    lin.add(name, sp.lineage_id.unique())
    what = (f"the price Poland's interconnectors clear at — {k}'s day-ahead price less the "
            "shadow price of Poland's allocation constraint" if k == "PL" else
            f"the price at the virtual hub {hub} — {k}'s day-ahead price plus the flow-based "
            "network constraints' part of the hub's spread")
    notes.append(f"{name}: from {sp.ts.min():%Y-%m-%d %H:%M} UTC {what}, {len(sp)} hours, average "
                 f"{float(np.mean(add)):+.2f} EUR/MWh over the year "
                 f"({'D-076' if k == 'PL' else 'D-075'})")
    return price + add


# --------------------------------------------------------------------- observed years

def last_observed_year(con) -> int:
    """The export's last observed year, from the data and never the clock, so that one database
    gives one export on any day (R-DATA-5): the latest year of the core zones' load whose core
    series all reach a whole day, else the year before."""
    t = _frame(con, "SELECT max(ts) AS t FROM load WHERE zone IN ('EE','LV','LT')", [])["t"].iloc[0]
    year = pd.Timestamp(t).year
    return year if _reached(con, year) >= 24 else year - 1


def observed_hours(con, year: int) -> int:
    """How many leading hours of `year` the export covers: the whole year once the data run into a
    later one, and in the last year the hours up to the last one every core series has reached. Gaps
    inside the covered hours are filled by the rules of axis.py or stop the export; the transfer
    capacity, whose publication has gaps of weeks, never shortens a year (it is filled)."""
    if year < last_observed_year(con):
        return len(axis.observed_index(year))
    return _reached(con, year)


def _reached(con, year: int) -> int:
    """The leading hours of `year` every core series has reached: the core zones' load and
    generation, the boundary zones' prices; 0 where one has no hour of it."""
    idx = axis.observed_index(year)
    lo, hi = idx[0], idx[-1] + pd.Timedelta(hours=1)
    ends = []
    for sql in ("SELECT zone AS k, max(ts) AS t FROM load WHERE ts >= ? AND ts < ? AND zone IN "
                "('EE','LV','LT') GROUP BY zone",
                "SELECT zone AS k, max(ts) AS t FROM price WHERE ts >= ? AND ts < ? AND zone IN "
                "('FI','SE4','PL') GROUP BY zone",
                "SELECT zone AS k, max(ts) AS t FROM generation WHERE ts >= ? AND ts < ? AND "
                "zone IN ('EE','LV','LT') GROUP BY zone"):
        d = _frame(con, sql, [lo, hi])
        if len(d) < 3:
            return 0
        ends.append(d["t"].min())
    return int((min(ends) - lo) / pd.Timedelta(hours=1)) + 1


def observed(con, year: int, params: dict) -> tuple[dict, Lineage, list]:
    hours = observed_hours(con, year)
    full = axis.hours_of(year)
    if hours < 24:
        raise ValueError(f"{year}: no complete day of data")
    idx = axis.observed_index(year)[:hours]
    lo, hi = idx[0], idx[-1] + pd.Timedelta(hours=1)
    lin, notes = Lineage(), []
    fills: list[axis.Fill] = []
    zones = {}
    for z in CORE:
        zone: dict = {}
        d = _frame(con, "SELECT ts, mw, lineage_id FROM load WHERE zone=? AND ts>=? AND ts<? "
                        "ORDER BY ts", [z, lo, hi])
        zone["load"] = series(_hourly(d, idx, f"zones.{z}.load", fills), "mw")
        lin.add(f"zones.{z}.load", d.lineage_id.unique())
        g = _frame(con, "SELECT tech, ts, mw, lineage_id FROM generation WHERE zone=? AND ts>=? "
                        "AND ts<? ORDER BY tech, ts", [z, lo, hi])
        zone["gen"] = {}
        gen_arrays = {}
        weekly = {t for techs in HYDRO_OBSERVED.get(z, {}).values() for t in techs}
        for tech, gt in g.groupby("tech", sort=True):
            if tech not in GIVEN and tech not in weekly and tech not in THERMAL:
                continue
            if gt.ts.nunique() < MIN_COVERAGE * hours:
                notes.append(f"zones.{z}.gen.{tech}: ENTSO-E A75 reports {gt.ts.nunique()} of "
                             f"{hours} hours; not used, output 0")
                continue
            a = _generation(gt, idx, f"zones.{z}.gen.{tech}", fills)
            gen_arrays[tech] = a
            if tech in GIVEN and tech not in weekly:
                zone["gen"][tech] = series(a, "mw")
                lin.add(f"zones.{z}.gen.{tech}", gt.lineage_id.unique())
        thermal = {t: a for t, a in gen_arrays.items() if t in THERMAL}
        if thermal:
            zone["thermal_weekly_max_mw"] = {}
            for tech, a in sorted(thermal.items()):
                zone["thermal_weekly_max_mw"][tech] = series(axis.weekly_max(a), "mw")
                lin.add(f"zones.{z}.thermal_weekly_max_mw.{tech}",
                        g[g.tech == tech].lineage_id.unique())
                # the week's 10th percentile hour: what the technology ran whatever the price,
                # a replay's least output for it beside the fitted floor (D-073)
                zone.setdefault("thermal_weekly_p10_mw", {})[tech] = series(
                    axis.weekly_quantile(a, 0.1), "mw")
                lin.add(f"zones.{z}.thermal_weekly_p10_mw.{tech}",
                        g[g.tech == tech].lineage_id.unique())
        c = _frame(con, "SELECT tech, mw, lineage_id FROM capacity WHERE zone=? AND year=? "
                        "ORDER BY tech", [z, year])
        zone["capacity"] = {r.tech: scalar(r.mw, 1) for r in c.itertuples()}
        for r in c.itertuples():
            lin.add(f"zones.{z}.capacity.{r.tech}", [r.lineage_id])
        w = _frame(con, "SELECT ts, temperature_c, lineage_id FROM weather WHERE zone=? AND "
                        "ts>=? AND ts<? ORDER BY ts", [z, lo, hi])
        zone["temperature_c"] = series(_hourly(w, idx, f"zones.{z}.temperature_c", fills,
                                               "temperature_c"), "temperature")
        lin.add(f"zones.{z}.temperature_c", w.lineage_id.unique())
        res = _reserve(con, z, idx, lin, fills)
        if z == "LV" and "battery" in zone["capacity"]:
            _without_ast(zone, res, params, lin, year)
        if res:
            zone["reserve"] = res
        units = HYDRO_OBSERVED.get(z, {})
        if units:
            zone["hydro_weekly_mwh"] = {}
            for unit, techs in units.items():
                a = sum((gen_arrays[t] for t in techs if t in gen_arrays),
                        start=np.zeros(hours))
                zone["hydro_weekly_mwh"][unit] = series(axis.weekly_sums(a), "mwh")
                lin.add(f"zones.{z}.hydro_weekly_mwh.{unit}",
                        g[g.tech.isin(techs)].lineage_id.unique())
                if unit == "kruonis":
                    # the plant's weekly maximum output: the power a replay gives it that week,
                    # as the weekly maxima are the other plants' availability (D-073)
                    zone.setdefault("hydro_weekly_max_mw", {})[unit] = series(
                        axis.weekly_max(a), "mw")
                    lin.add(f"zones.{z}.hydro_weekly_max_mw.{unit}",
                            g[g.tech.isin(techs)].lineage_id.unique())
                if unit in RESERVOIR:
                    # the reservoir's observed weekly minimum: its minimum flow in the replay
                    # (R-ENG-5's "documented minimum flow" in an observed year, D-022)
                    zone.setdefault("hydro_weekly_min_mw", {})[unit] = series(
                        axis.weekly_min(a), "mw")
                    lin.add(f"zones.{z}.hydro_weekly_min_mw.{unit}",
                            g[g.tech.isin(techs)].lineage_id.unique())
                    # and its observed weekly maximum: what the turbines gave to the day-ahead
                    # market after outages, reserves and water levels, as thermal_weekly_max_mw
                    # is for the fuel-burning plants (D-042)
                    zone.setdefault("hydro_weekly_max_mw", {})[unit] = series(
                        axis.weekly_max(a), "mw")
                    lin.add(f"zones.{z}.hydro_weekly_max_mw.{unit}",
                            g[g.tech.isin(techs)].lineage_id.unique())
                    # the band a replay holds the cascade to: the week's 10th and 90th
                    # percentile hour, its range without the extreme hours (D-044)
                    for key, q in (("hydro_weekly_p10_mw", 0.1), ("hydro_weekly_p90_mw", 0.9)):
                        zone.setdefault(key, {})[unit] = series(axis.weekly_quantile(a, q), "mw")
                        lin.add(f"zones.{z}.{key}.{unit}",
                                g[g.tech.isin(techs)].lineage_id.unique())
        zones[z] = zone
    boundary: dict[str, dict] = {}
    for k in BOUNDARY:
        price = _boundary_observed(con, k, idx, f"boundary.{k}.observed", lin, fills, notes)
        boundary[k] = {"observed": series(price, "price")}
    borders = {}
    for b in BORDERS:
        entry = {}
        for direction in ("fwd", "rev"):
            name = f"borders.{b}.ntc_{direction}"
            entry[f"ntc_{direction}"] = series(_ntc(con, b, direction, idx, name, lin, fills),
                                               "mw")
            if b in RESERVED_BORDERS:
                r = _reserved(con, b, direction, idx, name.replace("ntc", "reserved"), lin, fills)
                if r is not None:
                    entry[f"reserved_{direction}"] = r
        borders[b] = entry
    months = sorted(set(idx.month))
    obj = {"contract": 1,
           "meta": {"key": str(year), "kind": "observed", "family": "observed", "year": year,
                    "hours": hours, "complete": hours == full,
                    "start_utc": f"{year}-01-01T00:00:00Z", "weight": None,
                    "target_year": None, "weather": None, "climate_model": None,
                    "reserve_start_hour": _reserve_start(idx),
                    "labels": {}, "filled": [f.as_json() for f in fills], "notes": notes},
           "zones": zones, "boundary": boundary, "borders": borders,
           "fuel": _fuel(con, year, months, lin, params)}
    return obj, lin, fills


def _ntc(con, border: str, direction: str, idx, name: str, lin: Lineage,
         fills: list) -> np.ndarray:
    """Offered day-ahead capacity (A31, R-LINK-2). Hours A31 does not publish take Fingrid's
    official EstLink capacity where it exists (R-DATA-11), then the same hour of the nearest
    week with data (axis.fill_weekly)."""
    lo, hi = idx[0], idx[-1] + pd.Timedelta(hours=1)
    d = _frame(con, "SELECT ts, mw, lineage_id FROM ntc WHERE border=? AND direction=? "
                    "AND ts>=? AND ts<? ORDER BY ts", [border, direction, lo, hi])
    lin.add(name, d.lineage_id.unique())
    s = pd.Series(d.mw.to_numpy(dtype=float), index=pd.DatetimeIndex(d.ts))
    s = s[~s.index.duplicated(keep="first")].reindex(idx)
    fg = FINGRID_NTC.get((border, direction))
    if fg and s.isna().any():
        f = _frame(con, "SELECT ts, value, lineage_id FROM tso_series WHERE source='fingrid' "
                        "AND series=? AND ts>=? AND ts<? ORDER BY ts", [fg, lo, hi])
        fs = pd.Series(f.value.to_numpy(dtype=float), index=pd.DatetimeIndex(f.ts))
        fs = fs[~fs.index.duplicated(keep="first")].reindex(idx)
        take = s.isna() & fs.notna()
        if take.any():
            s[take] = fs[take]
            hours = tuple(int(h) for h in np.flatnonzero(take.to_numpy()))
            fills.append(axis.Fill(name, f"Fingrid {fg} where A31 is not published", hours))
            lin.add(name, f[f.ts.isin(idx[take.to_numpy()])].lineage_id.unique())
    a, fill = axis.fill_weekly(s.dropna(), idx, name)
    if fill:
        fills.append(fill)
        # an hour the weekly rule fills inside a published forced outage of the border (A78)
        # carries no more than the outage leaves: last week's value would open a cable that was
        # out (ERRATA E-073, D-091; NordBalt from 2025-03-29 to 2025-04-02). Planned outages are
        # not used: their records outlive cancelled work (NordBalt ran on 2025-09-10 inside a
        # planned week at 0 MW)
        cap, src = _outage_cap(con, border, direction, idx)
        held = [h for h in fill.hours if cap[h] < a[h]]
        if held:
            a[held] = cap[held]
            fills.append(axis.Fill(name, "the A78 outage's available capacity where A31 is not "
                                         "published", tuple(held)))
            lin.add(name, sorted(set(src[held])))       # the events that hold, no other (E-084)
    return a


def _outage_cap(con, border: str, direction: str, idx) -> tuple[np.ndarray, np.ndarray]:
    """Per hour of `idx`, the least capacity a published forced transmission outage of the border
    and direction leaves (ENTSO-E A78, the border's available MW during the event), +inf where
    none covers the hour, and the lineage id of the event that sets it. An event covers every
    hour it overlaps."""
    lo, hi = idx[0], idx[-1] + pd.Timedelta(hours=1)
    u = _frame(con, "SELECT start_ts, end_ts, mw_available, lineage_id FROM unavailability "
                    "WHERE kind='transmission' AND NOT planned AND border=? AND direction=? AND "
                    "start_ts<? AND end_ts>? AND mw_available IS NOT NULL "
                    "ORDER BY start_ts, lineage_id",
               [border, direction, hi, lo])
    cap = np.full(len(idx), np.inf)
    src = np.full(len(idx), None, dtype=object)
    starts = idx.to_numpy()
    for r in u.itertuples():
        a = np.searchsorted(starts, np.datetime64(pd.Timestamp(r.start_ts).floor("h")), "left")
        b = np.searchsorted(starts, np.datetime64(pd.Timestamp(r.end_ts)), "left")
        if b > a:
            lower = float(r.mw_available) < cap[a:b]
            cap[a:b] = np.where(lower, float(r.mw_available), cap[a:b])
            src[a:b] = np.where(lower, r.lineage_id, src[a:b])
    return cap, src


def _generation(gt: pd.DataFrame, idx, name: str, fills: list) -> np.ndarray:
    """A technology's hourly output. Hours before a technology's first report in the year are
    0 (it did not exist or was not yet reported: batteries in 2025, a new class); inner gaps are
    filled as any other series."""
    s = pd.Series(gt.mw.to_numpy(dtype=float), index=pd.DatetimeIndex(gt.ts))
    s = s[~s.index.duplicated(keep="first")]
    first = s.index.min()
    if first > idx[0]:
        lead = idx[idx < first]
        s = pd.concat([pd.Series(0.0, index=lead), s])
        fills.append(axis.Fill(name, "0 before the first report of the year",
                               tuple(range(len(lead)))))
    a, f = axis.align_observed(s, idx, name)
    if f:
        fills.append(f)
    return a


AST_LAST_RESERVE_YEAR = 2028   # R-STO-8 holds AST's battery in the TSO's reserve to 2028


def _without_ast(zone: dict, res: dict | None, params: dict, lin: Lineage, year: int) -> None:
    """R-STO-8 (D-102): AST's reserve battery is outside the day-ahead fleet to 2028. Where A68
    counts Latvia's batteries (2026 on) it leaves them, and the FCR and aFRR it holds leave the
    procured reserve the fleet holds — else the fleet would hold AST's reserve on Utilitas'
    10 MW."""
    if year > AST_LAST_RESERVE_YEAR:
        return
    ast = params["tso.ast_battery.mw"]
    zone["capacity"]["battery"] = scalar(max(0.0, zone["capacity"]["battery"] - ast["value"]), 1)
    lin.add("zones.LV.capacity.battery", [ast["lineage_id"]])
    for name, key in (("FCR_sym", "tso.ast_battery.fcr_mw"),
                      ("aFRR_up", "tso.ast_battery.afrr_mw")):
        if res and name in res:
            res[name] = series(np.maximum(0.0, np.asarray(res[name], dtype=float)
                                          - params[key]["value"]), "mw")
            lin.add(f"zones.LV.reserve.{name}", [params[key]["lineage_id"]])


def _reserve_start(idx) -> int | None:
    if idx[-1] < RESERVE_MARKET_START:
        return None
    return max(0, int((RESERVE_MARKET_START - idx[0]) / pd.Timedelta(hours=1)))


def _reserve(con, zone: str, idx, lin: Lineage, fills: list) -> dict | None:
    """Procured balancing capacity from the market start (R-STO-6); 0 before it (PLAN O-2)."""
    start = _reserve_start(idx)
    if start is None:
        return None
    lo, hi = idx[0], idx[-1] + pd.Timedelta(hours=1)
    d = _frame(con, "SELECT product, direction, ts, mw, lineage_id FROM reserve_procured WHERE "
                    "zone=? AND ts>=? AND ts<? ORDER BY product, direction, ts", [zone, lo, hi])
    out = {}
    sub_idx = idx[start:]
    for (prod, direction), name in RESERVES.items():
        part = d[(d["product"] == prod) & (d["direction"] == direction)]
        full = np.zeros(len(idx))
        if not part.empty:
            # an hour the report does not list had nothing procured in that product (the
            # products opened on different dates; Estonia bought no aFRR up for four weeks
            # of February-March 2025)
            s = pd.Series(part.mw.to_numpy(dtype=float), index=pd.DatetimeIndex(part.ts))
            s = s[~s.index.duplicated(keep="first")].reindex(sub_idx)
            empty = np.flatnonzero(s.isna().to_numpy())
            if len(empty):
                fills.append(axis.Fill(f"zones.{zone}.reserve.{name}",
                                       "0 where the report lists no procurement",
                                       tuple(int(start + h) for h in empty)))
            full[start:] = s.fillna(0.0).to_numpy()
            lin.add(f"zones.{zone}.reserve.{name}", part.lineage_id.unique())
        out[name] = series(full, "mw")
    return out


def _reserved(con, border: str, direction: str, idx, name: str, lin: Lineage,
              fills: list[axis.Fill]):
    """Cross-border capacity allocated to balancing on an AC border (R-LINK-5): aFRR + mFRR,
    0 before the balancing capacity market and a reported 0 in an hour missing after its first;
    None when the year has no allocation. Since 7 October 2026 the report also carries «FRR», the
    two together (ERRATA E-199): it counts only in an hour without aFRR and mFRR."""
    lo, hi = idx[0], idx[-1] + pd.Timedelta(hours=1)
    d = _frame(con, "SELECT ts, coalesce(sum(mw) FILTER (WHERE product <> 'FRR'), sum(mw)) AS mw, "
                    "list(DISTINCT lineage_id) AS ids FROM "
                    "balancing_cb WHERE border=? AND direction=? AND ts>=? AND ts<? "
                    "GROUP BY ts ORDER BY ts", [border, direction, lo, hi])
    if d.empty:
        return None
    s = pd.Series(d.mw.to_numpy(dtype=float), index=pd.DatetimeIndex(d.ts))
    r = s.reindex(idx)
    gap = np.flatnonzero(r.isna().to_numpy() & (idx >= s.index[0]))
    if len(gap):                         # every fill is reported (axis.py), this one too
        fills.append(axis.Fill(name, "0 in an hour the allocation misses after its first",
                               tuple(int(h) for h in gap)))
    a = r.fillna(0.0).to_numpy()
    lin.add(name, sorted({i for ids in d.ids for i in ids}))
    return series(a, "mw")


def _fuel(con, year: int, months: list[int], lin: Lineage, params: dict) -> dict:
    """Monthly fuel and CO2 prices of an observed year in euros (R-SUP-3, OPEN-13); a month's
    average is the exact sum of its rows (math.fsum), never the order the database adds them in
    (E-060)."""
    d = _frame(con, "SELECT commodity, month(ts) AS m, list(price) AS xs, "
                    "list(DISTINCT lineage_id) AS ids FROM commodity WHERE year(ts)=? AND "
                    "commodity IN ('gas_ttf','eua','usd_per_eur') GROUP BY ALL", [year])
    got = {(r.commodity, r.m): (math.fsum(r.xs) / len(r.xs), r.ids) for r in d.itertuples()}
    need = [(c, m) for c in ("gas_ttf", "eua", "usd_per_eur") for m in months]
    missing = [k for k in need if k not in got]
    if missing:
        raise ValueError(f"{year}: monthly prices missing for {missing[:4]}")
    fx = np.array([got[("usd_per_eur", m)][0] for m in months])
    mwh_per_mmbtu = params["unit.j_per_btu_it"]["value"] * 1e6 / J_PER_MWH
    gas = np.array([got[("gas_ttf", m)][0] for m in months]) / fx / mwh_per_mmbtu
    eua = np.array([got[("eua", m)][0] for m in months])
    ids = {c: sorted({i for m in months for i in got[(c, m)][1]})
           for c in ("gas_ttf", "eua", "usd_per_eur")}
    lin.add("fuel.usd_per_eur", ids["usd_per_eur"])
    lin.add("fuel.gas_eur_mwh_th", ids["gas_ttf"] + ids["usd_per_eur"]
            + [params["unit.j_per_btu_it"]["lineage_id"]])
    lin.add("fuel.eua_eur_t", ids["eua"])
    return {"gas_eur_mwh_th": series(gas, "price"), "eua_eur_t": series(eua, "price"),
            "usd_per_eur": series(fx, "share")}


# --------------------------------------------------------------------- scenario years

TYNDP2024_HYDRO = {"LV": {"daugava": "pondage"}, "LT": {"ror": "ror"}}
TYNDP2026_HYDRO = {"LV": {"daugava": "pondage"}, "LT": {"ror": "ror"}}
RANK_TARGET_YEAR = 2030                       # PECD and demand layout the ranks are read from


def ranks(con) -> dict[int, dict]:
    """R-TIME-4: each PECD climate year's Estonian onshore-wind and solar capacity factor and
    demand-shape peak, with its rank among all climate years (1 = the lowest)."""
    wind = _frame(con, "SELECT climate_year AS cy, avg(cf) AS v FROM pecd_profile WHERE zone='EE' "
                       "AND tech='wind_onshore' AND target_year=? GROUP BY cy",
                  [RANK_TARGET_YEAR]).set_index("cy")["v"]
    solar = _frame(con, "SELECT climate_year AS cy, avg(cf) AS v FROM pecd_profile WHERE "
                        "zone='EE' AND tech='solar' AND target_year=? GROUP BY cy",
                   [RANK_TARGET_YEAR]).set_index("cy")["v"]
    # the peak at 2009's annual energy, as the Weather page gives it: a run scales every year to
    # the scenario's energy, so the year's shape is what it brings
    peak = _frame(con, "SELECT climate_year AS cy, max(mw) / sum(mw) AS v FROM demand_profile "
                       "WHERE zone='EE' AND scenario='national_trends' AND target_year=? GROUP BY "
                       "cy", [RANK_TARGET_YEAR]).set_index("cy")["v"]
    peak = peak * _frame(con, "SELECT sum(mw) AS e FROM demand_profile WHERE zone='EE' AND "
                              "scenario='national_trends' AND target_year=? AND climate_year=2009",
                         [RANK_TARGET_YEAR]).e.iloc[0]
    out = {}
    for cy in wind.index:
        out[int(cy)] = {
            "pecd_target_year": RANK_TARGET_YEAR, "years": int(len(wind)),
            "ee_wind_onshore_cf": scalar(wind[cy], 3),
            "ee_wind_onshore_rank": int((wind < wind[cy]).sum() + 1),
            "ee_solar_cf": scalar(solar[cy], 3),
            "ee_solar_rank": int((solar < solar[cy]).sum() + 1),
            "ee_demand_peak_mw": scalar(peak[cy], 0),
            "ee_demand_peak_rank": int((peak < peak[cy]).sum() + 1)}
    return out


def climate(con, cy: int, params: dict, labels: dict) -> tuple[dict, Lineage, list]:
    """A TYNDP 2024 climate year: demand shapes, capacity factors and hydro inflow of the core
    zones for each target year the package has, temperature of the year, and every boundary
    price profile published for it (R-TIME-2, R-BND-5)."""
    lin = Lineage()
    fills: list[axis.Fill] = []
    zones = {}
    for z in CORE:
        zone: dict = {"demand": {"nt_profile": {}}, "cf": {}}
        d = _frame(con, "SELECT target_year AS ty, hour, mw, lineage_id FROM demand_profile WHERE "
                        "zone=? AND scenario='national_trends' AND climate_year=? "
                        "ORDER BY ty, hour", [z, cy])
        for ty, g in d.groupby("ty", sort=True):
            name = f"zones.{z}.demand.nt_profile.{ty}"
            zone["demand"]["nt_profile"][str(ty)] = series(axis.layout_series(g.mw, name), "mw")
            lin.add(name, g.lineage_id.unique())
        p = _frame(con, "SELECT tech, target_year AS ty, hour, cf, lineage_id FROM pecd_profile "
                        "WHERE zone=? AND climate_year=? ORDER BY tech, ty, hour", [z, cy])
        for (tech, ty), g in p.groupby(["tech", "ty"], sort=True):
            name = f"zones.{z}.cf.{tech}.{ty}"
            zone["cf"].setdefault(tech, {})[str(ty)] = series(
                np.clip(axis.layout_series(g.cf, name), 0, 1), "cf")
            lin.add(name, g.lineage_id.unique())
        zone["temperature_c"] = _climate_temperature(con, z, cy, lin, fills)
        hydro: dict[str, dict] = {}
        hmax: dict[str, dict] = {}
        factor = daugava_inflow_factor(con) if z == "LV" else None    # D-070
        for unit, cat in TYNDP2024_HYDRO.get(z, {}).items():
            h = _frame(con, "SELECT variable, target_year AS ty, week, value, lineage_id FROM "
                            "hydro_inflow WHERE zone=? AND category=? AND climate_year=? AND "
                            "variable IN ('INFLOW', 'MAX_TURB') ORDER BY variable, ty, week",
                       [z, cat, cy])
            for (var, ty), g in h.groupby(["variable", "ty"], sort=True):
                weeks = g.set_index("week")["value"].reindex(range(1, 54))
                if var == "INFLOW":                  # GWh per week -> MWh
                    name = f"zones.{z}.hydro_weekly_mwh.{unit}.{ty}"
                    # to the record's level
                    scale = factor[0] if factor and unit == "daugava" else 1.0
                    hydro.setdefault(unit, {})[str(ty)] = series(
                        weeks.fillna(0.0).to_numpy() * 1000 * scale, "mwh")
                    if factor and scale != 1.0:
                        lin.add(name, factor[1])
                # PEMMDB's "maximum generating power", MW: kept as the source gives it and not
                # read by the engine, since for the Daugava it is no limit (D-070)
                elif weeks.notna().all() and (weeks > 0).any():
                    name = f"zones.{z}.hydro_weekly_max_mw.{unit}.{ty}"
                    hmax.setdefault(unit, {})[str(ty)] = series(weeks.to_numpy(), "mw")
                else:
                    continue
                lin.add(name, g.lineage_id.unique())
        if hydro:
            zone["hydro_weekly_mwh"] = hydro
        if hmax:
            zone["hydro_weekly_max_mw"] = hmax
        zones[z] = zone
    boundary: dict[str, dict] = {}
    for k in BOUNDARY:
        d = _frame(con, "SELECT scenario, target_year AS ty, hour, eur_mwh, lineage_id FROM "
                        "tyndp_price WHERE zone=? AND climate_year=? ORDER BY scenario, ty, hour",
                   [k, cy])
        boundary[k] = {}
        for (sc, ty), g in d.groupby(["scenario", "ty"], sort=True):
            name = f"boundary.{k}.{sc}_{ty}"
            a, f = axis.tyndp_price_to_layout(g.eur_mwh, name, (sc, int(ty)) in axis.TYNDP_LATE)
            fills.append(f)
            boundary[k][f"{sc}_{ty}"] = series(a, "price")
            lin.add(name, g.lineage_id.unique())
        # the neighbours' prices as they were in a past year, hour by hour of that year (D-051): a
        # level and a shape to hold a scenario against, not weather-coherent with the climate year
        for real in REAL_YEARS:
            ridx = axis.observed_index(real)
            if len(ridx) != axis.LAYOUT_HOURS:
                raise ValueError(f"{real}: {len(ridx)} hours; a real profile needs a 365-day year")
            name = f"boundary.{k}.REAL_{real}"
            # the series that year's replay takes: the price at the zone's end of the cable (D-075),
            # begun at its first Monday as the layout's 1 January is one, so its weekends fall on
            # the layout's; the days before that Monday close the year (D-100)
            n = len(fills)
            a, fills[n:] = _from_first_monday(
                _boundary_observed(con, k, ridx, name, lin, fills, []), ridx[0], fills[n:])
            boundary[k][f"REAL_{real}"] = series(a, "price")
        # the neighbours tight, from energiamudel's own research on Finland, Sweden and Poland
        # (D-121), on the climate years' layout, frozen at the fuels they were computed with
        r = _frame(con, "SELECT profile, target_year AS ty, eur_mwh, lineage_id FROM "
                        "research_price WHERE zone=? AND climate_year=? ORDER BY profile, ty, hour",
                   [k, cy])
        for (pr, ty), g in r.groupby(["profile", "ty"], sort=True):
            name = f"boundary.{k}.{pr}_{ty}"
            if len(g) != axis.LAYOUT_HOURS:
                raise ValueError(f"{name}: {len(g)} hours, the layout has {axis.LAYOUT_HOURS}")
            boundary[k][f"{pr}_{ty}"] = series(g.eur_mwh.to_numpy(), "price")
            lin.add(name, g.lineage_id.unique())
    weight = params[f"climate_year.weight.{cy}"]
    lin.add("meta.weight", [weight["lineage_id"]])
    obj = {"contract": 1,
           "meta": {"key": f"cy{cy}", "kind": "climate", "family": "tyndp2024", "year": cy,
                    "hours": axis.LAYOUT_HOURS, "complete": True, "start_utc": None,
                    "weight": weight["value"], "target_year": None, "weather": None,
                    "climate_model": None, "reserve_start_hour": None, "labels": labels,
                    "filled": [f.as_json() for f in fills]},
           "zones": zones, "boundary": boundary, "borders": {}}
    return obj, lin, fills


def _from_first_monday(a: np.ndarray, first: pd.Timestamp,
                       fills: list[axis.Fill]) -> tuple[np.ndarray, list[axis.Fill]]:
    """D-100: a year's hourly series begun at its first Monday, as the layout's year begins on
    one, the days before it closing the year; the fills recorded on its hours move with it."""
    shift = 24 * ((7 - first.dayofweek) % 7)
    moved = [dataclasses.replace(f, hours=tuple(sorted((h - shift) % len(a) for h in f.hours)))
             for f in fills]
    return np.roll(a, -shift), moved


def _climate_temperature(con, z: str, cy: int, lin: Lineage, fills: list) -> list:
    idx = axis.observed_index(cy)
    w = _frame(con, "SELECT ts, temperature_c, lineage_id FROM weather WHERE zone=? AND "
                    "year(ts)=? ORDER BY ts", [z, cy])
    name = f"zones.{z}.temperature_c"
    a = _hourly(w, idx, name, fills, "temperature_c")
    lin.add(name, w.lineage_id.unique())
    return series(a[axis.drop_feb29(idx)], "temperature")


def weather(con, code: str, params: dict) -> tuple[dict, Lineage, list]:
    """A TYNDP 2026 weather scenario of National Trends+ (D-010): demand components, capacity
    factors and hydro inflow of the core zones, the boundary prices, and the labelled proxies
    the package lacks (Estonian solar, temperature; DECISIONS D-015)."""
    lin = Lineage()
    fills: list[axis.Fill] = []
    m = _frame(con, "SELECT * FROM tyndp2026_weather WHERE code=?", [code]).iloc[0]
    ty = int(m.target_year)
    zones = {}
    for z in CORE:
        zone: dict = {"demand": {}, "cf": {}}
        d = _frame(con, "SELECT component, hour, mw, lineage_id FROM tyndp2026_demand WHERE "
                        "zone=? AND weather=? ORDER BY component, hour", [z, code])
        for comp, g in d.groupby("component", sort=True):
            name = f"zones.{z}.demand.{comp}.{ty}"
            zone["demand"][comp] = {str(ty): series(axis.layout_series(g.mw, name), "mw")}
            lin.add(name, g.lineage_id.unique())
        p = _frame(con, "SELECT tech, series AS s, hour, cf, lineage_id FROM tyndp2026_pecd WHERE "
                        "zone=? AND weather=? ORDER BY tech, s, hour", [z, code])
        for (tech, s), g in p.groupby(["tech", "s"], sort=True):
            key = _pecd2026_key(tech, s, set(p.s[p.tech == tech]))
            name = f"zones.{z}.cf.{key}.{ty}"
            zone["cf"][key] = {str(ty): series(np.clip(axis.layout_series(g.cf, name), 0, 1),
                                                "cf")}
            lin.add(name, g.lineage_id.unique())
        zone["temperature_c"] = _temperature_proxy(con, z, lin, fills)
        hydro = {}
        for unit, cat in TYNDP2026_HYDRO.get(z, {}).items():
            h = _frame(con, "SELECT day, mwh, lineage_id FROM tyndp2026_hydro WHERE zone=? AND "
                            "category=? AND weather=? ORDER BY day", [z, cat, code])
            if h.empty:
                continue
            name = f"zones.{z}.hydro_weekly_mwh.{unit}.{ty}"
            hydro[unit] = {str(ty): series(axis.daily_to_weekly(h.mwh.to_numpy()), "mwh")}
            lin.add(name, h.lineage_id.unique())
        if hydro:
            zone["hydro_weekly_mwh"] = hydro
        zones[z] = zone
    # Estonia has no solar series in the package: the Latvian series of the same weather
    # scenario stands in, labelled (methodology §3, D-015)
    if "solar" not in zones["EE"]["cf"]:
        zones["EE"]["cf"]["solar"] = zones["LV"]["cf"]["solar"]
        lin.add(f"zones.EE.cf.solar.{ty}", lin.map[f"zones.LV.cf.solar.{ty}"])
        fills.append(axis.Fill(f"zones.EE.cf.solar.{ty}",
                               "proxy: Latvia's solar series of the same weather scenario",
                               tuple(range(axis.LAYOUT_HOURS))))
    boundary: dict[str, dict] = {}
    for k in BOUNDARY:
        d = _frame(con, "SELECT hour, eur_mwh, lineage_id FROM tyndp2026_price WHERE zone=? AND "
                        "weather=? ORDER BY hour", [k, code])
        name = f"boundary.{k}.NTplus_{ty}"
        boundary[k] = {f"NTplus_{ty}": series(axis.layout_series(d.eur_mwh, name), "price")}
        lin.add(name, d.lineage_id.unique())
    lin.add("meta.weight", [m.lineage_id])
    labels = {"ee_wind_onshore_cf": _mean_cf(zones["EE"]["cf"], "wind_onshore", ty),
              "ee_solar_cf": _mean_cf(zones["EE"]["cf"], "solar", ty),
              "ee_solar_proxy": "LV"}
    obj = {"contract": 1,
           "meta": {"key": code.lower(), "kind": "weather", "family": "tyndp2026",
                    "year": int(m.climate_year), "hours": axis.LAYOUT_HOURS, "complete": True,
                    "start_utc": None, "weight": float(m.weight), "target_year": ty,
                    "weather": code, "climate_model": m.climate_model,
                    "reserve_start_hour": None, "labels": labels,
                    "filled": [f.as_json() for f in fills]},
           "zones": zones, "boundary": boundary, "borders": {}}
    return obj, lin, fills


def _pecd2026_key(tech: str, s: str, have: set[str]) -> str:
    """solar/utility -> 'solar'; solar/rooftop -> 'solar' when it is the only solar series of
    the zone, else 'solar_rooftop'; wind keeps its technology."""
    if tech != "solar":
        return tech
    if s == "utility" or have == {"rooftop"}:
        return "solar"
    return "solar_rooftop"


def _mean_cf(cf: dict, key: str, ty: int):
    return scalar(float(np.mean(cf[key][str(ty)])), 3) if key in cf else None


def _temperature_proxy(con, z: str, lin: Lineage, fills: list) -> list:
    """The zone's 2020-2025 average temperature for each hour of the layout year: modelled weather
    years have no temperature series in the TYNDP 2026 package (D-015)."""
    w = _frame(con, "SELECT ts, temperature_c, lineage_id FROM weather WHERE zone=? AND "
                    "year(ts) BETWEEN 2020 AND 2025 ORDER BY ts", [z])
    w = w[~((w.ts.dt.month == 2) & (w.ts.dt.day == 29))]
    doy = (w.ts.dt.dayofyear - ((w.ts.dt.is_leap_year) & (w.ts.dt.month > 2)).astype(int)) - 1
    hoy = doy * 24 + w.ts.dt.hour
    mean = w.groupby(hoy)["temperature_c"].mean().reindex(range(axis.LAYOUT_HOURS))
    if mean.isna().any():
        raise ValueError(f"{z}: temperature proxy has empty hours")
    name = f"zones.{z}.temperature_c"
    lin.add(name, w.lineage_id.unique())
    fills.append(axis.Fill(name, "proxy: average of 2020-2025 at the same hour of the year",
                           tuple(range(axis.LAYOUT_HOURS))))
    return series(mean.to_numpy(), "temperature")


# --------------------------------------------------------------------- validation and labels

def validation_observed(con, year: int, hours: int) -> tuple[dict, Lineage]:
    """What the model is measured against in an observed year (R-VAL-3, R-VAL-4): the core zones'
    prices, every technology's output, flows and scheduled exchanges per border and direction,
    net positions, and EstLink's capacity as Fingrid and JAO publish it. Never an engine input."""
    idx = axis.observed_index(year)[:hours]
    lo, hi = idx[0], idx[-1] + pd.Timedelta(hours=1)
    lin = Lineage()
    fills: list[axis.Fill] = []
    out: dict = {"contract": 1, "key": str(year), "hours": hours, "price": {}, "gen": {},
                 "load": {}, "flow": {}, "scheduled": {}, "net_position": {}, "estlink": {}}
    for z in CORE:
        d = _frame(con, "SELECT ts, eur_mwh, lineage_id FROM price WHERE zone=? AND ts>=? AND "
                        "ts<? ORDER BY ts", [z, lo, hi])
        out["price"][z] = series(_hourly(d, idx, f"price.{z}", fills, "eur_mwh"), "price")
        lin.add(f"validation.price.{z}", d.lineage_id.unique())
        d = _frame(con, "SELECT ts, mw, lineage_id FROM load WHERE zone=? AND ts>=? AND ts<? "
                        "ORDER BY ts", [z, lo, hi])
        out["load"][z] = series(_hourly(d, idx, f"load.{z}", fills), "mw")
        lin.add(f"validation.load.{z}", d.lineage_id.unique())
        g = _frame(con, "SELECT tech, ts, mw, lineage_id FROM generation WHERE zone=? AND ts>=? "
                        "AND ts<? ORDER BY tech, ts", [z, lo, hi])
        out["gen"][z] = {}
        for tech, gt in g.groupby("tech", sort=True):
            s = pd.Series(gt.mw.to_numpy(dtype=float), index=pd.DatetimeIndex(gt.ts))
            # a technology's unreported hours count as 0 here: the metric is annual energy
            out["gen"][z][tech] = series(s[~s.index.duplicated()].reindex(idx).fillna(0.0), "mw")
            lin.add(f"validation.gen.{z}.{tech}", gt.lineage_id.unique())
        d = _frame(con, "SELECT ts, mw, lineage_id FROM net_position WHERE zone=? AND ts>=? AND "
                        "ts<? ORDER BY ts", [z, lo, hi])
        if len(d):
            s = pd.Series(d.mw.to_numpy(dtype=float), index=pd.DatetimeIndex(d.ts))
            out["net_position"][z] = series(s[~s.index.duplicated()].reindex(idx).fillna(0.0),
                                            "mw")
            lin.add(f"validation.net_position.{z}", d.lineage_id.unique())
    for table, key in (("flow", "flow"), ("scheduled_exchange", "scheduled")):
        for b in BORDERS:
            for direction in ("fwd", "rev"):
                d = _frame(con, f"SELECT ts, mw, lineage_id FROM {table} WHERE border=? AND "
                                f"direction=? AND ts>=? AND ts<? ORDER BY ts",
                           [b, direction, lo, hi])
                if d.empty:                      # nothing published for this direction
                    continue
                s = pd.Series(d.mw.to_numpy(dtype=float), index=pd.DatetimeIndex(d.ts))
                out[key].setdefault(b, {})[direction] = series(
                    s[~s.index.duplicated()].reindex(idx).fillna(0.0), "mw")
                lin.add(f"validation.{key}.{b}.{direction}", d.lineage_id.unique())
    for series_name in ("da_cap_ee_fi_mw", "da_cap_fi_ee_mw"):
        d = _frame(con, "SELECT ts, value, lineage_id FROM tso_series WHERE source='fingrid' AND "
                        "series=? AND ts>=? AND ts<? ORDER BY ts", [series_name, lo, hi])
        if len(d):
            s = pd.Series(d.value.to_numpy(dtype=float), index=pd.DatetimeIndex(d.ts))
            # to Fingrid's last hour of the year: a series it ended is not carried on (ERRATA E-195)
            span = idx[idx <= s.index.max()]
            out["estlink"][f"fingrid_{series_name}"] = series(
                s[~s.index.duplicated()].reindex(span).ffill().bfill(), "mw")
            lin.add(f"validation.estlink.fingrid_{series_name}", d.lineage_id.unique())
    out["filled"] = [f.as_json() for f in fills]
    return out, lin


def validation_scenario(con, key: str, family: str, ref) -> tuple[dict, Lineage]:
    """TYNDP's own prices of the core zones in a scenario year: a benchmark for comparison,
    never an engine input (D-007)."""
    lin = Lineage()
    out: dict = {"contract": 1, "key": key, "hours": axis.LAYOUT_HOURS, "tyndp_price": {}}
    for z in CORE:
        if family == "tyndp2024":
            d = _frame(con, "SELECT scenario, target_year AS ty, hour, eur_mwh, lineage_id FROM "
                            "tyndp_price WHERE zone=? AND climate_year=? ORDER BY ALL", [z, ref])
            out["tyndp_price"][z] = {}
            for (sc, ty), g in d.groupby(["scenario", "ty"], sort=True):
                a, _ = axis.tyndp_price_to_layout(g.eur_mwh, f"{z}.{sc}_{ty}",
                                                  (sc, int(ty)) in axis.TYNDP_LATE)
                out["tyndp_price"][z][f"{sc}_{ty}"] = series(a, "price")
                lin.add(f"validation.tyndp_price.{z}.{sc}_{ty}", g.lineage_id.unique())
        else:
            d = _frame(con, "SELECT hour, eur_mwh, lineage_id FROM tyndp2026_price WHERE zone=? "
                            "AND weather=? ORDER BY hour", [z, ref])
            ty = int(_frame(con, "SELECT target_year FROM tyndp2026_weather WHERE code=?",
                            [ref]).iloc[0, 0])
            out["tyndp_price"][z] = {f"NTplus_{ty}": series(axis.layout_series(
                d.eur_mwh, f"{z}.NTplus"), "price")}
            lin.add(f"validation.tyndp_price.{z}.NTplus_{ty}", d.lineage_id.unique())
    return out, lin


# UMM names areas by EIC code; only messages between two of the six zones label a border here
# (R-LINK-1: Russia, Belarus and Kaliningrad stay out)
UMM_AREAS = {z.eic: z.code for z in ZONES.values()}


def attribution(con, year: int) -> tuple[dict, Lineage]:
    """Labels for the observed transfer capacity (R-LINK-6): ENTSO-E A78 transmission outages of
    the five borders and Nord Pool UMM messages between the six zones, overlapping the year."""
    lo, hi = pd.Timestamp(f"{year}-01-01"), pd.Timestamp(f"{year + 1}-01-01")
    lin = Lineage()
    a78 = _frame(con, "SELECT border, direction, asset, start_ts, end_ts, mw_available, "
                      "mw_nominal, planned, reason, lineage_id FROM unavailability WHERE "
                      "kind='transmission' AND start_ts < ? AND end_ts > ? ORDER BY ALL",
                 [hi, lo])
    events = [{"border": r.border, "direction": r.direction, "asset": r.asset,
               "start": str(r.start_ts), "end": str(r.end_ts),
               "mw_available": scalar(r.mw_available, 1),
               "mw_nominal": None if pd.isna(r.mw_nominal) else scalar(r.mw_nominal, 1),
               "planned": None if pd.isna(r.planned) else bool(r.planned),
               "reason": r.reason if isinstance(r.reason, str) else None}
              for r in a78.itertuples()]
    if len(a78):
        lin.add("attribution.a78", a78.lineage_id.unique())
    zones = sorted(UMM_AREAS)
    ph = ",".join("?" * len(zones))
    # a message is stored per unit and per period of its availability profile: one label per
    # message and unit, spanning its periods, with the lowest availability it announces
    umm = _frame(con, "SELECT message_id, unit, any_value(out_area) AS out_area, "
                      "any_value(in_area) AS in_area, max(version) AS version, "
                      "min(start_ts) AS start_ts, max(stop_ts) AS stop_ts, "
                      "min(available_mw) AS available_mw, max(installed_mw) AS installed_mw, "
                      "any_value(reason) AS reason, any_value(lineage_id) AS lineage_id "
                      f"FROM umm_message WHERE out_area IN ({ph}) AND in_area IN ({ph}) "
                      "AND start_ts < ? AND stop_ts > ? GROUP BY message_id, unit ORDER BY ALL",
                 zones + zones + [hi, lo])
    messages = [{"id": r.message_id, "version": None if pd.isna(r.version) else int(r.version),
                 "unit": r.unit, "from": UMM_AREAS[r.out_area], "to": UMM_AREAS[r.in_area],
                 "start": str(r.start_ts), "stop": str(r.stop_ts),
                 "available_mw": None if pd.isna(r.available_mw) else scalar(r.available_mw, 1),
                 "installed_mw": None if pd.isna(r.installed_mw) else scalar(r.installed_mw, 1),
                 "reason": r.reason if isinstance(r.reason, str) else None}
                for r in umm.itertuples()]
    if len(umm):
        lin.add("attribution.umm", umm.lineage_id.unique())
    return {"contract": 1, "key": str(year), "a78": events, "umm": messages}, lin
