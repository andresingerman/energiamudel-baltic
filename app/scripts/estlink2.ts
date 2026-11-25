// The EstLink 2 gate (SPECIFICATION.md R-VAL-6, R-LINK-8; PLAN §3.7): the replay with the observed
// offered capacity against the same year with EstLink 2 in service — inside the A78 outage
// windows NTC_cf = min(the EE–FI nameplate, A31 + 650 MW) in both directions, outside them A31.
// `node --no-maglev scripts/estlink2.ts` prints the effect, writes data/derived/validation/estlink2.json and exits
// 1 when the 2024 effect lies outside 15–30 €/MWh.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Year } from "../src/contract/year.ts";
import { build } from "../src/engine/build.ts";
import type { LpSolver } from "../src/engine/lp.ts";
import { runLP } from "../src/engine/lp.ts";
import { replay } from "../src/state/scenario.ts";
import { EXPORT, presets, validation, year } from "./data.ts";
import { loadSolver } from "./highs.ts";

/** A78 (ENTSO-E) outages of EstLink 2, cable fault to return to service. */
export const OUTAGES = [
  { from: "2024-01-25T22:00:00Z", to: "2024-09-03T22:00:00Z" },
  { from: "2024-12-25T10:00:00Z", to: "2025-06-19T09:00:00Z" },
];
const ESTLINK2_MW = 650;

const hourOf = (yr: number, iso: string) => Math.floor((Date.parse(iso) - Date.UTC(yr, 0, 1)) / 3.6e6);

export function counterfactual(y: Year, nameplate: number): { y: Year; hours: number[] } {
  const yr = y.meta.year;
  const H = y.meta.hours;
  const b = y.borders["EE-FI"];
  const fwd = [...b.ntc_fwd];
  const rev = [...b.ntc_rev];
  const hours: number[] = [];
  for (const o of OUTAGES) {
    const h0 = Math.max(0, hourOf(yr, o.from));
    const h1 = Math.min(H, hourOf(yr, o.to));
    for (let h = h0; h < h1; h++) {
      fwd[h] = Math.min(nameplate, fwd[h] + ESTLINK2_MW);
      rev[h] = Math.min(nameplate, rev[h] + ESTLINK2_MW);
      hours.push(h);
    }
  }
  return { y: { ...y, borders: { ...y.borders, "EE-FI": { ...b, ntc_fwd: fwd, ntc_rev: rev } } }, hours };
}

/** The gate's figures for 2024 and 2025 and its verdict, as estlink2.json holds them (`log`: printed too). */
export function estlink2(solve: LpSolver, log = false): Record<string, unknown> {
  const p = presets();
  const nameplate = p.parameters["validation.ntc_nameplate.ee_fi"]?.value;
  if (!nameplate) throw new Error("EE–FI nameplate missing");
  const mean = (a: ArrayLike<number>, hs: number[]) => hs.reduce((s, h) => s + a[h], 0) / hs.length;
  const out: Record<string, unknown> = {};
  for (const yr of [2024, 2025]) {
    const y = year(String(yr));
    const v = validation(String(yr));
    const fi = y.boundary.FI.observed;
    const all = Array.from({ length: y.meta.hours }, (_, h) => h);
    const { y: ycf, hours } = counterfactual(y, nameplate);
    const pb = build(y, p, null, replay(p, y));
    const pbcf = build(ycf, p, null, replay(p, ycf));
    const r = runLP(pb, solve);
    const rcf = runLP(pbcf, solve);
    // FI → EE: the model's import at its limit; observed, EE above FI (market coupling, no loss factor)
    const j = pb.zones[0].offers.findIndex((o) => o.name === "import:FI");
    const b = pb.borders[0];
    const sent = (pbx: typeof pb, rx: typeof r, h: number) => rx.offers[0][j][h] / (1 - pbx.borders[0].lossImp);
    const saturated = (pbx: typeof pb, rx: typeof r, hs: number[]) => hs.filter((h) => sent(pbx, rx, h) >= pbx.borders[0].ntcImp[h] - 1e-6).length / hs.length;
    const aboveFi = (pp: ArrayLike<number>, hs: number[]) => hs.filter((h) => pp[h] - fi[h] > 0.005).length / hs.length;
    const months: Record<string, number> = {};
    for (let m = 0; m < 12; m++) {
      const hs = hours.filter((h) => new Date(Date.UTC(yr, 0, 1) + h * 3.6e6).getUTCMonth() === m);
      if (hs.length >= 24 * 28) months[String(m + 1).padStart(2, "0")] = mean(r.price[0], hs) - mean(rcf.price[0], hs);
    }
    const row = {
      outage_hours: hours.length,
      ee_price_outage: { model: mean(r.price[0], hours), counterfactual: mean(rcf.price[0], hours), observed: mean(v.price.EE, hours), fi: mean(fi, hours) },
      effect_eur_mwh: mean(r.price[0], hours) - mean(rcf.price[0], hours),
      effect_by_full_month: months,
      fi_to_ee_congested_outage: { model: saturated(pb, r, hours), counterfactual: saturated(pbcf, rcf, hours), observed: aboveFi(v.price.EE, hours) },
      fi_to_ee_congested_year: { model: saturated(pb, r, all), counterfactual: saturated(pbcf, rcf, all), observed: aboveFi(v.price.EE, all) },
      estlink_loading_fi_to_ee_outage: hours.reduce((s, h) => s + sent(pb, r, h), 0) / hours.reduce((s, h) => s + b.ntcImp[h], 0),
      ee_fi_spread_year: { model: mean(r.price[0], all) - mean(fi, all), observed: mean(v.price.EE, all) - mean(fi, all) },
    };
    out[String(yr)] = row;
    if (log) console.log(yr, JSON.stringify(row, (_, x) => (typeof x === "number" ? Math.round(x * 100) / 100 : x)));
    if (yr === 2025) {
      // UTC weeks from 1 January; week 6 (12–18 February) holds the observed EE 184 / FI 84.6 week
      const weeks: Record<string, { model: number; observed: number }> = {};
      for (let w = 4; w <= 8; w++) {
        const hs = Array.from({ length: 168 }, (_, i) => w * 168 + i);
        weeks[`w${w}`] = { model: mean(r.price[0], hs) - mean(fi, hs), observed: mean(v.price.EE, hs) - mean(fi, hs) };
      }
      if (log) console.log("EE–FI weekly spread, €/MWh:", JSON.stringify(weeks, (_, x) => (typeof x === "number" ? Math.round(x) : x)));
      row["feb_weekly_spread" as keyof typeof row] = weeks as never;
    }
  }
  const e = (out["2024"] as { effect_eur_mwh: number }).effect_eur_mwh;
  const pass = e >= 15 && e <= 30;
  out.gate = { rule: "R-VAL-6: 2024 EE average price over the outage higher by 15-30 EUR/MWh than with EstLink 2 in service; FI exogenous (never symmetric)", pass };
  return out;
}

/** estlink2.json's text: the figures to three decimals. */
export const estlink2Json = (out: Record<string, unknown>) => JSON.stringify(out, (_, x) => (typeof x === "number" ? Math.round(x * 1000) / 1000 : x), 1) + "\n";

if (process.argv[1]?.endsWith("estlink2.ts")) {
  const out = estlink2((await loadSolver()).solve, true);
  writeFileSync(join(EXPORT, "..", "derived", "validation", "estlink2.json"), estlink2Json(out));
  const pass = (out.gate as { pass: boolean }).pass;
  console.log(`R-VAL-6 gate ${pass ? "met" : "NOT met"}`);
  if (!pass) process.exitCode = 1;
}
