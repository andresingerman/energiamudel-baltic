// What the markup register does to the opening scenarios of 2035: the four scenarios with the
// schedule of the register before this round, with the round's (Latvia and Lithuania one schedule,
// Estonia none), with that schedule on Estonia's gas too, and with none. From app/:
// `node --no-maglev ../spikes/validation-round2/scenario_markup.ts`.
import type { PerZone } from "../../app/src/engine/build.ts";
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
const now = (p as any).fitted.markup.LV.eur_mwh as number[];
const CASES: [string, PerZone<number[]> | null, number | null][] = [
  ["register before the round (D-044), batteries 61", { EE: [80, 160, 200, 200], LV: [35, 275, 355, 435], LT: [0, 80, 400, 520] }, 61],
  ["this round's register", null, null],
  ["this round's schedule on Estonia's gas too", { EE: now, LV: now, LT: now }, null],
  ["no markup", { EE: [0, 0, 0, 0], LV: [0, 0, 0, 0], LT: [0, 0, 0, 0] }, null],
];
for (const [name, markup, delta] of CASES) {
  const out: string[] = [];
  for (const id of SCENARIOS) {
    const s = { ...s0, scenario: id, battery: { ...s0.battery, delta: delta ?? s0.battery.delta } };
    const price = [0, 0, 0];
    let gas = 0;
    for (const r of runsOf(p, s)) {
      const y = year(r.key);
      const sc = engineScenario(p, y, s);
      const pb = build(y, p, L, markup ? { ...sc, markup } : sc);
      const sm = summarise(pb, runLP(pb, solve));
      sm.zones.forEach((z, i) => { price[i] += r.weight * z.price; });
      gas += r.weight * Object.entries(sm.zones[0].gen).filter(([c]) => c.startsWith("gas_")).reduce((x, [, v]) => x + v, 0);
    }
    out.push(`${id} ${ZONES.map((_, i) => price[i].toFixed(1)).join(" / ")} (EE gas ${gas.toFixed(2)} TWh)`);
  }
  console.log(`${name}: ${out.join("; ")}`);
}
