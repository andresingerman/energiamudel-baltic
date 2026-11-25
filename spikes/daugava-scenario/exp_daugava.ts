// ERRATA E-063: what the scenario's Daugava does to the opening results. Four cases on the opening
// state, weighted over the set's years: as built; without TYNDP 2024's weekly "maximum generating
// power" (the cascade then limited by its megawatts); with the weekly inflow times the ratio of the
// record to TYNDP's inflow in the climate years both cover; with both.
// `node --no-maglev spikes/daugava-scenario/exp_daugava.ts [factor]` (default 1.95, README).
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { summarise } from "../../app/src/engine/results.ts";
import { SCENARIOS, engineScenario, opening, runsOf } from "../../app/src/state/model.ts";
import { links, presets, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const p = presets();
const L = links();
const { solve } = await loadSolver();
const s0 = opening(p);
const k = Number(process.argv[2] ?? 1.95);
const cases: [string, boolean, number][] = [["as built", true, 1], ["no weekly power limit", false, 1], [`inflow x${k}`, true, k], [`no limit, inflow x${k}`, false, k]];
for (const [name, cap, f] of cases) {
  for (const id of SCENARIOS) {
    const s = { ...s0, scenario: id };
    const mean = [0, 0, 0];
    let hydro = 0, peakLv = 0;
    for (const r of runsOf(p, s)) {
      const y = structuredClone(year(r.key));
      const lv = y.zones.LV as unknown as { hydro_weekly_max_mw?: Record<string, unknown>; hydro_weekly_mwh: Record<string, Record<string, number[]>> };
      if (!cap && lv.hydro_weekly_max_mw) delete lv.hydro_weekly_max_mw.daugava;
      for (const ty of Object.keys(lv.hydro_weekly_mwh.daugava)) lv.hydro_weekly_mwh.daugava[ty] = lv.hydro_weekly_mwh.daugava[ty].map((x) => x * f);
      const pb = build(y, p, L, engineScenario(p, y, s));
      const res = runLP(pb, solve);
      const sm = summarise(pb, res);
      sm.zones.forEach((z, i) => { mean[i] += r.weight * z.price; });
      hydro += r.weight * (sm.zones[1].gen.hydro_daugava ?? sm.zones[1].gen.hydro ?? 0);
      peakLv += r.weight * Object.entries(sm.zones[1].gen).filter(([c]) => c.includes("daugava")).reduce((a, [, v]) => a + v, 0);
    }
    console.log(`${name.padEnd(26)} ${id.padEnd(5)} ${ZONES.map((z, i) => `${z} ${mean[i].toFixed(1)}`).join("  ")} | Daugava ${Math.max(hydro, peakLv).toFixed(2)} TWh`);
  }
}
