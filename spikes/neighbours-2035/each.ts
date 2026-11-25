// The profile "each neighbour tight on its own" of the research on Sweden and Poland
// (docs/research/2026-10-12_sweden_poland_2035.md §5): each country's tight case as its own research ran it,
// the others at the method in force there, put together in v5.
// - Finland is the research on Finland's case C (spikes/finland/cases.ts, its 2 750 MW of peakers), its
//   SE1 and SE3 at the method in force, coupled with v5 through EstLink as Finland's runs were.
// - SE4 and Poland are their standalone case C series (cases_standalone.json): SE4 with 2023's shift, Poland
//   at the model's level on the record's shape. v5 takes them as fixed series.
// - EstLink's flow is the running average of the rounds' responses (step 1/(k+1)); the run stops when FI
//   and EE move by less than 0.5 €/MWh, within NB_ROUNDS rounds (default 20).
// From app/: `node --no-maglev ../spikes/neighbours-2035/each.ts`. Writes $NB_DATA/each_C<NB_TAG>.json.
import { readFileSync, writeFileSync } from "node:fs";
import { SCENARIOS } from "../../app/src/state/model.ts";
import type { State } from "../../app/src/state/model.ts";
import { CASES as FI_CASES, C_WIND_MW, zone2035 } from "../finland/cases.ts";
import { mean } from "../finland/tests.ts";
import { v5Run } from "../finland/v5.ts";
import { solveZone } from "../finland/zone.ts";
import { CYS, PEAKER_BID, S0, neighbours, solver, stats, weightOf } from "./cases.ts";
import { DIR } from "./tests.ts";

const fiC = FI_CASES.find((c) => c.id === "C")!;
const sa = JSON.parse(readFileSync(`${DIR}/cases_standalone.json`, "utf8")).C.series as Record<string, { SE4shifted: number[]; PLshaped: number[] }>;
const solve = await solver();
const ROUNDS = Number(process.env.NB_ROUNDS ?? 20);
const result: Record<string, unknown> = {}, series: Record<string, Record<number, { FI: number[]; SE4: number[]; PL: number[] }>> = {};
for (const scen of SCENARIOS) {
  const st = { ...S0, scenario: scen } as State;
  const rows = [];
  for (const cy of CYS) {
    const key = `cy${cy}`, nb = neighbours(cy).shaped, se4 = sa[cy].SE4shifted, pl = sa[cy].PLshaped;
    let v = v5Run(st, key, { SE4: se4, PL: pl }), flow = v.flow, last = [NaN, NaN], k = 0, fi = new Float64Array(8760), moved = Infinity;
    for (k = 1; k <= ROUNDS; k++) {
      fi = solveZone(zone2035(fiC, cy, C_WIND_MW, { SE1: nb.SE1, SE3: nb.SE3 }, flow, { peakersMw: 2750, peakerBid: PEAKER_BID }), solve).price;
      v = v5Run(st, key, { FI: fi, SE4: se4, PL: pl });
      const now = [mean(fi), v.mean[0]];
      moved = Math.max(Math.abs(now[0] - last[0]), Math.abs(now[1] - last[1]));
      if (moved < 0.5) break;
      last = now;
      flow = flow.map((x, h) => x + (v.flow[h] - x) / (k + 1));
    }
    rows.push({ cy, v, fi, se4, pl, rounds: Math.min(k, ROUNDS), moved });
  }
  const w = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + weightOf(r.cy) * f(r), 0);
  const plant = rows[0].v.plant !== null, o = (r: (typeof rows)[number]) => r.v.plant!.outputTwh;
  const ee150 = w((r) => stats(r.v.price[0]).h150);
  const s = { FI: w((r) => mean(r.fi)), SE4: w((r) => mean(r.se4)), PL: w((r) => mean(r.pl)), EE: w((r) => r.v.mean[0]), LV: w((r) => r.v.mean[1]), LT: w((r) => r.v.mean[2]), ee150,
    capture: plant ? w((r) => r.v.plant!.captureEurMwh * o(r)) / w(o) : null, cfd: plant ? w((r) => r.v.plant!.stateMeur) : null, rounds: Math.max(...rows.map((r) => r.rounds)), moved: Math.max(...rows.map((r) => r.moved)) };
  result[scen] = s;
  series[scen] = Object.fromEntries(rows.map((r) => [r.cy, { FI: Array.from(r.fi), SE4: r.se4, PL: r.pl }]));
  const f = (x: number) => x.toFixed(1);
  console.log(`each tight on its own, ${scen}: FI ${f(s.FI)} SE4 ${f(s.SE4)} PL ${f(s.PL)} | EE/LV/LT ${f(s.EE)}/${f(s.LV)}/${f(s.LT)} | EE ≥150 ${f(ee150)} h${s.capture !== null ? ` | capture ${f(s.capture)}, CfD ${f(s.cfd!)} M€` : ""} | rounds ${s.rounds}, last move ${s.moved.toFixed(2)}`);
}
writeFileSync(`${DIR}/each_C${process.env.NB_TAG ?? ""}.json`, JSON.stringify({ result, series }));
