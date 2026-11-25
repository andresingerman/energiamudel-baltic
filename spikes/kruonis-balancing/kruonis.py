"""Kruonis's recorded output against Lithuania's balancing activations (research, 2026-10-18).

The validation compares the engine's day-ahead Kruonis with ENTSO-E A75, which counts every MWh the
plant delivered, balancing included (methodology §7.3; docs/research/2026-10-11_dear_hours.md §9).
The Baltic Transparency Dashboard publishes Lithuania's activated balancing energy per 15 minutes
since 2025: aFRR, mFRR activated directly and on schedule, and special activations. In a quarter-hour
the plant's balancing output is at most the smaller of its output and the zone's upward activations;
its balancing pumping at most the smaller of its pumping and the downward ones. Summed, they bound
the balancing share of the record from above.

Run from the repository's root:
    .venv/bin/python spikes/kruonis-balancing/kruonis.py fetch   # 84 requests, no key
    .venv/bin/python spikes/kruonis-balancing/kruonis.py         # the tables; writes summary.json
The fetch goes to spikes/kruonis-balancing/cache/ (not committed), never to data/raw: the database
and the export do not read it. A75 and the prices are read from the project's cache and database.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import pandas as pd

HERE = Path(__file__).parent
CACHE = HERE / "cache"
REPORTS = ("activations_afrr", "normal_activations_da_mfrr", "normal_activations_sa_mfrr",
           "special_activations_total_mfrr")
MONTHS = [(y, m) for y in (2025, 2026) for m in range(1, 13) if (y, m) <= (2026, 9)]


def fetch() -> None:
    os.environ["ENERGIAMUDEL_RAW"] = str(CACHE / "raw")
    os.environ["ENERGIAMUDEL_LINEAGE"] = str(CACHE / "lineage")
    from pipeline.sources import btd
    for report in REPORTS:
        for y, m in MONTHS:
            btd.fetch(report, y, m)
            time.sleep(0.3)
        print(report, "cached", flush=True)


def activations() -> pd.DataFrame:
    """(ts, up, down): Lithuania's activated balancing energy, MWh per quarter-hour, every report."""
    rows = []
    for report in REPORTS:
        for y, m in MONTHS:
            d = json.loads((CACHE / "raw" / "btd" / f"btd.{report}.BALTIC.{y}-{m:02d}.json")
                           .read_text())["data"]
            cols = [(c.get("group_level_0"), c.get("label")) for c in d["columns"]]
            for t in d["timeseries"]:
                for (zone, way), v in zip(cols, t["values"], strict=True):
                    if zone == "Lithuania" and v is not None:
                        rows.append((t["from"], report, way, float(v)))
    a = pd.DataFrame(rows, columns=["ts", "report", "way", "mwh"])
    a["ts"] = pd.to_datetime(a["ts"], utc=True).dt.tz_localize(None)
    w = a.pivot_table(index="ts", columns="way", values="mwh", aggfunc="sum").fillna(0.0)
    return w.rename(columns={"Upward": "up", "Downward": "down"})[["up", "down"]]


def kruonis() -> pd.DataFrame:
    """(ts, gen, pump): the plant's A75 output and pumping, MWh per quarter-hour."""
    from pipeline.sources import entsoe, raw_dir
    parts = []
    for y, m in MONTHS:
        d = entsoe.parse(raw_dir(entsoe.RAW) / f"entsoe.A75.LT.{y}-{m:02d}.xml")
        d = d[d["tech"] == "hydro_ps"]
        if set(d["minutes"]) != {15}:
            raise RuntimeError(f"{y}-{m:02d}: A75 not quarter-hourly ({set(d['minutes'])})")
        parts.append(d.assign(kind=d["in_domain"].notna().map({True: "gen", False: "pump"}),
                              mwh=d["value"] / 4))
    k = pd.concat(parts).pivot_table(index="ts", columns="kind", values="mwh", aggfunc="sum")
    return k.fillna(0.0)[["gen", "pump"]]


def prices() -> pd.Series:
    import duckdb
    con = duckdb.connect(str(Path("data/energiamudel.duckdb")), read_only=True)
    p = con.execute("SELECT ts, eur_mwh FROM price WHERE zone = 'LT' AND ts >= '2025-01-01' AND "
                    "ts < '2026-10-01' ORDER BY ts").df()
    return p.set_index("ts")["eur_mwh"]


def main() -> None:
    k, a = kruonis(), activations()
    q = k.join(a, how="left").fillna(0.0)
    q["bal_gen"] = q[["gen", "up"]].min(axis=1)
    q["bal_pump"] = q[["pump", "down"]].min(axis=1)
    hour = q.index.floor("h")
    q["price"] = prices().reindex(hour).to_numpy()
    q["period"] = [f"{t.year}" if t.year == 2025 else "2026 Jan–Sep" for t in q.index]
    out = {}
    for period, g in q.groupby("period"):
        gen, pump = g["gen"].sum(), g["pump"].sum()
        row = {
            "gen_twh": gen / 1e6, "pump_twh": pump / 1e6,
            "lt_up_twh": g["up"].sum() / 1e6, "lt_down_twh": g["down"].sum() / 1e6,
            "bal_gen_bound_twh": g["bal_gen"].sum() / 1e6,
            "bal_pump_bound_twh": g["bal_pump"].sum() / 1e6,
            "gen_quarters": int((g["gen"] > 0.25).sum()),
            "gen_quarters_with_up": int(((g["gen"] > 0.25) & (g["up"] > 0)).sum()),
            # output in hours the day-ahead price gave no arbitrage: below the year's median
            "gen_below_median_price_twh": g.loc[g["price"] < g["price"].median(), "gen"].sum() / 1e6,
            "median_price": float(g["price"].median()),
        }
        row["da_gen_floor_twh"] = row["gen_twh"] - row["bal_gen_bound_twh"]
        out[period] = row
    by_month = q.assign(month=q.index.to_period("M").astype(str)).groupby("month")[
        ["gen", "bal_gen", "pump", "bal_pump", "up", "down"]].sum() / 1e3
    out["by_month_gwh"] = by_month.round(2).to_dict(orient="index")
    (HERE / "summary.json").write_text(json.dumps(out, indent=1))
    for period in ("2025", "2026 Jan–Sep"):
        r = out[period]
        print(f"{period}: output {r['gen_twh']:.3f} TWh, pumping {r['pump_twh']:.3f}; LT up "
              f"{r['lt_up_twh']:.3f}, down {r['lt_down_twh']:.3f}; balancing at most: output "
              f"{r['bal_gen_bound_twh']:.3f} ({r['bal_gen_bound_twh'] / r['gen_twh']:.0%}), pumping "
              f"{r['bal_pump_bound_twh']:.3f} ({r['bal_pump_bound_twh'] / r['pump_twh']:.0%}); "
              f"day-ahead output at least {r['da_gen_floor_twh']:.3f}; quarter-hours with output "
              f"{r['gen_quarters']}, with upward activation {r['gen_quarters_with_up']}; output below "
              f"the median price ({r['median_price']:.0f} €/MWh) {r['gen_below_median_price_twh']:.3f}")
    print(by_month.round(1).to_string())


if __name__ == "__main__":
    fetch() if sys.argv[1:] == ["fetch"] else main()
