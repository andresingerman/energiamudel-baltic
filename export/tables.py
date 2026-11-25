"""The files the panel and the engine read beside the year files: presets.json (every
documentary value the panel offers, with the lineage id behind it; R-UI-6, R-PROV-1),
links.json (scenario transfer capacities, R-LINK-3) and sources.json (what each lineage id is,
for the Sources tab, R-APP-9). Derived values (delivery caps, loss shares, the Polish
slow-build factor, reserve shares) are computed here from their sourced inputs and name every
input's lineage id.
"""

from __future__ import annotations

import math

import pandas as pd

from pipeline import lineage as lin_mod
from pipeline.config import BOUNDARY_FLEET_YEAR
from pipeline.register import PURPOSE
from pipeline.sources import documents

from . import classes
from .write import scalar, series
from .years import BORDERS, J_PER_MWH, Lineage, _frame, daugava_band, daugava_inflow_factor

DELIVERY_BASE_YEAR = 2030           # WindEurope's outlook ends here (R-SUP-9)
IRENA_SPAN = (2020, 2025)            # the years whose difference gives the build rate
EL = ("estlink1", "estlink2")
OIL_SHALE_ENTRY_YEAR = 2024           # R-SUP-4: the entry prices hold at this year's average EUA
OIL_SHALE_FUEL = ("svk_lma_2026", "2030", "oil_shale")   # 10 €/MWh thermal (R-SUP-4)
LOSS_DIRECTION = {                   # border direction -> (links, HVDC statistics direction)
    ("EE-FI", "fwd"): (EL, "ne"), ("EE-FI", "rev"): (EL, "sw"),
    ("LT-SE4", "fwd"): (("nordbalt",), "ne"), ("LT-SE4", "rev"): (("nordbalt",), "sw"),
    ("LT-PL", "fwd"): (("litpol",), "sw"), ("LT-PL", "rev"): (("litpol",), "ne"),
}


def parameters(con) -> dict[str, dict]:
    d = _frame(con, "SELECT key, value, unit, lineage_id FROM parameter ORDER BY key", [])
    return {r.key: {"value": float(r.value), "unit": r.unit, "lineage_id": r.lineage_id}
            for r in d.itertuples()}


def _v(value, unit: str, ids, decimals: int = 4) -> dict:
    return {"value": scalar(value, decimals), "unit": unit, "src": sorted(set(ids))}


def presets(con, params: dict) -> tuple[dict, Lineage]:
    lin = Lineage()
    tech = _frame(con, "SELECT source, tech_class, parameter, value, unit, lineage_id FROM "
                       "tech_parameter ORDER BY ALL", [])
    tech_json: dict = {}
    for r in tech.itertuples():
        tech_json.setdefault(f"{r.source}|{r.tech_class}", {})[r.parameter] = _v(
            r.value, r.unit, [r.lineage_id])
    sizes = {c: float(tech[(tech.source == "oil_shale_classes") & (tech.tech_class == c)
                            & (tech.parameter == "mw")].value.iloc[0])
             for c in ("oil_shale_auvere", "oil_shale_cfb")}
    sa = _frame(con, "SELECT scenario, zone, year, key, value, unit, lineage_id FROM "
                     "scenario_assumption ORDER BY ALL", [])
    fleets: dict = {}
    demand: dict = {}
    dsr: dict = {}
    electro: dict = {}
    for (sc, z, y), g in sa.groupby(["scenario", "zone", "year"], sort=True):
        ids = dict(zip(g.key, g.lineage_id, strict=True))
        cap = {k: float(v) for k, v in zip(g.key, g.value, strict=True)
               if k.startswith("capacity.")}
        if cap:
            cls, energy, flex, notes = classes.fleet(z, cap, sizes, int(y))
            src = {c: sorted({ids[k] for k in cap if _feeds(z, k, c, int(y))}) for c in cls}
            fleets.setdefault(sc, {}).setdefault(z, {})[str(y)] = {
                "classes": {c: {"mw": scalar(v, 1), "src": src[c]}
                            for c, v in sorted(cls.items())},
                "battery_mwh": ({"mwh": scalar(energy["battery"], 1),
                                 "src": [ids["capacity.battery_mwh"]]} if "battery" in energy
                                else None),
                "flex": {k: {"mw": scalar(v, 1), "src": sorted({ids[x] for x in cap
                                                                if _flex(z, x) == k})}
                         for k, v in sorted(flex.items())},
                "notes": notes,
                "rows": {k.split(".", 1)[1]: {
                    "value": scalar(v, 1), "src": [ids[k]],
                    "cls": next((c for c in sorted(cls) if classes.rule(z, k, int(y)).target == c),
                                None)}
                    for k, v in sorted(cap.items())}}
        dem = {k: (float(v), ids[k]) for k, v in zip(g.key, g.value, strict=True)
               if k.startswith("demand.")}
        if dem:
            demand.setdefault(sc, {}).setdefault(z, {})[str(y)] = {
                k.split(".", 1)[1]: _v(v, _unit(g, k), [i]) for k, (v, i) in sorted(dem.items())}
        bands = sorted(int(k.rsplit(".", 1)[1]) for k in g.key if k.startswith("flex.dsr."))
        if bands:
            dsr.setdefault(sc, {}).setdefault(z, {})[str(y)] = [_band(g, ids, p) for p in bands]
        if "efficiency.electrolyser" in ids:
            electro.setdefault(sc, {}).setdefault(z, {})[str(y)] = _v(
                float(g[g.key == "efficiency.electrolyser"].value.iloc[0]), "fraction",
                [ids["efficiency.electrolyser"]])
    fuel = _frame(con, "SELECT scenario, year, commodity, price, unit, lineage_id FROM "
                       "scenario_fuel ORDER BY ALL", [])
    fuel_paths: dict = {}
    for r in fuel.itertuples():
        fuel_paths.setdefault(r.scenario, {}).setdefault(str(r.year), {})[r.commodity] = _v(
            r.price, r.unit, [r.lineage_id])
    obj = {
        "contract": 1,
        "classes": {c: {"label": label, "params": (f"{p[0]}|{p[1]}" if p else None)}
                    for c, (label, p) in classes.CLASSES.items()},
        "class_rules": {k: {"target": r.target, "why": r.why,
                            "params": f"{r.params[0]}|{r.params[1]}" if r.params else None}
                        for k, r in sorted(classes.KEYS.items())},
        "tech": tech_json,
        "fleets": fleets, "demand": demand, "dsr": dsr, "electrolyser_efficiency": electro,
        "fuel_paths": fuel_paths,
        "parameters": {k: _v(v["value"], v["unit"], [v["lineage_id"]])
                       for k, v in sorted(params.items())},
        "delivery": delivery(params, fleets),
        "loss_share": loss_share(params),
        "boundary": boundary(con, params),
        "weights": weights(con, params),
        "climate_years": climate_years(con, params),
        "statistics": statistics(con, params),
        "reserve": reserve(con, params),
        "hydro": hydro(con, params),
        "oil_shale": oil_shale(con, tech_json, fuel_paths),
        "fitted": fitted_section(),
        "sensitivity": sensitivity(con, params),
        "links": {"lines": lines(con, params), "reserve_2025": reserve_2025(con)},
        "adequacy": adequacy(con, params),
    }
    for sec in ("fleets", "demand", "dsr", "tech", "fuel_paths", "parameters", "delivery",
                "loss_share", "boundary", "weights", "climate_years", "statistics", "reserve",
                "hydro",
                "electrolyser_efficiency", "oil_shale", "fitted", "sensitivity", "links",
                "adequacy"):
        lin.add(f"presets.{sec}", _all_src(obj[sec]))
    return obj, lin


def _band(g: pd.DataFrame, ids: dict, price: int) -> dict:
    """One DSR band (R-DEM-6): MW at a price, and the hours per day it may run; a band whose
    source states no daily limit runs 24 h."""
    val = dict(zip(g.key, g.value, strict=True))
    hk = f"flex.dsr_hours.{price}"
    return {"price": price, "mw": scalar(float(val[f"flex.dsr.{price}"]), 1),
            "hours": int(float(val[hk])) if hk in val else 24,
            "src": sorted({ids[f"flex.dsr.{price}"]} | ({ids[hk]} if hk in ids else set()))}


def _unit(g: pd.DataFrame, key: str) -> str:
    return g[g.key == key].unit.iloc[0]


def _feeds(zone: str, key: str, cls: str, year: int | None = None) -> bool:
    r = classes.rule(zone, key, year)
    return r.target == cls or (r.target == "split:oil_shale" and cls in classes.OIL_SHALE_ORDER)


def _flex(zone: str, key: str) -> str | None:
    r = classes.rule(zone, key)
    return r.target.split(":", 1)[1] if r.target.startswith("flex:") else None


def _all_src(obj) -> set[str]:
    out: set[str] = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "src":
                out |= set(v)
            else:
                out |= _all_src(v)
    elif isinstance(obj, list):
        for v in obj:
            out |= _all_src(v)
    return out


def delivery(params: dict, fleets: dict) -> dict:
    """The delivery caps of R-SUP-9 per zone and target year: onshore wind on WindEurope's 2030
    expectation plus the 2021-2025 build rate for each later year; offshore from the first
    Lithuanian project only; batteries installed and contracted. The engine takes the lower
    of the preset's value and the cap; Latvia's batteries have no cap (no evidence)."""
    def p(key):
        return params[key]["value"], params[key]["lineage_id"]

    out: dict = {}
    # the preset's source row: D-105 leaves offshore wind out of Lithuania's fleets, not this cap
    row = fleets["litgrid_ltrsc_2035"]["LT"]["2035"]["rows"]["wind_offshore"]
    lt_first = {"mw": row["value"], "src": row["src"]}
    for z in ("ee", "lv", "lt"):
        base, b_id = p(f"delivery.{z}.wind_onshore.windeurope_2030_mw")
        v20, i20 = p(f"delivery.{z}.wind_onshore.irena_{IRENA_SPAN[0]}_mw")
        v25, i25 = p(f"delivery.{z}.wind_onshore.irena_{IRENA_SPAN[1]}_mw")
        rate = (v25 - v20) / (IRENA_SPAN[1] - IRENA_SPAN[0])
        years: dict = {}
        for ty in (2030, 2035, 2040, 2050):
            e: dict = {"wind_onshore_mw": _v(base + rate * (ty - DELIVERY_BASE_YEAR), "MW",
                                             [b_id, i20, i25])}
            if z == "lt":
                off, oid = p("delivery.lt.wind_offshore.windeurope_2030_mw")
                e["wind_offshore_mw"] = (_v(off, "MW", [oid]) if ty <= DELIVERY_BASE_YEAR else
                                         _v(lt_first["mw"], "MW", lt_first["src"]))
            else:
                e["wind_offshore_mw"] = _v(0, "MW", [b_id])
            years[str(ty)] = e
        out[z.upper()] = {"onshore_rate_mw_per_year": _v(rate, "MW/yr", [i20, i25]),
                          "years": years}
    au, au_id = p("delivery.ee.battery.auvere_mw")
    auh, auh_id = p("delivery.ee.battery.auvere_mwh")
    hz, hz_id = p("delivery.ee.battery.hertz_1_2_mw")
    hzh, hzh_id = p("delivery.ee.battery.hertz_1_2_mwh")
    out["EE"]["battery_mw"] = _v(au + hz, "MW", [au_id, hz_id])
    out["EE"]["battery_mwh"] = _v(auh + hzh, "MWh", [auh_id, hzh_id])
    tr, tr_id = p("delivery.lt.battery.transmission_mw")
    di, di_id = p("delivery.lt.battery.distribution_mw")
    cs, cs_id = p("delivery.lt.battery.capex_scheme_mw")
    csh, csh_id = p("delivery.lt.battery.capex_scheme_mwh")
    hrs, hrs_id = p("battery.default_hours")
    out["LT"]["battery_mw"] = _v(tr + di + cs, "MW", [tr_id, di_id, cs_id])
    out["LT"]["battery_mwh"] = _v((tr + di) * hrs + csh, "MWh", [tr_id, di_id, hrs_id, csh_id])
    return out


def loss_share(params: dict) -> dict:
    """R-BND-4: the share of the energy sent that a border's HVDC links lose, per direction,
    from the 2024 statistics (received energy excludes losses: loss / (received + loss))."""
    out: dict = {}
    for (border, direction), (links, d) in LOSS_DIRECTION.items():
        loss = sum(params[f"hvdc.{k}.2024.losses_{d}_gwh"]["value"] for k in links)
        sent = sum(params[f"hvdc.{k}.2024.transmission_{d}_gwh"]["value"] for k in links) + loss
        ids = [params[f"hvdc.{k}.2024.{x}_{d}_gwh"]["lineage_id"] for k in links
               for x in ("losses", "transmission")]
        out.setdefault(border, {})[direction] = _v(loss / sent, "fraction", ids)
    return out


def boundary(con, params: dict) -> dict:
    """R-BND-5's Polish slow-build factor, R-BND-8's demand behind every profile and, for the
    import-price page, the TYNDP 2024 generation and capacity behind it (D-040, D-041)."""
    nt = _frame(con, "SELECT sum(w.weight * m.mean) AS v, list(DISTINCT m.lid) AS ids FROM "
                     "tyndp2026_weather w JOIN (SELECT weather, avg(eur_mwh) AS mean, "
                     "any_value(lineage_id) AS lid FROM tyndp2026_price WHERE zone='PL' "
                     "GROUP BY weather) m ON m.weather = w.code WHERE w.target_year = 2040", [])
    lo = params["boundary.pl.svk_lma_2026_2040_min_eur_mwh"]
    factor = lo["value"] / float(nt.v.iloc[0])
    rows = _frame(con, "SELECT * FROM scenario_boundary ORDER BY family, scenario, target_year, "
                       "weather, zone", [])
    demand = [{"family": r.family, "scenario": r.scenario, "target_year": int(r.target_year),
               "weather": r.weather, "zone": r.zone,
               "demand_twh": scalar(r.demand_twh, 2), "electrolysis_twh":
               scalar(r.electrolysis_twh, 2), "src": [r.lineage_id]} for r in rows.itertuples()]
    out = _frame(con, "SELECT * FROM scenario_boundary_output ORDER BY family, scenario, "
                      "target_year, weather, zone, measure, output", [])
    row = lambda r, key, digits: {"family": r.family, "scenario": r.scenario,  # noqa: E731
                                  "target_year": int(r.target_year), "weather": r.weather,
                                  "zone": r.zone, "output": r.output,
                                  key: scalar(r.value, digits), "src": [r.lineage_id]}
    generation = [row(r, "twh", 3) for r in out.itertuples() if r.measure == "twh"]
    capacity = [row(r, "mw", 1) for r in out.itertuples() if r.measure == "mw"]
    # the zones' observed fleet beside the market model's (D-256): ENTSO-E's installed capacity
    # per production type (A68) on 1 January of BOUNDARY_FLEET_YEAR — the end of the year before
    fl = _frame(con, "SELECT zone, tech, mw, lineage_id FROM capacity WHERE year=? AND zone IN "
                     "('FI','SE4','PL') ORDER BY zone, tech", [BOUNDARY_FLEET_YEAR])
    if set(fl.zone) != {"FI", "SE4", "PL"}:
        raise ValueError(f"boundary fleet: A68 of {BOUNDARY_FLEET_YEAR} holds "
                         f"{sorted(set(fl.zone))}, expected FI, PL and SE4")
    fleet = [{"zone": r.zone, "tech": r.tech, "year": BOUNDARY_FLEET_YEAR, "mw": scalar(r.mw, 1),
              "src": [r.lineage_id]} for r in fl.itertuples()]
    # each profile's average price per boundary zone, weighted over its weather years as the runs
    # weight them (R-TIME-3; National Trends has climate year 2009 alone): the panel's "Other"
    # list names each profile with it (D-047)
    w24 = {cy: params[f"climate_year.weight.{cy}"]["value"] for cy in (1995, 2008, 2009)}
    m24 = _frame(con, "SELECT scenario, target_year, climate_year, zone, avg(eur_mwh) AS mean, "
                      "any_value(lineage_id) AS lid FROM tyndp_price WHERE zone IN "
                      "('FI','SE4','PL') GROUP BY ALL ORDER BY ALL", [])
    mean_price = []
    for (sc, ty, zone), g in m24.groupby(["scenario", "target_year", "zone"], sort=True):
        ws = [w24[int(cy)] for cy in g.climate_year]
        mean_price.append({"family": "tyndp2024", "scenario": sc, "target_year": int(ty),
                           "zone": zone, **_v(float((g["mean"] * ws).sum() / sum(ws)), "EUR/MWh",
                                              sorted(g.lid))})
    # the neighbours' observed prices of a past year, the same series in every climate year (D-051):
    # the average of that series, the price at the zone's end of the cable (D-075, D-076)
    from . import axis
    from .years import REAL_YEARS, _boundary_observed
    for real in REAL_YEARS:
        for zone in ("FI", "PL", "SE4"):
            lin = Lineage()
            a = _boundary_observed(con, zone, axis.observed_index(real), zone, lin, [], [])
            mean_price.append({"family": "observed", "scenario": "REAL", "target_year": real,
                               "zone": zone, **_v(math.fsum(a) / len(a), "EUR/MWh",
                                                  sorted(lin.map[zone]))})
    # the neighbours tight of the research on Finland, Sweden and Poland (D-121), weighted as above
    mr = _frame(con, "SELECT profile, target_year, climate_year, zone, avg(eur_mwh) AS mean, "
                     "any_value(lineage_id) AS lid FROM research_price GROUP BY ALL "
                     "ORDER BY ALL", [])
    for (pr, ty, zone), g in mr.groupby(["profile", "target_year", "zone"], sort=True):
        ws = [w24[int(cy)] for cy in g.climate_year]
        mean_price.append({"family": "research", "scenario": pr, "target_year": int(ty),
                           "zone": zone, **_v(float((g["mean"] * ws).sum() / sum(ws)), "EUR/MWh",
                                              sorted(set(g.lid)))})
    m26 = _frame(con, "SELECT w.target_year, p.zone, sum(w.weight * p.mean) / sum(w.weight) AS "
                      "mean, list(DISTINCT p.lid ORDER BY p.lid) AS ids FROM tyndp2026_weather w "
                      "JOIN (SELECT weather, zone, avg(eur_mwh) AS mean, any_value(lineage_id) AS "
                      "lid FROM tyndp2026_price WHERE zone IN ('FI','SE4','PL') GROUP BY ALL) p "
                      "ON p.weather = w.code GROUP BY ALL ORDER BY ALL", [])
    mean_price += [{"family": "tyndp2026", "scenario": "NTplus", "target_year": int(r.target_year),
                    "zone": r.zone, **_v(float(r.mean), "EUR/MWh", list(r.ids))}
                   for r in m26.itertuples()]
    return {"pl_slow_build_factor": _v(factor, "ratio", [lo["lineage_id"]] + list(nt.ids.iloc[0])),
            "ntplus_pl_2040_mean_eur_mwh": _v(float(nt.v.iloc[0]), "EUR/MWh",
                                              list(nt.ids.iloc[0])),
            "svk_lma_2026_2040": {z: {m: _v(params[f"boundary.{z}.svk_lma_2026_2040_{m}_eur_mwh"]
                                            ["value"], "EUR/MWh",
                                            [params[f"boundary.{z}.svk_lma_2026_2040_{m}_eur_mwh"]
                                             ["lineage_id"]]) for m in ("min", "max")}
                                  for z in ("pl", "fi")},
            "demand": demand, "generation": generation,
            "capacity": capacity, "fleet": fleet, "mean_price": mean_price}


def weights(con, params: dict) -> dict:
    ws = _frame(con, "SELECT code, target_year, climate_model, climate_year, weight, lineage_id "
                     "FROM tyndp2026_weather ORDER BY code", [])
    return {"tyndp2024": {str(cy): _v(params[f"climate_year.weight.{cy}"]["value"], "fraction",
                                      [params[f"climate_year.weight.{cy}"]["lineage_id"]])
                          for cy in (1995, 2008, 2009)},
            "tyndp2026": {r.code: {"target_year": int(r.target_year), "climate_model":
                                   r.climate_model, "year": int(r.climate_year),
                                   **_v(r.weight, "fraction", [r.lineage_id])}
                          for r in ws.itertuples()}}


def reserve(con, params: dict) -> dict:
    """R-STO-6: the 2026 Baltic need (Elering 2025-11-07) and the 2025 procurement shares per zone
    that allocate it in scenario years."""
    d = _frame(con, "SELECT zone, product, direction, avg(mw) AS mw, list(DISTINCT lineage_id) "
                    "AS ids FROM reserve_procured WHERE ts >= '2025-02-04 23:00' AND ts < "
                    "'2026-01-01' GROUP BY ALL ORDER BY ALL", [])
    shares: dict = {}
    for (prod, direction), g in d.groupby(["product", "direction"], sort=True):
        tot = g.mw.sum()
        for r in g.itertuples():
            shares.setdefault(f"{prod}_{direction}", {})[r.zone] = _v(
                r.mw / tot if tot else 0.0, "fraction", r.ids)
    need = {k.split(".", 2)[2]: _v(v["value"], v["unit"], [v["lineage_id"]])
            for k, v in params.items() if k.startswith("reserve.baltic_demand_2026.")}
    return {"need_2026": need, "shares_2025": shares,
            "tso_assets": {k.split(".", 2)[2]: _v(v["value"], v["unit"], [v["lineage_id"]])
                           for k, v in params.items() if k.startswith("reserve.tso_asset.")}}


def hydro(con, params: dict) -> dict:
    """R-ENG-5: the Daugava cascade's turbine bounds per TYNDP 2024 target year and Kruonis's
    power, energy and cycle efficiency."""
    # climate-independent rows (P_NOM_TURB MW, E_MAX_TURB GWh) and the highest minimum flow of
    # any week; the weekly maximum (MAX_TURB) is in each climate-year file
    d = _frame(con, "SELECT target_year AS ty, variable, max(value) AS v, list(DISTINCT "
                    "lineage_id) AS ids FROM hydro_inflow WHERE zone='LV' AND category='pondage' "
                    "AND variable IN ('P_NOM_TURB','E_MAX_TURB','MIN_TURB') GROUP BY ALL "
                    "ORDER BY ALL", [])
    units = {"P_NOM_TURB": ("p_nom_turb_mw", "MW"), "E_MAX_TURB": ("e_max_turb_gwh", "GWh"),
             "MIN_TURB": ("min_turb_mw", "MW")}
    dg: dict = {}
    for r in d.itertuples():
        key, unit = units[r.variable]
        dg.setdefault(str(r.ty), {})[key] = _v(r.v, unit, r.ids)
    t = _frame(con, "SELECT parameter, value, unit, lineage_id FROM tech_parameter WHERE "
                    "tech_class='hydro_ps_kruonis'", [])
    k = {r.parameter: _v(r.value, r.unit, [r.lineage_id]) for r in t.itertuples()}
    out = {"daugava_tyndp2024": dg, "kruonis": k}
    f = daugava_inflow_factor(con)
    if f:    # D-070: what the climate-year files' Daugava inflow was multiplied by, and from what
        by_year = {str(y): scalar(r, 3) for y, r in f[2].items()}
        out["daugava_inflow_factor"] = {**_v(f[0], "ratio", f[1]), "by_climate_year": by_year}
    band = daugava_band(con)
    if band:                                   # D-071: the scenario's band on the cascade
        out["daugava_band"] = band
    return out


def oil_shale(con, tech: dict, fuel_paths: dict) -> dict:
    """R-SUP-4 (v4 D-062): each oil-shale class's constant premium, its market-entry price minus
    its short-run cost at the entry year's average EUA price with fuel at 10 €/MWh thermal, so the
    CO2 part of the bid moves with the CO2 price and the premium does not."""
    d = _frame(con, "SELECT count(*) AS n, list(price) AS xs, list(DISTINCT lineage_id) AS ids "
                    "FROM commodity WHERE commodity='eua' AND year(ts)=?", [OIL_SHALE_ENTRY_YEAR])
    if d.empty or d.n.iloc[0] == 0:                      # over no rows list() is NA (E-085)
        raise ValueError(f"no EUA prices in {OIL_SHALE_ENTRY_YEAR}")
    xs = d["xs"].iloc[0]
    eua, eua_ids = math.fsum(xs) / len(xs), sorted(d.ids.iloc[0])   # exact, order-free (E-060)
    src, year, commodity = OIL_SHALE_FUEL
    fuel = fuel_paths[src][year][commodity]
    out = {"eua_reference_eur_t": _v(eua, "EUR/t", eua_ids)}
    for c in classes.OIL_SHALE_ORDER:
        t = tech[f"oil_shale_classes|{c}"]
        eff, co2, vom, entry = (t[k]["value"] for k in
                                ("efficiency", "co2_factor", "vom", "market_entry_price"))
        cost = fuel["value"] / eff + eua * co2 * 3.6 / 1000 / eff + vom
        ids = eua_ids + fuel["src"] + [i for k in ("efficiency", "co2_factor", "vom",
                                                   "market_entry_price") for i in t[k]["src"]]
        out[c] = _v(entry - cost, "EUR/MWh", ids)
    return out


def sensitivity(con, params: dict) -> dict:
    """R-APP-11 (d): the highest monthly TTF price of 2026 in the World Bank Pink Sheet, in euros
    per MWh thermal at the ECB rate of the same month (R-SUP-3, OPEN-13); each export fixes it
    with the lineage of that month. (e), revision 2.20: the EU allowance's average price in 2026's
    EEX auctions so far, the CO2 price if it held to the target year (D-140)."""
    d = _frame(con, "SELECT commodity, month(ts) AS m, list(price) AS xs, list(DISTINCT "
                    "lineage_id) AS ids FROM commodity WHERE year(ts)=2026 AND commodity IN "
                    "('gas_ttf','usd_per_eur') GROUP BY ALL", [])
    got = {(r.commodity, r.m): (math.fsum(r.xs) / len(r.xs), list(r.ids))   # E-060
           for r in d.itertuples()}
    months = sorted(m for c, m in got if c == "gas_ttf" and ("usd_per_eur", m) in got)
    if not months:
        raise ValueError("no 2026 TTF month with an exchange rate")
    m = max(months, key=lambda k: (got[("gas_ttf", k)][0], -k))
    usd, gas_ids = got[("gas_ttf", m)]
    fx, fx_ids = got[("usd_per_eur", m)]
    unit = params["unit.j_per_btu_it"]
    eur = usd / fx / (unit["value"] * 1e6 / J_PER_MWH)
    ids = gas_ids + fx_ids + [unit["lineage_id"]]
    e = _frame(con, "SELECT list(price) AS xs, list(DISTINCT lineage_id) AS ids, max(ts) AS last "
                    "FROM commodity WHERE commodity='eua' AND year(ts)=2026", [])
    xs = [] if e.empty or e["xs"][0] is None else [float(x) for x in e["xs"][0]]
    if not xs:
        raise ValueError("no 2026 EUA auction")
    eua_ids = sorted(e["ids"][0])
    return {"gas_shock": {"month": f"2026-{m:02d}", "usd_mmbtu": _v(usd, "USD/mmbtu", gas_ids),
                          "eur_mwh_th": _v(eur, "EUR/MWh", ids)},
            "co2_2026": {"through": str(e["last"][0])[:10],   # E-060: the exact sum
                         "eur_t": _v(math.fsum(xs) / len(xs), "EUR/t", eua_ids)}}


def fitted_section() -> dict:
    """The fitted parameters of M3 (R-VAL-2, R-PROV-4; `validate/fitted.py`), each fit with the
    derived lineage record naming its inputs as its source."""
    from validate import fitted

    def with_src(node):
        if isinstance(node, dict):
            out = {k: with_src(v) for k, v in node.items()}
            if "lineage_id" in node:
                out["src"] = [node["lineage_id"]]
            return out
        return node

    reg = fitted.read()
    return {k: with_src(v) for k, v in sorted(reg.items()) if k != "contract"}


# R-LINK-1: the lines behind each border, as the panel switches them and R-LINK-4's what-ifs name
# them; AC lines of a border already in service are one group, since their NTC is set jointly
LINES = {
    "estlink1": ("EE-FI", "EstLink 1", "hvdc"), "estlink2": ("EE-FI", "EstLink 2", "hvdc"),
    "estlink3": ("EE-FI", "EstLink 3", "hvdc"), "ee_lv": ("EE-LV", "EE–LV lines", "ac"),
    "ee_lv_4": ("EE-LV", "Fourth EE–LV line", "ac"), "lv_lt": ("LV-LT", "LV–LT lines", "ac"),
    "nordbalt": ("LT-SE4", "NordBalt", "hvdc"),
    # AC as they run and are built (D-170): LitPol since 9 February 2025, when the Baltic states
    # joined Continental Europe through it and its back-to-back converter left the path; Harmony
    # Link a double-circuit 220 kV line overland (PSE and Litgrid, 15 July 2024)
    "litpol": ("LT-PL", "LitPol", "ac"), "harmony": ("LT-PL", "Harmony Link", "ac"),
}
# a planned line: its border, the last ERAA 2025 target year without it and the first with it —
# checked against ERAA's own NTC below; the owner chose ERAA's dates as the default (D-031)
PLANNED = {"estlink3": ("EE-FI", 2033, 2035), "ee_lv_4": ("EE-LV", 2033, 2035),
           "harmony": ("LT-PL", 2028, 2030)}
AVAILABILITY_YEARS = range(2019, 2025)   # the years the statistics break unavailability down
LONG_FAILURES = {("estlink2", 2024)}      # a cable fault: the adequacy tab samples these (D-032)
RESERVE_FROM = "2025-02-04 23:00"         # the balancing capacity market's first hour, as reserve()


def _availability(params: dict, stats: str) -> dict:
    """R-LINK-3 (ii), OPEN-5: a cable's average available technical capacity and planned-maintenance
    share over AVAILABILITY_YEARS, leaving out years of a long failure."""
    out: dict = {}
    for name, metric in (("availability", "available_technical_capacity_pct"),
                         ("planned_share", "planned_maintenance_pct")):
        rows = [params[k] for y in AVAILABILITY_YEARS if (stats, y) not in LONG_FAILURES
                and (k := f"hvdc.{stats}.{y}.{metric}") in params]
        if len(rows) < 3:
            raise ValueError(f"{stats}: {len(rows)} years of {metric}")
        out[name] = _v(sum(r["value"] for r in rows) / len(rows) / 100, "fraction",
                       [r["lineage_id"] for r in rows])
    return out


def lines(con, params: dict) -> dict:
    """R-LINK-1, R-LINK-3: the lines behind each border for the panel and the engine."""
    d = _frame(con, "SELECT border, direction, target_year AS ty, avg(mw) AS mw, "
                    "list(DISTINCT lineage_id) AS ids FROM scenario_link_hourly WHERE "
                    "scenario='eraa2025_ntc' GROUP BY ALL", [])
    ntc = {(r.border, r.direction, int(r.ty)): r.mw for r in d.itertuples()}
    ids = {(r.border, r.direction, int(r.ty)): list(r.ids) for r in d.itertuples()}
    c = _frame(con, "SELECT border, year, lineage_id FROM scenario_link WHERE scenario="
                    "'elering_vka_2025' AND kind='commissioning_year' AND direction='fwd'", [])
    tso = {r.border: (int(r.year), [r.lineage_id]) for r in c.itertuples()}
    fo = params["outage.eraa2025.hvdc_forced_outage_rate_default"]
    out: dict = {}
    for key, (border, name, kind) in LINES.items():
        line: dict = {"border": border, "name": name, "kind": kind}
        # the border's ERAA NTC is the group's capacity (LT-PL's lines carry their own MW, below)
        if kind == "ac" and key not in PLANNED and border != "LT-PL":
            line["src"] = sorted({i for (b, _, _), v in ids.items() if b == border for i in v})
        if key in PLANNED:
            _, before, first = PLANNED[key]
            step = min(ntc[(border, d, first)] - ntc[(border, d, before)] for d in ("fwd", "rev"))
            if step < 400:
                raise ValueError(f"{key}: ERAA's {border} NTC rises by {step:.0f} MW from "
                                 f"{before} to {first}, not by a line")
            line["planned"] = {"eraa_year": first, "eraa_before": before,
                               "tso": {"year": tso[border][0], "src": tso[border][1]},
                               "src": sorted({i for d in ("fwd", "rev") for t in (before, first)
                                              for i in ids[(border, d, t)]})}
            if kind == "ac":  # the average MW ERAA's step adds, both directions averaged
                line["mw"] = _v(sum(ntc[(border, d, first)] - ntc[(border, d, before)]
                                    for d in ("fwd", "rev")) / 2, "MW", line["planned"]["src"])
        if border == "LT-PL":
            # LT-PL's lines at their MW, held to Litgrid's plan (R-LINK-3), never derated: ERAA's
            # forced-outage rate for HVAC is 0 % (D-170). Harmony Link ERAA's LT-PL NTC from 2030,
            # 700 MW; LitPol alone Litgrid's market capacity before Harmony Link, 500 MW in
            # 2027-2030; together Litgrid's 1 200 from 2031
            if key == "harmony":
                line["mw"] = _v(ntc[(border, "fwd", PLANNED[key][2])], "MW",
                                line["planned"]["src"])
            else:
                lp = _frame(con, "SELECT mw, lineage_id FROM scenario_link WHERE "
                                 "scenario='litgrid_2026_2035' AND kind='ntc' AND "
                                 "border='LT-PL' AND direction='fwd' AND year=2030", [])
                if len(lp) != 1:
                    raise ValueError(f"LitPol: {len(lp)} rows of Litgrid's plan for 2030")
                line["mw"] = _v(float(lp.mw[0]), "MW", [lp.lineage_id[0]])
        elif kind == "hvdc":
            if key not in PLANNED:  # a cable of the HVDC statistics, under its own name
                rated = params[f"hvdc.{key}.rated_mw"]
                line["mw"] = _v(rated["value"], "MW", [rated["lineage_id"]])
                line.update(_availability(params, key))
            else:  # no history: ERAA's default forced-outage rate, no planned share (R-LINK-7)
                _, before, first = PLANNED[key]  # EstLink 3: ERAA's EE-FI step
                mw = ntc[(border, "fwd", first)] - ntc[(border, "fwd", before)]
                line["mw"] = _v(mw, "MW", line["planned"]["src"])
                line["availability"] = _v(1 - fo["value"], "fraction", [fo["lineage_id"]])
                line["planned_share"] = _v(0.0, "fraction", [fo["lineage_id"]])
        out[key] = line
    return out


# R-LINK-7 (M5): what the adequacy sampler draws from
QUANTILES = 1024                          # PLAN §3.4: a draw is an index into a quantile table
# the classes whose units the sampler draws: PEMMDB's fuel and a word of its plant type
UNIT_CLASSES = {"oil_shale_auvere": ("Oil shale", ""), "oil_shale_cfb": ("Oil shale", ""),
                "oil_shale_pf": ("Oil shale", ""), "gas_ccgt": ("Gas", "CCGT"),
                "gas_ocgt": ("Gas", "OCGT"), "gas_conventional": ("Gas", "Conventional"),
                "nuclear": ("Nuclear", "")}
# ERAA 2025's rows for the oil-shale classes, as D-014 maps ERAA's oil shale onto them
OIL_SHALE_ERAA = {"oil_shale_auvere": "oil_shale_new", "oil_shale_cfb": "oil_shale_old",
                  "oil_shale_pf": "oil_shale_old"}


def adequacy(con, params: dict) -> dict:
    """R-LINK-7 (M5): the adequacy sampler's inputs. Unit-exponential quantiles, so that the
    browser needs no logarithm (PLAN §3.4); each cable's short trips over AVAILABILITY_YEARS
    (rate, and average length as its disturbance hours over its trips); the cables' long failures
    (Ofgem/GHD's rate per km of cable, repair times from Ofgem/GHD and CIGRE); ERAA's default for
    a line without history; and per zone each sampled class's unit size (PEMMDB National Trends;
    a zone without the type takes the Baltic average, and without nuclear the plant's own units)
    with ERAA 2025's forced-outage rate and repair time."""
    from . import classes
    p = lambda k: params[k]  # noqa: E731
    cables: dict = {}
    for key in ("estlink1", "estlink2", "nordbalt"):  # LitPol, AC since 2025, is not (D-170)
        years = [y for y in AVAILABILITY_YEARS if (key, y) not in LONG_FAILURES]
        counts = [p(k) for y in years if (k := f"hvdc.{key}.{y}.disturbance_outages_n") in params]
        both = [(p(f"hvdc.{key}.{y}.disturbance_pct"), p(f"hvdc.{key}.{y}.disturbance_outages_n"))
                for y in years if f"hvdc.{key}.{y}.disturbance_pct" in params
                and f"hvdc.{key}.{y}.disturbance_outages_n" in params]
        if len(counts) < 3 or len(both) < 3:
            raise ValueError(f"{key}: {len(counts)} years of trips, {len(both)} with their hours")
        shares = [p(k) for y in years if (k := f"hvdc.{key}.{y}.disturbance_pct") in params]
        trips = sum(b["value"] for _, b in both)
        hours = sum(a["value"] / 100 * 8760 for a, _ in both) / max(1, trips)
        km = p(f"hvdc.{key}.cable_km")
        cables[key] = {
            "trips_per_year": _v(sum(c["value"] for c in counts) / len(counts), "1/year",
                                 [c["lineage_id"] for c in counts]),
            "trip_hours": _v(max(1.0, hours), "h",
                             [x["lineage_id"] for pair in both for x in pair]),
            "cable_km": _v(km["value"], "km", [km["lineage_id"]]),
            # the share of its time the sampled trips replace in a sampled year (the rest of its
            # unavailability, limitations and unplanned maintenance, stays spread)
            "disturbance_share": _v(sum(s["value"] for s in shares) / len(shares) / 100,
                                    "fraction", [s["lineage_id"] for s in shares])}
    ext, inn = (p(f"outage.ofgem.subsea_cable_{k}_failures_per_cct_km_year")
                for k in ("external", "internal"))
    cigre = p("outage.cigre_tb815.submarine_cable_avg_outage_time_months")
    lo, hi = (p(f"outage.submarine_cable_failures_per_year_{k}") for k in ("low", "high"))
    # 0.00048 a km: four decimals made it 0.0005, 4 % more failures (the review of 2026-10-08)
    long = {"per_km_year": _v(ext["value"] + inn["value"], "1/(km year)",
                              [ext["lineage_id"], inn["lineage_id"]], decimals=8),
            "per_year": {"low": _v(lo["value"], "1/year", [lo["lineage_id"]]),
                         "high": _v(hi["value"], "1/year", [hi["lineage_id"]])},
            "repair_days": {"ofgem": _v(p("outage.ofgem.subsea_cable_mttr_days")["value"], "days",
                                        [p("outage.ofgem.subsea_cable_mttr_days")["lineage_id"]]),
                            "ofgem_high": _v(p("outage.ofgem.subsea_cable_mttr_days_high")["value"],
                                             "days", [p("outage.ofgem.subsea_cable_mttr_days_high")
                                                      ["lineage_id"]]),
                            "cigre": _v(cigre["value"] * 365.25 / 12, "days",
                                        [cigre["lineage_id"]])}}
    fo, mttr = (p(f"outage.eraa2025.{k}") for k in ("hvdc_forced_outage_rate_default",
                                                     "line_mttr_days_default"))
    tu = _frame(con, "SELECT zone, fuel, plant_type, mw, units, lineage_id FROM thermal_unit "
                     "WHERE units > 0", [])
    tech = {(r.tech_class, r.parameter): (r.value, r.lineage_id) for r in _frame(
        con, "SELECT tech_class, parameter, value, lineage_id FROM tech_parameter WHERE "
             "source='eraa2025_common'", []).itertuples()}
    smr = p("smr.bwrx300.net_output_mw")
    units: dict = {}
    for cls, (fuel, word) in UNIT_CLASSES.items():
        rows = tu[(tu.fuel == fuel) & tu.plant_type.str.contains(word)]
        row = OIL_SHALE_ERAA.get(cls) or classes.eraa_row(cls)
        rate, rid = tech[(row, "forced_outage_rate")]
        days, did = tech[(row, "mean_time_to_repair")]
        for z in ("EE", "LV", "LT"):
            own = rows[rows.zone == z]
            if len(own) or cls != "nuclear":
                use = own if len(own) else rows
                if use.empty:
                    raise ValueError(f"{cls}: no PEMMDB units")
                size = _v(use.mw.sum() / use.units.sum(), "MW", list(use.lineage_id.unique()))
            else:
                size = _v(smr["value"], "MW", [smr["lineage_id"]])
            units.setdefault(z, {})[cls] = {"unit_mw": size,
                                            "forced_outage_rate": _v(rate, "fraction", [rid]),
                                            "repair_days": _v(days, "days", [did])}
    return {"exp_quantiles": [round(-math.log(1 - (i + 0.5) / QUANTILES), 6)
                              for i in range(QUANTILES)],
            "cables": cables, "long_failure": long,
            "hvdc_default": {"forced_outage_rate": _v(fo["value"], "fraction", [fo["lineage_id"]]),
                             "repair_days": _v(mttr["value"], "days", [mttr["lineage_id"]])},
            "units": units}


def reserve_2025(con) -> dict:
    """R-LINK-5: the average cross-border capacity allocated to balancing on each AC border since
    the market's first hour, both directions averaged — the default a scenario year subtracts."""
    d = _frame(con, "SELECT border, direction, sum(mw) / count(DISTINCT ts) AS mw, "
                    "list(DISTINCT lineage_id) AS ids FROM balancing_cb WHERE ts >= ? AND "
                    "ts < '2026-01-01' GROUP BY ALL ORDER BY ALL", [RESERVE_FROM])
    out: dict = {}
    for border, g in d.groupby("border", sort=True):
        if len(g) != 2:
            raise ValueError(f"{border}: balancing allocation for {len(g)} directions")
        out[border] = _v(float(g.mw.mean()), "MW", [i for ids in g.ids for i in ids])
    if sorted(out) != ["EE-LV", "LV-LT"]:
        raise ValueError(f"balancing allocation for {sorted(out)}")
    return out


def links(con) -> tuple[dict, Lineage]:
    lin = Lineage()
    rows = _frame(con, "SELECT scenario, border, direction, year, mw, kind, lineage_id FROM "
                       "scenario_link ORDER BY ALL", [])
    table: dict = {}
    for r in rows.itertuples():
        table.setdefault(r.scenario, {}).setdefault(r.kind, {}).setdefault(r.border, {}) \
             .setdefault(r.direction, {})[str(r.year)] = {"mw": scalar(r.mw, 1),
                                                          "src": [r.lineage_id]}
    hourly: dict = {}
    h = _frame(con, "SELECT border, direction, target_year AS ty, hour, mw, lineage_id FROM "
                    "scenario_link_hourly WHERE scenario='eraa2025_ntc' ORDER BY ALL", [])
    for (b, d, ty), g in h.groupby(["border", "direction", "ty"], sort=True):
        if len(g) != 8760:
            raise ValueError(f"ERAA NTC {b} {d} {ty}: {len(g)} hours")
        hourly.setdefault(b, {}).setdefault(d, {})[str(ty)] = series(g.mw, "mw")
        lin.add(f"links.eraa2025_ntc.{b}.{d}.{ty}", g.lineage_id.unique())
    lin.add("links.table", rows.lineage_id.unique())
    missing = [b for b in BORDERS if b not in hourly]
    if missing:
        raise ValueError(f"no ERAA hourly NTC for {missing}")
    return {"contract": 1, "table": table, "eraa2025_hourly": hourly}, lin


def sources(con, ids: set[str]) -> dict:
    """What every lineage id the export names is: source, endpoint or document and page,
    licence, fetch date (R-APP-9); the purpose of each source family from the register, for the
    families the export uses: Nord Pool's curves are collected for calibration, never shown (D-108,
    ERRATA E-140)."""
    recs = {r.dataset: r for r in lin_mod.read_all()}
    missing = sorted(i for i in ids if i not in recs)
    if missing:
        raise ValueError(f"lineage ids without a record: {missing[:5]}")
    out: dict = {"contract": 1, "families": {}, "documents": {}, "records": {}}
    used = {i.split(".", 1)[0] for i in ids}
    for prefix, (name, url, access, purpose, _tables) in sorted(PURPOSE.items()):
        if prefix in used:
            out["families"][prefix] = {"name": name, "url": url, "access": access,
                                       "purpose": purpose}
    for key, d in sorted(documents.DOCS.items()):
        out["documents"][documents.dataset_id(key)] = {"key": key, "title": d["title"],
                                                      "url": d["url"]}
    for i in sorted(ids):
        r = recs[i]
        out["records"][i] = {"source": r.source, "endpoint": r.endpoint, "page": r.page,
                             "fetched": r.fetched_at[:10], "licence": r.licence,
                             "derived_from": r.derived_from}
    return out


STAT_COUNTRIES = ("EE", "LV", "LT", "FI", "SE", "PL")
STAT_TECHS = ("wind_onshore", "wind_offshore", "solar")
STAT_MONTHS = 120                     # the Statistics page's ten years (R-APP-14, D-087)


def statistics(con, params: dict) -> dict:
    """The Statistics page (R-APP-14, D-087): the last ten years of the TTF gas price — the World
    Bank's monthly average in euros per MWh thermal at the ECB rate of the same month (R-SUP-3,
    OPEN-13) — and of the EU ETS price — the month's average EEX auction clearing price, from 2017,
    where EEX's public archive begins — both to the last month that has a TTF price and an
    exchange rate; and the year-end onshore wind, offshore wind and solar capacity of the three
    core countries and the three neighbours' countries, 2015-2025 (IRENASTAT), whose differences
    are the ten years' net additions. The trends and extrapolations are the page's."""
    # a month's average as the exact sum of its rows (math.fsum), never the order the database
    # happens to add them in (ERRATA E-060)
    c = _frame(con, "SELECT commodity, date_trunc('month', ts) AS m, list(price ORDER BY ts) AS "
                    "xs, list(DISTINCT lineage_id ORDER BY lineage_id) AS ids FROM commodity "
                    "WHERE commodity IN ('gas_ttf', 'usd_per_eur', 'eua') GROUP BY ALL "
                    "ORDER BY ALL", [])
    c["m"] = pd.to_datetime(c.m)
    got = {(r.commodity, r.m): (math.fsum(r.xs) / len(r.xs), list(r.ids)) for r in c.itertuples()}
    both = sorted(m for k, m in got if k == "gas_ttf" and ("usd_per_eur", m) in got)
    if not both:
        raise ValueError("statistics: no month with both a TTF price and an exchange rate")
    last = both[-1]
    first = last - pd.DateOffset(months=STAT_MONTHS - 1)
    months = [m for m in both if m >= first]
    if len(months) != STAT_MONTHS:
        raise ValueError(f"statistics: {len(months)} TTF months from {first:%Y-%m}, expected "
                         f"{STAT_MONTHS}")
    unit = params["unit.j_per_btu_it"]
    mwh_per_mmbtu = unit["value"] * 1e6 / J_PER_MWH
    gas_ids = sorted({i for m in months for k in ("gas_ttf", "usd_per_eur")
                      for i in got[(k, m)][1]})
    gas = {"months": [f"{m:%Y-%m}" for m in months],
           "values": [scalar(got[("gas_ttf", m)][0] / got[("usd_per_eur", m)][0] / mwh_per_mmbtu, 2)
                      for m in months],
           "unit": "EUR/MWh", "src": gas_ids + [unit["lineage_id"]]}
    eua_months = sorted(m for k, m in got if k == "eua" and first <= m <= last)
    eua = {"months": [f"{m:%Y-%m}" for m in eua_months],
           "values": [scalar(got[("eua", m)][0], 2) for m in eua_months],
           "unit": "EUR/t", "src": sorted({i for m in eua_months for i in got[("eua", m)][1]})}
    k = _frame(con, "SELECT country, tech, year, mw, lineage_id FROM capacity_stat ORDER BY ALL",
               [])
    years = sorted(int(y) for y in k.year.unique())
    if not years or years[-1] - years[0] < 10:
        raise ValueError(f"statistics: capacity_stat holds {years}, expected eleven years")
    countries: dict = {}
    for country in STAT_COUNTRIES:
        countries[country] = {}
        for tech in STAT_TECHS:
            g = k[(k.country == country) & (k.tech == tech)].set_index("year")
            if sorted(g.index) != years:
                raise ValueError(f"statistics: {country} {tech} has years {sorted(g.index)}")
            countries[country][tech] = {"values": [scalar(g.mw[y], 2) for y in years], "unit": "MW",
                                        "src": sorted(set(g.lineage_id))}
    # Sweden by bidding area, Energimyndigheten's official count (D-093): SE4, the model's
    # neighbour, and the national sum beside IRENA's; wind onshore and offshore together
    a = _frame(con, "SELECT area, year, mw, lineage_id FROM capacity_area WHERE tech='wind' "
                    "ORDER BY ALL", [])
    areas: dict = {}
    if not a.empty:
        se4 = a[a.area == "SE4"].set_index("year").mw
        if not set(years) <= set(se4.index):
            miss = sorted(set(years) - set(se4.index))
            raise ValueError(f"statistics: SE4's wind lacks years {miss}")
        total = a.groupby("year").mw.sum()
        ids = sorted(set(a.lineage_id))
        areas = {"SE4": {"wind": {"values": [scalar(se4[y], 2) for y in years], "unit": "MW",
                                  "src": ids}},
                 "SE": {"wind": {"values": [scalar(total[y], 2) for y in years], "unit": "MW",
                                 "src": ids}}}
    # the six zones' day-ahead prices by month over the same window (D-092), UTC months, each the
    # exact average of its hours; a month counts if it holds nine tenths of its hours in euros —
    # ENTSO-E's Polish prices before 2020 are in złoty, with euros on a few days (ERRATA E-074) —
    # and a zone needs five years of the window
    q = _frame(con, "SELECT zone, date_trunc('month', ts) AS m, list(eur_mwh ORDER BY ts) AS xs, "
                    "count(*) AS n, list(DISTINCT lineage_id ORDER BY lineage_id) AS ids "
                    "FROM price WHERE zone IN ('EE', 'LV', 'LT', 'FI', 'SE4', 'PL') "
                    "AND ts >= ? AND ts < ? "
                    "GROUP BY ALL ORDER BY ALL", [first, last + pd.DateOffset(months=1)])
    q["m"] = pd.to_datetime(q.m)
    prices: dict = {}
    for zone in ("EE", "LV", "LT", "FI", "SE4", "PL"):
        g = q[q.zone == zone].set_index("m")
        full = [m for m in months if m in g.index and g["n"][m] >= 0.9 * m.days_in_month * 24]
        if len(full) < 60:
            raise ValueError(f"statistics: {zone}'s day-ahead price covers {len(full)} of "
                             f"{len(months)} months")
        xs = g["xs"]
        prices[zone] = {"months": [f"{m:%Y-%m}" for m in full],
                        "values": [scalar(math.fsum(xs[m]) / len(xs[m]), 2) for m in full],
                        "unit": "EUR/MWh",
                        "src": sorted({i for m in full for i in g["ids"][m]})}
    # the deck's year to date (D-257): each zone's average over every hour of the latest year from
    # 1 January to the last hour all six reach, the month in progress included (make prices-to-date)
    six = "('EE', 'LV', 'LT', 'FI', 'SE4', 'PL')"
    end = _frame(con, f"SELECT min(t) AS t FROM (SELECT zone, max(ts) AS t FROM price WHERE zone "
                      f"IN {six} GROUP BY zone)", [])["t"].iloc[0]
    y0 = pd.Timestamp(end.year, 1, 1)
    yt = _frame(con, f"SELECT zone, avg(eur_mwh) AS v, count(*) AS n, list(DISTINCT lineage_id "
                     f"ORDER BY lineage_id) AS ids FROM price WHERE zone IN {six} AND ts >= ? "
                     f"AND ts <= ? GROUP BY zone ORDER BY zone", [y0, end])
    want = int((end - y0) / pd.Timedelta(hours=1)) + 1
    if len(yt) != 6 or (yt.n < want - 48).any():   # a gap of two days at most
        raise ValueError(f"statistics: the year to date {y0:%Y-%m-%d}..{end} lacks hours: "
                         f"{dict(zip(yt.zone, yt.n, strict=True))} of {want}")
    ytd = {"first": f"{y0:%Y-%m-%d}", "last": f"{end:%Y-%m-%dT%H:%M}", "hours": want,
           "zones": {r.zone: _v(float(r.v), "EUR/MWh", list(r.ids)) for r in yt.itertuples()}}
    return {"window": {"first": f"{first:%Y-%m}", "last": f"{last:%Y-%m}"}, "gas": gas,
            "eua": eua, "prices": prices, "ytd": ytd,
            "capacity": {"years": years, "countries": countries,
                         "src": sorted(set(k.lineage_id)), "areas": areas}}


def climate_years(con, params: dict) -> dict:
    """The Weather page (R-APP-13, D-084): every PECD climate year's figures for the three core
    zones — onshore and offshore wind and solar capacity factors at the PECD target year the
    ranks are read from, the National Trends demand profile's peak and energy, the hydro
    inflow of the Daugava and of Lithuania's run-of-river plants as TYNDP 2024 gives it — with
    the three years TYNDP 2024 selected, their weights, the documentary rows on the selection
    and the Dunkelflaute ranking, and the ERA5 temperature of the three years."""
    from .years import RANK_TARGET_YEAR, TYNDP2024_HYDRO
    ty = RANK_TARGET_YEAR
    p = _frame(con, "SELECT zone, tech, climate_year AS cy, avg(cf) AS cf, min(lineage_id) AS lid "
                    "FROM pecd_profile WHERE target_year=? AND zone IN ('EE', 'LV', 'LT') "
                    "GROUP BY zone, tech, cy ORDER BY zone, tech, cy", [ty])
    years = sorted(int(y) for y in p.cy.unique())
    d = _frame(con, "SELECT zone, climate_year AS cy, max(mw) AS peak, sum(mw) / 1e6 AS twh, "
                    "min(lineage_id) AS lid FROM demand_profile WHERE scenario='national_trends' "
                    "AND target_year=? AND zone IN ('EE', 'LV', 'LT') GROUP BY zone, cy "
                    "ORDER BY zone, cy", [ty])
    h = _frame(con, "SELECT zone, category, climate_year AS cy, sum(value) / 1e3 AS twh, "
                    "min(lineage_id) AS lid FROM hydro_inflow WHERE variable='INFLOW' AND "
                    "target_year=? GROUP BY zone, category, cy ORDER BY zone, category, cy", [ty])
    def ranked(v: pd.Series) -> list:
        """1 = the lowest, over the years with a figure, from the unrounded values: the rounded
        ones tie (the review of 2026-10-08)."""
        return [None if pd.isna(x) else int((v < x).sum() + 1) for x in v]

    zones: dict = {}
    for z in ("EE", "LV", "LT"):
        zone: dict = {}
        for tech in ("wind_onshore", "wind_offshore", "solar"):
            g = p[(p.zone == z) & (p.tech == tech)].set_index("cy").cf.reindex(years)
            zone[f"{tech}_cf"] = {"values": [scalar(v, 3) for v in g], "ranks": ranked(g),
                                  "unit": "fraction",
                                  "src": sorted(set(p[(p.zone == z) & (p.tech == tech)].lid))}
        dz = d[d.zone == z].set_index("cy")
        # the peak at one annual energy, 2009's: the profiles' energy moves a little with the year
        # and a run scales every year to the scenario's, so the shape is what a year brings
        peak = (dz.peak / dz.twh * dz.twh.get(2009, math.nan)).reindex(years)
        zone["demand_peak_mw"] = {"values": [scalar(v, 0) for v in peak], "ranks": ranked(peak),
                                  "unit": "MW", "src": sorted(set(dz.lid))}
        zone["demand_twh"] = {"values": [scalar(dz.twh.get(y, math.nan), 2) for y in years],
                              "unit": "TWh", "src": sorted(set(dz.lid))}
        for unit, cat in TYNDP2024_HYDRO.get(z, {}).items():
            hz = h[(h.zone == z) & (h.category == cat)].set_index("cy")
            if hz.empty:
                continue
            hv = hz.twh.reindex(years)
            zone[f"hydro_inflow_twh.{unit}"] = {
                "values": [None if pd.isna(v) else scalar(v, 2) for v in hv], "ranks": ranked(hv),
                "unit": "TWh", "src": sorted(set(hz.lid)),
                # each cascade its own note: the Daugava's is scaled, Lithuania's run-of-river is
                # given output (ERRATA E-080)
                "note": ("TYNDP 2024's inflow as published; the engine takes the Daugava's at the "
                         "record's level, times the factor of D-070" if unit == "daugava" else
                         "TYNDP 2024's inflow as published; the engine takes it as given output")}
        zones[z] = zone
    w = _frame(con, "SELECT zone, year(ts) AS cy, avg(temperature_c) AS mean_c, "
                    "min(temperature_c) AS min_c, max(temperature_c) AS max_c, "
                    "min(lineage_id) AS lid FROM weather WHERE zone IN ('EE', 'LV', 'LT') AND "
                    "year(ts) IN (1995, 2008, 2009) GROUP BY zone, cy ORDER BY zone, cy", [])
    temperature = {z: {str(int(r.cy)): {"mean_c": scalar(r.mean_c, 1), "min_c": scalar(r.min_c, 1),
                                        "max_c": scalar(r.max_c, 1), "src": [r.lid]}
                       for r in w[w.zone == z].itertuples()} for z in ("EE", "LV", "LT")}
    key = lambda k: _v(params[k]["value"], params[k]["unit"], [params[k]["lineage_id"]])  # noqa: E731
    return {
        "pecd": {"edition": "2023.2", "target_year": ty, "first_year": years[0],
                 "last_year": years[-1], "src": sorted(set(p.lid))},
        "years": years,
        "selected": {str(cy): key(f"climate_year.weight.{cy}") for cy in (1995, 2008, 2009)},
        "selection": {k: key(f"climate_year.selection.{k}") for k in
                      ("candidate_years", "candidate_years_ig2024", "combinations",
                       "preferred_share_pct")},
        "most_representative": key("climate_year.most_representative"),
        "dunkelflaute_rank_2030": {str(cy): key(f"climate_year.dunkelflaute_rank_2030.{cy}")
                                   for cy in (1995, 2008, 2009, 2012)},
        "zones": zones,
        "temperature": temperature,
    }
