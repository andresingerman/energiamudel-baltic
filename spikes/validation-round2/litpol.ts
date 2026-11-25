// The Lithuania–Poland link in a replay: hours by what the record did on it (at the import limit,
// at the export limit, inside both with LT = PL within 1 €/MWh, inside both with the prices apart)
// and the model's Lithuanian error in each. From app/: `node --no-maglev ../spikes/validation-round2/litpol.ts 2024`.
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { BORDERS } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const yr = process.argv[2] ?? "2024";
const { solve } = await loadSolver();
const p = presets() as any, y = year(yr), v = validation(yr) as any;
const pb = build(y, p, null, replay(p, y));
const r = runLP(pb, solve);
const i = BORDERS.findIndex((b) => b.code === "LT-PL"), b = pb.borders[i], s = v.scheduled["LT-PL"];
const cls: Record<string, { n: number; a: number; e: number; d: number; md: number }> = {};
for (let h = 0; h < pb.hours; h++) {
  const o = v.price.LT[h];
  if (o === null || s.rev[h] === null || s.fwd[h] === null) continue;
  const net = s.rev[h] - s.fwd[h], d = o - b.price[h];
  const k = net >= b.ntcImp[h] - 5 ? "at the import limit" : -net >= b.ntcExp[h] - 5 ? "at the export limit"
    : Math.abs(d) < 1 ? "inside, LT = PL" : d < 0 ? "inside, LT below PL" : "inside, LT above PL";
  const c = (cls[k] ??= { n: 0, a: 0, e: 0, d: 0, md: 0 });
  const err = r.price[2][h] - o;
  c.n++; c.a += Math.abs(err); c.e += err; c.d += d; c.md += r.price[2][h] - b.price[h];
}
console.log(`${yr} LT-PL: class | hours | LT MAE | LT bias | observed LT−PL | model LT−PL`);
for (const [k, c] of Object.entries(cls)) console.log(`  ${k} | ${c.n} | ${(c.a / c.n).toFixed(1)} | ${(c.e / c.n).toFixed(1)} | ${(c.d / c.n).toFixed(1)} | ${(c.md / c.n).toFixed(1)}`);
