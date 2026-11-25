// Outlook in the scenario view (R-APP-6, R-TIME-3, R-TIME-4; revision 1.7, D-039): the weights of
// each family and target year, the climate years' rank labels, the weighted headline.
import assert from "node:assert/strict";
import { test } from "node:test";
import { presets, year } from "../scripts/data.ts";
import { opening, runsOf } from "../src/state/model.ts";
import type { YearMeta, YearResult } from "../src/ui/results.ts";
import { labelsOf, setNote, weighted, yearLabel } from "../src/ui/results.ts";

const p = presets();

test("the weights sum to 1 in each family and target year (R-TIME-3)", () => {
  const w = p.weights as unknown as { tyndp2024: Record<string, { value: number }>; tyndp2026: Record<string, { value: number; target_year: number }> };
  assert.ok(Math.abs(Object.values(w.tyndp2024).reduce((s, x) => s + x.value, 0) - 1) < 1e-9);
  const by = new Map<number, number>();
  for (const x of Object.values(w.tyndp2026)) by.set(x.target_year, (by.get(x.target_year) ?? 0) + x.value);
  assert.ok(by.size >= 4);
  for (const [t, s] of by) assert.ok(Math.abs(s - 1) < 1e-9, `${t}: ${s}`);
  assert.deepEqual(runsOf(p, opening(p)).map((r) => [r.label, r.weight]), [["1995", 0.233], ["2008", 0.367], ["2009", 0.4]]);
  // National Trends+: TYNDP 2026's three weather scenarios of 2035 with the Methodology Report's weights
  const nt = runsOf(p, { ...opening(p), family: "tyndp2026", profile: "NTplus" });
  assert.deepEqual(nt.map((r) => [r.key, r.weight]), [["ws032", 0.24], ["ws037", 0.43], ["ws059", 0.33]]);
});

test("the climate years carry R-TIME-4's ranks among the 38 PECD years", () => {
  const rank = (k: string) => (year(k).meta as { labels: Record<string, number> }).labels;
  assert.equal(rank("cy1995").ee_wind_onshore_rank, 36);
  assert.equal(rank("cy2008").ee_wind_onshore_rank, 37);
  assert.equal(rank("cy2008").ee_solar_rank, 2);
  assert.equal(rank("cy2009").ee_wind_onshore_rank, 1); // the calmest
  for (const k of ["cy1995", "cy2008", "cy2009"]) assert.equal(rank(k).years, 38);
});

test("the headline is the weighted average of the runs", () => {
  const run = (weight: number, mean: number) => ({ weight, view: { zones: [0, 1, 2].map(() => ({ mean })) } }) as unknown as YearResult;
  assert.deepEqual(weighted([run(0.233, 60), run(0.367, 50), run(0.4, 40)], (v, z) => v.zones[z].mean).map((x) => Math.round(x * 1e9) / 1e9), [48.33, 48.33, 48.33]);
});

test("a weather scenario is labelled by its climate model, modelled year and factors, never as a historical year", () => {
  const label = (k: string) => yearLabel({ labels: labelsOf(year(k).meta as YearMeta) } as YearResult);
  assert.match(label("ws037"), /climate model CMR5, modelled year 2036\), Estonian onshore wind capacity factor 0\.344 and solar 0\.096 \(LV's/);
  // the set's note says once that the weather scenarios' temperature is a climatology (E-133, E-137)
  const set = (keys: string[]) => setNote(keys.map((k) => ({ key: k, label: k, weight: 1 / keys.length, labels: labelsOf(year(k).meta as YearMeta) }) as YearResult));
  assert.equal(set(["ws037", "ws037", "ws037"]).match(/without cold spells/g)?.length, 1);
  assert.doesNotMatch(set(["cy1995", "cy2008", "cy2009"]), /cold spells/);
  // the climate years say Lithuania's onshore wind runs below PECD's factor (D-107); the weather scenarios do not
  assert.match(set(["cy1995", "cy2008", "cy2009"]), /Lithuania's onshore wind at 0\.80 of PECD's capacity factor/);
  assert.doesNotMatch(set(["ws037"]), /Lithuania's onshore wind/);
  assert.equal(label("cy2009"), ", Estonian onshore wind rank 1, solar rank 15 and demand-peak rank 18 of 38 weather years (1 = the lowest)");
});
