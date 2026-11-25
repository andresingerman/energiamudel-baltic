# One gas bid for the three Baltic states, without the ladder (2026-10-22)

**Adopted (D-164, 2026-10-22):** the owner chose the form of §10 — one price for every gas plant, a combined-cycle plant's cost plus the adder, which `make fit` put at 51.25 €/MWh — "do the one bid". The scripts here ran on the engine before it; with the markup gone from `build.ts` they need that engine (main before D-164) to run again.

**The answer (written last).** One bid — every gas plant in Estonia, Latvia and Lithuania at its own cost plus 50
€/MWh — is identified by both fit years, fits them 0.5 €/MWh of MAE per zone and year worse than the ladder,
does as well on the blind 2025 and 0.4–0.8 worse on 2026. It loses the dear hours (half of 2025's hours above
250 €/MWh; seven more R-VAL-5 breaches, all of the duration curve and the hours at 150 €/MWh or more). In 2035 the
presentation's prices and the plant's effect move by 0.1–1.7 €/MWh; Estonia's own gas, its peakers now behind
Latvia's and Lithuania's combined-cycle plants, runs 155 hours instead of 543. Gas at cost, with no markup, is far
worse (§3). Two numbers (45 / 300 €/MWh, split at 75 %) keep the dear hours but lose the blind year. A latent
fault of oil shale's entry shows under one markup in 2020 (§6). §9 lists what adopting it would take.

## §0 The question and the method

**The owner's request (2026-10-22).** "The aim is to simplify the model.
Study the effect on the model if the gas bid of all three countries is one, without the ladder. You have unlimited
time and resources."

**What the model does now (R-SUP-6, D-073, D-115, D-117).** Each gas offer bids its short-run cost — fuel over
efficiency, CO₂, variable O&M — plus a markup. What the offer has left after the must-run floors and the reserve
headroom is split into four tranches at 50, 75 and 90 % of that remainder's weekly maximum, and each tranche bids
the cost plus its bin's markup: 32.5, 80, 220 and 260 €/MWh in Latvia and Lithuania, nothing in Estonia. The
schedule is fitted on 2023–2024 together with Kruonis's step (60 €/MWh); each fit year gives its own schedule
(2023: 30/70/110/110, 2024: 35/90/330/410) and the register is their average. The presentation shows the result
as Latvia's and Lithuania's gas bid "175–402 €/MWh" beside Estonia's "189".

**What "one bid" is taken to mean.** Every gas offer in Estonia, Latvia and Lithuania bids its own short-run cost
plus one markup m, the same in every hour, at every utilisation and in every country. The cost stays each plant's
own: one price for every gas plant whatever its efficiency would be a change of the fleet's technology, not of
its bidding. In the replays the two readings coincide, since each zone's gas is one class (`gas_ccgt`) with one
cost; in 2035 they do not, Estonia's gas being open-cycle (189 €/MWh at the opening state's fuel and CO₂ prices)
and Latvia's and Lithuania's combined-cycle (142 €/MWh), so one markup leaves Estonia's bid 47 €/MWh above the
others'. m = 0 — every plant at its cost, as Estonia's gas bids now — is the simplest case of it.

**What the replays can identify.** Estonia's gas in 2020–2026 is 11–22 MW (`fleet.ts`); its markup moves the
replays by almost nothing. The validation measures, in practice, the ladder replaced by one markup in Latvia and
Lithuania. Whether Estonia's 1 160 MW of open-cycle gas in 2035 carries the markup is an assumption either way —
none now (D-073), m under one bid — and the scenarios measure what it does.

**The variants.**
- *Register:* the ladder in force (D-115).
- *At cost:* m = 0 in all three zones.
- *One markup:* the same m in all three zones, fitted by the protocol of `fit_markup.ts`: each fit year's own
  best m on a grid of 2.5 €/MWh, the register their average, at each step of Kruonis's grid (0–120 €/MWh), the
  step kept whose register fits the two years best.
- *One markup in Latvia and Lithuania:* the same, Estonia at cost — to tell the ladder's removal from Estonia's
  markup.
- Each with the batteries' Δ as registered and refitted (`fit_delta.ts`'s bisection on the 2026 record).

**What is measured.**
- The fit years' objective (the sum of the three zones' hourly MAE in 2023 and 2024) and its left-out score.
- The full validation table, 2020–2026: MAE, bias, duration-curve RMSE, the hours at 150 €/MWh or more,
  generation by technology, the borders, R-VAL-5's breaches in 2023–2025, the error by observed price bin, the
  tails, and the EstLink 2 effect of R-VAL-6.
- The scenarios of 2035: the opening state's four, the neighbours' two tight profiles (D-121) and the opening
  state's five sensitivities of each scenario — the three zones' prices, Estonia's net import, CO₂, gas hours,
  the hours a Baltic fossil plant set the price, the tails, the gas burned, and the state's payment under the
  contract.
- The engine: the same programme without the tranches, its price against the four-tranche path's and its speed.

**What would count as "the model simplified at no real cost"** (fixed before the full results): the fit years'
objective within about 1 €/MWh of MAE per zone and year of the register's (a sum within ~6 of 59.51), no new
R-VAL-5 breach family, the blind years (2025, 2026) no worse, and the scenarios' differences between the plant's
scenarios — what the presentation reports — moved by less than the validation's own error.

The grid of the first family (one markup in all three zones) was in when this section was written; the rest
followed it.

## §1 The gas the markup applies to

`fleet.ts` builds each run without a markup and lists the gas offers — what the floors and the headroom leave —
with their largest hour and their cost-based bid's average:

| Run | Estonia | Latvia | Lithuania |
|---|---|---|---|
| 2023 replay | `gas_ccgt` 22 MW, 106.1 €/MWh | `gas_ccgt` 763 MW, 110.1 | `gas_ccgt` 721 MW, 103.4 |
| 2024 replay | 11 MW, 87.5 | 830 MW, 87.9 | 1 001 MW, 88.2 |
| 2025 replay | 14 MW, 93.5 | 743 MW, 94.0 | 657 MW, 93.7 |
| 2026 replay | 12 MW, 116.9 | 699 MW, 109.3 | 758 MW, 111.9 |
| 2035, opening state, 0 SMR, weather year 1995 | `gas_ocgt` 1 160 MW, 189.0 | `gas_ccgt` 1 000 MW, 142.1 | `gas_ccgt` 277 MW, 142.1 |

In the replays every zone's gas is one class with one cost, so one markup gives the three zones one bid. In 2035
Estonia's gas is S1's open-cycle peakers, its cost 47 €/MWh above the combined-cycle plants of Latvia and
Lithuania, and ten times its replays' size: there the markup's reach into Estonia matters, and no replay
measured it.

## §2 The fit: one markup is identified, at about 50 €/MWh

`grid.ts` replayed 2023 and 2024 for m = 0, 2.5, … 150 €/MWh at Kruonis's steps 0, 15, 30, 45, 60, 90 and 120
€/MWh, for one markup in all three zones and in Latvia and Lithuania only (1 708 replays, 449 s on six threads);
`analyse_grid.py` applies `fit_markup.ts`'s protocol (`results/grid_protocol.json`). The objective is the sum of
the three zones' hourly MAE over both years.

| Kruonis's step | 2023's own m | 2024's own m | register (their average) | sum at it | left-out sum | sum at m = 0 |
|---|---|---|---|---|---|---|
| 0 | 50 | 52.5 | 51.25 | 64.61 | 64.62 | 71.98 |
| 15 | 47.5 | 52.5 | 50 | 63.25 | 63.38 | 70.02 |
| 30 | 47.5 | 52.5 | 50 | 62.39 | 62.54 | 69.17 |
| 45 | 50 | 52.5 | 51.25 | 61.84 | 61.86 | 68.59 |
| **60** (the register's) | 52.5 | 50 | 51.25 | 61.89 | 61.90 | 68.39 |
| 90 | 50 | 52.5 | 51.25 | 61.85 | 61.86 | 68.54 |
| 120 | 50 | 55 | 52.5 | 61.94 | 61.99 | 68.83 |

In Latvia and Lithuania only, Estonia at cost, the same: 47.5–52.5 each year, 51.25 at step 60, a sum of 61.59.

- **The markup is identified.** Each fit year alone puts it at 47.5–55 €/MWh, at every step of Kruonis's grid,
  and the left-out sum equals the fitted one to 0.15. The ladder's fit years disagree by a factor of three on its
  top bins (2023 alone 30/70/110/110, 2024 alone 35/90/330/410; the register averages them, and its left-out sum
  at fitting was 60.34 against 59.51 fitted).
- **The objective is flat around 50.** At step 60: 61.91 at 47.5, 61.90 at 50, 61.88 at 52.5, 62.02 at 55. A
  round 50 €/MWh is the fit; the variants below use it.
- **Kruonis's step stays.** With one markup the best steps are 45–90 within 0.06; the register's 60 is kept, so
  that one thing changes.
- **At cost is far worse:** 68.4 at the register's step, nine points of the sum above the ladder.
- **The price of the simplification on the fit years:** 61.90 against the ladder's 59.13 under today's engine
  (the register's 59.51 was its value under the solver of its fit; D-130 moved it), +2.8 over six zone-years,
  about +0.5 €/MWh of MAE per zone and year.

The batteries' Δ refitted under one markup of 50 (`delta.ts`) stays 71.5 €/MWh (the 2026 discharge 31 297 MWh
against 31 015 recorded; the register's 31 082).

## §3 The validation: the averages hold, the dear hours go

`validate.ts` replays 2020–2026 under each variant and measures each year as `validate_fit.ts` does
(`results/validation.json`; Kruonis's step 60 and Δ 71.5 in all). MAE in €/MWh, Estonia / Latvia / Lithuania:

| Variant | 2023 | 2024 | fit years' sum | 2025 (blind) | 2026 (Jan–Sep, blind) | R-VAL-5 breaches 2023 / 2024 / 2025 | EstLink 2 effect, 2024 |
|---|---|---|---|---|---|---|---|
| Ladder (register) | 9.2 / 8.9 / 8.4 | 10.1 / 11.3 / 11.2 | 59.13 | 18.1 / 16.9 / 16.8 | 13.3 / 10.5 / 9.8 | 8 / 5 / 8 | 19.8 |
| At cost | 9.8 / 9.9 / 9.0 | 11.8 / 14.0 / 13.9 | 68.39 | 19.7 / 19.2 / 18.9 | 13.7 / 11.9 / 11.3 | 13 / 14 / 17 | 17.3 |
| One markup, 25 | 9.5 / 9.4 / 8.8 | 10.8 / 12.8 / 12.6 | 63.84 | 18.2 / 17.4 / 17.3 | 13.6 / 11.4 / 10.8 | 8 / 12 / 13 | 18.4 |
| **One markup, 50** | 9.2 / 9.0 / 8.6 | 10.6 / 12.3 / 12.2 | 61.90 | 17.9 / 17.0 / 16.9 | 13.7 / 11.2 / 10.6 | 8 / 9 / 11 | 19.0 |
| One markup, 75 | 9.5 / 9.4 / 9.0 | 11.1 / 12.5 / 12.5 | 63.97 | 18.2 / 17.5 / 17.3 | 13.6 / 11.3 / 10.6 | 9 / 6 / 14 | 20.2 |
| One markup, 50, Latvia and Lithuania only | 9.2 / 9.1 / 8.6 | 10.5 / 12.1 / 12.0 | 61.59 | 17.9 / 17.0 / 16.9 | 13.7 / 11.2 / 10.6 | 8 / 9 / 11 | 19.3 |

Bias (model − record), €/MWh, and the duration curve:

| Variant | bias 2024 | bias 2025 | bias 2026 | duration-curve RMSE 2024 | 2025 | Latvia's hours ≥ 250 €/MWh, 2024 / 2025 / 2026 (record 218 / 251 / 257) |
|---|---|---|---|---|---|---|
| Ladder | −3.4 / −4.9 / −4.9 | −2.6 / −1.0 / −1.2 | −6.5 / −4.1 / −4.4 | 5.8 / 8.4 / 8.4 | 8.7 / 8.0 / 8.2 | 146 / 197 / 142 |
| At cost | −7.4 / −10.2 / −10.1 | −7.0 / −8.2 / −8.2 | −7.9 / −7.4 / −7.7 | 10.4 / 13.8 / 13.6 | 17.5 / 19.3 / 19.3 | 129 / 101 / 103 |
| One markup, 50 | −3.6 / −5.5 / −5.5 | −3.8 / −2.5 / −2.7 | −7.0 / −4.9 / −5.2 | 7.9 / 10.8 / 10.7 | 14.4 / 15.6 / 15.8 | 122 / 109 / 124 |

- **The averages and the hour-by-hour error hold.** With one markup of 50 the fit years lose 0.6–1.0 €/MWh of MAE
  in Latvia and Lithuania in 2024 and nothing in 2023; the blind year 2025 is as good (Estonia 0.2 better); 2026
  loses 0.4–0.8 in Latvia and Lithuania. The average bias moves by up to 1.5 €/MWh towards too low.
- **The dear hours go.** One markup lifts every gas hour by the same 50 €/MWh; the ladder lifts the last quarter of
  a week's gas output by 220–260. With one markup Latvia has half the record's hours above 250 €/MWh in 2025 (109
  against 251; the ladder 197), and the duration curve's RMSE rises above R-VAL-5's 10 €/MWh in 2024 (10.7–10.8)
  and 2025 (14.4–15.8). Of R-VAL-5's breaches, 2024 gains four (Latvia's and Lithuania's duration curve and hours
  at 150 €/MWh or more, 3.3 pp short) and 2025 three (the three zones' duration curves); none is lost.
- **By observed price** (Latvia, `analyse.py validation`): in the hours the record put at 150–250 €/MWh one
  markup is 25 €/MWh too low in 2024 and 23 in 2025 against the ladder's 19 and 12; above 250, 115 and 134
  against 102 and 114. Below 150 the two are the same within 2 €/MWh.
- **At cost** misses the averages too (bias −7 to −10 €/MWh in 2024–2025), burns a third more gas than the record
  in Latvia and Lithuania, and breaches R-VAL-5 13 / 14 / 17 times.
- **Estonia's markup** (one markup in all three zones against Latvia and Lithuania only) moves the replays by at
  most 0.2 €/MWh: its gas is 11–22 MW there.
- **R-VAL-6 holds** under every variant (EstLink 2's 2024 effect 17–20 €/MWh, the gate 15–30).
- **The diagnostic years 2020–2022** (no threshold): the summed MAE rises from 152.5 to 179.2 with one markup,
  almost all of it in 2020, where every variant prices too high — the ladder by 16–17 €/MWh, one markup of 50 by
  23–24 — and not in order of the markup (at cost 27, 25: 33, 50: 24, 75: 21). The disorder is the hours at the
  price cap: one markup of 50 clears 16 hours of 2020 at 4 000 €/MWh, about 7 €/MWh of the year's average (§6);
  2021 is 1.3–1.6 worse, 2022 the same within 0.5.

## §4 The scenarios of 2035: the prices hold, Estonia's gas does not

`scenarios.ts` clears every weather year of the opening state's four scenarios, of the neighbours' two tight
profiles (D-121) and of the opening state's five sensitivities of each scenario, by the page's own path
(`assemble.ts`), under each variant (576 years, 259 s on five threads; `results/scenarios.json`). Figures are
weighted over the weather years, as the page weighs them.

**The opening state** (TYNDP 2024 Distributed Energy 2035):

| Variant | Estonia's price, 0 / 1 / 2 / 3 SMR | the plant's effect | Latvia's price | Estonia's gas hours, 0 / 3 SMR | Estonia's CO₂, Mt, 0 / 3 | net import, TWh, 0 / 3 | balance in euros, M€, 0 / 1 / 2 / 3 | the state pays, M€, 1 / 2 / 3 |
|---|---|---|---|---|---|---|---|---|
| Ladder | 84.7 / 75.6 / 66.5 / 56.3 | −9.0 / −18.2 / −28.4 | 80.9 / 77.7 / 75.6 / 74.5 | 543 / 147 | 0.30 / 0.12 | 5.97 / −0.91 | 555 / 347 / 167 / 15 | 33 / 114 / 250 |
| At cost | 81.7 / 73.8 / 65.3 / 55.8 | −7.8 / −16.4 / −25.9 | 77.6 / 75.0 / 73.2 / 72.2 | 398 / 118 | 0.24 / 0.12 | 6.07 / −0.90 | 555 / 347 / 168 / 16 | 38 / 120 / 254 |
| One markup, 25 | 84.4 / 75.8 / 66.7 / 56.5 | −8.5 / −17.7 / −27.9 | 80.0 / 76.9 / 74.8 / 73.6 | 301 / 81 | 0.20 / 0.10 | 6.17 / −0.88 | 590 / 370 / 181 / 23 | 32 / 113 / 248 |
| **One markup, 50** | 86.4 / 77.4 / 67.8 / 56.9 | −9.1 / −18.6 / −29.5 | 82.0 / 78.4 / 76.1 / 74.7 | 155 / 27 | 0.20 / 0.10 | 6.23 / −0.86 | 621 / 387 / 190 / 27 | 28 / 107 / 245 |
| One markup, 75 | 88.2 / 78.7 / 68.7 / 57.2 | −9.5 / −19.5 / −31.0 | 83.7 / 79.8 / 77.0 / 75.3 | 95 / 8 | 0.24 / 0.11 | 6.21 / −0.87 | 633 / 396 / 192 / 27 | 25 / 102 / 243 |
| One markup, 50, Latvia and Lithuania only | 84.9 / 76.1 / 66.8 / 56.4 | −8.9 / −18.1 / −28.5 | 81.1 / 77.9 / 75.8 / 74.5 | 850 / 192 | 0.40 / 0.13 | 5.75 / −0.92 | 517 / 326 / 159 / 14 | 32 / 112 / 249 |

**The neighbours' tight profiles**, Estonia's price 0 / 1 / 2 / 3 SMR and Estonia's gas hours without the plant:

| Variant | TIGHT | its gas hours | TIGHTJ | its gas hours |
|---|---|---|---|---|
| Ladder | 122.9 / 109.2 / 99.1 / 89.0 (−13.7 / −23.8 / −33.9) | 2 608 | 120.8 / 112.4 / 105.7 / 97.7 (−8.4 / −15.1 / −23.1) | 820 |
| One markup, 50 | 124.2 / 110.8 / 101.4 / 90.8 (−13.5 / −22.9 / −33.5) | 518 | 122.7 / 114.6 / 107.8 / 99.1 (−8.1 / −14.9 / −23.6) | 343 |
| One markup, 50, Latvia and Lithuania only | 123.1 / 109.6 / 99.1 / 88.9 (−13.6 / −24.0 / −34.2) | 2 853 | 121.3 / 112.9 / 106.1 / 97.8 (−8.4 / −15.2 / −23.5) | 1 171 |

**The sensitivities** (`analyse.py sensitivities`): under one markup of 50 the plant's effect in each of the five
moves by 0.1–1.5 €/MWh against the ladder's, the largest in (d), gas at the 2022 shock (3 SMR −40.4 against
−38.9) and (e), CO₂ at its 2026 price (−21.5 against −19.6). No set under any variant leaves energy unserved.

- **The prices and the plant's effect hold.** One markup of 50 raises Estonia's price by 1.7 €/MWh without the
  plant and 0.6 with three units; the plant's effect grows by 0.1 / 0.4 / 1.1 €/MWh, an average household's
  saving from 34 / 68 / 107 to 34 / 70 / 111 € a year with VAT, and the state pays 5–7 M€ a year less. All of it
  lies inside the validation's error. The net import bill the plant avoids over 60 years grows more, from
  12.5 / 23.3 / 32.4 to 14.0 / 25.9 / 35.6 bn €, because Estonia without the plant imports more (below).
- **Estonia's gas leaves the merit order.** Under one markup Estonia's open-cycle gas bids 189 + 50 = 239 €/MWh,
  above Latvia's and Lithuania's combined-cycle gas at 142 + 50 = 192 in every hour, so Estonia imports their
  gas power before it runs its own: its gas hours fall from 543 to 155 without the plant (from 2 608 to 518 in
  TIGHT), its CO₂ from 0.30 to 0.20 Mt, and its net import rises by 0.26 TWh (2.1 in TIGHT). Under the ladder
  Estonia's 189 lies between Latvia's and Lithuania's first step (175) and their second (222), so Estonia's gas
  runs once theirs is half in use; with Estonia at cost and one markup in Latvia and Lithuania (192) Estonia's
  gas runs first, and its hours rise to 850.
- **Which is right is not measured.** The replays hold 11–22 MW of Estonian gas; how Estonia's 1 160 MW of peakers
  would bid in 2035 against Latvia's and Lithuania's plants is an assumption under every variant. The figures it
  drives — Estonia's gas hours, its CO₂, its net import and the balance in euros — are on the presentation; they
  move by 30–80 % with it, the prices by 1–2 %.
- **At cost** lowers Estonia's price by 3.0 €/MWh and the plant's effect by 1.2–2.5, against a validation that
  misses the averages by 7–10 €/MWh (§3).

## §5 The engine: one markup needs no tranches

With one markup the four tranches of each gas offer bid the same, and the markup is the offer's cost plus m.
`single_path.ts` builds each year both ways — `applyMarkup`'s four tranches at m = 50, and the offers unsplit with
50 added to their bids — at Kruonis's step 60, in 2 SMR for the weather years (this Mac, one thread, nothing else
running):

| Year | offers | largest hourly difference, €/MWh | zone-hours over 1 €/MWh | the averages, four tranches less unsplit, EE / LV / LT | solve, ms, four tranches → unsplit |
|---|---|---|---|---|---|
| 2023 | 30 → 21 | 29.6 | 205 of 26 280 | +0.06 / +0.06 / +0.05 | 1 395 → 1 150 |
| 2024 | 31 → 22 | 121.0 | 298 of 26 352 | −0.16 / −0.16 / −0.16 | 1 358 → 1 203 |
| 2025 | 31 → 22 | 128.9 | 305 of 26 280 | +0.05 / +0.08 / +0.08 | 1 303 → 1 136 |
| 2026 (Jan–Sep) | 31 → 22 | 42.9 | 60 of 19 656 | −0.01 / −0.01 / −0.01 | 1 594 → 1 493 |
| weather year 1995 | 35 → 26 | 56.3 | 141 of 26 280 | +0.04 / +0.02 / +0.02 | 1 700 → 1 575 |
| weather year 2008 | 35 → 26 | 45.8 | 184 of 26 280 | −0.02 / −0.02 / −0.02 | 1 585 → 1 484 |
| weather year 2009 | 35 → 26 | 25.7 | 78 of 26 280 | +0.03 / +0.01 / +0.01 | 1 854 → 1 733 |

The two are the same programme: the hours that differ are the optimum's ties, where the solver picks another of
equally cheap dispatches and so another price — the non-uniqueness D-130 measured for presolve. The averages move
by at most 0.16 €/MWh. Dropping the tranches solves a year 6–18 % faster. The code loses `MARKUP_EDGES`, the
weekly maxima and the tranche split; the register loses three numbers per zone.

## §6 A side finding: one day of 2020 at the price cap

Under one markup of 50 the 2020 replay clears 16 hours at the cap (4 000 €/MWh), all on 10 June 2020, and sheds
238 / 438 / 104 MWh in Estonia / Latvia / Lithuania (`scarcity.ts`); at cost 44 hours, at 25 31 hours, at 75 and
under the ladder none. 2025 at cost has two; no other replay and no set of 2035 under any variant has one.
`cap_hours.ts` traces it to oil shale's entry (D-113): on 10 June the circulating-fluidised-bed class (288 MW,
bid 66 €/MWh) was off the day before, and the first pass, with the class free to run, priced the day at 86 €/MWh
at most — at or above its bid in all 24 hours, but not by enough to pay its warm start — so it stays off. Without
its 288 MW the second pass runs short. Under the ladder the first pass's price that day is higher and the start
pays.

The rule commits on a price that assumes the class runs, so it can leave off a class whose absence makes the
scarcity it was not paid for. The ladder hides it on that day; one markup shows it. It is a fault of the entry
rule, not of the markup, and a small one to mend — a class kept off for a day whose second pass reaches the cap
comes on and the day clears again — but any change of the markup should carry it.

*Mended the same day as proposed (ERRATA E-160, DECISIONS D-165): the day's week clears again with the class on.*

## §7 What the dear hours cost in parameters: two numbers

One markup loses the dear hours. `two_step.ts` asks how few numbers bring them back: a markup m1 on R-SUP-6's
lower bins and m2 on the upper, in all three zones, at Kruonis's step 60 (`results/two_step.jsonl`; the fit years'
sum of MAE):

| m2 on | best (m1, m2) | sum | 2023's own | 2024's own |
|---|---|---|---|---|
| the last 10 % | 45, 300 | 61.54 | 45, 300 | 50, 250 |
| the last 25 % | 45, 300 | 60.29 | 45, 300 | 40, 300 |
| the last 50 % | 35, 100 | 60.14 | 45, 100 | 35, 400 |

Only the split at 75 % is identified — both fit years put m2 at 300 — and only it brings the dear hours back.
Validated (`validate.ts`, "two 45/300" = 45 / 45 / 300 / 300):

| Variant | fit years' sum | 2025 MAE | 2026 MAE | breaches | Latvia's hours ≥ 250, 2024 / 2025 | duration-curve RMSE 2024 |
|---|---|---|---|---|---|---|
| Ladder | 59.13 | 18.1 / 16.9 / 16.8 | 13.3 / 10.5 / 9.8 | 8 / 5 / 8 | 146 / 197 | 5.8 / 8.4 / 8.4 |
| Two numbers, 45 / 300 | 60.29 | 18.7 / 17.6 / 17.5 | 13.6 / 10.8 / 10.2 | 8 / 5 / 10 | 148 / 197 | 5.8 / 8.4 / 8.3 |
| One markup, 50 | 61.90 | 17.9 / 17.0 / 16.9 | 13.7 / 11.2 / 10.6 | 8 / 9 / 11 | 122 / 109 | 7.9 / 10.8 / 10.7 |

Two numbers keep the ladder's distribution and nearly its breaches, but lose the blind year 2025 by 0.6–0.7 €/MWh,
where one markup loses nothing. (The top 10 % alone at 300 — 45 / 45 / 45 / 300 — scored 61.54 and 7 / 7 / 14
breaches: one high bin does not bring the hours back.) In 2035 two numbers in all three zones land where one
markup does: Estonia 86.6 / 77.2 / 67.7 / 56.9 €/MWh, the plant's effect −9.4 / −19.0 / −29.8, Estonia's gas 218
hours without the plant. What moves Estonia's gas in §4 is the markup's reach into Estonia, not its shape.

## §8 Against the criteria of §0

| Criterion (fixed in §0) | One markup of 50 in all three zones |
|---|---|
| The fit years within ~1 €/MWh of MAE per zone and year | met: +2.8 over six zone-years (+0.5 each) |
| No new family of R-VAL-5 breaches | **not met:** the duration curve's RMSE in 2024 (Latvia, Lithuania) and 2025 (all three), the hours at ≥ 150 €/MWh in 2024 |
| The blind years no worse | 2025 met (−0.2 / +0.1 / +0.1); **2026 not met** (+0.4 / +0.7 / +0.8) |
| The plant's effect moved by less than the validation's error | met: +0.1 / +0.4 / +1.1 €/MWh; the state's payment −5 to −7 M€ a year |

One bid is not free. The hour-by-hour error and the averages hold, in and out of sample; the price
distribution's tail does not, and Estonia's gas in 2035 changes its place in the merit order.

## §9 Findings and what adopting it would take

**Findings.**
1. *One bid is identified.* Every gas plant at its own cost plus 50 €/MWh fits each fit year alone at 47.5–55
   and both together at 50; the ladder's top bins differ by a factor of three between its fit years.
2. *It holds the averages.* Fit years +0.5 €/MWh of MAE per zone and year; the blind 2025 as good; 2026 0.4–0.8
   worse in Latvia and Lithuania; the bias up to 1.5 €/MWh lower.
3. *It loses the dear hours.* Half the hours above 250 €/MWh in 2025, the duration curve over R-VAL-5's limit in
   2024–2025: seven more breaches (8 / 9 / 11 against 8 / 5 / 8).
4. *The presentation's conclusions stand.* Estonia's price +1.7 €/MWh without the plant, +0.6 with three units;
   the plant's effect +0.1 / +0.4 / +1.1; the household's saving 34 / 70 / 111 € (34 / 68 / 107); the state's
   payment 28 / 107 / 245 M€ (33 / 114 / 250); the same in the tight profiles and the sensitivities.
5. *Estonia's gas changes place.* One rule for all three puts Estonia's open-cycle peakers (239 €/MWh) behind
   Latvia's and Lithuania's combined-cycle gas (192): Estonia's gas hours fall from 543 to 155, its CO₂ from 0.30
   to 0.20 Mt, its net import rises 0.26 TWh — the presentation's gas hours, CO₂ and balance in euros move by
   30–80 %. The replays cannot say which is right; under the ladder Estonia's gas runs because Latvia's and
   Lithuania's upper tranches are marked up and Estonia's are not.
6. *At cost is not an option:* the bias −7 to −10 €/MWh, 13 / 14 / 17 breaches.
7. *The engine gets simpler and faster:* no tranches, no weekly maxima, one number in the register; a year solves
   6–18 % faster; the same programme up to the optimum's ties (averages within 0.16 €/MWh).
8. *A latent fault of oil shale's entry* (§6): one day of 2020 clears at the cap under one markup; the rule can
   leave off a class whose absence makes the scarcity. Any change of the markup should carry its mend.

**What adopting it would take** (a figure-moving change; the owner's to sign):
- `build.ts`: the markup one number added to every gas offer's bid, no tranches (`MARKUP_EDGES` and the weekly
  split retired); the register's `markup` one value for the three zones; `fit_markup.ts` a one-dimensional fit on
  2.5 €/MWh steps with Kruonis's step grid kept; `validate/fit.py`, the Calibration page and the presentation's bid
  column (one bid per zone, no range).
- Oil shale's entry: a class kept off on a day whose second pass reaches the cap comes on, and the day clears
  again.
- The fit run once (`make fit`), Δ checked (71.5 holds), the golden fixture re-baselined, the validation files,
  the methodology's §7 figures and the gap table re-run.
- The specification's R-SUP-6 revised (one markup, its fit, the cross-check unchanged); a decision record; the
  methodology §7 and FAQ texts on the ladder; the CHANGELOG.
- The presentation's figures move as §4 shows; the deck's figures follow at the freeze (`make freeze`).

## §10 The owner's follow-up: one gas bid for the three countries, shown in the panel

**The question (2026-10-22).** "and if gas in the three countries had the same bid, without
markups — so that we see the gas bid in the panel and it applies to the three countries?"

**What it is.** One number for every gas offer of Estonia, Latvia and Lithuania, whatever the plant's own
efficiency: a combined-cycle plant's cost as the run prices it — at the opening state fuel 68.2 €/MWh (38.2 €/MWh
thermal at 56 %), CO₂ 72.4 (197.5 €/t), running 1.6: 142.1 €/MWh — plus an adder p. It follows the gas and CO₂
prices as every bid does, so the sensitivities keep working, and the panel shows it once: 142 at p = 0, 192 at
p = 50. Estonia's open-cycle peakers, whose own cost is 189, bid it too. `variants.ts`'s `onePrice` sets every gas
offer's bid to Latvia's combined-cycle offer's plus p, built without tranches; "one price at cost" (p = 0) and
"one price + 50" (p = 50, the fit of §2).

**The replays** have one gas class in all three zones, so one price is one markup there. At cost it is the variant
"at cost" to the bit. At + 50 it is "one markup, 50" without the tranches (§5), and the optimum's ties fall a
little better: the fit years' sum 61.32 (61.90 with the tranches), 2025 17.9 / 17.0 / 16.9, 2026 13.7 / 11.2 /
10.6, breaches 7 / 8 / 11, Latvia's hours above 250 €/MWh in 2025 105 against the record's 251.

**The scenarios of 2035**, the opening state:

| Variant | Estonia's price, 0 / 1 / 2 / 3 SMR | the plant's effect | Latvia's price, 0 SMR | Estonia's gas hours, 0 / 3 SMR | Estonia's CO₂, Mt, 0 / 3 | balance in euros, M€, 0 / 3 | the state pays, M€, 1 / 2 / 3 |
|---|---|---|---|---|---|---|---|
| Ladder | 84.7 / 75.6 / 66.5 / 56.3 | −9.0 / −18.2 / −28.4 | 80.9 | 543 / 147 | 0.30 / 0.12 | 555 / 15 | 33 / 114 / 250 |
| One price at cost (142) | 78.9 / 71.1 / 63.0 / 54.5 | −7.8 / −15.9 / −24.4 | 76.6 | 936 / 386 | 0.45 / 0.18 | 475 / −7 | 45 / 132 / 264 |
| **One price + 50 (192)** | 85.3 / 76.3 / 67.0 / 56.5 | −8.9 / −18.3 / −28.7 | 81.3 | 376 / 110 | 0.24 / 0.11 | 585 / 19 | 31 / 111 / 248 |
| One markup, 50 (EE 239, LV/LT 192) | 86.4 / 77.4 / 67.8 / 56.9 | −9.1 / −18.6 / −29.5 | 82.0 | 155 / 27 | 0.20 / 0.10 | 621 / 27 | 28 / 107 / 245 |

In TIGHT one price + 50 gives Estonia 123.4 / 109.8 / 99.3 / 89.1 €/MWh (the ladder 122.9 / 109.2 / 99.1 / 89.0)
and 848 gas hours without the plant (2 608); in TIGHTJ 121.5 / 113.2 / 106.3 / 97.9 (120.8 / 112.4 / 105.7 /
97.7). In the five sensitivities the plant's effect stays within 0.4 €/MWh of the ladder's, except (e), CO₂ at its
2026 price: −20.9 against −19.6 with three units.

- **Without an adder the bid is too low.** At a combined-cycle plant's bare cost the replays miss the averages by
  7–10 €/MWh and breach R-VAL-5 13 / 14 / 17 times (§3); in 2035 Estonia's price falls by 5.8 €/MWh without the
  plant, the plant's effect shrinks by 1.2 / 2.3 / 4.0, the state's payment rises by 12–18 M€ a year, and Estonia's
  peakers, now bidding a combined-cycle plant's cost, run 936 hours.
- **With the fitted 50 the presentation's figures hold.** Estonia's price within 0.8 €/MWh of the ladder's in every
  scenario and in the tight profiles, the plant's effect within 0.4 (0.5 in TIGHTJ with three units), the state's
  payment within 3 M€ a year. Estonia's
  gas ties with Latvia's and Lithuania's at one price, and runs 376 hours instead of 543.
- **It is the simplest form that keeps the model calibrated:** one number, the same in the three countries, a
  combined-cycle plant's cost plus 50, which the panel can show and a user can move. Its price is §3's: the dear
  hours, and five more R-VAL-5 breaches than the ladder's (7 / 8 / 11 against 8 / 5 / 8).

**What the panel would show.** One row for the three countries, beside the gas and CO₂ prices: "Gas plants' bid
192 €/MWh", its tip the parts (fuel 68.2 + CO₂ 72.4 + running 1.6 + 50 fitted on 2023–2024); a box to type another
bid, kept as an offset that rides on the gas and CO₂ prices (D-090), in place of the three zones' gas boxes; the
presentation's bid column one number for the gas of the three. What adopting it would take is §9's list, with the
register's markup one adder over a combined-cycle plant's cost.
