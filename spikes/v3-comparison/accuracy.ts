// v3 (3.5.0, energiamudel-v3.nosync, read only) against the same observed years as v5's protocol, on v5's own
// metrics (app/src/worker/metrics.ts). v3's history replay anchors each neighbour's supply on the year's observed
// Baltic price and flow (app/src/coupler.js neighbourExport: export = fHist + slope·(p − pAnchor), pAnchor the
// attached Baltic node's observed price) and injects Kruonis's and the Daugava's observed hourly output
// (REAL_MUSTRUN). v5's protocol lets no observed Baltic price in (SPECIFICATION O-3, R-BND-3). Variants:
//   published — v3's replay as its own validate_fit.mjs runs it (the default scenario);
//   no anchor — each neighbour's supply around its own price, slope·(p − pNeighbour), no observed flow;
//   blind     — no anchor, and Kruonis scheduled as storage by v3's own option (optimizePumpedStorage).
// The Daugava's observed output stays in every variant (v5 takes its weekly band from the record too).
// From app/: `node --no-maglev ../spikes/v3-comparison/accuracy.ts`. Writes accuracy.json beside it.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { durationRmse, mae, shareAtLeast } from "../../app/src/worker/metrics.ts";
import { validation } from "../../app/scripts/data.ts";

const V3 = fileURLToPath(new URL("../../../energiamudel-v3.nosync", import.meta.url)); // v3's checkout beside this one
const { runNetwork } = await import(join(V3, "app/src/coupler.js"));
const { defaultScenario, CHAIN } = await import(join(V3, "app/src/state.js"));
const DATA = join(V3, "app/public/data");
const meta = JSON.parse(readFileSync(join(DATA, "meta.json"), "utf8"));
const EXT_NODE: Record<string, string> = { FI: "EE", SE4: "LT", PL: "LT" };
const YEARS = [2020, 2021, 2022, 2023, 2024, 2025];
const mean = (a: ArrayLike<number>) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s / a.length; };

function scenarioOf(data: any, variant: string) {
  const sc = defaultScenario(meta, data);
  if (variant === "published") return sc;
  // the anchor taken out: pAnchor = obsNode + mult·sel − nat becomes nat with sel = 2·nat − obsNode (mult 1)
  sc.neighbourPriceOverride = {}; sc.neighbourFlowOverride = {};
  for (const k of Object.keys(EXT_NODE)) {
    const nat = data.neighbours[k].price, node = data.countries[EXT_NODE[k]].price;
    sc.neighbourPriceOverride[k] = Float64Array.from(nat, (x: number, h: number) => 2 * x - node[h]);
    sc.neighbourFlowOverride[k] = new Float64Array(nat.length);
  }
  if (variant === "blind") sc.optimizePumpedStorage = true;
  return sc;
}

const out: Record<string, unknown> = {};
for (const y of YEARS) {
  const data = JSON.parse(readFileSync(join(DATA, "years", `${y}.json`), "utf8"));
  const v5obs = validation(String(y));
  const row: Record<string, unknown> = {};
  for (const variant of ["published", "no anchor", "blind"]) {
    const r = runNetwork(data, scenarioOf(data, variant));
    const z: Record<string, unknown> = {};
    for (const c of CHAIN as string[]) {
      const obs = Float64Array.from(data.countries[c].price as number[]), mod = Float64Array.from(r.series.price[c] as ArrayLike<number>);
      z[c] = { mae: mae(mod, obs), bias: mean(mod) - mean(obs), durationRmse: durationRmse(mod, obs),
        share150: { model: shareAtLeast(mod, 150), observed: shareAtLeast(obs, 150) } };
    }
    row[variant] = z;
  }
  // the observed series v3 and v5 compare against: the same prices hour by hour?
  const same: Record<string, number> = {};
  for (const c of CHAIN as string[]) {
    const a = data.countries[c].price as number[], b = v5obs.price[c] as ArrayLike<number>;
    const n = Math.min(a.length, b.length);
    let d = 0; for (let h = 0; h < n; h++) d += Math.abs(a[h] - b[h]);
    same[c] = d / n;
  }
  row.observedMeanAbsDiffV3V5 = same;
  out[y] = row;
  const f = (x: number) => x.toFixed(1);
  for (const variant of ["published", "no anchor", "blind"]) {
    const z = row[variant] as Record<string, { mae: number; bias: number; durationRmse: number }>;
    console.log(`${y} v3 ${variant.padEnd(9)} MAE ${["EE", "LV", "LT"].map((c) => f(z[c].mae)).join(" / ")} | bias ${["EE", "LV", "LT"].map((c) => f(z[c].bias)).join(" / ")} | DC-RMSE ${["EE", "LV", "LT"].map((c) => f(z[c].durationRmse)).join(" / ")}`);
  }
  console.log(`${y} observed series v3 vs v5, mean |Δ| per hour: ${Object.entries(same).map(([c, x]) => `${c} ${x.toFixed(3)}`).join(", ")}`);
}
writeFileSync(new URL("./accuracy.json", import.meta.url), JSON.stringify(out, null, 1));
