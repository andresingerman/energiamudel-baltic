# Electricity demand outlook: Finland and Sweden (with SE4)

Research date: 2026-09-24. Purpose: input for an open, source-cited Baltic electricity market model in which FI and SE4 are neighbouring price zones.

Conventions:
- TWh = annual electricity, including grid losses unless stated otherwise. MW/GW = power.
- Numbers in square brackets, for example [18], point to the source list at the end.
- "Own calc." = arithmetic I did on the cited source data, not a figure published by the source.
- "Chart reading" = a value read off a published chart that has no data table. Precision is about ±1 TWh.
- "Unverified" = I could not confirm it in a source I opened, or the source is weak. The reason is given each time.
- Scratch copies of the downloaded source files are in `scratchpad/research/src/nordic/`.

---

## 0. Key findings

1. **Actual demand has been flat or falling, in both countries.**
   - Finland: 86.1 TWh (2019) → 84.5 TWh (2025, preliminary). The 2020–2025 CAGR is +0.7 %/yr [1][2].
   - Sweden: 138.7 → 134.2 TWh over the same period. Swedish industrial use fell from 47.7 TWh (2020) to 41.7 TWh (2025) [17].
   - SE4: 25.5 TWh (2021) → 22.9 TWh (2025) [18].
2. **Every official forecast series has been revised down, and the revisions continue.** The downgrades are summarised below; the detail and sources are in 1d and 2d.

   | Series | Earlier value | Latest value |
   |---|---|---|
   | Fingrid, FI 2030 | 131 TWh (Q1/2024) → 126 TWh (Q3/2024) | 103–123 TWh (Q3/2025) |
   | SvK short-term analysis (KMA), SE | KMA 2023 implied ~152 TWh for 2025 | Outcome 134 TWh |
   | SvK KMA, SE 2029 | 176 TWh (KMA 2024) | 164 TWh (KMA 2025) |
   | SvK long-term analysis (LMA), SE 2050 | 209/210–365 TWh (LMA 2024) | 192–333 TWh (LMA 2026) |
   | ERAA, SE 2030 | 208.6 TWh (ERAA 2024) | 163.1 TWh (ERAA 2025) |
3. **Connection queues exceed built load many times over.**
   - Finland: 60–70 GW of consumption enquiries (Fingrid also cites more than 100 GW of total enquiries). Recorded peak demand is 15.6 GW.
   - Sweden: the SvK queue holds 32.5 GW of consumption requests. Recorded peak demand is 22.5–25.2 GW.
   - Actual demand growth has been near zero while these queues grew.
4. **Real new load is now appearing, mainly in Finland.**
   - Electric boilers: more than 3 GW operating or under construction.
   - Data centres with signed grid connection agreements: nearly 5 GW (Aug 2026).
   - Data centres under construction: Microsoft (phase 1 about end-2026), Nebius 310 MW (from 2027), Google (€13 bn in 2027–28).
   - Finnish H1-2026 consumption was +6.5 %, but a cold January contributed. The all-time peak was 15,553 MW on 8 Jan 2026 [2][6][7][8].
5. **Swedish growth is concentrated in SE1 and SE3 heavy-industry projects, and these keep slipping.**
   - Stegra: completion timeline "under review" after a 2025 cash crunch.
   - HYBRIT demonstration plant: moved from 2026 to 2028–29.
   - Northvolt: bankrupt in March 2025.
   - Ørsted FlagshipONE: cancelled in August 2024.
6. **SE4 is the most stable zone.** Official projections keep it at about 24–26 TWh to 2030 and about 27–30 TWh in 2035–2050 [18][24][26][30][33].

---

## 1. Finland (FI, one bidding zone)

### 1a. Actual consumption

| Year | Total consumption, TWh (Statistics Finland) [1][2] | Change y/y [1][2] | Other published figures |
|---|---|---|---|
| 2019 | 86.09 | −1.6 % | |
| 2020 | 81.70 | −5.1 % | |
| 2021 | 87.09 | +6.6 % | |
| 2022 | 81.66 | −6.2 % | |
| 2023 | 80.01 | −2.0 % | |
| 2024 | 83.05 | +3.8 % | Fingrid 83.1 [5] |
| 2025 (preliminary) | 84.47 (table 12su, updated 22 Sep 2026) | +1.7 % | Statistics Finland release: 84.7, +2 % [3]. Fingrid: 84.6, +1.9 % [5]. Energiateollisuus: about 85, +2 %, +1.6 TWh [4] |
| H1 2026 | 46.20 (Jan–Jun), against 43.36 in H1 2025 | +6.5 % | Fingrid 46.1, +6.3 %, attributed to the cold early 2026 [6] |

- **Realised growth (own calc. from [1][2]):**
  - CAGR 2020→2025: +0.67 %/yr.
  - CAGR 2019→2025: −0.32 %/yr.
  - CAGR 2021→2025: −0.76 %/yr.
- **Structure in 2025** (Energiateollisuus, slides 4–6) [4]:
  - Industry: about 35 TWh (+2.6 %), 42 % of use. Of total use: forest 19 %, metals 9 %, chemicals 8 %, other 6 %.
  - Housing and agriculture: 28 %. Services and construction: 26 %. Losses: 4 %.
  - Net imports in 2025: 5.6 TWh (slide 12).
- **Peak demand:** all-time record of 15,553 MW on 8 Jan 2026, 17:00–17:15, at −19 °C. The previous record was 15,164 MW on 7 Jan 2016 [7].
- **Contradiction:** the 2025 total varies between sources: 84.47, 84.6, 84.7 and about 85 TWh. The cause is preliminary data and rounding. For the model, use the Statistics Finland table value 84.47 TWh and update it when the final figure is published.

### 1b. Official forecasts (Finland)

All values are TWh. Where a row gives several values, they are listed in the scenario order of the Scenario column.

| Source (publisher, date) | Scenario | 2030 | 2035 | 2040 | 2045 / 2050 | Peak | What it includes and notes |
|---|---|---|---|---|---|---|---|
| Fingrid, Prospects Q1/2024, data file [12] | Single scenario | 130.9 | – | – | – | – | 2025 forecast 88.0. In 2030: industry and data centres 75.2 (including 17 of hydrogen production), heating 23.6, transport 3.3, other and losses 28.8. |
| Fingrid, Prospects Q3/2024 (Sept 2024), pp. 4–6 [11] | Planning trend | 126 | 160 | – | – | – | Data centres counted in industry. Industry +35 TWh by 2030 and +65 TWh by 2035. Heating +8 TWh. District-heating e-boilers about 2 GW by end-2026. If all enquiries were built: about 300 TWh. |
| Fingrid, Prospects Q3/2025 (Sept 2025; appendix to the main grid development plan) [10][9] | Moderate / Excellent competitiveness | 103 / 123 | 104 / 159 | – | – | – | Base year 2025 = 86 (normal-year model). Industry and data centres: 45 / 63 (2030) and 44 / 96 (2035). Heating 27 / 28. Transport 4 (2030), 7 (2035). Other and losses 27 / 28. "Excellent" is the grid-planning basis. CAGR 2024–35: 2.1 % / 6.1 %. If all enquiries were built: more than 400 TWh. |
| Fingrid, Main grid development plan 2026–2035 (Dec 2025), pp. 5, 8–11 [9] | Planning | – | about 160 (headline graphic for the plan horizon) | – | – | Helsinki area: more than 1,300 MW of new e-boilers decided, giving about +2,000 MW of peak demand | Also gives the enquiry volumes (see 1c). |
| Fingrid, Electricity System Vision 2040, final report (Oct 2025), Table 2 p. 12, scenario tables pp. 14–, App. A.2 pp. 73–74 [13] | Power with stability / Flexible development / Electricity as data / Hydrogen mainstream | – | – | 138 / 173 / 213 / 267 | – | – | Data centres 21 / 8 / 71 / 27. Hydrogen sector 9 / 46 / 15 / 106. Other industry 44 / 48 / 57 / 59. Transport about 10. Heating 26–34. The 2024 base is 83. Data-centre range comes from 3–10 % of European data-centre demand; hydrogen from 1.5–10 % of EU electrolysis. |
| Fingrid, 2022/2023 vision (Fingrid-lehti, 14 Nov 2022) [14] | Four scenarios | – | 114–180 | – | – | – | Base about 85 TWh. Superseded by the 2040 vision. |
| Ministry of Economic Affairs and Employment (TEM), long-term climate plan, **draft** of 7 Nov 2025, pp. 42–45, 62 [15] | Four modelled pathways: Markets first (BIZ), Finland first (FIN), Environment first (ENV), Society first (PPL) | About 100 or more in all pathways except PPL. BIZ 105 (final consumption). | – | About 160 (BIZ, FIN). About 120 (ENV, PPL). | 2050 final consumption: 180 (BIZ), 134–140 (ENV, PPL). 2050 total consumption: more than 190 (BIZ), about 180 (FIN), less than 150 (ENV, PPL). | – | This is a draft. It notes that its 2040 levels are well below Fingrid's high scenarios. |
| Government energy and climate strategy (adopted Dec 2025) [16] | – | Not accessed | | | | | The strategy document returned HTTP 403. A claim of "over 100 TWh by 2030" appeared only in a search summary and is **unverified**. |
| Updated National Energy and Climate Plan (NECP, submitted June 2024) | – | Not extracted | | | | | **Gap.** |
| ENTSO-E, ERAA 2025 final (released 17 Dec 2025) [33][34] | Central, based on national estimates | 106.3 (2028: 93.5; 2033: 122.3) | 129.4 | – | – | Maximum hourly demand across climate years: 13.7 GW (2028), 15.2 GW (2030), 17.2 GW (2033), 18.2 GW (2035) | Average over climate years. |
| ENTSO-E, ERAA 2024 [33] | Central | 105.6 (2028: 96.3) | 118.7 | – | – | 14.3 / 15.5 / 17.2 GW (2028 / 2030 / 2035) | Previous edition, for comparison. |
| ENTSOs, TYNDP 2026 "National Trends+" (NT+) scenario, KPI dashboard (report of 1 Jul 2026) [35] | NT+ | Native demand 126.6 + EV 3.5 + electrolysers 9.2 = 139.3 | 141.7 + 6.3 + 29.4 = 177.4 | 153.7 + 8.7 + 87.0 = 249.4 | 2050: 164.6 + 10.4 + 128.6 = 303.6 | – | Native demand is TSO input data. Electrolyser load is a model output of EU-wide hydrogen coupling, so it is not a national forecast. Totals are own calc. |
| ENTSOs, TYNDP 2024, "Distributed Energy" (DE) and "Global Ambition" (GA) scenarios, demand output sheet [36] | DE / GA | – | – | 146.4 / 130.5 | 2050: 155.1 / 136.0 | – | Final demand, excluding electrolysis and grid losses (own sum of sectors). Data centres 5.9 (2040). The 2019 reference is 88.7 TWh, above Statistics Finland's 86.1, so the definitions differ. The NT+ scenario values of TYNDP 2024 were **not extracted (gap)**. |
| SvK, KMA 2025 slides (19 Mar 2026), slides 10 and 38 [24] | Nordic TSO inputs | 116 (2026: 88; 2027: 91; 2028: 97; 2029: 106) | – | – | – | – | Lower than the KMA 2024 assumption by 6 / 9 / 11 / 9 TWh in 2026–2029. |
| SvK, LMA 2026 (17 Jun 2026), p. 44 [26] | Low renewable (LF) / Medium mixed (MM) / High dispatchable (HP) / High renewable (HF) | – | – | 134 / 145 / 154 / 155 | 2050: 144 / 163 / 183 / 183 | – | Assumes 93 TWh for 2026. Based on Baltic Sea market modelling group (BSMMG) inputs, adjusted by SvK. |

### 1c. Data centres, industrial electrification and hydrogen (Finland)

**TSO statements (Fingrid)**

| Date | Statement | Source |
|---|---|---|
| 8 Sep 2025 | About 400 GW of production enquiries and about 60 GW of consumption enquiries. | [47] |
| Sept 2025 | If all consumption enquiries were realised, consumption would exceed 400 TWh. | [10] |
| Dec 2025 | Production enquiries exceed 400 GW, about 15 times current capacity. Consumption enquiries are about 70 GW, almost 5 times peak demand, and about half of them are data centres. Storage enquiries exceed 30 GW. E-boilers for heat and steam will exceed 3 GW. | [9] pp. 3, 8, 11 |
| 3 Mar 2026 | Total enquiries exceed 100 GW, more than half of them for data centres. Since early 2025, new industrial-scale consumption and storage connections in Southern Finland are restricted. Relief is expected in 2027–28, when new lines such as the Lowlands Line are finished. | [5] |
| 23 Jul 2026 | Data centres with signed connection agreements: more than 3 GW (end of June). E-boilers operating or under construction: more than 3 GW. Storage agreements: about 4 GW. Enquiries over a rolling 12 months: consumption about 68 GW, production about 13 GW, storage about 32 GW. | [6] |
| 18 Aug 2026 | Data centres with signed connection agreements: nearly 5 GW, including projects connected to distribution grids. If all signed agreements were built in full, consumption would be about 40 % above 2025, roughly 118 TWh (own calc.). | [8] |

- **Contradiction:** consumption enquiries are given as about 60, about 70, about 68, or more than 100 GW. The bases differ: a stock at a date, a rolling 12 months, or total enquiries including storage. Take the 60–70 GW consumption figure as the like-for-like number.

**Data centres**

| Project | Location | Capacity | Status and dates | Source |
|---|---|---|---|---|
| Google | Hamina | MW not disclosed | Operating since 2009 in a converted paper mill. | [37][38] |
| Google | Kajaani, Muhos, Vaala | Data-centre MW not disclosed. Associated supply: 629 MW of new onshore wind under PPAs, a 94 MW battery near Kajaani from late 2027, and a 22-year PPA with Fortum linked to the Loviisa nuclear life extension. | €13 bn announced 9 Sep 2026 for 2027–2028; sites are under development. | [37][39] |
| Microsoft | Espoo, Kirkkonummi, Vihti | Data-centre MW not disclosed. More than 200 MW of PPAs. | Announced 17 Mar 2022. Phase 1 to finish around the turn of 2026/27. Phase 2 decision confirmed 28 Apr 2026. Waste heat to Fortum is expected to cover about 40 % of district heat for about 250,000 customers. | [40][41] |
| Nebius | Mäntsälä | 75 MW | Operating (Apr 2026). | [42] |
| Nebius / Polarnode | Lappeenranta | 310 MW | Announced 31 Mar 2026. €8.5 bn. Capacity phased in from 2027. | [42] |
| Hyperco Fin HoldCo 1 | Kouvola | MW not disclosed | Construction from spring 2026, phased completion from end-2026. Tenant not stated. | [43] |
| National data-centre project register (beta; operator not named) | Whole country | 13.19–13.82 GW of declared IT power across 109 projects | 176 projects in total: 43 operating, 28 under construction, 26 in permitting, 34 in zoning, 26 in pre-study, 7 in environmental impact assessment, 3 cancelled. Largest: Keminmaa "Sarvenmaa" 1,000 MW (environmental assessment); Rovaniemi, Halsua and Sievi 500 MW each (zoning); Lapinlahti 500 MW (building permit). | [44] |

- The data-centre register is **unverified**. Its operator is not named, and it shows an obvious unit error (32,681–41,895 "TWh/a", probably GWh/a).
- Leads seen only in search summaries, **not verified and no numbers used**: DayOne (Lahti); Data Tank (Utajärvi); new projects in Ii; atNorth and Verne sites.
- Yle notes that about 140 data-centre plans exist in Finland [39].
- Fingrid's Q3/2025 forecast notes 2025 draft laws that would raise the electricity tax for data centres [10]. This is a policy risk to the data-centre pipeline.

**Hydrogen, e-fuels and industry**

| Project | Location | Capacity | Status (date) | Source |
|---|---|---|---|---|
| P2X Solutions | Harjavalta | 20 MW electrolyser | **Operating.** Commercial production since 12 Feb 2025, inaugurated 26 Mar 2025. | [45] |
| P2X Solutions | Joensuu | 40 MW electrolyser, e-methanol | Environmental permit legally binding 26 Jan 2026. €60 m Business Finland grant (Feb 2025). **No investment decision (FID) found; status unverified.** | [45] |
| Neste | Porvoo | 120 MW electrolyser | **Cancelled**: withdrawal announced 24 Oct 2024. | [46] |
| St1 | Lappeenranta | e-methanol plant, over €100 m | **Postponed and unlikely.** St1 declined €35 m of EU support (Yle, 20 Mar 2024). | [48] |
| Blastr Green Steel | Inkoo | Originally a €4 bn steel plant | **Scaled down.** Steel plant dropped from the permit application; the company now seeks permits for sponge iron (HBI) and a hydrogen plant (Yle, 13 May 2025). | [49] |
| Plug Power | Kokkola 1 GW, Kristinestad 1 GW, Porvoo 0.2 GW (2.2 GW total) | 2.2 GW of electrolysers | Announced 30 May 2023 with an FID target of 2025/26. **No FID found; status unverified.** | [50] |
| Norwegian Hydrogen | Tornio | 75 MW, expandable to 600–1,000 MW | Planning. The Hydrogen Cluster page is undated. | [51] |
| Vetyalfa | Kemijärvi | 1,000 MW | Planning, target 2030. | [51] |
| Flexens / KIP Infra | Kokkola | About 300 MW (search summaries only) | **Unverified.** | – |
| SSAB | Raahe | Conversion to an electric arc furnace | No year given; depends on financing and on lessons from Luleå. | [52] |
| Yle survey (Dec 2023) | Whole country | – | 14 of 26 tracked green-hydrogen projects were delayed or cancelled. | [48b] |

- Hydrogen Cluster Finland lists about 55 projects and more than 12 GW of electrolysers (page undated) [51].
- **Not researched (gap):** Fortum and Gasum hydrogen projects.
- **Note:** Ørsted FlagshipONE was in Örnsköldsvik, Sweden (SE2), not Finland. It is listed under Sweden in 2c.

### 1d. Realism assessment (Finland)

**Evidence of optimism bias**

1. **Outcomes stayed flat while forecasts assumed growth.**
   - Consumption in 2025 (84.5 TWh) was below 2019 (86.1 TWh) and 2021 (87.1 TWh) [1][2].
   - Fingrid's Q1/2024 forecast for 2025 was 88.0 TWh [12]. The outcome was 3.5 TWh (4.0 %) lower (own calc.).
   - Fingrid's Q3/2025 model base year was 86 TWh [10], against an actual 84.5 TWh.
2. **The 2030 forecast keeps falling.** 131 TWh (Q1/2024) → 126 TWh (Q3/2024) → 103–123 TWh (Q3/2025) [10][11][12].
   - Fingrid attributed the Q3/2024 cut mainly to delays in hydrogen projects [11].
   - Other models' 2030 values for FI also scatter widely:

     | Source | FI 2030, TWh |
     |---|---|
     | ERAA 2025 | 106 |
     | SvK KMA 2025 | 116 |
     | TYNDP 2026 NT+ (including EV and electrolysers) | 139 |
3. **Enquiries against built load.**
   - Consumption enquiries (60–70 GW) are about 4–4.5 times the record peak (15.6 GW) [7][9].
   - Fingrid itself says realising all enquiries would mean more than 400 TWh [10].
   - Signed data-centre agreements (about 5 GW) would add roughly 30–40 TWh/yr at typical load factors. This is **own illustrative arithmetic, not a source figure**.
4. **Hydrogen has not materialised.** Only 20 MW operates [45]. The large projects are cancelled, scaled down or have no FID [46][48][49][50]. The academic review finds EU hydrogen projects fall short of 2030 objectives [53].

**Evidence that growth is starting**

1. Consumption in 2024 (+3.8 %) and 2025 (+1.7 %) grew [1][2].
2. H1 2026 rose +6.5 %, but the cold winter contributed [2][6].
3. More than 3 GW of e-boilers are operating or under construction [6]. They move demand into peaks and into low-price hours; Helsinki alone gets about +2 GW of peak [9].
4. Data centres are physically under construction with dated milestones [40][42][43].
5. The research model of Koivunen & Syri projects more scarcity events by 2030 because of district-heating electrification and demand growth [54].

**Assessment:**
- Treat Fingrid "Moderate" (103 TWh in 2030) as the central case and "Excellent" (123 TWh) as the high case.
- Treat TYNDP 2026 NT+ and the Fingrid 2040 high scenarios (213–267 TWh) as stress cases, not expectations.
- Peak demand deserves more attention than energy.
- **Data inconsistency:** the actual 2026 peak (15.55 GW) already exceeds ERAA 2025's maximum hourly demand for 2028 (13.74 GW) [7][33]. Either ERAA nets out flexible e-boiler load, or it underestimates peak demand. **Unverified which.**

---

## 2. Sweden (SE; SE4 where data exist)

### 2a. Actual consumption

**National totals** (SCB monthly statistics summed to calendar years; domestic use including losses) [17]

| Year | Total, TWh | y/y | Industry (mining and manufacturing) | Housing, services etc. | Losses | Energy utilities plus rail and bus |
|---|---|---|---|---|---|---|
| 2019 | 138.74 | – | 48.80 | 74.68 | 8.71 | 6.56 |
| 2020 | 134.72 | −2.9 % | 47.69 | 71.44 | 9.25 | 6.33 |
| 2021 | 143.42 | +6.5 % | 48.34 | 78.78 | 9.90 | 6.40 |
| 2022 | 136.65 | −4.7 % | 46.24 | 73.93 | 10.20 | 6.28 |
| 2023 | 134.69 | −1.4 % | 45.14 | 73.17 | 9.59 | 6.78 |
| 2024 | 136.34 | +1.2 % | 44.76 | 75.58 | 9.43 | 6.57 |
| 2025 | 134.19 | −1.6 % | 41.71 | 76.18 | 9.90 | 6.41 |

- Monthly SCB data are preliminary.
- **Realised growth (own calc.):**
  - CAGR 2020→2025: −0.08 %/yr.
  - CAGR 2019→2025: −0.55 %/yr.
- **Cross-checks:**
  - SvK: 135 TWh (2023) and 136 TWh (2024), including transmission losses [19].
  - SvK's KMA 2025 slides show 134 TWh for 2025 [24].
  - Energimyndigheten's "net use" is 132.0 TWh (2024) and 132.1 TWh (2025) [30]. Its balance carries a 4.0 TWh statistical difference in 2024, so the definitions differ by about 2–4 TWh.
- SvK: 2025 production was 160.4 TWh, net surplus about 34 TWh. Consumption fell slightly, explained by efficiency, lower activity at large users and rooftop solar [20][22].

**By bidding area, TWh** (SCB) [18]

| Area | 2021 | 2022 | 2023 | 2024 | 2025 | Jan–Jul 2026 against Jan–Jul 2025 |
|---|---|---|---|---|---|---|
| SE1 | 11.80 | 11.95 | 11.96 | 11.75 | 11.61 | −2.0 % |
| SE2 | 17.14 | 17.08 | 16.78 | 16.78 | 16.83 | −0.2 % |
| SE3 | 89.00 | 83.96 | 82.94 | 84.46 | 82.86 | +3.8 % |
| **SE4** | **25.46** | **23.64** | **23.00** | **23.36** | **22.90** | **+4.2 %** (13.41 → 13.97) |
| SE4 production | 8.60 | 9.76 | 11.06 | 11.14 | 10.32 | |
| SE4 industry | 7.15 | 6.45 | 6.29 | 6.24 | 5.88 | |
| SE4 housing and services | 15.94 | 15.02 | 14.47 | 14.84 | 14.80 | |
| SE3 industry | 27.45 | 26.15 | 25.53 | 25.32 | 23.17 | |

- SE4 CAGR 2021→2025: −2.6 %/yr. Sweden as a whole Jan–Jul 2026: +2.8 % (own calc.).

**Peak demand** (SvK Kraftbalansen 2025) [19]
- Winter 2023/24: 25,200 MWh/h.
- Winter 2024/25: 22,470 MWh/h on 13 Jan 2025, 08–09, the lowest since the reports began in 2001.
- Forecast for 2025/26:

  | Winter type | Sweden, MWh/h | SE4, MWh/h |
  |---|---|---|
  | Normal | 24,700 | 4,400 |
  | 10-year cold | 25,900 | 4,700 |
  | 20-year cold | 26,200 | 4,700 |

- The winter 2025/26 outcome was **not accessed (gap)**.

### 2b. Official forecasts (Sweden)

All values are TWh. Where a row gives several values, they are listed in the scenario order of the Scenario column.

| Source (publisher, date) | Scenario | 2030 | 2035 | 2040 | 2045 / 2050 | Peak | What it includes and notes |
|---|---|---|---|---|---|---|---|
| SvK, KMA 2023 (values implied by KMA 2024, Table 12) [23] | Planning | – | – | – | – | – | 2025: 152, 2026: 159, 2027: 168, 2028: 180 (own calc.: KMA 2024 value plus the published difference). |
| SvK, KMA 2024 (24 Mar 2025), Tables 11–12, pp. 26–28 [23] | Planning; SvK states it is not a forecast | – | – | – | – | – | 2025: 139, 2026: 142, 2027: 152, 2028: 165, 2029: 176. Hydrogen 0 / 0 / 5 / 9 / 14. 2029 split: housing and services without data centres 67, data centres 5, industry 76, transport 10, district heat and large heat pumps 3, losses 14. |
| SvK, KMA 2025 (slides, 19 Mar 2026), slides 9, 16, 47 [24][25] | Planning; SvK states it is not a forecast | 177 (2026: 137; 2027: 142; 2028: 153; 2029: 164) | – | – | – | – | 2030 split: housing and services 65, data centres 9, industry 62, hydrogen 13, transport 10, other and losses 18. SvK says demand has been shifted about one year later. Swedish surplus falls from 34 to 12 TWh. SE1 demand rises from about 14 to about 30 (chart reading). **SE4 is about 24, flat, with a balance of −12 → −10 (chart reading).** |
| SvK, LMA 2024 (26 Jan 2024) [27][28] | Small-scale renewable (SF) / Roadmaps mixed (FM) / Electrification dispatchable (EP) / Electrification renewable (EF) | – | – | – | 2045: the two lower scenarios 205 and 241; EP 344; EF 347. 2050: 210 / 265 / 365 / 365. | – | Hydrogen is about 25 % of 2045 production in EP and EF. |
| SvK, LMA 2026 (17 Jun 2026), pp. 11–14, 36–45, 65 [26] | LF / MM / HP / HF | – | – | Input demand 186 / 243 / 289 / 290 | 2050 input demand: 192 / 263 / 330 / 333 | – | 2026 = 136. Data centres in 2050: 8.8 / 27.1 / 40.9 / 40.9 (2026: 2.5). Hydrogen in 2050: 9.2 / 35.4 / 65.3 / 65.3. EVs in 2050: 21.5–27.1. Existing industry held constant at 44.4. SvK names MM as closest to a planning scenario, below the 300 TWh (2045) planning target. **SE4 about 24 (2026), 28–29 (2040), 29–30 (2050) (Fig. 17 chart reading).** |
| Energimyndigheten, ER 2025:13 long-term scenarios (2025), section 4.3 [29] | Regional supply / Local environment / Global environment / International growth | – | – | – | 2050: 223 / 244 / 352 / 357 | – | 2023 base: 134. 2030–2045 values exist only as charts (not extracted). |
| Energimyndigheten, short-term forecast winter 2025 (Mar 2025) [31] | – | – | – | – | – | – | 2028: 148, up from under 132 in 2023. |
| Energimyndigheten, short-term forecast summer 2026 (22 Jun 2026), Tables 6 and 13 [30] | – | 2029: 146.7 (net use including distribution losses) | – | – | – | – | 2025: 132.1, 2026: 131.9, 2027: 137.7, 2028: 143.8. Hydrogen 2.4 / 5.4 / 6.1 (2027–29). **SE4 final use (excluding losses and hydrogen): 19.8 (2025) → 20.2 (2029).** SE1: 12.8 → 19.1. |
| ENTSO-E, ERAA 2025 final [33] | Central | 163.1 (2028: 155.4; 2033: 192.1) | 204.3 | – | – | **SE4 maximum hourly demand: 4.15 / 4.25 / 4.35 / 4.42 GW (2028 / 2030 / 2033 / 2035)** | Sum of the four zones (own calc.). **SE4: 24.4 (2028), 25.7 (2030), 26.8 (2033), 27.5 (2035).** SE3 is identical in 2028 and 2030 (94.2), a possible data artefact, **unverified**. |
| ENTSO-E, ERAA 2024 [33] | Central | 208.6 (2028: 176.0) | 228.4 | – | – | SE4: 4.40 / 4.86 / 5.14 GW | **SE4: 26.2 (2028), 29.1 (2030), 31.3 (2035).** |
| ENTSOs, TYNDP 2026 NT+ [35] | NT+ | Native demand 155.8 + EV 8.8 + electrolysers 50.5 = 215.1 | 181.4 + 14.9 + 68.6 = 264.9 | 197.5 + 20.0 + 79.3 = 296.8 | 2050: 205.3 + 31.0 + 104.8 = 341.1 | – | Electrolyser load is model output. Native demand is close to KMA 2025 excluding hydrogen and transport (about 154 in 2030). |
| ENTSOs, TYNDP 2024, DE / GA [36] | DE / GA | – | – | 204.6 / 182.8 | 2050: 214.0 / 190.4 | – | Final demand excluding electrolysis and losses. Data centres 37.2 / 28.7 (2040) and 53.0 (2050). 2019 reference: 133.8. NT+ values **not extracted**. |
| Government planning target (quoted in LMA 2026 foreword) [26] | – | – | – | – | Plan the system for at least 300 TWh in 2045 | – | This is a planning objective, not a forecast. |
| Swedish NECP update | – | Not extracted | | | | | **Gap.** |

### 2c. Industrial electrification and data centres (Sweden)

**Industry**

| Project | Zone | Capacity / electricity | Status and dates | Source |
|---|---|---|---|---|
| Stegra (formerly H2 Green Steel), Boden | SE1 | Phase 1: 2.5 Mt/yr of steel. About 10 TWh/yr. Electrolyser MW widely reported at about 700–740, **not confirmed in an opened primary source**. | **Under construction, delayed.** All 37 electrolyser modules installed (2 Apr 2026). Cash crunch in autumn 2025, about 60 % complete. €1.4 bn raised (announced Apr 2026). Completion timeline "under review", with production 18–24 months after completion (Canary Media). | [55][56][57] |
| HYBRIT / LKAB demonstration plant, Gällivare | SE1 | 600 MW electrolysis planned. About 5 TWh (demonstration), 20 TWh (full scale). | **Pre-FID, delayed** from 2026 to 2028–29. The grid line was delayed by an SvK consultation error; construction starts late 2026, operation target 2029 (DI, 12 Nov 2025). Environmental permit for Malmberget operations granted 15 Jun 2026. | [57][58][59] |
| LKAB, Kiruna sponge iron | SE1 | About 50 TWh if built | **Postponed** to after the 2040s (27 Nov 2024). LKAB's near-term need is about 7 TWh by 2030. | [57][60] |
| SSAB, Luleå mini-mill | SE1 | 2.5 Mt/yr, two electric arc furnaces. About +2 TWh. | FID Apr 2024. Under construction. | [52][57] |
| SSAB, Oxelösund electric arc furnace | SE3 | About +0.5 TWh | FID Jun 2023. Under construction. SSAB's total Nordic use rises from 1.6 to about 4.5 TWh, of which 2.5 TWh in Sweden. | [52][57][61] |
| Northvolt Ett (Skellefteå) and Labs (Västerås) | SE1 / SE3 | Not quantified | **Bankrupt 12 Mar 2025.** Sale of the factories, headquarters and IP to Lyten announced by the trustee on 7 Aug 2025, with approvals then pending. Restart of cell deliveries planned for 2026. | [62][63] |
| Ørsted FlagshipONE, Örnsköldsvik | SE2 | 55 kt/yr of e-methanol. Electrolyser MW not stated in opened sources. | **Cancelled 15 Aug 2024**, with an impairment of about DKK 1.5 bn. | [64][65] |
| Heidelberg Materials, Slite CCS | SE3 | 1.2 TWh | **Paused.** Decision 2026, operation 2032. | [57] |
| Stockholm Exergi BECCS | SE3 | 0.5 TWh | Under construction, 2028. | [57] |

- **Contradiction, Stegra start date:** Fossilfritt Sverige lists a 2026 start [57]; Canary Media says the completion timeline is "under review" [56].
- **Contradiction, SSAB Oxelösund start date:** SSAB said "towards the end of 2026" on 7 Mar 2025 [61]; Fossilfritt Sverige says early 2027 [57].
- **Northvolt status unverified:** the Lyten deal's closing date is given as Feb 2026 in one search summary, and current operations are unconfirmed.
- **FlagshipONE revival unverified:** a reported revival by Liquid Wind was not confirmed (the article returned HTTP 403).

**Data centres**

| Project | Zone | Capacity | Status | Source |
|---|---|---|---|---|
| Microsoft | Gävle, Sandviken (zone not verified); Staffanstorp (SE4) | MW not disclosed | All three sites operating; new facilities under construction in Gävle (Oct 2025). SEK 33.7 bn announced in 2024, to be spent over two years. A 70 MW backup-power expansion at Staffanstorp was withdrawn on 9 May 2022. | [66][67][68] |
| Microsoft, Malmö Fosie | SE4 | Grid reservation reported | Site purchase and grid reservation seen only in search summaries. **Unverified.** | – |
| Brookfield, Strängnäs | SE3 | 300 → 750 MW | SEK 95 bn announced 4 Jun 2025. Planning phase; the build is expected to take 10–15 years. | [69][70] |
| EcoDataCenter, Falun and Borlänge | Zone not verified | 250 MW at launch, up to 600 MW potential | Cited in a Svenskt Näringsliv report, Apr 2026. | [68] |
| atNorth, Hamre (Sollefteå) | SE2 | 200 MW grid connection by autumn 2028 | Agreement with E.ON signed 28 May 2026. | [71] |
| AWS | SE3 (Mälardalen) | MW not disclosed | Region operating since 2018; in May 2025 AWS said it would double its number of Swedish data centres. | [68] |
| Meta, Luleå | SE1 | MW not verified | Operating since 2013; a second hall was added later. | [68] |
| Google, Avesta (Horndal) | – | – | Land preparation. | [68] |

**TSO statements (SvK) and other queue figures**
- The connection queue at the start of 2026 held **32,450 MW of consumption** and 22,600 MW of production. SvK described it as roughly a doubling of the current system [20][22].
- In 2025 SvK received 43 applications: about 13,000 MW of production and about 9,000 MW of consumption, about half of the consumption from data centres.
- SvK issued 22 positive preliminary notices in 2025: 3,695 MW of consumption and 1,170 MW of production.
- Maturity requirements introduced in 2024 removed 14,300 MW from the queue (12,290 MW production, 2,050 MW consumption) [21].
- **Contradiction on data-centre applications:** one source reports 4,500 MW of data-centre applications to SvK in 2025 [72]; another reports data-centre applications in SE3 alone rising from about 1,310 MW (2024) to 6,692 MW (2025), both citing SvK [68].
- Installed data-centre capacity in Sweden is about 800 MW [72] (secondary source, **unverified**).

**Data-centre consumption estimates**

| Estimate | Source | Via |
|---|---|---|
| About 3–4 TWh/yr now; about 5 TWh by 2030; 10–11 TWh with an AI cluster | RISE | Svenskt Näringsliv report [68] |
| 4–4.4 TWh (2025); 4.4–5.0 TWh (2030) | Energimyndigheten (2023) | Svenskt Näringsliv report [68] |
| Nordic total: 7 TWh (2023) → 25 TWh (2030) | Nordic TSOs | Svenskt Näringsliv report [68] |
| 2.5 TWh (2026) | SvK LMA 2026 [26] | – |
| 3 TWh (2026) → 9 TWh (2030) | SvK KMA 2025 [24] | – |

### 2d. Realism assessment (Sweden, with SE4)

1. **Forecast against outcome.**
   - The KMA 2023 planning path implied about 152 TWh for 2025; the outcome was 134.2 TWh (−17.8 TWh). KMA 2024's 139 TWh overshot by 4.8 TWh (own calc. from [17][23]).
   - KMA 2025 cut 2026–29 by 5–12 TWh/yr and says demand was shifted about one year later [24].
   - SvK stated in Feb 2026 that electrification has not taken off as expected a few years ago, citing delayed industrial projects and past grid limits [20].
2. **Long-term revisions.**
   - The top of SvK's 2050 range fell from 365 to 333 TWh and the bottom from 209/210 to 192 TWh. The reason given is weaker conditions for green-industry projects: high capex, interest rates, price uncertainty and competition [26][27].
   - ERAA's Swedish 2030 demand fell by 45.5 TWh between editions (208.6 → 163.1) [33].
   - Energimyndigheten cut its 2028 value from 148 to 143.8 TWh between its winter 2025 and summer 2026 forecasts [30][31].
3. **Industry is shrinking while plans grow.**
   - Industrial electricity use fell by about 6 TWh (2020–2025), including about 2.2 TWh in SE3 in 2025 alone [17][18].
   - Planned SE1 growth depends on a few actors (Stegra, LKAB, SSAB). SvK notes that much of the demand is concentrated in a few projects [26].
   - The projections for SE1 disagree strongly:

     | Source | SE1 demand |
     |---|---|
     | Actual 2025 (SCB) | 11.6 TWh |
     | SvK KMA 2025 | about 14 (2026) → about 30 TWh (2030), chart reading |
     | Energimyndigheten | 12.8 (2025) → 19.1 TWh final use (2029) |
4. **Queue against built load.** The queue holds 32.5 GW of consumption, against a peak load of 22.5–25.2 GW and about 3.7 GW of positive notices a year [19][20][21]. A Svenskt Näringsliv report notes that applicants file the same load with several grid operators, which inflates the totals [68].
5. **SE4 is stable and most sources agree.**

   | Source | SE4 demand, TWh |
   |---|---|
   | Actual (SCB) | 25.5 (2021) → 22.9 (2025) |
   | SvK KMA 2025 | about 24, flat to 2030 |
   | ERAA 2025 | 25.7 (2030), 27.5 (2035); ERAA 2024 had 29.1 for 2030 |
   | SvK LMA 2026 | about 28–30 (2040–2050) |
   | Energimyndigheten (final use, excluding losses and hydrogen) | 19.8 → 20.2 (2029) |

   - SE4 peak: 4.4–4.7 GW (2025/26 forecast) [19], against an ERAA 2025 maximum of 4.15 GW for 2028 [33]. This is the same peak-definition inconsistency as for Finland.
   - Named new SE4 load is small: the Microsoft Malmö site is unverified.
   - **Assessment:** a central SE4 path of about 23–25 TWh to 2030 is well supported; ERAA 2025's 25.7 TWh for 2030 is a reasonable upper-central value.
6. **Early signs of growth in 2026.** SE3 +3.8 % and SE4 +4.2 % in Jan–Jul 2026 [18], partly weather, not yet separated from structural change. This is **unverified** as a trend.

---

## 3. Cross-cutting contradictions and data caveats

1. **Definitions.** Statistics Finland and SCB report total use including losses. Energimyndigheten "net use" is lower by about 2 TWh. Its table of final use by zone excludes losses and hydrogen. TYNDP "native demand" excludes EV charging and electrolysers, while the TYNDP 2024 DE/GA output is final demand. Compare like with like.
2. **SvK LMA 2026, 2050 HF:** 329 TWh in the simulated summary against 333 TWh in the input demand. The difference comes from demand flexibility in the simulation [26].
3. **Energimyndigheten ER 2025:13:** the summary says the lowest scenario is "about 220" TWh; the text gives 223 TWh for Regional supply [29].
4. **ERAA peaks** are below observed or forecast peaks for FI (2026) and SE4, as noted in 1d and 2d. Check the definition before using them for adequacy.
5. **Finnish data-centre register:** unit error, operator unknown [44].
6. **TYNDP 2026 electrolyser loads** (FI 87 TWh and SE 79 TWh in 2040) are model outcomes of an EU-wide hydrogen market, not national plans [35].

## 4. Gaps (not verified in this session)

- Finnish Government energy and climate strategy (Dec 2025) numbers: HTTP 403.
- Finnish and Swedish NECP electricity projections.
- TYNDP 2024 NT+ country values.
- SvK Kraftbalansen 2026 and the winter 2025/26 Swedish peak.
- MW figures for Google Finland, Microsoft (FI and SE), Meta, AWS and Stegra's electrolyser, from a primary source.
- FIDs for P2X Joensuu, Plug Power Finland and Flexens.
- Lyten restart status.
- Fortum and Gasum hydrogen projects.
- Microsoft Malmö Fosie.
- The web-search budget ran out at the end of the session, so these could not be pursued.

---

## Sources

1. Statistics Finland. StatFin table 12sv "Sähkön hankinta ja kokonaiskulutus, 1960–2024" (updated 2026-07-01). https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/ehk/12sv.px (portal: https://stat.fi/fi/tilasto/ehk)
2. Statistics Finland. StatFin table 12su "Sähkön hankinta ja kokonaiskulutus, 1992M01–2026M06*" (updated 2026-09-22), cumulative totals. https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/ehk/12su.px
3. Statistics Finland. "Energian kokonaiskulutus väheni prosentin vuonna 2025", 2026-04-16. https://stat.fi/fi/julkaisu/cmg0s2fc6bp5707t7gegb9rkg
4. Energiateollisuus. "Energiavuosi 2025 – Sähkö. Sähkön ennakkotiedot 2025" (slides 2–12), 2026-01-21. https://energia.fi/wp-content/uploads/2026/01/Sahkovuosi-2025_v1.pdf
5. Fingrid. "Fingrid Oyj's Financial Statements Bulletin January–December 2025", 2026-03-03. https://www.fingrid.fi/en/news/news/2026/fingrid-oyjs-financial-statements-bulletin-januarydecember-2025/
6. Fingrid. "Fingrid-konsernin puolivuosikatsaus 1.1.–30.6.2026", 2026-07-23 (GlobeNewswire). https://www.globenewswire.com/news-release/2026/07/23/3331934/0/fi/Fingrid-konsernin-puolivuosikatsaus-1-1-30-6-2026.html
7. Fingrid. "Yhteenveto sähköjärjestelmän toiminnasta talvella 2025–2026 – tuotanto- ja kulutusennätykset rikkoontuivat tammikuussa", 2026-04-01. https://www.fingrid.fi/ajankohtaista/tiedotteet/2026/yhteenveto-sahkojarjestelman-toiminnasta-talvella-2025-2026--tuotanto--ja-kulutusennatykset-rikkoontuivat-tammikuussa/
8. Fingrid. "Electricity consumption is set to increase sharply – more balancing power will also be needed", 2026-08-18. https://www.fingrid.fi/en/news/news/2026/electricity-consumption-is-set-to-increase-sharply--more-balancing-power-will-also-be-needed/
9. Fingrid. "Main grid development plan 2026–2035", December 2025 (pp. 3, 5, 8–11). https://www.fingrid.fi/globalassets/dokumentit/en/publications/main-grid-development-plan/fingrid_main-grid-development-plan-2026-2035.pdf
10. Fingrid. "Prospects for future electricity production and consumption Q3/2025" (forecast PDF, Sept 2025). https://www.fingrid.fi/globalassets/dokumentit/fi/kantaverkko/kantaverkon-kehittaminen/fingrid_energiaennuste-q3-2025-eng.pdf (landing page, whose URL still says q3-2024: https://www.fingrid.fi/en/grid/development/prospects-for-future-electricity-production-and-consumption-q3-2024/)
11. Fingrid. "Prospects for future electricity production and consumption. Fingrid's forecast Q3/2024", Sept 2024 (pp. 4–6). https://www.fingrid.fi/globalassets/dokumentit/en/news/prospects-for-future-electricity-prodution-and-consumption.-fingrids-forecast-q3-2024.pdf
12. Fingrid. "Prospects for future electricity production and consumption Q1/2024 – data" (Excel), Q1 2024. https://www.fingrid.fi/globalassets/dokumentit/fi/kantaverkko/kantaverkon-kehittaminen/kehitysnakymat-kuvat-data-q1_2024-id-442641.xlsx
13. Fingrid. "Fingridin sähköjärjestelmävisio vuodelle 2040 – Loppuraportti", October 2025 (Table 2 p. 12; scenario tables pp. 14 ff.; App. A.2 pp. 73–74). https://www.fingrid.fi/globalassets/dokumentit/fi/kantaverkko/kantaverkon-kehittaminen/sahkojarjestelmavisio-2025/fingrid-sahkojarjestelmavisio-2040.-loppuraportti-10_2025.pdf
14. Fingrid-lehti. "Transition underway in the power system", 2022-11-14. https://www.fingridlehti.fi/en/transition-underway-in-the-power-system/
15. Työ- ja elinkeinoministeriö (TEM). "Pitkän aikavälin ilmastosuunnitelma – Luonnos 7.11.2025" (pp. 42–45, 62). https://tem.fi/documents/1410877/250192200/Pitk%C3%A4n%20aikav%C3%A4lin%20ilmastosuunnitelma_LUONNOS%207.11.2025.pdf/f5acf1a0-8cff-34b3-f4aa-52bcf63cbb71/Pitk%C3%A4n%20aikav%C3%A4lin%20ilmastosuunnitelma_LUONNOS%207.11.2025.pdf
16. Energiateollisuus. "Kansallinen energia- ja ilmastostrategia" (notes Government adoption in Dec 2025), accessed 2026-09-24. https://energia.fi/energiapolitiikka/kansallinen-ilmasto-ja-energiastrategia/
17. SCB. "Elanvändning efter användningsområde. Månad 1990M01–2026M07" (table ElanvMN, updated 2026-09-10). https://api.scb.se/OV0104/v1/doris/sv/ssd/EN/EN0108/EN0108A/ElanvMN
18. SCB. "Elproduktion och elanvändning efter elområde. Månad 2021M01–2026M07" (table ElEO, updated 2026-09-10). https://api.scb.se/OV0104/v1/doris/sv/ssd/EN/EN0108/EN0108A/ElEO
19. Svenska kraftnät. "Kraftbalansen på den svenska elmarknaden, rapport 2025", 2025-05-30 (pp. 12–13; section 4, Table 12; Fig. 11). https://www.svk.se/49bb53/siteassets/om-oss/rapporter/2025/kraftbalansen-pa-den-svenska-elmarknaden-rapport-2025.pdf
20. Svenska kraftnät (press release via TT). "Nya siffror visar att elförbrukningen tar fart", 2026-02-20. https://via.tt.se/pressmeddelande/4256258/nya-siffror-visar-att-elforbrukningen-tar-fart?publisherId=3235391&lang=sv
21. Energinyheter (news). "Nära 5 000 MW nya anslutningar beviljades under 2025", 2026-02-02. https://www.energinyheter.se/20260202/34296/nara-5-000-mw-nya-anslutningar-beviljades-under-2025
22. Energinyheter (news). "Nya siffror visar att elförbrukningen tar fart", 2026-02-23. https://www.energinyheter.se/20260313/34374/nya-siffror-visar-att-elforbrukningen-tar-fart
23. Svenska kraftnät. "Kortsiktig marknadsanalys 2024", 2025-03-24 (Tables 11–12, pp. 26–28). https://www.svk.se/4959a4/siteassets/om-oss/rapporter/2025/kma-2024_20250324.pdf
24. Svenska kraftnät. "Aktuella tendenser i kraftsystemet – kortsiktig marknadsanalys 2025" (webinar slides 9–10, 16, 38, 47), 2026-03-19. https://www.svk.se/494e46/contentassets/15b86ea1af674859867243761471c6ca/aktuella-tendenser-i-kraftsystemet--kortsiktig-marknadsanalys-2025.pdf
25. Svenska kraftnät. "De svenska elpriserna utjämnas – det visar vår kortsiktiga marknadsanalys 2025", 2026-03-19. https://www.svk.se/press-och-nyheter/nyheter/elmarknad-allmant/2026/de-svenska-elpriserna-utjamnas---det-visar-var-kortsiktiga-marknadsanalys-2025/
26. Svenska kraftnät. "Långsiktig marknadsanalys 2026 – Scenarier för elsystemets utveckling fram till 2050", 2026-06-17 (pp. 4, 11–14, 36–45, 64–66). https://www.svk.se/49e8f3/siteassets/om-oss/rapporter/langsiktig-marknadsanalys/langsiktig-marknadsanalys-2026.pdf
27. Svenska kraftnät (press release). "Svenska kraftnät skruvar upp elförbrukningen i nya analyser" (LMA 2024), 2024-01-24. https://www.svk.se/press-och-nyheter/press/svenska-kraftnat-skruvar-upp-elforbrukningen-i-nya-analyser---3410239/
28. Energiföretagen (energi.se). "Ny analys från Svk: Så ser utmaningarna ut för elsystemet fram till 2045", 2024-01-31. https://www.energi.se/artiklar/2024/januari-2024/sa-ser-utmaningarna-ut-for-sveriges-elsystem-fram-till-2045/
29. Energimyndigheten. "Scenarier över Sveriges energisystem – Vägar till ett energisystem med nettonollutsläpp 2050" (ER 2025:13), 2025 (section 4.3, scenario summaries pp. 20–26). https://energimyndigheten.a-w2m.se/System/TemplateView.aspx?p=Arkitektkopia&id=1173312576a844f5a08e2c4a2005ccfb&l=t&cat=%2FPrognoser%20och%20Scenarier&lstqty=1
30. Energimyndigheten. "Kortsiktsprognos i siffror – sommar 2026" (Excel, Tables 6 and 13), 2026-06-22. https://www.energimyndigheten.se/49e37a/globalassets/energisystem-och-analys/kortsiktiga-prognoser/kortsiktsprognos-i-siffror-sommar-2026 (page: https://www.energimyndigheten.se/energisystem-och-analys/framtidens-energisystem/kortsiktiga-prognoser/)
31. Energimyndigheten. "Energimyndighetens nya prognos visar: Industrins omställning tar fart 2026" (winter 2025 forecast), March 2025. https://www.energimyndigheten.se/nyhetsarkiv/2025/energimyndighetens-nya-prognos-visar--industrins-omstallning-tar-fart-2026/
32. Energimyndigheten. "Kortsiktsprognos: Kraftigt ökad elanvändning först framåt år 2030", 2024-03-18 (qualitative only). https://www.energimyndigheten.se/nyhetsarkiv/2024/kortsiktsprognos-kraftigt-okad-elanvandning-forst-framat-ar-2030/
33. ENTSO-E. ERAA 2025 Dashboard raw data, Aggregated_Demand.csv (versions "ERAA 2024" and "ERAA 2025 final"; files dated 2026-02-02). https://eepublicdownloads.blob.core.windows.net/public-cdn-container/clean-documents/sdc-documents/ERAA/ERAA_2025_Dashboard_RawData.zip (page: https://www.entsoe.eu/eraa/2025/modelling-data/)
34. ENTSO-E. "ENTSO-E releases latest European Resource Adequacy Assessment", 2025-12-17. https://www.entsoe.eu/news/2025/12/17/entso-e-releases-latest-european-resource-adequacy-assessment/
35. ENTSOG and ENTSO-E. TYNDP 2026 Scenarios – NT+ KPI Dashboard (sheets FI and SE, "Consumption [TWh]"), released with the Scenarios Report of 2026-07-01. https://2026-data.entsos-tyndp-scenarios.eu/output/model-results/kpi-dashboards/NT+_KPI_Dashboard.xlsx (download page: https://2026.entsos-tyndp-scenarios.eu/download/)
36. ENTSOG and ENTSO-E. TYNDP 2024 Scenarios – "Demand_Scenarios_TYNDP_2024_After_Public_Consultation.xlsb", sheet 3_DEMAND_OUTPUT. https://2024-data.entsos-tyndp-scenarios.eu/files/scenarios-inputs/Demand_Scenarios_TYNDP_2024_After_Public_Consultation.xlsb.zip
37. Google (press release). "Google Deepens Commitment to Finland with Two-Year €13 Billion investment in AI Infrastructure", 2026-09-09. https://www.googlecloudpresscorner.com/2026-09-09-Google-Deepens-Commitment-to-Finland-with-Two-Year-EUR13-Billion-investment-in-AI-Infrastructure
38. Euronews (news). "Google to invest €13bn in Finnish AI data centres, its biggest European push yet", 2026-09-09. https://www.euronews.com/business/2026/09/09/google-to-invest-13bn-in-finnish-ai-data-centres-its-biggest-european-push-yet
39. Yle (news analysis, J.-M. Mäntylä). "Analyysi: Google lupasi tuoda datakeskuksensa sähkön tullessaan…", 2026-09-09 (updated 2026-09-14). https://yle.fi/a/74-20245344
40. Microsoft Source EMEA. "Microsoft käynnistää pääkaupunkiseudun datakeskusalueen toisen vaiheen rakentamisen", 2026-04-28. https://news.microsoft.com/source/emea/2026/04/microsoft-kaynnistaa-paakaupunkiseudun-datakeskusalueen-toisen-vaiheen-rakentamisen/?lang=fi
41. Microsoft Local. "Kirkkonummi datacenter project updates" (updates through Apr 2026). https://local.microsoft.com/blog/microsoft-aikoo-rakentaa-uuden-datakeskusalueen-etela-suomeen/
42. FAIR EDIH (news). "Nebius plans €8.5 billion data centre in Lappeenranta, cementing Finland as its European base", 2026-04-14. https://www.fairedih.fi/en/2026/04/14/nebius-plans-e8-5-billion-data-centre-in-lappeenranta-cementing-finland-as-its-european-base/
43. Caverion (press release). "Kouvola data center built with Finnish expertise…", 2025-12-10. https://www.caverion.com/newsroom/releases/2025/kouvola-data-center-built-with-finnish-expertise--the-project-company-has-selected-caverion-as-its-technical-construction-and-installation-partner/
44. Datakeskushankkeiden kansallinen rekisteri (beta; operator not stated), accessed 2026-09-24. https://www.datakeskusrekisteri.fi/
45. P2X Solutions. News list (2025–2026 items), accessed 2026-09-24. https://p2x.fi/en/category/news/
46. Neste (press release). "Neste to re-evaluate its renewable hydrogen plan and withdraw from investing into a 120 MW electrolyzer at the Porvoo refinery", 2024-10-24. https://www.neste.com/news/neste-to-re-evaluate-its-renewable-hydrogen-plan-and-withdraw-from-investing-into-a-120-mw-electrolyzer-at-the-porvoo-refinery
47. Fingrid-lehti. "The vision sets out the development of the grid", 2025-09-08. https://www.fingridlehti.fi/en/the-vision-sets-out-the-development-of-the-grid/
48. Yle (news). "St1:n Lappeenrannan valtava metanolitehdas tuskin toteutuu – valtion rahoitushanat kiinni", 2024-03-20. https://yle.fi/a/74-20080079
    - 48b. Yle (news). "Yle selvitti: Vetyhankkeiden piti tuoda Suomeen paljon töitä ja rahaa, mutta nyt moni projekti yhtäkkiä sakkaa", 2023-12-20. https://yle.fi/a/74-20065871
49. Yle (news). "Blastr Green Steel peruu väliaikaisesti miljardien investoinnin Inkoossa – keskittyy ensin sienirautaan", 2025-05-13. https://yle.fi/a/74-20225936
50. Plug Power (press release). "Plug Power Makes Major Strategic Move into Finland's Green Hydrogen Economy…", 2023-05-30. https://www.ir.plugpower.com/press-releases/news-details/2023/Plug-Power-Makes-Major-Strategic-Move-into-Finlands-Green-Hydrogen-Economy-with-its-Proven-PEM-Electrolyzer-and-Liquefaction-Technology/default.aspx
51. Hydrogen Cluster Finland. "Projects" (undated project list), accessed 2026-09-24. https://h2cluster.fi/projects/
52. SSAB. "SSAB's transformation", accessed 2026-09-24. https://www.ssab.com/en/company/about-ssab/ssabs-transformation
53. Jayawardhana, P., Kiehle, J., Calò, A., Pongrácz, E. (2025). "Hydrogen pipedreams or a new industrial revival: Industrial hydrogen demand by 2030 in Finland and Europe." *Renewable and Sustainable Energy Reviews* 222, 115966. https://doi.org/10.1016/j.rser.2025.115966 (only the highlights were read, via OpenAlex; the full text returned HTTP 403)
54. Koivunen, T., Syri, S. (2024). "Analysis of Severe Scarcity Situations in Finland's Low Carbon Electricity System Until 2030." *Energies* 17(23), 5928. https://doi.org/10.3390/en17235928 (abstract read via Crossref)
55. Stegra. "Final electrolyzer module installed at Stegra's green hydrogen plant", 2026-04-02. https://stegra.com/en/news-and-stories/final-electrolyzer-module-installed-at-stegras-green-hydrogen-plant
56. Canary Media (news). "Stegra lands funding to complete world's first major green-steel mill", 2026-04-14. https://www.canarymedia.com/articles/green-steel/stegra-funding-complete-mill
57. Fossilfritt Sverige. "Industrisatsningar" (project tracker; entries updated 2025-05-13 to 2026-04-17). https://fossilfrittsverige.se/industrisatsningar/
58. LKAB. "HYBRIT Demonstration Project" (page with items to 2026-06-15), accessed 2026-09-24. https://lkab.com/en/what-we-do/our-transformation/carbon-free-processes/hybrit-demonstration-project/
59. Börsvärlden, citing Dagens Industri (news). "Elen till LKAB:s Hybritprojekt dröjer efter miss i prövningen", 2025-11-12. https://borsvarlden.com/artiklar/elen-till-lkabs-hybritprojekt-drojer-efter-miss-i-provningen-di
60. High North News (news). "Swedish LKAB Postpones Fossil-Free Sponge Iron Production in Arctic Kiruna", 2024-11-27. https://en.highnorthnews.com/business/swedish-lkab-postpones-fossil-free-sponge-iron-production-in-arctic-kiruna/136133
61. SSAB (press release). "New electric arc furnace in SSAB Oxelösund will shorten SSAB Zero lead times", 2025-03-07. https://www.ssab.com/en/news/2025/03/new-electric-arc-furnace-in-ssab-oxelsund-will-shorten-ssab-zero-lead-times
62. Ackordscentralen (Northvolt bankruptcy trustee). "Northvolt – information for creditors", accessed 2026-09-24. https://ackordscentralen.se/en/current-events/information-for-creditors/northvolt
63. IO+ (news). "US firm Lyten buys bankrupt Northvolt, eyes 2026 restart", 2025-08-08. https://ioplus.nl/en/posts/us-firm-lyten-buys-bankrupt-northvolt-eyes-2026-restart
64. Offshore Energy (news). "Slow-developing e-fuel market prompts Ørsted to terminate FlagshipONE project", 2024-08-15. https://www.offshore-energy.biz/slow-developing-e-fuel-market-prompts-orsted-to-terminate-flagshipone-project/
65. Bioenergy International (news). "Ørsted halts development of FlagshipONE", 2024-08-15. https://bioenergyinternational.com/orsted-halts-development-of-flagshipone/
66. Microsoft. "Microsofts datacenter i Sverige" (brochure), October 2025. https://local.microsoft.com/wp-content/uploads/2025/10/Microsoft-datacenters-in-Sweden-LOCALIZED.pdf
67. Datacenter Forum (news). "Microsoft stops plans to expand Staffanstorp, Sweden data center; looks for new site", 2022-05-09. https://www.datacenter-forum.com/microsoft/microsoft-stops-plans-to-expand-staffanstorp-sweden-data-center-looks-for-new-site
68. Svenskt Näringsliv. "Effekter av datacenterutbyggnaden för elsystemet", April 2026 (pp. 8, 11–12, 22–23). https://www.svensktnaringsliv.se/bilder_och_dokument/rapporter/fj6eis_svn_rapport__dc_digital_v001pdf_1253038.html/SvN_Rapport__DC_DIGITAL_V001.pdf
69. Brookfield Asset Management (press release). "Brookfield To Advance AI Infrastructure in Sweden Through SEK 95 Billion Investment", 2025-06-04. https://bam.brookfield.com/press-releases/brookfield-advance-ai-infrastructure-sweden-through-sek-95-billion-investment
70. RCR Wireless (news). "Canadian investment firm Brookfield pumps $10 billion into AI infra in Sweden", 2025-06-05. https://www.rcrwireless.com/20250605/ai-ml/brookfield-ai-infra
71. Energinyheter (news). "Sollefteå får ny AI-relaterad elanläggning när E.ON ansluter 200 MW…", 2026-05-28. https://www.energinyheter.se/20260528/34841/solleftea-far-ny-ai-relaterad-elanlaggning-nar-eon-ansluter-200-mw-till
72. Nätverket för vindbruk (news). "4 500 MW datacenterel köar – elnätet räcker inte", 2026-06-29. https://natverketforvindbruk.se/datacenterel-koar-elnat-racker-inte/
