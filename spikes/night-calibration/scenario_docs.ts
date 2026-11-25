// The scenario figures the methodology quotes (§9, §9.1, §10), on the opening scenario as the
// application runs it (D-045). `node --no-maglev spikes/night-calibration/scenario_docs.ts`.
import { Rng, streamSeed } from "../../app/src/adequacy/prng.ts";
import type { LongFailures } from "../../app/src/adequacy/sampler.ts";
import { sampleYear } from "../../app/src/adequacy/sampler.ts";
import type { Scenario } from "../../app/src/engine/build.ts";
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { summarise } from "../../app/src/engine/results.ts";
import type { State } from "../../app/src/state/model.ts";
import { engineScenario, opening, runsOf } from "../../app/src/state/model.ts";
import { links, presets, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const p = presets();
const L = links();
const { solve } = await loadSolver();
const s0: State = opening(p);
const runs = runsOf(p, s0);
const f1 = (x: number) => x.toFixed(1);

function headline(s: State, tweak: (sc: Scenario) => Scenario = (x) => x): { mean: number[]; byYear: number[]; nuclear: number[] } {
  const mean = [0, 0, 0]; const byYear: number[] = []; const nuclear: number[] = [];
  for (const r of runs) {
    const y = year(r.key);
    const pb = build(y, p, L, tweak(engineScenario(p, y, s)));
    const sm = summarise(pb, runLP(pb, solve));
    sm.zones.forEach((z, i) => { mean[i] += r.weight * z.price; });
    byYear.push(sm.zones[0].price); nuclear.push(sm.zones[0].gen.nuclear ?? 0);
  }
  return { mean, byYear, nuclear };
}

// §9: the borders from their lines
const base = headline(s0);
console.log(`opening scenario (${s0.scenario}), lines as the panel sets them: ${base.mean.map(f1).join(" / ")}; EE by year ${base.byYear.map(f1).join(", ")}`);
console.log(`ERAA's NTC as given (no line choice): ${headline(s0, (sc) => ({ ...sc, links: null })).mean.map(f1).join(" / ")}`);
console.log(`every cable at nameplate: ${headline({ ...s0, links: { ...s0.links, profile: "nameplate" } }).mean.map(f1).join(" / ")}`);
console.log(`LT-PL not held to Litgrid's plan: ${headline({ ...s0, links: { ...s0.links, plan: false } }).mean.map(f1).join(" / ")}`);
console.log(`EstLink 3 and the fourth EE-LV line in service: ${headline({ ...s0, links: { ...s0.links, on: { ...s0.links.on, estlink3: true, ee_lv_4: true } } }).mean.map(f1).join(" / ")}`);
if (process.argv[2] === "lines") process.exit(0);
console.log(`link state: ${JSON.stringify({ profile: s0.links.profile, plan: s0.links.plan, on: s0.links.on })}`);

// §10: the clause
const smr2 = headline({ ...s0, scenario: "smr2" });
const clause = headline({ ...s0, scenario: "smr2", smr: { ...s0.smr, clause: true } });
console.log(`2 SMR: ${smr2.mean.map(f1).join(" / ")}; nuclear by year ${smr2.nuclear.map((x) => x.toFixed(2)).join(", ")} TWh; with the clause ${clause.nuclear.map((x) => x.toFixed(2)).join(", ")}`);
const smr3 = headline({ ...s0, scenario: "smr3" });
console.log(`3 SMR: ${smr3.mean.map(f1).join(" / ")}`);

// §9.1: adequacy, 20 samples per climate year, seed 1
function adequacy(long: LongFailures | null, label: string): void {
  const N = 20; const all: number[] = []; let voll = 0, unservedSamples = 0; const perYear: string[] = [];
  let wmean = 0;
  for (const r of runs) {
    const y = year(r.key);
    const means: number[] = []; let un = 0;
    for (let i = 0; i < N; i++) {
      const sc = engineScenario(p, y, s0);
      const lines = Object.keys(p.links.lines).filter((k) => p.links.lines[k].kind === "hvdc" && (!p.links.lines[k].planned || s0.links.on[k]));
      const fleet = { ...(sc.fleet ?? {}) } as Record<string, Record<string, number>>;
      sc.sample = sampleYear(p, Rng.seeded(streamSeed(1, r.key, i)), y.meta.hours, lines, fleet, long ?? { method: "fixed", perYear: 0, repairDays: 1 });
      const pb = build(y, p, L, sc);
      const res = runLP(pb, solve);
      let s = 0, shed = 0;
      for (let h = 0; h < pb.hours; h++) { s += res.price[0][h]; if (res.price[0][h] >= pb.voll - 1e-6) voll += r.weight / N; shed += res.shed[0][h] + res.shed[1][h] + res.shed[2][h]; }
      means.push(s / pb.hours); if (shed > 1e-6) { un++; unservedSamples++; }
    }
    means.sort((a, b) => a - b);
    const m = means.reduce((a, b) => a + b, 0) / N;
    wmean += r.weight * m; all.push(...means);
    perYear.push(`${r.label}: mean ${f1(m)}, P10 ${f1(means[Math.floor(0.1 * (N - 1))])}, unserved in ${un} of ${N}`);
  }
  console.log(`${label}: EE weighted mean of the samples ${f1(wmean)} (headline ${f1(base.mean[0])}); at the cap ${voll.toFixed(1)} h a year; samples with unserved demand ${unservedSamples} of ${3 * N}; ${perYear.join("; ")}`);
}
const rd = p.adequacy.long_failure.repair_days as unknown as Record<string, { value: number }>;
console.log("repair days", JSON.stringify(Object.fromEntries(Object.entries(rd).map(([k, v]) => [k, v.value]))), "per year", JSON.stringify(p.adequacy.long_failure.per_year));
adequacy({ method: "fixed", perYear: 0.17, repairDays: rd.cigre.value }, "default: 0.17 a year, CIGRE");
adequacy(null, "plant outages and short trips alone");
adequacy({ method: "per_km", perYear: 0, repairDays: rd.ofgem?.value ?? 65 }, "Ofgem/GHD per km, 65 days");
adequacy({ method: "fixed", perYear: 0.10, repairDays: rd.ofgem?.value ?? 65 }, "0.10 a year, 65 days");
