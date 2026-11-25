# Finland in 2035: is it dearer than Estonia?

The research log is `docs/research/2026-10-11_finland_2035.md`. It holds the rules and acceptance written
before the runs, the evidence both ways, the tests and the results. The Python steps run from the
repository root with `.venv/bin/python`; the TypeScript steps run from `app/`. Derived data goes to
`data/derived/finland/`, which is not committed.

- `prep.py OUT_DIR [year …]` writes `record_{y}.json` for 2023–2025:
  - Finland's load, generation and price, with Estonia and EstLink, from v5's database;
  - Sweden's and Norway's prices, flows and capacities from v4's cache, each file checked against its
    v4 lineage record (a missing month is an error);
  - JAO's maximum exchanges after the Nordic flow-based go-live.
- `zone.ts` is the zone model on v5's engine (`runLP`). It solves one zone, or several as a chain whose
  zones the engine joins by links, and it checks each zone's hourly balance itself. The chain was added
  for the research on Sweden and Poland; Finland's results are unchanged.
- `node ../spikes/finland/tests.ts` runs Test 2, the record test (§2a).
- `tyndp.py OUT_DIR [cy …]` reads TYNDP 2024 DE 2035's market-model output per climate year.
- `prep2035.py DATA_DIR` reads the 2035 inputs per climate year: PECD, demand shape, inflows, and the
  neighbours' prices.
- `cases.ts` defines the cases A, B and C and builds the 2035 zone.
- `node ../spikes/finland/v5.ts [case …|line DCS WINDS]` couples each case with v5 through EstLink, per
  scenario and climate year (§3a–§5).
