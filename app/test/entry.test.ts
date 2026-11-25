// Oil shale's market entry (R-SUP-4, D-113): a class comes on for a day when the first pass's price
// reaches its bid long enough and, from off, pays a warm start; on, it runs its minimum load all
// day; off, it offers nothing; the record's floor stays beneath; runLP clears in two passes, on the
// entry's zone's price, and returns the results of the problem it was given (ERRATA E-141); a day the
// second pass clears at the cap while it keeps an available class off comes on, whole and in parts (E-160).
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/engine/build.ts";
import { asCleared, commitEntry } from "../src/engine/entry.ts";
import { blocks, capDays, emptyResults, fromResults, runLP, sameWeek } from "../src/engine/lp.ts";
import { slice, type Problem } from "../src/engine/problem.ts";
import { clearPart, fromPart, runSplit } from "../src/engine/split.ts";
import { imbalance } from "../src/engine/results.ts";
import { opening, engineScenario, runsOf } from "../src/state/model.ts";
import { replay } from "../src/state/scenario.ts";
import { links, presets, year } from "../scripts/data.ts";
import { loadSolver } from "../scripts/highs.ts";
import { digest } from "../scripts/digest.ts";
import { fill, offer, path, zone } from "./toy.ts";

const { solve } = await loadSolver();
const p = presets();

/** Two days of one zone with a 200 MW oil-shale class bidding 100 €/MWh, floor `floor` MW. */
function shale(floor = 0): Problem {
  const H = 48;
  const z = zone(H, 0, 0, [offer("oil_shale_auvere", 100, 200 - floor, H)]);
  if (floor) z.fixed.push({ cls: "oil_shale_auvere", mw: fill(H, floor), co2: 1 });
  const pb = path(H, [z, zone(H, 0), zone(H, 0)]);
  pb.entry = { zone: 0, classes: [{ cls: "oil_shale_auvere", minOn: 8, minLoad: 0.5, start: 90 }] };
  return pb;
}
const day = (a: number[], d: number) => a.slice(d * 24, d * 24 + 24);
const priceWith = (perDay: [number, number][]) => // [hours at 120 €/MWh, else 50] per day
  Float64Array.from({ length: 48 }, (_, h) => (h % 24 < perDay[(h / 24) | 0][0] ? perDay[(h / 24) | 0][1] : 50));

test("a class on for the day runs its minimum load all day and offers the rest at its bid (D-113)", () => {
  // 10 hours at 120 €/MWh: 10 h ≥ 8 h on, margin 10 × 20 × 200 = 40 000 ≥ a start of 90 × 200
  const q = commitEntry(shale(), priceWith([[10, 120], [10, 120]]));
  assert.equal(q.entry, null);
  const must = q.zones[0].fixed.find((f) => f.cls === "oil_shale_auvere")!.mw;
  const rest = q.zones[0].offers[0].mw;
  for (let h = 0; h < 48; h++) {
    assert.equal(must[h], 100);
    assert.equal(rest[h], 100);
  }
});

test("off, a class needs its minimum time on and a start's worth of margin; on, only the time (D-113)", () => {
  // day 1: 7 h at 120 — short of 8 h, off; day 2: 9 h at 101 — 9 × 1 × 200 = 1 800 < 18 000, off
  let q = commitEntry(shale(), priceWith([[7, 120], [9, 101]]));
  assert.ok(Array.from(q.zones[0].offers[0].mw).every((x) => x === 0), "off both days");
  // day 1 on (10 h at 120); day 2 the same 9 h at 101, now without a start to pay: on
  q = commitEntry(shale(), priceWith([[10, 120], [9, 101]]));
  assert.ok(day(Array.from(q.zones[0].offers[0].mw), 1).every((x) => x === 100), "stays on");
  // exactly the minimum time on: 8 h at 120, 8 × 20 × 200 = 32 000 ≥ 18 000
  q = commitEntry(shale(), priceWith([[8, 120], [0, 0]]));
  assert.ok(day(Array.from(q.zones[0].offers[0].mw), 0).every((x) => x === 100), "on at exactly 8 h");
});

test("from off, the start is paid on the megawatts available that day, not the class's installed (D-114)", () => {
  // 100 of the class's 200 MW available, 8 h at 115: the margin 8 × 15 × 100 = 12 000 pays a start
  // of 90 × 100 = 9 000, where one on the installed 200 MW, 18 000, would not
  const pb = shale();
  pb.zones[0].offers[0].mw.fill(100);
  const q = commitEntry(pb, priceWith([[8, 115], [0, 0]]));
  assert.ok(day(Array.from(q.zones[0].offers[0].mw), 0).every((x) => x === 50), "on: the rest above the minimum load");
});

test("off, the record's weekly least output stays as the floor beneath (D-073, D-113)", () => {
  const q = commitEntry(shale(40), priceWith([[0, 120], [10, 120]]));
  const must = Array.from(q.zones[0].fixed.find((f) => f.cls === "oil_shale_auvere")!.mw);
  const rest = Array.from(q.zones[0].offers[0].mw);
  assert.ok(day(must, 0).every((x) => x === 40) && day(rest, 0).every((x) => x === 0), "off: the floor alone");
  assert.ok(day(must, 1).every((x) => x === 100) && day(rest, 1).every((x) => x === 100), "on: the minimum load above it");
});

/** `shale()` with Estonia's load, gas above the oil shale, and the zones apart: the third clears
 * at 10 €/MWh, below the oil shale's bid, so that only Estonia's price can commit it. */
function shaleMarket(floor = 0): Problem {
  const H = 48;
  const pb = shale(floor);
  pb.links.forEach((l) => { l.fwd.fill(0); l.rev.fill(0); });
  pb.zones[0].load = Float64Array.from({ length: H }, (_, h) => (h % 24 >= 8 && h % 24 < 20 ? 300 : 120));
  pb.zones[0].offers.push(offer("gas", 120, 400, H));
  pb.zones[2].load.fill(100);
  pb.zones[2].offers.push(offer("hydro", 10, 200, H));
  return pb;
}

test("runLP clears a problem with an entry in two passes, the second on the entry's zone's first price (D-113)", () => {
  const pb = shaleMarket();
  const first = runLP({ ...pb, entry: null }, solve);
  assert.ok(first.price[0].some((x) => x >= 120) && first.price[2].every((x) => x < 100), "the zones' prices differ");
  const q = commitEntry(pb, first.price[0]);
  const two = runLP(pb, solve);
  assert.equal(digest(two), digest(asCleared(pb, q, runLP(q, solve))));
  assert.equal(digest(two), digest(runLP(pb, solve))); // deterministic
});

test("runLP's results are the problem's own: the committed minimum load is in its class's offer, every zone balances (ERRATA E-141)", () => {
  for (const floor of [0, 40]) {
    const pb = shaleMarket(floor);
    const r = runLP(pb, solve);
    const q = commitEntry(pb, runLP({ ...pb, entry: null }, solve).price[0]);
    const must = q.zones[0].fixed.find((f) => f.cls === "oil_shale_auvere")!.mw;
    const below = floor ? pb.zones[0].fixed.find((f) => f.cls === "oil_shale_auvere")!.mw : null;
    assert.ok(must.some((x, h) => x > (below ? below[h] : 0)), `floor ${floor}: a day on, above the floor`);
    for (let h = 0; h < pb.hours; h++) {
      for (let z = 0; z < 3; z++) assert.ok(Math.abs(imbalance(pb, r, z, h)) <= 1e-6, `floor ${floor}, zone ${z} hour ${h}: ${imbalance(pb, r, z, h)}`);
      assert.ok(r.offers[0][0][h] >= must[h] - (below ? below[h] : 0) - 1e-9, `hour ${h}: the minimum load is in the offer`);
    }
  }
});

test("a slice keeps the problem's entry (the test weeks, the bench)", () => {
  const pb = shale();
  assert.deepEqual(slice(pb, 0, 24).entry, pb.entry);
});

test("a replay enters its three oil-shale classes, a scenario its Auvere, with ERAA's figures (D-113)", () => {
  const y = year("2025");
  const r = build(y, p, null, replay(p, y)).entry!;
  assert.deepEqual(r.classes.map((c) => c.cls), ["oil_shale_auvere", "oil_shale_cfb", "oil_shale_pf"]);
  assert.deepEqual(r.classes.map((c) => c.minOn), [8, 8, 11]);
  assert.ok(r.classes.every((c) => c.minLoad === 0.5 && c.start > 80 && c.start < 120));
  const s = opening(p);
  const cy = year(runsOf(p, s)[0].key);
  const sc = build(cy, p, links(), engineScenario(p, cy, s)).entry!;
  assert.deepEqual(sc.classes.map((c) => c.cls), ["oil_shale_auvere"]);
});

test("a week whose commitment changes nothing the first clearing used is the first's, the others cleared anew; every zone balances (D-130, D-131)", () => {
  const s = opening(p);
  const y = year(runsOf(p, s)[2].key);
  const pb = slice(build(y, p, links(), engineScenario(p, y, s)), 0, 168 * 9 + 24);
  const first = clearPart(pb, solve, 0, 1); // the first clearing, whether its windows ran a class
  const q = commitEntry(pb, first.price[pb.entry!.zone]);
  const again = runLP(q, solve); // the committed problem cleared anew in every week
  const r = runLP(pb, solve);
  const src = fromPart(first);
  let reused = 0;
  for (const [h0, h1] of blocks(pb.hours)) {
    const same = sameWeek(pb, q, src, h0, h1);
    if (same) reused++;
    for (let z = 0; z < 3; z++) assert.deepStrictEqual(r.price[z].slice(h0, h1), (same ? first : again).price[z].slice(h0, h1), `week from ${h0}, zone ${z}`);
  }
  assert.ok(reused > 0 && reused < blocks(pb.hours).length, `${reused} weeks reused`);
  for (let h = 0; h < pb.hours; h++) for (let z = 0; z < 3; z++) assert.ok(Math.abs(imbalance(pb, r, z, h)) <= 1e-6, `zone ${z} hour ${h}`);
});

test("a week is the first clearing's only if the commitment keeps every class off at its floor and no window of the first ran one, a looked-ahead hour included (D-130)", () => {
  const off = priceWith([[0, 120], [0, 120]]); // never at the bid: off both days
  for (const floor of [0, 40]) {
    const pb = shale(floor);
    const q = commitEntry(pb, off);
    const first = emptyResults(pb); // nothing ran
    assert.equal(sameWeek(pb, q, fromResults(first), 0, 48), true, `floor ${floor}: off, nothing ran`);
    first.entryRan[0] = 1; // a window ran the class in an hour it only looked ahead to
    assert.equal(sameWeek(pb, q, fromResults(first), 0, 48), false, `floor ${floor}: ran ahead`);
  }
  const pb = shale(40);
  const on = commitEntry(pb, priceWith([[0, 120], [10, 120]])); // on the second day
  assert.equal(sameWeek(pb, on, fromResults(emptyResults(pb)), 0, 48), false, "offered on a day of the week");
  const q = commitEntry(pb, off);
  const raised = { ...q, zones: q.zones.map((z, i) => (i ? z : { ...z, fixed: z.fixed.map((f) => ({ ...f, mw: f.mw.map((x) => x + 1) })) })) };
  assert.equal(sameWeek(pb, raised, fromResults(emptyResults(pb)), 0, 48), false, "held above its floor");
});

test("a day forced on runs a class with megawatts available at its minimum load; the next day decides as the rule does, not as if it had been on (ERRATA E-160, D-165)", () => {
  // day 1: 7 h at 120, short of 8 h — off unless forced; day 2: 9 h at 101 runs on only after a day on
  const q = commitEntry(shale(), priceWith([[7, 120], [9, 101]]), new Set([0]));
  const must = Array.from(q.zones[0].fixed.find((f) => f.cls === "oil_shale_auvere")!.mw);
  const rest = Array.from(q.zones[0].offers[0].mw);
  assert.ok(day(must, 0).every((x) => x === 100) && day(rest, 0).every((x) => x === 100), "forced: on");
  assert.ok(day(must, 1).every((x) => x === 0) && day(rest, 1).every((x) => x === 0), "the next day: off");
  const out = shale();
  out.zones[0].offers[0].mw.fill(0, 0, 24);
  assert.ok(commitEntry(out, priceWith([[7, 120], [9, 101]]), new Set([0])).zones[0].offers[0].mw.every((x) => x === 0), "nothing available: off");
});

test("a day the second clearing prices at the cap while it keeps an available class off comes on, and its week clears again (ERRATA E-160, D-165)", () => {
  // the first pass clears 7 peak hours of the first day at the oil shale's bid with it free, short of its
  // 8 hours on; without it the gas cannot meet the peak
  const pb = shale();
  pb.links.forEach((l) => { l.fwd.fill(0); l.rev.fill(0); });
  pb.zones[0].load = Float64Array.from({ length: 48 }, (_, h) => (h >= 8 && h < 15 ? 300 : 120));
  pb.zones[0].offers.push(offer("hydro", 10, 150, 48), offer("gas", 120, 100, 48));
  const price = runLP({ ...pb, entry: null }, solve).price[0];
  const q = commitEntry(pb, price);
  assert.deepEqual(capDays(pb, q, runLP(q, solve), 0, 48), [0], "the fault");
  const r = runLP(pb, solve);
  assert.ok(r.price[0].every((x) => x < pb.voll), "no hour at the cap");
  const forced = commitEntry(pb, price, new Set([0]));
  assert.deepStrictEqual(r, asCleared(pb, forced, runLP(forced, solve)), "the forced commitment, cleared");
  for (let h = 0; h < 48; h++) for (let z = 0; z < 3; z++) assert.ok(Math.abs(imbalance(pb, r, z, h)) <= 1e-6, `zone ${z} hour ${h}`);
});

test("the mend of a day at the cap is the same in parts as whole: 2020's 10 June at a gas adder of 50 €/MWh (ERRATA E-160, D-165)", () => {
  // the two weeks to 16 June: the circulating fluidised bed stays off on 10 June, and the second
  // clearing without it put 16 hours at the cap (the research on one gas bid, §6) — on the record's gas price
  // per gross MWh, as the research ran before D-171; per net MWh the gas is dearer and the case does not arise
  const y = year("2020");
  const gross = { ...p, parameters: { ...p.parameters, "fuel.gas.ncv_per_gcv": { ...p.parameters["fuel.gas.ncv_per_gcv"]!, value: 1 } } };
  const pb = slice(build(y, gross, null, { ...replay(gross, y), gasAdder: 50 }), 168 * 22, 168 * 24);
  const z = pb.entry!.zone;
  const q = commitEntry(pb, runLP({ ...pb, entry: null }, solve).price[z]);
  assert.deepEqual(capDays(pb, q, runLP(q, solve), 0, pb.hours), [7], "the fault, on the slice's eighth day");
  const r = runLP(pb, solve);
  assert.ok(r.price[z].every((x) => x < pb.voll - 1e-6), "no hour at the cap");
  for (const n of [2, 3]) assert.deepStrictEqual(runSplit(pb, solve, n), r, `${n} parts`);
  for (let h = 0; h < pb.hours; h++) for (let k = 0; k < 3; k++) assert.ok(Math.abs(imbalance(pb, r, k, h)) <= 1e-6, `zone ${k} hour ${h}`);
});

test("a day forced on is not forced again: a class whose minimum load is all it has leaves the cap where it is, and the week clears once more at most (ERRATA E-163)", () => {
  // the oil shale at a minimum load of 1 offers nothing above its must-run when on, so the mend's test still
  // finds it "off" on the day it forced; the peak short even with it on, the day stays at the cap
  const pb = shale();
  pb.entry!.classes[0].minLoad = 1;
  pb.links.forEach((l) => { l.fwd.fill(0); l.rev.fill(0); });
  pb.zones[0].load = Float64Array.from({ length: 48 }, (_, h) => (h >= 8 && h < 15 ? 300 : 120));
  pb.zones[0].offers.push(offer("hydro", 10, 50, 48));
  const r = runLP(pb, solve);
  assert.ok(r.price[0].some((x) => x >= pb.voll - 1e-6), "a shortage the plant cannot meet stays");
  for (let h = 0; h < 48; h++) for (let z = 0; z < 3; z++) assert.ok(Math.abs(imbalance(pb, r, z, h)) <= 1e-6, `zone ${z} hour ${h}`);
});
