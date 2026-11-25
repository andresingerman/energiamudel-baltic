// Can the two-pass preview be corrected (ERRATA E-040, DECISIONS D-026)? The Daugava's price
// response from K pass-one clearings instead of two, and every storage unit planned in N slices,
// each slice against the prices the earlier slices leave (same direction per unit and hour), the
// plan-based prices as the charging ceilings. `node --no-maglev spikes/preview-fix/fix.ts` prints each case's
// Estonian annual mean and mean absolute hourly difference against the engine of record.
// Disposable: not held to the repository's standards (AGENTS.md §3).
import { clearYear } from "../../app/src/engine/index.ts";
import { base, top, WEEK } from "../../app/src/engine/hydro.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import type { Problem } from "../../app/src/engine/problem.ts";
import { match, schedule } from "../../app/src/engine/storage.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { make } from "../../app/scripts/runs.ts";

function releaseAt(lambda: number, p: number[], lv: number[]): number {
  if (lambda >= p[0]) return lv[0];
  const K = p.length;
  if (lambda <= p[K - 1]) return lv[K - 1];
  for (let k = 0; k + 1 < K; k++) {
    if (p[k] >= lambda && lambda >= p[k + 1]) return p[k] === p[k + 1] ? lv[k + 1] : lv[k] + ((lv[k + 1] - lv[k]) * (p[k] - lambda)) / (p[k] - p[k + 1]);
  }
  return lv[K - 1];
}
function priceAt(x: number, p: number[], lv: number[]): number {
  if (x <= lv[0]) return p[0];
  for (let k = 0; k + 1 < p.length; k++) if (x <= lv[k + 1]) return lv[k + 1] === lv[k] ? p[k + 1] : p[k] + ((p[k + 1] - p[k]) * (x - lv[k])) / (lv[k + 1] - lv[k]);
  return p[p.length - 1];
}

function passOne(pb: Problem, K: number) {
  const H = pb.hours, res = pb.reservoir!;
  const b = base(res, H), t = top(res, H);
  const levels: Float64Array[] = [], prices: Float64Array[][] = [];
  for (let k = 0; k < K; k++) {
    const x = new Float64Array(H);
    for (let h = 0; h < H; h++) x[h] = b[h] + ((t[h] - b[h]) * k) / (K - 1);
    levels.push(x);
    prices.push(clearYear(pb, pb.zones.map((_, i) => (i === res.zone ? x : null)), null).price);
  }
  const col = (h: number, z: number) => { const p: number[] = [], lv: number[] = []; let run = Infinity; for (let k = 0; k < K; k++) { run = Math.min(run, prices[k][z][h]); p.push(run); lv.push(levels[k][h]); } return { p, lv }; };
  const sched = new Float64Array(H);
  const value = new Float64Array(Math.ceil(H / WEEK));
  for (let w = 0; w * WEEK < H; w++) {
    const h0 = w * WEEK, h1 = Math.min(H, h0 + WEEK);
    const cols = Array.from({ length: h1 - h0 }, (_, i) => col(h0 + i, res.zone));
    const total = (l: number) => cols.reduce((s, c) => s + releaseAt(l, c.p, c.lv), 0);
    let lo = pb.floor, hi = pb.voll;
    if (total(pb.voll) >= res.budget[w]) lo = hi = pb.voll;
    else if (total(pb.floor) <= res.budget[w]) lo = hi = pb.floor;
    else for (let it = 0; it < 60; it++) { const mid = (lo + hi) / 2; if (total(mid) > res.budget[w]) lo = mid; else hi = mid; }
    value[w] = hi;
    const tLo = total(lo), tHi = total(hi);
    const theta = tLo > tHi && res.budget[w] > tHi ? Math.min(1, (res.budget[w] - tHi) / (tLo - tHi)) : 0;
    cols.forEach((c, i) => { const a = releaseAt(hi, c.p, c.lv); sched[h0 + i] = a + theta * (releaseAt(lo, c.p, c.lv) - a); });
  }
  const p0 = pb.zones.map((_, z) => { const o = new Float64Array(H); for (let h = 0; h < H; h++) { const c = col(h, z); o[h] = priceAt(sched[h], c.p, c.lv); } return o; });
  return { p0, plan: { base: b, sched, value, spilled: 0 } };
}

function preview(pb0: Problem, K: number, N: number) {
  const pb: Problem = { ...pb0, storage: pb0.storage.flatMap((u) => Array.from({ length: N }, (_, i) => ({ ...u, name: `${u.name}#${i}`, mw: u.mw / N }))) };
  const H = pb.hours, res = pb.reservoir!;
  const { p0, plan } = passOne(pb, K);
  const inj = pb.zones.map(() => new Float64Array(H));
  for (let h = 0; h < H; h++) inj[res.zone][h] += plan.sched[h];
  let p = p0;
  const steps: Int8Array[] = new Array(pb.storage.length);
  const dir = pb0.storage.map(() => new Int8Array(H));
  for (let r = 0; r < N; r++) {
    pb.storage.forEach((u, k) => {
      if (k % N !== r) return;
      const st = schedule(p[u.zone], u);
      const d = dir[(k / N) | 0];
      for (let h = 0; h < H; h++) { if (d[h] !== 0 && st[h] === -d[h]) st[h] = 0; else if (st[h] !== 0) d[h] = st[h]; }
      steps[k] = st;
      for (let h = 0; h < H; h++) { if (st[h] === -1) inj[u.zone][h] += u.mw * u.eff; else if (st[h] === 1) inj[u.zone][h] -= u.mw; }
    });
    p = clearYear(pb, inj, null).price;
  }
  return clearYear(pb, null, { steps, matched: steps.map(match), pDis: pb.storage.map((u) => p[u.zone]), plan });
}

const { solve } = await loadSolver();
const mean = (x: Float64Array) => x.reduce((s, v) => s + v, 0) / x.length;
for (const key of ["2024", "2025", "cy2009", "cy1995"]) {
  const pb = make(key);
  const rec = runLP(pb, solve);
  const row = [[2, 1], [5, 1], [5, 6]].map(([K, N]) => {
    const t0 = performance.now();
    const a = preview(pb, K, N);
    const ms = performance.now() - t0;
    let d = 0;
    for (let h = 0; h < pb.hours; h++) d += Math.abs(a.price[0][h] - rec.price[0][h]);
    return `K${K} N${N}: ${mean(a.price[0]).toFixed(1)}, |Δ| ${(d / pb.hours).toFixed(1)} (${ms.toFixed(0)} ms)`;
  });
  console.log(`${key}: record ${mean(rec.price[0]).toFixed(1)} | ${row.join(" | ")}`);
}
