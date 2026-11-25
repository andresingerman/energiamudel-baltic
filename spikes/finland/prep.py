# Phase 2 data of the research on Finland (docs/research/2026-10-11_finland_2035.md): one JSON per
# observed year for the Finnish zone model (zone.ts), hour by hour in UTC.
# - Finland's load and generation by type (A65, A75) and its price (A44), Estonia's price and EstLink's
#   offered capacity and flow (A31, A11): v5's database.
# - Sweden's SE1 and SE3 and Norway's NO4 prices (A44), and the SE1-FI, SE3-FI and FI-NO4 offered
#   capacities and flows (A31, A11): the v4 cache, read-only, each file checked against its v4 lineage
#   record's sha256; nothing is fetched (v5's data scope stays D-002's).
# - From the Nordic flow-based go-live (2024-10-29) the Swedish borders publish no A31: their capacity is
#   JAO's maximum bilateral exchange (v5 data/raw/jao), an upper bound per border. NO4's maximum
#   exchange is SE1's, the same constraint, so NO4 enters as its observed flow, not as a border.
# Usage: .venv/bin/python spikes/finland/prep.py OUT_DIR [year …]
import hashlib
import json
import sys
from pathlib import Path

import duckdb
import pandas as pd

from pipeline.sources import entsoe

ROOT = Path(__file__).resolve().parents[2]
V4 = ROOT.parent / "energiamudel-v4.nosync" / "data"  # v4's checkout beside this one
FB = pd.Timestamp("2024-10-28 23:00")  # first hour of flow-based delivery, UTC
SWEDISH = {"SE1": "SE1-FI", "SE3": "SE3-FI"}  # fwd = into Finland


def v4_series(doc: str, key: str, year: int, missing_ok: bool = False) -> pd.Series:
    """A v4-cached ENTSO-E series over a year and its neighbouring months, hourly, by its lineage.
    A month absent from the cache is an error unless the caller lists the series as a known gap."""
    parts = []
    for y, m in [(year - 1, 12)] + [(year, m) for m in range(1, 13)] + [(year + 1, 1)]:
        stem = f"entsoe.{doc}.{key}.{y}-{m:02d}"
        f, rec = V4 / "raw" / "entsoe" / f"{stem}.xml", V4 / "lineage" / f"{stem}.json"
        if not f.exists():
            if missing_ok:
                continue
            raise FileNotFoundError(f"{f.name}: not in the v4 cache")
        want = json.loads(rec.read_text())["sha256"]
        if hashlib.sha256(f.read_bytes()).hexdigest() != want:
            raise ValueError(f"{f.name}: sha256 differs from its v4 lineage record")
        df = entsoe.to_hourly(entsoe.parse(f), by=())
        if len(df):
            parts.append(df.set_index("ts")["value"])
    s = pd.concat(parts) if parts else pd.Series(dtype=float)
    return s[~s.index.duplicated()]


def v4_net_flow(border: str, year: int) -> pd.Series:
    """Net physical flow fwd − rev; a direction that reports no value in an hour carried none."""
    fwd, rev = v4_series("A11", f"{border}.fwd", year), v4_series("A11", f"{border}.rev", year)
    idx = fwd.index.union(rev.index)
    return fwd.reindex(idx).fillna(0) - rev.reindex(idx).fillna(0)


def jao(year: int) -> pd.DataFrame:
    rows = []
    for m in range(1, 13):
        f = ROOT / "data" / "raw" / "jao" / f"jao.maxExchanges.NORDIC.{year}-{m:02d}.json"
        if f.exists():
            rows += json.loads(f.read_text())
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    df.index = pd.to_datetime(df["dateTimeUtc"]).dt.tz_convert(None)
    return df[~df.index.duplicated()]


def year_input(con, year: int) -> dict:
    idx = pd.date_range(f"{year}-01-01", f"{year + 1}-01-01", freq="h", inclusive="left")
    q = lambda sql, *a: con.execute(sql, list(a)).fetchdf()
    lo, hi = idx[0], idx[-1]

    def db(table: str, col: str, where: str, *a) -> pd.Series:
        df = q(f"SELECT ts, {col} AS v FROM {table} WHERE {where} AND ts BETWEEN ? AND ?", *a, lo, hi)
        return df.set_index("ts")["v"].reindex(idx)

    price = {z: db("price", "eur_mwh", "zone = ?", z) for z in ("FI", "EE")}
    for z in ("SE1", "SE3", "NO4"):
        price[z] = v4_series("A44", z, year).reindex(idx)
    load = db("load", "mw", "zone = 'FI'")
    gen = q("SELECT tech, ts, mw FROM generation WHERE zone = 'FI' AND ts BETWEEN ? AND ?", lo, hi)
    gen = gen.pivot(index="ts", columns="tech", values="mw").reindex(idx)
    # capacities into and out of Finland, and net flows into Finland
    cap, flow, capsrc = {}, {}, {}
    j = jao(year)
    for z, b in SWEDISH.items():
        imp, exp = v4_series("A31", f"{b}.fwd", year).reindex(idx), v4_series("A31", f"{b}.rev", year).reindex(idx)
        fb = idx >= FB
        if fb.any():
            jj = j.reindex(idx[fb])
            imp[fb], exp[fb] = jj[f"border_{z}_FI"].to_numpy(), jj[f"border_FI_{z}"].to_numpy()
        cap[z] = (imp, exp)
        capsrc[z] = {"a31_hours": int((~fb).sum()), "jao_hours": int(fb.sum())}
        flow[z] = v4_net_flow(b, year).reindex(idx)
    ee_imp = db("ntc", "mw", "border = 'EE-FI' AND direction = 'fwd'")   # EE → FI
    ee_exp = db("ntc", "mw", "border = 'EE-FI' AND direction = 'rev'")
    cap["EE"] = (ee_imp, ee_exp)
    ee_flow = q("SELECT ts, mw FROM v_flow_net WHERE border = 'EE-FI' AND ts BETWEEN ? AND ?", lo, hi)
    flow["EE"] = ee_flow.set_index("ts")["mw"].reindex(idx)
    flow["NO4"] = -v4_net_flow("FI-NO4", year).reindex(idx)                  # into Finland

    gaps = {}

    def fill(name: str, s: pd.Series, limit: int = 6, hold: bool = False) -> list:
        """Gaps up to `limit` hours interpolated; a capacity (`hold`) keeps its last value for a
        week, as capacities hold for days."""
        missing = int(s.isna().sum())
        if missing:
            gaps[name] = missing
        s = s.ffill(limit=168).bfill(limit=168) if hold else s.interpolate(limit=limit, limit_direction="both")
        if s.isna().any():
            raise ValueError(f"{year} {name}: {int(s.isna().sum())} hours missing after filling {limit}")
        return [round(float(x), 3) for x in s]

    out = {"year": year, "hours": len(idx), "start_utc": str(idx[0]),
           "price": {z: fill(f"price.{z}", s) for z, s in price.items()},
           "load": fill("load", load),
           "gen": {t: fill(f"gen.{t}", gen[t].fillna(0) if gen[t].notna().mean() < 0.5 else gen[t])
                   for t in gen.columns},
           "cap": {z: {"imp": fill(f"cap.{z}.imp", a, hold=True), "exp": fill(f"cap.{z}.exp", b, hold=True)}
                   for z, (a, b) in cap.items()},
           "flow": {z: fill(f"flow.{z}", s, 24) for z, s in flow.items()},
           "capSource": capsrc, "gaps": gaps}
    # the balance the record closes with: generation + net imports − load, a check of the inputs
    g = sum(pd.Series(v) for v in out["gen"].values())
    imp = sum(pd.Series(v) for v in out["flow"].values())
    out["residualMw"] = round(float((g + imp - pd.Series(out["load"])).mean()), 1)
    return out


if __name__ == "__main__":
    dest = Path(sys.argv[1])
    dest.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(ROOT / "data" / "energiamudel.duckdb"), read_only=True)
    for y in [int(a) for a in sys.argv[2:]] or [2023, 2024, 2025]:
        d = year_input(con, y)
        (dest / f"record_{y}.json").write_text(json.dumps(d))
        mean = lambda a: sum(a) / len(a)
        print(f"{y}: {d['hours']} h; load {sum(d['load']) / 1e6:.2f} TWh; prices "
              + ", ".join(f"{z} {mean(v):.1f}" for z, v in d["price"].items())
              + "; net imports TWh " + ", ".join(f"{z} {sum(v) / 1e6:.2f}" for z, v in d["flow"].items())
              + f"; balance residual {d['residualMw']} MW; gaps {d['gaps']}; capacity {d['capSource']}")
