// The gas plants' one bid (SPECIFICATION.md R-SUP-6 revision 2.30; docs/methodology.md §7; DECISIONS
// D-073, D-115, D-164): every gas offer of Estonia, Latvia and Lithuania bids a combined-cycle plant's
// cost plus one adder m, the same in every hour and country (build.ts `applyGasBid`). Each fit year
// gives its own m — the sum of the three zones' hourly price MAE of that year, replayed with the engine
// of record, on a grid of 10 €/MWh from 0 to 150 and then of 2.5 €/MWh around its best — and is scored
// on the other; the register takes the average of the two, as it took the ladder's (D-073). As since
// D-115, m is fitted at each step of a grid of Kruonis's step — what each further quarter of its output
// in an hour costs above the last (build.ts kruonisSteps) — and the step whose register fits the two
// years best is kept. `--objective=bias` adds each zone's |average bias| to its MAE and `--objective=dur`
// its duration-curve RMSE (measured in the calibration round of 2026-10-11; the register's is the MAE).
// `node --no-maglev scripts/fit_gas_bid.ts` prints the adder and the step as JSON; validate/fit.py records them with
// their lineage (R-PROV-4). Observed prices come from the validation files only. The grid's steps run on
// worker threads, one each.
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { GAS_REFERENCE, KRUONIS_SEGMENTS, build } from "../src/engine/build.ts";
import { runLP } from "../src/engine/lp.ts";
import { ZONES } from "../src/engine/problem.ts";
import { replay } from "../src/state/scenario.ts";
import { presets, validation, year } from "./data.ts";
import { loadSolver } from "./highs.ts";
import { FIT_YEARS, durationRmse, mae, mean } from "../src/worker/metrics.ts";

const OBJECTIVES = ["mae", "bias", "dur"] as const;
type Objective = (typeof OBJECTIVES)[number];
const OBJECTIVE: Objective = isMainThread
  ? ((process.argv.find((a) => a.startsWith("--objective="))?.slice(12) ?? "mae") as Objective)
  : (workerData as { objective: Objective }).objective;
if (!OBJECTIVES.includes(OBJECTIVE)) throw new Error(`objective ${OBJECTIVE}: one of ${OBJECTIVES.join(", ")}`);
/** A zone's term of the objective: its hourly MAE, plus its |average bias| or its duration-curve RMSE. */
const term = (model: ArrayLike<number>, obs: ArrayLike<number>): number =>
  mae(model, obs) + (OBJECTIVE === "bias" ? Math.abs(mean(model) - mean(obs)) : OBJECTIVE === "dur" ? durationRmse(model, obs) : 0);
/** Kruonis's step, €/MWh (D-115). */
const STEP_GRID = [0, 15, 30, 45, 60, 90];
/** The coarse grid of the adder, €/MWh, and the fine step around its best. */
const COARSE = Array.from({ length: 16 }, (_, i) => 10 * i);
const FINE = 2.5;

const { solve } = await loadSolver();
const p = presets();
const years = FIT_YEARS.map((yr) => ({ yr, y: year(String(yr)), v: validation(String(yr)) }));
let evaluations = 0;

/** The objective over `set` — the sum of the three zones' terms — with the adder `m` and Kruonis's step `step`. */
function objective(m: number, step: number, set: typeof years): number {
  evaluations++;
  let j = 0;
  for (const { y, v } of set) {
    const r = runLP(build(y, p, null, { ...replay(p, y), gasAdder: m, kruonisStep: step }), solve);
    ZONES.forEach((z, i) => { j += term(r.price[i], v.price[z]); });
  }
  return j;
}

/** One fit year's best adder at Kruonis's `step`: the coarse grid, then the fine one within a coarse step of its best. */
function best(set: typeof years, step: number): number {
  const at = new Map<number, number>();
  const f = (m: number) => { if (!at.has(m)) at.set(m, objective(m, step, set)); return at.get(m)!; };
  const c = COARSE.reduce((a, m) => (f(m) < f(a) ? m : a));
  let m0 = c;
  for (let m = Math.max(0, c - 10 + FINE); m < c + 10; m += FINE) if (f(m) < f(m0) - 1e-9) m0 = m;
  return m0;
}

const round2 = (x: number) => Math.round(x * 100) / 100;
/** At one step of Kruonis: each fit year's adder, scored on it and on the other, and the register's
 * (their average) sum over both. The `mae_sum_*` fields, which validate/fit.py records, hold the
 * objective's value: the MAE's sum under the default, the sum with the bias or the duration curve's
 * RMSE under `--objective=bias|dur`. */
function fitAt(step: number) {
  const folds = years.map((fold) => {
    const m = best([fold], step);
    const rest = years.filter((y) => y !== fold);
    return { year: fold.yr, eur_mwh: m, mae_sum_fitted: round2(objective(m, step, [fold])), mae_sum_left_out: round2(objective(m, step, rest)) };
  });
  const m = folds.reduce((a, f) => a + f.eur_mwh, 0) / folds.length;
  return { step, folds, eur_mwh: m, mae_sum_after: round2(objective(m, step, years)) };
}
type Fit = ReturnType<typeof fitAt> & { evaluations: number };
if (!isMainThread) parentPort!.postMessage({ ...fitAt((workerData as { step: number }).step), evaluations });
else {
  const grid = await Promise.all(STEP_GRID.map((step) => new Promise<Fit>((ok, no) => {
    const w = new Worker(new URL(import.meta.url), { workerData: { step, objective: OBJECTIVE } });
    w.once("message", ok);
    w.once("error", no);
    w.once("exit", (code) => { if (code) no(new Error(`the fit at Kruonis's step ${step} exited with ${code}`)); });
  })));
  evaluations += grid.reduce((a, g) => a + g.evaluations, 0);
  const top = grid.reduce((a, g) => (g.mae_sum_after < a.mae_sum_after ? g : a));
  console.log(JSON.stringify({
    reference: GAS_REFERENCE, years: FIT_YEARS,
    objective: OBJECTIVE === "mae" ? "sum of the three zones' hourly price MAE"
      : `sum of the three zones' hourly price MAE and ${OBJECTIVE === "bias" ? "|average bias|" : "duration-curve RMSE"}`,
    mae_sum_before: round2(objective(0, 0, years)), mae_sum_after: top.mae_sum_after,
    mae_sum_left_out: round2(top.folds.reduce((a, f) => a + f.mae_sum_left_out, 0)), folds: top.folds, evaluations,
    eur_mwh: top.eur_mwh,
    kruonis_step_eur_mwh: top.step, kruonis_segments: KRUONIS_SEGMENTS,
    kruonis_step_grid: grid.map((g) => ({ step: g.step, eur_mwh: g.eur_mwh, mae_sum: g.mae_sum_after })),
  }));
}
