// The exports of R-APP-10: the JSON is valid against schema/results.schema.json, the CSV has a row
// per hour of each run, both carry the gate line.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { EXPORT, presets } from "../scripts/data.ts";
import { loadSolver } from "../scripts/highs.ts";
import { runLP } from "../src/engine/lp.ts";
import { opening, sensitivities } from "../src/state/model.ts";
import type { Manifest } from "../src/ui/export.ts";
import { resultsCsv, resultsJson, scenarioSources } from "../src/ui/export.ts";
import type { YearResult } from "../src/ui/results.ts";
import { view } from "../src/worker/view.ts";
import { offer, path, zone } from "./toy.ts";

type Schema = { type?: string | string[]; const?: unknown; enum?: unknown[]; required?: string[]; properties?: Record<string, Schema>;
  additionalProperties?: boolean | Schema; items?: Schema; $ref?: string; $defs?: Record<string, Schema> };
const root = JSON.parse(readFileSync(join(EXPORT, "..", "..", "schema", "results.schema.json"), "utf8")) as Schema;

/** The subset of JSON Schema the results contract uses; returns the paths that break it. */
function check(x: unknown, s: Schema, at = "$"): string[] {
  if (s.$ref) return check(x, root.$defs![s.$ref.split("/").pop()!], at);
  const kind = x === null ? "null" : Array.isArray(x) ? "array" : Number.isInteger(x) ? "integer" : typeof x;
  const types = s.type === undefined ? null : [s.type].flat();
  if (types && !types.includes(kind) && !(kind === "integer" && types.includes("number"))) return [`${at}: ${kind}, not ${types}`];
  if ("const" in s && x !== s.const) return [`${at}: not ${String(s.const)}`];
  if (s.enum && !s.enum.includes(x)) return [`${at}: not in ${s.enum}`];
  const bad: string[] = [];
  if (kind === "array" && s.items) (x as unknown[]).forEach((v, i) => bad.push(...check(v, s.items!, `${at}[${i}]`)));
  if (kind === "object") {
    const o = x as Record<string, unknown>;
    for (const k of s.required ?? []) if (!(k in o)) bad.push(`${at}.${k}: missing`);
    for (const [k, v] of Object.entries(o)) {
      const p = s.properties?.[k];
      if (p) bad.push(...check(v, p, `${at}.${k}`));
      else if (s.additionalProperties === false) bad.push(`${at}.${k}: not in the schema`);
      else if (typeof s.additionalProperties === "object") bad.push(...check(v, s.additionalProperties, `${at}.${k}`));
    }
  }
  return bad;
}

test("the JSON export is valid against the results schema; the CSV has a row per hour", async () => {
  const H = 5;
  const ee = zone(H, 300, 0, [offer("gas_ccgt", 100, 500, H), offer("wind_onshore", 0, 200, H)]);
  const pb = path(H, [ee, zone(H, 0), zone(H, 0)]);
  const v = view(pb, runLP(pb, (await loadSolver()).solve), undefined, null, 88);
  const set = [0.4, 0.6].map((weight, i) => ({ key: `cy200${i}`, label: `200${i}`, weight, view: v }) as unknown as YearResult);
  const manifest: Manifest = { export: "abc", files: { "presets.json": { sha256: "p" }, "years/cy2000.json.gz": { sha256: "a", series: { "zones.EE.load": ["x.1"] } }, "years/cy2001.json.gz": { sha256: "b" } } };
  const a = { gate: "Validation gate not met (R-VAL-5).", code: { version: "0.1.0", commit: "c0ffee" }, manifest, text: "v=3\nrun=scenario", sources: scenarioSources(presets(), opening(presets())), set, trio: { gas: set, smr2: set, smr3: set },
    sensitivities: [{ id: "1", label: "LNG 30 €/MWh, CO₂ 80 €/t", set, gas: set }, { id: "2", label: "LNG 45 €/MWh, CO₂ 95 €/t", set: null, gas: null },
      { id: "3", label: "LNG 60 €/MWh, CO₂ 120 €/t", set, gas: null, gasError: "the worker failed: boom" }, { id: "4", label: "LNG 75 €/MWh, CO₂ 150 €/t", set, gas: set }] };
  const json = JSON.parse(JSON.stringify(resultsJson(a)));
  assert.deepEqual(check(json, root), []);
  assert.ok(json.scenario.sources.includes("doc.taltech_elering_s1_2026.p-2-table-of-3")); // S1, Estonia's fleet
  assert.equal(json.weighted[0].fossilPriceShare, json.runs[0].zones[0].fossilPriceShare);
  // R-APP-11: the four sensitivities go with every export under the ids the page gives them (ERRATA E-174), a figure
  // still computing as null
  assert.deepEqual(json.sensitivities.map((x: { id: string }) => x.id), ["1", "2", "3", "4"]);
  assert.deepEqual(sensitivities(presets(), opening(presets())).map((x) => x.id), ["1", "2", "3", "4"]);
  assert.equal(json.sensitivities[1].meanEurMwh, null);
  assert.equal(json.sensitivities[2].error, "the worker failed: boom");
  assert.deepEqual(json.sensitivities[0].meanEurMwh, json.weighted.map((z: { meanEurMwh: number }) => z.meanEurMwh));
  // a validation run: no trio, no sensitivities, still valid
  const replay = JSON.parse(JSON.stringify(resultsJson({ ...a, trio: null, sensitivities: null, sources: [] })));
  assert.deepEqual(check(replay, root), []);
  const csv = resultsCsv(a).trimEnd().split("\n");
  assert.equal(csv.filter((l) => !l.startsWith("#")).length, 1 + 2 * H); // the header and a row per hour
  assert.equal(csv.filter((l) => l.startsWith("# sensitivity")).length, 4);
  assert.ok(csv[1].includes("R-VAL-5"));
  assert.throws(() => resultsJson({ ...a, manifest: { export: "abc", files: {} } }), /no presets.json/);
});
