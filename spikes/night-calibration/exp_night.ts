// Night experiments (2026-10-04): one change per full-year run of 2023, 2024, 2025 (PLAN §4 M3's
// protocol), made on the built Problem or the presets so the engine is untouched until a change
// is kept. `node --no-maglev scripts/exp_night.ts key=value …`. A working tool, not part of the protocol.
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { durationRmse, mae, shareAtLeast } from "../../app/src/worker/metrics.ts";

const arg: Record<string, string> = {};
for (const a of process.argv.slice(2)) { const [k, v] = a.split("="); arg[k] = v ?? "1"; }
const f = (k: string, d: number) => (k in arg ? Number(arg[k]) : d);
const { solve } = await loadSolver();
const YEARS = (arg.years ?? "2023,2024,2025").split(",").map(Number);
const WEEK = 168;

// revealed must-run: output in the fit years' hours whose observed price was below the technology's
// cheapest bid less a margin, as a line on heating degree-hours (least squares, T_ref by best fit)
const SERIES: Record<string, string[]> = { EE: ["biomass", "oil_shale"], LV: ["gas", "biomass"], LT: ["gas", "biomass"] };
const TECH_RE: Record<string, RegExp> = { gas: /^gas_(ccgt|conventional|chp)/, biomass: /^biomass_chp/, oil_shale: /^oil_shale/ };
let revealed: any = null;
if ("revealed" in arg) {
  revealed = {};
  const margin = f("revealed", 0);
  const q = f("rq", -1); // ≥0: the quantile of the below-cost output per 1 °C bin instead of the mean
  const pts: Record<string, { T: number; mw: number }[]> = {};
  for (const yr of [2023, 2024]) {
    const p = presets() as any; const y = year(String(yr)); const v = validation(String(yr));
    const sc = replay(p, y); sc.markup = { EE: [0, 0, 0, 0], LV: [0, 0, 0, 0], LT: [0, 0, 0, 0] }; sc.chpFloor = false;
    const pb = build(y, p, null, sc);
    ZONES.forEach((z, zi) => { for (const tech of SERIES[z]) {
      const group = pb.zones[zi].offers.filter((o) => !o.demand && TECH_RE[tech].test(o.cls));
      const g = v.gen[z][tech]; const T = (y.zones[z] as any).temperature_c as number[];
      const k = `${z}:${tech}`; pts[k] ??= [];
      for (let h = 0; h < pb.hours; h++) {
        let bid = Infinity; for (const o of group) if (o.mw[h] > 0 && o.bid[h] < bid) bid = o.bid[h];
        if (!(bid < Infinity) || !(v.price[z][h] < bid - margin)) continue;
        pts[k].push({ T: T[h], mw: g[h] });
      }
    } });
  }
  for (const [k, a] of Object.entries(pts)) {
    const [z, tech] = k.split(":");
    let best: any = null;
    for (const tRef of [8, 10, 12, 15]) {
      // per 1 °C bin: the mean (or quantile) of the below-cost output, then a line through the bins
      const bins = new Map<number, number[]>();
      for (const pnt of a) { const b = Math.floor(pnt.T); if (!bins.has(b)) bins.set(b, []); bins.get(b)!.push(pnt.mw); }
      const xs: number[] = [], ys: number[] = [], ws: number[] = [];
      for (const [b, arr] of bins) { if (arr.length < 50) continue; arr.sort((m, n) => m - n);
        xs.push(Math.max(0, tRef - (b + 0.5))); ys.push(q >= 0 ? arr[Math.floor(q * (arr.length - 1))] : arr.reduce((s, x) => s + x, 0) / arr.length); ws.push(arr.length); }
      const W = ws.reduce((s, x) => s + x, 0);
      const mx = xs.reduce((s, x, i) => s + x * ws[i], 0) / W, my = ys.reduce((s, x, i) => s + x * ws[i], 0) / W;
      let sxy = 0, sxx = 0; xs.forEach((x, i) => { sxy += ws[i] * (x - mx) * (ys[i] - my); sxx += ws[i] * (x - mx) ** 2; });
      let b_ = sxx > 0 ? Math.max(0, sxy / sxx) : 0; let a_ = Math.max(0, my - b_ * mx);
      let sse = 0; xs.forEach((x, i) => { sse += ws[i] * (ys[i] - a_ - b_ * x) ** 2; });
      if (!best || sse < best.sse) best = { a_mw: a_, b_mw_per_k: b_, t_ref_c: tRef, sse, n: a.length };
    }
    revealed[z] ??= {}; revealed[z][tech] = best;
    console.log(`revealed ${k}: ${best.n} h, T_ref ${best.t_ref_c}, a ${best.a_mw.toFixed(1)}, b ${best.b_mw_per_k.toFixed(2)}`);
  }
}

let total = 0;
const rows: string[] = [];
for (const yr of YEARS) {
  const p = presets() as any;
  const y = year(String(yr));
  const v = validation(String(yr));
  const sc = replay(p, y);
  // floor scale: every CHP floor's a and b times k (proxy for a higher percentile)
  const fs = f("floor", 1);
  for (const z of Object.values(p.fitted.chp_floor) as any[]) for (const t of Object.values(z) as any[]) { t.a_mw *= fs; t.b_mw_per_k *= fs; }
  if (revealed) { console.log === console.log; if (yr === YEARS[0]) console.log("  was:", JSON.stringify(Object.fromEntries(Object.entries(p.fitted.chp_floor).map(([z, t]: any) => [z, Object.fromEntries(Object.entries(t).map(([k, x]: any) => [k, [x.t_ref_c, x.a_mw, x.b_mw_per_k]]))])))); p.fitted.chp_floor = revealed; }
  if ("pumped" in arg) sc.pumpedDelta = f("pumped", 60);
  if ("noloss" in arg) sc.losses = false;
  if ("shale" in arg) { const { FLEX } = await import("../../app/src/engine/build.ts"); for (const c of ["oil_shale_auvere", "oil_shale_cfb", "oil_shale_pf"]) FLEX.add(c);
    sc.markup = { EE: arg.shale.split(",").map(Number), LV: p.fitted.markup.LV.eur_mwh, LT: p.fitted.markup.LT.eur_mwh }; }
  if ("nomarkup" in arg) sc.markup = { EE: [0, 0, 0, 0], LV: [0, 0, 0, 0], LT: [0, 0, 0, 0] };
  const pb = build(y, p, null, sc);
  const H = pb.hours;
  const weeks = Math.ceil(H / WEEK);
  // Daugava: turbine limit = the week's observed maximum output
  if ("dmax" in arg && pb.reservoir) {
    const g = v.gen.LV.hydro_ror;
    for (let w = 0; w < weeks; w++) { let m = 0; for (let h = w * WEEK; h < Math.min(H, (w + 1) * WEEK); h++) if (g[h] > m) m = g[h]; pb.reservoir.pmax[w] = Math.max(pb.reservoir.pmin[w], m * f("dmax", 1)); }
  }
  // Daugava: bounds = the week's q and 1−q quantiles of its observed hourly output
  if ("dq" in arg && pb.reservoir) {
    const g = v.gen.LV.hydro_ror; const q = f("dq", 0.1); const qh = "dqh" in arg ? f("dqh", 0.1) : q;
    for (let w = 0; w < weeks; w++) {
      const a = Array.from(g.slice(w * WEEK, Math.min(H, (w + 1) * WEEK))).sort((x, y) => x - y);
      const at = (p_: number) => a[Math.min(a.length - 1, Math.max(0, Math.round(p_ * (a.length - 1))))];
      const mean = pb.reservoir.budget[w] / a.length;
      pb.reservoir.pmin[w] = Math.min(at(q), mean); pb.reservoir.pmax[w] = Math.max(at(1 - qh), mean);
    }
  }
  // Daugava: bounds as shares of the week's mean release (a transferable rule)
  if ("dlo" in arg && pb.reservoir) {
    for (let w = 0; w < weeks; w++) {
      const n = Math.min(WEEK, H - w * WEEK); const mean = pb.reservoir.budget[w] / n;
      pb.reservoir.pmin[w] = Math.min(mean, f("dlo", 0) * mean); pb.reservoir.pmax[w] = Math.min(Math.max(mean, f("dhi", 9) * mean), 1600);
    }
  }
  // thermal availability scale (flexible offers of the thermal classes)
  if ("avail" in arg) for (const z of pb.zones) for (const o of z.offers) if (/gas|oil_shale|biomass/.test(o.cls)) for (let h = 0; h < H; h++) o.mw[h] *= f("avail", 1);
  if ("availgas" in arg) for (const z of pb.zones) for (const o of z.offers) if (/^gas/.test(o.cls)) for (let h = 0; h < H; h++) o.mw[h] *= f("availgas", 1);
  // a bid adder on a class group, €/MWh
  for (const [k, re] of [["addgas", /^gas/], ["addshale", /^oil_shale/], ["addbio", /^biomass/]] as const) {
    if (k in arg) for (const z of pb.zones) for (const o of z.offers) if (re.test(o.cls)) for (let h = 0; h < H; h++) o.bid[h] += f(k, 0);
  }
  // import NTC scale per boundary
  if ("ntc" in arg) for (const z of pb.zones) for (const o of z.offers) if (o.cls === "import" || o.cls === "export") for (let h = 0; h < H; h++) o.mw[h] *= f("ntc", 1);
  const r = runLP(pb, solve);
  const m = ZONES.map((z, i) => mae(r.price[i], v.price[z]));
  const d = ZONES.map((z, i) => durationRmse(r.price[i], v.price[z]));
  const s = ZONES.map((z, i) => 100 * (shareAtLeast(r.price[i], 150) - shareAtLeast(v.price[z], 150)));
  const b = ZONES.map((z, i) => { let x = 0; for (let h = 0; h < H; h++) x += r.price[i][h] - v.price[z][h]; return x / H; });
  total += m.reduce((a, c) => a + c, 0);
  const kr = r.units.find((u) => u.name === "kruonis"); let krg = 0; if (kr) for (let h = 0; h < H; h++) krg += kr.discharge[h];
  let dg = 0; if (r.reservoir) for (let h = 0; h < H; h++) dg += r.reservoir.release[h];
  if ("peak" in arg) {
    // observed LT >= 150: what the model still holds unused, by class
    const o = v.price.LT; let n = 0, mp = 0;
    const un: Record<string, { mw: number; bid: number; used: number }> = {};
    for (let h = 0; h < H; h++) {
      if (o[h] < f("peak", 150)) continue;
      n++; mp += r.price[2][h];
      pb.zones.forEach((z, zi) => z.offers.forEach((of, j) => {
        if (of.demand) return;
        const k = `${ZONES[zi]}:${of.name}`;
        un[k] ??= { mw: 0, bid: 0, used: 0 };
        un[k].mw += of.mw[h] - r.offers[zi][j][h]; un[k].bid += of.bid[h]; un[k].used += r.offers[zi][j][h];
      }));
      if (r.reservoir) { un["LV:daugava"] ??= { mw: 0, bid: 0, used: 0 }; un["LV:daugava"].used += r.reservoir.release[h]; un["LV:daugava"].mw += pb.reservoir!.pmax[(h / WEEK) | 0] - r.reservoir.release[h]; }
      for (const u of r.units) { un[u.name] ??= { mw: 0, bid: 0, used: 0 }; un[u.name].used += u.discharge[h] - u.charge[h]; }
    }
    let obs = 0; for (let h = 0; h < H; h++) if (o[h] >= f("peak", 150)) obs += o[h];
    rows.push(`peak hours ${n}: observed LT ${(obs / n).toFixed(0)}, model ${(mp / n).toFixed(0)}; class used/unused MW @bid: ` + Object.entries(un).filter(([, x]) => x.mw / n > 5 || x.used / n > 5).map(([k, x]) => `${k} ${(x.used / n).toFixed(0)}/${(x.mw / n).toFixed(0)}@${(x.bid / n).toFixed(0)}`).join(", "));
    const og = (z: string, t: string) => { let s2 = 0; for (let h = 0; h < H; h++) if (o[h] >= f("peak", 150)) s2 += v.gen[z]?.[t]?.[h] ?? 0; return (s2 / n).toFixed(0); };
    rows.push(`  observed: EE oil_shale ${og("EE", "oil_shale")} gas ${og("EE", "gas")} biomass ${og("EE", "biomass")}; LV gas ${og("LV", "gas")} hydro ${og("LV", "hydro_ror")} biomass ${og("LV", "biomass")}; LT gas ${og("LT", "gas")} ps ${og("LT", "hydro_ps")} biomass ${og("LT", "biomass")}`);
    const sch = (c: string) => { let s2 = 0; for (let h = 0; h < H; h++) if (o[h] >= f("peak", 150)) s2 += v.scheduled[c].rev[h] - v.scheduled[c].fwd[h]; return (s2 / n).toFixed(0); };
    const ntc = (k: number) => { let s2 = 0; for (let h = 0; h < H; h++) if (o[h] >= f("peak", 150)) s2 += pb.borders[k].ntcImp[h]; return (s2 / n).toFixed(0); };
    rows.push(`  observed import FI ${sch("EE-FI")} (NTC ${ntc(0)}), SE4 ${sch("LT-SE4")} (NTC ${ntc(1)}), PL ${sch("LT-PL")} (NTC ${ntc(2)})`);
  }
  if ("diag" in arg) {
    const { diagnose } = await import("../../app/scripts/validate_fit.ts");
    const { monthOfHour } = await import("../../app/src/engine/build.ts");
    rows.push(diagnose(r, v, monthOfHour(H, yr, true)).split("\n").filter((l) => l.startsWith(arg.diag === "1" ? "EE" : arg.diag)).join("\n"));
  }
  rows.push(`${yr}: MAE ${m.map((x) => x.toFixed(2)).join(" / ")} | DC ${d.map((x) => x.toFixed(1)).join(" / ")} | ≥150 pp ${s.map((x) => x.toFixed(1)).join(" / ")} | bias ${b.map((x) => x.toFixed(1)).join(" / ")} | Kruonis ${(krg / 1e6).toFixed(2)} TWh, Daugava ${(dg / 1e6).toFixed(2)}`);
}
console.log(`[${process.argv.slice(2).join(" ") || "baseline"}] sum MAE ${total.toFixed(2)}`);
for (const r of rows) console.log("  " + r);
