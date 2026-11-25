// The import-price page (D-040): the series it shows is the engine's boundary price, its statistics
// and months are right on a leap year and a climate year, the mix closes the market model's balance,
// and its controls are named.
import assert from "node:assert/strict";
import { test } from "node:test";
import { presets, year } from "../scripts/data.ts";
import { boundaryPrice } from "../src/engine/build.ts";
import type { IpInput } from "../src/ui/importprice.ts";
import { GROUPS, capacityOf, fleetOf, importPriceHtml, ipBody, ipHint, monthStarts, monthly, mixOf, stats } from "../src/ui/importprice.ts";
import { assertNamed } from "./named.ts";

const p = presets();
const cy = year("cy2009");

test("the page's price is the profile times the level, as the engine takes it (R-BND-5)", () => {
  const base = cy.boundary.FI.DE_2035;
  const P = boundaryPrice(cy, "FI", "DE_2035", 1.2);
  assert.equal(P.length, base.length);
  for (const h of [0, 100, 5000, 8759]) assert.equal(P[h], base[h] * 1.2);
  assert.throws(() => boundaryPrice(cy, "FI", "XX_2035", 1), /boundary\.FI\.XX_2035: missing/);
});

test("statistics, months and the counts of zero, negative and dear hours", () => {
  const a = Float64Array.from([0, -5, 50, 150, 100, 0]);
  assert.deepEqual(stats(a), { mean: 295 / 6, median: 25, min: -5, max: 150, zero: 2, negative: 1, high: 1 });
  assert.equal(monthStarts(8760)[2], 24 * 59);
  assert.equal(monthStarts(8784)[2], 24 * 60);
  assert.equal(monthStarts(8784)[12], 8784);
  const short = monthly(new Float64Array(24 * 40)); // a year still running: Feb in part, March on empty
  assert.ok(short[1] && !short[2]);
  // cy2009 against the figures checked by hand on 2026-09-30: FI's DE 2035 January
  const jan = monthly(boundaryPrice(cy, "FI", "DE_2035", 1))[0]!;
  assert.equal(jan.max, 160);
  assert.equal(jan.mean.toFixed(1), "51.9");
  assert.equal(jan.median, 58);
});

test("the mix closes the market model's balance and every row falls in one group (R-BND-8)", () => {
  for (const zone of ["FI", "SE4", "PL"] as const) {
    for (const w of ["1995", "2008", "2009"]) {
      const m = mixOf(p, zone, "DE", 2035, w);
      assert.ok(m, `${zone} ${w}`);
      assert.equal(m.groups.length, GROUPS.length);
      // generation = demand + loads + net export, to the rounding of the export (3 decimals a row)
      assert.ok(Math.abs(m.generation - (m.demand! + m.loads + m.netExport)) < 0.1, `${zone} ${w}: ${m.generation} vs ${m.demand! + m.loads + m.netExport}`);
    }
  }
  const fi = mixOf(p, "FI", "DE", 2035, "2009")!;
  assert.equal(fi.groups[GROUPS.findIndex((g) => g.name === "Wind onshore")].toFixed(1), "144.7");
  assert.equal(fi.electrolysis.toFixed(1), "72.6");
  // TYNDP 2026 NT+ (D-043): the same balance from the hourly dashboards, per weather scenario
  for (const zone of ["FI", "SE4", "PL"] as const) {
    for (const [target, w] of [[2030, "WS003"], [2035, "WS037"], [2040, "WS071"], [2050, "WS092"]] as const) {
      const m = mixOf(p, zone, "NTplus", target, w);
      assert.ok(m, `${zone} ${w}`);
      assert.ok(Math.abs(m.generation - (m.demand! + m.loads + m.netExport)) < 0.1, `${zone} ${w}: ${m.generation} vs ${m.demand! + m.loads + m.netExport}`);
    }
  }
  const nt = mixOf(p, "FI", "NTplus", 2040, "WS065")!; // checked against the workbook's own 'Sum [GWh]' row on 2026-10-04
  assert.equal(nt.groups[GROUPS.findIndex((g) => g.name === "Wind onshore")].toFixed(1), "179.9");
  assert.equal(nt.electrolysis.toFixed(1), "96.3");
  assert.equal(nt.netExport.toFixed(1), "17.2");
  const g = (name: string) => GROUPS.findIndex((x) => x.name === name);
  assert.equal(fi.groups[g("Batteries")].toFixed(1), "1.0"); // the stationary stores; the cars apart
  assert.equal(fi.groups[g("Electric cars (vehicle to grid)")].toFixed(1), "3.1");
});

test("the capacity keeps the cars' batteries apart and is one fleet over the climate years (D-041)", () => {
  const c = capacityOf(p, "FI", "DE", 2035, "2009")!;
  const g = (name: string) => c.groups[GROUPS.findIndex((x) => x.name === name)];
  assert.equal(g("Wind onshore"), 46000);
  assert.equal(g("Nuclear"), 3250);
  assert.equal(g("Batteries"), 4000);
  assert.equal(g("Electric cars (vehicle to grid)"), 129087);
  assert.equal(Math.round(c.electrolysers), 15300);
  assert.deepEqual(capacityOf(p, "FI", "DE", 2035, "1995"), c);
  const n = capacityOf(p, "FI", "NTplus", 2040, "WS065")!; // TYNDP 2026 NT+: the dashboards' capacity sheet (D-043)
  const gn = (name: string) => n.groups[GROUPS.findIndex((x) => x.name === name)];
  assert.equal(Math.round(gn("Wind onshore")), 45979);
  assert.equal(Math.round(gn("Solar")), 20049); // utility and rooftop
  assert.equal(gn("Electric cars (vehicle to grid)"), 0); // the sheet gives the cars no capacity
  assert.equal(Math.round(n.electrolysers), 18600);
  assert.deepEqual(capacityOf(p, "FI", "NTplus", 2040, "WS071"), n);
});

test("the observed fleet falls in the market model's groups; wind and solar are the Statistics page's; a type no source lists is no figure (D-256)", () => {
  for (const zone of ["FI", "SE4", "PL"] as const) {
    assert.equal(fleetOf(p, zone)!.year, 2026, zone); // ENTSO-E A68 on 1 January 2026: the end of 2025
    for (const r of p.boundary.fleet!.filter((x) => x.zone === zone)) assert.equal(GROUPS.filter((x) => x.a68.includes(r.tech)).length, 1, `${zone} ${r.tech}: in one group`);
  }
  const of = (zone: "FI" | "SE4" | "PL") => { const f = fleetOf(p, zone)!; return (name: string) => f.groups[GROUPS.findIndex((x) => x.name === name)]; };
  const fi = of("FI"), pl = of("PL");
  assert.equal(fi("Nuclear"), 4371);
  assert.equal(fi("Coal and lignite"), 1080.5);
  assert.equal(fi("Other renewable"), 1950.8 + 362.4); // biomass and other renewable
  // IRENASTAT's year-end 2025, as the Statistics page shows: Fingrid's document has no offshore row, PSE's trails on solar (20 734 MW)
  assert.equal(fi("Wind onshore"), 9351);
  assert.equal(fi("Wind offshore"), 32);
  assert.equal(pl("Solar"), 25421.21);
  assert.equal(pl("Wind offshore"), 0); // a reported zero
  assert.equal(pl("Nuclear"), null); // not listed
  assert.ok(fleetOf(p, "FI")!.src.includes("entsoe.A68.FI.2026") && fleetOf(p, "FI")!.src.some((id) => id.startsWith("irena.")));
  // SE4 is no country of the Statistics page's: its document alone — hydro, onshore wind and "other"
  assert.deepEqual(fleetOf(p, "SE4")!.groups.flatMap((x, i) => (x === null ? [] : [GROUPS[i].name])), ["Hydro", "Wind onshore", "Other thermal"]);
  assert.deepEqual(fleetOf(p, "SE4")!.src, ["entsoe.A68.SE4.2026"]);
});

test("the page's controls are named and each profile kind renders", () => {
  const run = (label: string) => ({ label, weight: 1 / 3, weather: label, price: boundaryPrice(year(`cy${label}`), "FI", "DE_2035", 0.9), base: boundaryPrice(year(`cy${label}`), "FI", "DE_2035", 1) });
  const a: IpInput = { zone: "FI", level: 0.9, slope: 0, kind: "tyndp2024", scenario: "DE", target: 2035, presets: p, runs: ["1995", "2008", "2009"].map(run) };
  const html = importPriceHtml(a);
  assertNamed(html, "import price");
  // the level's preset, ×1 at a fifth of 0.5–3, under the knob's centre as the panel's (E-179): not at 20 % of the track
  assert.match(html, /class="tick" style="left:calc\(8px \+ \(100% - 18px\) \* 0\.2000\)"/);
  assert.match(html, /The generation behind the price/);
  assert.match(html, /Installed capacity/);
  assert.match(html, /Distributed Energy \(DE\)/);
  // the fleet at the end of 2025 beside DE 2035's and the change from it (D-256): onshore wind 9 351 to 46 000 MW;
  // coal, which the market model has closed, keeps its row; a load has no observed figure
  assert.match(html, /<th>MW 2025<\/th><th>MW 2035<\/th><th>change<\/th>/);
  assert.match(html, /Wind onshore<\/td><td class="n">9 351<\/td><td class="n">46 000<\/td><td class="n">\+392 %<\/td>/);
  assert.match(html, /Coal and lignite<\/td><td class="n">1 081<\/td><td class="n">0<\/td><td class="n">−100 %<\/td>/);
  assert.match(html, /Electrolysers \(load\)<\/td><td class="n">–<\/td><td class="n">15 300<\/td><td class="n">–<\/td>/);
  const ws = (key: string, label: string, weather: string) => ({ label, weight: 1 / 3, weather, price: boundaryPrice(year(key), "FI", "NTplus_2035", 1), base: boundaryPrice(year(key), "FI", "NTplus_2035", 1) });
  const nt = importPriceHtml({ ...a, kind: "tyndp2026", scenario: "NTplus", level: 1, runs: [ws("ws032", "2031", "WS032"), ws("ws037", "2036", "WS037"), ws("ws059", "2038", "WS059")] });
  assert.match(nt, /The generation behind the price/);
  assert.match(nt, /Installed capacity/);
  assert.match(nt, /NT\+ hourly dashboards/);
  const obs = importPriceHtml({ ...a, kind: "observed", scenario: "2025", target: null, runs: [{ label: "2025", weight: 1, weather: null, price: boundaryPrice(year("2025"), "FI", "observed", 1), base: boundaryPrice(year("2025"), "FI", "observed", 1) }] });
  assert.match(obs, /An observed year/);
  assert.match(obs, /hours below 0: \d+/);
  assert.doesNotMatch(obs, /The generation behind the price/);
});

test("the hint multiplies the published average by the level; the duration chart draws the published profile once the level moves it (D-194)", () => {
  const base = new Float64Array([40, 40, 40, 40]), price = new Float64Array([48, 48, 48, 48]);
  const a: IpInput = { zone: "PL", level: 1.2, slope: 0, kind: "tyndp2024", scenario: "DE", target: 2035, presets: p, runs: [{ label: "2009", weight: 1, weather: "2009", price, base }] };
  assert.equal(ipHint(a), "weighted average 40.0 €/MWh × 1.20 = 48.0 €/MWh");
  assert.match(ipBody(a), /series base/);
  assert.match(ipBody(a), /the faint lines are the profile as published, before the level/);
  // Poland had no offshore wind and no nuclear plant at the end of 2025: a reported zero is "new", a type not listed no change (D-256)
  assert.match(ipBody(a), /Wind offshore<\/td><td class="n">0<\/td><td class="n">9 380<\/td><td class="n">new<\/td>/);
  assert.match(ipBody(a), /Nuclear<\/td><td class="n">–<\/td><td class="n">2 220<\/td><td class="n">–<\/td>/);
  assert.doesNotMatch(ipBody({ ...a, level: 1, runs: [{ ...a.runs[0], price: base }] }), /faint lines|series base/);
});
