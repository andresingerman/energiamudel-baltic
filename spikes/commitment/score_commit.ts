// Scores oil shale's market entry (commit.ts) on the night's scoreboard: the weekly programme of
// D-021 in two passes, under two of the rules, on the register of D-111 (not refitted).
// `node --no-maglev spikes/commitment/score_commit.ts` — JSON on stdout, the table on stderr.
import { WEEKLY, runLP } from "../../app/src/engine/lp.ts";
import { presets } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { score, table } from "../foresight/score.ts";
import { twoPass } from "./commit.ts";

const { solve } = await loadSolver();
const p = presets();
const out: Record<string, unknown> = {};
for (const [label, o] of [["stay while ≥1 h", { startCost: true, rule: "stay", stayHours: 1 }], ["stay while ≥4 h", { startCost: true, rule: "stay", stayHours: 4 }]] as const) {
  const rows = score((pb) => twoPass({ ...pb, entry: null }, p, (q) => runLP({ ...q, entry: null }, solve, WEEKLY), o));
  console.error(table(rows, label));
  out[label] = rows;
}
console.log(JSON.stringify(out, null, 1));
