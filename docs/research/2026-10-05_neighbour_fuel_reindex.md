# The fuel behind TYNDP 2024's neighbour prices, and the profile on the scenario's own

*2026-10-05 (night) · executor · serves R-BND-5 (boundary price profiles), R-SMR-5 (hours with a
fossil price). Evidence for DECISIONS D-072 (proposed) and ERRATA E-064. Scripts:
`spikes/neighbour-fuel/`. The application's results change only if the owner accepts D-072's
item 1 or ticks the new box; E-064's correction moves one reported share.*

## Question

The neighbours' prices (Finland, SE4, Poland) are hourly outputs of ENTSO-E's market model. The
Baltic plants of a scenario pay ERAA 2025's prices of 2035: gas 38.2 €/MWh thermal, CO₂
197.5 €/t. Which prices did the market model's own plants pay, which of its hours do those
prices set, and can the profile be moved to the scenario's prices without modelling the
neighbours (R-BND-1)?

## Finding 1 — the market model burns a gas blend, not natural gas

The project held TYNDP 2024's price matrix (`fuel_paths`, `tyndp2024_matrix`): natural gas 6.29
and 5.65 €/GJ in 2030 and 2040, CO₂ 113.4 and 147 €/t. The methodology's fossil level (87.7
€/MWh, §10) and the owner's memo of 2026-10-05 took the natural-gas row for the gas behind the
profiles. It is not what the model's plants burn. The final supply inputs (the workbook *Final
Supply Inputs for TYNDP 2024 Scenarios*, 2023-11-03, sheets 3.1 and 3.2) give them a blend of
natural gas, biomethane and synthetic methane, priced per scenario, and the CO₂ factor of gas is
scaled by the blend's fossil share (the CO₂-factor workbook: 51.57 kg/GJ in National Trends 2030
= 57 × 0.9048):

| | 2030 | Distributed Energy 2040 | Global Ambition 2040 |
|---|---|---|---|
| Gas blend, €/GJ | 7.50 | 10.86 | 9.79 |
| Fossil (methane) share | 0.905 | 0.610 | 0.682 |
| CO₂, €/t | 113.4 | 147 | 147 |

For 2035, the midpoint (ACER's Opinion 05/2024 notes that the 2035 data are an average of 2030
and 2040): Distributed Energy 9.18 €/GJ = 33.0 €/MWh thermal at a fossil share of 0.757, CO₂
130.2 €/t. So the neighbours' gas is 13 % cheaper than the Baltic plants' (33.0 against 38.2),
not 44 % (21.5); the larger part of the difference is CO₂: 130 €/t on three quarters of the gas
against 197.5 €/t on all of it. A gas plant of 60 % efficiency costs 90 €/MWh on the model's
prices and 133 on the scenario's.

The Scenarios Methodology Report (final version, January 2025, §14.2.1, p. 73) prints the same
shares with the columns of Distributed Energy and Global Ambition exchanged; the workbook's
assignment is the one the outputs confirm (below).

TYNDP 2026's National Trends+ differs: its CO₂ price of 2035 is 197.5 €/t, ERAA 2025's own, and
its gas blend 9.42 €/GJ at a fossil share of 0.851 (the workbook *TYNDP2026Scenarios_Fuel_CO2_
Prices*, cached, not in the database). Its contradiction with the Baltic side is small.

## Finding 2 — electrolysers set most of the neighbours' hours, at the price of hydrogen from gas

The archives of Distributed Energy and Global Ambition carry the model's hydrogen outputs
(`MMStandardOutputFile_…_H2_v11_SoS.xlsb`, sheet *Hourly H2 Data*): each hydrogen zone's hourly
marginal cost. `spikes/neighbour-fuel/evidence.py` sets them beside the electricity prices of
climate year 2009 (`evidence.txt`).

1. **The reformer.** Where a steam methane reformer is always marginal (Estonia's zone 1), the
   hydrogen marginal cost is one number all year: 73 €/MWh in Distributed Energy 2035, 72 in
   Global Ambition 2035, 79 in Distributed Energy 2040 (its mode). The reformer's cost on the
   blend — heat rate 4.74 GJ per MWh of hydrogen, 3.38 €/MWh of other cost (*SMR Figures*, the
   same for Finland, Sweden, Poland and the Baltic states, without CCS), CO₂ on the fossil share
   — is 73.5, 72.2 and 79.1. On the natural-gas row it would be 66.
2. **The synthetic fuel.** In the hydrogen market (zone 2) the marginal cost stands for
   thousands of hours near 94 €/MWh in 2035 and 90 in 2040: the import price of synthetic fuel
   (131.28 and 124.66 €/MWh, *Synthetic Fuel Generators Properties*) times the 0.72 MWh of fuel
   a MWh of hydrogen makes — 94.5 and 89.8.
3. **The electrolyser.** Hour by hour the electricity price follows the hydrogen marginal cost:
   in Finland, price = 0.71 × H₂ − 5.0 (zone 1) and 0.68 × H₂ − 3.2 (zone 2) in Distributed
   Energy 2035; the inputs give the electrolyser an efficiency of 0.70 and a figure of 4 in the
   next column (*Investment Datasets*, `GENERATOR.xlsx`, headed "OPEX[€/MW/a]"; read here as a
   charge per MWh of electricity, which is what the regression shows — 2 to 10 €/MWh across
   zones and years).
4. **How many hours.** Of the hours above 5 €/MWh, those on the electrolyser's relation:

| Distributed Energy 2035, climate year 2009 | Finland | SE4 | Poland |
|---|---|---|---|
| Hours at or below 5 €/MWh | 1 092 | 1 174 | 1 170 |
| Hours above 5 €/MWh | 7 644 | 7 562 | 7 566 |
| of which on the electrolyser's relation | 6 781 (89 %) | 4 590 (61 %) | 2 757 (36 %) |

The Methodology Report describes the mechanism (§9.3.1, p. 54: electrolysers at existing
hydrogen consumers run on "cut-in/cut-out dynamics based on the price of hydrogen from the
SMR/ATR plant"; p. 55: the reformer's cost depends on the natural-gas price and the CO₂ price).

So the profile's hours stand on four steps that the gas and CO₂ prices move, or do not:

| Step (Distributed Energy 2035) | Electricity price, €/MWh | Moves with gas and CO₂ |
|---|---|---|
| Wind, solar, must-run | 0–5 | no |
| Electrolysers displacing reformer hydrogen | 0.70 × 73.5 − 4 = 47.5 | yes, through the reformer |
| Electrolysers displacing imported synthetic fuel | 0.70 × 94.5 − 4 = 62.2 | no |
| Gas plants, 60 % to 35 % efficient | 90.4 to 153.8 | yes |
| Demand response and scarcity | from 500 (D-007) | no |

The histogram of the published prices has its masses where the table says: 40–48, 58–62, 86–96
€/MWh, and Poland's coal and peaking plants at 118–128.

## The map (D-072)

On the scenario's prices (ERAA 2025's of 2035, all of the gas paying for CO₂) the same steps
cost: reformer hydrogen 0.70 × 107.0 − 4 = 70.9; synthetic fuel 62.2, unchanged; gas plants
132.8 to 226.5. The reformer's hydrogen is now dearer than the synthetic fuel, so the two steps
change places: with little surplus the electrolysers displace the reformer first (70.9), with
more they also make synthetic fuel (62.2). The steps of the two price sets are therefore paired
in order of cost, and a price between two steps moves in proportion:

| Published | 0 | 47.5 | 62.2 | 90.4 | 153.8 | 500 and above |
|---|---|---|---|---|---|---|
| Re-priced | 0 | 62.2 | 70.9 | 132.8 | 226.5 | as published |

Global Ambition 2035: 46.6 → 62.2, 62.2 → 70.9, 88.8 → 132.8, 151.0 → 226.5.

What the map is not: a second dispatch. The hours on each step are the market model's; dearer
gas would in fact shift some hours between steps (more electrolysis hours cut out, less gas
burnt), and the neighbours' fleets — 15 GW of electrolysers in Finland in Distributed Energy
2035 — stay TYNDP's. Coal and oil plants between the gas steps (Poland, about 3 TWh of 200) move
as gas does; on ERAA's prices coal would rise by a factor 1.62 where gas rises by 1.47.

## Results

The neighbours, weighted over the three climate years (Distributed Energy 2035):

| €/MWh | Finland | SE4 | Poland |
|---|---|---|---|
| Published mean | 39.9 | 45.9 | 57.2 |
| Re-priced mean | 50.7 | 60.2 | 78.6 |
| Ratio | 1.27 | 1.31 | 1.37 |
| P5 / P50 / P95, climate year 2009, published | 0 / 48 / 65 | 1 / 49 / 107 | 0 / 57 / 134 |
| re-priced | 0 / 62 / 77 | 1 / 63 / 157 | 0 / 68 / 197 |

Poland's 78.6 lies in Svenska kraftnät's range for 2040 (77.8–83.6, R-BND-5), and its ratio is
the specification's slow-build factor of 1.4 reached from another side.

The opening state's four scenarios (`headline.ts`; EE / LV / LT, €/MWh), as measured before the
calibration round of the same night (D-073), which lowers every row by about one euro
(*Elering: gas* 55.9 / 44.6 / 44.6 published, 70.1 / 56.9 / 56.9 re-priced; *2 SMR* 44.2 / 41.4 /
41.5 and 55.7 / 53.9 / 54.0):

| | Published | Re-priced | One level factor per zone of the same mean (1.27 / 1.31 / 1.37) |
|---|---|---|---|
| *Elering: gas* | 56.9 / 45.5 / 45.6 | 72.1 / 58.2 / 58.2 | 71.6 / 58.0 / 58.1 |
| *1 SMR* | 51.4 / 43.2 / 43.2 | 65.4 / 55.8 / 55.9 | 64.9 / 55.6 / 55.6 |
| *2 SMR* | 44.5 / 41.7 / 41.7 | 56.5 / 54.3 / 54.4 | 56.3 / 54.1 / 54.2 |
| *3 SMR* | 36.7 / 40.7 / 40.8 | 46.1 / 53.3 / 53.4 | 46.4 / 53.1 / 53.2 |
| Two units lower Estonia's price by | 12.4 | 15.6 | 15.3 |
| Estonia's P95 − P5, *Elering: gas* | 140 | 180 | 172 |
| Baltic gas output, *Elering: gas*, TWh | 1.61 | 1.86 | 1.77 |

Two readings. The mean of a re-priced run is close to that of a plain multiplier of the same
mean, because in this market model even the middle hours are indexed to gas, through hydrogen;
what the map adds is the derivation — 1.27, 1.31 and 1.37 are computed from the two price sets,
not chosen — and the shape: zero hours and scarcity hours stay, the gas hours rise by 47 %, the
electrolyser hours by 14–31 %. And the size is large: fifteen euros on Estonia's mean price,
three more on the effect of two units. It is the consequence of holding the neighbours to
197.5 €/t of CO₂, ERAA 2025's price, the one TYNDP 2026 also took.

## The hours with a fossil price (E-064)

The level from which a neighbour's price counts as fossil was a combined-cycle plant of 56 %
on the natural-gas row, 87.7 €/MWh. On the blend the market model's best gas plant costs 90.4
(Distributed Energy 2035). `fossil.ts`: Estonia's share of hours with a fossil price is 8.2,
6.8, 4.3 and 1.9 % for the four scenarios, against 9.4, 7.6, 4.9 and 2.3 %. Re-priced (level
132.8): 7.6, 6.3, 3.8 and 1.6 %. The share counts gas plants only; the hours in which a
neighbour's electrolyser prices at the cost of hydrogen from gas are indexed to gas and CO₂ as
well and are not in it.

## Not done

- National Trends (TYNDP 2024) and National Trends+ (TYNDP 2026) have no map: their hydrogen
  outputs were not read. The observed prices of 2025 have none either: the middle of an
  observed price curve is hydro and nuclear, which no cost formula moves (the memo's backtest).
- The 2050 profiles: there the reformer is already dearer than the synthetic fuel (90.5 against
  75.0) and Estonia's zone 1 is no longer at one number; the map is computed in the same way and
  rests on thinner evidence.
- The memo of 2026-10-05 (`2026-10-05_neighbour_price_uplift_memo.pdf`, not committed) states
  TYNDP's gas at 6.3 and 5.65 €/GJ and a gas-plant cost of 88 → 141 €/MWh. With this note its
  figure 2 and its table of section 6 are superseded: the gas is the blend, the cost 90 → 133,
  and the "middle band" is no longer a judgement.
