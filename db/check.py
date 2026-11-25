"""Stage 2 gate (SPECIFICATION.md §14): run after `make history && make db`.

Run:  make check

  1. lineage      every fact row names an existing lineage record; every measured record's
                  raw file exists and every raw file has a record (R-DATA-3, R-DATA-9)
  2. register     every source a fact row comes from is in the register, every document the
                  documentary CSVs cite is cached (R-DATA-6, R-DOC-5)
  3. hours        prices of the six zones and load of the core zones hold every hour of
                  2023-2025, less the source gaps listed by name, 24 on each DST date (R-DATA-4)
  4. tables       every table holds rows: an incomplete cache must not pass for a complete one
  5. rebuild      a fresh build from the same cache reproduces the database table by table
                  (R-DATA-5); `--fast` skips it
  6. jao time     JAO's `dateTimeUtc` is UTC: the EstLink limits it publishes match ENTSO-E
                  A31 hour for hour at lag 0, not at +-1 or +-2 h (R-DATA-11)
  7. verified     every person-read documentary row has a verification record whose verdict
                  is ok or corrected (data/documentary/verification.csv, R-DATA-7)
  8. export       the export's own gate (export/check.py): lengths, no core price, size, lineage,
                  the manifest's code hash, and a byte-identical fresh export (`--fast` skips that)
  9. fit          every fitted parameter's lineage record states the values the register holds:
                  the gas bid's adder, the batteries' Δ, Kruonis's step — a refit put back by
                  hand leaves its records behind (D-147, ERRATA E-158)

Exit status 1 on any failure.
"""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

import pandas as pd

from pipeline import DATA_DIR, lineage, register
from pipeline.config import ZONES, core_zones
from pipeline.sources import documents, raw_dir

from . import build, connect

FACT_TABLES = ("price", "load", "generation", "flow", "ntc", "scheduled_exchange",
               "net_position", "reserve_procured", "balancing_cb", "weather", "capacity",
               "capacity_stat", "capacity_area", "unit", "unavailability", "reservoir",
               "commodity", "tyndp_price", "research_price",
               "tso_series",
               "jao_series", "umm_message", "scenario_assumption", "scenario_fuel",
               "tech_parameter", "scenario_link", "scenario_link_hourly", "pecd_profile",
               "hydro_inflow", "thermal_unit", "demand_profile", "parameter", "tyndp2026_weather",
               "tyndp2026_hydro", "tyndp2026_price", "tyndp2026_pecd",
               "tyndp2026_demand", "scenario_boundary", "scenario_boundary_output")
TABLES = FACT_TABLES + ("zone", "tech", "border", "lineage")
CAL_YEARS = (2023, 2024, 2025)
# (table, zone, year) -> hours the source does not publish, each with its reason
KNOWN_GAPS = {("load", "EE", 2025): 7}          # v4 E-021: Elering's load series, 7 hours


def check_lineage(con) -> tuple[bool, str]:
    recs = {r.dataset: r for r in lineage.read_all()}
    # against the record files, not the database's lineage table, which its foreign keys
    # already hold every fact row to
    q = "SELECT lineage_id, count(*) FROM {} GROUP BY 1"
    missing = {t: sum(n for ds, n in con.execute(q.format(t)).fetchall() if ds not in recs)
               for t in FACT_TABLES}
    root = Path(os.environ.get("ENERGIAMUDEL_RAW", DATA_DIR / "raw"))
    files = {p.name.rsplit(".", 1)[0]: p for p in root.rglob("*")
             if p.is_file() and not p.name.startswith(".")}
    no_file = sorted(ds for ds, r in recs.items() if r.is_measured and ds not in files)
    no_record = sorted(stem for stem in files if stem not in recs)
    rows = sum(missing.values())
    ok = rows == 0 and not no_file and not no_record
    detail = (f"{rows} fact rows without a record; {len(recs)} records, {len(files)} raw files; "
              f"{len(no_file)} measured records without a file, {len(no_record)} files without a "
              f"record")
    for name, lst in (("no file", no_file), ("no record", no_record)):
        if lst:
            detail += f"\n    {name}: {', '.join(lst[:8])}"
    return ok, detail


def check_register(con) -> tuple[bool, str]:
    used = {r[0].split(".")[0] for t in FACT_TABLES
            for r in con.execute(f"SELECT DISTINCT lineage_id FROM {t}").fetchall()}
    known = set(register.PURPOSE) | {"doc", "svk"}
    unregistered = sorted(used - known)
    cited = set()
    doc = DATA_DIR / "documentary"
    for name, col in (("scenarios.csv", "source"), ("links.csv", "source"),
                      ("fuel_paths.csv", "source"), ("tech_parameters.csv", "doc_source"),
                      ("parameters.csv", "source")):
        if (doc / name).exists():
            d = pd.read_csv(doc / name, dtype=str, keep_default_na=False)
            # the owner's presets and assumptions are cited to files in this repository
            cited |= {s for s in d[col] if s and s not in ("v3_presets", "specification")}
    uncached = sorted(k for k in cited if k not in documents.DOCS or not any(
        raw_dir(documents.RAW).glob(f"{documents.dataset_id(k)}.*")))
    ok = not unregistered and not uncached
    return ok, (f"{len(used)} sources in use, all registered; {len(cited)} documents cited, all "
                f"cached" if ok else f"unregistered: {unregistered}; cited but not cached: "
                                      f"{uncached}")


def check_hours(con) -> tuple[bool, str]:
    fails, n = [], 0
    for t, zones in (("price", list(ZONES)), ("load", core_zones())):
        for z in zones:
            for y in CAL_YEARS:
                n += 1
                want = (8784 if y % 4 == 0 else 8760) - KNOWN_GAPS.get((t, z, y), 0)
                got = con.execute(f"SELECT count(DISTINCT ts) FROM {t} WHERE zone=? AND "
                                  "year(ts)=?", [z, y]).fetchone()[0]
                if got != want:
                    fails.append(f"{t} {z} {y}: {got} hours, {want} expected")
        short = con.execute(f"""SELECT zone, d, k FROM (
            SELECT zone, CAST(ts AS DATE) d, count(DISTINCT ts) k FROM {t}
            WHERE year(ts) IN ({",".join(map(str, CAL_YEARS))}) AND month(ts) IN (3, 10)
              AND dayofweek(ts) = 0 AND day(ts) > 24 GROUP BY ALL) WHERE k <> 24
            ORDER BY 1, 2""").fetchall()
        n += 1
        fails += [f"{t} {z} {d}: {k} hours on a DST transition date" for z, d, k in short]
    return not fails, f"{n - len(fails)}/{n} counts as expected" + \
        ("" if not fails else "\n    " + "\n    ".join(fails))


def check_tables(con) -> tuple[bool, str]:
    empty = [t for t in TABLES if con.execute(f"SELECT count(*) FROM {t}").fetchone()[0] == 0]
    return not empty, f"{len(TABLES) - len(empty)}/{len(TABLES)} tables hold rows" + \
        ("" if not empty else "; EMPTY: " + ", ".join(empty))


def fingerprint(con) -> dict[str, tuple[int, int]]:
    """Row count and an order-free hash of every table's rows."""
    return {t: con.execute(f"SELECT count(*), coalesce(bit_xor(hash(x)), 0) FROM {t} x")
                .fetchone() for t in TABLES}


def check_rebuild(con) -> tuple[bool, str]:
    have = fingerprint(con)
    with tempfile.TemporaryDirectory() as tmp:
        build.build(Path(tmp) / "rebuild.duckdb")
        c2 = connect(Path(tmp) / "rebuild.duckdb")
        again = fingerprint(c2)
        c2.close()
    diff = [t for t in TABLES if have[t] != again[t]]
    return not diff, "fresh build identical in every table" if not diff else \
        "DIFFER: " + ", ".join(f"{t} {have[t][0]} vs {again[t][0]} rows" for t in diff)


def check_jao_time(con) -> tuple[bool, str]:
    """max_FI_EL is the largest EstLink flow EE -> FI, -min_FI_EL the largest FI -> EE (a
    virtual hub's net position is + towards its real zone, FI). A31 publishes the same limit
    per direction; the share of hours where both agree within 1 MW peaks at the true lag."""
    j = con.execute("""SELECT ts, max(CASE WHEN field='max_FI_EL' THEN value END) ee_fi,
                              -max(CASE WHEN field='min_FI_EL' THEN value END) fi_ee
                       FROM jao_series WHERE endpoint='maxNetPos' GROUP BY ts""").fetchdf()
    a = con.execute("""SELECT ts, max(CASE WHEN direction='fwd' THEN mw END) ee_fi,
                              max(CASE WHEN direction='rev' THEN mw END) fi_ee
                       FROM ntc WHERE border='EE-FI' AND ts >= '2024-10-29'
                       GROUP BY ts""").fetchdf()
    if j.empty or a.empty:
        return False, "no JAO or no A31 rows"
    a = a.set_index("ts")
    share = {}
    for lag in (-2, -1, 0, 1, 2):
        m = j.assign(ts=j.ts + pd.Timedelta(hours=lag)).set_index("ts").join(
            a, rsuffix="_a", how="inner")
        ok = ((m.ee_fi - m.ee_fi_a).abs() < 1) & ((m.fi_ee - m.fi_ee_a).abs() < 1)
        share[lag] = ok.mean()
    best = max(share, key=lambda k: share[k])
    detail = ", ".join(f"lag {k:+d} h: {v:.1%}" for k, v in share.items())
    return best == 0, f"hours where JAO and A31 agree within 1 MW — {detail}"


def _same(a: str, b: str) -> bool:
    try:
        return abs(float(a) - float(b)) <= 1e-9 * max(1.0, abs(float(b)))
    except ValueError:
        return a == b


def check_verified() -> tuple[bool, str]:
    """Every documentary row has a verification record that is ok or corrected, made on the
    value the row holds now (a changed value loses its verification)."""
    from validate import documentary as dv
    if not dv.OUT.exists():
        return False, "data/documentary/verification.csv missing"
    ver = pd.read_csv(dv.OUT, dtype=str, keep_default_na=False)
    rec = {(r.file, r.row_key): r for r in ver.itertuples()}
    missing, bad, stale = [], [], []
    for name in dv.FILES:
        if not (dv.DOC / name).exists():
            continue
        for r in dv.read(name).itertuples():
            hit, where = rec.get((name, r.row_key)), f"{name}:{r.row_key}"
            if hit is None:
                missing.append(where)
            elif hit.verdict not in ("ok", "corrected"):
                bad.append(f"{where}={hit.verdict}")
            elif not _same(hit.value_csv, r.row_value):
                stale.append(f"{where}: verified {hit.value_csv}, now {r.row_value}")
    ok = not (missing or bad or stale)
    return ok, (f"{len(ver)} verification records, every documentary row ok or corrected" if ok
                else f"{len(missing)} rows without a record (e.g. {missing[:3]}); {len(bad)} not "
                     f"ok (e.g. {bad[:3]}); {len(stale)} changed since verified (e.g. "
                     f"{stale[:3]})")


def _literal(notes: str, key: str):
    """The Python literal after `key` in a record's notes ("result {...}", "results [...]")."""
    import ast
    i = notes.find(key)
    if i < 0:
        return None
    i += len(key)
    open_, close = notes[i], {"{": "}", "[": "]"}.get(notes[i])
    if close is None:
        return None
    depth = 0
    for j in range(i, len(notes)):
        depth += (notes[j] == open_) - (notes[j] == close)
        if depth == 0:
            return ast.literal_eval(notes[i:j + 1])
    return None


def check_fit(register: dict, records: dict) -> tuple[bool, str]:
    """Each fitted value against the notes of the record it names (D-147)."""
    bad = []
    g = register.get("gas_bid")
    if not g:
        bad.append("gas bid: the register has none, which every run needs (ERRATA E-164)")
    else:
        rec = records.get(g.get("lineage_id"))
        got = ((_literal(rec.notes or "", "result ") or {}) if rec else {}).get("eur_mwh")
        if got != g["eur_mwh"]:
            bad.append(f"gas bid: register {g['eur_mwh']}, {g.get('lineage_id')} {got}")
    for zone, b in register.get("battery_delta", {}).items():
        rec = records.get(b.get("lineage_id"))
        key = lambda f: (f["mfrr_share"], f["eur_mwh"], f["model_mwh"])  # noqa: E731
        got = sorted(map(key, _literal(rec.notes or "", "results ") or [])) if rec else None
        if got != sorted(map(key, b.get("fits", []))):
            bad.append(f"battery Δ {zone}: the register's fits are not {b.get('lineage_id')}'s")
    k = register.get("kruonis_output")
    if k:
        rec = records.get(k.get("lineage_id"))
        if not rec or f"step {k['step_eur_mwh']:g} EUR/MWh" not in (rec.notes or ""):
            bad.append(f"Kruonis's step {k['step_eur_mwh']:g}: not in {k.get('lineage_id')}")
    n = bool(g) + len(register.get("battery_delta", {})) + bool(k)
    return not bad, (f"{n} fitted values as their lineage records state them" if not bad
                     else "; ".join(bad))


def main() -> int:
    con = connect()
    checks = [("lineage", check_lineage(con)), ("register", check_register(con)),
              ("hours", check_hours(con)), ("tables", check_tables(con)),
              ("jao time", check_jao_time(con)), ("verified", check_verified())]
    from pipeline import lineage
    from validate import fitted
    checks.append(("fit", check_fit(fitted.read(), {r.dataset: r for r in lineage.read_all()})))
    if "--fast" not in sys.argv:
        con.close()
        con = connect()
        checks.append(("rebuild", check_rebuild(con)))
    con.close()
    from export.check import OUT
    from export.check import check as check_export
    if (OUT / "manifest.json").exists():   # the export gate (M1): lengths, R-BND-3, size, rebuild
        checks.append(("export", check_export(rebuild="--fast" not in sys.argv)))
    else:
        checks.append(("export", (False, "no data/export/manifest.json: run `make export`")))
    ok = True
    for name, (passed, msg) in checks:
        ok &= passed
        print(f"{'OK  ' if passed else 'FAIL'}  {name:<9} {msg}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
