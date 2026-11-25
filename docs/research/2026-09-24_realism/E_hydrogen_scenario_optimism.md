# Hydrogen, electrolysers and optimism in TYNDP/ERAA scenarios: evidence for a Baltic price model

Research date: 2026-09-24. Scope: Finland, Sweden (SE4 is the model's neighbour; Swedish electrolysers sit in SE1), Poland, Estonia, Latvia, Lithuania and the EU. The neighbouring zones use ENTSO-E/ENTSOG TYNDP 2024 and TYNDP 2026 hourly prices.

**How to read this file**

- Numbers in brackets such as [4] point to the numbered source list at the end.
- **[calc]** marks my own arithmetic on published numbers. It is not a figure from the source.
- **unverified** marks a claim I could not check against an opened primary source. The reason is given each time.
- TYNDP 2026 figures come from the **draft** scenarios, released in June 2026 [3]. ACER's opinion is out [10], but Member State and Commission approval is not. The final numbers may change.
- Where I extracted numbers from ENTSOs' spreadsheets, the file and field are named so the step can be repeated. See "Method notes" before the source list.

---

## Key findings (short)

1. **Scenario electrolysers are one to two orders of magnitude above what exists or has reached FID.**
   - Installed capacity today: the EU had about 0.3–0.6 GW in 2024–25 [14][18][19]. Europe as a whole had about 2.8 GW under construction in mid-2025 [21].
   - TYNDP 2024 National Trends (NT) assumed about 103 GW in the EU27 for 2030 [5][6].
   - The TYNDP 2026 draft NT+ assumes about 58 GW for 2030 [2]. ERAA 2025 assumes about 52 GW [8].
   - For the model's neighbours, the gap is widest for **Sweden** (8.1 GW in 2030 in TYNDP 2026 and ERAA 2025, against 35 MW installed) and **Finland** (TYNDP 2024: 8.7 GW in 2030 and 29.5 GW in 2040; TYNDP 2026: 1.4 GW in 2030 and 18.6 GW in 2040, against 30 MW installed).
2. **The overstated electrolysis is large relative to national demand.**
   - In TYNDP 2026 NT+, Swedish electrolysers use 50.5 TWh in 2030 [2]. A plausible 2030 range is about 4–8 TWh [calc]. That leaves roughly 40–47 TWh of flexible demand that probably will not exist. For scale, Svenska kraftnät's 2026 base level for total Swedish demand is 136 TWh [41].
   - Finnish electrolysers use 87 TWh in 2040 in NT+. Svenska kraftnät's own 2026 scenarios assume 1–2 GW of Finnish electrolysis in 2040 [41].
3. **Regulators and auditors already call the hydrogen assumptions optimistic.**
   - ACER called TYNDP 2024 NT+ hydrogen demand (about 500 TWh in 2030, 1,688 TWh in 2040) "very optimistic" [9].
   - In July 2026, ACER said the TYNDP 2026 variants capture hydrogen uncertainty too narrowly and should allow asymmetric ranges for it [10].
   - The European Court of Auditors found the EU 2030 targets "overly ambitious" [16].
4. **Hydrogen expectations keep being revised down, but not always, and not only down.**
   - IEA pipeline potential for 2030 fell from 49 to 37 to 27 Mt between the 2024, 2025 and 2026 reviews [17][18][19].
   - Only about 16% of the capacity awarded in the second EU Hydrogen Bank auction reached a signed grant agreement [25][27].
   - Counter-evidence: Europe expects its first 100+ MW plants in 2026, and EU capacity could reach 2.4 GW by the end of 2026 [19]. Finnish projects placed among the lowest bids in the 2024 and 2025 Hydrogen Bank auctions [25][29].
5. **Optimism runs in two opposite directions for prices.**
   - Optimistic supply assumptions (renewables, grids, flexibility) push modelled prices **down**.
   - Optimistic demand assumptions (electrolysers, industry) push them **up**.
   - In the TYNDP 2026 draft, Nordic and Baltic 2040 prices are high: Finland about 132 €/MWh and Lithuania about 126 €/MWh in the KPI dashboard [2]. *Editor's note:* the dashboard's "load-weighted" price also weights prosumer nodes, which carry distribution charges; at the e-market (wholesale) node the weather-weighted 2040 means are about 108 (FI) and 96 (LT) €/MWh (energiamudel methodology §3). The comparison below still holds. Svenska kraftnät's 2026 scenarios give about 67–74 €/MWh (Finland) and about 80–91 €/MWh (Lithuania) for 2040 [41].
   - My inference is that demand-side (hydrogen) optimism dominates for these zones in TYNDP. **unverified**: I have not decomposed it in a model.
6. **TYNDP prices are very sensitive to the demand–supply balance.** In the TYNDP 2026 draft, the economic variants keep supply fixed. A change in native demand of about −6…−9% (low variant) or +4…+10% (high variant) moves 2040 average prices in FI, SE, PL and the Baltics by about −41…−57% and +56…+84% respectively [2] [calc]. ACER notes that holding supply fixed limits these variants [10].

---

## A. Hydrogen and electrolysers

### A1. What the scenarios and national plans assume

**Table A1-1: EU27 electrolyser capacity, electricity for electrolysis and hydrogen demand**

| Source | 2030 | 2035 | 2040 | Notes |
|---|---|---|---|---|
| TYNDP 2024 NT/NT+: electrolyser GW | 67.0 grid-connected ("market and hybrid RES") + 36.4 dedicated-RES = **103.4 GW** | n/a | 213 + 93.1 = **306 GW** | Data figures Fig. 34 [5]. My sum of NT2030/NT2040 model outputs for EU27 nodes gives 67.0 / 212.7 GW grid-connected [6]. |
| TYNDP 2024 NT: electricity for grid-connected electrolysers | **204 TWh** | n/a | **812 TWh** | Fig. 23 [5][4]; model outputs agree: 204.2 / 812.5 TWh [6] |
| TYNDP 2024 NT+: total H₂ demand | **483.5 TWh** (incl. 76.8 TWh e-fuels) | n/a | **1,688 TWh** | Fig. 10 [5]. ACER notes the PLEXOS "native" demand is 423 TWh [9]; I extract 421.9 TWh [6]. |
| TYNDP 2026 draft NT+: electrolyser GW (E-market + dedicated RES + shared RES) | 39.4 + 5.1 + 13.8 = **58.3 GW** | **140.0 GW** | **242.7 GW** | NT+ KPI dashboard, weighted climate years [2]. 2050: 376 GW. |
| TYNDP 2026 NT+: electricity for electrolysis (P2G) | **225 TWh** | **603 TWh** | **963 TWh** | Main report p. 52 [1]; 1,630 TWh in 2050. Electrolysis is about 20% of total demand by 2050 (p. 63). |
| TYNDP 2026 NT+: H₂ final demand | **212 TWh** | 456 TWh | 700 TWh | p. 44 [1] and data figures; 1,071 TWh in 2050. Supply is about 250 TWh in 2030, with a 27% import share (p. 73). |
| ERAA 2025 (final): electrolysers "available on market" | 52.1 GW (2028: 19.9 GW) | 125.1 GW | n/a (horizon 2035; 2033: 95.1 GW) | My EU27 sum of `GenerationCapacities.csv` [8]. ERAA 2025 and TYNDP 2026 share one data collection [8]. |
| EU policy | 40 GW (Hydrogen Strategy 2020); 10 Mt domestic + 10 Mt imports (REPowerEU 2022) | n/a | n/a | ECA: 10 Mt "may require up to 140 GW" of input capacity. National strategies add up to 34–39 GW; draft NECPs to 46–50 GW [16] (Table 4, PDF p. 26; para 39, PDF p. 28). Hydrogen Europe counts national 2030 targets of 53 GWel [21] (p. 19). |

The change from TYNDP 2024 to TYNDP 2026 is −44% in EU electrolyser GW for 2030 and −21% for 2040 [calc]. Electricity for electrolysis did **not** fall: 204 TWh grid-only in 2030 became 225 TWh for all P2G, and 812 TWh became 963 TWh in 2040. The higher running hours account for this [1][5] [calc].

The hydrogen demand definitions differ between the cycles. TYNDP 2024's 483.5 TWh total includes e-fuels, power generation and bunkers. TYNDP 2026's 212 TWh is **final** demand. Treat the direction of change as robust but not the exact ratio.

**Table A1-2: Electrolyser capacity by country (GW electric input)**

| Country | TYNDP 2024 NT (2030 / 2040) [6] | TYNDP 2026 NT+ draft (2030 / 2035 / 2040) [2] | ERAA 2025 final (2028 / 2030 / 2033 / 2035) [8] | National plan or TSO view |
|---|---|---|---|---|
| **Finland** | **8.73 / 29.5** | 1.4 / 5.5 / **18.6** (25.7 in 2050) | 0.45 / 1.40 / 2.28 / 2.94 | No quantitative 2030 electrolyser target [13][21]. NECP aims for 200 MW by 2025 [21] (p. 40 note). The government aims to produce at least 10% of the EU's emission-free H₂ in 2030 (resolution of 9 Feb 2023) [38]. Svenska kraftnät's LMA 2026 assumes FI electrolysis of 1.0–2.0 GW in 2040 and 1.0–3.4 GW in 2050 [41] (Fig. 12, p. 59). |
| **Sweden** | **6.67** (6.45 of it in SE1) / **19.2** | **8.1 / 15.5 / 15.5** (all SE1 in ERAA) | 0.98 / **8.08** / 12.5 / 15.5 (all SE1) | ACER's compilation lists 5 GW for 2030 [13]. **unverified**: I could not open the underlying Swedish document, and Hydrogen Europe lists no NECP/strategy target for Sweden [21] (p. 40). Svenska kraftnät LMA 2026 gives SE electrolysers in 2040 of 1.0 / 3.4 / 5.5 / 5.5 GW (LF/MM/HP/HF) and in 2050 of 1.1 / 4.9 / 9.6 / 9.6 GW [41] (Fig. 12, p. 59). |
| **Poland** | 2.0 / 4.0 | 0.4 grid + 4.4 dedicated-RES / 3.2 + 6.8 / 9.5 + 6.8 | 0.23 / 0.40 / 2.1 / 3.2 | Hydrogen Strategy (Jan 2021): 2 GW by 2030 [16] (Annex V, PDF p. 82) [13]. The NECP estimate of about 2 GW covers low-carbon sources including thermochemical [21] (p. 46 note). |
| **Estonia** | 0 / 0 | 0 / 0.1 / 0.6 (1.6 in 2050) | 0 in all years | 0.15 GW is **not a target** but an estimated potential [13] [16] (Annex V). NECP update (approved 5 Jun 2025): no electrolyser target. It estimates about 2,700 t (90 GWh) of green H₂ a year for transport obligations and notes no industrial H₂ use [45]. |
| **Latvia** | 0 / 0 | **1.0 / 1.0 / 1.0** (modelled domestic H₂ demand = 0, so output is exported) | 0 / **1.0** / 1.0 / 1.0 | No quantitative electrolyser target found in the final updated NECP (English text search) [44]. Not listed in ACER's target dataset [13]. **unverified**: provenance of the 1 GW in TYNDP/ERAA. |
| **Lithuania** | 0.30 / 2.3 | 1.3 / 1.3 / 5.5 (8.5 in 2050) | 0.05 / 1.3 / 1.3 / 1.3 | Final updated NECP: 1.3 GW and 4.26 TWh H₂ (129 kt) by 2030, needing 6.51 TWh of electricity (p. 57). Grid-connected flexible electrolysis of 1.3 GW by 2030 and 4.0 GW by 2040 (Table 3.4.2, p. 97). 8.5 GW and 36.36 TWh of electricity by 2050. A planned measure covers 996 MW for 2024–2030 [43]. |

**Table A1-3: Electricity for electrolysis and H₂ demand by country (TWh)**

| Country | TYNDP 2024 NT electrolyser load, 2030 / 2040 [6] | TYNDP 2026 NT+ E-market electrolyser load, 2030 / 2035 / 2040 [2] | TYNDP 2024 NT H₂ native demand, 2030 / 2040 [6] | TYNDP 2026 NT+ H₂ demand, 2030 / 2035 / 2040 [2] | Other national view |
|---|---|---|---|---|---|
| Finland | **35.9 / 141.8** | 9.2 / 29.4 / **87.0** | 29.0 / 72.5 | 5.9 / 12.5 / 19.0 | Fingrid Q3/2025: *total* FI consumption of 103–123 TWh in 2030 and 104–159 TWh in 2035 [37] |
| Sweden | 27.4 / 75.4 | **50.5 / 68.6 / 79.3** | 19.6 / 60.6 | 20.5 / 49.3 / 65.8 | SvK LMA 2026 H₂ electricity: 2040 LF 9 / MM 24 / HP 37 / HF 38 TWh; 2050 9 / 33–35 / 62–65 TWh [41] (pp. 12, 43) |
| Poland | 2.3 / 10.0 | 0.4 / 5.0 / 23.7 | 44.2 / 113.4 | 1.1 / 3.5 / 26.5 | n/a |
| Estonia | 0 / 0 | 0 / 0.5 / 2.5 | 0.5 / 2.7 | 0.6 / 1.0 / 1.4 | NECP: about 0.09 TWh H₂ needed [45] |
| Latvia | 0 / 0 | 2.9 / 4.0 / 3.2 | 0.8 / 3.4 | 0 / 0 / 0 | none found [44] |
| Lithuania | 1.5 / 16.1 | 4.4 / 6.3 / 26.3 | 3.4 / 18.9 | 3.1 / 7.4 / 17.4 | NECP: 6.51 TWh of electricity in 2030 [43] |

Caveat on H₂ demand: the fields differ between cycles. TYNDP 2024 uses "native demand" by country H₂ node. TYNDP 2026 uses "H2 Demand (zone 1 and zone 2)". The drop for Poland from 44 to 1 TWh in 2030 almost certainly reflects scope, for example existing on-site grey hydrogen, rather than a real 97% cut. **unverified**: I could not confirm the definitions in the methodology reports.

ERAA 2025 carries only electrolyser capacities in the dashboard raw data I examined. I found no hydrogen-demand series there [8].

### A2. What has actually happened

**Table A2-1: Installed and committed electrolysis compared with assumptions**

| Indicator | Value | Source |
|---|---|---|
| Global installed electrolysis, end-2023 | 1.4 GW. The IEA then said it "could reach 5 GW by end-2024" | IEA GHR 2024, p. 59 [17] |
| Global installed, end-2024 | **almost 2 GW**. So the one-year-ahead expectation of 5 GW was missed by about 60% | IEA GHR 2025, p. 99 [18] [calc] |
| Global installed, end-2025 | more than 4 GW (doubled in 2025, about ¾ of additions in China) | IEA GHR 2026, pp. 81, 90 [19] |
| EU installed, end-2024 | about 340 MW, against the 6 GW interim target for 2024 | IEA GHR 2025, p. 100 [18] |
| EU installed (Observatory data via ACER) | 133 MW (2022) → 205 MW (2023) → 308 MW (2024). FI 10.2 MW, SE 34.2 MW, PL 7.5 MW in 2024. EE, LV and LT are below the 1 MW display threshold | ACER CHEST item 953 [14] |
| Europe operational, end-2024 (Observatory) | 376 MW (121 projects ≥0.5 MW) and 2,840 MW under construction. Sweden is to add 743 MW, the second largest after Germany (1,057 MW) | European Hydrogen Observatory, Nov 2025, PDF pp. 5, 23 [23] |
| Europe operational, June 2025 | ≥571 MWel (229 plants). SE 35 MW, FI 30 MW (incl. P2X Harjavalta 20 MW commissioned in 2025). PL and the Baltics are not in the top 10 (<13 MW) | Hydrogen Europe CHM 2025, pp. 19–20 [21] |
| Europe operational, end-2025 (Observatory "census", via press) | 571.7 MW (140 projects) and 3,272.5 MW under construction to 2029. **unverified**: it is a secondary report, and the figure is identical to Hydrogen Europe's June 2025 count, which suggests the same underlying data | HydroNews, 24 Feb 2026 [22] |
| EU growth needed for the 40 GW (2030) ambition | ×70 from today's installed base (this implies about 0.57 GW) | IEA GHR 2026, p. 32 [19] [calc] |
| EU installed could reach, end-2026 | 2.4 GW (about 6% of 40 GW). More than one third of Europe's 2026 additions depend on one project (Stegra, >700 MW) | IEA GHR 2026, p. 91 [19] |
| Europe under construction | 2.84 GWel (July 2025) = 3% of an 84.2 GWel electrolytic pipeline | CHM 2025, pp. 19, 39 [21] |
| Europe FID/under construction for operation by 2030 | about 3 GW (about 50 small and medium projects; the largest is Stegra, 740 MW). FIDs slowed in 2025: 12 projects Jan–Jul, 9 of them <25 MW | IEA GHR 2025, p. 101 [18] |
| FID trend | Capacity reaching FID fell by about 30% in 2025 against 2024. European FIDs "dropped sharply"; some developers returned public funding | IEA GHR 2026, pp. 85, 91 [19] |
| Global pipeline potential for 2030 | 49 Mtpa (GHR-24) → 37 Mtpa (GHR-25; electrolysis >80% of the drop) → 27 Mt (GHR-26). More than 100 GW of announced electrolysis could miss 2030 without FID by end-2027 | [17] p. 59; [18] p. 7; [19] p. 81 |
| Announced vs FID (global) | 520 GW announced, 4% FID (2024) → 440 GW announced, 6% FID (2025). 65 GW "almost certain / strong potential" | [17] p. 59; [18] pp. 101–102 |
| Hydrogen Europe's own 2030 outlook | Europe 1.7 Mt (15 GWel). Nordics 0.51 Mt (3.9 GWel), about 15% of a 26 GWel Nordic pipeline. **SE 1.3 GW, FI 0.8 GW, PL 0.3 GW** supply scenario. Meeting national targets (53 GWel) would need 149% a year growth against 42% achieved since 2020 | CHM 2025, pp. 19, 29, 40, 46 [21] |
| ACER (2024) | 216 MW installed (2023). About 70 GW planned by 2030 against >100 GW needed. About 1% of projects at FID. The 20 Mt 2030 goal is likely to be missed | ACER news, 19 Nov 2024 [12] |
| ENTSO-E's own view | ENTSO-E notes a "significant gap" between EU hydrogen objectives and reality. Only 3% of European H₂ production projects are operational or under construction, and 4.5% of REPowerEU supply has binding offtake | ENTSO-E hydrogen report, June 2025, PDF pp. 8–9 [52] |

**Table A2-2: EU Hydrogen Bank, awarded vs signed vs withdrawn**

| Auction | Selected | Signed / current status | Withdrawn |
|---|---|---|---|
| Pilot (IF23), results Apr 2024 | 7 projects, about €720 m, about 1.5 GWe [29][30] | 6 signed on 7 Oct 2024: €694.5 m, **1,442 MWe**. This includes Finland's eNRG Lahti (90 MW) and Norway's SKIGA (117 MW) [24]. The IEA's 2026 table lists 1,142 MW "awarded" [19] (p. 206). | 1 withdrew before signing [24]. Argus reports that two pilot winners had withdrawn by Sep 2025 [27]. The 500 MW Catalina project (Spain) is reported to have terminated its grant. **unverified**: the S&P Global source returned HTTP 403, and the 1,442 vs 1,142 MW difference is unexplained. |
| IF24, results May 2025 | 15 projects, 2,330 MW, €993 m [27][28] | 6 signed on 20 Jan 2026: **381.25 MWe, €270.6 m**. This includes **Kristinestad PtX (Finland, 200 MWe, lowest bid €0.33/kg)** [25]. | 7 projects, **1,883.5 MW (81%)** and €755 m, withdrew by Sep 2025, including Zeevonk 560 MW (NL) and H2-Hub Lubmin 210 MW (DE). 10 reserve projects with 774 MW were invited [27][28]. Signed / selected = **16%** of MW [calc]. |
| IF25, results May 2026 | 9 projects, about 1.1 GW, €1.09 bn, 58 bids. This includes **Cloudberry (Finland, 500 MW, €0.44/kg)** [29][26] | Grant agreements expected Q4 2026 [26] | n/a (too early). The bid range is reported inconsistently: pv magazine gives a lowest bid of €0.44/kg [29]; the IEA table gives USD 0.48–1.21/kg and 1,085 MW [19] (p. 206). |

Bruegel estimated that the €3 bn Hydrogen Bank endowment would support about 0.7 Mt by 2030, about 7% of the 10 Mt goal [30].

**Region-specific cancellations, delays and financing problems**

- **Ørsted FlagshipONE** (Örnsköldsvik, SE; 55 kt/yr e-methanol) was cancelled on 15 Aug 2024. The e-fuel market was developing too slowly and no offtake could be signed at an acceptable price. Impairment was about DKK 1.5 bn [35]. The IEA notes it was cancelled **after FID** because it lacked long-term offtake [18] (p. 90).
- **Neste Porvoo** (FI): a 120 MW electrolysis project was cancelled. Finland's 4% RFNBO transport quota lets refinery hydrogen count for at most 1%, which Neste said undermined viability [18] (p. 47).
- **Stegra, Boden (SE)**:
  - About 700–740 MW of electrolysers [18][34][21]. All 37 modules were installed by April 2026, with pre-commissioning still to come [34].
  - In Nov 2025 it needed an extra SEK 10 bn [33].
  - A €1.4 bn round was agreed in April 2026, with cost overruns acknowledged, and closed on 24 Jun 2026 [31][32].
  - The start-up timeline is "under review" [32]. The IEA says any delay would move a large share of Europe's 2026 additions into later years [19] (p. 91).
- **Fortescue** exited PEM50 (Gladstone) and the 80 MW Arizona project in July 2025, writing down US$150 m [36]. In the sources consulted I found no Fortescue project in the six countries. It is evidence of developer pull-back, not of a regional cancellation.
- **Finnish P2X pipeline**:
  - More than 40 hydrogen projects worth more than €17 bn are in the pipeline [39].
  - Fingrid has about 70 GW of consumption connection enquiries. If all were realised, consumption would exceed 400 TWh. Fingrid's own forecast is 103–123 TWh for 2030 [37] (PDF pp. 3, 5).
  - Operating capacity is about 30 MW [21].
  - Hydrogen Europe *raised* its Finnish outlook in 2025 [21] (p. 33).
  - A peer-reviewed study finds Finland's pipeline would exceed a 10% EU share by 2030 if realised, while EU projects overall fall short of 2030 objectives [40]. Only the highlights were accessible; the full text returned HTTP 403.
- **ECA special report 11/2024** [16]:
  - The Commission set its targets without robust analysis. They were "overly ambitious", and the EU is unlikely to meet them by 2030 (para V, PDF p. 5).
  - Advanced-stage renewable projects in Europe were projected to deliver about 2.7 Mt by 2030 (para 40).
  - Poland had no GW-scale project at an advanced or feasibility stage (para 101, PDF p. 54). In Poland in 2023, 0.01 GW had FID or was under construction, against 1.3 GW announced (Annex III, PDF p. 72).

**Table A2-3: Announced or assumed vs realised, 2030 (GW)** [calc except where cited]

| Zone | TYNDP 2026 NT+ / ERAA 2025 (2030) | Installed (latest) | Committed / funded | Industry outlook for 2030 | Scenario ÷ outlook |
|---|---|---|---|---|---|
| EU27 | 58.3 / 52.1 | about 0.34 (end-2024) [18]; about 0.57 implied (end-2025) [19] | 2.4 possible by end-2026 [19]; Europe about 3 FID [18] | 15 (Europe incl. UK/NO) [21] | about 3.9× |
| Sweden | 8.1 / 8.08 | 0.035 [21] | Stegra about 0.74 [18] | 1.3 [21] | about 6× |
| Finland | 1.4 / 1.40 | 0.030 [21] | EHB-signed 0.29 (Lahti 90 + Kristinestad 200) [24][25]; +0.5 selected (Cloudberry) [29] | 0.8 [21] | about 1.75× |
| Poland (grid-connected) | 0.4 (+4.4 dedicated) / 0.40 | 0.0075 [14] | 343 MW with national support [19] (p. 196) | 0.3 [21] | about 1.3× grid (about 16× incl. dedicated) |
| Lithuania | 1.3 / 1.3 | <0.001 [14] | none identified in the sources consulted (**unverified**: no targeted search was possible) | n/a | n/a |
| Latvia | 1.0 / 1.0 | <0.001 [14] | none identified (**unverified**, as for Lithuania) | n/a | n/a |
| Estonia | 0 / 0 | <0.001 [14] | n/a | n/a | consistent |

### A3. What this implies for electricity demand in the scenarios

**Table A3-1: 2030 electricity for electrolysis, assumed vs plausible** [calc; ranges are mine, built only from the cited inputs]

| Zone | Assumed (TYNDP 2026 NT+) | Plausible range for 2030 | How the range is built | Likely overstatement |
|---|---|---|---|---|
| EU27 | 225 TWh [1] (TYNDP 2024 NT: 204 TWh grid-only [5]) | about 10–82 TWh | Low: 2.4 GW [19] × 4,000 h. High: Hydrogen Europe's 1.7 Mt [21] ÷ TYNDP's implied 69% efficiency (154.9 TWh H₂ from 225 TWh) [2] | about 140–215 TWh (60–95%) |
| Sweden (SE1) | 50.5 TWh (8.1 GW × 6,250 h) [2] | about 4–8 TWh | Stegra 0.74 GW × 5,000 h to Hydrogen Europe's 1.3 GW × 6,250 h | **about 42–47 TWh**, roughly 30% of Svenska kraftnät's 2026 demand level of 136 TWh [41] |
| Finland | 9.2 TWh [2] (TYNDP 2024: 35.9 TWh [6]) | about 1.5–5 TWh | Signed EHB projects (0.29 GW × 5,000 h) to Hydrogen Europe's 0.8 GW × 6,546 h | about 4–8 TWh (TYNDP 2024: about 31–34 TWh) |
| Lithuania | 4.4 TWh [2]; NECP 6.51 TWh [43] | not quantifiable from the sources consulted | no FID or operating project found | direction: probably overstated (**unverified**) |
| Latvia | 2.9 TWh [2] | ~0 unless a project exists | no NECP basis found [44] | probably overstated (**unverified**) |
| Poland (grid) | 0.4 TWh [2] | 1–2 TWh | Hydrogen Europe 0.3 GW [21] | not overstated on the grid side |
| Estonia | 0 | 0 | NECP [45] | consistent |

**Beyond 2030**

- Finland 2040: TYNDP 2026 NT+ has 87 TWh of electrolysis on top of 144 TWh of native demand. Svenska kraftnät's 2026 scenarios assume Finnish electrolysis of 1–2 GW in 2040, which is about 5–10 TWh at 5,000 h [41] [calc]. The TYNDP figure is about 9–17 times higher. TYNDP 2024 NT had 141.8 TWh for Finland in 2040 [6].
- Sweden 2040: TYNDP 2026 NT+ has 79 TWh against Svenska kraftnät's 9–38 TWh range [41], about 2–9 times higher [calc]. Svenska kraftnät cut its whole 2050 demand range from 209–365 to 192–333 TWh. It cites profitability problems of green industrial projects: high capex, rising interest rates, uncertain power prices and tough international competition [41] (p. 36).
- Total Finnish demand in 2030: TYNDP 2026 NT+ has about 136 TWh (121.4 E-market + 5.2 prosumer + 9.2 electrolysers) [2]. TYNDP 2024 NT had about 147 TWh [6]. Fingrid forecasts 103–123 TWh [37] [calc]. Definitions of losses and prosumers may differ slightly, but the gap is larger than any such difference.

**Why it matters for the neighbour prices**

- In both TYNDP cycles, electrolysers are price-responsive loads. They absorb low-price and surplus hours up to their hydrogen value. In NT+, the modelled Finnish hydrogen price rises from about 58 €/MWh (2030) to 171 (2040) and 279 €/MWh (2050) [2].
- Ruhnau (2022) shows that flexible electrolysis puts a floor under wind and solar market values: about €19 ± 9/MWh for solar and €27 ± 8/MWh for wind in 2050 [64].
- If electrolysis is much smaller than assumed, low-price and zero-price hours in Finland and Sweden are likely to be more frequent. Average prices would then be lower than in the TYNDP series, all else equal. This is my inference from the mechanism [64] and from the TYNDP 2026 variant behaviour below. **unverified**: it has not been modelled for these zones.
- Hydrogen flexibility also matters for adequacy. Svenska kraftnät finds that removing e-fuel hydrogen flexibility and Swedish rock-cavern storage raises LOLE to 49–130 h in SE1 (high-demand scenarios, 2050) and up to 12 h in SE4 (lower-demand scenarios). It calls this an **upper bound**, because investment was not re-optimised [41] (pp. 106–108).
- So a TYNDP world with fewer electrolysers is not simply "cheaper". Hours of scarcity depend on how much *other* flexibility exists.
- In ERAA 2025 all Swedish electrolysers sit in SE1 [8]. In TYNDP 2024 NT 2030, 97% of them do (6.45 of 6.67 GW) [6]. The effect on **SE4** is indirect, through north–south flows. I have not quantified it.
- Svenska kraftnät's short-term market analysis (Mar 2026) expects Sweden's net electricity surplus to shrink from 34 TWh (2026) to 12 TWh (2030) as planned northern industry comes online [42]. So the TSO does expect demand growth, just far less electrolysis than TYNDP.
- **Germany**, which couples to PL and SE4: 181 MW of electrolysis operating and 1,271 MW at FID or under construction (EWI, May 2026) [65]. Hydrogen Europe counted 193 MW by June 2025 [21]; the trackers differ. TYNDP 2026 NT+ assumes 9.6 GW grid-connected in 2030 [2], and ERAA 2025 assumes 10 GW [8].

---

## B. How optimistic are the scenarios themselves?

### B1. Critiques of TYNDP/ERAA scenario assumptions

**Regulators and auditors**

- **ACER Opinion 05/2024** on the draft TYNDP 2024 scenarios, 30 Sep 2024 [9]:
  - Hydrogen: NT+ demand of 500 TWh (about 15 Mt) in 2030 and 1,688 TWh (about 51 Mt) in 2040 "appears very optimistic". Current consumption is about 264 TWh (8 Mt), and only 3 GW of electrolyser projects are confirmed (para 21a, PDF p. 4).
  - Both deviation scenarios had *more* hydrogen than NT+, so the set was not balanced.
  - Datasets were frozen in Q1 2023, before the draft updated NECPs (paras 12–13, PDF p. 3).
  - Delivery was delayed and transparency was insufficient (PDF p. 8).
- **ACER Opinion 13/2026** on the draft TYNDP 2026 scenarios, 8 Jul 2026 [10]:
  - The "gap-filling" method (cutting coal and oil demand until the EU targets are met) is "overly simplistic". It risks giving an impression of target compatibility.
  - The Commission and independent analyses still find a persistent gap to the 2030 targets (PDF pp. 2, 7).
  - NT+ reflects national inputs as of 31 Dec 2024.
  - The economic variants change EU final energy demand by only about ±1%, and hydrogen by less than 7% in 2040. Supply is held constant. ACER asks for "asymmetric" ranges for hydrogen (PDF p. 10).
  - The hydrogen scenario grid includes less-advanced projects: 67% of the PCI/PMI candidates are less-advanced (PDF p. 9).
  - There are "substantial differences" between some TSO country demand inputs and the Commission's assessment of the final NECPs (PDF p. 12).
  - Differences between TYNDP and ERAA persist.
- **ACER Decision 06/2026 on ERAA 2025**, 30 Apr 2026 [11]:
  - Approved, with the model corrected for inconsistencies between the investment and adequacy modules.
  - These inconsistencies "may otherwise systematically overstate adequacy concerns". **Counter-direction**: on adequacy, ACER's worry is *pessimism*, not optimism.
- **Artelys study for ACER** (Aug 2025) [15]:
  - The hydrogen reference grids for 2030/2035 remain "rather optimistic" (PDF pp. 27–28).
  - One NRA says demand developments are overestimated without structural explanation (PDF p. 50).
  - Two NRAs call the scenarios "too optimistic". One NRA wants an ERAA/TYNDP scenario that does **not** assume the targets are met (PDF p. 94).
- **European Court of Auditors SR 11/2024**: see A2 [16].
- **ENTSO-E** itself (June 2025) acknowledges a significant gap between policy objectives and hydrogen reality [52].

**Think tanks and industry**

- **RMI** (Mar 2025) [53]:
  - Recalibrate EU expectations from 20 Mtpa to about 2.2–2.8 Mtpa (mandated) plus 1.5–4.2 Mtpa (aspirational).
  - Renewable H₂ output is about 0.02 Mtpa.
  - About €3 bn of €21.4 bn committed funding has reached projects.
- **Bruegel** (May 2024): the Hydrogen Bank endowment covers about 7% of the 10 Mt goal [30].
- **Hydrogen Europe** (industry association, Sept 2025): the 2024 target of 6 GW was missed, and national targets would need 149% a year growth [21].
- **ECNO** (Ecologic, NewClimate, Reform Institute): see B2 [51].
- **Gap**: I opened no Agora Energiewende, Ember-on-TYNDP or Aurora critique of TYNDP/ERAA. The web search budget ran out, so their positions are not represented. Ember's 2023 central and eastern Europe price study is used in B3.

**Academic work on optimism and forecast accuracy**

- Odenweller & Ueckerdt (2025), *Nature Energy*, DOI 10.1038/s41560-024-01684-7 [58]:
  - Tracked 190 projects over 3 years. Only 7% of global capacity announced for 2023 was finished on schedule.
  - Realising the whole 422 GW pipeline would need about US$1.3 trn of subsidies.
  - Policymakers should prepare for "prolonged" green hydrogen scarcity.
- Carvallo et al. (2018), *Energy Policy*, DOI 10.1016/j.enpol.2018.04.060 [59]: 12 Western US utilities' mid-2000s load forecasts mostly **overestimated** energy and peak growth, mainly through optimistic economic-growth assumptions. The abstract was read via OSTI.
- IEA's own track record: the one-year-ahead electrolysis expectation missed (5 GW expected, about 2 GW actual), and the pipeline potential for 2030 has been cut twice [17][18][19].
- Kriechbaum et al. (2021), *Research Policy*, DOI 10.1016/j.respol.2021.104262 [63]: expectations about energy technologies show hype and disillusionment cycles (German wind, PV, biogas, 1992–2017).
- **Counter-evidence (pessimism)**:
  - O'Neill & Desai (2005), *Energy Policy*, DOI 10.1016/j.enpol.2003.10.020 [60]: EIA projections tended to **underestimate** US energy consumption, by about 4% at 10–13 years. This masked offsetting errors: GDP too high and energy intensity too low.
  - Way et al. (2022), *Joule*, DOI 10.1016/j.joule.2022.08.009 [61]: most energy-economy models **underestimated** renewable deployment and overestimated costs.
  - Xiao et al. (2021), *Energy Strategy Reviews*, DOI 10.1016/j.esr.2021.100636 [62]: cost declines for wind and solar were "structurally underestimated" in virtually all scenario studies.
  - Takeaway: optimism is **technology-specific**. For hydrogen and new industrial demand, the record shows over-optimism. For solar, wind and batteries, the historical record shows under-estimation.

### B2. Are NECP 2030 targets off track? (EU and the six countries)

**EU level**

- **COM(2025) 274** (Commission, 27/28 May 2025), based on the final NECPs [46]:
  - Greenhouse gases: about −54% projected against −55%, which the Commission calls "well on track" (PDF p. 4).
  - Renewables: national contributions give 41% against the 42.5% target, a 1.5 pp gap. An optimistic reading gives 42.6% (PDF p. 10).
  - Energy efficiency: an ambition gap of 31.1 Mtoe in final energy consumption, equivalent to 8.1% against 11.7%.
  - Effort Sharing: about −38% against −40%. LULUCF: a gap of 45–60 MtCO₂e.
  - Estonia and Poland had not submitted final NECPs by end-April 2025 (PDF p. 3).
  - These are **ambition** gaps based on plans. They are not a delivery check.
- **EEA** (indicator, 23 Apr 2026) [49]: the EU renewable share was 25.2% in 2024. Reaching 42.5% needs roughly double the past decade's pace (about 8% a year CAGR in the renewable share).
- **ACER** (Jul 2026) cites the persistent NECP gap as the root of TYNDP's gap-filling problem [10].
- **Build-out indicator**: the SolarPower Europe/Rystad base case (May 2026) gives EU 2030 capacity of 574 GW solar (target 600) and 344 GW wind (target 425, −19%) [54]. TYNDP 2026 NT+ has about 1,086 GW of wind and solar in 2030 [1], against 918 GW in that base case: about +18% [calc]. The SolarPower Europe/Rystad figure comes from an industry association with an interest in faster build-out.

**Table B2-1: The six countries' 2030 plan status**

| Country | NECP RES contribution vs RED formula [48] | RES projected with policy mix vs needed [51] | ESR (−% vs 2005) projected vs target [51] | Final energy consumption projected vs contribution (Mtoe) [51] | Other |
|---|---|---|---|---|---|
| Finland | 62% vs 62% | 62.0% vs 62% (meets, WEM) | −43.3% vs −50% (**−7 pp**) | 22.8 vs 20.6 (**−2.2**) | EEA cumulative ESR balance still in small surplus by 2030 (+1%) [48]. The metric differs from ECNO's. |
| Sweden | **67% vs 76% (−9 pp)** | 67% vs 76% (**−9 pp**); Sweden reports no contribution | −41.4% vs −50% (**−9 pp**) | 33.8 vs 25.4 (**−8.4**) | EEA: cumulative ESR balance turns to a deficit from 2028 (−15% by 2030) [48] |
| Poland | 32.6% vs 32% | n/a (final NECP not submitted by Mar/May 2025) [51][46] | n/a | n/a | Commission assessment of the final plan not checked (**unverified**) |
| Estonia | 65% vs 50% | n/a (submitted June 2025) | n/a | n/a | Commission assessment (2 Oct 2025): gaps remain on ESR (−24% target), LULUCF and efficiency. Target of 100% renewable electricity by 2030 [47] |
| Latvia | 61% vs 61% | 62% vs 61% (+1) | −20.5% vs −17% (+4) | 3.6 vs 3.5 (−0.2) | RES share rose ≥2 pp in 2024 [49] |
| Lithuania | 55% vs 49% | 68.4% vs 49% (+19.4) | −21.5% vs −21% (+1) | 4.4 vs 4.3 (−0.2) | RES share rose ≥2 pp in 2024 [49] |

Interpretation:

- On **renewable ambition**, the Baltic states meet or exceed the RED formula. Sweden is the clear laggard in the neighbour set on renewables and efficiency.
- The national biennial progress reports (NECPRs, 2025) themselves were **not** opened. The EEA and ECNO rely on national projections.

### B3. Studies that quantify higher prices from slower build-out or less flexibility

| Study | What is varied | Quantified effect | Relevance / caveats |
|---|---|---|---|
| TYNDP 2026 draft, economic variants (my extraction from KPI dashboards) [2] | Native demand −6…−9% (LEV) / +4…+10% (HEV), with **supply fixed** | 2040 load-weighted average prices (€/MWh), LEV / NT+ / HEV: FI 71.7 / 132.3 / 207.0; SE 53.3 / 91.8 / 168.7; PL 40.1 / 68.4 / 108.6; EE 72.6 / 133.7 / 214.6; LV 44.8 / 103.3 / 179.8; LT 66.7 / 125.5 / 201.2; EU27 45.7 / 96.8 / 166.5. This is roughly −41…−57% / +56…+84% [calc]; prices are load-weighted and averaged over weighted climate years. In 2035: FI 57.4 / 100.3 / 158.9; SE 33.6 / 73.1 / 127.7 | Shows how steep TYNDP's supply curve is near tightness. It overstates real-world sensitivity because investment does not respond, which ACER criticises [10]. It is a direct warning for users of TYNDP hourly prices. |
| Svenska kraftnät LMA 2026 [41] | Four demand/supply scenarios (LF/MM/HP/HF), 44 weather years | 2040 annual average (€/MWh), LF/MM/HP/HF: SE 59.5 / 67.6 / 77.3 / 73.9; FI 73.7 / 67.8 / 71.0 / 66.8; LT 86.8 / 90.1 / 91.2 / 79.7; PL 82.9 / 83.1 / 83.6 / 77.8 (Fig. 31, p. 79). The high-demand scenario (HP) is about 18 €/MWh above LF for Sweden [calc]. | A TSO view with investment co-optimised. 2040 FI and LT prices are far below TYNDP 2026 NT+ (132 / 126) and TYNDP 2024 NT (FI 119, LT 138 [6]). Models and weather years differ. |
| SvK LMA 2026, HVDC not renewed (−2.3 GW of links: SwePol, Baltic Cable, Fenno-Skan 1, Konti-Skan) [41] | Less interconnection | 2040: SE3/SE4 **−4 €/MWh** (LF), FI −3 €/MWh (LF, HP). 2050: about +1 €/MWh, with more hours above 150 €/MWh. Needs +1.7–3.1 GW of dispatchable capacity (pp. 130–133). | **Counter-evidence**: less flexibility can *lower* average prices in exporting zones, while raising peak-hour frequency. |
| SvK LMA 2026, reduced hydrogen flexibility [41] | Remove e-fuel H₂ flexibility and Swedish cavern storage | LOLE 49–130 h in SE1 (HP/HF, 2050); up to 12 h in SE4 (pp. 106–108) | An upper bound (no re-investment). Scarcity pricing implied but not quantified in €/MWh. |
| EEA briefing, 2 Jul 2026 [50] | Counterfactual with renewables "stalled" at the 2010 mix, against continued deployment | EU average wholesale price in 2030: **€160/MWh** (stalled) vs **€71/MWh** (continued deployment, stable gas). Lithuania: €116/MWh observed in early 2026 vs €211/MWh in the stalled counterfactual | An extreme bounding case, which the EEA calls a "worst-case". It is not a realistic delay scenario. |
| Navia Simon & Díaz Anadón (2025), *Nature Energy* 10:329–341, DOI 10.1038/s41560-025-01704-0; briefing DOI 10.1038/s41560-025-01715-x [57][56] | Meeting, missing or exceeding the NECP 2030 renewable targets | Per the Cambridge press release: meeting the targets cuts price volatility by about 20% on average and prices by more than 25%. Exceeding the targets by 30% makes prices about 50% less sensitive to gas | The full paper was not opened (paywall). A search-engine summary gave different figures (29%/65%), so **unverified** which is exact. |
| SolarPower Europe / Rystad (May 2026) [54] | "Solar+" (more PV and batteries) vs a base case that misses the wind and solar targets | Day-ahead prices −14% on average (to €63.4/MWh); Poland −16% | Industry-commissioned. The base case itself documents a build-out shortfall. |
| Ember (May 2023) [55] | Central and eastern Europe (incl. PL) with 200 GW of wind and solar vs current policy | −29% average wholesale price by 2030 | Older and advocacy-oriented, but quantified. |
| Ruhnau (2022), *Applied Energy* 307:118194, DOI 10.1016/j.apenergy.2021.118194 [64] | Flexible electrolysis demand | Keeps renewable market values at or above about €19–27/MWh (2050) | The mechanism by which *missing* electrolysers lower off-peak prices. |

*Editor's note (2026-09-24):* the TYNDP 2026 prices in the first row are the KPI dashboard's "load-weighted" prices, which also weight prosumer nodes carrying distribution charges; the relative changes between variants are the point of the row, not the levels. Wholesale e-market prices of NT+ are in energiamudel methodology §3.

---

## Balanced assessment

**Hydrogen and electrolysers: high confidence that the scenarios are optimistic**

- Every independent indicator points the same way: realised capacity, FID rates, auction attrition, cancellations, the ECA, ACER, and even Hydrogen Europe's own outlook.
- The magnitude for the model's neighbours:
  - **Sweden** is the largest single issue in both cycles: 6.7 GW (2024) and 8.1 GW (2026) in 2030, against about 1.3 GW (Hydrogen Europe) and a single 0.74 GW plant under construction.
  - **Finland** was extreme in TYNDP 2024 (8.7 GW and 36 TWh in 2030; 29.5 GW and 142 TWh in 2040). It is moderate in TYNDP 2026 for 2030 (1.4 GW) but still very large by 2040 (18.6 GW, 87 TWh).
  - For **Poland**, grid-connected electrolysis is small in 2030. The 4.4 GW of dedicated-RES electrolysers barely touch the price-forming grid.
  - **Latvia** and **Lithuania** carry 1.0–1.3 GW from 2030 with no committed projects visible. Latvia's has no plan basis that I could find.
  - **Estonia** is consistent: zero.
- Counter-evidence that should temper the view:
  - Deployment is accelerating (EU about 0.5 GW at end-2025 and possibly 2.4 GW at end-2026).
  - Finland has competitive, EU-backed projects with low bids and an upward-revised outlook.
  - Stegra's financing closed in June 2026.
  - The TYNDP 2026 draft already cut 2030 EU electrolysers by 44% against TYNDP 2024.
- My judgement:
  - For **2030**, TYNDP 2026 NT+ electrolysis in SE1 is 5–10 times too high and in FI 1.5–2 times too high [calc].
  - For **2035–2040**, the uncertainty is wide, but the TSO's own scenarios (Svenska kraftnät) sit at a small fraction of the TYNDP values.

**Renewables, grids and flexibility: mixed evidence, moderate confidence**

- Signs of supply-side optimism:
  - The EU is off pace on renewables (2024: 25.2%).
  - Wind is expected to fall about 19% short of the 2030 goal.
  - TYNDP 2026 NT+ has about 18% more wind and solar in 2030 than an industry base case.
  - The gap-filling method pretends target compliance.
  - Sweden's plan is 9 pp below its renewable formula share.
- Signs against:
  - Historically, models *under*-forecast solar, wind and battery deployment and cost declines.
  - The Baltic states over-deliver on renewable ambition.
  - ACER's main 2026 criticism of ERAA is that it may *overstate* adequacy risk.

**Net effect on neighbour prices: direction depends on zone and year (inference, not modelled)**

- In **FI, SE and the Baltics**, the TYNDP 2040 price levels look high relative to TSO analysis (TYNDP 2026 NT+ FI 132, LT 126 €/MWh in the KPI dashboard, or about 108 and 96 at the wholesale node, against Svenska kraftnät's 67–91). That is consistent with **demand-side optimism, especially electrolysis, dominating**. Removing phantom electrolysis would likely **lower** off-peak and average prices there.
- In **PL**, prices are driven more by thermal adequacy and the pace of renewable build-out. There, slower build-out would likely **raise** prices. TYNDP 2024 NT 2040 already shows Polish scarcity: 157–205 €/MWh average marginal cost and 116 h LOLE (CY2009) [6].
- Prices from the TYNDP 2026 draft react very strongly to small demand shifts when supply is fixed (±6–9% demand moves prices about ±50%). **Any TYNDP-based price series should be treated as conditional on its electrolyser and demand assumptions, not as a forecast.** ENTSOs themselves say the scenarios "are not meant to forecast" [1].

**Open questions / unverified items**

- Provenance of Latvia's 1 GW electrolysers in ERAA 2025 and TYNDP 2026, and whether any Latvian or Lithuanian project has reached FID.
- The Commission's assessment of Poland's final NECP. National progress reports (NECPR 2025) were not opened.
- Exact H₂-demand definitions across TYNDP cycles, including the Poland 44 → 1 TWh drop.
- The Pilot Hydrogen Bank capacity after withdrawals: EC 1,442 MW signed vs IEA 1,142 MW.
- The Navia Simon & Díaz Anadón percentages, and the S&P and ScienceDirect items (HTTP 403).
- The IEA Hydrogen Production Projects Database (June 2026) needs an IEA login, so it was not accessed [20]. The IEA figures here come from the GHR reports built on it.
- Agora and Aurora positions are not covered, because the web search budget was exhausted.

---

## Method notes (to repeat the numbers)

- **TYNDP 2026 NT+/LEV/HEV KPI dashboards** [2]: one sheet per country; column "Weighted WS" for each target year. Rows used:
  - "Electrolyzers E-Market (P2G) [GW Elec]", "…DRES…", "…SRES…" (installed capacity)
  - "Consumption [TWh] → Electrolyzers E-Market (P2G)"
  - "H2 Demand", "Native Demand (E-Market)", "Native Demand (Prosumer)"
  - "Prices → Electricity → Load-Weighted Average", "Prices → H2 → Load-Weighted Average"
- **TYNDP 2024** [6] (listed on the download page [7]): `MMStandardOutputFile_NT2030/NT2040_Plexos_CY2009_2.5_v40.xlsx`.
  - Sheet "Yearly Outputs": "Installed Capacities [MW] → Electrolyser (load)", "Annual generation [GWh] → Electrolyser (load)", "Marginal Cost Yearly Average", "Loss of load expectation".
  - Sheet "Yearly H2 Outputs": "Native Demand (excl. H2 storage charge)", "Electrolyser (gen.)".
  - This is a single climate year (2009).
- **ERAA 2025** [8]: `Dashboard Raw Data/GenerationCapacities.csv`, data_version = "ERAA 2025 final", Technology = "Electrolyser".
- Unit convention: 1 kg H₂ = 33.33 kWh (LHV); "GW" of electrolysers = electrical input.

---

## Sources

1. ENTSO-E & ENTSOG, *TYNDP 2026 Draft Scenarios Report* (Version June 2026), 2026. https://2026-data.entsos-tyndp-scenarios.eu/main-documents/ENTSOs_TYNDP2026_Scenarios_Main_Report_260701.pdf
2. ENTSO-E & ENTSOG, *TYNDP 2026 Scenarios – KPI dashboards NT+, LEV, HEV* (xlsx), June 2026. https://2026-data.entsos-tyndp-scenarios.eu/output/model-results/kpi-dashboards/NT+_KPI_Dashboard.xlsx (also …/LEV_KPI_Dashboard.xlsx, …/HEV_KPI_Dashboard.xlsx)
3. ENTSO-E, "ENTSO-E and ENTSOG release their joint Draft Scenarios for TYNDP 2026", news, June 2026. https://www.entsoe.eu/news/2026/06/11/entso-e-and-entsog-release-their-joint-draft-scenarios-for-tyndp-2026/
4. ENTSO-E & ENTSOG, *TYNDP 2024 Scenarios Report – Final Version*, January 2025. https://2024.entsos-tyndp-scenarios.eu/wp-content/uploads/2025/01/TYNDP_2024_Scenarios_Report_FInal_Version_250128_web.pdf
5. ENTSO-E & ENTSOG, *TYNDP 2024 Scenario Report Data Figures* (xlsx), 22 May 2024. https://2024.entsos-tyndp-scenarios.eu/wp-content/uploads/2024/05/TYNDP_2024-Scenario-Report-Data-Figures_240522.xlsx
6. ENTSO-E & ENTSOG, *TYNDP 2024 market-modelling standard output files, NT2030 and NT2040 (PLEXOS, CY2009)*, May 2024. https://2024-data.entsos-tyndp-scenarios.eu/files/scenarios-outputs/MMStandardOutputFile_NT2030_Plexos_CY2009_2.5_v40.xlsx.zip and https://2024-data.entsos-tyndp-scenarios.eu/files/scenarios-outputs/MMStandardOutputFile_NT2040_Plexos_CY2009_2.5_v40.xlsx.zip
7. ENTSO-E & ENTSOG, *TYNDP 2024 Scenarios – download page*, accessed 2026-09-24. https://2024.entsos-tyndp-scenarios.eu/download/
8. ENTSO-E, *ERAA 2025 – modelling data* (Dashboard raw data zip; joint "ERAA2025_TYNDP2026 Data Collection Guidelines"), submitted Dec 2025, accessed 2026-09-24. https://www.entsoe.eu/eraa/2025/modelling-data/ ; https://eepublicdownloads.blob.core.windows.net/public-cdn-container/clean-documents/sdc-documents/ERAA/ERAA_2025_Dashboard_RawData.zip
9. ACER, *Opinion No 05/2024 on the compliance of ENTSO-E and ENTSOG draft TYNDP 2024 Scenarios Report with ACER Scenarios Guidelines*, 30 Sep 2024. https://www.acer.europa.eu/sites/default/files/documents/Official_documents/Acts_of_the_Agency/Opinions/Opinions/ACER_Opinion_05-2024_ENTSOs_Scenarios_TYNDP_Guidelines.pdf
10. ACER, *Opinion No 13/2026 on the ENTSO-E and ENTSOG draft TYNDP 2026 Scenarios Report*, 8 Jul 2026. https://www.acer.europa.eu/sites/default/files/documents/Official_documents/Acts_of_the_Agency/Opinions/Opinions/ACER-Opinion-13-2026-TYNDP-2026-Scenarios-Report.pdf
11. ACER, "ACER calls for improvements to the 2025 European Resource Adequacy Assessment (ERAA)" (Decision 06/2026), 30 Apr 2026. https://www.acer.europa.eu/news/acer-calls-improvements-2025-european-resource-adequacy-assessment-eraa
12. ACER, "ACER's hydrogen monitoring report foresees that Europe is likely to miss its 2030 renewable hydrogen targets", 19 Nov 2024. https://www.acer.europa.eu/news-and-events/news/acers-hydrogen-monitoring-report-foresees-europe-likely-miss-its-2030-renewable-hydrogen-targets
13. ACER CHEST, "Targeted electrolyser capacity for 2030 in EU Member States – September 2024 (GW)", updated 19 Nov 2024. https://aegis.acer.europa.eu/chest/dataitems/691/view
14. ACER CHEST, "Installed electrolyser capacity in the EU – 2022-2024 (MW)" (based on European Hydrogen Observatory), updated 28 Nov 2025. https://aegis.acer.europa.eu/chest/dataitems/953/view
15. Artelys for ACER, *Study to support the development of scenarios for EU-wide infrastructure planning and adequacy assessments – Final report*, Aug 2025. https://www.acer.europa.eu/sites/default/files/documents/Publications/ACER-Scenario-development-study-2025.pdf
16. European Court of Auditors, *Special report 11/2024: The EU's industrial policy on renewable hydrogen – time for a reality check*, July 2024. https://www.eca.europa.eu/ECAPublications/SR-2024-11/SR-2024-11_EN.pdf
17. IEA, *Global Hydrogen Review 2024*, Oct 2024. https://iea.blob.core.windows.net/assets/89c1e382-dc59-46ca-aa47-9f7d41531ab5/GlobalHydrogenReview2024.pdf
18. IEA, *Global Hydrogen Review 2025*, Sept 2025. https://iea.blob.core.windows.net/assets/12d92ecc-e960-40f3-aff5-b2de6690ab6b/GlobalHydrogenReview2025.pdf
19. IEA, *Global Hydrogen Review 2026*, 2026 (accessed 2026-09-24). https://iea.blob.core.windows.net/assets/af4b6218-0311-4963-91ab-903cb18ca0ca/GlobalHydrogenReview2026.pdf
20. IEA, *Hydrogen Production and Infrastructure Projects Database* (June 2026 release; login required, not accessed). https://www.iea.org/data-and-statistics/data-product/hydrogen-production-and-infrastructure-projects-database
21. Hydrogen Europe, *Clean Hydrogen Monitor 2025*, Sept 2025. https://hydrogeneurope.eu/wp-content/uploads/2025/09/Clean_Hydrogen_Monitor_09-2025_DIGITAL.pdf
22. HydroNews, "Only 500 MW of electrolysis operational in the EU by the end of 2025: the 'census' of the European Hydrogen Observatory", 24 Feb 2026 (secondary; consulted, not relied on for figures). https://www.hydronews.it/en/a-fine-2025-only-500-mw-of-electrolysis-operating-in-the-eu-census-of-the-european-hydrogen-observatory/
23. European Hydrogen Observatory, *The European hydrogen market landscape*, Nov 2025 (consulted). https://observatory.clean-hydrogen.europa.eu/sites/default/files/2025-11/The%20European%20hydrogen%20market%20landscape_November%202025.pdf
24. European Commission (DG CLIMA), "Winners of first EU-wide renewable hydrogen auction sign grant agreements…", 7 Oct 2024. https://climate.ec.europa.eu/news-other-reads/news/winners-first-eu-wide-renewable-hydrogen-auction-sign-grant-agreements-paving-way-new-european-2024-10-07_en
25. European Commission (DG CLIMA), "Six winners of the 2024 Innovation Fund hydrogen auction sign grant agreements…", 20 Jan 2026. https://climate.ec.europa.eu/news-other-reads/news/six-winners-2024-innovation-fund-hydrogen-auction-sign-grant-agreements-advancing-renewable-hydrogen-2026-01-20_en
26. European Hydrogen Observatory, "European Hydrogen Bank" (policy page, updated 23 Sep 2026). https://observatory.clean-hydrogen.europa.eu/eu-policy/european-hydrogen-bank
27. Argus Media, "Seven projects drop out of EU H2 bank negotiations", 18 Sep 2025. https://www.argusmedia.com/en/news-and-insights/latest-market-news/2733116-seven-projects-drop-out-of-eu-h2-bank-negotiations
28. pv magazine (P. Jowett), "Seven projects pulled from EU hydrogen fund", 22 Sep 2025. https://www.pv-magazine.com/2025/09/22/seven-projects-pulled-from-eu-hydrogen-fund/
29. pv magazine, "EU allocates 1.1 GW of electrolyzer capacity in third hydrogen auction, lowest bid comes in at €0.44/kg", 7 May 2026. https://www.pv-magazine.com/2026/05/07/eu-allocates-1-1-gw-of-electrolyzer-capacity-in-third-hydrogen-auction-lowest-bid-comes-in-at-e0-44-kg/
30. Bruegel (B. McWilliams, J. Kneebone), "Lessons from the European Union's inaugural Hydrogen Bank auction", 23 May 2024. https://www.bruegel.org/analysis/lessons-european-unions-inaugural-hydrogen-bank-auction
31. Stegra, "Stegra has agreed in principle on a €1.4 billion financing round", 14 Apr 2026. https://stegra.com/en/news-and-stories/stegra-has-agreed-in-principle-on-a-14-billion-financing-round
32. Stegra, "Stegra announces closing of €1.4 billion financing round", 24 Jun 2026. https://stegra.com/en/news-and-stories/stegra-announces-closing-of-14-billion-financing-round
33. GMK Center, "Stegra has secured €1.4 billion in financing to complete construction of its plant", Apr 2026. https://gmk.center/en/news/stegra-has-secured-e1-4-billion-in-financing-to-complete-construction-of-its-plant/
34. HydroNews, "Stegra installed all 37 electrolysis modules supplied by thyssenkrupp nucera in Boden", 3 Apr 2026. https://www.hydronews.it/en/stegra-installed-all-37-electrolysis-modules-supplied-by-thyssenkrupp-nucera-in-boden/
35. Offshore Energy, "Slow-developing e-fuel market prompts Ørsted to terminate FlagshipONE project", 15 Aug 2024. https://www.offshore-energy.biz/slow-developing-e-fuel-market-prompts-orsted-to-terminate-flagshipone-project/
36. Global Hydrogen Hub, "Fortescue scraps US, Australia green hydrogen projects", 24 Jul 2025. https://globalhydrogenhub.com/fortescue-scraps-us-australia-green-hydrogen-projects.html
37. Fingrid, *Prospects for future electricity production and consumption Q3/2025*, 2025. https://www.fingrid.fi/globalassets/dokumentit/fi/kantaverkko/kantaverkon-kehittaminen/fingrid_energiaennuste-q3-2025-eng.pdf
38. Finnish Government, "Government adopts resolution on hydrogen – Finland could produce 10% of EU's green hydrogen in 2030", 9 Feb 2023. https://valtioneuvosto.fi/en/-/1410877/government-adopts-resolution-on-hydrogen-finland-could-produce-10-of-eu-s-green-hydrogen-in-2030
39. forumNordic (C. Granlycke), "Finland's hydrogen dilemma – The molecule is ready, the market is not", 2 Jul 2026. https://forumnordic.com/business/finlands-hydrogen-dilemma-the-molecule-is-ready-the-market-is-not/
40. Jayawardhana, P., Kiehle, J., Calò, A., Pongrácz, E. (2025). "Hydrogen pipedreams or a new industrial revival: Industrial hydrogen demand by 2030 in Finland and Europe". *Renewable and Sustainable Energy Reviews* 222, 115966. https://doi.org/10.1016/j.rser.2025.115966 (highlights read via OpenAlex; full text not accessible)
41. Svenska kraftnät, *Långsiktig marknadsanalys 2026 – Scenarier för elsystemets utveckling fram till 2050* (Svk 2024/5367), 17 Jun 2026. https://svk.se/49e8f3/siteassets/om-oss/rapporter/langsiktig-marknadsanalys/langsiktig-marknadsanalys-2026.pdf
42. Svenska kraftnät, "De svenska elpriserna utjämnas – det visar vår kortsiktiga marknadsanalys 2025", 19 Mar 2026. https://www.svk.se/press-och-nyheter/nyheter/elmarknad-allmant/2026/de-svenska-elpriserna-utjamnas---det-visar-var-kortsiktiga-marknadsanalys-2025/
43. Republic of Lithuania, *Final updated NECP 2021–2030 (English)*, submitted 2024. https://commission.europa.eu/document/download/e4569d35-7ab0-4445-8fa6-017357d04546_en?filename=LT_FINAL%20UPDATED%20NECP%202021-2030%20%28English%29.pdf
44. Republic of Latvia, *Final updated NECP 2021–2030 (English)*, submitted 2024. https://commission.europa.eu/document/download/3e07cbed-22c0-4b69-a8e5-887e0c6aa09e_en?filename=LV_FINAL%20UPDATED%20NECP%202021-2030%20%28English%29_0.pdf
45. Republic of Estonia, *Estonia's National Energy and Climate Plan (NECP) to the year 2030 – Update* (approved 5 Jun 2025; machine translation), via Climate Policy Radar. https://cdn.climatepolicyradar.org/navigator/EST/2025/estonia-updated-final-national-energy-and-climate-plan-necp-2021-2030_42cafb7b105ee2e5d990ae23f5072d6b.pdf
46. European Commission, *COM(2025) 274 final – EU-wide assessment of the final updated national energy and climate plans*, 27 May 2025. https://commission.europa.eu/document/download/97168210-2a5c-4d1a-9ed8-6a063e011537_en?filename=COM_2025_274_1_EN_ACT_part1_v6.pdf
47. European Commission (DG ENER), "Commission's assessment of Estonia and Slovakia National Energy and Climate Plans shows improvements…", 2 Oct 2025. https://energy.ec.europa.eu/news/commissions-assessment-estonia-and-slovakia-national-energy-and-climate-plans-shows-improvements-2025-10-02_en
48. EEA, *Trends and projections in Europe 2025 – Technical background document*, 6 Nov 2025 (Tables A1.3, A1.4). https://www.eea.europa.eu/en/analysis/publications/trends-and-projections-in-europe-2025/eea-technical-background-document.pdf/@@download/file
49. EEA, "Share of energy consumption from renewable sources in Europe" (indicator), 23 Apr 2026. https://www.eea.europa.eu/en/analysis/indicators/share-of-energy-consumption-from
50. EEA, "Renewable electricity: best buffer against gas price volatility" (briefing), 2 Jul 2026. https://www.eea.europa.eu/en/analysis/publications/renewable-electricity-buffering-gas-prices
51. ECNO – Ecologic Institute, NewClimate Institute, Reform Institute, *Delivering the EU's 2030 climate and energy targets: Gaps in national contributions and policies* (22 final NECPs), 27 Mar 2025. https://climateobservatory.eu/sites/default/files/2025-03/AmbitionGap_Briefing_Update2025_1.pdf
52. ENTSO-E, *Impact of Renewable Hydrogen on the Power System: Sector Development, Flexibility and Market Aspects – Executive Summary*, June 2025. https://eepublicdownloads.blob.core.windows.net/public-cdn-container/clean-documents/Publications/2025/ENTSO-E_Report_on_Market_Design_and_Regulatory_Framework_Executive_Summary.pdf
53. RMI (Q. Homann, J. Rosas, C. Kerr, O. Tatarenko), "The Case for Recalibrating Europe's Hydrogen Strategy", 10 Mar 2025. https://rmi.org/the-case-for-re-calibrating-europes-hydrogen-strategy/
54. pv magazine, "EU solar and storage push could cut power system costs by nearly half" (SolarPower Europe / Rystad Energy "Solar+" analysis), 5 May 2026. https://www.pv-magazine.com/2026/05/05/eu-solar-and-storage-push-could-cut-power-system-costs-by-nearly-half/
55. Ember, "CEE can lower electricity prices by a third by 2030 with ambitious wind and solar deployment", 15 May 2023. https://ember-energy.org/latest-updates/cee-can-lower-electricity-prices-by-a-third-by-2030-with-ambitious-wind-and-solar-deployment/
56. University of Cambridge, "Electricity prices across Europe to stabilise if 2030 targets for renewable energy are met", 3 Feb 2025. https://www.cam.ac.uk/research/news/electricity-prices-across-europe-to-stabilise-if-2030-targets-for-renewable-energy-are-met-study
57. Navia Simon, D., Díaz Anadón, L. (2025). "Power price stability and the insurance value of renewable technologies". *Nature Energy* 10, 329–341. https://doi.org/10.1038/s41560-025-01704-0 ; research briefing "Faster deployment of renewables stabilizes electricity prices in Europe", *Nature Energy* 10, 291–292. https://doi.org/10.1038/s41560-025-01715-x (full text not opened)
58. Odenweller, A., Ueckerdt, F. (2025). "The green hydrogen ambition and implementation gap". *Nature Energy* 10, 110–123. https://doi.org/10.1038/s41560-024-01684-7
59. Carvallo, J.P., Larsen, P.H., Sanstad, A.H., Goldman, C.A. (2018). "Long term load forecasting accuracy in electric utility integrated resource planning". *Energy Policy* 119, 410–422. https://doi.org/10.1016/j.enpol.2018.04.060 (abstract via OSTI: https://www.osti.gov/pages/biblio/1457015)
60. O'Neill, B.C., Desai, M. (2005). "Accuracy of past projections of US energy consumption". *Energy Policy* 33, 979–993. https://doi.org/10.1016/j.enpol.2003.10.020 (IIASA IR-03-053 preprint: http://pure.iiasa.ac.at/id/eprint/7030/1/IR-03-053.pdf)
61. Way, R., Ives, M.C., Mealy, P., Farmer, J.D. (2022). "Empirically grounded technology forecasts and the energy transition". *Joule* 6, 2057–2082. https://doi.org/10.1016/j.joule.2022.08.009
62. Xiao, M., Junne, T., Haas, J., Klein, M. (2021). "Plummeting costs of renewables – Are energy scenarios lagging?". *Energy Strategy Reviews* 35, 100636. https://doi.org/10.1016/j.esr.2021.100636
63. Kriechbaum, M., Posch, A., Hauswiesner, A. (2021). "Hype cycles during socio-technical transitions: The dynamics of collective expectations about renewable energy in Germany". *Research Policy* 50(9), 104262. https://doi.org/10.1016/j.respol.2021.104262
64. Ruhnau, O. (2022). "How flexible electricity demand stabilizes wind and solar market values: The case of hydrogen electrolyzers". *Applied Energy* 307, 118194. https://doi.org/10.1016/j.apenergy.2021.118194
65. EWI (University of Cologne), "Hydrogen Monitor Q2/2026", May 2026 (Germany: 181 MW operational, 1,271 MW FID/under construction, >7.2 GW planned without FID by 2030; consulted for context). https://www.ewi.uni-koeln.de/en/publications/hydrogen-monitor-q2-2026/
