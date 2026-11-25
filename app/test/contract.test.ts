// R-SMR-3, R-SMR-6: the contract account's designs on three- and four-hour toy years.
import assert from "node:assert/strict";
import { test } from "node:test";
import { account } from "../src/engine/contract.ts";
import { CLAUSE_BID } from "../src/engine/build.ts";
import { runLP } from "../src/engine/lp.ts";
import { loadSolver } from "../scripts/highs.ts";
import { offer, path, zone } from "./toy.ts";

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

test("a two-sided CfD settled hourly pays the gap to the strike both ways; the clause skips hours at or below 0", () => {
  const p = [50, 120, -10], q = [300, 300, 150], m = [0, 0, 0];
  const a = account(p, q, m, 90, "hourly", false);
  near(a.stateMeur, ((90 - 50) * 300 + (90 - 120) * 300 + (90 + 10) * 150) / 1e6);
  assert.deepEqual([a.statePays, a.operatorPays], [2, 1]);
  near(a.captureEurMwh, (50 * 300 + 120 * 300 - 10 * 150) / 750);
  near(a.operatorEurMwh, 90); // market revenue plus the difference: the strike on every MWh
  const c = account(p, q, m, 90, "hourly", true);
  near(c.stateMeur, ((90 - 50) * 300 + (90 - 120) * 300) / 1e6);
  assert.deepEqual([c.statePays, c.operatorPays], [1, 1]);
  // the model's zero: a price of a thousandth of a euro is the renewables' 0 and the LP's perturbation
  near(account([0.001, 50], [300, 300], [0, 0], 90, "hourly", true).stateMeur, ((90 - 50) * 300) / 1e6);
});

test("the monthly design settles each month's output on its simple average price", () => {
  const p = [40, 80, 120, 200], q = [100, 300, 300, 100], m = [0, 0, 1, 1];
  const a = account(p, q, m, 90, "monthly", false);
  near(a.stateMeur, ((90 - 60) * 400 + (90 - 160) * 400) / 1e6);
  assert.deepEqual([a.statePays, a.operatorPays], [1, 1]);
  // under the clause an hour at or below 0 leaves the average and the volume
  const c = account([-20, 80], [300, 300], [0, 0], 90, "monthly", true);
  near(c.stateMeur, ((90 - 80) * 300) / 1e6);
});

test("a collar pays below its floor, is paid back above its cap, and nothing inside", () => {
  const p = [60, 90, 130], q = [300, 300, 300], m = [0, 0, 0];
  const a = account(p, q, m, 90, "collar_80_100", false);
  near(a.stateMeur, ((80 - 60) * 300 + (100 - 130) * 300) / 1e6);
  assert.deepEqual([a.statePays, a.operatorPays], [1, 1]);
  const b = account(p, q, m, 90, "collar_70_110", false);
  near(b.stateMeur, ((70 - 60) * 300 + (110 - 130) * 300) / 1e6);
  // the collars do not move with the strike
  near(account(p, q, m, 150, "collar_70_110", false).stateMeur, b.stateMeur);
});

test("an hour the plant prices itself at its clause bid is a clause hour: no difference paid (E-052)", async () => {
  // wind (0) and the plant's flexible half (CLAUSE_BID) on 150 MW of minimum load: the plant turns down
  // in hour 0, wind is part-loaded in hour 1, the load is short in hour 2
  const H = 3;
  const ee = zone(H, 0, 150, [offer("wind_onshore", 0, 100, H), offer("nuclear", CLAUSE_BID, 150, H)]);
  ee.load = Float64Array.from([300, 200, 500]);
  const r = runLP(path(H, [ee, zone(H, 0), zone(H, 0)]), (await loadSolver()).solve);
  const price = r.price[0];
  assert.ok(price[0] > CLAUSE_BID && price[0] < CLAUSE_BID + 0.001, `${price[0]}`); // the LP's perturbation on the bid
  const q = [0, 1, 2].map((h) => 150 + r.offers[0][1][h]);
  const a = account(price, q, [0, 0, 0], 90, "hourly", true);
  assert.deepEqual([a.statePays, a.operatorPays], [0, 1]); // hours 0 and 1 are clause hours; 2 pays back
  near(a.stateMeur, ((90 - price[2]) * q[2]) / 1e6);
});
