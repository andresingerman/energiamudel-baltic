// The night's candidates side by side (2026-10-11), each on the register refitted for it
// (refit.ts): the replays' R-VAL-5 breaches by name, and the opening state's four scenarios (the
// cables' losses off, D-045) as the application opens them. `node --no-maglev spikes/foresight/compare.ts`.
import { build } from "../../app/src/engine/build.ts";
import type { Results } from "../../app/src/engine/index.ts";
import { WEEKLY, runLP } from "../../app/src/engine/lp.ts";
import type { Problem } from "../../app/src/engine/problem.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { summarise } from "../../app/src/engine/results.ts";
import { SCENARIOS, engineScenario, opening, runsOf } from "../../app/src/state/model.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { links, presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { evaluate } from "../../app/scripts/validate_fit.ts";
import type { CommitOptions } from "../commitment/commit.ts";
import { twoPass } from "../commitment/commit.ts";
import { runRolling } from "./rolling.ts";

const { solve } = await loadSolver();
const p = presets();
const L = links();
interface Candidate { label: string; engine: "weekly" | "48/24"; entry: CommitOptions | null; markup: number[]; delta: number }
const STAY4: CommitOptions = { startCost: true, rule: "stay", stayHours: 4 };
const MINON: CommitOptions = { startCost: true, rule: "minOn" };
const C: Candidate[] = [
  { label: "weekly (D-111)", engine: "weekly", entry: null, markup: [42.5, 197.5, 317.5, 337.5], delta: 63.5 },
  { label: "48/24", engine: "48/24", entry: null, markup: [30, 142.5, 232.5, 252.5], delta: 63.5 },
  { label: "weekly+stay4", engine: "weekly", entry: STAY4, markup: [35, 192.5, 312.5, 352.5], delta: 70 },
  { label: "48/24+stay4", engine: "48/24", entry: STAY4, markup: [37.5, 150, 240, 260], delta: 69.5 },
  { label: "48/24+minon", engine: "48/24", entry: MINON, markup: [37.5, 150, 240, 260], delta: 71 },
];
const perZone = (m: number[]) => Object.fromEntries(ZONES.map((z) => [z, z === "EE" ? m.map(() => 0) : m]));
const clearer = (c: Candidate) => {
  // the problem as built carries the engine's entry since D-113: these candidates clear without it
  const base = c.engine === "weekly" ? (q: Problem) => runLP({ ...q, entry: null }, solve, WEEKLY) : (q: Problem) => runRolling({ ...q, entry: null }, solve, { window: 48, commit: 24, share: true });
  return c.entry ? (q: Problem) => twoPass({ ...q, entry: null }, p, base, c.entry!) : base;
};
const out: Record<string, unknown> = {};
for (const c of C) {
  const clear: (q: Problem) => Results = clearer(c);
  const breaches: Record<number, string[]> = {};
  for (const yr of [2023, 2024, 2025]) {
    const y = year(String(yr));
    const sc = replay(p, y);
    const pb = build(y, p, null, { ...sc, markup: perZone(c.markup) as never, battery: { ...sc.battery, delta: c.delta } });
    breaches[yr] = evaluate(yr, pb, clear(pb), validation(String(yr)), { FI: y.boundary.FI.observed, SE4: y.boundary.SE4.observed, PL: y.boundary.PL.observed }).failures;
  }
  // the opening state: each scenario's set weighted, Estonia / Latvia / Lithuania
  const s0 = opening(p);
  const scen: Record<string, number[]> = {};
  for (const id of SCENARIOS) {
    const s = { ...s0, scenario: id };
    const mean = [0, 0, 0];
    for (const r of runsOf(p, s)) {
      const y = year(r.key);
      const sc = engineScenario(p, y, s);
      const pb = build(y, p, L, { ...sc, markup: perZone(c.markup) as never, battery: { ...sc.battery, delta: c.delta }, losses: false });
      const sum = summarise(pb, clear(pb));
      sum.zones.forEach((z, i) => { mean[i] += z.price * r.weight; });
    }
    scen[id] = mean.map((x) => Math.round(x * 10) / 10);
  }
  console.error(`${c.label}: breaches ${[2023, 2024, 2025].map((y) => breaches[y].length).join("/")}; scenarios ${Object.entries(scen).map(([k, v]) => `${k} ${v.join("/")}`).join(" · ")}`);
  out[c.label] = { breaches, scenarios: scen };
}
console.log(JSON.stringify(out, null, 1));
