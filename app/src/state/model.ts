// What the panel controls (R-APP-1) and how it becomes the engine's scenario for each year of the
// set (R-APP-2, R-TIME-3): the opening state of D-011 and D-027, the runs of a set with their
// weights, and the standard sensitivities of R-APP-11 — the owner's four price pairs of LNG and CO₂ since D-183. Every default comes from presets.json.

import type { Presets, Value } from "../contract/presets.ts";
import type { Year } from "../contract/year.ts";
import type { Boundary, LinkChoice, PerZone, Scenario, WhatIf } from "../engine/build.ts";
import { FLEX, THERMAL, pathValue } from "../engine/build.ts";
import type { ZoneCode } from "../engine/problem.ts";
import { common, outlook, replay } from "./scenario.ts";

export interface ZoneState {
  demand: string; // preset key, or "own": the family's own demand (R-DEM-2)
  multiplier: number; // R-DEM-3
  firmMw: number; // R-DEM-4
  fleet: string; // preset key
  mw: Record<string, number>; // class → MW, every class of the preset (R-SUP-1)
  parts?: Record<string, number>; // the preset's source rows of the classes made of several, once one is moved (D-059)
  batteryMwh: number;
  electrolysisMw: number; // R-DEM-5: 0 = off (D-011)
  p2hMw: number;
}

/** The scenario view's four scenarios of 2035 (specification revision 1.6, D-036; one unit since D-058): Elering's gas,
 * or one, two or three SMR units of 315 MW on the same fleet (R-SMR-1; D-151, D-189). */
export type ScenarioId = "gas" | "smr1" | "smr2" | "smr3";
export const SCENARIOS: ScenarioId[] = ["gas", "smr1", "smr2", "smr3"];
export const UNITS: Record<ScenarioId, number> = { gas: 0, smr1: 1, smr2: 2, smr3: 3 };
/** The Estonian fleet and demand of 0 SMR (Elering and TalTech's S1), the others' (ERAA). */
export const S1 = "elering_taltech_s1_2035";
const ERAA = "eraa2025_nt_2035";
/** The Estonian gas class the panel shows: the peaking gas, or the combined cycle of a fleet that has
 * none (a preset loaded from the text). */
export const gasClass = (mw: Record<string, number>) => (mw.gas_ocgt !== undefined || mw.gas_ccgt === undefined ? "gas_ocgt" : "gas_ccgt");
/** Planned lines S1 has only from 2040: off by default in 2035 (the owner, D-036). */
const S1_LATER = ["estlink3", "ee_lv_4"];
/** The contract's default strike, €/MWh (R-SMR-3: the owner's). */
export const STRIKE = 90;

export interface State {
  run: "scenario" | "replay";
  scenario: ScenarioId; // the scenario shown; all four run together (D-036, D-058)
  smr: { clause: boolean; strike: number }; // the contract of R-SMR-3, R-SMR-4
  year: number; // replay
  family: "tyndp2024" | "tyndp2026";
  target: number;
  profile: "DE" | "GA" | "NT" | "NTplus" | "REAL" | "TIGHT" | "TIGHTJ"; // REAL: the neighbours' observed prices of profileYear (D-051); TIGHT, TIGHTJ: the research's tight neighbours (D-121)
  profileYear: number; // the target year of the neighbours' profile: the run's own, or another through "Other" (D-046)
  fuel: string; // the fuel path: every commodity but the two below (R-SUP-8)
  fuelGas: number; // €/MWh thermal, the scenario's gas price: the path's unless set (D-064)
  fuelEua: number; // €/t, the scenario's CO₂ price
  dsr: string; // preset key or "none"
  zones: PerZone<ZoneState>;
  level: Record<Boundary, number>;
  fiSlope: number; // €/MWh per GW; 0 = price-taker (R-BND-6)
  battery: { delta: number; eff: number; cycles: number; hours: number };
  kruonisDelta: number;
  mfrrShare: number;
  reserves: boolean;
  links: LinkState;
  bids: Record<string, number>; // scenario runs (D-090): `<zone>.<class>` → €/MWh added to the class's bid as fuel, CO₂ and running costs make it; `gas` → the gas plants' one bid's (D-164)
}

/** The borders' choices (R-LINK-1, R-LINK-3 … R-LINK-5): a replay uses the what-ifs only. */
interface LinkState {
  profile: "typical" | "nameplate";
  plan: boolean; // LT-PL held to Litgrid's plan
  reserve: Record<"EE-LV" | "LV-LT", number>; // MW held for balancing
  on: Record<string, boolean>; // planned lines
  whatif: Record<string, string>; // per line: "none" or "MW@MM-DD..MM-DD"
}

/** The classes whose bid the panel lets a scenario move by hand (D-090): the thermal plants that bid
 * their costs — not waste, which runs whatever the price, nor the plant, whose units run as must-run,
 * nor gas, whose plants bid one price the panel moves once for the three zones (`bids.gas`, D-164). */
export const bidEditable = (cls: string): boolean => THERMAL.has(cls) && cls !== "waste" && cls !== "nuclear" && !FLEX.has(cls);

export const OWN = "own";
export const NONE = "none";
export const BOUNDARIES: Boundary[] = ["FI", "SE4", "PL"];

const each = <T>(f: (z: ZoneCode) => T): PerZone<T> => ({ EE: f("EE"), LV: f("LV"), LT: f("LT") });

/** Fleet presets that give zone z a fleet for the target year, official ones first (R-PUB-3). */
export function fleetPresets(p: Presets, z: ZoneCode, target: number): string[] {
  return order(Object.keys(p.fleets).filter((k) => p.fleets[k]?.[z]?.[String(target)]));
}

export function demandPresets(p: Presets, z: ZoneCode, target: number): string[] {
  return order(Object.keys(p.demand).filter((k) => (p.demand[k]?.[z] as Record<string, unknown> | undefined)?.[String(target)]));
}

/** TSO and ERAA presets first, TYNDP's next, the owner's last and labelled (R-PUB-3). */
export function owner(key: string): boolean {
  return key.startsWith("fermi_");
}
function order(keys: string[]): string[] {
  const rank = (k: string) => (owner(k) ? 2 : k.startsWith("pemmdb_") ? 1 : 0);
  return keys.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** A fleet preset as the panel holds it: every class's MW and the battery energy. */
export function fleetOf(p: Presets, key: string, z: ZoneCode, target: number, hours: number): { mw: Record<string, number>; batteryMwh: number } {
  const f = p.fleets[key]?.[z]?.[String(target)];
  if (!f) throw new Error(`fleet ${key} has no ${z} ${target}`);
  const mw: Record<string, number> = {};
  for (const [c, v] of Object.entries(f.classes)) mw[c] = v.mw;
  // the owner's Estonian onshore wind and solar in place of S1's (D-182): the scenario's preset, so its chips,
  // the panel's marks and the opening agree; the slider's note keeps S1's own figure
  if (key === S1 && z === "EE" && target === 2035) Object.assign(mw, OPENING_EE_MW);
  return { mw, batteryMwh: f.battery_mwh?.mwh ?? (mw.battery ?? 0) * hours };
}

/** The source rows that make `cls` where the fleet preset folds two or more into it — Elering's
 * four rows of gas (D-059) — with their MW: as set, else the preset's rows in the proportion that
 * gives the class's MW. Null: the class is one row's or none's. */
export function partsOf(p: Presets, zs: ZoneState, z: ZoneCode, cls: string): Record<string, number> | null {
  const rows = p.fleets[zs.fleet]?.[z]?.["2035"]?.rows ?? {};
  const keys = Object.keys(rows).filter((k) => rows[k].cls === cls);
  if (keys.length < 2) return null;
  if (zs.parts && keys.every((k) => zs.parts![k] !== undefined)) return Object.fromEntries(keys.map((k) => [k, zs.parts![k]]));
  const total = keys.reduce((a, k) => a + rows[k].value, 0), f = total > 0 ? (zs.mw[cls] ?? 0) / total : 0;
  return Object.fromEntries(keys.map((k) => [k, rows[k].value * f]));
}

// presets.json sections the schema leaves loose, as the export writes them (export/tables.py)
interface Weights { tyndp2024: Record<string, Value>; tyndp2026: Record<string, Value & { target_year: number }> }
interface Delivery { battery_mw?: Value; battery_mwh?: Value; years: Record<string, { wind_onshore_mw: Value; wind_offshore_mw: Value }> }
const weights = (p: Presets) => p.weights as unknown as Weights;
const delivery = (p: Presets, z: ZoneCode) => (p.delivery as unknown as Record<ZoneCode, Delivery>)[z];
/** Svenska kraftnät's lowest Polish price for 2040 (LMA 2026, Figur 31): the slow build's floor on
 * Poland's average (R-BND-5; ERRATA E-149). */
export const slowBuildPl = (p: Presets) => (p.boundary as unknown as { svk_lma_2026_2040: { pl: { min: Value } } }).svk_lma_2026_2040.pl.min.value;

/** The application's opening state (R-BND-5, R-PUB-3, R-SMR-8; D-011, D-036): 0 SMR —
 * Estonia's fleet and demand of Elering and TalTech's S1, Latvia's and Lithuania's of ERAA 2025 —
 * against TYNDP 2024 Distributed Energy 2035 on the three climate years, EstLink 3 and the fourth
 * EE–LV line off as in S1, electrolysis off, no plant. */
export function opening(p: Presets): State {
  const target = 2035;
  const base = replayDefaults(p);
  const zones = each((z): ZoneState => {
    const fleet = z === "EE" ? S1 : ERAA;
    const { mw, batteryMwh } = fleetOf(p, fleet, z, target, base.battery.hours);
    return { demand: fleet, multiplier: 1, firmMw: 0, fleet, mw, batteryMwh, electrolysisMw: 0, p2hMw: 0 };
  });
  const links = { ...base.links, on: plannedOn(p, target) };
  for (const k of S1_LATER) if (k in links.on) links.on[k] = false;
  // the owner's opening (D-182): the neighbours' price levels as the owner set them, which the panel lists as
  // changed from the profile as published; Estonia's onshore wind and solar come with the fleet (fleetOf)
  return { ...base, run: "scenario", family: "tyndp2024", target, profile: "DE", profileYear: target, fuel: "eraa2025_final", ...fuelOf(p, "eraa2025_final", target), dsr: ERAA, zones, links, level: { ...OPENING_LEVEL } };
}

/** The owner's opening values (D-182, 2026-10-27): Estonia's onshore wind and solar, MW, in place of S1's, and the
 * neighbours' price levels — Finland's typed as 75.0 €/MWh, and since D-185 Sweden's SE4 as 90.0 and Poland's as
 * 120.0. Since D-194 on the profile as published, whose averages are 39.9, 45.9 and 57.2 (until then ×1.4783, ×1.4943
 * and ×1.5276 on the profile re-priced to the scenario's gas and CO₂, 50.7, 60.2 and 78.6). */
export const OPENING_EE_MW = { wind_onshore: 1300, solar: 2500 } as const;
export const OPENING_LEVEL = { FI: 1.8786, SE4: 1.9607, PL: 2.0982 } as const;

/** The neighbours' price levels a profile opens with (D-190): the owner's on Distributed Energy 2035, the opening's
 * profile (D-182, D-185); ×1 — the profile as published, or as the research built it — on every other. */
export function presetLevel(profile: State["profile"], year: number): State["level"] {
  return profile === "DE" && year === 2035 ? { ...OPENING_LEVEL } : { FI: 1, SE4: 1, PL: 1 };
}

/** The demand a zone takes with a family: TYNDP 2026's own, or the scenario's preset. */
const demandOf = (family: State["family"], z: ZoneCode): string => (family === "tyndp2026" ? OWN : z === "EE" ? S1 : ERAA);

/** The planned lines ERAA 2025 has in service by the target year: the default the owner chose (D-031). */
export function plannedOn(p: Presets, target: number): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [k, l] of Object.entries(p.links.lines)) if (l.planned) out[k] = l.planned.eraa_year <= target;
  return out;
}

/** The lines an observed year has: every line that is not planned. */
export const existingLines = (p: Presets): string[] => Object.keys(p.links.lines).filter((k) => !p.links.lines[k].planned);

function linkDefaults(p: Presets, target: number): LinkState {
  const r = p.links.reserve_2025;
  return {
    profile: "typical", plan: true, reserve: { "EE-LV": r["EE-LV"].value, "LV-LT": r["LV-LT"].value },
    on: plannedOn(p, target), whatif: Object.fromEntries(Object.keys(p.links.lines).map((k) => [k, "none"])),
  };
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** "MW@MM-DD..MM-DD" as the engine's what-if on a year's axis, or null for "none"; a malformed
 * date is an error (the text's trust boundary). 29 February on a 365-day axis is the 28th. */
export function whatIf(v: string, leap: boolean): WhatIf | null {
  if (v === "none") return null;
  const m = /^([0-9]{1,4})@([0-9]{2})-([0-9]{2})\.\.([0-9]{2})-([0-9]{2})$/.exec(v);
  if (!m) throw new Error(`what-if ${v}: not MW@MM-DD..MM-DD`);
  const day = (mm: string, dd: string): number => {
    const mo = Number(mm), d = Number(dd);
    if (mo < 1 || mo > 12 || d < 1 || d > (mo === 2 ? 29 : MONTH_DAYS[mo - 1])) throw new Error(`what-if ${v}: no date ${mm}-${dd}`);
    let n = 0;
    for (let i = 0; i < mo - 1; i++) n += MONTH_DAYS[i] + (i === 1 && leap ? 1 : 0);
    return n + Math.min(d, mo === 2 && !leap ? 28 : d) - 1;
  };
  return { mw: Number(m[1]), from: day(m[2], m[3]), to: day(m[4], m[5]) };
}

function linkChoice(y: Year, s: State): LinkChoice {
  const leap = y.meta.hours > 8760;
  const whatif: Record<string, WhatIf> = {};
  for (const [k, v] of Object.entries(s.links.whatif)) {
    const w = whatIf(v, leap);
    if (w) whatif[k] = w;
  }
  return { profile: s.links.profile, plan: s.links.plan, reserve: { ...s.links.reserve }, on: { ...s.links.on }, whatif };
}

/** A fuel path's gas and CO₂ prices of a target year, as the state holds them (D-064). */
export const fuelOf = (p: Presets, path: string, target: number) => ({ fuelGas: pathValue(p, path, "gas", target), fuelEua: pathValue(p, path, "eua", target) });

/** The controls a replay shares with a scenario run, at their defaults (state/scenario.ts). */
function replayDefaults(p: Presets): State {
  const d = common(p, false);
  return {
    run: "replay", scenario: "gas", smr: { clause: false, strike: STRIKE }, year: 2025, family: "tyndp2024", target: 2035, profile: "DE", profileYear: 2035, fuel: "eraa2025_final", ...fuelOf(p, "eraa2025_final", 2035), dsr: NONE,
    zones: each(() => ({ demand: OWN, multiplier: 1, firmMw: 0, fleet: "", mw: {}, batteryMwh: 0, electrolysisMw: 0, p2hMw: 0 })),
    level: { FI: 1, SE4: 1, PL: 1 }, fiSlope: 0,
    battery: { delta: d.battery.delta, eff: d.battery.eff, cycles: d.battery.cyclesPerDay, hours: d.battery.hours },
    kruonisDelta: d.pumpedDelta, mfrrShare: d.mfrrShare, reserves: true, links: linkDefaults(p, 2035), bids: {},
  };
}

/** A replay of an observed year at its defaults. */
export function replayState(p: Presets, year: number): State {
  return { ...replayDefaults(p), year };
}

/** The boundary profile key of the year files (R-BND-5). */
export function profileKey(s: State): string {
  return `${s.profile}_${s.profileYear}`;
}

/** The boundary profiles the scenario of 2035 can run on (R-BND-5; D-046, D-050): the panel's "Other"
 * list. National Trends of TYNDP 2024 exists for climate year 2009 only (D-007). National Trends+
 * 2030 is left out: its weather scenarios hold no offshore wind series, which Latvia's and
 * Lithuania's fleets of 2035 need. REAL is the neighbours' observed day-ahead prices of a past year,
 * the same hourly series in each climate year (D-051). TIGHT and TIGHTJ are the neighbours tight in
 * 2035, each on its own or all at once, from energiamudel's research on Finland, Sweden and Poland:
 * one series per climate year, frozen at the fuels it was computed with (D-121). */
export const PROFILE_YEARS: Record<State["profile"], number[]> = { DE: [2035, 2040, 2050], GA: [2035, 2040, 2050], NT: [2030, 2040], NTplus: [2035, 2040, 2050], REAL: [2025], TIGHT: [2035], TIGHTJ: [2035] };
export const familyOf = (profile: State["profile"]): State["family"] => (profile === "NTplus" ? "tyndp2026" : "tyndp2024");
/** A profile off the panel's three: another target year's, or National Trends. */
export const otherProfile = (s: State): boolean => s.profile === "NT" || s.profileYear !== s.target;

/** The state with the neighbours' profile set (D-046). National Trends+ of the run's own target year
 * brings its Baltic demand with its weather (R-TIME-2); every other profile leaves the scenario's. */
export function withProfile(s: State, profile: State["profile"], year: number): State {
  if (!PROFILE_YEARS[profile]?.includes(year)) throw new Error(`no neighbours' profile ${profile} ${year}`);
  const family = familyOf(profile);
  const own = family === "tyndp2026" && year === s.target;
  const zones = { ...s.zones };
  for (const z of ["EE", "LV", "LT"] as ZoneCode[]) {
    const was = zones[z].demand;
    const d = own ? OWN : was === OWN ? demandOf("tyndp2024", z) : was;
    zones[z] = { ...zones[z], demand: d };
  }
  // the levels carry over against each profile's own (D-190): the owner's ×1.88 … on Distributed Energy 2035 is ×1 on
  // a profile that opens at ×1, and a level moved on either moves the other by the same share
  const from = presetLevel(s.profile, s.profileYear), to = presetLevel(profile, year);
  const level = { FI: (s.level.FI * to.FI) / from.FI, SE4: (s.level.SE4 * to.SE4) / from.SE4, PL: (s.level.PL * to.PL) / from.PL };
  return { ...s, profile, profileYear: year, family, zones, level };
}

export interface Run { key: string; weight: number; label: string }

/** The years a state runs on, with their weights (R-TIME-3): an observed year alone; the three
 * climate years of TYNDP 2024 (National Trends only on 2009, D-007); the weather scenarios of
 * TYNDP 2026 for the target year. */
export function runsOf(p: Presets, s: State): Run[] {
  if (s.run === "replay") return [{ key: String(s.year), weight: 1, label: String(s.year) }];
  if (s.family === "tyndp2024") {
    if (s.profile === "NT") return [{ key: "cy2009", weight: 1, label: "2009" }];
    return ["1995", "2008", "2009"].map((y) => ({ key: `cy${y}`, weight: weights(p).tyndp2024[y].value, label: y }));
  }
  return Object.entries(weights(p).tyndp2026)
    .filter(([, w]) => w.target_year === s.profileYear)
    .map(([ws, w]) => ({ key: ws.toLowerCase(), weight: w.value, label: ws }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** The engine's scenario for one year of the set. */
export function engineScenario(p: Presets, y: Year, s: State): Scenario {
  const shared = (sc: Scenario): Scenario => ({
    ...sc,
    multiplier: each((z) => s.zones[z].multiplier),
    firmMw: each((z) => s.zones[z].firmMw),
    level: { ...s.level },
    fiSlope: s.fiSlope > 0 ? s.fiSlope : null,
    battery: { eff: s.battery.eff, delta: s.battery.delta, cyclesPerDay: s.battery.cycles, hours: s.battery.hours },
    pumpedDelta: s.kruonisDelta,
    mfrrShare: s.mfrrShare,
    reserves: s.reserves,
    links: linkChoice(y, s),
  });
  if (s.run === "replay") return shared(replay(p, y));
  const sc = outlook(p, y, {
    target: s.target, profile: profileKey(s), fleet: each((z) => s.zones[z].fleet),
    // the family's own demand only with National Trends+ of the run's target year (D-046)
    demand: s.family === "tyndp2026" && !otherProfile(s) ? null : each((z) => (s.zones[z].demand === OWN ? null : s.zones[z].demand)),
    dsr: s.dsr === NONE ? null : s.dsr, fuelPath: s.fuel,
  });
  sc.gasPrice = s.fuelGas;
  sc.euaPrice = s.fuelEua;
  // a bid moved by hand (D-090): the offset rides on the costs, so it follows the gas and CO₂ prices
  sc.bidAdj = each((z) => Object.fromEntries(Object.entries(s.bids).filter(([k]) => k.startsWith(`${z}.`)).map(([k, v]) => [k.slice(z.length + 1), v])));
  sc.gasAdj = s.bids.gas ?? 0; // the gas plants' one bid moved by hand, for the three zones (D-164)
  // the plant's scenarios: its units on top of the one base the four share (D-151; until then each unit
  // replaced its net output of the Estonian peaking gas, D-036)
  const units = UNITS[s.scenario];
  const fleet = each((z) => ({ ...s.zones[z].mw }));
  return shared({
    ...sc,
    smr: { ...sc.smr, units, clause: s.smr.clause },
    fleet,
    batteryMwh: each((z) => s.zones[z].batteryMwh),
    electrolysisMw: each((z) => s.zones[z].electrolysisMw),
    p2hMw: each((z) => s.zones[z].p2hMw),
  });
}

export interface Sensitivity { id: "1" | "2" | "3" | "4"; label: string; state: State; gasFloor: number | null; meanFloor: Partial<Record<Boundary, number>> | null; gasGross?: number }

/** The owner's four price pairs of LNG and CO₂ (D-183, 2026-10-27), €/MWh thermal and €/t, in place of the five
 * standard sensitivities of R-APP-11 — slow build, storage, the gas shock, CO₂ at its 2026 price (D-140). */
export const FUEL_CASES: readonly (readonly [number, number])[] = [[30, 80], [45, 95], [60, 120], [75, 150]];

/** The standard sensitivities: the scenario at each of the owner's price pairs of LNG and CO₂, on the same set of
 * years, everything else the headline's — the neighbours' prices too, as published times their levels (D-194). */
export function sensitivities(_p: Presets, s: State): Sensitivity[] {
  if (s.run !== "scenario") return [];
  return FUEL_CASES.map(([gas, eua], i) => ({
    id: String(i + 1) as Sensitivity["id"], label: `LNG ${gas} €/MWh, CO₂ ${eua} €/t`,
    state: { ...s, fuelGas: gas, fuelEua: eua }, gasFloor: null, meanFloor: null,
  }));
}

/** The slow build of the former sensitivity (a) (R-APP-11 until D-183): wind and batteries no higher than the
 * build record supports, the electrolysis of the fleet's preset on or off; the golden fixture keeps a case of it. */
export function slowBuild(p: Presets, s: State, electrolysis: boolean): State {
  const T = String(s.target);
  return {
    ...s,
    zones: each((z): ZoneState => {
      const zs = s.zones[z];
      const d = delivery(p, z);
      const cap = d.years[T];
      const mw = { ...zs.mw };
      if (cap && mw.wind_onshore !== undefined) mw.wind_onshore = Math.min(mw.wind_onshore, cap.wind_onshore_mw.value);
      if (cap && mw.wind_offshore !== undefined) mw.wind_offshore = Math.min(mw.wind_offshore, cap.wind_offshore_mw.value);
      let batteryMwh = zs.batteryMwh;
      if (d.battery_mw && mw.battery !== undefined && mw.battery > d.battery_mw.value) {
        mw.battery = d.battery_mw.value;
        batteryMwh = Math.min(batteryMwh, d.battery_mwh?.value ?? d.battery_mw.value * s.battery.hours);
      }
      const flex = p.fleets[zs.fleet]?.[z]?.[T]?.flex as Record<string, { mw: number }> | undefined;
      return { ...zs, mw, batteryMwh, electrolysisMw: electrolysis ? flex?.electrolysis?.mw ?? 0 : 0 };
    }),
  };
}
