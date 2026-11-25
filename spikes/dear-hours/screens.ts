// Screens at the register in force, no refit (docs/research/2026-10-11_dear_hours.md, Phase 1.6):
// Kruonis's power (the week's 90th percentile or median hour of its recorded output when running,
// in place of the week's maximum; or, as an oracle, each hour's record as its limit), the window
// the programme sees ({24, 24}, the day ahead's {48, 24}, the week). From app/:
// `node --no-maglev ../spikes/dear-hours/screens.ts [years…]`.
import { readFileSync } from "node:fs";
import type { Horizon } from "../../app/src/engine/lp.ts";
import { DAY_AHEAD, WEEKLY, runLP } from "../../app/src/engine/lp.ts";
import type { Problem } from "../../app/src/engine/problem.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { validation } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { scenarioFor } from "../../app/scripts/validate_fit.ts";
import { quantile, tail } from "./tail.ts";

const record = JSON.parse(readFileSync(new URL("../validation-round2/kruonis_record.json", import.meta.url), "utf8")) as Record<string, { gen: number[]; pump: number[] }>;

/** Kruonis's hourly limits from its record: the week's q-quantile hour of output when running. */
export function kruonisWeekly(pb: Problem, yr: number, q: number): void {
  const u = pb.storage.find((s) => s.name === "kruonis")!;
  const rec = record[String(yr)];
  for (const [arr, lim] of [[rec.gen, u.dischargeMax!], [rec.pump, u.chargeMax!]] as [number[], Float64Array][]) {
    for (let w = 0; w * 168 < pb.hours; w++) {
      const on: number[] = [];
      for (let h = w * 168; h < Math.min(pb.hours, (w + 1) * 168); h++) if ((arr[h] ?? 0) > 1) on.push(arr[h]);
      on.sort((a, b) => a - b);
      const cap = on.length ? quantile(on, q) : 0;
      for (let h = w * 168; h < Math.min(pb.hours, (w + 1) * 168); h++) lim[h] = Math.min(lim[h], cap);
    }
  }
}
const kruonisHourly = (pb: Problem, yr: number) => {
  const u = pb.storage.find((s) => s.name === "kruonis")!;
  const rec = record[String(yr)];
  for (let h = 0; h < pb.hours; h++) { u.dischargeMax![h] = Math.min(u.dischargeMax![h], rec.gen[h] ?? 0); u.chargeMax![h] = Math.min(u.chargeMax![h], rec.pump[h] ?? 0); }
};
const SHORT: Horizon = { lookahead: 24, commit: 24 };
const VARIANTS: [string, (pb: Problem, yr: number) => void, Horizon][] = [
  ["the engine of record", () => {}, DAY_AHEAD],
  ["Kruonis at its week's p90", (pb, yr) => kruonisWeekly(pb, yr, 0.9), DAY_AHEAD],
  ["Kruonis at its week's p50", (pb, yr) => kruonisWeekly(pb, yr, 0.5), DAY_AHEAD],
  ["Kruonis capped by its record", kruonisHourly, DAY_AHEAD],
  ["window {24, 24}", () => {}, SHORT],
  ["window: the week", () => {}, WEEKLY],
];

if (/[/\\]screens\.ts$/.test(process.argv[1] ?? "")) {
const { solve } = await loadSolver();
const years = process.argv.slice(2).filter((a) => /^\d{4}$/.test(a)).map(Number);
for (const yr of years.length ? years : [2023, 2024, 2025]) {
  const v = validation(String(yr));
  console.log(`\n== ${yr}: MAE EE/LV/LT (Σ) | LT: record >250, 150–250 bias | model's >250 (h), 150–250 | ≥150 model/record | q99 | top-250 overlap | Kruonis TWh`);
  for (const [name, f, hz] of VARIANTS) {
    const { pb, boundary } = scenarioFor(yr);
    f(pb, yr);
    const r = runLP(pb, solve, hz);
    const t = tail(yr, pb, r, boundary);
    const mae = ZONES.map((z, i) => { let s = 0; for (let h = 0; h < pb.hours; h++) s += Math.abs(r.price[i][h] - v.price[z][h]); return s / pb.hours; });
    const lt = t[2], b = (x: { bin: string }[], k: string) => x.find((y) => y.bin.startsWith(k)) as { n: number; mean: number };
    const q99 = lt.quantiles.find((q) => q.q === 0.99)!;
    const k = r.units.find((u) => u.name === "kruonis")!;
    let kt = 0; for (let h = 0; h < pb.hours; h++) kt += k.discharge[h];
    console.log(`${name.padEnd(30)} ${mae.map((x) => x.toFixed(2)).join("/")} (${mae.reduce((s, x) => s + x, 0).toFixed(2)}) | ${b(lt.byObserved, "(250").mean} ${b(lt.byObserved, "(150").mean} | ${b(lt.byModel, "(250").mean} (${b(lt.byModel, "(250").n}) ${b(lt.byModel, "(150").mean} | ${lt.share150[0]}/${lt.share150[1]} | ${q99.model}/${q99.record} | ${lt.overlap[1].sameHour}/${lt.overlap[1].n} | ${(kt / 1e6).toFixed(2)}`);
  }
}
}
