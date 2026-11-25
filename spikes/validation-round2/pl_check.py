"""The price at the Polish end of LitPol Link under Poland's allocation constraint (DECISIONS
D-076): in the hours the link's day-ahead schedule lies inside its offered capacity, how often
Lithuania's price is within 1 EUR/MWh of Poland's, and how often of the price Poland's
interconnectors clear at (Poland's price plus `spread_PL`, `jao_series`); and at the link's
limits, how often Lithuania's price lies on the right side of each.

Run from the repository root:  .venv/bin/python spikes/validation-round2/pl_check.py
Reads the database (prices, schedules, capacities, the spread) — observed prices of the core
zones are compared here, not fed to the engine.
"""

from __future__ import annotations

import duckdb
import numpy as np
import pandas as pd

# to 2025-09: the 15-minute market's hourly means are not compared (D-045's context)
PERIODS = (("2022, from 9 June", "2022-06-09", "2023-01-01"), ("2023", "2023-01-01", "2024-01-01"),
           ("2024", "2024-01-01", "2025-01-01"), ("2025, to September", "2025-01-01", "2025-10-01"),
           ("2025-10 to 2026-08 (hourly means)", "2025-10-01", "2026-09-01"))
PRICE = "select ts, eur_mwh from price where zone=? and ts>=? and ts<? order by ts"
FLOW = ("select ts, mw from {} where border='LT-PL' and direction=? and ts>=? and ts<? "
        "order by ts")


def series(con, sql: str, args: list) -> pd.Series:
    d = con.execute(sql, args).df()
    return pd.Series(d.iloc[:, 1].to_numpy(dtype=float), index=pd.DatetimeIndex(d.iloc[:, 0]))


def main() -> None:
    con = duckdb.connect("data/energiamudel.duckdb", read_only=True)
    for label, lo, hi in PERIODS:
        a = [lo, hi]
        df = pd.DataFrame({
            "zone": series(con, PRICE, ["LT", *a]), "nb": series(con, PRICE, ["PL", *a]),
            "fwd": series(con, FLOW.format("scheduled_exchange"), ["fwd", *a]),
            "rev": series(con, FLOW.format("scheduled_exchange"), ["rev", *a]),
            "nf": series(con, FLOW.format("ntc"), ["fwd", *a]),
            "nr": series(con, FLOW.format("ntc"), ["rev", *a])}).dropna()
        sp = series(con, "select ts, value from jao_series where endpoint='shadowPrices' and "
                         "field='spread_PL' and ts>=? and ts<? order by ts", a)
        df = df[df.index.isin(sp.index)]
        df["sp"] = sp.reindex(df.index)
        net = df.rev - df.fwd                                      # import into Lithuania
        imp, exp = net >= df.nr - 5, -net >= df.nf - 5
        inside = ~imp & ~exp
        zp, zh = df.zone - df.nb, df.zone - df.nb - df.sp
        pc = lambda m: f"{100 * float(np.mean(m)):.0f} %"          # noqa: E731
        print(f"{label}: {len(df)} h; the spread: mean {df.sp.mean():+.1f} EUR/MWh, below -1 in "
              f"{pc(df.sp < -1)} of hours (the import limit), above +1 in {pc(df.sp > 1)}\n"
              f"  inside the capacity, {int(inside.sum())} h: LT within 1 of PL in "
              f"{pc(zp[inside].abs() < 1)} (mean distance {zp[inside].abs().mean():.1f}), of the "
              f"clearing price in {pc(zh[inside].abs() < 1)} ({zh[inside].abs().mean():.1f})\n"
              f"  at the import limit, {int(imp.sum())} h: LT not below PL in {pc(zp[imp] > -1)}, "
              f"not below the clearing price in {pc(zh[imp] > -1)}; at the export limit, "
              f"{int(exp.sum())} h: LT not above PL in {pc(zp[exp] < 1)}, the clearing price "
              f"{pc(zh[exp] < 1)}")


if __name__ == "__main__":
    main()
