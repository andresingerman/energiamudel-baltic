// R-NFR-5 across engines: the golden fixture's cases recomputed in JavaScriptCore — Safari's engine,
// macOS's jsc shell — must give the digests V8 gives (validate/golden.fixture.json). Vite bundles
// scripts/jsc/golden.ts with the year file, the presets and HiGHS's WebAssembly beside it.
// `node --no-maglev scripts/golden_jsc.ts` exits 1 on a difference; where there is no jsc shell it says so and
// passes, except under CI (the variable CI set), where a check that cannot run is a failure.
// `--time` also prints each case's run time in JavaScriptCore beside V8's (D-128: Safari's speed).
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { build } from "vite";
import { EXPORT } from "./data.ts";

const JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc";
const here = fileURLToPath(new URL(".", import.meta.url));
const FIXTURE = join(here, "..", "..", "validate", "golden.fixture.json");

if (!existsSync(JSC)) {
  console.log(`golden (JavaScriptCore): no jsc shell on this machine${process.env.CI ? " — under CI that is a failure" : ", skipped"}`);
  process.exit(process.env.CI ? 1 : 0);
}
const dir = mkdtempSync(join(tmpdir(), "golden-jsc-"));
try {
  for (const key of ["2024", "cy2009"]) writeFileSync(join(dir, `${key}.json`), gunzipSync(readFileSync(join(EXPORT, "years", `${key}.json.gz`))));
  writeFileSync(join(dir, "links.json"), gunzipSync(readFileSync(join(EXPORT, "links.json.gz"))));
  copyFileSync(join(EXPORT, "presets.json"), join(dir, "presets.json"));
  copyFileSync(createRequire(import.meta.url).resolve("highs/runtime"), join(dir, "highs.wasm"));
  await build({
    configFile: false,
    logLevel: "warn",
    define: { __DIR__: JSON.stringify(dir) },
    build: {
      lib: { entry: join(here, "jsc", "golden.ts"), formats: ["es"], fileName: () => "golden.mjs" },
      outDir: dir, emptyOutDir: false, minify: false, target: "es2022",
      rolldownOptions: { external: [/^node:/] }, // HiGHS imports node's modules only when it runs in node
    },
  });
  const lines = execFileSync(JSC, ["-m", join(dir, "golden.mjs")], { encoding: "utf8" }).trim().split("\n").map((l) => l.split(" "));
  const got = Object.fromEntries(lines.map(([k, sha]) => [k, sha]));
  if (process.argv.includes("--time")) {
    const { goldenRuns } = await import("./golden_cases.ts");
    const { links, presets, year } = await import("./data.ts");
    const { loadSolver } = await import("./highs.ts");
    const runs = goldenRuns(presets(), year, links(), (await loadSolver()).solve);
    for (const [k, , ms] of lines) {
      const t = performance.now();
      runs[k]();
      console.log(`${k}: JavaScriptCore ${ms} ms, V8 ${(performance.now() - t).toFixed(0)} ms`);
    }
  }
  const want = (JSON.parse(readFileSync(FIXTURE, "utf8")) as { cases: Record<string, { sha256: string }> }).cases;
  const bad = Object.keys(want).filter((k) => got[k] !== want[k].sha256);
  for (const k of bad) console.error(`golden (JavaScriptCore): ${k} ${got[k] ?? "missing"}, V8's ${want[k].sha256}`);
  if (bad.length) process.exitCode = 1;
  else console.log(`golden (JavaScriptCore): ${Object.keys(want).length} cases as V8's`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
