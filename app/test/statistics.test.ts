// The Statistics page (R-APP-14, D-087): ten years of gas and CO₂ prices with a least-squares and a
// Theil–Sen line to 2040; the six countries' net additions of wind and solar with their trend, and
// the installed capacity of 2035 and 2040 by the trend and by the pace of 2021–2025.
import assert from "node:assert/strict";
import { test } from "node:test";
import { presets } from "../scripts/data.ts";
import type { Statistics } from "../src/ui/statistics.ts";
import { DC_FACTS, IND_FACTS, PACE_YEARS, additions, at, byPace, byTrend, mid, ols, setKey, statisticsHtml, theilSen } from "../src/ui/statistics.ts";
import { fmt, signed } from "../src/ui/labels.ts";
import { OPENING_EE_MW, S1, opening } from "../src/state/model.ts";

const p = presets();
const st = (p as unknown as { statistics: Statistics }).statistics;

test("the two lines: least squares through every point, Theil–Sen past an outlier", () => {
  const x = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const y = x.map((v) => 3 + 2 * v);
  const l = ols(x, y);
  assert.ok(Math.abs(l.slope - 2) < 1e-12 && Math.abs(l.intercept - 3) < 1e-12 && Math.abs((l.r2 ?? 0) - 1) < 1e-12);
  const spike = [...y]; spike[6] = 200;                 // a 2022 in the middle of the decade
  const t = theilSen(x, spike), q = ols(x, spike);
  assert.ok(Math.abs(t.slope - 2) < 1e-12 && Math.abs(at(t, 9) - 21) < 1e-12, "Theil–Sen ignores the spike");
  assert.ok(q.slope > 2.5, "least squares is pulled by it");
  assert.equal(mid("2016-09"), 2016 + 8.5 / 12);
});

test("the capacity readings: net additions, the trend floored at zero, the constant pace", () => {
  assert.deepEqual(additions([100, 110, 105, 130]), [10, -5, 25]);
  const falling = { slope: -10, intercept: 20_300, r2: null };          // 50 in 2025, 0 from 2030
  assert.equal(byTrend(1000, 2025, falling, 2035), 1000 + 40 + 30 + 20 + 10 + 0 * 6);
  assert.equal(byPace(1000, 2025, 78, 2035), 1780);
});

test("the export holds ten years of gas, CO₂ from 2017 and eleven year-ends of six countries' wind and solar", () => {
  assert.equal(st.gas.months.length, 120);
  assert.equal(st.gas.months.at(-1), st.window.last);
  assert.equal(st.gas.months[0], st.window.first);
  assert.equal(st.eua.months[0], "2017-01");
  assert.equal(st.eua.months.at(-1), st.window.last);
  assert.ok(st.gas.src.some((s) => s.startsWith("worldbank.")) && st.gas.src.some((s) => s.startsWith("ecb.")));
  assert.ok(st.eua.src.every((s) => s.startsWith("eex.")));
  assert.deepEqual([st.capacity.years[0], st.capacity.years.at(-1)], [2015, 2025]);
  for (const c of ["EE", "LV", "LT", "FI", "SE", "PL"]) for (const t of ["wind_onshore", "wind_offshore", "solar"]) {
    assert.equal(st.capacity.countries[c][t].values.length, 11, `${c} ${t}`);
    assert.ok(st.capacity.countries[c][t].src[0].startsWith("irena."), `${c} ${t}: lineage`);
  }
});

test("Estonia's onshore wind at the pace of 2021–2025: the end of 2025 plus ten years of the average addition", () => {
  const cap = st.capacity.countries.EE.wind_onshore.values;
  const adds = additions(cap);
  const pace = adds.slice(-PACE_YEARS).reduce((a, b) => a + b, 0) / PACE_YEARS;
  assert.ok(Math.abs(pace - (cap[10] - cap[5]) / 5) < 1e-9, "the pace is the five years' growth over five");
  assert.ok(Math.abs(byPace(cap[10], 2025, pace, 2035) - (cap[10] + 2 * (cap[10] - cap[5]))) < 1e-9);
});

test("the export holds ten years of the six zones' day-ahead prices and SE4's wind by bidding area (D-092, D-093)", () => {
  for (const z of ["EE", "LV", "LT", "FI", "SE4", "PL"]) {
    const s = st.prices![z];
    assert.equal(s.months.at(-1), st.window.last, z);
    // ENTSO-E's Polish prices before 2020 are in złoty (E-074): Poland's series starts later
    if (z === "PL") assert.ok(s.months.length >= 60 && s.months.length < 120 && s.months.includes("2020-01"), `${z} ${s.months.length}`);
    else assert.deepEqual([s.months.length, s.months[0]], [120, st.window.first], z);
    assert.ok(s.src.every((x) => x.startsWith("entsoe.A44.")), z);
  }
  const se4 = st.capacity.areas!.SE4.wind, se = st.capacity.areas!.SE.wind;
  assert.equal(se4.values.length, 11);
  assert.ok(se.values.every((v, i) => v > se4.values[i]), "the national sum holds SE4");
  assert.ok(se4.src[0].startsWith("energimyndigheten."));
});

test("the page draws the fuels' two figures, six zones' prices, each technology's capacity and additions by country and SE4's, and names its sources; offshore wind, which none built, its sentence above its empty figures (D-197, D-219)", () => {
  const html = statisticsHtml(p);
  assert.equal((html.match(/<svg class="ip-fig st-fig"/g) ?? []).length, 2);
  // the zones' prices; each country's additions and installed capacity of the three technologies, each on its tab, and
  // SE4's additions (D-214, D-217, D-219)
  assert.equal((html.match(/<svg class="ip-fig st-fig st-small"/g) ?? []).length, 6 + 18 + 18 + 1);
  assert.ok(html.includes("Offshore wind: none of the six countries added any in 2016–2025"));
  for (const s of ["Day-ahead prices: the six zones", "SE4's wind", "Energimyndigheten", "Elering, the TSO, gives 1 210 MW", "TYNDP 2024 DE, 2035"]) assert.ok(html.includes(s), s);
  assert.ok(html.includes("data-goto=\"doc.pv_magazine_2026_03_04_estonia.article-first-paragraph\""), "the 105 MW added in 2025 links its source (E-086)");
  for (const s of ["least squares", "Theil–Sen", "© IRENA 2026", "ERAA 2025", "TYNDP 2024", "Svenska kraftnät", "data-goto=\"irena.", "Sweden is the whole country"]) {
    assert.ok(html.includes(s), s);
  }
});

test("the page in eight tabs, Gas shown first, each part under its own (D-213, D-214, D-217)", () => {
  const html = statisticsHtml(p);
  const tabs = [...html.matchAll(/<button type="button" class="seg" data-stat="(\w+)" aria-pressed="(\w+)">([^<]*)</g)].map((m) => m.slice(1).join(" "));
  assert.deepEqual(tabs, ["gas true Gas", "eua false CO₂", "onshore false Onshore wind", "offshore false Offshore wind", "solar false Solar", "datacentres false Data centres", "industry false Industry", "prices false Prices"]);
  // a pane runs to the next one's start: the last holds the page's closing note too
  const panes = Object.fromEntries(html.split('<div class="st-pane" ').slice(1).map((s) => [s.match(/^data-pane="(\w+)"/)![1], s]));
  assert.deepEqual(Object.keys(panes), ["gas", "eua", "onshore", "offshore", "solar", "datacentres", "industry", "prices"]);
  for (const [k, s] of Object.entries(panes)) assert.ok(s.startsWith(`data-pane="${k}"${k === "gas" ? "" : " hidden"}>`), k);
  const has: Record<string, string[]> = {
    gas: ["Gas: the TTF price", "World Bank"], eua: ["CO₂: the EU ETS allowance price", "primary auctions of EU allowances"],
    onshore: ["Onshore wind: what was built, 2016–2025", "Onshore wind: installed capacity at the year's end and net additions a year", "SE4's wind"],
    offshore: ["Offshore wind: what was built, 2016–2025", "Offshore wind: installed capacity at the year's end and net additions a year", "Offshore wind: none of the six"],
    solar: ["Solar: what was built, 2016–2025", "Solar photovoltaic: installed capacity at the year's end and net additions a year", "Elering, the TSO"],
    datacentres: ["Data centres: what they consume", "connection requests to Elering"], industry: ["New industrial loads:", "capacity reserved for hydrogen production"],
    prices: ["Day-ahead prices: the six zones", "€/MWh over the last twelve months"],
  };
  for (const [k, ss] of Object.entries(has)) {
    for (const s of ss) assert.ok(panes[k].includes(s), `${s} under ${k}`);
    for (const [o, os] of Object.entries(has)) if (o !== k) for (const s of os) assert.ok(!panes[k].includes(s), `${s} not under ${k}`);
  }
});

test("each country's installed capacity at the year's end, a technology to a tab, the two readings to 2040, the model's figures (D-214, D-217)", () => {
  const html = statisticsHtml(p);
  const pane = (k: string) => html.split(`<div class="st-pane" data-pane="${k}"`)[1].split('<div class="st-pane"')[0];
  // each technology's beside its additions, a pair to a country (D-218, D-219)
  const heads: [string, string, number][] = [["onshore", "Onshore wind: installed capacity at the year's end and net additions a year, MW", 12], ["offshore", "Offshore wind: installed capacity at the year's end and net additions a year, MW", 12], ["solar", "Solar photovoltaic: installed capacity at the year's end and net additions a year, MW", 12]];
  for (const [k, head, n] of heads) assert.equal((pane(k).split(head)[1].split("<h3>")[0].match(/<figure class="st-cell">/g) ?? []).length, n, k);
  // Estonia's onshore wind read on from the end of 2025
  const c = st.capacity, years = c.years.slice(1), cap = c.countries.EE.wind_onshore.values, adds = additions(cap);
  const l = ols(years, adds), pace = adds.slice(-PACE_YEARS).reduce((a, b) => a + b, 0) / PACE_YEARS;
  const ee = pane("onshore").split(heads[0][1])[1].split("</figure>")[0];
  assert.ok(ee.includes(`${fmt(cap[10], 0)} MW at the end of 2025`));
  for (const y of [2035, 2040]) {
    const a = byTrend(cap[10], 2025, l, y), b = byPace(cap[10], 2025, pace, y);
    assert.ok(ee.includes(`>${fmt(a, 0)}</text>`) && ee.includes(`>${fmt(b, 0)}</text>`), `${y}: trend ${a}, pace ${b}`);
  }
  assert.equal((ee.match(/class="assume"/g) ?? []).length, 2, "the model's 2035 and 2040");
});

test("the model's 2035 is the scenario view's: Estonia's onshore wind and solar the owner's, S1's own in the note (D-182, E-182)", () => {
  const html = statisticsHtml(p), s1 = p.fleets[S1].EE["2035"].classes, lv = p.fleets[opening(p).zones.LV.fleet].LV["2035"].classes;
  const part = (head: string) => html.split(head)[1].split("<h3>")[0];
  // a country's cells of a technology's table; the column "the model, 2035" is the last but one
  const row = (head: string, name: string) => [...part(head).split(`${name}</td>`)[1].split("</tr>")[0].matchAll(/<td class="n">([^<]*)<\/td>/g)].map((m) => m[1]);
  for (const [tech, head] of [["wind_onshore", "Onshore wind: installed capacity at the year's end and net additions a year, MW"], ["solar", "Solar photovoltaic: installed capacity at the year's end and net additions a year, MW"]] as const) {
    assert.equal(row(head, "Estonia").at(-2), fmt(OPENING_EE_MW[tech], 0), tech);
    assert.notEqual(s1[tech].mw, OPENING_EE_MW[tech], `${tech}: S1's own differs`);
    assert.ok(part(head).includes(`Estonia, 2035: the owner's value for the opening (in place of Elering and TalTech's S1: ${fmt(s1[tech].mw, 0)} MW). Sources of the model's columns:`), `${tech}: the note`);
    assert.equal(row(head, "Latvia").at(-2), fmt(lv[tech].mw, 0), `${tech}: Latvia's is the fleet's own`);
  }
  assert.ok(!part("Offshore wind: installed capacity at the year's end and net additions a year, MW").includes("the owner's value"), "offshore wind is S1's own");
  // the diamonds carry the same figures: Estonia's solar, the first of the six figures
  const solar = part("Solar photovoltaic: installed capacity at the year's end and net additions a year, MW").split("</figure>")[0];
  assert.ok(solar.includes(`data-tip="Estonia, 2035: ${fmt(OPENING_EE_MW.solar, 0)} MW — `));
});

test("every diamond's tip names its scenario: the Model view's fleets, TYNDP's, the fuel paths (D-215)", () => {
  const html = statisticsHtml(p), s1 = p.fleets[S1].EE["2035"].classes;
  const un = (s: string) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  // a diamond is a path with its tip, which the page's box shows on hover (E-181), and no title of its own
  const diamonds = (s: string) => [...s.matchAll(/<path class="assume" d="[^"]*" data-tip="([^"]+)"\/>/g)].map((m) => un(m[1]));
  assert.equal(diamonds(html).length, (html.match(/<path class="assume"/g) ?? []).length);
  const tips = (head: string) => diamonds(html.split(head)[1].split("<h3>")[0]);
  // the six countries' figures in order, two diamonds each, Sweden's none
  const wind = tips("Onshore wind: installed capacity at the year's end and net additions a year, MW"), sea = tips("Offshore wind: installed capacity at the year's end and net additions a year, MW");
  const solar = tips("Solar photovoltaic: installed capacity at the year's end and net additions a year, MW"), s1w = p.fleets[S1].EE["2035"].classes.wind_onshore;
  assert.deepEqual([wind.length, sea.length, solar.length], [10, 10, 10]);
  assert.equal(wind[0], `Estonia, 2035: ${fmt(OPENING_EE_MW.wind_onshore, 0)} MW — the Model view's scenarios: Elering and TalTech's S1, the owner's value for the opening in place of S1's ${fmt(s1w.mw, 0)} MW`);
  assert.equal(solar[0], `Estonia, 2035: ${fmt(OPENING_EE_MW.solar, 0)} MW — the Model view's scenarios: Elering and TalTech's S1, the owner's value for the opening in place of S1's ${fmt(s1.solar.mw, 0)} MW`);
  assert.equal(solar[1], `Estonia, 2040: ${fmt(p.fleets.pemmdb_nt_2040.EE["2040"].classes.solar.mw, 0)} MW — TYNDP 2024 National Trends`);
  assert.ok(solar[2].startsWith("Latvia, 2035: ") && solar[2].endsWith(" — the Model view's scenarios: ERAA 2025"), solar[2]);
  for (const s of [...wind.slice(6), ...sea.slice(6), ...solar.slice(6)]) assert.match(s, /^(Finland|Poland), 20[34][05]: .* — TYNDP 2024 Distributed Energy, whose prices the model's neighbours take$/);
  // the fuels' diamonds name their path; the neighbours' prices TYNDP's scenario, 2035's as the Model view's profile
  for (const head of ["Gas: the TTF price, €/MWh of gas", "CO₂: the EU ETS allowance price, €/t"]) {
    for (const s of tips(head)) assert.match(s, /^(ERAA 2025 \(the scenario's prices\)|TYNDP 2024 \(its market model's\)|Svenska kraftnät, LMA 2026), 20\d\d: [\d.]+ €\/(MWh|t)$/);
  }
  const zones = tips("Day-ahead prices: the six zones, €/MWh");
  assert.equal(zones.length, 6);
  for (const s of zones) assert.match(s, /^TYNDP 2024 Distributed Energy, 20(35: .* — the neighbours' profile the Model view takes, before its price levels|40: .*, the average price its market model published)$/);
});

test("the red dots: what the panel sets now, for what it sets, the page drawn again as it changes, on its tab (D-216)", () => {
  const s = opening(p), un = (x: string) => x.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const dots = (html: string, head: string) => [...html.split(head)[1].split("<h3>")[0].matchAll(/<circle class="set" cx="[^"]*" cy="([^"]*)" r="3.5" data-tip="([^"]+)"\/>/g)].map((m) => ({ cy: Number(m[1]), tip: un(m[2]) }));
  const WIND = "Onshore wind: installed capacity at the year's end and net additions a year, MW";
  // none without the panel's state, none on a validation run
  assert.equal((statisticsHtml(p).match(/class="set"/g) ?? []).length, 0);
  assert.equal((statisticsHtml(p, undefined, { ...s, run: "replay" as const }).match(/class="set"/g) ?? []).length, 0);
  const html = statisticsHtml(p, undefined, s), ee = s.zones.EE.mw;
  // the installed capacity of the three zones the model runs, at the state's megawatts
  const wind = dots(html, WIND);
  assert.deepEqual(wind.map((d) => d.tip.split(",")[0]), ["Estonia", "Latvia", "Lithuania"]);
  assert.equal(wind[0].tip, `Estonia, 2035: ${fmt(ee.wind_onshore, 0)} MW — set in the model now`);
  assert.equal(dots(html, "Solar photovoltaic: installed capacity at the year's end and net additions a year, MW")[0].tip, `Estonia, 2035: ${fmt(ee.solar, 0)} MW — set in the model now`);
  // the fuels at the scenario's prices
  assert.deepEqual(dots(html, "Gas: the TTF price, €/MWh of gas").map((d) => d.tip), [`set in the model now, 2035: ${fmt(s.fuelGas, 1)} €/MWh`]);
  assert.deepEqual(dots(html, "CO₂: the EU ETS allowance price, €/t").map((d) => d.tip), [`set in the model now, 2035: ${fmt(s.fuelEua, 1)} €/t`]);
  // the neighbours at their profile's average, as the panel's list gives it, times their level
  const mp = (p.boundary as unknown as { mean_price: { scenario: string; target_year: number; zone: string; value: number }[] }).mean_price;
  const avg = (z: "FI" | "SE4" | "PL") => mp.find((r) => r.scenario === s.profile && r.target_year === s.profileYear && r.zone === z)!.value * s.level[z];
  assert.deepEqual(dots(html, "Day-ahead prices: the six zones, €/MWh").map((d) => d.tip.split(" — ")[0]),
    [`Finland, 2035: ${fmt(avg("FI"), 1)} €/MWh`, `Sweden's SE4, 2035: ${fmt(avg("SE4"), 1)} €/MWh`, `Poland, 2035: ${fmt(avg("PL"), 1)} €/MWh`]);
  // a value moved in the panel moves its dot up its chart and changes the key the page is drawn again on; a value the
  // dots do not read leaves the key
  const more = { ...s, zones: { ...s.zones, EE: { ...s.zones.EE, mw: { ...ee, wind_onshore: 2400 } } } };
  const w2 = dots(statisticsHtml(p, undefined, more), WIND)[0];
  assert.ok(w2.tip.startsWith(`Estonia, 2035: ${fmt(2400, 0)} MW — `) && w2.cy < wind[0].cy, w2.tip);
  assert.notEqual(setKey(more), setKey(s));
  assert.equal(setKey({ ...s, zones: { ...s.zones, EE: { ...s.zones.EE, firmMw: 100 } } }), setKey(s));
  // the tab a redraw keeps
  const solar = statisticsHtml(p, undefined, s, "solar");
  assert.ok(solar.includes('data-stat="solar" aria-pressed="true"') && solar.includes('<div class="st-pane" data-pane="solar">') && solar.includes('<div class="st-pane" data-pane="gas" hidden>'));
});

test("each technology's installed capacity and net additions side by side, a country to a row, offshore's empty ones too (D-218, D-219)", () => {
  const html = statisticsHtml(p), c = st.capacity;
  for (const [tech, head] of [["wind_onshore", "Onshore wind: installed capacity at the year's end and net additions a year, MW"], ["wind_offshore", "Offshore wind: installed capacity at the year's end and net additions a year, MW"], ["solar", "Solar photovoltaic: installed capacity at the year's end and net additions a year, MW"]]) {
    const part = html.split(head)[1].split("<h3>")[0], grid = part.split('<div class="st-grid st-pairs">')[1].split("</div>")[0];
    const figs = [...grid.matchAll(/<figure class="st-cell"><figcaption><span class="fl fl-(\w+)"[^>]*><\/span>([^<]+)<\/figcaption><svg class="ip-fig st-fig st-small"[^>]*aria-label="([^"]+)"/g)].map((m) => [m[1], m[2], m[3]]);
    assert.equal(figs.length, 12, tech);
    for (const [i, k] of ["EE", "LV", "LT", "FI", "SE", "PL"].entries()) {
      const [cap, add] = [figs[2 * i], figs[2 * i + 1]], v = c.countries[k][tech].values, adds = additions(v);
      assert.equal(cap[0], k === "SE" ? "SE4" : k, `${tech} ${k}`);
      assert.ok(cap[2].startsWith("installed capacity at the year's end") && cap[1].endsWith(`${fmt(v[10], 0)} MW at the end of 2025`), cap.join(" | "));
      // the additions captioned with the pace, the capacity's dotted line
      const pace = adds.slice(-PACE_YEARS).reduce((a, b) => a + b, 0) / PACE_YEARS;
      assert.ok(add[2].startsWith("net additions a year") && add[1].endsWith(`${signed(pace, 0)} MW a year on average in 2021–2025`), add.join(" | "));
    }
    assert.ok(part.includes('<i class="k-bar"></i>net additions'), `${tech}: the key names the bars`);
    // offshore wind, which none built: its sentence above its empty figures (D-197)
    assert.equal(part.split('<div class="st-grid st-pairs">')[0].includes("Offshore wind: none of the six countries added any"), tech === "wind_offshore", tech);
  }
  // a capacity figure with a tick of six digits has the wider margin, its labels at 52 in place of 42 (D-219)
  const solar = html.split('<div class="st-grid st-pairs">')[3].split("</div>")[0].split("</figure>");
  assert.ok(solar[10].includes('<text class="tick" x="52"') && !solar[10].includes('<text class="tick" x="42"'), "Poland's solar, up to 200 000 MW");
  assert.ok(solar[0].includes('<text class="tick" x="42"'), "Estonia's solar, under 10 000 MW");
});

test("the data centres' and the new industrial loads' figures: every one in the export, each country's under its name with its source (D-214)", () => {
  const html = statisticsHtml(p), par = p.parameters as unknown as Record<string, { value: number; unit: string; src: string[] }>;
  const pane = (k: string) => html.split(`<div class="st-pane" data-pane="${k}"`)[1].split('<div class="st-pane"')[0];
  for (const [k, facts] of [["datacentres", DC_FACTS], ["industry", IND_FACTS]] as const) {
    assert.deepEqual(facts.filter((f) => !par[f.key]).map((f) => f.key), [], `${k}: a figure the export lacks would leave its row out`);
    const body = pane(k);
    // every country a heading row, then one row per figure, each with its value, unit and a link to its source's row
    assert.deepEqual([...body.matchAll(/<tr class="wx-zone"><td colspan="4">.*?<\/span>([^<]+)<\/td>/g)].map((m) => m[1]), ["Estonia", "Latvia", "Lithuania", "Finland", "Sweden", "Poland"], k);
    const rows = [...body.matchAll(/<tr><td>[^<]*<\/td><td class="n">([^<]*)<\/td><td class="n">[^<]*<\/td><td>(.*?)<\/td><\/tr>/g)];
    assert.equal(rows.length, facts.length, k);
    for (const [i, f] of facts.entries()) {
      const v = par[f.key];
      assert.equal(rows[i][1], `${fmt(v.value, f.digits ?? 0)} ${v.unit}`, f.key);
      assert.ok(rows[i][2].includes(`data-goto="${v.src[0]}"`), `${f.key}: its source`);
    }
  }
  assert.equal(par["statistics.dc.pl.conditions_mw"].value, 9185);
  assert.equal(par["statistics.ind.lv.h2_reserved_mw"].unit, "MW");
});
