// The market the engine clears (SPECIFICATION.md §8.3; docs/methodology.md §5). build.ts turns a
// year file, the presets and a scenario into a Problem; lp.ts sees nothing else, and reference/lp.py
// solves the same object for the gap of R-ENG-8.

/** The core zones on their path; the order is the path's. */
export const ZONES = ["EE", "LV", "LT"] as const;
export type ZoneCode = (typeof ZONES)[number];

/** A UTC week of the run, its weekly budgets' period (R-ENG-8); the last week of a year is shorter. */
export const WEEK_HOURS = 168;

/** Internal links: LINKS[i] joins ZONES[i] and ZONES[i + 1]; a positive flow runs towards LT. */
export const LINKS = ["EE-LV", "LV-LT"] as const;

/** Boundary borders (R-BND-1) and the core zone each attaches to; `fwd` is out of the core zone. */
export const BORDERS = [
  { code: "EE-FI", zone: 0, boundary: "FI" },
  { code: "LT-SE4", zone: 2, boundary: "SE4" },
  { code: "LT-PL", zone: 2, boundary: "PL" },
] as const;

/** A price-responsive quantity of one zone, up to `mw`: a supply offer runs when the price is above
 * its bid, a demand offer consumes when the price is below it. Hourly arrays have the problem's
 * length. */
export interface Offer {
  name: string; // unique in the zone: "gas_ccgt", "import:FI", "dsr:0", …
  cls: string; // what results add it up under: an R-SUP-1 class, "import", "export", "dsr", …
  demand: boolean;
  bid: Float64Array; // €/MWh
  mw: Float64Array; // MW
  co2: number; // t CO2 per MWh
  hoursPerDay: number; // DSR: full-load hours per UTC day (R-DEM-6); 0 = no limit
}

/** Output that runs whatever the price: given observed output, must-run, the plant's floor. */
export interface Fixed {
  cls: string;
  mw: Float64Array;
  co2: number; // t CO2 per MWh
}

export interface Zone {
  load: Float64Array; // inflexible demand, MW
  fixed: Fixed[];
  offers: Offer[];
  /** Upward reserve the zone could not hold on its flexible fleet, MW (R-SUP-7): reported. */
  reserveUnmet: Float64Array;
}

/** A storage unit (R-ENG-8): `mw` from the grid at most, `mw·eff` to the grid, `hours` of energy at
 * full power. `budget` limits the energy it draws per `period` hours, in hours at full power (the
 * daily cycle cap of R-PAR-5; Kruonis's observed weekly output, D-018); null = no limit. Neither is
 * rounded to whole steps, as the two-pass engine's table needed (ERRATA E-124; D-138). */
export interface Storage {
  name: string;
  zone: number;
  mw: number;
  hours: number;
  eff: number;
  delta: number; // €/MWh charged (R-PAR-6)
  period: number;
  budget: Float64Array | null;
  // a replay's Kruonis (D-073): MW per hour the unit may charge, and deliver, where less than `mw`
  // and `mw × eff`. The engine of record and the reference honour them.
  chargeMax?: Float64Array;
  dischargeMax?: Float64Array;
  // the engine of record's discharge in equal segments of the hour's power, each costing its step
  // (€/MWh delivered) above nothing for the first; absent, one segment.
  dischargeSteps?: number[];
}

/** The Daugava cascade (R-ENG-5): a weekly energy budget released within the UTC week. */
export interface Reservoir {
  zone: number;
  budget: Float64Array; // MWh per week (week = hour / 168)
  pmax: Float64Array; // MW per week
  pmin: Float64Array; // MW per week, the documented minimum flow
}

/** One boundary border as built: the price and capacity behind its two offers, for results. */
export interface Border {
  code: string;
  zone: number;
  price: Float64Array; // €/MWh, the profile times its level factor
  ntcImp: Float64Array; // MW into the core zone (sent)
  ntcExp: Float64Array; // MW out of the core zone (sent)
  lossImp: number; // share of what is sent that is lost (R-BND-4)
  lossExp: number;
}

/** Oil shale's market entry (R-SUP-4, D-113): the zone whose oil-shale classes commit by the UTC
 * day on the first pass's price, and per class ERAA's minimum time on (h) and minimum stable load
 * (share of the megawatts available in the hour), and a warm start's cost with its fuel (€/MW). */
export interface Entry { zone: number; classes: { cls: string; minOn: number; minLoad: number; start: number }[] }

export interface Problem {
  hours: number;
  voll: number; // €/MWh (R-PAR-1)
  floor: number; // €/MWh (R-PAR-2)
  zones: Zone[]; // as ZONES
  links: { fwd: Float64Array; rev: Float64Array }[]; // as LINKS; MW the market may use
  borders: Border[]; // as BORDERS
  storage: Storage[];
  reservoir: Reservoir | null;
  entry?: Entry | null; // absent or null: the problem clears in one pass
}

/** The offers of a boundary border in its zone: one each way, or the slope's tranches (R-BND-6). */
export function boundaryOffers(zone: Zone, dir: "import" | "export", boundary: string): number[] {
  const out: number[] = [];
  zone.offers.forEach((o, j) => {
    if (o.name === `${dir}:${boundary}` || o.name.startsWith(`${dir}:${boundary}:`)) out.push(j);
  });
  return out;
}

/** Hours h0..h1−1 of a problem as a problem of their own; h0 must start a week so that the
 * weekly and daily budgets keep their periods (the test weeks of R-ENG-8). */
export function slice(pb: Problem, h0: number, h1: number): Problem {
  if (h0 % WEEK_HOURS !== 0 || h1 <= h0 || h1 > pb.hours) throw new Error(`slice ${h0}..${h1} of ${pb.hours} h`);
  const s = (a: Float64Array) => a.slice(h0, h1);
  return {
    hours: h1 - h0,
    voll: pb.voll,
    floor: pb.floor,
    zones: pb.zones.map((z) => ({
      load: s(z.load),
      fixed: z.fixed.map((f) => ({ ...f, mw: s(f.mw) })),
      offers: z.offers.map((o) => ({ ...o, bid: s(o.bid), mw: s(o.mw) })),
      reserveUnmet: s(z.reserveUnmet),
    })),
    links: pb.links.map((l) => ({ fwd: s(l.fwd), rev: s(l.rev) })),
    borders: pb.borders.map((b) => ({ ...b, price: s(b.price), ntcImp: s(b.ntcImp), ntcExp: s(b.ntcExp) })),
    storage: pb.storage.map((u) => ({
      ...u,
      budget: u.budget ? u.budget.slice(h0 / u.period, Math.ceil(h1 / u.period)) : null,
      ...(u.chargeMax ? { chargeMax: s(u.chargeMax) } : {}),
      ...(u.dischargeMax ? { dischargeMax: s(u.dischargeMax) } : {}),
    })),
    reservoir: pb.reservoir ? {
      ...pb.reservoir,
      budget: pb.reservoir.budget.slice(h0 / WEEK_HOURS, Math.ceil(h1 / WEEK_HOURS)),
      pmax: pb.reservoir.pmax.slice(h0 / WEEK_HOURS, Math.ceil(h1 / WEEK_HOURS)),
      pmin: pb.reservoir.pmin.slice(h0 / WEEK_HOURS, Math.ceil(h1 / WEEK_HOURS)),
    } : null,
    entry: pb.entry ?? null,
  };
}
