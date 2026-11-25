// The import-price page (D-040): a boundary zone's hourly price as the clearing takes it — the
// profile times the panel's price level (engine/build.ts boundaryPrice, R-BND-5) — for each year of
// the set shown, with its monthly statistics, its profile by hour of the day, its duration curve
// and, for a TYNDP profile of either family, the generation of the zone the market model priced it with
// (R-BND-8). The level slider is the panel's: moving it here moves the scenario. main.ts loads the
// year files; this renders them. Every figure is drawn as SVG from the same arrays the tables show.

import { lang, t } from "./i18n.ts";
import type { Presets } from "../contract/presets.ts";
import { esc, fmt, signed } from "./labels.ts";
import { fill, flag, tickLeft, tip } from "./panel.ts";
import type { Statistics } from "./statistics.ts";

export type Zone = "FI" | "SE4" | "PL";
const IP_ZONES: Zone[] = ["FI", "SE4", "PL"];

interface IpRun { label: string; weight: number; price: Float64Array; base: Float64Array; weather: string | null }
export interface IpInput {
  zone: Zone;
  level: number;
  slope: number; // FI only, €/MWh per GW; 0 = price-taker
  kind: "observed" | "tyndp2024" | "tyndp2026";
  scenario: string; // "DE", "GA", "NT", "NTplus"; the observed year's number in a replay
  target: number | null;
  runs: IpRun[];
  presets: Presets;
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTHS = lang === "et" ? ["jaan", "veebr", "märts", "apr", "mai", "juuni", "juuli", "aug", "sept", "okt", "nov", "dets"]
  : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HIGH = 100; // €/MWh, the owner's threshold for the count of dear hours

const mean = (a: ArrayLike<number>) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s / a.length; };
const sorted = (a: ArrayLike<number>) => Float64Array.from(a).sort();
/** The q-quantile by linear interpolation between the order statistics; q = 0.5 is the median. */
function quantile(s: Float64Array, q: number): number {
  const i = q * (s.length - 1), lo = Math.floor(i), hi = Math.min(lo + 1, s.length - 1);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}

export interface Stats { mean: number; median: number; min: number; max: number; zero: number; negative: number; high: number }
export function stats(a: ArrayLike<number>): Stats {
  const s = sorted(a);
  let zero = 0, negative = 0, high = 0;
  for (let i = 0; i < s.length; i++) { if (s[i] === 0) zero++; else if (s[i] < 0) negative++; if (s[i] > HIGH) high++; }
  return { mean: mean(s), median: quantile(s, 0.5), min: s[0], max: s[s.length - 1], zero, negative, high };
}

/** The first hour of each month and the end: a leap year's February has 29 days (8 784 hours);
 * the climate years' TYNDP layout has 8 760. A month past the year's last hour is left out. */
export function monthStarts(hours: number): number[] {
  const out = [0];
  MONTH_DAYS.forEach((d, m) => out.push(out[m] + 24 * (m === 1 && hours >= 8784 ? 29 : d)));
  return out.map((h) => Math.min(h, hours));
}

export function monthly(a: Float64Array): (Stats | null)[] {
  const b = monthStarts(a.length);
  return MONTHS.map((_, m) => (b[m + 1] > b[m] ? stats(a.subarray(b[m], b[m + 1])) : null));
}

/** Per hour of the day, the 10, 25, 50, 75 and 90 % points and the average over the year's days. */
export function byHour(a: Float64Array): { q: number[]; mean: number }[] {
  return Array.from({ length: 24 }, (_, h) => {
    const x: number[] = [];
    for (let i = h; i < a.length; i += 24) x.push(a[i]);
    const s = sorted(x);
    return { q: [0.1, 0.25, 0.5, 0.75, 0.9].map((q) => quantile(s, q)), mean: mean(s) };
  });
}

// ------------------------------------------------------------------ the mix (R-BND-8, D-040)

type Row = { family: string; scenario: string; target_year: number; weather: string; zone: string; output: string; twh?: number; mw?: number; src: string[] };
const EV = "EV: "; // the electric cars' nodes, kept apart by the pipeline (D-041)
const NET_EXPORT = "Net annual country balance [GWh] (Export is positive)";
const DUMP = "Dump energy [GWh]";
/** The market model's rows grouped as the page shows them; the first match wins. Other renewable leads, so that its green
 * stands beside no yellow for a colour-blind reader (the order checked with the dataviz palette validator, D-197).
 * `a68`: the ENTSO-E production types of the observed fleet counted in the group (the pipeline's codes, D-256). */
export const GROUPS: { name: string; css: string; test: (o: string) => boolean; a68: string[] }[] = [
  { name: "Other renewable", css: "bio_waste", test: (o) => o === "Others renewable", a68: ["biomass", "geothermal", "marine", "other_renewable"] },
  { name: "Nuclear", css: "nuclear", test: (o) => o === "Nuclear", a68: ["nuclear"] },
  { name: "Hydro", css: "hydro", test: (o) => /^(Reservoir|Run-of-River|Pondage)$|\(turbine\)$/.test(o), a68: ["hydro_ror", "hydro_reservoir", "hydro_ps"] },
  { name: "Wind onshore", css: "wind", test: (o) => o === "Wind Onshore", a68: ["wind_onshore"] },
  { name: "Wind offshore", css: "wind off", test: (o) => o === "Wind Offshore", a68: ["wind_offshore"] },
  { name: "Solar", css: "solar", test: (o) => o.startsWith("Solar"), a68: ["solar"] },
  { name: "Batteries", css: "storage", test: (o) => o.startsWith("Battery") && o.includes("discharge"), a68: ["battery"] },
  { name: "Electric cars (vehicle to grid)", css: "storage ev", test: (o) => o.startsWith(EV), a68: [] },
  { name: "Demand response", css: "other dsr", test: (o) => o === "Demand Side Response", a68: [] },
  { name: "Gas", css: "gas", test: (o) => o.startsWith("Gas") && !o.includes("biofuel"), a68: ["gas"] },
  { name: "Coal and lignite", css: "oil_shale", test: (o) => /^(Hard coal|Lignite)/i.test(o) && !o.includes("biofuel"), a68: ["hard_coal", "brown_coal"] },
  { name: "Other thermal", css: "other", test: () => true, a68: ["coal_gas", "oil", "oil_shale", "peat", "waste", "other"] }, // oil, oil shale, hydrogen, biofuel-fired, others non-renewable
];
const isLoad = (o: string) => /\((load|pump)\)$/.test(o);

interface Mix { groups: number[]; rows: { output: string; twh: number }[]; generation: number; loads: number; electrolysis: number; netExport: number; dump: number; demand: number | null; src: string[] }

const rowsOf = (p: Presets, key: "generation" | "capacity", zone: Zone, scenario: string, target: number, weather: string) =>
  ((p.boundary as Record<string, Row[] | undefined>)[key] ?? []).filter((r) =>
    r.zone === zone && r.scenario === scenario && r.target_year === target && r.weather === weather);

export function mixOf(p: Presets, zone: Zone, scenario: string, target: number, weather: string): Mix | null {
  const rows = rowsOf(p, "generation", zone, scenario, target, weather).map((r) => ({ ...r, twh: r.twh! }));
  if (!rows.length) return null;
  const groups = GROUPS.map(() => 0);
  let loads = 0, electrolysis = 0, netExport = 0, dump = 0;
  for (const r of rows) {
    const o = r.output.replace(EV, ""); // the cars' nodes' exchanges with the zone's main node cancel in the sum
    if (o === NET_EXPORT) netExport += r.twh;
    else if (o === DUMP) dump += r.twh;
    else if (isLoad(r.output)) { loads += r.twh; if (r.output.startsWith("Electrolyser")) electrolysis += r.twh; }
    else groups[GROUPS.findIndex((g) => g.test(r.output))] += r.twh;
  }
  const d = (p.boundary as { demand?: { family: string; scenario: string; target_year: number; weather: string; zone: string; demand_twh: number }[] }).demand
    ?.find((r) => r.zone === zone && r.scenario === scenario && r.target_year === target && r.weather === weather);
  return { groups, rows: rows.map(({ output, twh }) => ({ output, twh })), generation: groups.reduce((s, x) => s + x, 0), loads, electrolysis, netExport, dump,
    demand: d ? d.demand_twh : null, src: [...new Set(rows.flatMap((r) => r.src))] };
}

/** The zone's installed capacity by the same groups (the discharge side of each store), and the
 * loads that can take power: electrolysers and heat pumps. */
export interface Capacity { groups: number[]; electrolysers: number; heatPumps: number }
export function capacityOf(p: Presets, zone: Zone, scenario: string, target: number, weather: string): Capacity | null {
  const rows = rowsOf(p, "capacity", zone, scenario, target, weather);
  if (!rows.length) return null;
  const c: Capacity = { groups: GROUPS.map(() => 0), electrolysers: 0, heatPumps: 0 };
  for (const r of rows) {
    if (r.output.startsWith("Electrolyser")) c.electrolysers += r.mw!;
    else if (/Heat Pump \(load\)$/.test(r.output)) c.heatPumps += r.mw!;
    else if (!isLoad(r.output)) c.groups[GROUPS.findIndex((g) => g.test(r.output))] += r.mw!;
  }
  return c;
}

/** The zone's observed fleet by the same groups (D-256): ENTSO-E's installed capacity on 1 January of `year`,
 * the end of the year before; wind and solar as the Statistics page counts them at that year's end (IRENASTAT),
 * where the zone is a country it holds — ENTSO-E's document lists no offshore wind and trails on solar. A group
 * none of whose types the sources list is null — not reported, which is not zero. */
export function fleetOf(p: Presets, zone: Zone): { year: number; groups: (number | null)[]; src: string[] } | null {
  const rows = (p.boundary.fleet ?? []).filter((r) => r.zone === zone);
  if (!rows.length) return null;
  const year = rows[0].year, groups: (number | null)[] = GROUPS.map(() => null), src = new Set(rows.flatMap((r) => r.src));
  for (const r of rows) {
    const g = GROUPS.findIndex((x) => x.a68.includes(r.tech));
    if (g < 0) throw new Error(`boundary.fleet: ${r.tech} is in no group`);
    groups[g] = (groups[g] ?? 0) + r.mw;
  }
  const st = (p as unknown as { statistics?: Statistics }).statistics?.capacity, at = st?.years.indexOf(year - 1) ?? -1;
  GROUPS.forEach((g, i) => {
    const series = at < 0 || g.a68.length !== 1 ? undefined : st!.countries[zone]?.[g.a68[0]]; // the series' keys are the pipeline's codes too
    if (series) { groups[i] = series.values[at]; series.src.forEach((id) => src.add(id)); }
  });
  return { year, groups, src: [...src] };
}

// ------------------------------------------------------------------ drawing

const W = 1000;
const n1 = (x: number) => x.toFixed(1);
/** One scale for every figure, stopped where a few dear hours would press the rest flat: at every
 * year's 99.8 % point, but not above twice its 95 % point — TYNDP 2026's scarcity hours (up to
 * 3 000 €/MWh, 246 hours above 500 in Finland's WS059) would otherwise set it. The hours above are
 * drawn on the top edge and counted. The profile before the level counts too, so that a level below
 * 1 visibly lowers the lines. */
function axisOf(runs: IpRun[]): Axis {
  const s = runs.flatMap((r) => [sorted(r.price), sorted(r.base)]);
  const top = Math.max(...s.map((x) => Math.min(quantile(x, 0.998), 2 * quantile(x, 0.95))));
  return { lo: Math.min(0, Math.floor(Math.min(...s.map((x) => x[0])) / 20) * 20), hi: Math.max(40, Math.ceil(top / 40) * 40) };
}
/** A month's cell shaded by its price on the figures' axis, one hue from light to dark (dearer is
 * darker); a negative price in the warning hue. The number stays in the text colour. */
function shade(v: number, ax: Axis): string {
  if (v < 0) return `background:color-mix(in srgb, var(--amber) ${Math.round(15 + 25 * Math.min(1, v / Math.min(-1, ax.lo)))}%, transparent)`;
  return `background:color-mix(in srgb, var(--accent) ${Math.round(45 * Math.min(1, v / ax.hi))}%, transparent)`;
}
/** The price axis: an observed year's negative hours below 0, every value clamped to the axis. */
type Axis = { lo: number; hi: number };
const yOf = (ax: Axis, top: number, h: number) => (v: number) => top + h - ((Math.max(ax.lo, Math.min(v, ax.hi)) - ax.lo) / (ax.hi - ax.lo)) * h;

function grid(x0: number, x1: number, top: number, h: number, ax: Axis, step: number): string {
  let s = "";
  const at = yOf(ax, top, h);
  const lines = h >= 150 ? 8 : 4; // a low figure keeps its labels apart
  step = [step, 40, 50, 100, 200, 500].find((x) => x >= step && (ax.hi - ax.lo) / x <= lines) ?? 1000;
  for (let v = Math.ceil(ax.lo / step) * step; v <= ax.hi; v += step) {
    const y = at(v);
    s += `<line class="grid" x1="${x0}" x2="${x1}" y1="${n1(y)}" y2="${n1(y)}"/><text class="tick" x="${x0 - 6}" y="${n1(y + 4)}" text-anchor="end">${v}</text>`;
  }
  return s + `<text class="tick" transform="translate(${x0 - 34},${n1(top + h / 2)}) rotate(-90)" text-anchor="middle">€/MWh</text>`;
}

/** The year's hours as one vertical stroke per pixel column from its lowest to its highest price:
 * every spike and every zero stays visible at any width. */
const HL = 50, HR = 8; // the hourly figure's margins, which its monthly table repeats as columns
function hourly(a: Float64Array, ax: Axis): string {
  const L = HL, R = HR, top = 8, h = 100, cols = W - L - R;
  const b = monthStarts(a.length);
  let d = "";
  for (let c = 0; c < cols; c++) {
    const i0 = Math.floor((c * a.length) / cols), i1 = Math.max(i0 + 1, Math.floor(((c + 1) * a.length) / cols));
    let lo = Infinity, hi = -Infinity;
    for (let i = i0; i < i1; i++) { lo = Math.min(lo, a[i]); hi = Math.max(hi, a[i]); }
    const y = (v: number) => n1(yOf(ax, top, h)(v));
    d += `M${L + c + 0.5},${y(hi)}V${y(lo) === y(hi) ? n1(Number(y(lo)) + 0.6) : y(lo)}`;
  }
  const months = MONTHS.map((m, i) => (b[i + 1] > b[i] ? `<text class="tick" x="${n1(L + (b[i] / a.length) * cols + 2)}" y="${top + h + 14}">${m}</text>` : "")).join("");
  return `<svg class="ip-fig" viewBox="0 0 ${W} ${top + h + 20}" role="img" aria-label="${t("hourly price, €/MWh")}">${grid(L, W - R, top, h, ax, 40)}<path class="series" d="${d}"/>${months}</svg>`;
}

function hourProfile(a: Float64Array, ax: Axis, clock: string): string {
  const PW = 210, L = 44, R = 6, top = 8, h = 150, w = PW - L - R; // a third of half the page
  const x = (k: number) => n1(L + (k / 23) * w), y = (v: number) => n1(yOf(ax, top, h)(v));
  const hs = byHour(a);
  const band = (lo: number, hi: number, cls: string) => `<path class="${cls}" d="M${hs.map((v, k) => `${x(k)},${y(v.q[hi])}`).join(" L")} L${hs.map((v, k) => `${x(k)},${y(v.q[lo])}`).reverse().join(" L")} Z"/>`;
  const line = (f: (v: { q: number[]; mean: number }) => number, cls: string) => `<path class="${cls}" d="M${hs.map((v, k) => `${x(k)},${y(f(v))}`).join(" L")}"/>`;
  return `<svg class="ip-fig ip-small" viewBox="0 0 ${PW} ${top + h + 34}" role="img" aria-label="${t("price by hour of the day, €/MWh")}">${grid(L, PW - R, top, h, ax, 40)}
    ${band(0, 4, "band90")}${band(1, 3, "band50")}${line((v) => v.q[2], "series thick")}${line((v) => v.mean, "series thick dash")}
    ${[0, 6, 12, 18, 23].map((k) => `<text class="tick" x="${x(k)}" y="${top + h + 14}" text-anchor="middle">${k}</text>`).join("")}
    <text class="tick" x="${n1(L + w / 2)}" y="${top + h + 30}" text-anchor="middle">${esc(clock)}</text></svg>`;
}

const DASH = ["", "6 4", "2 3", "10 3 2 3"];
/** A climate year's colour class (theme.css, D-197); another year keeps the accent. */
const yc = (label: string) => (["1995", "2008", "2009"].includes(label) ? ` y${label}` : "");
function duration(runs: IpRun[], ax: Axis, level: number): string {
  const DW = 600, L = 50, R = 8, top = 8, h = 150, w = DW - L - R; // half the page
  const y = (v: number) => n1(yOf(ax, top, h)(v));
  const curve = (a: Float64Array, cls: string, dash: string) => {
    const s = sorted(a).reverse(), step = Math.max(1, Math.floor(s.length / 2000));
    const pts: string[] = [];
    for (let i = 0; i < s.length; i += step) pts.push(`${n1(L + (i / s.length) * w)},${y(s[i])}`);
    pts.push(`${n1(L + w)},${y(s[s.length - 1])}`);
    return `<path class="${cls}" ${dash ? `stroke-dasharray="${dash}"` : ""} d="M${pts.join(" L")}"/>`;
  };
  const hours = runs[0].price.length;
  const ticks = Array.from({ length: Math.floor(hours / 1000) + 1 }, (_, i) => i * 1000)
    .map((k) => `<text class="tick" x="${n1(L + (k / hours) * w)}" y="${top + h + 14}" text-anchor="middle">${k}</text>`).join("");
  // the published profile beside the price the model takes, once the two differ
  const moved = Math.abs(level - 1) > 1e-9;
  return `<svg class="ip-fig" viewBox="0 0 ${DW} ${top + h + 34}" role="img" aria-label="${t("price duration curve, €/MWh")}">${grid(L, DW - R, top, h, ax, 20)}
    <line class="grid strong" x1="${L}" x2="${DW - R}" y1="${y(HIGH)}" y2="${y(HIGH)}"/>
    ${moved ? runs.map((r, i) => curve(r.base, "series base", DASH[i % DASH.length])).join("") : ""}
    ${runs.map((r, i) => curve(r.price, `series thick${yc(r.label)}`, DASH[i % DASH.length])).join("")}${ticks}
    <text class="tick" x="${n1(L + w / 2)}" y="${top + h + 30}" text-anchor="middle">${t("hours of the year with a price at or above the value")}</text></svg>`;
}

/** The groups drawn as one band, "other" (D-197): other thermal and every group under 3 % of each mix's generation;
 * the table under the bars keeps them apart. */
const folded = (mixes: { mix: Mix }[]) => GROUPS.map((g, i) => g.css === "other" || mixes.every(({ mix }) => mix.groups[i] < 0.03 * mix.generation));

function mixBars(mixes: { label: string; mix: Mix }[]): string {
  const fold = folded(mixes);
  const max = Math.max(...mixes.map((m) => m.mix.generation));
  const note = (mix: Mix) => (mix.demand === null ? "" : t("demand {x} + ", { x: fmt(mix.demand, 0) })) + t("electrolysers {x}", { x: fmt(mix.electrolysis, 0) });
  // the labels right of the bars have room for the longest, in either language (11 px figures, 0.6 em each)
  const R = Math.max(190, 10 + 6.6 * Math.max(...mixes.map(({ mix }) => note(mix).length)));
  const scale = Math.max(50, Math.ceil(max / 50) * 50), L = 70, w = W - L - R;
  const bars = mixes.map(({ label, mix }, j) => {
    const y = 6 + j * 40;
    let x = L;
    const rest = mix.groups.reduce((a, v, g) => a + (fold[g] ? v : 0), 0);
    const bands: [css: string, name: string, v: number][] = [...mix.groups.flatMap((v, g) => (fold[g] ? [] : [[GROUPS[g].css, t(GROUPS[g].name), v] as [string, string, number]])),
      ["other", `${t("other")} (${GROUPS.filter((_, g) => fold[g] && mix.groups[g] > 0).map((x) => t(x.name)).join(", ")})`, rest]];
    const seg = bands.map(([css, name, v]) => {
      if (v <= 0) return "";
      const dx = (v / scale) * w;
      const s = `<rect class="g ${css}" x="${n1(x)}" y="${y}" width="${n1(dx)}" height="28"><title>${esc(name)}: ${fmt(v, 1)} TWh</title></rect>${dx > 30 ? `<text class="in" x="${n1(x + dx / 2)}" y="${y + 18}" text-anchor="middle">${fmt(v, 0)}</text>` : ""}`;
      x += dx;
      return s;
    }).join("");
    return `<text class="lab" x="0" y="${y + 18}">${esc(label)}</text>${seg}<text class="tick" x="${n1(x + 8)}" y="${y + 12}">${t("generation {x} TWh", { x: fmt(mix.generation, 0) })}</text>
      <text class="tick" x="${n1(x + 8)}" y="${y + 25}">${note(mix)}</text>`;
  }).join("");
  const axisY = 6 + mixes.length * 40;
  const axis = Array.from({ length: scale / 50 + 1 }, (_, i) => i * 50).map((v) => `<line class="grid" x1="${n1(L + (v / scale) * w)}" x2="${n1(L + (v / scale) * w)}" y1="${axisY - 4}" y2="${axisY}"/><text class="tick" x="${n1(L + (v / scale) * w)}" y="${axisY + 12}" text-anchor="middle">${v}</text>`).join("");
  return `<svg class="ip-fig" viewBox="0 0 ${W} ${axisY + 18}" role="img" aria-label="${t("annual generation by group, TWh")}">${bars}${axis}<text class="tick" x="${n1(L + w + 26)}" y="${axisY + 12}">${t("TWh per year")}</text></svg>`;
}

// ------------------------------------------------------------------ the page

const ABOUT: Record<string, string> = {
  DE: "Distributed Energy (DE): higher European autonomy with a renewable, decentralised focus — prosumers, PV, batteries, smart charging, heat pumps; minimal CCS and nuclear; EU climate neutrality by 2050.",
  GA: "Global Ambition (GA): a global economy with centralised low-carbon and renewable options — large-scale technologies such as offshore wind and large storage, and diversified imports.",
  NT: "National Trends+ (NT): the aggregate of the Member States' national pathways.",
};
const REPORT = t("TYNDP 2024 Scenarios Report, final version, January 2025, Figure 3");

function about(a: IpInput): string {
  if (a.kind === "observed") return `<p class="note">${t("An observed year: the price is {zone}'s day-ahead price as ENTSO-E published it (A44); the model takes it as it was, times the level. Hours are UTC.", { zone: a.zone })}</p>`;
  if (a.scenario === "REAL") return `<p class="note">${t("The neighbours' prices of {year} as that year's replay takes them — each zone's price at its end of the cable: ENTSO-E's day-ahead price (A44) and, since the flow-based go-lives, the market's spread at the cable's hub — hour by hour, begun at the year's first Monday as the climate years' layout begins on one, and taken into each climate year of the scenario, times the level. They are not a market model's and do not follow the climate year's weather; the three years therefore show one series, and its months are the layout's, a few days off the calendar's.", { year: String(a.target) })}</p>`;
  if (a.scenario.startsWith("TIGHT")) return `<p class="note">${t("The neighbours tight in {year}: energiamudel's own research on Finland, Sweden and Poland, its case C — demand comes (data centres, industry, electrification) and the build lags (wind, nuclear, firm capacity) — {how} of the gas scenario. The research models each country's market on the model's own engine, tests it on the record of 2023–2025 — Sweden's SE3 and Poland's hourly order fall short of the tests — and takes its 2035 inputs from TYNDP 2024 and ERAA 2025; every assumption is sourced, with the evidence against it beside it. The prices are frozen at ERAA 2025's fuel prices of 2035 and do not follow the scenario's. A conditional case, not a forecast.", { year: String(a.target),
    how: a.scenario === "TIGHT" ? t("each country's case as its own research ran it, the others at the profile in force, Finland's coupled with the Baltic states") : t("all three at once, solved together and coupled with the Baltic states") })}</p>`;
  if (a.kind === "tyndp2026") return `<p class="note">${t("TYNDP 2026 National Trends+: the prices of its market model for each weather scenario of {year}, weighted as the package weights them — modelled prices, not a forecast. Each weather scenario is a modelled year of a climate projection, not a past year; the generation and the capacity below are the same model's, per weather scenario.", { year: String(a.target) })}</p>`;
  return `<p class="note">${t("TYNDP 2024: the Ten-Year Network Development Plan 2024 of ENTSO-E and ENTSOG. Its market model clears the countries of Europe together (35 in its output files), hour by hour, each with its own fleet, demand and weather, and gives each node's marginal cost — a modelled price, not a forecast.")} ${esc(t(ABOUT[a.scenario] ?? ""))} ${t("The other scenarios: {list}. Source: {report}. {year} is the target year; the three climate years are the weather the prices were computed for.", { list: Object.entries(ABOUT).filter(([k]) => k !== a.scenario).map(([, text]) => esc(text.split(":")[0])).join(t(" and ")), report: REPORT, year: String(a.target) })}</p>`;
}

function mixSection(a: IpInput): string {
  if (a.kind === "observed" || a.scenario === "REAL" || a.scenario.startsWith("TIGHT") || a.target === null) return "";
  const mixes = a.runs.flatMap((r) => { const m = r.weather ? mixOf(a.presets, a.zone, a.scenario, a.target!, r.weather) : null; return m ? [{ label: r.label, mix: m }] : []; });
  if (!mixes.length) return `<p class="note">${t("The export holds no generation for {zone} in this profile.", { zone: a.zone })}</p>`;
  const used = GROUPS.map((_, g) => mixes.some((m) => m.mix.groups[g] > 0));
  const fold = folded(mixes);
  const legend = GROUPS.map((g, i) => (used[i] && !fold[i] ? `<span class="key"><span class="sw g ${g.css}"></span>${esc(t(g.name))}</span>` : "")).join("")
    + (GROUPS.some((_, i) => used[i] && fold[i]) ? `<span class="key"><span class="sw g other"></span>${t("other")}</span>` : "");
  const table = `<table class="calib ip-table"><thead><tr><th>TWh</th>${GROUPS.map((g, i) => (used[i] ? `<th>${esc(t(g.name))}</th>` : "")).join("")}<th>${t("generation")}</th><th>${t("demand")}</th><th>${t("electrolysers")}</th><th>${t("other loads")}</th><th>${t("net export")}</th><th>${t("dumped")}</th></tr></thead><tbody>${
    mixes.map(({ label, mix: m }) => `<tr><td>${esc(label)}</td>${m.groups.map((v, i) => (used[i] ? `<td class="n">${fmt(v, 1)}</td>` : "")).join("")}<td class="n">${fmt(m.generation, 1)}</td><td class="n">${m.demand === null ? "–" : fmt(m.demand, 1)}</td><td class="n">${fmt(m.electrolysis, 1)}</td><td class="n">${fmt(m.loads - m.electrolysis, 1)}</td><td class="n">${fmt(m.netExport, 1)}</td><td class="n">${fmt(m.dump, 1)}</td></tr>`).join("")}</tbody></table>`;
  return `<h3>${t("The generation behind the price: {zone} in the market model, TWh a year", { zone: `${flag(a.zone)}${a.zone}` })}</h3>
    <p class="note">${a.kind === "tyndp2026"
      ? t("The market model's own hourly outputs for {zone}, summed over the year (the NT+ hourly dashboards, the zone's market node and its prosumer node together). The electric cars' charging is part of the demand here; what they give back is shown as generation.", { zone: a.zone })
      : t("The market model's own annual outputs for {zone} (sheet \"Yearly Outputs\", every node of the zone summed).", { zone: a.zone })} ${t("Generation = demand + electrolysers + other loads (battery charge, pumps) + net export; dumped energy is curtailed and not in generation. Context only: the model of this site takes {zone}'s price, not its fleet, and the level moves the price alone. Source: {src}.", { zone: a.zone, src: mixes.length ? esc([...new Set(mixes.flatMap((m) => m.mix.src))].join(", ")) : "" })}</p>
    <div class="ip-legend">${legend}</div>${mixBars(mixes)}${table}${capacitySection(a, mixes)}`;
}

/** Installed capacity beside the generation: one MW column when the climate years share the fleet
 * (TYNDP 2024 runs one fleet over its weather years), and each year's full-load hours. Before it the zone's
 * observed fleet at the end of last year, and after it the change from that fleet in per cent (D-256). */
function capacitySection(a: IpInput, mixes: { label: string; mix: Mix }[]): string {
  const caps = a.runs.flatMap((r) => { const c = r.weather ? capacityOf(a.presets, a.zone, a.scenario, a.target!, r.weather) : null; return c ? [{ label: r.label, cap: c }] : []; });
  if (!caps.length) return "";
  const same = caps.every((c) => JSON.stringify(c.cap) === JSON.stringify(caps[0].cap));
  const cols = same ? [{ label: `MW ${a.target}`, cap: caps[0].cap }] : caps.map((c) => ({ label: `MW ${c.label}`, cap: c.cap }));
  const fleet = fleetOf(a.presets, a.zone), end = fleet ? fleet.year - 1 : 0;
  const name = (r: { name: string }) => esc(t(r.name));
  const hours = (twh: number, mw: number) => (mw > 0 && twh > 0 ? fmt((twh * 1e6) / mw, 0) : "–");
  const change = (mw: number, was: number | null) => (was ? `${signed((mw / was - 1) * 100, 0)} %` : was === 0 && mw > 0 ? t("new") : "–");
  const twhOf = (label: string, g: number) => mixes.find((m) => m.label === label)?.mix.groups[g] ?? 0;
  const elOf = (label: string) => mixes.find((m) => m.label === label)?.mix.electrolysis ?? 0;
  const rows = GROUPS.map((g, i) => ({ name: g.name, css: g.css, was: fleet?.groups[i] ?? null, mw: cols.map((c) => c.cap.groups[i]), twh: (l: string) => twhOf(l, i) }))
    .filter((r) => r.was || r.mw.some((x) => x > 0)) // a group the fleet has and the market model has closed keeps its row
    .concat([{ name: "Electrolysers (load)", css: "", was: null, mw: cols.map((c) => c.cap.electrolysers), twh: elOf }, { name: "Heat pumps (load)", css: "", was: null, mw: cols.map((c) => c.cap.heatPumps), twh: () => 0 }]
      .filter((r) => r.mw.some((x) => x > 0)));
  return `<h3>${t("Installed capacity: {zone} in the market model, MW", { zone: `${flag(a.zone)}${a.zone}` })}</h3>
    <p class="note">${a.kind === "tyndp2026"
      ? t("The dashboards' \"Installed Capacity\" sheet, the zone's market node and its prosumer node together; a store counts its discharge side, and the sheet gives the electric cars no capacity. \"Other thermal\" holds the prosumer node's adequacy units where the model has them. ")
      : t("The same sheet's \"Installed Capacities [MW]\", every node of the zone summed; a store counts its discharge side. ")}${t("Full-load hours = the year's generation (or load) over the capacity. ")}${a.kind === "tyndp2024" && a.zone === "FI" ? t("The electric cars' batteries are the vehicle-to-grid capacity of the model's car nodes, not stationary storage. ") : ""}${same ? (a.kind === "tyndp2026" ? t("The weather scenarios share one fleet.") : t("The climate years share one fleet.")) : ""}${fleet
      ? ` ${t("MW {year}: the fleet in service at the end of {year} — ENTSO-E's installed capacity per production type on 1 January {next} (A68), its types gathered into the same groups; coal-derived gas, oil, peat, waste and \"other\" stand under other thermal. The change is from that fleet to the market model's. A type the document does not list shows –, and no change is given from it. ", { year: end, next: fleet.year })}${a.zone === "SE4" ? t("For SE4 it lists hydro, onshore wind and one \"other\" for everything else. ") : t("Wind and solar are the Statistics page's, at the year's end (IRENASTAT). ")}${t("Source: {src}.", { src: esc(fleet.src.join(", ")) })}` : ""}</p>
    <table class="calib ip-table ip-cap"><thead><tr><th></th>${fleet ? `<th>MW ${end}</th>` : ""}${cols.map((c) => `<th>${esc(c.label)}</th>${fleet ? `<th>${t("change")}</th>` : ""}`).join("")}${mixes.map((m) => `<th>${t("full-load hours {year}", { year: esc(m.label) })}</th>`).join("")}</tr></thead><tbody>${
    rows.map((r) => `<tr><td>${r.css ? `<span class="sw g ${r.css}"></span>` : ""}${name(r)}</td>${fleet ? `<td class="n">${r.was === null ? "–" : fmt(r.was, 0)}</td>` : ""}${r.mw.map((x) => `<td class="n">${fmt(x, 0)}</td>${fleet ? `<td class="n">${change(x, r.was)}</td>` : ""}`).join("")}${mixes.map((m) => `<td class="n">${r.name === "Heat pumps (load)" ? "–" : hours(r.twh(m.label), r.mw[0])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

const weightedMean = (a: IpInput, f: (r: IpRun) => number) => a.runs.reduce((s, r) => s + r.weight * f(r), 0) / a.runs.reduce((s, r) => s + r.weight, 0);

/** The line under the slider: the profile's weighted average, the level, the average the model takes. */
export function ipHint(a: IpInput): string {
  const price = weightedMean(a, (r) => mean(r.price));
  const base = t("weighted average {a} €/MWh", { a: fmt(weightedMean(a, (r) => mean(r.base))) });
  return `${base} × ${fmt(a.level, 2)} = ${fmt(price)} €/MWh${a.zone === "FI" && a.slope > 0 ? t(", before the slope of {x} €/MWh per GW moves it with the flow", { x: fmt(a.slope, 0) }) : ""}`;
}

/** The page: its head (the zone chips and the level slider) stays in place while the slider moves;
 * main.ts redraws `#ip-body` alone (ipBody) so that a drag is never cut. */
export function importPriceHtml(a: IpInput): string {
  if (!a.runs.length) return `<p class="status">${t("loading the year files…")}</p>`;
  const chips = `<div class="segs" role="group" aria-label="${t("Boundary zone")}">${IP_ZONES.map((z) => `<button type="button" class="chip" data-ipzone="${z}" aria-pressed="${z === a.zone}">${flag(z)}${z}</button>`).join("")}</div>`;
  const changed = Math.abs(a.level - 1) > 1e-9;
  // the preset, ×1, under the knob's centre as the panel's (E-179)
  const share = (1 - 0.5) / (3 - 0.5);
  const slider = `<div class="row ip-level"><label for="ip-level">${flag(a.zone)}${t("{c} price level", { c: esc(a.zone) })}</label>
    <span class="val num${changed ? " changed" : ""}" id="ip-v">× ${fmt(a.level, 2)}</span>
    <div class="rng"><input type="range" id="ip-level" data-ip="level" data-preset="1" min="0.5" max="3" step="0.01" value="${a.level}" style="${fill(a.level, 0.5, 3)}" aria-label="${t("{c} price level", { c: esc(a.zone) })}, ×" aria-valuetext="× ${fmt(a.level, 2)}${changed ? t(", changed from the preset") : ""}">
      <span class="tick" style="left:${tickLeft(share)}" aria-hidden="true"></span></div>
    <div class="hint num" id="ip-hint">${ipHint(a)}</div></div>`;
  return `<section class="ip">
    <h2>${t("Import price: {zone} as the model takes it", { zone: `${flag(a.zone)}${a.zone}` })}</h2>
    <details class="about"><summary>${t("About this page")}</summary><p class="note">${t("The model buys from and sells to a neighbour at that neighbour's hourly price, up to the line's capacity. The price is the profile of the neighbours' scenario in the panel times the price level — the same function the engine calls. The slider is the panel's: moving it here reruns the model.")}</p></details>
    <div class="box ip-controls">${chips}${slider}</div><div id="ip-body">${ipBody(a)}</div></section>`;
}

export function ipBody(a: IpInput): string {
  const ax = axisOf(a.runs);
  const above = (r: IpRun) => r.price.reduce((n, v) => n + Number(v > ax.hi), 0);
  const clock = a.kind === "observed" ? t("hour, UTC") : t("hour of the day");
  const changed = Math.abs(a.level - 1) > 1e-9;
  const years = a.runs.map((r) => {
    const s = stats(r.price), ms = monthly(r.price);
    const row = (name: string, f: (x: Stats) => number) => `<tr><th>${name}</th>${ms.map((x) => (x ? `<td style="${shade(f(x), ax)}">${fmt(f(x), 1)}</td>` : "<td>–</td>")).join("")}<td></td></tr>`;
    const b = monthStarts(r.price.length), pct = (x: number) => `${((100 * x) / W).toFixed(3)}%`;
    const cols = `<colgroup><col style="width:${pct(HL)}">${MONTHS.map((_, m) => `<col style="width:${pct(((b[m + 1] - b[m]) / r.price.length) * (W - HL - HR))}">`).join("")}<col style="width:${pct(HR)}"></colgroup>`;
    return `<figure class="ip-year"><figcaption><strong>${esc(r.label)}</strong> ${t("(weight {w}) — average {a}, median {m}, min {lo}, max {hi} €/MWh;", { w: fmt(r.weight, 3), a: fmt(s.mean, 1), m: fmt(s.median, 1), lo: fmt(s.min, 1), hi: fmt(s.max, 1) })}
      ${t("hours at 0: {n};", { n: s.zero })}${s.negative ? t(" hours below 0: {n};", { n: s.negative }) : ""} ${t("hours above {x} €/MWh: {n}", { x: HIGH, n: s.high })}</figcaption>${hourly(r.price, ax)}
      <table class="ip-months">${cols}<thead><tr><th>€/MWh</th>${MONTHS.map((m) => `<th>${m}</th>`).join("")}<th></th></tr></thead><tbody>
      ${row(t("max"), (x) => x.max)}${row(t("average"), (x) => x.mean)}${row(t("median"), (x) => x.median)}${row(t("min"), (x) => x.min)}</tbody></table></figure>`;
  }).join("");
  const hours = a.runs.map((r) => `<figure class="ip-hour"><figcaption>${esc(r.label)}</figcaption>${hourProfile(r.price, ax, clock)}</figure>`).join("");
  const legend = a.runs.map((r, i) => `<span class="key"><svg width="28" height="8" aria-hidden="true"><line class="series thick${yc(r.label)}" x1="0" x2="28" y1="4" y2="4" ${DASH[i % DASH.length] ? `stroke-dasharray="${DASH[i % DASH.length]}"` : ""}/></svg>${esc(r.label)}: ${t("above {x} €/MWh {h} h, at 0 {z} h", { x: HIGH, h: stats(r.price).high, z: stats(r.price).zero })}</span>`).join("");
  return `<div class="ip-top"><div>
    <h3>${t("Price duration curve, €/MWh")} ${tip(`${t("The year's hours sorted from the dearest to the cheapest")}${changed ? t("; the faint lines are the profile as published, before the level") : ""}${t("; the line across marks {x} €/MWh. The axis is the hourly figures' ({hi} €/MWh): the dearest hours above it run along the top edge.", { x: HIGH, hi: ax.hi })}`)}</h3>
    <div class="ip-legend">${legend}</div>${duration(a.runs, ax, a.level)}</div><div>
    <h3>${t("Price by hour of the day, €/MWh")} ${tip(`${t("Each hour over the year's days: light band 10–90 %, dark band 25–75 %, solid line the median, dashed line the average")}${a.kind === "observed" ? "" : t("; the hour of the TYNDP layout")}.`)}</h3><div class="ip-hours">${hours}</div></div></div>
    <h3>${t("Hourly price, €/MWh (one scale for all years)")} ${tip(`${t("The axis stops at {hi} €/MWh (every year's 99.8 % point, at most twice its 95 % point); {list} above it, drawn on the top edge (each year's maximum is in its line). Under each figure its months' maximum, average, median and minimum, each cell shaded by its price on the same scale — darker is dearer", { hi: ax.hi, list: a.runs.map((r) => `${esc(r.label)}: ${above(r)} h`).join(", ") })}${a.runs.some((r) => stats(r.price).min < 0) ? t(", amber below zero") : ""}.`)}</h3>${years}
    ${mixSection(a)}
    <h3>${t("About the profile")}</h3>${about(a)}`;
}
