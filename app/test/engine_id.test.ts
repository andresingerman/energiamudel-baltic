// The id of the sources that compute a set (scripts/engine_id.ts, D-237): a set kept in a browser or computed by the
// build is read only under it, so every source that can move a set must be among the files it is a hash of.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { test } from "node:test";
import { APP, ENGINE_DIRS, ENGINE_ENTRIES, engineFiles, engineId } from "../scripts/engine_id.ts";

/** Every file a static or dynamic import reaches from `entries` — type-only imports too, which is more than a
 * bundle holds and never less — and the packages they name. */
function reach(entries: string[]): { files: string[]; packages: string[] } {
  const files = new Set<string>(), packages = new Set<string>();
  const SPEC = /\bfrom\s+["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)|^\s*import\s+["']([^"']+)["']/gm;
  const walk = (file: string): void => {
    if (files.has(file)) return;
    assert.ok(existsSync(file), `${relative(APP, file)} is imported and does not exist`);
    files.add(file);
    if (!/\.(ts|mjs|js)$/.test(file)) return;
    for (const m of readFileSync(file, "utf8").matchAll(SPEC)) {
      const spec = (m[1] ?? m[2] ?? m[3]).split("?")[0];
      if (spec.startsWith(".")) walk(resolve(dirname(file), spec));
      else packages.add(spec);
    }
  };
  for (const e of entries) walk(join(APP, e));
  return { files: [...files].map((f) => relative(APP, f)).sort(), packages: [...packages].sort() };
}

test("every source the worker, the pool, the store and the job's key import is among the files the engine id is of (D-237)", () => {
  const { files, packages } = reach(ENGINE_ENTRIES);
  const hashed = new Set(engineFiles());
  assert.deepEqual(files.filter((f) => !hashed.has(f)), [], "a source outside the engine's directories can move a set: move it in, or add its directory to ENGINE_DIRS");
  // the interface is not among them: an edit to it keeps what was computed
  assert.deepEqual(files.filter((f) => f.startsWith("src/ui/") || f === "src/main.ts"), []);
  // the solver is the one package: its version is in the id
  assert.deepEqual(packages, ["highs", "highs/runtime"]);
  assert.ok(files.length >= 20 && ENGINE_DIRS.every((d) => files.some((f) => f.startsWith(`${d}/`))), "each directory holds a source the entries reach");
});

test("the engine id is twelve hex digits of the sources as they stand", () => {
  const id = engineId();
  assert.match(id, /^[0-9a-f]{12}$/);
  assert.equal(engineId(), id);
});
