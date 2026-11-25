// A year's weeks shared by several workers (R-ENG-7, D-114). Within one clearing of the engine of
// record the weeks are independent — each starts from a fresh state and its windows end in it — so
// a run of contiguous weeks can be cleared apart from the others and the parts put back together,
// bit for bit what `runLP` gives. Oil shale's entry (D-113) decides each day on that day's price and
// the day before, forward through the year, so with an entry the first clearing is shared, its price
// of the entry's zone joined, and each part of the second cleared on that price up to its own end
// (D-128).
import { asCleared, commitEntry } from "./entry.ts";
import type { Results } from "./index.ts";
import { DAY_AHEAD, WEEK_HOURS, blocks, clearWeek, emptyResults, sameWeek } from "./lp.ts";
import type { LpSolver, Recommit, WeekSource } from "./lp.ts";
import type { Problem } from "./problem.ts";

/** A run of weeks cleared on its own: its hours' slices of every hourly result, its weeks' water
 * values, each week's Daugava spill and water left (summed by `assemble` in week order, as `runLP`
 * sums them), whether its weeks ran a class of the entry (`Results.entryRan`), and the days of a second
 * clearing it committed again (E-160). */
export interface Part {
  h0: number;
  h1: number;
  price: Float64Array[];
  shed: Float64Array[];
  spill: Float64Array[];
  flow: Float64Array[];
  sat: Uint8Array[];
  offers: Float64Array[][];
  units: { charge: Float64Array; discharge: Float64Array; energy: Float64Array }[];
  reservoir: { release: Float64Array; value: Float64Array; spilled: number[]; left: number[] } | null;
  entryRan: Uint8Array;
  forced: number[];
}

/** The run's weekly blocks in `n` contiguous runs of hours, as even as possible, the longer first;
 * a run past the last week is empty. */
export function chunks(hours: number, n: number): [number, number][] {
  const weeks = blocks(hours);
  const out: [number, number][] = [];
  let w = 0;
  for (let k = 0; k < n; k++) {
    const take = Math.floor(weeks.length / n) + (k < weeks.length % n ? 1 : 0);
    const h0 = w < weeks.length ? weeks[w][0] : hours;
    w += take;
    out.push([h0, take ? weeks[w - 1][1] : h0]);
  }
  return out;
}

/** Part k of n of one clearing of `pb`: its weeks as `runLP` clears them — a week `reuse` gives a source
 * for taken from it (D-130), a week `fix` finds at the cap committed again (E-160). */
export function clearPart(pb: Problem, solve: LpSolver, k: number, n: number,
  reuse: ((h0: number, h1: number) => WeekSource | null) | null = null, fix: Recommit | null = null): Part {
  const [h0, h1] = chunks(pb.hours, n)[k];
  const out = emptyResults(pb);
  const spilled: number[] = [];
  const left: number[] = [];
  let weeks = 0;
  for (let h = h0; h < h1; h += WEEK_HOURS) {
    // the week's own spill and water left, from zero, as the year's sums take them one by one
    if (out.reservoir) out.reservoir.spilled = out.reservoir.leftMwh = 0;
    const end = Math.min(h1, h + WEEK_HOURS);
    clearWeek(pb, solve, h, end, out, DAY_AHEAD, reuse, fix);
    if (out.reservoir) { spilled.push(out.reservoir.spilled); left.push(out.reservoir.leftMwh); }
    weeks++;
  }
  const w0 = Math.floor(h0 / WEEK_HOURS);
  const s = <T extends Float64Array | Uint8Array>(a: T) => a.slice(h0, h1) as T;
  return {
    h0, h1,
    price: out.price.map(s), shed: out.shed.map(s), spill: out.spill.map(s), flow: out.flow.map(s), sat: out.sat.map(s),
    offers: out.offers.map((z) => z.map(s)),
    units: out.units.map((u) => ({ charge: s(u.charge), discharge: s(u.discharge), energy: s(u.energy) })),
    reservoir: out.reservoir ? {
      release: s(out.reservoir.release),
      value: out.reservoir.value.slice(w0, w0 + weeks),
      spilled, left,
    } : null,
    entryRan: out.entryRan.slice(w0, w0 + weeks),
    forced: fix ? fix.days : [],
  };
}

/** A part's hours as a source for another clearing's weeks (D-130). */
export const fromPart = (p: Part): WeekSource => ({ at: p.h0, price: p.price, shed: p.shed, spill: p.spill, flow: p.flow, sat: p.sat,
  offers: p.offers, units: p.units, release: p.reservoir?.release ?? null, value: (w) => p.reservoir!.value[w - Math.floor(p.h0 / WEEK_HOURS)],
  entryRan: (w) => p.entryRan[w - Math.floor(p.h0 / WEEK_HOURS)] });

/** Part k of n of the second clearing, given the first's price of the entry's zone up to the part's
 * end at least: the commitment decides each day on that day's price and the day before, and a part
 * reads only its own weeks, so the rest of the year — zero here — does not reach it (D-128). Given the
 * first clearing's part k, a week the commitment leaves as the first had it is the first's (D-130). */
export function secondPart(pb: Problem, solve: LpSolver, k: number, n: number, price: Float64Array, first: Part | null = null): Part {
  const full = new Float64Array(pb.hours);
  full.set(price);
  const q = commitEntry(pb, full);
  // a part another worker cleared must be of this problem (the day's report of 2026-10-18, §5)
  if (first && first.units.length !== q.storage.length) {
    throw new Error(`the first clearing's part has ${first.units.length} stores, the problem ${q.storage.map((u) => u.name).join(", ")}`);
  }
  const src = first ? fromPart(first) : null;
  return clearPart(q, solve, k, n, src ? (h0, h1) => (sameWeek(pb, q, src, h0, h1) ? src : null) : null, { pb, price: full, days: [] });
}

/** The run's results from its parts, as one clearing of `pb` gives them. */
export function assemble(pb: Problem, parts: Part[]): Results {
  const out = emptyResults(pb);
  const ordered = [...parts].sort((a, b) => a.h0 - b.h0);
  for (const p of ordered) {
    const put = <T extends Float64Array | Uint8Array>(into: T[], from: T[]) => from.forEach((a, i) => into[i].set(a, p.h0));
    put(out.price, p.price);
    put(out.shed, p.shed);
    put(out.spill, p.spill);
    put(out.flow, p.flow);
    put(out.sat, p.sat);
    p.offers.forEach((z, i) => put(out.offers[i], z));
    p.units.forEach((u, i) => {
      out.units[i].charge.set(u.charge, p.h0);
      out.units[i].discharge.set(u.discharge, p.h0);
      out.units[i].energy.set(u.energy, p.h0);
    });
    if (out.reservoir && p.reservoir) {
      out.reservoir.release.set(p.reservoir.release, p.h0);
      out.reservoir.value.set(p.reservoir.value, Math.floor(p.h0 / WEEK_HOURS));
      for (const x of p.reservoir.spilled) out.reservoir.spilled += x;
      for (const x of p.reservoir.left) out.reservoir.leftMwh += x;
    }
    out.entryRan.set(p.entryRan, Math.floor(p.h0 / WEEK_HOURS));
  }
  return out;
}

/** The entry's zone's price of the whole run from the first clearing's parts. */
export function joinPrice(hours: number, parts: { h0: number; price: Float64Array }[]): Float64Array {
  const out = new Float64Array(hours);
  for (const p of parts) out.set(p.price, p.h0);
  return out;
}

/** The run's results from its last clearing's parts, as `runLP` returns them: `pb`'s own, or — given
 * the first clearing's price of the entry's zone — those of `pb` committed on it, with the days its
 * parts committed again (E-160), its committed minimum load in its class's offer (ERRATA E-141). */
export function fromParts(pb: Problem, parts: Part[], price: Float64Array | null): Results {
  if (!price) return assemble(pb, parts);
  const days = parts.flatMap((p) => p.forced);
  const q = commitEntry(pb, price, days.length ? new Set(days) : null);
  return asCleared(pb, q, assemble(q, parts));
}

/** `runLP` with each clearing in `n` parts, on one thread: what the workers do between them, each
 * part of the second on the first's price up to its own end only, as `runYear` sends it (D-128). */
export function runSplit(pb: Problem, solve: LpSolver, n: number): Results {
  const first = Array.from({ length: n }, (_, k) => clearPart(pb, solve, k, n));
  if (!pb.entry) return fromParts(pb, first, null);
  const z = pb.entry.zone;
  const price = joinPrice(pb.hours, first.map((p) => ({ h0: p.h0, price: p.price[z] })));
  return fromParts(pb, first.map((p, k) => secondPart(pb, solve, k, n, price.subarray(0, p.h1), p)), price);
}
