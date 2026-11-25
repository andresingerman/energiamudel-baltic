// The panel's state: the opening state (D-011, D-027), the set of years, the canonical text and
// the share link (R-APP-1, R-APP-10), the sensitivities (R-APP-11).
import assert from "node:assert/strict";
import { test } from "node:test";
import { links, presets, year } from "../scripts/data.ts";
import { build, impliedBid, neighbourGasCost } from "../src/engine/build.ts";
import { ZONES } from "../src/engine/problem.ts";
import type { State } from "../src/state/model.ts";
import { PROFILE_YEARS, S1, engineScenario, opening, otherProfile, partsOf, owner, plannedOn, presetLevel, replayState, runsOf, sensitivities, withProfile } from "../src/state/model.ts";
import { fromText, jobKey, maximumOf, parse, serialize, shareHash, textOfHash } from "../src/state/text.ts";
import type { SensMoney, SensResult, YearResult } from "../src/ui/results.ts";
import { sensBid, sensHtml } from "../src/ui/results.ts";
import { scenarioOf } from "../src/worker/assemble.ts";

const p = presets();

test("the opening state: 0 SMR against TYNDP 2024 Distributed Energy 2035 on 1995/2008/2009, electrolysis off, no plant (D-036)", () => {
  const s = opening(p);
  assert.equal(s.run, "scenario");
  assert.equal(s.family, "tyndp2024");
  assert.equal(s.profile, "DE");
  assert.equal(s.target, 2035);
  const runs = runsOf(p, s);
  assert.deepEqual(runs.map((r) => r.key), ["cy1995", "cy2008", "cy2009"]);
  assert.ok(Math.abs(runs.reduce((a, r) => a + r.weight, 0) - 1) < 1e-9);
  for (const z of ZONES) {
    assert.equal(s.zones[z].electrolysisMw, 0);
    assert.ok(!owner(s.zones[z].fleet) && !owner(s.zones[z].demand));
  }
  assert.equal(s.zones.EE.demand, S1);
  assert.equal(s.zones.EE.fleet, S1);
  assert.equal(s.zones.LV.fleet, "eraa2025_nt_2035");
  assert.equal(s.scenario, "gas");
  assert.equal(engineScenario(p, year("cy2009"), s).smr.units, 0);
  // the lines S1 has from 2040 are off in 2035 (the owner, D-036); Harmony Link is on
  assert.deepEqual(s.links.on, { ee_lv_4: false, estlink3: false, harmony: true });
  // 2 SMR: two units on top of the same base, the Estonian peaking gas as in 0 SMR (D-151)
  const smr2 = engineScenario(p, year("cy2009"), { ...s, scenario: "smr2" });
  assert.equal(smr2.smr.units, 2);
  assert.equal(smr2.fleet!.EE.gas_ocgt, s.zones.EE.mw.gas_ocgt);
});

test("the text is the state and the state the text, for a scenario and a replay", () => {
  for (const s of [opening(p), replayState(p, 2024)]) {
    const text = serialize(s);
    assert.ok(text.startsWith("v=3\n"));
    const lines = text.trim().split("\n").slice(1);
    assert.deepEqual(lines, [...lines].sort());
    const back = parse(p, text);
    assert.equal(serialize(back), text);
    assert.deepEqual(back, s);
  }
});

test("import rejects what the schema or the presets do not allow", () => {
  const good = serialize(opening(p));
  const bad: [string, RegExp][] = [
    [good + "EE.mw.unicorn=5\n", /no class unicorn/],
    [good + "nonsense=1\n", /unknown key/],
    [good.replace("EE.multiplier=1", "EE.multiplier=9"), /above 2/],
    [good.replace("EE.multiplier=1", "EE.multiplier=abc"), /not a number/],
    [good + "EE.multiplier=1\n", /twice/],
    [good.replace("v=3", "v=4"), /is not one of 1, 2, 3/],
    [good.replace("target=2035", "target=2040"), /2035 only/],
    [good.replace("profile=DE", "profile=NTplus"), /profile NTplus is not one of DE, GA/],
    [good.replace("scenario=gas", "scenario=smr4"), /is not one of gas, smr1, smr2, smr3/],
    [good.replace("smr.strike=90", "smr.strike=200"), /above 160/],
    [good.replace("line.estlink2.whatif=none", "line.estlink2.whatif=0@02-30..03-01"), /no date 02-30/],
    [good.replace("line.estlink2.whatif=none", "line.estlink2.whatif=all"), /line.estlink2.whatif: all/],
    [good + "line.unicorn.whatif=none\n", /not a key of a scenario/],
    [good.replace(/^links\.plan=.*$/m, ""), /links.plan is missing/],
    [serialize(replayState(p, 2024)) + "line.estlink3.whatif=none\n", /not a key of a replay/],
    [good.replace(`EE.fleet=${S1}`, "EE.fleet=litgrid_ltrsc_2035"), /no fleet preset/],
    [good.replace(/^reserves=.*$/m, ""), /reserves is missing/],
    [serialize(replayState(p, 2024)) + "EE.fleet=eraa2025_nt_2035\n", /not a key of a replay/],
    [good.replace(`EE.demand=${S1}`, "EE.demand=<script>"), /not a valid name/],
    // names of Object.prototype are not presets or classes (own properties only)
    [good.replace(/^dsr=.*$/m, "dsr=constructor"), /no DSR preset constructor/],
    [good + "EE.mw.constructor=100\n", /no class constructor/],
    [good + "EE.mw.__proto__=5\n", /no class __proto__/],
    [good + "constructor=1\n", /unknown key constructor/],
    [good + "<b>bad\n", /not key=value: <b>bad/],
    [good.replace(/^reserves=.*$/m, "reserves=yes"), /not true or false/],
    [serialize(replayState(p, 2024)).replace("year=2024", "year=2024.5"), /not an integer/],
    [serialize(replayState(p, 2024)).replace("year=2024", "year=2019"), /below 2020/],
    [good.replace("v=3", "v=1"), /not a key of a scenario/], // the contract's keys came with v3
    ["", /not a version/],
  ];
  for (const [text, why] of bad) assert.throws(() => parse(p, text), why);
  // a version-2 text (before D-036) opens on 0 SMR without the contract's keys, its lines as
  // written; a version-1 text (before M5) with the borders at their defaults, ERAA's lines (D-031)
  const v2 = good.split("\n").filter((l) => !/^(scenario|smr\.)/.test(l)).join("\n").replace("v=3", "v=2");
  assert.deepEqual(parse(p, v2), opening(p));
  const v1 = v2.split("\n").filter((l) => !/^(links\.|line\.)/.test(l)).join("\n").replace("v=2", "v=1");
  const was = opening(p);
  was.links.on = plannedOn(p, 2035);
  assert.deepEqual(parse(p, v1), was);
  assert.throws(() => fromText("x".repeat(20001)), /too long/);
});

test("the share link carries the text, UTF-8 intact", () => {
  const text = serialize(opening(p));
  assert.equal(textOfHash(shareHash(text)), text);
  assert.equal(textOfHash(shareHash("õäöü ✓")), "õäöü ✓");
  assert.equal(textOfHash("#other"), null);
  assert.equal(textOfHash("#s=not*base64"), null); // outside the alphabet: no text, not an error
  assert.throws(() => textOfHash("#s=_w"), TypeError); // 0xFF is not UTF-8 (fatal decoder)
  assert.throws(() => parse(p, textOfHash(shareHash("v=3\nrun=<img src=x onerror=alert(1)>\n"))!), /is not one of scenario, replay/);
});

test("the opening state builds for every year of its set; sensitivities change what they say", () => {
  const s = opening(p);
  for (const r of runsOf(p, s)) build(year(r.key), p, links(), engineScenario(p, year(r.key), s));
  // the owner's four price pairs of LNG and CO₂ (D-183): only the two prices move, everything else the headline's
  const sens = sensitivities(p, s);
  assert.deepEqual(sens.map((x) => x.id), ["1", "2", "3", "4"]);
  assert.deepEqual(sens.map((x) => [x.state.fuelGas, x.state.fuelEua]), [[30, 80], [45, 95], [60, 120], [75, 150]]);
  assert.deepEqual(sens.map((x) => x.label), ["LNG 30 €/MWh, CO₂ 80 €/t", "LNG 45 €/MWh, CO₂ 95 €/t", "LNG 60 €/MWh, CO₂ 120 €/t", "LNG 75 €/MWh, CO₂ 150 €/t"]);
  for (const x of sens) {
    assert.ok(x.gasFloor === null && x.meanFloor === null);
    assert.deepEqual({ ...x.state, fuelGas: s.fuelGas, fuelEua: s.fuelEua }, s);
  }
  assert.deepEqual(sensitivities(p, replayState(p, 2024)), []);
  // the gas plants' one bid at each pair: 30 / 0.56 + 80 × 0.3664 + 1.6 + 42.5 = 127.0 (D-186, D-187)
  assert.deepEqual(sens.map((x) => Math.round(sensBid(p, x.state))), [127, 159, 195, 233]);
  // the owner's table (D-195): the pairs and the bid at the head; each scenario's price and the share of the year a
  // Baltic gas plant set it; for the units, the lower price on the demand, the contract and the two together, M€ a year
  const run = (mean: number, plant: boolean, gas: number) => ({ weight: 1, view: { hours: 2, zones: [0, 1, 2].map(() => ({ mean, price: new Float32Array([80, 80]), fossil: { unit: gas, gas, neighbour: 0 } })),
    plant: plant ? { mw: new Float32Array([1e6, 1e6]), month: new Uint8Array([0, 0]) } : null } }) as unknown as YearResult;
  const one = (by: SensResult["by"], money?: SensMoney) => sensHtml(null, [{ id: "1", label: sens[0].label, set: null, bid: sensBid(p, sens[0].state), by }], { gas: "0 SMR", smr1: "1 SMR" }, money);
  const table = one({ gas: [run(100, false, 1)], smr1: [run(90, true, 0)] }, { demandTwh: 10, strike: 90, clause: false });
  assert.match(table, /<thead><tr><th scope="row">LNG<\/th><th class="n">30 <span class="u">€\/MWh<\/span><\/th><\/tr><tr><th scope="row">CO₂<\/th><th class="n">80 <span class="u">€\/t<\/span><\/th><\/tr><tr><th scope="row">Gas plants' bid<\/th><th class="n">127 <span class="u">€\/MWh<\/span><\/th><\/tr><\/thead>/);
  assert.match(table, /<tr class="lead"><th scope="row">Electricity price without nuclear<\/th><td class="n">100\.0 <span class="u">€\/MWh<\/span><\/td><\/tr><tr class="share"><th scope="row">Baltic gas plants set the price<\/th><td class="n">50\.0 <span class="u">% of the year<\/span><\/td><\/tr>/);
  assert.match(table, /<tr class="lead"><th scope="row">With 2\.0 TWh of nuclear<\/th><td class="n">90\.0 <span class="u">€\/MWh<\/span><\/td><\/tr><tr class="share"><th scope="row">Baltic gas plants set the price<\/th><td class="n">0\.0 <span class="u">% of the year<\/span>/);
  assert.match(table, /Gain from the lower electricity price<\/th><td class="n">100 <span class="u">M€<\/span><\/td>/);       // 10 €/MWh on 10 TWh
  assert.match(table, /Contract for difference at 90 €\/MWh<\/th><td class="n">−20 <span class="u">M€<\/span><\/td>/);     // 2 TWh at 80, 10 under the strike
  assert.match(table, /<tr class="net"><th scope="row">Consumers' net gain<\/th><td class="n good">\+80 <span class="u">M€<\/span><\/td>/);
  // a set still out says so in its cells, a pair that failed shows its error; the money waits for the demand
  assert.match(one({ gas: [run(100, false, 1)] }), /<tr class="lead"><th scope="row">1 SMR<\/th><td class="n pending">computing…<\/td>/);
  assert.doesNotMatch(one({ gas: [run(100, false, 1)], smr1: [run(90, true, 0)] }), /\d M€/);
  assert.match(sensHtml(null, [{ id: "1", label: sens[0].label, set: null, error: "no solution" }], { gas: "0 SMR" }), /<td class="n error">– <button[^>]*data-tip="no solution"/);
});

test("\"Other\": every profile the year files hold builds against the scenario of 2035 (D-046)", () => {
  const s0 = opening(p);
  const want: Record<string, string[]> = { DE_2040: ["cy1995", "cy2008", "cy2009"], GA_2050: ["cy1995", "cy2008", "cy2009"], NT_2030: ["cy2009"], NT_2040: ["cy2009"], NTplus_2040: ["ws065", "ws071", "ws077"], NTplus_2050: ["ws091", "ws092", "ws106"] };
  for (const k of Object.keys(PROFILE_YEARS) as (keyof typeof PROFILE_YEARS)[]) {
    for (const y of PROFILE_YEARS[k]) {
      const s = withProfile(s0, k, y);
      assert.equal(s.target, 2035);
      assert.equal(otherProfile(s), k === "NT" || y !== 2035, `${k} ${y}`);
      const runs = runsOf(p, s);
      if (want[`${k}_${y}`]) assert.deepEqual(runs.map((r) => r.key), want[`${k}_${y}`]);
      assert.ok(Math.abs(runs.reduce((a, r) => a + r.weight, 0) - 1) < 1e-9, `${k} ${y}: weights`);
      // the Baltic side stays the scenario's: its demand presets, unless National Trends+ 2035 brings its own
      for (const z of ZONES) assert.equal(s.zones[z].demand === "own", k === "NTplus" && y === 2035, `${k} ${y} ${z}`);
      if (k === "REAL") { // the observed prices of that year, the same series in every climate year (D-051),
        // begun at its first Monday as the layout's year is (D-100)
        const obs = year(String(y)).boundary.FI.observed;
        const m = 24 * ((8 - new Date(Date.UTC(y, 0, 1)).getUTCDay()) % 7);
        for (const r of runs) assert.deepEqual(year(r.key).boundary.FI[`REAL_${y}`], [...obs.slice(m), ...obs.slice(0, m)]);
        assert.deepEqual(runs.map((r) => r.key), ["cy1995", "cy2008", "cy2009"]);
      }
      if (k.startsWith("TIGHT")) { // the research's own series of each climate year (D-121)
        assert.deepEqual(runs.map((r) => r.key), ["cy1995", "cy2008", "cy2009"]);
        for (const r of runs) for (const z of ["FI", "SE4", "PL"] as const) assert.equal(year(r.key).boundary[z][`${k}_${y}`].length, 8760, `${k} ${r.key} ${z}`);
        assert.notDeepEqual(year("cy1995").boundary.FI[`${k}_${y}`], year("cy2009").boundary.FI[`${k}_${y}`]);
      }
      const yr = year(runs[0].key);
      const pb = build(yr, p, links(), engineScenario(p, yr, s));
      assert.equal(pb.borders[0].price.length, pb.hours);
      // the text carries the year only when it is not the run's own, and comes back the same
      const text = serialize(s);
      assert.equal(/profile_year/.test(text), y !== 2035, `${k} ${y}`);
      assert.deepEqual(parse(p, text), s, `${k} ${y}: round trip`);
    }
  }
  // back from another year's National Trends+ to the panel's three: the scenario's demand, then NT+ 2035's own
  const back = withProfile(withProfile(s0, "NTplus", 2040), "DE", 2035);
  assert.deepEqual(back, s0);
  // the owner's levels belong to Distributed Energy 2035 alone (D-190): every other profile opens at ×1, a level moved
  // on one moves the other by the same share, and the way back is exact
  for (const [k, y] of [["TIGHT", 2035], ["TIGHTJ", 2035], ["GA", 2035], ["NT", 2040], ["DE", 2040]] as const) {
    assert.deepEqual(withProfile(s0, k, y).level, { FI: 1, SE4: 1, PL: 1 }, `${k} ${y}`);
    assert.deepEqual(withProfile(withProfile(s0, k, y), "DE", 2035).level, s0.level, `${k} ${y} and back`);
  }
  assert.deepEqual(s0.level, presetLevel("DE", 2035));
  const moved = withProfile({ ...s0, level: { ...s0.level, FI: 1.6 } }, "TIGHT", 2035).level;
  assert.ok(Math.abs(moved.FI - 1.6 / 1.8786) < 1e-12 && moved.SE4 === 1 && moved.PL === 1);
  assert.throws(() => withProfile(s0, "NT", 2035), /no neighbours' profile NT 2035/);
  assert.throws(() => parse(p, serialize(s0).replace("profile=DE", "profile=NT")), /has no year 2035/);
  // National Trends+ 2030 is not offered: no offshore wind series in its weather files (D-050)
  assert.throws(() => withProfile(s0, "NTplus", 2030), /no neighbours' profile NTplus 2030/);
  assert.throws(() => parse(p, serialize(withProfile(s0, "NTplus", 2040)).replace("profile_year=2040", "profile_year=2030")), /has no year 2030/);
});

test("with another year's neighbours the Estonian demand is the scenario's, not the weather files'", () => {
  const s = withProfile(opening(p), "NTplus", 2040);
  const yr = year("ws071");
  const load = (st: typeof s) => build(yr, p, links(), engineScenario(p, yr, st)).zones[0].load.reduce((a, x) => a + x, 0) / 1e6;
  const want = (p.demand[S1].EE["2035"] as unknown as { twh: { value: number }; electrolysis_twh?: { value: number } });
  assert.ok(Math.abs(load(s) - (want.twh.value - (want.electrolysis_twh?.value ?? 0))) < 1e-6);
});

test("the rows of a class made of several: in proportion until one is moved, then in the text, and they must make the class (D-059)", () => {
  const p = presets();
  const s = opening(p);
  assert.deepEqual(partsOf(p, s.zones.EE, "EE", "gas_ocgt"), { capacity_mechanism: 15, gas_existing: 263, gas_reserve_procurement: 186, gas_restoration: 900 });
  assert.equal(partsOf(p, s.zones.EE, "EE", "solar"), null);                 // one row
  assert.ok(!serialize(s).includes("EE.part."));                             // nothing moved: the text is as before
  s.zones.EE.mw.gas_ocgt = 682;                                              // half the class: the rows in proportion
  assert.equal(partsOf(p, s.zones.EE, "EE", "gas_ocgt")!.gas_restoration, 450);
  s.zones.EE.parts = { capacity_mechanism: 15, gas_existing: 13, gas_reserve_procurement: 186, gas_restoration: 900 };
  s.zones.EE.mw.gas_ocgt = 1114;
  const text = serialize(s);
  assert.ok(text.includes("EE.part.gas_existing=13"));
  assert.deepEqual(parse(p, text).zones.EE.parts, s.zones.EE.parts);
  assert.throws(() => parse(p, text.replace("EE.part.gas_existing=13", "EE.part.gas_existing=263")), /the rows of gas_ocgt make 1364 MW, not 1114/);
  assert.throws(() => parse(p, text.replace("EE.part.gas_existing=13", "EE.part.nonsense=13")), /no row nonsense/);
});

test("the scenario's gas and CO2 prices: the fuel path's until set, in the text, and what the engine bids on (D-064)", () => {
  const p = presets();
  const s = opening(p);
  assert.ok(Math.abs(s.fuelGas - 38.16) < 0.02 && Math.abs(s.fuelEua - 197.5) < 0.01);   // ERAA 2025's 2035
  const y = year("cy2009");
  assert.equal(engineScenario(p, y, s).gasPrice, s.fuelGas);
  const dear = { ...s, fuelGas: 60, fuelEua: 100 };
  const text = serialize(dear);
  assert.ok(text.includes("price.gas=60\n") && text.includes("price.eua=100\n"));
  assert.deepEqual(parse(p, text), dear);
  // a text from before the two keys opens at its path's prices
  const old = serialize(s).split("\n").filter((l) => !l.startsWith("price.")).join("\n");
  assert.deepEqual(parse(p, old), s);
  const bid = (st: typeof s) => impliedBid(p, engineScenario(p, y, st), "gas_ocgt")!;
  assert.ok(bid({ ...s, fuelGas: s.fuelGas + 10 }) > bid(s) + 10);   // a dearer gas: more than its own rise, by the plant's efficiency
  assert.ok(bid({ ...s, fuelEua: s.fuelEua + 10 }) > bid(s));
});

test("the neighbours' profile is taken as published (D-194): the text no longer names a re-pricing, and an older text that does still reads", () => {
  const p = presets();
  const on = opening(p);
  assert.ok(!serialize(on).includes("neighbours.fuel"));
  assert.deepEqual(parse(p, serialize(on)), on);
  for (const v of ["scenario", "published"]) assert.deepEqual(parse(p, serialize(on).replace("fuel=", `neighbours.fuel=${v}\nfuel=`)), on);
  assert.throws(() => parse(p, serialize(on).replace("fuel=", "neighbours.fuel=dear\nfuel=")), /neighbours\.fuel/);
});

test("a bid moved by hand travels in the text as its offset, a scenario's only, for a thermal class the fleet has; the gas plants' one bid once for the three zones (D-090, D-164)", () => {
  const s = { ...opening(p), bids: { "EE.biomass_chp": -20, "LT.biomass_chp": 12.5, gas: -30 } };
  const text = serialize(s);
  assert.match(text, /^bid\.EE\.biomass_chp=-20$/m);
  assert.match(text, /^bid\.gas=-30$/m);
  assert.deepEqual(parse(p, text).bids, s.bids);
  assert.ok(!/^bid\./m.test(serialize(opening(p))), "no line while no bid is moved");
  const sc = engineScenario(p, year("cy2009"), s);
  assert.equal(sc.bidAdj?.LT?.biomass_chp, 12.5);
  assert.equal(sc.gasAdj, -30);
  // a text written before D-164 moved each zone's gas class: every gas class of the three fleets alike, they
  // move the one bid; apart — or one left out, its box untouched at 0 — the text is refused (ERRATA E-162)
  const old = (lines: string) => parse(p, serialize(opening(p)) + lines);
  const o = opening(p);
  const gasLines = (["EE", "LV", "LT"] as const).flatMap((z) => Object.entries(o.zones[z].mw).filter(([c, x]) => ["gas_ccgt", "gas_conventional", "gas_ocgt", "gas_chp"].includes(c) && x > 0).map(([c]) => `bid.${z}.${c}=-10\n`));
  assert.ok(gasLines.length >= 3, gasLines.join(""));
  assert.deepEqual(old(gasLines.join("")).bids, { gas: -10 });
  assert.throws(() => old(gasLines.slice(1).join("")), /bid one price$/); // one zone's gas left at 0
  assert.throws(() => old("bid.LV.gas_ccgt=20\n"), /bid one price$/); // the live site's link that moved Latvia's alone
  assert.throws(() => old(gasLines.join("").replace("=-10", "=5")), /bid one price$/);
  assert.throws(() => old("bid.gas=5\n" + gasLines.join("")), /bid one price$/); // the one bid and old keys that disagree
  assert.deepEqual(old("bid.gas=-10\n" + gasLines.join("")).bids, { gas: -10 });
  const bad = (line: string, why: RegExp) => assert.throws(() => parse(p, serialize(opening(p)) + line + "\n"), why);
  const notMovable = /is not a bid EE's fleet lets a scenario move/;
  bad("bid.EE.nuclear=-5", notMovable);     // the plant runs as must-run: no bid to move
  bad("bid.EE.waste=10", notMovable);       // waste runs whatever the price
  bad("bid.EE.wind_onshore=10", notMovable); // not thermal
  bad("bid.EE.gas_ccgt=10", notMovable);    // not in Estonia's fleet
  bad("bid.EE.biomass_chp=-5000", /-5000 below -1000/); // out of the schema's range
  bad("bid.gas=-5000", /-5000 below -1000/);
  assert.throws(() => parse(p, serialize(replayState(p, 2024)) + "bid.gas=10\n"), /not a key of a replay/);
});

test("the panel caps a number at the text's maximum, so that the share link it writes loads (R-APP-10)", () => {
  assert.equal(maximumOf("EE.firm_mw"), 5000);
  assert.equal(maximumOf("LT.mw.wind_onshore"), 20000);
  assert.equal(maximumOf("LV.battery_mwh"), 100000);
  assert.equal(maximumOf("FI.level"), 3); // the owner's Poland is ×2.10 on its profile as published (D-194)
  assert.equal(maximumOf("no.such.key"), Infinity);
  const s = structuredClone(opening(p));
  s.zones.EE.firmMw = maximumOf("EE.firm_mw");
  s.zones.LT.mw.wind_onshore = maximumOf("LT.mw.wind_onshore");
  s.zones.LV.batteryMwh = maximumOf("LV.battery_mwh");
  assert.deepEqual(parse(p, serialize(s)), s);
  s.zones.EE.firmMw += 1;
  assert.throws(() => parse(p, serialize(s)), /EE\.firm_mw: 5001 above 5000/);
});

test("a set's job key leaves out what leaves the engine's input as it is: the clause without the plant, a gas floor under the gas, the strike (D-134)", () => {
  const y = year("cy2009");
  const s = opening(p);
  const gas: State = { ...s, scenario: "gas" }, smr2: State = { ...s, scenario: "smr2" };
  const on = (x: State): State => ({ ...x, smr: { ...x.smr, clause: true } });
  const pb = (x: State, floor: number | null) => build(y, p, links(), scenarioOf(p, y, x, floor, null));
  assert.equal(jobKey(on(gas), null, null), jobKey(gas, null, null));
  assert.deepStrictEqual(pb(on(gas), null), pb(gas, null));
  assert.notEqual(jobKey(on(smr2), null, null), jobKey(smr2, null, null));
  const under = s.fuelGas - 1, over = s.fuelGas + 1;
  assert.equal(jobKey(smr2, under, null), jobKey(smr2, null, null));
  assert.deepStrictEqual(pb(smr2, under), pb(smr2, null));
  assert.equal(neighbourGasCost(p, scenarioOf(p, y, smr2, under, null)), neighbourGasCost(p, scenarioOf(p, y, smr2, null, null)));
  assert.notEqual(jobKey(smr2, over, null), jobKey(smr2, null, null));
  assert.equal(jobKey({ ...smr2, smr: { ...smr2.smr, strike: 120 } }, null, null), jobKey(smr2, null, null));
});
