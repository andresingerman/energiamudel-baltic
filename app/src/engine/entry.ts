// Oil shale's market entry (SPECIFICATION.md R-SUP-4, DECISIONS D-113): the oil-shale classes of
// a zone commit by the UTC day on the first pass's price, as units that start, run and stop do —
// not as offers that run a peak hour at their bid and are gone the next. A class comes on for a
// day when the price reaches its bid in at least ERAA's minimum time on and — when it was off the
// day before — the day's margin over the bid pays a warm start of the megawatts it has available
// that day (D-114: its installed megawatts charged what could not run); on, it runs at
// least ERAA's minimum stable load all day and offers the rest at its bid; off, it offers nothing
// that day. A replay's weekly least output of the record (D-073) stays beneath as must-run. The
// decision reads the model's own price, never an observed Baltic one (R-BND-3); runLP clears the
// committed problem in its second pass. A day that pass clears at the price cap in the entry's zone
// while a class it kept off had megawatts available is committed again with every such class on, and
// its week clears again (ERRATA E-160, D-165): a start for that day, which the next day's decision
// does not inherit.
import type { Results } from "./index.ts";
import type { Fixed, Problem } from "./problem.ts";

const DAY = 24;
const TIE = 0.01; // €/MWh: a price at the class's bid counts as reaching it

/** The problem with the entry's classes committed by the day on `price`, the entry's zone's first
 * pass price, and on each day of `forced` every class with megawatts available, its decision for the
 * next day as the rule makes it (E-160); the result has no entry left, so that it clears in one pass. */
export function commitEntry(pb: Problem, price: Float64Array, forced: ReadonlySet<number> | null = null): Problem {
  const e = pb.entry;
  if (!e) return pb;
  const H = pb.hours;
  const z = pb.zones[e.zone];
  const offers = z.offers.slice();
  const fixed: Fixed[] = z.fixed.slice();
  for (const c of e.classes) {
    const j = offers.findIndex((o) => !o.demand && o.cls === c.cls);
    if (j < 0) continue;
    const of = offers[j];
    const fi = fixed.findIndex((f) => f.cls === c.cls);
    const floor = fi >= 0 ? fixed[fi].mw : null;
    const mw = new Float64Array(H);
    const must = new Float64Array(H);
    let was = false;
    for (let h0 = 0; h0 < H; h0 += DAY) {
      const h1 = Math.min(H, h0 + DAY);
      let inMoney = 0;
      let margin = 0;
      let avail = 0; // the day's highest available hour: what a start brings on
      for (let h = h0; h < h1; h++) {
        const cap = of.mw[h] + (floor ? floor[h] : 0);
        if (cap > avail) avail = cap;
        if (!(cap > 0)) continue;
        if (price[h] >= of.bid[h] - TIE) {
          inMoney++;
          margin += (price[h] - of.bid[h]) * cap;
        }
      }
      const on: boolean = inMoney >= c.minOn && (was || margin >= c.start * avail);
      const run = on || (avail > 0 && (forced?.has(h0 / DAY) ?? false));
      for (let h = h0; h < h1; h++) {
        const f = floor ? floor[h] : 0;
        const cap = of.mw[h] + f;
        const top = run ? cap : f;
        const m = run ? Math.min(top, Math.max(f, c.minLoad * cap)) : f;
        must[h] = m;
        mw[h] = top - m;
      }
      was = on;
    }
    offers[j] = { ...of, mw };
    if (fi >= 0) fixed[fi] = { ...fixed[fi], mw: must };
    else fixed.push({ cls: c.cls, mw: must, co2: of.co2 });
  }
  return { ...pb, zones: pb.zones.map((x, i) => (i === e.zone ? { ...x, offers, fixed } : x)), entry: null };
}

/** `res`, the results of `q` — `pb` committed, its offers in their places and its fixed outputs
 * replaced in place or added after them — as results of `pb`: what `q` holds as fixed output above
 * `pb`'s own goes back into the class's offer, where a caller holding `pb` counts it (ERRATA E-141:
 * the committed minimum load was missing from generation, CO₂ and the zone's balance). */
export function asCleared(pb: Problem, q: Problem, res: Results): Results {
  pb.zones.forEach((z, i) => q.zones[i].fixed.forEach((f, k) => {
    const was = z.fixed[k];
    if (was && f.mw === was.mw) return;
    const j = z.offers.findIndex((o) => !o.demand && o.cls === f.cls);
    if (j < 0) throw new Error(`${f.cls}: committed output without an offer to carry it`);
    const out = res.offers[i][j];
    for (let h = 0; h < pb.hours; h++) out[h] += f.mw[h] - (was ? was.mw[h] : 0);
  }));
  return res;
}
