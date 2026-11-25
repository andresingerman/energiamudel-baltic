// The register refitted on a clearing (the night of 2026-10-11): the markup as app/scripts/
// fit_markup.ts fits it — a schedule per fit year by coordinate descent from zero on the increments
// (steps 40, 20, 10, 5 €/MWh), scored on the sum of the three zones' MAE, the register their average
// — and Δ as app/scripts/fit_delta.ts does, bisection on Estonia's 2026 discharge against A75 (mFRR
// share 0, D-025); then every year scored with it. Both scripts are copied, not imported, because
// they run on import. `node --no-maglev spikes/foresight/refit.ts <variant>` with variant `weekly` (the engine of
// record, a check that this reproduces the register: 42.5 / 197.5 / 317.5 / 337.5, Δ 69.5) or
// `W/C` (runRolling, window W, commit C, budgets shared); either followed by `+stay4` or `+minon`
// clears in two passes with oil shale committed by the day (spikes/commitment/commit.ts: a campaign
// that stays on while four hours pay, or the minimum time on with a warm start), `+engine` with the
// engine's own entry (D-113; `weekly+engine` on the weekly programme, `48/24+engine` the engine of
// record). A third argument, `m1,m2,m3,m4,Δ`, scores that register without fitting it (the re-score
// of ERRATA E-141, whose fix moves generation and no price). JSON on stdout, progress on stderr.
import { MARKUP_EDGES, build } from "../../app/src/engine/build.ts";
import type { Results } from "../../app/src/engine/index.ts";
import { WEEKLY, runLP } from "../../app/src/engine/lp.ts";
import type { Problem } from "../../app/src/engine/problem.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { mae } from "../../app/src/worker/metrics.ts";
import { presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { twoPass } from "../commitment/commit.ts";
import type { CommitOptions } from "../commitment/commit.ts";
import { runRolling } from "./rolling.ts";
import type { Row } from "./score.ts";
import { YEARS, scoreYear, table } from "./score.ts";

const { solve } = await loadSolver();
const p = presets();
const arg = process.argv[2] ?? "weekly";
const given = process.argv[3]?.split(",").map(Number) ?? null;
const [engine, entry] = arg.split("+");
// the problem as built carries oil shale's entry since D-113, which runLP clears in two passes:
// a variant without it, or with the prototype's rule, clears the problem without it
const base: (pb: Problem) => Results = engine === "weekly"
  ? (pb) => runLP({ ...pb, entry: null }, solve, WEEKLY)
  : (() => { const [w, c] = engine.split("/").map(Number); return (pb: Problem) => runRolling({ ...pb, entry: null }, solve, { window: w, commit: c, share: true }); })();
const ENTRY: Record<string, CommitOptions> = { stay4: { startCost: true, rule: "stay", stayHours: 4 }, minon: { startCost: true, rule: "minOn" } };
const clear: (pb: Problem) => Results = entry === "engine"
  ? (engine === "weekly" ? (pb) => runLP(pb, solve, WEEKLY) : (pb) => runLP(pb, solve))
  : entry ? (pb) => twoPass({ ...pb, entry: null }, p, base, ENTRY[entry]) : base;

const BINS = MARKUP_EDGES.length - 1;
const STEPS = [40, 20, 10, 5];
const perZone = (m: number[]) => Object.fromEntries(ZONES.map((z) => [z, z === "EE" ? m.map(() => 0) : m]));
const cumulative = (d: number[]) => d.map((_, k) => d.slice(0, k + 1).reduce((a, x) => a + x, 0));

function runYear(yr: number, m: number[], delta: number | null) {
  const y = year(String(yr));
  const sc = replay(p, y);
  const pb = build(y, p, null, { ...sc, markup: perZone(m) as never, battery: delta === null ? sc.battery : { ...sc.battery, delta } });
  return { pb, r: clear(pb), boundary: { FI: y.boundary.FI.observed, SE4: y.boundary.SE4.observed, PL: y.boundary.PL.observed } };
}

let evaluations = 0;
function objective(m: number[], set: number[]): number {
  evaluations++;
  let j = 0;
  for (const yr of set) {
    const v = validation(String(yr));
    const { r } = runYear(yr, m, null);
    ZONES.forEach((z, i) => { j += mae(r.price[i], v.price[z]); });
  }
  return j;
}

function descend(set: number[]): number[] {
  let d = new Array<number>(BINS).fill(0);
  let best = objective(cumulative(d), set);
  for (const step of STEPS) {
    let improved = true;
    while (improved) {
      improved = false;
      for (let k = 0; k < BINS; k++) {
        for (const sign of [1, -1]) {
          const x = d[k] + sign * step;
          if (x < 0) continue;
          const trial = d.map((v, i) => (i === k ? x : v));
          const j = objective(cumulative(trial), set);
          if (j < best - 0.01) { best = j; d = trial; improved = true; console.error(`${set.join("+")}, step ${step}: bin ${k} → ${x}; sum of MAE ${best.toFixed(2)} (${evaluations} runs)`); }
        }
      }
    }
  }
  return cumulative(d);
}

const folds = given ? null : [2023, 2024].map((yr) => ({ year: yr, schedule: descend([yr]) }));
const markup = given ? given.slice(0, BINS) : folds![0].schedule.map((_, k) => (folds![0].schedule[k] + folds![1].schedule[k]) / 2);

// Δ: Estonia's 2026 discharge against A75 from the week of the first report
const obs = validation("2026").gen.EE.battery!;
const first = obs.findIndex((x) => x > 0);
const from = first - (first % 168);
let observed = 0;
for (let h = from; h < obs.length; h++) observed += obs[h];
const discharge = (delta: number) => {
  const { pb, r } = runYear(2026, markup, delta);
  const u = r.units.find((x) => x.name === "battery:EE")!;
  let s = 0;
  for (let h = from; h < pb.hours; h++) s += u.discharge[h];
  return s;
};
let lo = 0, hi = 300;
if (given) lo = hi = given[BINS];
else if (discharge(lo) < observed) hi = lo;
else if (discharge(hi) > observed) lo = hi;
else for (let it = 0; it < 30 && hi - lo > 0.25; it++) { const mid = (lo + hi) / 2; if (discharge(mid) > observed) lo = mid; else hi = mid; }
const delta = Math.round(((lo + hi) / 2) * 2) / 2;

const rows: Row[] = YEARS.map((yr) => { const { pb, r, boundary } = runYear(yr, markup, delta); return scoreYear(yr, pb, r, boundary); });
console.error(table(rows, `${arg} refitted`));
console.log(JSON.stringify({ variant: arg, folds, markup, delta, evaluations, rows }, null, 1));
