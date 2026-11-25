// The validation protocol's metrics (SPECIFICATION.md §9, R-VAL-3 … R-VAL-5; docs/methodology.md
// §7): the engine of record replays a year and is measured against what was observed, per zone
// and per border. `node --no-maglev scripts/validate_fit.ts [years…] [--check] [--diagnose]` prints the
// tables, writes data/derived/validation/<year>.json and, with --check, exits 1 when a threshold
// of R-VAL-5 is breached in 2023, 2024 or 2025. Without years: 2020–2026 (2020–2022 are R-VAL-7's
// diagnostics, 2026 the second blind year as it completes; neither has a threshold). Observed prices come from the validation files,
// which the engine never reads (R-BND-3).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Scenario } from "../src/engine/build.ts";
import { build } from "../src/engine/build.ts";
import type { Results } from "../src/engine/index.ts";
import { runLP } from "../src/engine/lp.ts";
import type { Problem } from "../src/engine/problem.ts";
import { BORDERS, LINKS, ZONES } from "../src/engine/problem.ts";
import { congestedWay, summarise } from "../src/engine/results.ts";
import { replay } from "../src/state/scenario.ts";
import type { Validation } from "./data.ts";
import { EXPORT, presets, validation, year } from "./data.ts";
import { loadSolver } from "./highs.ts";
import type { Evaluation } from "../src/worker/metrics.ts";
import { GATE_YEARS, THRESHOLD, durationRmse, mae, mean, observedCongested, shareAtLeast, spreadQuantiles, within } from "../src/worker/metrics.ts";

/** The observed technology (ENTSO-E A75) each model class is measured against. */
const A75: Record<string, string> = {
  biomass_chp: "biomass", gas_ccgt: "gas", gas_conventional: "gas", gas_ocgt: "gas", gas_chp: "gas",
  oil_shale_auvere: "oil_shale", oil_shale_cfb: "oil_shale", oil_shale_pf: "oil_shale", retort_gas: "coal_gas",
  hydro_daugava: "hydro_ror", hydro_ps: "hydro_ps", hydro_ror: "hydro_ror", wind_onshore: "wind_onshore",
  wind_offshore: "wind_offshore", solar: "solar", waste: "waste", other: "other", other_renewable: "other_renewable",
  battery: "battery", nuclear: "nuclear",
};


export function evaluate(yr: number, pb: Problem, r: Results, v: Validation, boundary: Record<string, number[]>): Evaluation {
  const s = summarise(pb, r);
  const H = pb.hours;
  const out: Evaluation = { year: yr, zones: {}, borders: {}, failures: [] };
  ZONES.forEach((z, i) => {
    const obs = v.price[z];
    const zs = s.zones[i];
    const gen: Record<string, { model: number; observed: number }> = {};
    for (const [cls, twh] of Object.entries(zs.gen)) {
      const t = A75[cls] ?? cls;
      gen[t] = gen[t] ?? { model: 0, observed: 0 };
      gen[t].model += twh;
    }
    for (const [t, arr] of Object.entries(v.gen[z] ?? {})) {
      gen[t] = gen[t] ?? { model: 0, observed: 0 };
      gen[t].observed += mean(arr) * arr.length / 1e6;
    }
    out.zones[z] = {
      mae: mae(r.price[i], obs), bias: mean(r.price[i]) - mean(obs), durationRmse: durationRmse(r.price[i], obs),
      share150: { model: shareAtLeast(r.price[i], 150), observed: shareAtLeast(obs, 150) }, gen,
    };
  });
  // internal links: model flow + = towards LT; observed scheduled exchanges fwd − rev
  const price = (k: string): ArrayLike<number> => (k in v.price ? v.price[k] : boundary[k]);
  const borders: [string, string, string, number, boolean][] = [
    ...LINKS.map((code, i): [string, string, string, number, boolean] => [code, ZONES[i], ZONES[i + 1], i, true]),
    ...BORDERS.map((b, k): [string, string, string, number, boolean] => [b.code, ZONES[b.zone], b.boundary, k, false]),
  ];
  for (const [code, a, b, k, internal] of borders) {
    const sch = v.scheduled[code];
    let obsNet = 0;
    for (let h = 0; h < H; h++) obsNet += sch.fwd[h] - sch.rev[h];
    const ms = s.borders.find((x) => x.border === code)!;
    let fwd = 0;
    let rev = 0;
    if (internal) {
      for (let h = 0; h < H; h++) {
        const way = r.sat[k][h] ? congestedWay(r.flow[k][h], r.price[k][h], r.price[k + 1][h]) : null;
        if (way === "fwd") fwd++;
        else if (way === "rev") rev++;
      }
    } else {
      fwd = ms.congestedFwd * H;
      rev = ms.congestedRev * H;
    }
    out.borders[code] = {
      netFlowTwh: { model: ms.flowTwh, observed: obsNet / 1e6 },
      congested: { fwd: { model: fwd / H, observed: observedCongested(price(a), price(b)) }, rev: { model: rev / H, observed: observedCongested(price(b), price(a)) } },
      rentMeur: ms.rentMeur,
      spread: { model: spreadQuantiles(internal ? r.price[k] : r.price[pb.borders[k].zone], internal ? r.price[k + 1] : boundary[b]), observed: spreadQuantiles(price(a), price(b)) },
    };
  }
  if (GATE_YEARS.includes(yr)) {
    for (const [z, m] of Object.entries(out.zones)) {
      if (!within.mae(m.mae)) out.failures.push(`${z} MAE ${m.mae.toFixed(1)} > ${THRESHOLD.maeEurMwh}`);
      if (!within.durationRmse(m.durationRmse)) out.failures.push(`${z} duration RMSE ${m.durationRmse.toFixed(1)} > ${THRESHOLD.durationRmseEurMwh}`);
      const pp = 100 * (m.share150.model - m.share150.observed);
      if (!within.share150(m.share150)) out.failures.push(`${z} hours ≥ 150 ${pp.toFixed(1)} pp`);
      for (const [t, g] of Object.entries(m.gen)) {
        if (!within.gen(g)) out.failures.push(`${z} ${t} ${g.model.toFixed(2)} vs ${g.observed.toFixed(2)} TWh`);
      }
    }
    for (const [code, m] of Object.entries(out.borders)) {
      if (!within.netFlow(m.netFlowTwh)) out.failures.push(`${code} net flow ${m.netFlowTwh.model.toFixed(2)} vs ${m.netFlowTwh.observed.toFixed(2)} TWh`);
      for (const dir of ["fwd", "rev"] as const) {
        const pp = 100 * (m.congested[dir].model - m.congested[dir].observed);
        if (!within.congested(m.congested[dir])) out.failures.push(`${code} ${dir} congested ${pp.toFixed(0)} pp`);
      }
    }
  }
  return out;
}

/** Where the price error sits: by observed price bin, hour of day and month (v4's diagnose). */
export function diagnose(r: Results, v: Validation, months: Uint8Array): string {
  const lines: string[] = [];
  const bins = [-1e4, 0, 10, 30, 60, 100, 150, 250, 1e4];
  ZONES.forEach((z, i) => {
    const o = v.price[z];
    const m = r.price[i];
    const total = mae(m, o) * o.length;
    const row = bins.slice(0, -1).map((lo, k) => {
      let n = 0, b = 0, a = 0;
      for (let h = 0; h < o.length; h++) if (o[h] > lo && o[h] <= bins[k + 1]) { n++; b += m[h] - o[h]; a += Math.abs(m[h] - o[h]); }
      return `(${lo},${bins[k + 1]}] ${n}h bias ${n ? (b / n).toFixed(0) : "-"} share ${(100 * a / total).toFixed(0)}%`;
    });
    lines.push(`${z} by observed price: ${row.join(" | ")}`);
    const byHour = Array.from({ length: 24 }, (_, hh) => { let b = 0, n = 0; for (let h = hh; h < o.length; h += 24) { b += m[h] - o[h]; n++; } return (b / n).toFixed(0); });
    lines.push(`${z} bias by UTC hour: ${byHour.join(" ")}`);
    const byMonth = Array.from({ length: 12 }, (_, mm) => { let b = 0, a = 0, n = 0; for (let h = 0; h < o.length; h++) if (months[h] === mm) { b += m[h] - o[h]; a += Math.abs(m[h] - o[h]); n++; } return n ? `${(b / n).toFixed(0)}/${(a / n).toFixed(0)}` : "-"; });
    lines.push(`${z} bias/MAE by month: ${byMonth.join(" ")}`);
    const tail = (a: ArrayLike<number>) => `≥150 ${Array.from(a).filter((x) => x >= 150).length}h, ≥250 ${Array.from(a).filter((x) => x >= 250).length}h, ≤1 ${Array.from(a).filter((x) => x <= 1).length}h, max ${Math.max(...Array.from(a)).toFixed(0)}`;
    lines.push(`${z} tails model ${tail(m)} | observed ${tail(o)}`);
  });
  return lines.join("\n");
}

/** A year's validation file's text (data/derived/validation/<year>.json). */
export const evaluationJson = (e: Evaluation) => JSON.stringify(e, null, 1) + "\n";

export function scenarioFor(yr: number): { pb: Problem; boundary: Record<string, number[]>; sc: Scenario } {
  const p = presets();
  const y = year(String(yr));
  const sc = replay(p, y);
  return { pb: build(y, p, null, sc), boundary: { FI: y.boundary.FI.observed, SE4: y.boundary.SE4.observed, PL: y.boundary.PL.observed }, sc };
}

if (process.argv[1]?.endsWith("validate_fit.ts")) {
  const args = process.argv.slice(2);
  const years = args.filter((a) => /^\d{4}$/.test(a)).map(Number);
  const { solve } = await loadSolver();
  const out = join(EXPORT, "..", "derived", "validation");
  mkdirSync(out, { recursive: true });
  let failed = 0;
  for (const yr of years.length ? years : [2020, 2021, 2022, ...GATE_YEARS, 2026]) {
    const { pb, boundary } = scenarioFor(yr);
    const r = runLP(pb, solve);
    const v = validation(String(yr));
    const e = evaluate(yr, pb, r, v, boundary);
    writeFileSync(join(out, `${yr}.json`), evaluationJson(e));
    console.log(`== ${yr}`);
    for (const [z, m] of Object.entries(e.zones)) {
      console.log(`${z}: MAE ${m.mae.toFixed(1)} bias ${m.bias.toFixed(1)} DC-RMSE ${m.durationRmse.toFixed(1)} ≥150 ${(100 * m.share150.model).toFixed(1)}/${(100 * m.share150.observed).toFixed(1)} %  ` +
        Object.entries(m.gen).filter(([, g]) => g.model > 0.05 || g.observed > 0.05).map(([t, g]) => `${t} ${g.model.toFixed(2)}/${g.observed.toFixed(2)}`).join(", "));
    }
    for (const [c, m] of Object.entries(e.borders)) {
      console.log(`${c.padEnd(7)} net ${m.netFlowTwh.model.toFixed(2)}/${m.netFlowTwh.observed.toFixed(2)} TWh, congested fwd ${(100 * m.congested.fwd.model).toFixed(0)}/${(100 * m.congested.fwd.observed).toFixed(0)} % rev ${(100 * m.congested.rev.model).toFixed(0)}/${(100 * m.congested.rev.observed).toFixed(0)} %, spread p10/50/90 ${m.spread.model.map((x) => x.toFixed(0)).join("/")} vs ${m.spread.observed.map((x) => x.toFixed(0)).join("/")}`);
    }
    if (args.includes("--diagnose")) {
      const { monthOfHour } = await import("../src/engine/build.ts");
      console.log(diagnose(r, v, monthOfHour(pb.hours, yr, true)));
    }
    if (e.failures.length) console.log(`breaches (${e.failures.length}): ${e.failures.join("; ")}`);
    failed += e.failures.length;
  }
  if (args.includes("--check") && failed) process.exit(1);
}
