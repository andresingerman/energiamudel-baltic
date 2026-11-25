// A of the calibration round (docs/research/2026-10-11_calibration_round.md): a candidate register
// — fit_markup.ts's JSON, its schedule on LV and LT and its step, Δ the register's — scored on the
// replays 2020–2026 as validate_fit.ts scores them (MAE, average bias, duration-curve RMSE, the
// share of hours ≥ 150, R-VAL-5's breaches), and its folds crossed: each fit year's own schedule
// on the other year, MAE + |average bias| and MAE summed over the three zones. From app/:
// `node --no-maglev ../spikes/calibration-round/score.ts <candidate.json>`; JSON on stdout.
import { readFileSync } from "node:fs";
import type { PerZone } from "../../app/src/engine/build.ts";
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { evaluate } from "../../app/scripts/validate_fit.ts";

const c = JSON.parse(readFileSync(process.argv[2], "utf8")) as {
  zones: Record<string, { eur_mwh: number[] }>; kruonis_step_eur_mwh: number; folds: { year: number; eur_mwh: number[] }[];
};
const p = presets();
const { solve } = await loadSolver();
const onLvLt = (m: number[]) => Object.fromEntries(ZONES.map((z) => [z, z === "EE" ? m.map(() => 0) : m])) as PerZone<number[]>;

function score(yr: number, m: number[]) {
  const y = year(String(yr));
  const pb = build(y, p, null, { ...replay(p, y), markup: onLvLt(m), kruonisStep: c.kruonis_step_eur_mwh });
  const e = evaluate(yr, pb, runLP(pb, solve), validation(String(yr)), { FI: y.boundary.FI.observed, SE4: y.boundary.SE4.observed, PL: y.boundary.PL.observed });
  const zones = Object.fromEntries(ZONES.map((z) => {
    const s = e.zones[z];
    return [z, { mae: s.mae, bias: s.bias, dur: s.durationRmse, short150: 100 * (s.share150.observed - s.share150.model) }];
  }));
  const sum = (f: (z: { mae: number; bias: number; dur: number }) => number) => ZONES.reduce((a, z) => a + f(zones[z]), 0);
  return { year: yr, zones, mae: sum((z) => z.mae), absBias: sum((z) => Math.abs(z.bias)), dur: sum((z) => z.dur), breaches: e.failures };
}

const m = c.zones.LV.eur_mwh;
const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026].map((yr) => score(yr, m));
const crossed = c.folds.map((f) => {
  const other = c.folds.find((g) => g.year !== f.year)!.year;
  const s = score(other, f.eur_mwh);
  return { fold: f.year, on: other, mae: s.mae, maePlusAbsBias: s.mae + s.absBias };
});
const fit = years.filter((s) => s.year === 2023 || s.year === 2024);
console.log(JSON.stringify({
  schedule: m, step: c.kruonis_step_eur_mwh,
  fit: { mae: fit.reduce((a, s) => a + s.mae, 0), absBias: fit.reduce((a, s) => a + s.absBias, 0), breaches: fit.map((s) => s.breaches.length) },
  crossed: { mae: crossed.reduce((a, s) => a + s.mae, 0), maePlusAbsBias: crossed.reduce((a, s) => a + s.maePlusAbsBias, 0), folds: crossed },
  years,
}));
