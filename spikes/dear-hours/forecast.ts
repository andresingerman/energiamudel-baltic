// The day-ahead forecasts against the outturn the replays clear on (docs/research/
// 2026-10-11_dear_hours.md, Phase 1.7): the error of the Baltic load, wind, solar and residual load
// (load − wind − solar) over the year and in the dear hours (LT's price, the record's and the
// model's bins), and the replay cleared on the forecasts — the load, the wind, or both — at the
// register in force. The forecasts come from spikes/dear-hours/forecasts.py's file. From app/:
// `node --no-maglev ../spikes/dear-hours/forecast.ts <forecasts.json.gz> [years…]`.
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { runLP } from "../../app/src/engine/lp.ts";
import type { Problem } from "../../app/src/engine/problem.ts";
import { ZONES } from "../../app/src/engine/problem.ts";
import { validation } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { scenarioFor } from "../../app/scripts/validate_fit.ts";
import { tail } from "./tail.ts";

type F = Record<string, Record<string, Record<string, (number | null)[]>>>;
const fc = JSON.parse(gunzipSync(readFileSync(process.argv[2])).toString()) as F;
const TECH = ["wind_onshore", "solar"];

/** Puts the forecasts of `what` in place of the outturn where a forecast exists. */
export function onForecast(pb: Problem, yr: number, what: { load?: boolean; res?: boolean }): void {
  pb.zones.forEach((zone, z) => {
    const f = fc[yr][ZONES[z]];
    if (what.load && f.load) for (let h = 0; h < pb.hours; h++) if (f.load[h] != null) zone.load[h] = f.load[h]!;
    if (what.res) for (const o of zone.offers) if (TECH.includes(o.name) && f[o.name]) for (let h = 0; h < pb.hours; h++) if (f[o.name][h] != null) o.mw[h] = f[o.name][h]!;
  });
}

const { solve } = await loadSolver();
const years = process.argv.slice(3).filter((a) => /^\d{4}$/.test(a)).map(Number);
for (const yr of years.length ? years : [2023, 2024, 2025]) {
  const v = validation(String(yr));
  const { pb, boundary } = scenarioFor(yr);
  const r = runLP(pb, solve);
  const H = pb.hours, o = v.price.LT, m = r.price[2];
  // the Baltic sums, forecast and outturn as the replay takes it
  const series = (forecast: boolean) => {
    const load = new Float64Array(H), wind = new Float64Array(H), solar = new Float64Array(H);
    pb.zones.forEach((zone, z) => {
      const f = fc[yr][ZONES[z]];
      for (let h = 0; h < H; h++) {
        load[h] += forecast && f.load?.[h] != null ? f.load[h]! : zone.load[h];
        for (const off of zone.offers) {
          if (off.name === "wind_onshore") wind[h] += forecast && f.wind_onshore?.[h] != null ? f.wind_onshore[h]! : off.mw[h];
          if (off.name === "solar") solar[h] += forecast && f.solar?.[h] != null ? f.solar[h]! : off.mw[h];
        }
      }
    });
    return { load, wind, solar };
  };
  const a = series(false), f = series(true);
  console.log(`\n== ${yr}: Baltic forecast − outturn, mean (mean |·|) MW: load, wind, solar, residual load`);
  for (const [name, pick] of [["all hours", () => true], ["record >250", (h: number) => o[h] > 250], ["record 150–250", (h: number) => o[h] > 150 && o[h] <= 250], ["model >250", (h: number) => m[h] > 250], ["model >250, record <150", (h: number) => m[h] > 250 && o[h] < 150], ["record >250, model <150", (h: number) => o[h] > 250 && m[h] < 150]] as [string, (h: number) => boolean][]) {
    let n = 0;
    const s = [0, 0, 0, 0], ab = [0, 0, 0, 0];
    for (let h = 0; h < H; h++) {
      if (!pick(h)) continue;
      n++;
      const d = [f.load[h] - a.load[h], f.wind[h] - a.wind[h], f.solar[h] - a.solar[h], 0];
      d[3] = d[0] - d[1] - d[2];
      d.forEach((x, i) => { s[i] += x; ab[i] += Math.abs(x); });
    }
    console.log(`  ${name.padEnd(24)} ${String(n).padStart(5)} h | ${s.map((x, i) => `${(x / n).toFixed(0)} (${(ab[i] / n).toFixed(0)})`).join("  ")}`);
  }
  console.log(`replays at the register: MAE EE/LV/LT (Σ) | LT record >250, 150–250 | model's >250 (h), 150–250 | ≥150 LV, LT | top-250 overlap`);
  for (const [name, what] of [["outturn (the engine of record)", {}], ["load forecast", { load: true }], ["wind and solar forecast", { res: true }], ["all three forecast", { load: true, res: true }]] as [string, { load?: boolean; res?: boolean }][]) {
    const q = scenarioFor(yr);
    onForecast(q.pb, yr, what);
    const rq = runLP(q.pb, solve);
    const t = tail(yr, q.pb, rq, q.boundary);
    const mae = ZONES.map((z, i) => { let s = 0; for (let h = 0; h < H; h++) s += Math.abs(rq.price[i][h] - v.price[z][h]); return s / H; });
    const lt = t[2], b = (x: { bin: string }[], k: string) => x.find((y) => y.bin.startsWith(k)) as { n: number; mean: number };
    console.log(`  ${name.padEnd(32)} ${mae.map((x) => x.toFixed(2)).join("/")} (${mae.reduce((s, x) => s + x, 0).toFixed(2)}) | ${b(lt.byObserved, "(250").mean} ${b(lt.byObserved, "(150").mean} | ${b(lt.byModel, "(250").mean} (${b(lt.byModel, "(250").n}) ${b(lt.byModel, "(150").mean} | ${t[1].share150.join("/")}, ${lt.share150.join("/")} | ${lt.overlap[1].sameHour}/${lt.overlap[1].n}`);
  }
}
