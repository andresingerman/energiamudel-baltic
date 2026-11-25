// The dear hours on the register in force (docs/research/2026-10-11_dear_hours.md, Phase 1).
// Per replay year and zone, each zone's hours chosen by its own price:
// - the bias by bins of the observed price and by bins of the model's own price (mean, median);
// - the duration curves' upper quantiles and the shares at or above 150 and 250 €/MWh;
// - the record's dearest hours the model also has among its dearest, the same day within ±1 h;
// - the artefact of choosing hours by the record: a model calibrated on its own price (the
//   record = the model + its residuals drawn within the model's price deciles, demeaned) binned
//   on that synthetic record, and the bias left once the model's prices are mapped by rank onto
//   the record's (what remains is timing and noise, what goes is level);
// - the regime, the record's and the model's: the zone's price at FI's, SE4's or PL's (the
//   boundary profiles, ±0.5 €/MWh) or above, between or below them;
// - what sets the model's price: an offer part-loaded (marginal()), else a store part-loaded
//   against the hour's own limits (chargeMax, dischargeMax: setter.ts tested them against
//   nameplate), the Daugava inside its band, shedding.
// From app/: `node --no-maglev ../spikes/dear-hours/tail.ts [years…] [--json]` (default 2023 2024 2025).
import type { Results } from "../../app/src/engine/index.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import type { Problem } from "../../app/src/engine/problem.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { marginal } from "../../app/src/worker/view.ts";
import { validation } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { scenarioFor } from "../../app/scripts/validate_fit.ts";

export const EDGES = [-1e9, 0, 10, 30, 60, 100, 150, 250, 1e9];
const Q = [0.9, 0.95, 0.975, 0.99, 0.995];
const BOUNDARY = ["FI", "SE4", "PL"];
const TOL = 0.005;

const r1 = (x: number) => Math.round(x * 10) / 10;
const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
const median = (a: number[]) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
export function quantile(sorted: ArrayLike<number>, q: number): number {
  const x = q * (sorted.length - 1), i = Math.floor(x), f = x - i;
  return i + 1 < sorted.length ? sorted[i] * (1 - f) + sorted[i + 1] * f : sorted[i];
}
// a small fixed-seed generator, so the artefact's draw is the same on every run
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const binOf = (x: number) => { for (let b = 0; b + 1 < EDGES.length; b++) if (x > EDGES[b] && x <= EDGES[b + 1]) return b; return -1; };
const label = (b: number) => `(${EDGES[b] < -1e8 ? "−∞" : EDGES[b]}, ${EDGES[b + 1] > 1e8 ? "∞" : EDGES[b + 1]}]`;

/** The zone's regime in an hour: at a boundary zone's price, or above, between or below them. */
export function regime(p: number, b: Record<string, number>): string {
  for (const k of BOUNDARY) if (Math.abs(p - b[k]) <= 0.5) return `=${k}`;
  const xs = BOUNDARY.map((k) => b[k]);
  return p > Math.max(...xs) + 0.5 ? "above all" : p < Math.min(...xs) - 0.5 ? "below all" : "between";
}

/** What sets zone z's model price in hour h. */
export function setter(pb: Problem, r: Results, z: number, h: number): string {
  const m = marginal(pb, r, z, h);
  if (m) {
    if (m.cls === "import" || m.cls === "export") return m.name;
    const t = /:t(\d)$/.exec(m.name);
    return t ? `${m.cls}:t${t[1]}` : m.cls;
  }
  const p = r.price[z][h];
  const near = pb.zones.map((_, y) => Math.abs(r.price[y][h] - p) < TOL);
  const parts: string[] = [];
  pb.storage.forEach((u, j) => {
    if (!near[u.zone]) return;
    const c = r.units[j].charge[h], d = r.units[j].discharge[h];
    const cMax = u.chargeMax ? Math.min(u.mw, u.chargeMax[h]) : u.mw;
    const dMax = u.dischargeMax ? Math.min(u.mw * u.eff, u.dischargeMax[h]) : u.mw * u.eff;
    if (c > 1 && c < cMax - 1) parts.push(`${u.name} charging`);
    if (d > 1 && d < dMax - 1) parts.push(`${u.name} discharging`);
  });
  if (r.reservoir && pb.reservoir && near[pb.reservoir.zone]) {
    const w = (h / 168) | 0, x = r.reservoir.release[h];
    if (x > pb.reservoir.pmin[w] + 1 && x < pb.reservoir.pmax[w] - 1) parts.push("daugava");
  }
  if (r.shed.some((s, y) => near[y] && s[h] > 1e-3)) parts.push("shedding");
  return parts.length ? parts.join("+") : "other (at a bound)";
}

export interface ZoneTail {
  zone: string;
  byObserved: { bin: string; n: number; mean: number; median: number }[];
  byModel: { bin: string; n: number; mean: number; median: number }[];
  quantiles: { q: number; model: number; record: number }[];
  share150: [number, number]; share250: [number, number];
  overlap: { n: number; sameHour: number; withinHour: number }[];
  artefact: { bin: string; actual: number; calibrated: number; mapped: number; ci: [number, number] }[];
  regimes: Record<string, Record<string, Record<string, { n: number; bias: number }>>>;
  setters: Record<string, Record<string, { n: number; model: number; record: number }>>;
}

export function tail(yr: number, pb: Problem, r: Results, boundary: Record<string, number[]>): ZoneTail[] {
  const v = validation(String(yr));
  const H = pb.hours;
  return ZONES.map((zone, z) => {
    const o = v.price[zone], m = Array.from(r.price[z].subarray(0, H));
    const bins = (sel: (h: number) => number) => {
      const acc: number[][] = EDGES.slice(1).map(() => []);
      for (let h = 0; h < H; h++) { const b = binOf(sel(h)); if (b >= 0) acc[b].push(m[h] - o[h]); }
      return acc.map((a, b) => ({ bin: label(b), n: a.length, mean: r1(mean(a)), median: r1(median(a)) }));
    };
    const so = Float64Array.from(o).sort(), sm = Float64Array.from(m).sort();
    const share = (t: number, a: ArrayLike<number>) => { let n = 0; for (let h = 0; h < H; h++) if (a[h] >= t) n++; return n; };
    // the record's N dearest hours and the model's
    const overlap = [150, 250].map((t) => {
      const n = share(t, o);
      const top = (a: ArrayLike<number>) => new Set(Array.from({ length: H }, (_, h) => h).sort((x, y) => a[y] - a[x]).slice(0, n));
      const to = top(o), tm = top(m);
      let same = 0, near = 0;
      for (const h of to) { if (tm.has(h)) same++; if (tm.has(h) || tm.has(h - 1) || tm.has(h + 1)) near++; }
      return { n, sameHour: same, withinHour: near };
    });
    // the model's prices mapped onto the record's distribution by rank
    const order = Array.from({ length: H }, (_, h) => h).sort((x, y) => m[x] - m[y]);
    const mapped = new Float64Array(H);
    order.forEach((h, k) => { mapped[h] = so[k]; });
    // a calibrated model: the record replaced by the model + residuals drawn within the model's deciles
    const dec = Array.from({ length: 10 }, (_, d) => quantile(sm, (d + 1) / 10));
    const decOf = (x: number) => { let d = 0; while (d < 9 && x > dec[d]) d++; return d; };
    const res: number[][] = Array.from({ length: 10 }, () => []);
    for (let h = 0; h < H; h++) res[decOf(m[h])].push(o[h] - m[h]);
    const resMean = res.map(mean);
    const draw = rng(yr * 31 + z);
    const artefactBins = [6, 7];
    const calib = artefactBins.map(() => [] as number[]);
    for (let k = 0; k < 200; k++) {
      const sum = artefactBins.map(() => 0), cnt = artefactBins.map(() => 0);
      for (let h = 0; h < H; h++) {
        const d = decOf(m[h]), pool = res[d];
        const star = m[h] + pool[(draw() * pool.length) | 0] - resMean[d];
        const b = artefactBins.indexOf(binOf(star));
        if (b >= 0) { sum[b] += m[h] - star; cnt[b]++; }
      }
      artefactBins.forEach((_, i) => calib[i].push(cnt[i] ? sum[i] / cnt[i] : NaN));
    }
    // a day-block bootstrap of the actual bias in each bin
    const days = Math.ceil(H / 24);
    const artefact = artefactBins.map((b, i) => {
      const hs: number[] = [];
      for (let h = 0; h < H; h++) if (binOf(o[h]) === b) hs.push(h);
      const byDay = new Map<number, number[]>();
      for (const h of hs) { const d = (h / 24) | 0; if (!byDay.has(d)) byDay.set(d, []); byDay.get(d)!.push(h); }
      const dl = [...byDay.keys()];
      const boots: number[] = [];
      const g = rng(yr * 7 + z * 3 + b);
      for (let k = 0; k < 500; k++) {
        let s = 0, n = 0;
        for (let j = 0; j < dl.length; j++) for (const h of byDay.get(dl[(g() * dl.length) | 0])!) { s += m[h] - o[h]; n++; }
        boots.push(s / n);
      }
      boots.sort((x, y) => x - y);
      void days;
      return {
        bin: label(b), actual: r1(mean(hs.map((h) => m[h] - o[h]))), calibrated: r1(mean(calib[i])),
        mapped: r1(mean(hs.map((h) => mapped[h] - o[h]))), ci: [r1(boots[12]), r1(boots[487])] as [number, number],
      };
    });
    // regimes and setters in the zone's dear hours, the record's and the model's
    const regimes: ZoneTail["regimes"] = {}, setters: ZoneTail["setters"] = {};
    const bset = (h: number) => Object.fromEntries(BOUNDARY.map((k) => [k, boundary[k][h]]));
    for (const [key, pick] of [["record >250", (h: number) => o[h] > 250], ["record 150–250", (h: number) => o[h] > 150 && o[h] <= 250], ["model >250", (h: number) => m[h] > 250], ["model 150–250", (h: number) => m[h] > 150 && m[h] <= 250]] as [string, (h: number) => boolean][]) {
      const rg: Record<string, Record<string, { n: number; bias: number }>> = {};
      const st: Record<string, { n: number; model: number; record: number }> = {};
      for (let h = 0; h < H; h++) {
        if (!pick(h)) continue;
        const ro = regime(o[h], bset(h)), rm = regime(m[h], bset(h));
        rg[ro] ??= {}; rg[ro][rm] ??= { n: 0, bias: 0 };
        rg[ro][rm].n++; rg[ro][rm].bias += m[h] - o[h];
        const s = setter(pb, r, z, h);
        st[s] ??= { n: 0, model: 0, record: 0 };
        st[s].n++; st[s].model += m[h]; st[s].record += o[h];
      }
      for (const a of Object.values(rg)) for (const c of Object.values(a)) c.bias = r1(c.bias / c.n);
      for (const c of Object.values(st)) { c.model = r1(c.model / c.n); c.record = r1(c.record / c.n); }
      regimes[key] = rg; setters[key] = st;
    }
    return {
      zone,
      byObserved: bins((h) => o[h]), byModel: bins((h) => m[h]),
      quantiles: Q.map((q) => ({ q, model: r1(quantile(sm, q)), record: r1(quantile(so, q)) })),
      share150: [share(150, m), share(150, o)], share250: [share(250, m), share(250, o)],
      overlap, artefact, regimes, setters,
    };
  });
}

export function print(yr: number, t: ZoneTail[]): void {
  for (const z of t) {
    console.log(`\n== ${yr} ${z.zone}: hours ≥150 model ${z.share150[0]} / record ${z.share150[1]}; ≥250 ${z.share250[0]} / ${z.share250[1]}`);
    console.log(`quantiles (model / record): ${z.quantiles.map((q) => `q${q.q * 100} ${q.model}/${q.record}`).join("  ")}`);
    console.log(`bias by bins, mean (median): on the record's price | on the model's price`);
    z.byObserved.forEach((b, i) => { const c = z.byModel[i]; console.log(`  ${b.bin.padEnd(14)} ${String(b.n).padStart(5)} h ${String(b.mean).padStart(7)} (${b.median}) | ${String(c.n).padStart(5)} h ${String(c.mean).padStart(7)} (${c.median})`); });
    console.log(`the record's dearest hours the model also has: ${z.overlap.map((x) => `top ${x.n}: same hour ${x.sameHour}, ±1 h ${x.withinHour}`).join("; ")}`);
    for (const a of z.artefact) console.log(`record in ${a.bin}: bias ${a.actual} [90 % ${a.ci[0]}…${a.ci[1]}]; a calibrated model would show ${a.calibrated}; mapped by rank ${a.mapped}`);
    for (const [key, rg] of Object.entries(z.regimes)) {
      const n = Object.values(rg).reduce((s, a) => s + Object.values(a).reduce((u, c) => u + c.n, 0), 0);
      if (!n) continue;
      console.log(`${key} (${n} h): record's regime → model's (hours, bias)`);
      for (const [ro, a] of Object.entries(rg).sort((x, y) => Object.values(y[1]).reduce((s, c) => s + c.n, 0) - Object.values(x[1]).reduce((s, c) => s + c.n, 0)))
        console.log(`  ${ro.padEnd(10)} → ${Object.entries(a).sort((x, y) => y[1].n - x[1].n).map(([rm, c]) => `${rm} ${c.n} (${c.bias})`).join(", ")}`);
      console.log(`  setters: ${Object.entries(z.setters[key]).sort((x, y) => y[1].n - x[1].n).map(([s, c]) => `${s} ${c.n} (${c.model}/${c.record})`).join(", ")}`);
    }
  }
}

if (/[/\\]tail\.ts$/.test(process.argv[1] ?? "")) {
  const years = process.argv.slice(2).filter((a) => /^\d{4}$/.test(a)).map(Number);
  const { solve } = await loadSolver();
  const out: Record<number, ZoneTail[]> = {};
  for (const yr of years.length ? years : [2023, 2024, 2025]) {
    const { pb, boundary } = scenarioFor(yr);
    const r = runLP(pb, solve);
    out[yr] = tail(yr, pb, r, boundary);
    if (!process.argv.includes("--json")) print(yr, out[yr]);
  }
  if (process.argv.includes("--json")) console.log(JSON.stringify(out));
}
