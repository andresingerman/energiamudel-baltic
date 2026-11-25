// A run's weeks shared by the workers (R-ENG-7, D-114): each clearing in parts, put back together,
// is `runLP`'s to the bit — a replay with oil shale's entry, a scenario year with the Daugava, the
// stores and Auvere's entry, a random toy without an entry — for any number of parts, more parts
// than weeks among them; the parts cover the run's weeks in order.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/engine/build.ts";
import { blocks, runLP } from "../src/engine/lp.ts";
import { slice } from "../src/engine/problem.ts";
import type { Problem } from "../src/engine/problem.ts";
import { commitEntry } from "../src/engine/entry.ts";
import { chunks, clearPart, fromParts, joinPrice, runSplit } from "../src/engine/split.ts";
import { engineScenario, opening, runsOf } from "../src/state/model.ts";
import { replay } from "../src/state/scenario.ts";
import { links, presets, year } from "../scripts/data.ts";
import { loadSolver } from "../scripts/highs.ts";
import { randomProblem } from "./toy.ts";

const { solve } = await loadSolver();
const p = presets();
const WEEKS = 168 * 9 + 24; // nine weeks and a short last block, as a year ends

test("the parts cover the run's weekly blocks in order, as evenly as they can", () => {
  for (const [hours, n] of [[8760, 7], [8784, 4], [6552, 8], [8760, 60], [200, 1]]) {
    const weeks = blocks(hours);
    const c = chunks(hours, n);
    assert.equal(c.length, n);
    let h = 0;
    for (const [h0, h1] of c) {
      assert.equal(h0, h, `${hours} h in ${n}: contiguous`);
      assert.ok(h0 === h1 || weeks.some(([a]) => a === h0), "a part starts on a week");
      h = h1;
    }
    assert.equal(h, hours, `${hours} h in ${n}: every hour`);
    const sizes = c.map(([a, b]) => weeks.filter(([w]) => w >= a && w < b).length);
    assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `${sizes}`);
  }
});

const cases: [string, () => Problem][] = [
  ["a replay with oil shale's entry", () => { const y = year("2024"); return slice(build(y, p, null, replay(p, y)), 0, WEEKS); }],
  ["a scenario year: the Daugava, the stores, Auvere's entry", () => {
    const s = opening(p);
    const y = year(runsOf(p, s)[2].key);
    return slice(build(y, p, links(), engineScenario(p, y, s)), 0, WEEKS);
  }],
  ["a random toy without an entry", () => randomProblem(5, 400)],
];

for (const [what, make] of cases) {
  test(`a clearing in parts is runLP's to the bit: ${what} (D-114)`, () => {
    const pb = make();
    const whole = runLP(pb, solve);
    for (const n of [1, 4, 7, 12]) assert.deepStrictEqual(runSplit(pb, solve, n), whole, `${n} parts`);
  });
}

test("parts cleared last to first, as workers take them in any order, come to the same year: no solve carries into the next (D-114)", () => {
  const y = year("2024");
  const pb = slice(build(y, p, null, replay(p, y)), 0, WEEKS);
  const n = 4;
  const backwards = (q: Problem) => Array.from({ length: n }, (_, i) => clearPart(q, solve, n - 1 - i, n));
  const first = backwards(pb);
  const z = pb.entry!.zone;
  const price = joinPrice(pb.hours, first.map((x) => ({ h0: x.h0, price: x.price[z] })));
  assert.deepStrictEqual(fromParts(pb, backwards(commitEntry(pb, price)), price), runLP(pb, solve));
});
