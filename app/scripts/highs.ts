// The HiGHS solver for the engine of record in Node (tests, scripts, calibration): highs-js, the
// same WebAssembly build the browser's workers load, with the same options (src/worker/solver.ts).
// the package ships ESM (build/highs.mjs) with CommonJS-style types, so TypeScript does not see
// that the module's default export is the loader
import * as highsModule from "highs";
import type { Highs } from "highs";
import type { LpSolver } from "../src/engine/lp.ts";
import { makeSolver } from "../src/worker/solver.ts";

const highsLoader = (highsModule as unknown as { default: () => Promise<Highs> }).default;

// V8's Maglev compiler in Node 26.4 (V8 14.6) now and then compiles the engine wrong under load: a year
// comes out with another unit's figures and nothing fails (D-144). Every engine run in Node goes without
// it, and a script started without the flag stops here rather than compute.
if (!process.execArgv.includes("--no-maglev")) throw new Error("the engine runs in Node with --no-maglev (D-144): node --no-maglev …");

export async function loadSolver(): Promise<{ solve: LpSolver; version: string }> {
  const highs = await highsLoader();
  return { solve: makeSolver(highs), version: highs.version.string };
}
