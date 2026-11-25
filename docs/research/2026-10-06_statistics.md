# Ten years of fuel prices and of wind and solar build-out: sources, method, what the lines say

*2026-10-06 · executor · at the owner's instruction ("add a Statistics tab at the top: the gas price over the last 10 years and a trend line and an extrapolation to the years 2035 and 2040; the CO₂ price …; the commissioning of new wind capacities (onshore and offshore separately) and solar capacities by year in EE, LV, LT, FI, SWE, PL over the last 10 years and a trend line and an extrapolation to the years 2035 and 2040 if the pace is kept … first do a study"). Evidence for DECISIONS D-087 and the Statistics
page (R-APP-14, `app/src/ui/statistics.ts`). The owner chose, when asked: both readings of the
capacity (the additions' trend goes on; the pace of 2021–2025 holds) and both lines for the prices
(least squares; Theil–Sen).*

## 1. Sources

| Series | Source | Window | Lineage |
|---|---|---|---|
| TTF gas, €/MWh of gas | World Bank Pink Sheet, monthly "Natural gas, Europe", US dollars per MMBtu, at the ECB's monthly dollar rate; 1 MMBtu = 1 055.056 MJ (NIST SP 811) | Sep 2016 – Aug 2026, 120 months: the last month of the Pink Sheet vintage of September 2026 and the 119 before | `worldbank.cmo_monthly.ALL.2026-09`, `ecb.exr.USD-EUR.M.2026-09`, `doc.nist_sp811.p-45-b-8` |
| EU ETS allowance, €/t | EEX primary auctions, the month's mean clearing price (a day with several auctions counts once, at their mean) | Jan 2017 – Aug 2026, 116 months | `eex.eua_auction.EU.2017` … `2026` |
| Installed capacity, MW at year end | IRENASTAT, table `Country_ELECSTAT_2026_H2_PX.px` (updated 2026-09-28): onshore wind, offshore wind, solar photovoltaic, all grid connections | 2015–2025 for EE, LV, LT, FI, SE (the whole country), PL | `irena.capacity.Country_ELECSTAT_2026_H2` |

*EEX.* The public directory `public.eex-group.com/eex/eua-auction-report/` lists one workbook per
year from 2017 to 2026 (read 2026-10-06); nothing earlier is published there, so the CO₂ series has
116 months, not 120. The reports of 2017–2019 are `.xls` (the project now reads them with `xlrd`)
and have no status column: an auction with a clearing price counts, as one with status
"successful" does from 2020 on.

*IRENASTAT* is the database behind IRENA's *Renewable capacity statistics 2026* (already cached,
`doc.irena_capacity_2026`): the PxWeb API answers a JSON selection with CSV (`pipeline/sources/
irena.py`). Its figures equal the PDF's (Estonia's onshore wind 705 MW, Lithuania's solar 3 295 MW
at the end of 2025). IRENA's notes flag each figure as official ("o"), unofficial — industry
associations, news — ("u") or IRENA's estimate ("e") (RCS 2026, PDF p. 7); most Baltic figures carry
"u". Licence: material may be used freely, attributed to IRENA with the copyright notation
(© IRENA 2026); the page says so.

A cell IRENASTAT prints as ".." is read as 0 MW: for these three technologies it is a country
without the plant, and Eurostat gives 0 for the same cells.

## 2. IRENA against Eurostat and the national counts

*Eurostat* (`nrg_inf_epcrw`, net maximum electrical capacity, read 2026-10-06, years 2015–2024)
gives the same figures for Estonia's wind, all of Latvia, Lithuania's wind, Sweden's wind and
Poland's wind. Where they differ by more than 0.5 %:

| Series | Eurostat | IRENA |
|---|---|---|
| LT solar | 160 / 251 / 567 / 1 159 / 2 404 (2020–2024) | 244 / 422 / 738 / 1 330 / 2 575 |
| FI onshore / offshore | offshore 73 MW from 2017, onshore 41 MW less | offshore 32 MW throughout |
| FI solar | 2–6 % higher | — |
| PL solar | 7 416 / 12 170 / 17 510 (2021–2023) | 7 091 / 11 063 / 15 917; equal in 2024 (21 721) |
| SE solar | 1 % lower (2019–2022) | — |

*National counts for 2024–2025* (read 2026-10-06):

| | National count | IRENA |
|---|---|---|
| EE wind, end of 2024 | 694 MW — [Elering, 30 Jan 2025](https://elering.ee/en/article/both-solar-and-wind-energy-production-exceeded-one-terawatt-hours-last-year) | 693 |
| EE solar, end of 2024 | 1 210 MW — Elering, same article | 877 |
| EE solar, 2025 | +105 MW, about 1 430 MW at the end of 2025 — Eesti Taastuvenergia Koda via [pv magazine, 4 Mar 2026](https://www.pv-magazine.com/2026/03/04/estonia-deploys-105-mw-of-solar-in-2025/) | +107, 984 |
| FI wind, 2025 | +1 023 MW, 9 433 MW at the end of 2025 — [Suomen uusiutuvat, 8 Jan 2026](https://suomenuusiutuvat.fi/suomeen-rakennettiin-yli-1-000-megawattia-uutta-tuulivoimaa-kapasiteetti-lahes-9-500-mw/) | +1 023, 9 383 (onshore and offshore) |
| SE wind, 2025 | 1.4 GW commissioned, just over 1 GW of it in the fourth quarter — [Green Power Sweden, 19 Feb 2026](https://greenpowersweden.se/statistik/statistik-och-prognos-fjarde-kvartalet-2025/) | +562 MW |
| LT solar, 2025 | about 600 MW added, 3 040 MW at the end of 2025 — IEA PVPS via [pv magazine, 30 Mar 2026](https://www.pv-magazine.com/2026/03/30/lithuanias-solar-capacity-surpasses-3-gw/) | +720, 3 295 |
| PL solar, 2025 | +3.6 GW, 24.8 GW (ARE) or 25.5 GW (PSE) at the end of 2025 — [pv magazine, 24 Feb 2026](https://www.pv-magazine.com/2026/02/24/poland-adds-3-6-gw-of-solar-in-2025/) | +3 700, 25 421 |

Two series run low in IRENA: Estonia's solar (Statistics Estonia, which IRENA and Eurostat follow,
counts about a third less than Elering's connections) and Sweden's wind of 2025 (the fourth
quarter's commissioning is mostly not in IRENA's year). The page says so in words; its lines are
IRENA's, one source for all six countries.

## 3. Method (the page computes it; `app/src/ui/statistics.ts`, tested in `app/test/statistics.test.ts`)

- *Prices.* Each month at its middle as a decimal year. Least squares: the line nearest every
  month in squared distance, with R², the share of the months' variance it explains. Theil–Sen:
  the median of the slopes between every two months, through the median of what is left; the
  spike of 2022 moves it little. A year's value of a line is its value at the year's middle (the
  line's mean over the year). Beside the lines: the fuel paths the project holds — ERAA 2025
  (2030, 2035; the scenario's prices), TYNDP 2024 (2030, 2040) and Svenska kraftnät's LMA 2026
  (2030, 2040).
- *Capacity.* Net additions: each year-end less the year before (2016–2025, ten values; a year
  that retired more than it built is negative). The least-squares line through the ten values,
  carried to 2040. Two readings of the installed capacity at the end of 2035 and 2040: *trend* —
  each year from 2026 adds the line's value for it, nothing where the line is below zero; *pace* —
  each year adds the mean of 2021–2025, the build rate R-SUP-9's slow-build sensitivity reads from
  IRENA for onshore wind (Estonia: 77.6 MW a year, the same figure). Beside them the model's
  assumptions: Estonia, Latvia, Lithuania 2035 — the scenario view's fleets (Elering and TalTech's
  S1 for Estonia, ERAA 2025 National Trends for Latvia and Lithuania); 2040 — TYNDP 2024 National
  Trends (the only TYNDP 2024 fleet the export holds for them); Finland and Poland — TYNDP 2024
  Distributed Energy, the neighbours' default profile; none for Sweden (TYNDP's zone is SE4).

## 4. What the lines say

| Prices | 2030 | 2035 | 2040 |
|---|---|---|---|
| Gas, least squares (+4.37 €/MWh a year, R² 0.11) | 77.8 | 99.7 | 121.5 |
| Gas, Theil–Sen (+3.19 a year) | 57.8 | 73.8 | 89.7 |
| Gas, ERAA 2025 · TYNDP 2024 · SvK LMA 2026 | 34.6 · 22.6 · 23.5 | 38.2 · – · – | – · 20.4 · 27.4 |
| CO₂, least squares (+9.13 €/t a year, R² 0.78) | 128.5 | 174.1 | 219.7 |
| CO₂, Theil–Sen (+8.60 a year) | 118.7 | 161.7 | 204.7 |
| CO₂, ERAA 2025 · TYNDP 2024 · SvK LMA 2026 | 97.5 · 113.4 · 136.9 | 197.5 · – · – | – · 147.0 · 145.6 |

The last twelve months average 41.3 €/MWh for gas and 77.7 €/t for CO₂. The gas lines rise
because the decade starts at the lows of 2016–2020 (annual means 9.6–22.3 €/MWh) and holds the
crisis of 2022 (132 €/MWh); least squares explains a ninth of the months' spread. The CO₂ line
fits well (R² 0.78) and lands near ERAA 2025's path in 2035 and above TYNDP's and Svenska
kraftnät's in 2040.

| Capacity, MW | end of 2025 | pace 2021–25 a year | 2035 trend · pace | 2040 trend · pace | the model 2035 · TYNDP 2024 2040 |
|---|---|---|---|---|---|
| EE onshore wind | 705 | 78 | 2 681 · 1 481 | 4 258 · 1 869 | 1 244 · 861 |
| EE solar | 984 | 155 | 3 741 · 2 537 | 5 787 · 3 314 | 1 785 · 1 360 |
| LV onshore wind | 133 | 11 | 326 · 243 | 471 · 298 | 644 · 352 |
| LV solar | 922 | 183 | 5 529 · 2 757 | 9 214 · 3 674 | 1 360 · 336 |
| LT onshore wind | 2 510 | 394 | 11 723 · 6 450 | 19 007 · 8 420 | 5 520 · 5 430 |
| LT solar | 3 295 | 610 | 17 986 · 9 396 | 29 629 · 12 447 | 5 000 · 5 600 |
| FI onshore wind | 9 351 | 1 359 | 32 257 · 22 945 | 49 159 · 29 742 | 46 000 · 60 227 |
| FI solar | 1 566 | 253 | 6 890 · 4 099 | 10 968 · 5 366 | 21 265 · 40 295 |
| SE onshore wind | 17 188 | 1 483 | 35 942 · 32 017 | 48 008 · 39 431 | – |
| SE solar | 5 500 | 875 | 22 589 · 14 252 | 35 519 · 18 628 | – |
| PL onshore wind | 10 602 | 861 | 23 195 · 19 209 | 32 070 · 23 512 | 29 500 · 40 000 |
| PL solar | 25 421 | 4 353 | 114 986 · 68 951 | 183 860 · 90 716 | 36 740 · 65 000 |

Offshore wind: none of the six countries added any in 2016–2025 (Finland's 32 MW and Sweden's
193–213 MW are older farms; Sweden's two steps of −10 MW are retirements), so both readings stay
near today's capacity (Sweden's trend reading drifts to 221 MW in 2035 only because the line
through two retirements and eight zeros rises above zero after 2025, and the floor keeps the
positive years); the model's offshore — Latvia 1 000 MW and Lithuania 1 400 MW in 2035, Finland 3 600 MW and
Poland 9 380 MW in TYNDP 2024 Distributed Energy 2035 — is capacity the statistics cannot show yet.

Read across: the core zones' scenarios of 2035 sit *below* the pace of the last five years for
Estonia's wind and solar, Latvia's solar and Lithuania's wind and solar, and above it only for
Latvia's onshore wind; Finland's onshore wind in TYNDP 2024 Distributed Energy (46 GW in 2035)
is above even the trend reading (32 GW), Poland's solar there (37 GW) below even the pace
(69 GW). Least squares through ten years of additions that grew from nearly nothing makes the
trend reading grow fast where a market took off late (Lithuania's and Poland's solar), and neither
reading knows saturation, grids, subsidies or the pipeline (the research note of 2026-09-24, §2).

## 5. Limits

- A straight line through ten years is arithmetic on the past, not a forecast; the page and the
  method section say so.
- Ten values of additions are few; the trend reading leans on the last years, the pace reading
  ignores acceleration and slowdown alike.
- IRENA's latest year is partly unofficial or estimated; Estonia's solar and Sweden's wind of 2025
  run low against the national counts (§2).
- Sweden is the whole country; SE4, the model's neighbour, is its southern part.
- The CO₂ series starts in January 2017 (§1).

## 6. Added on 2026-10-07 (D-092, D-093)

- **Sweden's own count.** Energimyndigheten's official wind statistics by bidding area (PxWeb
  EN0105_2, updated 2026-04-15) give Sweden 18 127 MW of wind at the end of 2025, 1 307 MW added
  in the year — against IRENA's 17 381 and 562; SE4 holds 2 577 MW (2 444 a year before). The
  industry's 1.4 GW of 2025 (§2) is Sweden's own figure within rounding; IRENA's 2025 is short of
  the fourth quarter's commissioning.
- **SE4 read as the countries are.** 186 MW a year in 2021–2025; 4 432 MW in 2035 and 5 359 in 2040
  at that pace, 5 001 and 6 710 by the trend of the additions; TYNDP 2024 Distributed Energy has
  7 450 and 16 700 MW of SE4 wind (onshore and offshore).
- **The zones' prices.** ENTSO-E's monthly day-ahead prices, September 2016 – August 2026 (Poland
  from December 2019: its prices are in złoty from March 2017 to November 2019, and its euro
  prices before that miss too many hours for a month to count, ERRATA E-074). Least squares to
  2035: Estonia 186, Latvia 207, Lithuania 208, Finland 96, SE4 134, Poland 191 €/MWh (R² 0.03–0.18);
  Theil–Sen: 150, 161, 161, 65, 106, 202. TYNDP 2024 Distributed Energy's mean prices for 2035,
  as published: Finland 39.9, SE4 45.9, Poland 57.2. The lines inherit the fuels' shape: low
  years at the start, 2022 inside.

