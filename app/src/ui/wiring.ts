// What the page's wiring (main.ts) decides, as functions a test can call without a DOM: the run
// whose results the page shows and the charts drawn from them (ERRATA E-091), the import-price
// page's input (E-108), the Sources row a link opens (E-116), the order the scenario view
// computes its scenarios in, with the banner over them (D-127), and where a tip's box goes (E-181).
import type { Presets } from "../contract/presets.ts";
import type { Year } from "../contract/year.ts";
import { boundaryPrice } from "../engine/build.ts";
import type { ScenarioId, State } from "../state/model.ts";
import { SCENARIOS, profileKey, runsOf } from "../state/model.ts";
import type { Actual } from "./actual.ts";
import type { ChartInput } from "./charts.ts";
import { gotoRow } from "./docs.ts";
import type { IpInput, Zone as IpZone } from "./importprice.ts";
import type { Sources } from "./labels.ts";
import type { YearResult } from "./results.ts";
import { t } from "./i18n.ts";

/** The kind of the run whose results the page shows: the panel may already hold the next one's
 * settings, and its results change only when that run ends (E-091). */
export const resultsRun = (shown: State | null, state: State): State["run"] => (shown ?? state).run;

/** The charts of the year chosen, drawn as the run they come from (E-091): a scenario's mix as a
 * doughnut per zone and no observed line (D-097, R-APP-2); a replay's as bars beside the actual. */
export function chartInput(run: State["run"], headline: YearResult[], year: string, zone: number, border: string, actual: Actual | null): ChartInput {
  const r = headline.find((x) => x.key === year) ?? headline[0];
  return {
    pies: run === "scenario", zone, run: r.view, label: r.label, set: headline.map((x) => ({ label: x.label, view: x.view })),
    observed: run === "replay" && actual ? actual.price[["EE", "LV", "LT"][zone]] : null,
    actualMix: actual ? { label: actual.label, zones: actual.zones.map((z) => z.mix) } : null,
    border: r.view.borders.find((b) => b.border === border) ?? null,
  };
}

/** The import-price page's input (D-040) for a state and the year files of its runs, in the order
 * of `runsOf`: the boundary price as the engine takes it and, beside it, the profile as published at
 * level 1. */
export function ipInputOf(p: Presets, s: State, zone: IpZone, years: Year[]): IpInput {
  const profile = s.run === "replay" ? "observed" : profileKey(s);
  return {
    zone, level: s.level[zone], slope: s.fiSlope, presets: p, target: s.run === "replay" ? null : s.profileYear,
    kind: s.run === "replay" ? "observed" : s.family, scenario: s.run === "replay" ? String(s.year) : s.profile,
    // the key the market model's outputs are exported under: TYNDP 2024's climate year, TYNDP 2026's weather scenario
    runs: runsOf(p, s).map((r, i) => ({ label: r.label, weight: r.weight, weather: years[i].meta.weather ?? String(years[i].meta.year),
      price: boundaryPrice(years[i], zone, profile, s.level[zone]), base: boundaryPrice(years[i], zone, profile, 1) })),
  };
}

/** The Sources row a click opens, or null where it hit no "in Sources" link (R-APP-9): every link
 * resolved as the panel's are, whether it carries a row's id or a figure's lineage id (E-116). */
export function gotoTarget(target: Element | null, sources: Sources): string | null {
  const id = target?.closest<HTMLElement>("[data-goto]")?.dataset.goto;
  return id ? gotoRow(sources, id) : null;
}

/** The order the scenario view computes its four scenarios in (D-127): the one shown first, then
 * 0 SMR, against which the table gives every difference, then the others in the table's order. */
export const scenarioOrder = (shown: ScenarioId): ScenarioId[] => [...new Set<ScenarioId>([shown, "gas", ...SCENARIOS])];

/** The chip over the results while a run computes (D-054, D-127; a chip since D-209): `n` years still to come, and a
 * note in a second voice. Until the scenario shown is in, the results under it are the previous settings' (`stale`,
 * said when there are any); once it is, they are this run's and only the table's other scenarios are computing. */
export function busyText(n: number, stale: boolean, previous: boolean): [main: string, note: string] {
  const years = n === 1 ? t("one year") : t("{n} years", { n });
  return stale ? [t("Computing {years}…", { years }), previous ? t("the previous settings' results") : ""]
    : [t("Computing the other scenarios, {years}…", { years }), t("the results are this run's")];
}

/** Where a tip's box goes in the window (E-181): 4 px under its mark from the mark's left edge (a bid's box from its
 * right edge), 8 px inside the window's sides; above the mark where the window has no room below and has it above. */
export function tipPlace(mark: { left: number; right: number; top: number; bottom: number }, w: number, h: number,
  vw: number, vh: number, right: boolean): [left: number, top: number] {
  const left = Math.max(8, Math.min(vw - w - 8, right ? mark.right - w : mark.left));
  return [left, mark.bottom + 4 + h > vh - 8 && mark.top - 4 - h >= 8 ? mark.top - 4 - h : mark.bottom + 4];
}
