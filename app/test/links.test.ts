// R-LINK-1, R-LINK-3 … R-LINK-6 (M5; DECISIONS D-031, D-032): a scenario year's borders built from
// their lines, the what-ifs in both kinds of run, and the outage labels of an observed year.
import assert from "node:assert/strict";
import { test } from "node:test";
import { join } from "node:path";
import { EXPORT, links, presets, readJson, year } from "../scripts/data.ts";
import type { Year } from "../src/contract/year.ts";
import { MAINTENANCE_START, availability, build } from "../src/engine/build.ts";
import type { State } from "../src/state/model.ts";
import { OWN, demandPresets, engineScenario, fleetOf, fleetPresets, opening, plannedOn, replayState, whatIf } from "../src/state/model.ts";
import { replay } from "../src/state/scenario.ts";
import type { Attribution } from "../src/ui/attribution.ts";
import { labels, outMasks } from "../src/ui/attribution.ts";

const p = presets();
const L = links();
const cy = year("cy2009");
const mean = (a: ArrayLike<number>) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s / a.length; };
const near = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} ≠ ${b}`);

/** A border's capacity in a run: fwd along the code, rev against it; an observed year with the
 * cables' A78 events, as the worker gives them. */
function ntc(s: State, code: string, y: Year = cy): { fwd: Float64Array; rev: Float64Array } {
  const sc = engineScenario(p, y, s);
  if (y.meta.kind === "observed") {
    const att = readJson<Attribution>(join(EXPORT, "attribution", `${y.meta.key}.json.gz`));
    sc.links!.out = outMasks(att, Number(y.meta.key), y.meta.hours, ["estlink1", "estlink2"]);
  }
  const pb = build(y, p, y.meta.kind === "observed" ? null : L, sc);
  const i = ["EE-LV", "LV-LT"].indexOf(code);
  if (i >= 0) return pb.links[i];
  const b = pb.borders.find((x) => x.code === code)!;
  return { fwd: b.ntcExp, rev: b.ntcImp };
}

test("a cable's typical profile has its documented average availability, its maintenance from 1 June", () => {
  for (const [k, l] of Object.entries(p.links.lines)) {
    if (l.kind !== "hvdc") continue;
    const a = availability(l.availability!.value, l.planned_share!.value, MAINTENANCE_START, 8760);
    near(mean(a), l.availability!.value, 5e-4);
    if (l.planned_share!.value > 0) {
      assert.equal(a[MAINTENANCE_START], 0, k);
      assert.ok(a[MAINTENANCE_START - 1] > 0, k);
    }
  }
});

test("planned lines follow ERAA's years and switch; at nameplate a border carries ERAA's NTC", () => {
  const s = opening(p);
  s.links.profile = "nameplate";
  s.links.on = plannedOn(p, 2035); // ERAA's years (D-031); the scenario view opens with S1's (D-036)
  assert.deepEqual(s.links.on, { ee_lv_4: true, estlink3: true, harmony: true });
  near(mean(ntc(s, "EE-FI").fwd), mean(L.eraa2025_hourly["EE-FI"].fwd["2035"]));
  s.links.on.estlink3 = false;
  near(mean(ntc(s, "EE-FI").fwd), mean(L.eraa2025_hourly["EE-FI"].fwd["2033"]));
  // an AC border: ERAA's NTC less the balancing reservation of 2025 (R-LINK-5)
  near(mean(ntc(s, "LV-LT").fwd), mean(L.eraa2025_hourly["LV-LT"].fwd["2035"]) - s.links.reserve["LV-LT"]);
  s.links.on.ee_lv_4 = false;
  near(mean(ntc(s, "EE-LV").rev), mean(L.eraa2025_hourly["EE-LV"].rev["2033"]) - s.links.reserve["EE-LV"], 1);
  // typical availability takes each cable's documented share off
  const t = opening(p);
  assert.ok(mean(ntc(t, "LT-SE4").fwd) < 700 && mean(ntc(t, "LT-SE4").fwd) > 0.9 * 700);
});

test("LT-PL is held to Litgrid's plan of the year unless the plan is lifted", () => {
  const s = opening(p);
  Object.assign(s, { target: 2030, profile: "NT", profileYear: 2030 });
  for (const z of ["EE", "LV", "LT"] as const) {
    const fleet = fleetPresets(p, z, 2030)[0];
    s.zones[z] = { ...s.zones[z], fleet, ...fleetOf(p, fleet, z, 2030, s.battery.hours), demand: demandPresets(p, z, 2030)[0] ?? OWN };
  }
  s.links.on = plannedOn(p, 2030);
  const held = ntc(s, "LT-PL");
  assert.equal(Math.max(...held.fwd), 500); // LT→PL, 2027–2030
  assert.equal(Math.max(...held.rev), 350); // PL→LT
  s.links.plan = false;
  // LitPol and Harmony Link at their MW in every hour: AC lines, at ERAA's 0 % for HVAC (D-170)
  assert.ok(ntc(s, "LT-PL").fwd.every((x) => x === p.links.lines.litpol.mw!.value + p.links.lines.harmony.mw!.value));
});

test("a what-if holds a line in its window only, in a scenario year and in an observed one", () => {
  const s = opening(p);
  s.links.whatif.estlink2 = "0@01-10..01-20";
  const a = ntc(s, "EE-FI").fwd, b = ntc(opening(p), "EE-FI").fwd;
  for (let h = 0; h < 8760; h++) {
    const inside = h >= 9 * 24 && h < 20 * 24;
    if (inside) assert.ok(b[h] - a[h] > 600, `hour ${h}`);
    else assert.equal(a[h], b[h]);
  }
  const y = year("2024");
  const r = replayState(p, 2024);
  const plain = ntc(r, "EE-LV", y);
  // with no what-if the app's replay is the scripts' (the golden fixture's) replay
  const legacy = build(y, p, null, replay(p, y)).links[0];
  assert.deepEqual(plain.fwd, legacy.fwd);
  r.links.whatif.ee_lv = "100@01-01..01-31";
  const held = ntc(r, "EE-LV", y);
  for (let h = 0; h < 744; h++) assert.ok(held.fwd[h] <= 100 && held.rev[h] <= 100);
  for (let h = 744; h < 8784; h++) assert.equal(held.fwd[h], plain.fwd[h]);
  // EE-FI in March 2024: EstLink 2 is out since January, so holding EstLink 1 leaves almost nothing
  const ee = replayState(p, 2024);
  ee.links.whatif.estlink1 = "0@03-01..03-31";
  const one = ntc(ee, "EE-FI", y).rev;
  assert.ok(mean(one.subarray(60 * 24, 91 * 24)) < 10);
  ee.links.whatif.estlink2 = "0@03-01..03-31";
  assert.ok(ntc(ee, "EE-FI", y).rev.subarray(60 * 24, 91 * 24).every((x) => x === 0));
});

test("what-if dates: leap years, the 29th on a 365-day axis, a window over the new year", () => {
  assert.deepEqual(whatIf("0@02-29..03-01", true), { mw: 0, from: 59, to: 60 });
  assert.deepEqual(whatIf("0@02-29..03-01", false), { mw: 0, from: 58, to: 59 });
  assert.deepEqual(whatIf("12@12-01..01-31", false), { mw: 12, from: 334, to: 30 });
  assert.equal(whatIf("none", false), null);
  assert.throws(() => whatIf("0@13-01..13-02", false), /no date 13-01/);
});

test("outage labels: a day or longer, both directions of one event as one label, the longest kept", () => {
  const e = (direction: "fwd" | "rev", start: string, end: string) =>
    ({ asset: "Estlink2", border: "EE-FI", direction, start, end, mw_available: 358, planned: false, reason: null });
  const att = {
    a78: [e("fwd", "2024-01-25 22:10:00", "2024-09-03 22:00:00"), e("rev", "2024-01-25 22:10:00", "2024-09-03 22:00:00"),
      e("fwd", "2024-03-01 00:00:00", "2024-03-01 06:00:00")],
    umm: [{ from: "FI", to: "EE", start: "2024-05-01 00:00:00", stop: "2024-05-03 00:00:00", available_mw: 650, installed_mw: 1016, reason: "maintenance" }],
  };
  const { items, more } = labels(att, "EE-FI");
  assert.equal(items.length, 2);
  assert.deepEqual(items[0].ways, ["EE→FI 358 MW left", "FI→EE 358 MW left"]);
  assert.equal(items[1].ways[0], "FI→EE 650 of 1 016 MW");
  assert.equal(more, 0);
  assert.equal(labels(att, "EE-FI", 24, 1).more, 1);
});

test("an observed what-if on EstLink 1 reads its own A78 events: nothing more off while it was out", async () => {
  const y = year("2025");
  const att = readJson<Attribution>(join(EXPORT, "attribution", "2025.json.gz"));
  const run = (whatif: string) => {
    const s = replayState(p, 2025);
    s.links.whatif.estlink1 = whatif;
    const sc = engineScenario(p, y, s);
    sc.links!.out = outMasks(att, 2025, y.meta.hours, ["estlink1", "estlink2"]);
    return build(y, p, null, sc).borders[0].ntcImp;
  };
  const plain = run("none");
  // March: EstLink 2 was broken (2024-12-25 → 2025-06-19), EstLink 1 held at 0 leaves nothing
  const march = run("0@03-01..03-31");
  assert.ok(march.subarray(59 * 24, 90 * 24).every((x) => x === 0));
  // 1–19 September: EstLink 1 was out already (its own A78 event); holding it changes nothing
  const sept = run("0@09-02..09-18");
  for (let h = 244 * 24; h < 261 * 24; h++) assert.equal(sept[h], plain[h], `hour ${h}`);
  // both cables off for the year leave nothing in any hour, either way (the owner's case, E-047)
  const both = replayState(p, 2025);
  both.links.whatif.estlink1 = both.links.whatif.estlink2 = "0@01-01..12-31";
  const sc = engineScenario(p, y, both);
  sc.links!.out = outMasks(att, 2025, y.meta.hours, ["estlink1", "estlink2"]);
  const b = build(y, p, null, sc).borders[0];
  assert.ok(b.ntcImp.every((x) => x === 0) && b.ntcExp.every((x) => x === 0));
});
