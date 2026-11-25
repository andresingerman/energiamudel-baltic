// Validation round 2 (night of 2026-10-05): one change per full-year replay of 2023, 2024 and 2025
// on the engine of record, made on the built Problem so the engine's defaults stay untouched until
// a change is kept. From app/: `node --no-maglev ../spikes/validation-round2/exp.ts key=value … [years=2025]`.
import { existsSync, readFileSync } from "node:fs";
import { CHP_TECH, build } from "../../app/src/engine/build.ts";
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
const record = JSON.parse(readFileSync(new URL("./kruonis_record.json", import.meta.url), "utf8")) as Record<string, { gen: number[]; pump: number[] }>;
const BINS = [-1e9, 0, 10, 30, 60, 100, 150, 250, 1e9];

let total = 0;
const rows: string[] = [];
for (const yr of YEARS) {
  const p = presets() as any;
  const y = year(String(yr));
  const v = validation(String(yr));
  const sc = replay(p, y);
  if ("pumped" in arg) sc.pumpedDelta = f("pumped", 60);
  // oldmk: the markup of the register before this round (D-044's)
  if ("oldmk" in arg) sc.markup = { EE: [80, 160, 200, 200], LV: [35, 275, 355, 435], LT: [0, 80, 400, 520] };
  // mk: a markup schedule to replay with, EE;LV;LT, four cumulative values each
  if ("mk" in arg) { const g = arg.mk.split(";").map((x) => x.split(",").map(Number)); sc.markup = { EE: g[0], LV: g[1], LT: g[2] }; }
  if ("olddelta" in arg) sc.battery = { ...sc.battery, delta: 61 };
  const pb = build(y, p, null, sc);
  const H = pb.hours;
  const weeks = Math.ceil(H / WEEK);
  const kru = pb.storage.find((u) => u.name === "kruonis")!;
  const rec = record[String(yr)];
  // kq: Kruonis's power held to the week's q-quantile hour of its observed pumping and generation
  // (1 = the week's maximum), as D-022 holds a thermal technology to its weekly maximum output
  if ("kq" in arg) {
    const q = f("kq", 1);
    kru.chargeMax = new Float64Array(H); kru.dischargeMax = new Float64Array(H);
    for (let w = 0; w < weeks; w++) {
      const at = (a: number[]) => { const s = a.slice(w * WEEK, Math.min(H, (w + 1) * WEEK)).sort((m, n) => m - n); return s[Math.round(q * (s.length - 1))]; };
      const c = at(rec.pump), d = at(rec.gen);
      for (let h = w * WEEK; h < Math.min(H, (w + 1) * WEEK); h++) { kru.chargeMax[h] = arg.kdir === "d" ? kru.mw : arg.kdir === "sym" ? d / kru.eff : c; kru.dischargeMax[h] = arg.kdir === "c" ? kru.mw * kru.eff : d; }
    }
  }
  // kmw: Kruonis's power as one number of megawatts in each direction, all year
  if ("kmw" in arg) { kru.chargeMax = new Float64Array(H).fill(f("kmw", 900)); kru.dischargeMax = new Float64Array(H).fill(f("kmw", 900) * kru.eff); }
  // kfix: Kruonis as the record has it, hour by hour (an upper bound on what any rule could gain)
  if ("kfix" in arg) {
    pb.storage = pb.storage.filter((u) => u !== kru);
    const z = pb.zones[kru.zone];
    for (let h = 0; h < H; h++) z.load[h] += rec.pump[h] - rec.gen[h];
  }
  // tmin: each thermal technology runs at least the week's q-quantile hour of its observed output
  // (on top of the fitted floor), as the Daugava's lower bound does (D-044); tz limits it to zones
  if ("tmin" in arg) {
    const q = f("tmin", 0.1);
    const only = arg.tz ? arg.tz.split(",") : ZONES;
    const techs = arg.tt ? arg.tt.split(",") : ["gas", "biomass", "oil_shale"];
    ZONES.forEach((zc, zi) => {
      if (!only.includes(zc)) return;
      const zone = pb.zones[zi];
      for (const tech of techs) {
        const obs = (v.gen[zc][tech] as number[] | undefined)?.map((x, h) => x + (tech === "oil_shale" ? 0 : 0));
        if (!obs) continue;
        const flex = zone.offers.filter((o) => !o.demand && CHP_TECH[o.cls] === tech).sort((a, b) => a.bid[0] - b.bid[0]);
        const fixed = zone.fixed.filter((x) => CHP_TECH[x.cls] === tech);
        if (!flex.length) continue;
        const add = flex.map(() => new Float64Array(H));
        for (let w = 0; w < weeks; w++) {
          const a = obs.slice(w * WEEK, Math.min(H, (w + 1) * WEEK)).filter((x) => Number.isFinite(x)).sort((m, n) => m - n);
          if (!a.length) continue;
          const lo = a[Math.round(q * (a.length - 1))];
          for (let h = w * WEEK; h < Math.min(H, (w + 1) * WEEK); h++) {
            let left = lo - fixed.reduce((x, fx) => x + fx.mw[h], 0);
            for (let k = 0; k < flex.length && left > 0; k++) {
              const take = Math.min(flex[k].mw[h], left);
              add[k][h] = take; flex[k].mw[h] -= take; left -= take;
            }
          }
        }
        flex.forEach((o, k) => zone.fixed.push({ cls: o.cls, mw: add[k], co2: o.co2 }));
      }
    });
  }
  // hub: since the Nordic flow-based go-live (2024-10-29) the price at the Nordic end of NordBalt
  // (and EstLink) is the virtual hub's: the zone's price plus the network constraints' shadow
  // prices times the PTDF difference (JAO; hub_spread.json from the scratch analysis). `hub=net`
  // adds the network part to the boundary price; `hub=all` the cable's own constraints too (an
  // upper bound: that is the Baltic price itself wherever the cable is not at its limit).
  if ("hub" in arg && existsSync(new URL("./hub_spread.json", import.meta.url))) {
    const hs = JSON.parse(readFileSync(new URL("./hub_spread.json", import.meta.url), "utf8"))[String(yr)] as Record<string, { net: (number | null)[]; own: (number | null)[] }> | undefined;
    if (hs) for (const [bz, hubName] of [["SE4", "SE4_NB"], ["FI", "FI_EL"]] as const) {
      const sp = hs[hubName]; if (!sp) continue;
      const add = (h: number) => (sp.net[h] ?? 0) + (arg.hub === "all" ? sp.own[h] ?? 0 : 0);
      pb.zones.forEach((z) => z.offers.forEach((o) => { if (o.name === `import:${bz}` || o.name === `export:${bz}`) for (let h = 0; h < H; h++) o.bid[h] += add(h); }));
      pb.borders.forEach((b) => { if (b.code.endsWith(bz)) for (let h = 0; h < H; h++) b.price[h] += add(h); });
    }
  }
  const r = runLP(pb, solve);
  const m = ZONES.map((z, i) => mae(r.price[i], v.price[z]));
  const d = ZONES.map((z, i) => durationRmse(r.price[i], v.price[z]));
  const s = ZONES.map((z, i) => 100 * (shareAtLeast(r.price[i], 150) - shareAtLeast(v.price[z], 150)));
  total += m.reduce((a, c) => a + c, 0);
  // Kruonis's shares of power together (D-115); the options above that change it (kq, kfix, …)
  // predate them and act on its first share only
  const kus = r.units.filter((u) => u.name.startsWith("kruonis"));
  const ku = kus.length ? { charge: Float64Array.from({ length: H }, (_, h) => kus.reduce((a, u) => a + u.charge[h], 0)), discharge: Float64Array.from({ length: H }, (_, h) => kus.reduce((a, u) => a + u.discharge[h], 0)) } : undefined;
  let krg = 0, krc = 0;
  if (ku) for (let h = 0; h < H; h++) { krg += ku.discharge[h]; krc += ku.charge[h]; }
  rows.push(`${yr}: MAE ${m.map((x) => x.toFixed(2)).join(" / ")} | DC ${d.map((x) => x.toFixed(1)).join(" / ")} | ≥150 pp ${s.map((x) => x.toFixed(1)).join(" / ")} | Kruonis gen ${(krg / 1e6).toFixed(2)} pump ${(krc / 1e6).toFixed(2)} TWh`);
  if ("bins" in arg) {
    // by observed Lithuanian price: bias, and Kruonis's pumping and generation, model against record
    const o = v.price.LT;
    for (let b = 0; b + 1 < BINS.length; b++) {
      let n = 0, bias = 0, mc = 0, md = 0, oc = 0, od = 0;
      for (let h = 0; h < H; h++) {
        if (!(o[h] > BINS[b] && o[h] <= BINS[b + 1])) continue;
        n++; bias += r.price[2][h] - o[h];
        if (ku) { mc += ku.charge[h]; md += ku.discharge[h]; }
        oc += rec.pump[h]; od += rec.gen[h];
      }
      if (n) rows.push(`   LT (${BINS[b]}, ${BINS[b + 1]}]: ${n} h, bias ${(bias / n).toFixed(1)}; Kruonis pump model ${(mc / n).toFixed(0)} / record ${(oc / n).toFixed(0)} MW, gen ${(md / n).toFixed(0)} / ${(od / n).toFixed(0)}`);
    }
  }
}
console.log(`[${process.argv.slice(2).join(" ") || "baseline"}] sum MAE ${total.toFixed(2)}`);
for (const r of rows) console.log("  " + r);
