// The left panel (R-APP-1, v4's architecture; R-UI-1 … R-UI-6): run → country switcher → demand
// → fleet → flexibility → fuel and CO2 path → links → the scenario's canonical text. Every
// control has an accessible name, shows its preset value, marks a change in amber and opens its
// sources (R-UI-6). The panel only edits the state; main.ts runs it.

import type { Links } from "../contract/links.ts";
import type { Presets } from "../contract/presets.ts";
import type { PriceInputs } from "../engine/build.ts";
import { CLAUSE_BID, FLEX, THERMAL, bidParts, gasBidParts, pathValue } from "../engine/build.ts";
import type { ZoneCode } from "../engine/problem.ts";
import type { State } from "../state/model.ts";
import type { Inputs } from "../worker/engine.worker.ts";
import type { FleetRow } from "../worker/view.ts";
import type { ScenarioId } from "../state/model.ts";
import { LAND, MAP } from "./basemap.ts";
import { icon } from "./icons.ts";
import { BOUNDARIES, OPENING_EE_MW, OWN, PROFILE_YEARS, S1, SCENARIOS, UNITS, bidEditable, fuelOf, partsOf, existingLines, fleetOf, gasClass, opening, otherProfile, plannedOn, presetLevel, replayState, runsOf, whatIf, withProfile } from "../state/model.ts";
import { maximumOf, serialize, toMap } from "../state/text.ts";
import type { Sources } from "./labels.ts";
import { esc } from "./labels.ts";
import { sourceRow } from "./docs.ts";
import { redraw } from "./redraw.ts";
import { FAMILY, FUEL, PROFILE, describe, fmt } from "./labels.ts";
import { t } from "./i18n.ts";

/** Said of a control moved off its preset, to a screen reader. */
const CHANGED = t(", changed from the preset");
const LIMIT = t("give a limit of 0–9 999 MW and two dates");
const LOADED = t("loaded");

export type Country = ZoneCode | "FI" | "SE4" | "PL";
export const COUNTRIES: Country[] = ["EE", "LV", "LT", "FI", "SE4", "PL"];
const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

interface PanelContext {
  p: Presets;
  sources: Sources;
  state: State;
  country: Country;
  set(next: State, redraw: boolean): void; // a new state (redraw: the panel's structure changed)
  select(c: Country): void;
  fleet?: FleetRow[][] | null; // the latest run's fleet per zone (a replay shows it)
  inputs?: PanelInputs | null; // the latest run's loads and border prices before the sliders
  links?: Links | null; // ERAA 2025's hourly NTC, for the AC lines' capacity on the map
  ref?: Reference | null; // the observed fleets and demand the growth marks compare with (D-052, D-057)
}

/** A set's inputs weighted as its cards (R-TIME-3), with the state they hold for. */
export interface PanelInputs extends Inputs { basis: string }

/** What the inputs depend on; while the state differs here, the hints wait for the next run. */
const basis = (s: State) => [s.run, s.year, s.family, s.target, s.profile, s.profileYear, s.zones.EE.demand, s.zones.LV.demand, s.zones.LT.demand].join("|");

export function setInputs(s: State, set: { weight: number; inputs: Inputs }[]): PanelInputs {
  const w = set.reduce((a, r) => a + r.weight, 0);
  const avg = (f: (i: Inputs) => number) => set.reduce((a, r) => a + r.weight * f(r.inputs), 0) / w;
  return {
    basis: basis(s), hours: avg((i) => i.hours), loadTwh: [0, 1, 2].map((z) => avg((i) => i.loadTwh[z])),
    price: Object.fromEntries(BOUNDARIES.map((b) => [b, avg((i) => i.price[b])])),
  };
}

const fresh = (ctx: PanelContext) => (ctx.inputs && ctx.inputs.basis === basis(ctx.state) ? ctx.inputs : null);

/** The year's demand as the multiplier and the firm block make it (the owner asked, 2026-09-29). */
function twhHint(ctx: PanelContext, z: ZoneCode): string {
  const i = fresh(ctx);
  if (!i) return t("… TWh a year");
  const zs = ctx.state.zones[z];
  const base = i.loadTwh[["EE", "LV", "LT"].indexOf(z)];
  const firm = (zs.firmMw * i.hours) / 1e6;
  return t("{base} TWh × {m}{firm} = {total} TWh a year", { base: fmt(base, 2), m: fmt(zs.multiplier, 2), total: fmt(base * zs.multiplier + firm, 2),
    firm: firm > 0 ? t(" + {twh} TWh constant load ({mw} MW × {h} h)", { twh: fmt(firm, 2), mw: fmt(zs.firmMw, 0), h: fmt(i.hours, 0) }) : "" });
}

/** The border zone's average price as the level factor makes it (the owner asked, 2026-09-29). */
function priceHint(ctx: PanelContext, c: "FI" | "SE4" | "PL"): string {
  const i = fresh(ctx);
  if (!i) return t("average price … €/MWh");
  const lv = ctx.state.level[c];
  return t("average price {p} €/MWh × {lv} = {x} €/MWh", { p: fmt(i.price[c]), lv: fmt(lv, 2), x: fmt(i.price[c] * lv) }) + (c === "FI" && ctx.state.fiSlope > 0 ? t(", before the slope moves it") : "");
}

/** Rewrites the hint of the country shown: after a slider moves and after a run. */
export function refreshHints(root: HTMLElement, ctx: PanelContext): void {
  const c = ctx.country;
  const e = root.querySelector("#h-derived");
  if (e) e.textContent = c === "EE" || c === "LV" || c === "LT" ? twhHint(ctx, c) : priceHint(ctx, c);
  for (const k of COUNTRIES) {
    const h = root.querySelector(`#h-${k}`);
    if (h) h.textContent = k === "EE" || k === "LV" || k === "LT" ? twhHint(ctx, k) : priceHint(ctx, k);
  }
  // the boxes that show a factor as what it makes of the run's figure: demand's TWh, a neighbour's average price
  for (const b of root.querySelectorAll<HTMLInputElement>("input[data-n][data-base]")) {
    if (b === document.activeElement) continue; // typing in it
    const z = b.dataset.n!.split(".")[0];
    const zone = z === "EE" || z === "LV" || z === "LT";
    const base = (zone ? fresh(ctx)?.loadTwh[["EE", "LV", "LT"].indexOf(z)] : fresh(ctx)?.price[z]) ?? null;
    b.dataset.base = base ? String(base) : "";
    b.disabled = !base;
    b.value = boxValue(zone ? ctx.state.zones[z as ZoneCode].multiplier : ctx.state.level[z as "FI" | "SE4" | "PL"], { box: b.dataset.unit as "TWh" | "€/MWh", base });
  }
  for (const g of root.querySelectorAll<HTMLElement>("[data-gr]")) g.outerHTML = growthMark(ctx, g.dataset.gr!);
  for (const g of root.querySelectorAll<HTMLElement>("[data-growth]")) {
    const [z, c] = g.dataset.growth!.split(".");
    g.textContent = sumHint(ctx, z as ZoneCode, c);
  }
  for (const g of root.querySelectorAll<HTMLElement>("[data-total]")) g.textContent = foldMw(ctx, g.dataset.total!);
}

/** What a slider's growth is measured from (D-057): the observed fleets by class (A68), the latest
 * year first — 2026, then 2025 — and the latest full year's demand (2026 holds January–August only). */
export interface Reference {
  fleets: { year: number; cap: Record<ZoneCode, Record<string, number>> }[];
  twh: { year: number; zones: Record<ZoneCode, number> } | null;
}

/** Classes compared as one source: A68 does not split gas or oil shale as a scenario does. */
const family = (c: string) => (c.startsWith("gas_") ? "gas" : c.startsWith("oil_shale") ? "oil_shale" : c);
const FAMILY_LABEL: Record<string, string> = { gas: t("all gas"), oil_shale: t("all oil shale") };

interface Growth { cur: number; base: number; year: number; unit: "MW" | "TWh"; of: string }

/** A slider's value against the latest observed year that has the figure (the owner asked,
 * 2026-10-05): `EE.mw.<class>` against A68's fleet of 2026, else 2025 (whose batteries, which A68
 * did not yet report, are Elering's count); `EE.multiplier` — the demand before the constant load —
 * against the load of 2025. Null: no figure to compare with, or nothing in either year. */
function growthOf(ctx: PanelContext, key: string): Growth | null {
  const [z, kind, c] = key.split(".") as [ZoneCode, string, string];
  const zs = ctx.state.zones[z];
  if (!ctx.ref || !zs) return null;
  if (kind === "multiplier") {
    const load = fresh(ctx)?.loadTwh[["EE", "LV", "LT"].indexOf(z)], t = ctx.ref.twh;
    return load && t?.zones[z] ? { cur: load * zs.multiplier, base: t.zones[z], year: t.year, unit: "TWh", of: "" } : null;
  }
  if (kind !== "mw") return null;
  const fam = family(c), sum = (mw: Record<string, number>) => Object.keys(mw).reduce((a, k) => a + (family(k) === fam ? mw[k] : 0), 0);
  const cur = sum(zs.mw);
  for (const f of ctx.ref.fleets) {
    if (!Object.keys(f.cap[z] ?? {}).length) continue;
    const base = c === "battery" && f.cap[z].battery === undefined && f.year === 2025 ? ctx.p.fleets.elering_vka_2025_actual?.[z]?.["2025"]?.classes.battery?.mw : sum(f.cap[z]);
    if (base === undefined) continue;
    return base || cur ? { cur, base, year: f.year, unit: "MW", of: FAMILY_LABEL[fam] ? `${FAMILY_LABEL[fam]} ${fmt(cur, 0)} MW, ` : "" } : null;
  }
  return null;
}

export const ratio = (r: number) => (r >= 10 ? `×${fmt(r, 0)}` : `${fmt(Math.abs(r - 1) * 100, 0)} %`);

/** The line under the sliders of a class given row by row: the class's MW, their sum (D-059). */
export function sumHint(ctx: PanelContext, z: ZoneCode, c: string): string {
  const fam = family(c), mw = ctx.state.zones[z].mw;
  return `${FAMILY_LABEL[fam] ?? t("sum")} ${fmt(Object.keys(mw).reduce((a, k) => a + (family(k) === fam ? mw[k] : 0), 0), 0)} MW`;
}

/** The mark left of a slider's number box: an arrow and the change from the reference year, green
 * up and red down (D-057). */
export function growthMark(ctx: PanelContext, key: string): string {
  const span = (cls: string, text: string, title: string) => `<span class="gr${cls}" data-gr="${key}"${title ? ` title="${esc(title)}"` : ""}>${text}</span>`;
  // a neighbour's price level: the factor on its profile, marked as generation's growth is (D-068)
  const [zone, kind] = key.split(".");
  if (kind === "level") {
    const lv = ctx.state.level[zone as "FI" | "SE4" | "PL"], base = fresh(ctx)?.price[zone];
    const from = base ? t("the profile's average {p} €/MWh, every hour times {lv}", { p: fmt(base), lv: fmt(lv, 2) }) : t("every hour of the profile times this factor");
    return span(Math.abs(lv - 1) < 0.005 ? "" : lv > 1 ? " up" : " down", `${Math.abs(lv - 1) < 0.005 ? "" : lv > 1 ? "▲ " : "▼ "}×${fmt(lv, 2)}`, from);
  }
  const g = growthOf(ctx, key);
  if (!g) return span("", "", "");
  const from = t("from {year}: {x} {unit}", { year: g.year, x: fmt(g.base, g.unit === "TWh" ? 2 : 0), unit: g.unit });
  if (!g.base) return span(" up", t("▲ new"), from);
  const r = g.cur / g.base;
  if (Math.abs(r - 1) < 0.005) return span("", "0 %", from);
  return span(r > 1 ? " up" : " down", `${r > 1 ? "▲" : "▼"} ${ratio(r)}`, `${g.of}${from}`);
}

const derived = (text: string) => `<div class="hint num" id="h-derived" aria-live="polite">${text}</div>`;

/** What a number typed into a slider's box sets: megawatts, never below the slider's minimum and
 * free above its maximum (the slider grows on the redraw); TWh as the multiplier of `base`, kept
 * within the slider's range. Not a number: the value the slider holds. */
export function typed(text: string, base: number | null, min: number, max: number, held: number, hard = false): number {
  const x = Number(text.replace(",", "."));
  if (text.trim() === "" || !Number.isFinite(x)) return held;
  if (base === null) return Math.min(hard ? max : Infinity, Math.max(min, Math.round(x)));
  return base > 0 ? Math.min(max, Math.max(min, Math.round((x / base) * 1e4) / 1e4)) : held;
}

/** A slider sticks to its preset (the real value) within 2 % of its range, so the way back is easy
 * (the owner's request, D-029). */
export function snap(x: number, preset: number, min: number, max: number): number {
  return Number.isFinite(preset) && Math.abs(x - preset) <= 0.02 * (max - min) ? preset : x;
}

/** A key's step lands on the slider's grid. Where the preset lies off the grid — a neighbour's default level, ×1.8786
 * on steps of 0.01 — the grid's value nearest it is the preset itself, so that a key can come back to it and the sets
 * computed at the build return (ERRATA E-186). */
export function keyStep(x: number, preset: number, step: number): number {
  return Number.isFinite(preset) && Math.abs(x - preset) < step / 2 ? preset : x;
}

/** A slider's fill to its value, the fill bar's (the owner chose design F, 2026-10-21; spikes/slider-designs): main.ts
 * moves it while the slider is dragged. */
export const fill = (v: number, min: number, max: number) => `--p:${((100 * (v - min)) / (max - min || 1)).toFixed(2)}%`;

/** A class's name on the panel: the export's label, but the oil-shale classes by their units (ENTSO-E A95, the same
 * 2020–2026) and every natural-gas class beginning "Natural gas," (the owner asked, 2026-10-21). */
const UNIT_LABEL: Record<string, string> = {
  oil_shale_cfb: "Oil shale, Eesti 8 and Balti 11 (fluidised bed)", oil_shale_pf: "Oil shale, Eesti 3–6 (pulverised firing)",
  gas_ccgt: "Natural gas, combined cycle", gas_chp: "Natural gas, CHP", gas_ocgt: "Natural gas, peaking", gas_conventional: "Natural gas, steam turbine",
};
const classLabel = (p: Presets, c: string) => t(UNIT_LABEL[c] ?? p.classes[c]?.label ?? c);

export const flag = (c: string) => `<span class="fl fl-${c}" aria-hidden="true"></span>`;

const clone = (s: State): State => structuredClone(s);

/** The values a scenario run starts from, for "changed from preset" (R-UI-6). */
function baseline(ctx: MapContext): State {
  const { p, state: s } = ctx;
  const b = s.run === "replay" ? replayState(p, s.year) : opening(p);
  if (s.run === "scenario") {
    b.scenario = s.scenario; // a scenario shown is a choice, not a change from the presets
    b.level = presetLevel(s.profile, s.profileYear); // the profile's default levels, the owner's on DE 2035 (D-190), are no change (D-226)
    for (const z of ["EE", "LV", "LT"] as ZoneCode[]) {
      const f = fleetOf(p, s.zones[z].fleet, z, s.target, s.battery.hours);
      b.zones[z] = { ...b.zones[z], fleet: s.zones[z].fleet, mw: f.mw, batteryMwh: f.batteryMwh, demand: s.zones[z].demand };
    }
  }
  return b;
}

function src(ids: string[] | undefined, what: string, note = ""): string {
  // without sources a note still shows, behind a "?"
  if (!ids?.length) return note ? tip(note) : "";
  return `<button type="button" class="src" data-src="${esc(ids.join(" "))}"${note ? ` data-note="${esc(note)}"` : ""} aria-label="${t("Sources of {what}", { what: esc(what) })}">i</button>`;
}

/** A "?" whose explanation shows on hover and on keyboard focus (D-029). */
export const tip = (text: string, mark = "?") => `<button type="button" class="q" aria-label="${esc(text)}" data-tip="${esc(text)}">${mark}</button>`;

/** What a battery and reserve setting does, in plain words (the owner asked, 2026-09-29); its
 * value and sources stay on the control. */
const TIPS: Record<string, string> = {
  "battery.delta": t("What a battery asks for each MWh it charges, on top of the price: its wear. It charges and discharges only when the price gap between the two hours, after the losses, is larger than this."),
  "battery.eff": t("Of each MWh a battery charges, the share it gives back; the rest is lost. Batteries only: Kruonis's own is shown under its cycle cost."),
  "battery.cycles": t("How many times a day a battery may empty its full store. Batteries only: Kruonis's own limit is shown under its cycle cost."),
  "kruonis.delta": t("The battery cycling cost for Kruonis, Lithuania's pumped-storage plant: what it asks for each MWh it pumps, on top of the price."),
  mfrr_share: t("The grid operators keep power ready for balancing: fast reserve (FCR, aFRR) and manual reserve (mFRR). Batteries hold the fast reserve; this is the share of the manual reserve they hold as well, the rest is held by thermal plants. It matters only while the reserve is held (the box below)."),
  reserves: t("On: the power kept ready for balancing is not offered in the day-ahead market; batteries hold the fast reserve, thermal plants the rest. A validation run holds what was actually procured, from 5 February 2025, the balancing capacity market's first day; a scenario holds the 2026 need."),
};

/** Kruonis's own store, round trip and limit, which no control moves (the owner asked, 2026-09-29;
 * ERRATA E-048). */
function kruonisNote(p: Presets, s: State): string {
  const k = (p.hydro as unknown as { kruonis: Record<"storage_capacity" | "efficiency_round_trip", { value: number; src: string[] }> }).kruonis;
  const cap = p.parameters["battery.cycles_per_day.clean_horizon_assumption"]!;
  const replay = s.run === "replay";
  const ids = [...new Set([...k.storage_capacity.src, ...k.efficiency_round_trip.src, ...(replay ? [] : cap.src ?? [])])];
  return `${t("Kruonis: store {gwh} GWh, round trip {rt} %, ", { gwh: fmt(k.storage_capacity.value, 1), rt: fmt(k.efficiency_round_trip.value * 100, 0) })}${replay ? t("at most its actual output each week") : t("at most {n} cycles a day", { n: fmt(cap.value, 1) })} ${src(ids, t("Kruonis's store, round trip and limit"))}`;
}

/** A slider's value as shown: a fraction whose unit is "%" reads as a percentage (the owner
 * asked, 2026-09-29); the state and the scenario text keep the fraction. */
const shown = (x: number, step: number, unit: string) => (unit === "%" ? `${fmt(x * 100, 0)} %` : `${fmt(x, step < 1 ? 2 : 0)} ${unit}`);

/** A number box at the slider's end (the owner asked, 2026-10-05; D-056): megawatts as they are, or
 * — the demand multiplier — the year's TWh it makes of `base`, the run's load before the multiplier
 * (null until a run has reported it). `cls` marks the row (demand apart from generation). */
interface SliderOpt { box?: "MW" | "TWh" | "€/MWh"; base?: number | null; hard?: boolean; cls?: string; mark?: string; icon?: string; bid?: Bid; readonly?: boolean; flag?: string; aria?: string } // flag: a zone's flag before the label; aria: the controls' name where the label is short; readonly: an observed value, shown as the scenario's are but not movable (D-083) // icon: the key of icons.ts, drawn beside the label and the track; bid: the source's bid, right of them (D-065)

// MW as they are; TWh and €/MWh as the factor times `base` (D-056, D-066); hard: the slider's maximum binds a typed value too
const boxValue = (x: number, o: SliderOpt) => (o.box === "MW" || !o.box ? String(x) : o.base ? (x * o.base).toFixed(o.box === "TWh" ? 2 : 1) : "");

/** The range's knob, 18 px across (theme.css; the owner, 2026-11-02): the preset's line stands under its centre. */
const THUMB = 18;
/** Where a slider's preset line stands for a preset at `share` of the range: the knob travels the track less its own
 * width (THUMB), so its centre is THUMB / 2 + share × (track − THUMB), not share × track (D-198; every slider since
 * E-179). */
export const tickLeft = (share: number) => `calc(${THUMB / 2 - 1}px + (100% - ${THUMB}px) * ${share.toFixed(4)})`;

function slider(key: string, label: string, value: number, preset: number, min: number, max0: number, step: number, unit: string, ids?: string[], hint = "", o: SliderOpt = {}): string {
  const max = Math.min(max0, maximumOf(key)); // the range grows with the value, never past what the text takes
  const changed = Math.abs(value - preset) > 1e-9;
  // the tick stands under the thumb's centre at the preset: the thumb travels the track less
  // its own width (THUMB), so the centre is THUMB / 2 + share × (track − THUMB), not share × track
  const share = max > min ? (preset - min) / (max - min) : 0;
  const big = o.icon ? icon(o.icon, 30) : "";
  // a source's row: its change from the reference year above the slider, its number in a tile (the owner asked, 2026-10-21)
  const val = o.box
    ? `<span class="val num${big ? " tile" : ""}">${big ? "" : o.mark ?? ""}<input type="number" class="nbox num${changed ? " changed" : ""}" id="v-${key}" data-n="${key}" data-unit="${o.box}"${o.readonly ? " disabled" : ""}${o.box !== "MW" ? ` data-base="${o.base ?? ""}"${o.base || o.readonly ? "" : " disabled"} step="${o.box === "TWh" ? 0.01 : 0.1}"` : ` step="${step}"${o.hard ? ' data-hard="1"' : ""}`} min="0" value="${boxValue(value, o)}" aria-label="${esc(o.aria ?? label)}, ${o.box}"> <span class="u">${o.box}</span></span>`
    : `<span class="val num${changed ? " changed" : ""}" id="v-${key}" data-unit="${esc(unit)}">${shown(value, step, unit)}</span>`;
  const name = `<label for="c-${key}">${o.flag ? flag(o.flag) : ""}${esc(label)} ${ids?.length ? src(ids, label, TIPS[key] ?? "") : TIPS[key] ? tip(TIPS[key]) : ""}</label>`;
  return `<div class="row${big ? " ic" : ""}${o.cls ? ` ${o.cls}` : ""}">
    ${big ? `<span class="big">${big}</span><div class="lbl-line">${name}${o.mark ?? ""}</div>` : name}
    ${val}
    <div class="rng"><input type="range" id="c-${key}" data-k="${key}" data-preset="${preset}" min="${min}" max="${max}" step="${step}" value="${value}" style="${fill(value, min, max)}"${o.readonly ? " disabled" : ""} aria-label="${esc(o.aria ?? label)}${unit ? `, ${esc(unit)}` : ""}" aria-valuetext="${shown(value, step, unit)}${changed ? CHANGED : ""}">
      <span class="tick" style="left:${tickLeft(share)}" aria-hidden="true"></span></div>
    ${o.bid ? bidTag(o.bid, key) : ""}${hint ? `<div class="hint">${hint}</div>` : ""}
  </div>`;
}

/** A source's bid as a tag right of its label and track, as tall as the two (the owner asked,
 * 2026-10-05; D-065). */
type Bid = [value: string, title: string, unit?: string, edit?: { key: string; base: number; moved: boolean; value: number }];
/** `edit`: a thermal bid a scenario may move by hand (D-090) — a box holding the bid, `base` the
 * bid the costs give, `moved` once the scenario's offset is not 0. */
const bidTag = ([value, title, unit, edit]: Bid, row = "") => edit
  ? `<span class="bid num${edit.moved ? " changed" : ""}" data-tip="${esc(title)}"><input type="number" class="bid-in num"${row ? ` id="b-${esc(row)}"` : ""} data-bid="${esc(edit.key)}" data-base="${edit.base}" min="0" max="4000" step="1" value="${edit.value}" aria-label="${t("Bid, €/MWh:")} ${esc(title)}"><span>${unit ?? "€/MWh"}</span></span>`
  : `<span class="bid num" tabindex="0" aria-label="${esc(title)}" data-tip="${esc(title)}"><b>${value}</b><span>${unit ?? "€/MWh"}</span></span>`;

/** The offset a typed bid makes against the costs' bid `base` (D-090), or null for none: an empty or
 * unreadable box, or the whole euros the box showed typed back (E-075). Held to 0–4 000 €/MWh and an
 * offset of at least −1 000. */
export function bidOffset(typed: string, base: number): number | null {
  const x = Number(typed.replace(",", "."));
  if (typed.trim() === "" || !Number.isFinite(x)) return null;
  const d = Math.min(4000, Math.max(0, x)) - base;
  return Math.abs(d) <= 0.5 ? null : Math.max(-1000, Math.round(d * 10) / 10);
}

const FUEL_NAME: Record<string, string> = { gas: t("gas"), oil_shale: t("oil shale"), biomass: t("biomass"), uranium: t("uranium") };
/** A thermal bid taken apart, line by line, for its tag's tip (D-089). */
export function bidText(b: NonNullable<ReturnType<typeof bidParts>>): string {
  const lines = [t("Bid {x} €/MWh:", { x: fmt(b.total, 1) })];
  if (b.fuel) lines.push(t("{fuel} {p} €/MWh of fuel ÷ efficiency {e} = {x}", { fuel: FUEL_NAME[b.fuel], p: fmt(b.fuelPrice, 1), e: fmt(b.eff, 2), x: fmt(b.fuelPrice / b.eff, 1) }));
  if (b.tPerMwh) lines.push(`CO₂ ${fmt(b.euaPrice, 1)} €/t × ${fmt(b.tPerMwh, 3)} t/MWh = ${fmt(b.euaPrice * b.tPerMwh, 1)}`);
  lines.push(`${t("running costs")} ${fmt(b.vom, 1)}`);
  if (b.premium) lines.push(`${t("oil-shale premium")} ${fmt(b.premium, 1)}`);
  if (b.adj) lines.push(t("moved by hand {x}: the costs give {c}, and the bid follows them; clear the box to return", { x: `${b.adj > 0 ? "+" : "−"}${fmt(Math.abs(b.adj), 1)}`, c: fmt(b.cost, 1) }));
  return lines.join("\n");
}

/** The gas plants' one bid taken apart for its tip (R-SUP-6, D-164): a combined-cycle plant's costs,
 * the fitted adder, and an offset moved by hand. */
export function gasBidText(b: ReturnType<typeof gasBidParts>): string {
  const lines = [t("Bid {x} €/MWh, the same for every gas plant of Estonia, Latvia and Lithuania: a combined-cycle plant's costs and the adder fitted on 2023–2024", { x: fmt(b.total, 1) })];
  lines.push(t("{fuel} {p} €/MWh of fuel ÷ efficiency {e} = {x}", { fuel: FUEL_NAME.gas, p: fmt(b.fuelPrice, 1), e: fmt(b.eff, 2), x: fmt(b.fuelPrice / b.eff, 1) }));
  lines.push(`CO₂ ${fmt(b.euaPrice, 1)} €/t × ${fmt(b.tPerMwh, 3)} t/MWh = ${fmt(b.euaPrice * b.tPerMwh, 1)}`);
  lines.push(`${t("running costs")} ${fmt(b.vom, 1)}`);
  lines.push(t("fitted adder {x} (R-SUP-6)", { x: fmt(b.adder, 2) }));
  if (b.adj) lines.push(t("moved by hand {x}: the costs give {c}, and the bid follows them; clear the box to return", { x: `${b.adj > 0 ? "+" : "−"}${fmt(Math.abs(b.adj), 1)}`, c: fmt(b.cost + b.adder, 1) }));
  return lines.join("\n");
}

function chips(key: string, label: string, options: string[], value: string, name: (k: string) => string): string {
  return `<div class="segs" role="group" aria-label="${esc(label)}">${options.map((o) =>
    `<button type="button" class="chip" data-set="${key}" data-v="${esc(o)}" aria-pressed="${o === value}">${esc(name(o))}</button>`).join("")}</div>`;
}

/** Scenario or validation as one switch, the two sides named inside it; a press runs the other. */
function runToggle(s: State): string {
  const on = s.run === "replay";
  return `<button type="button" class="tgl" role="switch" aria-checked="${on}" aria-label="${t("Validation")}" data-set="run" data-v="${on ? "scenario" : "replay"}">`
    + `<span class="${on ? "" : "on"}">${t("Scenario")}</span><span class="${on ? "on" : ""}">${t("Validation")}</span></button>`;
}

/** The validation view's run box (the scenario view has its own boxes, D-036). */
function runBox(ctx: PanelContext): string {
  const s = ctx.state;
  return `<section class="box run">${runToggle(s)}
    <h3 class="sub">${t("Observed year")}</h3>${chips("year", t("Observed year"), YEARS.map(String), String(s.year), (y) => y)}</section>`;
}

/** The validation view's zone box: the same "Generation and demand" block as the scenario's (D-083),
 * the observed year's fleet in rows the user cannot move. */
function zoneBoxes(ctx: PanelContext, z: ZoneCode): string {
  const { state: s } = ctx;
  const zs = s.zones[z];
  // the country is chosen in the row above the box, with the borders' (validation shows all six)
  return `<section class="box"><h2>${t("Generation and demand")}</h2>
    <h3 class="sub">${t("Demand")}</h3>
    ${slider(`${z}.multiplier`, t("Multiplier on observed load"), zs.multiplier, 1, 0.5, 2, 0.01, "×", undefined, "", { cls: "dem", icon: "demand" })}
    ${derived(twhHint(ctx, z))}
    ${slider(`${z}.firm_mw`, t("Constant load"), zs.firmMw, 0, 0, 2000, 10, "MW", undefined, "", { cls: "dem", icon: "load" })}
    <h3 class="sub">${t("Generation in {year}", { year: s.year })} ${tip(t("The observed fleet (ENTSO-E A68) at its weekly available maximum, each row's TWh what the model ran; the bids from the year's monthly gas and CO₂ prices and each class's efficiency. Validation keeps the fleet as it was: the rows do not move."))}</h3>
    <div id="replay-fleet">${fleetHtml(ctx, z)}</div></section>`;
}

function boundaryBox(ctx: PanelContext, c: "FI" | "SE4" | "PL"): string {
  const s = ctx.state;
  const slope = c === "FI" ? slider("FI.slope", t("Finnish slope"), s.fiSlope, 0, 0, 20, 0.5, t("€/MWh per GW"), undefined,
    t("0 = the Baltic zones take Finland's price as given; above 0 the price moves with the net flow")) : "";
  return `<section class="box"><h2>${t("{c} at the border", { c })}</h2>
    <p class="note">${t("the observed price")}</p>
    ${slider(`${c}.level`, t("Price level factor"), s.level[c], 1, 0.5, 3, 0.01, "×", undefined,
      t("multiplies every hour's price of {c}", { c }))}
    ${derived(priceHint(ctx, c))}
    ${slope}</section>`;
}

function commonBoxes(ctx: PanelContext): string {
  const { p, state: s } = ctx;
  const b = baseline(ctx);
  const fitted = (p.fitted as { battery_delta?: { EE?: { src?: string[] } } }).battery_delta?.EE?.src;
  const par = (k: string) => p.parameters[k]?.src;
  return `<section class="box"><h2>${t("Batteries and reserve")}</h2>
      ${slider("battery.delta", t("Battery cycling cost Δ"), s.battery.delta, b.battery.delta, 0, 200, 0.5, "€/MWh", fitted)}
      ${slider("battery.eff", t("Round-trip efficiency"), s.battery.eff, b.battery.eff, 0.5, 1, 0.01, "%", par("battery.round_trip_efficiency.clean_horizon_assumption"))}
      ${slider("battery.cycles", t("Cycles per day"), s.battery.cycles, b.battery.cycles, 0.5, 3, 0.1, "", par("battery.cycles_per_day.clean_horizon_assumption"))}
      ${slider("kruonis.delta", t("Kruonis cycle cost"), s.kruonisDelta, b.kruonisDelta, 0, 200, 0.5, "€/MWh", par("battery.cycling_cost_prior_eur_mwh"), kruonisNote(p, s))}
      ${slider("mfrr_share", t("mFRR share held by batteries"), s.mfrrShare, b.mfrrShare, 0, 1, 0.05, "%", fitted)}
      <div class="row chk"><label><input type="checkbox" data-bool="reserves"${s.reserves ? " checked" : ""}> ${t("Hold upward reserve out of the day-ahead market")}</label>${tip(TIPS.reserves)}</div>
    </section>
    ${linksBox(ctx)}`;
}

/** R-LINK-1, R-LINK-3 … R-LINK-5 (D-031, D-032): a scenario year's borders from their lines, and a
 * what-if per line in both kinds of run. */
function linksBox(ctx: PanelContext): string {
  const { p, state: s } = ctx;
  const lineNames = lineKeys(p);
  const defaults = plannedOn(p, s.target);
  return `<section class="box">${linksHead()}${lineMap(ctx, lineNames, defaults)}${whatIfEditor(ctx, lineNames, s.year)}</section>`;
}

/** The limits by dates (R-LINK-4; in the scenario view too since D-148): a line held at most at
 * some MW from one day to another, the year's dates offered from `year`. */
function whatIfEditor(ctx: PanelContext, lineNames: string[], year: number): string {
  const { p, state: s } = ctx;
  const L = p.links.lines;
  const active = lineNames.filter((k) => (s.links.whatif[k] ?? "none") !== "none");
  const dd = (d: string) => `${year}-${d}`;
  // the line, then its cap and dates in one row, the button the box's width; the holds as cards
  return `<div class="wi"><h3 class="sub">${t("Limit a line for some dates")}</h3>
    <label for="wi-line" class="wi-f"><span>${t("Line")}</span><select id="wi-line">${lineNames.map((k) => `<option value="${k}">${esc(t(L[k].name))}</option>`).join("")}</select></label>
    <div class="wi-grid">
      <label for="wi-mw" class="wi-f"><span>${t("At most, MW")}</span><input type="number" id="wi-mw" min="0" max="9999" step="10" value="0"></label>
      <label for="wi-from" class="wi-f"><span>${t("From")}</span><input type="date" id="wi-from" value="${dd("01-01")}" min="${dd("01-01")}" max="${dd("12-31")}"></label>
      <label for="wi-to" class="wi-f"><span>${t("To")}</span><input type="date" id="wi-to" value="${dd("12-31")}" min="${dd("01-01")}" max="${dd("12-31")}"></label>
    </div>
    <button type="button" class="wi-add" data-act="whatif-add">${t("Hold the line")}</button>
    <p class="note" id="wi-msg" role="status"></p>
    ${active.length ? `<ul class="whatifs">${active.map((k) => {
      const [mw, span] = s.links.whatif[k].split("@");
      const [a, b] = span.split("..");
      return `<li><span><b>${esc(t(L[k].name))}</b> ${t("at most {mw} MW", { mw })}, ${a} → ${b}</span><button type="button" data-act="whatif-clear" data-line="${k}" aria-label="${t("Remove the what-if on {line}", { line: esc(t(L[k].name)) })}">×</button></li>`;
    }).join("")}</ul>` : ""}</div>`;
}

// ---------------------------------------------------------------- the lines as v4 drew them

/** v4's map (D-046 … D-049, the B4 artboard): the nodes' places on a 230 × 330 plan. */
// the nodes where they lie (the owner, 2026-10-11): Helsinki, the Baltic countries' middles, southern
// Sweden and Warsaw, north up, the longitudes at 57°N, stretched across the panel's width — Sweden west
// across the sea at the latitude between Latvia and Lithuania, Poland south-west of Lithuania
/** Each zone's node where its lines meet, longitude and latitude, drawn on the land of basemap.ts:
 * FI and SE4 at the cables' landings (Espoo, Nybro), PL at LitPol's (Ełk), the Baltic zones inland. */
const GEO: Record<string, [number, number]> = { FI: [24.6, 60.2], EE: [25.6, 58.75], LV: [25.0, 56.95], LT: [23.9, 55.3], SE4: [15.9, 56.7], PL: [22.4, 53.85] };
const NODE: Record<string, [number, number]> = Object.fromEntries(Object.entries(GEO).map(([k, [lon, lat]]) =>
  [k, [Math.round((lon - MAP.lon0) * MAP.cos * MAP.k), Math.round((MAP.lat1 - lat) * MAP.k)]]));
/** The node whose flag and code stand above it, at the panel's left edge; the others' stand right of theirs. */
const ABOVE = new Set(["SE4"]);
const ENDS: Record<string, [string, string]> = { "EE-FI": ["FI", "EE"], "EE-LV": ["EE", "LV"], "LV-LT": ["LV", "LT"], "LT-SE4": ["SE4", "LT"], "LT-PL": ["PL", "LT"] };
const PAIR: Record<string, string> = { "EE-FI": t("Estonia – Finland"), "EE-LV": t("Estonia – Latvia"), "LV-LT": t("Latvia – Lithuania"), "LT-SE4": t("Lithuania – Sweden (SE4)"), "LT-PL": t("Lithuania – Poland") };
/** A line's state, said in its map title. */
const SWITCH_NAME: Record<string, string> = { on: t("on"), off: t("off"), held: t("held") };
/** The flags in SVG, 30 × 20 (the map cannot use the page's CSS flags); v4's. */
const FLAG_SVG: Record<string, string> = {
  EE: '<rect width="30" height="6.67" fill="#0072CE"/><rect y="6.67" width="30" height="6.67" fill="#000"/><rect y="13.33" width="30" height="6.67" fill="#fff"/>',
  LV: '<rect width="30" height="20" fill="#9E3039"/><rect y="8" width="30" height="4" fill="#fff"/>',
  LT: '<rect width="30" height="6.67" fill="#FDB913"/><rect y="6.67" width="30" height="6.67" fill="#006A44"/><rect y="13.33" width="30" height="6.67" fill="#C1272D"/>',
  FI: '<rect width="30" height="20" fill="#fff"/><rect x="8" width="5" height="20" fill="#002F6C"/><rect y="7.5" width="30" height="5" fill="#002F6C"/>',
  SE4: '<rect width="30" height="20" fill="#006AA7"/><rect x="9" width="4" height="20" fill="#FECC02"/><rect y="8" width="30" height="4" fill="#FECC02"/>',
  PL: '<rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#DC143C"/>',
};
/** A line switched off: a what-if of 0 MW for the whole year (R-LINK-4). */
export const OFF_ALL_YEAR = "0@01-01..12-31";

type Switch = "on" | "off" | "held";
function lineSwitch(s: State, key: string, planned: boolean): Switch {
  if (planned && !s.links.on[key]) return "off";
  const w = s.links.whatif[key] ?? "none";
  return w === "none" ? "on" : w === OFF_ALL_YEAR ? "off" : "held";
}

/** A switch pressed: a planned line goes in or out of service; a line in service goes off for the
 * whole year and back, a held line off. */
export function toggleLine(p: Presets, state: State, key: string): State {
  const s = clone(state);
  const l = p.links.lines[key];
  const st = lineSwitch(s, key, !!l.planned);
  if (st === "off") {
    if (l.planned && !s.links.on[key]) s.links.on[key] = true;
    else s.links.whatif[key] = "none";
  } else if (l.planned) s.links.on[key] = false;
  else s.links.whatif[key] = OFF_ALL_YEAR;
  return s;
}

/** What the run changes on a border's lines, for the border panel: switched off, held, out of service. */
export function borderNote(p: Presets, s: State, code: string): string {
  const out: string[] = [];
  const usual = opening(p).links.on; // a planned line differs from the view's default (D-036)
  for (const [k, l] of Object.entries(p.links.lines)) {
    if (l.border !== code || (l.planned && s.run === "replay")) continue;
    const st = lineSwitch(s, k, !!l.planned);
    const w = s.links.whatif[k] ?? "none";
    if (l.planned && s.links.on[k] !== usual[k]) out.push(s.links.on[k] ? t("{line} in service", { line: t(l.name) }) : t("{line} out of service", { line: t(l.name) }));
    // a planned line out of service as the scenario has it is no what-if (EstLink 3 in 2035)
    else if (st === "off" && !(l.planned && !s.links.on[k])) out.push(t("{line} off for the whole year", { line: t(l.name) }));
    else if (st === "held") out.push(`${t(l.name)} ${t("at most {mw} MW", { mw: w.split("@")[0] })}, ${w.split("@")[1].replace("..", " → ")}`);
  }
  return out.join("; ");
}

/** A line's MW on the map: an HVDC cable's rating (a planned one's ERAA step); an AC group's
 * highest hourly ERAA NTC of the target year without its planned line, which carries the step;
 * null for an AC group in an observed year (its capacity is A31's); a Lithuania–Poland line its MW,
 * as the engine carries it (D-170). */
function lineMw(ctx: MapContext, key: string): number | null {
  const l = ctx.p.links.lines[key];
  if (l.kind === "hvdc" || l.border === "LT-PL") return l.mw?.value ?? null;
  const n = ctx.links?.eraa2025_hourly[l.border];
  if (ctx.state.run === "replay" || !n) return null;
  const max = (y: number) => n.fwd[String(y)].reduce((m, x) => Math.max(m, x), 0);
  if (l.planned) return max(l.planned.eraa_year) - max(l.planned.eraa_before);
  const years = Object.keys(n.fwd).map(Number).sort((a, b) => a - b);
  let ty = years[0];
  for (const y of years) if (y <= ctx.state.target) ty = y;
  const step = Object.values(ctx.p.links.lines).find((x) => x.border === l.border && x.planned)?.planned;
  return step && ty >= step.eraa_year ? max(step.eraa_before) : max(ty);
}

/** The lines in the panel's order, by border along the chain, then by name: a scenario's every line, the planned ones
 * among them; a replay's those that stood then (ERRATA E-197: the deck's map took the replay's). */
export function lineKeys(p: Presets, scenario = false): string[] {
  const L = p.links.lines, order = ["EE-FI", "EE-LV", "LV-LT", "LT-SE4", "LT-PL"];
  return (scenario ? Object.keys(L) : existingLines(p)).sort((a, b) => order.indexOf(L[a].border) - order.indexOf(L[b].border) || L[a].name.localeCompare(L[b].name));
}

/** Whether the Links box shows its map: the reader's choice, kept in this browser. */
let mapShown = (() => { try { return localStorage.getItem("linkMap") !== "hidden"; } catch { return true; } })();
/** The Links box's heading with its map's button. */
function linksHead(): string {
  return `<h2 class="h2-act">${t("Links")}<button type="button" class="link" data-act="map" aria-expanded="${mapShown}">${mapShown ? t("hide the map") : t("show the map")}</button></h2>`;
}

/** The map and a switch per line (the owner asked for v4's panel, 2026-09-29; the capacities into
 * Estonia and into the Baltics taken off and the map stretched across the panel, 2026-10-11). */
/** A line in service's streak (the owner's choice on spikes/line-glow, its C1 at speed 1 and strength 90 %; D-208): a
 * light patch every STREAK_P map units, moving STREAK_P in STREAK_S seconds. */
const STREAK_P = 48, STREAK_S = 48 / 27;
const STREAK_STOPS = [[0, 0], [0.3, 0], [0.5, 0.9], [0.7, 0], [1, 0]].map(([o, a]) => `<stop offset="${o}" stop-color="#fff" stop-opacity="${a}"/>`).join("");
const n2 = (x: number) => Number(x.toFixed(2));

/** A line in service's two streaks, one each way along an edge of its cable, each on the right of its way as on a
 * two-way road (D-208): the gradients for the map's defs and the lines over the cable. */
function streaks(k: string, x1: number, y1: number, x2: number, y2: number, w: number): { defs: string; lines: string } {
  const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const edge = Math.max(0.9, w * 0.38), off = Math.max(0.6, w / 2 - edge / 2);
  let defs = "", lines = "";
  for (const way of [1, -1]) {
    const sx = -uy * off * way, sy = ux * off * way, id = `streak-${k}-${way > 0 ? "f" : "b"}`;
    const mx = way * ux * STREAK_P, my = way * uy * STREAK_P;
    // the gradient's ends moved a period along its way, not its gradientTransform, which Safari draws where it
    // started (E-180)
    const ends = [["x1", x1 + sx, mx], ["y1", y1 + sy, my], ["x2", x1 + sx + ux * STREAK_P, mx], ["y2", y1 + sy + uy * STREAK_P, my]] as const;
    defs += `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" spreadMethod="repeat" ${ends.map(([a, v]) => `${a}="${n2(v)}"`).join(" ")}>${STREAK_STOPS}`
      + ends.map(([a, v, m]) => `<animate attributeName="${a}" from="${n2(v)}" to="${n2(v + m)}" dur="${n2(STREAK_S)}s" repeatCount="indefinite"/>`).join("")
      + `</linearGradient>`;
    lines += `<line x1="${n2(x1 + sx)}" y1="${n2(y1 + sy)}" x2="${n2(x2 + sx)}" y2="${n2(y2 + sy)}" class="streak" stroke="url(#${id})" stroke-width="${n2(edge)}"/>`;
  }
  return { defs, lines };
}

/** What the lines' map is drawn from: the presets, the state and ERAA's hourly NTC. */
export type MapContext = Pick<PanelContext, "p" | "state" | "links">;

/** A source's slider's top: twice its preset, a fifth over its value, at least `least` MW, in hundreds. */
const mwMax = (pre: number, cur: number, least: number) => Math.ceil(Math.max(2 * pre, 1.2 * cur, least) / 100) * 100;
/** A slider as the panel holds it: its value, the preset its red line marks, and its range. */
export interface Knob { label: string; value: number; preset: number; min: number; max: number }
/** A line's switch as the panel shows it, with the line's MW (lineMw). */
export interface Toggle { name: string; on: boolean; mw: number | null; planned: boolean; border: string }
/** The deck's third slide's controls (D-242), as the panel holds them for the state: Estonia's demand, its onshore wind
 * and its solar — each slider's value, preset and range by the panel's own rules — and the switches of the first `n`
 * lines of the panel's list. */
export function panelControls(ctx: MapContext, n = 4): { demand: Knob; sources: Knob[]; gas: Knob; bid: Knob; lines: Toggle[] } {
  const { p, state: s } = ctx, b = baseline(ctx), zs = s.zones.EE, L = p.links.lines;
  const source = (c: string): Knob => {
    const pre = b.zones.EE.mw[c] ?? 0, cur = zs.mw[c] ?? 0;
    return { label: classLabel(p, c), value: cur, preset: pre, min: 0, max: Math.min(mwMax(pre, cur, 2000), maximumOf(`EE.mw.${c}`)) };
  };
  return {
    demand: { label: t("Demand"), value: zs.multiplier, preset: 1, min: 0.5, max: Math.min(2, maximumOf("EE.multiplier")) },
    sources: ["wind_onshore", "solar"].map(source),
    // Estonia's gas plants as one, their classes summed as the panel's gas fold sums them (D-260)
    gas: (() => {
      const sum = (mw: Record<string, number>) => Object.keys(mw).reduce((a, c) => a + (family(c) === "gas" ? mw[c] : 0), 0);
      const pre = sum(b.zones.EE.mw), cur = sum(zs.mw);
      return { label: t("gas plants"), value: cur, preset: pre, min: 0, max: mwMax(pre, cur, 2000) };
    })(),
    // the gas plants' one bid as the panel sets it, against the opening's (D-164; on the deck since D-259)
    bid: (() => {
      const pr = (st: typeof s): PriceInputs => ({ fuelPath: st.fuel, target: st.target, gasFloor: null, gasPrice: st.fuelGas, euaPrice: st.fuelEua });
      const value = gasBidParts(p, pr(s), s.bids.gas ?? 0).total, preset = gasBidParts(p, pr(b), b.bids.gas ?? 0).total;
      return { label: t("Bid"), value, preset, min: 0, max: Math.max(300, 1.5 * value, 1.5 * preset) };
    })(),
    lines: lineKeys(p, s.run === "scenario").slice(0, n).map((k) => ({ name: t(L[k].name), on: lineSwitch(s, k, !!L[k].planned) !== "off", mw: lineMw(ctx, k), planned: !!L[k].planned, border: L[k].border })),
  };
}

/** The lines' map: the land, each line of `keys` on its border, the nodes with their flags. On the deck's second slide
 * (D-240) it is a picture of the lines the state runs with: no switch and no hover, a line switched off left out, and its
 * streaks' gradients named apart from the panel's, which the page holds at the same time. */
export function linesSvg(ctx: MapContext, keys: string[], deck = false, prices?: Record<string, number>): string {
  const { p, state: s } = ctx;
  const L = p.links.lines;
  // none where the reader asked the system for less motion (R-UI-5's spirit; D-208)
  const still = !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let defs = "";
  // the land under the lines: the three modelled zones a shade stronger, drawn last so that their borders show
  // over the neighbours' (D-207)
  let g = [...LAND].sort((a, b) => Number(!!a.home) - Number(!!b.home))
    .map((c) => `<path class="land${c.home ? " home" : ""}" d="${c.d}"><title>${esc(c.name)}</title></path>`).join("");
  for (const code of Object.keys(ENDS)) {
    const mine = keys.filter((k) => L[k].border === code && !(deck && lineSwitch(s, k, !!L[k].planned) === "off"));
    const [a, b] = ENDS[code].map((n) => NODE[n]);
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
    mine.forEach((k, i) => {
      const o = (i - (mine.length - 1) / 2) * 8, nx = (-dy / d) * o, ny = (dx / d) * o;
      const xy = `x1="${a[0] + nx}" y1="${a[1] + ny}" x2="${b[0] + nx}" y2="${b[1] + ny}"`;
      const st = lineSwitch(s, k, !!L[k].planned), w = Number((1.5 + (lineMw(ctx, k) ?? 900) / 300).toFixed(1));
      const sk = st === "on" && !still ? streaks(deck ? `deck-${k}` : k, a[0] + nx, a[1] + ny, b[0] + nx, b[1] + ny, w) : null;
      if (sk) defs += sk.defs;
      g += `<g class="${deck ? "" : "ln "}ln-${st}"${deck ? "" : ` data-switch="${k}"`}><title>${esc(t(L[k].name))}: ${SWITCH_NAME[st]}</title>${deck ? "" : `<line ${xy} class="hit"/>`}<line ${xy} class="cable" stroke-width="${w}"/>${sk?.lines ?? ""}</g>`;
    });
  }
  for (const [k, [x, y]] of Object.entries(NODE)) {
    // the flag and the code right of the node, or above it
    const [fx, fy] = ABOVE.has(k) ? [x - 17, y - 20] : [x + 9, y - 5];
    // the deck's second slide gives each zone's average price after its code, with its unit (D-250, D-251)
    const price = prices?.[k] === undefined ? "" : `<tspan class="price" dx="5">${fmt(prices[k], 0)}</tspan><tspan class="unit" dx="3">€/MWh</tspan>`;
    // a box around a zone's label once it carries its price (the owner, 2026-11-23; D-259): its width estimated from the
    // figures' sizes (code 11 px, price 15 px bold, unit 9 px), then fitted to the drawn text by the page (fitPriceBoxes)
    const box = price ? `<rect x="${fx - 4}" y="${fy - 5}" width="${(18 + k.length * 7.4 + 5 + fmt(prices![k], 0).length * 9.6 + 3 + 29 + 5).toFixed(1)}" height="20" rx="4" class="pbox" data-pbox="${k}"/>` : "";
    g += `<circle cx="${x}" cy="${y}" r="4" class="node"/>${box}<svg x="${fx}" y="${fy}" width="15" height="10" viewBox="0 0 30 20">${FLAG_SVG[k]}<rect x=".25" y=".25" width="29.5" height="19.5" class="edge"/></svg>`
      + `<text x="${fx + 18}" y="${fy + 9}" class="code"${price ? ` data-pbox="${k}"` : ""}>${k}${price}</text>`;
  }
  // with the prices the box moves east to the land's edge (basemap.py's clip) for the eastern units, Estonia's right
  // of its node as the others' (D-251, D-252)
  return `<svg class="lmap" viewBox="${prices ? "12 0 362" : `0 0 ${MAP.w}`} ${MAP.h}" role="img" aria-label="${t("Schematic map of the lines; a line switched off is dashed red, one held for part of the year dashed amber")}">${defs ? `<defs>${defs}</defs>` : ""}${g}</svg>`;
}

/** The map's price boxes fitted to their labels as the browser draws them, 5 units past the text (D-259). */
export function fitPriceBoxes(root: ParentNode): void {
  for (const r of root.querySelectorAll<SVGRectElement>("rect.pbox")) {
    const text = r.parentElement?.querySelector<SVGTextElement>(`text[data-pbox="${r.dataset.pbox}"]`);
    if (!text) continue;
    const b = text.getBBox();
    if (b.width) r.setAttribute("width", (b.x + b.width + 5 - Number(r.getAttribute("x"))).toFixed(1));
  }
}

function lineMap(ctx: PanelContext, keys: string[], defaults: Record<string, boolean>): string {
  const { p, state: s } = ctx;
  const L = p.links.lines;
  // a pair's lines side by side under its name
  let list = "", cur = "";
  for (const k of keys) {
    const l = L[k];
    if (l.border !== cur) {
      if (cur) list += "</div>";
      cur = l.border;
      const [x, y] = cur.split("-");
      list += `<div class="grp">${flag(x)}${flag(y)}${PAIR[cur]}</div><div class="lrow">`;
    }
    const st = lineSwitch(s, k, !!l.planned);
    const mw = lineMw(ctx, k);
    const changed = l.planned ? s.links.on[k] !== defaults[k] || st === "held" : st !== "on";
    const w = s.links.whatif[k] ?? "none";
    // a planned line's years are in its i: ERAA's first year with it, and the TSO's
    const info = l.planned ? src([...new Set([...l.planned.src, ...l.planned.tso.src])], t(l.name),
      t("In ERAA 2025 from {eraa}; the TSO plans it for {tso}.", { eraa: l.planned.eraa_year, tso: l.planned.tso.year })) : "";
    const notes = st === "held" ? `<span class="held">${t("held at {mw} MW", { mw: w.split("@")[0] })}, ${w.split("@")[1].replace("..", " → ")}</span>` : "";
    list += `<div class="lr${changed ? " changed" : ""}"><button type="button" class="swb" role="switch" aria-checked="${st !== "off"}" data-switch="${k}"><span class="sw ${st === "off" ? "off" : "on"}" aria-hidden="true"></span><span class="lname">${esc(t(l.name))}</span></button>`
      + `<div class="lmeta"><span class="lmw${st === "off" ? " off" : ""}">${mw === null ? t("observed") : `${l.planned ? "+" : ""}${fmt(mw, 0)}<span class="abs">MW</span>`}</span>${info}</div>${notes ? `<span class="lnote">${notes}</span>` : ""}</div>`;
  }
  if (cur) list += "</div>";
  return `<div class="lk">${!mapShown ? "" : linesSvg(ctx, keys)}
    <div class="lswitches" role="group" aria-label="${t("Lines")}">${list}</div></div>`;
}

/** The text's lines that differ from the presets and defaults (R-UI-6), as `key=value`. */
export function changes(ctx: PanelContext): string[] {
  const b = toMap(baseline(ctx));
  // what the baseline's text does not carry has a preset all the same: a class the fleet preset
  // lacks is 0 MW, a source row its document's MW (D-059)
  if (ctx.state.run === "scenario") {
    b["neighbours.fuel"] ??= "published";
    for (const z of ["EE", "LV", "LT"] as ZoneCode[]) {
      const zs = ctx.state.zones[z], rows = ctx.p.fleets[zs.fleet]?.[z]?.[String(ctx.state.target)]?.rows ?? {};
      for (const c of Object.keys(zs.mw)) b[`${z}.mw.${c}`] ??= 0;
      for (const r of Object.keys(zs.parts ?? {})) b[`${z}.part.${r}`] ??= rows[r]?.value ?? 0;
    }
    for (const k of Object.keys(ctx.state.bids)) b[`bid.${k}`] ??= 0; // a bid moved by hand (D-090)
  }
  return serialize(ctx.state).trim().split("\n").filter((l) => {
    const i = l.indexOf("=");
    const k = l.slice(0, i);
    return k in b && String(b[k]) !== l.slice(i + 1);
  });
}

function textBox(ctx: PanelContext): string {
  const changed = new Set(changes(ctx));
  const lines = serialize(ctx.state).trim().split("\n").map((l) => (changed.has(l) ? `${l} *` : l));
  return `<section class="box"><h2>${t("The run this panel describes")}</h2>
    <textarea class="text" id="c-text" aria-label="${t("Scenario text; * marks a value changed from its preset")}" spellcheck="false">${esc(lines.join("\n"))}</textarea>
    <div class="buttons"><button type="button" data-act="copy-text">${t("Copy text")}</button><button type="button" data-act="copy-link">${t("Copy share link")}</button><button type="button" data-act="apply-text">${t("Load the text above")}</button></div>
    <p class="note" id="text-msg" role="status"></p></section>`;
}

/** The text box folded at the panel's foot, in a scenario and a replay alike (the owner, 2026-10-11). */
const textFold = (ctx: PanelContext) => `<details class="fold"><summary>${t("Scenario text and share link")}</summary>${textBox(ctx)}</details>`;

// ---------------------------------------------------------------- the scenario view (D-036)

export const SCENARIO_NAME: Record<ScenarioId, string> = { gas: "0 SMR", smr1: "1 SMR", smr2: "2 SMR", smr3: "3 SMR" };
/** The technologies a zone's sliders move; the others keep the preset (D-036). */
const MAIN = ["wind_onshore", "wind_offshore", "solar", "battery"];

/** The scenario chips; once a zone's demand or capacities leave the scenario's presets, none of
 * the four is pressed and "Other" is, until a chip returns the zones to their presets (D-088). */
export function scenarioChips(ctx: PanelContext): string {
  const s = ctx.state;
  const other = s.run === "scenario" && changes(ctx).some((l) => /^(EE|LV|LT)\./.test(l));
  const four = chips("scenario", t("Scenario"), SCENARIOS, other ? "" : s.scenario, (k) => SCENARIO_NAME[k as ScenarioId]);
  return other ? four.replace(/<\/div>$/, `<button type="button" class="chip" aria-pressed="true" title="${t("The zones' demand or capacities differ from the scenario's presets; a scenario chip returns them")}">${t("Other")}</button></div>`) : four;
}

function scenarioBox(ctx: PanelContext): string {
  return `<section class="box run">${runToggle(ctx.state)}
    <h3 class="sub">${t("Energy mix scenarios, 2035")}</h3>${scenarioChips(ctx)}</section>`;
}

/** Elering and TalTech's S1 rows in the document's order of interest: key of the export's `rows`,
 * label, generation group — the names and the order of the sliders of D-059. */
const S1_ROWS: [string, string, string][] = [
  ["wind_onshore", t("Onshore wind"), "wind"], ["solar", t("Solar"), "solar"], ["battery", t("Batteries"), "storage"],
  ["oil_shale", t("Oil shale (Auvere)"), "oil_shale"], ["gas_existing", t("Natural gas, existing"), "gas"],
  ["gas_reserve_procurement", t("Natural gas, reserve procurement"), "gas"], ["gas_restoration", t("Natural gas, distributed restoration tender"), "gas"],
  ["capacity_mechanism", t("Natural gas, future capacity mechanism"), "gas"], ["biomass", t("Biomass"), "bio_waste"], ["waste", t("Waste (Iru)"), "bio_waste"],
  ["hydro_ror", t("Run-of-river hydro"), "hydro"],
];

const FAMILY_NAME: Record<string, string> = { DE: "tyndp2024", GA: "tyndp2024", NT: "tyndp2024", NTplus: "tyndp2026", REAL: "observed", TIGHT: "research", TIGHTJ: "research" };

/** A neighbours' profile as the panel's list names it closed: who made it, its name and year (D-225); the deck's sixth
 * slide names the state's with it (D-259). */
export function profileName(k: string, y: number): string {
  const line = FAMILY_NAME[k] === "observed" ? `${PROFILE[k]} ${y}` : `${FAMILY[FAMILY_NAME[k]] ?? t(FAMILY_NAME[k])} · ${PROFILE[k]} ${y}`;
  return line[0].toUpperCase() + line.slice(1);
}

function neighboursBox(ctx: PanelContext): string {
  const s = ctx.state;
  const other = otherProfile(s);
  // a profile that is no market model's run names the records of its own series
  const own = (ctx.p.boundary as { mean_price?: { scenario: string; target_year: number; src: string[] }[] }).mean_price?.filter((r) => r.scenario === s.profile && r.target_year === s.profileYear).flatMap((r) => r.src) ?? [];
  const research = FAMILY_NAME[s.profile] === "research";
  const ids = s.profile === "REAL" || research ? [...new Set(own)] : s.family === "tyndp2026" ? ["tyndp2026.NTplus_TimeSeriesDashboard"] : runsOf(ctx.p, s).map((r) => `tyndp2024.${s.profile}${s.profileYear}CY${r.label}`);
  // each profile with its average price per neighbour, weighted over its weather years, before the level (D-047)
  const means = (ctx.p.boundary as { mean_price?: { scenario: string; target_year: number; zone: string; value: number }[] }).mean_price ?? [];
  // the zones as flag emoji in the list, whose lines hold text alone (D-049)
  const EMOJI: Record<string, string> = { FI: "🇫🇮", SE4: "🇸🇪", PL: "🇵🇱" };
  const priceOf = (k: string, y: number, z: string) => means.find((r) => r.scenario === k && r.target_year === y && r.zone === z)?.value;
  const mean = (k: string, y: number) => BOUNDARIES.map((z) => { const v = priceOf(k, y, z); return v === undefined ? "" : `${EMOJI[z]} ${fmt(v, 0)}`; }).filter(Boolean).join("  ");
  // every profile the year files hold in one list (D-066; the buttons of D-048 and "Other" of D-046 are gone)
  // closed, the list shows who made the profile, its name and year; open, each line adds the neighbours' averages (D-225)
  const short = profileName;
  const options = (Object.keys(PROFILE_YEARS) as State["profile"][]).flatMap((k) => PROFILE_YEARS[k].map((y) => {
    const sh = esc(short(k, y));
    return `<option value="${k}_${y}"${k === s.profile && y === s.profileYear ? " selected" : ""}>${mean(k, y) ? `${sh} — ${mean(k, y)} €/MWh` : sh}</option>`;
  })).join("");
  // the closed list's own text is transparent and the short line lies over it: a native list says when it opens, not
  // when it closes unchanged, so swapping the options' text would leave the averages behind
  const list = `<h3 class="sub"><label for="c-other">${t("Scenario of the neighbours' prices")}</label></h3><div class="row stack sel-over"><select id="c-other" data-sel="other">${options}</select><span class="sel-short" aria-hidden="true">${esc(short(s.profile, s.profileYear))}</span></div>`;
  const note = s.profile === "REAL"
    ? t("Finland, SE4 and Poland at their day-ahead prices of {year} as they were, hour by hour of that year, the same in each climate year: they do not follow the climate year's weather, as a TYNDP profile does, so a windy Baltic hour may meet a dear neighbour. The Baltic fleets, demand, fuel prices and lines stay those of {target}.", { year: s.profileYear, target: s.target })
    : research
    ? t("Finland, SE4 and Poland in {year} as energiamudel's research on them found them when demand comes and the build lags (case C): {how} of the gas scenario. One series per climate year, frozen at ERAA 2025's fuel prices of 2035 whatever the scenario's: a conditional case, not a forecast.", { year: s.profileYear,
      how: s.profile === "TIGHT" ? t("each country's case as its own research ran it, the others at the profile in force, Finland's coupled with the Baltic states") : t("all three at once, solved together and coupled with the Baltic states") })
    : other
    ? t("Finland, SE4 and Poland from the market model's run of {year}{which}; the Baltic fleets, demand, fuel prices and lines stay those of {target}.", { year: s.profileYear, target: s.target,
      which: s.profile === "NT" ? t(", which exists for the climate year 2009 only") : s.family === "tyndp2026" ? t(", on its own weather scenarios of {year}", { year: s.profileYear }) : t(" for the same weather") })
    : "";
  // each level ends in a box with the average price it makes, to type in as demand's TWh (D-066); its tick and snap
  // stand at the profile's own default, the owner's levels on Distributed Energy 2035 (D-226)
  const COUNTRY: Record<string, string> = { FI: t("Finland"), SE4: t("Sweden's SE4"), PL: t("Poland") };
  const levels = `<h3 class="sub">${t("Price level")}</h3>` + BOUNDARIES.map((c) => slider(`${c}.level`, COUNTRY[c], s.level[c], presetLevel(s.profile, s.profileYear)[c], 0.5, 3, 0.01, "×", undefined, "", { box: "€/MWh", base: fresh(ctx)?.price[c] ?? null, mark: growthMark(ctx, `${c}.level`), flag: c, aria: t("{c} price level", { c }) })).join("")
    // the owner's levels marked as such, as wind's and solar's opening values are (D-193, D-231)
    + (BOUNDARIES.some((c) => presetLevel(s.profile, s.profileYear)[c] !== 1) ? `<div class="hint">${t("the owner's levels for the opening; the profile as published averages {prices} €/MWh", { prices: BOUNDARIES.map((z) => fmt(priceOf(s.profile, s.profileYear, z) ?? NaN, 1)).join(" / ") })}</div>` : "");
  return `<section class="box"><h2>${t("Neighbours' prices")} ${src(ids.filter((i) => ctx.sources.records[i]), t("the neighbours' profile"), note)}</h2>
    ${list}
    ${levels}</section>`;
}

/** The scenario's two prices as boxes to type in (the owner asked, 2026-10-05; D-064): CO₂ and gas,
 * which open at the fuel path's values; the path keeps every other commodity. */
function fuelBox(ctx: PanelContext): string {
  const { p, state: s } = ctx;
  const cell = (key: "eua" | "gas", label: string, unit: string, value: number, max: number) => {
    const pre = pathValue(p, s.fuel, key, s.target), ids = [...new Set(Object.values(p.fuel_paths[s.fuel] ?? {}).flatMap((y) => y[key]?.src ?? []))];
    const changed = Math.abs(value - pre) > 1e-9;
    // the path's value behind the i, the reset beside the box once it differs
    const path = esc(FUEL[s.fuel] ?? s.fuel);
    return `<div class="fuel"><span class="big">${icon(key === "eua" ? "co2" : "gas", 22)}</span><label for="c-fuel.${key}">${label} ${src(ids, t("{what} of {path}", { what: label, path }), `${path}, ${s.target}: ${fmt(pre)} ${unit}`)}</label>
      <span class="num"><input type="number" class="nbox num${changed ? " changed" : ""}" id="c-fuel.${key}" data-fuel="${key}" min="0" max="${max}" step="0.1" value="${Number(value.toFixed(1))}"> ${unit}</span>${changed ? `<button type="button" class="link" data-act="fuel-reset" data-fuel="${key}">${t("reset")}</button>` : ""}</div>`;
  };
  // the gas plants' one bid at the two prices (R-SUP-6, D-164): a combined-cycle plant's costs plus the
  // fitted adder, for every gas plant of the three zones; a box to move it by hand, kept as an offset (D-090)
  const prices: PriceInputs = { fuelPath: s.fuel, target: s.target, gasFloor: null, gasPrice: s.fuelGas, euaPrice: s.fuelEua };
  const g = gasBidParts(p, prices, s.bids.gas ?? 0);
  const bid = `<div class="fuel wide"><span class="big">${icon("gas", 22)}</span><label for="c-gasbid">${t("Gas plants' bid, EE · LV · LT")} ${tip(gasBidText(g))}</label>
      <span class="num"><input type="number" class="nbox num${g.adj ? " changed" : ""}" id="c-gasbid" data-bid="gas" data-base="${g.cost + g.adder}" min="0" max="4000" step="1" value="${Math.round(g.total)}" aria-label="${t("Gas plants' bid, EE · LV · LT")}"> €/MWh</span>${g.adj ? `<button type="button" class="link" data-act="gasbid-reset">${t("reset")}</button>` : ""}</div>`;
  return `<section class="box"><h2>${t("CO₂ and gas prices")}</h2>
    <div class="fuels">${cell("eua", "CO₂", "€/t", s.fuelEua, 1000)}${cell("gas", "LNG", t("€/MWh thermal"), s.fuelGas, 500)}${bid}</div></section>`;
}

/** Estonia's rows folded under one line each (D-204, as the canvas): the oil-shale blocks with retort gas, and gas. */
const foldOf = (z: ZoneCode, c: string) => (z !== "EE" ? null : c.startsWith("oil_shale") || c === "retort_gas" ? "oil_shale" : c.startsWith("gas_") ? "gas" : null);
/** The folds opened, `EE.oil_shale` and `EE.gas`: a fold is closed until opened, and stays as left while the page is open. */
const openFolds = new Set<string>();
/** A fold's megawatts: the sum of its rows. */
function foldMw(ctx: PanelContext, key: string): string {
  const [z, k] = key.split(".") as [ZoneCode, string], mw = ctx.state.zones[z].mw;
  return `${fmt(Object.keys(mw).reduce((a, c) => a + (foldOf(z, c) === k ? mw[c] : 0), 0), 0)} MW`;
}
/** A fold's line: a chevron, the group's name and how many rows it holds, its change from the reference year (`mark`,
 * the family's, D-057) and its megawatts; gas's one bid under it (D-164). */
function foldHtml(ctx: PanelContext, z: ZoneCode, k: string, n: number, mark: string, bid: string, rows: string): string {
  const key = `${z}.${k}`, open = openFolds.has(key);
  return `<div class="sfold${open ? " open" : ""}"><button type="button" class="sfold-head" aria-expanded="${open}" data-fold="${key}">`
    + `<span class="chev" aria-hidden="true"></span><span class="sfold-name">${k === "gas" ? t("Natural gas") : t("Oil shale")}</span>`
    + `<span class="sfold-n">${t("{n} items", { n })}</span>${mark}<b class="num" data-total="${key}">${foldMw(ctx, key)}</b></button>`
    + `${bid ? `<div class="hint sum num">${bid}</div>` : ""}<div class="sfold-rows"${open ? "" : " hidden"}>${rows}</div></div>`;
}

function capacityBox(ctx: PanelContext): string {
  const { p, state: s } = ctx;
  const z: ZoneCode = ctx.country === "LV" || ctx.country === "LT" ? ctx.country : "EE";
  const zs = s.zones[z];
  const b = baseline(ctx).zones[z];
  const f = p.fleets[zs.fleet]?.[z]?.["2035"];
  const gas = gasClass(zs.mw);
  // Estonia: every source its preset's document names gets a slider (the owner asked, 2026-10-05; D-059)
  // with Auvere the oil-shale blocks the validation view shows, at 0 MW where the preset has none (the owner asked, 2026-10-21)
  const core = [...MAIN, ...(z === "EE" ? ["oil_shale_auvere", "oil_shale_cfb", "oil_shale_pf", "retort_gas"] : []), gas];
  // every source the fleet preset's document names gets a slider, in all three zones (D-059, D-069)
  const named = [...new Set(Object.values(f?.rows ?? {}).map((r) => r.cls).filter((c): c is string => !!c && !core.includes(c) && c in zs.mw))];
  const order = z === "EE" ? S1_ROWS.map(([k]) => f?.rows[k]?.cls) : ["biomass_chp", "waste", "hydro_ror", "hydro_daugava", "hydro_ps"];
  const list = [...core, ...named.sort((x, y) => order.indexOf(x) - order.indexOf(y))];
  const unit = p.parameters["smr.bwrx300.net_output_mw"]!.value;
  const units = UNITS[s.scenario];
  // what each source asks for a MWh at the two prices above (`impliedBid`): thermal plants their fuel,
  // CO₂ and running costs, the gas plants their one bid (D-164); wind, solar and run-of-river hydro
  // nothing; a battery no bid of its own but the spread it needs to cycle
  const prices: PriceInputs = { fuelPath: s.fuel, target: s.target, gasFloor: null, gasPrice: s.fuelGas, euaPrice: s.fuelEua };
  // a thermal bid: in a scenario a box the user may type another bid into (D-090), kept as an offset
  const thermalBid = (c: string): Bid => {
    const key = `${z}.${c}`, adj = s.bids[key] ?? 0, b = bidParts(p, prices, c, adj)!;
    // the box holds the bid as a plain number (a thousands space would empty it) and the costs'
    // own bid as its base, the offset's reference even where the bid is held at 0 (E-075)
    return [fmt(b.total, 0), bidText(b), undefined, s.run === "scenario" && bidEditable(c) ? { key, base: b.cost, moved: adj !== 0, value: Math.round(b.total) } : undefined];
  };
  // the plant bids its available power at the market's floor, or under the clause its part above the
  // minimum load at CLAUSE_BID (R-SMR-4, D-150); its running cost stays in the tip
  const plantBid = (): Bid => {
    const run = bidParts(p, prices, "nuclear", 0)!;
    const bid = s.smr.clause ? CLAUSE_BID : p.parameters["market.price_floor_eur_mwh"]!.value;
    return [fmt(bid, 0), `${s.smr.clause ? t("Bid above its minimum load: {b} €/MWh, the negative-price clause; it turns down where wind and solar alone clear at 0.", { b: fmt(bid, 2) })
      : t("Bid at the market's floor, {b} €/MWh: the plant offers all it has available and runs unless the price falls to the floor itself.", { b: fmt(bid, 0) })}\n${t("Its running cost, {x} €/MWh:", { x: fmt(run.total, 1) })}\n${bidText(run).split("\n").slice(1).join("\n")}`];
  };
  const bidOf = (c: string): Bid => (c === "nuclear" ? plantBid() : c === "waste"
    ? [t("given"), t("No bid: a waste plant burns what it is paid to take and runs whatever the price, at its megawatts less the technology's outages"), t("output")]
    : FLEX.has(c)
    ? [fmt(gasBidParts(p, prices, s.bids.gas ?? 0).total, 0), gasBidText(gasBidParts(p, prices, s.bids.gas ?? 0))]
    : THERMAL.has(c)
    ? thermalBid(c)
    // the batteries' figure marked as their cycling cost Δ, the slider's name for it (the owner asked, 2026-11-24)
    : c === "battery" ? [`Δ\u202f${fmt(s.battery.delta, 0)}`, t("No bid of its own: the price spread a battery needs before it cycles, per MWh charged")]
    : c === "hydro_ps" ? [fmt(s.kruonisDelta, 0), t("No bid of its own: the price spread Kruonis needs before it cycles, per MWh pumped")]
    : c === "hydro_daugava" ? [t("water"), t("No bid of its own: the week's water is placed in the dearest hours, so its price is the price of the hour it displaces"), t("value")]
      : ["0", t("Offered at 0 €/MWh: no fuel; it is curtailed only when the price is zero")]);
  // the plant first among Estonia's sources (the owner asked, 2026-10-05; D-058): the scenario shown, by its units
  const smr = z !== "EE" ? "" : `<div class="row ic"><span class="big">${icon("nuclear", 30)}</span><span class="lbl">${t("SMR units")} ${src(p.parameters["smr.bwrx300.net_output_mw"]!.src, t("the unit's output in the model"), t("BWRX-300, {mw} MW a unit, added to the scenario's fleet: the four scenarios share one base and differ only in their units. Choosing a scenario returns the demand and capacity sliders to its presets. All four cases are computed together.", { mw: fmt(unit, 0) }))}</span><span class="val num tile"><b>${fmt(units * unit, 0)}</b><span class="u">MW</span></span>
    ${bidTag(bidOf("nuclear"))}<div class="rng">${chips("scenario", t("SMR units"), SCENARIOS, s.scenario, (k) => String(UNITS[k as ScenarioId]))}</div>
    </div>`;
  const label = (row: string) => S1_ROWS.find(([k]) => k === row)?.[1] ?? row.replaceAll("_", " ");
  const each = list.map((c): [html: string, n: number] => {
    const pre = b.mw[c] ?? 0, cur = zs.mw[c] ?? 0;
    const floor = MAIN.includes(c) || c === gas || c.startsWith("oil_shale") ? 2000 : 500;
    const max = mwMax;

    // a class the source gives in several rows gets a slider per row (D-059); the class's MW is their sum
    const parts = z === "EE" ? partsOf(p, zs, z, c) : null; // ERAA's several rows of solar stay one slider (D-069)
    if (parts) {
      const at = (r: string) => { const i = S1_ROWS.findIndex(([k]) => k === r); return i < 0 ? S1_ROWS.length : i; };
      const ps = Object.entries(parts).sort(([x], [y]) => at(x) - at(y));
      // the rows' sum under them, unless a fold's line carries it (D-204)
      return [ps.map(([r, mw]) => {
        const row = f!.rows[r];
        return slider(`${z}.part.${r}`, label(r), Math.round(mw), row.value, 0, max(row.value, mw, 500), 1, "MW", row.src, "", { box: "MW", icon: r, bid: bidOf(c) });
      }).join("") + (foldOf(z, c) ? "" : `<div class="hint sum"><span class="num" data-growth="${z}.${c}">${sumHint(ctx, z, c)}</span> ${growthMark(ctx, `${z}.mw.${c}`)}</div>`), ps.length];
    }
    // Estonia's run-of-river hydro has no more to build: the preset's MW is the ceiling (the owner, 2026-10-05; D-066)
    const hard = z === "EE" && c === "hydro_ror", shale = z === "EE" && c.startsWith("oil_shale");
    // the owner's opening values in place of S1's (D-182): the source stays S1's, its figure in the note
    const owners = z === "EE" && zs.fleet === S1 && s.target === 2035 && c in OPENING_EE_MW && f?.classes[c] ? t("the owner's value for the opening (in place of Elering and TalTech's S1: {mw} MW)", { mw: fmt(f.classes[c].mw, 0) }) : "";
    // the oil-shale blocks' change from the reference year once, for all of them, on their fold's line (D-204)
    return [slider(`${z}.mw.${c}`, classLabel(p, c), cur, pre, 0, hard ? Math.max(pre, cur) : max(pre, cur, floor), 1, "MW", f?.classes[c]?.src, hard ? t("at most {mw} MW", { mw: fmt(pre, 0) }) : c === "hydro_daugava" ? t("the week's water and the record's band bound its output: megawatts matter only where they are the lower limit") : owners, { box: "MW", hard, mark: shale ? undefined : growthMark(ctx, `${z}.mw.${c}`), icon: c, bid: bidOf(c) }), 1];
  });
  // Estonia's oil shale and its gas, four rows each, fold under a line each (D-204); a group of one row stays a row
  let rows = "";
  for (let i = 0; i < list.length; i++) {
    const k = foldOf(z, list[i]);
    let j = i;
    while (k && j + 1 < list.length && foldOf(z, list[j + 1]) === k) j++;
    const inner = each.slice(i, j + 1).map(([h]) => h).join(""), n = each.slice(i, j + 1).reduce((a, [, m]) => a + m, 0);
    rows += k && n > 1 ? foldHtml(ctx, z, k, n, growthMark(ctx, `${z}.mw.${k === "gas" ? gas : "oil_shale_pf"}`), k === "gas" ? `${t("bid")} ${bidOf(gas)[0]} €/MWh` : "", inner) : inner;
    i = j;
  }
  const kept = Object.keys(zs.mw).filter((c) => !list.includes(c) && zs.mw[c] > 0).sort()
    .map((c) => `${classLabel(p, c).toLowerCase()} ${fmt(zs.mw[c], 0)} MW`);
  const d = zs.demand === OWN ? null : (p.demand[zs.demand]?.[z] as Record<string, Record<string, { src: string[] }>> | undefined)?.["2035"];
  return `<section class="box"><h2>${t("Generation and demand")}</h2>
    <div class="segs wide" role="group" aria-label="${t("Zone")}">${(["EE", "LV", "LT"] as ZoneCode[]).map((k) =>
      `<button type="button" class="seg" data-country="${k}" aria-pressed="${k === z}">${flag(k)}${k}</button>`).join("")}</div>
    <h3 class="sub">${t("Demand")}</h3>
    ${slider(`${z}.multiplier`, t("Demand"), zs.multiplier, 1, 0.5, 2, 0.01, "×", d?.twh?.src, "", { box: "TWh", base: fresh(ctx)?.loadTwh[["EE", "LV", "LT"].indexOf(z)] ?? null, cls: "dem", mark: growthMark(ctx, `${z}.multiplier`), icon: "demand" })}
    ${slider(`${z}.firm_mw`, t("Constant load (e.g. data centres)"), zs.firmMw, 0, 0, Math.max(2000, Math.ceil(zs.firmMw * 1.2 / 100) * 100), 10, "MW", undefined, "", { box: "MW", cls: "dem", icon: "load" })}
    <div class="hint num" id="h-${z}" aria-live="polite">${twhHint(ctx, z)}</div>
    <h3 class="sub">${t("Generation")}</h3>
    ${smr}
    ${rows}
    <p class="note">${kept.length ? t("Kept as the preset: {list}.", { list: kept.join(", ") }) : ""}</p></section>`;
}

function scenarioLinks(ctx: PanelContext): string {
  const keys = lineKeys(ctx.p, true);
  return `<section class="box">${linksHead()}${lineMap(ctx, keys, opening(ctx.p).links.on)}${whatIfEditor(ctx, keys, ctx.state.target)}</section>`;
}

export function renderPanel(root: HTMLElement, ctx: PanelContext): void {
  // a redraw keeps what the reader was doing: the focused control, the open fold, text typed but not loaded
  const open = root.querySelector("details.fold")?.hasAttribute("open");
  const ta = root.querySelector<HTMLTextAreaElement>("#c-text");
  const typed = ta && ta.value !== ta.defaultValue ? ta.value : null;
  redraw(root, panelHtml(ctx));
  // the map's streaks go on where they were, not from their start: a new map's clock set to the page's (D-208)
  root.querySelector<SVGSVGElement>("svg.lmap")?.setCurrentTime((performance.now() / 1000) % STREAK_S);
  if (open) root.querySelector("details.fold")?.setAttribute("open", "");
  const fresh = root.querySelector<HTMLTextAreaElement>("#c-text");
  if (fresh && typed !== null) fresh.value = typed;
  applyFold(root);
}

/** Off the Model view the panel's boxes fold to their headings, the run's box open (D-197): a chevron button
 * closes each heading and opens its box; the boxes the reader opened, by their heading's text, stay open
 * across redraws. The panel is `folded` while another view shows (main.ts `show`). */
const openBoxes = new Set<string>();
const boxKey = (h: Element) => h.childNodes[0]?.textContent?.trim() ?? "";
export function applyFold(root: HTMLElement): void {
  const on = root.classList.contains("folded");
  for (const h of root.querySelectorAll<HTMLElement>(":scope > .box:not(.run) > h2")) {
    const open = openBoxes.has(boxKey(h));
    h.parentElement!.classList.toggle("open", on && open);
    let b = h.querySelector<HTMLButtonElement>(":scope > .fold-btn");
    if (!on) { b?.remove(); continue; }
    if (!b) {
      b = document.createElement("button");
      b.type = "button";
      b.className = "fold-btn";
      b.setAttribute("aria-label", boxKey(h));
      h.append(b);
    }
    b.setAttribute("aria-expanded", String(open));
  }
}

export function panelHtml(ctx: PanelContext): string {
  if (ctx.state.run === "scenario") {
    return `${scenarioBox(ctx)}${neighboursBox(ctx)}${fuelBox(ctx)}${capacityBox(ctx)}${scenarioLinks(ctx)}${textFold(ctx)}`;
  }
  const c = ctx.country;
  const zone = c === "EE" || c === "LV" || c === "LT";
  return `${runBox(ctx)}
    <div class="segs wide" role="group" aria-label="${t("Country")}">${COUNTRIES.map((k) =>
      `<button type="button" class="seg" data-country="${k}" aria-pressed="${k === c}">${flag(k)}${k}</button>`).join("")}</div>
    ${zone ? zoneBoxes(ctx, c) : boundaryBox(ctx, c)}
    ${commonBoxes(ctx)}
    ${textFold(ctx)}`;
}

/** Wires the panel's events once; `ctx()` gives the current context. */
export function bindPanel(root: HTMLElement, ctx: () => PanelContext, onText: (text: string) => string | null, onCopy: (what: "text" | "link") => Promise<string>): void {
  // a folded box opens and closes from its heading or its chevron; the heading's own buttons keep their work
  root.addEventListener("click", (e) => {
    const el = e.target as HTMLElement;
    const h = el.closest<HTMLElement>(".box:not(.run) > h2");
    if (!h || !root.classList.contains("folded") || (el.closest("button") && !el.closest(".fold-btn"))) return;
    const k = boxKey(h);
    if (!openBoxes.delete(k)) openBoxes.add(k);
    applyFold(root);
  });
  // a fold of Estonia's oil shale or gas opens and closes in place (D-204)
  root.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-fold]");
    if (!b) return;
    const k = b.dataset.fold!, open = !openFolds.delete(k);
    if (open) openFolds.add(k);
    b.setAttribute("aria-expanded", String(open));
    b.parentElement!.classList.toggle("open", open);
    b.parentElement!.querySelector<HTMLElement>(":scope > .sfold-rows")!.hidden = !open;
  });
  // the snap to the preset helps a pointer; a key moves exactly one step (WCAG 2.1.1)
  let keyed = false;
  root.addEventListener("keydown", (e) => { if ((e.target as HTMLElement).matches?.('input[type="range"]')) keyed = true; });
  root.addEventListener("pointerdown", () => { keyed = false; });
  root.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement;
    if (!t.dataset.k) return;
    const x = keyed ? keyStep(Number(t.value), Number(t.dataset.preset), Number(t.step)) : snap(Number(t.value), Number(t.dataset.preset), Number(t.min), Number(t.max));
    if (String(x) !== t.value) t.value = String(x);
    const k = t.dataset.k;
    const next = clone(ctx().state);
    setNumber(next, k, x, ctx().p);
    const v = root.querySelector<HTMLElement>(`#v-${CSS.escape(k)}`);
    if (v) {
      const changed = x !== Number(t.dataset.preset);
      if (v instanceof HTMLInputElement) {
        v.value = boxValue(x, { box: v.dataset.unit as "MW" | "TWh" | "€/MWh", base: Number(v.dataset.base) || null });
        t.setAttribute("aria-valuetext", `${v.value} ${v.dataset.unit}${changed ? CHANGED : ""}`);
      } else {
        v.textContent = shown(x, Number(t.step), v.dataset.unit ?? "");
        t.setAttribute("aria-valuetext", v.textContent + (changed ? CHANGED : ""));
      }
      v.classList.toggle("changed", changed);
    }
    ctx().set(next, false);
    refreshHints(root, ctx());
  });
  root.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement | HTMLSelectElement;
    const c = ctx();
    if (t instanceof HTMLInputElement && t.dataset.fuel) { // a price typed into its box (D-064)
      const x = Number(t.value.replace(",", ".")), next = clone(c.state);
      if (t.value.trim() !== "" && Number.isFinite(x)) next[t.dataset.fuel === "gas" ? "fuelGas" : "fuelEua"] = Math.min(Number(t.max), Math.max(0, x));
      c.set(next, true);
      return;
    }
    if (t instanceof HTMLInputElement && t.dataset.bid) { // a bid typed by hand (D-090): kept as the offset to the costs
      const next = clone(c.state), adj = bidOffset(t.value, Number(t.dataset.base));
      if (adj === null) delete next.bids[t.dataset.bid];
      else next.bids[t.dataset.bid] = adj;
      c.set(next, true);
      return;
    }
    if (t instanceof HTMLInputElement && t.dataset.n) { // a number typed into a slider's box (D-056)
      const range = root.querySelector<HTMLInputElement>(`#c-${CSS.escape(t.dataset.n)}`)!;
      const next = clone(c.state);
      setNumber(next, t.dataset.n, Math.min(maximumOf(t.dataset.n), typed(t.value, t.dataset.unit !== "MW" ? Number(t.dataset.base) : null, Number(range.min), Number(range.max), Number(range.value), t.dataset.hard === "1")), c.p);
      c.set(next, true);
      return;
    }
    if (t instanceof HTMLInputElement && t.dataset.k) { c.set(c.state, true); return; } // redraw marks after a drag
    if (t instanceof HTMLSelectElement && t.dataset.sel === "other" && t.value) c.set(choose(c, "other", t.value), true);
    if (t instanceof HTMLInputElement && t.dataset.bool === "reserves") c.set({ ...clone(c.state), reserves: t.checked }, true);
  });
  root.addEventListener("click", async (e) => {
    const sw = (e.target as Element).closest("[data-switch]");
    if (sw) { const c = ctx(); c.set(toggleLine(c.p, c.state, sw.getAttribute("data-switch")!), true); return; }
    const t = (e.target as HTMLElement).closest("button");
    if (!t) return;
    const c = ctx();
    if (t.dataset.country) { c.select(t.dataset.country as Country); return; }
    if (t.dataset.src) { showSources(t, c.sources, t.dataset.src.split(" ")); return; }
    if (t.dataset.act === "map") {
      mapShown = !mapShown;
      try { localStorage.setItem("linkMap", mapShown ? "shown" : "hidden"); } catch { /* storage refused: the choice lasts the page */ }
      renderPanel(root, c);
      return;
    }
    if (t.dataset.set) { c.set(choose(c, t.dataset.set, t.dataset.v!), true); return; }
    if (t.dataset.act === "gasbid-reset") { // the gas plants' one bid back to its costs (D-164)
      const n = clone(c.state);
      delete n.bids.gas;
      c.set(n, true);
      return;
    }
    if (t.dataset.act === "fuel-reset") {
      const k = t.dataset.fuel === "gas" ? "fuelGas" : "fuelEua";
      c.set({ ...clone(c.state), [k]: fuelOf(c.p, c.state.fuel, c.state.target)[k] }, true);
      return;
    }
    if (t.dataset.act === "whatif-add" || t.dataset.act === "whatif-clear") {
      const n = clone(c.state);
      if (t.dataset.act === "whatif-clear") n.links.whatif[t.dataset.line!] = "none";
      else {
        const v = (id: string) => (root.querySelector(`#${id}`) as HTMLInputElement).value;
        const mw = Math.round(Number(v("wi-mw")));
        const md = (d: string) => d.slice(5); // YYYY-MM-DD → MM-DD
        const w = `${mw}@${md(v("wi-from"))}..${md(v("wi-to"))}`;
        const out = root.querySelector("#wi-msg");
        try {
          if (!(mw >= 0 && mw <= 9999) || !v("wi-from") || !v("wi-to")) throw new Error(LIMIT);
          whatIf(w, true);
        } catch (e) {
          if (out) out.textContent = (e as Error).message;
          return;
        }
        n.links.whatif[v("wi-line")] = w;
      }
      c.set(n, true);
      return;
    }
    if (t.dataset.act === "apply-text") {
      const ta = root.querySelector<HTMLTextAreaElement>("#c-text")!;
      ta.defaultValue = ta.value; // loaded, the text is the panel's: the redraw shows the new state's
      const err = onText(ta.value.replace(/ \*$/gm, ""));
      const msg = root.querySelector("#text-msg"); // after the load, which redraws the panel
      if (msg) msg.textContent = err ?? LOADED;
    } else if (t.dataset.act === "copy-text" || t.dataset.act === "copy-link") {
      const msg = root.querySelector("#text-msg");
      if (msg) msg.textContent = await onCopy(t.dataset.act === "copy-text" ? "text" : "link");
    }
  });
}

function setNumber(s: State, k: string, x: number, p: Presets): void {
  const [a, b, c] = k.split(".");
  if (a === "EE" || a === "LV" || a === "LT") {
    const zs = s.zones[a];
    if (b === "mw") {
      if (c === "battery" && s.run === "scenario") zs.batteryMwh = Math.min(maximumOf(`${a}.battery_mwh`), x * (zs.mw.battery ? zs.batteryMwh / zs.mw.battery : s.battery.hours));
      zs.mw[c] = x;
    }
    else if (b === "part") { // a source row of a class made of several: the class is their sum (D-059)
      const cls = p.fleets[zs.fleet]?.[a]?.["2035"]?.rows[c]?.cls;
      const parts = cls ? partsOf(p, zs, a, cls) : null;
      if (cls && parts) {
        zs.parts = { ...zs.parts, ...Object.fromEntries(Object.entries(parts).map(([r, v]) => [r, Math.round(v)])), [c]: x };
        zs.mw[cls] = Object.keys(parts).reduce((sum, r) => sum + zs.parts![r], 0);
        // back at the document's rows: the state is the preset's again, and the text without them
        const rows = p.fleets[zs.fleet]![a]!["2035"]!.rows;
        if (Object.keys(parts).every((r) => zs.parts![r] === rows[r]?.value)) {
          for (const r of Object.keys(parts)) delete zs.parts[r];
          if (!Object.keys(zs.parts).length) delete zs.parts;
        }
      }
    }
    else if (b === "multiplier") zs.multiplier = x;
    else if (b === "firm_mw") zs.firmMw = x;
  } else if (b === "level" && (BOUNDARIES as string[]).includes(a)) s.level[a as "FI" | "SE4" | "PL"] = x;
  else if (k === "FI.slope") s.fiSlope = x;
  else if (a === "battery") s.battery[b as "delta" | "eff" | "cycles" | "hours"] = x;
  else if (k === "kruonis.delta") s.kruonisDelta = x;
  else if (k === "mfrr_share") s.mfrrShare = x;
}

/** A chip: the new state, keeping what the user changed where it still applies. Choosing a
 * scenario returns every zone's demand and capacities to the scenario's presets (the owner,
 * D-081); the neighbours, fuel, links and storage settings stay. */
export function choose(ctx: PanelContext, key: string, v: string): State {
  const { p } = ctx;
  const s = clone(ctx.state);
  if (key === "run") return v === "replay" ? { ...replayState(p, s.year), run: "replay" } : opening(p);
  if (key === "year") return { ...s, year: Number(v) };
  // the zones return to the scenario's presets with the family's demand: TYNDP 2026's own under
  // National Trends+ of the run's year (E-076)
  if (key === "scenario") { s.scenario = v as ScenarioId; if (s.run === "scenario") s.zones = withProfile({ ...s, zones: opening(p).zones }, s.profile, s.profileYear).zones; }
  else if (key === "other") { const [k, y] = v.split("_"); return withProfile(s, k as State["profile"], Number(y)); }
  return s;
}

function showSources(anchor: HTMLElement, sources: Sources, ids: string[]): void {
  document.querySelector(".pop")?.remove();
  const pop = document.createElement("div");
  pop.className = "pop";
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-label", t("Sources"));
  pop.innerHTML = `${anchor.dataset.note ? `<p>${esc(anchor.dataset.note)}</p>` : ""}<strong>${t("Sources")}</strong><ul>${ids.map((id) => {
    const d = describe(sources, id);
    const row = sourceRow(sources, id);
    return `<li>${d.url ? `<a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.text)}</a>` : esc(d.text)}${row ? ` · <a href="#" data-goto="${esc(row)}">${t("in Sources")}</a>` : ""}</li>`;
  }).join("")}</ul>`;
  const r = anchor.getBoundingClientRect();
  pop.style.left = `${Math.max(8, Math.min(window.innerWidth - 400, r.left) + window.scrollX)}px`;
  pop.style.top = `${r.bottom + window.scrollY + 4}px`;
  pop.tabIndex = -1;
  closeSources();
  document.body.append(pop);
  pop.focus();
  const drop = () => {
    pop.remove();
    document.removeEventListener("click", close, true);
    document.removeEventListener("keydown", close, true);
    if (closeOpen === drop) closeOpen = null;
  };
  const close = (e: Event) => {
    if (e instanceof KeyboardEvent && e.key !== "Escape") return;
    if (e.type === "click" && pop.contains(e.target as Node)) return;
    const inside = pop.contains(document.activeElement);
    drop();
    if (inside || e instanceof KeyboardEvent) anchor.focus();
  };
  closeOpen = drop;
  setTimeout(() => { document.addEventListener("click", close, true); document.addEventListener("keydown", close, true); });
}

let closeOpen: (() => void) | null = null;
/** Closes the sources popup that is open, its listeners with it (the "in Sources" link). */
export function closeSources(): void {
  closeOpen?.();
}


/** The observed year's fleet as the scenario's generation rows (D-083): a row per class in the
 * scenario's order, its installed MW on a slider that does not move, the bid tag the run gave
 * it, and under it the TWh the model ran. */
export function fleetHtml(ctx: PanelContext, z: ZoneCode): string {
  const rows = ctx.fleet?.[["EE", "LV", "LT"].indexOf(z)];
  if (!rows) return `<p class="note">${t("computing…")}</p>`;
  const order = [...MAIN, "gas", "oil_shale", "biomass", "waste", "hydro_ror", "hydro_daugava", "hydro_ps"];
  const at = (c: string) => { const i = order.findIndex((k) => c === k || c.startsWith(`${k}_`)); return i < 0 ? order.length : i; };
  const tag = (r: FleetRow): [string, string, string?] => r.bid !== null
    ? [fmt(r.bid, 0), r.kind === "reservoir" ? t("The water value: the price of the hour the Daugava's water displaces, in each week's first day-ahead window") : t("The bid: fuel, CO₂ and running costs at the year's monthly prices, the gas plants' one bid a combined-cycle plant's costs plus the fitted adder; the hours' average of the class's lowest bid"), r.kind === "reservoir" ? t("water") : undefined]
    : r.kind === "given" ? [t("given"), t("No bid: the observed hourly output is taken as it was"), t("output")]
    : r.kind === "storage" ? [r.cls === "battery" ? `Δ\u202f${fmt(ctx.state.battery.delta, 0)}` : fmt(ctx.state.kruonisDelta, 0), t("No bid of its own: the price spread it needs before it cycles")]
    : [t("water"), t("No bid of its own: the week's water is placed in the dearest hours"), t("value")];
  return [...rows].sort((a, b) => at(a.cls) - at(b.cls) || a.cls.localeCompare(b.cls)).map((r) => {
    const mw = r.installedMw ?? 0;
    return slider(`${z}.fleet.${r.cls}`, classLabel(ctx.p, r.cls), mw, mw, 0, Math.max(100, Math.ceil(mw * 1.2 / 100) * 100), 1, "MW", undefined,
      `${r.installedMw === null ? t("no installed capacity in A68; ") : ""}${t("model")} ${fmt(r.twh, 2)} TWh`, { box: "MW", icon: r.cls, bid: tag(r), readonly: true });
  }).join("");
}
