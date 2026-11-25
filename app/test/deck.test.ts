// The deck (src/ui/deck.ts; D-220, R-APP-16): seventeen slides, each figure the weather years' weighted average of the runs
// it is given (R-TIME-4) — the price, its gap and what the gap means for the economy and a household, the net import,
// the trade balance, the hours gas sets the price, the cables' outages, CO₂, the capital cost — and a slide whose runs
// are not in yet says "computing…" rather than showing another state's figures. Each slide has its talk's note
// (D-222), text in both languages with no figure in it.
import assert from "node:assert/strict";
import { test } from "node:test";
import { presets, year } from "../scripts/data.ts";
import { loadSolver } from "../scripts/highs.ts";
import { build, observedClasses } from "../src/engine/build.ts";
import { runLP } from "../src/engine/lp.ts";
import { ZONES } from "../src/engine/problem.ts";
import { opening } from "../src/state/model.ts";
import { replay } from "../src/state/scenario.ts";
import { runKey } from "../src/state/text.ts";
import type { DeckInput, Side, Trio } from "../src/ui/deck.ts";
import type { Toggle } from "../src/ui/panel.ts";
import { NB_KEYS, OUTAGES, REPLAY_SLIDE, REPLAY_YEARS, SLIDES, deckShell, without, yearPrices } from "../src/ui/deck.ts";
import { monthly } from "../src/ui/charts.ts";
import { lineKeys, linesSvg, panelControls, toggleLine } from "../src/ui/panel.ts";
import { LAND } from "../src/ui/basemap.ts";
import { capexOf } from "../src/ui/presentation.ts";
import { fmt, signed } from "../src/ui/labels.ts";
import type { YearResult } from "../src/ui/results.ts";
import { statePaysOf } from "../src/ui/results.ts";
import { mean } from "../src/worker/metrics.ts";
import type { ZoneView } from "../src/worker/view.ts";
import { view } from "../src/worker/view.ts";

const { solve } = await loadSolver();
const p = presets();
const y = year("2024");
const pb = build(y, p, null, replay(p, y));
const v = view(pb, runLP(pb, solve), ZONES.map((z) => observedClasses(p, z, y.zones[z].capacity ?? {})), null, 90);
const r: YearResult = { key: "2024", label: "2024", weight: 1, view: v, labels: null, inputs: { hours: 8760, loadTwh: [10, 8, 12], price: { FI: 50, SE4: 60, PL: 80 } } };

// three weather years with ENTSO-E's weights, Estonia's figures written by hand
const YEARS: [string, number][] = [["1995", 0.233], ["2008", 0.367], ["2009", 0.4]];
const set = (price: number[], ee: Partial<ZoneView> = {}): YearResult[] => YEARS.map(([label, weight], i) => ({ ...r, key: `cy${label}`, label, weight,
  view: { ...r.view, hours: 8760, zones: r.view.zones.map((z, k) => (k === 0 ? { ...z, mean: price[i], ...ee } : z)) } }));
const trio: Trio = {
  gas: set([120, 100, 110], { importTwh: 4, exportTwh: 1, importMeur: 300, exportMeur: 50, fossil: { unit: 5000, gas: 4380, neighbour: 0 }, co2Mt: 1.5 }),
  smr1: set([110, 92, 100], { importTwh: 3, exportTwh: 2, importMeur: 200, exportMeur: 100, fossil: { unit: 3000, gas: 2628, neighbour: 0 }, co2Mt: 1.2 }),
  smr2: set([95, 80, 88], { importTwh: 2, exportTwh: 2.5, importMeur: 120, exportMeur: 150, fossil: { unit: 2000, gas: 1752, neighbour: 0 }, co2Mt: 0.9 }),
  smr3: set([80, 70, 75], { importTwh: 1, exportTwh: 3, importMeur: 60, exportMeur: 200, fossil: { unit: 1000, gas: 876, neighbour: 0 }, co2Mt: 0.6 }),
};
const shift = (tr: Trio, dp: number): Trio => Object.fromEntries(Object.entries(tr).map(([id, s]) => [id, s!.map((x) => ({ ...x, view: { ...x.view, zones: x.view.zones.map((z, k) => (k ? z : { ...z, mean: z.mean + dp })) } }))]));
// the fleet of 2025 the run's own: nothing is built but the plant
const fleet2025 = Object.fromEntries(["EE", "LV", "LT"].map((z, i) => [z, Object.fromEntries(r.view.zones[i].fleet.filter((f) => f.installedMw).map((f) => [f.cls, f.installedMw!]))]));
const c = { plantMw: { gas: 0, smr1: 315, smr2: 630, smr3: 945 }, fleet2025, impact: { kwh: 3030, vat: 0.24, years: 60, sources: "ACER; EMTA; GE" }, strike: 90, clause: false, capex: capexOf(p, 315), rate: 0.03, cfdYears: 40 };
// the neighbours' slide's documentary values as the page hands them in (D-263)
const NB_PAR = Object.fromEntries(NB_KEYS.map((k) => [k, p.parameters[k]!.value as number]));
const input = (tr: Trio, e2: Trio = {}, e12: Trio = {}): DeckInput => ({ trio: tr, e2, e12, s: opening(p), c, runs: YEARS.map(([label, weight]) => ({ label, weight })), nb: { par: NB_PAR } });
const slides = (d: DeckInput) => SLIDES.map((f) => f(d));

test("seventeen slides, none with a figure missing or a hyphen for a minus", () => {
  const all = slides(input(trio, shift(trio, 5), shift(trio, 12)));
  assert.equal(all.length, 17); // the capital cost's slide out (D-251), the neighbours' three in (D-263, D-279), the map in (D-319)
  // the nuclear projects' map: Fermi's own slide as a picture in the page's language, before the last slide (D-319)
  assert.match(all[15], /^<img src="img\/projects_map_en\.webp" alt="Nuclear projects in Europe[^"]+" width="1920" height="1080"/);
  assert.match(all[16], /Try it yourself/);
  for (const [i, h] of all.entries()) {
    assert.doesNotMatch(h, /NaN|undefined|Infinity/, `slide ${i + 1}`);
    assert.doesNotMatch(h, />-\d/, `slide ${i + 1}`);
    // no third-party address in a slide's own markup (R-NFR-1): sources are named, and the seventh slide's link to
    // Fingrid's forecast (D-270) takes its address from the site's sources, which this input leaves out
    assert.doesNotMatch(h, /https?:\/\//, `slide ${i + 1}`);
  }
});

test("the price slides: each scenario's weighted average, its years' lowest and highest, the gap and its money", () => {
  const [, , , , , , , , years, price] = slides(input(trio)); // the weather years ninth since D-296, after the neighbours' three
  // 0 SMR: 0.233 × 120 + 0.367 × 100 + 0.4 × 110 = 108.66; 2 SMR: 0.233 × 95 + 0.367 × 80 + 0.4 × 88 = 86.695
  assert.match(years, /weighted 108\.7 €\/MWh</);
  assert.match(years, /weighted 86\.7 €\/MWh</);
  assert.doesNotMatch(years, /weighted 74\.3/); // 3 SMR's, on no slide since D-250
  assert.match(years, />2008 · 100\.0</); // 0 SMR's lowest year
  assert.match(years, />1995 · 120\.0</); // and its highest
  assert.match(years, /weight 37 %/);
  // what a weather year and its weight are, beside the middle chip, and the axis's unit (D-245)
  assert.ok(years.includes("WEATHER YEAR") && years.includes("WEIGHT") && years.includes(">€/MWh</text>"));
  assert.match(price, />108\.7 <tspan/);
  assert.match(price, /22\.0 €\/MWh/); // the gap the two bars show, 0 SMR's and 2 SMR's (D-250)
  assert.match(price, /220 M€ a year/); // 10 TWh × 21.965 €/MWh
  assert.match(price, /83 € a year/); // 3 030 kWh × 21.965 €/MWh × 1.24
  assert.match(price, /20\.0–25\.0 €\/MWh/); // the same gap within each year: 25, 20 and 22
  assert.match(price, /−20 %/); // 2 SMR against 0 SMR
  assert.equal(price.match(/<rect x="[\d.]+" y="[\d.]+" width="\d+" height="[\d.]+" rx="8"/g)?.length, 3); // three bars
});

test("imports: net import and the trade balance by sign, the hours gas sets the price and how many times fewer", () => {
  const imports = slides(input(trio))[10];
  assert.match(imports, />\+3\.0 <tspan/); // 0 SMR imports 3 TWh net
  assert.match(imports, />−0\.5 <tspan/); // 2 SMR exports 0.5
  assert.doesNotMatch(imports, />−2\.0 <tspan/); // 3 SMR's, on no slide since D-250
  assert.match(imports, /With 2 SMR Estonia is a net exporter; its electricity trade balance \(exports less imports\) is \+30 M€ a year\./);
  assert.match(imports, /With 0 SMR, 250 M€ a year leaves Estonia's economy for electricity\./);
  assert.match(imports, />50\.0 <tspan/); // gas set the price in 4 380 of 8 760 hours
  assert.match(imports, /2\.5 times fewer/); // 50 % of the hours against 2 SMR's 20 %
  assert.match(imports, /≈ 4 380 h, or 182 full days/);
});

test("the cables' slide: the outages' rows wait for their runs; then each change against the cables in service", () => {
  const waiting = slides(input(trio))[11];
  assert.match(waiting, /computing…/);
  assert.equal(waiting.match(/>…</g)?.length, 3 * 2 * 4); // three scenarios, two outages, four figures
  assert.doesNotMatch(waiting, /without EstLink 2 the price changes/);
  const done = slides(input(trio, shift(trio, 5), shift(trio, 12)))[11];
  assert.doesNotMatch(done, /computing…/);
  assert.match(done, /2 SMR: without EstLink 2 the price changes by \+5 €\/MWh, without both cables by \+12 €\/MWh\./);
  assert.match(done, /Without both, gas sets the price in 50 % of the hours\./);
});

test("the trilemma: the changes against 0 SMR; the capital cost's slide out (D-251)", () => {
  const all = slides(input(trio));
  assert.match(all[13], /−20 %/); // 2 SMR's price: 86.70 against 108.66 €/MWh
  assert.match(all[13], /−40 %/); // its CO₂: 0.9 against 1.5 Mt
  assert.match(all[13], /−3\.5 TWh\/yr/); // net import −0.5 against +3, in TWh: a sign flip is no percentage
  assert.ok(all.every((h) => !h.includes("What does the new capacity cost?")));
  assert.match(all[12], /IPCC AR5, Annex III, Table A\.III\.2: direct emissions/);
  assert.match(all[12], /Regulation \(EU\) 2026\/667, in force since April 2026/); // 7 April 2026, not March (ERRATA E-183)
});

test("the second slide: the panel's map of the lines the state runs with, a picture with nothing to press (D-240)", () => {
  // the scenario's lines, the planned ones among them, as the panel's scenario box draws them (ERRATA E-197)
  const s = opening(p), keys = lineKeys(p, true), cut = toggleLine(p, s, "nordbalt"); // NordBalt off for the whole year
  const panel = linesSvg({ p, state: cut, links: null }, keys), deck = linesSvg({ p, state: cut, links: null }, keys, true);
  assert.match(panel, /class="ln ln-off" data-switch="nordbalt"/);
  assert.doesNotMatch(deck, /data-switch=|class="hit"|class="ln |NordBalt/); // no switch, no hover, a line off left out
  assert.match(deck, /class="ln-on"><title>Harmony Link: on</); // planned, and in service in the scenario's year
  assert.doesNotMatch(deck, /EstLink 3/); // planned, and not in service then
  for (const code of ["FI", "EE", "LV", "LT", "SE4", "PL"]) assert.ok(deck.includes(`class="code">${code}<`), code);
  // the streaks' gradients named apart from the panel's, which the page holds at the same time
  assert.match(deck, /id="streak-deck-/);
  assert.doesNotMatch(deck, /id="streak-(?!deck-)/);
  assert.ok(SLIDES[1]({ ...input(trio), map: deck }).includes(deck));
  assert.doesNotMatch(SLIDES[1](input(trio)), /class="lmap"/);
  assert.doesNotMatch(deck, /class="price"/); // no prices unless given
});

test("the second slide's prices: each zone's average over the year so far, the month in progress included (D-257)", () => {
  const ytd = { first: "2026-01-01", last: "2026-11-22T23:00", hours: 7895, zones: { EE: { value: 81.2 }, FI: { value: 55.4 } } };
  assert.deepEqual(yearPrices(ytd), { year: 2026, month: 11, day: 22, zones: { EE: 81.2, FI: 55.4 } });
  assert.equal(yearPrices(undefined), null);
  // under the map's title the year and its days: January to the last day in
  const html = SLIDES[1]({ ...input(trio), map: "<svg></svg>", prices: yearPrices(ytd) });
  assert.match(html, />2026 Jan–22 Nov</);
  // on the map, after each zone's code; under the map's title the year and its months
  const map = linesSvg({ p, state: opening(p), links: null }, lineKeys(p, true), true, { EE: 80.4, FI: 57.4 });
  // Estonia's right of its node as every other's (D-252)
  assert.match(map, /class="code" data-pbox="EE">EE<tspan class="price" dx="5">80<\/tspan><tspan class="unit" dx="3">€\/MWh<\/tspan><\/text>/);
  assert.match(map, /class="code" data-pbox="FI">FI<tspan class="price" dx="5">57<\/tspan><tspan class="unit" dx="3">€\/MWh<\/tspan><\/text>/);
  assert.ok(!map.includes("text-anchor"));
  // each priced label in a box of its own, fitted by the page to the drawn text (D-259); a label without a price has none
  assert.equal(map.match(/class="pbox" data-pbox="(EE|FI)"/g)?.length, 2);
  assert.match(map, /viewBox="12 0 362 288"/); // moved east to the land's edge, for the eastern units (D-251, D-252)
  assert.match(LAND.find((c) => c.name === "Russia")!.d, /^M374\.0 /); // the land reaches the box's east edge
  assert.match(map, /class="code">LV<\/text>/); // a zone without its price has its code alone
  const h = SLIDES[1]({ ...input(trio), map, prices: { year: 2026, month: 12, day: 31, zones: { EE: 80.4, FI: 57.4 } } });
  assert.ok(h.includes("AVERAGE DAY-AHEAD PRICE") && h.includes(">2026<"), h); // a whole year: the year alone
  assert.doesNotMatch(SLIDES[1]({ ...input(trio), map }), /AVERAGE DAY-AHEAD PRICE/); // no title without the prices
});

test("Finland's price's slide: the profile's price, the level and the model's price over its data centres, industry and the large projects planned (D-263, D-264)", () => {
  // every figure a documentary value the export holds: the Statistics page's two tabs (D-214), the projects and EUDCA's IT power (D-264, D-266)
  for (const k of NB_KEYS) assert.ok(p.parameters[k], k);
  const d = { ...input(trio), nb: { par: NB_PAR, urls: { "doc.fingrid_prospects_q3_2026_en": "https://www.fingrid.fi/x/fingrid_prospects-q3-2026-eng.pdf", "doc.fingrid_2026_08_18_consumption": "https://www.fingrid.fi/en/news/x/", "doc.fortum_google_loviisa_2026": "https://news.cision.com/fortum/x", "doc.arctial_eia_report_2026": "https://www.ymparisto.fi/x.pdf", "doc.eurostat_db_isoc_env_ict_nrg": "https://ec.europa.eu/eurostat/databrowser/view/isoc_env_ict_nrg/x", "doc.eurostat_db_nrg_bal_c": "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/x" } }, prices: { year: 2026, month: 11, day: 23, zones: { FI: 58, SE4: 103.4, PL: 130.7 } } };
  const text = SLIDES[5](d).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  // the title and the main conclusion under it, the owner's words (D-271)
  assert.ok(text.includes("The case for Finland's price multiplier With the data-centre building boom and the decarbonisation of heavy industry, Finland's demand grows faster than its new generation, and that will push prices up."), text);
  assert.ok(!text.includes("Sweden") && !text.includes("Poland"), "Finland alone (D-264)");
  // the flag in the title, the country's name out of the card (D-282)
  assert.match(SLIDES[5](d), /<h1><span class="fl fl-FI"[^>]*><\/span>The case for Finland's price multiplier<\/h1>/);
  // the owner's level on the profile (D-194), the market's year to date beside it
  // one line: the forecast, its multiplier, an arrow to the model's price; the market's year out (D-277)
  assert.match(text, /AVERAGE ELECTRICITY PRICE DE 2035 forecast: (\d+) ×1\.88 → (\d+) €\/MWh DATA CENTRES/);
  assert.ok(!text.includes("Market 2026") && !text.includes("Model 2035"), text);
  // Finland's data centres 2.3 TWh in 2024 against Fingrid's 35 in 2035
  assert.ok(text.includes("DATA CENTRES 2 TWh · 2025 → 35 TWh · 2035 Fingrid, Q3/2026: «11–35 terawatt-hours by 2035» connection agreements signed 5 GW ; enquiries 100 GW Google"), text); // a link's end a space in this text
  // the figure's source in its own words, a link to the page it stands on, its sentence the link's tip (D-270)
  const slide = SLIDES[5](d);
  assert.equal(slide.match(/<a href="https:\/\/www\.fingrid\.fi\/[^"]*fingrid_prospects-q3-2026-eng\.pdf#page=6" target="_blank" rel="noopener"/g)?.length, 4); // the two ranges and the two bases (D-289)
  // every figure of the card linked to its document, the source's words its tip (D-276): 5 GW to Fingrid's news, 100 GW to
  // the forecast's p. 3, Google's three to Fortum's release, Arctial's to its assessment's p. 61; «not binding» out
  assert.match(slide, /href="https:\/\/www\.fingrid\.fi\/en\/news\/x\/" target="_blank" rel="noopener" title="“By mid-August[^"]*”"[^>]*>5\u00a0GW<\/a>/); // a non-breaking space before the unit (D-280)
  assert.match(slide, /fingrid_prospects-q3-2026-eng\.pdf#page=3"[^>]*>100\u00a0GW<\/a>/);
  assert.equal(slide.match(/href="https:\/\/news\.cision\.com\/fortum\/x"/g)?.length, 3); // and Google's row of the table (D-278); the 507 MW out (D-288)
  assert.match(slide, /x\.pdf#page=61"[^>]*>1 050\u00a0MW<\/a>/);
  // the 2024 figures linked to Eurostat's data browser, the value in GWh the tip (D-284)
  assert.match(slide, /fingrid_prospects-q3-2026-eng\.pdf#page=6"[^>]*title="“their electricity consumption increases from approximately 2 terawatt-hours in 2025” — [^"]*"[^>]*>2<\/a>/); // Fingrid's base (D-289), whole without a decimal (D-290)
  assert.match(slide, /fingrid_prospects-q3-2026-eng\.pdf#page=6"[^>]*title="“industrial electricity consumption excluding data centers develops in the scenarios from approximately 36 terawatt-hours in 2025” — [^"]*"[^>]*>36<\/a>/); // Fingrid's base (D-289)
  assert.ok(!text.includes("not binding"), text);
  // the dots green where building has begun, grey else; each place linked to its value's document (D-278)
  assert.equal(slide.match(/border-radius:50%;background:#15C65D/g)?.length, 6);
  assert.equal(slide.match(/border-radius:50%;background:#C4C8CF/g)?.length, 7);
  const refs = { "statistics.dc.fi.project.kirkkonummi_mw": { url: "https://www.ymparisto.fi/k.pdf", page: 12, title: "KMH Kirkkonummi" }, "statistics.dc.fi.project.lahti_mw": { url: "https://www.gtai.de/x", page: null, title: "GTAI" } };
  const linked = SLIDES[5]({ ...d, nb: { ...d.nb, refs } });
  assert.match(linked, /href="https:\/\/www\.ymparisto\.fi\/k\.pdf#page=12"[^>]*title="KMH Kirkkonummi"[^>]*>Kirkkonummi<\/a>/);
  assert.match(linked, /href="https:\/\/www\.gtai\.de\/x" target="_blank"[^>]*>Lahti<\/a>/);
  assert.match(linked, /href="https:\/\/news\.cision\.com\/fortum\/x"[^>]*>Kajaani · Muhos · Vaala<\/a>/);
  assert.ok(slide.includes("their electricity consumption increases from approximately 2 terawatt-hours in 2025 to 9–18 terawatt-hours by 2030 and 11–35 terawatt-hours by 2035."), "the full sentence in the tip");
  assert.ok(text.includes("«35–62 terawatt-hours by 2035»"), text);
  assert.ok(!text.includes("hydrogen and e-fuels") && !text.includes("electric boilers"), text); // the industry row's line out (D-275)
  // the addresses are the sources' (sources.json), never the bundle's: without them the words stand unlinked
  assert.doesNotMatch(SLIDES[5]({ ...d, nb: { par: NB_PAR } }), /<a /);
  assert.ok(SLIDES[5]({ ...d, nb: { par: NB_PAR } }).includes("Fingrid, Q3/2026: «11–35 terawatt-hours by 2035»"));
  assert.ok(text.includes("INDUSTRY 36 TWh · 2025 → 62 TWh · 2035"), text); // Fingrid's own base (D-289)
  // Arctial's rendering over the industry block, its credit linked to the assessment (D-286)
  assert.match(slide, /<img src="img\/arctial_kokkola\.webp" alt="Arctial(?:&#39;|&#x27;|')s aluminium smelter planned at Kokkola, a rendering"/);
  assert.match(slide, /x\.pdf"[^>]*title="Arctial, environmental assessment report, 2026"[^>]*><img src="img\/arctial_kokkola\.webp"/); // the picture the link, no caption on it
  // the largest single load planned, by its megawatts (D-267)
  assert.ok(text.includes("Arctial , aluminium smelter at Kokkola: 1 050 MW of steady load") && !text.includes("(environmental assessment, 2026)"), text);
  // the twelve projects, the firmest first, each with its first phase and its campus's final megawatts (D-264, D-266):
  // Microsoft's three sites as their environmental impact assessments give them, 265 + 200 + 150
  assert.ok(text.includes("FINAL CAPACITY") && !text.includes("FIRST PHASE"), text); // the first phase's column out (D-273)
  assert.ok(text.includes("Espoo · Kirkkonummi · Vihti Microsoft decided, building 615 MW"), text);
  assert.ok(text.includes("Myllykoski, Kouvola atNorth decided, building 430 MW"), text);
  // a first phase's megawatts where they are published; Utajärvi, whose completion is not announced, has no year
  assert.ok(text.includes("Kajaani XTX Markets decided, building 250 MW") && text.includes("Kouvola Hyperco · TikTok decided, building 150 MW"), text);
  assert.ok(text.includes("Utajärvi Amp Tank decided, building 200 MW") && text.includes("Seinäjoki Pure DC planning 550 MW"), text);
  // IT power now and as forecast (EUDCA) beside the projects' sums by stage, the two not one measure
  assert.ok(text.includes("IT power 2025 → 2027 (EUDCA): 362 → 556 MW decided: 1 985 MW planning: 2 360 MW final capacity together: 4 345 MW"), text);
  // Google (D-268): half of an existing nuclear plant under contract, 507 MW of its two units' 1 014; its three new sites
  // with their investment and no megawatts, in no sum
  assert.ok(text.includes("Google : 13 bn € in 2027–2028; up to 50 % of the Loviisa nuclear plant in 2030–2049"), text);
  assert.ok(!text.includes("507 MW"), text); // the megawatts out (D-288)
  assert.match(slide, /<b style="font-size:22px;color:#2303BD"><a [^>]*news\.cision\.com[^>]*>50 %<\/a><\/b>/); // the share in blue
  assert.ok(text.includes("Kajaani · Muhos · Vaala Google planning – IT power"), text); // the investment in Finland's card, not the table (D-269)
  // no footnote since the owner took it out (D-272)
  assert.ok(!text.includes("onshore wind") && !text.includes("A plan is not yet consumption"), text);
  assert.match(SLIDES[5]({ ...input(trio), nb: undefined }), /class="ps-pending"/); // waits for its figures
});

test("Sweden's and Poland's slides after Finland's: the same two cards, each from its grid operator's plan and queue (D-279)", () => {
  const urls = { "svk.langsiktig_marknadsanalys_2026": "https://www.svk.se/lma.pdf", "doc.svk_connections_2026_11_01": "https://www.svk.se/queue/", "doc.pse_prsp_2027_2036_apr2026": "https://www.pse.pl/prsp.pdf", "doc.pse_art78l_2026_09_30": "https://www.pse.pl/list.xlsx" };
  const d = { ...input(trio), nb: { par: NB_PAR, urls } };
  const [se, pl] = [SLIDES[6](d), SLIDES[7](d)], [seText, plText] = [se, pl].map((h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
  // Sweden: SE4's price at the owner's level; the plan's figures read off Svenska kraftnät's chart, said so in the tip
  assert.ok(seText.includes("The case for Sweden's price multiplier AVERAGE ELECTRICITY PRICE · SE4") && !se.includes("<p>"), seText);
  assert.match(seText, /AVERAGE ELECTRICITY PRICE · SE4 DE 2035 forecast: (\d+) ×1\.96 → (\d+) €\/MWh DATA CENTRES · ALL SWEDEN/);
  assert.ok(seText.includes("DATA CENTRES · ALL SWEDEN 2.5 TWh · 2026 → 16 TWh · 2035 Svenska kraftnät: 2.5 TWh in 2026, 27.1 TWh in 2050 in the connection queue 8.2 GW allocated or reserved 3.5 GW Brookfield : up to 8.7 bn € at Strängnäs over 10–15 years"), seText);
  assert.ok(seText.includes("INDUSTRY · ALL SWEDEN Svenska kraftnät, scenario MM: 2026 2050 fossil-free steel 0.1 TWh → 9.6 TWh fossil-free cement 0.0 TWh → 3.0 TWh refineries 0.9 TWh → 2.4 TWh electric vehicles 3.2 TWh → 23.8 TWh hydrogen production 0.1 TWh → 35.4 TWh in the connection queue 14.2 GW Stegra (steel, Boden): electrolysers of 700 MW , ordered in 2023"), seText);
  assert.match(se, /href="https:\/\/www\.svk\.se\/lma\.pdf#page=43"[^>]*title="Tabell 4: “Datacenter 2,5 8,8 27,1 40,9 40,9” \(2026; 2050 LF, MM, HP, HF\)\. The slide(?:'|&#39;|&#x27;)s 2035: the midpoint of the scenario MM in 2030 and 2040, read off Figure 5, p\. 42 — Svenska kraftnät, Långsiktig marknadsanalys 2026, p\. 43"/); // the printed figures, Table 4 (D-310)
  assert.match(se, /href="https:\/\/www\.svk\.se\/queue\/"[^>]*title="“Datacenter - 8 200 MW”"[^>]*>8\.2\u00a0GW<\/a>/);
  // the campuses announced, each with its bidding area — none in SE4; one building, one decided, three planned
  assert.ok(seText.includes("Borlänge (SE3) EcoDataCenter · Mistral AI decided, building up to 600 MW") && seText.includes("Skellefteå (SE1) EdgeConneX planning up to 1 000 MW")
    && seText.includes("Strängnäs (SE3) Brookfield planning 750 MW") /* announced, no investment decision (D-280) */, seText);
  assert.ok(!seText.includes("(SE4)"), seText);
  assert.equal(se.match(/border-radius:50%;background:#15C65D/g)?.length, 1);
  assert.equal(se.match(/border-radius:50%;background:#C4C8CF/g)?.length, 4);
  assert.match(SLIDES[6]({ ...d, nb: { par: NB_PAR, urls: { ...urls, "doc.brookfield_strangnas_2025": "https://b.example/" } } }), /title="“Brookfield Asset Management[^"]*SEK 95 billion[^"]*” — 4 June 2025; at the ECB(?:'|&#39;|&#x27;)s rate of that day, 10\.9475 SEK\/€"[^>]*>8\.7 bn €<\/a>/); // in euros as Finland's Google (D-308)
  assert.match(se, /lma\.pdf#page=43"[^>]*title="“Datacenter 2,5 8,8 27,1 40,9 40,9” — [^"]*"[^>]*>2\.5<\/a>/); // Svenska kraftnät's own base (D-311)
  assert.ok(!seText.includes("(SE1)") || seText.includes("Skellefteå (SE1)"), seText); // the north's share out (D-312)
  assert.ok(seText.includes("in Svenska kraftnät's queue: 8 200 MW decided: 600 MW planning: 2 200 MW final capacity together: 2 800 MW"), seText);
  // Poland: PSE's draft plan and every data-centre row of its list of connections — conditions or a request, none building
  assert.match(plText, /AVERAGE ELECTRICITY PRICE DE 2035 forecast: (\d+) ×2\.10 → (\d+) €\/MWh DATA CENTRES/);
  assert.ok(plText.includes("DATA CENTRES 0.6 TWh · 2024 → 17.4 TWh · 2036 PSE, 2026: 17.4 TWh in 2036, 29.4 TWh in 2040 connection conditions issued 9.2 GW requests 2.1 GW INDUSTRY"), plText); // WBS Power's line out (D-297)
  assert.ok(!plText.includes("WBS Power ,"), plText);
  assert.match(pl, /prsp\.pdf#page=29"[^>]*title="“Szacowane zapotrzebowanie na energię elektryczną \[TWh\] 0,6 17,4 29,4” — [^"]*"[^>]*>0\.6<\/a>/); // PSE's own base, not Eurostat's (D-298)
  assert.ok(plText.includes("INDUSTRY 53.4 TWh · 2024 → +15 TWh · 2036 new loads PSE, 2026: 15.0 TWh in 2036, 18.8 TWh in 2040 hydrogen: connection conditions issued 1 620 MW electrolysers in 2036: 1 500 MW"), plText);
  assert.ok(!plText.includes("ArcelorMittal"), plText);
  assert.ok(!plText.includes("push prices up") && !pl.includes("<p>"), plText); // no conclusion under the title (D-301)
  assert.ok(pl.includes("height:800px;margin-top:-60px") && pl.includes(";zoom:1.25"), "the cards in the title's band, the left card larger (D-302)");
  assert.ok(se.includes("height:800px;margin-top:-60px") && se.includes(";zoom:1.06") && !se.includes("flex-basis:100%"), "Sweden's cards in the title's band, its price on one line (D-309)"); // the agreements' line out (D-300)
  assert.match(pl, /href="https:\/\/www\.pse\.pl\/prsp\.pdf#page=29"[^>]*title="Tab\. 4\.3: “Szacowane zapotrzebowanie na energię elektryczną \[TWh\] 0,6 17,4 29,4” \(2024, 2036, 2040\) — PSE,/);
  assert.match(pl, /prsp\.pdf#page=30"[^>]*>1 500\u00a0MW<\/a>/);
  assert.ok(plText.includes("DATA CENTRES IN PSE'S LIST OF CONNECTIONS CAPACITY Chynowo WBS Power conditions issued 4 000 MW"), plText);
  assert.ok(plText.includes("Kołbaskowo Mazur request 1 140 MW") && plText.includes("Święte Iberdrola request 219 MW") && plText.includes("Wrocław · Sękocin Greenvolt · Corts request 140 MW"), plText);
  assert.doesNotMatch(pl, /border-radius:50%;background:#15C65D/); // none building
  assert.equal(pl.match(/border-radius:50%;background:#C4C8CF/g)?.length, 13);
  // the list's total is the documentary totals of the Statistics page (D-214) together, beside what PSE's own plan takes; the two sums only on the left card (D-299)
  assert.ok(plText.includes("in PSE's plan for 2036: 3 093 MW together: 11 284 MW"), plText);
  assert.equal(NB_PAR["statistics.dc.pl.conditions_mw"] + NB_PAR["statistics.dc.pl.applications_mw"], 11284.09);
  for (const i of [6, 7]) {
    assert.doesNotMatch(SLIDES[i]({ ...d, nb: { par: NB_PAR } }), /<a /); // the addresses the sources', never the bundle's
    assert.match(SLIDES[i]({ ...input(trio), nb: undefined }), /class="ps-pending"/);
  }
});

test("the third slide: the panel's sliders and switches as the panel holds them, under the pipeline (D-242)", () => {
  const s = opening(p), c = panelControls({ p, state: s, links: null });
  // demand as its multiplier on 0.5–2, the preset 1; a source's top twice its preset, at least 2 000 MW (the panel's rule)
  assert.deepEqual([c.demand.value, c.demand.preset, c.demand.min, c.demand.max], [s.zones.EE.multiplier, 1, 0.5, 2]);
  for (const [k, cls] of c.sources.map((x, i) => [x, ["wind_onshore", "solar"][i]] as const)) {
    assert.equal(k.value, s.zones.EE.mw[cls]);
    assert.equal(k.max, Math.ceil(Math.max(2 * k.preset, 1.2 * k.value, 2000) / 100) * 100, cls);
  }
  // the first four lines of the panel's list, a planned one out of service as the scenario has it
  assert.deepEqual(c.lines.map((x) => [x.name, x.on]), [["EstLink 1", true], ["EstLink 2", true], ["EstLink 3", false], ["EE–LV lines", true]]);
  const off = panelControls({ p, state: toggleLine(p, s, "estlink2"), links: null });
  assert.equal(off.lines[1].on, false); // a switch pressed on the panel shows on the slide
  const html = SLIDES[2]({ ...input(trio), ctl: c });
  assert.ok(html.includes("THE PANEL: ASSUMPTIONS YOU CAN CHANGE"));
  assert.ok(html.includes(">OFF<") && html.includes(">ON<"));
  // one source named by no technology — Estonia's gas plants summed — with its MW and its bid side by side as the model's
  // panel gives a source's row, no slider of the bid's own (D-259, D-260); the links unnamed
  const gas = Object.entries(s.zones.EE.mw).reduce((a, [k, v]) => a + (k.startsWith("gas_") ? v : 0), 0);
  assert.ok(gas > 0 && c.gas.value === gas && html.includes(`>${fmt(gas, 0)}<`), String(gas));
  assert.ok(html.includes(">Generation source<") && !html.includes(">Onshore wind<") && !html.includes(">Solar") && !html.includes(">Bid<"));
  assert.ok(c.bid.value > 0 && c.bid.value === c.bid.preset && html.includes(`>${fmt(c.bid.value, 0)}<`) && html.includes("€/MWh"));
  assert.ok(html.includes(">Link 1<") && html.includes(">Link 4<") && !html.includes(">EstLink"));
  assert.ok(html.includes("Installed capacity and generation") && !html.includes("and bids"));
  assert.doesNotMatch(SLIDES[2](input(trio)), /THE PANEL/); // none without the panel's controls
});

test("the plant's account for the state: the saving over the plant's life less the contract's cost over its term; the import bill for reference (D-246, D-247, D-250, D-260)", () => {
  // a plant on 2 SMR's runs, 630 MW in every hour, so that the contract settles
  const H = r.view.zones[0].price.length;
  const plant = { mw: new Float32Array(H).fill(630), month: Uint8Array.from({ length: H }, (_, h) => Math.min(11, Math.floor(h / 732))) };
  const tr: Trio = { ...trio, smr2: trio.smr2!.map((x) => ({ ...x, view: { ...x.view, plant } })) };
  const html = SLIDES[14](input(tr)), text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const years = c.capex!.years, per = c.capex!.plantMw, term = c.cfdYears;
  // two columns, one and two units: three units on no slide since D-250
  assert.ok(html.includes("repeat(2, 1fr)") && !text.includes("3 SMR"), text);
  // the saving: 10 TWh × (108.66 − 86.695) €/MWh a year; what the state pays under the contract a year, as the contract card computes it
  const saving = 10 * (0.233 * (120 - 95) + 0.367 * (100 - 80) + 0.4 * (110 - 88));
  const pays = statePaysOf(tr.smr2!, c.strike, c.clause);
  assert.ok(text.includes(`${fmt(saving, 0)} M€ a year × ${years}`));
  // the contract over its term alone, the owner's 40 years, then the market price (D-250)
  assert.ok(Math.abs(pays) > 1 && text.includes(`${fmt(Math.abs(pays), 0)} M€ a year × ${term}`), text);
  assert.ok(text.includes(`, for ${term} years; then the plant sells at the market price`) && text.includes(`for the first ${term} years`), text);
  // the sum: the saving over the life less the contract's cost over its term, nothing else
  const sum = text.slice(text.indexOf("Total gain to Estonia"), text.indexOf("FOR REFERENCE"));
  assert.ok(sum.includes(`Total gain to Estonia over ${years} years: consumers and state the consumers' saving plus the state's gain or cost under the contract`), sum); // D-261
  assert.ok(text.includes("The contract for difference: gain or cost to the state"), text);
  assert.ok(!html.includes('r="12" fill="#'), "no plus or minus marks on the rows (D-262)");
  assert.ok(sum.includes(`${signed((saving * years - pays * term) / 1000, 1)} bn €`), sum);
  // one unit has no plant in these runs, so no payment: its sum is its saving
  assert.ok(sum.includes(`${signed((10 * (0.233 * 10 + 0.367 * 8 + 0.4 * 10) * years) / 1000, 1)} bn €`), sum);
  // for reference, after the sum: the import bill's fall (250 M€ paid out against 30 M€ earned) and the plant at the owner's price
  const aside = text.slice(text.indexOf("FOR REFERENCE, NOT IN THE SUM"));
  assert.ok(aside.includes(`${fmt(30 + 250, 0)} M€ a year × ${years}`) && aside.includes(`${signed(((30 + 250) * years) / 1000, 1)} bn €`), aside);
  assert.ok(!aside.includes("Building the plant") && !aside.includes(`630 MW × ${fmt(per, 2)} M€/MW`), aside); // the construction's row out (D-260)
  // without the term the contract runs the whole life, as before D-250
  const whole = SLIDES[14]({ ...input(tr), c: { ...c, cfdYears: null } }).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.ok(whole.includes(`${fmt(Math.abs(pays), 0)} M€ a year × ${years}`) && !whole.includes("then the plant sells"), whole);
});

test("the cables' outages are the panel's what-if, each line 0 MW all year, under run keys of their own (D-221)", () => {
  const s = opening(p);
  const [e2, e12] = OUTAGES.map((lines) => without(s, lines));
  assert.equal(e2.links.whatif.estlink2, "0@01-01..12-31");
  assert.equal(e2.links.whatif.estlink1, s.links.whatif.estlink1); // EstLink 1 as the state has it
  assert.equal(e12.links.whatif.estlink1, "0@01-01..12-31");
  assert.equal(e12.links.whatif.estlink2, "0@01-01..12-31");
  assert.notEqual(runKey(e2), runKey(s)); // the build's sets and the page's cache find them by these keys
  assert.notEqual(runKey(e12), runKey(e2));
  assert.deepEqual(s, opening(p)); // the state given is left as it was
});

test("before the runs are in, every slide of figures says so, and the others are drawn", () => {
  const all = slides(input({}));
  for (const i of [4, 5, 6, 7, 9, 10, 11, 12, 13, 14]) assert.match(all[i], /class="ps-pending">computing…</, `slide ${i + 1}`);
  assert.match(all[8], />computing…</); // the weather years' slide, ninth since D-296
  for (const i of [0, 1, 2, 15]) assert.doesNotMatch(all[i], /computing…/, `slide ${i + 1}`);
  assert.match(all[3], /class="ps-pending">computing…</); // the past years' slide waits for its replays (D-229)
  // one of the deck's scenarios missing is no answer for them
  const three: Trio = { ...trio };
  delete three.smr2;
  assert.match(slides(input(three))[9], /class="ps-pending"/);
  // three units are on no slide, so their runs are waited for by none (D-250)
  const noThree: Trio = { ...trio };
  delete noThree.smr3;
  const all3 = slides(input(noThree, shift(noThree, 5), shift(noThree, 12)));
  for (const [i, h] of all3.entries()) {
    if (i !== REPLAY_SLIDE) assert.doesNotMatch(h, /class="ps-pending"/, `slide ${i + 1}`); // the past years wait for their replays alone
    assert.doesNotMatch(h.replace(/<[^>]+>/g, " "), /three units|3 SMR/, `slide ${i + 1}`);
  }
});

test("the four scenarios' slide: each zone's demand with its growth from 2025's load, none without the load (D-228)", () => {
  // the demand row alone, the first since D-260: from its label to the next row's start
  const row = (h: string) => { const i = h.indexOf(">Demand<"); const j = h.indexOf("padding:13px 0", i); return h.slice(i, j < 0 ? i + 3000 : j); };
  const plain = slides(input(trio))[4]; // the scenarios' slide, fifth since D-295
  assert.doesNotMatch(row(plain), /%/);
  const twh = [...row(plain).matchAll(/>([\d.,]+)<\/span><span[^>]*>TWh/g)].map((m) => Number(m[1]));
  assert.equal(twh.length, 3);
  const withLoad = SLIDES[4]({ ...input(trio), c: { ...c, load2025: { EE: twh[0] / 1.5, LV: twh[1], LT: twh[2] * 2 } } });
  const marks = [...row(withLoad).matchAll(/TWh<\/span><span[^>]*>(<svg[^]*?<\/svg>)?([^<]*)</g)].map((m) => m[2]);
  assert.deepEqual(marks, ["50 %", "0 %", "50 %"]);
  assert.match(row(withLoad), /fill="#[0-9A-Fa-f]{6}"\/><path d="M9\.5 4\.5/); // Lithuania's halving marked down
  // the gas plants of the three zones, each row after its source's icon, as the panel draws them (D-248)
  const gas = plain.slice(plain.indexOf(">Gas plants<"), plain.indexOf(">Oil shale<"));
  assert.equal(gas.match(/class="fl fl-(EE|LV|LT)"/g)?.length, 3);
  // demand the first row, oil shale Estonia's alone after the gas plants (D-260)
  assert.ok(plain.indexOf(">Demand<") < plain.indexOf(">Gas plants<"));
  const shale = plain.slice(plain.indexOf(">Oil shale<"), plain.indexOf(">Onshore wind<"));
  assert.deepEqual(shale.match(/class="fl fl-(EE|LV|LT)"/g), ['class="fl fl-EE"']);
  assert.doesNotMatch(plain, /Gas plants in Estonia/);
  assert.equal(plain.match(/<svg class="ico"/g)?.length, plain.match(/border-top:1px solid #E5E7EB;padding:13px 0/g)?.length);
  // the links in service under the plant, a row per border along the chain with its lines' names and MW, a line switched
  // off left out (D-254); none without the panel's lines
  assert.doesNotMatch(plain, /LINKS IN SERVICE/);
  // the neighbours' scenario named (D-259), each neighbour's average with its unit and its level (D-260)
  assert.match(plain, /NEIGHBOURS' PRICES<\/span>\s*<span[^>]*><b>TYNDP 2024 · Distributed Energy 2035<\/b>/);
  assert.equal(plain.match(/€\/MWh · ×\d/g)?.length, 3);
  const tg = (name: string, border: string, mw: number, on = true): Toggle => ({ name, border, mw, on, planned: false });
  const links = SLIDES[4]({ ...input(trio), lines: [tg("EstLink 1", "EE-FI", 350), tg("EstLink 2", "EE-FI", 650), tg("EstLink 3", "EE-FI", 700, false),
    tg("NordBalt", "LT-SE4", 700), tg("Harmony Link", "LT-PL", 700), tg("LitPol", "LT-PL", 500)] });
  const box = links.slice(links.indexOf("LINKS IN SERVICE"));
  assert.match(box, /fl-EE"[^]*fl-FI"[^]*EstLink 1 · EstLink 2<\/span>\s*<span[^>]*>1 000 MW</);
  assert.match(box, /Harmony Link · LitPol<\/span>\s*<span[^>]*>1 200 MW</);
  assert.doesNotMatch(box, /EstLink 3/);
  assert.equal(box.match(/border-top:1px solid #E5E7EB;padding:4px 0/g)?.length, 3);
});

test("the past years' slide: each gate year a column of Estonia's four charts, each month's figure on the price charts (D-229, D-244)", () => {
  assert.equal(REPLAY_SLIDE, 3); // fourth, after how the model works (D-244)
  const hours = 8760, mix = (k: number) => ({ oil_shale: 1.9 * k, nuclear: 0, bio_waste: 0.6, wind: 1.2, gas: 0.01, hydro: 0.03, solar: 1.1, storage: 0.002, other: 0 });
  const side = (f: (h: number) => number, k: number): Side => ({ price: Float32Array.from({ length: hours }, (_, h) => f(h)), mix: mix(k) });
  const model = side((h) => (h % 24 === 18 ? 450 : 60 + (h % 50)), 1), market = side((h) => (h % 24 === 18 ? 300 : 70 + (h % 40)), 1.05);
  const at = (rep: DeckInput["rep"]) => SLIDES[REPLAY_SLIDE]({ ...input(trio), rep });
  const [y1, y2, y3, y4] = REPLAY_YEARS;
  assert.deepEqual(REPLAY_YEARS, [2023, 2024, 2025, 2026]); // 2026 as far as its months are in (D-253)
  const h = at([{ year: y1, model, market }, { year: y2, model, market }, { year: y3, model: null, market: null }, { year: y4, model: null, market: null }]);
  assert.doesNotMatch(h, /NaN|undefined|Infinity|data-deck="year"/); // every year shown, none to choose
  // two years with their four charts each; the third waits for its replay
  for (const title of ["ENERGY SOURCES, TWh", "PRICE DURATION CURVE, €/MWh", "MONTHLY AVERAGE PRICE, €/MWh", "MONTHLY MEDIAN PRICE, €/MWh"]) assert.equal(h.split(title).length - 1, 2, title);
  assert.equal(h.match(/class="ps-pending">computing…</g)?.length, 2);
  // under each year the model's and the market's average price of the year (D-250, D-251), the difference in per
  // cent out (D-258); the year still computing names its year alone
  const line = `model <b style="font-size:24px;color:#2303BD">${fmt(mean(model.price), 1)}</b> · market <b style="font-size:24px">${fmt(mean(market.price), 1)}</b></span>`; // the figures a size up (D-259)
  assert.equal(h.split(line).length - 1, 2, line); // 99.7 against 98.3 €/MWh
  assert.doesNotMatch(h, /difference/);
  assert.equal(h.split("AVERAGE PRICE OF THE YEAR, €/MWh").length - 1, 2);
  for (const y of REPLAY_YEARS) assert.ok(h.includes(`>${y}</span>`), String(y));
  assert.doesNotMatch(h, /hourly price|from the market's on average/);
  // the duration curve cut at 400 €/MWh, the hours above it counted for each
  assert.ok(h.includes(`above 400 €/MWh: model ${hours / 24} h, market 0 h`));
  // each month's figure by its point, the model's and the market's, on both monthly charts of both years
  assert.equal(h.match(/font-size="13" font-weight="700" fill="#2303BD"/g)?.length, 12 * 2 * 2);
  assert.equal(h.match(/font-size="13" font-weight="600" fill="#03084C"/g)?.length, 12 * 2 * 2);
  assert.ok(h.includes(`>${fmt(monthly(model.price).mean[0]!, 0)}</text>`) && h.includes(`>${fmt(monthly(market.price).median[11]!, 0)}</text>`));
  // the sources: the groups present, each in the Model view's colour, a total per bar; their keys once, in the corner
  assert.match(h, /fill:var\(--g-oil_shale\)/);
  assert.doesNotMatch(h, /--g-nuclear|--g-other/);
  assert.match(h, />4\.8<\/text>/); // the model's 1.9 + 0.6 + 1.2 + 0.01 + 0.03 + 1.1 + 0.002
  // a year whose months are not all in, January to October's 7 296 hours, names them under its year, its monthly
  // figures ending at October; the months by their initials on the four columns' charts (D-253)
  const cut = (x: Side): Side => ({ price: Array.from(x.price).slice(0, 7296), mix: x.mix });
  const part = at([{ year: y4, model: cut(model), market: cut(market) }]);
  assert.ok(part.includes(">Jan–Oct</span>") && !h.includes("Jan–"));
  assert.equal(part.match(/font-size="13" font-weight="700" fill="#2303BD"/g)?.length, 10 * 2);
  assert.ok(part.includes(">J</text>") && part.includes(">D</text>") && !part.includes(">Jan</text>"));
  // the market's line solid, the model's dashed, on the charts and in the keys (D-255)
  assert.equal(h.match(/stroke="#2303BD" stroke-width="3" stroke-dasharray="7 5"/g)?.length, 3 * 2 + 1); // three charts of two years, and the key
  assert.doesNotMatch(h, /stroke="#03084C" stroke-width="2\.5" stroke-dasharray/);
  assert.match(h, /stroke="#2303BD" stroke-width="3" stroke-dasharray="7 5"\/><\/svg> model/);
});

test("the deck's bar has no notes: no button, no N, no panel under the frame (D-321)", () => {
  assert.doesNotMatch(deckShell(), /notes|deck-talk/i);
});
