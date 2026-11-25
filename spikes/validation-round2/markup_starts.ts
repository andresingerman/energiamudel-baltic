// The markup fit's descent (app/scripts/fit_markup.ts, D-023) from another starting schedule, to see
// whether the descent from zero stops at the least sum. From app/:
// `node --no-maglev ../spikes/validation-round2/markup_starts.ts 0,100,100,100` (the increments of every zone's
// four bins; or three groups separated by ';' for EE;LV;LT).
import type { PerZone } from "../../app/src/engine/build.ts";
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { mae } from "../../app/src/worker/metrics.ts";

const STEPS = [40, 20, 10, 5];
const { solve } = await loadSolver();
const p = presets();
const years = [2023, 2024].map((yr) => ({ y: year(String(yr)), v: validation(String(yr)) }));
const blind = { y: year("2025"), v: validation("2025") };
const cum = (d: PerZone<number[]>) => Object.fromEntries(ZONES.map((z) => [z, d[z].map((_, k) => d[z].slice(0, k + 1).reduce((a, x) => a + x, 0))])) as PerZone<number[]>;
function objective(d: PerZone<number[]>, set = years): number {
  let j = 0;
  for (const { y, v } of set) {
    const r = runLP(build(y, p, null, { ...replay(p, y), markup: cum(d) }), solve);
    ZONES.forEach((z, i) => { j += mae(r.price[i], v.price[z]); });
  }
  return j;
}
const groups = (process.argv[2] ?? "0,0,0,0").split(";").map((g) => g.split(",").map(Number));
let d = Object.fromEntries(ZONES.map((z, i) => [z, [...(groups[i] ?? groups[0])]])) as PerZone<number[]>;
let best = objective(d);
const start = best;
let n = 1;
for (const step of STEPS) {
  let improved = true;
  while (improved) {
    improved = false;
    for (const z of ZONES) for (let k = 0; k < 4; k++) for (const sign of [1, -1]) {
      const x = d[z][k] + sign * step;
      if (x < 0) continue;
      const trial = { ...d, [z]: d[z].map((v, i) => (i === k ? x : v)) } as PerZone<number[]>;
      const j = objective(trial); n++;
      if (j < best - 0.01) { best = j; d = trial; improved = true; }
    }
  }
}
console.log(`start ${process.argv[2] ?? "0"}: fit years ${start.toFixed(2)} → ${best.toFixed(2)} in ${n} runs; schedule ${JSON.stringify(cum(d))}; blind year ${objective(d, [blind]).toFixed(2)}`);
