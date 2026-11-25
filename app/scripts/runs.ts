// Named runs for the scripts: the 2024 replay and a climate year with ERAA 2035's fleet.
import type { Presets } from "../src/contract/presets.ts";
import type { Year } from "../src/contract/year.ts";
import { build } from "../src/engine/build.ts";
import type { Problem } from "../src/engine/problem.ts";
import { outlook, replay } from "../src/state/scenario.ts";
import { links, presets, year } from "./data.ts";

const ERAA = { EE: "eraa2025_nt_2035", LV: "eraa2025_nt_2035", LT: "eraa2025_nt_2035" };

/** A climate year with ERAA 2035's fleets, demand and DSR, Distributed Energy 2035 at the borders. */
export const eraaOutlook = (p: Presets, y: Year) =>
  outlook(p, y, { target: 2035, profile: "DE_2035", fleet: ERAA, demand: ERAA, dsr: "eraa2025_nt_2035", fuelPath: "eraa2025_final" });

export function make(run: string): Problem {
  const p = presets();
  const y = year(run);
  if (y.meta.kind === "observed") return build(y, p, null, replay(p, y));
  return build(y, p, links(), eraaOutlook(p, y));
}
