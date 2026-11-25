// Kruonis's two reserve units out of a 2035 scenario's day-ahead market (the owner's question of D-073;
// docs/research/2026-10-18_kruonis_balancing.md): the opening state's four scenarios with Lithuania's
// pumped storage at 938 MW, as the scenario has it, and at 538 — the 400 MW Litgrid holds as mFRR today —
// its store unchanged. Each climate year built and cleared as the page does, weighted as it weighs them.
// From app/: `node --no-maglev ../spikes/kruonis-balancing/reserve_units.ts`. Writes reserve_units.json beside it.
import { writeFileSync } from "node:fs";
import { build, impliedBid, monthOfHour, neighbourGasCost } from "../../app/src/engine/build.ts";
import { account } from "../../app/src/engine/contract.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { SCENARIOS, engineScenario, opening, runsOf } from "../../app/src/state/model.ts";
import type { State } from "../../app/src/state/model.ts";
import { view } from "../../app/src/worker/view.ts";
import { links, presets, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const p = presets(), L = links(), { solve } = await loadSolver();
const s0 = opening(p);
const RESERVE_MW = 400;

function run(st: State) {
  const acc = { EE: 0, LV: 0, LT: 0, captureNum: 0, outputTwh: 0, cfdMeur: 0 };
  for (const r of runsOf(p, st)) {
    const y = year(r.key);
    const sc = engineScenario(p, y, st);
    const pb = build(y, p, L, sc);
    const res = runLP(pb, solve);
    for (const [z, k] of [[0, "EE"], [1, "LV"], [2, "LT"]] as const) {
      let s = 0;
      for (let h = 0; h < pb.hours; h++) s += res.price[z][h];
      acc[k] += r.weight * s / pb.hours;
    }
    const level = neighbourGasCost(p, sc) ?? impliedBid(p, { ...sc, fuelPath: "eraa2025_final", gasFloor: null, gasPrice: null, euaPrice: null }, "gas_ccgt");
    const v = view(pb, res, [{}, {}, {}], monthOfHour(pb.hours, 2009, false), level);
    if (v.plant) {
      const a = account(v.zones[0].price, v.plant.mw, v.plant.month, st.smr.strike, "hourly", st.smr.clause);
      acc.captureNum += r.weight * a.captureEurMwh * a.outputTwh;
      acc.outputTwh += r.weight * a.outputTwh;
      acc.cfdMeur += r.weight * a.stateMeur;
    }
  }
  return { EE: acc.EE, LV: acc.LV, LT: acc.LT, capture: acc.outputTwh ? acc.captureNum / acc.outputTwh : null, cfdMeur: acc.outputTwh ? acc.cfdMeur : null };
}

const held = (st: State): State => ({ ...st, zones: { ...st.zones, LT: { ...st.zones.LT, mw: { ...st.zones.LT.mw, hydro_ps: st.zones.LT.mw.hydro_ps - RESERVE_MW } } } });
const out: Record<string, unknown> = { reserveMw: RESERVE_MW, kruonisMw: s0.zones.LT.mw.hydro_ps, rows: {} as Record<string, unknown> };
for (const scen of SCENARIOS) {
  const whole = run({ ...s0, scenario: scen }), less = run(held({ ...s0, scenario: scen }));
  (out.rows as Record<string, unknown>)[scen] = { whole, held: less };
  const f = (x: number | null) => (x === null ? "–" : x.toFixed(1));
  console.log(`${scen}: EE ${f(whole.EE)} → ${f(less.EE)} | LV ${f(whole.LV)} → ${f(less.LV)} | LT ${f(whole.LT)} → ${f(less.LT)}${whole.capture !== null ? ` | capture ${f(whole.capture)} → ${f(less.capture)} | CfD ${f(whole.cfdMeur)} → ${f(less.cfdMeur)} M€/yr` : ""}`);
}
writeFileSync(new URL("./reserve_units.json", import.meta.url), JSON.stringify(out, null, 1));
