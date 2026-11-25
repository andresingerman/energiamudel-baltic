// One more round of commitment (the night of 2026-10-11): units decided on pass 2's price, the one
// their absence made, then cleared again; and a committed unit offering at its cost, the entry
// premium left to the decision to come on. On the register refitted for 48/24 + min-on (the markup
// 37.5 / 150 / 240 / 260, Δ 71), against one round at the entry price. `node
// spikes/commitment/rounds.ts` — JSON on stdout, the tables on stderr.
import { build } from "../../app/src/engine/build.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { presets, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { runRolling } from "../foresight/rolling.ts";
import { scoreYear, table, YEARS } from "../foresight/score.ts";
import { twoPass } from "./commit.ts";

const { solve } = await loadSolver();
const p = presets();
const perZone = (m: number[]) => Object.fromEntries(ZONES.map((z) => [z, z === "EE" ? m.map(() => 0) : m]));
const out: Record<string, unknown> = {};
for (const [rounds, atCost, label] of [[1, false, "one round"], [2, false, "two rounds"], [1, true, "dispatch at cost"]] as const) {
  const rows = YEARS.map((yr) => {
    const y = year(String(yr));
    const sc = replay(p, y);
    const pb = build(y, p, null, { ...sc, markup: perZone([37.5, 150, 240, 260]) as never, battery: { ...sc.battery, delta: 71 } });
    const r = twoPass({ ...pb, entry: null }, p, (q) => runRolling(q, solve, { window: 48, commit: 24, share: true }), { startCost: true, rule: "minOn", dispatchAtCost: atCost }, rounds);
    return scoreYear(yr, pb, r, { FI: y.boundary.FI.observed, SE4: y.boundary.SE4.observed, PL: y.boundary.PL.observed });
  });
  console.error(table(rows, label));
  out[label] = rows;
}
console.log(JSON.stringify(out, null, 1));
