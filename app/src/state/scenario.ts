// A scenario's default values, each taken from presets.json (R-UI-6, R-PROV-1): an observed
// year's replay, or a scenario run from named presets (R-DEM-1, R-SUP-8, R-BND-5).

import type { Presets, Value } from "../contract/presets.ts";
import type { Year } from "../contract/year.ts";
import type { Band, PerZone, Scenario } from "../engine/build.ts";
import { pathValue } from "../engine/build.ts";
import type { ZoneCode } from "../engine/problem.ts";

function param(p: Presets, key: string): number {
  const v = p.parameters[key];
  if (!v || !Number.isFinite(v.value)) throw new Error(`parameter ${key} missing`);
  return v.value;
}

const each = <T>(f: (z: ZoneCode) => T): PerZone<T> =>
  ({ EE: f("EE"), LV: f("LV"), LT: f("LT") });

/** OPEN-3 as the owner decided it (D-025): the mFRR share the batteries hold and the cycling cost
 * fitted at that share (R-STO-9), from the register; the specification's default and prior until
 * the register has them. Kruonis keeps the prior (D-022). */
function batteryFit(p: Presets): { share: number; delta: number } {
  const f = (p.fitted as { battery_delta?: { EE?: { adopted?: boolean; mfrr_share?: number; eur_mwh?: number } } }).battery_delta?.EE;
  if (f?.adopted && Number.isFinite(f.mfrr_share) && Number.isFinite(f.eur_mwh)) return { share: f.mfrr_share!, delta: f.eur_mwh! };
  return { share: param(p, "reserve.mfrr_battery_share"), delta: param(p, "battery.cycling_cost_prior_eur_mwh") };
}

export function common(p: Presets, observedBefore2026: boolean): Omit<Scenario, "profile" | "target" | "fleet" | "batteryMwh" | "fuelPath" | "demandTwh" | "dsr" | "electrolysisCeiling" | "p2hCeiling"> {
  const fit = batteryFit(p);
  return {
    level: { FI: 1, SE4: 1, PL: 1 },
    fiSlope: null,
    // the day-ahead coupling of EstLink, NordBalt and LitPol carries no loss factor: where a cable
    // is not at its limit the two zones clear at one price, to the cent, and the system operators
    // buy the losses outside it (D-042, D-045). R-BND-4's losses stay a field of the scenario for a
    // market that prices them, as it does on Baltic Cable or NordLink
    losses: false,
    multiplier: each(() => 1),
    firmMw: each(() => 0),
    electrolysisMw: each(() => 0),
    p2hMw: each(() => 0),
    battery: {
      eff: param(p, "battery.round_trip_efficiency.clean_horizon_assumption"),
      delta: fit.delta,
      cyclesPerDay: param(p, "battery.cycles_per_day.clean_horizon_assumption"),
      hours: param(p, "battery.default_hours"),
    },
    pumpedDelta: param(p, "battery.cycling_cost_prior_eur_mwh"),
    mfrrShare: fit.share,
    reserves: true,
    chpFloor: true,
    gasAdder: null,
    gasFloor: null,
    meanFloor: null,
    smr: {
      units: 0,
      mw: param(p, "smr.bwrx300.net_output_mw"),
      outageHours: param(p, "smr.planned_outage_hours"),
      gapHours: param(p, "smr.outage_gap_hours"),
      clause: false,
      minLoad: param(p, "smr.bwrx300.min_power_fraction"),
    },
    voll: param(p, "market.price_cap_eur_mwh"),
    floor: param(p, observedBefore2026 ? "market.price_floor_before_2026_05_28_eur_mwh" : "market.price_floor_eur_mwh"),
  };
}

/** Replay of an observed year: its own fleet, load, prices at the border and capacities. */
export function replay(p: Presets, year: Year): Scenario {
  if (year.meta.kind !== "observed") throw new Error(`${year.meta.key} is not an observed year`);
  return {
    ...common(p, year.meta.year < 2026),
    profile: "observed", target: null, fleet: null, batteryMwh: null, fuelPath: null, demandTwh: null,
    dsr: each(() => []), electrolysisCeiling: 0, p2hCeiling: 0,
  };
}

interface Choice {
  target: number;
  profile: string; // "DE_2035", "GA_2035", "NTplus_2035", …
  fleet: PerZone<string>; // preset per zone (R-DEM-1)
  demand: PerZone<string | null> | null; // null: the family's own demand (every zone, or one zone)
  dsr: string | null;
  fuelPath: string; // R-SUP-8
}

/** The hydrogen price a fuel path gives, €/MWh (R-DEM-5). */
const HYDROGEN: Record<string, string> = { eraa2025_final: "hydrogen", svk_lma_2026: "hydrogen_import", tyndp2024_matrix: "hydrogen_blue" };

export function outlook(p: Presets, year: Year, c: Choice): Scenario {
  if (year.meta.kind === "observed") throw new Error(`${year.meta.key} is an observed year`);
  const ty = String(c.target);
  const fleet = each((z) => {
    const f = p.fleets[c.fleet[z]]?.[z]?.[ty];
    if (!f) throw new Error(`fleet ${c.fleet[z]} has no ${z} ${ty}`);
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(f.classes)) out[k] = v.mw;
    return out;
  });
  const batteryMwh = each((z) => p.fleets[c.fleet[z]][z][ty].battery_mwh?.mwh ?? null);
  const demandTwh = c.demand ? each((z) => {
    const key = c.demand![z];
    if (key === null) return null;
    const d = p.demand[key]?.[z]?.[ty] as Record<string, Value> | undefined;
    if (!d?.twh) throw new Error(`demand ${key} has no ${z} ${ty}`);
    return d.twh.value - (d.electrolysis_twh?.value ?? 0); // electrolysis off by default (D-011)
  }) : null;
  const dsr = each((z): Band[] => (c.dsr ? (p.dsr[c.dsr]?.[z]?.[ty] ?? []).map((b) => ({ price: b.price, mw: b.mw, hours: b.hours })) : []));
  const eff = p.electrolyser_efficiency.pemmdb_nt_2030?.LT?.["2030"]?.value;
  if (eff === undefined) throw new Error("electrolyser efficiency missing");
  const h2 = pathValue(p, c.fuelPath in HYDROGEN ? c.fuelPath : "svk_lma_2026", HYDROGEN[c.fuelPath] ?? "hydrogen_import", c.target);
  const biomassPath = Object.values(p.fuel_paths[c.fuelPath] ?? {}).some((y) => y.biomass) ? c.fuelPath : "svk_lma_2026";
  const boiler = p.tech["dea_2025|electric_boiler_large"]?.heat_efficiency?.value;
  const hop = p.tech["dea_2025|wood_chips_hop_large"]?.heat_efficiency?.value;
  if (boiler === undefined || hop === undefined) throw new Error("heat efficiencies missing");
  return {
    ...common(p, false),
    profile: c.profile, target: c.target, fleet, batteryMwh, fuelPath: c.fuelPath, demandTwh, dsr,
    electrolysisCeiling: h2 * eff,
    p2hCeiling: (pathValue(p, biomassPath, "biomass", c.target) / hop) * boiler,
  };
}

