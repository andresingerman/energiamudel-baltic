# The three climate years: how ENTSO-E chose 1995, 2008 and 2009, what they hold, what the model reads

*2026-10-06 · executor · at the owner's instruction ("do research on how the climate years 1995, 2008, 2009 were chosen and why exactly these years; what data by year are given and what data we use in our model"). Evidence for DECISIONS D-084 (the Weather page, R-APP-13)
and the documentary rows `climate_year.*` added that day. Documents read: the three registered
on this date (`tyndp2022_sbg`, `tyndp2022_iosn_ig`, `tyndp2024_methodology`) and the two already
cached (`tyndp2024_ig`, `tyndp2024_ig_opinion`); pages are PDF pages of the cached files.*

## 1. Where the three years come from

The years are not the project's choice. They are ENTSO-E's, made once for TYNDP 2022 and
carried unchanged into TYNDP 2024, whose market-model outputs give the neighbours' prices the
scenario runs take (R-BND-5). Every TYNDP 2024 market simulation of Distributed Energy and
Global Ambition exists for exactly these three years and no other (`tyndp_price`: 3 climate
years per scenario and target year; National Trends for 2009 alone), so a run of the TYNDP 2024
family can be weather-coherent — the same year's wind, solar, demand shape and neighbours'
prices — only on 1995, 2008 or 2009 (D3, R-TIME-2).

**What the guidelines say.** TYNDP 2024 Implementation Guidelines, version for ACER's opinion,
p. 12: "Three climate years have been selected based on their representativeness out of 35
climate years within the Pan-European Climate Database (PECD). The results from market
simulations are then considered based on the weighted average from these three climate years.
The weighting is as follows: 0.233 for 1995, 0.367 for 2008 and 0.4 for 2009." The draft of
March 2024 adds (p. 31) that "the climate year 2009 is the most representative climate year",
the one a project assessment must use at the least.

The TYNDP 2024 Scenarios Methodology Report (final, January 2025, §4.1, p. 30) describes the
selection and refers for its method to "Section 6.3 of the TYNDP 2022 IoSN Implementation
Guidelines": residual load per region and hour; delta indicators against the 30-year average;
"Candidate combinations are filtered to represent the aggregate distribution, evaluating them
based on Euclidean distance. The best candidates are then chosen through K-Medoids clustering
score, ensuring representation and diversity within the selection. The result of this analysis
identifies the years 1995, 2008, and 2009 as the most representative climate years, with the
following weights: 23 %, 37 % and 40 %, respectively." The same text, nearly word for word, is
§4.1 of the TYNDP 2022 Scenario Building Guidelines (October 2021, pp. 20–21): the selection was
made for TYNDP 2022 and TYNDP 2024 reused it.

## 2. The method (TYNDP 2022 IoSN Implementation Guidelines, §6.2–6.3, pp. 42–47)

ENTSO-E took for the system-needs study "a similar approach for the definition of the climatic
years for the study as the one used in the Bidding Zone Review process", whose rules (ACER's
bidding-zone-review methodology, Art. 4.4) ask the TSOs to "jointly select three reference
climate years … among the thirty most recent available climate years", with equal weights
unless justified otherwise.

1. *Input.* Four variables per bidding zone and hour: solar infeed and wind infeed (PECD load
   factors times the 2025 capacities of the 2020 PEMMDB), demand (the MAF 2020 profiles) and
   hydro (yearly inflow of the PEMMDB spread over the hours in proportion to net load). Thirty
   climate years, **1987 to 2016**: "Even though data for the period 1982–1986 are available,
   the methodology requires to consider only a 30 years dataset" (p. 42, footnote 3). The 2024
   guidelines' "out of 35" counts the years PECD then held; the selection itself ran on 30.
2. *Residual load.* Per zone and hour, load less solar, wind and hydro; summed into nine macro
   regions (Baltic is one of them), "as an aggregation on European level leads to statistical
   smoothing of variability" (p. 45).
3. *Delta indicators.* For every combination of three years out of thirty — 4 060 of them
   (p. 46) — the mean and the standard deviation of the combined residual-load distribution per
   region, less those of all thirty years; standardised, and weighted by the region's share of
   European load.
4. *Two-step choice.* The combinations closest to the aggregate distribution in the 18
   dimensions (two indicators × nine regions, Euclidean distance) — "the highest 1 %" (p. 47; the
   text prints 4 600 for 4 060) — are kept as preferred candidates; among them the one with the
   best K-Medoids clustering score (the three years as medoids, k = 3, each year assigned to the
   nearest) is chosen, "to be not too close to the centre — 'mild' or too close to the
   edges — 'extreme'".
5. *Weights.* The guidelines give the weights without the formula; the Scenario Building
   Guidelines say they are "calculated based on the Pan European Climate Database … according to
   their representativeness in terms of the solar infeed, wind infeed, hydro inflows and load
   parameters" (p. 21). With the medoid reading, a year's weight is the share of the thirty years
   its cluster holds: 0.233, 0.367 and 0.400 are 7, 11 and 12 years of 30 — an interpretation,
   not a quotation; TYNDP 2026 states the same rule for its weather scenarios (below).

**Stress.** The Scenario Building Guidelines' Table 20 (p. 39) ranks the thirty years by their
most stressful two-week Dunkelflaute at European level (highest residual demand, December to
February): 2012 ranks 1 in every horizon, 2009 ranks 2, 1995 ranks 5 (4 for 2040 and 2050), 2008
ranks 24. The Methodology Report (§14, p. 60): "Among the 3 most representative climate years
(1995, 2008 and 2009) … 1995 and 2009 represent the most stressful situation (2009 second after
2012 the most stressful of the last 30 years) … 1995 appears as the most stressful climate year
for the COP21 scenarios." Expansion modelling in the Distributed Energy and Global Ambition
scenarios ran on 2009 alone; the dispatch on all three (Methodology Report §4.1).

## 3. The years in the Baltic states (the project's data; `presets.json` `climate_years`)

PECD edition 2023.2 holds 38 climate years, 1982–2019, for every zone; the figures below are the
mean capacity factors at the PECD target year 2030 (R-TIME-4's convention), the National Trends
2030 demand profile's peak, TYNDP 2024's hydro inflow at the 2030 layout, and the ERA5 year
(Open-Meteo) the engine takes for temperature.

| | 1995 (w 0.233) | 2008 (w 0.367) | 2009 (w 0.400) | the 38 years |
|---|---|---|---|---|
| EE onshore wind CF (rank of 38, 1 = lowest) | 0.283 (36) | 0.285 (37) | 0.213 (1) | 0.213–0.305 |
| EE offshore wind CF | 0.551 | 0.528 | 0.474 | 0.444–0.570 |
| EE solar CF (rank) | 0.111 (16) | 0.106 (2) | 0.111 (15) | 0.105–0.125 |
| EE demand peak, MW (rank) | 1 685 (4) | 1 721 (6) | 1 816 (21) | 1 620–2 159 |
| LV onshore wind CF | 0.246 | 0.253 | 0.198 | 0.194–0.272 |
| LT onshore wind CF | 0.434 | 0.445 | 0.369 | 0.357–0.460 |
| Daugava inflow, TWh (TYNDP 2024 as published; the engine takes 1.95 ×, D-070) | 1.37 | 1.73 | 1.60 | 0.55–2.21 (1982–2017) |
| Lithuanian run-of-river inflow, TWh | 0.57 | 0.53 | 0.52 | 0.42–0.70 |
| EE temperature, ERA5: mean / coldest hour, °C | 6.2 / −19.4 | 7.2 / −10.9 | 6.0 / −20.2 | — |

Two things the table says. The three years were chosen for Europe's residual load, not for
the Baltic states: for Estonia 1995 and 2008 are the two windiest years of the 38 but one
(ranks 36 and 37) and 2009 the calmest of all (rank 1), so the set spans the wind extremes
and leaves the middle to the weights; 2008 is the second-dullest solar year. And the demand
profiles differ only in shape: the National Trends energy is the same in every climate year
(Estonia 10.0 TWh at 2030 in all 38); the climate year moves the peak (1 620–2 159 MW for
Estonia) through the temperature the profile was built on.

## 4. What each climate-year file holds and what the engine reads (`years/cy<year>.json.gz`)

| Series | Source and climate years available | What the engine does with it |
|---|---|---|
| `zones.<z>.cf.wind_onshore / wind_offshore / solar` (target years 2030, 2040) | PECD 2023.2, `pecd_profile`, 38 years | capacity × factor, hour by hour (R-SUP-2); the fleet of 2035 reads the 2030 layout; OPEN-2's correction is the default none |
| `zones.<z>.demand.nt_profile` (2030, 2040) | TYNDP 2024 Demand Profiles, National Trends, `demand_profile`, 38 years | the shape of the year; the scenario's annual energy (Elering S1, ERAA) scales it (R-DEM-1) |
| `zones.LV.hydro_weekly_mwh.daugava`, `zones.LT.hydro_weekly_mwh.ror` | TYNDP 2024 Hydro Inflows, `hydro_inflow`, 36 years (1982–2017) | the Daugava's weekly water, times 1.95 (D-070), released inside the record's band (D-071); Lithuania's run-of-river as given output |
| `zones.LV.hydro_weekly_max_mw.daugava` | the same workbook's "maximum generating power" | kept, not read: it is no limit (D-070, ERRATA E-063) |
| `zones.<z>.temperature_c` | ERA5 through Open-Meteo, `weather`, the calendar year itself | the CHP floors (R-SUP-5) |
| `boundary.<k>.DE_2035 … GA_2050` | TYNDP 2024 market-model outputs, `tyndp_price`, **these three years only** | the neighbours' hourly prices (R-BND-5), re-priced by default (D-079) |
| `boundary.<k>.REAL_2025` | the observed prices of 2025 at the cables (D-051, D-075, D-076) | a what-if on the neighbours; not weather-coherent with the climate year |
| `meta.weight`, `meta.labels` | the IG's weights; the ranks of R-TIME-4 | the weighted set; the labels of the year chips |

Not taken from the package: PECD's temperature (the ERA5 year stands in, D-015 for the 2026
family), the 35 other PECD years for wind and solar (no market-model prices exist for them,
so a run on them could not be weather-coherent at the borders), the "Other RES" and "Other
non-RES" climate dependence the IG mentions (the Baltic classes it would touch are given
output in the model).

## 5. The TYNDP 2026 family, for contrast

TYNDP 2026 does not pick historical years. Its PECD 4.2 holds projected climate (CMIP6,
SSP2-4.5) from three climate models, ten years each around every target year — 30 candidate
weather scenarios per target year — and reduces them to three by a related method: six
technologies' mean and variability anomalies per macro region, z-scored, a principal
component of each, k-means with k = 3, the scenario nearest each cluster's mean as its
representative and the cluster's share of the 30 as its weight (TYNDP 2026 Scenarios Methodology
Report, pp. 76–80, Tables 34 and 36). For 2035 the set is WS032, WS037 and WS059 with weights 0.24, 0.43
and 0.33 (R-TIME-3). The reduction is the same idea — three representatives and weights from
cluster sizes — on projected rather than observed weather.

## 6. What the owner should know

- The weights are European. A Baltic-only selection on the same method could land on other
  years; the project keeps ENTSO-E's because the neighbours' prices exist for those alone.
- 2009, the heaviest weight, is Estonia's calmest wind year of the 38 and Europe's second most
  stressful Dunkelflaute year; the Estonian 2035 price of climate year 2009 is the highest of
  the three in every scenario (81.5 against 68.8 and 65.6 €/MWh in *Elering: gas* on the
  register of D-079). The weighted figure, not a single year's, is the result (O-6, R-TIME-4).
- The selection's candidate set is reported as 30 years (1987–2016) in the method's own
  document and as 35 in the 2024 guidelines; the project's PECD copy holds 38 (1982–2019).
- A reader of the Weather page sees the three years' place among all 38 for each zone, the
  method in ENTSO-E's words, and the table of §4; the page is `app/src/ui/weather.ts`.
