# Nord Pool's aggregated bid curves: how far a price moves per GW, and against the model

The research log is `docs/research/2026-10-17_curve_slopes.md`. The curves are collected under D-108 into
`data/raw/nordpool` (`make nordpool`); they are never committed or published, and these spikes print only
statistics derived from them. Derived files go to `data/derived/curves/`, which is not committed.

- `.venv/bin/python spikes/nordpool-curves/coupling.py` reads every zone's A44 from v4's cache (read-only,
  each file against its v4 lineage record, D-002), 2020-01 … 2026-08, and prints how often each
  neighbour is with its market: by exact equality before flow-based, by the price gap since; it writes
  the gap classes by price band to `coupling.json`. Run it before `slopes.py`.
- `.venv/bin/python spikes/nordpool-curves/slopes.py [data/raw/nordpool]` reads every curve file and
  prints, per 15-minute MTU and cluster, the clearing price and the move for ±300, ±500 and ±1 000 MW:
  the slopes (§1), by direction and for Finland with all Sweden, the band for R-BND-6 (§4 B), and the
  supply and demand above the clearing price (§4 C).
- From `app/`: `node ../spikes/nordpool-curves/model_stack.ts [year] [first-day last-day]` replays the
  year and gives the same §4 C measures from the model's own Baltic offers hour by hour, to set beside
  the BALTIC curve on the same hours once October 2026 is exported (§4 D); writes `model_stack_<year>.json`.
