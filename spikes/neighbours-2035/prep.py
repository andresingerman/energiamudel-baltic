# Phase 2 data of the research on Sweden and Poland (docs/research/2026-10-12_sweden_poland_2035.md §2):
# one JSON per observed year and country for the zone models (tests.ts), hour by hour in UTC.
# - Sweden: SE1–SE4's prices, load and generation by type (A44, A65, A75); every Swedish border's flow and
#   offered capacity (A11, A31); the neighbours' prices (A44: NO1, NO3, NO4, DK1, DK2, DE-LU, LT, FI, PL).
# - Poland: its price, load and generation by type (A44, A65, A75) and the net flow on its five borders
#   (A11); monthly fuel prices: TTF and the EUA (v5's commodity table, as export/years.py averages them),
#   the PSCMI 1 coal index (TGE, transcribed in v4's documentary CSV) at the ECB's EUR/PLN rate.
# All ENTSO-E series come from the v4 cache, read-only, each file checked against its v4 lineage record's
# sha256 (spikes/finland/prep.py's reader, which fails on a missing month); nothing is fetched (D-002).
# - From the Nordic flow-based go-live (2024-10-29) the Swedish borders publish no A31: their capacity is
#   JAO's maximum bilateral exchange, an upper bound per border; SE3→SE4 adds the South-West Link's.
# - Known gaps, the only ones allowed: SE2–NO4 is not in the cache (its flow stays in SE12's residual);
#   SE4–DE's A31 is empty from 2024-07 to the go-live and holds the Baltic Cable's median offer.
# - Poland's boundary series of R-BND-3 (A44 less the allocation constraint's shadow price) is read from
#   v5's year files beside A44: the price LitPol and SwePol see.
# Usage: .venv/bin/python spikes/neighbours-2035/prep.py OUT_DIR [year …]
import gzip
import importlib.util
import json
import math
import sys
from pathlib import Path

import duckdb
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location("fiprep", ROOT / "spikes" / "finland" / "prep.py")
fi = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fi)
V4 = fi.V4

SE = ["SE1", "SE2", "SE3", "SE4"]
SE_PRICES = SE + ["NO1", "NO3", "NO4", "DK1", "DK2", "DE", "LT", "FI", "PL"]
# fwd = first → second, as the cache names them
SE_BORDERS = ["SE1-SE2", "SE2-SE3", "SE3-SE4", "SE1-FI", "SE3-FI", "SE1-NO4", "SE2-NO3", "SE3-NO1",
              "SE3-DK1", "SE4-DK2", "SE4-DE", "SE4-PL", "LT-SE4"]
PL_BORDERS = {"PL-DE": -1, "PL-CZ": -1, "PL-SK": -1, "SE4-PL": 1, "LT-PL": 1}  # sign: fwd into Poland


def hours(year: int) -> pd.DatetimeIndex:
    return pd.date_range(f"{year}-01-01", f"{year + 1}-01-01", freq="h", inclusive="left")


class Filler:
    """Gaps up to `limit` hours interpolated; a capacity (`hold`) keeps its last value for a week."""
    def __init__(self, year: int):
        self.year, self.gaps = year, {}

    def __call__(self, name: str, s: pd.Series, limit: int = 6, hold: bool = False) -> list:
        missing = int(s.isna().sum())
        if missing:
            self.gaps[name] = missing
        s = s.ffill(limit=168).bfill(limit=168) if hold else s.interpolate(limit=limit, limit_direction="both")
        if s.isna().any():
            raise ValueError(f"{self.year} {name}: {int(s.isna().sum())} hours missing after filling {limit}")
        return [round(float(x), 3) for x in s]


def generation(zone: str, year: int, idx) -> pd.DataFrame:
    """A75 by production type, hourly, as v5's build loads it (db/build.py `load_entsoe_a75`: known types,
    generation only, pumping dropped); a type reported in under 90 % of the hours is zero where absent."""
    parts = []
    for y, m in [(year, m) for m in range(1, 13)] + [(year + 1, 1)]:
        stem = f"entsoe.A75.{zone}.{y}-{m:02d}"
        f, rec = V4 / "raw" / "entsoe" / f"{stem}.xml", V4 / "lineage" / f"{stem}.json"
        if not f.exists():
            raise FileNotFoundError(f"{f.name}: not in the v4 cache")
        if fi.hashlib.sha256(f.read_bytes()).hexdigest() != json.loads(rec.read_text())["sha256"]:
            raise ValueError(f"{f.name}: sha256 differs from its v4 lineage record")
        df = fi.entsoe.parse(f)
        df = df[df["tech"].notna() & df["in_domain"].notna()]
        if len(df):
            parts.append(fi.entsoe.to_hourly(df, by=("tech",)))
    df = pd.concat(parts)
    g = df.pivot_table(index="ts", columns="tech", values="value", aggfunc="first").reindex(idx)
    return g.apply(lambda c: c.fillna(0) if c.notna().mean() < 0.9 else c)  # reported from mid-year: 0 before


def jao_cap(j: pd.DataFrame, idx, a: str, b: str) -> tuple[pd.Series, pd.Series]:
    col = lambda x, y: j[f"border_{x}_{y}"].astype(float) if f"border_{x}_{y}" in j else 0.0
    fwd, rev = col(a, b), col(b, a)
    if (a, b) == ("SE3", "SE4"):                       # the South-West Link, its own virtual hubs
        fwd, rev = fwd + col("SE3", "SE4SWL"), rev + col("SE4", "SE3SWL")
    return pd.Series(fwd, index=j.index).reindex(idx), pd.Series(rev, index=j.index).reindex(idx)


def sweden(year: int) -> dict:
    idx, fill = hours(year), Filler(year)
    price = {z: fi.v4_series("A44", z, year).reindex(idx) for z in SE_PRICES}
    load = {z: fi.v4_series("A65", z, year).reindex(idx) for z in SE}
    gen = {z: generation(z, year, idx) for z in SE}
    j = fi.jao(year)
    fb = idx >= fi.FB
    cap, flow, src = {}, {}, {}
    for b in SE_BORDERS:
        a, c = b.split("-")
        fwd, rev = fi.v4_series("A31", f"{b}.fwd", year).reindex(idx), fi.v4_series("A31", f"{b}.rev", year).reindex(idx)
        if fb.any():
            jf, jr = jao_cap(j, idx[fb], a, c)
            fwd[fb], rev[fb] = jf.to_numpy(), jr.to_numpy()
        if b == "SE4-DE":                              # empty A31 from 2024-07: the cable's median offer
            fwd, rev = fwd.fillna(fwd.median()), rev.fillna(rev.median())
        cap[b] = {"fwd": fill(f"cap.{b}.fwd", fwd, hold=True), "rev": fill(f"cap.{b}.rev", rev, hold=True)}
        flow[b] = fill(f"flow.{b}", fi.v4_net_flow(b, year).reindex(idx), 24)
        src[b] = {"a31_hours": int((~fb).sum()), "jao_hours": int(fb.sum())}
    out = {"year": year, "hours": len(idx), "start_utc": str(idx[0]),
           "price": {z: fill(f"price.{z}", s) for z, s in price.items()},
           "load": {z: fill(f"load.{z}", s) for z, s in load.items()},
           "gen": {z: {t: fill(f"gen.{z}.{t}", g[t]) for t in g.columns} for z, g in gen.items()},
           "cap": cap, "flow": flow, "capSource": src}
    out["price"]["PLb"] = boundary_pl(year)
    out["gaps"] = fill.gaps
    # each zone's residual: generation + net flows in − load (SE2–NO4 is not in the cache)
    into = {z: sum(s * pd.Series(flow[b]) for b in SE_BORDERS for s, zz in ((-1, b.split("-")[0]), (1, b.split("-")[1])) if zz == z) for z in SE}
    out["residualMw"] = {z: round(float((sum(pd.Series(v) for v in out["gen"][z].values()) + into[z] - pd.Series(out["load"][z])).mean()), 1) for z in SE}
    return out


def boundary_pl(year: int) -> list:
    d = json.load(gzip.open(ROOT / "data" / "export" / "years" / f"{year}.json.gz"))
    return [round(float(x), 3) for x in d["boundary"]["PL"]["observed"]]


def fuels(con, year: int) -> dict:
    """Monthly fuel and CO2 prices, € (export/years.py's `_fuel`: a month's mean of its rows); PSCMI 1
    PLN/GJ at the month's mean EUR/PLN."""
    d = con.execute("SELECT commodity, month(ts) AS m, list(price) AS xs FROM commodity WHERE year(ts)=? "
                    "AND commodity IN ('gas_ttf','eua','usd_per_eur') GROUP BY ALL", [year]).fetchall()
    got = {(c, m): math.fsum(xs) / len(xs) for c, m, xs in d}
    mwh_per_mmbtu = 1055.05585262 * 1e6 / 3.6e9
    pscmi = pd.read_csv(V4 / "documentary" / "coal_pscmi.csv", parse_dates=["ts"]).set_index("ts")["price"]
    fx = []
    for f in sorted((V4 / "raw" / "ecb").glob(f"ecb.eur_pln.{year}.json")):
        rec = V4 / "lineage" / f"{f.stem}.json"
        if fi.hashlib.sha256(f.read_bytes()).hexdigest() != json.loads(rec.read_text())["sha256"]:
            raise ValueError(f"{f.name}: sha256 differs from its v4 lineage record")
        fx.append(f)
    if len(fx) != 1:
        raise FileNotFoundError(f"ecb.eur_pln.{year}.json: not in the v4 cache")
    eurpln = ecb_monthly(fx[0], year)
    out = {"gas_eur_mwh_th": [], "eua_eur_t": [], "coal_eur_mwh_th": [], "eur_pln": []}
    for m in range(1, 13):
        out["gas_eur_mwh_th"].append(round(got[("gas_ttf", m)] / got[("usd_per_eur", m)] / mwh_per_mmbtu, 3))
        out["eua_eur_t"].append(round(got[("eua", m)], 3))
        p = pscmi.get(pd.Timestamp(year, m, 1))
        if p is None or pd.isna(p):
            raise ValueError(f"PSCMI {year}-{m:02d} missing")
        out["coal_eur_mwh_th"].append(round(float(p) * 3.6 / eurpln[m], 3))
        out["eur_pln"].append(round(eurpln[m], 4))
    return out


def ecb_monthly(f: Path, year: int) -> dict:
    """The ECB's daily EUR/PLN reference rate (v4's file: the rates by date), averaged per month."""
    d = json.loads(f.read_text())["rates"]
    s = pd.Series({pd.Timestamp(k): float(v["PLN"]) for k, v in d.items()})
    s = s[s.index.year == year]
    return {m: float(s[s.index.month == m].mean()) for m in range(1, 13)}


def poland(con, year: int) -> dict:
    idx, fill = hours(year), Filler(year)
    g = generation("PL", year, idx)
    flow = {b: fill(f"flow.{b}", sign * fi.v4_net_flow(b, year).reindex(idx), 24) for b, sign in PL_BORDERS.items()}
    out = {"year": year, "hours": len(idx), "start_utc": str(idx[0]),
           "price": {"PL": fill("price.PL", fi.v4_series("A44", "PL", year).reindex(idx)), "PLb": boundary_pl(year)},
           "load": fill("load", fi.v4_series("A65", "PL", year).reindex(idx)),
           "gen": {t: fill(f"gen.{t}", g[t]) for t in g.columns},
           "flow": flow, "fuel": fuels(con, year)}
    out["gaps"] = fill.gaps
    gsum = sum(pd.Series(v) for v in out["gen"].values())
    out["residualMw"] = round(float((gsum + sum(pd.Series(v) for v in flow.values()) - pd.Series(out["load"])).mean()), 1)
    return out


if __name__ == "__main__":
    dest = Path(sys.argv[1])
    dest.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(ROOT / "data" / "energiamudel.duckdb"), read_only=True)
    mean = lambda a: sum(a) / len(a)
    for y in [int(a) for a in sys.argv[2:]] or [2023, 2024, 2025]:
        s = sweden(y)
        (dest / f"record_SE_{y}.json").write_text(json.dumps(s))
        print(f"SE {y}: load TWh " + ", ".join(f"{z} {sum(v) / 1e6:.1f}" for z, v in s["load"].items())
              + "; prices " + ", ".join(f"{z} {mean(v):.1f}" for z, v in s["price"].items())
              + f"; residual MW {s['residualMw']}; gaps {s['gaps']}")
        p = poland(con, y)
        (dest / f"record_PL_{y}.json").write_text(json.dumps(p))
        print(f"PL {y}: load {sum(p['load']) / 1e6:.1f} TWh; price A44 {mean(p['price']['PL']):.1f}, boundary "
              f"{mean(p['price']['PLb']):.1f}; gen TWh " + ", ".join(f"{t} {sum(v) / 1e6:.1f}" for t, v in p["gen"].items())
              + "; net imports TWh " + ", ".join(f"{b} {sum(v) / 1e6:.2f}" for b, v in p["flow"].items())
              + f"; fuel gas {mean(p['fuel']['gas_eur_mwh_th']):.1f} €/MWh, EUA {mean(p['fuel']['eua_eur_t']):.1f}, "
              f"coal {mean(p['fuel']['coal_eur_mwh_th']):.1f} €/MWh; residual {p['residualMw']} MW; gaps {p['gaps']}")
