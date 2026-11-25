// The markup's form chosen on the fit years alone: the descent of app/scripts/fit_markup.ts run on
// one fit year and scored on the other, for schedules per zone (12 parameters), one for Latvia and
// Lithuania with Estonia's own (8), one for the two with Estonia at zero (4), one for all three (4).
// From app/: `node --no-maglev ../spikes/validation-round2/markup_cv.ts <zone|lvlt|lvlt0|all> <fit years> <score years>`.
import type { PerZone } from "../../app/src/engine/build.ts";
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { mae } from "../../app/src/worker/metrics.ts";

const form = process.argv[2] ?? "zone";
const set = (s: string) => s.split(",").map((yr) => ({ yr, y: year(yr), v: validation(yr) }));
const fitSet = set(process.argv[3] ?? "2023,2024"), scoreSet = set(process.argv[4] ?? "2025");
const STEPS = [40, 20, 10, 5];
const { solve } = await loadSolver();
const p = presets();
// the free groups of increments and the zones each drives
const GROUPS: Record<string, string[][]> = { zone: [["EE"], ["LV"], ["LT"]], lvlt: [["EE"], ["LV", "LT"]], lvlt0: [["LV", "LT"]], all: [["EE", "LV", "LT"]] };
const groups = GROUPS[form];
const cum = (d: number[]) => d.map((_, k) => d.slice(0, k + 1).reduce((a, x) => a + x, 0));
const schedule = (d: number[][]): PerZone<number[]> => {
  const m = { EE: [0, 0, 0, 0], LV: [0, 0, 0, 0], LT: [0, 0, 0, 0] } as PerZone<number[]>;
  groups.forEach((g, i) => { for (const z of g) (m as Record<string, number[]>)[z] = cum(d[i]); });
  return m;
};
function score(m: PerZone<number[]>, on: typeof fitSet): { sum: number; by: string } {
  let sum = 0; const by: string[] = [];
  for (const { yr, y, v } of on) {
    const r = runLP(build(y, p, null, { ...replay(p, y), markup: m }), solve);
    const a = ZONES.map((z, i) => mae(r.price[i], v.price[z]));
    sum += a.reduce((x, c) => x + c, 0); by.push(`${yr}: ${a.map((x) => x.toFixed(2)).join(" / ")}`);
  }
  return { sum, by: by.join("; ") };
}
let d = groups.map(() => [0, 0, 0, 0]);
let best = score(schedule(d), fitSet).sum;
let n = 1;
for (const step of STEPS) {
  let improved = true;
  while (improved) {
    improved = false;
    for (let g = 0; g < groups.length; g++) for (let k = 0; k < 4; k++) for (const sign of [1, -1]) {
      const x = d[g][k] + sign * step;
      if (x < 0) continue;
      const trial = d.map((row, i) => (i === g ? row.map((v, j) => (j === k ? x : v)) : row));
      const j = score(schedule(trial), fitSet).sum; n++;
      if (j < best - 0.01) { best = j; d = trial; improved = true; }
    }
  }
}
const m = schedule(d);
const out = score(m, scoreSet);
console.log(`${form} fitted on ${fitSet.map((x) => x.yr).join("+")}: ${best.toFixed(2)} (${n} runs) ${JSON.stringify(m)} | scored on ${scoreSet.map((x) => x.yr).join("+")}: ${out.sum.toFixed(2)} [${out.by}]`);
