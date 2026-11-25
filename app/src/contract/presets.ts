/* Generated from schema/presets.schema.json by `npm run contract`. Do not edit. */

/**
 * @minItems 1
 */
export type Src = string[];

/**
 * Every documentary value the panel offers, each with the lineage ids behind it (SPECIFICATION R-UI-6, R-PROV-1): fleets mapped to the classes of R-SUP-1, demand, DSR bands, fuel paths, technology parameters, scalar parameters, and the values derived from them (delivery caps R-SUP-9, HVDC loss shares R-BND-4, the Polish slow-build factor R-BND-5, the demand behind every boundary profile R-BND-8, weights R-TIME-3, reserve need and shares R-STO-6, hydro units R-ENG-5).
 */
export interface Presets {
  contract: 1;
  classes: {
    [k: string]: {
      label: string;
      params: string | null;
    };
  };
  class_rules: {
    [k: string]: {
      target: string;
      why: string;
      params: string | null;
    };
  };
  tech: {
    [k: string]: {
      [k: string]: Value;
    };
  };
  fleets: {
    [k: string]: ByZoneYear;
  };
  demand: {
    [k: string]: {
      [k: string]: {
        [k: string]: {
          [k: string]: Value;
        };
      };
    };
  };
  dsr: {
    [k: string]: {
      [k: string]: {
        [k: string]: {
          price: number;
          mw: number;
          hours: number;
          src: Src;
        }[];
      };
    };
  };
  electrolyser_efficiency: {
    [k: string]: {
      [k: string]: {
        [k: string]: Value;
      };
    };
  };
  fuel_paths: {
    [k: string]: {
      [k: string]: {
        [k: string]: Value;
      };
    };
  };
  parameters: {
    [k: string]: Value;
  };
  delivery: {};
  loss_share: {
    [k: string]: {
      [k: string]: Value;
    };
  };
  boundary: {
    /**
     * D-047: per boundary profile and boundary zone, the profile's average price weighted over its weather years as the runs weight them (R-TIME-3), before any level factor; named beside each profile of the panel's "Other" list
     */
    mean_price?: {
      family: "tyndp2024" | "tyndp2026" | "observed" | "research";
      scenario: "NT" | "DE" | "GA" | "NTplus" | "REAL" | "TIGHT" | "TIGHTJ";
      target_year: number;
      zone: "FI" | "SE4" | "PL";
      value: number;
      unit: "EUR/MWh";
      src: Src;
    }[];
    /**
     * R-BND-8, D-040, D-043: per boundary profile and boundary zone, the market model's annual generation by category (its loads marked '(load)' or '(pump)'), the net export and the dumped energy, TWh summed over the zone's nodes (the electric cars apart, their labels prefixed 'EV: ', D-041) — TYNDP 2024's 'Yearly Outputs' rows per climate year, and the TYNDP 2026 NT+ hourly dashboards summed over the year per weather scenario, under the same labels; shown on the import-price page, not read by the engine
     */
    generation?: {
      family: "tyndp2024" | "tyndp2026";
      scenario: "NT" | "DE" | "GA" | "NTplus";
      target_year: number;
      weather: string;
      zone: "FI" | "SE4" | "PL";
      output: string;
      twh: number;
      src: Src;
    }[];
    /**
     * D-041, D-043: per boundary profile and boundary zone, the market model's installed capacity by category, MW summed over the zone's nodes (TYNDP 2024: 'Installed Capacities [MW]', the electric cars' nodes apart, their labels prefixed 'EV: '; TYNDP 2026 NT+: the dashboards' 'Installed Capacity' sheet, which gives the cars no capacity); shown on the import-price page, not read by the engine
     */
    capacity?: {
      family: "tyndp2024" | "tyndp2026";
      scenario: "NT" | "DE" | "GA" | "NTplus";
      target_year: number;
      weather: string;
      zone: "FI" | "SE4" | "PL";
      output: string;
      mw: number;
      src: Src;
    }[];
    /**
     * D-256: per boundary zone, the observed installed capacity by ENTSO-E production type (A68, the pipeline's technology codes), MW on 1 January of `year` — the fleet at the end of the year before; a type the document does not list has no row. Shown beside the market model's capacity on the import-price page, not read by the engine
     */
    fleet?: {
      zone: "FI" | "SE4" | "PL";
      tech: string;
      year: number;
      mw: number;
      src: Src;
    }[];
  };
  weights: {};
  /**
   * R-APP-14 (D-087), the Statistics page: the last ten years of the monthly TTF gas price in euros per MWh thermal (World Bank Pink Sheet at the ECB rate) and of the monthly average EU ETS auction price (EEX, from 2017), and the year-end onshore wind, offshore wind and solar capacity of EE, LV, LT, FI, SE and PL, 2015-2025 (IRENASTAT)
   */
  statistics: {};
  /**
   * R-APP-13 (D-084), the Weather page: every PECD climate year's capacity factors, demand peak and energy and hydro inflow for the three core zones, the three years TYNDP 2024 selected with their weights, the documentary rows on the selection and the Dunkelflaute ranking, and the ERA5 temperature of the three years
   */
  climate_years: {};
  reserve: {};
  hydro: {};
  /**
   * M3's fitted parameters (R-VAL-2, R-PROV-4): data/derived/fitted_parameters.json with each fit's derived lineage record as its source; empty before the first fit
   */
  fitted: {};
  /**
   * the prices of 2026 that R-APP-11's sensitivities (d) and (e) took until revision 2.44 (D-183) and the engine's gas floor and the talk's CO₂ slide still read: the highest monthly TTF price of 2026 (World Bank Pink Sheet), with its month and its value in euros per MWh thermal at that month's ECB rate; the EU allowance's average price in 2026's EEX auctions to the last day the export holds (revision 2.20)
   */
  sensitivity: {
    gas_shock: {
      month: string;
      usd_mmbtu: Value;
      eur_mwh_th: Value;
    };
    co2_2026: {
      through: string;
      eur_t: Value;
    };
  };
  /**
   * R-LINK-7 (M5): the adequacy sampler's inputs — unit-exponential quantiles (1 024, so that the browser needs no logarithm), each cable's short trips and length, the long failures per km of cable with the repair times, ERAA's default for a line without history, and per zone each sampled class's unit size, forced-outage rate and repair time
   */
  adequacy: {
    /**
     * @minItems 1024
     * @maxItems 1024
     */
    exp_quantiles: number[];
    cables: {
      [k: string]: {
        trips_per_year: Value;
        trip_hours: Value;
        cable_km: Value;
        disturbance_share: Value;
      };
    };
    long_failure: {
      per_km_year: Value;
      per_year: {
        low: Value;
        high: Value;
      };
      repair_days: {
        [k: string]: Value;
      };
    };
    hvdc_default: {
      forced_outage_rate: Value;
      repair_days: Value;
    };
    units: {
      [k: string]: {
        [k: string]: {
          unit_mw: Value;
          forced_outage_rate: Value;
          repair_days: Value;
        };
      };
    };
  };
  /**
   * R-LINK-1, R-LINK-3, R-LINK-5: the lines behind each border (an HVDC cable each, the AC lines already in service as one group per border) with their capacity, typical availability and, for a planned line, ERAA 2025's first target year with it and its TSO's date; the 2025 average balancing allocation on the AC borders
   */
  links: {
    lines: {
      [k: string]: {
        border: "EE-FI" | "EE-LV" | "LV-LT" | "LT-SE4" | "LT-PL";
        name: string;
        kind: "hvdc" | "ac";
        src?: string[];
        mw?: Value;
        availability?: Value;
        planned_share?: Value;
        planned?: {
          eraa_year: number;
          eraa_before: number;
          src: string[];
          tso: {
            year: number;
            src: string[];
          };
        };
      };
    };
    reserve_2025: {
      "EE-LV": Value;
      "LV-LT": Value;
    };
  };
  /**
   * R-SUP-4: the 2024 average EUA price the market-entry prices hold at, and each oil-shale class's constant premium over its short-run cost at that price (EUR/MWh)
   */
  oil_shale: {
    [k: string]: Value;
  };
}
export interface Value {
  value: number;
  unit: string;
  src: Src;
}
/**
 * scenario -> zone -> year -> fleet
 */
export interface ByZoneYear {
  [k: string]: {
    [k: string]: Fleet;
  };
}
export interface Fleet {
  classes: {
    [k: string]: {
      mw: number;
      src: Src;
    };
  };
  battery_mwh: null | {
    mwh: number;
    src: Src;
  };
  flex: {
    [k: string]: {
      mw: number;
      src: Src;
    };
  };
  notes: string[];
  /**
   * D-055: the source's own capacity rows before the class map folds them (the key of scenarios.csv without 'capacity.'), MW or MWh as the source gives them; shown in the panel, not read by the engine
   */
  rows: {
    [k: string]: {
      value: number;
      src: Src;
      /**
       * D-059: the class the row is folded into alone or with other rows; null where it is split over classes, is flexibility or is a note
       */
      cls: string | null;
    };
  };
}
