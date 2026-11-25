// How the engine of record clears an hour (R-ENG-8): v3's shortage probe (D-017), the boundary blocks
// (R-BND-2, R-BND-4), prices apart only across a saturated link, a surplus spilled at the floor. Kept
// from the two-pass engine's tests when it was removed (D-132); its own stack and storage table went
// with it. The prices are the LP's duals, within its perturbation of the bids (PERTURB_MAX).
import assert from "node:assert/strict";
import { test } from "node:test";
import { PERTURB_MAX, runLP } from "../src/engine/lp.ts";
import { loadSolver } from "../scripts/highs.ts";
import { boundary, offer, path, zone } from "./toy.ts";

const { solve } = await loadSolver();
const near = (x: number, want: number, what: string) => assert.ok(Math.abs(x - want) <= PERTURB_MAX + 1e-6, `${what}: ${x}, want ${want}`);

test("v3's shortage probe: a surplus behind 500 MW links does not serve the short zones", () => {
  // EE +1 900 MW of fixed output, LV and LT 1 500 MW short each, links 500 MW (D-017)
  const pb = path(1, [zone(1, 100, 2000), zone(1, 1500), zone(1, 1500)], 500);
  const r = runLP(pb, solve);
  const shed = r.shed[0][0] + r.shed[1][0] + r.shed[2][0];
  assert.ok(Math.abs(shed - 2500) < 1e-6, `unserved ${shed}`);
  near(r.price[0][0], -600, "EE");
  near(r.price[1][0], 4000, "LV");
  near(r.price[2][0], 4000, "LT");
  assert.ok(Math.abs(r.flow[0][0] - 500) < 1e-6);
  assert.ok(Math.abs(r.spill[0][0] - 1400) < 1e-6);
});

test("an unsaturated boundary sets the zone's price (R-BND-2)", () => {
  const H = 1;
  const pb = path(H, [zone(H, 900, 0, [offer("gas", 90, 2000, H), ...boundary("FI", 40, 1000, 1000, H)]), zone(H, 0), zone(H, 0)]);
  const r = runLP(pb, solve);
  near(r.price[0][0], 40, "EE");
  assert.ok(Math.abs(r.offers[0][1][0] - 900) < 1e-6, "all of it imported");
});

test("a saturated boundary import lets the zone's price rise to the next offer", () => {
  const H = 1;
  const pb = path(H, [zone(H, 1000, 0, [offer("gas", 90, 2000, H), ...boundary("FI", 40, 600, 600, H)]), zone(H, 0), zone(H, 0)], 0);
  const r = runLP(pb, solve);
  near(r.price[0][0], 90, "EE");
  assert.ok(Math.abs(r.offers[0][1][0] - 600) < 1e-6, "import at its limit");
});

test("losses land on the importing side (R-BND-4)", () => {
  const H = 1;
  const loss = 0.05;
  const pb = path(H, [zone(H, 500, 0, [offer("gas", 90, 2000, H), ...boundary("FI", 40, 1000, 1000, H, loss, loss)]), zone(H, 0), zone(H, 0)], 0);
  const r = runLP(pb, solve);
  // the zone receives what it needs; the price is the boundary's grossed up for the loss
  assert.ok(Math.abs(r.offers[0][1][0] - 500) < 1e-6);
  near(r.price[0][0], 40 / (1 - loss), "EE");
});

test("prices diverge only across a saturated link", () => {
  const H = 1;
  const pb = path(H, [zone(H, 100, 0, [offer("cheap", 10, 1000, H)]), zone(H, 900, 0, [offer("dear", 200, 1000, H)]), zone(H, 100, 0, [offer("mid", 20, 1000, H)])]);
  pb.links[0] = { fwd: new Float64Array([300]), rev: new Float64Array([300]) };
  const r = runLP(pb, solve);
  assert.equal(r.sat[0][0], 1);
  assert.equal(r.sat[1][0], 0);
  assert.ok(Math.abs(r.flow[0][0] - 300) < 1e-6);
  assert.ok(Math.abs(r.price[1][0] - r.price[2][0]) < 1e-6, `${r.price[1][0]} ${r.price[2][0]}`);
  near(r.price[0][0], 10, "EE");
  near(r.price[1][0], 20, "LV");
});

test("a zone with its own surplus spills at the floor rather than exporting past a link", () => {
  const H = 1;
  const pb = path(H, [zone(H, 0, 900), zone(H, 100), zone(H, 100)], 50);
  const r = runLP(pb, solve);
  near(r.price[0][0], -600, "EE");
  assert.ok(Math.abs(r.spill[0][0] - 850) < 1e-6);
});
