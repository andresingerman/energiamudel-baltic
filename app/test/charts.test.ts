// The charts' parts that need no canvas (R-APP-1): the weekly means, a mix bar's end and the duration
// curve's title. The drawing itself is checked in the browser.
import assert from "node:assert/strict";
import { test } from "node:test";
import { curveTitle, mixEnd, weekly } from "../src/ui/charts.ts";

test("a year's days as weeks: seven each, the year's last day or two in its last week, a part year's last week what is left (D-197)", () => {
  const days = (n: number) => Array.from({ length: n }, (_, d) => d);
  const w = weekly(days(365));
  assert.equal(w.length, 52);
  assert.equal(w[0], 3); // days 0 to 6
  assert.equal(w[51], (357 + 364) / 2); // days 357 to 364, eight of them
  assert.equal(weekly(days(366))[51], (357 + 365) / 2);
  assert.deepEqual(weekly(days(10)), [4.5]); // ten days are one week
  assert.deepEqual(weekly([]), [0]);
});

test("a mix bar's end names its generation and its CO₂, without the word on a narrow chart (D-197)", () => {
  assert.deepEqual(mixEnd(10.24, 1.234), [["10.2 TWh", true], [" generation · CO₂ ", false], ["1.23 Mt", true]]);
  assert.deepEqual(mixEnd(10.24, 1.234, true).map(([x]) => x), ["10.2 TWh", " · CO₂ ", "1.23 Mt"]);
});

test("the duration curve's title counts the hours beyond its cut, the model's and the actual year's in a replay (E-104)", () => {
  const model = [1000, 950, 5], actual = [1200, 1100, 999, 901, 10];
  assert.equal(curveTitle(900, true, model, actual, 1), "Price duration curve (axis cut at 900 €/MWh; model 2, actual 4 hours above)");
  assert.equal(curveTitle(900, true, model, null, 1), "Price duration curve (axis cut at 900 €/MWh; 2 hours above)");
  assert.equal(curveTitle(900, true, model, null, 3), "Price duration curve (axis cut at 900 €/MWh)");
  assert.equal(curveTitle(900, false, [5], null, 1), "Price duration curve");
});
