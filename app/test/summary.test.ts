// What a run reports (src/engine/results.ts `summarise`), on results written by hand: a zone's
// generation, CO₂ and curtailment, an internal border's flow, congestion and rent, a boundary
// border's flow both ways, its congestion and its rent with the losses (R-BND-4, R-BND-7).
import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyResults } from "../src/engine/lp.ts";
import { congestedWay, summarise } from "../src/engine/results.ts";
import { boundary, offer, path, zone } from "./toy.ts";

test("a zone's figures and its borders' flows, congestion and rents add up as written", () => {
  const H = 2;
  const ee = zone(H, 100, 0, [offer("gas_ccgt", 50, 500, H, { co2: 0.5 }), offer("wind_onshore", 0, 300, H, { cls: "wind_onshore" }), ...boundary("FI", 30, 100, 50, H, 0.1, 0.1)]);
  ee.fixed = [{ cls: "nuclear", mw: Float64Array.from([10, 10]), co2: 0 }];
  const pb = path(H, [ee, zone(H, 0), zone(H, 0)], 100);
  pb.borders = [{ code: "EE-FI", zone: 0, price: Float64Array.from([30, 80]), ntcImp: Float64Array.from([100, 100]), ntcExp: Float64Array.from([50, 50]), lossImp: 0.1, lossExp: 0.1 }];
  const r = emptyResults(pb);
  r.offers[0][0].set([100, 200]); // gas
  r.offers[0][1].set([300, 250]); // wind, 50 MWh of 600 curtailed
  r.offers[0][2].set([90, 0]); // the import received: 100 sent at a loss of 10 %
  r.offers[0][3].set([0, 50]); // the export sent
  r.price[0].set([40, 60]);
  r.price[1].set([70, 60]);
  r.flow[0].set([100, -40]);
  r.sat[0].set([1, 0]);
  const s = summarise(pb, r);
  const z = s.zones[0];
  assert.equal(z.gen.gas_ccgt, 300 / 1e6);
  assert.equal(z.gen.wind_onshore, 550 / 1e6);
  assert.equal(z.gen.nuclear, 20 / 1e6);
  assert.equal(z.co2Mt, 150 / 1e6);
  assert.equal(z.curtailTwh, 50 / 1e6);
  assert.equal(z.price, 50);
  const [eeLv] = s.borders;
  assert.deepEqual(eeLv, { border: "EE-LV", flowTwh: 60 / 1e6, congestedFwd: 0.5, congestedRev: 0, rentMeur: 3000 / 1e6 });
  const fi = s.borders.find((b) => b.border === "EE-FI")!;
  assert.ok(Math.abs(fi.flowTwh - -50 / 1e6) < 1e-15, `${fi.flowTwh}`); // 50 sent out, 100 in
  assert.equal(fi.congestedRev, 0.5); // the import at its NTC
  assert.equal(fi.congestedFwd, 0.5); // the export at its NTC
  // received 90 at 40 against 100 bought at 30; 45 delivered at 80 against 50 sold at 60
  assert.ok(Math.abs(fi.rentMeur - 1200 / 1e6) < 1e-12, `${fi.rentMeur}`);
});

test("a link at a limit of 0 with no flow is congested the way the prices pull, and not at all between equal prices (D-135)", () => {
  assert.equal(congestedWay(100, 40, 70), "fwd");
  assert.equal(congestedWay(-40, 60, 60), "rev");
  assert.equal(congestedWay(0, 40, 70), "fwd"); // LV dearer: the link holds back a flow towards it
  assert.equal(congestedWay(0, 70, 40), "rev");
  assert.equal(congestedWay(0, 50, 50.001), null);
  const H = 3;
  const pb = path(H, [zone(H, 0), zone(H, 0), zone(H, 0)]);
  pb.links[0] = { fwd: new Float64Array(H), rev: new Float64Array(H) }; // EE–LV out all three hours
  const r = emptyResults(pb);
  r.sat[0].set([1, 1, 1]);
  r.price[0].set([40, 70, 50]);
  r.price[1].set([70, 40, 50]);
  const [eeLv] = summarise(pb, r).borders;
  assert.equal(eeLv.congestedFwd, 1 / 3);
  assert.equal(eeLv.congestedRev, 1 / 3);
});
