# How often each neighbour is cut off from its market, hour by hour, 2020-01 … 2026-08, from v4's cache
# (D-002: read-only, each file checked against its v4 lineage record) — docs/research/
# 2026-10-17_curve_slopes.md §4 A. A zone is with its market in an hour when its price equals a named
# neighbour's within 0.01 €/MWh (hourly averages of the 15-minute prices from October 2025).
# Usage: .venv/bin/python spikes/nordpool-curves/coupling.py
import importlib.util
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
_spec = importlib.util.spec_from_file_location("fiprep", ROOT / "spikes" / "finland" / "prep.py")
fiprep = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fiprep)

ZONES = ("FI", "SE1", "SE3", "SE4", "EE", "LV", "LT", "PL", "DE", "CZ", "SK")
TOL = 0.01
AURORA = pd.Timestamp("2025-11-13")    # the second Aurora Line: SE1–FI 1 900 MW each way
END = pd.Timestamp("2026-09-01")       # v4's cache ends with August 2026


def prices() -> pd.DataFrame:
    cols = {}
    for z in ZONES:
        s = pd.concat([fiprep.v4_series("A44", z, y, missing_ok=True) for y in range(2020, 2027)])
        cols[z] = s[~s.index.duplicated()]
    df = pd.DataFrame(cols)
    df = df[(df.index >= "2020-01-01") & (df.index < END)]
    # every month whole: a month short of hours is an error, not a gap to step over
    n = df.notna().all(axis=1).groupby(df.index.to_period("M")).sum()
    full = pd.Series(df.index.to_period("M")).value_counts().sort_index()
    short = n[n < 0.98 * full.reindex(n.index)]
    if len(short):
        raise ValueError(f"months short of hours: {dict(short)}")
    return df.dropna()


df = prices()
eq = lambda a, b: (df[a] - df[b]).abs() < TOL  # noqa: E731
LINKS = {
    "FI with SE1 or SE3": eq("FI", "SE1") | eq("FI", "SE3"),
    "SE4 with SE3": eq("SE4", "SE3"),
    "PL with DE, CZ, SK, LT or SE4": eq("PL", "DE") | eq("PL", "CZ") | eq("PL", "SK") | eq("PL", "LT")
    | eq("PL", "SE4"),
    "EE with FI": eq("EE", "FI"),
    "EE with LV": eq("EE", "LV"),
    "LV with LT": eq("LV", "LT"),
    "LT with SE4": eq("LT", "SE4"),
    "LT with PL": eq("LT", "PL"),
}
print(f"{len(df)} hours, {df.index[0]} … {df.index[-1]} UTC")

years = df.index.year
print("\nExact equality (the test that works before flow-based):\n\n| Coupled, share of hours | " + " | ".join(str(y) for y in sorted(set(years))) +
      f" | since {AURORA.date()} |")
print("|---|" + "---|" * (len(set(years)) + 1))
since = df.index >= AURORA
for name, m in LINKS.items():
    cells = [f"{m[years == y].mean():.0%}" for y in sorted(set(years))]
    print(f"| {name} | " + " | ".join(cells) + f" | {m[since].mean():.0%} |")

d = df[since]

# Under the Nordic flow-based market (from 2024-10-29) neighbouring prices part by a little in most
# hours, the domain binding somewhere: exact equality stops telling coupled hours from cut-off ones
# (2024's 57 % falls to 2025's 12 % for Finland). Classes by the gap instead: within 2 €/MWh, 2–10,
# 10 and more.
def classes(gap: pd.Series) -> str:
    return " / ".join(f"{m.mean():.0%}" for m in (gap < 2, (gap >= 2) & (gap < 10), gap >= 10))


fi_gap = np.minimum((d.FI - d.SE1).abs(), (d.FI - d.SE3).abs())
se4_gap = (d.SE4 - d.SE3).abs()
dearer = d.FI - d[["SE1", "SE3"]].max(axis=1)
print(f"\nFinland dearer than both SE1 and SE3 by 10 €/MWh or more: {(dearer >= 10).mean():.0%} of the hours "
      f"since {AURORA.date()}, by median {dearer[dearer >= 10].median():.1f} €/MWh [P90 "
      f"{dearer[dearer >= 10].quantile(.9):.1f}] — the most an SMR's extra export can lower it before "
      f"Sweden takes the rest")
print(f"\nSince {AURORA.date()}, the gap within 2 / 2–10 / 10 and more €/MWh: Finland to the nearer of SE1 "
      f"and SE3 {classes(fi_gap)}; SE4 to SE3 {classes(se4_gap)}")
for zone, gap in (("Finland", fi_gap), ("SE4", se4_gap)):
    own = d.FI if zone == "Finland" else d.SE4
    print(f"\n| {zone}'s price, since {AURORA.date()} | hours | gap < 2 | 2–10 | ≥ 10 | dearer by ≥ 10 |")
    print("|---|---|---|---|---|---|")
    mkt = d[["SE1", "SE3"]].max(axis=1) if zone == "Finland" else d.SE3
    for a_, b_ in ((-np.inf, 20), (20, 50), (50, 100), (100, np.inf)):
        m = (own >= a_) & (own < b_)
        name = (f"below {b_:g}" if a_ == -np.inf else f"{a_:g} and above" if b_ == np.inf
                else f"{a_:g}–{b_:g}")
        print(f"| {name} €/MWh | {m.sum()} | {classes(gap[m]).replace(' / ', ' | ')} | "
              f"{(own - mkt >= 10)[m].mean():.0%} |")

# Poland under Core flow-based: its allocation constraint caps its net position; when it binds,
# Poland's price parts from the Core price by the constraint's shadow price (D-076, v5's JAO data)
import duckdb  # noqa: E402

con = duckdb.connect(str(ROOT / "data" / "energiamudel.duckdb"), read_only=True)
sp = con.execute("SELECT ts, value FROM jao_series WHERE endpoint='shadowPrices' AND field='spread_PL' "
                 "AND ts >= ? AND ts < ?", [AURORA.to_pydatetime(), END.to_pydatetime()]).df()
print(f"\nPoland's allocation constraint binding (|spread| > 0.01 €/MWh), since {AURORA.date()}: "
      f"{(sp.value.abs() > 0.01).mean():.0%} of {len(sp)} hours; spread median "
      f"{sp.value[sp.value.abs() > 0.01].abs().median():.1f} €/MWh where it binds")

print("\n| Month | FI with Sweden | SE4 with SE3 | PL with a neighbour | EE with FI | EE with LV |")
print("|---|---|---|---|---|---|")
for per in sorted(set(d.index.to_period("M"))):
    sel = d.index.to_period("M") == per
    print(f"| {per} | " + " | ".join(f"{LINKS[k][since][sel].mean():.0%}" for k in
          ("FI with SE1 or SE3", "SE4 with SE3", "PL with DE, CZ, SK, LT or SE4", "EE with FI",
           "EE with LV")) + " |")

# the gap classes by the zone's price band, for slopes.py's band of the effective slope
import json  # noqa: E402

BANDS = ((-1e9, 20), (20, 50), (50, 100), (100, 1e9))
out = {}
for zone, own, gap in (("FI", d.FI, fi_gap), ("SE4", d.SE4, se4_gap)):
    out[zone] = [{"lo": a_, "hi": b_, "hours": int(((own >= a_) & (own < b_)).sum()),
                  "shares": [float(m[(own >= a_) & (own < b_)].mean()) for m in
                             (gap < 2, (gap >= 2) & (gap < 10), gap >= 10)]} for a_, b_ in BANDS]
path = ROOT / "data" / "derived" / "curves" / "coupling.json"
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps({"since": str(AURORA.date()), "until": str(END.date()), "zones": out}, indent=1))
print(f"\nwrote {path.relative_to(ROOT)}")
