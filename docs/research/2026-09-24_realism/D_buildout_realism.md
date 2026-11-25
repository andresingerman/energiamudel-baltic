# Is the assumed build-out realistic? Wind, solar, offshore and storage in EE, LV, LT, FI, SE, PL

*Evidence check for an open electricity-market model. Status: 24 Sep 2026. Author: research agent (Claude). All numbers come from sources opened for this note, listed at the end as [n]. Where I computed something myself, the text says so and gives the method.*

**Hypothesis tested (not assumed):** the wind, solar, offshore-wind and storage capacities assumed in ENTSO-E TYNDP 2024 / TYNDP 2026 and in national plans will not all be built on time, so prices will be higher than the scenarios imply.

**Bottom line (details in "Balanced assessment" at the end):**
- **Supported:** onshore wind in Finland, Poland and Estonia; offshore wind everywhere except Poland (and partly there); a scenario that needs wind at 1.5–5× the recent build rate. Cannibalisation, negative prices and saturated reserve markets are measurable and already hold back merchant investment.
- **Not supported:** solar (Poland, Lithuania, Latvia, Sweden are already at or above the TYNDP 2026 2030 values), batteries (Finland already exceeds TYNDP 2024's 2030 value; Lithuania is past half of its 2030 value by mid-2026 with more subsidised; Poland has a large contracted pipeline), onshore wind in Sweden and Lithuania.
- **Price direction is not automatic.** TYNDP 2026 NT+ puts 2030 electricity demand (including electrolysers and EVs) at about **1.65–1.7× the 2025 load in FI, SE, LT and LV**, but about **1.0× in EE and PL** (own comparison, section 1.5). Developers say they are holding back *because prices are low and demand has not arrived* (Vattenfall, Green Power Sweden, WindEurope on Finland). A supply shortfall that comes with a demand shortfall does not raise prices by itself.
  - The case for "higher prices than the scenario" is strongest in **Estonia and Poland**: flat scenario demand, large wind gaps, and the scenario's price fall rests on build.
  - It is mixed for Lithuania and Latvia, and weakest for annual averages in Finland and Sweden.
  - Scarcity and evening hours pull both ways: missing wind pushes these prices up, while storage ahead of the scenario pushes them down. The model has to settle the net effect.

---

## 0. Data, definitions and caveats

- **Scenario benchmarks.**
  - TYNDP 2024 National Trends+ (NT+): capacities and zonal marginal costs from the ENTSO-E market-model output files for 2030 and 2040 (climate year 2009), sheet "Yearly Outputs" [7].
  - TYNDP 2026 draft NT+: the *NT+ KPI Dashboard* (drafts released 10 Jun 2026 [6]), weighted weather-scenario columns [4].
  - TYNDP 2026 NT+ is by construction a *target-compliant* scenario. It is built bottom-up from TSO/NECP data (cut-off 24 Dec 2024) and then "gap-filled" to meet EU targets ([5], sections 4.2–4.4). It is a policy scenario, not a delivery forecast.
- **Realised capacity.** IRENA Renewable Capacity Statistics 2026 (year-end MW 2016–2025; flags o/u/e = official/unofficial/estimate) [3] and WindEurope annual statistics [1][2]. The two differ: for Sweden at end-2025, IRENA shows 17.2 GW onshore, while WindEurope shows 18.3 GW and Green Power Sweden 18.3 GW [8]. For Sweden onshore I use WindEurope. Elsewhere I show both where it matters.
- **Own calculations** (prices, negative-price hours, capture rates, 2025 load) come from the energiamudel v5 database [53]: ENTSO-E Transparency A44 day-ahead prices, A75 generation and A65 load, hourly means in UTC, as loaded by `make db`. Capture price = generation-weighted average hourly price; capture rate = capture price / time-mean price; negative hours = hours whose mean price is below 0. The database holds generation and load for EE, LV, LT and FI only (DECISIONS D-002), so Polish and Swedish capture rates are not computed here.
  - *Editor's note (2026-09-24):* the research draft computed these statistics from the Energy-Charts API, whose licence allows internal use only. They were recomputed from ENTSO-E data in the model's own database; the two sets agree to within one unit in the last digit shown for every zone both cover.
  - Cross-check: Finland 2024 has 725 negative hours in the database, equal to Finnish Energy's published figure [9].
- ENTSO-E Transparency A68 (installed capacity per production type) was **not** used: it needs an API token, which this session did not have. IRENA, WindEurope and TSO figures stand in for it.
- **Not verified in this pass** (my web-search quota ran out): wind-OEM financial results; status of Lithuania's first 700 MW offshore project (Curonian Nord); Finland's first EEZ offshore tender after April 2026; exact date Sweden dropped TSO-paid offshore connections. These are marked "unverified" in the text.

---

## 1. Realised build rates versus plans (2020–2025)

### 1.1 Onshore wind

| | EE | LV | LT | FI | SE | PL |
|---|---|---|---|---|---|---|
| Cumulative end-2025, WindEurope, MW [1, Table 1] | 711 | 137 | 2,535 | 9,433 | 18,323 | 11,200 |
| Cumulative end-2025, IRENA, MW [3, p.17] | 705 | 133 | 2,510 | 9,351 | 17,188 | 10,602 |
| Net additions 2021–2025, IRENA, MW/yr average (max year) | 78 (356) | 11 (46) | 394 (678) | 1,359 (2,420) | 1,483 (2,163) | 861 (1,193) |
| Additions 2024 / 2025, WindEurope, MW [2][1] | 330 / 0 | 0 / 0 | 522 / 759 | 1,414 / 1,023 | 1,015 / 1,767 | 805 / 800 |
| TYNDP 2024 NT+ 2030, MW [7] | 861 | 237 | 5,000 | 25,992 | 17,952 | 13,768 |
| TYNDP 2026 NT+ 2030 / 2035, GW [4] | 2.68 / 3.00 | 0.58 / 0.64 | 4.52 / 5.52 | 19.64 / 30.88 | 20.26 / 23.82 | 19.03 / 23.04 |
| **Required 2026–30 to reach TYNDP 2026 (from WindEurope base), MW/yr** | 394 | 89 | 396 | **2,041** | 387 | **1,566** |
| Required ÷ realised 2021–25 average (IRENA) | **5.1×** | 8.1× (tiny base) | 1.0× | **1.5×** | 0.3× | **1.8×** |
| NECP / national target 2030 | 100 % RES-E by 2030 → now "market-based", after 2030 (ENMAK 2035) [36] | n/a in sources used | 4.5 GW [1] | 33 TWh wind ≈ 13 GW [1] | 69.4 TWh ≈ 26.4 GW [1] | 15.8 GW [1] |
| WindEurope 2030 expectation: Feb 2025 → Feb 2026, MW [2][1, Table 4] | 1,900 → 920 | 1,760 → 1,350 | 3,780 → 4,230 | 15,530 → **11,930** | 22,200 → 20,620 | 13,400 → 14,110 |
| **Gap: TYNDP 2026 NT+ 2030 minus WindEurope Feb 2026, MW** | **+1,762** | −770 | +285 | **+7,710** | −362 | **+4,918** |

(Required rates and ratios are my arithmetic on the cited numbers.)

What this shows:
- **Finland.** The scenario needs about 2 GW/yr. Finland peaked at 2.4 GW in 2022 (IRENA), fell to 1.0 GW in 2025, and WindEurope expects 2.7 GW in total over 2026–2030 [1, p.40]. WindEurope cut its own 2030 Finland number by 3.6 GW in one year. Reasons it gives [1, p.40]:
  - developers "delaying investments" because electrification and hydrogen demand grow more slowly than expected;
  - a new fixed 1.25 km setback distance;
  - Finland has no government-backed onshore support scheme.
- **Poland.** About 0.8 GW/yr in both 2024 and 2025. The 10H / 700 m rule remains [1, p.40]. A 500 m amendment was vetoed by the President on 21 Aug 2025 [60].
- **Estonia.** 330 MW in 2024 and nothing in 2025 per WindEurope. TYNDP 2026 still assumes 2.7 GW by 2030.
- **Sweden and Lithuania: no gap.** The TYNDP 2026 onshore values look reachable.
  - Sweden: 1.4 GW commissioned in 2025 (Green Power Sweden) or 1.8 GW (WindEurope); 747 MW due in 2026 and 280 MW in 2027; 19.37 GW in operation expected by end-2027 [8, p.4]. TYNDP 2026 asks for only 20.26 GW by 2030.
  - The Swedish problem comes *after 2027*: only about 30 MW of turbine orders in all of 2025, and the association expects expansion to stop after 2027 without new investment decisions [8, p.2]. Sweden's own NECP-derived 26.4 GW is far out of reach; WindEurope puts the shortfall at about 6 GW [1, p.40].
  - Lithuania: build rate already matches the requirement (759 MW in 2025, a record). Litgrid reports 2,679 MW wind by 29 Jun 2026 [15].
- **Latvia.** The base is too small for the ratio to mean much. WindEurope (1.35 GW by 2030) is *more* optimistic than TYNDP 2026 (0.58 GW), helped by at least 725 MW of state-forest land leases allocated in 2024 [2, auctions section and Table 3].

### 1.2 Solar PV

| | EE | LV | LT | FI | SE | PL |
|---|---|---|---|---|---|---|
| Cumulative end-2025, IRENA, MW [3, p.26] | 984 | 922 | 3,295 | 1,566 | 5,500 | 25,421 |
| Additions 2021–25, IRENA, MW/yr average (max year) | 155 (293) | 183 (341) | 610 (1,245) | 253 (347) | 875 (1,605) | 4,353 (5,804) |
| TYNDP 2024 NT+ 2030, MW [7] | 1,160 | 146 | 5,000 | 10,695 | 7,302 | 21,663 |
| TYNDP 2026 NT+ 2030 / 2035, GW [4] | blank in KPI file | 1.29 / 1.29 | 4.10 / 5.00 | 9.45 / 15.95 | 6.86 / 10.08 | 28.98 / 37.90 |
| Required 2026–30, MW/yr | – | 74 | 161 | **1,577** | 272 | 712 |
| Required ÷ realised | – | 0.4× | 0.3× | **6.2×** | 0.3× | 0.2× |

- **The hypothesis fails for solar in PL, LT, LV and SE.** TYNDP 2024 NT+ values for 2030 have already been passed: PL 21.7 GW (actual 25.4 GW), LV 0.15 GW (actual 0.92 GW), EE 1.16 GW (actual about 1.0 GW). TYNDP 2026 needs less than a third of the recent pace. Lithuania had 3.54 GW solar on 29 Jun 2026, against the 4.1 GW 2030 value [15].
- **Finland is the exception** on paper: 9.45 GW needs a sixfold acceleration. But utility-scale PV went from 364 MW at end-2025 to 842 MW at 30 Jun 2026 [13], so the rate is rising quickly from a low base.
- Estonia's solar row is empty in the TYNDP 2026 KPI file. This looks like a data gap in the draft, not an assumption of zero solar.

### 1.3 Offshore wind (details and dates in section 2)

| | EE | LV | LT | FI | SE | PL |
|---|---|---|---|---|---|---|
| Installed end-2025, MW (WindEurope / IRENA) | 0 | 0 | 0 | 71 / 32 | 192 / 193 | 0 |
| TYNDP 2024 NT+ 2030, MW [7] | 0 (3,500 in 2040) | 500 | 1,400 | 1,000 | 600 | **10,004** |
| TYNDP 2026 NT+ 2030 / 2035 / 2040, GW [4] | – / 1.0 / 1.5 | – / – / – | – / 1.4 / 2.8 | – / 3.3 / 5.0 | 0.47 / 2.33 / 3.94 | 5.93 / 12.23 / 17.88 |
| WindEurope expected by 2030, MW [1, Table 4] | 0 | 0 | 630 | 70 | 190 | 4,930 |

TYNDP 2024 was far off: 10 GW Polish offshore by 2030, and 1.4–1.5 GW combined for Latvia and Finland. TYNDP 2026 moved most Baltic, Finnish and Swedish offshore to 2035 or later, but still assumes 1 GW Estonian offshore by 2035 even though the support scheme was scrapped (section 2).

### 1.4 Batteries

| | Installed (latest) | Pipeline | TYNDP 2024 NT+ 2030 [7] | TYNDP 2026 NT+ 2030 [4] |
|---|---|---|---|---|
| FI | ≈1,050 MW (Feb 2026) [11]; 1.6 GW (Jul 2026) [12] | 995 MW / 2.8 GWh under construction; 11.9 GW planned [12] | 1.0 GW | 3.11 GW / 6.22 GWh |
| SE | ≈600 MW prequalified for FCR-D (late 2024) [23] | – | 0.26 GW (SE1–SE4) | **0.20 GW / 1.43 GWh** (below today) |
| EE | Auvere 26.5 MW / 53.1 MWh (Feb 2025) [19]; Hertz 1 100 MW / 200 MWh energised 1 Oct 2025 [18][20] | Hertz 2 100 MW / 200 MWh, end-2026 [18] | 0 | 1.0 GW / 2.0 GWh |
| LV | AST 80 MW / 160 MWh in the market from 29 Oct 2025 [18] | – | 0.08 GW | 0.22 GW / 0.44 GWh |
| LT | 690 MW (29 Jun 2026) [15]; a news summary also gives ≈0.7 GW for mid-2026 [16] | capex scheme 1.7 GW / 4 GWh, oversubscribed [17] | 1.2 GW | 1.3 GW / 4.21 GWh |
| PL | 37.4 MW utility-scale operating (Apr 2026) [21] | capacity-market contracts 2027–30 ≈ 5.1 GW derated ≈ 11 GW physical; 82 GW holding connection conditions; Modo forecast 8–9 GW by 2030 [21] | 0 | 6.11 GW / 27 GWh |

**Storage contradicts the hypothesis.**
- Finland's 2026 fleet already exceeds TYNDP 2024 for 2030 and is on course for TYNDP 2026.
- Lithuania is at about half of its 2030 value by mid-2026, with funded capacity beyond it.
- Sweden's TYNDP 2026 value is below what is installed today.
- Poland is the only open question: very little is operating, but the contracted pipeline exceeds the scenario.

### 1.5 Demand assumed alongside the capacities (needed to read the price effect)

| | 2025 load, TWh (EE, LV, LT, FI: ENTSO-E A65 [53]; SE: SCB; PL: PSE gross) | TYNDP 2026 NT+ 2030: native+fixed / + electrolysers / + net EV, TWh | 2030 total ÷ 2025 load |
|---|---|---|---|
| EE | 7.9 | 7.8 / 0.0 / 0.2 (total 8.0) | 1.01× |
| LV | 7.2 | 9.4 / 2.9 / 0.0 (total 12.3) | 1.71× |
| LT | 11.8 | 14.5 / 4.4 / 0.7 (total 19.6) | 1.67× |
| FI | 84.6 | 126.6 / 9.2 / 3.5 (total 139.3) | 1.65× |
| SE | 134.2 | 155.8 / 50.5 / 8.8 (total 215.1) | 1.60× |
| PL | 167.5 | 158.8 / 0.4 / 4.1 (total 163.3) | 0.97× |

(2025 load: ENTSO-E actual total load summed over hours [53] for EE, LV, LT, FI; Sweden from Statistics Sweden and Poland from PSE's gross consumption, both as cited in the demand notes B and C, so their definitions differ from ENTSO-E's by a few percent. Finland cross-check: 84.6 TWh here against 85 TWh reported by Finnish Energy [9]. TYNDP definitions differ slightly — native plus fixed demand, electrolyser load, net EV load, from the Energy Balance rows of [4] — so read the ratios as orders of magnitude.)

- **Reading:** in FI, SE, LT and LV the scenario needs demand to grow about 65–70 % in five years; much of it is electrolysers (SE 50.5, FI 9.2, LT 4.4, LV 2.9 TWh). In EE and PL the 2030 demand is about today's. Any capacity shortfall in EE and PL therefore goes straight into the supply–demand balance. In the other four it may be matched by a demand shortfall.
- Finnish Energy reports 85 TWh consumed in Finland in 2025 (+2 %) [9, p.2].
- Fingrid's Q3-2025 outlook gives 103–123 TWh for 2030 and 104–159 TWh for 2035 [10].
- TYNDP 2026 NT+ for Finland in 2030 is at the top of that range: 121.4 TWh native (e-market) + 5.2 TWh prosumer, plus 9.2 TWh of electrolyser load [4].
- Sweden's TYNDP 2026 NT+ has 50.5 TWh of electrolyser load in 2030 [4].
- Svenska kraftnät's 2026 long-term analysis has *lowered* Swedish 2050 demand to 192–333 TWh (from 209–365 TWh in 2024). The reason given is profitability problems of green-industry projects: high investment costs, interest rates, electricity-price uncertainty [47, p.36].

---

## 2. Offshore wind: auctions and projects

| Market | Event | Date | Source |
|---|---|---|---|
| **Denmark** | 3 GW tender (3 × 1 GW; developers pay for building rights; uncapped negative bidding; no CfD) received **no bids**. WindEurope blamed uncapped negative bidding, developer-paid grid connection, demand/price uncertainty and higher rates. | Dec 2024 (WindEurope comment 6 Dec) | [28] |
| Denmark | Relaunch: ≥2.8 GW with **capability-based two-sided CfD** for 20 years, state budget DKK 55.2 bn. North Sea Mid (1 GW) and Hesselø (0.8 GW) bids due spring 2026, completion by end-2032; North Sea South (1 GW) bids in 2028 (autumn per [29], spring per [1]), completion 2034. | 20 Nov 2025 | [29] |
| Denmark | Result: Vattenfall won both sites. Nordsøen Midt **€67.42/MWh** (2 bids); Hesselø **€72.50/MWh** (5 bids). | 4–5 Aug 2026 | [30][31] |
| **Lithuania** | Second 700 MW tender **invalid**: only one applicant (Ignitis with Ocean Winds); the law requires at least two (RE Law art. 22(10)). A two-way CfD of €75.45–125.74/MWh had been on offer. | 8 Oct 2025 | [32] |
| Lithuania | First 700 MW project (awarded 2023): commissioning date **unverified** in this pass. WindEurope expects 210 MW in 2029 and 420 MW in 2030 [1, Table 4]; TYNDP 2026 has no Lithuanian offshore before 2035 [4]. | – | [1][4] |
| **Estonia** | Government dropped the offshore reverse auction (up to €2.6 bn) in Feb 2025; the minister confirmed in Aug 2025 that no auction would be held. Officials later said earlier cost calculations were "flawed". Storage support was cancelled at the same time. | Feb / Aug 2025 | [33][35] |
| Estonia | Seabed (superficies) licence auctions continue without revenue support: Saare 7 failed in June 2025 (no eligible bidders); Saare 3 auctioned 17–19 Mar 2026. | 2025–2026 | [37] |
| Estonia | ENMAK 2035 approved by the government. The 100 % renewable goal is kept but is to be met on market terms, when technologies need no operating subsidies, after 2030. | 8 Jan 2026 | [36] |
| **Poland** | First offshore CfD auction (17 Dec): **3.435 GW** of 4 GW offered, 3 of 4 bidders won, **476.88–492.32 PLN/MWh** (WindEurope: €113–117/MWh), 25-year CfD. First power required within 7 years; planned Dec 2032. | 19 Dec 2025 | [38][1] |
| Poland | Baltic Power (≈1.2 GW; 76 × 15 MW) **first power 10 Jul 2026**, 54 of 76 turbines installed, completion "this autumn". In Feb 2025 WindEurope expected 570 MW of Polish offshore in 2025; none was connected. | 10 Jul 2026 | [39][2] |
| **Finland** | Offshore Wind in the EEZ Act in force 1 Jan 2025. First tender no earlier than late 2025. Later reporting: four candidate areas, auction in 2026, scored on the exploitation fee offered and quality. No subsidy is mentioned. Outcome after Apr 2026 **unverified**. | Dec 2024; 1 Apr 2026 | [40][41] |
| **Sweden** | Government rejected **13 EEZ projects (≈32 GW)** in the Baltic Sea on defence grounds; approved Poseidon (1.4 GW, west coast). | 4 Nov 2024 | [42] |
| Sweden | Approved Fyrskeppet (8–11 TWh/yr) and Vidar (≤7.8 TWh/yr), both to be completed by 2036. **Rejected 11 more** on defence grounds. Plans to move from "open door" applications to a state auction model. | 16 Jul 2026 | [43][44] |
| Sweden | Vattenfall will not proceed with Vidar: "no transmission grid offshore in Sweden" and "electricity prices are too low". The CEO said even restoring connection support would not make it pay, because the demand increase needed to lift prices is not visible. | 17 Jul 2026 | [45] |
| Sweden | Developers connect "onshore at their own expense" (Svenska kraftnät). Date of the policy change from TSO-paid connection: **unverified** (Baird/Reuters says 2022). | – | [46][45] |
| Sweden | Svenska kraftnät LMA 2026: offshore wind is *not built for profitability reasons* in three of four scenarios (LF, MM, HP). | 1 Jul 2026 | [47, pp.37–38] |

Reading:
- Offshore wind in the Baltic Sea outside Poland has no revenue-support framework in force (EE, LT's second round, FI, SE). Sweden adds a defence veto.
- The **Polish and Danish results show what it costs to restart:** two-sided CfDs at about €113–117/MWh in Poland and €67–73/MWh in Denmark's North Sea / Kattegat.
- For a model, offshore capacity in EE, LV, LT (second 700 MW), FI and SE before about 2033 should be treated as policy-contingent, not as baseline.

---

## 3. Cannibalisation, negative prices and storage saturation

### 3.1 Own calculation: day-ahead statistics 2020 – Aug 2026 (energiamudel database [53])

| Day-ahead average, €/MWh | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 Jan–Aug |
|---|---|---|---|---|---|---|---|
| EE | 33.7 | 86.7 | 192.8 | 90.8 | 87.3 | 80.4 | 80.9 |
| LV | 34.0 | 88.8 | 226.9 | 93.9 | 87.4 | 85.7 | 95.9 |
| LT | 34.0 | 90.5 | 230.2 | 94.4 | 87.3 | 85.3 | 97.1 |
| FI | 28.0 | 72.3 | 154.0 | 56.5 | 45.6 | 40.5 | 60.1 |
| SE4 | 25.9 | 80.5 | 152.1 | 64.9 | 49.7 | 60.4 | 85.7 |
| PL | 46.7 | 87.0 | 166.7 | 111.7 | 96.3 | 104.3 | 113.9 |

| Hours with price < 0 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 Jan–Aug |
|---|---|---|---|---|---|---|---|
| EE | 5 | 5 | 2 | 129 | 183 | 203 | 40 |
| LV | 5 | 5 | 2 | 100 | 184 | 164 | 58 |
| LT | 5 | 5 | 2 | 100 | 186 | 180 | 63 |
| FI | 9 | 5 | 27 | 467 | 725 | 465 | 46 |
| SE4 | 10 | 12 | 29 | 368 | 632 | 374 | 85 |
| PL | 0 | 0 | 0 | 43 | 197 | 310 | 293 |

| Hours with price = 0 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 Jan–Aug |
|---|---|---|---|---|---|---|---|
| EE | 2 | 0 | 1 | 38 | 53 | 42 | 12 |
| LV | 2 | 0 | 1 | 35 | 51 | 26 | 12 |
| LT | 2 | 0 | 1 | 36 | 49 | 24 | 10 |
| FI | 2 | 0 | 7 | 69 | 175 | 138 | 16 |
| SE4 | 2 | 0 | 8 | 39 | 95 | 13 | 3 |
| PL | 0 | 0 | 0 | 1 | 19 | 42 | 10 |

| Solar capture rate | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 Jan–Aug |
|---|---|---|---|---|---|---|---|
| EE | 1.22 | 0.95 | 1.06 | 0.79 | 0.74 | 0.58 | 0.56 |
| LV | – | – | – | – | 0.72 | 0.65 | 0.59 |
| LT | 1.19 | 1.08 | 1.16 | 0.90 | 0.77 | 0.59 | 0.54 |
| FI | – | – | – | 0.90 | 0.85 | 0.89 | 0.67 |

| Onshore-wind capture rate | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 Jan–Aug |
|---|---|---|---|---|---|---|---|
| EE | 0.91 | 0.99 | 0.83 | 0.87 | 0.83 | 0.85 | 0.88 |
| LV | 0.88 | 0.91 | 0.90 | 0.83 | 0.80 | 0.86 | 0.85 |
| LT | 0.88 | 0.94 | 0.80 | 0.83 | 0.81 | 0.81 | 0.90 |
| FI | 0.85 | 0.93 | 0.71 | 0.72 | 0.65 | 0.55 | 0.66 |

| Share of solar output in negative-price hours | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 Jan–Aug |
|---|---|---|---|---|---|---|---|
| EE | 0 % | 0 % | 0 % | 4 % | 5 % | 6 % | 2 % |
| LV | – | – | – | – | 5 % | 5 % | 1 % |
| LT | 0 % | 0 % | 0 % | 3 % | 5 % | 7 % | 3 % |
| FI | – | – | – | 5 % | 10 % | 9 % | 2 % |

What the computed series show:
- **Solar is cannibalising fastest.** Solar capture rates fell from about 1.0 (2020–22) to **0.58–0.65 in 2025** in EE, LV and LT, and again in Jan–Aug 2026 (0.54–0.59). Poland's published figure points the same way (capture factor 0.54 in April 2025, section 3.2); the database has no Polish generation to compute it.
- **Finnish wind is the most cannibalised wind fleet in the region.** Onshore-wind capture rate 0.93 (2021) → 0.65 (2024) → **0.55 (2025)**, as wind reached 26 % of consumption [9]. Baltic wind still captures 0.80–0.90; an untested reading is that the Baltic fleets are small relative to their interconnected neighbours.
- **Negative hours:**
  - Rose sharply in 2023–24 in FI, SE4 and the Baltics.
  - In 2025 they fell by about a third to a half in FI and SE4, fell slightly in LV and LT, and rose slightly in EE.
  - In Poland they kept rising: 43 (2023) → 197 → 310 (2025) → 293 already in Jan–Aug 2026.
- **2026 so far is a tighter year.** Averages are above 2025 everywhere except EE, and Nordic and Baltic negative hours are far lower. The causes are not analysed here; the gas shock [64] and hydrology are candidates. Do not read a trend into a partial year.
- **Caveat:** ENTSO-E generation data for small solar fleets (FI; LV before 2024) are incomplete. Treat those capture rates as indicative.

### 3.2 Published evidence

- **Finland:**
  - Negative-price hours: 467 (2023), 725 (2024), 465 (2025); zero-price hours: 69 / 175 / 138 [9, p.30].
  - Finland had the lowest wholesale prices in Europe in 2025, about €40/MWh in real terms [9, pp.23–24].
  - An empirical study (2015–2023 data) finds 2022 wind output most strongly associated with price, at −66 €/MWh per GW. It reports that wind explained 60 % of price variability in October 2022 (conference abstract [79]).
- **Sweden:** In 2025 several wind operators cut output at times because of low prices and imbalance costs. Wind, solar and storage's share of generation fell by 0.5 percentage points [8, p.2].
- **Poland:**
  - Solar capture factor hit a record low of **0.54 in April 2025**. That month had 75 hours at or below zero, 27 % of solar output fell in negative-price periods, and a record **223 GWh** of solar was curtailed. Non-market curtailment was 400 GWh in Jan–Apr 2025 [51].
  - WindEurope calls Polish wholesale prices "relatively high", which supports merchant/PPA wind [1, p.40].
- **Germany (reference):**
  - Annual solar market value (JW Solar) was 4.624 ct/kWh in 2024 and **4.508 ct/kWh in 2025**, against spot averages of 7.946 and 8.932 ct/kWh. That is a value factor of about **0.58 → 0.50** (my division) [48].
  - Share of solar output at negative prices: 14.5 % (2024) → **23.4 % (2025)**. New plants from 21 Feb 2025 lose about 23 % of EEG payment entitlement at negative prices [49].
  - Near-zero or negative prices occurred in "nearly 600 hours" in 2025 [50, p.11].
- **Balancing and reserve markets (the battery business case):**
  - Finland: FCR-N average price fell from **€46/MW/h (2024) to €19/MW/h (June 2025)**, attributed to new batteries. A 2-hour battery earned about €400k/MW/yr as of June 2025 [24].
  - Fingrid's annual FCR market for 2025 cleared at FCR-N 25.30, FCR-D up 4.00 and FCR-D down 8.66 €/MW,h, with smaller annual volumes than in 2024 [26].
  - Sweden: FCR-D demand stays below 550 MW while prequalified capacity grew from under 10 MW (early 2023) to about 600 MW (late 2024). Montel describes the market as saturated from 2024, with falling prices [23].
  - Baltics, Aug 2026: 2-hour battery revenue fell month-on-month to €152k (EE, −13 %), €307k (LV, −17 %) and €251k/MW/yr (LT, −17 %). mFRR capacity was still 54 % of LV/LT revenue (Clean Horizon via [25]).
  - A data site reports Baltic FCR capacity prices falling from about €97 to about €48/MW·h and aFRR-down from about €127 to about €9/MW·h between the Feb 2025 launch and early 2026. **Unverified:** seen only in a search snippet; the page could not be machine-read.
  - Latvia's TSO expected about €20 m/yr lower balancing-capacity costs from 2026 once its batteries entered the market [18].

### 3.3 Literature (peer-reviewed unless stated)

| Study | Finding relevant here |
|---|---|
| Hirth (2013) [66] | Wind's value falls from about 110 % of the average price to 50–80 % as its share rises from 0 to 30 %; solar reaches similar lows at about 15 %. |
| Hirth (2015) [67] | Variability cuts the welfare-optimal VRE share. |
| López Prol, Steininger & Zilberman (2020) [68] | CAISO 2013–17: absolute and relative cannibalisation for wind and solar, stronger at low demand and high VRE. |
| Reichenberg, Ekholm & Boomsma (2023) [69] | With a **Polish wind project as test case**, cannibalisation cuts projected profit from 33 % to between +13 % and −40 %, depending on assumed future VRE growth. The real-options investment threshold rises by 13–67 %. Future build-out beliefs drive the result. |
| Seppälä & Syri (2025) [71] | Finland/Sweden, subsidies phased out: wind and PV plants "currently not profitable" except in high-price bidding zones, because of cannibalisation and high cost of capital. |
| Mauritzen (2013) [72] | Nordic hydro buffers wind: up to 40 % of Danish wind is effectively stored in Norwegian reservoirs. More Danish wind slightly lowers southern Norwegian prices in the short run. |
| **Brown & Reichenberg (2021)** [70] (counter-evidence) | Falling market value is an artefact of forcing technologies in by subsidy or quota. Under a CO₂ cap or tax, wind and solar can exceed 80 % without cannibalising their revenue. Market value is policy-dependent. |
| Storage saturation: Butters, Dorsey & Gowrisankaran (2025) [76] | California: the first 5 GWh of storage lowers wholesale prices 5.6 %, but going from 25 to 50 GWh only 2.6 %. Diminishing returns delay adoption without subsidies. |
| Storage saturation: Lamp & Samano (2022) [74] | 2018–19 California batteries lowered average prices about 0.8 % and eroded their own returns (working-paper version). |
| Storage saturation: Mallapragada, Sepulveda & Jenkins (2020) [75] | Storage value declines with storage penetration; cost-effective storage is 4–16 % of peak demand at $150/kWh. |
| Storage saturation: Ekholm & Virasjoki (2020) [77] | In a 100 % VRE plus storage market, market power exercised through storage moves prices only moderately. |
| Svenska kraftnät LMA 2026 [47, Fig. 35–36] (TSO study) | Modelled 2040 SE3 captured prices: onshore wind 53–64 against an average of 61–77 €/MWh; solar 43–58. By 2050 (HF scenario) solar 43 against 66 and onshore wind 48 against 66. |

---

## 4. Subsidies, market design and PPAs

- **Finland:** no government-backed onshore support; relies on merchant sales and PPAs; municipal real-estate tax on turbines; 1.25 km setback [1, p.40]. Offshore EEZ tenders are fee-based with no subsidy mentioned [41].
- **Sweden:**
  - No central onshore support scheme [1, p.40].
  - Municipalities vetoed about 90 % of proposed projects in 2025; the incentive payments to municipalities budgeted for 2025–27 only start being paid in 2026 [1, p.40].
  - Offshore: developers pay for connection [46]. The state backs nuclear with loans and price guarantees instead of wind (Reuters via [45]).
- **Estonia:**
  - Offshore support (price corridor €65/MWh, 20 years) and onshore support (€20/MWh corridor, 12 years), plus storage support, were cancelled in 2025 [35][33].
  - An onshore reverse auction (≈1 TWh, production by end-2029, €20/MWh cap) was "still planned" in Aug 2025 [33]; whether it took place is unverified.
- **Lithuania:** offshore two-way CfD €75.45–125.74/MWh offered, one bidder [32]; storage capex support (1.7 GW / 4 GWh, about 15 % of cost) [17].
- **Latvia:** no onshore support auction; state-forest land leases for at least 725 MW (bidders pay for land rights) [2].
- **Poland:**
  - Offshore two-sided CfD for 25 years, CPI-indexed [38].
  - Onshore technology-neutral CfD rounds attract little wind: 91 MW (2024) and 83 MW (2025) [2][1, Table 3]. Wind relies on relatively high wholesale prices via PPAs and merchant sales [1].
  - Capacity-market de-rating for batteries was cut to 13.39 %. Batteries received about 685 MW of obligations for 2030 (≈5.1 GW physical); the auction cleared at 465.02 PLN/kW/yr [22].
  - Grid-access reform (UC-84) adopted 13 Mar 2026: build-permit milestones, higher advance payments [52].
  - KPEiK (NECP) approved June 2026: 51.6–53.2 % RES-E by 2030; 128–156 GW total capacity by 2040 [61]. ING flags a sevenfold rise in grid spending and supply bottlenecks as delivery risks [62].
- **EU:** Regulation (EU) 2024/1747 makes direct price support for new wind/solar/nuclear take the form of **two-way CfDs from 17 Jul 2027**. Designs must preserve incentives to stop generating when prices are below operating cost, i.e. no payment at negative prices [63].
- **Denmark (design lesson):** negative-bidding / no-CfD failed; capability-based CfD succeeded at €67–73/MWh [28][30].
- **PPA prices:**
  - Pexapark EURO composite: €52.53/MWh (Jan 2025) → **€44.40/MWh (Apr 2026)**. Nordic PPA prices −27 % in Jan 2025, +6.8 % in Apr 2026 [58][59].
  - LevelTen Q4 2025: renewable demand lags supply; low and negative prices are more frequent; solar cannibalisation [56].
  - LevelTen Q2 2026: EU solar P25 €56.58/MWh (+2.8 %, first rise in a year), wind −1.6 %, hybrid solar + storage €71.58/MWh. Finland, Sweden and Denmark are back in the index [57].
- **Investor statements that merchant projects do not pay:**
  - Vattenfall on Vidar (Jul 2026) [45].
  - Green Power Sweden: zero turbine orders in Q4 2025, blamed on political risk plus electrification slower than announced [8].
  - WindEurope on Finnish developers delaying [1].
  - Seppälä & Syri (2025) [71].
  - Enefit Green's CEO on the need for "predictability and trust" after Estonia's reversal [33].
- **Counterpoint:** Renewables Finland counts 7.2 GW of permitted, construction-ready wind and solar, and 69 GW of wind in planning [14]. Permits are not the binding constraint in Finland; revenue and demand are.

---

## 5. Supply chain and grid

- **IEA (Feb 2025)** [54]:
  - Lead times for cables and large power transformers "almost doubled since 2021": 2–3 years for cables, up to 4 years for large transformers, over 5 years for HVDC cables.
  - Cable prices nearly doubled since 2019; transformer prices up about 75 %.
  - 1,650 GW of wind and solar in advanced development worldwide is waiting for grid connection.
- **WindEurope (Feb 2026)** [1] (counter-evidence on supply chain):
  - Manufacturing capacity is not the main bottleneck today; deployment is held back by permitting, weak or failed tenders and grids.
  - At least €15 bn of supply-chain investment announced since 2022; the supply chain "should be ready" to 2030.
  - More than 500 GW of European wind projects sit in grid-connection queues.
  - WindEurope says the EU is building only about half the wind capacity its 2030 targets need, and that this depresses turbine orders.
  - Two of six 2025 offshore FIDs slipped because of inflation, supply chain and cost.
  - The offshore industrial base was historically sized for about 3 GW/yr.
- **Poland:**
  - Refused grid-connection capacity rose from 6.2 GW (2020) to **107 GW (2025)** (URE data via [52]).
  - PSE curtails solar for balance reasons: 223 GWh in April 2025 alone [51].
  - ING flags a required sevenfold rise in grid investment in 2026–30 [62].
- **Finland:** Fingrid barred new storage over 5 MW in southern Finland until 2029 (Hikiä–Toivila reinforcement); more than 30 GW of storage connection requests [27].
- **Sweden:** no offshore transmission grid (Vattenfall, [45]).
- **Wind-OEM finances:** not verified in this pass. WindEurope describes the recovery as "fragile" and weak, unpredictable order flow as the main risk [1, section 5.4].
- **EU-level pace (KYOS on TYNDP 2026, Jul 2026)** [55]:
  - Wind needs 30.6 GW/yr to 2030 and 43.8 GW/yr to 2035, against 13.2 GW/yr historically.
  - Solar is about on track (57 GW/yr needed against 56 GW last year).
  - Batteries are accelerating (27 GW last year).

---

## 6. Price consequences

### 6.1 What the scenarios themselves imply

| €/MWh (wholesale day-ahead / e-market node) | EE | LV | LT | FI | SE4 | PL |
|---|---|---|---|---|---|---|
| **Actual 2025 day-ahead average** [53] | 80.4 | 85.7 | 85.3 | 40.5 | 60.4 | 104.3 |
| TYNDP 2024 NT 2030 marginal cost, climate year 2009 [7] | 52.4 | 49.2 | 42.2 | 41.2 | 45.0 | 78.1 |
| TYNDP 2026 NT+ 2030, weather-weighted time mean at the e-market node [53] | 49.5 | 45.6 | 45.3 | 47.3 | 36.0 | 66.6 |
| TYNDP 2026 NT+ 2035, same [53] | 61.3 | 64.4 | 63.1 | 72.9 | 49.4 | 64.3 |
| TYNDP 2026 NT+ 2040, same [53] | 101.8 | 97.1 | 96.0 | 107.9 | 63.7 | 55.5 |
| SvK LMA 2026, 2040, range across 4 scenarios [47, Fig. 26] | – | – | – | 66.8–73.7 | – | – |

*Editor's note (2026-09-24):* the draft of this table used the TYNDP 2026 KPI dashboard's "load-weighted" prices (e.g. EE 2030 67.8, FI 2035 100.3 €/MWh). That figure also weights each country's prosumer node, which carries distribution charges, so it is not a wholesale price. The rows above are the e-market (wholesale) node prices of the NT+ hourly dashboards, weighted over the three weather scenarios (energiamudel methodology §3).

Reading:
- In the **Baltics and Poland** the scenarios imply 2030 prices *below* 2025 levels (wholesale: EE 80 → 50, LV 86 → 46, LT 85 → 45, PL 104 → 67 €/MWh). That fall rests on the assumed build-out (EE 2.7 GW onshore plus 1 GW batteries; LT 4.5 GW onshore; PL 19 GW onshore, 5.9 GW offshore, 6 GW batteries).
  - In **EE and PL**, scenario demand is flat (section 1.5), so under-delivery would most directly show up as higher prices than the scenario.
  - In **LT and LV**, the scenario reaches its low price *despite* +67–71 % demand. If the electrolyser and industrial load does not come either, a smaller build can still give prices near the scenario.
- In **Finland** the scenario implies a price *above* today's (wholesale 2025: 40.5; NT+ 2030: 47.3, 2035: 72.9 €/MWh), because it also assumes about +40 TWh of demand plus electrolysers. If wind and demand both fall short, the price can stay near today's lower level, i.e. *below* the scenario.
- Svenska kraftnät's scenarios show this interaction:
  - Sweden SE3: the low-electrification/low-renewables scenario (LF) has the *lowest* 2040 SE3 price (61 €/MWh), because demand is low.
  - Finland: the same LF scenario gives the *highest* 2040 FI price (73.7 €/MWh) [47, Fig. 26].
- The 2026 gas shock (TTF up 53 % to €49/MWh by early June 2026, Strait of Hormuz closure [64]) is a reminder that where gas sets the price (PL, the Baltics in scarcity hours, DE), fuel-price assumptions can move prices more than capacity assumptions do.

### 6.2 Studies that quantify a build-out effect (few)

- **Estonian Ministry of Climate (Sep 2024)** [34]:
  - Claim: the planned offshore (≤2 TWh domestic, 20-year) and onshore (≈4 TWh, 12-year) auctions would cut Estonian prices by **2.4 c/kWh by 2030 (from 9.0 to 6.6 c/kWh)** and by about 4.9 c/kWh by 2035. The ministry page says 4.9; a news report of the same announcement says 4.5.
  - Method not published. The government later dropped the scheme, citing flawed cost calculations [35].
  - Read at face value, the *absence* of that build leaves Estonian prices about €24/MWh above the with-scheme path in 2030. Treat as indicative only.
- **Farsaei, Olkkonen, Kan & Syri (2022)** [65]: in Nordic–Baltic 2030 scenarios with transmission expansion, keeping Swedish nuclear lowers Baltic prices 6–8 %: EE 63 vs 67, LV 65 vs 70, LT 68 vs 74 €/MWh. This shows how sensitive Baltic prices are to supply additions elsewhere in the Nordics.
- **Reichenberg et al. (2023)** [69]: in the Polish case, the *reverse* effect. Faster VRE growth strongly lowers wind revenues, so slower build raises captured prices for what is built.
- **KYOS (Jul 2026)** [55]: EU wind shortfall against TYNDP 2026 "could pressure prices upward". Qualitative only.
- **Not found (gap):** no public, source-verifiable Aurora, AFRY, Rystad, Montel or TSO study that isolates the price effect of *delayed* wind, offshore or storage build for EE/LV/LT/FI/SE/PL. The model should run this sensitivity itself (see below).

---

## Balanced assessment

**Evidence supporting the hypothesis**
1. **Onshore wind, FI / PL / EE:** TYNDP 2026 NT+ needs 1.5×, 1.8× and 5× the 2021–25 average build rate. WindEurope's own 2030 outlook sits 7.7 GW (FI), 4.9 GW (PL) and 1.8 GW (EE) below TYNDP 2026.
2. **Offshore wind outside Poland:** no support framework, failed or cancelled auctions (DK 2024, LT 2025, EE 2025), repeated defence vetoes in Sweden (13 + 11 projects), and a permitted Swedish project shelved because prices are too low.
3. **Offshore in Poland:** built, but late (0 MW in 2025 against 570 MW expected), and it takes about €113–117/MWh CfDs. TYNDP 2024's 10 GW for 2030 was unrealistic; WindEurope's 4.9 GW against TYNDP 2026's 5.9 GW still leaves a 1 GW gap.
4. **Merchant economics have worsened.** Solar capture rates are falling (EE, LV, LT, PL, DE, see section 3.1), negative hours are frequent, reserve prices have collapsed as batteries arrived, and PPA prices are lower. Swedish wind orders were about 30 MW in 2025.
5. **Grid queues and refusals** (PL 107 GW refused in 2025; Fingrid storage ban in the south) and multi-year transformer and cable lead times.

**Evidence against, or that limits, the hypothesis**
1. **Solar:** PL, LT, LV, SE are at or above TYNDP 2026 2030 values in 2025–26. TYNDP 2024's 2030 solar is already exceeded in PL, LV and (≈) EE.
2. **Batteries:** FI is at 1.6 GW (Jul 2026) against 1.0 GW (TYNDP 2024) and 3.1 GW (TYNDP 2026) for 2030, with about 1 GW under construction. LT is at 690 MW, with 1.7 GW/4 GWh subsidised. SE is above its TYNDP 2026 value. PL has about 11 GW of physical capacity contracted in the capacity market. Storage will likely *exceed* scenario values in most of these countries (EE is the exception), which pushes prices *down* in peak and scarcity hours.
3. **Onshore wind in SE and LT** is at or near TYNDP 2026; Latvia's pipeline (≥725 MW of leased land) exceeds TYNDP 2026's 0.58 GW.
4. **Demand is also overstated (FI, SE, LT, LV).** TYNDP 2026 2030 demand is 1.65–1.71× the 2025 load there: FI 139 against 85 TWh, SE 215 against 130 TWh, with 50 TWh of Swedish electrolysers. SvK has cut Swedish demand; Fingrid's low case is 103 TWh for 2030. Developers say low prices and absent demand are *why* they are not building. Under-build that tracks under-demand gives no higher average price; it gives lower capacity *and* lower consumption. EE and PL are the exception (scenario demand ≈ 2025 load).
5. **Policy can turn build back on quickly** where it chooses to (Danish CfD success within 20 months of a failed tender; Poland's 3.4 GW). Brown & Reichenberg (2021) show that cannibalisation is not a physical law but a result of policy design.

**Net judgement for the model**
- *Capacity:*
  - Treat TYNDP 2026 NT+ onshore wind for FI, PL and EE, and all offshore outside PL, as upper bounds. Use WindEurope's Feb 2026 path (or slower) as the central case.
  - Treat TYNDP 2026 solar for PL, LT, LV, SE as a lower bound.
  - Set batteries at or above TYNDP 2026 for FI, LT, PL and SE (SE's TYNDP value is below today's fleet). Keep EE and LV at the TYNDP values unless more projects appear: EE's known projects reach about 0.23 GW by end-2026 against 1 GW assumed.
- *Price:*
  - Expect higher-than-scenario prices most clearly in **Estonia and Poland**: the scenario's price decline depends on build, and demand is flat.
  - In **LT/LV** the direction depends on whether the assumed demand growth arrives.
  - Do **not** assume higher annual averages in FI and SE1–SE2 unless the TYNDP 2026 demand growth also materialises.
  - **Scarcity and evening hours:** missing wind pushes these prices up; storage ahead of the scenario pushes them down. Batteries saturate reserve markets quickly (section 3.2), so their effect on energy prices depends on arbitrage depth. Model this, do not assume it.
- *Sensitivities to run:* (a) slow build + scenario demand; (b) slow build + slow demand (Fingrid low case about 103 TWh in 2030; SvK LF/MM); (c) storage above scenario; (d) gas price in the 2026 shock range. Build should respond to captured prices rather than be fixed.

---

## Sources

1. WindEurope. *Wind energy in Europe: 2025 Statistics and the outlook for 2026–2030.* Feb 2026. https://windeurope.org/data/products/wind-energy-in-europe-2025-statistics-and-the-outlook-for-2026-2030/ (PDF used: https://www.csve.cz/wp-content/uploads/2026/02/windeurope-european-stats-2025.pdf). Table 1 p.10; onshore section pp.13–14; Tables 3 pp.25–26; outlook pp.40–43; Table 4 p.43; investments and section 5.
2. WindEurope. *Wind energy in Europe: 2024 Statistics and the outlook for 2025–2030.* Feb 2025. PDF: https://www.rinnovabili.it/wp-content/uploads/2025/02/Wind-energy-in-Europe-2024.pdf. Table 1; auctions text and table; Table 4 p.43.
3. IRENA. *Renewable capacity statistics 2026.* Mar 2026. https://www.irena.org/Publications/2026/Mar/Renewable-capacity-statistics-2026 (PDF: https://www.irena.org/-/media/Files/IRENA/Agency/Publication/2026/Mar/IRENA_DAT_RE_Capacity_Statistics_2026.pdf). Onshore wind p.17; offshore wind p.19; solar PV p.26.
4. ENTSO-E & ENTSOG. *TYNDP 2026 Draft Scenarios – NT+ KPI Dashboard* (xlsx). Jun 2026. https://2026-data.entsos-tyndp-scenarios.eu/output/model-results/kpi-dashboards/NT+_KPI_Dashboard.xlsx (download page https://2026.entsos-tyndp-scenarios.eu/download/). Country sheets; "Weighted WS" columns.
5. ENTSO-E & ENTSOG. *TYNDP 2026 Draft Scenarios Report* (version June 2026). https://2026-data.entsos-tyndp-scenarios.eu/main-documents/ENTSOs_TYNDP2026_Scenarios_Main_Report_260701.pdf. Sections 4.2–4.4, pp.15–16.
6. ENTSO-E. *ENTSO-E and ENTSOG release their joint Draft Scenarios for TYNDP 2026.* 10 Jun 2026. https://www.entsoe.eu/news/2026/06/11/entso-e-and-entsog-release-their-joint-draft-scenarios-for-tyndp-2026/
7. ENTSO-E & ENTSOG. *TYNDP 2024 Scenarios – Market-model standard output files, NT+ 2030 and NT+ 2040 (CY2009).* 2024. https://2024-data.entsos-tyndp-scenarios.eu/files/scenarios-outputs/MMStandardOutputFile_NT2030_Plexos_CY2009_2.5_v40.xlsx.zip and …NT2040… (download page https://2024.entsos-tyndp-scenarios.eu/download/). Sheet "Yearly Outputs": "Installed Capacities [MW]", "Marginal Cost Yearly Average (excl. 3 000 €/MWh)".
8. Green Power Sweden. *Quarterly statistics – Fourth quarter 2025.* 24 Feb 2026. https://greenpowersweden.com/wp-content/uploads/2026/02/Quarterly-statistics-Q4-2025-Green-Power-Sweden.pdf. pp.2–5.
9. Finnish Energy (Energiateollisuus). *Energy Year 2025 – Electricity (preliminary).* 21 Jan 2026. https://energia.fi/wp-content/uploads/2026/01/Electricity-Year-2025-1.pdf. pp.2, 23–24, 30.
10. Fingrid. *Prospects for future electricity production and consumption (Q3 2025).* https://www.fingrid.fi/en/grid/development/prospects-for-future-electricity-production-and-consumption-q3-2024/
11. Fingrid. *The combined capacity of electricity storages in Finland now exceeds 1,000 MW.* 24 Feb 2026. https://www.fingrid.fi/en/news/news/2026/the-combined-capacity-of-electricity-storages-in-finland-now-exceeds-1000-mw
12. Renewables Finland. *Nearly 12 GW of battery storage planned in Finland – 1 GW under construction.* 9 Sep 2026. https://suomenuusiutuvat.fi/en/nearly-12-gw-of-battery-storage-planned-in-finland-1-gw-under-construction/
13. Renewables Finland. *Solar power breaks records – Finland's utility-scale solar capacity doubled during the first half of the year.* 30 Jun 2026. https://suomenuusiutuvat.fi/en/solar-power-breaks-records-finlands-utility-scale-solar-capacity-doubled-during-the-first-half-of-the-year/
14. Renewables Finland. *There is already a solution to data centre electricity demand.* 16 Jun 2026. https://suomenuusiutuvat.fi/en/there-is-already-a-solution-to-data-centre-electricity-demand/ (with its press-release index https://suomenuusiutuvat.fi/en/category/press-releases/ for the 69 GW figure).
15. Litgrid. *Generation capacity* (data 29 Jun 2026). https://www.litgrid.eu/index.php/power-system/power-system-information/generation-capacity/546
16. Voice of Renewables (news). *Lithuania's Renewable Energy Boom: Solar, Wind, and Battery Storage Today.* 12 Sep 2026. https://voiceofrenewables.com/lithuania-renewable-energy-capacity/
17. Energy-Storage.news. *Lithuania's capex support scheme to help fund 4,000MWh of energy storage.* 27 Aug 2025. https://www.energy-storage.news/lithuania-capex-support-scheme-help-fund-4000mwh-of-bess-battery-storage/
18. ESS News. *Latvia adds big batteries to complete grid sync with Europe, two major Estonian projects secure finance.* 30 Oct 2025. https://www.ess-news.com/2025/10/30/latvia-adds-big-batteries-to-complete-grid-sync-with-europe-two-major-estonian-projects-secure-finance/
19. ESS News. *Estonia inaugurates its largest battery energy storage project.* 27 Mar 2025. https://www.ess-news.com/2025/03/27/estonia-inagurates-its-largest-battery-storage-project/
20. Nidec Conversion. *Nidec Conversion awarded the Hertz 1 project, the largest BESS project in Estonia.* 18 Mar 2025. https://www.nidec-conversion.com/nidec-awarded-bess-project-estonia/
21. Modo Energy. *Poland's battery energy storage buildout outlook.* 4 Apr 2026. https://modoenergy.com/research/en/poland-battery-pipeline-buildout-queue-capacity-market-auctions-subsidy-grid-connection-queue
22. ESS News. *Poland downgrades BESS availability, plummets total awards in capacity market auction.* 30 Dec 2025. https://www.ess-news.com/2025/12/30/poland-downgrades-bess-availability-plummets-total-awards-in-capacity-market-auction/
23. Montel. *Battery Storage Market Insights: Sweden.* 24 Mar 2025. https://montel.energy/resources/blog/battery-storage-market-insights-sweden
24. Clean Horizon. *Storage Index update: Finland in focus.* 18 Jul 2025. https://www.cleanhorizon.com/news/storage-index-update-finland-in-focus/
25. ESS News. *Battery revenues rise everywhere in Europe other than Baltics in August 2026.* 24 Sep 2026. https://www.ess-news.com/2026/09/24/battery-revenues-rise-everywhere-in-europe-other-than-baltics-in-august-2026/
26. Fingrid. *Procurement of frequency containment reserves from annual market 2025.* 5 Nov 2024. https://www.fingrid.fi/en/news/news/2024/procurement-of-frequency-containment-reserves-from-annual-market-2025/
27. Castrén & Snellman. *Fingrid extends restrictions on new energy storage facility connections in Southern Finland until 2029.* 2 Oct 2025. https://www.castren.fi/fingrid-extends-restrictions-on-new-energy-storage-facility-connections-in-southern-finland-until-2029/
28. WindEurope. *No offshore bids in Denmark – disappointing but sadly not surprising.* 6 Dec 2024. https://windeurope.org/news/no-offshore-bids-in-denmark-disappointing-but-sadly-not-surprising/
29. offshoreWIND.biz. *Denmark Opens 2.8 GW CfD-Based Offshore Wind Tender.* 20 Nov 2025. https://www.offshorewind.biz/2025/11/20/denmark-opens-2-8-gw-cfd-based-offshore-wind-tender/
30. WindEurope. *Successful Danish offshore wind tender proves that CfDs deliver competitive bids.* 5 Aug 2026. https://windeurope.org/news/successful-danish-offshore-wind-tender-proves-that-cfds-deliver-competitive-bids/
31. Vattenfall. *Vattenfall awarded Hesselø and North Sea I Mid offshore wind projects in Danish tender.* 4 Aug 2026. https://group.vattenfall.com/press-and-media/pressreleases/2026/vattenfall-awarded-hesselo-and-north-sea-i-mid-offshore-wind-projects-in-danish-tender/
32. offshoreWIND.biz. *Lithuania's Second Offshore Wind Tender Fails After Attracting Only One Bidder.* 8 Oct 2025. https://www.offshorewind.biz/2025/10/08/lithuanias-second-offshore-wind-tender-fails-after-attracting-only-one-bidder/
33. ERR News. *Estonia axing reverse auctions has not seen offshore wind developers pull the plug.* 19 Aug 2025. https://news.err.ee/1609773378/estonia-axing-reverse-auctions-has-not-seen-offshore-wind-developers-pull-the-plug
34. Estonian Ministry of Climate. *The Ministry of Climate has initiated legislative amendments to support development of offshore wind energy.* 6 Sep 2024. https://kliimaministeerium.ee/en/news/ministry-climate-has-initiated-legislative-amendments-support-development-offshore-wind-energy (news variant: https://balticwind.eu/estonia-unveils-20-year-offshore-wind-energy-support-plan-to-lower-electricity-prices-and-boost-renewable-power/)
35. Mondaq (law-firm article). *Estonia Cancels Offshore Wind And Storage Facility Support, Raising Energy And Investment Concerns.* 28 Mar 2025. https://www.mondaq.com/energy-law/1666882/estonia-cancels-offshore-wind-and-storage-facility-support-raising-energy-and-investment-concerns
36. ERR News. *Estonian government approves energy sector development plan to 2035.* 8 Jan 2026. https://news.err.ee/1609904621/estonian-government-approves-energy-sector-development-plan-to-2035
37. TTJA (Estonian Consumer Protection and Technical Regulatory Authority). *Notices of auction – superficies licences for offshore wind farms.* Accessed 24 Sep 2026. https://ttja.ee/en/business-client/buildings-construction/superficies-licences-offshore-wind-farms/notices-auction
38. URE (Polish Energy Regulatory Office). *Offshore: First auction for offshore wind farms concluded.* 19 Dec 2025. https://www.ure.gov.pl/en/communication/news/486,Offshore-First-auction-for-offshore-wind-farms-concluded.html
39. ORLEN. *A historic milestone: the wind farm in the Baltic Sea delivers first power to the Polish grid.* 10 Jul 2026. https://www.orlen.pl/en/about-the-company/media/press-releases/current/2026/July-2026/a-historic-milestone-the-wind-farm-in-the-baltic-sea-delivers-first-power-to-the-polish-grid
40. Finnish Government. *Act on Offshore Wind Power in the Exclusive Economic Zone enters into force – First tenders could be organised at the end of 2025.* Dec 2024. https://valtioneuvosto.fi/en/-/1410877/act-on-offshore-wind-power-in-the-exclusive-economic-zone-enters-into-force-first-tenders-could-be-organised-at-the-end-of-2025
41. Riviera Maritime Media. *Finland to hold auction for offshore windfarms in its EEZ.* 1 Apr 2026. https://www.rivieramm.com/news-content-hub/news-content-hub/finnish-offshore-wind-auction-to-take-place-in-2026-88350
42. offshoreWIND.biz. *Sweden Rejects 13 Offshore Wind Farms, Greenlights Vattenfall's Poseidon Project.* 4 Nov 2024. https://www.offshorewind.biz/2024/11/04/sweden-rejects-13-offshore-wind-farms-greenlights-vattenfalls-poseidon-project/
43. Government Offices of Sweden. *Nya beslut om havsbaserad vindkraft.* 16 Jul 2026. https://www.regeringen.se/pressmeddelanden/2026/07/nya-beslut-om-havsbaserad-vindkraft/
44. offshoreWIND.biz. *Sweden Greenlights Two, Rejects 11 Offshore Wind Farms Over Defence Concerns; Vattenfall Halts Approved Project?* 24 Jul 2026. https://www.offshorewind.biz/2026/07/24/sweden-greenlights-two-rejects-11-offshore-wind-farms-over-defence-concerns-vattenfall-halts-approved-project/
45. Baird Maritime (Reuters report). *Sweden's Vattenfall halts offshore wind project over lack of profitability.* 17 Jul 2026. https://www.bairdmaritime.com/offshore/renewables/offshore-wind/swedens-vattenfall-halts-offshore-wind-project-over-lack-of-profitability
46. Svenska kraftnät. *Connection of offshore wind power* (web page). https://www.svk.se/en/grid-development/connection-of-offshore-wind-power/
47. Svenska kraftnät. *Långsiktig marknadsanalys 2026.* Approved 1 Jul 2026. https://www.svk.se/49e8f3/siteassets/om-oss/rapporter/langsiktig-marknadsanalys/langsiktig-marknadsanalys-2026.pdf. Summary pp.12–14; Tables 2–3 pp.36–38; Fig. 26 p.75; Figs 35–36 p.83.
48. DGS – Deutsche Gesellschaft für Sonnenenergie. *Der Jahresmarktwert Solar 2025.* 15 Jan 2026. https://www.dgs.de/newsletter/der-jahresmarktwert-solar-2025/ (data: netztransparenz.de)
49. LfL Bayern. *Solar/Photovoltaik – Strommarkt in den Jahren 2025, 2024, 2023.* Stand 26 Jan 2026. https://www.lfl.bayern.de/iba/energie/372343/index.php
50. Fraunhofer ISE. *Recent Facts about Photovoltaics in Germany* (version 26 Aug 2026). https://www.ise.fraunhofer.de/content/dam/ise/en/documents/publications/studies/recent-facts-about-photovoltaics-in-germany.pdf. Section 4.3, p.11.
51. Pexapark. *Polish Solar Capture Factors Hit New Low, As Negative Prices and Curtailment Surge.* 10 Jun 2025. https://pexapark.com/blog/prmc-polish-solar-capture-factors-hit-new-low-as-negative-prices-and-curtailment-surge/
52. Pexapark. *Poland Overhauls Grid Access for Renewables and BESS.* 26 May 2026. https://pexapark.com/blog/poland-overhauls-grid-access-for-renewables-and-bess/
53. energiamudel v5 database (`data/energiamudel.duckdb`, built by `make db` from ENTSO-E Transparency Platform A44, A65, A75 and the TYNDP 2026 NT+ hourly dashboards; commit c77ef40 and later). Queries in `docs/research/2026-09-24_demand_and_buildout_realism.md`, Appendix.
54. IEA. *Building the Future Transmission Grid: Strategies to navigate supply chain challenges – Executive summary.* Feb 2025. https://www.iea.org/reports/building-the-future-transmission-grid/executive-summary
55. KYOS (B. Noyan). *TYNDP 2026 deployment pace.* Jul 2026. https://www.kyos.com/tyndp-2026-deployment-pace/
56. LevelTen Energy. *LevelTen European PPA Price Index, Q4 2025.* 29 Jan 2026. https://www.leveltenenergy.com/post/ppa-price-index-q4-2025
57. TaiyangNews (news on LevelTen Q2 2026). *Europe Solar PPA Prices Rise In Q2 2026 As US Market Softens.* 23 Jul 2026. https://taiyangnews.info/business/levelten-energy-q2-2026-report-for-north-america-europe
58. pv magazine. *Pexapark records 25 European PPAs for 790 MW in January.* 26 Feb 2025. https://www.pv-magazine.com/2025/02/26/pexapark-records-25-european-ppas-for-790-mw-in-january/
59. pv magazine. *Pexapark records 17 European PPAs for 966 MW in April.* 27 May 2026. https://www.pv-magazine.com/2026/05/27/pexapark-records-17-european-ppas-for-966-mw-in-april/
60. Notes From Poland. *Poland's new president vetoes bill loosening wind turbine law, freezing energy prices.* 21 Aug 2025. https://notesfrompoland.com/2025/08/21/polands-new-president-vetoes-bill-loosening-wind-turbine-law-freezing-energy-prices/
61. pv magazine. *Poland's new energy strategy envisages sharp increase in renewables.* 10 Jun 2026. https://www.pv-magazine.com/2026/06/10/polands-new-energy-strategy-envisages-sharp-increase-in-renewables/
62. ING THINK. *Poland's 1000-page energy plan: big ambition, challenging to deliver.* 1 Jul 2026. https://think.ing.com/opinions/polands-1000-page-energy-plan-big-ambition-challenging-to-deliver/
63. Regulation (EU) 2024/1747 of 13 June 2024 amending Regulations (EU) 2019/942 and (EU) 2019/943 (electricity market design). OJ 26 Jun 2024. https://eur-lex.europa.eu/eli/reg/2024/1747/oj/eng. Recitals 41–43; two-way CfD definition; application from 17 Jul 2027.
64. ECB Blog (Demuth, Manu, Stalla-Bourdillon). *Energy shock: why oil and gas prices have risen less than expected.* 27 Jul 2026. https://www.ecb.europa.eu/press/blog/date/2026/html/ecb.blog20260727~1212bdb8f9.en.html
65. Farsaei, A., Olkkonen, V., Kan, X., Syri, S. (2022). Electricity Market Impacts of Low-carbon Energy Transition in the Nordic-Baltic Region. *Journal of Sustainable Development of Energy, Water and Environment Systems* 10(3). https://doi.org/10.13044/j.sdewes.d9.0407
66. Hirth, L. (2013). The market value of variable renewables: The effect of solar wind power variability on their relative price. *Energy Economics* 38, 218–236. https://doi.org/10.1016/j.eneco.2013.02.004
67. Hirth, L. (2015). The Optimal Share of Variable Renewables: How the Variability of Wind and Solar Power affects their Welfare-optimal Deployment. *The Energy Journal* 36(1), 149–184. https://doi.org/10.5547/01956574.36.1.6
68. López Prol, J., Steininger, K. W., Zilberman, D. (2020). The cannibalization effect of wind and solar in the California wholesale electricity market. *Energy Economics* 85, 104552. https://doi.org/10.1016/j.eneco.2019.104552
69. Reichenberg, L., Ekholm, T., Boomsma, T. (2023). Revenue and risk of variable renewable electricity investment: The cannibalization effect under high market penetration. *Energy* 284, 128419. https://doi.org/10.1016/j.energy.2023.128419 (preprint: https://arxiv.org/abs/2106.06287)
70. Brown, T., Reichenberg, L. (2021). Decreasing market value of variable renewables can be avoided by policy action. *Energy Economics* 100, 105354. https://doi.org/10.1016/j.eneco.2021.105354
71. Seppälä, S., Syri, S. (2025). Wind, PV, and Hybrid Power Plant Operation in Competitive Nordic Electricity Market With High Profit Cannibalization. *International Journal of Energy Research.* https://doi.org/10.1155/er/8850556
72. Mauritzen, J. (2013). Dead Battery? Wind Power, the Spot Market, and Hydropower Interaction in the Nordic Electricity Market. *The Energy Journal* 34(1), 103–124. https://doi.org/10.5547/01956574.34.1.5
73. (not used)
74. Lamp, S., Samano, M. (2022). Large-scale battery storage, short-term market outcomes, and arbitrage. *Energy Economics* 107, 105786. https://doi.org/10.1016/j.eneco.2021.105786 (findings quoted from working-paper version, May 2021: https://www.econ.queensu.ca/sites/econ.queensu.ca/files/Lamp_Samano_batteries%5B1%5D.pdf)
75. Mallapragada, D. S., Sepulveda, N. A., Jenkins, J. D. (2020). Long-run system value of battery energy storage in future grids with increasing wind and solar generation. *Applied Energy* 275, 115390. https://doi.org/10.1016/j.apenergy.2020.115390
76. Butters, R. A., Dorsey, J., Gowrisankaran, G. (2025). Soaking up the Sun: Battery Investment, Renewable Energy, and Market Equilibrium. *Econometrica* 93(3), 891–927. https://doi.org/10.3982/ECTA20411
77. Ekholm, T., Virasjoki, V. (2020). Pricing and Competition with 100% Variable Renewable Energy and Storage. *The Energy Journal* 41(SI1), 215–232. https://doi.org/10.5547/01956574.41.SI1.tekh
78. (not used)
79. Bibi, A., Marzeion, B. (2025). Wind Power Cannibalization in Finland: A Spatiotemporal Analysis Using ERA5 Data. EGU General Assembly 2025, EGU25-2588 (conference abstract, not peer-reviewed). https://doi.org/10.5194/egusphere-egu25-2588
