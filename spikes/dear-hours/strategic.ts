// Kruonis in tranches (docs/research/2026-10-11_dear_hours.md, Phase 3): the plant's power split
// into k equal stores, the j-th charging at Δ + j·s €/MWh, so the programme runs its first
// tranche at the batteries' cycle cost and the others only on wider spreads — a convex cost of
// power, as a price-making operator that weighs what its own output does to the peak would run it
// (one parameter, s; a screen, not a model). With `top=` the Daugava may reach its week's maximum
// instead of its 90th-percentile hour. From app/: `node --no-maglev ../spikes/dear-hours/strategic.ts [years…]`.
import { runLP } from "../../app/src/engine/lp.ts";
import type { Problem, Storage } from "../../app/src/engine/problem.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { scenarioFor } from "../../app/scripts/validate_fit.ts";
import { tail } from "./tail.ts";

/** Kruonis as k stores, the j-th charging at Δ + j·s. */
export function tranches(pb: Problem, k: number, s: number): void {
  const i = pb.storage.findIndex((u) => u.name === "kruonis");
  const u = pb.storage[i];
  const part = (j: number): Storage => ({
    ...u, name: j ? `kruonis:${j}` : "kruonis", mw: u.mw / k, delta: u.delta + j * s,
    dischargeMax: u.dischargeMax ? u.dischargeMax.map((x) => x / k) : undefined,
    chargeMax: u.chargeMax ? u.chargeMax.map((x) => x / k) : undefined,
  });
  pb.storage.splice(i, 1, ...Array.from({ length: k }, (_, j) => part(j)));
}
/** Kruonis as its four units (900 MW / 4), the j-th charging at Δ + j·s; the week's power limits
 * (the replay's A75 maxima) fill the units in order, so a week that ran 400 MW at most has a
 * first unit of 225 MW at Δ and a second of 175 MW at Δ + s. */
export function units(pb: Problem, s: number, k = 4): void {
  const i = pb.storage.findIndex((u) => u.name === "kruonis");
  const u = pb.storage[i];
  const unit = (j: number): Storage => {
    const fill = (a: Float64Array, size: number) => a.map((x) => Math.min(size, Math.max(0, x - j * size)));
    return {
      ...u, name: j ? `kruonis:${j}` : "kruonis", mw: u.mw / k, delta: u.delta + j * s,
      dischargeMax: u.dischargeMax ? fill(u.dischargeMax, (u.mw * u.eff) / k) : undefined,
      chargeMax: u.chargeMax ? fill(u.chargeMax, u.mw / k) : undefined,
    };
  };
  pb.storage.splice(i, 1, ...Array.from({ length: k }, (_, j) => unit(j)));
}
/** Kruonis as one store again (its shares since D-115 summed) whose discharge runs in k equal
 * segments of the hour's power, segment j at j·s €/MWh delivered: a price-maker's rising cost of
 * output in the hour, the reservoir and the pumping left as they are (lp.ts dischargeSteps). */
export function segments(pb: Problem, s: number, k = 4): void {
  const parts = pb.storage.filter((u) => u.name.startsWith("kruonis"));
  const n = parts.length, u = parts[0];
  const one: Storage = {
    ...u, name: "kruonis", mw: u.mw * n,
    dischargeMax: u.dischargeMax?.map((x) => x * n), chargeMax: u.chargeMax?.map((x) => x * n),
    dischargeSteps: Array.from({ length: k }, (_, j) => j * s),
  };
  pb.storage = [...pb.storage.filter((x) => !x.name.startsWith("kruonis")), one];
}
/** The Daugava up to its week's maximum hour in place of its 90th percentile (D-044's band). */
export function daugavaTop(pb: Problem, yr: number): void {
  const mx = year(String(yr)).zones.LV.hydro_weekly_max_mw?.daugava as number[];
  pb.reservoir!.pmax = pb.reservoir!.pmax.map((x, w) => Math.max(x, mx[w] ?? x));
}

if (/[/\\]strategic\.ts$/.test(process.argv[1] ?? "")) {
  const { solve } = await loadSolver();
  const years = process.argv.slice(2).filter((a) => /^\d{4}$/.test(a)).map(Number);
  const VARIANTS: [string, (pb: Problem, yr: number) => void][] = [
    ["the engine of record", () => {}],
    ["Kruonis 4 tranches, s 30", (pb) => tranches(pb, 4, 30)],
    ["Kruonis 4 tranches, s 60", (pb) => tranches(pb, 4, 60)],
    ["Kruonis 4 tranches, s 120", (pb) => tranches(pb, 4, 120)],
    ["the Daugava to its week's maximum", (pb, yr) => daugavaTop(pb, yr)],
    ["… and Kruonis 4 tranches, s 60", (pb, yr) => { daugavaTop(pb, yr); tranches(pb, 4, 60); }],
  ];
  for (const yr of years.length ? years : [2023, 2024, 2025]) {
    const v = validation(String(yr));
    console.log(`\n== ${yr}: MAE EE/LV/LT (Σ) | LT record >250, 150–250 | model's >250 (h), 150–250 | ≥150 LV, LT | q99 LT | Kruonis TWh, hours on`);
    for (const [name, f] of VARIANTS) {
      const { pb, boundary } = scenarioFor(yr);
      f(pb, yr);
      const r = runLP(pb, solve);
      const t = tail(yr, pb, r, boundary);
      const mae = ZONES.map((z, i) => { let s = 0; for (let h = 0; h < pb.hours; h++) s += Math.abs(r.price[i][h] - v.price[z][h]); return s / pb.hours; });
      const lt = t[2], b = (x: { bin: string }[], k: string) => x.find((y) => y.bin.startsWith(k)) as { n: number; mean: number };
      let kt = 0, kh = 0;
      for (let h = 0; h < pb.hours; h++) { let d = 0; r.units.forEach((u) => { if (u.name.startsWith("kruonis")) d += u.discharge[h]; }); kt += d; if (d > 1) kh++; }
      console.log(`${name.padEnd(36)} ${mae.map((x) => x.toFixed(2)).join("/")} (${mae.reduce((s, x) => s + x, 0).toFixed(2)}) | ${b(lt.byObserved, "(250").mean} ${b(lt.byObserved, "(150").mean} | ${b(lt.byModel, "(250").mean} (${b(lt.byModel, "(250").n}) ${b(lt.byModel, "(150").mean} | ${t[1].share150[0]}, ${lt.share150[0]} | ${lt.quantiles[3].model} | ${(kt / 1e6).toFixed(2)} TWh, ${kh} h`);
    }
  }
}
