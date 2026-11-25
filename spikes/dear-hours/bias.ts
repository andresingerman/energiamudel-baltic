// The average price bias (model − record, EE / LV / LT) and Kruonis against the record — pumping
// where Lithuania clears at or below 30 €/MWh, output where above 250, the year's TWh — for a
// markup with Kruonis as its shares (D-115 as built: `shares=s`) or as one store with output
// segments (`segments=s`). From app/: `node --no-maglev ../spikes/dear-hours/bias.ts m1,m2,m3,m4 shares=45|segments=60`.
import { readFileSync } from "node:fs";
import type { PerZone } from "../../app/src/engine/build.ts";
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { segments } from "./strategic.ts";

const record = JSON.parse(readFileSync(new URL("../validation-round2/kruonis_record.json", import.meta.url), "utf8")) as Record<string, { gen: number[]; pump: number[] }>;
const { solve } = await loadSolver();
const p = presets();
const m = process.argv[2].split(",").map(Number);
const kind = process.argv[3].split("=");
const markup = Object.fromEntries(ZONES.map((z) => [z, z === "EE" ? [0, 0, 0, 0] : m])) as PerZone<number[]>;
for (const yr of [2023, 2024, 2025]) {
  const y = year(String(yr)), v = validation(String(yr));
  const pb = build(y, p, null, { ...replay(p, y), markup, kruonisStep: kind[0] === "shares" ? Number(kind[1]) : 0 });
  if (kind[0] === "segments") segments(pb, Number(kind[1]));
  const r = runLP(pb, solve);
  const bias = ZONES.map((z, i) => { let s = 0; for (let h = 0; h < pb.hours; h++) s += r.price[i][h] - v.price[z][h]; return (s / pb.hours).toFixed(2); });
  const ks = r.units.filter((u) => u.name.startsWith("kruonis")), rec = record[String(yr)];
  let pc = 0, pr = 0, nc = 0, gd = 0, gr = 0, nd = 0, kt = 0;
  for (let h = 0; h < pb.hours; h++) {
    const c = ks.reduce((a, u) => a + u.charge[h], 0), d = ks.reduce((a, u) => a + u.discharge[h], 0);
    kt += d;
    if (v.price.LT[h] <= 30) { pc += c; pr += rec.pump[h] ?? 0; nc++; }
    if (v.price.LT[h] > 250) { gd += d; gr += rec.gen[h] ?? 0; nd++; }
  }
  console.log(`${yr} ${kind.join(" ")}: bias ${bias.join(" / ")} | Kruonis pumping ≤30 ${(pc / nc).toFixed(0)}/${(pr / nc).toFixed(0)} MW, output >250 ${(gd / nd).toFixed(0)}/${(gr / nd).toFixed(0)} MW, ${(kt / 1e6).toFixed(2)} TWh`);
}
