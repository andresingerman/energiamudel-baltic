// The right column (R-APP-1, R-APP-2, R-APP-11): what the run is, a card per zone with the set's
// weighted figures, the standard sensitivities as differences to the headline, and the charts of
// the year chosen from the set.

import type { Presets } from "../contract/presets.ts";
import { gasBidParts } from "../engine/build.ts";
import { account } from "../engine/contract.ts";
import type { State } from "../state/model.ts";
import { FUEL_CASES } from "../state/model.ts";
import type { RunView } from "../worker/view.ts";
import type { Actual } from "./actual.ts";
import type { Attribution } from "./attribution.ts";
import { labels } from "./attribution.ts";
import { esc, fmt, signed } from "./labels.ts";
import { flag, tip } from "./panel.ts";
import { t } from "./i18n.ts";

const ZONES = ["EE", "LV", "LT"];

// a year's result, its meta and its labels are the worker's (worker/assemble.ts), so that the worker holds no
// interface text (D-237); they are named here as before
import type { YearResult } from "../worker/assemble.ts";
export type { YearMeta, YearResult } from "../worker/assemble.ts";
export { labelsOf } from "../worker/assemble.ts";

/** R-TIME-4: a climate year by its ranks among the PECD years; a TYNDP 2026 weather scenario by its
 * climate model, modelled year and Estonian capacity factors, never as a historical year. */
export function yearLabel(r: YearResult): string {
  const l = r.labels;
  if (!l) return "";
  if ("ee_wind_onshore_rank" in l) return t(", Estonian onshore wind rank {w}, solar rank {s} and demand-peak rank {d} of {n} weather years (1 = the lowest)", { w: l.ee_wind_onshore_rank, s: l.ee_solar_rank, d: l.ee_demand_peak_rank, n: l.years });
  return t(" (climate model {m}, modelled year {y}), Estonian onshore wind capacity factor {w} and solar {s}", { m: l.climate_model, y: l.modelled_year, w: fmt(Number(l.ee_wind_onshore_cf), 3), s: fmt(Number(l.ee_solar_cf), 3) })
    + (l.ee_solar_proxy ? t(" ({proxy}'s)", { proxy: l.ee_solar_proxy }) : "");
}

/** The note under a set of years: each year's weight and label, and once for weather scenarios
 * that their temperature is a climatology (D-015, E-133). */
export function setNote(set: YearResult[]): string {
  const weather = set.some((r) => r.labels && "climate_model" in r.labels);
  const climate = set.some((r) => r.labels && "ee_wind_onshore_rank" in r.labels);
  return `${set.map((r) => `${r.label}: ${t("weight")} ${fmt(r.weight, 3)}${yearLabel(r)}`).join(" · ")}${weather ? t("; their temperature, and with it the heat-driven floors, is the 2020–2025 average at each hour, without cold spells") : ""}${climate ? t("; Lithuania's onshore wind at 0.80 of PECD's capacity factor, where its fleet delivers 0.61 of it") : ""}`;
}

/** Σ weight × f(year) over the set, per zone. */
export function weighted(set: YearResult[], f: (v: RunView, z: number) => number): number[] {
  const w = set.reduce((s, r) => s + r.weight, 0);
  return [0, 1, 2].map((z) => set.reduce((s, r) => s + r.weight * f(r.view, z), 0) / w);
}

/** What the state pays in a year under the contract (a), settled hourly at `strike`, M€ (negative: the operator pays
 * back), weighted over the set's years with the plant; 0 without it (R-SMR-3, PLAN §3.4). */
export function statePaysOf(set: YearResult[], strike: number, clause: boolean): number {
  const runs = set.filter((r) => r.view.plant);
  if (!runs.length) return 0;
  return runs.reduce((a, r) => a + r.weight * account(r.view.zones[0].price, r.view.plant!.mw, r.view.plant!.month, strike, "hourly", clause).stateMeur, 0)
    / runs.reduce((a, r) => a + r.weight, 0);
}

/** The median of the set's hours, each year's hours weighing its weight over its hours: half the
 * weighted hours cheaper, half dearer (E-109; a set of one is its year's own median). */
export function weightedMedian(set: YearResult[], z: number): number {
  if (set.length === 1) return set[0].view.zones[z].median;
  const pts = set.flatMap((r) => Array.from(r.view.zones[z].price, (p) => [p, r.weight / r.view.zones[z].price.length] as const));
  pts.sort((a, b) => a[0] - b[0]);
  const half = pts.reduce((s, [, w]) => s + w, 0) / 2;
  let c = 0;
  for (const [p, w] of pts) if ((c += w) >= half) return p;
  return pts[pts.length - 1][0];
}

const ZONE_NAME = [t("Estonia"), t("Latvia"), t("Lithuania")];

/** What a card's row means: a "?" beside it in the Estonian card, which stands first (the owner
 * asked, 2026-09-26; the other two cards carry the same rows). */
const HELP: Record<string, string> = {
  mean: t("The average of the year's hourly prices (for a scenario, the climate years weighted)."),
  median: t("Half of the hours were cheaper than this, half dearer (for a scenario, the climate years' hours weighted)."),
  impTwh: t("Energy bought from the neighbours: Finland, Latvia or Lithuania, Sweden, Poland."),
  impEur: t("What that energy cost, valued at the zone's hourly price."),
  expTwh: t("Energy sold to the neighbours."),
  expEur: t("What that energy earned, valued at the zone's hourly price."),
  balTwh: t("Export minus import: green when the country sells more than it buys, red when it buys more."),
  balEur: t("Export earnings minus import costs: green when the trade brings money in, red when it takes money out."),
  border: t("Hours in which at least one of the zone's interconnectors ran at its full capacity, so that the zone's price could part from its neighbour's."),
  co2: t("Carbon dioxide from the zone's power plants (the model only: the record has no hourly figure)."),
  curtail: t("Wind and solar energy the weather offered but nobody could take (hours of surplus): the model turned it down."),
  unserved: t("Demand the system could not meet at any price (the 4 000 €/MWh cap)."),
  high: t("The share of the year's hours with a price of 150 €/MWh or more, model and actual."),
  mae: t("MAE, mean absolute error: over all hours, the average gap between the model's price and the actual price of the same hour."),
  rmse: t("RMSE, root mean square error, of the duration curves: both years' hourly prices sorted from the highest to the lowest and compared at 100 points — whether the model gets how often prices are high or low right, whatever the hour."),
};

export interface Observed { mae: number; durationRmse: number; share150: { model: number; observed: number } }

/** A signed figure, green when positive and red when negative, plain when it rounds to zero (a trade
 * balance, D-029). */
function tinted(x: number, digits: number): string {
  const t = signed(x, digits);
  return `<span class="${t[0] === "+" ? "pos" : t[0] === "−" ? "neg" : ""}">${t}</span>`;
}

/** The rows a folded card keeps (the owner asked, 2026-09-26). */
const FOLDED = new Set(["mean", "balTwh", "balEur"]);

/** A card per zone: the model's figures and, in a replay, the actual year's beside them (D-029;
 * a scenario shows the model alone, D-080), and a replay's metrics of §9. Folded,
 * the three cards show the average price and the trade balance; one button opens and folds them all. */
export function cardsHtml(set: YearResult[], actual: Actual | null, observed: Observed[] | null, open = false): string {
  const g = (f: (v: RunView, z: number) => number) => weighted(set, f);
  const model = {
    mean: g((v, z) => v.zones[z].mean), median: [0, 1, 2].map((z) => weightedMedian(set, z)),
    imp: g((v, z) => v.zones[z].importTwh), exp: g((v, z) => v.zones[z].exportTwh),
    impE: g((v, z) => v.zones[z].importMeur), expE: g((v, z) => v.zones[z].exportMeur),
    cong: g((v, z) => v.zones[z].congestedHours), co2: g((v, z) => v.zones[z].co2Mt),
    curt: g((v, z) => v.zones[z].curtailTwh), shed: g((v, z) => v.zones[z].unservedMwh),
  };
  const none = "–";
  const toggle = `<div class="cards-bar"><button type="button" class="seg" data-act="export" data-kind="csv" title="${t("Each run's hourly prices")}">${t("export CSV")}</button>
    <button type="button" class="seg" data-act="export" data-kind="json" title="${t("The scenario and its results with the code version, the data's hash and the inputs' lineage")}">${t("export JSON")}</button>
    <button type="button" class="seg" data-act="cards" aria-controls="cards-grid" aria-expanded="${open}">${open ? t("fewer figures") : t("all figures")}</button></div>`;
  return `${toggle}<div class="cards${actual ? " paired" : ""}${open ? "" : " folded"}" id="cards-grid">${[0, 1, 2].map((z) => {
    const a = actual?.zones[z];
    const q = (id: string) => (z === 0 ? tip(HELP[id]) : "");
    // the unit stands after each figure, as in the scenarios' table (the owner, 2026-10-07)
    const u = (v: string, unit: string) => (v === none || v === "" ? v : `${v} <span class="u">${esc(unit)}</span>`);
    const row = (id: string, k: string, unit: string, m: string, o: string, cls = "") =>
      `<tr class="${cls}${FOLDED.has(id) ? "" : " extra"}"><td>${q(id)}${k}</td><td class="n">${u(m, unit)}</td>${actual ? `<td class="n obs">${u(o, unit)}</td>` : ""}</tr>`;
    const o = observed?.[z];
    return `<div class="card">
    <h3>${flag(ZONES[z])}${ZONE_NAME[z]}</h3>
    <table>
      <thead><tr><th></th><th>${t("model")}</th>${actual ? `<th>${esc(actual.label)}</th>` : ""}</tr></thead>
      <tbody>
      ${row("mean", t("average price"), "€/MWh", fmt(model.mean[z]), a ? fmt(a.mean) : none, "big")}
      ${row("median", t("median price"), "€/MWh", fmt(model.median[z]), a ? fmt(a.median) : none)}
      ${row("impTwh", t("electricity import"), "TWh", fmt(model.imp[z], 2), a ? fmt(a.importTwh, 2) : none)}
      ${row("impEur", t("electricity import cost"), "M€", fmt(model.impE[z], 0), a ? fmt(a.importMeur, 0) : none)}
      ${row("expTwh", t("electricity export"), "TWh", fmt(model.exp[z], 2), a ? fmt(a.exportTwh, 2) : none)}
      ${row("expEur", t("electricity export revenue"), "M€", fmt(model.expE[z], 0), a ? fmt(a.exportMeur, 0) : none)}
      ${row("balTwh", t("electricity balance"), "TWh", tinted(model.exp[z] - model.imp[z], 2), a ? tinted(a.exportTwh - a.importTwh, 2) : none)}
      ${row("balEur", t("electricity trade balance"), "M€", tinted(model.expE[z] - model.impE[z], 0), a ? tinted(a.exportMeur - a.importMeur, 0) : none)}
      ${row("border", t("hours with a border at its limit"), "h", fmt(model.cong[z], 0), none)}
      ${row("co2", "CO₂", "Mt", fmt(model.co2[z], 2), none)}
      ${row("curtail", t("wind and solar curtailed"), "TWh", fmt(model.curt[z], 2), none)}
      ${row("unserved", t("unserved energy"), "MWh", fmt(model.shed[z], 0), none)}
      ${o ? row("high", t("hours at 150 €/MWh or more"), "%", fmt(100 * o.share150.model), fmt(100 * o.share150.observed))
        // the model's error against the actual year: under "model", the actual column empty
        + `<tr class="extra"><td>${q("mae")}${t("hourly error (MAE)")}</td><td class="n">${u(fmt(o.mae), "€/MWh")}</td><td class="n obs"></td></tr>`
        + `<tr class="extra"><td>${q("rmse")}${t("duration-curve RMSE")}</td><td class="n">${u(fmt(o.durationRmse), "€/MWh")}</td><td class="n obs"></td></tr>` : ""}
      </tbody>
    </table></div>`;
  }).join("")}</div>`;
}


/** The scenario view's four scenarios of 2035 side by side, each weighted over its weather years,
 * with its difference to 0 SMR (D-036, R-SMR-5); a title button shows a scenario. A scenario
 * still computing has its columns say so, and the differences wait for 0 SMR (D-127). */
export function trioHtml(trio: Partial<Record<string, YearResult[]>>, names: Record<string, string>, selected: string, about = ""): string {
  const ids = Object.keys(names);
  const fig = (id: string) => {
    const set = trio[id]!;
    const g = (f: (v: RunView, z: number) => number) => weighted(set, f);
    const co2 = g((v, z) => v.zones[z].co2Mt);
    const curt = g((v, z) => v.zones[z].curtailTwh);
    const f = (v: RunView) => v.zones[0].fossil!;
    return { price: g((v, z) => v.zones[z].mean), net: g((v, z) => v.zones[z].importTwh - v.zones[z].exportTwh)[0], co2: co2[0] + co2[1] + co2[2],
      curtail: curt[0] + curt[1] + curt[2],
      // Estonia's natural gas: the hours it ran, weighted over the years; none from a view stored before the field
      gasHours: set.every((r) => r.view.zones[0].gasHours !== undefined) ? g((v) => v.zones[0].gasHours)[0] : null,
      fossil: g((v) => (100 * (f(v).unit + f(v).neighbour)) / v.hours)[0], neighbour: g((v) => (100 * f(v).neighbour) / v.hours)[0] };
  };
  const done = ids.filter((id) => trio[id]);
  const x = Object.fromEntries(done.map((id) => [id, fig(id)]));
  const gas = x.gas ?? null;
  // the neighbours' fossil level and the weather years are the same in every scenario of a run
  const any = trio[done[0]]!;
  const level = any[0].view.fossilLevel ?? Number.NaN;
  // one table: a column pair per scenario (its figure, the difference to 0 SMR), the
  // scenario's button at the head of its pair (the owner, 2026-10-06: a table is more compact
  // than four cards that begin alike)
  // a difference is green when it moves the good way and red the other: for every row of this
  // table a fall is the good way — price, import, CO₂, curtailment, fossil hours (the owner, 2026-10-06)
  // the unit stands inside each cell, after the figure (the owner, 2026-10-06); where the table is
  // narrower than that needs, once in the row's label instead (theme.css, the release audit's F2)
  const cell = (id: string, v: number | null, base: number | null, unit: string, digits = 1) => {
    const d = id === "gas" || v === null || base === null ? null : v - base;
    const tone = d === null || Math.abs(d) < 0.5 * 10 ** -digits ? "" : d < 0 ? " good" : " bad";
    const u = `<span class="u">${esc(unit)}</span>`;
    // the difference a chip without the unit, which stands beside the figure (D-205, as the canvas)
    return `<td class="n${id === selected ? " sel" : ""}">${v === null ? "–" : `${fmt(v, digits)} ${u}`}</td><td class="n d${tone}${id === selected ? " sel" : ""}">${d === null ? "" : `<span class="dchip">${signed(d, digits)}</span>`}</td>`;
  };
  const computing = (id: string) => `<td class="n pending${id === selected ? " sel" : ""}" colspan="2">${t("computing…")}</td>`;
  // Estonia's rows in bold, its results the ones the study is about (the owner, 2026-11-02; D-199)
  const row = (label: string, unit: string, f: (g: ReturnType<typeof fig>) => number | null, digits = 1, ee = false) =>
    `<tr${ee ? ' class="ee"' : ""}><td>${label}<span class="ru">, ${esc(unit)}</span></td>${ids.map((id) => (x[id] ? cell(id, f(x[id]), gas && f(gas), unit, digits) : computing(id))).join("")}</tr>`;
  // the heading short, its explanation behind the "?" (the owner's design direction, 2026-10-20)
  return `<section class="card trio-card"><h2 class="rh">${t("Scenarios, 2035")} ${tip(t("The three scenarios of 2035, weighted over the weather years; beside each figure its difference to {gas}", { gas: esc(names.gas) }))}</h2>
    <table class="trio">
      <thead><tr><th></th>${ids.map((id) => `<th colspan="2" class="n${id === selected ? " sel" : ""}"><button type="button" class="seg" data-scenario="${id}" aria-pressed="${id === selected}">${esc(names[id])}</button></th>`).join("")}</tr></thead>
      <tbody>
        ${ZONES.map((c, z) => row(`${flag(c)}${t("{zone} average price", { zone: c })}`, "€/MWh", (g) => g.price[z], 1, z === 0)).join("")}
        ${row(t("EE net import"), "TWh", (g) => g.net, 2, true)}
        ${row("CO₂, EE+LV+LT", "Mt", (g) => g.co2, 2)}
        ${row(t("wind and solar curtailed"), "TWh", (g) => g.curtail, 2)}
        ${row(`${tip(t("The share of the hours in which Estonia's price was set by a gas or oil-shale plant of the Baltic states, or by a neighbour's price of {level} €/MWh or more: the cost of the most efficient gas plant of the market model behind the neighbours' prices, on that model's own gas blend and CO₂ price (for National Trends, National Trends+ and actual prices: a combined-cycle plant on TYNDP 2024's price matrix, the nearest documented). The neighbours' plants are not in the model; storage, water, wind, solar, biomass and the nuclear plant are not counted. Here {list} points of the figures are hours at a neighbour's price.", { level: fmt(level, 0), list: done.map((id) => `${names[id]} ${fmt(x[id].neighbour)}`).join(", ") }))}${t("hours with a fossil price in EE")}`, "%", (g) => g.fossil, 1, true)}
        ${row(t("hours natural gas ran in Estonia, a year"), "h", (g) => g.gasHours, 0, true)}
      </tbody>
    </table>
    <table class="by-year"><caption class="rh">${t("Estonia's price by weather year, €/MWh")} ${tip(`${t("Estonia's price by weather year, €/MWh: the runs behind each weighted figure")}${about ? `. ${about}` : ""}`)}</caption>
      <thead><tr><th></th>${any.map((r) => `<th class="n">${t("{year} weather year", { year: esc(r.label) })}</th>`).join("")}<th class="n w">${t("weighted")}</th></tr></thead>
      <tbody>${ids.map((id) => `<tr><td>${esc(names[id])}</td>${trio[id] ? `${trio[id]!.map((r) => `<td class="n">${fmt(r.view.zones[0].mean)} <span class="u">€/MWh</span></td>`).join("")}<td class="n w">${fmt(x[id].price[0])} <span class="u">€/MWh</span></td>` : `<td class="n pending" colspan="${any.length + 1}">${t("computing…")}</td>`}</tr>`).join("")}</tbody>
    </table></section>`;
}

/** A sensitivity's set; with the plant shown, `gas` is the same sensitivity of 0 SMR (R-SMR-5). */
export interface SensResult {
  id: string; label: string; set: YearResult[] | null; gas?: YearResult[] | null; error?: string; gasError?: string;
  // each of the three scenarios' set at the pair, as far as they are in (the owner asked, 2026-10-27; D-184)
  by?: Partial<Record<string, YearResult[] | null>>;
  // the gas plants' one bid at the pair (the owner asked, 2026-10-27; D-187)
  bid?: number;
}

/** The gas plants' one bid at a state's prices, €/MWh, an offset moved by hand kept (R-SUP-6, D-164). */
export const sensBid = (p: Presets, st: State): number =>
  gasBidParts(p, { fuelPath: st.fuel, target: st.target, gasFloor: null, gasPrice: st.fuelGas, euaPrice: st.fuelEua }, st.bids.gas ?? 0).total;

/** What the table's money rows need: Estonia's demand, TWh a year, and the contract's strike and clause. */
export interface SensMoney { demandTwh: number; strike: number; clause: boolean }

/** The standard sensitivities as one table, the owner's design (2026-10-28; D-195): a column per price pair of LNG and
 * CO₂ (state/model.ts `FUEL_CASES`, in the order of the ids) under the gas plants' bid at it; then Estonia's average
 * price without the plant and with one or two units, each named by its output and with the share of the year in
 * which a Baltic gas plant set Estonia's price; for the units, the gain from the lower price against 0 SMR at the same
 * pair on Estonia's demand, the contract for difference at the strike and the two together (D-188). `names`: the
 * three scenarios, 0 SMR first. */
export function sensHtml(trio: Partial<Record<string, YearResult[]>> | null, sens: SensResult[], names: Record<string, string>, money?: SensMoney): string {
  if (!sens.length) return "";
  const [base, ...units] = Object.keys(names);
  const ee = (set: YearResult[]) => weighted(set, (v, z) => v.zones[z].mean)[0];
  // a view stored before D-195 has no gas plants' hours: "–"
  const share = (set: YearResult[]) => weighted(set, (v, z) => (100 * (v.zones[z].fossil?.gas ?? Number.NaN)) / v.hours)[0];
  const twh = (set: YearResult[]) => weighted(set, (v) => (v.plant ? v.plant.mw.reduce((a, x) => a + x, 0) / 1e6 : 0))[0];
  const u = (unit: string) => ` <span class="u">${esc(unit)}</span>`;
  // a pair's figure once the sets it needs are in: "computing…" until then, a dash and the error once one failed
  const cell = (x: SensResult, sets: (YearResult[] | null | undefined)[], f: (s: YearResult[][]) => number, show: (n: number) => string, toned = false) => {
    if (!sets.every(Boolean)) {
      const err = x.error ?? x.gasError;
      return err ? `<td class="n error">– ${tip(err)}</td>` : `<td class="n pending">${t("computing…")}</td>`;
    }
    const n = f(sets as YearResult[][]);
    return `<td class="n${toned ? (n > 0.5 ? " good" : n < -0.5 ? " bad" : "") : ""}">${show(n)}</td>`;
  };
  const row = (cls: string, label: string, td: (x: SensResult) => string) => `<tr${cls ? ` class="${cls}"` : ""}><th scope="row">${label}</th>${sens.map(td).join("")}</tr>`;
  const head = (label: string, th: (x: SensResult, gas: number, eua: number) => string) =>
    `<tr><th scope="row">${label}</th>${sens.map((x) => { const [gas, eua] = FUEL_CASES[Number(x.id) - 1] ?? [Number.NaN, Number.NaN]; return `<th class="n">${th(x, gas, eua)}</th>`; }).join("")}</tr>`;
  const price = (id: string) => (x: SensResult) => cell(x, [x.by?.[id]], ([s]) => ee(s), (n) => `${fmt(n, 1)}${u("€/MWh")}`);
  const gasRow = (id: string) => row("share", t("Baltic gas plants set the price"), (x) => cell(x, [x.by?.[id]], ([s]) => share(s), (n) => `${fmt(n, 1)}${u(t("% of the year"))}`));
  const eur = (n: number, sign: boolean) => `${sign ? signed(n, 0) : fmt(n, 0)}${u(t("M€"))}`;
  const group = (id: string) => {
    // the units named by their output, the same at every pair but for the hours the clause turns them down
    const any = trio?.[id] ?? sens.map((x) => x.by?.[id]).find((set) => set);
    const name = any ? t("With {x} TWh of nuclear", { x: fmt(twh(any), 1) }) : esc(names[id]);
    // the money rows: 0 SMR's set and the unit's at the same pair, with Estonia's demand, the strike and the clause
    const eurRow = (cls: string, label: string, f: (b: YearResult[], s: YearResult[], m: SensMoney) => number, sign: boolean) =>
      row(cls, label, (x) => (money ? cell(x, [x.by?.[base], x.by?.[id]], ([b, s]) => f(b, s, money), (n) => eur(n, sign), cls === "net") : `<td class="n pending">${t("computing…")}</td>`));
    const gain = (b: YearResult[], s: YearResult[], m: SensMoney) => (ee(b) - ee(s)) * m.demandTwh;
    const cfd = (_b: YearResult[], s: YearResult[], m: SensMoney) => -statePaysOf(s, m.strike, m.clause);
    return `<tbody>${row("lead", name, price(id))}${gasRow(id)}
      ${eurRow("", t("Gain from the lower electricity price"), gain, false)}
      ${eurRow("", money ? t("Contract for difference at {k} €/MWh", { k: fmt(money.strike, 0) }) : t("Contract for difference"), cfd, true)}
      ${eurRow("net", t("Consumers' net gain"), (b, s, m) => gain(b, s, m) + cfd(b, s, m), true)}</tbody>`;
  };
  const about = t("The scenario at the owner's four price pairs of LNG and CO₂, everything else the headline's — the neighbours' prices too, their profile as published times its level. LNG per MWh of the gas's net calorific value; the gas plants' bid is the one bid of the Baltic gas plants at the pair. Without nuclear: {gas}; with nuclear: one and two units, named by their output in a year. Baltic gas plants set the price: the share of the year's hours in which a gas plant of Estonia, Latvia or Lithuania set Estonia's price. The gain from the lower price: the fall of Estonia's average price against {gas} at the same pair, times Estonia's demand{d} — what its consumers pay less at the exchange. The contract for difference: what the state receives (+) or pays (−) settled hourly at the strike{clause}. The net gain is the two together, M€ a year.",
    { gas: esc(names[base]), d: money ? t(" of {d} TWh", { d: fmt(money.demandTwh, 1) }) : "", clause: money?.clause ? t(", with the negative-price clause") : "" });
  return `<h2 class="rh">${t("Standard sensitivities")} ${tip(about)}</h2>
    <div class="sens-tab"><table>
      <thead>${head("LNG", (_x, gas) => `${fmt(gas, 0)}${u("€/MWh")}`)}${head("CO₂", (_x, _g, eua) => `${fmt(eua, 0)}${u("€/t")}`)}${head(t("Gas plants' bid"), (x) => (x.bid === undefined ? "–" : `${fmt(x.bid, 0)}${u("€/MWh")}`))}</thead>
      <tbody>${row("lead", t("Electricity price without nuclear"), price(base))}${gasRow(base)}</tbody>
      ${units.map(group).join("")}
    </table></div>`;
}

const BORDER_CODES = ["EE-FI", "EE-LV", "LV-LT", "LT-SE4", "LT-PL"];
/** A border's direction with its two flags: EE → FI. */
const way = (code: string, fwd: boolean) => { const [a, b] = code.split("-"); const [f, t] = fwd ? [a, b] : [b, a]; return `${flag(f)}${f} → ${flag(t)}${t}`; };
/** A border's code between its flags: EE–FI. */
const pair = (code: string) => { const [a, b] = code.split("-"); return `${flag(a)}${a}–${b}<span class="fl fl-${b} end" aria-hidden="true"></span>`; };

/** R-APP-3: a border of the year shown, per direction — the capacity in use, the hours at its
 * limit, what was sent — with the net flow, the congestion rent (R-BND-7), the day-by-day chart
 * and, in a replay, the outages behind the observed capacity (R-LINK-6). */
function borderHtml(r: YearResult, code: string, att: Attribution | null, note: string): string {
  const b = r.view.borders.find((x) => x.border === code);
  if (!b) return "";
  const tabs = `<div class="tabs" role="group" aria-label="${t("Border shown")}">${BORDER_CODES.map((c) =>
    `<button type="button" class="seg" data-border="${c}" aria-pressed="${c === code}">${pair(c)}</button>`).join("")}</div>`;
  // each figure with its unit in its cell (the owner asked on the canvas, D-197)
  const row = (fwd: boolean) => `<tr><td>${way(code, fwd)}</td><td class="n">${fmt(fwd ? b.capFwd : b.capRev, 0)} <span class="u">MW</span></td><td class="n">${fmt(100 * (fwd ? b.congestedFwd : b.congestedRev))} <span class="u">%</span></td><td class="n">${fmt(fwd ? b.fwdTwh : b.revTwh, 2)} <span class="u">TWh</span></td></tr>`;
  const ev = att ? labels(att, code) : null;
  const events = !ev ? ""
    : ev.items.length ? `<h3 class="sub">${t("Outages of a day or longer in {year} (ENTSO-E A78, Nord Pool UMM)", { year: esc(r.label) })}</h3><ul class="events">${ev.items.map((l) =>
      `<li><span class="num">${esc(l.start.slice(0, 10))} → ${esc(l.end.slice(0, 10))}</span> ${esc(l.what)}: ${esc(l.ways.join(", "))}${l.reason ? ` — ${esc(l.reason)}` : ""}</li>`).join("")}</ul>${ev.more ? `<p class="note">${t("and {n} shorter ones of a day or more", { n: ev.more })}</p>` : ""}`
      : `<p class="note">${t("No outage of a day or longer is reported on {code} in {year}.", { code, year: esc(r.label) })}</p>`;
  return `<section class="borders"><h2 class="rh">${t("Borders: capacity in use, congestion and flow, {year}", { year: esc(r.label) })}</h2>${tabs}
    ${note ? `<p class="note changed">${t("What-if on {code}:", { code })} ${esc(note)}</p>` : ""}
    <div class="card"><table><thead><tr><th>${t("direction")}</th><th>${t("capacity in use, average MW")}</th><th>${t("hours at the limit, %")}</th><th>${t("sent, TWh")}</th></tr></thead>
    <tbody>${row(true)}${row(false)}</tbody></table>
    <p class="note num">${t("net flow")} ${fmt(b.flowTwh, 2)} TWh (+ = ${way(code, true)}) · ${t("congestion rent")} ${fmt(b.rentMeur, 1)} M€</p></div>
    <div class="chart wide"><h3>${pair(code)}: ${t("capacity in use each way and the net flow, daily average MW")}</h3><div class="plot"><canvas id="ch-border" role="img" aria-label="${code}: ${t("capacity in use each way and the net flow")}"></canvas>
      <span class="dir up">▲ ${way(code, true)}</span><span class="dir down">▼ ${way(code, false)}</span></div></div>
    ${events}</section>`;
}

export function chartsHtml(set: YearResult[], year: string, zone: number, border = "EE-FI", att: Attribution | null = null, note = "", pies = false, imp: "line" | "fill" = "fill", monthly: "mean" | "median" = "mean"): string {
  const tabs = set.length > 1 ? `<div class="tabs" role="group" aria-label="${t("Year shown in the charts")}">${set.map((r) =>
    `<button type="button" class="seg" data-year="${esc(r.key)}" aria-pressed="${r.key === year}">${r.weight < 1 ? t("{year} weather year", { year: esc(r.label) }) : esc(r.label)}</button>`).join("")}</div>` : "";
  const zones = `<div class="tabs" role="group" aria-label="${t("Zone shown in the charts")}">${["EE", "LV", "LT"].map((c, z) =>
    `<button type="button" class="seg" data-zone="${z}" aria-pressed="${z === zone}">${flag(c)}${c}</button>`).join("")}</div>`;
  const chart = (id: string, title: string, wide = false, extra = "") => `<div class="chart${wide ? " wide" : ""}"><h3>${title}</h3>${extra}<div class="plot"><canvas id="${id}" role="img" aria-label="${title}"></canvas></div></div>`;
  // a switch as the lines' (R-LINK-4): on, the net import is hatched over the generation; off, a dashed line
  const impTabs = `<div class="chart-switch"><button type="button" class="swb" role="switch" aria-checked="${imp === "fill"}" data-imp="${imp === "fill" ? "line" : "fill"}"><span class="sw ${imp === "fill" ? "on" : "off"}" aria-hidden="true"></span><span class="lname">${t("net import as a fill")}</span></button></div>`;
  // a scenario's monthly chart shows the average or the median, a switch as the header's language between them on
  // the title's line (D-202)
  const med = monthly === "median", mt = t("Monthly average and median price");
  const monthChart = `<div class="chart"><div class="chart-head"><h3>${mt}</h3><button type="button" class="tgl mini" role="switch" aria-checked="${med}" aria-label="${t("median")}" data-monthly="${med ? "mean" : "median"}">`
    + `<span class="${med ? "" : "on"}">${t("average")}</span><span class="${med ? "on" : ""}">${t("median")}</span></button></div><div class="plot"><canvas id="ch-mean" role="img" aria-label="${mt}"></canvas></div></div>`;
  // a scenario's mix: a bar per zone the results' width, its generation and CO₂ after it (D-197; doughnuts until then, D-097)
  const mix = pies ? `<div class="chart wide"><h3>${t("Energy mix, TWh, and CO₂")}</h3><div class="plot mixh"><canvas id="ch-mix" role="img" aria-label="${t("Energy mix, TWh, and CO₂")}"></canvas></div></div>`
    : chart("ch-mix", t("Energy mix, TWh"));
  return `${tabs}${zones}<div class="charts">
    ${chart("ch-stack", t("Generation by week against consumption"), true, impTabs)}
    ${mix}${chart("ch-curve", t("Price duration curve"))}
    ${pies ? monthChart : chart("ch-mean", t("Monthly average price")) + chart("ch-median", t("Monthly median price"))}</div>
    ${borderHtml(set.find((r) => r.key === year) ?? set[0], border, att, note)}`;
}
