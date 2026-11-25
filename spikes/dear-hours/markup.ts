// The utilisation markup's three forms (docs/research/2026-10-11_dear_hours.md, Phase 1.5) on a
// problem built without one: "remainder" is build.ts's applyMarkup (each flexible gas offer, what
// the floors leave of it, split by shares of that remainder's weekly maximum: in an hour whose
// floor is high the remainder fills the low tranches only); "v4" splits each hour's remainder
// 50/25/15/10 % (v4 D-032, model/week.py); "fleet" places the remainder at its share of the
// fleet's weekly maximum above the floors (R-SUP-6's "utilisation … of its flexible thermal
// fleet", D-022 item 1). From app/: `node --no-maglev ../spikes/dear-hours/markup.ts [years…]`.
import type { PerZone } from "../../app/src/engine/build.ts";
import { FLEX, MARKUP_EDGES, build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import type { Offer, Problem } from "../../app/src/engine/problem.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { tail } from "./tail.ts";

export type Form = "remainder" | "v4" | "fleet";
const E = MARKUP_EDGES;

/** A replay of `yr` with no markup, for `remark` to split. */
export function bare(yr: number): { pb: Problem; boundary: Record<string, number[]> } {
  const p = presets(), y = year(String(yr));
  const zero = Object.fromEntries(ZONES.map((z) => [z, [0, 0, 0, 0]])) as PerZone<number[]>;
  return { pb: build(y, p, null, { ...replay(p, y), markup: zero }), boundary: { FI: y.boundary.FI.observed, SE4: y.boundary.SE4.observed, PL: y.boundary.PL.observed } };
}

export function remark(pb: Problem, m: PerZone<number[]>, form: Form): void {
  const H = pb.hours;
  pb.zones.forEach((zone, z) => {
    const mk = m[ZONES[z]];
    if (mk.every((x) => x === 0)) return;
    const out: Offer[] = [];
    for (const o of zone.offers) {
      if (o.demand || !FLEX.has(o.cls)) { out.push(o); continue; }
      const floors = zone.fixed.filter((f) => f.cls === o.cls);
      const floor = (h: number) => floors.reduce((s, f) => s + f.mw[h], 0);
      const tr = mk.map((x, k) => ({ ...o, name: `${o.name}:t${k}`, bid: new Float64Array(H), mw: new Float64Array(H) }));
      for (let w = 0; w * 168 < H; w++) {
        const h0 = w * 168, h1 = Math.min(H, h0 + 168);
        let topRem = 0, topFleet = 0;
        for (let h = h0; h < h1; h++) { topRem = Math.max(topRem, o.mw[h]); topFleet = Math.max(topFleet, o.mw[h] + floor(h)); }
        for (let h = h0; h < h1; h++) {
          const a = floor(h), b = a + o.mw[h];
          tr.forEach((t, k) => {
            t.bid[h] = o.bid[h] + mk[k];
            if (form === "remainder") { const lo = E[k] * topRem, wd = (E[k + 1] - E[k]) * topRem, x = o.mw[h] - lo; t.mw[h] = x <= 0 ? 0 : x < wd ? x : wd; }
            else if (form === "v4") t.mw[h] = (E[k + 1] - E[k]) * o.mw[h];
            else t.mw[h] = Math.max(0, Math.min(b, E[k + 1] * topFleet) - Math.max(a, E[k] * topFleet));
          });
        }
      }
      out.push(...tr);
    }
    zone.offers = out;
  });
}

export const REGISTER = [37.5, 147.5, 237.5, 257.5];
export const onLvLt = (m: number[]) => Object.fromEntries(ZONES.map((z) => [z, z === "EE" ? [0, 0, 0, 0] : m])) as PerZone<number[]>;

if (/[/\\]markup\.ts$/.test(process.argv[1] ?? "")) {
  const { solve } = await loadSolver();
  const years = process.argv.slice(2).filter((a) => /^\d{4}$/.test(a)).map(Number);
  for (const yr of years.length ? years : [2023, 2024, 2025]) {
    const v = validation(String(yr));
    console.log(`\n== ${yr} at the register's schedule: MAE EE/LV/LT (Σ) | LT record >250, 150–250 | model's >250 (h), 150–250 | ≥150 LV, LT model/record | q99 LT | LV gas TWh model/record`);
    for (const form of ["remainder", "v4", "fleet"] as Form[]) {
      const { pb, boundary } = bare(yr);
      remark(pb, onLvLt(REGISTER), form);
      const r = runLP(pb, solve);
      const t = tail(yr, pb, r, boundary);
      const mae = ZONES.map((z, i) => { let s = 0; for (let h = 0; h < pb.hours; h++) s += Math.abs(r.price[i][h] - v.price[z][h]); return s / pb.hours; });
      const lt = t[2], b = (x: { bin: string }[], k: string) => x.find((y) => y.bin.startsWith(k)) as { n: number; mean: number };
      let g = 0, gr = 0;
      pb.zones[1].offers.forEach((o, j) => { if (FLEX.has(o.cls)) for (let h = 0; h < pb.hours; h++) g += r.offers[1][j][h]; });
      for (const f of pb.zones[1].fixed) if (FLEX.has(f.cls)) for (let h = 0; h < pb.hours; h++) g += f.mw[h];
      for (let h = 0; h < pb.hours; h++) gr += v.gen.LV.gas[h];
      console.log(`${form.padEnd(10)} ${mae.map((x) => x.toFixed(2)).join("/")} (${mae.reduce((s, x) => s + x, 0).toFixed(2)}) | ${b(lt.byObserved, "(250").mean} ${b(lt.byObserved, "(150").mean} | ${b(lt.byModel, "(250").mean} (${b(lt.byModel, "(250").n}) ${b(lt.byModel, "(150").mean} | ${t[1].share150.join("/")}, ${lt.share150.join("/")} | ${lt.quantiles[3].model}/${lt.quantiles[3].record} | ${(g / 1e6).toFixed(2)}/${(gr / 1e6).toFixed(2)}`);
    }
  }
}
