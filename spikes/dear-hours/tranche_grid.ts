// The fit years only (2023, 2024; the blind year left out of the choice): Kruonis in k tranches at
// Δ + j·s against one Δ for the whole plant, at the register in force, no refit. From app/:
// `node --no-maglev ../spikes/dear-hours/tranche_grid.ts`.
import { runLP } from "../../app/src/engine/lp.ts";
import type { Problem } from "../../app/src/engine/problem.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { validation } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { scenarioFor } from "../../app/scripts/validate_fit.ts";
import { tranches, units } from "./strategic.ts";
import { tail } from "./tail.ts";

const { solve } = await loadSolver();
const kruonisDelta = (d: number) => (pb: Problem) => { pb.storage.find((u) => u.name === "kruonis")!.delta = d; };
const VARIANTS: [string, (pb: Problem) => void][] = [
  ["the engine of record (Δ 60)", () => {}],
  ...[75, 90, 120].map((d) => [`one Δ ${d}`, kruonisDelta(d)] as [string, (pb: Problem) => void]),
  ...(process.argv.includes("--units") ? [] : [[2, 30], [2, 60], [4, 10], [4, 20], [4, 30], [4, 45], [8, 10], [8, 15]].map(([k, s]) => [`${k} tranches, s ${s}`, (pb: Problem) => tranches(pb, k, s)] as [string, (pb: Problem) => void])),
  ...(process.argv.includes("--units") ? [20, 30, 45, 60, 90, 120].map((s) => [`4 units in order, s ${s}`, (pb: Problem) => units(pb, s)] as [string, (pb: Problem) => void]) : []),
];
console.log(`Σ MAE 2023 + 2024 | ≥150 LV, LT 2024 (record 1002, 992) | LT 2024 q99 (300.4) | LT record >250 2023, 2024 | Kruonis TWh 2023, 2024 (record 0.53, 0.57)`);
for (const [name, f] of VARIANTS) {
  const out = [2023, 2024].map((yr) => {
    const { pb, boundary } = scenarioFor(yr);
    f(pb);
    const r = runLP(pb, solve), v = validation(String(yr));
    const mae = ZONES.reduce((s, z, i) => { let a = 0; for (let h = 0; h < pb.hours; h++) a += Math.abs(r.price[i][h] - v.price[z][h]); return s + a / pb.hours; }, 0);
    const t = tail(yr, pb, r, boundary);
    let kt = 0; r.units.forEach((u) => { if (u.name.startsWith("kruonis")) for (let h = 0; h < pb.hours; h++) kt += u.discharge[h]; });
    return { mae, t, kt };
  });
  const [a, b] = out;
  console.log(`${name.padEnd(28)} ${(a.mae + b.mae).toFixed(2)} (${a.mae.toFixed(2)} + ${b.mae.toFixed(2)}) | ${b.t[1].share150[0]}, ${b.t[2].share150[0]} | ${b.t[2].quantiles[3].model} | ${a.t[2].byObserved[7].mean}, ${b.t[2].byObserved[7].mean} | ${(a.kt / 1e6).toFixed(2)}, ${(b.kt / 1e6).toFixed(2)}`);
}
