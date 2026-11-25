// Storage without perfect foresight, a prototype (the night of 2026-10-11; ERRATA E-139's second
// fix, D-099's next step). The engine of record solves each UTC week as one programme: every store
// and the Daugava plan the week with all of its hours known, empty at both ends. Here each day of
// the week is cleared in a window of `window` hours from its start — the day and what follows it
// within the week — and only its first `commit` hours are kept; the stores' energy and the week's
// unused budgets carry to the next day's window. A window's stores end it empty (no value beyond
// what it sees); a weekly budget is shared pro rata over the hours left in the week (`share`), or
// left whole to the window. Nothing reads an observed Baltic price (R-BND-3).
//
// `windowModel` is lp.ts's `weekModel` with that state: the same columns, rows, costs and
// perturbation, the first energy row starting from `e0`, the budget rows holding what the week has
// left. With window = commit = 168 it is the weekly LP (checked by `node --no-maglev spikes/foresight/rolling.ts
// --same`).
import type { Results } from "../../app/src/engine/index.ts";
import type { LpModel, LpSolution, LpSolver } from "../../app/src/engine/lp.ts";
import { WEEK_HOURS, blocks, emptyResults, perturbation } from "../../app/src/engine/lp.ts";
import type { Problem } from "../../app/src/engine/problem.ts";

const PERTURB_HOUR = 1e-4;

export interface Options { window: number; commit: number; share: boolean }

/** What a week has used so far: each store's energy now, its discharge per budget period, the
 * Daugava's release. */
interface State { e0: number[]; used: Map<number, number>[]; released: number }

interface Layout {
  T: number;
  offer: Int32Array[][]; shed: Int32Array[]; spill: Int32Array[]; flow: Int32Array[];
  charge: Int32Array[]; discharge: Int32Array[]; energy: Int32Array[];
  release: Int32Array | null; budgetRow: number; balance: Int32Array[];
}

class Builder {
  cost: number[] = []; lo: number[] = []; hi: number[] = []; rlo: number[] = []; rhi: number[] = [];
  entries: number[] = []; values: number[] = [];
  col(cost: number, lo: number, hi: number): number { this.cost.push(cost); this.lo.push(lo); this.hi.push(hi); return this.cost.length - 1; }
  row(lo: number, hi: number, cols: number[], coefs: number[]): number {
    const r = this.rlo.length;
    this.rlo.push(lo); this.rhi.push(hi);
    for (let k = 0; k < cols.length; k++) { this.entries.push(r, cols[k]); this.values.push(coefs[k]); }
    return r;
  }
  model(): LpModel {
    const n = this.cost.length, nnz = this.values.length;
    const count = new Int32Array(n + 1);
    for (let k = 0; k < nnz; k++) count[this.entries[2 * k + 1] + 1]++;
    for (let j = 0; j < n; j++) count[j + 1] += count[j];
    const starts = Int32Array.from(count), index = new Int32Array(nnz), value = new Float64Array(nnz), next = Int32Array.from(count);
    for (let k = 0; k < nnz; k++) { const j = this.entries[2 * k + 1]; const at = next[j]++; index[at] = this.entries[2 * k]; value[at] = this.values[k]; }
    for (let j = 0; j < n; j++) for (let a = starts[j] + 1; a < starts[j + 1]; a++) {
      const r = index[a], v = value[a];
      let b = a - 1;
      while (b >= starts[j] && index[b] > r) { index[b + 1] = index[b]; value[b + 1] = value[b]; b--; }
      index[b + 1] = r; value[b + 1] = v;
    }
    return { numCols: n, numRows: this.rlo.length, colCost: Float64Array.from(this.cost), colLower: Float64Array.from(this.lo), colUpper: Float64Array.from(this.hi), rowLower: Float64Array.from(this.rlo), rowUpper: Float64Array.from(this.rhi), starts, index, value };
  }
}

/** Hours h0..h1−1, within the week ending at w1, as one programme from the week's state. */
export function windowModel(pb: Problem, h0: number, h1: number, w1: number, st: State, o: Options): { model: LpModel; layout: Layout } {
  const T = h1 - h0;
  const b = new Builder();
  const bal = pb.zones.map(() => Array.from({ length: T }, () => ({ cols: [] as number[], coefs: [] as number[] })));
  const add = (z: number, t: number, c: number, v: number) => { bal[z][t].cols.push(c); bal[z][t].coefs.push(v); };
  const L: Layout = { T, offer: [], shed: [], spill: [], flow: [], charge: [], discharge: [], energy: [], release: null, budgetRow: -1, balance: [] };
  pb.zones.forEach((zone, z) => {
    const per: Int32Array[] = [];
    zone.offers.forEach((of) => {
      const eps = of.demand ? 0 : perturbation(`${z}:${of.name}`);
      const cols = new Int32Array(T).fill(-1);
      for (let t = 0; t < T; t++) {
        const mw = of.mw[h0 + t];
        if (!(mw > 0)) continue;
        const c = b.col(of.demand ? -of.bid[h0 + t] : of.bid[h0 + t] + eps, 0, mw);
        add(z, t, c, of.demand ? -1 : 1);
        cols[t] = c;
      }
      per.push(cols);
      if (of.hoursPerDay > 0) for (let d0 = 0; d0 < T; d0 += 24) {
        const cs: number[] = [], vs: number[] = [];
        for (let t = d0; t < d0 + 24 && t < T; t++) if (cols[t] >= 0) { cs.push(cols[t]); vs.push(1 / of.mw[h0 + t]); }
        if (cs.length) b.row(-Infinity, of.hoursPerDay, cs, vs);
      }
    });
    L.offer.push(per);
    const shed = new Int32Array(T), spill = new Int32Array(T);
    for (let t = 0; t < T; t++) {
      shed[t] = b.col(pb.voll, 0, zone.load[h0 + t]); add(z, t, shed[t], 1);
      spill[t] = b.col(-pb.floor, 0, Infinity); add(z, t, spill[t], -1);
    }
    L.shed.push(shed); L.spill.push(spill);
  });
  pb.links.forEach((link, i) => {
    const f = new Int32Array(T);
    for (let t = 0; t < T; t++) f[t] = b.col(0, -link.rev[h0 + t], link.fwd[h0 + t]);
    for (let t = 0; t < T; t++) { add(i, t, f[t], -1); add(i + 1, t, f[t], 1); }
    L.flow.push(f);
  });
  pb.storage.forEach((u, k) => {
    const eps = perturbation(`${u.zone}:${u.name}`);
    const c = new Int32Array(T), d = new Int32Array(T), e = new Int32Array(T);
    for (let t = 0; t < T; t++) c[t] = b.col(u.delta + eps, 0, u.chargeMax ? Math.min(u.mw, u.chargeMax[h0 + t]) : u.mw);
    for (let t = 0; t < T; t++) d[t] = b.col(T > 1 ? t * (PERTURB_HOUR / (T - 1)) : 0, 0, u.dischargeMax ? Math.min(u.mw * u.eff, u.dischargeMax[h0 + t]) : u.mw * u.eff);
    for (let t = 0; t < T; t++) e[t] = b.col(0, 0, t === T - 1 ? 0 : u.mw * (u.exactHours ?? u.hours));
    for (let t = 0; t < T; t++) {
      const cols = [e[t], c[t], d[t]], vals = [1, -1, 1 / u.eff];
      if (t > 0) { cols.push(e[t - 1]); vals.push(-1); }
      const e0 = t === 0 ? st.e0[k] : 0; // the energy the store holds as the window opens
      b.row(e0, e0, cols, vals);
      add(u.zone, t, d[t], 1); add(u.zone, t, c[t], -1);
    }
    const budget = u.exactBudget ?? u.budget;
    if (budget) {
      const P = u.period;
      for (let p0 = Math.floor(h0 / P) * P; p0 < h1; p0 += P) {
        const cs: number[] = [], vs: number[] = [];
        for (let t = Math.max(p0, h0) - h0; t < Math.min(p0 + P, h1) - h0; t++) { cs.push(d[t]); vs.push(1 / u.eff); }
        const left = budget[p0 / P] * u.mw - (st.used[k].get(p0 / P) ?? 0);
        const end = Math.min(p0 + P, w1);
        // a budget whose period runs past the window: its share of what is left, or all of it
        const cap = p0 + P > h1 && o.share ? left * (Math.min(p0 + P, h1) - Math.max(p0, h0)) / (end - Math.max(p0, h0)) : left;
        b.row(-Infinity, Math.max(0, cap), cs, vs);
      }
    }
    L.charge.push(c); L.discharge.push(d); L.energy.push(e);
  });
  if (pb.reservoir) {
    const r = pb.reservoir;
    const w = Math.floor(h0 / WEEK_HOURS);
    const left = Math.max(0, r.budget[w] - st.released);
    const budget = o.share ? left * T / (w1 - h0) : left;
    const pmax = r.pmax[w];
    const base = Math.min(r.pmin[w], budget / T);
    const rel = new Int32Array(T);
    const cs: number[] = [];
    for (let t = 0; t < T; t++) { rel[t] = b.col(0, Math.min(base, pmax), pmax); cs.push(rel[t]); }
    L.budgetRow = b.row(-Infinity, budget, cs, cs.map(() => 1));
    for (let t = 0; t < T; t++) add(r.zone, t, rel[t], 1);
    L.release = rel;
  }
  pb.zones.forEach((zone, z) => {
    const rows = new Int32Array(T);
    for (let t = 0; t < T; t++) {
      let fixed = 0;
      for (const f of zone.fixed) fixed += f.mw[h0 + t];
      const net = zone.load[h0 + t] - fixed;
      rows[t] = b.row(net, net, bal[z][t].cols, bal[z][t].coefs);
    }
    L.balance.push(rows);
  });
  return { model: b.model(), layout: L };
}

/** Writes the window's first `C` hours and moves the week's state on by them. */
function commitWindow(pb: Problem, h0: number, C: number, L: Layout, sol: LpSolution, out: Results, st: State): void {
  if (!sol.optimal) throw new Error(`window from hour ${h0}: the solver returned ${sol.status}`);
  const x = sol.colValue;
  pb.zones.forEach((_, z) => {
    for (let t = 0; t < C; t++) {
      out.price[z][h0 + t] = sol.rowDual[L.balance[z][t]];
      out.shed[z][h0 + t] = x[L.shed[z][t]];
      out.spill[z][h0 + t] = x[L.spill[z][t]];
    }
    L.offer[z].forEach((cols, j) => { for (let t = 0; t < C; t++) if (cols[t] >= 0) out.offers[z][j][h0 + t] = x[cols[t]]; });
  });
  L.flow.forEach((f, i) => {
    for (let t = 0; t < C; t++) {
      const v = x[f[t]];
      out.flow[i][h0 + t] = v;
      out.sat[i][h0 + t] = v >= pb.links[i].fwd[h0 + t] - 1e-6 || -v >= pb.links[i].rev[h0 + t] - 1e-6 ? 1 : 0;
    }
  });
  pb.storage.forEach((u, k) => {
    for (let t = 0; t < C; t++) {
      out.units[k].charge[h0 + t] = x[L.charge[k][t]];
      const dis = x[L.discharge[k][t]];
      out.units[k].discharge[h0 + t] = dis;
      out.units[k].energy[h0 + t] = x[L.energy[k][t]];
      const p = Math.floor((h0 + t) / u.period);
      st.used[k].set(p, (st.used[k].get(p) ?? 0) + dis / u.eff);
    }
    st.e0[k] = x[L.energy[k][C - 1]];
  });
  if (pb.reservoir && L.release && out.reservoir) {
    for (let t = 0; t < C; t++) { out.reservoir.release[h0 + t] = x[L.release[t]]; st.released += x[L.release[t]]; }
    out.reservoir.value[Math.floor(h0 / WEEK_HOURS)] = -sol.rowDual[L.budgetRow];
  }
}

/** The run cleared day by day, each day in its window, the state carried within each week. */
export function runRolling(pb: Problem, solve: LpSolver, o: Options): Results {
  const out = emptyResults(pb);
  for (const [w0, w1] of blocks(pb.hours)) {
    const st: State = { e0: pb.storage.map(() => 0), used: pb.storage.map(() => new Map()), released: 0 };
    for (let h = w0; h < w1; h += o.commit) {
      const h1 = Math.min(w1, h + o.window);
      const { model, layout } = windowModel(pb, h, h1, w1, st, o);
      commitWindow(pb, h, Math.min(o.commit, w1 - h), layout, solve(model), out, st);
    }
  }
  out.price0 = out.price;
  return out;
}

if (process.argv[1]?.endsWith("rolling.ts")) {
  const { loadSolver } = await import("../../app/scripts/highs.ts");
  const { WEEKLY, runLP } = await import("../../app/src/engine/lp.ts");
  const { score, table, YEARS } = await import("./score.ts");
  const { scenarioFor } = await import("../../app/scripts/validate_fit.ts");
  const { solve } = await loadSolver();
  if (process.argv.includes("--same")) {
    // the weekly window reproduces the engine of record
    for (const yr of YEARS) {
      const { pb } = scenarioFor(yr);
      const a = runLP({ ...pb, entry: null }, solve, WEEKLY), b = runRolling(pb, solve, { window: 168, commit: 168, share: true });
      let m = 0;
      for (let z = 0; z < 3; z++) for (let h = 0; h < pb.hours; h++) m = Math.max(m, Math.abs(a.price[z][h] - b.price[z][h]));
      console.log(yr, "largest price difference against runLP", m.toExponential(2));
    }
  } else {
    const variants: [string, Options][] = [
      ["48/24 shared", { window: 48, commit: 24, share: true }],
      ["48/24 whole", { window: 48, commit: 24, share: false }],
      ["24/24 shared", { window: 24, commit: 24, share: true }],
      ["72/24 shared", { window: 72, commit: 24, share: true }],
    ];
    const out: Record<string, unknown> = {};
    for (const [label, o] of variants) {
      const t0 = performance.now();
      const rows = score((pb) => runRolling(pb, solve, o));
      console.error(table(rows, label), `\n  (${((performance.now() - t0) / 1000).toFixed(1)} s for ${YEARS.length} years)`);
      out[label] = rows;
    }
    console.log(JSON.stringify(out, null, 1));
  }
}
