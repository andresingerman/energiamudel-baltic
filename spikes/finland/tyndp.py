# Test 1's inputs (docs/research/2026-10-11_finland_2035.md §0): TYNDP 2024's own Finland, read from its
# market-model output for Distributed Energy 2035 (v5 data/raw/tyndp2024/tyndp2024.DE2035CY<cy>.zip, the
# main `_v11_SoS.xlsb`): FI00's hourly block (generation by type, demand, electrolysers, batteries, DSR,
# balance, dumped energy, marginal cost), the marginal cost of SE01, SE03, NON1 and EE00, and FI00's
# exchanges per neighbour and with its own sub-nodes (electric cars, the electrolysers' node), each
# neighbour's capacity the sum of its columns' maxima. One JSON per climate year.
# Usage: .venv/bin/python spikes/finland/tyndp.py OUT_DIR [cy …]
import io
import json
import sys
import zipfile
from pathlib import Path

from pyxlsb import open_workbook

ROOT = Path(__file__).resolve().parents[2]
NEIGHBOURS = {"SE01": "SE1", "SE03": "SE3", "NON1": "NO4", "EE00": "EE"}


def workbook(cy: int) -> bytes:
    p = ROOT / "data" / "raw" / "tyndp2024" / f"tyndp2024.DE2035CY{cy}.zip"
    with zipfile.ZipFile(p) as z:
        member = next(m for m in z.namelist() if m.endswith("_v11_SoS.xlsb") and "__MACOSX" not in m
                      and not any(k in m for k in ("_H2_", "_Heat_", "_offshore_")))
        return z.read(member)


def extract(cy: int) -> dict:
    data = workbook(cy)
    fi: dict[str, list[float]] = {}
    price: dict[str, list[float]] = {v: [] for v in NEIGHBOURS.values()}
    with open_workbook(io.BytesIO(data)) as wb:
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
                        if node[j] == "FI00":
                            cols.append((j, "FI", c.split(" [")[0].strip()))
                        elif node[j] in NEIGHBOURS and c.startswith("Marginal Cost"):
                            cols.append((j, NEIGHBOURS[node[j]], "price"))
                    continue
                if isinstance(v[0], (int, float)):
                    for j, who, what in cols:
                        x = float(v[j]) if isinstance(v[j], (int, float)) else 0.0
                        if who == "FI":
                            fi.setdefault(what, []).append(x)
                        else:
                            price[who].append(x)
        with wb.get_sheet("Crossborder exchanges") as sh:
            rows = []
            flows: dict[str, list[float]] = {}
            cap: dict[str, list[float]] = {}
            for i, row in enumerate(sh.rows()):
                v = [c.v for c in row]
                if i < 11:
                    rows.append(v)
                    if i == 10:
                        hdr = v
                        sel = []
                        for j, x in enumerate(hdr):
                            if not isinstance(x, str) or "FI00" not in x or "FIOH" in x:
                                continue
                            a, b = x.split(" ")[0].split("-") if "-" in x.split(" ")[0] else (None, None)
                            if a is None or "FI00" not in (a, b):
                                continue
                            other = b if a == "FI00" else a
                            sign = -1.0 if a == "FI00" else 1.0          # + into FI00
                            key = NEIGHBOURS.get(other, other)            # sub-nodes keep their names
                            sel.append((j, key, sign))
                            lo, hi = rows[5][j] or 0.0, rows[6][j] or 0.0
                            imp, exp = (hi, -lo) if sign > 0 else (-lo, hi)
                            c = cap.setdefault(key, [0.0, 0.0])
                            c[0] += max(0.0, imp)
                            c[1] += max(0.0, exp)
                    continue
                if isinstance(v[0], (int, float)):
                    for j, key, sign in sel:
                        x = float(v[j]) if isinstance(v[j], (int, float)) else 0.0
                        f = flows.setdefault(key, [])
                        if len(f) < int(v[0]):
                            f.append(0.0)
                        f[int(v[0]) - 1] += sign * x
    return {"cy": cy, "hours": len(fi["Marginal Cost"]), "fi": fi, "price": price, "flow": flows,
            "cap": {k: {"imp": c[0], "exp": c[1]} for k, c in cap.items()}}


if __name__ == "__main__":
    dest = Path(sys.argv[1])
    dest.mkdir(parents=True, exist_ok=True)
    for cy in [int(a) for a in sys.argv[2:]] or [1995, 2008, 2009]:
        d = extract(cy)
        (dest / f"tyndp_DE2035_cy{cy}.json").write_text(json.dumps(d))
        mean = lambda a: sum(a) / len(a)
        print(f"CY{cy}: {d['hours']} h; FI price {mean(d['fi']['Marginal Cost']):.1f}; neighbours "
              + ", ".join(f"{k} {mean(v):.1f}" for k, v in d["price"].items())
              + "; net imports TWh " + ", ".join(f"{k} {sum(v) / 1e6:.2f}" for k, v in d["flow"].items())
              + "; capacities " + ", ".join(f"{k} {c['imp']:.0f}/{c['exp']:.0f}" for k, c in d["cap"].items())
              + "; FI categories: " + ", ".join(k for k, v in d["fi"].items() if any(abs(x) > 0 for x in v)))
