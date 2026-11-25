// How robust the plant's effect is (the owner's choice of 2026-10-18, "Robustness of the SMR effect"): the opening
// state's four scenarios over a Latin hypercube of the inputs the result leans on most, each year cleared on the
// page's own job handler through the pool (as scripts/opening.ts) and weighted as the page weighs the climate years.
// Per sample: Estonia's, Latvia's and Lithuania's average prices, and the contract card's account of each plant
// scenario at the opening state's strike. The inputs and their ranges (each uniform, independent):
//   CO₂ 2035      80–200 €/t           today's EU allowance (about 85 €/t in October 2026's EEX auctions) to ERAA 2025's 197.5
//   gas 2035      30–75 €/MWh thermal  the owner's four LNG prices, per net MWh (D-183, D-191); until D-191 25–50, Ea Energy's 27 to above ERAA's 38.2
//   neighbours    ×1.0–2.0             one level for Finland, SE4 and Poland together, on the profile re-priced to the sample's fuel:
//                                      the profile as published to twice it, the owner's ×1.48–1.53 within (D-191; until then ×0.8–1.4)
//   EE demand     ×0.85–1.10           9.9–12.8 TWh: Ea's 10.2 and S1's 11.6 within
//   EE onshore    1 000–2 500 MW       S1's 1 244, the recent pace's 1 481 (docs/research/2026-10-06_statistics.md)
//   EE solar      1 500–3 000 MW       S1's 1 785, the recent pace's 2 537
// From app/: `node --no-maglev ../spikes/smr-robustness/montecarlo.ts [samples]`, which writes montecarlo.json beside it, or
// `… montecarlo.ts opening`, which runs the opening state alone and prints it.
import { writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { account } from "../../app/src/engine/contract.ts";
import type { State } from "../../app/src/state/model.ts";
import { SCENARIOS, opening, runsOf } from "../../app/src/state/model.ts";
import type { Reply } from "../../app/src/worker/job.ts";
import { Pool } from "../../app/src/worker/pool.ts";
import { presets } from "../../app/scripts/data.ts";
import { nodePool } from "../../app/scripts/node_pool.ts";

const N = Number(process.argv[2] ?? 300);
const p = presets(), s0 = opening(p);
// MC_NB="lo,hi" moves the neighbours' range, MC_OUT names the output (the night of 2026-11-25: a range around the owner's
// ×1.88–2.10, since D-194's ×1.0–2.0 on the published profile reaches them only at its top)
const NB = (process.env.MC_NB ?? "1.0,2.0").split(",").map(Number) as [number, number];
const RANGES = { eua: [80, 200], gas: [30, 75], neighbours: NB, demand: [0.85, 1.1], onshore: [1000, 2500], solar: [1500, 3000] } as const;
type Input = Record<keyof typeof RANGES, number>;

// a Latin hypercube from a fixed seed (mulberry32), so the samples can be drawn again
function rng(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const r = rng(20261018);
const keys = Object.keys(RANGES) as (keyof typeof RANGES)[];
const columns = keys.map(() => { const c = Array.from({ length: N }, (_, i) => (i + r()) / N); for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; });
const samples: Input[] = Array.from({ length: N }, (_, i) => Object.fromEntries(keys.map((k, j) => [k, RANGES[k][0] + columns[j][i] * (RANGES[k][1] - RANGES[k][0])])) as Input);

function stateOf(x: Input): State {
  const ee = s0.zones.EE;
  return { ...s0, fuelGas: x.gas, fuelEua: x.eua, level: { FI: x.neighbours, SE4: x.neighbours, PL: x.neighbours },
    zones: { ...s0.zones, EE: { ...ee, multiplier: ee.multiplier * x.demand, mw: { ...ee.mw, wind_onshore: x.onshore, solar: x.solar } } } };
}

const { pool, close } = nodePool(Pool.size(availableParallelism()));
const t0 = performance.now();
let years = 0;
async function scenario(st: State) {
  const acc = { EE: 0, LV: 0, LT: 0, capNum: 0, outputTwh: 0, cfdMeur: 0, w: 0 };
  await Promise.all(runsOf(p, st).map(async (run) => {
    const x = await pool.run<Reply>({ base: "", key: run.key, state: st, gasFloor: null, meanFloor: null });
    if (!("view" in x)) throw new Error(`${run.key}: ${"error" in x ? x.error : "no view"}`);
    years++;
    const v = x.view;
    acc.EE += run.weight * v.zones[0].mean; acc.LV += run.weight * v.zones[1].mean; acc.LT += run.weight * v.zones[2].mean; acc.w += run.weight;
    if (v.plant) {
      const a = account(v.zones[0].price, v.plant.mw, v.plant.month, st.smr.strike, "hourly", st.smr.clause);
      acc.capNum += run.weight * a.captureEurMwh * a.outputTwh; acc.outputTwh += run.weight * a.outputTwh; acc.cfdMeur += run.weight * a.stateMeur;
    }
  }));
  return { EE: acc.EE / acc.w, LV: acc.LV / acc.w, LT: acc.LT / acc.w, capture: acc.outputTwh ? acc.capNum / acc.outputTwh : null, cfdMeur: acc.outputTwh ? acc.cfdMeur / acc.w : null };
}
const results: unknown[] = [];
try {
  // `opening`: the opening state itself, which the site shows, to check this account against the page's
  if (process.argv[2] === "opening") {
    const ee = s0.zones.EE;
    console.log(`opening: CO₂ ${s0.fuelEua ?? "path"}, gas ${s0.fuelGas ?? "path"}, EE ×${ee.multiplier}, onshore ${ee.mw.wind_onshore}, solar ${ee.mw.solar}`);
    for (const id of SCENARIOS) console.log(id, JSON.stringify(await scenario({ ...s0, scenario: id })));
    process.exit(0);
  }
  // a sample's four scenarios together, eight samples at a time: the pool keeps its workers busy
  for (let i = 0; i < N; i += 8) {
    const batch = samples.slice(i, i + 8);
    const done = await Promise.all(batch.map(async (x) => {
      const st = stateOf(x);
      const rows = Object.fromEntries(await Promise.all(SCENARIOS.map(async (id) => [id, await scenario({ ...st, scenario: id })] as const)));
      return { input: x, ...rows };
    }));
    results.push(...done);
    if ((i / 8) % 5 === 0) console.log(`${results.length} of ${N} samples, ${years} years, ${((performance.now() - t0) / 1000).toFixed(0)} s`);
  }
} finally {
  await close();
}
writeFileSync(new URL(`./${process.env.MC_OUT ?? "montecarlo.json"}`, import.meta.url), JSON.stringify({ ranges: RANGES, seed: 20261018, strike: s0.smr.strike, samples: results }, null, 1));
console.log(`${N} samples, ${years} years in ${((performance.now() - t0) / 1000).toFixed(0)} s`);
