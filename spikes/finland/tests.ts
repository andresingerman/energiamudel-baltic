// Test 2 of the research on Finland (docs/research/2026-10-11_finland_2035.md §0, §2): the Finnish zone
// model on Finland's record. Given the observed load, nuclear, hydro, wind and solar, and the neighbours'
// observed prices and capacities, its price must meet Finland's by the acceptance written before the run.
// - Thermal plant (biomass, peat, coal, gas, oil, waste, other) runs a weekly floor, the week's 10th
//   percentile hour, as heat-bound output.
// - Above the floor, up to the week's maximum, it bids on a ladder read from 2023–2024 alone: the share
//   of that range the record ran at each price. 2025 stays blind.
// - Hydro releases the week's observed energy between the week's 10th and 90th percentile hours (D-044).
// - ENTSO-E's Finnish generation falls short of the load until May 2024 (by 150–620 MW a month, most in
//   winter: plant it does not report). A month short by more than 100 MW gets the shortfall as given
//   output shaped like the month's thermal output; from June 2024 the record closes within 100 MW, so
//   the blind year carries no correction.
// From app/: `node --no-maglev ../spikes/finland/tests.ts [DATA_DIR]` (default ../data/derived/finland).
import { readFileSync } from "node:fs";
import { loadSolver } from "../../app/scripts/highs.ts";
import { solveZone } from "./zone.ts";
import type { ZoneInput } from "./zone.ts";

const DIR = process.argv[2] ?? "../data/derived/finland";
const THERMAL = ["biomass", "peat", "hard_coal", "gas", "oil", "other", "waste"];
const BORDERS = ["SE1", "SE3", "EE"];
export interface Rec {
  year: number; hours: number; residualMw: number;
  price: Record<string, number[]>; load: number[]; gen: Record<string, number[]>;
  cap: Record<string, { imp: number[]; exp: number[] }>; flow: Record<string, number[]>;
}
const rec = (y: number): Rec => JSON.parse(readFileSync(`${DIR}/record_${y}.json`, "utf8"));

export const sum = (a: ArrayLike<number>) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };
export const mean = (a: ArrayLike<number>) => sum(a) / a.length;
export const quantile = (a: ArrayLike<number>, f: number) => { const s = Float64Array.from(a as number[]).sort(); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };
function ranks(a: ArrayLike<number>): Float64Array {
  const idx = Array.from({ length: a.length }, (_, i) => i).sort((i, j) => a[i] - a[j]);
  const r = new Float64Array(a.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && a[idx[j + 1]] === a[idx[i]]) j++;
    for (let k = i; k <= j; k++) r[idx[k]] = (i + j) / 2;
    i = j + 1;
  }
  return r;
}
export function spearman(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const ra = ranks(a), rb = ranks(b), ma = mean(ra), mb = mean(rb);
  let c = 0, va = 0, vb = 0;
  for (let i = 0; i < ra.length; i++) { c += (ra[i] - ma) * (rb[i] - mb); va += (ra[i] - ma) ** 2; vb += (rb[i] - mb) ** 2; }
  return c / Math.sqrt(va * vb);
}

/** The week's floor and maximum of a series (weeks of 168 hours from the year's first hour). */
export function weekly(a: number[], H: number, f: (w: number[]) => number): Float64Array {
  const out = new Float64Array(H);
  for (let w0 = 0; w0 < H; w0 += 168) {
    const v = f(a.slice(w0, Math.min(H, w0 + 168)));
    out.fill(v, w0, Math.min(H, w0 + 168));
  }
  return out;
}
export const pct = (f: number) => (w: number[]) => quantile(w, f);
const thermalOf = (r: Rec) => Array.from({ length: r.hours }, (_, h) => THERMAL.reduce((s, t) => s + (r.gen[t]?.[h] ?? 0), 0));

/** The ladder: for each price edge, the share of the floor-to-maximum range the record ran above it. */
export const EDGES = [40, 60, 80, 100, 150, 300];
export const fitLadder = (years: Rec[]) => ladderFrom(years.map((r) => ({ th: thermalOf(r), price: r.price.FI })));
/** The ladder of any zone's thermal output against its price, hour by hour over the years given. */
export function ladderFrom(years: { th: number[]; price: ArrayLike<number> }[], edges = EDGES, base = 0, top = 1000): { bid: number; share: number }[] {
  const bins = edges.map(() => ({ s: 0, n: 0 }));
  const below = { s: 0, n: 0 };
  for (const { th, price } of years) {
    const H = th.length;
    const lo = weekly(th, H, pct(0.1)), hi = weekly(th, H, (w) => Math.max(...w));
    for (let h = 0; h < H; h++) {
      const x = (th[h] - lo[h]) / Math.max(1, hi[h] - lo[h]), p = price[h];
      const k = edges.findLastIndex((e) => p > e);
      const b = k < 0 ? below : bins[k];
      b.s += x; b.n++;
    }
  }
  const out = [{ bid: base, share: below.s / below.n }];
  let last = out[0].share;
  edges.forEach((e, k) => {
    const s = Math.max(last, bins[k].n ? bins[k].s / bins[k].n : last);
    out.push({ bid: e, share: s - last });
    last = s;
  });
  out.push({ bid: top, share: Math.max(0, 1 - last) });
  return out;
}

/** The month (0–11) of each hour of a year. */
const monthOf = (y: number, H: number) => Uint8Array.from({ length: H }, (_, h) => new Date(Date.UTC(y, 0, 1) + h * 3600e3).getUTCMonth());

/** The plant ENTSO-E leaves out: per month whose generation and net imports fall short of the load by
 * more than 100 MW, the shortfall shaped like the month's thermal output. */
export function unreported(r: Rec): Float64Array {
  const H = r.hours, mon = monthOf(r.year, H), th = thermalOf(r), out = new Float64Array(H);
  for (let k = 0; k < 12; k++) {
    let gap = 0, t = 0, n = 0;
    for (let h = 0; h < H; h++) {
      if (mon[h] !== k) continue;
      gap += r.load[h] - Object.values(r.gen).reduce((s, g) => s + g[h], 0) - Object.values(r.flow).reduce((s, f) => s + f[h], 0);
      t += th[h]; n++;
    }
    if (gap / n <= 100) continue;
    for (let h = 0; h < H; h++) if (mon[h] === k) out[h] = (gap / n) * th[h] / (t / n);
  }
  return out;
}

export function recordInput(r: Rec, ladder: { bid: number; share: number }[]): ZoneInput {
  const H = r.hours;
  const th = thermalOf(r), lo = weekly(th, H, pct(0.1)), hi = weekly(th, H, (w) => Math.max(...w));
  const hy = r.gen.hydro_ror;
  const W = Math.ceil(H / 168), wk = (f: (w: number[]) => number) => Float64Array.from({ length: W }, (_, w) => f(hy.slice(w * 168, Math.min(H, w * 168 + 168))));
  const no4 = r.flow.NO4;
  return {
    hours: H,
    load: r.load.map((x, h) => x + Math.max(0, -no4[h])),
    fixed: [
      { cls: "nuclear", mw: r.gen.nuclear },
      { cls: "unreported", mw: unreported(r) },
      { cls: "other_renewable", mw: r.gen.other_renewable ?? new Array(H).fill(0) },
      { cls: "thermal_floor", mw: lo },
      { cls: "NO4", mw: no4.map((x) => Math.max(0, x)) },
    ],
    res: [{ cls: "wind_onshore", mw: r.gen.wind_onshore }, { cls: "solar", mw: r.gen.solar }],
    supply: ladder.map((t) => ({ cls: "thermal", bid: t.bid, mw: Float64Array.from({ length: H }, (_, h) => t.share * Math.max(0, hi[h] - lo[h])) })),
    demand: [],
    dsr: [],
    hydro: { budget: wk((w) => sum(w)), pmin: wk(pct(0.1)), pmax: wk(pct(0.9)) },
    battery: null,
    borders: BORDERS.map((b) => ({ name: b, price: r.price[b], imp: r.cap[b].imp, exp: r.cap[b].exp })),
  };
}

/** One criterion of the acceptance, as printed. */
export interface Check { name: string; ok: boolean; text: string }
/** A border judged on the share of its import-limited hours (where `cap` is given) and its net flow,
 * all MW into the zone: the model's trade against the record's flow. */
export interface BorderJudge { name: string; trade: ArrayLike<number>; flow: ArrayLike<number>; cap: ArrayLike<number> | null }
export const printed = (cs: Check[]) => cs.map((c) => `  ${c.ok ? "PASS" : "FAIL"} ${c.name}: ${c.text}`);

/** The acceptance of §0 on a price series (or on its hours `keep`): model against record. */
export function judgeSeries(obsAll: ArrayLike<number>, modAll: ArrayLike<number>, borders: BorderJudge[], keep: (h: number) => boolean = () => true): Check[] {
  const pick = <T,>(a: ArrayLike<T>) => Array.from(a).filter((_, h) => keep(h));
  const obs = pick(obsAll), mod = Float64Array.from(pick(modAll)), out: Check[] = [];
  const check = (name: string, ok: boolean, text: string) => { out.push({ name, ok, text }); };
  const rel = (m: number, o: number) => Math.abs(m / o - 1);
  check("mean", rel(mean(mod), mean(obs)) <= 0.1, `${mean(mod).toFixed(1)} against ${mean(obs).toFixed(1)}`);
  for (const f of [0.05, 0.5, 0.95]) {
    const m = quantile(mod, f), o = quantile(obs, f);
    check(`P${f * 100}`, o < 33 ? Math.abs(m - o) <= 5 : rel(m, o) <= 0.15, `${m.toFixed(1)} against ${o.toFixed(1)}`);
  }
  for (const [name, f] of [["hours ≤ 5", (x: number) => x <= 5], ["hours ≥ 150", (x: number) => x >= 150]] as const) {
    const m = Array.from(mod).filter(f).length, o = obs.filter(f).length;
    check(name, o === 0 ? m === 0 : Math.abs(m / o - 1) <= 0.25, `${m} against ${o}`);
  }
  const sp = spearman(mod, obs);
  check("Spearman", sp >= 0.85, sp.toFixed(3));
  for (const b of borders) {
    const t = pick(b.trade), fl = pick(b.flow);
    if (b.cap) {
      const cap = pick(b.cap);
      let lm = 0, lo2 = 0, n = 0;
      for (let h = 0; h < obs.length; h++) {
        if (cap[h] <= 1) continue;
        n++;
        if (t[h] >= cap[h] - Math.max(1, 0.02 * cap[h])) lm++;
        if (fl[h] >= cap[h] - Math.max(50, 0.05 * cap[h])) lo2++;
      }
      check(`${b.name} import-limited hours`, Math.abs(lm - lo2) / n <= 0.1, `${(100 * lm / n).toFixed(0)} % against ${(100 * lo2 / n).toFixed(0)} %`);
    }
    const nm = sum(t) / 1e6, no = sum(fl) / 1e6;
    check(`${b.name} net flow`, Math.abs(nm - no) <= 0.2 * Math.abs(no), `${nm.toFixed(2)} TWh against ${no.toFixed(2)}`);
  }
  return out;
}

/** Finland's acceptance on one year (or on its hours `keep`). */
function judge(r: Rec, _inp: ZoneInput, res: ReturnType<typeof solveZone>, keep: (h: number) => boolean = () => true) {
  const cs = judgeSeries(r.price.FI, res.price, BORDERS.map((b) => ({ name: b, trade: res.trade[b], flow: r.flow[b], cap: r.cap[b].imp })), keep);
  return { pass: cs.every((c) => c.ok), lines: printed(cs) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { solve } = await loadSolver();
  const fit = [2023, 2024].map(rec);
  const ladder = fitLadder(fit);
  console.log("thermal ladder (fitted on 2023–2024): " + ladder.map((t) => `${(100 * t.share).toFixed(0)} % above ${t.bid}`).join(", "));
  for (const y of [2023, 2024, 2025]) {
    const r = rec(y), inp = recordInput(r, ladder);
    const res = solveZone(inp, solve);
    const { pass, lines } = judge(r, inp, res);
    console.log(`${y}${y === 2025 ? " (blind)" : ""}: ${pass ? "PASS" : "FAIL"}; shed ${(sum(res.shed) / 1e3).toFixed(1)} GWh, spill ${(sum(res.spill) / 1e3).toFixed(1)} GWh`);
    lines.forEach((l) => console.log(l));
  }
  // Added after the run above (§2a): the Swedish borders publish no capacity under the Nordic flow-based
  // coupling (from 2024-10-29), so a hold-out inside the capacity era — the ladder fitted on 2023 alone,
  // 2024 up to 28 October blind.
  const r24 = rec(2024), early = (h: number) => h < 7247;
  const res24 = solveZone(recordInput(r24, fitLadder([rec(2023)])), solve);
  const j24 = judge(r24, recordInput(r24, fitLadder([rec(2023)])), res24, early);
  console.log(`2024-01-01…2024-10-28, ladder fitted on 2023 alone (blind): ${j24.pass ? "PASS" : "FAIL"}`);
  j24.lines.forEach((l) => console.log(l));
}
