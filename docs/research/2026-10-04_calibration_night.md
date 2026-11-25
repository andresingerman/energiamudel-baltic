# Calibration log, the round of D-042 and D-044 (night of 2026-10-04)

*Gate status (R-PUB-4): the validation gate R-VAL-5 is not met (methodology §7.3; 2023 meets its
price thresholds, 2024 and the blind year 2025 do not); the EstLink 2 gate R-VAL-6 is met (§7.4).
The register described here (DECISIONS D-042 and D-044) was accepted by the owner on 2026-10-05
(D-045).*

A second round of the calibration protocol (PLAN §4 M3; `2026-09-25_calibration_m3.md` has steps
S0–S6): one change per full-year run of 2023, 2024 and 2025 on the engine of record; a change is
kept only if no zone's MAE rises; nothing is fitted on 2025 (R-VAL-1); no observed price or flow
of a core zone enters the engine (R-BND-3). Tools: `app/scripts/validate_fit.ts` (the protocol),
`spikes/night-calibration/` (the diagnostics and the one-change runs, changes made on the built
problem so the engine stayed untouched until a change was kept).

## How the error was read

1. *By observed price bin, against the record's quantities* (`diag_night.ts`, 2024, M3's
   register). In the hours Estonia cleared at or below 10 €/MWh the model imported more from
   Finland than was scheduled (502–617 MW against 422–570) and still cleared 24–33 €/MWh above
   the market; its thermal plants ran 56–95 MW in Estonia against 140–174 observed and 27–45
   against 58–82 in Latvia, the Daugava 88–109 MW against 119–192. In the hours above 250 €/MWh
   it was the reverse: 999 MW of Daugava against 472 observed, 618 MW of Estonian thermal output
   against 518, and prices 117 €/MWh too low.
2. *By what sets the price* (`diag_regime.ts`). Observed, a Baltic price equals a neighbour's
   within 0.5 €/MWh — Estonia's the Finnish, or Lithuania's that of SE4 or Poland — in 68 % of
   the hours of 2024 (77 % in 2023, 58 % in 2025). The model landed on a neighbour's price in
   fewer than 700 hours of 2024: with R-BND-4's losses on, an uncongested border clears 1.6–4.3 %
   off the neighbour.
3. *By price ratio across each border* (hours with both prices above 20 €/MWh): EE / FI is
   1.000 in 54.0, 42.4 and 40.3 % of hours of 2023, 2024 and 2025; LT / SE4 in 50.2, 23.7 and
   10.8 % (in 2025 another 11 % within about one per cent above 1, which a loss factor of 3–4 %
   would not give; the cause was not looked for); LT / PL in 27.8, 37.0 and 20.3 %. No ratio other than
   1 holds more than 3 % of hours. EE / LV and LV / LT are 1.000 in 85–99 %.
4. *In the dear hours* (`exp_night.ts peak=150`, hours with Lithuania at or above 150 €/MWh):
   observed mean 221 and 214 €/MWh in 2024 and 2025; model 152 and 147 after S7–S8 with M3's
   floor scaled by 3, and 166 and 170 after S10; thermal output and Kruonis near the record, the
   Daugava 526–629 MW against 363–454 observed.

## Steps

Hourly MAE, €/MWh, EE / LV / LT; the sum is over the three years and zones.

| Step | Change | 2023 | 2024 | 2025 (blind) | Sum |
|---|---|---|---|---|---|
| S6 | M3's register (D-025) | 19.12 / 20.19 / 19.09 | 20.92 / 23.28 / 22.72 | 32.79 / 32.66 / 27.98 | 218.73 |
| S7 | Replays without the cables' losses | 16.69 / 18.26 / 16.79 | 19.53 / 22.31 / 21.66 | 31.01 / 31.49 / 26.65 | 204.40 |
| S8 | Daugava's turbine limit = its observed weekly maximum | 15.21 / 16.23 / 15.50 | 17.99 / 20.17 / 20.10 | 28.33 / 28.28 / 25.25 | 187.06 |
| S9 | Floor = mean output of the fit years' below-cost hours | 12.86 / 14.63 / 13.68 | 16.24 / 18.68 / 18.56 | 24.45 / 25.47 / 22.68 | 167.25 |
| S10 | Markup refitted (D-023's method) | 12.85 / 14.34 / 13.61 | 15.53 / 17.34 / 17.33 | 23.90 / 24.44 / 22.75 | 162.09 |
| S11 | Daugava between its weekly 10th and 90th percentile hour (D-044) | 12.10 / 13.32 / 12.90 | 14.87 / 16.40 / 16.52 | 23.10 / 22.61 / 22.38 | 154.20 |
| S12 | `make fit` rerun on S11 (markup, Δ) | 12.01 / 13.26 / 12.84 | 14.88 / 16.53 / 16.71 | 22.08 / 21.75 / 21.11 | 151.17 |

After S10 the batteries' Δ was refitted as `make fit` does (58.5 €/MWh at share 0; 2023–2025
have no batteries and do not move; 2026: 15.4 / 18.9 / 13.2), and again after S12 (61 €/MWh;
2026: 14.8 / 16.9 / 12.2). Breaches of R-VAL-5: 14 / 18 / 17 (S6) → 11 / 15 / 17 (S9) → 8 / 17 / 20
(S10) → 9 / 15 / 20 (S12). S7–S10 are D-042 and one commit; S11–S12 are D-044 and the next, so
that the owner can refuse the second alone.

S11 came from running the price-bin diagnostic again on D-042's register (2025): in the hours
that cleared at or below 30 €/MWh the model ran 142–156 MW of the Daugava against 245–282
observed, and in the hours above 150 €/MWh 636–658 against 450–494 — the week's minimum and
maximum are two hours of 168, and the programme sat at them in most. Bands tried, sum of MAE over
the three years (fit years alone in brackets), on S10's markup: 5–95 % 156.35 (87.45); 10–90 %
154.20 (86.11); 15–85 % 155.04; 20–80 % 155.65 (84.44); 30–70 % 176.77; 20 % below and 5 %
above 152.55; 30 % below and 10 % above 152.08. Only 5–95 and 10–90 lower every zone in every
year. As shares of the week's mean release instead (a rule a scenario year could use): 0.4–2.2
164.36, 0.5–2.0 161.11, 0.6–1.8 158.20, 0.5–1.6 161.81 — each raises 2023.

S12's markup (EE 80 / 160 / 200 / 200, LV 35 / 275 / 355 / 435, LT 0 / 80 / 400 / 520) is where the
descent from zero stops on the band; its fit-year sum, 86.23, is 0.12 above what S10's schedule
gives on the same band (86.11). The two optima differ by 1 €/MWh in the blind year, in the
refit's favour, which is no ground for choosing between them (R-VAL-1); the register holds what
`make fit` reproduces. A multi-start descent would be the method's repair, and the owner's to
ask for.

S10 breaks the protocol's rule in one cell: Lithuania's blind-year MAE rises from 22.68 to 22.75.
The markup is R-SUP-6's required element and its objective is the fit years' sum (100.70 →
90.99); the exception is the owner's to confirm, as in D-023. The schedule it finds (LV 40 / 400 /
560 / 560, LT 0 / 280 / 480 / 520) prices the upper half of the two gas fleets out of ordinary
hours; Latvian gas falls from 1.47 / 1.65 / 1.54 TWh (S9) to 1.10 / 1.07 / 1.11 against 1.35 / 1.60 /
1.57 observed.

## Tried and not kept

All on the register after S10 unless stated; sums over the three years.

| Trial | Sum of MAE | Why not kept |
|---|---|---|
| Floor: M3's envelope scaled by 2, 3, 4 (after S7–S8) | 176.57, 174.66, 176.52 | a scale is a knob without a meaning; the below-cost mean does better (167.25) without one |
| Floor: below-cost hours with a 10 €/MWh margin under the bid | 168.72 | no better than no margin (167.25) |
| Floor: the median, or the 25th percentile, of the below-cost output | 170.19, 181.32 | worse than the mean |
| Daugava: each UTC day within 0.65–1.35 (0.9–1.1) of the week's daily mean (after S7–S8, floor × 3) | 172.72 (171.72) against 174.66 | 2–3 for a new constraint in the programme and the reference; the record's own band (5th–95th percentile of 2023–2024) is 0.63–1.38 |
| Daugava: limit at 0.9, 0.8, 0.7 of the weekly maximum | 157.82, 157.70, 156.04 | evidence for the owner (D-042 item 8); at 0.8 the blind year's EE and LT rise, in 2023 the cascade spills |
| Kruonis Δ = 90, 120, 160 €/MWh (prior 60) | 156.69, 154.42, 154.39 | evidence for the owner (D-042 item 8); Kruonis generates 0.06–0.11 TWh at 120 and 0.02–0.06 at 160 against 0.48–0.57 observed; at 160 the blind year's EE rises |
| Kruonis Δ = 90, 120 €/MWh on S11 | 150.24, 150.07 against 154.20 | the same evidence on the band; Kruonis 0.16–0.25 and 0.07–0.15 TWh |
| Kruonis Δ = 30 (before S7) | 229.08 against 218.73 | worse: more arbitrage flattens the model's prices further |
| Thermal availability × 0.9 | 163.78 | worse |
| Thermal availability = each day's observed maximum output, on S12 (with the markup; without it) | 179.87; 168.51 against 151.17 | worse: the day's maximum as a cap is not the commitment effect v4 used (its input was the day's committed minimum as must-run) |
| Gas availability × 0.6 instead of a markup | 163.83 | no better than the markup, and at × 0.4 the model sheds load in 2025 |
| A markup on Estonian oil shale (0 / 40 / 80 / 160 and others) | 161.79–162.00 | 0.3 at best |
| Oil-shale bids + 20 €/MWh | 164.04 | worse |

Fit years only, Kruonis Δ: 94.54 (40), 90.99 (60), 88.18 (80), 86.21 (100), 84.79 (120), 84.11
(140), 83.82 (160), 83.92 (200), 84.92 (300).

## Where the error sits (after S12)

Lithuania, 2025, by observed price bin (`validate_fit.ts --diagnose`):

| Observed price, €/MWh | ≤ 0 | 0–10 | 10–30 | 30–60 | 60–100 | 100–150 | 150–250 | > 250 |
|---|---|---|---|---|---|---|---|---|
| Hours | 205 | 1 095 | 936 | 1 242 | 2 210 | 1 820 | 1 005 | 247 |
| Bias, €/MWh | +6 | +15 | +19 | +15 | +5 | −3 | −21 | −131 |
| Share of the absolute error | 1 % | 9 % | 11 % | 12 % | 15 % | 14 % | 20 % | 18 % |

By month the same year: MAE 20, 42, 29, 19, 21, 7, 9, 12, 19, 33, 31, 15 €/MWh — February and March (the Baltic synchronisation of 8–9
February 2025 and EstLink 2 out until 19 June) and October–November carry it. Hours at or above
150 €/MWh: model 950, observed 1 258; at or above 250: 125 against 252.

What a next round could look at, each the owner's to allow: Kruonis's bid (the evidence above);
a multi-start for the markup's descent; the same band for the Daugava in scenario years, so that
replays and scenario runs follow one rule; the scenario runs' loss wedge (D-042 item 5); and the
floor's fit years — Estonian oil shale ran 2.00, 1.70, 1.42 and (to
August) 0.79 TWh in 2023–2026, and a floor fitted on the first two holds the later years too high.
