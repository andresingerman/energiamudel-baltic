// The batteries' cycling cost Δ (SPECIFICATION.md R-STO-9, R-PAR-6; docs/methodology.md §7):
// with their reserve held out (R-STO-7), Δ is the value at which the engine of record's Estonian
// batteries discharge what ENTSO-E A75 reports over the window where both the fleet (A68, 2026)
// and its output (A75, from 2026-03-11) are published; bisection on Δ, the discharge falling as Δ
// rises. Estonia only: its batteries are all in the market, while Latvia's and Lithuania's A75
// mixes in the TSOs' reserve batteries (R-STO-8). `node --no-maglev scripts/fit_delta.ts [mFRR share]` prints
// JSON; the share of the mFRR need the batteries hold (R-STO-7) defaults to the preset.
import { build } from "../src/engine/build.ts";
import { runLP } from "../src/engine/lp.ts";
import { replay } from "../src/state/scenario.ts";
import { presets, validation, year } from "./data.ts";
import { loadSolver } from "./highs.ts";

const YEAR = "2026";
const { solve } = await loadSolver();
const p = presets();
const y = year(YEAR);
const share = process.argv[2] === undefined ? replay(p, y).mfrrShare : Number(process.argv[2]);
if (!(share >= 0 && share <= 1)) throw new Error(`mFRR share ${process.argv[2]} outside 0…1`);
const obs = validation(YEAR).gen.EE.battery;
if (!obs) throw new Error("no Estonian battery output in the 2026 validation file");
const first = obs.findIndex((x) => x > 0);
if (first < 0) throw new Error("no Estonian battery output");
const from = first - (first % 168); // the window starts with the week of the first report
let observed = 0;
for (let h = from; h < obs.length; h++) observed += obs[h];

function discharge(delta: number): number {
  const sc = replay(p, y);
  const pb = build(y, p, null, { ...sc, mfrrShare: share, battery: { ...sc.battery, delta } });
  const r = runLP(pb, solve);
  const u = r.units.find((x) => x.name === "battery:EE");
  if (!u) throw new Error("no Estonian battery in the 2026 replay");
  let s = 0;
  for (let h = from; h < pb.hours; h++) s += u.discharge[h];
  return s;
}

let lo = 0;
let hi = 300;
if (discharge(lo) < observed) hi = lo; // even without a cycling cost the batteries discharge less
else if (discharge(hi) > observed) lo = hi;
else {
  for (let it = 0; it < 30 && hi - lo > 0.25; it++) {
    const mid = (lo + hi) / 2;
    if (discharge(mid) > observed) lo = mid;
    else hi = mid;
  }
}
const delta = Math.round(((lo + hi) / 2) * 2) / 2;
const model = discharge(delta);
console.log(JSON.stringify({
  zone: "EE", year: Number(YEAR), mfrr_share: share, window_from_hour: from, window_to_hour: obs.length,
  observed_mwh: Math.round(observed), model_mwh: Math.round(model), eur_mwh: delta,
  residual_share: Math.round(((model - observed) / observed) * 10000) / 10000,
}));
