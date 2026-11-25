#!/usr/bin/env python3
"""Reproduce every documentary row extracted from TYNDP 2024 files and the DEA and Statistics
Finland catalogues (R-DATA-7, D-006).

Run:  .venv/bin/python -m validate.documentary      (both machine checks; writes the records)

Reads (never writes) the raw cache. Written by an AI assistant on 2026-09-24 as an independent
re-extraction and reviewed into the repository.
Archives are read in memory (zipfile + openpyxl, cached cell values); nothing is extracted or downloaded.

Comparison rule: the document value, converted to the CSV unit, is rounded half-up to the number
of decimals the CSV string shows ('861.0' -> 1, '0.68' -> 2, '198' -> 0) and must then equal it.
verdict: ok | differs (value read, not equal) | not_found (cell/row the note points to is absent or
not numeric).

Row groups (lineage_id -> file, sheet, columns). Where a note does not name the row, the row is
picked from the CSV key/parameter by the explicit tables below, and that is said in `evidence`.

1. tyndp2024.PEMMDB2 -> scenarios.csv. Member PEMMDB2/<Y>/PEMMDB_<node>_NationalTrends_<Y>.xlsx,
   Y from scenario 'pemmdb_nt_<Y>', node EE->EE00, LV->LV00, LT->LT00.
   - capacity.<fuel>_<type>: sheet 'Thermal', col A fuel (only on a group's first row, filled down),
     col B type, col C 'Net generating capacity (MW)'; key = lower-cased 'fuel type', spaces -> '_'.
   - capacity.wind_onshore / wind_offshore / solar: sheets 'Wind' / 'Solar', col A label
     'Installed capacities Onshore wind (GW):' / '... Offshore wind (GW):' / '... Photovoltaic (GW):',
     value col B in GW; x 1000 = MW. (Solar: PV row only; Thermal Solar and Rooftop not added.)
   - capacity.hydro_ror / hydro_ps: sheet 'Hydro', col B of 'Run of River - Total turbining capacity
     (MW)' / 'Pure Pump Storage (closed loop, no natural inflows) - Total turbining capacity (MW)'.
   - flex.dsr.<P>: sheet 'DSR', price-band columns C..L; the band whose row 'Price' (col B label)
     equals P EUR/MWh, value from row 'Capacity' (MW).
   - capacity.electrolyser / efficiency.electrolyser: sheet 'Electrolyser', row 'Electrolyser',
     columns headed 'Net maximum capacity (MW)' / 'Average efficiency' (header row 8).
2. tyndp2024.Line-data -> links.csv. Member 'Line data/ReferenceGrid_Electricity.xlsx', sheet named
   by the note ('2030'): col A 'Border' (e.g. 'EE00-FI00'), B 'Summary Direction 1', C 'Summary
   Direction 2'. Direction 1 = first node -> second node as written (the file's own PL00I import /
   PL00E export nodes carry capacity only in that sense: 'DE00-PL00I' 2000/0, 'PL00E-DE00' 3000/0).
   CSV border 'X-Y' fwd = X->Y. Nodes EE00 LV00 LT00 FI00 SE04 PL00. MW, no conversion.
3. tyndp2024.Prices -> fuel_paths.csv. Member 'Prices/2023 06 22 TYNDP 2024 Commodity prices
   Final.xlsx', sheet 'Matrix 2024': col B 'Fuel' label (PRICE_ROW), col C 'Unit', year columns by
   header row 3 (D 2030, E 2040, F 2050). '€/GJ' = EUR/GJ, '€/ton' = EUR/t, no conversion. Price base
   from the cell reading '(Currency 2021 €)' (C23); D1 'Same for all scenarios'.
4. tyndp2024.CO2-emission-factors-in-TYNDP2024-v2-xlsx -> tech_parameters.csv. Member 'CO2 emission
   factors in TYNDP2024 v2.xlsx', sheet 'CO2 emission factor': row by col B 'Category #' (= number
   before '_' in tech_class; col C fuel must match the rest), column by header row 3 label
   ('co2_factor_nt2030' -> 'NT2030' = F, 'nt2040' -> 'NT2040' = G; E is 'Original'). Unit E4
   'kg / Net GJ' = kg/GJ, no conversion.
5. catalogue.dea_el_dh_2025 -> tech_parameters.csv. Sheet 'alldata_long' (header Excel row 2):
   ws = sheet named in the note, est = 'ctrl' ("central estimate"; the 2050 notes name no
   estimate, ctrl used), year = note year, par starts with DEA_PAR[parameter]. Cross-checked against
   the named data sheet itself (rows 'year'/'est' pick the column, col B the parameter). The note's
   price base is compared with alldata_long 'priceyear' (financial parameters only).
   'investment' is the 'Nominal investment (*total) [MEUR/MW_e]' row (D-157).
6. catalogue.statfi_fuels_2025 -> tech_parameters.csv. Sheet 'Fuel classification 2025': row by
   col A 'Code' (from the note), col G 'Fossil CO2' / I 'Biogenic CO2' / K 'Combined CO2' (by
   parameter), unit row 4 '[t/TJ]' per total net energy content (G2); 1 t/TJ = 1 kg/GJ.
7. catalogue.dea_storage_2025 -> tech_parameters.csv (D-157). Sheet 'alldata_flat' (header Excel row 1):
   ws = sheet named in the note, est = 'ctrl', year = note year, par starts with DEA_STORAGE_PAR[parameter];
   the note's price base is compared with 'priceyear'.
"""

from __future__ import annotations

import io
import math
import re
import zipfile
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

import openpyxl
import pandas as pd
from openpyxl.utils import get_column_letter

from pipeline.sources import raw_dir

TYNDP = raw_dir("tyndp2024")
CATALOGUE = raw_dir("catalogue")

KEY_COLS = {
    "scenarios.csv": ["scenario", "zone", "year", "key"],
    "links.csv": ["scenario", "border", "direction", "year", "kind"],
    "fuel_paths.csv": ["scenario", "year", "commodity"],
    "tech_parameters.csv": ["source", "tech_class", "parameter"],
    "parameters.csv": ["key"],
}
VALUE_COL = {
    "scenarios.csv": "value",
    "links.csv": "mw",
    "fuel_paths.csv": "price",
    "tech_parameters.csv": "value",
    "parameters.csv": "value",
}


# ---------------------------------------------------------------- helpers


def open_xlsx(path: Path, member: str | None = None):
    """Workbook (cached values) from a file, or from a zip member read into memory."""
    if member is None:
        return openpyxl.load_workbook(path, data_only=True, read_only=True)
    with zipfile.ZipFile(path) as z:
        return openpyxl.load_workbook(io.BytesIO(z.read(member)), data_only=True, read_only=True)


def grid(wb, sheet: str, max_row: int | None = None) -> list[list]:
    """Sheet as rows of values; g[r-1][c-1] is Excel cell (row r, column c)."""
    return [list(r) for r in wb[sheet].iter_rows(values_only=True, max_row=max_row)]


def ref(r: int, c0: int) -> str:
    """Excel reference of 1-based row r and 0-based column c0."""
    return f"{get_column_letter(c0 + 1)}{r}"


def row_of(g, col0: int, label) -> int | None:
    """1-based number of the first row whose 0-based column col0 equals label."""
    return next(
        (r for r, row in enumerate(g, start=1) if len(row) > col0 and row[col0] == label), None
    )


def col_of(header, prefix: str) -> int | None:
    """0-based index of the first header cell starting with prefix."""
    return next(
        (c for c, v in enumerate(header) if isinstance(v, str) and v.startswith(prefix)), None
    )


def row_at(g, col0: int, label) -> int:
    """`row_of` where the workbook must hold the row: a row missing is an error with its label."""
    r = row_of(g, col0, label)
    if r is None:
        raise ValueError(f"no row {label!r} in column {col0}")
    return r


def col_at(header, prefix: str) -> int:
    """`col_of` where the workbook must hold the column."""
    c = col_of(header, prefix)
    if c is None:
        raise ValueError(f"no column {prefix!r}")
    return c


def group(pattern: str, text: str, n: int = 1) -> str:
    """Group n of `pattern`'s first match in `text`, which must match."""
    m = re.search(pattern, text)
    if m is None:
        raise ValueError(f"{pattern!r} not in {text!r}")
    return m.group(n)


def num(v) -> float | None:
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def matches(value_csv: str, value_doc: float) -> bool:
    """Document value rounded half-up to the decimals the CSV string shows equals the CSV value."""
    shown = Decimal(value_csv)
    exponent = shown.as_tuple().exponent
    if not isinstance(exponent, int):
        raise ValueError(f"{value_csv!r}: not a finite number")
    step = Decimal(1).scaleb(exponent)  # '861.0' -> 0.1, '198' -> 1
    return Decimal(repr(float(value_doc))).quantize(step, ROUND_HALF_UP) == shown


def result(row: dict, doc: float | None, found: str, evidence: str) -> dict:
    f = row["file"]
    value_csv = row[VALUE_COL[f]]
    verdict = "not_found" if doc is None else ("ok" if matches(value_csv, doc) else "differs")
    return {
        "file": f,
        "row_key": "|".join(row[c] for c in KEY_COLS[f]),
        "value_csv": value_csv,
        "value_document": "" if doc is None else format(doc, ".10g"),
        "unit": row["unit"]
        or ("MW" if f == "links.csv" else ""),  # links.csv: unit is the column name
        "page_cited": row["notes"],
        "page_found": found,
        "verdict": verdict,
        "evidence": evidence,
    }


# ---------------------------------------------------------------- 1. PEMMDB 2.5 National Trends

PEMMDB_ZIP = TYNDP / "tyndp2024.PEMMDB2.zip"
PEMMDB_NODE = {"EE": "EE00", "LV": "LV00", "LT": "LT00"}
PEMMDB_LABELLED = {  # key: (sheet, label in column A, factor from the stated unit to MW); value in column B
    "capacity.wind_onshore": ("Wind", "Installed capacities Onshore wind (GW):", 1000),
    "capacity.wind_offshore": ("Wind", "Installed capacities Offshore wind (GW):", 1000),
    "capacity.solar": ("Solar", "Installed capacities Photovoltaic (GW):", 1000),
    "capacity.hydro_ror": ("Hydro", "Run of River - Total turbining capacity (MW)", 1),
    "capacity.pondage": ("Hydro", "Pondage - Total turbining capacity (MW)", 1),
    "capacity.hydro_ps": (
        "Hydro",
        "Pure Pump Storage (closed loop, no natural inflows) - Total turbining capacity (MW)",
        1,
    ),
}


def pemmdb_values(wb) -> dict[str, tuple]:
    """Every value a scenarios row can cite from one workbook: {key: (value in MW or fraction, cell, note)}."""
    vals = {}
    g = grid(wb, "Thermal")
    cap = col_at(g[7], "Net generating capacity")  # header row 8, column C
    fuel = None
    for r, row in enumerate(g[11:], start=12):  # unit types start at row 12
        fuel = row[0] or fuel
        if row[0] is None and row[1] is None:
            continue  # 2nd line of a type (must-run %)
        key = "capacity." + "_".join(f"{fuel} {row[1] or ''}".lower().split())
        assert key not in vals, f"Thermal type {key} listed twice"
        vals[key] = (num(row[cap]), f"Thermal!{ref(r, cap)} ({fuel} / {row[1]})", "MW as stated")
    for key, (sheet, label, factor) in PEMMDB_LABELLED.items():
        s = grid(wb, sheet)
        at = row_of(s, 0, label)
        v = num(s[at - 1][1]) if at else None
        conv = f"{s[at - 1][1]} GW x 1000 = MW" if factor == 1000 and at else "MW as stated"
        vals[key] = (None if v is None else v * factor, f"{sheet}!B{at} ({label})", conv)
    s = grid(wb, "DSR", max_row=14)
    rc, rp = row_at(s, 1, "Capacity"), row_at(s, 1, "Price")
    for c in range(2, 12):  # columns C..L = price bands
        price = num(s[rp - 1][c])
        if price is None:
            continue
        key = f"flex.dsr.{price:g}"
        assert key not in vals, f"two DSR bands at {price:g} EUR/MWh"  # would need summing
        vals[key] = (
            num(s[rc - 1][c]),
            f"DSR!{ref(rc, c)} (Capacity, {s[7][c]}; Price {ref(rp, c)} = {price:g})",
            "MW as stated",
        )
    s = grid(wb, "Electrolyser")
    r = row_at(s, 0, "Electrolyser")
    for key, head in (
        ("capacity.electrolyser", "Net maximum capacity"),
        ("efficiency.electrolyser", "Average efficiency"),
    ):
        c = col_at(s[7], head)
        vals[key] = (num(s[r - 1][c]), f"Electrolyser!{ref(r, c)} ({head})", "as stated")
    return vals


def check_pemmdb(rows):
    out, books = [], {}
    for row in rows:
        year, node = row["year"], PEMMDB_NODE[row["zone"]]
        # ERRATA E-007: a row whose note says its value is the FI00 workbook's is read there
        if row["key"] == "efficiency.electrolyser" and "FI00 workbook" in row["notes"]:
            node = "FI00"
        member = f"PEMMDB2/{year}/PEMMDB_{node}_NationalTrends_{year}.xlsx"
        if member not in books:
            wb = open_xlsx(PEMMDB_ZIP, member)
            head = grid(wb, "Thermal", max_row=7)  # B4 node, B5 year, B7 scenario
            assert (head[3][1], str(head[4][1]), head[6][1]) == (node, year, "NationalTrends"), (
                member
            )
            books[member] = pemmdb_values(wb)
        assert row["scenario"] == f"pemmdb_nt_{year}", row["scenario"]
        hit = books[member].get(row["key"])
        if hit is None:
            out.append(result(row, None, f"{PEMMDB_ZIP.name} > {member}", "no row for this key"))
            continue
        v, cell, conv = hit
        extra = ""
        if row["key"] == "efficiency.electrolyser" and v == 0:
            extra = "; cell is 0: this node states no electrolyser efficiency"
        if row["key"] in ("capacity.hydro_ps", "capacity.hydro_ror", "capacity.pondage"):
            extra = "; note names only the sheet, row chosen from the key"
        out.append(
            result(
                row, v, f"{PEMMDB_ZIP.name} > {member} > {cell}", f"{node} {year}; {conv}{extra}"
            )
        )
    return out


# ---------------------------------------------------------------- 2. Reference grid (links)

LINE_ZIP = TYNDP / "tyndp2024.Line-data.zip"
LINE_MEMBER = "Line data/ReferenceGrid_Electricity.xlsx"
GRID_NODE = {"EE": "EE00", "LV": "LV00", "LT": "LT00", "FI": "FI00", "SE4": "SE04", "PL": "PL00"}


def check_reference_grid(rows):
    wb = open_xlsx(LINE_ZIP, LINE_MEMBER)
    out, sheets = [], {}
    for row in rows:
        sheet = group(r"sheet (\d{4})", row["notes"])
        assert sheet == row["year"], (sheet, row["year"])
        if sheet not in sheets:
            g = grid(wb, sheet)
            assert g[0][:3] == ["Border", "Summary Direction 1", "Summary Direction 2"], g[0]
            # Direction 1 = as written, shown by the file itself: capacity into the Polish import node
            # (*-PL00I) and out of the export node (PL00E-*) sits in Direction 1, Direction 2 is 0.
            pl = [
                r
                for r in g[1:]
                if isinstance(r[0], str) and (r[0].endswith("-PL00I") or r[0].startswith("PL00E-"))
            ]
            ok = pl and all(r[1] > 0 and r[2] == 0 for r in pl)
            sheets[sheet] = (g, "PL00I/PL00E rows confirm" if ok else "CONVENTION UNCONFIRMED")
        g, convention = sheets[sheet]
        a, b = (GRID_NODE[z] for z in row["border"].split("-"))
        fwd = row["direction"] == "fwd"
        r = row_of(g, 0, f"{a}-{b}")
        written, d = f"{a}-{b}", (1 if fwd else 2)
        if r is None:  # border written the other way round
            r = row_of(g, 0, f"{b}-{a}")
            written, d = f"{b}-{a}", (2 if fwd else 1)
        where = f"{LINE_ZIP.name} > {LINE_MEMBER} > {sheet}!"
        if r is None:
            out.append(result(row, None, where, f"neither {a}-{b} nor {b}-{a} in column A"))
            continue
        src, dst = (a, b) if fwd else (b, a)
        ev = f"'{written}' as written; {src}->{dst} = Direction {d} ({convention})"
        cited = re.search(r"direction (\d)", row["notes"])
        if cited and int(cited.group(1)) != d:
            ev += f"; NOTE CITES direction {cited.group(1)}"
        out.append(result(row, num(g[r - 1][d]), f"{where}{ref(r, d)} ({written}, {g[0][d]})", ev))
    return out


# ---------------------------------------------------------------- 3. Commodity prices

PRICES_ZIP = TYNDP / "tyndp2024.Prices.zip"
PRICES_MEMBER = "Prices/2023 06 22 TYNDP 2024 Commodity prices Final.xlsx"
PRICE_ROW = {  # commodity -> label in column B of sheet 'Matrix 2024'
    "uranium": "Nuclear",
    "brown_coal": "Lignite G2 (SK - DE - RS - PL - ME - UKNI - BA - IE)",
    "hard_coal": "Hard coal",
    "gas": "Natural Gas",
    "oil_crude": "Crude oil",
    "eua": "CO2 price",
    "hydrogen_blue": "Hydrogen (blue )",
    "biomethane": "Biomethane",
    "synthetic_methane": "Synthetic Methane",
    "oil_light": "Light oil",
    "oil_heavy": "Heavy oil",
    "oil_shale": "Oil Shale",
}
PRICE_UNIT = {"€/GJ": "EUR/GJ", "€/Gj": "EUR/GJ", "€/ton": "EUR/t"}


def check_prices(rows):
    g = grid(open_xlsx(PRICES_ZIP, PRICES_MEMBER), "Matrix 2024")
    hr = row_at(g, 1, "Fuel")  # row 3: B Fuel, C Unit, D.. years
    rb, cb = next(
        (r, c)
        for r, row in enumerate(g, start=1)
        for c, v in enumerate(row)
        if isinstance(v, str) and v.startswith("(Currency")
    )
    base = g[rb - 1][cb]  # '(Currency 2021 €)'
    scope = g[0][3]  # D1 'Same for all scenarios'
    out = []
    for row in rows:
        label = PRICE_ROW[row["commodity"]]
        r = row_of(g, 1, label)
        c = g[hr - 1].index(int(row["year"])) if int(row["year"]) in g[hr - 1] else None
        where = f"{PRICES_ZIP.name} > {PRICES_MEMBER} > Matrix 2024!"
        if r is None or c is None:
            out.append(
                result(row, None, where, f"no row {label!r} or no year column {row['year']}")
            )
            continue
        unit = g[r - 1][2]
        ev = f"unit {unit!r} = {PRICE_UNIT.get(unit)}, no conversion; {ref(rb, cb)} {base!r}; D1 {scope!r}"
        if PRICE_UNIT.get(unit) != row["unit"]:
            ev += f"; UNIT MISMATCH vs {row['unit']}"
        note_base = re.search(r"(\d{4}) EUR", row["notes"])
        if note_base and note_base.group(1) not in base:
            ev += f"; PRICE BASE: note {note_base.group(1)}, document {base!r}"
        out.append(
            result(row, num(g[r - 1][c]), f"{where}{ref(r, c)} ({label}, {row['year']})", ev)
        )
    return out


# ---------------------------------------------------------------- 4. TYNDP 2024 CO2 factors

CO2_ZIP = TYNDP / "tyndp2024.CO2-emission-factors-in-TYNDP2024-v2-xlsx.zip"
CO2_MEMBER = "CO2 emission factors in TYNDP2024 v2.xlsx"


def check_tyndp_co2(rows):
    g = grid(open_xlsx(CO2_ZIP, CO2_MEMBER), "CO2 emission factor")
    hdr, unit = g[2], g[3][4]  # row 3 labels; E4 'kg / Net GJ'
    out = []
    for row in rows:
        cat, fuel = row["tech_class"].split("_", 1)
        label = row["parameter"].rsplit("_", 1)[1].upper()  # co2_factor_nt2030 -> 'NT2030'
        r, c = row_of(g, 1, int(cat)), (hdr.index(label) if label in hdr else None)
        where = f"{CO2_ZIP.name} > {CO2_MEMBER} > CO2 emission factor!"
        if r is None or c is None:
            out.append(result(row, None, where, f"no category {cat} or no column {label}"))
            continue
        v = num(g[r - 1][c])
        ev = f"category {cat} = {g[r - 1][2]} / {g[r - 1][3]}; {label} column; unit E4 {unit!r} = kg/GJ"
        if "_".join(g[r - 1][2].lower().split()) != fuel:
            ev += "; FUEL NAME MISMATCH"
        if v is not None and not matches(row["value"], v):  # where does the CSV value sit instead?
            same = [
                f"{get_column_letter(j + 1)} {hdr[j]!r}"
                for j in range(4, len(hdr))
                if num(g[r - 1][j]) is not None and matches(row["value"], g[r - 1][j])
            ]
            ev += (
                f"; CSV value equals {', '.join(same)}"
                if same
                else "; CSV value in no column of this row"
            )
        out.append(result(row, v, f"{where}{ref(r, c)} ({g[r - 1][2]} {g[r - 1][3]}, {label})", ev))
    return out


# ---------------------------------------------------------------- 5. Danish Energy Agency catalogue

DEA_XLSX = CATALOGUE / "catalogue.dea_el_dh_2025.xlsx"
DEA_PAR = {  # CSV parameter -> start of the DEA 'par' label (Cb carries a sheet-specific temperature pair)
    "efficiency": "Electrical efficiency (net, annual average) []",
    "efficiency_2050": "Electrical efficiency (net, annual average) []",  # year 2050 from the note
    "efficiency_nameplate": "Electrical efficiency (net, name plate) []",
    "heat_efficiency": "Heat efficiency (net, annual average) []",
    "cb": "Cb coefficient",
    "vom": "Variable O&M (*total) [EUR/MWh_e]",
    "fom": "Fixed O&M (*total) [EUR/MW_e/y]",
    "min_stable_generation": "Minimum load (of full load) []",
    "lifetime": "Technical lifetime [years]",
    "startup_time_warm": "Warm start-up time [hours]",
    "startup_time_cold": "Cold start-up time [hours]",
    "forced_outage_rate": "Forced outage []",
    "planned_outage_weeks": "Planned outage [weeks per year]",
    "investment": "Nominal investment (*total) [MEUR/MW_e]",
    "investment_2050": "Nominal investment (*total) [MEUR/MW_e]",  # year 2050 from the note
    "startup_cost_warm": "Startup cost [EUR/MW_e/startup]",
}


def dea_sheet_cell(g, par: str, year: int):
    """Value and cell of par/year/ctrl in a DEA data sheet: rows 'year' and 'est' pick the column."""
    r_year, r_est = row_at(g, 0, "year"), row_at(g, 0, "est")
    c = next(
        (j for j, y in enumerate(g[r_year - 1]) if y == year and g[r_est - 1][j] == "ctrl"), None
    )
    r = row_of(g, 1, par)
    return (None, "") if r is None or c is None else (num(g[r - 1][c]), ref(r, c))


def check_dea(rows):
    long = pd.read_excel(DEA_XLSX, sheet_name="alldata_long", header=1)  # Excel row 2 is the header
    long["xlsx_row"] = long.index + 3
    wb = open_xlsx(DEA_XLSX)
    intro_year = grid(wb, "Intro", max_row=12)[11][3]  # D12, next to 'Cost data is in'
    sheets = {}
    out = []
    for row in rows:
        sheet = group(r"sheet '([^']+)'", row["notes"])
        year = int(group(r"year (\d{4})", row["notes"]))
        prefix = DEA_PAR[row["parameter"]]
        hit = long[
            (long.ws == sheet)
            & (long.est == "ctrl")
            & (long.year == year)
            & long.par.str.startswith(prefix, na=False)
        ]
        where = f"{DEA_XLSX.name} > alldata_long"
        if len(hit) != 1:
            out.append(
                result(
                    row,
                    None,
                    where,
                    f"{len(hit)} rows for ws={sheet!r}, par {prefix!r}, ctrl, {year}",
                )
            )
            continue
        h = hit.iloc[0]
        v = num(h.val)
        if sheet not in sheets:
            sheets[sheet] = grid(wb, sheet, max_row=80)
        wide, cell = dea_sheet_cell(sheets[sheet], h.par, year)
        ev = f"par {h.par!r}, est ctrl, year {year}"
        if "estimate" not in row["notes"]:
            ev += " (note names no estimate; ctrl used)"
        note_base = re.search(r"(\d{4}) EUR", row["notes"])
        if note_base and pd.notna(h.priceyear) and int(note_base.group(1)) != int(h.priceyear):
            ev += (
                f"; PRICE BASE: note {note_base.group(1)} EUR, alldata_long priceyear {int(h.priceyear)} "
                f"(Intro D12: cost data in {intro_year} EURO)"
            )
        if (
            wide is None or v is None or not math.isclose(wide, v, rel_tol=1e-9)
        ):  # alldata_long keeps ~10 digits
            ev += f"; data sheet {cell or 'cell missing'} = {wide} DISAGREES with alldata_long"
        found = f"{where} row {h.xlsx_row} = '{sheet}'!{cell}"
        out.append(result(row, v, found, ev))
    return out


# ---------------------------------------------------------------- 7. Danish Energy Agency, energy storage

DEA_STORAGE_XLSX = CATALOGUE / "catalogue.dea_storage_2025.xlsx"
DEA_STORAGE_PAR = {  # CSV parameter -> start of the data sheet's 'par' label
    "investment_energy": "- energy component [MEUR/MWh]",
    "investment_power": "- power component [MEUR/MW]",
    "investment_other": "- other project costs [MEUR/MWh]",
    "investment_energy_2050": "- energy component [MEUR/MWh]",  # year 2050 from the note
    "investment_power_2050": "- power component [MEUR/MW]",
    "investment_other_2050": "- other project costs [MEUR/MWh]",
    "lifetime": "Technical lifetime [years]",
}


def check_dea_storage(rows):
    flat = pd.read_excel(DEA_STORAGE_XLSX, sheet_name="alldata_flat")  # Excel row 1 is the header
    flat["xlsx_row"] = flat.index + 2
    out = []
    for row in rows:
        sheet = group(r"sheet '([^']+)'", row["notes"])
        year = int(group(r"year (\d{4})", row["notes"]))
        prefix = DEA_STORAGE_PAR[row["parameter"]]
        hit = flat[(flat.ws == sheet) & (flat.est == "ctrl") & (flat.year == year)
                   & flat.par.str.startswith(prefix, na=False)]
        where = f"{DEA_STORAGE_XLSX.name} > alldata_flat"
        if len(hit) != 1:
            out.append(result(row, None, where, f"{len(hit)} rows for ws={sheet!r}, par {prefix!r}, ctrl, {year}"))
            continue
        h = hit.iloc[0]
        ev = f"par {h.par!r}, est ctrl, year {year}"
        note_base = re.search(r"(\d{4}) EUR", row["notes"])
        if note_base and pd.notna(h.priceyear) and int(note_base.group(1)) != int(h.priceyear):
            ev += f"; PRICE BASE: note {note_base.group(1)} EUR, alldata_flat priceyear {int(h.priceyear)}"
        out.append(result(row, num(h.val), f"{where} row {h.xlsx_row} = '{sheet}'", ev))
    return out


# ---------------------------------------------------------------- 6. Statistics Finland fuel classification

STATFI_XLSX = CATALOGUE / "catalogue.statfi_fuels_2025.xlsx"
STATFI_COL = {
    "co2_factor": "Fossil CO2",
    "co2_factor_biogenic": "Biogenic CO2",
    "co2_factor_total": "Combined CO2",
}
STATFI_NOTE_WORD = {
    "co2_factor": "fossil",
    "co2_factor_biogenic": "biogenic",
    "co2_factor_total": "combined",
}


def check_statfi(rows):
    g = grid(open_xlsx(STATFI_XLSX), "Fuel classification 2025")
    hdr, units = g[2], g[3]  # row 3 headings, row 4 ' [t/TJ]'
    basis = g[1][6]  # G2 '... (per total net energy content)'
    out = []
    for row in rows:
        code = group(r"code (\d{2}\.\d{2}\.\d{2})", row["notes"])
        c, r = col_at(hdr, STATFI_COL[row["parameter"]]), row_of(g, 0, code)
        where = f"{STATFI_XLSX.name} > Fuel classification 2025!"
        if r is None:
            out.append(result(row, None, where, f"code {code} not in column A"))
            continue
        cell = g[r - 1][c]
        ev = (
            f"{code} = {g[r - 1][2].strip()!r}; {hdr[c].strip()} {units[c].strip()}, "
            f"{'net energy content' if 'net energy' in basis else 'BASIS ' + repr(basis)}; 1 t/TJ = 1 kg/GJ"
        )
        if not row["notes"].lower().startswith(STATFI_NOTE_WORD[row["parameter"]]):
            ev += "; NOTE WORDING DOES NOT MATCH THE COLUMN"
        if num(cell) is None:
            ev += f"; cell holds {cell!r}"
        out.append(result(row, num(cell), f"{where}{ref(r, c)} ({code}, {hdr[c].strip()})", ev))
    return out


# ---------------------------------------------------------------- run

# ---------------------------------------------------------------- 7. TYNDP 2024: the neighbours' fuel (D-072)

REPRICE = "boundary.reprice.tyndp2024."
SUPPLY_ZIP = TYNDP / "tyndp2024.20231103-Final-Supply-Inputs-for-TYNDP-2024-Scenarios-xlsx.zip"
SUPPLY_MEMBER = "20231103 - Final Supply Inputs for TYNDP 2024 Scenarios.xlsx"
SUPPLY_CELL = {  # key -> (sheet, cell, the label its row must carry, the column of that label)
    "gas_blend.2030": ("3.1.", "D20", "Gas (blend of biomethane, synthetic gas and NG) NT", "B"),
    "gas_blend.DE.2040": ("3.1.", "E21", "Gas (blend of biomethane, synthetic gas and NG) DE", "B"),
    "gas_blend.DE.2050": ("3.1.", "F21", "Gas (blend of biomethane, synthetic gas and NG) DE", "B"),
    "gas_blend.GA.2040": ("3.1.", "E22", "Gas (blend of biomethane, synthetic gas and NG) GA", "B"),
    "gas_blend.GA.2050": ("3.1.", "F22", "Gas (blend of biomethane, synthetic gas and NG) GA", "B"),
    "methane_share.2030": ("3.2.", "C22", "Methane", "B"),
    "methane_share.GA.2040": ("3.2.", "H22", "Methane", "G"),
    "methane_share.GA.2050": ("3.2.", "I22", "Methane", "G"),
    "methane_share.DE.2040": ("3.2.", "N22", "Methane", "M"),
    "methane_share.DE.2050": ("3.2.", "O22", "Methane", "M"),
}
HYDROGEN_ZIP = TYNDP / "tyndp2024.Hydrogen.zip"
INVEST_ZIP = TYNDP / "tyndp2024.Investment-Datasets.zip"


def _cell(g, a1: str):
    m = re.fullmatch(r"([A-Z]+)(\d+)", a1)
    if m is None:
        raise ValueError(f"{a1!r}: not a cell reference")
    col = 0
    for ch in m.group(1):
        col = col * 26 + ord(ch) - 64
    r = int(m.group(2))
    return g[r - 1][col - 1] if r <= len(g) and col <= len(g[r - 1]) else None


def _table_value(g, match: dict[int, object], col0: int):
    """(row number, value in 0-based column col0) of the first row whose columns equal `match`."""
    for r, row in enumerate(g, start=1):
        if all(len(row) > c and row[c] == v for c, v in match.items()):
            return r, row[col0]
    return None, None


def check_reprice_supply(rows):
    wb = open_xlsx(SUPPLY_ZIP, SUPPLY_MEMBER)
    grids = {s: grid(wb, s, max_row=40) for s in ("3.1.", "3.2.")}
    out = []
    for row in rows:
        sheet, a1, label, lcol = SUPPLY_CELL[row["key"].removeprefix(REPRICE)]
        g = grids[sheet]
        got = _cell(g, lcol + re.sub(r"[A-Z]+", "", a1))
        where = f"{SUPPLY_ZIP.name} > {SUPPLY_MEMBER} > {sheet}!{a1}"
        if got != label:
            out.append(result(row, None, where, f"row label {got!r}, expected {label!r}"))
            continue
        out.append(result(row, num(_cell(g, a1)), where, f"row label {label!r}"))
    return out


def check_reprice_hydrogen(rows):
    books = {}

    def g(member, sheet):
        if (member, sheet) not in books:
            books[member, sheet] = grid(open_xlsx(HYDROGEN_ZIP, f"Hydrogen/{member}"), sheet)
        return books[member, sheet]

    out = []
    for row in rows:
        key = row["key"].removeprefix(REPRICE)
        if key.startswith("smr."):
            member, sheet, col0 = "SMR Figures.xlsx", "TEMPLATE", 4 if key == "smr.heat_rate" else 5
            match = {0: "FI", 1: 2035, 2: "Distributed Energy"}
        elif key.startswith("efuel.price."):
            member, sheet, col0 = "SYNTHETIC FUEL GENERATORS PROPERTIES.xlsx", "TEMPLATE", 5
            match = {0: int(key.rsplit(".", 1)[1]), 2: "e-kerosene"}
        else:  # efuel.h2_efficiency
            member, sheet, col0 = "SYNTHETIC FUEL LINES.xlsx", "SYNTHETIC FUELS", 7
            match = {0: 2035, 2: "e-kerosene"}
        r, v = _table_value(g(member, sheet), match, col0)
        where = f"{HYDROGEN_ZIP.name} > Hydrogen/{member} > {sheet}!"
        if r is None:
            out.append(result(row, None, where, f"no row {match}"))
            continue
        head = g(member, sheet)[0][col0]
        out.append(result(row, num(v), f"{where}{ref(r, col0)}", f"column {head!r}; row {match}"))
    return out


def check_reprice_invest(rows):
    member = "Investment Datasets/GENERATOR.xlsx"
    g = grid(open_xlsx(INVEST_ZIP, member), "TEMPLATE")
    out = []
    for row in rows:
        key = row["key"].removeprefix(REPRICE)
        col0 = 6 if key.startswith("electrolyser.efficiency.") else 5
        match = {0: "All", 1: int(key.rsplit(".", 1)[1]), 2: "Distributed Energy",
                 3: "Electrolyzer Onshore"}
        r, v = _table_value(g, match, col0)
        where = f"{INVEST_ZIP.name} > {member} > TEMPLATE!"
        if r is None:
            out.append(result(row, None, where, f"no row {match}"))
            continue
        out.append(result(row, num(v), f"{where}{ref(r, col0)}",
                          f"column {g[0][col0]!r}; row {match}"))
    return out


GROUPS = {
    "tyndp2024.PEMMDB2": check_pemmdb,
    "tyndp2024.Line-data": check_reference_grid,
    "tyndp2024.Prices": check_prices,
    "tyndp2024.CO2-emission-factors-in-TYNDP2024-v2-xlsx": check_tyndp_co2,
    "catalogue.dea_el_dh_2025": check_dea,
    "catalogue.dea_storage_2025": check_dea_storage,
    "catalogue.statfi_fuels_2025": check_statfi,
    "tyndp2024.20231103-Final-Supply-Inputs-for-TYNDP-2024-Scenarios-xlsx": check_reprice_supply,
    "tyndp2024.Hydrogen": check_reprice_hydrogen,
    "tyndp2024.Investment-Datasets": check_reprice_invest,
}


def selfcheck():
    assert matches("861.0", 0.861 * 1000) and matches("5000.0", 5.00002 * 1000)
    assert matches("1.681", 1.6808484848484848) and matches("113.4", 113.39999999999999)
    assert matches("198", 198) and matches("0.2851", 0.28508) and not matches("0.68", 0)
    assert not matches("57.0", 51.57386182992716) and matches("24.99", 24.990000000000002)


def results(rows: list[dict]) -> list[dict]:
    """One verification record per row (dicts of the documentary CSV row plus `file`), in the
    input order."""
    selfcheck()
    out = [result(r, None, "", "no extractor for this lineage_id") for r in rows]
    for lin, check in GROUPS.items():
        idx = [i for i, r in enumerate(rows) if r["lineage_id"] == lin]
        for i, res in zip(idx, check([rows[i] for i in idx]), strict=True):
            out[i] = res
    return out
