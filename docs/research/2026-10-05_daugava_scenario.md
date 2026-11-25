# The Daugava cascade in scenario runs: half the water and a third of the power

*2026-10-05 · executor · serves R-ENG-5 (weekly-budget hydro), R-TIME-2 · follows ERRATA E-063.
Read from the committed database and the raw TYNDP 2024 workbook; one experiment
(`spikes/daugava-scenario/`). Nothing here changes a result: the proposal is D-070, awaiting the
owner.*

## Question

Halving Latvia's Daugava capacity in the panel moved no result (E-063). Why, and is the
scenario's Daugava right?

## What the scenario takes

For the TYNDP 2024 family (`export/years.py`, `TYNDP2024_HYDRO`), from ENTSO-E's PEMMDB 3.5
workbook `PEMMDB_LV00_Hydro_Inflows_2030.xlsx`, sheet *Pondage - Year Dependent*:

- the weekly water: `INFLOW`, "Energy Inflow [GWh/day]", summed to weeks, per climate year;
- the hourly limit: `MAX_TURB`, "Maximum generating power [MW]", averaged to weeks, taken as a cap
  on the cascade's output beside its megawatts (`build.ts`, the reservoir's `pmax`).

The reading of both labels is literal and correct. The workbook's own sheet *Pondage - Uniform*
gives the nominal turbining power as 1 592 MW.

## Finding 1: the "maximum generating power" is not a power limit

It takes four values over the year, the same in all 36 climate years: 304 MW (weeks 1–8), 507
(weeks 10–22), 101 (weeks 23–39), 253 (weeks 41–52).

| | TYNDP 2024 "maximum", MW | Observed 2020–2025: mean / 90th percentile / maximum, MW |
|---|---|---|
| Weeks 1–8 | 304 | 459 / 853 / 1 337 |
| Weeks 10–22 | 507 | 570 / 1 084 / 1 474 |
| Weeks 23–39 | 101 | 164 / 445 / 979 |
| Weeks 41–52 | 253 | 242 / 589 / 1 216 |

*Observed: ENTSO-E A75, Latvia's run-of-river and reservoir hydro, hourly.*

- The series is at or below the record's seasonal **mean**. Its own mean over the year, 273 MW,
  is 2.4 TWh — a year's typical output, not a ceiling.
- The record exceeds 507 MW in 1 200–4 200 hours of every year from 2015 to 2024 (1 787 in 2025),
  and reaches 1 000–1 470 MW every year. In 2023–2025, 23 % of the cascade's energy was produced
  above 507 MW.
- The workbook contradicts itself: its inflow reaches 20.7 GWh in a day of climate year 2009, a
  mean of 861 MW, where its "maximum" for that day is 507 MW, against a store of 16 GWh.

So the field holds something like a seasonal average output, entered under the label of a limit.

## Finding 2: TYNDP 2024's inflow is half the record

| Climate year | TYNDP 2024 inflow, TWh | Observed output, TWh | Ratio |
|---|---|---|---|
| 2015 | 0.93 | 1.79 | 1.94 |
| 2016 | 1.22 | 2.44 | 1.99 |
| 2017 | 2.21 | 4.23 | 1.92 |

- Over its 36 climate years TYNDP 2024 gives 0.55–2.21 TWh, mean 1.31. The record of 2015–2025
  is 1.79–4.23 TWh, mean 2.77.
- The scenario's three climate years carry 1.37 (1995), 1.73 (2008) and 1.60 TWh (2009).
- **TYNDP 2026 has it right.** Its inflow for the same node, over its twelve weather scenarios,
  is 2.21–3.79 TWh, mean 2.89 — the record's level and twice TYNDP 2024's. The project's National
  Trends+ runs take that series, and no weekly limit.

The ratio in the three years both cover is steady at 1.92–1.99, so the shape across climate years
is sound and the level is off by a factor.

## Effect on the opening scenarios

`spikes/daugava-scenario/exp_daugava.ts`, the opening state, weighted over 1995, 2008 and 2009,
mean price in €/MWh:

| Case | Scenario | EE | LV | LT | Daugava, TWh |
|---|---|---|---|---|---|
| As built | Elering: gas | 59.8 | 49.2 | 49.2 | 1.49 |
| | 2 SMR | 45.5 | 44.4 | 44.4 | 1.49 |
| No weekly power limit | Elering: gas | 58.2 | 47.9 | 48.0 | 1.59 |
| | 2 SMR | 44.9 | 43.4 | 43.6 | 1.59 |
| Inflow × 1.95 | Elering: gas | 59.5 | 48.5 | 48.5 | 2.13 |
| | 2 SMR | 45.3 | 43.9 | 43.9 | 2.13 |
| Both | Elering: gas | 55.4 | 44.3 | 44.5 | 3.10 |
| | 2 SMR | 43.9 | 40.6 | 41.1 | 3.10 |

- As built the cascade delivers 1.49 TWh of the 1.59 it is given: the limit spills the rest.
- Each correction alone does little: without the limit there is little water to place, and with
  the water but the limit most of the extra is spilled (2.13 of 3.10 TWh delivered).
- Together they lower the opening prices by 4.4 (EE), 4.9 (LV) and 4.7 €/MWh (LT), and the effect
  of two units on Estonia's price from −14.3 to −11.5 €/MWh. One and three units: EE 50.2 and
  36.7 against 53.4 and 37.3.

## What it does not touch

- Validation: a replay takes the cascade's observed output (§7.1). No fitted parameter moves.
- TYNDP 2026's family: its inflow is at the record's level and it has no limit.

## Open points

- The factor. 1.95 is the mean ratio of the three overlapping years. TYNDP 2026's mean against
  TYNDP 2024's gives 2.2, but over different weather. With 1.95 the three climate years carry
  2.66, 3.37 and 3.12 TWh.
- Without the limit the scenario's Daugava is bounded by its megawatts and PEMMDB's minimum flow
  alone, and the week's foresight places the water more freely than the record shows (methodology
  §5.5, already said). A band from the record, as the replays have (D-044), would be the stricter
  choice; it was not tried here.
- TYNDP 2050's workbook gives the node 30 MW of nominal power; the application runs 2035 only,
  which interpolates 2030 and 2040.
- Lithuania's run-of-river inflow in the same dataset is 1.4–1.75 times the record of 2015–2017
  (0.47–0.70 against 0.30–0.50 TWh). Seen in passing, not followed.
