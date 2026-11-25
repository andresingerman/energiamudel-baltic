// Replays one year and prints what the engine of record made of it: `node --no-maglev scripts/replay.ts 2024`.
// Observed prices come from validation/<year>.json.gz for comparison only (R-BND-3).
import { build } from "../src/engine/build.ts";
import { runLP } from "../src/engine/lp.ts";
import { ZONES } from "../src/engine/problem.ts";
import { summarise } from "../src/engine/results.ts";
import { replay } from "../src/state/scenario.ts";
import { presets, validation, year } from "./data.ts";
import { loadSolver } from "./highs.ts";

const key = process.argv[2] ?? "2024";
const y = year(key);
const p = presets();
const t0 = performance.now();
const pb = build(y, p, null, replay(p, y));
const t1 = performance.now();
const { solve } = await loadSolver();
const t1b = performance.now();
const r = runLP(pb, solve);
const t2 = performance.now();
const s = summarise(pb, r);
const v = validation(key);
console.log(`${key}: build ${(t1 - t0).toFixed(0)} ms, run ${(t2 - t1b).toFixed(0)} ms, ${pb.hours} h`);
for (const [z, zs] of s.zones.entries()) {
  const obs = v.price[ZONES[z]];
  let mae = 0;
  let mean = 0;
  for (let h = 0; h < pb.hours; h++) {
    mae += Math.abs(r.price[z][h] - obs[h]);
    mean += obs[h];
  }
  const gen = Object.entries(zs.gen).filter(([, e]) => e > 0.005).map(([c, e]) => `${c} ${e.toFixed(2)}`).join(", ");
  console.log(`${zs.zone}: price ${zs.price.toFixed(1)} (observed ${(mean / pb.hours).toFixed(1)}, MAE ${(mae / pb.hours).toFixed(1)}), ` +
    `load ${zs.loadTwh.toFixed(2)} TWh, shed ${zs.shedMwh.toFixed(0)} MWh, spill ${zs.spillMwh.toFixed(0)} MWh, CO2 ${zs.co2Mt.toFixed(2)} Mt, reserve unmet ${zs.reserveUnmetMwh.toFixed(0)} MWh`);
  console.log(`    TWh: ${gen}; curtailed ${zs.curtailTwh.toFixed(3)}`);
}
for (const b of s.borders) {
  console.log(`${b.border.padEnd(7)} flow ${b.flowTwh.toFixed(2).padStart(6)} TWh, congested fwd ${(100 * b.congestedFwd).toFixed(0)} % rev ${(100 * b.congestedRev).toFixed(0)} %, rent ${b.rentMeur.toFixed(1)} M€`);
}
for (const u of s.units) console.log(`${u.name}: discharge ${(u.dischargeMwh / 1e3).toFixed(1)} GWh, charge ${(u.chargeMwh / 1e3).toFixed(1)} GWh`);
if (s.reservoir) console.log(`Daugava: ${s.reservoir.releaseTwh.toFixed(2)} TWh, spilled ${s.reservoir.spilledMwh.toFixed(0)} MWh, left ${s.reservoir.leftMwh.toFixed(0)} MWh`);
