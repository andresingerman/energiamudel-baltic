// The opening state's four scenarios with the neighbours' profile as published, re-priced to the
// scenario's gas and CO₂ (D-072), and — for contrast — at one level factor that gives the three
// neighbours about the same mean. Run from app/: `node --no-maglev ../spikes/neighbour-fuel/headline.ts [GA]`.
import { boundaryPrice, build, repriceKnots } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { summarise } from "../../app/src/engine/results.ts";
import type { State } from "../../app/src/state/model.ts";
import { BOUNDARIES, SCENARIOS, engineScenario, opening, profileKey, runsOf } from "../../app/src/state/model.ts";
import { links, presets, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const p = presets();
const L = links();
const { solve } = await loadSolver();
let s0: State = { ...opening(p), neighbourFuel: false }; // as published; the application opens re-priced (D-079)
if (process.argv[2] === "GA") s0 = { ...s0, profile: "GA" };
const mean = (a: Float64Array) => a.reduce((x, v) => x + v, 0) / a.length;
const q = (a: Float64Array, f: number) => Float64Array.from(a).sort()[Math.floor(f * (a.length - 1))];

// the neighbours themselves
const on: State = { ...s0, neighbourFuel: true };
const y0 = year(runsOf(p, s0)[0].key);
console.log("knots", repriceKnots(p, engineScenario(p, y0, on))!.map(([a, b]) => `${a.toFixed(1)}→${b.toFixed(1)}`).join("  "));
const factor: Record<string, number> = {};
for (const b of BOUNDARIES) {
  let m0 = 0, m1 = 0;
  const parts: string[] = [];
  for (const r of runsOf(p, s0)) {
    const y = year(r.key);
    const a = boundaryPrice(y, b, profileKey(s0), 1), c = boundaryPrice(y, b, profileKey(s0), 1, repriceKnots(p, engineScenario(p, y, on)));
    m0 += r.weight * mean(a); m1 += r.weight * mean(c);
    if (r.label === "2009") parts.push(`2009 P5/P50/P95 ${[0.05, 0.5, 0.95].map((f) => q(a, f).toFixed(0)).join("/")} → ${[0.05, 0.5, 0.95].map((f) => q(c, f).toFixed(0)).join("/")}`);
  }
  factor[b] = m1 / m0;
  console.log(`${b}: mean ${m0.toFixed(1)} → ${m1.toFixed(1)} (×${(m1 / m0).toFixed(2)}); ${parts.join("")}`);
}

const cases: [string, State][] = [
  ["published ", s0],
  ["re-priced ", on],
  ["multiplier", { ...s0, level: { FI: factor.FI, SE4: factor.SE4, PL: factor.PL } }],
];
for (const [name, base] of cases) {
  for (const id of SCENARIOS) {
    const s = { ...base, scenario: id };
    const price = [0, 0, 0];
    let nuc = 0, imp = 0, gas = 0, spread = 0;
    for (const r of runsOf(p, s)) {
      const y = year(r.key);
      const pb = build(y, p, L, engineScenario(p, y, s));
      const res = runLP(pb, solve);
      const sm = summarise(pb, res);
      sm.zones.forEach((z, i) => { price[i] += r.weight * z.price; });
      nuc += r.weight * (sm.zones[0].gen.nuclear ?? 0);
      gas += r.weight * sm.zones.reduce((a, z) => a + Object.entries(z.gen).filter(([c]) => c.startsWith("gas_")).reduce((x, [, v]) => x + v, 0), 0);
      imp += r.weight * sm.borders.filter((b) => /FI|SE4|PL/.test(b.border)).reduce((a, b) => a - b.flowTwh, 0);
      spread += r.weight * (q(res.price[0], 0.95) - q(res.price[0], 0.05));
    }
    console.log(`${name} ${id.padEnd(5)} ${ZONES.map((z, i) => `${z} ${price[i].toFixed(1)}`).join("  ")} | EE P95−P5 ${spread.toFixed(0)} | Baltic gas ${gas.toFixed(2)} TWh | nuclear ${nuc.toFixed(2)} TWh | net import ${imp.toFixed(2)} TWh`);
  }
}
