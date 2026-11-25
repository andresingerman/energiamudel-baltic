// Substitution oracles (docs/research/2026-10-11_dear_hours.md, Phase 1.4): one unit at a time
// run as recorded, hour by hour, in place of the programme — Kruonis (generation less pumping,
// spikes/validation-round2/kruonis_record.json), the Daugava (A75), Estonian oil shale (A75, no
// entry), Latvian or Lithuanian gas (A75, floors and markup gone with the offers). What a variant
// closes of the dear-hour gap is the most any rule for that unit could gain; it is not a model.
// From app/: `node --no-maglev ../spikes/dear-hours/oracle.ts [years…]` (default 2023 2024 2025).
import { readFileSync } from "node:fs";
import { runLP } from "../../app/src/engine/lp.ts";
import type { Problem } from "../../app/src/engine/problem.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { FLEX } from "../../app/src/engine/build.ts";
import { validation } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { scenarioFor } from "../../app/scripts/validate_fit.ts";
import { tail } from "./tail.ts";

const record = JSON.parse(readFileSync(new URL("../validation-round2/kruonis_record.json", import.meta.url), "utf8")) as Record<string, { gen: number[]; pump: number[] }>;
const EE = 0, LV = 1, LT = 2;

type Variant = (pb: Problem, yr: number) => void;
const asRecorded = (pb: Problem, z: number, cls: string, mw: ArrayLike<number>) => {
  pb.zones[z].fixed.push({ cls, mw: Float64Array.from({ length: pb.hours }, (_, h) => mw[h] ?? 0), co2: 0 });
};
const drop = (pb: Problem, z: number, keep: (cls: string) => boolean) => {
  pb.zones[z].offers = pb.zones[z].offers.filter((o) => o.demand || keep(o.cls));
  pb.zones[z].fixed = pb.zones[z].fixed.filter((f) => keep(f.cls));
};
const kruonis: Variant = (pb, yr) => {
  pb.storage = pb.storage.filter((u) => !u.name.startsWith("kruonis")); // its shares (D-115) too
  const k = record[String(yr)];
  asRecorded(pb, LT, "hydro_ps", Array.from({ length: pb.hours }, (_, h) => (k.gen[h] ?? 0) - (k.pump[h] ?? 0)));
};
const daugava: Variant = (pb, yr) => {
  pb.reservoir = null;
  asRecorded(pb, LV, "hydro_daugava", validation(String(yr)).gen.LV.hydro_ror);
};
const oilShale: Variant = (pb, yr) => {
  pb.entry = null;
  drop(pb, EE, (c) => !c.startsWith("oil_shale"));
  asRecorded(pb, EE, "oil_shale", validation(String(yr)).gen.EE.oil_shale);
};
const gas = (z: number): Variant => (pb, yr) => {
  drop(pb, z, (c) => !FLEX.has(c));
  asRecorded(pb, z, "gas", validation(String(yr)).gen[ZONES[z]].gas);
};
const VARIANTS: [string, Variant[]][] = [
  ["the engine of record", []],
  ["Kruonis as recorded", [kruonis]],
  ["the Daugava as recorded", [daugava]],
  ["both stores as recorded", [kruonis, daugava]],
  ["oil shale as recorded", [oilShale]],
  ["LV gas as recorded", [gas(LV)]],
  ["LT gas as recorded", [gas(LT)]],
  ["all five as recorded", [kruonis, daugava, oilShale, gas(LV), gas(LT)]],
];

const { solve } = await loadSolver();
const years = process.argv.slice(2).filter((a) => /^\d{4}$/.test(a)).map(Number);
for (const yr of years.length ? years : [2023, 2024, 2025]) {
  const v = validation(String(yr));
  console.log(`\n== ${yr}: zone MAE EE/LV/LT | LT: record >250 bias, 150–250 bias; model's own >250 and 150–250; hours ≥150 model/record; q99 model/record; record's top-250 hours the model has`);
  for (const [name, fs] of VARIANTS) {
    const { pb, boundary } = scenarioFor(yr);
    for (const f of fs) f(pb, yr);
    const r = runLP(pb, solve);
    const t = tail(yr, pb, r, boundary);
    const mae = ZONES.map((z, i) => { let s = 0; for (let h = 0; h < pb.hours; h++) s += Math.abs(r.price[i][h] - v.price[z][h]); return (s / pb.hours).toFixed(2); });
    const lt = t[LT], b = (x: { bin: string }[], k: string) => x.find((y) => y.bin.startsWith(k)) as { n: number; mean: number };
    const q99 = lt.quantiles.find((q) => q.q === 0.99)!;
    console.log(`${name.padEnd(24)} ${mae.join("/")} | ${b(lt.byObserved, "(250").mean} ${b(lt.byObserved, "(150").mean} | ${b(lt.byModel, "(250").mean} (${b(lt.byModel, "(250").n} h) ${b(lt.byModel, "(150").mean} | ${lt.share150[0]}/${lt.share150[1]} | ${q99.model}/${q99.record} | ${lt.overlap[1].sameHour}/${lt.overlap[1].n}`);
  }
}
