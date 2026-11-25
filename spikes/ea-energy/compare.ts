// This model's 2035 price set beside Ea Energy Analyses' study for the Ministry of Climate (March 2026,
// `ea_energy_ee_2026`): the opening state run again with Ea's assumptions one at a time and together,
// each climate year built and cleared as the page does and weighted as the page weighs them (runsOf).
// Ea's 2035 inputs, read off its slides 13 and 17 (euros of 2022): gas about 7.5 €/GJ, 27 €/MWh thermal;
// the ETS price about 97 €/t; Estonia's demand about 10.2 TWh in its Scenario 2.
// From app/: `node --no-maglev ../spikes/ea-energy/compare.ts`. Writes spikes/ea-energy/compare.json.
import { writeFileSync } from "node:fs";
import { build, impliedBid, monthOfHour, neighbourGasCost } from "../../app/src/engine/build.ts";
import { account } from "../../app/src/engine/contract.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { view } from "../../app/src/worker/view.ts";
import { engineScenario, opening, runsOf } from "../../app/src/state/model.ts";
import type { State } from "../../app/src/state/model.ts";
import { links, presets, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const p = presets(), L = links(), { solve } = await loadSolver();
const s0 = opening(p);
const EA = { gas: 27.0, eua: 97, eeDemandTwh: 10.2 };

function run(st: State) {
  const acc = { EE: 0, LV: 0, LT: 0, eeLoadTwh: 0, captureNum: 0, outputTwh: 0, cfdMeur: 0 };
  for (const r of runsOf(p, st)) {
    const y = year(r.key);
    const sc = engineScenario(p, y, st);
    const pb = build(y, p, L, sc);
    const res = runLP(pb, solve);
    // the contract card's account, as the deck's figures take it (spikes/presentation-2026-11/figures.ts)
    const level = neighbourGasCost(p, sc) ?? impliedBid(p, { ...sc, fuelPath: "eraa2025_final", gasFloor: null, gasPrice: null, euaPrice: null }, "gas_ccgt");
    const v = view(pb, res, [{}, {}, {}], monthOfHour(pb.hours, 2009, false), level);
    if (v.plant) {
      const a = account(v.zones[0].price, v.plant.mw, v.plant.month, st.smr.strike, "hourly", st.smr.clause);
      acc.captureNum += r.weight * a.captureEurMwh * a.outputTwh;
      acc.outputTwh += r.weight * a.outputTwh;
      acc.cfdMeur += r.weight * a.stateMeur;
    }
    for (const [z, k] of [[0, "EE"], [1, "LV"], [2, "LT"]] as const) {
      let s = 0;
      for (let h = 0; h < pb.hours; h++) s += res.price[z][h];
      acc[k] += r.weight * s / pb.hours;
    }
    let load = 0;
    for (let h = 0; h < pb.hours; h++) load += pb.zones[0].load[h];
    acc.eeLoadTwh += r.weight * load / 1e6;
  }
  return { ...acc, capture: acc.outputTwh ? acc.captureNum / acc.outputTwh : null };
}

const base = run({ ...s0, scenario: "gas" });
const scale = EA.eeDemandTwh / base.eeLoadTwh; // Estonia's inflexible load to Ea's total, by the multiplier (R-DEM-3)
const withDemand = (st: State): State => ({ ...st, zones: { ...st.zones, EE: { ...st.zones.EE, multiplier: st.zones.EE.multiplier * scale } } });
const eaFuel = (st: State): State => ({ ...st, fuelGas: EA.gas, fuelEua: EA.eua });
const published = (st: State): State => ({ ...st, neighbourFuel: false });
// the neighbours without the owner's levels (D-182, D-185): Ea's study takes TYNDP's prices as they come
const level1 = (st: State): State => ({ ...st, level: { FI: 1, SE4: 1, PL: 1 } });
const variants: [string, (st: State) => State][] = [
  ["as the site (ERAA 2025's gas 38.2, CO₂ 197.5; neighbours re-priced)", (st) => st],
  ["Ea's gas only", (st) => ({ ...st, fuelGas: EA.gas })],
  ["Ea's CO₂ only", (st) => ({ ...st, fuelEua: EA.eua })],
  ["Ea's gas and CO₂, neighbours re-priced to them", eaFuel],
  ["neighbours as TYNDP published them", published],
  ["Ea's gas and CO₂, neighbours as published", (st) => published(eaFuel(st))],
  ["Ea's gas and CO₂ and Estonia's demand, neighbours re-priced", (st) => withDemand(eaFuel(st))],
  ["the neighbours at ×1, without the owner's levels", level1],
  ["Ea's gas and CO₂ and Estonia's demand, neighbours re-priced at ×1", (st) => level1(withDemand(eaFuel(st)))],
];
const out: Record<string, unknown> = { ea: EA, eeLoadTwhBase: base.eeLoadTwh, demandScale: scale, rows: [] as unknown[] };
for (const [name, f] of variants) {
  const gas = run(f({ ...s0, scenario: "gas" }));
  const smr2 = run(f({ ...s0, scenario: "smr2" }));
  (out.rows as unknown[]).push({ name, gas, smr2 });
  console.log(`${name}: EE ${gas.EE.toFixed(1)} (2 SMR ${smr2.EE.toFixed(1)}, effect ${(smr2.EE - gas.EE).toFixed(1)}; capture ${smr2.capture?.toFixed(1)}, CfD ${smr2.cfdMeur.toFixed(1)} M€/yr) | LV ${gas.LV.toFixed(1)} | LT ${gas.LT.toFixed(1)} | EE load ${gas.eeLoadTwh.toFixed(2)} TWh`);
}
writeFileSync(new URL("./compare.json", import.meta.url), JSON.stringify(out, null, 1));
