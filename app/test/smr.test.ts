// The plant's planned outages (R-SMR-2): the window of largest surplus, units kept apart; the
// pair's hours with a fossil price (R-SMR-5, D-037).
import assert from "node:assert/strict";
import { test } from "node:test";
import { available, outageStarts } from "../src/engine/smr.ts";
import { runLP } from "../src/engine/lp.ts";
import { view } from "../src/worker/view.ts";
import { CLAUSE_BID } from "../src/engine/build.ts";
import { loadSolver } from "../scripts/highs.ts";
import { offer, path, zone } from "./toy.ts";

test("each unit's outage takes the window of largest surplus, at least the gap after the other", () => {
  const H = 2000;
  const surplus = new Float64Array(H);
  for (let h = 1000; h < 1100; h++) surplus[h] = 500; // the best window starts in here
  for (let h = 1200; h < 1300; h++) surplus[h] = 400; // too close for the second unit
  for (let h = 100; h < 200; h++) surplus[h] = 300;
  const [a, b] = outageStarts(surplus, 2, 100, 168);
  assert.equal(a, 1000);
  assert.ok(b + 100 + 168 <= a || a + 100 + 168 <= b, `windows ${a} and ${b} too close`);
  assert.equal(b, 100);
  const units = available(H, 2, [a, b], 100);
  assert.equal(units[1050], 1);
  assert.equal(units[150], 1);
  assert.equal(units[500], 2);
});

test("no room for the outages is an error, not a silent overlap", () => {
  assert.throws(() => outageStarts(new Float64Array(300), 2, 100, 168), /no room/);
});

test("a fossil price: a Baltic gas plant part-loaded, or a neighbour's price at the level, across open links", async () => {
  const H = 3;
  const ee = zone(H, 0, 0, [offer("import:FI", 90, 200, H, { cls: "import" }), offer("gas_ccgt", 100, 500, H),
    { ...offer("wind_onshore", 0, 0, H), mw: Float64Array.from([0, 0, 60]) }]);
  ee.load = Float64Array.from([100, 400, 50]); // the import, the gas plant, the wind at the margin
  const pb = path(H, [ee, zone(H, 0), zone(H, 0)]);
  const r = runLP(pb, (await loadSolver()).solve);
  for (const [level, neighbour] of [[88, 1], [95, 0]] as const) {
    const v = view(pb, r, undefined, null, level);
    for (const z of v.zones) assert.deepEqual(z.fossil, { unit: 1, gas: 1, neighbour }); // one price across the links, a gas plant's (D-195)
  }
  assert.equal(view(pb, r).zones[0].fossil, null); // a replay counts none
  // an oil-shale plant at the margin is fossil, not gas
  const os = zone(H, 0, 0, [offer("import:FI", 90, 200, H, { cls: "import" }), offer("oil_shale_cfb", 100, 500, H),
    { ...offer("wind_onshore", 0, 0, H), mw: Float64Array.from([0, 0, 60]) }]);
  os.load = ee.load;
  const pbOs = path(H, [os, zone(H, 0), zone(H, 0)]);
  assert.deepEqual(view(pbOs, runLP(pbOs, (await loadSolver()).solve), undefined, null, 95).zones[0].fossil, { unit: 1, gas: 0, neighbour: 0 });
});

test("the run view carries the plant's hourly output — its floor and what its offer sold — and each hour's month", async () => {
  const H = 3;
  const ee = zone(H, 0, 0, [offer("wind_onshore", 0, 100, H), offer("nuclear", CLAUSE_BID, 150, H)]);
  ee.fixed = [{ cls: "nuclear", mw: Float64Array.from([150, 150, 150]), co2: 0 }];
  ee.load = Float64Array.from([300, 200, 500]);
  const pb = path(H, [ee, zone(H, 0), zone(H, 0)]);
  const r = runLP(pb, (await loadSolver()).solve);
  const month = Uint8Array.from([0, 5, 11]);
  const v = view(pb, r, undefined, month, null);
  assert.deepEqual(Array.from(v.plant!.mw), [0, 1, 2].map((h) => 150 + r.offers[0][1][h]));
  assert.deepEqual(Array.from(v.plant!.month), [0, 5, 11]);
  assert.equal(view(path(H, [zone(H, 100, 0, [offer("gas_ccgt", 50, 500, H)]), zone(H, 0), zone(H, 0)]), r, undefined, month).plant, null); // no plant, no row
});
