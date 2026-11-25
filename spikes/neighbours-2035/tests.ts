// Test 2 of the research on Sweden and Poland (docs/research/2026-10-12_sweden_poland_2035.md §0, §2): the
// zone models on the record, by the acceptance written before the run.
// - Sweden is a chain SE12 – SE3 – SE4 (SE1 and SE2 merged) joined by cuts 2 and 4. SE12's hydro is the
//   reservoir: the week's observed energy, released between the week's 10th and 90th percentile hours.
//   SE3's and SE4's hydro and SE3's nuclear run as observed. The CHP fleet (A75 "other") runs its week's
//   10th percentile hour, and above it bids on a ladder read from 2023 alone. Neighbours are price-takers
//   at their A44 price, Poland at its R-BND-3 series (A44 less the allocation constraint's shadow price).
// - Poland is one zone. Hard coal, lignite and gas run their week's 10th percentile hour; above it, up to
//   the week's maximum, they bid at the month's short-run cost (ERAA 2025 common data; TTF, PSCMI 1 at
//   EUR/PLN, the EUA, lignite at ERAA's 2.39 €/GJ) in PEMMDB 2030's vintage shares, plus one markup
//   fitted on 2023–2024. Pumped storage is a store (PEMMDB 2030); the five borders are given as observed.
// - A month whose generation and net imports miss the load by more than 100 MW gets the difference: a
//   shortfall as given output shaped like the month's thermal output, an excess as load shaped like load.
// From app/: `node --no-maglev ../spikes/neighbours-2035/tests.ts` (data in $NB_DATA, default
// ../data/derived/neighbours2035). Writes test2.json there: the fitted ladder, horizon and markup, and the
// blind years' series for the quantile shift.
import { readFileSync, writeFileSync } from "node:fs";
import { DAY_AHEAD, WEEKLY } from "../../app/src/engine/lp.ts";
import type { Horizon } from "../../app/src/engine/lp.ts";
import { presets } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { judgeSeries, ladderFrom, mean, pct, printed, sum, weekly } from "../finland/tests.ts";
import type { BorderJudge, Check } from "../finland/tests.ts";
import { solveChain, solveZone } from "../finland/zone.ts";
import type { Link, ZoneInput } from "../finland/zone.ts";

// the markup ladder's edges, as the engine had them when this research ran (D-164 took the ladder out of build.ts)
const MARKUP_EDGES = [0, 0.5, 0.75, 0.9, 1];

export const DIR = process.env.NB_DATA ?? "../data/derived/neighbours2035";
type Ladder = { bid: number; share: number }[];
export interface RecSE {
  year: number; hours: number; price: Record<string, number[]>; load: Record<string, number[]>;
  gen: Record<string, Record<string, number[]>>; cap: Record<string, { fwd: number[]; rev: number[] }>; flow: Record<string, number[]>;
}
export interface RecPL {
  year: number; hours: number; price: { PL: number[]; PLb: number[] }; load: number[]; gen: Record<string, number[]>;
  flow: Record<string, number[]>; fuel: { gas_eur_mwh_th: number[]; eua_eur_t: number[]; coal_eur_mwh_th: number[] };
}
export const recSE = (y: number): RecSE => JSON.parse(readFileSync(`${DIR}/record_SE_${y}.json`, "utf8"));
export const recPL = (y: number): RecPL => JSON.parse(readFileSync(`${DIR}/record_PL_${y}.json`, "utf8"));

const zeros = (H: number) => new Float64Array(H);
const add = (...a: ArrayLike<number>[]) => Float64Array.from({ length: a[0].length }, (_, h) => a.reduce((s, x) => s + x[h], 0));
export const monthOf = (y: number, H: number) => Uint8Array.from({ length: H }, (_, h) => new Date(Date.UTC(y, 0, 1) + h * 3600e3).getUTCMonth());
const BINDING = new Set(["mean", "P50", "Spearman"]);
export const verdict = (cs: Check[]) => ({ all: cs.every((c) => c.ok), binding: cs.filter((c) => BINDING.has(c.name)).every((c) => c.ok) });

/** §0's reconciliation: per month, a shortfall of the record's supply against its load (> 100 MW) as given
 * output shaped like `shape`, an excess as load shaped like the load. */
export function reconcile(year: number, load: ArrayLike<number>, supply: ArrayLike<number>, shape: ArrayLike<number>) {
  const H = load.length, mon = monthOf(year, H), gen = zeros(H), extra = zeros(H), months: Record<number, number> = {};
  for (let k = 0; k < 12; k++) {
    let gap = 0, s = 0, l = 0, n = 0;
    for (let h = 0; h < H; h++) if (mon[h] === k) { gap += load[h] - supply[h]; s += shape[h]; l += load[h]; n++; }
    gap /= n;
    if (Math.abs(gap) <= 100) continue;
    months[k + 1] = Math.round(gap);
    for (let h = 0; h < H; h++) {
      if (mon[h] !== k) continue;
      if (gap > 0) gen[h] = s / n > 1 ? (gap * shape[h]) / (s / n) : gap;
      else extra[h] = (-gap * load[h]) / (l / n);
    }
  }
  return { gen, load: extra, months };
}

// ---------------------------------------------------------------- Sweden
export const SE_ZONES = [{ id: "SE12", parts: ["SE1", "SE2"], obs: "SE2" }, { id: "SE3", parts: ["SE3"], obs: "SE3" }, { id: "SE4", parts: ["SE4"], obs: "SE4" }];
/** Each border of a Swedish zone: the cache's key (fwd = first → second), the neighbour whose price it
 * takes, the sign that makes the key's net flow MW into Sweden, and whether it is a DC cable. */
export const SE_BORDERS = [
  { zone: 0, key: "SE1-FI", nb: "FI", sign: -1, hvdc: false }, { zone: 0, key: "SE1-NO4", nb: "NO4", sign: -1, hvdc: false },
  { zone: 0, key: "SE2-NO3", nb: "NO3", sign: -1, hvdc: false },
  { zone: 1, key: "SE3-FI", nb: "FI", sign: -1, hvdc: true }, { zone: 1, key: "SE3-NO1", nb: "NO1", sign: -1, hvdc: false },
  { zone: 1, key: "SE3-DK1", nb: "DK1", sign: -1, hvdc: true },
  { zone: 2, key: "SE4-DK2", nb: "DK2", sign: -1, hvdc: false }, { zone: 2, key: "SE4-DE", nb: "DE", sign: -1, hvdc: true },
  { zone: 2, key: "SE4-PL", nb: "PLb", sign: -1, hvdc: true }, { zone: 2, key: "LT-SE4", nb: "LT", sign: 1, hvdc: true },
] as const;
export const SE_LINKS = ["SE2-SE3", "SE3-SE4"];
const SE_THERMAL = ["other", "gas"];

const genOf = (r: RecSE, parts: string[], techs?: string[]) =>
  add(zeros(r.hours), ...parts.flatMap((p) => Object.entries(r.gen[p]).filter(([t]) => !techs || techs.includes(t)).map(([, v]) => v)));
/** The record's net flow into Swedish zone i: its borders and its cuts. */
function intoSE(r: RecSE, i: number): Float64Array {
  const out = zeros(r.hours);
  for (const b of SE_BORDERS) if (b.zone === i) for (let h = 0; h < r.hours; h++) out[h] += b.sign * r.flow[b.key][h];
  for (let h = 0; h < r.hours; h++) out[h] += (i > 0 ? r.flow[SE_LINKS[i - 1]][h] : 0) - (i < 2 ? r.flow[SE_LINKS[i]][h] : 0);
  return out;
}
const capInto = (r: RecSE, b: (typeof SE_BORDERS)[number]) => (b.sign > 0 ? r.cap[b.key].fwd : r.cap[b.key].rev);
const capOut = (r: RecSE, b: (typeof SE_BORDERS)[number]) => (b.sign > 0 ? r.cap[b.key].rev : r.cap[b.key].fwd);
export const thermalSE = (r: RecSE, i: number) => Array.from(genOf(r, SE_ZONES[i].parts, SE_THERMAL));

export function recordSE(r: RecSE, ladders: Ladder[], slope = 0): { zones: ZoneInput[]; links: Link[]; months: Record<string, Record<number, number>> } {
  const H = r.hours, months: Record<string, Record<number, number>> = {};
  const zones = SE_ZONES.map((z, i): ZoneInput => {
    const g = (t: string) => genOf(r, z.parts, [t]);
    const th = thermalSE(r, i), lo = weekly(th, H, pct(0.1)), hi = weekly(th, H, (w) => Math.max(...w));
    const load = add(...z.parts.map((p) => r.load[p]));
    const rc = reconcile(r.year, load, add(genOf(r, z.parts), intoSE(r, i)), th);
    months[z.id] = rc.months;
    const hy = Array.from(g("hydro_reservoir"));
    const W = Math.ceil(H / 168), wk = (f: (w: number[]) => number) => Float64Array.from({ length: W }, (_, w) => f(hy.slice(w * 168, Math.min(H, w * 168 + 168))));
    return {
      name: z.id, hours: H, load: add(load, rc.load),
      fixed: [
        ...(i > 0 ? [{ cls: "hydro_given", mw: g("hydro_reservoir") }] : []),
        { cls: "nuclear", mw: g("nuclear") }, { cls: "thermal_floor", mw: lo }, { cls: "unreported", mw: rc.gen },
      ],
      res: [{ cls: "wind_onshore", mw: g("wind_onshore") }, { cls: "solar", mw: g("solar") }],
      supply: ladders[i].map((t) => ({ cls: "thermal", bid: t.bid, mw: Float64Array.from({ length: H }, (_, h) => t.share * Math.max(0, hi[h] - lo[h])) })),
      demand: [], dsr: [],
      hydro: i === 0 ? { budget: wk((w) => sum(w)), pmin: wk(pct(0.1)), pmax: wk(pct(0.9)) } : null,
      battery: null,
      borders: SE_BORDERS.filter((b) => b.zone === i).map((b) => ({ name: b.nb, price: r.price[b.nb], imp: capInto(r, b), exp: capOut(r, b), slope })),
    };
  });
  return { zones, links: SE_LINKS.map((k) => ({ fwd: r.cap[k].fwd, rev: r.cap[k].rev })), months };
}

export function judgeSE(r: RecSE, res: ReturnType<typeof solveChain>, i: number, keep: (h: number) => boolean = () => true): Check[] {
  const z = SE_ZONES[i];
  const borders: BorderJudge[] = SE_BORDERS.filter((b) => b.zone === i).map((b) => ({
    name: `${b.key}${b.hvdc ? "" : " (AC)"}`, trade: res.zones[i].trade[b.nb], flow: r.flow[b.key].map((x) => b.sign * x), cap: b.hvdc ? capInto(r, b) : null,
  }));
  if (i < 2) borders.push({ name: `cut ${SE_LINKS[i]}`, trade: res.flow[i], flow: r.flow[SE_LINKS[i]], cap: null });
  return judgeSeries(r.price[z.obs], res.zones[i].price, borders, keep);
}

// ---------------------------------------------------------------- Poland
const TECH = presets().tech as Record<string, Record<string, { value: number }>>;
/** The short-run cost of an ERAA 2025 common-data class, € per MWh of electricity: fuel (€/MWh of fuel)
 * and CO₂ (€/t) over the class's efficiency, plus its VOM. */
export function srmc(row: string, fuel: number, eua: number): number {
  const t = TECH[`eraa2025_common|${row}`];
  const eff = t.efficiency.value;
  return fuel / eff + ((t.co2_factor.value * 3.6) / 1000 / eff) * eua + t.vom.value;
}
export const LIGNITE = 2.39 * 3.6; // ERAA 2025 final's brown coal, constant 2028–2035, €/GJ → €/MWh of fuel
/** Vintages per fuel with PEMMDB 2030 PL00 National Trends' MW (the shares split the record's range). */
export const PL_CLASSES: Record<string, { fuel: "coal" | "lignite" | "gas"; rows: [string, number][] }> = {
  hard_coal: { fuel: "coal", rows: [["hard_coal_old_1", 7367.98], ["hard_coal_old_2", 3276.21], ["hard_coal_new", 1663]] },
  brown_coal: { fuel: "lignite", rows: [["lignite_old_1", 4696], ["lignite_old_2", 1824]] },
  gas: { fuel: "gas", rows: [["gas_ccgt_present_1", 1]] },
};
const PL_GIVEN = ["hydro_ror", "hydro_reservoir", "biomass", "other", "other_renewable", "coal_gas", "oil"];
// PEMMDB 2030 PL00: closed-loop 1 333.35 MW / 6.35 GWh, open-loop 216.26 MW / 1.31 GWh; Kruonis' round trip
export const PL_PUMPED = { name: "hydro_ps:PL", mw: 1549.61, hours: 7660 / 1549.61, eff: 0.74, delta: 71.5 };

/** One vintage's offer as R-SUP-6 splits it (build.ts `applyMarkup`): by share of its weekly maximum, each
 * bin bidding the cost plus the bin's markup; a single number is §0's one additive markup. */
function binned(cls: string, mw: Float64Array, bid: Float64Array, markup: number | number[]): ZoneInput["supply"] {
  if (typeof markup === "number") return [{ cls, mw, bid: bid.map((b) => b + markup) }];
  const H = mw.length, out = markup.map((mk) => ({ cls, mw: new Float64Array(H), bid: bid.map((b) => b + mk) }));
  for (let w0 = 0; w0 < H; w0 += 168) {
    const w1 = Math.min(H, w0 + 168);
    let top = 0;
    for (let h = w0; h < w1; h++) top = Math.max(top, mw[h]);
    out.forEach((t, k) => {
      const lo = MARKUP_EDGES[k] * top, width = (MARKUP_EDGES[k + 1] - MARKUP_EDGES[k]) * top;
      for (let h = w0; h < w1; h++) t.mw[h] = Math.min(width, Math.max(0, mw[h] - lo));
    });
  }
  return out;
}

/** Each class's reference vintage: its ladder's bids are premiums over this vintage's short-run cost. */
export const PL_REF: Record<string, string> = { hard_coal: "hard_coal_old_2", brown_coal: "lignite_old_2", gas: "gas_ccgt_present_1" };
export const PREMIUM_EDGES = [-40, -20, 0, 20, 40, 80, 150];
const plFuel = (r: RecPL, f: "coal" | "lignite" | "gas", m: number) => (f === "coal" ? r.fuel.coal_eur_mwh_th[m] : f === "gas" ? r.fuel.gas_eur_mwh_th[m] : LIGNITE);
/** The reference vintage's short-run cost of class `c`, hour by hour (the month's fuels). */
export const plRef = (r: RecPL, c: string) => { const mon = monthOf(r.year, r.hours); return Float64Array.from({ length: r.hours }, (_, h) => srmc(PL_REF[c], plFuel(r, PL_CLASSES[c].fuel, mon[h]), r.fuel.eua_eur_t[mon[h]])); };
/** Finland's ladder per class, read against the price's premium over the class's reference cost. */
export const plLadders = (years: RecPL[]): Record<string, Ladder> => Object.fromEntries(Object.keys(PL_CLASSES).map((c) => [c,
  ladderFrom(years.map((r) => { const ref = plRef(r, c); return { th: r.gen[c], price: r.price.PL.map((p, h) => p - ref[h]) }; }), PREMIUM_EDGES, -60, 300)]));

export function recordPL(r: RecPL, markup: number | number[] | Record<string, Ladder>): ZoneInput & { months: Record<number, number> } {
  const H = r.hours, mon = monthOf(r.year, H);
  const into = add(zeros(H), ...Object.values(r.flow));
  const th = add(zeros(H), ...Object.keys(PL_CLASSES).map((c) => r.gen[c] ?? zeros(H)));
  const supplied = add(zeros(H), ...Object.entries(r.gen).filter(([t]) => t !== "hydro_ps").map(([, v]) => v), into);
  const rc = reconcile(r.year, r.load, supplied, th);
  const fuel = (f: "coal" | "lignite" | "gas", m: number) => plFuel(r, f, m);
  const fixed: { cls: string; mw: ArrayLike<number> }[] = PL_GIVEN.filter((t) => r.gen[t]).map((t) => ({ cls: t, mw: r.gen[t] }));
  const supply: ZoneInput["supply"] = [];
  for (const [c, k] of Object.entries(PL_CLASSES)) {
    const g = r.gen[c], lo = weekly(g, H, pct(0.1)), hi = weekly(g, H, (w) => Math.max(...w));
    fixed.push({ cls: `${c}_floor`, mw: lo });
    if (!Array.isArray(markup) && typeof markup === "object") {
      const ref = plRef(r, c);
      for (const t of markup[c]) supply.push({ cls: c, mw: Float64Array.from({ length: H }, (_, h) => t.share * Math.max(0, hi[h] - lo[h])), bid: ref.map((x) => x + t.bid) });
      continue;
    }
    const tot = k.rows.reduce((s, [, mw]) => s + mw, 0);
    for (const [row, mw] of k.rows) {
      supply.push(...binned(c, Float64Array.from({ length: H }, (_, h) => (mw / tot) * Math.max(0, hi[h] - lo[h])),
        Float64Array.from({ length: H }, (_, h) => srmc(row, fuel(k.fuel, mon[h]), r.fuel.eua_eur_t[mon[h]])), markup));
    }
  }
  fixed.push({ cls: "unreported", mw: rc.gen }, { cls: "imports_given", mw: into.map((x) => Math.max(0, x)) });
  return {
    hours: H, load: add(r.load, rc.load, into.map((x) => Math.max(0, -x))),
    fixed, res: [{ cls: "wind_onshore", mw: r.gen.wind_onshore }, { cls: "solar", mw: r.gen.solar }],
    supply, demand: [], dsr: [], hydro: null, battery: null, storage: [PL_PUMPED], borders: [], name: "PL", months: rc.months,
  };
}

/** The shift a period teaches, quantile by quantile: each hour of another series moves by the record's
 * value minus the model's at that hour's rank (spikes/finland/v5.ts `fbShift`, learned here on a fit
 * period and judged on a blind one). */
export function rankShift(model: ArrayLike<number>, record: ArrayLike<number>): (p: ArrayLike<number>) => Float64Array {
  const m = Float64Array.from(model).sort(), o = Float64Array.from(record).sort(), n = m.length;
  return (p) => {
    const idx = Array.from({ length: p.length }, (_, h) => h).sort((a, b) => p[a] - p[b]), out = new Float64Array(p.length);
    idx.forEach((h, k) => { const q = Math.min(n - 1, Math.floor(((k + 0.5) / p.length) * n)); out[h] = p[h] + o[q] - m[q]; });
    return out;
  };
}

const mae = (a: ArrayLike<number>, b: ArrayLike<number>) => { let s = 0; for (let h = 0; h < a.length; h++) s += Math.abs(a[h] - b[h]); return s / a.length; };

if (import.meta.url === `file://${process.argv[1]}`) {
  const { solve } = await loadSolver();
  const out: Record<string, unknown> = {};
  const show = (title: string, cs: Check[]) => {
    const v = verdict(cs);
    console.log(`${title}: binding ${v.binding ? "PASS" : "FAIL"} (all criteria ${v.all ? "PASS" : "FAIL"})`);
    printed(cs).forEach((l) => console.log(l));
  };

  // ---- Sweden: ladder and horizon fitted on 2023
  const s23 = recSE(2023);
  const ladders = SE_ZONES.map((_, i) => ladderFrom([{ th: thermalSE(s23, i), price: s23.price[SE_ZONES[i].obs] }]));
  SE_ZONES.forEach((z, i) => console.log(`${z.id} CHP ladder (2023): ` + ladders[i].map((t) => `${(100 * t.share).toFixed(0)} % above ${t.bid}`).join(", ")));
  const runSE = (r: RecSE, hz: Horizon) => { const x = recordSE(r, ladders); return { x, res: solveChain(x.zones, x.links, solve, hz) }; };
  let best: { name: string; hz: Horizon; err: number } | null = null;
  for (const [name, hz] of [["DAY_AHEAD", DAY_AHEAD], ["WEEKLY", WEEKLY]] as const) {
    const { res } = runSE(s23, hz);
    const err = mean(SE_ZONES.map((z, i) => mae(res.zones[i].price, s23.price[z.obs])));
    console.log(`horizon ${name} on 2023: MAE over the three zones ${err.toFixed(2)} €/MWh`);
    if (!best || err < best.err) best = { name, hz, err };
  }
  console.log(`horizon chosen: ${best!.name}`);
  out.se = { ladders, horizon: best!.name };
  const se: Record<string, unknown> = {};
  for (const [y, label, keep] of [
    [2023, "2023 (fit)", () => true], [2024, "2024-01-01…10-28 (blind, binding)", (h: number) => h < 7247], [2025, "2025 (flow-based, reported)", () => true],
  ] as [number, string, (h: number) => boolean][]) {
    const r = recSE(y), { x, res } = runSE(r, best!.hz);
    console.log(`\nSweden ${label}: shed ${(SE_ZONES.reduce((s, _, i) => s + sum(res.zones[i].shed), 0) / 1e3).toFixed(1)} GWh; months reconciled ${JSON.stringify(x.months)}`);
    SE_ZONES.forEach((z, i) => {
      show(`${z.id} ${y}`, judgeSE(r, res, i, keep));
      if (i === 0) {
        const pick = <T,>(a: ArrayLike<T>) => Array.from(a).filter((_, h) => keep(h));
        console.log(`  beside: SE1 mean ${mean(pick(r.price.SE1)).toFixed(1)}; SE12 model against SE1: MAE ${mae(pick(res.zones[0].price), pick(r.price.SE1)).toFixed(1)}`);
      }
    });
    if (y === 2025) se["2025"] = Object.fromEntries(SE_ZONES.map((z, i) => [z.id, { model: Array.from(res.zones[i].price), record: r.price[z.obs] }]));
  }
  out.seBlind = se;

  // ---- Poland: one additive markup fitted on 2023–2024 by the MAE (D-118), a grid then its refinement
  const fit = [recPL(2023), recPL(2024)];
  const score = (m: number) => mean(fit.map((r) => mae(solveZone(recordPL(r, m), solve).price, r.price.PL)));
  const tried = new Map<number, number>();
  const at = (m: number) => { if (!tried.has(m)) tried.set(m, score(m)); return tried.get(m)!; };
  let m0 = 0;
  for (const m of [-30, -20, -10, 0, 10, 20, 30, 40, 50]) if (at(m) < at(m0)) m0 = m;
  for (const m of [m0 - 7.5, m0 - 5, m0 - 2.5, m0 + 2.5, m0 + 5, m0 + 7.5]) if (at(m) < at(m0)) m0 = m;
  console.log(`\nPoland markup grid (MAE 2023–2024): ` + [...tried].sort((a, b) => a[0] - b[0]).map(([m, e]) => `${m}: ${e.toFixed(2)}`).join(", "));
  console.log(`markup fitted: ${m0} €/MWh`);
  out.pl = { markup: m0 };
  for (const y of [2023, 2024, 2025]) {
    const r = recPL(y), inp = recordPL(r, m0), res = solveZone(inp, solve);
    console.log(`\nPoland ${y}${y === 2025 ? " (blind, binding)" : " (fit)"}: shed ${(sum(res.shed) / 1e3).toFixed(1)} GWh; months reconciled ${JSON.stringify(inp.months)}; MAE ${mae(res.price, r.price.PL).toFixed(1)}`);
    show(`PL ${y}`, judgeSeries(r.price.PL, res.price, []));
    console.log(`  beside: R-BND-3 series mean ${mean(r.price.PLb).toFixed(1)}`);
    if (y === 2025) out.plBlind = { model: Array.from(res.price), record: r.price.PL };
  }

  // ---- Added after the run above (§2b): the first run failed its binding criteria in SE3 and SE4 and in
  // Poland. The fit years show why, and each fix is one of v5's own mechanisms, fitted on the fit years
  // alone and judged on the same blind periods.
  // - Sweden: the record's flows sit well below the offered capacities even across wide spreads (SE3→NO1
  //   full in 8 % of the hours NO1 was dearer in 2023), so price-taking neighbours drain SE3 and congest
  //   cut 2. R-BND-6's slope, one for every Swedish border, fitted on 2023.
  // - Poland: in the record's hours at or above 150 €/MWh the model stops at its dearest vintage's cost
  //   (≈115 against 209 recorded in 2024) with 9 GW of range unused. R-SUP-6's utilisation bins (0, 50,
  //   75, 90, 100 % of each offer's weekly maximum), their four markups fitted on 2023–2024 by the MAE.
  console.log("\n==== Added after the run: R-BND-6's slope for Sweden, R-SUP-6's bins for Poland");
  let slope = 0, slopeErr = Infinity;
  for (const s of [0, 2, 5, 10, 20, 40, 80]) {
    const x = recordSE(s23, ladders, s), res = solveChain(x.zones, x.links, solve, best!.hz);
    const err = mean(SE_ZONES.map((z, i) => mae(res.zones[i].price, s23.price[z.obs])));
    console.log(`slope ${s} €/MWh per GW on 2023: MAE ${err.toFixed(2)}`);
    if (err < slopeErr) { slope = s; slopeErr = err; }
  }
  console.log(`slope chosen: ${slope}`);
  out.seSlope = slope;
  const se2: Record<string, unknown> = {};
  for (const [y, label, keep] of [
    [2023, "2023 (fit)", () => true], [2024, "2024-01-01…10-28 (blind, binding)", (h: number) => h < 7247], [2025, "2025 (flow-based, reported)", () => true],
  ] as [number, string, (h: number) => boolean][]) {
    const r = recSE(y), x = recordSE(r, ladders, slope), res = solveChain(x.zones, x.links, solve, best!.hz);
    console.log(`\nSweden with the slope, ${label}`);
    SE_ZONES.forEach((z, i) => show(`${z.id} ${y}`, judgeSE(r, res, i, keep)));
    if (y === 2025) se2["2025"] = Object.fromEntries(SE_ZONES.map((z, i) => [z.id, { model: Array.from(res.zones[i].price), record: r.price[z.obs] }]));
  }
  out.seBlindSlope = se2;

  const tried2 = new Map<string, number>();
  const at2 = (m: number[]) => { const k = m.join("/"); if (!tried2.has(k)) tried2.set(k, mean(fit.map((r) => mae(solveZone(recordPL(r, m), solve).price, r.price.PL)))); return tried2.get(k)!; };
  const GRID = [[-20, -10, -5, 0, 5, 10, 20], ...Array(3).fill([0, 10, 20, 40, 60, 80, 120, 160, 220, 300])];
  let mk = [0, 0, 0, 0];
  for (let round = 0; round < 3; round++) {
    for (const k of [3, 2, 1, 0]) {
      for (const v of GRID[k]) {
        const c = mk.map((x, j) => (j === k ? v : x));
        if (c.some((x, j) => j > 0 && x < c[j - 1])) continue;
        if (at2(c) < at2(mk)) mk = c;
      }
    }
  }
  console.log(`\nPoland R-SUP-6 markups fitted on 2023–2024: ${mk.join(" / ")} €/MWh (MAE ${at2(mk).toFixed(2)}; ${tried2.size} candidates)`);
  out.plMarkups = mk;
  for (const y of [2023, 2024, 2025]) {
    const r = recPL(y), res = solveZone(recordPL(r, mk), solve);
    console.log(`\nPoland with the bins ${y}${y === 2025 ? " (blind, binding)" : " (fit)"}: MAE ${mae(res.price, r.price.PL).toFixed(1)}`);
    show(`PL ${y}`, judgeSeries(r.price.PL, res.price, []));
    if (y === 2025) out.plBlindBins = { model: Array.from(res.price), record: r.price.PL };
  }

  // ---- Added after the second run (§2b): neither v5 mechanism passed. Two more, each a method this
  // research already uses, fitted on the fit years alone and judged once on the same blind periods.
  // - Sweden: SE3's and SE4's hourly order passes (Spearman 0.87–0.95) while their level and middle sit
  //   high, so the shift 2023 teaches (record minus model, quantile by quantile, per zone) is applied to
  //   the 2024 run and judged on its capacity-era hours.
  // - Poland: Finland's ladder per fuel class, read on 2023–2024 against the price's premium over the
  //   class's reference vintage (hard coal old 2, lignite old 2, CCGT present 1), so its bids move with
  //   the fuels; the vintages' merit order gives way to the record's.
  console.log("\n==== Added after the second run: the 2023 shift for Sweden, the premium ladders for Poland");
  const r23 = recSE(2023), x23 = recordSE(r23, ladders), m23 = solveChain(x23.zones, x23.links, solve, best!.hz);
  const r24 = recSE(2024), x24 = recordSE(r24, ladders), m24 = solveChain(x24.zones, x24.links, solve, best!.hz);
  out.seShift2023 = {};
  SE_ZONES.forEach((z, i) => {
    const shifted = rankShift(m23.zones[i].price, r23.price[z.obs])(m24.zones[i].price);
    (out.seShift2023 as Record<string, unknown>)[z.id] = { model: Array.from(m23.zones[i].price), record: r23.price[z.obs] };
    show(`${z.id} 2024-01-01…10-28 shifted by 2023 (blind, binding)`, judgeSeries(r24.price[z.obs], shifted, [], (h) => h < 7247));
  });
  const lad = plLadders(fit);
  for (const c of Object.keys(PL_CLASSES)) console.log(`PL ${c} ladder (premium over ${PL_REF[c]}, 2023–2024): ` + lad[c].map((t) => `${(100 * t.share).toFixed(0)} % above ${t.bid}`).join(", "));
  out.plLadders = lad;
  for (const y of [2023, 2024, 2025]) {
    const r = recPL(y), res = solveZone(recordPL(r, lad), solve);
    console.log(`\nPoland with the premium ladders ${y}${y === 2025 ? " (blind, binding)" : " (fit)"}: MAE ${mae(res.price, r.price.PL).toFixed(1)}`);
    show(`PL ${y}`, judgeSeries(r.price.PL, res.price, []));
    if (y === 2025) out.plBlindLadder = { model: Array.from(res.price), record: r.price.PL };
  }
  writeFileSync(`${DIR}/test2.json`, JSON.stringify(out));
}
