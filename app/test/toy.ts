// Small hand-built problems for the engine tests.
import type { Offer, Problem, Storage, Zone } from "../src/engine/problem.ts";

export const fill = (H: number, v: number): Float64Array => new Float64Array(H).fill(v);

export function offer(name: string, bid: number, mw: number, H: number, extra: Partial<Offer> = {}): Offer {
  return { name, cls: name, demand: false, bid: fill(H, bid), mw: fill(H, mw), co2: 0, hoursPerDay: 0, ...extra };
}

export function zone(H: number, load: number, fixed = 0, offers: Offer[] = []): Zone {
  return { load: fill(H, load), fixed: fixed ? [{ cls: "fixed", mw: fill(H, fixed), co2: 0 }] : [], offers, reserveUnmet: new Float64Array(H) };
}

/** Three zones, two links of `link` MW both ways, no boundary. */
export function path(H: number, zones: Zone[], link = 1e6): Problem {
  return {
    hours: H, voll: 4000, floor: -600, zones,
    links: [0, 1].map(() => ({ fwd: fill(H, link), rev: fill(H, link) })),
    borders: [], storage: [], reservoir: null,
  };
}

/** Boundary offers of one border as build.ts makes them (R-BND-2, R-BND-4). */
export function boundary(k: string, price: number, ntcImp: number, ntcExp: number, H: number, lossImp = 0, lossExp = 0): Offer[] {
  return [
    offer(`import:${k}`, price / (1 - lossImp), ntcImp * (1 - lossImp), H, { cls: "import" }),
    offer(`export:${k}`, price * (1 - lossExp), ntcExp, H, { cls: "export", demand: true }),
  ];
}

export function battery(zone: number, mw: number, hours: number, extra: Partial<Storage> = {}): Storage {
  return { name: "battery", zone, mw, hours, eff: 0.9, delta: 60, period: 24, budget: null, ...extra };
}

/** Deterministic pseudo-random numbers for property tests (tests only; the engine draws none). */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random three-zone problem: thermal stacks, wind, boundaries with losses, a battery, DSR. */
export function randomProblem(seed: number, H = 72): Problem {
  const r = rng(seed);
  const series = (lo: number, hi: number) => Float64Array.from({ length: H }, () => lo + (hi - lo) * r());
  const zones = [0, 1, 2].map((z) => {
    const zz = zone(H, 0, 0, [
      offer("gas", 40 + 100 * r(), 300 + 900 * r(), H),
      offer("peak", 150 + 300 * r(), 200 + 400 * r(), H),
      { ...offer("wind", 0, 0, H), mw: series(0, 1200) },
      { ...offer("dsr", 500 + 1500 * r(), 50 + 100 * r(), H), cls: "dsr", hoursPerDay: 1 + Math.floor(5 * r()) },
    ]);
    zz.load = series(600, 2200);
    zz.fixed = [{ cls: "fixed", mw: series(0, 300), co2: 0 }];
    if (z !== 1) zz.offers.push(...boundary(z === 0 ? "FI" : "SE4", 20 + 80 * r(), 300 + 700 * r(), 300 + 700 * r(), H, 0.04, 0.035));
    return zz;
  });
  const pb = path(H, zones);
  pb.links = [0, 1].map(() => ({ fwd: series(0, 1200), rev: series(0, 1200) }));
  pb.storage = [battery(0, 100 + 400 * r(), 2, { budget: new Float64Array(Math.ceil(H / 24)).fill(3) }), battery(2, 300, 4)];
  pb.storage[1].name = "battery:LT";
  const weeks = Math.ceil(H / 168);
  pb.reservoir = { zone: 1, budget: new Float64Array(weeks).fill(H * 200), pmax: new Float64Array(weeks).fill(700), pmin: new Float64Array(weeks).fill(50) };
  return pb;
}

