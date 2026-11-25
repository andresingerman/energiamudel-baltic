# wasm-solver

**Question** (SPECIFICATION.md D4): how long does a linear programme of the three Baltic zones
take in HiGHS compiled to WebAssembly (`highs-js`), per daily and per weekly block?

**Run:** `npm install highs && node bench.mjs` (Node uses the same V8 engine as Chrome).

**Result** (2026-09-24, M1 Pro, highs-js 1.15, synthetic block: 3 zones × 10 supply blocks,
boundaries FI/SE4/PL, two internal links, one battery per zone with cyclic state of charge,
load shedding at VOLL):

| Block | Variables | Per block | Year, one thread |
|---|---|---|---|
| 24 h | ~1 250 | 7.6 ms | 2.8 s |
| 168 h | ~8 700 | 52 ms | 2.7 s |

On four Web Workers a year is ~0.7–1 s. This is the measured fallback path of D4 (R-ENG-8).
Disposable: not held to the repository's standards (AGENTS.md §3).

**Real test weeks** (2026-09-25, `week_lp.mjs`: the formulation of `reference/lp.py` on the
weeks `make gap` writes; `node week_lp.mjs data/derived/gap/weeks/*_w*.json` after `npm install
highs`, development machine, Node 26, highs-js 1.15): 5 200–8 200 variables per week, 52–130 ms
per solve after the first (the storage weeks of climate year 2009 the slowest); each week's
mean price difference to the engine equals highspy's to 0.01 €/MWh, so the two solve the same
problem. A year is about
4–5 s on one thread, 1–1.3 s on four workers; the three years of a scenario set 3–4 s on four.
`highs.wasm` is 3.4 MB, 1.2 MB gzipped (R-NFR-4 counts it in the bundle). Evidence for D-019.

**The persistent API** (2026-09-25): passing the model to highs-js as arrays
(`createModel().passModel`) instead of LP text, as the engine of record does, a week takes
15–30 ms with the model's construction; see `app/scripts/bench.ts` for the year and set times.
