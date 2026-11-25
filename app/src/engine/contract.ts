// The contract account of the plant (R-SMR-3, R-SMR-6; PLAN §3.4): for strike S and the plant's
// hourly output q_h, what the state pays the operator in a year under each design, on the run with
// the plant, so that the plant's own depression of the Estonian price is inside the figure.
// (a) two-sided CfD settled hourly: Σ (S − p_h)·q_h; (b) settled on the month's simple average
// price: Σ_m (S − p̄_m)·Q_m; (c), (d) collars 80–100 and 70–110 settled hourly: the state pays
// (lo − p_h)·q_h below the collar and receives (p_h − hi)·q_h above it. Under the clause of v4
// D-061 an hour priced at or below 0 settles at the market price and leaves (b)'s average; an hour
// counts as at 0 up to ZERO, the plant's own clause bid with the LP's perturbation (M6), and below 0
// where a negative boundary price sets it (an export at a neighbour's negative price).

import { CLAUSE_BID } from "./build.ts";
import { PERTURB_MAX } from "./lp.ts";

export type Design = "hourly" | "monthly" | "collar_80_100" | "collar_70_110";
/** €/MWh: the model's zero — up to the plant's clause bid with the LP's perturbation, so that an
 * hour the plant prices itself as it turns down is a clause hour like one wind and solar price at
 * their 0 (ERRATA E-052). */
export const ZERO = CLAUSE_BID + PERTURB_MAX;
export const DESIGNS: Design[] = ["hourly", "monthly", "collar_80_100", "collar_70_110"];

export interface Account {
  stateMeur: number; // what the state pays in the year, M€ (negative: the operator pays back)
  operatorEurMwh: number; // the operator's income per MWh: market revenue and the difference paid
  captureEurMwh: number; // the market revenue per MWh
  outputTwh: number;
  statePays: number; // settlement periods (hours, or months for (b)) in which the state pays
  operatorPays: number; // … in which the operator pays
}

/** One year's account; `month` gives each hour's month (0–11). */
export function account(price: ArrayLike<number>, q: ArrayLike<number>, month: ArrayLike<number>, strike: number, design: Design, clause: boolean): Account {
  const H = q.length;
  let out = 0, market = 0, pay = 0, sp = 0, op = 0;
  const settles = (h: number) => !(clause && price[h] <= ZERO);
  for (let h = 0; h < H; h++) {
    out += q[h];
    market += q[h] * price[h];
  }
  if (design === "monthly") {
    const e = new Float64Array(12), sum = new Float64Array(12), n = new Float64Array(12);
    for (let h = 0; h < H; h++) {
      if (!settles(h)) continue;
      e[month[h]] += q[h];
      sum[month[h]] += price[h];
      n[month[h]]++;
    }
    for (let m = 0; m < 12; m++) {
      if (n[m] === 0 || e[m] === 0) continue;
      const d = (strike - sum[m] / n[m]) * e[m];
      pay += d;
      if (d > 0) sp++;
      else if (d < 0) op++;
    }
  } else {
    const [lo, hi] = design === "hourly" ? [strike, strike] : design === "collar_80_100" ? [80, 100] : [70, 110];
    for (let h = 0; h < H; h++) {
      if (q[h] <= 0 || !settles(h)) continue;
      const d = price[h] < lo ? (lo - price[h]) * q[h] : price[h] > hi ? (hi - price[h]) * q[h] : 0;
      pay += d;
      if (d > 0) sp++;
      else if (d < 0) op++;
    }
  }
  return {
    stateMeur: pay / 1e6, operatorEurMwh: out > 0 ? (market + pay) / out : 0, captureEurMwh: out > 0 ? market / out : 0,
    outputTwh: out / 1e6, statePays: sp, operatorPays: op,
  };
}
