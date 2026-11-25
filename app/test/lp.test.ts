// The engine of record (R-ENG-8, R-ENG-9, revision 1.4): the reference's perturbation, a toy with
// known prices, R-NFR-8's invariants on random problems, a store's energy account, determinism; its
// horizon (D-112): the day and the next, the stores' energy and the week's budgets carried from day
// to day; the Daugava's limits (R-ENG-5).
import assert from "node:assert/strict";
import { test } from "node:test";
import { DAY_AHEAD, WEEKLY, crc32, runLP } from "../src/engine/lp.ts";
import { imbalance } from "../src/engine/results.ts";
import { loadSolver } from "../scripts/highs.ts";
import { makeSolver } from "../src/worker/solver.ts";
import type { Highs } from "highs";
import { digest } from "../scripts/digest.ts";
import { battery, fill, offer, path, randomProblem, zone } from "./toy.ts";

const { solve } = await loadSolver();

test("crc32 is zlib's (the reference's perturbation)", () => {
  assert.equal(crc32("123456789"), 0xcbf43926);
  assert.equal(crc32("0:gas_ccgt"), 4004121685); // Python: zlib.crc32(b"0:gas_ccgt")
});

test("a toy with known prices: the marginal bids, and the store moves 100 MWh", () => {
  const H = 2;
  const pb = path(H, [zone(H, 0, 0, [offer("cheap", 20, 300, H), offer("dear", 80, 1000, H)]), zone(H, 0), zone(H, 0)]);
  pb.zones[0].load = Float64Array.from([150, 500]);
  pb.storage = [{ name: "s", zone: 0, mw: 100, hours: 1, eff: 1, delta: 0, period: 24, budget: null }];
  const r = runLP(pb, solve);
  for (let z = 0; z < 3; z++) {
    assert.ok(Math.abs(r.price[z][0] - 20) < 0.01, `${r.price[z][0]}`);
    assert.ok(Math.abs(r.price[z][1] - 80) < 0.01, `${r.price[z][1]}`);
  }
  assert.ok(Math.abs(r.units[0].discharge[1] - 100) < 1e-6);
});

test("a store's output in steps spreads its water over the dear hours: one segment at nothing, the next at the step (D-115)", () => {
  const H = 3;
  const run = (steps?: number[]) => {
    const pb = path(H, [zone(H, 0, 0, [offer("cheap", 20, 300, H), offer("dear", 80, 1000, H)]), zone(H, 0), zone(H, 0)]);
    pb.zones[0].load = Float64Array.from([100, 500, 500]);
    pb.storage = [{ name: "s", zone: 0, mw: 100, hours: 2, eff: 1, delta: 0, period: 24, budget: null, dischargeSteps: steps }];
    return runLP(pb, solve);
  };
  const one = run(), two = run([0, 50]);
  // without steps the 100 MWh pumped in the cheap hour go out in one dear hour, with them in two halves
  assert.ok(Math.abs(one.units[0].discharge[1] - 100) < 1e-6 && one.units[0].discharge[2] < 1e-6);
  assert.ok(Math.abs(two.units[0].discharge[1] - 50) < 1e-6 && Math.abs(two.units[0].discharge[2] - 50) < 1e-6);
  for (const r of [one, two]) for (let h = 1; h < H; h++) assert.ok(Math.abs(r.price[0][h] - 80) < 0.01, `${r.price[0][h]}`);
  // an empty list is no steps, not a store without output
  assert.equal(digest(run([])), digest(one));
});

test("a store's discharge budget bounds the sum of its segments (D-115)", () => {
  const H = 3;
  const pb = path(H, [zone(H, 0, 0, [offer("cheap", 20, 300, H), offer("dear", 80, 1000, H)]), zone(H, 0), zone(H, 0)]);
  pb.zones[0].load = Float64Array.from([100, 500, 500]);
  pb.storage = [{ name: "s", zone: 0, mw: 100, hours: 2, eff: 1, delta: 0, period: 24, budget: Float64Array.from([0.6]), dischargeSteps: [0, 50] }];
  const d = runLP(pb, solve).units[0].discharge;
  assert.ok(Math.abs(d[1] + d[2] - 60) < 1e-6, `${d[1]} + ${d[2]}`); // 0.6 hours at 100 MW
  assert.ok(d[1] <= 50 + 1e-6 && d[2] <= 50 + 1e-6, `${d[1]}, ${d[2]}: within the first segments, the dear one unused`);
});

for (const seed of [1, 2, 3, 4]) {
  test(`invariants hold on random problem ${seed} (R-NFR-8)${seed > 2 ? ", its stores' output in steps (D-115)" : ""}`, () => {
    const pb = randomProblem(seed, 200); // two weeks, the second short
    if (seed > 2) for (const u of pb.storage) u.dischargeSteps = [0, 15, 30];
    const r = runLP(pb, solve);
    for (let h = 0; h < pb.hours; h++) {
      for (let z = 0; z < 3; z++) {
        const x = imbalance(pb, r, z, h);
        assert.ok(Math.abs(x) <= 1e-5, `zone ${z} hour ${h}: imbalance ${x}`);
        assert.ok(r.price[z][h] >= pb.floor - 1e-6 && r.price[z][h] <= pb.voll + 1e-6, `price ${r.price[z][h]}`);
      }
      for (let i = 0; i < 2; i++) {
        const f = r.flow[i][h];
        assert.ok(f <= pb.links[i].fwd[h] + 1e-6 && -f <= pb.links[i].rev[h] + 1e-6);
        if (!r.sat[i][h]) assert.ok(Math.abs(r.price[i][h] - r.price[i + 1][h]) < 1e-6, `prices differ across unsaturated link ${i} at ${h}`);
      }
    }
    for (const u of r.units) {
      const cap = pb.storage.find((s) => s.name === u.name)!;
      for (let h = 0; h < pb.hours; h++) {
        assert.ok(u.energy[h] >= -1e-6 && u.energy[h] <= cap.mw * cap.hours + 1e-6);
        if ((h + 1) % 168 === 0 || h === pb.hours - 1) assert.ok(Math.abs(u.energy[h]) < 1e-6, "empty at the week's end");
      }
    }
    // DSR full-load hours per UTC day stay within the band's limit (R-DEM-6)
    pb.zones.forEach((zz, z) => zz.offers.forEach((o, j) => {
      if (!o.hoursPerDay) return;
      for (let d = 0; d * 24 < pb.hours; d++) {
        let used = 0;
        for (let h = d * 24; h < Math.min(pb.hours, d * 24 + 24); h++) used += r.offers[z][j][h] / o.mw[h];
        assert.ok(used <= o.hoursPerDay + 1e-6, `DSR used ${used} h of ${o.hoursPerDay}`);
      }
    }));
  });
}

test("a store never discharges more than it holds, nor charges and discharges in one hour", () => {
  const H = 72;
  const price = Float64Array.from({ length: H }, (_, h) => [5, 60, 30, 250, 10, 400][(h >> 2) % 6]);
  const pb = path(H, [zone(H, 900, 0, [offer("gas", 0, 5000, H, { bid: price })]), zone(H, 300), zone(H, 300)]);
  pb.storage = [battery(0, 800, 3, { budget: new Float64Array([4, 4, 4]) })];
  const u = runLP(pb, solve).units[0];
  let held = 0;
  for (let h = 0; h < H; h++) {
    assert.ok(!(u.charge[h] > 1e-9 && u.discharge[h] > 1e-9), `hour ${h}`);
    assert.ok(u.discharge[h] <= held * 0.9 + 1e-6, `hour ${h}: ${u.discharge[h]} from ${held}`);
    held += u.charge[h] - u.discharge[h] / 0.9;
    assert.ok(Math.abs(held - u.energy[h]) < 1e-6);
    assert.ok(held >= -1e-6 && held <= 800 * 3 + 1e-6);
  }
  assert.ok(u.discharge.reduce((a, x) => a + x, 0) > 0, "it trades");
});

test("identical inputs give byte-identical results (R-ENG-1, R-NFR-5)", () => {
  assert.equal(digest(runLP(randomProblem(9, 168), solve)), digest(runLP(randomProblem(9, 168), solve)));
});

/** One zone (the other two empty) whose price is `prices[h]`: a cheap offer at 20 where it is 20, a
 * mid at 50 where 50, a dear at 80 where 80, each enough for the load of 500 MW. */
function priced(prices: number[]) {
  const H = prices.length;
  const at = (v: number) => Float64Array.from(prices, (x) => (x === v ? 1000 : 0));
  const pb = path(H, [zone(H, 500, 0, [offer("cheap", 20, 0, H), offer("mid", 50, 0, H), offer("dear", 80, 0, H)]), zone(H, 0), zone(H, 0)]);
  pb.zones[0].offers[0].mw = at(20);
  pb.zones[0].offers[1].mw = at(50);
  pb.zones[0].offers[2].mw = at(80);
  return pb;
}

test("the day-ahead horizon carries a store's energy into the next day's window (D-112)", () => {
  // cheap the first day, dear the first four hours of the second
  const pb = priced(Array.from({ length: 72 }, (_, h) => (h >= 24 && h < 28 ? 80 : 20)));
  pb.storage = [{ name: "s", zone: 0, mw: 100, hours: 4, eff: 1, delta: 0, period: 24, budget: null }];
  const r = runLP(pb, solve, DAY_AHEAD);
  assert.ok(Math.abs(r.units[0].energy[23] - 400) < 1e-6, `${r.units[0].energy[23]}`); // charged on day 1
  for (let h = 24; h < 28; h++) assert.ok(Math.abs(r.units[0].discharge[h] - 100) < 1e-6, `hour ${h}`);
});

test("a store sees the day and the next, not the week: a dear hour beyond them is not stored for (D-112)", () => {
  // 20 the first four hours, 80 the 61st to 64th, 50 elsewhere; a cycle costs 35 €/MWh, so only
  // 20 → 80 pays: the week makes it, the day-ahead windows never see both ends of it
  const pb = priced(Array.from({ length: 72 }, (_, h) => (h < 4 ? 20 : h >= 60 && h < 64 ? 80 : 50)));
  pb.storage = [{ name: "s", zone: 0, mw: 100, hours: 4, eff: 1, delta: 35, period: 24, budget: null }];
  const week = runLP(pb, solve, WEEKLY), day = runLP(pb, solve, DAY_AHEAD);
  for (let h = 60; h < 64; h++) assert.ok(Math.abs(week.units[0].discharge[h] - 100) < 1e-6, `weekly, hour ${h}`);
  assert.ok(day.units[0].charge.every((x) => x < 1e-6), "the day-ahead store never charges");
  assert.equal(digest(runLP(pb, solve)), digest(day), "the engine of record's horizon is the day ahead");
});

test("the Daugava's week is shared by the hours left: the dear last day gets less than the week would give it (D-112)", () => {
  // 30 the first day, a euro less each day after, 80 the last: the week keeps its water for the
  // last day; each day's window, not reaching it, spends its share on the day
  const H = 168;
  const pb = path(H, [zone(H, 500, 0, [offer("base", 0, 1000, H)]), zone(H, 0), zone(H, 0)]);
  pb.zones[0].offers[0].bid = Float64Array.from({ length: H }, (_, h) => (h >= 144 ? 80 : 30 - Math.floor(h / 24)));
  pb.reservoir = { zone: 0, budget: fill(1, 16800), pmax: fill(1, 300), pmin: fill(1, 0) };
  const week = runLP(pb, solve, WEEKLY), day = runLP(pb, solve, DAY_AHEAD);
  const lastDay = (r: typeof week) => r.reservoir!.release.slice(144).reduce((a, x) => a + x, 0);
  const total = (r: typeof week) => r.reservoir!.release.reduce((a, x) => a + x, 0);
  assert.ok(Math.abs(total(week) - 16800) < 1e-6 && Math.abs(total(day) - 16800) < 1e-6, `${total(week)} ${total(day)}`);
  assert.ok(Math.abs(lastDay(week) - 7200) < 1e-6, `${lastDay(week)}`); // the turbines' 300 MW all day
  assert.ok(Math.abs(lastDay(day) - 800) < 1e-6, `${lastDay(day)}`); // 16 800 less the days' shares 4 800 … 1 600
});

test("the Daugava uses its budget within its minimum flow and its turbine limit (R-ENG-5)", () => {
  const H = 168;
  const pb = path(H, [zone(H, 0), zone(H, 1000, 0, [offer("gas", 0, 2000, H)]), zone(H, 0)]);
  pb.zones[1].offers[0].bid = Float64Array.from({ length: H }, (_, h) => [60, 100, 40, 90][h % 4]);
  pb.reservoir = { zone: 1, budget: fill(1, 60000), pmax: fill(1, 1500), pmin: fill(1, 100) };
  const rel = runLP(pb, solve).reservoir!.release;
  for (let h = 0; h < H; h++) assert.ok(rel[h] >= 100 - 1e-6 && rel[h] <= 1500 + 1e-6, `hour ${h}: ${rel[h]}`);
  const sum = rel.reduce((a, x) => a + x, 0);
  assert.ok(Math.abs(sum - 60000) < 1e-6, `${sum}`);
});

test("a weekly budget holds on the run's short last block too: the second week's 32 hours get the second budget", () => {
  // dear every evening: the store would discharge each day; each week allows one hour at full power
  const H = 200;
  const pb = path(H, [zone(H, 500, 0, [offer("base", 0, 1000, H)]), zone(H, 0), zone(H, 0)]);
  pb.zones[0].offers[0].bid = Float64Array.from({ length: H }, (_, h) => (h % 24 < 4 ? 20 : h % 24 >= 18 ? 90 : 50));
  pb.storage = [{ name: "s", zone: 0, mw: 100, hours: 4, eff: 0.9, delta: 0, period: 168, budget: Float64Array.from([1, 1]) }];
  const d = runLP(pb, solve).units[0].discharge;
  const drawn = (h0: number, h1: number) => d.slice(h0, h1).reduce((a, x) => a + x / 0.9, 0); // MWh of stored energy
  assert.ok(Math.abs(drawn(0, 168) - 100) < 1e-6, `first week ${drawn(0, 168)}`);
  assert.ok(Math.abs(drawn(168, H) - 100) < 1e-6, `last block ${drawn(168, H)}`);
});

test("a weekly discharge budget is shared by the hours left: each day's window gets its share, the week no more (D-112)", () => {
  // every day 20 €/MWh the first four hours and dear the next four, a euro less each day; the store
  // could move 400 MWh a day, the week allows 700: the week spends it on the two dearest days, the
  // day ahead gives each window (the day and the next) the week's remainder times 48 / the hours left
  const H = 168;
  const pb = path(H, [zone(H, 500, 0, [offer("base", 0, 1000, H)]), zone(H, 0), zone(H, 0)]);
  pb.zones[0].offers[0].bid = Float64Array.from({ length: H }, (_, h) => (h % 24 < 4 ? 20 : h % 24 < 8 ? 80 - Math.floor(h / 24) : 50));
  pb.storage = [{ name: "s", zone: 0, mw: 100, hours: 4, eff: 1, delta: 0, period: 168, budget: Float64Array.from([7]) }];
  const byDay = (r: ReturnType<typeof runLP>) => Array.from({ length: 7 }, (_, d) => r.units[0].discharge.slice(d * 24, d * 24 + 24).reduce((a, x) => a + x, 0));
  const week = byDay(runLP(pb, solve, WEEKLY)), day = byDay(runLP(pb, solve, DAY_AHEAD));
  [400, 300, 0, 0, 0, 0, 0].forEach((x, d) => assert.ok(Math.abs(week[d] - x) < 1e-6, `weekly, day ${d}: ${week[d]}`));
  [200, 500 / 3, 400 / 3, 100, 200 / 3, 100 / 3, 0].forEach((x, d) => assert.ok(Math.abs(day[d] - x) < 1e-6, `day ahead, day ${d}: ${day[d]}`));
});

test("a programme HiGHS leaves unsolved without presolve is solved again with it, and one never solved stops the run (D-130)", () => {
  // a stand-in for highs-js: the first run of each programme is not optimal (status 15), the next is
  const set: Record<string, unknown>[] = [];
  let runs = 0;
  const highs = {
    constants: { modelStatus: { optimal: 7 } },
    createModel: () => ({
      options: { set: (o: Record<string, unknown>) => set.push(o) },
      passModel: () => undefined,
      run: () => ({ modelStatus: runs++ % 2 ? 7 : 15 }),
      getSolution: () => ({ colValue: new Float64Array(1), rowDual: new Float64Array(1) }),
      dispose: () => undefined,
    }),
  } as unknown as Highs;
  const sol = makeSolver(highs)({ numCols: 1, numRows: 0, colCost: new Float64Array(1), colLower: new Float64Array(1), colUpper: new Float64Array(1),
    rowLower: new Float64Array(0), rowUpper: new Float64Array(0), starts: new Int32Array(2), index: new Int32Array(0), value: new Float64Array(0) });
  assert.equal(sol.optimal, true);
  assert.deepEqual(set.map((o) => o.presolve), ["off", "choose"]);
  const never = () => ({ optimal: false, status: "15", colValue: new Float64Array(0), rowDual: new Float64Array(0) });
  assert.throws(() => runLP(randomProblem(1, 48), never), /window from hour 0: the solver returned 15/);
});
