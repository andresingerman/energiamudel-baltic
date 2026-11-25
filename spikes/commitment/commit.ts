// Oil shale's market entry, a prototype (the night of 2026-10-11; ERRATA E-139's second fix,
// D-099's next step). Today oil shale is three continuous offers at their cost and entry premium:
// a class runs a few peak hours at its bid and is gone the next, which no unit of the Narva plants
// does. Here the units commit by the day, in two passes:
//   pass 1 clears the problem as built;
//   each oil-shale unit (ENTSO-E A95: Auvere 270; Balti TG11 192, Eesti TG8 194; Eesti TG3, TG4 164
//   and TG5, TG6 173 MW) is committed for a UTC day when pass 1's Estonian price reaches its class's
//   bid in at least its minimum time on (ERAA 2025: 8 h new, 11 h old) and, when it was not on the
//   day before, the day's margin over the bid pays its warm start (ERAA's cost and start fuel at the
//   oil-shale fuel price the bids use);
//   a committed unit runs at least its minimum stable load (ERAA: 0.5) the whole day and offers the
//   rest at its bid; a unit not committed offers nothing that day; the record's weekly least output
//   (D-073), in a replay, stays as the floor beneath;
//   pass 2 clears the committed problem.
// Nothing reads an observed Baltic price (R-BND-3): the decision is the model's own price.
import type { Presets } from "../../app/src/contract/presets.ts";
import { asCleared } from "../../app/src/engine/entry.ts";
import type { Results } from "../../app/src/engine/index.ts";
import type { Fixed, Problem } from "../../app/src/engine/problem.ts";

/** The units of each oil-shale class, MW at nameplate (A95), and ERAA's technology. */
export const UNITS: Record<string, { mw: number[]; tech: "oil_shale_new" | "oil_shale_old" }> = {
  oil_shale_auvere: { mw: [270], tech: "oil_shale_new" },
  oil_shale_cfb: { mw: [192, 194], tech: "oil_shale_new" },
  oil_shale_pf: { mw: [164, 164, 173, 173], tech: "oil_shale_old" },
};

/** `minOn`: on for a day when the price reaches the bid in its minimum time on (and, from off, the
 * day's margin pays a warm start, with `startCost`); `profit`: the day's result as a committed unit
 * — the margin where the price is above its bid, less the loss of its minimum load where it is
 * below — must pay a warm start to come on, and must not lose more than one to stay on. */
export interface CommitOptions {
  startCost: boolean; rule?: "minOn" | "profit" | "stay"; stayHours?: number;
  // a committed unit offers above its minimum load at its cost, the entry premium left to the
  // decision to come on (Eesti Energia's market-entry prices, R-SUP-4, are prices to enter at)
  dispatchAtCost?: boolean;
}

const val = (x: unknown, what: string): number => {
  const v = (x as { value?: number } | undefined)?.value;
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`${what}: missing`);
  return v;
};

/** The problem with Estonia's oil shale committed by the day on `price`, pass 1's Estonian price. */
export function commit(pb: Problem, p: Presets, price: Float64Array, o: CommitOptions): { pb: Problem; stats: Record<string, { days: number; on: number }> } {
  const H = pb.hours;
  const days = Math.ceil(H / 24);
  const ee = pb.zones[0];
  const fuel = val((p as unknown as { fuel_paths: Record<string, Record<string, Record<string, unknown>>> }).fuel_paths.svk_lma_2026["2030"].oil_shale, "oil-shale fuel") / 3.6; // €/GJ
  const offers = ee.offers.map((x) => ({ ...x }));
  const fixed: Fixed[] = ee.fixed.map((f) => ({ ...f }));
  const stats: Record<string, { days: number; on: number }> = {};
  offers.forEach((of, j) => {
    const u = UNITS[of.cls];
    if (!u || of.demand) return;
    const t = (p as unknown as { tech: Record<string, Record<string, unknown>> }).tech[`eraa2025_common|${u.tech}`];
    const minOn = val(t.min_time_on, `${u.tech} min_time_on`);
    const msg = val(t.min_stable_generation, `${u.tech} min_stable_generation`);
    const start = val(t.startup_cost_warm, `${u.tech} startup_cost_warm`) + val(t.startup_fuel_warm, `${u.tech} startup_fuel_warm`) * fuel; // €/MW
    const fi = fixed.findIndex((f) => f.cls === of.cls);
    const floor = fi >= 0 ? fixed[fi].mw : new Float64Array(H);
    const cap = new Float64Array(H);
    for (let h = 0; h < H; h++) cap[h] = of.mw[h] + floor[h];
    const total = u.mw.reduce((a, x) => a + x, 0);
    const on = u.mw.map(() => new Uint8Array(days));
    for (let d = 0; d < days; d++) {
      const h0 = d * 24, h1 = Math.min(H, h0 + 24);
      u.mw.forEach((mw, k) => {
        const share = mw / total;
        let inMoney = 0, margin = 0, loss = 0;
        for (let h = h0; h < h1; h++) {
          if (!(cap[h] > 0)) continue;
          if (price[h] >= of.bid[h] - 0.01) { inMoney++; margin += (price[h] - of.bid[h]) * share * cap[h]; }
          else loss += (of.bid[h] - price[h]) * msg * share * cap[h];
        }
        const was = d > 0 && on[k][d - 1] === 1;
        if (o.rule === "profit") on[k][d] = (was ? margin - loss > -start * mw : margin - loss > start * mw) ? 1 : 0;
        // a unit on stays on while the day has `stayHours` at or above its bid: a campaign, as the
        // record runs them (on for 6–12 days at the median), not a start a day
        else if (o.rule === "stay") on[k][d] = (was ? inMoney >= (o.stayHours ?? 1) : inMoney >= minOn && (!o.startCost || margin >= start * mw)) ? 1 : 0;
        else on[k][d] = inMoney >= minOn && (was || !o.startCost || margin >= start * mw) ? 1 : 0;
      });
    }
    const premium = o.dispatchAtCost ? val((p as unknown as { oil_shale: Record<string, unknown> }).oil_shale[of.cls], `${of.cls} premium`) : 0;
    const bid = Float64Array.from(of.bid);
    const mw = new Float64Array(H), must = new Float64Array(H);
    for (let h = 0; h < H; h++) {
      const d = (h / 24) | 0;
      let c = 0;
      u.mw.forEach((m, k) => { if (on[k][d]) c += (m / total) * cap[h]; });
      const top = Math.max(c, floor[h]);
      const m = Math.min(top, Math.max(floor[h], msg * c));
      must[h] = m;
      mw[h] = top - m;
      if (c > 0) bid[h] = Math.max(0, of.bid[h] - premium);
    }
    offers[j] = { ...of, mw, bid };
    if (fi >= 0) fixed[fi] = { ...fixed[fi], mw: must };
    else fixed.push({ cls: of.cls, mw: must, co2: of.co2 });
    let n = 0;
    on.forEach((a) => a.forEach((x) => { n += x; }));
    stats[of.cls] = { days, on: n };
  });
  const zones = pb.zones.map((z, i) => (i === 0 ? { ...z, offers, fixed } : z));
  return { pb: { ...pb, zones }, stats };
}

/** Two passes: `clear` the problem, commit on its Estonian price, `clear` again; with `rounds` > 1
 * the commitment is decided again on the last pass's price (the price the units' absence made).
 * The results are `pb`'s, the committed minimum load in its class's offer (ERRATA E-141). */
export function twoPass(pb: Problem, p: Presets, clear: (q: Problem) => Results, o: CommitOptions, rounds = 1): Results {
  let r = clear(pb);
  for (let k = 0; k < rounds; k++) {
    const q = commit(pb, p, r.price[0], o).pb;
    r = asCleared(pb, q, clear(q));
  }
  return r;
}
