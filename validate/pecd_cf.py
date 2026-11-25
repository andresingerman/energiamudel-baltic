"""PECD versus observed capacity factors of the core zones (SPECIFICATION.md R-TIME-5, D-005).

Run:  .venv/bin/python -m validate.pecd_cf        (after `make db`; prints a markdown table)

Observed capacity factor of a zone, technology and year = generation (ENTSO-E A75, MWh) /
(installed capacity x hours), where the capacity is the average of the A68 figures at the start
of the year and of the next year (A68 is a snapshot at 1 January; the Baltic solar fleet
doubled within some years, so the start-of-year figure alone overstates the factor). A year
without the next year's figure uses its own. PECD 3.1 (TYNDP 2024, target year 2030) gives the
capacity factor of a reference fleet for climate years 1982-2019.

Two comparisons: the same calendar years 2015-2019 (the only overlap), and the observed years
2020-2025 against the PECD climatology 1982-2019. The ratio observed / PECD is what OPEN-2
decides on; nothing here changes an input.
"""

from __future__ import annotations

import duckdb
import pandas as pd

from db import db_path
from pipeline.config import core_zones

TECHS = ("wind_onshore", "wind_offshore", "solar")
# An observed year outside these bounds is a data error of A68 or A75, not weather (EE solar
# 2015-2017: A68 says 1.0-1.4 MW beside 2.8-5.7 GWh of generation); it is left out and counted.
PLAUSIBLE = {"solar": (0.05, 0.20), "wind_onshore": (0.10, 0.50), "wind_offshore": (0.20, 0.65)}


def observed(con) -> pd.DataFrame:
    gen = con.execute("""SELECT zone, tech, year(ts) AS year, sum(mw) AS mwh, count(*) AS h
        FROM generation WHERE tech IN ('wind_onshore', 'wind_offshore', 'solar')
        GROUP BY ALL""").fetchdf()
    cap = con.execute("""SELECT zone, tech, year, mw FROM capacity
        WHERE tech IN ('wind_onshore', 'wind_offshore', 'solar')""").fetchdf()
    nxt = cap.assign(year=cap.year - 1).rename(columns={"mw": "mw_next"})
    cap = cap.merge(nxt, on=["zone", "tech", "year"], how="left")
    cap["mw_mean"] = cap[["mw", "mw_next"]].mean(axis=1)
    df = gen.merge(cap, on=["zone", "tech", "year"], how="inner")
    df = df[(df.mw_mean > 0) & (df.h >= 8000)]
    hours = df.year.map(lambda y: 8784 if y % 4 == 0 else 8760)
    df = df.assign(cf_obs=df.mwh / (df.mw_mean * hours))
    lo, hi = df.tech.map(lambda t: PLAUSIBLE[t][0]), df.tech.map(lambda t: PLAUSIBLE[t][1])
    return df.assign(plausible=df.cf_obs.between(lo, hi))


def pecd(con) -> pd.DataFrame:
    return con.execute("""SELECT zone, tech, climate_year AS year, avg(cf) AS cf_pecd
        FROM pecd_profile WHERE target_year = 2030 GROUP BY ALL""").fetchdf()


def table() -> str:
    con = duckdb.connect(str(db_path()), read_only=True)   # a report: it writes nothing
    obs, pc = observed(con), pecd(con)
    lines = ["| Zone | Technology | Same years 2015-2019: observed / PECD (years) | "
             "Observed 2020-2025 average | PECD 1982-2019 average | Ratio | PECD rank of the "
             "observed average |", "|---|---|---|---|---|---|---|"]
    for z in core_zones():
        for t in TECHS:
            o, p = obs[(obs.zone == z) & (obs.tech == t)], pc[(pc.zone == z) & (pc.tech == t)]
            if p.empty or o.empty:
                continue
            same = o[o.year.between(2015, 2019)].merge(p, on="year")
            bad = int((~same.plausible).sum())
            same = same[same.plausible]
            same_txt = (f"{(same.cf_obs / same.cf_pecd).mean():.2f} ({len(same)})"
                        if len(same) else "—") + (f", {bad} implausible left out" if bad else "")
            recent = o[o.year.between(2020, 2025) & o.plausible].cf_obs.mean()
            clim = p.cf_pecd.mean()
            rank = int((p.cf_pecd < recent).sum()) + 1
            lines.append(f"| {z} | {t} | {same_txt} | {recent:.3f} | {clim:.3f} | "
                         f"{recent / clim:.2f} | {rank}/{len(p) + 1} |")
    con.close()
    return "\n".join(lines)


if __name__ == "__main__":
    print(table())
