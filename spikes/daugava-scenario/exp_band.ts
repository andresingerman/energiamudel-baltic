// Would a band on the scenario's Daugava matter? (the second step D-070 names.) The record's
// weekly band — the 10th and 90th percentile hour of the week over the week's mean, 2020–2025 —
// is read as two ratios per level of the week's mean (terciles), and laid on the scenario's weekly
// water. The problem's reservoir is changed in memory after `build`; nothing else moves.
// Run from app/: `node --no-maglev ../spikes/daugava-scenario/exp_band.ts`.
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
// the record: per week its mean, and the two ratios
const rec: { mean: number; r10: number; r90: number }[] = [];
for (const y of ["2020", "2021", "2022", "2023", "2024", "2025"]) {
  const lv = year(y).zones.LV as unknown as Record<string, Record<string, number[]>>;
  const e = lv.hydro_weekly_mwh.daugava, a = lv.hydro_weekly_p10_mw.daugava, b = lv.hydro_weekly_p90_mw.daugava;
  for (let w = 0; w < 52; w++) { const m = e[w] / 168; if (m > 20) rec.push({ mean: m, r10: a[w] / m, r90: b[w] / m }); }
}
rec.sort((x, y) => x.mean - y.mean);
const med = (v: number[]) => [...v].sort((x, y) => x - y)[Math.floor(v.length / 2)];
const third = Math.floor(rec.length / 3);
const bins = [0, 1, 2].map((i) => { const s = rec.slice(i * third, i === 2 ? rec.length : (i + 1) * third); return { upTo: s[s.length - 1].mean, r10: med(s.map((x) => x.r10)), r90: med(s.map((x) => x.r90)) }; });
console.log("record's band by the week's mean output:", bins.map((b) => `≤ ${b.upTo.toFixed(0)} MW: P10 ${b.r10.toFixed(2)} × mean, P90 ${b.r90.toFixed(2)} × mean`).join(" | "));
const ratio = (m: number) => bins.find((b) => m <= b.upTo) ?? bins[2];

const s0 = opening(p);
for (const band of [false, true]) {
  for (const id of SCENARIOS) {
    const s = { ...s0, scenario: id };
    const mean = [0, 0, 0];
    let spread = 0;
    for (const r of runsOf(p, s)) {
      const y = year(r.key);
      const pb = build(y, p, L, engineScenario(p, y, s));
      if (band && pb.reservoir) {
        const rv = pb.reservoir;
        for (let w = 0; w < rv.budget.length; w++) {
          const m = rv.budget[w] / Math.min(168, pb.hours - w * 168);
          if (!(m > 0)) continue;
          const k = ratio(m);
          rv.pmax[w] = Math.min(rv.pmax[w], Math.max(m, k.r90 * m));
          rv.pmin[w] = Math.min(m, Math.max(rv.pmin[w], k.r10 * m));
        }
      }
      const res = runLP(pb, solve);
      const sm = summarise(pb, res);
      sm.zones.forEach((z, i) => { mean[i] += r.weight * z.price; });
      const pr = [...res.price[1]].sort((a, b) => a - b);
      spread += r.weight * (pr[Math.floor(pr.length * 0.95)] - pr[Math.floor(pr.length * 0.05)]);
    }
    console.log(`${band ? "with the record's band" : "as built (D-070)     "} ${id.padEnd(5)} ${ZONES.map((z, i) => `${z} ${mean[i].toFixed(1)}`).join("  ")} | LV P95−P5 ${spread.toFixed(0)}`);
  }
}
