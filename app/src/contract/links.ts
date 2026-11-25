/* Generated from schema/links.schema.json by `npm run contract`. Do not edit. */

/**
 * Scenario transfer capacities (SPECIFICATION R-LINK-1, R-LINK-3): the documentary capacities per scenario source, kind, border, direction and year, and ERAA 2025's hourly NTC per border, direction and target year (8 760 hours).
 */
export interface Links {
  contract: 1;
  table: {
    [k: string]: {
      [k: string]: {
        [k: string]: {
          [k: string]: {
            [k: string]: {
              mw: number;
              src: string[];
            };
          };
        };
      };
    };
  };
  eraa2025_hourly: {
    [k: string]: {
      [k: string]: {
        /**
         * @minItems 8760
         * @maxItems 8760
         */
        [k: string]: number[];
      };
    };
  };
}
