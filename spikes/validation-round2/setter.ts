// What sets the model's Lithuanian (or zone=EE) price in the hours of an observed price bin, and what
// the neighbours and the border flows were. From app/: `node --no-maglev ../spikes/validation-round2/setter.ts 2025 [lo hi] [zone]`.
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { marginal } from "../../app/src/worker/view.ts";
import { presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const yr = process.argv[2] ?? "2025";
const lo = Number(process.argv[3] ?? -1e9), hi = Number(process.argv[4] ?? 10);
const zone = process.argv[5] ?? "LT";
const zi = ZONES.indexOf(zone as never);
const { solve } = await loadSolver();
const p = presets() as any, y = year(yr), v = validation(yr);
const pb = build(y, p, null, replay(p, y));
const r = runLP(pb, solve);
const by: Record<string, { n: number; model: number; obs: number }> = {};
let n = 0;
const sat = pb.links.map(() => 0);
const bnd = pb.borders.map(() => ({ imp: 0, cap: 0, price: 0 }));
for (let h = 0; h < pb.hours; h++) {
  const o = v.price[zone][h];
  if (!(o > lo && o <= hi)) continue;
  n++;
  const m = marginal(pb, r, zi, h);
  let k = m ? (m.cls === "import" || m.cls === "export" ? m.name : m.cls) : "none (storage, water, shed, spill)";
  if (!m) {
    // which storage or water is part-loaded
    const parts: string[] = [];
    // part-loaded against the hour's own limits, as the programme bounds them (lp.ts), not the
    // nameplate: a store at a replay's weekly power is at a bound (ERRATA E-144)
    r.units.forEach((u, j) => {
      const s = pb.storage[j];
      const cMax = s.chargeMax ? Math.min(s.mw, s.chargeMax[h]) : s.mw, dMax = s.dischargeMax ? Math.min(s.mw * s.eff, s.dischargeMax[h]) : s.mw * s.eff;
      if (u.charge[h] > 1 && u.charge[h] < cMax - 1) parts.push(`${u.name} charging`);
      if (u.discharge[h] > 1 && u.discharge[h] < dMax - 1) parts.push(`${u.name} discharging`);
    });
    if (r.reservoir && r.reservoir.release[h] > pb.reservoir!.pmin[(h / 168) | 0] + 1 && r.reservoir.release[h] < pb.reservoir!.pmax[(h / 168) | 0] - 1) parts.push("daugava");
    if (parts.length) k = parts.join("+");
  }
  by[k] ??= { n: 0, model: 0, obs: 0 };
  by[k].n++; by[k].model += r.price[zi][h]; by[k].obs += o;
  pb.links.forEach((_, i) => { sat[i] += r.sat[i][h]; });
  pb.borders.forEach((b, i) => { bnd[i].price += b.price[h]; });
}
console.log(`${yr} ${zone} observed in (${lo}, ${hi}]: ${n} hours`);
for (const [k, x] of Object.entries(by).sort((a, b) => b[1].n - a[1].n)) console.log(`  ${k.padEnd(40)} ${String(x.n).padStart(5)} h  model ${(x.model / x.n).toFixed(1)}  observed ${(x.obs / x.n).toFixed(1)}`);
console.log(`  internal links saturated: ${sat.map((s, i) => `${i}: ${(100 * s / n).toFixed(0)} %`).join(", ")}; neighbours' mean price: ${bnd.map((b, i) => `${i}: ${(b.price / n).toFixed(1)}`).join(", ")}`);
