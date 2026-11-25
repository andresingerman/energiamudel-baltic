"""ENTSO-E / ENTSOG TYNDP 2024 scenarios: every file published on the download page.

Page:    https://2024.entsos-tyndp-scenarios.eu/download/   (licence CC BY 4.0)
Files:   `tyndp_files.txt` next to this module, the page's links as read on 2026-09-14;
         inputs (PEMMDB 2.5, PECD 3.1, prices, CO2 factors, grids), outputs (NT+ 2030/2040,
         DE and GA 2035/2040/2050 for climate years 1995/2008/2009) and the reports.
Cache:   data/raw/tyndp2024/<file name>, one lineage record each (dataset id
         `tyndp2024.<stem>`). Documents, not an API: the record carries the page URL as its
         endpoint and the file URL in params.
Prices:  the market-model outputs carry the hourly marginal cost of every node. v5 reads the
         six nodes of its zone graph (R-BND-5): the boundary zones' prices are the scenario
         years' price profiles, the core zones' are a benchmark. National Trends is published
         for climate year 2009 only (`xlsx`); Distributed Energy and Global Ambition for 1995,
         2008 and 2009 (`xlsb`, sheet 'Hourly Market Data emarket').
"""

from __future__ import annotations

import re
from pathlib import Path

import pandas as pd

from . import cached_get

SOURCE = "ENTSO-E/ENTSOG TYNDP 2024 scenarios"
LICENCE = "CC BY 4.0"
RAW = "tyndp2024"
PAGE = "https://2024.entsos-tyndp-scenarios.eu/download/"
FILES = [ln.strip() for ln in (Path(__file__).parent / "tyndp_files.txt").read_text().splitlines()
         if ln.strip()]


def _stem(url: str) -> str:
    name = url.rsplit("/", 1)[-1]
    return re.sub(r"[^A-Za-z0-9_-]+", "-", name.rsplit(".", 1)[0]).strip("-")


def fetch(url: str) -> Path:
    name = url.rsplit("/", 1)[-1]
    ext = name.rsplit(".", 1)[-1].lower()
    return cached_get(raw=RAW, dataset=f"tyndp2024.{_stem(url)}", ext=ext, url=url,
                      params={"page": PAGE, "file": name}, source=SOURCE, licence=LICENCE,
                      timeout=1800)


# TYNDP market-modelling node -> this project's zone. The e-market node of a country is 'XX00';
# its prosumer, EV and shared-RES sub-nodes ('EE00 SRES', 'EE00RETE', ...) are not read.
MM_NODES = {"EE00": "EE", "LV00": "LV", "LT00": "LT", "FI00": "FI", "SE04": "SE4", "PL00": "PL"}


def parse_mm_prices(path: Path, nodes: dict[str, str] = MM_NODES) -> pd.DataFrame:
    """Hourly marginal cost per node from a TYNDP 2024 market-modelling output archive
    (`MMStandardOutputFile_<scenario><year>_Plexos_CY<cy>…xlsx.zip`, sheet 'Hourly Market
    Data'): one block of 55 columns per node, the block's 'Marginal Cost [€]' column, hours
    from the 14th row (8 736 hours, 52 weeks). Returns (zone, hour, eur_mwh)."""
    import io
    import zipfile

    import openpyxl
    with zipfile.ZipFile(path) as z:
        member = next(m for m in z.namelist() if m.endswith(".xlsx") and "__MACOSX" not in m)
        ws = openpyxl.load_workbook(io.BytesIO(z.read(member)), read_only=True)[
            "Hourly Market Data"]
    rows = ws.iter_rows(min_row=11, values_only=True)
    cat, node = next(rows), next(rows)
    next(rows)
    cols = [(j, nodes[node[j]]) for j, c in enumerate(cat)
            if isinstance(c, str) and c.startswith("Marginal Cost") and node[j] in nodes]
    if sorted(z for _, z in cols) != sorted(nodes.values()):     # as the xlsb reader checks
        raise ValueError(f"{path.name}: price columns for {cols}, want {nodes}")
    out = []
    for r in rows:
        if r[0] is None:
            break
        out += [(zone, int(r[0]), float(r[j])) for j, zone in cols if r[j] is not None]
    return pd.DataFrame(out, columns=["zone", "hour", "eur_mwh"])


def mm_meta(path: Path) -> tuple[str, int, int]:
    """(scenario, target_year, climate_year) from an output archive's name: 'NT' from
    `MMStandardOutputFile_NT2030_Plexos_CY2009…`, 'DE' / 'GA' from `tyndp2024.DE2035CY1995.zip`."""
    m = re.search(r"(NT|DE|GA)(\d{4})(?:_Plexos_)?CY(\d{4})", path.name)
    if m is None:
        raise ValueError(f"{path.name}: not a market model's output archive")
    return m.group(1), int(m.group(2)), int(m.group(3))


DEMAND_ROW = "Native Demand (excl. Pump load & Battery charge) [GWh]"
ELECTROLYSER_ROW = "Electrolyser (load)"


def _yearly_rows(path: Path) -> list[list]:
    """The 'Yearly Outputs' sheet of an output archive's main workbook as lists of values:
    the NT workbooks are xlsx (read with cached values), DE and GA are xlsb."""
    import io
    import zipfile
    with zipfile.ZipFile(path) as z:
        member = next(m for m in z.namelist() if "__MACOSX" not in m
                      and m.endswith((".xlsx", "_v11_SoS.xlsb"))
                      and not any(k in m for k in ("_H2_", "_Heat_", "_offshore_")))
        data = z.read(member)
    if member.endswith(".xlsx"):
        import openpyxl
        ws = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)[
            "Yearly Outputs"]
        return [list(r) for r in ws.iter_rows(values_only=True)]
    from pyxlsb import open_workbook
    with open_workbook(io.BytesIO(data)) as wb, wb.get_sheet("Yearly Outputs") as sh:
        return [[c.v for c in r] for r in sh.rows()]


def parse_mm_yearly(path: Path, nodes: dict[str, str] = MM_NODES) -> pd.DataFrame:
    """Annual demand behind a scenario's prices (R-BND-8), per zone, from the 'Yearly Outputs'
    sheet of an output archive: the row 'Native Demand (excl. Pump load & Battery charge)
    [GWh]' and, under 'Annual generation [GWh]', the row 'Electrolyser (load)', each summed over
    every node of the zone (e.g. FI00, FI00 EV Passenger Prosumer, FI00 EV Passenger Street,
    FI00 SRES, FI00RETE). Returns (zone, demand_twh, electrolysis_twh); electrolysis is not
    part of native demand."""
    rows = _yearly_rows(path)
    hdr = next(r for r in rows if len(r) > 2 and r[0] == "Output type")
    cols = {z: [j for j, h in enumerate(hdr) if isinstance(h, str) and h[:4] == node]
            for node, z in nodes.items()}
    missing = [z for z, c in cols.items() if not c]
    if missing:
        raise ValueError(f"{path.name}: no node columns for {missing}")
    section, demand, electro = None, None, None
    for r in rows:
        if r and r[0]:
            section = r[0]
        if section == DEMAND_ROW and demand is None:
            demand = r
        if section == "Annual generation [GWh]" and len(r) > 1 and r[1] == ELECTROLYSER_ROW:
            electro = r
    if demand is None or electro is None:
        raise ValueError(f"{path.name}: demand or electrolyser row not found")

    def total(row, js):
        vals = [row[j] for j in js]
        if any(not isinstance(v, (int, float)) for v in vals):
            raise ValueError(f"{path.name}: non-numeric cell in {vals}")
        return sum(vals) / 1000

    return pd.DataFrame([(z, total(demand, js), total(electro, js)) for z, js in cols.items()],
                        columns=["zone", "demand_twh", "electrolysis_twh"])


BOUNDARY_NODES = {"FI00": "FI", "SE04": "SE4", "PL00": "PL"}
GENERATION = "Annual generation [GWh]"
CAPACITY = "Installed Capacities [MW]"
# one-row sections of the sheet that close a zone's balance beside its generation
BALANCE = ("Net annual country balance [GWh] (Export is positive)", "Dump energy [GWh]")
# the nodes of the zone's electric cars ('FI00 EV Passenger Prosumer', '… Street'): their batteries
# are the cars' (FI 2035 DE: 129 GW against 4 GW of stationary batteries), so their rows are kept
# apart under the prefix
EV = "EV: "


def parse_mm_outputs(path: Path, nodes: dict[str, str] = BOUNDARY_NODES) -> pd.DataFrame:
    """What a boundary profile's prices come from (R-BND-8, D-040, D-041): per zone, every non-zero
    row of 'Annual generation [GWh]' (as TWh) and of 'Installed Capacities [MW]' in the 'Yearly
    Outputs' sheet, and the net export and dumped energy (TWh). The loads among the rows
    (electrolyser, battery charge, pump) are marked '(load)' or '(pump)' by the sheet itself. Each
    is summed over the zone's nodes as `parse_mm_yearly` sums demand; the electric cars' nodes are
    summed apart, their labels prefixed with `EV`. Returns (zone, output, measure 'twh' | 'mw',
    value); `output` is the sheet's own label."""
    rows = _yearly_rows(path)
    hdr = next(r for r in rows if len(r) > 2 and r[0] == "Output type")
    cols = {z: [j for j, h in enumerate(hdr) if isinstance(h, str) and h[:4] == node]
            for node, z in nodes.items()}
    missing = [z for z, c in cols.items() if not c]
    if missing:
        raise ValueError(f"{path.name}: no node columns for {missing}")
    ev = {j for js in cols.values() for j in js if " EV " in f"{hdr[j]} "}

    def total(row, js):
        vals = [row[j] if j < len(row) else None for j in js]
        if any(v is not None and not isinstance(v, (int, float)) for v in vals):
            raise ValueError(f"{path.name}: non-numeric cell in {vals}")
        return sum(v or 0 for v in vals)

    out, section, seen = [], None, set()
    for r in rows:
        if r and r[0]:
            section = r[0]
        if section in (GENERATION, CAPACITY) and len(r) > 1 and r[1]:
            label, measure, scale = r[1], "twh" if section == GENERATION else "mw", \
                1000 if section == GENERATION else 1
            seen.add(section)
        elif section in BALANCE and section not in seen:
            label, measure, scale = section, "twh", 1000
            seen.add(section)
        else:
            continue
        for z, js in cols.items():
            for prefix, cars in (("", False), (EV, True)):
                v = total(r, [j for j in js if (j in ev) == cars]) / scale
                if v:
                    out.append((z, prefix + label, measure, v))
    if seen != {GENERATION, CAPACITY, *BALANCE}:
        raise ValueError(f"{path.name}: generation, capacity or balance rows not found")
    return pd.DataFrame(out, columns=["zone", "output", "measure", "value"])


def parse_mm_prices_xlsb(path: Path, nodes: dict[str, str] = MM_NODES) -> pd.DataFrame:
    """Hourly marginal cost per node from a Distributed Energy / Global Ambition output archive
    (`tyndp2024.<DE|GA><year>CY<cy>.zip`, main workbook `…_v11_SoS.xlsb`, sheet 'Hourly
    Market Data emarket'): the 'Category' row names the column ('Marginal Cost [€]'), the
    'Country' row under it the node; hours are the rows whose first cell is a number (8 736,
    52 weeks). The model's price cap is 3 000 EUR/MWh. Returns (zone, hour, eur_mwh).
    ponytail: pyxlsb reads ~13 000 columns x 8 736 rows in about a minute per workbook."""
    import io
    import zipfile

    from pyxlsb import open_workbook
    with zipfile.ZipFile(path) as z:
        member = next(m for m in z.namelist() if m.endswith("_v11_SoS.xlsb")
                      and "__MACOSX" not in m
                      and not any(k in m for k in ("_H2_", "_Heat_", "_offshore_")))
        data = z.read(member)
    cat = node = None
    cols: list[tuple[int, str]] = []
    out: list[tuple[str, int, float]] = []
    with open_workbook(io.BytesIO(data)) as wb, wb.get_sheet("Hourly Market Data emarket") as sh:
        for row in sh.rows():
            v = [c.v for c in row]
            if cat is None:
                if len(v) > 1 and v[1] == "Category":
                    cat = v
                continue
            if node is None:
                node = v
                cols = [(j, nodes[node[j]]) for j, c in enumerate(cat)
                        if isinstance(c, str) and c.startswith("Marginal Cost")
                        and node[j] in nodes]
                if sorted(z for _, z in cols) != sorted(nodes.values()):
                    raise ValueError(f"{path.name}: price columns for {cols}, want {nodes}")
                continue
            if isinstance(v[0], (int, float)):
                out += [(zone, int(v[0]), float(v[j])) for j, zone in cols if v[j] is not None]
    return pd.DataFrame(out, columns=["zone", "hour", "eur_mwh"])
