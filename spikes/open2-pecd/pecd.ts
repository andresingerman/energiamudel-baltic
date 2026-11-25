// OPEN-2 (R-TIME-5): what a correction of PECD's onshore wind capacity factor does to the opening
// state. Methodology §2 measures the observed fleet's factor against PECD's: Lithuania 0.61, Latvia
// 0.83, Estonia 0.98 (2020–2025 against the 1982–2019 climatology). PECD's target year 2030
// describes a fleet of modern turbines, so the options are: none (the default); the measured ratio
// on the whole 2035 fleet; Lithuania at 0.80 (D-074's reference point); and the ratio on the part of
// the 2035 fleet that stands today (A68 2026, the fleet at the end of 2025 — A68 counts 1 January:
// LV 138 MW, LT 2 507 MW of ERAA's 644 and 5 520), PECD on the rest. A factor on the capacity factor is a factor on the megawatts the engine multiplies it
// by, so the spike scales the onshore wind of the state. `node --no-maglev spikes/open2-pecd/pecd.ts`; JSON out.
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { summarise } from "../../app/src/engine/results.ts";
import type { State } from "../../app/src/state/model.ts";
import { SCENARIOS, engineScenario, opening, runsOf } from "../../app/src/state/model.ts";
import { links, presets, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const p = presets();
const L = links();
const { solve } = await loadSolver();
const s0 = opening(p);
const vintage = (old: number, total: number, ratio: number) => (old * ratio + (total - old)) / total;
const OPTIONS: Record<string, { LV: number; LT: number }> = {
  none: { LV: 1, LT: 1 },
  measured_ratio: { LV: 0.83, LT: 0.61 },
  lt_080: { LV: 1, LT: 0.8 },
  by_vintage: { LV: vintage(138, 644, 0.83), LT: vintage(2507, 5520, 0.61) },
};
const out: Record<string, unknown> = {};
for (const [name, k] of Object.entries(OPTIONS)) {
  const base: State = { ...s0, zones: { ...s0.zones,
    LV: { ...s0.zones.LV, mw: { ...s0.zones.LV.mw, wind_onshore: s0.zones.LV.mw.wind_onshore * k.LV } },
    LT: { ...s0.zones.LT, mw: { ...s0.zones.LT.mw, wind_onshore: s0.zones.LT.mw.wind_onshore * k.LT } } } };
  const res: Record<string, unknown> = { factor: { LV: Math.round(k.LV * 1000) / 1000, LT: Math.round(k.LT * 1000) / 1000 } };
  for (const id of SCENARIOS) {
    const s = { ...base, scenario: id };
    const f = { EE: 0, LV: 0, LT: 0, lt_wind_twh: 0 };
    for (const r of runsOf(p, s)) {
      const y = year(r.key);
      const pb = build(y, p, L, engineScenario(p, y, s));
      const sm = summarise(pb, runLP(pb, solve));
      f.EE += r.weight * sm.zones[0].price; f.LV += r.weight * sm.zones[1].price; f.LT += r.weight * sm.zones[2].price;
      f.lt_wind_twh += r.weight * (sm.zones[2].gen.wind_onshore ?? 0);
    }
    res[id] = Object.fromEntries(Object.entries(f).map(([a, v]) => [a, Math.round(v * 100) / 100]));
  }
  out[name] = res;
  console.error(name, JSON.stringify(res));
}
console.log(JSON.stringify(out, null, 1));
