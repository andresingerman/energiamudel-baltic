# Baltic electricity demand: actuals, official outlooks, new loads, realism

For energiamudel v5. Research date 2026-09-24. Every number below comes from a source that was opened in this session (PDF/XLSX downloaded and parsed, or page fetched). Citations are `[S#, page/table]` and point to the numbered source list at the end. Page numbers are PDF page indices; for the documents checked, these match the printed numbers unless noted. "(derived)" means the value is my own arithmetic on cited numbers. **UNVERIFIED** means the item could not be checked against a primary source, with the reason given.

## 0. Definitions: the TSO series are not the same thing

| Series | What it is | Source |
|---|---|---|
| Elering "aastane tarbimine" (EE) | domestic generation + imports − exports = inland consumption **including network losses**; from 2021 the accounting includes distributed generation | [S2 p.43 fig 3.2; S3 p.103–104; S6] |
| AST "annual electricity consumption" (LV) | **excluding** electric energy losses; rooftop self-consumption not included | [S12 p.4; S13 p.4; S14 p.6; S17 p.14] |
| Litgrid "bendras suvartojimas" (LT) | final consumption + network technological losses; **excludes** Kruonis PSH and battery charging. "Poreikis" (demand) = the same plus storage charging | [S24 p.49–51; S25] |
| Eurostat `ID` (inland demand, nrg_cb_e) | ≈ net production + imports − exports − pumped-storage/battery input (my reconciliation matches within 0.1 %) | [S39] |
| ERAA demand | end-user demand; **excludes** pumped hydro, batteries, electrolysers and P2H, which are dispatched by the model | [S37 p.6] |
| TYNDP 2026 ETM dashboard | final electricity demand by sector (FEC basis). Excludes network losses, energy-sector own use and electrolysis (my inference from the FEC definition) | [S38] |

---

## 1. Estonia (EE)

### 1a. Actual consumption

| Year | Elering, incl. network losses (TWh) [S2 Table 3.1 p.42; S9 Table 2.14 p.52] | YoY (derived) | Eurostat ID (GWh) [S39] | Peak (MW) [S2 Table 3.1] |
|---|---|---|---|---|
| 2020 | 8.4 | – | 8,961 | 1,409 |
| 2021 | 9.0 | +7.1 % | 9,090 | 1,570 |
| 2022 | 8.5 | −5.6 % | 8,535 | 1,464 |
| 2023 | 8.2 | −3.5 % | 8,205 | 1,552 |
| 2024 | 8.3 (8.26 on Elering web page [S6]) | +1.2 % | 8,255 | 1,599 |
| 2025 | **CONFLICT:** 7.9 [S2 Table 3.1] vs 8.3 (+1 %) in Elering's January 2026 annual summary, reported by ERR [S7] | −4.8 % or +1 % | 8,711 (provisional; Eurostat's EE 2025 rows are visibly incomplete) | 1,467 [S2]; 1,466 MW on 19 Feb [S7] |

- New all-time peak: **1,723 MW on 5 Feb 2026** [S2 p.45; S6]. For the previous record, S6 gives 1,599 MW (4 Jan 2024) and S2 gives 1,595 MW.
- Realised growth (derived): CAGR 2021–2025 is −3.2 %/yr using 7.9, or −2.0 %/yr using 8.3. 2019–2024 (8.6 → 8.3) is −0.7 %/yr. Consumption has stayed between 7.9 and 8.7 TWh every year since 2016 except 2021 (9.0) [S2 Table 3.1].
- About the 2025 conflict: ERR's figures are internally consistent (5.3 TWh production + 3 TWh deficit = 8.3 TWh) [S7]. The 7.9 figure in the development plan is unexplained. A search snippet quoted a 2026 security-of-supply-fee base of 7,876 GWh from VKA 2025, which would match 7.9. That snippet is **UNVERIFIED**, because VKA 2025 could not be opened (see §5).

### 1b. Forecasts

| Source (date) | Scenario / level | 2030 TWh | 2035 TWh | 2040 TWh | Peak MW | Included / excluded |
|---|---|---|---|---|---|---|
| Elering, Transmission Network Development Plan 2026–2035 (Jul 2026; demand updated Dec 2025) [S2 pp.39, 42–44, 46] | base; cold-winter peak (avg-winter peak) | 10.0 | 11.2 | – | 1,924 (1,699) in 2030; 2,148 (1,917) in 2035 | households, services, industry, transport (~11k EV/yr, 64k EVs by 2030), heat pumps. **No new energy-intensive industry** ("not included due to high uncertainty", p.44). Solar parks, grid batteries and DSO CHP are modelled separately. Plan says +29 % in 2035 vs 2025, which implies a 2025 base of ~8.7 TWh, not the 7.9 in its own Table 3.1 (derived) |
| Energex for Elering, demand scenarios 2025 update (completed 3 Dec 2025, updated 23 Feb 2026) [S1 pp.26–37] | L1 end-user demand, average climate year (ACY) | 10.4 | 11.6 | 13.1 | 2.0 / 2.3 / 2.8 GW | components 2030/35/40: base 8.7/8.8/9.0; transport 0.4/1.1/1.8; heat electrification 0.3/0.5/1.0; gas→electricity 0.6/0.6/0.6; transmission losses 0.4/0.4/0.5. No data-centre or electrolyser component |
| same [S1] | L1, extreme climate year | 10.9 | 12.2 | 13.8 | 2.2 / 2.6 / 3.2 GW | as above |
| same [S1 pp.27, 34] | L3 transmission-network demand (net of local PV and DSO generation), ACY, "optimistic rooftop" / "expected rooftop" | 8.5 / 8.4 | 9.0 / 9.2 | 9.8 / 10.3 | 1.9 / 2.3 / 2.7 GW | local PV −1.8…−3.2 TWh. L3 minimum hourly demand turns negative (net export to the transmission grid) |
| Elering VKA 2024 (Dec 2024) [S3 Table 4.4 p.103] | base; cold-winter peak | 10.4 | 12.2 | 13.8 (2039) | 1,993 / 2,290 / 2,693 (2039) | superseded by the Dec-2025 update |
| ENMAK 2035 draft, explanatory memo (8 Jan 2026) [S8 pp.6, 8] | range | Elering 10.4 | **9.3–12.2** | – | – | memo says large consumers could leave or arrive. Sources cited: KAUR 2025, Rohetiiger 2025, VKA 2024 |
| ERAA 2025 final (ENTSO-E) [S36] | avg of climate years | 10.35 | 12.17 | – | max hourly 1.66 / 1.90 GW | excludes electrolysers and storage [S37 p.6]. EE input was "adjusted based on TSO best estimates" using the sector development plan, because the final NECP was unavailable [S37 p.83]. Values ≈ VKA 2024 |
| ERAA 2024 [S36] | avg | 10.53 | 12.57 | – | 1.65 / 1.92 GW | – |
| TYNDP 2026 scenarios, ETM dashboard [S38] | final electricity demand: NT / HEV / LEV | 7.51 (NT) | 8.23 / 8.77 / 7.67 | 9.31 / 9.92 / 8.63 | – | final demand only (buildings, households, industry, transport, agriculture). **Not comparable** to the TSO totals above (derived sum of ETM rows) |
| Elektrilevi (DSO) development plan to 2035 (May 2024) [S11 p.10] | DSO grid only, base | 7.52 | 8.67 | – | – | households, services, industry, e-transport (1.47 TWh by 2035). The foreword cites EU-level projections of "7 → 16–19 TWh" with no target year [S11 p.2] |
| Final updated NECP (13 Jun 2025) [S9] | – | – | – | – | – | no explicit TWh electricity-demand projection found. Target is renewable electricity = 100 % of consumption |

TYNDP 2024: Estonian national values were **not extracted**; see §5.

### 1c. Industrial electrification and data centres

| Item | Size | Status / date | Source |
|---|---|---|---|
| Data centres near Tallinn: "several applications" to 330/110 kV substations; possible new data centres at **Harku, Kiisa, Aruküla** substations, not yet in Elering's network analysis | MW not published | connection applications (2026 plan) | [S2 pp.95–96] |
| Elering's general warning on data centres: a facility with **50 MW contracted may run at 20–30 MW for years** | – | Elering view, Jul 2026 | [S2 p.55] |
| Hydrogen/e-fuel pipeline (Elering survey Aug–Oct 2025): 9 organisations, 13 projects "from idea to operating" | if realised as submitted, **~760 MW electrolysers by 2035, up to 2 TWh H₂/yr** (≈3 TWh electricity at ~65 % efficiency, derived). "Larger projects are at an early stage" | survey, unnamed | [S10 PDF p.67, printed pp.63–64] |
| State programme for electrolysers and fuel cells (Government decision 6 Jan 2022) | up to €67.16 m until 2026 | R&D and first deployment | [S9 p.30] |
| Oil-shale industry: shale-oil producers expected to become the main oil-shale users, with a shift from fuels to chemicals | no MW | policy expectation | [S9 p.135] |
| Existing industry: industrial electricity use **−22 %** since COVID and the energy crisis; "significant growth … unlikely without new industries" | – | 2025 | [S1 p.16] |
| Port electrification (shore power), 10 ports (e.g. Muuga 32 MW, Paldiski Lõuna 4–48 MW, Vanasadam 16–40 MW) | 83–162 MW total | needs mapped by DSO (2024) | [S11 pp.30, 48] |
| Rail Baltic | +54.4 GWh/yr | completion 2030 (NECP) | [S9 p.32] |
| Connection queue context (generation): ~1,200 MW of developers want connection offers; ~700 MW is in the 2030 scenario | – | 2026 plan | [S2 p.49] |

No named Estonian data-centre or e-fuel project with MW and status could be verified this session (see §5).

### 1d. Realism (EE)

Forecast vintages against actuals (TWh, incl. losses):

| Vintage | 2021 | 2022 | 2023 | 2024 | 2025 | 2030 | 2035 |
|---|---|---|---|---|---|---|---|
| TalTech for Elering, 2018 base (slow–fast) [S5 Tables 3.3–3.5 p.36] | 8.21 | 8.28 | 8.36 (7.93–8.83) | – | – | (2032: 8.76) | – |
| VKA 2020 [S4 Table 4.2 p.81] | 8.9 | 9.0 | 9.1 | 9.2 | 9.2 | 9.5 | 9.6 |
| VKA 2024 [S3 Table 4.4] | – | – | – | 8.8 | 9.1 | 10.4 | 12.2 |
| Plan 2026–35 / Dec-2025 update [S2] | – | – | – | – | – | 10.0 | 11.2 |
| **Actual** [S2] | 9.0 | 8.5 | 8.2 | 8.3 | 7.9 / 8.3 | | |

- Near-term forecasts were **too high**. VKA 2020 overshot 2023–2025 by about +11 % (derived). VKA 2024 overshot the very next year (2024) by +6 % and 2025 by +10–15 % (derived). Caveat: VKA 2020's statistics were on the pre-2021 accounting basis (2019 = 8.2 TWh there, 8.6 TWh in today's series), so on a like-for-like basis the overshoot is probably larger. The 2018 TalTech base case hit 2023 within +2 % but missed the 2021 spike by −9 %. That study excluded new large consumers [S5 p.26].
- The 2030 value has moved 9.5 → 10.4 → 10.0 TWh across vintages, and 2035 has moved 9.6 → 12.2 → 11.2.
- Drivers under-delivered against the previous model [S1 pp.4, 9, 13, 16, 17, 21, 22]:
  - ~10k EVs vs >37k expected by 2025.
  - E-buses 22 vs 153; e-trucks 10 vs 129.
  - Renovation at 48 % (houses), 83 % (flats) and 88 % (other) of the 2025 expectation.
  - Gas use fell but was replaced by other fuels, not electricity; "the expected electrification trend in heating has not occurred".
  - Industry −22 %, services −14 %; households +17 %.
  - Average hourly base demand is 26 % below the previous model (p.7).
  - Solar outran the model: ~1,500 MW total vs 468 MW ground-mounted expected by 2025, which cuts grid demand.
- Data centres: Elering explicitly warns that contracted capacity and real load diverge [S2 p.55].
- Definitional trap: the plan's 10.0/11.2 TWh match Energex's "sector consumption", which excludes 0.4 TWh of transmission losses (L1 total = 10.4/11.6), yet the plan labels its figure as consumption "with network losses" [S2 p.44 vs S1 p.30]. **UNVERIFIED** which definition applies.

---

## 2. Latvia (LV)

### 2a. Actual consumption

| Year | AST, excl. losses (GWh) | YoY | Eurostat ID (GWh) [S39] | Peak |
|---|---|---|---|---|
| 2020 | 7,136 [S15 p.3] | – | 7,066 | – |
| 2021 | 7,382 [S18, AST market review] | +3.5 % | 7,316 | – |
| 2022 | 7,106 [S14 p.6; S19] | −3.7 % | 7,112 | – |
| 2023 | 6,871 [S13 p.4]; AST market review: 6,887 (−3.4 %) [S20] | −3.3 % (derived) | 6,939 | – |
| 2024 | 6,980 [S12 p.4] | +1.6 % derived (report says +2 %) | 7,118 | 1,243 MWh/h on 8 Jan 2024 [S12 p.5] |
| 2025 | 7,201 [S17 p.14] | +3.2 % (report: +3 %) | 7,514 (provisional) | – |

- CAGR 2021–2025: −0.6 %/yr; 2020–2025: +0.2 %/yr (derived). The KPMG study for AST describes a ~7 TWh average over ten years [S21].
- AST notes that self-consumption from rooftop solar is **not** included, so true end-use is higher [S17 p.14].

### 2b. Forecasts

| Source (date) | Scenario | 2030 | 2035 | 2040 | Peak MW | Included / excluded |
|---|---|---|---|---|---|---|
| AST TSO Annual Report 2025 (Oct 2025) [S12 Table 1 p.7; scenario definitions p.9] | A conservative | 7.31 + **0.70 H₂** = 8.0 TWh | 7.65 + 1.30 H₂ = 8.9 | – | – | GDP (Ministry of Economics), DSO trends, users' plans for EVs and P2X/H₂. Hydrogen is listed separately; the totals are my sums |
| same | **B baseline** | 7.63 + 1.40 H₂ = **9.0** | 8.27 + 3.20 H₂ = **11.5** | figure only | **1,562 / 1,912** | moderate growth |
| same | EU2030 optimistic | 8.00 + 2.30 H₂ = 10.3 | 9.01 + 4.70 H₂ = 13.7 | – | – | faster EVs, hydrogen, electrolysis, P2X after 2030 (NECP / Energy Strategy 2050) |
| AST 2024 statement (Sep 2024) [S13 p.7] | B | 7.63 + 1.40 | (2034: 8.26 + 2.90) | – | 1,647 (2030) | same method |
| KPMG for AST (reported 5 Apr 2024) [S21] | – | stagnation ~7 TWh until 2030 | growth of up to **+100 %** in 2030–2035 | – | – | transport, heat pumps, P2X. Study itself not opened (AST site blocked) |
| Final updated NECP (Jul 2024) [S23 p.113; Annex 3 p.6] | target scenario | +14.5 % to 2030; final electricity 654 ktoe ≈ 7.6 TWh | 722 ktoe ≈ 8.4 | 765 ktoe ≈ 8.9 | – | final consumption (ktoe→TWh at 11.63 GWh/ktoe, derived). The Annex 3 table does not state its scenario |
| ERAA 2025 final [S36] | avg | 9.04 | 11.72 | – | 1.43 / 1.85 GW | TSO best estimate, "not identically aligned" with NECP [S37 p.84]. Matches AST B **plus hydrogen** within 0.5 % (2030), although ERAA's definition excludes electrolysers. **UNVERIFIED** whether LV submitted H₂ as inflexible load |
| ERAA 2024 [S36] | avg | 7.59 | 9.29 | – | 1.22 / 1.49 GW | – |
| TYNDP 2026 ETM [S38] | final demand NT / HEV / LEV | 6.50 | 6.50 / 6.91 / 6.10 | 6.49 | – | **flat 2030–2050 in NT**, which looks like a placeholder (UNVERIFIED) |
| Eurelectric/EY "Grids for Speed", via LV portāls news (9 May 2025) [S22] | – | ~10 TWh (from ~7 TWh in 2024; ">40 %") | – | – | – | transport named as the fastest-growing use. News citation only |

### 2c. Industrial electrification and data centres

| Item | Size | Status | Source |
|---|---|---|---|
| Hydrogen/P2X users (unnamed), as assumed in AST scenarios | 0.7–2.3 TWh (2030), 1.3–4.7 TWh (2035) | scenario assumption based on "information from electricity system users" | [S12 pp.7, 9] |
| "Large number of connection applications from RES producers and hydrogen consumers", given as the reason to reinforce LV–LT capacity (joint AST–Litgrid study done Jan 2024) | not quantified | applications | [S12 p.18] |
| AST conclusion: hydrogen and P2X "can significantly increase consumption" | – | – | [S12 p.22] |
| Data centres | – | not mentioned in AST 2023–2025 reports (checked). NECP covers only efficiency and waste-heat obligations | [S12–S14; S23] |

No named Latvian industrial or data-centre project could be verified (see §5).

### 2d. Realism (LV)

AST baseline (B) vintages against actuals (GWh, excl. losses):

| Vintage | 2023 | 2024 | 2025 | 2030 |
|---|---|---|---|---|
| TSO statement 2017 (Oct 2018) [S16 Table 2 p.4] (its base year is stated *incl.* losses, so the definition may differ) | 7,559 | 7,639 | 7,706 | (2028: 7,907) |
| TSO statement 2020 (Oct 2021) [S15 Table 1 p.4] | 7,441 (+8.3 %) | 7,518 (+7.7 %) | 7,595 (+5.5 %) | 7,931 |
| TSO report 2023 (Nov 2023) [S14 Table 1 p.8] | 7,169 (+4.3 %) | 7,270 (+4.2 %) | 7,329 (+1.8 %) | 7,604 |
| TSO report 2024 (Sep 2024) [S13 p.7] | – | 6,811 (−2.4 %) | 6,925 (−3.8 %) | 7,630 + 1,400 H₂ |
| TSO report 2025 (Oct 2025) [S12 p.7] | – | – | 7,063 (−1.9 %) | 7,627 + 1,400 H₂ |
| **Actual** | 6,871 | 6,980 | 7,201 | |

- Errors are small (−4 % to +8 %). The 2020 vintage was high after the 2022 price shock, and the 2024–2025 vintages were slightly low.
- The **non-hydrogen 2030 value is very stable across vintages** (7.6–7.9 TWh). The large upside from 2024 onward comes entirely from hydrogen (1.4 TWh in B for 2030), and the reports name no projects behind it.
- Rooftop self-consumption hides demand growth from the TSO series [S17 p.14; S22].

---

## 3. Lithuania (LT)

### 3a. Actual consumption (Litgrid national balance workbook [S25])

| Year | Total incl. grid losses (TWh) | YoY | Final (TWh) | Demand incl. storage charging (TWh) | Industry final (TWh) | Eurostat ID (GWh) [S39] | Peak (MW) |
|---|---|---|---|---|---|---|---|
| 2020 | 11.973 | – | 10.977 | 13.051 | 4.240 | 12,107 | 1,939 [S29 p.7] |
| 2021 | 12.760 | +6.6 % | 11.836 | 13.737 | 4.476 | 12,880 | ≈2,182 (derived: +12.54 % vs 2020 [S29 p.7]) |
| 2022 | 12.039 | −5.7 % | 11.192 | 12.818 | 3.999 | 12,298 | – |
| 2023 | 11.833 | −1.7 % | 10.957 | 12.583 | 4.053 | 11,901 | 2,100 net (−1.7 %) [S34 p.246] |
| 2024 | 12.387 | +4.7 % | 11.504 | 13.169 | 4.284 | 12,431 | – |
| 2025 | 12.576 | +1.5 % | 11.727 | 13.261 | 4.345 | 12,518 (prov.) | 2,168 [S24 Table 4.3.6 p.52] |

- Winter 2026 peak: **2,633 MW on 2 Feb 2026**. Litgrid calls it the first significant national jump, caused by a cold winter plus heat pumps [S24 pp.12, 51–52].
- Litgrid's 2026 plan rounds 2025 to 12.6 TWh in its text but gives 12.7 in Table 4.3.4 [S24 pp.12, 51]. The workbook gives 12.576.
- About **630 GWh** of prosumer self-consumption in 2025 is unmetered [S24 p.49].
- CAGR 2021–2025: −0.4 %/yr; 2019–2025 (12.154 → 12.576): +0.6 %/yr (derived).

### 3b. Forecasts

| Source (date) | Scenario | 2030 TWh | 2035 TWh | 2040/2050 | Peak MW | Included / excluded |
|---|---|---|---|---|---|---|
| Litgrid 10-yr plan 2026–2035 (1 Jul 2026) [S24 Table 4.3.4 p.51] | **NacSc** (NENS/NECP-aligned): total / demand / final | 30.4 / 33.6 / 28.5 | **43.5** / 46.6 / 40.8 | – | 3,975 / 5,039 | components 2030/2035 [Table 4.3.3 p.48]: **electrolysis 9.5/16.7**, data centres 1.4/2.8, industry 1.9/3.2, ports 1.1/1.1, rail 0.1/0.2; EVs ~2.4 TWh by 2035 (~646k EVs); heat pumps 1.3 TWh by 2035 [p.47]. **Peak excludes storage, electrolysis and data centres** [p.51] |
| same | **LTrSc** (slower transformation; reflects 2025 market and latest surveys, 44 % below NacSc in 2035 [p.43]) | 17.8 / 19.9 / 16.7 | **24.3** / 26.7 / 22.7 | – | 3,393 / 3,962 | electrolysis 0.4/3.3, data centres 0.7/1.4, industry 1.7/2.4 (only 50 % of economic-zone projects realised), ports 0.4/1.1; EVs 0.8 TWh (~256k); heat pumps 0.9 TWh |
| NENS 2024, via IEA review (Jun 2025) [S33 pp.27, 37, 41] | Roadmap Scenario | **24** | – | **2050: 74**, nearly half for H₂ (8.5 GW electrolysers, 36 TWh) | – | NENS text not opened directly (see §5) |
| Final updated NECP (Oct 2024) [S34] | planned policies (PPP) | electrolysis 1.3 GW, **6.51 TWh** [p.52]; ~6 TWh [p.263] | – | – | – | WEM: final electricity +29 % by 2030 and 16,938 GWh in 2040 [p.218]. Table 2.1.2.3 has final electricity 1,686 ktoe (≈19.6 TWh) for 2030, but its column labels are garbled (**UNVERIFIED**) [p.38] |
| ERAA 2025 final [S36] | avg | 17.43 | 20.47 | – | 2.90 / 3.44 GW | excludes electrolysers. LT input "aligned" with NECP for 2030; 2035 taken from the Lithuanian Energy Transformation Study [S37 p.84]. Pre-CfE version: 15.72 / 18.26 |
| ERAA 2024 [S36] | avg | 18.41 | 20.23 | – | 2.91 / 3.18 GW | – |
| TYNDP 2026 ETM [S38] | final demand NT / HEV / LEV | 13.43 | 16.59 / 18.51 / 14.83 | 2040: 20.48 / 22.58 / 18.13; 2050 NT 25.47 | – | final demand only; excludes electrolysis and losses |
| NENS 2012 [S35 paras 6, 63, 109] | historic strategy | 13–17 | – | 2050: 22–33 | – | "2020: 12–14 TWh" |

### 3c. Industrial electrification and data centres

| Project | Size | Status / date | Source |
|---|---|---|---|
| **Achema** (fertiliser) electrolyser | 213 MW | **postponed Sep 2024**; declined €122 m state aid already approved by the EC | [S33 p.36] |
| Orlen Lietuva refinery electrolyser | 20 MW | in the pipeline | [S33 p.37] |
| Orlen Lietuva: Anapolės 110 kV switchyard reconstruction | MW n/a | 2025–2029 | [S24 p.85] |
| Vilnius district-heating electrolyser | 3 MW | planned | [S33 p.37] |
| Port of Klaipėda electrolyser + H₂ refuelling | 2 MW | "set to open in 2026" | [S33 p.37] |
| TSO hydrogen view (LTrSc) | 0.67 GW electrolysers, 2.25 TWh H₂ production, 2.94 TWh use in 2035; "less than NENS"; H₂ corridor delayed | 2026 plan | [S24 p.12] |
| **Teltonika High-Tech Hill** (electronics), Kuprioniškių 110/10 kV substation | up to **58 MW** (connection conditions) | **energised Sep 2026**, almost a year early | [S31; S24 p.85] |
| **Rheinmetall**: consumer connection at Šeduva substation + line reconstruction | MW n/a | 2026–2028 | [S24 p.86] |
| Unnamed ESO consumers: Vismaliukai **60 MW**, Gulbinai **50 MW** (2026–2030); Kuršėnai 30 MW (2025–2028); Marių 13 MW (2025–2027) | 153 MW | client projects in the investment list. Consumer type not stated (**UNVERIFIED** whether any are data centres) | [S24 p.85] |
| Data centres (aggregate) | 0.7–1.4 TWh (2030), 1.4–2.8 TWh (2035), ~80 % load factor | Litgrid "expert judgement from discussions with potential developers and Invest Lithuania"; LTrSc assumes 50 % slower build-out | [S24 p.48] |
| Industry (aggregate) | 1.7–1.9 TWh (2030), 2.4–3.2 TWh (2035), ~60 % load factor; peak +325–615 MW | based on Litgrid **letters of intent** | [S24 pp.48, 51] |
| Connection-queue data | **48 new letters of intent in 2025** (RES + BESS; 23 standalone BESS). Consumption capacity map launched 3 Mar 2026 for industry, data centres and electrolysis, **without application statistics** | – | [S24 p.32; S32] |

### 3d. Realism (LT)

Litgrid plan vintages (total consumption incl. losses, TWh):

| Plan (date) | forecast for 2025 | error vs 12.576 (derived) | longer horizon |
|---|---|---|---|
| 2016–2025 (Oct 2016) [S26 pp.24–25] | 12.59 base (11.89–13.05); peak 2,184 MW | **+0.1 %**; final −0.9 %; peak +0.7 % vs 2,168 | – |
| 2018–2027 (Jun 2018) [S27 pp.8, 24] | – | – | 2027: 14.47 |
| 2020–2029 (Jun 2020) [S28 p.8] | 13.8 | **+9.7 %** | 2029: 14.7 |
| 2022–2031 (Sep 2022) [S29 p.20] | 15.4 | **+22.5 %** (3-year horizon) | 2031: 18.7 |
| 2024–2033 (Jul 2024) [S30 p.25] | – | – | 2033: 27.5 |
| 2026–2035 (Jul 2026) [S24] | – | – | 2035: 43.5 NacSc / 24.3 LTrSc |

- The 2016 trend forecast was almost exact. From 2020 onward, the plans embedded policy-driven electrification and hydrogen and **over-forecast by 10–22 %** while actual consumption stayed at 11.8–12.8 TWh. The long-horizon endpoint escalated with each vintage (18.7 → 27.5 → 43.5 TWh) until Litgrid added the slower LTrSc case in 2026 [S24 p.43].
- Hydrogen targets have not materialised. NECP and NENS target 1.3 GW and ~6.5 TWh in 2030; Litgrid's LTrSc has 0.4 TWh of electrolysis in 2030 (≈0.08 GW at 55 % load factor, derived) [S34 p.52; S24 p.48]. IEA: "little evidence of progress" [S33 p.36]. The anchor project (Achema, 213 MW) was postponed.
- NENS 2012 put 2020 demand at 12–14 TWh; the actual was 11.97 TWh, just below the range [S35; S25].
- Peak demand is the one metric that jumped: 2,168 MW (2025) → 2,633 MW (Feb 2026), driven by weather and heat pumps [S24 p.51]. Peak growth can come from electrification even when annual energy is flat.

---

## 4. Cross-cutting realism evidence

- Across all three TSOs, near-term forecasts (1–5 years ahead) made in 2020–2024 were mostly **too high**: EE +6 % to +15 %, LT +10 % to +22 %, LV +2 % to +8 % (the 2020–2023 vintages). The exceptions are Litgrid 2016 (accurate) and AST 2024–25 (slightly low). All derived from the tables above.
- New-load categories under-delivered: EVs, e-buses and e-trucks, heat and gas electrification (EE [S1]), and hydrogen (LT [S33; S24]). Behind-the-meter solar over-delivered and lowers grid-level demand: EE [S1 p.13], LV [S17], LT ~630 GWh [S24 p.49].
- Data centres: the TSOs publish no MW queue by customer type. Elering documents the gap between contracted and actual load (50 MW contracted, 20–30 MW used for years) [S2 p.55]. Litgrid's 2035 data-centre figure differs 2× between scenarios (1.4 vs 2.8 TWh) [S24 p.48].
- Literature:
  - Retrospective review of 12 western US utilities' mid-2000s long-term load forecasts: most **overestimated** both energy and peak growth, mainly through over-optimistic economic-growth assumptions; forecast accuracy was only mildly correlated with method complexity [S40].
  - EIA energy-consumption projections 1982–2000 erred by about 4 % at 10–13 years. This masked large offsetting errors: GDP was too high and energy intensity too low, each by more than 15 %. No improvement over time [S41].

## 5. Gaps and unverified items

- **Elering VKA 2025** (Dec 2025) was not opened: the live URL returns 404 after Elering's site migration, and the only archived copy is truncated at 5 MB. The 10.4/12.2 TWh cited in the ENMAK memo come from VKA 2024 Table 4.4 (verified [S3]).
- **Estonia 2025 consumption**: 7.9 TWh [S2] vs 8.3 TWh [S7]. Unresolved.
- **Lithuania NENS 2024** was not opened directly: lrv.lt/enmin.lrv.lt serve a Cloudflare challenge. The figures used are the IEA's [S33].
- **AST KPMG study** and AST news pages were not opened (ast.lv blocks HTML requests). Used LSM's report of it [S21]. AST PDFs themselves downloaded fine.
- **Latvian Energy Strategy 2050** (KEM, Mar 2025): the link returned "page not found". A search snippet attributed "24.4 TWh (2030) / 21.7 TWh (2035) electricity consumption" to it. **UNVERIFIED** and implausible as electricity (probably another energy aggregate). Do not use.
- **TYNDP 2024** per-country demand was not extracted; it exists only inside ~100 MB model-output files. **TYNDP 2026 NT+** per-country totals were not extracted either (438 MB input). Only the ETM final-demand dashboard [S38] was used.
- **Named data-centre projects (EE, LV) and further LT projects** (e.g. the Kruonis technology park; the DCD page returned 403) are not verified. The session's WebSearch budget was exhausted (200/200) midway, and several news/DC sites block automated access. A targeted news search (ERR, LSM, LRT, BNS) is recommended before relying on project lists.
- The **ENTSO-E data-centres report (30 Apr 2026)** cited by Elering [S2 p.55] was not located.

---

## Sources

1. Energex OÜ for Elering AS, *Estonian electricity demand scenarios 2025 update*, completed 03.12.2025, updated 23.02.2026. https://eleringweb.cdn.prismic.io/eleringweb/RbnfeoKiAbXOHPha_2026-02-23Estonianelectricitydemandscenarios2025update.pdf
2. Elering AS, *Eesti elektriülekandevõrgu arengukava 2026–2035*, PDF dated 9 Jul 2026. Original URL (now 404): https://elering.ee/sites/default/files/2026-07/Eesti%20elektri%C3%BClekandev%C3%B5rgu%20arengukava%202026-2035_0.pdf; archived copy: https://web.archive.org/web/20260821115431/https://elering.ee/sites/default/files/2026-07/Eesti%20elektri%C3%BClekandev%C3%B5rgu%20arengukava%202026-2035_0.pdf
3. Elering AS, *Eesti elektri varustuskindluse aruanne 2024* (VKA 2024), Dec 2024, Table 4.4 p.103. https://web.archive.org/web/20251008082919/https://elering.ee/sites/default/files/2024-12/Elering_VKA_2024.pdf
4. Elering AS, *Eesti elektrisüsteemi varustuskindluse aruanne 2020* (VKA 2020), Dec 2020, Table 4.2 p.81. https://web.archive.org/web/20231011215355/https://elering.ee/sites/default/files/public/VKA2020.pdf
5. TalTech for Elering, *Eesti pikaajaline elektritarbimise prognoos*, Eleringi toimetised 1/2018 (17), Tallinn 2018. https://eleringweb.cdn.prismic.io/eleringweb/3saetqLY57YTd8hW_Eestipikaajalineelektritarbimiseprognoos_1.pdf
6. Elering, *Electricity consumption and generation* (web page, last modified 5 Feb 2026). https://www.elering.ee/en/electricity-consumption-and-generation
7. ERR, "Eestis tõusis mullu elektritarbimine protsendi võrra", 12 Jan 2026 (Elering data). https://www.err.ee/1609922156/eestis-tousis-mullu-elektritarbimine-protsendi-vorra
8. Kliimaministeerium, *Energiamajanduse arengukava aastani 2035 eelnõu seletuskiri*, 8 Jan 2026. https://kliimaministeerium.ee/sites/default/files/documents/2026-01/ENMAK%202035%20seletuskiri.pdf
9. Republic of Estonia, *Estonia's National Energy and Climate Plan to the year 2030 – Update* (final, submitted 13 Jun 2025). https://cdn.climatepolicyradar.org/navigator/EST/2025/estonia-updated-final-national-energy-and-climate-plan-necp-2021-2030_42cafb7b105ee2e5d990ae23f5072d6b.pdf (EC page: https://commission.europa.eu/publications/estonia-final-updated-necp-2021-2030-submitted-2025_en)
10. Elering AS, *Eesti gaasiülekandevõrgu arengukava 2026–2035*, Feb 2026, pp.63–64. https://web.archive.org/web/20260325121040/https://elering.ee/sites/default/files/2026-02/Eesti%20gaasi%C3%BClekandev%C3%B5rgu%20arengukava%202026-2035_0.pdf
11. Elektrilevi OÜ, *Jaotusvõrgu arengukava aastani 2035*, May 2024. https://public-docs.elektrilevi.ee/2/11/jaotusvorgu_arengukava_aastani_2035_ddf1a76dad.pdf
12. AS Augstsprieguma tīkls, *Transmission System Operator's Annual Report, Riga – 2025*, Oct 2025. https://www.ast.lv/sites/default/files/editor/PSO_Zinojums_2025_ENG.cleaned.pdf
13. AS Augstsprieguma tīkls, *Annual Statement of Transmission System Operator 2024*, Sep 2024. https://www.ast.lv/sites/default/files/editor/PSO_ZINOJUMS_EN_2024.pdf
14. AS Augstsprieguma tīkls, *TSO annual report 2023* (EN), Nov 2023. https://www.ast.lv/sites/default/files/editor/AST_PSO_zinojums_2023_EN.pdf
15. AS Augstsprieguma tīkls, *TSO annual statement 2020*, Oct 2021. https://www.ast.lv/sites/default/files/editor/TSO_annual_statement_2020.pdf
16. AS Augstsprieguma tīkls, *TSO Annual Statement 2017*, Oct 2018. https://www.ast.lv/sites/default/files/editor/TSO_Annual_Statement_2017.pdf
17. AS Augstsprieguma tīkls Group, *Consolidated sustainability report / annual report 2025* (Nasdaq Baltic filing), p.14. https://www.nasdaqbaltic.com/market/upload/reports/ast/2025_ar_en_con.pdf
18. LSM, "Latvijā pērn saražots par 1,8% vairāk elektroenerģijas; patēriņš pieaudzis par 3,5%", 21 Jan 2022. https://www.lsm.lv/raksts/zinas/ekonomika/latvija-pern-sarazots-par-18-vairak-elektroenergijas-paterins-pieaudzis-par-35.a439917/
19. LSM, "2022. gadā elektrības ražošana Latvijā samazinājās par 14,5%, imports pieaug par 30%", 25 Jan 2023. https://www.lsm.lv/raksts/zinas/ekonomika/2022-gada-elektribas-razosana-latvija-samazinajas-par-145-imports-pieaug-par-30.a493269/
20. TV3, "Enerģētiskā krīze Latvijā pārvarēta…", 7 Feb 2024 (AST data). https://tv3.lv/zinas/ekonomika/energetiska-krize-latvija-parvareta-sarukusas-elektribas-cenas-un-vairak-razojam-uz-vietas-pauz-ast/
21. LSM, "Pētījums: Latvijā straujāks elektroenerģijas patēriņa pieaugums gaidāms tikai no 2030. gada", 5 Apr 2024 (KPMG study for AST). https://www.lsm.lv/raksts/zinas/ekonomika/05.04.2024-petijums-latvija-straujaks-elektroenergijas-paterina-pieaugums-gaidams-tikai-no-2030-gada.a549226/
22. LV portāls, "Pētījums: tuvākajā piecgadē elektroenerģijas patēriņš Latvijā varētu pieaugt par vairāk nekā 40%", 9 May 2025. https://lvportals.lv/dienaskartiba/375880-petijums-tuvakaja-piecgade-elektroenergijas-paterins-latvija-varetu-pieaugt-par-vairak-neka-40-2025
23. Republic of Latvia, *Final updated NECP 2021–2030* (EN) and Annex 3 "Parameters and variables", EC publication 15 Jul 2024. https://commission.europa.eu/document/download/3e07cbed-22c0-4b69-a8e5-887e0c6aa09e_en?filename=LV_FINAL%20UPDATED%20NECP%202021-2030%20%28English%29_0.pdf ; https://commission.europa.eu/document/download/f8ec48e2-bf81-4ed9-b3be-1b3b57294ffc_en?filename=LV_Annex_3_Parameters%20and%20variables.pdf
24. Litgrid AB, *Dešimties metų tinklo plėtros planas 2026–2035*, PDF dated 1 Jul 2026. https://www.litgrid.eu/litgrid-tinklo-pletros-planas-2026-2035
25. Litgrid AB, *Elektros gamybos ir vartojimo balanso duomenys*, quarterly national balance workbook 2012–2026 Q2 (xlsx). https://www.litgrid.eu/ketvirtiniai-2 (page: https://www.litgrid.eu/sistema/elektros-energetikos-sistema/elektros-gamybos-ir-vartojimo-balanso-duomenys)
26. Litgrid AB, *Tinklų plėtros planas 2016–2025*, Oct 2016. https://www.litgrid.eu/litgrid-tinklu-pletros-planas-2016-2025
27. Litgrid AB, *Tinklų plėtros planas 2018–2027*, Jun 2018. https://www.litgrid.eu/litgrid-tinklu-pletros-planas-2018-2027
28. Litgrid AB, *Plėtros planas 2020–2029*, Jun 2020. https://www.litgrid.eu/litgrid-pletros-planas-2020-2029
29. Litgrid AB, *Tinklo plėtros planas 2022–2031*, Sep 2022. https://www.litgrid.eu/litgrid-tinklo-pletros-planas-2022-2031
30. Litgrid AB, *Tinklo plėtros planas 2024–2033*, Jul 2024. https://www.litgrid.eu/litgrid-tinklo-pletros-planas-2024-2033
31. Litgrid news, "„Litgrid“ užbaigė Kuprioniškių transformatorių pastotės statybą „Teltonikos“ technologijų parko projekte", 16 Sep 2026. https://www.litgrid.eu/naujienos/litgrid-uzbaige-kuprioniskiu-transformatoriu-pastotes-statyba-teltonikos-technologiju-parko-projekte
32. Litgrid news, "Litgrid has launched Transmission network consumption capacity map", 3 Mar 2026. https://www.litgrid.eu/index.php/news-events-/news/litgrid-has-launched-transmission-network-consumption-capacity-map/36483
33. IEA, *Lithuania 2025 – Energy Policy Review*, Jun 2025. https://iea.blob.core.windows.net/assets/0f37fbed-856d-4fde-8f2b-4db10d9bfd2a/Lithuania2025.pdf
34. Republic of Lithuania, *Final updated NECP 2021–2030* (EN), EC publication 7 Oct 2024. https://commission.europa.eu/document/download/e4569d35-7ab0-4445-8fa6-017357d04546_en?filename=LT_FINAL%20UPDATED%20NECP%202021-2030%20%28English%29.pdf
35. Seimas of Lithuania, *National Energy Independence Strategy*, Resolution XI-2133, 26 Jun 2012 (EN). https://e-seimas.lrs.lt/rs/legalact/TAD/TAIS.432271/
36. ENTSO-E, *ERAA 2025 Dashboard Raw Data* (Aggregated_Demand.csv, versions "ERAA 2024", "ERAA 2025 pre-CfE", "ERAA 2025 final"; files dated 2 Feb 2026). https://eepublicdownloads.blob.core.windows.net/public-cdn-container/clean-documents/sdc-documents/ERAA/ERAA_2025_Dashboard_RawData.zip (page: https://www.entsoe.eu/eraa/2025/modelling-data/)
37. ENTSO-E, *ERAA 2025 Annex 1 – Input data* (ENTSO-E proposal for ACER approval), Dec 2025. https://eepublicdownloads.blob.core.windows.net/public-cdn-container/clean-documents/sdc-documents/ERAA/ERAA_2025_Annex1_InputData_ENTSOEProposal_Dec2025.pdf
38. ENTSOG & ENTSO-E, *TYNDP 2026 Scenarios – ETM Dashboard* (xlsx, 11 Jun 2026; CC BY 4.0). https://2026-data.entsos-tyndp-scenarios.eu/main-documents/TYNDP2026_ETM_DASHBOARD.xlsx (download page: https://2026.entsos-tyndp-scenarios.eu/download/)
39. Eurostat, *nrg_cb_e – Supply, transformation and consumption of electricity*, updated 11 Sep 2026. https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_cb_e?format=JSON&lang=en&geo=EE&geo=LV&geo=LT&siec=E7000&unit=GWH&sinceTimePeriod=2019
40. Carvallo, J.P., Larsen, P.H., Sanstad, A.H., Goldman, C.A. (2018). Long term load forecasting accuracy in electric utility integrated resource planning. *Energy Policy* 119, 410–422. https://doi.org/10.1016/j.enpol.2018.04.060
41. O'Neill, B.C., Desai, M. (2005). Accuracy of past projections of US energy consumption. *Energy Policy* 33(8), 979–993. https://doi.org/10.1016/j.enpol.2003.10.020 (read via IIASA Interim Report IR-03-053: http://pure.iiasa.ac.at/id/eprint/7030/1/IR-03-053.pdf)
