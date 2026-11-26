// The Model view (R-APP-1, R-APP-2, R-APP-10, R-APP-11; revision 1.5): the panel edits the state,
// every change is debounced and runs the set on the workers with the engine of record, a
// progress indication shows while it runs (R-ENG-7) — the scenario shown first, the table's others
// as they come in (revision 2.16, D-127) — then the four standard sensitivities run in the
// background; the address bar carries the scenario's share link.

import ENGINE from "virtual:engine-id";
import "./ui/theme.css";
import type { Links } from "./contract/links.ts";
import type { Presets } from "./contract/presets.ts";
import { load } from "./data/loader.ts";
import type { Opening, SiteSets } from "./data/stored.ts";
import { Sets, known as knownSets } from "./data/sets.ts";
import { FILE_MS, loadIndex, loadOpening, loadSet, recall, remember, setId, within } from "./data/stored.ts";
import type { ScenarioId, Sensitivity, State } from "./state/model.ts";
import { SCENARIOS, UNITS, opening, replayState, runsOf, sensitivities } from "./state/model.ts";
import { jobKey, parse, runKey, serialize, shareHash, textOfHash } from "./state/text.ts";
import { drawCharts } from "./ui/charts.ts";
import type { Sources } from "./ui/labels.ts";
import { esc, fmt } from "./ui/labels.ts";
import { lang, t } from "./ui/i18n.ts";
import type { Country, PanelInputs, Reference } from "./ui/panel.ts";
import { SCENARIO_NAME, applyFold, bindPanel, borderNote, closeSources, fitPriceBoxes, fleetHtml, lineKeys, linesSvg, panelControls, refreshHints, renderPanel, setInputs, snap } from "./ui/panel.ts";
import type { Actual, Validation } from "./ui/actual.ts";
import type { Attribution } from "./ui/attribution.ts";
import { actualOf } from "./ui/actual.ts";
import type { Observed, SensResult, YearResult } from "./ui/results.ts";
import { durationRmse, mae, shareAtLeast } from "./worker/metrics.ts";
import type { SensMoney } from "./ui/results.ts";
import { cardsHtml, chartsHtml, sensBid, sensHtml, setNote, trioHtml } from "./ui/results.ts";
import type { PresContext } from "./ui/presentation.ts";
import { capexOf } from "./ui/presentation.ts";
import type { DeckInput, Side, Trio } from "./ui/deck.ts";
import { H as DECK_H, NB_DOCS, NB_KEYS, OUTAGES, REPLAY_SLIDE, REPLAY_YEARS, SLIDES, W as DECK_W, deckShell, without, yearPrices } from "./ui/deck.ts";
import type { Calibration } from "./ui/calibration.ts";
import { calibrationHtml, gateNote } from "./ui/calibration.ts";
import { redraw } from "./ui/redraw.ts";
import type { IpInput, Zone as IpZone } from "./ui/importprice.ts";
import { importPriceHtml, ipBody, ipHint } from "./ui/importprice.ts";
import type { Statistics } from "./ui/statistics.ts";
import { setKey, statisticsHtml } from "./ui/statistics.ts";
import { busyText, chartInput, gotoTarget, ipInputOf, resultsRun, scenarioOrder, tipPlace } from "./ui/wiring.ts";
import { weatherHtml } from "./ui/weather.ts";
import { feedbackHtml, footHtml, mailto } from "./ui/feedback.ts";
import { observedClasses } from "./engine/build.ts";
import type { Year } from "./contract/year.ts";
import type { Evaluation } from "./worker/metrics.ts";
import type { DocTab } from "./ui/docs.ts";
import type { Manifest } from "./ui/export.ts";
import { resultsCsv, resultsJson, scenarioSources } from "./ui/export.ts";
import { docsHtml, filterSources, markdown, sourcesHtml } from "./ui/docs.ts";
import { initAnalytics, pageView, reopenConsent } from "./ui/consent.ts";
import type { Port } from "./worker/pool.ts";
import { Pool, runYear } from "./worker/pool.ts";
import { setOf } from "./worker/assemble.ts";
import type { Reply } from "./worker/engine.worker.ts";

declare const __COMMIT__: string; // vite.config.ts
declare const __VERSION__: string;

const BASE = new URL("data/", location.href).href;
// the opening view as the build computed it (D-126): fetched at once, read when a run's settings are its
const precomputed: Promise<Opening<YearResult[]> | null> = loadOpening<YearResult[]>(BASE, ENGINE);
/** What this browser keeps a set under before its job's key (D-232): the id of the sources that compute a set
 * (D-237) and the export's hash — the opening view's, or where the site has none (the development server) the
 * export's own manifest's. `?nostore` in the address keeps nothing and reads nothing kept. */
const storePrefix: Promise<string | null> = new URL(location.href).searchParams.has("nostore") ? Promise.resolve(null)
  : precomputed.then(async (o) => {
    const data = o?.export ?? (await within(load<Manifest>("manifest.json", BASE), null, FILE_MS))?.export;
    return data ? `${ENGINE}|${data}|` : null;
  });

// the presentation's states as the build computed them (D-129): the index fetched when first needed; an index that did
// not come (a dropped connection, or a build of other sources) is asked for again next time, not held as none for the
// page's life (ERRATA E-201)
let siteIndex: Promise<SiteSets | null> | null = null;
const fromSite = <T>(id: string): Promise<T | null> =>
  (siteIndex ??= loadIndex(BASE, ENGINE).then((x) => { if (!x) siteIndex = null; return x; })).then((x) => loadSet<T>(BASE, x, id));

// a phone holds two workers at the most (D-146): in Safari's engine each computing worker held about
// a quarter of a gigabyte, and an iPhone has two fast cores. Since D-149 a phone shows the desktop page,
// so it is told by its touch screen's size, not by the page's width
const phone = matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 900;

// every set the page holds, by what it computes from: the page's memory and this browser's store (data/sets.ts, D-232)
const store = new Sets<YearResult[]>(phone ? 32e6 : 96e6, { prefix: storePrefix, recall: (id) => recall<YearResult[]>(id), remember });

/** The sets of `s` computed before (R-ENG-7, D-126, D-129, D-232) — a scenario's four, a validation run's one under
 * its state's scenario: the build's opening view with its sensitivities, the page's memory and this browser's store,
 * a state the build computed for the presentation (`knownSets`); null, and the page computes. */
async function known(s: State): Promise<{ trio: Record<ScenarioId, YearResult[]>; sens: Record<string, YearResult[]>; from: string } | null> {
  const key = runKey(s);
  const ids = s.run === "scenario" ? SCENARIOS : [s.scenario];
  const jobs = ids.map((id) => jobKey({ ...s, scenario: id }, null, null));
  const o = await precomputed, mine = o && o.key === key ? o : null;
  const got = await knownSets(store, jobs,
    async () => (mine ? { sets: ids.map((id) => mine.trio[id]), sens: Object.entries(mine.sens).flatMap(([k, set]) => {
      // each of the opening view's sensitivities by what it computes from
      const [id, x] = k.split("|");
      const v = sensitivities(p, { ...s, scenario: id as ScenarioId }).find((y) => y.id === x);
      return v ? [[jobKey(v.state, v.gasFloor, v.meanFloor), set] as [string, YearResult[]]] : [];
    }) } : null),
    async () => { const b = await fromSite<Record<ScenarioId, YearResult[]>>(setId(key)); return b ? ids.map((id) => b[id]) : null; });
  if (!got) return null;
  return { trio: Object.fromEntries(ids.map((id, i) => [id, got.sets[i]])) as Record<ScenarioId, YearResult[]>, sens: got.opening && mine ? mine.sens : {},
    from: got.from === "site" ? t("when the site was built") : t("in this browser before") };
}
const DEBOUNCE_MS = 70;
const PROGRESS_MS = 300; // R-ENG-7

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
/** The page's shell, written in English in index.html, in the chosen language, and the button that
 * switches it: the page loads again in the other language, the scenario kept in the address. */
/** A header switch (the language): checked shows its right half. */
function switched(b: HTMLElement, on: boolean): void {
  b.setAttribute("aria-checked", String(on));
  b.children[0]?.classList.toggle("on", !on);
  b.children[1]?.classList.toggle("on", on);
}

function shell(): void {
  document.documentElement.lang = lang;
  const other = lang === "et" ? "en" : "et";
  const b = $("lang");
  switched(b, lang === "et");
  b.addEventListener("click", () => {
    // the other language on the view shown, the presentation's mid-talk among them (ERRATA E-166): the view and the
    // deck's slide are in the address already (show, paintDeck; D-221)
    const u = new URL(location.href);
    u.searchParams.set("lang", other);
    location.href = u.href;
  });
  $("foot").innerHTML = footHtml(); // in the page's language, like every text
  if (lang === "en") return;
  document.title = t(document.title);
  for (const e of document.querySelectorAll<HTMLElement>("[data-t]")) e.textContent = t(e.textContent ?? "");
  for (const e of document.querySelectorAll<HTMLElement>("[data-t-label]")) e.setAttribute("aria-label", t(e.getAttribute("aria-label") ?? ""));
}
shell();

const panel = $("panel"), status = $("status"), cards = $("cards"), sens = $("sens"), chartsEl = $("charts"), runEl = $("run"), calEl = $("calibration"), ipEl = $("import"), weatherEl = $("weather"), statsEl = $("statistics"), docsEl = $("docs"), fbEl = $("feedback"), deckEl = $("deck"), noticeEl = $("notice");

const pool = new Pool(Array.from({ length: Math.min(phone ? 2 : 8, Pool.size(navigator.hardwareConcurrency)) }, () =>
  new Worker(new URL("./worker/engine.worker.ts", import.meta.url), { type: "module" }) as unknown as Port));

let p: Presets;
let lk: Links | null = null; // ERAA's hourly NTC, for the AC lines' capacity on the map
let ref: Reference | null = null; // the observed fleets and demand the panel's growth marks compare with (D-057)
let sources: Sources;
let state: State;
let country: Country = "EE";
let headline: YearResult[] = [];
// the scenario view's four scenarios (D-036, D-058) and the settings they ran with, the scenario aside
let trio: Partial<Record<ScenarioId, YearResult[]>> | null = null; // the four as they come in (D-127)
let trioKey = "";
let sensResults: SensResult[] = [];
// the sensitivities' sets per scenario for the settings of `sensKey`: a scenario shown again, or
// 0 SMR as the pair of another, runs nothing twice (R-APP-11, R-SMR-5)
const sensDone = new Map<string, YearResult[]>();
let sensKey = "";
let actual: Actual | null = null; // the replayed year; a scenario shows no actual year (D-080)
let inputs: PanelInputs | null = null; // the headline's loads and border prices before the sliders
let cardsOpen = false; // the cards start folded (D-029)
let chartYear = "";
let chartZone = 0;
let chartBorder = "EE-FI";
let chartImport: "line" | "fill" = "fill"; // the daily chart's net import
let chartMonthly: "mean" | "median" = "mean"; // a scenario's monthly chart: the average or the median (D-202)
let att: Attribution | null = null; // a validation run's outage labels (R-LINK-6)
let showing: "model" | "deck" | "calibration" | "import" | "weather" | "statistics" | "docs" | "feedback" = "model";
let ipZone: IpZone = "FI"; // the import-price page's boundary zone (D-040)
let timer: ReturnType<typeof setTimeout> | undefined;
// the state whose results the page shows — what an export describes (R-APP-10) — and the settings of
// the full run in flight, so that the same settings asked again (a slider let go) do not restart it
let shown: State | null = null;
let running = "";
let progress: ReturnType<typeof setTimeout> | undefined; // the "computing…" line after PROGRESS_MS (R-ENG-7)

function ctx() {
  return {
    p, sources, state, country,
    // the fleet of the replay the page shows, and only for the year the panel names: a run in flight
    // shows "computing…" rather than another year's or a scenario's fleet under the year's label
    fleet: shown?.run === "replay" && shown.year === state.year && headline.length ? headline[0].view.zones.map((z) => z.fleet) : null,
    inputs,
    links: lk,
    ref,
    set(next: State, again: boolean) {
      state = next;
      if (again) draw();
      if (showing === "import") void drawImport();
      if (showing === "statistics") drawStats();
      schedule();
    },
    select(c: Country) { country = c; draw(); },
  };
}

function draw() {
  renderPanel(panel, ctx());
  const s = state;
  // a scenario's line is gone from the header (D-224): the panel shows the scenario and the neighbours
  runEl.textContent = s.run === "replay"
    ? t("Validation on {year}: the model runs the observed year, its prices beside the observed ones", { year: s.year })
    : "";
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(runAll, DEBOUNCE_MS);
}


/** A message that stays until the reader dismisses it (a link that was not loaded). */
function notice(text: string | null): void {
  noticeEl.hidden = !text;
  noticeEl.textContent = text ?? "";
  if (!text) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "seg";
  b.textContent = "×";
  b.setAttribute("aria-label", t("Dismiss this message"));
  b.addEventListener("click", () => notice(null));
  noticeEl.append(" ", b);
}

/** The set computed on the pool, its jobs queued at once, and kept — in the page's memory and in this browser's
 * store (D-232). `tag`: what `pool.cancel` drops the set's jobs by (the sensitivities, D-127). */
async function computeSet(s: State, gasFloor: number | null, priority: number, meanFloor: Sensitivity["meanFloor"] = null, tag = "", job = jobKey(s, gasFloor, meanFloor)): Promise<YearResult[]> {
  const runs = runsOf(p, s);
  // each year's weeks on every worker (D-114)
  const set = setOf(runs, await Promise.all(runs.map((r) => runYear<Reply>(pool, { base: BASE, key: r.key, state: s, gasFloor, meanFloor, tag }, priority))));
  store.put(job, set);
  return set;
}

/** A set: kept before, else computed. The store answers a moment later than the call: a control changed meanwhile
 * supersedes it before a job is queued. */
async function runSet(s: State, gasFloor: number | null, priority: number, meanFloor: Sensitivity["meanFloor"] = null, tag = ""): Promise<YearResult[]> {
  const job = jobKey(s, gasFloor, meanFloor), gen = pool.gen;
  const had = await store.kept(job);
  if (had) return had.set;
  if (gen !== pool.gen) throw new Error("superseded");
  return computeSet(s, gasFloor, priority, meanFloor, tag, job);
}

/** While the headline run computes, a line slides under the header and a chip takes the status line's
 * place over the results, the results dimmed under it: what they show is the previous settings' (the
 * owner, 2026-10-05; D-054; a line and a chip since D-209). `n`: the years being computed, null when the
 * run has ended; not `stale` once the scenario shown is in and only the table's other scenarios are
 * still computing (D-127). */
function setBusy(n: number | null, stale = true): void {
  const chip = $("computing");
  status.classList.toggle("busy", n !== null);
  $("results").classList.toggle("stale", n !== null && stale);
  chip.hidden = $("busyline").hidden = n === null;
  const [main, note] = n === null ? ["", ""] : busyText(n, stale, headline.length > 0);
  chip.innerHTML = n === null ? "" : `<span>${esc(main)}</span>${note ? `<span class="sub">${esc(note)}</span>` : ""}`;
}

/** The run's set shown: the headline, the state it ran for and what goes with it. */
function take(now: State, s: State, set: YearResult[], v: Validation | null, a: Attribution | null): void {
  headline = set;
  shown = now;
  att = a;
  inputs = setInputs(s, set);
  actual = v ? actualOf(v, t("{year} actual", { year: s.year })) : null;
  const box = document.getElementById("replay-fleet");
  if (box && s.run === "replay") box.innerHTML = fleetHtml(ctx(), country as "EE" | "LV" | "LT");
  refreshHints(panel, ctx());
  if (!set.some((r) => r.key === chartYear)) chartYear = set[set.length - 1].key;
}

let warm = false;
/** Once, while the reader looks at a view computed before: each worker loads the solver and the files
 * the years shown need, below every other job, so that the first change of a control does not wait
 * for them (D-128). The engine does not run. */
function warmUp(s: State): void {
  if (warm) return;
  warm = true;
  const keys = runsOf(p, s).map((r) => r.key);
  for (let i = 0; i < pool.workers; i++) pool.run({ base: BASE, key: keys[0], warm: keys, state: s, tag: "warm" }, 3).catch(() => undefined);
}

/** The banner and the status line once the scenario shown is in and `left` years of the table's
 * others still compute: the results under them are this run's (D-127). */
function othersComputing(left: number): void {
  clearTimeout(progress);
  setBusy(left, false);
  status.textContent = t("the scenario shown is in; computing the other scenarios with the engine of record…");
}

/** The four scenarios of `s` computed, the one shown first and the rest by `scenarioOrder` (D-127):
 * the shown one's set is drawn as soon as it is in, the table's others as each comes in. Resolves
 * when all four are in. */
async function runTrio(s: State, key: string, gen: number, t0: number): Promise<{ sets: Record<ScenarioId, YearResult[]>; first: string } | null> {
  const sets: Partial<Record<ScenarioId, YearResult[]>> = {};
  const years = runsOf(p, s).length;
  let first = "";
  await Promise.all(scenarioOrder(s.scenario).map(async (id, i) => {
    // a scenario's first clearings wait behind the one before it, and a year's later jobs go ahead
    // of the queue (runYear), so each scenario's years finish before the next one's (pool.test)
    // `known` asked the store for the four: one it found — 0 SMR when only the plant's clause moved — is in memory
    const st = { ...s, scenario: id }, job = jobKey(st, null, null);
    const set = store.peek(job) ?? await computeSet(st, null, i / 4, null, "", job);
    if (gen !== pool.gen) return;
    sets[id] = set;
    trio = { ...sets };
    trioKey = key;
    // while it ran the reader may have shown another scenario or moved the strike: those need no run
    const now = runKey(state) === key ? state : s;
    const mine = sets[now.scenario];
    if (!mine) return; // the results wait for the scenario shown; the banner stays
    const left = SCENARIOS.filter((x) => !sets[x]).length * years;
    if (headline !== mine) {
      first ||= t("; {name}, the scenario shown, in {s} s", { name: SCENARIO_NAME[now.scenario], s: fmt((performance.now() - t0) / 1000, 1) });
      take(now, s, mine, null, null);
      if (left) othersComputing(left);
      showHeadline();
      performance.measure("cards", { start: t0 });
      // its sensitivities say "computing…" now and run when the table is in, behind it (D-028)
      runSensitivities(gen, now, false);
    } else {
      if (left) setBusy(left, false);
      drawTrio();
    }
  }));
  if (gen !== pool.gen) return null;
  performance.measure("scenarios", { start: t0 });
  return { sets: sets as Record<ScenarioId, YearResult[]>, first };
}

async function runAll() {
  const s = state;
  // the share link follows the state once per run, not on every slider step (browsers throttle it)
  try { history.replaceState(null, "", shareHash(serialize(s))); } catch { /* throttled: the next run writes it */ }
  const key = runKey(s);
  // showing another scenario or another strike needs no run (R-APP-4)
  if (s.run === "scenario" && trio && key === trioKey) {
    // a run of other settings in flight is superseded here and never clears its own progress line;
    // it dropped these settings' sensitivities, which start again below
    const superseded = running !== "" && running !== key;
    if (superseded) {
      pool.next();
      clearTimeout(progress);
      setBusy(null);
      // a table of these settings whole, since the run that left it started no other (trioKey)
      status.textContent = t("{n} years computed by the engine of record a moment ago; any change computes again", { n: SCENARIOS.length * runsOf(p, s).length });
      running = "";
    }
    const left = SCENARIOS.filter((id) => !trio?.[id]).length * runsOf(p, s).length;
    // a scenario of these settings still computing is shown when it comes in (D-127); until then the
    // results under the banner are another scenario's, dimmed
    const set = trio[s.scenario];
    if (!set) {
      if (running === key && left) setBusy(left, true);
      return;
    }
    const same = headline === set;
    headline = set;
    shown = s;
    if (running === key && left) othersComputing(left);
    showHeadline();
    // the strike alone: the sensitivities in flight are still the answer; while the table computes
    // they wait for it, its end starting the scenario shown then
    if (!same || superseded) runSensitivities(pool.gen, s, running !== key);
    return;
  }
  // the same settings are computing already (a slider let go after its drag started the run)
  if (key === running) return;
  running = key;
  const gen = pool.next();
  // the table of a run superseded before its four scenarios came in is no answer for its settings (D-127)
  if (trio && SCENARIOS.some((id) => !trio?.[id])) trioKey = "";
  const n = runsOf(p, s).length * (s.run === "scenario" ? SCENARIOS.length : 1);
  const t0 = performance.now();
  clearTimeout(progress);
  try {
    // settings computed before need no run: the build's opening view and its states, or this browser's own
    // (D-126, D-129; a validation run's year too since D-232)
    const before = await known(s);
    if (gen !== pool.gen) return;
    if (before && s.run === "scenario") {
      sensDone.clear();
      for (const [k, set] of Object.entries(before.sens)) sensDone.set(k, set);
      sensKey = key;
      trio = before.trio;
      trioKey = key;
      // while it was read the reader may have shown another scenario or moved the strike
      const now = runKey(state) === key ? state : s;
      take(now, s, before.trio[now.scenario], null, null);
      setBusy(null);
      status.textContent = t("{n} years computed by the engine of record {when}; any change computes again here", { n, when: before.from });
      showHeadline();
      runSensitivities(gen, now);
      warmUp(s);
      return;
    }
    if (!before) progress = setTimeout(() => { status.textContent = n === 1 ? t("computing the year with the engine of record…") : t("computing {n} years with the engine of record…", { n }); setBusy(n); }, PROGRESS_MS);
    if (s.run === "scenario") {
      // the scenario shown first, drawn when it is in; the sensitivities start then (D-127)
      const got = await runTrio(s, key, gen, t0);
      if (!got) return;
      setBusy(null);
      status.textContent = t("{n} years in {s} s{first}", { n, s: fmt((performance.now() - t0) / 1000, 1), first: got.first });
      runSensitivities(gen, runKey(state) === key ? state : s);
      return;
    }
    // the actual year is a replay's: scenario planning has no actual (D-080)
    const year = s.year;
    const [set, v, a] = await Promise.all([
      before ? before.trio[s.scenario] : computeSet(s, null, 0),
      load<Validation>(`validation/${year}.json.gz`, BASE).catch(() => null),
      load<Attribution>(`attribution/${year}.json.gz`, BASE).catch(() => null),
    ]);
    if (gen !== pool.gen) return;
    trio = null;
    trioKey = "";
    take(s, s, set, v, a);
    setBusy(null);
    status.textContent = (before ? t("the year computed by the engine of record {when}; any change computes again here", { when: before.from })
      : n === 1 ? t("one year in {s} s", { s: fmt((performance.now() - t0) / 1000, 1) })
      : t("{n} years in {s} s{first}", { n, s: fmt((performance.now() - t0) / 1000, 1), first: "" }))
      + (!v ? t("; the observed prices of {year} could not be loaded, so the cards show the model alone", { year }) : "");
    showHeadline();
    runSensitivities(gen, s);
    if (before) warmUp(s);
  } catch (e) {
    if ((e as Error).message === "superseded") return;
    setBusy(null);
    status.innerHTML = `<span class="error">${t("The run failed:")} ${esc(String((e as Error).message))}</span>`;
    // a table the failure left partial is no answer for its settings: the next change computes again
    if (trioKey === key && SCENARIOS.some((id) => !trio?.[id])) trioKey = "";
  } finally {
    // a run superseded by another leaves the other's progress line alone
    if (running === key) {
      clearTimeout(progress);
      running = "";
    }
  }
}

/** What the sensitivities' money rows need (D-188, D-195): Estonia's demand as the Presentation page gives it, and the
 * contract's strike and clause; none before the headline's inputs are in. */
const sensMoney = (s: State): SensMoney | undefined => inputs
  ? { demandTwh: inputs.loadTwh[0] * s.zones.EE.multiplier + (s.zones.EE.firmMw * inputs.hours) / 1e6, strike: s.smr.strike, clause: s.smr.clause }
  : undefined;

function showHeadline() {
  drawCards();
  redraw(sens, sensHtml(trio, sensResults, SCENARIO_NAME, sensMoney(state)));
  chartsOfShown();
}

/** The charts of the results shown, drawn as the run they come from (E-091). */
function chartsOfShown(): void {
  redraw(chartsEl, chartsHtml(headline, chartYear, chartZone, chartBorder, att, borderNote(p, shown ?? state, chartBorder), resultsRun(shown, state) === "scenario", chartImport, chartMonthly));
  drawChartsNow();
}

/** The cards: the four scenarios' table, the contract card, what differs from the presets, the
 * headline's figures — all a scenario coming in after the one shown changes (D-127). */
function drawCards() {
  const run = resultsRun(shown, state);
  // a replay's metrics of §9 for its year (R-APP-2): the calibration page has the rest (M7)
  const obs: Observed[] | null = run === "replay" && actual
    ? ["EE", "LV", "LT"].map((z, i) => {
      const o = actual!.price[z];
      const m = headline[0].view.zones[i].price;
      return { mae: mae(m, o), durationRmse: durationRmse(m, o), share150: { model: shareAtLeast(m, 150), observed: shareAtLeast(o, 150) } };
    })
    : null;
  // what differs from the presets is shown with the result (R-BND-5, R-DEM-3, R-DEM-4, R-UI-6);
  // a Finnish slope makes the run a sensitivity (R-BND-6)
  // the list of what differs from the presets is gone from under the cards (D-224); the panel marks each changed control
  const marks = state.fiSlope > 0 ? `<p class="note changed"><strong>${t("Sensitivity:")}</strong> ${t("Finland's price moves {x} €/MWh per GW of net flow.", { x: fmt(state.fiSlope) })}</p>` : "";
  // the contract card out of the Model view at the owner's word (D-294); the strike and clause stay in the state, the deck's
  // and the sensitivities' accounts read them
  // the weather years' weights and ranks behind a "?" by the table of the years (the owner's design direction)
  const about = headline.length > 1 ? setNote(headline) : "";
  redraw(cards, (trio ? `<div id="trio-box">${trioHtml(trio, SCENARIO_NAME, state.scenario, about)}</div>` : "")
    + marks + cardsHtml(headline, actual, obs, cardsOpen));
}

/** The four scenarios' table alone, when one of the others comes in: the contract card's strike may
 * be in the reader's hand (D-127). */
function drawTrio() {
  const box = document.getElementById("trio-box");
  if (box && trio) { redraw(box, trioHtml(trio, SCENARIO_NAME, state.scenario, headline.length > 1 ? setNote(headline) : "")); }
  else drawCards();
}

/** What the deck takes besides the runs (D-152 … D-160; the Model view's capital cost took it too until D-339). */
function presContext(s: State): PresContext {
  const unit = p.parameters["smr.bwrx300.net_output_mw"]!.value;
  // the impact's three parameters and their publishers, as the export names them (R-APP-9)
  const [kwh, vat, life] = ["household.ee.average_consumption_kwh", "tax.ee.vat_standard_rate", "smr.bwrx300.design_life_years"].map((k) => p.parameters[k]);
  const publisher = (x: NonNullable<typeof kwh>) => sources.documents[sources.records[x.src[0]]?.derived_from[0] ?? ""]?.title.split(",")[0] ?? "";
  return {
    plantMw: Object.fromEntries(SCENARIOS.map((id) => [id, UNITS[id] * unit])),
    fleet2025: fleet2025(),
    // the observed load of 2025, the full year the panel's demand mark compares with (D-057); the deck's demand row (D-228)
    load2025: ref?.twh?.year === 2025 ? ref.twh.zones : null,
    impact: kwh && vat && life ? { kwh: kwh.value, vat: vat.value, years: life.value, sources: [kwh, vat, life].map(publisher).join("; ") } : null,
    strike: s.smr.strike, clause: s.smr.clause,
    capex: capexOf(p, unit),
    rate: p.parameters["finance.discount_rate_real"]?.value ?? null,
    cfdYears: p.parameters["finance.cfd_term_years"]?.value ?? null,
  };
}

// the states the deck asks for besides the one shown (its outages), while they load (the Presentation page's too until D-249)
const presLoading = new Set<string>();

/** The four scenarios of a state besides the one shown, into `into` by its run key, `then` drawing the page that asked:
 * the build's sets, this browser's, or computed behind the page's own runs (D-177; the deck's outages, D-220). */
async function loadTrio(into: Map<string, Partial<Record<ScenarioId, YearResult[]>>>, then: () => void, st: State, key: string, priority: number): Promise<void> {
  if (presLoading.has(key)) return;
  presLoading.add(key);
  let again = false;
  try {
    const got = await known(st);
    if (got) into.set(key, got.trio);
    else {
      const sets: Partial<Record<ScenarioId, YearResult[]>> = {};
      into.set(key, sets);
      await Promise.all(SCENARIOS.map(async (id, i) => {
        sets[id] = await runSet({ ...st, scenario: id }, null, priority + i / 100, null, "pres");
        then();
      }));
    }
    then();
  } catch (e) {
    into.delete(key);
    // superseded by a new run: asked for again, now — the page may have been drawn for these settings already and
    // would stay at "computing…" (D-238); a failure is not tried again until the page is next drawn
    again = /^(superseded|cancelled)$/.test((e as Error).message);
  } finally {
    presLoading.delete(key);
  }
  if (again) then();
}

// the deck (D-220, R-APP-16): v3's slides on the state shown, every figure from its runs; the slide shown; the four
// scenarios with EstLink 2 and with both EstLinks out all year for its cables' slide (deck.ts OUTAGES, without) — the
// build's sets for the opening state (D-221), else computed behind the page's own runs while the deck shows
let deckAt = 0;
let deck: DeckInput | null = null;
const deckTrios = new Map<string, Trio>();
// its past years' slide's (D-229, D-240): the validation's year tables, for the year's hourly error under its title, asked
// for once the deck shows and again after a failure; null until they arrive
// its past years' slide (D-229): the replays and the market's record of its years, Estonia's part, all four asked for
// when the slide is near, each in a column of its own since D-244; the build computes the replays with its sets
const deckReplays = new Map<number, { model: Side | null; market: Side | null }>();
function deckReplay(y: number): { model: Side | null; market: Side | null } {
  const had = deckReplays.get(y);
  if (had) return had;
  const got: { model: Side | null; market: Side | null } = { model: null, market: null };
  deckReplays.set(y, got);
  const rs = replayState(p, y);
  void (async () => {
    try {
      const [set, v] = await Promise.all([
        known(rs).then((k) => k?.trio[rs.scenario] ?? runSet(rs, null, 2.5, null, "deckval")),
        load<Validation>(`validation/${y}.json.gz`, BASE),
      ]);
      const z = set[0].view.zones[0];
      got.model = { price: z.price, mix: z.mix };
      got.market = { price: v.price.EE, mix: actualOf(v, "").zones[0].mix };
      drawDeck();
    } catch {
      deckReplays.delete(y); // superseded or failed: asked for again when the slide is next drawn
    }
  })();
  return got;
}

/** The deck's state: the opening's, the four scenarios as the build computed them, whatever the Model view shows
 * (D-340, the owner: the deck "fixed by our scenarios"). */
let deckState: State | null = null;

function drawDeck(): void {
  if (showing !== "deck") return;
  const s = (deckState ??= opening(p));
  // the opening's four scenarios and, for the cables' slide, the same with EstLink 2 and with both EstLinks out: the
  // build's sets (D-221), read once and kept
  const [main, e2, e12] = [s, ...OUTAGES.map((lines) => without(s, lines))].map((st, i) => {
    const key = runKey(st);
    if (!deckTrios.has(key)) void loadTrio(deckTrios, drawDeck, st, key, 2 + i / 10);
    return deckTrios.get(key) ?? {};
  });
  // the past years' slide asks for its year once it is shown or next to the slide shown
  const near = Math.abs(deckAt - REPLAY_SLIDE) <= 1;
  const rep = REPLAY_YEARS.map((y) => ({ year: y, ...(near || deckReplays.has(y) ? deckReplay(y) : { model: null, market: null }) }));
  // the six zones' average price of the year the Statistics page's months reach, on the second slide's map (D-250)
  const prices = yearPrices((p as unknown as { statistics?: Statistics }).statistics?.ytd);
  // the neighbours' slides' documentary values and their documents' addresses (D-263, D-270, D-279)
  const nb = { par: Object.fromEntries(NB_KEYS.flatMap((k) => (p.parameters[k] ? [[k, p.parameters[k]!.value as number]] : []))),
    urls: Object.fromEntries(NB_DOCS.flatMap((k) => (sources.documents[k]?.url ? [[k, sources.documents[k].url]] : []))),
    // each value's document, from its lineage record, with the page the record names (D-278)
    refs: Object.fromEntries(NB_KEYS.flatMap((k) => {
      const rec = sources.records[p.parameters[k]?.src[0] ?? ""], doc = sources.documents[rec?.derived_from[0] ?? ""];
      return doc?.url ? [[k, { url: doc.url, page: Number(/^p\. (\d+)$/.exec(rec.page ?? "")?.[1]) || null, title: doc.title }]] : [];
    })) };
  deck = { trio: main, e2, e12, s, c: presContext(s), runs: runsOf(p, s), prices, nb,
    rep, map: linesSvg({ p, state: s, links: lk }, lineKeys(p, s.run === "scenario"), true, prices?.zones),
    ctl: panelControls({ p, state: s, links: lk }), lines: panelControls({ p, state: s, links: lk }, Infinity).lines };
  paintDeck();
}

/** The page's address with the view shown and, on the deck, its slide (`view=deck&slide=7`), so that a reload, a link
 * passed on and the language switch open the same place (D-221); the scenario stays in the hash as before. */
function placeInAddress(): void {
  const u = new URL(location.href);
  if (showing === "model") u.searchParams.delete("view");
  else u.searchParams.set("view", showing);
  if (showing === "deck") u.searchParams.set("slide", String(deckAt + 1));
  else u.searchParams.delete("slide");
  if (u.href !== location.href) history.replaceState(history.state, "", u);
}

/** The slide shown, drawn into the stage; the frame is written once, so that a slide drawn again keeps full screen. */
function paintDeck(): void {
  if (!deck) return;
  if (!deckEl.firstElementChild) {
    deckEl.innerHTML = deckShell();
    // the fit on the next frame, after the observer's loop: set inside it, while the view's pane unhides and the panel
    // folds away, WebKit reported "ResizeObserver loop completed with undelivered notifications" (ERRATA E-184)
    new ResizeObserver(() => requestAnimationFrame(fitDeck)).observe(deckEl.querySelector(".deck-wrap")!);
  }
  deckAt = Math.max(0, Math.min(SLIDES.length - 1, deckAt));
  const stage = deckEl.querySelector<HTMLElement>(".deck-stage")!;
  stage.innerHTML = SLIDES[deckAt](deck);
  fitPriceBoxes(stage); // the map's price boxes to their drawn labels, and again once the fonts are in (D-259)
  void document.fonts.ready.then(() => fitPriceBoxes(stage));
  for (const n of deckEl.querySelectorAll(".deck-n")) n.textContent = `${deckAt + 1} / ${SLIDES.length}`;
  fitDeck();
  placeInAddress();
}

/** The deck's heaviest face loaded before its first slide, so that the title does not flash in the fallback font
 * (v3's warm-up): at most 0.4 s, and nothing when it is in already. */
let deckFonts: Promise<unknown> | null = null;
const warmDeck = () => (deckFonts ??= Promise.race([document.fonts?.load("800 82px Montserrat"), new Promise((r) => setTimeout(r, 400))]).catch(() => undefined));
/** Full screen on and off: the button, and the F key (D-221). */
const toggleFull = () => void (document.fullscreenElement ? document.exitFullscreen() : deckEl.querySelector<HTMLElement>(".deck-wrap")?.requestFullscreen?.())?.catch(() => undefined);

/** The 1920×1080 stage scaled to the column's width, or in full screen to the screen, letterboxed. */
function fitDeck(): void {
  const wrap = deckEl.querySelector<HTMLElement>(".deck-wrap"), stage = deckEl.querySelector<HTMLElement>(".deck-stage");
  if (!wrap || !stage) return;
  const k = document.fullscreenElement === wrap ? Math.min(innerWidth / DECK_W, innerHeight / DECK_H) : wrap.clientWidth / DECK_W;
  stage.style.transform = `scale(${k})`;
}
document.addEventListener("fullscreenchange", fitDeck);

const goDeck = (i: number) => { deckAt = Math.max(0, Math.min(SLIDES.length - 1, i)); if (Math.abs(deckAt - REPLAY_SLIDE) <= 1) drawDeck(); else paintDeck(); };
// a swipe on the slide pages too (D-221): 40 px sideways and more sideways than up or down; the click a mouse's drag
// still fires is let go
let swipe: { x: number; y: number } | null = null, swipedAt = 0;
deckEl.addEventListener("pointerdown", (e) => { swipe = (e.target as HTMLElement).closest("[data-deck=stage]") ? { x: e.clientX, y: e.clientY } : null; });
deckEl.addEventListener("pointerup", (e) => {
  if (!swipe) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) >= 40 && Math.abs(dx) > 2 * Math.abs(dy)) { swipedAt = performance.now(); goDeck(deckAt + (dx < 0 ? 1 : -1)); }
});
// the bar's buttons, and a click on the slide: its left third back, the rest forward (the Fermi deck's slideshow);
// a link on the slide opens its document in a window of its own and leaves the slide where it is (ERRATA E-200), so
// that the deck stays as it was, full screen included
deckEl.addEventListener("click", (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
  if (a) {
    if (a.closest("[data-deck=stage]")) { e.preventDefault(); window.open(a.href, "_blank", "popup,noopener,width=1200,height=900"); }
    return;
  }
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-deck]");
  if (!b) return;
  const what = b.dataset.deck;
  if (what === "prev") goDeck(deckAt - 1);
  else if (what === "next") goDeck(deckAt + 1);
  else if (what === "full") toggleFull();
  else if (what === "stage" && performance.now() - swipedAt > 300) { const r = b.getBoundingClientRect(); goDeck(deckAt + (e.clientX - r.left < r.width / 3 ? -1 : 1)); }
});
// the keys a talk pages with, while the deck shows and no field has them; F full screen, which Escape leaves by itself
document.addEventListener("keydown", (e) => {
  if (showing !== "deck" || e.altKey || e.ctrlKey || e.metaKey) return;
  const el = e.target as HTMLElement;
  if (el.closest?.("input, textarea, select, [contenteditable]")) return;
  // the letter typed; under a layout whose key is no Latin letter (a Cyrillic one, say) the key's place (ERRATA E-187)
  const letter = /^[a-z]$/i.test(e.key) ? e.key.toLowerCase() : e.code === "KeyF" ? "f" : "";
  if (letter === "f") { e.preventDefault(); toggleFull(); return; }
  const to = ({ ArrowRight: deckAt + 1, PageDown: deckAt + 1, ArrowLeft: deckAt - 1, PageUp: deckAt - 1, Home: 0, End: SLIDES.length - 1 } as Record<string, number>)[e.key]
    ?? (e.key === " " && !el.closest?.("button") ? deckAt + 1 : undefined);
  if (to === undefined) return;
  e.preventDefault();
  goDeck(to);
});

/** The observed fleet of 2025 by zone and class the presentation's growth is measured from (the owner
 * asked, 2026-10-22): A68's with Kiisa (ERRATA E-165), its batteries Elering's count where A68 has none, as
 * the panel's marks take them (D-057), else A68's first, of 2026; null until the reference years are loaded. */
function fleet2025(): Record<string, Record<string, number>> | null {
  const f = ref?.fleets.find((x) => x.year === 2025), next = ref?.fleets.find((x) => x.year === 2026);
  if (!f) return null;
  return Object.fromEntries((["EE", "LV", "LT"] as const).map((z) => {
    const bat = f.cap[z].battery === undefined ? p.fleets.elering_vka_2025_actual?.[z]?.["2025"]?.classes.battery?.mw ?? next?.cap[z].battery : undefined;
    return [z, bat === undefined ? f.cap[z] : { ...f.cap[z], battery: bat }];
  }));
}

function drawChartsNow() {
  drawCharts({ ...chartInput(resultsRun(shown, state), headline, chartYear, chartZone, chartBorder, actual), imp: chartImport, monthly: chartMonthly });
}


let sensSeq = 0; // the latest call's: an older one's sets are thrown away when they arrive (D-127)
// the sensitivities stand on the Model view alone: while another page is shown they wait behind that page's own
// sets — the presentation's blocks, the deck's outages — and compute when those are in (D-233)
const sensBehind = () => (showing === "model" ? 0 : 1.9);

/** The four sensitivities of the scenario shown and, with the plant in it, of 0 SMR beside
 * them (R-APP-11 revision 1.6, R-SMR-5); the shown scenario's run first. A call drops the jobs of
 * the one before it, which asked for another scenario's (D-127); `start` false only shows them as
 * computing, for a call to come when the table is in. */
async function runSensitivities(gen: number, s: State, start = true) {
  pool.cancel("sens");
  const seq = ++sensSeq;
  const live = () => gen === pool.gen && seq === sensSeq;
  if (sensKey !== trioKey) { sensDone.clear(); sensKey = trioKey; }
  const list = sensitivities(p, s), own = runKey(s);
  // every scenario's at each pair (D-184): the scenario shown first, then 0 SMR, then the rest, as the table's
  const order = scenarioOrder(s.scenario);
  const jobs: [Sensitivity, ScenarioId][] = order.flatMap((id) => sensitivities(p, { ...s, scenario: id }).map((x) => [x, id] as [Sensitivity, ScenarioId]));
  const byOf = (xid: string) => Object.fromEntries(SCENARIOS.map((id) => [id, sensDone.get(`${id}|${xid}`) ?? null]));
  sensResults = list.map((x) => ({ id: x.id, label: x.label, bid: sensBid(p, x.state), set: sensDone.get(`${s.scenario}|${x.id}`) ?? null,
    gas: sensDone.get(`gas|${x.id}`) ?? null, by: byOf(x.id) }));
  const show = () => redraw(sens, sensHtml(trio, sensResults, SCENARIO_NAME, sensMoney(s)));
  show();
  if (!start) return;
  await Promise.all(jobs.map(async ([x, id]) => {
    const k = `${id}|${x.id}`;
    if (sensDone.has(k)) return;
    const i = list.findIndex((y) => y.id === x.id);
    try {
      // kept before — the page's memory, this browser's store — else the site's file of it, else computed, its jobs
      // queued at once: an older call's would slip in behind the cancel of a newer one
      // the build's file is asked for by this call's own settings, not by `sensKey`, which a later call may have
      // moved on while the store answered: an older call would else keep another state's set under its job (D-238)
      const job = jobKey(x.state, x.gasFloor, x.meanFloor);
      const had = await store.found(job, () => fromSite<YearResult[]>(setId(own, k)), live);
      if (had === undefined) return;
      const set = had ?? await computeSet(x.state, x.gasFloor, 1, x.meanFloor, "sens", job);
      if (!live()) return;
      sensDone.set(k, set);
      const r = sensResults[i];
      sensResults[i] = { ...r, by: { ...r.by, [id]: set }, ...(id === s.scenario ? { set } : {}), ...(id === "gas" ? { gas: set } : {}) };
    } catch (e) {
      if (!live() || /^(superseded|cancelled)$/.test((e as Error).message)) return;
      sensResults[i] = { ...sensResults[i], [id === s.scenario ? "error" : "gasError"]: (e as Error).message };
    }
    show();
  }));
}

/** R-APP-10: the scenario and results shown, saved as a file; the gate line goes with them (R-PUB-4). */
async function exportResults(kind: "csv" | "json"): Promise<void> {
  const manifest = await load<Manifest>("manifest.json", BASE);
  // the state the shown results were computed for, not a change still computing (R-APP-10)
  const s = shown ?? state;
  const a = { gate: gateNote(), code: { version: __VERSION__, commit: __COMMIT__ }, manifest,
    text: serialize(s), sources: scenarioSources(p, s), set: headline,
    // the table of the settings shown: a new run's partial one goes with nothing it does not describe
    trio: trioKey === runKey(s) ? trio : null, sensitivities: s.run === "scenario" ? sensResults : null };
  const body = kind === "csv" ? resultsCsv(a) : `${JSON.stringify(resultsJson(a), null, 1)}\n`;
  const url = URL.createObjectURL(new Blob([body], { type: kind === "csv" ? "text/csv" : "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `energiamudel-v5_${s.run === "replay" ? s.year : `2035_${s.scenario}`}.${kind}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

cards.addEventListener("click", (e) => {
  const sc = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-scenario]");
  if (sc) { ctx().set({ ...state, scenario: sc.dataset.scenario as ScenarioId }, true); return; }
  const ex = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-act="export"]');
  if (ex) {
    exportResults(ex.dataset.kind as "csv" | "json").catch((err: Error) => { status.innerHTML = `<span class="error">${t("The export failed:")} ${esc(err.message)}</span>`; });
    return;
  }
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-act="cards"]');
  if (!b) return;
  cardsOpen = !cardsOpen;
  document.getElementById("cards-grid")?.classList.toggle("folded", !cardsOpen);
  b.setAttribute("aria-expanded", String(cardsOpen));
  b.textContent = cardsOpen ? t("fewer figures") : t("all figures");
});

chartsEl.addEventListener("click", (e) => {
  const t = (e.target as HTMLElement).closest("button");
  if (!t) return;
  if (t.dataset.year) chartYear = t.dataset.year;
  else if (t.dataset.zone) chartZone = Number(t.dataset.zone);
  else if (t.dataset.border) chartBorder = t.dataset.border;
  else if (t.dataset.imp) chartImport = t.dataset.imp === "fill" ? "fill" : "line";
  else if (t.dataset.monthly) chartMonthly = t.dataset.monthly === "median" ? "median" : "mean";
  else return;
  chartsOfShown();
});

// the protocol's files as validate_fit, estlink2 and the gap script wrote them, loaded when the
// calibration page first opens (R-APP-7)
const DERIVED = import.meta.glob("../../data/derived/{validation/*.json,gap/gap.json}", { import: "default" });
let calibration: Promise<string> | null = null;
/** The validation's year tables: the calibration page's, and the deck's past years' slide's (D-229, D-240). */
const evaluations = () => Promise.all(Object.keys(DERIVED).filter((k) => /\/validation\/\d{4}\.json$/.test(k)).map((k) => DERIVED[k]() as Promise<Evaluation>));

function drawCalibration(): void {
  calibration ??= (async () => {
    const at = (name: string) => DERIVED[`../../data/derived/${name}`]() as Promise<unknown>;
    const [ys, estlink, gap] = await Promise.all([evaluations(), at("validation/estlink2.json"), at("gap/gap.json")]);
    const fitted = (p as unknown as { fitted: Calibration["fitted"] }).fitted;
    return calibrationHtml({ years: ys, estlink: estlink as Calibration["estlink"], gap: gap as Calibration["gap"], fitted });
  })();
  calibration.then((h) => { calEl.innerHTML = h; }, (e: Error) => {
    calibration = null;
    calEl.innerHTML = `<p class="error">${t("The calibration files could not be loaded:")} ${esc(e.message)}</p>`;
  });
}

// the import-price page (D-040): the boundary zone's price for each year of the set as the engine
// takes it (boundaryPrice), with the level slider of the panel; the year files come through the
// page's own loader cache (each worker keeps its own)
let ipSeq = 0;
async function drawImport(full = false): Promise<void> {
  const seq = ++ipSeq;
  const s = state;
  let a: IpInput;
  try {
    const years = await Promise.all(runsOf(p, s).map((r) => load<Year>(`years/${r.key}.json.gz`, BASE)));
    a = ipInputOf(p, s, ipZone, years);
  } catch (e) {
    if (seq === ipSeq) ipEl.innerHTML = `<p class="error">${t("The year files could not be loaded:")} ${esc((e as Error).message)}</p>`;
    return;
  }
  if (seq !== ipSeq) return;
  const body = ipEl.querySelector<HTMLElement>("#ip-body");
  const input = ipEl.querySelector<HTMLInputElement>("#ip-level");
  if (full || !body || !input || ipEl.querySelector(`[data-ipzone="${ipZone}"][aria-pressed="true"]`) === null) {
    redraw(ipEl, importPriceHtml(a));
    return;
  }
  // a drag in progress keeps its element: the value, its label and the figures change around it
  const changed = Math.abs(a.level - 1) > 1e-9;
  if (Number(input.value) !== a.level) input.value = String(a.level);
  input.setAttribute("aria-valuetext", `× ${fmt(a.level, 2)}${changed ? t(", changed from the preset") : ""}`);
  const v = ipEl.querySelector<HTMLElement>("#ip-v")!;
  v.textContent = `× ${fmt(a.level, 2)}`;
  v.classList.toggle("changed", changed);
  ipEl.querySelector<HTMLElement>("#ip-hint")!.textContent = ipHint(a);
  body.innerHTML = ipBody(a);
}

// the slider moves the panel's level (the owner's choice, D-040): a pointer snaps to 1 as the
// panel's sliders do, a key moves one step
let ipKeyed = false;
ipEl.addEventListener("keydown", (e) => { if ((e.target as HTMLElement).id === "ip-level") ipKeyed = true; });
ipEl.addEventListener("pointerdown", () => { ipKeyed = false; });
ipEl.addEventListener("input", (e) => {
  const t = e.target as HTMLInputElement;
  if (t.id !== "ip-level") return;
  const x = ipKeyed ? Number(t.value) : snap(Number(t.value), 1, Number(t.min), Number(t.max));
  if (String(x) !== t.value) t.value = String(x);
  const next = structuredClone(state);
  next.level[ipZone] = x;
  ctx().set(next, false);
  refreshHints(panel, ctx());
});
ipEl.addEventListener("change", (e) => { if ((e.target as HTMLElement).id === "ip-level") ctx().set(state, true); });

ipEl.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-ipzone]");
  if (b) { ipZone = b.dataset.ipzone as IpZone; void drawImport(true); }
});

// the documentation (R-APP-9): the methodology as the repository holds it, loaded when first shown — in Estonian
// its short summary, the full methodology in English beside it (D-142); the Sources view from sources.json. The
// questions and answers were taken out at the owner's word (D-337)
const DOCS: Record<Exclude<DocTab, "sources">, () => Promise<{ default: string }>> = {
  methodology: lang === "et" ? () => import("../../docs/methodology_et.md?raw") : () => import("../../docs/methodology.md?raw"),
  full: () => import("../../docs/methodology.md?raw"),
};
let docTab: DocTab = "methodology";

/** `row`: a source's row to bring into view (a source button's link). */
let docsSeq = 0; // the last request wins when two tabs are clicked in a row
async function drawDocs(row?: string): Promise<void> {
  const seq = ++docsSeq;
  const tab = docTab;
  let body: string;
  try {
    body = tab === "sources" ? sourcesHtml(sources) : markdown((await DOCS[tab]()).default);
  } catch (e) {
    body = `<p class="error">${t("The document could not be loaded:")} ${esc((e as Error).message)}</p>`;
  }
  if (seq !== docsSeq) return;
  redraw(docsEl, docsHtml(tab, body)); // the tab pressed keeps the focus (R-UI-5)
  const el = row ? document.getElementById(row) : null;
  if (el) { el.classList.add("hit"); el.tabIndex = -1; el.focus({ preventScroll: true }); el.scrollIntoView({ block: "center" }); }
}

// the statistics page (R-APP-14) is drawn when first shown and again when the panel changes a value its red dots show
// (D-216), on the tab open
let statsKey: string | null = null;
function drawStats(): void {
  const key = setKey(state);
  if (key === statsKey) return;
  const open = statsEl.querySelector<HTMLButtonElement>("button[data-stat][aria-pressed=true]")?.dataset.stat;
  statsEl.innerHTML = statisticsHtml(p, sources, state, open);
  statsKey = key;
}

function show(view: typeof showing, row?: string): void {
  const was = sensBehind();
  showing = view;
  if (sensBehind() !== was) pool.shift("sens", sensBehind() - was); // the sensitivities behind another page's own sets, and back (D-233)
  for (const x of document.querySelectorAll<HTMLButtonElement>("header .views button")) x.setAttribute("aria-pressed", String(x.dataset.view === view));
  for (const el of [cards, sens, chartsEl]) el.hidden = view !== "model";
  // off the Model view the panel's long boxes fold to their headings (D-197)
  panel.classList.toggle("folded", view !== "model");
  applyFold(panel);
  calEl.hidden = view !== "calibration";
  ipEl.hidden = view !== "import";
  weatherEl.hidden = view !== "weather";
  statsEl.hidden = view !== "statistics";
  docsEl.hidden = view !== "docs";
  fbEl.hidden = view !== "feedback";
  deckEl.hidden = view !== "deck";
  // the deck takes the window's width: the panel folds away while it shows
  document.querySelector(".app")!.classList.toggle("full", view === "deck");
  if (view === "deck") {
    // the pages are of the opening's four scenarios whatever the panel holds (D-340), and say "computing…" until
    // they are in
    void warmDeck().then(drawDeck);
  } else if (view === "calibration") drawCalibration();
  else if (view === "import") void drawImport(true);
  else if (view === "weather") { if (!weatherEl.innerHTML) weatherEl.innerHTML = weatherHtml(p, sources); } // static: drawn once (R-APP-13)
  else if (view === "statistics") drawStats();
  else if (view === "docs") void drawDocs(row);
  else if (view === "feedback") { if (!fbEl.innerHTML) fbEl.innerHTML = feedbackHtml(); } // static: drawn once
  else if (headline.length) drawChartsNow();
  placeInAddress();
  pageView(); // a view shown is a page view, with the reader's consent (D-338)
}

document.querySelector("header .views")!.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-view]");
  // nothing to show before the data and the opening state are in (ERRATA E-166)
  if (b && state) show(b.dataset.view as typeof showing);
});
// the Statistics page's tabs (D-213): the part chosen shows, the others hidden; the page, drawn once, keeps the choice
// until it is reloaded
statsEl.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-stat]");
  if (!b) return;
  for (const x of statsEl.querySelectorAll<HTMLButtonElement>("button[data-stat]")) x.setAttribute("aria-pressed", String(x === b));
  for (const x of statsEl.querySelectorAll<HTMLElement>(".st-pane")) x.hidden = x.dataset.pane !== b.dataset.stat;
});
// the Feedback view's button: the reader's text into their own e-mail program
fbEl.addEventListener("submit", (e) => {
  e.preventDefault();
  location.href = mailto(fbEl.querySelector("textarea")!.value);
});
docsEl.addEventListener("click", (e) => {
  const el = e.target as HTMLElement;
  const b = el.closest<HTMLButtonElement>("button[data-doc]");
  if (b) { docTab = b.dataset.doc as DocTab; void drawDocs(); return; }
  // a contents entry, a section's pill or a letter brings its heading into view, the address untouched (D-197)
  const to = el.closest<HTMLElement>("[data-toc]")?.dataset.toc;
  if (to) document.getElementById(to)?.scrollIntoView({ block: "start" });
  if (el.closest("[data-act=consent]")) reopenConsent(); // the visit statistics' choice, asked again (D-338)
});
// the Sources view's search keeps the documents that hold every word typed, in the page (D-197)
docsEl.addEventListener("input", (e) => {
  const f = e.target as HTMLInputElement;
  if (f.id === "src-find") filterSources(docsEl, f.value);
});
// a source button's "in Sources" link opens its row (R-APP-9)
document.addEventListener("click", (e) => {
  const row = gotoTarget(e.target as Element, sources);
  if (!row) return;
  e.preventDefault();
  closeSources();
  docTab = "sources";
  show("docs", row);
});

// a "?"'s or a bid's tip in one box over the page beside its mark, where no table's scrolling cuts it and no sticky
// column covers it (E-181): while the mark or the box is under the pointer, while the mark has the keyboard's focus (a
// bid any focus, its field's too), or once a "?" is opened by a click or tap, until tapped again or Escape (WCAG 1.4.13)
const tipbox = document.createElement("div");
tipbox.className = "tipbox";
tipbox.hidden = true;
tipbox.setAttribute("aria-hidden", "true"); // the mark's own label carries the text
document.body.append(tipbox);
let tipHover: HTMLElement | null = null, tipFocus: HTMLElement | null = null;
function placeTip(): void {
  const mark = [tipHover, tipFocus, document.querySelector<HTMLElement>("button.q.open")].find((m) => m?.isConnected);
  tipbox.hidden = !mark;
  if (!mark) return;
  const bid = mark.classList.contains("bid");
  tipbox.className = bid ? "tipbox bid" : "tipbox";
  tipbox.textContent = mark.dataset.tip ?? "";
  const [x, y] = tipPlace(mark.getBoundingClientRect(), tipbox.offsetWidth, tipbox.offsetHeight, innerWidth, innerHeight, bid);
  tipbox.style.left = `${x}px`;
  tipbox.style.top = `${y}px`;
}
document.addEventListener("pointerover", (e) => {
  const t = e.target as HTMLElement;
  if (!tipbox.contains(t)) tipHover = t.closest<HTMLElement>("[data-tip]");
  placeTip();
});
// the pointer out of the window, or a finger lifted
document.addEventListener("pointerout", (e) => { if (!e.relatedTarget) { tipHover = null; placeTip(); } });
document.addEventListener("focusin", (e) => {
  const m = (e.target as HTMLElement).closest<HTMLElement>("[data-tip]");
  tipFocus = m && (m.classList.contains("bid") || m.matches(":focus-visible")) ? m : null;
  placeTip();
});
document.addEventListener("focusout", () => { tipFocus = null; placeTip(); });
addEventListener("scroll", () => { if (!tipbox.hidden) placeTip(); }, { capture: true, passive: true });
addEventListener("resize", () => { if (!tipbox.hidden) placeTip(); });
document.addEventListener("click", (e) => {
  const q = (e.target as HTMLElement).closest<HTMLButtonElement>("button.q");
  for (const x of document.querySelectorAll("button.q.open")) if (x !== q) x.classList.remove("open");
  if (q) q.classList.toggle("open");
  placeTip();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  for (const x of document.querySelectorAll("button.q.open")) x.classList.remove("open");
  if ((document.activeElement as HTMLElement | null)?.matches?.("button.q")) (document.activeElement as HTMLElement).blur();
  tipHover = tipFocus = null;
  placeTip();
});

// printing (the PDF of D13): the charts are drawn again for the print layout, wider without the panel, and after it —
// Chart.js does not resize for print (until D-196 this also took the dark theme to the light one)
addEventListener("beforeprint", redrawCharts);
addEventListener("afterprint", redrawCharts);

// every slider's fill follows it while it is dragged (design F, 2026-10-21); a redraw writes it into the markup
document.addEventListener("input", (e) => {
  const r = e.target;
  if (r instanceof HTMLInputElement && r.type === "range") r.style.setProperty("--p", `${((100 * (Number(r.value) - Number(r.min))) / (Number(r.max) - Number(r.min) || 1)).toFixed(2)}%`);
});

/** The charts of the view shown, drawn again. */
function redrawCharts(): void {
  if (headline.length) drawChartsNow();
}

async function boot() {
  try {
    [p, sources, lk] = await Promise.all([load<Presets>("presets.json", BASE), load<Sources>("sources.json.gz", BASE),
      load<Links>("links.json.gz", BASE).catch(() => null)]);
  } catch (e) {
    status.innerHTML = `<span class="error">${t("The data could not be loaded:")} ${esc(String((e as Error).message))}</span>`;
    return;
  }
  try {
    state = opening(p);
  } catch (e) {
    status.innerHTML = `<span class="error">The application could not start: ${esc(String((e as Error).message))}</span>`;
    return;
  }
  if (location.hash) {
    try {
      const text = textOfHash(location.hash);
      if (text) state = parse(p, text);
    } catch (e) {
      // a notice, not the status line, which the run that follows would overwrite
      notice(t("The link's scenario was not loaded: {why}. Showing the opening state.", { why: String((e as Error).message) }));
    }
  }
  // a link pasted into an open page opens it (R-APP-10)
  addEventListener("hashchange", () => {
    try {
      const text = textOfHash(location.hash);
      if (!text) return;
      ctx().set(parse(p, text), true);
      notice(null);
    } catch (e) {
      notice(t("The link's scenario was not loaded: {why}. The page keeps the scenario it showed.", { why: String((e as Error).message) }));
    }
  });
  // what the panel's growth marks compare with: the fleets of 2026 and 2025, the demand of the
  // latest full year (D-057); the panel does without them until they arrive
  const REF_YEARS = [2026, 2025];
  Promise.allSettled(REF_YEARS.map((y) => load<Year>(`years/${y}.json.gz`, BASE))).then((rs) => {
    const ys = rs.flatMap((r, i) => (r.status === "fulfilled" ? [{ year: REF_YEARS[i], y: r.value }] : []));
    const zones = <T>(f: (z: "EE" | "LV" | "LT") => T) => ({ EE: f("EE"), LV: f("LV"), LT: f("LT") });
    const full = ys.find((r) => r.y.meta.hours >= 8760);
    // Kiisa's emergency reserve, 250 MW of gas engines outside the market, stands in neither year's A68 (ERRATA E-165)
    const kiisa = p.parameters["reserve.tso_asset.kiisa.mfrr_up_mw"]?.value ?? 0;
    const standing = (z: "EE" | "LV" | "LT", cap: Record<string, number>) => (z === "EE" ? { ...cap, gas_ocgt: (cap.gas_ocgt ?? 0) + kiisa } : cap);
    ref = {
      fleets: ys.map((r) => ({ year: r.year, cap: zones((z) => standing(z, observedClasses(p, z, r.y.zones[z].capacity ?? {}))) })),
      twh: full ? { year: full.year, zones: zones((z) => (full.y.zones[z].load ?? []).reduce((a, x) => a + (x ?? 0), 0) / 1e6) } : null,
    };
    refreshHints(panel, ctx());
    drawDeck(); // the inputs' growth from 2025 (the deck's)
  }).catch(() => undefined);
  bindPanel(panel, ctx, (text) => {
    try {
      ctx().set(parse(p, text), true);
      return null;
    } catch (e) {
      return `${t("not loaded:")} ${(e as Error).message}`;
    }
  }, async (what) => {
    const out = what === "text" ? serialize(state) : location.origin + location.pathname + shareHash(serialize(state));
    try {
      await navigator.clipboard.writeText(out);
      return what === "text" ? t("the text is on the clipboard") : t("the share link is on the clipboard");
    } catch {
      return t("the clipboard is not available here; select the text and copy it");
    }
  });
  ctx().set(state, true);
  // the view the language switch was made on (ERRATA E-166), and the deck's slide (D-221)
  const url = new URL(location.href), view = url.searchParams.get("view");
  const views = [...document.querySelectorAll<HTMLButtonElement>("header .views button")].map((x) => x.dataset.view);
  deckAt = Math.max(0, (Number(url.searchParams.get("slide")) || 1) - 1);
  const asked = view === "presentation" ? "deck" : view; // the Presentation page's links open the deck, which took its name (D-249)
  if (asked && asked !== "model" && views.includes(asked)) show(asked as typeof showing);
  // visit statistics, after the view the address asked for, so that the first page view is that view's (D-338)
  initAnalytics();
}

boot().catch((e: unknown) => {
  status.innerHTML = `<span class="error">The application could not start: ${esc(String((e as Error)?.message ?? e))}</span>`;
});
