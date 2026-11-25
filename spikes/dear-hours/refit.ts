// A variant's register refitted as app/scripts/fit_markup.ts fits it — per fit year a schedule by
// coordinate descent from zero on the increments (steps 40, 20, 10, 5 €/MWh), on the sum of the three
// zones' MAE; the register their average — then 2023–2025 scored on it: MAE, R-VAL-5's breaches,
// the dear hours (docs/research/2026-10-11_dear_hours.md, Phase 3). Δ stays the register's (71): it
// moves 2026 alone, which stays sealed. `node --no-maglev spikes/dear-hours/refit.ts <variant> [m1,m2,m3,m4]`
// from app/ (a schedule given is scored, not fitted). JSON on stdout, progress on stderr.
import { MARKUP_EDGES, build } from "../../app/src/engine/build.ts";
import type { PerZone } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import type { Problem } from "../../app/src/engine/problem.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { mae } from "../../app/src/worker/metrics.ts";
import { presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { evaluate } from "../../app/scripts/validate_fit.ts";
import { bare, onLvLt, remark } from "./markup.ts";
import { kruonisWeekly } from "./screens.ts";
import { segments, tranches, units } from "./strategic.ts";
import { tail } from "./tail.ts";

type Built = { pb: Problem; boundary: Record<string, number[]> };
const p = presets();
const withMarkup = (yr: number, m: number[]): Built => {
  const y = year(String(yr));
  return { pb: build(y, p, null, { ...replay(p, y), markup: onLvLt(m) as PerZone<number[]> }), boundary: { FI: y.boundary.FI.observed, SE4: y.boundary.SE4.observed, PL: y.boundary.PL.observed } };
};
const form = (f: "v4" | "fleet") => (yr: number, m: number[]): Built => { const b = bare(yr); remark(b.pb, onLvLt(m) as PerZone<number[]>, f); return b; };
const plus = (make: (yr: number, m: number[]) => Built, then: (pb: Problem, yr: number) => void) => (yr: number, m: number[]) => { const b = make(yr, m); then(b.pb, yr); return b; };
export const VARIANTS: Record<string, (yr: number, m: number[]) => Built> = {
  base: withMarkup,
  v4: form("v4"),
  fleet: form("fleet"),
  kp90: plus(withMarkup, (pb, yr) => kruonisWeekly(pb, yr, 0.9)),
  "v4+kp90": plus(form("v4"), (pb, yr) => kruonisWeekly(pb, yr, 0.9)),
  "fleet+kp90": plus(form("fleet"), (pb, yr) => kruonisWeekly(pb, yr, 0.9)),
  "fleet+kp80": plus(form("fleet"), (pb, yr) => kruonisWeekly(pb, yr, 0.8)),
  "fleet+kp95": plus(form("fleet"), (pb, yr) => kruonisWeekly(pb, yr, 0.95)),
  // Kruonis in tranches charging at Δ + j·s (strategic.ts), against one Δ for the plant
  tr4s30: plus(withMarkup, (pb) => tranches(pb, 4, 30)),
  tr4s45: plus(withMarkup, (pb) => tranches(pb, 4, 45)),
  tr2s60: plus(withMarkup, (pb) => tranches(pb, 2, 60)),
  delta90: plus(withMarkup, (pb) => { pb.storage.find((u) => u.name === "kruonis")!.delta = 90; }),
  "fleet+tr4s30": plus(form("fleet"), (pb) => tranches(pb, 4, 30)),
  u4s45: plus(withMarkup, (pb) => units(pb, 45)),
};
// the engine's own shares since D-115 is in build.ts (kruonisUnits): its step set through the scenario
const engineStep = (step: number) => (yr: number, m: number[]): Built => {
  const y = year(String(yr));
  return { pb: build(y, p, null, { ...replay(p, y), markup: onLvLt(m) as PerZone<number[]>, kruonisStep: step }), boundary: { FI: y.boundary.FI.observed, SE4: y.boundary.SE4.observed, PL: y.boundary.PL.observed } };
};
for (const st of [0, 15, 30, 45, 60, 90, 120]) VARIANTS[`e${st}`] = engineStep(st);
// one reservoir whose output runs in four segments of the hour's power at j·s (strategic.ts segments)
for (const st of [15, 30, 45, 60, 90]) VARIANTS[`seg${st}`] = (yr, m) => { const b = engineStep(0)(yr, m); segments(b.pb, st); return b; };

// a variant fitted with one more parameter beside the markup: Kruonis's tranche step s, a fifth
// coordinate of the descent (from 0, where four tranches at Δ are the one store)
const WITH_S: Record<string, (yr: number, m: number[], s: number) => Built> = {
  tr4fit: (yr, m, s) => { const b = withMarkup(yr, m); tranches(b.pb, 4, s); return b; },
  u4fit: (yr, m, s) => { const b = withMarkup(yr, m); units(b.pb, s); return b; },
  // one Δ for the whole plant, 60 + s: the comparison the units' convex cost has to beat
  dfit: (yr, m, s) => { const b = withMarkup(yr, m); b.pb.storage.find((u) => u.name === "kruonis")!.delta += s; return b; },
};
const name = process.argv[2] ?? "base";
const withS = WITH_S[name];
const make = withS ? (yr: number, m: number[]) => withS(yr, m.slice(0, 4), m[4]) : VARIANTS[name];
if (!make) throw new Error(`no variant ${name}`);
const given = process.argv[3]?.split(",").map(Number) ?? null;
const { solve } = await loadSolver();
const BINS = MARKUP_EDGES.length - 1, STEPS = [40, 20, 10, 5];
const N = BINS + (withS ? 1 : 0);
// the markup's increments are cumulated; s is taken as it is
const cumulative = (d: number[]) => d.map((x, k) => (k < BINS ? d.slice(0, k + 1).reduce((a, y) => a + y, 0) : x));
let evaluations = 0;
const objective = (m: number[], yr: number) => {
  evaluations++;
  const { pb } = make(yr, m), r = runLP(pb, solve), v = validation(String(yr));
  return ZONES.reduce((j, z, i) => j + mae(r.price[i], v.price[z]), 0);
};
function descend(yr: number): number[] {
  let d = new Array<number>(N).fill(0), best = objective(cumulative(d), yr);
  for (const step of STEPS) {
    let improved = true;
    while (improved) {
      improved = false;
      for (let k = 0; k < N; k++) for (const sign of [1, -1]) {
        const x = d[k] + sign * step;
        if (x < 0) continue;
        const trial = d.map((v, i) => (i === k ? x : v));
        const j = objective(cumulative(trial), yr);
        if (j < best - 0.01) { best = j; d = trial; improved = true; console.error(`${name} ${yr}, step ${step}: bin ${k} → ${x}; ${best.toFixed(2)} (${evaluations})`); }
      }
    }
  }
  return cumulative(d);
}
const folds = given ? null : [2023, 2024].map((yr) => { const s = descend(yr); return { year: yr, schedule: s, own: objective(s, yr), other: objective(s, yr === 2023 ? 2024 : 2023) }; });
const markup = given ?? folds![0].schedule.map((_, k) => (folds![0].schedule[k] + folds![1].schedule[k]) / 2);
const r2 = (x: number) => Math.round(x * 100) / 100;
const rows = [2023, 2024, 2025].map((yr) => {
  const { pb, boundary } = make(yr, markup), r = runLP(pb, solve), v = validation(String(yr));
  const e = evaluate(yr, pb, r, v, boundary), t = tail(yr, pb, r, boundary);
  const bin = (x: { bin: string; n: number; mean: number }[], k: string) => x.find((y) => y.bin.startsWith(k))!;
  return {
    year: yr, mae: ZONES.map((z) => r2(e.zones[z].mae)), sum: r2(ZONES.reduce((s, z) => s + e.zones[z].mae, 0)),
    breaches: e.failures.length, failures: e.failures,
    dcRmse: ZONES.map((z) => r2(e.zones[z].durationRmse)),
    share150: t.map((z) => z.share150), q99: t.map((z) => z.quantiles[3].model),
    dear: t.map((z) => ({ zone: z.zone, record250: bin(z.byObserved, "(250").mean, record150: bin(z.byObserved, "(150").mean, model250: bin(z.byModel, "(250").mean, model250n: bin(z.byModel, "(250").n, model150: bin(z.byModel, "(150").mean, overlap250: z.overlap[1].sameHour })),
  };
});
for (const x of rows) console.error(`${name} ${x.year}: MAE ${x.mae.join("/")} (Σ ${x.sum}) breaches ${x.breaches} | ≥150 ${x.share150.map((s) => s.join("/")).join(" ")} | LT >250 ${x.dear[2].record250} 150–250 ${x.dear[2].record150} | model's own >250 ${x.dear[2].model250} (${x.dear[2].model250n} h) 150–250 ${x.dear[2].model150}`);
console.log(JSON.stringify({ variant: name, markup, folds, evaluations, fitSum: folds ? r2(folds.reduce((s, f) => s + f.own, 0)) : null, leftOutSum: folds ? r2(folds.reduce((s, f) => s + f.other, 0)) : null, rows }));
