// Where Estonia's 2026 replay misses the market (the night of 2026-11-24; D-280's weak points): the replay of 2026 as
// the validation runs it (scripts/validate_fit.ts), Estonia's and Latvia's hourly prices against the observed, by month
// and by whether the market split Estonia from Latvia in the hour. Diagnostic only: it changes nothing.
// From app/: `node --no-maglev ../spikes/ee-bias-2026/run.ts [year]`.
import { monthOfHour } from "../../app/src/engine/build.ts";
import { runLP } from "../../app/src/engine/lp.ts";
import { scenarioFor } from "../../app/scripts/validate_fit.ts";
import { LINKS } from "../../app/src/engine/problem.ts";
import { validation } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";

const yr = Number(process.argv[2] ?? 2026);
const { solve } = await loadSolver();
const { pb } = scenarioFor(yr);
const r = runLP(pb, solve);
const v = validation(String(yr));
const months = monthOfHour(pb.hours, yr, true);
const [mEE, mLV] = [r.price[0], r.price[1]], [oEE, oLV] = [v.price.EE, v.price.LV];
const H = Math.min(pb.hours, oEE.length);
type Acc = { n: number; bias: number; abs: number; biasLV: number };
const acc = () => ({ n: 0, bias: 0, abs: 0, biasLV: 0 });
const add = (a: Acc, h: number) => { a.n++; a.bias += mEE[h] - oEE[h]; a.abs += Math.abs(mEE[h] - oEE[h]); a.biasLV += mLV[h] - oLV[h]; };
const out = (a: Acc) => a.n ? `n ${String(a.n).padStart(4)} EE bias ${(a.bias / a.n).toFixed(1).padStart(6)} MAE ${(a.abs / a.n).toFixed(1).padStart(5)} | LV bias ${(a.biasLV / a.n).toFixed(1).padStart(6)}` : "n 0";
const split = (a: number, b: number) => Math.abs(a - b) > 0.5;
const byMonth: Record<number, Acc> = {}, cls: Record<string, Acc> = {};
let missEE = 0;
for (let h = 0; h < H; h++) {
  if (!Number.isFinite(oEE[h]) || !Number.isFinite(oLV[h])) continue;
  add(byMonth[months[h]] ??= acc(), h);
  const key = `market ${split(oEE[h], oLV[h]) ? (oEE[h] < oLV[h] ? "EE<LV" : "EE>LV") : "same"} / model ${split(mEE[h], mLV[h]) ? (mEE[h] < mLV[h] ? "EE<LV" : "EE>LV") : "same"}`;
  add(cls[key] ??= acc(), h);
  if (split(oEE[h], oLV[h]) && !split(mEE[h], mLV[h])) missEE += mEE[h] - oEE[h];
}
console.log(`== ${yr}, ${H} hours`);
for (const [m, a] of Object.entries(byMonth)) console.log(`month ${String(Number(m) + 1).padStart(2)}: ${out(a)}`);
for (const [k, a] of Object.entries(cls).sort((x, y) => y[1].n - x[1].n)) console.log(`${k.padEnd(34)} ${out(a)}`);
console.log(`hours the market split and the model did not carry ${(missEE / H).toFixed(2)} €/MWh of Estonia's ${(Object.values(byMonth).reduce((t, a) => t + a.bias, 0) / H).toFixed(2)} bias`);

// the Estonia–Latvia link in the hours the model split and the market did not: the capacity the model gave the
// market, the model's flow and the scheduled exchange the market reports, by month
const link = pb.links[0], sch = v.scheduled[LINKS[0]];
const per: Record<number, { n: number; cap: number; flow: number; obs: number; capAll: number; obsMax: number; nAll: number }> = {};
for (let h = 0; h < H; h++) {
  const m = per[months[h]] ??= { n: 0, cap: 0, flow: 0, obs: 0, capAll: 0, obsMax: 0, nAll: 0 };
  const o = sch.fwd[h] - sch.rev[h];
  m.nAll++; m.capAll += link.fwd[h]; m.obsMax = Math.max(m.obsMax, o);
  if (!split(oEE[h], oLV[h]) && split(mEE[h], mLV[h]) && mEE[h] < mLV[h]) { m.n++; m.cap += link.fwd[h]; m.flow += r.flow[0][h]; m.obs += o; }
}
console.log(`${LINKS[0]}: month | hours model split, market not | mean capacity EE→LV in them | model flow | scheduled | month's mean capacity | month's highest scheduled`);
for (const [k, m] of Object.entries(per)) console.log(`  ${String(Number(k) + 1).padStart(2)} | ${String(m.n).padStart(4)} | ${(m.n ? m.cap / m.n : 0).toFixed(0).padStart(5)} | ${(m.n ? m.flow / m.n : 0).toFixed(0).padStart(5)} | ${(m.n ? m.obs / m.n : 0).toFixed(0).padStart(5)} | ${(m.capAll / m.nAll).toFixed(0).padStart(5)} | ${m.obsMax.toFixed(0).padStart(5)}`);
// hours in which the market scheduled more from Estonia to Latvia than the model let it carry
const over: Record<number, { n: number; gap: number; nAll: number }> = {};
for (let h = 0; h < H; h++) {
  const m = over[months[h]] ??= { n: 0, gap: 0, nAll: 0 };
  const o = sch.fwd[h] - sch.rev[h]; m.nAll++;
  if (o > link.fwd[h] + 1) { m.n++; m.gap += o - link.fwd[h]; }
}
console.log(`${LINKS[0]}: month | hours the scheduled exchange EE→LV exceeds the model's capacity | mean excess MW`);
for (const [k, m] of Object.entries(over)) console.log(`  ${String(Number(k) + 1).padStart(2)} | ${String(m.n).padStart(4)} of ${m.nAll} | ${(m.n ? m.gap / m.n : 0).toFixed(0)}`);
