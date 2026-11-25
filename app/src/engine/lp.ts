// The engine of record (SPECIFICATION.md R-ENG-8, R-ENG-9, revision 1.4; DECISIONS D-021, D-112):
// the problem build.ts makes as linear programmes, UTC week by UTC week, each day of a week in a
// window of the hours that follow it (`Horizon`: the day and the next by default, D-112, where D-021
// saw the whole week). Variables: every offer's quantity in every hour, load shed at VOLL and fixed
// output spilled at the floor, the two internal flows,
// each storage unit's charge, discharge and energy (empty at the week's start and at a window's
// end, its discharge budget per period), the Daugava's release (its weekly budget, minimum flow,
// turbine limit), and the DSR hours per day. A day's window starts from the energy the stores hold
// and the budgets the week has left; a budget whose period runs past the window, and the Daugava's,
// gives the window its share of what is left by hours. The zone-hour balance's dual is the price. Variables and rows come in the order of reference/lp.py,
// with the same perturbation (R-ENG-9): supply offers and charging cost crc32(zone:name) mod 1 000
// × 10⁻⁶ €/MWh more, discharging 10⁻⁴ €/MWh more at a window's end than at its start. The solver
// is passed in (R-ENG-1): HiGHS compiled to WebAssembly in the browser and in Node.

import { asCleared, commitEntry } from "./entry.ts";
import type { Results, UnitResult } from "./index.ts";
import type { Problem } from "./problem.ts";
import { WEEK_HOURS } from "./problem.ts";

/** One week's programme: minimise colCost·x subject to rowLower ≤ Ax ≤ rowUpper and the column
 * bounds; A in compressed sparse columns. */
export interface LpModel {
  numCols: number;
  numRows: number;
  colCost: Float64Array;
  colLower: Float64Array;
  colUpper: Float64Array;
  rowLower: Float64Array;
  rowUpper: Float64Array;
  starts: Int32Array; // numCols + 1
  index: Int32Array; // row of each entry
  value: Float64Array;
}

export interface LpSolution {
  optimal: boolean;
  status: string;
  colValue: Float64Array;
  rowDual: Float64Array;
}

export type LpSolver = (m: LpModel) => LpSolution;

export { WEEK_HOURS };

/** How far the engine of record sees (D-112): each day of a week is cleared over `lookahead` hours
 * from its start, within the week, and its first `commit` hours are kept. */
export interface Horizon { lookahead: number; commit: number }
/** The whole week at once (D-021). */
export const WEEKLY: Horizon = { lookahead: WEEK_HOURS, commit: WEEK_HOURS };
/** The day and the next, the day kept (D-112): the engine of record's. */
export const DAY_AHEAD: Horizon = { lookahead: 48, commit: 24 };

/** What a week has used before a window: each store's energy, its discharge per budget period
 * (period number → MWh of stored energy), the Daugava's release. */
export interface WeekState { e0: number[]; used: Map<number, number>[]; released: number }
export const freshWeek = (pb: Problem): WeekState => ({ e0: pb.storage.map(() => 0), used: pb.storage.map(() => new Map()), released: 0 });
const PERTURB_STEP = 1e-6;
const PERTURB_BUCKETS = 1000;
const PERTURB_HOUR = 1e-4;

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

/** CRC-32 of the UTF-8 bytes of `s`, as zlib.crc32 computes it. */
export function crc32(s: string): number {
  const bytes = new TextEncoder().encode(s);
  let c = -1;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

export const perturbation = (name: string): number => (crc32(name) % PERTURB_BUCKETS) * PERTURB_STEP;
/** €/MWh: an offer's perturbation stays below this. */
export const PERTURB_MAX = PERTURB_BUCKETS * PERTURB_STEP;

/** What each column and balance row of a week stands for, to read the solution back. */
interface Layout {
  h0: number;
  T: number;
  offer: Int32Array[][]; // zone → offer → hour → column (−1: none)
  shed: Int32Array[]; // zone → hour → column
  spill: Int32Array[];
  flow: Int32Array[]; // link → hour → column
  charge: Int32Array[]; // unit → hour → column
  discharge: Int32Array[];
  energy: Int32Array[];
  release: Int32Array | null; // hour → column
  budgetRow: number[]; // Daugava: the week's budget row
  balance: Int32Array[]; // zone → hour → row
}

class Builder {
  cost: number[] = [];
  lo: number[] = [];
  hi: number[] = [];
  rlo: number[] = [];
  rhi: number[] = [];
  entries: number[] = []; // (row, col) pairs interleaved; values separately
  values: number[] = [];

  col(cost: number, lo: number, hi: number): number {
    this.cost.push(cost);
    this.lo.push(lo);
    this.hi.push(hi);
    return this.cost.length - 1;
  }

  row(lo: number, hi: number, cols: number[], coefs: number[]): number {
    const r = this.rlo.length;
    this.rlo.push(lo);
    this.rhi.push(hi);
    for (let k = 0; k < cols.length; k++) {
      this.entries.push(r, cols[k]);
      this.values.push(coefs[k]);
    }
    return r;
  }

  model(): LpModel {
    const n = this.cost.length;
    const nnz = this.values.length;
    // compressed sparse columns, rows in order within a column (reference/lp.py sorts the same):
    // rows are numbered as they are made and an entry goes after its column's earlier ones
    const count = new Int32Array(n + 1);
    for (let k = 0; k < nnz; k++) count[this.entries[2 * k + 1] + 1]++;
    for (let j = 0; j < n; j++) count[j + 1] += count[j];
    const starts = Int32Array.from(count);
    const index = new Int32Array(nnz);
    const value = new Float64Array(nnz);
    const next = Int32Array.from(count);
    for (let k = 0; k < nnz; k++) {
      const j = this.entries[2 * k + 1];
      const at = next[j]++;
      index[at] = this.entries[2 * k];
      value[at] = this.values[k];
    }
    return {
      numCols: n, numRows: this.rlo.length,
      colCost: Float64Array.from(this.cost), colLower: Float64Array.from(this.lo), colUpper: Float64Array.from(this.hi),
      rowLower: Float64Array.from(this.rlo), rowUpper: Float64Array.from(this.rhi),
      starts, index, value,
    };
  }
}

/** Hours h0..h1−1 of the problem as one programme, within the week that ends at w1, from the
 * week's state before h0. h0 starts a day (a week, with the defaults). */
export function weekModel(pb: Problem, h0: number, h1: number, w1: number, st: WeekState): { model: LpModel; layout: Layout } {
  const T = h1 - h0;
  const Z = pb.zones.length;
  const b = new Builder();
  const bal: { cols: number[]; coefs: number[] }[][] = pb.zones.map(() => Array.from({ length: T }, () => ({ cols: [] as number[], coefs: [] as number[] })));
  const add = (z: number, t: number, c: number, v: number) => {
    bal[z][t].cols.push(c);
    bal[z][t].coefs.push(v);
  };
  const layout: Layout = {
    h0, T, offer: [], shed: [], spill: [], flow: [], charge: [], discharge: [], energy: [],
    release: null, budgetRow: [], balance: [],
  };
  pb.zones.forEach((zone, z) => {
    const per: Int32Array[] = [];
    zone.offers.forEach((o) => {
      const eps = o.demand ? 0 : perturbation(`${z}:${o.name}`);
      const cols = new Int32Array(T).fill(-1);
      for (let t = 0; t < T; t++) {
        const mw = o.mw[h0 + t];
        if (!(mw > 0)) continue;
        const c = b.col(o.demand ? -o.bid[h0 + t] : o.bid[h0 + t] + eps, 0, mw);
        add(z, t, c, o.demand ? -1 : 1);
        cols[t] = c;
      }
      per.push(cols);
      if (o.hoursPerDay > 0) {
        for (let d0 = 0; d0 < T; d0 += 24) {
          const cs: number[] = [];
          const vs: number[] = [];
          for (let t = d0; t < d0 + 24 && t < T; t++) {
            if (cols[t] < 0) continue;
            cs.push(cols[t]);
            vs.push(1 / o.mw[h0 + t]);
          }
          if (cs.length) b.row(-Infinity, o.hoursPerDay, cs, vs);
        }
      }
    });
    layout.offer.push(per);
    const shed = new Int32Array(T);
    const spill = new Int32Array(T);
    for (let t = 0; t < T; t++) {
      shed[t] = b.col(pb.voll, 0, zone.load[h0 + t]);
      add(z, t, shed[t], 1);
      spill[t] = b.col(-pb.floor, 0, Infinity);
      add(z, t, spill[t], -1);
    }
    layout.shed.push(shed);
    layout.spill.push(spill);
  });
  pb.links.forEach((link, i) => {
    const f = new Int32Array(T);
    for (let t = 0; t < T; t++) f[t] = b.col(0, -link.rev[h0 + t], link.fwd[h0 + t]);
    for (let t = 0; t < T; t++) {
      add(i, t, f[t], -1);
      add(i + 1, t, f[t], 1);
    }
    layout.flow.push(f);
  });
  pb.storage.forEach((u, k) => {
    const eps = perturbation(`${u.zone}:${u.name}`);
    // the discharge in K equal segments of the hour's power, segment j at its step (one without)
    const steps = u.dischargeSteps?.length ? u.dischargeSteps : [0];
    const K = steps.length;
    const c = new Int32Array(T);
    const d = new Int32Array(T * K); // hour t's segment j: d[t * K + j]
    const e = new Int32Array(T);
    for (let t = 0; t < T; t++) c[t] = b.col(u.delta + eps, 0, u.chargeMax ? Math.min(u.mw, u.chargeMax[h0 + t]) : u.mw);
    for (let t = 0; t < T; t++) {
      const cap = (u.dischargeMax ? Math.min(u.mw * u.eff, u.dischargeMax[h0 + t]) : u.mw * u.eff) / K;
      for (let j = 0; j < K; j++) d[t * K + j] = b.col((T > 1 ? t * (PERTURB_HOUR / (T - 1)) : 0) + steps[j], 0, cap);
    }
    for (let t = 0; t < T; t++) e[t] = b.col(0, 0, t === T - 1 ? 0 : u.mw * u.hours);
    for (let t = 0; t < T; t++) {
      const cols = [e[t], c[t]];
      const vals = [1, -1];
      for (let j = 0; j < K; j++) {
        cols.push(d[t * K + j]);
        vals.push(1 / u.eff);
      }
      if (t > 0) {
        cols.push(e[t - 1]);
        vals.push(-1);
      }
      const e0 = t === 0 ? st.e0[k] : 0; // the energy the store holds as the window opens
      b.row(e0, e0, cols, vals);
      for (let j = 0; j < K; j++) add(u.zone, t, d[t * K + j], 1);
      add(u.zone, t, c[t], -1);
    }
    const budget = u.budget;
    if (budget) {
      const P = u.period;
      for (let p0 = Math.floor(h0 / P) * P; p0 < h1; p0 += P) {
        const a = Math.max(p0, h0) - h0;
        const z = Math.min(p0 + P, h1) - h0;
        const cs: number[] = [];
        const vs: number[] = [];
        for (let t = a; t < z; t++) {
          for (let j = 0; j < K; j++) {
            cs.push(d[t * K + j]);
            vs.push(1 / u.eff);
          }
        }
        // what the period has left; one that runs past the window gives it its share by hours
        const left = budget[p0 / P] * u.mw - (st.used[k].get(p0 / P) ?? 0);
        const rest = Math.min(p0 + P, w1) - h0 - a;
        b.row(-Infinity, Math.max(0, z - a < rest ? (left * (z - a)) / rest : left), cs, vs);
      }
    }
    layout.charge.push(c);
    layout.discharge.push(d);
    layout.energy.push(e);
  });
  if (pb.reservoir) {
    // the week's budget less what it released, the window's share of it by hours
    const r = pb.reservoir;
    const rel = new Int32Array(T);
    const w = Math.floor(h0 / WEEK_HOURS);
    const left = Math.max(0, r.budget[w] - st.released);
    const budget = T < w1 - h0 ? (left * T) / (w1 - h0) : left;
    const pmax = r.pmax[w];
    const base = Math.min(r.pmin[w], budget / T);
    const cs: number[] = [];
    for (let t = 0; t < T; t++) {
      rel[t] = b.col(0, Math.min(base, pmax), pmax);
      cs.push(rel[t]);
    }
    layout.budgetRow.push(b.row(-Infinity, budget, cs, cs.map(() => 1)));
    for (let t = 0; t < T; t++) add(r.zone, t, rel[t], 1);
    layout.release = rel;
  }
  for (let z = 0; z < Z; z++) {
    const rows = new Int32Array(T);
    const zone = pb.zones[z];
    for (let t = 0; t < T; t++) {
      let fixed = 0;
      for (const f of zone.fixed) fixed += f.mw[h0 + t];
      const net = zone.load[h0 + t] - fixed;
      rows[t] = b.row(net, net, bal[z][t].cols, bal[z][t].coefs);
    }
    layout.balance.push(rows);
  }
  return { model: b.model(), layout };
}

/** The weekly blocks of a run: 168 hours from its first hour, the last one shorter. */
export function blocks(H: number): [number, number][] {
  const out: [number, number][] = [];
  for (let h = 0; h < H; h += WEEK_HOURS) out.push([h, Math.min(H, h + WEEK_HOURS)]);
  return out;
}

/** An empty result of the problem's shape, to be filled week by week. */
export function emptyResults(pb: Problem): Results {
  const H = pb.hours;
  return {
    hours: H,
    price: pb.zones.map(() => new Float64Array(H)),
    shed: pb.zones.map(() => new Float64Array(H)),
    spill: pb.zones.map(() => new Float64Array(H)),
    flow: pb.links.map(() => new Float64Array(H)),
    sat: pb.links.map(() => new Uint8Array(H)),
    offers: pb.zones.map((z) => z.offers.map(() => new Float64Array(H))),
    units: pb.storage.map((u): UnitResult => ({
      name: u.name, zone: u.zone,
      charge: new Float64Array(H), discharge: new Float64Array(H), energy: new Float64Array(H), endMwh: 0,
    })),
    reservoir: pb.reservoir ? { release: new Float64Array(H), value: new Float64Array(Math.ceil(H / WEEK_HOURS)), spilled: 0, leftMwh: 0 } : null,
    entryRan: new Uint8Array(Math.ceil(H / WEEK_HOURS)),
  };
}

/** Writes a solved window's first C hours into the results and moves the week's state on by them. */
export function readWeek(pb: Problem, layout: Layout, sol: LpSolution, out: Results, C: number, st: WeekState): void {
  const { h0 } = layout;
  const T = C;
  if (!sol.optimal) throw new Error(`window from hour ${h0}: the solver returned ${sol.status}`);
  const x = sol.colValue;
  for (let z = 0; z < pb.zones.length; z++) {
    for (let t = 0; t < T; t++) {
      out.price[z][h0 + t] = sol.rowDual[layout.balance[z][t]];
      out.shed[z][h0 + t] = x[layout.shed[z][t]];
      out.spill[z][h0 + t] = x[layout.spill[z][t]];
    }
    layout.offer[z].forEach((cols, j) => {
      for (let t = 0; t < T; t++) if (cols[t] >= 0) out.offers[z][j][h0 + t] = x[cols[t]];
    });
  }
  layout.flow.forEach((f, i) => {
    for (let t = 0; t < T; t++) {
      const v = x[f[t]];
      out.flow[i][h0 + t] = v;
      out.sat[i][h0 + t] = v >= pb.links[i].fwd[h0 + t] - 1e-6 || -v >= pb.links[i].rev[h0 + t] - 1e-6 ? 1 : 0;
    }
  });
  pb.storage.forEach((u, k) => {
    for (let t = 0; t < T; t++) {
      out.units[k].charge[h0 + t] = x[layout.charge[k][t]];
      const K = u.dischargeSteps?.length || 1; // an empty list is no steps, as in weekModel
      let d = x[layout.discharge[k][t * K]];
      for (let j = 1; j < K; j++) d += x[layout.discharge[k][t * K + j]];
      out.units[k].discharge[h0 + t] = d;
      out.units[k].energy[h0 + t] = x[layout.energy[k][t]];
      const p = Math.floor((h0 + t) / u.period);
      st.used[k].set(p, (st.used[k].get(p) ?? 0) + d / u.eff);
    }
    st.e0[k] = x[layout.energy[k][T - 1]];
  });
  if (pb.reservoir && layout.release && out.reservoir) {
    for (let t = 0; t < T; t++) {
      out.reservoir.release[h0 + t] = x[layout.release[t]];
      st.released += x[layout.release[t]];
    }
    // the water value, €/MWh: the week's first window's
    if (h0 % WEEK_HOURS === 0) out.reservoir.value[h0 / WEEK_HOURS] = -sol.rowDual[layout.budgetRow[0]];
  }
}

/** One week of the run, h0..h1−1, day by day as `horizon` sees it, into the results; the Daugava's
 * spill (what its turbines cannot pass) and what it left unreleased are the week's. */
export function runWeek(pb: Problem, solve: LpSolver, h0: number, h1: number, out: Results, horizon: Horizon = DAY_AHEAD): void {
  const st = freshWeek(pb);
  for (let h = h0; h < h1; h += horizon.commit) {
    const { model, layout } = weekModel(pb, h, Math.min(h1, h + horizon.lookahead), h1, st);
    const sol = solve(model);
    if (entryRan(pb, layout, sol)) out.entryRan[Math.floor(h0 / WEEK_HOURS)] = 1;
    readWeek(pb, layout, sol, out, Math.min(horizon.commit, h1 - h), st);
  }
  weekWater(pb, out, h0, h1, st.released);
}

/** Whether a window's solution runs a class of the entry at any of its hours, those it keeps and
 * those it only looks ahead to (`sameWeek`). */
function entryRan(pb: Problem, layout: Layout, sol: LpSolution): boolean {
  const e = pb.entry;
  if (!e) return false;
  for (const c of e.classes) {
    const j = pb.zones[e.zone].offers.findIndex((o) => !o.demand && o.cls === c.cls);
    if (j < 0) continue;
    for (const col of layout.offer[e.zone][j]) if (col >= 0 && sol.colValue[col] !== 0) return true;
  }
  return false;
}

/** The Daugava's spill in the week h0..h1−1 — what its turbines cannot pass — and the water it left
 * unreleased, added to the run's. */
function weekWater(pb: Problem, out: Results, h0: number, h1: number, released: number): void {
  if (!pb.reservoir || !out.reservoir) return;
  const w = Math.floor(h0 / WEEK_HOURS);
  const budget = pb.reservoir.budget[w];
  const room = pb.reservoir.pmax[w] * (h1 - h0);
  const spilled = budget > room ? budget - room : 0;
  out.reservoir.spilled += spilled;
  const left = budget - spilled - released;
  if (left > 1e-6) out.reservoir.leftMwh += left;
}

/** A clearing's hours from `at` on — a run's results from 0, a part's from its first hour — as a week
 * of another clearing may take them (D-130). */
export interface WeekSource {
  at: number;
  price: Float64Array[]; shed: Float64Array[]; spill: Float64Array[]; flow: Float64Array[]; sat: Uint8Array[];
  offers: Float64Array[][];
  units: { charge: Float64Array; discharge: Float64Array; energy: Float64Array }[];
  release: Float64Array | null;
  value: (week: number) => number; // the Daugava's water value of a week
  entryRan: (week: number) => number; // 1: an entry class ran in a window of the week (`Results.entryRan`)
}

export const fromResults = (r: Results): WeekSource => ({ at: 0, price: r.price, shed: r.shed, spill: r.spill, flow: r.flow, sat: r.sat,
  offers: r.offers, units: r.units, release: r.reservoir?.release ?? null, value: (w) => r.reservoir!.value[w], entryRan: (w) => r.entryRan[w] });

/** The source's week h0..h1−1 into the results as `runWeek` writes a week: its hours' figures, its water
 * value, the Daugava's spill and the water it left, the release summed in the order runWeek sums it. */
export function copyWeek(pb: Problem, src: WeekSource, out: Results, h0: number, h1: number): void {
  const a = h0 - src.at, b = h1 - src.at;
  const put = <T extends Float64Array | Uint8Array>(into: T[], from: T[]) => from.forEach((x, i) => into[i].set(x.subarray(a, b), h0));
  put(out.price, src.price);
  put(out.shed, src.shed);
  put(out.spill, src.spill);
  put(out.flow, src.flow);
  put(out.sat, src.sat);
  src.offers.forEach((z, i) => put(out.offers[i], z));
  src.units.forEach((u, k) => {
    out.units[k].charge.set(u.charge.subarray(a, b), h0);
    out.units[k].discharge.set(u.discharge.subarray(a, b), h0);
    out.units[k].energy.set(u.energy.subarray(a, b), h0);
  });
  let released = 0;
  if (out.reservoir && src.release) {
    out.reservoir.release.set(src.release.subarray(a, b), h0);
    if (h0 % WEEK_HOURS === 0) out.reservoir.value[h0 / WEEK_HOURS] = src.value(h0 / WEEK_HOURS);
    for (let h = h0; h < h1; h++) released += out.reservoir.release[h];
  }
  weekWater(pb, out, h0, h1, released);
}

/** Whether the committed problem `q`'s week h0..h1−1 may be the first clearing's (D-130, D-131): the
 * commitment keeps every class of `pb`'s entry off all week — nothing offered, its must-run what the
 * problem's own floor was — and no window of the first clearing's week ran any of them, at an hour it
 * kept or one it only looked ahead to. Each window's programme then differs from the first's by those
 * classes' columns alone, at zero in the first's solution, which is so one of its optima. */
export function sameWeek(pb: Problem, q: Problem, first: WeekSource, h0: number, h1: number): boolean {
  const e = pb.entry;
  if (!e || first.entryRan(Math.floor(h0 / WEEK_HOURS))) return false;
  const z = e.zone;
  for (const c of e.classes) {
    const j = pb.zones[z].offers.findIndex((o) => !o.demand && o.cls === c.cls);
    if (j < 0) continue;
    const mw = q.zones[z].offers[j].mw;
    const must = q.zones[z].fixed.find((f) => f.cls === c.cls)?.mw;
    const floor = pb.zones[z].fixed.find((f) => f.cls === c.cls)?.mw;
    for (let h = h0; h < h1; h++) {
      if (mw[h] !== 0) return false;
      if (must && must[h] !== (floor ? floor[h] : 0)) return false;
    }
  }
  return true;
}

/** The second pass's mend of the commitment (ERRATA E-160, D-165): `pb` with its entry, the first
 * clearing's price of the entry's zone the commitment reads, and the days it forced on so far. */
export interface Recommit { pb: Problem; price: Float64Array; days: number[] }

/** The days of h0..h1−1 on which the committed `q` clears the entry's zone at the price cap while it
 * keeps a class of `pb`'s entry off — nothing offered all day — that had megawatts available (E-160). */
export function capDays(pb: Problem, q: Problem, out: Results, h0: number, h1: number): number[] {
  const e = pb.entry;
  if (!e) return [];
  const z = e.zone;
  const days: number[] = [];
  for (let d0 = h0; d0 < h1; d0 += 24) {
    const d1 = Math.min(h1, d0 + 24);
    let cap = false;
    for (let h = d0; h < d1 && !cap; h++) cap = out.price[z][h] >= pb.voll - 1e-6;
    if (!cap) continue;
    const off = e.classes.some((c) => {
      const j = pb.zones[z].offers.findIndex((o) => !o.demand && o.cls === c.cls);
      if (j < 0) return false;
      const avail = pb.zones[z].offers[j].mw, kept = q.zones[z].offers[j].mw;
      let had = false;
      for (let h = d0; h < d1; h++) {
        if (kept[h] > 0) return false;
        if (avail[h] > 0) had = true;
      }
      return had;
    });
    if (off) days.push(d0 / 24);
  }
  return days;
}

/** One week of a clearing into the results: taken from the source `reuse` gives (D-130), or cleared; with
 * `fix`, while the week's committed problem clears the entry's zone at the cap on a day it kept an
 * available class off, the week clears again with every such class on for those days, from the water sums
 * the clearing had before it (E-160). */
export function clearWeek(q: Problem, solve: LpSolver, h0: number, h1: number, out: Results, horizon: Horizon,
  reuse: ((h0: number, h1: number) => WeekSource | null) | null, fix: Recommit | null): void {
  const water = out.reservoir ? [out.reservoir.spilled, out.reservoir.leftMwh] : null;
  const src = reuse?.(h0, h1);
  if (src) copyWeek(q, src, out, h0, h1);
  else runWeek(q, solve, h0, h1, out, horizon);
  if (!fix) return;
  const forced: number[] = [];
  // each pass forces at least one day it had not, so a week clears again at most seven times — a day
  // forced already is not forced again, should a class's minimum load leave it nothing to offer (E-163)
  const fresh = (p: Problem) => capDays(fix.pb, p, out, h0, h1).filter((d) => !forced.includes(d));
  for (let p = q, days = fresh(p); days.length; days = fresh(p)) {
    forced.push(...days);
    if (out.reservoir && water) [out.reservoir.spilled, out.reservoir.leftMwh] = water;
    for (const z of out.offers) for (const o of z) o.fill(0, h0, h1); // runWeek leaves an hour without a column
    p = commitEntry(fix.pb, fix.price, new Set(forced));
    runWeek(p, solve, h0, h1, out, horizon);
  }
  fix.days.push(...forced);
}

/** The engine of record over the whole run, week by week on one thread, each week day by day as
 * `horizon` sees it (the day and the next, D-112; `WEEKLY` the whole week at once, D-021); with
 * oil shale's market entry (D-113) in two passes: the first decides which classes run each day, and
 * the results are `pb`'s, the committed minimum load in its class's offer (ERRATA E-141); a day the
 * second clears at the cap with an available class kept off comes on, and its week clears again (E-160). */
export function runLP(pb: Problem, solve: LpSolver, horizon: Horizon = DAY_AHEAD): Results {
  if (!pb.entry) return clearRun(pb, solve, horizon);
  const first = clearRun(pb, solve, horizon);
  const price = first.price[pb.entry.zone];
  const q = commitEntry(pb, price);
  // a week whose commitment changes nothing the first clearing used is the first's (D-130, D-131)
  const src = fromResults(first);
  const fix: Recommit = { pb, price, days: [] };
  const r = clearRun(q, solve, horizon, (h0, h1) => sameWeek(pb, q, src, h0, h1) ? src : null, fix);
  return asCleared(pb, fix.days.length ? commitEntry(pb, price, new Set(fix.days)) : q, r);
}

function clearRun(pb: Problem, solve: LpSolver, horizon: Horizon, reuse: ((h0: number, h1: number) => WeekSource | null) | null = null,
  fix: Recommit | null = null): Results {
  const out = emptyResults(pb);
  for (const [h0, h1] of blocks(pb.hours)) clearWeek(pb, solve, h0, h1, out, horizon, reuse, fix);
  return out;
}
