// Year file + presets + scenario → the Problem the engine clears (SPECIFICATION.md §8.1–8.9;
// docs/methodology.md §5.1; DECISIONS D-018, D-020). Pure: no clock, no randomness, no I/O. Every
// array the engine reads is checked here for length and finiteness (the guards of PLAN §3.2).

import type { Links } from "../contract/links.ts";
import type { Presets, Value } from "../contract/presets.ts";
import type { Year } from "../contract/year.ts";
import type { Border, Entry, Fixed, Offer, Problem, Reservoir, Storage, Zone, ZoneCode } from "./problem.ts";
import { BORDERS, LINKS, WEEK_HOURS as WEEK, ZONES } from "./problem.ts";
import { available, outageStarts } from "./smr.ts";

export type Boundary = "FI" | "SE4" | "PL";
export type PerZone<T> = Record<ZoneCode, T>;
export interface Band {
  price: number; // €/MWh
  mw: number;
  hours: number; // full-load hours per UTC day
}

/** What the user chooses; state/scenario.ts fills it from the presets. */
export interface Scenario {
  profile: string; // boundary profile key of the year file: "observed", "DE_2035", "NTplus_2035" (R-BND-5)
  target: number | null; // scenario runs: 2030, 2035, 2040, 2050; null in an observed year
  level: Record<Boundary, number>; // R-BND-5
  fiSlope: number | null; // R-BND-6: €/MWh per GW of net Finnish export; null = price-taker
  losses: boolean; // R-BND-4
  fleet: PerZone<Record<string, number>> | null; // scenario runs: class → MW
  batteryMwh: PerZone<number | null> | null; // null: batteryHours × MW
  fuelPath: string | null; // scenario runs (R-SUP-8)
  daugavaBand?: boolean; // scenario runs: the cascade held to the record's weekly band (D-071); false = free between its minimum flow and its megawatts
  gasFloor: number | null; // €/MWh thermal: the run's gas price raised to it where lower (R-APP-11 (d)); null = none
  meanFloor: Partial<Record<Boundary, number>> | null; // €/MWh: a boundary profile's average over the run raised to it where lower, by one factor on every hour (R-APP-11 (a), (b): Poland's slow build); null = none
  gasPrice?: number | null; // €/MWh thermal: the scenario's gas price in place of the fuel path's (D-064); null or absent = the path's
  euaPrice?: number | null; // €/t: the scenario's CO₂ price in place of the fuel path's (D-064)
  demandTwh: PerZone<number | null> | null; // scenario runs: inflexible demand, electrolysis excluded (R-DEM-5); null = the family's own
  multiplier: PerZone<number>; // R-DEM-3
  firmMw: PerZone<number>; // R-DEM-4
  electrolysisMw: PerZone<number>; // R-DEM-5, 0 = off (D-011)
  electrolysisCeiling: number; // €/MWh
  p2hMw: PerZone<number>;
  p2hCeiling: number; // €/MWh
  dsr: PerZone<Band[]>; // R-DEM-6
  battery: { eff: number; delta: number; cyclesPerDay: number; hours: number };
  pumpedDelta: number; // Kruonis's cycling cost per MWh pumped (R-PAR-6's prior, D-022)
  kruonisStep?: number; // €/MWh each further quarter of Kruonis's output in an hour costs above the last (D-115); absent = the fitted step
  mfrrShare: number; // R-STO-7
  reserves: boolean; // R-STO-5
  chpFloor: boolean; // R-SUP-5: heat-driven CHP output is must-run (the fit of M3)
  gasAdder: number | null; // R-SUP-6 (D-164): €/MWh the gas plants' one bid lies above a combined-cycle plant's cost; null = the fitted adder
  gasAdj?: number; // scenario runs (D-164): €/MWh the panel moved the gas plants' one bid by; absent = 0
  bidAdj?: PerZone<Record<string, number>> | null; // scenario runs (D-090): class → €/MWh added to a thermal class's bid, gas's bid aside (`gasAdj`); absent = none
  smr: { units: number; mw: number; outageHours: number; gapHours: number; clause: boolean; minLoad: number };
  voll: number; // R-PAR-1
  floor: number; // R-PAR-2
  links?: LinkChoice | null; // R-LINK-3 … R-LINK-5; absent: ERAA 2025's NTC as given, no what-if (the scripts' runs)
}

/** A line held at most at `mw` from UTC day `from` to day `to` of the year, both included (R-LINK-4);
 * `from` after `to` runs over the new year. */
export interface WhatIf { mw: number; from: number; to: number }

/** How a run builds its borders from their lines (R-LINK-1, R-LINK-3 … R-LINK-5; D-032). */
export interface LinkChoice {
  profile: "typical" | "nameplate"; // the HVDC cables of a scenario year
  plan: boolean; // LT-PL held to Litgrid's plan of the year
  reserve: Record<"EE-LV" | "LV-LT", number>; // MW an AC border holds for balancing in a scenario year
  on: Record<string, boolean>; // the planned lines in service
  whatif: Record<string, WhatIf>; // per line; a line without one has none
  out?: Record<string, { fwd: Uint8Array; rev: Uint8Array }>; // an observed year's A78 events of a line per hour: 0 none, 1 planned, 2 forced
}

/** Classes that burn fuel, bid their short-run cost and hold upward reserve (R-SUP-3, R-SUP-7). */
export const THERMAL = new Set([
  "oil_shale_auvere", "oil_shale_cfb", "oil_shale_pf", "retort_gas", "gas_ccgt", "gas_conventional",
  "gas_ocgt", "gas_chp", "biomass_chp", "waste", "other", "other_renewable", "nuclear",
]);
/** The fuel each thermal class buys; null = none (a by-product or waste the plant is paid to take). */
const FUEL: Record<string, "gas" | "oil_shale" | "biomass" | "uranium" | null> = {
  gas_ccgt: "gas", gas_conventional: "gas", gas_ocgt: "gas", gas_chp: "gas", other: "gas",
  oil_shale_auvere: "oil_shale", oil_shale_cfb: "oil_shale", oil_shale_pf: "oil_shale",
  biomass_chp: "biomass", other_renewable: "biomass", retort_gas: null, waste: null, nuclear: "uranium",
};
/** CO2 of a fuel when the class's technology row gives none (kg/GJ): gas as ERAA's gas
 * classes, biomass biogenic (0), waste its fossil share (Statistics Finland). */
const FUEL_CO2 = { gas: "eraa2025_common|gas_ccgt_present_1", waste: "statfi_2025|municipal_waste" } as const;
/** Oil shale buys at 10 €/MWh thermal (R-SUP-4); observed years take biomass at Svenska
 * kraftnät's 2023 price, the earliest the documents give (D-020). */
const OIL_SHALE_FUEL = ["svk_lma_2026", "2030", "oil_shale"] as const;
const OBSERVED_BIOMASS = ["svk_lma_2026", "2023", "biomass"] as const;
export const RENEWABLE = ["wind_onshore", "wind_offshore", "solar"] as const;
/** Observed output the engine takes as given (D-013); wind and solar are curtailable at 0 (R-PAR-3). */
const GIVEN_FIXED = new Set(["hydro_ror", "waste", "other", "other_renewable"]);
/** A68 technologies that no class holds and that must be 0 when they appear (R-SUP-1). */
const A68_ZERO = new Set(["brown_coal", "geothermal", "hard_coal", "hydro_reservoir", "marine", "nuclear", "peat"]);

export function hourly(a: readonly number[] | undefined, H: number, name: string): Float64Array {
  if (!a) throw new Error(`${name}: missing`);
  if (a.length !== H) throw new Error(`${name}: ${a.length} values, the run has ${H} hours`);
  const out = Float64Array.from(a);
  for (let h = 0; h < H; h++) if (!Number.isFinite(out[h])) throw new Error(`${name}: hour ${h} is not finite`);
  return out;
}

/** A boundary zone's hourly price as the clearing takes it, before any slope (R-BND-5, R-BND-6):
 * the year file's profile times the zone's price level. The import-price page shows this series. */
export function boundaryPrice(year: Year, k: Boundary, profile: string, level: number): Float64Array {
  const P = hourly(year.boundary[k]?.[profile], year.meta.hours, `boundary.${k}.${profile}`);
  for (let h = 0; h < P.length; h++) P[h] *= level;
  return P;
}

/** The fuel and CO₂ prices of TYNDP 2024's market model (its CO₂ price; its gas is the blend below). */
const TYNDP2024_PATH = "tyndp2024_matrix";
/** The most and the least efficient gas plant of the market model's standard classes. */
const MODEL_GAS = ["eraa2025_common|gas_ccgt_new", "eraa2025_common|gas_ocgt_old"] as const;

function interp(points: [number, number][], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i];
    if (x <= x1) return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
  }
  return points[points.length - 1][1];
}

/** The cost of the market model's best gas plant behind a TYNDP 2024 Distributed Energy or Global Ambition profile, on
 * the model's own prices — its gas blend, of which only the fossil share pays for CO₂, and its CO₂ price: the level
 * from which a neighbour's price counts as fossil (R-SMR-5, D-037; ERRATA E-064). Null for another profile. Until D-194
 * the same costs moved such a profile to the run's gas and CO₂ (D-072); the profiles are taken as published since. */
export function neighbourGasCost(p: Presets, sc: Scenario): number | null {
  const m = /^(DE|GA)_(\d{4})$/.exec(sc.profile);
  if (!m) return null;
  const s = m[1], year = Number(m[2]);
  const par = (k: string) => val(p.parameters[`boundary.reprice.tyndp2024.${k}`], `boundary.reprice.tyndp2024.${k}`);
  const path = (k: string) => interp([[2030, par(`${k}.2030`)], [2040, par(`${k}.${s}.2040`)], [2050, par(`${k}.${s}.2050`)]], year);
  const kg = (val(p.tech[FUEL_CO2.gas]?.co2_factor, "gas CO2 factor") * 3.6) / 1000; // t per MWh thermal
  const thermal = 3.6 * path("gas_blend") + kg * path("methane_share") * pathValue(p, TYNDP2024_PATH, "eua", year);
  return Math.min(...MODEL_GAS.map((key) => thermal / val(p.tech[key]?.efficiency, `${key} efficiency`) + val(p.tech[key]?.vom, `${key} vom`)));
}

function num(v: number | undefined, name: string): number {
  if (v === undefined || !Number.isFinite(v)) throw new Error(`${name}: missing or not finite`);
  return v;
}

const val = (v: Value | undefined, name: string): number => num(v?.value, name);

/** A gas price per gross MWh — the record's TTF, as the Pink Sheet quotes it — per net MWh, the calorific value
 * ERAA states its efficiencies and fuel prices on (IPCC 2006: gas's NCV about 10 % below its GCV; D-171). */
export const perNetMwh = (p: Presets, gross: number): number => gross / val(p.parameters["fuel.gas.ncv_per_gcv"], "gas NCV per GCV");

/** Month (0–11) of every hour: the calendar of an observed year, the non-leap layout otherwise. */
export function monthOfHour(H: number, year: number, observed: boolean): Uint8Array {
  const leap = observed && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const out = new Uint8Array(H);
  let m = 0;
  let end = days[0] * 24;
  for (let h = 0; h < H; h++) {
    while (h >= end && m < 11) end += days[++m] * 24;
    out[h] = m;
  }
  return out;
}

/** Weight of the later of two target years a scenario run's hourly shapes blend (D-020). */
export function blend(target: number, lo: number, hi: number): number {
  if (target <= lo) return 0;
  if (target >= hi) return 1;
  return (target - lo) / (hi - lo);
}

/** A series keyed by target year: the target's own, or the two nearest blended (D-020). */
function byTarget(obj: Record<string, number[]> | undefined, target: number, H: number, name: string): Float64Array {
  if (!obj) throw new Error(`${name}: missing`);
  const keys = Object.keys(obj).map(Number).sort((a, b) => a - b);
  if (keys.length === 0) throw new Error(`${name}: no target year`);
  if (obj[String(target)]) return hourly(obj[String(target)], H, `${name}.${target}`);
  let lo = keys[0];
  let hi = keys[keys.length - 1];
  for (const k of keys) {
    if (k <= target) lo = k;
    if (k >= target && k < hi) hi = k;
  }
  if (target < keys[0]) hi = lo = keys[0];
  if (target > keys[keys.length - 1]) lo = hi = keys[keys.length - 1];
  const a = hourly(obj[String(lo)], H, `${name}.${lo}`);
  if (lo === hi) return a;
  const b = hourly(obj[String(hi)], H, `${name}.${hi}`);
  const w = blend(target, lo, hi);
  for (let h = 0; h < H; h++) a[h] = a[h] * (1 - w) + b[h] * w;
  return a;
}

/** A fuel path's value for the target year, €/MWh thermal (or €/t for EUA): the year itself,
 * else linear between the two nearest years, else the nearest (D-020). */
export function pathValue(p: Presets, path: string, commodity: string, target: number): number {
  const years = p.fuel_paths[path];
  if (!years) throw new Error(`fuel path ${path} unknown`);
  const have = Object.keys(years).filter((y) => years[y][commodity]).map(Number).sort((a, b) => a - b);
  if (have.length === 0) throw new Error(`fuel path ${path} has no ${commodity}`);
  const conv = (y: number): number => {
    const v = years[String(y)][commodity];
    if (v.unit === "EUR/GJ") return v.value * 3.6;
    if (v.unit === "EUR/MWh" || v.unit === "EUR/t") return v.value;
    throw new Error(`${path} ${y} ${commodity}: unit ${v.unit}`);
  };
  if (target <= have[0]) return conv(have[0]);
  if (target >= have[have.length - 1]) return conv(have[have.length - 1]);
  let lo = have[0];
  let hi = have[have.length - 1];
  for (const y of have) {
    if (y <= target) lo = y;
    if (y >= target && y < hi) hi = y;
  }
  if (lo === hi) return conv(lo);
  const w = blend(target, lo, hi);
  return conv(lo) * (1 - w) + conv(hi) * w;
}

function techRow(p: Presets, cls: string): Record<string, Value> {
  const key = p.classes[cls]?.params;
  if (!key) throw new Error(`class ${cls} has no technology row`);
  const row = p.tech[key];
  if (!row) throw new Error(`technology row ${key} missing`);
  return row;
}

interface ClassCost {
  eff: number;
  vom: number;
  co2: number; // t per MWh electric, so also €/MWh per €/t of EUA
  fuel: "gas" | "oil_shale" | "biomass" | "uranium" | null;
  premium: number;
}

/** Short-run cost terms of a thermal class (R-SUP-3, R-SUP-4). */
function classCost(p: Presets, cls: string): ClassCost {
  const row = techRow(p, cls);
  const eff = num(row.efficiency?.value ?? row.efficiency_nameplate?.value, `${cls} efficiency`);
  const vom = row.vom?.value ?? 0;
  const fuel = FUEL[cls];
  if (fuel === undefined) throw new Error(`class ${cls} has no fuel rule`);
  let kgPerGj = row.co2_factor?.value;
  if (kgPerGj === undefined) {
    if (fuel === "gas") kgPerGj = val(p.tech[FUEL_CO2.gas]?.co2_factor, "gas CO2 factor");
    else if (cls === "waste") kgPerGj = val(p.tech[FUEL_CO2.waste]?.co2_factor, "waste CO2 factor");
    else kgPerGj = 0; // biomass and biogas are biogenic
  }
  const co2 = (kgPerGj * 3.6) / 1000 / eff;
  const premium = cls.startsWith("oil_shale_") ? val(p.oil_shale[cls], `${cls} premium`) : 0;
  return { eff, vom, co2, fuel, premium };
}

interface Prices {
  gas: Float64Array; // €/MWh thermal, hourly
  eua: Float64Array; // €/t, hourly
  oilShale: number;
  biomass: number;
  uranium: number;
}

function prices(p: Presets, year: Year, sc: Scenario, H: number): Prices {
  return floored(rawPrices(p, year, sc, H), sc);
}

/** The run's gas price raised to the sensitivity's floor where lower (R-APP-11 (d)). */
function floored(pr: Prices, sc: Pick<Scenario, "gasFloor">): Prices {
  if (sc.gasFloor !== null) for (let h = 0; h < pr.gas.length; h++) if (pr.gas[h] < sc.gasFloor) pr.gas[h] = sc.gasFloor;
  return pr;
}

function rawPrices(p: Presets, year: Year, sc: Scenario, H: number): Prices {
  const observed = year.meta.kind === "observed";
  const oilShale = val(p.fuel_paths[OIL_SHALE_FUEL[0]]?.[OIL_SHALE_FUEL[1]]?.[OIL_SHALE_FUEL[2]], "oil-shale fuel");
  if (observed) {
    if (!year.fuel) throw new Error(`${year.meta.key}: no fuel prices`);
    const month = monthOfHour(H, year.meta.year, true);
    const gas = new Float64Array(H);
    const eua = new Float64Array(H);
    for (let h = 0; h < H; h++) {
      gas[h] = perNetMwh(p, num(year.fuel.gas_eur_mwh_th[month[h]], `gas price, month ${month[h] + 1}`));
      eua[h] = num(year.fuel.eua_eur_t[month[h]], `EUA price, month ${month[h] + 1}`);
    }
    const biomass = val(p.fuel_paths[OBSERVED_BIOMASS[0]]?.[OBSERVED_BIOMASS[1]]?.[OBSERVED_BIOMASS[2]], "biomass price");
    return { gas, eua, oilShale, biomass, uranium: Number.NaN };
  }
  return pathPrices(p, sc, H);
}

/** What a scenario's fuel and CO₂ prices are read from: its path, its target year, the prices set by
 * hand and the sensitivity's gas floor (the panel's bids take these alone). */
export type PriceInputs = Pick<Scenario, "fuelPath" | "target" | "gasFloor" | "gasPrice" | "euaPrice">;

function pathPrices(p: Presets, sc: PriceInputs, H: number): Prices {
  if (!sc.fuelPath || sc.target === null) throw new Error("a scenario run needs a fuel path and a target year");
  const oilShale = val(p.fuel_paths[OIL_SHALE_FUEL[0]]?.[OIL_SHALE_FUEL[1]]?.[OIL_SHALE_FUEL[2]], "oil-shale fuel");
  const T = sc.target;
  const biomassPath = p.fuel_paths[sc.fuelPath] && Object.values(p.fuel_paths[sc.fuelPath]).some((y) => y.biomass)
    ? sc.fuelPath : "svk_lma_2026";
  return {
    gas: new Float64Array(H).fill(sc.gasPrice ?? pathValue(p, sc.fuelPath, "gas", T)),
    eua: new Float64Array(H).fill(sc.euaPrice ?? pathValue(p, sc.fuelPath, "eua", T)),
    oilShale,
    biomass: pathValue(p, biomassPath, "biomass", T),
    uranium: pathValue(p, sc.fuelPath, "uranium", T),
  };
}

function fuelPrice(pr: Prices, fuel: ClassCost["fuel"], h: number): number {
  if (fuel === "gas") return pr.gas[h];
  if (fuel === "oil_shale") return pr.oilShale;
  if (fuel === "biomass") return pr.biomass;
  if (fuel === "uranium") return num(pr.uranium, "uranium price");
  return 0;
}

/** A thermal class's bid taken apart (D-089): the fuel's price per MWh of fuel over the efficiency,
 * the CO₂ price times the tonnes a MWh emits, the running costs and an oil-shale unit's premium. */
export interface BidParts { fuel: ClassCost["fuel"]; fuelPrice: number; eff: number; euaPrice: number; tPerMwh: number; vom: number; premium: number; cost: number; adj: number; total: number }
/** `adj`: the offset a scenario moved the bid by (D-090), never below a bid of 0. */
export function bidParts(p: Presets, sc: PriceInputs, cls: string, adj = 0): BidParts | null {
  if (!THERMAL.has(cls)) return null;
  const pr = floored(pathPrices(p, sc, 1), sc);
  const c = classCost(p, cls), fp = fuelPrice(pr, c.fuel, 0);
  const cost = fp / c.eff + pr.eua[0] * c.co2 + c.vom + c.premium;
  return { fuel: c.fuel, fuelPrice: fp, eff: c.eff, euaPrice: pr.eua[0], tPerMwh: c.co2, vom: c.vom, premium: c.premium, cost, adj,
    total: adj ? Math.max(0, cost + adj) : cost };
}

/** The bid a thermal class's own costs imply in a scenario run, from its fuel path and target year
 * (R-APP-1); a gas class bids the gas plants' one bid instead (`gasBidParts`, D-164). */
export function impliedBid(p: Presets, sc: PriceInputs, cls: string): number | null {
  return bidParts(p, sc, cls)?.total ?? null;
}

/** `adj`: €/MWh a scenario moved the bid by (D-090), the bid kept at 0 or above; a gas offer's bid is
 * set again to the gas plants' one bid (`applyGasBid`, D-164). */
function thermalOffer(p: Presets, pr: Prices, cls: string, mw: number, H: number, adj = 0): Offer {
  const c = classCost(p, cls);
  const bid = new Float64Array(H);
  for (let h = 0; h < H; h++) bid[h] = fuelPrice(pr, c.fuel, h) / c.eff + pr.eua[h] * c.co2 + c.vom + c.premium;
  if (adj) for (let h = 0; h < H; h++) bid[h] = Math.max(0, bid[h] + adj);
  return { name: cls, cls, demand: false, bid, mw: new Float64Array(H).fill(mw), co2: c.co2, hoursPerDay: 0 };
}

function split(p: Presets, mw: number): Record<string, number> {
  const out: Record<string, number> = {};
  let left = mw;
  for (const c of ["oil_shale_auvere", "oil_shale_cfb", "oil_shale_pf"]) {
    const size = c === "oil_shale_pf" ? left : val(p.tech[`oil_shale_classes|${c}`]?.mw, `${c} MW`);
    const take = left < size ? left : size;
    if (take > 0) out[c] = take;
    left -= take;
  }
  return out;
}

/** Observed A68 capacity → classes (export/classes.py's rules; Latvia's run-of-river is the
 * Daugava cascade). */
export function observedClasses(p: Presets, zone: ZoneCode, cap: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of Object.keys(cap).sort()) {
    const mw = cap[key];
    if (!(mw > 0)) continue;
    if (A68_ZERO.has(key)) throw new Error(`${zone}: ${mw} MW of ${key}, which no class holds`);
    const rule = zone === "LV" && key === "hydro_ror" ? { target: "hydro_daugava" } : p.class_rules[key];
    if (!rule) throw new Error(`${zone}: A68 key ${key} is not in the class map`);
    if (rule.target === "exclude") continue;
    if (rule.target === "split:oil_shale") {
      for (const [c, v] of Object.entries(split(p, mw))) out[c] = (out[c] ?? 0) + v;
    } else out[rule.target] = (out[rule.target] ?? 0) + mw;
  }
  return out;
}

/** The observed technology whose heat-driven floor each class carries (R-SUP-5): gas CHP and
 * condensing gas share the zone's gas floor, peaking units none; the oil-shale classes share
 * Estonia's oil-shale floor (the Balti plant is Narva's CHP, D-022). */
export const CHP_TECH: Record<string, "gas" | "biomass" | "oil_shale"> = {
  gas_ccgt: "gas", gas_conventional: "gas", gas_chp: "gas", biomass_chp: "biomass",
  oil_shale_auvere: "oil_shale", oil_shale_cfb: "oil_shale", oil_shale_pf: "oil_shale",
};

/** The observed technology (ENTSO-E A75) whose weekly maximum output caps each thermal class in
 * an observed year (D-022); oil shale fills its classes newest first (R-SUP-4). */
const OBSERVED_TECH: Record<string, string> = {
  biomass_chp: "biomass", gas_ccgt: "gas", gas_conventional: "gas", gas_ocgt: "gas", gas_chp: "gas",
  oil_shale_auvere: "oil_shale", oil_shale_cfb: "oil_shale", oil_shale_pf: "oil_shale", retort_gas: "coal_gas",
};
const FILL_ORDER = ["oil_shale_auvere", "oil_shale_cfb", "oil_shale_pf"];
/** ERAA 2025's technology behind each oil-shale class's commitment figures (D-113): Auvere and the
 * fluidised-bed units are its new oil shale, pulverised firing its old. */
const ENTRY_TECH: Record<string, string> = { oil_shale_auvere: "oil_shale_new", oil_shale_cfb: "oil_shale_new", oil_shale_pf: "oil_shale_old" };

/** An observed year's thermal availability: each technology's weekly maximum output (A75) —
 * what planned and forced outages, reserve status and mothballing left of the installed
 * capacity (R-SUP-6's "week's maximum", D-022) — shared among its classes in order. */
function capAvailability(zone: Zone, weekly: Record<string, number[]>, H: number, code: ZoneCode): void {
  const weeks = Math.ceil(H / WEEK);
  for (const tech of Object.keys(weekly).sort()) {
    const group = zone.offers.filter((o) => !o.demand && OBSERVED_TECH[o.cls] === tech)
      .sort((a, b) => FILL_ORDER.indexOf(a.cls) - FILL_ORDER.indexOf(b.cls));
    if (!group.length) continue;
    const wk = hourly(weekly[tech], weeks, `${code}.thermal_weekly_max_mw.${tech}`);
    for (let h = 0; h < H; h++) {
      let left = wk[(h / WEEK) | 0];
      for (const o of group) {
        const q = o.mw[h] < left ? o.mw[h] : left > 0 ? left : 0;
        o.mw[h] = q;
        left -= q;
      }
    }
  }
}

/** D-073: in a replay each fuel-burning technology runs at least the week's 10th-percentile hour
 * of its observed output, where the fitted floor (R-SUP-5) asks for less: the units a system
 * operator kept running whatever the price, which no temperature explains. Taken from the
 * technology's offers in the order `capAvailability` fills them, never more than they hold. */
function applyObservedFloor(zone: Zone, weekly: Record<string, number[]>, H: number, code: ZoneCode): void {
  const weeks = Math.ceil(H / WEEK);
  for (const tech of Object.keys(weekly).sort()) {
    const group = zone.offers.filter((o) => !o.demand && OBSERVED_TECH[o.cls] === tech)
      .sort((a, b) => FILL_ORDER.indexOf(a.cls) - FILL_ORDER.indexOf(b.cls));
    if (!group.length) continue;
    const held = zone.fixed.filter((f) => OBSERVED_TECH[f.cls] === tech);
    const wk = hourly(weekly[tech], weeks, `${code}.thermal_weekly_p10_mw.${tech}`);
    const must = group.map(() => new Float64Array(H));
    for (let h = 0; h < H; h++) {
      let left = wk[(h / WEEK) | 0];
      for (const f of held) left -= f.mw[h];
      for (let k = 0; k < group.length && left > 0; k++) {
        const q = group[k].mw[h] < left ? group[k].mw[h] : left;
        must[k][h] = q;
        group[k].mw[h] -= q;
        left -= q;
      }
    }
    group.forEach((o, k) => zone.fixed.push({ cls: o.cls, mw: must[k], co2: o.co2 }));
  }
}

interface FloorFit {
  a_mw: number;
  b_mw_per_k: number;
  t_ref_c: number;
}

/** The fitted register as presets.json holds it (R-SUP-5, R-SUP-6, D-115, D-164): a section missing is
 * an error, never a register silently dropped (the fit scripts pass theirs in the scenario). */
interface Fitted {
  chp_floor: Record<string, Record<string, FloorFit>>;
  kruonis_output: { step_eur_mwh: number };
  gas_bid: { eur_mwh: number };
}
function fitted(p: Presets): Fitted {
  const f = (p as unknown as { fitted?: Partial<Fitted> }).fitted;
  if (!f?.chp_floor || !f.kruonis_output || !f.gas_bid) throw new Error("presets: no fitted register (chp_floor, kruonis_output, gas_bid)");
  return f as Fitted;
}

/** R-SUP-5 (the fit of D-042, scripts/fit_floor.ts): floor(T) = max(0, a + b · max(0, T_ref − T)) of each
 * zone's gas and biomass CHP runs whatever the price; it is taken from the offers of the classes
 * that carry it, in proportion to their hourly MW, and never exceeds them. */
function applyChpFloor(p: Presets, code: ZoneCode, zone: Zone, T: Float64Array, H: number): void {
  const fits = fitted(p).chp_floor[code];
  if (!fits) return;
  // Estonian oil shale has no fitted floor (D-109): in a replay the week's least output of its
  // record carries the Narva plants' must-run (D-073), where 2023–2024's fit held it above what
  // ran in 2025–2026 (ERRATA E-139); a scenario's oil shale is Auvere, a condensing unit, which
  // runs on its bid alone (D-074, ERRATA E-066)
  for (const tech of ["gas", "biomass"] as const) {
    const f = fits[tech];
    if (!f) continue;
    const a = num(f.a_mw, `${code} ${tech} floor a`);
    const b = num(f.b_mw_per_k, `${code} ${tech} floor b`);
    const tRef = num(f.t_ref_c, `${code} ${tech} floor T_ref`);
    const group = zone.offers.filter((o) => !o.demand && CHP_TECH[o.cls] === tech);
    if (!group.length) continue;
    const must = group.map(() => new Float64Array(H));
    for (let h = 0; h < H; h++) {
      let floor = a + b * (T[h] < tRef ? tRef - T[h] : 0);
      let avail = 0;
      for (const o of group) avail += o.mw[h];
      if (floor > avail) floor = avail;
      if (!(floor > 0)) continue;
      for (let k = 0; k < group.length; k++) {
        const q = (floor * group[k].mw[h]) / avail;
        must[k][h] = q;
        group[k].mw[h] -= q;
      }
    }
    group.forEach((o, k) => zone.fixed.push({ cls: o.cls, mw: must[k], co2: o.co2 }));
  }
}

/** Tranches of the Finnish import and export when the slope of R-BND-6 is on. */
export const SLOPE_STEPS = 10;
/** The gas classes, which bid the gas plants' one bid (R-SUP-6, D-164; oil shale carries its entry
 * premium, R-SUP-4, retort gas is a by-product, biomass is heat-driven). */
export const FLEX = new Set(["gas_ccgt", "gas_conventional", "gas_ocgt", "gas_chp"]);
/** The plant whose cost the gas plants' one bid is: a combined-cycle plant (R-SUP-6, D-164). */
export const GAS_REFERENCE = "gas_ccgt";

/** The fitted adder of the gas plants' one bid over a combined-cycle plant's cost, €/MWh (R-SUP-6, D-164). */
export const gasAdderOf = (p: Presets): number => num(fitted(p).gas_bid.eur_mwh, "the gas bid's fitted adder");

/** The gas plants' one bid in a scenario run, taken apart (D-164): a combined-cycle plant's cost at the
 * scenario's prices, the fitted adder above it, and `adj`, the offset the panel moved it by; never below 0. */
export function gasBidParts(p: Presets, sc: PriceInputs, adj = 0): BidParts & { adder: number } {
  const b = bidParts(p, sc, GAS_REFERENCE)!;
  const adder = gasAdderOf(p);
  return { ...b, adder, adj, total: Math.max(0, b.cost + adder + adj) };
}

/** What orders the gas plants' equal bids (D-168, ERRATA E-161): a thousandth of each class's cost above a
 * combined-cycle plant's, €/MWh per €/MWh — the cheaper plant runs first whatever its name, and no price
 * moves by more than the term, 0.05 €/MWh for Estonia's open-cycle gas at the opening state. */
export const GAS_ORDER = 1e-3;

/** Every gas offer of the three zones — what the floors and the headroom leave of it — bids one price,
 * whatever the plant's own efficiency: a combined-cycle plant's cost as the run prices it, hour by hour,
 * plus `add` €/MWh, never below 0 (R-SUP-6, D-164); among those equal bids the cheaper plant first, by
 * `GAS_ORDER` of its class's cost above the combined-cycle plant's (D-168). It replaced the utilisation
 * markup's four tranches in Latvia and Lithuania (D-115). */
function applyGasBid(p: Presets, pr: Prices, zones: Zone[], add: number, H: number): void {
  const costOf = (cls: string) => {
    const c = classCost(p, cls);
    return Float64Array.from({ length: H }, (_, h) => fuelPrice(pr, c.fuel, h) / c.eff + pr.eua[h] * c.co2 + c.vom + c.premium);
  };
  const ref = costOf(GAS_REFERENCE);
  const gap = new Map<string, Float64Array>();
  for (const z of zones) for (const o of z.offers) {
    if (o.demand || !FLEX.has(o.cls)) continue;
    if (!gap.has(o.cls)) gap.set(o.cls, costOf(o.cls).map((x, h) => x - ref[h]));
    const g = gap.get(o.cls)!;
    for (let h = 0; h < H; h++) o.bid[h] = Math.max(0, ref[h] + add + GAS_ORDER * g[h]);
  }
}

/** Kruonis's output in the hour in four equal segments of the power it has that hour — in a replay
 * the week's power (D-073), in a scenario its megawatts (D-115). */
export const KRUONIS_SEGMENTS = 4;

/** The steps of Kruonis's output (D-115): the j-th quarter (from 0) of what the plant delivers in an
 * hour costs j × step €/MWh above the plant's cost, so the programme spreads the plant's water over more hours at part load and
 * gives the dearest hours less than its power allows — as an owner who weighs what its own output
 * does to the price runs a store; its reservoir and its pumping stay one. None without a step. */
export function kruonisSteps(step: number): number[] | undefined {
  return step > 0 ? Array.from({ length: KRUONIS_SEGMENTS }, (_, j) => j * step) : undefined;
}

interface Built {
  zone: Zone;
  battery: number; // installed MW before reserve
  batteryMwh: number | null;
  kruonis: number; // MW
  daugava: number; // MW
  thermal: Offer[];
  res: Float64Array; // wind and solar available, MW: with the fixed output, the surplus that places the plant's outage window
  entry: Entry["classes"]; // the zone's oil-shale classes that enter by the day (D-113)
}

/** OPEN-2 (D-107): the factor on PECD 3.1's capacity factor in the climate years of TYNDP 2024 —
 * Lithuania's onshore wind at 0.80, where the record's fleet delivers 0.61 of it (methodology §2): an
 * interim, round factor (docs/research/2026-10-08_open2_pecd.md). A factor on the capacity factor,
 * not on the megawatts the panel shows and the delivery cap reads. TYNDP 2026's own factors (0.28–0.35
 * in Lithuania, nearer the record's 0.25) are left as they are. */
export const PECD_FACTOR: Partial<Record<string, Partial<Record<string, number>>>> = { LT: { wind_onshore: 0.8 } };

export function build(year: Year, presets: Presets, links: Links | null, sc: Scenario): Problem {
  const H = year.meta.hours;
  const observed = year.meta.kind === "observed";
  if (!observed && (sc.target === null || !sc.fleet)) throw new Error("a scenario run needs a target year and a fleet");
  const pr = prices(presets, year, sc, H);
  const target = sc.target ?? year.meta.year;

  // run-of-river capacity factor per week for zones without their own inflow (scenario runs)
  let rorCf: Float64Array | null = null;
  if (!observed) {
    const lt = year.zones.LT.hydro_weekly_mwh?.ror as Record<string, number[]> | undefined;
    const weeks = Math.ceil(H / WEEK);
    const energy = byTarget(lt, target, weeks, "LT run-of-river inflow");
    const ref = num(presets.fleets.pemmdb_nt_2030?.LT?.["2030"]?.classes.hydro_ror?.mw, "PEMMDB LT run-of-river MW");
    rorCf = new Float64Array(weeks);
    for (let w = 0; w < weeks; w++) {
      const n = Math.min(WEEK, H - w * WEEK);
      rorCf[w] = Math.min(1, energy[w] / (n * ref));
    }
  }

  const built: Built[] = ZONES.map((z) => {
    const yz = year.zones[z];
    const load = new Float64Array(H);
    if (observed) {
      const l = hourly(yz.load, H, `${z}.load`);
      for (let h = 0; h < H; h++) load[h] = l[h] * sc.multiplier[z] + sc.firmMw[z];
    } else {
      const d = yz.demand ?? {};
      let shape: Float64Array;
      if (d.nt_profile) shape = byTarget(d.nt_profile, target, H, `${z}.demand.nt_profile`);
      else {
        shape = new Float64Array(H);
        for (const k of ["market", "prosumer", "ev_market", "ev_prosumer"]) {
          if (!d[k]) continue;
          const s = byTarget(d[k], target, H, `${z}.demand.${k}`);
          for (let h = 0; h < H; h++) shape[h] += s[h];
        }
      }
      let sum = 0;
      for (let h = 0; h < H; h++) sum += shape[h];
      if (!(sum > 0)) throw new Error(`${z}: no demand shape`);
      const twh = sc.demandTwh?.[z] ?? sum / 1e6;
      const scale = (twh * 1e6) / sum;
      for (let h = 0; h < H; h++) load[h] = shape[h] * scale * sc.multiplier[z] + sc.firmMw[z];
    }
    const fixed: Fixed[] = [];
    const offers: Offer[] = [];
    const thermal: Offer[] = [];
    const res = new Float64Array(H);
    let battery = 0;
    let kruonis = 0;
    let daugava = 0;
    let batteryMwh: number | null = null;
    const classes = observed ? observedClasses(presets, z, yz.capacity ?? {}) : sc.fleet![z];
    // oil shale's market entry (R-SUP-4, D-113): each class's megawatts and ERAA's figures
    const entry = Object.keys(classes).sort().filter((c) => ENTRY_TECH[c] && classes[c] > 0).map((cls) => {
      const t = presets.tech[`eraa2025_common|${ENTRY_TECH[cls]}`];
      const name = `${ENTRY_TECH[cls]} (ERAA 2025)`;
      return {
        cls, minOn: val(t?.min_time_on, `${name} min_time_on`), minLoad: val(t?.min_stable_generation, `${name} min_stable_generation`),
        start: val(t?.startup_cost_warm, `${name} startup_cost_warm`) + (val(t?.startup_fuel_warm, `${name} startup_fuel_warm`) * pr.oilShale) / 3.6,
      };
    });
    if (observed) {
      for (const tech of Object.keys(yz.gen ?? {}).sort()) {
        const g = hourly(yz.gen![tech], H, `${z}.gen.${tech}`);
        if ((RENEWABLE as readonly string[]).includes(tech)) {
          for (let h = 0; h < H; h++) res[h] += g[h];
          offers.push({ name: tech, cls: tech, demand: false, bid: new Float64Array(H), mw: g, co2: 0, hoursPerDay: 0 });
        } else if (GIVEN_FIXED.has(tech)) {
          fixed.push({ cls: tech, mw: g, co2: tech === "hydro_ror" ? 0 : classCost(presets, tech).co2 });
        } else throw new Error(`${z}: given output of ${tech} has no rule`);
      }
    }
    for (const cls of Object.keys(classes).sort()) {
      const mw = classes[cls];
      if (!(mw >= 0)) throw new Error(`${z}.${cls}: capacity ${mw}`);
      if (mw === 0) continue;
      if (cls === "battery") battery += mw;
      else if (cls === "hydro_ps") kruonis += mw;
      else if (cls === "hydro_daugava") daugava += mw;
      else if (observed && (GIVEN_FIXED.has(cls) || (RENEWABLE as readonly string[]).includes(cls))) continue; // output given above
      else if ((RENEWABLE as readonly string[]).includes(cls)) {
        const cf = byTarget(yz.cf?.[cls], target, H, `${z}.cf.${cls}`);
        const k = year.meta.kind === "climate" ? PECD_FACTOR[z]?.[cls] ?? 1 : 1; // OPEN-2, D-107
        const avail = new Float64Array(H);
        for (let h = 0; h < H; h++) {
          avail[h] = mw * k * cf[h];
          res[h] += avail[h];
        }
        offers.push({ name: cls, cls, demand: false, bid: new Float64Array(H), mw: avail, co2: 0, hoursPerDay: 0 });
      } else if (cls === "hydro_ror") {
        const out = new Float64Array(H);
        for (let h = 0; h < H; h++) out[h] = mw * rorCf![(h / WEEK) | 0];
        fixed.push({ cls, mw: out, co2: 0 }); // in the surplus through the fixed output, not twice
      } else if (cls === "waste") {
        // a waste plant burns what it is paid to take, whatever the price: given output in a
        // scenario as in a replay, at its megawatts less the technology's outages (D-074,
        // ERRATA E-067)
        const row = techRow(presets, cls);
        const up = (1 - (row.forced_outage_rate?.value ?? 0)) * (1 - (row.planned_outage_weeks?.value ?? 0) / 52);
        fixed.push({ cls, mw: new Float64Array(H).fill(mw * up), co2: classCost(presets, cls).co2 });
      } else if (THERMAL.has(cls)) {
        const o = thermalOffer(presets, pr, cls, mw, H, sc.bidAdj?.[z]?.[cls] ?? 0);
        offers.push(o);
        thermal.push(o);
      } else throw new Error(`${z}: class ${cls} has no rule in the engine`);
    }
    if (!observed && sc.batteryMwh) batteryMwh = sc.batteryMwh[z];
    for (let b = 0; b < sc.dsr[z].length; b++) {
      const band = sc.dsr[z][b];
      if (band.mw > 0) {
        offers.push({ name: `dsr:${b}`, cls: "dsr", demand: false, bid: new Float64Array(H).fill(band.price),
          mw: new Float64Array(H).fill(band.mw), co2: 0, hoursPerDay: band.hours });
      }
    }
    if (sc.electrolysisMw[z] > 0) {
      offers.push({ name: "electrolysis", cls: "electrolysis", demand: true, bid: new Float64Array(H).fill(sc.electrolysisCeiling),
        mw: new Float64Array(H).fill(sc.electrolysisMw[z]), co2: 0, hoursPerDay: 0 });
    }
    if (sc.p2hMw[z] > 0) {
      offers.push({ name: "p2h", cls: "p2h", demand: true, bid: new Float64Array(H).fill(sc.p2hCeiling),
        mw: new Float64Array(H).fill(sc.p2hMw[z]), co2: 0, hoursPerDay: 0 });
    }
    const zoneOut: Zone = { load, fixed, offers, reserveUnmet: new Float64Array(H) };
    if (observed && yz.thermal_weekly_max_mw) capAvailability(zoneOut, yz.thermal_weekly_max_mw, H, z);
    if (sc.chpFloor) applyChpFloor(presets, z, zoneOut, hourly(yz.temperature_c, H, `${z}.temperature_c`), H);
    if (sc.chpFloor && observed && yz.thermal_weekly_p10_mw) applyObservedFloor(zoneOut, yz.thermal_weekly_p10_mw, H, z);
    return { zone: zoneOut, battery, batteryMwh, kruonis, daugava, thermal, res, entry };
  });

  // boundary borders (R-BND-1, -2, -4, -5, -6)
  const borders: Border[] = BORDERS.map((b) => {
    const P = boundaryPrice(year, b.boundary, sc.profile, sc.level[b.boundary]);
    // a floor on the profile's average, whatever it is (ERRATA E-149)
    const floor = sc.meanFloor?.[b.boundary];
    if (floor !== undefined && !observed) {
      let m = 0;
      for (let h = 0; h < H; h++) m += P[h];
      m /= H;
      if (m > 0 && m < floor) for (let h = 0; h < H; h++) P[h] *= floor / m;
    }
    const [imp, exp] = borderNtc(year, presets, links, sc, b.code, observed, H);
    const loss = presets.loss_share[b.code];
    const lossImp = sc.losses ? val(loss?.rev, `${b.code} import loss`) : 0;
    const lossExp = sc.losses ? val(loss?.fwd, `${b.code} export loss`) : 0;
    const slope = b.boundary === "FI" ? sc.fiSlope : null;
    // R-BND-6: with a slope, Finland's price moves by `slope` €/MWh per GW of net flow from zero
    // exchange (O-6): the import and the export in SLOPE_STEPS equal tranches whose bids rise and
    // fall along that line, which the engine clears as they are (ERRATA E-041)
    const steps = slope === null ? 1 : SLOPE_STEPS;
    const zone = built[b.zone].zone;
    for (let k = 0; k < steps; k++) {
      const bidImp = new Float64Array(H);
      const mwImp = new Float64Array(H);
      const bidExp = new Float64Array(H);
      const mwExp = new Float64Array(H);
      for (let h = 0; h < H; h++) {
        const qi = imp[h] / steps;
        const qe = exp[h] / steps;
        const up = slope === null ? 0 : (slope * (k + 0.5) * qi) / 1000;
        const down = slope === null ? 0 : (slope * (k + 0.5) * qe) / 1000;
        bidImp[h] = (P[h] + up) / (1 - lossImp);
        mwImp[h] = qi * (1 - lossImp);
        bidExp[h] = (P[h] - down) * (1 - lossExp);
        mwExp[h] = qe;
      }
      const tag = steps === 1 ? "" : `:${k}`;
      zone.offers.push({ name: `import:${b.boundary}${tag}`, cls: "import", demand: false, bid: bidImp, mw: mwImp, co2: 0, hoursPerDay: 0 });
      zone.offers.push({ name: `export:${b.boundary}${tag}`, cls: "export", demand: true, bid: bidExp, mw: mwExp, co2: 0, hoursPerDay: 0 });
    }
    return { code: b.code, zone: b.zone, price: P, ntcImp: imp, ntcExp: exp, lossImp, lossExp };
  });

  // internal links (R-LINK-2, R-LINK-5)
  const links_ = LINKS.map((code) => {
    const [rev, fwd] = borderNtc(year, presets, links, sc, code, observed, H);
    return { fwd, rev };
  });

  // reserve headroom (R-STO-5…7, R-SUP-7) and storage
  const storage: Storage[] = [];
  const kr = presets.hydro as unknown as { kruonis: Record<string, Value>; daugava_tyndp2024: Record<string, Record<string, Value>>; daugava_band?: { bins: { up_to_mw: number; p10: number; p90: number }[] } };
  built.forEach((b, z) => {
    const code = ZONES[z];
    const need = reserveNeed(year, presets, code, H, sc.reserves);
    // an observed year's thermal availability is its weekly maximum output, which is already
    // what the units offered after holding their reserve: the headroom is not taken twice (D-022)
    const netOfReserve = observed && year.zones[code].thermal_weekly_max_mw !== undefined;
    // the headroom stands on the thermal offers that run continuously: oil shale enters the market
    // all or nothing by the day (D-113) and cannot start within mFRR's activation time, so headroom
    // held on it would vanish on the days it stays off (ERRATA E-142)
    const hold = b.thermal.filter((o) => !ENTRY_TECH[o.cls]);
    let reservedSum = 0;
    for (let h = 0; h < H; h++) {
      const r = need[h];
      const batt = Math.min(b.battery, r.fast + sc.mfrrShare * r.mfrr);
      reservedSum += batt;
      if (netOfReserve) continue;
      const want = r.fast + r.mfrr - batt;
      let avail = 0;
      for (const o of hold) avail += o.mw[h];
      if (want <= 0) continue;
      if (avail > want) {
        const k = (avail - want) / avail;
        for (const o of hold) o.mw[h] *= k;
      } else {
        for (const o of hold) o.mw[h] = 0;
        b.zone.reserveUnmet[h] = want - avail;
      }
    }
    if (b.battery > 0) {
      const mw = b.battery - reservedSum / H;
      const mwh = b.batteryMwh ?? b.battery * sc.battery.hours;
      const hours = mwh / b.battery;
      if (mw > 0) storage.push({ name: `battery:${code}`, zone: z, mw, hours, eff: sc.battery.eff, delta: sc.battery.delta,
        period: 24, budget: daily(H, sc.battery.cyclesPerDay * hours) });
    }
    if (b.kruonis > 0) {
      const eff = val(kr.kruonis?.efficiency_round_trip, "Kruonis efficiency");
      const hours = (val(kr.kruonis?.storage_capacity, "Kruonis storage GWh") * 1000) / b.kruonis;
      let budget: Float64Array;
      let period: number;
      if (observed) {
        const wk = year.zones[code].hydro_weekly_mwh?.kruonis as number[] | undefined;
        const weeks = Math.ceil(H / WEEK);
        if (!wk || wk.length < weeks) throw new Error(`${code}: Kruonis weekly output missing`);
        budget = new Float64Array(weeks);
        for (let w = 0; w < weeks; w++) budget[w] = Math.min(WEEK, Math.max(0, num(wk[w], "Kruonis week") / (b.kruonis * eff)));
        period = WEEK;
      } else {
        // R-PAR-5's documented cap (PLAN §3.4), not the batteries' control (ERRATA E-048); on a
        // 12-hour store it never binds: a day holds at most 18 hours of discharge at full power
        const cap = val(presets.parameters["battery.cycles_per_day.clean_horizon_assumption"], "the daily cycle cap (R-PAR-5)");
        budget = daily(H, cap * hours);
        period = 24;
      }
      const unit: Storage = { name: "kruonis", zone: z, mw: b.kruonis, hours, eff, delta: sc.pumpedDelta, period, budget };
      // a replay: the power the record shows that week — its weekly maximum output delivered,
      // and that over the efficiency pumped — as the weekly maxima are the thermal plants'
      // availability and the Daugava's turbine limit (D-022, D-042, D-073)
      const top = observed ? (year.zones[code].hydro_weekly_max_mw?.kruonis as number[] | undefined) : undefined;
      if (top) {
        unit.dischargeMax = new Float64Array(H);
        unit.chargeMax = new Float64Array(H);
        for (let h = 0; h < H; h++) {
          const mw = num(top[(h / WEEK) | 0], "Kruonis weekly maximum");
          unit.dischargeMax[h] = mw;
          unit.chargeMax[h] = mw / eff;
        }
      }
      unit.dischargeSteps = kruonisSteps(sc.kruonisStep ?? num(fitted(presets).kruonis_output.step_eur_mwh, "Kruonis's fitted step"));
      storage.push(unit);
    }
  });

  // the gas plants' one bid (R-SUP-6, D-164): a combined-cycle plant's cost, the fitted adder above it
  // and, in a scenario, the panel's offset, for every gas offer of the three zones
  applyGasBid(presets, pr, built.map((b) => b.zone), (sc.gasAdder ?? gasAdderOf(presets)) + (sc.gasAdj ?? 0), H);

  // the Daugava cascade (R-ENG-5)
  let reservoir: Reservoir | null = null;
  const lv = built[1];
  if (lv.daugava > 0) {
    const weeks = Math.ceil(H / WEEK);
    const yz = year.zones.LV;
    const src = yz.hydro_weekly_mwh?.daugava;
    let budget: Float64Array;
    let bandMin: Float64Array | null = null;
    const pmax = new Float64Array(weeks).fill(lv.daugava);
    const mx = yz.hydro_weekly_max_mw?.daugava;
    const p10 = yz.hydro_weekly_p10_mw?.daugava;
    const p90 = yz.hydro_weekly_p90_mw?.daugava;
    if (observed) {
      budget = hourly(src as number[], weeks, "LV Daugava weekly output");
      // the turbine limit of a replay: the week's 90th percentile hour of observed output (D-044),
      // never below the week's average so that the budget passes; without it the week's observed
      // maximum — what outages, reserves and water levels left of the installed capacity, as for
      // the thermal classes (D-022, D-042)
      const top = p90 ?? mx;
      if (top) {
        const m = hourly(top as number[], weeks, "LV Daugava weekly limit");
        for (let w = 0; w < weeks; w++) {
          const mean = budget[w] / Math.min(WEEK, H - w * WEEK);
          pmax[w] = Math.min(pmax[w], Math.max(m[w], mean));
        }
      }
    } else {
      // a scenario's cascade is bounded by its megawatts: TYNDP 2024's weekly "maximum generating
      // power" lies at the record's seasonal average and is no limit (D-070, ERRATA E-063); the
      // inflow comes from the export at the record's level
      budget = byTarget(src as Record<string, number[]>, target, weeks, "LV Daugava inflow");
      // and held to the band the record shows for a week of its average output, as a replay is held to
      // its own week's (D-071): the hourly output between the ratios of the 10th and 90th
      // percentile hour to the week's average, by the third of the record's weeks the average falls in
      const bins = sc.daugavaBand === false ? undefined : kr.daugava_band?.bins;
      if (bins?.length) {
        bandMin = new Float64Array(weeks);
        for (let w = 0; w < weeks; w++) {
          const hours = Math.min(WEEK, H - w * WEEK);
          const mean = budget[w] / hours;
          if (!(mean > 0)) continue;
          const k = bins.find((b) => mean <= b.up_to_mw) ?? bins[bins.length - 1];
          pmax[w] = Math.min(pmax[w], Math.max(mean, k.p90 * mean));
          bandMin[w] = Math.min(mean, k.p10 * mean);
        }
      }
    }
    const rows = kr.daugava_tyndp2024;
    const tk = Object.keys(rows).map(Number).sort((a, b) => a - b);
    const near = tk.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a), tk[0]);
    // the minimum flow: in a replay the week's 10th percentile hour of observed output (D-044; the
    // budget's average bounds it in the programme), else its observed minimum (D-022); PEMMDB's
    // MIN_TURB in a scenario run
    const observedMin = observed ? p10 ?? yz.hydro_weekly_min_mw?.daugava : undefined;
    const pmin = observedMin ? hourly(observedMin, weeks, "LV Daugava weekly minimum")
      : new Float64Array(weeks).fill(val(rows[String(near)]?.min_turb_mw, "Daugava minimum flow"));
    if (bandMin) for (let w = 0; w < weeks; w++) pmin[w] = Math.max(pmin[w], bandMin[w]);
    for (let w = 0; w < weeks; w++) if (pmin[w] > pmax[w]) pmin[w] = pmax[w];
    reservoir = { zone: 1, budget, pmax, pmin };
  }

  // the plant (R-SMR-1, R-SMR-2): under a plain contract it bids its whole available power at the
  // market's floor (R-PAR-2; D-150, it was a fixed output until then), so it runs unless the price
  // reaches the floor itself; under the negative-price clause (R-SMR-4) its minimum load is fixed and
  // the part above it bids CLAUSE_BID, so it turns down where wind and solar alone clear at their bid
  // of 0 — the model's hours "at or below 0" (M6)
  if (sc.smr.units > 0) {
    const surplus = new Float64Array(H);
    for (const b of built) {
      for (let h = 0; h < H; h++) {
        let f = 0;
        for (const x of b.zone.fixed) f += x.mw[h];
        surplus[h] += b.res[h] + f - b.zone.load[h];
      }
    }
    const starts = outageStarts(surplus, sc.smr.units, sc.smr.outageHours, sc.smr.gapHours);
    const units = available(H, sc.smr.units, starts, sc.smr.outageHours);
    const ee = built[0].zone;
    const must = new Float64Array(H);
    const flex = new Float64Array(H);
    const share = sc.smr.clause ? sc.smr.minLoad : 0;
    for (let h = 0; h < H; h++) {
      must[h] = units[h] * sc.smr.mw * share;
      flex[h] = units[h] * sc.smr.mw * (1 - share);
    }
    if (sc.smr.clause) ee.fixed.push({ cls: "nuclear", mw: must, co2: 0 });
    ee.offers.push({ name: "nuclear", cls: "nuclear", demand: false, bid: new Float64Array(H).fill(sc.smr.clause ? CLAUSE_BID : sc.floor), mw: flex, co2: 0, hoursPerDay: 0 });
  }

  const ez = built.findIndex((b) => b.entry.length > 0);
  const entry = ez >= 0 ? { zone: ez, classes: built[ez].entry } : null;
  return { hours: H, voll: sc.voll, floor: sc.floor, zones: built.map((b) => b.zone), links: links_, borders, storage, reservoir, entry };
}

/** €/MWh: above the renewables' bid of 0 and the LP's perturbation of at most 0.0011 (lp.ts). */
export const CLAUSE_BID = 0.01;

/** A daily budget in hours at full power, not rounded (E-124). */
function daily(H: number, hours: number): Float64Array {
  return new Float64Array(Math.ceil(H / 24)).fill(Math.max(0, Math.min(24, hours)));
}

/** [into the core zone / towards LT reversed, out of it]: A31 offered capacity, less what the
 * AC borders give to balancing (R-LINK-5). Returns [rev, fwd]. */
function observedNtc(year: Year, code: string, H: number): [Float64Array, Float64Array] {
  const b = year.borders[code];
  if (!b) throw new Error(`${year.meta.key}: border ${code} missing`);
  const fwd = hourly(b.ntc_fwd, H, `${code}.ntc_fwd`);
  const rev = hourly(b.ntc_rev, H, `${code}.ntc_rev`);
  if (b.reserved_fwd) {
    const r = hourly(b.reserved_fwd, H, `${code}.reserved_fwd`);
    for (let h = 0; h < H; h++) fwd[h] = Math.max(0, fwd[h] - r[h]);
  }
  if (b.reserved_rev) {
    const r = hourly(b.reserved_rev, H, `${code}.reserved_rev`);
    for (let h = 0; h < H; h++) rev[h] = Math.max(0, rev[h] - r[h]);
  }
  return [rev, fwd];
}

/** ERAA 2025's target year for a scenario's: its own, or the latest before it (D-020). */
function eraaYear(links: Links, code: string, target: number): number {
  const b = links.eraa2025_hourly[code];
  if (!b) throw new Error(`ERAA NTC for ${code} missing`);
  const years = Object.keys(b.fwd).map(Number).sort((x, y) => x - y);
  let y = years[0];
  for (const k of years) if (k <= target) y = k;
  return y;
}

function eraa(links: Links, code: string, dir: "fwd" | "rev", ty: number, H: number): Float64Array {
  return hourly(links.eraa2025_hourly[code]?.[dir]?.[String(ty)], H, `${code}.${dir}.${ty}`);
}

/** ERAA 2025's hourly NTC of the target year, or of the latest year before it (D-020). */
function scenarioNtc(links: Links | null, code: string, target: number, H: number): [Float64Array, Float64Array] {
  if (!links) throw new Error("a scenario run needs links.json");
  const ty = eraaYear(links, code, target);
  return [eraa(links, code, "rev", ty, H), eraa(links, code, "fwd", ty, H)];
}

/** Where planned maintenance starts on a scenario year's axis: 1 June, 00:00 UTC (R-LINK-3, D-032). */
export const MAINTENANCE_START = 151 * 24;

/** A cable's typical availability (R-LINK-3 (ii), OPEN-5): its planned-maintenance share as one
 * outage from `start`, and the rest of its documented unavailability spread over the other hours,
 * so that the year's average is its average available technical capacity. */
export function availability(a: number, planned: number, start: number, H: number): Float64Array {
  const out = new Float64Array(H).fill(Math.min(1, a / (1 - planned)));
  const n = Math.round(planned * H);
  for (let h = start; h < start + n && h < H; h++) out[h] = 0;
  return out;
}

/** The hours of a what-if's window (R-LINK-4). */
function inWindow(w: WhatIf, h: number): boolean {
  const d = Math.floor(h / 24);
  return w.from <= w.to ? d >= w.from && d <= w.to : d >= w.from || d <= w.to;
}

function hold(a: Float64Array, w: WhatIf | undefined): void {
  if (!w) return;
  for (let h = 0; h < a.length; h++) if (inWindow(w, h) && a[h] > w.mw) a[h] = w.mw;
}

/** A scenario year's border as the sum of its lines (R-LINK-1, R-LINK-3 … R-LINK-5; D-032). ERAA's
 * NTC of the target year less the planned lines it holds is what the lines in service carry: on an
 * AC border as one group, less the balancing reservation; on EE-FI and LT-SE4 shared among the
 * cables by their rating, each at its availability. A planned line adds ERAA's own step (the NTC of
 * its first target year less the one before). LT-PL is LitPol and Harmony Link, held to Litgrid's
 * plan unless the choice lifts it. */
function scenarioLines(p: Presets, links: Links | null, lc: LinkChoice, code: string, target: number, H: number): [Float64Array, Float64Array] {
  if (!links) throw new Error("a scenario run needs links.json");
  const mine = Object.entries(p.links.lines).filter(([, l]) => l.border === code);
  if (!mine.length) throw new Error(`no lines for ${code}`);
  const ty = eraaYear(links, code, target);
  const step = (key: string, dir: "fwd" | "rev"): Float64Array => {
    const pl = p.links.lines[key].planned!;
    const a = eraa(links, code, dir, pl.eraa_year, H), b = eraa(links, code, dir, pl.eraa_before, H);
    for (let h = 0; h < H; h++) a[h] = Math.max(0, a[h] - b[h]);
    return a;
  };
  // each cable's availability, planned outages of a border's cables one after the other
  const avail: Record<string, Float64Array> = {};
  let start = MAINTENANCE_START;
  for (const [key, l] of mine) {
    if (l.kind !== "hvdc") continue;
    const a = val(l.availability, `${key} availability`), pm = val(l.planned_share, `${key} planned share`);
    avail[key] = lc.profile === "nameplate" ? new Float64Array(H).fill(1) : availability(a, pm, start, H);
    if (lc.profile === "typical") start += Math.round(pm * H);
  }
  const planOf = (dir: "fwd" | "rev"): number => {
    const t = (links.table as Record<string, Record<string, Record<string, Record<string, Record<string, { mw: number }>>>>>)
      .litgrid_2026_2035?.ntc?.["LT-PL"]?.[dir];
    const y = String(Math.min(2035, Math.max(2026, target)));
    return num(t?.[y]?.mw, `Litgrid's LT-PL plan ${dir} ${y}`);
  };
  const side = (dir: "fwd" | "rev"): Float64Array => {
    const total = new Float64Array(H);
    // what the lines in service carry of ERAA's NTC: its planned lines taken out
    const base = code === "LT-PL" ? null : eraa(links, code, dir, ty, H);
    for (const [key, l] of mine) {
      if (!base || !l.planned || ty < l.planned.eraa_year) continue;
      const s = step(key, dir);
      for (let h = 0; h < H; h++) base[h] = Math.max(0, base[h] - s[h]);
    }
    const existing = mine.filter(([, l]) => !l.planned && l.kind === "hvdc");
    const rated = existing.reduce((s, [k, l]) => s + val(l.mw, `${k} MW`), 0);
    for (const [key, l] of mine) {
      if (l.planned && !lc.on[key]) continue;
      let cap: Float64Array;
      if (l.planned) cap = code === "LT-PL" ? new Float64Array(H).fill(val(l.mw, `${key} MW`)) : step(key, dir);
      else if (!base) cap = new Float64Array(H).fill(val(l.mw, `${key} MW`)); // LT-PL: each line at its MW, AC or not
      else if (l.kind === "ac") cap = Float64Array.from(base);
      else {
        cap = Float64Array.from(base);
        const share = val(l.mw, `${key} MW`) / rated;
        for (let h = 0; h < H; h++) cap[h] *= share;
      }
      if (avail[key]) for (let h = 0; h < H; h++) cap[h] *= avail[key][h];
      hold(cap, lc.whatif[key]);
      for (let h = 0; h < H; h++) total[h] += cap[h];
    }
    if (code === "EE-LV" || code === "LV-LT") {
      const r = lc.reserve[code];
      for (let h = 0; h < H; h++) total[h] = Math.max(0, total[h] - r);
    }
    if (code === "LT-PL" && lc.plan) {
      const cap = planOf(dir);
      for (let h = 0; h < H; h++) if (total[h] > cap) total[h] = cap;
    }
    return total;
  };
  return [side("rev"), side("fwd")];
}

/** An observed year's what-ifs (R-LINK-4; planned lines have none). A line alone on its border, or
 * an AC group, caps the offered capacity at what it keeps. On a border of two cables (EstLink 1
 * and 2) each hour's offer is first split between them, then each keeps at most its what-if
 * (ERRATA E-046, E-047): with no A78 event of either both are in service and the offer is limited
 * elsewhere, so the border keeps the lesser of the offer and the cables' shares of the year's
 * highest offer, held ones at their what-if; a cable in a forced outage carries nothing and the
 * other all of the offer; with a planned event of one, the other carries its share and the one
 * with the event the rest; alike events of both split the offer by rating. Two cables held at 0
 * leave nothing. */
function observedWhatIfs(p: Presets, lc: LinkChoice, code: string, rev: Float64Array, fwd: Float64Array): void {
  const mine = Object.entries(p.links.lines).filter(([, l]) => l.border === code && !l.planned);
  if (mine.length === 1 || mine.every(([, l]) => l.kind === "ac")) {
    for (const [key] of mine) { hold(fwd, lc.whatif[key]); hold(rev, lc.whatif[key]); }
    return;
  }
  if (mine.length !== 2) throw new Error(`${code}: what-ifs split an offer between two cables, not ${mine.length}`);
  const keys = mine.map(([k]) => k);
  const w = keys.map((k) => lc.whatif[k]);
  if (!w[0] && !w[1]) return;
  const rated = mine.map(([k, l]) => val(l.mw, `${k} MW`));
  [fwd, rev].forEach((a, i) => {
    const dir = i === 0 ? "fwd" : "rev";
    let top = 0;
    for (let h = 0; h < a.length; h++) if (a[h] > top) top = a[h];
    if (top === 0) return; // nothing offered all year: nothing to hold
    const share = rated.map((r) => (top * r) / (rated[0] + rated[1]));
    const ev = keys.map((k) => lc.out?.[k]?.[dir]);
    for (let h = 0; h < a.length; h++) {
      const held = w.map((x) => (x && inWindow(x, h) ? x.mw : Infinity));
      if (held[0] === Infinity && held[1] === Infinity) continue;
      const e0 = ev[0]?.[h] ?? 0, e1 = ev[1]?.[h] ?? 0;
      if (e0 === 0 && e1 === 0) {
        a[h] = Math.min(a[h], Math.min(share[0], held[0]) + Math.min(share[1], held[1]));
        continue;
      }
      let c0: number;
      if (e0 === 2 && e1 !== 2) c0 = 0;
      else if (e1 === 2 && e0 !== 2) c0 = a[h];
      else if (e0 === e1) c0 = (a[h] * share[0]) / top;
      else if (e0 < e1) c0 = Math.min(share[0], a[h]);
      else c0 = a[h] - Math.min(share[1], a[h]);
      a[h] = Math.min(c0, held[0]) + Math.min(a[h] - c0, held[1]);
    }
  });
}

/** A border's hourly capacity as the run uses it: [against the code's direction, along it]. */
function borderNtc(y: Year, p: Presets, links: Links | null, sc: Scenario, code: string, observed: boolean, H: number): [Float64Array, Float64Array] {
  const lc = sc.links ?? null;
  if (observed) {
    const [rev, fwd] = observedNtc(y, code, H);
    if (lc) observedWhatIfs(p, lc, code, rev, fwd);
    return [rev, fwd];
  }
  const target = sc.target ?? 0;
  return lc ? scenarioLines(p, links, lc, code, target, H) : scenarioNtc(links, code, target, H);
}

interface Need {
  fast: number; // FCR + aFRR up, MW
  mfrr: number; // mFRR up, MW
}

/** Upward reserve a zone holds out of the day-ahead market, hourly (R-STO-5, R-STO-6): observed
 * procurement from the market's first hour (0 before, PLAN O-2); in scenario runs the 2026 need
 * (midpoint of the published range) allocated by each zone's 2025 share (D-020). */
function reserveNeed(year: Year, p: Presets, zone: ZoneCode, H: number, on: boolean): Need[] {
  const out: Need[] = [];
  if (!on) {
    for (let h = 0; h < H; h++) out.push({ fast: 0, mfrr: 0 });
    return out;
  }
  if (year.meta.kind === "observed") {
    const r = year.zones[zone].reserve;
    const get = (k: "FCR_sym" | "aFRR_up" | "mFRR_up") => (r?.[k] ? hourly(r[k], H, `${zone}.reserve.${k}`) : new Float64Array(H));
    const fcr = get("FCR_sym");
    const afrr = get("aFRR_up");
    const mfrr = get("mFRR_up");
    for (let h = 0; h < H; h++) out.push({ fast: fcr[h] + afrr[h], mfrr: mfrr[h] });
    return out;
  }
  const res = p.reserve as unknown as { need_2026: Record<string, Value>; shares_2025: Record<string, Record<string, Value>> };
  const n = res.need_2026;
  const s = res.shares_2025;
  const share = (k: string) => val(s[k]?.[zone], `${zone} ${k} share`);
  const mid = (lo: string, hi: string) => (val(n[lo], lo) + val(n[hi], hi)) / 2;
  const fast = val(n.fcr_mw, "FCR need") * share("FCR_sym") + mid("afrr_up_mw_low", "afrr_up_mw_high") * share("aFRR_up");
  const mfrr = mid("mfrr_up_mw_low", "mfrr_up_mw_high") * share("mFRR_up");
  for (let h = 0; h < H; h++) out.push({ fast, mfrr });
  return out;
}
