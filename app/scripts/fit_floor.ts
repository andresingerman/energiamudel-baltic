// The heat-driven must-run of R-SUP-5 as the record reveals it (docs/methodology.md §7.1; DECISIONS
// D-042): what a technology generated in the hours of the fit years 2023 and 2024 whose observed
// zone price was below its cheapest bid — output the market did not pay for, so output that ran for
// another reason (heat, a committed unit's minimum load) —
//
//     floor(T) = max(0, a + b · max(0, T_ref − T))        [MW]
//
// the average of that output per 1 °C bin of the zone's temperature (bins of at least 50 hours), a
// least-squares line through the bins weighted by their hours, a and b floored at 0, and T_ref the
// candidate threshold with the least squared error. The bids are the engine's own (build.ts,
// before the floor, the gas at a combined-cycle plant's bare cost, D-164), so the fit needs the export; observed prices and output come
// from the validation files only and from the fit years only (R-VAL-1, R-BND-3).
// `node --no-maglev scripts/fit_floor.ts` prints the fits as JSON; validate/fit.py records them (R-PROV-4).
import { build, CHP_TECH } from "../src/engine/build.ts";
import type { ZoneCode } from "../src/engine/problem.ts";
import { ZONES } from "../src/engine/problem.ts";
import { replay } from "../src/state/scenario.ts";
import { presets, validation, year } from "./data.ts";
import { FIT_YEARS } from "../src/worker/metrics.ts";

/** Gas and biomass CHP of R-SUP-5; Estonian gas is engines without a heat signal, and Estonian oil
 * shale's must-run is its record's week by week (D-073, D-109). */
export const SERIES: Record<ZoneCode, ("gas" | "biomass")[]> = { EE: ["biomass"], LV: ["gas", "biomass"], LT: ["gas", "biomass"] };
const T_REF_GRID = [8, 10, 12, 15]; // candidate heating thresholds, °C
const MIN_HOURS = 50; // per 1 °C bin

export interface Point { t: number; mw: number }
export interface FloorFit { t_ref_c: number; a_mw: number; b_mw_per_k: number; bins: number; hours: number }

/** The line through the bins' averages for one threshold, and its weighted squared error. */
export function fitAt(points: Point[], tRef: number): FloorFit & { sse: number } {
  const bins = new Map<number, { n: number; mw: number; hdh: number }>();
  for (const p of points) {
    const k = Math.floor(p.t);
    const b = bins.get(k) ?? { n: 0, mw: 0, hdh: 0 };
    b.n++;
    b.mw += p.mw;
    b.hdh += p.t < tRef ? tRef - p.t : 0;
    bins.set(k, b);
  }
  const use = [...bins.values()].filter((b) => b.n >= MIN_HOURS);
  let W = 0, mx = 0, my = 0;
  for (const b of use) { W += b.n; mx += b.hdh; my += b.mw; }
  if (!(W > 0)) throw new Error("no temperature bin with enough hours");
  mx /= W;
  my /= W;
  let sxy = 0, sxx = 0;
  for (const b of use) { sxy += b.n * (b.hdh / b.n - mx) * (b.mw / b.n - my); sxx += b.n * (b.hdh / b.n - mx) ** 2; }
  const slope = sxx > 0 && sxy > 0 ? sxy / sxx : 0;
  const a = Math.max(0, my - slope * mx);
  let sse = 0;
  for (const b of use) sse += b.n * (b.mw / b.n - a - slope * (b.hdh / b.n)) ** 2;
  return { t_ref_c: tRef, a_mw: Math.round(a * 100) / 100, b_mw_per_k: Math.round(slope * 1000) / 1000, bins: use.length, hours: points.length, sse };
}

/** The threshold with the least squared error; ties go to the lower threshold. */
export function fit(points: Point[]): FloorFit {
  let best: (FloorFit & { sse: number }) | null = null;
  for (const t of T_REF_GRID) {
    const f = fitAt(points, t);
    if (!best || f.sse < best.sse - 1e-9) best = f;
  }
  const { sse: _sse, ...out } = best!;
  return out;
}

if (process.argv[1]?.endsWith("fit_floor.ts")) {
  const p = presets();
  const below: Record<string, Point[]> = {};
  const all: Record<string, Point[]> = {};
  for (const yr of FIT_YEARS) {
    const y = year(String(yr));
    const v = validation(String(yr));
    const pb = build(y, p, null, { ...replay(p, y), chpFloor: false, gasAdder: 0 });
    ZONES.forEach((z, zi) => {
      const T = y.zones[z].temperature_c;
      if (!T) throw new Error(`${yr} ${z}: no temperature`);
      for (const tech of SERIES[z]) {
        const group = pb.zones[zi].offers.filter((o) => !o.demand && CHP_TECH[o.cls] === tech);
        const g = v.gen[z]?.[tech];
        if (!g || !group.length) throw new Error(`${yr} ${z} ${tech}: no observed output or no class`);
        const key = `${z}.${tech}`;
        below[key] ??= [];
        all[key] ??= [];
        for (let h = 0; h < pb.hours; h++) {
          all[key].push({ t: T[h], mw: g[h] });
          let bid = -Infinity;
          for (const o of group) if (o.mw[h] > 0 && (bid === -Infinity || o.bid[h] < bid)) bid = o.bid[h];
          // a week in which the technology never ran offers nothing and has no bid: not counted
          if (v.price[z][h] < bid) below[key].push({ t: T[h], mw: g[h] });
        }
      }
    });
  }
  const out: Record<string, Record<string, FloorFit & { share_above_floor: number; hours_all: number }>> = {};
  for (const [key, pts] of Object.entries(below)) {
    const [z, tech] = key.split(".");
    const f = fit(pts);
    let above = 0;
    for (const q of all[key]) if (q.mw >= f.a_mw + f.b_mw_per_k * (q.t < f.t_ref_c ? f.t_ref_c - q.t : 0)) above++;
    (out[z] ??= {})[tech] = { ...f, share_above_floor: Math.round((1e4 * above) / all[key].length) / 1e4, hours_all: all[key].length };
  }
  console.log(JSON.stringify({ years: FIT_YEARS, fits: out }));
}
