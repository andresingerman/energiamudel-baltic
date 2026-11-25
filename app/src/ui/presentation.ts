// What the Presentation page of 2026-10-21 to 2026-11-12 left (the owner took the page out, D-249): the context the
// deck and the Model view's capital cost take besides the runs (`PresContext`), the capital cost of the energy mix
// (D-157 … D-160, the Model view's table) and the helpers the deck reads the runs with.
import type { Presets } from "../contract/presets.ts";
import type { State } from "../state/model.ts";
import type { RunView } from "../worker/view.ts";
import { group } from "../worker/view.ts";
import { t } from "./i18n.ts";
import { icon } from "./icons.ts";
import { GROUP_LABEL, esc, fmt } from "./labels.ts";
import { flag, tip } from "./panel.ts";
import type { YearResult } from "./results.ts";

const ZONES = ["EE", "LV", "LT"] as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** A figure's unit, after it in every cell (the owner asked, 2026-10-22). */
const unit = (u: string) => ` <span class="u">${esc(u)}</span>`;

/** A fleet row's line among the inputs: wind on land and at sea apart, the rest by generation group. */
export const lineOf = (cls: string) => (cls === "wind_offshore" ? "wind_offshore" : cls.startsWith("wind") ? "wind_onshore" : group(cls));

/** Zone z's installed MW by line, as the set's runs had it (the same in each of its years); the
 * plant's units, which the fleet does not list, in Estonia's. */
export function mwOf(set: YearResult[], z: number, plantMw: number): Record<string, number> {
  const out: Record<string, number> = z === 0 && plantMw > 0 ? { nuclear: plantMw } : {};
  for (const r of set[0].view.zones[z].fleet) if (r.installedMw) out[lineOf(r.cls)] = (out[lineOf(r.cls)] ?? 0) + r.installedMw;
  return out;
}

/** Σ weight × f over the set; null when a year has no figure (a view stored before the field). */
export function weightedOf(set: YearResult[], f: (v: RunView) => number | undefined): number | null {
  const xs = set.map((r) => f(r.view));
  if (xs.some((x) => x === undefined || !Number.isFinite(x))) return null;
  return set.reduce((a, r, i) => a + r.weight * xs[i]!, 0) / set.reduce((a, r) => a + r.weight, 0);
}

/** One source's cost in 2025 EUR, M€ (D-157, D-158): per MW and, a battery's, per MWh of the build of
 * 2030 and of each rebuild from 2050 on, and its lifetime: that of one built in 2030, every build's. */
export interface Cost { mw: number; mwh: number; life: number; mw50: number; mwh50: number }
/** The capital cost's figures: each class's cost (the battery's as `battery`), the plant's per MW, the
 * years the table keeps the fleet for — the plant's design life — and the sources named. */
export interface Capex { cost: Record<string, Cost>; plantMw: number; years: number; sources: string }

/** The Danish Energy Agency's row of each class the capital cost prices (D-157); a class not here has none. */
const CAPEX_ROW: Record<string, string> = {
  wind_onshore: "dea_2025|wind_onshore_dea", wind_offshore: "dea_2025|wind_offshore_dea", solar: "dea_2025|solar_pv_utility_dea",
  gas_ocgt: "dea_2025|gas_ocgt_dea", gas_ccgt: "dea_2025|gas_ccgt_chp_extraction", gas_chp: "dea_2025|gas_ccgt_chp_extraction",
  biomass_chp: "dea_2025|wood_chips_chp_large",
};
const BATTERY = "dea_storage_2025|battery_li_ion_dea";

/** The year the capital cost's builds stand for (the catalogues' estimates for 2030) and the year its
 * present values are of, the plant's first (D-158, D-166). */
const BUILT = 2030, PV_YEAR = 2035;

/** A source kept `years` from its build of 2030: rebuilt at 2050's cost as its lifetime ends — every
 * rebuild comes in 2050 or later — each build lasting the lifetime of one built in 2030 (the owner held a
 * battery's at 20 years), the last rebuild's share the years left of it (D-158); `hours` a battery's.
 * With a real `rate`, its present value in 2035 (D-166): the build at its cost, each rebuild discounted
 * from its year to 2035. */
export function lifeCost(c: Cost, hours: number, years: number, rate = 0): number {
  let total = c.mw + hours * c.mwh;
  for (let k = 1, left = years - c.life; left > 1e-9; k++, left -= c.life)
    total += (Math.min(1, left / c.life) * (c.mw50 + hours * c.mwh50)) / (1 + rate) ** (BUILT + k * c.life - PV_YEAR);
  return total;
}

/** What a sum paid at the end of each of `years` years is worth at their start, per unit of it, at a real
 * `rate` (D-166): the annuity factor, 27.68 for 60 years at 3 %. */
export const annuity = (rate: number, years: number): number => (rate > 0 ? (1 - (1 + rate) ** -years) / rate : years);

/** The catalogues' central estimates for 2030 and 2050 in 2025 EUR by the euro area's HICP, the plant's
 * units at the owner's figure for two, kept for its design life (D-157, D-158); null while a figure is
 * missing from the presets. */
export function capexOf(p: Presets, unitMw: number): Capex | null {
  const par = (key: string) => p.parameters[key]?.value;
  const [i20, i25, two, years] = [par("price.hicp_ea.2020"), par("price.hicp_ea.2025"), par("smr.bwrx300.capex_two_units_meur"), par("smr.bwrx300.design_life_years")];
  if (!i20 || !i25 || !two || !years) return null;
  const k = i25 / i20;
  const v = (row: string, x: string) => p.tech[row]?.[x]?.value;
  const cost: Record<string, Cost> = {};
  for (const [cls, row] of Object.entries(CAPEX_ROW)) {
    const [a, b, l] = ["investment", "investment_2050", "lifetime"].map((x) => v(row, x));
    if (a !== undefined && b !== undefined && l) cost[cls] = { mw: a * k, mwh: 0, life: l, mw50: b * k, mwh50: 0 };
  }
  const [pw, en, ot, pw50, en50, ot50, l] = ["investment_power", "investment_energy", "investment_other", "investment_power_2050",
    "investment_energy_2050", "investment_other_2050", "lifetime"].map((x) => v(BATTERY, x));
  if ([pw, en, ot, pw50, en50, ot50].every((x) => x !== undefined) && l)
    cost.battery = { mw: pw! * k, mwh: (en! + ot!) * k, life: l, mw50: pw50! * k, mwh50: (en50! + ot50!) * k };
  return { cost, plantMw: two / (2 * unitMw), years,
    sources: t("the Danish Energy Agency's technology data, central estimates for 2030, in 2025 EUR by the euro area's HICP (×{k}); over {years} years each source rebuilt as its lifetime ends at the catalogues' estimates for 2050, every build lasting one of 2030's, the last rebuild's share the years left, undiscounted; the plant at the owner's {two} M€ for two units, an assumption, built once in its design life", { k: fmt(k, 3), years: fmt(years, 0), two: fmt(two, 0) }) };
}

/** What the page takes besides the runs: each scenario's units in MW; the fleet of 2025 by zone and
 * class the inputs' growth is measured from, null until it is loaded; the impact's household, VAT and
 * design life with their sources, null without them; the contract's strike and clause; the owner's real
 * discount rate of the sums over the design life (D-166), null without it. */
export interface PresContext {
  plantMw: Record<string, number>;
  fleet2025: Record<string, Record<string, number>> | null;
  load2025?: Record<string, number> | null;
  impact: { kwh: number; vat: number; years: number; sources: string } | null;
  capex: Capex | null;
  strike: number;
  clause: boolean;
  rate: number | null;
  /** The contract for difference's term in years, the owner's assumption (D-250); the deck's account of the state. */
  cfdYears?: number | null;
}

/** The capital cost's lines: a battery and pumped hydro apart from the rest of storage (D-157). */
const capexLine = (cls: string) => (cls === "battery" || cls === "hydro_ps" ? cls : lineOf(cls));
const CAPEX_LINES: [line: string, label: string, ico: string][] = [
  ["wind_onshore", t("onshore wind"), "wind_onshore"], ["wind_offshore", t("offshore wind"), "wind_offshore"], ["solar", GROUP_LABEL.solar, "solar"],
  ["battery", t("batteries"), "battery"], ["hydro_ps", t("pumped hydro"), "hydro"], ["gas", t("natural gas"), "gas"],
  ["bio_waste", GROUP_LABEL.bio_waste, "biomass"], ["oil_shale", GROUP_LABEL.oil_shale, "oil_shale"], ["hydro", GROUP_LABEL.hydro, "hydro"], ["other", GROUP_LABEL.other, ""],
];

/** One zone's build of a line above its fleet of 2025: its new megawatts, their cost to 2035, over the plant's life and
 * that life's present value in 2035, M€ (null: no catalogue figure), and the classes priced; null without the fleet of 2025. */
export type Built = { mw: number; meur: number | null; meur60: number | null; meur60pv: number | null; cls: string[] } | null;

/** What each zone builds above its fleet of 2025, line by line, as a set's fleet has it — the same in the four scenarios
 * but for the plant, which the fleet does not list — the lines no zone builds left out (D-157 … D-166). The Model view's
 * and the Presentation page's capital cost and the deck's slide read it (D-220). */
export function capexRowsOf(set: YearResult[], s: State, c: PresContext): { line: string; label: string; ico: string; z: Built[] }[] {
  const k = c.capex;
  const scen = set[0].view.zones;
  // a line's new megawatts and their cost to 2035 and over the plant's life: the line's classes in the
  // scenario that have a cost, weighted by their megawatts, a battery at its zone's hours
  const built = (line: string, z: number): Built => {
    const f = c.fleet2025?.[ZONES[z]];
    if (!f) return null;
    const rows = scen[z].fleet.filter((r) => capexLine(r.cls) === line && (r.installedMw ?? 0) > 0);
    const now = rows.reduce((a, r) => a + r.installedMw!, 0);
    const was = Object.entries(f).reduce((a, [cls, x]) => a + (capexLine(cls) === line ? x : 0), 0);
    const mw = Math.max(0, now - was);
    const zs = s.zones[ZONES[z]], hours = line === "battery" && zs.mw.battery ? zs.batteryMwh / zs.mw.battery : 0;
    const priced = k ? rows.filter((r) => k.cost[r.cls]) : [];
    const w = priced.reduce((a, r) => a + r.installedMw!, 0);
    const per = (g: (x: Cost) => number) => (w ? priced.reduce((a, r) => a + r.installedMw! * g(k!.cost[r.cls]), 0) / w : null);
    const of = (x: number | null) => (!mw ? 0 : x === null ? null : mw * x);
    return { mw, meur: of(per((x) => x.mw + hours * x.mwh)), meur60: of(per((x) => lifeCost(x, hours, k!.years))),
      meur60pv: of(per((x) => lifeCost(x, hours, k!.years, c.rate ?? 0))), cls: priced.map((r) => r.cls) };
  };
  return CAPEX_LINES.map(([line, label, ico]) => ({ line, label, ico, z: ZONES.map((_, z) => built(line, z)) }))
    .filter((r) => r.z.some((x) => x && x.mw > 0));
}

/** The capital cost of the energy mix to 2035 (the owner asked, 2026-10-22; D-157 … D-160): what each zone
 * builds above its fleet of 2025 — a line's growth, never below zero, batteries and pumped hydro apart — at
 * its classes' cost in the scenario, a battery's at its zone's hours, and the same over the plant's life;
 * the plant's units at the owner's figure, per scenario; a line without a catalogue figure unpriced. `full`:
 * the table by source, as the Model view shows it, Latvia's and Lithuania's columns folded unless `open` names them
 * (D-197); else Estonia's totals by scenario, the presentation's (D-162). */
export function capexHtml(trio: Partial<Record<string, YearResult[]>>, names: Record<string, string>, s: State, c: PresContext, full: boolean,
  open: ReadonlySet<string> = new Set()): { body: string; note: string } {
  const ids = Object.keys(names);
  const done = ids.filter((id) => trio[id]);
  const title = `<h3 class="rh">${t("Capital cost of the energy mix to 2035")} ${tip(full ? t("What each zone builds above its observed fleet of 2025, at the cost of building it; the plant's units by scenario, 0/1/2/3 SMR")
    : t("What Estonia builds above its observed fleet of 2025, at the cost of building it; the plant's units by scenario, 0/1/2/3 SMR"))}</h3>`;
  if (!done.length || !c.fleet2025) return { body: `${title}<p class="note pending">${t("computing…")}</p>`, note: "" };
  const first = trio[done[0]]!;
  const plants = ids.filter((id) => id !== "gas");
  const k = c.capex;
  const capexRows = capexRowsOf(first, s, c);
  // a line's lifetime: its priced classes'
  const lifeOf = (r: (typeof capexRows)[number]) => {
    const cs = [...new Set(r.z.flatMap((x) => x?.cls ?? []))].map((cls) => k!.cost[cls]);
    return cs.length ? [...new Set(cs.map((x) => fmt(x.life, 0)))].join("/") + unit("a") : "–";
  };
  const meurCell = (x: number | null | undefined, lead = false) => `<td class="n${lead ? " g" : ""}">${x === undefined ? "" : x === null ? "–" : `<b>${fmt(x, 0)}</b>${unit("M€")}`}</td>`;
  // a line's total over the zones that price it, none where no zone does; the zones' totals are the
  // priced lines', the unpriced named under the table
  const rowTotal = (zs: Built[], key: "meur" | "meur60" | "meur60pv") => {
    const priced = zs.filter((x) => x && x.mw > 0 && x[key] !== null);
    return priced.length ? priced.reduce((a, x) => a + x![key]!, 0) : null;
  };
  const zoneTotal = (key: "meur" | "meur60" | "meur60pv") => ZONES.map((_, z) => (k ? capexRows.reduce((a, r) => a + (r.z[z]?.[key] ?? 0), 0) : null));
  const [z35, z60] = [zoneTotal("meur"), zoneTotal("meur60")];
  const all = (xs: (number | null)[]) => (xs.some((x) => x === null) ? null : xs.reduce<number>((a, x) => a + x!, 0));
  const unpriced = capexRows.flatMap((r) => r.z.flatMap((x, z) => (k && x && x.mw > 0 && x.meur === null && (full || !z) ? [`${cap(r.label)} ${ZONES[z]} ${fmt(x.mw, 0)} MW`] : [])));
  // the plant is built once in its design life: its cost over that life is its cost to 2035
  const plant = ids.map((id) => (k ? (c.plantMw[id] ?? 0) * k.plantMw : null));
  const years = k ? t("{n} years", { n: fmt(k.years, 0) }) : "";
  const zoneCells = (x: Built) => `<td class="n g">${x && x.mw ? fmt(x.mw, 0) + unit("MW") : "–"}</td>${meurCell(x && x.mw ? x.meur : undefined)}${meurCell(x && x.mw ? x.meur60 : undefined)}`;
  const empty = '<td class="g"></td><td></td><td></td>';
  // Latvia's and Lithuania's three columns fold to one with a button, closed until opened (D-197): every cell keeps
  // its unit, and the Baltic states' totals are whole either way
  const shut = (z: number) => z > 0 && !open.has(ZONES[z]);
  const foldCell = '<td class="g fold"></td>';
  const zoneOr = (z: number, cells: string) => (shut(z) ? foldCell : cells);
  const foldBtn = (z: number) => `<button type="button" class="fold-zone" data-capex-zone="${ZONES[z]}" aria-expanded="${!shut(z)}" aria-label="${esc(shut(z) ? t("show {zone}'s columns", { zone: ZONES[z] }) : t("fold {zone}'s columns", { zone: ZONES[z] }))}">${shut(z) ? "▸" : "◂"}</button>`;
  // the sources and the unpriced lines of the zones shown, as text: the Model view writes them under the table,
  // the presentation at its foot
  const note = k ? k.sources + (unpriced.length ? `. ${t("Not priced, no catalogue figure: {list}", { list: unpriced.join(", ") })}` : "") : "";
  if (!full) {
    // Estonia's totals by scenario, the plant's units in them; beside the life's sum its present value in
    // 2035 (D-166), the plant's units at their cost in 2035
    const add = (x: number | null, y: number | null) => (x === null || y === null ? null : x + y);
    const pv = c.rate === null ? null : zoneTotal("meur60pv");
    return { note, body: `${title}<table class="pres-t pres-capex"><thead>
    <tr><th></th><th class="g zc" colspan="${pv ? 3 : 2}">${flag("EE")}EE</th></tr>
    <tr><th></th><th class="g">2026–2035</th><th>${years}</th>${pv ? `<th>${t("present value, {r} %", { r: fmt(100 * c.rate!, 0) })}</th>` : ""}</tr></thead><tbody>
    ${ids.map((id, i) => `<tr class="sum"><td>${t("total, {name}", { name: esc(names[id]) })}</td>${meurCell(add(z35[0], plant[i]), true)}${meurCell(add(z60[0], plant[i]))}${pv ? meurCell(add(pv[0], plant[i])) : ""}</tr>`).join("")}
  </tbody></table>` };
  }
  return { note, body: `${title}<table class="pres-t pres-capex"><thead>
    <tr><th></th><th></th>${ZONES.map((zc, z) => (shut(z) ? `<th class="g zc fold" rowspan="2">${flag(zc)}${zc}${foldBtn(z)}</th>` : `<th class="g zc" colspan="3">${flag(zc)}${zc}${z ? foldBtn(z) : ""}</th>`)).join("")}<th class="g zc" colspan="2">${t("Baltic states")}</th></tr>
    <tr><th></th><th>${t("lifetime")}</th>${ZONES.map((_, z) => (shut(z) ? "" : `<th class="g">${t("to build")}</th><th>2026–2035</th><th>${years}</th>`)).join("")}<th class="g">2026–2035</th><th>${years}</th></tr></thead><tbody>
    ${capexRows.map((r) => `<tr><td>${r.ico ? icon(r.ico) : ""}${esc(cap(r.label))}</td><td class="n">${k ? lifeOf(r) : ""}</td>${r.z.map((x, z) => zoneOr(z, zoneCells(x))).join("")}${meurCell(rowTotal(r.z, "meur"), true)}${meurCell(rowTotal(r.z, "meur60"))}</tr>`).join("")}
    <tr class="sum"><td>${t("total without the plant")} (${esc(names.gas)})</td><td></td>${ZONES.map((_, z) => zoneOr(z, `<td class="g"></td>${meurCell(z35[z])}${meurCell(z60[z])}`)).join("")}${meurCell(all(z35), true)}${meurCell(all(z60))}</tr>
    ${plants.map((id) => `<tr><td>${icon("nuclear")}${esc(cap(GROUP_LABEL.nuclear))}, ${esc(names[id])}</td><td class="n">${k ? fmt(k.years, 0) + unit("a") : ""}</td><td class="n g">${fmt(c.plantMw[id] ?? 0, 0)}${unit("MW")}</td>${meurCell(plant[ids.indexOf(id)])}${meurCell(plant[ids.indexOf(id)])}${zoneOr(1, empty)}${zoneOr(2, empty)}${meurCell(plant[ids.indexOf(id)], true)}${meurCell(plant[ids.indexOf(id)])}</tr>`).join("")}
    ${plants.map((id) => { const x = plant[ids.indexOf(id)]; const add = (b: number | null) => (x === null || b === null ? null : x + b);
      return `<tr class="sum"><td>${t("total, {name}", { name: esc(names[id]) })}</td><td></td><td class="g"></td>${meurCell(add(z35[0]))}${meurCell(add(z60[0]))}${zoneOr(1, empty)}${zoneOr(2, empty)}${meurCell(add(all(z35)), true)}${meurCell(add(all(z60)))}</tr>`; }).join("")}
  </tbody></table>` };
}

