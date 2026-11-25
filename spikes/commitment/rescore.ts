// The prototype's rules scored again after ERRATA E-141 (2026-10-11): its two passes paired the
// committed problem's results with the problem as built, leaving the committed minimum load out of
// oil shale's output and the generation breaches. The fix moves no price: the sums of MAE must come
// out as `result.json` holds them. On D-111's register (the markup 42.5 / 197.5 / 317.5 / 337.5,
// Δ 63.5), the weekly programme, as `score_commit.ts` ran them. `node --no-maglev spikes/commitment/rescore.ts`
// — JSON on stdout, the tables on stderr.
import { build } from "../../app/src/engine/build.ts";
import { WEEKLY, runLP } from "../../app/src/engine/lp.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { presets, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { YEARS, scoreYear, table } from "../foresight/score.ts";
import type { CommitOptions } from "./commit.ts";
import { twoPass } from "./commit.ts";

const { solve } = await loadSolver();
const p = presets();
const perZone = (m: number[]) => Object.fromEntries(ZONES.map((z) => [z, z === "EE" ? m.map(() => 0) : m]));
const RULES: [string, string, CommitOptions][] = [
  ["commit_v1", "commit, no start cost", { startCost: false, rule: "minOn" }],
  ["commit_v1", "commit + warm start", { startCost: true, rule: "minOn" }],
  ["commit_v2", "profit rule", { startCost: true, rule: "profit" }],
  ["commit_v3", "stay while ≥1 h", { startCost: true, rule: "stay", stayHours: 1 }],
  ["commit_v3", "stay while ≥4 h", { startCost: true, rule: "stay", stayHours: 4 }],
];
const out: Record<string, Record<string, unknown>> = {};
for (const [run, label, o] of RULES) {
  const rows = YEARS.map((yr) => {
    const y = year(String(yr));
    const sc = replay(p, y);
    const pb = build(y, p, null, { ...sc, markup: perZone([42.5, 197.5, 317.5, 337.5]) as never, battery: { ...sc.battery, delta: 63.5 } });
    const r = twoPass({ ...pb, entry: null }, p, (q) => runLP({ ...q, entry: null }, solve, WEEKLY), o);
    return scoreYear(yr, pb, r, { FI: y.boundary.FI.observed, SE4: y.boundary.SE4.observed, PL: y.boundary.PL.observed });
  });
  console.error(table(rows, label));
  (out[run] ??= {})[label] = rows;
}
console.log(JSON.stringify(out, null, 1));
