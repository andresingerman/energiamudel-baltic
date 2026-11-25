// The calibration page (R-APP-7, revision 1.7): the protocol of §9 as validate_fit, estlink2 and the
// gap script wrote it to data/derived/ — the metrics per zone-year and border-year against R-VAL-5's
// thresholds, the EstLink 2 gate (R-VAL-6), the engine against the reference (R-ENG-8) — and the
// fitted-parameter register (R-VAL-2) from presets.json. main.ts loads the files; this renders them.

import { t } from "./i18n.ts";
import type { Evaluation } from "../worker/metrics.ts";
import { GATE_YEARS, THRESHOLD, within } from "../worker/metrics.ts";
import { esc, fmt } from "./labels.ts";
import { flag, tip } from "./panel.ts";

type Pair = { model: number; observed: number };
interface EstLinkYear {
  outage_hours: number; effect_eur_mwh: number; ee_price_outage: Pair & { counterfactual: number; fi: number };
  fi_to_ee_congested_outage: Pair & { counterfactual: number }; ee_fi_spread_year: Pair;
}
export interface EstLink { gate: { rule: string; pass: boolean }; [year: string]: EstLinkYear | EstLink["gate"] }
interface Gap {
  gate: { price_mae_eur_mwh: number; storage_share: number; objective_rel: number }; passed: boolean; highs: string;
  weeks: {
    case: string; pass: boolean;
    // met on the same optimum: hours whose price is not unique (D-175)
    same_optimum?: { hours: number; primal_as_engine: number };
    record: { price_mae: Record<string, number>; price_mae_rest: Record<string, number> | null; storage: { engine_mwh: number; lp_mwh: number; share: number } };
  }[];
}
interface Fit { lineage_id: string; method: string; years?: number[] }
interface Fitted {
  gas_bid: Fit & { eur_mwh: number; reference: string; folds: { year: number; eur_mwh: number }[]; mae_sum_before: number; mae_sum_after: number }; // D-164
  chp_floor: Record<string, Record<string, Fit & { a_mw: number; b_mw_per_k: number; t_ref_c: number; share_above_floor: number }>>;
  battery_delta: Record<string, Fit & { eur_mwh: number; adopted: boolean; fits: { mfrr_share: number; eur_mwh: number; residual_share: number }[] }>;
  kruonis_output?: Fit & { step_eur_mwh: number; segments: number; grid: { step: number; mae_sum: number }[] }; // D-115
}
export interface Calibration { years: Evaluation[]; estlink: EstLink; gap: Gap; fitted: Fitted }

const ZONES = ["EE", "LV", "LT"];
/** A cell and its verdict: null outside the gate years; a failure is marked by a sign, not colour alone. */
/** The validation's state in words (R-PUB-4): every export's gate line. The pages carry no banner of it since D-201 —
 * the Calibration page gives the gates, the documents the figures. */
export const gateNote = (): string => `${t("Validation gate not met; released at the owner's decision.")} ${t("Validation runs of 2023–2025 miss hourly prices by 9–18 €/MWh against a threshold of 15, and the Calibration page lists every other deviation; the EstLink 2 test is met. Results, the plant's included, are scenario results under the assumptions shown, not forecasts.")}`;
/** What a part of the page shows and how to read it, in words, above its table (the owner asked, 2026-11-25: D-322). */
const why = (text: string) => `<p class="note why">${text}</p>`;
const cell = (ok: boolean | null, text: string) => `<td class="${ok === false ? "fail" : ""}">${text}${ok === false ? " ✗" : ""}</td>`;
const pct = (x: number) => fmt(100 * x, 0);
const verdict = (ok: boolean) => `<strong class="${ok ? "pass" : "fail"}">${ok ? t("✓ met") : t("✗ not met")}</strong>`;
/** A technology of ENTSO-E A75 by name, as the tables show it. */
const tech = (k: string) => t(k.replace(/_/g, " "));

/** A year's metrics outside R-VAL-5's thresholds, counted as validate_fit counts its breaches. */
export function breaches(e: Evaluation): number {
  let n = 0;
  for (const m of Object.values(e.zones)) {
    n += Number(!within.mae(m.mae)) + Number(!within.durationRmse(m.durationRmse)) + Number(!within.share150(m.share150));
    for (const g of Object.values(m.gen)) n += Number(!within.gen(g));
  }
  for (const b of Object.values(e.borders)) n += Number(!within.netFlow(b.netFlowTwh)) + Number(!within.congested(b.congested.fwd)) + Number(!within.congested(b.congested.rev));
  return n;
}

function prices(years: Evaluation[]): string {
  return `<table class="calib"><thead><tr><th>${t("year")}</th><th>${t("zone")}</th><th>${t("hourly MAE, €/MWh (≤ {x})", { x: THRESHOLD.maeEurMwh })}</th><th>${t("duration-curve RMSE (≤ {x})", { x: THRESHOLD.durationRmseEurMwh })}</th>
    <th>${t("hours ≥ 150 €/MWh, % model / observed (± {x} pp)", { x: THRESHOLD.share150Pp })}</th><th>${t("bias, €/MWh")}</th></tr></thead><tbody>${years.flatMap((e) => {
    const g = GATE_YEARS.includes(e.year);
    return ZONES.map((z, i) => {
      const m = e.zones[z];
      return `<tr${i === 0 ? ' class="first"' : ""}><td>${i === 0 ? e.year : ""}</td><td>${flag(z)}${z}</td>${cell(g ? within.mae(m.mae) : null, fmt(m.mae))}${cell(g ? within.durationRmse(m.durationRmse) : null, fmt(m.durationRmse))}
        ${cell(g ? within.share150(m.share150) : null, `${fmt(100 * m.share150.model)} / ${fmt(100 * m.share150.observed)}`)}<td>${fmt(m.bias)}</td></tr>`;
    });
  }).join("")}</tbody></table>`;
}

function generation(years: Evaluation[]): string {
  return `<table class="calib gen"><thead><tr><th>${t("year")}</th><th>${t("zone")}</th><th class="l">${t("each class, TWh model / observed (± {x} % above {min} TWh)", { x: fmt(100 * THRESHOLD.genShare, 0), min: fmt(THRESHOLD.genMinTwh, 1) })}</th></tr></thead><tbody>${years.flatMap((e) => {
    const g = GATE_YEARS.includes(e.year);
    return ZONES.map((z, i) => {
      const items = Object.entries(e.zones[z].gen).filter(([, x]) => x.model > 0.05 || x.observed > 0.05).sort(([a], [b]) => a.localeCompare(b));
      return `<tr${i === 0 ? ' class="first"' : ""}><td>${i === 0 ? e.year : ""}</td><td>${flag(z)}${z}</td><td class="l">${items.map(([k, x]) => {
        const bad = g && !within.gen(x);
        return `<span class="${bad ? "fail" : ""}">${esc(tech(k))} ${fmt(x.model, 2)} / ${fmt(x.observed, 2)}${bad ? " ✗" : ""}</span>`;
      }).join(" ")}</td></tr>`; // each class a chip (D-197), a breach on red
    });
  }).join("")}</tbody></table>`;
}

function borders(years: Evaluation[]): string {
  return `<table class="calib"><thead><tr><th>${t("year")}</th><th>${t("border")}</th><th>${t("net flow, TWh model / observed (± {x} %)", { x: fmt(100 * THRESHOLD.netFlowShare, 0) })}</th>
    <th>${t("congested along, % (± {x} pp)", { x: THRESHOLD.congestedPp })}</th><th>${t("congested against, %")}</th><th>${t("rent, M€")}</th><th>${t("median price difference, second zone − first, €/MWh")}</th></tr></thead><tbody>${years.flatMap((e) => {
    const g = GATE_YEARS.includes(e.year);
    return Object.entries(e.borders).map(([code, b], i) => `<tr${i === 0 ? ' class="first"' : ""}><td>${i === 0 ? e.year : ""}</td><td>${esc(code)}</td>
      ${cell(g ? within.netFlow(b.netFlowTwh) : null, `${fmt(b.netFlowTwh.model, 2)} / ${fmt(b.netFlowTwh.observed, 2)}`)}
      ${cell(g ? within.congested(b.congested.fwd) : null, `${pct(b.congested.fwd.model)} / ${pct(b.congested.fwd.observed)}`)}
      ${cell(g ? within.congested(b.congested.rev) : null, `${pct(b.congested.rev.model)} / ${pct(b.congested.rev.observed)}`)}
      <td>${fmt(b.rentMeur, 1)}</td><td>${fmt(b.spread.model[1])} / ${fmt(b.spread.observed[1])}</td></tr>`);
  }).join("")}</tbody></table>`;
}

function estlink2(x: EstLink): string {
  const rows = Object.keys(x).filter((k) => /^\d{4}$/.test(k)).sort().map((y) => {
    const e = x[y] as EstLinkYear;
    return `<tr><td>${y}</td><td>${fmt(e.outage_hours, 0)}</td><td>${fmt(e.ee_price_outage.model)} / ${fmt(e.ee_price_outage.counterfactual)} / ${fmt(e.ee_price_outage.observed)}</td>
      <td><strong>${fmt(e.effect_eur_mwh)}</strong></td><td>${pct(e.fi_to_ee_congested_outage.model)} / ${pct(e.fi_to_ee_congested_outage.counterfactual)} / ${pct(e.fi_to_ee_congested_outage.observed)}</td>
      <td>${fmt(e.ee_fi_spread_year.model)} / ${fmt(e.ee_fi_spread_year.observed)}</td></tr>`;
  });
  return `<p class="note">${esc(t(x.gate.rule).replace(/^R-VAL-6: /, "EstLink 2 test: "))} — ${verdict(x.gate.pass)}. ${t("The same year with EstLink 2 back in service inside the cable's outage (A31 + 650 MW, capped at the nameplate).")}</p>
    <table class="calib"><thead><tr><th>${t("year")}</th><th>${t("outage hours")}</th><th>${t("EE average price in the outage, €/MWh: model / with EstLink 2 / observed")}</th><th>${t("effect, €/MWh")}</th>
    <th>${t("FI→EE congested in the outage, %: model / with EstLink 2 / observed")}</th><th>${t("EE–FI spread over the year, €/MWh: model / observed")}</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function gap(g: Gap): string {
  return `<p class="note">${t("Each test week solved by the engine of record in the browser and by the offline reference (HiGHS {highs} in Python) from the same problem: the gate is {gap} €/MWh of average price gap and ±{share} % of storage output, or the same optimum — each day's objective within {obj} % of the reference's — where hours have more than one optimal price", { highs: esc(g.highs), gap: fmt(g.gate.price_mae_eur_mwh, 1), share: fmt(100 * g.gate.storage_share, 0), obj: fmt(100 * g.gate.objective_rel, 4) })} — ${verdict(g.passed)}.</p>
    <table class="calib"><thead><tr><th>${t("week")}</th><th>${t("price gap EE / LV / LT, €/MWh")}</th><th>${t("storage output, MWh: engine / reference")}</th><th></th></tr></thead><tbody>${g.weeks.map((w) =>
    `<tr><td>${esc(w.case.replace("_", " "))}</td><td>${ZONES.map((z) => fmt(w.record.price_mae[z], 3)).join(" / ")}</td><td>${fmt(w.record.storage.engine_mwh, 0)} / ${fmt(w.record.storage.lp_mwh, 0)}</td>${cell(w.pass, !w.pass ? "" : w.same_optimum ? `✓ ${t("the same optimum; {n} hours with more than one optimal price", { n: w.same_optimum.hours })}` : "✓")}</tr>`).join("")}</tbody></table>`;
}

/** The largest price gap of the test weeks, outside the hours whose price is not unique (D-175). */
const largestGap = (g: Gap) => Math.max(...g.weeks.flatMap((w) => ZONES.map((z) => ((w.same_optimum && w.record.price_mae_rest) || w.record.price_mae)[z])));

function fitted(f: Fitted): string {
  const row = (name: string, value: string, x: Fit, years: string) =>
    `<tr><td>${name}</td><td class="l">${value}<br><span class="note">${t("fitted on {years}", { years })} · ${esc(x.lineage_id)}</span></td></tr>`;
  const head = (text: string) => `<tr class="first"><td colspan="2" class="l"><strong>${text}</strong></td></tr>`;
  // the gas plants' one bid (R-SUP-6, D-164): the adder over a combined-cycle plant's cost, each fit year's own
  const g = f.gas_bid;
  const gas = row(ZONES.map((z) => `${flag(z)}${z}`).join(" "), t("{x} €/MWh above a combined-cycle plant's cost — each fit year alone: {folds}; the fit years' sum of MAE {before} at cost, {after} with it", {
    x: fmt(g.eur_mwh, 2), folds: g.folds.map((x) => `${x.year} ${fmt(x.eur_mwh, 1)}`).join(", "), before: fmt(g.mae_sum_before, 2), after: fmt(g.mae_sum_after, 2) }), g, (g.years ?? []).join(", "));
  const floor = ZONES.flatMap((z) => Object.entries(f.chp_floor[z] ?? {}).map(([k, c]) =>
    row(`${flag(z)}${z} ${esc(tech(k))}`, t("{a} MW + {b} MW per K below {t} °C; {share} % of hours at or above it", { a: fmt(c.a_mw, 1), b: fmt(c.b_mw_per_k, 2), t: fmt(c.t_ref_c, 0), share: pct(c.share_above_floor) }), c, (c.years ?? []).join(", "))));
  const delta = Object.entries(f.battery_delta).map(([z, d]) =>
    row(`${flag(z)}${z}`, `${fmt(d.eur_mwh, 1)} €/MWh${d.adopted ? t(", adopted") : ""} — ${t("the fits:")} ${d.fits.map((x) => t("mFRR share {s} % → {x} €/MWh, residual {r} %", { s: pct(x.mfrr_share), x: fmt(x.eur_mwh, 1), r: fmt(100 * x.residual_share, 1) })).join("; ")}`, d, "2026"));
  const k = f.kruonis_output;
  const step = k ? row(`${flag("LT")}Kruonis`, t("{x} €/MWh more for each further quarter of its output in an hour — the grid: {grid} (the fit years' sum of MAE)", { x: fmt(k.step_eur_mwh, 0), grid: k.grid.map((g) => `${fmt(g.step, 0)} → ${fmt(g.mae_sum, 2)}`).join(" · ") }), k, (k.years ?? []).join(", ")) : "";
  return `<table class="calib"><thead><tr><th>${t("parameter")}</th><th class="l">${t("value")}</th></tr></thead><tbody>
    ${head(t("The gas plants' one bid in Estonia, Latvia and Lithuania"))}${gas}
    ${k ? head(t("Kruonis's output cost by the share of its power in use in the hour")) + step : ""}
    ${head(t("Heat-driven floor of the CHP plants"))}${floor.join("")}
    ${head(t("The batteries' cycling cost Δ"))}${delta.join("")}</tbody></table>`;
}

export function calibrationHtml(c: Calibration): string {
  const years = [...c.years].sort((a, b) => a.year - b.year);
  const gate = years.filter((e) => GATE_YEARS.includes(e.year));
  const n = gate.reduce((s, e) => s + breaches(e), 0);
  const worst = Math.max(...gate.flatMap((e) => ZONES.map((z) => e.zones[z].mae)));
  return `<section class="calibration">
    <h2>${t("Calibration")}</h2>
    ${why(t("This page answers how far the model can be trusted. The model computes the past years again on what each year had — its plants, demand, fuel and CO₂ prices, the lines' capacities, the weather and the neighbours' prices — and sets every hour of its result beside the exchange's record. The Baltic prices themselves are never given to it: they are what it is measured against. The scenarios' result is the difference between two scenarios, not the level of the price: an error the model makes in every scenario largely cancels in the difference."))}
    <details class="about"><summary>${t("About this page")}</summary><p class="note">${t("Each observed year is replayed by the engine of record on its own fleet, demand, fuel prices, transfer capacities and neighbours' prices — never the Baltic prices it is measured against — and compared with what happened (methodology §7). The thresholds bind in the fit years 2023 and 2024 and the blind year 2025; 2020–2022 are diagnostics without thresholds, 2026 the second blind year as its months complete. A ✗ marks a figure outside its threshold.")}</p></details>
    ${why(t("Three verdicts first: whether every figure of the years with thresholds is inside its threshold; whether the model reproduces a real event, EstLink 2's outage; and whether the engine that runs in your browser solves the problem exactly as an independent reference programme does."))}
    <div class="gates">
      <div class="card"><h3>${t("Thresholds")}</h3>${verdict(n === 0)}<p class="note">${t("{n} figures of 2023–2025 outside their thresholds; the hourly price error reaches {worst} €/MWh against {x}.", { n, worst: fmt(worst), x: THRESHOLD.maeEurMwh })}</p></div>
      <div class="card"><h3>EstLink 2</h3>${verdict(c.estlink.gate.pass)}<p class="note">${t("2024: the cable's outage raised Estonia's price by {x} €/MWh in the model (gate 15–30; Elering about 18).", { x: fmt((c.estlink["2024"] as EstLinkYear).effect_eur_mwh) })}</p></div>
      <div class="card"><h3>${t("Engine against the reference")}</h3>${verdict(c.gap.passed)}<p class="note">${t("{n} test weeks, largest price gap {x} €/MWh.", { n: c.gap.weeks.length, x: fmt(largestGap(c.gap), 3) })}${c.gap.weeks.filter((w) => w.same_optimum).map((w) => " " + t("{h} hours of one week have more than one optimal price: the engine and the reference each found one of them.", { h: w.same_optimum?.hours ?? 0 })).join("")}</p></div>
    </div>
    <h3>${t("Prices per zone and year")}</h3>${why(t("For each zone and year. The hourly MAE is how far the model's price is from the market's in an average hour. The duration-curve RMSE compares the hours sorted from the dearest, whatever their time: it shows whether the spread of prices is right. The share of hours at 150 €/MWh or more shows whether the model catches the dear hours. The bias is the average error with its sign: a minus means the model's price is below the market's. The thresholds bind in 2023–2025; 2020–2022 are shown for reference, and 2026 is a blind year the model was not fitted on."))}${prices(years)}
    <h3>${t("Generation per class")}</h3>${why(t("Each energy source's generation in the year, the model's beside the record. A gap shows where the model runs a plant more or less than it ran; the price is set by the last plant needed, so a source run wrongly moves the price too. Small sources are shown without a verdict."))}${generation(years)}
    <h3>${t("Borders")} ${tip(t("Borders: along = the direction of the border's code (EE→FI, EE→LV, LV→LT, LT→SE4, LT→PL)"))}</h3>${why(t("For each border: the net flow over the year, the share of hours the line was full in each direction, the congestion rent the price difference earned on it, and the median price difference between the two zones. It shows whether the model sends power over the lines where and when the market did."))}${borders(years)}
    <h3>${t("The EstLink 2 counterfactual")}</h3>${why(t("A test on a real event: EstLink 2 was out for months in 2024 and 2025 after damage to the cable. Each year is computed twice — as it was, with the cable out, and as if the cable had worked. The difference is the outage's effect on Estonia's price; the model's own price in the outage stands beside the market's, so the effect rests on a model that met the real price."))}${estlink2(c.estlink)}
    <h3>${t("The engine of record against the reference programme")}</h3>${why(t("The model's price engine runs in your browser. For each test week it solves the same problem as a reference programme, HiGHS in Python, and the two answers are compared: where they match, the browser computes correctly. In some hours several prices are equally optimal; there the two may pick different ones, and the check asks only that the optimum be the same."))}${gap(c.gap)}
    <h3>${t("Fitted parameters")}</h3>${why(t("The few figures not taken from a source but fitted to past years, so that the model meets the market better: the adder of the gas plants' one bid, Kruonis's cost by how much of its power it uses, the floor of output that the CHP plants' heat demand keeps on, and the batteries' cycling cost. Each names the years it was fitted on and its record in the data's lineage."))}${fitted(c.fitted)}
  </section>`;
}
