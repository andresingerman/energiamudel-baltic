// The fit years only (2023, 2024): Kruonis's discharge in four segments of the hour's power at j·s
// (strategic.ts segments: one reservoir, pumping at the plant's Δ) against its four shares at
// Δ + j·s (D-115) and the plant as one store (D-114), at a given markup (default D-114's), no
// refit. Average price bias, Kruonis's pumping in the cheap hours and output in the dear ones
// beside the MAE. From app/: `node --no-maglev ../spikes/dear-hours/segment_grid.ts [m1,m2,m3,m4]`.
import { readFileSync } from "node:fs";
import type { PerZone } from "../../app/src/engine/build.ts";
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import type { Problem } from "../../app/src/engine/problem.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { segments } from "./strategic.ts";

const record = JSON.parse(readFileSync(new URL("../validation-round2/kruonis_record.json", import.meta.url), "utf8")) as Record<string, { gen: number[]; pump: number[] }>;
const { solve } = await loadSolver();
const p = presets();
const m = (process.argv[2] ?? "37.5,147.5,237.5,257.5").split(",").map(Number);
const markup = Object.fromEntries(ZONES.map((z) => [z, z === "EE" ? [0, 0, 0, 0] : m])) as PerZone<number[]>;
const VARIANTS: [string, number, (pb: Problem) => void][] = [
  ["one store at Δ (D-114)", 0, (pb) => segments(pb, 0, 1)],
  ["four shares at Δ + j·45 (D-115)", 45, () => {}],
  ...[15, 30, 45, 60, 90].map((s) => [`one store, output segments j·${s}`, 0, (pb: Problem) => segments(pb, s)] as [string, number, (pb: Problem) => void]),
];
console.log(`markup ${m.join(" / ")} | Σ MAE 2023 + 2024 | LT bias 2023, 2024 | Kruonis MW model/record: pumping where LT ≤ 30, output where LT > 250 (2024) | Kruonis TWh 2024 (record 0.57)`);
for (const [name, step, f] of VARIANTS) {
  let sum = 0;
  const bias: number[] = [];
  let pc = 0, pr = 0, nc = 0, gd = 0, gr = 0, nd = 0, kt = 0;
  for (const yr of [2023, 2024]) {
    const y = year(String(yr)), v = validation(String(yr));
    const pb = build(y, p, null, { ...replay(p, y), markup, kruonisStep: step });
    f(pb);
    const r = runLP(pb, solve);
    ZONES.forEach((z, i) => { let a = 0; for (let h = 0; h < pb.hours; h++) a += Math.abs(r.price[i][h] - v.price[z][h]); sum += a / pb.hours; });
    let b = 0; for (let h = 0; h < pb.hours; h++) b += r.price[2][h] - v.price.LT[h]; bias.push(b / pb.hours);
    if (yr === 2024) {
      const ks = r.units.filter((u) => u.name.startsWith("kruonis")), rec = record["2024"];
      for (let h = 0; h < pb.hours; h++) {
        const c = ks.reduce((a, u) => a + u.charge[h], 0), d = ks.reduce((a, u) => a + u.discharge[h], 0);
        kt += d;
        if (v.price.LT[h] <= 30) { pc += c; pr += rec.pump[h] ?? 0; nc++; }
        if (v.price.LT[h] > 250) { gd += d; gr += rec.gen[h] ?? 0; nd++; }
      }
    }
  }
  console.log(`${name.padEnd(34)} ${sum.toFixed(2)} | ${bias.map((x) => x.toFixed(1)).join(", ")} | ${(pc / nc).toFixed(0)}/${(pr / nc).toFixed(0)}, ${(gd / nd).toFixed(0)}/${(gr / nd).toFixed(0)} | ${(kt / 1e6).toFixed(2)}`);
}
