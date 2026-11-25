// Spike (not the engine): storage scheduled one unit after another, each against the prices it
// would itself meet — the year cleared with the units already scheduled and this one charging at
// full power (the price it pays) or discharging at full power (the price it fetches). Pass two as
// the engine's. Question: does accounting for a unit's own price impact close the R-ENG-8 gap?
import { clearYear, passOne } from "../../app/src/engine/index.ts";
import type { Results } from "../../app/src/engine/index.ts";
import type { Problem } from "../../app/src/engine/problem.ts";
import { match, schedule } from "../../app/src/engine/storage.ts";
import { writeWeeks } from "../../app/scripts/gap_weeks.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { runLP } from "../../app/src/engine/lp.ts";

export function runImpact(pb: Problem): Results {
  const H = pb.hours;
  const { p0, plan } = passOne(pb);
  const fixed = pb.zones.map(() => new Float64Array(H));
  if (pb.reservoir && plan) for (let h = 0; h < H; h++) fixed[pb.reservoir.zone][h] += plan.sched[h];
  const steps: Int8Array[] = [];
  const pDis: Float64Array[] = [];
  for (const u of pb.storage) {
    const chg = fixed.map((a) => a.slice());
    const dis = fixed.map((a) => a.slice());
    for (let h = 0; h < H; h++) {
      chg[u.zone][h] -= u.mw;
      dis[u.zone][h] += u.mw * u.eff;
    }
    const pc = clearYear(pb, chg, null).price[u.zone];
    const pd = clearYear(pb, dis, null).price[u.zone];
    const st = schedule(pc, u, pd);
    steps.push(st);
    pDis.push(pd);
    for (let h = 0; h < H; h++) fixed[u.zone][h] += st[h] === -1 ? u.mw * u.eff : st[h] === 1 ? -u.mw : 0;
  }
  const out = clearYear(pb, null, { steps, matched: steps.map(match), pDis, plan });
  out.price0 = p0;
  return out;
}

if (process.argv[1]?.endsWith("impact.ts")) {
  const { solve } = await loadSolver();
  writeWeeks(process.argv[2], runImpact, (pb) => runLP(pb, solve));
}
