// B of the calibration round (docs/research/2026-10-11_calibration_round.md): a scenario's Kruonis
// on the opening view — the four scenarios on their three climate years, weighted, EE / LV / LT, as
// spikes/dear-hours/opening.ts reads them. B0 the installed megawatts (in force); B1 the record's
// power, output and pumping limits at the fit years' median weekly maximum, 0.636 of the full
// output, every hour; B2 the step per megawatt, scaled by the scenario's segment over the replays'
// 106 MW. From app/: `node --no-maglev ../spikes/calibration-round/kruonis.ts [register.json]` — a candidate
// register of A (fit_markup.ts's JSON) in place of the one in force.
import { readFileSync } from "node:fs";
import { build, kruonisSteps, KRUONIS_SEGMENTS } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import type { Problem } from "../../app/src/engine/problem.ts";
import { summarise } from "../../app/src/engine/results.ts";
import { SCENARIOS, engineScenario, opening, runsOf } from "../../app/src/state/model.ts";
import { links, presets, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

export const RECORD_SHARE = 0.636; // 423–424 of 666 MW, the fit years' median weekly maximum
export const REPLAY_SEGMENT = 106; // MW, a quarter of that

const p = presets(), L = links();
const fitted = p.fitted as unknown as { markup: Record<string, { eur_mwh: number[] }>; kruonis_output: { step_eur_mwh: number } };
const given = process.argv[2];
if (given) { // a candidate register of A: its schedule on LV and LT, its step
  const c = JSON.parse(readFileSync(given, "utf8"));
  for (const z of Object.keys(c.zones)) fitted.markup[z].eur_mwh = c.zones[z].eur_mwh;
  fitted.kruonis_output.step_eur_mwh = c.kruonis_step_eur_mwh;
}
const step = fitted.kruonis_output.step_eur_mwh;
const { solve } = await loadSolver();
const kruonis = (pb: Problem) => pb.storage.find((u) => u.name === "kruonis");

const VARIANTS: [string, (pb: Problem) => void][] = [
  ["B0 installed", () => {}],
  ["B1 the record's power", (pb) => {
    const u = kruonis(pb);
    if (!u) return;
    const cap = RECORD_SHARE * u.mw * u.eff;
    u.dischargeMax = new Float64Array(pb.hours).fill(cap);
    u.chargeMax = new Float64Array(pb.hours).fill(cap / u.eff);
  }],
  ["B2 the step per MW", (pb) => {
    const u = kruonis(pb);
    if (u) u.dischargeSteps = kruonisSteps((step * (u.mw * u.eff)) / KRUONIS_SEGMENTS / REPLAY_SEGMENT);
  }],
];
const s0 = opening(p);
const base: number[][] = [];
for (const [name, f] of VARIANTS) {
  const rows = SCENARIOS.map((id, k) => {
    const st = { ...s0, scenario: id };
    const m = [0, 0, 0];
    let mw = 0;
    for (const r of runsOf(p, st)) {
      const y = year(r.key);
      const pb = build(y, p, L, engineScenario(p, y, st));
      f(pb);
      mw = kruonis(pb)?.mw ?? 0;
      summarise(pb, runLP(pb, solve)).zones.forEach((z, i) => { m[i] += r.weight * z.price; });
    }
    if (!base[k]) base[k] = m;
    const d = m.map((x, i) => x - base[k][i]);
    return `${id} (Kruonis ${mw} MW) ${m.map((x) => x.toFixed(2)).join(" / ")} (${d.map((x) => (x >= 0 ? "+" : "") + x.toFixed(2)).join(" / ")})`;
  });
  console.log(`${name}, the step ${step}: ${rows.join(" | ")}`);
}
