# Poland (PL price zone): electricity demand outlook

Research note for the open Baltic electricity market model. Prepared 2026-09-24.
Numbers in [brackets] refer to the numbered source list at the end. Every figure comes from a source opened during this research, either as a document or as a data file I downloaded and parsed. Anything I could not confirm is marked **unverified**. Values labelled "derived" are my own arithmetic on the cited figures.

---

## 0. Definitions: read these before comparing numbers

The sources use several different demand definitions, and the gap between them is 5–20 TWh.

| Label used here | What it is | Source of the definition |
|---|---|---|
| **PSE gross** ("krajowe zużycie energii elektrycznej") | Domestic production plus net imports, from PSE operational data. It includes power-plant own use, pumped-storage pumping and network losses. URE calls the same 2024 value (168,956 GWh) gross consumption ("brutto"). | [2], [6] |
| **PSE net** ("zapotrzebowanie netto") | Demand of customers connected to the transmission and distribution networks, and directly to other companies' installations, **plus network losses**. It excludes power-plant own use. | [10] p.32; [12] p.38 |
| **Eurostat-type gross** (KPEiK, PEP) | Energy-balance "krajowe zużycie brutto". Published in ktoe; converted here at 1 ktoe = 11.63 GWh. Its 2020 value (171.3 TWh) is 3.5% above PSE gross for 2020 (165.5 TWh) (derived). | [15] Tab. 3.7; [16] Tab. 3.11 |
| **ERAA / TYNDP demand** | ENTSO-E market-model load. Flexible loads (electrolysers, part of EV charging) are partly modelled endogenously, so they are not always in the "annual demand" number. See the notes in §2. | [24], [26], [28] |

Caveat: PSE's April 2026 plan says its load profiles include on-site consumption, including prosumer self-consumption ([10] p.32). It does not say whether the **historical** net series (Rys. 3-8) includes it. That is **unverified**. In 2023 gross demand fell 3.4% while net demand rose 1.1%, which points to a definitional difference such as prosumer PV.

---

## (a) Actual consumption 2019–2025 (+2026 year to date)

| Year | PSE gross (GWh) | y/y | PSE net (TWh) | y/y | Domestic production (GWh) | Net import (GWh, derived) | Annual peak (MW, date) |
|---|---|---|---|---|---|---|---|
| 2019 | 169,391 | – | 155.4 | −0.8% | 158,767 | 10,624 | 26,504 (25 Jan) |
| 2020 | 165,532 | −2.28% | 151.8 | −2.3% | 152,308 | 13,224 | 26,799 (10 Dec) |
| 2021 | 174,402 | +5.36% | 159.7 | +5.2% | 173,583 | 819 | 27,617 (12 Feb) |
| 2022 | 173,479 | −0.53% | 158.1 | −1.0% | 175,157 | −1,678 (net export) | 27,296 (16 Dec) |
| 2023 | 167,518 | −3.44% | 159.9 | +1.1% | 163,629 | 3,889 | 27,326 (28 Nov) |
| 2024 | 168,956 | +0.86% | 162.4 | +1.6% | 166,990 | 1,966 | 28,494 (9 Jan) |
| 2025 | 167,484 | −0.87% | 160.9 | −0.9% | 166,529 | 955 | 27,550 (24 Nov) |

Sources:
- Gross, production and peak: PSE annual KSE reports for 2020, 2021, 2023, 2024 and 2025 [1]–[5].
- 2024 gross and production confirmed by URE [6].
- 2025 gross also reported by PAP/HorecaTrends [7] (−0.87%).
- Net series read from PSE PRSP 2027–2036, Rys. 3-8, p.20 [10]. The chart labels, its y/y bars and PSE's own "+14 TWh / 0.96% CAGR 2015–2025" statement (p.19) are mutually consistent.

**Realised growth (derived):**
- PSE gross CAGR: 2020→2025 **+0.23%/yr**; 2019→2025 **−0.19%/yr**; 2021→2025 **−1.0%/yr**.
- PSE net CAGR: 2020→2025 **+1.17%/yr**; 2019→2025 **+0.58%/yr**.
- PSE reports net demand CAGR of 0.96% over 2015–2025. Peak CAGR over the same years was 0.64% (summer) and 0.98% (winter) ([10] pp.19–20).
- Bottom line: demand has been flat since 2021. The 2021 rebound after COVID has not been exceeded.

**Other data points:**
- **Households:** 30,727.6 GWh in 2025 (+1.1% y/y), per GUS as reported by PortalKomunalny on 21 Sep 2026 [9].
- **2026 year to date:** January–July 2026 PSE gross was 100.57 TWh, **+4.03% y/y**. July alone was 13.47 TWh (+0.77%) [8]. The cause (weather versus structural) is **unverified**. For reference, PSE's adequacy path expects 2026 net demand of 167.0 TWh, +3.8% on 2025 net ([10] Tab. 10.1; derived). The year to date is on that path, but the definitions differ.
- **Peak:** the highest peak in the period was 28,494 MW on 9 Jan 2024. The 2025 peak was 27,550 MW, and the 2025 minimum was 18,819.9 MW (7 Aug) [1].

---

## (b) Forecasts

### (b1) Official, TSO and ENTSO-E forecasts

| # | Source (publisher, date) | Scenario / variant | Demand basis | 2030 TWh | 2035 TWh | 2040 TWh | Peak GW | Included drivers |
|---|---|---|---|---|---|---|---|---|
| 1 | PSE, PRSP 2027–2036, draft after consultation (Apr 2026) [10] Rys. 4-1 p.25; text p.23 | Network planning, severe-weather year (SWS) | PSE net | **194** | **221** (2036: 230) | **264** (text: "about 260") | ">45" in 2040 (p.23); total incl. storage/pumping "may reach 50 GW" (p.46) | Base; existing industry; new industrial loads; home heat pumps; EVs; data centres; e-boilers and industrial heat pumps; electrolysers (breakdown in b2) |
| 2 | Same, Tab. 4.6 p.32 | Network model, mean of weather scenarios (min–max) | PSE net | – | 2036: 224.8 (220.5–230.2) | 254.4 (249.2–261.0) | – | Same as #1 |
| 3 | Same, Tab. 10.1–10.2 pp.95–96 | Adequacy analysis: mean (min–max) of weather scenarios | PSE net | **181.4** (178.5–184.8) | **203.0** (199.6–208.3) | **230.0** (226.2–236.7) | Mean 29.7 / 34.4 / 39.8; max 32.4 / 38.3 / 44.7 | Only the static part of EV and H2 demand; **data centres at 50%** of the network-model value (p.95). 2026: 167.0 TWh, peak mean 27.0 GW |
| 4 | PSE, NRAA 2025–2040 (Nov 2024) [13] Rys. 4-1 p.16, Rys. 4-2 p.17 | Reference | PSE net | 181 | 198 | 215 | 29 / 33 / 37 (average of climate years) | Base; heat pumps; EVs; data centres; e-boilers and utility heat pumps; green H2 (§4.1) |
| 5 | PSE, PRSP 2025–2034 (Dec 2024) [12] pp.34, 37, 40, 42 | SDT ("dynamic transition"), SWS year, **2034** | PSE net | 2034: 205.7 excl. EVs and potential named loads; **243.2** incl. them | – | – | 2034 winter peak 38.5 / 42.8 | EVs (6.3 TWh in 2034), heat pumps, data centres, e-boilers, H2. Loads in special economic zones (>3.5 GW potential) treated as a sensitivity |
| 6 | **KPEiK** (NECP), adopted by the Council of Ministers 8 Jun 2026; Annex 1 WAM (ARE modelling) [14], [15] Tab. 3.7 p.67, Tab. 3.8 p.68, Tab. 2.3 p.46 | WAM (accelerated transformation) | Eurostat-type gross consumption | **194.7** | **220.6** | **266.7** | n/a | EVs, individual and district heat pumps, e-boilers, industry, electrolysis (6 / 13 / 38 TWh in 2030/35/40, Tab. 3.6 p.66). Gross production 196.5 / 223.8 / 270.5; final electricity 151.9 / 162.9 / 175.9 |
| 7 | KPEiK Annex 2 WEM [16] Tab. 3.11 p.67, Tab. 3.12 p.68, Tab. 2.3 p.41 | WEM (reference) | Eurostat-type gross consumption | 189.5 | 205.7 | 240.4 | n/a | Same drivers. Gross production 195.8 / 212.1 / 249.2; final 155.2 / 165.3 / 178.0 |
| 8 | PEP2040 (adopted Feb 2021), Annex 2 [21] Tab. 36 p.40 (demand taken from PSE's PRSP 2021–2030); Tab. 12 p.16 | PEP2040 scenario | PSE net (Tab. 36) | 181.1 | 191.9 | 204.2 | 27.7 / 29.5 / 31.3 (net) | EVs and heat pumps. Eurostat gross 201.2 / 212.7 / 225.8 |
| 9 | ENTSO-E ERAA 2025 (17 Dec 2025) [24], [25] | Central reference, mean over climate years (min–max) | ERAA annual demand | **177.9** (175.0–181.9) | **196.7** (192.6–202.6) | – | Max hourly 27.6 (2030), 30.7 (2035); 2028: 26.4 | 2028: 169.7 TWh; 2033: 187.9 TWh |
| 10 | ENTSO-E ERAA 2024 (same data file) [24] | Central reference | ERAA annual demand | 189.0 | 203.4 | – | Max hourly 30.9 / 34.4 | 2028: 178.9 TWh |
| 11 | ENTSO-E/ENTSOG TYNDP 2024, NT (National Trends) model output, climate year 2009 [26] | NT | Native demand, excl. pumping and battery charging | **188.9** + 2.3 electrolysis (2 GW) | – | **223.4** + 10.0 electrolysis (4 GW) | – | Whether native demand already contains the electrolyser load is **unverified** (the file reports them separately) |
| 12 | TYNDP 2024 DE / GA 2040 outputs, CY2009 [26] | Distributed Energy / Global Ambition | Split across nodes | – | – | Main PL00 node 123.2 / 109.6; EV nodes 18.1 / 10.4; "PL00RETE" node 80.0 / 72.5; electrolysis 64.5 (15.4 GW) / 86.8 (16.5 GW) | – | Top-down EU scenarios. The totals cannot be summed reliably (the RETE node meaning is **unverified**) |
| 13 | TYNDP 2026 **draft** NT+ inputs (Jun 2026) [28] Demand.zip; Annexes p.22, p.29; Methodology p.21 | NT+, three weather scenarios per year | **Exogenous load only:** market node (incl. grid losses, data centres, heavy transport) + prosumer heat pumps + fixed EV charging | 161.8–163.0 | 172.1–174.6 | 186.6–191.2 | – | Excludes flexible EV charging and electrolysers, which are modelled endogenously. **Poland's input came from the Oct 2024 NECP draft (WAM)**, not the adopted June 2026 KPEiK |

Status notes:
- **PRSP 2027–2036:** the version read is the "projekt po konsultacjach" (PDF dated April 2026). The consultation ran until 23 Feb 2026 [11]. Whether URE has approved it is **unverified**.
- **PEP2040 update:** no updated PEP2040 has been adopted. The 2023 "small update" was abandoned (Instrat, 5 Jul 2023 [23]). The same note reports a 2023 ministry pre-consultation scenario of about 200 TWh in 2030 and 244 TWh in 2040 (secondary; the primary was not opened). The operative strategic document is the KPEiK adopted on 8 Jun 2026 [19]. A draft was approved in July 2025 [20] and a new draft published on 17 Dec 2025 [18]. The ministry summarised demand as "about 200 TWh in 2030 and 270 TWh in 2040" [18]; the adopted annex tables give 194.7 / 266.7 TWh (gross consumption, WAM).
- **KPEiK and data centres:** the KPEiK names data centres and AI as a demand driver [19]. A text search of Annexes 1 and 3 found no itemised data-centre load, so whether it is embedded in the forecast is **unverified**.

### (b2) PSE PRSP 2027–2036 breakdown (network model, SWS weather year, TWh) [10] Rys. 4-1 p.25; Tab. 4.1–4.5 pp.27–31

| Component | 2036 | 2040 |
|---|---|---|
| Base demand ("podstawa") | 118.7 | 115.7 |
| Industry, existing | 41.0 | 38.8 |
| Industry, new loads | 15.0 | 18.8 |
| Home heat pumps | 15.1 | 19.4 |
| EVs | 8.9 | 16.2 |
| Data centres | 16.8 (Tab. 4.3: 17.4) | 28.8 (Tab. 4.3: 29.4) |
| E-boilers + industrial heat pumps (district heating) | 7.8 | 10.9 |
| Electrolysers (connected to KSE) | 7.3 (range 3.9–13.1) | 15.5 (range 6.5–21.7) |
| **Total** | **230** | **264** |

### (b3) Driver assumptions compared

| Driver | PSE PRSP 2027–2036 [10] | KPEiK 2026 [15]–[17] | Others |
|---|---|---|---|
| EVs | 235k in Nov 2025 (113k BEV + 109k PHEV + vans/buses) → 3.219 m in 2036 → 5.324 m in 2040; 0.5 → 8.9 → 16.2 TWh (Tab. 4.1) | WAM electric passenger cars: 209k (2025), 803k (2030), 1.995 m (2035), 4.257 m (2040). WEM: 870k in 2030, 3.013 m in 2040 (Annex 3 Tab. 2.25–2.26 p.45) | – |
| Home heat pumps | 767k in 2024 → 3.06 m in 2036 → 3.97 m in 2040; 3.7 → 15.1 → 19.4 TWh (Tab. 4.2) | WAM: 807k (2025), 1.567 m (2030), 2.39 m (2035), 3.252 m (2040). WEM: 2.607 m in 2040 (Tab. 2.27–2.28) | Instrat: about 350k installed per year over 2030–40 [29] |
| Data centres | 200 MW (2024, Polish Data Center Association) → 3,093 MW (2036) → 5,018 MW (2040); 0.6 → 17.4 → 29.4 TWh (Tab. 4.3). Implied load factor 64–67% (derived). Main locations: Warsaw, Poznań, Kraków, Wrocław | Not itemised (see above) | PRSP 2025–2034 assumed 1,063 MW and 9.3 TWh by 2034, as reported by WysokieNapiecie [34]. **Unverified** in the PSE text, where the figure appears only in charts |
| Electrolysers | 1,500 MW (2036), 2,480 MW (2040). Must-run at 30% of capacity; above that only when the price is below 0.36 × the EUA price (RFNBO rule, Reg. 2023/1184) (Tab. 4.4, p.29) | Up to 2 GW by 2030 at about 5,300 h/yr (Polish Hydrogen Strategy). Capacity "multiplied" by 2040; about 825 kt of renewable H2 in 2040 (Annex 3 p.41). Load 6 / 13 / 38 TWh | TYNDP 2024 NT: 2 GW (2030), 4 GW (2040) [26]. Instrat: 15 GW by 2040, or 8 GW in its "less hydrogen" variant [29] |
| E-boilers / industrial heat pumps | E-boilers 76 MW (2025) → 1,635 MW (2036) → 2,370 MW (2040). Industrial heat pumps 483 / 1,069 MW. Heat storage 7.4 → 47.5 → 70.1 GWh (Tab. 4.5) | Included (district-heating heat pumps and e-boilers) | – |

### (b4) Independent analyses

| Source | Scenario | Figure | Notes |
|---|---|---|---|
| Instrat Policy Paper 03/2025, Kubiczek, Nowak, Smoleń (Dec 2025) [29] p.19, p.54 | Main (PyPSA-PL) | Net demand about **148 TWh (2025) → about 282 TWh (2040)**. About 265 TWh with slower electrolysis; about 5 TWh less with slower heat-pump uptake; about 40 TWh less in the "less RES" variant (p.31) | "Net" here excludes plant own use, network losses and storage losses. The 2025 base is lower than PSE net because the definition differs |
| Forum Energii, "Elektryfikacja dla bezpieczeństwa", M. Dusiło (17 Jul 2026) [30] p.5; press coverage [31] | Accelerated electrification | Demand in 2040 **67 TWh (+38%) above KPEiK WAM** | Consistent with WAM final electricity of 175.9 TWh, which implies about 243 TWh final electricity (derived). Electrification 42.9% vs 26.3% in KPEiK |

---

## (c) Industrial electrification, hydrogen and data-centre projects

### (c1) Large non-data-centre loads in PSE's connection register (transmission level, as of 31 Jul 2026) [32]

MW is the connection capacity for withdrawal from the grid ("pobierana").

| Applicant / project | Connection point | MW | Status (date) | Note |
|---|---|---|---|---|
| ArcelorMittal Poland S.A. | Tucznawa substation (Dąbrowa Górnicza area) | 800 | **Connection agreement in force** (conditions 16 Aug 2022; agreement 16 Aug 2024) | Purpose not stated in the register. An electric-arc-furnace project is plausible but **unverified** |
| RE Alloys Sp. z o.o. (production plant) | Kopanina | 148 | Agreement 27 Mar 2026 | Industrial plant |
| ORLEN Termika, EC Żerań | Praga (Warsaw) | 128 | Agreement 27 Apr 2026 | Consumer connection at a CHP plant. Power-to-heat is likely but **unverified** |
| Gmina Szczecinek, "Invest Park" | Żydowo Kierzkowo | 360 | Conditions 3 Feb 2026 | Industrial park; tenants unknown |
| PKP PLK traction substations | Norki/Kijewo; Suwałki | 20 + 18 | Agreements 30 Jun 2026 | Rail |
| MP Production (industrial gases, Turek) | Adamów | 14 | Agreement 20 Nov 2020 | – |
| Polskie Elektrownie Jądrowe (nuclear site own needs) | Żarnowiec | 100 | Conditions 31 Oct 2023 | – |

PSE's own totals for new industrial load (network model): "Przemysł (nowe odbiory)" of **15.0 TWh (2036) and 18.8 TWh (2040)** ([10] p.25). The previous plan put the potential in special economic zones at **more than 3.5 GW** of load within 10 years, still at an early concept stage ([12] p.37).

### (c2) Hydrogen

| Project | Location | Electrolysis MW | Output | Status / date | Funding | Source |
|---|---|---|---|---|---|---|
| Orlen **Green H2** (Lotos Green H2) | Gdańsk refinery | 100 MW + 20 MWh battery | about 9 kt/yr | Full operation from **2030** | KPO grant PLN 523.2 m | [46] pp.37–39; [48] |
| Orlen **Hydrogen Eagle**: HUB Offshore | not stated | 100 MW | – | Planned | Part of KPO PLN 1,215.7 m (Hub Offshore, Hub North, Hub South, Waste-to-H2 Płock); IPCEI Hy2Use | [46] p.35 |
| Hydrogen Eagle: local hubs | various | 10 MW each | – | Planned | as above | [46] p.35 |
| Hydrogen Eagle: Waste-to-Hydrogen | Płock | n/a (not electrolysis) | 15 kt/yr | Planned | as above | [46] p.35 |
| Orlen **Green Hydrogen for Refinery** | refinery (site not stated) | 200 MW | – | Planned; the refinery programme totals about 400 MW (with HUB Offshore and Green H2) | – | [46] p.37 |
| Orlen **HyFly** (e-SAF) | Gdańsk | about 230+ MW (portfolio) | about 70+ kt synthetic hydrocarbons | Concept. **PSE issued connection conditions for 840 MW** ("GGR HyFly Gdańsk", 1 Oct 2025) | – | [46] p.41; [32] |
| Orlen HUB Szczecin | Szczecin | about 5 MW | about 90 kg/h | Commissioning end-2027 / early 2028 | EU CEF AFIF grant €62.3 m (project with 16 refuelling stations) | [47]; [46] p.11 |
| Orlen HUB Włocławek | Włocławek | by-product of brine electrolysis (existing plant) | about 2,500 t/yr from 2024 (modular, up to 4,500) | Operating | – | [46] p.13 |
| Orlen HUB Trzebinia | Trzebinia | by-product (glycol complex) | 350 t/yr | Operating since 2021 | – | [46] p.9 |
| Polenergia **H2Silesia** | Silesia | about 105 MW | 13 kt/yr | KPO grant awarded Jun 2025. Polenergia announced a gradual exit from hydrogen (Mar 2025), so **status unverified** | KPO PLN 618.3 m; IPCEI Hy2Infra €142.8 m | [48], [49] |
| Tauron HP-HRS; Bioagra; Promet-Plast (Gaj Oławski, expansion of an existing electrolyser) | – | Not stated (programme minimum 20 MW per installation) | – | KPO grants of PLN 133.1 m / 128.2 m / 123.2 m | KPO B2.1.1 | [48] |
| NRG 25: "Krzemienica Hydrogen HUB" | Krzemienica | 390 (grid withdrawal) | – | PSE conditions 19 Jan 2026 | – | [32] |
| NRG 25: "Choczewo Hydrogen Hub" | Choczewo | 390 | – | PSE conditions 27 Jan 2026 | – | [32] |

KPO hydrogen call: 15 applications. Six beneficiaries received PLN 2.741 bn, with at least **315 MW** of electrolysis required in total ([48]). Whether these projects will be completed is **unverified**; the KPO's general end date is August 2026.

### (c3) Data centres

**Operating or company-published capacity:**

| Operator / project | Location | Capacity | Status | Source |
|---|---|---|---|---|
| Microsoft Azure "Poland Central" | Warsaw | MW not disclosed | Live region with 3 availability zones | [41] |
| Google Cloud Warsaw region | – | – | **Unverified** (no opened source confirmed it) | – |
| DATA4 Campus Warsaw | Jawczyce (Przyparkowa 21) | "up to 60 MW" IT, 4 ha | Listed as an operating campus | [42] |
| Vantage WAW1 | Warsaw (Zgrupowania AK Kampinos 42D) | 48 MW critical IT; 2 buildings; 36,000 m² | Page uses the future tense; build-out stage **unverified** | [43] |
| Atman | Warsaw (WAW-2, Warsaw-3) | "4 data centers in Poland"; MW not given | Operating | [44] |
| EdgeConneX | – | No Poland location on its homepage | **Unverified** / possibly none | [45] |
| Beyond.pl | Poznań | 150 MW AI-oriented facility | Reported | [39] |
| Budimex (Ferrovial) | – | Five data centres, 60 MW total, about PLN 2 bn | Announced | [39] |

**Data-centre applications in PSE's connection register (as of 31 Jul 2026)** [32]:

- **Connection conditions issued, 9,035 MW across 15 entries.** No entry has a connection agreement yet.
  - WBS Power / WBS Power Prosta, **6,990 MW**:
    - Chynowo, stages 2, 3, 6 and 7 at Choczewo plus stage 5 at Gdańsk Przyjaźń: 5 × 800 MW.
    - Suczki (Ełk): 590 MW.
    - Stoszowice (Świebodzice): 800 MW.
    - Pałowo I+II (Krzemienica): 1,600 MW.
    - All conditions issued Feb–Apr 2026.
  - Industry Park Czerniewice (Rogowiec): 800 + 300 MW, Feb 2026.
  - Data Center Bełchatów, "Serwerownia Dobiecin" (Rogowiec): 500 MW, 11 Feb 2026.
  - NLighten, Komorniki near Poznań: 230 MW, 1 Sep 2025.
  - CGE 171FF, "Data Center Konin 1" (Pątnów): 135 MW, 16 Sep 2025.
  - HiPark Piaseczno: 80 MW, 14 Nov 2024.
- **Under review:**
  - Central Airport (CPK) Data Center: 500 MW.
  - LF 16 "Data Center Warszawa-4": 150 MW (filed 22 Dec 2025).
  - Corts, Sękocin Stary: 40 MW.
  - Lightsource Development "telecom service nodes" at Plewiska and Polkowice: 300 + 250 MW. Classifying these as data centres is **unverified**.
- **Refused:** WBS Power Magnuszew I+II (Kozienice), 1,600 MW.

**Market size and pipeline statistics:**
- **Existing load.** PSE (citing the Polish Data Center Association) puts it at about 200 MW and 0.6 TWh in 2024 ([10] Tab. 4.3). The association itself, via MuratorPlus, says about 200 MW and **1.7–1.8 TWh/yr** [40]. PMR says 200+ MW in 2025 and a possible 600 MW by 2030 [39]. WysokieNapiecie says about 250 MW in 2025, and cites an EUDCA forecast of about 550 MW by 2031 [35].
- **PSE, transmission level:**
  - Early applications totalled **150–200 GW**. After the deposit rules, PSE has "kilkanaście" (a dozen or so) applications and has issued conditions for **more than 6 GW** (Gramwzielone, 24 Aug 2026 [36]).
  - In March 2025 the figures were more than 1 GW issued and about 13 GW pending [34].
  - From 1 Aug 2025 PSE changed its queue rules: storage and generation applications with no deposit paid are rejected, and saturated substations are refused outright. About 900 applications were pending at the time [37].
- **Distribution operators, March 2025** [34]:
  - Stoen: 120 MW connected, more than 330 MW in progress, about 930 MW of conditions issued, about 2 GW of interest.
  - Energa-Operator: 180 MW issued, 255 MW pending.
  - PGE Dystrybucja: about 9 MW connected; 208 MW for 34 data centres over 5 years.
  - Tauron: 120 MW in procedure.
- **Distribution operators, August 2026** [38]:
  - Energa-Operator: 13 data-centre conditions issued, 1 agreement signed.
  - Tauron: data centres are about 8% of cases above 8 MW, requesting more than 0.5 GW.
  - All DSOs together: more than 3 GW in agreements and applications [35].
- **Large announced projects** (WysokieNapiecie, 25 Jun 2026 [35]): Dąbrowa Górnicza 200 MW, Konin 260 MW, Bełchatów 500 MW, Choczewo 3.2 GW. Their developers say financing is still to be found.

### (c4) All large consumers: aggregated connection pipeline (PSE + five DSOs; DSOs as of 30 Jun 2026, PSE as of 31 Jul 2026) [33]

This counts all consumer installations ("ODB") above 1 kV. The source does not split it by consumer type.

| Stage | Consumer connection capacity (GW) |
|---|---|
| Applications: in verification / complete / incomplete / withdrawn | 0.9 / 4.0 / 4.9 / 4.4 |
| Conditions issued / refused / expired | **22.2** / 2.1 / 0.6 |
| Agreements in force / terminated / connected in the period | **13.3** / 0 / 0.9 |

- Conditions and agreements together total **35.5 GW** (Tab. 3): 11.2 GW at 400 kV, 0.8 at 220 kV, 8.1 at 110 kV and 15.4 at MV. That is 2,835 sets of conditions and 1,273 agreements (charts 4 and 6).
- PSE also notes that more than 750 projects of all types held connection conditions at end-2025, but only a small part are being built ([10] p.17).

---

## (d) Realism assessment

### (d1) Past forecasts versus outcomes

| Forecast (vintage) | Target | Forecast | Outcome | Error |
|---|---|---|---|---|
| PEP2030, Annex 2 (Nov 2009), gross [22] Tab. 11 p.14 | 2020 | 169.3 TWh | 165.5 (PSE gross) | +2.3% |
| same | 2025 | **194.6 TWh** | **167.5** | **+16.2%** |
| same, peak (p.14; the text says "MW", evidently GW) | 2030 | about 34.5 GW | record so far 28.5 GW (2024) | pending |
| PEP2040 / PSE PRSP 2021–2030 (2020–21), net [21] Tab. 36 | 2020 | 159.9 | 151.8 (PSE net) | +5.3% (COVID year) |
| same | 2025 | **170.1** | **160.9** | **+5.7%** |
| same, net peak | 2025 | 25.9 GW | 27.55 GW (PSE annual report; definition may differ) | −6% (under-forecast) |
| PSE NRAA (Nov 2024), net [13] | 2025 | 162 | 160.9 | +0.7% |
| KPEiK 2026 edition, "2025" column, Eurostat-type gross (WAM / WEM) | 2025 | 176.4 / 181.8 | about 173.3 (PSE gross × the 2020 Eurostat/PSE ratio of 1.035; derived estimate) | about +2% / about +5% |

Pattern: long-range Polish demand forecasts have overshot, by 5–16% over 5–16-year horizons. Near-term PSE forecasts made one year ahead have been accurate.

### (d2) Direction of recent revisions
- **ENTSO-E ERAA 2024 → 2025** cut Poland's demand by 9.2 TWh (−5.1%) in 2028, by **11.1 TWh (−5.9%) in 2030** and by 6.8 TWh (−3.3%) in 2035 [24].
- **PSE moved the other way.** The PRSP 2025–2034 targeted "more than 240 TWh net and up to 42 GW" for 2034 in a scenario that includes named potential loads ([12] p.34). The PRSP 2027–2036 targets "about 260 TWh and more than 45 GW" for 2040. Its 2036 data-centre assumption (3.1 GW) is roughly three times the 1.06 GW for 2034 in the previous plan (the latter figure as reported by WN [34]).
- **Within PSE's April 2026 document** the 2040 value varies from 230 TWh (adequacy mean) to 254.4 (mean weather, network model) to 264 (severe-weather design year). The document explains the difference: the adequacy runs use only the static part of EV and H2 demand and **halve data-centre demand** ([10] p.95). PSE's network plan is therefore an upper envelope, and it says so.

### (d3) Announced versus realised load
- **Growth required versus growth achieved.** From the 2025 PSE net base, the forecasts imply these annual growth rates to 2030 (derived):
  - PSE adequacy mean: 2.4%/yr.
  - PSE network SWS: 3.8%/yr.
  - ERAA 2025: 2.0%/yr.
  - KPEiK WAM, on a like-for-like Eurostat base: 2.35%/yr.

  Realised growth was 0.6%/yr (net, 2019–25) and −0.2%/yr (gross, 2019–25). 2026 year to date is +4.0% (gross), and one partial year does not establish a trend.
- **Connection queues are far larger than any forecast.**
  - Consumers above 1 kV hold **35.5 GW** of conditions or agreements [33]. That is 1.3 times the whole 2025 system peak (27.55 GW), while only 0.9 GW was reported as connected in the latest period.
  - For data centres: early inquiries of 150–200 GW, now a dozen or so live applications [36]. PSE's register holds 9.0 GW of issued data-centre conditions, 77% of it from one developer and none with an agreement [32].
  - The current data-centre load is about 0.2–0.25 GW.
  - PSE's network case needs 25.6%/yr compound growth in data-centre capacity (200 MW in 2024 → 3,093 MW in 2036; derived). The adequacy case halves that energy.
- **Hydrogen lags policy.**
  - The strategy target used in KPEiK is up to 2 GW of electrolysis by 2030 [17]. KPEiK WAM's 6 TWh in 2030 implies about 1.1 GW at 5,300 h (derived).
  - The largest identifiable projects are 100 MW units with full operation only from 2030 [46], one KPO beneficiary is exiting hydrogen [49], and the whole KPO call requires only at least 315 MW [48]. PSE assumes 1.5 GW only by 2036 [10].
  - Judgment: electrolysis load in 2030 is likely to be well below 1 GW. Treat it as flexible and price-driven, as PSE does (30% must-run; RFNBO price threshold).
- **Heat pumps and EVs** are the most bankable drivers but need a step change.
  - KPEiK WAM needs about 138k net new BEV passenger cars per year over 2026–30 (derived: 113k in Nov 2025 → 803k in 2030). The combined BEV+PHEV stock grew by about 81k between end-2024 and Nov 2025 (derived from [10] Rys. 4-2).
  - PSE assumes about 190k home heat pumps per year to 2036 (derived from 767k → 3.06 m). Recent sales were not researched (**unverified**).
- **Steel.** ArcelorMittal's 800 MW agreement in force at Tucznawa [32] is the strongest single industrial-electrification signal found. No investment decision was found, so its timing is **unverified**.

### (d4) Contradictions found
1. PSE 2040 values in one document: "about 260 TWh" (text) vs 264 (chart, SWS) vs 254.4 (mean weather) vs 230.0 (adequacy) [10].
2. Data centres in 2036: 3,093 MW (PSE Tab. 4.3) vs "about 3.5 GW" attributed to the same PSE plan by Gramwzielone [36]. Data-centre energy: 17.4 TWh (table) vs 16.8 TWh (map, Rys. 4-10) in 2036, and 29.4 vs 28.8 in 2040 [10].
3. Data-centre energy today: PSE says 0.6 TWh from 200 MW (2024) [10]; the Polish Data Center Association says 1.7–1.8 TWh from about 200 MW [40].
4. Data-centre conditions issued: "more than 6 GW" (news, Jun–Aug 2026 [35], [36]) vs 9.0 GW of data-centre-named entries in PSE's register on 31 Jul 2026 [32]. This may be timing (the WBS conditions date from Feb–Apr 2026) or phases counted separately (**unverified**).
5. Existing data-centre capacity: 200 MW (2024) [10] vs 200+ MW (2025) [39] vs about 250 MW (2025) [35].
6. 2023 direction: PSE gross −3.4% vs PSE net +1.1% (§0).
7. KPEiK headline "about 200 / 270 TWh" (Dec 2025 draft communication [18]) vs adopted annex tables: gross consumption 194.7 / 266.7 and gross production 196.5 / 270.5 [15].
8. HyFly: 840 MW of grid connection conditions [32] vs "about 230+ MW" of electrolysis in Orlen's portfolio [46]. The difference could be later phases or other loads (**unverified**).
9. TYNDP 2026 NT+ uses Poland's October 2024 NECP draft [28], not the final KPEiK of June 2026.

### (d5) Implications for the Baltic model (my judgment, not a source statement)
- **Central path.** Use the PSE adequacy mean or ERAA 2025, which agree within 2%: about 178–181 TWh in 2030, about 197–203 TWh in 2035 and about 230 TWh in 2040 (PSE net basis). Mean peak: about 29.7 GW (2030), 34.4 GW (2035), 39.8 GW (2040) [10], [24].
- **High path.** PSE network values: 194 / 221 / 254–264 TWh. KPEiK WAM, on a gross basis, reaches about 267 TWh in 2040.
- **Low path.** A continuation of the recent trend at +1%/yr from the 2025 net base gives about 169 / 178 / 187 TWh (derived). This is close to TYNDP 2026 NT+ exogenous load (about 162 / 173 / 187–191 TWh) before flexible loads are added.
- **Model structure.** Model electrolysers, e-boilers and smart EV charging as price-responsive load, not as fixed energy. Put the data-centre and hydrogen uncertainty in scenarios rather than the base case: the PSE register shows these loads are concentrated in a few speculative developers.

---

## Sources

1. PSE, "Raporty za rok 2025" (annual KSE operation data: domestic consumption 167,484 GWh; production; peak/minimum demand), 2026. https://www.pse.pl/dane-systemowe/funkcjonowanie-kse/raporty-roczne-z-funkcjonowania-kse-za-rok/raporty-za-rok-2025
2. PSE, "Raporty za rok 2024" (incl. note that operational data may differ from final statistics), 2025. https://www.pse.pl/dane-systemowe/funkcjonowanie-kse/raporty-roczne-z-funkcjonowania-kse-za-rok/raporty-za-rok-2024
3. PSE, "Raporty za rok 2023", 2024. https://www.pse.pl/dane-systemowe/funkcjonowanie-kse/raporty-roczne-z-funkcjonowania-kse-za-rok/raporty-za-rok-2023
4. PSE, "Raporty za rok 2021", 2022. https://www.pse.pl/dane-systemowe/funkcjonowanie-kse/raporty-roczne-z-funkcjonowania-kse-za-rok/raporty-za-rok-2021
5. PSE, "Raporty za rok 2020", 2021. https://www.pse.pl/dane-systemowe/funkcjonowanie-kse/raporty-roczne-z-funkcjonowania-kse-za-rok/raporty-za-rok-2020
6. URE (Urząd Regulacji Energetyki), "2024 – Charakterystyka rynku energii elektrycznej", 3 Jul 2025. https://www.ure.gov.pl/pl/energia-elektryczna/charakterystyka-rynku/12744,2024.html
7. HorecaTrends.pl (PSE data), "PSE: krajowe zużycie energii elektrycznej spadło w 2025 r. o 0,87 proc.", 19 Jan 2026. https://www.horecatrends.pl/inne/900/pse_krajowe_zuzycie_energii_elektrycznej_spadlo_w_2025_r_o_0_87_proc,92288.html
8. WysokieNapiecie.pl (short news on PSE data), "PSE: Produkcja energii el. wzrosła o 5,31% r/r w lipcu, z OZE pochodziło 38% całości", Aug 2026. https://wysokienapiecie.pl/krotkie-spiecie/pse-produkcja-energii-el-wzros-a-o-5-31-r-r-w-lipcu-z-oze-pochodzi-o-38-ca-o-ci/
9. PortalKomunalny.pl (GUS data), "GUS: w 2025 r. Polacy zużyli więcej prądu, ciepła i gazu", 21 Sep 2026. https://portalkomunalny.pl/gus-w-2025-r-polacy-zuzyli-wiecej-pradu-ciepla-i-gazu-604669/
10. PSE, "Plan rozwoju w zakresie zaspokojenia obecnego i przyszłego zapotrzebowania na energię elektryczną na lata 2027–2036 – projekt po konsultacjach" (PRSP 2027–2036), April 2026. Pages cited: pp.17, 19–20, 23–35, 46, 95–96. https://www.pse.pl/documents/20182/7102190804/PRSP_2027-2036-dokument_glowny_projekt_po_konsultacji.pdf/de2f004f-8a80-4264-907a-a38d52c5d50f?safeargs=646f776e6c6f61643d74727565
11. PSE, "Projekt nowego planu rozwoju sieci przesyłowej na lata 2027-2036" (news; consultation to 23 Feb 2026), 2 Feb 2026. https://www.pse.pl/-/projekt-nowego-planu-rozwoju-sieci-przesylowej-na-lata-2027-2036
12. PSE, "Plan rozwoju ... na lata 2025–2034" (PRSP 2025–2034), December 2024. Pages cited: pp.34, 37–42. https://www.pse.pl/documents/20182/21595261/PRSP_2025_2034_dokument_glowny_2024_12_20.pdf
13. PSE, "Ocena wystarczalności zasobów na poziomie krajowym 2025–2040" (NRAA), November 2024. §4.1, pp.16–20. https://www.pse.pl/documents/20182/32109/Ocena+wystarczalno%C5%9Bci+zasob%C3%B3w+na+poziomie+krajowym+2025+%E2%80%93+2040/2d5d0ec2-2fba-4687-81d5-9a575f22655e?safeargs=646f776e6c6f61643d74727565
14. Ministerstwo Energii, "Krajowy Plan w dziedzinie Energii i Klimatu do 2030 r. z perspektywą do 2040 r. – przyjęty przez Radę Ministrów" (document page with annexes), June 2026. https://www.gov.pl/web/energia/krajowy-plan-w-dziedzinie-energii-i-klimatu-do-2030-r-z-perspektywa-do-2040-r---przyjety-przez-rade-ministrow
15. Ministerstwo Energii / ARE S.A., "Załącznik 1 do aKPEiK – Scenariusz przyspieszonej transformacji (WAM)", PDF dated Aug 2026. Tab. 2.3 p.46, Tab. 3.6 p.66, Tab. 3.7 p.67, Tab. 3.8 p.68. https://www.gov.pl/attachment/416c5e28-f174-4996-a9c0-c75da7d83566
16. Ministerstwo Energii / ARE S.A., "Załącznik 2 do aKPEiK – Scenariusz referencyjny (WEM)", PDF dated Aug 2026. Tab. 2.3 p.41, Tab. 3.11 p.67, Tab. 3.12 p.68. https://www.gov.pl/attachment/5d1de0a5-7b21-4d8b-9b59-6673505e8ac8
17. Ministerstwo Energii / ARE S.A., "Załącznik 3 do aKPEiK – Założenia prognostyczne i metodyka", PDF dated Jun 2026. p.41 (hydrogen); p.45–46 (Tab. 2.25–2.28). https://www.gov.pl/attachment/c9d1c823-6505-4f34-8057-7ca587c7264b
18. Ministerstwo Energii, "Ministerstwo Energii opublikowało projekt Krajowego Planu w dziedzinie Energii i Klimatu do 2030 i 2040 roku...", 17 Dec 2025. https://www.gov.pl/web/energia/ministerstwo-energii-opublikowalo-projekt-krajowego-planu-w-dziedzinie-energii-i-klimatu-do-2030-i-2040-roku-to-kluczowy-dokument-dla-polskiej-energetyki-i-polskiej-gospodarki
19. Ministerstwo Energii, "Krajowy Plan w dziedzinie Energii i Klimatu przyjęty przez Radę Ministrów. Dokument opracowało Ministerstwo Energii", 8 Jun 2026. https://www.gov.pl/web/energia/krajowy-plan-w-dziedzinie-energii-i-klimatu-przyjety-przez-rade-ministrow-dokument-opracowalo-ministerstwo-energii
20. Enerdata, "Poland approves draft revised NECP with 2030–2040 outlook", 30 Jul 2025. https://www.enerdata.net/publications/daily-energy-news/poland-approves-draft-revised-necp-2030-2040-outlook.html
21. Ministerstwo Klimatu i Środowiska, "Załącznik 2 do PEP2040 – Wnioski z analiz prognostycznych dla sektora energetycznego", 2 Feb 2021. Tab. 6 p.10, Tab. 12 p.16, Tab. 36 p.40. https://bip.mos.gov.pl/fileadmin/user_upload/bip/strategie_plany_programy/Polityka_energetyczna_Polski/zal._2_do_PEP2040_-_Wnioski_z_analiz_prognostycznych_2021-02-02.pdf
22. Ministerstwo Gospodarki, "Prognoza zapotrzebowania na paliwa i energię do 2030 roku – Załącznik 2 do Polityki energetycznej Polski do 2030 roku", 10 Nov 2009. Tab. 11 p.14. https://www.gov.pl/documents/33372/436746/DE_Zalacznik_nr_2_Prognoza_zapotrzebowania_na_paliwa_i_energie-ost.pdf/5d4cefd2-fd64-f871-a537-f93c19b342e2
23. Instrat (M. Smoleń), "Mała aktualizacja Polityki Energetycznej Polski" (PEP2040 update abandoned; 2023 guiding scenario), 5 Jul 2023. https://instrat.pl/en/pep2040-no-update/
24. ENTSO-E, ERAA 2025 Modelling data, "Dashboard – Raw data" (Aggregated_Demand.csv; versions "ERAA 2024" and "ERAA 2025 final"; files dated 2 Feb 2026). Page: https://www.entsoe.eu/eraa/2025/modelling-data/ File: https://eepublicdownloads.blob.core.windows.net/public-cdn-container/clean-documents/sdc-documents/ERAA/ERAA_2025_Dashboard_RawData.zip
25. ENTSO-E, "ENTSO-E releases latest European Resource Adequacy Assessment" (ERAA 2025), 17 Dec 2025. https://www.entsoe.eu/news/2025/12/17/entso-e-releases-latest-european-resource-adequacy-assessment/
26. ENTSO-E & ENTSOG, TYNDP 2024 Scenarios downloads, 'Yearly Outputs' sheet of the MMStandardOutputFile_NT2030/NT2040_Plexos_CY2009_2.5_v40 and DE2040CY2009/GA2040CY2009 model outputs (files dated 22 May 2024). https://2024.entsos-tyndp-scenarios.eu/download/ Files: https://2024-data.entsos-tyndp-scenarios.eu/files/scenarios-outputs/MMStandardOutputFile_NT2030_Plexos_CY2009_2.5_v40.xlsx.zip, …NT2040…, https://2024-data.entsos-tyndp-scenarios.eu/files/scenarios-outputs/DE2040CY2009.zip, …GA2040CY2009.zip
27. (not used)
28. ENTSO-E & ENTSOG, TYNDP 2026 Draft Scenarios:
    - NT+ model input "Demand.zip" (files dated 5 Jun 2026): https://2026-data.entsos-tyndp-scenarios.eu/input/model-input/national-trends/Demand.zip
    - Main Report Annexes (16 Jun 2026), pp.12, 22, 29: https://2026-data.entsos-tyndp-scenarios.eu/main-documents/ENTSOs_TYNDP2026_Scenarios_Main_Report_Annexes_260616.pdf
    - Methodology Report (1 Jul 2026), p.21: https://2026-data.entsos-tyndp-scenarios.eu/main-documents/ENTSOs_TYNDP2026_Scenarios_Methodology_Report_260701.pdf
    - Release news (11 Jun 2026): https://www.entsoe.eu/news/2026/06/11/entso-e-and-entsog-release-their-joint-draft-scenarios-for-tyndp-2026/
29. Kubiczek P., Nowak K., Smoleń M., "Sieci na miarę. Koszty sieciowe a opłacalność OZE w Polsce do 2040 r.", Instrat Policy Paper 03/2025, Warsaw, Dec 2025. PDF pp.19, 31, 54 (printed pp.18, 30, 53). https://instrat.pl/wp-content/uploads/2025/12/Sieci-na-miare.-Koszty-sieciowe-a-oplacalnosc-OZE-w-Polsce-do-2040-r.-Instrat-Policy-Paper-032025.pdf
30. Forum Energii (M. Dusiło), "Elektryfikacja dla bezpieczeństwa. Jak ograniczyć zależność Polski od importu?", 17 Jul 2026. p.5. https://www.forum-energii.eu/elektryfikacja-dla-bezpieczenstwa (PDF: https://www.forum-energii.eu/download/pobierz/elektryfikacja-dla-bezpieczenstwa)
31. WysokieNapiecie.pl, "Forum Energii: Przy szybkiej ścieżce Polska może dojść do 42% elektryfikacji w 2040 r.", 22 Jul 2026. https://wysokienapiecie.pl/krotkie-spiecie/forum-energii-przy-szybkiej-cie-ce-polska-mo-e-doj-do-42-elektryfikacji-w-2040-r/
32. PSE, "Informacje publikowane zgodnie z Art. 7 ust. 8l ustawy PE – stan na 31.07.2026" (connection-applicant register, XLSX; PSE S.A. rows only). Page: https://www.pse.pl/obszary-dzialalnosci/krajowy-system-elektroenergetyczny/wykaz-obiektow-planowanych-do-przylaczenia File: https://www.pse.pl/documents/20182/51490/Informacje_publikowane_zgodnie_z_Art_7_ust_8l_ustawy_PE_stan_na_31_07_2026.xlsx
33. PSE, "Wykaz Zagregowanych Informacji o Przyłączeniach – OSD stan na 2026-06-30, OSP stan na 2026-07-31" (Tab. 1–3, charts 1–6). https://www.pse.pl/documents/20182/51490/WZIP_OSD_2026_06_30_OSP_2026_07_31.pdf
34. Elżbieciak T., "Rośnie nowa kolejka po przyłącza do sieci. Liczona w gigawatach", WysokieNapiecie.pl, 14 Mar 2025. https://wysokienapiecie.pl/108610-rosnie-nowa-kolejka-po-przylacza-do-sieci-liczona-w-gigawatach/
35. Elżbieciak T., "Czy polskie i europejskie sieci ugną się pod naporem centrów danych?", WysokieNapiecie.pl, 25 Jun 2026. https://wysokienapiecie.pl/119933-czy-polskie-i-europejskie-sieci-ugna-sie-pod-naporem-centrow-danych/
36. Rapacka P., "Prawdziwych chętnych na centra danych w Polsce jest kilkanaście, nie setki", Gramwzielone.pl, 24 Aug 2026. https://www.gramwzielone.pl/trendy/20373693/prawdziwych-chetnych-na-centra-danych-w-polsce-jest-kilkanascie-nie-setki
37. Gramwzielone.pl, "Rośnie liczba wniosków o warunki przyłączenia. PSE od dziś zmienia sposób ich rozpatrywania", 1 Aug 2025. https://www.gramwzielone.pl/trendy/20326665/rosnie-liczba-wnioskow-o-warunki-przylaczenia-pse-od-dzis-zmienia-sposob-ich-rozpatrywania
38. Zielińska A., "Cyfrowy boom. Centra danych testują możliwości operatorów", Energetyka24, 24 Aug 2026. https://energetyka24.com/energetyka/elektroenergetyka/cyfrowy-boom-centra-danych-testuja-mozliwosci-operatorow
39. PropertyNews.pl, "Polska liderem data center w regionie. Czy sieć wytrzyma technologiczny wyścig?", 13 Jun 2025. https://www.propertynews.pl/technologie/polska-liderem-data-center-w-regionie-czy-siec-wytrzyma-technologiczny-wyscig,190271.html
40. MuratorPlus.pl, "Plan rozwoju sieci przesyłowej impulsem dla rynku centrów danych" (Polish Data Center Association comments), 2026 (exact date not shown in the fetched text). https://www.muratorplus.pl/biznes/wiesci-z-rynku/plan-rozwoju-sieci-przesylowej-impulsem-dla-rynku-centrow-danych-aa-MHpW-kTf3-1N5L.html
41. Microsoft Learn, "List of Azure regions" (Poland Central, Warsaw, 3 zones), updated 23 Sep 2026. https://learn.microsoft.com/en-us/azure/reliability/regions-list
42. DATA4, "Data centers Warsaw, Poland" (Campus Warsaw, Jawczyce), accessed 24 Sep 2026. https://www.data4group.com/en/data-centers-warsaw-poland/
43. Vantage Data Centers, "Warsaw, Poland" (WAW1 campus page), accessed 24 Sep 2026. https://vantage-dc.com/data-center-locations/emea/warsaw-poland/
44. Atman, homepage (EN), accessed 24 Sep 2026. https://www.atman.pl/en/
45. EdgeConneX, homepage, accessed 24 Sep 2026 (no Poland location found). https://www.edgeconnex.com/
46. ORLEN, "Hydrogen Projects Portfolio – ORLEN 2026", PDF dated Jan 2026. pp.9, 11, 13, 21, 35–41. https://www.orlen.pl/content/dam/internet/orlen/pl/en/sustainable-development/transition-projects/hydrogen/Hydrogen-Projects-Portfolio-ORLEN.pdf
47. ORLEN, press release "ORLEN przyspiesza w produkcji wodoru. Hub w Szczecinie zbuduje polska firma", 12 May 2026. https://www.orlen.pl/pl/o-firmie/media/komunikaty-prasowe/biezace/2026/Maj-2026/orlen-przyspiesza-w-produkcji-wodoru-hub-w-szczecinie-zbuduje-polska-firma
48. Gramwzielone.pl, "Ogromne środki z KPO na zielony wodór. Najwięcej dla Orlenu", 17 Jun 2025. https://www.gramwzielone.pl/woddor/20320430/ogromne-srodki-z-kpo-na-zielony-wodor-najwiecej-dla-orlenu
49. wnp.pl, "Koncerny z miliardowym wsparciem na projekty wodorowe. Jedna z firm właśnie się wycofała", 16 Jun 2025. https://www.wnp.pl/energia/gigantyczne-pieniadze-na-projekty-wodorowe-jeden-z-beneficjentow-wycofal-sie-z-tego-biznesu,955462.html
50. wnp.pl, "PSE: projekt planu rozwoju sieci przesyłowej na lata 2027-2036 trafił do konsultacji", 2 Feb 2026. https://www.wnp.pl/energia/pse-projekt-planu-rozwoju-sieci-przesylowej-na-lata-2027-2036-trafil-do-konsultacji,1028622.html
51. Tokarski S., Urych B., Smoliński A. (2025). "National Energy and Climate Plan—Polish Participation in the Implementation of European Climate Policy in the 2040 Perspective and Its Implications for Energy Sustainability." *Sustainability* 17(11): 5035. https://doi.org/10.3390/su17115035. Only the abstract, via Crossref, was read: the paper critically assesses the NECP scenarios against historical consumption and flags risks of delayed nuclear and offshore investment. No numbers are taken from it.

### Method notes
- The PSE, KPEiK, PEP, Instrat, Forum Energii and ENTSO-E PDFs were downloaded and read as text; page numbers are PDF page numbers. Numbers read from charts (PSE Rys. 3-8, 4-1, 4-2) were cross-checked against the y/y labels and totals printed on the same charts.
- ERAA, TYNDP 2024, TYNDP 2026 and the PSE register figures come from parsing the published data files. TYNDP 2026 totals are sums of hourly PL00 input series (MW over 8,760 h).
- Research stopped when the session's web-search quota ran out. Hyperscaler MW figures (Microsoft, Google) and recent heat-pump and EV sales were therefore not researched further.
