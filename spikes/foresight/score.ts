// The night's scoreboard (2026-10-11): every variant of ERRATA E-139's second fix — storage without
// perfect foresight, oil shale's market entry — is judged on it. For each replay year: the zones'
// MAE and bias and their sum, the error in the dear hours (the record above 250 and in 150–250
// €/MWh), Estonia's price apart from Latvia's (model / record, |EE − LV| > 0.01 €/MWh), Kruonis's
// output and hours, the batteries' discharge, oil shale, R-VAL-5's breaches. `score(runner)` takes
// how a year is cleared; `node --no-maglev spikes/foresight/score.ts [years…] [--weekly]` scores the engine of
// record as it is (or its weekly programme of D-021) and prints JSON.
import type { Results } from "../../app/src/engine/index.ts";
import { WEEKLY, runLP } from "../../app/src/engine/lp.ts";
import type { Problem } from "../../app/src/engine/problem.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { validation } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { evaluate, scenarioFor } from "../../app/scripts/validate_fit.ts";

export const YEARS = [2023, 2024, 2025, 2026];

export interface Row {
  year: number;
  mae: number[]; bias: number[]; maeSum: number;
  dear250: { hours: number; bias: number[] }; dear150: { hours: number; bias: number[] };
  apart: { model: number; record: number; modelOnly: number };
  kruonis: { twh: number; hours: number; recordTwh: number; recordHours: number };
  batteryTwh: number; oilShale: { model: number; record: number };
  breaches: number;
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;
const r3 = (x: number) => Math.round(x * 1000) / 1000;

export function scoreYear(yr: number, pb: Problem, r: Results, boundary: Record<string, number[]>): Row {
  const v = validation(String(yr));
  const H = pb.hours;
  const e = evaluate(yr, pb, r, v, boundary);
  const mae = ZONES.map((z) => r2(e.zones[z].mae));
  const bias = ZONES.map((z) => r1(e.zones[z].bias));
  const dear = (lo: number, hi: number) => {
    const b = [0, 0, 0];
    let n = 0;
    for (let h = 0; h < H; h++) {
      const o = v.price.LT[h];
      if (!(o > lo && o <= hi)) continue;
      n++;
      ZONES.forEach((z, i) => { b[i] += r.price[i][h] - v.price[z][h]; });
    }
    return { hours: n, bias: b.map((x) => r1(n ? x / n : 0)) };
  };
  let am = 0, ao = 0, mo = 0;
  for (let h = 0; h < H; h++) {
    const m = Math.abs(r.price[0][h] - r.price[1][h]) > 0.01;
    const o = Math.abs(v.price.EE[h] - v.price.LV[h]) > 0.01;
    if (m) am++;
    if (o) ao++;
    if (m && !o) mo++;
  }
  // Kruonis's shares of power together (D-115)
  const kr = r.units.filter((u) => u.name.startsWith("kruonis"));
  let kt = 0, kh = 0;
  for (let h = 0; h < H; h++) { const d = kr.reduce((a, u) => a + u.discharge[h], 0); kt += d; if (d > 1) kh++; }
  const rec = v.gen.LT?.hydro_ps ?? [];
  let rt = 0, rh = 0;
  for (let h = 0; h < rec.length; h++) { rt += rec[h]; if (rec[h] > 1) rh++; }
  let bt = 0;
  for (const u of r.units) if (u.name.startsWith("battery")) for (let h = 0; h < H; h++) bt += u.discharge[h];
  const os = e.zones.EE.gen.oil_shale ?? { model: 0, observed: 0 };
  return {
    year: yr, mae, bias, maeSum: r2(mae.reduce((a, x) => a + x, 0)),
    dear250: dear(250, 1e9), dear150: dear(150, 250),
    apart: { model: r3(am / H), record: r3(ao / H), modelOnly: r3(mo / H) },
    kruonis: { twh: r3(kt / 1e6), hours: kh, recordTwh: r3(rt / 1e6), recordHours: rh },
    batteryTwh: r3(bt / 1e6), oilShale: { model: r2(os.model), record: r2(os.observed) },
    breaches: e.failures.length,
  };
}

/** Scores every year with `clear(pb)`; `prep` may change the built problem first (a variant's
 * inputs). */
export function score(clear: (pb: Problem) => Results, years = YEARS, prep: (pb: Problem, yr: number) => Problem = (pb) => pb): Row[] {
  return years.map((yr) => {
    const { pb, boundary } = scenarioFor(yr);
    const q = prep(pb, yr);
    return scoreYear(yr, q, clear(q), boundary);
  });
}

/** One line per year, for the night's notes. */
export function table(rows: Row[], label: string): string {
  return rows.map((x) => `${label.padEnd(18)} ${x.year} MAE ${x.mae.join("/")} (Σ ${x.maeSum}) bias ${x.bias.join("/")} | >250 ${x.dear250.hours} h ${x.dear250.bias.join("/")} | 150–250 ${x.dear150.bias.join("/")} | EE apart ${x.apart.model}/${x.apart.record} (model only ${x.apart.modelOnly}) | Kruonis ${x.kruonis.twh}/${x.kruonis.recordTwh} TWh ${x.kruonis.hours}/${x.kruonis.recordHours} h | batt ${x.batteryTwh} | shale ${x.oilShale.model}/${x.oilShale.record} | breaches ${x.breaches}`).join("\n");
}

if (/[/\\]score\.ts$/.test(process.argv[1] ?? "")) { // run as itself, not as an importer named …score.ts
  const years = process.argv.slice(2).filter((a) => /^\d{4}$/.test(a)).map(Number);
  const { solve } = await loadSolver();
  const weekly = process.argv.includes("--weekly");
  const rows = score((pb) => (weekly ? runLP(pb, solve, WEEKLY) : runLP(pb, solve)), years.length ? years : YEARS);
  console.error(table(rows, weekly ? "weekly (D-021)" : "engine of record"));
  console.log(JSON.stringify(rows, null, 1));
}
