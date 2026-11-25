// The static site (R-NFR-1, D14): Vite builds app/ into dist/, the export under data/ (a symlink
// to ../data/export, D-013), the fonts under fonts/; the workers are ES modules.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, sep } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { APP, ENGINE_DIRS, engineId } from "./scripts/engine_id.ts";

// the code version an export carries (R-APP-10): the package's and the commit it was built from
const commit = (() => { try { return execSync("git describe --always --dirty --abbrev=12").toString().trim(); } catch { return "unknown"; } })();
const version = (JSON.parse(readFileSync(new URL("package.json", import.meta.url), "utf8")) as { version: string }).version;

// the id of the sources that compute a set (scripts/engine_id.ts, D-237), as the module `virtual:engine-id`: the
// page keeps its sets under it. On the development server a change to one of those sources gives the page a new
// id and loads it again, so that it never shows a set the old code computed.
const ID = "virtual:engine-id", RESOLVED = `\0${ID}`;
const engine = (): Plugin => ({
  name: "engine-id",
  resolveId: (id) => (id === ID ? RESOLVED : null),
  load: (id) => (id === RESOLVED ? `export default ${JSON.stringify(engineId())};` : null),
  configureServer(server) {
    const dirs = ENGINE_DIRS.map((d) => join(APP, d) + sep);
    const again = (file: string) => {
      if (!dirs.some((d) => file.startsWith(d)) && !/[\\/](scenario\.schema\.json|package-lock\.json)$/.test(file)) return;
      const m = server.moduleGraph.getModuleById(RESOLVED);
      if (m) server.moduleGraph.invalidateModule(m);
      server.ws.send({ type: "full-reload" });
    };
    for (const e of ["add", "change", "unlink"]) server.watcher.on(e, again);
  },
});

export default defineConfig({
  plugins: [engine()],
  define: { __COMMIT__: JSON.stringify(commit), __VERSION__: JSON.stringify(version) },
  base: "./", // relative: the site moved from energiamudel.ee/v5 (D-085) to the root (D-125) unchanged
  build: { target: "es2022", outDir: "dist", assetsInlineLimit: 0, chunkSizeWarningLimit: 1500 },
  worker: { format: "es" },
  server: { fs: { allow: [".."] } }, // the scenario schema lives in ../schema
});
