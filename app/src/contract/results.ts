/* Generated from schema/results.schema.json by `npm run contract`. Do not edit. */

/**
 * SPECIFICATION.md R-APP-10: a run's scenario and results as the application exports them, with the code version, the data manifest's hash and the lineage of the inputs, so that every figure can be traced to its sources and reproduced. The hourly prices are the CSV export's.
 */
export interface Results {
  format: "energiamudel-v5 results";
  /**
   * version of this contract
   */
  version: 1;
  /**
   * the gate status the page carries (R-PUB-4)
   */
  gate: string;
  code: {
    /**
     * app/package.json
     */
    version: string;
    /**
     * git describe --always --dirty of the build
     */
    commit: string;
  };
  data: {
    /**
     * the export's own hash in manifest.json (R-DATA-8)
     */
    manifest: string;
    /**
     * SHA-256 of presets.json, which holds every preset value with its lineage ids
     */
    presets: string;
    years: {
      key: string;
      sha256: string;
      /**
       * per series of the year file, its lineage ids
       */
      lineage: {
        [k: string]: string[];
      };
    }[];
  };
  scenario: {
    /**
     * the canonical scenario text (schema/scenario.schema.json)
     */
    text: string;
    /**
     * lineage ids of the fleet and demand presets the scenario takes
     */
    sources: string[];
  };
  /**
   * each year of the set shown
   */
  runs: Run[];
  /**
   * per core zone, the set's figures weighted (R-TIME-3)
   */
  weighted: Zone[];
  /**
   * the scenario view's four scenarios, each weighted over the set (D-036, D-058); a scenario still computing when the file was saved is left out (D-127); null in a validation run
   */
  scenarios: {
    [k: string]: Zone[];
  } | null;
  /**
   * the four standard sensitivities, the owner's price pairs of LNG and CO₂ (R-APP-11; revision 2.44, D-183): the weighted average price per core zone in the scenario shown, and with the plant the same pair in 0 SMR (R-SMR-5); a figure still computing when the file was saved is null; null in a validation run
   */
  sensitivities: Sensitivity[] | null;
}
export interface Run {
  key: string;
  label: string;
  weight: number;
  hours: number;
  zones: Zone[];
  borders: {
    border: string;
    /**
     * net, + along the border's code
     */
    flowTwh: number;
    rentMeur: number;
    /**
     * share of hours at the limit along the code
     */
    congestedFwd: number;
    congestedRev: number;
  }[];
  /**
   * the nuclear plant's output; null without it
   */
  plantTwh: number | null;
}
export interface Zone {
  zone: "EE" | "LV" | "LT";
  meanEurMwh: number;
  /**
   * a run's; absent from weighted figures
   */
  medianEurMwh?: number;
  importTwh: number;
  exportTwh: number;
  importMeur?: number;
  exportMeur?: number;
  co2Mt: number;
  curtailTwh: number;
  unservedMwh: number;
  /**
   * share of hours with a fossil price (R-SMR-5, D-037); null in a validation run
   */
  fossilPriceShare?: number | null;
}
export interface Sensitivity {
  id: "1" | "2" | "3" | "4";
  label: string;
  /**
   * EE, LV, LT
   */
  meanEurMwh: number[] | null;
  /**
   * the same pair in 0 SMR, with the plant only
   */
  gasMeanEurMwh: number[] | null;
  error: string | null;
}
