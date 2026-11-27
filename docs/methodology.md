# Methodology

*Gate status (R-PUB-4): the validation gate R-VAL-5 is not met — hourly price errors of 9–12
€/MWh in the fit years, which meet it, and 17–18 in the blind year 2025 against a threshold of 15
(§7.3, with the gas plants' one bid, decided by the owner on 2026-10-22, D-164; 8–11 and 17–18
before it on D-115's register, Kruonis's output in steps of its power, accepted by the owner on 2026-10-11, D-116; 9–12 and 18–19 before that on the decisions of the same day — September's data, the engine of record day
ahead and oil shale's market entry, D-111 to D-114 — over the register of D-073 with the boundary prices of
D-075 and D-076 and the Latvian–Lithuanian capacity of D-077, accepted by the owner on 2026-10-06,
D-078; 18–20 before them, on D-109's register; 12–16 and
19–20 before D-076; 12–17 and 21–22 on the register he accepted on 2026-10-05, D-042 and D-044,
D-045); the
EstLink 2 gate R-VAL-6 is met (§7.4); on 2026-10-17 the owner accepted the protocol's results as
they stand for release, the plant's included (R-SMR-8, D-123). The engine's gate (R-ENG-8, revision 1.4) is met: the engine of record reproduces the
offline reference on every test week (§6).*

The single description of what the model computes and from what (SPECIFICATION.md R-DOC-4).
Every formula names the function that implements it; every fitted parameter, limitation and
reference is listed here.

## 1. Data layer

Measured inputs are fetched from public APIs by `pipeline/sources/*`, one lineage record per
dataset (`data/lineage/<dataset>.json`: endpoint, parameters without credentials, fetch time,
HTTP status, SHA-256 of the response, licence), and loaded by `db/build.py` into a DuckDB
database in which every fact row names its record (R-DATA-3). Values read from published
documents are rows of `data/documentary/*.csv` with document, edition and page; each document
is cached as a file with its own record, and each page record names it (`derived_from`,
R-DATA-7). `docs/SOURCE_REGISTER.md` lists every source with its licence and use.

Time is UTC and marks the start of the interval everywhere (R-DATA-4). Sub-hourly series
(ENTSO-E after the 15-minute go-live, Fingrid, BTD, JAO) are averaged to the hour.

Stage 2 checks (`make check`): every fact row has its record and every record its file; every
source in use is registered and every cited document cached; prices of the six zones and load
of the three core zones are complete for 2023-2025, less the source gaps the check names (7 hours of Estonia's load in
2025), with 24 hours on every DST date; a fresh
build reproduces every table; JAO's time base agrees with ENTSO-E's; every documentary row has a
verification record (`data/documentary/verification.csv`); every table holds rows; every fitted parameter's lineage
record states the value the register holds (D-147, ERRATA E-158). `make db` updates the database in
place and skips archives that have not changed; a row removed from a documentary CSV leaves its
table at the next `make db` (ERRATA E-095), while a page citation removed from one keeps its
lineage record: the record's file stays in `data/lineage`, and every build loads it, a clean one too, until the
file is deleted, so the rebuild check, built from the same records, reports no difference. A change to how an
archive is read reaches the database only through a clean build (`rm data/energiamudel.duckdb && make db`),
since an unchanged archive is not read again (E-099).

### 1.1 Verification of the documentary inputs

Every row of `data/documentary/*.csv` has a record in `data/documentary/verification.csv`:
the value in the CSV, the value read, the page cited and the page found, a verdict, the
evidence and the method (DECISIONS.md D-006).

- **Rows extracted from a fetched file** (ERAA 2025, TYNDP 2024, the technology catalogues,
  ENTSO-E) are re-extracted by code on every run (`validate/documentary_eraa.py`,
  `validate/documentary_tyndp.py`, `validate/documentary.py`; `.venv/bin/python -m
  validate.documentary`).
- **Rows read off a page** were re-read on the cached edition on 2026-09-24 by an AI assistant
  (Claude), page by page, each record naming the page found; a row added or changed since carries the date
  of its own reading (`verified_on`, from 2026-09-25 to 2026-11-24) and its method. The parameters added in Stage 2
  were extracted by one reader and confirmed by a second pass: a script found each printed
  value on its cited page, and the tables and charts of the ENTSO-E HVDC statistics, whose text
  layer cannot be read, were re-read from the page images by a separate reader.

`make check` fails if a row has no record, if a record's verdict is not `ok` or `corrected`,
or if a row's value changed after it was verified. The owner may spot-check any record against
the cached file. Errors found are in `docs/ERRATA.md`.

## 2. PECD versus observed capacity factors (R-TIME-5)

Scenario years of the TYNDP 2024 family run on PECD 3.1 capacity factors (target years 2030 and 2040: the
target's own, or the two nearest blended, D-020); observed years run on observed ones (R-SUP-2).
`validate/pecd_cf.py` compares the two per core zone and technology, PECD's at target year 2030.
Observed capacity factor = ENTSO-E A75 generation / (average of the A68 capacity at
1 January of the year and of the next year × hours). A year outside 0.05-0.20 (solar) or
0.10-0.50 (onshore wind) is a data error, not weather, and is left out. Two comparisons: the
same calendar years 2015-2019, the only overlap (D-005); and the observed years 2020-2025
against the PECD climatology 1982-2019. Run on 2026-09-24:

| Zone | Technology | Same years 2015-2019: observed / PECD (years) | Observed 2020-2025 average | PECD 1982-2019 average | Ratio | PECD rank of the observed average |
|---|---|---|---|---|---|---|
| EE | wind_onshore | 0.71 (5) | 0.250 | 0.254 | 0.98 | 17/39 |
| EE | solar | —, 5 implausible left out | 0.121 | 0.113 | 1.07 | 38/39 |
| LV | wind_onshore | 1.06 (5) | 0.187 | 0.225 | 0.83 | 1/39 |
| LV | solar | — | 0.109 | 0.112 | 0.97 | 11/39 |
| LT | wind_onshore | 0.67 (5) | 0.251 | 0.410 | 0.61 | 1/39 |
| LT | solar | 0.81 (5) | 0.083 | 0.115 | 0.72 | 1/39 |

Reading:

- **Lithuanian wind** is the one systematic gap. The observed fleet produces 0.61-0.67 of the
  PECD factor, and its 2020-2025 average lies below every one of the 38 PECD years. PECD's target
  year 2030 describes a reference fleet of modern turbines (PECD average 0.41), but the record does
  not show new turbines closing the gap: the fleet grew from 534 to 2 507 MW in 2020-2026, and 2023
  and 2024, with 49-64 % of it new, gave 0.261 and 0.252 (`docs/research/2026-10-08_open2_pecd.md`).
  Curtailment, which A75 has taken out, and the capacity of fast-building years may push the ratio
  down; neither is measured.
- **Estonian wind** agrees in 2020-2025 (0.98). The 2015-2019 ratio of 0.71 rests on A68
  capacities that jump from 384 to 487 and back to 329 MW while generation does not follow; the
  same-year comparison is weaker than the recent one there.
- **Estonian solar, 2015-2019**, is unusable: A68 reports 1.0-1.4 MW beside 2.8-5.7 GWh of
  generation, then 33-123 MW beside 6-9 GWh. From 2020 the ratio is 1.07.
- **Lithuanian solar** at 0.72-0.81 is consistent with A75 missing part of the behind-the-meter
  fleet that A68 counts, and with growth inside the year; it is not corrected here.

Since D-107 Lithuania's onshore wind runs at 0.80 of PECD 3.1's capacity factor in the climate
years of TYNDP 2024 (`PECD_FACTOR`, `app/src/engine/build.ts`) — an interim, round factor between
the measured ratio and PECD, a factor on the capacity factor and not on the megawatts. Latvia and
Estonia are not corrected; TYNDP 2026's own factors (0.28–0.35 in Lithuania, nearer the record's
0.25) are left as they are. The four corrections measured on the opening state — none, 0.80, by
vintage (0.823) and the measured ratio (0.61) — are in `docs/research/2026-10-08_open2_pecd.md`.

## 3. The TYNDP 2026 scenario family (DECISIONS D-010)

Scenario years run in one of two families that never mix. The first is TYNDP 2024 on the
climate years 1995, 2008 and 2009 (§2 and R-TIME-2). The second is the TYNDP 2026 central
scenario National Trends+ (NT+) on its own weather scenarios: modelled years of CMIP6 SSP2-4.5
projections in PECD 4.2, three per target year, chosen by k-means from 30 candidates and
weighted by the share of candidates in each cluster (Methodology Report, June 2026, Annex III;
`tyndp2026_weather`, loaded from the report's data tables, sheets T32 and T35).

| Target year | Weather scenarios (climate model, modelled year, weight) |
|---|---|
| 2030 | WS003 (CMR5, 2027, 0.63); WS029 (MEHR, 2033, 0.30); WS021 (MEHR, 2025, 0.07) |
| 2035 | WS037 (CMR5, 2036, 0.43); WS059 (MEHR, 2038, 0.33); WS032 (CMR5, 2031, 0.24) |
| 2040 | WS077 (ECE3, 2041, 0.40); WS071 (ECE3, 2035, 0.40); WS065 (CMR5, 2039, 0.20) |
| 2050 | WS092 (CMR5, 2046, 0.57); WS091 (CMR5, 2045, 0.23); WS106 (ECE3, 2050, 0.20) |

What the family holds, per selected weather scenario:

- **Boundary and benchmark prices** (`tyndp2026_price`): the hourly marginal cost of the
  e-market node of EE, LV, LT, FI, SE4 and PL from the NT+ hourly dashboards (sheet 'E-Market').
  The KPI dashboard's "load-weighted" prices also weight each country's prosumer node, which
  carries distribution charges; they are not wholesale prices (EE 2035 WS037: 75.4 €/MWh in
  the KPI dashboard, 52.4 at the e-market node; the KPI figure is reproduced within 0.4 €/MWh
  from the hourly file by its stated definition).
- **Capacity factors** (`tyndp2026_pecd`): wind onshore and offshore of EE, LV, LT; solar
  utility and rooftop of LT and rooftop of LV. The package has no Estonian solar series, and
  NT+ has no Estonian solar capacity at all (KPI dashboard: empty; e-market sheet: no PV, no
  behind-the-meter load). A run of this family that sets Estonian solar needs a proxy series,
  chosen and labelled in M1. The Latvian "CSP" series is not read.
- **Hydro** (`tyndp2026_hydro`): daily inflow of the Daugava (LV pondage) and Lithuanian
  run-of-river; the package states no unit, and the values read as MWh per day (2.2–3.8 TWh a
  year for the Daugava).

Weighted wholesale prices of NT+ (e-market node, time average, €/MWh):

| Zone | 2030 | 2035 | 2040 |
|---|---|---|---|
| EE | 49.5 | 61.3 | 101.8 |
| FI | 47.3 | 72.9 | 107.9 |
| SE4 | 36.0 | 49.4 | 63.7 |
| PL | 66.6 | 64.3 | 55.5 |

NT+ carries hours at or above 500 €/MWh that grow with the target year (per weather scenario,
on average: FI 59 in 2030, 101 in 2035, 175 in 2040; EE 35, 58, 127); the runs include
security-of-supply units ("SoS" in the file names). Such hours dominate an average; results of
this family show them next to it. PECD 4.2 capacity factors describe a future fleet and are
higher than PECD 3.1's and the observed ones (Estonian onshore wind 2035: 0.34–0.40 against
0.25 observed in 2020–2025); R-TIME-5's comparison applies to this family too.

## 4. The export (M1; R-DATA-8, DECISIONS D-013 to D-015)

`make export` (`export/`) turns the database into the files the browser reads, in
`data/export/`; the year files, `presets.json`, `links.json.gz` and `manifest.json` are each validated against
their JSON Schema in `schema/` before they are written (the validation, attribution and sources files have none); the
TypeScript types of the same schemas are generated into `app/src/contract/` (`npm run contract`).
The same database gives the same bytes: keys sorted, numbers rounded to the precision of their
kind (MW and MWh whole, prices 0.01, capacity factors 0.0001, temperature 0.1), gzip without a
timestamp (`export/write.py`). `manifest.json` lists every file with its SHA-256 and, for every
series in it, the lineage ids of the rows it was made from (R-PROV-1).

### 4.1 Year files and time axes

One file per observed year (2020 to the current month), per TYNDP 2024 climate year (`cy1995`,
`cy2008`, `cy2009`) and per TYNDP 2026 weather scenario (`ws003` … `ws106`); `export/axis.py`:

| Kind | Hours | Alignment |
|---|---|---|
| Observed | the UTC calendar year (8 760 / 8 784); the current year up to the last hour every core series has reached | every hourly table by timestamp |
| Climate year | the 8 760-hour TYNDP layout (1 January a Monday, no 29 February) | PECD and demand profiles as stored; market-model prices (8 736 hours) complete their last day from the layout's last Monday, Distributed Energy's and Global Ambition's 2040, whose week runs a day late, first moved a day earlier (D-103); ERA5 temperature of the year without 29 February |
| Weather scenario | the 8 760 hours of the package | as stored; daily hydro inflow summed to weeks |

Days are `hour // 24` and weeks `hour // 168` on every axis (UTC; a year has 53 weeks, the last
one short). The layout's weekdays check out against the data: days 6 and 7 of every week carry
the lowest demand and prices (Estonian National Trends 2030 demand of climate year 2009: 1 036
and 1 018 MW against 1 173-1 187 MW on the other days; Polish Distributed Energy 2035 prices: 52
and 48 €/MWh against 61-72), so hour 1 is a Monday 00:00 in the demand profiles and in the
market-model prices alike, and in the TYNDP 2026 package too. Every fill is listed in the file's `meta.filled` (`axis.Fill`): linear over gaps of
up to 12 hours (`axis.align_observed`), longer gaps stop the export; the offered capacity
(ENTSO-E A31), which misses days to weeks, takes Fingrid's EstLink capacity where it exists
(to 29 September 2026, when Fingrid ended the series; ERRATA E-195)
and otherwise the same hour of the nearest week with data (`axis.fill_weekly`, `years._ntc`),
but never more than a published forced outage of the border leaves in that hour (ENTSO-E A78;
D-091, ERRATA E-073; planned outages are not used, their records outlive cancelled work).

An observed year carries only what the engine takes as given or needs as a bound
(`years.observed`): load; hourly output of wind, solar, small run-of-river, waste and other (scaled
by the capacity the user sets, R-SUP-2); weekly energy of the Daugava cascade and of Kruonis
(R-ENG-5), with the weekly bounds read off the same record — the cascade's minimum, maximum and 10th and 90th
percentile hour, Kruonis's maximum (D-022, D-042, D-044, D-073); the fuel-burning technologies' weekly maximum and
10th percentile hour (D-022, D-073); installed capacity (A68); temperature; balancing capacity procured from the market's
first hour, 2025-02-04 23:00 UTC, and 0 before (R-STO-5, PLAN O-2); the boundary zones' prices;
offered capacity per border and direction, and on the Estonian–Latvian border the capacity
allocated to balancing (R-LINK-5; the Latvian–Lithuanian border's published capacity does not hold it, D-077);
monthly gas in €/MWh thermal (Pink Sheet TTF / ECB USD per EUR / 0.2930711
MWh per MMBtu, NIST SP 811), per gross MWh as TTF trades — a run takes it per net MWh, the basis of
ERAA's efficiencies and prices, over 0.9 (IPCC 2006, Volume 2, §1.4.1.2; D-171) — and EUA (EEX's
auctions of general allowances; the aviation allowances' are left out, D-094). Prices of EE, LV and LT, all generation, flows, scheduled exchanges and net
positions go to `validation/<year>.json.gz`, which the engine never loads (R-BND-3); A78 events and
UMM messages of the five borders to `attribution/<year>.json.gz` (R-LINK-6). A climate year carries
the National Trends demand profiles and PECD capacity factors of target years 2030 and 2040, the
Daugava and Lithuanian run-of-river inflow of 2030, 2040 and 2050, the year's temperature, every boundary profile
published for the year and, beside those, the neighbours' observed prices of 2025 (`REAL_2025`, D-051) and the two
tight profiles of energiamudel's own research on the neighbours (`TIGHT_2035`, `TIGHTJ_2035`, D-121); its labels are
R-TIME-4's ranks (`years.ranks`). A weather scenario carries
NT+'s four demand components, capacity factors, hydro inflow and boundary prices, with the proxies
of D-015.

### 4.2 Classes and presets

`export/classes.py` maps each documentary capacity key to one class of R-SUP-1 and the
technology row it bids with, or excludes it with the reason (D-014); `presets.json` carries
every preset in those classes, the DSR bands, demand, fuel paths, technology and scalar
parameters, each value with its lineage ids, and the values derived from them
(`export/tables.py`):

- **Delivery caps** (R-SUP-9, `tables.delivery`): onshore wind = WindEurope's 2030 expectation +
  (IRENA 2025 − IRENA 2020) / 5 per year after 2030; Lithuanian offshore 630 MW to 2030, 700 MW
  after (kept, though since D-105 no fleet of Lithuania's carries offshore wind for it to cap); batteries installed and contracted (Estonia 226.5 MW / 453.1 MWh, Lithuania 2 390 MW).
- **HVDC loss shares** (R-BND-4, `tables.loss_share`): losses / (transmission + losses) per
  border direction, 2024 (ERRATA E-028).
- **Polish slow-build factor** (R-BND-5, `tables.boundary`): Svenska kraftnät's lowest 2040
  Polish price / the weather-weighted NT+ 2040 wholesale average. Since ERRATA E-149 (approved, D-124)
  the standard sensitivities (a) and (b) used the price itself, 77.8 €/MWh, as a floor on Poland's
  average in each run, not the factor, which on the re-priced default lifted Poland to 110. Since D-183 no
  standard sensitivity uses either; the floor stays in the engine, its worker test running it, and in the
  golden fixture's case of the slow build.
- **Demand behind every boundary profile** (R-BND-8): `scenario_boundary`, read from the TYNDP
  2024 'Yearly Outputs' (native demand of all the zone's nodes; electrolyser load) and the NT+
  hourly dashboards (native, fixed and EV demand of the e-market and prosumer sheets;
  electrolyser load).
- **Generation and capacity behind every TYNDP 2024 profile** (R-BND-8, D-040, D-041):
  `scenario_boundary_output`, read from the same sheet for FI, SE4 and PL — every non-zero row of
  'Annual generation [GWh]' and of 'Installed Capacities [MW]' under the sheet's own label (the
  loads marked '(load)' or '(pump)' by it), the net annual country balance and the dumped energy,
  each summed over the zone's nodes; the electric cars' nodes ('… EV Passenger Prosumer', '… Street')
  are summed apart under the prefix 'EV: ', since their battery rows are the cars' (Finland's
  Distributed Energy 2035: 129 GW against 4 GW of stationary batteries) (`boundary.generation`,
  `boundary.capacity`). Shown
  on the import-price page (§8.5), not read by the engine. On Finland's Distributed Energy 2035 the
  rows close the balance to 0.1 TWh: generation = native demand + electrolyser, battery and pump
  loads + net export (2009: 224.7 = 137.1 + 72.6 + 4.2 + 10.8).
- **The boundary zones' observed fleet** (R-BND-8, D-256): `boundary.fleet`, the rows of `capacity`
  for FI, SE4 and PL in ENTSO-E's installed capacity per production type (A68) of 2026
  (`BOUNDARY_FLEET_YEAR`) — the capacity on 1 January 2026, the fleet at the end of 2025 — under the
  pipeline's technology codes, a type the document does not list having no row. Shown beside the
  market model's capacity on the import-price page (§8.5), not read by the engine.
- **Generation and capacity behind every NT+ profile** (R-BND-8, D-043): the same table and
  export keys per weather scenario, read from the NT+ hourly dashboards for FI, SE4 and PL
  (`tyndp2026.parse_output_member`): every 'Generation' and 'Load' column of the 'E-Market' and
  'Prosumer' sheets of the zone's node and its prosumer node ('FI00', 'FI00RETE') summed over the
  year by category, under TYNDP 2024's label where the category is the same thing ('EV discharge'
  as 'EV: Battery Storage discharge (gen.)', 'Electrolyzers …' as 'Electrolyser (load)'); the
  net export from the sheets' 'Balance' columns (the exchange between the two nodes cancels); the
  dumped energy from 'RES curtailment' of each sheet's own node; the capacity from the
  'Installed Capacity' sheet's rows in GW_e. Demand stays in `scenario_boundary`, the cars'
  charging in it, so generation = demand + electrolyser, battery and pump loads + net export —
  to 10⁻¹¹ TWh in each of the 36 zone-weather sets (Finland 2040, WS065: 278.76 = 161.35 +
  100.25 + 17.17). The 'Prosumer' sheet also carries a second curtailment column under the
  market node's name with other figures (Finland 2040: 39.4 TWh against 9.1 on 'E-Market'); it
  is not read.
- **Reserve** (R-STO-6, `tables.reserve`): the 2026 Baltic need and each zone's share of 2025's
  procurement per product.

### 4.3 The export gate

`make check` runs `export/check.py` after the database checks: every hourly array has the
file's hours, no year file names a price of a core zone, every year file is at most 3 MB,
every array is covered by a manifest series with lineage ids, and a fresh export from the same
database is byte-identical.

## 5. The engine (M2; R-ENG-1…9, DECISIONS D-016 to D-018, D-020, D-021, D-026)

The *engine of record* (§5.8, `app/src/engine/lp.ts`, revision 1.4) solves each week of the problem
(§5.1) as a linear programme; every published, exported and calibrated figure comes from it, and
since revision 1.5 it is the only engine the application runs. The *two-pass engine* (§5.2–5.4),
revision 1.4's preview, cleared hour by hour in two passes; with M3's inputs it missed whole years
by 40–50 €/MWh (ERRATA E-040), so it stayed in the repository as a documented baseline whose gap
was published (§6) and was not shown (D-026; the corrections tried are in
`docs/research/2026-09-25_preview_fix.md`). On 2026-10-18 the owner had it removed (D-132,
revision 2.19); §5.2–5.4 describe it as it last stood, at commit 74b62c0. The engine is a pure
function of its input — no clock, no randomness, no I/O, arithmetic and comparisons only
(`npm run lint` rejects the rest, `scripts/lint_engine.mjs`), the solver passed in — and the same
input gives the same bytes (`scripts/golden.ts`, R-NFR-5).

### 5.1 The problem (`build.ts`)

A year file, `presets.json` and a scenario become three zones EE–LV–LT on a path, each with an
hourly load, fixed output and a list of offers, two internal links, three boundary borders,
the storage units and the Daugava.

- *Load:* observed A65 in an observed year; in a scenario run the preset's annual energy
  (electrolysis taken out, R-DEM-5) spread on the TYNDP demand profile of the weather year;
  both times the multiplier and the firm block (R-DEM-3, R-DEM-4).
- *Fixed output:* observed small hydro, waste and other; in scenario runs run-of-river, and waste
  at its megawatts less the technology's forced and planned outages (a factor of 0.941: a waste
  plant burns what it is paid to take, whatever the price; D-074, ERRATA E-067); the
  plant's must-run share under the negative-price clause (R-SMR-4) in its units' service hours (`smr.ts`: each unit's 336-hour
  outage in the window of largest Baltic surplus of fixed and renewable output over load, 168
  hours apart); the power the plant has above that share is an offer at `CLAUSE_BID`, 0.01 €/MWh, and without the clause
  all of its available power is an offer at the market's floor (D-150).
- *Offers:* wind and solar at 0 €/MWh, curtailable, their output observed (A75) or capacity ×
  PECD factor (R-SUP-2); thermal classes at their short-run cost `thermalOffer`:

  bid_h = fuel_h / η + EUA_h × f_CO2 × 3.6 / 1000 / η + VOM + premium,

  with η, f_CO2 (kg/GJ) and VOM from the class's technology row (`presets.classes`; where the
  row gives no f_CO2, the fuel's: gas 57, waste's fossil share 40, biomass 0), gas and EUA
  monthly in observed years and from the fuel path in scenario runs, oil shale at 10 €/MWh
  thermal with the constant premium of R-SUP-4 (Auvere 1.29, fluidised bed 8.72, pulverised
  firing 81.83 €/MWh, `presets.oil_shale`); DSR bands at their prices with their daily hours;
  electrolysis and power-to-heat as demand at their ceilings (off unless chosen, D-011).
- *Boundary borders (R-BND-1/2/4/6):* an import offer of (1 − l_imp) × NTC_imp at P_k / (1 − l_imp)
  and an export demand of NTC_exp at P_k × (1 − l_exp), P_k the profile times its level factor,
  l the loss share of the direction (`presets.loss_share`); the optional Finnish slope s splits
  both into ten equal tranches, the k-th's bid moved up (import) or down (export) by
  s × (k + ½) × NTC / 10 / 1 000 €/MWh, so that Finland's price moves by s € per GW of the flow
  from zero exchange (ERRATA E-041).
- *Links:* observed A31, on EE–LV less the balancing reservation (R-LINK-5; LV–LT's A31 is
  already without it, D-077); ERAA 2025's hourly
  NTC in scenario runs without a choice of lines (the scripts' runs of `runs.ts`, the gap test's among them). With
  one, as every run of the application has, a scenario year's border is the sum of its lines (`scenarioLines`;
  R-LINK-3 to R-LINK-5, D-032): ERAA's NTC shared among a border's cables by their rating, each at its availability,
  the two internal borders less their balancing reservation, LT–PL its lines at their megawatts, held to Litgrid's
  plan unless the choice lifts it. The NTC of the boundary borders above is built the same way.
- *Reserve headroom (R-STO-5…7, R-SUP-7):* per hour the zone's FCR + aFRR up + mFRR up (observed
  from 2025-02-04 23:00 UTC, else 0; scenario runs: the 2026 need allocated by 2025 shares);
  batteries hold min(capacity, FCR + aFRR + s × mFRR), s the share of mFRR they carry (0 since
  the owner decided OPEN-3, D-025), and their day-ahead power is their capacity less the average of
  that; the rest is taken pro rata off the thermal offers that run continuously — not oil shale,
  which enters the market all or nothing by the day and cannot start within mFRR's activation time
  (ERRATA E-142, D-114) — and what they cannot hold is reported as unmet. In observed years the thermal offers' availability is
  already net of what was held (§7.1), so nothing is taken off them twice.
- *Calibrated elements (M3, §7):* in observed years each thermal technology is available up to
  its weekly maximum output (`capAvailability`); the CHP floor of R-SUP-5 runs whatever the
  price (`applyChpFloor`), and in a replay each fuel-burning technology at least the week's 10th-percentile hour of its
  observed output (`applyObservedFloor`, D-073); every gas offer of the three zones bids one price, a combined-cycle
  plant's cost plus the fitted adder (`applyGasBid`, R-SUP-6, D-164; until then four tranches of a
  utilisation markup in Latvia and Lithuania, `applyMarkup`), and above it a thousandth of what the offer's own class
  costs more than that plant, so that the cheaper plant runs first among them (`GAS_ORDER`, D-168); Kruonis bids its
  cycle cost, its output in an hour in four
  steps of its power (D-115; §7.1); the Daugava's minimum flow is the 10th-percentile hour of
  its observed week in observed years (D-044; the week's observed minimum where a year file gives none).

What the builder assumes where the data say nothing is D-020 (target-year blending, the NTC and
fuel-path years, biomass prices, thermal availability, the proxies of small hydro and `other`).

### 5.2 The preview: one hour (`clearing.ts`, ported from v3, D-016, D-017; removed, D-132)

Each zone's net export at price p is non-decreasing and continuous (`Stack.net`):

  e_z(p) = fixed − load + Σ_supply mw × clamp((p − bid)/w, 0, 1) − Σ_demand mw × clamp((bid − p)/w, 0, 1),

w the ramp band (1 €/MWh, R-ENG-2). `segment` clears zones lo…hi with fixed injections at
their ends: if the segment is short even at VOLL its price is VOLL and the shortfall goes to its
zones in proportion to each zone's own deficit; if it is long even at the floor its price is the
floor and the surplus is spilled where it arises; otherwise the price solves Σ e_z(p) + inj = 0 by
bisection on [floor, VOLL] to double precision. The flows are then the cumulative net exports;
the link most over its limit is fixed at the limit and both halves are cleared again. Prices are
equal across an unsaturated link and differ only across a saturated one; every zone-hour
balances to 1e-6 MW. What its tests held of the market rather than of the method, the engine of
record is now held to (`app/test/clearing.test.ts`, `lp.test.ts`; D-132).

### 5.3 The preview: two passes (`index.ts`, R-ENG-3…5, D-018; removed, D-132)

1. *Pass one* clears the year without storage, twice where the Daugava runs — at its minimum
   flow and at its turbine limit (`passOne`). §5.4 places the Daugava's release on that
   response; p⁰ is the price read where the release puts it.
2. *Schedules:* each storage unit's programme against its zone's p⁰ (`storage.ts schedule`,
   v3's exact programme over hour × state of charge): a charge step takes P from the grid and
   costs Δ per MWh, a discharge step gives P × η, a cycle is taken iff p_dis × η − p_chg ≥ Δ;
   the daily cap of R-PAR-5 (1.5 × hours of storage steps a day) or Kruonis's weekly budget
   bounds the discharge steps of each period; the year starts and ends empty.
3. *Probe:* one clearing with every storage unit discharging at full power gives, for each
   hour, the price a discharge there would fetch.
4. *Pass two* clears the year hour by hour with bids: in a planned discharge hour the unit
   offers up to its step, capped by what it holds, at (average price paid for the energy held +
   Δ) / η; in a planned charge hour it bids up to its step, capped by its room, at η × (the
   probe price of the discharge hour its step is matched to, first in first out) − Δ. The
   energy held is tracked; hours the market did not take in full are counted (`unhonoured`)
   and the planned discharge not delivered is reported (`shortfallMwh`). No third pass.

Kruonis: 12 hours of storage, η 0.74, no cycling cost; its weekly budget of discharge steps is
the observed weekly output in an observed year, R-PAR-5's documented daily cap in a scenario run,
whatever the batteries' control says (ERRATA E-048).

### 5.4 The preview: the Daugava (`hydro.ts`, R-ENG-5, D-018; removed, D-132)

With the minimum-flow price p_hi,h and the turbine-limit price p_lo,h of pass one, an hour's
release at storage value λ is the minimum flow b if λ ≥ p_hi,h, the limit B if λ ≤ p_lo,h, and
b + (B − b)(p_hi,h − λ)/(p_hi,h − p_lo,h) in between (`release`). λ of each week makes the
release use the week's budget (bisection); where the response is flat the hours on the step
share what is left. Pass two offers each hour's scheduled release above the minimum flow, and
what earlier hours of the week did not take, to run in full at λ; water left at the week's end
is reported (`leftMwh`). No water value across weeks.

### 5.5 Determinism, bounds and speed

The engine uses no libm function, clock or randomness; iteration order is fixed. Every hourly
array is checked for length and finiteness when the problem is built. `validate/golden.fixture.json`
pins the SHA-256 of every array of a synthetic week (frozen) and of the 2024 replay, from both
engines until the two-pass one was removed (D-132) and from the engine of record since — with the
Daugava's water value, spill and water left since D-133, without the two-pass engine's leftovers (the
price repeated, the stores' empty schedule) since D-138; the replay was re-baselined with the
calibration of M3 (§7.6, D-024). Since 2026-10-18 it also pins, from the
engine of record, the opening view's climate year 2009 as the page's worker builds it — 0 SMR
and 2 SMR whole, and 2 SMR's former sensitivity (a), the slow build — kept as `slowBuild` for this case since
D-183, the only path with electrolysis demand and Poland's floor — on nine weeks and a day — taken as the engine stood before the speed-ups of D-128, which
leave all seven cases to the bit (`scripts/golden_cases.ts`; five since D-132). `scripts/golden_jsc.ts` recomputes the cases in
JavaScriptCore, Safari's engine (macOS's `jsc` shell), and `make ci` fails unless they are V8's
to the bit; they were, the first time it ran (2026-10-08), and the scenario years were too
(2026-10-18). `node --no-maglev scripts/golden_jsc.ts --time` prints each case's time in both: on one thread,
JavaScriptCore took 2.61 s for the 2024 replay against V8's 2.51 and 4.9–5.1 s for a scenario year
against 4.9–5.0 — Safari's engine computes the model as fast as Chrome's (2026-10-18). `scripts/bench.ts` on the development machine (Apple silicon, Node 26): the preview
takes 0.21 s for the 2024 replay and 0.22 s for climate year 2009 with ERAA 2035's four storage
units (four clearings of the year; R-ENG-7: ≤ 1.0 s); the engine of record 0.78 and 1.56 s on
one thread, 0.35 and 0.56 s on four workers, and 1.45 s for the three climate years of a set
(R-ENG-7: ≤ 2 s a year, ≤ 6 s a set; worker start and problem builds included). Measured again
in the night of 2026-10-05, after D-070 to D-074: preview 0.21 and 0.24 s; the engine of record
0.80 and 1.67 s on one thread, 0.47 and 0.65 s on four workers, 1.78 s for the set. On the
engine of record day ahead (D-112): 1.3 and 2.6 s on one thread, 0.56 and 0.86 s on four workers,
2.3 s for the set. With oil shale's entry (D-113, D-114), two clearings of the year, the 2024 replay
takes 2.4 s on one thread; since D-114 the bench runs the browser's pool and `runYear` on Node
workers — each year's clearings in parts, oil shale committed once between them — and gives 1.0 s
for the 2024 replay, 0.9 s for climate year 2009 and 2.3 s for the set on four workers (R-ENG-7
met), and 16.9 s for the opening view's twelve years on four workers, 13.0 s on seven (2026-10-11;
the set's climate years carry ERAA's fleet, without oil shale). With Kruonis's output in four steps
(D-115), four columns of its output an hour where there was one: 2.6 and 2.5 s on one
thread, 1.0 and 0.9 s and 2.4 s for the set on four workers (R-ENG-7 met), 17.1 and 13.6 s for the
opening view. With HiGHS's presolve off and the first clearing's weeks kept where the commitment changes
nothing (D-130, D-131), a change of a control as the page computes it (`bench.ts --change`, seven
workers): the scenario shown after 1.7–1.8 s, the table after 5.4–5.5 s, the sensitivities after
11.2–11.5 s with 0 SMR shown and 17.0–17.3 s with 2 SMR (3.7, 12.2–12.4, 24.2–25.4 and
36.3–37.1 s before it).

### 5.6 Replays before calibration

On M2's provisional parameters (markup 0, Δ 60 €/MWh for the batteries and none for Kruonis, no
CHP must-run, thermal at installed capacity) the engine of record's replays gave annual average
prices of 94.1 / 92.8 / 93.4 €/MWh in 2023 (observed 90.8 / 93.9 / 94.4 for EE / LV / LT), 80.9 /
77.5 / 77.4 in 2024 (87.3 / 87.4 / 87.3) and 83.2 / 81.7 / 81.2 in 2025 (80.4 / 85.7 / 85.3), with
hourly errors of 26–42 €/MWh (`app/scripts/replay.ts`). §7 gives the calibrated replays.

### 5.7 Limitations

Of the engine of record: storage is empty at the start and end of every week (weeks counted from
the run's first hour, 1 January 00:00 UTC — a Sunday in 2023, a Monday in 2024; R-ENG-8),
so no energy crosses a week's boundary; within the week it sees every price in advance
(perfect foresight) — since D-112, the day and the next: each day is cleared in a
window of 48 hours whose stores end it empty, the energy they hold at the day's end carried into
the next day's window; Kruonis's output in an hour runs in four equal segments of its power, each
further quarter costing the fitted step more (D-115; §7.1), so the programme does not
shave a peak with all the plant has, as a price-taker with perfect foresight would; where the programme is degenerate — two zones' gas plants with the same
cost, for one — the split of volumes between them is the perturbation's choice, not a fact
(R-ENG-9); prices are the duals, one per zone and hour. Of both: Kruonis's turbines deliver at
most 666 MW under the programme's convention (P × η) at the 900 MW of the observed years, 694 MW at the 938 MW of ERAA
2035's fleet, which the opening state has; thermal plants are available at
installed capacity in scenario runs and at their weekly maximum output in observed years (§7.1);
the Daugava is held to the record's weekly band in observed years (§7.1), and in scenario runs
to the band the record shows for a week of the same average output (D-071): the weeks of 2020–2025
with an average above 20 MW, 311 of them, are split into thirds by their average, and each third gives
the median ratio of the week's 10th and of its 90th percentile hour to that average — up to 181 MW
0.00 and 2.99, up to 365 MW 0.00 and 2.11, above that 0.56 and 1.43 (`export/years.py`
`daugava_band`, `presets.json` `hydro.daugava_band`). The cascade's hourly output then lies
between those two shares of the week's average, within its megawatts and above PEMMDB's minimum
flow; the engine's field `daugavaBand: false` frees it, where the programme's foresight moves more
water to the dear hours than the record shows it moving, and prices come out flatter. In a
TYNDP 2024 run its weekly water is that dataset's inflow times 1.95, the average ratio of Latvia's
observed hydro output to that inflow in the climate years both cover (2015–2017: 1.93, 1.99,
1.92; `export/years.py` `daugava_inflow_factor`, `presets.json` `hydro.daugava_inflow_factor`):
unscaled it is half the record and half of TYNDP 2026's inflow for the same node. The same
workbook's weekly "maximum generating power" is not applied: it lies at the record's seasonal average
(304 / 507 / 101 / 253 MW) and is no limit (D-070, ERRATA E-063;
`docs/research/2026-10-05_daugava_scenario.md`). The three climate years then carry 2.66, 3.37 and
3.12 TWh of Daugava water. TYNDP 2026's inflow is taken as it is; the band applies to both
families.
Of the preview only, while it stood (D-132): the storage programme planned full-power steps
against a price no storage had moved, and pass two could only reduce the plan (§6); the Daugava's
price response was a straight line between two clearings; DSR hours were used first come, first
served within the day.

### 5.8 The engine of record (`lp.ts`, R-ENG-8, R-ENG-9, revision 1.4, D-021, D-112, D-113)

`runWeek` clears one UTC week (168 hours from the run's first hour; the last block holds the
remaining 24 or 48) day by day (D-112): each day in a window of the day and the next,
48 hours within the week (`DAY_AHEAD`), of which it keeps the day. `weekModel` writes a window's
hours as the linear programme of §6 — the formulation of `reference/lp.py`, variable for variable
and row for row, with the same perturbation — starting from the week's state: the energy each
store holds as the window opens, what each discharge budget and the Daugava's weekly budget have
left; a window's stores end it empty, and a budget whose period runs past the window, the
Daugava's among them, gives it its share of what is left by hours. `readWeek` reads the day back
into the result shape (`index.ts`, the two-pass engine's until D-132) and moves the state on: prices are the duals of the zone-hour
balances, the Daugava's water value the dual of its budget row in the week's first window.
`WEEKLY` (a window and a day of 168 hours) is the programme of D-021 and reproduces its results
bit for bit; with it the stores planned the week with all of its hours known, and held the price
at their water value wherever they ran part-loaded (§7.3). The
solver is HiGHS compiled to WebAssembly (highs-js, pinned) with HiGHS's default options written
out, but presolve, off since D-130 (`OPTIONS` in `app/src/worker/solver.ts`, which `app/scripts/highs.ts` loads in
Node); the model goes to it as arrays in compressed sparse columns. Within
a clearing the weeks are independent, so the workers share a year's (`split.ts`, D-114): each
clears a part of contiguous weeks, and the parts put back together are, bit for bit, what `runLP`
gives solving them one after the other, each day by day (§8). With oil shale's market entry
(D-113, D-114) `runLP` clears
the run twice: the first clearing's prices decide, for each oil-shale class and UTC day, whether it
runs (§7.1) — in the order of the days, a start depending on the day before — and the second
clears the committed problem; its results are those of the problem as built, the committed minimum
load in its class's offer (ERRATA E-141). A day the second clearing prices at the cap in the entry's
zone while the commitment keeps off a class that had megawatts available that day comes on — every
such class at its minimum stable load, the rest at its bid — and the week clears again, until no
such day is left (`capDays`, `clearWeek`; ERRATA E-160, D-165); the workers' parts mend the weeks they
clear alike and send their days with them, so that the year commits on them all as `runLP` does. A store enters it with its exact hours and its exact discharge budget per
period (`Storage.hours`, `budget`; D-101, ERRATA E-124) — Kruonis's 10 800 MWh and a week's observed
output as it was — where the two-pass engine's table needed whole steps (the rounded values went with
it, D-138); the offline reference takes the same exact values.

**Solving less (D-130, signed off by the owner on 2026-10-18, D-131; specification revision 2.18).**
HiGHS solves each programme with presolve off — the reference too — and solves again with presolve
one it leaves unsolved (status 15, met once where the fit explores); and the second clearing of a
year with oil shale's entry takes the first clearing's solution for a week in which the commitment
keeps every class off and the first ran none of them at any hour (`sameWeek`, `copyWeek`): the two
weeks' programmes then differ by those classes' columns alone, at zero in the first's solution,
which is so one of the committed week's optima. "Any hour" is any a window of the week solved, the
next day's it only looks ahead to included: those shape the day it commits through storage and water
(ERRATA E-156, D-137). That happens in 45–52 of a scenario year's 53 weeks
and almost never in a replay. Both moved figures only where an hour's optimum is not unique: the
opening view's averages by 0.13 €/MWh at most, the validation's MAE by −0.13 to +0.14, its breaches
not at all (§7.3). A change of a control's table computes in 5.4–5.5 s on the Node bench (12.2–12.4
before) and 4.2–4.6 s on the built site (§11). The register in force is kept: the fit under the new
solver scored worse on the protocol (D-130).

### 5.9 A neighbours' profile on the scenario's gas and CO₂ prices (R-BND-5; D-072; the default from D-079; removed, D-194)

**Removed on 2026-10-28 at the owner's word (D-194).** Every neighbours' profile is now taken as published, times its
level, whatever the scenario's gas and CO₂: the gas and CO₂ prices move the Baltic plants alone. The owner's levels
are ×2.0038 / ×1.9607 / ×2.0982 on Distributed Energy 2035 as published, whose averages are 39.9 / 45.9 / 57.2 €/MWh,
for 80.0 / 90.0 / 120.0 (Finland's ×1.8786 for 75.0 until D-344 of 2026-11-27); the opening state gives *0 SMR*
110.2 / 110.0 / 110.3 €/MWh (EE / LV / LT) and *2 SMR* 89.4 / 106.5 / 106.9 (108.1 / 109.5 / 109.9 and 86.0 / 106.0 /
106.5 with Finland at 75). Of the map below only its first step remains: the cost of the market model's best gas
plant on the model's own prices, the fossil level of §10 (`neighbourGasCost`). The rest of this section is the record
of the map as it stood from D-072 to D-194.


A boundary price is the market model's output and carries that model's fuel prices. For
TYNDP 2024's Distributed Energy and Global Ambition the plants' gas is a blend — in 2035, the
midpoint of the inputs' 2030 and 2040, 9.18 €/GJ (33.0 €/MWh thermal) of which a share of 0.757
is fossil and pays for CO₂, at 130.2 €/t; Global Ambition 8.64 and 0.793 (ERRATA E-064) — where
the scenario's Baltic plants pay 38.2 €/MWh and 197.5 €/t on all of it. With the panel's box
ticked (`Scenario.neighbourFuel`; ticked as the application opens, D-079), `repriceKnots` moves
the profile to the run's two prices before the level factor is applied:

- the thermal cost of a MWh of gas, c = gas + 0.2052 t/MWh × fossil share × CO₂ (the share is 1
  on the run's side), is taken on both price sets: 53.3 and 78.7 €/MWh thermal for Distributed
  Energy 2035 on ERAA 2025's prices;
- four steps follow from it: an electrolyser displacing a steam methane reformer's hydrogen,
  η (4.74/3.6 × c + 3.38) − charge; an electrolyser displacing imported synthetic fuel,
  η × 0.72 × the fuel's import price − charge, which c does not move; and the most and the least
  efficient gas plant of the standard classes, c / 0.60 + 1.6 and c / 0.35 + 1.6 (η the
  electrolyser's efficiency, 0.70 in 2035; charge 4 €/MWh; fuel 131.28 €/MWh; all from the
  market model's input files, `parameters.csv` `boundary.reprice.tyndp2024.*`);
- the steps of the two sets are sorted and paired, since dearer gas changes their order (the
  reformer's hydrogen becomes dearer than the synthetic fuel); with (0, 0) before them and
  (500, 500) after, the pairs are the knots of a piecewise-linear, non-decreasing map — for
  Distributed Energy 2035: 47.5 → 62.2, 62.2 → 70.9, 90.4 → 132.8, 153.8 → 226.5 €/MWh;
- a price at or below 0 and a price from 500 €/MWh, the profiles' scarcity steps (D-007), stay
  as published.

That these steps are what sets the profile's hours is read from the market model's hydrogen
outputs (`docs/research/2026-10-05_neighbour_fuel_reindex.md`): the reformer's marginal cost is
73 €/MWh of hydrogen in every hour where it is marginal, against 73.5 computed; in Finland 89 %
of the hours above 5 €/MWh lie on price = 0.7 × hydrogen price − 3 to 5 €/MWh (SE4 61 %, Poland
36 %). The map dispatches nothing again: the hours on each step and the neighbours' fleets
are TYNDP's; coal and oil plants between the gas steps move as gas does. National Trends,
National Trends+ and the actual prices of 2025 have no map.

Ticked, the opening's profile averages Finland 50.7, SE4 60.2 and Poland 78.6 €/MWh at level 1 (39.9, 45.9 and
57.2 as published), 75.0 / 90.0 / 120.0 at the owner's levels (59.0 / 68.6 / 87.4 as published at those levels),
and the opening state gives *0 SMR* 107.0 / 108.9 / 109.3 €/MWh (EE / LV / LT) against 89.1 / 86.5 / 86.6; *2 SMR*,
its two units of 315 MW on top of the gas, 85.6 / 105.2 / 105.8 against 70.5 / 82.3 / 82.4 (D-182 to D-190: the
owner's opening; on D-169 to D-171's opening, at level 1 with units of 300 MW, 83.6 / 79.8 / 79.9 against 68.1 /
64.1 / 64.1 and 66.2 / 75.2 / 75.2 against 53.1 / 58.1 / 58.1, with
the record's gas price per net MWh, the Lithuania–Poland lines AC and the cheaper gas plant first;
with the gas plants' one bid of D-164 85.4 / 81.5 / 81.5 against 70.2 / 66.2 / 66.2 and 67.1 / 75.9 / 76.0
against 54.1 / 59.2 / 59.2; on D-115's register 84.7 / 80.9 / 80.9 against 69.3 / 65.3 / 65.3 and 66.5 / 75.6 /
75.7; 67.2 / 75.8 / 75.9
against 53.8 / 58.9 / 58.9 when each unit replaced 300 MW of gas; solved as D-130 solves, D-131;
67.1 / 75.8 / 75.9 for 2 SMR before it, the rest the same at one decimal; with Kruonis's output in steps
and the register refitted on it, D-115; 84.8 / 81.1 / 81.1 against 69.4 / 65.5 / 65.5 and
67.5 / 75.9 / 76.0 against 54.2 / 59.2 / 59.2 since D-111 to D-114: September's Δ, the day-ahead
clearing, oil shale's market entry with its start on the megawatts available and the scenario's
reserve off oil shale; on D-111 to D-113 as proposed 84.7 / 81.1 /
81.0 against 69.3 / 65.5 / 65.5 and 67.2 / 75.9 / 75.9 against 54.0 / 59.1 / 59.1; before them, since D-109's Δ
of 69.5, 84.2 / 81.0 / 81.0 against 68.9 / 65.3 / 65.3 and 66.8 / 75.7 / 75.7 against 53.7 / 58.9
/ 58.9; before it, since D-107 took Lithuania's onshore wind to 0.80 of PECD's factor, 84.1 / 80.9 / 80.9 against
68.9 / 65.2 / 65.2 and 66.8 / 75.7 / 75.7 against 53.7 / 58.8 / 58.8; after D-105 and D-106,
before D-107, 80.3 / 74.9 / 74.9 against
65.3 / 60.0 / 60.0 and 64.8 / 70.1 / 70.1 against 51.8 / 54.4 / 54.4; before D-105, which took
Latvia's and Lithuania's offshore wind out, and D-106, which refitted the register, since ERRATA E-099,
72.7 / 58.2 / 58.3 against 58.3 / 46.0 / 46.0 and 60.6 / 54.5 / 54.6 against 48.1 / 42.1 / 42.1;
on the register of D-076 and D-077, before E-099, 72.7 / 58.2 / 58.2 against 58.2 / 45.9 / 45.9 and 60.6 / 54.5 / 54.6 against 48.0 / 42.0 / 42.1;
after D-073 and D-074, before it, 71.9 / 57.4 / 57.4 against 57.6 / 45.3 / 45.3 and 60.2 / 53.9 /
54.0 against 47.7 / 41.6 / 41.7; when D-072 was written, before all of them, 72.1 / 58.2 / 58.2 against 56.9 / 45.5 / 45.6, and 56.5 / 54.3 /
54.4 against 44.5 / 41.7 / 41.7). From D-079 to D-194 the box was ticked as the application opened, and the
scenario figures of §9, §9.1 and §10 are of the re-priced profile until they are computed again; the validation of
§7 never used it.

## 6. The reference LP, the gate and the two-pass engine's gap (M2; R-ENG-8, R-ENG-9, D-019, D-021, D-026)

`reference/lp.py` solves one test week of exactly the problem the engines had, written by
`app/scripts/gap_weeks.ts`, as a linear programme with HiGHS 1.15 (highspy): every offer's
quantity per hour, load shed at VOLL, fixed output spilled at the floor, the two internal flows,
each storage unit's charge, discharge and energy (starting and ending the week empty, the same
discharge budgets), the Daugava's release within its weekly budget and minimum flow, and the
DSR hours per day; the zone-hour balance's dual is the price. Since D-112 and D-113 it clears
the week as the engine of record does — day by day in windows of the day and the next, the same
state carried (`solve(pb, window=48, commit=24)`, D-112) — and, with oil shale's entry, the week as
the first clearing committed it, which `gap_weeks.ts` writes (D-113). R-ENG-9's perturbation (v4's
R-REF-5): crc32(zone:name) mod 1 000 × 10⁻⁶ €/MWh on supply offers and charging, 10⁻⁴ €/MWh across
each window on discharging (across the week before D-112); demand offers unperturbed. HiGHS's options are written out in
`lp.OPTIONS` (one thread). The engine of record (§5.8) is the same programme in TypeScript,
solved by the same HiGHS release in WebAssembly.

The test weeks are weeks 3 and 28 (UTC weeks of 168 hours from 1 January) of the calibration
years 2023–2025 in replay, and of climate year 2009 with ERAA 2035's fleets (1 500 MW of
Estonian batteries, 4.6 GW in all with Latvia's 420 MW, Lithuania's 1 750 MW and Kruonis's 938 MW), Distributed Energy
2035 as published at the borders (the gap test does not re-price, D-079) and
ERAA 2025's fuel prices. `make gap` writes `data/derived/gap/gap.json` and fails when the gate
is not met.

**The gate (R-ENG-8, revision 1.4; on the same optimum since revision 2.36, D-175): met on all 8 weeks.** On seven
test weeks the engine of record's prices equal the reference's to 0.000 €/MWh in every zone. On 2023's week 3,
since D-171, eleven hours of its last day have more than one optimal price, 86.29 €/MWh (the engine) or 99.94 (the
reference as configured). Every window's objective agrees to 2.4 × 10⁻¹⁴ of it, the storage and the Daugava's
release are the same, and that day solved again by the primal simplex from the same state gives the engine's price
in all eleven hours; outside them the prices agree to 0.000 €/MWh. The week's average gap, 0.894 / 0.894 / 0.650
€/MWh, failed the gate while it compared prices alone (7 of 8 weeks, ERRATA E-173). Since D-175 a week whose prices
differ beyond 0.1 €/MWh meets it on the same optimum — every window's objective, Σ cost × value with the
perturbation, within 10⁻⁶ of the reference's, the storage within ±1 % — and `gap.json` lists the hours whose price
is not unique, with the gap outside them. The storage discharge equals the reference's on every week (7 365; 6 049; 654;
2 968; 3 666; 1 450; 11 191; 2 105 MWh for the eight weeks in the order of the table below, with the record's gas
price per net MWh, D-171, the Lithuania–Poland lines AC, D-170, and the cheaper gas plant first, D-169;
7 232; 6 005; 654; 3 347; 3 646; 1 450; 11 344; 2 142 MWh with the gas plants' one bid, D-164, all eight weeks
at 0.000 €/MWh; 7 232; 5 960; 569;
4 764; 3 696; 1 391; 18 446; 2 142 MWh before it, both day by day, D-112, with oil shale entering by the day,
its start on the megawatts available, D-113 and D-114 — the week the reference clears is the one the first pass
committed — and Kruonis's output in steps of its power, which the reference runs as the engine does,
on their register, Δ 71.5 (D-115); 10 624; 6 596; 1 223; 9 850; 4 892; 2 877; 20 682;
3 999 MWh before D-115, on D-114's register, Δ 71; 6 630 for the second with the start on the
installed megawatts, as D-113 was proposed; 10 837; 9 029; 6 046; 9 671; 4 892; 3 151; 24 095; 6 122 MWh on the weekly programme
and the register of D-109 — Estonian oil shale without a fitted floor, Δ 69.5 — with the stores'
exact hours, D-101, the climate-year weeks without Latvia's and Lithuania's offshore wind, D-105,
and with Lithuania's onshore wind at 0.80 of PECD's factor, D-107; 10 295; 9 029; 6 422; 9 671;
4 892; 3 151; 24 910; 6 122 MWh before D-109, on D-106's register; 10 296; 9 324; 6 238;
9 672; 4 662; 3 151; 15 254; 5 079 MWh with the register of D-076 and D-077; 10 141; 9 072; 4 246; 10 508; 4 662; 6 029;
21 754; 8 151 MWh with the register of D-042 and D-044 and the scenario weeks without
the loss wedge, D-045; 2 225; 6 802; 2 129; 6 907; 196; 3 819;
15 039; 9 987 MWh with M3's register and D-025's batteries; 290; 9 324; 8 334; 8 456; 3 316;
6 660; 17 855; 33 695 MWh with M2's inputs): the browser's programme is the reference's.

**The two-pass engine's gap (published, no gate since revision 1.4; not shown since revision 1.5; as last published, before the engine was removed on 2026-10-18, D-132 — `make gap` no longer computes it):**

| Week | EE | LV | LT | Storage, preview MWh | LP MWh | Δ | Daugava, preview MWh | LP MWh |
|---|---|---|---|---|---|---|---|---|
| 2023 w03 | 8.92 | 8.92 | 9.36 | 9,922 | 7,232 | +37 % | 149,920 | 150,702 |
| 2023 w28 | 3.39 | 3.39 | 3.39 | 666 | 5,960 | −89 % | 11,893 | 11,960 |
| 2024 w03 | 3.09 | 3.09 | 3.09 | 5,718 | 569 | +905 % | 67,311 | 67,753 |
| 2024 w28 | 9.16 | 9.82 | 9.82 | 5,828 | 4,764 | +22 % | 20,861 | 20,971 |
| 2025 w03 | 5.45 | 5.45 | 5.53 | 2,199 | 3,696 | −41 % | 88,204 | 88,783 |
| 2025 w28 | 3.65 | 3.87 | 3.73 | 666 | 1,391 | −52 % | 53,182 | 54,872 |
| CY2009 w03 | 306.93 | 306.93 | 306.93 | 0 | 18,446 | −100 % | 27,488 | 28,435 |
| CY2009 w28 | 2.87 | 2.78 | 2.78 | 0 | 2,142 | −100 % | 22,863 | 22,863 |

*Average absolute price difference, €/MWh, preview against LP, on the register of D-115 (the preview does not run Kruonis's output in steps, which the LP does), before it on D-114's, the LP day by day (D-112) and oil shale entering by the day (D-113, its start on the megawatts available, D-114), the preview on the week the entry committed (`data/derived/gap/gap.json`; Kruonis
bidding its cycle cost and held to its week's power, the floors from below-cost hours and the
week's 10th-percentile hour, the markup of the Latvian and Lithuanian gas (before D-164's one bid; the table is not run again), observed
availability, the Daugava's decile band and no loss wedge in the replays, Poland's price net of
its allocation constraint, LV–LT at its published capacity, batteries at Δ = 71.5 €/MWh (71 on D-114's), the
engine of record's stores at their exact hours, D-101; the climate-year weeks with the Daugava of
D-070 and D-071, the oil shale and waste of D-074 and, since D-105, no offshore wind in Latvia or
Lithuania and, since D-107, Lithuania's onshore wind at 0.80 of PECD's factor, with which the
preview's storage gives nothing in CY2009's winter week — 0 MWh against the LP's 18 446 (20 682
before D-115), at the price cap in nine hours — and its prices miss by 307 €/MWh on average (309
before D-115, 312 before D-112 and D-113,
on D-111's data; 310 on D-109's register, 311 before D-109, 200 after D-105 alone, 42.5 before it); the LP's prices that week peak at
300 €/MWh, 340 before);
storage = batteries and Kruonis. The preview does not hold Kruonis to its week's power (D-073). Congestion rents per border are in `gap.json`. The LP has no ramp band, so the
preview's prices may sit up to 1 €/MWh above its. With M2's inputs the preview was within
0.5–5.4 €/MWh in the observed weeks and 21 €/MWh in CY2009's winter week, its storage 9–69 %
short (one week 55 % over). With the calibrated inputs its storage falls further short, in
CY2009's summer week it discharges nothing, and over whole years it is far off (ERRATA E-040);
M4 decides how the preview is shown.*

Revision 1.3 held the preview itself to 3 €/MWh and ±15 %; one week of eight met that (D-019).
Before the tuning round of D-018 (PLAN §3.4's rules: the Daugava run evenly in pass one, charge
bids from p⁰) the largest zone difference per week was 5.37, 1.88, 1.51, 0.88, 1.32, 16.91,
70.13 and 2.51 €/MWh, storage discharge was 100, 31, 88, 36, 56, 10, 30 and 24 % short of the
LP's, and the Daugava sold 5–38 % of the LP's release in five weeks (ERRATA E-033). Where the
preview departs, its storage plans against prices no storage has moved and runs in full-power
steps, while the LP runs Kruonis and the batteries at part load and keeps prices from reaching
the DSR and scarcity levels of pass one (in the winter week of 2009 the preview clears 500–2 000
€/MWh in three hours the LP clears at 166, and ten hours hold 82 % of the week's price
difference). A spike that schedules each unit against the prices its own full-power steps meet
(`spikes/storage-impact/`) did not close the gap. That a storage unit's own dispatch moves the
prices a price-taker model schedules it against is the subject of [L26], [L27] and [L28]. The
owner chose the weekly LP as the engine of record and the two-pass engine as its preview
(D-021, revision 1.4).

## 7. Calibration (M3; R-VAL-1…8, R-SUP-5/6, R-STO-9, R-LINK-8, DECISIONS D-022 to D-024, D-042, D-044)

The replays of the observed years are measured against what was observed; the parameters
R-VAL-1 allows are fitted on 2023–2024 and frozen, and 2025 is blind. Every figure here comes
from the engine of record. `make fit` runs the fits (`validate/fit.py`) into the register
`data/derived/fitted_parameters.json`, each with a derived lineage record naming its inputs;
the export copies the register into `presets.json` (`fitted`), from where the engine reads it.
Lineage records are not committed (they are rebuilt from the raw cache), so on a fresh clone
`make fit` runs after `make db` and before `make export`: it finds the register equal to the
committed presets, rewrites the same values and their records, and exports only if they differ — but for the
batteries' Δ as the data stand on 2026-11-25: its fit runs to the end of the year's data, which now hold October, and
gives 60.5 €/MWh where the register holds 71.5, a refit not adopted (§7.2).
`make validate` replays 2020–2026 (`app/scripts/validate_fit.ts`, written to
`data/derived/validation/<year>.json`) and runs the EstLink 2 gate (`app/scripts/estlink2.ts`).
The step-by-step log, what was tried and not kept, and where the error sits are in
`docs/research/2026-09-25_calibration_m3.md` (steps S0–S6) and
`docs/research/2026-10-04_calibration_night.md` (steps S7–S12, the round of D-042 and D-044) and
`docs/research/2026-10-05_validation_round3.md` (steps S13–S17, the round of D-073).
The figures of this section are on the gas plants' one bid and its refit (D-164, decided by the owner
on 2026-10-22) and, since D-171 (2026-10-23), on the record's gas price per net MWh with the adder refitted on it,
each beside the figure on the register before it, which runs Kruonis's output in steps of
its power with the markup refitted on it (D-115, accepted by the owner on 2026-10-11, D-116), over the decisions the owner
accepted on 2026-10-11 (D-114) — September's data (D-111), the engine of record day ahead (D-112),
oil shale's market entry with its start on the megawatts available (D-113, D-114) — each beside the
figure before it. Beneath them lie the register of D-073 with
the boundary prices of D-075 (step S16) and D-076 (step S17), the Latvian–Lithuanian capacity of
D-077 (step S18) and the markup and Δ refitted on them, all accepted by the owner on 2026-10-06
(D-078), and D-109's oil shale, accepted on 2026-10-10 (D-110); the figures of the
register he accepted on 2026-10-05 (D-042 and D-044, D-045) are in D-073's before/after table,
those of D-073 alone in D-075's, those before D-076 in D-076's, those before D-077 in D-077's,
D-025's in D-042's.

### 7.1 What the replays take from the record (D-022)

- *Thermal availability:* each thermal technology's weekly maximum A75 output, shared among its
  classes in order (oil shale Auvere, fluidised bed, pulverised firing; `capAvailability`): what
  planned and forced outages, reserve status and mothballing left of the installed capacity —
  R-SUP-6's "week's maximum" read the same way. The observed maxima are net of the reserve the
  plants held, so no headroom is taken off them again. Scenario runs keep installed capacity.
- *CHP floor (R-SUP-5):* floor(T) = max(0, a + b × max(0, T_ref − T)) MW per zone and technology,
  T the zone's ERA5 temperature (`applyChpFloor`), capped at the technology's availability and
  taken from its classes in proportion to their MW; it covers gas and biomass CHP. Estonian oil
  shale carries none (D-109): in a replay the week's least output of its record holds
  the Narva plants' must-run (below) — the fit on 2023–2024 held it above what ran in 2025–2026
  (E-139) — and a scenario's oil shale is Auvere, a condensing unit, with no floor: with one it ran
  1.44 TWh a year as must-run at a CO₂ price of 197.5 €/t (D-074, ERRATA E-066).
- *The week's least output (D-073):* besides the fitted floor, each thermal technology runs at
  least the 10th-percentile hour of its week's A75 output (`thermal_weekly_p10_mw`,
  `applyObservedFloor`), taken from its classes in the order of the availability and never more
  than they offer: what ran whatever the price for a reason no temperature gives. The case that
  shows it is Lithuania's gas in January–May 2025, the months around the synchronisation with
  continental Europe (8–9 February): in the hours Lithuania cleared at or below 30 €/MWh it ran
  162–246 MW on a monthly average, where the floor fitted on 2023–2024 asks for about 50 and the
  same hours of 2023, 2024 and 2026 show 10–60 in all but two months. The decile is the Daugava band's convention
  (D-044), not a fit. Scenario runs have no record and keep the fitted floor alone.
- *Oil shale's market entry (D-113, D-114; `entry.ts`):* the engine of record clears in two
  passes. The first decides, for each oil-shale class and UTC day, whether it runs: its price
  reaching the class's bid in at least ERAA 2025's minimum time on (8 h for Auvere and the
  fluidised-bed units, 11 h for pulverised firing) and, from off, the day's margin over the bid
  paying a warm start of the megawatts it has available that day (ERAA's 42 or 60 €/MW and 18 GJ/MW
  of start fuel, 92 or 110 €/MW; D-114 — on its installed megawatts, as D-113 was proposed, the
  fluidised-bed class paid three to four times ERAA's start per megawatt that could run, and
  pulverised firing could not start at all). A class on runs at least ERAA's minimum stable load (0.5) all day and offers the
  rest at its bid; a class off offers nothing; the week's least output above stays beneath. The
  second pass clears the committed problem. The decision reads a price that assumes the class
  free to run, so a class kept off can be missing from the day it was needed: a day the second pass
  prices at the cap in Estonia while a class with megawatts available that day is kept off is
  committed again with every such class on, its week cleared again, a start the rule did not pay for
  and the next day decided as before (D-165). Under one gas adder of 50 €/MWh the fluidised-bed
  class stayed off on 10 June 2020 and 16 hours cleared at the cap (ERRATA E-160); at the register's
  adder of 42.5 the replay of 2020 meets it on the same day — the fluidised-bed class, 288 MW available, kept off and
  16 hours at the cap, none once the day is committed again — and no other replay does. Replays and scenarios alike;
  the decision reads the
  model's own price; its results count the committed minimum load (ERRATA E-141). In the record
  the fleet is off — no hour of the day above 50 MW, below any unit's minimum stable load — on 11,
  11, 22 and 38 % of the days of 2023–2026 (2026 to October), and runs in campaigns of 8–17 days at the median, a
  day on's least hour at 57–63 % of its highest (`spikes/commitment/record.ts`); under the entry
  the replays' oil shale lies within 7 % of the record in 2023–2025 and 8 % in 2026 (§7.3; within 7 % in
  2023–2026 on D-115's register).
- *Kruonis* bids its cycle cost, Δ = 60 €/MWh, the batteries' prior (R-PAR-6), as in v4 (v4 D-053).
  Its power in a replay is the record's of the week (D-073): it delivers at most the week's
  maximum A75 output (`hydro_weekly_max_mw.kruonis`) and pumps at most that over its round-trip
  efficiency — the units in service that week, net of what they held in reserve, as the weekly
  maxima are for the thermal plants and the Daugava. A75 shows 612–756 MW at most in 2023–2025
  against 900 MW installed, and output above zero in 3 500–3 900 hours a year at 135–146 MW on average: the
  plant runs long at part of its power. Given all 900 MW, the programme delivered 274–418 MW in
  the hours Lithuania cleared above 250 €/MWh in 2024–2025, where the record shows 142–224.
  Scenario runs keep the installed megawatts: held out, Litgrid's two reserve units move no 2035 figure
  beyond 0.1 €/MWh, the batteries carrying the flexibility (D-139). Since D-115 its output in an hour runs in
  four equal segments of the power it has, the first at the plant's cost and each further one 60
  €/MWh more (0 / 60 / 120 / 180), the step fitted with the markup and, since D-164, with the gas bid's adder (§7.2): two of its four units are
  Litgrid's mFRR reserve, and its owner, who holds most of
  Lithuania's dispatchable plant, weighs what its output does to the price, as a price-taker with
  perfect foresight does not. The programme spreads its water over more hours at part load —
  1 362–1 752 generating hours a year at 106–135 MW in 2023–2025 on D-115's register, at the week's limit in 9–23 of
  them, where at one cost it ran 900–1 311 hours at 251–323 MW, at the limit in 435–559, and the
  record shows 2 607–3 230 hours above 1 MW at 173–184 MW — and gives the hours Lithuania cleared above 250
  €/MWh 126 / 205 / 121 MW, against 184 / 224 / 142 recorded and 240 / 310 / 197 at one cost
  (`spikes/dear-hours/stores.ts`, on D-115's register). It cycles 0.15–0.18 TWh a year with the one bid
  (0.15–0.19 on D-115's register) against 0.48–0.57 in A75. A75
  counts balancing energy too, but Lithuania's activations, from every provider, can account for at
  most 20 % of the plant's 2025 output and 14 % of 2026's: its day-ahead output was at least 0.39 TWh
  in 2025 (`docs/research/2026-10-18_kruonis_balancing.md`, against the Baltic Transparency
  Dashboard's activations). The shortfall is the model's own: the steps above, and a day flatter than
  the market's.
- *The Daugava's band* (D-022, D-042, D-044): in a replay the cascade releases, hour by hour,
  between the 10th and the 90th percentile hour of the week's observed output (A75 run-of-river,
  Latvia; `hydro_weekly_p10_mw`, `hydro_weekly_p90_mw`, the upper bound never below the week's
  average so that the budget passes). The week's observed minimum and maximum (D-022, D-042) are
  what outages, reserves and water levels allowed in its two extreme hours; a programme that sees
  the whole week — or, since D-112, the day and the next — sits at those bounds in most hours, where the record visits them in a few — in
  the hours Lithuania cleared at or above 150 €/MWh in 2024–2025 the model on the minimum and
  maximum ran 526–629 MW of the cascade against 363–454 observed, and in the hours at or below
  30 €/MWh of 2025 142–156 MW against 245–282. The deciles are a convention, not a fit (the
  research log has the neighbouring choices). Scenario runs keep PEMMDB's MIN_TURB and MAX_TURB:
  their Daugava is freer than the record's, which flattens their prices (§5.7). The
  budget stays weekly (R-ENG-5).
- *The price at the Nordic end of a cable* (R-BND-3; D-075): a boundary zone's price
  in a replay is its day-ahead price (ENTSO-E A44) and, from the Nordic flow-based go-live of
  2024-10-29, the price at the virtual hub the flow-based market puts at the Nordic end of the
  cable — SE4_NB for NordBalt, FI_EL for EstLink — computed from what JAO publishes: the zone's
  price − Σ shadow price × (PTDF of the hub − PTDF of the zone) over the network constraints
  that bound the hour's result (`pipeline/sources/jao.py` `hub_spreads`; hourly averages of the
  market time units; the cable's own capacity, ramping and allocation constraints are left out,
  since the model has them as the transfer capacity). Until that day Lithuania's price equalled
  SE4's to the cent in 98 % of the hours NordBalt's schedule lay inside its capacity; since then
  in 5, 9 and 11 % (November–December 2024, 2025, January–August 2026), and it equals the hub's
  in 99, 78 and 72 % (`spikes/validation-round2/hub_check.py`). The hub stands on average 0.2–0.9
  €/MWh below SE4 and more than 1 €/MWh off it in 34–43 % of hours, by about +4 to +5 and −5 to
  −7 where it is; EstLink's hub stands within 1 €/MWh of Finland's price in all but 0–2 % of
  hours. No Baltic price enters the figure. Scenario runs are not touched: TYNDP's profiles are
  zone prices of a market model without these constraints.
- *The price at the Polish end of LitPol Link* (R-BND-3; D-076): PSE limits Poland's
  net import and export in the day-ahead coupling (its allocation constraint; the import limit
  was 0 MW in a quarter of the hours of 2024). The limit is on Poland's net position over all
  its borders, so when it binds Poland's price parts from the price its interconnectors clear
  at: Poland cannot import more, its price stands above its neighbours', and LitPol and SwePol
  trade — and carry transit — at a price below it. In a replay Poland's boundary price is,
  from the Core flow-based go-live of 2022-06-09, its day-ahead price less that shadow price.
  No publication gives the shadow price; it is derived from JAO's Core publication tool as
  Poland's price less Germany's (`priceSpread`) less the network's part of that spread,
  Σ shadow price × (PTDF of Germany − PTDF of Poland) over the Core constraints that bound the
  hour (`shadowPrices`), and read only where the published limit could bind: where Poland's
  Core net position (`netPos`) lies within the two cables' 1 100 MW of the import limit (a
  positive shadow price) or the export limit (a negative one; `allocationConstraint`); elsewhere
  it is 0 (`pipeline/sources/jao.py` `core_spread`; hourly averages of the market time units). The
  import limit bound in 41, 35 and 29 % of the hours of 2023, 2024 and 2025 and Poland's price
  stood on average 10.3, 7.9 and 7.4 €/MWh above the clearing price; in the second half of 2022
  the export limit bound in 72 % of hours, by 100 €/MWh on average (an independent count gives
  about 40 % import-limited in 2023 and 72 % export-limited in 2022: Magnus Energy, "Core
  Flow-Based Market Coupling 18 months since go-live", 2023-12-21). In the hours LitPol's
  schedule lay inside its capacity Lithuania's price was within 1 €/MWh of Poland's in 53, 64
  and 76 % (2023, 2024, January–September 2025) and of the clearing price in 86, 90 and 91 %;
  at the link's import limit Lithuania's price was at or above Poland's in 70–81 % of hours, as
  a full cable requires, and at or above the clearing price in 92–96 %
  (`spikes/validation-round2/pl_check.py`). No Baltic price, flow or schedule enters the figure.
  Scenario runs are not touched: TYNDP's market model has no such limit.
- *The balancing allocation on the AC borders* (R-LINK-5; D-077): since the Baltic
  balancing capacity market (2025-02-05) part of EE–LV's and LV–LT's capacity is allocated to
  aFRR and mFRR (BTD; 265–325 MW on EE–LV and 264–383 on LV–LT, averages by period). On EE–LV the
  published capacity (A31) still holds it: the day-ahead schedule never reaches A31 and stops,
  in the hours the border is congested, at A31 less the allocation (681 of 895 congested hours
  of February–September 2025 within 1 MW of it, 897 of 2 146 in January–August 2026). On LV–LT
  it does not: the schedule stops at A31 itself — 25 of 25 congested hours towards Lithuania
  and 104 of 107 towards Latvia in February–September 2025, 125 and 39 in 2026 — is never held
  at A31 less the allocation, and lies above that in 1 387 hours of January–August 2026, by
  195 MW on average (`spikes/validation-round2/reserve_check.py`). A replay therefore takes
  the allocation off EE–LV's A31 and not off LV–LT's (`export/years.py`). Scenario runs keep
  both reservations (R-LINK-5's averages of 2025, 265 and 272 MW, off capacities built from the
  lines): without LV–LT's the opening scenarios give the same prices to 0.1 €/MWh, the border
  does not bind in 2035.
- *No loss wedge at the borders* (D-042): a replay clears EstLink, NordBalt and LitPol without
  the losses of R-BND-4. The day-ahead coupling applies no loss factor on these cables — where a
  cable is not at its limit the two zones clear at one price, to the cent: in the hours with both
  prices above 20 €/MWh, EE = FI in 54, 42 and 40 % of hours of 2023, 2024 and 2025, LT = SE4 in
  50, 24 and 11 %, LT = PL in 28, 37 and 20 %, and no more than 3 % of hours sit near any one
  ratio off 1 (`replay`,
  `state/scenario.ts`). With the losses on, an uncongested import cleared the Baltic zone 1.6–4.3 %
  above its neighbour. Scenario runs clear without it too, since 2026-10-05 (D-045): the same
  coupling clears them. With it the opening scenario's weighted prices were 61.1 / 50.3 / 50.3
  €/MWh (EE / LV / LT) against 59.8 / 49.2 / 49.2 without, and the 2 SMR and 3 SMR scenarios'
  Estonian price 46.4 and 37.9 against 45.5 and 37.3 (as measured then, before the Daugava's
  corrections of D-070 and D-071, which together lower these by 1–4 €/MWh). The losses stay a field of the engine's
  scenario (`losses`) for a market that prices them, as Baltic Cable's and NordLink's does; the
  application has no control for it.

### 7.2 The fitted-parameter register (R-VAL-2)

Nothing else in the supply side is fitted (R-SUP-6).

*The heat-driven floor* (`app/scripts/fit_floor.ts`; A75 generation, ERA5 temperature and the
zone's day-ahead price, 2023–2024; D-042): the output a technology gave in the hours whose
observed zone price was below its cheapest bid in the engine (before the floor and the markup) —
output the market did not pay for, so output that ran for another reason: heat, or a committed
unit's minimum load. Its average per 1 °C bin (bins of ≥ 50 hours), a least-squares line on the
bins' average heating degree-hours weighted by their hours with a, b ≥ 0, and T_ref from
{8, 10, 12, 15} °C with the least squared error (`fit`, `fitAt`). Hours of a week in which the
technology never ran have no bid and are not counted. The observed prices are those of the fit
years only (R-VAL-1); 2025 sees the frozen line (R-BND-3).

| Zone | Technology | Below-cost hours of 17 544 | T_ref, °C | a, MW | b, MW/K | At or above the floor, 2023–2024 | 2025 (blind) | Floor at −20 °C, MW |
|---|---|---|---|---|---|---|---|---|
| EE | biomass | 8 930 | 15 | 33.52 | 1.561 | 62.7 % | 57.2 % | 88 |
| LV | gas | 10 515 | 8 | 50.52 | 21.131 | 45.7 % | 51.6 % | 642 |
| LV | biomass | 8 558 | 12 | 28.85 | 1.320 | 49.4 % | 82.3 % | 71 |
| LT | gas | 10 914 | 15 | 47.08 | 0.251 | 27.8 % | 60.6 % | 56 |
| LT | biomass | 8 540 | 8 | 29.61 | 0.157 | 79.7 % | 0.0 % | 34 |

*An average, not an envelope: about half the hours lie below it, and the floor is capped by the
technology's weekly maximum. M3's fit (`validate/chp_fit.py`, kept for comparison) was the 10th
percentile of all hours per bin, a lower envelope: a 0–25 MW, with 84–90 % of hours above
it. In the hours the market cleared at or below 10 €/MWh in 2024 it left Estonia's thermal plants
at 56–95 MW against 140–174 MW observed and Latvia's at 27–45 against 58–82, so the model's
cheap hours were 24–33 €/MWh too dear. Estonian oil shale had a row as well (10 996 hours, 8 °C,
116.35 MW, 12.308 MW/K) until D-109 dropped it: fitted on years in which it ran more,
it over-generated in 2024–2026 (2.10, 1.74 and 1.21 TWh against 1.70, 1.42 and 0.79; E-139).
Lithuanian biomass ran at 20 MW on average in 2025, below its floor in every hour; the cap at
the weekly maximum holds it to what was available. The three gas and oil-shale rows are re-fitted
on D-094's CO₂ price (accepted, D-095; before it 10 993 hours, 116.38, 12.288 and 460 MW; 9 294, 46.24,
19.479 and 592; 9 637, 44.92, 0.413 and 33.5 %), and the two gas rows again on the record's gas price per net
MWh, which raises the gas plants' cheapest bid in the replays (D-171; before it 9 297 hours, 8 °C, 46.36, 19.450,
47.2 %, 53.3 % and 591 MW; 9 639, 12 °C, 44.96, 0.411, 33.4 %, 60.7 % and 58). Lineage:
`pipeline.chp_floor.<zone>.<technology>.2023-2024`.*

*The gas plants' one bid* (`app/scripts/fit_gas_bid.ts`; the 2023 and 2024 replays; D-164): every gas offer of
Estonia, Latvia and Lithuania — what the must-run floors and, in a scenario, the reserve headroom leave of it —
bids one price in every hour: a combined-cycle plant's cost as the run prices it (fuel over its efficiency, CO₂,
running costs of `gas_ccgt`) plus one adder, whatever the plant's own efficiency (`applyGasBid`); among those equal
bids the cheaper plant runs first, each offer's bid raised by 0.001 × its class's cost above the combined-cycle
plant's (`GAS_ORDER`, D-168 — before it the solver's tie-break on the offers' names ordered them, ERRATA
E-161). Each fit year
gives its own adder, on a grid of 10 €/MWh from 0 to 150 and then of 2.5 around its best, minimising the sum of the
three zones' hourly MAE of that year, and is scored on the other; the register holds their average, as it held the
schedule's (D-073).

| Fitted on | Adder, €/MWh | Sum of MAE on its own year | on the year left out |
|---|---|---|---|
| 2023 | 42.5 | 26.89 | 34.54 |
| 2024 | 42.5 | 34.54 | 26.89 |
| **Register: their average** | **42.5** | 61.43 on both | 61.43 left out |

| Zone | 2025 MAE without the adder → with it, at Kruonis's step 60, €/MWh |
|---|---|
| EE | 18.58 → 17.82 |
| LV | 17.96 → 16.90 |
| LT | 17.77 → 16.77 |

*€/MWh over a combined-cycle plant's cost, for every gas plant of the three zones, at Kruonis's step 60; sum of the
three zones' MAE over the two fit years 69.78 at cost and step 0, 61.43 with the register's (D-171: the record's
gas price per net MWh; on the gross price of D-164 the adder was 51.25 — 50 and 52.5 — 71.98 at cost and 61.30). The schedule it
replaced, 32.5 / 80 / 220 / 260 on Latvia's and Lithuania's gas alone (below), fits the two years to 59.13 on the
same engine (59.51 when it was fitted, before D-130) and keeps more of the price distribution's tail: in 2025 Latvia
has 197 hours at or above 250 €/MWh on it against the one bid's 105 and the record's 251, and the duration curve's RMSE
8.0–8.7 against 14.4–15.9 (§7.3). The one bid is identified where the schedule was not: each fit year alone gives
47.5–55 €/MWh at every step of Kruonis's grid, and its left-out sum is its fitted one; the schedule's top bins
differed threefold between the years. On the net basis both fit years choose 42.5 at step 60, and the register
is 42.5–45 at every step of the grid. One price for all, not one adder on each plant's own cost: in the replays the
two are one, every zone's gas being one class with one cost; in 2035 Estonia's open-cycle peakers, at 189 €/MWh of
their own cost at the opening state, would bid 47 above Latvia's and Lithuania's combined-cycle plants (142) and
leave the merit order, which no replay can test (`docs/research/2026-10-22_single_gas_bid.md`, §4 and §10).
Lineage: `pipeline.gas_bid.2023-2024`. The cross-check against Nord Pool's aggregated curves (R-SUP-6, OPEN-10) is
not done.*

*Until D-164, the utilisation markup* (`app/scripts/fit_markup.ts`, removed with it; the 2023 and 2024 replays;
D-073): what each gas offer (CCGT, conventional, OCGT, CHP) has left after the must-run floors and, in a scenario, the
reserve headroom is split into four tranches by share of that remainder's weekly maximum (0–50,
50–75, 75–90, 90–100 %), each bidding its short-run cost plus the bin's markup (`applyMarkup`;
R-SUP-6 as revision 2.10 words it, D-117: the zone's fleet binned by its own maximum fits the fit
years 2.3 €/MWh worse, ERRATA E-147). One schedule serves the Latvian and the Lithuanian gas fleet; Estonia's gas,
13–15 MW in the fit years, carries none. Each fit year gives a schedule on its own — coordinate
descent from zero on the increments (steps 40, 20, 10 and 5 €/MWh, increments ≥ 0 so the
schedule is non-decreasing), minimising the sum of the three zones' hourly MAE of that year — and
is scored on the other; the register holds the average of the two. PLAN §3.7's residual rule did not
converge (ERRATA E-039).

| Fitted on | 0–50 % | 50–75 % | 75–90 % | 90–100 % | Sum of MAE on its own year | on the year left out |
|---|---|---|---|---|---|---|
| 2023 | 30 | 70 | 110 | 110 | 26.43 | 33.79 |
| 2024 | 35 | 90 | 330 | 410 | 33.01 | 26.55 |
| **Register: their average** | **32.5** | **80** | **220** | **260** | 59.51 on both | — |

| Zone | 2025 MAE without → with, €/MWh |
|---|---|
| EE | 19.82 → 18.03 |
| LV | 19.44 → 16.77 |
| LT | 19.22 → 16.62 |

*€/MWh over short-run cost, for Latvia and Lithuania; sum of the three zones' MAE over the two
fit years 71.64 without a markup and Kruonis's step, 59.51 with the register's, on the engine of
record day ahead with oil shale entering by the day, its start on the megawatts available (D-112,
D-113, D-114), and Kruonis's output in steps of its power at the step fitted with the schedule
(D-115; below). Before D-115: 37.5 / 147.5 / 237.5 / 257.5 and 62.16, the folds 40 / 60 /
120 / 120 (26.76 on 2023, 35.72 on 2024) and 35 / 235 / 355 / 395 (33.97, 28.30), in 2025 19.82 →
18.70, 19.44 → 17.80 and 19.22 → 17.61. With the start on the installed megawatts, as D-113 was
proposed: 37.5 / 150 / 240 / 260, 71.68
and 62.56, the folds 40 / 65 / 125 / 125 (26.79 on 2023, 35.43 on 2024) and 35 / 235 / 355 / 395
(34.30, 28.39), in 2025 19.77 → 18.97, 19.40 → 18.21 and 19.19 → 18.01; on D-112 alone 30 /
142.5 / 232.5 / 252.5 and 62.93. Before them, 42.5 / 197.5 / 317.5 / 337.5: 73.78 without a markup, 62.74
with it, the folds 45 / 75 / 195 / 195 (27.06 on 2023, 36.10 on 2024) and 40 / 320 / 440 / 480
(35.23, 27.37), and in 2025 19.91 → 19.58, 19.26 → 18.11 and 18.93 → 17.88, on D-109's replays, which take
Estonian oil shale's fitted floor out and leave the schedule as it was (75.48 and 62.80 before,
the folds 27.71 / 35.74 and 34.86 / 27.82; the 2025 table on the register of D-109, 20.85 → 20.02,
20.96 → 18.84 and 18.58 → 18.01 when it was written, on 2026-10-06) — refitted with D-106 on the engine
of record's exact store hours (D-101): 2.5 €/MWh more on every tranche against 40 / 195 / 315 /
335 and 62.82 before it (62.81 before D-094's CO₂ price, accepted, D-095, which moves the floors
and leaves the schedule). The fit ran again when Poland's
boundary price changed (D-076): with the clearing price at LitPol the two fit years ask for more
— before it they gave 0 / 60 / 120 / 120 and 30 / 230 / 350 / 390, a register of 15 / 145 / 235 /
255 and sums of 82.77 against 90.41 — and Latvian gas then delivered 1.12 / 1.33 / 1.29 TWh in
2023–2025 against 1.35 / 1.60 / 1.57 observed, outside the tolerance in each year (1.16 / 1.37 /
1.35 on D-112 and D-113, §7.3), where the schedule before D-076 gave 1.30 / 1.51 / 1.43. **Why this form (ERRATA E-065; the figures of this
paragraph are those of D-073's round, before D-076).**
Until D-073 the descent ran on both fit years at once with a schedule per zone, twelve
parameters. The fit years do not pin twelve down: scored on the year left out, a schedule per
zone gives 84.40, one for Latvia and Lithuania 84.17 with or without Estonia's own, one for all
three 84.18. The joint descent is not safe either: for the common schedule it ends at 20 / 980 /
1 100 / 1 140 €/MWh — the upper half of both fleets priced out of the market, at a fit-year sum of
81.95 — and fails the blind year by 6–8 €/MWh in every zone (27.7 / 27.6 / 29.0); for the schedule
per zone it ends at Lithuania 45 / 445 / 525 / 565 with 81.32 (from four other starting points
81.31–81.91), 61.88 on the blind year and 45.99 on January–August 2026, where the register's
gives 60.81 and 43.48. The two fit years disagree on the level (120 against 390 €/MWh in the top
bin) and each alone is a bounded descent; their average is the register. With it Latvian gas
delivers 1.30 / 1.51 / 1.43 TWh in 2023–2025 against 1.35 / 1.60 / 1.57 observed, where the
schedule before (LV 35 / 275 / 355 / 435, LT 0 / 80 / 400 / 520, Estonia 80 / 160 / 200 / 200)
left it at 1.13–1.17. Estonia's former schedule moved 6–10 MW of gas engines in the replays and
was carried by 1 364 MW of gas in the scenario of 2035; without it the opening scenario clears
1.0 €/MWh lower (§9). Earlier registers: M3's LV 0 / 50 / 130 / 170 and LT 0 / 0 / 55 / 75;
D-042's LV 40 / 400 / 560 / 560, LT 0 / 280 / 480 / 520. Lineage: `pipeline.markup.2023-2024`. The
cross-check against Nord Pool's aggregated curves (R-SUP-6, OPEN-10) is not done: their history is
paid and not bought, and the public days collected since 2026-10-08 (D-108) are still too few.*

*Kruonis's step* (`app/scripts/fit_gas_bid.ts`, before D-164 `fit_markup.ts`; D-115; `fitted_parameters.json`
`kruonis_output`): the first quarter of Kruonis's output in an hour costs the plant's cost, each
further quarter a step more (§7.1). The gas bid's adder (before D-164 the schedule) is fitted at each step of a
grid, and the step whose register fits the two fit years best is kept — one structural number for both years:
carried as a fifth coordinate of the descent the step ends where the path takes it (on the four
units' form the fit years ask for 135 and 45 €/MWh on their own, and their average fits neither).
The fit years' sum of MAE at the register refitted at each step, with the one bid on the record's gas price per net
MWh (D-171):

| Step, €/MWh | 0 | 15 | 30 | 45 | **60** | 90 |
|---|---|---|---|---|---|---|
| Adder, €/MWh | 45 | 43.75 | 42.5 | 42.5 | **42.5** | 42.5 |
| Sum of MAE, 2023 + 2024 | 64.56 | 62.97 | 62.00 | 61.51 | **61.43** | 61.59 |

with the one bid on the gross price (D-164), before it:

| Step, €/MWh | 0 | 15 | 30 | 45 | **60** | 90 |
|---|---|---|---|---|---|---|
| Adder, €/MWh | 52.5 | 50 | 50 | 50 | **51.25** | 50 |
| Sum of MAE, 2023 + 2024 | 64.68 | 63.19 | 61.93 | 61.37 | **61.30** | 61.51 |

and with the schedule (D-115):

| Step, €/MWh | 0 | 15 | 30 | 45 | **60** | 90 |
|---|---|---|---|---|---|---|
| Register | 37.5 / 147.5 / 237.5 / 257.5 | 27.5 / 187.5 / 287.5 / 307.5 | 20 / 110 / 210 / 230 | 37.5 / 70 / 220 / 280 | **32.5 / 80 / 220 / 260** | 17.5 / 75 / 107.5 / 107.5 |
| Sum of MAE, 2023 + 2024 | 62.16 | 61.01 | 60.09 | 59.55 | **59.51** | 60.23 |

*At step 0 the schedule's programme is D-114's and returns its register to the euro. Lineage: the gas bid's,
`pipeline.gas_bid.2023-2024` (the markup's, `pipeline.markup.2023-2024`, before D-164).*

The step is weakly identified — 45 and 60 fit the years within 0.08 with the one bid (0.07 on the gross price of
D-164, 0.04 on D-115's register), the gain holds over 30–60 — and
a segment is a quarter of the hour's power: in a replay the week's, about 106 MW at the fit years'
median, in a scenario the plant's full output, 166–187 MW for the fleets' 900–1 010 MW. The step
fitted on the replays holds a scenario's Kruonis back 35–45 % less per megawatt (D-115, limits).

*Battery cycling cost Δ* (`app/scripts/fit_delta.ts`; R-STO-9): Δ is the value at which the
Estonian batteries, their reserve held out (R-STO-7), discharge what A75 reports between
2026-03-12 and 2026-09-30 (31 015 MWh, D-111; to 2026-08-31 23 342; the series starts
on 2026-03-11, ERRATA E-038); it depends
on the share of the mFRR need the batteries hold. The owner chose share 0 (OPEN-3, D-025), so
**Δ = 71.5 €/MWh** for every zone's batteries on the gas plants' one bid (D-164) as on the register of D-115 (71 on that of
D-112 to D-114, as on D-113's as proposed; 63.5 on D-111's data before them, and on D-112's alone; 69.5 on the register of D-109, 67.5 on D-106's, 67 on D-077's, 61 on D-076's, 61.5 on
D-073's, 61 on that of D-042 and D-044, 65.5 on D-025's, 58.5 on D-042's alone: the fit runs on the 2026 replay, which the floor,
the loss wedge, the Daugava's band, Kruonis's power and LV–LT's capacity moved); the other two fits stay
in the register as evidence. Kruonis keeps the prior of 60 €/MWh (§7.1). A68's 2026 batteries,
Latvia's 90 MW among them, read as AST's 80 MW reserve battery and Utilitas' 10 MW (ERRATA E-131);
since D-102 the replay leaves AST's battery and the reserve R-STO-8 credits it with (8 MW of FCR,
32 of aFRR) out of the observed fleet, which moved Δ from 67.21 to 67.70 €/MWh unrounded, 67.5 on
the register's half-euro steps (D-106); since D-109 Estonian oil shale runs no fitted floor in
the replay, Estonia's price is less low and its batteries discharge more at a given Δ, which the
fit answers with 69.5. With September (D-111) the window holds 31 015 MWh and the fit gives 63.5;
the day-ahead clearing (D-112) leaves it there and oil shale's market entry (D-113) takes it to 71,
where its start on the megawatts available (D-114) leaves it; Kruonis's output in steps (D-115)
takes it to 71.5. The register's 71.5 is the fit of that window, from 2026-03-12 to 2026-09-30.
`fit_delta.ts` fits to the end of the year's data: run on the data as they stand on 2026-11-25, with October in, it
gives 60.5 €/MWh (the window to hour 7 296, 42 777 MWh observed). That refit is not adopted — the register and every
figure of the site stay on 71.5 until the owner decides — so `make fit` today does not rewrite the same value for Δ.

| mFRR share held by batteries | Δ, €/MWh | Modelled discharge, MWh | Residual |
|---|---|---|---|
| 0.5 (the specification's default) | 0 (bound) | 18 445 | −40.5 % |
| 0.25 | 37.5 | 31 206 | +0.6 % |
| **0 (adopted, D-025)** | **71.5** | 31 241 | +0.7 % |

*At the default share even Δ = 0 leaves the batteries two fifths short: the reserve takes most of
their power. On D-115's register, before the one bid: 0 (18 445 MWh), 37.5 (31 163) and 71.5 (31 161). On D-114's register: 0 (18 414 MWh), 37.5 (30 916) and 71 (31 023); on D-113's as
proposed: 0, 37.5 (31 009 MWh) and 71 (30 982); to
2026-08-31, on D-109's register: 0 (−33.5 %), 44 and 69.5. Lineage: `pipeline.battery_delta.EE.2026`.*

### 7.3 Results and the gate R-VAL-5: not met

| Year | Zone | MAE, €/MWh | Duration-curve RMSE | Hours ≥ 150 €/MWh, model / observed | Average price, model / observed |
|---|---|---|---|---|---|
| 2023 | EE | 9.2 | 3.8 | 12.0 / 12.6 % | 89.2 / 90.8 |
| 2023 | LV | 9.1 | 4.2 | 11.7 / 13.0 % | 91.7 / 93.9 |
| 2023 | LT | 8.6 | 4.0 | 12.2 / 13.4 % | 92.4 / 94.4 |
| 2024 | EE | 10.5 | 8.0 | 8.6 / 11.3 % | 83.6 / 87.3 |
| 2024 | LV | 12.1 | 10.9 | 8.0 / 11.4 % | 81.8 / 87.4 |
| 2024 | LT | 12.0 | 10.7 | 8.0 / 11.3 % | 81.7 / 87.3 |
| 2025 | EE | 17.8 | 14.4 | 11.0 / 14.0 % | 76.3 / 80.4 |
| 2025 | LV | 16.9 | 15.6 | 11.4 / 14.4 % | 82.8 / 85.7 |
| 2025 | LT | 16.8 | 15.8 | 11.4 / 14.4 % | 82.3 / 85.3 |

*With the record's gas price per net MWh and the adder refitted on it, 42.5 €/MWh (D-171). With the gas plants'
one bid on the gross price (D-164): MAE 9.2 / 9.0 / 8.6 (2023), 10.5 / 12.1 / 12.0 (2024) and 17.9 / 17.0 / 16.9
(2025), duration-curve RMSE 3.8 / 4.2 / 3.9, 7.9 / 10.8 / 10.6 and 14.4 / 15.7 / 15.9, hours ≥ 150 12.1 / 11.9 /
12.3, 8.6 / 8.1 / 8.0 and 11.1 / 11.5 / 11.5 %, average model prices 89.4 / 92.0 / 92.6, 83.9 / 82.1 / 82.1 and
76.6 / 83.3 / 82.7, the breaches the same. On D-115's register before it: MAE 9.2 / 8.9 / 8.4 (2023), 10.1 / 11.3 /
11.2 (2024) and 18.1 / 16.9 / 16.8 (2025), duration-curve RMSE 3.2 / 3.4 / 3.1, 5.8 / 8.4 / 8.4 and 8.7 / 8.0 /
8.2, hours ≥ 150 11.6 / 11.9 / 12.4, 9.1 / 8.9 / 8.8 and 11.5 / 13.1 / 13.1 %, average model prices 89.3 / 92.0 /
92.7, 83.9 / 82.5 / 82.5 and 77.8 / 84.7 / 84.1 — the rest of this note and of the section below, where it names
D-115's register, is that register's.
On D-115's register, solved as D-130 solves (presolve off, the first clearing's weeks kept; D-131).
Before D-130, with presolve: MAE 9.2 / 8.9 / 8.4 (2023), 10.3 / 11.4 / 11.3 (2024) and 18.0 / 16.8 /
16.6 (2025), duration-curve RMSE 5.9 / 8.5 / 8.4 in 2024 and 8.8 / 8.3 / 8.6 in 2025, 2025's hours
≥ 150 13.0 / 12.9 % in Latvia and Lithuania, average model prices 83.7 / 82.3 / 82.3 (2024) and
84.6 / 84.0 in Latvia and Lithuania (2025), the breaches the same. On D-115's register: Kruonis's
output in steps, the markup and Δ refitted on it. Before
D-115, on D-114's register: MAE 9.6 / 9.3 / 8.9 (2023), 10.8 / 11.8 / 11.8 (2024) and 18.7 / 17.8 /
17.6 (2025), duration-curve RMSE 1.4–9.8, hours ≥ 150 11.8 / 12.1 / 12.5, 8.6 / 8.3 / 8.3 and
11.0 / 12.9 / 12.8 %, average model prices 89.9 / 92.8 / 93.4, 83.9 / 82.8 / 82.8 and 78.0 / 86.0 /
85.4. Thresholds (R-VAL-5): MAE ≤ 15, duration-curve RMSE ≤ 10, hours ≥ 150 within ±3 points. Before
calibration (§5.6): MAE 25.6–29.1 (2023), 32.9–35.7 (2024), 38.2–42.1 (2025). On M3's register
(D-025): 19.1–20.2 (2023), 20.9–23.3 (2024), 28.0–32.8 (2025), duration-curve RMSE 16.5–37.3. On
the register of D-042 and D-044: 12.0–13.3 (2023), 14.9–16.7 (2024), 21.1–22.1 (2025),
duration-curve RMSE 5.3–16.1 (D-073's table has it row by row); on D-073's with SE4's and
Finland's zone prices at the cables: 11.9–12.9, 14.2–15.7 and 19.4–20.9 (D-075's table); with the
hub's price of D-075 and Poland's zone price at LitPol: 11.9–12.9, 14.1–15.6 and 18.6–20.5,
duration-curve RMSE 4.2–15.4 (D-076's table); with Poland's clearing price and the balancing
allocation still taken off LV–LT: the same in 2023–2024 and 18.0–20.0 in 2025 (D-077's table); on
the register of D-078 and D-094, before D-106 took the stores' exact hours (D-101) and AST's
battery out of 2026 (D-102): the same MAE at one decimal, duration-curve RMSE 2.9–12.1; on D-106's,
before D-109 took Estonian oil shale's fitted floor out of the replays: 8.9–9.6 (2023), 10.9–12.0
(2024) and 17.5–19.6 (2025), duration-curve RMSE 2.8–11.7, average model prices 88.4 / 91.6 / 92.3,
83.1 / 82.3 / 82.2 and 75.7 / 84.8 / 84.2 (D-109's table has the change year by year); on
D-109's, the weekly programme without oil shale's entry, before D-112 and D-113: 8.8–9.4,
11.1–12.2 and 17.9–19.6, duration-curve RMSE 2.5–12.1, average model prices 90.9 / 93.6 / 94.2,
85.0 / 83.8 / 83.7 and 78.8 / 86.1 / 85.4 (D-113's table has the steps); on D-113's as proposed,
oil shale's start on its installed megawatts, before D-114: 8.9–9.6, 10.9–11.9 and 18.0–19.0,
duration-curve RMSE 1.4–8.7, average model prices 90.0 / 92.8 / 93.5, 84.1 / 83.0 / 83.0 and
78.9 / 86.6 / 86.0. The
2025 rows are on D-091's replay, NordBalt closed on 30 March – 1 April (accepted, D-095; the average model
prices 75.4 / 84.3 / 83.7 and Latvia's dear hours 11.2 % before it).*

2023 meets the three price thresholds in every zone. 2024 meets the MAE but misses, in Latvia and Lithuania, the
duration curve (10.9 and 10.7 against 10; 10.8 and 10.6 on D-164) and the share of dear hours (3.4 and 3.3 points short
against the 3 allowed),
which it met on D-115's register (8.4 and 2.3–2.5 short) and missed before it by a hair (3.1 and 3.0; 2.8–2.9 with
oil shale's start on its installed megawatts, as D-113 was proposed; 3.2 before D-112 and D-113, and before D-106
the duration curve by 0.1 and by less than 0.05). The blind year 2025 meets the share of dear hours (2.9 points
short in every zone; 3.0 on the net basis, D-171) and misses the duration curve (14.4–15.8; 14.4–15.9 on D-164) and the
MAE by 1.8–2.8 (1.9–2.9): one price lifts no hour by
the share of the gas in use, where the schedule's upper tranches lifted the dearest (§7.2). On D-115's register it
met the duration curve (8.0–8.7) and missed the MAE by 1.8–3.1; it missed the duration curve by 1.2–2.1 and the
dear hours by 3.0–3.9 before the day-ahead engine and oil shale's entry, and the MAE by 2.6–3.7 before D-115,
3.0–4.0 as D-113 was proposed, 2.9–4.6 before D-112 and D-113, 2.5–4.6 before D-109. Poland's
clearing price (D-076) with the register refitted on it lowered the MAE of 2023 by 2.3–3.5 €/MWh
and of 2024 by 3.2–3.6, and of the blind year by 0.5–1.0: in 2025 Poland's limit bound less often
(29 % of hours against 41 and 35). LV–LT at its published capacity (D-077) lowered the blind
year's by another 0.4–1.2; it touches no hour before February 2025.
Generation per class (±10 % above 0.2 TWh) holds, with the one bid on the record's gas price per net MWh (D-171), for
Estonian oil shale (1.87 / 1.76 / 1.42 TWh in 2023–2025 against 2.00 / 1.70 / 1.42), Latvian gas (1.29 / 1.52 / 1.58
against 1.35 / 1.60 / 1.57) and Lithuanian gas in 2023–2024 (0.61 / 0.79 against 0.64 / 0.82), and misses for
Lithuanian gas in 2025 (1.15 against 1.44; on the gross price of D-164 1.88 / 1.76 / 1.43, 1.23 / 1.48 / 1.54,
0.60 / 0.77 and 1.14), Kruonis every year (0.15 / 0.18 / 0.18 against 0.53 / 0.57 / 0.48) and Estonian biomass every year and
Latvian biomass in 2023. On D-115's register it held for Estonian oil shale in every year under the
entry of D-113 and D-114 (1.87 / 1.77 / 1.41 TWh against 2.00 / 1.70 / 1.42; 1.88 / 1.77 / 1.41
before D-115, 1.87 / 1.75 / 1.39 with the start on the installed megawatts; before the entry the
replay ran 1.78 / 1.69 / 1.44 since D-109, short in 2023, and above the record in 2024–2025 before
D-109), and for Latvian gas in 2025 and Lithuanian gas in 2023–2024; it misses for Latvian gas in
2023–2024 (1.21 / 1.42 against 1.35 / 1.60, and 1.42 against 1.57 in 2025, inside the band at its edge, 9.9998 % short; 1.16 /
1.37 / 1.35 before D-115: the refitted markup holds it back, §7.2), Lithuanian gas in 2025 (1.24
against 1.44), Kruonis every year (0.15 / 0.18 / 0.19 against 0.53 / 0.57 / 0.48 TWh, of which balancing can be at most a fifth, §7.1; 0.26 / 0.33 / 0.33 before D-115, when the day's window gave it less
to move than the week), Estonian biomass every year and Latvian biomass in 2023. Net flows (±15 %)
miss on EE–LV, LV–LT and LT–PL in 2023 (LT–PL 0.10 TWh against 0.47), on EE–LV and LV–LT in 2024
(0.53 against 0.96 TWh and −0.72 against −0.38) and on LV–LT and LT–PL in 2025 (0.03 against 0.29
and 0.29 against 0.35): with less Estonian oil shale since D-109 less flows south in 2023–2024, and
a border no longer short carries a small difference of two large flows; LT–PL, which missed every
year with Poland's zone price, holds in 2024 (−0.96 against −1.03 TWh). Congested shares (±10
points) miss on SE4→LT in 2023 (72 against 56 %) and nowhere else: LitPol is at its limit towards
Poland in 39, 24 and 49 % of the hours of 2023, 2024 and 2025 against 43, 31 and 52 observed, and
towards Lithuania in 27, 31 and 31 % against 22, 30 and 30; LV–LT parts its two prices in 4 % of the
hours of 2025 against 2 in the record, where it did in 14 % with the allocation taken off — observed
against the clearing price, as NordBalt's and EstLink's are against their hubs' (D-075). FI→EE
holds in every year (56, 65 and 63 % against 54, 64 and 65). A link held at a limit of 0 with nothing
flowing counts as congested the way the prices pull, towards the dearer zone, and with equal prices
not at all (D-135, accepted with D-136). With the one bid on the net basis (D-171) the net flows miss on EE–LV, LV–LT
and LT–PL in 2023 (LT–PL 0.08 against 0.47 TWh), on EE–LV and LV–LT in 2024 (0.50 against 0.96 and −0.65 against
−0.38) and on LV–LT and LT–PL in 2025 (0.17 against 0.29 and 0.29 against 0.35), SE4→LT's congested share in 2023
(72 against 56 %); on the gross price of D-164 0.06, 0.52 and −0.68, 0.13 and 0.28.
7, 8 and 11 breaches in 2023, 2024 and 2025 (`data/derived/validation/<year>.json`, `failures`; 8, 5 and 8 on
D-115's register, 8, 7 and 9 before D-115, 8, 5 and 9
with oil shale's start on its installed megawatts, as D-113 was proposed; 11, 9 and 15 before D-112 and D-113, 9, 8 and 16 before D-109, 9, 10 and 15 before D-106, 9, 10 and 14 before D-077, 6, 15 and
14 before D-076, 6, 14 and
17 on D-073's register with the zone prices, 9, 15 and 20 on the register of D-042 and D-044, 14,
18 and 17 on M3's).

What is left sits in the dear hours, and less of it than the bins of the record's price say. With the one bid the
upper tail is shorter still: Latvia's hours at or above 250 €/MWh are 38 / 121 / 105 in 2023–2025 against 48 / 146 / 197 on
D-115's register and the record's 105 / 218 / 251. In
the hours the market cleared above 250 €/MWh — 99, 211 and 247 hours of 2023, 2024 and 2025, most
of them in the morning and evening ramps — the model is 90–135 €/MWh below the record with the one bid on the
net basis (Lithuania, averages per price bin; 89–134 on the gross price of D-164, 80–114 on D-115's register, 77–112 before D-115, 76–110 as D-113 was proposed,
79–117 before D-112 and D-113, 92–132 before D-076), and between 150 and 250 €/MWh 8–26 below (7–25 on D-164,
6–19 on D-115's register, 5–21 before D-115, 7–22 before D-112 and D-113); below 60 €/MWh it is at most 9 above
(7 on D-164, 9 on D-115's
register, 1–11 before D-115; `spikes/validation-round2/exp.ts bins`). The analyses of the rest of this paragraph
are D-115's register's.
Hours chosen by the record's price carry the record's surprises: a model right on average given its
own price, with this model's noise, shows −71 to −94 €/MWh in the same hours above 250 (−59 to −111
on D-114's register; `spikes/dear-hours/tail.ts`, the record replaced by the model plus residuals
drawn within its price deciles; ERRATA E-144). Chosen by the model's own price, its dearest hours
are right on average in 2023 (+3.9 €/MWh in Lithuania's 50 hours above 250; +36.6 before D-115),
33 too low in 2024's (−32.9; −33.2) and 43 too high in 2025's (+42.8; +49.5), where it finds 107 of
the record's 252 dearest hours: 2024's gap is one of level, 2023's and 2025's of timing. The upper
tail moves with D-115: Lithuania's 99th percentile 224 / 289 / 306 €/MWh in 2023–2025 against 244 /
256 / 293 before and 250 / 300 / 313 recorded. Kruonis, scheduled before D-115 as a price-taker at
one cost, set Lithuania's price in 93 of 2025's 247 hours above 250 (219 €/MWh against 356
recorded); in steps of its power it gives them 126 / 205 / 121 MW in 2023–2025, against 184 / 224
/ 142 recorded and 240 / 310 / 197 at one cost (§7.1; D-115).
The TSOs' day-ahead forecasts do not explain the timing: in the record's hours above 250 the Baltic
residual load was forecast 8, 64 and 92 MW below the outturn in 2023–2025, and replays on the
forecasts fit the fit years worse (the research log of 2026-10-11). A short-run-cost merit order
with observed availability has no scarcity or strategic bidding above cost beyond the markup and
Kruonis's step; until D-112 and D-113 it had no unit commitment either, and its storage saw
the whole week: where Kruonis or the Daugava ran
part-loaded the programme held the price at their water value — in Lithuania's hours of 2025 at or below 60 €/MWh, 32 €/MWh where Kruonis
pumps part-loaded and 70 where the Daugava does, against 17 and 31 in the market
(`spikes/validation-round2/setter.ts`, measured before D-076). v4 reached 12.1 / 13.2 / 12.8 €/MWh in 2023, 17.3 / 17.6 / 17.6 in 2024 and 20.7 /
18.9 / 18.5 in 2025, with an observed daily committed minimum and scarcity steps among its inputs
(v4 `docs/CALIBRATION_2025.md`, "Result"): this model is now ahead of v4 in every zone of every
year — by 2.9–4.2 €/MWh in 2023, 5.5–6.8 in 2024 and 1.7–2.9 in the blind year with the one bid on the
net basis (1.6–2.8 in the blind year on the gross price of D-164; 2.9–4.4,
6.3–7.2 and 1.7–2.6 on D-115's register; 6.2–7.0 and 1.9–2.7 before D-130; 2.5–4.0, 5.8–6.5 and 0.9–2.0 on D-114's
register) — without them. v3's published
fit, 8–12 €/MWh in 2023–2025, comes from a replay that anchors each neighbour's supply on the hour's
observed Baltic price and flow, and from 2025 as its calibration year (SPECIFICATION §5). Run on
the same years without the anchor, v3's error is 26–32 €/MWh, and 36–80 in 2020–2022, where this
model's is 15–22 with the one bid on the net basis (16–22 on the gross price of D-164, 14–22 on D-115's register;
`docs/research/2026-10-18_v3_v5_accuracy.md`).
The gate returns to the owner (D-073, D-075, D-076, D-077).

### 7.4 The EstLink 2 gate R-VAL-6: met

The replay with the observed A31 capacity against the same year with EstLink 2 in service: inside
the A78 outage windows (2024-01-25 22:00 → 2024-09-03 22:00 and from 2024-12-25 10:00 to 2025-06-19
09:00 UTC, hours rounded to the whole hour) both directions of EE–FI get min(1 016, A31 + 650) MW,
elsewhere the observed A31 (`counterfactual`). Finland's price is the boundary profile, the same in
both runs, so the effect cannot be symmetric. The 2025 column is on D-091's replay, NordBalt closed
on 30 March – 1 April (accepted, D-095; before it 88.7, 49.3, an effect of 39.3, March 37.5, April 22.0
and a spread of 34.9). Before D-109, on D-106's register: 78.1, 58.2 and an effect of 19.9 in 2024,
89.0, 49.4 and 39.7 in 2025; before D-112 and D-113: 79.6, 60.3 and 19.3 in 2024, 91.3, 51.4 and
39.9 in 2025; on D-113 as proposed, oil shale's start on its installed megawatts: 79.5, 59.8 and
19.7 in 2024, 90.6, 51.4 and 39.2 in 2025; on D-114's register, before Kruonis's output in steps
(D-115): 79.3, 59.8 and 19.5 in 2024, 90.4, 51.3 and 39.1 in 2025; on D-115's register before D-130's
solver (D-131): 79.1, 59.6 and 19.5 in 2024, 88.8, 51.2 and 37.6 in 2025, the spreads 38.1 and 37.2; on D-115's
register, before the gas plants' one bid (D-164): 79.4, 59.6 and 19.8 in 2024, 88.8, 51.2 and 37.6 in 2025, the
spreads 38.3 and 37.3, by month Feb 10.1 … Aug 39.1 and Jan 26.2 … May 35.8; with the one bid on the gross price,
before D-171: 79.2, 59.9 and 19.2 in 2024, 86.6, 51.3 and 35.3 in 2025, the spreads 38.3 and 36.1.

| | 2024 (5 486 outage hours) | 2025 (4 065 hours to 19 June) |
|---|---|---|
| EE average price in the outage hours: model / observed | 78.9 / 83.0 | 86.4 / 90.1 |
| … with EstLink 2 in service | 59.8 | 51.3 |
| **Effect, €/MWh** (gate: 15–30 in 2024) | **19.1** | 35.0 |
| Effect by month | Feb 10.3, Mar 4.0, Apr 5.0, May 16.2, Jun 21.1, Jul 32.6, Aug 38.3 | Jan 26.7, Feb 59.4, Mar 33.4, Apr 23.4, May 34.9 |
| FI→EE at its limit, outage hours: model / counterfactual / observed | 72 / 49 / 70 % | 74 / 24 / 71 % |
| FI→EE at its limit, whole year | 65 / 51 / 64 % | 63 / 40 / 66 % |
| EstLink loading FI→EE, outage hours | 76 % | 79 % |
| EE–FI annual spread: model / observed | 38.0 / 41.7 | 35.8 / 39.9 |

*Observed congestion: EE's price above the price at EstLink's Finnish end by more than 0.005
€/MWh — Finland's zone price and, from 2024-10-29, the hub's (D-075; Konkurentsiamet's bottleneck
hours against the zone price: 69.3 % FI→EE in 2024 by its own count).*

The 2024 effect of 19.1 €/MWh on the gas plants' one bid per net MWh (D-171) lies beside Elering's ≈ 18 (+6 %) and
below Eesti Energia's figures: by month Apr–Jun 5.0–21.1 against its +24 €/MWh for Q2, and July 32.6 against its +42
(19.2 with the one bid on the gross price, D-164, by month Apr–Jun 5.1–21.1 and July 32.7; 19.8 on D-115's register, 19.5 before D-130's solver and on D-114's register too, 19.7 on D-113 as proposed, 19.3 before D-112 and D-113, 19.9 before D-109, 24.1 for the year before D-076, 23.3 on the
register of D-042 and D-044, 18.3 on M3's: with Poland's clearing price the Baltic price of the
outage hours of 2024 is 4.2 €/MWh lower, 78.9 against 83.0 observed (3.8 and 79.2 with D-164), and the cable's
absence costs less). The FI→EE share rises by 22 points, from 49.2 % with the cable in service to 71.6 % (the documented rise from 2023 to 2024 is from about
55 to 70 %); EstLink 1 runs near its limit. In 2025 the weekly EE–FI spreads around February
(UTC weeks 4–8 from 1 January, 29 January to 4 March) are 72, 83, 66, 99 and 94 €/MWh against
72, 96, 99, 114 and 83 observed — the order of 100 (72, 83, 66, 103 and 94 with the one bid on the gross price, D-164; 71, 92, 69, 110 and 123 on D-115's register, 74, 105, 71, 115 and 135 before D-115). The week the specification quotes (EE 184 /
FI 84.6 €/MWh) is UTC week 6, 12–18 February (EE 189.8 / FI 91.1 on that axis), the one the model
misses most: Lithuania's gas held at its record's least output (§7.1)
lowers the Baltic price of that week. The annual spread is 35.8 against 39.9 (38.0 against 41.7
in 2024; 36.1 and 38.3 with the one bid on the gross price, D-164; 37.3 and 38.3 on D-115's register, 37.2 and 38.1 before D-130's solver, 37.5 and 38.3 before D-115). `data/derived/validation/estlink2.json`.

### 7.5 2026 and 2020–2022 (R-VAL-1, R-VAL-7; no thresholds)

2026, the second blind year, January–October since October's data came in on 2026-11-11 (PLAN §9's freeze, run
after the talk): MAE 14.9 / 11.5 / 10.7 €/MWh (EE / LV / LT), Estonia's price 6.6 €/MWh too low, Latvia's and
Lithuania's 4.5, since the balancing capacity of October is counted once (ERRATA E-199); 15.8 / 12.5 / 11.8 and 9.3 /
2.7 / 2.9 before it, October's EE–LV capacity cut by some 260 MW from the 7th. Estonia's remaining bias sits in the
hours the model separates Estonia from Latvia and the market did not (674 hours, −39.7 €/MWh; `spikes/ee-bias-2026`). January–September (D-111): 13.7 / 11.2 / 10.6
with the gas plants' one bid (D-164), Estonia's price 7.0 €/MWh too low, Latvia's 4.8 and Lithuania's 5.1; 13.3 /
10.5 / 9.8 with Kruonis's output in steps and the register refitted on it (D-115), the batteries at
Δ = 71.5 €/MWh; 13.3 / 10.9 / 10.2 on the day-ahead clearing and oil shale's market entry (D-112,
D-113, D-114), with the batteries at Δ = 71 €/MWh, the same at one decimal as D-113 was proposed;
13.8 / 10.8 / 10.1 before them, at Δ = 63.5. January–August,
on D-109's register: 13.8 / 10.1 / 9.3, with the batteries at Δ = 69.5 €/MWh (14.1 / 10.3 / 9.2 before D-109, at 67.5, and the same at one decimal at 67, before D-106; 15.1 / 16.3 / 10.7 before D-077, 15.2 / 16.6 / 10.4 before D-076, 14.8 / 16.9 / 12.2 on the register
of D-042 and D-044, 18.6 / 21.9 / 15.9 on M3's). The round of D-073 does not help this year as it
helps 2025: Kruonis's power and the markup's new form lower its sum of MAE by 1.0, the week's
least output raises it by 0.6 (Estonia +0.3); the hub's price of D-075 lowers it by 1.3, nearly
all of it in Lithuania (11.3 → 10.4); Poland's clearing price and the refit of D-076 leave it
where it was (−0.1 in sum; Poland's limit bound in 19 % of these hours). LV–LT at its published
capacity (D-077) is this year's step: Latvia's MAE falls by 6.0 €/MWh, Lithuania's by 1.5 and
Estonia's by 1.0, and the border parts its two prices in 6 % of hours, as in the record, where
it did in 34 % — the balancing allocation the replay took off it averaged 383 MW this year, and
the day-ahead schedule lay above what was left in a quarter of the hours. On D-109's register,
January–August, Latvia's and Lithuania's average prices were 3.3 €/MWh too low and Estonia's 6.7,
EE→LV was at its limit in 43 % of hours against 37 observed and FI→EE in 35 % against 45 (68
against Finland's zone price): Estonian oil shale ran 0.84 TWh against the record's 0.79. Before
D-109 the floor fitted on 2023–2024 held it at 0.92 of the replay's 1.21 TWh, Estonia's price was
11 too low and EE→LV at its limit in 49 % of hours, FI→EE in 26; the hours the replay parted
Estonia from Latvia and the record did not, 17.5 % of them, carried 44 % of Estonia's error, and on
D-109's 14.5 % carried 36 % (E-139, `spikes/ee-split/`). January–September on D-115's register:
Estonia's price is 6.5 €/MWh too low, Latvia's 4.1 and Lithuania's 4.4 (6.1, 3.4 and 3.6 on D-112 to
D-114; 6.6, 4.1 and 4.1 before D-112 and D-113; 5.9, 3.4 and 3.6 as D-113 was proposed), EE→LV is
at its limit in 41 % of hours against 40 observed (43 on D-114's) and FI→EE in 33 % against 44, oil
shale under its entry rule runs 0.94 TWh against the record's 0.89 (0.95 on D-114's, 0.93 before the
entry), and the replay parts Estonia from Latvia where the record does not in 12.6 % of hours (13.1
on D-114's, 14.3 % before D-112 and D-113).
2020–2022 as diagnostics of the fuel-based bids: MAE 15.2 / 16.4 / 16.4 (2020), 15.2 / 16.6 / 15.3 (2021) and
21.9 / 20.2 / 17.3 (2022) with the gas plants' one bid on the record's gas price per net MWh (D-171); 15.9 / 17.2 /
17.2, 15.5 / 16.9 / 15.7 and 21.8 / 20.4 / 17.4 on the gross price of D-164, where 2021 loses 1.3–2.0 €/MWh, its
average already too high and the one bid's lower tranches dearer than the schedule's first (51.25 against 32.5);
16.3 / 17.3 / 17.4
(2020), 14.2 / 15.0 / 13.8 (2021), 21.7 / 19.8 / 17.1 (2022) on D-115's register, whose oil shale under its entry rule runs
1.78, 3.25 and 4.50 TWh against the record's 2.20, 3.72 and 4.15; 17.4 / 18.8 / 18.8, 14.6 / 15.9 /
14.7 and 21.9 / 20.2 / 17.6 on D-112 to D-114 (oil shale 1.80, 3.28 and 4.50 TWh) — 14.9 / 16.2 / 14.9 and 22.0 / 20.3 /
17.7 for 2021 and 2022 as D-113 was proposed, 16.2 / 17.5 / 17.5,
14.2 / 15.4 / 14.2 and 21.5 / 20.4 / 17.4 before them, 15.3 / 16.8 / 16.8, 13.0 / 14.3 / 13.1 and 21.3 / 20.2 / 17.1
before D-109, whose oil shale runs below the record of years in which it ran more (1.85 and 3.25
TWh in 2020 and 2021 against 2.20 and 3.72), 15.1 / 16.6 / 16.6 and 12.9 / 14.1 / 12.9 for 2020 and 2021 before
D-106, 12.8 / 13.9 / 13.9, 11.6 / 12.0 / 10.9 and 22.2 / 33.8 / 32.1
before D-076, 14.8 / 15.2 / 15.3, 12.6 / 13.1 / 12.0 and 23.7 / 34.8 / 33.1
on the register of D-042 and D-044. 2022 gains 14–15 €/MWh in Latvia and Lithuania: from June of
that year Poland's export limit bound in 72 % of hours and LitPol cleared 100 €/MWh above
Poland's price on average. 2020 and 2021, which have no clearing price (the Core publication
starts on 2022-06-09), lose 1–3 €/MWh to the higher markup and 0.4–1.3 more to D-112 to D-114,
and win 0.5–1.4 back with D-115: there the model's average price is 11–16 €/MWh too high with the one
bid on the net basis (12–17 on the gross price of D-164, 10–17 on D-115's register) and FI→EE and SE4→LT sit at their
limits in 71–93 % of hours against 31–46 % observed: until 2022 the
Baltic market also traded across the Russian and Belarusian borders, which the model does not
have (R-LINK-1).

### 7.6 Open items and the golden fixture

- OPEN-2 (PECD correction): decided by the owner — Lithuania's onshore wind at 0.80 of PECD's
  factor in the climate years, interim (D-107; §2). Replays use observed capacity factors, so the
  calibration says nothing about it and does not move.
- OPEN-3 (the mFRR share batteries hold): decided by the owner — share 0 (D-025); Δ at that
  share is 71.5 €/MWh with the gas plants' one bid (D-164) as on the register of D-115, 71 on that of D-112 to D-114 (as on
  D-113's as proposed; 63.5 on D-111's
  data before them, 69.5 on the register of D-109, 67.5 on D-106's, 67 on D-077's, 61 on D-076's, 61.5 on D-073's, 61 on that of D-042 and D-044,
  65.5 on D-025's;
  §7.2). `fit_delta.ts` on the data to 2026-10-31 gives 60.5, not adopted: the register stays on 71.5 until the owner
  decides (§7.2).
- OPEN-4 (Finnish slope): the default, 5 €/MWh per GW, off unless chosen; not re-estimated
  without Nord Pool's curves.
- OPEN-10: Nord Pool's aggregated curves are collected from 2026-10-08, the public days only, with
  Nord Pool's consent (D-108); their history is paid and not bought; the cross-check of the gas bid
  (before D-164 the markup) is not done yet.
- The golden fixture's 2024 replay (both engines) is re-baselined on the calibrated register:
  MAE 32.9 / 35.7 / 35.5 → 20.9 / 23.3 / 22.7 €/MWh, duration-curve RMSE 39.0 / 48.4 / 48.3 →
  24.0 / 27.9 / 26.9, Latvian gas 4.29 → 1.39 TWh (observed 1.60); signed off by the owner
  (R-VAL-8, D-025). Re-baselined again on 2026-10-04, on the register of D-042 (MAE → 15.5 /
  17.3 / 17.3, duration-curve RMSE → 14.7 / 17.1 / 17.4, Latvian gas → 1.07 TWh) and then of
  D-044 (MAE → 14.9 / 16.5 / 16.7, duration-curve RMSE → 12.1 / 15.3 / 16.1, Latvian gas → 1.13
  TWh); signed off by the owner on 2026-10-05 (the tables of D-042 and D-044; D-045).
  Re-baselined once more in the night of 2026-10-05 on the register of D-073 (MAE → 14.2 / 15.7 /
  15.7, duration-curve RMSE → 9.9 / 12.4 / 12.4, Latvian gas → 1.51 TWh) and then with the hub's
  price of D-075 (MAE → 14.1 / 15.6 / 15.5, duration-curve RMSE → 10.1 / 12.6 / 12.6), and in
  the night of 2026-10-06 with Poland's clearing price of D-076 and the register refitted on it
  (MAE → 10.9 / 12.0 / 12.0, duration-curve RMSE → 8.0 / 10.1 / 10.0, Latvian gas → 1.34 TWh);
  D-077 leaves the 2024 replay's figures as they are (its Δ of 67 moves no rounded one);
  all signed off by the owner on 2026-10-06 (R-VAL-8; D-078). Re-baselined in the night of
  2026-10-08 on D-106's register (the same MAE at one decimal, duration-curve RMSE → 7.9 / 10.0 /
  9.9; signed off, D-107) and on 2026-10-10 on D-109's, Estonian oil shale without a fitted floor
  (MAE → 11.1 / 12.2 / 12.1, duration-curve RMSE → 7.7 / 9.8 / 9.8, Estonian oil shale 2.10 → 1.69
  TWh against 1.70 observed); signed off by the owner on 2026-10-10 (D-110). D-111's September
  leaves it as it is. Re-baselined in the night of 2026-10-11 on the engine of record day ahead with
  oil shale entering by the day and the register refitted on them (D-112 and D-113: MAE → 10.9 /
  11.9 / 11.9, duration-curve RMSE → 6.9 / 8.6 / 8.6, Estonian oil shale → 1.75 TWh against 1.70
  observed, counted as cleared, ERRATA E-141), with the synthetic week on the engine of record; and
  on 2026-10-11 with oil shale's start on the megawatts available (D-114: MAE → 10.8 / 11.8 / 11.8,
  duration-curve RMSE → 7.2 / 8.7 / 8.8, Estonian oil shale → 1.77 TWh); signed off by the owner
  on 2026-10-11 (D-114). Re-baselined on 2026-10-11 with Kruonis's output in steps of its power
  and the register refitted on it (D-115: MAE → 10.3 / 11.4 / 11.3, duration-curve RMSE
  → 5.9 / 8.5 / 8.4, Kruonis → 0.18 TWh against 0.57 in A75); signed off by the owner on 2026-10-11
  (D-116). Re-baselined on 2026-10-18 with HiGHS's presolve off and the first clearing's weeks kept
  where the commitment changes nothing (D-130: MAE → 10.1 / 11.3 / 11.2, duration-curve RMSE → 5.8 /
  8.4 / 8.4), the opening view's climate year 2009 pinned the same day; signed off by the owner on
  2026-10-18 (D-131). The same day the two-pass engine's cases went with it (D-132), and the digest
  took the Daugava's water value, its spill and the water it left too, so that every case's hash
  changed and no figure moved (D-133). Again the same day without the arrays the two-pass engine alone
  had used, the price repeated and the stores' empty schedule: re-baselined on the engine before they
  were removed, the removal left the five cases to the bit (D-138). Re-baselined on 2026-10-22 with the gas
  plants' one bid, a combined-cycle plant's cost plus the fitted 51.25 €/MWh in the three zones (D-164: MAE →
  10.5 / 12.1 / 12.0, duration-curve RMSE → 7.9 / 10.8 / 10.6), the four engine cases moving and the synthetic week,
  which builds no gas, keeping its digest; V8 and JavaScriptCore alike, at the owner's decision. Re-baselined
  since on D-169 to D-171's corrections, and the three opening cases on the owner's opening (D-182, D-185) and the
  two of 2 SMR on units of 315 MW (D-189), each with a note in the fixture; D-190 moved none. The three opening cases
  re-baselined again on 2026-10-28 with the neighbours' profiles as published and the owner's levels on them (D-194).

## 8. The application (M4, and §8.1–§8.9 M6–M7 and after; R-APP-1, R-APP-2, R-APP-7, R-APP-9 … R-APP-16, R-UI-1…6, R-NFR-1…4; D-026 to D-028, D-036, D-039, D-040)

A static site (`app/`, Vite and TypeScript, Chart.js and highs-js the only runtime libraries,
R-NFR-6) that computes in the visitor's browser and requests nothing outside itself (R-NFR-1,
`npm run site` checks the built files). `npm run dev` serves it locally; `npm run build` writes
`app/dist/`, with the export under `data/` (D-013) and the fonts under `fonts/`.

**What runs where.** The page loads `presets.json`, `sources.json.gz` and `links.json.gz` and holds the scenario
(`app/src/state/model.ts`). Every change of a control is debounced by 70 ms and starts a new
generation of jobs (`app/src/worker/pool.ts`) on up to eight Web Workers, one less than the
machine's cores (D-114; four until then, D-028, D-095); a phone — a touch screen under 900 px on its
shorter side — on two at the most, about a quarter of a gigabyte each in Safari's engine (D-146). Each year's weeks are shared by all of
them (`runYear`, D-114): every worker clears a part of the year's weeks — where oil shale enters,
answering only the first clearing's price of its zone, which the page joins and sends back for the
second, part k as soon as the first's parts 0 to k are in, on their price up to its own end, since
the commitment decides each day on that day and the day before (`secondPart`, D-128) — and the pool
gives a freed worker its next job only once the answer's own continuation has queued what follows
it — and one worker then puts the year together (`split.ts`) and makes what the page shows
(`view.ts`): per zone the card figures, the hourly price, the day-by-day generation by group
against consumption and the mix. A worker (`engine.worker.ts`) fetches a year file once and keeps
it and builds the problem from the page's state (`engineScenario`) for each job. What a job does is `job.ts`, which Node's workers run
too (`scripts/lp_worker.ts`), so that the bench and the build compute as the page does (D-128,
ERRATA E-151; `test/worker.test.ts` finds the pool's year the whole year's to the bit). A
progress line appears when a run takes longer than 300 ms (R-ENG-7). When the headline set is in,
the standard sensitivities run on the same years at a lower priority (R-APP-11; five until D-183, since D-184 the
owner's four price pairs for each of the scenarios — three since D-343, four until then — the one shown first); any change
of a control drops the queued jobs and discards the results of those still running. Nothing is
computed by the two-pass engine (D-026; removed since, D-132). Measured in the browser on the development machine
before D-112 (eight cores, four workers; the times since are in §11): 0.8–1.1 s for a replay year, 1.7–2.0 s for the three climate years of
a set, and the twelve sensitivity runs 5.3 s after that (R-ENG-7: ≤ 2 s a year, ≤ 6 s a set).

**The scenario shown first (R-ENG-7, revision 2.16, D-127).** A change of a control computes the
scenarios in `scenarioOrder` (`ui/wiring.ts`): the one shown, 0 SMR — against which
the table gives its differences — and the rest, at the pool's priorities 0, ¼ and ½ (and ¾ while there were four,
until D-343), so
that each scenario's years finish before the next one's while the next one's first clearings fill
the workers' gaps (`pool.test`). The scenario shown is drawn as soon as its years are in (`runTrio`
in `main.ts`): its cards and charts (its contract card too until D-294), its sensitivities said to be computing; each
other scenario then fills its columns of the table, whose cells said "computing…" until it came,
and only the table is redrawn. The banner dims the results as the previous settings' until the
scenario shown is in, and then counts the years of the others still to come. The sensitivities
run when the table is in, as before: started with the scenario shown, they took the gaps the
table's last scenario left and delayed it by about a second, with nothing gained at their own end.
A scenario shown while the run computes is drawn at once if it is in, else when it comes; the
order changes when jobs run, not what they compute, so no figure moves.

**Results computed before (R-ENG-7, revision 2.15, D-126; revision 2.17, D-129).** The opening view does not wait for a
run. `make deploy` computes it after the build (`app/scripts/opening.ts`): the scenarios' sets (three since D-343)
of the opening state and the shown scenario's sensitivities (five until D-183, the owner's four price pairs since), each climate year built and
cleared whole by the engine of record — `split.test.ts` proves the workers' parts the same — and
assembled by the worker's own code (`app/src/worker/assemble.ts`). Since D-129 the same run, on
Node workers through the page's job handler (`job.ts`), also computes the states the presentation
of 10 November shows: the opening state's sensitivities for each other scenario shown, and the
neighbours' two tight profiles with their scenarios and each one's sensitivities, one file
each in `data/sets/`, listed by the page's own id in `data/sets.json.gz` and fetched when first
shown. Since D-177 it also computes the presentation's blocks of Global Ambition 2035 and National Trends 2040,
since D-184 the four price pairs for every scenario, and since D-221 the two outage trios of the opening state the deck's
cables' slide shows: 220 years in about 110 s on seven workers, 51 files, 28.6 MB against a cap of 35 MB (2026-11-09; 196
years, 49 files and 25.8 MB on 2026-11-08; 29.9 MB on 2026-10-27; 216 years in about 1.5 minutes, 58 files, 28.6 MB on 2026-10-23; 180
years in about 2.6 minutes, 47 files and 23.8 MB at D-129; since D-236, as packs, 223 years, 54 files and 18.2 MB;
since D-253, with the replay of 2026, 224 years and 55 files by the script's own list, the megabytes not measured again).
It writes `data/opening.bin.gz` (`opening.json.gz` until D-236)
with the bundle's commit, the id of the sources that compute a set (D-237), the export's hash and the run's
settings (`runKey`: the scenario shown and
the strike move no dispatch); typed arrays keep their types and every number its value
(`app/src/data/stored.ts`). Since D-144 this run, like every run of the engine in Node — the tests,
golden, validate, the fit — goes with `--no-maglev`: Node 26.4's mid-tier compiler computed a year
wrong now and then under load, and the browsers' engines did not
(`docs/research/2026-10-19_maglev_hazard.md`). The page shows the file when the engine id (the commit until D-237) and
the settings are its own and says so in the status line. Until D-232 a set the browser computed was kept in its
IndexedDB under the commit, the export's hash and the settings — the newest twelve tables of four scenarios and
twenty-four sensitivity sets, apart, since D-128 — and a development build kept none; what is kept since is the next
paragraph's. While a view computed before is shown, each worker loads the solver
and the years' files at the lowest priority, so that the first change does not wait for them
(D-128), and since D-146 clears the first year's first week and drops it, so that it does not wait
for the compilers either: Safari's first change took 2.5 s to the scenario shown instead of 3.8. The file is written by every deploy, so it cannot outlive
its code; anything amiss — no file, other sources, storage refused — reads as not computed, and the
page computes. Since D-134 the page keeps sets by what each computes from (`jobKey`), its twenty-four latest until
D-232: the settings less what leaves the engine's input as it is — the strike; the plant's clause
in 0 SMR, which has no plant; a sensitivity's gas floor at or under the scenario's gas price —
so that a set a change leaves as it was is taken and not computed again. Turning the clause on with 2
SMR shown computes nine years of the table instead of twelve and, since D-184, thirty-six sensitivity years
instead of forty-eight (twelve instead of twenty-four when measured, on the sensitivities of that day: in a
headless Chrome on the development machine, seven workers, the table took 3.5–3.7 s and the sensitivities
8.1–8.4 s, against 4.9 s and 14.4 s for a change of Finland's level; ERRATA E-190).
With D-112 and D-113 a year costs two to three times the solving it did, and with a year to a
worker a validation year took 2.4–2.8 s and the opening view's twelve years 15.7–16.4 s (about 9
before them).
With each year's weeks on every worker (D-114), on the built site on 2026-10-11 (eight cores, seven
workers, the files cached): 0.7 s for a validation year and 11.3 s for the opening view's twelve
years. The opening view is bound by the solving itself — about 60 s on one thread — and six
concurrent solvers saturate this machine: the bench gives 17.1 s on four workers and 13.6 on seven
with Kruonis's output in steps (D-115), 16.9 and 12.7–13.2 s on six to eight before (§5.5).

**What the page keeps (R-ENG-7, revision 2.76; D-232 … D-237, signed 2026-11-10;
`docs/research/2026-11-10_page_speed.md`).** One store for every set the page shows, by what the set computes from
(`jobKey`): the page's memory — the sets last used, up to 96 MB of their arrays, 32 MB on a phone — then the browser's
IndexedDB, each set with when it was last used, the longest unused dropped beyond 192 MB, then the build's files, and
only then the engine. The store spares a computation and never holds one up: nobody waits for it longer
than 1.5 s (ERRATA E-191); one that opens later than that is used from then on, one whose request has not answered
is done without for the life of the page (ERRATA E-192). The deck's outages and replays and a validation run's year go through
it as the table and the sensitivities do (D-232), and as the Presentation page's blocks did until D-249 took the page out. A set is kept, and the build's sets are read, under the *engine id* in the commit's place: a hash
of every source under `src/contract`, `src/data`, `src/engine`, `src/state` and `src/worker`, of the
scenario schema and of the solver's pinned version (`app/scripts/engine_id.ts`), so that an edit to the interface keeps
what was computed and the development server keeps its sets, loading the page again under a new id when one of those
sources changes; `test/engine_id.test.ts` finds every import of the worker, the pool, the store and the job's key among
the id's files, and `?nostore` in the address keeps and reads nothing (D-237). The build writes its sets as packs — a
JSON header and the typed arrays' own bytes, gzipped: `data/opening.bin.gz`, `data/sets/<hash>.bin.gz`, a set's file named
by a hash of the engine id, the export's hash and the set's id (D-238) — which the page
reads in milliseconds where the JSON text took 0.4 s of the main thread for the opening view (D-236; 18.2 MB of sets
against 29.0). While another page than the Model view is shown, the sensitivities wait behind that page's own sets
(D-233); the Presentation page, taken out by D-249, drew again only the block whose sets changed (D-235). Measured before and
after: a value two changes back 24 s and 0.2 s; the Presentation page on a changed state it has seen 16–18 s and
0.5 s, and whole after a control moved on it 49–55 s and 18–20 s; the opening view's cards 0.6 s and 0.3 s after the
navigation; the development server's second load 35–39 s and 0.7 s. A state never seen is computed as before.

**The set and its weights (R-TIME-3, R-TIME-4).** A replay is its year alone. A TYNDP 2024 scenario
runs on the climate years 1995, 2008 and 2009 with the Implementation Guidelines' weights
(National Trends only on 2009, D-007); a TYNDP 2026 scenario on the three weather scenarios of its
target year with their weights. Cards show the weighted figures; a "?" beside the table of the weather
years lists each year's weight and Estonia's wind, solar and demand-peak ranks among the 38 PECD years (`setNote`; the
header's line of a scenario is gone since D-224).

**Opening state (R-BND-5, R-PUB-3; D-011, D-027).** TYNDP 2024 Distributed Energy 2035 at the
borders; ERAA 2025 National Trends 2035 fleets in all three zones; demand from Elering's plan
2026–2035 in Estonia and from ERAA 2025 in Latvia and Lithuania, electrolysis taken out and off;
ERAA's DSR bands and fuel path; batteries at the fit of D-025; no plant. *Specification revision
1.6 (D-036) replaced it with Elering: gas, named *Gas & RES* and then *0 SMR* on 2026-10-21 (§8.1, D-151).*

**The scenario's text and the share link (R-APP-1, R-APP-10; D-027, D-032, D-036).** `v=3`, then one `key=value`
line per entry, keys sorted, every default written out (so a later change of a preset does not
change what a text means): the run kind, family, target year, profile, fuel path and DSR preset;
per zone the demand preset, multiplier, firm block, fleet preset, every class's MW, the battery
energy, electrolysis and power-to-heat; the level factors, the Finnish slope, the battery and
reserve parameters; the borders' profile, Litgrid's plan, the balancing reservation, the planned
lines and a what-if per line (§9); the scenario shown and the plant's contract (§8.1). A replay
carries only the keys a replay uses. Version 2 added the borders' keys, version 3 the scenario and
the contract; an older text opens with them at their defaults (a version-1 text with ERAA's planned
lines, D-031), and a scenario of another target year than 2035 no longer opens. The panel shows the text, folded at its
foot in a scenario and a replay alike, with `*` after each value that differs from its preset; the address bar carries it as `#s=` and base64url
of its UTF-8. Import is strict (`app/src/state/text.ts`): an unknown key, a value outside its
range in `schema/scenario.schema.json`, a preset or class `presets.json` does not have, a key twice
or a missing one — each rejects the text, and the page says why and opens on its default.

**The panel (R-APP-1, R-UI-6).** As M4 built it, in v4's order: the run (scenario or replay — on the page
"Validation", the owner's wording of 2026-09-29, while the scenario text keeps `run=replay`;
family, target year, profile), the country switcher (EE, LV, LT modelled; FI, SE4, PL the borders' prices), demand
(preset chips, multiplier, firm block), fleet (preset chips; one slider per class with the bid it
implies at the fuel path, `impliedBid`), flexibility (electrolysis, power-to-heat), fuel and CO₂
path with DSR bands — in the scenario view the CO₂ and the gas price as two boxes to type, opening
at the path's values (D-064), the gas price's box named LNG since D-224 —, batteries and reserve, links (the borders' lines, their switches and what-ifs,
§9), and the text. The panel as it stands (`panelHtml`) has no chips of family, target year or presets and no control of
flexibility, the fuel path or the DSR bands: in the scenario view these keep their defaults and stay in the text (§8.1,
D-036). The scenario view holds the scenario, the neighbours' prices, the CO₂ and gas prices, generation and demand with
the zone's switch, the links and the text; the validation view the observed year, the switcher of the six countries, the
zone's or the border's box, batteries and reserve, the links and the text. Every slider shows its preset value as
a tick, sticks to it within 2 % of its range and turns amber when moved off it; an *i* button
lists the sources of a default or preset value (`sources.json`). Official presets came first and the
owner's were labelled and dashed while the panel had preset chips (R-PUB-3); the owner's opening values are named as
the owner's in a line under their sliders (D-182, D-231). A replay keeps the observed fleet and lists it per
country — each class's capacity, its average bid over the year and its generation (D-029). Under
the demand multiplier the year's demand in TWh, and under a border's price level factor its
average price, follow the slider as it moves: each run reports its zones' load before the
multiplier and the firm block and its borders' average price before the level factor
(`engine.worker.ts`), weighted over the set as the cards are, and the panel scales them; while a
chip has changed what they depend on, the line waits for the next run. At each capacity slider
of the scenario view, beside the source's name above its number box, a mark gives the class's change from the latest
observed fleet — A68 of 2026 by class, else 2025's; gas and oil shale each as a whole — green up
and red down, the year and the figure in its tooltip; demand's mark is measured from the load of
2025, the latest full year. These are hints no run reads (`growthMark`; D-052, D-057, D-062). While the headline run computes, a line slides under the
header and a chip in the status line's place says so — the previous settings' results until the scenario shown is
in, then the other scenarios still to come — and the results, still the previous settings', are dimmed (D-054; a
line and a chip since D-209, an amber banner until then). The export keeps each fleet preset's source rows, S1's four rows of gas apart (`presets.json`
`fleets.*.rows`, D-055; the box that listed them was removed, D-061). Estonia's generation opens with
the plant: the units, 0 to 3, which choose the scenario shown as the buttons of the run box do (D-058);
choosing a scenario, by either, returns every zone's demand and capacity sliders to the scenario's presets and
keeps the neighbours, fuel, links and storage settings (D-081); while a zone's demand or capacities
differ from the presets, the run box presses *Other* in place of the scenario's button (D-088). A
bid tag, under the pointer, takes the bid apart: fuel over efficiency, CO₂ times tonnes, running costs (D-089).
In a scenario a thermal bid is a box: a bid typed there is kept as its offset to the costs, so it
follows the gas and CO₂ prices; an empty box returns the costs' bid (D-090). The gas plants of the three zones bid
one price, shown once under the gas and CO₂ prices in a box that moves it for all of them, `bid.gas` in the text;
each zone's gas row shows it as a plain tag (D-164). Every
source Elering's mix names has a slider there, the four rows of gas each their own: the peaking class
is their sum, and the scenario text carries moved rows as `EE.part.<row>` (D-059). Since D-204 Estonia's four rows
of oil shale (its three blocks and retort gas) and its four rows of gas fold under a line each, closed until
opened: the line gives the group's megawatts, the sum of its rows, and its change from the reference year, gas's
line its one bid too. Right of each generation
row's number box a tag gives the source's bid at the two prices of the box above (`impliedBid`, the gas plants' one bid for gas;
0 for wind, solar and run-of-river; for batteries the spread they need, D-065). The neighbours' profile
is chosen from one list of every profile held, and each neighbour's level ends in a box with the
average price it makes; Estonia's run-of-river hydro stops at the preset's 8 MW (D-066). Latvia's and
Lithuania's boxes have the same form: a slider for every source of ERAA's preset, each class one
slider (D-069). The capacity box opens with demand — the
multiplier, shown and typed as the year's TWh, and a constant load in MW (the firm block of R-DEM-4,
for data centres and the like) — then generation; each of its sliders ends in a number box (D-056).

**Results (R-APP-1, R-APP-2).** A card per zone — folded to the average price and the trade balance
until one button opens all three (D-029) —, the model's figures and, in a replay, the replayed
year's beside them (D-029; a scenario run shows the model alone, with no actual year in its cards
or in its energy mix: scenario planning has no actual, D-080): average and median price; import and
export in TWh and at the zone's price in M€ (actual: the scheduled exchanges, ENTSO-E A09) and
their balance, export less import, green when positive and red when negative, each on a light fill of its own since
D-197; hours with a border
at its limit, CO₂, wind and solar curtailed and unserved energy (model only: no record). Since D-224 the trade rows
say what they count: electricity import, import cost, export, export revenue, balance and trade balance. A replay
adds its year's metrics of §9 (hourly MAE, duration-curve RMSE, hours at or above 150 €/MWh). What
differs from the presets was listed above the cards until D-224 took the list off the page (the panel's amber marks, the
scenario text and the export carry it); a Finnish slope marks the run a sensitivity
(R-BND-6, ERRATA E-041). The charts, for the year and zone chosen: generation by week against
consumption and the net import, across the page — each week's average day a column of the groups (by day until D-197), the
net import hatched on top up to the consumption, a week of export left as the generation above the line, or, the chart's
switch off, a dashed line; the energy mix — in a scenario a bar per zone across the page, its net import hatched and its
generation, TWh, and CO₂, Mt, of the year shown written after its end (D-197; a doughnut per zone until then, D-097,
D-098), in a replay the three zones' stacked bars, model beside actual; the price duration curve (the set's years, each
climate year in a colour of its own — 1995, 2008 and 2009 the same colours on every page that draws them as series,
D-197 — or model and actual in a replay; the axis stops above the 99th percentile, the title says where, and, in a
replay or a set of one year, how many hours of each line lie beyond); in a scenario the monthly average price or, at a
switch on the chart's title line, the monthly median as bars, each month's figure over its bar and the axis the same for
both, so that the switch moves only the bars (D-202; the median as points over the average's bars until then, D-197),
and in a replay the monthly average and the monthly median price each on its own chart with the actual line (R-APP-2),
the higher of a month's two points labelled above and the lower below.

**The standard sensitivities (R-APP-11; D-183, D-184, D-186 to D-188, D-192, D-195).** Since D-183 they are the
owner's four price pairs of LNG and CO₂ — LNG 30 / 45 / 60 / 75 €/MWh thermal, per MWh of net calorific value
(D-192), with CO₂ 80 / 95 / 120 / 150 €/t — each the scenario at one pair, everything else the headline's, the
neighbours' prices too (their profiles as published since D-194). Since D-195 they are one table, the owner's: a
column per pair under its LNG, CO₂ and the gas plants' one bid at it, 127 / 159 / 195 / 233 €/MWh (D-186, D-187);
Estonia's average price without the plant and with one or two units (three too until D-343), named by their output
in a year (2.7 / 5.3 TWh); under each, the share of the year in which a gas plant of Estonia, Latvia or Lithuania set Estonia's price
(`fossil.gas`, the gas plants' part of the hours of §10 whose price a Baltic fossil plant set); and for the units
the gain from the lower price, the contract for difference and the consumers' net gain (D-188, §10). At the opening:

| | (1) | (2) | (3) | (4) |
|---|---|---|---|---|
| *0 SMR*, €/MWh | 93.1 | 101.0 | 108.4 | 114.3 |
| a Baltic gas plant sets the price, % of the year | 20.3 | 18.4 | 11.2 | 8.2 |
| one unit, €/MWh | 87.1 | 92.8 | 98.2 | 102.3 |
| two units | 80.8 | 83.9 | 87.5 | 90.1 |
| the consumers' net gain, one / two units, M€ a year | +64 / +98 | +107 / +172 | +145 / +236 | +176 / +288 |

The table is the opening's since D-343 and D-344 (2026-11-27): Finland at 80 €/MWh, no row of three units. With
Finland at 75 it read 90.7 / 98.9 / 106.3 / 112.5 without the plant, 84.1 / 90.0 / 95.3 / 99.6 with one unit, 77.2 /
80.5 / 84.0 / 86.7 with two and 71.2 / 72.8 / 74.1 / 75.1 with three, the net gain +64 / +94 / +82, +106 / +168 /
+171, +145 / +233 / +253 and +179 / +288 / +322 M€ a year for one, two and three units.

With the neighbours' profiles as published the pairs move Estonia's price less than they did when the neighbours
followed them (73.4 / 92.5 / 107.2 / 121.4 €/MWh without the plant on the re-priced profile, D-183 to D-193), and
the net gain is positive at every pair. Until D-195 each pair was a card with Estonia's average price in the four
scenarios beside its change against the same scenario's headline, its name carrying the bid and its "i" what the
pair changed (D-184, D-186, D-187), and a table under the cards gave the net gain or cost, on the re-priced profile
from −53 M€ a year (three units at the cheapest pair) to +398 (three at the dearest).

Until D-183 the five standard sensitivities were shown as the change of
each zone's weighted average price (R-APP-11); an "i" beside each listed what it changed against the
scenario shown, from the two states (D-086). In (a) and (b) Poland's average was held at least at
Svenska kraftnät's lowest 2040 price, 77.8 €/MWh (ERRATA E-149, approved, D-124); in (d) a profile
re-priced to the scenario's gas followed the shock's gas (ERRATA E-150), and since D-171 the shock was the record's
month put on the scenario's net basis (75.3 €/MWh per gross MWh, a floor of 83.7). On *0 SMR* of D-169 to D-171's
opening the four moved EE / LV / LT by +2.5 / +6.5 / +5.5, +1.5 / +1.5 / +1.5, −0.2 / −0.3 / −0.3 and +23.4 / +27.2 /
+27.3 €/MWh (D-169 to D-171; with the gas plants' one bid of D-164 +2.7 / +6.8 / +5.8, +1.5 / +1.6 / +1.6,
−0.3 / −0.5 / −0.5 and +19.2 / +22.0 / +22.1; +2.6 / +6.7 / +5.8, +1.4 / +1.6 / +1.6, −0.2 / −0.3 / −0.3 and
+20.3 / +22.7 / +22.7 on D-115's register; +13.7 / +23.1 / +22.3 and +12.4 / +18.1 / +18.2 in (a) and (b) with
Poland ×1.4 on that register, not computed again). Since revision 2.20 a fifth, (e), set the CO₂ price to the EU
allowance's average in 2026's EEX auctions, 78.1 €/t to 9 October against ERAA 2025's 197.5, the re-priced
profiles following it (D-140). It moved *0 SMR* by −20.1 / −19.6 / −19.6 €/MWh and *2 SMR* by −15.9 / −18.4 /
−18.4 (D-169 to D-171; −20.5 / −19.9 / −19.9 and −16.2 / −18.3 / −18.4 with the one bid of D-164; −21.5 / −20.3 /
−20.3 and −16.4 / −18.4 / −18.5 on D-115's register, −17.1 / −18.6 / −18.6 for *2 SMR* before D-151), so the plant's
effect in Estonia was −13.1 where the headline's was −17.4 (−14.0 and −18.3 with the one bid of D-164; −13.1 and
−18.2 on D-115's register). On the owner's opening CO₂ at 78.1 €/t alone gives 93.7 and 78.1 €/MWh with no and two
units, the plant's effect −15.6 against the headline's −22.1 (81.2 and 65.3, −15.9 against −21.4, on the re-priced
profile before D-194; `spikes/presentation-2026-11/figures.ts`, the talk's slide L5).

**Design (R-UI-1 … R-UI-5).** One theme on custom properties (`app/src/ui/theme.css`), the light one since D-196
(until then dark by default with v4's tokens, light on the system's preference or the toggle), print the same on
white surfaces. Since D-197 it has the look of Fermi's projects, the owner's choice of 2026-11-02: white cards on a
pale ground, navy headings, an indigo accent whose tint marks the view shown, the validation's state on an amber
plate with its warning sign until D-201 took that banner off the pages, a sign's colour on a light fill of its own; the wordmark is Montserrat ExtraBold's
outlines with a tile of Fermi's green (energiamudel.ee stays a neutral site: no Fermi logo). Montserrat sets text
and numbers, tabular figures for the numbers, self-hosted with its licence (D-DIN and JetBrains Mono until D-197);
the panel's sources carry glyphs after Lucide (ISC): generation's in the accent, demand's in the
ink (D-060, D-063).
Colour carries sign and state, and — the owner's choice (D-029, ERRATA E-043) — the identity of
a generation group, the same on the screen and in print: since D-197 a palette checked with the dataviz palette
validator on white, colour-blind separation of neighbouring layers 9.1 and normal vision 19.6 (v3's technology
colours as on energiamudel.ee until then, D-053, whose checks were not rerun); legends list the groups top of the
stack first; flags stand beside the country codes. Since D-197 off the Model view the panel's boxes fold to their
headings, the run's box open, a chevron opening each; since D-198 a slider is a thin track with a knob, the preset
where it snaps a red dashed line, and a source's number and bid stand in boxes above its slider, as low as the
neighbours' price boxes since D-203; every figure's unit stands in its cell; a calibration's breach
is on a light red fill and its pass on a green one. Every text colour reaches 4.5:1 on every surface, on the screen and in print (`app/test/theme.test.ts`);
every control has an accessible name (`app/test/panel.test.ts`); focus is always visible. Desktop
only, from 960 px (R-UI-3): a phone shows the desktop page zoomed out (D-149, which drops the phone's
one-column layout of D-143).

### 8.1 The scenario view (specification revision 1.6; DECISIONS D-036)

The owner narrowed the scenario view to the question v5 exists for. A scenario is of 2035 and comes
in four (three until D-058 added *1 SMR*), computed together on the same settings — twelve runs on
the three climate years, 5.8 s in the browser on the development machine (nine runs took 5.4 s):

- *0 SMR* — Estonia's fleet and demand of Elering and TalTech's base scenario S1 (*Eesti
  baasvaade ja kümme analüüsitavat stsenaariumit aastani 2050*, version of 24.09.2026 agreed with
  Elering, public consultation to 2026-10-12; `scenarios.csv` preset `elering_taltech_s1_2035`):
  onshore wind 1 244, solar 1 785 (the opening takes the owner's 1 300 and 2 500 in their place, D-182, its
  preset for Estonia in 2035; the sliders' note gives S1's), batteries 1 500 MW (2 h, R-STO-1), biomass 152, waste 17,
  run-of-river 8, oil shale 270 MW (Auvere), demand 11.6 TWh; its four rows of natural gas —
  existing 263 (S1 names no plant; it is Kiisa's 250 MW, which Elering's security-of-supply report
  of 2025 counts for 2035, Table 2.4, and the 13.5 MW of gas ENTSO-E A68 gives Estonia in 2025–2026,
  Kiisa being outside A68 as a reserve — 263.5; D-104), reserve procurement 186, the distributed
  restoration tender 900 and the future capacity mechanism 15 MW — as 1 364 MW of the peaking class, in the market (the class map's rules
  `gas_existing`, `gas_reserve_procurement`, `gas_restoration`, `capacity_mechanism`). S1 enters the
  tender and the mechanism "simply as gas plants"; ERR's report of the tender (2026-04-23) describes
  a restoration service paid outside the market, so this gives the gas its largest market role, the
  cautious side for the plant. Latvia's and Lithuania's fleets and demand are ERAA 2025 National
  Trends 2035's, less its offshore wind — 1 000 MW in Latvia, 1 400 in Lithuania — which the owner
  leaves out of every scenario of the two (D-105); Lithuania's onshore wind runs at 0.80 of PECD's
  capacity factor (D-107, §2).
- *1 SMR*, *2 SMR* — the same with one or two units of 315 MW added (300 MW until D-189; R-SMR-1; one unit
  since D-058; *3 SMR*, three units, was the fourth scenario until the owner took it out, D-343): the scenarios share one base, S1 with all its gas, and differ only in their units (D-151;
  from D-036 to D-151 each unit replaced 300 MW of the Estonian peaking gas, leaving 1 064, 764 and
  464 MW of it, which raised Estonia's average by 0.6–0.7 €/MWh against the units on top); the plant
  runs as in M2 (R-SMR-2, R-SMR-4).

The panel holds the scenario; the neighbours' profile — TYNDP 2024 Distributed Energy 2035 or
Global Ambition 2035 on the climate years, or TYNDP 2026 National Trends+ 2035, which also brings
that family's weather scenarios and its own Baltic demand (R-TIME-2), or any other
profile the year files hold, all of them in one list since D-066 (through *Other* until then, D-046: Distributed Energy and Global Ambition 2035, 2040 and 2050;
National Trends 2030 and 2040, on climate year 2009 alone; National Trends+ 2035, 2040 and 2050 on
that year's weather scenarios; each named with its weighted average price in Finland, SE4 and
Poland, `boundary.mean_price`, D-047; since D-225 in the open list only, the closed list naming the profile by its maker,
name and year, "TYNDP 2024 · Distributed Energy 2035") — with a level factor per
boundary zone and the average price it gives: the owner's ×2.0038 / ×1.9607 / ×2.0982 on Distributed Energy 2035,
80 / 90 / 120 €/MWh on the profile as published (D-182, D-185, D-194, D-344; Finland ×1.8786 for 75 until D-344;
×1.4783 / ×1.4943 / ×1.5276 on the re-priced profile before D-194), ×1 on every other profile, a level carried over between profiles by its share (D-190); the
factor runs from ×0.5 to ×3, and since D-226 each level's slider marks and snaps at its profile's default level, against
which a level counts as changed; the factor on the profile as published stands beside each level's box. A profile of another year changes the neighbours'
prices and, for National Trends+, the weather; the Baltic fleets, demand, fuel prices and lines
stay those of 2035 (`withProfile`, `state/model.ts`), so such a run answers "the Baltic of 2035
beside the neighbours of 2040", not "2040". The list also holds the neighbours' *actual prices of
2025* (D-051): Finland's, SE4's and Poland's observed prices of 2025 as the 2025 replay takes
them — each zone's price at its end of the cable (D-075, D-076) — hour by hour, as `REAL_2025` in
each climate-year file (`export/years.py`, `REAL_YEARS`): the same series in the three climate
years, begun at 2025's first Monday as the layout's year begins on one, so that its weekends fall
on the layout's and 1–5 January close the year (D-100, accepted D-104). It is the one profile that is not weather-coherent with the Baltic side
(D3, R-TIME-2): a calm Baltic hour of climate year 2009 meets whatever the neighbours' price was
in that hour of 2025, so the link between Baltic wind and the neighbours' prices, which a TYNDP
profile carries, is lost; it gives a level and a shape that happened, to hold a scenario
against. The list also holds two profiles of 2035 from energiamudel's own research on the
neighbours (D-121): *tight case, each on its own* and *tight case, all at once* (`TIGHT_2035`,
`TIGHTJ_2035`), Finland's, SE4's and Poland's prices when demand comes and the build lags — each
country as its own research found it, or all three short at once and solved together
(`docs/research/2026-10-11_finland_2035.md`, `docs/research/2026-10-12_sweden_poland_2035.md`).
Each is the research's hourly series of its climate year, computed with the gas scenario
(`spikes/neighbours-2035/series.py` → `data/research/neighbours_tight_2035.json.gz` →
`research_price`), weather-coherent with the Baltic side as a TYNDP profile is, and held fixed in
every scenario: a fixed profile cannot see an SMR lowering its neighbours' prices through the
cables, so with the plant it overstates Estonia's price (Sweden and Poland §8). They keep ERAA
2025's fuel prices of 2035 and are not re-priced (D-072). They are conditional cases, not
forecasts. National Trends+ 2030 is not in the list (D-050): its
weather scenarios hold no offshore wind series, which Latvia's and Lithuania's fleets of 2035
needed before D-105 left their offshore wind out. Then the fuel and CO₂ path; per core zone the capacity of
onshore wind, offshore wind, solar, batteries and its gas class (and oil shale in Estonia), each
with its source, the battery energy following its power at the preset's hours, and the demand
multiplier with the year's TWh; the line map with its switches — its land Natural Earth's 1:50m countries since
D-206, with Estonia's islands, which the 1:110m file had not, and the three zones' borders drawn since D-207; a
line in service carries since D-208 a light streak each way along the edges of its cable, none where the reader
asked the system for less motion —
EstLink 3 and the fourth EE–LV line
off by default, as S1 has them from 2040 (the owner, over D-031's ERAA years for this view); the
text, folded. Everything else keeps its default and stays in the text: the family and target year
follow the profile, the DSR bands ERAA's, electrolysis and power-to-heat off, the
batteries' and Kruonis's parameters, the mFRR share and the reserve as fitted (D-025), the cables'
typical profile, Litgrid's plan held, the AC reservation at the 2025 average, the price-taker border.

Results: the scenarios (three since D-343) as one table, a column pair per scenario (its figure with its unit
and the difference to *0 SMR*, a green chip when it falls and a red one when it rises — a lower
price, import, CO₂, curtailment or share of fossil hours is the good way; the chip without the
unit since D-205, as the canvas drew it), the
scenario's button at the head of its pair, the one shown marked, the table as wide as the
results and the row and column under the pointer lit, the cell itself most (D-082) — each weighted over its years — the price of each zone,
Estonia's net import, the CO₂ of the three zones, the wind and solar curtailed, Estonia's hours with
a fossil price and the hours natural gas ran in Estonia in a year (the plant's capture price in their place until
2026-10-21, then on the contract card alone until D-294) — with the difference to *0 SMR* (R-SMR-5, §10), Estonia's rows — its
price, net import, fossil hours and gas hours — in bold since D-199;
a scenario's title shows it without a new run; beneath them each weather year's Estonian price in
the four, and the weighted price in bold since D-212 — the scenario view's Outlook, and the four its Compare (revision 1.7,
D-039) — and the "?" at their title gives each year's weight and labels it (R-TIME-4): a climate year by its ranks among the 38 PECD
years, a TYNDP 2026 weather scenario by its climate model, modelled year and Estonian capacity
factors (`yearLabel`); below, the cards, the sensitivities (since D-195 one table, a column per price pair with Estonia's
average in each scenario and under it the gain from the lower price, the contract and the net gain; a card
per pair from D-184 until then, §8.1 and §10) and the charts of the scenario shown. The
validation view keeps the panel of M4 and M5, its zone box in the scenario's form since D-083: the
observed year's fleet as the scenario's generation rows — icon, installed megawatts on a slider that
does not move, the bid tag the run gave the class, the TWh the model ran under each row.

**Size (R-NFR-4).** JavaScript 1 090 KB and fonts 245 KB in `app/dist` as built on 2026-11-25 — the page's script 641 KB,
the worker's 153 KB, the documents' text 267 KB, the calibration's files the rest; ten Montserrat files — against v3's
2.43 MB plus 30 % (348 KB and 86 KB when first measured); the solver's
WebAssembly (3.5 MB, 1.2 MB compressed) is outside the limit (revision 1.4).

### 8.2 The calibration page (R-APP-7; revision 1.7)

The page's *Calibration* view shows the protocol of §7 as its scripts wrote it: each year's metrics
from `data/derived/validation/<year>.json` (`validate_fit.ts`), the EstLink 2 counterfactual from
`estlink2.json`, the engine against the reference from `gap/gap.json`, and the fitted-parameter
register from `presets.json` (`app/src/ui/calibration.ts`; the files are loaded when the view first
opens). The thresholds and the rule for each figure are one module, `app/src/worker/metrics.ts`
(`THRESHOLD`, `within`), which `validate_fit.ts` counts its breaches with, so the page marks with a ✗
exactly the figures the script reports; a test holds the two together year by year. On the
committed files, 26 figures of 2023–2025 lie outside their thresholds (7, 8 and 11; §7.3; 21 — 8, 5 and 8 —
on D-115's register). Since D-322 the view explains itself in words: a paragraph under its title, one above the three
gates and one under each section's heading, in the page's language, with no figure of the data.

### 8.3 The documentation (R-APP-9, R-DOC-4)

*Visit statistics (D-338).* With the reader's consent the page counts visits with Google Analytics 4: a banner
asks once and keeps the answer in the browser; Google's script is loaded only after «agree». Until D-342 advertising
storage and Google signals stayed off; since then the consent covers Google signals — for a reader signed in to
Google who allows it there, Google links the visit to the account and the statistics show age groups, gender and
interests as totals — which needs Google's advertising storage and its consent for user data (with either denied the
tag sends no signals request), and the banner says so; ad personalisation stays off, and the site shows no ads. A reader who agreed to the narrower question is
asked again; one who declined is not. The page view on load is the stream's own, the address without its hash, which Google
drops, so a campaign's `utm_` parameters reach the statistics; a page view then goes for each view shown, its
address cut to the view, the language and the slide. The scenario's text in the hash is never sent, and the
stream counts no history change of its own.
The line under the Documentation view's tabs reopens the choice, and «decline» removes Google's cookies and turns
Google's own switch (`ga-disable-<id>`) on, so that a page whose script is loaded already sends nothing more — consent
mode alone would leave its cookieless pings (ERRATA E-202). Without consent the page calls no third party (R-NFR-1).

The *Documentation* view renders this methodology as the repository holds it — in Estonian
the short summary `docs/methodology_et.md`, the full methodology beside it (D-142); until D-337 the questions and
answers too (`docs/faq.md`, `docs/faq_et.md`), which the owner took out with their tab —
loaded when first shown, with a small Markdown reader for what it uses — headings, paragraphs,
lists, pipe tables, bold, italic, code and links, the text's HTML escaped (`app/src/ui/docs.ts`,
`markdown`; no dependency, R-NFR-6). Its *Sources* view is the register the export generates from
the lineage records (`sources.json`): a row per measured source with its access, use and licence, a
row per cached document, and the owner's assumptions — values the specification or v3's presets
set, as the generated register lists them. Each panel value's *i* button names its source and links
to that row (`sourceRow`: the value's document, else the owner's assumption, else its source
family, else — for a value the pipeline derived — its first input's); a test finds a row for every
source id in `presets.json`. *Since D-197* the documents are pills on a track and each stands in a white card: the long
texts — the summary and the full methodology with its subsections — have a contents rail
beside them, its entries buttons that bring a heading into view without touching the page's address (which carries
the scenario); a list item the text opens with [✓ …] or [✗ …] shows that check's status as a chip, as the summary's
checks do. The Sources view gives each measured source in three columns, its access under its name; the owner's
values as code; the documents grouped by their title's first letter under an index of the letters, with a search box
that keeps the rows holding every word typed — in the page, nothing sent. Since D-334 a line under the view's tabs, on each of them, says that the model's code, data
and documents are open on GitHub and links to the public repository, github.com/andresingerman/energiamudel-baltic
(`REPO`, `app/src/ui/labels.ts`).

### 8.4 Export, print and the declaration (R-APP-10, R-PUB-2, R-PUB-4)

*Export CSV* saves each run's hourly prices of the set shown — a row per hour of each year, the
plant's output beside them in its scenarios — after `#` lines with the code version, the data's
hash, the gate line and the standard sensitivities' average prices (R-APP-11; the four price pairs since
D-183). Since D-201 the gate line is the exports' alone among the page's parts: the banner that stated the validation at
the top of every page is gone, and the Calibration page gives the gates with their verdicts. Both exports
describe the state their results were computed for, not a change still computing. *Export JSON*
saves the scenario and its results in the contract
`schema/results.schema.json`: the canonical text and the lineage ids of the presets it takes; per
run and weighted, each zone's price, trade, CO₂, curtailment, unserved energy and share of hours
with a fossil price, each border's flow, rent and congestion, the plant's output; in the scenario
view the scenarios weighted and the four sensitivities (each one's average price per zone in the scenario
shown and, with the plant, the same pair in *0 SMR*; ids "1" to "4" since ERRATA E-174; null while still computing); the code version (`git describe` of the build) and the data's
identity — the export's hash in `manifest.json`, the hash of `presets.json`, each year file's hash
and its series' lineage ids (`app/src/ui/export.ts`; a test checks the JSON against the schema and
the CSV's rows against the hours). Printing hides the controls, keeps cards and tables whole and
draws the charts again for the print layout (D13: the print stylesheet serves for a PDF). The
README carries the declaration of interest in the wording the owner confirmed (R-PUB-2; OPEN-9, D-124, D-193);
the questions and answers' "Who made it?" gave the author, his role at Fermi Energia and his address from D-293 until
the owner took the questions and answers out (D-337), when README alone stated it; since D-341 a footer under every view
names the author, his role at Fermi Energia and his address again, with the code's and the documents' licences, and a
Feedback view takes a reader's note to that address through the reader's own e-mail program (the site sends and stores
nothing); no
slide of the deck states it, and the talk's notes, which placed it before the figures, went with D-321; the page's footer carried it too until the owner took the footer off (D-224;
revisions 2.72 and 2.74, ERRATA E-185).

### 8.5 The import-price page (R-APP-12, R-BND-8; revision 1.8, D-040)

The *Import price* view shows a boundary zone's price as the model takes it. For each year of the set
shown it calls the engine's `boundaryPrice` (`app/src/engine/build.ts`) — the year file's profile
times the zone's level factor, the series `build` hands the clearing before any slope (R-BND-6) —
and draws it from the year files the loader has already fetched (`app/src/ui/importprice.ts`). Per
year: the hourly price as one stroke per pixel column from the column's lowest to its highest hour
(no spike and no zero is lost to the width), the monthly maximum, average, median and minimum (a leap
year's February has 29 days; a climate year is the TYNDP layout's 8 760 hours) in a table whose
columns are the figure's months, each cell shaded by its price on the figure's scale in one hue,
darker for dearer, with a negative price in the warning hue, the hours at zero,
below zero and above 100 €/MWh; the profile by hour of the day (UTC in an observed year, the TYNDP
layout's hour otherwise); and one duration curve per year, against the profile before the level
when the level is not 1. The hourly figures, the hour-of-day profiles and the duration curve share one price axis,
stopped at every year's 99.8 % point, but not above twice its 95 % point, so that a few dear hours
do not press the rest flat (SE4's Distributed Energy 2035 reaches 387 €/MWh in 2009 around a median
of 49; TYNDP 2026's scarcity hours reach 3 000 €/MWh, 246 hours above 500 in Finland's WS059); the few hours above it are
drawn on the top edge and counted under the heading, and each year's line gives its maximum. The years are told apart by their labels and line dashes,
and since D-197 the three climate years also by their colours (R-UI-4). In the generation behind the price, other thermal
and every group under 3 % of each climate year's generation are drawn as one band, *other*, its members named in its
tip; the table under the bars keeps them apart (D-197: Finland's batteries, electric cars, demand response, gas and
other thermal).

The slider is the panel's level factor of the zone (D-040): a drag changes the figures while the
slider stays in place, letting go redraws the panel, and the model reruns as from the panel.

For a TYNDP 2024 profile the page adds the zone's annual generation in the market model
(§4.2, `boundary.generation`), grouped — nuclear; hydro (reservoir, run-of-river, pondage, pumped
storage's turbine); wind onshore; wind offshore; solar; other renewable; stationary batteries; demand
response; the electric cars' vehicle-to-grid; gas; coal and lignite; other thermal (oil, oil shale, hydrogen, biofuel-fired units,
others non-renewable) — with the demand, the electrolysers, the other loads, the net export and the
dumped energy; the installed capacity by the same groups (a store counts its discharge side; the
electric cars' batteries apart) with the electrolysers and heat pumps, and each climate year's
full-load hours (generation over capacity; one column of capacity when the climate years share the
fleet, as TYNDP 2024's do); before the market model's capacity the zone's fleet at the end of 2025 and
after it the change from that fleet in per cent (D-256) — ENTSO-E's installed capacity per production
type on 1 January 2026 (A68; `boundary.fleet`), its types gathered into the same groups (biomass,
geothermal, marine and other renewable; the three hydro types; hard coal and lignite; coal-derived
gas, oil, oil shale, peat, waste and "other" under other thermal), with Finland's and Poland's wind and
solar from the Statistics page's year-end series (IRENASTAT, §8.7), since ENTSO-E's documents list no
offshore wind for either and Poland's solar a year behind (20 734 MW against 25 421); a type no source
lists is shown as "–" with no change from it, since not reported is not zero (SE4's document lists
hydro, onshore wind and one "other" alone, and the Statistics page holds Sweden, not SE4), a reported
zero the market model builds on is "new", and a group the market model has closed is kept at −100 %;
and the scenario's description from the TYNDP 2024 Scenarios Report (final version,
January 2025, Figure 3). The generation explains the price; the level does not change it, and the
model of this site does not use it.

For TYNDP 2026 National Trends+ the page shows the same two tables per weather scenario (D-043),
from the NT+ hourly dashboards (§4.2): the zone's market node and its prosumer node together,
under the same groups. Three things differ from TYNDP 2024's rows. The electric cars' charging is
part of the demand, and what they give back is shown as generation; the dashboards' capacity
sheet gives the cars no capacity. "Other thermal" holds the prosumer node's adequacy units where
the model has them (Finland: 4 500 MW, 8 000 in 2035). And the weather scenarios, like TYNDP 2024's climate
years, share one fleet per target year.

### 8.6 The Weather page (R-APP-13; revision 2.1, D-084)

The *Weather* view explains the climate years every scenario run of the TYNDP 2024 family stands
on. It tells, in ENTSO-E's words with the page cited, that 1995, 2008 and 2009 were selected for
TYNDP 2022 among the thirty PECD years 1987–2016 by the residual-load method of the System Needs
Study guidelines (§6.2–6.3: residual load per region and hour, delta indicators against the
thirty years, the 1 % of 4 060 combinations nearest the whole in Euclidean distance, the
K-Medoids clustering score to choose among them), kept for TYNDP 2024 with the weights 0.233 /
0.367 / 0.400, 2009 the most representative; and that by the Dunkelflaute ranking of the
Scenario Building Guidelines 2009 is Europe's second most stressful year, 1995 the fifth, 2008
the twenty-fourth. For each core zone it draws the 38 PECD years (1982–2019, edition 2023.2) as
bars — onshore and offshore wind and solar capacity factors at the 2030 layout, the National
Trends demand peak at 2009's annual energy (the profiles' energy moves a little with the
year, and a run scales every year to the scenario's), TYNDP 2024's hydro inflow as published
— the three years each in its own colour (D-197; in the accent until then), their values and ranks among the years
with a figure, read from the unrounded values, in a line above each chart rather than on its bars, and its lineage id, and a table of the three years' figures with the ERA5 temperature and the Dunkelflaute
rank; then a table of what a climate-year file holds against what the engine reads from it
(§4.1), and a paragraph on the TYNDP 2026 family's projected weather scenarios. The page is
static, drawn once from `presets.json` `climate_years` (`export/tables.py` `climate_years`,
`app/src/ui/weather.ts`); the research behind it is `docs/research/2026-10-06_climate_years.md`.

### 8.7 The Statistics page (R-APP-14; revisions 2.3, 2.5, 2.64 to 2.67, D-087, D-092, D-093, D-213 to D-219)

The *Statistics* view shows the last ten years of the gas and CO₂ prices and of the wind and solar
build-out, each with a line carried to 2040, beside the model's assumptions. It is in eight tabs (D-213, D-214, D-217):
*Gas*, *CO₂*, *Onshore wind* (with SE4's wind by bidding area), *Offshore wind*, *Solar* (with Estonia's own counts),
*Data centres*, *Industry* (the new industrial loads) and *Prices*, the six zones' day-ahead prices. Gas shows first,
and the tab chosen stays until the page is reloaded.
*Prices:* the TTF
price by month in €/MWh of gas — the World Bank Pink Sheet's "Natural gas, Europe" at the ECB's
dollar rate of the month, the series behind the observed years' bids (R-SUP-3) — over the 120
months to the Pink Sheet's last (November 2016 – October 2026); the EU ETS price as the month's
average EEX primary-auction clearing price of general allowances (D-094) over the same window, from
January 2017, where EEX's public archive begins (118 months). Two lines through each, every month
at its middle as a decimal year: least squares, with R², and Theil–Sen, the median of the slopes
between every two months, which the spike of 2022 moves little. A year's value of a line is its
value at mid-year. The table under each figure gives both lines in 2030, 2035 and 2040 beside the
fuel paths of ERAA 2025 (the scenario's), TYNDP 2024 and Svenska kraftnät's LMA 2026, and the average
of the last twelve months.

*Capacity:* the year-end installed onshore wind, offshore wind and solar of Estonia, Latvia,
Lithuania, Finland, Sweden (the whole country: the statistics have no bidding zones) and Poland,
2015–2025, from IRENASTAT (IRENA's database, table `Country_ELECSTAT_2026_H2`, the figures of its
*Renewable capacity statistics 2026*; table `capacity_stat`). Each year's net addition is the
year-end less the year before (2016–2025). The least-squares line through the ten additions is
drawn to 2040, at zero where it falls below; a technology none of the six countries added — offshore wind, where
Sweden only retired a little — has a sentence above its six empty figures and its table (D-197; the figures again since D-219). The installed capacity at the end of 2035 and 2040 is
read two ways, at the owner's choice of both: *trend* — each year from 2026 adds the line's value,
nothing where it is below zero; *pace* — each year adds the average of 2021–2025, the rate R-SUP-9's
slow build reads (a standard sensitivity until D-183, §5.9). Beside them: the scenario view's fleets of 2035 — Estonia's
onshore wind and solar the owner's values for the opening (D-182), S1's own in the table's note (ERRATA E-182) — and TYNDP
2024 National Trends of 2040 for the core zones, TYNDP 2024 Distributed Energy of 2035 and 2040 for
Finland and Poland (whose prices the neighbours' default profile is), none for Sweden (TYNDP's
zone is SE4). The page is drawn from `presets.json` `statistics` (`export/tables.py`
`statistics`, `app/src/ui/statistics.ts`), and drawn again when the panel changes a value its red dots show (D-216); the research behind it, with IRENA against Eurostat and
the national counts — Estonia's solar and Sweden's wind of 2025 run low in IRENA — is
`docs/research/2026-10-06_statistics.md`.

*Installed capacity (D-214, D-217):* the Onshore wind, Offshore wind and Solar tabs open with each country's installed
capacity of their technology at every year's end, 2015–2025, from the same IRENASTAT series (until D-217 one Wind tab
summed onshore and offshore). Each figure carries the table's two readings to 2040, trend and pace, so they equal the
table's. The model's own figures for 2035 and 2040 (the columns of the tables) are hollow diamonds. On each
technology's tab each country's figure of its installed capacity stands beside its figure of net additions, a country
to a row, the additions captioned with their pace (D-218, D-219), offshore wind's empty. A tick of six digits widens the
figure's left margin (D-219). Every diamond of the page, the fuels' and the zones' prices too, names under the
pointer the scenario its figure is of (D-215): for the core zones in 2035 the Model view's fleet (Elering and TalTech's
S1 with the owner's values for Estonia, ERAA 2025 for Latvia and Lithuania), in 2040 TYNDP 2024 National Trends; for
Finland and Poland TYNDP 2024 Distributed Energy.

*The values set now (D-216):* a red dot on each chart marks the value the panel sets now in the scenario view, at
the run's year: the installed wind and solar of Estonia, Latvia and Lithuania, the scenario's gas and CO₂ prices,
and each neighbour's average price, its profile's average (the panel's list) times the level set. It moves as the
panel's controls do, and the page does not dim while a run computes; it sits in the diamond while the value is the
scenario's preset. A validation run sets none of
them, and Finland's, Sweden's and Poland's capacity and the Baltic zones' prices are none of the panel's settings.

*Data centres and new industrial loads (D-214):* two tables by country of figures read off the operators', the
governments' and the companies' publications. The data-centre table gives what data centres consume (Eurostat's
`isoc_env_ict_nrg`, NACE data centres, from 2024 for Latvia, Lithuania and Poland; Estonia reports none), what they ask
the grid for, what is reserved, agreed or running, and what the operators' plans expect. The industry table gives the
new industrial loads: electrolysers for hydrogen and e-fuels, steel, electric boilers for district heating. It shows
what is requested, reserved, agreed or running, and the plans, with industry's consumption of 2024 for scale (Eurostat's
`nrg_bal_c`, final consumption of the industry sector). Each figure is a documentary row (`statistics.dc.*`,
`statistics.ind.*`) with its page and date, verified on the cached document; a figure from the press says so, and a sum
of a list's rows (AST's, PSE's, Svenska kraftnät's) is recomputed from the cached table. Beside them stand the model's
own research rows of 2035 (`se2035.*`, `pl2035.*`, D-121). A connection request is not demand, and a figure in MW is
a capacity at the connection point, not a year's load. The research is `docs/research/2026-11-04_datacentres_industry.md`.

*Prices of the zones (D-092):* each zone's day-ahead price by UTC month (ENTSO-E A44; the hour is
the average of its quarter-hours since October 2025), each month the exact average of its hours and
counted when nine tenths of them are in euros, over the same window as the fuels — Poland from
December 2019, its prices being in złoty from March 2017 to November 2019 and its euro prices
before that missing too many hours for a month to count (ERRATA E-074) — with the same two
lines and their 2030 / 2035 / 2040 values; beside Finland, SE4 and Poland TYNDP 2024 Distributed
Energy's average price as published, before the price levels. *The countries' own counts
(D-093):* SE4's wind by bidding area from Energimyndigheten (table `capacity_area`, onshore and
offshore together), read as the countries are and set beside TYNDP 2024's SE4; Sweden's national
sum and Estonia's solar by Elering and the renewable-energy chamber (documentary rows) beside
IRENA's figures.

### 8.8 The Presentation page (R-APP-15; revisions 2.26 to 2.29, 2.37 to 2.42 and 2.51; D-152 … D-163, D-176 … D-181, D-190) — taken out (D-249)

*The owner took the page out on 2026-11-12 (revision 2.82, D-249); the deck of §8.9 took its name. What follows describes
the page as it stood. Its capital cost of the energy mix stayed the Model view's table until D-339, and the helpers it read the
runs with serve the deck; the two neighbours' profiles of its blocks stay among the sets the build computes.*

The *Presentation* view puts the four scenarios of 2035 on one page for a talk, the window's width, the
panel folded away while it shows. Its first block computes nothing of its own: it reads the four sets the Model
view computed for the settings shown and redraws as each comes in; the blocks of the other neighbours' profiles
(since D-177) are read from the sets computed when the site was built, or computed in the browser for any other
state. *Inputs:* each Baltic zone's demand — the
base load of the weather years, weighted, times the multiplier, plus the constant load over the year's
hours, as the panel's hint gives it — and its installed MW by source as the runs had them, wind on land
and at sea apart, Estonia's nuclear as the four scenarios' 0/315/630/945 MW (0/300/600/900 until D-189); each border zone's average
price as its level makes it (the profile's average, weighted, times the factor); the scenario's gas and
CO₂ prices. *Estonia's figures,* each weighted over the weather years as the Model view's table is,
with its difference to 0 SMR beside it in a column of its own, green where the figure falls and red
where it rises: the average price; the net import balance, TWh; the net import balance in euros (so named since
D-163), each hour's import less its export at Estonia's price of the hour, M€; CO₂ of Estonia alone, Mt (the Model view's
table sums the three zones); the hours its natural gas ran, the hours in which its gas plants together
put out more than 1 MW, as the Model view's table counts them. *Charts of Estonia,* the scenarios on
one indigo ramp, the more of the plant the stronger (blue until D-197): the monthly average price, each month the weather
years' averages weighted, drawn as the validation's chart is — a line per scenario, each month's
highest and lowest figure written beside its point; the energy mix as the Model view's, a bar per scenario since
D-197 (doughnuts until then), its generation and CO₂ after its end and the net import hatched; and the price
duration curve of the years' hours weighted together — each hour weighing its year's weight over the
year's hours, read at every 24th hour of a year — where the Model view draws each year's. Opened from a
validation run, the page returns to the scenario view's opening state, as the panel's switch does
(D-153). The page is not a deck (D13 keeps decks outside the application so that their numbers cannot
drift from the model): its figures are the run's own.

*Since D-156* the inputs give, for each source in each Baltic zone, its capacity, its change from the
observed fleet of 2025 — A68's, its batteries Elering's count where A68 has none, as the panel's marks
measure it (D-057), and since D-172 with what stood outside the market: Kiisa's emergency reserve,
250 MW of gas (Elering), in the panel's marks too, and Latvia's and Lithuania's batteries from A68 of
2026, the first year it lists them (10 and 426 MW) — and its bid, the hours' average of each class's lowest bid as the run had it, a
line of several classes bidding apart as their range — the gas of the three zones its one bid, 185 €/MWh at the
opening state (193 on the gross price before D-171; D-164; until then Latvia's and Lithuania's from the markup's lowest step to its highest, 175–402,
and Estonia's 189); the neighbours' prices and the fuel prices stand under
them, the neighbours' as their annual average with the profile they are of. Estonia's CO₂ differs from
0 SMR in per cent. An impact table gives, for each of the plant's scenarios against 0 SMR: an average
household's saving a year, the fall of Estonia's average price × 3 030 kWh, the average consumption per
household of 2024 that ACER reports from the regulators' data (`household.ee.average_consumption_kwh`),
× (1 + 24 %), the standard VAT rate from 1 July 2025 (`tax.ee.vat_standard_rate`) — on the average of
all hours, not on a household's own hours, and for a contract that follows the exchange price; the
money kept in Estonia over the plant's life, the fall of the net import bill × 60 years, the BWRX-300's
design life (`smr.bwrx300.design_life_years`), the figures of 2035 held and undiscounted — an
assumption of the table, not a result of the model; and what the state pays a year under the contract
(a) at the strike, as the contract card computes it.

*From D-157 to D-339* a table gave the capital cost of the energy mix to 2035 — the owner took it off the Model view
on 2026-11-26 (D-339); the deck still reads the plant's design life from the same figures (`capexOf`). It gave, for each Baltic zone and source
the capacity the scenario holds above the observed fleet of 2025 as the inputs measure it — the line's
growth, never below zero,
batteries and pumped hydro apart — at the Danish Energy Agency's central estimates for 2030: 'Nominal
investment (*total)' of its generation catalogue (onshore wind 1.147, offshore wind 2.393,
utility-scale solar 0.556, OCGT 0.468, combined cycle 0.883, wood-chip CHP 3.318 M€ a MW), a line of
several classes at its classes' cost weighted by their megawatts; a battery at the storage catalogue's
power component, 0.084 M€ a MW, and its energy component and other project costs, 0.195 M€ a MWh, at
its zone's hours. The catalogues' 2020 EUR are brought to 2025 EUR by the euro area's HICP, 128.75 /
105.06 (Eurostat). The plant's units cost the owner's 2 300 M€ each (4 600 M€ for two, an owner's
assumption). A source without a catalogue figure is unpriced, named under the table and kept out of the
totals. What retires and is replaced before 2035, the grid and the financing during construction are
not counted.

*Since D-158* the table gives beside it the cost of keeping each new source for the plant's design
life, 60 years: built in 2030 at the catalogue's estimate for 2030, rebuilt as each lifetime ends at
its estimate for 2050 — every rebuild comes in 2050 or later, the catalogues' last year — every build
lasting the technical lifetime of one built in 2030, the last rebuild's share the years it serves
within the 60, undiscounted (`lifeCost` in `app/src/ui/presentation.ts`). The lifetimes are the
catalogues': wind 30 years, utility-scale solar 40, gas turbines, combined cycle and wood-chip CHP 25,
the lithium-ion battery 20, which the owner held for every build where the catalogue gives 30 for one
built in 2050; the plant is built once.

*Since D-159* the impact's rows stand in the columns of Estonia's figures, under a heading of their
own: each scenario's level — an average household's electricity a year at the exchange price with VAT,
Estonia's net import bill over the plant's life, the state's payment under the contract — and beside
the plant's its change against 0 SMR, green where it falls and red where it rises: the saving, the
money kept in Estonia and the payment of D-156.

*Since D-160* the capital cost by source stands on the Model view (since 2026-10-25 last on it, under the charts); the
presentation gives each zone's totals and the Baltic states', to 2035 and over the plant's 60 years,
for each of the four scenarios, the plant in Estonia's. One function draws both (`capexHtml`). *Since D-162*
the presentation gives Estonia's totals alone; the Model view keeps the three zones by source. *Since D-197* the Model
view's table folds Latvia's and Lithuania's columns to a button each until the reader opens them; the Baltic states'
totals are whole either way.

*Since D-166* the presentation gives beside each sum over the plant's 60 years its present value in 2035 at
the owner's real discount rate, 3 % a year (`finance.discount_rate_real`, an owner's choice): the net import
bill of 2035 held for each of the 60 years and paid at each year's end, so 27.68 times the yearly bill, the
annuity factor (1 − 1.03⁻⁶⁰) / 0.03 (`annuity`); the capital cost's builds to 2035 at their cost and each
rebuild — in the year the builds' lifetimes after 2030 place it, the last one's share included — discounted
from its year to 2035 (`lifeCost` with a rate); the plant's units at their cost in 2035, without interest during
construction. The rate is real: the scenario's prices of 2035 hold no inflation and the capital cost is in 2025
euros. At the opening state Estonia's net import bill over the 60 years is 31.3 / 17.1 / 4.6 / −6.6 bn € with
no, one, two and three units — three units make Estonia a net exporter — worth 14.4 / 7.9 / 2.1 / −3.1 bn € in
2035; the money kept in Estonia, 14.2 / 26.7 / 38.0 bn € undiscounted, is worth 6.5 / 12.3 / 17.5 bn €. An
average household's electricity costs 402 / 359 / 322 / 280 € a year, and under the contract at 90 €/MWh the state
receives 19 M€ a year with one unit and pays 17 and 117 with two and three (D-182 to D-189: the owner's opening and
units of 315 MW; on D-169 to D-171's opening the bill was 33.9 / 21.1 / 10.2 / 1.0 bn €, worth 15.6 / 9.7 / 4.7 /
0.4, the money kept 12.7 / 23.7 / 32.9 and 5.9 / 10.9 / 15.2; with the gas plants' one bid of D-164 35.2 / 21.9 /
10.6 / 1.1, 16.2 / 10.1 / 4.9 / 0.5, 13.3 / 24.6 / 34.1 and 6.1 / 11.4 / 15.7, ERRATA E-168).

*Since D-176* the inputs give the Daugava cascade's bid as its running cost, 0 €/MWh, with a tip that gives its
water value — the dual of each week's water budget, 83–90 €/MWh at the opening state of D-176 — and says why the
cascade runs only above it (`docs/research/2026-10-24_daugava_bid.md`); and the bids stand once, in a column for the
three countries, a range where they or the scenarios differ.

*Since D-177* the capital cost stands at the page's top, and the page gives a block for each neighbours' profile:
the state's own, then TYNDP 2024's Distributed Energy and Global Ambition 2035, National Trends 2040 (climate year
2009 alone, as the published profile has it) and the research's two tight cases of 2035, each with Estonia's
figures and its three charts — the inputs, the same fleet under every profile, once above the blocks since D-197
(in each block until then), each block's neighbours' price levels beside its name —; the assumptions and sources of the impact and the capital cost stand once
at the foot. The site brings the sets of the other profiles computed when it is built (`app/scripts/opening.ts`).

*Since D-180 and D-181* two cards beside the capital cost hold the neighbours' price levels — Finland, SE4 and
Poland, ×0.5 … ×2 in steps of 0.01 — and the scenario's gas (10–120 €/MWh thermal) and CO₂ (0–300 €/t) prices as
sliders: the panel's own settings, so that the page's sliders, the panel's and the share link agree and every block
follows. The figures beside the sliders and each block's neighbours' figures move with the pointer (each block's fuel figures
until D-197, which leaves them to the sliders); the
results follow as the engine computes them in the browser, each block as it lands; a pointer snaps to the state's
own value, where the sets computed when the site was built return. Since D-210 the five sliders have the panel's form —
a thin track filled to the knob, the value they snap to a red dashed line under the knob's centre.

*Since D-190* the owner's neighbours' levels belong to Distributed Energy 2035 alone: the sliders show the top
block's levels, and each block of a profile that opens at ×1 — every other — moves by its share of them (×1.6 for
Finland is ×1.6 ÷ 1.8786 = ×0.852 on the tight cases, ÷ 1.4783 before D-194); the pointer snaps back to the top
block's own level. At the
opening the tight cases read 119.1 / 105.4 / 94.6 / 84.3 €/MWh (each on its own) and 117.8 / 109.5 / 102.0 / 94.0
(all together) with no to three units, Global Ambition 2035 75.7 / 66.8 / 57.8 / 48.0 and National Trends 2040
145.6 / 127.3 / 117.1 / 107.7.

### 8.9 Presentation, the deck (R-APP-16; revisions 2.68–2.74, 2.77 to 2.85, 2.87 to 2.130, 2.133, 2.135 and 2.145; D-220 to D-229, D-240 to D-255, D-257 to D-292, D-295 to D-315, D-319, D-321, D-333) — *Presentation 2* until D-249

v3's twelve press slides, ported to TypeScript (`app/src/ui/deck.ts`, `PROVENANCE.md`), on the Fermi deck's frame: a
white 1920 × 1080 stage scaled to the page or, on a button or the F key, to the screen. The address carries the view and the
slide (`view=deck&slide=7`), so a reload, a link and the language switch open the same slide; a sideways swipe pages it, and the
800 face is loaded before the first slide; the scenarios' slide's two cards take the stage's height with their rows a size
up, where v3's photographs stood (revision 2.69, D-221). v3 drew them on a snapshot of its results;
here every figure is read from the runs the page shows, so a slide changes with the settings as the Presentation page
does and cannot drift from the model (D13's reason, which D-220 keeps while superseding its drop of in-app decks).
Each figure is the state's scenarios weighted over the climate years, as everywhere (§4, R-TIME-4), its whisker
the lowest and the highest year; Estonia's demand is the Presentation page's (the weighted base load times the
multiplier plus the constant load); the trade balance is Estonia's export less its import at its own price, the sign
of v3's slide; the hours gas sets the price are those a Baltic gas plant set Estonia's price (D-195); the capital cost
is the Model view's table (§8.8). The cables' slide runs the same scenarios with EstLink 2 out all year and with both
EstLinks out, the panel's what-if outage (§9): the opening state's two trios are the build's sets (§8.1, D-221). Since
D-340 the deck is always of the opening state — its scenarios as published, three since D-343, whatever the panel holds — so that a
change on the Model view moves no slide; until then it followed the state shown and computed another state's trios in the
browser. Every sentence that states a result
is written from these figures. The literature beside them is v3's, named on the slide without a link (the site's code holds
no third-party address, R-NFR-1; the links of the neighbours' slides take their addresses from the site's sources,
D-270, and the last slide's repository is the model's own, D-333), and enters no computation:
the direct emissions of combined-cycle gas, 370 g CO₂-eq/kWh
(350–490 over the studies), and of nuclear, 0 — IPCC (2014), Annex III: Technology-specific cost and performance
parameters, in *Climate Change 2014: Mitigation of Climate Change*, Working Group III's contribution to the Fifth
Assessment Report, Cambridge University Press, Table A.III.2, [doi:10.1017/CBO9781107415416.025](https://doi.org/10.1017/CBO9781107415416.025)
(checked against Crossref on 2026-11-08) — and the milestones of the European Climate Law, Regulation (EU) 2021/1119,
Article 2(1), whose 2040 target Regulation (EU) 2026/667 wrote in — signed 11 March 2026, in the Official Journal 18 March,
in force 7 April 2026, which the slide's caption says since E-183 (v3's slide, and the port, said March).

From D-222 to D-321 each slide had a note for the speaker (revision 2.70; `deck.ts` `NOTES`), shown under the stage on
the N key or the bar's button and never in full screen: what is said with the slide — which chart is which, how a figure
reads and what it is not — in the page's language, the Estonian taken from the talk pack. A note was text only: it
carried no figure and stated no result of the runs. The owner took the notes out on 2026-11-25 (revision 2.135, D-321):
the bar's button, the N key, the panel under the frame and the seventeen notes are gone, the full-screen button keeps
its place at the bar's right end, and the talk's sentences stay in the talk pack.

From 2026-11-09 to 2026-11-12 a thirteenth slide, the twelfth in order, was v5's own (revision 2.71, D-223): how accurate
the model is. It showed the protocol's hourly mean absolute error of price (§7.3; R-VAL-3) for the three zones in each year the thresholds
bind in (R-VAL-5: 2023 to 2025) and in 2026 (§7.5), the part year, under the first day and the day of the last hour its
data reach (the year file's `meta.hours`); a figure above the threshold of 15 €/MWh is red and carries a cross, as the
calibration page marks a breach by a sign (§8.2). Beside the table stand what a replay takes and is measured against
(§7.1: the year's own fleet, weather, demand, fuel prices, transfer capacities and neighbours' prices, never the Baltic
prices), the count of the protocol's figures outside their thresholds with the gate's state in the calibration page's
and the gate line's words (§8.2, §8.4), and that the scenarios' results are not forecasts. The owner took it out on
review (revision 2.77, D-240): the count and the gate's state are the calibration page's and the exports' (§8.2, §8.4,
D-201), and the past years' slide below answers how accurate the model is.

The owner's edits of 2026-11-09 (D-224, D-227 to D-229): the title slide asks what happens to the energy system if Estonia
builds a nuclear plant, the four scenarios sharing their gas (D-151, D-227); the scenarios' slide gives each zone's demand
with its growth from the observed load of 2025, the full year the panel's demand mark compares with (D-057, D-228); the
last slide ends with its three steps, without the sources' line, the declaration of interest and the author's name
(D-224; since D-333 the notice of the open repository stands under the steps, below). A fourteenth slide, the thirteenth
in order and the twelfth since D-240, shows the validation as charts (revision 2.73, D-229): Estonia's
replay of one of the gate's years (R-VAL-5), chosen by a button on the slide, beside the record of that year — the energy
sources as a bar each (the replay's mix; the record's ENTSO-E A75 generation in the same groups, `actualOf`), the price
duration curve on an axis cut at 400 €/MWh with the hours above it counted for each, and the monthly average and median
price (`charts.ts` `monthly`, the Model view's own), the model's line solid and the record's dashed (since D-255 the record's solid and the model's dashed). Its subtitle gives the
year's hourly error from the validation's table (`data/derived/validation/<year>.json`, loaded when the deck first
shows); since D-240 its title asks how accurate the model is. The replays are the Model view's validation runs (§7.1),
whatever scenario the page shows; the build computes the three with its sets (§8.1), and a page without them computes the
year in the browser. Node's rendering of the fourteen slides and the browsers' own agree to the digit, the slide's lines
coordinate by coordinate (the night's check of 2026-11-10).

The owner's review of 2026-11-12 (revision 2.77, D-240, D-241), slide by slide: the second slide has no subtitle, its
three points are the owner's words — a solution is needed that tests different energy mixes and their effect on the
price quickly; the Baltic market is one whole, so the model computes the three countries at once; energy system
modelling software on the market costs tens to hundreds of thousands of euros — and its picture is the panel's map of the lines (§9, `panel.ts` `linesSvg`): the land, the zones' nodes with their
flags and each line the state runs with, its streaks moving as in the panel; a line switched off is left out and nothing
on it switches. The third has no subtitle, its real data name the installed capacity and the bids, and the flows with
the neighbours stand in the simulation's box; the fourth no longer says that no single year is the year's price and has
no marks; the fifth has no subtitle and no factory before its fleet, and each zone's figures are a column of their own
width, the flags under each other; the sixth's chart holds the scenarios' names it cut by 7 px, its two impact
headings are as bold as their figures, and the economy's line is the calculation alone; the eighth names the EstLink
cables. Thirteen slides; no figure moves. The third slide then took the panel's own controls under its pipeline (revision
2.78, D-242; `panel.ts` `panelControls`): Estonia's demand, onshore wind and solar on the panel's sliders — each value,
preset and range by the panel's rules, a source's top twice its preset, a fifth over its value and at least 2 000 MW —
and the switches of the panel's first four lines with their MW, drawn in the panel's design at the stage's size and
following the panel as it changes; nothing on them can be pressed. The same day (D-243) the fourth slide lost its right
column and its chart took the body's width, the fifth's growth marks were set in columns, and the sixth lost its gap's
block, its footnote now saying that the figure is the price gap between 0 SMR and 3 SMR. Then (revision 2.79, D-244)
the slide on how accurate the model is became the fourth and shows the three gate years at once, a column each: the
year's hourly error, the energy sources, the price duration curve, and the monthly average and median price with every
month's figure by its point, the model's over or under the market's as the lines lie; the year's buttons are gone, the
three replays are asked for whenever the slide is near. Last (D-245): the weather years' slide says what a weather year
and its weight are and gives its chart's unit, the scenarios' slide names the gas price LNG's, the price gap's two
impact headings take the figures' blue, and the capital cost's slide drops its present value's column, which the Model
view's table keeps (§8.8).

The plant's account for the state (revisions 2.80 and 2.81, D-246, D-247), the thirteenth slide then and the fifteenth
of seventeen now: for one, two and three units, each against 0 SMR, over the plant's design life of 60 years, the model
year's figures held for each
year and undiscounted. Its sum is the consumers' and the taxpayers' account, as the sensitivities' net row has it
(D-188): the consumers' saving — Estonia's demand times the gap of the weighted average prices, the price slide's —
less the contract's cost, what the state pays a year under contract (a) settled hourly at the state's strike
(`statePaysOf`, §8.3; the contract card's slider set it until D-294 took the card out, and it is 90 €/MWh unless the
page's address carries another), a gain where the operator pays back.
Under the sum, for reference and outside it: the fall of
the net import bill, imports less exports at Estonia's price (the Presentation page's impact row, §8.8), and the
plant's construction, its megawatts at the owner's price. D-246 had added all four; the owner took the two out of the
sum (D-247) because each counts money the sum's lines hold: the import bill's fall holds the cheaper imports the saving
holds too, the rest of the saving being a transfer from Estonia's own generators, and the contract's payments repay a
plant its investor builds. A country-wide account is not drawn: the model has no running costs of the plant to set
against the import bill. The scenarios' slide then gave the gas plants of all three zones in a row like the others,
each row after its source's icon as the panel draws it (D-248).

The owner's edits of 2026-11-13 (revision 2.83, D-250). Three units are on no slide: the deck shows 0, 1 and 2 SMR
(`deck.ts` `SC`), so the price gap, the household's and the economy's money, the verdicts of the imports' and the
cables' slides and the footnotes are told for two units where they were for three; the Model view and the build kept
the four scenarios until D-343 (2026-11-27), which took three units out of the model too. The second slide's map gives, after each zone's
code, its average day-ahead price from January to the last month the Statistics page's series (§8.7, ENTSO-E A44) reach
for all six zones — January to October 2026 at the time — each month's average weighted by its days (`yearPrices`), the
same average as the year's hours to within the months' rounding (Estonia 80.38 €/MWh from the hours, 80.4 from the
months). Since D-257 the map's average is the year so far, the month in progress included: the export's
`statistics.ytd`, each zone's mean over every hour of the latest year from 1 January to the last hour all six zones reach,
and the title names the last day (on 2026-11-23: 1 January to 23 November, 7 847 hours; Estonia 86.0, Latvia 107.2,
Lithuania 108.8, Finland 58.0, SE4 103.4, Poland 130.7 €/MWh). The month in progress is fetched by
`make prices-to-date` (`pipeline/history.py prices_to_date`): ENTSO-E A44 of the six zones from the month's first day to
today's UTC midnight — the response carries the day-ahead prices of the delivery day in progress — under its own dataset
id (`entsoe.A44.EE.2026-11.to-2026-11-23`), so that the whole month, once `make history` fetches it, loads after it and
replaces its hours. The extra hours move no year file: an observed year ends where the core zones' load and generation
end (`observed_hours`), and the Statistics page takes a month once nine tenths of its hours are in. The accuracy slide states under each year how far the model's average price of the year is from the market's,
in per cent of the market's — the replay's mean against the record's, the arrays the slide's charts draw — where the
hourly error stood (−1.8, −4.2 and −5.0 % for 2023 to 2025); the hourly errors stay the calibration page's (§8.2). Since D-258 the slide gives
the two averages alone, model and market, without their difference in per cent. Since D-259 the second slide's prices stand in boxes, the
third slide's real data name the installed capacity and generation, the bids out, its panel shows demand, one generation
source named by no technology (onshore wind's slider) and the gas plants' one bid as the panel sets it, the fourth
slide's averages are a size larger, and the sixth slide names the
neighbours' scenario as the panel's list does. Since D-260 the third slide's source is Estonia's gas plants summed, with its MW and its
bid side by side, and its links are numbered, not named; the sixth slide's card begins with demand and gives Estonia's
oil shale, its foot each neighbour's average with its unit; the twelfth slide no longer gives the plant's construction. Since D-263 a
seventh slide of fourteen stands after the scenarios': for Finland, Sweden (price zone SE4) and Poland the profile's
average as published, the market's of the year to date and the model's with its level, over each country's data centres
and new industrial loads — consumption in 2024 against the operator's plan, with the queue — every figure a documentary
value of the Statistics page's two tabs (§8.7, `NB_KEYS`); it argues for the owner's levels and derives none. Since D-264 the slide is Finland's alone, and beside
Finland's card it lists the ten large data centres planned there, a row a project with its megawatts and stage, from
Germany Trade & Invest's table of 28 August 2026 (`statistics.dc.fi.project.*_mw`; the developer's planned capacity, a
first phase and its extensions summed), with their sums by stage. Since D-266 the table is twelve projects, the megawatts from
each project's own document where one is at hand (the environmental impact assessments of Microsoft's three sites, YIT's
release on atNorth's campus, AmpTank's announcement, the study TikTok and Hyperco commissioned) and from the trade
agency's table else; each row named its first phase — the year and, where published, the megawatts — beside the campus's
final capacity until D-273 took that column out, and the sums stand beside Finland's IT power of 2025 and 2027 (EUDCA),
which is another measure. Since D-268 a thirteenth row holds Google's three new sites, Kajaani, Muhos and Vaala, with no
megawatts and in no sum. Since D-277 the card's price is one line — the profile's average as published, the level right
after it and an arrow to the price the model takes — and the market's year to date stands on the second slide's map
alone. Since D-279 Sweden's and Poland's slides follow Finland's, sixteen in all then, drawn by the same function from a
country's record:
Sweden's plan is the midpoint of the 2030 and 2040 readings of Figure 5 of Svenska kraftnät's long-term market analysis
(the research's `se2035.*` values), its table five campuses from the developers' releases and the trade press, none in
SE4; Poland's plan is PSE's draft development plan 2027–2036 and its table every data-centre row of PSE's list of
connection requests (`statistics.dc.pl.project.*_mw`), none with an agreement — the slides argue for the owner's levels
and derive none. Each data-centre row's base has since become its operator's own, and Finland's industry row's too:
Finland's two rows start from Fingrid's figures of 2025 (D-289), Poland's data centres from PSE's 0.6 TWh of 2024 (D-298)
and Sweden's from Svenska kraftnät's 2.5 TWh of 2026 (D-311); Poland's industry keeps Eurostat's 2024. Sweden's industry
block has no figure line (D-313): it lists five rows of Svenska kraftnät's Table 4, scenario MM, 2026 → 2050 — fossil-free
steel, fossil-free cement, refineries, electric vehicles, hydrogen production — a column a year, TWh beside each figure
(D-314, D-315). The
plant's account counts what the state pays under the contract for difference over its first 40 years alone
(`finance.cfd_term_years`, the owner's assumption), after which the plant sells at the market price and the state pays
nothing; the consumers' saving runs the plant's whole 60 years, so the sum is the saving times 60 less the contract's
cost times 40. The deck reads no validation table any more.

The owner's edits of the same day (revision 2.84, D-251): the map's prices carry their unit, €/MWh, after each
figure, the map's box reaching east to the land's edge (362 of the projection's units, 340 before) and Estonia's
label standing left of its node, its flag next to the node, so that every unit fits (since D-252 the land reaches half
a degree further east, the box shows 12 to 374, and Estonia's label stands right of its node as the others'); and the map is drawn 680 px wide, 490 before, the column's heading on one line; the accuracy slide
gives under each year, the price duration curve 124 px high (132), the model's and the market's average price of the year and their difference in per cent of the
market's; the cables' slide spreads its three scenarios' blocks down its column; and the capital cost's slide is
taken out — its table is the Model view's (§8.8) — so the deck has thirteen slides.

The owner's edits of the same afternoon (revision 2.85, D-253, D-254): the accuracy slide gives 2026, the second blind
year, in a fourth column, its replay over the hours its record reaches (January to October, 7 296 hours, when written)
and the months it holds named under the year; the columns narrow from 560 to 416 px and the monthly charts name each
month by its initial. The build computes 2026's replay with the gate years'. On 2026's ten months the model's average
price is 71.1 €/MWh against the market's 80.4, 11.6 % below — further below than in any gate year, the blind year's
reading as the protocol takes it, not a fit. The scenarios' slide gives under the plant the links in service, the same
in the three scenarios: a row per border with its lines and their MW as the panel's switches hold them (on the opening
state EstLink 1 and 2, 1 000 MW; the EE–LV lines, 1 035; the LV–LT lines, 1 750; NordBalt, 700; Harmony Link and LitPol,
1 200), EstLink 3 and the fourth EE–LV line, out of service in 2035 (S1), left out. On the accuracy slide the market's
line is solid and the model's dashed (D-255), the other way round before.

The neighbours' three slides as they stand (D-270, D-276, D-278, D-281, D-282, D-286, D-292, D-299, D-301, D-309): the
country's flag stands in the title; Finland's slide alone keeps a conclusion under it — Finland's demand grows faster
than its new generation — and Sweden's and Poland's have none; the figures of the left card and the places of the table
are links to the documents they come from, the addresses read from the site's sources; a project's dot is green where
building has begun and grey else; Arctial's rendering of its smelter at Kokkola stands over Finland's industry block
(`app/public/img/arctial_kokkola.webp`); Sweden's price is SE4's and its blocks are marked as all Sweden's; Poland's
list gives no sums by stage, which its left card holds.

The order since 2026-11-24 (revisions 2.111 and 2.112, D-295, D-296): the scenarios' slide stands before the weather
years', and the weather years' after the neighbours' three, right before the weighted prices they explain. The slides
run: the title; why another model, with the map; how the model works; how accurate it is; the three scenarios; Finland;
Sweden; Poland; the weather years; the price gap; the dependence on cables and neighbours, with the hours gas sets the
price; the EstLink cables; CO₂; the trilemma; the plant's account, counted for Estonia since D-281; the map of nuclear
projects; try it yourself (`deck.ts` `SLIDES`). The ordinals in the paragraphs above are those of their day.

The sixteenth slide (revision 2.133, D-319) is the map of nuclear projects in Europe and North America by stage —
feasibility study, early development, ongoing project, under construction — each with its technology and the sites
named: slide 127 of the Fermi deck, kept as a picture and not ported, shot at 3840 × 2160 in Estonian and in English
(`app/public/img/projects_map_et.webp`, `projects_map_en.webp`) and shown full-bleed in the page's language, in that
deck's own frame, with its QR code to the Fermi deck's page of sources. It states no result of the runs, so the rule
that every figure of a slide is read from the runs (D-220) does not reach it; a change in that deck needs the picture
shot again. Seventeen slides.

The last slide (revision 2.145, D-333) says under its three steps that the model's code is open on GitHub, in the
page's language: a kicker, a headline, the address `github.com/andresingerman/energiamudel-baltic` and a line on what is
there — code, data and documents. The address is a link, and beside it stands the address as a QR code, a link too:
version 4 with error correction M, 33 modules a side at 7 px, 231 px on the stage, an inline SVG of the code's dark
modules kept in `deck.ts` (`REPO_QR`; the address once, in `labels.ts` `REPO`). It was made once with the library `uqr`,
which is no dependency of the application, and a test holds the shape to the address, so a new address needs a new code.

## 9. Interconnectors and adequacy (M5; R-LINK-1, R-LINK-3 … R-LINK-7, R-APP-3, R-APP-8, R-BND-7; DECISIONS D-031 to D-034)

An observed year runs on the offered capacity of ENTSO-E A31, less the capacity allocated to
balancing on the AC borders (R-LINK-2, R-LINK-5; §4.1). A scenario year builds each border from its
lines (`scenarioLines`, `app/src/engine/build.ts`; the catalogue in `presets.links`,
`export/tables.py`).

**Lines.** One line per HVDC cable — EstLink 1 (350 MW), EstLink 2 (650), NordBalt (700), at the
ratings of the ENTSO-E HVDC statistics — one group per AC border for the lines in service, whose NTC
the TSOs set jointly, and the two Lithuania–Poland lines, both AC (D-170). LitPol has run in
synchronous AC since 9 February 2025, when the Baltic states joined Continental Europe through it and
its back-to-back converter left the path; alone it carries Litgrid's market capacity of 2027–2030,
500 MW. Harmony Link is to be a double-circuit 220 kV line overland (PSE and Litgrid, 15 July 2024).
The planned lines of R-LINK-1 are EstLink 3, Harmony Link and the fourth EE–LV line; each carries
ERAA 2025's step (the NTC of its first target year less the one before, hour by hour: EstLink 3 700
MW, the fourth EE–LV line 596 MW on average; Harmony Link ERAA's LT-PL NTC from 2030, 700) and is in
service from ERAA's year (2035, 2035, 2030) — the owner's choice over the TSOs' years (2038, 2036,
2031; D-031). Each switches in the panel.

**A scenario year's border.** ERAA's hourly NTC of the target year (or of the latest year before
it) less the planned lines it holds is what the lines in service carry: on EE-FI and LT-SE4 it is
shared among the cables by rating; on an AC border it is the group's. A planned line in service adds
its step. LT-PL is LitPol and Harmony Link at their MW in every hour, held to the market capacities of
Litgrid's plan 2026–2035 (LT→PL 365 MW in 2026, 500 in 2027–2030, 1 200 from 2031; PL→LT 200, 350,
1 200; 2035's beyond it) unless the user lifts the plan (R-LINK-3). The AC borders lose the 2025 average
allocation to balancing, both directions averaged: EE-LV 265 MW, LV-LT 272, editable (R-LINK-5).

**Typical availability (R-LINK-3 (ii), OPEN-5).** For each HVDC cable the statistics of 2019–2024
give the average available technical capacity *a* and the planned-maintenance share *m* (EstLink 2's
2024, a cable failure, is left out; the presets hold no 2022 for EstLink 1, nor 2022's maintenance share for any
cable). The AC lines take ERAA's forced-outage rate for
HVAC, 0 % (ERAA 2025, Annex 2, §2.2, p. 17), and no profile: their planned maintenance is in the
TSOs' NTC. Until D-170 LitPol carried its converter's statistics of 2019–2024 (*a* 90.9 %, *m* 4.4 %)
and Harmony Link an HVDC cable's 94 % without history (ERRATA E-170, E-172):

| Cable | *a* | *m* |
|---|---|---|
| EstLink 1 | 97.5 % | 1.9 % |
| EstLink 2 | 98.1 % | 1.1 % |
| NordBalt | 94.0 % | 1.9 % |
| EstLink 3 (no history) | 94 % (ERAA's HVDC forced-outage rate of 6 %) | 0 |

The profile is 0 for round(*m* · 8 760) hours from 1 June, 00:00 UTC — a border's cables one after
the other — and *a* / (1 − *m*) in every other hour, so that the year's average is *a*
(`availability`; `app/test/links.test.ts`). At nameplate every cable is at 1.

**What-ifs (R-LINK-4).** A line is held at most at a given MW from one day to another, both
included (a window may run over the new year). In a scenario year the held line is capped. In an
observed year a line alone on its border, or an AC group, caps the offered capacity. On EE-FI each
hour's offer is first split between EstLink 1 and 2 by their ENTSO-E A78 events (ERRATA E-046,
E-047): with no event of either both are in service and the offer is limited elsewhere, so the
border keeps the lesser of the offer and the cables' shares of the year's highest offer by rating;
a cable in a forced outage carries nothing and the other all of the offer; with a planned event of
one, the other carries its share and the one with the event the rest; alike events split the offer
by rating. Each cable then keeps at most its what-if; both at 0 leave nothing. The what-ifs are
listed in the Links box and above the border panel; until D-224 the result listed them too, as changes from the
presets.

**The Links box** draws the lines as v4's panel did (v4 D-046 … D-049; the owner asked, 2026-09-29):
a schematic map of the six nodes across the panel, each where its country lies, north up (D-120), with a line per
catalogue entry (width by MW; switched off dashed red, held for part of the year dashed amber), and
a switch per line grouped by border — an HVDC cable at its
rating, a planned line at ERAA's step with ERAA's and the TSO's year, an AC group at ERAA's highest
hourly NTC of the target year — of the year before its planned line where the target year holds that line — and the
fourth EE–LV line at the difference of the two years' highest hours, +1 000 MW, where its hourly step averages 596
(`lineMw`; in a validation run an AC group's capacity is A31's). A switch, or a click on
the line in the map, takes a planned line in or out of service and a line in service off as a
what-if of 0 MW for the whole year (`toggleLine`, `app/src/ui/panel.ts`); partial holds come from
the what-if editor below it.

**The border panel (R-APP-3, R-BND-7).** For the year shown: per border and direction the average
capacity in use, the share of hours at the limit and the energy sent; the net flow and the
congestion rent (`summarise`, `app/src/engine/results.ts`); the day's average capacity each way and net flow, the way above zero written at the top of the plot
and the way below at its foot, each with the two countries' flags; and in a validation run the ENTSO-E A78 events and Nord Pool UMM messages of a day or longer
on that border, the two directions of one event as one label, the twelve longest by date
(`app/src/ui/attribution.ts`, R-LINK-6). The labels explain the profile; they do not change it.

**Effect on the opening scenario** (*0 SMR*, 2035, as the application opens — the neighbours' profile as published
times the owner's levels, D-194, §5.9; the lines' variants recomputed on 2026-11-25, with Finland at 75 €/MWh: since
D-344 of 2026-11-27 the opening reads 110.2, 110.0 and 110.3, and the variants below were not computed again). 108.1,
109.5 and 109.9 €/MWh (EE, LV, LT) with the lines as the panel sets them — EstLink 3 and the fourth EE–LV line off, as in S1; with both in
service 101.7, 100.6 and 103.5; with every cable at nameplate 107.5, 109.0 and 109.3; Lithuania–Poland no longer held
to Litgrid's plan changes nothing, its two AC lines making the plan's 1 200 MW. ERAA's NTC as given, which holds both
planned lines, is no state the page sets, and was not computed again.
(In each state below: the lines as the panel sets them, both planned lines in service, ERAA's NTC as given and every
cable at nameplate. On the owner's opening of D-182 to D-190 with the neighbours' profile re-priced, D-079, recomputed
on 2026-10-28 — with the record's gas price per net MWh, D-171, the Lithuania–Poland lines AC, D-170, and the cheaper
gas plant first, D-169, after D-105, which took Latvia's and Lithuania's offshore wind out, and D-107's factor on
Lithuania's onshore wind: 107.0 / 108.9 / 109.3, 100.9 / 99.3 / 102.9, 99.7 / 95.9 / 97.4 and 106.4 / 108.3 / 108.7.
On D-169 to D-171's opening, recomputed on 2026-10-23: 83.6 / 79.8 / 79.9, 76.2 / 73.7 / 73.6, 75.9 / 72.3 /
72.0 and 82.8 / 79.2 / 79.2. With the gas plants' one bid of D-164,
recomputed on 2026-10-23: 85.4 / 81.5 / 81.5, 77.0 / 74.3 / 74.1, 76.8 / 73.1 / 72.8 and 83.7 / 79.9 /
80.0. On D-115's register,
recomputed on 2026-10-18 as D-130 solves, D-131: 84.7 / 80.9 / 80.9, 76.4 / 73.9 / 73.6, 76.1 / 72.6 / 72.1 and
83.1 / 79.5 / 79.5; on the profile as published 69.3 / 65.3 / 65.3, 60.6 / 57.9 / 57.4, 61.8 / 58.8 / 58.4 and
67.3 / 63.4 / 63.3. Before
D-130's solver the same at one decimal, but as published 61.7 / 58.8 / 58.3 on ERAA's NTC and 67.3 /
63.3 / 63.3 at nameplate. On D-111 to D-114, before D-115: 84.8 / 81.1 / 81.1, 76.4 / 73.8 / 73.4, 76.2 / 72.7 / 72.2 and 83.3 /
79.7 / 79.7, as published 69.4 / 65.5 / 65.5, 60.6 / 58.0 / 57.4, 61.9 / 58.9 / 58.5 and 67.5 /
63.6 / 63.6. On D-111 to D-113 as proposed: 84.7 / 81.1 / 81.0, 76.3 / 73.8 / 73.4, 76.2 / 72.7 / 72.2 and 83.2 /
79.6 / 79.6, as published 69.3 / 65.5 / 65.5, 60.6 / 57.9 / 57.4, 61.8 / 58.9 / 58.4 and 67.4 /
63.6 / 63.6. Before D-111 to D-113, on D-109's register: 84.2 / 81.0 / 81.0, 76.3 /
73.9 / 73.4, 75.8 / 72.4 / 71.9 and 82.8 / 79.6 / 79.6, as published 68.9 / 65.3 / 65.3, 60.4 /
58.0 / 57.4, 61.5 / 58.7 / 58.2 and 67.2 / 63.5 / 63.5. Before D-109, on D-106's register: 84.1 / 80.9 / 80.9, 76.2 / 73.9 / 73.4, 75.7 / 72.4 / 71.8 and
82.7 / 79.5 / 79.5, as published 68.9 / 65.2 / 65.2, 60.4 / 57.9 / 57.3, 61.5 / 58.6 / 58.1 and
67.1 / 63.4 / 63.4. Before D-107, after D-105 and D-106: 80.3 / 74.9 / 74.9, 73.3 / 69.7 / 68.9, 72.2 / 67.5 / 66.7 and
79.2 / 74.1 / 74.1, as published 65.3 / 60.0 / 60.0, 58.0 / 54.6 / 53.8, 58.2 / 54.3 / 53.6 and
63.8 / 58.7 / 58.7. Before D-105 and D-106, on the register of D-078
after ERRATA E-099: 72.7 / 58.2 / 58.3, 67.7 / 55.5 / 56.0, 66.0 / 52.8 / 53.0 and 72.3 / 58.3 /
58.4, as published 58.3 / 46.0 / 46.0, 53.3 / 43.3 / 43.4, 52.7 / 42.1 / 42.1 and 57.5 / 45.6 /
45.6; before E-099 58.2 / 45.9 / 45.9 and 52.6 / 42.1 / 42.1 for the first and third. Before D-076, after D-073 and D-074: 57.6 / 45.3 /
45.3, 52.9 / 42.9 / 43.1, 52.2 / 41.7 / 41.7 and 56.9 / 45.0 / 45.0 — the difference is the
refitted markup of the Latvian and Lithuanian gas, 0.5 of it, and the batteries' Δ, 0.1, §7.2. After D-073 alone, with Auvere still must-run:
55.9 / 44.6 / 44.6, 51.7 / 42.4 / 42.7, 51.1 / 41.1 / 41.1 and 55.4 / 44.4 / 44.5. On the register
before it, after D-070 and D-071: 56.9 / 45.5 / 45.6, 52.0 / 42.7 / 42.9, 51.6 / 41.6 / 41.6 and
56.1 / 45.1 / 45.1 — with the markup that Estonia's gas no longer carries, §7.2. Before D-070 gave
the Daugava the record's water: 59.8 / 49.2 /
49.2, 53.7 / 45.3 / 45.2, 53.9 / 44.5 / 44.4 and 58.5 / 48.3 / 48.3; with the water and no band,
between the two decisions: 55.4 / 44.3 / 44.5.) Lifting Litgrid's plan from LT-PL changes nothing in this scenario. (At M5 the
application opened on ERAA's fleets, and these figures were 44.5, 44.8 and 44.9 against 49.2, 48.3
and 48.2 on ERAA's NTC.)

### 9.1 Adequacy (taken out; D-320, D-328)

Until 2026-11-25 an Adequacy view drew random years of forced outages — each HVDC cable's short trips and long
failures, the units of oil shale, gas and nuclear plant — and ran each through the engine of record, giving the
spread of the annual price, the hours at the price cap and the energy not served. The view was taken out (D-320) and
the sampler with it (D-328): no figure of the site used either. A line's fault is tried with the what-ifs above
(R-LINK-4): a line held at a chosen MW from one day to another, or out all year. The statistics the sampler read
— each cable's trips, the long failures' rates and repair times, the units' forced-outage rates — stay in the
presets with their sources.

## 10. Nuclear and the contract (M6; R-SMR-1 … R-SMR-8, R-APP-4, R-APP-11, R-LINK-7; DECISIONS D-036, D-037)

**The plant (R-SMR-1, R-SMR-2, R-SMR-4).** Units of 315 MW, the BWRX-300's gross power (GE Vernova Hitachi's
general description, p. 53), at the owner's choice of 2026-10-27 (D-189); from D-011 to D-189 they were 300 MW, its
net output to grid (Table 21-2, p. 123). Each unit takes one planned
outage of 336 h a year — OPEN-6's default, in effect since no other value was set by M6 — in the
window where the surplus of fixed and renewable output over demand is largest, at least 168 h from
another unit's (`smr.ts`, pre-clearing data only). Under a plain contract the plant bids all it has
available at the market's floor, −600 €/MWh (R-PAR-2), and so runs unless the price falls to the floor
itself (D-150; a fixed output until then, the same output to the megawatt-hour on every set the site
computes); under the negative-price clause its minimum stable load (50 %, OPEN-6's default) is
must-run and the rest bids 0.01 €/MWh (`build.ts`, `CLAUSE_BID`). The model prices no hour below the renewables'
bid of 0 (R-PAR-3): its hours "at or below 0" are the hours at that zero — up to the plant's clause
bid with the LP's perturbation, 0.011 €/MWh (`ZERO`), so that the hours the plant prices itself as
it turns down count as well as those wind and solar price at their 0 (ERRATA E-052) — and under the
clause the plant turns down where wind and solar alone clear, and the account settles those hours at
the market price. On the
2 SMR scenario of 2009 the clause takes its output from 5.31 to 5.05 TWh on the owner's opening with units of 315
MW (D-182 to D-189; 4.96 and 5.05 in 1995 and 2008); from 5.05 to 4.82 TWh with the record's gas price per net MWh,
D-171, as with the gas plants' one bid, D-164 (4.75 and 4.81 in 1995 and 2008; 4.81 in 2009, 4.75 and 4.81 in 1995 and 2008 on D-115; 4.82, 4.75 and 4.81 on D-111 to D-114, as on D-111 to D-113; 4.75 and 4.82 with the neighbours' profile re-priced, D-079,
since D-107; 4.80, 4.70 and 4.78 after
D-105 and D-106; 4.77, 4.62 and 4.72 before them; 4.76, 4.61 and 4.72 on the profile as published, before them; 4.77, 4.62 and 4.72 after D-074; 4.73, 4.55 and 4.67 while Auvere
ran as must-run). In the scenario view
the units come on top of the one base the scenarios share (§8.1, D-151).

**The contract account (R-SMR-3, R-SMR-6; `app/src/engine/contract.ts`).** For strike S and the
plant's hourly output q_h on the run with the plant — so that the plant's own depression of the
Estonian price is inside the figure — what the state pays in a year under: (a) a two-sided CfD
settled hourly, Σ_h (S − p_h)·q_h; (b) the same settled on each month's simple average price,
Σ_m (S − p̄_m)·Q_m; (c) a collar settled hourly, (80 − p_h)·q_h paid below 80 €/MWh and
(p_h − 100)·q_h paid back above 100; (d) the collar 70–110. With the clause (v4 D-061), an hour
priced at or below 0 settles at the market price and leaves (b)'s average and volume. Until D-294 a
card of the Model view (`app/src/ui/contract.ts`, gone with it) showed each design's cost weighted over the years and
each year's, the operator's income per MWh (the market revenue and the difference paid), and the settlement periods
in which each side paid; above them the plant's output, capacity factor and capture price. The strike was a control,
40–160 €/MWh, which a pointer snapped to and a red dashed line marked under the knob since D-211, and the clause a
choice; the card showed the four designs of the clause chosen — the specification's eight rows are those four with
and without the clause (ERRATA E-029). The owner took the card out (D-294). The page now shows design (a) alone: the
row "Contract for difference" of the sensitivities' table, at the state's strike (`statePaysOf`,
`app/src/ui/results.ts`; below), and the deck's slide on the plant's account (`app/src/ui/deck.ts`). The strike,
default 90 €/MWh (the owner's), and the clause are held in the state and the scenario text, with no control on the
page. The strike moves no dispatch: another strike is computed on the page from the stored runs (R-APP-4). The clause
changes the plant's dispatch, so another clause runs the three scenarios with the plant again. Designs (b) to (d)
remain in `contract.ts`, called by nothing on the page.

**The price level the contract settles on.** A contract's cost moves with the average price, and
the register is fitted on the hourly MAE (§7.2). The MAE fits the median of a right-skewed price,
and the replays' average sits below the record by 1.6–6.6 €/MWh in 2023–2026 with the one bid (EE / LV / LT
2024 −3.7 / −5.6 / −5.6, 2026 −6.6 / −4.5 / −4.5, as the Calibration view shows them; 1.2–6.5 on D-115's register). It sits above the record by
11–16 in 2020–2021, the
years of cheap neighbours. The lean is the year's, not a constant the markup can take out. Fitted on
the MAE and the average bias, the register halves the fit years' lean but fits their hours 8.3
€/MWh worse and turns 2025's into +5. Fitted on the MAE and the duration curve, it fits the hours
1.8 worse. Either would raise the opening scenarios by only 0.4–1.2 €/MWh (the calibration round of
2026-10-11, `docs/research/2026-10-11_calibration_round.md`). Read the scenarios' average price with
a level uncertainty of a few euros; in the replays of 2023–2026 the lean ran low.

**Who sets the price (R-SMR-5; DECISIONS D-037).** The scenarios report the share of
Estonia's hours with a fossil price. An hour's price is set by the offer running part-loaded at it —
in the zone, or in a zone the links do not part from it in price, the zone's own first (`view.ts`,
`marginal`; v4's price-setter tag) — and, where there is none, by storage, the Daugava, shedding or
spilling. The hour counts when that offer is a Baltic gas or oil-shale plant, or a neighbour's
import or export at or above the cost of the most efficient gas plant of the market model behind
the neighbours' profile, on that model's own gas blend and CO₂ price: 90.4 €/MWh for Distributed
Energy 2035 (§5.9; with the profile re-priced, from D-079 to D-194, the same plant on the run's prices, 132.8). For
National Trends, National Trends+ and the actual prices the level is a combined-cycle plant on
TYNDP 2024's price matrix, 87.7 €/MWh, the nearest documented. The neighbours' plants are not
modelled (R-BND-1), so their side is an estimate, and it counts gas plants only: the hours a
neighbour's electrolyser prices at the cost of hydrogen from gas follow gas and CO₂ too and are
not in it. On the opening state of D-169 to D-171 about seven Estonian hours in ten took a neighbour's price (not
measured again on the owner's opening, whose neighbours stand at the owner's levels; the Model view's row gives the
share of hours with a fossil price for the state shown); the
fossil share is 9.7 % for *0 SMR*, 8.0 % with one unit, 6.1 % with two and 3.5 % with
three (when each unit replaced 300 MW of gas, before D-151 and on an earlier register), of which a neighbour's price makes up 5.0, 4.4, 3.6 and 2.4 points — on the re-priced
profile the application opened with from D-079 to D-194, whose fossil level was 132.8 €/MWh; on the profile as
published, at its level of 90.4, 9.9, 8.3, 6.3 and 3.7 % with 7.5, 6.6, 5.2 and 3.2 points
(`spikes/neighbour-fuel/fossil.ts`, on the register of D-076 and D-077; 9.8, 8.1, 6.2 and 3.7 % with 7.1,
6.4, 5.2 and 3.1 points after D-073 and D-074: Estonia's gas
without the markup it carried sets the price in more hours, and without Auvere's must-run output
the plant's scenarios keep more hours at a neighbour's gas price. After D-073 alone: 9.3, 7.3, 4.5
and 2.1 %; on the register before it 8.2, 6.8, 4.3 and 1.9 % after ERRATA E-064, and 9.4, 7.6,
4.9 and 2.3 % on the level of 87.7 that every profile took until then; at D-037 13.4, 7.4 and
3.3 %).

**The sensitivities in every scenario (R-APP-11, R-SMR-5; D-184, D-188, D-195).** Each of the owner's four price
pairs of LNG and CO₂ runs for every scenario, the one shown first. Since D-195 they are one table (§8, "The standard
sensitivities"): a column per pair, Estonia's average price without the plant and with one or two units (three too until D-343), under each
the share of the year in which a Baltic gas plant set Estonia's price, and for the units, as since D-188, the fall of
Estonia's average price against *0 SMR* at the same pair times Estonia's demand, what the state receives or pays under
the contract (a) at the strike, and the two together, M€ a year (§8.1). From D-184 to D-195 a card per pair gave
Estonia's average price in each scenario with its change against the same scenario's headline, the money table under
the cards since D-188. Until
D-184 each of the five sensitivities ran for the scenario shown and *0 SMR*, the card giving the plant's effect
within the sensitivity. The sets are kept per scenario for the settings they ran with, so showing another scenario
runs nothing twice (`main.ts`, `runSensitivities`).

**Forced outages (R-SMR-2).** The plant's units have their planned outages only: the random forced outages the
Adequacy view drew were taken out with it (§9.1).

**Publication (R-SMR-8).** The official state — 0 SMR — opens the view; results with the
plant are released with the validation as it stands, at the owner's decision (D-123). A banner at the top of
every page said so until D-201 took it off; the exports' gate line says so still, and the Calibration page gives the
gates with their verdicts (§8).

## 11. Deployment and verification (M7; R-DEP-1 … R-DEP-5, R-ENG-7, R-NFR-2; DECISIONS D-039, D-085)

**The site is `https://energiamudel.ee`**, public from 2026-10-17 (D-125), behind HTTP Basic Auth from 2026-10-26 (D-178)
and open to everyone again since 2026-11-25 (D-318): the document root
`htdocs/`, where v3 stood; v3 3.5.0 is archived at `v3.energiamudel.ee`, behind v3's own password (v3's
ADR-035). From D-085 to 2026-10-17 v5 was staged at `energiamudel.ee/v5` behind that password; before D-085
nothing was deployed (D-039). The build is relative (`base: "./"`), so it runs under any path.
`app/public/.htaccess` goes with the build: the redirects of the former staging path `/v5` to the root
and of v3's Data page `/stat/` to the archive, and v3's caching — the hashed JavaScript, CSS,
WebAssembly and fonts immutable, the page, the data files and the manifest revalidated on every
load (R-DEP-4); `npm run site` fails without it. `make deploy` runs the gate of R-DEP-2 first —
`make ci` (tests, lints, the
golden fixture, the contract types, the built site) and the provenance checks of `db.check --fast`
— then keeps the site as it stands for a rollback in `data/raw-aside/live-<commit>/` (ignored by git,
named by the commit its opening view was built from) and lists with `compare_sets` which of its sets the
deploy changes, sends `app/dist/` with `rsync --delete` to `DEPLOY_TARGET` (the owner's, from the
environment, never committed) and compares the deployed site with the build over HTTPS
(`validate/deployed.py`, R-DEP-5): the deployed `data/manifest.json` with the build's, then every file of
`app/dist` byte for byte, `.htaccess` aside, the site's answer to a reader, 200 since D-318 (401 while the site
was shut), and the security headers its page comes with (D-331). Last it copies what went up for use without the network (`make offline`, D-145).
These steps the deploys of 2026-10-27 to 2026-11-11 ran from a script of their own beside `make deploy`; they are
its own since 2026-11-12. `make live-check` reads the live site again in the same way and then shows its pages in
Chromium and WebKit — every view, the browser store's round trip, no page error; the Presentation page's charts too
until that page went, D-249 (`spikes/page-speed/browser_check.py`, ERRATA E-191) — with a Python that has Playwright,
which is no dependency of the repository. From D-179 to D-331 the site had a way in without the password for the
team's tools page, a token posted to `sso.php`; with the site open since D-318 it let into nothing and was taken
out, and the checks fetch the site as any reader does (`DEPLOY_AUTH`, user:password, still logs in where a site is
shut). The site's `.htaccess` sends four security headers with every answer — HTTPS only, the declared content
type, no framing by another site, a short referrer — and the deploy's check fails without them (D-331). The
rollback copy leaves `.htaccess` out, and a rollback sends a copy back with the same exclusion, its files made
readable to all first (E-169).
`DRY_RUN=1` sends nothing; it keeps the copy and lists the sets the deploy would change. On 2026-09-29 `make deploy DRY_RUN=1` stopped at `make validate`: R-VAL-5 is not met, so
no build was deployable (ERRATA E-049); since D-085 the deploy behind the password does not wait for
R-VAL-5, and opening the site to the public waited for the owner's acceptance of the validation as
it stands (D-123). v3's production workflow writes `v3.energiamudel.ee`'s root since v3's ADR-035,
never `htdocs/`.
The deployment runs where the database is — the owner's machine — since the provenance checks read
it; `.github/workflows/ci.yml` (`make ci` on every push) was inert until 2026-11-25, when the remote came
(R-PUB-6): the public repository `github.com/andresingerman/energiamudel-baltic` (D-329, D-332), which receives
snapshots of the tree made by `make public` (D-324). The workflow runs on each push there, and no workflow deploys.

**Time on the built site (R-ENG-7, R-NFR-2).** `vite preview` of `app/dist/` on the development
machine (8 cores, so four workers): the opening view's nine runs — three scenarios on three
climate years — in 11.0 s on first load, with the solver's WebAssembly and each worker's year files
fetched cold, then 5.2 s for the nine (5.9 s with the negative-price clause) once they are cached:
1.7–2.0 s per set of three years against R-NFR-2's 6 s. (Measured before D-058; with *1 SMR* the
opening view has twelve runs, 5.8 s in the development server once cached. On D-112 and D-113,
15.7–16.4 s on the built site once cached, about 9 before them; with each year's weeks on seven
workers, D-114, 11.3 s: §8.) Since D-126 the opening view shows without a run: the cards 1.9 s after the
load in `vite preview`, the 2.8 MB file fetched and decoded; a change of a control computes the twelve
years in 11.9 s. Measured again on 2026-10-18 in a headless Chrome over the DevTools protocol
(`spikes/site-timing/measure.ts`; the app's own browser pane is throttled while the screen is idle):
the opening view 0.7–0.9 s after the navigation; a change of Finland's level computed the table in
11.1–11.4 s with 0 SMR shown, 10.8–10.9 s with 2 SMR shown, 12.3 s on the first change after
the page opened, and the sensitivities in 21.8–22.2 and 32.1–32.2 s. With the scenario shown first
(D-127), its cards come after 3.8–3.9 s, 3.7–3.8 s and 4.6 s, the table and the sensitivities as
before; with the second clearing pipelined and the workers warmed (D-128), after 3.2–3.3 s,
3.4–3.6 s and 3.9 s, the table after 11.0–11.1 s; solved as D-130 solves (D-131), after 1.4–1.7 s,
1.5 s and 2.1 s, the table after 4.2–4.6 s and the sensitivities after 8.9–9.1 and 13.4–13.6 s. The presentation's states (D-129) show their cards
after 0.3 s and their sensitivities after 0.4–0.6 s; another scenario's sensitivities after 0.04 s.
Measured on 2026-11-10 in Playwright's headless Chromium (`spikes/page-speed/`, seven workers; the four scenarios of
D-151 and the sixteen sensitivity sets of D-184): a change of Finland's level shows the scenario shown after
1.5–2.0 s, the table after 4.3–4.9 s and the sensitivities after 27–31 s; the opening view's cards come 0.56–0.68 s
after the navigation on the site of that day and 0.28–0.43 s with the sets as packs (D-236). What the page no longer
computes a second time is in §8, "What the page keeps".

## References

Checked against Crossref on 2026-09-25 where SPECIFICATION §17.2 marked them "verify"
(`docs/research/2026-09-25_crossref_check.md`, ERRATA E-037); the numbers are the
specification's.

- [L6] Ergemen, Y.E., Haldrup, N., Rodríguez-Caballero, C.V. (2016). Common long-range dependence in a panel of hourly Nord Pool electricity prices and loads. *Energy Economics*, 60, 79–96. https://doi.org/10.1016/j.eneco.2016.09.008
- [L7] Rinne, S. (2019). Radioinactive: Do nuclear power plant outages in France affect the German electricity prices? *Energy Economics*, 84, 104593. https://doi.org/10.1016/j.eneco.2019.104593
- [L8] Keles, D., Dehler-Holland, J., Densing, M., Panos, E., Hack, F. (2020). Cross-border effects in interconnected electricity markets – an analysis of the Swiss electricity prices. *Energy Economics*, 90, 104802. https://doi.org/10.1016/j.eneco.2020.104802
- [L9] Beran, P., Pape, C., Weber, C. (2019). Modelling German electricity wholesale spot prices with a parsimonious fundamental model – Validation & application. *Utilities Policy*, 58, 27–39. https://doi.org/10.1016/j.jup.2019.01.008
- [L11] Unger, E.A., Ulfarsson, G.F., Gardarsson, S.M., Matthiasson, T. (2017). A long-term analysis studying the effect of changes in the Nordic electricity supply on Danish and Finnish electricity prices. *Economic Analysis and Policy*, 56, 37–50. https://doi.org/10.1016/j.eap.2017.06.001
- [L12] Stiewe, C., Xu, A.L., Eicke, A., Hirth, L. (2025). Cross-border cannibalization: Spillover effects of wind and solar energy on interconnected European electricity markets. *Energy Economics*, 143, 108251. https://doi.org/10.1016/j.eneco.2025.108251 (corrigendum: *Energy Economics*, 155, 109167, 2026, https://doi.org/10.1016/j.eneco.2026.109167)
- [L25] Brown, T., Neumann, F., Riepin, I. (2025). Price formation without fuel costs: The interaction of demand elasticity with storage bidding. *Energy Economics*, 147, 108483. https://doi.org/10.1016/j.eneco.2025.108483 (preprint arXiv:2407.21409, https://doi.org/10.48550/arXiv.2407.21409)
- [L26] Ikechi Emmanuel, M., Denholm, P. (2022). A market feedback framework for improved estimates of the arbitrage value of energy storage using price-taker models. *Applied Energy*, 310, 118250. https://doi.org/10.1016/j.apenergy.2021.118250 (the first author's surname as Crossref records it)
- [L27] Brijs, T., Geth, F., Siddiqui, S., Hobbs, B.F., Belmans, R. (2016). Price-based unit commitment electricity storage arbitrage with piecewise linear price-effects. *Journal of Energy Storage*, 7, 52–62. https://doi.org/10.1016/j.est.2016.05.005
- [L28] Veenstra, A.T., Mulder, M. (2025). Profitability of batteries in day-ahead and intraday electricity markets: Assessment of operation strategies with endogenous prices. *Energy Economics*, 148, 108608. https://doi.org/10.1016/j.eneco.2025.108608
- [L29] Torralba-Díaz, L., Schimeczek, C., Kochems, J., Hufendiek, K. (2024). Iterative coupling of a fundamental electricity market model and an agent-based simulation model to reduce the efficiency gap. *Energy*, 310, 133192. https://doi.org/10.1016/j.energy.2024.133192
- [L30] Zakeri, B., Syri, S. (2016). Value of energy storage in the Nordic Power market – benefits from price arbitrage and ancillary services. *13th International Conference on the European Energy Market (EEM)*, 1–5. https://doi.org/10.1109/EEM.2016.7521275
- [L31] Mirzaei Alavijeh, N., Khezri, R., Mazidi, M., Steen, D., Le, A.T. (2025). Profit benchmarking and degradation analysis for revenue stacking of batteries in Sweden's day-ahead electricity and frequency containment reserve markets. *Applied Energy*, 381, 125151. https://doi.org/10.1016/j.apenergy.2024.125151 (matched on the title; confirm before citing for a number)
- [L32] Paulauskas, N., Kapustin, V. (2024). Battery scheduling optimization and potential revenue for residential storage price arbitrage. *Batteries*, 10(7), 251. https://doi.org/10.3390/batteries10070251
- [L33] Karkossa, L., Saretta, M., Gullach, F.E., Victoria, M. (2026). Can optimal dispatch models recreate reality? A retrospective analysis of Europe's 2022 energy crisis using PyPSA-Eur. *22nd International Conference on the European Energy Market (EEM)*, 1–6. https://doi.org/10.1109/EEM68581.2026.11589899
- [L34] Mendes, C., Staffell, I., Green, R. (2024). EuroMod: Modelling European power markets with improved price granularity. *Energy Economics*, 131, 107343. https://doi.org/10.1016/j.eneco.2024.107343

