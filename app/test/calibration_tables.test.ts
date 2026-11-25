// The Calibration page's tables are what the engine of record gives now (R-VAL-3 … R-VAL-6): each
// replay's validation file and the EstLink 2 gate's, data/derived/validation/, which `make validate`
// writes and the page bundles. A change that moves a replay fails here until they are written again.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { runLP } from "../src/engine/lp.ts";
import { EXPORT, validation } from "../scripts/data.ts";
import { estlink2, estlink2Json } from "../scripts/estlink2.ts";
import { loadSolver } from "../scripts/highs.ts";
import { evaluate, evaluationJson, scenarioFor } from "../scripts/validate_fit.ts";

const { solve } = await loadSolver();
const file = (name: string) => readFileSync(join(EXPORT, "..", "derived", "validation", name), "utf8");

for (const yr of [2020, 2021, 2022, 2023, 2024, 2025, 2026]) {
  test(`${yr}: the validation file is the replay's as the engine gives it`, () => {
    const { pb, boundary } = scenarioFor(yr);
    assert.equal(evaluationJson(evaluate(yr, pb, runLP(pb, solve), validation(String(yr)), boundary)), file(`${yr}.json`));
  });
}

test("the EstLink 2 gate's file is the counterfactual's as the engine gives it (R-VAL-6)", () => {
  assert.equal(estlink2Json(estlink2(solve)), file("estlink2.json"));
});
