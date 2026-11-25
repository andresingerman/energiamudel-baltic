"""Which capacity the day-ahead market stops at on the two AC borders since the Baltic balancing
capacity market (DECISIONS D-077): per border, direction and period, the hours in which the
record's day-ahead schedule sits within 1 MW of the published capacity (A31), of A31 less the
aFRR allocation, less the mFRR allocation and less both — all hours, and the hours in which the
receiving zone's price is the higher (the border congested) — and the hours it exceeds each.

Run from the repository root:  .venv/bin/python spikes/validation-round2/reserve_check.py
Reads the database (schedules, capacities, allocations, prices) — the record is compared here,
not fed to the engine.
"""

from __future__ import annotations

import duckdb
import numpy as np
import pandas as pd

PERIODS = (("2025-02-05 to 2025-09", "2025-02-05", "2025-10-01"),
           ("2025-10 to 2025-12", "2025-10-01", "2026-01-01"),
           ("2026-01 to 2026-08", "2026-01-01", "2026-09-01"))
SERIES = "select ts, mw from {} where border=? and direction=? and ts>=? and ts<? order by ts"
ALLOC = ("select ts, mw from balancing_cb where border=? and product=? and direction=? and ts>=? "
         "and ts<? order by ts")
PRICE = "select ts, eur_mwh from price where zone=? and ts>=? and ts<? order by ts"


def series(con, sql: str, args: list) -> pd.Series:
    d = con.execute(sql, args).df()
    return pd.Series(d.iloc[:, 1].to_numpy(dtype=float), index=pd.DatetimeIndex(d.iloc[:, 0]))


def main() -> None:
    con = duckdb.connect("data/energiamudel.duckdb", read_only=True)
    for border in ("EE-LV", "LV-LT"):
        za, zb = border.split("-")
        for label, lo, hi in PERIODS:
            df = pd.DataFrame({
                "fwd": series(con, SERIES.format("scheduled_exchange"), [border, "fwd", lo, hi]),
                "rev": series(con, SERIES.format("scheduled_exchange"), [border, "rev", lo, hi]),
                "nf": series(con, SERIES.format("ntc"), [border, "fwd", lo, hi]),
                "nr": series(con, SERIES.format("ntc"), [border, "rev", lo, hi]),
                "pa": series(con, PRICE, [za, lo, hi]), "pb": series(con, PRICE, [zb, lo, hi]),
            }).dropna()
            for d in ("fwd", "rev"):
                a = series(con, ALLOC, [border, "aFRR", d, lo, hi]).reindex(df.index).fillna(0.0)
                m = series(con, ALLOC, [border, "mFRR", d, lo, hi]).reindex(df.index).fillna(0.0)
                net = df.fwd - df.rev if d == "fwd" else df.rev - df.fwd
                ntc = df.nf if d == "fwd" else df.nr
                dear = (df.pb - df.pa if d == "fwd" else df.pa - df.pb) > 0.02
                cells = []
                for name, cap in (("A31", ntc), ("less aFRR", ntc - a), ("less mFRR", ntc - m),
                                  ("less both", ntc - a - m)):
                    at = np.abs(net - cap) <= 1
                    cells.append(f"{name}: at it {int(at.sum())} h ({int((at & dear).sum())} "
                                 f"congested), above it {int((net > cap + 1).sum())}")
                print(f"{border} {'→' if d == 'fwd' else '←'} {label}: {len(df)} h, congested "
                      f"{int(dear.sum())}; A31 {ntc.mean():.0f} MW, aFRR {a.mean():.0f}, mFRR "
                      f"{m.mean():.0f} | " + "; ".join(cells))


if __name__ == "__main__":
    main()
