// The figures of the presentation of 10 November 2026 (docs/PLAN.md §9; D-123, D-124), computed as the
// application computes them: each neighbours' profile × the four scenarios, each climate year built and
// cleared as the worker does (engineScenario, build, runLP, view) and weighted as the page weighs them
// (runsOf). Per run: the three zones' average prices, Estonia's hours at or above 150 €/MWh, its net
// import, and with the plant its capture price and the CfD's yearly balance (the contract card's account).
// From app/: `node --no-maglev ../spikes/presentation-2026-11/figures.ts`. Writes data/derived/presentation/figures.json.
import { mkdirSync, writeFileSync } from "node:fs";
import { boundaryPrice, build, impliedBid, monthOfHour, neighbourGasCost } from "../../app/src/engine/build.ts";
import { account } from "../../app/src/engine/contract.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { boundaryOffers } from "../../app/src/engine/problem.ts";
import { SCENARIOS, engineScenario, opening, profileKey, runsOf, sensitivities, withProfile } from "../../app/src/state/model.ts";
import type { State } from "../../app/src/state/model.ts";
import { view } from "../../app/src/worker/view.ts";
import { links, presets, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const p = presets(), L = links(), { solve } = await loadSolver();
const s0 = opening(p);
const NEIGHBOURS_FUEL = "eraa2025_final";

/** Estonia's price-duration curve of a set: each climate year's hours sorted, the years averaged rank by
 * rank with their weights, then thinned to 100 points (the title slide's motif). */
const curves: Record<string, number[]> = {};
function runSet(st: State, extra: { gasFloor?: number | null; meanFloor?: Record<string, number> | null } = {}, curveName = "") {
  const sorted: { w: number; a: Float64Array }[] = [];
  const acc = { EE: 0, LV: 0, LT: 0, ee150: 0, eeNetImportTwh: 0, eeLoadTwh: 0, captureNum: 0, outputTwh: 0, cfdMeur: 0, plant: false };
  for (const r of runsOf(p, st)) {
    const y = year(r.key);
    const sc = { ...engineScenario(p, y, st), gasFloor: extra.gasFloor ?? null, meanFloor: extra.meanFloor ?? null };
    const pb = build(y, p, L, sc);
    const res = runLP(pb, solve);
    const level = neighbourGasCost(p, sc) ?? impliedBid(p, { ...sc, fuelPath: NEIGHBOURS_FUEL, gasFloor: null, gasPrice: null, euaPrice: null }, "gas_ccgt");
    const v = view(pb, res, [{}, {}, {}], monthOfHour(pb.hours, 2009, false), level);
    const ee = v.zones[0];
    if (curveName) sorted.push({ w: r.weight, a: Float64Array.from(ee.price).sort().reverse() });
    acc.EE += r.weight * v.zones[0].mean; acc.LV += r.weight * v.zones[1].mean; acc.LT += r.weight * v.zones[2].mean;
    let n150 = 0;
    for (let h = 0; h < pb.hours; h++) if (ee.price[h] >= 150) n150++;
    acc.ee150 += r.weight * n150;
    let imp = 0;
    for (const dir of ["import", "export"] as const) for (const b of ["FI"]) for (const j of boundaryOffers(pb.zones[0], dir, b)) for (let h = 0; h < pb.hours; h++) imp += (dir === "import" ? 1 : -1) * res.offers[0][j][h];
    // the internal link to Latvia: + towards LT
    for (let h = 0; h < pb.hours; h++) imp += -res.flow[0][h];
    acc.eeNetImportTwh += r.weight * imp / 1e6;
    acc.eeLoadTwh += r.weight * pb.zones[0].load.reduce((t, x) => t + x, 0) / 1e6; // Estonia's demand, the slides' base
    if (v.plant) {
      const a = account(ee.price, v.plant.mw, v.plant.month, st.smr.strike, "hourly", st.smr.clause);
      acc.plant = true;
      acc.captureNum += r.weight * a.captureEurMwh * a.outputTwh;
      acc.outputTwh += r.weight * a.outputTwh;
      acc.cfdMeur += r.weight * a.stateMeur;
    }
  }
  if (curveName) {
    const n = Math.min(...sorted.map((x) => x.a.length));
    curves[curveName] = Array.from({ length: 100 }, (_, i) => {
      const k = Math.min(n - 1, Math.round((i / 99) * (n - 1)));
      return sorted.reduce((t, x) => t + x.w * x.a[k], 0);
    });
  }
  return { EE: acc.EE, LV: acc.LV, LT: acc.LT, ee150: acc.ee150, eeNetImportTwh: acc.eeNetImportTwh, eeLoadTwh: acc.eeLoadTwh,
    capture: acc.plant ? acc.captureNum / acc.outputTwh : null, cfdMeur: acc.plant ? acc.cfdMeur : null, outputTwh: acc.plant ? acc.outputTwh : null };
}

// the unit's megawatts as the model offers them (315 since D-189), for the slides that name them
const out: Record<string, unknown> = { strike: s0.smr.strike, clause: s0.smr.clause, unitMw: p.parameters["smr.bwrx300.net_output_mw"]!.value,
  eeWindMw: s0.zones.EE.mw.wind_onshore, eeSolarMw: s0.zones.EE.mw.solar, profiles: {} as Record<string, unknown> };
const f = (x: number | null, d = 1) => (x === null ? "–" : x.toFixed(d));
for (const [name, st] of [["DE_2035 (in force)", s0], ["TIGHT_2035", withProfile(s0, "TIGHT", 2035)], ["TIGHTJ_2035", withProfile(s0, "TIGHTJ", 2035)]] as const) {
  const rows: Record<string, unknown> = {};
  for (const scen of SCENARIOS) {
    const x = runSet({ ...st, scenario: scen }, {}, name.startsWith("DE_2035") && (scen === "gas" || scen === "smr2") ? scen : "");
    rows[scen] = x;
    console.log(`${name} ${scen}: EE/LV/LT ${f(x.EE)}/${f(x.LV)}/${f(x.LT)} | EE ≥150 ${f(x.ee150, 0)} h | EE net import ${f(x.eeNetImportTwh, 2)} TWh | capture ${f(x.capture)} | CfD ${f(x.cfdMeur)} M€/yr | plant ${f(x.outputTwh, 2)} TWh`);
  }
  (out.profiles as Record<string, unknown>)[name] = rows;
  // the neighbours' average prices the runs took: the profile at the state's level — the owner's on Distributed Energy
  // 2035, ×1 on the tight profiles (D-190) — on the profile as published since D-194 (until 2026-10-28 at level 1, E-176)
  const nb: Record<string, number> = {};
  for (const r of runsOf(p, st)) {
    const y = year(r.key);
    for (const z of ["FI", "SE4", "PL"] as const) {
      const a = boundaryPrice(y, z, profileKey(st), st.level[z]);
      nb[z] = (nb[z] ?? 0) + r.weight * a.reduce((t, x) => t + x, 0) / a.length;
    }
  }
  (out as Record<string, unknown>)[`neighbours ${name}`] = nb;
  console.log(`${name}: neighbours FI/SE4/PL ${f(nb.FI)}/${f(nb.SE4)}/${f(nb.PL)}`);
}
// the standard sensitivities (R-APP-11) of the opening view: the owner's four price pairs of LNG and CO₂ since D-183, in
// the four scenarios as the page shows them since D-184
const sens: Record<string, unknown> = {};
for (const scen of SCENARIOS) {
  for (const x of sensitivities(p, { ...s0, scenario: scen })) {
    const r = runSet(x.state, { gasFloor: x.gasFloor, meanFloor: x.meanFloor as Record<string, number> | null });
    sens[`${scen}|${x.id}`] = { label: x.label, ...r };
    console.log(`sensitivity ${x.id} (${x.label}), ${scen}: EE/LV/LT ${f(r.EE)}/${f(r.LV)}/${f(r.LT)}${r.capture !== null ? ` | capture ${f(r.capture)} | CfD ${f(r.cfdMeur)} M€/yr` : ""}`);
  }
}
out.sensitivities = sens;
// slide 9: the opening view at the CO₂ price of Ea Energy's study for the Ministry of Climate, 2035 (about 97 €/t;
// docs/research/2026-10-18_ea_energy_comparison.md), beside ERAA 2025's that the scenario takes
const EA_EUA = 97;
out.co2 = { eua: EA_EUA, gas: runSet({ ...s0, scenario: "gas", fuelEua: EA_EUA }), smr2: runSet({ ...s0, scenario: "smr2", fuelEua: EA_EUA }) };
console.log(`CO₂ at ${EA_EUA} €/t: EE gas ${f((out.co2 as { gas: { EE: number } }).gas.EE)}, 2 SMR ${f((out.co2 as { smr2: { EE: number } }).smr2.EE)}`);
// slide L5: CO₂ alone at its 2026 auction average, which the sensitivity (e) carried until D-183
const EUA_2026 = p.sensitivity.co2_2026.eur_t.value;
out.co2_2026 = { eua: EUA_2026, gas: runSet({ ...s0, scenario: "gas", fuelEua: EUA_2026 }), smr2: runSet({ ...s0, scenario: "smr2", fuelEua: EUA_2026 }) };
console.log(`CO₂ at ${f(EUA_2026)} €/t: EE gas ${f((out.co2_2026 as { gas: { EE: number } }).gas.EE)}, 2 SMR ${f((out.co2_2026 as { smr2: { EE: number } }).smr2.EE)}`);
// the neighbours at the profile as published (level 1), the four scenarios: how much of the plant's effect the owner's
// levels carry (the questions and answers, the night of 2026-11-24)
const lv1 = { ...s0, level: Object.fromEntries(Object.keys(s0.level).map((k) => [k, 1])) as State["level"] };
out.level1 = Object.fromEntries(SCENARIOS.map((scen) => [scen, runSet({ ...lv1, scenario: scen })]));
for (const scen of SCENARIOS) { const x = (out.level1 as Record<string, ReturnType<typeof runSet>>)[scen]; console.log(`level 1 ${scen}: EE/LV/LT ${f(x.EE)}/${f(x.LV)}/${f(x.LT)} | capture ${f(x.capture)} | CfD ${f(x.cfdMeur)} M€/yr`); }
out.curves = curves;
mkdirSync("../data/derived/presentation", { recursive: true });
writeFileSync("../data/derived/presentation/figures.json", JSON.stringify(out, null, 1));
