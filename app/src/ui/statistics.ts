// The Statistics page (R-APP-14, D-087): the last ten years of the TTF gas price and of the EU ETS
// price, each with a least-squares line and a Theil–Sen line carried to 2040; and each year's net
// additions of onshore wind, offshore wind and solar in EE, LV, LT, FI, SE and PL, 2016–2025, with
// the least-squares line of the additions carried to 2040 and the installed capacity of 2035 and
// 2040 read two ways — the additions' trend goes on, or the pace of 2021–2025 holds (the owner's
// choice of both, D-087). Every series comes from presets.json `statistics` (export/tables.py
// statistics); the model's own assumptions stand beside the lines. Static: drawn once, in five tabs —
// Gas, CO₂, Wind, Solar and the zones' day-ahead prices, Gas first, the others drawn hidden (D-213).

import { t } from "./i18n.ts";
import type { Presets } from "../contract/presets.ts";
import { S1, opening, type State } from "../state/model.ts";
import type { Sources } from "./labels.ts";
import { describe, esc, fmt, signed } from "./labels.ts";
import { flag, tip } from "./panel.ts";

interface Monthly { months: string[]; values: number[]; unit: string; src: string[] }
interface Yearly { values: number[]; unit: string; src: string[] }
export interface Statistics {
  window: { first: string; last: string };
  gas: Monthly;
  eua: Monthly;
  prices?: Record<string, Monthly>;
  /** D-257: each zone's average over every hour of the latest year to the last hour all six reach (the deck's map). */
  ytd?: { first: string; last: string; hours: number; zones: Record<string, { value: number; unit: string; src: string[] }> };
  capacity: { years: number[]; countries: Record<string, Record<string, Yearly>>; src: string[]; areas?: Record<string, Record<string, Yearly>> };
}

export interface Line { slope: number; intercept: number; r2: number | null }

/** Least squares: the line nearest every point in squared distance, and the share of the points'
 * variance it explains (R²). */
export function ols(x: number[], y: number[]): Line {
  const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx, r2: syy ? (sxy * sxy) / (sxx * syy) : null };
}

const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Theil–Sen: the median of the slopes between every two points, through the median of what is
 * left — a line a few extreme months (2022) move little. */
export function theilSen(x: number[], y: number[]): Line {
  const s: number[] = [];
  for (let i = 0; i < x.length; i++) for (let j = i + 1; j < x.length; j++) if (x[j] !== x[i]) s.push((y[j] - y[i]) / (x[j] - x[i]));
  const slope = median(s);
  return { slope, intercept: median(y.map((v, i) => v - slope * x[i])), r2: null };
}

export const at = (l: Line, x: number) => l.intercept + l.slope * x;
/** A month "YYYY-MM" as a decimal year at its middle; a year's value of a line is at its middle. */
export const mid = (m: string) => Number(m.slice(0, 4)) + (Number(m.slice(5, 7)) - 0.5) / 12;
/** Each year's net addition: the year-end capacity less the year before's. */
export const additions = (cap: number[]) => cap.slice(1).map((v, i) => v - cap[i]);
/** Installed at the end of `to`, from `cap` at the end of `from`: each year adds what the additions'
 * line says for it, nothing where the line is below zero. */
export function byTrend(cap: number, from: number, l: Line, to: number): number {
  let c = cap;
  for (let y = from + 1; y <= to; y++) c += Math.max(0, at(l, y));
  return c;
}
/** Installed at the end of `to` at a constant pace a year. */
export const byPace = (cap: number, from: number, pace: number, to: number) => cap + pace * (to - from);

export const PACE_YEARS = 5;             // the pace: the average net addition of 2021–2025
const HORIZON = [2035, 2040];
const COUNTRIES = ["EE", "LV", "LT", "FI", "SE", "PL"] as const;
const NAME: Record<string, string> = { EE: t("Estonia"), LV: t("Latvia"), LT: t("Lithuania"), FI: t("Finland"), SE: t("Sweden"), PL: t("Poland") };
const FLAG: Record<string, string> = { SE: "SE4" };   // the page's flags are the zones'; SE4's is Sweden's
const TECHS: [key: string, label: string, tyndp: string][] = [
  ["wind_onshore", t("Onshore wind"), "Wind Onshore"], ["wind_offshore", t("Offshore wind"), "Wind Offshore"], ["solar", t("Solar photovoltaic"), "Solar (Photovoltaic)"],
];

const W = 1000;
const n1 = (x: number) => x.toFixed(1);

/** Round steps for an axis from 0 (or below) to `hi`: 1, 2 or 5 times a power of ten, 4–8 lines. */
function steps(lo: number, hi: number): number[] {
  const span = hi - lo || 1, raw = span / 5, p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((k) => k * p).find((s) => span / s <= 8) ?? 10 * p;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(v);
  return out;
}

/** A diamond of the page: where it stands and its tip, which names the scenario the figure is of (D-215). */
interface Mark { x: number; value: number; tip: string }
/** A hollow diamond with its tip in the page's box on hover (E-181's box, `data-tip`). */
const diamond = (x: number, y: number, tip: string) => `<path class="assume" d="M${n1(x)} ${n1(y - 5)}l5 5l-5 5l-5 -5z" data-tip="${esc(tip)}"/>`;
/** A red dot: the value the panel sets now (D-216), drawn under the diamonds, so a diamond it sits in keeps its tip. */
const dot = (x: number, y: number, tip: string) => `<circle class="set" cx="${n1(x)}" cy="${n1(y)}" r="3.5" data-tip="${esc(tip)}"/>`;
const SET_KEY = () => `<span><i class="k-set"></i>${t("set in the model now")}</span>`;
/** What the red dots read of a state (D-216): the scenario view's alone, a validation run sets none of them. The page is
 * drawn again when it changes. */
export const setKey = (s: State | null): string => s?.run !== "scenario" ? "" : JSON.stringify([s.target, s.fuelGas, s.fuelEua, s.profile, s.profileYear, s.level, s.fiSlope,
  (["EE", "LV", "LT"] as const).map((z) => [s.zones[z].mw.wind_onshore, s.zones[z].mw.wind_offshore, s.zones[z].mw.solar])]);

/** A monthly price over its ten years with the two lines carried to 2040: the months solid, the
 * least-squares line dashed, the Theil–Sen line dotted, the future shaded; the lines' values of
 * 2035 and 2040 written at their points, the scenarios' assumptions as hollow diamonds. */
function priceFig(s: Monthly, lq: Line, ts: Line, marks: Mark[], small = false, dots: Mark[] = []): string {
  const W0 = small ? 420 : W, L = small ? 40 : 48, R = small ? 36 : 70, top = small ? 12 : 16, h = small ? 120 : 230, w = W0 - L - R;
  const x0 = Math.floor(mid(s.months[0])), x1 = 2041;
  const xs = s.months.map(mid);
  const ends = [x0, x1].flatMap((x) => [at(lq, x), at(ts, x)]);
  const lo = Math.min(0, ...s.values, ...ends), hi = Math.max(...s.values, ...ends, ...[...marks, ...dots].map((m) => m.value)) * 1.05;
  const X = (x: number) => L + ((x - x0) / (x1 - x0)) * w, Y = (v: number) => top + h - ((v - lo) / (hi - lo)) * h;
  const last = xs[xs.length - 1];
  let g = `<rect class="future" x="${n1(X(last))}" y="${top}" width="${n1(X(x1) - X(last))}" height="${h}"/>`;
  g += steps(lo, hi).map((v) => `<line class="grid${v === 0 ? " strong" : ""}" x1="${L}" x2="${W0 - R}" y1="${n1(Y(v))}" y2="${n1(Y(v))}"/><text class="tick" x="${L - 5}" y="${n1(Y(v) + 4)}" text-anchor="end">${fmt(v, 0)}</text>`).join("");
  for (let yr = x0 + 1; yr <= 2040; yr++) if (yr % (small ? 10 : 5) === 0 || yr === x0 + 1) g += `<text class="tick" x="${n1(X(yr))}" y="${top + h + 14}" text-anchor="middle">${yr}</text><line class="grid" x1="${n1(X(yr))}" x2="${n1(X(yr))}" y1="${top + h}" y2="${top + h + 4}"/>`;
  g += `<polyline class="series thick" points="${xs.map((x, i) => `${n1(X(x))},${n1(Y(s.values[i]))}`).join(" ")}"><title>${t("{unit} by month, {from} to {to}", { unit: esc(s.unit), from: s.months[0], to: s.months[s.months.length - 1] })}</title></polyline>`;
  g += `<line class="trend" x1="${n1(X(x0))}" y1="${n1(Y(at(lq, x0)))}" x2="${n1(X(x1))}" y2="${n1(Y(at(lq, x1)))}"/>`;
  g += `<line class="trend ts" x1="${n1(X(x0))}" y1="${n1(Y(at(ts, x0)))}" x2="${n1(X(x1))}" y2="${n1(Y(at(ts, x1)))}"/>`;
  for (const yr of HORIZON) {
    const a = at(lq, yr + 0.5), b = at(ts, yr + 0.5), up = a >= b;
    const sm = small ? " sm" : "";
    g += `<circle class="pt" cx="${n1(X(yr + 0.5))}" cy="${n1(Y(a))}" r="${small ? 2.5 : 3.5}"/><text class="lab${sm}" x="${n1(X(yr + 0.5) + 5)}" y="${n1(Y(a) + (up ? -5 : 12))}">${fmt(a, 0)}</text>`;
    g += `<circle class="pt ts" cx="${n1(X(yr + 0.5))}" cy="${n1(Y(b))}" r="${small ? 2.5 : 3.5}"/><text class="lab ts${sm}" x="${n1(X(yr + 0.5) + 5)}" y="${n1(Y(b) + (up ? 12 : -5))}">${fmt(b, 0)}</text>`;
  }
  for (const d of dots) g += dot(X(d.x), Y(d.value), d.tip);
  for (const m of marks) g += diamond(X(m.x), Y(m.value), m.tip);
  return `<svg class="ip-fig st-fig${small ? " st-small" : ""}" viewBox="0 0 ${W0} ${top + h + 20}" role="img" aria-label="${t("{unit} by month with two trend lines to 2040", { unit: esc(s.unit) })}">${g}</svg>`;
}

/** A country's net additions a year as bars, 2016–2025, and the least-squares line through them
 * carried to 2040 — at zero where it falls below, as the extrapolation reads it. */
function addFig(years: number[], adds: number[], l: Line, unit: string): string {
  const w0 = 420, L = 46, R = 10, top = 14, h = 120, w = w0 - L - R;
  const x0 = years[0] - 0.5, x1 = 2040.5;
  const line = [] as [number, number][];
  for (let y = years[0]; y <= 2040; y++) line.push([y, y <= years[years.length - 1] ? at(l, y) : Math.max(0, at(l, y))]);
  // at least 10 MW tall: a country that built nothing keeps whole-megawatt ticks
  const lo = Math.min(0, ...adds, ...line.map(([, v]) => v)), hi = Math.max(10, ...adds, ...line.map(([, v]) => v)) * 1.1;
  const X = (x: number) => L + ((x - x0) / (x1 - x0)) * w, Y = (v: number) => top + h - ((v - lo) / (hi - lo)) * h;
  const bw = (w / (x1 - x0)) * 0.72;
  let g = `<rect class="future" x="${n1(X(years[years.length - 1] + 0.5))}" y="${top}" width="${n1(X(x1) - X(years[years.length - 1] + 0.5))}" height="${h}"/>`;
  g += steps(lo, hi).map((v) => `<line class="grid${v === 0 ? " strong" : ""}" x1="${L}" x2="${w0 - R}" y1="${n1(Y(v))}" y2="${n1(Y(v))}"/><text class="tick" x="${L - 4}" y="${n1(Y(v) + 4)}" text-anchor="end">${fmt(v, 0)}</text>`).join("");
  adds.forEach((v, i) => {
    const y0 = Y(Math.max(0, v)), y1 = Y(Math.min(0, v));
    g += `<rect class="bar" x="${n1(X(years[i]) - bw / 2)}" y="${n1(y0)}" width="${n1(bw)}" height="${n1(Math.max(0.5, y1 - y0))}"><title>${years[i]}: ${signed(v, 0)} ${esc(unit)}</title></rect>`;
  });
  g += `<polyline class="trend" points="${line.map(([x, v]) => `${n1(X(x))},${n1(Y(v))}`).join(" ")}"/>`;
  for (const yr of HORIZON) {
    const v = Math.max(0, at(l, yr));
    g += `<circle class="pt" cx="${n1(X(yr))}" cy="${n1(Y(v))}" r="2.5"/><text class="lab sm" x="${n1(X(yr))}" y="${n1(Y(v) - 5)}" text-anchor="middle">${fmt(v, 0)}</text>`;
  }
  for (const yr of [years[0], 2025, 2030, 2035, 2040]) g += `<text class="tick" x="${n1(X(yr))}" y="${top + h + 13}" text-anchor="middle">${yr}</text>`;
  return `<svg class="ip-fig st-fig st-small" viewBox="0 0 ${w0} ${top + h + 18}" role="img" aria-label="${t("net additions a year, {unit}, with the trend to 2040", { unit: esc(unit) })}">${g}</svg>`;
}

/** A country's installed capacity at each year's end, and from the last the table's two readings to 2040 — the
 * additions' trend dashed, the pace of the last five years dotted — their values of 2035 and 2040 written at their
 * points, the model's own figures as hollow diamonds (D-214). `ahead` are the years of the readings, the last first. */
function capFig(years: number[], cap: number[], ahead: number[], trend: number[], pace: number[], marks: Mark[], dots: Mark[] = []): string {
  const hi = Math.max(10, ...cap, ...trend, ...pace, ...[...marks, ...dots].map((m) => m.value)) * 1.12;
  // a tick of six digits needs a wider margin: Poland's solar ran past the figure's edge (D-219)
  const w0 = 420, L = steps(0, hi).some((v) => v >= 1e5) ? 56 : 46, R = 22, top = 14, h = 120, w = w0 - L - R;
  const x0 = years[0] - 0.5, x1 = 2040.5, last = years[years.length - 1];
  const X = (x: number) => L + ((x - x0) / (x1 - x0)) * w, Y = (v: number) => top + h - (v / hi) * h;
  const line = (ys: number[], vs: number[]) => ys.map((y, i) => `${n1(X(y))},${n1(Y(vs[i]))}`).join(" ");
  let g = `<rect class="future" x="${n1(X(last + 0.5))}" y="${top}" width="${n1(X(x1) - X(last + 0.5))}" height="${h}"/>`;
  g += steps(0, hi).map((v) => `<line class="grid${v === 0 ? " strong" : ""}" x1="${L}" x2="${w0 - R}" y1="${n1(Y(v))}" y2="${n1(Y(v))}"/><text class="tick" x="${L - 4}" y="${n1(Y(v) + 4)}" text-anchor="end">${fmt(v, 0)}</text>`).join("");
  g += `<polyline class="series thick" points="${line(years, cap)}"><title>${t("MW at the end of each year, {from} to {to}", { from: years[0], to: last })}</title></polyline>`;
  g += `<polyline class="trend" points="${line(ahead, trend)}"/><polyline class="trend ts" points="${line(ahead, pace)}"/>`;
  // the dots and the diamonds under the readings' figures, which stay legible where they meet
  for (const d of dots) g += dot(X(d.x), Y(d.value), d.tip);
  for (const m of marks) g += diamond(X(m.x), Y(m.value), m.tip);
  for (const yr of HORIZON) {
    const a = trend[yr - last], b = pace[yr - last], up = a >= b;
    g += `<circle class="pt" cx="${n1(X(yr))}" cy="${n1(Y(a))}" r="2.5"/><text class="lab sm" x="${n1(X(yr))}" y="${n1(Y(a) + (up ? -5 : 12))}" text-anchor="middle">${fmt(a, 0)}</text>`;
    g += `<circle class="pt ts" cx="${n1(X(yr))}" cy="${n1(Y(b))}" r="2.5"/><text class="lab ts sm" x="${n1(X(yr))}" y="${n1(Y(b) + (up ? 12 : -5))}" text-anchor="middle">${fmt(b, 0)}</text>`;
  }
  for (const yr of [years[0], 2025, 2030, 2035, 2040]) g += `<text class="tick" x="${n1(X(yr))}" y="${top + h + 13}" text-anchor="middle">${yr}</text>`;
  return `<svg class="ip-fig st-fig st-small" viewBox="0 0 ${w0} ${top + h + 18}" role="img" aria-label="${t("installed capacity at the year's end, MW, with the two readings to 2040")}">${g}</svg>`;
}

/** The sources behind a figure, as on the Weather page: the document or dataset, a link to the
 * publisher and to the row in the Sources view (R-APP-9). Files of one dataset that differ only in
 * their numbers (EEX's yearly reports, ENTSO-E's monthly files, TYNDP's runs) are named once, with
 * the first and the last. */
function srcOf(sources: Sources): (ids: string[]) => string {
  return (ids) => {
    const groups = new Map<string, string[]>();
    for (const i of new Set(ids)) { const k = i.replace(/\d+/g, "#"); groups.set(k, [...(groups.get(k) ?? []), i]); }
    return groups.size ? ` <span class="wx-src">${[...groups.values()].map((g) => {
      const d = describe(sources, g[0]);
      const text = g.length === 1 ? d.text : `${d.text.replace(/\s*\(.*\)$/, "")} (${g[0]} … ${g[g.length - 1]}, ${t("{n} files", { n: g.length })})`;
      return `${d.url ? `<a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text)} <a href="#" data-goto="${esc(g[0])}" title="${t("in Sources")}">↗</a>`;
    }).join("; ")}</span>` : "";
  };
}

interface FuelValue { value: number; unit: string; src: string[] }
type FuelPaths = Record<string, Record<string, Record<string, FuelValue>>>;
/** The fuel paths' gas (€/MWh thermal) or CO₂ (€/t) at a year, where the path has it. */
function pathAt(p: Presets, path: string, year: number, what: "gas" | "eua"): FuelValue | null {
  const v = (p.fuel_paths as unknown as FuelPaths)[path]?.[String(year)]?.[what];
  if (!v) return null;
  return v.unit === "EUR/GJ" ? { value: v.value * 3.6, unit: "EUR/MWh", src: v.src } : v;
}
const PATHS: [key: string, label: string][] = [
  ["eraa2025_final", t("ERAA 2025 (the scenario's prices)")], ["tyndp2024_matrix", t("TYNDP 2024 (its market model's)")], ["svk_lma_2026", "Svenska kraftnät, LMA 2026"],
];

function priceSection(p: Presets, s: Monthly, what: "gas" | "eua", title: string, about: string, src: (ids: string[]) => string, set: State | null = null): string {
  const xs = s.months.map(mid), lq = ols(xs, s.values), ts = theilSen(xs, s.values);
  const years = [2030, 2035, 2040];
  const marks: Mark[] = [], ids: string[] = [];
  const unit = s.unit === "EUR/MWh" ? "€/MWh" : "€/t";
  const rows = PATHS.map(([k, label]) => {
    const cells = years.map((y) => { const v = pathAt(p, k, y, what); if (v) marks.push({ x: y + 0.5, value: v.value, tip: `${label}, ${y}: ${fmt(v.value, 1)} ${unit}` }); return v; });
    ids.push(...cells.flatMap((c) => c?.src ?? []));
    return `<tr><td>${esc(label)}</td>${cells.map((c) => `<td class="n">${c ? fmt(c.value, 1) : "–"}</td>`).join("")}</tr>`;
  });
  const last12 = s.values.slice(-12).reduce((a, b) => a + b, 0) / Math.min(12, s.values.length);
  // the scenario's price as the panel sets it now (D-216)
  const now = set ? (what === "gas" ? set.fuelGas : set.fuelEua) : null;
  const dots = set && now !== null ? [{ x: set.target + 0.5, value: now, tip: `${t("set in the model now")}, ${set.target}: ${fmt(now, 1)} ${unit}` }] : [];
  return `<h3>${title} ${tip(about)}</h3>
  <p class="note">${src(s.src)}</p>
  <figure class="ip-year"><figcaption>${t("{unit} by month, {from} to {to}", { unit: esc(unit), from: s.months[0], to: s.months[s.months.length - 1] })}; <span class="st-key"><span><i class="k-series"></i>${t("the months")}</span> <span><i class="k-trend"></i>${t("least squares")}</span> <span><i class="k-ts"></i>Theil–Sen</span> <span><i class="k-assume"></i>${t("the scenarios' assumptions")}</span>${dots.length ? ` ${SET_KEY()}` : ""}</span></figcaption>${priceFig(s, lq, ts, marks, false, dots)}</figure>
  <table class="wx-table st-table">
    <thead><tr><th></th>${years.map((y) => `<th class="n">${y}</th>`).join("")}</tr></thead>
    <tbody>
      <tr><td>${t("least-squares line: {x} {unit} a year, R² {r2}", { x: signed(lq.slope, 2), unit, r2: fmt(lq.r2 ?? 0, 2) })}</td>${years.map((y) => `<td class="n">${fmt(at(lq, y + 0.5), 1)}</td>`).join("")}</tr>
      <tr><td>${t("Theil–Sen line: {x} {unit} a year", { x: signed(ts.slope, 2), unit })}</td>${years.map((y) => `<td class="n">${fmt(at(ts, y + 0.5), 1)}</td>`).join("")}</tr>
      ${rows.join("")}
      <tr><td>${t("for comparison: the average of the last twelve months")}</td><td class="n" colspan="3">${fmt(last12, 1)}</td></tr>
    </tbody>
  </table>
  <p class="note">${t("The scenarios' prices:")}${src(ids)}</p>`;
}

interface CapRow { family: string; scenario: string; target_year: number; weather: string; zone: string; output: string; mw: number; src: string[] }
type Fleets = Record<string, Record<string, Record<string, { classes: Record<string, { mw: number; src: string[] }> }>>>;

/** What the model assumes for a country and technology: 2035 — the scenario view's fleet for the
 * core zones, TYNDP 2024 Distributed Energy (the neighbours' default profile) for FI and PL; 2040 —
 * TYNDP 2024 National Trends for the core zones (the only TYNDP 2024 fleet the export holds for
 * them), Distributed Energy for FI and PL. Sweden has none: TYNDP's zone is SE4, not the country.
 * `was`: the fleet's own figure where the opening sets the owner's in its place (D-182; E-182); `scenario`: its
 * name, for the diamonds' tips (D-215). */
function assumed(p: Presets, country: string, tech: string, tyndp: string, year: 2035 | 2040): (FuelValue & { was?: number; scenario: string }) | null {
  if (country === "EE" || country === "LV" || country === "LT") {
    const z = opening(p).zones[country], key = year === 2035 ? z.fleet : "pemmdb_nt_2040";
    const f = (p.fleets as unknown as Fleets)[key]?.[country]?.[String(year)];
    if (!f) return null;
    const c = f.classes[tech], mw = year === 2035 ? z.mw[tech] ?? 0 : c?.mw ?? 0;
    const scenario = year === 2035 ? t("the Model view's scenarios: {fleet}", { fleet: FLEET_NAME[key] ?? key }) : "TYNDP 2024 National Trends";
    return { value: mw, unit: "MW", src: c?.src ?? [], scenario, ...(c && c.mw !== mw ? { was: c.mw } : {}) };
  }
  if (country === "SE") return null;
  const r = ((p.boundary as unknown as { capacity: CapRow[] }).capacity)
    .find((x) => x.family === "tyndp2024" && x.scenario === "DE" && x.target_year === year && x.zone === country && x.output === tyndp);
  return r ? { value: r.mw, unit: "MW", src: r.src, scenario: t("TYNDP 2024 Distributed Energy, whose prices the model's neighbours take") } : null;
}
/** The opening's fleets of 2035 by name. */
const FLEET_NAME: Record<string, string> = { [S1]: t("Elering and TalTech's S1"), eraa2025_nt_2035: "ERAA 2025" };

/** A capacity series' readings: each year's addition, the additions' least-squares line, the pace of the last five
 * years and today's capacity. `years` are the additions' years, the series' less its first. */
function readings(cap: number[], years: number[]) {
  const adds = additions(cap);
  return { cap, adds, l: ols(years, adds), pace: adds.slice(-PACE_YEARS).reduce((a, b) => a + b, 0) / PACE_YEARS, now: cap[cap.length - 1] };
}

/** The key of a technology's figures, the capacity's and the additions' bars beside them (D-218). */
const capKey = (c: Statistics["capacity"], set: State | null) => `<p class="note st-key"><span><i class="k-series"></i>${t("installed, {from}–{to}", { from: c.years[0], to: c.years[c.years.length - 1] })}</span> <span><i class="k-trend"></i>${t("trend")}</span> <span><i class="k-ts"></i>${t("pace")}</span> <span><i class="k-assume"></i>${t("the model's figures")}</span>${set ? ` ${SET_KEY()}` : ""} <span><i class="k-bar"></i>${t("net additions")}</span></p>`;
/** Each country's figure of its installed capacity at each year's end, the two readings carried to 2040, the model's
 * figures as diamonds (D-214, D-215) and the panel's as a red dot (D-216), in COUNTRIES' order. */
function capCells(p: Presets, c: Statistics["capacity"], tech: string, tyndp: string, set: State | null): string[] {
  const last = c.years[c.years.length - 1], ahead = Array.from({ length: 2041 - last }, (_, i) => last + i);
  return COUNTRIES.map((k) => {
    const r = readings(c.countries[k][tech].values, c.years.slice(1));
    const trend = ahead.map((y) => byTrend(r.now, last, r.l, y)), pace = ahead.map((y) => byPace(r.now, last, r.pace, y));
    // the model's figure, its tip naming the scenario (D-215)
    const marks = (HORIZON as (2035 | 2040)[]).flatMap((y) => {
      const a = assumed(p, k, tech, tyndp, y);
      return a ? [{ x: y, value: a.value, tip: `${NAME[k]}, ${y}: ${fmt(a.value, 0)} MW — ${a.scenario}${a.was === undefined ? "" : t(", the owner's value for the opening in place of S1's {mw} MW", { mw: fmt(a.was, 0) })}` }] : [];
    });
    // the capacity as the panel sets it now, for the zones the model runs (D-216)
    const now = set && (k === "EE" || k === "LV" || k === "LT") ? { x: set.target, mw: set.zones[k].mw[tech] ?? 0 } : null;
    const dots = now ? [{ x: now.x, value: now.mw, tip: `${NAME[k]}, ${now.x}: ${fmt(now.mw, 0)} MW — ${t("set in the model now")}` }] : [];
    return `<figure class="st-cell"><figcaption>${flag(FLAG[k] ?? k)}${NAME[k]}: ${t("{mw} MW at the end of {year}", { mw: fmt(r.now, 0), year: last })}</figcaption>${capFig(c.years, r.cap, ahead, trend, pace, marks, dots)}</figure>`;
  });
}
/** Each country's figure of its net additions, in COUNTRIES' order, beside its capacity (D-218) and captioned with its
 * pace, the capacity figure's dotted line; a technology none built has its empty figures too (D-219). */
function addCells(c: Statistics["capacity"], tech: string): string[] {
  const years = c.years.slice(1), last = c.years[c.years.length - 1];
  return COUNTRIES.map((k) => {
    const r = readings(c.countries[k][tech].values, years);
    return `<figure class="st-cell"><figcaption>${flag(FLAG[k] ?? k)}${NAME[k]}: ${t("{x} MW a year on average in {from}–{to}", { x: signed(r.pace, 0), from: last - PACE_YEARS + 1, to: last })}</figcaption>${addFig(years, r.adds, r.l, "MW")}</figure>`;
  });
}

/** A technology's table under its figures: today's capacity, the additions, the two readings and the model's columns. */
function techSection(p: Presets, c: Statistics["capacity"], tech: string, tyndp: string, src: (ids: string[]) => string): string {
  const years = c.years.slice(1), last = c.years[c.years.length - 1];
  const rows = COUNTRIES.map((k) => ({ k, ...readings(c.countries[k][tech].values, years) }));
  const a35 = (k: string) => assumed(p, k, tech, tyndp, 2035), a40 = (k: string) => assumed(p, k, tech, tyndp, 2040);
  const cell = (v: FuelValue | null) => v ? `${fmt(v.value, 0)}` : "–";
  // Estonia's onshore wind and solar of 2035, the owner's values: the panel's note, the source S1's (D-182; E-182)
  const was = a35("EE")?.was;
  const owner = was === undefined ? "" : `${NAME.EE}, 2035: ${t("the owner's value for the opening (in place of Elering and TalTech's S1: {mw} MW)", { mw: fmt(was, 0) })}. `;
  return `<div class="st-scroll"><table class="wx-table st-table">
    <thead><tr><th></th><th class="n">${t("end of {year}", { year: last })}</th><th class="n">${t("added in {year}", { year: last })}</th><th class="n">${t("pace {from}–{to}, a year", { from: last - PACE_YEARS + 1, to: last })}</th><th class="n">${t("trend: the additions grow by, a year")}</th>${HORIZON.map((y) => `<th class="n">${t("{year}: trend", { year: y })}</th><th class="n">${t("{year}: pace", { year: y })}</th>`).join("")}<th class="n">${t("the model, 2035")}</th><th class="n">TYNDP 2024, 2040</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td>${flag(FLAG[r.k] ?? r.k)}${NAME[r.k]}</td><td class="n">${fmt(r.now, 0)}</td><td class="n">${signed(r.adds[r.adds.length - 1], 0)}</td><td class="n">${signed(r.pace, 0)}</td><td class="n">${signed(r.l.slope, 0)}</td>${HORIZON.map((y) => `<td class="n">${fmt(byTrend(r.now, last, r.l, y), 0)}</td><td class="n">${fmt(byPace(r.now, last, r.pace, y), 0)}</td>`).join("")}<td class="n">${cell(a35(r.k))}</td><td class="n">${cell(a40(r.k))}</td></tr>`).join("")}</tbody>
  </table></div>
  <p class="note">${owner}${t("Sources of the model's columns:")}${src(COUNTRIES.flatMap((k) => [...(a35(k)?.src ?? []), ...(a40(k)?.src ?? [])]))}</p>${tech === "solar" ? estoniaSolar(p, c, src) : ""}`;
}

/** Estonia's own counts of its solar beside IRENA's (D-093): the TSO's connected capacity and the
 * renewable-energy chamber's, which differ from each other as well. */
function estoniaSolar(p: Presets, c: Statistics["capacity"], src: (ids: string[]) => string): string {
  const v = (k: string) => (p.parameters as unknown as Record<string, { value: number; src: string[] } | undefined>)[k];
  const el = v("statistics.ee.solar.elering_2024_mw"), etk = v("statistics.ee.solar.etk_2025_mw"), add = v("statistics.ee.solar.etk_2025_added_mw");
  if (!el || !etk || !add) return "";
  const ir = c.countries.EE.solar.values, i24 = c.years.indexOf(2024), i25 = c.years.indexOf(2025);
  return `<p class="note">${t("Estonia's own counts of its solar run above IRENA's: Elering, the TSO, gives {el} MW connected at the end of 2024 (IRENA {i24}); the Estonian Chamber of Renewable Energy about {etk} MW at the end of 2025, {add} MW of it added in the year (IRENA {i25}, {d}) — the two national counts do not add up to each other either, each counting what it registers. The lines above are IRENA's, one source for all six countries.", { el: fmt(el.value, 0), i24: fmt(ir[i24], 0), etk: fmt(etk.value, 0), add: fmt(add.value, 0), i25: fmt(ir[i25], 0), d: signed(ir[i25] - ir[i24], 0) })}${src([...el.src, ...etk.src, ...add.src])}</p>`;
}

/** A figure a person read off a publication (D-214): a documentary row of the export (presets.json `parameters`, `key`)
 * and, in words, what it counts and when. */
export interface Fact { zone: string; what: string; when: string; key: string; digits?: number }

/** Figures of one kind by country, each with its source, a country's rows under its name; a row the export lacks is
 * left out, and a kind with none has no table. */
function factTable(p: Presets, facts: Fact[], src: (ids: string[]) => string): string {
  const par = p.parameters as unknown as Record<string, { value: number; unit: string; src: string[] } | undefined>;
  const body = COUNTRIES.flatMap((z) => {
    const fs = facts.filter((f) => f.zone === z && par[f.key]);
    return fs.length ? [`<tr class="wx-zone"><td colspan="4">${flag(FLAG[z] ?? z)}${NAME[z]}</td></tr>`,
      ...fs.map((f) => { const v = par[f.key]!; return `<tr><td>${f.what}</td><td class="n">${fmt(v.value, f.digits ?? 0)} ${esc(v.unit)}</td><td class="n">${esc(f.when)}</td><td>${src(v.src)}</td></tr>`; })] : [];
  });
  return body.length ? `<div class="st-scroll"><table class="wx-table st-table st-facts"><thead><tr><th></th><th class="n">${t("figure")}</th><th class="n">${t("as of")}</th><th>${t("source")}</th></tr></thead><tbody>${body.join("")}</tbody></table></div>` : "";
}

// the data centres' figures by country (D-214): what they consume, what is asked for, what is firm, what the operators
// and the model's research expect
export const DC_FACTS: Fact[] = [
  { zone: "EE", what: t("connection requests to Elering, seven projects (in the press)"), when: "2026-09", key: "statistics.dc.ee.requests_mw" },
  { zone: "EE", what: t("the projects more likely to be built (Enterprise Estonia's estimate)"), when: "2026-10", key: "statistics.dc.ee.likely_mw" },
  { zone: "EE", what: t("every project planned, at most (the same estimate)"), when: "2026-10", key: "statistics.dc.ee.planned_mw" },
  { zone: "EE", what: t("under construction: Greenergy's first hall at Harku, from late 2026"), when: "2026", key: "statistics.dc.ee.greenergy_hall_mw" },
  { zone: "EE", what: t("Elering's forecast of all consumption in 2030, new energy-intensive industry left out"), when: "2026-07", key: "statistics.dc.ee.elering_demand_2030_twh" },
  { zone: "LV", what: t("consumption in 2024 (Eurostat)"), when: "2024", key: "statistics.dc.lv.eurostat_2024_gwh", digits: 1 },
  { zone: "LV", what: t("connection requests to AST, six from five applicants"), when: "2026-09", key: "statistics.dc.lv.requests_mw" },
  { zone: "LV", what: t("of them capacity reserved: Latvenergo at Riga's CHP-2"), when: "2026-09", key: "statistics.dc.lv.reserved_mw" },
  { zone: "LV", what: t("in operation: Delska's new data centre in Riga"), when: "2026-04", key: "statistics.dc.lv.delska_mw" },
  { zone: "LT", what: t("consumption in 2024 (Eurostat)"), when: "2024", key: "statistics.dc.lt.eurostat_2024_gwh", digits: 1 },
  { zone: "LT", what: t("letter of intent: Kruonis DC at the pumped-storage plant, up to"), when: "2026-10", key: "statistics.dc.lt.kruonis_mw" },
  { zone: "LT", what: t("Litgrid's plan, national scenario: consumption in 2030"), when: "2026-06", key: "statistics.dc.lt.plan_2030_twh", digits: 1 },
  { zone: "LT", what: t("the same in 2035"), when: "2026-06", key: "statistics.dc.lt.plan_2035_twh", digits: 1 },
  { zone: "FI", what: t("consumption in 2024 (Eurostat)"), when: "2024", key: "statistics.dc.fi.eurostat_2024_gwh" },
  { zone: "FI", what: t("in operation, nominal (the industry association's count)"), when: "2026-04", key: "statistics.dc.fi.operating_mw" },
  { zone: "FI", what: t("connection enquiries to Fingrid, not binding"), when: "2026-09", key: "statistics.dc.fi.enquiries_gw" },
  { zone: "FI", what: t("signed connection agreements, the distribution networks' included"), when: "2026-08", key: "statistics.dc.fi.agreements_gw" },
  { zone: "FI", what: t("Fingrid's High Growth, the basis of its grid planning: consumption in 2030"), when: "2026-09", key: "statistics.dc.fi.plan_2030_twh" },
  { zone: "FI", what: t("the same in 2035"), when: "2026-09", key: "statistics.dc.fi.plan_2035_twh" },
  { zone: "SE", what: t("consumption in 2024 (Eurostat)"), when: "2024", key: "statistics.dc.se.eurostat_2024_gwh" },
  { zone: "SE", what: t("applications in Svenska kraftnät's queue, none of them in SE4"), when: "2026-10", key: "statistics.dc.se.requests_mw" },
  { zone: "SE", what: t("capacity allocated or reserved (in the press, quoting Svenska kraftnät)"), when: "2026-10", key: "statistics.dc.se.reserved_gw", digits: 1 },
  { zone: "SE", what: t("the model's research, 2035: case A, the operator's central path"), when: "2026-10", key: "se2035.datacentres_twh.a" },
  { zone: "SE", what: t("case C, demand comes: the neighbours' tight profile"), when: "2026-10", key: "se2035.datacentres_twh.c" },
  { zone: "PL", what: t("consumption in 2024 (Eurostat)"), when: "2024", key: "statistics.dc.pl.eurostat_2024_gwh" },
  { zone: "PL", what: t("connection conditions issued by PSE, none of them yet an agreement"), when: "2026-09", key: "statistics.dc.pl.conditions_mw" },
  { zone: "PL", what: t("requests PSE has not yet answered"), when: "2026-09", key: "statistics.dc.pl.applications_mw" },
  { zone: "PL", what: t("PSE's draft plan: consumption in 2036"), when: "2026-04", key: "statistics.dc.pl.plan_2036_twh", digits: 1 },
  { zone: "PL", what: t("the model's research, 2035: case A, the operator's central path"), when: "2026-10", key: "pl2035.datacentres_twh.a" },
  { zone: "PL", what: t("case C, demand comes: the neighbours' tight profile"), when: "2026-10", key: "pl2035.datacentres_twh.c" },
];

// the new industrial loads by country (D-214): hydrogen, e-fuels, steel, electric heat — what is asked for, what is
// firm, what the operators expect; industry's consumption today for scale
export const IND_FACTS: Fact[] = [
  { zone: "EE", what: t("industry's consumption in 2024 (Eurostat)"), when: "2024", key: "statistics.ind.ee.eurostat_2024_gwh" },
  { zone: "EE", what: t("electrolysers in 2035, were every project of Elering's hydrogen survey built"), when: "2025-10", key: "statistics.ind.ee.h2_survey_2035_mw" },
  { zone: "EE", what: t("state aid granted: BHG-Estonia's electrolysis for ammonia at Sillamäe"), when: "2025-09", key: "statistics.ind.ee.bhg_mw" },
  { zone: "LV", what: t("industry's consumption in 2024 (Eurostat)"), when: "2024", key: "statistics.ind.lv.eurostat_2024_gwh" },
  { zone: "LV", what: t("capacity reserved for hydrogen production: CIS Liepaja at Grobiņa, technical conditions sent"), when: "2026-09", key: "statistics.ind.lv.h2_reserved_mw" },
  { zone: "LV", what: t("electric heat for district heating in commissioning: Riga and Jelgava"), when: "2026-09", key: "statistics.ind.lv.heat_commissioning_mw", digits: 1 },
  { zone: "LV", what: t("AST's base scenario: the hydrogen plants' consumption in 2035"), when: "2026", key: "statistics.ind.lv.h2_b_2035_gwh" },
  { zone: "LT", what: t("industry's consumption in 2024 (Eurostat)"), when: "2024", key: "statistics.ind.lt.eurostat_2024_gwh" },
  { zone: "LT", what: t("state aid approved: Achema's electrolyser, no investment decision found"), when: "2024-07", key: "statistics.ind.lt.achema_mw" },
  { zone: "LT", what: t("Litgrid's plan, national scenario: new industry's consumption in 2035, from its letters of intent"), when: "2026-06", key: "statistics.ind.lt.industry_2035_twh", digits: 1 },
  { zone: "LT", what: t("the same: new industry's addition to the peak load"), when: "2026-06", key: "statistics.ind.lt.industry_peak_2035_mw" },
  { zone: "LT", what: t("the same: electrolysis's consumption in 2035"), when: "2026-06", key: "statistics.ind.lt.electrolysis_2035_twh", digits: 1 },
  { zone: "LT", what: t("electrolysers installed in 2035 in the plan's slower scenario, from the connection conditions issued"), when: "2026-06", key: "statistics.ind.lt.electrolysers_2035_gw", digits: 2 },
  { zone: "FI", what: t("industry's consumption in 2024 (Eurostat)"), when: "2024", key: "statistics.ind.fi.eurostat_2024_gwh" },
  { zone: "FI", what: t("in operation: P2X Solutions' electrolyser at Harjavalta, Finland's only one of industrial scale"), when: "2025-02", key: "statistics.ind.fi.harjavalta_mw" },
  { zone: "FI", what: t("withdrawn: Neste's electrolyser at the Porvoo refinery"), when: "2024-10", key: "statistics.ind.fi.porvoo_mw" },
  { zone: "FI", what: t("electric boilers under construction or in operation, mostly for district heating, over"), when: "2026-08", key: "statistics.ind.fi.boilers_gw" },
  { zone: "FI", what: t("Fingrid's High Growth: industry's consumption in 2030, hydrogen and e-fuels included, data centres not"), when: "2026-09", key: "statistics.ind.fi.plan_2030_twh" },
  { zone: "FI", what: t("the same in 2035"), when: "2026-09", key: "statistics.ind.fi.plan_2035_twh" },
  { zone: "SE", what: t("industry's consumption in 2024 (Eurostat)"), when: "2024", key: "statistics.ind.se.eurostat_2024_gwh" },
  { zone: "SE", what: t("industry's applications in Svenska kraftnät's queue, hydrogen within them, none in SE4"), when: "2026-10", key: "statistics.ind.se.requests_mw" },
  { zone: "SE", what: t("of them in SE1, the north's steel and hydrogen"), when: "2026-10", key: "statistics.ind.se.requests_se1_mw" },
  { zone: "SE", what: t("ordered: electrolysers for Stegra's steelworks at Boden (the supplier's contract), more than"), when: "2023-05", key: "statistics.ind.se.stegra_mw" },
  { zone: "SE", what: t("Svenska kraftnät's short-term analysis: hydrogen production's consumption in 2030"), when: "2026-03", key: "statistics.ind.se.h2_2030_twh" },
  { zone: "SE", what: t("the model's research, 2035: hydrogen production, case A, the operator's central path"), when: "2026-10", key: "se2035.hydrogen_twh.a", digits: 1 },
  { zone: "SE", what: t("case C, demand comes: the neighbours' tight profile"), when: "2026-10", key: "se2035.hydrogen_twh.c" },
  { zone: "PL", what: t("industry's consumption in 2024 (Eurostat)"), when: "2024", key: "statistics.ind.pl.eurostat_2024_gwh" },
  { zone: "PL", what: t("connection conditions for three hydrogen projects: Orlen's HyFly at Gdańsk and NRG 25's two hubs"), when: "2026-09", key: "statistics.ind.pl.h2_conditions_mw" },
  { zone: "PL", what: t("connection agreements in force: ArcelorMittal's steelworks, ANWIL's chemicals, RE Alloys' ferroalloys"), when: "2026-09", key: "statistics.ind.pl.agreements_mw" },
  { zone: "PL", what: t("PSE's draft plan: electrolysers connected in 2036"), when: "2026-04", key: "statistics.ind.pl.electrolysers_2036_mw" },
  { zone: "PL", what: t("the same: new industrial loads' consumption in 2036"), when: "2026-04", key: "statistics.ind.pl.new_industry_2036_twh" },
  { zone: "PL", what: t("the model's research, 2035, case C: electrolysers"), when: "2026-10", key: "pl2035.electrolysers_gw.c", digits: 1 },
];

/** A tab of figures by country (D-214): its heading, what the figures are, the table; none where the export holds none. */
function factSection(p: Presets, title: string, about: string, facts: Fact[], src: (ids: string[]) => string): string {
  const table = factTable(p, facts, src);
  return table && `<h3>${title}</h3><p class="note">${about}</p>${table}<p class="note">${t("The research note <code>docs/research/2026-11-04_datacentres_industry.md</code> has the sources, what is soft in them and what was left out.")}</p>`;
}

interface MeanPrice { family: string; scenario: string; target_year: number; zone: string; value: number; src: string[] }
const ZONE_NAME: Record<string, string> = { EE: t("Estonia"), LV: t("Latvia"), LT: t("Lithuania"), FI: t("Finland"), SE4: t("Sweden's SE4"), PL: t("Poland") };

/** The six zones' day-ahead prices by month over the ten years (D-092), each with the two lines to
 * 2040; beside the neighbours, TYNDP 2024 Distributed Energy's average price as published, the profile
 * the model's neighbours take before their levels (D-194). */
function zonePrices(p: Presets, ps: Record<string, Monthly>, src: (ids: string[]) => string, set: State | null = null): string {
  const zones = ["EE", "LV", "LT", "FI", "SE4", "PL"].filter((z) => ps[z]);
  if (!zones.length) return "";
  const mp = ((p.boundary as unknown as { mean_price: MeanPrice[] }).mean_price);
  const tyndp = (z: string, y: number) => mp.find((r) => r.family === "tyndp2024" && r.scenario === "DE" && r.target_year === y && r.zone === z) ?? null;
  const rows = zones.map((z) => { const s = ps[z], xs = s.months.map(mid); return { z, s, lq: ols(xs, s.values), ts: theilSen(xs, s.values) }; });
  const years = [2030, 2035, 2040];
  const last12 = (s: Monthly) => s.values.slice(-12).reduce((a, b) => a + b, 0) / Math.min(12, s.values.length);
  // a neighbour's average price as the panel sets it now: its profile's average, as the panel's list gives it, at its
  // level (D-216)
  const now = (z: string): Mark[] => {
    if (!set || (z !== "FI" && z !== "SE4" && z !== "PL")) return [];
    const base = mp.find((r) => r.scenario === set.profile && r.target_year === set.profileYear && r.zone === z)?.value;
    if (base === undefined) return [];
    const lv = set.level[z], v = base * lv;
    return [{ x: set.profileYear + 0.5, value: v, tip: `${ZONE_NAME[z]}, ${set.profileYear}: ${fmt(v, 1)} €/MWh — ${t("set in the model now")}: ${t("the profile's average {p} €/MWh × {lv}", { p: fmt(base, 1), lv: fmt(lv, 2) })}${z === "FI" && set.fiSlope > 0 ? t(", before the slope moves it") : ""}` }];
  };
  return `<h3>${t("Day-ahead prices: the six zones, €/MWh")}</h3>
  <p class="note">${t("Each zone's day-ahead price by month (ENTSO-E, the hour's average of the quarter-hours since October 2025), {from} to {to}, with the same two lines as the fuels. Estonia, Latvia and Lithuania are the prices the model computes; Finland's, SE4's and Poland's are their zones' prices, which the replays take as they stand until the flow-based go-lives and then at each cable's end (Poland's ran several €/MWh above it in 2024–2025).", { from: rows[0].s.months[0], to: rows[0].s.months[rows[0].s.months.length - 1] })} ${ps.PL && ps.PL.months[0] !== rows[0].s.months[0] ? t("Poland's series starts in {month}: ENTSO-E publishes its day-ahead prices in złoty from March 2017 to November 2019, and its euro prices before that miss too many hours for a month to count. ", { month: ps.PL.months[0] }) : ""} ${t("Beside the neighbours, TYNDP 2024 Distributed Energy's average price as its market model published it — the profile the scenarios take, before their price levels.")}${set ? ` ${t("The red dot: each neighbour's average price as the model sets it now, its profile's at the level the panel sets.")}` : ""}${src(rows.flatMap((r) => r.s.src))}</p>
  <div class="st-grid">${rows.map((r) => `<figure class="st-cell"><figcaption>${flag(r.z)}${ZONE_NAME[r.z]}: ${t("{x} €/MWh over the last twelve months", { x: fmt(last12(r.s), 1) })}</figcaption>${priceFig(r.s, r.lq, r.ts, [2035, 2040].flatMap((y) => { const tp = tyndp(r.z, y); return tp ? [{ x: y + 0.5, value: tp.value, tip: t("TYNDP 2024 Distributed Energy, {year}: {x} €/MWh, the average price its market model published", { year: y, x: fmt(tp.value, 1) }) + (y === 2035 ? t(" — the neighbours' profile the Model view takes, before its price levels") : "") }] : []; }), true, now(r.z))}</figure>`).join("")}</div>
  <div class="st-scroll"><table class="wx-table st-table">
    <thead><tr><th></th><th class="n">${t("last 12 months")}</th><th class="n">${t("least squares, a year")}</th><th class="n">R²</th>${years.map((y) => `<th class="n">${t("{year}: least squares", { year: y })}</th>`).join("")}<th class="n">${t("Theil–Sen, a year")}</th>${years.map((y) => `<th class="n">${y}: Theil–Sen</th>`).join("")}<th class="n">TYNDP 2024 DE, 2035</th><th class="n">TYNDP 2024 DE, 2040</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td>${flag(r.z)}${ZONE_NAME[r.z]}</td><td class="n">${fmt(last12(r.s), 1)}</td><td class="n">${signed(r.lq.slope, 2)}</td><td class="n">${fmt(r.lq.r2 ?? 0, 2)}</td>${years.map((y) => `<td class="n">${fmt(at(r.lq, y + 0.5), 1)}</td>`).join("")}<td class="n">${signed(r.ts.slope, 2)}</td>${years.map((y) => `<td class="n">${fmt(at(r.ts, y + 0.5), 1)}</td>`).join("")}<td class="n">${tyndp(r.z, 2035) ? fmt(tyndp(r.z, 2035)!.value, 1) : "–"}</td><td class="n">${tyndp(r.z, 2040) ? fmt(tyndp(r.z, 2040)!.value, 1) : "–"}</td></tr>`).join("")}</tbody>
  </table></div>
  <p class="note">${t("TYNDP 2024's average prices, weighted over its climate years as the runs weight them:")}${src(zones.flatMap((z) => [...(tyndp(z, 2035)?.src ?? []), ...(tyndp(z, 2040)?.src ?? [])]))}</p>`;
}

/** Sweden by bidding area (D-093): SE4's wind as Energimyndigheten counts it, onshore and offshore
 * together, read as the countries are, beside TYNDP 2024 Distributed Energy's SE4; and Sweden's own
 * count of its wind beside IRENA's. */
function areaSection(p: Presets, c: Statistics["capacity"], src: (ids: string[]) => string): string {
  const se4 = c.areas?.SE4?.wind, se = c.areas?.SE?.wind;
  if (!se4 || !se) return "";
  const years = c.years.slice(1), last = c.years[c.years.length - 1];
  const { adds, l, now, pace } = readings(se4.values, years);
  const rows = ((p.boundary as unknown as { capacity: CapRow[] }).capacity);
  const tyndp = (y: number) => { const r = rows.filter((x) => x.family === "tyndp2024" && x.scenario === "DE" && x.target_year === y && x.zone === "SE4" && (x.output === "Wind Onshore" || x.output === "Wind Offshore"));
    const w = rows.find((x) => x.family === "tyndp2024" && x.scenario === "DE" && x.target_year === y && x.zone === "SE4")?.weather;
    const one = r.filter((x) => x.weather === w); return one.length ? { value: one.reduce((s, x) => s + x.mw, 0), src: one.flatMap((x) => x.src) } : null; };
  const t35 = tyndp(2035), t40 = tyndp(2040);
  const irena = c.countries.SE, ir = (i: number) => irena.wind_onshore.values[i] + irena.wind_offshore.values[i];
  const n = c.years.length - 1;
  return `<h3>${t("Sweden by bidding area: SE4's wind, MW added a year (Energimyndigheten)")}</h3>
  <p class="note">${t("Energimyndigheten counts Sweden's wind by bidding area, onshore and offshore together; SE4 is the model's neighbour. Its national sum for the end of {year} is {mw} MW ({d} in the year) against IRENA's {ir} ({di}): Sweden's own count is the one to read for the last year.", { year: last, mw: fmt(se.values[n], 0), d: signed(se.values[n] - se.values[n - 1], 0), ir: fmt(ir(n), 0), di: signed(ir(n) - ir(n - 1), 0) })}${src(se4.src)}</p>
  <div class="st-grid"><figure class="st-cell"><figcaption>${flag("SE4")}SE4: ${t("{mw} MW at the end of {year}", { mw: fmt(now, 0), year: last })}</figcaption>${addFig(years, adds, l, "MW")}</figure></div>
  <div class="st-scroll"><table class="wx-table st-table">
    <thead><tr><th></th><th class="n">${t("end of {year}", { year: last })}</th><th class="n">${t("added in {year}", { year: last })}</th><th class="n">${t("pace {from}–{to}, a year", { from: last - PACE_YEARS + 1, to: last })}</th><th class="n">${t("trend: the additions grow by, a year")}</th>${HORIZON.map((y) => `<th class="n">${t("{year}: trend", { year: y })}</th><th class="n">${t("{year}: pace", { year: y })}</th>`).join("")}<th class="n">TYNDP 2024 DE, 2035</th><th class="n">TYNDP 2024 DE, 2040</th></tr></thead>
    <tbody><tr><td>${flag("SE4")}${t("SE4, all wind")}</td><td class="n">${fmt(now, 0)}</td><td class="n">${signed(adds[adds.length - 1], 0)}</td><td class="n">${signed(pace, 0)}</td><td class="n">${signed(l.slope, 0)}</td>${HORIZON.map((y) => `<td class="n">${fmt(byTrend(now, last, l, y), 0)}</td><td class="n">${fmt(byPace(now, last, pace, y), 0)}</td>`).join("")}<td class="n">${t35 ? fmt(t35.value, 0) : "–"}</td><td class="n">${t40 ? fmt(t40.value, 0) : "–"}</td></tr></tbody>
  </table></div>
  <p class="note">${t("TYNDP 2024's SE4, onshore and offshore wind together:")}${src([...(t35?.src ?? []), ...(t40?.src ?? [])])}</p>`;
}

/** The page (R-APP-14). `state`: the panel's, whose values set now the red dots show (D-216); `shown`: the tab open,
 * which a redraw keeps. */
export function statisticsHtml(p: Presets, sources: Sources = { documents: {}, families: {}, records: {} }, state: State | null = null, shown = "gas"): string {
  const src = srcOf(sources), set = state?.run === "scenario" ? state : null;
  const st = (p as unknown as { statistics?: Statistics }).statistics;
  if (!st) return `<section class="ip st"><p class="error">${t("The export holds no statistics (presets.json `statistics`): rebuild it with `make export`.")}</p></section>`;
  const c = st.capacity, first = c.years[1], last = c.years[c.years.length - 1];
  // the capacity's method, the same under Wind and under Solar
  const built = (tech: string) => `<h3>${t("{tech}: what was built, {from}–{to}", { tech, from: first, to: last })}</h3>
  <p class="note">${t("Net additions: each year's installed capacity at its end less the year before's — a year that retired more than it built is below zero. IRENASTAT, IRENA's database of national statistics (for the EU mostly Eurostat's figures), release 2026 H2; national counts differ in what they include and when a plant counts — by little for most series, by much for Estonia's solar and for Sweden's wind of 2025, where the TSO's and the industry's counts are well above IRENA's, so those two lines run low (the research note compares them, with their sources). Sweden is the whole country: the statistics have no bidding zones, and SE4, the model's neighbour, is its southern part. The line through each country's ten years is the least-squares line of its additions. The table reads the installed capacity of {horizon} two ways: <b>trend</b> — every year from {next} adds what the line gives for it, nothing where the line is below zero; <b>pace</b> — every year adds the average of {from}–{to}, as the slow-build sensitivity reads the record. Beside them, what the model assumes: for Estonia, Latvia and Lithuania in 2035 the scenario view's fleets (Elering's for Estonia, ERAA 2025's for Latvia and Lithuania), in 2040 TYNDP 2024 National Trends; for Finland and Poland TYNDP 2024 Distributed Energy, whose prices the model's neighbours take; none for Sweden, whose TYNDP zone is SE4 alone.", { horizon: HORIZON.join(t(" and ")), next: last + 1, from: last - PACE_YEARS + 1, to: last })}${src(c.src)} ${t("Capacity statistics © IRENA 2026.")}</p>`;
  // a technology's tab (D-217): what was built, its installed capacity, its additions and their table; SE4's wind by
  // bidding area under onshore wind, which SE4 built
  const part = (key: string, name: string) => {
    const [k, label, tyndp] = TECHS.find(([x]) => x === key)!;
    // each country's capacity and additions side by side, a country to a row, the table under them (D-218, D-219); a
    // technology none of the six added any of, offshore wind, has its sentence (D-197) above its empty figures
    const adds = addCells(c, k), none = COUNTRIES.every((z) => additions(c.countries[z][k].values).every((x) => x <= 0));
    return built(name) + `<h3>${t("{tech}: installed capacity at the year's end and net additions a year, MW", { tech: label })}</h3>
  ${capKey(c, set)}${none ? `<p class="note">${t("Offshore wind: none of the six countries added any in {from}–{to}; the capacity counted is Finland's and Sweden's older farms, so both readings stay near today's capacity, and every offshore farm in the model's scenarios is one the statistics cannot show yet.", { from: first, to: last })}</p>` : ""}
  <div class="st-grid st-pairs">${capCells(p, c, k, tyndp, set).map((f, i) => f + adds[i]).join("")}</div>` + techSection(p, c, k, tyndp, src) + (k === "wind_onshore" ? areaSection(p, c, src) : "");
  };
  // the page's parts as tabs (D-213): a part the export lacks has none
  const tabs = ([
    ["gas", t("Gas"), priceSection(p, st.gas, "gas", t("Gas: the TTF price, €/MWh of gas"), t("TTF, the Dutch hub price that Baltic gas follows: the World Bank's monthly average (Pink Sheet, \"Natural gas, Europe\"), in euros per MWh of gas at the ECB's dollar rate of the same month — the series behind the fuel cost of the observed years' bids. The scenario of 2035 takes ERAA 2025's path; the gas-shock sensitivity takes the highest month of 2026."), src, set)],
    ["eua", "CO₂", priceSection(p, st.eua, "eua", t("CO₂: the EU ETS allowance price, €/t"), t("The average clearing price of EEX's primary auctions of EU allowances in each month, from January 2017: EEX's public archive of auction reports begins in 2017, so this series has {n} months, not 120. Allowances trade every day on the secondary market at nearly the same price.", { n: st.eua.months.length }), src, set)],
    ["onshore", t("Onshore wind"), part("wind_onshore", t("Onshore wind"))],
    ["offshore", t("Offshore wind"), part("wind_offshore", t("Offshore wind"))],
    ["solar", t("Solar"), part("solar", t("Solar"))],
    ["datacentres", t("Data centres"), factSection(p, t("Data centres: what they consume, ask for and have firm, by country"), t("What data centres consume, ask the grid for and have firm, by country, from the operators', the governments' and the companies' own publications, a figure from the press marked so; each with its date and its source. A connection request is not demand: the queues run far ahead of what gets built, and a figure in MW is the capacity at the connection point, not a year's load. Eurostat's statistics of data centres' consumption begin with 2024 for Latvia, Lithuania and Poland; Estonia reports none. The model's constant load, the panel's line for data centres, is 0 MW in Estonia, Latvia and Lithuania in every scenario; the neighbours' tight profile takes the research's case C, data centres included."), DC_FACTS, src)],
    ["industry", t("Industry"), factSection(p, t("New industrial loads: hydrogen, e-fuels, steel and electric heat, by country"), t("The large new consumers other than data centres — electrolysers for hydrogen and e-fuels, steel, electric boilers for district heating — as the operators, the governments and the companies publish them, each figure with its date and its source; industry's consumption of 2024 for scale (Eurostat). Most of it is plans and reserved capacity: in the Baltic states no electrolyser beyond a pilot is running or being built, and the largest ordered nearby, for Stegra's steelworks at Boden, is in Sweden's far north, not in SE4. Elering's demand forecast leaves new energy-intensive industry out, AST adds its hydrogen plants as a line of their own, and Litgrid counts its letters of intent."), IND_FACTS, src)],
    ["prices", t("Prices"), zonePrices(p, st.prices ?? {}, src, set)],
  ] as [key: string, label: string, body: string][]).filter(([, , body]) => body);
  const open = tabs.some(([k]) => k === shown) ? shown : tabs[0][0];
  return `<section class="ip st">
  <h2>${t("Statistics")} ${tip(t("Statistics: ten years of fuel prices and of wind and solar build-out, and where their lines lead"))}</h2>
  <details class="about"><summary>${t("About this page")}</summary><p class="note">${t("The two prices every thermal bid of the model is made of, and the wind and solar capacity the Baltic states and their neighbours added, over the last ten years; through each a straight line, carried to 2040. A line through the past is arithmetic, not a forecast: it says where a price or a fleet would be if the decade's direction held, and the model's own assumptions stand beside it. Two lines for the prices — least squares, the line a spreadsheet draws, and Theil–Sen, the median of the slopes between every two months, which the spike of 2022 moves little — and two readings for the capacity: the additions' trend goes on, or the pace of the last five years holds.")}</p></details>
  <div class="tabs" role="group" aria-label="${t("Statistics shown")}">${tabs.map(([k, label]) =>
    `<button type="button" class="seg" data-stat="${k}" aria-pressed="${k === open}">${label}</button>`).join("")}</div>
  ${tabs.map(([k, , body]) => `<div class="st-pane" data-pane="${k}"${k === open ? "" : " hidden"}>${body}</div>`).join("\n  ")}
  <p class="note">${t("The research note <code>docs/research/2026-10-06_statistics.md</code> has the sources, the national counts beside IRENA's and the method.")}</p>
</section>`;
}
