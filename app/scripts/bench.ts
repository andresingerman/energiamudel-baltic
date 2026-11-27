// Time per run (R-ENG-7, revision 1.4): the engine of record on one thread and on four workers
// (≤ 2 s a year, ≤ 6 s a set of three years): `node --no-maglev scripts/bench.ts`, in Node's V8; the built site
// is timed apart (spikes/site-timing/).
// `node --no-maglev scripts/bench.ts --change [old]`: a change of a control as the page computes it (D-127), on
// the browser's pool and job handler (D-128) — `old` as the page did before D-127.
import { runLP } from "../src/engine/lp.ts";
import { loadSolver } from "./highs.ts";
import { make } from "./runs.ts";
import { Pool, runYear } from "../src/worker/pool.ts";
import type { ScenarioId, Sensitivity, State } from "../src/state/model.ts";
import { SCENARIOS, opening, runsOf, sensitivities } from "../src/state/model.ts";
import { scenarioOrder } from "../src/ui/wiring.ts";
import { presets } from "./data.ts";
import { nodePool } from "./node_pool.ts";
import { availableParallelism } from "node:os";

if (process.argv.includes("--change")) {
  // the three scenarios in scenarioOrder at the priorities i/4 (before D-127: SCENARIOS at 0), the time
  // to the scenario shown (a) and to all three (b); then its sensitivities at 1, with 0 SMR's
  // beside them when the plant is shown, to the last (c). Cold on fresh workers, then warm, Finland's
  // level moved each time so that nothing repeats.
  const old = process.argv.includes("old");
  const p = presets(), s0 = opening(p), n = Pool.size(availableParallelism());
  for (const shown of ["gas", "smr2"] as ScenarioId[]) {
    const { pool, close } = nodePool(n);
    const set = (s: State, gasFloor: number | null, meanFloor: Sensitivity["meanFloor"], priority: number) =>
      Promise.all(runsOf(p, s).map((r) => runYear(pool, { base: "", key: r.key, state: s, gasFloor, meanFloor }, priority)));
    const rows: string[] = [];
    for (const [i, level] of [1.05, 1.1, 1.15, 1.2].entries()) {
      const s: State = { ...s0, scenario: shown, level: { ...s0.level, FI: level } };
      const t0 = performance.now();
      let a = 0;
      await Promise.all((old ? SCENARIOS : scenarioOrder(shown)).map(async (id, k) => {
        await set({ ...s, scenario: id }, null, null, old ? 0 : k / 4);
        if (id === shown) a = performance.now() - t0;
      }));
      const b = performance.now() - t0;
      const sens = [...sensitivities(p, s), ...(shown === "gas" ? [] : sensitivities(p, { ...s, scenario: "gas" }))];
      await Promise.all(sens.map((x) => set(x.state, x.gasFloor, x.meanFloor, 1)));
      const c = performance.now() - t0;
      rows.push(`${i ? "warm" : "cold"} ${(a / 1000).toFixed(2)} / ${(b / 1000).toFixed(2)} / ${(c / 1000).toFixed(2)}`);
    }
    await close();
    console.log(`a change, ${shown} shown, ${old ? "before D-127" : "as the page computes it"}, on ${n} workers — the scenario shown / all three / the sensitivities, s: ${rows.join("; ")}`);
  }
  process.exit(0);
}

const { solve, version } = await loadSolver();

for (const name of ["2024", "cy2009"]) {
  const pb = make(name);
  const t = performance.now();
  runLP(pb, solve);
  const rec = performance.now() - t;
  console.log(`${name}: engine of record, one thread ${rec.toFixed(0)} ms (HiGHS ${version})`);
}

/** `runs` on `workers` Node workers through the browser's pool and `runYear` (D-114): each year's
 * clearings in as many parts as there are workers, then the year put together on one. A run is a
 * runs.ts name, or a year with the panel's state, built as the browser's worker builds it. */
async function parallel(runs: (string | { key: string; state: State })[], workers: number): Promise<number> {
  const t = performance.now();
  const { pool, close } = nodePool(workers);
  await Promise.all(runs.map((r) => runYear(pool, typeof r === "string" ? { key: r } : r)));
  await close();
  return performance.now() - t;
}
const note = "worker start, solver load and problem builds included";
const year24 = await parallel(["2024"], 4);
const year09 = await parallel(["cy2009"], 4);
const set = await parallel(["cy1995", "cy2008", "cy2009"], 4);
console.log(`engine of record, four workers: 2024 ${year24.toFixed(0)} ms; cy2009 ${year09.toFixed(0)} ms (${note})`);
console.log(`engine of record, four workers: the set cy1995, cy2008, cy2009 with ERAA 2035's fleet ${set.toFixed(0)} ms (${note})`);
// R-ENG-7, R-NFR-2: at most 2 s a year and 6 s a set of three years on four workers
const over = [[year24, 2000, "2024"], [year09, 2000, "cy2009"], [set, 6000, "the set"]].filter(([t, max]) => (t as number) > (max as number));
console.log(over.length ? `R-ENG-7: not met — ${over.map(([t, max, what]) => `${what} ${(t as number).toFixed(0)} ms > ${max}`).join("; ")}` : "R-ENG-7: met");
// the opening view: three scenarios on three climate years, on four workers and on the browser's
// pool of one less than the cores (D-114), the oil shale's two clearings among them
const s0 = opening(presets());
const view = SCENARIOS.flatMap((id) => runsOf(presets(), { ...s0, scenario: id }).map((r) => ({ key: r.key, state: { ...s0, scenario: id } })));
for (const w of [4, Pool.size(availableParallelism())]) console.log(`the opening view's ${view.length} years on ${w} workers: ${(await parallel(view, w)).toFixed(0)} ms (${note})`);
if (over.length) process.exit(1);
