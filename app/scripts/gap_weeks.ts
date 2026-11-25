// The engine of record on the test weeks of R-ENG-8, each week on its own (storage starts and ends
// empty), written with the week's problem so that reference/lp.py solves exactly what the engine
// had: `node --no-maglev scripts/gap_weeks.ts <out dir>`. reference/gap.py compares.
// Where oil shale enters by the day (D-113), the week's problem is the one its first pass committed,
// which the engine of record's second pass clears. Each window's objective, Σ cost × value as the
// solver returned it, goes with the answer: the gate meets a week whose prices differ on the same
// optimum (R-ENG-8, revision 2.36, D-175).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Results } from "../src/engine/index.ts";
import type { LpSolver } from "../src/engine/lp.ts";
import { runLP } from "../src/engine/lp.ts";
import type { Problem } from "../src/engine/problem.ts";
import { slice } from "../src/engine/problem.ts";
import { commitEntry } from "../src/engine/entry.ts";
import { summarise } from "../src/engine/results.ts";
import { loadSolver } from "./highs.ts";
import { make } from "./runs.ts";

/** One winter and one summer week of every calibration year, and the same weeks of climate
 * year 2009 with ERAA 2035's fleet (1 500 MW of Estonian batteries; runs.ts) (R-ENG-8). */
const WEEKS = [3, 28];
const CASES = ["2023", "2024", "2025", "cy2009"];

const arr = (a: ArrayLike<number>): number[] => Array.from(a);

function problemJson(pb: Problem) {
  return {
    hours: pb.hours, voll: pb.voll, floor: pb.floor,
    zones: pb.zones.map((z) => ({
      load: arr(z.load),
      fixed: arr(z.load.map((_, h) => z.fixed.reduce((s, f) => s + f.mw[h], 0))),
      offers: z.offers.map((o) => ({ name: o.name, cls: o.cls, demand: o.demand, bid: arr(o.bid), mw: arr(o.mw), hoursPerDay: o.hoursPerDay })),
    })),
    links: pb.links.map((l) => ({ fwd: arr(l.fwd), rev: arr(l.rev) })),
    borders: pb.borders.map((b) => ({ code: b.code, zone: b.zone, price: arr(b.price), lossImp: b.lossImp, lossExp: b.lossExp })),
    storage: pb.storage.map((u) => ({ ...u, budget: u.budget ? arr(u.budget) : null,
      chargeMax: u.chargeMax ? arr(u.chargeMax) : null, dischargeMax: u.dischargeMax ? arr(u.dischargeMax) : null })),
    reservoir: pb.reservoir ? { zone: pb.reservoir.zone, budget: arr(pb.reservoir.budget), pmax: arr(pb.reservoir.pmax), pmin: arr(pb.reservoir.pmin) } : null,
  };
}

function answer(pb: Problem, r: Results) {
  const s = summarise(pb, r);
  return {
    price: r.price.map(arr),
    storage: Object.fromEntries(s.units.map((u) => [u.name, u.dischargeMwh])),
    reservoir: s.reservoir ? s.reservoir.releaseTwh * 1e6 : null,
    rent: Object.fromEntries(s.borders.map((b) => [b.border, b.rentMeur * 1e6])),
  };
}

/** The engine of record on a week: its results and each window's objective, in the order solved. */
type Clearing = (pb: Problem) => { r: Results; objective: number[] };

/** Writes every test week's problem and the engine of record's answer to `out`. */
function writeWeeks(out: string, record: Clearing): void {
  mkdirSync(out, { recursive: true });
  const index = [];
  for (const key of CASES) {
    const full = make(key);
    for (const w of WEEKS) {
      const cut = slice(full, w * 168, (w + 1) * 168);
      // a committed problem has no entry left: it clears in one pass, a window a day (commitEntry)
      const pb = cut.entry ? commitEntry(cut, record({ ...cut, entry: null }).r.price[cut.entry.zone]) : cut;
      const name = `${key}_w${String(w).padStart(2, "0")}`;
      const { r, objective } = record(pb);
      const week = { case: name, year: key, week: w, problem: problemJson(pb), lp: { ...answer(pb, r), objective } };
      writeFileSync(join(out, `${name}.json`), JSON.stringify(week));
      index.push(name);
    }
  }
  writeFileSync(join(out, "index.json"), JSON.stringify(index));
}

if (process.argv[1] && process.argv[1].endsWith("gap_weeks.ts")) {
  const out = process.argv[2];
  if (!out) throw new Error("usage: node scripts/gap_weeks.ts <out dir>");
  const { solve } = await loadSolver();
  writeWeeks(out, (pb) => {
    const objective: number[] = [];
    const traced: LpSolver = (m) => {
      const sol = solve(m);
      let z = 0;
      for (let i = 0; i < m.numCols; i++) z += m.colCost[i] * sol.colValue[i];
      objective.push(z);
      return sol;
    };
    return { r: runLP(pb, traced), objective };
  });
}
