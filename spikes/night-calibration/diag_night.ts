// Night diagnostic (2026-10-04): where the replay's balance differs from the record, by observed
// Estonian price bin. `node --no-maglev scripts/diag_night.ts 2024`. Observed series come from the validation
// file, which the engine never reads (R-BND-3). Not part of the protocol; a working tool.
import { runLP } from "../../app/src/engine/lp.ts";
import { BORDERS, ZONES, boundaryOffers } from "../../app/src/engine/problem.ts";
import { validation, year as loadYear } from "../../app/scripts/data.ts";
import { loadSolver } from "../../app/scripts/highs.ts";
import { scenarioFor } from "../../app/scripts/validate_fit.ts";

const yr = Number(process.argv[2] ?? 2024);
const { pb, boundary } = scenarioFor(yr);
const { solve } = await loadSolver();
const r = runLP(pb, solve);
const v = validation(String(yr));
const y = loadYear(String(yr));
const H = pb.hours;

// annual balance of the record: load vs generation vs scheduled net import
for (const [zi, z] of ZONES.entries()) {
  let load = 0, gen = 0;
  for (let h = 0; h < H; h++) load += v.load[z][h];
  const parts: string[] = [];
  for (const [t, a] of Object.entries(v.gen[z] ?? {})) { let s = 0; for (let h = 0; h < H; h++) s += a[h]; gen += s; parts.push(`${t} ${(s / 1e6).toFixed(2)}`); }
  let mload = 0; for (let h = 0; h < H; h++) mload += pb.zones[zi].load[h];
  console.log(`${z} observed load ${(load / 1e6).toFixed(2)} TWh (model ${(mload / 1e6).toFixed(2)}), generation ${(gen / 1e6).toFixed(2)}: ${parts.join(", ")}`);
}
const net = (code: string) => { const s = v.scheduled[code]; let x = 0; for (let h = 0; h < H; h++) x += s.fwd[h] - s.rev[h]; return x / 1e6; };
const phys = (code: string) => { const s = v.flow[code]; if (!s) return NaN; let x = 0; for (let h = 0; h < H; h++) x += s.fwd[h] - s.rev[h]; return x / 1e6; };
for (const c of Object.keys(v.scheduled)) console.log(`${c} scheduled net ${net(c).toFixed(2)} TWh, physical ${phys(c).toFixed(2)}`);
console.log(`year file keys: zones.EE ${Object.keys(y.zones.EE).join(",")}; borders.EE-FI ${Object.keys(y.borders["EE-FI"]).join(",")}`);

// by observed EE price bin: model price, FI price, model/observed FI import, NTC, thermal by zone
const bins = [-1e4, 0, 10, 30, 60, 100, 150, 250, 1e4];
const o = v.price.EE;
const fiImp = boundaryOffers(pb.zones[0], "import", "FI");
const fiExp = boundaryOffers(pb.zones[0], "export", "FI");
const cls = (z: number, pred: (c: string) => boolean, h: number) => {
  let s = 0;
  pb.zones[z].offers.forEach((of, j) => { if (!of.demand && pred(of.cls)) s += r.offers[z][j][h]; });
  for (const f of pb.zones[z].fixed) if (pred(f.cls)) s += f.mw[h];
  return s;
};
const isTh = (c: string) => /gas|oil_shale|biomass|retort/.test(c);
const obsTh = (z: string, h: number) => ["gas", "oil_shale", "biomass", "coal_gas"].reduce((s, t) => s + (v.gen[z]?.[t]?.[h] ?? 0), 0);
console.log("bin | h | EE obs | EE mod | FI | SE4 | PL | FI→EE mod / obs / NTC | sat mod% | thermal mod/obs EE, LV, LT | Daugava mod/obs | Kruonis net mod | SE4→LT mod/obs/NTC | PL→LT mod/obs");
for (let k = 0; k < bins.length - 1; k++) {
  const a = { n: 0, eo: 0, em: 0, fi: 0, se: 0, pl: 0, im: 0, io: 0, ntc: 0, sat: 0, th: [0, 0, 0], tho: [0, 0, 0], dm: 0, dobs: 0, kr: 0, sm: 0, so: 0, sn: 0, pm: 0, po: 0 };
  for (let h = 0; h < H; h++) {
    if (!(o[h] > bins[k] && o[h] <= bins[k + 1])) continue;
    a.n++; a.eo += o[h]; a.em += r.price[0][h]; a.fi += boundary.FI[h]; a.se += boundary.SE4[h]; a.pl += boundary.PL[h];
    let got = 0; for (const j of fiImp) got += r.offers[0][j][h];
    let out = 0; for (const j of fiExp) out += r.offers[0][j][h];
    const sent = got / (1 - pb.borders[0].lossImp);
    a.im += sent - out; a.io += v.scheduled["EE-FI"].rev[h] - v.scheduled["EE-FI"].fwd[h]; a.ntc += pb.borders[0].ntcImp[h];
    if (sent >= pb.borders[0].ntcImp[h] - 1e-6 && sent > 0) a.sat++;
    ZONES.forEach((z, i) => { a.th[i] += cls(i, isTh, h); a.tho[i] += obsTh(z, h); });
    a.dm += r.reservoir ? r.reservoir.release[h] : 0; a.dobs += v.gen.LV?.hydro_ror?.[h] ?? 0;
    for (const u of r.units) if (u.name === "kruonis") a.kr += u.discharge[h] - u.charge[h];
    for (const [bi, key] of [[1, "LT-SE4"], [2, "LT-PL"]] as const) {
      const ji = boundaryOffers(pb.zones[2], "import", BORDERS[bi].boundary), je = boundaryOffers(pb.zones[2], "export", BORDERS[bi].boundary);
      let g = 0; for (const j of ji) g += r.offers[2][j][h];
      let e = 0; for (const j of je) e += r.offers[2][j][h];
      const m = g / (1 - pb.borders[bi].lossImp) - e, ob = v.scheduled[key].rev[h] - v.scheduled[key].fwd[h];
      if (bi === 1) { a.sm += m; a.so += ob; a.sn += pb.borders[1].ntcImp[h]; } else { a.pm += m; a.po += ob; }
    }
  }
  if (!a.n) continue;
  const f = (x: number) => (x / a.n).toFixed(0);
  console.log(`(${bins[k]},${bins[k + 1]}] | ${a.n} | ${f(a.eo)} | ${f(a.em)} | ${f(a.fi)} | ${f(a.se)} | ${f(a.pl)} | ${f(a.im)} / ${f(a.io)} / ${f(a.ntc)} | ${(100 * a.sat / a.n).toFixed(0)} | ${a.th.map((x, i) => `${f(x)}/${f(a.tho[i])}`).join(", ")} | ${f(a.dm)}/${f(a.dobs)} | ${f(a.kr)} | ${f(a.sm)}/${f(a.so)}/${f(a.sn)} | ${f(a.pm)}/${f(a.po)}`);
}
