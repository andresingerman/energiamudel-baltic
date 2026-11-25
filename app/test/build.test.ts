// The builder on the committed export: guards, classes, bids, reserves, the Daugava's rule.
import assert from "node:assert/strict";
import { test } from "node:test";
import { links, presets, year } from "../scripts/data.ts";
import { CLAUSE_BID, FLEX, GAS_ORDER, KRUONIS_SEGMENTS, PECD_FACTOR, SLOPE_STEPS, THERMAL, bidParts, boundaryPrice, build, gasAdderOf, hourly, kruonisSteps, monthOfHour, neighbourGasCost, observedClasses } from "../src/engine/build.ts";
import { runLP } from "../src/engine/lp.ts";
import { boundaryOffers, slice } from "../src/engine/problem.ts";
import { loadSolver } from "../scripts/highs.ts";
import { outlook, replay } from "../src/state/scenario.ts";
import { eraaOutlook } from "../scripts/runs.ts";

const p = presets();
const y2024 = year("2024");
const y2025 = year("2025");
const cy = year("cy2009");
const cyScenario = () => eraaOutlook(p, cy);

test("guards reject a wrong length or a value that is not finite", () => {
  assert.throws(() => hourly([1, 2, 3], 4, "x"), /3 values/);
  assert.throws(() => hourly([1, Number.NaN], 2, "x"), /not finite/);
});

test("months follow the calendar of an observed year and the non-leap layout otherwise", () => {
  const m = monthOfHour(8784, 2024, true);
  assert.equal(m[31 * 24 + 28 * 24], 1); // 29 February 2024
  assert.equal(m[8783], 11);
  assert.equal(monthOfHour(8760, 2009, false)[59 * 24], 2); // 1 March of the layout
});

test("an observed year: oil shale in three classes, every array whole and finite", () => {
  const classes = observedClasses(p, "EE", y2024.zones.EE.capacity!);
  assert.equal(classes.oil_shale_auvere, 270);
  assert.equal(classes.oil_shale_cfb, 386);
  assert.equal(classes.oil_shale_pf, 1330 - 270 - 386);
  const pb = build(y2024, p, null, replay(p, y2024));
  for (const z of pb.zones) {
    for (const o of z.offers) {
      assert.equal(o.bid.length, 8784);
      for (let h = 0; h < 8784; h++) assert.ok(Number.isFinite(o.bid[h]) && Number.isFinite(o.mw[h]) && o.mw[h] >= 0, o.name);
    }
  }
  assert.equal(pb.storage.length, 1); // Kruonis
  assert.equal(pb.storage[0].hours, 12);
  assert.ok(pb.reservoir && pb.reservoir.budget.length === 53 && pb.reservoir.pmin.length === 53);
});

test("a replay's Daugava runs between the week's 10th and 90th percentile hour of observed output (D-044)", () => {
  const pb = build(y2024, p, null, replay(p, y2024));
  const lv = y2024.zones.LV;
  const p10 = lv.hydro_weekly_p10_mw!.daugava;
  const p90 = lv.hydro_weekly_p90_mw!.daugava;
  const mn = lv.hydro_weekly_min_mw!.daugava;
  const mx = lv.hydro_weekly_max_mw!.daugava as number[];
  const installed = observedClasses(p, "LV", lv.capacity!).hydro_daugava;
  const r = pb.reservoir!;
  for (let w = 0; w < r.pmax.length; w++) {
    const mean = r.budget[w] / Math.min(168, 8784 - w * 168);
    assert.ok(mn[w] <= p10[w] && p10[w] <= p90[w] && p90[w] <= mx[w], `week ${w}: the deciles lie inside the range`);
    assert.equal(r.pmin[w], p10[w], `week ${w}`);
    assert.equal(r.pmax[w], Math.min(installed, Math.max(p90[w], mean)), `week ${w}`); // never below the average: the budget passes
  }
  assert.ok(Math.max(...r.pmax) < installed); // never the nameplate in 2024
});

test("replays and scenario runs clear without the cables' losses; the field still prices them (R-BND-4, D-042, D-045)", () => {
  for (const b of build(y2024, p, null, replay(p, y2024)).borders) assert.deepEqual([b.lossImp, b.lossExp], [0, 0], b.code);
  for (const b of build(cy, p, links(), cyScenario()).borders) assert.deepEqual([b.lossImp, b.lossExp], [0, 0], b.code);
  for (const b of build(cy, p, links(), { ...cyScenario(), losses: true }).borders) assert.ok(b.lossImp > 0 && b.lossExp > 0, b.code);
});

test("an observed year's thermal availability is each technology's weekly maximum output (D-022)", () => {
  const pb = build(y2024, p, null, replay(p, y2024));
  const wk = y2024.zones.EE.thermal_weekly_max_mw!.oil_shale;
  const ee = pb.zones[0];
  for (const h of [0, 3000, 8783]) {
    let total = 0;
    for (const o of ee.offers) if (o.cls.startsWith("oil_shale_")) total += o.mw[h];
    for (const f of ee.fixed) if (f.cls.startsWith("oil_shale_")) total += f.mw[h];
    assert.ok(Math.abs(total - Math.min(1330, wk[(h / 168) | 0])) < 1e-9, `hour ${h}: ${total}`);
  }
});

test("oil shale: the CO2 part moves with the EUA price, the premium does not (R-SUP-4)", () => {
  const pb = build(y2024, p, null, replay(p, y2024));
  const o = pb.zones[0].offers.find((x) => x.cls === "oil_shale_auvere")!;
  const eua = y2024.fuel!.eua_eur_t;
  const m = monthOfHour(8784, 2024, true);
  const h1 = 0; // January
  const h2 = 8783; // December
  const co2 = (100 * 3.6) / 1000 / 0.39;
  assert.ok(Math.abs(o.bid[h2] - o.bid[h1] - co2 * (eua[m[h2]] - eua[m[h1]])) < 1e-9);
  const premium = p.oil_shale.oil_shale_auvere.value;
  assert.ok(Math.abs(o.bid[h1] - (10 / 0.39 + eua[0] * co2 + 3.3 + premium)) < 1e-9);
});

test("scenario runs hold the reserve as thermal headroom; replays have it in their availability (R-STO-5, D-022)", () => {
  const pb = build(cy, p, links(), cyScenario());
  const gas = pb.zones[2].offers.find((o) => o.cls === "gas_ccgt")!;
  const floor = pb.zones[2].fixed.find((f) => f.cls === "gas_ccgt");
  let held = 0;
  for (let h = 0; h < 8760; h++) if (gas.mw[h] + (floor ? floor.mw[h] : 0) < 624 - 1e-6) held++;
  assert.ok(held > 0.9 * 8760, `${held} hours with headroom`);
  // in a replay the weekly maximum output is already what was offered: nothing more is taken
  const r = build(y2025, p, null, replay(p, y2025));
  const wk = y2025.zones.LT.thermal_weekly_max_mw!.gas;
  const lt = r.zones[2];
  const h = 5000; // after the market's start (hour 839)
  let total = 0;
  for (const o of lt.offers) if (o.cls === "gas_ccgt") total += o.mw[h];
  for (const f of lt.fixed) if (f.cls === "gas_ccgt") total += f.mw[h];
  assert.ok(Math.abs(total - Math.min(1503, wk[(h / 168) | 0])) < 1e-9);
});

test("a battery's day-ahead power is its capacity less the reserve it holds (R-STO-7)", () => {
  const sc = cyScenario();
  const pb = build(cy, p, links(), sc);
  const ee = pb.storage.find((u) => u.name === "battery:EE")!;
  const res = p.reserve as unknown as { need_2026: Record<string, { value: number }>; shares_2025: Record<string, Record<string, { value: number }>> };
  const n = res.need_2026;
  const s = res.shares_2025;
  const held = n.fcr_mw.value * s.FCR_sym.EE.value + ((n.afrr_up_mw_low.value + n.afrr_up_mw_high.value) / 2) * s.aFRR_up.EE.value
    + sc.mfrrShare * ((n.mfrr_up_mw_low.value + n.mfrr_up_mw_high.value) / 2) * s.mFRR_up.EE.value;
  assert.ok(Math.abs(ee.mw - (1500 - held)) < 1e-9, `${ee.mw} vs ${1500 - held}`);
  assert.equal(ee.hours, 2);
});

test("the batteries' cycle control moves the batteries only; Kruonis keeps R-PAR-5's cap (E-048)", () => {
  const sc = cyScenario();
  sc.battery.cyclesPerDay = 0.5;
  const pb = build(cy, p, links(), sc);
  const b = pb.storage.find((u) => u.name === "battery:EE")!;
  const k = pb.storage.find((u) => u.name === "kruonis")!;
  assert.equal(b.budget![0], 0.5 * b.hours);
  assert.equal(k.budget![0], p.parameters["battery.cycles_per_day.clean_horizon_assumption"]!.value * k.hours);
});

test("Kruonis's output runs in four steps of the hour's power, from the register or the run's own step (D-115)", () => {
  assert.equal(kruonisSteps(0), undefined); // no step: one segment, the LP as it was
  assert.deepEqual(kruonisSteps(60), [0, 60, 120, 180]);
  assert.equal(kruonisSteps(60)!.length, KRUONIS_SEGMENTS);
  const fitted = (p as unknown as { fitted: { kruonis_output?: { step_eur_mwh: number } } }).fitted.kruonis_output;
  const k = build(y2024, p, null, replay(p, y2024)).storage.find((u) => u.name === "kruonis")!;
  assert.deepEqual(k.dischargeSteps, kruonisSteps(fitted?.step_eur_mwh ?? 0));
  const own = build(y2024, p, null, { ...replay(p, y2024), kruonisStep: 30 }).storage.find((u) => u.name === "kruonis")!;
  assert.deepEqual(own.dischargeSteps, [0, 30, 60, 90]);
  // a run's step of 0 overrides the register's: the plant as before D-115 (the fit's first point)
  assert.equal(build(y2024, p, null, { ...replay(p, y2024), kruonisStep: 0 }).storage.find((u) => u.name === "kruonis")!.dischargeSteps, undefined);
});

test("a scenario run: demand scaled to the preset's energy, electrolysis off (D-011)", () => {
  const sc = cyScenario();
  const pb = build(cy, p, links(), sc);
  const twh = pb.zones[2].load.reduce((a, x) => a + x, 0) / 1e6;
  assert.ok(Math.abs(twh - p.demand.eraa2025_nt_2035.LT["2035"].twh.value) < 1e-9);
  assert.ok(pb.zones.every((z) => z.offers.every((o) => o.cls !== "electrolysis")));
});

test("the plant: all of it at the market's floor under a plain contract (D-150), half of it just above the renewables' 0 under the clause (R-SMR-4)", () => {
  const sc = cyScenario();
  sc.smr = { ...sc.smr, units: 2 };
  const plain = build(cy, p, links(), sc);
  assert.ok(!plain.zones[0].fixed.some((f) => f.cls === "nuclear"));
  const must = plain.zones[0].offers.find((o) => o.cls === "nuclear")!;
  assert.ok(must.bid.every((b) => b === sc.floor) && sc.floor === -600);
  const mwh = must.mw.reduce((a, x) => a + x, 0);
  assert.equal(mwh, 315 * (2 * 8760 - 2 * 336)); // 315 MW a unit since D-189
  const clause = build(cy, p, links(), { ...sc, smr: { ...sc.smr, clause: true } });
  const half = clause.zones[0].fixed.find((f) => f.cls === "nuclear")!;
  const offer = clause.zones[0].offers.find((o) => o.cls === "nuclear")!;
  for (const h of [0, 4000, 8759]) {
    assert.equal(half.mw[h] + offer.mw[h], must.mw[h]);
    assert.equal(half.mw[h], must.mw[h] * 0.5);
    assert.equal(offer.bid[h], CLAUSE_BID);
  }
});

test("the Finnish slope: tranches along the line, and the engine of record's price moves with it (R-BND-6)", async () => {
  const pb = build(y2024, p, null, { ...replay(p, y2024), fiSlope: 5 });
  const ee = pb.zones[0];
  const b = pb.borders[0];
  const imp = boundaryOffers(ee, "import", "FI");
  assert.equal(imp.length, SLOPE_STEPS);
  const h = 1000;
  const step = (5 * b.ntcImp[h]) / SLOPE_STEPS / 1000 / (1 - b.lossImp);
  imp.slice(1).forEach((j, k) => assert.ok(Math.abs(ee.offers[j].bid[h] - ee.offers[imp[k]].bid[h] - step) < 1e-9));
  assert.ok(Math.abs(imp.reduce((a, j) => a + ee.offers[j].mw[h], 0) - b.ntcImp[h] * (1 - b.lossImp)) < 1e-6);
  const { solve } = await loadSolver();
  // October 2024, EstLink 2 back: the flow is not always at its limit, so Finland's price line shows
  const flat = runLP(slice(build(y2024, p, null, replay(p, y2024)), 168 * 41, 168 * 42), solve);
  const sloped = runLP(slice(pb, 168 * 41, 168 * 42), solve);
  let moved = 0;
  for (let t = 0; t < 168; t++) moved = Math.max(moved, Math.abs(sloped.price[0][t] - flat.price[0][t]));
  assert.ok(moved > 0.5, `largest hourly difference ${moved}`);
});

test("a scenario's Daugava is bounded by its megawatts, on an inflow at the record's level (D-070)", () => {
  const sc = outlook(p, cy, { target: 2035, profile: "DE_2035", fleet: { EE: "eraa2025_nt_2035", LV: "eraa2025_nt_2035", LT: "eraa2025_nt_2035" }, demand: { EE: null, LV: null, LT: null }, dsr: null, fuelPath: "eraa2025_final" });
  const r = build(cy, p, links(), sc).reservoir!;
  const mw = sc.fleet!.LV.hydro_daugava;
  // not TYNDP 2024's weekly "maximum generating power", which the file still holds and which is far lower
  const top = Math.max(...(cy.zones.LV.hydro_weekly_max_mw!.daugava as unknown as Record<string, number[]>)["2030"]);
  assert.ok(top < 600 && mw > 1500);
  // free of the record's band (the engine's switch): the megawatts alone
  for (const x of build(cy, p, links(), { ...sc, daugavaBand: false }).reservoir!.pmax) assert.equal(x, mw);
  // the year's water: TYNDP 2024's 1.60 TWh of climate year 2009 times the factor of the export
  const f = (p.hydro as unknown as { daugava_inflow_factor: { value: number; by_climate_year: Record<string, number> } }).daugava_inflow_factor;
  assert.equal(f.value, 1.95);
  assert.deepEqual(Object.keys(f.by_climate_year), ["2015", "2016", "2017"]);
  const twh = r.budget.reduce((a, x) => a + x, 0) / 1e6;
  assert.ok(Math.abs(twh - 1.6 * 1.95) < 0.05, `${twh} TWh`);
  // every week's water can be turbined within the limit
  r.budget.forEach((b, w) => assert.ok(b <= r.pmax[w] * 168 + 1e-6, `week ${w}`));
});

test("a scenario's Daugava is held to the record's weekly band for a week of its average output (D-071)", () => {
  const band = (p.hydro as unknown as { daugava_band: { bins: { up_to_mw: number; p10: number; p90: number }[]; years: number[] } }).daugava_band;
  assert.deepEqual(band.years, [2020, 2025]);
  assert.equal(band.bins.length, 3);
  assert.ok(band.bins[0].up_to_mw < band.bins[1].up_to_mw && band.bins[1].up_to_mw < band.bins[2].up_to_mw);
  assert.ok(band.bins[0].p90 > band.bins[2].p90 && band.bins[2].p90 > 1);   // a dry week swings more around its average than a wet one
  const sc = cyScenario();
  const r = build(cy, p, links(), sc).reservoir!;
  const mw = sc.fleet!.LV.hydro_daugava;
  let bound = 0;
  for (let w = 0; w < r.budget.length; w++) {
    const hours = Math.min(168, 8736 - w * 168);
    if (hours <= 0) continue;
    const mean = r.budget[w] / hours;
    if (!(mean > 0)) continue;
    const k = band.bins.find((b) => mean <= b.up_to_mw) ?? band.bins[2];
    assert.ok(Math.abs(r.pmax[w] - Math.min(mw, Math.max(mean, k.p90 * mean))) < 1e-6, `week ${w}: the upper edge`);
    assert.ok(r.pmin[w] <= mean + 1e-9 && r.pmin[w] >= Math.min(mean, k.p10 * mean) - 1e-9, `week ${w}: the lower edge`);
    assert.ok(r.pmin[w] * hours <= r.budget[w] + 1e-6 && r.budget[w] <= r.pmax[w] * hours + 1e-6, `week ${w}: the water fits the band`);
    if (r.pmax[w] < mw) bound++;
  }
  assert.ok(bound > 40, "the band binds in most weeks");
});

test("the neighbours' profile is taken as published, times its level (D-194); the fossil level is the market model's best gas plant on its own prices (E-064)", () => {
  const sc = cyScenario();
  const near = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) < tol, `${a} is not ${b}`);
  const raw = boundaryPrice(cy, "PL", "DE_2035", 1), lv = boundaryPrice(cy, "PL", "DE_2035", 1.1);
  for (let h = 0; h < raw.length; h++) near(lv[h], raw[h] * 1.1, 1e-9);
  // the engine's borders carry it whatever the run's gas and CO₂ (until D-194 a re-priced profile followed them)
  const mean = (a: Float64Array) => a.reduce((x, v) => x + v, 0) / a.length;
  const pl = mean(boundaryPrice(cy, "PL", "DE_2035", sc.level.PL));
  for (const [gasPrice, euaPrice] of [[30, 80], [75, 150]]) {
    const pb = build(cy, p, links(), { ...sc, gasPrice, euaPrice });
    assert.ok(pb.borders.some((b) => Math.abs(mean(b.price) - pl) < 1e-6), `LNG ${gasPrice}, CO₂ ${euaPrice}`);
  }
  // the market model's best gas plant on its gas blend and CO₂ price of 2035, whatever the run's prices
  near(neighbourGasCost(p, sc)!, 90.3, 0.7);
  assert.equal(neighbourGasCost(p, { ...sc, gasPrice: 75, euaPrice: 150 }), neighbourGasCost(p, sc));
  assert.equal(neighbourGasCost(p, { ...sc, profile: "NTplus_2035" }), null);
  assert.equal(neighbourGasCost(p, { ...sc, profile: "REAL_2025" }), null);
});

test("a replay holds each thermal technology to at least its week's 10th-percentile hour, and Kruonis to its week's power (D-073)", async () => {
  const sc = replay(p, y2025);
  const pb = build(y2025, p, null, sc);
  const H = pb.hours;
  // Lithuania's gas in the first weeks of 2025, kept running through the synchronisation: the
  // fitted floor asks for about 50 MW, the record's 10th-percentile hour for some 200
  const lt = pb.zones[2];
  const p10 = y2025.zones.LT.thermal_weekly_p10_mw!.gas as number[];
  const must = (h: number) => lt.fixed.filter((f) => f.cls.startsWith("gas_")).reduce((a, f) => a + f.mw[h], 0);
  assert.ok(p10[1] > 150, `week 1: ${p10[1]} MW`);
  for (const h of [168, 200, 300]) assert.ok(Math.abs(must(h) - p10[(h / 168) | 0]) < 1e-6, `hour ${h}: ${must(h)} MW`);
  // never below the fitted floor, never above what the technology offers that week
  const off = build(y2025, p, null, { ...sc, chpFloor: false }).zones[2];
  const max = y2025.zones.LT.thermal_weekly_max_mw!.gas as number[];
  for (let h = 0; h < H; h += 97) {
    assert.ok(must(h) <= max[(h / 168) | 0] + 1e-6 && must(h) >= Math.min(p10[(h / 168) | 0], max[(h / 168) | 0]) - 1e-6, `hour ${h}`);
    assert.equal(off.fixed.filter((f) => f.cls.startsWith("gas_")).reduce((a, f) => a + f.mw[h], 0), 0); // no floors at all when switched off
  }
  // Kruonis: delivered up to the week's maximum observed output, pumped up to that over its efficiency
  const k = pb.storage.find((u) => u.name === "kruonis")!;
  const top = y2025.zones.LT.hydro_weekly_max_mw!.kruonis as number[];
  assert.ok(Math.max(...top) < k.mw * k.eff + 1e-6 && Math.max(...top) > 500);
  for (let h = 0; h < H; h += 131) {
    assert.equal(k.dischargeMax![h], top[(h / 168) | 0]);
    assert.ok(Math.abs(k.chargeMax![h] - top[(h / 168) | 0] / k.eff) < 1e-9);
  }
  // a week of the problem carries its own hours of both, and the engine of record honours them
  const wk = slice(pb, 168 * 5, 168 * 6);
  const ku = wk.storage.find((u) => u.name === "kruonis")!;
  assert.equal(ku.dischargeMax!.length, 168);
  assert.equal(ku.dischargeMax![0], top[5]);
  const { solve } = await loadSolver();
  const res = runLP(wk, solve).units.find((u) => u.name === "kruonis")!;
  for (let h = 0; h < 168; h++) assert.ok(res.discharge[h] <= ku.dischargeMax![h] + 1e-6 && res.charge[h] <= ku.chargeMax![h] + 1e-6, `hour ${h}`);
  // a scenario run keeps the plant's megawatts
  assert.equal(build(cy, p, links(), cyScenario()).storage.find((u) => u.name === "kruonis")!.dischargeMax, undefined);
});

test("a scenario's oil shale runs on its bid alone and its waste plants as given output (D-074)", () => {
  const s1 = { EE: "elering_taltech_s1_2035", LV: "eraa2025_nt_2035", LT: "eraa2025_nt_2035" };
  const sc = outlook(p, cy, { target: 2035, profile: "DE_2035", fleet: s1, demand: s1, dsr: "eraa2025_nt_2035", fuelPath: "eraa2025_final" });
  const pb = build(cy, p, links(), sc);
  const ee = pb.zones[0], lt = pb.zones[2];
  // Auvere: no must-run part, all of it on offer — it holds no reserve, since its entry may leave
  // it off for the day; the thermal offers that run continuously hold it all (ERRATA E-142)
  assert.equal(ee.fixed.filter((f) => f.cls.startsWith("oil_shale")).length, 0);
  const auvere = ee.offers.find((o) => o.cls === "oil_shale_auvere")!;
  assert.ok(auvere.mw.every((x) => x === 270));
  const free = build(cy, p, links(), { ...sc, reserves: false }).zones[0];
  const held = (h: number, oilShale: boolean) => ee.offers.reduce((t, o, j) => t + (o.cls.startsWith("oil_shale") === oilShale ? free.offers[j].mw[h] - o.mw[h] : 0), 0);
  for (const h of [0, 5000]) assert.ok(held(h, false) > 100 && held(h, true) === 0, `hour ${h}: ${held(h, false)}`);
  assert.ok(ee.reserveUnmet.every((x) => x === 0));
  // the heat-driven floors of gas and biomass stay (R-SUP-5)
  assert.ok(pb.zones[1].fixed.some((f) => f.cls === "gas_ccgt" && f.mw[0] > 0));
  assert.ok(ee.fixed.some((f) => f.cls === "biomass_chp" && f.mw[0] > 0));
  // a replay's oil-shale must-run is the week's least output of its record, no fitted floor (D-109)
  const shale = build(y2024, p, null, replay(p, y2024)).zones[0].fixed.filter((f) => f.cls.startsWith("oil_shale"));
  const p10 = y2024.zones.EE.thermal_weekly_p10_mw!.oil_shale[0];
  assert.ok(p10 > 0 && Math.abs(shale.reduce((t, f) => t + f.mw[0], 0) - p10) < 1e-6, `${p10}`);
  // waste: every megawatt less the technology's outages, in every hour, and no offer
  for (const [z, mw] of [[ee, 17], [lt, 60]] as const) {
    assert.equal(z.offers.filter((o) => o.cls === "waste").length, 0);
    const w = z.fixed.find((f) => f.cls === "waste")!;
    assert.ok(Math.abs(w.mw[0] - mw * 0.99 * (1 - 2.58 / 52)) < 0.01 && w.mw[0] === w.mw[8000], `${w.mw[0]}`);
    assert.ok(w.co2 > 0);
  }
});

test("a replay prices gas per net MWh, the record's price over 0.9, as ERAA's efficiencies are (R-SUP-3, D-171, ERRATA E-167)", () => {
  const y = year("2024");
  const ncv = p.parameters["fuel.gas.ncv_per_gcv"]!;
  assert.equal(ncv.value, 0.9);
  const gross = { ...p, parameters: { ...p.parameters, "fuel.gas.ncv_per_gcv": { ...ncv, value: 1 } } };
  const gas = (q: typeof p) => build(y, q, null, replay(q, y)).zones.flatMap((z) => z.offers.filter((o) => !o.demand && FLEX.has(o.cls)));
  const [net, gr] = [gas(p), gas(gross)];
  const eff = bidParts(p, { fuelPath: "eraa2025_final", target: 2035, gasFloor: null, gasPrice: null, euaPrice: null }, "gas_ccgt")!.eff;
  const h = 4000, r = y.fuel!.gas_eur_mwh_th[monthOfHour(y.meta.hours, 2024, true)[h]];
  assert.ok(net.length > 0 && net.length === gr.length);
  // every gas offer bids the combined-cycle plant's cost: its fuel part up by the record's price over 0.9, less the price
  // (D-168's thousandth of each class's cost above it moves by less than 0.01)
  net.forEach((o, i) => assert.ok(Math.abs(o.bid[h] - gr[i].bid[h] - (r / 0.9 - r) / eff) < 0.01, `${o.name}: ${gr[i].bid[h]} → ${o.bid[h]}`));
});

test("the gas plants of the three zones bid one price, a combined-cycle plant's cost plus the adder, moved by hand once; another class's bid moved by hand shifts alone (R-SUP-6, D-090, D-164)", async () => {
  // the opening state: Estonia's gas open-cycle (S1), Latvia's and Lithuania's combined-cycle (ERAA)
  const { engineScenario, opening } = await import("../src/state/model.ts");
  const sc = engineScenario(p, cy, opening(p));
  const gas = (pb: ReturnType<typeof build>) => pb.zones.flatMap((z) => z.offers.filter((o) => !o.demand && FLEX.has(o.cls)));
  const g = gas(build(cy, p, links(), sc));
  assert.ok(new Set(g.map((o) => o.cls)).size >= 2, `gas of more than one efficiency: ${g.map((o) => o.cls)}`);
  // one price, each class above it by a thousandth of its cost above a combined-cycle plant's (D-168)
  const cost = bidParts(p, sc, "gas_ccgt")!.cost;
  for (const h of [0, 4000]) for (const o of g) {
    const order = GAS_ORDER * (bidParts(p, sc, o.cls)!.cost - cost);
    assert.ok(Math.abs(o.bid[h] - cost - gasAdderOf(p) - order) < 1e-9 && Math.abs(order) < 0.1, `${o.name} in hour ${h}: ${o.bid[h]}`);
  }
  const moved = gas(build(cy, p, links(), { ...sc, gasAdj: -40 }));
  moved.forEach((o, i) => assert.ok(Math.abs(g[i].bid[4000] - 40 - o.bid[4000]) < 1e-9, `${o.name}: ${g[i].bid[4000]} → ${o.bid[4000]}`));
  assert.ok(gas(build(cy, p, links(), { ...sc, gasAdj: -1000 })).every((o) => o.bid[4000] === 0), "never below a bid of 0");
  // another thermal class moved by hand: by its offset, in its zone alone (D-090)
  const base = build(cy, p, links(), sc);
  const z = base.zones.findIndex((x) => x.offers.some((o) => THERMAL.has(o.cls) && !FLEX.has(o.cls)));
  const cls = base.zones[z].offers.find((o) => THERMAL.has(o.cls) && !FLEX.has(o.cls))!.cls;
  const code = (["EE", "LV", "LT"] as const)[z];
  const shifted = build(cy, p, links(), { ...sc, bidAdj: { EE: {}, LV: {}, LT: {}, [code]: { [cls]: 25 } } });
  const bid = (pb: ReturnType<typeof build>, i: number) => pb.zones[i].offers.filter((o) => o.cls === cls).map((o) => o.bid[4000]);
  bid(base, z).forEach((x, i) => assert.ok(Math.abs(bid(shifted, z)[i] - x - 25) < 1e-9, `${code} ${cls}`));
  base.zones.forEach((_, i) => { if (i !== z) assert.deepEqual(bid(shifted, i), bid(base, i)); });
  assert.deepEqual(gas(shifted).map((o) => o.bid[4000]), g.map((o) => o.bid[4000]));
});

test("among the gas plants' equal bids the cheaper plant runs first, whatever the offers' names (D-168, ERRATA E-161)", async () => {
  // a renamed offer moves the solver's tie-break; the order by cost holds Estonia's open-cycle gas behind
  // Latvia's and Lithuania's combined cycle all the same (before D-168 its hours doubled in 2009)
  const { engineScenario, opening } = await import("../src/state/model.ts");
  const { solve } = await loadSolver();
  const pb = build(cy, p, links(), engineScenario(p, cy, opening(p)));
  const renamed = { ...pb, zones: pb.zones.map((z, i) => (i ? z : { ...z, offers: z.offers.map((o) => (FLEX.has(o.cls) ? { ...o, name: `${o.name}~20` } : o)) })) };
  const gasMwh = (q: typeof pb) => {
    const r = runLP(q, solve);
    return q.zones.map((z, i) => z.offers.reduce((a, o, j) => a + (FLEX.has(o.cls) ? r.offers[i][j].reduce((x, y) => x + y, 0) : 0), 0));
  };
  const [a, b] = [gasMwh(pb), gasMwh(renamed)];
  a.forEach((x, i) => assert.ok(Math.abs(x - b[i]) <= 1e-6 * Math.max(1, x), `zone ${i}: ${x} MWh, renamed ${b[i]}`));
});

test("Lithuania's onshore wind runs at 0.80 of PECD 3.1's factor in a climate year, not in TYNDP 2026's weather (OPEN-2, D-107)", async () => {
  const { engineScenario, opening } = await import("../src/state/model.ts");
  const p = presets();
  const y = year("cy2009");
  const sc = engineScenario(p, y, opening(p));
  const wind = (yr: typeof y, zone: number) => {
    const o = build(yr, p, links(), sc).zones[zone].offers.find((x) => x.name === "wind_onshore")!;
    return o.mw.reduce((a, b) => a + b, 0);
  };
  const [lt, lv] = [wind(y, 2), wind(y, 1)];
  const saved = PECD_FACTOR.LT!.wind_onshore!;
  PECD_FACTOR.LT!.wind_onshore = 1;
  try {
    assert.ok(Math.abs(lt / wind(y, 2) - 0.8) < 1e-12, "Lithuania at 0.80");
    assert.equal(wind(y, 1), lv); // Latvia uncorrected
  } finally {
    PECD_FACTOR.LT!.wind_onshore = saved;
  }
  // a weather scenario of TYNDP 2026 keeps its own factor
  const weather = { ...y, meta: { ...y.meta, kind: "weather" } } as typeof y;
  PECD_FACTOR.LT!.wind_onshore = 1;
  let plain: number;
  try {
    plain = wind(weather, 2);
  } finally {
    PECD_FACTOR.LT!.wind_onshore = saved;
  }
  assert.equal(wind(weather, 2), plain);
});

test("a floor on a boundary's average lifts the profile by one factor where it is lower, and only there (E-149)", () => {
  const sc = cyScenario();
  const mean = (a: Float64Array) => a.reduce((s, x) => s + x, 0) / a.length;
  const pl = (floor: number | null) => build(cy, p, links(), { ...sc, meanFloor: floor === null ? null : { PL: floor } }).borders.find((b) => b.code === "LT-PL")!.price;
  const base = pl(null);
  assert.ok(Math.abs(mean(pl(150)) - 150) < 1e-9 && mean(base) < 150);
  const hi = pl(150);
  assert.ok(Math.abs(hi[100] / base[100] - 150 / mean(base)) < 1e-9 || base[100] === 0); // one factor on every hour
  assert.deepEqual(Array.from(pl(10)), Array.from(base)); // an average above the floor stays as it is
});
