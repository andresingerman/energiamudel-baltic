# Demand growth and build-out realism in the scenarios (EE, LV, LT, FI, SE, PL)

*Research note, 2026-09-24. Asked by the owner: how fast is consumption expected to grow in the
six countries, with industrial electrification and data centres; and is the view right that the
TYNDP energy mixes are too optimistic, so that less will be built and prices will be higher
(arguments: recent build rates, cannibalisation of renewables and batteries, fewer subsidies,
supply-chain queues, over-optimistic hydrogen).*

**Method.** Five research notes, each written by an AI research agent (Claude) from sources it
opened on 2026-09-24, are the appendices in [`2026-09-24_realism/`](2026-09-24_realism/): A
Baltic demand, B Finland and Sweden, C Poland, D build-out realism, E hydrogen and the optimism
of the scenarios themselves. Every number there carries its source, with page or table, and
peer-reviewed work carries a DOI. The numbers marked [DB] below are computed from the model's own
database (ENTSO-E Transparency and the TYNDP/ERAA files, built by `make db`); the queries are in
the appendix at the end. The session's web-search quota ran out during the research, so each
note lists the items it could not verify.

**The answer in short.**

- **Demand has been flat for five years in all six countries, and every official forecast
  assumes it will now grow fast.** Past forecasts in the region mostly overshot, and the latest
  official revisions are downward (Finland, Sweden, Poland). TYNDP 2026 National Trends+ puts
  2030 demand at 1.6–1.7 times the 2025 level in Finland, Sweden, Latvia and Lithuania, much of
  it electrolysers; in Estonia and Poland it keeps 2030 demand about where it is.
- **The new loads are real in some places and not in others.** Finland has about 5 GW of data
  centres with signed grid agreements and over 3 GW of electric boilers running or being built.
  Poland's 9 GW of data-centre connection offers include no signed contract. Swedish and Finnish
  hydrogen and green-steel projects are cancelled, bankrupt or delayed, and the Baltic states have
  few named projects.
- **The build-out case is split by technology.** Onshore wind in Finland, Poland and Estonia and
  offshore wind outside Poland are well behind what the scenarios need. Solar and batteries are
  at or ahead of the scenarios in most of the six.
- **Cannibalisation is measurable.** Baltic solar now earns 0.54–0.65 of the average price, down
  from about 1.0 in 2020–22, and Finnish wind 0.55 in 2025 [DB]. Negative-price hours are frequent,
  reserve prices have collapsed as batteries arrived, and several support schemes were withdrawn.
- **Hydrogen is the largest optimism in the scenarios, and it pushes their prices up, not down.**
  TYNDP 2026 NT+ has 50.5 TWh of Swedish electrolysis in 2030 against about 35 MW installed. If
  that demand does not come, prices fall.
- **So the price direction is not one-sided.** The evidence supports higher-than-scenario prices
  most clearly for Estonia and Poland: there the scenario's demand is flat and the missing wind
  is large. For Finland and Sweden the scenario's prices look high rather than low, because its
  demand is inflated. For Latvia and Lithuania the direction depends on whether the assumed
  electrolysers arrive.

---

## 1. Demand

### 1.1 What happened: flat for five years

| TWh | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | Source |
|---|---|---|---|---|---|---|---|
| EE | 7.95 | 8.43 | 8.18 | 8.07 | 7.95 | 7.93 | ENTSO-E A65 load [DB] |
| LV | 7.06 | 7.31 | 6.81 | 6.47 | 6.98 | 7.20 | ENTSO-E A65 load [DB] |
| LT | 11.84 | 12.37 | 12.17 | 11.72 | 12.14 | 11.77 | ENTSO-E A65 load [DB] |
| FI | 78.35 | 84.71 | 79.22 | 78.95 | 81.96 | 84.55 | ENTSO-E A65 load [DB] |
| SE | | | | | | 134.2 | SCB (138.7 in 2019); note B |
| PL | 165.5 | 174.4 | | | | 167.5 | PSE gross; note C |

Definitions differ between TSOs, statistics offices and ENTSO-E by a few percent (losses,
self-consumption); notes A–C set them out before comparing numbers. Industrial use fell in
Sweden (47.7 → 41.7 TWh, 2020–2025) and in Estonia (−22 %) (notes B, A).

### 1.2 What is forecast

| TWh | 2025 actual | 2030 | 2035 | Source |
|---|---|---|---|---|
| EE | 7.9 | 10.0 / 10.4 / 8.2 | 11.2 / 12.2 / 9.9 | Elering (Dec 2025) / ERAA 2025 / TYNDP 2026 NT+ |
| LV | 7.2 | 9.0 / 9.0 / 12.3 | 11.5 / 11.7 / 14.4 | AST base (incl. 1.4 / 3.2 TWh hydrogen) / ERAA / NT+ |
| LT | 11.8 | 17.8–30.4 / 17.4 / 20.3 | 24.3–43.5 / 20.5 / 26.9 | Litgrid LTrSc–NacSc / ERAA / NT+ |
| FI | 84.6 | 103–123 / 106.3 / 139.3 | 104–159 / 129.4 / 177.6 | Fingrid Q3 2025 / ERAA / NT+ |
| SE | 134.2 | 164 (2029) / 163.1 / 215.1 | – / 204.3 / 264.9 | SvK KMA 2025 / ERAA / NT+ |
| PL | 167.5 | 181–194 / 177.9 / 165.5 | 203–221 / 196.7 / 185.9 | PSE adequacy–network plan / ERAA / NT+ |

ERAA 2025 and TYNDP 2026 NT+ are [DB]: ERAA's annual demand averaged over its climate years, and
NT+'s total of native, fixed, EV, heat and electrolyser load weighted over its weather scenarios.
The TSO figures are from notes A–C. Poland's NECP of June 2026 gives 195 / 221 TWh.

**How past forecasts fared** (notes A–C):
- Litgrid's 2016 plan forecast 12.59 TWh for 2025, almost exactly the 12.58 TWh that happened.
  Its 2020 and 2022 plans overshot 2025 by 10 % and 22 %, and their long-range endpoints kept
  rising (18.7 → 27.5 → 43.5 TWh).
- Elering's 2020 security-of-supply report overshot 2023–25 by about 11 %.
- Poland's 2009 energy policy overstated 2025 demand by 16 %, and PEP2040 of 2021 by 5.7 %.
- Fingrid's 2030 figure went from 131 to 126 to 103–123 TWh within two years.
- Svenska kraftnät's short-term analysis implied about 152 TWh for Sweden in 2025; the outcome
  was 134. ERAA cut Sweden's 2030 figure from 208.6 (ERAA 2024) to 163.1 TWh (ERAA 2025).

### 1.3 Industrial electrification and data centres

- **Finland.** Real new load is arriving:
  - About 5 GW of data centres with signed grid agreements (August 2026).
  - Under construction: Microsoft (phase 1 about end-2026), Nebius 310 MW (from 2027), Google
    (€13 bn, 2027–28).
  - Over 3 GW of electric boilers running or being built.
  - 60–70 GW of consumption enquiries against a record peak of 15.6 GW (January 2026).
- **Sweden.** Growth is concentrated in heavy-industry projects in SE1 and SE3, and they keep
  slipping:
  - Northvolt went bankrupt in March 2025, and Ørsted cancelled FlagshipONE in 2024.
  - Stegra's completion date is under review.
  - The HYBRIT demonstration plant has moved to 2028–29.
  - The queue holds 32.5 GW of consumption.
  - SE4, the zone next to Lithuania, stays at about 24–26 TWh to 2030 in every source.
- **Poland.** Connection offers far exceed contracts:
  - PSE's register holds 9.0 GW of data-centre connection offers. 77 % belong to one developer,
    and none has a signed contract. About 0.2–0.25 GW runs today.
  - ArcelorMittal has an 800 MW connection contract.
  - Orlen's largest electrolysers are about 100 MW each, due in 2030.
- **Baltic states.** Few named projects:
  - Lithuania: Achema postponed its 213 MW electrolyser.
  - Latvia: AST's forecast includes 1.4–3.2 TWh of hydrogen with no project named.
  - Estonia: Elering leaves new energy-intensive industry out of its forecast. It warns that a
    data centre contracted at 50 MW can run at 20–30 MW for years.
  - Estonia had about 10 000 electric cars in 2025 against 37 000 expected.

---

## 2. Build-out

| | Evidence | Note |
|---|---|---|
| **Onshore wind, FI / PL / EE** | TYNDP 2026 NT+ needs 1.5×, 1.8× and 5× the 2021–25 build rate. WindEurope's February 2026 outlook for 2030 is 7.7, 4.9 and 1.8 GW below the scenario, and WindEurope cut its own Finland figure by 3.6 GW in a year. | D §1.1 |
| **Onshore wind, SE / LT / LV** | On track, or the pipeline exceeds the scenario. Swedish turbine orders were about 30 MW in 2025, so expansion stalls after 2027. | D §1.1 |
| **Offshore wind** | Lithuania's second tender was invalid (one bidder, October 2025). Estonia dropped offshore support (2025). Sweden rejected 13 and then 11 projects on defence grounds, and Vattenfall shelved an approved one because prices are too low. Denmark's no-bid tender (2024) succeeded only as a CfD at €67–73/MWh. Poland awarded 3.4 GW at about €113–117/MWh, and first power at Baltic Power came in July 2026, a year late. | D §2 |
| **Solar** | Poland, Lithuania, Latvia and Sweden are already at or above TYNDP 2026's 2030 values. Finland would need six times its pace but is accelerating. | D §1.2 |
| **Batteries** | Finland has 1.6 GW (July 2026) against 1.0 GW in TYNDP 2024 for 2030. Lithuania has 690 MW, plus 1.7 GW subsidised. Sweden is above its TYNDP 2026 value. Poland has about 11 GW physical in its capacity market. Estonia is the exception: about 0.23 GW by end-2026 against 1 GW assumed. | D §1.4 |
| **Subsidies and market design** | Estonian offshore, onshore and storage support was cancelled in 2025. Finland and Sweden have no onshore support. From 2027, EU rules require new support to take the form of two-way CfDs without payment at negative prices. PPA prices fell (Pexapark Europe €52.5 → €44.4/MWh, January 2025 → April 2026). | D §4 |
| **Supply chain and grid** | Lead times are 2–3 years for cables, up to 4 years for large transformers and over 5 years for HVDC cables (IEA 2025). Poland refused 107 GW of connections in 2025. Fingrid bars new storage over 5 MW in southern Finland until 2029. WindEurope says turbine manufacturing is not the binding constraint; permitting, tenders and grids are. | D §5 |

### 2.1 Cannibalisation, measured [DB]

| Capture rate (generation-weighted ÷ time-mean day-ahead price) | 2020 | 2022 | 2024 | 2025 | 2026 Jan–Aug |
|---|---|---|---|---|---|
| Solar EE | 1.22 | 1.06 | 0.74 | 0.58 | 0.56 |
| Solar LT | 1.19 | 1.16 | 0.77 | 0.59 | 0.54 |
| Solar LV | – | – | 0.72 | 0.65 | 0.59 |
| Onshore wind FI | 0.85 | 0.71 | 0.65 | 0.55 | 0.66 |
| Onshore wind EE | 0.91 | 0.83 | 0.83 | 0.85 | 0.88 |

| Hours with a negative day-ahead price [DB] | 2022 | 2023 | 2024 | 2025 | 2026 Jan–Aug |
|---|---|---|---|---|---|
| EE | 2 | 129 | 183 | 203 | 40 |
| FI | 27 | 467 | 725 | 465 | 46 |
| SE4 | 29 | 368 | 632 | 374 | 85 |
| PL | 0 | 43 | 197 | 310 | 293 |

Batteries saturate reserve markets quickly:
- Finnish FCR-N fell from €46 to €19/MW/h between 2024 and June 2025.
- Swedish FCR-D prequalified capacity grew from under 10 MW to about 600 MW against a demand
  under 550 MW.

The literature explains the mechanism and its limits:
- Hirth (2013), [doi:10.1016/j.eneco.2013.02.004](https://doi.org/10.1016/j.eneco.2013.02.004).
- Reichenberg, Ekholm & Boomsma (2023), a Polish case; DOI in note D.
- Counter-argument: Brown & Reichenberg (2021) show that cannibalisation depends on policy
  design; DOI in note D.

---

## 3. Hydrogen: the largest optimism (note E)

| | 2030 assumed | Reality (2025–26) |
|---|---|---|
| EU electrolysers | TYNDP 2024 ≈ 103 GW; TYNDP 2026 ≈ 58 GW; ERAA 2025 ≈ 52 GW | ≈ 0.3–0.6 GW installed, ≈ 2.8 GW under construction; Hydrogen Europe expects ≈ 15 GW |
| Sweden | 8.1 GW, 50.5 TWh (TYNDP 2026 NT+) | 35 MW; Stegra (0.74 GW) under review |
| Finland | 1.4 GW 2030, 18.6 GW and 87 TWh in 2040 (NT+); TYNDP 2024 had 8.7 GW in 2030 | ≈ 20–30 MW; FlagshipONE and Neste Porvoo cancelled |
| Latvia, Lithuania | 1.0 GW and 1.3 GW from 2030 | no project with an investment decision found |

- The IEA's potential 2030 output from the project pipeline fell from 49 to 37 to 27 Mt over
  three reviews.
- Only about 16 % of the capacity awarded in the EU Hydrogen Bank's second auction reached a
  signed grant.
- ACER called TYNDP 2024's hydrogen demand "very optimistic". The European Court of Auditors
  called the EU targets "overly ambitious" (special report 11/2024).
- In July 2026 ACER asked for asymmetric hydrogen ranges in TYNDP 2026.

In the TYNDP market models electrolysers are flexible demand that buys cheap hours. Without
them, off-peak prices fall (Ruhnau 2022, [doi:10.1016/j.apenergy.2021.118194](https://doi.org/10.1016/j.apenergy.2021.118194)).
In the TYNDP 2026 economic variants, which hold supply fixed, native demand −6…−9 % or +4…+10 %
moves 2040 prices in these zones by −41…−57 % or +56…+84 %: the scenario prices are very
sensitive to the demand assumption.

---

## 4. What it means for prices

| Wholesale day-ahead / e-market node, €/MWh | EE | LV | LT | FI | SE4 | PL |
|---|---|---|---|---|---|---|
| Actual 2025 [DB] | 80.4 | 85.7 | 85.3 | 40.5 | 60.4 | 104.3 |
| TYNDP 2026 NT+ 2030, weather-weighted [DB] | 49.5 | 45.6 | 45.3 | 47.3 | 36.0 | 66.6 |
| TYNDP 2026 NT+ 2035 [DB] | 61.3 | 64.4 | 63.1 | 72.9 | 49.4 | 64.3 |
| TYNDP 2026 NT+ 2040 [DB] | 101.8 | 97.1 | 96.0 | 107.9 | 63.7 | 55.5 |
| TYNDP 2024 DE 2035, climate year 2009 [DB] | 54.2 | 55.7 | 50.8 | 44.9 | 51.1 | 62.2 |
| Svenska kraftnät LMA 2026, 2040, range of 4 scenarios (note E) | – | – | 79.7–91.2 (LT) | 66.8–73.7 | 59.5–77.3 (SE) | 77.8–83.6 |

Reading, per zone:
- **Estonia and Poland: higher than the scenario is likely.**
  - Both scenarios keep demand near today's level.
  - Their price fall rests on wind, offshore wind and batteries that are behind schedule: EE
    2.7 GW onshore and 1 GW of batteries by 2030; PL 19 GW onshore and 5.9 GW offshore.
  - In Estonia's case the support that was meant to deliver that build was withdrawn. The
    ministry's own (unpublished-method) estimate of the price effect of the cancelled auctions
    was about €24/MWh in 2030 (note D §6.2); read it as indicative.
- **Finland and Sweden: the scenario looks high, not low.**
  - NT+ reaches its 2035–2040 Finnish prices through demand that has not appeared, above all
    electrolysis.
  - Svenska kraftnät's own 2026 model gives Finland 67–74 €/MWh in 2040 against NT+'s 108.
  - A shortfall of wind that comes together with a shortfall of demand leaves the annual average
    near today's low level.
  - SE4 is the most stable of the six and sits between the two readings.
- **Latvia and Lithuania: either way.**
  - The scenario reaches low 2030 prices despite +67–71 % demand.
  - If the electrolysers and industry do not come, a smaller build can still give prices near
    the scenario's. If demand comes and wind does not, prices rise.
- **Scarcity and evening hours pull both ways.** Missing wind raises them. Batteries, running
  ahead of the scenarios, lower them.

No public study was found that isolates the price effect of a delayed build-out in these
markets (note D §6.2). The model itself can measure it; see §5.

---

## 5. Proposals for the model (for the owner to decide)

The model computes the Baltic states and reads Finland, SE4 and Poland as price profiles
(SPECIFICATION D2). The findings reach it by two routes.

1. **Baltic side (the model's own fleet and demand).** Presets that reflect delivery, not only
   plans:
   - A **"delivery" fleet preset** for EE, LV and LT:
     - onshore wind on WindEurope's February 2026 path;
     - no offshore wind before about 2033 outside awarded projects;
     - batteries as contracted: Estonia about 0.23 GW; Lithuania 0.69 GW plus the 1.7 GW
       subsidised.
   - **Demand presets without hydrogen:**
     - Estonia: Elering 10.0 / 11.2 TWh.
     - Latvia: AST without its 1.4 / 3.2 TWh of hydrogen.
     - Lithuania: Litgrid LTrSc without its 3.3 TWh of electrolysis.
   - Electrolysers at 0 by default, as a lever the user switches on.
2. **Boundary side (Finland, SE4, Poland).** The profiles cannot be re-run, only chosen or
   scaled (R-BND-5 allows a documented level factor). Options:
   - **Poland:** keep both families' profiles and add a documented upward level factor as a
     "slow build" sensitivity.
   - **Finland and SE4:**
     - Do not treat NT+ 2035–2040 as a low-price case. It carries demand that has not appeared,
       and its scarcity hours grow with the target year (methodology §3).
     - TYNDP 2024 Distributed Energy 2035 is closer to Svenska kraftnät's levels.
   - Record, for each profile, the demand it assumes next to its price.
3. **Sensitivities to publish with every scenario result** (note D):
   - (a) slow build with the scenario's demand;
   - (b) slow build with slow demand;
   - (c) storage above the scenario;
   - (d) gas price in the 2026 shock range.

Adopting any of these changes the specification (new presets or requirements) and needs the
owner's decision and a record in DECISIONS.md.

---

## 6. Limits of this note

- The session's web-search quota ran out while the notes were written. Each note ends with the
  items it could not verify, among them:
  - the Finnish government's strategy figures and Sweden's NECP numbers;
  - named data-centre projects in Estonia and Latvia;
  - Lithuania's first offshore project (Curonian Nord);
  - Finland's first offshore tender after April 2026;
  - Microsoft's and Google's Polish data-centre sizes.
- One source was replaced. The build-out note first computed prices and capture rates from the
  Energy-Charts API, which allows internal use only. Those numbers were recomputed from ENTSO-E
  data in the model's own database, and the two sets agree.
- The TYNDP 2026 KPI dashboard's "load-weighted" prices include prosumer nodes. This note uses
  the wholesale e-market prices throughout (methodology §3).
- Nothing here is a result of the model. No model run exists yet.

## Appendix: queries behind [DB]

Against `data/energiamudel.duckdb` as built at commit `c77ef40` or later:

```sql
-- annual load, TWh
SELECT zone, year(ts) y, sum(mw)/1e6 FROM load WHERE year(ts) BETWEEN 2020 AND 2025 GROUP BY ALL;
-- capture rate
WITH base AS (SELECT zone, year(ts) y, avg(eur_mwh) b FROM price GROUP BY ALL)
SELECT g.zone, g.tech, year(g.ts) y, sum(g.mw*p.eur_mwh)/sum(g.mw)/any_value(b.b)
FROM generation g JOIN price p USING (zone, ts) JOIN base b ON b.zone = g.zone AND b.y = year(g.ts)
WHERE g.tech IN ('solar', 'wind_onshore') GROUP BY ALL;
-- negative-price hours
SELECT zone, year(ts), count(*) FILTER (WHERE eur_mwh < 0) FROM price GROUP BY ALL;
-- NT+ weather-weighted wholesale price
SELECT p.zone, w.target_year, sum(w.weight * m.mean) FROM tyndp2026_weather w
JOIN (SELECT zone, weather, avg(eur_mwh) mean FROM tyndp2026_price GROUP BY ALL) m ON m.weather = w.code
JOIN (SELECT DISTINCT zone FROM tyndp2026_price) p ON p.zone = m.zone GROUP BY ALL;
```

ERAA 2025 demand: `eraa2025.dashboard_raw_data.zip`, `Aggregated_Demand.csv`, data version
"ERAA 2025 final", measure "Annual Demand (TWh)", type AVG, summed over a country's market nodes.
TYNDP 2026 NT+ totals: `tyndp2026.NTplus_KPI_Dashboard.xlsx`, country sheets, "Weighted WS"
columns, the Energy Balance rows "Electricity −".
