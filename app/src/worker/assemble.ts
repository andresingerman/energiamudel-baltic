// One year of a set as the page shows it (R-ENG-1): the run's scenario, and the view, labels and
// inputs built from the engine of record's result. The worker clears a year in parts across the pool
// (D-114); the build clears the opening view's years whole (D-126), which split.test.ts proves the
// same result. Both assemble the year here, so the page reads the same objects either way.
import type { Presets } from "../contract/presets.ts";
import type { Year } from "../contract/year.ts";
import type { Scenario } from "../engine/build.ts";
import { impliedBid, monthOfHour, neighbourGasCost, observedClasses } from "../engine/build.ts";
import type { Results } from "../engine/index.ts";
import type { Problem } from "../engine/problem.ts";
import { BORDERS, ZONES } from "../engine/problem.ts";
import type { State } from "../state/model.ts";
import { engineScenario } from "../state/model.ts";
import type { RunView } from "./view.ts";
import { NEIGHBOURS_FUEL, view } from "./view.ts";

/** A year of a set as the page holds it: its key, label and weight in the set, the run's view, labels and inputs. */
export interface YearResult { key: string; label: string; weight: number; view: RunView; labels: Record<string, number | string> | null; inputs: Inputs }

/** A set as the page holds it, of its runs — each with its key, label and weight (`runsOf`) — and the pool's reply
 * to each: the one place the page, the build and the tests put a set together. */
export function setOf(runs: { key: string; label: string; weight: number }[],
  replies: ({ view: RunView; labels: Record<string, number | string> | null; inputs: Inputs } | { error: string } | object)[]): YearResult[] {
  return replies.map((x, i) => {
    if ("error" in x) throw new Error(`${runs[i].key}: ${x.error}`);
    if (!("view" in x)) throw new Error(`${runs[i].key}: no view came back for a run`);
    return { key: runs[i].key, label: runs[i].label, weight: runs[i].weight, view: x.view, labels: x.labels, inputs: x.inputs };
  });
}

/** What a year file's meta says of its year (R-TIME-4). */
export interface YearMeta { kind: string; year: number; climate_model?: string | null; labels?: Record<string, number | string> | null }

/** A run's labels: a climate year's ranks; a weather scenario's factors with its climate model and
 * modelled year. */
export function labelsOf(m: YearMeta): Record<string, number | string> | null {
  return m.labels ? { ...m.labels, ...(m.kind === "weather" ? { climate_model: m.climate_model ?? "", modelled_year: m.year } : {}) } : null;
}

/** What the panel scales as its sliders move (the owner asked, 2026-09-29): each zone's
 * inflexible load before its multiplier and firm block, and each border's average price before its
 * level factor. */
export interface Inputs { hours: number; loadTwh: number[]; price: Record<string, number> }

const sum = (a: Float64Array) => a.reduce((s, x) => s + x, 0);

/** A job's scenario: the panel's state, and the floors of sensitivities (a), (b) and (d) (R-APP-11). */
export function scenarioOf(presets: Presets, year: Year, state: State, gasFloor: number | null,
  meanFloor: Scenario["meanFloor"] | undefined): Scenario {
  return { ...engineScenario(presets, year, state), gasFloor, meanFloor: meanFloor ?? null };
}

/** The year's view, labels and inputs from its problem and the engine of record's result. */
export function assemble(presets: Presets, year: Year, key: string, scenario: Scenario, pb: Problem, r: Results):
  { view: RunView; labels: Record<string, number | string> | null; inputs: Inputs } {
  const observed = year.meta.kind === "observed";
  const installed = ZONES.map((z) => (observed ? observedClasses(presets, z, year.zones[z].capacity ?? {}) : scenario.fleet?.[z] ?? {}));
  // a scenario's neighbours price at a fossil level from a gas plant's cost on their fuel prices (D-037)
  // (the market model's own best gas plant on its own prices where the profile's fuel is known: ERRATA E-064, D-194)
  const level = observed ? null : neighbourGasCost(presets, scenario) ?? impliedBid(presets, { ...scenario, fuelPath: NEIGHBOURS_FUEL, gasFloor: null, gasPrice: null, euaPrice: null }, "gas_ccgt");
  const v = view(pb, r, installed, monthOfHour(pb.hours, observed ? Number(key) : 2009, observed), level);
  // the built load is the base × multiplier + firm block, the built price the profile × level
  const inputs: Inputs = {
    hours: pb.hours,
    loadTwh: pb.zones.map((zn, z) => (sum(zn.load) - scenario.firmMw[ZONES[z]] * pb.hours) / scenario.multiplier[ZONES[z]] / 1e6),
    price: Object.fromEntries(pb.borders.map((b, k) => [BORDERS[k].boundary, sum(b.price) / pb.hours / scenario.level[BORDERS[k].boundary]])),
  };
  return { view: v, labels: labelsOf(year.meta as YearMeta), inputs };
}
