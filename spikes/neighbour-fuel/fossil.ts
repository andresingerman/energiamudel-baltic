// Estonia's hours with a fossil price in the opening state's four scenarios (R-SMR-5, D-037), at the
// level in use before ERRATA E-064 (a combined-cycle plant on TYNDP 2024's natural-gas price), at
// the market model's own best gas plant on its gas blend, and with the profile re-priced (D-072).
// Run from app/: `node --no-maglev ../spikes/neighbour-fuel/fossil.ts`.
import { build, impliedBid, neighbourGasCost } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import type { State } from "../../app/src/state/model.ts";
import { SCENARIOS, engineScenario, opening, runsOf } from "../../app/src/state/model.ts";
import { NEIGHBOURS_FUEL, view } from "../../app/src/worker/view.ts";
import { links, presets, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const p = presets();
const L = links();
const { solve } = await loadSolver();
const s0: State = { ...opening(p), neighbourFuel: false }; // as published; the application opens re-priced (D-079)
for (const [name, base, old] of [["published, level before E-064", s0, true], ["published", s0, false], ["re-priced", { ...s0, neighbourFuel: true }, false]] as [string, State, boolean][]) {
  const out: string[] = [];
  let level = 0;
  for (const id of SCENARIOS) {
    const s = { ...base, scenario: id };
    let fossil = 0, neighbour = 0;
    for (const r of runsOf(p, s)) {
      const y = year(r.key);
      const sc = engineScenario(p, y, s);
      const pb = build(y, p, L, sc);
      level = old ? impliedBid(p, { ...sc, fuelPath: NEIGHBOURS_FUEL, gasFloor: null, gasPrice: null, euaPrice: null }, "gas_ccgt")! : neighbourGasCost(p, sc)!;
      const f = view(pb, runLP(pb, solve), undefined, null, level).zones[0].fossil!;
      fossil += (r.weight * 100 * (f.unit + f.neighbour)) / pb.hours;
      neighbour += (r.weight * 100 * f.neighbour) / pb.hours;
    }
    out.push(`${id} ${fossil.toFixed(1)} % (neighbour ${neighbour.toFixed(1)})`);
  }
  console.log(`${name}, level ${level.toFixed(1)} €/MWh: ${out.join("; ")}`);
}
