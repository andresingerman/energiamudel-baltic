// What a run reports (R-ENG-8, R-BND-7, R-VAL-3/4 inputs): annual figures per zone, border and
// storage unit, and the zone-hour energy balance the tests hold to 1e-6 MW (R-NFR-8).

import { RENEWABLE } from "./build.ts";
import type { Results } from "./index.ts";
import type { Problem } from "./problem.ts";
import { BORDERS, LINKS, ZONES, boundaryOffers } from "./problem.ts";

/** Zone z's energy balance in hour h, MW: zero when the books close. */
export function imbalance(pb: Problem, r: Results, z: number, h: number): number {
  const zone = pb.zones[z];
  let x = -zone.load[h] + r.shed[z][h] - r.spill[z][h];
  for (const f of zone.fixed) x += f.mw[h];
  zone.offers.forEach((o, j) => {
    x += o.demand ? -r.offers[z][j][h] : r.offers[z][j][h];
  });
  if (z > 0) x += r.flow[z - 1][h];
  if (z < ZONES.length - 1) x -= r.flow[z][h];
  for (const u of r.units) if (u.zone === z) x += u.discharge[h] - u.charge[h];
  if (pb.reservoir && pb.reservoir.zone === z && r.reservoir) x += r.reservoir.release[h];
  return x;
}

export interface ZoneSummary {
  zone: string;
  price: number; // average €/MWh
  loadTwh: number;
  shedMwh: number;
  spillMwh: number;
  gen: Record<string, number>; // TWh per class, fixed output included
  curtailTwh: number; // wind and solar offered but not taken
  co2Mt: number;
  reserveUnmetMwh: number;
}

export interface BorderSummary {
  border: string;
  flowTwh: number; // + = towards the second zone of the code (EE→LV, LV→LT, EE→FI, LT→SE4, LT→PL)
  congestedFwd: number; // share of hours on the limit in that direction
  congestedRev: number;
  rentMeur: number; // congestion rent, M€
}

export interface UnitSummary {
  name: string;
  dischargeMwh: number;
  chargeMwh: number;
  endMwh: number;
}

export interface Summary {
  hours: number;
  zones: ZoneSummary[];
  borders: BorderSummary[];
  units: UnitSummary[];
  reservoir: { releaseTwh: number; spilledMwh: number; leftMwh: number } | null;
}

/** The class a storage unit's output counts under: the batteries', or Kruonis's pumped hydro. */
export const storageClass = (name: string): "battery" | "hydro_ps" => (name.startsWith("battery") ? "battery" : "hydro_ps");

/** €/MWh: two prices this close are one (above the LP's perturbation, as view.ts takes them). */
const SAME_PRICE = 0.005;

/** The way an internal link is at its limit in an hour (R-BND-7, R-VAL-4): the way its flow runs; with
 * no flow — its limit 0 — the way the prices pull, towards the dearer zone, and with equal prices
 * neither (D-135). */
export function congestedWay(flow: number, pa: number, pb: number): "fwd" | "rev" | null {
  if (flow > 1e-6) return "fwd";
  if (flow < -1e-6) return "rev";
  return pb > pa + SAME_PRICE ? "fwd" : pa > pb + SAME_PRICE ? "rev" : null;
}

const sum = (a: ArrayLike<number>): number => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return s;
};

export function summarise(pb: Problem, r: Results): Summary {
  const H = pb.hours;
  const zones = ZONES.map((code, z): ZoneSummary => {
    const zone = pb.zones[z];
    const gen: Record<string, number> = {};
    let co2 = 0;
    let curtail = 0;
    for (const f of zone.fixed) {
      const e = sum(f.mw);
      gen[f.cls] = (gen[f.cls] ?? 0) + e / 1e6;
      co2 += e * f.co2;
    }
    zone.offers.forEach((o, j) => {
      if (o.demand || o.cls === "import" || o.cls === "dsr") return;
      const e = sum(r.offers[z][j]);
      gen[o.cls] = (gen[o.cls] ?? 0) + e / 1e6;
      co2 += e * o.co2;
      if ((RENEWABLE as readonly string[]).includes(o.cls)) curtail += sum(o.mw) - e;
    });
    for (const u of r.units) if (u.zone === z) gen[storageClass(u.name)] = sum(u.discharge) / 1e6;
    if (pb.reservoir?.zone === z && r.reservoir) gen.hydro_daugava = sum(r.reservoir.release) / 1e6;
    return {
      zone: code, price: sum(r.price[z]) / H, loadTwh: sum(zone.load) / 1e6, shedMwh: sum(r.shed[z]),
      spillMwh: sum(r.spill[z]), gen, curtailTwh: curtail / 1e6, co2Mt: co2 / 1e6,
      reserveUnmetMwh: sum(zone.reserveUnmet),
    };
  });
  const borders: BorderSummary[] = [];
  LINKS.forEach((code, i) => {
    let fwd = 0;
    let rev = 0;
    let rent = 0;
    for (let h = 0; h < H; h++) {
      const f = r.flow[i][h];
      if (r.sat[i][h]) {
        const way = congestedWay(f, r.price[i][h], r.price[i + 1][h]);
        if (way === "fwd") fwd++;
        else if (way === "rev") rev++;
      }
      rent += Math.abs(f * (r.price[i + 1][h] - r.price[i][h]));
    }
    borders.push({ border: code, flowTwh: sum(r.flow[i]) / 1e6, congestedFwd: fwd / H, congestedRev: rev / H, rentMeur: rent / 1e6 });
  });
  pb.borders.forEach((b, k) => {
    const z = b.zone;
    const ji = boundaryOffers(pb.zones[z], "import", BORDERS[k].boundary);
    const je = boundaryOffers(pb.zones[z], "export", BORDERS[k].boundary);
    let flow = 0;
    let fwd = 0;
    let rev = 0;
    let rent = 0;
    for (let h = 0; h < H; h++) {
      let got = 0; // received in the core zone
      for (const j of ji) got += r.offers[z][j][h];
      const sent = got / (1 - b.lossImp);
      let out = 0; // sent from the core zone
      for (const j of je) out += r.offers[z][j][h];
      flow += out - sent;
      if (sent > 0 && sent >= b.ntcImp[h] - 1e-6) rev++;
      if (out > 0 && out >= b.ntcExp[h] - 1e-6) fwd++;
      rent += got * r.price[z][h] - sent * b.price[h] + out * (1 - b.lossExp) * b.price[h] - out * r.price[z][h];
    }
    borders.push({ border: b.code, flowTwh: flow / 1e6, congestedFwd: fwd / H, congestedRev: rev / H, rentMeur: rent / 1e6 });
  });
  const units = r.units.map((u): UnitSummary => ({
    name: u.name, dischargeMwh: sum(u.discharge), chargeMwh: sum(u.charge), endMwh: u.endMwh,
  }));
  const reservoir = r.reservoir
    ? { releaseTwh: sum(r.reservoir.release) / 1e6, spilledMwh: r.reservoir.spilled, leftMwh: r.reservoir.leftMwh }
    : null;
  return { hours: H, zones, borders, units, reservoir };
}
