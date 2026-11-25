// Kruonis and the Daugava, model against record (docs/research/2026-10-11_dear_hours.md, Phase 1):
// mean MW in the hours of the record's and the model's price bins (LT's price), and how each runs
// over the year — hours generating, the mean and the 90th percentile of an hour's output when
// running, the week's maximum, hours at the model's power limit. With `--tranches k,s` Kruonis
// runs in strategic.ts's tranches (its units summed). From app/:
// `node --no-maglev ../spikes/dear-hours/stores.ts [years…] [--tranches k,s]`.
import { readFileSync } from "node:fs";
import { runLP } from "../../app/src/engine/lp.ts";
import { validation } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { scenarioFor } from "../../app/scripts/validate_fit.ts";
import { segments, tranches } from "./strategic.ts";
import { quantile } from "./tail.ts";

const record = JSON.parse(readFileSync(new URL("../validation-round2/kruonis_record.json", import.meta.url), "utf8")) as Record<string, { gen: number[]; pump: number[] }>;
const { solve } = await loadSolver();
const years = process.argv.slice(2).filter((a) => /^\d{4}$/.test(a)).map(Number);
const f0 = (x: number) => x.toFixed(0);
const tr = process.argv.find((a) => a.startsWith("--tranches"))?.split("=")[1] ?? (process.argv.includes("--tranches") ? process.argv[process.argv.indexOf("--tranches") + 1] : null);
for (const yr of years.length ? years : [2023, 2024, 2025]) {
  const { pb } = scenarioFor(yr);
  const u = { ...pb.storage.find((x) => x.name === "kruonis")! };
  if (tr) { const [k, st] = tr.split(",").map(Number); tranches(pb, k, st); }
  const sg = process.argv.find((a) => a.startsWith("--segments="))?.split("=")[1];
  if (sg) segments(pb, Number(sg));
  const r = runLP(pb, solve);
  const v = validation(String(yr));
  const H = pb.hours;
  // Kruonis's units summed (one, or its tranches)
  const ks = r.units.filter((x) => x.name.startsWith("kruonis"));
  const ku = { discharge: Float64Array.from({ length: H }, (_, h) => ks.reduce((a, x) => a + x.discharge[h], 0)), charge: Float64Array.from({ length: H }, (_, h) => ks.reduce((a, x) => a + x.charge[h], 0)) };
  const rec = record[String(yr)];
  const o = v.price.LT, m = r.price[2];
  const groups: [string, (h: number) => boolean][] = [
    ["record >250", (h) => o[h] > 250], ["record 150–250", (h) => o[h] > 150 && o[h] <= 250],
    ["model >250", (h) => m[h] > 250], ["model 150–250", (h) => m[h] > 150 && m[h] <= 250],
    ["record ≤30", (h) => o[h] <= 30], ["all hours", () => true],
  ];
  console.log(`\n== ${yr}: mean MW model/record — Kruonis generating, pumping; the Daugava`);
  for (const [name, pick] of groups) {
    let n = 0, kg = 0, kgr = 0, kp = 0, kpr = 0, d = 0, dr = 0;
    for (let h = 0; h < H; h++) {
      if (!pick(h)) continue;
      n++; kg += ku.discharge[h]; kgr += rec.gen[h] ?? 0; kp += ku.charge[h]; kpr += rec.pump[h] ?? 0;
      d += r.reservoir!.release[h]; dr += v.gen.LV.hydro_ror[h];
    }
    console.log(`  ${name.padEnd(15)} ${String(n).padStart(5)} h | Kruonis ${f0(kg / n)}/${f0(kgr / n)} pumping ${f0(kp / n)}/${f0(kpr / n)} | Daugava ${f0(d / n)}/${f0(dr / n)}`);
  }
  const prof = (x: ArrayLike<number>, cap?: (h: number) => number) => {
    const on: number[] = [];
    let atCap = 0;
    for (let h = 0; h < H; h++) if (x[h] > 1) { on.push(x[h]); if (cap && x[h] >= cap(h) - 1) atCap++; }
    on.sort((a, b) => a - b);
    return `${on.length} h on, mean ${f0(on.reduce((s, y) => s + y, 0) / on.length)}, p50 ${f0(quantile(on, 0.5))}, p90 ${f0(quantile(on, 0.9))}${cap ? `, at the limit ${atCap} h` : ""}`;
  };
  const dMax = (h: number) => Math.min(u.mw * u.eff, u.dischargeMax ? u.dischargeMax[h] : Infinity);
  const cMax = (h: number) => Math.min(u.mw, u.chargeMax ? u.chargeMax[h] : Infinity);
  const wk = Array.from({ length: Math.ceil(H / 168) }, (_, w) => dMax(w * 168));
  console.log(`  Kruonis generating — model: ${prof(ku.discharge, dMax)}; record: ${prof(rec.gen)}; the weekly limit: median ${f0(quantile([...wk].sort((a, b) => a - b), 0.5))} MW`);
  console.log(`  Kruonis pumping    — model: ${prof(ku.charge, cMax)}; record: ${prof(rec.pump)}`);
  console.log(`  Daugava            — model: ${prof(r.reservoir!.release, (h) => pb.reservoir!.pmax[(h / 168) | 0])}; record: ${prof(v.gen.LV.hydro_ror)}`);
}
