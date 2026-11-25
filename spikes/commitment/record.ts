// How the record runs Estonia's oil shale (A75, the zone's sum of the units), the figures D-113
// cites: the share of UTC days off (the day's highest hour below `OFF` MW, by default 50, below any
// unit's minimum stable load), the campaigns' lengths (runs of days on), and how far a day on falls
// below its own highest hour (the median day's least hour over its highest).
// `node --no-maglev spikes/commitment/record.ts [OFF]`.
import { validation } from "../../app/scripts/data.ts";

const OFF = Number(process.argv[2] ?? 50); // MW: below any unit's minimum stable load (ERAA 0.5 of 164–270 MW)
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[(s.length - 1) >> 1] : NaN; };
for (const yr of ["2023", "2024", "2025", "2026"]) {
  const g = validation(yr).gen.EE.oil_shale!;
  const days = Math.floor(g.length / 24);
  const on: boolean[] = [];
  const low: number[] = [];
  for (let d = 0; d < days; d++) {
    const day = Array.from(g.slice(d * 24, d * 24 + 24));
    const top = Math.max(...day);
    on.push(top >= OFF);
    if (top >= OFF) low.push(Math.min(...day) / top);
  }
  const runs: number[] = [];
  let n = 0;
  for (const x of [...on, false]) { if (x) n++; else if (n) { runs.push(n); n = 0; } }
  console.log(`${yr}: off ${((100 * on.filter((x) => !x).length) / days).toFixed(0)} % of ${days} days; campaigns ${runs.length}, median ${median(runs)} days, longest ${Math.max(...runs)}; a day on's least hour, median, ${(100 * median(low)).toFixed(0)} % of its highest`);
}
