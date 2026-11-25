"""Reproduce every documentary row extracted from the ERAA 2025 archives (R-DATA-7, D-006).

Run:  .venv/bin/python -m validate.documentary      (both machine checks; writes the records)

Reads only data/raw/eraa2025/*.zip (and pipeline.sources.eraa for the NTC profiles). Written
by an AI assistant on 2026-09-24 as an independent re-extraction and reviewed into the
repository. Tolerance: a CSV value shown with n
decimals is reproduced when |archive - csv| <= 0.5 * 10**-n (the archive value rounds to it).
Numbers are compared as stored in the archive; the only unit conversion is the percent text of
'Efficiency range in NCV terms' (F). Every other unit is the same on both sides, stated per group.

Row groups: CSV rows -> archive member, sheet, columns

A  scenarios.csv capacity.<tech>                       lineage eraa2025.dashboard_raw_data
   eraa2025.dashboard_raw_data.zip > ERAA_2025_DashboardRawData1/Dashboard Raw Data/
   GenerationCapacities.csv: rows data_version = 'ERAA 2025 final', 'Target year' = year,
   Market_Node = <zone>00, slug(Technology) = <tech> (lower case, other characters -> '_':
   'Battery utility scale' -> battery_utility_scale). Value [MW] = MW of Operational_Status
   'Available on market'; a key ending in _out_of_market sums the other statuses (LV00 2035
   batteries are 420 'Available on market' + 80 'Out of market', ERRATA E-021).
B  scenarios.csv demand.twh                            lineage eraa2025.dashboard_raw_data
   same zip > .../Aggregated_Demand.csv: 'data version' = 'ERAA 2025 final', Target_Year,
   Market_Node, Measure = 'Annual Demand (TWh)', Measure_Type = 'AVG' (average over climate
   years); Value [TWh] = TWh.
C  scenarios.csv flex.dsr.<p>, flex.dsr_hours.<p>      lineage eraa2025.other_data
   eraa2025.other_data.zip > Other Data/Explicit DSR detailed.csv: MARKET_NODE, TARGET_YEAR,
   'DA activation price (EUR/MWh)' = p; 'MAX CAP (MW)' -> flex.dsr [MW],
   'Max hours dispatched per day [h]' -> flex.dsr_hours [h/day].
D  fuel_paths.csv                                      lineage eraa2025.dashboard_raw_data
   same zip > .../Commodity Prices.xlsx, sheet 'Commodity Prices' (A data_version, B Year,
   C Fuel, D Unit, E Value): data_version = 'ERAA 2025 final', Fuel per FUEL. '2024 €/GJ' =
   EUR/GJ and '2024 €/ton' = EUR/t (2024 money on both sides, no conversion). gas is also
   matched to sheet 'Sources & Assumptions', row 'Gas Blend (updated)' (the note: 'Gas' is the
   blend incl. biomethane, not the 'Natural Gas' row).
E  links.csv                                           lineage eraa2025.ntcs
   eraa2025.ntcs.zip > NTCs/NTCs Consolidated TY<year>.xlsx, sheets HVAC and HVDC, the
   From:/To: columns that eraa.NTC_FROM / NTC_TO map onto the border (listed in page_found):
   pipeline.sources.eraa.ntc_profiles adds them per hour (29 Feb dropped, 8 760 h);
   ntc_max = max, ntc_mean = average [MW].
F  tech_parameters.csv                                 lineage eraa2025.common_data
   eraa2025.common_data.zip > Common data/Common Data.xlsx, sheet 'Common Data' (not the
   older 'Common Data_old'). The notes' 'Standard thermal characteristics' and 'Default thermal
   characteristics' are two tables of that sheet, found by their titles in column A; a table's
   header is its title row and the 3 rows below, its data runs while 'Category #' (B) is set.
   Class row: slug(Fuel, C) + '_' + slug(Type, D), Type '-' dropped ('Gas' + 'CCGT old 1' ->
   gas_ccgt_old_1). Column: the one whose header holds the label in STANDARD / DEFAULT.
   Stored units: shares as fractions (Excel shows %) = fraction, 'kg / Net GJ' = kg/GJ,
   '€/MWh' = EUR/MWh, hours = h, 'Net GJ /MW. start' = GJ/MW, '€ /MW. start' = EUR/MW,
   Days = days. efficiency_min / _max: the text '34% - 39%' -> 0.34 / 0.39 (percent / 100).
   Sources oil_shale_classes and retort_gas borrow ERAA's oil-shale classes as their notes say
   (DERIVED); where a note says only 'oil shale', ERAA's old and new class must both give it.
"""

from __future__ import annotations

import io
import re
import zipfile

import openpyxl
import pandas as pd
from openpyxl.utils import get_column_letter

from pipeline.config import BORDERS
from pipeline.sources import eraa, raw_dir

RAW = raw_dir("eraa2025")

FINAL = "ERAA 2025 final"
NODE = {"EE": "EE00", "LV": "LV00", "LT": "LT00"}
DASH_ZIP = "eraa2025.dashboard_raw_data.zip"
DASH = "ERAA_2025_DashboardRawData1/Dashboard Raw Data/"


def slug(s) -> str:
    return re.sub(r"[^0-9a-z]+", "_", str(s).lower()).strip("_")


def verdict(csv_value: str, doc: float | None) -> str:
    if doc is None:
        return "not_found"
    n = len(csv_value.split(".")[1]) if "." in csv_value else 0
    return "ok" if abs(doc - float(csv_value)) <= 0.5 * 10**-n + 1e-9 else "differs"


def read_csv(zip_name: str, member: str) -> pd.DataFrame:
    """A CSV member; pandas index i is file line i + 2 (line 1 is the header)."""
    with zipfile.ZipFile(RAW / zip_name) as z:
        return pd.read_csv(z.open(member), encoding="utf-8-sig")


def read_xlsx(zip_name: str, member: str):
    with zipfile.ZipFile(RAW / zip_name) as z:
        return openpyxl.load_workbook(io.BytesIO(z.read(member)), data_only=True)


# ---------------------------------------------------------------- A, B: dashboard raw data CSVs

GEN_AT = f"{DASH_ZIP} > {DASH}GenerationCapacities.csv"
GEN = read_csv(DASH_ZIP, DASH + "GenerationCapacities.csv")
DEM_AT = f"{DASH_ZIP} > {DASH}Aggregated_Demand.csv"
DEM = read_csv(DASH_ZIP, DASH + "Aggregated_Demand.csv")


def capacity(zone: str, year: int, tech: str):
    g = GEN[
        (GEN.data_version == FINAL) & (GEN["Target year"] == year) & (GEN.Market_Node == NODE[zone])
    ]
    out = tech.endswith("_out_of_market")
    hit = g[g.Technology.map(slug) == tech.removesuffix("_out_of_market")]
    hit = hit[(hit.Operational_Status != "Available on market") == out]
    if hit.empty:
        return None, GEN_AT, f"no {FINAL} {year} {NODE[zone]} Technology slugs to {tech}"
    lines = "+".join(str(i + 2) for i in hit.index)
    where = f"{GEN_AT} > line {lines} ({FINAL}, {year}, {NODE[zone]}, {hit.Technology.iat[0]!r})"
    parts = ", ".join(f"{s} {v:g}" for s, v in zip(hit.Operational_Status, hit.Value, strict=True))
    return float(hit.Value.sum()), where, ("sum over status: " if len(hit) > 1 else "") + parts


def demand(zone: str, year: int):
    hit = DEM[
        (DEM["data version"] == FINAL)
        & (DEM.Target_Year == year)
        & (DEM.Market_Node == NODE[zone])
        & (DEM.Measure == "Annual Demand (TWh)")
        & (DEM.Measure_Type == "AVG")
    ]
    if len(hit) != 1:
        return None, DEM_AT, f"{len(hit)} rows for {FINAL} {year} {NODE[zone]} annual AVG"
    where = (
        f"{DEM_AT} > line {hit.index[0] + 2} ({FINAL}, {year}, {NODE[zone]}, "
        f"'Annual Demand (TWh)', AVG)"
    )
    return float(hit.Value.iat[0]), where, "average over climate years, TWh"


# ---------------------------------------------------------------- C: other data, explicit DSR

DSR_AT = "eraa2025.other_data.zip > Other Data/Explicit DSR detailed.csv"
DSR = read_csv("eraa2025.other_data.zip", "Other Data/Explicit DSR detailed.csv")
DSR_COL = {"flex.dsr": "MAX CAP (MW)", "flex.dsr_hours": "Max hours dispatched per day [h]"}


def dsr(zone: str, year: int, key: str):
    what, price = key.rsplit(".", 1)
    hit = DSR[
        (DSR.MARKET_NODE == NODE[zone])
        & (DSR.TARGET_YEAR == year)
        & (DSR["DA activation price (EUR/MWh)"] == float(price))
    ]
    if len(hit) != 1:
        return None, DSR_AT, f"{len(hit)} rows for {NODE[zone]} {year} at {price} EUR/MWh"
    col = DSR_COL[what]
    where = (
        f"{DSR_AT} > line {hit.index[0] + 2}, column '{col}' "
        f"({NODE[zone]}, {year}, DA activation price {price} EUR/MWh)"
    )
    return float(hit[col].iat[0]), where, ""


# ---------------------------------------------------------------- D: commodity prices

CP_AT = f"{DASH_ZIP} > {DASH}Commodity Prices.xlsx"
CP = read_xlsx(DASH_ZIP, DASH + "Commodity Prices.xlsx")
# sheet 'Commodity Prices', long table: (data_version, year, fuel) -> (value cell, unit)
PRICE = {
    (r[0].value, r[1].value, r[2].value): (r[4], r[3].value)
    for r in CP["Commodity Prices"].iter_rows(min_row=2)
    if r[0].value
}
SA = CP["Sources & Assumptions"]  # wide table: row per fuel, column per year
SA_COL = {str(c.value): c.column for c in SA[1] if c.value}
SA_ROW = {str(r[0].value).strip(): r[0].row for r in SA.iter_rows(min_row=2) if r[0].value}
LIGNITE_G2 = "Lignite G2 (SK - DE - RS - PL - ME - UKNI - BA - IE)"
FUEL = {  # fuel_paths commodity -> Fuel (column C) of sheet 'Commodity Prices'
    "eua": "CO2 price",
    "gas": "Gas",
    "hard_coal": "Hard coal",
    "oil_heavy": "Heavy oil",
    "oil_light": "Light oil",
    "hydrogen": "Hydrogen",
    "uranium": "Nuclear",
    "oil_shale": "Shale oil",  # ERAA's name for the oil-shale fuel (2.1-2.8 €/GJ, a solid fuel)
    # The note names no lignite group. G2 is the only group holding a model zone (PL); the
    # model's other zones (EE, LV, LT, FI, SE4) are in none.
    "brown_coal": LIGNITE_G2,
}
UNIT = {"EUR/GJ": "2024 €/GJ", "EUR/t": "2024 €/ton"}


def fuel(year: int, commodity: str, csv_unit: str):
    hit = PRICE.get((FINAL, year, FUEL.get(commodity)))
    if hit is None:
        return None, CP_AT, f"no {FINAL} {year} row for Fuel {FUEL.get(commodity)!r}"
    cell, unit = hit
    where = (
        f"{CP_AT} > sheet 'Commodity Prices' > {cell.coordinate} "
        f"({FINAL}, {year}, {FUEL[commodity]!r})"
    )
    if unit != UNIT.get(csv_unit):
        return None, where, f"archive unit {unit!r}, CSV unit {csv_unit!r}"
    ev = f"unit {unit}"
    if commodity == "gas":
        blend = SA.cell(SA_ROW["Gas Blend (updated)"], SA_COL[str(year)])
        ng = SA.cell(SA_ROW["Natural Gas"], SA_COL[str(year)])
        same = "=" if abs(blend.value - cell.value) < 1e-6 else "DIFFERS FROM"
        ev += (
            f"; {same} 'Sources & Assumptions'!{blend.coordinate} Gas Blend (updated) "
            f"{blend.value:.4f}; Natural Gas {ng.coordinate} {ng.value:.4f}"
        )
    if commodity == "brown_coal":
        others = [
            f"{f.split(' (')[0]} {c.value:.3f}"
            for (d, y, f), (c, _) in PRICE.items()
            if d == FINAL and y == year and f.startswith("Lignite") and f != LIGNITE_G2
        ]
        ev += "; note names no lignite group: G2 is the PL group; " + ", ".join(others)
    if commodity == "oil_shale":
        ev += "; ERAA calls the oil-shale fuel 'Shale oil'"
    return float(cell.value), where, ev


# ---------------------------------------------------------------- E: NTC package

NTC_ZIP = RAW / "eraa2025.ntcs.zip"
PROFILE = (
    eraa.ntc_profiles(NTC_ZIP, BORDERS)
    .groupby(["border", "direction", "target_year"])
    .mw.agg(ntc_max="max", ntc_mean="mean", hours="size")
)


def ntc_columns() -> dict:
    """(border, direction, year) -> the From:/To: columns ntc_profiles adds up (header rows only,
    the same mapping as eraa.ntc_profiles), for page_found."""
    out: dict = {}
    with zipfile.ZipFile(NTC_ZIP) as z:
        for name in sorted(z.namelist()):
            m = eraa.NTC_MEMBER.match(name)
            if not m:
                continue
            wb = openpyxl.load_workbook(io.BytesIO(z.read(name)), read_only=True, data_only=True)
            for sheet in eraa.NTC_SHEETS:
                head = {
                    r[0]: r for r in wb[sheet].iter_rows(max_row=30, values_only=True) if r and r[0]
                }
                frm, to = head["From:"], head["To:"]
                for j in range(2, len(frm)):
                    a, b = eraa.NTC_FROM.get(frm[j]), eraa.NTC_TO.get(to[j])
                    key = (
                        (f"{a}-{b}", "fwd")
                        if f"{a}-{b}" in BORDERS
                        else (f"{b}-{a}", "rev")
                        if f"{b}-{a}" in BORDERS
                        else None
                    )
                    if key:
                        out.setdefault((*key, int(m[1])), []).append(
                            f"{sheet} {frm[j]}>{to[j]} (col {get_column_letter(j + 1)})"
                        )
            wb.close()
    return {k: " + ".join(v) for k, v in out.items()}


NTC_COLS = ntc_columns()


def link(border: str, direction: str, year: int, kind: str):
    key = (border, direction, year)
    if key not in PROFILE.index or kind not in ("ntc_max", "ntc_mean"):
        return None, f"eraa2025.ntcs.zip > NTCs/NTCs Consolidated TY{year}.xlsx", "no profile"
    p = PROFILE.loc[key]
    where = (
        f"eraa2025.ntcs.zip > NTCs/NTCs Consolidated TY{year}.xlsx > "
        f"{NTC_COLS[key]} > {kind[4:]} of the hourly sum"
    )
    return float(p[kind]), where, f"{int(p.hours)} h, pipeline.sources.eraa.ntc_profiles"


# ---------------------------------------------------------------- F: common data

CD_AT = "eraa2025.common_data.zip > Common data/Common Data.xlsx > sheet 'Common Data'"
STANDARD = {  # parameter -> header label, table 'Standard thermal characteristics'
    "efficiency": "Standard efficiency in NCV terms",
    "efficiency_min": "Efficiency range in NCV terms",
    "efficiency_max": "Efficiency range in NCV terms",
    "co2_factor": "CO2 emission factor",
    "vom": "Variable O&M cost",
    "min_time_on": "Min Time on",
    "min_time_off": "Min Time off",
    "startup_fuel_warm": "Start-up fuel consumption - warm start",
    "startup_cost_warm": "Start-up fix cost (e.g. wear) warm start",
    "startup_fuel_cold": "Start-up fuel consumption - cold start",
    "startup_cost_cold": "Start-up fix cost (e.g. wear) cold start",
    "startup_fuel_hot": "Start-up fuel consumption - hot start",
    "startup_cost_hot": "Start-up fix cost (e.g. wear) hot start",
}
DEFAULT = {  # parameter -> header label, table 'Default thermal characteristics' (4 header rows)
    "forced_outage_rate": "Forced outage",  # Unavailability / Forced outage / annual rate
    "mean_time_to_repair": "Mean time to repair",  # Days
    "planned_outage_days": "Planned outage",  # Planned outage / annual rate / number of days
    "planned_outage_winter_share": "winter",  # winter / % of annual number of days
    "min_stable_generation": "Minimum stable generation",  # (% of max power)
}


def common_data() -> dict:
    """(class, parameter) -> (cell, table title, 'Fuel / Type', header label)."""
    ws = read_xlsx("eraa2025.common_data.zip", "Common data/Common Data.xlsx")["Common Data"]
    out = {}
    for title, labels in (
        ("Standard thermal characteristics", STANDARD),
        ("Default thermal characteristics", DEFAULT),
    ):
        t = next(r for r in range(1, ws.max_row + 1) if ws.cell(r, 1).value == title)
        head = {
            c: {
                str(ws.cell(r, c).value).strip()
                for r in range(t, t + 4)
                if ws.cell(r, c).value is not None
            }
            for c in range(2, ws.max_column + 1)
        }
        col = {}
        for p, label in labels.items():
            cols = [c for c, h in head.items() if label in h]
            if len(cols) != 1:
                raise ValueError(f"{title}: header {label!r} in columns {cols}, not one")
            col[p] = cols[0]
        r = t + 4
        while ws.cell(r, 2).value is not None:  # 'Category #'
            fuel_, type_ = ws.cell(r, 3).value, ws.cell(r, 4).value
            cls = slug(fuel_) + ("" if type_ == "-" else "_" + slug(type_))
            for p, c in col.items():
                out[(cls, p)] = (ws.cell(r, c), title, f"{fuel_} / {type_}", labels[p])
            r += 1
    return out


CD = common_data()


def common_value(cls: str, p: str):
    hit = CD.get((cls, p))
    if hit is None or hit[0].value is None:
        return None, CD_AT, f"no {cls} row or empty cell for {p}"
    cell, title, row, label = hit
    where = f"{CD_AT} > {cell.coordinate} (table '{title}', {row}, '{label}')"
    if p in ("efficiency_min", "efficiency_max"):
        m = re.fullmatch(r"\s*([\d.]+)%\s*-\s*([\d.]+)%\s*", cell.value)
        if m is None:
            raise ValueError(f"{where}: {cell.value!r} is not a range of percentages")
        lo, hi = (float(x) / 100 for x in m.groups())
        ev = f"{cell.value!r} -> {lo:g}/{hi:g} (% / 100)"
        return (lo if p == "efficiency_min" else hi), where, ev
    return float(cell.value), where, ""


DERIVED = {  # (source, tech_class, parameter) -> the ERAA (class, parameter) its note names
    ("oil_shale_classes", "oil_shale_auvere", "efficiency"): [("oil_shale_new", "efficiency")],
    ("oil_shale_classes", "oil_shale_cfb", "efficiency"): [("oil_shale_new", "efficiency_min")],
    ("oil_shale_classes", "oil_shale_pf", "efficiency"): [("oil_shale_old", "efficiency")],
    ("retort_gas", "retort_gas", "efficiency"): [("oil_shale_new", "efficiency_min")],
}


def tech_parameter(source: str, cls: str, p: str):
    if source == "eraa2025_common":
        cands = [(cls, p)]
    elif (source, cls, p) in DERIVED:
        cands = DERIVED[(source, cls, p)]
    elif source in ("oil_shale_classes", "retort_gas") and p in ("co2_factor", "vom"):
        cands = [("oil_shale_old", p), ("oil_shale_new", p)]  # note: 'oil shale', no class
    else:
        return None, CD_AT, "no rule maps this row onto an ERAA class"
    hits = [common_value(*c) for c in cands]
    where = " ; ".join(h[1] for h in hits)
    vals = {h[0] for h in hits}
    if None in vals or len(vals) != 1:
        return (
            None,
            where,
            "candidate ERAA classes missing or disagreeing: "
            + ", ".join(f"{c[0]}.{c[1]}={h[0]}" for c, h in zip(cands, hits, strict=True)),
        )
    ev = "; ".join(filter(None, (h[2] for h in hits)))
    if source != "eraa2025_common":
        ev = " = ".join(f"ERAA {c[0]}.{c[1]}" for c in cands) + (f"; {ev}" if ev else "")
    return vals.pop(), where, ev


# ---------------------------------------------------------------- dispatch and report

KEY = {
    "scenarios.csv": ["scenario", "zone", "year", "key"],
    "links.csv": ["scenario", "border", "direction", "year", "kind"],
    "fuel_paths.csv": ["scenario", "year", "commodity"],
    "tech_parameters.csv": ["source", "tech_class", "parameter"],
}
VALUE = {
    "scenarios.csv": "value",
    "links.csv": "mw",
    "fuel_paths.csv": "price",
    "tech_parameters.csv": "value",
}


def extract(r):
    f, lin = r.file, r.lineage_id
    if f == "scenarios.csv" and lin == "eraa2025.dashboard_raw_data":
        if r.key.startswith("capacity."):
            return capacity(r.zone, int(r.year), r.key.removeprefix("capacity."))
        if r.key == "demand.twh":
            return demand(r.zone, int(r.year))
    if f == "scenarios.csv" and lin == "eraa2025.other_data" and r.key.startswith("flex.dsr"):
        return dsr(r.zone, int(r.year), r.key)
    if f == "fuel_paths.csv" and lin == "eraa2025.dashboard_raw_data":
        return fuel(int(r.year), r.commodity, r.unit)
    if f == "links.csv" and lin == "eraa2025.ntcs":
        return link(r.border, r.direction, int(r.year), r.kind)
    if f == "tech_parameters.csv" and lin == "eraa2025.common_data":
        return tech_parameter(r.source, r.tech_class, r.parameter)
    return None, "", f"no extraction rule for {f} / {lin}"


def results(rows: pd.DataFrame) -> pd.DataFrame:
    """One verification record per row of `rows` (the documentary rows whose lineage is an
    ERAA 2025 archive, with a `file` column)."""
    # the tolerance rule, checked before it judges the rows
    assert verdict("12.17", 12.172603) == "ok" and verdict("12.17", 12.176) == "differs"
    assert verdict("897", 897.49) == "ok" and verdict("897", 897.51) == "differs"
    assert verdict("0.075", 0.075) == "ok" and verdict("1", None) == "not_found"
    assert slug("EV - iDSR") == "ev_idsr"
    assert slug("Solar PV utility non-tracking") == "solar_pv_utility_non_tracking"
    out = []
    for r in rows.itertuples(index=False):
        doc, where, ev = extract(r)
        csv_value = getattr(r, VALUE[r.file])
        out.append(
            {
                "file": r.file,
                "row_key": "|".join(getattr(r, c) for c in KEY[r.file]),
                "value_csv": csv_value,
                "value_document": "" if doc is None else f"{doc:.10g}",
                "unit": r.unit or ("MW" if r.file == "links.csv" else ""),
                "page_cited": f"{r.lineage_id}: {r.notes}" + (f" p. {r.page}" if r.page else ""),
                "page_found": where,
                "verdict": verdict(csv_value, doc),
                "evidence": ev,
            }
        )
    return pd.DataFrame(out)
