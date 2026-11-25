// The hours a restricted Kruonis leaves short (docs/research/2026-10-11_dear_hours.md, Phase 1.6):
// with Kruonis held to its week's median running hour, the hours LT's model price passes 1 000
// €/MWh — how many, their share of the MAE, and what the model and the record ran in them.
// From app/: `node --no-maglev ../spikes/dear-hours/cliff.ts [years…] [q=0.5]`.
import { readFileSync } from "node:fs";
import { runLP } from "../../app/src/engine/lp.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { FLEX } from "../../app/src/engine/build.ts";
import { validation } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { scenarioFor } from "../../app/scripts/validate_fit.ts";
import { kruonisWeekly } from "./screens.ts";

const record = JSON.parse(readFileSync(new URL("../validation-round2/kruonis_record.json", import.meta.url), "utf8")) as Record<string, { gen: number[]; pump: number[] }>;
const { solve } = await loadSolver();
const args = process.argv.slice(2);
const q = Number(args.find((a) => a.startsWith("q="))?.slice(2) ?? 0.5);
for (const yr of args.filter((a) => /^\d{4}$/.test(a)).map(Number)) {
  const v = validation(String(yr));
  const { pb } = scenarioFor(yr);
  kruonisWeekly(pb, yr, q);
  const r = runLP(pb, solve);
  const H = pb.hours;
  const hs: number[] = [];
  let abs = 0, absHi = 0;
  for (let h = 0; h < H; h++) { const e = Math.abs(r.price[2][h] - v.price.LT[h]); abs += e; if (r.price[2][h] > 1000) { hs.push(h); absHi += e; } }
  console.log(`\n== ${yr}, Kruonis at its week's q${q}: LT above 1 000 €/MWh in ${hs.length} h, ${(100 * absHi / abs).toFixed(0)} % of LT's absolute error; shed in them ${hs.filter((h) => r.shed.some((s) => s[h] > 1e-3)).length} h`);
  const gasOf = (z: number, h: number) => { let x = 0; pb.zones[z].offers.forEach((o, j) => { if (FLEX.has(o.cls)) x += r.offers[z][j][h]; }); for (const f of pb.zones[z].fixed) if (FLEX.has(f.cls)) x += f.mw[h]; return x; };
  const gasCap = (z: number, h: number) => { let x = 0; pb.zones[z].offers.forEach((o) => { if (FLEX.has(o.cls)) x += o.mw[h]; }); for (const f of pb.zones[z].fixed) if (FLEX.has(f.cls)) x += f.mw[h]; return x; };
  const k = pb.storage.findIndex((u) => u.name === "kruonis");
  for (const h of hs.slice(0, 12)) {
    const d = new Date(Date.UTC(yr, 0, 1) + h * 3600e3).toISOString().slice(0, 13);
    const imp = pb.borders.map((b, i) => { let x = 0; pb.zones[b.zone].offers.forEach((o, j) => { if (o.name === `import:${["FI", "SE4", "PL"][i]}`) x += r.offers[b.zone][j][h]; }); return `${x.toFixed(0)}/${b.ntcImp[h].toFixed(0)}`; });
    console.log(`  ${d} LT model ${r.price[2][h].toFixed(0)} record ${v.price.LT[h].toFixed(0)} | Kruonis ${r.units[k].discharge[h].toFixed(0)} (limit ${pb.storage[k].dischargeMax![h].toFixed(0)}, record ${(record[String(yr)].gen[h] ?? 0).toFixed(0)}) | Daugava ${r.reservoir!.release[h].toFixed(0)} (≤ ${pb.reservoir!.pmax[(h / 168) | 0].toFixed(0)}, record ${v.gen.LV.hydro_ror[h].toFixed(0)}) | gas LV ${gasOf(1, h).toFixed(0)}/${gasCap(1, h).toFixed(0)} (record ${v.gen.LV.gas[h].toFixed(0)}), LT ${gasOf(2, h).toFixed(0)}/${gasCap(2, h).toFixed(0)} (record ${v.gen.LT.gas[h].toFixed(0)}) | imports FI/SE4/PL ${imp.join(" ")} | load ${ZONES.map((z, i) => pb.zones[i].load[h].toFixed(0)).join("/")} (record ${ZONES.map((z) => v.load[z][h].toFixed(0)).join("/")})`);
  }
}
