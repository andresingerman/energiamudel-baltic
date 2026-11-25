"""Reads montecarlo.json and prints the tables of docs/research/2026-10-18_smr_robustness.md: the spread of the
prices, of the plant's effect and of the contract's cost over the samples, and what drives each (Spearman's rank
correlation, and the standardised regression coefficients' squares, which share out the variance a linear fit
explains when the inputs are independent, as a Latin hypercube draws them). Writes summary.json beside it.
`.venv/bin/python spikes/smr-robustness/analyse.py` from the repository's root."""
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
d = json.loads((HERE / (sys.argv[1] if len(sys.argv) > 1 else "montecarlo.json")).read_text())  # another run's file as the argument
S = d["samples"]
INPUTS = list(d["ranges"])
X = np.array([[s["input"][k] for k in INPUTS] for s in S])
Q = [5, 25, 50, 75, 95]


def col(path: str) -> np.ndarray:
    a, b = path.split(".")
    return np.array([s[a][b] for s in S], dtype=float)


def ranks(v: np.ndarray) -> np.ndarray:
    r = np.empty(len(v))
    r[np.argsort(v)] = np.arange(len(v))
    return r


def spearman(x: np.ndarray, y: np.ndarray) -> float:
    return float(np.corrcoef(ranks(x), ranks(y))[0, 1])


def src2(y: np.ndarray) -> tuple[dict, float]:
    """Squared standardised regression coefficients and the fit's R²."""
    Z = (X - X.mean(0)) / X.std(0)
    zy = (y - y.mean()) / y.std()
    beta, *_ = np.linalg.lstsq(np.c_[np.ones(len(zy)), Z], zy, rcond=None)
    fit = np.c_[np.ones(len(zy)), Z] @ beta
    r2 = 1 - ((zy - fit) ** 2).sum() / (zy ** 2).sum()
    return {k: float(beta[i + 1] ** 2) for i, k in enumerate(INPUTS)}, float(r2)


out: dict = {"n": len(S), "strike": d["strike"], "measures": {}}
measures = {
    "EE, Elering: gas": col("gas.EE"),
    "LV, Elering: gas": col("gas.LV"),
}
for n in (1, 2, 3):
    measures[f"EE, {n} SMR"] = col(f"smr{n}.EE")
    measures[f"EE effect, {n} SMR"] = col(f"smr{n}.EE") - col("gas.EE")
    measures[f"LV effect, {n} SMR"] = col(f"smr{n}.LV") - col("gas.LV")
    measures[f"capture, {n} SMR"] = col(f"smr{n}.capture")
    measures[f"CfD M€/yr, {n} SMR"] = col(f"smr{n}.cfdMeur")
for name, y in measures.items():
    w, r2 = src2(y)
    out["measures"][name] = {
        "pct": {str(q): float(np.percentile(y, q)) for q in Q},
        "min": float(y.min()), "max": float(y.max()), "mean": float(y.mean()),
        "spearman": {k: spearman(X[:, i], y) for i, k in enumerate(INPUTS)},
        "src2": w, "r2": r2,
    }
    m = out["measures"][name]
    print(f"{name:22s} p5 {m['pct']['5']:7.1f} p25 {m['pct']['25']:7.1f} p50 {m['pct']['50']:7.1f} p75 {m['pct']['75']:7.1f} p95 {m['pct']['95']:7.1f} "
          f"[{m['min']:.1f}, {m['max']:.1f}] | R² {r2:.2f} | " + " ".join(f"{k} {m['src2'][k]:.2f}/{m['spearman'][k]:+.2f}" for k in INPUTS))

# the shares the documents quote
eff2 = measures["EE effect, 2 SMR"]
for n in (1, 2, 3):
    e = measures[f"EE effect, {n} SMR"]
    c = measures[f"CfD M€/yr, {n} SMR"]
    out[f"shares_{n}"] = {"effect_below_-10": float((e < -10).mean()), "effect_below_-5": float((e < -5).mean()),
                          "cfd_costs_state": float((c > 0).mean()), "cfd_above_200": float((c > 200).mean())}
    print(f"{n} SMR: effect below −5 in {100 * (e < -5).mean():.0f} %, below −10 in {100 * (e < -10).mean():.0f} %; "
          f"the contract costs the state in {100 * (c > 0).mean():.0f} % (above 200 M€ in {100 * (c > 200).mean():.0f} %)")
# the effect per €/MWh of the price it acts on: does the plant take a share of the price?
g = measures["EE, Elering: gas"]
print(f"2 SMR effect against the gas scenario's price: slope {np.polyfit(g, eff2, 1)[0]:.3f}, corr {np.corrcoef(g, eff2)[0, 1]:.2f}")
(HERE / (f"summary_{Path(sys.argv[1]).stem}.json" if len(sys.argv) > 1 else "summary.json")).write_text(json.dumps(out, indent=1) + "\n")
