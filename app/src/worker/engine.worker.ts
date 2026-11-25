// A Web Worker running the engine of record (R-ENG-1, R-ENG-8; revision 1.5): it loads the year
// files, the presets and the scenario links once and keeps them (src/data/loader.ts), and runs each
// job the page sends it as Node's workers run theirs (src/worker/job.ts, D-128).
import * as highsModule from "highs";
import type { Highs } from "highs";
import wasmUrl from "highs/runtime?url";
import type { Links } from "../contract/links.ts";
import type { Presets } from "../contract/presets.ts";
import type { Year } from "../contract/year.ts";
import { load } from "../data/loader.ts";
import type { Attribution } from "./outages.ts";
import type { Files, Job, Reply } from "./job.ts";
import { runJob } from "./job.ts";
import { makeSolver } from "./solver.ts";

export type { Inputs } from "./assemble.ts";
export type { Reply } from "./job.ts";

const loader = (highsModule as unknown as { default: (o: { locateFile: (f: string) => string }) => Promise<Highs> }).default;
const solve = loader({ locateFile: () => wasmUrl }).then(makeSolver);

const filesAt = (base: string): Files => ({
  solve,
  year: (key) => load<Year>(`years/${key}.json.gz`, base),
  presets: () => load<Presets>("presets.json", base),
  links: () => load<Links>("links.json.gz", base),
  // a year without an outage file has none (404); a file that did not load fails the job — computed without its
  // masks the year would be another, and it is kept (D-238)
  attribution: (key) => load<Attribution>(`attribution/${key}.json.gz`, base).catch((e: Error) => { if (/HTTP 404$/.test(e.message)) return null; throw e; }),
});

self.onmessage = async (e: MessageEvent<Job>) => {
  try {
    const { reply, transfer } = await runJob(e.data, filesAt(e.data.base));
    (self as unknown as Worker).postMessage(reply, transfer);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id: e.data.id, error: String((err as Error)?.message ?? err) } satisfies Reply);
  }
};
