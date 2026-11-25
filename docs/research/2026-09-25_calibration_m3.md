# Calibration log, M3 (2026-09-25)

*Gate status (R-PUB-4): the validation gate R-VAL-5 is not met (methodology §7.3); the EstLink 2
gate R-VAL-6 is met (§7.4). No result with the plant exists.*

Every step of the calibration protocol on the engine of record, in the order it was run. The
protocol (PLAN §4 M3, after v4's `CALIBRATION_2025.md`): one change per full-year run of 2023,
2024 and 2025; a change is kept only if the Baltic MAE falls; a gain in 2025 that costs 2023 or
2024 more than 1 €/MWh is overfitting; no per-zone multipliers; no observed price or flow inside
the engine (R-BND-3). 2025 is blind for the fitted parameters (R-VAL-1): it was measured at every
step, and nothing was fitted on it.

Tool: `app/scripts/validate_fit.ts` (hourly MAE per zone, €/MWh, EE / LV / LT). Fits:
`make fit` (`validate/fit.py`).

## Steps

| Step | Change | 2023 | 2024 | 2025 (blind) | Record |
|---|---|---|---|---|---|
| S0 | M2's provisional replay: thermal at installed capacity, no CHP must-run, markup 0, Kruonis without cycling cost, Daugava minimum = PEMMDB MIN_TURB | 25.6 / 29.1 / 28.9 | 32.9 / 35.7 / 35.5 | 39.2 / 42.1 / 38.2 | methodology §5.6 (before) |
| S1 | CHP floor on gas and biomass CHP (R-SUP-5, fitted on 2023–2024) | 24.6 / 28.2 / 27.9 | 31.8 / 34.7 / 34.6 | 37.4 / 40.4 / 36.6 | D-023 item 1 |
| S2 | Thermal availability = the weekly maximum A75 output per technology (observed years) | 22.8 / 24.4 / 23.3 | 24.9 / 28.0 / 27.1 | 36.1 / 37.1 / 31.4 | D-022 item 1 |
| S3 | Kruonis bids its cycle cost, Δ = 60 €/MWh (v4 D-053) | 20.7 / 21.9 / 20.6 | 22.6 / 25.3 / 24.3 | 35.5 / 36.2 / 29.6 | D-022 item 3 |
| S4 | CHP floor on the Estonian oil-shale classes | 20.1 / 21.3 / 20.0 | 22.3 / 25.0 / 24.0 | 34.7 / 35.5 / 29.3 | D-022 item 2 |
| S5 | Daugava minimum flow = its observed weekly minimum output | 19.1 / 20.2 / 19.0 | 21.8 / 24.6 / 23.6 | 33.5 / 34.0 / 28.6 | D-022 item 4 |
| S6 | Utilisation markup fitted on 2023–2024 (R-SUP-6) | 19.1 / 20.2 / 19.1 | 20.9 / 23.3 / 22.7 | 32.8 / 32.7 / 28.0 | D-023 item 2 |

S2 first subtracted the reserve headroom from the weekly maxima as well: the observed maxima
already exclude what was held in reserve, and 2025 rose to 189–242 €/MWh MAE; the headroom is
now taken only where no observed maximum exists (`netOfReserve`, `build.ts`). S6 breaks the
protocol's rule in 2023: EE rises from 19.07 to 19.12 and LT from 18.96 to 19.09 €/MWh, while
2024 falls by 0.9–1.3 in every zone. The markup is R-SUP-6's required element, not an optional
change, and its objective is the sum of the three zones' MAE over both fit years (128.27 →
125.31); the exception is the owner's to confirm (D-024).

## Tried and not kept

- *PLAN §3.7's markup rule* (each bin moves by its mean residual, v4 `markup.py`): the schedule
  climbed without converging, because in many of a bin's hours the zone's gas is not what sets
  the model's price (ERRATA E-039). Replaced by coordinate descent on the MAE (D-023).
- *Daugava daily budgets:* the observed daily output as the budget lowered the MAE by another
  1–3 €/MWh, up to 5 with the observed daily minimum. R-ENG-5 specifies a weekly budget; left to
  the owner (D-024).
- *Refit of Δ* (R-STO-9): the Estonian A75 battery series begins on 2026-03-11 (ERRATA E-038).
  With the preset mFRR share of 0.5 the batteries discharge 36.5 % less than observed even at
  Δ = 0; at 0.25 the fit gives Δ = 42 €/MWh (+0.7 %), at 0 Δ = 65.5 €/MWh (−1.6 %). Recorded as
  evidence (`fitted_parameters.json`, `battery_delta`), not adopted: OPEN-3 is the owner's.

## Where the error sits (after S6)

By observed price bin (`validate_fit.ts --diagnose`), Estonia; LV and LT are alike:

| Observed price, €/MWh | ≤ 0 | 0–10 | 10–30 | 30–60 | 60–100 | 100–150 | 150–250 | > 250 |
|---|---|---|---|---|---|---|---|---|
| 2024: hours | 236 | 773 | 652 | 1 300 | 2 925 | 1 910 | 778 | 210 |
| 2024: bias, €/MWh | +24 | +33 | +31 | +20 | +7 | −6 | −37 | −117 |
| 2024: share of the absolute error | 3 % | 14 % | 11 % | 15 % | 15 % | 12 % | 16 % | 13 % |
| 2025: bias, €/MWh | +19 | +36 | +41 | +33 | +10 | −10 | −50 | −165 |
| 2025: share of the absolute error | 2 % | 18 % | 17 % | 13 % | 10 % | 10 % | 18 % | 14 % |

The modelled price distribution is compressed at both ends: too high where the market was cheap
and too low where it was dear. Hours at or above 150 €/MWh: model 546 / 469 / 506, observed 994 /
1 002 / 992 (2024); model 520 / 464 / 688, observed 1 227 / 1 260 / 1 258 (2025). The hours at or
above 250 €/MWh are almost absent from the model in LV and LT (3–36 against 218–252). A
short-run-cost merit order with observed availability has no unit commitment (start-up costs and
minimum loads make committed plants bid below cost when prices are low) and no scarcity or
strategic bidding above cost. The markup is R-SUP-6's only instrument for the second, and it has
little reach: the fit leaves Estonia at zero, and Latvia's and Lithuania's schedules lower their
2024 MAE by about 1 €/MWh.

Generation per class: gas is overgenerated in Lithuania (1.52 TWh against 0.82 in 2024), because
the weekly maximum states availability for the whole week while the plants ran fewer hours;
Kruonis generates 0.17–0.30 TWh against 0.48–0.57 observed (its bid of Δ = 60 €/MWh is a round
number, not a fit).

## Diagnostics 2020–2022 (R-VAL-7, no thresholds)

MAE 14.3 / 14.0 / 14.1 (2020), 22.2 / 23.0 / 22.0 (2021), 32.2 / 42.5 / 40.7 (2022); the model's
mean price is 13–19 €/MWh too high in 2020–2021, and FI→EE and SE4→LT are congested in 83–90 %
and 66–87 % of hours against 31–46 % observed. Until 2022 the Baltic market also traded across
the Russian and Belarusian borders, which the model does not have (R-LINK-1; the BRELL topology
of R-VAL-7): without those imports the model's price is higher and its western interconnectors
run at their limits.
