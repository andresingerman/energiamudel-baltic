/* Generated from schema/scenario.schema.json by `npm run contract`. Do not edit. */

/**
 * SPECIFICATION.md R-APP-1, R-APP-10 (DECISIONS D-027): a scenario as the flat map of its canonical text — one key=value line per entry, keys sorted, defaults included. A replay carries the keys of a replay, a scenario run those of a scenario run; unknown keys are rejected and every value is range-checked on import. Preset and class names are checked against presets.json.
 */
export interface Scenario {
  /**
   * version of this contract: 2 added the borders' keys (M5), 3 the scenario shown and the plant's contract (D-036); an older text opens with them at their defaults
   */
  v: 1 | 2 | 3;
  /**
   * scenario run: the scenario shown of the four of 2035 (D-036, D-058)
   */
  scenario?: "gas" | "smr1" | "smr2" | "smr3";
  /**
   * scenario run: the contract's negative-price clause (R-SMR-3, R-SMR-4)
   */
  "smr.clause"?: boolean;
  /**
   * scenario run: the contract's strike, €/MWh (R-SMR-3)
   */
  "smr.strike"?: number;
  /**
   * R-APP-2
   */
  run: "scenario" | "replay";
  /**
   * replay: the observed year
   */
  year?: number;
  /**
   * scenario run: R-TIME-2
   */
  family?: "tyndp2024" | "tyndp2026";
  /**
   * scenario run: the target year
   */
  target?: 2030 | 2035 | 2040 | 2050;
  /**
   * scenario run: the boundary profile of R-BND-5 (Distributed Energy, Global Ambition, National Trends of TYNDP 2024; National Trends+ of TYNDP 2026; REAL: the neighbours' observed prices of profile_year, D-051; TIGHT, TIGHTJ: the neighbours tight, each on its own or all at once, from energiamudel's research on Finland, Sweden and Poland, D-121)
   */
  profile?: "DE" | "GA" | "NT" | "NTplus" | "REAL" | "TIGHT" | "TIGHTJ";
  /**
   * scenario run: the target year of the boundary profile when it is not the run's own (D-046); absent = the run's target year
   */
  profile_year?: 2025 | 2030 | 2035 | 2040 | 2050;
  /**
   * scenario run, optional, read and ignored since D-194: the neighbours' profiles are taken as published. Until then (D-072) published: the market model's own gas and CO2 prices behind the profile; scenario: a TYNDP 2024 Distributed Energy or Global Ambition profile re-priced to the scenario's
   */
  "neighbours.fuel"?: "published" | "scenario";
  /**
   * scenario run: the fuel and CO2 path (R-SUP-8)
   */
  fuel?: "eraa2025_final" | "svk_lma_2026" | "tyndp2024_matrix";
  /**
   * scenario run (D-064): the gas price, €/MWh thermal; absent = the fuel path's
   */
  "price.gas"?: number;
  /**
   * scenario run (D-064): the CO2 price, €/t; absent = the fuel path's
   */
  "price.eua"?: number;
  /**
   * scenario run: the DSR preset, or none (R-DEM-6)
   */
  dsr?: string;
  /**
   * R-BND-5 level factor; up to 3 since D-194, where the owner's 120 €/MWh for Poland is ×2.10 on its profile as published
   */
  "FI.level"?: number;
  "SE4.level"?: number;
  "PL.level"?: number;
  /**
   * R-BND-6: €/MWh per GW of net Finnish export; 0 = price-taker
   */
  "FI.slope"?: number;
  /**
   * R-PAR-6, €/MWh charged
   */
  "battery.delta"?: number;
  /**
   * R-PAR-4, round trip
   */
  "battery.eff"?: number;
  /**
   * R-PAR-5, full cycles per day
   */
  "battery.cycles"?: number;
  /**
   * R-STO-1, where a preset gives no energy
   */
  "battery.hours"?: number;
  /**
   * Kruonis's cycle cost, €/MWh pumped (D-022)
   */
  "kruonis.delta"?: number;
  /**
   * R-STO-7, OPEN-3
   */
  mfrr_share?: number;
  /**
   * R-STO-5: upward reserve held out of the day-ahead market
   */
  reserves?: boolean;
  /**
   * scenario run: the HVDC cables at their typical availability or at nameplate (R-LINK-3)
   */
  "links.profile"?: "typical" | "nameplate";
  /**
   * scenario run: LT-PL held to Litgrid's plan 2026–2035 (R-LINK-3)
   */
  "links.plan"?: boolean;
  /**
   * scenario run: MW held for balancing on EE-LV (R-LINK-5)
   */
  "links.reserve.EE-LV"?: number;
  /**
   * scenario run: MW held for balancing on LV-LT (R-LINK-5)
   */
  "links.reserve.LV-LT"?: number;
}
