// The TypeScript side of the data contract (SPECIFICATION.md R-NFR-7; docs/PLAN.md §3.2):
// schema/*.schema.json -> src/contract/*.ts. The schemas are the single definition; the types
// are generated and committed. `--check` regenerates in memory and fails if a committed file is
// stale, so a schema change without its types cannot pass.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileFromFile } from "json-schema-to-typescript";

const here = fileURLToPath(new URL(".", import.meta.url));
const schemaDir = join(here, "..", "..", "schema");
const outDir = join(here, "..", "src", "contract");
const check = process.argv.includes("--check");
const banner = "/* Generated from schema/%s by `npm run contract`. Do not edit. */";

let stale = 0;
for (const file of (await readdir(schemaDir)).filter((f) => f.endsWith(".schema.json")).sort()) {
  const ts = await compileFromFile(join(schemaDir, file), {
    bannerComment: banner.replace("%s", file),
    additionalProperties: false,
    ignoreMinAndMaxItems: true, // lengths are checked at run time (guards.ts), not as tuples
    cwd: schemaDir,
    style: { semi: true, singleQuote: false, printWidth: 100 },
  });
  const target = join(outDir, basename(file, ".schema.json") + ".ts");
  if (check) {
    const have = await readFile(target, "utf8").catch(() => "");
    if (have !== ts) {
      console.error(`stale: ${target}`);
      stale += 1;
    }
  } else {
    await writeFile(target, ts);
    console.log(`wrote ${target}`);
  }
}
process.exit(stale ? 1 : 0);
