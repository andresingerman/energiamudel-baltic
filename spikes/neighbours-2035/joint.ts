// Phase 4 of the research on Sweden and Poland (docs/research/2026-10-12_sweden_poland_2035.md §5): the three
// neighbours together with v5, climate year by climate year, for each of v5's four scenarios.
// - Finland's zone (spikes/finland/cases.ts, the research on Finland's case A or C, its adequacy response
//   kept) takes SE12's and SE3's prices as a price-taker and EstLink's flow from v5 as given. Case A runs
//   SE1–FI at 1 900 MW: the Swedish government took Aurora Line 2 out of SvK's plan (§1). Case C runs
//   SE3–FI at 800 MW, as Sweden's case C.
// - The chain [SE12, SE3, SE4, PL] (cases.ts, its peakers as sized standalone) is given the flows Finland's
//   zone and v5 send (SE–FI, NordBalt, LitPol); the other neighbours stay price-takers by the method in force.
// - v5 takes Finland's price, SE4's with 2023's shift and Poland's level on the record's shape (§2c).
// - Every flow is damped by half a step; the run stops when FI, SE4, PL and EE each move by less than
//   0.5 €/MWh, within eight rounds. A run still moving by more than 2 €/MWh is marked unusable.
// - The case's series of the opening scenario are then held fixed in all four scenarios, as an app profile
//   would hold them: the difference from the coupled run is that profile's error.
// - Added after the first coupled run (§5): the peakers sized country by country, each with its neighbours at
//   the method in force, leave the three short at the same hours once all are tight (case C, 2 SMR, cy2009:
//   118 hours of Finland's and 55 of SE4's price at or above 1 000 €/MWh). The peakers are therefore sized
//   jointly, on the opening scenario: from the standalone sizes, each country short of its standard (Finland
//   2.1 h, Sweden 1 h, Poland 3 h) gets the least 250 MW multiple that clears its shed hours above the
//   standard, and the coupled run repeats until all three meet theirs.
// - Added after the CCGT-response runs (§8): once the response sets both Finland's and Sweden's price, the
//   flow between them is not unique and swings from round to round; half-step damping does not settle it.
//   Every given flow is now the running average of the rounds' responses (step 1/(k+1), the averaged
//   iteration for an oscillating fixed point), within NB_ROUNDS rounds (default 20); the stopping rule is
//   unchanged. NB_TAG names the output (joint_<case><tag>.json).
// From app/: `node --no-maglev ../spikes/neighbours-2035/joint.ts A|C`. Writes $NB_DATA/joint_<case>.json.
import { readFileSync, writeFileSync } from "node:fs";
import { SCENARIOS } from "../../app/src/state/model.ts";
import type { State } from "../../app/src/state/model.ts";
import { CASES as FI_CASES, C_WIND_MW, windMw, zone2035 } from "../finland/cases.ts";
import type { Case as FiCase } from "../finland/cases.ts";
import { mean } from "../finland/tests.ts";
import { v5Run } from "../finland/v5.ts";
import { solveZone } from "../finland/zone.ts";
import { CYS, PL_CASES, RESPONSE_BID, S0, SE_CASES, chain, neighbours, plShaped, seShift, solveChainCy, solver, stats, weightOf } from "./cases.ts";
import type { Peakers } from "./cases.ts";
import { DIR } from "./tests.ts";

const id = process.argv[2] ?? "C";
const se = SE_CASES[id], pl = PL_CASES[id];
const fiBase = FI_CASES.find((c) => c.id === id)!;
const fiCase: FiCase = id === "A" ? { ...fiBase, se1: [1900, 1900] } : { ...fiBase, se3: [se.fenno, se.fenno] };
const FI_PEAKERS: Record<string, number> = { A: 0, C: 2750 }; // the research on Finland, §3a
const pk0: Peakers = JSON.parse(readFileSync(`${DIR}/cases_standalone.json`, "utf8"))[id].peakers;
const weights = Object.fromEntries(CYS.map((cy) => [cy, weightOf(cy)]));
const fiWind = id === "C" ? C_WIND_MW : windMw(fiCase, weights);
/** The averaged iteration: the k-th response weighs 1/(k+1) (k = 1 is the half step of §0). */
const damp = (a: ArrayLike<number>, b: ArrayLike<number>, k = 1) => Float64Array.from(a, (x, h) => x + (b[h] - x) / (k + 1));
const ROUNDS = Number(process.env.NB_ROUNDS ?? 20);
const solve = await solver();

async function jointCy(scenario: string, cy: number, pk: Peakers, fiPk: number) {
  const st = { ...S0, scenario } as State, key = `cy${cy}`, nb = neighbours(cy).shaped;
  let v = v5Run(st, key, {});
  let estlink = v.flow, nordbalt = v.flows.SE4, litpol = v.flows.PL;
  let r = await solveChainCy(chain(se, pl, cy, { price: nb }, pk));
  let se12 = seShift.SE12(r.zones[0].price), se3 = seShift.SE3(r.zones[1].price);
  let fi12: Float64Array | null = null, fi3: Float64Array | null = null;
  let last = [NaN, NaN, NaN, NaN], moved = Infinity, k = 0;
  let out = null as null | { fi: Float64Array; se4: Float64Array; pl: Float64Array; plModel: Float64Array; fz: ReturnType<typeof solveZone> };
  for (k = 1; k <= ROUNDS; k++) {
    const fz = solveZone(zone2035(fiCase, cy, fiWind, { SE1: se12, SE3: se3 }, estlink, { peakersMw: fiPk, peakerBid: RESPONSE_BID }), solve);
    const g12 = fz.trade.SE1.map((x) => -x), g3 = fz.trade.SE3.map((x) => -x);
    fi12 = fi12 ? damp(fi12, g12, k - 1) : g12;
    fi3 = fi3 ? damp(fi3, g3, k - 1) : g3;
    r = await solveChainCy(chain(se, pl, cy, { price: nb, given: { fi12, fi3, lt4: nordbalt, ltPL: litpol } }, pk));
    se12 = seShift.SE12(r.zones[0].price); se3 = seShift.SE3(r.zones[1].price);
    const se4 = seShift.SE4(r.zones[2].price), plp = plShaped(cy, r.zones[3].price);
    v = v5Run(st, key, { FI: fz.price, SE4: se4, PL: plp });
    const now = [mean(fz.price), mean(se4), mean(plp), v.mean[0]];
    moved = Math.max(...now.map((x, i) => Math.abs(x - last[i])));
    out = { fi: fz.price, se4, pl: plp, plModel: r.zones[3].price, fz };
    if (process.env.NB_TRACE) console.error(`  ${id} ${scenario} cy${cy} round ${k}: FI ${now[0].toFixed(2)} SE4 ${now[1].toFixed(2)} PL ${now[2].toFixed(2)} EE ${now[3].toFixed(2)}`);
    if (moved < 0.5) break;
    last = now;
    estlink = damp(estlink, v.flow, k); nordbalt = damp(nordbalt, v.flows.SE4, k); litpol = damp(litpol, v.flows.PL, k);
  }
  const shed = { FI: out!.fz.shed.reduce((a, b) => a + b, 0) / 1e3, ...Object.fromEntries(["SE12", "SE3", "SE4", "PL"].map((z, i) => [z, r.zones[i].shed.reduce((a, b) => a + b, 0) / 1e3])) };
  const hourly = { FI: Float64Array.from(out!.fz.shed), SE: Float64Array.from({ length: 8760 }, (_, h) => r.zones[0].shed[h] + r.zones[1].shed[h] + r.zones[2].shed[h]), PL: Float64Array.from(r.zones[3].shed) };
  return { cy, rounds: Math.min(k, ROUNDS), moved, series: { FI: out!.fi, SE4: out!.se4, PL: out!.pl }, plModel: out!.plModel, se12, se3, v, shed, hourly };
}

type Row = Awaited<ReturnType<typeof jointCy>>;
function summary(rows: Row[]) {
  const w = (f: (r: Row) => number) => rows.reduce((s, r) => s + weightOf(r.cy) * f(r), 0);
  const ws = (f: (r: Row) => ArrayLike<number>) => { const s = rows.map((r) => ({ w: weightOf(r.cy), s: stats(f(r)) })); return Object.fromEntries((Object.keys(s[0].s) as (keyof ReturnType<typeof stats>)[]).map((k) => [k, s.reduce((a, x) => a + x.w * x.s[k], 0)])); };
  const plant = rows[0].v.plant !== null;
  const out = (r: Row) => r.v.plant!.outputTwh;
  return {
    FI: ws((r) => r.series.FI), SE4: ws((r) => r.series.SE4), PL: ws((r) => r.series.PL), PLmodel: ws((r) => r.plModel),
    SE12: ws((r) => r.se12), SE3: ws((r) => r.se3),
    EE: ws((r) => r.v.price[0]), LV: w((r) => r.v.mean[1]), LT: w((r) => r.v.mean[2]),
    eeToFi: w((r) => r.v.flow.reduce((a, b) => a + b, 0) / 1e6), nordbaltIntoSE4: w((r) => r.v.flows.SE4.reduce((a, b) => a + b, 0) / 1e6),
    litpolIntoPL: w((r) => r.v.flows.PL.reduce((a, b) => a + b, 0) / 1e6),
    capture: plant ? w((r) => r.v.plant!.captureEurMwh * out(r)) / w(out) : null, cfd: plant ? w((r) => r.v.plant!.stateMeur) : null,
    rounds: Math.max(...rows.map((r) => r.rounds)), moved: Math.max(...rows.map((r) => r.moved)), shed: Object.fromEntries(Object.keys(rows[0].shed).map((z) => [z, w((r) => r.shed[z as keyof typeof r.shed])])),
  };
}

const STANDARD: Record<"FI" | "SE" | "PL", number> = { FI: 2.1, SE: 1, PL: 3 };
/** The weighted hours a country sheds more than `mw` beyond what it sheds now. */
const loleAbove = (rows: Row[], c: keyof typeof STANDARD, mw: number) => rows.reduce((s, r) => s + weightOf(r.cy) * Array.from(r.hourly[c]).filter((x) => x > mw + 1).length, 0);
// NB_SIZED=1 keeps the joint sizes of the run before (joint_<case>.json) and only re-prices the response
const RESP = (process.env.NB_RESPONSE === "ccgt" ? "_ccgt" : "") + (process.env.NB_TAG ?? "");
const prior = process.env.NB_SIZED ? JSON.parse(readFileSync(`${DIR}/joint_${id}${process.env.NB_SIZED === "1" ? "" : process.env.NB_SIZED}.json`, "utf8")) : null;
let pk = prior ? prior.peakers as Peakers : { ...pk0 }, fiPk = prior ? prior.fiPeakers as number : FI_PEAKERS[id];
const sizing: string[] = prior ? prior.sizing : [];
for (let it = 0; it < (prior ? 0 : 6); it++) {
  const rows: Row[] = [];
  for (const cy of CYS) rows.push(await jointCy(S0.scenario, cy, pk, fiPk));
  const lole = Object.fromEntries((Object.keys(STANDARD) as (keyof typeof STANDARD)[]).map((c) => [c, loleAbove(rows, c, 0)]));
  sizing.push(`round ${it}: peakers FI ${fiPk}, SE3 ${pk.se3}, SE4 ${pk.se4}, PL ${pk.pl} MW → LOLE FI ${lole.FI.toFixed(1)} h, SE ${lole.SE.toFixed(1)} h, PL ${lole.PL.toFixed(1)} h`);
  console.log(`${id} joint adequacy ${sizing[sizing.length - 1]}`);
  if ((Object.keys(STANDARD) as (keyof typeof STANDARD)[]).every((c) => lole[c] <= STANDARD[c])) break;
  const add = (c: keyof typeof STANDARD) => { let mw = 0; while (loleAbove(rows, c, mw) > STANDARD[c]) mw += 250; return mw; };
  fiPk += add("FI");
  const se = add("SE");
  pk = { se3: pk.se3 + 0.8 * se, se4: pk.se4 + 0.2 * se, pl: pk.pl + add("PL") };
}
const result: Record<string, ReturnType<typeof summary>> = {}, fixed: Record<string, unknown> = {};
const series: Record<string, Record<number, { FI: number[]; SE4: number[]; PL: number[] }>> = {};
const SCENS = process.env.NB_SCEN ? process.env.NB_SCEN.split(",") : SCENARIOS; // a subset for a check
for (const scen of SCENS) {
  const rows: Row[] = [];
  for (const cy of CYS) rows.push(await jointCy(scen, cy, pk, fiPk));
  result[scen] = summary(rows);
  series[scen] = Object.fromEntries(rows.map((r) => [r.cy, { FI: Array.from(r.series.FI), SE4: Array.from(r.series.SE4), PL: Array.from(r.series.PL) }]));
  const s = result[scen];
  const f = (x: number) => x.toFixed(1);
  console.log(`${id} ${scen}: FI ${f(s.FI.mean)} SE4 ${f(s.SE4.mean)} PL ${f(s.PL.mean)} (model ${f(s.PLmodel.mean)}) | EE/LV/LT ${f(s.EE.mean)}/${f(s.LV)}/${f(s.LT)} | EE ≥150 ${f(s.EE.h150)} h | EE→FI ${s.eeToFi.toFixed(2)} TWh, NordBalt into SE4 ${s.nordbaltIntoSE4.toFixed(2)}, LitPol into PL ${s.litpolIntoPL.toFixed(2)}${s.capture !== null ? ` | capture ${f(s.capture)}, CfD ${f(s.cfd!)} M€` : ""} | rounds ${s.rounds}, last move ${s.moved.toFixed(2)}${s.moved > 2 ? " UNUSABLE" : ""} | shed GWh ` + Object.entries(s.shed).map(([z, x]) => `${z} ${(x as number).toFixed(1)}`).join(", "));
}
// the opening scenario's series held fixed, as an app profile holds them
const open = SCENS.includes(S0.scenario) ? S0.scenario : SCENS[0];
for (const scen of SCENS) {
  const rows = CYS.map((cy) => ({ cy, v: v5Run({ ...S0, scenario: scen } as State, `cy${cy}`, { FI: series[open][cy].FI, SE4: series[open][cy].SE4, PL: series[open][cy].PL }) }));
  const w = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + weightOf(r.cy) * f(r), 0);
  const plant = rows[0].v.plant !== null;
  const o = (r: (typeof rows)[number]) => r.v.plant!.outputTwh;
  const ee = w((r) => r.v.mean[0]), cap = plant ? w((r) => r.v.plant!.captureEurMwh * o(r)) / w(o) : null, cfd = plant ? w((r) => r.v.plant!.stateMeur) : null;
  fixed[scen] = { EE: ee, LV: w((r) => r.v.mean[1]), LT: w((r) => r.v.mean[2]), capture: cap, cfd };
  console.log(`${id} ${scen} with the ${open} series fixed: EE ${ee.toFixed(1)} (coupled ${result[scen].EE.mean.toFixed(1)})${cap !== null ? ` | capture ${cap.toFixed(1)} (coupled ${result[scen].capture!.toFixed(1)}), CfD ${cfd!.toFixed(1)} (coupled ${result[scen].cfd!.toFixed(1)}) M€` : ""}`);
}
writeFileSync(`${DIR}/joint_${id}${RESP}.json`, JSON.stringify({ result, fixed, series, peakers: pk, fiPeakers: fiPk, standalonePeakers: pk0, sizing, fiWindMw: fiWind }));
