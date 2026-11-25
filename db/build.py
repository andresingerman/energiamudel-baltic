"""Rebuild the database from the raw cache and the lineage records.

Run:  make db

Steps, all idempotent:
  1. create the schema (db/schema.sql)
  2. load the vocabulary tables from pipeline/config.py
  3. load every lineage record from data/lineage
  4. for every raw file whose source has a loader here, parse it and upsert its rows

Loaders are registered per source and document type. An ENTSO-E raw file of a document with no
loader is reported, not silently skipped, so the coverage of the build is visible in its output.
Archive tables (PECD, demand profiles, hydro inflows, TYNDP prices, ERAA NTCs) reload only when
their archive changes. Scope: SPECIFICATION.md R-DATA-2; zones, techs and borders from
pipeline/config.py.
"""

from __future__ import annotations

import calendar
import gzip
import hashlib
import json
import sys
from pathlib import Path

import pandas as pd

from pipeline import DATA_DIR, lineage
from pipeline.config import BORDERS, TECHS, ZONES
from pipeline.sources import (
    documents,
    ecb,
    eex,
    energimyndigheten,
    entsoe,
    irena,
    openmeteo,
    raw_dir,
    worldbank,
)

from . import connect

# --------------------------------------------------------------------- vocabulary


def load_vocabulary(con) -> None:
    # Rows already present are left alone: DuckDB refuses to update a row that a foreign key
    # references, and a changed vocabulary (a renamed zone, a new EIC) means `make clean`
    # and a full rebuild anyway (R-DATA-11).
    con.executemany(
        "INSERT INTO zone VALUES (?, ?, ?, ?) ON CONFLICT (code) DO NOTHING",
        [(z.code, z.tier.value, z.eic, z.name) for z in ZONES.values()],
    )
    con.executemany(
        "INSERT INTO tech VALUES (?, ?, ?, ?) ON CONFLICT (code) DO NOTHING",
        [(t.code, t.psr_type, t.name, t.category) for t in TECHS.values()],
    )
    con.executemany(
        "INSERT INTO border VALUES (?, ?, ?, ?, ?) ON CONFLICT (code) DO NOTHING",
        [(b.code, b.from_zone, b.to_zone, b.internal, b.name or None) for b in BORDERS.values()],
    )


# --------------------------------------------------------------------- lineage


def load_lineage(con) -> int:
    recs = lineage.read_all()
    if not recs:
        return 0
    # A lineage record is immutable once written (its dataset id is the key fact rows point
    # at), so an existing row is kept: DuckDB cannot replace a row a foreign key references.
    con.executemany(
        """INSERT INTO lineage VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (dataset) DO NOTHING""",
        [(r.dataset, r.source, r.endpoint, json.dumps(r.params), r.fetched_at.replace("+00:00", ""),
          r.licence, r.http_status, r.sha256, r.page, r.rows, r.derived_from, r.notes)
         for r in recs],
    )
    return len(recs)


# --------------------------------------------------------------------- ENTSO-E loaders
# dataset id: entsoe.<DOC>.<ZONE|BORDER.fwd|rev>.<YYYY-MM>


def _upsert(con, table: str, df: pd.DataFrame) -> int:
    if df.empty:
        return 0
    con.register("_df", df)
    cols = ", ".join(df.columns)
    con.execute(f"INSERT OR REPLACE INTO {table} ({cols}) SELECT {cols} FROM _df")
    con.unregister("_df")
    return len(df)


def load_entsoe_a44(con, path: Path, ds: str, zone: str) -> int:
    df = entsoe.to_hourly(entsoe.parse(path), by=())
    df = df.rename(columns={"value": "eur_mwh"}).assign(zone=zone, lineage_id=ds)
    # the file anew: a row it no longer yields (a corrected parser, E-074) leaves too (E-083)
    con.execute("DELETE FROM price WHERE lineage_id = ?", [ds])
    return _upsert(con, "price", df[["zone", "ts", "eur_mwh", "lineage_id"]])


def load_entsoe_a65(con, path: Path, ds: str, zone: str) -> int:
    df = entsoe.to_hourly(entsoe.parse(path), by=())
    df = df.rename(columns={"value": "mw"}).assign(zone=zone, lineage_id=ds)
    return _upsert(con, "load", df[["zone", "ts", "mw", "lineage_id"]])


def load_entsoe_a75(con, path: Path, ds: str, zone: str) -> int:
    raw = entsoe.parse(path)
    raw = raw[raw["tech"].notna()]           # unknown PSR types are reported by tests, not loaded
    # An outBiddingZone series is consumption (pumped-storage pumping), not generation. It is
    # dropped here; the pumping load is optimised inside the model (R-REF-4), not replayed.
    raw = raw[raw["in_domain"].notna()]
    df = entsoe.to_hourly(raw, by=("tech",))
    df = df.rename(columns={"value": "mw"}).assign(zone=zone, lineage_id=ds)
    return _upsert(con, "generation", df[["zone", "tech", "ts", "mw", "lineage_id"]])


def load_entsoe_a11(con, path: Path, ds: str, border: str, reverse: bool) -> int:
    """One direction per raw file, stored as such; v_flow_net gives fwd - rev (D-024). A
    direction's series leaves out the quarter-hours the power ran the other way (2026), which the
    other direction's file reports: there it is 0. A quarter-hour neither reports stays missing."""
    raw = entsoe.parse(path)
    mine, theirs = (".rev.", ".fwd.") if reverse else (".fwd.", ".rev.")
    other = path.with_name(path.name.replace(mine, theirs))
    if not other.exists():
        raise FileNotFoundError(f"{path.name}: the other direction's {other.name} is not in "
                                "the cache; the quarter-hours run the other way would be lost")
    o = entsoe.parse(other)
    zero = o.loc[~o["ts"].isin(raw["ts"]), ["ts", "minutes"]].assign(value=0.0)
    raw = pd.concat([raw, zero], ignore_index=True) if len(zero) else raw
    df = entsoe.to_hourly(raw, by=())
    df = df.rename(columns={"value": "mw"}).assign(
        border=border, direction="rev" if reverse else "fwd", lineage_id=ds)
    return _upsert(con, "flow", df[["border", "direction", "ts", "mw", "lineage_id"]])


def load_entsoe_border(con, path: Path, ds: str, border: str, reverse: bool, table: str) -> int:
    """A31 offered capacity -> ntc; A09 scheduled exchange -> scheduled_exchange."""
    df = entsoe.to_hourly(entsoe.parse(path), by=())
    df = df.rename(columns={"value": "mw"}).assign(
        border=border, direction="rev" if reverse else "fwd", lineage_id=ds)
    return _upsert(con, table, df[["border", "direction", "ts", "mw", "lineage_id"]])


def load_entsoe_a25(con, path: Path, ds: str, zone: str) -> int:
    """A25/B09 net position: the zone is the out_Domain of its export series and the in_Domain
    of its import series (one series per sign); stored signed, + = net export."""
    raw = entsoe.parse(path)
    if raw.empty:
        return 0
    eic = ZONES[zone].eic
    sign = raw["out_domain"].eq(eic).map({True: 1.0, False: -1.0})
    bad = raw[~raw["out_domain"].eq(eic) & ~raw["in_domain"].eq(eic)]
    if len(bad):
        raise ValueError(f"{ds}: series whose domains do not name {zone}")
    raw = raw.assign(value=raw["value"] * sign)
    # each MTU stands in one series, its sign's: the hour is the average of its signed points,
    # since with quarter-hours (October 2025 on) one hour can hold both signs
    df = entsoe.to_hourly(raw, by=())
    df = df.rename(columns={"value": "mw"}).assign(zone=zone, lineage_id=ds)
    return _upsert(con, "net_position", df[["zone", "ts", "mw", "lineage_id"]])


def load_entsoe_a68(con, path: Path, ds: str, zone: str) -> int:
    raw = entsoe.parse(path)
    raw = raw[raw["tech"].notna()]
    if raw.empty:
        return 0
    # The annual period starts at CET midnight = 23:00 UTC of the previous year; the year is
    # the one the request (and the dataset id) named.
    df = pd.DataFrame({"zone": zone, "tech": raw["tech"], "year": int(ds.split(".")[-1]),
                       "mw": raw["value"], "lineage_id": ds})
    return _upsert(con, "capacity", df.drop_duplicates(["zone", "tech", "year"]))


def load_entsoe_a72(con, path: Path, ds: str, zone: str) -> int:
    raw = entsoe.parse(path)                              # weekly points, MWh
    if raw.empty:                                          # zones without reservoirs
        return 0
    # A week starts on Monday 00:00 local time: Sunday 23:00 UTC in CET, 22:00 in the Baltic EET,
    # 21:00 in its summer time; three hours on is the Monday in each.
    monday = (raw["ts"] + pd.Timedelta(hours=3)).dt.date
    df = pd.DataFrame({"zone": zone, "week_start": monday,
                       "gwh": raw["value"] / 1000.0, "lineage_id": ds})
    # the file anew: the rows an earlier reading dated the Sunday leave (E-098), as A44's (E-083)
    con.execute("DELETE FROM reservoir WHERE lineage_id = ?", [ds])
    return _upsert(con, "reservoir", df.drop_duplicates(["zone", "week_start"]))


_EIC_TO_ZONE = {z.eic: z.code for z in ZONES.values()}


def load_entsoe_outage(con, path: Path, ds: str, where: str, kind: str,
                       direction: str | None = None) -> int:
    """A80 / A78 events. A transmission event carries the direction its file was requested
    for; the same event published twice (two documents, identical asset, period and MW — seen
    for EstLink 2) is kept once (R-DATA-11)."""
    df = entsoe.parse_unavailability(path)
    if df.empty:
        return 0
    df = df.assign(lineage_id=ds)
    if kind == "generation":
        df["zone"] = df["zone"].map(_EIC_TO_ZONE)
        df["border"] = df["direction"] = None
    else:
        df["zone"] = None
        df["border"], df["direction"] = where, direction
        df["id"] = df["id"] + "." + direction
        have = con.execute("""SELECT asset, start_ts, end_ts, mw_available FROM unavailability
            WHERE border = ? AND direction = ?""", [where, direction]).fetchdf()
        key = ["asset", "start_ts", "end_ts", "mw_available"]
        df = df.drop_duplicates(key)
        if len(have):
            df = df.merge(have.assign(_seen=True), on=key, how="left")
            df = df[df["_seen"].isna()].drop(columns="_seen")
    cols = ["id", "kind", "asset", "zone", "border", "direction", "start_ts", "end_ts",
            "mw_available", "mw_nominal", "planned", "reason", "lineage_id"]
    return _upsert(con, "unavailability", df[cols].drop_duplicates("id"))


def load_entsoe_a71(con, path: Path, ds: str, zone: str) -> int:
    df = entsoe.parse_units(path)
    df = df[df["tech"].notna()].assign(zone=zone, lineage_id=ds)
    return _upsert(con, "unit", df[["code", "zone", "tech", "name", "mw", "lineage_id"]])


def load_entsoe(con) -> dict[str, int]:
    counts: dict[str, int] = {}
    failed: list[str] = []
    for path in sorted(raw_dir(entsoe.RAW).glob("entsoe.*.[xz][mi][lp]")):
        ds = path.stem
        parts = ds.split(".")
        doc, where = parts[1], parts[2]
        try:
            if doc == "A44":
                n = load_entsoe_a44(con, path, ds, where)
            elif doc == "A65":
                n = load_entsoe_a65(con, path, ds, where)
            elif doc == "A75":
                n = load_entsoe_a75(con, path, ds, where)
            elif doc == "A11":
                n = load_entsoe_a11(con, path, ds, where, reverse=(parts[3] == "rev"))
            elif doc == "A31":
                n = load_entsoe_border(con, path, ds, where, parts[3] == "rev", "ntc")
            elif doc == "A09":
                n = load_entsoe_border(con, path, ds, where, parts[3] == "rev",
                                       "scheduled_exchange")
            elif doc == "A25":
                n = load_entsoe_a25(con, path, ds, where)
            elif doc == "A68":
                n = load_entsoe_a68(con, path, ds, where)
            elif doc == "A71":
                n = load_entsoe_a71(con, path, ds, where)
            elif doc == "A80":
                n = load_entsoe_outage(con, path, ds, where, "generation")
            elif doc == "A78":
                n = load_entsoe_outage(con, path, ds, where, "transmission", parts[3])
            elif doc == "A72":
                n = load_entsoe_a72(con, path, ds, where)
            elif doc == "A95":
                continue    # no table: read by the documentary rows that cite it (R-SUP-4)
            elif doc in ("A69", "A65DA"):
                continue    # no table: the day-ahead forecasts, read from the raw cache by the
                # dear-hours research (spikes/dear-hours/forecasts.py)
            else:
                print(f"  no loader yet for {doc}: {ds}", file=sys.stderr)
                continue
        except Exception as e:  # noqa: BLE001 - every file is tried, the failures raised together
            print(f"  FAILED {ds}: {type(e).__name__}: {e}", file=sys.stderr)
            failed.append(f"{ds} ({type(e).__name__})")
            continue
        counts[doc] = counts.get(doc, 0) + n
    if failed:
        # a file that cannot be read is a missing month the export would fill or zero, not a
        # build to finish quietly
        raise RuntimeError(f"{len(failed)} ENTSO-E file(s) could not be loaded: "
                           + ", ".join(failed[:10]) + (" …" if len(failed) > 10 else ""))
    return counts


# --------------------------------------------------------------------- other sources


def load_weather(con) -> int:
    n = 0
    for path in sorted(raw_dir(openmeteo.RAW).glob("openmeteo.*.json")):
        ds = path.stem
        zone = ds.split(".")[2]
        df = openmeteo.parse(path).assign(zone=zone, lineage_id=ds)
        n += _upsert(con, "weather", df[["zone", "ts", "temperature_c", "wind_ms",
                                         "radiation_wm2", "lineage_id"]])
    return n


def load_commodity(con) -> int:
    n = 0
    reports = sorted(raw_dir(eex.RAW).glob("eex.*.xls*"))
    if reports:             # the reports anew: an auction the parser now leaves out goes (E-083)
        con.execute("DELETE FROM commodity WHERE commodity = 'eua'")
    for path in reports:
        df = eex.parse(path)
        # Several auctions may clear on one day (EU, DE, PL): the day's average is the series.
        df = df.groupby("ts", as_index=False)["value"].mean()
        df = pd.DataFrame({"commodity": "eua", "ts": df["ts"].dt.date, "price": df["value"],
                           "unit": "EUR/tCO2", "lineage_id": path.stem})
        n += _upsert(con, "commodity", df)
    wb = sorted(raw_dir(worldbank.RAW).glob("worldbank.*.xlsx"))
    if wb:                                                # newest vintage wins
        df = worldbank.parse(wb[-1])
        df = pd.DataFrame({"commodity": df["commodity"], "ts": df["ts"].dt.date,
                           "price": df["value"], "unit": df["unit"], "lineage_id": wb[-1].stem})
        n += _upsert(con, "commodity", df)
    fx = sorted(raw_dir(ecb.RAW).glob("ecb.*.csv"))
    if fx:                                                # newest vintage wins (OPEN-13)
        df = ecb.parse(fx[-1])
        df = pd.DataFrame({"commodity": "usd_per_eur", "ts": df["ts"].dt.date,
                           "price": df["value"], "unit": "USD/EUR", "lineage_id": fx[-1].stem})
        n += _upsert(con, "commodity", df)
    return n


def load_capacity_stat(con) -> int:
    """IRENASTAT's year-end capacity per country (D-087); the newest table release wins."""
    paths = sorted(raw_dir(irena.RAW).glob("irena.capacity.*.csv"))
    if not paths:
        return 0
    df = irena.parse(paths[-1]).assign(lineage_id=paths[-1].stem)
    con.execute("DELETE FROM capacity_stat")
    return _upsert(con, "capacity_stat", df[["country", "tech", "year", "mw", "lineage_id"]])

def load_capacity_area(con) -> int:
    """Energimyndigheten's wind capacity by Swedish bidding area (D-093); the newest table wins."""
    paths = sorted(raw_dir(energimyndigheten.RAW).glob("energimyndigheten.wind.*.csv"))
    if not paths:
        return 0
    df = energimyndigheten.parse(paths[-1]).assign(tech="wind", lineage_id=paths[-1].stem)
    con.execute("DELETE FROM capacity_area")
    return _upsert(con, "capacity_area", df[["area", "tech", "year", "mw", "lineage_id"]])


# --------------------------------------------------------------------- PECD (D-027)

def _require(paths, what: str) -> None:
    """A missing archive is an incomplete cache, not an empty table: stop the build (R-DOC-8)."""
    if not paths or not all(Path(p).exists() for p in paths):
        raise FileNotFoundError(f"{what}: not in data/raw; run `make history` first")


def _file_sha(path: Path) -> str:
    import hashlib
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _atomic(con, load, *args):
    """A loader in one transaction: its deletes, its rows and its `loaded_archive` record are
    written together or not at all, so a load that fails or is interrupted leaves the table as it
    was and the next build loads it again instead of keeping a part as the whole."""
    con.execute("BEGIN TRANSACTION")
    try:
        n = load(con, *args)
    except BaseException:
        con.execute("ROLLBACK")
        raise
    con.execute("COMMIT")
    return n


def _archive_unchanged(con, table: str, archives: dict[str, Path]) -> bool:
    """E-056, D-076: True when `table` already holds the rows of exactly these archives
    (dataset id -> file), by the sha256 of the files it was loaded from; it then says so and is
    left alone. Otherwise the rows those archives loaded before are dropped so the caller loads
    them afresh, and a corrected archive, a new node or a new target year reaches the database
    without `make clean`. The file is hashed, not its lineage row: a lineage row cannot change
    once fact rows point at it (`load_lineage`)."""
    want = {ds: _file_sha(path) for ds, path in archives.items()}
    have = dict(con.execute("SELECT dataset, sha256 FROM loaded_archive WHERE tbl=?",
                            [table]).fetchall())
    n = con.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
    if n and want and want == have:
        print(f"{table}: kept {n} rows, archive unchanged")
        return True
    stale = sorted(set(want) | set(have))
    con.execute(f"DELETE FROM {table} WHERE lineage_id IN ({','.join('?' * len(stale))})", stale)
    con.execute("DELETE FROM loaded_archive WHERE tbl=?", [table])
    con.executemany("INSERT INTO loaded_archive VALUES (?, ?, ?)",
                    [(table, ds, sha) for ds, sha in want.items()])
    return False


PECD_ZIP = "tyndp2024.PECD.zip"
PECD_TECH = {"Wind_Onshore": "wind_onshore", "Wind_Offshore": "wind_offshore",
             "LFSolarPV": "solar"}
# the core zones only: the boundary zones are price profiles and carry no fleet (D2)
PECD_NODE = {"EE00": "EE", "LV00": "LV", "LT00": "LT"}
PECD_YEARS = (2030, 2040)


def load_pecd(con) -> int:
    """PECD 3.1 hourly capacity factors per node, technology, target and climate year,
    read straight out of the TYNDP archive."""
    import io
    import re
    import zipfile
    path = raw_dir("tyndp2024") / PECD_ZIP
    _require([path], f"{PECD_ZIP} (pecd_profile)")
    if _archive_unchanged(con, "pecd_profile", {"tyndp2024.PECD": path}):
        return 0
    pat = re.compile(r"PECD/(\d{4})/PECD_(Wind_Onshore|Wind_Offshore|LFSolarPV)_\d{4}_([A-Z0-9]+)_")
    n = 0
    with zipfile.ZipFile(path) as z:
        for name in z.namelist():
            m = pat.match(name)
            if not m or int(m[1]) not in PECD_YEARS or m[3] not in PECD_NODE:
                continue
            df = pd.read_csv(io.BytesIO(z.read(name)), skiprows=10)
            df = df.drop(columns=["Date"]).rename(columns={"Hour": "hour"})
            df["hour"] = range(1, len(df) + 1)
            long = df.melt(id_vars="hour", var_name="climate_year", value_name="cf")
            long["climate_year"] = long["climate_year"].astype(float).astype(int)
            long = long.assign(zone=PECD_NODE[m[3]], tech=PECD_TECH[m[2]], target_year=int(m[1]),
                               lineage_id="tyndp2024.PECD")
            n += _upsert(con, "pecd_profile", long[["zone", "tech", "target_year", "climate_year",
                                                    "hour", "cf", "lineage_id"]])
    return n


# --------------------------------------------------------------------- hydro inflows (D-028)

HYDRO_ZIP = "tyndp2024.Hydro-Inflows.zip"
HYDRO_CAT = {"Run of River": "ror", "Pondage": "pondage", "Reservoir": "reservoir",
             "PS Open": "ps_open", "PS Closed": "ps_closed"}


def _layout_week(day: pd.Series, full: pd.Series) -> pd.Series:
    """The week (1–53) of the 365-day layout (R-TIME-6, `axis.drop_feb29`) a PEMMDB sheet's day of
    the year falls in. Where the day's series holds 366 days (`full`: a leap climate year's
    inflow), 29 February goes into the 28th and the days after it move up one, so the year's
    water is kept; a series whose day 366 is empty — another year's, or a variable PEMMDB gives
    alike in every climate year — loses that day and keeps its dates."""
    d = day - (full & (day >= 60))
    return ((d - 1) // 7 + 1).where(full | (day <= 365))


def _daily_weeks(long: pd.DataFrame) -> pd.DataFrame:
    """A daily sheet's rows (variable, climate_year, period, value) with their week of the layout.
    A series holds 366 days where a leap climate year's day 366 has a value (E-099, E-103)."""
    leap = long["climate_year"].astype(int).map(calendar.isleap)
    last = (long["period"] == 366) & (long["value"] != 0)
    full = leap & last.groupby([long["variable"], long["climate_year"]]).transform("any")
    return long.assign(week=_layout_week(long["period"], full)).dropna(subset=["week"])


def load_hydro_inflow(con) -> int:
    """PEMMDB hydro workbooks: weekly climate-year-dependent inflows, levels and power bounds
    per node and target year; daily categories are summed into 7-day weeks."""
    import io
    import re
    import zipfile
    path = raw_dir("tyndp2024") / HYDRO_ZIP
    _require([path], f"{HYDRO_ZIP} (hydro_inflow)")
    if _archive_unchanged(con, "hydro_inflow", {"tyndp2024.Hydro-Inflows": path}):
        return 0
    pat = re.compile(r"Hydro Inflows/(\d{4})/PEMMDB_([A-Z0-9]{4})_Hydro_Inflows_\d{4}\.xlsx$")
    n = 0
    with zipfile.ZipFile(path) as z:
        for name in z.namelist():
            m = pat.match(name)
            if not m or m[2] not in PECD_NODE:
                continue
            zone, ty = PECD_NODE[m[2]], int(m[1])
            x = pd.ExcelFile(io.BytesIO(z.read(name)))
            frames = []
            for label, cat in HYDRO_CAT.items():
                uni = x.parse(f"{label} - Uniform", header=None)
                if len(uni) > 5 and pd.notna(uni.iloc[5, 1]) and float(uni.iloc[5, 1]) > 0:
                    for col, var in ((1, "P_NOM_TURB"), (2, "E_MAX_TURB")):
                        frames.append(pd.DataFrame({"variable": var, "climate_year": 0, "week": 1,
                                                    "value": [float(uni.iloc[5, col])],
                                                    "category": cat}))
                yd = x.parse(f"{label} - Year Dependent", header=None)
                if yd.shape[0] < 3:
                    continue
                cys = [int(float(c)) for c in yd.iloc[1, 3:].tolist() if pd.notna(c)]
                body = yd.iloc[2:, :3 + len(cys)].copy()
                body.columns = ["variable_name", "variable", "period"] + cys
                body = body[body["variable"].notna()]
                long = body.melt(id_vars=["variable", "period"], var_name="climate_year",
                                 value_name="value")
                long["value"] = pd.to_numeric(long["value"], errors="coerce")
                long = long.dropna(subset=["value"])
                if long.empty:
                    continue
                long["period"] = pd.to_numeric(long["period"], errors="coerce")
                daily = cat in ("ror", "pondage")
                if daily:
                    long = _daily_weeks(long)
                long["week"] = (long["week"] if daily else long["period"]).astype(int)
                # energies (GWh) add up over the days of a week; powers and levels average
                energy = long["variable"].str.contains("EN|INFLOW")
                keys = ["variable", "climate_year", "week"]
                parts = [long[energy].groupby(keys)["value"].sum(),
                         long[~energy].groupby(keys)["value"].mean()]
                out = pd.concat([x for x in parts if len(x)])
                out = out.reset_index().assign(category=cat)
                frames.append(out)
            if not frames:
                continue
            df = pd.concat(frames).assign(zone=zone, target_year=ty,
                                          lineage_id="tyndp2024.Hydro-Inflows")
            df["climate_year"] = df["climate_year"].astype(int)
            n += _upsert(con, "hydro_inflow", df[["zone", "target_year", "category", "variable",
                                                  "climate_year", "week", "value", "lineage_id"]])
    return n


# --------------------------------------------------------------------- PEMMDB thermal units (M5)

# lineage id -> (raw directory, file, folder inside the archive)
THERMAL_ZIPS = {"tyndp2024.PEMMDB2": ("tyndp2024", "tyndp2024.PEMMDB2.zip", "PEMMDB2"),
                "tyndp2026.PEMMDB_2-X": ("tyndp2026", "tyndp2026.PEMMDB_2-X.zip", "PEMMDB_2.X")}


def load_thermal_unit(con) -> int:
    """PEMMDB National Trends 'Thermal' sheets of the Baltic nodes: per fuel and plant type the
    net generating capacity, the number of units and the annual forced-outage rate — the unit
    sizes the adequacy sampler draws outages for (R-LINK-7). A fuel is named on its group's first
    row and holds for the rows under it; a row with a capacity and no plant type (LT's nuclear)
    takes its fuel's name. The sheet gives the rate in per cent; 0 is taken as not given."""
    import io
    import re
    import zipfile
    paths = {lid: raw_dir(d) / f for lid, (d, f, _) in THERMAL_ZIPS.items()}
    _require(list(paths.values()), "PEMMDB archives (thermal_unit)")
    if _archive_unchanged(con, "thermal_unit", paths):
        return 0
    n = 0
    for lid, (source, _, folder) in THERMAL_ZIPS.items():
        pat = re.compile(rf"{re.escape(folder)}/(\d{{4}})/PEMMDB_([A-Z0-9]{{4}})_"
                         r"NationalTrends_\d{4}\.xlsx$")
        with zipfile.ZipFile(paths[lid]) as z:
            for name in sorted(z.namelist()):
                m = pat.match(name)
                if not m or m[2] not in PECD_NODE:
                    continue
                sheet = pd.read_excel(io.BytesIO(z.read(name)), sheet_name="Thermal", header=None)
                if str(sheet.iloc[7, 3]).strip() != "Number of units":
                    raise ValueError(f"{name}: the Thermal sheet's columns moved")
                fuel, recs = None, []
                for r in sheet.iloc[10:].itertuples(index=False):
                    if isinstance(r[0], str) and r[0].strip():
                        fuel = r[0].strip()
                    mw = pd.to_numeric(r[2], errors="coerce")
                    if pd.isna(mw) or mw <= 0 or not (isinstance(r[1], str) or fuel):
                        continue
                    if fuel is None:
                        raise ValueError(f"{name}: plant type {r[1]} before any fuel")
                    kind = r[1].strip() if isinstance(r[1], str) and r[1].strip() else fuel
                    units = pd.to_numeric(r[3], errors="coerce")
                    forced = pd.to_numeric(r[32], errors="coerce")
                    recs.append({"source": source, "zone": PECD_NODE[m[2]],
                                 "target_year": int(m[1]), "fuel": fuel, "plant_type": kind,
                                 "mw": float(mw),
                                 "units": 0 if pd.isna(units) else int(units),
                                 "forced_outage_rate": None if pd.isna(forced) or forced == 0
                                 else float(forced) / 100,
                                 "lineage_id": lid})
                if recs:
                    n += _upsert(con, "thermal_unit", pd.DataFrame(recs))
    return n


# --------------------------------------------------------------------- demand profiles (D-028)

DEMAND_ZIP = "tyndp2024.Demand-Profiles.zip"
DEMAND_FILES = {2030: "Demand Profiles/NT/Electricity demand profiles/2030_National Trends.xlsx",
                2040: "Demand Profiles/NT/Electricity demand profiles/2040_National Trends.xlsx"}


def load_demand_profile(con) -> int:
    """TYNDP 2024 National Trends hourly electricity demand per node and climate year.
    The Distributed Energy and Global Ambition workbooks in the archive carry no values."""
    import io
    import zipfile

    import openpyxl
    path = raw_dir("tyndp2024") / DEMAND_ZIP
    _require([path], f"{DEMAND_ZIP} (demand_profile)")
    if _archive_unchanged(con, "demand_profile", {"tyndp2024.Demand-Profiles": path}):
        return 0
    n = 0
    with zipfile.ZipFile(path) as z:
        for ty, member in DEMAND_FILES.items():
            wb = openpyxl.load_workbook(io.BytesIO(z.read(member)), read_only=True)
            for node, zone in PECD_NODE.items():
                if node not in wb.sheetnames:
                    continue
                rows = list(wb[node].iter_rows(min_row=8, values_only=True))
                hdr = rows[0]
                cys = [(j, int(v)) for j, v in enumerate(hdr) if isinstance(v, (int, float))]
                data = [r for r in rows[1:] if r and isinstance(r[3], (int, float))]
                df = pd.DataFrame({cy: [r[j] for r in data] for j, cy in cys})
                df["hour"] = range(1, len(df) + 1)
                long = df.melt(id_vars="hour", var_name="climate_year", value_name="mw")
                long["mw"] = pd.to_numeric(long["mw"], errors="coerce")
                long = long.dropna(subset=["mw"]).assign(
                    zone=zone, scenario="national_trends", target_year=ty,
                    lineage_id="tyndp2024.Demand-Profiles")
                n += _upsert(con, "demand_profile", long[["zone", "scenario", "target_year",
                                                          "climate_year", "hour", "mw",
                                                          "lineage_id"]])
            wb.close()
    return n


# --------------------------------------------------------------------- documentary (D-017)


def _documentary_frame(path: Path) -> pd.DataFrame:
    """Read a documentary CSV and make sure every row has a lineage record to point at."""
    df = pd.read_csv(path).fillna({"notes": "", "lineage_id": "", "source": "", "url": "",
                                   "page": "", "doc_source": ""})
    if "doc_source" in df.columns:           # files whose `source` column means something else
        df["source"] = df["doc_source"]
    # A row read by a person from a document page gets a documentary record per page; a row
    # extracted from a fetched file names that file's measured record in `lineage_id`.
    doc = df["lineage_id"] == ""
    df.loc[doc, "lineage_id"] = ("doc." + df.loc[doc, "source"] + "." +
                                 df.loc[doc, "page"].str.lower()
                                   .str.replace(r"[^a-z0-9]+", "-", regex=True).str.strip("-"))
    for (ds, src, url, page), g in df[doc].groupby(["lineage_id", "source", "url", "page"]):
        # the page record names the cached file it was read from, when the file is cached
        # (pipeline/sources/documents.py; R-DATA-7)
        fdoc = documents.dataset_id(src) if src in documents.DOCS else None
        rec = lineage.documentary(dataset=ds, source=src, url=url, page=page,
                                  licence="public document; cited with page",
                                  derived_from=[fdoc] if fdoc and (
                                      lineage.lineage_dir() / f"{fdoc}.json").exists() else [],
                                  notes="; ".join(sorted({n for n in g["notes"] if n})) or None)
        if not rec.path().exists():          # keep the first reading date
            rec.write()
    return df


def load_documentary(con) -> int:
    """data/documentary/scenarios.csv -> scenario_assumption, one lineage record per page."""
    path = DATA_DIR / "documentary" / "scenarios.csv"
    if not path.exists():
        return 0
    df = _documentary_frame(path)
    load_lineage(con)
    cols = ["scenario", "zone", "year", "key", "value", "unit", "lineage_id"]
    return _replace(con, "scenario_assumption", df[cols])


def _replace(con, table: str, df: pd.DataFrame) -> int:
    """A documentary table as its CSV now stands: a row taken out of the file, or renamed, leaves
    the table too (each of these tables is loaded from its one file)."""
    con.execute(f"DELETE FROM {table}")
    return _upsert(con, table, df)


def _parse_mm(path: Path) -> pd.DataFrame:
    from pipeline.sources import tyndp
    scenario, ty, cy = tyndp.mm_meta(path)
    parse = tyndp.parse_mm_prices if scenario == "NT" else tyndp.parse_mm_prices_xlsb
    return parse(path).assign(scenario=scenario, target_year=ty, climate_year=cy,
                              lineage_id=path.stem)


def load_tyndp_price(con, workers: int = 6) -> int:
    """TYNDP 2024 market-model hourly node prices of the six zones -> tyndp_price (R-BND-5):
    National Trends 2030/2040 (climate year 2009 only) and Distributed Energy / Global Ambition
    2035/2040/2050 x climate years 1995/2008/2009. About a minute of CPU per workbook, so the
    archives are parsed in parallel and reloaded only when one changes."""
    from concurrent.futures import ProcessPoolExecutor

    from pipeline.sources import tyndp
    load_lineage(con)
    d = raw_dir(tyndp.RAW)
    paths = sorted(d.glob("tyndp2024.MMStandardOutputFile_NT*_CY*.zip")) + \
        sorted(p for p in d.glob("tyndp2024.*.zip")
               if p.stem.split(".", 1)[1][:2] in ("DE", "GA") and "CY" in p.stem)
    _require(paths, "TYNDP 2024 market-model output files (tyndp_price)")
    if _archive_unchanged(con, "tyndp_price", {p.stem: p for p in paths}):
        return 0
    n = 0
    with ProcessPoolExecutor(max_workers=workers) as pool:
        for df in pool.map(_parse_mm, paths):
            n += _upsert(con, "tyndp_price", df[["zone", "scenario", "target_year",
                                                  "climate_year", "hour", "eur_mwh",
                                                  "lineage_id"]])
    return n


def _parse_mm_yearly(path: Path) -> pd.DataFrame:
    from pipeline.sources import tyndp
    scenario, ty, cy = tyndp.mm_meta(path)
    return tyndp.parse_mm_yearly(path).assign(family="tyndp2024", scenario=scenario,
                                              target_year=ty, weather=str(cy),
                                              lineage_id=path.stem)


def _parse_mm_outputs(path: Path) -> pd.DataFrame:
    from pipeline.sources import tyndp
    scenario, ty, cy = tyndp.mm_meta(path)
    return tyndp.parse_mm_outputs(path).assign(family="tyndp2024", scenario=scenario,
                                               target_year=ty, weather=str(cy),
                                               lineage_id=path.stem)


def _mm_outputs() -> list[Path]:
    """The TYNDP 2024 market-model output archives: National Trends, and Distributed Energy and
    Global Ambition per climate year."""
    from pipeline.sources import tyndp
    d = raw_dir(tyndp.RAW)
    return sorted(d.glob("tyndp2024.MMStandardOutputFile_NT*_CY*.zip")) + \
        sorted(p for p in d.glob("tyndp2024.*.zip")
               if p.stem.split(".", 1)[1][:2] in ("DE", "GA") and "CY" in p.stem)


def _parse_ntplus_outputs(args) -> pd.DataFrame:
    from pipeline.sources import tyndp2026
    path, member, ty, ws = args
    rows = tyndp2026.parse_output_member(path, member)
    return pd.DataFrame(rows, columns=["zone", "output", "measure", "value"]).assign(
        family="tyndp2026", scenario="NTplus", target_year=ty, weather=ws,
        lineage_id=tyndp2026.dataset_id(tyndp2026.HOURLY))


def load_scenario_boundary_output(con, workers: int = 6) -> int:
    """The zones' annual generation, installed capacity, net export and dumped energy behind
    every boundary profile (R-BND-8, D-040, D-041, D-043): TYNDP 2024's 'Yearly Outputs' sheets
    and the TYNDP 2026 NT+ hourly dashboards, reloaded only when an archive changes."""
    from concurrent.futures import ProcessPoolExecutor

    from pipeline.sources import tyndp2026
    load_lineage(con)
    paths = _mm_outputs()
    hourly = tyndp2026.path(tyndp2026.HOURLY)
    _require(paths + [hourly], "TYNDP market-model outputs (scenario_boundary_output)")
    archives = {p.stem: p for p in paths} | {tyndp2026.dataset_id(tyndp2026.HOURLY): hourly}
    if _archive_unchanged(con, "scenario_boundary_output", archives):
        return 0
    # the boundary zones only, as for TYNDP 2024: the core zones' fleets are the scenario's own
    boundary = tuple(f"/{c}_TimeSeriesDashboard" for c in ("FI", "SE", "PL"))
    members = [(hourly, m, ty, ws) for m, ty, ws in tyndp2026.price_members(hourly)
               if any(b in m for b in boundary)]
    cols = ["family", "scenario", "target_year", "weather", "zone", "output", "measure", "value",
            "lineage_id"]
    n = 0
    with ProcessPoolExecutor(max_workers=workers) as pool:
        for df in list(pool.map(_parse_mm_outputs, paths)) + list(pool.map(_parse_ntplus_outputs,
                                                                           members)):
            n += _upsert(con, "scenario_boundary_output", df[cols])
    return n


def _parse_balance(args) -> pd.DataFrame:
    from pipeline.sources import tyndp2026
    path, member, ty, ws = args
    rows = tyndp2026.parse_balance_member(path, member)
    return pd.DataFrame(rows, columns=["zone", "demand_twh", "electrolysis_twh"]).assign(
        family="tyndp2026", scenario="NTplus", target_year=ty, weather=ws,
        lineage_id=tyndp2026.dataset_id(tyndp2026.HOURLY))


def load_scenario_boundary(con, workers: int = 6) -> int:
    """The annual demand and electrolysis behind every boundary profile (R-BND-8), from the
    TYNDP 2024 'Yearly Outputs' sheets and the TYNDP 2026 NT+ hourly dashboards, reloaded only
    when an archive changes."""
    from concurrent.futures import ProcessPoolExecutor

    from pipeline.sources import tyndp2026
    load_lineage(con)
    paths = _mm_outputs()
    hourly = tyndp2026.path(tyndp2026.HOURLY)
    _require(paths + [hourly], "TYNDP market-model outputs (scenario_boundary)")
    archives = {p.stem: p for p in paths} | {tyndp2026.dataset_id(tyndp2026.HOURLY): hourly}
    if _archive_unchanged(con, "scenario_boundary", archives):
        return 0
    members = [(hourly, m, ty, ws) for m, ty, ws in tyndp2026.price_members(hourly)]
    cols = ["family", "scenario", "target_year", "weather", "zone", "demand_twh",
            "electrolysis_twh", "lineage_id"]
    n = 0
    with ProcessPoolExecutor(max_workers=workers) as pool:
        for df in list(pool.map(_parse_mm_yearly, paths)) + list(pool.map(_parse_balance,
                                                                          members)):
            n += _upsert(con, "scenario_boundary", df[cols])
    return n


def load_reserve_procured(con) -> int:
    """BTD procured reserves -> reserve_procured, hourly averages (D-055). The 15-minute report
    (from October 2025) wins over the hourly legacy report where both cover an hour."""
    from pipeline.sources import btd
    ranked = [(rank, path)
              for rank, rep in enumerate(("procured_reserves_legacy", "procured_reserves"))
              for path in sorted(raw_dir(btd.RAW).glob(f"btd.{rep}.BALTIC.*.json"))]
    _require([path for _, path in ranked], "BTD procured reserves (reserve_procured)")
    frames = [btd.parse_reserves(path).assign(lineage_id=path.stem, rank=rank)
              for rank, path in ranked]
    df = pd.concat(frames).sort_values("rank")
    df = df.drop_duplicates(["zone", "ts", "product", "direction"], keep="last")
    load_lineage(con)
    return _upsert(con, "reserve_procured", df.drop(columns="rank"))


def load_tech_parameters(con) -> int:
    """data/documentary/tech_parameters.csv -> tech_parameter (D-020)."""
    path = DATA_DIR / "documentary" / "tech_parameters.csv"
    if not path.exists():
        return 0
    df = pd.read_csv(path)
    src = df["source"].copy()               # the parameter source id, kept apart from doc_source
    df = _documentary_frame(path)
    df["source"] = src
    load_lineage(con)
    cols = ["source", "tech_class", "parameter", "value", "unit", "lineage_id"]
    return _replace(con, "tech_parameter", df[cols])


def load_links(con) -> int:
    """data/documentary/links.csv -> scenario_link (D-021)."""
    path = DATA_DIR / "documentary" / "links.csv"
    if not path.exists():
        return 0
    df = _documentary_frame(path)
    load_lineage(con)
    cols = ["scenario", "border", "direction", "year", "mw", "kind", "lineage_id"]
    return _replace(con, "scenario_link", df[cols])


def load_link_hourly(con) -> int:
    """ERAA 2025's hourly NTC per border, direction and target year -> scenario_link_hourly
    (D-085), read out of the cached NTC package. Every `ntc_max` and `ntc_mean` row of
    `eraa2025_ntc` in scenario_link must be the maximum and average of its profile (to 0.5 MW, the
    CSV holds whole MW), so the documentary rows stay reproducible from the archive (F3-5) and
    no row the model reads lacks its profile. Reloaded only when the archive changes (E-056)."""
    from pipeline.sources import eraa
    path = raw_dir(eraa.RAW) / "eraa2025.ntcs.zip"
    _require([path], "eraa2025.ntcs.zip (scenario_link_hourly)")
    load_lineage(con)
    n = 0
    if not _archive_unchanged(con, "scenario_link_hourly", {"eraa2025.ntcs": path}):
        df = eraa.ntc_profiles(path, BORDERS).assign(scenario="eraa2025_ntc",
                                                     lineage_id="eraa2025.ntcs")
        n = _upsert(con, "scenario_link_hourly", df[["scenario", "border", "direction",
                                                     "target_year", "hour", "mw", "lineage_id"]])
    bad = con.execute("""SELECT l.border, l.direction, l.year, l.kind, l.mw,
            CASE l.kind WHEN 'ntc_max' THEN h.mx ELSE h.mn END FROM scenario_link l
        LEFT JOIN (SELECT scenario, border, direction, target_year, max(mw) mx, avg(mw) mn
                   FROM scenario_link_hourly GROUP BY ALL) h
          ON h.scenario = l.scenario AND h.border = l.border AND h.direction = l.direction
         AND h.target_year = l.year
        WHERE l.scenario = 'eraa2025_ntc' AND l.kind IN ('ntc_max', 'ntc_mean')
          AND NOT coalesce(abs(l.mw - CASE l.kind WHEN 'ntc_max' THEN h.mx ELSE h.mn END)
                           <= 0.5, false)                       -- no profile is a mismatch
        ORDER BY ALL""").fetchall()
    if bad:
        raise ValueError("links.csv disagrees with ERAA's hourly NTC profile (border, "
                         "direction, year, kind, csv, profile): " + "; ".join(map(str, bad)))
    return n


def load_parameters(con) -> int:
    """data/documentary/parameters.csv -> parameter: scalar parameters and validation targets
    read from the documents of Appendix A.2, one page record each (R-PROV-1)."""
    path = DATA_DIR / "documentary" / "parameters.csv"
    if not path.exists():
        return 0
    df = _documentary_frame(path)
    load_lineage(con)
    return _replace(con, "parameter", df[["key", "value", "unit", "lineage_id"]])


def load_fuel_paths(con) -> int:
    """data/documentary/fuel_paths.csv -> scenario_fuel (D-019)."""
    path = DATA_DIR / "documentary" / "fuel_paths.csv"
    if not path.exists():
        return 0
    df = _documentary_frame(path)
    load_lineage(con)
    cols = ["scenario", "year", "commodity", "price", "unit", "lineage_id"]
    return _replace(con, "scenario_fuel", df[cols])


# --------------------------------------------------------------------- research (D-121)


def load_research_price(con) -> int:
    """data/research/neighbours_tight_2035.json.gz -> research_price: the neighbours' boundary
    profiles the research on Finland, Sweden and Poland computed (R-BND-5, D-121). One derived
    lineage record names the file's SHA-256, the code that wrote it and the inputs; it is written
    again when the file changes."""
    path = DATA_DIR / "research" / "neighbours_tight_2035.json.gz"
    if not path.exists():
        return 0
    raw = path.read_bytes()
    d = json.loads(gzip.decompress(raw))
    sha = hashlib.sha256(raw).hexdigest()
    notes = (f"{d['description']} File data/research/{path.name}, SHA-256 {sha}; written by "
             f"{d['code']}.")
    rec = lineage.derived(d["dataset"], d["derived_from"], notes=notes)
    if not rec.path().exists() or sha not in (lineage.LineageRecord.read(rec.path()).notes or ""):
        rec.write()
    load_lineage(con)
    rows = [(pr, int(ty), int(cy), z, h + 1, float(v), d["dataset"])
            for pr, by_ty in d["profiles"].items() for ty, by_cy in by_ty.items()
            for cy, by_z in by_cy.items() for z, s in by_z.items() for h, v in enumerate(s)]
    df = pd.DataFrame(rows, columns=["profile", "target_year", "climate_year", "zone", "hour",
                                     "eur_mwh", "lineage_id"])
    return _replace(con, "research_price", df)


# --------------------------------------------------------------------- main


def load_balancing_cb(con) -> int:
    """BTD cross-border capacity allocated to balancing on EE-LV and LV-LT -> balancing_cb,
    hourly averages (R-LINK-5). The 15-minute report wins over the hourly legacy report where
    both cover an hour (the 15-minute one is null before September 2025, v4 E-071)."""
    from pipeline.sources import btd
    ranked = [(rank, path)
              for rank, rep in enumerate(("allocated_cb_capacity_legacy", "allocated_cb_capacity"))
              for path in sorted(raw_dir(btd.RAW).glob(f"btd.{rep}.BALTIC.*.json"))]
    _require([path for _, path in ranked], "BTD allocated cross-border capacity (balancing_cb)")
    frames = []
    for rank, path in ranked:
        df = btd.parse(path)
        if df.empty:
            continue
        df["ts"] = df["ts"].dt.floor("h")
        df = df.groupby(["ts", "border", "direction", "product"], as_index=False)["value"].mean()
        frames.append(df.assign(lineage_id=path.stem, rank=rank))
    df = pd.concat(frames).sort_values("rank")
    df = df.drop_duplicates(["border", "direction", "ts", "product"], keep="last")
    df = df.rename(columns={"value": "mw"}).drop(columns="rank")
    load_lineage(con)
    return _upsert(con, "balancing_cb", df[["border", "direction", "ts", "product", "mw",
                                            "lineage_id"]])


def load_tso_series(con) -> int:
    """Fingrid EstLink series -> tso_series, hourly averages (R-LINK-2)."""
    from pipeline.sources import fingrid
    n = 0
    for path in sorted(raw_dir(fingrid.RAW).glob("fingrid.*.json")):
        series = path.stem.split(".")[2]
        df = fingrid.parse(path)
        # the file anew: a row the parser no longer yields leaves too (E-083), the rows after
        # an ended series' end among them (ERRATA E-195)
        con.execute("DELETE FROM tso_series WHERE lineage_id = ?", [path.stem])
        if df.empty:
            continue
        df["ts"] = df["ts"].dt.floor("h")
        df = df.groupby("ts", as_index=False)["value"].mean()
        n += _upsert(con, "tso_series", df.assign(source="fingrid", series=series,
                                                  lineage_id=path.stem)
                     [["source", "series", "ts", "value", "lineage_id"]])
    return n


# FI_EL: EstLink; SE4_NB: NordBalt; SE4_SP: SwePol (the Nordic ends of the Baltic HVDC links)
JAO_HUBS = {"FI", "FI_EL", "SE4", "SE4_NB", "SE4_SP"}
JAO_BALTIC = {"EE", "LT", "PL"}


def jao_keep(endpoint: str, field: str) -> bool:
    """The JAO fields v5 reads: the Finnish and SE4 hubs and the virtual hubs at the Nordic end
    of the Baltic HVDC links (net-position endpoints), and every maximum bilateral exchange
    that touches EE, LT or PL."""
    if endpoint in ("fbDomainShadowPrice", "shadowPrices"):   # jao.hub_spreads and
        return field.startswith("spread_")                    # jao.core_spread keep their own
    if endpoint == "maxExchanges":
        return bool(JAO_BALTIC & set(field.removeprefix("border_").split("_")))
    return field.split("_", 1)[-1] in JAO_HUBS


def load_jao(con) -> int:
    from pipeline.sources import jao
    n = 0
    for path in sorted(raw_dir(jao.RAW).glob("jao.*.json")):
        endpoint = path.stem.split(".")[1]
        if endpoint in jao.CORE_ENDPOINTS[1:]:  # read with their month of shadowPrices (D-076)
            continue
        if endpoint == "shadowPrices":
            df = jao.core_spread(path)
        else:
            df = jao.hub_spreads(path) if endpoint == jao.FB_ENDPOINT else jao.parse(path)
        df = df[[jao_keep(endpoint, c) for c in df["column"]]]
        if df.empty:
            continue
        df["ts"] = df["ts"].dt.floor("h")
        df = df.groupby(["column", "ts"], as_index=False)["value"].mean()
        n += _upsert(con, "jao_series", df.rename(columns={"column": "field"}).assign(
            endpoint=endpoint, lineage_id=path.stem)[["endpoint", "field", "ts", "value",
                                                      "lineage_id"]])
    return n


def load_umm(con) -> int:
    """Nord Pool UMM transmission messages -> umm_message; the newest snapshot of each zone,
    a message seen from several zones kept once."""
    from pipeline.sources import umm
    latest: dict[str, Path] = {}
    for path in sorted(raw_dir(umm.RAW).glob("umm.transmission.*.json")):
        latest[path.stem.split(".")[2]] = path
    frames = [umm.parse(p).assign(lineage_id=p.stem) for p in latest.values()]
    if not frames:
        return 0
    df = pd.concat(frames).rename(columns={"start": "start_ts", "stop": "stop_ts"})
    df = df.dropna(subset=["start_ts", "stop_ts"]).drop_duplicates(
        ["message_id", "unit", "start_ts", "stop_ts"])
    load_lineage(con)
    cols = ["message_id", "version", "published", "event_status", "unavailability_type",
            "reason_code", "reason", "remarks", "assets", "unit", "out_area", "in_area",
            "installed_mw", "unavailable_mw", "available_mw", "start_ts", "stop_ts", "lineage_id"]
    return _upsert(con, "umm_message", df[cols])


def _insert_parent(con, table: str, df: pd.DataFrame, key: str) -> int:
    """Rows other tables point at cannot be replaced (INSERT OR REPLACE deletes first, and the
    foreign keys forbid it, ERRATA E-026): insert the new ones, keep identical ones, and stop on
    a changed one, which needs a clean build (`make clean && make db`)."""
    have = con.execute(f"SELECT * FROM {table}").fetchdf()
    new = df[~df[key].isin(have[key])]
    old = df[df[key].isin(have[key])].merge(have, on=list(df.columns), how="left", indicator=True)
    changed = sorted(old.loc[old["_merge"] == "left_only", key])
    if changed:
        raise RuntimeError(f"{table}: rows {changed} changed; run `make clean && make db`")
    return _upsert(con, table, new)


def load_tyndp2026(con) -> dict[str, int]:
    """The TYNDP 2026 family (D-010): the weather scenarios with their weights, then, for those
    scenarios only, the core zones' hydro inflow, PECD 4.2 capacity factors and demand, and the
    six zones' NT+ prices. The large archives are reparsed only when they change."""
    from pipeline.sources import tyndp2026 as t
    load_lineage(con)
    tables = t.path(t.DATA_TABLES)
    hydro = t.path("input/model-input/national-trends/Hydro-Inflow.zip")
    _require([tables, hydro], "TYNDP 2026 methodology data tables and hydro inflow")
    weather = t.parse_weather(tables)
    wdf = pd.DataFrame(weather).assign(lineage_id=tables.stem)
    n_w = _insert_parent(con, "tyndp2026_weather", wdf[["code", "target_year", "climate_model",
                                                        "climate_year", "weight", "lineage_id"]],
                         key="code")
    h = t.parse_hydro(hydro, t.selected(weather)).assign(lineage_id=hydro.stem)
    n_h = _upsert(con, "tyndp2026_hydro", h[["zone", "category", "weather", "day", "mwh",
                                             "lineage_id"]])
    pecd = t.path(t.PECD)
    _require([pecd], "TYNDP 2026 PECD 4.2 (tyndp2026_pecd)")
    n_p = 0
    if not _archive_unchanged(con, "tyndp2026_pecd", {pecd.stem: pecd}):
        n_p = _upsert(con, "tyndp2026_pecd",
                      t.parse_pecd(pecd, t.selected(weather)).assign(lineage_id=pecd.stem))
    demand = t.path(t.DEMAND)
    _require([demand], "TYNDP 2026 demand profiles (tyndp2026_demand)")
    n_d = 0
    if not _archive_unchanged(con, "tyndp2026_demand", {demand.stem: demand}):
        n_d = _upsert(con, "tyndp2026_demand",
                      t.parse_demand(demand, t.selected(weather)).assign(lineage_id=demand.stem))
    return {"tyndp2026_weather": n_w, "tyndp2026_hydro": n_h, "tyndp2026_pecd": n_p,
            "tyndp2026_demand": n_d, "tyndp2026_price": load_tyndp2026_price(con)}


def load_tyndp2026_price(con) -> int:
    """NT+ hourly marginal cost of the six zones' e-market nodes (R-BND-5, D-010): one workbook
    per country and weather scenario, about two minutes in all, so the archive is reparsed only
    when it changes. The KPI dashboard's 'load-weighted' prices also weight the prosumer node,
    which carries distribution charges; the e-market node is the wholesale price."""
    from pipeline.sources import tyndp2026 as t
    path = t.path(t.HOURLY)
    _require([path], "TYNDP 2026 NT+ hourly dashboards (tyndp2026_price)")
    if _archive_unchanged(con, "tyndp2026_price", {path.stem: path}):
        return 0
    rows = [(zone, ws, hour, v) for m, _ty, ws in t.price_members(path)
            for zone, hour, v in t.parse_price_member(path, m)]
    df = pd.DataFrame(rows, columns=["zone", "weather", "hour", "eur_mwh"])
    counts = df.groupby(["zone", "weather"]).size()
    if len(counts) != 6 * 12 or not counts.isin([8760, 8784]).all():
        raise ValueError(f"tyndp2026_price: expected 6 zones x 12 weather scenarios of a full "
                         f"year, got {counts.to_dict()}")
    return _upsert(con, "tyndp2026_price", df.assign(lineage_id=path.stem))


def build(path=None) -> None:
    con = connect(path)
    load_vocabulary(con)
    n_lin = load_lineage(con)
    print(f"lineage records: {n_lin}")
    counts = load_entsoe(con)
    for doc, n in counts.items():
        print(f"entsoe {doc}: {n} rows")
    print(f"weather: {load_weather(con)} rows")
    print(f"commodity: {load_commodity(con)} rows")
    print(f"capacity_stat: {load_capacity_stat(con)} rows")
    print(f"capacity_area: {load_capacity_area(con)} rows")
    print(f"scenario_assumption: {load_documentary(con)} rows")
    print(f"scenario_fuel: {load_fuel_paths(con)} rows")
    print(f"parameter: {load_parameters(con)} rows")
    print(f"research_price: {load_research_price(con)} rows")
    print(f"tech_parameter: {load_tech_parameters(con)} rows")
    print(f"reserve_procured: {load_reserve_procured(con)} rows")
    print(f"balancing_cb: {load_balancing_cb(con)} rows")
    print(f"tso_series: {load_tso_series(con)} rows")
    print(f"jao_series: {load_jao(con)} rows")
    print(f"umm_message: {load_umm(con)} rows")
    print(f"tyndp_price: {_atomic(con, load_tyndp_price)} rows")
    print(f"scenario_link: {load_links(con)} rows")
    print(f"scenario_link_hourly: {_atomic(con, load_link_hourly)} rows")
    print(f"pecd_profile: {_atomic(con, load_pecd)} rows")
    print(f"hydro_inflow: {_atomic(con, load_hydro_inflow)} rows")
    print(f"thermal_unit: {_atomic(con, load_thermal_unit)} rows")
    print(f"demand_profile: {_atomic(con, load_demand_profile)} rows")
    for table, n in _atomic(con, load_tyndp2026).items():
        print(f"{table}: {n} rows")
    print(f"scenario_boundary: {_atomic(con, load_scenario_boundary)} rows")
    print(f"scenario_boundary_output: {_atomic(con, load_scenario_boundary_output)} rows")
    cov = con.execute("SELECT * FROM v_coverage").fetchdf()
    if not cov.empty:
        print(cov.to_string(index=False))
    con.close()


if __name__ == "__main__":
    build()
