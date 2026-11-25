// The interface in Estonian (ui/i18n.ts, ui/et.ts): every text the code passes to t() has its
// Estonian, with the same `{name}` places, so that no English is left in an Estonian page by an
// entry forgotten or a placeholder mistyped; and Node, with no page, stays in English.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { presets } from "../scripts/data.ts";
import { ET } from "../src/ui/et.ts";
import { lang, t } from "../src/ui/i18n.ts";
import type { ClimateYears } from "../src/ui/weather.ts";

const SRC = new URL("../src/", import.meta.url).pathname;
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith(".ts") ? [join(dir, e.name)] : []));
const places = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

/** The texts the code passes to t() as literals, and those it builds: the monthly charts' names, the presets' class
 * names, the Weather page's notes on the hydro series (ERRATA E-193), the page's shell. The sensitivities' names are the
 * owner's price pairs, numbers and units in either language (D-183). */
function keys(): string[] {
  const out = new Set<string>();
  for (const f of files(SRC)) for (const m of readFileSync(f, "utf8").matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) out.add(JSON.parse(`"${m[1]}"`));
  for (const name of ["average", "median"]) for (const who of ["model", "actual"]) out.add(`${name}, ${who} {year}`);
  for (const c of Object.values(presets().classes)) out.add((c as { label: string }).label);
  for (const z of Object.values((presets() as unknown as { climate_years: ClimateYears }).climate_years.zones)) for (const s of Object.values(z)) if (s.note) out.add(s.note);
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  for (const m of html.matchAll(/<(\w+)\b[^>]*\bdata-t(?=[\s>])[^>]*>([^<]*)<\/\1>/g)) out.add(m[2]);
  for (const m of html.matchAll(/aria-label="([^"]*)"[^>]*\bdata-t-label\b/g)) out.add(m[1]);
  out.add(html.match(/<title>(.*?)<\/title>/)![1]);
  return [...out];
}

test("every text the interface translates has its Estonian, with the same places to fill", () => {
  const missing = keys().filter((k) => !(k in ET));
  assert.deepEqual(missing, []);
  const off = Object.entries(ET).filter(([en, et]) => places(en) !== places(et)).map(([en]) => en);
  assert.deepEqual(off, []);
});

test("Node has no page and stays in English; t() fills its places", () => {
  assert.equal(lang, "en");
  assert.equal(t("{n} years", { n: 3 }), "3 years");
  assert.equal(t("not in the dictionary"), "not in the dictionary");
});
