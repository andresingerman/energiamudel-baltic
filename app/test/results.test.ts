// The results' HTML (R-APP-1, R-APP-2; D-036, D-097): each card figure with its unit, the scenarios'
// table with a column pair per scenario, the charts' canvases of a replay and of a scenario.
import assert from "node:assert/strict";
import { test } from "node:test";
import { presets, validation, year } from "../scripts/data.ts";
import { loadSolver } from "../scripts/highs.ts";
import { build, observedClasses } from "../src/engine/build.ts";
import { runLP } from "../src/engine/lp.ts";
import { ZONES } from "../src/engine/problem.ts";
import { replay } from "../src/state/scenario.ts";
import { actualOf } from "../src/ui/actual.ts";
import type { YearResult } from "../src/ui/results.ts";
import { cardsHtml, chartsHtml, trioHtml, weightedMedian } from "../src/ui/results.ts";
import { annuity, capexHtml, capexOf, lifeCost } from "../src/ui/presentation.ts";
import { opening } from "../src/state/model.ts";
import { view } from "../src/worker/view.ts";

const { solve } = await loadSolver();
const p = presets();
const y = year("2024");
const pb = build(y, p, null, replay(p, y));
const v = view(pb, runLP(pb, solve), ZONES.map((z) => observedClasses(p, z, y.zones[z].capacity ?? {})), null, 90);
const r: YearResult = { key: "2024", label: "2024", weight: 1, view: v, labels: null, inputs: {} as YearResult["inputs"] };

test("a card's figures carry their units; a figure the actual year lacks is a dash without one", () => {
  const html = cardsHtml([r], actualOf(validation("2024"), "2024 actual"), null);
  assert.equal(html.match(/<div class="card">/g)?.length, 3);
  assert.match(html, /<td class="n">[\d.]+ <span class="u">€\/MWh<\/span><\/td>/);
  assert.match(html, /<td class="n obs">–<\/td>/); // CO₂ has no actual figure
  assert.doesNotMatch(html, /–\s*<span class="u">/);
  assert.doesNotMatch(html, />-\d/); // a negative figure carries the minus sign (E-093)
});

test("the scenarios' table: a figure and its difference per scenario, the first scenario's difference blank", () => {
  const html = trioHtml({ gas: [r], smr1: [r], smr2: [r], smr3: [r] }, { gas: "0 SMR", smr1: "1 SMR", smr2: "2 SMR", smr3: "3 SMR" }, "smr2");
  assert.equal(html.match(/data-scenario="/g)?.length, 4);
  assert.match(html, /data-scenario="smr2" aria-pressed="true"/);
  const row = html.split(/<tr[^>]*>/).find((x) => x.includes("EE net import"))!;
  assert.equal(row.match(/<td class="n/g)?.length, 8);
  // the weather years' table's weighted column in bold, its heading and each scenario's figure (D-212)
  const byYear = html.split('<table class="by-year">')[1];
  assert.match(byYear, /<th class="n w">weighted<\/th>/);
  assert.equal(byYear.match(/<td class="n w">[\d.]+ <span class="u">€\/MWh<\/span><\/td>/g)?.length, 4);
  // Estonia's rows in bold (D-199): its price, net import, fossil hours and gas hours, not Latvia's or the sums
  assert.equal(html.match(/<tr class="ee">/g)?.length, 4);
  assert.match(html, /<tr class="ee"><td>EE net import/);
  assert.match(html, /<tr><td>CO₂, EE\+LV\+LT/);
  assert.match(row, /<td class="n d"><\/td>/); // 0 SMR against itself
  assert.doesNotMatch(html, />-\d/);
  // the unit in every cell, and once in the label for the compact form (theme.css, the audit's F2)
  assert.match(row, /^<td>EE net import<span class="ru">, TWh<\/span><\/td>/);
});

test("the scenarios' table while the others compute: their cells say so, the differences wait for 0 SMR (D-127)", () => {
  const names = { gas: "0 SMR", smr1: "1 SMR", smr2: "2 SMR", smr3: "3 SMR" };
  const shown = trioHtml({ smr2: [r] }, names, "smr2");
  assert.equal(shown.match(/data-scenario="/g)?.length, 4); // every scenario's button, computed or not
  const row = shown.split(/<tr[^>]*>/).find((x) => x.includes("EE net import"))!;
  assert.equal(row.match(/computing…/g)?.length, 3);
  assert.doesNotMatch(row, /<td class="n d[^"]*">[^<]|class="dchip"/); // no difference without 0 SMR
  assert.equal(shown.split('<table class="by-year">')[1].match(/computing…/g)?.length, 3);
  const withGas = trioHtml({ smr2: [r], gas: [r] }, names, "smr2");
  const row2 = withGas.split(/<tr[^>]*>/).find((x) => x.includes("EE net import"))!;
  assert.equal(row2.match(/computing…/g)?.length, 2);
  assert.match(row2, /<td class="n d sel"><span class="dchip">0\.00<\/span><\/td>/); // 2 SMR against 0 SMR, a chip without the unit (D-205)
});

test("a replay's mix is one bar chart beside the actual, its average and median two charts; a scenario's mix one bar per zone the results' width, its average or median one chart at a switch (D-197, D-202)", () => {
  const bars = chartsHtml([r], "2024", 0);
  assert.match(bars, /<div class="chart"><h3>[^<]*<\/h3><div class="plot"><canvas id="ch-mix"/);
  assert.match(bars, /id="ch-median"/);
  assert.doesNotMatch(bars, /data-monthly/);
  const rows = chartsHtml([r], "2024", 0, "EE-FI", null, "", true);
  assert.match(rows, /<div class="chart wide"><h3>[^<]*<\/h3><div class="plot mixh"><canvas id="ch-mix"/);
  for (const id of ["ch-stack", "ch-curve", "ch-mean"]) assert.match(rows, new RegExp(`id="${id}"`));
  assert.doesNotMatch(rows, /id="ch-median"|id="ch-mix-0"/);
  // the switch on the monthly chart's title line: the average first, a press shows the median
  assert.match(rows, /<div class="chart-head"><h3>[^<]*<\/h3><button type="button" class="tgl mini" role="switch" aria-checked="false"[^>]*data-monthly="median"><span class="on">average<\/span><span class="">median<\/span><\/button><\/div><div class="plot"><canvas id="ch-mean"/);
  const med = chartsHtml([r], "2024", 0, "EE-FI", null, "", true, "fill", "median");
  assert.match(med, /aria-checked="true"[^>]*data-monthly="mean"><span class="">average<\/span><span class="on">median<\/span>/);
});

test("a scenario's median is the median of its years' weighted hours, not an average of medians (E-109)", () => {
  const yr = (weight: number, price: number): YearResult => ({ ...r, weight, view: { ...r.view, zones: r.view.zones.map((z) => ({ ...z, price: new Float32Array(10).fill(price), median: price })) } });
  assert.equal(weightedMedian([yr(0.6, 10), yr(0.4, 100)], 0), 10); // the average of the medians: 46
  assert.equal(weightedMedian([yr(0.4, 10), yr(0.6, 100)], 2), 100);
  assert.equal(weightedMedian([r], 1), r.view.zones[1].median); // one year: its own median
  // and the cards show it: 10.0 in each zone, not 46.0
  const cards = cardsHtml([yr(0.6, 10), yr(0.4, 100)], null, null);
  assert.deepEqual([...cards.matchAll(/median price.{0,400}?<td class="n">([^<]*) </gs)].map((m) => m[1]), ["10.0", "10.0", "10.0"]);
});

test("the capital cost: each source's cost over the plant's life and its present value; the Model view's table by source with a row of the plant per scenario (D-157, D-158, D-166)", () => {
  const ri: YearResult = { ...r, inputs: { hours: 8784, loadTwh: [10, 8, 12], price: { FI: 50, SE4: 60, PL: 80 } } };
  const names = { gas: "0 SMR", smr1: "1 SMR", smr2: "2 SMR", smr3: "3 SMR" };
  // the fleet of 2025 the run's own, so that nothing is built but the plant
  const fleet2025 = Object.fromEntries(["EE", "LV", "LT"].map((z, i) => [z, Object.fromEntries(r.view.zones[i].fleet.filter((f) => f.installedMw).map((f) => [f.cls, f.installedMw!]))]));
  const c = { plantMw: { gas: 0, smr1: 300, smr2: 600, smr3: 900 }, fleet2025, impact: { kwh: 3030, vat: 0.24, years: 60, sources: "ACER" }, strike: 90, clause: false, capex: capexOf(p, 300), rate: 0.03 };
  const k = capexOf(p, 300)!;
  const d = 128.75 / 105.06;
  assert.ok(Math.abs(k.cost.wind_onshore.mw - 1.1466 * d) < 1e-9 && Math.abs(k.plantMw - 4600 / 600) < 1e-9 && k.years === 60);
  // over 60 years (D-158): onshore wind built twice, 30 years each; solar once and half again, 40 years
  // each; a two-hour battery three times, 20 years each (the owner's), its rebuilds at 2050's cost
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  assert.ok(near(lifeCost(k.cost.wind_onshore, 0, 60), (1.1466 + 1.0903) * d));
  assert.ok(near(lifeCost(k.cost.solar, 0, 60), (0.5562 + 0.5 * 0.4611) * d));
  assert.ok(near(lifeCost(k.cost.battery, 2, 60), (0.084 + 2 * 0.195 + 2 * (0.072 + 2 * 0.174)) * d));
  // their present value in 2035 at 3 % (D-166): the build at its cost, each rebuild from its year — onshore
  // wind's in 2060, solar's half in 2070, a battery's in 2050 and 2070; a sum paid at each of 60 years' ends
  // is worth 27.68 of it in 2035, worked by hand: (1 − 1.03^−60) / 0.03 = (1 − 0.169733) / 0.03
  assert.ok(Math.abs(annuity(0.03, 60) - 27.6756) < 1e-4 && annuity(0, 60) === 60);
  assert.ok(near(lifeCost(k.cost.wind_onshore, 0, 60, 0.03), (1.1466 + 1.0903 / 1.03 ** 25) * d));
  assert.ok(near(lifeCost(k.cost.solar, 0, 60, 0.03), (0.5562 + (0.5 * 0.4611) / 1.03 ** 35) * d));
  assert.ok(near(lifeCost(k.cost.battery, 2, 60, 0.03), (0.084 + 2 * 0.195 + (0.072 + 2 * 0.174) / 1.03 ** 15 + (0.072 + 2 * 0.174) / 1.03 ** 35) * d));
  assert.equal(lifeCost(k.cost.wind_onshore, 0, 60, 0), lifeCost(k.cost.wind_onshore, 0, 60));
  // the Model view's table by source: the two heads and a row of the plant per scenario, 3 SMR's 900 MW at 4 600 M€ for 600
  const full = capexHtml({ gas: [ri], smr1: [ri], smr2: [ri], smr3: [ri] }, names, opening(p), c, true).body.split('class="pres-t pres-capex"')[1].split("</table>")[0];
  assert.equal(full.match(/<tr>/g)?.length, 5);
  assert.match(full, /<b>6 900<\/b> <span class="u">M€<\/span>/);
});
