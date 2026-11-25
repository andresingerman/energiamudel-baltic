// Where a set comes from (data/sets.ts, D-232, D-238, D-239): the page's memory, the browser's store, the build's
// files — and what each asker may keep. The store here is a Map, the build's files are functions.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Keeping } from "../src/data/sets.ts";
import { Sets, known } from "../src/data/sets.ts";

type S = { name: string; a: Float32Array };
const set = (name: string, n = 10): S => ({ name, a: new Float32Array(n) });
/** A browser's store, with what was asked of it. */
function browser(prefix: string | null = "id|export|") {
  const kept = new Map<string, S>(), asked: string[] = [];
  const keeping: Keeping<S> = {
    prefix: Promise.resolve(prefix),
    recall: async (id) => { asked.push(id); return kept.get(id) ?? null; },
    remember: (id, v, pre) => { assert.ok(id.startsWith(pre)); kept.set(id, v); },
  };
  return { kept, asked, keeping };
}
const settle = () => new Promise((r) => setTimeout(r, 0));

test("a set computed goes into the page's memory and the browser's store; a later page reads it from the store once", async () => {
  const b = browser();
  const page = new Sets<S>(1e6, b.keeping);
  assert.equal(await page.kept("job A"), null);
  page.put("job A", set("A"));
  await settle();
  assert.deepEqual([...b.kept.keys()], ["id|export|job A"]);
  assert.deepEqual(await page.kept("job A"), { set: set("A"), from: "browser" });
  // the page loaded again: its memory is empty, the store holds the set
  b.asked.length = 0;
  const again = new Sets<S>(1e6, b.keeping);
  assert.equal(again.peek("job A"), undefined);
  assert.equal((await again.kept("job A"))?.set.name, "A");
  assert.equal((await again.kept("job A"))?.from, "browser");
  assert.deepEqual(b.asked, ["id|export|job A"], "the second asking is the memory's");
  assert.equal(again.peek("job A")?.name, "A");
});

test("without a store's key nothing is kept in the browser and nothing kept is read (a page with ?nostore)", async () => {
  const b = browser(null);
  b.kept.set("id|export|job A", set("old"));
  const page = new Sets<S>(1e6, b.keeping);
  assert.equal(await page.kept("job A"), null);
  page.put("job A", set("A"));
  await settle();
  assert.deepEqual(b.asked, []);
  assert.equal(b.kept.get("id|export|job A")?.name, "old");
  assert.equal(page.peek("job A")?.name, "A");
});

test("the page's memory holds the sets last used up to its bytes; what it lets go the store still has", async () => {
  const b = browser();
  const page = new Sets<S>(100, b.keeping); // room for two sets of 40 bytes
  for (const k of ["A", "B", "C"]) page.put(`job ${k}`, set(k));
  await settle();
  assert.equal(page.peek("job A"), undefined);
  assert.equal(page.peek("job C")?.name, "C");
  assert.equal((await page.kept("job A"))?.set.name, "A");
});

test("the sets of a state are known when all of them are: the opening view, the memory and the store, the build's file", async () => {
  const jobs = ["gas", "smr1"];
  const none = async () => null;
  // nothing anywhere
  let b = browser(), page = new Sets<S>(1e6, b.keeping);
  assert.equal(await known(page, jobs, none, none), null);
  // the build's opening view: its sets, and its sensitivities by their jobs, into the memory
  b.asked.length = 0;
  const o = await known(page, jobs, async () => ({ sets: [set("gas"), set("smr1")], sens: [["gas at pair 1", set("sens")]] }), none);
  assert.deepEqual([o?.from, o?.opening, o?.sets.map((x) => x.name)], ["site", true, ["gas", "smr1"]]);
  assert.equal(page.peek("gas at pair 1")?.name, "sens");
  assert.deepEqual(b.asked, [], "the opening view asks no store");
  // one of two in the store: not known — but the one found is in the memory for the run that follows
  b = browser(); page = new Sets<S>(1e6, b.keeping);
  b.kept.set("id|export|gas", set("gas"));
  assert.equal(await known(page, jobs, none, none), null);
  assert.equal(page.peek("gas")?.name, "gas");
  assert.equal(page.peek("smr1"), undefined);
  // both, one of them this browser's: the answer is the browser's
  page.keep("smr1", set("smr1"), "site");
  const both = await known(page, jobs, none, async () => { throw new Error("the file is not asked for"); });
  assert.deepEqual([both?.from, both?.opening, both?.sets.map((x) => x.name)], ["browser", false, ["gas", "smr1"]]);
  // only the build's file: its sets, in the jobs' order, into the memory as the site's
  b = browser(); page = new Sets<S>(1e6, b.keeping);
  const f = await known(page, jobs, none, async () => [set("gas"), set("smr1")]);
  assert.deepEqual([f?.from, f?.sets.map((x) => x.name)], ["site", ["gas", "smr1"]]);
  assert.deepEqual((await page.kept("smr1")), { set: set("smr1"), from: "site" });
  assert.deepEqual([...b.kept.keys()], [], "what the site holds is not written to the browser");
});

test("an asker superseded while the answers come keeps nothing and is told so (D-238)", async () => {
  const b = browser(), page = new Sets<S>(1e6, b.keeping);
  let live = true;
  // the latest asker: the build's file, kept under its job
  assert.equal((await page.found("job A", async () => set("A's file"), () => live))?.name, "A's file");
  assert.equal(page.peek("job A")?.name, "A's file");
  // nothing anywhere: to be computed
  assert.equal(await page.found("job B", async () => null, () => live), null);
  // superseded while the file came: the file — another state's, by then — is not kept under this job
  const stale = await page.found("job C", async () => { live = false; return set("another state's"); }, () => live);
  assert.equal(stale, undefined);
  assert.equal(page.peek("job C"), undefined);
  // superseded while the store answered: the file is not even asked for
  assert.equal(await page.found("job D", async () => { throw new Error("not asked"); }, () => false), undefined);
  // kept before: no file is asked for
  live = true;
  assert.equal((await page.found("job A", async () => { throw new Error("not asked"); }, () => live))?.name, "A's file");
});
