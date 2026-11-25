// The validation protocol's metrics on hourly price series (SPECIFICATION.md R-VAL-3, R-VAL-4),
// shared by app/scripts/validate_fit.ts and the replay cards of the application (R-APP-2).

/** Linear-interpolated quantile of sorted values. */
export function quantile(sorted: Float64Array, q: number): number {
  const x = q * (sorted.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  return i + 1 < sorted.length ? sorted[i] * (1 - f) + sorted[i + 1] * f : sorted[i];
}

/** RMSE between two price duration curves on 100 quantiles, (k + 0.5)/100 (R-VAL-3). */
export function durationRmse(model: ArrayLike<number>, observed: ArrayLike<number>): number {
  const a = Float64Array.from(model).sort();
  const b = Float64Array.from(observed).sort();
  let s = 0;
  for (let k = 0; k < 100; k++) {
    const q = (k + 0.5) / 100;
    s += (quantile(a, q) - quantile(b, q)) ** 2;
  }
  return Math.sqrt(s / 100);
}

export function mae(model: ArrayLike<number>, observed: ArrayLike<number>): number {
  let s = 0;
  for (let h = 0; h < observed.length; h++) s += Math.abs(model[h] - observed[h]);
  return s / observed.length;
}

export const shareAtLeast = (a: ArrayLike<number>, v: number) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] >= v) n++; return n / a.length; };

/** The price spread's distribution, b − a: 10th, 50th and 90th percentiles (R-VAL-4). */
export function spreadQuantiles(pa: ArrayLike<number>, pb: ArrayLike<number>): number[] {
  const d = Float64Array.from({ length: pa.length }, (_, h) => pb[h] - pa[h]).sort();
  return [0.1, 0.5, 0.9].map((q) => quantile(d, q));
}

/** Observed congestion in the direction a → b: b's price above a's (Konkurentsiamet's
 * bottleneck hours); the model's: the link on its limit that way (its HVDC losses open a price
 * band without congestion). */
export function observedCongested(pa: ArrayLike<number>, pb: ArrayLike<number>): number {
  let n = 0;
  for (let h = 0; h < pa.length; h++) if (pb[h] - pa[h] > 0.005) n++;
  return n / pa.length;
}

export const mean = (a: ArrayLike<number>): number => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s / a.length; };

/** R-VAL-1: the years every parameter is fitted on, then frozen (as validate/fitted.py's FIT_YEARS). */
export const FIT_YEARS = [2023, 2024];
/** R-VAL-5's thresholds; they bind in the fit years and the blind year. */
export const GATE_YEARS = [2023, 2024, 2025];
export const THRESHOLD = {
  maeEurMwh: 15,
  durationRmseEurMwh: 10,
  share150Pp: 3,
  genShare: 0.1,
  genMinTwh: 0.2,
  netFlowShare: 0.15,
  congestedPp: 10,
};

type Pair = { model: number; observed: number };

/** A replayed year measured against the observed one (R-VAL-3, R-VAL-4): what validate_fit writes to
 * data/derived/validation/<year>.json and the calibration page reads (R-APP-7). */
export interface Evaluation {
  year: number;
  zones: Record<string, { mae: number; bias: number; durationRmse: number; share150: Pair; gen: Record<string, Pair> }>;
  borders: Record<string, { netFlowTwh: Pair; congested: { fwd: Pair; rev: Pair }; rentMeur: number; spread: { model: number[]; observed: number[] } }>;
  failures: string[];
}

/** Each metric of R-VAL-5 within its threshold: validate_fit's breaches and the page's cells. */
export const within = {
  mae: (x: number) => x <= THRESHOLD.maeEurMwh,
  durationRmse: (x: number) => x <= THRESHOLD.durationRmseEurMwh,
  share150: (m: Pair) => Math.abs(100 * (m.model - m.observed)) <= THRESHOLD.share150Pp,
  gen: (g: Pair) => (g.observed < THRESHOLD.genMinTwh && g.model < THRESHOLD.genMinTwh)
    || Math.abs((g.model - g.observed) / Math.max(g.observed, 1e-9)) <= THRESHOLD.genShare,
  netFlow: (f: Pair) => Math.abs((f.model - f.observed) / Math.max(Math.abs(f.observed), 1e-9)) <= THRESHOLD.netFlowShare,
  congested: (c: Pair) => Math.abs(100 * (c.model - c.observed)) <= THRESHOLD.congestedPp,
};
