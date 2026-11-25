// The dearest observed hours of a year, model against record: Estonia's price, the neighbours',
// each border's flow and limit, the zone's thermal output. From app/: `node --no-maglev ../spikes/validation-round2/peaks.ts 2025 [threshold=250]`.
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { BORDERS } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const yr = process.argv[2] ?? "2025";
const thr = Number(process.argv[3] ?? 250);
const { solve } = await loadSolver();
const p = presets() as any, y = year(yr), v = validation(yr) as any;
const pb = build(y, p, null, replay(p, y));
const r = runLP(pb, solve);
const H = pb.hours;
const groups: Record<string, { n: number; ee: number; lt: number; obsEE: number; obsLT: number; fi: number; se: number; pl: number; fiFlow: number; fiObs: number; fiNtc: number; eelv: number; eelvObs: number; eelvCap: number }> = {};
for (let h = 0; h < H; h++) {
  if (!(v.price.EE[h] > thr)) continue;
  const fi = pb.borders[0].price[h];
  // the model's regime for Estonia in the hour
  const k = r.price[0][h] <= fi + 0.5 ? "model EE at or below FI" : r.price[0][h] < r.price[1][h] - 0.5 ? "model EE below LV (EE→LV at its limit)" : r.price[0][h] >= v.price.EE[h] - 20 ? "model within 20 of the record" : "model EE = LV, above FI, still too low";
  const g = (groups[k] ??= { n: 0, ee: 0, lt: 0, obsEE: 0, obsLT: 0, fi: 0, se: 0, pl: 0, fiFlow: 0, fiObs: 0, fiNtc: 0, eelv: 0, eelvObs: 0, eelvCap: 0 });
  g.n++; g.ee += r.price[0][h]; g.lt += r.price[2][h]; g.obsEE += v.price.EE[h]; g.obsLT += v.price.LT[h];
  g.fi += fi; g.se += pb.borders[1].price[h]; g.pl += pb.borders[2].price[h];
  g.fiNtc += pb.borders[0].ntcImp[h];
  g.fiObs += v.scheduled["EE-FI"].rev[h] - v.scheduled["EE-FI"].fwd[h];
  g.eelv += r.flow[0][h]; g.eelvObs += v.scheduled["EE-LV"].fwd[h] - v.scheduled["EE-LV"].rev[h]; g.eelvCap += pb.links[0].fwd[h];
  // model import from FI: the import offer less the export offer of the zone
  const z = pb.zones[0];
  z.offers.forEach((o, j) => { if (o.name.startsWith("import:FI")) g.fiFlow += r.offers[0][j][h]; else if (o.name.startsWith("export:FI")) g.fiFlow -= r.offers[0][j][h]; });
}
console.log(`${yr}: hours with Estonia observed above ${thr} €/MWh`);
for (const [k, g] of Object.entries(groups).sort((a, b) => b[1].n - a[1].n)) {
  const m = (x: number) => (x / g.n).toFixed(0);
  console.log(`  ${k}: ${g.n} h | EE model ${m(g.ee)} / record ${m(g.obsEE)}; LT model ${m(g.lt)} / record ${m(g.obsLT)} | FI ${m(g.fi)}, SE4 ${m(g.se)}, PL ${m(g.pl)} | FI→EE model ${m(g.fiFlow)} / record ${m(g.fiObs)} / limit ${m(g.fiNtc)} | EE→LV model ${m(g.eelv)} / record ${m(g.eelvObs)} / limit ${m(g.eelvCap)}`);
}
