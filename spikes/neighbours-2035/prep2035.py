# Phase 3 inputs of the research on Sweden and Poland (docs/research/2026-10-12_sweden_poland_2035.md §3):
# what a 2035 case takes beside its own capacities and demand, per climate year, on v5's 8 760 hours.
# - TYNDP 2024 PECD 3.1 per node (onshore, offshore, solar), 2035 the mean of the 2030 and 2040 editions;
#   SE01 has no solar file and takes SE02's. The National Trends 2030 demand profile per node (its shape).
# - TYNDP DE 2035 (tyndp.py's files): SE01+SE02's reservoir output per week (SE12's weekly budget: its
#   inflow is snowmelt, so not the budget), SE03's and SE04's hourly hydro (given), and every node's
#   marginal cost (re-priced and given the record's shape in cases.ts).
# - The record (prep.py's files, 2023–2025): SE3's nuclear availability per week (2024–2025, as
#   Finland's), each Swedish zone's CHP floor (10th percentile hour) and maximum per week, SE12's hydro
#   10th and 90th percentile hours against the week's mean; Poland's hard coal, lignite and gas floor and
#   maximum per week as a share of their A68 installed capacity; and the price pools of 2023–2025 for the
#   record's shape: A44 of every zone the models price (CZ and SK from v4's cache).
# Usage: .venv/bin/python spikes/neighbours-2035/prep2035.py DATA_DIR
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


fp = _load("fip2035", ROOT / "spikes" / "finland" / "prep2035.py")
fr = _load("fiprep", ROOT / "spikes" / "finland" / "prep.py")
CYS, H = fp.CYS, fp.H
NODES = ("SE01", "SE02", "SE03", "SE04", "PL00")
PL_CLASSES = ("hard_coal", "brown_coal", "gas")
POOL = ("NO1", "NO3", "NO4", "DK1", "DK2", "DE", "LT", "FI", "SE1", "SE2", "SE3", "SE4", "PL", "CZ", "SK")


def pecd(tech: str, node: str) -> dict[int, np.ndarray]:
    try:
        return fp.pecd(tech, node)
    except StopIteration:   # no file for this node and technology
        return fp.pecd(tech, "SE02") if tech == "LFSolarPV" else {cy: np.zeros(H) for cy in CYS}


def weeks(a: np.ndarray, f) -> np.ndarray:
    return np.array([f(a[w * 168:min(len(a), w * 168 + 168)]) for w in range(53)])


def record_patterns(dirpath: Path) -> dict:
    se = {y: json.loads((dirpath / f"record_SE_{y}.json").read_text()) for y in (2023, 2024, 2025)}
    pl = {y: json.loads((dirpath / f"record_PL_{y}.json").read_text()) for y in (2023, 2024, 2025)}
    g = lambda r, zs, t: sum(np.array(r["gen"][z].get(t, [0] * r["hours"])) for z in zs)
    out: dict = {}
    nuc = [weeks(g(se[y], ["SE3"], "nuclear"), np.mean) / g(se[y], ["SE3"], "nuclear").max() for y in (2024, 2025)]
    out["seNuclearWeekly"] = [round(float(x), 4) for x in np.mean(nuc, axis=0)]
    for zid, zs in (("SE12", ["SE1", "SE2"]), ("SE3", ["SE3"]), ("SE4", ["SE4"])):
        th = [g(se[y], zs, "other") + g(se[y], zs, "gas") for y in (2023, 2024, 2025)]
        out[f"chpFloorMw_{zid}"] = [round(float(x), 1) for x in np.mean([weeks(t, lambda w: np.quantile(w, 0.1)) for t in th], axis=0)]
        out[f"chpMaxMw_{zid}"] = [round(float(x), 1) for x in np.mean([weeks(t, np.max) for t in th], axis=0)]
    hy = [g(se[y], ["SE1", "SE2"], "hydro_reservoir") for y in (2023, 2024, 2025)]
    out["se12HydroP10"] = [round(float(x), 4) for x in np.mean([weeks(h, lambda w: np.quantile(w, 0.1)) / weeks(h, np.mean) for h in hy], axis=0)]
    out["se12HydroP90"] = [round(float(x), 4) for x in np.mean([weeks(h, lambda w: np.quantile(w, 0.9)) / weeks(h, np.mean) for h in hy], axis=0)]
    inst = {y: fr.entsoe.parse(fr.V4 / "raw" / "entsoe" / f"entsoe.A68.PL.{y}.xml").groupby("tech")["value"].sum() for y in (2023, 2024, 2025)}
    out["plInstalledMw"] = {y: {c: float(inst[y][c]) for c in PL_CLASSES} for y in inst}
    for c in PL_CLASSES:
        out[f"plFloorShare_{c}"] = [round(float(x), 4) for x in np.mean([weeks(np.array(pl[y]["gen"][c]), lambda w: np.quantile(w, 0.1)) / inst[y][c] for y in pl], axis=0)]
        out[f"plMaxShare_{c}"] = [round(float(x), 4) for x in np.mean([weeks(np.array(pl[y]["gen"][c]), np.max) / inst[y][c] for y in pl], axis=0)]
    pool = {z: [] for z in POOL}
    for y in (2023, 2024, 2025):
        idx = pd.date_range(f"{y}-01-01", f"{y + 1}-01-01", freq="h", inclusive="left")
        for z in POOL:
            if z in se[y]["price"]:
                pool[z] += se[y]["price"][z]
            else:
                pool[z] += [round(float(x), 3) for x in fr.v4_series("A44", z, y).reindex(idx).interpolate(limit=6, limit_direction="both")]
    out["pool"] = pool
    return out


if __name__ == "__main__":
    dest = Path(sys.argv[1])
    rec = record_patterns(dest)
    (dest / "nb2035_record.json").write_text(json.dumps(rec))
    cf = {n: {"wind_onshore": pecd("Wind_Onshore", n), "wind_offshore": pecd("Wind_Offshore", n), "solar": pecd("LFSolarPV", n)} for n in NODES}
    shape = {n: fp.demand_shape(n) for n in NODES}
    for cy in CYS:
        t = json.loads((dest / f"tyndp_SEPL_DE2035_cy{cy}.json").read_text())
        b = t["block"]
        se12 = np.array(b["SE01"]["Reservoir"]) + np.array(b["SE02"]["Reservoir"])
        out = {"cy": cy, "hours": H,
               "cf": {n: {k: [round(float(x), 4) for x in v[cy]] for k, v in cf[n].items()} for n in NODES},
               "demandShape": {n: [round(float(x), 5) for x in shape[n][cy]] for n in NODES},
               "se12HydroWeeklyMwh": [round(float(x)) for x in weeks(np.array(fp.fill8760(list(se12))), np.sum)],
               "hydroGiven": {n: fp.fill8760([round(x, 1) for x in b[n]["Reservoir"]]) for n in ("SE03", "SE04")},
               "tyndpPrice": {n: fp.fill8760(v) for n, v in t["price"].items()},
               "yearly": t["yearly"]}
        (dest / f"nb2035_cy{cy}.json").write_text(json.dumps(out))
        print(f"CY{cy}: onshore CF " + ", ".join(f"{n} {np.mean(cf[n]['wind_onshore'][cy]):.3f}" for n in NODES)
              + f"; SE12 hydro {se12.sum() / 1e6:.1f} TWh, SE3/SE4 {sum(b['SE03']['Reservoir']) / 1e6:.1f}/{sum(b['SE04']['Reservoir']) / 1e6:.1f}"
              + "; TYNDP price " + ", ".join(f"{n} {np.mean(v):.1f}" for n, v in out["tyndpPrice"].items()))
    print(f"record: SE3 nuclear weekly {min(rec['seNuclearWeekly']):.2f}–{max(rec['seNuclearWeekly']):.2f}; CHP max mean SE12/SE3/SE4 "
          + "/".join(f"{np.mean(rec[f'chpMaxMw_{z}']):.0f}" for z in ("SE12", "SE3", "SE4")) + " MW; PL max share "
          + ", ".join(f"{c} {np.mean(rec[f'plMaxShare_{c}']):.2f}" for c in PL_CLASSES) + "; pool means "
          + ", ".join(f"{z} {np.mean(v):.1f}" for z, v in rec["pool"].items()))
