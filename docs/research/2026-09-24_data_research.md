# v5 — data availability research (2026-09-24)

## Already in v4 cache/DB (7 GB raw, 2.9 GB DuckDB, 19,197 lineage records)
- ENTSO-E 2020-01→2026-08, 19 zones / 21 borders: A44 price, A65 load, A75 gen per type, A68/A71 capacity,
  A72 reservoir (FI, LV, LT, SE1-4), A11 physical flows, A31 offered capacity implicit DA (EE-FI, LT-SE4, LT-PL,
  EE-LV, LV-LT, SE4-PL hourly to 2026-09; Swedish borders only to 2024-10-29 FB go-live), A61 (only PL-CZ/SK),
  A78 transmission unavailability parsed to asset/start/end/mw_available (EE-FI 688 rows, LT-SE4 612, LT-PL 16k),
  A80 generation unavailability. A09 scheduled exchanges only EE-LV 2025 (not loaded). No A73 per unit.
- Fingrid: 112/115 official DA capacity EE→FI / FI→EE 2020-2026; 55 EstLink total flow 15-min; 24-27 FI-SE caps;
  nuclear, CHP series. PSE 2024-06→: gen by class, load, flows per border section. Svk/Energinet prices.
- TYNDP 2024: NT2030/2040 CY2009 market-model prices loaded for 8 boundary zones only; DE/GA 2035/2040/2050 ×
  CY1995/2008/2009 archives cached but NOT parsed (contain FI, SE1-4, PL, EE, LV, LT node prices → the hourly
  neighbour profiles v3.5 used came from here). PECD CF 1982-2019, PEMMDB, demand profiles, hydro inflows.
- ERAA 2025: hourly NTC per border TY2028/2030/2033/2035 (1.4 M rows), dashboard raw data.
- BTD: reserves procured 2025; allocated_cb_capacity EE-LV/LV-LT 15-min (null before 2025-09).
- Documentary CSVs page-cited: scenarios (Elering, AST, Litgrid, Fingrid, SvK, PSE, ERAA), links, fuel paths.
- NOT in v4: JAO Nordic FB data, ENTSO-E net positions (12.1.E), Nord Pool aggregated curves (decided not to buy
  D-044), NVE LA25 Norway prices (licence unstated), Energy-Charts.

## New / not yet used open sources found
1. **JAO Nordic Publication Tool** (since 2024-10-29): free Web API, no token yet
   (`https://publicationtool.jao.eu/nordic/api/data/{finalComputation|fbDomainShadowPrice|maxExchanges|
   maxBorderFlow|maxNetPos|referenceNetPosition|validationReductions|preliminaryDomain}` with FromUtc/ToUtc/skip/take).
   Gives per MTU: RAM, PTDF per hub incl. virtual zones FI_EL (Estlink), SE4_NB (NordBalt), SE4_SP (SwePol),
   shadow prices, Flow_FB, min/max net positions, MaxBex (e.g. EE→FI, FI→EE columns), reference net positions
   and HVDC exchange. dateTimeUtc is CET despite the name. CSV/XML download button too.
   Use: hourly *effective* export limit of FI toward Estlink; validation of "Estonia as price-taker"; FI-side
   congestion detection. Nordic CCM Art. 25 publication obligation → public.
2. **Nord Pool Data Portal** (data.nordpoolgroup.com): free registration login; historical Elspot prices,
   capacities, flows, "market coupling capacities" 2013→; **Aggregated Bidding Curves** viewable per zone
   (FI, SE, DK, NO, PL, BALTIC cluster) for the current day without login, history behind login (free account
   likely; official API product paid €1,650/yr Nordics+Baltics, €430/yr per Baltic country; redistribution
   licence €3,500/yr). Baltic curves are one cluster EE+LV+LT, 15-min since SDAC 15-min go-live.
   Use: measured FI/SE4/PL supply-curve slope around clearing point (identification of boundary slope);
   Baltic residual demand curve. Terms to check before commit (no redistribution of raw curves; derived slopes OK?).
3. **ENTSO-E 12.1.E Net positions** (documentType A25, businessType B09) and **12.1.F scheduled commercial
   exchanges** (A09) for EE-FI, LT-SE4, LT-PL — v4 has A09 for EE-LV only. Commercial vs physical distinction
   matters for HVDC (losses, ramping) → add.
4. **ENTSO-E HVDC Utilisation and Availability Statistics** (yearly PDF, 2015→2024; 2024 edition 2025-06-30):
   per link monthly GWh by category (transmission N/S, disturbance, planned/unplanned maintenance, limitations),
   counts of outages per year, narrative of each major event. EstLink 2: 2024 available 38 %, 62 % disturbance
   (7-month cable repair), damaged again Dec 2024 → 2025. EstLink 1 2024: 97.5 %, 5 trips, 3 planned outages.
   LitPol 2024: 89 % available but 44 % of hours "limited" (PL grid). NordBalt 2024: 97 %, 4 disturbances.
   Use: outage parameters (rates, durations) documentary-sourced instead of fitted; LitPol limitations profile.
5. **Nord Pool REMIT UMM REST API** (free, registered user): every transmission unavailability message
   (asset, MW unavailable, start/end, reason) for Nordic+Baltic since ~2015. Complements ENTSO-E A78.
6. **Elering dashboard API** (no key): NPS prices, system balance, cross-border flows, planned trade, capacity,
   UMM — Estonian cross-check independent of ENTSO-E.
7. **Energy-Charts API** (Fraunhofer ISE, CC BY 4.0, free): prices, public power, cross-border flows incl. EE,
   FI, PL, SE — redundancy source, one licence.
8. **TGE aggregated curves** (Poland): published for Fixing II / IDA and historical "Curves_15_30_60"; Fixing I
   (main DA) unclear — check. PSE API v2 open.
9. **BTD API** (no key, 65 reports): balancing/reserves; no DA cross-zonal limit publication found.
10. Fingrid 112/115 official DA capacity FI-EE already cached: hourly NTC on EstLink 2020-2026 (both directions).

## Not available free
- Nord Pool aggregated curves history via API (paid). Nordic ATC before FB go-live only via ENTSO-E A31 (have).
