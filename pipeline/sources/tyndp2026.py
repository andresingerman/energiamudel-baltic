"""ENTSO-E / ENTSOG TYNDP 2026 scenarios: the second scenario family (DECISIONS D-010).

Page:    https://2026.entsos-tyndp-scenarios.eu/download/  (CC BY 4.0; attribution
         "TYNDP 2026 Scenarios"). FILES are the page's links as read on 2026-09-24; the
         scenarios report was still labelled a draft (June 2026).
Content: the central scenario National Trends+ (NT+) only, not its High and Low Economy
         variants. Outputs: the hourly dashboards (one folder per weather scenario, one workbook
         per country, sheet 'E-Market' with the marginal cost) and the KPI dashboard. Inputs of
         the Baltic side for the same weather scenarios: PECD 4.2, demand profiles, hydro
         inflows, PEMMDB, grid, fuel and CO2 prices.
Weather: three weather scenarios per target year (2030, 2035, 2040, 2050): modelled years of
         CMIP6 SSP2-4.5 projections, chosen by k-means from 30 candidates, each with a
         probability weight (Methodology Report, June 2026, Annex III). They are not historical
         years; a run of this family takes every weather-dependent input from the same scenario.
Cache:   data/raw/tyndp2026/<dataset>.<ext>, dataset id `tyndp2026.<stem>`.
"""

from __future__ import annotations

import re
from pathlib import Path

from . import cached_get

SOURCE = "ENTSO-E/ENTSOG TYNDP 2026 scenarios"
LICENCE = "CC BY 4.0 (attribution: TYNDP 2026 Scenarios)"
RAW = "tyndp2026"
PAGE = "https://2026.entsos-tyndp-scenarios.eu/download/"
BASE = "https://2026-data.entsos-tyndp-scenarios.eu/"
FILES = [
    "output/model-results/README.docx",
    "output/model-results/hourly-dashboards/NT+_TimeSeriesDashboard.zip",
    "output/model-results/kpi-dashboards/NT+_KPI_Dashboard.xlsx",
    "input/model-input/README.docx",
    "input/model-input/national-trends/PECD.zip",
    "input/model-input/national-trends/Demand.zip",
    "input/model-input/national-trends/Hydro-Inflow.zip",
    "input/model-input/national-trends/PEMMDB_2.X.zip",
    "input/model-input/national-trends/PEMMDB_CommonData.xlsx",
    "input/model-input/national-trends/Line-data.zip",
    "input/model-input/national-trends/Nodes.zip",
    "input/model-input/national-trends/TYNDP2026Scenarios_Fuel_CO2_Prices.xlsx",
    "input/model-input/national-trends/CO2_emission_factors_in_TYNDP2026.xlsx",
    "main-documents/TYNDP_2026_Scenario_Methodology_DataTables.xlsx",
]


def dataset_id(rel: str) -> str:
    """`output/model-results/README.docx` -> `tyndp2026.output-README`; `NT+` -> `NTplus`."""
    folder = rel.split("/", 1)[0]
    name = rel.rsplit("/", 1)[-1].rsplit(".", 1)[0].replace("+", "plus")
    stem = re.sub(r"[^A-Za-z0-9_-]+", "-", name).strip("-")
    return f"tyndp2026.{folder}-{stem}" if stem == "README" else f"tyndp2026.{stem}"


def fetch(rel: str) -> Path:
    name = rel.rsplit("/", 1)[-1]
    return cached_get(raw=RAW, dataset=dataset_id(rel), ext=name.rsplit(".", 1)[-1].lower(),
                      url=BASE + rel, params=None, source=SOURCE, licence=LICENCE,
                      timeout=1800, notes=f"page: {PAGE}")


DATA_TABLES = "main-documents/TYNDP_2026_Scenario_Methodology_DataTables.xlsx"
HOURLY = "output/model-results/hourly-dashboards/NT+_TimeSeriesDashboard.zip"


def _clean(v) -> str:
    return str(v).replace("\xa0", " ").strip()


def parse_weather(path: Path) -> list[dict]:
    """The weather scenarios of every target year with their climate model, modelled year and
    probability weight: sheets 'T32' (Table 33 of the report, climate year codes) and 'T35'
    (Table 36, representative weather scenarios) of the methodology data tables."""
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    codes: dict[str, dict] = {}
    for row in wb["T32"].iter_rows(min_row=3, values_only=True):
        cells = [_clean(c) for c in row if c is not None]
        if len(cells) == 5 and cells[0].startswith("WS"):
            code, _ssp, model, year, target = cells
            codes[code] = {"code": code, "climate_model": model, "climate_year": int(year),
                           "target_year": int(target)}
    out: list[dict] = []
    for row in wb["T35"].iter_rows(min_row=3, values_only=True):
        cells = [_clean(c) for c in row if c is not None]
        if len(cells) == 5 and cells[2].startswith("WS"):
            target, _cluster, code, weight, _size = cells
            ws = codes[code]
            if ws["target_year"] != int(target):
                raise ValueError(f"{code}: target year {target} in T35, {ws['target_year']} in T32")
            out.append({**ws, "weight": float(weight)})
    by_year: dict[int, list[float]] = {}
    for w in out:
        by_year.setdefault(w["target_year"], []).append(w["weight"])
    bad = {y: ws for y, ws in by_year.items() if len(ws) != 3 or abs(sum(ws) - 1) > 0.005}
    if bad or len(out) != len(codes):
        raise ValueError(f"weather scenarios incomplete or weights not summing to 1: {bad}")
    return out


# TYNDP market node -> this project's zone (the e-market node of a country is 'XX00')
NODES = {"EE00": "EE", "LV00": "LV", "LT00": "LT", "FI00": "FI", "SE04": "SE4", "PL00": "PL"}
CORE_NODES = {k: v for k, v in NODES.items() if v in ("EE", "LV", "LT")}
HYDRO_CATEGORY = {"HRR": "ror", "HPI": "pondage", "HRI": "reservoir", "HOL": "ps_open",
                  "HCL": "ps_closed"}


def parse_hydro(path: Path, selected: dict[int, set[str]]):
    """Daily hydro inflow of the core zones (`Hydro Inflows/<year>/<node>_Hydro_Inflows_<cat>_
    <year>.csv`: column DAY, then one column per candidate weather scenario of that target
    year), for the selected scenarios only. The unit is not stated in the package; the values
    read as MWh per day (Latvian pondage about 3 TWh a year, the Daugava's order of magnitude).
    Returns (zone, target_year, category, weather, day, mwh)."""
    import io
    import zipfile

    import pandas as pd
    pat = re.compile(r"Hydro Inflows/(\d{4})/([A-Z]{2}00)_Hydro_Inflows_([A-Z]{3})_\d{4}\.csv$")
    frames = []
    with zipfile.ZipFile(path) as z:
        for m in z.namelist():
            hit = pat.search(m)
            if not hit or m.startswith("__MACOSX") or hit[2] not in CORE_NODES:
                continue
            year, node, cat = int(hit[1]), hit[2], hit[3]
            df = pd.read_csv(io.BytesIO(z.read(m)))
            keep = [c for c in df.columns if c in selected.get(year, set())]
            if len(keep) != 3:
                raise ValueError(f"{m}: selected weather scenarios {selected.get(year)} not all "
                                 f"present")
            long = df.melt(id_vars="DAY", value_vars=keep, var_name="weather", value_name="mwh")
            frames.append(long.assign(zone=CORE_NODES[node], target_year=year,
                                      category=HYDRO_CATEGORY[cat]).rename(columns={"DAY": "day"}))
    return pd.concat(frames, ignore_index=True)[["zone", "target_year", "category", "weather",
                                                 "day", "mwh"]]


def path(rel: str) -> Path:
    """The cached file of a FILES entry."""
    from . import raw_dir
    name = rel.rsplit("/", 1)[-1]
    return raw_dir(RAW) / f"{dataset_id(rel)}.{name.rsplit('.', 1)[-1].lower()}"


def selected(weather: list[dict]) -> dict[int, set[str]]:
    """target year -> the codes of its three weather scenarios."""
    out: dict[int, set[str]] = {}
    for w in weather:
        out.setdefault(w["target_year"], set()).add(w["code"])
    return out


PRICE_FILE = re.compile(r"NT\+_TimeSeriesDashboard/(\d{4})/Weather scenario (\d{3})/"
                        r"([A-Z]{2})_TimeSeriesDashboard_TY\d{4}_WS\d{3}_SoS\.xlsx$")


def _country(member: str) -> str:
    """The country of a price file of the archive, from its name (PRICE_FILE)."""
    m = PRICE_FILE.search(member)
    if m is None:
        raise ValueError(f"{member}: not a weather scenario's price file")
    return m[3]
COUNTRY_NODES = {"EE": ["EE00"], "LV": ["LV00"], "LT": ["LT00"], "FI": ["FI00"], "SE": ["SE04"],
                 "PL": ["PL00"]}


def price_members(path: Path) -> list[tuple[str, int, str]]:
    """(zip member, target year, weather code) of the six countries' hourly dashboards."""
    import zipfile
    with zipfile.ZipFile(path) as z:
        out = []
        for m in z.namelist():
            hit = PRICE_FILE.search(m)
            if hit and not m.startswith("__MACOSX") and hit[3] in COUNTRY_NODES:
                out.append((m, int(hit[1]), f"WS{hit[2]}"))
    return sorted(out)


def parse_price_member(path: Path, member: str) -> list[tuple[str, int, float]]:
    """Hourly marginal cost of the project's nodes in one country workbook of the NT+ hourly
    dashboard: sheet 'E-Market', row 6 'Market Zone', row 7 'Category' ('Marginal Cost
    [€/MWh_e]'), hours from row 11 (column A 'Hour of Year'). Returns (zone, hour, eur_mwh)."""
    import io
    import zipfile

    import openpyxl
    country = _country(member)
    with zipfile.ZipFile(path) as z:
        ws = openpyxl.load_workbook(io.BytesIO(z.read(member)), read_only=True,
                                    data_only=True)["E-Market"]
    rows = ws.iter_rows(min_row=6, values_only=True)
    zone_row, cat_row = next(rows), next(rows)
    cols = [(j, NODES[zone_row[j]]) for j, c in enumerate(cat_row)
            if isinstance(c, str) and c.startswith("Marginal Cost")
            and zone_row[j] in COUNTRY_NODES[country]]
    if len(cols) != len(COUNTRY_NODES[country]):
        raise ValueError(f"{member}: marginal-cost columns {cols} for {COUNTRY_NODES[country]}")
    for _ in range(3):                                   # rows 8-10: element, gen/load, header
        next(rows)
    out = []
    for r in rows:
        if r[0] is None:
            break
        out += [(zone, int(r[0]), float(r[j])) for j, zone in cols]
    return out


BALANCE_DEMAND = ("Native Demand", "Fixed Demand", "EV charge (load)")
BALANCE_ELECTROLYSIS = "Electrolyzers"


def parse_balance_member(path: Path, member: str) -> list[tuple[str, float, float]]:
    """Annual demand behind a country's NT+ prices (R-BND-8) from one hourly-dashboard workbook:
    on the 'E-Market' and 'Prosumer' sheets, the node's hourly 'Native Demand', 'Fixed Demand'
    and 'EV charge (load)' columns summed as demand, and its 'Electrolyzers …' load columns
    summed as electrolysis. Returns [(zone, demand_twh, electrolysis_twh)]."""
    import io
    import zipfile

    import openpyxl
    country = _country(member)
    with zipfile.ZipFile(path) as z:
        wb = openpyxl.load_workbook(io.BytesIO(z.read(member)), read_only=True, data_only=True)
    out = []
    for node in COUNTRY_NODES[country]:
        demand = electro = 0.0
        found = False
        for sheet in ("E-Market", "Prosumer"):
            if sheet not in wb.sheetnames:
                continue
            rows = wb[sheet].iter_rows(min_row=6, values_only=True)
            zone_row, cat_row, elem_row = next(rows), next(rows), next(rows)
            dem = [j for j, c in enumerate(cat_row) if isinstance(c, str)
                   and c.startswith(BALANCE_DEMAND)
                   and (zone_row[j] == node or str(elem_row[j] or "").startswith(node))]
            ele = [j for j, c in enumerate(cat_row) if isinstance(c, str)
                   and c.startswith(BALANCE_ELECTROLYSIS)
                   and str(elem_row[j] or "").startswith(node)]
            next(rows)
            next(rows)                                   # rows 9-10: gen/load, header
            hours = 0
            for r in rows:
                if r[0] is None:
                    break
                hours += 1
                demand += sum(float(r[j] or 0) for j in dem)
                electro += sum(float(r[j] or 0) for j in ele)
            if dem:
                found = True
                if hours not in (8760, 8784):
                    raise ValueError(f"{member} {sheet}: {hours} hours")
        if not found:
            raise ValueError(f"{member}: no demand columns for {node}")
        out.append((NODES[node], demand / 1e6, electro / 1e6))
    return out


UNIT = " [MW_e]"
PROSUMER = "RETE"                                    # a node's prosumer node: 'FI00RETE'
NET_EXPORT = "Net annual country balance [GWh] (Export is positive)"   # TYNDP 2024's labels,
DUMP = "Dump energy [GWh]"                                             # which the page groups by
# the dashboards' categories under the labels of TYNDP 2024's 'Yearly Outputs' (tyndp.py), so one
# page reads both families; a category not named here keeps its own label
OUTPUT_LABEL = {"EV discharge (gen.)": "EV: Battery Storage discharge (gen.)",
                "Electrolyzers to H2 Zone 2": "Electrolyser (load)",
                "Electrolyzers P2G": "Electrolyser (load)",
                "Li-Ion Battery Capacity": "Battery Storage discharge (gen.)",
                "Elec Adequacy Units": "Adequacy Units"}
# in the demand of `parse_balance_member` already; a balance, not an output; not energy
OUTPUT_SKIP = ("Native Demand", "Fixed Demand", "EV charge (load)", "Energy Not Served",
               "Marginal Cost")


def parse_output_member(path: Path, member: str) -> list[tuple[str, str, str, float]]:
    """What a country's NT+ prices come from (R-BND-8, D-043), from one hourly-dashboard
    workbook, for the country's project node and its prosumer node together:

    - annual generation and loads (TWh): every 'Generation' and 'Load' column of the 'E-Market'
      and 'Prosumer' sheets summed over the year, by category; demand is left to
      `parse_balance_member` (the cars' charging is demand there), so generation = demand +
      electrolysers + battery charge and pumps + net export;
    - the net export: the sheets' 'Balance' columns (generation less load, the exchange between
      the two nodes cancelling); the dumped energy: 'RES curtailment' of each sheet's own node;
    - installed capacity (MW): the rows of the 'Installed Capacity' sheet in GW_e.

    Returns (zone, output, measure 'twh' | 'mw', value), zero rows left out; the labels are
    TYNDP 2024's where the category is the same thing."""
    import io
    import zipfile

    import openpyxl
    country = _country(member)
    with zipfile.ZipFile(path) as z:
        wb = openpyxl.load_workbook(io.BytesIO(z.read(member)), read_only=True, data_only=True)
    out: list[tuple[str, str, str, float]] = []
    for node in COUNTRY_NODES[country]:
        twh: dict[str, float] = {}
        own = {"E-Market": node, "Prosumer": node + PROSUMER}
        for sheet, mine in own.items():
            if sheet not in wb.sheetnames:
                continue
            rows = wb[sheet].iter_rows(min_row=6, values_only=True)
            zone_row, cat_row, elem_row, kind_row = next(rows), next(rows), next(rows), next(rows)
            cols: list[tuple[int, str]] = []
            for j, c in enumerate(cat_row):
                if zone_row[j] != mine or not isinstance(c, str) or not c.endswith(UNIT):
                    continue
                cat = c[:-len(UNIT)]
                if cat.startswith(OUTPUT_SKIP):
                    continue
                if cat == "Balance":
                    cols.append((j, NET_EXPORT))
                elif cat == "RES curtailment":
                    if str(elem_row[j] or "").startswith(mine + " "):   # the sheet's own node
                        cols.append((j, DUMP))
                elif kind_row[j] in ("Generation", "Load"):
                    cols.append((j, OUTPUT_LABEL.get(cat, cat)))
                else:
                    raise ValueError(f"{member} {sheet}: column {c!r} is neither generation "
                                     f"nor load ({kind_row[j]!r})")
            next(rows)                                   # row 10: header
            hours = 0
            for r in rows:
                if r[0] is None:
                    break
                hours += 1
                for j, label in cols:
                    twh[label] = twh.get(label, 0.0) + float(r[j] or 0) / 1e6
            if cols and hours not in (8760, 8784):
                raise ValueError(f"{member} {sheet}: {hours} hours")
        if NET_EXPORT not in twh:
            raise ValueError(f"{member}: no balance column for {node}")
        mw: dict[str, float] = {}
        cap = wb["Installed Capacity"].iter_rows(values_only=True)
        next(cap)
        zones = next(cap)
        js = [j for j, v in enumerate(zones) if v in own.values()]
        for r in cap:
            if not isinstance(r[0], str) or not r[0].endswith(" [GW_e]"):
                continue                                 # battery volume, hydrogen
            label = r[0][:-len(" [GW_e]")]
            label = OUTPUT_LABEL.get(label, label)
            mw[label] = mw.get(label, 0.0) + sum(float(r[j] or 0) for j in js) * 1000
        zone = NODES[node]
        out += [(zone, k, "twh", v) for k, v in sorted(twh.items()) if v]
        out += [(zone, k, "mw", v) for k, v in sorted(mw.items()) if v]
    return out


PECD = "input/model-input/national-trends/PECD.zip"
PECD_FILE = re.compile(r"PECD/(\d{4})/(?:([A-Z]{2}00)_CapacityFactors_(Wind_Onshore|Wind_Offshore)"
                       r"_\d{4}|Solar PV (Utility|Rooftop) ([A-Z]{2}00))\.csv$")
PECD_SERIES = {"Wind_Onshore": ("wind_onshore", "onshore"),
               "Wind_Offshore": ("wind_offshore", "offshore"),
               "Utility": ("solar", "utility"), "Rooftop": ("solar", "rooftop")}


def parse_pecd(path: Path, selected: dict[int, set[str]]):
    """Hourly capacity factors of the core zones from PECD 4.2 as packaged for TYNDP 2026:
    `PECD/<year>/<node>_CapacityFactors_Wind_<On|Off>shore_<year>.csv` and `PECD/<year>/Solar PV
    <Utility|Rooftop> <node>.csv`; ten lines of header, then 'Date,Hour,WS…' and 8 760 hours.
    The package has no solar series for EE00 and only the rooftop series for LV00 (as read on
    2026-09-24). Returns (zone, tech, series, weather, hour, cf) for the selected scenarios."""
    import io
    import zipfile

    import pandas as pd
    frames = []
    with zipfile.ZipFile(path) as z:
        for m in z.namelist():
            hit = PECD_FILE.search(m)
            if not hit or m.startswith("__MACOSX"):
                continue
            year, node = int(hit[1]), hit[2] or hit[5]
            if node not in CORE_NODES:
                continue
            tech, series = PECD_SERIES[hit[3] or hit[4]]
            df = pd.read_csv(io.BytesIO(z.read(m)), skiprows=10)
            keep = [c for c in df.columns if c in selected.get(year, set())]
            if len(keep) != 3 or len(df) not in (8760, 8784):
                raise ValueError(f"{m}: {len(df)} hours, selected columns {keep}")
            df["hour"] = range(1, len(df) + 1)
            long = df.melt(id_vars="hour", value_vars=keep, var_name="weather", value_name="cf")
            frames.append(long.assign(zone=CORE_NODES[node], tech=tech, series=series))
    return pd.concat(frames, ignore_index=True)[["zone", "tech", "series", "weather", "hour",
                                                 "cf"]]


DEMAND = "input/model-input/national-trends/Demand.zip"
DEMAND_COMPONENT = {"ELECTRICITY_MARKET": "market", "ELECTRICITY_PROSUMER": "prosumer",
                    "EV_FIXED_LOAD_PROFILES_ELECTRICITY_MARKET": "ev_market",
                    "EV_FIXED_LOAD_PROFILES_ELECTRICITY_PROSUMER": "ev_prosumer"}
DEMAND_FILE = re.compile(r"Demand/(\d{4})/(" + "|".join(DEMAND_COMPONENT) + r") \d{4}\.xlsx$")


def parse_demand(path: Path, selected: dict[int, set[str]]):
    """Hourly electricity demand of the core zones: the e-market and prosumer demand and the
    fixed EV charging of both nodes (`Demand/<year>/<COMPONENT> <year>.xlsx`, one sheet per
    node, header 'Date, Hour, WS…' in row 11, 8 760 hours; only the selected scenarios'
    columns hold values). Returns (zone, component, weather, hour, mw)."""
    import io
    import zipfile

    import openpyxl
    import pandas as pd
    out = []
    with zipfile.ZipFile(path) as z:
        for m in sorted(z.namelist()):
            hit = DEMAND_FILE.search(m)
            if not hit or m.startswith("__MACOSX"):
                continue
            year, comp = int(hit[1]), DEMAND_COMPONENT[hit[2]]
            wb = openpyxl.load_workbook(io.BytesIO(z.read(m)), read_only=True, data_only=True)
            for node, zone in CORE_NODES.items():
                rows = wb[node].iter_rows(min_row=11, values_only=True)
                cols = [(j, h) for j, h in enumerate(next(rows)) if h in selected.get(year, ())]
                if len(cols) != 3:
                    raise ValueError(f"{m} {node}: selected columns {cols}")
                hour = 0
                for r in rows:
                    if r[1] is None:
                        break
                    hour += 1
                    out += [(zone, comp, ws, hour, float(r[j])) for j, ws in cols]
                if hour not in (8760, 8784):
                    raise ValueError(f"{m} {node}: {hour} hours")
    return pd.DataFrame(out, columns=["zone", "component", "weather", "hour", "mw"])
