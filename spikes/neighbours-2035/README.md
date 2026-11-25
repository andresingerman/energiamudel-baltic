# Sweden and Poland in 2035, and the three neighbours tight together

The research log is `docs/research/2026-10-12_sweden_poland_2035.md`. It holds the rules and acceptance
written before the runs, the evidence both ways, the tests and the results. The Python steps run from
the repository root with `.venv/bin/python`; the TypeScript steps run from `app/`. Derived data goes to
`data/derived/neighbours2035/`, which is not committed.

- `prep.py OUT_DIR [year …]` writes `record_SE_{y}.json` and `record_PL_{y}.json` for 2023–2025.
  - Sweden: SE1–SE4's prices, load and generation, every Swedish border's flow and capacity, and the
    neighbours' prices.
  - Poland: its price, load and generation, its borders' net flows, and monthly fuel prices.
  - All ENTSO-E series come from v4's cache, each file checked against its v4 lineage record. JAO's
    maximum exchanges are used after the Nordic flow-based go-live.
- `node ../spikes/neighbours-2035/tests.ts` runs Test 2 on the record. It is the first run as §0 wrote it,
  followed by the variants added after it (§2a–§2c), and it writes `test2.json`: the fitted ladders,
  horizon and markups, and the blind years' series.
- `tyndp.py OUT_DIR [cy …]` reads TYNDP DE 2035's Swedish and Polish blocks, every neighbour's marginal
  cost and the yearly outputs.
- `prep2035.py DATA_DIR` writes the 2035 inputs per climate year (PECD, demand shapes, hydro, prices) and
  the record's patterns and price pools.
- `node ../spikes/neighbours-2035/cases.ts [A C Cde]` runs the standalone 2035 cases (§4), sizing the
  peakers by bisection. `… cases.ts line se|pl` runs the lines (§6).
- `node ../spikes/neighbours-2035/joint.ts A|C` couples the chain with Finland's zone and v5 (§5). It
  sizes the peakers jointly, runs the four scenarios, then holds the opening scenario's series fixed.
- `node ../spikes/neighbours-2035/each.ts` builds the profile "each neighbour tight on its own" (§5):
  Finland's case C coupled with v5, with SE4 and Poland as their standalone C series. It writes
  `each_C.json`.
- `.venv/bin/python spikes/neighbours-2035/series.py` writes the two app profiles of D-121 (§8) to the
  tracked `data/research/neighbours_tight_2035.json.gz`: TIGHT from `each_C.json`, TIGHTJ from
  `joint_C_ccgt_avg.json` (`NB_SIZED=1 NB_RESPONSE=ccgt NB_TAG=_avg node ../spikes/neighbours-2035/joint.ts C`),
  the gas scenario's series of each climate year. `make db` loads the file into `research_price`.
