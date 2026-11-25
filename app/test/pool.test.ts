// The worker pool with fake workers: priorities, parallel runs, superseded generations (R-ENG-7).
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Port } from "../src/worker/pool.ts";
import { Pool, runYear } from "../src/worker/pool.ts";

/** A fake worker that answers when told to, so the test decides the order. */
function fake(log: string[]) {
  const pending: { id: number; tag: string }[] = [];
  const port: Port & { answer(): void; fail(message: string): void } = {
    onmessage: null,
    postMessage(msg: unknown) {
      const m = msg as { id: number; tag: string };
      log.push(`start ${m.tag}`);
      pending.push({ id: m.id, tag: m.tag });
    },
    answer() {
      const m = pending.shift()!;
      port.onmessage!({ data: { id: m.id, tag: m.tag } });
    },
    fail(message: string) {
      pending.shift();
      port.onerror!({ message });
    },
  };
  return port;
}

test("a set runs in parallel, sensitivities wait, a new generation drops what is queued", async () => {
  const log: string[] = [];
  const w = [fake(log), fake(log)];
  const pool = new Pool(w);
  const got: string[] = [];
  const track = (p: Promise<unknown>, tag: string) => p.then(() => got.push(tag), (e: Error) => got.push(`${tag}: ${e.message}`));
  const a = track(pool.run({ tag: "cy1995" }), "cy1995");
  const b = track(pool.run({ tag: "cy2008" }), "cy2008");
  const s = track(pool.run({ tag: "sens" }, 1), "sens");
  const c = track(pool.run({ tag: "cy2009" }), "cy2009");
  assert.deepEqual(log, ["start cy1995", "start cy2008"]); // two workers, two jobs at once
  w[0].answer(); // cy1995 done: the headline's cy2009 goes before the sensitivity
  await Promise.resolve(); // the worker freed takes its next job once the answer's continuation has run (D-128)
  assert.equal(log[2], "start cy2009");
  pool.next(); // a control changed: the queued sensitivity is dropped
  w[1].answer(); // cy2008 finishes for the old generation and is thrown away
  await Promise.all([a, s]);
  w[0].answer();
  await Promise.all([b, c]);
  assert.deepEqual(got.sort(), ["cy1995", "cy2008: superseded", "cy2009: superseded", "sens: superseded"]);
  assert.equal(pool.pending, 0);
});

test("pool size: one less than the cores, one to eight (D-114)", () => {
  assert.deepEqual([1, 2, 4, 8, 16, undefined].map((n) => Pool.size(n)), [1, 1, 3, 7, 8, 1]);
});

test("cancel drops a tag's queued jobs and the result of its running one, and nothing else", async () => {
  const log: string[] = [];
  const w = [fake(log)];
  const pool = new Pool(w);
  const got: string[] = [];
  const track = (p: Promise<unknown>, tag: string) => p.then(() => got.push(tag), (e: Error) => got.push(`${tag}: ${e.message}`));
  const x = track(pool.run({ tag: "adequacy" }, 2), "sample 1");
  const y = track(pool.run({ tag: "adequacy" }, 2), "sample 2");
  const h = track(pool.run({ tag: "headline" }, 0), "headline");
  pool.cancel("adequacy"); // sample 1 is running, sample 2 waits
  w[0].answer(); // sample 1 comes back and is thrown away; the headline starts
  await Promise.all([x, y]);
  w[0].answer();
  await h;
  assert.deepEqual(got.sort(), ["headline", "sample 1: cancelled", "sample 2: cancelled"]);
  assert.equal(pool.pending, 0);
});

test("shift moves a tag's queued jobs behind another page's, and back, and nothing else (D-233)", async () => {
  const log: string[] = [];
  const w = [fake(log)];
  const pool = new Pool(w);
  const all = [pool.run({ tag: "running" }, 0), pool.run({ tag: "sens" }, 1), pool.run({ tag: "pres" }, 2), pool.run({ tag: "sens" }, 1)];
  pool.shift("sens", 1.9); // another page is shown: its sets first
  w[0].answer();
  await all[0];
  assert.deepEqual(log, ["start running", "start pres"]);
  pool.run({ tag: "pres" }, 2.1).catch(() => undefined);
  pool.shift("sens", -1.9); // the Model view again
  w[0].answer();
  await all[2];
  w[0].answer();
  await all[1];
  w[0].answer();
  await all[3];
  assert.deepEqual(log, ["start running", "start pres", "start sens", "start sens", "start pres"]);
  // a job asked for while its tag is moved takes the tag's place too: a year's later clearings among them (D-238)
  const later: string[] = [];
  const port = fake(later);
  const one = new Pool([port]);
  const first = one.run({ tag: "running" }, 0);
  one.shift("sens", 1.9);
  const jobs = [one.run({ tag: "sens" }, 1 - 0.5), one.run({ tag: "pres" }, 2)];
  port.answer();
  await first;
  port.answer();
  await jobs[1];
  port.answer();
  await jobs[0];
  assert.deepEqual(later, ["start running", "start pres", "start sens"]);
});

test("a worker that does not answer is given up: its job fails, the others go on, a late answer is not read (D-238)", async () => {
  const log: string[] = [];
  const w = [fake(log), fake(log)];
  let let_go = 0;
  w[0].terminate = () => { let_go++; };
  const pool = new Pool(w, 30);
  const got: string[] = [];
  const track = (p: Promise<unknown>, tag: string) => p.then(() => got.push(tag), (e: Error) => got.push(`${tag}: ${e.message}`));
  const a = track(pool.run({ tag: "a" }), "a"); // on the first worker, which stays silent
  const b = track(pool.run({ tag: "b" }), "b"); // on the second
  const c = track(pool.run({ tag: "c" }), "c"); // waits
  w[1].answer();
  await b;
  w[1].answer(); // c took the freed worker
  await c;
  await a; // after its 30 ms
  assert.deepEqual(got, ["b", "c", "a: a worker did not answer in 0 s and was given up"]);
  assert.equal(let_go, 1);
  w[0].answer(); // the silent worker's answer, late: no job is its
  const d = track(pool.run({ tag: "d" }), "d");
  assert.deepEqual(log.filter((x) => x === "start d").length, 1);
  w[1].answer();
  await d;
  assert.equal(got[3], "d");
  // the last worker silent too: its job fails, and one asked after it at once
  const e = track(pool.run({ tag: "e" }), "e");
  await e;
  await track(pool.run({ tag: "f" }), "f");
  assert.deepEqual(got.slice(4), ["e: a worker did not answer in 0 s and was given up", "f: no worker is left: load the page again"]);
});

test("a worker's uncaught error answers its job with the error and frees the worker (R-ENG-7)", async () => {
  const log: string[] = [];
  const w = fake(log);
  const pool = new Pool([w]);
  const a = pool.run({ tag: "a" }).then(() => "resolved", (e: Error) => e.message);
  w.fail("boom");
  assert.equal(await a, "the worker failed: boom");
  const b = pool.run({ tag: "b" }); // the worker is idle again and takes the next job
  assert.deepEqual(log, ["start a", "start b"]);
  w.answer();
  assert.deepEqual(await b, { id: 2, tag: "b" });
});

/** A fake engine worker that answers at once: the first clearing's part k hours 10k…10k + 9 of the
 * entry's zone's price at k (or, without an entry, the part itself), the second the price it was
 * sent, the finish what it was sent. */
function engine(log: string[], entry: boolean): Port {
  const port: Port = {
    onmessage: null,
    postMessage(msg: unknown) {
      const m = msg as { id: number; part?: { k: number; price?: Float64Array }; finish?: unknown };
      let data: Record<string, unknown>;
      if (m.part && !m.part.price) {
        log.push(`first ${m.part.k}`);
        data = entry ? { id: m.id, entry: true, h0: 10 * m.part.k, price: new Float64Array(10).fill(m.part.k) } : { id: m.id, part: `first ${m.part.k}` };
      } else if (m.part) {
        log.push(`second ${m.part.k}`);
        data = { id: m.id, part: `second ${m.part.k} on ${Array.from(m.part.price!).join("")}` };
      } else {
        log.push("finish");
        data = { id: m.id, finish: m.finish };
      }
      queueMicrotask(() => port.onmessage!({ data }));
    },
  };
  return port;
}

test("a year's weeks on every worker: the first clearing in parts, each part of the second on the joined price up to its end, then the finish (D-114, D-128)", async () => {
  const log: string[] = [];
  const pool = new Pool([engine(log, true), engine(log, true), engine(log, true)]);
  const r = await runYear<{ finish: { parts: string[]; price: Float64Array } }>(pool, { key: "cy2009" });
  assert.deepEqual(log, ["first 0", "first 1", "first 2", "second 0", "second 1", "second 2", "finish"]);
  const joined = "0".repeat(10) + "1".repeat(10) + "2".repeat(10);
  assert.deepEqual(r.finish.parts, [0, 1, 2].map((k) => `second ${k} on ${joined.slice(0, 10 * (k + 1))}`));
  assert.equal(Array.from(r.finish.price).join(""), joined);
});

test("part k of the second clearing goes as soon as the first's parts 0 to k are in, not after all of them (D-128)", async () => {
  const log: string[] = [];
  // workers that answer when told: the first clearing's part k has hours 10k…10k + 9
  const manual = () => {
    const pending: { id: number; k: number; second: boolean }[] = [];
    const port: Port & { answer(): void } = {
      onmessage: null,
      postMessage(msg: unknown) {
        const m = msg as { id: number; part?: { k: number; price?: Float64Array } };
        log.push(m.part ? `${m.part.price ? `second ${m.part.k} on ${m.part.price.length} h` : `first ${m.part.k}`}` : "finish");
        pending.push({ id: m.id, k: m.part?.k ?? -1, second: !!m.part?.price });
      },
      answer() {
        const m = pending.shift()!;
        port.onmessage!({ data: m.second || m.k < 0 ? { id: m.id, part: m.k } : { id: m.id, entry: true, h0: 10 * m.k, price: new Float64Array(10) } });
      },
    };
    return port;
  };
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const [a, b] = [manual(), manual()];
  const pool = new Pool([a, b]);
  const year = runYear(new Proxy(pool, { get: (t, k) => (k === "workers" ? 3 : Reflect.get(t, k)) }), { key: "cy2009" });
  assert.deepEqual(log, ["first 0", "first 1"]); // two workers, three parts
  a.answer(); // the first's part 0 in: the second's part 0 goes before the first's part 2
  await tick();
  assert.deepEqual(log, ["first 0", "first 1", "second 0 on 10 h"]);
  b.answer(); // part 1 in: the second's part 1 waits for a worker, ahead of the first's part 2
  await tick();
  assert.deepEqual(log.slice(3), ["second 1 on 20 h"]);
  a.answer(); // the second's part 0 back; the first's part 2 finally goes
  await tick();
  assert.deepEqual(log.slice(4), ["first 2"]);
  for (const w of [b, a, b, a]) { w.answer(); await tick(); }
  await year;
  assert.deepEqual(log.slice(5), ["second 2 on 30 h", "finish"]);
});

test("a year without an entry is put together from its one clearing; a new generation stops a year (D-114)", async () => {
  const log: string[] = [];
  const pool = new Pool([engine(log, false), engine(log, false)]);
  const r = await runYear<{ finish: { parts: string[]; price: null } }>(pool, { key: "2024" });
  assert.deepEqual(log, ["first 0", "first 1", "finish"]);
  assert.deepEqual(r.finish, { parts: ["first 0", "first 1"], price: null });
  const late = runYear(pool, { key: "2025" }).then(() => "resolved", (e: Error) => e.message);
  pool.next(); // a control changed while the year's first clearing ran
  assert.equal(await late, "superseded");
});

test("the scenario shown first: each scenario's years finish before the next one's, which fill the gaps between (D-127)", async () => {
  const log: string[] = [];
  // three workers answering after a moment, each job logged by its year
  const port = (): Port => {
    const w: Port = {
      onmessage: null,
      postMessage(msg: unknown) {
        const m = msg as { id: number; key: string; part?: { k: number; price?: Float64Array } };
        const what = m.part ? (m.part.price ? "second" : "first") : "finish";
        log.push(`${m.key} ${what}`);
        const data = what === "first" ? { id: m.id, entry: true, h0: 10 * m.part!.k, price: new Float64Array(10) } : { id: m.id, part: 1 };
        setTimeout(() => w.onmessage!({ data }), 1);
      },
    };
    return w;
  };
  const pool = new Pool([port(), port(), port()]);
  const years = (s: string, i: number) => ["1995", "2008", "2009"].map((y) => runYear(pool, { key: `${s} ${y}` }, i / 4));
  await Promise.all(["smr2", "gas", "smr1"].flatMap((s, i) => years(s, i)));
  const done = log.filter((l) => l.endsWith("finish")).map((l) => l.split(" ")[0]);
  assert.deepEqual(done, ["smr2", "smr2", "smr2", "gas", "gas", "gas", "smr1", "smr1", "smr1"]);
  assert.ok(log.indexOf("gas 1995 first") < log.lastIndexOf("smr2 2009 finish"), "the next scenario fills a gap before the first is done");
});

test("a worker that fails with no job is retired, and a late reply to an answered job is not the next one's", async () => {
  const log: string[] = [];
  const w = [fake(log), fake(log)];
  const pool = new Pool(w);
  w[1].onerror!({ message: "the module did not load" }); // idle: nothing to answer
  const got: string[] = [];
  const a = pool.run({ tag: "a" }).then(() => got.push("a"));
  const b = pool.run({ tag: "b" }).then(() => got.push("b"));
  assert.deepEqual(log, ["start a"]); // one worker left: b waits
  w[0].onmessage!({ data: { id: 99, tag: "stray" } }); // no job of this pool had id 99
  await Promise.resolve();
  assert.deepEqual(log, ["start a"]);
  w[0].answer();
  await Promise.resolve();
  assert.deepEqual(log, ["start a", "start b"]);
  w[0].answer();
  await Promise.all([a, b]);
  assert.deepEqual(got, ["a", "b"]);
  const only = fake(log);
  const lone = new Pool([only]);
  only.onerror!({ message: "the module did not load" }); // no worker left: a job is refused, not lost
  await assert.rejects(lone.run({ tag: "c" }), /no worker could start/);
});
