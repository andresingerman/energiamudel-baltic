// Model against record by technology in the hours of an observed price bin (the zone's own price):
// mean MW of each dispatchable technology, the border flows, per period of the year.
// From app/: `node --no-maglev ../spikes/validation-round2/gap.ts 2025 [zone=LT] [split=hourOfYear]`.
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const yr = process.argv[2] ?? "2025";
const split = Number(process.argv[3] ?? 0); // an hour of the year to split the year at; 0 = no split
const { solve } = await loadSolver();
const p = presets() as any, y = year(yr), v = validation(yr) as any;
const pb = build(y, p, null, replay(p, y));
const r = runLP(pb, solve);
const H = pb.hours;
const TECH: Record<string, RegExp> = { gas: /^gas_/, biomass: /^biomass_chp|^other_renewable/, oil_shale: /^oil_shale|^retort/, waste: /^waste/, other: /^other$/ };
const BINS = [-1e9, 10, 30, 60, 100, 150, 250, 1e9];
// model output of a technology in a zone: its offers plus its fixed output
function model(zi: number, re: RegExp, h: number): number {
  let x = 0;
  pb.zones[zi].offers.forEach((o, j) => { if (!o.demand && re.test(o.cls)) x += r.offers[zi][j][h]; });
  for (const f of pb.zones[zi].fixed) if (re.test(f.cls ?? f.name ?? "")) x += f.mw[h];
  return x;
}
for (const [from, to, label] of (split ? [[0, split, "before"], [split, H, "after"]] : [[0, H, "year"]]) as [number, number, string][]) {
  console.log(`== ${yr} ${label} (hours ${from}–${to})`);
  ZONES.forEach((z, zi) => {
    const o = v.price[z];
    for (let b = 0; b + 1 < BINS.length; b++) {
      let n = 0, bias = 0;
      const acc: Record<string, [number, number]> = {};
      for (let h = from; h < to; h++) {
        if (!(o[h] > BINS[b] && o[h] <= BINS[b + 1])) continue;
        n++; bias += r.price[zi][h] - o[h];
        for (const [t, re] of Object.entries(TECH)) {
          if (!v.gen[z][t] && !(t === "oil_shale" && z === "EE")) continue;
          acc[t] ??= [0, 0];
          acc[t][0] += model(zi, re, h);
          acc[t][1] += (v.gen[z][t]?.[h] ?? 0) + (t === "oil_shale" ? (v.gen[z].coal_gas?.[h] ?? 0) : 0);
        }
        if (z === "LV" && r.reservoir) { acc.daugava ??= [0, 0]; acc.daugava[0] += r.reservoir.release[h]; acc.daugava[1] += v.gen.LV.hydro_ror[h]; }
      }
      if (n > 20) console.log(`${z} (${BINS[b]}, ${BINS[b + 1]}]: ${String(n).padStart(4)} h, bias ${(bias / n).toFixed(1).padStart(6)} | ` + Object.entries(acc).map(([t, [m, ob]]) => `${t} ${(m / n).toFixed(0)}/${(ob / n).toFixed(0)}`).join("  "));
    }
  });
}
