// What a variant does to the opening view (docs/research/2026-10-11_dear_hours.md): the four
// scenarios of the opening state on their three climate years, weighted, EE / LV / LT, as
// spikes/night-calibration/scenario_docs.ts reads them — the engine of record against Kruonis as
// four units at Δ + j·s, and against one Δ for the plant. From app/:
// `node --no-maglev ../spikes/dear-hours/opening.ts [s=45] [delta=90]`.
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import type { Problem } from "../../app/src/engine/problem.ts";
import { summarise } from "../../app/src/engine/results.ts";
import { SCENARIOS, engineScenario, opening, runsOf } from "../../app/src/state/model.ts";
import { links, presets, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { units } from "./strategic.ts";

const p = presets(), L = links();
const { solve } = await loadSolver();
const arg = (k: string, d: number) => Number(process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d);
const s = arg("s", 45), delta = arg("delta", 90);
const VARIANTS: [string, (pb: Problem) => void][] = [
  ["the engine of record", () => {}],
  [`Kruonis as four units, s ${s}`, (pb) => units(pb, s)],
  [`one Δ ${delta} for Kruonis`, (pb) => { pb.storage.find((u) => u.name === "kruonis")!.delta = delta; }],
];
const s0 = opening(p);
for (const [name, f] of VARIANTS) {
  const out = SCENARIOS.map((id) => {
    const st = { ...s0, scenario: id };
    const m = [0, 0, 0];
    for (const r of runsOf(p, st)) {
      const y = year(r.key);
      const pb = build(y, p, L, engineScenario(p, y, st));
      f(pb);
      const sm = summarise(pb, runLP(pb, solve));
      sm.zones.forEach((z, i) => { m[i] += r.weight * z.price; });
    }
    return `${id} ${m.map((x) => x.toFixed(1)).join(" / ")}`;
  });
  console.log(`${name}: ${out.join(" | ")}`);
}
