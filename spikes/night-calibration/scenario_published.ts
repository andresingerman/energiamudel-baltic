// The methodology's figures on the neighbours' profile as published (§4, §9: D-072's box unticked)
// beside scenario_docs.ts's, which run it re-priced as the application opens (D-079).
// `node --no-maglev spikes/night-calibration/scenario_published.ts`.
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { summarise } from "../../app/src/engine/results.ts";
import type { Scenario } from "../../app/src/engine/build.ts";
import type { State } from "../../app/src/state/model.ts";
import { engineScenario, opening, runsOf } from "../../app/src/state/model.ts";
import { links, presets, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const p = presets();
const L = links();
const { solve } = await loadSolver();
const s0: State = { ...opening(p), neighbourFuel: false };
const f1 = (x: number) => x.toFixed(1);
function mean(s: State, tweak: (sc: Scenario) => Scenario = (x) => x): string {
  const m = [0, 0, 0];
  for (const r of runsOf(p, s)) {
    const y = year(r.key);
    const sm = summarise(build(y, p, L, tweak(engineScenario(p, y, s))), runLP(build(y, p, L, tweak(engineScenario(p, y, s))), solve));
    sm.zones.forEach((z, i) => { m[i] += r.weight * z.price; });
  }
  return m.map(f1).join(" / ");
}
console.log(`published, lines as the panel sets them: ${mean(s0)}`);
console.log(`published, EstLink 3 and the fourth EE-LV line in service: ${mean({ ...s0, links: { ...s0.links, on: { ...s0.links.on, estlink3: true, ee_lv_4: true } } })}`);
console.log(`published, ERAA's NTC as given: ${mean(s0, (sc) => ({ ...sc, links: null }))}`);
console.log(`published, every cable at nameplate: ${mean({ ...s0, links: { ...s0.links, profile: "nameplate" } })}`);
console.log(`published, 2 SMR: ${mean({ ...s0, scenario: "smr2" })}`);
