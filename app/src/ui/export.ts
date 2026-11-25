// The exports of R-APP-10: the scenario and its results as JSON (schema/results.schema.json) with
// the code version, the data manifest's hash and the inputs' lineage; each run's hourly prices as
// CSV. Both carry the page's gate line (R-PUB-4). Built from what the page holds; main.ts saves them.

import type { Presets } from "../contract/presets.ts";
import type { Results, Sensitivity } from "../contract/results.ts";
import type { State } from "../state/model.ts";
import { OWN } from "../state/model.ts";
import type { RunView } from "../worker/view.ts";
import type { SensResult, YearResult } from "./results.ts";
import { weighted } from "./results.ts";

/** What the exports read of manifest.json (schema/manifest.schema.json). */
export interface Manifest { export: string; files: Record<string, { sha256: string; series?: Record<string, string[]> }> }
type Zone = Results["weighted"][number];
const ZONES = ["EE", "LV", "LT"] as const;

const fossilShare = (v: RunView, z: number) => {
  const f = v.zones[z].fossil;
  return f ? (f.unit + f.neighbour) / v.hours : null;
};

function runZone(v: RunView, z: number): Zone {
  const x = v.zones[z];
  return { zone: ZONES[z], meanEurMwh: x.mean, medianEurMwh: x.median, importTwh: x.importTwh, exportTwh: x.exportTwh,
    importMeur: x.importMeur, exportMeur: x.exportMeur, co2Mt: x.co2Mt, curtailTwh: x.curtailTwh, unservedMwh: x.unservedMwh, fossilPriceShare: fossilShare(v, z) };
}

/** Per core zone, the set's figures weighted over its years (R-TIME-3). */
function weightedZones(set: YearResult[]): Zone[] {
  const g = (f: (v: RunView, z: number) => number) => weighted(set, f);
  const [mean, imp, exp, impE, expE, co2, curt, shed] = [
    g((v, z) => v.zones[z].mean), g((v, z) => v.zones[z].importTwh), g((v, z) => v.zones[z].exportTwh),
    g((v, z) => v.zones[z].importMeur), g((v, z) => v.zones[z].exportMeur), g((v, z) => v.zones[z].co2Mt),
    g((v, z) => v.zones[z].curtailTwh), g((v, z) => v.zones[z].unservedMwh)];
  const fossil = set[0].view.zones[0].fossil ? g((v, z) => fossilShare(v, z)!) : null;
  return ZONES.map((zone, z) => ({ zone, meanEurMwh: mean[z], importTwh: imp[z], exportTwh: exp[z], importMeur: impE[z], exportMeur: expE[z],
    co2Mt: co2[z], curtailTwh: curt[z], unservedMwh: shed[z], fossilPriceShare: fossil ? fossil[z] : null }));
}

/** The lineage ids of the presets a scenario run takes: each zone's fleet and demand, the fuel path. */
export function scenarioSources(p: Presets, s: State): string[] {
  if (s.run !== "scenario") return [];
  const out = new Set<string>();
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) { if (k === "src" && Array.isArray(v)) v.forEach((id) => out.add(String(id))); else walk(v); }
  };
  const T = String(s.target);
  for (const z of ZONES) {
    walk(p.fleets[s.zones[z].fleet]?.[z]?.[T]);
    if (s.zones[z].demand !== OWN) walk((p.demand[s.zones[z].demand]?.[z] as Record<string, unknown> | undefined)?.[T]);
  }
  walk(p.fuel_paths[s.fuel]);
  return [...out].sort();
}

interface ExportInput {
  gate: string;
  code: Results["code"];
  manifest: Manifest;
  text: string; // the canonical scenario text
  sources: string[];
  set: YearResult[]; // the set shown
  trio: Partial<Record<string, YearResult[]>> | null; // a scenario still computing is left out (D-127)
  sensitivities: SensResult[] | null; // the scenario shown's (R-APP-11); null in a replay
}

const means = (set: YearResult[] | null | undefined) => (set ? weighted(set, (v, z) => v.zones[z].mean) : null);

export function resultsJson(a: ExportInput): Results {
  const file = (path: string) => {
    const f = a.manifest.files[path];
    if (!f) throw new Error(`the data manifest has no ${path}`);
    return f;
  };
  return {
    format: "energiamudel-v5 results", version: 1, gate: a.gate, code: a.code,
    data: {
      manifest: a.manifest.export, presets: file("presets.json").sha256,
      years: a.set.map((r) => ({ key: r.key, sha256: file(`years/${r.key}.json.gz`).sha256, lineage: file(`years/${r.key}.json.gz`).series ?? {} })),
    },
    scenario: { text: a.text, sources: a.sources },
    runs: a.set.map((r) => ({
      key: r.key, label: r.label, weight: r.weight, hours: r.view.hours, zones: ZONES.map((_, z) => runZone(r.view, z)),
      borders: r.view.borders.map(({ border, flowTwh, rentMeur, congestedFwd, congestedRev }) => ({ border, flowTwh, rentMeur, congestedFwd, congestedRev })),
      plantTwh: r.view.plant ? r.view.plant.mw.reduce((s, x) => s + x, 0) / 1e6 : null,
    })),
    weighted: weightedZones(a.set),
    scenarios: a.trio ? Object.fromEntries(Object.entries(a.trio).flatMap(([id, set]) => (set ? [[id, weightedZones(set)]] : []))) : null,
    sensitivities: a.sensitivities ? a.sensitivities.map((x) => ({ id: x.id as Sensitivity["id"], label: x.label, meanEurMwh: means(x.set),
      gasMeanEurMwh: means(x.gas), error: x.error ?? x.gasError ?? null })) : null,
  };
}

/** Each run's hourly prices, one row per hour of each year of the set, after `#` lines that say
 * what they are. */
export function resultsCsv(a: Pick<ExportInput, "gate" | "code" | "manifest" | "set" | "sensitivities">): string {
  const plant = a.set.some((r) => r.view.plant);
  const lines = [
    `# energiamudel v5 ${a.code.version} (${a.code.commit}), data ${a.manifest.export}: hourly day-ahead prices, €/MWh, of each year of the set; the scenario is in the JSON export`,
    `# ${a.gate.replace(/\s+/g, " ").trim()}`,
    "# hour: from 1 January 00:00 UTC of an observed year; of a climate year or weather scenario, its hour of the TYNDP layout (1 January a Monday)",
    // R-APP-11: every export carries the four standard sensitivities (D-183)
    ...(a.sensitivities ?? []).map((x) => {
      const m = means(x.set);
      return `# sensitivity (${x.id}) ${x.label}: average price EE, LV, LT ${m ? m.map((v) => v.toFixed(2)).join(", ") : "not computed when saved"} €/MWh`;
    }),
    `run,weight,hour,EE,LV,LT${plant ? ",plant_mw" : ""}`,
  ];
  for (const r of a.set) {
    const [ee, lv, lt] = r.view.zones.map((z) => z.price);
    for (let h = 0; h < r.view.hours; h++) {
      lines.push(`${r.label},${r.weight},${h},${ee[h].toFixed(2)},${lv[h].toFixed(2)},${lt[h].toFixed(2)}${plant ? `,${r.view.plant ? r.view.plant.mw[h].toFixed(1) : ""}` : ""}`);
    }
  }
  return lines.join("\n") + "\n";
}
