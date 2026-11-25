// One job of the engine of record's pool (R-ENG-1, R-ENG-8; revision 1.5, D-114, D-128), the same in
// the browser's Web Workers (engine.worker.ts) and in Node's (scripts/lp_worker.ts), so that the bench
// and the build compute as the page does: the year files, the presets, the scenario links and the
// solver come through `Files` — fetched and kept by the browser's loader, read from the export in
// Node — and the job builds its problem, solves its weeks and answers with the run's view
// (src/worker/view.ts) or a part of a year's clearing.
import type { Links } from "../contract/links.ts";
import type { Presets } from "../contract/presets.ts";
import type { Year } from "../contract/year.ts";
import type { Scenario } from "../engine/build.ts";
import { build } from "../engine/build.ts";
import type { LpSolver } from "../engine/lp.ts";
import { runLP } from "../engine/lp.ts";
import type { Part } from "../engine/split.ts";
import { clearPart, fromParts, secondPart } from "../engine/split.ts";
import type { State } from "../state/model.ts";
import type { Attribution } from "./outages.ts";
import { outMasks } from "./outages.ts";
import type { Inputs } from "./assemble.ts";
import { assemble, scenarioOf } from "./assemble.ts";
import type { RunView } from "./view.ts";

/** A year of a set: the panel's state and the gas floor of sensitivity (d) (R-APP-11). A year's weeks shared by the workers (D-114, `runYear`
 * in pool.ts) come as `part` k of n of a clearing — the second given the first's price of oil
 * shale's entry zone up to the part's end (D-128) — and as `finish`, its last clearing's parts to
 * put together on the whole year's price. */
export interface Job {
  id: number; base: string; key: string; state: State; gasFloor: number | null; meanFloor?: Scenario["meanFloor"];
  warm?: string[]; // only load the files these years need, while the reader looks at a view computed before (D-128)
  part?: { k: number; n: number; price?: Float64Array; first?: Part };
  finish?: { parts: Part[]; price: Float64Array | null };
}
export type Reply = { id: number; view: RunView; labels: Record<string, number | string> | null; inputs: Inputs } | { id: number; error: string }
  | { id: number; part: Part } | { id: number; entry: true; h0: number; price: Float64Array; part: Part } | { id: number; warm: true };

/** What a job reads: the solver and the export's files, each loaded once by the worker that holds it. */
export interface Files {
  solve: Promise<LpSolver>;
  year(key: string): Promise<Year>;
  presets(): Promise<Presets>;
  links(): Promise<Links>;
  attribution(key: string): Promise<Attribution | null>;
}

/** The job's reply and the buffers to transfer with it. */
export async function runJob(job: Job, files: Files): Promise<{ reply: Reply; transfer: ArrayBuffer[] }> {
  const { id, key, state, gasFloor, meanFloor, part, finish, warm } = job;
  if (warm) {
    // the solver, the presets, the links and the years' files, so that the first change does not
    // wait for them; then the first year's first week cleared and dropped, so that the compilers are
    // warm as well: Safari's first change paid for them, Chrome's hardly (D-146)
    await Promise.all([files.solve, files.presets(), files.links(), ...warm.map((k) => files.year(k))]);
    if (state) {
      const [solve, year, presets, links] = await Promise.all([files.solve, files.year(key), files.presets(), files.links()]);
      clearPart(build(year, presets, year.meta.kind === "observed" ? null : links, scenarioOf(presets, year, state, null, undefined)), solve, 0, 52);
    }
    return { reply: { id, warm: true }, transfer: [] };
  }
  const [solve, year, presets, links] = await Promise.all([files.solve, files.year(key), files.presets(), files.links()]);
  const scenario = scenarioOf(presets, year, state, gasFloor ?? null, meanFloor);
  // an observed year's what-if on EstLink 1 or 2 reads which hours the cable was out already
  const cables = ["estlink1", "estlink2"];
  if (year.meta.kind === "observed" && scenario.links && cables.some((k) => scenario.links!.whatif[k])) {
    const att = await files.attribution(key);
    if (att) scenario.links.out = outMasks(att, Number(key), year.meta.hours, cables);
  }
  const pb = build(year, presets, year.meta.kind === "observed" ? null : links, scenario);
  if (part) {
    // part k of n of a clearing: the second on the first's price of the entry's zone; the first,
    // where oil shale enters, answers only that price, as the second needs the whole year's
    if (part.price) return { reply: { id, part: secondPart(pb, solve, part.k, part.n, part.price, part.first ?? null) }, transfer: [] };
    const p = clearPart(pb, solve, part.k, part.n);
    // with an entry the first clearing's part goes back whole: the second's weeks may be its (D-130)
    return { reply: pb.entry ? { id, entry: true, h0: p.h0, price: p.price[pb.entry.zone], part: p } : { id, part: p }, transfer: [] };
  }
  const r = finish ? fromParts(pb, finish.parts, finish.price) : runLP(pb, solve);
  const { view: v, labels, inputs } = assemble(presets, year, key, scenario, pb, r);
  const transfer = v.zones.flatMap((z) => [z.price.buffer, z.netImport.buffer, z.consumption.buffer, ...Object.values(z.daily).map((a) => a.buffer)]);
  if (v.plant) transfer.push(v.plant.mw.buffer, v.plant.month.buffer);
  return { reply: { id, view: v, labels, inputs }, transfer: transfer as ArrayBuffer[] };
}
