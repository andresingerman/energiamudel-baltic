// The Weather page (R-APP-13, D-084): why the scenario runs of the TYNDP 2024 family stand on the
// climate years 1995, 2008 and 2009, where those years sit among the 38 of PECD for each Baltic
// zone, what each climate-year file holds and what the engine reads from it. Everything drawn
// comes from presets.json `climate_years` (export/tables.py climate_years); the method is told
// in ENTSO-E's words with the page cited, the figures carry their lineage ids. Static: the page
// does not depend on the scenario shown.

import { t } from "./i18n.ts";
import type { Presets } from "../contract/presets.ts";
import type { Sources } from "./labels.ts";
import { describe, esc, fmt } from "./labels.ts";
import { flag, tip } from "./panel.ts";

interface Series { values: (number | null)[]; ranks?: (number | null)[]; unit: string; src: string[]; note?: string } // ranks: from the unrounded values (the export's)
interface Value { value: number; unit: string; src: string[] }
interface Temperature { mean_c: number; min_c: number; max_c: number; src: string[] }
export interface ClimateYears {
  pecd: { edition: string; target_year: number; first_year: number; last_year: number; src: string[] };
  years: number[];
  selected: Record<string, Value>;
  selection: Record<string, Value>;
  most_representative: Value;
  dunkelflaute_rank_2030: Record<string, Value>;
  zones: Record<string, Record<string, Series>>;
  temperature: Record<string, Record<string, Temperature>>;
}

const ZONES = ["EE", "LV", "LT"] as const;
const ZONE_NAME: Record<string, string> = { EE: t("Estonia"), LV: t("Latvia"), LT: t("Lithuania") };
const SELECTED = ["1995", "2008", "2009"];
/** The series drawn per zone, in order: label, unit shown, decimals. */
const FIGURES: [key: string, label: string, digits: number][] = [
  ["wind_onshore_cf", t("Onshore wind capacity factor"), 3], ["wind_offshore_cf", t("Offshore wind capacity factor"), 3],
  ["solar_cf", t("Solar capacity factor"), 3], ["demand_peak_mw", t("Demand peak, MW, at 2009's annual energy (National Trends profile)"), 0],
  ["hydro_inflow_twh.daugava", t("Daugava inflow, TWh (TYNDP 2024 as published)"), 2],
  ["hydro_inflow_twh.ror", t("Run-of-river inflow, TWh (TYNDP 2024)"), 2],
];

/** The rank of a year's value among the years that have one, 1 = the lowest. */
export function rankOf(values: (number | null)[], i: number): number | null {
  const v = values[i];
  if (v === null) return null;
  return values.filter((x) => x !== null && x < v).length + 1;
}

const W = 1000;
const n1 = (x: number) => x.toFixed(1);

/** One bar per climate year; the three selected years in the accent, each with its value and its
 * rank over the bar; the others muted. The axis starts at 0 so that bars compare by length. */
/** The picked years' figures and ranks in a line above their chart (D-197; on their bars until then), each with its colour. */
export function picks(years: number[], s: Series, digits: number): string {
  const have = s.values.filter((v) => v !== null).length;
  return `<ul class="wx-picks">${SELECTED.map((y) => {
    const i = years.indexOf(Number(y)), v = i < 0 ? null : s.values[i];
    return v === null || v === undefined ? "" : `<li><i class="y${y}" aria-hidden="true"></i><b>${y}</b> ${fmt(v, digits)} <span class="rank">${t("rank {r} of {n}", { r: s.ranks?.[i] ?? rankOf(s.values, i) ?? "", n: have })}</span></li>`;
  }).join("")}</ul>`;
}

export function bars(years: number[], s: Series, digits: number): string {
  const L = 44, R = 8, top = 10, h = 110, w = W - L - R, n = years.length, bw = w / n;
  const vals = s.values.map((v) => v ?? 0);
  const hi = Math.max(...vals) || 1;
  const y = (v: number) => top + h - (v / hi) * h;
  const have = s.values.filter((v) => v !== null).length;
  let out = "";
  years.forEach((yr, i) => {
    const v = s.values[i];
    const x = L + i * bw;
    if (v === null) { out += `<text class="tick" x="${n1(x + bw / 2)}" y="${top + h - 2}" text-anchor="middle">·</text>`; return; }
    const sel = SELECTED.includes(String(yr));
    out += `<rect class="bar${sel ? ` sel y${yr}` : ""}" x="${n1(x + 1.5)}" y="${n1(y(v))}" width="${n1(bw - 3)}" height="${n1(top + h - y(v))}"><title>${yr}: ${fmt(v, digits)} ${esc(s.unit)}, ${t("rank {r} of {n}", { r: s.ranks?.[i] ?? rankOf(s.values, i) ?? "", n: have })}</title></rect>`;
    const near = SELECTED.some((k) => Math.abs(Number(k) - yr) === 1);
    // two picked years side by side (2008, 2009) take their names apart: the first's ends at its bar, the second's starts there
    const anchor = sel && SELECTED.includes(String(yr + 1)) ? "end" : sel && SELECTED.includes(String(yr - 1)) ? "start" : "middle";
    const tx = anchor === "end" ? x + bw - 1 : anchor === "start" ? x + 1 : x + bw / 2;
    if (sel || (yr % 5 === 0 && !near)) out += `<text class="tick${sel ? " strong" : ""}" x="${n1(tx)}" y="${top + h + 13}" text-anchor="${anchor}">${yr}</text>`;
  });
  const grid = [0.25, 0.5, 0.75, 1].map((f) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${n1(y(f * hi))}" y2="${n1(y(f * hi))}"/><text class="tick" x="${L - 5}" y="${n1(y(f * hi) + 4)}" text-anchor="end">${fmt(f * hi, digits)}</text>`).join("");
  return `<svg class="ip-fig wx-fig" viewBox="0 0 ${W} ${top + h + 18}" role="img" aria-label="${t("{unit} by climate year", { unit: esc(s.unit) })}">${grid}${out}</svg>`;
}

/** The sources behind a figure: each lineage id as its document and page (or its dataset), a
 * link to the publisher where there is one and to the row in the Sources view (R-APP-9). */
function srcOf(sources: Sources): (ids: string[]) => string {
  return (ids) => ids.length ? ` <span class="wx-src">${ids.map((i) => {
    const d = describe(sources, i);
    return `${d.url ? `<a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.text)}</a>` : esc(d.text)} <a href="#" data-goto="${esc(i)}" title="${t("in Sources")}">↗</a>`;
  }).join("; ")}</span>` : "";
}

export function weatherHtml(p: Presets, sources: Sources = { documents: {}, families: {}, records: {} }): string {
  const src = srcOf(sources);
  const c = (p as unknown as { climate_years?: ClimateYears }).climate_years;
  if (!c) return `<section class="ip wx"><p class="error">${t("The export holds no climate-year table (presets.json `climate_years`): rebuild it with `make export`.")}</p></section>`;
  const years = c.years, n = years.length;
  const at = (yr: string) => years.indexOf(Number(yr));
  const weight = (yr: string) => c.selected[yr].value;
  const v = (z: string, k: string, yr: string) => c.zones[z][k]?.values[at(yr)] ?? null;
  const rank = (z: string, k: string, yr: string) => c.zones[z][k].ranks?.[at(yr)] ?? rankOf(c.zones[z][k].values, at(yr));
  // the rank is out of the years that have a figure: hydro inflow has 36, the rest 38 (E-077)
  const have = (z: string, k: string) => c.zones[z][k].values.filter((x) => x !== null).length;
  const cell = (z: string, k: string, yr: string, digits: number) => { const x = v(z, k, yr); return x === null ? "–" : `${fmt(x, digits)} <span class="wx-rank">(${rank(z, k, yr)}/${have(z, k)})</span>`; };
  const temp = (z: string, yr: string) => c.temperature[z]?.[yr];
  const sel = c.selection;
  return `<section class="ip wx">
  <h2>${t("Weather: the three climate years behind a scenario of 2035")}</h2>
  <details class="about"><summary>${t("About this page")}</summary><p class="note">${t("A scenario run of the TYNDP 2024 family is three runs, one on each of the climate years {years}, and the figure shown is their weighted average. The years, the weights and the neighbours' prices for them are ENTSO-E's; this page says where they come from and what they mean for the Baltic states.", { years: SELECTED.map((y) => `<b>${y}</b> (${t("weight")} ${fmt(weight(y), 3)})`).join(", ") })}</p></details>

  <details class="about"><summary>${t("Why these three")}</summary>
  <p class="note">${t("ENTSO-E's market model of TYNDP 2024 — whose hourly prices for Finland, SE4 and Poland the scenario runs take — ran its Distributed Energy and Global Ambition scenarios on these three climate years and no other, so a run can be weather-coherent across the border only on one of them. ENTSO-E selected them once, for TYNDP 2022, and kept them:")} "Three climate years have been selected based on their representativeness out of ${fmt(sel.candidate_years_ig2024.value, 0)} climate years within the Pan-European Climate Database (PECD). The results from market simulations are then considered based on the weighted average from these three climate years. The weighting is as follows: 0.233 for 1995, 0.367 for 2008 and 0.4 for 2009" (TYNDP 2024 Implementation Guidelines, p. 12).${src(c.selected["1995"].src)}</p>
  <p class="note">${t("The method is that of the TYNDP 2022 System Needs Study guidelines (§6.2–6.3), as the bidding-zone review prescribes: for every bidding zone and hour the <em>residual load</em> — demand less solar, wind and hydro infeed — summed into nine regions (the Baltic states are one); for every combination of three years out of {n} ({from}–{to}; {combinations} combinations) the average and the standard deviation of the combined distribution against those of all thirty, per region, standardised and weighted by the region's load; the {share} % of combinations nearest the whole in that 18-dimensional distance kept, and among them the one with the best K-Medoids clustering score — the three years as medoids, every year assigned to the nearest — chosen,", { n: fmt(sel.candidate_years.value, 0), from: c.pecd.first_year + 5, to: c.pecd.first_year + 34, combinations: fmt(sel.combinations.value, 0), share: fmt(sel.preferred_share_pct.value, 0) })} "to be not too close to the centre ('mild') or too close to the edges ('extreme')". ${t("The weights are read as the share of the thirty years each medoid's cluster holds: 7, 11 and 12 of 30. {year} is \"the most representative climate year\", the one a project assessment must use at the least, and the one the scenarios' expansion modelling ran on.", { year: String(c.most_representative.value) })}${src([...sel.candidate_years.src, ...sel.combinations.src, ...c.most_representative.src])}</p>
  <p class="note">${t("Stress was not the criterion, but the guidelines rank it: by the most stressful two-week <em>Dunkelflaute</em> at European level (highest residual demand in December–February) 2012 ranks {r2012} of thirty, 2009 ranks {r2009}, 1995 ranks {r1995} and 2008 ranks {r2008} (TYNDP 2022 Scenario Building Guidelines, Table 20, horizon 2030). The set holds a stressful year, a middling one and a mild one, and the weights tell the model how often each kind of year comes.", { r2012: fmt(c.dunkelflaute_rank_2030["2012"].value, 0), r2009: fmt(c.dunkelflaute_rank_2030["2009"].value, 0), r1995: fmt(c.dunkelflaute_rank_2030["1995"].value, 0), r2008: fmt(c.dunkelflaute_rank_2030["2008"].value, 0) })}${src(c.dunkelflaute_rank_2030["2009"].src)}</p>
  </details>

  <h3>${t("The three years in the Baltic states")} ${tip(`${t("The selection was made for Europe's residual load. For the Baltic zones each figure below carries its rank among PECD's {n} years ({first}–{last}, edition {edition}, capacity factors at the {layout} layout), 1 = the lowest: onshore wind puts them at the edges — 2009 among the calmest years, 1995 and 2008 among the windiest — and offshore wind mostly with it; all three years sit in the lower half for the demand peak, and 2008 is among the dullest for solar in Estonia and Latvia. The demand profiles' annual energy moves a little with the year (Estonia's from 9.6 to 10.2 TWh), but a run scales every year to the scenario's energy, so the peaks below are at one energy, 2009's: what a year brings is the shape and the peak, through the temperature the profile was built on.", { n, first: c.pecd.first_year, last: c.pecd.last_year, edition: esc(c.pecd.edition), layout: c.pecd.target_year })}`)}</h3>
  <table class="wx-table">
    <thead><tr><th></th>${SELECTED.map((y) => `<th class="n">${t("{year} weather year", { year: y })}</th>`).join("")}</tr></thead>
    <tbody>
      <tr><td>${t("weight")}</td>${SELECTED.map((y) => `<td class="n">${fmt(weight(y), 3)}</td>`).join("")}</tr>
      ${ZONES.map((z) => [
        `<tr class="wx-zone"><td colspan="4">${flag(z)}${ZONE_NAME[z]}</td></tr>`,
        `<tr><td>${t("onshore wind capacity factor")}</td>${SELECTED.map((y) => `<td class="n">${cell(z, "wind_onshore_cf", y, 3)}</td>`).join("")}</tr>`,
        `<tr><td>${t("offshore wind capacity factor")}</td>${SELECTED.map((y) => `<td class="n">${cell(z, "wind_offshore_cf", y, 3)}</td>`).join("")}</tr>`,
        `<tr><td>${t("solar capacity factor")}</td>${SELECTED.map((y) => `<td class="n">${cell(z, "solar_cf", y, 3)}</td>`).join("")}</tr>`,
        `<tr><td>${t("demand peak, MW, at 2009's annual energy ({twh} TWh at {layout})", { twh: fmt(v(z, "demand_twh", "2009") ?? 0, 1), layout: c.pecd.target_year })}</td>${SELECTED.map((y) => `<td class="n">${cell(z, "demand_peak_mw", y, 0)}</td>`).join("")}</tr>`,
        c.zones[z]["hydro_inflow_twh.daugava"] ? `<tr><td>${t("Daugava inflow, TWh (as published; the engine takes 1.95 ×)")}</td>${SELECTED.map((y) => `<td class="n">${cell(z, "hydro_inflow_twh.daugava", y, 2)}</td>`).join("")}</tr>` : "",
        c.zones[z]["hydro_inflow_twh.ror"] ? `<tr><td>${t("run-of-river inflow, TWh")}</td>${SELECTED.map((y) => `<td class="n">${cell(z, "hydro_inflow_twh.ror", y, 2)}</td>`).join("")}</tr>` : "",
        `<tr><td>${t("temperature, ERA5: average / coldest hour, °C")}</td>${SELECTED.map((y) => { const x = temp(z, y); return `<td class="n">${x ? `${fmt(x.mean_c, 1)} / ${fmt(x.min_c, 1)}` : "–"}</td>`; }).join("")}</tr>`,
      ].join("")).join("")}
      <tr class="wx-zone"><td colspan="4">${t("Europe")}</td></tr>
      <tr><td>${t("Dunkelflaute rank of thirty (1 = the most stressful two weeks)")}</td>${SELECTED.map((y) => `<td class="n">${fmt(c.dunkelflaute_rank_2030[y].value, 0)}</td>`).join("")}</tr>
    </tbody>
  </table>
  <p class="note">${t("Estonia's reading: 1995 and 2008 are the two windiest years of the {n} but one, 2009 the calmest of all; 2008 is the second-dullest solar year; the three are a windy, a windy-and-dull and a calm year, and the calm one carries the heaviest weight. Its Estonian price is the highest of the three in every scenario, and the weighted figure, not any year's, is the result (O-6).", { n })}</p>

  ${ZONES.map((z) => `<h3>${flag(z)}${t("{zone}: the {n} climate years", { zone: ZONE_NAME[z], n })}</h3>
    ${FIGURES.filter(([k]) => c.zones[z][k]).map(([k, label, digits]) => `<figure class="ip-year"><figcaption>${esc(label)}${c.zones[z][k].note ? ` — ${esc(t(c.zones[z][k].note!).replace(/the factor of D-\d{3}/, "its calibration factor"))}` : ""}${src(c.zones[z][k].src)}</figcaption>${picks(years, c.zones[z][k], digits)}${bars(years, c.zones[z][k], digits)}</figure>`).join("")}`).join("")}

  <h3>${t("What a climate-year file holds, and what the engine reads")}</h3>
  <table class="wx-table">
    <thead><tr><th>${t("Series")}</th><th>${t("Source; climate years it exists for")}</th><th>${t("What the engine does with it")}</th></tr></thead>
    <tbody>
      <tr><td>${t("onshore wind, offshore wind, solar capacity factors (layouts 2030 and 2040)")}</td><td>PECD ${esc(c.pecd.edition)}; ${t("{n} years", { n })}</td><td>${t("capacity × factor, hour by hour; the fleet of 2035 reads the 2030 layout; Lithuania's onshore wind at 0.80 of the factor by default")}</td></tr>
      <tr><td>${t("demand profile (National Trends, 2030 and 2040)")}</td><td>TYNDP 2024 Demand Profiles; ${t("{n} years", { n })}</td><td>${t("the shape of the year; the scenario's annual energy scales it")}</td></tr>
      <tr><td>${t("Daugava inflow, Lithuanian run-of-river inflow, weekly")}</td><td>${t("TYNDP 2024 Hydro Inflows; 36 years (1982–2017)")}</td><td>${t("the Daugava's weekly water, 1.95 × the published, released inside the record's band; run-of-river as given output")}</td></tr>
      <tr><td>${t("temperature")}</td><td>${t("ERA5 through Open-Meteo, the calendar year itself")}</td><td>${t("the heat-driven floors of the CHP plants")}</td></tr>
      <tr><td>${t("the neighbours' prices (DE and GA, 2035–2050)")}</td><td>${t("TYNDP 2024 market-model outputs; <b>these three years only</b>")}</td><td>${t("the boundary prices")}</td></tr>
      <tr><td>${t("the actual prices of 2025 at the cables")}</td><td>${t("ENTSO-E A44 with JAO's hub and allocation corrections")}</td><td>${t("a what-if on the neighbours, not weather-coherent with the climate year")}</td></tr>
      <tr><td>${t("weight; ranks")}</td><td>${t("TYNDP 2024 Implementation Guidelines; this page's figures")}</td><td>${t("the weighted set; the labels of the year chips")}</td></tr>
    </tbody>
  </table>
  <p class="note">${t("The TYNDP 2026 family (National Trends+) does not pick historical years: PECD 4.2 projects the climate of 2025–2054 with three climate models, and ENTSO-E reduces the thirty candidate weather scenarios of each target year to three by a related method — anomalies of six technologies per region, a principal component, k-means with k = 3, the scenario nearest each cluster's average as its representative and the cluster's share as its weight (TYNDP 2026 Scenarios Methodology Report, Tables 34 and 36). The research note <code>docs/research/2026-10-06_climate_years.md</code> has the documents and pages.")}</p>
</section>`;
}
