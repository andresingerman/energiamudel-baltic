// The scenario view's three scenarios of the opening state, weighted over the set's years, with the
// cables' losses on and off (D-045). `node --no-maglev spikes/night-calibration/scenario_headline.ts [NTplus]`.
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { summarise } from "../../app/src/engine/results.ts";
import type { State } from "../../app/src/state/model.ts";
import { SCENARIOS, engineScenario, opening, runsOf } from "../../app/src/state/model.ts";
import { links, presets, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const p = presets();
const L = links();
const { solve } = await loadSolver();
let s0: State = opening(p);
if (process.argv[2] === "NTplus") s0 = { ...s0, family: "tyndp2026", profile: "NTplus" };
console.log(`battery delta ${s0.battery.delta}, profile ${s0.profile}, target ${s0.target}`);
for (const losses of [true, false]) {
  for (const id of SCENARIOS) {
    const s = { ...s0, scenario: id };
    const mean = [0, 0, 0];
    let nuc = 0, imp = 0;
    const per: string[] = [];
    for (const r of runsOf(p, s)) {
      const y = year(r.key);
      const pb = build(y, p, L, { ...engineScenario(p, y, s), losses });
      const sm = summarise(pb, runLP(pb, solve));
      sm.zones.forEach((z, i) => { mean[i] += r.weight * z.price; });
      nuc += r.weight * (sm.zones[0].gen.nuclear ?? 0);
      imp += r.weight * sm.borders.filter((b) => b.border.includes("FI") || b.border.includes("SE4") || b.border.includes("PL")).reduce((a, b) => a - b.flowTwh, 0);
      per.push(`${r.label} ${sm.zones[0].price.toFixed(1)}`);
    }
    console.log(`losses ${losses ? "on " : "off"} ${id.padEnd(5)} ${ZONES.map((z, i) => `${z} ${mean[i].toFixed(1)}`).join("  ")} | EE by year: ${per.join(", ")} | nuclear ${nuc.toFixed(2)} TWh | net import ${imp.toFixed(2)} TWh`);
  }
}
