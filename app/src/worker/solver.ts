// HiGHS for the engine of record, in the browser's workers and in Node alike (R-ENG-8, R-ENG-9;
// DECISIONS D-021): the options are HiGHS's defaults written out, as reference/lp.py writes
// them, so that another build with other defaults cannot change a result unnoticed — but presolve,
// off since D-130 (signed off by the owner, D-131): a day's programme is small, and presolving it cost
// more than it saved.
import type { Highs } from "highs";
import type { LpModel, LpSolver } from "../engine/lp.ts";

export const OPTIONS = {
  solver: "choose",
  presolve: "off",
  run_crossover: "on",
  random_seed: 0,
  primal_feasibility_tolerance: 1e-7,
  dual_feasibility_tolerance: 1e-7,
  output_flag: false,
} as const;

export function makeSolver(highs: Highs): LpSolver {
  const optimal = highs.constants.modelStatus.optimal;
  const once = (m: LpModel, options: Readonly<Record<string, string | number | boolean>>) => {
    const model = highs.createModel();
    try {
      model.options.set(options);
      model.passModel({
        numCols: m.numCols, numRows: m.numRows,
        colCost: m.colCost, colLower: m.colLower, colUpper: m.colUpper,
        rowLower: m.rowLower, rowUpper: m.rowUpper,
        matrix: { format: "csc", numRows: m.numRows, numCols: m.numCols, starts: m.starts, indices: m.index, values: m.value },
      });
      const run = model.run();
      const sol = model.getSolution();
      return { optimal: run.modelStatus === optimal, status: String(run.modelStatus), colValue: sol.colValue, rowDual: sol.rowDual };
    } finally {
      model.dispose();
    }
  };
  // a programme the simplex leaves unsolved without presolve (status 15, now and then where the fit
  // explores) is solved again as before D-130, so that no setting the panel allows fails (D-130)
  return (m: LpModel) => {
    const first = once(m, OPTIONS);
    return first.optimal ? first : once(m, { ...OPTIONS, presolve: "choose" });
  };
}
