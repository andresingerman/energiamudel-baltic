// The golden fixture's cases (R-VAL-8, R-NFR-5), run alike in V8 (scripts/golden.ts) and in
// JavaScriptCore (scripts/jsc/golden.ts), all on the engine of record (the two-pass engine's went
// with it, D-132): a synthetic week (frozen for good) and the 2024 replay; and, pinned before the
// speed-ups of D-128, the opening view's climate year 2009 as the page's worker builds it
// (`scenarioOf`, src/worker/assemble.ts) — 0 SMR and 2 SMR whole, and 2 SMR's sensitivity (a),
// the only path with electrolysis demand and Poland's floor, on nine weeks and a day as
// split.test.ts slices it.
import type { Links } from "../src/contract/links.ts";
import type { Presets } from "../src/contract/presets.ts";
import type { Year } from "../src/contract/year.ts";
import { build } from "../src/engine/build.ts";
import type { Results } from "../src/engine/index.ts";
import type { LpSolver } from "../src/engine/lp.ts";
import { runLP } from "../src/engine/lp.ts";
import type { Problem } from "../src/engine/problem.ts";
import { slice } from "../src/engine/problem.ts";
import type { ScenarioId, Sensitivity } from "../src/state/model.ts";
import { opening, slowBuild, slowBuildPl } from "../src/state/model.ts";
import { replay } from "../src/state/scenario.ts";
import { scenarioOf } from "../src/worker/assemble.ts";
import { randomProblem } from "../test/toy.ts";

const WEEKS = 168 * 9 + 24;

/** Every array a run returns, in the order the digests hash them (scripts/digest.ts, and
 * scripts/jsc/golden.ts in JavaScriptCore): the Daugava's water value, its spill and the water it
 * left since D-133; the two-pass engine's price repeated and stores' empty schedule gone (D-138). */
export function arrays(r: Results): (Float64Array | Uint8Array)[] {
  const out: (Float64Array | Uint8Array)[] = [...r.price, ...r.shed, ...r.spill, ...r.flow, ...r.sat, ...r.offers.flat()];
  for (const u of r.units) out.push(u.charge, u.discharge, u.energy);
  if (r.reservoir) out.push(r.reservoir.release, r.reservoir.value, Float64Array.of(r.reservoir.spilled, r.reservoir.leftMwh));
  return out;
}

export function goldenRuns(p: Presets, year: (key: string) => Year, links: Links, solve: LpSolver): Record<string, () => Results> {
  const synthetic = (): Problem => randomProblem(2024, 168);
  const replay2024 = (): Problem => {
    const y = year("2024");
    return build(y, p, null, replay(p, y));
  };
  // the slow build of the former sensitivity (a), kept as a case of its own since D-183
  const opening2009 = (id: ScenarioId, sens?: "a"): Problem => {
    const s = { ...opening(p), scenario: id };
    const x: Pick<Sensitivity, "state" | "gasFloor" | "meanFloor"> | null = sens ? { state: slowBuild(p, s, true), gasFloor: null, meanFloor: { PL: slowBuildPl(p) } } : null;
    const y = year("cy2009");
    return build(y, p, links, scenarioOf(p, y, x ? x.state : s, x ? x.gasFloor : null, x ? x.meanFloor : null));
  };
  return {
    synthetic_168h_record: () => runLP(synthetic(), solve),
    replay_2024_record: () => runLP(replay2024(), solve),
    opening_cy2009_gas_record: () => runLP(opening2009("gas"), solve),
    opening_cy2009_smr2_record: () => runLP(opening2009("smr2"), solve),
    opening_cy2009_smr2_sens_a_record: () => runLP(slice(opening2009("smr2", "a"), 0, WEEKS), solve),
  };
}
