# How far a cluster's day-ahead price moves per GW of net demand, read off Nord Pool's aggregated bid
# curves (D-108; docs/research/2026-10-17_curve_slopes.md, §0 and §4 for the method). Prints statistics
# only: the curves themselves are never shown or committed.
# - §1: each cluster's slope with its borders held fixed, by price band and by hour.
# - §4 B: the move by direction (a Baltic surplus lowers the neighbour's price, a Baltic shortage lifts
#   it); Finland with all Sweden open (the FI and SE curves added), a lower bound beside Finland's own;
#   and a band for R-BND-6's slope, each MTU weighted by how often Finland was cut off from Sweden at its
#   price since the second Aurora Line (coupling.py's data/derived/curves/coupling.json).
# - §4 C: the demand each curve withdraws, and the supply it adds, above the clearing price.
# Usage: .venv/bin/python spikes/nordpool-curves/slopes.py [data/raw/nordpool]
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from pipeline.sources.nordpool import parse  # noqa: E402

RAW = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data" / "raw" / "nordpool"
SHIFTS = (300, 500, 1000)   # MW: one SMR unit, about NordBalt or EstLink 2, EstLink 1 + 2
FLOOR, CAP = -600.0, 4000.0
CLUSTERS = ("FI", "SE", "PL", "BALTIC")
BANDS = ((-np.inf, 20), (20, 50), (50, 100), (100, np.inf))


def supply(p, q, x):
    """MW offered at prices up to x (p, q rising): linear between points; a volume offered at one
    price counts in full at that price."""
    i = np.clip(np.searchsorted(p, x, side="right") - 1, 0, len(p) - 1)
    j = np.minimum(i + 1, len(p) - 1)
    gap = p[j] - p[i]
    w = np.where(gap > 0, np.clip((x - p[i]) / np.where(gap > 0, gap, 1), 0, 1), 0)
    return q[i] + w * (q[j] - q[i])


def demand(p, q, x):
    """MW bid at prices of x and above (p rising, q falling): linear between points; a volume bid at
    one price counts in full at that price."""
    k = np.clip(np.searchsorted(p, x, side="left"), 0, len(p) - 1)
    h = np.maximum(k - 1, 0)
    gap = p[k] - p[h]
    w = np.where(gap > 0, np.clip((p[k] - x) / np.where(gap > 0, gap, 1), 0, 1), 0)
    return q[k] + w * (q[h] - q[k])


def excess(parts, x):
    """Supply less demand over one or more clusters' curves (each a (sp, sq, dp, dq))."""
    return sum(supply(sp, sq, x) - demand(dp, dq, x) for sp, sq, dp, dq in parts)


def clearing(parts, shift):
    """The lowest price at which supply less demand reaches each shift (MW): bisection to 1e-8."""
    lo, hi = np.full(len(shift), FLOOR), np.full(len(shift), CAP)
    for _ in range(40):
        mid = (lo + hi) / 2
        ok = excess(parts, mid) >= shift
        hi, lo = np.where(ok, mid, hi), np.where(ok, lo, mid)
    return hi


def self_check() -> None:
    """Hand-made MTUs. Supply rising from 0 MW at 0 €/MWh to 1 000 MW at 100, a 500 MW block at 100,
    then 100 MW more by 200; demand flat at 600 MW: clears at 60, +300 MW at 90, +500 MW in the
    block at 100, −300 MW at 30, +950 MW at 150, +1 100 MW nowhere (the cap). A 300 MW demand block
    at 50 over 500 MW of inelastic demand sets the price at 50. Two copies of the first MTU together
    clear where one does, and move half as far for the same shift."""
    sp, sq = np.array([0.0, 100.0, 100.0, 200.0]), np.array([0.0, 1000.0, 1500.0, 1600.0])
    one = (sp, sq, np.array([FLOOR, CAP]), np.array([600.0, 600.0]))
    p = clearing([one], np.array([0.0, 300.0, 500.0, -300.0, 950.0, 1100.0]))
    assert np.allclose(p, [60.0, 90.0, 100.0, 30.0, 150.0, CAP], atol=1e-6), p
    blk = (sp, sq, np.array([FLOOR, 50.0, 50.0, CAP]), np.array([900.0, 800.0, 500.0, 500.0]))
    assert np.isclose(clearing([blk], np.array([0.0]))[0], 50.0, atol=1e-6)
    assert np.allclose(clearing([one, one], np.array([0.0, 600.0])), [60.0, 90.0], atol=1e-6)


def load() -> dict:
    """{cluster: {start: (sp, sq, dp, dq)}}: each MTU's supply (price, MW rising) and demand (price
    rising, MW falling)."""
    out: dict = {}
    for path in sorted(RAW.glob("nordpool.abc.*.gz")):
        df = parse(path)
        for start, g in df.groupby("start"):
            s, d = (g[g.side == k].sort_values("step") for k in ("supply", "demand"))
            sp, sq = s.price.to_numpy(), s.mw.to_numpy()
            dp, dq = d.price.to_numpy()[::-1], d.mw.to_numpy()[::-1]
            assert (np.diff(sp) >= 0).all() and (np.diff(sq) >= 0).all(), (path.name, start)
            assert (np.diff(dp) >= 0).all() and (np.diff(dq) <= 0).all(), (path.name, start)
            out.setdefault(g.cluster.iloc[0], {})[start] = (sp, sq, dp, dq)
    return out


def measure(name: str, start, parts) -> dict:
    x = np.array([0.0] + [v for a in SHIFTS for v in (a, -a)])
    p = clearing(parts, x)
    row = {"cluster": name, "start": start, "price": p[0],
           "edge": bool(((p >= CAP - 1e-6) | (p <= FLOOR + 1e-6)).any())}
    for i, a in enumerate(SHIFTS):
        row[f"up{a}"] = (p[1 + 2 * i] - p[0]) / a * 1000
        row[f"down{a}"] = (p[0] - p[2 + 2 * i]) / a * 1000
        row[f"s{a}"] = (p[1 + 2 * i] - p[2 + 2 * i]) / (2 * a) * 1000
    if len(parts) == 1:                      # §4 C: what the curve gives above the clearing price
        sp, sq, dp, dq = parts[0]
        up = np.array([p[0], min(p[0] + 100, CAP), min(p[0] + 500, CAP), CAP])
        s_, d_ = supply(sp, sq, up), demand(dp, dq, up)
        row.update(sup100=s_[1] - s_[0], sup500=s_[2] - s_[0], dem100=d_[0] - d_[1],
                   dem500=d_[0] - d_[2], demcap=d_[0] - d_[3])
    return row


def q(s: pd.Series) -> str:
    return f"{s.median():.1f} [{s.quantile(0.1):.1f}–{s.quantile(0.9):.1f}]"


def band_name(lo, hi) -> str:
    return f"below {hi:g}" if lo == -np.inf else f"{lo:g} and above" if hi == np.inf else f"{lo:g}–{hi:g}"


self_check()
curves = load()
rows = [measure(c, t, [parts]) for c in CLUSTERS for t, parts in curves[c].items()]
rows += [measure("FI+SE", t, [curves["FI"][t], curves["SE"][t]])
         for t in curves["FI"] if t in curves["SE"]]
r = pd.DataFrame(rows)
r["hour"] = (r.start + pd.Timedelta(hours=3)).dt.hour        # EEST, every day here before 25 October
n = r[r.cluster.isin(CLUSTERS)].groupby("cluster").size().to_dict()
print(f"{len(r[r.cluster.isin(CLUSTERS)])} MTUs, {n}, delivery days "
      f"{(r.start.min() + pd.Timedelta(hours=2)).date()} … {(r.start.max() + pd.Timedelta(hours=2)).date()}")

print("\n§1 | Cluster | clearing price, median [P10–P90] | s ±300 MW | s ±500 MW | s ±1 000 MW "
      "| up / down ±500 (median) | MTUs at the cap or floor |")
print("|---|---|---|---|---|---|---|")
for c in CLUSTERS + ("FI+SE",):
    g = r[r.cluster == c]
    print(f"| {c} | {q(g.price)} | {q(g.s300)} | {q(g.s500)} | {q(g.s1000)} | "
          f"{g.up500.median():.1f} / {g.down500.median():.1f} | {int(g.edge.sum())} |")

print("\n§1 | Clearing price | " + " | ".join(f"{c}: s ±500 (MTUs)" for c in CLUSTERS) + " |")
print("|---|" + "---|" * len(CLUSTERS))
for lo, hi in BANDS:
    cells = []
    for c in CLUSTERS:
        g = r[(r.cluster == c) & (r.price >= lo) & (r.price < hi)]
        cells.append(f"{g.s500.median():.1f} ({len(g)})" if len(g) else "–")
    print(f"| {band_name(lo, hi)} €/MWh | " + " | ".join(cells) + " |")

print("\n§1 | Hours (EEST) | " + " | ".join(f"{c}: price / s ±500" for c in CLUSTERS) + " |")
print("|---|" + "---|" * len(CLUSTERS))
for h0 in range(0, 24, 3):
    cells = []
    for c in CLUSTERS:
        g = r[(r.cluster == c) & (r.hour >= h0) & (r.hour < h0 + 3)]
        cells.append(f"{g.price.median():.0f} / {g.s500.median():.1f}")
    print(f"| {h0:02d}–{h0 + 3:02d} | " + " | ".join(cells) + " |")

# §4 B — by direction: down is the fall when the cluster's net demand drops (a Baltic surplus sent to it),
# up the rise when it grows (a Baltic shortage drawing on it)
print("\n§4B | Cluster | down ±300 | down ±500 | down ±1 000 | up ±300 | up ±500 | up ±1 000 |")
print("|---|---|---|---|---|---|---|")
for c in CLUSTERS + ("FI+SE",):
    g = r[r.cluster == c]
    print(f"| {c} | " + " | ".join(q(g[f"{k}{a}"]) for k in ("down", "up") for a in SHIFTS) + " |")

fi = r[r.cluster == "FI"].set_index("start")
fs = r[r.cluster == "FI+SE"].set_index("start").reindex(fi.index)
print("\n§4B | Finland's clearing price | MTUs | FI alone: down / up ±500 | FI with all Sweden: "
      "down / up ±500 |")
print("|---|---|---|---|")
for lo, hi in BANDS:
    m = (fi.price >= lo) & (fi.price < hi)
    print(f"| {band_name(lo, hi)} €/MWh | {int(m.sum())} | {fi.down500[m].median():.1f} / "
          f"{fi.up500[m].median():.1f} | {fs.down500[m].median():.1f} / {fs.up500[m].median():.1f} |")

# the band for R-BND-6: in each MTU, Sweden open (gap < 2 €/MWh), half open (2–10) or shut (10 and
# more) with the shares seen at Finland's price since the second Aurora Line; open takes FI with all
# Sweden, shut takes Finland alone, half open either (the two ends of the band)
cj = json.loads((ROOT / "data" / "derived" / "curves" / "coupling.json").read_text())
share = np.zeros((len(fi), 3))
for b in cj["zones"]["FI"]:
    m = ((fi.price >= b["lo"]) & (fi.price < b["hi"])).to_numpy()
    share[m] = b["shares"]
print(f"\n§4B R-BND-6's slope for Finland, €/MWh per GW (±500 MW; shares {cj['since']} … {cj['until']}): "
      "mean over the MTUs [median]")
for k in ("down500", "up500", "s500"):
    own, both = fi[k].to_numpy(), fs[k].to_numpy()
    lo_ = share[:, 0] * both + share[:, 1] * both + share[:, 2] * own
    hi_ = share[:, 0] * both + share[:, 1] * own + share[:, 2] * own
    print(f"  {k}: {lo_.mean():.1f} [{np.median(lo_):.1f}] … {hi_.mean():.1f} [{np.median(hi_):.1f}]; "
          f"Sweden open in every MTU {both.mean():.1f} [{np.median(both):.1f}]; Finland alone in every "
          f"MTU {own.mean():.1f} [{np.median(own):.1f}]")

# §4 C — what each curve gives above its clearing price, MW
print("\n§4C | Cluster | supply added to +100 €/MWh | to +500 | demand withdrawn to +100 | to +500 | "
      "to the cap |")
print("|---|---|---|---|---|---|")
for c in CLUSTERS:
    g = r[r.cluster == c]
    print(f"| {c} | " + " | ".join(q(g[k]) for k in ("sup100", "sup500", "dem100", "dem500", "demcap"))
          + " |")
