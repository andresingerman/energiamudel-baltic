"""The price at the Nordic end of NordBalt and EstLink since the Nordic flow-based go-live
(DECISIONS D-075): in the hours a cable's day-ahead schedule lies inside its offered capacity, how
often the Baltic zone's price equals the neighbour zone's to the cent, and how often it equals
the virtual hub's (the zone's price plus the network constraints' spread, `jao_series`).

Run from the repository root:  .venv/bin/python spikes/validation-round2/hub_check.py
Reads the database (prices, schedules, capacities, the spread) — observed prices of the core
zones are compared here, not fed to the engine.
"""

from __future__ import annotations

import duckdb
import numpy as np
import pandas as pd

CASES = (("NordBalt", "LT", "SE4", "SE4_NB", "LT-SE4"), ("EstLink", "EE", "FI", "FI_EL", "EE-FI"))
PERIODS = (("2024, to 29 October", "2024-01-01", "2024-10-29 23:00"),
           ("2024, from 29 October", "2024-10-29 23:00", "2025-01-01"),
           ("2025", "2025-01-01", "2026-01-01"), ("2026, to August", "2026-01-01", "2026-09-01"))


def series(con, sql: str, args: list) -> pd.Series:
    d = con.execute(sql, args).df()
    return pd.Series(d.iloc[:, 1].to_numpy(dtype=float), index=pd.DatetimeIndex(d.iloc[:, 0]))


def main() -> None:
    con = duckdb.connect("data/energiamudel.duckdb", read_only=True)
    for name, zone, nb, hub, border in CASES:
        for label, lo, hi in PERIODS:
            a = [lo, hi]
            p = lambda z: series(con, "select ts, eur_mwh from price where zone=? and ts>=? and "  # noqa: E731
                                      "ts<? order by ts", [z, *a])
            f = lambda t, d: series(con, f"select ts, mw from {t} where border=? and direction=? "  # noqa: E731
                                         "and ts>=? and ts<? order by ts", [border, d, *a])
            df = pd.DataFrame({"zone": p(zone), "nb": p(nb), "fwd": f("scheduled_exchange", "fwd"),
                               "rev": f("scheduled_exchange", "rev"), "nf": f("ntc", "fwd"),
                               "nr": f("ntc", "rev")}).dropna()
            sp = series(con, "select ts, value from jao_series where endpoint="
                             "'fbDomainShadowPrice' and field=? and ts>=? and ts<? order by ts",
                        [f"spread_{hub}", *a])
            df["sp"] = sp.reindex(df.index).fillna(0.0)
            net = df.rev - df.fwd                                  # import into the Baltic zone
            inside = df[(net < df.nr - 5) & (-net < df.nf - 5)]
            if inside.empty:
                continue
            eq = lambda x: 100 * float(np.mean(np.abs(x) < 0.02))  # noqa: E731
            s = df.sp[df.index.isin(sp.index)]
            tail = (f"; the spread: mean {s.mean():+.2f} EUR/MWh, beyond +-1 in "
                    f"{100 * float(np.mean(np.abs(s) > 1)):.0f} % of hours, mean {s[s > 1].mean():.1f} "
                    f"where above 1 and {s[s < -1].mean():.1f} where below -1") if len(s) else ""
            print(f"{name}, {label}: {len(df)} hours, {len(inside)} with the schedule inside the "
                  f"capacity; {zone} = {nb} to the cent in {eq(inside.zone - inside.nb):.0f} % of "
                  f"them, {zone} = hub in {eq(inside.zone - inside.nb - inside.sp):.0f} %{tail}")


if __name__ == "__main__":
    main()
