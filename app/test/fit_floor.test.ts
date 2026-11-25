// The heat-driven floor's fit (R-SUP-5, D-042): a known line is recovered from noisy points.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Point } from "../scripts/fit_floor.ts";
import { fit, fitAt } from "../scripts/fit_floor.ts";

/** A deterministic stand-in for noise: a saw of ±25 MW averaging zero. */
const saw = (i: number) => ((i * 37) % 51) - 25;

test("the fit recovers a known floor and its heating threshold", () => {
  const pts: Point[] = [];
  for (let i = 0; i < 20_000; i++) {
    const t = -20 + ((i * 45) / 20_000);
    pts.push({ t, mw: 30 + 12 * Math.max(0, 10 - t) + saw(i) });
  }
  const at = fitAt(pts, 10);
  assert.ok(Math.abs(at.a_mw - 30) < 1 && Math.abs(at.b_mw_per_k - 12) < 0.1, JSON.stringify(at));
  const best = fit(pts);
  assert.equal(best.t_ref_c, 10);
  assert.equal(best.hours, 20_000);
});

test("output that does not rise in the cold gets a flat floor, never a negative slope", () => {
  const pts: Point[] = [];
  for (let i = 0; i < 5_000; i++) pts.push({ t: -10 + (i * 30) / 5_000, mw: 40 + saw(i) + (i * 5) / 5_000 }); // more when warm
  const f = fit(pts);
  assert.equal(f.b_mw_per_k, 0);
  assert.ok(Math.abs(f.a_mw - 42.5) < 1, JSON.stringify(f));
});
