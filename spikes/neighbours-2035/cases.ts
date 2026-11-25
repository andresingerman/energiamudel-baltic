// Phase 3 of the research on Sweden and Poland (docs/research/2026-10-12_sweden_poland_2035.md §3): the 2035
// cases and the chain [SE12, SE3, SE4, PL] each builds for a climate year, on v5's engine (zone.ts).
// - The cases are written in the log before their runs; the numbers here are those.
// - What the record taught the models stays: Sweden's CHP ladders (fitted on 2023), the reservoir's
//   horizon (WEEKLY), SE12's hydro band; Poland's premium ladders over each vintage's short-run cost.
// - Neighbours are price-takers by the method of the profile in force: TYNDP DE 2035's marginal cost of
//   their node, re-priced to the scenario's fuels (`repriceKnots`), with the 2023–2025 record's shape
//   (`rankMap`, ties by the Baltic residual load). Finland and Lithuania stand at the same method here;
//   the joint run (joint.ts) replaces them with Finland's zone model and v5.
// - The adequacy response (§3): OCGT peakers at the scenario's short-run cost, by bisection on a 250 MW
//   grid, until each country meets its own standard (Poland 3 h, Sweden 1 h a year), Poland first.
// From app/: `node --no-maglev ../spikes/neighbours-2035/cases.ts [A C Cde …]`, `… line se|pl`.
import { readFileSync, writeFileSync } from "node:fs";
import { build, impliedBid, pathValue } from "../../app/src/engine/build.ts";
import { WEEKLY } from "../../app/src/engine/lp.ts";
import { engineScenario, opening, runsOf } from "../../app/src/state/model.ts";
import { links, presets, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { rankMap } from "../boundary-prices/opening.ts";
import { mean, quantile } from "../finland/tests.ts";
import { solveChain } from "../finland/zone.ts";
import type { Link, ZoneInput } from "../finland/zone.ts";
import { DIR, rankShift, srmc } from "./tests.ts";

// D-194 took the re-pricing out of the engine: every profile is as published, so no knots (ported 2026-11-25)
const repriceKnots = (_p: unknown, _s: unknown): [number, number][] | null => null;

const H = 8760, P = presets(), L = links();
// the opening state at the neighbours' level 1: a coupled run computes Finland, SE4 and Poland itself, and the owner's
// levels belong to Distributed Energy 2035's published profile alone (D-190; before, they multiplied the coupled series)
export const S0 = { ...opening(P), level: { FI: 1, SE4: 1, PL: 1 } };
export const RUNS = runsOf(P, S0);
const WSUM = RUNS.reduce((s, r) => s + r.weight, 0);
export const CYS = RUNS.map((r) => Number(r.key.slice(2)));
export const weightOf = (cy: number) => RUNS.find((r) => r.key === `cy${cy}`)!.weight / WSUM;

interface Cy {
  cy: number; cf: Record<string, Record<string, number[]>>; demandShape: Record<string, number[]>;
  se12HydroWeeklyMwh: number[]; hydroGiven: Record<string, number[]>; tyndpPrice: Record<string, number[]>;
}
const cyCache = new Map<number, Cy>();
export const cyData = (cy: number): Cy => { if (!cyCache.has(cy)) cyCache.set(cy, JSON.parse(readFileSync(`${DIR}/nb2035_cy${cy}.json`, "utf8"))); return cyCache.get(cy)!; };
const blockCache = new Map<number, Record<string, Record<string, number[]>>>();
const tyndpBlock = (cy: number) => { if (!blockCache.has(cy)) blockCache.set(cy, JSON.parse(readFileSync(`${DIR}/tyndp_SEPL_DE2035_cy${cy}.json`, "utf8")).block); return blockCache.get(cy)!; };
export const REC = JSON.parse(readFileSync(`${DIR}/nb2035_record.json`, "utf8"));
export const T2 = JSON.parse(readFileSync(`${DIR}/test2.json`, "utf8"));
const TECH = P.tech as Record<string, Record<string, { value: number }>>;

// ---------------------------------------------------------------- fuels, neighbours
const PATH = "eraa2025_final"; // the opening state's fuel path (model.ts)
export const FUEL = { // €/MWh of fuel (pathValue converts the path's €/GJ) and €/t
  gas: pathValue(P, PATH, "gas", 2035), coal: pathValue(P, PATH, "hard_coal", 2035),
  lignite: pathValue(P, PATH, "brown_coal", 2035), eua: pathValue(P, PATH, "eua", 2035),
};
export const PEAKER_BID = impliedBid(P, engineScenario(P, year(RUNS[0].key), S0), "gas_ocgt")!;
const fuelOf = (row: string) => (row.startsWith("hard_coal") ? FUEL.coal : row.startsWith("lignite") ? FUEL.lignite : FUEL.gas);
export const cost = (row: string) => srmc(row, fuelOf(row), FUEL.eua);
/** What the adequacy response bids (§5, added after the first coupled runs): OCGT peakers as §3 wrote it,
 * or, with NB_RESPONSE=ccgt, new CCGTs: the plant a deficit of thousands of hours a year would get. */
export const RESPONSE_BID = process.env.NB_RESPONSE === "ccgt" ? cost("gas_ccgt_new") : PEAKER_BID;
/** Germany at SvK LMA 2026's 2040 MM level (Fig 26 p.75), carried to the scenario's fuels by the ratio of the
 * CCGT's short-run cost: the scenario's new CCGT against LMA's own (Tab 9 p.53, 2040: 96.0 €/MWh). */
export const DE_LMA = 79.6 * (cost("gas_ccgt_new") / 96.0);

export const NB_NODE: Record<string, string> = { NO1: "NOS0", NO3: "NOM1", NO4: "NON1", DK1: "DKW1", DK2: "DKE1", DE: "DE00", CZ: "CZ00", SK: "SK00", LT: "LT00", FI: "FI00", SE4: "SE04", PL: "PL00", SE1: "SE01", SE2: "SE02", SE3: "SE03" };
const RES_CLS = new Set(["wind_onshore", "wind_offshore", "solar"]);
function residual(pb: ReturnType<typeof build>): Float64Array {
  const r = new Float64Array(pb.hours);
  for (const z of pb.zones) {
    for (let h = 0; h < pb.hours; h++) r[h] += z.load[h];
    for (const o of z.offers) if (RES_CLS.has(o.cls)) for (let h = 0; h < pb.hours; h++) r[h] -= o.mw[h];
  }
  return r;
}
function interp(knots: [number, number][], x: number): number {
  for (let i = 1; i < knots.length; i++) {
    const [x0, y0] = knots[i - 1], [x1, y1] = knots[i];
    if (x <= x1) return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
  }
  return knots[knots.length - 1][1];
}
const nbCache = new Map<number, { repriced: Record<string, Float64Array>; shaped: Record<string, Float64Array>; tie: Float64Array }>();
/** Every node's TYNDP DE 2035 marginal cost re-priced to the opening scenario's fuels, and the same hours
 * at the 2023–2025 record's values scaled to that level (the method of the profile in force). */
export function neighbours(cy: number) {
  if (nbCache.has(cy)) return nbCache.get(cy)!;
  const y = year(`cy${cy}`), d = cyData(cy);
  const knots = repriceKnots(P, engineScenario(P, y, { ...S0, neighbourFuel: true })) as [number, number][] | null;
  const tie = residual(build(y, P, L, engineScenario(P, y, S0)));
  const repriced: Record<string, Float64Array> = {}, shaped: Record<string, Float64Array> = {};
  for (const [z, node] of Object.entries(NB_NODE)) {
    const t = Float64Array.from(d.tyndpPrice[node]);
    if (knots) for (let h = 0; h < H; h++) if (t[h] > 0 && t[h] < 500) t[h] = interp(knots, t[h]);
    repriced[z] = t;
    const pool = Float64Array.from(REC.pool[z] as number[]), k = mean(t) / mean(pool);
    shaped[z] = rankMap(t, pool.map((x) => x * k), tie);
  }
  const out = { repriced, shaped, tie };
  nbCache.set(cy, out);
  return out;
}

// ---------------------------------------------------------------- the cases (§3)
export interface SeCase {
  demandTwh: Record<"SE1" | "SE2" | "SE3" | "SE4", number>;
  dcMw: Record<"SE12" | "SE3" | "SE4", number>;
  h2Twh: number; h2FlatShare: number;
  onshoreGw: Record<"SE1" | "SE2" | "SE3" | "SE4", number>; offshoreGw: number;
  solarGw: Record<"SE1" | "SE2" | "SE3" | "SE4", number>;
  nuclearGw: number; nuclearWinterOutMw: number;
  chpGw: Record<"SE12" | "SE3" | "SE4", number>; gasSE4Mw: number;
  batteriesGw: number; drGw: number;
  cut2: [number, number]; cut4: [number, number];
  fenno: number; konti: number; baltic: number;
}
export interface PlCase {
  demandTwh: number; dcTwh: number; h2FlatMw: number; h2FlexMw: number;
  units: { row: string; cls: "hard_coal" | "brown_coal" | "gas"; gw: number }[];
  peakersGw: number; onshoreGw: number; offshoreGw: number; solarGw: number;
  batteriesGw: number; pumpedGw: number; drGw: number; core: [number, number];
}
const NJWCD = 4.6; // PSE PRSP Tab 10.3: CHP and industrial units, half on coal, half on gas
const plUnits = (hcNew: number, hcOld: number, lgNew: number, lgOld: number, ccgtNew: number): PlCase["units"] => [
  { row: "hard_coal_new", cls: "hard_coal", gw: hcNew }, { row: "hard_coal_old_2", cls: "hard_coal", gw: hcOld + NJWCD / 2 },
  { row: "lignite_new", cls: "brown_coal", gw: lgNew }, { row: "lignite_old_2", cls: "brown_coal", gw: lgOld },
  { row: "gas_ccgt_present_1", cls: "gas", gw: 3.47 + NJWCD / 2 }, { row: "gas_ccgt_new", cls: "gas", gw: ccgtNew },
];
export const SE_CASES: Record<string, SeCase> = {
  A: { demandTwh: { SE1: 41, SE2: 32, SE3: 117, SE4: 27 }, dcMw: { SE12: 230, SE3: 1400, SE4: 200 }, h2Twh: 19, h2FlatShare: 0.5,
    onshoreGw: { SE1: 5.7, SE2: 11.4, SE3: 6.7, SE4: 2.8 }, offshoreGw: 0.2, solarGw: { SE1: 0.2, SE2: 0.4, SE3: 4.8, SE4: 4.2 },
    nuclearGw: 7.0, nuclearWinterOutMw: 0, chpGw: { SE12: 0.95, SE3: 2.55, SE4: 0.7 }, gasSE4Mw: 440, batteriesGw: 7.1, drGw: 2.4,
    cut2: [9600, 7300], cut4: [6200, 2800], fenno: 1200, konti: 715, baltic: 615 },
  C: { demandTwh: { SE1: 49, SE2: 33, SE3: 124, SE4: 28 }, dcMw: { SE12: 350, SE3: 2200, SE4: 300 }, h2Twh: 27, h2FlatShare: 1,
    onshoreGw: { SE1: 4.3, SE2: 9.9, SE3: 4.9, SE4: 2.4 }, offshoreGw: 0, solarGw: { SE1: 0.2, SE2: 0.4, SE3: 4.0, SE4: 3.9 },
    nuclearGw: 7.0, nuclearWinterOutMw: 1100, chpGw: { SE12: 0.95, SE3: 2.2, SE4: 0.65 }, gasSE4Mw: 0, batteriesGw: 3.7, drGw: 1.8,
    cut2: [8100, 7300], cut4: [6200, 2800], fenno: 800, konti: 0, baltic: 615 },
};
export const PL_CASES: Record<string, PlCase> = {
  A: { demandTwh: 203, dcTwh: 8, h2FlatMw: 500, h2FlexMw: 0, units: plUnits(4.0, 1.8, 1.3, 1.8, 6.73), peakersGw: 4.0,
    onshoreGw: 24.6, offshoreGw: 12.4, solarGw: 41.4, batteriesGw: 12.9, pumpedGw: 2.4, drGw: 2.5, core: [4700, 5600] },
  C: { demandTwh: 216, dcTwh: 17, h2FlatMw: 450, h2FlexMw: 1050, units: plUnits(3.5, 0, 0.45, 0, 5.53), peakersGw: 2.0,
    onshoreGw: 17.0, offshoreGw: 9.1, solarGw: 36.0, batteriesGw: 6.1, pumpedGw: 1.37, drGw: 1.3, core: [3400, 4600] },
};
const CHP_2026: Record<string, number> = { SE12: 0.27 + 0.79, SE3: 2.51, SE4: 1.31 }; // svk_kraftbalans_2026 pp.16–17
const H2_BID = 40, DR_PRICE = 300, DR_HOURS = 4, BAT = { hours: 2, eff: 0.9, delta: 71.5 };
const weekOf = (h: number) => Math.min(52, Math.floor(h / 168));
const monthOf = (h: number) => new Date(Date.UTC(2035, 0, 1) + h * 3600e3).getUTCMonth();
const flat = (v: number) => new Float64Array(H).fill(v);
const W = Math.ceil(H / 168);

/** What the chain takes from outside: each neighbour's price, and the flows the joint run gives instead. */
export interface Outside { price: Record<string, ArrayLike<number>>; given?: { fi12?: ArrayLike<number>; fi3?: ArrayLike<number>; lt4?: ArrayLike<number>; ltPL?: ArrayLike<number> } }
export interface Peakers { se3: number; se4: number; pl: number }

function seZones(c: SeCase, cy: number, o: Outside, pk: Peakers): ZoneInput[] {
  const d = cyData(cy), cf = d.cf, sh = d.demandShape;
  const avg = (twh: number) => (twh * 1e6) / H;
  const h2Mw = avg(c.h2Twh), h2Flat = h2Mw * c.h2FlatShare, h2Flex = h2Mw - h2Flat;
  const base = {
    SE12: avg(c.demandTwh.SE1 + c.demandTwh.SE2 - c.h2Twh) - c.dcMw.SE12,
    SE3: avg(c.demandTwh.SE3) - c.dcMw.SE3, SE4: avg(c.demandTwh.SE4) - c.dcMw.SE4,
  };
  const w1 = c.demandTwh.SE1 / (c.demandTwh.SE1 + c.demandTwh.SE2);
  const shape = { SE12: sh.SE01.map((x, h) => w1 * x + (1 - w1) * sh.SE02[h]), SE3: sh.SE03, SE4: sh.SE04 };
  const totBase = base.SE12 + base.SE3 + base.SE4;
  const zs = (["SE12", "SE3", "SE4"] as const).map((z, i): ZoneInput => {
    const k = c.chpGw[z] / CHP_2026[z];
    const lo = Float64Array.from({ length: H }, (_, h) => k * REC[`chpFloorMw_${z}`][weekOf(h)]);
    const hi = Float64Array.from({ length: H }, (_, h) => k * REC[`chpMaxMw_${z}`][weekOf(h)]);
    const wind = z === "SE12" ? cf.SE01.wind_onshore.map((x, h) => x * c.onshoreGw.SE1 * 1000 + cf.SE02.wind_onshore[h] * c.onshoreGw.SE2 * 1000)
      : cf[z === "SE3" ? "SE03" : "SE04"].wind_onshore.map((x) => x * c.onshoreGw[z] * 1000);
    const solar = z === "SE12" ? cf.SE02.solar.map((x) => x * (c.solarGw.SE1 + c.solarGw.SE2) * 1000)
      : cf[z === "SE3" ? "SE03" : "SE04"].solar.map((x) => x * c.solarGw[z] * 1000);
    const fixed: ZoneInput["fixed"] = [{ cls: "chp_floor", mw: lo }];
    if (z === "SE3") fixed.push({ cls: "nuclear", mw: Float64Array.from({ length: H }, (_, h) => c.nuclearGw * 1000 * REC.seNuclearWeekly[weekOf(h)] - ([11, 0, 1].includes(monthOf(h)) ? c.nuclearWinterOutMw : 0)) });
    if (z !== "SE12") fixed.push({ cls: "hydro_given", mw: d.hydroGiven[z === "SE3" ? "SE03" : "SE04"] });
    const supply: ZoneInput["supply"] = (T2.se.ladders[i] as { bid: number; share: number }[]).map((t) => ({ cls: "chp", bid: t.bid, mw: Float64Array.from({ length: H }, (_, h) => t.share * Math.max(0, hi[h] - lo[h])) }));
    const pkMw = z === "SE3" ? pk.se3 : z === "SE4" ? pk.se4 : 0;
    if (pkMw) supply.push({ cls: "peaker", bid: RESPONSE_BID, mw: flat(pkMw) });
    if (z === "SE4" && c.gasSE4Mw) supply.push({ cls: "gas", bid: cost("gas_ccgt_present_1"), mw: flat(c.gasSE4Mw) });
    const borders: ZoneInput["borders"] = [];
    const P = o.price;
    if (z === "SE12") {
      if (!o.given?.fi12) borders.push({ name: "FI", price: P.FI, imp: flat(1900), exp: flat(1900) });
      borders.push({ name: "NO4", price: P.NO4, imp: flat(700), exp: flat(600) }, { name: "NO3", price: P.NO3, imp: flat(850), exp: flat(1300) });
    } else if (z === "SE3") {
      if (!o.given?.fi3 && c.fenno) borders.push({ name: "FI", price: P.FI, imp: flat(c.fenno), exp: flat(c.fenno) });
      borders.push({ name: "NO1", price: P.NO1, imp: flat(2145), exp: flat(2095) });
      if (c.konti) borders.push({ name: "DK1", price: P.DK1, imp: flat(c.konti), exp: flat(c.konti) });
    } else {
      borders.push({ name: "DK2", price: P.DK2, imp: flat(1700), exp: flat(1300) });
      if (c.baltic) borders.push({ name: "DE", price: P.DE, imp: flat(c.baltic), exp: flat(c.baltic) });
      if (!o.given?.lt4) borders.push({ name: "LT", price: P.LT, imp: flat(700), exp: flat(700) });
    }
    // flows the joint run gives (MW into Sweden): what comes in is output, what goes out is load
    const given = z === "SE12" ? o.given?.fi12 : z === "SE3" ? o.given?.fi3 : o.given?.lt4;
    const load = Float64Array.from({ length: H }, (_, h) => base[z] * shape[z][h] + c.dcMw[z] + (z === "SE12" ? h2Flat : 0) + (given ? Math.max(0, -given[h]) : 0));
    if (given) fixed.push({ cls: "given_flow", mw: Float64Array.from(given, (x) => Math.max(0, x)) });
    const share = base[z] / totBase;
    return {
      name: z, hours: H, load, fixed,
      res: [{ cls: "wind_onshore", mw: wind }, { cls: "wind_offshore", mw: z === "SE4" ? cf.SE04.wind_offshore.map((x) => x * c.offshoreGw * 1000) : flat(0) }, { cls: "solar", mw: solar }],
      supply, demand: z === "SE12" && h2Flex > 0 ? [{ cls: "electrolysis", bid: H2_BID, mw: flat(h2Flex) }] : [],
      dsr: c.drGw ? [{ mw: c.drGw * 1000 * share, price: DR_PRICE, hoursPerDay: DR_HOURS }] : [],
      hydro: z === "SE12" ? {
        budget: Float64Array.from({ length: W }, (_, w) => d.se12HydroWeeklyMwh[Math.min(52, w)] * (w === W - 1 ? (H - 168 * (W - 1)) / 168 : 1)),
        pmin: Float64Array.from({ length: W }, (_, w) => (d.se12HydroWeeklyMwh[Math.min(52, w)] / 168) * REC.se12HydroP10[Math.min(52, w)]),
        pmax: Float64Array.from({ length: W }, (_, w) => (d.se12HydroWeeklyMwh[Math.min(52, w)] / 168) * REC.se12HydroP90[Math.min(52, w)]),
      } : null,
      battery: { mw: c.batteriesGw * 1000 * [0.2, 0.55, 0.25][i], ...BAT },
      borders,
    };
  });
  return zs;
}

/** ERAA 2025's availability of a class in a week: (1 − forced outage rate) × what its planned outage days
 * leave, the winter share of them in weeks 1–13 and 44–53. */
function availability(row: string, w: number): number {
  const t = TECH[`eraa2025_common|${row}`];
  const days = t.planned_outage_days.value, ws = t.planned_outage_winter_share.value;
  const winter = w < 13 || w >= 43;
  const po = winter ? (ws * days) / (23 * 7) : ((1 - ws) * days) / (30 * 7);
  return (1 - t.forced_outage_rate.value) * (1 - po);
}

function plZone(c: PlCase, cy: number, o: Outside, pk: Peakers): ZoneInput {
  const d = cyData(cy), cf = d.cf.PL00, b = tyndpBlock(cy).PL00;
  const h2 = c.h2FlatMw;
  const base = (c.demandTwh * 1e6) / H - (c.dcTwh * 1e6) / H - h2;
  const fixed: ZoneInput["fixed"] = [
    { cls: "hydro_given", mw: Float64Array.from({ length: H }, (_, h) => (b["Run-of-River"]?.[h % 8736] ?? 0) + (b["Reservoir"]?.[h % 8736] ?? 0)) },
    { cls: "other_renewable", mw: Float64Array.from({ length: H }, (_, h) => b["Others renewable"]?.[h % 8736] ?? 0) },
  ];
  const supply: ZoneInput["supply"] = [];
  const ladders = T2.plLadders as Record<string, { bid: number; share: number }[]>;
  for (const u of c.units) {
    if (!u.gw) continue;
    const inst = u.gw * 1000, ref = cost(u.row);
    const avail = Float64Array.from({ length: H }, (_, h) => inst * availability(u.row, weekOf(h)));
    const lo = Float64Array.from({ length: H }, (_, h) => Math.min(avail[h], inst * REC[`plFloorShare_${u.cls}`][weekOf(h)]));
    fixed.push({ cls: `${u.cls}_floor`, mw: lo });
    for (const t of ladders[u.cls]) supply.push({ cls: u.cls, bid: ref + t.bid, mw: avail.map((a, h) => t.share * Math.max(0, a - lo[h])) });
  }
  if (c.peakersGw) supply.push({ cls: "peaker", bid: PEAKER_BID, mw: flat(c.peakersGw * 1000 * availability("gas_ocgt_new", 26)) });
  if (pk.pl) supply.push({ cls: "response", bid: RESPONSE_BID, mw: flat(pk.pl) });
  const P = o.price, [imp, exp] = c.core;
  const borders: ZoneInput["borders"] = [
    { name: "DE", price: P.DE, imp: flat(imp * 0.585), exp: flat(exp * 0.656) },
    { name: "CZ", price: P.CZ, imp: flat(imp * 0.176), exp: flat(exp * 0.175) },
    { name: "SK", price: P.SK, imp: flat(imp * 0.239), exp: flat(exp * 0.169) },
  ];
  if (!o.given?.ltPL) borders.push({ name: "LT", price: P.LT, imp: flat(500), exp: flat(500) });
  const given = o.given?.ltPL;
  if (given) fixed.push({ cls: "given_flow", mw: Float64Array.from(given, (x) => Math.max(0, x)) });
  return {
    name: "PL", hours: H,
    load: Float64Array.from({ length: H }, (_, h) => base * d.demandShape.PL00[h] + (c.dcTwh * 1e6) / H + h2 + (given ? Math.max(0, -given[h]) : 0)),
    fixed,
    res: [{ cls: "wind_onshore", mw: cf.wind_onshore.map((x) => x * c.onshoreGw * 1000) }, { cls: "wind_offshore", mw: cf.wind_offshore.map((x) => x * c.offshoreGw * 1000) }, { cls: "solar", mw: cf.solar.map((x) => x * c.solarGw * 1000) }],
    supply, demand: c.h2FlexMw ? [{ cls: "electrolysis", bid: H2_BID, mw: flat(c.h2FlexMw) }] : [],
    dsr: c.drGw ? [{ mw: c.drGw * 1000, price: DR_PRICE, hoursPerDay: DR_HOURS }] : [],
    hydro: null, battery: null,
    storage: [{ name: "batteries:PL", mw: c.batteriesGw * 1000, ...BAT }, { name: "hydro_ps:PL", mw: c.pumpedGw * 1000, hours: 7660 / 1549.61, eff: 0.74, delta: 71.5 }],
    borders,
  };
}

/** The chain of a climate year: Sweden's three zones, SwePol, Poland. */
export function chain(se: SeCase, pl: PlCase, cy: number, o: Outside, pk: Peakers): { zones: ZoneInput[]; links: Link[] } {
  const zs = [...seZones(se, cy, o, pk), plZone(pl, cy, o, pk)];
  return { zones: zs, links: [{ fwd: flat(se.cut2[0]), rev: flat(se.cut2[1]) }, { fwd: flat(se.cut4[0]), rev: flat(se.cut4[1]) }, { fwd: flat(600), rev: flat(600) }] };
}

let solve: Awaited<ReturnType<typeof loadSolver>>["solve"] | null = null;
export async function solver() { if (!solve) solve = (await loadSolver()).solve; return solve; }
export const solveChainCy = async (x: { zones: ZoneInput[]; links: Link[] }) => solveChain(x.zones, x.links, await solver(), WEEKLY);

/** The price-takers of a standalone run: the method in force for every neighbour (Germany optionally at
 * LMA's level). */
export function outsideStandalone(cy: number, deLma = false): Outside {
  const nb = neighbours(cy).shaped;
  const price: Record<string, ArrayLike<number>> = { ...nb };
  if (deLma) price.DE = nb.DE.map((x) => (x * DE_LMA) / mean(nb.DE));
  return { price };
}

const shedHours = (r: Awaited<ReturnType<typeof solveChainCy>>, zones: number[]) => { let n = 0; for (let h = 0; h < H; h++) if (zones.some((i) => r.zones[i].shed[h] > 1)) n++; return n; };
/** The least multiple of 250 MW that brings the weighted hours of unserved load in `zones` to the standard. */
async function bisect(run: (mw: number) => Promise<Awaited<ReturnType<typeof solveChainCy>>[]>, zones: number[], standard: number, label: string): Promise<number> {
  const lole = async (k: number) => { const rs = await run(k * 250); return rs.reduce((s, r, j) => s + weightOf(CYS[j]) * shedHours(r, zones), 0); };
  let lo = 0, hi = 80;
  const at0 = await lole(0);
  if (at0 <= standard) return 0;
  if (await lole(hi) > standard) throw new Error(`${label}: more than 20 GW of peakers needed — infeasible (§0)`);
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (await lole(mid) <= standard) hi = mid; else lo = mid; }
  return hi * 250;
}
/** §3's adequacy response: Poland's peakers first (3 h), then Sweden's (1 h), split by SE3's and SE4's peak load. */
export async function sizePeakers(se: SeCase, pl: PlCase, outside: (cy: number) => Outside, label: string): Promise<Peakers> {
  const runAll = async (pk: Peakers) => Promise.all(CYS.map(async (cy) => solveChainCy(chain(se, pl, cy, outside(cy), pk))));
  const plMw = await bisect((mw) => runAll({ se3: 0, se4: 0, pl: mw }), [3], 3, `${label} Poland`);
  const seMw = await bisect((mw) => runAll({ se3: 0.8 * mw, se4: 0.2 * mw, pl: plMw }), [0, 1, 2], 1, `${label} Sweden`);
  return { se3: 0.8 * seMw, se4: 0.2 * seMw, pl: plMw };
}

/** Summary of an hourly series. */
export const stats = (a: ArrayLike<number>) => ({ mean: mean(a), p5: quantile(a, 0.05), p50: quantile(a, 0.5), p95: quantile(a, 0.95), h5: Array.from(a).filter((x) => x <= 5).length, h150: Array.from(a).filter((x) => x >= 150).length });
/** Sweden's 2023 shift (§2c) per zone, and Poland's level on the record's shape (§2c: method C). */
export const seShift = Object.fromEntries(["SE12", "SE3", "SE4"].map((z) => [z, rankShift(T2.seShift2023[z].model, T2.seShift2023[z].record)]));
export const plShaped = (cy: number, model: ArrayLike<number>) => {
  const nb = neighbours(cy), pool = Float64Array.from(REC.pool.PL as number[]), k = mean(model) / mean(pool);
  return rankMap(nb.repriced.PL, pool.map((x) => x * k), nb.tie);
};

export interface CaseResult { cy: number; zones: Record<string, Float64Array>; shifted: Record<string, Float64Array>; plShaped: Float64Array; shed: Record<string, number>; flowSwePol: number; netImport: Record<string, number> }
export async function runCase(se: SeCase, pl: PlCase, outside: (cy: number) => Outside, pk: Peakers): Promise<CaseResult[]> {
  return Promise.all(CYS.map(async (cy) => {
    const x = chain(se, pl, cy, outside(cy), pk), r = await solveChainCy(x);
    const names = ["SE12", "SE3", "SE4", "PL"];
    const zones = Object.fromEntries(names.map((n, i) => [n, r.zones[i].price]));
    const shifted = Object.fromEntries(["SE12", "SE3", "SE4"].map((n) => [n, seShift[n](zones[n])]));
    const netImport = Object.fromEntries(names.map((n, i) => [n, Object.values(r.zones[i].trade).reduce((s, t) => s + t.reduce((a, b) => a + b, 0), 0) / 1e6]));
    return { cy, zones, shifted, plShaped: plShaped(cy, zones.PL), shed: Object.fromEntries(names.map((n, i) => [n, r.zones[i].shed.reduce((a, b) => a + b, 0) / 1e3])), flowSwePol: r.flow[2].reduce((a, b) => a + b, 0) / 1e6, netImport };
  }));
}
/** The climate years weighted: a statistic of each year's series, averaged by v5's weights. */
export const weighted = (rs: CaseResult[], pick: (r: CaseResult) => ArrayLike<number>) => {
  const s = rs.map((r) => ({ w: weightOf(r.cy), s: stats(pick(r)) }));
  const keys = Object.keys(s[0].s) as (keyof ReturnType<typeof stats>)[];
  return Object.fromEntries(keys.map((k) => [k, s.reduce((a, x) => a + x.w * x.s[k], 0)])) as ReturnType<typeof stats>;
};
const fmt = (s: ReturnType<typeof stats>) => `${s.mean.toFixed(1)} (P5/50/95 ${s.p5.toFixed(0)}/${s.p50.toFixed(0)}/${s.p95.toFixed(0)}; ≤5 ${s.h5.toFixed(0)} h, ≥150 ${s.h150.toFixed(0)} h)`;
export function report(label: string, rs: CaseResult[], pk: Peakers | null) {
  const inForce = (z: string) => mean(CYS.map((cy) => weightOf(cy) * mean(neighbours(cy).repriced[z])).map((x, _, a) => x * a.length));
  console.log(`\n${label}${pk ? ` · peakers SE3 ${pk.se3} / SE4 ${pk.se4} / PL ${pk.pl} MW at ${PEAKER_BID.toFixed(1)} €/MWh` : ""}`);
  for (const z of ["SE12", "SE3", "SE4", "PL"]) console.log(`  ${z} model ${fmt(weighted(rs, (r) => r.zones[z]))}`);
  for (const z of ["SE12", "SE3", "SE4"]) console.log(`  ${z} with 2023's shift ${fmt(weighted(rs, (r) => r.shifted[z]))}`);
  console.log(`  PL at the model's level on the record's shape ${fmt(weighted(rs, (r) => r.plShaped))}`);
  console.log(`  in force (re-priced TYNDP DE 2035): SE4 ${inForce("SE4").toFixed(1)}, PL ${inForce("PL").toFixed(1)}`);
  const w = (f: (r: CaseResult) => number) => rs.reduce((s, r) => s + weightOf(r.cy) * f(r), 0);
  console.log(`  shed GWh/yr SE12 ${w((r) => r.shed.SE12).toFixed(1)}, SE3 ${w((r) => r.shed.SE3).toFixed(1)}, SE4 ${w((r) => r.shed.SE4).toFixed(1)}, PL ${w((r) => r.shed.PL).toFixed(1)}; SwePol SE4→PL ${w((r) => r.flowSwePol).toFixed(2)} TWh; net imports TWh ` + ["SE12", "SE3", "SE4", "PL"].map((z) => `${z} ${w((r) => r.netImport[z]).toFixed(1)}`).join(", "));
}

/** §3's lines, standalone, the other country at its case C: Sweden's large loads (data centres and hydrogen)
 * at A, midway and C against its onshore wind; Poland's wind at C, midway and A against its coal. Each point
 * sizes its own peakers. */
const mix = (a: number, c: number, t: number) => a + (c - a) * t;
export function lineCases(who: "se" | "pl"): { label: string; se: SeCase; pl: PlCase }[] {
  const A = SE_CASES.A, C = SE_CASES.C, out: { label: string; se: SeCase; pl: PlCase }[] = [];
  if (who === "se") {
    for (const t of [0, 0.5, 1]) for (const wind of [21.5, 24.0, 26.6]) {
      const k = wind / 21.5;
      const se: SeCase = { ...C,
        demandTwh: { SE1: mix(A.demandTwh.SE1, C.demandTwh.SE1, t), SE2: mix(A.demandTwh.SE2, C.demandTwh.SE2, t), SE3: mix(A.demandTwh.SE3, C.demandTwh.SE3, t), SE4: mix(A.demandTwh.SE4, C.demandTwh.SE4, t) },
        dcMw: { SE12: mix(A.dcMw.SE12, C.dcMw.SE12, t), SE3: mix(A.dcMw.SE3, C.dcMw.SE3, t), SE4: mix(A.dcMw.SE4, C.dcMw.SE4, t) },
        h2Twh: mix(A.h2Twh, C.h2Twh, t), h2FlatShare: mix(A.h2FlatShare, C.h2FlatShare, t),
        onshoreGw: { SE1: C.onshoreGw.SE1 * k, SE2: C.onshoreGw.SE2 * k, SE3: C.onshoreGw.SE3 * k, SE4: C.onshoreGw.SE4 * k } };
      out.push({ label: `large loads ${["A", "midway", "C"][t * 2]}, onshore ${wind} GW`, se, pl: PL_CASES.C });
    }
  } else {
    const a = PL_CASES.A, c = PL_CASES.C;
    for (const tw of [0, 0.5, 1]) for (const tc of [0, 0.5, 1]) {
      const units = c.units.map((u, i) => ({ ...u, gw: mix(u.gw, a.units[i].gw, tc) }));
      const coal = units.filter((u) => u.cls !== "gas").reduce((s, u) => s + u.gw, 0) - NJWCD / 2;
      const pl: PlCase = { ...c, units, onshoreGw: mix(c.onshoreGw, a.onshoreGw, tw), offshoreGw: mix(c.offshoreGw, a.offshoreGw, tw) };
      out.push({ label: `wind ${(pl.onshoreGw + pl.offshoreGw).toFixed(1)} GW, coal ${coal.toFixed(2)} GW`, se: SE_CASES.C, pl });
    }
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === "line") {
  const who = process.argv[3] as "se" | "pl";
  for (const l of lineCases(who)) {
    const outside = (cy: number) => outsideStandalone(cy);
    const pk = await sizePeakers(l.se, l.pl, outside, l.label);
    const rs = await runCase(l.se, l.pl, outside, pk);
    const z = who === "se" ? weighted(rs, (r) => r.shifted.SE4) : weighted(rs, (r) => r.plShaped);
    const m = who === "se" ? weighted(rs, (r) => r.zones.SE4) : weighted(rs, (r) => r.zones.PL);
    console.log(`line ${who}: ${l.label} · peakers SE ${pk.se3 + pk.se4} / PL ${pk.pl} MW · ${who === "se" ? "SE4 with 2023's shift" : "PL"} ${z.mean.toFixed(1)} (model ${m.mean.toFixed(1)}; ≥150 ${z.h150.toFixed(0)} h)`);
  }
} else if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`fuels 2035 (${PATH}): gas ${FUEL.gas.toFixed(1)}, coal ${FUEL.coal.toFixed(1)}, lignite ${FUEL.lignite.toFixed(1)} €/MWh of fuel, EUA ${FUEL.eua.toFixed(1)} €/t; short-run cost: CCGT new ${cost("gas_ccgt_new").toFixed(1)}, CCGT present ${cost("gas_ccgt_present_1").toFixed(1)}, hard coal new ${cost("hard_coal_new").toFixed(1)}, old ${cost("hard_coal_old_2").toFixed(1)}, lignite new ${cost("lignite_new").toFixed(1)}, old ${cost("lignite_old_2").toFixed(1)}; peaker bid ${PEAKER_BID.toFixed(1)}; DE at LMA ${DE_LMA.toFixed(1)}`);
  for (const cy of CYS) console.log(`cy${cy} (weight ${weightOf(cy).toFixed(3)}): neighbours re-priced ` + Object.keys(NB_NODE).map((z) => `${z} ${mean(neighbours(cy).repriced[z]).toFixed(1)}`).join(", "));
  const ids = process.argv.slice(2);
  const out: Record<string, unknown> = {};
  for (const id of ids.length ? ids : ["A", "C", "Cde"]) {
    const base = id.replace("de", ""), de = id.endsWith("de");
    const se = SE_CASES[base], pl = PL_CASES[base], outside = (cy: number) => outsideStandalone(cy, de);
    const pk = await sizePeakers(se, pl, outside, id);
    const rs = await runCase(se, pl, outside, pk);
    report(`case ${id}${de ? " (Germany at LMA 2026's level)" : ""}`, rs, pk);
    out[id] = { peakers: pk, series: Object.fromEntries(rs.map((r) => [r.cy, { SE4: Array.from(r.zones.SE4), SE4shifted: Array.from(r.shifted.SE4), PL: Array.from(r.zones.PL), PLshaped: Array.from(r.plShaped) }])) };
  }
  writeFileSync(`${DIR}/cases_standalone.json`, JSON.stringify(out));
}
