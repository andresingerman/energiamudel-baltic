/* Generated from schema/year.schema.json by `npm run contract`. Do not edit. */

/**
 * observed: ENTSO-E A65
 *
 * @minItems 24
 * @maxItems 8784
 */
export type HourlyMw = number[];
/**
 * @minItems 24
 * @maxItems 8784
 */
export type HourlyMw1 = number[];
/**
 * @minItems 24
 * @maxItems 8784
 */
export type HourlyCf = number[];
/**
 * @minItems 24
 * @maxItems 8784
 */
export type Hourly = number[];
/**
 * @minItems 1
 * @maxItems 53
 */
export type Weekly = number[];
/**
 * @minItems 1
 * @maxItems 12
 */
export type Monthly = number[];

/**
 * One year of engine input (SPECIFICATION R-DATA-8, R-NFR-7): an observed year, a TYNDP 2024 climate year or a TYNDP 2026 weather scenario. Array lengths equal meta.hours (hourly), 53 (weekly) or 12 (monthly); export/check.py and the engine's guards enforce the lengths. No observed price of EE, LV or LT is ever present (R-BND-3).
 */
export interface Year {
  contract: 1;
  meta: Meta;
  zones: {
    EE: Zone;
    LV: Zone;
    LT: Zone;
  };
  /**
   * Hourly price profiles of the boundary zones, keyed by profile: 'observed' (observed years: the zone's day-ahead price, and from the Nordic flow-based go-live of 2024-10-29 the price at the virtual hub at the Nordic end of the zone's cable, SE4_NB or FI_EL, D-075; Poland's since the Core flow-based go-live of 2022-06-09 less the shadow price of Poland's allocation constraint, D-076), 'DE_2035' … 'GA_2050', 'NT_2030', 'NT_2040' (climate years), 'NTplus_2035' (weather scenarios), 'REAL_2025' (climate years: the zone's observed day-ahead prices of 2025, hour by hour of that year, D-051), 'TIGHT_2035' and 'TIGHTJ_2035' (climate years: the neighbours tight, each on its own or all at once, from energiamudel's research on Finland, Sweden and Poland, frozen at the fuels they were computed with, D-121).
   */
  boundary: {
    FI: Profiles;
    SE4: Profiles;
    PL: Profiles;
  };
  /**
   * Observed years only (empty otherwise): offered day-ahead capacity per direction (ENTSO-E A31) and, on the AC borders, the capacity allocated to balancing (BTD).
   */
  borders: {
    /**
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` "^(EE-FI|EE-LV|LV-LT|LT-SE4|LT-PL)$".
     */
    [k: string]: {
      ntc_fwd: HourlyMw1;
      ntc_rev: HourlyMw1;
      reserved_fwd?: HourlyMw1;
      reserved_rev?: HourlyMw1;
    };
  };
  /**
   * Observed years only: monthly averages in euros (the Pink Sheet's dollar gas price converted at the ECB monthly rate, OPEN-13); one value per month the year file covers.
   */
  fuel?: {
    gas_eur_mwh_th: Monthly;
    eua_eur_t: Monthly;
    usd_per_eur: Monthly;
  };
}
export interface Meta {
  key: string;
  kind: "observed" | "climate" | "weather";
  family: "observed" | "tyndp2024" | "tyndp2026";
  /**
   * calendar year, climate year, or the modelled year of a weather scenario
   */
  year: number;
  hours: number;
  /**
   * false for the current, partial year (replay only)
   */
  complete: boolean;
  start_utc?: string | null;
  weight: number | null;
  /**
   * weather scenarios: the NT+ target year they belong to
   */
  target_year: number | null;
  weather: string | null;
  climate_model: string | null;
  /**
   * first hour of the Baltic balancing capacity market (2025-02-04) in an observed year; reserve arrays are 0 before it
   */
  reserve_start_hour?: number | null;
  /**
   * rank labels of R-TIME-4
   */
  labels: {};
  filled: {
    series: string;
    rule: string;
    count: number;
    first: number;
    last: number;
  }[];
  /**
   * series left out and why (e.g. a technology ENTSO-E reports for too few hours)
   */
  notes?: string[];
}
export interface Zone {
  load?: HourlyMw;
  /**
   * scenario years: hourly demand components keyed by component, then by target year ('nt_profile' of TYNDP 2024; 'market', 'prosumer', 'ev_market', 'ev_prosumer' of NT+)
   */
  demand?: {
    [k: string]: ByTargetMw;
  };
  /**
   * observed: ENTSO-E A75 per technology
   */
  gen?: {
    [k: string]: HourlyMw1;
  };
  /**
   * observed: ENTSO-E A68 per technology, MW (the reference the generation was measured against)
   */
  capacity?: {
    [k: string]: number;
  };
  /**
   * scenario years: capacity factors per class, keyed by target year
   */
  cf?: {
    [k: string]: ByTargetCf;
  };
  temperature_c?: Hourly;
  /**
   * observed: procured balancing capacity, MW (BTD), 0 before reserve_start_hour
   */
  reserve?: {
    FCR_sym?: HourlyMw1;
    aFRR_up?: HourlyMw1;
    aFRR_down?: HourlyMw1;
    mFRR_up?: HourlyMw1;
    mFRR_down?: HourlyMw1;
  };
  /**
   * observed years: the weekly maximum output (ENTSO-E A75) of each fuel-burning technology, its availability in the replay (R-SUP-6, D-022)
   */
  thermal_weekly_max_mw?: {
    [k: string]: Weekly;
  };
  /**
   * observed years: the 10th percentile of each fuel-burning technology's hourly output (ENTSO-E A75) in each week, the least a replay runs it where the fitted floor is lower (R-SUP-5, D-073)
   */
  thermal_weekly_p10_mw?: {
    [k: string]: Weekly;
  };
  /**
   * observed years: the weekly minimum output of the Daugava cascade, its minimum flow in the replay (R-ENG-5, D-022)
   */
  hydro_weekly_min_mw?: {
    [k: string]: Weekly;
  };
  /**
   * observed years: the 10th percentile of the Daugava cascade's hourly output in each week, the least a replay releases (D-044)
   */
  hydro_weekly_p10_mw?: {
    [k: string]: Weekly;
  };
  /**
   * observed years: the 90th percentile of the Daugava cascade's hourly output in each week, the most a replay releases (D-044)
   */
  hydro_weekly_p90_mw?: {
    [k: string]: Weekly;
  };
  /**
   * weekly energy per hydro unit: observed generation (observed years) or inflow keyed by target year (scenario years)
   */
  hydro_weekly_mwh?: {
    [k: string]:
      | Weekly
      | {
          [k: string]: Weekly;
        };
  };
  /**
   * weekly maximum generation per hydro unit, MW: the Daugava cascade's observed weekly maximum output, its turbine limit in the replay (observed years, D-042), Kruonis's observed weekly maximum output, the power a replay gives it that week (observed years, D-073), or PEMMDB's MAX_TURB keyed by target year (climate years)
   */
  hydro_weekly_max_mw?: {
    [k: string]:
      | Weekly
      | {
          [k: string]: Weekly;
        };
  };
}
export interface ByTargetMw {
  [k: string]: HourlyMw1;
}
export interface ByTargetCf {
  [k: string]: HourlyCf;
}
export interface Profiles {
  [k: string]: Hourly;
}
