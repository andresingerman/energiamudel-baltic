// Times the reference LP of one real test week in HiGHS-WASM (highs-js): the same formulation as
// reference/lp.py, written as CPLEX LP text. Usage: node week_lp.mjs <week.json> ...
import { readFileSync } from "node:fs";
import highsLoader from "highs";

function lpText(pb) {
  const T = pb.hours, Z = pb.zones.length;
  let n = 0;
  const obj = [], bounds = [], rows = [];
  const bal = Array.from({ length: Z }, () => Array.from({ length: T }, () => []));
  const v = (cost, lo, hi) => { const x = `x${n++}`; if (cost) obj.push(`${cost >= 0 ? "+" : "-"} ${Math.abs(cost)} ${x}`); bounds.push(hi === Infinity ? `${x} >= ${lo}` : `${lo} <= ${x} <= ${hi}`); return x; };
  pb.zones.forEach((zone, z) => {
    for (const o of zone.offers) {
      const cols = [];
      for (let t = 0; t < T; t++) {
        const mw = o.mw[t];
        if (mw <= 0) { cols.push(null); continue; }
        const x = v(o.demand ? -o.bid[t] : o.bid[t], 0, mw);
        bal[z][t].push(`${o.demand ? "-" : "+"} ${x}`);
        cols.push(x);
      }
      if (o.hoursPerDay > 0) for (let d0 = 0; d0 < T; d0 += 24) {
        const terms = [];
        for (let t = d0; t < Math.min(d0 + 24, T); t++) if (cols[t]) terms.push(`+ ${1 / o.mw[t]} ${cols[t]}`);
        if (terms.length) rows.push(`${terms.join(" ")} <= ${o.hoursPerDay}`);
      }
    }
    for (let t = 0; t < T; t++) {
      bal[z][t].push(`+ ${v(pb.voll, 0, zone.load[t])}`);
      bal[z][t].push(`- ${v(-pb.floor, 0, Infinity)}`);
    }
  });
  pb.links.forEach((l, i) => {
    for (let t = 0; t < T; t++) {
      const f = v(0, -l.rev[t], l.fwd[t]);
      bal[i][t].push(`- ${f}`);
      bal[i + 1][t].push(`+ ${f}`);
    }
  });
  for (const u of pb.storage) {
    const c = [], d = [], e = [];
    for (let t = 0; t < T; t++) {
      c.push(v(u.delta || 0, 0, u.mw));
      d.push(v(0, 0, u.mw * u.eff));
      e.push(v(0, 0, t === T - 1 ? 0 : u.mw * u.hours));
      rows.push(`${e[t]} - ${c[t]} + ${1 / u.eff} ${d[t]}${t ? ` - ${e[t - 1]}` : ""} = 0`);
      bal[u.zone][t].push(`+ ${d[t]} - ${c[t]}`);
    }
    if (u.budget) u.budget.forEach((b, k) => {
      const terms = [];
      for (let t = k * u.period; t < Math.min((k + 1) * u.period, T); t++) terms.push(`+ ${1 / u.eff} ${d[t]}`);
      if (terms.length) rows.push(`${terms.join(" ")} <= ${b * u.mw}`);
    });
  }
  if (pb.reservoir) {
    const r = pb.reservoir;
    r.budget.forEach((b, w) => {
      const ts = []; for (let t = w * 168; t < Math.min((w + 1) * 168, T); t++) ts.push(t);
      const base = Math.min(r.pmin, b / ts.length);
      const cols = ts.map((t) => { const x = v(0, Math.min(base, r.pmax[w]), r.pmax[w]); bal[r.zone][t].push(`+ ${x}`); return x; });
      rows.push(`${cols.map((x) => `+ ${x}`).join(" ")} <= ${b}`);
    });
  }
  const balRows = [];
  pb.zones.forEach((zone, z) => { for (let t = 0; t < T; t++) { balRows.push(`bal_${z}_${t}`); rows.push(`bal_${z}_${t}: ${bal[z][t].join(" ")} = ${zone.load[t] - zone.fixed[t]}`); } });
  const named = rows.map((r, k) => (r.startsWith("bal_") ? r : `r${k}: ${r}`));
  return { text: `Minimize\n obj: ${obj.join(" ")}\nSubject To\n ${named.join("\n ")}\nBounds\n ${bounds.join("\n ")}\nEnd\n`, vars: n };
}

const highs = await highsLoader();
for (const f of process.argv.slice(2)) {
  const w = JSON.parse(readFileSync(f, "utf8"));
  const t0 = performance.now();
  const { text, vars } = lpText(w.problem);
  const t1 = performance.now();
  const sol = highs.solve(text, { presolve: "on" });
  const t2 = performance.now();
  const dual = new Map(sol.Rows.map((r) => [r.Name, r.Dual]));
  let mae = 0;
  for (let z = 0; z < 3; z++) for (let t = 0; t < w.problem.hours; t++) mae += Math.abs(dual.get(`bal_${z}_${t}`) - w.engine.price[z][t]);
  console.log(`${w.case}: ${vars} variables, build ${(t1 - t0).toFixed(0)} ms, solve ${(t2 - t1).toFixed(0)} ms, ${sol.Status}, mean |price − engine| ${(mae / (3 * w.problem.hours)).toFixed(2)}`);
}
