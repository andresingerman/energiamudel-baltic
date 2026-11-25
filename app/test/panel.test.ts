// R-UI-5, R-UI-6: every control of the panel has an accessible name, in every country view and
// run kind; every preset control that has a source offers it.
import assert from "node:assert/strict";
import { test } from "node:test";
import { presets } from "../scripts/data.ts";
import type { Sources } from "../src/ui/labels.ts";
import { fmt } from "../src/ui/labels.ts";
import type { Country } from "../src/ui/panel.ts";
import { COUNTRIES, OFF_ALL_YEAR, bidOffset, bidText, choose, gasBidText, growthMark, panelHtml, scenarioChips, setInputs, sumHint, toggleLine, typed } from "../src/ui/panel.ts";
import { opening, replayState, withProfile } from "../src/state/model.ts";
import { docsHtml } from "../src/ui/docs.ts";
import { assertNamed } from "./named.ts";

const p = presets();
const sources: Sources = { documents: {}, families: {}, records: {} };

test("every input, select, textarea and button has an accessible name", () => {
  for (const state of [opening(p), replayState(p, 2026)]) {
    for (const country of COUNTRIES as Country[]) {
      const html = panelHtml({ p, sources, state, country, set() {}, select() {} });
      assertNamed(html, `${state.run} ${country}`);
      if (state.run === "scenario" && ["EE", "LV", "LT"].includes(country)) assert.ok(html.includes("data-src="), `${country}: no sources`);
    }
  }
});

test("the results' controls are named too: the documentation tabs (the contract card out, D-294; the adequacy tab out, D-320)", () => {
  assertNamed(docsHtml("faq", "<p>text</p>"), "documentation tabs");
});

test("the demand and border-price hints scale the run's inputs, and wait while they are stale", () => {
  const state = opening(p);
  state.zones.EE.multiplier = 1.1;
  state.zones.EE.firmMw = 500;
  state.level.FI = 1.25;
  // two years weighted 1:3, as a set's cards are
  const inputs = setInputs(state, [
    { weight: 1, inputs: { hours: 8760, loadTwh: [8, 7, 12], price: { FI: 20, SE4: 50, PL: 90 } } },
    { weight: 3, inputs: { hours: 8760, loadTwh: [12, 7, 12], price: { FI: 60, SE4: 50, PL: 90 } } },
  ]);
  const html = (country: Country, s = state) => panelHtml({ p, sources, state: s, country, inputs, set() {}, select() {} });
  assert.ok(html("EE").includes("11.00 TWh × 1.10 + 4.38 TWh constant load (500 MW × 8 760 h) = 16.48 TWh a year"));
  // a scenario's level shows the average price it makes in its box, with no line under the slider (D-067)
  assert.match(html("FI"), /id="v-FI\.level"[^>]*data-base="50"[^>]*value="62\.5"/);
  assert.ok(!html("FI").includes("average price 50.0 €/MWh × 1.25"));
  assert.ok(html("FI").includes("FI price level"));
  const other = structuredClone(state);
  other.zones.EE.demand = "own";
  assert.ok(html("EE", other).includes("… TWh a year"));
});

test("a line's switch: a planned line in and out of service, a line in service off for the year and back", () => {
  const s = opening(p);
  assert.equal(s.links.on.estlink3, false); // off in 2035 as in S1 (D-036)
  const on = toggleLine(p, s, "estlink3");
  assert.equal(on.links.on.estlink3, true);
  assert.equal(toggleLine(p, on, "estlink3").links.on.estlink3, false);
  const out = toggleLine(p, s, "estlink2");
  assert.equal(out.links.whatif.estlink2, OFF_ALL_YEAR);
  assert.equal(toggleLine(p, out, "estlink2").links.whatif.estlink2, "none");
  const held = structuredClone(s);
  held.links.whatif.nordbalt = "300@01-10..01-20";
  assert.equal(toggleLine(p, held, "nordbalt").links.whatif.nordbalt, OFF_ALL_YEAR);
  // the panel shows each switch with its state for assistive technology
  const html = panelHtml({ p, sources, state: out, country: "EE", set() {}, select() {} });
  assert.ok(html.includes('role="switch" aria-checked="false" data-switch="estlink2"'));
  assert.ok(html.includes('role="switch" aria-checked="true" data-switch="estlink1"'));
});

test("the neighbours' box: one list of every profile and year the year files hold; each level ends in a box with its average price (D-046, D-066)", () => {
  const s0 = opening(p);
  const html = panelHtml({ p, sources, state: s0, country: "EE", set() {}, select() {} });
  assertNamed(html, "neighbours");
  assert.doesNotMatch(html, /data-set="profile"|data-act="profile-other"/);   // no buttons
  assert.equal((html.match(/<option value="(DE|GA|NT|NTplus)_\d{4}"/g) ?? []).length, 11);
  // open, a line names who made the profile, its name and year and the averages; closed, the short line lies over it (D-225)
  assert.match(html, /<option value="DE_2035" selected>TYNDP 2024 · Distributed Energy 2035 — 🇫🇮 40 {2}🇸🇪 46 {2}🇵🇱 57 €\/MWh<\/option>/u);
  assert.match(html, /<\/select><span class="sel-short" aria-hidden="true">TYNDP 2024 · Distributed Energy 2035<\/span>/u);
  assert.match(html, /<option value="REAL_2025">Actual prices 2025 — 🇫🇮 41 {2}🇸🇪 60 {2}🇵🇱 97 €\/MWh<\/option>/u);
  // the research's two tight profiles (D-121)
  assert.match(html, /<option value="TIGHT_2035">Research · tight case, each on its own 2035 — 🇫🇮 98 {2}🇸🇪 83 {2}🇵🇱 114 €\/MWh<\/option>/u);
  assert.match(html, /<option value="TIGHTJ_2035">Research · tight case, all at once 2035 — 🇫🇮 103 {2}🇸🇪 97 {2}🇵🇱 106 €\/MWh<\/option>/u);
  assert.doesNotMatch(html, /NTplus_2030/); // D-050
  const nt = panelHtml({ p, sources, state: withProfile(s0, "NT", 2040), country: "EE", set() {}, select() {} });
  // each level's tick and snap at the profile's default: the owner's levels on DE 2035, not amber there; ×1 on the others (D-226)
  for (const [z, v] of [["FI", "1.8786"], ["SE4", "1.9607"], ["PL", "2.0982"]]) {
    assert.match(html, new RegExp(`class="nbox num" id="v-${z}\\.level"`));
    assert.match(html, new RegExp(`id="c-${z}\\.level" data-k="${z}\\.level" data-preset="${v}"`));
    assert.match(nt, new RegExp(`id="c-${z}\\.level" data-k="${z}\\.level" data-preset="1"`));
  }
  // the owner's levels marked as such under the sliders on DE 2035 alone (D-231)
  assert.match(html, /<div class="hint">the owner(?:'|&#39;)s levels for the opening; the profile as published averages 39\.9 \/ 45\.9 \/ 57\.2 €\/MWh<\/div>/);
  assert.doesNotMatch(nt, /the owner(?:'|&#39;)s levels for the opening/);
  assert.match(nt, /<option value="NT_2040" selected>TYNDP 2024 · National Trends 2040 — 🇫🇮 119 {2}🇸🇪 113 {2}🇵🇱 206 €\/MWh<\/option>/u);
  assert.match(panelHtml({ p, sources, state: withProfile(s0, "REAL", 2025), country: "EE", set() {}, select() {} }), /do not follow the climate year(?:'|&#39;)s weather/); // in the heading's i since the design notes of 2026-10-19
  const tight = panelHtml({ p, sources, state: withProfile(s0, "TIGHTJ", 2035), country: "EE", set() {}, select() {} });
  assert.match(tight, /all three at once, solved together[^]*frozen at ERAA 2025(?:'|&#39;)s fuel prices of 2035/);
  // the level's box: the average price the level makes of the run's, waiting until a run has reported it
  assert.match(html, /id="v-FI\.level" data-n="FI\.level" data-unit="€\/MWh" data-base="" disabled/);
  const state = { ...s0, level: { FI: 1.5, SE4: 1, PL: 1 } }; // the opening's own levels apart (D-182)
  const run = panelHtml({ p, sources, state, country: "EE", set() {}, select() {},
    inputs: setInputs(state, [{ weight: 1, inputs: { hours: 8736, loadTwh: [11.6, 7, 13], price: { FI: 40, SE4: 46, PL: 57 } } }]) });
  assert.match(run, /id="v-FI\.level" data-n="FI\.level" data-unit="€\/MWh" data-base="40" step="0\.1" min="0" value="60\.0"/);
  assert.equal(typed("50", 40, 0.5, 2, 1), 1.25);                 // €/MWh typed → the level
  // the factor stands left of the box, as generation's growth does (D-068)
  assert.match(run, /<span class="gr up" data-gr="FI\.level" title="the profile&#39;s average 40\.0 €\/MWh, every hour times 1\.50">▲ ×1\.50<\/span><input type="number"[^>]*id="v-FI\.level"/);
  assert.match(run, /<span class="gr" data-gr="SE4\.level"[^>]*>×1\.00<\/span>/);
  assert.match(growthMark({ p, sources, state: { ...s0, level: { ...s0.level, PL: 0.8 } }, country: "EE", set() {}, select() {} }, "PL.level"), /class="gr down".*▼ ×0\.80/);
  // the profile as published since D-194: no box re-prices it to the scenario's gas and CO₂; the levels reach ×3
  assert.doesNotMatch(html + nt, /neighbourFuel|Re-price/);
  assert.match(html, /id="c-PL\.level"[^>]* max="3" /);
  // Estonia's run-of-river hydro: the preset is the ceiling, for the slider and for a typed value
  assert.match(html, /id="c-EE\.mw\.hydro_ror"[^>]* max="8" /);
  assert.equal(typed("400", null, 0, 8, 8, true), 8);
});

test("a slider's mark names its growth from the latest observed year that has the figure (D-052, D-057, D-062)", () => {
  const fleet = { EE: { wind_onshore: 682, solar: 1174, gas_chp: 13.5, oil_shale_auvere: 270, oil_shale_pf: 1060 }, LV: {}, LT: {} };
  const ref25 = { fleets: [{ year: 2025, cap: fleet }], twh: { year: 2025, zones: { EE: 8, LV: 7, LT: 12 } } };
  const state = opening(p);
  const ctx = { p, sources, state, country: "EE" as Country, set() {}, select() {}, ref: ref25,
    inputs: setInputs(state, [{ weight: 1, inputs: { hours: 8760, loadTwh: [11.6, 7, 13], price: { FI: 40, SE4: 46, PL: 57 } } }]) };
  assert.match(growthMark(ctx, "EE.mw.wind_onshore"), /class="gr up".*title="from 2025: 682 MW">▲ 91 %/); // 1 300 MW, the owner's opening (D-182)
  assert.equal(growthMark(ctx, "EE.mw.wind_offshore"), '<span class="gr" data-gr="EE.mw.wind_offshore"></span>'); // none then, none now
  assert.match(growthMark(ctx, "EE.mw.oil_shale_auvere"), /class="gr down".*title="all oil shale 270 MW, from 2025: 1 330 MW">▼ 80 %/);
  assert.match(growthMark(ctx, "EE.mw.gas_ocgt"), /title="all gas 1 364 MW, from 2025: 14 MW">▲ ×101/);
  assert.match(growthMark(ctx, "EE.mw.battery"), /title="from 2025: 27 MW">▲ ×56/);   // Elering's count: A68 of 2025 has none
  assert.equal(growthMark(ctx, "LV.mw.battery"), '<span class="gr" data-gr="LV.mw.battery"></span>'); // no fleet of Latvia here
  assert.equal(growthMark({ ...ctx, ref: null }, "EE.mw.solar"), '<span class="gr" data-gr="EE.mw.solar"></span>');
  // 2026 comes first where it has the zone's fleet; its A68 counts the batteries
  const ref26 = { ...ref25, fleets: [{ year: 2026, cap: { EE: { wind_onshore: 694, battery: 218, oil_shale_auvere: 1215 }, LV: {}, LT: {} } }, ...ref25.fleets] };
  const c26 = { ...ctx, ref: ref26 };
  assert.match(growthMark(c26, "EE.mw.wind_onshore"), /^<span class="gr up" data-gr="EE\.mw\.wind_onshore" title="from 2026: 694 MW">▲ 87 %<\/span>$/);
  assert.match(growthMark(c26, "EE.mw.battery"), /title="from 2026: 218 MW">▲ 588 %/);
  assert.match(growthMark(c26, "EE.mw.solar"), /class="gr up".*▲ new/);          // 2026's fleet here has no solar
  assert.match(growthMark(c26, "EE.multiplier"), /class="gr up".*title="from 2025: 8\.00 TWh">▲ 45 %/);
  assert.equal(growthMark(c26, "EE.firm_mw"), '<span class="gr" data-gr="EE.firm_mw"></span>');
  const html = panelHtml(c26);
  // above the slider, at the label line's end; the number in its tile (the owner asked, 2026-10-21)
  assert.match(html, /<\/label><span class="gr up" data-gr="EE\.mw\.wind_onshore" title="from 2026: 694 MW">▲ 87 %<\/span><\/div>\s*<span class="val num tile"><input type="number"/);
  assert.ok(!/% from 20\d\d \(/.test(html));                                   // no line under the sliders (D-062)
  assert.equal(sumHint(c26, "EE", "gas_ocgt"), "all gas 1 364 MW");               // the rows' sum stays
});

test("the capacity box: demand first and apart, a constant load after it, a number box at each slider's end (D-056)", () => {
  const state = opening(p);
  const inputs = setInputs(state, [{ weight: 1, inputs: { hours: 8736, loadTwh: [11.6, 7, 13], price: { FI: 40, SE4: 46, PL: 57 } } }]);
  const html = panelHtml({ p, sources, state, country: "EE" as Country, set() {}, select() {}, inputs });
  const at = (x: string) => { const i = html.indexOf(x); assert.ok(i >= 0, x); return i; };
  assert.ok(at('id="c-EE.multiplier"') < at('id="c-EE.firm_mw"') && at('id="c-EE.firm_mw"') < at('id="c-EE.mw.wind_onshore"'));
  assert.match(html, /class="row ic dem">\s*<span class="big"><svg[^]*?<\/svg><\/span><div class="lbl-line"><label for="c-EE\.multiplier"/); // the glyph beside the label and the track (D-060)
  assert.match(html, /id="v-EE\.multiplier" data-n="EE\.multiplier" data-unit="TWh" data-base="11\.6" step="0\.01" min="0" value="11\.60"/);
  assert.match(html, /id="v-EE\.mw\.solar" data-n="EE\.mw\.solar" data-unit="MW" step="1" min="0" value="2500"/); // the owner's opening (D-182)
  assert.match(html, /in place of Elering and TalTech(?:'|&#39;)s S1: 1 785 MW/); // S1's own figure in the slider's note
  // before a run has reported the load the TWh box waits
  assert.match(panelHtml({ p, sources, state, country: "EE" as Country, set() {}, select() {} }), /data-unit="TWh" data-base="" disabled/);
  assert.equal(typed("2500", null, 0, 2000, 1785), 2500);      // megawatts: free above the slider's range
  assert.equal(typed("-5", null, 0, 2000, 1785), 0);
  assert.equal(typed("abc", null, 0, 2000, 1785), 1785);
  assert.equal(typed("14,5", 11.6, 0.5, 2, 1), 1.25);          // TWh → the multiplier
  assert.equal(typed("40", 11.6, 0.5, 2, 1), 2);               // within the slider's range
});

test("Estonia's capacity box has a slider for every source of Elering's base mix, its gas row by row (D-059)", () => {
  const state = opening(p);
  const html = panelHtml({ p, sources, state, country: "EE" as Country, set() {}, select() {} });
  for (const id of ["EE.mw.wind_onshore", "EE.mw.solar", "EE.mw.battery", "EE.mw.oil_shale_auvere", "EE.part.gas_existing", "EE.part.gas_reserve_procurement",
    "EE.part.gas_restoration", "EE.part.capacity_mechanism", "EE.mw.biomass_chp", "EE.mw.waste", "EE.mw.hydro_ror"]) assert.ok(html.includes(`id="c-${id}"`), id);
  assert.ok(!html.includes('id="c-EE.mw.gas_ocgt"'));                     // the class is its rows' sum
  assert.match(html, /id="v-EE\.part\.gas_restoration"[^>]*value="900"/);
  assert.ok(!html.includes("Kept as the preset: biomass"));
  // Latvia keeps its one slider of gas
  assert.ok(panelHtml({ p, sources, state, country: "LV" as Country, set() {}, select() {} }).includes('id="c-LV.mw.gas_ccgt"'));
});

test("the Links map's lines in service carry a streak each way along their edges, the others none (D-208)", () => {
  const html = panelHtml({ p, sources, state: opening(p), country: "EE" as Country, set() {}, select() {} });
  const on = html.match(/class="ln ln-on"/g)?.length ?? 0;
  assert.ok(on > 0);
  assert.equal(html.match(/class="streak"/g)?.length, 2 * on);
  assert.equal(html.match(/<linearGradient id="streak-[^"]+-[fb]"/g)?.length, 2 * on);
  assert.match(html, /<linearGradient id="streak-estlink1-f"[^>]*spreadMethod="repeat"/);
  // each gradient's four ends move, which Safari draws, not its gradientTransform, which it does not (E-180)
  assert.equal(html.match(/<animate attributeName="[xy][12]"/g)?.length, 8 * on);
  assert.ok(!html.includes("gradientTransform"));
  assert.ok(!html.includes('id="streak-estlink3-')); // off in the opening
});

test("Estonia's oil shale and gas fold under a line each, closed until opened; Latvia's one row of gas stays a row (D-204)", () => {
  const state = opening(p);
  const html = panelHtml({ p, sources, state, country: "EE" as Country, set() {}, select() {} });
  assert.equal(html.match(/data-fold="/g)?.length, 2);
  assert.match(html, /aria-expanded="false" data-fold="EE\.oil_shale">.*?Oil shale<\/span><span class="sfold-n">4 items<\/span>.*?data-total="EE\.oil_shale">270 MW<\/b><\/button><div class="sfold-rows" hidden>/);
  assert.match(html, /aria-expanded="false" data-fold="EE\.gas">.*?Natural gas<\/span><span class="sfold-n">4 items<\/span>.*?data-total="EE\.gas">1\s364 MW<\/b><\/button><div class="hint sum num">bid \d+ €\/MWh<\/div><div class="sfold-rows" hidden>/);
  // the three blocks and retort gas in the first fold; the line takes the place of the rows' sum
  const shale = html.split('data-fold="EE.oil_shale"')[1].split('data-fold="EE.gas"')[0];
  for (const c of ["oil_shale_auvere", "oil_shale_cfb", "oil_shale_pf", "retort_gas"]) assert.ok(shale.includes(`id="c-EE.mw.${c}"`), c);
  assert.ok(!html.includes("data-growth="));
  assert.ok(!panelHtml({ p, sources, state, country: "LV" as Country, set() {}, select() {} }).includes("data-fold"));
});

// the batteries' bid is the register's Δ, as the panel rounds it
// the batteries' figure is their cycling cost, marked Δ (the owner asked, 2026-11-24)
const delta = `Δ\u202f${Math.round((p as unknown as { fitted: { battery_delta: { EE: { eur_mwh: number } } } }).fitted.battery_delta.EE.eur_mwh)}`;

test("each generation row shows its source's bid right of the slider, following the two prices (D-065)", () => {
  const state = opening(p);
  // a plain tag's figure, or the value of a thermal bid's box (D-090)
  const bids = (s: typeof state) => [...panelHtml({ p, sources, state: s, country: "EE" as Country, set() {}, select() {} }).matchAll(/class="bid num[^"]*"[^>]*>(?:<b>([^<]*)<\/b>|<input[^>]*value="([^"]*)")/g)].map((m) => m[1] ?? m[2]);
  // the plant, wind on and off shore, solar, batteries (the spread they need), Auvere, the validation's other oil-shale
  // blocks and retort gas at 0 MW (2026-10-21), four rows of gas, biomass, waste (given output, D-074), run-of-river
  // gas: the gas plants' one bid, a combined-cycle plant's cost plus the fitted adder (D-164)
  assert.deepEqual(bids(state), [fmt(-600, 0), "0", "0", "0", delta, "213", "251", "365", "131", "185", "185", "185", "185", "111", "given", "0"]);
  const dear = bids({ ...state, fuelGas: 60 });
  assert.ok(Number(dear[9]) > 185 && dear[5] === "213" && dear[1] === "0");   // gas moves; oil shale and wind do not
});

test("Latvia's and Lithuania's capacity boxes are Estonia's in kind: a slider, an icon and a bid for every source of the preset (D-069)", () => {
  const state = opening(p);
  const html = (z: Country) => panelHtml({ p, sources, state, country: z, set() {}, select() {} });
  const ids = (h: string, z: string) => [...h.matchAll(new RegExp(`id="c-${z}\\.((?:mw|part)\\.[a-z_]+)"`, "g"))].map((m) => m[1]);
  assert.deepEqual(ids(html("LV"), "LV"), ["mw.wind_onshore", "mw.wind_offshore", "mw.solar", "mw.battery", "mw.gas_ccgt", "mw.biomass_chp", "mw.hydro_daugava"]);
  assert.deepEqual(ids(html("LT"), "LT"), ["mw.wind_onshore", "mw.wind_offshore", "mw.solar", "mw.battery", "mw.gas_ccgt", "mw.biomass_chp", "mw.waste", "mw.hydro_ror", "mw.hydro_ps"]);
  // ERAA's several rows of solar stay one slider; nothing is left "kept as the preset"; no plant outside Estonia
  for (const z of ["LV", "LT"] as Country[]) assert.ok(!/\.part\.|Kept as the preset|SMR units/.test(html(z)), z);
  const bids = (h: string) => [...h.matchAll(/class="bid num[^"]*"[^>]*>(?:<b>([^<]*)<\/b>|<input[^>]*value="([^"]*)"[^>]*>)<span>([^<]*)</g)].map((m) => `${m[1] ?? m[2]} ${m[3]}`);
  assert.deepEqual(bids(html("LV")), ["0 €/MWh", "0 €/MWh", "0 €/MWh", `${delta} €/MWh`, "185 €/MWh", "111 €/MWh", "water value"]);
  assert.equal(bids(html("LT")).at(-1), "60 €/MWh");                // Kruonis: the spread it needs
  assert.ok(!html("LT").includes('data-hard="1"'));                  // the ceiling of run-of-river hydro is Estonia's alone
});

test("choosing a scenario returns every zone's demand and capacities to the presets and keeps the rest (D-081)", () => {
  const s0 = opening(p);
  const moved = { ...s0, level: { ...s0.level, FI: 1.3 }, fuelGas: 50,
    zones: { ...s0.zones, EE: { ...s0.zones.EE, multiplier: 1.2, mw: { ...s0.zones.EE.mw, wind_offshore: 1001, solar: 3000 } } } };
  const ctx = { p, sources, state: moved, country: "EE" as Country, set() {}, select() {} };
  const next = choose(ctx, "scenario", "smr2");
  assert.equal(next.scenario, "smr2");
  assert.deepEqual(next.zones, s0.zones);                 // the sliders are the scenario's presets again
  assert.equal(next.level.FI, 1.3);                        // the neighbours and the fuel stay
  assert.equal(next.fuelGas, 50);
});

test("a zone moved off the scenario's presets presses \"Other\" in place of the scenario; a chip returns it (D-088)", () => {
  const s0 = opening(p);
  const pressed = (h: string) => [...h.matchAll(/aria-pressed="true"[^>]*>([^<]+)</g)].map((m) => m[1]);
  const ctx = (state: typeof s0) => ({ p, sources, state, country: "EE" as Country, set() {}, select() {} });
  assert.deepEqual(pressed(scenarioChips(ctx(s0))), ["0 SMR"]);
  const neighbours = { ...s0, level: { ...s0.level, FI: 1.3 } };          // what a chip keeps does not count
  assert.deepEqual(pressed(scenarioChips(ctx(neighbours))), ["0 SMR"]);
  const moved = { ...s0, zones: { ...s0.zones, LV: { ...s0.zones.LV, mw: { ...s0.zones.LV.mw, solar: 3000 } } } };
  assert.deepEqual(pressed(scenarioChips(ctx(moved))), ["Other"]);
  assert.deepEqual(pressed(scenarioChips(ctx(choose(ctx(moved), "scenario", "smr1")))), ["1 SMR"]);
});

test("a bid's tip takes it apart: fuel over efficiency, CO₂ times tonnes, running costs, summing to the bid (D-089)", async () => {
  const { bidParts, impliedBid } = await import("../src/engine/build.ts");
  const s0 = opening(p);
  const sc = { fuelPath: s0.fuel, target: s0.target, gasFloor: null, gasPrice: s0.fuelGas, euaPrice: s0.fuelEua } as never;
  for (const c of ["gas_ocgt", "gas_ccgt", "oil_shale_auvere", "biomass_chp", "nuclear"]) {
    const b = bidParts(p, sc, c)!;
    const sum = b.fuelPrice / b.eff + b.euaPrice * b.tPerMwh + b.vom + b.premium;
    assert.ok(Math.abs(sum - b.total) < 1e-9 && Math.abs(b.total - (impliedBid(p, sc, c) ?? 0)) < 1e-9, c);
  }
  const ocgt = bidText(bidParts(p, sc, "gas_ocgt")!);
  assert.match(ocgt, /^Bid 189\.0 €\/MWh/);
  assert.match(ocgt, /gas 38\.2 €\/MWh of fuel ÷ efficiency 0\.42 = 90\.9/);
  assert.match(ocgt, /CO₂ 197\.5 €\/t × 0\.489 t\/MWh = 96\.5/);
  assert.doesNotMatch(bidText(bidParts(p, sc, "biomass_chp")!), /CO₂/);    // biogenic: no CO₂ line
  // the gas plants' one bid (D-164): a combined-cycle plant's costs and the fitted adder sum to it
  const { gasBidParts } = await import("../src/engine/build.ts");
  const g = gasBidParts(p, sc);
  assert.ok(Math.abs(g.fuelPrice / g.eff + g.euaPrice * g.tPerMwh + g.vom + g.adder - g.total) < 1e-9 && g.eff === bidParts(p, sc, "gas_ccgt")!.eff);
  assert.match(gasBidText(g), /^Bid 184\.6 €\/MWh, the same for every gas plant/);
  assert.match(gasBidText(g), /fitted adder 42\.50/);
});

test("a scenario's thermal bids are boxes to type into; a replay's are not; a scenario chip keeps a moved bid (D-090)", () => {
  const s0 = opening(p);
  const ctx = (state: typeof s0) => ({ p, sources, state, country: "EE" as Country, set() {}, select() {} });
  const boxes = (h: string) => [...h.matchAll(/data-bid="([^"]+)"[^>]*value="([^"]*)"/g)].map((m) => `${m[1]}=${m[2]}`);
  const ee = boxes(panelHtml(ctx(s0)));
  assert.ok(ee.includes("gas=185") && ee.some((b) => b.startsWith("EE.oil_shale_auvere=")), ee.join(" "));
  // the plant and waste keep a plain tag, and so does each gas row: the gas plants' one bid is one box (D-164)
  assert.ok(!ee.some((b) => b.includes("nuclear") || b.includes("waste") || b.includes("gas_")), ee.join(" "));
  const moved = { ...s0, bids: { gas: -69 } };
  assert.ok(boxes(panelHtml(ctx(moved))).includes("gas=116"));
  assert.match(panelHtml(ctx(moved)), /class="nbox num changed" id="c-gasbid"/);
  const shale = { ...s0, bids: { "EE.oil_shale_auvere": 20 } };
  assert.match(panelHtml(ctx(shale)), /class="bid num changed"/);
  assert.deepEqual(choose(ctx(moved), "scenario", "smr2").bids, moved.bids);
  assert.deepEqual([...scenarioChips(ctx(moved)).matchAll(/aria-pressed="true"[^>]*>([^<]+)</g)].map((m) => m[1]), ["0 SMR"]);
  assert.deepEqual(boxes(panelHtml(ctx(replayState(p, 2025)))), []);
});

test("hand-set bids after the review (E-075): the text leaves out a bid the fleet cannot take, the box holds a plain number, typing back the shown figure is no move", async () => {
  const { serialize, parse } = await import("../src/state/text.ts");
  const { bidParts } = await import("../src/engine/build.ts");
  const s0 = opening(p);
  // a bid on a class Estonia's fleet does not have: kept in the state, left out of the text, which reads back
  const odd = { ...s0, bids: { "EE.gas_ccgt": -30, "EE.biomass_chp": -20 } };
  const text = serialize(odd);
  assert.ok(!text.includes("bid.EE.gas_ccgt") && text.includes("bid.EE.biomass_chp=-20"));
  assert.deepEqual(parse(p, text).bids, { "EE.biomass_chp": -20 });
  // the base is the costs' bid even where the bid is held at 0
  const sc = { fuelPath: s0.fuel, target: s0.target, gasFloor: null, gasPrice: 20, euaPrice: s0.fuelEua } as never;
  const held = bidParts(p, sc, "gas_ocgt", -1000)!;
  assert.equal(held.total, 0);
  assert.ok(held.cost > 100 && Math.abs(held.cost - bidParts(p, sc, "gas_ocgt")!.total) < 1e-9);
  // a bid of 1 000 or more is a plain number in the box
  const ctx = (state: typeof s0) => ({ p, sources, state, country: "EE" as Country, set() {}, select() {} });
  assert.match(panelHtml(ctx({ ...s0, bids: { gas: 1311 } })), /data-bid="gas"[^>]*value="1496"/);
  // the box shows whole euros: typing back 213 against a cost of 212.54 is no move; 250 is +37.5
  assert.equal(bidOffset("213", 212.54), null);
  assert.equal(bidOffset("", 212.54), null);
  assert.equal(bidOffset("250", 212.54), 37.5);
  assert.equal(bidOffset("0", 1500), -1000);
  // each box has its own id, so the focus returns to the row being edited
  const ids = [...panelHtml(ctx(s0)).matchAll(/class="bid-in num" id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test("a scenario button under National Trends+ keeps the family's own demand (E-076)", () => {
  const nt = withProfile(opening(p), "NTplus", 2035);
  assert.equal(nt.zones.EE.demand, "own");
  const ctx = { p, sources, state: nt, country: "EE" as Country, set() {}, select() {} };
  const next = choose(ctx, "scenario", "smr1");
  assert.deepEqual([next.zones.EE.demand, next.zones.LV.demand, next.zones.LT.demand], ["own", "own", "own"]);
  assert.equal(next.zones.EE.mw.wind_onshore, opening(p).zones.EE.mw.wind_onshore);
});

