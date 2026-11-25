// The results kept between visits (D-126): typed arrays and every number survive the file exactly,
// and the run key ignores what needs no run.
import assert from "node:assert/strict";
import { test } from "node:test";
import { Lru, bytesOf, decode, encode, excess, isPack, loadIndex, loadOpening, loadSet, pack, read, setId, unpack, within } from "../src/data/stored.ts";
import { opening } from "../src/state/model.ts";
import { runKey } from "../src/state/text.ts";
import { presets } from "../scripts/data.ts";

test("the opening view's file keeps typed arrays' types and every number, NaN, the infinities and −0 included", () => {
  const x = { a: Float64Array.from([1 / 3, NaN, Infinity, -Infinity, 1e-300, -0]), b: Float32Array.from([84.7, -0.5]),
    c: Uint8Array.from([0, 11, 255]), d: { e: NaN, f: [Infinity, 2, -0], g: null, h: "x" } };
  const y = decode<typeof x>(encode(x));
  assert.ok(y.a instanceof Float64Array && y.b instanceof Float32Array && y.c instanceof Uint8Array);
  assert.deepEqual(Array.from(y.a), Array.from(x.a));
  assert.deepEqual(Array.from(y.b), Array.from(x.b));
  assert.deepEqual(Array.from(y.c), Array.from(x.c));
  assert.ok(Number.isNaN(y.d.e));
  assert.ok(Object.is(y.a[5], -0) && Object.is(y.d.f[2], -0), "−0 keeps its sign");
  assert.deepEqual(y.d.f, [Infinity, 2, -0]);
  assert.equal(y.d.g, null);
  assert.equal(y.d.h, "x");
});

test("a pack keeps typed arrays' types and bytes and every number, and reads as the JSON file does (D-236)", () => {
  const x = { a: Float64Array.from([1 / 3, NaN, Infinity, -Infinity, 1e-300, -0]), b: Float32Array.from([84.7, -0.5, NaN]),
    c: Uint8Array.from([0, 11, 255]), d: { e: NaN, f: [Infinity, 2, -0], g: null, h: "x", i: new Int16Array(0) }, j: [new Float32Array(3).subarray(1)] };
  const b = pack(x);
  assert.ok(isPack(b) && !isPack(new TextEncoder().encode(encode(x))));
  const y = unpack<typeof x>(b);
  assert.ok(y.a instanceof Float64Array && y.b instanceof Float32Array && y.c instanceof Uint8Array && y.d.i instanceof Int16Array);
  // the bytes themselves: NaN's too
  const bytes = (a: ArrayBufferView) => Array.from(new Uint8Array(a.buffer, a.byteOffset, a.byteLength));
  for (const k of ["a", "b", "c"] as const) assert.deepEqual(bytes(y[k]), bytes(x[k]));
  assert.equal(y.j[0].length, 2);
  assert.equal(y.a.byteOffset, 0, "each array in a buffer of its own");
  assert.equal(y.a.buffer.byteLength, 48);
  assert.ok(Number.isNaN(y.d.e) && Object.is(y.d.f[2], -0) && y.d.f[0] === Infinity && y.d.g === null && y.d.h === "x");
  // read: a pack or the JSON file, the same value; a pack inside a larger buffer too
  assert.deepEqual(read(b), read(new TextEncoder().encode(encode(x))));
  const inside = new Uint8Array(b.length + 5);
  inside.set(b, 5);
  assert.deepEqual(unpack(inside.subarray(5)), y);
  assert.equal(encode(y), encode(x), "nothing lost: the JSON of the value read is the JSON of the value written");
  assert.throws(() => unpack(new Uint8Array(16)), /not a pack/);
});

test("the run key is the same for the scenario shown and the strike, and differs for anything run", () => {
  const p = presets(), s = opening(p);
  assert.equal(runKey({ ...s, scenario: "smr2", smr: { ...s.smr, strike: s.smr.strike + 10 } }), runKey(s));
  assert.notEqual(runKey({ ...s, fuelGas: s.fuelGas + 1 }), runKey(s));
});

test("a set weighs the bytes of its typed arrays", () => {
  assert.equal(bytesOf({ a: new Float32Array(10), b: [new Float64Array(2), { c: new Uint8Array(3), d: "text", e: 7 }], f: null }), 40 + 16 + 3);
  assert.equal(bytesOf("x"), 0);
});

test("the page's memory keeps the sets last used up to its budget of bytes (D-232)", () => {
  const m = new Lru<string>(100);
  m.set("a", "A", 40);
  m.set("b", "B", 40);
  assert.equal(m.get("a"), "A"); // read: now newer than b
  m.set("c", "C", 40); // 120 bytes: the longest unused goes
  assert.equal(m.get("b"), undefined);
  assert.equal(m.get("a"), "A");
  assert.equal(m.get("c"), "C");
  assert.equal(m.bytes, 80);
  m.set("a", "A2", 10); // kept again under its key: its old bytes go with it
  assert.equal(m.bytes, 50);
  assert.equal(m.get("a"), "A2");
  m.set("big", "X", 500); // larger than the budget: it alone stays
  assert.equal(m.size, 1);
  assert.equal(m.get("big"), "X");
  assert.equal(m.bytes, 500);
});

test("the browser drops the sets of other builds and the longest unused beyond its budget of bytes (D-232)", () => {
  const seen: [string, number, number][] = [
    ["c|e|job 1", 1000, 40], ["c|e|job 2", 3000, 40], ["c|e|job 3", 2000, 40], ["old|e|job 1", 9000, 40], ["c|other|job 1", 9000, 40],
  ];
  // room for two: the two last used stay, the other build's and the other export's go whatever their age
  assert.deepEqual(excess(seen, "c|e|", 80).sort(), ["c|e|job 1", "c|other|job 1", "old|e|job 1"]);
  assert.deepEqual(excess(seen, "c|e|", 1000).sort(), ["c|other|job 1", "old|e|job 1"]);
  assert.deepEqual(excess(seen.slice(0, 3), "c|e|", 120), []);
  // the newest stays even alone over the budget: what was just computed is not thrown away
  assert.deepEqual(excess(seen.slice(0, 3), "c|e|", 10).sort(), ["c|e|job 1", "c|e|job 3"]);
});

test("the page waits for its store no longer than its patience: a store that never answers is done without (E-191)", async () => {
  const never = new Promise<string>(() => undefined);
  const t0 = performance.now();
  assert.equal(await within(never, "without", 30), "without");
  assert.ok(performance.now() - t0 >= 25 && performance.now() - t0 < 500);
  assert.equal(await within(Promise.resolve("kept"), "without", 30), "kept");
  assert.equal(await within(Promise.reject(new Error("refused")), "without", 30), "without");
  // an answer after the patience is not waited for, and changes nothing
  assert.equal(await within(new Promise<string>((r) => setTimeout(() => r("late"), 60)), "without", 20), "without");
});

test("the build's files are read only for the sources they were computed by, under the page's own ids (D-126, D-129, D-237)", async () => {
  const files: Record<string, unknown> = {
    "opening.bin.gz": { commit: "c1", engine: "abc", export: "e", key: "k", trio: {}, sens: {} },
    "sets.json.gz": { commit: "c1", engine: "abc", export: "e", sets: { [setId("k")]: "sets/0.json.gz", [setId("k", "smr2|a")]: "sets/1.json.gz" } },
    "sets/0.json.gz": { trio: 1 }, "sets/1.json.gz": { sens: 1 },
  };
  const real = globalThis.fetch;
  globalThis.fetch = (async (u: string) => {
    const f = files[new URL(u).pathname.slice(1)];
    // the build writes the sets as packs and their list as JSON; the page reads either
    return f ? new Response(new URL(u).pathname.endsWith("sets.json.gz") ? encode(f) : pack(f) as unknown as BodyInit) : new Response("", { status: 404 });
  }) as typeof fetch;
  try {
    const base = "https://site.test/";
    assert.equal((await loadOpening(base, "abc"))?.key, "k");
    assert.equal(await loadOpening(base, "abd"), null); // a file other sources computed
    assert.equal(await loadOpening(base, "c1"), null); // the commit is no key
    const index = await loadIndex(base, "abc");
    assert.deepEqual(await loadSet(base, index, setId("k")), { trio: 1 });
    assert.deepEqual(await loadSet(base, index, setId("k", "smr2|a")), { sens: 1 });
    assert.equal(await loadSet(base, index, setId("other")), null);
    assert.equal(await loadIndex(base, "abd"), null);
  } finally {
    globalThis.fetch = real;
  }
});
