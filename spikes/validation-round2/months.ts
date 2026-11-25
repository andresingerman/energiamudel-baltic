// Hourly MAE and bias by month and zone of a replay, with the month's observed mean price.
// From app/: `node --no-maglev ../spikes/validation-round2/months.ts 2024`.
import { build, monthOfHour } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const yr = process.argv[2] ?? "2025";
const { solve } = await loadSolver();
const p = presets() as any, y = year(yr), v = validation(yr) as any;
const pb = build(y, p, null, replay(p, y));
const r = runLP(pb, solve);
const month = monthOfHour(pb.hours, Number(yr), true);
console.log(`${yr}: month | per zone MAE (bias) | observed mean EE / LT | hours above 150 observed / model (LT)`);
for (let m = 0; m < 12; m++) {
  const cells: string[] = [];
  let n = 0, oe = 0, ol = 0, ho = 0, hm = 0;
  ZONES.forEach((z, i) => {
    let a = 0, b = 0, k = 0;
    for (let h = 0; h < pb.hours; h++) if (month[h] === m && v.price[z][h] !== null) { const d = r.price[i][h] - v.price[z][h]; a += Math.abs(d); b += d; k++; }
    cells.push(k ? `${(a / k).toFixed(1)} (${(b / k >= 0 ? "+" : "") + (b / k).toFixed(1)})` : "-");
  });
  for (let h = 0; h < pb.hours; h++) if (month[h] === m) { n++; oe += v.price.EE[h]; ol += v.price.LT[h]; if (v.price.LT[h] >= 150) ho++; if (r.price[2][h] >= 150) hm++; }
  if (n) console.log(`  ${String(m + 1).padStart(2)} | ${cells.join(" | ")} | ${(oe / n).toFixed(0)} / ${(ol / n).toFixed(0)} | ${ho} / ${hm}`);
}
