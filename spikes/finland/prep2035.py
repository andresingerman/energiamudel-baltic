# Phase 3 inputs of the research on Finland (docs/research/2026-10-11_finland_2035.md §3): what a 2035 case
# takes beside its own capacities and demand, per climate year, on v5's 8 760-hour layout.
# - TYNDP 2024 PECD 3.1 capacity factors of FI00 (onshore, offshore, solar), 2035 as the mean of the
#   2030 and 2040 editions; TYNDP 2024 National Trends 2030 demand profile of FI00 (its shape only);
#   PEMMDB hydro inflows of FI00, all categories summed per week (MWh), 2035 as the mean of 2030 and 2040.
# - TYNDP DE 2035's SE01 and SE03 hourly marginal cost (tyndp.py's files), filled to 8 760 hours as the
#   year files fill TYNDP's 8 736 (the last day copied from a week before).
# - From the record (prep.py's files, 2024–2025): per week of the year, nuclear availability as a share of
#   the year's maximum, the thermal floor (10th-percentile hour) and maximum, hydro's 10th and 90th
#   percentile hours against the week's mean; and SE1's and SE3's hourly prices of 2023–2025, the shape
#   pool of method C.
# Usage: .venv/bin/python spikes/finland/prep2035.py DATA_DIR
import io
import json
import re
import sys
import zipfile
from pathlib import Path

import numpy as np
import openpyxl
import pandas as pd

from db.build import _daily_weeks

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw" / "tyndp2024"
CYS = (1995, 2008, 2009)
H = 8760
THERMAL = ["biomass", "peat", "hard_coal", "gas", "oil", "other", "waste"]


def pecd(tech: str, node: str = "FI00") -> dict[int, np.ndarray]:
    out = {cy: np.zeros(H) for cy in CYS}
    with zipfile.ZipFile(RAW / "tyndp2024.PECD.zip") as z:
        for ty in (2030, 2040):
            name = next(n for n in z.namelist() if n.startswith(f"PECD/{ty}/PECD_{tech}_{ty}_{node}_"))
            df = pd.read_csv(io.BytesIO(z.read(name)), skiprows=10)
            cols = {int(float(c)): c for c in df.columns if c not in ("Date", "Hour")}
            for cy in CYS:
                out[cy] += df[cols[cy]].to_numpy()[:H] / 2
    return out


def demand_shape(node: str = "FI00") -> dict[int, np.ndarray]:
    member = "Demand Profiles/NT/Electricity demand profiles/2030_National Trends.xlsx"
    with zipfile.ZipFile(RAW / "tyndp2024.Demand-Profiles.zip") as z:
        wb = openpyxl.load_workbook(io.BytesIO(z.read(member)), read_only=True)
    rows = list(wb[node].iter_rows(min_row=8, values_only=True))
    hdr = rows[0]
    cols = {int(v): j for j, v in enumerate(hdr) if isinstance(v, (int, float))}
    data = [r for r in rows[1:] if r and isinstance(r[3], (int, float))]
    out = {}
    for cy in CYS:
        v = np.array([float(r[cols[cy]]) for r in data])[:H]
        out[cy] = v / v.mean()
    return out


def inflow() -> dict[int, np.ndarray]:
    """Weekly hydro inflow (MWh) of FI00: every category's inflow energy summed per layout week."""
    acc = {cy: np.zeros(53) for cy in CYS}
    pat = re.compile(r"Hydro Inflows/(\d{4})/PEMMDB_FI00_Hydro_Inflows_\d{4}\.xlsx$")
    with zipfile.ZipFile(RAW / "tyndp2024.Hydro-Inflows.zip") as z:
        for name in z.namelist():
            m = pat.match(name)
            if not m or int(m[1]) not in (2030, 2040):
                continue
            x = pd.ExcelFile(io.BytesIO(z.read(name)))
            for sheet in x.sheet_names:
                if not sheet.endswith("Year Dependent"):
                    continue
                yd = x.parse(sheet, header=None)
                if yd.shape[0] < 3:
                    continue
                cys = [int(float(c)) for c in yd.iloc[1, 3:].tolist() if pd.notna(c)]
                body = yd.iloc[2:, :3 + len(cys)].copy()
                body.columns = ["variable_name", "variable", "period"] + cys
                body = body[body["variable"].notna() & body["variable"].astype(str).str.contains("INFLOW")]
                if body.empty:
                    continue
                long = body.melt(id_vars=["variable", "period"], var_name="climate_year", value_name="value")
                long["value"] = pd.to_numeric(long["value"], errors="coerce")
                long["period"] = pd.to_numeric(long["period"], errors="coerce")
                long = long.dropna(subset=["value", "period"])
                daily = sheet.startswith(("Run of River", "Pondage"))
                if daily:
                    long = _daily_weeks(long)
                else:
                    long["week"] = long["period"]
                for cy in CYS:
                    w = long[long["climate_year"] == cy].groupby("week")["value"].sum()
                    for wk, gwh in w.items():
                        if 1 <= int(wk) <= 53:
                            acc[cy][int(wk) - 1] += gwh * 1000 / 2
    return acc


def record_patterns(dirpath: Path) -> dict:
    """Nuclear and hydro from 2024–2025; thermal from 2025 alone, the first year ENTSO-E reports all of it
    (prep.py's record falls short by up to 600 MW a month before June 2024)."""
    nuc, lo, hi, hp10, hp90 = [], [], [], [], []
    pool = {"SE1": [], "SE3": []}
    thermal_twh = None
    for y in (2023, 2024, 2025):
        d = json.loads((dirpath / f"record_{y}.json").read_text())
        for z in pool:
            pool[z] += d["price"][z]
        if y == 2023:
            continue
        g = {k: np.array(v) for k, v in d["gen"].items()}
        th = sum(g.get(t, 0) for t in THERMAL)
        n = len(th)
        wk = np.minimum(np.arange(n) // 168, 52)
        f = pd.DataFrame({"wk": wk, "nuc": g["nuclear"], "th": th, "hy": g["hydro_ror"]})
        gr = f.groupby("wk")
        nuc.append((gr["nuc"].mean() / g["nuclear"].max()).to_numpy())
        hp10.append((gr["hy"].quantile(0.1) / gr["hy"].mean()).to_numpy())
        hp90.append((gr["hy"].quantile(0.9) / gr["hy"].mean()).to_numpy())
        if y == 2025:
            lo.append(gr["th"].quantile(0.1).to_numpy())
            hi.append(gr["th"].max().to_numpy())
            thermal_twh = float(th.sum() / 1e6)
    avg = lambda a: [round(float(x), 4) for x in np.mean(a, axis=0)]
    return {"nuclearWeekly": avg(nuc), "thermalFloorWeekly": avg(lo), "thermalMaxWeekly": avg(hi),
            "thermalTwh": round(thermal_twh, 3), "hydroP10Ratio": avg(hp10), "hydroP90Ratio": avg(hp90),
            "pool": {z: [round(x, 3) for x in v] for z, v in pool.items()}}


def fill8760(a: list[float]) -> list[float]:
    a = list(a[:H])
    while len(a) < H:
        a.append(a[len(a) - 168])
    return a


if __name__ == "__main__":
    dest = Path(sys.argv[1])
    on, off, pv = pecd("Wind_Onshore"), pecd("Wind_Offshore"), pecd("LFSolarPV")
    shape, hyd = demand_shape(), inflow()
    rec = record_patterns(dest)
    (dest / "fi2035_record.json").write_text(json.dumps(rec))
    for cy in CYS:
        t = json.loads((dest / f"tyndp_DE2035_cy{cy}.json").read_text())
        out = {"cy": cy, "hours": H,
               "cf": {"wind_onshore": [round(float(x), 4) for x in on[cy]],
                      "wind_offshore": [round(float(x), 4) for x in off[cy]],
                      "solar": [round(float(x), 4) for x in pv[cy]]},
               "demandShape": [round(float(x), 5) for x in shape[cy]],
               "hydroWeeklyMwh": [round(float(x)) for x in hyd[cy]],
               "tyndpPrice": {z: fill8760(t["price"][z]) for z in ("SE1", "SE3", "NO4", "EE")}}
        (dest / f"fi2035_cy{cy}.json").write_text(json.dumps(out))
        print(f"CY{cy}: onshore CF {on[cy].mean():.3f}, offshore {off[cy].mean():.3f}, solar {pv[cy].mean():.3f}; "
              f"hydro inflow {hyd[cy].sum() / 1e6:.1f} TWh; TYNDP DE 2035 SE1 {np.mean(t['price']['SE1']):.1f}, SE3 {np.mean(t['price']['SE3']):.1f}")
    print(f"record 2024–25: nuclear weekly {min(rec['nuclearWeekly']):.2f}–{max(rec['nuclearWeekly']):.2f}; thermal floor mean "
          f"{np.mean(rec['thermalFloorWeekly']):.0f} MW, max mean {np.mean(rec['thermalMaxWeekly']):.0f} MW; SE1/SE3 pool means "
          f"{np.mean(rec['pool']['SE1']):.1f}/{np.mean(rec['pool']['SE3']):.1f}")
