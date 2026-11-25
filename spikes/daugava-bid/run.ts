// The Daugava at a bid of 0 (the owner, 2026-10-24: "look into whether we can set the Daugava's bid to 0").
// In the programme the cascade's release already costs nothing (lp.ts, the release columns); what the
// Presentation page shows as its bid is its water value, the dual of the week's water budget. A bid of 0 in
// every hour, as a price-taker, is a cascade that does not move its water: the week's water released evenly
// over its hours ("flat"). This runs both on the four scenarios of 2035 (the opening state, the climate years
// weighted as the page weighs them) and on the replays 2023–2025 (R-VAL-5's metrics), and reads the record:
// how far the cascade's observed output follows Latvia's price within a week.
// From app/: `node --no-maglev ../spikes/daugava-bid/run.ts`. Writes spikes/daugava-bid/result.json.
import { writeFileSync } from "node:fs";
import { build, monthOfHour } from "../../app/src/engine/build.ts";
import { account } from "../../app/src/engine/contract.ts";
import type { Results } from "../../app/src/engine/index.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import type { Problem } from "../../app/src/engine/problem.ts";
import { SCENARIOS, engineScenario, opening, runsOf } from "../../app/src/state/model.ts";
import { view } from "../../app/src/worker/view.ts";
import { links, presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { evaluate, scenarioFor } from "../../app/scripts/validate_fit.ts";

const WEEK = 168;
const p = presets(), L = links(), { solve } = await loadSolver();
const s0 = opening(p);

/** The cascade as a price-taker: each week's water released evenly over its hours, at most its turbines'
 * megawatts (what they cannot pass spills, as the engine spills it). */
function flat(pb: Problem): Problem {
  const r = pb.reservoir;
  if (!r) return pb;
  const mw = new Float64Array(pb.hours);
  for (let w = 0; w * WEEK < pb.hours; w++) {
    const h0 = w * WEEK, h1 = Math.min(pb.hours, h0 + WEEK);
    mw.fill(Math.min(r.pmax[w], r.budget[w] / (h1 - h0)), h0, h1);
  }
  const zones = pb.zones.map((z, i) => (i === r.zone ? { ...z, fixed: [...z.fixed, { cls: "hydro_daugava", mw, co2: 0 }] } : z));
  return { ...pb, zones, reservoir: null };
}

/** Half way: a share `a` of each week's water released evenly, the rest moved by its value within the same
 * band, so that the cascade moves less water to the dear hours than the engine moves it. */
function part(a: number) {
  return (pb: Problem): Problem => {
    const r = pb.reservoir;
    if (!r) return pb;
    const mw = new Float64Array(pb.hours);
    const budget = new Float64Array(r.budget.length), pmax = new Float64Array(r.pmax.length), pmin = new Float64Array(r.pmin.length);
    for (let w = 0; w * WEEK < pb.hours; w++) {
      const h0 = w * WEEK, h1 = Math.min(pb.hours, h0 + WEEK);
      const even = a * Math.min(r.pmax[w], r.budget[w] / (h1 - h0));
      mw.fill(even, h0, h1);
      budget[w] = Math.max(0, r.budget[w] - even * (h1 - h0));
      pmax[w] = Math.max(0, r.pmax[w] - even);
      pmin[w] = Math.max(0, Math.min(pmax[w], r.pmin[w] - even));
    }
    const zones = pb.zones.map((z, i) => (i === r.zone ? { ...z, fixed: [...z.fixed, { cls: "hydro_daugava", mw, co2: 0 }] } : z));
    return { ...pb, zones, reservoir: { ...r, budget, pmax, pmin } };
  };
}

/** The share of the year's weeks whose water value is below 1 €/MWh — water to spare, the cascade at its
 * bid of 0 — and the hours' average output. */
function water(pb: Problem, r: Results) {
  const v = r.reservoir?.value ?? new Float64Array(0);
  let low = 0;
  for (const x of v) if (x < 1) low++;
  let mwh = 0;
  for (const x of r.reservoir?.release ?? []) mwh += x;
  return { lowWeeks: v.length ? low / v.length : null, meanValue: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, avgMw: mwh / pb.hours };
}

/** Within each week, the output in its dearest quarter of hours against its cheapest, by the price given. */
function shaping(g: ArrayLike<number>, pr: ArrayLike<number>) {
  let dear = 0, cheap = 0, n = 0;
  for (let h0 = 0; h0 + WEEK <= g.length; h0 += WEEK) {
    const idx = Array.from({ length: WEEK }, (_, i) => h0 + i).filter((h) => Number.isFinite(g[h]) && Number.isFinite(pr[h]));
    if (idx.length < WEEK * 0.9) continue;
    idx.sort((a, b) => pr[a] - pr[b]);
    const q = Math.floor(idx.length / 4);
    dear += idx.slice(-q).reduce((s, h) => s + g[h], 0) / q;
    cheap += idx.slice(0, q).reduce((s, h) => s + g[h], 0) / q;
    n++;
  }
  return { dearQuarterMw: dear / n, cheapQuarterMw: cheap / n, ratio: dear / cheap, weeks: n };
}

const out: Record<string, unknown> = {};
const f = (x: number | null, d = 1) => (x === null ? "–" : x.toFixed(d));

// ---- 2035: the four scenarios of the opening state, each climate year weighted as the page weighs it
const scen: Record<string, Record<string, Record<string, number | null>>> = { asIs: {}, half: {}, flat: {} };
for (const [name, tf] of [["asIs", (x: Problem) => x], ["half", part(0.5)], ["flat", flat]] as const) {
  for (const id of SCENARIOS) {
    const st = { ...s0, scenario: id };
    const acc = { EE: 0, LV: 0, LT: 0, cfd: 0, capNum: 0, out: 0, value: 0, lowWeeks: 0, eeTop: 0 };
    let plant = false;
    for (const run of runsOf(p, st)) {
      const y = year(run.key);
      const pb = tf(build(y, p, L, engineScenario(p, y, st)));
      const res = runLP(pb, solve);
      const v = view(pb, res, [{}, {}, {}], monthOfHour(pb.hours, 2009, false), null);
      acc.EE += run.weight * v.zones[0].mean; acc.LV += run.weight * v.zones[1].mean; acc.LT += run.weight * v.zones[2].mean;
      // Estonia's dearest 5 % of hours: where a cascade that moves its water earns its keep
      const ee = Float64Array.from(v.zones[0].price).sort().reverse();
      const k = Math.round(0.05 * ee.length);
      acc.eeTop += run.weight * ee.subarray(0, k).reduce((a, b) => a + b, 0) / k;
      const w = water(pb, res);
      acc.value += run.weight * (w.meanValue ?? 0); acc.lowWeeks += run.weight * (w.lowWeeks ?? 0);
      if (v.plant) {
        const a = account(v.zones[0].price, v.plant.mw, v.plant.month, st.smr.strike, "hourly", st.smr.clause);
        plant = true;
        acc.capNum += run.weight * a.captureEurMwh * a.outputTwh; acc.out += run.weight * a.outputTwh; acc.cfd += run.weight * a.stateMeur;
      }
    }
    scen[name][id] = { EE: acc.EE, LV: acc.LV, LT: acc.LT, eeTop5: acc.eeTop, capture: plant ? acc.capNum / acc.out : null,
      cfdMeur: plant ? acc.cfd : null, waterValue: name === "asIs" ? acc.value : null, lowWeeks: name === "asIs" ? acc.lowWeeks : null };
    const x = scen[name][id];
    console.log(`2035 ${name.padEnd(4)} ${id}: EE/LV/LT ${f(x.EE)}/${f(x.LV)}/${f(x.LT)} | EE top 5 % ${f(x.eeTop5)} | capture ${f(x.capture)} | CfD ${f(x.cfdMeur, 0)} M€` +
      (name === "asIs" ? ` | water value ${f(x.waterValue)} €/MWh, weeks below 1: ${f(100 * (x.lowWeeks ?? 0), 0)} %` : ""));
  }
}
out.scenarios2035 = scen;

// ---- the replays: R-VAL-5's metrics with the cascade as it is and flat
const rep: Record<string, Record<string, unknown>> = {};
for (const yr of [2023, 2024, 2025]) {
  rep[yr] = {};
  for (const [name, tf] of [["asIs", (x: Problem) => x], ["half", part(0.5)], ["flat", flat]] as const) {
    const { pb, boundary } = scenarioFor(yr);
    const q = tf(pb);
    const r = runLP(q, solve);
    const e = evaluate(yr, q, r, validation(String(yr)), boundary);
    const zs = Object.fromEntries(Object.entries(e.zones).map(([z, m]) => [z, { mae: m.mae, rmse: m.durationRmse, share150: m.share150.model }]));
    let cap = 0;
    for (const z of r.price) for (const x of z) if (x >= q.voll - 1e-6) cap++;
    // the cascade's whole output, its even part and what the programme moved
    const even = q.zones[1].fixed.find((x) => x.cls === "hydro_daugava")?.mw;
    const total = r.reservoir ? Float64Array.from(r.reservoir.release, (x, h) => x + (even ? even[h] : 0)) : null;
    rep[yr][name] = { zones: zs, breaches: e.failures.length, failures: e.failures, capZoneHours: cap,
      shaping: total ? shaping(total, r.price[1]) : null };
    const sh = rep[yr][name] as { shaping: ReturnType<typeof shaping> | null };
    console.log(`${yr} ${name.padEnd(4)}: MAE ${Object.values(zs).map((m) => m.mae.toFixed(2)).join(" / ")} | DC-RMSE ${Object.values(zs).map((m) => m.rmse.toFixed(1)).join(" / ")} | ≥150 ${Object.values(zs).map((m) => (100 * m.share150).toFixed(1)).join(" / ")} % | breaches ${e.failures.length} | zone-hours at the cap ${cap}` +
      (sh.shaping ? ` | the cascade ×${sh.shaping.ratio.toFixed(2)} (${sh.shaping.dearQuarterMw.toFixed(0)} / ${sh.shaping.cheapQuarterMw.toFixed(0)} MW)` : ""));
  }
}
out.replays = rep;

// ---- the record: does the cascade follow Latvia's price within a week?
const rec: Record<string, unknown> = {};
for (const yr of [2023, 2024, 2025]) {
  const v = validation(String(yr)) as unknown as { price: Record<string, number[]>; gen: Record<string, Record<string, number[]>> };
  const g = v.gen.LV.hydro_ror, pr = v.price.LV;
  rec[yr] = shaping(g, pr);
  const { dearQuarterMw: dear, cheapQuarterMw: cheap } = rec[yr] as ReturnType<typeof shaping>;
  console.log(`record ${yr}: the Daugava in a week's dearest quarter of hours ${dear.toFixed(0)} MW, cheapest ${cheap.toFixed(0)} MW (×${(dear / cheap).toFixed(2)})`);
}
out.record = rec;

writeFileSync(new URL("./result.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
