// The replay's capacities on the two internal borders against the record's day-ahead schedules:
// hours in which the schedule exceeds the capacity the model was given, and how often each side
// sits at its limit and the prices part. From app/: `node --no-maglev ../spikes/validation-round2/links.ts 2026`.
import { build, monthOfHour } from "../../app/src/engine/build.ts";
import { replay } from "../../app/src/state/scenario.ts";
import { presets, validation, year } from "../../app/scripts/data.ts";

const yr = process.argv[2] ?? "2026";
const p = presets() as any, y = year(yr), v = validation(yr) as any;
const pb = build(y, p, null, replay(p, y)) as any;
const month = monthOfHour(pb.hours, Number(yr), true);
pb.links.forEach((l: any, i: number) => {
  const code = ["EE-LV", "LV-LT"][i], s = v.scheduled[code];
  const [za, zb] = code.split("-");
  for (let m = -1; m < 12; m++) {
    let n = 0, over = 0, ex = 0, cap = 0, sch = 0, apart = 0, capR = 0, overR = 0;
    for (let h = 0; h < pb.hours; h++) {
      if (m >= 0 && month[h] !== m) continue;
      if (s.fwd[h] === null || s.rev[h] === null || v.price[za][h] === null) continue;
      const net = s.fwd[h] - s.rev[h], cf = l.fwd?.[h] ?? l.ntcFwd?.[h] ?? l.cap?.[h], cr = l.rev?.[h] ?? l.ntcRev?.[h] ?? l.cap?.[h];
      n++; cap += cf; capR += cr; sch += net;
      if (net > cf + 1) { over++; ex += net - cf; }
      if (-net > cr + 1) overR++;
      if (Math.abs(v.price[za][h] - v.price[zb][h]) > 0.02) apart++;
    }
    if (n) console.log(`${yr} ${code} ${m < 0 ? "year" : "m" + (m + 1)}: ${n} h; capacity fwd ${(cap / n).toFixed(0)} rev ${(capR / n).toFixed(0)} MW; scheduled net ${(sch / n).toFixed(0)}; schedule above fwd capacity in ${over} h (mean excess ${(ex / Math.max(1, over)).toFixed(0)} MW), above rev in ${overR} h; observed prices apart in ${(100 * apart / n).toFixed(0)} %`);
  }
});
