# The two app profiles of D-121 from the research's runs (docs/research/
# 2026-10-12_sweden_poland_2035.md §8): TIGHT, each neighbour tight on its own (each.ts ->
# each_C.json), and TIGHTJ, all three tight at once (joint.ts C with NB_SIZED=1 NB_RESPONSE=ccgt
# NB_TAG=_avg -> joint_C_ccgt_avg.json). Each takes the gas scenario's series of every climate year,
# which the app then holds fixed in all four scenarios (the owner, 2026-10-13: one series for every
# scenario). Writes data/research/neighbours_tight_2035.json.gz, which `make db` loads into
# research_price with a derived lineage record.
# Usage: .venv/bin/python spikes/neighbours-2035/series.py [DATA_DIR]
import gzip
import json
import math
import sys
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parents[2]
DATA = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data" / "derived" / "neighbours2035"
OUT = ROOT / "data" / "research" / "neighbours_tight_2035.json.gz"
RUNS = {"TIGHT": "each_C.json", "TIGHTJ": "joint_C_ccgt_avg.json"}
SCENARIO, CYS, ZONES, HOURS = "gas", ("1995", "2008", "2009"), ("FI", "SE4", "PL"), 8760
# the inputs the runs read (spikes/finland, spikes/neighbours-2035): TYNDP 2024 DE 2035's
# market-model output, PECD, demand shapes, inflows and PEMMDB; the re-pricing knots' sources
# (D-072); ERAA 2025's plant classes and 2035 fuels; and, from the database, the research's own
# register rows
INPUTS = ["tyndp2024.DE2035CY1995", "tyndp2024.DE2035CY2008", "tyndp2024.DE2035CY2009",
          "tyndp2024.PECD", "tyndp2024.Demand-Profiles", "tyndp2024.Hydro-Inflows",
          "tyndp2024.PEMMDB2", "tyndp2024.Investment-Datasets", "tyndp2024.Hydrogen",
          "tyndp2024.20231103-Final-Supply-Inputs-for-TYNDP-2024-Scenarios-xlsx",
          "eraa2025.common_data", "eraa2025.dashboard_raw_data"]

con = duckdb.connect(str(ROOT / "data" / "energiamudel.duckdb"), read_only=True)
rows = [r[0] for r in con.execute("SELECT DISTINCT lineage_id FROM parameter WHERE key LIKE "
                                  "'se2035.%' OR key LIKE 'pl2035.%' ORDER BY 1").fetchall()]
assert rows, "the research's register rows are not in the database: run make db first"
profiles = {}
for pr, name in RUNS.items():
    s = json.loads((DATA / name).read_text())["series"][SCENARIO]
    profiles[pr] = {"2035": {cy: {z: [round(x, 2) for x in s[cy][z]] for z in ZONES}
                             for cy in CYS}}
    for cy in CYS:
        for z in ZONES:
            a = profiles[pr]["2035"][cy][z]
            assert len(a) == HOURS and all(math.isfinite(x) for x in a), (pr, cy, z, len(a))
doc = {"dataset": "pipeline.neighbours_tight_2035",
       "description": "Finland's, SE4's and Poland's day-ahead prices in 2035 tight (case C: "
                      "demand comes, the build lags), from energiamudel's research on Finland, "
                      "Sweden and Poland (docs/research/2026-10-12_sweden_poland_2035.md §5, §8; "
                      "D-121): TIGHT each country tight on its own, TIGHTJ all three at once; the "
                      "gas scenario's series per climate year, on the climate years' layout, at "
                      "ERAA 2025's fuels of 2035, rounded to 0.01 EUR/MWh. The record's shapes and "
                      "tests come from v4's cache (D-002).",
       "code": f"spikes/neighbours-2035/series.py from {RUNS['TIGHT']} (each.ts) and "
               f"{RUNS['TIGHTJ']} (joint.ts C, NB_SIZED=1 NB_RESPONSE=ccgt NB_TAG=_avg)",
       "derived_from": INPUTS + rows, "scenario": SCENARIO, "profiles": profiles}
OUT.parent.mkdir(parents=True, exist_ok=True)
# mtime 0: the same series give the same bytes, so the lineage record changes only with them
OUT.write_bytes(gzip.compress(json.dumps(doc, separators=(",", ":")).encode(), mtime=0))
for pr in RUNS:
    print(pr, {z: round(sum(sum(profiles[pr]["2035"][cy][z]) / HOURS for cy in CYS) / 3, 1)
               for z in ZONES}, "(plain mean of the three climate years)")
print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1e3:.0f} kB), "
      f"{len(INPUTS + rows)} inputs")
