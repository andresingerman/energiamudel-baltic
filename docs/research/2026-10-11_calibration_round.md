# The calibration round of 2026-10-11: what the fit minimises, and a scenario's Kruonis

The owner's request: "yes, start the calibration round", on the executor's recommendation in D-117's
consequences. Branch `calibration/objective-kruonis` from `main` 5830fc5 (D-115 to D-117 in force
and deployed). Scripts: `spikes/calibration-round/`.

## 0. The two questions

**A — what the fit minimises.** The markup schedule and Kruonis's step are fitted on the sum of the
three zones' hourly MAE (D-073, D-115; methodology §7.2). A parameter that moves the price in a set
of hours lowers the MAE until as many of those hours lie above the record as below it: the MAE
fits the median. The Baltic price is skewed to the right, so a model fitted on the MAE sits below
the record's average. On D-115's register the average bias on the fit years is −1.5 / −1.9 / −1.8
€/MWh in 2023 (EE / LV / LT) and −3.5 / −5.1 / −5.0 in 2024, and each refit on the MAE has lowered
it further. The plant's revenue and a contract's cost rest on the average price.

**B — a scenario's Kruonis.** A replay gives Kruonis the power the record shows in each week
(D-073); a scenario gives it the installed megawatts. D-115's step, fitted on the replays, works on
segments of a quarter of the hour's power. The segments are about 106 MW in a replay at the fit
years' median and 166–187 MW in a scenario, so the step holds a scenario's Kruonis back 35–45 %
less per megawatt. The record's weekly maximum is 0.64 of the plant's full output at the median in
2023, 2024 and 2026, and 0.59 in 2025: 423, 424, 390 and 428 MW of 666. The plant provides
balancing services, its units at full power within two minutes (Ignitis, "Pumped storage",
https://ignitisgrupe.lt/en/about-us/pumped-storage). In July 2026 its owner chose a platform to
schedule it for FCR, aFRR, mFRR and capacity reserve obligations under the synchronous area's rules
(Water Power Magazine, 14 July 2026, https://www.waterpowermagazine.com/news/ignitis-gamyba-to-deploy-hydrogrid-platform-across-lithuanian-hydro-portfolio/).
A fifth unit under construction takes the plant to 1 010 MW.

## 1. The rule, written before anything is scored

**A.** The candidates:

| | Objective, summed over the three zones and the year(s) |
|---|---|
| A0 | MAE (in force) |
| A1 | MAE + \|average bias\|: a euro of systematic error counts as a euro of hourly error |
| A2 | MAE + duration-curve RMSE: the gate's two price measures (R-VAL-3) |

**How each is fitted.**
- Each is fitted as `app/scripts/fit_markup.ts` fits the register in force: per fit year a schedule
  from zero, and the register is their average.
- Kruonis's step is kept on the grid 0–90 by the objective's own sum over the fit years.
- Δ is held at 71.5. It is fitted on 2026's battery output and moves 2026 alone; it is refitted only
  with a built candidate.

**When a candidate replaces A0.** It must meet all three on the fit years 2023–2024:
1. the sum of the six zone-years' |average bias| is at most half of A0's;
2. the sum of MAE worsens by at most 0.6 €/MWh, the noise margin (E-065);
3. no breach of R-VAL-5 is added in 2023 or 2024.

Among candidates that pass, the one with the lowest crossed sum of MAE + |average bias| is taken
(each fold's schedule scored on the other year).

**What is only reported.**
- 2025 and January–September 2026, once per candidate; never chosen on.
- The opening state for each candidate: it is what moves, and the owner signs it.

**B.** Three variants on the opening view, at the register in force:

| | A scenario's Kruonis |
|---|---|
| B0 | the installed megawatts (in force) |
| B1 | the record's power: output and pumping limits at 0.636 of the plant's full output, the fit years' median weekly maximum (423–424 MW of 666), every hour; the step's segments then match the replays' |
| B2 | the step per megawatt: the step scaled by the scenario's segment over the replays' 106 MW — 94 €/MWh for 900 MW, 98 for 938, 106 for 1 010 |

**What is decided.**
- B changes no replay and needs no refit.
- If every scenario's zone averages move by less than 0.5 €/MWh under both B1 and B2, B0 stays and
  no rule is added.
- Otherwise the effects go to the owner with the evidence on Kruonis's reserve duties.
- If a candidate of A is kept and B moves the view, B is measured again on that candidate.

## 2. What follows

A kept candidate is built as Proposed:
- the objective in `fit_markup.ts`;
- `make fit`;
- a fresh database;
- `make check`, `make validate`, `make gap`;
- the golden fixture re-baselined, provisional;
- the methodology's figures;
- a decision record and ERRATA as needed.

A kept variant of B goes the same way, without the refit.

## 3. B: a scenario's Kruonis moves the opening view by a tenth at most

`kruonis.ts` on the register in force. Every opening scenario carries ERAA 2025's 938 MW for
Kruonis. Averages are weighted over the three climate years, EE / LV / LT, €/MWh:

| | *Elering: gas* | *1 SMR* | *2 SMR* | *3 SMR* |
|---|---|---|---|---|
| B0, installed (in force) | 84.65 / 80.93 / 80.92 | 76.25 / 77.88 / 77.88 | 67.14 / 75.83 / 75.85 | 56.93 / 74.58 / 74.60 |
| B1, the record's power | +0.12 / +0.10 / +0.10 | +0.01 / 0.00 / 0.00 | +0.01 / +0.07 / +0.07 | −0.04 / +0.06 / +0.06 |
| B2, the step per MW | +0.01 / +0.02 / +0.02 | +0.01 / +0.02 / +0.02 | 0.00 / +0.01 / +0.01 | −0.01 / +0.01 / +0.01 |

Both stay far under the rule's 0.5 €/MWh. Under the step a scenario's Kruonis seldom runs high
enough for a lower limit or a dearer segment to bind. **B0 stays; no rule is added.**

## 4. A: neither objective passes; the MAE stays

The candidates were fitted with `fit_markup.ts --objective=bias|dur`, as the register is fitted,
and scored with `score.ts`. Δ is 71.5. Sums run over the three zones; "fit years" are 2023 + 2024;
"crossed" is each fold's schedule scored on the other year.

| | A0, MAE (in force) | A1, MAE + \|bias\| | A2, MAE + duration RMSE |
|---|---|---|---|
| Register LV / LT, €/MWh; Kruonis's step | 32.5 / 80 / 220 / 260; 60 | 87.5 / 167.5 / 227.5 / 247.5; 0 | 52.5 / 187.5 / 247.5 / 267.5; 30 |
| Folds 2023 / 2024 | 30 / 70 / 110 / 110 · 35 / 90 / 330 / 410 | 80 / 80 / 120 / 120 · 95 / 255 / 335 / 375 | 45 / 145 / 185 / 185 · 60 / 230 / 310 / 350 |
| Fit years: Σ MAE | **59.51** | 67.81 (+8.30) | 61.34 (+1.83) |
| Fit years: Σ \|average bias\| (rule 1: ≤ 9.46) | 18.91 | **6.40** | 10.03 |
| Breaches 2023 / 2024 (rule 3) | 8 / 5 | 9 / 6 | 9 / 6 |
| Crossed: Σ MAE / Σ (MAE + \|bias\|) | 60.33 / 80.63 | 68.74 / 80.48 | 61.97 / 72.93 |
| Duration-curve RMSE, Σ 2023 / 2024 | 9.8 / 22.9 | 11.6 / 22.9 | 6.9 / 17.7 |
| 2025 (reported): Σ MAE, average bias LV / LT, breaches | 51.42, −1.2 / −1.3, 8 | 58.65, +5.0 / +4.8, 11 | 55.52, +2.9 / +2.7, 9 |
| 2026 (reported): Σ MAE, average bias EE / LV / LT | 33.60, −6.5 / −4.1 / −4.4 | 36.23, −5.8 / −1.6 / −1.8 | 34.24, −6.0 / −2.6 / −2.8 |
| 2020 / 2021: average bias LV | +17.2 / +12.6 | +24.3 / +19.6 | +21.2 / +15.5 |
| Opening state, *Elering: gas* | 84.65 / 80.93 / 80.92 | 85.22 / 82.17 / 82.16 | 85.34 / 81.89 / 81.89 |
| *2 SMR* | 67.14 / 75.83 / 75.85 | 67.80 / 76.90 / 76.92 | 67.74 / 76.63 / 76.66 |

**What the rule says.**
- A1 meets rule 1: the fit years' |average bias| falls from 18.91 to 6.40. It fails rules 2 and 3:
  the hours fit 8.30 €/MWh worse, and a breach is added in each fit year.
- A2 fails all three. Its |average bias| of 10.03 is above half of A0's, its MAE is 1.83 worse, and
  it adds a breach in each fit year.
- **A0 stays.** The crossed sum of MAE + |bias| would have favoured A2 (72.93 against 80.63). The
  rule ranks by it only among the candidates that pass.

**What the round shows.**
- The replays' average bias is the year's, not a constant the markup can take out. On A0 it is
  +16 to +17 €/MWh in 2020, +10 to +13 in 2021, about 0 in 2022, and −1.2 to −6.5 in 2023–2026.
- A schedule that removes 2023–2024's lean raises every gas hour: A1 adds 87.5 €/MWh to the lowest
  half of the fleet. That overshoots in the years whose lean is smaller or positive. 2025 turns to
  +5 in Latvia and Lithuania, and 2020–2021 grow by 5–7.
- The duration-curve objective draws the distribution closer: 2024's share of dear hours is
  1.2–1.3 points short against 2.3–2.5, and the duration RMSE is lower. It still turns 2025's average to +2.9.
- The scenarios hardly depend on the choice. Either objective raises the opening view by only 0.4
  to 1.2 €/MWh, less than the replays' lean in any year since 2023.
- The contract's figures should therefore be read with a level uncertainty of a few euros, which
  ran low in 2023–2026. Methodology §10 now says so.

## 5. Outcome

Nothing in the model moves. The register stays fitted on the MAE (A0), and a scenario's Kruonis
keeps its installed megawatts (B0). Both questions D-116 left open are answered with the measurements
above; the decision is D-118, proposed. `fit_markup.ts` keeps `--objective` to reproduce this round;
its default is the register's MAE.

## 6. The owner's decision

On 2026-10-11 the owner accepted D-118 ("I accept D-118, merge into main and deploy"; D-119). The branch
is merged into `main` and deployed to /v5.

