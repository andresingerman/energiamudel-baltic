/* Generated from schema/manifest.schema.json by `npm run contract`. Do not edit. */

/**
 * The export's index (SPECIFICATION R-DATA-8, R-PROV-1): every file with its SHA-256 and size, and for every series in it the lineage ids it derives from; the hash of the export code and contract, and of the export as a whole.
 */
export interface Manifest {
  contract: 1;
  code: string;
  export: string;
  files: {
    [k: string]: {
      sha256: string;
      bytes: number;
      series: {
        /**
         * @minItems 1
         */
        [k: string]: string[];
      };
    };
  };
}
