// A replay with the balancing reservation (R-LINK-5) not taken off the capacity of the borders
// named, against the replay as it stands: MAE per zone, and the share of hours the model parts
// the two prices of each internal border against the record's.
// From app/: `node --no-maglev ../spikes/validation-round2/reserve.ts 2026 LV-LT [EE-LV]`.
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const [yr, ...codes] = process.argv.slice(2);
const { solve } = await loadSolver();
const p = presets() as any, y = year(yr) as any, v = validation(yr) as any;
const sc = replay(p, y);
const report = (label: string) => {
  const pb = build(y, p, null, sc), r = runLP(pb, solve);
  const mae = ZONES.map((z, i) => {
    let a = 0, k = 0;
    for (let h = 0; h < pb.hours; h++) if (v.price[z][h] !== null) { a += Math.abs(r.price[i][h] - v.price[z][h]); k++; }
    return (a / k).toFixed(2);
  });
  const apart = [0, 1].map((i) => {
    let m = 0, o = 0, n = 0;
    for (let h = 0; h < pb.hours; h++) {
      const a = v.price[ZONES[i]][h], b = v.price[ZONES[i + 1]][h];
      if (a === null || b === null) continue;
      n++; if (Math.abs(a - b) > 0.02) o++; if (Math.abs(r.price[i][h] - r.price[i + 1][h]) > 0.02) m++;
    }
    return `${(100 * m / n).toFixed(0)} / ${(100 * o / n).toFixed(0)} %`;
  });
  console.log(`${yr} ${label}: MAE ${mae.join(" / ")}; prices apart, model / record: EE–LV ${apart[0]}, LV–LT ${apart[1]}`);
};
report("as it stands");
for (const c of codes) { delete y.borders[c].reserved_fwd; delete y.borders[c].reserved_rev; }
report(`no reservation taken off ${codes.join(", ")}`);
