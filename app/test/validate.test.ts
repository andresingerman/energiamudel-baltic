// The validation protocol's metrics on toy series and the EstLink 2 counterfactual (R-VAL-3/4/6).
import assert from "node:assert/strict";
import { test } from "node:test";
import { year } from "../scripts/data.ts";
import { counterfactual } from "../scripts/estlink2.ts";
import { durationRmse, mae, observedCongested, shareAtLeast, spreadQuantiles } from "../src/worker/metrics.ts";

test("metrics on toy series", () => {
  const o = [10, 20, 30, 40];
  assert.equal(mae([12, 18, 30, 40], o), 1);
  assert.ok(durationRmse([40, 30, 20, 10], o) < 1e-12); // the same curve in another order
  assert.ok(Math.abs(durationRmse(o.map((x) => x + 5), o) - 5) < 1e-12);
  assert.equal(shareAtLeast([100, 150, 200, 149.99], 150), 0.5);
  assert.equal(observedCongested([10, 10, 10, 10], [10, 10.004, 11, 9]), 0.25);
  assert.deepEqual(spreadQuantiles([0, 0, 0], [1, 2, 3]).map((x) => Math.round(x * 1e6) / 1e6), [1.2, 2, 2.8]);
});

test("EstLink 2 counterfactual: A31 + 650 MW in the outage hours, capped at the nameplate, A31 elsewhere", () => {
  const y = year("2024");
  const { y: cf, hours } = counterfactual(y, 1016);
  assert.equal(hours[0], 24 * 24 + 22); // 2024-01-25 22:00 UTC
  assert.equal(hours.length, 5328 + 158); // to 3 September 22:00, and from 25 December 10:00
  const inside = new Set(hours);
  const a = y.borders["EE-FI"];
  const b = cf.borders["EE-FI"];
  for (let h = 0; h < y.meta.hours; h++) {
    for (const [o, c] of [[a.ntc_fwd, b.ntc_fwd], [a.ntc_rev, b.ntc_rev]]) {
      assert.equal(c[h], inside.has(h) ? Math.min(1016, o[h] + 650) : o[h]);
      assert.ok(c[h] <= Math.max(1016, o[h]));
    }
  }
  assert.equal(a.ntc_fwd[1000], 358); // EstLink 1 alone, and the observed year is not touched
  assert.equal(b.ntc_fwd[1000], 1008);
});
