# The 2035 inputs of the research on Sweden and Poland that TYNDP 2024's market model gives
# (docs/research/2026-10-12_sweden_poland_2035.md §3), per climate year, from DE 2035's main workbook
# (spikes/finland/tyndp.py's `workbook`):
# - "Hourly Market Data emarket": the hourly block (generation by category, demand, marginal cost) of
#   SE01–SE04 and PL00, and the marginal cost of the neighbours the zone models take as price-takers;
# - "Yearly Outputs": per node, annual generation and equivalent full-load hours by category (their
#   ratio is the installed capacity), native demand and the electrolysers' load.
# Usage: .venv/bin/python spikes/neighbours-2035/tyndp.py OUT_DIR [cy …]
import importlib.util
import io
import json
import sys
from pathlib import Path

from pyxlsb import open_workbook

ROOT = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location("fityndp", ROOT / "spikes" / "finland" / "tyndp.py")
fi = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fi)

BLOCKS = ("SE01", "SE02", "SE03", "SE04", "PL00")
PRICES = ("NOS0", "NOM1", "NON1", "DKW1", "DKE1", "DE00", "CZ00", "SK00", "LT00", "FI00") + BLOCKS


def hourly(wb) -> tuple[dict, dict]:
    block: dict[str, dict[str, list[float]]] = {n: {} for n in BLOCKS}
    price: dict[str, list[float]] = {n: [] for n in PRICES}
    with wb.get_sheet("Hourly Market Data emarket") as sh:
        cat = node = None
        cols: list[tuple[int, str, str]] = []
        for row in sh.rows():
            v = [c.v for c in row]
            if cat is None:
                if len(v) > 1 and v[1] == "Category":
                    cat = v
                continue
            if node is None:
                node = v
                for j, c in enumerate(cat):
                    if not isinstance(c, str):
                        continue
                    name = c.split(" [")[0].strip()
                    if node[j] in BLOCKS:
                        cols.append((j, node[j], name))
                    elif node[j] in PRICES and name == "Marginal Cost":
                        cols.append((j, node[j], "price"))
                continue
            if isinstance(v[0], (int, float)):
                for j, n, what in cols:
                    x = float(v[j]) if isinstance(v[j], (int, float)) else 0.0
                    if n in BLOCKS:
                        block[n].setdefault(what, []).append(x)
                    else:
                        price[n].append(x)
    for n in BLOCKS:
        price[n] = block[n]["Marginal Cost"]
    return block, price


def yearly(wb) -> dict:
    with wb.get_sheet("Yearly Outputs") as sh:
        rows = [[c.v for c in r] for r in sh.rows()]
    hdr = next(r for r in rows if len(r) > 1 and r[0] == "Output type")
    col = {n: hdr.index(n) for n in BLOCKS}
    out: dict[str, dict] = {n: {"gen_gwh": {}, "flh": {}} for n in BLOCKS}
    section = None
    for r in rows[rows.index(hdr) + 1:]:
        if r[0]:
            section = r[0]
        label = r[1] if len(r) > 1 and r[1] else section
        for n, j in col.items():
            x = r[j] if j < len(r) else None
            if not isinstance(x, (int, float)):
                continue
            if section.startswith("Annual generation"):
                out[n]["gen_gwh"][label] = x
            elif section.startswith("Equivalent full load hours"):
                out[n]["flh"][label] = x
            elif section.startswith("Native Demand"):
                out[n]["native_demand_gwh"] = x
            elif section.startswith("Pump storage consumption"):
                out[n]["pump_gwh"] = x
            elif section.startswith("Dump energy"):
                out[n]["dump_gwh"] = x
    for n in BLOCKS:   # installed capacity, MW: annual generation over full-load hours
        o = out[n]
        o["mw"] = {k: round(g * 1000 / o["flh"][k], 1) for k, g in o["gen_gwh"].items() if g and o["flh"].get(k)}
    return out


if __name__ == "__main__":
    dest = Path(sys.argv[1])
    dest.mkdir(parents=True, exist_ok=True)
    for cy in [int(a) for a in sys.argv[2:]] or [1995, 2008, 2009]:
        with open_workbook(io.BytesIO(fi.workbook(cy))) as wb:
            block, price = hourly(wb)
            year = yearly(wb)
        (dest / f"tyndp_SEPL_DE2035_cy{cy}.json").write_text(json.dumps({"cy": cy, "block": block, "price": price, "yearly": year}))
        mean = lambda a: sum(a) / len(a)
        print(f"CY{cy}: prices " + ", ".join(f"{k} {mean(v):.1f}" for k, v in price.items())
              + "; SE/PL MW " + "; ".join(f"{n} " + ", ".join(f"{k} {v:.0f}" for k, v in year[n]["mw"].items() if v > 50) for n in BLOCKS)
              + "; native demand TWh " + ", ".join(f"{n} {year[n].get('native_demand_gwh', 0) / 1e3:.1f}" for n in BLOCKS)
              + "; categories SE03: " + ", ".join(block["SE03"].keys()))
