// The scenario's canonical text (R-APP-1, R-APP-10; DECISIONS D-027): `v=3`, then one key=value
// line per entry, keys sorted, defaults included — so a later change of a preset never changes
// what a link means. The same text, UTF-8 and base64url, is the share link's payload (`#s=`).
// Version 2 added the borders' keys (M5, D-032), version 3 the scenario shown and the plant's
// contract (D-036); an older text opens with them at their defaults. A scenario is of 2035 only.
// Import is the trust boundary (v3's lesson): unknown keys are rejected, every value is checked
// against schema/scenario.schema.json, preset and class names against presets.json.

import schema from "../../../schema/scenario.schema.json" with { type: "json" };
import type { Presets } from "../contract/presets.ts";
import { FLEX } from "../engine/build.ts";
import type { ZoneCode } from "../engine/problem.ts";
import { ZONES } from "../engine/problem.ts";
import type { State, ZoneState } from "./model.ts";
import { BOUNDARIES, NONE, OWN, PROFILE_YEARS, STRIKE, UNITS, bidEditable, demandPresets, familyOf, fleetPresets, fuelOf, plannedOn, replayState, whatIf } from "./model.ts";

type Scalar = number | string | boolean;
interface Rule { type?: string; enum?: Scalar[]; const?: Scalar; minimum?: number; maximum?: number; pattern?: string }

const PROPS = schema.properties as Record<string, Rule>;
const PATTERNS = Object.entries(schema.patternProperties as Record<string, Rule>).map(([re, rule]) => ({ re: new RegExp(re), rule }));

/** The largest value the text takes for `key`, so that the panel sets nothing its own share link
 * cannot load (schema/scenario.schema.json); Infinity for a key without one. */
export function maximumOf(key: string): number {
  return (PROPS[key] ?? PATTERNS.find((x) => x.re.test(key))?.rule)?.maximum ?? Infinity;
}

/** The flat map of a state: the keys of its run type only. */
export function toMap(s: State): Record<string, Scalar> {
  const m: Record<string, Scalar> = { v: 3, run: s.run };
  // a what-if per line of the run's kind: a replay's lines are those not planned (R-LINK-4)
  for (const [k, w] of Object.entries(s.links.whatif)) if (s.run === "scenario" || !(k in s.links.on)) m[`line.${k}.whatif`] = w;
  for (const b of BOUNDARIES) m[`${b}.level`] = s.level[b];
  m["FI.slope"] = s.fiSlope;
  m["battery.delta"] = s.battery.delta;
  m["battery.eff"] = s.battery.eff;
  m["battery.cycles"] = s.battery.cycles;
  m["battery.hours"] = s.battery.hours;
  m["kruonis.delta"] = s.kruonisDelta;
  m.mfrr_share = s.mfrrShare;
  m.reserves = s.reserves;
  for (const z of ZONES) {
    m[`${z}.multiplier`] = s.zones[z].multiplier;
    m[`${z}.firm_mw`] = s.zones[z].firmMw;
  }
  if (s.run === "replay") {
    m.year = s.year;
    return m;
  }
  Object.assign(m, { family: s.family, target: s.target, profile: s.profile, fuel: s.fuel, "price.gas": s.fuelGas, "price.eua": s.fuelEua, dsr: s.dsr });
  if (s.profileYear !== s.target) m.profile_year = s.profileYear; // a profile of another target year (D-046); absent = the run's own
  Object.assign(m, { scenario: s.scenario, "smr.clause": s.smr.clause, "smr.strike": s.smr.strike });
  Object.assign(m, { "links.profile": s.links.profile, "links.plan": s.links.plan,
    "links.reserve.EE-LV": s.links.reserve["EE-LV"], "links.reserve.LV-LT": s.links.reserve["LV-LT"] });
  for (const [k, on] of Object.entries(s.links.on)) m[`line.${k}.on`] = on;
  for (const z of ZONES) {
    const zs = s.zones[z];
    Object.assign(m, {
      [`${z}.demand`]: zs.demand, [`${z}.fleet`]: zs.fleet, [`${z}.battery_mwh`]: zs.batteryMwh,
      [`${z}.electrolysis_mw`]: zs.electrolysisMw, [`${z}.p2h_mw`]: zs.p2hMw,
    });
    for (const [c, mw] of Object.entries(zs.mw)) m[`${z}.mw.${c}`] = mw;
    for (const [r, mw] of Object.entries(zs.parts ?? {})) m[`${z}.part.${r}`] = mw; // only once a row was moved (D-059)
  }
  // only once a bid was moved by hand (D-090), and only for a class the zone's fleet has — a
  // scenario button that changes the fleet keeps the bids, which the text then leaves out (E-075);
  // the gas plants' one bid once for the three zones (D-164)
  for (const [k, adj] of Object.entries(s.bids)) {
    if (k === "gas") {
      m["bid.gas"] = adj;
      continue;
    }
    const [z, c] = k.split(".");
    if (Object.hasOwn(s.zones[z as ZoneCode]?.mw ?? {}, c)) m[`bid.${k}`] = adj;
  }
  return m;
}

export function serialize(s: State): string {
  const m = toMap(s);
  const keys = Object.keys(m).filter((k) => k !== "v").sort();
  return ["v=3", ...keys.map((k) => `${k}=${String(m[k])}`)].join("\n") + "\n";
}

function rule(key: string): Rule | null {
  // own properties only: "constructor" is not a key of the text
  return (Object.hasOwn(PROPS, key) ? PROPS[key] : PATTERNS.find((x) => x.re.test(key))?.rule) ?? null;
}

function value(key: string, raw: string, r: Rule): Scalar {
  if (r.const !== undefined) {
    if (Number(raw) !== r.const) throw new Error(`${key}: ${raw} is not ${r.const}`);
    return r.const;
  }
  if (r.enum) {
    const hit = r.enum.find((e) => String(e) === raw);
    if (hit === undefined) throw new Error(`${key}: ${raw} is not one of ${r.enum.join(", ")}`);
    return hit;
  }
  if (r.type === "boolean") {
    if (raw !== "true" && raw !== "false") throw new Error(`${key}: ${raw} is not true or false`);
    return raw === "true";
  }
  if (r.type === "number" || r.type === "integer") {
    const x = raw.trim() === "" ? Number.NaN : Number(raw);
    if (!Number.isFinite(x)) throw new Error(`${key}: ${raw} is not a number`);
    if (r.type === "integer" && !Number.isInteger(x)) throw new Error(`${key}: ${raw} is not an integer`);
    if (r.minimum !== undefined && x < r.minimum) throw new Error(`${key}: ${x} below ${r.minimum}`);
    if (r.maximum !== undefined && x > r.maximum) throw new Error(`${key}: ${x} above ${r.maximum}`);
    return x;
  }
  if (r.pattern && !new RegExp(r.pattern).test(raw)) throw new Error(`${key}: ${raw} is not a valid name`);
  return raw;
}

/** The settings a full run computes: a scenario's without the scenario shown and the strike (the three
 * run together, the strike moves no dispatch), a replay's whole text. The page keys its sets by it, and
 * the build its opening view (D-126). */
export const runKey = (s: State): string => (s.run === "scenario" ? serialize({ ...s, scenario: "gas", smr: { ...s.smr, strike: STRIKE } }) : serialize(s));

/** What one set computes from (R-ENG-1): its settings, a sensitivity's gas floor and boundary floors,
 * less what leaves the engine's input as it is (D-134) — the strike, which moves no dispatch (R-APP-4);
 * the plant's clause in a run without the plant (build.ts reads it under the plant's units, a replay
 * not at all); a gas floor at or under the scenario's gas price (build.ts raises the run's price to the
 * floor only where lower, and a scenario's gas price is the same every hour). Two jobs of one key give
 * one set, to the bit. */
export function jobKey(s: State, gasFloor: number | null, meanFloor: Partial<Record<string, number>> | null): string {
  const plant = s.run === "scenario" && UNITS[s.scenario] > 0;
  const floor = gasFloor !== null && s.run === "scenario" && s.fuelGas >= gasFloor ? null : gasFloor;
  return `${serialize({ ...s, smr: { clause: plant && s.smr.clause, strike: STRIKE } })}|${floor}|${JSON.stringify(meanFloor)}`;
}

/** The map of a text, every key known and every value in range (the schema's part). */
export function fromText(text: string): Record<string, Scalar> {
  if (text.length > 20000) throw new Error("the scenario text is too long");
  const m: Record<string, Scalar> = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const i = t.indexOf("=");
    if (i <= 0) throw new Error(`not key=value: ${t.slice(0, 40)}`);
    const key = t.slice(0, i);
    if (Object.hasOwn(m, key)) throw new Error(`${key} twice`);
    const r = rule(key);
    if (!r) throw new Error(`unknown key ${key.slice(0, 40)}`);
    m[key] = value(key, t.slice(i + 1), r);
  }
  if (m.v !== 1 && m.v !== 2 && m.v !== 3) throw new Error("not a version 1, 2 or 3 scenario");
  return m;
}

/** The state a text describes, checked against the presets (the rest of the trust boundary). */
export function parse(p: Presets, text: string): State {
  const m = fromText(text);
  if (m.run !== "scenario" && m.run !== "replay") throw new Error("run is missing");
  const num = (k: string) => { if (typeof m[k] !== "number") throw new Error(`${k} is missing`); return m[k] as number; };
  const str = (k: string) => { if (typeof m[k] !== "string") throw new Error(`${k} is missing`); return m[k] as string; };
  const bool = (k: string) => { if (typeof m[k] !== "boolean") throw new Error(`${k} is missing`); return m[k] as boolean; };
  const used = new Set(["v", "run"]);
  const take = <T extends Scalar>(k: string, get: (k: string) => T): T => { used.add(k); return get(k); };
  const s = replayState(p, m.run === "replay" ? take("year", num) : 2025);
  s.run = m.run;
  for (const b of BOUNDARIES) s.level[b] = take(`${b}.level`, num);
  s.fiSlope = take("FI.slope", num);
  s.battery = { delta: take("battery.delta", num), eff: take("battery.eff", num), cycles: take("battery.cycles", num), hours: take("battery.hours", num) };
  s.kruonisDelta = take("kruonis.delta", num);
  s.mfrrShare = take("mfrr_share", num);
  used.add("reserves");
  if (typeof m.reserves !== "boolean") throw new Error("reserves is missing");
  s.reserves = m.reserves;
  for (const z of ZONES) {
    s.zones[z].multiplier = take(`${z}.multiplier`, num);
    s.zones[z].firmMw = take(`${z}.firm_mw`, num);
  }
  if (s.run === "scenario") {
    s.family = take("family", str) as State["family"];
    s.target = take("target", num);
    if (s.target !== 2035) throw new Error("the application runs the target year 2035 only (specification revision 1.6)");
    s.profile = take("profile", str) as State["profile"];
    s.profileYear = m.profile_year === undefined ? s.target : take("profile_year", num);
    if (!Object.hasOwn(PROFILE_YEARS, s.profile) || familyOf(s.profile) !== s.family) throw new Error(`profile ${s.profile} is not one of ${s.family === "tyndp2026" ? "NTplus" : "DE, GA, NT, REAL, TIGHT, TIGHTJ"}`);
    if (!PROFILE_YEARS[s.profile].includes(s.profileYear)) throw new Error(`profile ${s.profile} has no year ${s.profileYear} (it has ${PROFILE_YEARS[s.profile].join(", ")})`);
    // the switch of the neighbours' re-priced profile until D-194: a text that names it still reads, as published
    if (m["neighbours.fuel"] !== undefined) used.add("neighbours.fuel");
    s.fuel = take("fuel", str);
    // the two prices the panel sets (D-064); a text without them takes its path's
    const path = fuelOf(p, s.fuel, s.target);
    s.fuelGas = m["price.gas"] === undefined ? path.fuelGas : take("price.gas", num);
    s.fuelEua = m["price.eua"] === undefined ? path.fuelEua : take("price.eua", num);
    s.dsr = take("dsr", str);
    if (s.dsr !== NONE && !Object.hasOwn(p.dsr, s.dsr)) throw new Error(`no DSR preset ${s.dsr}`);
    for (const z of ZONES) s.zones[z] = zoneOf(p, m, z, s, used);
    s.links.on = plannedOn(p, s.target);
    // a bid moved by hand (D-090): a thermal class the zone's fleet has, and the gas plants' one bid
    // once for the three zones (D-164); a text written before it, which moved each zone's gas class,
    // moves the one bid by their offset where every gas class of the three fleets moved alike — a class
    // the text leaves out at 0, as the panel then wrote an untouched box (ERRATA E-162)
    const gas = new Map<string, number>();
    for (const k of Object.keys(m).filter((k) => k.startsWith("bid."))) {
      if (k === "bid.gas") {
        s.bids.gas = take(k, num);
        continue;
      }
      const [, z, c] = k.split(".");
      if (FLEX.has(c) && c in s.zones[z as ZoneCode].mw) {
        gas.set(`${z}.${c}`, take(k, num));
        continue;
      }
      if (!bidEditable(c) || !(c in s.zones[z as ZoneCode].mw)) throw new Error(`${k}: ${c} is not a bid ${z}'s fleet lets a scenario move`);
      s.bids[`${z}.${c}`] = take(k, num);
    }
    if (gas.size) {
      const all = ZONES.flatMap((z) => Object.entries(s.zones[z].mw).filter(([c, x]) => FLEX.has(c) && x > 0).map(([c]) => gas.get(`${z}.${c}`) ?? 0));
      const want = s.bids.gas ?? all[0] ?? 0;
      if (all.some((x) => x !== want) || [...gas.values()].some((x) => x !== want)) throw new Error("the text moves the zones' gas bids apart; the gas plants of the three zones bid one price"); // D-164
      if (want !== 0) s.bids.gas = want;
    }
  }
  if (s.run === "scenario" && m.v === 3) {
    const shown = take("scenario", str);
    s.scenario = (shown === "smr3" ? "smr2" : shown) as State["scenario"]; // a text of before D-343 that shows three units opens on two: the same state, the nearest scenario left
    s.smr = { clause: take("smr.clause", bool), strike: take("smr.strike", num) };
  }
  if (m.v !== 1) {
    for (const k of Object.keys(s.links.whatif)) {
      if (s.run === "replay" && k in s.links.on) continue;
      s.links.whatif[k] = take(`line.${k}.whatif`, str);
      whatIf(s.links.whatif[k], true); // a date that does not exist is rejected here
    }
    if (s.run === "scenario") {
      s.links.profile = take("links.profile", str) as State["links"]["profile"];
      s.links.plan = take("links.plan", bool);
      s.links.reserve = { "EE-LV": take("links.reserve.EE-LV", num), "LV-LT": take("links.reserve.LV-LT", num) };
      for (const k of Object.keys(s.links.on)) s.links.on[k] = take(`line.${k}.on`, bool);
    }
  }
  const extra = Object.keys(m).filter((k) => !used.has(k));
  if (extra.length) throw new Error(`not a key of a ${s.run}: ${extra.slice(0, 3).join(", ")}`);
  return s;
}

function zoneOf(p: Presets, m: Record<string, Scalar>, z: ZoneCode, s: State, used: Set<string>): ZoneState {
  const get = (k: string, type: "number" | "string") => {
    const key = `${z}.${k}`;
    used.add(key);
    if (typeof m[key] !== type) throw new Error(`${key} is missing`);
    return m[key];
  };
  const demand = get("demand", "string") as string;
  if (demand !== OWN && !demandPresets(p, z, s.target).includes(demand)) throw new Error(`${z}: no demand preset ${demand} for ${s.target}`);
  const fleet = get("fleet", "string") as string;
  if (!fleetPresets(p, z, s.target).includes(fleet)) throw new Error(`${z}: no fleet preset ${fleet} for ${s.target}`);
  const mw: Record<string, number> = {};
  for (const k of Object.keys(m).filter((k) => k.startsWith(`${z}.mw.`)).sort()) {
    const c = k.slice(z.length + 4);
    if (!Object.hasOwn(p.classes, c)) throw new Error(`${z}: no class ${c}`);
    used.add(k);
    mw[c] = m[k] as number;
  }
  // the rows of a class made of several (D-059): optional, and they must make the class's MW
  const rows = p.fleets[fleet]?.[z]?.[String(s.target)]?.rows ?? {};
  let parts: Record<string, number> | undefined;
  for (const k of Object.keys(m).filter((k) => k.startsWith(`${z}.part.`)).sort()) {
    const r = k.slice(z.length + 6);
    if (!rows[r]?.cls || typeof m[k] !== "number") throw new Error(`${z}: no row ${r} of ${fleet}`);
    used.add(k);
    (parts ??= {})[r] = m[k] as number;
  }
  for (const c of new Set(Object.keys(parts ?? {}).map((r) => rows[r].cls!))) {
    const sum = Object.keys(parts!).reduce((a, r) => a + (rows[r].cls === c ? parts![r] : 0), 0);
    if (Math.abs(sum - (mw[c] ?? 0)) > 0.5) throw new Error(`${z}: the rows of ${c} make ${sum} MW, not ${mw[c] ?? 0}`);
  }
  return {
    ...(parts ? { parts } : {}),
    demand, fleet, mw, multiplier: s.zones[z].multiplier, firmMw: s.zones[z].firmMw,
    batteryMwh: get("battery_mwh", "number") as number, electrolysisMw: get("electrolysis_mw", "number") as number,
    p2hMw: get("p2h_mw", "number") as number,
  };
}

const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

export function shareHash(text: string): string {
  return `#s=${b64url(new TextEncoder().encode(text))}`;
}

/** The text of a share link's fragment, or null when the fragment carries none. */
export function textOfHash(hash: string): string | null {
  const m = /^#s=([A-Za-z0-9_-]+)$/.exec(hash);
  if (!m) return null;
  const b = atob(m[1].replaceAll("-", "+").replaceAll("_", "/"));
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(b, (c) => c.charCodeAt(0)));
}
