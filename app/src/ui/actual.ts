// What actually happened in a year, from its validation file (the export's observed prices,
// scheduled exchanges and generation; never an engine input, R-BND-3): the second column of the
// cards and the actual bars of the mix (the owner's request, D-029). Figures the record does not
// have — CO₂, curtailment, unserved energy, hours at a border's limit — are left out.

import type { Group } from "../worker/view.ts";
import { GROUPS, group } from "../worker/view.ts";

export interface Validation {
  price: Record<string, number[]>;
  scheduled: Record<string, { fwd: number[]; rev: number[] }>;
  gen: Record<string, Record<string, number[]>>;
}

interface ActualZone {
  mean: number;
  median: number;
  importTwh: number;
  exportTwh: number;
  importMeur: number; // at the zone's actual price
  exportMeur: number;
  mix: Record<Group, number>; // TWh
}

export interface Actual { label: string; zones: ActualZone[]; price: Record<string, number[]> }

/** The scheduled exchanges (ENTSO-E A09) that bring energy into each zone; the other direction
 * takes it out. Border codes run from the first zone to the second (fwd). */
const INTO: Record<string, [string, "fwd" | "rev"][]> = {
  EE: [["EE-FI", "rev"], ["EE-LV", "rev"]],
  LV: [["EE-LV", "fwd"], ["LV-LT", "rev"]],
  LT: [["LV-LT", "fwd"], ["LT-SE4", "rev"], ["LT-PL", "rev"]],
};

/** ENTSO-E A75 technologies onto the model's generation groups. */
const A75: Record<string, Group> = { biomass: "bio_waste", coal_gas: "oil_shale", peat: "other", battery: "storage", hydro_ps: "storage" };

function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

export function actualOf(v: Validation, label: string): Actual {
  const zones = ["EE", "LV", "LT"].map((z): ActualZone => {
    const p = v.price[z];
    let imp = 0, exp = 0, impE = 0, expE = 0;
    for (const [border, into] of INTO[z]) {
      const b = v.scheduled[border];
      if (!b) continue;
      const inn = b[into], out = b[into === "fwd" ? "rev" : "fwd"];
      for (let h = 0; h < p.length; h++) {
        imp += inn[h]; exp += out[h]; impE += inn[h] * p[h]; expE += out[h] * p[h];
      }
    }
    const mix = Object.fromEntries(GROUPS.map((g) => [g, 0])) as Record<Group, number>;
    for (const [tech, a] of Object.entries(v.gen[z] ?? {})) mix[A75[tech] ?? group(tech)] += a.reduce((s, x) => s + x, 0) / 1e6;
    return {
      mean: p.reduce((s, x) => s + x, 0) / p.length, median: median(p),
      importTwh: imp / 1e6, exportTwh: exp / 1e6, importMeur: impE / 1e6, exportMeur: expE / 1e6, mix,
    };
  });
  return { label, zones, price: v.price };
}
