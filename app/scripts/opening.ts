// The sets computed when the site is built (R-ENG-7; D-126, D-129). The opening view — the three
// scenarios of the opening state and the shown scenario's sensitivities — goes to data/opening.bin.gz,
// which the page reads at once; the states of the presentation of 10 November 2026 go to
// data/sets/<name>.bin.gz, listed in data/sets.json.gz and fetched when first asked for, each a pack of the
// arrays' own bytes (stored.ts `pack`, D-236): the opening
// state's sensitivities for each other scenario shown, the neighbours' two tight profiles (D-121)
// with their three scenarios and each scenario's sensitivities, the three scenarios of Global Ambition
// 2035 and National Trends 2040, which the Presentation page's blocks showed until D-249, and the three of the opening state
// with EstLink 2 and with both EstLinks out all year, the deck's cables' slide (D-221), and the replays of 2023–2026 for its past years' slide (D-229, D-253). Each year is cleared whole on Node
// workers running the page's own job handler (src/worker/job.ts), which test/worker.test.ts finds the
// page's parts to the bit; every file carries the commit the bundle was built from and the export's
// hash, and the page reads them only for those. `make deploy` runs it after the build.
// From app/: `node --no-maglev scripts/opening.ts`.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { gzipSync } from "node:zlib";
import { encode, pack, setId } from "../src/data/stored.ts";
import type { ScenarioId, Sensitivity, State } from "../src/state/model.ts";
import { SCENARIOS, opening, replayState, runsOf, sensitivities, withProfile } from "../src/state/model.ts";
import { runKey } from "../src/state/text.ts";
import { OUTAGES, REPLAY_YEARS, without } from "../src/ui/deck.ts";
import type { YearResult } from "../src/ui/results.ts";
import type { Reply } from "../src/worker/job.ts";
import { Pool } from "../src/worker/pool.ts";
import { setOf } from "../src/worker/assemble.ts";
import { EXPORT, presets } from "./data.ts";
import { engineId } from "./engine_id.ts";
import { nodePool } from "./node_pool.ts";

// as vite.config.ts names the bundle's commit
let commit = "unknown";
try { commit = execSync("git describe --always --dirty --abbrev=12").toString().trim(); } catch { /* no git: as vite.config.ts */ }
const manifest = JSON.parse(readFileSync(`${EXPORT}/manifest.json`, "utf8")) as { export: string };
const engine = engineId(); // the sources the sets are computed by: the page reads them only for these (D-237)
const p = presets(), s0 = opening(p);
const { pool, close } = nodePool(Pool.size(availableParallelism()));
const t0 = performance.now();
let years = 0;

/** A set as the page holds it, each year cleared whole on the pool. */
async function runSet(state: State, gasFloor: number | null, meanFloor: Sensitivity["meanFloor"]): Promise<YearResult[]> {
  const runs = runsOf(p, state);
  const set = setOf(runs, await Promise.all(runs.map((r) => pool.run<Reply>({ base: "", key: r.key, state, gasFloor, meanFloor }))));
  years += runs.length;
  return set;
}
const trioOf = async (st: State) => Object.fromEntries(await Promise.all(SCENARIOS.map(async (id) => [id, await runSet({ ...st, scenario: id }, null, null)] as const)));
/** The sensitivities of each scenario shown, keyed `${scenario}|${id}` as the page keys them. */
const sensOf = async (st: State, shown: ScenarioId[]) => Object.fromEntries(await Promise.all(shown.flatMap((id) =>
  sensitivities(p, { ...st, scenario: id }).map(async (x) => [`${id}|${x.id}`, await runSet(x.state, x.gasFloor, x.meanFloor)] as const))));

const gz = (x: unknown) => gzipSync(pack(x), { level: 9 });
const out = new URL("../dist/data/", import.meta.url);
rmSync(new URL("sets/", out), { recursive: true, force: true }); // a build's files alone, not an earlier run's
mkdirSync(new URL("sets/", out), { recursive: true });
try {
  const tight = [withProfile(s0, "TIGHT", 2035), withProfile(s0, "TIGHTJ", 2035)];
  // Global Ambition 2035 and National Trends 2040, their three scenarios alone: the Presentation page's other blocks
  // (D-177) until the page went (D-249), and ready since for a switch of the neighbours' profile on the Model view
  const blocks = [withProfile(s0, "GA", 2035), withProfile(s0, "NT", 2040)];
  // the deck's cables' slide: the opening state with EstLink 2 and with both EstLinks out all year (D-221)
  const outages = OUTAGES.map((lines) => without(s0, lines));
  // the deck's past years' slide: the replays of the gate's years and 2026, each kept as the page keeps a run's set (D-229, D-253)
  const replays = REPLAY_YEARS.map((y) => replayState(p, y));
  const [trio, sens, more, ...rest] = await Promise.all([
    trioOf(s0), sensOf(s0, [s0.scenario]), sensOf(s0, SCENARIOS.filter((id) => id !== s0.scenario)),
    ...tight.flatMap((st) => [trioOf(st), sensOf(st, SCENARIOS)]), ...blocks.map(trioOf), ...outages.map(trioOf),
    ...replays.map(async (st) => ({ [st.scenario]: await runSet(st, null, null) })),
  ]);
  const tights = rest.slice(0, 2 * tight.length);
  const opened = gz({ commit, engine, export: manifest.export, key: runKey(s0), trio, sens });
  writeFileSync(new URL("opening.bin.gz", out), opened);
  // the presentation's states, by the page's own id of each (`setId`)
  const sets: [string, unknown][] = Object.entries(more).map(([k, v]) => [setId(runKey(s0), k), v]);
  tight.forEach((st, i) => {
    sets.push([setId(runKey(st)), tights[2 * i]]);
    for (const [k, v] of Object.entries(tights[2 * i + 1])) sets.push([setId(runKey(st), k), v]);
  });
  blocks.forEach((st, i) => sets.push([setId(runKey(st)), rest[2 * tight.length + i]]));
  outages.forEach((st, i) => sets.push([setId(runKey(st)), rest[2 * tight.length + blocks.length + i]]));
  replays.forEach((st, i) => sets.push([setId(runKey(st)), rest[2 * tight.length + blocks.length + outages.length + i]]));
  const index: Record<string, string> = {};
  let bytes = opened.length;
  sets.forEach(([id, v], n) => {
    const b = gz(v);
    // ponytail: a set is the page's whole view of its years; a profile switch fetches its trio and four sensitivities
    const limit = id.includes("|sens|") ? 0.6e6 : 2.5e6;
    if (b.length > limit) throw new Error(`set ${n}: ${b.length} bytes, over ${limit}`);
    // a file's name is of what it holds — the sources, the data and the set's id — so that a page that read the list
    // before a deploy asks, after it, for the same set or for a file that is gone, never for another set (D-238)
    const file = `sets/${createHash("sha256").update(`${engine}|${manifest.export}|${id}`).digest("hex").slice(0, 16)}.bin.gz`;
    writeFileSync(new URL(file, out), b);
    index[id] = file;
    bytes += b.length;
  });
  writeFileSync(new URL("sets.json.gz", out), gzipSync(encode({ commit, engine, export: manifest.export, sets: index }), { level: 9 }));
  // 30 MB until the presentation's blocks of D-177 added two tables of four scenarios
  if (bytes > 35e6) throw new Error(`the sets weigh ${(bytes / 1e6).toFixed(1)} MB, over 35`);
  console.log(`opening and the presentation's sets: ${years} years in ${((performance.now() - t0) / 1000).toFixed(0)} s on ${pool.workers} workers, ${sets.length + 1} files, ${(bytes / 1e6).toFixed(2)} MB, commit ${commit}, engine ${engine}`);
} finally {
  await close();
}
