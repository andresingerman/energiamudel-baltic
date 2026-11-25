// The golden fixture (R-VAL-8, R-NFR-5; PLAN §3.5): SHA-256 of every array a run of the engine of
// record returns (revision 1.4; the two-pass engine's cases went with it, D-132), for a synthetic week
// (frozen for good) and the 2024 replay (re-baselined with M3's calibration, D-025, and again with
// D-042 and D-044), and since D-128 the opening view's climate year 2009 (scripts/golden_cases.ts).
// `node --no-maglev scripts/golden.ts` fails on any difference; `--write` re-baselines, which is a deliberate act
// recorded in DECISIONS.md with a before/after table.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { links, presets, year } from "./data.ts";
import { digest } from "./digest.ts";
import { goldenRuns } from "./golden_cases.ts";
import { loadSolver } from "./highs.ts";

const FIXTURE = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "validate", "golden.fixture.json");

const SYNTHETIC = "test/toy.ts randomProblem(2024, 168): three zones, thermal, wind, DSR, two boundaries with losses, two batteries, a reservoir";
const REPLAY = "2024 replay on the engine of record day ahead with oil shale entering by the day, its start on the megawatts available (D-112 to D-114), and Kruonis's output in an hour in four steps of its power, each further one costing 60 €/MWh more, with the register refitted on it (D-115: the markup 32.5 / 80 / 220 / 260, Δ 71.5), re-baselined 2026-10-11, signed off by the owner on 2026-10-11 (D-116); before it on D-114's register (the markup 37.5 / 147.5 / 237.5 / 257.5, Δ 71), signed off on 2026-10-11 (D-114)";

const { solve, version } = await loadSolver();
const OPENING = "the opening view's climate year 2009, built as the page's worker builds it (scenarioOf), pinned on 2026-10-18 as the engine stood (main 6b4cb59) before the speed-ups of D-128, which must leave it to the bit";
const NOTES: Record<string, string> = {
  synthetic_168h_record: `${SYNTHETIC}; the engine of record day ahead (D-112, signed off with D-114; the toy has no oil shale to enter), HiGHS ${version}`,
  replay_2024_record: `${REPLAY}; the engine of record, HiGHS ${version}`,
  opening_cy2009_gas_record: `Elering: gas, ${OPENING}; the engine of record, HiGHS ${version}`,
  opening_cy2009_smr2_record: `2 SMR, ${OPENING}; the engine of record, HiGHS ${version}`,
  opening_cy2009_smr2_sens_a_record: `2 SMR's sensitivity (a), slow build with the scenario's demand (electrolysis and Poland's floor), its first nine weeks and a day, ${OPENING}; the engine of record, HiGHS ${version}`,
};
// D-130: the engine of record's cases re-baselined with HiGHS's presolve off and the second clearing's
// weeks the commitment leaves as they were taken from the first; signed off by the owner (D-131)
const SIGNED = " — re-baselined 2026-10-18 with presolve off and the first clearing's weeks kept where the commitment changes nothing (D-130), signed off by the owner on 2026-10-18 (D-131)";
// D-133: the digest takes the Daugava's water value, spill and water left too; no figure moved
const WATER = "; the digest extended to the Daugava's water value, its spill and the water it left on 2026-10-18, no figure moved (D-133)";
// D-164: the engine's cases re-baselined with the gas plants' one bid; the synthetic week builds no gas offer
const ONE_BID = "; re-baselined 2026-10-22 with the gas plants' one bid of R-SUP-6 — a combined-cycle plant's cost plus the fitted 51.25 €/MWh in the three zones, in place of Latvia's and Lithuania's utilisation markup — at the owner's decision (D-164)";
// D-169, D-170: the scenario cases re-baselined with the cheaper gas plant first among equal bids and the
// Lithuania–Poland lines AC; the replay and the synthetic week unchanged
const LINES_AC = "; re-baselined 2026-10-23 with the cheaper gas plant first among equal bids (D-168, signed D-169) and LitPol and Harmony Link the AC lines they are (D-170)";
// D-171: the engine's cases re-baselined with the record's gas price per net MWh and the adder refitted with it
const NET_GAS = "; re-baselined 2026-10-23 with the record's gas price per net MWh, the basis of ERAA's efficiencies, and the adder refitted to 42.5 €/MWh (D-171)";
const OWNERS_OPENING = "; re-baselined 2026-10-27 with the owner's opening: Estonia's onshore wind 1 300 MW and solar 2 500 MW in place of S1's, the neighbours' price levels FI 1.4783, SE4 1.5, PL 1.53 (D-182), then SE4 1.4943 and PL 1.5276 for 90 and 120 €/MWh (D-185); the unit at 315 MW in place of 300 (D-189)";
// D-194: the scenario cases re-baselined with the neighbours' profile as published; the replay and the synthetic week unchanged
const AS_PUBLISHED = "; re-baselined 2026-10-28 with the neighbours' profile as published, no longer re-priced to the scenario's gas and CO₂, and the owner's levels FI 1.8786, SE4 1.9607 and PL 2.0982 for the same 75, 90 and 120 €/MWh (D-194)";
const CASES = Object.fromEntries(Object.entries(goldenRuns(presets(), year, links(), solve)).map(([k, run]) =>
  [k, { note: NOTES[k] + SIGNED + WATER + (k.startsWith("synthetic") ? "" : ONE_BID) + (k.startsWith("opening") ? LINES_AC : "") + (k.startsWith("synthetic") ? "" : NET_GAS) + (k.startsWith("opening") ? OWNERS_OPENING + AS_PUBLISHED : ""), provisional: false, run }]));

const got = Object.fromEntries(Object.entries(CASES).map(([k, c]) => [k, { sha256: digest(c.run()), provisional: c.provisional, note: c.note }]));
if (process.argv.includes("--write")) {
  writeFileSync(FIXTURE, JSON.stringify({ contract: 1, cases: got }, null, 2) + "\n");
  console.log(`wrote ${FIXTURE}`);
} else {
  const want = JSON.parse(readFileSync(FIXTURE, "utf8")).cases as Record<string, { sha256: string }>;
  let bad = 0;
  for (const k of new Set([...Object.keys(got), ...Object.keys(want)])) {
    if (want[k]?.sha256 !== got[k]?.sha256) {
      console.error(`golden: ${k} changed (${want[k]?.sha256 ?? "missing"} → ${got[k]?.sha256 ?? "not computed"})`);
      bad++;
    }
  }
  if (bad) process.exit(1);
  console.log(`golden: ${Object.keys(got).length} cases unchanged`);
}
