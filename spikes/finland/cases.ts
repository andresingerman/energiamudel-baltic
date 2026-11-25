// Phase 3 of the research on Finland (docs/research/2026-10-11_finland_2035.md §3): the 2035 cases and the
// Finnish zone each builds for a climate year. The cases are written in the log before their runs; the
// numbers here are those. What the record taught the zone (tests.ts) stays: the thermal ladder fitted on
// 2023–2024, heat-bound output as the week's floor, hydro released within the week's 10th–90th percentile
// band, wind and solar offered at 0. Estonia enters as EstLink's hourly flow from v5 (v5.ts).
import { readFileSync } from "node:fs";
import { fitLadder } from "./tests.ts";
import type { Rec } from "./tests.ts";
import type { ZoneInput } from "./zone.ts";

const DIR = process.env.FI_DATA ?? "../data/derived/finland";
export const CYS = [1995, 2008, 2009] as const;
const H = 8760;

export interface Case {
  id: string;
  label: string;
  baseTwh: number;          // inflexible consumption on TYNDP's shape: households, services, industry, heat, transport
  dcMw: number;             // data centres, flat
  smelterMw: number;        // Arctial, flat
  boilersMw: number;        // electric boilers, flexible below the heat parity
  electrolysersMw: number;  // flexible at their bid
  electrolyserBid: number;
  windTwh: number;          // onshore wind energy at the climate years' weighted capacity factor
  windOffMw: number;
  solarMw: number;
  nuclearMw: number;
  thermalTwh: number;       // other thermal (CHP) the record's weekly floor and maximum are scaled to
  batteryMw: number;
  batteryHours: number;
  se1: [number, number];    // MW into Finland, out of it
  se3: [number, number];
}

const NUCLEAR = 4440; // OL1 890, OL2 890, OL3 1 600, Loviisa 2 × 507 after the +38 MW uprate; Fortum, TVO
export const CASES: Case[] = [
  { id: "A", label: "Fingrid Moderate", baseTwh: 92.5, dcMw: 685, smelterMw: 0, boilersMw: 4000, electrolysersMw: 100, electrolyserBid: 40,
    windTwh: 53, windOffMw: 0, solarMw: 7000, nuclearMw: NUCLEAR, thermalTwh: 10, batteryMw: 2000, batteryHours: 2, se1: [2900, 2900], se3: [1200, 1200] },
  { id: "B", label: "Fingrid Excellent", baseTwh: 118, dcMw: 2300, smelterMw: 925, boilersMw: 5000, electrolysersMw: 1000, electrolyserBid: 40,
    windTwh: 95, windOffMw: 0, solarMw: 14000, nuclearMw: NUCLEAR, thermalTwh: 10, batteryMw: 3000, batteryHours: 2, se1: [2900, 2900], se3: [1200, 1200] },
  { id: "C", label: "The owner's case: the demand comes, the wind does not", baseTwh: 92.5, dcMw: 2100, smelterMw: 925, boilersMw: 4000, electrolysersMw: 100, electrolyserBid: 40,
    windTwh: 0, windOffMw: 0, solarMw: 7000, nuclearMw: NUCLEAR, thermalTwh: 10, batteryMw: 2000, batteryHours: 2, se1: [1900, 1900], se3: [1200, 1200] },
];
export const C_WIND_MW = 15000; // case C's onshore wind: 9.5 GW at mid-2026 plus the 2025–26 pace to 2035

interface Cy { cy: number; cf: Record<string, number[]>; demandShape: number[]; hydroWeeklyMwh: number[]; tyndpPrice: Record<string, number[]> }
interface RecordPatterns { nuclearWeekly: number[]; thermalFloorWeekly: number[]; thermalMaxWeekly: number[]; thermalTwh: number; hydroP10Ratio: number[]; hydroP90Ratio: number[]; pool: Record<string, number[]> }
export const cyData = (cy: number): Cy => JSON.parse(readFileSync(`${DIR}/fi2035_cy${cy}.json`, "utf8"));
export const recordPatterns = (): RecordPatterns => JSON.parse(readFileSync(`${DIR}/fi2035_record.json`, "utf8"));
const rec = (y: number): Rec => JSON.parse(readFileSync(`${DIR}/record_${y}.json`, "utf8"));
export const LADDER = fitLadder([2023, 2024].map(rec));

const weekOf = (h: number) => Math.min(52, Math.floor(h / 168));
/** The onshore capacity that yields `twh` at the climate years' weighted capacity factor. */
export function windMw(c: Case, weights: Record<number, number>): number {
  if (c.id === "C") return C_WIND_MW;
  let cf = 0, w = 0;
  for (const cy of CYS) { const a = cyData(cy).cf.wind_onshore; cf += weights[cy] * a.reduce((s, x) => s + x, 0) / a.length; w += weights[cy]; }
  return (c.windTwh * 1e6) / (8760 * cf / w);
}

/** Finland in 2035 for one case and climate year: neighbours SE1 and SE3 at `price`, EstLink's hourly
 * flow into Finland given (`estlink`, MW, + into Finland). */
/** The adequacy response of §3a: the new large loads' share offered as demand response, and the
 * peakers sized to the reliability standard. */
export const FLEX_SHARE = 0.3, FLEX_BID = 500;
export interface Adequacy { peakersMw: number; peakerBid: number; ee?: { price: ArrayLike<number>; imp: number; exp: number } }

export function zone2035(c: Case, cy: number, windOnMw: number, price: { SE1: ArrayLike<number>; SE3: ArrayLike<number> }, estlink: ArrayLike<number>, a: Adequacy | null = null): ZoneInput {
  const d = cyData(cy), r = recordPatterns();
  const load = new Float64Array(H), into = new Float64Array(H), out = new Float64Array(H);
  const base = (c.baseTwh * 1e6) / H;
  const firm = a ? 1 - FLEX_SHARE : 1;
  for (let h = 0; h < H; h++) {
    load[h] = base * d.demandShape[h] + firm * (c.dcMw + c.smelterMw);
    if (a?.ee) continue;
    if (estlink[h] >= 0) into[h] = estlink[h]; else out[h] = -estlink[h];
  }
  for (let h = 0; h < H; h++) load[h] += out[h];
  const k = c.thermalTwh / r.thermalTwh; // the record's 2025 thermal output (A75) scaled to the case's
  const lo = Float64Array.from({ length: H }, (_, h) => k * r.thermalFloorWeekly[weekOf(h)]);
  const hi = Float64Array.from({ length: H }, (_, h) => k * r.thermalMaxWeekly[weekOf(h)]);
  const nuclear = Float64Array.from({ length: H }, (_, h) => c.nuclearMw * r.nuclearWeekly[weekOf(h)]);
  const W = Math.ceil(H / 168);
  const wkMean = Float64Array.from({ length: W }, (_, w) => d.hydroWeeklyMwh[Math.min(52, w)] / 168);
  const summer = (h: number) => { const m = new Date(Date.UTC(2035, 0, 1) + h * 3600e3).getUTCMonth(); return m >= 4 && m <= 8; };
  const boilers = (share: number) => Float64Array.from({ length: H }, (_, h) => c.boilersMw * share * (summer(h) ? 0.4 : 1));
  return {
    hours: H,
    load,
    fixed: [{ cls: "nuclear", mw: nuclear }, { cls: "thermal_floor", mw: lo }, ...(a?.ee ? [] : [{ cls: "EE", mw: into }])],
    res: [
      { cls: "wind_onshore", mw: d.cf.wind_onshore.map((x) => x * windOnMw) },
      { cls: "wind_offshore", mw: d.cf.wind_offshore.map((x) => x * c.windOffMw) },
      { cls: "solar", mw: d.cf.solar.map((x) => x * c.solarMw) },
    ],
    supply: [
      ...LADDER.map((t) => ({ cls: "thermal", bid: t.bid, mw: Float64Array.from({ length: H }, (_, h) => t.share * Math.max(0, hi[h] - lo[h])) })),
      ...(a?.peakersMw ? [{ cls: "peaker", bid: a.peakerBid, mw: new Float64Array(H).fill(a.peakersMw) }] : []),
    ],
    demand: [
      { cls: "boiler", bid: 5, mw: boilers(1 / 3) }, { cls: "boiler", bid: 15, mw: boilers(1 / 3) }, { cls: "boiler", bid: 30, mw: boilers(1 / 3) },
      { cls: "electrolysis", bid: c.electrolyserBid, mw: new Float64Array(H).fill(c.electrolysersMw) },
      ...(a ? [{ cls: "large_load_flex", bid: FLEX_BID, mw: new Float64Array(H).fill(FLEX_SHARE * (c.dcMw + c.smelterMw)) }] : []),
    ],
    dsr: [],
    hydro: {
      budget: Float64Array.from({ length: W }, (_, w) => d.hydroWeeklyMwh[Math.min(52, w)] * (w === W - 1 ? (H - 168 * (W - 1)) / 168 : 1)),
      pmin: Float64Array.from({ length: W }, (_, w) => wkMean[w] * r.hydroP10Ratio[Math.min(52, w)]),
      pmax: Float64Array.from({ length: W }, (_, w) => wkMean[w] * r.hydroP90Ratio[Math.min(52, w)]),
    },
    battery: c.batteryMw ? { mw: c.batteryMw, hours: c.batteryHours, eff: 0.9, delta: 71.5 } : null,
    borders: [
      { name: "SE1", price: price.SE1, imp: new Float64Array(H).fill(c.se1[0]), exp: new Float64Array(H).fill(c.se1[1]) },
      { name: "SE3", price: price.SE3, imp: new Float64Array(H).fill(c.se3[0]), exp: new Float64Array(H).fill(c.se3[1]) },
      ...(a?.ee ? [{ name: "EE", price: a.ee.price, imp: new Float64Array(H).fill(a.ee.imp), exp: new Float64Array(H).fill(a.ee.exp) }] : []),
    ],
  };
}
