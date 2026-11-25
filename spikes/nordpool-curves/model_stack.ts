// The model's own Baltic supply and demand above its clearing price, hour by hour of a replay
// (docs/research/2026-10-17_curve_slopes.md §4 D). R-SUP-6 asks for its markup to be cross-checked
// against the Baltic aggregated supply curve: this gives, per hour, the same measures slopes.py's §4C
// reads off the BALTIC curve — the MW the three zones' own offers add between the model's price and
// 100 / 500 €/MWh above it, and the MW their demand offers withdraw. Each offer counts linearly over
// its width; the stores, the Daugava and the boundary trade are held at their dispatch, as the portal
// holds a cluster's net position, and what the stores and the Daugava could still give is reported
// beside, since the portal's curves carry their bids.
// From app/: `node --no-maglev ../spikes/nordpool-curves/model_stack.ts [year] [first-day last-day]` (UTC days;
// the default is the year file's last eleven). Writes data/derived/curves/model_stack_<year>.json.
import { mkdirSync, writeFileSync } from "node:fs";
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { presets, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const key = process.argv[2] ?? "2026";
const y = year(key), p = presets();
const pb = build(y, p, null, replay(p, y));
const r = runLP(pb, (await loadSolver()).solve);
const t0 = Date.parse(y.meta.start_utc ?? `${key}-01-01T00:00:00Z`);
const day = (h: number) => new Date(t0 + h * 3600e3).toISOString().slice(0, 10);
const first = process.argv[3] ?? day(pb.hours - 24 * 11), last = process.argv[4] ?? day(pb.hours - 1);
const LT = ZONES.indexOf("LT");
if (!r.units.every((u, i) => u.name === pb.storage[i].name)) throw new Error("the results' units are not the problem's stores, in order");

/** MW the Baltic zones' own offers supply at prices up to x in hour h, and their own demand offers
 * bid at x and above; the boundary trade is left out, as the portal folds the net position in. */
function own(h: number, x: number): { s: number; d: number } {
  let s = 0, d = 0;
  for (const zone of pb.zones) {
    for (const o of zone.offers) {
      if (o.cls === "import" || o.cls === "export") continue;
      const w = Math.min(Math.max((x - o.bid[h]) / o.width, 0), 1);
      if (o.demand) d += o.mw[h] * (1 - w);
      else s += o.mw[h] * w;
    }
  }
  return { s, d };
}

const rows = [];
for (let h = 0; h < pb.hours; h++) {
  const date = day(h);
  if (date < first || date > last) continue;
  const price = r.price.map((a) => a[h]);
  const pm = price[LT];                       // the BALTIC curve crosses near Latvia's and Lithuania's price
  const at = (dx: number) => own(h, Math.min(pm + dx, pb.voll));
  const [a0, a100, a500, cap] = [at(0), at(100), at(500), own(h, pb.voll)];
  // what the stores could still discharge, and the Daugava still release, in the hour (their bids
  // are in the portal's curves, their dispatch in the model's LP)
  const store = r.units.reduce((t, u, i) => t + Math.max(0, pb.storage[i].mw * pb.storage[i].eff - u.discharge[h]) * (u.energy[h] > 0 ? 1 : 0), 0);
  const daugava = r.reservoir && pb.reservoir ? Math.max(0, pb.reservoir.pmax[Math.floor(h / 168)] - r.reservoir.release[h]) : 0;
  rows.push({ ts: new Date(t0 + h * 3600e3).toISOString(), price, plt: pm, coupled: Math.max(...price) - Math.min(...price) < 0.01,
    sup100: a100.s - a0.s, sup500: a500.s - a0.s, dem100: a0.d - a100.d, demcap: a0.d - cap.d, store, daugava });
}
const med = (k: keyof (typeof rows)[number], sel = rows) => {
  const v = sel.map((x) => x[k] as number).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : NaN;
};
const c = rows.filter((x) => x.coupled);
console.log(`${key} ${first} … ${last}: ${rows.length} h, the three Baltic prices equal in ${c.length}`);
for (const [name, sel] of [["all hours", rows], ["Baltic prices equal", c]] as const) {
  console.log(`  ${name}: LT price ${med("plt", sel).toFixed(1)}; own supply added to +100 €/MWh ${med("sup100", sel).toFixed(0)} MW, ` +
    `to +500 ${med("sup500", sel).toFixed(0)}; own demand withdrawn to +100 ${med("dem100", sel).toFixed(0)}, to the cap ` +
    `${med("demcap", sel).toFixed(0)}; stores could add ${med("store", sel).toFixed(0)}, the Daugava ${med("daugava", sel).toFixed(0)} (medians)`);
}
mkdirSync("../data/derived/curves", { recursive: true });
writeFileSync(`../data/derived/curves/model_stack_${key}.json`, JSON.stringify({ key, first, last, rows }));
