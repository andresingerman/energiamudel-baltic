// Phase 4 of the research on Finland (docs/research/2026-10-11_finland_2035.md §4): Estonia against Finland. Each
// case's Finnish zone (cases.ts) and v5's opening view price each other through EstLink, climate year by
// climate year, for each of v5's four scenarios:
// - v5 runs with Finland's series in its FI profile's place, SE4 and PL as in force (re-priced DE 2035);
// - the zone model takes EstLink's hourly flow from v5's last run as given, damped by half a step;
// - they alternate until both averages move by less than 0.5 €/MWh, at most eight rounds (six in the log's §0, raised after §3a's first runs).
// SE1 and SE3 stand at TYNDP DE 2035's re-priced level with the 2023–2025 record's shape (method C of the
// boundary-prices log, ties by the Baltic residual load). The flow-based variant shifts Finland's hours by
// the blind year's error, quantile by quantile (§2a): what Test 2's 2025 model priced above the record.
// From app/: `node --no-maglev ../spikes/finland/v5.ts [case …]`.
import { readFileSync } from "node:fs";
import { boundaryPrice, build, impliedBid, monthOfHour } from "../../app/src/engine/build.ts";
import type { Boundary } from "../../app/src/engine/build.ts";
import { account } from "../../app/src/engine/contract.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { boundaryOffers } from "../../app/src/engine/problem.ts";
import { SCENARIOS, engineScenario, opening, runsOf } from "../../app/src/state/model.ts";
import type { State } from "../../app/src/state/model.ts";
import { view } from "../../app/src/worker/view.ts";
import type { Year } from "../../app/src/contract/year.ts";
import { links, presets, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { rankMap } from "../boundary-prices/opening.ts";
import { CASES, CYS, recordPatterns, windMw, zone2035, cyData } from "./cases.ts";
import type { Adequacy, Case } from "./cases.ts";
import { fitLadder, recordInput } from "./tests.ts";
import type { Rec } from "./tests.ts";
import { solveZone } from "./zone.ts";

// D-194 took the re-pricing out of the engine: every profile is as published, so no knots (ported 2026-11-25)
const repriceKnots = (_p: unknown, _s: unknown): [number, number][] | null => null;

const DIR = process.env.FI_DATA ?? "../data/derived/finland";
const H = 8760;
const p = presets(), L = links();
const s0 = opening(p);
const { solve } = await loadSolver();
const mean = (a: ArrayLike<number>) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s / a.length; };
const RES = new Set(["wind_onshore", "wind_offshore", "solar"]);

/** The Baltic residual load of a year as v5 builds it: the weather's order for tied hours. */
function residual(pb: ReturnType<typeof build>): Float64Array {
  const r = new Float64Array(pb.hours);
  for (const z of pb.zones) {
    for (let h = 0; h < pb.hours; h++) r[h] += z.load[h];
    for (const o of z.offers) if (RES.has(o.cls)) for (let h = 0; h < pb.hours; h++) r[h] -= o.mw[h];
  }
  return r;
}

/** One v5 run of a climate year with the neighbours' series given (FI here; FI, SE4 and PL in the research
 * on Sweden and Poland), the others as in force: the Baltic prices, EstLink's flow (+ into Finland), and
 * NordBalt's and LitPol's (+ into SE4 and Poland). */
export function v5Run(st: State, key: string, given: ArrayLike<number> | Partial<Record<Boundary, ArrayLike<number>>>) {
  const y0 = year(key);
  const knots = repriceKnots(p, engineScenario(p, y0, { ...st, neighbourFuel: true }));
  const g = (ArrayBuffer.isView(given) || Array.isArray(given) ? { FI: given } : given) as Partial<Record<Boundary, ArrayLike<number>>>;
  const series = (z: Boundary) => g[z] ? Array.from(g[z]!) : Array.from(boundaryPrice(y0, z, "DE_2035", 1, knots));
  const boundary = Object.fromEntries((["FI", "SE4", "PL"] as Boundary[]).map((z) => [z, { ...y0.boundary[z], DE_2035: series(z) }]));
  const y = { ...y0, boundary } as Year;
  const sc = engineScenario(p, y, { ...st, neighbourFuel: false });
  const pb = build(y, p, L, sc);
  const res = runLP(pb, solve);
  const ee = pb.zones[0], flow = new Float64Array(pb.hours);
  for (const j of boundaryOffers(ee, "export", "FI")) for (let h = 0; h < pb.hours; h++) flow[h] += res.offers[0][j][h];
  for (const j of boundaryOffers(ee, "import", "FI")) for (let h = 0; h < pb.hours; h++) flow[h] -= res.offers[0][j][h];
  const lt = pb.zones[2], out: Record<string, Float64Array> = {};
  for (const z of ["SE4", "PL"]) {
    const f = new Float64Array(pb.hours);
    for (const j of boundaryOffers(lt, "export", z)) for (let h = 0; h < pb.hours; h++) f[h] += res.offers[2][j][h];
    for (const j of boundaryOffers(lt, "import", z)) for (let h = 0; h < pb.hours; h++) f[h] -= res.offers[2][j][h];
    out[z] = f;
  }
  const v = view(pb, res, [{}, {}, {}], monthOfHour(pb.hours, 2035, false));
  const plant = v.plant ? account(v.zones[0].price, v.plant.mw, v.plant.month, st.smr.strike, "hourly", st.smr.clause) : null;
  return { price: v.zones.map((z) => z.price), mean: v.zones.map((z) => z.mean), flow, flows: out as { SE4: Float64Array; PL: Float64Array }, plant, knots, residual: residual(pb) };
}

/** SE1 and SE3 in 2035 for a climate year: TYNDP DE 2035 re-priced, the record's shape at that level. */
function swedes(cy: number, knots: ReturnType<typeof repriceKnots>, tie: Float64Array) {
  const d = cyData(cy), pool = recordPatterns().pool;
  const out: Record<string, Float64Array> = {};
  for (const z of ["SE1", "SE3"]) {
    const t = Float64Array.from(d.tyndpPrice[z]);
    if (knots) for (let h = 0; h < H; h++) if (t[h] > 0 && t[h] < knots[knots.length - 1][0]) t[h] = interp(knots, t[h]);
    const P = Float64Array.from(pool[z]), k = mean(t) / mean(P);
    out[z] = rankMap(t, P.map((x) => x * k), tie);
  }
  return out as { SE1: Float64Array; SE3: Float64Array };
}
function interp(knots: [number, number][], x: number): number {
  for (let i = 1; i < knots.length; i++) {
    const [x0, y0] = knots[i - 1], [x1, y1] = knots[i];
    if (x <= x1) return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
  }
  return knots[knots.length - 1][1];
}

/** The blind year's error by quantile: the 2025 record minus Test 2's 2025 model (§2a). */
function fbShift(): (p: Float64Array) => Float64Array {
  const rec = (y: number): Rec => JSON.parse(readFileSync(`${DIR}/record_${y}.json`, "utf8"));
  const r = rec(2025), m = solveZone(recordInput(r, fitLadder([2023, 2024].map(rec))), solve).price;
  const qo = Float64Array.from(r.price.FI).sort(), qm = Float64Array.from(m).sort();
  return (P) => {
    const order = Array.from(P.keys()).sort((a, b) => P[a] - P[b]);
    const out = new Float64Array(P.length);
    order.forEach((h, i) => { const q = Math.min(qo.length - 1, Math.floor(((i + 0.5) / P.length) * qo.length)); out[h] = P[h] + qo[q] - qm[q]; });
    return out;
  };
}

export const balance: Record<string, Record<string, number>> = {};
/** The peakers a case needs (§3a): steps of 250 MW until the weighted hours of unserved load in Finland,
 * EstLink a border at Estonia's price from v5's first run, are at most 2.1 a year. */
export const STANDARD_H = 2.1;
function sizePeakers(c: Case, wMw: number, runs: { key: string; weight: number }[], sw: Record<string, { SE1: Float64Array; SE3: Float64Array }>, ee: Record<string, Float64Array>, bid: number): number {
  const W = runs.reduce((s, r) => s + r.weight, 0);
  for (let mw = 0; mw <= 20000; mw += 250) {
    let hours = 0;
    for (const r of runs) {
      const cy = Number(r.key.slice(2));
      const z = solveZone(zone2035(c, cy, wMw, sw[r.key], new Float64Array(H), { peakersMw: mw, peakerBid: bid, ee: { price: ee[r.key], imp: 1016, exp: 1016 } }), solve);
      hours += (r.weight / W) * z.shed.reduce((n, x) => n + (x > 1 ? 1 : 0), 0);
    }
    if (hours <= STANDARD_H) return mw;
  }
  throw new Error(`${c.id}: no peaker capacity up to 20 GW meets the standard`);
}
export const peakers: Record<string, number> = {};

interface Row { fi: number; ee: number; lv: number; lt: number; dearer: number; eeExport: number; capture: number | null; cfd: number | null; rounds: number }
let adequacy = !process.env.FI_AS_DEFINED; // §3a; FI_AS_DEFINED=1 reruns the cases as first defined
function runCase(c: Case, shift: ((p: Float64Array) => Float64Array) | null, scenarios: readonly string[] = SCENARIOS) {
  const out: Record<string, Row> = {};
  for (const id of scenarios) {
    balance[id] = {};
    const st: State = { ...s0, scenario: id as State["scenario"] };
    const runs = runsOf(p, st);
    const weights = Object.fromEntries(runs.map((r) => [Number(r.key.slice(2)), r.weight]));
    const wMw = windOverride ?? windMw(c, weights);
    const bid = impliedBid(p, engineScenario(p, year(runs[0].key), st), "gas_ocgt")!;
    // the first run of each climate year on the profile in force: the knots, the Swedes, Estonia's price
    const first: Record<string, ReturnType<typeof v5Run>> = {}, sw: Record<string, { SE1: Float64Array; SE3: Float64Array }> = {};
    for (const r of runs) {
      first[r.key] = v5Run(st, r.key, boundaryPrice(year(r.key), "FI", "DE_2035", 1, repriceKnots(p, engineScenario(p, year(r.key), { ...st, neighbourFuel: true }))));
      sw[r.key] = swedes(Number(r.key.slice(2)), first[r.key].knots, first[r.key].residual);
    }
    if (adequacy && peakers[c.id] === undefined) peakers[c.id] = sizePeakers(c, wMw, runs, sw, Object.fromEntries(runs.map((r) => [r.key, Float64Array.from(first[r.key].price[0])])), bid);
    const a: Adequacy | null = adequacy ? { peakersMw: peakers[c.id], peakerBid: bid } : null;
    const acc: Row = { fi: 0, ee: 0, lv: 0, lt: 0, dearer: 0, eeExport: 0, capture: 0, cfd: 0, rounds: 0 };
    let cap = 0, out_ = 0, plant = false;
    for (const r of runs) {
      const cy = Number(r.key.slice(2));
      // round 0: v5 on the profile in force gives the first flow
      let v = first[r.key];
      let flow = v.flow, fi = new Float64Array(H), last = [NaN, NaN], k = 0, z: ReturnType<typeof solveZone> | null = null;
      for (k = 1; k <= 8; k++) {
        z = solveZone(zone2035(c, cy, wMw, sw[r.key], flow, a), solve);
        fi = shift ? shift(z.price) : z.price;
        v = v5Run(st, r.key, fi);
        const now = [mean(fi), v.mean[0]];
        if (process.env.FI_TRACE) console.error(`  ${c.id} ${id} cy${cy} round ${k}: FI ${now[0].toFixed(2)} EE ${now[1].toFixed(2)} flow ${(mean(flow)).toFixed(0)} → ${(mean(v.flow)).toFixed(0)} MW`);
        if (Math.abs(now[0] - last[0]) < 0.5 && Math.abs(now[1] - last[1]) < 0.5) break;
        last = now;
        flow = flow.map((x, h) => (x + v.flow[h]) / 2);
      }
      acc.rounds = Math.max(acc.rounds, k);
      for (const [cls, mwh] of Object.entries(z!.byClass)) balance[id][cls] = (balance[id][cls] ?? 0) + (r.weight * mwh) / 1e6;
      for (const b of ["SE1", "SE3"]) balance[id][`net import ${b}`] = (balance[id][`net import ${b}`] ?? 0) + (r.weight * z!.trade[b].reduce((a, x) => a + x, 0)) / 1e6;
      acc.fi += r.weight * mean(fi);
      acc.ee += r.weight * v.mean[0]; acc.lv += r.weight * v.mean[1]; acc.lt += r.weight * v.mean[2];
      let d = 0; for (let h = 0; h < H; h++) if (fi[h] > v.price[0][h] + 0.5) d++;
      acc.dearer += (r.weight * d) / H;
      acc.eeExport += (r.weight * v.flow.reduce((s, x) => s + x, 0)) / 1e6;
      if (v.plant) { plant = true; cap += r.weight * v.plant.captureEurMwh * v.plant.outputTwh; out_ += r.weight * v.plant.outputTwh; acc.cfd! += r.weight * v.plant.stateMeur; }
    }
    out[id] = { ...acc, capture: plant ? cap / out_ : null, cfd: plant ? acc.cfd : null };
  }
  return out;
}

/** D, the line: case C's frame (no Aurora Line 2, no EstLink 3, the smelter on) with the data centres'
 * load and the onshore wind varied; Finland's and Estonia's averages on *2 SMR* and *3 SMR*, where
 * Estonia's own supply brings the two near (§4). */
export function runLine(dcs: number[], winds: number[], scenarios = ["smr2", "smr3"]) {
  const base = CASES.find((x) => x.id === "C")!;
  for (const w of winds) for (const dc of dcs) {
    const c: Case = { ...base, id: `D:${dc}:${w}`, dcMw: dc, windTwh: 0 };
    const o = runCaseWind(c, w, scenarios);
    console.log(`D dc ${dc} MW, wind ${w} MW: ` + scenarios.map((id) => `${id} FI ${o[id].fi.toFixed(1)} EE ${o[id].ee.toFixed(1)} (FI−EE ${(o[id].fi - o[id].ee).toFixed(1)}; FI dearer ${(100 * o[id].dearer).toFixed(0)} %)`).join(" | "));
  }
}
let windOverride: number | null = null;
function runCaseWind(c: Case, windMwOverride: number, scenarios: string[]) {
  windOverride = windMwOverride;
  try { return runCase(c, null, scenarios); } finally { windOverride = null; }
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === "line") {
  const list = (v: string | undefined, d: number[]) => (v ? v.split(",").map(Number) : d);
  runLine(list(process.argv[3], [0, 1000, 2000, 3000, 4000]), list(process.argv[4], [12000, 15000, 20000, 26000, 33000]));
} else if (import.meta.url === `file://${process.argv[1]}`) {
  const ids = process.argv.slice(2);
  const shift = fbShift();
  for (const c of CASES.filter((x) => !ids.length || ids.includes(x.id))) {
    const scen = process.env.FI_SCEN ? process.env.FI_SCEN.split(",") : SCENARIOS;
    for (const [tag, sh] of ([["", null], [" (flow-based shift)", shift]] as const).slice(0, process.env.FI_NOSHIFT ? 1 : 2)) {
      const o = runCase(c, sh, scen);
      const f = (x: number) => x.toFixed(1);
      console.log(`${c.id}${tag} · ${c.label}${adequacy ? ` · peakers ${peakers[c.id]} MW at v5's gas_ocgt bid, large loads ${100 * 0.3} % flexible at 500 €/MWh` : ""}: ` + scen.map((id) => {
        const x = o[id];
        return `${id} FI ${f(x.fi)} | EE/LV/LT ${f(x.ee)}/${f(x.lv)}/${f(x.lt)} | FI dearer ${(100 * x.dearer).toFixed(0)} % of hours | EE→FI ${x.eeExport.toFixed(2)} TWh${x.capture !== null ? ` | capture ${f(x.capture)}, CfD ${f(x.cfd!)} M€` : ""} | rounds ${x.rounds}`;
      }).join("  ||  "));
      const b = balance[scen[0]];
      console.log(`   Finland's year, TWh (${scen[0]}): ` + Object.entries(b).filter(([, v]) => Math.abs(v) > 0.05).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(", "));
    }
  }
}
