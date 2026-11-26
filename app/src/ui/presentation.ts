// What the Presentation page of 2026-10-21 to 2026-11-12 left (the owner took the page out, D-249): the context the
// deck takes besides the runs (`PresContext`), with the capital cost's figures and the plant's design life
// (`capexOf`, D-157 … D-160), and the helpers the deck reads the runs with. The Model view's table of the capital cost
// went at the owner's word (D-339).
import type { Presets } from "../contract/presets.ts";
import type { RunView } from "../worker/view.ts";
import { group } from "../worker/view.ts";
import { t } from "./i18n.ts";
import { fmt } from "./labels.ts";
import type { YearResult } from "./results.ts";

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
