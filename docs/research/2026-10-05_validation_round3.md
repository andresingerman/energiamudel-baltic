# Calibration log, the round of D-073 (night of 2026-10-05)

*Gate status (R-PUB-4): the validation gate R-VAL-5 is not met (methodology §7.3; 2023 meets its
price thresholds, 2024 misses two by less than one euro and its duration curve by 2.4, the blind
year 2025 misses them); the EstLink 2 gate R-VAL-6 is met (§7.4). The register described here
(DECISIONS D-073) is proposed and awaits the owner's sign-off.*

A third round of the calibration protocol (PLAN §4 M3; `2026-09-25_calibration_m3.md` has steps
S0–S6, `2026-10-04_calibration_night.md` S7–S12), at the owner's instruction for the night
("Accuracy of Validation", "Full cycle"). One change per full-year run of 2023, 2024 and 2025 on
the engine of record; a structural change is kept only if no zone's MAE rises in those years;
nothing is fitted on 2025 (R-VAL-1); no observed price or flow of a core zone enters the engine
(R-BND-3). Tools: `spikes/validation-round2/` (the directory keeps its working name).

## How the error was read

1. *What sets the model's price where it is wrong* (`setter.ts`; Lithuania, 2025, the register
   of D-044). In the 3 478 hours the market cleared at or below 60 €/MWh the model's price was
   set, where it was off, by Kruonis pumping part-loaded (719 hours, 19–45 €/MWh against 2–29
   observed), by the Daugava inside its band (285 hours, 56–78 against 6–35) and by thermal
   plants or Poland's price (about 530 hours, 50–120 against 4–50). In the 247 hours above
   250 €/MWh it was set by Kruonis discharging part-loaded in 102 (199 against 320 observed).
2. *Model against record by technology and price bin* (`gap.ts`, `exp.ts bins`). In the cheap
   hours of 2025 Lithuania's gas ran 111–118 MW in the record (239 in January) against 43–63 in
   the model; the Daugava 265–272 against 188–205. In the hours above 250 €/MWh Kruonis
   delivered 142–224 MW in the record of 2024–2025 against 274–418 in the model, Estonian oil
   shale 395 against 460, Latvian gas 436 against 328.
3. *Lithuania's gas by month* (hours at or below 30 €/MWh, mean MW): 2025 — January 239, March
   162, April 246, May 219, June 8, July 121, August 39; 2023, 2024 and 2026 — 10–60 in all but
   two months (April 2023 84, December 2024 162). The months around the synchronisation of 8–9
   February 2025 show a unit kept on line whatever the price.
4. *Kruonis in the record* (`kruonis_record.py`, from the cached A75 files; the database keeps
   generation only): output in 3 539–3 922 hours a year at 136–146 MW on average, at most 612–756
   MW; pumping in 2 319–3 146 hours, at most 803–894 MW; 0.48–0.57 TWh delivered for 0.64–0.78
   pumped (0.73–0.75 round trip).
5. *The dearest hours* (above 250 €/MWh: 99, 211 and 247 hours of 2023–2025): 05–08 and 15–18
   UTC, the Baltic load 470–640 MW above its mean and wind at half of it; Lithuania's price above
   every neighbour's by more than 5 €/MWh in 52, 23 and 68 % of them.
6. *Capacities against schedules* (`ntc.ts`): the day-ahead schedules of 2024 and 2025 exceed
   the capacity the model was given in 0–60 hours a year per border; the capacities are not the
   cause.

## Steps

Hourly MAE, €/MWh, EE / LV / LT; the sum is over the three years and zones.

| Step | Change | 2023 | 2024 | 2025 (blind) | Sum | 2026, Jan–Aug |
|---|---|---|---|---|---|---|
| S12 | The register of D-042 and D-044 | 12.01 / 13.26 / 12.84 | 14.88 / 16.53 / 16.71 | 22.08 / 21.75 / 21.11 | 151.17 | 14.81 / 16.94 / 12.16 |
| S13 | Each thermal technology at least its week's 10th-percentile hour | 12.01 / 13.19 / 12.76 | 14.65 / 16.36 / 16.52 | 21.00 / 20.51 / 19.76 | 146.75 | 15.13 / 17.05 / 12.31 |
| S14 | Kruonis's power = its week's maximum output | 11.71 / 12.74 / 12.31 | 14.14 / 15.71 / 15.70 | 20.93 / 20.27 / 19.44 | 142.96 | 15.14 / 16.76 / 11.81 |
| S15 | `make fit` with the markup's new form (and Δ) | 11.90 / 12.92 / 12.39 | 14.21 / 15.69 / 15.66 | 20.94 / 20.46 / 19.41 | 143.58 | 15.24 / 16.95 / 11.29 |

Breaches of R-VAL-5: 9 / 15 / 20 (S12) → 6 / 14 / 17 (S15). S13 and S14 raise no zone's MAE in
2023–2025. S13 raises all three in the second blind year, 2026 (+0.1 to +0.3): there the model's
Estonian and Latvian prices are already 11–13 €/MWh too low, and more must-run lowers them
further. S15 is the register refitted, not a structural step: it raises the fit years' sum by
0.46 against S14's (which carried a schedule fitted on another register) and the blind year's
by 0.17; see the markup below.

## S16 — the price at the Nordic end of NordBalt (D-075, proposed separately)

Found after S15, from the months' table (`months.ts`: 2025's error sits in February–March and
October–November) and the borders' congested shares (in 2025 Lithuania's price differed from
SE4's in 97 % of hours; the model's in 55 %). The cause is dated: until 29 October 2024
Lithuania's price equalled SE4's to the cent in 98 % of the hours NordBalt's schedule lay inside
its capacity; from that day, the Nordic flow-based go-live, in 5–11 %. The flow-based market
couples the cable at a virtual hub, SE4_NB, whose price is SE4's less the binding constraints'
shadow prices times the difference of their PTDFs — JAO publishes both. With the network
constraints' part of that spread (the cable's own capacity, ramping and allocation constraints
left out) Lithuania's price equals the hub's in 99, 78 and 72 % of those hours
(`hub_check.py`):

| | 2024 to 29 October | 2024 from 29 October | 2025 | 2026 to August |
|---|---|---|---|---|
| Hours with NordBalt's schedule inside its capacity | 1 548 | 529 | 4 459 | 3 886 |
| LT = SE4 to the cent | 98 % | 5 % | 9 % | 11 % |
| LT = hub to the cent | 98 % | 99 % | 78 % | 72 % |
| The hub less SE4, €/MWh: mean; hours beyond ±1; mean where above; where below | — | −0.85; 43 %; +3.6; −6.5 | −0.17; 37 %; +5.0; −4.7 | −0.67; 34 %; +3.9; −4.9 |
| EE = FI to the cent, EstLink's schedule inside its capacity | 99 % | 89 % | 75 % | 53 % |
| EE = hub (FI_EL) to the cent | 99 % | 92 % | 82 % | 82 % |

EstLink's hub stands within a euro of Finland's price in all but 0–2 % of hours: its PTDFs are
Finland's.

| Step | Change | 2023 | 2024 | 2025 (blind) | Sum | 2026, Jan–Aug |
|---|---|---|---|---|---|---|
| S15 | (above) | 11.90 / 12.92 / 12.39 | 14.21 / 15.69 / 15.66 | 20.94 / 20.46 / 19.41 | 143.58 | 15.24 / 16.95 / 11.29 |
| S16 | The boundary price of SE4 and Finland at the virtual hub from 2024-10-29 | 11.90 / 12.92 / 12.39 | 14.10 / 15.55 / 15.52 | 20.48 / 19.75 / 18.58 | 141.19 | 15.19 / 16.60 / 10.38 |

No zone's MAE rises. `make fit` on S16 returns the same markup and Δ (the fit years' sum 82.77 →
82.38), so no scenario figure moves. Breaches 6 / 14 / 17 → 6 / 15 / 14: the congested shares of
LT–SE4 are no longer measured against a price the cable does not see, and Estonia's
duration-curve RMSE of 2024 crosses its threshold by 0.1. The whole spread, with the cable's own
constraints, would be the Baltic price itself wherever the cable's coupling is not at its limit,
and is not taken.

A first test of the idea used a scratch download of the same endpoint (`exp.ts hub=net`) and
gave the same figures before the fetcher was written.

## S17 — the price at the Polish end of LitPol (D-076, proposed separately; ERRATA E-069)

Found after S16 by asking of LitPol what S16 asked of NordBalt. There is no dated break: in the
hours LitPol's schedule lay inside its capacity Lithuania's price equalled Poland's to the cent
in 38, 51, 62 and 57 % (2022–2025) — never the 98 % of the other two cables. Sorting the replay's
hours by what the record did on the link (`litpol.ts`, at the commit of S16):

| 2024, Lithuania | Hours | MAE | Bias | Observed LT − PL | Model LT − PL |
|---|---|---|---|---|---|
| Link at its import limit | 2 173 | 26.3 | −12.9 | +24.1 | +11.2 |
| Link at its export limit | 2 193 | 13.1 | −0.5 | −41.9 | −42.4 |
| Inside, LT = PL within 1 €/MWh | 2 809 | 7.0 | −5.1 | 0.0 | −5.1 |
| Inside, LT below PL | 1 506 | 19.2 | +15.6 | −27.3 | −11.7 |
| Inside, LT above PL | 103 | 15.8 | −14.4 | +22.8 | +8.5 |

A sixth of the year sat in the fourth row (1 662 hours in 2023, 783 in 2025): the link not full,
Lithuania 27 €/MWh below Poland, in some hours importing from the dearer side. Not the cable's
ramping limit (a 600 MW step before or after 5 % of those hours) and not a shifted series (no
lag restores the equality). JAO's Core tool publishes the limits PSE sets on Poland's net
position (`allocationConstraint`): the import limit was 0 MW in 54 % of those hours against 24 %
of the hours with LT = PL. A limit on the net position leaves transit free and parts Poland's
price from the price its cables clear at; that price is Poland's less the limit's shadow price,
which nobody publishes. It was derived as the DE–PL spread less the Core network's part of it
(`core_spread`), first on a scratch download of 2024:

| 2024, LitPol inside its capacity (4 282 h of the scratch download) | LT within 1 €/MWh |
|---|---|
| of Poland's price | 62.7 % |
| of Poland's price less the whole residual | 82.7 % |
| … read only where the limit is at or below 0 / 1 000 / 2 000 MW (thresholds tried, not kept: fitted to the Baltic price) | 77.6 / 83.6 / 87.1 % |
| … read only where Poland's Core net position is within 1 100 MW (SwePol and LitPol) of the limit; at 1 200; at 1 500 | 89.2 %; 89.0; 88.6 |

The unguarded residual spoils about 400 hours in which Lithuania cleared at Poland's price while
Poland stood above Germany with no published constraint to explain it and its import limit far
away (median 2 100 MW): the Core's spreads are not all in its published shadow prices. The guard
asks only whether the limit could bind, from Core quantities and the cables' rated power. On the
full record (`pl_check.py`) the shares within 1 €/MWh are 53 → 86 % (2023), 64 → 90 % (2024) and
76 → 91 % (2025 to September); D-076 has the table.

| Step | Change | 2023 | 2024 | 2025 (blind) | Sum | 2026, Jan–Aug |
|---|---|---|---|---|---|---|
| S16 | (above) | 11.90 / 12.92 / 12.39 | 14.10 / 15.55 / 15.52 | 20.48 / 19.75 / 18.58 | 141.19 | 15.19 / 16.60 / 10.38 |
| S17a | Poland's clearing price, markup as it was (scratch download, 2024 only, 8 184 h corrected) | — | 11.23 / 12.50 / 12.44 | — | — | — |
| S17 | Poland's clearing price from 2022-06-09; markup and Δ refitted (40 / 195 / 315 / 335; 61) | 9.58 / 9.39 / 8.90 | 10.91 / 12.03 / 11.99 | 20.02 / 18.84 / 18.01 | 119.67 | 15.11 / 16.31 / 10.73 |

After S17 the fourth row of the table above holds 195 hours of 2024 (against the clearing
price), and the link's import-limit hours carry the largest error left on this border (2 173
hours, bias −17). What S17 costs: Latvian gas falls to 1.13 / 1.34 / 1.29 TWh against 1.35 / 1.60 /
1.57 (the refitted markup); the model's mean price is 2–5 €/MWh too low in 2023–2024; the
EstLink 2 effect of 2024 is 19.9 €/MWh, not 24.1; 2020–2021 lose 1–3 €/MWh. The blind year gains
0.5–1.0: Poland's limit bound less in 2025, and that year's error is in February–March and the
dear hours.

## S18 — LV–LT's capacity since the balancing capacity market (D-077, proposed separately; ERRATA E-070)

After S17 the second blind year stood apart: Lithuania 10.7, Latvia 16.3 and Estonia 15.1, the
last two 12.5 €/MWh too low on average, and LV–LT parting its prices in 34 % of the model's hours
against 6 % of the record's. Set beside the record's day-ahead schedule (`links.ts`), the
capacity the replay gave LV–LT towards Lithuania was exceeded by the schedule in 1 386 hours of
January–August 2026, by 195 MW on average. The replay's capacity is A31 less the balancing
allocation (R-LINK-5); `reserve_check.py` asks which of the four candidates — A31, less aFRR,
less mFRR, less both — the market stopped at. EE–LV: A31 less both (681 of 895 congested hours
within 1 MW in February–September 2025), never A31. LV–LT: A31 itself in every congested hour
that sits at a capacity, never A31 less the allocation. D-077 has the table.

| Step | Change | 2023 | 2024 | 2025 (blind) | Sum | 2026, Jan–Aug |
|---|---|---|---|---|---|---|
| S17 | (above) | 9.58 / 9.39 / 8.90 | 10.91 / 12.03 / 11.99 | 20.02 / 18.84 / 18.01 | 119.67 | 15.11 / 16.31 / 10.73 |
| S17b | Poland's zone price put back, on S18's register (the price's own part in the blind years) | — | — | 20.25 / 18.68 / 18.53 | — | 14.11 / 10.42 / 9.36 |
| S18 | The allocation not taken off LV–LT's A31; Δ refitted (67) | 9.58 / 9.39 / 8.90 | 10.91 / 12.03 / 11.99 | 19.56 / 17.67 / 17.47 | 117.50 | 14.07 / 10.28 / 9.21 |

What is left in 2026 is Estonia's: 11 €/MWh too low, EE→LV at its limit in 49 % of hours against
37, FI→EE in 26 % against 45, oil shale 1.21 TWh against 0.79 — the floor fitted on 2023–2024
holds the Narva plants above what they ran. On EE–LV the aFRR part of the allocation is not
always taken by the market (October–December 2025 sat at A31 less mFRR alone); not changed.

## Where Estonia's error sits since September 2025 (after S18; nothing built)

From September 2025 Estonia's price is 6–22 €/MWh too low by month (November −22, January
2026 −16, March −21), Latvia's and Lithuania's are not, and Estonia's flows are the record's:
in November 2025 FI→EE 917 MW against 973, EE→LV 452 against 495, the net position −465
against −478 (`scratchpad eeflow.ts`). With the flows right the price is wrong in the dear
hours alone (Nov–Dec 2025, by Estonia's observed price bin: −14 at 100–150 €/MWh, −42 at
150–250, −187 above 250; `gap.ts 2025 7296`) while the model's oil shale in those bins is near
the record's (321 against 288 MW, 411 against 384). Two things changed in the record that
autumn. Estonia sits between its two borders — EstLink full towards it, EE–LV full away from
it, its own plants setting the price — in 550 of the hours of September–December 2025 and 519
of April–August 2026, against 48 and 38 in the same months a year before. And in those hours
the price the oil shale sets is above the entry prices of R-SUP-4: with 200–300 MW of oil shale
running (Auvere alone) Estonia cleared at a median of 163 €/MWh in April–August 2026 (P25 124,
P75 184) and 119 in January–March, where Auvere's bid in the model is 100–105 and the
fluidised-bed units' 125 at that year's CO₂ price. Since 1 December 2025 the units sit in the
strategic reserve (R-PAR-9) and, from 1 January 2026, in a separate subsidiary; no published
figure gives their market-entry price under the contract (Eesti Energia's Q1 2026 results and
ERR, searched 2026-10-06). The floor fitted on 2023–2024 is the other part: without it (the
week's 10th-percentile hour alone) Estonia's 2026 bias is −6.7 instead of −11.0 and its MAE
13.8 instead of 14.1, at a cost in 2023–2025 (the trial above). Both are the owner's: a markup
on the oil shale since the reserve contract would be fitted to the Baltic price, and the floor's
window is D-042's.

## February 2025 (after S18; nothing built)

The dearest month of the blind year (MAE 46 / 43 / 43, bias +2 / +8 / +8) is a month of
day-sized misses in both directions, with EstLink at 358 MW (EstLink 2 out) and NordBalt full
towards Lithuania on most days. On 26–28 February the model clears at 313, 261 and 258 €/MWh
against 164, 196 and 193 observed, while the record ran Latvian gas at 720–730 MW and Lithuanian
at 370–430 — near their weekly maxima — at those prices: the refitted markup puts the top
tranches of both fleets at +315 and +335 €/MWh over cost, and the model prices the last
megawatts there where the market did not. On 15 February the opposite: 266 observed against
147, with Lithuanian gas at 78 MW in the record and Estonian oil shale at 633. A markup by
utilisation of the week's maximum is a proxy for scarcity, and February 2025 shows both of its
failure modes; the form is D-073's and the figures the fit's (`scratchpad feb.ts`, `febtech.ts`).

## The markup (S15; ERRATA E-065)

`make fit` as it stood — one descent on both fit years, a schedule per zone — gave on S14's
register EE 80 / 80 / 120 / 120, LV 0 / 60 / 260 / 260, LT 45 / 445 / 525 / 565: a fit-year sum of
81.32, and 61.88 on the blind year where S14's schedule gave 60.64, 45.99 on 2026 against 43.71.
Four other starting points ended at 81.31–81.91 with schedules as far apart as LT 0 / 220 / 360 /
460 and 45 / 445 / 645 / 845 (`markup_starts.ts`). So the form was tested on the fit years alone
(`markup_cv.ts`): fitted on one year, scored on the other.

| Form | Parameters | Fitted on 2023, scored on 2024 | Fitted on 2024, scored on 2023 | Sum left out |
|---|---|---|---|---|
| A schedule per zone | 12 | 47.12 | 37.28 | 84.40 |
| One for LV and LT, Estonia's own | 8 | 46.87 | 37.30 | 84.17 |
| One for LV and LT, Estonia none | 4 | 46.87 | 37.30 | 84.17 |
| One for all three | 4 | 46.85 | 37.33 | 84.18 |
| No markup | 0 | 52.29 | 38.13 | 90.42 |

The four forms are equal on the year left out; twelve parameters buy nothing. The joint descent
of the four-parameter form on both years ends at 20 / 980 / 1 100 / 1 140 (81.95): the fit years
rarely need the upper half of the two fleets, so nothing stops the descent from pricing it out,
and the blind year, which needs it, comes out at 27.7 / 27.6 / 29.0. The schedules of the single
years are bounded (0 / 60 / 120 / 120 and 30 / 230 / 350 / 390); the register takes their mean, 15 /
145 / 235 / 255, for Latvia and Lithuania, and none for Estonia.

Candidate schedules on S14's register, sums of MAE (the blind years were looked at after the
form was chosen and are reported, not used):

| Schedule (EE; LV; LT) | 2023 + 2024 | 2025 | 2026 |
|---|---|---|---|
| None | 90.42 | 64.11 | 47.35 |
| 2023's alone: 0; 0 / 60 / 120 / 120 both | 83.63 | 59.86 | 44.80 |
| 2024's alone: 0; 30 / 230 / 350 / 390 both | 82.45 | 62.56 | 43.80 |
| **Their mean (the register)** | **82.77** | **60.81** | **43.49** |
| Per zone, the mean of the two years' | 82.58 | 60.67 | 43.37 |
| D-044's: 80 / 160 / 200 / 200; 35 / 275 / 355 / 435; 0 / 80 / 400 / 520 | 82.31 | 60.64 | 43.71 |
| Per zone, joint descent (the former `make fit`) | 81.33 | 61.88 | 46.01 |
| Common, joint descent | 81.95 | 84.33 | — |

Every bounded schedule lands within 1.2 €/MWh of the others on the fit years and within 2.7 on
the blind year: the markup is worth 8 €/MWh on the fit years' sum and 3–4 on the blind year's,
and its shape is not identified beyond that.

In the scenario of 2035 Estonia's former schedule, fitted on 6–10 MW of gas engines, was carried
by 1 364 MW of gas plants. Opening scenarios (`scenario_markup.ts`; EE / LV / LT):

| Markup register | *Elering: gas* | *2 SMR* |
|---|---|---|
| D-044's, batteries at 61 | 56.9 / 45.5 / 45.6 | 44.5 / 41.7 / 41.7 |
| D-073's | 55.9 / 44.6 / 44.6 | 44.2 / 41.4 / 41.5 |
| D-073's schedule on Estonia's gas too | 56.4 / 45.0 / 45.0 | 44.4 / 41.5 / 41.6 |
| None | 55.1 / 43.8 / 43.8 | 43.9 / 41.0 / 41.1 |

## Tried and not kept

Sums over 2023–2025; on S12's register unless stated.

| Trial | Sum of MAE | Why not kept |
|---|---|---|
| Kruonis as the record has it, hour by hour | 184.71 against 151.16 | far worse: the record's schedule answers prices the model does not have |
| Kruonis's power: the week's 95th, 90th, 80th percentile hour | 152.64, 162.87, 202.25 | the maximum (147.66) is the only quantile that lowers every zone |
| Kruonis at 450 MW, at 225 MW all year | 146.30, 178.76 | a megawatt figure is a knob; the record's week is not |
| Kruonis's limit in one direction only (on S13) | delivery 143.90, pumping 145.18 against 142.94 for both | both are needed |
| Kruonis's pumping limit from its own record (on S13) | 142.94 against 142.87 from the output over the efficiency | no better, and the database does not hold the pumping |
| Kruonis Δ = 30, 45, 80, 100 €/MWh (on S14; prior 60) | 148.01, 145.62, 140.84, 140.16 | as in the round before: prices gain as Kruonis stops running (0.10–0.24 TWh at 80–100 against 0.48–0.57 observed) |
| The week's least output at its minimum, 5th, 20th percentile | 147.98, 146.60, 145.47 against 146.35 at the 10th | the decile is D-044's convention; the 20th raises Estonia's 2023 |
| The week's least output for gas only; biomass only; oil shale only | 146.78, 151.02, 150.60 | gas carries it; all three together do best |
| … without retort gas (on S14) | 143.71 against 142.96 | worse |
| The week's least output in place of the fitted floor (on S14) | 156.48 against 142.96 | worse in 2023–2025, though 2026 gains (41.6 against 43.7) |
| The Daugava's day within ±5, 10, 20, 30 % of the record's energy of that day (on S14) | 145.77, 144.72, 143.90, 143.14 against 142.94 | no gain in MAE (the duration curve and the share of dear hours gain) |

## Where the error sits (after S15)

Lithuania by observed price bin, bias in €/MWh (2023 / 2024 / 2025): at or below 0: +19 / +10 /
+5; 0–10: +23 / +14 / +10; 10–30: +16 / +13 / +15; 30–60: +7 / +8 / +11; 60–100: +4 / +2 / +3;
100–150: −1 / −7 / −6; 150–250: −9 / −25 / −23; above 250: −92 / −119 / −132.

What a next round could look at, each the owner's to allow: unit commitment or a start-cost
adder for the ramp hours; a rule for how hard a storage unit may lean on a neighbour's cheap
hours; Estonian oil shale, which ran 2.00, 1.70, 1.42 and (to August) 0.79 TWh in 2023–2026 under
a floor fitted on the first two; and Kruonis's and the thermal plants' week in a scenario year,
where there is no record to take it from.
