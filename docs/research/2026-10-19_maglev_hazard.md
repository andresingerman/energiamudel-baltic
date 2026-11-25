# A wrong year now and then in Node: V8's Maglev compiler (2026-10-19)

**Question** (the owner's "the release of 3 November, reliable", the night of 2026-10-18/19): why does the
worker test fail now and then, what does it mean for the published figures and for the live site, and
what is done about it (D-144)?

## Short answer

- **Node 26.4.0** (V8 14.6.202.34-node.21) computes a year wrong now and then under load while V8's
  mid-tier optimising compiler, **Maglev**, is on: 10 of 140 runs of the worker test. With
  `--no-maglev` the same load gave **no wrong year in 400 runs**.
- The wrong values are **other objects' fields**: a unit with another unit's CO₂ intensity, class or
  capacity, a store list with Kruonis where Lithuania's battery belongs. That is a read compiled wrong,
  not a race of ours: the main thread, which shares no memory with the workers, failed as well, and no
  code of ours writes those fields after the build.
- **The browsers did not show it:** Chrome 155 (V8 15.5) and WebKit 26.5 (Safari's engine) gave every
  year equal to the calm references (§4).
- **The published sets are clean:** recomputed without Maglev, every opening and presentation set equals
  the live site's (§5).
- Every engine run in Node now goes without Maglev, and the Node solver loader stops a run started
  without the flag (D-144).

## 1. Method

The worker test (`app/test/worker.test.ts`; `spikes/maglev-hazard/loop.sh` runs it in copies)
computes three years of cy2009 — 2 SMR, its sensitivity (d) (gas at the 2026-09 shock level) and (b)
(slow build, Poland's floor) — through the pool of three Node workers and again as a whole year on the
main thread, and holds the two equal to the bit. Four copies ran at once on this Mac (Apple M1 Pro,
6 performance and 2 efficiency cores, 16 GB): twelve workers and four main threads, the load under
which it had failed before. A second version of the test compared each side with calm references
computed alone (2 SMR's equals the golden fixture's digest) and dumped any mismatch, to tell which side
was wrong.

## 2. Results

| Node's flags | runs of the test | runs with a wrong year | year-runs |
|---|---:|---:|---:|
| default (Maglev on) | 140 | 10 (7 %) | 840 |
| `--no-maglev` | 400 | 0 | 2 400 |

Each run computes six year-runs: three cases, by the pool and on the main thread. With a failure rate of
7 % per run, 400 clean runs by chance have a probability under 10⁻¹².

The ten wrong years:

| times | case | side | what was wrong |
|---:|---|---|---|
| 6 | (d) | main thread | Estonia's CO₂ 1.010 or 0.471 Mt against 0.421; prices and dispatch identical |
| 1 | 2 SMR | pool | Latvia's Daugava cascade with solar's class and capacity (1 360 MW against 1 592): no hydro all year |
| 1 | 2 SMR | pool | the store list with Kruonis in Lithuania's battery's place, and Kruonis again after it |
| 1 | (d) | pool | the first clearing's part with five stores against the problem's four (the engine stopped, naming them) |
| 1 | (d) | pool | Estonia's prices different in 85 hours (by up to 35.7 €/MWh; the average 96.02 against 95.98) |

The same signature was seen twice before: on the night of 2026-10-18 a cache of built problems gave
Auvere's CO₂ intensity (0.923 t/MWh) on biomass and gas units in 3 of 10 runs, never with `--no-maglev`
(the cache was dropped, D-128); on 2026-10-18 the store-count failure came twice in about 240 runs.

## 3. Why it is the compiler

- A wrong field is read from another object of the same shape — a pattern of a load the optimising
  compiler wrongly treats as known.
- It fails on the main thread too, where nothing is shared: the workers get copies by `postMessage`.
- It needs load and repetition: a single run, and the golden fixture's fresh process in a fixed order,
  do not show it.
- Turning off one compiler tier, and nothing else, ends it. Turbofan, V8's top tier, stays on: hot code
  is still optimised.

Not done: a minimal reproduction for V8's issue tracker. The failure needs the whole engine under load,
about once in fourteen runs, and Node's next V8 may well not have it. On an upgrade of Node, run the
worker test 400 times with Maglev (`spikes/maglev-hazard/loop.sh`, its README) before dropping the flag.

## 4. The browsers

`app/stress.html` (scratch, not committed) computes the same three cases N times in the page's own pool
and hashes each year as the references were hashed.

| browser | pages × rounds × cases | workers | years equal to the references |
|---|---|---:|---:|
| headless Chrome 155.0.8059.84 (V8 15.5) | 2 × 40 × 3 | 7 per page | 240 of 240 |
| Playwright's WebKit 26.5 (JavaScriptCore) | 2 × 40 × 3, a browser each | 7 per page | 240 of 240 |

The night of 2026-10-18 had run 60 changes of the built site in headless Chrome (about 2 400 year-runs)
without a failed year. Firefox was not tried. The live site's risk is low, and the browsers' engines
are not the one with the fault; nothing changes there.

## 5. The published sets

The deploy computes the opening view and the presentation's sets in Node (`scripts/opening.ts`,
D-126, D-129) — with Maglev on until now. They were recomputed without Maglev and compared with the
live site's (`scripts/compare_sets.ts`, against the sets of 5c7f802 as served): the opening view and all
57 presentation sets are the same, field for field (216 year-runs, 92 s on seven workers). The deck's
figures come from `spikes/presentation-2026-11/figures.ts` in Node and matched the site's; they are
computed again at the freeze, without Maglev. The research of 2026-10-18 on the plant's robustness ran
3 600 year-runs with Maglev on; it is checked in the night report.

## 6. What changes (D-144)

- `--no-maglev` on every Node engine run: the tests, golden, golden:jsc, bench and replay
  (`app/package.json`), gap, validate and the deploy's precompute (`Makefile`), and the fit
  (`validate/fit.py`).
- `app/scripts/highs.ts`, which every engine run in Node loads, throws when the flag is missing.
- Cost: about 3 % more CPU and no more time: the site's precompute, 216 year-runs on seven workers,
  took 92 s without Maglev and 93 s with it (CPU 592 s against 573 s); golden 5.7 s against 5.6 s.
