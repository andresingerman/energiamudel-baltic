// The Weather page (R-APP-13, D-084): the three climate years, their weights, ranks and figures
// drawn from presets.json `climate_years`, with their lineage ids on the page.
import assert from "node:assert/strict";
import { test } from "node:test";
import { presets } from "../scripts/data.ts";
import type { ClimateYears } from "../src/ui/weather.ts";
import { bars, picks, rankOf, weatherHtml } from "../src/ui/weather.ts";

const p = presets();
const c = (p as unknown as { climate_years: ClimateYears }).climate_years;

test("the export holds every PECD climate year for the three zones, and the three selected years with their weights", () => {
  assert.equal(c.years.length, 38);
  assert.deepEqual([c.years[0], c.years.at(-1)], [1982, 2019]);
  assert.deepEqual(Object.keys(c.selected).sort(), ["1995", "2008", "2009"]);
  const w = Object.values(c.selected).reduce((a, v) => a + v.value, 0);
  assert.ok(Math.abs(w - 1) < 1e-9, `weights sum to ${w}`);
  for (const z of ["EE", "LV", "LT"]) {
    for (const k of ["wind_onshore_cf", "wind_offshore_cf", "solar_cf", "demand_peak_mw", "demand_twh"]) {
      assert.equal(c.zones[z][k].values.length, 38, `${z} ${k}`);
      assert.ok(c.zones[z][k].src.length > 0, `${z} ${k}: no lineage`);
    }
  }
  assert.equal(c.zones.LV["hydro_inflow_twh.daugava"].values.filter((v) => v === null).length, 2); // 2018 and 2019 have no inflow
  assert.equal(c.dunkelflaute_rank_2030["2012"].value, 1);
});

test("the ranks are R-TIME-4's: 2009 Estonia's calmest wind year of 38, 1995 and 2008 the windiest but one", () => {
  const wind = c.zones.EE.wind_onshore_cf.values;
  const at = (y: number) => c.years.indexOf(y);
  assert.equal(rankOf(wind, at(2009)), 1);
  assert.equal(rankOf(wind, at(1995)), 36);
  assert.equal(rankOf(wind, at(2008)), 37);
  assert.equal(rankOf(c.zones.EE.solar_cf.values, at(2008)), 2);
  assert.equal(rankOf([1, null, 3, 2], 2), 3);
  assert.equal(rankOf([1, null, 3, 2], 1), null);
});

test("the note's reading of the ranks holds in every zone: onshore wind at the edges, the demand peak in the lower half (E-128, E-132)", () => {
  const at = (y: number) => c.years.indexOf(y);
  for (const z of ["EE", "LV", "LT"]) {
    const r = (k: string, y: number) => c.zones[z][k].ranks![at(y)]!;
    assert.ok(r("wind_onshore_cf", 2009) <= 3 && r("wind_onshore_cf", 1995) >= 33 && r("wind_onshore_cf", 2008) >= 33, `${z} onshore wind`);
    assert.ok(r("wind_offshore_cf", 2009) <= 11 && r("wind_offshore_cf", 2008) >= 33, `${z} offshore wind, mostly with it`);
    for (const y of [1995, 2008, 2009]) assert.ok(r("demand_peak_mw", y) <= 19, `${z} ${y} demand peak`);
  }
  for (const z of ["EE", "LV"]) assert.ok(c.zones[z].solar_cf.ranks![at(2008)]! <= 5, `${z} 2008 solar`);
  const html = weatherHtml(p);
  assert.ok(html.includes("all three years sit in the lower half for the demand peak, and 2008 is among the dullest for solar"));
  assert.match(html, /Demand peak, MW, at 2009(&#39;|')s annual energy/);
});

test("the page names the method, the three years with their weights, and every figure's lineage", () => {
  const html = weatherHtml(p);
  for (const s of ["1995", "2008", "2009", "0.233", "0.367", "0.4", "K-Medoids", "Dunkelflaute", "data-goto=\"tyndp2024.PECD\"", "Implementation Guidelines, p. 12", "(1/38)", "(37/38)"]) {
    assert.ok(html.includes(s), s);
  }
  assert.equal((html.match(/<svg class="ip-fig wx-fig"/g) ?? []).length, 4 * 3 + 2); // four figures per zone, the hydro ones where the zone has inflow
  const fig = bars(c.years, c.zones.EE.wind_onshore_cf, 3);
  // the picked years a colour each, their figures and ranks in a line above the chart, not on the bars (D-197)
  for (const y of ["1995", "2008", "2009"]) assert.equal((fig.match(new RegExp(`class="bar sel y${y}"`, "g")) ?? []).length, 1, y);
  assert.doesNotMatch(fig, /class="lab"/);
  const line = picks(c.years, c.zones.EE.wind_onshore_cf, 3);
  assert.equal((line.match(/<li>/g) ?? []).length, 3);
  assert.ok(line.includes("rank 1 of 38"), "2009 the calmest of the 38");
  assert.equal((fig.match(/class="bar"/g) ?? []).length, 35);
});

test("the table ranks a series out of the years that have a figure: the Daugava's inflow out of 36 (E-077)", async () => {
  const html = weatherHtml(p);
  assert.ok(html.includes('1.37 <span class="wx-rank">(24/36)</span>'), "Daugava 1995");
  assert.ok(!/inflow[^<]*<\/td><td class="n">[^<]*<span class="wx-rank">\(\d+\/38\)/.test(html));
  const { icon } = await import("../src/ui/icons.ts");
  assert.notEqual(icon("retort_gas", 30), "", "retort gas has its icon (E-078)");
});


test("the table's ranks are the export's, from unrounded values: Estonia's solar 1995 is 16th of 38, not tied 13th", () => {
  const html = weatherHtml(p);
  assert.ok(html.includes('0.111 <span class="wx-rank">(16/38)</span>'), "EE solar 1995");
  assert.match(html, /demand peak, MW, at 2009's annual energy/);
});
