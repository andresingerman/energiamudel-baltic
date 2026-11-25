// The calibration page (R-APP-7): it marks the figures validate_fit counted as breaches, and renders
// every section from the committed files.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { EXPORT, presets } from "../scripts/data.ts";
import type { Calibration } from "../src/ui/calibration.ts";
import { breaches, calibrationHtml, gateNote } from "../src/ui/calibration.ts";
import type { Evaluation } from "../src/worker/metrics.ts";
import { GATE_YEARS } from "../src/worker/metrics.ts";

const DERIVED = join(EXPORT, "..", "derived");
const read = (p: string) => JSON.parse(readFileSync(join(DERIVED, p), "utf8"));
const years: Evaluation[] = readdirSync(join(DERIVED, "validation")).filter((f) => /^\d{4}\.json$/.test(f)).map((f) => read(`validation/${f}`));

test("the page's ✗ are validate_fit's breaches, year by year", () => {
  for (const e of years) if (GATE_YEARS.includes(e.year)) assert.equal(breaches(e), e.failures.length, `${e.year}`);
});

test("the exports' gate line and the methodology quote the protocol's own hourly errors (R-PUB-4, D-201; the README not since D-326, the questions and answers gone, D-337)", () => {
  const mae = (ys: number[]) => years.filter((e) => ys.includes(e.year)).flatMap((e) => Object.values(e.zones).map((z) => z.mae));
  const span = (xs: number[]) => `${Math.round(Math.min(...xs))}–${Math.round(Math.max(...xs))}`; // as the documents round
  assert.ok(gateNote().includes(`miss hourly prices by ${span(mae([2023, 2024, 2025]))} €/MWh`), span(mae([2023, 2024, 2025])));
  // the pages carry no banner of it since D-201
  assert.doesNotMatch(readFileSync(join(EXPORT, "..", "..", "app", "index.html"), "utf8"), /class="gate"/);
  // the methodology's gate status, which the Documentation view shows, gives the same two ranges
  const head = readFileSync(join(EXPORT, "..", "..", "docs", "methodology.md"), "utf8").slice(0, 600).replace(/\s+/g, " ");
  assert.ok(head.includes(`hourly price errors of ${span(mae([2023, 2024]))} €/MWh in the fit years`), "methodology.md, fit years");
  assert.ok(head.includes(`and ${span(mae([2025]))} in the blind year 2025 against a threshold of 15`), "methodology.md, blind year");
});

test("the page renders every section and the three gates", () => {
  const fitted = (presets() as unknown as { fitted: Calibration["fitted"] }).fitted;
  const h = calibrationHtml({ years, estlink: read("validation/estlink2.json"), gap: read("gap/gap.json"), fitted });
  for (const s of ["Prices per zone and year", "Generation per class", "Borders", "The EstLink 2 counterfactual", "The engine of record against the reference programme", "Fitted parameters", "✗ not met", "✓ met"]) assert.ok(h.includes(s), s);
  // no requirement's or decision's tag on the screen (the owner, 2026-10-19)
  assert.doesNotMatch(h.replace(/<[^>]+>/g, " "), /\b(?:R-[A-Z]+-\d+|D-\d{3}|E-\d{3}|OPEN-\d+)\b/);
  assert.ok(h.includes("median price difference, second zone − first"), "the border spread's sign (E-120)");
  assert.equal((h.match(/<tr class="first">/g) ?? []).length >= years.length, true);
  if (fitted.kruonis_output) assert.ok(h.includes("Kruonis's output cost by the share of its power in use"), "the step's row (D-115)");
  // each part says in words what it shows (D-322): the page's own, the gates' and the six sections' — and no figure of
  // the data in them, which would drift from the tables
  const why = [...h.matchAll(/<p class="note why">([^<]*)<\/p>/g)].map((m) => m[1]);
  assert.equal(why.length, 8);
  for (const w of why) assert.doesNotMatch(w.replace(/150 €\/MWh|20\d\d(?:–20\d\d)?|CO₂|EstLink 2/g, ""), /\d/, w);
});
