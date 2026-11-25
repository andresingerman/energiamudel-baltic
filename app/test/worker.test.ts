// The pool's jobs as the page sends them, end to end (D-114, D-128): Node workers running the browser's
// job handler (scripts/lp_worker.ts → src/worker/job.ts) through the real Pool and runYear give, for a
// scenario year and for its sensitivities with a gas floor and with Poland's floor, the view a
// whole-year run of the engine of record gives on one thread, to the bit — the guard for every change
// to how the jobs are scheduled, cached or split.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/engine/build.ts";
import { runLP } from "../src/engine/lp.ts";
import type { Sensitivity, State } from "../src/state/model.ts";
import { opening } from "../src/state/model.ts";
import { assemble, scenarioOf } from "../src/worker/assemble.ts";
import { runYear } from "../src/worker/pool.ts";
import type { Reply } from "../src/worker/job.ts";
import { links, presets, year } from "../scripts/data.ts";
import { loadSolver } from "../scripts/highs.ts";
import { nodePool } from "../scripts/node_pool.ts";

const p = presets();
const { solve } = await loadSolver();
const KEY = "cy2009";

/** The year as one thread computes it whole: build, the engine of record, the view. */
function whole(state: State, gasFloor: number | null, meanFloor: Sensitivity["meanFloor"]) {
  const y = year(KEY);
  const sc = scenarioOf(p, y, state, gasFloor, meanFloor);
  const pb = build(y, p, links(), sc);
  return assemble(p, y, KEY, sc, pb, runLP(pb, solve));
}

test("a year's jobs on Node workers through the pool are the whole year's view to the bit: a scenario, its gas floor, Poland's floor (D-128)", async () => {
  const { pool, close } = nodePool(3);
  try {
    const s = { ...opening(p), scenario: "smr2" as const };
    // the engine's gas floor and Poland's floor, which sensitivities (d) and (b) carried until D-183
    const d = { state: s, gasFloor: 100 }, b = { state: s, meanFloor: { PL: 77.8 } };
    // each worker first warmed as the page warms it under a view computed before (D-146): a week
    // cleared and dropped must leave nothing that the years after it could see
    await Promise.all([0, 1, 2].map(() => pool.run({ base: "", key: KEY, warm: [KEY], state: s, tag: "warm" }, 3)));
    for (const [what, state, gasFloor, meanFloor] of [["2 SMR", s, null, null], ["2 SMR with a gas floor", d.state, d.gasFloor, null],
      ["2 SMR with Poland's floor", b.state, null, b.meanFloor]] as const) {
      const got = await runYear<Reply>(pool, { base: "", key: KEY, state, gasFloor, meanFloor });
      assert.ok("view" in got, `${what}: ${JSON.stringify(got).slice(0, 200)}`);
      const want = whole(state, gasFloor, meanFloor);
      assert.deepStrictEqual({ view: got.view, labels: got.labels, inputs: got.inputs }, want, what);
    }
  } finally {
    await close();
  }
});
