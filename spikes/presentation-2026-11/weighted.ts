// Estonia's price weighted by its own demand beside the hours' plain average (the night of 2026-11-25; the weak point
// «the price is the hours' average, not weighted by demand» of the report of 24 November). The opening state's four
// scenarios, each climate year built and cleared as the worker does and weighted as the page weighs them (runsOf),
// as figures.ts does. The weighted price is what a consumer with Estonia's load shape pays per MWh on the spot; the
// deck's saving of a home (D-281, 3 030 kWh a year) is on the plain average.
// From app/: `node --no-maglev ../spikes/presentation-2026-11/weighted.ts`.
import { build, monthOfHour } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { SCENARIOS, engineScenario, opening, runsOf } from "../../app/src/state/model.ts";
import { view } from "../../app/src/worker/view.ts";
import { links, presets, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const p = presets(), L = links(), { solve } = await loadSolver();
const s0 = opening(p);
const rows: Record<string, { plain: number; weighted: number }> = {};
for (const scen of SCENARIOS) {
  const st = { ...s0, scenario: scen };
  let plain = 0, num = 0, den = 0;
  for (const r of runsOf(p, st)) {
    const y = year(r.key), pb = build(y, p, L, engineScenario(p, y, st)), res = runLP(pb, solve);
    const ee = view(pb, res, [{}, {}, {}], monthOfHour(pb.hours, 2009, false), 0).zones[0];
    const load = pb.zones[0].load;
    let n = 0, d = 0;
    for (let h = 0; h < pb.hours; h++) { n += ee.price[h] * load[h]; d += load[h]; }
    plain += r.weight * ee.mean; num += r.weight * n / d; den += r.weight;
  }
  rows[scen] = { plain, weighted: num / den };
  console.log(`${scen}: plain ${plain.toFixed(1)} €/MWh, weighted by demand ${(num / den).toFixed(1)} €/MWh`);
}
const base = rows[SCENARIOS[0]];
for (const scen of SCENARIOS.slice(1)) {
  const r = rows[scen];
  console.log(`${scen}: effect plain ${(r.plain - base.plain).toFixed(1)}, weighted ${(r.weighted - base.weighted).toFixed(1)} €/MWh`);
}
