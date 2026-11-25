// Night diagnostic: which price sets the observed and the modelled Baltic price, hour by hour.
import { runLP } from "../../app/src/engine/lp.ts";
import { validation } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { scenarioFor } from "../../app/scripts/validate_fit.ts";
const yr = Number(process.argv[2] ?? 2024);
const { pb, boundary } = scenarioFor(yr);
const { solve } = await loadSolver();
const r = runLP(pb, solve);
const v = validation(String(yr));
const H = pb.hours;
const eq = (a: number, b: number) => Math.abs(a - b) <= 0.5;
const regime = (lt: number, ee: number, h: number): string => {
  const fi = boundary.FI[h], se = boundary.SE4[h], pl = boundary.PL[h];
  const hi = Math.max(fi, se, pl), lo = Math.min(fi, se, pl);
  if (eq(ee, fi) && eq(lt, se)) return "=FI&SE4";
  if (eq(ee, fi)) return "EE=FI";
  if (eq(lt, se)) return "LT=SE4";
  if (eq(lt, pl)) return "LT=PL";
  if (lt > hi + 0.5) return "above all";
  if (lt < lo - 0.5) return "below all";
  return "between";
};
const keys = ["=FI&SE4", "EE=FI", "LT=SE4", "LT=PL", "between", "above all", "below all"];
const tab: Record<string, Record<string, { n: number; abs: number; bias: number }>> = {};
let tot = 0;
for (let h = 0; h < H; h++) {
  const o = regime(v.price.LT[h], v.price.EE[h], h), m = regime(r.price[2][h], r.price[0][h], h);
  tab[o] ??= {}; tab[o][m] ??= { n: 0, abs: 0, bias: 0 };
  const e = r.price[2][h] - v.price.LT[h];
  tab[o][m].n++; tab[o][m].abs += Math.abs(e); tab[o][m].bias += e; tot += Math.abs(e);
}
console.log(`${yr}: rows = observed regime, columns = model regime; cell = hours / share of LT abs error % / bias`);
console.log("obs \\ model | " + keys.join(" | ") + " | row hours, share");
for (const o of keys) {
  let n = 0, a = 0;
  const cells = keys.map((m) => { const c = tab[o]?.[m]; if (!c) return "-"; n += c.n; a += c.abs; return `${c.n}/${(100 * c.abs / tot).toFixed(0)}%/${(c.bias / c.n).toFixed(0)}`; });
  console.log(`${o} | ${cells.join(" | ")} | ${n}, ${(100 * a / tot).toFixed(0)}%`);
}
// observed 'above all' / 'between' hours: the observed LT price level and gaps
for (const o of ["above all", "between", "LT=PL"]) {
  let n = 0, p = 0, hi = 0, mp = 0;
  for (let h = 0; h < H; h++) if (regime(v.price.LT[h], v.price.EE[h], h) === o) { n++; p += v.price.LT[h]; mp += r.price[2][h]; hi += Math.max(boundary.FI[h], boundary.SE4[h], boundary.PL[h]); }
  console.log(`${o}: ${n} h, observed LT ${(p / n).toFixed(0)}, model LT ${(mp / n).toFixed(0)}, dearest neighbour ${(hi / n).toFixed(0)}`);
}
