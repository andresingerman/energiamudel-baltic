// What the interface shows of one run (R-APP-1), computed where the run is so that only this
// leaves the worker: per zone the card figures, the hourly price, the day-by-day generation by
// group against consumption, and the year's mix.
import type { Results } from "../engine/index.ts";
import type { Offer, Problem } from "../engine/problem.ts";
import { BORDERS, LINKS, ZONES, boundaryOffers } from "../engine/problem.ts";
import type { BorderSummary, UnitSummary } from "../engine/results.ts";
import { storageClass, summarise } from "../engine/results.ts";

/** The generation groups in stack order, bottom to top: ordered so that neighbouring colours stay
 * apart for colour-blind readers (the dataviz validator, run on the two themes of the time; D-029). */
export const GROUPS = ["oil_shale", "nuclear", "bio_waste", "wind", "gas", "hydro", "solar", "storage", "other"] as const;
export type Group = (typeof GROUPS)[number];

export function group(cls: string): Group {
  if (cls === "nuclear") return "nuclear";
  if (cls.startsWith("wind")) return "wind";
  if (cls === "solar") return "solar";
  if (cls === "battery" || cls === "hydro_ps") return "storage";
  if (cls.startsWith("hydro")) return "hydro";
  if (cls.startsWith("oil_shale") || cls === "retort_gas") return "oil_shale";
  if (cls.startsWith("gas") || cls === "other") return "gas"; // `other` bids as a gas engine (D-020)
  if (cls === "biomass_chp" || cls === "waste" || cls === "other_renewable") return "bio_waste";
  return "other";
}

/** A class of the zone's fleet as the run had it (R-APP-1: every source with its bid). */
export interface FleetRow {
  cls: string;
  group: Group;
  installedMw: number | null; // the scenario's or the observed year's capacity
  bid: number | null; // €/MWh, the hours' average of its lowest bid; null: given output or storage
  twh: number; // generated in the run
  kind: "offer" | "given" | "storage" | "reservoir";
}

export interface ZoneView {
  zone: string;
  mean: number; // €/MWh
  median: number;
  importTwh: number; // received
  exportTwh: number; // sent
  importMeur: number; // at the zone's price
  exportMeur: number;
  congestedHours: number; // hours with at least one of the zone's borders at its limit
  co2Mt: number;
  curtailTwh: number;
  unservedMwh: number;
  price: Float32Array; // hourly
  daily: Record<Group, Float32Array>; // MWh per UTC day
  netImport: Float32Array; // MWh per day, + = import
  consumption: Float32Array; // MWh per day: load, storage charging and flexible demand
  mix: Record<Group, number>; // TWh
  fleet: FleetRow[];
  // hours whose price a Baltic fossil plant set — of them `gas` a gas plant's (the owner's table, D-195) — and a
  // neighbour's price at a fossil level (R-SMR-5, D-037); null in a replay
  fossil: { unit: number; gas: number; neighbour: number } | null;
  gasHours: number; // hours the zone's natural gas ran, above 1 MW (the owner asked, 2026-10-21)
}

/** A border as the run used it (R-APP-3, R-BND-7): fwd runs along the code (EE→FI, EE→LV, LV→LT,
 * LT→SE4, LT→PL), rev against it. */
export interface BorderView extends BorderSummary {
  capFwd: number; // MW, the year's average capacity in use
  capRev: number;
  fwdTwh: number; // sent
  revTwh: number;
  dailyCapFwd: Float32Array; // MW, the day's average
  dailyCapRev: Float32Array;
  dailyFlow: Float32Array; // MW, the day's average net flow, + = fwd
}

export interface RunView {
  hours: number;
  zones: ZoneView[];
  borders: BorderView[];
  units: UnitSummary[];
  // the plant's hourly output in Estonia and each hour's month, for the contract account (R-SMR-6,
  // R-APP-4: recomputed on the page when the strike moves); null without the plant
  plant: { mw: Float32Array; month: Uint8Array } | null;
  fossilLevel: number | null; // €/MWh, the level of `ZoneView.fossil`
}

/** The fuel and CO₂ prices taken for a neighbours' profile whose market model's own the engine
 * does not hold (National Trends, National Trends+, actual prices): TYNDP 2024's price matrix, the
 * nearest documented (D-037). Distributed Energy and Global Ambition take their model's gas blend
 * (build.ts `neighbourGasCost`; ERRATA E-064). */
export const NEIGHBOURS_FUEL = "tyndp2024_matrix";
const TOL_MW = 1e-3;
const TOL_EUR = 0.005; // above the LP's perturbation of at most 0.0011 €/MWh (lp.ts)

const isFossil = (cls: string) => ["gas", "oil_shale"].includes(group(cls));

/** The offer that set zone z's price in hour h: one running part-loaded at the price, in the zone
 * or in a zone the links do not part from it in price, the zone's own first; null when storage,
 * the Daugava, shedding or spilling set it (R-SMR-5, D-037; v4's price-setter tag). */
export function marginal(pb: Problem, r: Results, z: number, h: number): Offer | null {
  const p = r.price[z][h];
  let a = z, b = z;
  while (a > 0 && Math.abs(r.price[a - 1][h] - p) < TOL_EUR) a--;
  while (b < pb.zones.length - 1 && Math.abs(r.price[b + 1][h] - p) < TOL_EUR) b++;
  for (const y of [z, ...Array.from({ length: b - a + 1 }, (_, i) => a + i).filter((y) => y !== z)]) {
    let best: Offer | null = null;
    let gap = TOL_EUR;
    pb.zones[y].offers.forEach((o, j) => {
      const q = r.offers[y][j][h];
      const d = Math.abs(o.bid[h] - p);
      if (q > TOL_MW && q < o.mw[h] - TOL_MW && d < gap) { best = o; gap = d; }
    });
    if (best) return best;
  }
  return null;
}

/** Each border's capacity in use and its flow each way, beside the summary's congestion and rent. */
function borders(pb: Problem, r: Results, summary: BorderSummary[]): BorderView[] {
  const H = pb.hours;
  const days = Math.ceil(H / 24);
  const one = (code: string, cap: (h: number) => [number, number], flow: (h: number) => [number, number]): BorderView => {
    const s = summary.find((b) => b.border === code)!;
    const dailyCapFwd = new Float32Array(days), dailyCapRev = new Float32Array(days), dailyFlow = new Float32Array(days);
    let cf = 0, cr = 0, ef = 0, er = 0;
    for (let h = 0; h < H; h++) {
      const [f, rv] = cap(h), [sf, sr] = flow(h), d = (h / 24) | 0;
      cf += f; cr += rv; ef += sf; er += sr;
      dailyCapFwd[d] += f / 24; dailyCapRev[d] += rv / 24; dailyFlow[d] += (sf - sr) / 24;
    }
    return { ...s, capFwd: cf / H, capRev: cr / H, fwdTwh: ef / 1e6, revTwh: er / 1e6, dailyCapFwd, dailyCapRev, dailyFlow };
  };
  const out = LINKS.map((code, i) => one(code, (h) => [pb.links[i].fwd[h], pb.links[i].rev[h]],
    (h) => { const f = r.flow[i][h]; return [Math.max(0, f), Math.max(0, -f)]; }));
  pb.borders.forEach((b, k) => {
    const z = b.zone;
    const ji = boundaryOffers(pb.zones[z], "import", BORDERS[k].boundary);
    const je = boundaryOffers(pb.zones[z], "export", BORDERS[k].boundary);
    out.push(one(b.code, (h) => [b.ntcExp[h], b.ntcImp[h]], (h) => {
      let got = 0, sent = 0;
      for (const j of ji) got += r.offers[z][j][h];
      for (const j of je) sent += r.offers[z][j][h];
      return [sent, got / (1 - b.lossImp)];
    }));
  });
  return out;
}

function median(a: ArrayLike<number>): number {
  const s = Float64Array.from(a).sort();
  const n = s.length;
  return n % 2 ? s[(n - 1) >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

function fleetOf(pb: Problem, r: Results, z: number, installed: Record<string, number>): FleetRow[] {
  const H = pb.hours;
  const zone = pb.zones[z];
  const rows = new Map<string, FleetRow>();
  const row = (cls: string, kind: FleetRow["kind"]) => {
    let x = rows.get(cls);
    if (!x) rows.set(cls, (x = { cls, group: group(cls), installedMw: installed[cls] ?? null, bid: null, twh: 0, kind }));
    return x;
  };
  const byClass = new Map<string, number[]>();
  zone.offers.forEach((o, j) => {
    if (o.demand || o.cls === "import" || o.cls === "export" || o.cls === "dsr") return;
    byClass.set(o.cls, [...(byClass.get(o.cls) ?? []), j]);
  });
  for (const [cls, js] of byClass) {
    const x = row(cls, "offer");
    let sum = 0, n = 0, out = 0;
    for (let h = 0; h < H; h++) {
      let low = Infinity;
      for (const j of js) {
        out += r.offers[z][j][h];
        if (zone.offers[j].mw[h] > 0 && zone.offers[j].bid[h] < low) low = zone.offers[j].bid[h];
      }
      if (low < Infinity) { sum += low; n++; }
    }
    x.bid = n ? sum / n : null;
    x.twh += out / 1e6;
  }
  for (const f of zone.fixed) {
    let out = 0;
    for (let h = 0; h < H; h++) out += f.mw[h];
    row(f.cls, "given").twh += out / 1e6;
  }
  for (const u of r.units) if (u.zone === z) {
    const x = row(storageClass(u.name), "storage");
    x.kind = "storage";
    for (let h = 0; h < H; h++) x.twh += u.discharge[h] / 1e6;
  }
  if (pb.reservoir?.zone === z && r.reservoir) {
    const x = row("hydro_daugava", "reservoir");
    x.kind = "reservoir";
    for (let h = 0; h < H; h++) x.twh += r.reservoir.release[h] / 1e6;
    const v = r.reservoir.value;
    x.bid = v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; // the water value, each week's first window's (D-112)
  }
  return [...rows.values()].sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.cls.localeCompare(b.cls));
}

/** `installed`: per zone the capacity by class the run was built from (the scenario's fleet or
 * the observed year's), shown beside the fleet's bids; `fossilLevel`: the price from which a
 * neighbour's price counts as fossil (a scenario run's; D-037). */
export function view(pb: Problem, r: Results, installed: Record<string, number>[] = [{}, {}, {}], month: Uint8Array | null = null,
  fossilLevel: number | null = null): RunView {
  const H = pb.hours;
  const days = Math.ceil(H / 24);
  const s = summarise(pb, r);
  const zones = ZONES.map((code, z): ZoneView => {
    const zone = pb.zones[z];
    const daily = Object.fromEntries(GROUPS.map((g) => [g, new Float32Array(days)])) as Record<Group, Float32Array>;
    const consumption = new Float32Array(days);
    const netImport = new Float32Array(days);
    const add = (g: Group, a: ArrayLike<number>) => { const d = daily[g]; for (let h = 0; h < H; h++) d[(h / 24) | 0] += a[h]; };
    for (const f of zone.fixed) add(group(f.cls), f.mw);
    zone.offers.forEach((o, j) => {
      if (o.cls === "import" || o.cls === "export") return;
      if (o.demand) { const q = r.offers[z][j]; for (let h = 0; h < H; h++) consumption[(h / 24) | 0] += q[h]; }
      else if (o.cls !== "dsr") add(group(o.cls), r.offers[z][j]);
    });
    for (const u of r.units) if (u.zone === z) {
      add("storage", u.discharge);
      for (let h = 0; h < H; h++) consumption[(h / 24) | 0] += u.charge[h];
    }
    if (pb.reservoir?.zone === z && r.reservoir) add("hydro", r.reservoir.release);
    for (let h = 0; h < H; h++) consumption[(h / 24) | 0] += zone.load[h];
    // trade: the internal links on either side and the zone's boundary borders
    let imp = 0, exp = 0, impE = 0, expE = 0, congested = 0;
    const p = r.price[z];
    const bs = pb.borders.map((b, k) => ({ b, k })).filter(({ b }) => b.zone === z);
    const ji = bs.map(({ k }) => boundaryOffers(zone, "import", BORDERS[k].boundary));
    const je = bs.map(({ k }) => boundaryOffers(zone, "export", BORDERS[k].boundary));
    for (let h = 0; h < H; h++) {
      let inH = 0, outH = 0, sat = false;
      if (z > 0) { const f = r.flow[z - 1][h]; if (f > 0) inH += f; else outH -= f; sat ||= r.sat[z - 1][h] === 1; }
      if (z < ZONES.length - 1) { const f = r.flow[z][h]; if (f > 0) outH += f; else inH -= f; sat ||= r.sat[z][h] === 1; }
      bs.forEach(({ b }, i) => {
        let got = 0, out = 0;
        for (const j of ji[i]) got += r.offers[z][j][h];
        for (const j of je[i]) out += r.offers[z][j][h];
        inH += got;
        outH += out;
        sat ||= (got > 0 && got / (1 - b.lossImp) >= b.ntcImp[h] - 1e-6) || (out > 0 && out >= b.ntcExp[h] - 1e-6);
      });
      imp += inH; exp += outH; impE += inH * p[h]; expE += outH * p[h];
      netImport[(h / 24) | 0] += inH - outH;
      if (sat) congested++;
    }
    let fossil: ZoneView["fossil"] = null;
    if (fossilLevel !== null) {
      fossil = { unit: 0, gas: 0, neighbour: 0 };
      for (let h = 0; h < H; h++) {
        const o = marginal(pb, r, z, h);
        if (o && isFossil(o.cls)) {
          fossil.unit++;
          if (group(o.cls) === "gas") fossil.gas++;
        } else if (o && (o.cls === "import" || o.cls === "export") && p[h] >= fossilLevel) fossil.neighbour++;
      }
    }
    const gas = pb.zones[z].offers.map((o, j) => (!o.demand && o.cls.startsWith("gas_") ? j : -1)).filter((j) => j >= 0);
    let gasHours = 0;
    for (let h = 0; h < H; h++) if (gas.reduce((a, j) => a + r.offers[z][j][h], 0) > 1) gasHours++;
    const zs = s.zones[z];
    const mix = Object.fromEntries(GROUPS.map((g) => [g, 0])) as Record<Group, number>;
    for (const [cls, twh] of Object.entries(zs.gen)) mix[group(cls)] += twh;
    return {
      zone: code, mean: zs.price, median: median(p), importTwh: imp / 1e6, exportTwh: exp / 1e6,
      importMeur: impE / 1e6, exportMeur: expE / 1e6, congestedHours: congested, co2Mt: zs.co2Mt,
      curtailTwh: zs.curtailTwh, unservedMwh: zs.shedMwh, price: Float32Array.from(p), daily, netImport, consumption, mix,
      fleet: fleetOf(pb, r, z, installed[z] ?? {}), fossil, gasHours,
    };
  });
  let plant: RunView["plant"] = null;
  const ee = pb.zones[0];
  if (month && (ee.fixed.some((f) => f.cls === "nuclear") || ee.offers.some((o) => o.cls === "nuclear"))) {
    const mw = new Float32Array(H);
    for (const f of ee.fixed) if (f.cls === "nuclear") for (let h = 0; h < H; h++) mw[h] += f.mw[h];
    ee.offers.forEach((o, j) => { if (o.cls === "nuclear") for (let h = 0; h < H; h++) mw[h] += r.offers[0][j][h]; });
    plant = { mw, month };
  }
  return { hours: H, zones, borders: borders(pb, r, s.borders), units: s.units, plant, fossilLevel };
}
