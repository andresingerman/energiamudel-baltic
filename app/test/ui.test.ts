// The owner's interface requests of D-029: the slider's snap to its preset, the actual year's
// figures from its validation file, the fleet a run reports.
import assert from "node:assert/strict";
import { test } from "node:test";
import { presets, validation, year } from "../scripts/data.ts";
import { build, observedClasses } from "../src/engine/build.ts";
import { runLP } from "../src/engine/lp.ts";
import { ZONES } from "../src/engine/problem.ts";
import { replay } from "../src/state/scenario.ts";
import { actualOf } from "../src/ui/actual.ts";
import { drawIcon, GROUP_ICON } from "../src/ui/icons.ts";
import { esc, fmt } from "../src/ui/labels.ts";
import { keyStep, snap } from "../src/ui/panel.ts";
import { GROUPS, view } from "../src/worker/view.ts";
import { loadSolver } from "../scripts/highs.ts";

test("a slider sticks to its preset within 2 % of its range, and nowhere else", () => {
  assert.equal(snap(2950, 3000, 0, 3900), 3000);
  assert.equal(snap(3070, 3000, 0, 3900), 3000);
  assert.equal(snap(2900, 3000, 0, 3900), 2900);
  assert.equal(snap(1.02, 1, 0.5, 2), 1); // the multiplier's range is 1.5: it sticks within 0.03
  assert.equal(snap(1.05, 1, 0.5, 2), 1.05);
  // a key's step: the grid's value nearest a preset off the grid is the preset, any other value is itself (ERRATA E-186)
  assert.equal(keyStep(1.88, 1.8786, 0.01), 1.8786);
  assert.equal(keyStep(1.89, 1.8786, 0.01), 1.89);
  assert.equal(keyStep(1.87, 1.8786, 0.01), 1.87);
  assert.equal(keyStep(2.1, 2.0982, 0.01), 2.0982);
  assert.equal(keyStep(3000, 3000, 50), 3000);
  assert.equal(keyStep(3050, 3000, 50), 3050);
  assert.equal(keyStep(1.01, NaN, 0.01), 1.01);
  assert.equal(snap(5, Number.NaN, 0, 10), 5);
});

test("text into HTML escapes every character that would be markup (a share link's text is not ours)", () => {
  assert.equal(esc(`<img src=x onerror="a&b='c'">`), "&lt;img src=x onerror=&quot;a&amp;b=&#39;c&#39;&quot;&gt;");
  assert.equal(esc("plain 2035 €/MWh"), "plain 2035 €/MWh");
});

test("the actual year: prices, scheduled trade and generation by group", () => {
  const v = validation("2024");
  const a = actualOf(v, "2024 actual");
  const ee = a.zones[0];
  assert.ok(Math.abs(ee.mean - v.price.EE.reduce((s, x) => s + x, 0) / v.price.EE.length) < 1e-9);
  // Estonia's imports: FI→EE and LV→EE scheduled exchanges
  const imp = ["EE-FI", "EE-LV"].reduce((s, b) => s + v.scheduled[b].rev.reduce((x, y) => x + y, 0), 0) / 1e6;
  assert.ok(Math.abs(ee.importTwh - imp) < 1e-9);
  const gen = Object.values(v.gen.EE).reduce((s, arr) => s + arr.reduce((x, y) => x + y, 0), 0) / 1e6;
  assert.ok(Math.abs(GROUPS.reduce((s, g) => s + ee.mix[g], 0) - gen) < 1e-9);
});

test("a run reports every class it had, with its bid and its generation", async () => {
  const p = presets();
  const y = year("2024");
  const pb = build(y, p, null, replay(p, y));
  const { solve } = await loadSolver();
  const v = view(pb, runLP(pb, solve), ZONES.map((z) => observedClasses(p, z, y.zones[z].capacity ?? {})));
  const ee = v.zones[0].fleet;
  const auvere = ee.find((r) => r.cls === "oil_shale_auvere")!;
  assert.equal(auvere.installedMw, 270);
  assert.ok(auvere.bid! > 0 && auvere.twh > 0);
  for (const z of v.zones) assert.ok(Math.abs(z.fleet.reduce((s, r) => s + r.twh, 0) - GROUPS.reduce((s, g) => s + z.mix[g], 0)) < 1e-6);
  assert.equal(v.zones[1].fleet.find((r) => r.cls === "hydro_daugava")?.kind, "reservoir");
});

test("a negative figure carries the typographic minus, one that rounds to zero no sign", () => {
  assert.equal(fmt(-0.594, 2), "−0.59");
  assert.equal(fmt(-1234.5, 1), "−1 234.5");
  assert.equal(fmt(-0.004, 2), "0.00");
  assert.equal(fmt(6.23, 2), "6.23");
  assert.equal(fmt(Number.NaN), "–");
});

test("every source's icon draws on a canvas, its battery without Path2D.roundRect too (Safari < 16)", () => {
  const drawn: string[] = [];
  class Path { addPath() {} arc() {} rect() {} }
  (globalThis as { Path2D?: unknown }).Path2D = Path; // no roundRect: Safari 15, Firefox < 112
  const ctx = { save() {}, restore() {}, translate() {}, scale() {}, fill: () => drawn.push("fill"), stroke: () => drawn.push("stroke") } as unknown as CanvasRenderingContext2D;
  try {
    for (const key of Object.values(GROUP_ICON)) {
      const n = drawn.length;
      drawIcon(ctx, key, 50, 50, 16, "#ffffff");
      assert.ok(drawn.length > n, key);
    }
  } finally {
    delete (globalThis as { Path2D?: unknown }).Path2D;
  }
});
