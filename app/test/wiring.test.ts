// The page's wiring without a DOM (ERRATA E-091, E-108, E-116; D-127): what main.ts decides lives in
// ui/wiring.ts, and each decision a review once found wrong is held here.
import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { EXPORT, presets, readJson, year } from "../scripts/data.ts";
import { boundaryPrice } from "../src/engine/build.ts";
import type { State } from "../src/state/model.ts";
import { opening, profileKey, runsOf } from "../src/state/model.ts";
import type { Actual } from "../src/ui/actual.ts";
import type { Sources } from "../src/ui/labels.ts";
import type { YearResult } from "../src/ui/results.ts";
import { busyText, chartInput, gotoTarget, ipInputOf, resultsRun, scenarioOrder, tipPlace } from "../src/ui/wiring.ts";

const p = presets();

test("the charts are drawn as the run whose results the page shows, not as the one the panel holds next (E-091)", () => {
  const scenario = opening(p);
  const replay: State = { ...scenario, run: "replay", year: 2024 };
  assert.equal(resultsRun(replay, scenario), "replay"); // a replay shown, the panel already on Scenario
  assert.equal(resultsRun(null, scenario), "scenario"); // nothing shown yet: the panel's
  const view = { borders: [{ border: "EE-FI" }] };
  const headline = [{ key: "2024", label: "2024", view }] as unknown as YearResult[];
  const actual = { label: "2024", price: { EE: [1], LV: [2], LT: [3] }, zones: [{ mix: {} }, { mix: {} }, { mix: {} }] } as unknown as Actual;
  const asReplay = chartInput(resultsRun(replay, scenario), headline, "2024", 1, "EE-FI", actual);
  assert.equal(asReplay.pies, false); // bars beside the actual year
  assert.deepEqual(asReplay.observed, [2]); // Latvia's observed line
  assert.equal(asReplay.border, view.borders[0]);
  const asScenario = chartInput("scenario", headline, "2024", 1, "EE-FI", actual);
  assert.equal(asScenario.pies, true); // a bar per zone, the average and median one chart (D-197)
  assert.equal(asScenario.observed, null); // no observed line in a scenario (R-APP-2)
});

test("the import-price page's base is the profile as published and its price that times the level (D-194)", () => {
  const s = opening(p);
  const years = runsOf(p, s).map((r) => year(r.key));
  const a = ipInputOf(p, s, "FI", years);
  assert.equal(a.runs.length, years.length);
  const published = boundaryPrice(years[0], "FI", profileKey(s), 1);
  assert.deepEqual(Array.from(a.runs[0].base), Array.from(published));
  assert.deepEqual(Array.from(a.runs[0].price), Array.from(published, (x) => x * s.level.FI)); // the owner's level (D-182)
  const r = ipInputOf(p, { ...s, run: "replay", year: 2024, level: { FI: 1, SE4: 1, PL: 1 } }, "FI", [year("2024")]); // a replay's own levels, not the opening's (D-182)
  assert.equal(r.kind, "observed");
  assert.deepEqual(Array.from(r.runs[0].price), Array.from(r.runs[0].base)); // level 1: the observed price
});

test("an \"in Sources\" link opens its source's row, whichever id it carries (E-116)", () => {
  const src = readJson<Sources>(join(EXPORT, "sources.json.gz"));
  const at = (goto: string | null) => ({ closest: (sel: string) => (sel === "[data-goto]" && goto ? { dataset: { goto } } : null) }) as unknown as Element;
  const id = Object.keys(src.records).find((k) => k.startsWith("ecb."))!;
  assert.equal(gotoTarget(at(id), src), "src-ecb"); // a figure's lineage id, as Statistics and Weather carry it
  assert.equal(gotoTarget(at("src-ecb"), src), "src-ecb"); // a row's own id, as the panel's links carry it
  assert.equal(gotoTarget(at(null), src), null); // a click on anything else
  assert.equal(gotoTarget(null, src), null);
});

test("the scenario shown is computed first, then 0 SMR, which the table's differences need, then the rest (D-127)", () => {
  assert.deepEqual(scenarioOrder("gas"), ["gas", "smr1", "smr2"]);
  assert.deepEqual(scenarioOrder("smr1"), ["smr1", "gas", "smr2"]);
  assert.deepEqual(scenarioOrder("smr2"), ["smr2", "gas", "smr1"]);
});

test("the chip: the previous settings' results until the scenario shown is in, then the others still to come (D-054, D-127, D-209)", () => {
  assert.deepEqual(busyText(12, true, true), ["Computing 12 years…", "the previous settings' results"]);
  assert.deepEqual(busyText(1, true, false), ["Computing one year…", ""]);
  assert.deepEqual(busyText(9, false, true), ["Computing the other scenarios, 9 years…", "the results are this run's"]);
});

test("a tip's box: under its mark inside the window, a bid's from its right edge, above where only above has room (E-181)", () => {
  const q = { left: 100, right: 111, top: 50, bottom: 61 };
  assert.deepEqual(tipPlace(q, 298, 120, 1440, 900, false), [100, 65]);
  assert.deepEqual(tipPlace({ ...q, left: 1300, right: 1311 }, 298, 120, 1440, 900, false), [1134, 65]); // off the right side
  assert.deepEqual(tipPlace({ left: 20, right: 92, top: 50, bottom: 76 }, 359, 48, 375, 812, true), [8, 80]); // a bid's, off the left
  assert.deepEqual(tipPlace({ ...q, top: 800, bottom: 811 }, 298, 120, 1440, 900, false), [100, 676]); // above
  assert.deepEqual(tipPlace({ ...q, top: 100, bottom: 111 }, 298, 880, 1440, 900, false), [100, 115]); // room neither way: under
});
