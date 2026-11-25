"""Heat-driven CHP must-run from temperature (SPECIFICATION.md R-SUP-5; v4 model/chp_floor.py).

Run:  .venv/bin/python -m validate.chp_fit        (after `make db`)

For each zone and CHP-type technology the lower envelope of observed generation (ENTSO-E A75)
as a function of heating degree-hours:

    floor(T) = max(0, a + b · max(0, T_ref − T))        [MW]

The envelope is the 10th percentile of generation in 1 °C temperature bins (bins of at least
50 hours) over the fit years 2023–2024 (R-VAL-1); a and b come from a least-squares line through
the bins, both floored at 0, and T_ref is the candidate threshold whose floor leaves the share of
hours at or above it closest to 90 % — a true lower envelope. The result is a parameter per zone
and technology, not a replayed series, so it applies to any year's temperature (the weakness of
v3's calendar quantiles). Gas and biomass CHP in all three zones (R-SUP-5): Estonian biomass,
Latvian and Lithuanian gas and biomass; and Estonian oil shale, whose Balti plant is Narva's CHP
(D-022); Estonian gas is 13–110 MW of engines with no heat signal, and waste is given output in
observed years.

It prints the fit for comparison and writes nothing: the register's floors are D-042's, which
validate/fit.py writes, and this module wrote the same lineage ids and section until the review of
2026-10-18 found that running it would replace them.
"""

from __future__ import annotations

import duckdb
import numpy as np
import pandas as pd

from db import db_path

from . import fitted

SERIES = {"EE": ("biomass", "oil_shale"), "LV": ("gas", "biomass"), "LT": ("gas", "biomass")}
T_REF_GRID = (8.0, 10.0, 12.0, 15.0)   # candidate heating thresholds, °C
QUANTILE = 0.10
TARGET_SHARE = 1.0 - QUANTILE
MIN_HOURS = 50                          # per 1 °C bin


def fit_at(df: pd.DataFrame, t_ref: float) -> dict:
    """df: mw, temperature_c -> a, b and the share of hours at or above the floor."""
    d = df.dropna(subset=["mw", "temperature_c"]).copy()
    d["hdh"] = np.clip(t_ref - d["temperature_c"], 0, None)
    d["bin"] = np.floor(d["temperature_c"]).astype(int)
    q = d.groupby("bin").agg(n=("mw", "size"), p=("mw", lambda s: s.quantile(QUANTILE)),
                             hdh=("hdh", "mean"))
    q = q[q["n"] >= MIN_HOURS]
    b, a = np.polyfit(q["hdh"], q["p"], 1)
    a, b = max(float(a), 0.0), max(float(b), 0.0)
    floor = np.clip(a + b * d["hdh"], 0, None)
    below = np.clip(floor - d["mw"], 0, None)
    return {"t_ref_c": t_ref, "a_mw": round(a, 2), "b_mw_per_k": round(b, 3),
            "bins": int(len(q)), "hours": int(len(d)),
            "share_above_floor": round(float((d["mw"] >= floor).mean()), 4),
            "mean_mw_below_floor": round(float(below.mean()), 2)}


def fit(df: pd.DataFrame) -> dict:
    """The threshold whose floor is the best lower envelope; ties go to the lower threshold."""
    fits = [fit_at(df, t) for t in T_REF_GRID]
    return min(fits, key=lambda r: (abs(r["share_above_floor"] - TARGET_SHARE), r["t_ref_c"]))


def main() -> int:
    con = duckdb.connect(str(db_path()), read_only=True)
    years = ", ".join(str(y) for y in fitted.FIT_YEARS)
    for zone, techs in SERIES.items():
        w = con.execute(f"SELECT ts, temperature_c, lineage_id FROM weather WHERE zone=? AND "
                        f"year(ts) IN ({years})", [zone]).fetchdf()
        for tech in techs:
            g = con.execute(f"SELECT ts, mw, lineage_id FROM generation WHERE zone=? AND tech=? "
                            f"AND year(ts) IN ({years})", [zone, tech]).fetchdf()
            if g.empty:
                raise ValueError(f"{zone} {tech}: no generation in {fitted.FIT_YEARS}")
            res = fit(g[["ts", "mw"]].merge(w[["ts", "temperature_c"]], on="ts"))
            cold = res["a_mw"] + res["b_mw_per_k"] * (res["t_ref_c"] + 20)
            print(f"{zone} {tech:8s} T_ref {res['t_ref_c']:4.0f} °C  a {res['a_mw']:7.1f} MW  "
                  f"b {res['b_mw_per_k']:6.2f} MW/K  above {res['share_above_floor']:.3f}  "
                  f"floor at −20 °C {cold:.0f} MW")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
