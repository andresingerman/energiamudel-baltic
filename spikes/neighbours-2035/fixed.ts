// A coupled run's opening-scenario series held fixed in every scenario, as an app profile holds them
// (docs/research/2026-10-12_sweden_poland_2035.md §8, D-121): Estonia's average, the plant's capture
// price and the CfD against the run's own coupled result. joint.ts does this itself; this is for each.ts.
// From app/: `node --no-maglev ../spikes/neighbours-2035/fixed.ts each_C.json`.
import { readFileSync } from "node:fs";
import { SCENARIOS } from "../../app/src/state/model.ts";
import type { State } from "../../app/src/state/model.ts";
import { v5Run } from "../finland/v5.ts";
import { CYS, S0, weightOf } from "./cases.ts";
import { DIR } from "./tests.ts";

const run = JSON.parse(readFileSync(`${DIR}/${process.argv[2] ?? "each_C.json"}`, "utf8"));
const open = S0.scenario, series = run.series[open];
const num = (x: number | { mean: number }) => (typeof x === "number" ? x : x.mean);
for (const scen of SCENARIOS) {
  const rows = CYS.map((cy) => ({ cy, v: v5Run({ ...S0, scenario: scen } as State, `cy${cy}`, { FI: series[cy].FI, SE4: series[cy].SE4, PL: series[cy].PL }) }));
  const w = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + weightOf(r.cy) * f(r), 0);
  const o = (r: (typeof rows)[number]) => r.v.plant!.outputTwh;
  const c = run.result[scen], f = (x: number) => x.toFixed(1);
  const plant = rows[0].v.plant !== null ? ` | capture ${f(w((r) => r.v.plant!.captureEurMwh * o(r)) / w(o))} (coupled ${f(c.capture)}), CfD ${f(w((r) => r.v.plant!.stateMeur))} (coupled ${f(c.cfd)}) M€` : "";
  console.log(`${scen} with the ${open} series fixed: EE ${f(w((r) => r.v.mean[0]))} (coupled ${f(num(c.EE))})${plant}`);
}
