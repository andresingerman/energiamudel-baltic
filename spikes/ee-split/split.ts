// How the replays separate Estonia from Latvia (the owner's question, 2026-10-10). Estonia's price
// left Latvia's in 3 % of the hours of 2024, 21 % of 2025 and 43 % of January–August 2026; the
// validation files say the engine of record puts EE–LV on its southward limit more often still.
// This replays 2024–2026 as `make validate` does and compares, hour by hour, a split (|EE − LV| >
// 0.01 €/MWh) in the model's prices and in the observed ones: how often each, how deep, Estonia's
// error in each case, and what Estonia does in those hours — its oil shale (A75 against the
// model's offers), EstLink's import on its limit, EE–LV's flow against the scheduled exchange.
// Variant "floor_at_record", a diagnosis and not a model: Estonia's oil-shale must-run (the CHP
// floor fitted on 2023–2024 and the week's least output) cut to the hour's A75 output where it is
// above it, the MW cut handed back to the class's offer. Variant "shale_at_record", likewise a
// diagnosis: Estonia's oil shale runs exactly the hour's A75 output, its offers out.
// `node --no-maglev spikes/ee-split/split.ts` — JSON on stdout, progress on stderr.
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { boundaryOffers } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const { solve } = await loadSolver();
const p = presets();
const SPLIT = 0.01;
const CASES = ["both", "model_only", "observed_only", "neither"] as const;
const out: Record<string, unknown> = {};

for (const variant of ["as_is", "floor_at_record", "shale_at_record"]) for (const key of ["2024", "2025", "2026"]) {
  console.error(`replaying ${key}, ${variant} …`);
  const y = year(key);
  const pb = build(y, p, null, replay(p, y));
  const v = validation(key);
  if (variant === "floor_at_record") {
    const z = pb.zones[0];
    const fx = z.fixed.filter((f) => f.cls.startsWith("oil_shale"));
    for (let h = 0; h < pb.hours; h++) {
      const tot = fx.reduce((t, f) => t + f.mw[h], 0);
      const rec = v.gen.EE.oil_shale?.[h] ?? 0;
      if (tot <= rec) continue;
      for (const f of fx) {
        const cut = f.mw[h] * (1 - rec / tot);
        f.mw[h] -= cut;
        const o = z.offers.find((x) => !x.demand && x.cls === f.cls);
        if (o) o.mw[h] += cut;
      }
    }
  }
  if (variant === "shale_at_record") {
    const z = pb.zones[0];
    const fx = z.fixed.filter((f) => f.cls.startsWith("oil_shale"));
    for (let h = 0; h < pb.hours; h++) {
      fx.forEach((f, i) => { f.mw[h] = i === 0 ? v.gen.EE.oil_shale?.[h] ?? 0 : 0; });
      for (const o of z.offers) if (!o.demand && o.cls.startsWith("oil_shale")) o.mw[h] = 0;
    }
  }
  const r = runLP(pb, solve);
  const H = pb.hours;
  const ee = pb.zones[0];
  const fi = pb.borders.findIndex((b) => b.code === "EE-FI");
  const b = pb.borders[fi];
  const imp = boundaryOffers(ee, "import", "FI");
  const shale = ee.offers.flatMap((o, j) => (o.cls.startsWith("oil_shale") ? [j] : []));
  const shaleFixed = ee.fixed.filter((f) => f.cls.startsWith("oil_shale"));
  const sch = v.scheduled["EE-LV"];
  const acc = Object.fromEntries(CASES.map((c) => [c, {
    hours: 0, eeErr: 0, eeAbs: 0, gapModel: 0, gapObs: 0, shaleModel: 0, shaleObs: 0,
    estlinkFullModel: 0, estlinkFullObs: 0, eeLvModel: 0, eeLvObs: 0,
  }]));
  for (let h = 0; h < H; h++) {
    const pm = r.price[0][h] - r.price[1][h];
    const po = v.price.EE[h] - v.price.LV[h];
    const m = Math.abs(pm) > SPLIT;
    const o = Math.abs(po) > SPLIT;
    const a = acc[m && o ? "both" : m ? "model_only" : o ? "observed_only" : "neither"];
    a.hours++;
    a.eeErr += r.price[0][h] - v.price.EE[h];
    a.eeAbs += Math.abs(r.price[0][h] - v.price.EE[h]);
    a.gapModel += pm;
    a.gapObs += po;
    let s = 0;
    for (const j of shale) s += r.offers[0][j][h];
    for (const f of shaleFixed) s += f.mw[h];
    a.shaleModel += s;
    a.shaleObs += v.gen.EE.oil_shale?.[h] ?? 0;
    let got = 0;
    for (const j of imp) got += r.offers[0][j][h];
    const sent = got / (1 - b.lossImp);
    if (sent > 0 && sent >= b.ntcImp[h] - 1e-6) a.estlinkFullModel++;
    if (v.price.EE[h] - b.price[h] > 0.005) a.estlinkFullObs++;  // Finland cheaper: EstLink full
    a.eeLvModel += r.flow[0][h];
    a.eeLvObs += sch.fwd[h] - sch.rev[h];
  }
  const res: Record<string, unknown> = {};
  for (const c of CASES) {
    const a = acc[c];
    const n = Math.max(a.hours, 1);
    res[c] = {
      share: +(a.hours / H).toFixed(3),
      ee_bias: +(a.eeErr / n).toFixed(1), ee_mae: +(a.eeAbs / n).toFixed(1),
      ee_minus_lv: { model: +(a.gapModel / n).toFixed(1), observed: +(a.gapObs / n).toFixed(1) },
      oil_shale_mw: { model: Math.round(a.shaleModel / n), observed: Math.round(a.shaleObs / n) },
      estlink_import_full: { model: +(a.estlinkFullModel / n).toFixed(2), observed: +(a.estlinkFullObs / n).toFixed(2) },
      ee_lv_flow_mw: { model: Math.round(a.eeLvModel / n), observed: Math.round(a.eeLvObs / n) },
      ee_mae_share: 0,
    };
  }
  const total = CASES.reduce((t, c) => t + acc[c].eeAbs, 0);
  for (const c of CASES) (res[c] as { ee_mae_share: number }).ee_mae_share = +(acc[c].eeAbs / total).toFixed(2);
  out[`${key} ${variant}`] = { hours: H, ...res };
}
console.log(JSON.stringify(out, null, 1));
