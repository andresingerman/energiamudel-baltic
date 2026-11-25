// The replay's transfer capacities against the record's day-ahead schedules, per boundary border:
// hours in which the schedule exceeds the capacity the model was given, and how often each sits at
// its limit. From app/: `node --no-maglev ../spikes/validation-round2/ntc.ts 2025`.
import { build } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { BORDERS } from "../../app/src/engine/problem.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { presets, validation, year } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const yr = process.argv[2] ?? "2025";
const { solve } = await loadSolver();
const p = presets() as any, y = year(yr), v = validation(yr) as any;
const pb = build(y, p, null, replay(p, y));
const r = runLP(pb, solve);
const H = pb.hours;
pb.borders.forEach((b, i) => {
  const code = BORDERS[i].code;
  const s = v.scheduled[code];
  // fwd runs along the code (EE→FI, LT→SE4, LT→PL): import into the Baltic zone is rev
  let n = 0, overImp = 0, overExp = 0, exImp = 0, exExp = 0, satObs = 0, satMod = 0, both = 0, mi = 0, oi = 0, cap = 0;
  for (let h = 0; h < H; h++) {
    const imp = s.rev[h], exp = s.fwd[h];
    if (imp === null || exp === null) continue;
    n++;
    const net = imp - exp;
    if (net > b.ntcImp[h] + 1) { overImp++; exImp += net - b.ntcImp[h]; }
    if (-net > b.ntcExp[h] + 1) { overExp++; exExp += -net - b.ntcExp[h]; }
    const so = net >= b.ntcImp[h] - 1 && b.ntcImp[h] > 0;
    const got = r.borderImport?.[i]?.[h];
    satObs += so ? 1 : 0;
    cap += b.ntcImp[h]; oi += net;
  }
  console.log(`${yr} ${code}: ${n} h; schedule above the import capacity in ${overImp} h (mean excess ${(exImp / Math.max(1, overImp)).toFixed(0)} MW), above the export capacity in ${overExp} h (${(exExp / Math.max(1, overExp)).toFixed(0)} MW); record at the import limit ${(100 * satObs / n).toFixed(0)} % of hours; mean import capacity ${(cap / n).toFixed(0)} MW, mean scheduled net import ${(oi / n).toFixed(0)} MW`);
});
