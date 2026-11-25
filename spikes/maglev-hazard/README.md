# maglev-hazard

**Question** (2026-10-19, D-144): why does `app/test/worker.test.ts` fail now and then under load?
Node 26.4's V8 compiles the engine wrong now and then while Maglev is on; `docs/research/2026-10-19_maglev_hazard.md`
has the runs.

**Run:** `spikes/maglev-hazard/loop.sh N K FLAGS` runs the worker test K copies at a time for N rounds. Without Maglev,
as every engine run in Node now goes: `./loop.sh 100 4`. With Maglev, past the guard in `app/scripts/highs.ts`:
`./loop.sh 35 4 "--no-maglev --maglev"` — about 7 % of runs failed on Node 26.4.0 on the 8-core M1 Pro.

**On an upgrade of Node:** run it with Maglev for 400 runs (`./loop.sh 100 4 "--no-maglev --maglev"`); with none
failed, the flag may be dropped (a decision of its own). Disposable: not held to the repository's standards
(AGENTS.md §3).
