// A Node worker speaking the browser worker's protocol (D-114, `runYear` in src/worker/pool.ts): a job
// with the panel's state runs as the browser's does (src/worker/job.ts, D-128) — its year files, the
// presets and the links read from the export once — floors, views and samples included; the bench's
// named runs of runs.ts, which have no state, clear their parts the same way, the view left out.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parentPort } from "node:worker_threads";
import type { Year } from "../src/contract/year.ts";
import type { Problem } from "../src/engine/problem.ts";
import type { Part } from "../src/engine/split.ts";
import { clearPart, fromParts, secondPart } from "../src/engine/split.ts";
import type { Attribution } from "../src/worker/outages.ts";
import type { Files, Job } from "../src/worker/job.ts";
import { runJob } from "../src/worker/job.ts";
import { EXPORT, links, presets, readJson, year } from "./data.ts";
import { loadSolver } from "./highs.ts";
import { make } from "./runs.ts";

interface Named { id: number; key: string; state?: undefined; part?: { k: number; n: number; price?: Float64Array; first?: Part }; finish?: { parts: Part[]; price: Float64Array | null } }

const { solve } = await loadSolver();
const p = presets();
const L = links();
const years = new Map<string, Year>();
const files: Files = {
  solve: Promise.resolve(solve),
  year: async (key) => {
    if (!years.has(key)) years.set(key, year(key));
    return years.get(key)!;
  },
  presets: async () => p,
  links: async () => L,
  attribution: async (key) => {
    const f = join(EXPORT, "attribution", `${key}.json.gz`);
    return existsSync(f) ? readJson<Attribution>(f) : null;
  },
};
// runs.ts's runs read their files on every call: built once per worker
const made = new Map<string, Problem>();

parentPort!.on("message", async (m: Job | Named) => {
  try {
    if (m.state) {
      const { reply, transfer } = await runJob(m, files);
      parentPort!.postMessage(reply, transfer);
      return;
    }
    if (!made.has(m.key)) made.set(m.key, make(m.key));
    const pb = made.get(m.key)!;
    if (m.finish) {
      fromParts(pb, m.finish.parts, m.finish.price);
      parentPort!.postMessage({ id: m.id });
    } else if (m.part!.price) {
      parentPort!.postMessage({ id: m.id, part: secondPart(pb, solve, m.part!.k, m.part!.n, m.part!.price, m.part!.first ?? null) });
    } else {
      const q = clearPart(pb, solve, m.part!.k, m.part!.n);
      parentPort!.postMessage(pb.entry ? { id: m.id, entry: true, h0: q.h0, price: q.price[pb.entry.zone], part: q } : { id: m.id, part: q });
    }
  } catch (e) {
    parentPort!.postMessage({ id: m.id, error: String((e as Error)?.stack ?? e) }); // the stack: Node's runs are the tests' and the build's
  }
});
