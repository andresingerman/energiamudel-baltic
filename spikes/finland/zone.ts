// The Finnish zone model of the research on Finland (docs/research/2026-10-11_finland_2035.md §2): one
// zone cleared hour by hour with v5's engine (`runLP`) on a Problem built by hand:
// - the load, given output (runs whatever the price), wind and solar offered at 0 and curtailable;
// - flexible generation and flexible demand as tranches of hourly MW at a bid;
// - demand response bands (R-DEM-6), hydro on a weekly budget (R-ENG-5's reservoir), a battery;
// - a border to each neighbour at that neighbour's hourly price and capacities (build.ts's boundary
//   offers, R-BND-2: price-takers, so Finland's price meets a neighbour's whenever that cable is free).
// results.ts and worker/view.ts are wired to three zones and are not called; the balance is checked here.
// Several zones solve together as a chain (the research on Sweden and Poland,
// docs/research/2026-10-12_sweden_poland_2035.md §2): the engine joins zone i and i + 1 by link i
// (lp.ts), and one zone at most holds the problem's single reservoir.
import { DAY_AHEAD, runLP } from "../../app/src/engine/lp.ts";
import type { Horizon, LpSolver } from "../../app/src/engine/lp.ts";
import type { Offer, Problem, Storage, Zone } from "../../app/src/engine/problem.ts";
import { boundaryOffers } from "../../app/src/engine/problem.ts";
import { SLOPE_STEPS } from "../../app/src/engine/build.ts";

type Hourly = ArrayLike<number>;
export interface Tranche { cls: string; mw: Hourly; bid: number | Hourly } // a bid per hour where fuel prices move
export interface ZoneInput {
  hours: number;
  load: Hourly;
  fixed: { cls: string; mw: Hourly }[];
  res: { cls: string; mw: Hourly }[];
  supply: Tranche[];
  demand: Tranche[];
  dsr: { mw: number; price: number; hoursPerDay: number }[];
  hydro: { budget: Hourly; pmin: Hourly; pmax: Hourly } | null; // per week of 168 hours
  battery: { mw: number; hours: number; eff: number; delta: number } | null;
  borders: { name: string; price: Hourly; imp: Hourly; exp: Hourly; slope?: number }[]; // imp: MW into the zone; slope: R-BND-6's €/MWh per GW
  voll?: number;
  floor?: number;
  name?: string; // the battery's label ("FI" when absent)
  storage?: { name: string; mw: number; hours: number; eff: number; delta: number }[]; // further daily stores: pumped hydro
}
export interface Link { fwd: Hourly; rev: Hourly } // MW the market may send from zone i to i + 1, and back
export interface ZoneResult {
  price: Float64Array;
  trade: Record<string, Float64Array>; // net MW into Finland per border
  shed: Float64Array;
  spill: Float64Array;
  hydro: Float64Array | null;
  byClass: Record<string, number>; // MWh over the run: offers by class (demand negative), fixed output, shed and spill
}

const arr = (a: Hourly) => Float64Array.from(a as ArrayLike<number>);
const offer = (name: string, cls: string, bid: Float64Array, mw: Float64Array, x: Partial<Offer> = {}): Offer =>
  ({ name, cls, demand: false, bid, mw, co2: 0, hoursPerDay: 0, ...x });

function zoneOf(z: ZoneInput): Zone {
  const H = z.hours;
  const fill = (v: number) => new Float64Array(H).fill(v);
  const offers: Offer[] = [];
  for (const r of z.res) offers.push(offer(r.cls, r.cls, fill(0), arr(r.mw)));
  const bid = (x: number | Hourly) => (typeof x === "number" ? fill(x) : arr(x));
  z.supply.forEach((t, i) => offers.push(offer(`${t.cls}:${i}`, t.cls, bid(t.bid), arr(t.mw))));
  z.demand.forEach((t, i) => offers.push(offer(`${t.cls}:d${i}`, t.cls, bid(t.bid), arr(t.mw), { demand: true })));
  z.dsr.forEach((b, i) => offers.push(offer(`dsr:${i}`, "dsr", fill(b.price), fill(b.mw), { hoursPerDay: b.hoursPerDay })));
  for (const b of z.borders) {
    // R-BND-6 as build.ts builds it: with a slope, the neighbour's price moves by `slope` €/MWh per GW
    // of net flow, the import and the export in SLOPE_STEPS tranches along that line
    const steps = b.slope ? SLOPE_STEPS : 1, P = arr(b.price), imp = arr(b.imp), exp = arr(b.exp);
    for (let k = 0; k < steps; k++) {
      const tag = steps === 1 ? "" : `:${k}`, s = (b.slope ?? 0) * (k + 0.5) / 1000 / steps;
      offers.push(offer(`import:${b.name}${tag}`, "import", P.map((p, h) => p + s * imp[h]), imp.map((x) => x / steps)));
      offers.push(offer(`export:${b.name}${tag}`, "export", P.map((p, h) => p - s * exp[h]), exp.map((x) => x / steps), { demand: true }));
    }
  }
  return { load: arr(z.load), fixed: z.fixed.map((f) => ({ cls: f.cls, mw: arr(f.mw), co2: 0 })), offers, reserveUnmet: new Float64Array(H) };
}

const store = (zone: number, name: string, s: { mw: number; hours: number; eff: number; delta: number }): Storage =>
  ({ name, zone, mw: s.mw, hours: Math.max(1, Math.round(s.hours)), exactHours: s.hours, eff: s.eff, delta: s.delta, period: 24, budget: null });

export function chainProblem(zs: ZoneInput[], links: Link[]): Problem {
  if (links.length !== zs.length - 1) throw new Error(`${zs.length} zones need ${zs.length - 1} links, not ${links.length}`);
  const wet = zs.flatMap((z, i) => (z.hydro ? [i] : []));
  if (wet.length > 1) throw new Error("the engine holds one reservoir per problem (lp.ts)");
  const hy = wet.length ? zs[wet[0]].hydro! : null;
  return {
    hours: zs[0].hours, voll: zs[0].voll ?? 4000, floor: zs[0].floor ?? -500,
    zones: zs.map(zoneOf),
    links: links.map((l) => ({ fwd: arr(l.fwd), rev: arr(l.rev) })),
    borders: [],
    storage: zs.flatMap((z, i) => [
      ...(z.battery ? [store(i, `battery:${z.name ?? "FI"}`, z.battery)] : []),
      ...(z.storage ?? []).map((s) => store(i, s.name, s)),
    ]),
    reservoir: hy ? { zone: wet[0], budget: arr(hy.budget), pmax: arr(hy.pmax), pmin: arr(hy.pmin) } : null,
  };
}
export const zoneProblem = (z: ZoneInput): Problem => chainProblem([z], []);

/** The zones solved together; each zone's hourly balance is checked with its links' flows. */
export function solveChain(zs: ZoneInput[], links: Link[], solve: LpSolver, horizon: Horizon = DAY_AHEAD): { zones: ZoneResult[]; flow: Float64Array[] } {
  const pb = chainProblem(zs, links);
  const r = runLP(pb, solve, horizon);
  const H = pb.hours, Z = pb.zones.length;
  const zones = pb.zones.map((zz, i): ZoneResult => {
    const release = r.reservoir && pb.reservoir?.zone === i ? r.reservoir.release : null;
    const units = r.units.filter((u) => u.zone === i);
    // the hourly balance, in place of results.ts's three-zone `imbalance`
    for (let h = 0; h < H; h++) {
      let x = -zz.load[h] + r.shed[i][h] - r.spill[i][h] + (release?.[h] ?? 0);
      for (const f of zz.fixed) x += f.mw[h];
      zz.offers.forEach((o, j) => { x += o.demand ? -r.offers[i][j][h] : r.offers[i][j][h]; });
      for (const u of units) x += u.discharge[h] - u.charge[h];
      if (i > 0) x += r.flow[i - 1][h];
      if (i < Z - 1) x -= r.flow[i][h];
      if (Math.abs(x) > 1e-5) throw new Error(`zone ${i}, hour ${h}: the balance is off by ${x} MW`);
    }
    const trade: Record<string, Float64Array> = {};
    for (const b of zs[i].borders) {
      const t = new Float64Array(H);
      for (const j of boundaryOffers(zz, "import", b.name)) for (let h = 0; h < H; h++) t[h] += r.offers[i][j][h];
      for (const j of boundaryOffers(zz, "export", b.name)) for (let h = 0; h < H; h++) t[h] -= r.offers[i][j][h];
      trade[b.name] = t;
    }
    const byClass: Record<string, number> = {};
    const add = (k: string, v: number) => { byClass[k] = (byClass[k] ?? 0) + v; };
    zz.offers.forEach((o, j) => { let s = 0; for (let h = 0; h < H; h++) s += r.offers[i][j][h]; add(o.cls, o.demand ? -s : s); });
    for (const f of zz.fixed) { let s = 0; for (let h = 0; h < H; h++) s += f.mw[h]; add(f.cls, s); }
    let shed = 0, spill = 0, hy = 0, load = 0;
    for (let h = 0; h < H; h++) { shed += r.shed[i][h]; spill += r.spill[i][h]; hy += release?.[h] ?? 0; load += zz.load[h]; }
    Object.assign(byClass, { shed, spill, hydro: hy, load: -load });
    return { price: Float64Array.from(r.price[i]), trade, shed: Float64Array.from(r.shed[i]), spill: Float64Array.from(r.spill[i]), hydro: release ? Float64Array.from(release) : null, byClass };
  });
  return { zones, flow: r.flow.map((f) => Float64Array.from(f)) };
}

export const solveZone = (z: ZoneInput, solve: LpSolver): ZoneResult => solveChain([z], [], solve).zones[0];
