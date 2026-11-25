// ponytail: speed spike — daily/weekly LP of a 3-zone Baltic block in HiGHS-WASM (highs-js), timed in Node.
import highsLoader from "highs";

const ZONES = ["EE", "LV", "LT"];
const BLOCKS = 10;                       // supply blocks per zone
const BOUND = { EE: ["FI"], LT: ["SE4", "PL"] }; // exogenous-price neighbours
const LINKS = [["EE", "LV", 1000], ["LV", "LT", 1200]];
const NTC = { FI: 1000, SE4: 700, PL: 500 };
const STORE = { EE: [300, 600], LV: [100, 200], LT: [400, 800] }; // MW, MWh

function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

function buildLP(H, seed) {
  const r = rnd(seed);
  const obj = [], rows = [], bounds = [];
  const balance = {};                       // key -> [terms]
  for (const z of ZONES) for (let t = 0; t < H; t++) balance[`${z}_${t}`] = [];
  const load = (z, t) => (z === "EE" ? 1100 : z === "LV" ? 900 : 1400) * (0.8 + 0.4 * Math.sin((t % 24) / 24 * 2 * Math.PI) ** 2) * (0.9 + 0.2 * r());
  for (const z of ZONES) {
    for (let b = 0; b < BLOCKS; b++) {
      const cost = b === 0 ? -5 : 5 + b * 18 + 10 * r();   // block 0 = RES (negative), then merit order
      for (let t = 0; t < H; t++) {
        const v = `g_${z}_${b}_${t}`;
        const cap = b === 0 ? 900 * r() : 150;
        obj.push(`${cost.toFixed(2)} ${v}`); bounds.push(`0 <= ${v} <= ${cap.toFixed(1)}`);
        balance[`${z}_${t}`].push(`+ ${v}`);
      }
    }
    for (let t = 0; t < H; t++) {            // load shedding at VOLL
      const v = `shed_${z}_${t}`; obj.push(`5000 ${v}`); bounds.push(`0 <= ${v} <= 5000`); balance[`${z}_${t}`].push(`+ ${v}`);
    }
    const [mw, mwh] = STORE[z];
    for (let t = 0; t < H; t++) {            // battery: charge c, discharge d, soc
      const c = `c_${z}_${t}`, d = `d_${z}_${t}`, s = `soc_${z}_${t}`;
      obj.push(`0.5 ${d}`);                  // small cycling cost
      bounds.push(`0 <= ${c} <= ${mw}`, `0 <= ${d} <= ${mw}`, `0 <= ${s} <= ${mwh}`);
      balance[`${z}_${t}`].push(`+ ${d} - ${c}`);
      const prev = `soc_${z}_${(t - 1 + H) % H}`; // cyclic within block
      rows.push(`soc_${z}_${t}_bal: ${s} - ${prev} - 0.92 ${c} + 1.0 ${d} = 0`);
    }
    for (const n of BOUND[z] || []) {
      for (let t = 0; t < H; t++) {
        const p = 40 + 30 * Math.sin(t / 24 * 2 * Math.PI) + 20 * r();
        const imp = `imp_${n}_${t}`, exp = `exp_${n}_${t}`;
        obj.push(`${p.toFixed(2)} ${imp}`, `${(-p).toFixed(2)} ${exp}`);
        bounds.push(`0 <= ${imp} <= ${NTC[n]}`, `0 <= ${exp} <= ${NTC[n]}`);
        balance[`${z}_${t}`].push(`+ ${imp} - ${exp}`);
      }
    }
  }
  for (const [a, b, cap] of LINKS) for (let t = 0; t < H; t++) {
    const f = `f_${a}${b}_${t}`, g = `f_${b}${a}_${t}`;
    bounds.push(`0 <= ${f} <= ${cap}`, `0 <= ${g} <= ${cap}`);
    balance[`${a}_${t}`].push(`- ${f} + ${g}`); balance[`${b}_${t}`].push(`+ ${f} - ${g}`);
  }
  for (const z of ZONES) for (let t = 0; t < H; t++)
    rows.push(`bal_${z}_${t}: ${balance[`${z}_${t}`].join(" ")} = ${load(z, t).toFixed(1)}`);
  return `Minimize\n obj: ${obj.join(" + ").replaceAll("+ -", "- ")}\nSubject To\n ${rows.join("\n ")}\nBounds\n ${bounds.join("\n ")}\nEnd\n`;
}

const highs = await highsLoader();
for (const H of [24, 168]) {
  const n = H === 24 ? 365 : 52;
  const lps = Array.from({ length: n }, (_, i) => buildLP(H, i + 1));
  const nv = (lps[0].match(/<=/g) || []).length / 2, nr = (lps[0].match(/\n /g) || []).length - nv * 2;
  highs.solve(lps[0]);                                  // warm-up
  const t0 = performance.now();
  let status = "", dual = 0;
  for (const lp of lps) { const s = highs.solve(lp); status = s.Status; dual = s.Rows.find(r => r.Name === "bal_EE_10")?.Dual ?? dual; }
  const dt = performance.now() - t0;
  console.log(`H=${H}h  blocks=${n}  vars≈${nv}  rows≈${nr}  status=${status}  price EE h10=${dual?.toFixed(1)}  total=${(dt / 1000).toFixed(2)} s  per block=${(dt / n).toFixed(1)} ms`);
}
