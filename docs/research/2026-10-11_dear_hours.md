# The dear hours: what the gap is made of, and what moves it (2026-10-11)

The owner asked for a programme of work on the dear hours (2026-10-11, after D-114): in the hours
the market cleared above 250 €/MWh the engine of record is 77–112 €/MWh too low (Lithuania, bins of
the observed price; methodology §7.3), at 150–250 €/MWh 5–21 too low, and 2024's share of hours at
or above 150 €/MWh misses R-VAL-5 in Latvia and Lithuania by 3.1 and 3.0 points (6.5 and 3.5 hours
beyond the 3 allowed). Everything here is on the register in force (D-114: markup LV/LT 37.5 /
147.5 / 237.5 / 257.5, Δ 71), on the fit years 2023–2024 and the blind year 2025; January–September
2026 stays sealed until the end (the adoption rule below). The scripts are in `spikes/dear-hours/`
and run from `app/`.

**The adoption rule, written before any candidate was scored on 2025.** A candidate is refitted
the way the register is (`spikes/dear-hours/refit.ts`, as `app/scripts/fit_markup.ts`), against
the baseline refitted the same way. A change without a new fitted parameter is proposed if the
record supports its mechanism, it adds no breach in 2023–2024, and on the fit years it leaves the
sum of MAE within the refit's noise and improves the tail (upper quantiles or R-VAL-5's share) or
improves the MAE beyond the noise. A mechanism that exists only from 2025 is judged on the record's
evidence, not on prices. 2025 is scored once per finished candidate and reported, never used to
choose. A new fitted parameter or a change of R-SUP-6's form waits for a specification revision.

## 1. The gap is mostly how the hours are chosen

`tail.ts` bins each zone's hours on its own observed price and, beside it, on the model's own
price; it maps the model's prices by rank onto the record's distribution (what the bias keeps is
timing and noise, what it loses is level); and it builds a calibrated model with this model's
noise — the record replaced by the model plus residuals drawn within the model's price deciles,
demeaned — and bins that on its own synthetic record (Lithuania; 90 % intervals by a bootstrap of
days):

| LT | Bias, record > 250 | A calibrated model would show | Mapped by rank | Model's own > 250: bias (hours) | Model's own 150–250 | Record's top hours ≥ 250 the model also has |
|---|---|---|---|---|---|---|
| 2023 | −76.8 [−102 … −50] | −58.7 | −57.0 | +36.6 (76) | +1.7 | 57 of 106 |
| 2024 | −105.2 [−193 … −47] | −111.3 | −35.8 | −33.2 (121) | −15.5 | 153 of 219 |
| 2025 | −111.6 [−142 … −80] | −87.2 | −81.4 | +49.5 (201) | −5.3 | 102 of 252 |

- A model that is right on average given its own price, with the noise this one has, would show
  −59 to −111 €/MWh in the hours the record put above 250: most of the headline bias is the
  selection, not a missing price level. The same holds at 150–250 (−4.7 / −21.0 / −10.4 against
  −11.0 / −15.9 / −22.4 for the calibrated model).
- Binned on its own price, the model is right on average in Estonia in 2024 only (+1.0 in its 129
  hours above 250, −3.1 at 150–250). Latvia and Lithuania are too low in 2024's dear hours (−33
  above 250, −15 at 150–250: a level gap), and all three zones too *high* in 2023's and 2025's
  (+34.5 to +38.5 and +49.5 to +57.6: the model's dear hours are often not the market's; Estonia's
  figures corrected by ERRATA E-145).
- So the tail has two faces. **2024 is level**: the model finds 70 % of the record's 219 hours at
  or above 250 and prices them too low; its upper quantiles fall short (q97.5 224.5 against 250,
  q99 255.9 against 300.4) and with them R-VAL-5's share. **2023 and 2025 are timing**: the model
  finds 54 % and 40 % of the record's dearest hours, its upper quantiles are close (2025: q97.5
  248.9 against 254.8, 202 hours at or above 250 against 252), and mapping by rank removes little.
- The heavy tail matters: 2024's two hours of 5 January (1 479 and 1 896 €/MWh in Estonia) carry
  about 10 €/MWh of the top bin's mean; the bootstrap intervals are wide.

## 2. What sets the price in the dear hours

`tail.ts` also gives each hour's regime (the zone's price at FI's, SE4's or PL's boundary price,
±0.5 €/MWh, or above, between or below them) and what sets the model's price: an offer running
part-loaded (`marginal()`), otherwise a store part-loaded against the hour's own limits.
`spikes/validation-round2/setter.ts` tested Kruonis against its nameplate rather than the week's
power the replay gives it (`dischargeMax`), so a Kruonis at its weekly limit counted as setting
the price; corrected here, the count does not move on the register in force (93 of 2025's 247
hours either way; the 102 of 2026-10-05's note was on an earlier register; ERRATA E-144).

- **Regimes.** In the hours Lithuania cleared above 250 the record stood above all three
  neighbours in 46 of 99 (2023), 46 of 211 (2024) and 167 of 247 (2025), and at a neighbour's price
  in most of the rest (2024: 73 at Finland's, 35 at Poland's, 26 at SE4's). Where the record is
  coupled and the model is not, the model's Baltic price sits below the neighbour's: in 2024's 73
  hours at Finland's price the model is coupled in 44 and stands between the neighbours, 277 €/MWh
  lower, in 26 — the model had cheap supply to spare where the market had none.
- **Setters.** In 2025's 247 hours above 250 Kruonis discharging part-loaded sets the model's
  price in 93 (model 219, record 356), an import from SE4 in 36, the gas tranches in 37, the Daugava
  in 19. In the model's own 201 hours above 250 Kruonis sets it in 65 — there the model is too high
  (306 against 243) — and the gas tranches in 53 (too high: 267–348 against 205–212). In 2024's 211
  hours above 250: the gas tranches 59 (the lowest two in 49), exports to FI and PL 60 (right),
  Kruonis 28 (202 against 475), imports 42.

## 3. Kruonis runs as the market's never did

`stores.ts`, model against record:

| | 2023 | 2024 | 2025 |
|---|---|---|---|
| Kruonis in the record's hours above 250, MW | 240 / 184 | 310 / 224 | 197 / 142 |
| Kruonis generating: hours, mean MW (model) | 900 h, 286 MW | 1 009 h, 323 MW | 1 311 h, 251 MW |
| … of them at the week's power limit | 435 h | 518 h | 559 h |
| Kruonis generating: hours, mean MW (record) | 3 096 h, 173 MW | 3 230 h, 177 MW | 2 607 h, 184 MW |
| The Daugava in the record's hours above 250, MW | 345 / 340 | 448 / 466 | 486 / 488 |

The programme runs Kruonis as a peak shaver at the week's maximum A75 output in half its hours;
the plant ran long at part load, a unit at a time, and gave 55–86 MW less in the dear hours.
Litgrid contracts 400 MW of Kruonis — two of its four units — as manual frequency restoration
reserve (mFRR; Litgrid, "System power reserves"; the regulator extended the regulated service to
2026), consistent with a weekly maximum of 390–424 MW at the median against 900 installed. The
Daugava in the dear hours is right on average.

**Oracles** (`oracle.ts`): one unit at a time run as recorded, hour by hour, in place of the
programme — the most any rule for that unit could gain. Lithuania's bias in the record's hours
above 250, and the fit years' sum of MAE:

| | 2023 | 2024 | 2025 |
|---|---|---|---|
| The engine of record | −76.8 (27.71) | −105.2 (34.45) | −111.6 (54.11) |
| Kruonis as recorded | −76.0 (32.71) | −50.9 (44.61) | +7.0 (81.42) |
| The Daugava as recorded | −76.2 (29.95) | −111.1 (38.30) | −67.8 (108.02) |
| Oil shale as recorded (no entry) | −75.1 (29.25) | −100.3 (35.51) | −106.2 (56.40) |
| Latvian gas as recorded | −86.7 (27.16) | −88.1 (36.50) | −104.4 (55.05) |
| Lithuanian gas as recorded | −68.6 (28.91) | −108.6 (33.86) | −115.0 (56.17) |

Kruonis is the one lever on the dear hours: as recorded it halves 2024's bias and removes 2025's.
Oil shale's and gas's availability or commitment cannot do much (at most 17 €/MWh, in either
direction, even run as recorded), so outage messages (A80) and gas commitment drop down the list. Every oracle raises the
MAE: a store held to its record cannot answer the hours the programme needs it in, and the model
has nothing between its dearest gas tranche (about 350 €/MWh) and shedding at 4 000.

**Screens at the register in force, no refit** (`screens.ts`):

| | Σ MAE 2023 / 2024 / 2025 | LT > 250, 2024 / 2025 | Hours ≥ 150, LT 2024 (record 992) |
|---|---|---|---|
| The engine of record | 27.71 / 34.45 / 54.11 | −105.2 / −111.6 | 725 |
| Kruonis's power at its week's 90th-percentile running hour | 27.03 / 36.05 / 54.53 | −99.7 / −90.1 | 749 |
| … at its week's median running hour | 28.09 / 47.21 / 65.17 | −55.9 / −40.6 | 786 |
| … capped hour by hour by its record | 28.56 / 46.07 / 72.86 | −48.2 / +26.8 | 780 |
| The window {24, 24} | 28.94 / 35.70 / 87.16 | −96.5 / −43.6 | 799 |
| The week (D-021's programme) | 27.44 / 34.37 / 53.40 | −107.8 / −120.6 | 722 |

The tighter Kruonis, the less the dear-hour bias and the more hours shed (`cliff.ts`: at the
median, 11 hours at 4 000 €/MWh in 2024 and in 2025 carry 30 % and 21 % of Lithuania's absolute
error). In those hours the Daugava is held at its week's 90th-percentile hour while the record ran
above it (2024-04-04 06 UTC: 1 142 against 1 196 MW; 2025-01-05: 553 against 610–668), and gas and
the imports are at their limits.

## 4. The forecasts the market cleared on do not explain the timing

ENTSO-E's day-ahead forecasts (A69 wind and solar, A65 with process A01 load; fetched through the
pipeline with lineage, `pipeline/sources/entsoe.py`; `forecasts.py`, `forecast.ts`) against the
outturn the replays take. In the record's hours above 250 the Baltic residual load (load − wind −
solar) was forecast 8, 64 and 92 MW *below* the outturn in 2023–2025: the market expected a looser
system than came, so clearing on the forecasts lowers the dear hours further. The replays on the
forecasts are worse on the fit years (Σ MAE 28.38 and 42.29 against 27.71 and 34.45; 2024's wind and
solar forecasts alone 51.45: the TSOs' solar forecast runs 106 MW low on average that year) and
leave the dear hours as they are (LT above 250: −83.9 / −114.2 / −126.8). Dropped (adoption rule:
worse on the fit years, no tail gain).

## 5. The markup's form

`applyMarkup` (`app/src/engine/build.ts:530-557`) splits what the floors leave of each gas offer by
shares of that remainder's weekly maximum. R-SUP-6 bins the utilisation of the flexible thermal
fleet against the week's maximum, and D-022 item 1 reads "the week's maximum" as the weekly maximum
A75 output; v4 (D-032, `model/week.py`) split each hour's band between the committed minimum and the
availability 50 / 25 / 15 / 10 %. Where a floor varies within the week — Latvia's gas, whose heat
floor follows temperature — a cold hour's remainder falls into the low tranches only; in
Lithuania's hours above 250 Latvian gas offered at the top two markups 69 / 50 / 79 MW (2023–2025)
where bins of the fleet's maximum would offer 116 / 99 / 136 (`markup.ts`). At the register's
schedule, without a refit:

| Form | Σ MAE 2023 / 2024 / 2025 | Hours ≥ 150 2024, LV / LT (record 1 002 / 992) | 2025, LV / LT (1 260 / 1 258) |
|---|---|---|---|
| The remainder (build.ts) | 27.71 / 34.45 / 54.11 | 732 / 725 | 1 127 / 1 120 |
| v4's split of each hour | 27.68 / 34.45 / 54.69 | 755 / 748 | 1 148 / 1 141 |
| The fleet's maximum (R-SUP-6's words) | 28.97 / 35.01 / 58.59 | 845 / 838 | 1 260 / 1 253 |

## 6. Candidates refitted

`refit.ts` refits the markup as `fit_markup.ts` does (Δ stays 71: it moves 2026 alone). The
baseline refitted the same way returns the register to the euro (37.5 / 147.5 / 237.5 / 257.5,
folds 40 / 60 / 120 / 120 and 35 / 235 / 355 / 395). The noise margin is E-065's: 0.6 of the fit
years' sum across starting points. "Fit years" is the sum of 2023's and 2024's MAE at the averaged
register; "crossed" each fold's schedule scored on the other year.

| Variant | Register | Fit years | Crossed | Breaches 2023 / 2024 | 2025: Σ MAE, breaches (reported) |
|---|---|---|---|---|---|
| The baseline | 37.5 / 147.5 / 237.5 / 257.5 | 62.16 | 64.02 | 8 / 7 | 54.11, 9 |
| v4's split of each hour | 37.5 / 507.5 / 597.5 / 617.5 | 63.39 | 67.51 | 8 / 6 | 79.36, 12 |
| The fleet's maximum | 20 / 167.5 / 227.5 / 247.5 | 64.48 | 66.98 | 8 / 5 | 58.43, 10 |
| Kruonis at its week's p90 | 22.5 / 127.5 / 247.5 / 307.5 | 63.12 | 64.40 | 7 / 4 | 53.44, 10 |
| v4's split, Kruonis p90 | 22.5 / 142.5 / 242.5 / 302.5 | 63.49 | 64.64 | 7 / 4 | 54.28, 11 |
| The fleet's maximum, Kruonis p90 | 15 / 60 / 150 / 250 | 62.29 | 62.82 | 7 / 6 | 52.23, 11 |

- v4's split lets 2024's fold price the upper half of the fleet out (35 / 955 / 1 075 / 1 115, the
  runaway E-065 describes): dropped.
- The fleet's maximum alone fits the fit years worse by 2.3: dropped as a change of the code; the
  difference between R-SUP-6's words and `applyMarkup` stays to be resolved in the specification's
  text (§8).
- Kruonis at its week's 90th-percentile running hour — the Daugava's decile convention (D-044)
  applied to the other store — meets 2024's share in both zones (764 and 758 hours against 1 002
  and 992) and cuts 2024's breaches from 7 to 4, but costs the fit years 1.0, beyond the margin.
- With the fleet's maximum it holds the fit years (62.29) and crosses better (62.82): the folds
  nearly agree (10 / 50 / 130 / 210 and 20 / 70 / 170 / 290, where the baseline's are 120 against
  395 in the top bin). Its blind year is 1.9 better in MAE but loses the share of dear hours
  (−4.1 to −4.4 points, three breaches back). It does not survive its neighbours: at the week's
  80th and 95th percentile the same refit gives 64.83 and 63.35 on the fit years — 62.29 is a lucky
  point of the descent, not a gain: dropped.

## 7. Kruonis with a rising cost of its power

The oracles point at Kruonis and the screens at its power, but holding the plant to less power
sheds load where the Daugava is held to its band. The record's plant does not run as a price-taker
at the batteries' cost: it runs a unit at a time, long hours at part load, and gives the dearest
hours less than the week's power allows. Two of its four units are Litgrid's mFRR reserve, and its
operator also owns most of Lithuania's dispatchable plant; a storage owner who weighs what its own
output does to the price holds capacity back and flattens the peaks less than a welfare-maximising
dispatch (Schill and Kemfert, "Modeling Strategic Electricity Storage: The Case of Pumped Hydro
Storage in Germany", *The Energy Journal* 32 (3), 2011; Sioshansi, "Welfare Impacts of Electricity
Storage and the Implications of Ownership Structure", *The Energy Journal* 31 (2), 2010).

`strategic.ts` gives the linear programme a rising cost of power without touching it: Kruonis as
its four units (quarters of the plant), the j-th (from 0) charging at Δ + j·s, the week's power limits
filling the units in order (`units`), or as four equal shares of each limit (`tranches`). On the
fit years at the register in force (`tranche_grid.ts`; Σ MAE of 2023 and 2024, the register's
62.16):

| | Σ MAE 2023 + 2024 | Hours ≥ 150, LV / LT 2024 (record 1 002 / 992) | LT q99 2024 (300.4) | Kruonis TWh 2023 / 2024 (record 0.53 / 0.57) |
|---|---|---|---|---|
| One Δ for the plant: 60 (in force) / 75 / 90 / 120 | 62.16 / 61.32 / 61.22 / 62.33 | 732 / 725 … 835 / 829 | 255.9 … 278.4 | 0.26 / 0.33 … 0.04 / 0.10 |
| Four units in order, s = 20 / 30 / 45 / 60 / 90 / 120 | 60.44 / 60.23 / 60.02 / 60.28 / 60.45 / 60.59 | 761 / 755 … 803 / 797 | 262.2 … 300.0 | 0.16 / 0.21 … 0.10 / 0.12 |
| Four equal shares, s = 10 / 20 / 30 / 45 | 60.85 / 60.49 / 60.14 / 60.15 | 770 / 763 … 805 / 799 | 255.9 … 284.8 | 0.19 / 0.25 … 0.10 / 0.15 |

The rising cost beats any one Δ by about 1.2 before a refit, and its optimum is flat (s between
30 and 60). Run so (four equal shares, s = 30; `stores.ts --tranches`), Kruonis gives the record's dear
hours what the record shows — 162 / 244 / 143 MW in Lithuania's hours above 250 in 2023–2025,
against 184 / 224 / 142 recorded and 240 / 310 / 197 at one Δ of 60 — at a running power of 134–187
MW against 173–184, at the week's limit in 21–82 hours where it was in 435–559. What it does not
reproduce is the record's hours: about 1 000 a year against 2 600–3 200, and 0.12–0.18 TWh against
0.48–0.57. A75's output may count the reserve units' activations (not measured), which the day-ahead market never
scheduled; the generation check on Kruonis fails in every year as it is (0.26–0.33 TWh).

**Refitted** (`refit.ts`, as in §6; the baseline 62.16 on the fit years, 64.02 crossed, breaches 8 / 7 / 9,
2025 54.11):

| Variant | Register | Fit years | Crossed | Breaches 2023 / 2024 | 2025: Σ MAE, breaches (reported) |
|---|---|---|---|---|---|
| One Δ of 90 for Kruonis | 35 / 92.5 / 222.5 / 242.5 | 60.18 | 61.11 | 8 / 5 | 52.92, 9 |
| Two equal shares, s = 60 | 22.5 / 187.5 / 277.5 / 297.5 | 60.62 | 61.98 | 7 / 4 | 55.14, 8 |
| Four equal shares, s = 30 | 37.5 / 90 / 180 / 220 | 59.31 | 60.56 | 8 / 5 | 51.35, 10 |
| Four equal shares, s = 45 | 15 / 80 / 230 / 270 | 59.04 | 60.06 | 7 / 6 | 52.06, 7 |
| The fleet's maximum, four equal shares, s = 30 | 10 / 55 / 112.5 / 182.5 | 59.39 | 60.34 | 8 / 8 | 51.11, 12 |
| Four units filled in order, s = 45 | 27.5 / 65 / 210 / 230 | 59.06 | 59.65 | 7 / 6 | 51.75, 13 |
| Four units in order, s fitted with the markup as a fifth coordinate | 22.5 / 127.5 / 232.5 / 252.5, s 90 | 60.14 | 61.64 | 7 / 4 | 52.08, 8 |
| One Δ fitted with the markup as a fifth coordinate | 37.5 / 192.5 / 292.5 / 312.5, Δ 92.5 | 61.67 | 64.32 | 8 / 5 | 57.07, 9 |

- A rising cost of Kruonis's power fits the fit years 3 €/MWh better than the register in force and
  crosses 3.5–4.0 better, well beyond the margin; one Δ for the plant gains half of it.
- How the week's power is shared matters for the tail: filled in order, the first two units carry
  333 MW at the plant's cost, the refit lowers the middle of the markup (65 against 147.5) and the
  top of the distribution goes with it (2024's share 3.2 points short again, 13 breaches in 2025);
  in equal shares a quarter of the week's power stands at each cost in every hour, 2024's share is
  met and 2025 keeps its distribution.
- Carried as a fifth coordinate of the descent the step ends where the path takes it: the fit years
  ask for 135 and 45 and their average fits neither (60.14 against 59.04 at 45); one Δ likewise
  (61.67 against 60.18 at 90). One step for both years, on a grid with the schedule refitted at each,
  is what `fit_markup.ts` does under D-115.

**Where the shares' gain comes from, and a better form.** Built and refitted (the production fit
chose 45 on the grid: 15 / 80 / 230 / 270, 59.04), the shares move the dear hours little when they
are chosen by the record's price (Lithuania above 250: −82.7 / −100.4 / −111.7 against −76.8 /
−105.2 / −111.6; `spikes/foresight/score.ts`) and gain most of the MAE in the cheap hours: a share
that cycles only on a wide spread hardly pumps, so the night's demand falls and the cheap hours'
price with it — Kruonis pumps 53–66 MW where Lithuania clears at or below 30 €/MWh, against 157–234
recorded and 142–176 before (`bias.ts`). That is a compensation, not the plant: the record pumps at
night as much as ever and spreads its output over the day. The average price falls with it, by
1.2–2.4 €/MWh in Latvia and Lithuania (2024: −5.8 against −4.6). Four stores with four reservoirs
are not the plant either.

The plant's own form is one reservoir, pumping at its cost, whose output in an hour costs more the
more of its power it uses: the first quarter of the hour's output at its cost, each further one s
more (`lp.ts dischargeSteps`, `strategic.ts segments`; the reference mirrors it). The programme then
spreads the water it has pumped over more hours at part load — what a price-maker weighing its own
output does, without cycling less. On the fit years at D-114's markup (`segment_grid.ts`): 60.13 at
s = 30 against the shares' 60.15 at 45, Kruonis pumping 108 MW in the cheap hours of 2024 against
the shares' 66 (record 223), 0.23 TWh against 0.15 (record 0.57). Refitted:

| Output steps | Register | Fit years | Crossed | Breaches 2023 / 2024 | 2025: Σ MAE, breaches (reported) |
|---|---|---|---|---|---|
| s = 30 | 20 / 110 / 210 / 230 | 60.09 | 61.55 | 7 / 4 | 51.54, 8 |
| s = 45 | 37.5 / 70 / 220 / 280 | 59.56 | 60.06 | 8 / 6 | 52.05, 9 |
| s = 60 | 32.5 / 80 / 220 / 260 | 59.51 | 60.33 | 8 / 5 | 51.42, 8 |

| Average bias, LV (2023 / 2024 / 2025), and Kruonis in 2025 | Bias | Pumping ≤ 30, MW (record 157) | Output > 250, MW (record 142) | TWh (record 0.48) |
|---|---|---|---|---|
| D-114 | −1.1 / −4.6 / +0.3 | 142 | 197 | 0.33 |
| Shares, s = 45 | −2.8 / −5.8 / −2.2 | 53 | 115 | 0.13 |
| Output steps, s = 60 | −1.9 / −5.1 / −1.2 | 83 | 121 | 0.19 |

On the fit years the output steps lie within the margin of the shares (59.51 against 59.04, crossed
60.33 against 60.06) and keep more of the plant's pumping — not all of it: a third of their gain on
the fit years comes in the cheap hours, where they pump 83–115 MW against 142–176 before and 157–234
recorded, the shares' compensation at about half its size — and half the shares' fall of the
average price: the form D-115 proposes, on the mechanism and the fit years. 2025, reported: the
shares break Estonia's share of dear hours there and the steps do not; this paragraph first named
that among the reasons, against the rule above (ERRATA E-145). The sums in this section are
`refit.ts`'s; the production fit's (59.55 and 60.34 at 45 and 60 crossed) differ in the second
decimal.

## 8. What is proposed

**D-115 (proposed):** Kruonis's output in an hour runs in four equal segments of its power, the
first at the plant's cost and each further one a step more (0 / 60 / 120 / 180 €/MWh at the step
kept), the step fitted with the markup on 2023–2024 — on a grid of 0, 15, 30, 45, 60 and 90 €/MWh,
the schedule refitted at each and the step whose register fits the two years best kept
(`app/scripts/fit_markup.ts`, its grid on worker threads). The production fit chose 60: the register
32.5 / 80 / 220 / 260 €/MWh, the step 60, Δ 71.5 (the grid 62.16 / 61.01 / 60.09 / 59.55 / 59.51 /
60.23 for 0 / 15 / 30 / 45 / 60 / 90; at 0 it returns D-114's register to the euro). The reference
LP runs the steps as the engine does (`make gap` 8 of 8 at 0.000).

| | Σ MAE 2023 / 2024 / 2025 / 2026 | Breaches 2023 / 2024 / 2025 | LT q99 2023 / 2024 / 2025 (record 250 / 300 / 313) | LV bias 2023 / 2024 / 2025 | Opening state, *Elering: gas* |
|---|---|---|---|---|---|
| D-114 | 27.71 / 34.45 / 54.11 / 34.37 | 8 / 7 / 9 | 244 / 256 / 293 | −1.1 / −4.6 / +0.3 | 84.8 / 81.1 / 81.1 |
| D-115 | 26.47 / 33.04 / 51.42 / 33.60 | 8 / 5 / 8 | 224 / 289 / 306 | −1.9 / −5.1 / −1.2 | 84.7 / 80.9 / 80.9 |

The MAE falls in every year 2020–2026; 2024's share of dear hours is met (2.3–2.5 points short);
2025 keeps its distribution (EE 2.5, LV 1.4, LT 1.4 points short; duration-curve RMSE 8.3–8.8). The
blind year still misses the MAE gate, by 1.6–3.0 (2.6–3.7 before). Chosen by the record's price the
dear hours barely move, as §1 expects (Lithuania above 250: −80.1 / −99.9 / −114.1 against −76.8 /
−105.2 / −111.6); chosen by the model's own, 2023's are right on average (+3.9; +36.6 before).
2026, opened here: 13.3 / 10.5 / 9.8 against 13.3 / 10.9 / 10.2.

**ERRATA E-144:** §7.3's reading of the dear hours (both binnings now), `setter.ts`'s test of a
store's limits, the specification's header.

## 9. What is left

- **The blind year's MAE** (18.0 / 16.8 / 16.6 against 15): the dear hours cannot close it alone —
  the other hours give about 14.5 €/MWh — and 2025's dear hours are a matter of timing (the model
  finds 107 of the record's 252 dearest hours).
- **The average price** falls with each MAE refit: the schedule is fitted on absolute errors, which
  a skewed price pays for in the mean. A fit that also weighs the mean or the tail is the owner's
  choice (R-VAL-2).
- **R-SUP-6's words against `applyMarkup`** (resolved 2026-10-11: revision 2.10 says what the code
  does, D-117, ERRATA E-147): the code splits what the floors leave of each gas offer;
  the words bin the fleet's utilisation. The literal reading fits the fit years 2.3 worse; the
  specification may rather say what the code does.
- **The top of the supply curve**: nothing between the dearest tranche (about 350 €/MWh) and shedding
  at 4 000 (`cliff.ts`). Nord Pool's aggregated curves would show what the market offers there; their
  history is paid (R-DATA-10: €430 a year for the Baltic cluster) and the collector holds October's
  first days. Worth asking for only if a later step needs that range.
- **Kruonis's step in a scenario**: a segment is a quarter of the hour's power — in a replay the
  week's, about 106 MW at the fit years' median (98 in 2025), in a scenario the plant's full output,
  166–187 MW for the fleets' 900–1 010 MW — so the step fitted on the replays holds a scenario's
  Kruonis back 35–45 % less per megawatt. Whether a scenario should keep Litgrid's two reserve units
  out of the day-ahead market, as the record's weekly power does, is the owner's question (D-073).
- **The step is weakly identified**: 45 and 60 fit the years within 0.04 (59.55 against 59.51), and
  the gain holds over 30–60; the grid picks, the data hardly choose.
- **The gate's figures hang on the step**: at 45 (within 0.04 of 60 on the fit years, better
  crossed) Latvia's 2024 share of dear hours is 3.02 points short and the breaches are 8 / 6 / 9; at
  30 they are 7 / 4 / 8 with Estonia's 2025 share 3.7 short. 2024's share met is the luck of the
  rule's choice, not a finding; 2025's ninth breach before, Latvian gas, passes at the band's edge
  (9.9998 % short).
- **The gain's make-up**: of the fit years' 2.65, 1.41 comes at 150–250 €/MWh, 0.96 at or below 30
  and 0.30 above 250 (Lithuania's recorded price; above 250 the sum loses 0.10 in 2023 and 0.33 in
  2025). The cheap hours' part rides on Kruonis pumping less than before and than the record. One Δ
  of 90, refitted, takes three quarters of the gain (60.18) with one number.
- **Kruonis's volume**: A75 may count the reserve units' activations, which nothing here measures;
  the record pumps 0.64–0.78 TWh a year, the model 0.21–0.25 (0.35–0.44 before D-115), and the
  generation check, which failed before D-115, misses by more (61–72 % short against 31–52 %).
  BTD's balancing activations (per zone, from 2025) could split the record's output into day-ahead
  and balancing energy.

## 10. The owner's decision

On 2026-10-11 the owner accepted D-115 ("I accept D-115, merge into main"; D-116): Kruonis's output
in steps of its power is in force with its register, revision 2.9 of the specification approved,
the golden fixture signed off, the branch merged into `main`; /v5 runs D-114 until a deploy is
asked for. The questions of §9 stay open.
