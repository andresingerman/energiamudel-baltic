// What a set is valid for besides the data and its job (D-237): the sources that compute it and keep it. The id is a
// hash of every file under the directories of ENGINE_DIRS — the engine, the worker with its job, pool and view, the
// state and its text (the job's key), the store, the contract's types — of the scenario schema
// the text is checked against and of the solver's version as package-lock.json pins it. The page keeps a set in its
// browser under this id, and reads the build's sets only for it, so that an edit to the interface — which cannot
// move a figure — keeps what was computed, on the site and on the development server alike, and an edit to any of
// these files drops it. `test/engine_id.test.ts` finds every static import of the worker, the pool, the store and
// the text inside these directories: nothing outside them can change a set.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const APP = join(fileURLToPath(new URL(".", import.meta.url)), "..");
export const ENGINE_DIRS = ["src/contract", "src/data", "src/engine", "src/state", "src/worker"];
export const ENGINE_FILES = ["../schema/scenario.schema.json"];
/** The entries whose static imports hold all that computes, splits, keeps or names a set. */
export const ENGINE_ENTRIES = ["src/worker/engine.worker.ts", "src/worker/pool.ts", "src/data/stored.ts", "src/state/text.ts"];

// the sources alone: a file the system leaves in a directory (.DS_Store) is none
const under = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? under(join(d, e.name)) : /\.(ts|json)$/.test(e.name) ? [join(d, e.name)] : []));

/** The files the id is of, by their path from app/, sorted. */
export function engineFiles(): string[] {
  return [...ENGINE_DIRS.flatMap((d) => under(join(APP, d))), ...ENGINE_FILES.map((f) => join(APP, f))].map((f) => relative(APP, f)).sort();
}

export function engineId(): string {
  const h = createHash("sha256");
  for (const f of engineFiles()) h.update(`${f}\0`).update(readFileSync(join(APP, f))).update("\0");
  const lock = JSON.parse(readFileSync(join(APP, "package-lock.json"), "utf8")) as { packages: Record<string, { version?: string; integrity?: string }> };
  const solver = lock.packages["node_modules/highs"];
  if (!solver?.version) throw new Error("package-lock.json pins no solver");
  return h.update(`highs ${solver.version} ${solver.integrity ?? ""}`).digest("hex").slice(0, 12);
}
