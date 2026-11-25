// The deck (the owner asked, 2026-11-08; D-220, R-APP-16): v3's twelve press slides on the Fermi deck's frame — white
// 1920×1080, Montserrat, the Fermi deck's palette — ported from energiamudel-v3 (PROVENANCE.md), every figure read from
// the runs the page shows: the state's four scenarios and, for the cables' slide, the same four with EstLink 2 and with
// both EstLinks out all year. Nothing is frozen, as v3's snapshot was, so no figure of a slide can drift from the model:
// D13's reason for keeping decks out of the application, which D-220 keeps. Each figure is the weather years' weighted
// average (R-TIME-4), its whisker the lowest and the highest year. The text is the page's language: v3's Estonian deck,
// its English mirror the keys (et.ts). The scenarios are v5's: 0 SMR, the TSO's S1 with its gas, and one to three units
// on the same fleet (D-151), so v3's gas card and nuclear card become the fleet the four share and the plant they differ by.
// The slide before the last is v5's own (D-229): Estonia's past years beside the market, titled how accurate the model
// is since the owner's review of 2026-11-12 (D-240), which took out the table of the validation's hourly price errors
// that stood before it (D-223).
import type { ScenarioId, State } from "../state/model.ts";
import { SCENARIOS, UNITS } from "../state/model.ts";
import { GATE_YEARS, mean } from "../worker/metrics.ts";
import type { Group, RunView } from "../worker/view.ts";
import { GROUPS } from "../worker/view.ts";
import { MONTHS, monthly } from "./charts.ts";
import { lang, t } from "./i18n.ts";
import { GROUP_LABEL, esc, fmt, signed } from "./labels.ts";
import { icon as glyphOf } from "./icons.ts";
import type { Knob, Toggle } from "./panel.ts";
import { SCENARIO_NAME, flag, profileName, setInputs } from "./panel.ts";
import type { PresContext } from "./presentation.ts";
import { lineOf, mwOf, weightedOf } from "./presentation.ts";
import type { YearResult } from "./results.ts";
import { statePaysOf } from "./results.ts";

export type Trio = Partial<Record<ScenarioId, YearResult[]>>;
/** What the deck reads: the four scenarios of the state shown and of the same state with EstLink 2 (`e2`) and with both
 * EstLinks (`e12`) out all year, as far as they are in; the state; the page's context (presentation.ts); the weather
 * years the state runs on, with their weights; for the past years' slide the validation's tables as the Calibration view
 * loads them (`data/derived/validation/<year>.json`, R-APP-7) — null until they are in. */
export interface DeckInput {
  trio: Trio; e2: Trio; e12: Trio; s: State; c: PresContext; runs: { label: string; weight: number }[];
  /** The second slide's prices (D-250, D-257): the six zones' average day-ahead price over the year so far, 1 January
   * to the last day all six reach, the month in progress included (`yearPrices`), drawn on the map after each zone's
   * code. */
  prices?: YearPrices | null;
  /** The replay slide's (D-229): each of its years, a column of its own since D-244, with Estonia's hourly price and
   * generation by group in the model's replay and in the market's record of that year, each null until it is in. */
  rep?: { year: number; model: Side | null; market: Side | null }[];
  /** The second slide's picture (D-240): the map of the lines the state runs with, as the panel draws it
   * (panel.ts `linesSvg`). */
  map?: string;
  /** The third slide's controls (D-242): Estonia's demand, onshore wind and solar and the first lines' switches, as the
   * panel holds them for the state (panel.ts `panelControls`). */
  ctl?: { demand: Knob; sources: Knob[]; gas: Knob; bid: Knob; lines: Toggle[] };
  /** The scenarios' slide's links (D-254): every line of the panel's list, as the panel holds it for the state. */
  lines?: Toggle[];
  /** The neighbours' three slides' figures (D-263, D-279): the documentary values their rows name (`NB_KEYS`) and the address of Fingrid's
   * forecast from the site's sources (D-270). */
  nb?: { par: Record<string, number>; urls?: Record<string, string>; refs?: Record<string, { url: string; page: number | null; title: string }> };
}
export interface Side { price: ArrayLike<number>; mix: Record<Group, number> }
export interface YearPrices { year: number; month: number; day: number; zones: Record<string, number> }
/** Each zone's average day-ahead price over every hour of the year so far (D-257, D-250 before): the export's
 * `statistics.ytd`, 1 January to the last hour all six zones reach, the month in progress included; the last day is
 * that hour's (UTC). Null without it. */
export function yearPrices(ytd: { last: string; zones: Record<string, { value: number }> } | undefined): YearPrices | null {
  if (!ytd) return null;
  const [year, month, day] = ytd.last.slice(0, 10).split("-").map(Number);
  return { year, month, day, zones: Object.fromEntries(Object.entries(ytd.zones).map(([z, v]) => [z, v.value])) };
}
/** The cables' slide's two outages, EstLink 2 and EstLinks 1 and 2, each its lines out all year; the page computes
 * them behind its own runs, and the build computes the opening state's with its sets (D-221). */
export const OUTAGES = [["estlink2"], ["estlink1", "estlink2"]];
/** The past years' slide's years (D-229): the protocol's gate years, each a whole year of record, and since D-253 2026,
 * the second blind year, as far as its months are in; the build computes their replays with its sets. */
export const REPLAY_YEARS: number[] = [...GATE_YEARS, 2026];
/** The state with `lines` out all year: the panel's what-if outage (R-LINK-3), 0 MW from 1 January to 31 December. */
export const without = (s: State, lines: string[]): State =>
  ({ ...s, links: { ...s.links, whatif: { ...s.links.whatif, ...Object.fromEntries(lines.map((k) => [k, "0@01-01..12-31"])) } } });

// the Fermi deck's palette (its brand.ts); the gas scenario's salmon is the Fermi deck's gas, as v3 took it, and the
// plant's three scenarios the Presentation page's ramp (D-152), lightest dropped: 0 SMR wears the salmon here
const BRAND = "#2303BD", GREEN = "#15C65D", INK = "#03084C", MUTED = "#6B7280", GRID = "#E5E7EB";
const GAS = "#F08072", GAS_DEEP = "#D64A3B"; // a fill (2.6:1 on white), and its hue dark enough for text and strokes
const FILL: Record<ScenarioId, string> = { gas: GAS, smr1: "#7A66EC", smr2: "#4C2FDC", smr3: BRAND };
export const W = 1920, H = 1080;

// lucide's paths (ISC), as v3 drew them: the plant and gas, the trilemma's three marks, the inputs of the method slide
const ICON: Record<string, string> = {
  atom: '<circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/>',
  flame: '<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>',
  euro: '<path d="M4 10h12M4 14h9"/><path d="M19 5.7A7.6 7.6 0 0 0 14.6 4C10.4 4 7 7.6 7 12s3.4 8 7.6 8c1.6 0 3.1-.6 4.4-1.7"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.7 4.5-7.5C9 11.7 12 10 14 8"/>',
  activity: '<path d="M22 12h-3.5a2 2 0 0 0-1.9 1.4l-2.4 8.4a.25.25 0 0 1-.5 0L9.2 2.2a.25.25 0 0 0-.5 0l-2.3 8.4A2 2 0 0 1 4.5 12H2"/>',
  cloudSun: '<path d="M12 2v2M4.9 4.9l1.4 1.4M20 12h2M19.1 4.9l-1.4 1.4"/><path d="M15.9 12.6a4 4 0 0 0-5.9-4.1"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
  factory: '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M7 18h1M12 18h1M17 18h1"/>',
  link: '<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><path d="M8 12h8"/>',
};
/** An icon in running text; `va`, `mr` the optical nudges of v3's. */
const icon = (name: string, c: string, size = 32, va = 8, mr = 12) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-${va}px;margin-right:${mr}px;color:${c}" aria-hidden="true">${ICON[name]}</svg>`;
/** The same placed in an SVG scene, centred on (cx, cy). */
const svgIcon = (name: string, c: string, size: number, cx: number, cy: number) => `<g transform="translate(${cx - size / 2},${cy - size / 2}) scale(${size / 24})" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color:${c}">${ICON[name]}</g>`;
/** A unit count as a row of atoms, never a digit (v3: two marks against three are seen before they are counted). */
const atomRow = (n: number, ink: string, x: number, y: number, size = 19, gap = 22) => Array.from({ length: n }, (_, k) => svgIcon("atom", ink, size, x + k * gap, y)).join("");
const atomsHtml = (n: number, size = 24, c = BRAND) => Array.from({ length: n }, () => icon("atom", c, size, Math.round(size / 4), 2)).join("");
/** A scenario's mark before its name: the flame for 0 SMR, an atom per unit. */
const markHtml = (id: DeckId, size = 24) => (UNITS[id] ? atomsHtml(UNITS[id], size, FILL[id]) : icon("flame", GAS_DEEP, size + 4, Math.round(size / 4), 4));
const NAME = SCENARIO_NAME;
// the deck's scenarios: 0, 1 and 2 SMR, the three units taken out of every slide at the owner's word (D-250); the page and
// its Model view keep all four, and the build computes them as before
type DeckId = Exclude<ScenarioId, "smr3">;
const SC = SCENARIOS.filter((id): id is DeckId => id !== "smr3");
/** The scenario with the most units a slide shows, the one its gap and its verdicts are told for (v3's three reactors
 * until D-250). */
const TOP: DeckId = "smr2";

/** A figure's weighted average over the weather years (R-TIME-4) and its lowest and highest year; null while the set is
 * missing or a year lacks the figure. */
interface Stat { w: number; min: number; max: number; years: { label: string; v: number }[] }
function stat(set: YearResult[] | undefined, f: (v: RunView) => number | undefined): Stat | null {
  if (!set?.length) return null;
  const w = weightedOf(set, f);
  if (w === null) return null;
  const years = set.map((r) => ({ label: r.label, v: f(r.view)! }));
  return { w, min: Math.min(...years.map((y) => y.v)), max: Math.max(...years.map((y) => y.v)), years };
}
const yearOf = (s: Stat, v: number) => s.years.find((y) => y.v === v)?.label ?? "";
/** The deck's scenarios' stats of f, or null while one is missing: a slide of them waits for all of them. */
function four(tr: Trio, f: (v: RunView) => number | undefined): Record<DeckId, Stat> | null {
  const out: Partial<Record<DeckId, Stat>> = {};
  for (const id of SC) {
    const x = stat(tr[id], f);
    if (!x) return null;
    out[id] = x;
  }
  return out as Record<DeckId, Stat>;
}

// Estonia's figures: price; net import, received less sent; the trade balance, sent less received at Estonia's price
// (v3's "exports minus imports"); the share of hours a Baltic gas plant set Estonia's price (D-195); CO₂
const ee = (v: RunView) => v.zones[0];
const PRICE = (v: RunView) => ee(v).mean;
const NET = (v: RunView) => ee(v).importTwh - ee(v).exportTwh;
const BALANCE = (v: RunView) => ee(v).exportMeur - ee(v).importMeur;
const GAS_SET = (v: RunView) => { const f = ee(v).fossil; return f ? f.gas / v.hours : undefined; };
const CO2 = (v: RunView) => ee(v).co2Mt;
const pct = (s: Stat): Stat => ({ w: 100 * s.w, min: 100 * s.min, max: 100 * s.max, years: s.years.map((y) => ({ ...y, v: 100 * y.v })) });
/** Estonia's demand as the Presentation page gives it: the base load weighted over the years, times the multiplier,
 * plus the constant load. */
const demandTwh = (s: State, set: YearResult[], z = 0) => {
  const x = setInputs(s, set), zc = (["EE", "LV", "LT"] as const)[z];
  return x.loadTwh[z] * s.zones[zc].multiplier + (s.zones[zc].firmMw * x.hours) / 1e6;
};

const frame = (title: string, subtitle: string, body: string) => `
  <div class="ps-head"><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ""}</div>
  <div class="ps-body">${body}</div>
  <div class="ps-foot"><span class="ps-public">${t("PUBLIC")}</span><span class="ps-brand">ENERGIAMUDEL.EE</span></div>`;
/** A slide's body while its runs compute. */
const pending = () => `<p class="ps-pending">${t("computing…")}</p>`;
const SECT = `font-size:23px;font-weight:700;letter-spacing:.08em;color:${MUTED}`;

// ---- 1 · title (full-bleed: the Fermi deck's arc and corner circles) --------------------------------------------------
const s1 = () => `
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" style="position:absolute;inset:0" aria-hidden="true">
    <circle cx="707" cy="226" r="1191" fill="none" stroke="#231FBD" stroke-width="2.5" opacity=".9"/>
    <circle cx="150" cy="-95" r="215" fill="#231FBD"/>
    <circle cx="-45" cy="60" r="165" fill="#1BE54E"/>
  </svg>
  <div style="position:absolute;left:103px;top:0;bottom:0;width:1610px;display:flex;align-items:center">
    <h1 style="font-size:82px;font-weight:800;line-height:1.14;letter-spacing:-.015em;color:${BRAND};max-width:1560px">${t("What happens to the energy system if Estonia builds a nuclear plant?")}</h1>
  </div>
  <div style="position:absolute;left:103px;bottom:110px;font-size:32px;font-weight:500;color:${MUTED}">${t("An hourly simulation model of the Baltic electricity market")}</div>
  <div style="position:absolute;left:103px;bottom:56px;font-size:32px;font-weight:700;color:${BRAND}">energiamudel.ee</div>`;

// ---- 2 · why this model exists ------------------------------------------------------------------------------------------
const bullet = (n: number, txt: string) => `
  <div style="display:flex;gap:28px;align-items:flex-start;margin-bottom:44px">
    <div style="font-size:34px;font-weight:700;color:${BRAND};line-height:1.35;flex:none">${n}.</div>
    <div style="font-size:34px;font-weight:500;color:${INK};line-height:1.35">${txt}</div>
  </div>`;
// the right column's picture the panel's map of the lines (D-240), in place of v3's schematic of the zones, with each
// zone's average price of the year so far (D-250); the map larger since the owner asked (D-251): the columns nearer even
// and the column's heading on one line, so that the map takes the height they leave, 680 wide
const MAP_W = 680;
const s2 = (d: DeckInput) => frame(t("Why another model?"), "", `
  <div style="display:flex;gap:64px;height:100%">
    <div style="flex:46;display:flex;flex-direction:column;justify-content:center">
      ${bullet(1, t("A solution is needed that can <b>quickly test different energy mixes</b> and their effect on the price."))}
      ${bullet(2, t("<b>The Baltic electricity market is one whole:</b> the model has to compute {ee}Estonia, {lv}Latvia and {lt}Lithuania at once.", { ee: flag("EE"), lv: flag("LV"), lt: flag("LT") }))}
      ${bullet(3, t("Energy system modelling software on the market today costs <b>tens to hundreds of thousands of euros</b>."))}
    </div>
    <div style="flex:54;display:flex;flex-direction:column;justify-content:center;gap:18px;border-left:1px solid ${GRID};padding-left:56px">
      <div style="font-size:34px;font-weight:600;line-height:1.25;color:${BRAND};white-space:nowrap">${t("Energiamudel is public and interactive.")}</div>
      <div style="font-size:23px;font-weight:500;line-height:1.4;color:${MUTED}">${t("The model runs the whole Baltic electricity market hour by hour. Every assumption is a slider on screen: the model's answer is not “trust us” but “try it yourself”.")}</div>
      ${d.map ? `<div style="position:relative;width:${MAP_W}px;align-self:center">${d.map}${d.prices ? `
        <div style="position:absolute;left:18px;top:16px;font-size:16px;font-weight:700;letter-spacing:.06em;line-height:1.35;color:${MUTED}">${t("AVERAGE DAY-AHEAD PRICE")}<br><span style="font-size:19px;letter-spacing:0;color:${BRAND}">${d.prices.year}${d.prices.month === 12 && d.prices.day === 31 ? "" : ` ${MONTHS[0]}–${d.prices.day} ${MONTHS[d.prices.month - 1]}`}</span></div>` : ""}</div>` : ""}
    </div>
  </div>`);

// ---- 3 · how the model works ---------------------------------------------------------------------------------------------
// the panel's own controls under the pipeline (the owner asked, 2026-11-12; D-242), as the panel holds them for the state
// shown: Estonia's demand, onshore wind and solar on sliders — the track filled up to the knob, the preset a red dashed
// line, the number in its box — and the first lines' switches, drawn at the stage's size with nothing on them to press
const PANEL_GREEN = "#0B6E35", PANEL_RED = "#C8102E"; // the panel's --green and --red, its switches' colours
const KNOB_W = 540; // three across the body, each wide enough for the panel's longest label here on one line
const glyph = (key: string, c: string, size = 40) => `<span style="flex:none;line-height:0">${ICON[key] ? icon(key, c, size, 0, 0) : glyphOf(key, size).replace(/style="color:[^"]*"/, `style="color:${c}"`)}</span>`;
// a number in its box and its unit after it, as the panel's boxes
const numBox = (shown: string, unit: string) => `<span style="min-width:112px;height:46px;padding:0 14px;border:1.5px solid ${GRID};border-radius:10px;font-size:25px;font-weight:700;line-height:43px;text-align:right;color:${INK}">${shown}</span>
      <span style="min-width:40px;font-size:20px;font-weight:500;color:${MUTED}">${unit}</span>`;
// `bid`: the source's bid in a box of its own after its MW, as the model's panel has it on each source's row (D-260)
const knob = (k: Knob, ico: string, ink: string, shown: string, unit: string, bid = "", w = KNOB_W) => {
  // the knob's centre travels the track less the knob's own width, as on the panel's range input
  const x = (v: number) => 16 + (k.max > k.min ? Math.min(1, Math.max(0, (v - k.min) / (k.max - k.min))) : 0) * (w - 32);
  return `<div style="width:${w}px">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px">${glyph(ico, ink)}
      <span style="flex:1;min-width:0;font-size:24px;font-weight:600;color:${INK};white-space:nowrap">${esc(k.label)}</span>
      ${numBox(shown, unit)}${bid ? numBox(bid, "€/MWh") : ""}</div>
    <svg width="${w}" height="34" viewBox="0 0 ${w} 34" aria-hidden="true">
      <rect x="0" y="13" width="${w}" height="8" rx="4" fill="${GRID}"/><rect x="0" y="13" width="${x(k.value)}" height="8" rx="4" fill="${ink}"/>
      <line x1="${x(k.preset)}" y1="1" x2="${x(k.preset)}" y2="33" stroke="${PANEL_RED}" stroke-width="3" stroke-dasharray="5 4"/>
      <circle cx="${x(k.value)}" cy="18" r="15" fill="rgb(3 8 76 / .22)"/><circle cx="${x(k.value)}" cy="17" r="14" fill="${ink}" stroke="#fff" stroke-width="4"/>
    </svg></div>`;
};
const toggle = (g: Toggle) => `
  <div style="flex:1;display:flex;align-items:center;gap:16px;border:1.5px solid ${GRID};border-radius:12px;padding:12px 18px">
    <span style="position:relative;flex:none;width:78px;height:36px;border-radius:18px;background:${g.on ? PANEL_GREEN : PANEL_RED}">
      <span style="position:absolute;top:0;${g.on ? "left:12px" : "right:10px"};font-size:15px;font-weight:700;line-height:36px;letter-spacing:.06em;color:#fff">${g.on ? "ON" : "OFF"}</span>
      <span style="position:absolute;top:7px;left:${g.on ? 49 : 7}px;width:22px;height:22px;border-radius:50%;background:#fff"></span></span>
    <span style="display:flex;flex-direction:column;min-width:0"><span style="font-size:23px;font-weight:600;color:${INK};white-space:nowrap">${esc(g.name)}</span>
      <span style="font-size:19px;font-weight:500;color:${g.on ? MUTED : PANEL_RED};${g.on ? "" : "text-decoration:line-through"}">${g.mw === null ? "" : `${g.planned ? "+" : ""}${fmt(g.mw, 0)} MW`}</span></span>
  </div>`;
const controls = (d: DeckInput) => {
  const c = d.ctl;
  if (!c) return "";
  const set = SC.map((id) => d.trio[id]).find(Boolean);
  return `<div style="position:absolute;left:0;top:440px;width:1760px;height:300px;border:1.5px solid ${GRID};border-radius:18px;padding:22px 34px">
    <div style="${SECT};margin-bottom:12px">${t("THE PANEL: ASSUMPTIONS YOU CAN CHANGE")}</div>
    <div style="display:flex;justify-content:space-between">${knob(c.demand, "demand", INK, set ? fmt(demandTwh(d.s, set), 2) : "…", "TWh", "", 820)}${
      // a source named by no technology (D-259), with its MW and its bid side by side as the model's panel gives a source's
      // row (D-260): Estonia's gas plants, their MW and their one bid
      knob({ ...c.gas, label: t("Generation source") }, "factory", BRAND, fmt(c.gas.value, 0), "MW", fmt(c.bid.value, 0), 820)}</div>
    <div style="display:flex;gap:18px;margin-top:18px">${c.lines.map((g, i) => toggle({ ...g, name: t("Link {n}", { n: i + 1 }) })).join("")}</div>
  </div>`;
};
// the three boxes at the body's top since the panel's controls stand under them (D-242)
const pipeBox = (x: number, title: string, rows: (string | [string, string])[]) => `
  <div style="position:absolute;left:${x}px;top:0;width:480px;height:400px;border:3px solid ${BRAND};border-radius:18px;padding:30px 34px">
    <div style="font-size:26px;font-weight:700;letter-spacing:.08em;color:${BRAND};margin-bottom:20px">${title}</div>
    ${rows.map((r) => (Array.isArray(r)
    ? `<div style="display:flex;align-items:flex-start;font-size:24px;font-weight:500;line-height:1.3;color:${INK};margin-bottom:13px"><span style="flex:none;padding-top:2px">${icon(r[0], BRAND, 28, 0, 14)}</span><span>${r[1]}</span></div>`
    : `<div style="font-size:25px;font-weight:500;line-height:1.32;color:${INK};margin-bottom:14px">${r}</div>`)).join("")}
  </div>`;
const s3 = (d: DeckInput) => frame(t("How does the model work?"), "", `
  <svg width="1760" height="740" viewBox="0 0 1760 740" style="position:absolute;inset:0" aria-hidden="true">
    <defs><marker id="ps-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${BRAND}"/></marker></defs>
    <line x1="530" y1="200" x2="596" y2="200" stroke="${BRAND}" stroke-width="4" marker-end="url(#ps-arr)"/>
    <line x1="1128" y1="200" x2="1194" y2="200" stroke="${BRAND}" stroke-width="4" marker-end="url(#ps-arr)"/>
    ${d.ctl ? `<line x1="878" y1="438" x2="878" y2="410" stroke="${BRAND}" stroke-width="4" stroke-dasharray="7 6" marker-end="url(#ps-arr)"/>` : ""}
    <g transform="translate(672,180)"><!-- lower and flatter, for the flows with the neighbours above it (D-240) -->
      <path d="M0 60 h64 v-8 h58 v-11 h52 v-13 h46 v-11 h42 v-16 h56" fill="none" stroke="${BRAND}" stroke-width="4"/>
      <line x1="228" y1="0" x2="228" y2="70" stroke="${GREEN}" stroke-width="4" stroke-dasharray="7 6"/>
      <text x="0" y="82" font-size="19" font-weight="600" fill="${MUTED}">${t("cheapest → most expensive plant")}</text>
      <text x="238" y="36" font-size="19" font-weight="600" fill="${INK}">${t("demand")}</text>
    </g>
  </svg>
  ${pipeBox(40, t("REAL DATA"), [
    ["activity", t("<b>ENTSO-E</b>: hourly generation and consumption")],
    ["cloudSun", t("Weather years {years}, ENTSO-E's weights", { years: d.runs.map((r) => r.label).join(", ") })],
    ["factory", t("Installed capacity and generation")],
    ["link", t("Cable capacity and the neighbours' hourly prices")]])}
  <div style="position:absolute;left:638px;top:0;width:480px;height:400px;border:3px solid ${BRAND};border-radius:18px;padding:30px 34px">
    <div style="font-size:26px;font-weight:700;letter-spacing:.08em;color:${BRAND};margin-bottom:20px">${t("SIMULATION")}</div>
    <div style="font-size:25px;font-weight:500;line-height:1.32;color:${INK}">${t("<b>{h} hours a year</b>, every hour:", { h: fmt(8760, 0) })}</div>
    <div style="font-size:25px;font-weight:500;line-height:1.32;color:${INK};margin-top:10px">${t("Flows with the neighbours:")} ${flag("FI")}${flag("SE4")}${flag("PL")}</div>
    <div style="position:absolute;left:34px;bottom:26px;width:412px;font-size:23px;font-weight:500;line-height:1.3;color:${INK}">${t("The market price is set by the last bid needed to meet demand <i>(merit order)</i>")}</div>
  </div>
  ${pipeBox(1236, t("RESULT"), [
    `${t("Electricity price for every hour:")}<br>${flag("EE")}${flag("LV")}${flag("LT")}`,
    t("CO₂, imports, deficit, price-setters")])}
  ${controls(d)}`);

// ---- 5 · how the weather years are run ----------------------------------------------------------------------------------
const s4 = (d: DeckInput) => {
  // the body's width since the owner took the right column out (D-243): what the year brings and how the answers become one
  const n = d.runs.length, Wc = 1760, CHIP = 170, GAP = n > 1 ? (Wc - n * CHIP) / (n - 1) : 0;
  const x0 = n > 1 ? 0 : (Wc - CHIP) / 2;
  const chips = d.runs.map((r, i) => {
    const x = x0 + i * (CHIP + GAP);
    return `<rect x="${x}" y="0" width="${CHIP}" height="100" rx="14" fill="none" stroke="${BRAND}" stroke-width="3"/>
      <text x="${x + CHIP / 2}" y="42" font-size="34" font-weight="700" fill="${BRAND}" text-anchor="middle">${esc(r.label)}</text>
      <text x="${x + CHIP / 2}" y="74" font-size="19" font-weight="600" fill="${MUTED}" text-anchor="middle">${t("weight {w} %", { w: fmt(100 * r.weight, 0) })}</text>
      <line x1="${x + CHIP / 2}" y1="100" x2="${x + CHIP / 2}" y2="134" stroke="${BRAND}" stroke-width="3" marker-end="url(#ps-arr4)"/>`;
  }).join("");
  // what a weather year is and what its weight is, in the gaps beside the middle chip (the owner asked, 2026-11-12; D-245)
  const cx = (i: number) => x0 + i * (CHIP + GAP), m = Math.floor(n / 2);
  const gaps: [number, number][] = n === 1 ? [[0, x0 - 30], [x0 + CHIP + 30, Wc]] : n === 2 ? [[CHIP + 30, Wc / 2 - 15], [Wc / 2 + 15, Wc - CHIP - 30]]
    : [[cx(m - 1) + CHIP + 30, cx(m) - 30], [cx(m) + CHIP + 30, cx(m + 1) - 30]];
  const explain = ([a, b]: [number, number], head: string, txt: string) => `<div style="position:absolute;left:${a}px;top:0;width:${b - a}px;height:100px;display:flex;flex-direction:column;justify-content:center">
    <div style="${SECT};font-size:18px;margin-bottom:4px">${head}</div><div style="font-size:19px;font-weight:500;line-height:1.3;color:${INK}">${txt}</div></div>`;
  const P = four(d.trio, PRICE);
  let rows = `<text x="0" y="420" font-size="28" font-weight="600" fill="${MUTED}">${t("computing…")}</text>`;
  let ticks = "";
  if (P) {
    const all = SC.flatMap((id) => [P[id].min, P[id].max]);
    const MIN = Math.floor(Math.min(...all) / 10) * 10 - 5, MAX = Math.ceil(Math.max(...all) / 10) * 10 + 5;
    const L = 190, R = Wc - 30, px = (v: number) => L + ((v - MIN) / (MAX - MIN)) * (R - L);
    const step = MAX - MIN > 90 ? 20 : 10;
    ticks = Array.from({ length: Math.floor((MAX - MIN) / step) + 1 }, (_, k) => Math.ceil(MIN / step) * step + k * step).filter((v) => v <= MAX)
      .map((v) => `<line x1="${px(v)}" y1="334" x2="${px(v)}" y2="702" stroke="${GRID}" stroke-width="1.5"/><text x="${px(v)}" y="730" font-size="19" font-weight="600" fill="${MUTED}" text-anchor="middle">${fmt(v, 0)}</text>`).join("")
      + `<line x1="${px(MIN)}" y1="702" x2="${px(MAX)}" y2="702" stroke="${GRID}" stroke-width="2"/>`
      + `<text x="${L - 24}" y="730" font-size="19" font-weight="700" fill="${MUTED}" text-anchor="end">€/MWh</text>`; // the axis's unit (D-245)
    rows = SC.map((id, i) => {
      // the rows 132 apart since the deck shows three scenarios (D-250), 96 for four (88 until the night of 2026-11-10: a
      // row's lowest-year label stood on the next row's weighted label)
      const s = P[id], cy = 384 + i * 132, ink = id === "gas" ? INK : BRAND;
      const label = UNITS[id] ? `${atomRow(UNITS[id], FILL[id], 10, cy, 19, 22)}<text x="${16 + UNITS[id] * 22}" y="${cy + 9}" font-size="25" font-weight="600" fill="${BRAND}">${NAME[id]}</text>`
        : `${svgIcon("flame", GAS_DEEP, 28, 12, cy)}<text x="38" y="${cy + 9}" font-size="25" font-weight="600" fill="${GAS_DEEP}">${NAME[id]}</text>`;
      return `<line x1="${px(s.min)}" y1="${cy}" x2="${px(s.max)}" y2="${cy}" stroke="${FILL[id]}" stroke-width="6" stroke-linecap="round" opacity=".45"/>
        <line x1="${px(s.w)}" y1="${cy - 22}" x2="${px(s.w)}" y2="${cy + 22}" stroke="${ink}" stroke-width="4"/>
        <text x="${px(s.w)}" y="${cy - 30}" font-size="20" font-weight="700" fill="${ink}" text-anchor="middle">${t("weighted {x} €/MWh", { x: fmt(s.w) })}</text>
        ${s.years.map((y) => `<circle cx="${px(y.v)}" cy="${cy}" r="11" fill="${FILL[id]}" stroke="#fff" stroke-width="2.5"><title>${esc(y.label)}: ${fmt(y.v)} €/MWh</title></circle>`).join("")}
        <text x="${px(s.min)}" y="${cy + 34}" font-size="18" font-weight="600" fill="${MUTED}" text-anchor="middle">${esc(yearOf(s, s.min))} · ${fmt(s.min)}</text>
        ${s.max > s.min ? `<text x="${px(s.max)}" y="${cy + 34}" font-size="18" font-weight="600" fill="${MUTED}" text-anchor="middle">${esc(yearOf(s, s.max))} · ${fmt(s.max)}</text>` : ""}
        ${label}`;
    }).join("");
  }
  return frame(t("{n} weather years, one scenario", { n }), "", `
  <svg width="${Wc}" height="740" viewBox="0 0 ${Wc} 740" style="position:absolute;left:0;top:0" aria-hidden="true">
    <defs><marker id="ps-arr4" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${BRAND}"/></marker></defs>
    ${chips}
    <rect x="0" y="140" width="${Wc}" height="96" rx="14" fill="${BRAND}"/>
    <text x="${Wc / 2}" y="180" font-size="27" font-weight="700" letter-spacing=".06em" fill="#fff" text-anchor="middle">${t("THE SAME {year} SCENARIO", { year: d.s.target })}</text>
    <text x="${Wc / 2}" y="214" font-size="22" font-weight="500" fill="#fff" text-anchor="middle">${t("the same plants and the same demand; only the weather is another year's each time")}</text>
    <line x1="${Wc / 2}" y1="236" x2="${Wc / 2}" y2="274" stroke="${BRAND}" stroke-width="3" marker-end="url(#ps-arr4)"/>
    <text x="0" y="308" font-size="23" font-weight="700" letter-spacing=".08em" fill="${MUTED}">${t("{n} ANSWERS: ESTONIA'S WHOLESALE PRICE, €/MWh", { n })}</text>
    ${ticks}${rows}
  </svg>
  ${explain(gaps[0], t("WEATHER YEAR"), t("One year's weather from ENTSO-E's climate data — wind, sun, water and temperature hour by hour — laid over the same {year} scenario.", { year: d.s.target }))}
  ${explain(gaps[1], t("WEIGHT"), t("ENTSO-E's weight for the year: how much of the climate data's spread of weather it stands for. The {n} answers are averaged with these weights into one.", { n }))}`);
};

// ---- 6 · the four scenarios of 2035 --------------------------------------------------------------------------------------
/** The growth mark, the deck's one status glyph: a disc with a white arrow, the colour on the mark, the figure in ink. */
const deltaMark = (up: boolean, s = 20, mr = 5, c = GREEN) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" style="display:inline-block;vertical-align:middle;margin-right:${mr}px" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="${c}"/><path d="${up ? "M9.5 19.5V13H5.5L12 5.5 18.5 13h-4v6.5z" : "M9.5 4.5V11H5.5L12 18.5 18.5 11h-4V4.5z"}" fill="#fff"/></svg>`;
const ZC = ["EE", "LV", "LT"] as const;
/** A line's change from the observed fleet of 2025, as the Presentation page's inputs show it (D-057). */
function growth(c: PresContext, line: string, z: number, mw: number): string {
  const f = c.fleet2025?.[ZC[z]];
  if (!f) return "";
  const base = Object.entries(f).reduce((a, [cls, x]) => a + (lineOf(cls) === line ? x : 0), 0);
  if (!base && !mw) return "";
  const tag = (txt: string) => `<span style="font-size:19px;font-weight:700;color:${INK};margin-left:9px;white-space:nowrap">${txt}</span>`;
  if (!base) return tag(`${deltaMark(true, 16, 4)}${t("new")}`);
  return change(mw / base);
}
/** A change as the mark and its figure: a ratio of ten or more as a factor, below as a percentage. */
function change(r: number): string {
  const tag = (txt: string) => `<span style="font-size:19px;font-weight:700;color:${INK};margin-left:9px;white-space:nowrap">${txt}</span>`;
  if (Math.abs(r - 1) < 0.005) return tag("0 %");
  return tag(`${deltaMark(r > 1, 16, 4, r > 1 ? GREEN : MUTED)}${r >= 10 ? `×${fmt(r, 0)}` : `${fmt(Math.abs(r - 1) * 100, 0)} %`}`);
}
// the rows a size up from v3's, and the cards the stage's height with the rows spread (D-221): v3's photographs,
// which filled the cards' upper halves, were not ported, and the slide stood half empty below them
// each zone a column of its own width, so that the flags stand under each other from row to row (D-240), and in it the
// figure and its unit at fixed widths, so that the growth marks do too (D-243): 256 holds a five-digit MW with its growth,
// the widest a cell has (a ratio of ten or more is a factor, D-228's change()), and leaves the label its source's icon
const ZONE_W = 256;
const figure = (v: string, unit: string) => `<span style="display:inline-block;width:80px;text-align:right;font-size:28px;font-weight:600">${v}</span><span style="display:inline-block;width:42px;font-size:18px;font-weight:500;margin-left:3px">${unit}</span>`;
// a row's label after its source's icon, as the panel draws it (D-248): the sources in the accent, demand in the ink
const zoneRow = (label: string, cell: (z: number) => string, ico = "") => `
  <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid ${GRID};padding:13px 0">
    <div style="display:flex;align-items:center;gap:10px;font-size:27px;font-weight:500;color:${MUTED};white-space:nowrap">${ico ? glyph(ico, ico === "demand" ? INK : BRAND, 32) : ""}${label}</div>
    <div style="display:grid;grid-template-columns:repeat(${ZC.length}, ${ZONE_W}px);column-gap:8px">${ZC.map((_, z) => `<div style="display:flex;align-items:baseline;white-space:nowrap">${cell(z)}</div>`).join("")}</div>
  </div>`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const s5 = (d: DeckInput) => {
  const set = SC.map((id) => d.trio[id]).find(Boolean);
  const title = t("Three scenarios for {year}", { year: d.s.target }), sub = "";
  if (!set) return frame(title, sub, pending());
  const mw = ZC.map((_, z) => mwOf(set, z, 0));
  const mwCell = (line: string) => (z: number) => `${flag(ZC[z])}${figure(fmt(mw[z][line] ?? 0, 0), "MW")}${growth(d.c, line, z, mw[z][line] ?? 0)}`;
  // each line with the panel's icon of its source; the gas plants of the three zones since D-248, Estonia's alone before
  // oil shale Estonia's alone, after the gas plants (D-260)
  const lines: [string, string, string][] = [["gas", t("gas plants"), "gas"], ["oil_shale", t("oil shale"), "oil_shale"], ["wind_onshore", t("onshore wind"), "wind_onshore"], ["wind_offshore", t("offshore wind"), "wind_offshore"],
    ["solar", GROUP_LABEL.solar, "solar"], ["storage", GROUP_LABEL.storage, "battery"]];
  const only = (line: string) => (line === "oil_shale" ? [0] : ZC.map((_, z) => z));
  // demand first since the owner asked (D-260), its growth from 2025's load (D-228)
  const shared = [
    zoneRow(t("Demand"), (z) => `${flag(ZC[z])}${figure(fmt(demandTwh(d.s, set, z), 1), "TWh")}${d.c.load2025?.[ZC[z]] ? change(demandTwh(d.s, set, z) / d.c.load2025[ZC[z]]) : ""}`, "demand"),
    ...lines.filter(([line]) => only(line).some((z) => (mw[z][line] ?? 0) > 0))
      .map(([line, label, ico]) => zoneRow(cap(label), (z) => (only(line).includes(z) ? mwCell(line)(z) : ""), ico)),
  ].join("");
  // the plant's rows a size down since the links share its column (D-254)
  const plant = SC.map((id) => `
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:14px;border-top:1px solid ${GRID};padding:5px 0">
      <span style="font-size:26px;font-weight:600;color:${id === "gas" ? GAS_DEEP : BRAND};white-space:nowrap">${markHtml(id, 22)}${NAME[id]}</span>
      ${UNITS[id] ? `<span style="font-size:30px;font-weight:800;color:${FILL[id]}">${fmt(d.c.plantMw[id] ?? 0, 0)} MW</span>` : `<span style="font-size:25px;font-weight:500;color:${MUTED}">${t("no plant")}</span>`}
    </div>`).join("");
  // the lines in service, the same in the three scenarios, a row per border along the chain with its lines' names and
  // MW, as the panel's switches and the second slide's map have them (the owner asked, 2026-11-13; D-254)
  const on = (d.lines ?? []).filter((l) => l.on);
  const links = [...new Set(on.map((l) => l.border))].map((b) => {
    const ls = on.filter((l) => l.border === b), [a, z] = b.split("-");
    return `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;border-top:1px solid ${GRID};padding:4px 0;white-space:nowrap">
      <span style="font-size:21px;font-weight:500;color:${MUTED}">${flag(a)}${flag(z)}${ls.map((l) => esc(l.name)).join(" · ")}</span>
      <span style="font-size:24px;font-weight:700;color:${INK}">${fmt(ls.reduce((n, l) => n + (l.mw ?? 0), 0), 0)} MW</span></div>`;
  }).join("");
  // the accent a band across the top, clipped by the corners: a thick top border on a rounded card tapers into its sides;
  // the card a column whose rows spread over its height
  // the plant's card its rows' height, the links' the rest of the column (D-254): `flex` a number or "none"
  const card = (edge: string, ink: string, ico: string, head: string, rows: string, flex: number | string) => `
    <div style="flex:${flex};display:flex;flex-direction:column;border:1px solid ${GRID};border-radius:18px;overflow:hidden;color:${ink}">
      <div style="flex:none;height:6px;background:${edge}"></div>
      <div style="flex:1;display:flex;flex-direction:column;padding:18px 40px 14px"><div style="font-size:30px;font-weight:700;letter-spacing:.08em;margin-bottom:8px">${ico}${head}</div>
        <div style="flex:1;display:flex;flex-direction:column;justify-content:space-evenly">${rows}</div></div>
    </div>`;
  const inputs = setInputs(d.s, set);
  // each neighbour's average with its unit, its level after it (D-260)
  const nb = (["FI", "SE4", "PL"] as const).map((zc) => `<span style="white-space:nowrap">${flag(zc)}<span style="font-weight:600">${zc}</span> <span style="font-weight:700">${fmt(inputs.price[zc] * d.s.level[zc])}</span><span style="font-size:18px;font-weight:500;color:${MUTED}"> €/MWh · ×${fmt(d.s.level[zc], 2)}</span></span>`).join("");
  return frame(title, sub, `
  <div style="display:flex;gap:48px;height:612px">
    ${card(INK, INK, "", t("IN ALL THREE SCENARIOS"), shared, 1.3)}
    <div style="flex:0.7;display:flex;flex-direction:column;gap:16px">
      ${card(BRAND, BRAND, icon("atom", BRAND, 32, 5, 12), t("NUCLEAR PLANT"), plant, "none")}
      ${links ? card(INK, INK, "", t("LINKS IN SERVICE"), links, 1) : ""}
    </div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;border-top:1px solid ${GRID};padding-top:12px;font-size:22px;font-weight:500;color:${INK}">
    <div style="display:grid;grid-template-columns:250px 1fr;row-gap:8px;align-items:baseline">
      <span style="${SECT};font-size:17px">${t("NEIGHBOURS' PRICES")}</span>
      <span style="display:flex;align-items:baseline;gap:30px;white-space:nowrap"><b>${esc(profileName(d.s.profile, d.s.profileYear))}</b>${nb}</span>
      <span style="${SECT};font-size:17px">${t("FUEL AND CO₂")}</span>
      <span style="display:flex;justify-content:space-between;align-items:baseline"><span>${t("LNG {gas} €/MWh · CO₂ {eua} €/t", { gas: `<b>${fmt(d.s.fuelGas)}</b>`, eua: `<b>${fmt(d.s.fuelEua)}</b>` })}</span>
        <span style="font-size:19px;color:${MUTED}">${deltaMark(true, 20, 5)}${t("= growth from {year}", { year: 2025 })}</span></span>
    </div>
  </div>`);
};

// ---- 7 · the price and what its gap means for Estonia --------------------------------------------------------------------
const priceChart = (P: Record<DeckId, Stat>, PW = 1000) => {
  const top = Math.max(...SC.map((id) => P[id].max));
  const MAX = Math.max(100, Math.ceil((top * 1.2) / 50) * 50), PH = 420, x0 = 110, span = PW - x0;
  const y = (v: number) => PH - (Math.max(0, v) / MAX) * PH;
  const bw = Math.round(span * 0.13);
  const cxs = SC.map((_, i) => Math.round(x0 + (span * (i + 0.5)) / SC.length));
  const bar = (id: DeckId, cx: number) => {
    const s = P[id], lx = cx + bw / 2 + 14, units = UNITS[id];
    const nameW = 98, gW = units ? nameW + 6 + units * 20 : nameW, nx = cx - gW / 2;
    return `<rect x="${cx - bw / 2}" y="${y(s.w)}" width="${bw}" height="${PH - y(s.w)}" rx="8" fill="${FILL[id]}"/>
      ${svgIcon(units ? "atom" : "flame", "#fff", 48, cx, PH - 52)}
      ${s.max > s.min ? [["#fff", 5], [INK, 3]].map(([st, w]) => `<g stroke="${st}" stroke-width="${w}" stroke-linecap="round">
        <line x1="${cx}" y1="${y(s.min)}" x2="${cx}" y2="${y(s.max)}"/><line x1="${cx - 22}" y1="${y(s.min)}" x2="${cx + 22}" y2="${y(s.min)}"/><line x1="${cx - 22}" y1="${y(s.max)}" x2="${cx + 22}" y2="${y(s.max)}"/></g>`).join("")
        + `<text x="${lx}" y="${y(s.max) + 6}" font-size="18" font-weight="500" fill="${MUTED}">${fmt(s.max)}</text><text x="${lx}" y="${y(s.min) + 6}" font-size="18" font-weight="500" fill="${MUTED}">${fmt(s.min)}</text>` : ""}
      <text x="${cx}" y="${y(s.max) - 24}" font-size="44" font-weight="800" fill="${id === "gas" ? INK : BRAND}" text-anchor="middle">${fmt(s.w)} <tspan font-size="30">€</tspan></text>
      <text x="${nx}" y="${PH + 44}" font-size="28" font-weight="600" fill="${INK}">${NAME[id]}</text>
      ${units ? atomRow(units, FILL[id], nx + nameW + 6 + 10, PH + 34, 19, 20) : ""}`;
  };
  // the change against 0 SMR above each of the plant's bars: v3's trend pill, the colour on the mark only
  const chip = (id: DeckId, cx: number) => {
    const drop = Math.round(((P.gas.w - P[id].w) / P.gas.w) * 100), down = drop >= 0;
    return `<g transform="translate(${cx},${y(P[id].max) - 92})">
      <rect x="-64" y="-26" width="128" height="40" rx="20" fill="#fff" stroke="${GRID}" stroke-width="2"/>
      <circle cx="-40" cy="-6" r="12" fill="${down ? GREEN : GAS_DEEP}"/>
      <g transform="translate(-40,-6) scale(.58)"><path d="${down ? "M-4 -13 v14 h-7 l11 12 l11 -12 h-7 v-14 z" : "M-4 13 v-14 h-7 l11 -12 l11 12 h-7 v14 z"}" fill="#fff"/></g>
      <text x="-20" y="3" font-size="22" font-weight="700" fill="${INK}">${down ? "−" : "+"}${fmt(Math.abs(drop), 0)} %</text></g>`;
  };
  const grid = [0, 50, 100, 150, 200].filter((v) => v <= MAX).map((v) => `<line x1="${x0}" y1="${y(v)}" x2="${PW}" y2="${y(v)}" stroke="${GRID}" stroke-width="${v ? 1 : 2}"/>
    <text x="${x0 - 16}" y="${y(v) + 8}" font-size="22" font-weight="500" fill="#9CA3AF" text-anchor="end">${v} €</text>`).join("");
  // the scenarios' names stand under the bars, their bottom 7 below the 520 the chart had (D-240)
  return `<svg width="${PW}" height="540" viewBox="0 0 ${PW} 540" aria-hidden="true"><g transform="translate(0,56)">${grid}
    ${SC.map((id, i) => bar(id, cxs[i])).join("")}${SC.filter((id) => id !== "gas").map((id) => chip(id, cxs[SC.indexOf(id)])).join("")}</g></svg>`;
};
const impactBlock = (kicker: string, calc: string, big: string, sub: string, others: string, note = "") => `
  <div>
    <div style="font-size:30px;font-weight:800;letter-spacing:.02em;color:${BRAND}">${kicker}</div>
    <div style="font-size:21px;font-weight:500;color:${MUTED};margin-top:6px;line-height:1.35">${calc}</div>
    <div style="font-size:54px;font-weight:800;color:${BRAND};line-height:1.05;margin-top:8px">${big}</div>
    ${sub ? `<div style="font-size:25px;font-weight:600;color:${INK};margin-top:2px">${sub}</div>` : ""}
    <div style="font-size:21px;font-weight:500;color:${MUTED};margin-top:10px">${others}</div>
    ${note ? `<div style="font-size:18px;font-weight:500;color:${MUTED};margin-top:6px">${note}</div>` : ""}
  </div>`;
const s6 = (d: DeckInput) => {
  const title = t("What the price gap means for Estonia");
  const P = four(d.trio, PRICE);
  if (!P) return frame(title, "", pending());
  // the gap between the two figures the chart itself shows, 0 SMR's and the most units' (TOP), as v3 took the gas and
  // three reactors
  const gap = (id: DeckId) => P.gas.w - P[id].w;
  const load = demandTwh(d.s, d.trio.gas!);
  const imp = d.c.impact;
  const house = (id: DeckId) => (imp ? ((imp.kwh * gap(id)) / 1000) * (1 + imp.vat) : 0);
  const others = (f: (id: DeckId) => string) => SC.filter((id) => id !== "gas" && id !== TOP).reverse().map((id) => `${atomsHtml(UNITS[id], 19, MUTED)}${f(id)}`).join(`<span style="margin:0 10px">·</span>`);
  // the same gap within each weather year: v3's footnote, the years paired
  const perYear = P.gas.years.map((y) => y.v - (P[TOP].years.find((x) => x.label === y.label)?.v ?? Number.NaN)).filter(Number.isFinite);
  return frame(title, "", `
  <div style="display:flex;gap:44px;height:100%">
    <div style="flex:none;width:1000px;padding-top:18px">${priceChart(P)}</div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:22px;padding-bottom:70px">
      ${impactBlock(t("THE WHOLE ESTONIAN ECONOMY"), t("consumption {twh} TWh × {gap} €/MWh", { twh: fmt(load), gap: fmt(gap(TOP)) }),
        t("{x} M€ a year", { x: fmt(load * gap(TOP), 0) }), "", others((id) => t("{name}: {x} M€ a year", { name: NAME[id], x: fmt(load * gap(id), 0) })))}
      ${imp ? `<div style="border-top:3px solid ${BRAND}"></div>
      ${impactBlock(t("ONE HOUSEHOLD"), t("{kwh} kWh a year × {gap} €/MWh, with VAT at {vat} %", { kwh: fmt(imp.kwh, 0), gap: fmt(gap(TOP)), vat: fmt(100 * imp.vat, 0) }),
        t("{x} € a year", { x: fmt(house(TOP), 0) }), t("or {x} € a month", { x: fmt(house(TOP) / 12) }),
        others((id) => t("{name}: {x} € a year", { name: NAME[id], x: fmt(house(id), 0) })), t("Consumption: {src}", { src: esc(imp.sources.split(";")[0]) }))}` : ""}
    </div>
  </div>
  <div style="position:absolute;left:0;bottom:8px;width:1760px;font-size:21px;font-weight:500;color:${MUTED};line-height:1.4">${t("{gap} €/MWh is the price gap between {a} and {b}, the gap between the two weighted averages.", { gap: fmt(gap(TOP)), a: NAME.gas, b: NAME[TOP] })}${perYear.length > 1 ? ` ${t("Within each weather year apart, the gap is {lo}–{hi} €/MWh.", { lo: fmt(Math.min(...perYear)), hi: fmt(Math.max(...perYear)) })}` : ""}</div>`);
};

// ---- 8 · imports and the hours gas sets the price ------------------------------------------------------------------------
interface Bar { st: Stat; name: string; fill: string; ink: string; units: number; flame: boolean }
const scenBars = (S: Record<DeckId, Stat>): Bar[] => SC.map((id) => ({ st: S[id], name: NAME[id], fill: FILL[id], ink: id === "gas" ? INK : BRAND, units: UNITS[id], flame: id === "gas" }));
/** An axis around zero with room for the whiskers' captions. */
const axis = (S: Record<DeckId, Stat>, pad = 0.14) => {
  const lo = Math.min(0, ...SC.map((id) => S[id].min)), hi = Math.max(0, ...SC.map((id) => S[id].max)), p = (hi - lo || 1) * pad;
  return { MIN: lo < 0 ? lo - p : 0, MAX: hi > 0 ? hi + p : p };
};
const CHART_W = 795;
/** v3's bar with the weather years' whisker, one function for every bar chart of the deck: the bar to the weighted
 * figure, the whisker from the lowest year to the highest, the figure at the right; `sub` a second, smaller line. */
const bars = (rows: Bar[], o: { MIN: number; MAX: number; dp: number; unit: string; sub?: (v: number) => string; RH?: number; W?: number }) => {
  const Wc = o.W ?? CHART_W, RH = o.RH ?? (o.sub ? 92 : 64);
  const Hc = 44 + (rows.length - 1) * RH + (o.sub ? 50 : 30);
  const LEFT = 190, RIGHT = Wc - 175, BH = 34, CAP = BH / 2 - 3; // room for three atoms and a name
  const x = (v: number) => LEFT + ((v - o.MIN) / (o.MAX - o.MIN)) * (RIGHT - LEFT);
  const x0 = x(0);
  const num = (v: number) => (o.MIN < 0 ? signed(v, o.dp) : fmt(v, o.dp));
  const one = (r: Bar, cy: number) => {
    const v = r.st.w, bx = v >= 0 ? x0 : x(v), bwid = Math.max(4, Math.abs(x(v) - x0)), lo = x(r.st.min), hi = x(r.st.max);
    const CT = `font-size="17" font-weight="500" fill="${MUTED}" text-anchor="middle"`;
    const caps = hi - lo < 92 ? `<text x="${(lo + hi) / 2}" y="${cy - 26}" ${CT}>${fmt(r.st.min, o.dp)}&#160;·&#160;${fmt(r.st.max, o.dp)}</text>`
      : `<text x="${lo}" y="${cy - 26}" ${CT}>${fmt(r.st.min, o.dp)}</text><text x="${hi}" y="${cy - 26}" ${CT}>${fmt(r.st.max, o.dp)}</text>`;
    const whisker = (stroke: string, width: number) => `<g stroke="${stroke}" stroke-width="${width}" stroke-linecap="round"><line x1="${lo}" y1="${cy}" x2="${hi}" y2="${cy}"/><line x1="${lo}" y1="${cy - CAP}" x2="${lo}" y2="${cy + CAP}"/><line x1="${hi}" y1="${cy - CAP}" x2="${hi}" y2="${cy + CAP}"/></g>`;
    const label = r.units ? `${atomRow(r.units, r.fill, 10, cy, 18, 21)}<text x="${14 + r.units * 21}" y="${cy + 9}" font-size="24" font-weight="600" fill="${r.ink}">${esc(r.name)}</text>`
      : r.flame ? `${svgIcon("flame", GAS_DEEP, 26, 11, cy)}<text x="32" y="${cy + 9}" font-size="24" font-weight="600" fill="${r.ink}">${esc(r.name)}</text>`
        : `<text x="0" y="${cy + 9}" font-size="24" font-weight="600" fill="${r.ink}">${esc(r.name)}</text>`;
    return `<rect x="${bx}" y="${cy - BH / 2}" width="${bwid}" height="${BH}" rx="4" fill="${r.fill}"/>
      ${r.st.max > r.st.min ? `${whisker("#fff", 5)}${whisker(INK, 3)}${caps}` : ""}${label}
      <text x="${Wc}" y="${cy + 12}" font-size="34" font-weight="800" fill="${r.ink}" text-anchor="end">${num(v)} <tspan font-size="20" font-weight="600">${o.unit}</tspan></text>
      ${o.sub ? `<text x="${Wc}" y="${cy + 38}" font-size="15" font-weight="500" fill="${MUTED}" text-anchor="end">${o.sub(v)}</text>` : ""}`;
  };
  return `<svg width="${Wc}" height="${Hc}" viewBox="0 0 ${Wc} ${Hc}" aria-hidden="true"><line x1="${x0}" y1="4" x2="${x0}" y2="${Hc - 4}" stroke="#9CA3AF" stroke-width="2"/>${rows.map((r, i) => one(r, 44 + i * RH)).join("")}</svg>`;
};
/** A share of the year's hours in hours and whole days (v3: 8 760 hours, days floored). */
const hoursSub = (p: number) => { const h = Math.round((p / 100) * 8760); return t("≈ {h} h, or {d} full days", { h: fmt(h, 0), d: Math.floor(h / 24) }); };
const verdict = (name: string, c: string, txt: string) => `
  <div style="display:flex;gap:4px;align-items:flex-start;font-size:25px;font-weight:700;line-height:1.35;color:${c}"><span style="flex:none;padding-top:1px">${icon(name, c, 30)}</span><span>${txt}</span></div>`;
const s7 = (d: DeckInput) => {
  const title = t("Dependence on cables and neighbours");
  const N = four(d.trio, NET), B = four(d.trio, BALANCE), G = four(d.trio, GAS_SET);
  if (!N || !B || !G) return frame(title, "", pending());
  const Gp = Object.fromEntries(SC.map((id) => [id, pct(G[id])])) as Record<DeckId, Stat>;
  const k = Gp[TOP].w > 0 ? Gp.gas.w / Gp[TOP].w : Number.POSITIVE_INFINITY;
  const lead = t("It is the dear gas hours that raise the year's average price.") + " "
    + (Gp.gas.w <= 0 ? "" : !Number.isFinite(k) ? t("With {name} there are none: local capacity pushes gas out of the market.", { name: NAME[TOP] })
      : k >= 1.2 ? t("With {name} there are {k} times fewer of them, as local capacity pushes gas out of the market.", { name: NAME[TOP], k: fmt(k, 1) }) : "");
  // within ±0.5 TWh the sign says nothing at the slide's precision: «roughly balanced» (D-280)
  const balanced = Math.abs(N[TOP].w) < 0.5;
  const role = N[TOP].w < 0 ? t("exporter") : t("importer");
  return frame(title, "", `
  <div style="position:absolute;inset:0">
    <div style="position:absolute;left:880px;top:4px;bottom:4px;width:1px;background:${GRID}"></div>
    <div style="position:absolute;left:0;top:0;width:${CHART_W}px;height:100%">
      <div style="position:absolute;top:10px;${SECT}">${t("ESTONIA'S NET ELECTRICITY IMPORT")}</div>
      <div style="position:absolute;top:58px">${bars(scenBars(N), { ...axis(N), dp: 1, unit: "TWh" })}</div>
      <div style="position:absolute;top:382px;${SECT}">${t("ESTONIA'S ELECTRICITY TRADE BALANCE")}</div>
      <div style="position:absolute;top:430px">${bars(scenBars(B), { ...axis(B), dp: 0, unit: t("M€") })}</div>
    </div>
    <div style="position:absolute;left:965px;top:0;width:${CHART_W}px;height:100%">
      <div style="position:absolute;top:10px;${SECT}">${t("SHARE OF HOURS A GAS PLANT SETS ESTONIA'S PRICE")}</div>
      <div style="position:absolute;top:50px;left:0;right:0;font-size:23px;font-style:italic;font-weight:500;color:${MUTED};line-height:1.42">${lead}</div>
      <div style="position:absolute;top:168px">${bars(scenBars(Gp), { MIN: 0, MAX: 100, dp: 1, unit: "%", sub: hoursSub })}</div>
      <div style="position:absolute;left:0;right:0;bottom:6px;display:flex;flex-direction:column;gap:14px">
        ${verdict("atom", BRAND, balanced ? t("With {name} Estonia's imports and exports roughly balance; its electricity trade balance (exports less imports) is {x} M€ a year.", { name: NAME[TOP], x: signed(B[TOP].w, 0) })
          : t("With {name} Estonia is a net {role}; its electricity trade balance (exports less imports) is {x} M€ a year.", { name: NAME[TOP], role, x: signed(B[TOP].w, 0) }))}
        ${verdict("flame", GAS_DEEP, B.gas.w < 0 ? t("With {name}, {x} M€ a year leaves Estonia's economy for electricity.", { name: NAME.gas, x: fmt(-B.gas.w, 0) })
    : t("With {name} Estonia's electricity trade balance is {x} M€ a year in the black.", { name: NAME.gas, x: fmt(B.gas.w, 0) }))}
      </div>
    </div>
  </div>`);
};

// ---- 9 · the year the EstLink cables are out -----------------------------------------------------------------------------
const cableMark = (ok: boolean, label: string, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" role="img" style="flex:none;display:inline-block;margin-right:5px"><title>${esc(label)}</title>
  <circle cx="12" cy="12" r="11" fill="${ok ? GREEN : GAS_DEEP}"/>${ok ? '<path d="M7.4 12.4l3.2 3.3 6-6.6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
  : '<path d="M8.3 8.3l7.4 7.4M15.7 8.3l-7.4 7.4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>'}</svg>`;
const OUT_METRICS: [label: string, unit: string, f: (v: RunView) => number | undefined, show: (v: number) => string][] = [
  [t("Wholesale price"), "€/MWh", PRICE, (v) => fmt(v, 1)],
  [t("Gas-set hours"), "%", GAS_SET, (v) => fmt(100 * v, 1)],
  [t("Net import"), "TWh", NET, (v) => signed(v, 1)],
  [t("Trade balance"), t("M€"), BALANCE, (v) => signed(v, 0)],
];
const GRID_COLS = "grid-template-columns:330px repeat(4, 1fr);column-gap:14px";
// the three scenarios' blocks spread down the column, where the four's stood close (the owner, 2026-11-13; D-251)
const OUT_GAP = 24, OUT_ROW = 6;
const outMatrix = (d: DeckInput) => {
  const STATES: [label: string, tr: Trio, stressed: boolean, up: [boolean, boolean]][] = [
    [t("All cables in service"), d.trio, false, [true, true]], [t("Without EstLink 2"), d.e2, true, [true, false]], [t("Without EstLinks 1 and 2"), d.e12, true, [false, false]],
  ];
  return `<div style="display:grid;${GRID_COLS};align-items:end;padding:0 0 6px"><span></span>
    ${OUT_METRICS.map(([lbl]) => `<span style="text-align:right;font-size:19px;font-weight:600;color:${MUTED};line-height:1.25">${lbl}</span>`).join("")}</div>
  ${SC.map((id) => `<div style="display:grid;${GRID_COLS};align-items:baseline;border-top:2px solid ${FILL[id]};padding:8px 0 4px;margin-top:${OUT_GAP}px">
    <span style="font-size:22px;font-weight:700;color:${id === "gas" ? INK : BRAND};white-space:nowrap">${markHtml(id, 20)}${NAME[id]}</span></div>
    ${STATES.map(([label, tr, stressed, up]) => `<div style="display:grid;${GRID_COLS};align-items:baseline;padding:${OUT_ROW}px 0">
      <span style="font-size:19px;font-weight:${stressed ? 600 : 500};color:${stressed ? INK : MUTED};display:flex;align-items:center">${up.map((o, i) => cableMark(o, `EstLink ${i + 1} — ${o ? t("in service") : t("out")}`, 20)).join("")}<span style="margin-left:5px">${label}</span></span>
      ${OUT_METRICS.map(([, unit, f, show]) => { const x = stat(tr[id], f);
    return `<span style="text-align:right;font-size:${stressed ? 25 : 23}px;font-weight:${stressed ? 800 : 600};color:${!x ? "#9CA3AF" : stressed ? (id === "gas" ? GAS_DEEP : FILL[id]) : MUTED};white-space:nowrap">${x ? show(x.w) : "…"}<span style="font-size:15px;font-weight:500;color:${MUTED};margin-left:3px">${unit}</span></span>`; }).join("")}
    </div>`).join("")}`).join("")}`;
};
const OUT_RIGHT_W = 660;
/** EstLink 2's two outages of 2024–2025 on a 24-month line, the dates from Fingrid's and Elering's notices (v3). */
const outageTimeline = (Wc = OUT_RIGHT_W) => {
  const y0 = 62, BH = 34;
  const x = (dd: string) => { const [Y, M, D] = dd.split("-").map(Number); return (((Y - 2024) * 12 + (M - 1) + (D - 1) / 30.5) / 24) * Wc; };
  const breakGlyph = (cx: number, cy: number) => `<g stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"><line x1="${cx - 34}" y1="${cy}" x2="${cx - 12}" y2="${cy}"/><line x1="${cx + 12}" y1="${cy}" x2="${cx + 34}" y2="${cy}"/><line x1="${cx - 12}" y1="${cy - 7}" x2="${cx - 12}" y2="${cy + 7}"/><line x1="${cx + 12}" y1="${cy + 7}" x2="${cx + 12}" y2="${cy - 7}"/><path d="M${cx + 3} ${cy - 10} l-7 9 h5 l-4 11" stroke-width="2.5" stroke-linejoin="round"/></g>`;
  const span = (from: string, to: string, txt: string, line: number) => `<rect x="${x(from)}" y="${y0}" width="${x(to) - x(from)}" height="${BH}" rx="4" fill="${GAS}"/>${breakGlyph((x(from) + x(to)) / 2, y0 + BH / 2)}
    <text x="0" y="${y0 + BH + 28 + line * 26}" font-size="18" font-weight="600" fill="${INK}">${txt}</text>`; // both from the left: the English runs long
  return `<svg width="${Wc}" height="170" viewBox="0 0 ${Wc} 170" aria-hidden="true"><rect x="0" y="${y0}" width="${Wc}" height="${BH}" rx="4" fill="${GRID}"/>
    ${Array.from({ length: 25 }, (_, i) => (i / 24) * Wc).map((mx, i) => (i % 12 === 0 ? `<line x1="${mx}" y1="${y0 - 8}" x2="${mx}" y2="${y0 + BH + 8}" stroke="${MUTED}" stroke-width="2"/>` : `<line x1="${mx}" y1="${y0}" x2="${mx}" y2="${y0 + BH}" stroke="#fff" stroke-width="1"/>`)).join("")}
    <text x="${x("2024-07-01")}" y="${y0 - 18}" font-size="21" font-weight="700" fill="${MUTED}" text-anchor="middle">2024</text><text x="${x("2025-07-01")}" y="${y0 - 18}" font-size="21" font-weight="700" fill="${MUTED}" text-anchor="middle">2025</text>
    ${span("2024-01-26", "2024-09-04", t("26 Jan – 4 Sep 2024 · a cable fault on the Estonian coast, 7 months"), 0)}
    ${span("2024-12-25", "2025-06-20", t("25 Dec 2024 – 20 Jun 2025 · a ship's anchor, 6 months"), 1)}</svg>`;
};
const s8 = (d: DeckInput) => {
  const title = t("What happens if the EstLink cables go down?");
  if (!SC.every((id) => d.trio[id])) return frame(title, "", pending());
  const change = (tr: Trio, id: DeckId) => { const a = stat(tr[id], PRICE), b = stat(d.trio[id], PRICE); return a && b ? signed(a.w - b.w, 0) : null; };
  const said = (id: DeckId) => { const a = change(d.e2, id), b = change(d.e12, id); return a !== null && b !== null ? t("{name}: without EstLink 2 the price changes by {a} €/MWh, without both cables by {b} €/MWh.", { name: NAME[id], a, b }) : null; };
  const g12 = stat(d.e12.gas, GAS_SET);
  const vTop = said(TOP), v0 = said("gas");
  return frame(title, "", `
  <div style="position:absolute;inset:0">
    <div style="position:absolute;left:1010px;top:4px;bottom:4px;width:1px;background:${GRID}"></div>
    <div style="position:absolute;left:0;top:0;width:940px">
      <div style="${SECT};font-size:19px;margin-bottom:14px">${t("ESTONIA, WEIGHTED OVER THE WEATHER YEARS")}${SC.every((id) => d.e2[id] && d.e12[id]) ? "" : `<span style="margin-left:14px;font-weight:600;letter-spacing:0">${t("computing…")}</span>`}</div>
      ${outMatrix(d)}
    </div>
    <div style="position:absolute;left:1090px;top:0;width:${OUT_RIGHT_W}px;height:100%">
      <div style="${SECT}">${t("THIS IS NOT A HYPOTHETICAL")}</div>
      <div style="position:absolute;top:50px">${outageTimeline()}</div>
      <div style="position:absolute;top:236px;left:0;right:0;font-size:23px;font-style:italic;font-weight:500;color:${MUTED};line-height:1.45">${t("In two of the last six years half of the link to Finland was out for 5–7 months. NordBalt (Lithuania–Sweden) stood still for three weeks in 2023, EstLink 1's converter for three weeks in 2025. The model's headline figures assume every cable works.")}</div>
      <div style="position:absolute;left:0;right:0;bottom:6px;display:flex;flex-direction:column;gap:14px">
        ${vTop ? verdict("atom", BRAND, vTop) : ""}
        ${v0 ? verdict("flame", GAS_DEEP, v0 + (g12 ? " " + t("Without both, gas sets the price in {p} % of the hours.", { p: fmt(100 * g12.w, 0) }) : "")) : ""}
      </div>
    </div>
  </div>`);
};

// ---- 10 · CO₂ beside the EU's climate framework ---------------------------------------------------------------------------
// direct emissions of generation, g CO₂-eq/kWh: IPCC AR5 WG III, Annex III, Table A.III.2, the "Direct emissions" column
// (min / median / max) as v3 read it — combined-cycle gas, and nuclear's plain 0 (doi:10.1017/CBO9781107415416.025, the
// methodology §8.9); the EU's milestones as v3 verified them on EUR-Lex (2026-08-28): Regulation (EU) 2021/1119 Art. 2(1),
// its 2040 target written in by Regulation (EU) 2026/667 — signed 11 March 2026, in the Official Journal 18 March, in
// force 7 April 2026 (ERRATA E-183: v3 said March). Named, not linked: the built site holds no third-party address
// (R-NFR-1, scripts/site_check.ts), where v3's slide linked them
const fixed = (v: number, lo: number, hi: number): Stat => ({ w: v, min: lo, max: hi, years: [] });
const milestone = (year: string, target: string, src: string) => `
  <div style="display:flex;gap:28px;align-items:baseline;border-top:1px solid ${GRID};padding:20px 0 18px">
    <span style="flex:none;width:130px;font-size:44px;font-weight:800;color:${BRAND}">${year}</span>
    <span style="flex:1"><div style="font-size:27px;font-weight:700;color:${INK};line-height:1.3">${target}</div><div style="font-size:20px;font-weight:500;color:${MUTED};margin-top:4px">${src}</div></span>
  </div>`;
const s9 = (d: DeckInput) => {
  const title = t("CO₂ and the EU's climate targets");
  const C = four(d.trio, CO2);
  if (!C) return frame(title, "", pending());
  const top = Math.max(...SC.map((id) => C[id].max));
  return frame(title, "", `
  <div style="position:absolute;inset:0">
    <div style="position:absolute;left:880px;top:4px;bottom:4px;width:1px;background:${GRID}"></div>
    <div style="position:absolute;left:0;top:0;width:${CHART_W}px;height:100%">
      <div style="position:absolute;top:0;${SECT}">${t("DIRECT CO₂ EMISSIONS IN ESTONIA")}</div>
      <div style="position:absolute;top:44px">${bars(scenBars(C), { MIN: 0, MAX: Math.max(0.5, top * 1.25), dp: 2, unit: t("Mt/yr") })}</div>
      <div style="position:absolute;top:340px;${SECT}">${t("DIRECT CO₂ PER UNIT GENERATED")}</div>
      <div style="position:absolute;top:376px;font-size:20px;font-weight:500;color:${MUTED}">${t("{src}: direct emissions, the median and the range over the studies", { src: t("IPCC AR5, Annex III, Table A.III.2") })}</div>
      <div style="position:absolute;top:416px">${bars([
        { st: fixed(370, 350, 490), name: t("Gas"), fill: GAS, ink: INK, units: 0, flame: true },
        { st: fixed(0, 0, 0), name: t("Nuclear"), fill: BRAND, ink: BRAND, units: 0, flame: false },
      ], { MIN: 0, MAX: 560, dp: 0, unit: "g/kWh" })}</div>
      <div style="position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;gap:14px">
        ${verdict("atom", BRAND, t("A nuclear plant runs without CO₂ emissions."))}
        ${verdict("flame", GAS_DEEP, t("A gas plant emits CO₂ over its whole life."))}
      </div>
    </div>
    <div style="position:absolute;left:965px;top:0;width:${CHART_W}px;height:100%">
      <div style="position:absolute;top:0;${SECT}">${t("THE EU'S BINDING CLIMATE FRAMEWORK")}</div>
      <div style="position:absolute;top:70px;left:0;right:0">
        ${milestone("2040", t("Net emissions −90 % against 1990"), t("Regulation (EU) 2026/667, in force since April 2026"))}
        ${milestone("2050", t("Climate neutrality: net emissions zero"), t("European Climate Law (EU) 2021/1119, Article 2"))}
      </div>
      <div style="position:absolute;top:400px;left:0;right:0;border-left:5px solid ${GREEN};padding-left:30px;font-size:26px;font-style:italic;font-weight:500;color:${INK};line-height:1.45">
        ${t("“… emissions and removals … balanced within the Union at the latest by 2050 …”")}
        <div style="font-size:20px;font-style:normal;color:${MUTED};margin-top:8px">${t("European Climate Law, Article 2(1)")}</div>
      </div>
      <div style="position:absolute;left:0;right:0;bottom:0;font-size:24px;font-style:italic;font-weight:500;color:${MUTED};line-height:1.45">${t("Climate neutrality means that a gas fleet built by 2035 would have to bring its net emissions to zero, or close, 15 years later.")}</div>
    </div>
  </div>`);
};

// ---- 12 · the energy trilemma -----------------------------------------------------------------------------------------
const triCol = (mark: string, title: string, metric: string, S: Record<DeckId, Stat>, dp: number, unit: string, badge: (id: DeckId) => string) => `
  <div style="flex:1;border-top:6px solid ${BRAND};padding:26px 36px 0">
    <div style="display:flex;align-items:center;margin-bottom:6px">${icon(mark, BRAND, 34)}<span style="font-size:29px;font-weight:700;letter-spacing:.06em;color:${INK}">${title}</span></div>
    <div style="font-size:23px;font-weight:500;color:${MUTED};margin-bottom:22px">${metric}</div>
    ${SC.map((id) => `<div style="display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid ${GRID};padding:${id === "gas" ? 18 : 14}px 0">
      <span style="font-size:25px;font-weight:600;color:${id === "gas" ? GAS_DEEP : INK};white-space:nowrap">${markHtml(id, 22)}${NAME[id]}</span>
      <span style="text-align:right"><span style="font-size:${id === "gas" ? 42 : 38}px;font-weight:800;color:${id === "gas" ? GAS_DEEP : FILL[id]}">${fmt(S[id].w, dp)}<span style="font-size:22px;font-weight:600"> ${unit}</span></span>
      ${id === "gas" ? "" : `<span style="display:block;font-size:19px;font-weight:700;color:${INK};white-space:nowrap">${badge(id)}</span>`}</span></div>`).join("")}
  </div>`;
const s11 = (d: DeckInput) => {
  const title = t("The energy trilemma: three at once");
  const P = four(d.trio, PRICE), N = four(d.trio, NET), C = four(d.trio, CO2);
  if (!P || !N || !C) return frame(title, "", pending());
  const drop = (S: Record<DeckId, Stat>) => (id: DeckId) => {
    const x = S.gas.w ? Math.round(((S[id].w - S.gas.w) / Math.abs(S.gas.w)) * 100) : 0;
    return `${deltaMark(x > 0, 15, 4, x > 0 ? GAS_DEEP : GREEN)}${x > 0 ? "+" : x < 0 ? "−" : ""}${fmt(Math.abs(x), 0)} %`;
  };
  // net import crosses zero: its change in TWh, a sign flip being no percentage (v3)
  const diff = (id: DeckId) => { const x = N[id].w - N.gas.w; return `${deltaMark(x > 0, 15, 4, x > 0 ? GAS_DEEP : GREEN)}${signed(x, 1)} ${t("TWh/yr")}`; };
  return frame(title, "", `
  <div style="display:flex;gap:48px">
    ${triCol("euro", t("AFFORDABILITY"), t("Wholesale price in Estonia, weighted"), P, 1, "€/MWh", drop(P))}
    ${triCol("shield", t("SECURITY OF SUPPLY"), t("Estonia's net import"), N, 1, t("TWh/yr"), diff)}
    ${triCol("leaf", t("CLIMATE"), t("CO₂ emissions in Estonia"), C, 2, t("Mt/yr"), drop(C))}
  </div>`);
};

// ---- 4 · how accurate the model is: the past years beside the market, Estonia (D-229, D-240, D-244) ----------------------
// the Model view's four charts of a replay, Estonia's alone, for each of the gate's years in a column of its own (the
// owner asked, 2026-11-12; D-244): the energy sources of the model and of the record, the price duration curve, and the
// monthly average and median price with each month's figure, the market solid and the model dashed (D-255). The build computes
// the replays with its sets, the page any it lacks. 2026 a fourth column since D-253, its months as far as they are in.
const MODEL_C = BRAND, MARKET_C = INK;
const COL_W = 416; // four columns across the body's 1760, 32 apart (three of 560 until D-253)
const lineKey = (dashed: boolean, c: string) => `<svg width="30" height="10" aria-hidden="true"><line x1="0" y1="5" x2="30" y2="5" stroke="${c}" stroke-width="${dashed ? 3 : 4}"${dashed ? ' stroke-dasharray="7 5"' : ""}/></svg>`;
const box = (title: string, body: string) => `<div><div style="height:22px;font-size:16px;font-weight:700;letter-spacing:.08em;color:${MUTED};white-space:nowrap">${title}</div>${body}</div>`;
/** A value axis: from a floor at or under the data's lowest to a top at or over its highest, in steps of `step`. */
function valueAxis(lo: number, hi: number, step: number) {
  const a = Math.min(0, Math.floor(lo / step) * step), b = Math.max(step, Math.ceil(hi / step) * step);
  return { a, b, ticks: Array.from({ length: Math.round((b - a) / step) + 1 }, (_, i) => a + i * step) };
}
const X0 = 46, Y0 = 8, FOOT = 24, PW = COL_W - X0 - 6, AXIS = `font-size="14" font-weight="500" fill="#9CA3AF"`;
/** A line chart `h` high of the model and the market on one value axis, `xs` the points' share of the width; with
 * `figures` each point carries its value, over the higher of the two lines and under the lower (D-244). */
function lines(model: (number | null)[], market: (number | null)[], xs: number[], step: number, cut: number | null, xlab: string, figures: boolean, h: number): string {
  const PH = h - Y0 - FOOT;
  const vals = [...model, ...market].filter((v): v is number => v !== null).map((v) => (cut === null ? v : Math.min(v, cut)));
  const { a, b, ticks } = valueAxis(Math.min(...vals), Math.max(...vals), step);
  const y = (v: number) => Y0 + PH - ((Math.min(cut ?? v, v) - a) / (b - a)) * PH, x = (f: number) => X0 + f * PW;
  const path = (v: (number | null)[]) => v.map((q, i) => (q === null ? "" : `${i && v[i - 1] !== null ? "L" : "M"}${x(xs[i]).toFixed(1)} ${y(q).toFixed(1)}`)).join("");
  const grid = ticks.map((v) => `<line x1="${X0}" y1="${y(v)}" x2="${X0 + PW}" y2="${y(v)}" stroke="${GRID}" stroke-width="${v ? 1 : 2}"/><text x="${X0 - 8}" y="${y(v) + 5}" ${AXIS} text-anchor="end">${fmt(v, 0)}</text>`).join("");
  let marks = "";
  if (figures) {
    const at = (v: number, up: boolean) => Math.max(Y0 + 10, Math.min(Y0 + PH + 14, up ? y(v) - 8 : y(v) + 17));
    model.forEach((mv, i) => {
      const kv = market[i], up = mv !== null && (kv === null || mv >= kv);
      marks += `${mv === null ? "" : `<circle cx="${x(xs[i])}" cy="${y(mv)}" r="3.5" fill="${MODEL_C}"/>`}${kv === null ? "" : `<circle cx="${x(xs[i])}" cy="${y(kv)}" r="3.5" fill="${MARKET_C}"/>`}`
        + (mv === null ? "" : `<text x="${x(xs[i])}" y="${at(mv, up)}" font-size="13" font-weight="700" fill="${MODEL_C}" text-anchor="middle">${fmt(mv, 0)}</text>`)
        + (kv === null ? "" : `<text x="${x(xs[i])}" y="${at(kv, !up)}" font-size="13" font-weight="600" fill="${MARKET_C}" text-anchor="middle">${fmt(kv, 0)}</text>`);
    });
  }
  return `<svg width="${COL_W}" height="${h}" viewBox="0 0 ${COL_W} ${h}" aria-hidden="true">${grid}
    <path d="${path(market)}" fill="none" stroke="${MARKET_C}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="${path(model)}" fill="none" stroke="${MODEL_C}" stroke-width="3" stroke-dasharray="7 5" stroke-linejoin="round"/>${marks}
    ${xlab}</svg>`;
}
/** The year's hours sorted from the dearest, at `n` points. */
const sorted = (a: ArrayLike<number>, n = 240) => { const s = Array.from(a).sort((p, q) => q - p); return Array.from({ length: n }, (_, i) => s[Math.round((i / (n - 1)) * (s.length - 1))]); };
const CUT = 400;
function curve(m: Side, k: Side): string {
  // 124 high since the years' heads give each average on a line of its own (D-251), 132 before
  const n = 240, h = 124, xs = Array.from({ length: n }, (_, i) => i / (n - 1)), hours = m.price.length;
  const over = (a: ArrayLike<number>) => Array.from(a).filter((v) => v > CUT).length;
  const cut = Math.max(...Array.from(m.price), ...Array.from(k.price)) > CUT;
  const marks = [0, 0.25, 0.5, 0.75, 1].map((f) => `<text x="${X0 + f * PW}" y="${h - 6}" ${AXIS} text-anchor="${f === 0 ? "start" : f === 1 ? "end" : "middle"}">${fmt(Math.round(f * hours), 0)}</text>`).join("");
  const note = cut ? t("above {top} €/MWh: model {m} h, market {a} h", { top: CUT, m: over(m.price), a: over(k.price) }) : t("hours at or above the price");
  // the note in the plot's upper right, which a curve sorted from the dearest hour leaves empty
  return box(t("PRICE DURATION CURVE, €/MWh"), lines(sorted(m.price, n), sorted(k.price, n), xs, 100, cut ? CUT : null,
    `${marks}<text x="${X0 + PW}" y="${Y0 + 16}" font-size="14" font-weight="500" fill="${MUTED}" text-anchor="end">${note}</text>`, false, h));
}
function months(title: string, m: (number | null)[], k: (number | null)[]): string {
  const h = 180, xs = MONTHS.map((_, i) => (i + 0.5) / 12);
  // each month by its initial: four columns leave a month 30 px (D-253)
  const lab = MONTHS.map((n, i) => `<text x="${X0 + xs[i] * PW}" y="${h - 6}" font-size="13" font-weight="500" fill="#9CA3AF" text-anchor="middle">${n.charAt(0).toUpperCase()}</text>`).join("");
  return box(title, lines(m, k, xs, 50, null, lab, true, h));
}
/** The energy sources, a bar for the model and one for the record, the groups in the Model view's colours. */
function sources(m: Side, k: Side, present: Group[]): string {
  const tot = (s: Side) => present.reduce((a, g) => a + s.mix[g], 0), top = Math.max(tot(m), tot(k));
  const LW = 70, BW = COL_W - LW - 58, scale = (v: number) => (v / top) * BW;
  const bar = (s: Side, name: string) => {
    let x = 0;
    const seg = present.map((g) => { const w = scale(s.mix[g]); const r = `<rect x="${LW + x}" y="0" width="${Math.max(0, w - 2)}" height="30" rx="3" style="fill:var(--g-${g})"/>`
      + (w > 42 ? `<text x="${LW + x + w / 2 - 1}" y="21" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">${fmt(s.mix[g], 1)}</text>` : ""); x += w; return r; }).join("");
    return `<svg width="${COL_W}" height="30" viewBox="0 0 ${COL_W} 30" aria-hidden="true"><text x="0" y="21" font-size="17" font-weight="600" fill="${INK}">${name}</text>${seg}
      <text x="${LW + x + 8}" y="21" font-size="17" font-weight="800" fill="${INK}">${fmt(tot(s), 1)}</text></svg>`;
  };
  return box(t("ENERGY SOURCES, TWh"), `<div style="display:flex;flex-direction:column;gap:6px;padding-top:4px">${bar(m, t("model"))}${bar(k, t("market"))}</div>`);
}
/** The slide's keys in the frame's upper right: the two lines', and the energy groups' that any year's bars show; 660
 * wide, clear of the English title, the groups on two lines when 2026's storage joins them (D-253) */
const keys = (present: Group[]) => `<div style="position:absolute;right:96px;top:58px;width:660px;display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-size:18px;font-weight:600;color:${INK}">
  <span style="display:inline-flex;gap:22px"><span>${lineKey(true, MODEL_C)} ${t("model")}</span><span>${lineKey(false, MARKET_C)} ${t("market")}</span></span>
  <span style="display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px 18px;font-weight:500">${present.map((g) => `<span style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap"><span style="width:14px;height:14px;border-radius:3px;background:var(--g-${g})"></span>${esc(GROUP_LABEL[g])}</span>`).join("")}</span></div>`;
const s13 = (d: DeckInput) => {
  const title = t("How accurate is the model?"), reps = d.rep;
  if (!reps?.length) return frame(title, "", pending());
  const sides = reps.flatMap((r) => (r.model && r.market ? [r.model, r.market] : []));
  const present = GROUPS.filter((g) => sides.some((x) => x.mix[g] >= 0.005));
  const column = (r: (typeof reps)[number]) => {
    const m = r.model, k = r.market;
    // the year's average price in the model and in the market (the owner, 2026-11-13; D-250, D-251), where the hourly
    // error stood (D-240); their difference in per cent out since D-258
    const avg = m && k ? { m: mean(m.price), k: mean(k.price) } : null;
    const mm = m && monthly(m.price), km = k && monthly(k.price);
    // a year whose months are not all in names them under the year (2026, D-253)
    const n = km ? km.mean.filter((v) => v !== null).length : 12;
    const span = n < 12 ? `<span style="font-size:13px;font-weight:600;color:${MUTED}">${MONTHS[0]}–${MONTHS[n - 1]}</span>` : "";
    const head = `<div style="display:flex;align-items:center;gap:8px;height:46px;white-space:nowrap"><span style="display:flex;flex-direction:column;line-height:1"><span style="font-size:30px;font-weight:800;color:${BRAND}">${r.year}</span>${span}</span>${!avg ? ""
      : `<span style="display:flex;flex-direction:column;line-height:1.2"><span style="font-size:12px;font-weight:700;letter-spacing:.08em;color:${MUTED}">${t("AVERAGE PRICE OF THE YEAR, €/MWh")}</span>
        <span style="font-size:15px;font-weight:500;color:${INK}">${t("model {m} · market {k}", { m: `<b style="font-size:24px;color:${MODEL_C}">${fmt(avg.m, 1)}</b>`, k: `<b style="font-size:24px">${fmt(avg.k, 1)}</b>` })}</span></span>`}</div>`;
    if (!m || !k || !mm || !km) return `<div style="width:${COL_W}px">${head}${pending()}</div>`;
    return `<div style="width:${COL_W}px;display:flex;flex-direction:column;gap:8px">${head}${sources(m, k, present)}${curve(m, k)}${months(t("MONTHLY AVERAGE PRICE, €/MWh"), mm.mean, km.mean)}${months(t("MONTHLY MEDIAN PRICE, €/MWh"), mm.median, km.median)}</div>`;
  };
  return frame(title, "", `<div style="display:flex;justify-content:space-between">${reps.map(column).join("")}</div>`) + (present.length ? keys(present) : "");
};

// ---- 13 · the plant's account for the state over its life (the owner asked, 2026-11-12; D-246, D-247) ---------------------
// each scenario with the plant against 0 SMR, the figures of the model's year held for each year of the plant's design
// life and undiscounted. The sum is the consumers' and the taxpayers' account (D-247, as the sensitivities' net row,
// D-188): what consumers save on the lower price (the price slide's) over the whole life, less what the state pays
// under the contract for difference at the strike (results.ts statePaysOf, the contract card's) over the contract's term
// alone — the owner's 40 years, after which the plant sells at the market price (D-250). Under it, for reference and not in the sum:
// the fall of Estonia's net import bill (the Presentation page's impact row, D-163), which holds part of the same
// saving, and the plant's construction at the owner's price (D-157), which the investor pays and the strike repays
const STATE_COLS = `grid-template-columns:690px repeat(${SC.length - 1}, 1fr);column-gap:24px`;
const sState = (d: DeckInput) => {
  const k = d.c.capex, years = k?.years ?? 60;
  const title = t("The plant's account for Estonia over {years} years", { years: fmt(years, 0) });
  const P = four(d.trio, PRICE), B = four(d.trio, BALANCE);
  if (!P || !B || !k) return frame(title, "", pending());
  const ids = SC.filter((id) => UNITS[id]);
  const load = demandTwh(d.s, d.trio.gas!);
  // a year's figures, M€: the saving on the price and the contract's cost, the sum's two; the money that stays, for
  // reference (the construction's row out since D-260)
  const saving = (id: DeckId) => load * (P.gas.w - P[id].w);
  const cfd = (id: DeckId) => statePaysOf(d.trio[id]!, d.c.strike, d.c.clause);
  const term = Math.min(years, d.c.cfdYears ?? years);
  const net = (id: DeckId) => saving(id) * years - cfd(id) * term;
  const stays = (id: DeckId) => B[id].w - B.gas.w;
  const big = (shown: string, size = 40, c: string = INK) => `<span style="font-size:${size}px;font-weight:800;color:${c};white-space:nowrap">${shown}<span style="font-size:${Math.round(size * 0.5)}px;font-weight:600;color:${MUTED};margin-left:6px">${t("bn €")}</span></span>`;
  const bnOf = (meur: number) => signed(meur / 1000, 1);
  const cell = (shown: string, sub: string, size = 40, c: string = INK) => `<div style="text-align:right">${big(shown, size, c)}<div style="font-size:${size < 40 ? 17 : 19}px;font-weight:500;color:${MUTED};margin-top:2px;white-space:nowrap">${sub}</div></div>`;
  const yearly = (x: number, n = years) => `${t("{x} M€ a year", { x: fmt(Math.abs(x), 0) })} × ${fmt(n, 0)}`;
  // a line of the sum; `strong` the sum itself; `aside` a figure for reference, smaller and in the muted ink
  const row = (mark: string, label: string, sub: string, cells: string[], kind: "" | "strong" | "aside" = "") => `<div style="display:grid;${STATE_COLS};align-items:center;border-top:${kind === "strong" ? `3px solid ${INK}` : `1px solid ${GRID}`};padding:${kind === "strong" ? 18 : kind === "aside" ? 8 : 13}px 0">
    <div style="display:flex;align-items:center;gap:18px">${mark}<div><div style="font-size:${kind === "strong" ? 34 : kind === "aside" ? 24 : 28}px;font-weight:${kind === "strong" ? 800 : 600};color:${kind === "aside" ? MUTED : INK}">${label}</div>${sub ? `<div style="font-size:${kind === "aside" ? 18 : 20}px;font-weight:500;color:${MUTED};margin-top:2px">${sub}</div>` : ""}</div></div>${cells.join("")}</div>`;
  const clause = d.c.clause ? t(", with the negative-price clause") : "";
  return frame(title, "", `
  <div style="display:grid;${STATE_COLS};align-items:end;padding-bottom:12px"><span style="${SECT}">${t("AGAINST {gas}, {years} YEARS", { gas: NAME.gas, years: fmt(years, 0) })}</span>
    ${ids.map((id) => `<div style="text-align:right;font-size:28px;font-weight:700;color:${BRAND};white-space:nowrap">${markHtml(id, 24)}${NAME[id]}<span style="font-size:19px;font-weight:500;color:${MUTED};margin-left:10px">${fmt(d.c.plantMw[id] ?? 0, 0)} MW</span></div>`).join("")}</div>
  ${row("", t("Consumers save on the electricity price"), t("consumption {twh} TWh × the price gap to {gas}", { twh: fmt(load), gas: NAME.gas }), ids.map((id) => cell(bnOf(saving(id) * years), yearly(saving(id)))))}
  ${row("", t("The contract for difference: gain or cost to the state"), t("strike {k} €/MWh", { k: fmt(d.c.strike, 0) }) + clause + (term < years ? t(", for {n} years; then the plant sells at the market price", { n: fmt(term, 0) }) : ""), ids.map((id) => cell(bnOf(-cfd(id) * term), yearly(cfd(id), term))))}
  ${row("", t("Total gain to Estonia over {years} years: consumers and state", { years: fmt(years, 0) }), t("the consumers' saving plus the state's gain or cost under the contract"), ids.map((id) => `<div style="text-align:right">${big(bnOf(net(id)), 54, net(id) < 0 ? GAS_DEEP : BRAND)}</div>`), "strong")}
  <div style="${SECT};font-size:19px;margin:26px 0 8px">${t("FOR REFERENCE, NOT IN THE SUM")}</div>
  ${row("", t("Money that stays in Estonia"), t("Estonia's net import bill falls; it holds part of the consumers' saving"), ids.map((id) => cell(bnOf(stays(id) * years), yearly(stays(id)), 30, MUTED)), "aside")}
  <div style="position:absolute;left:0;bottom:8px;width:1760px;font-size:20px;font-weight:500;color:${MUTED};line-height:1.45">${t("Each scenario against {gas}. The figures of {year} are held for each of the plant's {years} years, undiscounted. Contract for difference at a strike of {k} €/MWh{clause} for the first {term} years, the owner's assumption, then the market price.", { gas: NAME.gas, year: d.s.target, years: fmt(years, 0), k: fmt(d.c.strike, 0), clause, term: fmt(term, 0) })}</div>`);
};

// ---- 7 · why Finland's price stands above the profile's (D-263, D-264) ------------------------------------------------
// The owner's level on Finland's profile (D-194) beside what is on its way there: the data centres and the new industrial
// loads, as the Statistics page's two tabs hold them (D-214), and the large data centres planned, project by project
// (D-264) — each a plan or a queue, named so. Finland alone since the owner asked (D-264): Sweden's and Poland's cards out, each a slide of its own after it since D-279.
// `quote` the source's own words for the figure, shown in the link to it; `full` its sentence, the link's tip (D-270)
// `sub`, `more` the row's lines, their figures linked to the documents they come from (`Link`, D-276)
type Link = (doc: string, text: string, quote: string, page?: number, after?: string) => string; // `after`: the tip's words after the quotation (D-308)
type V = (k: string) => number;
// `doc`, `page`, `src` the document the row's plan stands in, its page and its name; `read` a figure read off a chart or
// a table, so its words are the slide's and stand without quotation marks; `plus` the plan an addition to the measured
// year (hydrogen, new loads), `toLabel` what it is (D-279)
// `image` a picture over the block, cropped round its subject, a link to its document with the credit the tip (D-286)
// `base` the base figure's year and its document where it is not Eurostat's of 2024 (D-289)
interface NbRow { image?: { src: string; alt: string; doc: string; credit: string }; base?: { year: number; doc: string; page: number; quote: string }; head: string; noFig?: boolean; table?: [string, number, number, string][]; from: string; to: string; toYear: number; plus?: boolean; toLabel?: string; who: string; doc: string; page: number; src: string; read?: boolean; quote: string; full: string; sub?: (v: V, a: Link) => string; more?: (v: V, a: Link) => string }
/** The documents the slide links to, as the site's sources name them; their addresses come with the sources
 * (`DeckInput.nb.urls`), so that the bundle holds no third-party address (R-NFR-1). Fingrid's forecast first. */
const LMA = "svk.langsiktig_marknadsanalys_2026", SVK_Q = "doc.svk_connections_2026_11_01", PRSP = "doc.pse_prsp_2027_2036_apr2026", PSE_LIST = "doc.pse_art78l_2026_09_30";
export const NB_DOCS = ["doc.fingrid_prospects_q3_2026_en", "doc.fingrid_2026_08_18_consumption", "doc.fortum_google_loviisa_2026", "doc.arctial_eia_report_2026",
  LMA, SVK_Q, "doc.cioanalytics_2026_11_02_datacenter", "doc.tkn_2023_05_22_stegra", "doc.brookfield_strangnas_2025", PRSP, PSE_LIST,
  // Eurostat's data browser for the 2024 figures, the reader's page of the tables the API's files come from (D-284)
  "doc.eurostat_db_isoc_env_ict_nrg", "doc.eurostat_db_nrg_bal_c"];
const NB_PAGE = 6;
const FORECAST = "Fingrid, Prospects for electricity production and consumption Q3/2026";
const FI_ROWS: NbRow[] = [
  // the base Fingrid's own, about 2 TWh in 2025, at the owner's word (D-289), as the industry's
  { base: { year: 2025, doc: NB_DOCS[0], page: NB_PAGE, quote: "their electricity consumption increases from approximately 2 terawatt-hours in 2025" },
    head: t("DATA CENTRES"), from: "statistics.dc.fi.fingrid_2025_twh", to: "statistics.dc.fi.plan_2035_twh", toYear: 2035, who: "Fingrid, Q3/2026", doc: NB_DOCS[0], page: NB_PAGE, src: FORECAST,
    quote: "11–35 terawatt-hours by 2035",
    full: "Data centers are the largest individual growth segment in industrial consumption over the review period. In the scenarios, their electricity consumption increases from approximately 2 terawatt-hours in 2025 to 9–18 terawatt-hours by 2030 and 11–35 terawatt-hours by 2035.",
    // «not binding» out, the two figures linked to Fingrid's own words (the owner asked, 2026-11-23; D-276)
    sub: (v, a) => t("connection agreements signed {a}; enquiries {b}", {
      a: a(NB_DOCS[1], `${fmt(v("statistics.dc.fi.agreements_gw"), 0)} GW`, "By mid-August, the planned final combined capacity of data centre projects that have signed connection agreements totalled nearly 5 gigawatts based on information provided by project developers, including projects connected to distribution networks."),
      b: a(NB_DOCS[0], `${fmt(v("statistics.dc.fi.enquiries_gw"), 0)} GW`, "The connection enquiries increasing electricity consumption capacity amount in total to over 145 gigawatts, of which approximately 100 gigawatts relate to data center projects.", 3) }),
    // Google's contract for half of an existing nuclear plant (the owner asked, 2026-11-23; D-268); its share in the
    // brand's blue and the megawatts out at the owner's word (D-288)
    more: (v, a) => t("<b>Google</b>: {bn} in 2027–2028; up to {share} of the Loviisa nuclear plant in 2030–2049", {
      bn: `<b>${a(NB_DOCS[2], `${fmt(v("statistics.dc.fi.google_invest_bn_eur"), 0)} ${t("bn €")}`, "Today, Google announced plans to invest EUR 13 billion in Finland over the next two years (2027 – 2028), including data center and other supporting infrastructure investments and partnerships in Hamina, Muhos, Vaala and Kajaani.")}</b>`,
      share: `<b style="font-size:22px;color:${BRAND}">${a(NB_DOCS[2], `${fmt(v("statistics.dc.fi.google_loviisa_share_pct"), 0)} %`, "The PPA will start in 2028 with a smaller capacity and will reach 50% of the Loviisa nuclear power plant’s capacity in 2030–2049.")}</b>` }) },
  { image: { src: "img/arctial_kokkola.webp", alt: t("Arctial's aluminium smelter planned at Kokkola, a rendering"), doc: NB_DOCS[3], credit: t("Arctial, environmental assessment report, 2026") },
    // the base Fingrid's own, 36 TWh in 2025, at the owner's word (D-289): its range of 2035 counts from it
    base: { year: 2025, doc: NB_DOCS[0], page: NB_PAGE, quote: "industrial electricity consumption excluding data centers develops in the scenarios from approximately 36 terawatt-hours in 2025" },
    head: t("INDUSTRY"), from: "statistics.ind.fi.fingrid_2025_twh", to: "statistics.ind.fi.plan_2035_twh", toYear: 2035, who: "Fingrid, Q3/2026", doc: NB_DOCS[0], page: NB_PAGE, src: FORECAST,
    quote: "35–62 terawatt-hours by 2035", // its line on hydrogen and electric boilers out at the owner's word (D-275)
    full: "In total, industrial electricity consumption excluding data centers develops in the scenarios from approximately 36 terawatt-hours in 2025 to 37–44 terawatt-hours by 2030 and 35–62 terawatt-hours by 2035.",
    // the largest single load planned, by its megawatts (the owner asked, 2026-11-23; D-267): Arctial's aluminium smelter
    more: (v, a) => t("<b>Arctial</b>, aluminium smelter at Kokkola: {mw} of steady load", { mw: `<b style="font-size:22px;color:${BRAND}">${a(NB_DOCS[3], `${fmt(v("statistics.ind.fi.arctial_mw"), 0)} MW`, "Laitoskokonaisuus tarvitsee tasaisesti noin 1 050 MW sähkötehoa.", 61)}</b>` }) }];
// the large data centres planned in Finland, a row a project (D-264, D-266): the megawatts each a documentary value
// (statistics.dc.fi.project.*) — the campus's planned final capacity, from the project's own document where one is at
// hand (the environmental impact assessments of Microsoft's three sites, YIT's release on atNorth's, AmpTank's
// announcement, the study TikTok and Hyperco commissioned) and else from Germany Trade & Invest's table of 28 August
// 2026 — the year the first phase is due and, where published, its megawatts. The stage: 2 building begun, 1 an
// investment decision, 0 planning or studies. Checked against Fermi Energia's fact-check of 14 November 2026.
const NB_STAGE = [t("planning"), t("investment decision"), t("decided, building")];
// `names` a place per key where a row sums several sites, each linked to its own document; `doc` a row's document where
// it has no megawatts (D-278)
// `upTo` a ceiling the source gives («up to», «potentially»), shown so (D-280)
interface NbProject { keys: string[]; place: string; who: string; stage: 0 | 1 | 2; names?: string[]; doc?: string; tip?: string; upTo?: boolean }
const FI_PROJECTS: NbProject[] = [
  { keys: ["espoo", "kirkkonummi", "vihti"], place: "Espoo · Kirkkonummi · Vihti", who: "Microsoft", stage: 2, names: ["Espoo", "Kirkkonummi", "Vihti"] },
  { keys: ["myllykoski"], place: "Myllykoski, Kouvola", who: "atNorth", stage: 2 },
  { keys: ["kajaani"], place: "Kajaani", who: "XTX Markets", stage: 2 },
  { keys: ["mikkeli"], place: "Mikkeli", who: "Compute Nordic", stage: 2 },
  { keys: ["utajarvi"], place: "Utajärvi", who: "Amp Tank", stage: 2 },
  { keys: ["kouvola"], place: "Kouvola", who: "Hyperco · TikTok", stage: 2 },
  { keys: ["lahti"], place: "Lahti", who: "DayOne · TikTok", stage: 1 },
  { keys: ["seinajoki"], place: "Seinäjoki", who: "Pure DC", stage: 0 },
  { keys: ["jarvenpaa"], place: "Järvenpää", who: "Prime Data Centers", stage: 0 },
  { keys: ["rovaniemi"], place: "Rovaniemi", who: "FCDC", stage: 0 },
  { keys: ["forssa"], place: "Forssa", who: "QTS · Blackstone", stage: 0 },
  { keys: ["lappeenranta"], place: "Lappeenranta", who: "Nebius", stage: 0 },
  // Google's three new sites (D-268): no megawatts published, the environmental assessments under way and the
  // preparatory works halted for them (October 2026) — so planning, and in no sum; the investment announced stands in
  // Finland's card, with the contract (D-269)
  { keys: [], place: "Kajaani · Muhos · Vaala", who: "Google", stage: 0, doc: "doc.fortum_google_loviisa_2026",
    tip: "Google announced plans to invest EUR 13 billion in Finland over the next two years (2027 – 2028), including data center and other supporting infrastructure investments and partnerships in Hamina, Muhos, Vaala and Kajaani." },
];
// ---- Sweden's and Poland's slides after Finland's (the owner asked, 2026-11-23; D-279) --------------------------------
// The same two cards for the model's two other neighbours: the country's price over its data centres and its industry,
// from its grid operator's own plan and queue, and the large data centres on their way. Sweden's projects from the
// developers' releases and the trade press on them (Svenska kraftnät names no project), their bidding area beside the
// place — none stands in SE4, the model's neighbour, whose price follows what the north and the middle leave to flow
// south. Poland's are every data-centre row of PSE's public list of connection requests (30 September 2026): conditions
// issued or a request, none with an agreement and none building, so every dot is grey.
const SE_MID = t("The slide's {y}: the midpoint of the scenario {s} in {y1} and {y2}, read off Figure {n}, p. {p}", { y: 2035, s: "MM", y1: 2030, y2: 2040, n: 5, p: 42 });
const SE_ROWS: NbRow[] = [
  { base: { year: 2026, doc: LMA, page: 43, quote: "Datacenter 2,5 8,8 27,1 40,9 40,9" }, // Svenska kraftnät's own base, the table of its 27,1 (D-311)
    head: t("DATA CENTRES"), from: "statistics.dc.se.svk_2026_twh", to: "se2035.datacentres_twh.a", toYear: 2035, who: "Svenska kraftnät", doc: LMA, page: 43, src: "Svenska kraftnät, Långsiktig marknadsanalys 2026", read: true,
    // the figures the report prints, Table 4 (the owner asked, 2026-11-24; D-310); 2035's is read off Figure 5's bars
    quote: t("{a} TWh in {y1}, {b} TWh in {y2}", { a: fmt(2.5), y1: 2026, b: fmt(27.1), y2: 2050 }),
    full: `Tabell 4: “Datacenter 2,5 8,8 27,1 40,9 40,9” (2026; 2050 LF, MM, HP, HF). ${SE_MID}`,
    sub: (v, a) => t("in the connection queue {a}<br>allocated or reserved {b}", { // «none in SE4» out at the owner's word (D-306)
      a: a(SVK_Q, `${fmt(v("statistics.dc.se.requests_mw") / 1000)} GW`, "Datacenter - 8 200 MW"),
      b: a("doc.cioanalytics_2026_11_02_datacenter", `${fmt(v("statistics.dc.se.reserved_gw"))} GW`, "Svenska kraftnät har dessutom redan tilldelat eller reserverat omkring 3,5 GW till datacenter.") }),
    more: (v, a) => t("<b>Brookfield</b>: up to {bn} at Strängnäs over 10–15 years", {
      bn: `<b>${a("doc.brookfield_strangnas_2025", `${fmt(v("statistics.dc.se.brookfield_invest_bn_eur"), 1)} ${t("bn €")}`, "Brookfield Asset Management (“Brookfield”) today announced up to SEK 95 billion ( $10 billion ) of investment to support the development of artificial intelligence (“AI”) infrastructure in Sweden.", undefined,
        t("— 4 June 2025; at the ECB's rate of that day, {r} SEK/€", { r: fmt(10.9475, 4) }))}</b>` }) }, // in euros as Finland's Google (D-308)
  { head: t("INDUSTRY"), noFig: true, from: "statistics.ind.se.eurostat_2024_gwh", to: "se2035.hydrogen_twh.a", toYear: 2035, plus: true, toLabel: t("hydrogen"), who: t("Svenska kraftnät, scenario MM"), doc: LMA, page: 43, src: "Svenska kraftnät, Långsiktig marknadsanalys 2026", read: true, // the figure line out at the owner's word (D-313)
    quote: t("{a} TWh in {y1}, {b} TWh in {y2}", { a: fmt(0.1), y1: 2026, b: fmt(35.4), y2: 2050 }),
    full: `Tabell 4: “Vätgasproduktion 0,1 9,2 35,4 65,3 65,3” (2026; 2050 LF, MM, HP, HF). ${SE_MID}`,
    // Svenska kraftnät's Table 4, the new loads the owner named, scenario MM, 2026 → 2050 (D-314)
    table: [[t("fossil-free steel"), 0.1, 9.6, "Fossilfritt stål, stålverk 0,1 6,4 9,6 9,9 9,9"],
      [t("fossil-free cement"), 0, 3, "Fossilfritt cement 0,0 3,0 3,0 3,0 3,0"],
      [t("refineries"), 0.9, 2.4, "Raffinaderier 0,9 0,0 2,4 2,0 2,0"],
      [t("electric vehicles"), 3.2, 23.8, "Elfordon 3,2 21,5 23,8 27,1 27,1"],
      [t("hydrogen production"), 0.1, 35.4, "Vätgasproduktion 0,1 9,2 35,4 65,3 65,3"]],
    sub: (v, a) => t("in the connection queue {a}", { // the north's share out at the owner's word (D-312)
      a: a(SVK_Q, `${fmt(v("statistics.ind.se.requests_mw") / 1000)} GW`, "Industri - 14 200 MW") }),
    more: (v, a) => t("<b>Stegra</b> (steel, Boden): electrolysers of {mw}, ordered in 2023", { mw: `<b style="font-size:22px;color:${BRAND}">${a("doc.tkn_2023_05_22_stegra", `${fmt(v("statistics.ind.se.stegra_mw"), 0)} MW`, "will enable an installed capacity of more than 700 MW")}</b>` }) }];
const SE_PROJECTS: NbProject[] = [
  { keys: ["borlange"], place: "Borlänge (SE3)", who: "EcoDataCenter · Mistral AI", stage: 2, upTo: true },
  { keys: ["strangnas"], place: "Strängnäs (SE3)", who: "Brookfield", stage: 0 },
  { keys: ["skelleftea"], place: "Skellefteå (SE1)", who: "EdgeConneX", stage: 0, upTo: true },
  { keys: ["solleftea"], place: "Sollefteå (SE2)", who: "atNorth", stage: 0 },
  { keys: ["smedjebacken"], place: "Smedjebacken (SE3)", who: "EcoDataCenter", stage: 0 },
];
const PRSP_NAME = "PSE, Plan rozwoju sieci przesyłowej 2027–2036 (projekt po konsultacji)";
const PL_ROWS: NbRow[] = [
  { base: { year: 2024, doc: PRSP, page: 29, quote: "Szacowane zapotrzebowanie na energię elektryczną [TWh] 0,6 17,4 29,4" }, // PSE's own base, the table of the 17,4 (D-298)
    head: t("DATA CENTRES"), from: "statistics.dc.pl.pse_2024_twh", to: "statistics.dc.pl.plan_2036_twh", toYear: 2036, who: "PSE, 2026", doc: PRSP, page: 29, src: PRSP_NAME, read: true,
    quote: t("{a} TWh in {y1}, {b} TWh in {y2}", { a: fmt(17.4), y1: 2036, b: fmt(29.4), y2: 2040 }), // 2040 back at the owner's word (D-303)
    full: "Tab. 4.3: “Szacowane zapotrzebowanie na energię elektryczną [TWh] 0,6 17,4 29,4” (2024, 2036, 2040)",
    sub: (v, a) => t("connection conditions issued {a}<br>requests {b}", {
      a: a(PSE_LIST, `${fmt(v("statistics.dc.pl.conditions_mw") / 1000)} GW`, "WARUNKI PRZYŁĄCZENIA wydane"),
      b: a(PSE_LIST, `${fmt(v("statistics.dc.pl.applications_mw") / 1000)} GW`, "WNIOSEK") }) },  // WBS Power's line out at the owner's word (D-297)
  { head: t("INDUSTRY"), from: "statistics.ind.pl.eurostat_2024_gwh", to: "statistics.ind.pl.new_industry_2036_twh", toYear: 2036, plus: true, toLabel: t("new loads"), who: "PSE, 2026", doc: PRSP, page: 25, src: PRSP_NAME, read: true,
    quote: t("{a} TWh in {y1}, {b} TWh in {y2}", { a: fmt(15), y1: 2036, b: fmt(18.8), y2: 2040 }),
    full: "Rys. 4-1: “Przemysł (nowe odbiory)” 15,0 (2036), 18,8 (2040)",
    sub: (v, a) => t("hydrogen:<br>connection conditions issued {a}<br>electrolysers in {y}: {b}", { y: 2036,
      a: a(PSE_LIST, `${fmt(v("statistics.ind.pl.h2_conditions_mw"), 0)} MW`, "WARUNKI PRZYŁĄCZENIA wydane"),
      b: a(PRSP, `${fmt(v("statistics.ind.pl.electrolysers_2036_mw"), 0)} MW`, "Moc elektrolizerów przyłączonych do KSE – łącznie [MW] brak danych 1 500 2 480", 30) }) }]; // the agreements' line out at the owner's word (D-300)
const PL_PROJECTS: NbProject[] = [
  { keys: ["chynowo"], place: "Chynowo", who: "WBS Power", stage: 1 },
  { keys: ["palowo"], place: "Pałowo", who: "WBS Power", stage: 1 },
  { keys: ["czerniewice"], place: "Czerniewice", who: "Industry Park Czerniewice", stage: 1 },
  { keys: ["stoszowice"], place: "Stoszowice", who: "WBS Power", stage: 1 },
  { keys: ["suczki"], place: "Suczki", who: "WBS Power", stage: 1 },
  { keys: ["dobiecin"], place: "Dobiecin", who: "Data Center Bełchatów", stage: 1 },
  { keys: ["komorniki"], place: "Komorniki", who: "nLighten", stage: 1 },
  { keys: ["warszawa4", "konin", "piaseczno"], place: "Warszawa · Konin · Piaseczno", who: "LF 16 · CGE · HiPark", stage: 1, names: ["Warszawa", "Konin", "Piaseczno"] },
  { keys: ["kolbaskowo"], place: "Kołbaskowo", who: "Mazur", stage: 0 },
  { keys: ["cadc"], place: "CPK", who: "Central Airport DC", stage: 0 },
  { keys: ["swiete"], place: "Święte", who: "Iberdrola", stage: 0 },
  { keys: ["wroclaw", "sekocin"], place: "Wrocław · Sękocin", who: "Greenvolt · Corts", stage: 0, names: ["Wrocław", "Sękocin"] },
  { keys: ["jedrzychowice"], place: "Jędrzychowice", who: "VRW 21", stage: 0 },
];
/** A neighbour's slide (D-279): its zone and name, the title and the conclusion under it, the card's rows, the table's
 * title, stage words and projects, its column's name and the sum's, the first figure of the sums' row, the stages each
 * sum takes, and the documentary values the slide names beside its rows' and its projects'. */
interface NbCountry { zone: "FI" | "SE4" | "PL"; cc: string; title: string; lead: string; rows: NbRow[]; list: string; stages: string[]; projects: NbProject[];
  cap: string; together: string; first: (v: V) => [string, string]; groups: [string, (stage: number) => boolean][]; keys: string[];
  zoom?: number } // a sparse left card set larger, its price on two lines (D-302)
const NB_FI: NbCountry = { zone: "FI", cc: "fi", title: t("The case for Finland's price multiplier"),
  lead: t("With the data-centre building boom and the decarbonisation of heavy industry, Finland's demand grows faster than its new generation, and that will push prices up."),
  rows: FI_ROWS, list: t("LARGE DATA CENTRES PLANNED"), stages: NB_STAGE, projects: FI_PROJECTS, cap: t("FINAL CAPACITY"), together: t("final capacity together"),
  first: (v) => [t("IT power {a} → {b} (EUDCA)", { a: 2025, b: 2027 }), `${fmt(v("statistics.dc.fi.eudca_it_2025_mw"), 0)} → ${fmt(v("statistics.dc.fi.eudca_it_2027_mw"), 0)}`],
  groups: [[t("decided"), (x) => x > 0], [t("planning"), (x) => x === 0]],
  keys: ["statistics.dc.fi.agreements_gw", "statistics.dc.fi.enquiries_gw", "statistics.ind.fi.arctial_mw", "statistics.dc.fi.eudca_it_2025_mw", "statistics.dc.fi.eudca_it_2027_mw",
    "statistics.dc.fi.google_loviisa_share_pct", "statistics.dc.fi.google_invest_bn_eur"] };
const NB_SE: NbCountry = { zone: "SE4", cc: "se", title: t("The case for Sweden's price multiplier"),
  lead: "", zoom: 1.06, // no conclusion under the title, at the owner's word (D-309); the left card a little larger, as its lines allow
  rows: SE_ROWS, list: t("LARGE DATA CENTRES PLANNED"), stages: NB_STAGE, projects: SE_PROJECTS, cap: t("FINAL CAPACITY"), together: t("final capacity together"),
  first: (v) => [t("in Svenska kraftnät's queue"), fmt(v("statistics.dc.se.requests_mw"), 0)],
  groups: [[t("decided"), (x) => x > 0], [t("planning"), (x) => x === 0]],
  keys: ["statistics.dc.se.requests_mw", "statistics.dc.se.reserved_gw", "statistics.dc.se.brookfield_invest_bn_eur", "statistics.ind.se.requests_mw", "statistics.ind.se.stegra_mw"] };
const NB_PL: NbCountry = { zone: "PL", cc: "pl", title: t("The case for Poland's price multiplier"),
  lead: "", zoom: 1.25, // no conclusion under the title, at the owner's word (D-301); the left card larger (D-302)
  rows: PL_ROWS, list: t("DATA CENTRES IN PSE'S LIST OF CONNECTIONS"), stages: [t("request"), t("conditions issued")], projects: PL_PROJECTS, cap: t("CAPACITY"), together: t("together"),
  first: (v) => [t("in PSE's plan for {y}", { y: 2036 }), fmt(v("statistics.dc.pl.plan_2036_mw"), 0)],
  groups: [], // the two sums out: the left card gives them, 9,2 and 2,1 GW (D-299)
  keys: ["statistics.dc.pl.conditions_mw", "statistics.dc.pl.applications_mw", "statistics.dc.pl.plan_2036_mw", "statistics.ind.pl.h2_conditions_mw", "statistics.ind.pl.electrolysers_2036_mw"] };
const NB = [NB_FI, NB_SE, NB_PL];
const projectKey = (c: NbCountry, k: string) => `statistics.dc.${c.cc}.project.${k}_mw`;
/** The documentary values the three slides name; the page hands them in (`DeckInput.nb.par`). */
export const NB_KEYS: string[] = [...new Set(NB.flatMap((c) => c.rows.flatMap((r) => [r.from, r.to]).concat(c.keys, c.projects.flatMap((x) => x.keys.map((k) => projectKey(c, k))))))];
const sNb = (c: NbCountry) => (d: DeckInput) => {
  // the slide's title and its main conclusion under it, the owner's words (D-271; the conclusion as the owner agreed it, D-281)
  // the flag in the title, the country's name out of the card below (the owner asked, 2026-11-24; D-282)
  const title = `<span class="fl fl-${c.zone}" style="width:72px;height:48px;margin-right:24px;vertical-align:-1px;border-radius:4px"></span>${c.title}`;
  const lead = c.lead && `<span style="display:block;font-size:28px;font-weight:600;line-height:1.25;color:${INK};margin-top:-4px">${c.lead}</span>`;
  const set = SC.map((id) => d.trio[id]).find(Boolean);
  if (!set || !d.nb) return frame(title, lead, pending());
  const base = setInputs(d.s, set).price[c.zone], level = d.s.level[c.zone], v = (k: string) => d.nb!.par[k];
  // TWh to one decimal, a whole number without it (the owner asked, 2026-11-24; D-290)
  const twh = (k: string) => { const x = k.endsWith("_gwh") ? v(k) / 1000 : v(k); return fmt(x, Number.isInteger(x) ? 0 : 1); };
  // a link to a document of the site's sources, at its page, the source's words its tip; the text alone without the address
  const link = (doc: string, text: string, tip: string, page?: number, c = "inherit") => {
    const url = d.nb!.urls?.[doc];
    return url ? `<a href="${esc(url)}${page ? `#page=${page}` : ""}" target="_blank" rel="noopener" title="${esc(tip)}" style="color:${c};text-decoration:underline;text-underline-offset:3px;white-space:nowrap">${text}</a>` : text; // a linked figure never broken over two lines (D-302)
  };
  const fig: Link = (doc, text, quote, page, after) => link(doc, text, `“${quote}”${after ? ` ${after}` : ""}`, page);
  // a company's line (Google, Arctial, …) set apart from the block's own lines (the owner asked, 2026-11-24; D-285)
  const Z = c.zoom ? `;zoom:${c.zoom}` : "";
  const split = (c.zoom ?? 1) >= 1.2; // the price's label above its figures where the card is set much larger (D-302, D-309)
  const row = (r: NbRow) => `<div style="border-top:1px solid ${GRID};padding-top:12px${Z}">${r.image ? `
      <div style="margin-bottom:10px">${link(r.image.doc, `<img src="${r.image.src}" alt="${esc(r.image.alt)}" style="display:block;width:100%;height:100px;object-fit:cover;border-radius:10px">`, r.image.credit)}</div>` : ""}
      <div style="${SECT};font-size:18px">${r.head}${c.zone === "SE4" ? ` · ${t("ALL SWEDEN")}` : ""}</div>
      ${r.noFig ? "" : `<div style="display:flex;align-items:baseline;gap:10px;white-space:nowrap;margin-top:4px">
        <span style="font-size:32px;font-weight:700;color:${INK}">${r.base ? link(r.base.doc, twh(r.from), `“${r.base.quote}” — ${r.src}, ${t("p. {n}", { n: r.base.page })}`, r.base.page)
          : link(r.from.includes(".dc.") ? "doc.eurostat_db_isoc_env_ict_nrg" : "doc.eurostat_db_nrg_bal_c",
          twh(r.from), `“${fmt(v(r.from), 0)} GWh” — Eurostat, ${r.from.includes(".dc.") ? t("data centres (isoc_env_ict_nrg), {geo}, {year}", { geo: c.zone.slice(0, 2), year: 2024 }) : t("industry's electricity (nrg_bal_c), {geo}, {year}", { geo: c.zone.slice(0, 2), year: 2024 })}`)}</span><span style="font-size:17px;font-weight:500;color:${MUTED}">TWh · ${r.base?.year ?? 2024}</span>
        <span style="font-size:28px;font-weight:700;color:${BRAND}">→</span>
        <span style="font-size:42px;font-weight:800;color:${BRAND}">${r.plus ? "+" : ""}${twh(r.to)}</span><span style="display:inline-flex;flex-direction:column;font-size:17px;font-weight:500;line-height:1.15;color:${MUTED}"><span>TWh · ${r.toYear}</span>${r.toLabel ? `<span style="font-size:15px">${r.toLabel}</span>` : ""}</span></div>`}
      ${/* the plan's source in italics, light and in the text's colour (the owner asked, 2026-11-24; D-287) */ ""}
      ${r.table ? `<div style="font-size:18px;font-weight:400;font-style:italic;color:${INK};margin-top:4px;white-space:nowrap">${r.who}:</div>
      ${/* a column for each year, its unit beside each figure (the owner asked, 2026-11-24; D-315) */ ""}
      <div style="display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;column-gap:10px;align-items:baseline;font-size:18px;font-weight:500;line-height:1.4;color:${INK};margin-top:2px;white-space:nowrap">
        <span></span><span style="${SECT};font-size:14px;text-align:right">2026</span><span></span><span style="${SECT};font-size:14px;text-align:right">2050</span>
        ${r.table.map(([label, a, b, row]) => {
          const tip = `“${row}” — ${t("Table {n}", { n: 4 })} (2026; 2050 LF, MM, HP, HF) — ${r.src}, ${t("p. {n}", { n: r.page })}`;
          const cell = (x: number) => `<span style="text-align:right">${link(r.doc, fmt(x), tip, r.page)}<span style="font-size:14px;color:${MUTED};margin-left:4px">TWh</span></span>`;
          return `<span style="white-space:normal">${label}</span>${cell(a)}<span style="color:${BRAND};font-weight:700">→</span>${cell(b)}`;
        }).join("")}</div>`
        : `<div style="font-size:18px;font-weight:400;font-style:italic;color:${INK};margin-top:4px;white-space:nowrap">${r.who}:${r.noFig ? "<br>" : " "}${link(r.doc, r.read ? r.quote : `«${r.quote}»`, `${r.read ? r.full : `“${r.full}”`} — ${r.src}, ${t("p. {n}", { n: r.page })}`, r.page)}</div>`}
      ${r.sub ? `<div style="font-size:19px;font-weight:500;line-height:1.35;color:${MUTED};margin-top:6px">${r.sub(v, fig)}</div>` : ""}${r.more ? `
      <div style="font-size:19px;font-weight:500;line-height:1.35;color:${INK};margin-top:16px">${r.more(v, fig)}</div>` : ""}</div>`;
  const box = (flex: string, inner: string) => `<div style="flex:${flex};min-width:0;display:flex;flex-direction:column;border:1px solid ${GRID};border-radius:18px;overflow:hidden">
    <div style="flex:none;height:6px;background:${BRAND}"></div>
    <div style="flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between;padding:22px 30px 20px">${inner}</div></div>`;
  // the two cards' heads alike: the same size, weight and spacing (D-282)
  const HEAD = `font-size:24px;font-weight:700;letter-spacing:.06em;color:${INK};white-space:nowrap`;
  const left = box("0 0 600px", `
      <div style="padding-top:2px${Z}">
        ${/* one line since the owner asked (D-277): the forecast, its multiplier right after it, an arrow to the model's price;
           Sweden's zone named in it since its name left the card (D-282), the rows under it marked as all Sweden's (D-292); the prices whole, the multiplier to two decimals (D-291); no head over the card since the owner took it out, the
           price's head the owner's words (D-283) */ ""}
        <div style="${SECT};font-size:18px">${t("AVERAGE ELECTRICITY PRICE")}${c.zone === "SE4" ? " · SE4" : ""}</div>
        <div style="display:flex;${split ? "flex-wrap:wrap;" : ""}align-items:baseline;gap:${split ? "0 7px" : "7px"};white-space:nowrap;margin-top:4px">
          <span style="font-size:20px;font-weight:500;color:${MUTED}${split ? ";flex-basis:100%" : ""}">${t("{profile} {year} forecast:", { profile: esc(d.s.profile), year: d.s.profileYear })}</span>
          <span style="font-size:26px;font-weight:700;color:${INK}">${fmt(base, 0)}</span>
          <span style="font-size:23px;font-weight:700;color:${MUTED}">×${fmt(level, 2)}</span>
          <span style="font-size:28px;font-weight:700;color:${BRAND}">→</span>
          <span style="font-size:40px;font-weight:800;color:${BRAND}">${fmt(base * level, 0)}</span><span style="font-size:17px;font-weight:500;color:${MUTED}">€/MWh</span></div>
      </div>
      ${c.rows.map(row).join("")}`);
  // the projects: the stage's dot, the place and who builds it, and the campus's final megawatts, a figure alone since
  // the owner took the bars out (D-265); the first phase's column out at the owner's word (D-273)
  // the dot green where building has begun, grey else (the owner asked, 2026-11-23; D-278)
  const dot = (stage: number) => (stage === 2 ? GREEN : "#C4C8CF");
  // a place linked to the document its megawatts come from, at its page, the document's title the tip (D-278)
  const ref = (key: string, text: string) => {
    const r = d.nb!.refs?.[projectKey(c, key)];
    return r ? `<a href="${esc(r.url)}${r.page ? `#page=${r.page}` : ""}" target="_blank" rel="noopener" title="${esc(r.title)}" style="color:inherit;text-decoration:underline;text-decoration-color:${GRID};text-underline-offset:4px">${esc(text)}</a>` : esc(text);
  };
  const placeOf = (x: NbProject) => x.names ? x.names.map((n, i) => ref(x.keys[i], n)).join(" · ")
    : x.keys.length ? ref(x.keys[0], x.place) : x.doc ? link(x.doc, esc(x.place), `“${x.tip ?? ""}”`) : esc(x.place);
  const mwOfProject = (x: NbProject) => x.keys.reduce((a, k) => a + v(projectKey(c, k)), 0);
  const sum = (f: (x: NbProject) => boolean) => c.projects.reduce((a, x) => a + (f(x) ? mwOfProject(x) : 0), 0);
  const COLS = "display:grid;grid-template-columns:22px 330px minmax(0,1.1fr) minmax(0,.9fr) 150px;column-gap:14px;align-items:center";
  const unit = (u: string) => `<span style="font-size:15px;font-weight:500;color:${MUTED};margin-left:4px">${u}</span>`;
  // every row an equal share of the table's height, so that a short table spreads as a long one fills (D-282)
  const project = (x: NbProject) => `<div style="${COLS};flex:1;min-height:0;border-top:1px solid ${GRID};white-space:nowrap">
      <span style="width:16px;height:16px;border-radius:50%;background:${dot(x.stage)}"></span>
      <span style="font-size:21px;font-weight:600;color:${INK};overflow:hidden;text-overflow:ellipsis">${placeOf(x)}</span>
      <span style="font-size:19px;font-weight:500;color:${MUTED};overflow:hidden;text-overflow:ellipsis">${esc(x.who)}</span>
      <span style="font-size:18px;font-weight:500;color:${MUTED}">${c.stages[x.stage]}</span>
      <span style="font-size:22px;font-weight:700;color:${INK};text-align:right">${x.keys.length ? `${x.upTo ? `<span style="font-size:15px;font-weight:500;color:${MUTED}">${t("up to")}</span> ` : ""}${fmt(mwOfProject(x), 0)}${unit("MW")}` : "–"}</span></div>`;
  // a colon between a total's label and its figure, so that a year in the label does not run into the figure; two totals
  // alone (Poland's) set larger, label and figure in proportion (D-305)
  const big = c.groups.length === 0;
  const total = (label: string, shown: string, strong = false) => `<span style="white-space:nowrap"><span style="font-size:${big ? 18 : 14}px;font-weight:500;color:${MUTED}">${label}:</span> <span style="font-size:${strong ? (big ? 30 : 26) : (big ? 26 : 20)}px;font-weight:${strong || !big ? 800 : 700};color:${strong ? BRAND : INK}">${shown}</span>${unit("MW")}</span>`;
  const right = box("1", `
      <div style="${HEAD}">${c.list}</div>
      <div style="flex:1;min-height:0;display:flex;flex-direction:column;margin:14px 0 12px"><div style="${COLS};padding-bottom:4px;font-size:15px;font-weight:700;letter-spacing:.06em;color:${MUTED};white-space:nowrap"><span></span><span></span><span></span><span></span><span style="text-align:right">${c.cap}</span></div>
        ${c.projects.map(project).join("")}</div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;border-top:3px solid ${INK};padding-top:10px">
        ${total(...c.first(v))}${c.groups.map(([label, f]) => total(label, fmt(sum((x) => f(x.stage)), 0))).join("")}${total(c.together, fmt(sum(() => true), 0), true)}</div>`);
  // the cards the body's height since the footnote is out at the owner's word (D-272)
  // without a conclusion under the title the cards rise into its band (D-302)
  return frame(title, lead, `
  <div style="display:flex;gap:32px;${c.lead ? "height:740px" : "height:800px;margin-top:-60px"}">${left}${right}</div>`);
};

// ---- nuclear projects in Europe and North America (full-bleed): slide 127 of Fermi Energia's own deck
// shot at 3840×2160 in each language and kept as a picture, at the owner's
// word (D-319); its sources are behind its own QR code, on the Fermi deck's open page of sources
const sProjects = () => `<img src="img/projects_map_${lang}.webp" alt="${esc(t("Nuclear projects in Europe and North America by stage: feasibility study, early development, ongoing project, under construction; each with its technology and the sites named"))}" width="1920" height="1080" style="position:absolute;inset:0;width:1920px;height:1080px">`;

// ---- 14 · try it yourself (full-bleed) -----------------------------------------------------------------------------------
const ctaStep = (n: number, txt: string) => `
  <div style="flex:1;border:1px solid ${GRID};border-radius:16px;padding:30px 34px">
    <div style="font-size:30px;font-weight:800;color:${BRAND};margin-bottom:12px">${n}</div>
    <div style="font-size:27px;font-weight:500;line-height:1.35;color:${INK}">${txt}</div>
  </div>`;
const s14 = () => `
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" style="position:absolute;inset:0" aria-hidden="true">
    <circle cx="1600" cy="1190" r="150" fill="#231FBD"/><circle cx="1790" cy="1160" r="200" fill="#1BE54E"/>
  </svg>
  <div style="position:absolute;left:103px;top:130px">
    <div style="font-size:76px;font-weight:700;color:${INK}">${t("Try it yourself")}</div>
    <div style="font-size:120px;font-weight:800;letter-spacing:-.01em;color:${BRAND};margin-top:18px">energiamudel.ee</div>
  </div>
  <div style="position:absolute;left:103px;top:500px;width:1714px;display:flex;gap:44px">
    ${ctaStep(1, t("Pick a scenario: <b>0 SMR</b>, <b>1 SMR</b> or <b>2 SMR</b>"))}
    ${ctaStep(2, t("Change the assumptions with the sliders: capacity, cables, fuel prices, the neighbours' prices"))}
    ${ctaStep(3, t("See what happens to the price: the result is computed in your browser"))}
  </div>`;

/** The slides in order, each its markup for the 1920×1080 stage. */
// the past years beside the market fourth, after how the model works, at the owner's word (D-244); the capital cost's
// slide (s10) taken out at the owner's word (D-251); the functions keep the names of the places they had
// the neighbours' slide after the scenarios', at the owner's word (D-263)
// Sweden's and Poland's slides after Finland's (D-279)
// the scenarios before the weather years, at the owner's word (D-295)
// the weather years after the neighbours' slides, just before the prices they weigh, at the owner's word (D-296)
// the nuclear projects' map after the plant's account, at the owner's word (D-319)
export const SLIDES: ((d: DeckInput) => string)[] = [s1, s2, s3, s13, s5, ...NB.map(sNb), s4, s6, s7, s8, s9, s11, sState, sProjects, s14];
/** The past years' slide's place: the page asks for its replays once it is near (D-229). */
export const REPLAY_SLIDE = SLIDES.indexOf(s13);

/** The deck's frame on the page: its controls, the stage the slide is drawn into and the count shown in full screen;
 * the talk's notes taken out at the owner's word (D-321). */
export function deckShell(): string {
  return `<section class="deck" aria-label="${esc(t("Presentation"))}">
    <div class="deck-bar">
      <button type="button" class="seg" data-deck="prev" aria-label="${esc(t("Previous slide"))}">‹</button>
      <span class="deck-n" aria-live="polite"></span>
      <button type="button" class="seg" data-deck="next" aria-label="${esc(t("Next slide"))}">›</button>
      <span class="deck-note">${t("Every figure is the model's, computed for the settings shown; a change computes them again.")}</span>
      <button type="button" class="seg" data-deck="full" title="F">${t("Full screen")}</button>
    </div>
    <div class="deck-wrap"><div class="deck-stage" data-deck="stage"></div><span class="deck-n deck-fs" aria-hidden="true"></span></div>
  </section>`;
}
