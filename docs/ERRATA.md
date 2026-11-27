# Errata

Append-only (SPECIFICATION.md R-DOC-3). Every error found — in code, data, documents, or a
statement made to the owner — with the day it was found, its effect on results, and, once
fixed, the commit or decision that fixed it. Entries are never deleted.

## E-001 — The Stage 2 gate names two Stage 4 deliverables

**Found:** 2026-09-24 · SPECIFICATION.md §14 · **Status:** fixed in SPECIFICATION revision 1.1

The Stage 2 gate reads "export ≤ 3 MB per year; schema validated". The export and the JSON
Schema are milestone M1 of Stage 4 (same table). Stage 2 cannot meet them without designing the
data contract before the plan of Stage 3. **Effect on results:** none. **Handling:** Stage 2 is
closed on the data it owns (lineage, register, database, checks); the export and schema stay in
M1. The next revision of the specification moves the two items.

## E-002 — R-TIME-5 compares years that PECD does not have

**Found:** 2026-09-24 · SPECIFICATION.md R-TIME-5 · **Status:** fixed by D-005; text in SPECIFICATION revision 1.1

R-TIME-5 compares observed and PECD capacity factors "for the same calendar years 2020-2025";
PECD 3.1 (TYNDP 2024) covers climate years 1982-2019 only. **Effect:** none yet (Stage 2 runs
the comparison). **Fix:** D-005, overlap years 2015-2019.

## E-003 — The default of OPEN-8 cannot give three climate years

**Found:** 2026-09-24 · SPECIFICATION.md §15 OPEN-8, D3, R-BND-5 · **Status:** SPECIFICATION revision 1.1 sets a feasible default (Distributed Energy 2035); the owner kept it in revision 1.3 (D-011)

OPEN-8 defaults the 2035 boundary profile to National Trends. TYNDP 2024 publishes National
Trends market-model outputs for climate year 2009 only (2030 and 2040); Distributed Energy and
Global Ambition are published for 1995, 2008 and 2009 (2035, 2040, 2050). A National Trends
profile therefore cannot be weather-coherent with Baltic climate years 1995 and 2008, which D3
and R-BND-5 require. **Effect:** none yet; Stage 2 parses all scenarios into `tyndp_price`.
**Handling:** returned to the owner with the options (DECISIONS.md, end of Stage 2).

## E-004 — Two v4 document links are dead since Elering's website moved

**Found:** 2026-09-24 · v4 `data/documentary/*.csv` · **Status:** fixed

The Elering documents behind 41 imported rows — the transmission development plan 2025-2034 and
the security of supply report 2025 — answer HTTP 404 at their `elering.ee/sites/default/files`
addresses; the site moved to a new host. The 2025 report is on Elering's new file host; the
2025-2034 plan was removed (Elering now publishes the 2026-2035 plan) and is read from the
Internet Archive copy of 2025-08-27. **Effect:** none on values; a reader could not open the
cited page. **Fix:** `pipeline/sources/documents.py` caches both with their working and their
original address.

## E-005 — v4 did not cache most documents its person-read rows cite

**Found:** 2026-09-24 · v4 `data/raw/doc`, v4 README · **Status:** fixed

v4's README says the published PDFs read by a person are kept in `data/raw/doc`. Of the ten
documents behind the person-read rows now in v5's scope, one was cached (Svenska kraftnät LMA
2026). **Effect:** the page citations could not be checked against the edition that was read.
**Fix:** `pipeline/sources/documents.py` caches every cited document with a lineage record;
db/build.py links each page record to its document's record (`derived_from`).

## E-006 — TYNDP CO2 factors of the gas classes were read one column to the left

**Found:** 2026-09-24 by the re-extraction check (`validate/documentary_tyndp.py`) · imported
from v4 `data/documentary/tech_parameters.csv` · **Status:** fixed

In sheet 'CO2 emission factor' of the TYNDP 2024 CO2-factor workbook the columns are E
'Original', F 'NT2030', G 'NT2040'. For the ten gas classes (10_gas … 19_gas) the rows
`co2_factor_nt2030` held column E and `co2_factor_nt2040` column F: 57.0 and 51.574 kg/GJ
instead of 51.574 and 43.040 (5.7 and 5.157 instead of 5.157 and 4.304 for the CCS class). The
file's values are 57 x the National Trends biomethane shares of its 'Gas Blend' sheet (0.905 in
2030, 0.755 in 2040). **Effect:** a model reading these rows overstates gas CO2 by 10.5 % in 2030
and 19.8 % in 2040. v5 has no results yet; v4 read these rows (check v4 before quoting its gas
bids). **Fix:** the twenty values corrected; the check now passes.

## E-007 — The Lithuanian electrolyser efficiency is not in the Lithuanian workbook

**Found:** 2026-09-24 by the re-extraction check · v4 `scenarios.csv` · **Status:** fixed (note)

`pemmdb_nt_2030/2040, LT, efficiency.electrolyser = 0.68` cites the PEMMDB Electrolyser sheet,
but the LT00 workbooks leave the average efficiency at 0 (2030, 2040, 2050); 0.68 is the value
of FI00, SE01-SE04 and DE00. **Effect:** none on the value; the provenance was wrong. **Fix:**
the note says where 0.68 comes from; the check reads the FI00 workbook for these two rows.

## E-008 — The DEA technology data were labelled with the wrong price base and edition

**Found:** 2026-09-24 by the re-extraction check · v4 `tech_parameters.csv` · **Status:** fixed

The 140 `dea_2025` rows said "DEA data sheet May 2025 … 2015 EUR". The cached workbook is
version 0019 (amendment log to 2026-08-26; the cited sheets unchanged since 2023-08-23) and its
costs are in 2020 EUR (`alldata_long` priceyear 2020; sheet 'Intro' D12). **Effect:** a model
that deflated these costs from 2015 would overstate them by the 2015-2020 inflation (about
7 %). **Fix:** notes corrected. The three zero costs of the light-oil OCGT (no reference in the
source) are now noted as "not estimated, not a zero cost".

## E-009 — The light-fuel-oil CO2 factor was the kerosene factor

**Found:** 2026-09-24 by the re-extraction check · v4 `tech_parameters.csv` · **Status:** fixed

`statfi_2025, light_fuel_oil, co2_factor = 73.2` cites code 11.30.10, which Statistics Finland
names "Kerosene (Jet fuel)". Light fuel oil is gasoil, 11.30.40/11.30.50: fossil 68 + biogenic 5
(the Finnish blend), combined 73 t/TJ. **Effect:** 0.3 %. **Fix:** two rows, both code 11.30.50:
`co2_factor` 68.0 (the fossil column, which the re-extraction check reads for every fuel) and
`co2_factor_total` 73.0 (fossil + biogenic: the factor of unblended fossil gasoil, which a Baltic
plant burns).

## E-010 — The Eesti Energia oil-shale analysis is dated wrongly

**Found:** 2026-09-24 by the page check · v4 `tech_parameters.csv`, `pipeline/sources/
documents.py`, SPECIFICATION.md R-SUP-4 and §17.1 · **Status:** fixed in data and in
SPECIFICATION revision 1.1

ERR News published the analysis on 2025-03-20, not 2025-02-13, and says the pulverised-firing
units run 60-80 hours a year (not "in 2024"). **Effect:** none on values. **Fix:** citations
and the document title corrected.

## E-011 — Litgrid's transfer-capacity table spans two pages

**Found:** 2026-09-24 by the page check · v4 `links.csv` · **Status:** fixed

Table 4.4.3 of Litgrid's plan 2026-2035 starts on p. 53 (caption, header, LT>LV row) and
continues on p. 54 (LV>LT, LT>PL, PL>LT, LT>SE, SE>LT). Fifty rows cited p. 53. **Effect:** none
on values. **Fix:** "pp. 53-54".

## E-012 — The price cap is 4 000 €/MWh, not 5 000

**Found:** 2026-09-24 by the page check · SPECIFICATION.md D17, R-PAR-1, §17.1 · **Status:**
fixed in data and in SPECIFICATION revision 1.1

R-PAR-1 sets VOLL = 5 000 €/MWh, "+5 000 from trading date 2025-09-20", citing an EPEX SPOT item.
That item is of 2022-08-23 and announced +5 000 from 2022-09-20; on 2022-09-13 the NEMOs suspended
the increase and the cap stayed at +4 000 (EPEX SPOT, cached as `epex_hmcp_4000_remains`). ACER
Decision 02/2026 (Annex I of 2026-02-04, Art. 3(1), p. 5) sets the reference maximum at +4 000
€/MWh, raised by 500 when a price exceeds 70 % of it in two market time units on two days within
30 days; no increase was announced by 2026-09-24. The floor of R-PAR-2 (−600 from 2026-05-28)
is right. **Effect:** none yet; a cap of 5 000 would overstate scarcity prices by 25 % in any
hour at the cap. **Fix:** `parameters.csv` `market.price_cap_eur_mwh` = 4000 from Annex I.

## E-013 — R-LINK-3's LitPol limits are Litgrid's, in the other direction

**Found:** 2026-09-24 by the page check · SPECIFICATION.md R-LINK-3, Appendix A.2 · **Status:**
fixed in data and in SPECIFICATION revision 1.1

R-LINK-3 gives "PSE plan: 365/200 MW in 2026, 500/353 MW in 2027 for PL→LT / LT→PL". The cached
PSE document (created 2017-06-02) explains the allocation constraint with illustrative cases and
states no plan. The figures are in Litgrid's plan 2026-2035, table 4.4.3 (pp. 53-54): LT→PL 365
(2026), 500 (2027-2030), 1 200 (from 2031); PL→LT 200, 350, 1 200. The specification swaps the
directions and prints 353 for 350. **Effect:** none yet; the swapped direction would open 165 MW
too much import from Poland in 2026. **Fix:** `links.csv` carries Litgrid's rows (verified); the
PSE examples are not imported into `parameters.csv`.

## E-014 — The circulating-fluidised-bed class is 386 MW, and its source was Wikipedia

**Found:** 2026-09-24 by the page check · v4 `tech_parameters.csv` (D-062), SPECIFICATION.md
R-SUP-4 · **Status:** fixed in data and in SPECIFICATION revision 1.1

`oil_shale_cfb` = 400 MW was Balti 185 MW (Enefit's plant list, which gives the plant, not the
unit) plus 215 MW for Eesti unit 8 from et.wikipedia.org. ENTSO-E's production and generation
units (A95) register Balti TG11 at 192 MW and Eesti TG8 at 194 MW on 1 January of every year
2020-2026: 386 MW. That these two are the fluidised-bed units is stated by Eesti Energia's press
release of 2004-09-15 (Internet Archive copy, `eesti_energia_balti11_cfb`). **Effect:** 14 MW
moves from the 110 €/MWh class to the ≥ 200 €/MWh class. **Fix:** the row reads A95
(`entsoe.A95.EE.2026`); `validate/documentary.py` re-reads it on every run.

## E-015 — The SMR unit size: 315 MW is GE Vernova's gross output

**Found:** 2026-09-24 by the page check · SPECIFICATION.md D6, R-SMR-1, OPEN-1 · **Status:**
text fixed in SPECIFICATION revision 1.1; the owner chose 300 MW net in revision 1.3 (D-011)

R-SMR-1 labels 315 MW an "owner's assumption" against GE Vernova's 300 MWe net. The same GE
Vernova document (005N9751 Rev. J) states both: gross ~316 MWe (Table 2-1, p. 28) or ~315 MWe
(p. 53), net to grid ~300 MWe with 10-30 MWe in-house consumption (Table 21-2, p. 123). The day-
ahead market sees the net output. **Effect:** three units at 315 instead of 300 MW put 45 MW
(5 %) more into the Estonian market in every running hour. **Handling:** returned to the owner
(OPEN-1): 315 as the gross figure it is, or 300 net.

## E-016 — The climate-year weights were read from a draft

**Found:** 2026-09-24 · SPECIFICATION.md R-TIME-3, §17.1 · **Status:** fixed in data and in
SPECIFICATION revision 1.1

The weights 0.233 / 0.367 / 0.400 were cited from the TYNDP 2024 Implementation Guidelines
"Draft version | 04 March 2024" (p. 9). The version for ACER's, the Commission's and the Member
States' opinion of 2025-04-09 prints the same weights (p. 12, section 3.1). **Effect:** none on
values. **Fix:** `parameters.csv` cites the 2025 version (`tyndp2024_ig_opinion`).

## E-017 — The ERAA 2025 methodology file is ENTSO-E's proposal text

**Found:** 2026-09-24 by the page check · `pipeline/sources/documents.py`, SPECIFICATION.md
§17.1 · **Status:** fixed (label)

The file ACER publishes as "Annex Ic Methodology" of Decision 06/2026 is headed "ENTSO-E's
proposal for ACER's approval, Annex 2 – Methodology", and its printed page numbers are one
lower than the PDF's. The defaults read from it (HVDC forced-outage rate 6 %, HVAC 0 %, repair
time 7 days) are those of the annexed text. **Effect:** none on values. **Fix:** citations name
the printed and the PDF page.

## E-018 — Two imported rows had no source for their value

**Found:** 2026-09-24 by the page check · v4 `scenarios.csv` · **Status:** fixed

`elering_base_2035, EE, capacity.coal_gas` = 78 cited Enefit's web page, which states no
capacity; the value is ENTSO-E A68 for 2026 (78.4 MW). The TYNDP 2024 PEMMDB workbook of Latvia
states 1 592 MW of pondage (the Daugava cascade) for 2030 and 2040, but the imported
`pemmdb_nt_2030/2040` rows had no Latvian hydro, so that preset would have run Latvia without
the Daugava. **Effect:** the TYNDP preset of Latvia lacked 1 592 MW of hydro. **Fix:** the
coal-gas row reads A68 (`entsoe.A68.EE.2026`, re-read by code); two pondage rows added and
re-extracted by `validate/documentary_tyndp.py`.

## E-019 — The history of Nord Pool's bidding curves is paid, not free

**Found:** 2026-09-24 in the Data Portal · SPECIFICATION.md R-DATA-10, R-BND-6, R-SUP-6, OPEN-4,
OPEN-10, Appendix A.2 and A.3, §17.1 · **Status:** fixed in SPECIFICATION revision 1.1; access is
the owner's decision (OPEN-10): research terms are asked for first, the paid API only if they are
refused (revision 1.3, D-011)

Revision 1.0 assumed the curves could be viewed through a free Data Portal registration. The
portal shows the aggregated bidding curves of the latest delivery day without login; any
earlier day (tested: 2025-01-15 and 2026-09-22) answers "You need to be logged in to view this
data". The login is sold as a subscription (2026: SOLO €1 200 per calendar year for one user,
up to ENTERPRISE €9 000), with special terms for trading members, students, researchers and
academic entities on inquiry; the sign-in page offers no registration. **Effect:** the FI slope
of R-BND-6 cannot be re-estimated and the markup cross-check of R-SUP-6 cannot be run without
access. **Fix:** both steps keep their documented defaults and report the check as not done
until access is obtained.

## E-020 — Appendix B carried figures its sources do not print

**Found:** 2026-09-24 by the page check · SPECIFICATION.md R-LINK-7, Appendix B · **Status:**
fixed in SPECIFICATION revision 1.1

"CIGRE TB 815: 0.07–0.10 failures per 100 km-year": the public TB 815 page gives the mean
submarine outage time (about 3.5 months, up from about 2 in TB 379) but no failure rate; the
brochure's tables are not public. The published rates used instead are Ofgem/GHD 2016, Table 10:
0.00021 external + 0.00027 internal failures per circuit-km-year for HVDC subsea cables (0.048 per
100 km-year), mean time to repair 65 days (90 high). Also: Finland's prequalified battery mFRR is
"not applicable" (no prequalification), not 0 MW; the 2024 HVDC availabilities are 97.4 / 38.0 /
96.6 / 88.5 % (EstLink 1 / EstLink 2 / NordBalt / LitPol) from the tables, and LitPol's
limitation is 9.8 % of its technical capacity, not "44 % of hours". **Effect:** a long-failure
rate for a 150 km cable of 0.11–0.15 a year instead of about 0.07. **Fix:** R-LINK-7 and
Appendix B corrected; the figures are rows of `parameters.csv` with verification records.

## E-021 — The Latvian battery presets counted AST's reserve battery as market capacity

**Found:** 2026-09-24 by the page check · `scenarios.csv` (ERAA 2025 and AST 2035 rows),
SPECIFICATION.md R-STO-1, Appendix B · **Status:** fixed in data and in SPECIFICATION revision 1.1

`eraa2025_nt_2035, LV, capacity.battery_utility_scale` = 500 summed ERAA's 420 MW "Available on
market" and 80 MW "Out of market - primary purpose ancillary service"; the AST rows took 500 MW
from row 5 of AST's table 1, which is 420 MW of independent traders' batteries (row 5.1) and
80 MW of AST's battery for TSO reserves (row 5.2, p. 25). R-STO-8 keeps that battery out of the
day-ahead market. **Effect:** 80 MW (19 %) too much day-ahead storage in Latvia in these
presets. **Fix:** the market rows hold 420; the 80 MW are separate rows
(`capacity.battery_utility_scale_out_of_market`, `capacity.battery_tso_reserve`);
`validate/documentary_eraa.py` reads the status column.

## E-022 — Electrolysis inside a demand total could be counted twice

**Found:** 2026-09-24 by the page check · SPECIFICATION.md R-DEM-1, R-DEM-5 · **Status:** fixed
in SPECIFICATION revision 1.1

AST's annual demand for 2035 (8.95 / 11.47 / 13.71 TWh) contains 1.3 / 3.2 / 4.7 TWh of
electrolysis (p. 7, table 1); Litgrid's totals (24.3 / 43.5 TWh) contain 3.3 / 16.7 TWh (p. 12).
R-DEM-5 adds electrolysers as a flexible load, and revision 1.0 did not say that the energy
already in the total must come out. **Effect:** none yet; a preset run both ways would add up to
4.7 TWh (Latvia) or 16.7 TWh (Lithuania) of load twice. **Fix:** R-DEM-5 counts the stated
electrolysis once, as the flexible load; `demand.electrolysis_twh` rows added for AST; ERAA's
split is established in M1.

## E-023 — The price of Nord Pool's curve API was per Baltic country; it is per cluster

**Found:** 2026-09-24 on the product page · SPECIFICATION.md §17.1 · **Status:** fixed in
SPECIFICATION revision 1.2

§17.1 gave "€430/yr per Baltic country". The Aggregated Bidding Curves product page sells the
Baltic cluster (Estonia, Latvia and Lithuania together) for €430 a year and Finland for €430 a
year, with history since October 2021 (Nordics and Baltics together €1 650). **Effect:** the
cost of the curves v5 would need (Baltic cluster and Finland) is €860 a year, not €1 720.
**Fix:** §17.1 corrected.

## E-024 — The Pink Sheet's dollar prices have no exchange rate

**Found:** 2026-09-25 while writing SPECIFICATION revision 1.3 (sensitivity (d) of R-APP-11) ·
SPECIFICATION.md R-SUP-3, DECISIONS D-002 · **Status:** fixed in M1: the ECB monthly rate is
fetched (`pipeline/sources/ecb.py`) and converts the gas price of every observed month (OPEN-13)

R-SUP-3 takes monthly gas, coal and oil prices from the World Bank Pink Sheet, which publishes
them in US dollars (`commodity.gas_ttf` in USD/mmbtu), and no requirement names the exchange
rate. v4 converted with a hand-set constant, `EUR_PER_USD = 0.92` ("2023-2025 average", v4
`model/week.py`), without a source; D-002 dropped v4's ECB fetcher because it only converted the
Polish coal index. **Effect:** none yet (no model run). **Handling:** OPEN-13 defaults to the
ECB's monthly average reference rate (series `EXR.M.USD.EUR.SP00.A`), fetched with a lineage
record in M1.

## E-025 — The schema test left out the TYNDP 2026 tables

**Found:** 2026-09-25 in M1 · `tests/test_db.py` · **Status:** fixed

`test_schema_creates_every_table` listed its tables by hand and did not name the five
`tyndp2026_*` tables added with the second scenario family (D-010). **Effect:** none; the tables
exist, the test did not prove it. **Fix:** the test takes its list from `db.check.TABLES`, the
tables `make check` counts, so a new table cannot be missed.

## E-026 — A second `make db` stopped on the TYNDP 2026 weather scenarios

**Found:** 2026-09-25 in M1 · `db/build.py` `load_tyndp2026` · **Status:** fixed

The loader wrote `tyndp2026_weather` with `INSERT OR REPLACE`, which deletes a row before writing
it; once `tyndp2026_price` and the other family-2026 tables point at those rows, the foreign keys
forbid the delete and the in-place build fails. Stage 2's checks always built a fresh database,
so it went unseen. **Effect:** none on data; `make db` on an existing database failed.
**Fix:** `_insert_parent` inserts new scenarios, keeps identical ones and asks for a clean build
when one has changed; a test covers it.

## E-027 — Two page numbers in revision 1.3 were the research note's, and wrong

**Found:** 2026-09-25 while verifying the rows of revision 1.3 · SPECIFICATION.md R-SUP-9,
Appendix A.5, §17.1 · **Status:** data rows cite the right pages; fixed in SPECIFICATION
revision 1.7

R-SUP-9 cites WindEurope's Table 4 on p. 43 and IRENA's onshore-wind table on p. 17, taken from
research note D. Table 4 is on p. 44; the Baltic rows of IRENA's table are on p. 18. **Effect:**
none on values (920, 1 350, 4 230 and 630 MW; 317/705, 78/133, 540/2 510 MW are as printed).
**Fix:** `parameters.csv` rows `delivery.*` cite p. 44 and p. 18, each re-found on the page.

## E-028 — R-BND-4's EstLink loss share is a share of capacity, not of energy sent

**Found:** 2026-09-25 while reading the HVDC statistics for the loss parameters ·
SPECIFICATION.md R-BND-4 · **Status:** the model uses the energy share; fixed in SPECIFICATION
revision 1.7

R-BND-4 says EstLink 1 lost "3.5 % of transmitted energy in 2024" south-west. In Table 4.6 of the
ENTSO-E HVDC statistics 2024 (PDF p. 28) 3.5 % is the losses' share of the link's technical
capacity (108.2 of 3 102.0 GWh). The share of the energy sent Finland to Estonia is
108.2 / (2 216.3 + 108.2) = 4.7 %; the statistics' transmitted energy excludes losses (§2).
**Effect:** none yet. **Fix:** the export computes each border's loss share per direction as
losses / (transmission + losses) from the 2024 rows of both EstLink cables, NordBalt and LitPol
(`presets.json` `loss_share`; EE-FI 4.0 % towards Finland and 3.6 % towards Estonia).

## E-029 — D6 counts six contract designs, R-SMR-3 defines eight

**Found:** 2026-09-25 writing the plan · SPECIFICATION.md D6, R-SMR-3 · **Status:** the card
shows the eight of R-SMR-3 (M6); fixed in SPECIFICATION revision 1.7

D6 speaks of "a contract card with six designs"; R-SMR-3 lists four designs, each with and
without the clause that pays no difference in hours priced at or below 0. **Effect:** none yet.

## E-030 — R-ENG-5 gives Kruonis an inflow it does not have

**Found:** 2026-09-25 writing the plan · SPECIFICATION.md R-ENG-5 · **Status:** fixed in
revision 1.4 (handled before by PLAN O-3, DECISIONS D-012)

R-ENG-5 dispatches Kruonis by a weekly budget from "TYNDP inflow of the climate year in scenario
years". Kruonis is a closed-loop pumped-storage plant with no natural inflow; its week is set by
what it pumps. **Handling:** Kruonis is scheduled by the storage programme (12 h, cycle efficiency
0.74), with the observed weekly generation as a cap in calibration years.

## E-031 — "Global Ambition 2035 is the sensitivity" is not a fifth standard sensitivity

**Found:** 2026-09-25 writing the plan · SPECIFICATION.md R-BND-5, R-APP-11 · **Status:**
handled by PLAN O-5; fixed in SPECIFICATION revision 1.7 (the profile is chosen in the panel)

R-BND-5 names Global Ambition 2035 "the sensitivity" of the opening boundary scenario, while
R-APP-11 fixes four standard sensitivities. **Handling:** Global Ambition 2035 is an alternative
boundary profile the user selects in Outlook, not a fifth background run.

## E-032 — Comments in the database code described v4 and data that are not there

**Found:** 2026-09-25 in M1 · `db/__init__.py`, `db/schema.sql` · **Status:** fixed

`db/__init__.py` called itself "Phase 3" and cited v4's run stamp as if it were this project's;
`schema.sql` gave a scenario (`fingrid_central_2035`), a key (`fuel.gas_ttf`) and a source
(`v3_meta`) that do not exist, and years 1982-2019 for the hydro inflows, which run to 2017.
**Effect:** none on data. **Fix:** comments corrected.

## E-033 — PLAN §3.4's Daugava rule leaves most of a week's water unsold

**Found:** 2026-09-25 in M2 · `docs/PLAN.md` §3.4 · **Status:** fixed (D-018)

The plan runs the budget evenly in pass one, sets the storage value to the lowest pass-one price
the schedule serves and re-offers untaken water in the week's scheduled hours. The release it
schedules into the highest-price hours lowers exactly those prices below the value, so the
water is not taken: in the 2024 replay 1.31 of 3.19 TWh stayed unsold, and on the test weeks
the engine released 5–38 % of what the LP did in five of eight weeks. **Effect:** none on
published results (there are none). **Fix:** the water value of `hydro.ts` (D-018 item 3).

## E-034 — R-ENG-4's discharge floor adds Δ on the wrong side of η

**Found:** 2026-09-25 in M2 · `docs/SPECIFICATION.md` R-ENG-4, `docs/PLAN.md` §3.4 · **Status:**
fixed in revision 1.4; implemented correctly throughout

R-ENG-4 prices a discharge at "the charging prices paid, divided by η, plus Δ". Δ is a cost per
MWh charged (R-ENG-3's programme takes a cycle iff p_dis·η − p_chg ≥ Δ), so the cost of held
energy per MWh delivered is (p_chg + Δ)/η; the literal reading would sell at prices the
programme itself rejects (by Δ(1/η − 1), 6.7 €/MWh at Δ = 60, η = 0.9). **Effect:** none; the
engine uses (p_chg + Δ)/η (`storage.ts`). **Fix:** the wording at the next revision.

## E-035 — PLAN §3.4's clearing order splits a short segment on flows nobody supplies

**Found:** 2026-09-25 in M2 · `docs/PLAN.md` §3.4 (Clearing) · **Status:** fixed (D-017)

The plan checks link limits on the flows at the bisection's price and treats a segment as short
only where no link is violated. A segment short at VOLL has flows that include the unserved
energy, so a short zone can appear to export over a saturated link (v3's probe: Lithuania
exporting 500 MW to Latvia while 2 000 MW short). **Effect:** none; found before any run.
**Fix:** the shortfall is assigned before the flows are read (`clearing.ts`, D-017).

## E-036 — D-013 put the scenario and results schemas in M2

**Found:** 2026-09-25 in M2 · `docs/DECISIONS.md` D-013 item 4 · **Status:** fixed (D-020)

The two shapes do not leave the engine in M2; their schemas come with the share link (M4) and
the export (M7). **Effect:** none. **Fix:** D-020 item 8.

## E-037 — Six of the specification's "verify" references are wrong, five incomplete

**Found:** 2026-09-25 in M2 · `docs/SPECIFICATION.md` §17.2 · **Status:** fixed in revision
1.4; the corrected references are also in `docs/methodology.md` (References)

The Crossref check of the 16 references marked "verify" (R-PROV-3;
`docs/research/2026-09-25_crossref_check.md`): L6, L7, L8 and L27 are right as printed, L25 as a
preprint (its journal version is *Energy Economics* 147, 108483). Wrong: L9's DOI belongs to
another paper (right: 10.1016/j.jup.2019.01.008); L12 misses its third author (Eicke, A.) and
is from 2025 (vol. 143, 108251; a corrigendum followed in 2026); L30's Wagner, F. is not an
author; L31's first author is Mirzaei Alavijeh, N. and its title is paraphrased; L32 is
Paulauskas, N. and Kapustin, V., with another title; L33 is Karkossa, L. et al., with another
title (a retrospective of the 2022 energy crisis, not a "hindcast 2020–2024"). Incomplete (DOI or
article number missing): L11, L26, L28, L29, L34. **Effect:** none; no document cited them.
**Fix:** methodology cites the Crossref versions; §17.2 is corrected at the next revision.

## E-038 — R-STO-9's battery data start in March 2026, not June 2025, and fall in a blind year

**Found:** 2026-09-25 in M3 · SPECIFICATION.md R-STO-9, R-VAL-1; `docs/PLAN.md` §3.7
(`fit_delta.ts` "on 2025") · **Status:** decided (D-025); fixed in SPECIFICATION revision 1.5, the window and the exemption named in revision 2.0

R-STO-9 refits Δ "on 2025 against observed battery discharge (ENTSO-E A75 'battery'; EE median
127 MWh per day from June 2025 to August 2026)". The Estonian A75 battery series in the cache
runs from 2026-03-11 23:00 to 2026-08-31 23:00 UTC (4 134 hours, 23 359 MWh; daily median
128 MWh, so the level is right and the period is not). There is nothing to fit on in 2025, and
2026 is R-VAL-1's second blind year; R-STO-9 fitting on 2025 also contradicts R-VAL-1's 2025
blind year. **Effect:** Δ is fitted on 2026-03-12 → 2026-08-31 (`fit_delta.ts`) and recorded as
evidence, not adopted; the prior of 60 €/MWh stays (D-023). **Fix:** the next revision states
the window and exempts Δ from the blind years, or keeps the prior.

## E-039 — PLAN §3.7's markup update rule does not converge on the engine of record

**Found:** 2026-09-25 in M3 · `docs/PLAN.md` §3.7 (`fit_markup.ts`, after v4 `markup.py:55`) ·
**Status:** fixed (D-023)

The rule moves each bin's markup by the mean residual (observed − model) of the hours the bin
collects. In many of those hours the zone's gas is not what sets the model's price — hydro,
storage or an import is — so the residual does not shrink when the markup rises and the
schedule climbs without bound. **Effect:** none on committed results; found before any fit was
recorded. **Fix:** coordinate descent on the sum of the three zones' hourly MAE over 2023–2024
(`fit_markup.ts`, D-023).

## E-040 — With observed availability the preview misses whole years by 40–50 €/MWh

**Found:** 2026-09-25 at the start of M4 · `app/src/engine/index.ts`, `hydro.ts` (the preview),
with D-022 item 1 · **Status:** fixed by D-026 — the application shows the engine of record only
(specification revision 1.5)

The test weeks of `make gap` are solved one at a time; whole years were not compared after M3.
On the 2024 replay the preview's Estonian mean is 136.7 €/MWh against the engine of record's 91.0
(mean absolute difference 47.6; June 357 against 103), on climate year 2009 with ERAA 2035's
fleets 122.6 against 85.5, on 1995 54.1 against 40.2. The clearing is not the cause: with the
engine of record's storage and Daugava release as fixed output it reproduces the record to 2.9
€/MWh. Removing the weekly availability of D-022 item 1 brings the 2024 preview back to 1.2
€/MWh of the record: with less thermal capacity, pass one at the Daugava's minimum flow runs into
scarcity, the water value is set on those prices, and pass two holds the price at it while 420
GWh of the cascade's 3 191 go unsold. **Effect:** none on any recorded figure — every published,
exported and calibrated number comes from the engine of record (D-021); the preview is what the
interface would show for a second before it. **Fix:** the owner decides whether the interface
shows the preview at all (R-ENG-7, D-021 item 2).

## E-041 — The Finnish slope of R-BND-6 reached only the two-pass engine

**Found:** 2026-09-25 in M4 · `app/src/engine/build.ts` (M2) · **Status:** fixed

M2 built the slope as a wider ramp band of the Finnish import and export offers. The two-pass
engine clears ramp bands; the engine of record's linear programme has none, so with the slope on
it priced the border as a price-taker. The interface showed a "sensitivity" whose figures did not
move (the 2024 replay: 86.2 €/MWh in Estonia with and without a slope of 5). **Effect:** none on
any recorded figure — no calibration, validation or golden run uses the slope (it is off by
default, R-BND-6). **Fix:** with the slope on, the Finnish import and export are ten equal
tranches whose bids rise and fall by the slope along the flow from zero exchange (O-6), which
both engines clear (`build.ts`, `SLOPE_STEPS`; `app/test/build.test.ts`).

## E-042 — R-BND-6 calls the price-taker s = ∞

**Found:** 2026-09-25 in M4 · SPECIFICATION.md R-BND-6 · **Status:** fixed in SPECIFICATION revision 1.7

R-BND-6 defines s as the move of Finland's price in €/MWh per GW of net flow and then calls the
price-taker "s = ∞" and marks results "computed with s < ∞". On its own definition the
price-taker is s = 0: the price does not move. **Effect:** none; the engine takes no slope as
the price-taker (`fiSlope: null`), the panel shows 0 as off, and a result with a slope above 0
is marked a sensitivity. **Fix:** the next revision writes "s = 0 (price-taker)" and "s > 0".

## E-043 — R-UI-4 excludes colour for identity; the owner asked for technology colours and flags

**Found:** 2026-09-26 in M4 · SPECIFICATION.md R-UI-4 · **Status:** fixed in SPECIFICATION revision 1.7

R-UI-4 says colour encodes state and sign only. At the first look the owner asked for a colour per
source of generation and for flags on the countries (D-029). **Effect:** none on results; the
interface follows the owner. **Fix:** the next revision lets colour carry the identity of a
generation group (a validated palette, never colour alone: legend and tooltip) and a country's
flag beside its code.

## E-044 — Three faults of the Model view found at the owner's first look

**Found:** 2026-09-26 in M4 · `app/src/ui/` · **Status:** fixed

(1) The daily generation chart filled its lowest layer to the bottom of the axis, which exports
pushed below zero, so a band of the colour of the lowest group stood under the zero line. (2) A
dragged slider's label repeated digits for values of 1 000 and more (the unit was cut from the old
label at its first space). (3) The canvases were forced to a height by CSS while Chart.js sized
them to their container, so a click landed a legend row too high: the owner's click toggled the
entry above the one clicked. **Effect:** none on results; the interface misled. **Fix:** the lowest
layer fills to zero, the others to the layer below; the unit is kept in the label's data; each
canvas sits in a sized container and Chart.js sizes it (`.plot`).

## E-045 — R-LINK-3's "planned maintenance of 1–2 %" does not hold for LitPol

**Found:** 2026-09-29 in M5 · SPECIFICATION.md R-LINK-3 · **Status:** fixed in SPECIFICATION revision 1.7

R-LINK-3 describes the typical profile as "planned maintenance of 1–2 % placed in May–October, per
link". Over 2019–2024 the ENTSO-E HVDC statistics give EstLink 1 1.9 %, EstLink 2 1.1 % and NordBalt
1.9 %, but LitPol 4.4 % (7.1 % in 2020 and 9.5 % in 2021). **Effect:** none; each cable takes its own
documented share (D-032). **Fix:** the next revision says "each link's documented planned-maintenance
share (1–2 % for the submarine cables, about 4 % for LitPol)".

## E-046 — An observed what-if on EstLink 1 or 2 took the cable off again while it was out

**Found:** 2026-09-29 by the owner in M5 (a validation run of 2025 with EstLink 1 switched off) ·
`app/src/engine/build.ts` · **Status:** fixed

D-032 item 5 took a held EstLink cable's share of the year's highest offer off the offered capacity
in every hour of the window, and said it took too much in hours the cable was out already. With
EstLink 1 off for 2025 the border panel showed a dip in September, when EstLink 1 had its own outage
(A78, 2025-09-01 → 09-19): 302 MW left where EstLink 2's 658 MW stood. **Effect:** a what-if on one
EstLink cable in an observed year understated the border in the hours of that cable's own outages;
nothing else. **Fix:** the worker reads the year's A78 events (`outMasks`,
`app/src/ui/attribution.ts`); in an hour of the held cable's own event it takes off only what the
offer holds above the other cable's share — nothing when it was out — and its share otherwise
(`app/test/links.test.ts`). The border panel names the what-ifs on the border it shows.

## E-047 — With both EstLink cables held, E-046's rule still left capacity

**Found:** 2026-09-29 by the owner in M5 (the validation run of 2025 with EstLink 1 and 2 switched
off) · `app/src/engine/build.ts` · **Status:** fixed

E-046 applied the what-ifs of the two cables one after the other and read any A78 event of a cable
as the cable being out. With both held the second cable's rule still counted the first one's share,
and a planned event that only limited the border (EstLink 1's export limit of 25 January – 3 February
2025, EstLink 2's partial limit of 20–29 October) was taken for an outage: the border panel showed
capacity and flows up to 360 MW with both cables off. **Effect:** observed what-ifs on both EstLink
cables, and on one of them in hours of the other's planned limits, overstated the border. **Fix:**
each hour's offer is split between the two cables before either is held (`observedWhatIfs`): with no
event of either, both are in service and the offer is limited elsewhere; a cable in a forced outage
carries nothing and the other all of the offer; with a planned event of one, the other carries its
share and the one with the event the rest; alike events split the offer by rating; each cable then
keeps at most its what-if. Both cables at 0 leave nothing in every hour (`app/test/links.test.ts`).

## E-048 — The batteries' cycle control also capped Kruonis in scenario runs

**Found:** 2026-09-29 while writing the panel's explanations of the battery settings (the owner's
request) · `app/src/engine/build.ts` · **Status:** fixed

PLAN §3.4 gives Kruonis in scenario years R-PAR-5's documented cap of 1.5 cycles a day; the builder
took the batteries' "Cycles per day" control instead, so moving the control moved Kruonis too.
**Effect:** none at the defaults: on a 12-hour store the cap cannot bind (a day holds at most 18
hours of discharge at full power), and the opening scenario gave the same prices and the same
Kruonis output with no cap at all. With the control at 0.5 cycles a day Kruonis lost 8 % of its
output (0.223 → 0.206 TWh a year over the opening scenario's weighted set) and the Lithuanian price
rose by 0.05 €/MWh. **Fix:** Kruonis takes the documented value
(`battery.cycles_per_day.clean_horizon_assumption`) whatever the control says; the panel shows its
store, round trip and limit under its cycle cost (`app/test/build.test.ts`).

## E-049 — Staging before the gate cannot pass the deployment gate

**Found:** 2026-09-29 at the start of M7 · SPECIFICATION.md R-DEP-1, R-DEP-2, R-PUB-4, R-SMR-8 ·
**Status:** decided by the owner with the first deployment (D-085: staging behind the site's password)

R-DEP-1 puts `v5.energiamudel.ee` behind a password "from the first deployable build until the gate
of §14 is met", but R-DEP-2 lets a deploy run only if `validate_fit --check` passes, which it does
only once R-VAL-5 is met: before the gate no build is deployable, so the staging window is empty.
R-PUB-4 and R-SMR-8 also keep every result with the plant inside the repository until then, a site
behind a password included. **Effect:** none; the owner chose not to deploy yet (D-039), and
`make deploy` refuses while the gate is unmet. **Fix:** at the first deployment the owner decides
between a staging build without the plant's scenarios, with R-DEP-2's validation step moved to
promotion, and waiting for the gate.

## E-050 — The export manifest's code hash went stale, and the gate did not see it

**Found:** 2026-09-29 in the test campaign after M7 · `data/export/manifest.json`, `export/check.py` ·
**Status:** fixed

`manifest.json` names the code that wrote the export as a hash over `export/*.py` and
`schema/*.json` (`export/__main__.py`, `code_hash`; R-DATA-8). Commit afff2f0 added
`schema/results.schema.json` without re-running `make export`, so the committed hash
(`9d73087a…`) no longer named the code (`2cf6d394…`). `export/check.py` compared the files' own
SHA-256 only, so `make check` passed with the field stale. **Effect:** none on any file or figure —
the export's files were byte-identical on re-export; a reader following the manifest to the code
that wrote it would have reached an older revision. **Fix:** the export re-run; `check()` now
fails when the manifest's code hash is not the export code's (R-DATA-5).

## E-051 — A share link's text could put markup into the page

**Found:** 2026-09-29 in the test campaign after M7 (the exploration's reading confirmed in the
browser: `run=<img src=x onerror=…>` in a link ran its handler) · `app/src/main.ts`,
`app/src/state/text.ts` · **Status:** fixed

The parser's error messages echo the text they reject (`unknown key …`, `run: … is not one of …`),
and `main.ts` wrote those messages into the status line with `innerHTML`, so a link whose text
carried markup had it rendered — a script in the browser of whoever opened the link. The same
sink took the run's, the export's, the data's and the calibration files' error messages, and the
"Changed from the presets" line. Separately, the parser looked presets and classes up with plain
property access, so `dsr=constructor` passed and dropped the DSR bands without a word, and
`EE.mw.constructor=100` passed the import and failed in the worker; a line `constructor=1` found
Object's constructor where the text's rules are kept and took it for a rule. **Effect:** none on any
result. **Fix:** one `esc` (in `ui/labels.ts`, replacing five identical copies) on every message
that reaches `innerHTML`; `Object.hasOwn` for the text's keys, presets and classes; the parser's
tests hold the cases (`app/test/state.test.ts`).

## E-052 — The clause's zero left out the hours the plant prices itself as it turns down

**Found:** 2026-09-29 in the test campaign after M7 (the contract lens of the review; reproduced on a
three-hour programme and on the full years) · `app/src/engine/contract.ts` · **Status:** fixed

Under the negative-price clause the plant's part above its minimum load bids `CLAUSE_BID`,
0.01 €/MWh (`build.ts`), and the account treated an hour as at or below 0 when its price was at
most `ZERO` = 0.01 €/MWh. The LP adds each offer's perturbation to its bid (`lp.ts`; 0.000192 €/MWh
for the plant), so in every hour the plant turns down and so sets the Estonian price itself the
price is 0.010192 €/MWh: above that zero, and the hour settled at the strike on the plant's whole
output — the very hours the clause exists for. **Effect (results with the plant, internal,
R-SMR-8):** on the opening state at strike 90 with the clause, 283–414 such hours a year with
2 SMR and 535–974 with 3 SMR; the hourly CfD's weighted cost to the state was 147.8 M€ a year
instead of 133.8 (2 SMR, −9.4 %) and 267.4 instead of 220.1 (3 SMR, −17.7 %), the other designs and
the count of periods in which the state pays likewise. Nothing without the clause, and no price,
changes. **Fix:** `ZERO` is the clause bid plus the LP's largest perturbation (`PERTURB_MAX`,
0.011 €/MWh in all); a test runs the three-hour programme through the account.

## E-053 — The plant's outage window counted run-of-river output twice

**Found:** 2026-09-29 in the test campaign after M7 (the contract lens of the review) ·
`app/src/engine/build.ts` · **Status:** fixed

R-SMR-2 places each unit's planned outage where the surplus of must-run and renewable output over
demand is largest. The builder summed a zone's `res` — wind, solar and, in a scenario year, the
run-of-river output — with all its fixed output, which holds the run-of-river output again (and in
an observed year the given output of every technology twice). **Effect:** on the committed data
one window of 2008 moves by an hour (the review's count); the three scenarios' prices and the
plant's output are unchanged to the figures shown (EE 61.31 / 49.10 / 40.57 €/MWh; 5.054 and
7.582 TWh). **Fix:** `res` holds wind and solar only; the fixed output enters the surplus once.

## E-054 — R-SMR-4's variable cost of the plant has no parameter, and PLAN §3.4 describes a bid the engine does not make

**Found:** 2026-09-29 in the test campaign after M7 · SPECIFICATION.md R-SMR-4, docs/PLAN.md §3.4 ·
**Status:** fixed in SPECIFICATION revision 2.0 (the parameter dropped)

R-SMR-4 makes the plant's variable cost (fuel and variable O&M) an editable parameter, and PLAN
§3.4 has the clause's block bid 0 €/MWh with a variable cost of uranium price over efficiency plus
VOM. The engine offers the plant must-run under a plain contract and, under the clause, its part
above the minimum load at `CLAUSE_BID` (0.01 €/MWh, M6); no variable cost is computed or offered.
**Effect:** none on dispatch, as R-SMR-4 itself says: under a plain CfD the operator earns the
strike whatever the price, so the plant runs whenever the price is above the floor; under the
clause it turns down at the model's zero (E-052). A variable cost would matter only to an operator
without a contract, which the application does not show. **Fix:** the next revision says so and
drops the parameter, or adds it with the merchant case.

## E-055 — R-APP-11 (c) counts Latvia's 80 MW TSO reserve battery among the market's batteries

**Found:** 2026-09-29 in the test campaign after M7 (the scenario lens of the review) ·
SPECIFICATION.md R-APP-11 · **Status:** fixed in SPECIFICATION revision 2.0

Sensitivity (c) raises each zone's batteries to the highest of its TSO and ERAA presets and its
installed and contracted fleet; the specification gives Latvia "420 plus the 80 MW TSO reserve".
The class map excludes a TSO's reserve battery from the market (R-STO-8, `export/classes.py`
`battery_tso_reserve`), so the sensitivity runs Latvia at 420 MW. **Effect:** none; the model is
consistent with R-STO-8. **Fix:** the next revision writes "LV 420 (the 80 MW TSO reserve battery
stays outside the market, R-STO-8)".

## E-056 — The replays put a loss wedge at the borders that the day-ahead market does not have

**Found:** 2026-10-04 in the calibration round of D-042 · SPECIFICATION.md R-BND-4, `state/scenario.ts`
`replay` · **Status:** fixed in the replays (D-042 item 1) and in the scenario runs (D-045), accepted by
the owner on 2026-10-05; the specification's text in revision 2.0

R-BND-4 applies each HVDC link's losses to the importing side, default on, and the replays took
the default. The day-ahead coupling applies no loss factor on EstLink, NordBalt or LitPol: in the
hours with both prices above 20 €/MWh the Estonian and Finnish prices are equal to the cent in
54, 42 and 40 % of hours of 2023, 2024 and 2025 (LT = SE4 in 50, 24 and 11 %, LT = PL in 28, 37
and 20 %), and no more than 3 % of hours sit near any one ratio off 1. With the wedge, an import
below the cable's limit cleared the Baltic zone 1.6–4.3 % above its neighbour and an export as
much below. **Effect:** the replays' MAE was 1.0–2.4 €/MWh higher in every zone and year
(2023: 19.1 / 20.2 / 19.1 → 16.7 / 18.3 / 16.8), FI→EE sat at its limit in more hours than observed,
and M3's fits were made on those replays. The scenario runs still carry the wedge: their Baltic
prices are that much above the neighbour's in uncongested import hours. **Fix:** the replays
clear without the losses; the specification says so at its next revision, and the owner decides
the scenario runs' default.

## E-057 — The heat-driven floor was a lower envelope, a third of what runs unpaid

**Found:** 2026-10-04 in the calibration round of D-042 · `validate/chp_fit.py`, methodology §7.2,
DECISIONS D-023 item 1 · **Status:** fixed (D-042 item 3), accepted by the owner on 2026-10-05 (D-045)

M3 fitted R-SUP-5's must-run as the 10th percentile of each technology's hourly output per
temperature bin, "a true lower envelope". A must-run quantity is what runs whatever the price, and
an envelope is less than that by construction: in the hours of 2024 that cleared at or below
10 €/MWh the model ran 56–95 MW of Estonian thermal output against 140–174 MW observed, and 27–45
against 58–82 in Latvia. **Effect:** in the hours the market cleared below 30 €/MWh the model was
19–41 €/MWh too high (Estonia, 2024–2025), FI→EE was at its limit in 77–79 % of hours against
54–65 observed in 2023–2024, and the mean price was 9–10 €/MWh too high in 2023. **Fix:** the floor is the
mean output of the fit years' hours priced below the technology's cheapest bid
(`app/scripts/fit_floor.ts`). What the new floor costs is recorded with it: Estonian oil shale
over-generates in 2024–2026, the years after the fit years in which it ran less.

## E-058 — R-STO-9 and revision 1.5 state Δ = 65.5 €/MWh as a fixed figure; it is the fit on a replay that has moved

**Found:** 2026-10-04 in the calibration round of D-042 · SPECIFICATION.md R-STO-9, revision
table 1.5; DECISIONS D-025 item 3 · **Status:** fixed in SPECIFICATION revision 2.0 (Δ as the fit of the register in force; D-042 and D-044 accepted, D-045)

The batteries' cycling cost is the value at which the 2026 replay's Estonian batteries discharge
what A75 reports (R-STO-9). The replay changed with D-042 (no loss wedge, the floor), and the same
fit at the owner's mFRR share of 0 now gives 58.5 €/MWh (residual −0.1 %; 35.5 at share 0.25; at
0.5 the batteries stay 34.1 % short at Δ = 0). **Effect:** on the branch every zone's batteries
cycle at 58.5 instead of 65.5 €/MWh in the 2026 replay and in the scenario runs (61 after the
Daugava's band of D-044, the register at the head of the branch); scenario figures quoted in the
documents were computed at 65.5 and were not re-run that night; they are recomputed at 61 on
2026-10-05 (D-045). **Fix:** the next revision
names the fit, not the figure, or carries the figure of the register in force.

## E-059 — R-APP-12 and R-BND-8 give the generation behind a profile to TYNDP 2024 alone

**Found:** 2026-10-04 while building D-043 · SPECIFICATION.md R-APP-12, R-BND-8; the import-price
page's own text ("The export holds no generation behind them") · **Status:** the page and the
export fixed on branch `night-2026-10-04` (D-043); the specification's text in revision 2.0

Revision 1.8 has the page show the generation and capacity "for a TYNDP 2024 profile", and the
page told the reader that the export held none for TYNDP 2026. The NT+ package holds both in its
hourly dashboards. **Effect:** none on results; a reader of a National Trends+ profile saw a
price without the fleet behind it — Finland's 2050 mean of 200 €/MWh without the 121–138 TWh
of electrolysis it rests on. **Fix:** D-043; the next revision writes "for a TYNDP profile".

## E-060 — A monthly fuel price at a rounding edge depends on the order of the table's rows

**Found:** 2026-10-04 by `make check` after a rebuild from scratch · `export/years.py` `_fuel` ·
**Status:** the committed export regenerated from a database built from scratch (branch
`night-2026-10-04`); the order dependence fixed on branch `night/2026-10-07` (below), no figure
moving

The export takes a month's EUA price as the mean of its auction days. February 2020's 18 auctions
sum to 429.93 €/t, a mean of 23.885: the second decimal depends on the order the floating-point
sum is taken in, and the query sets none. The database built step by step since M1 gave 23.89;
the same database built from scratch gives 23.88, so the committed `years/2020.json.gz` could not
be reproduced from the raw cache (R-DATA-5), and `make check` did not see it while its own
database was the step-built one. **Effect:** one cent of one month's CO₂ price in the 2020
diagnostic replay; no figure quoted to one decimal moves. **Fix:** `years/2020.json.gz` and the
2020 validation file are regenerated from a database built from scratch, on which `make check`
passes (fresh build identical in every table, export byte-identical). Not done: taking the mean
in date order (`avg(price ORDER BY ts)`), which removes the dependence for good — it moves May
2024's EUA price from 70.85 to 70.86 €/t, a fit year, and so asks for `make fit` and a golden
re-baseline of its own; left for the round the owner next allows. *Fixed 2026-10-07 (the night
run, at the owner's plan, which named it):* a month's mean of the gas, CO₂ and exchange-rate rows
— `years._fuel`, the 2024 reference of the oil-shale premiums (`tables.oil_shale`) and the gas
shock of the sensitivities (`tables.sensitivity`) — is the exact sum of its rows (`math.fsum`) over
their count, as the Statistics page's already was (D-092); the database's order no longer enters.
On the database of the branch every exported byte stays as it was (the export's hash unchanged; May
2024's 70.85 €/t of the note above moved with D-094's change of the series). A test inserts four
prices whose mean, 50.225, sits on a rounding edge, in two orders: the database's `avg()` gives
50.23 and 50.22, the fix 50.22 both times.

## E-061 — Revision 1.6 limits the neighbours' profile to three of 2035; the panel now offers every profile held

**Found:** 2026-10-05 while building D-046 · SPECIFICATION.md revision 1.6, R-BND-5, R-APP-1 ·
**Status:** fixed in SPECIFICATION revision 2.0

The specification's panel keeps "the neighbours' profile (TYNDP 2024 Distributed Energy or Global
Ambition 2035, TYNDP 2026 National Trends+ 2035)". At the owner's request the panel also offers,
through *Other*, the other profiles and years the year files hold, against the unchanged scenario
of 2035 (D-046). **Effect:** none on the three scenarios as they open. **Fix:** the next revision
names the list and says what a profile of another year is: a what-if on the neighbours.

## E-062 — Two changes of the capacity box were not marked as changed, and moved gas rows stayed in the text

**Found:** 2026-10-05, checking every slider of Estonia's capacity box in the browser at the
owner's request · `app/src/ui/panel.ts` `changes`, `setNumber` (D-058, D-059) · **Status:** fixed

Each of the fourteen sliders was moved and put back, with the run awaited each time: the slider,
its number box, the scenario text and the results followed in every case, and the results came
back to 59.8 / 49.2 / 49.2 €/MWh. Two faults in what the page says about a change:

1. A value was marked as changed (the `*` in the scenario text, the line "Changed from the
   presets" beside the results) only if the baseline's text had its key. Offshore wind, which
   S1 does not have, and the gas rows of D-059, which the text carries only once moved, had none:
   1 000 MW of offshore wind or a gas row at 13 MW ran correctly and were not listed.
2. A gas row put back at the document's value left all four rows in the scenario text, so the
   text and the share link of an unchanged scenario differed from the opening ones.

**Effect:** none on any result. **Fix:** a class the fleet preset lacks counts as 0 MW and a
source row as its document's MW when changes are listed; rows back at the document's values
leave the state (`panel.ts`).

## E-063 — In a scenario the Daugava cascade is held to a weekly limit of at most 507 MW, below what the weekly water needs

**Found:** 2026-10-05, checking Latvia's sliders after D-069 · `app/src/engine/build.ts` (the
reservoir's `pmax`), `export/years.py` (`hydro_weekly_max_mw.daugava`) · **Status:** open — the
owner's decision; nothing changed

Halving Latvia's Daugava capacity in the panel, 1 592 → 800 MW, moves no result. In a scenario
run the cascade's hourly limit is the smaller of its megawatts and the weather file's weekly
maximum, and that series (TYNDP 2024's, target 2030, the same in the three climate years) lies
between 101 and 507 MW, median 253. So the scenario's Daugava never runs above 507 MW, whatever
the capacity, where the plants total about 1 590 MW and the record shows spring floods near it.
The same file's weekly energy asks for a mean of up to 756 MW in its wettest week of climate
year 2009 — more than the limit of that week allows — and sums to 1.6 TWh for the year, which is
low against the cascade's usual 2.5–3 TWh (the last figure from general knowledge, not from the
project's sources).

**Effect:** not measured. If the limit is a misreading of the source's field (a weekly mean
rather than a turbine limit, say), the scenario understates Latvia's flexible hydro in the dear
hours and may spill or clip water in wet weeks; methodology §5.5 says the Daugava is "free
between PEMMDB's turbine limits", which this is not in effect. **Fix:** to be decided — read the
source's definition of the weekly maximum, compare with the record of 2023–2025, and either
correct the reading or state the limit in the methodology. The panel's slider now says that
megawatts above the limit change nothing.

**Update, 2026-10-05 (E-063), after reading the source** — `docs/research/2026-10-05_daugava_scenario.md`.
The workbook's field is labelled "Maximum generating power [MW]" and is read as labelled, but its
values (304 / 507 / 101 / 253 MW by season, the same in every climate year) lie at or below the
record's seasonal *mean* output and contradict the workbook's own inflow and its nominal 1 592
MW: it is not a limit. A second fault beside it: TYNDP 2024's inflow for the node is the record
divided by 1.92–1.99 in the three climate years both cover (2015–2017), and half of TYNDP 2026's
for the same node. **Effect, measured** (`spikes/daugava-scenario/`): with the limit dropped and
the inflow times 1.95 the opening prices fall by 4.4 (EE), 4.9 (LV) and 4.7 €/MWh (LT), and two
units lower Estonia's price by 11.5 instead of 14.3 €/MWh. Validation and the National Trends+
runs are untouched. **Status:** open — the correction is proposed as D-070 and waits for the
owner; the "2.5–3 TWh" above is confirmed by the record (1.79–4.23 TWh in 2015–2025, mean 2.77).

**Closed, 2026-10-05 (E-063):** the owner accepted D-070 and it was carried out the same day —
the limit is not read, the inflow is at the record's level. Halving the cascade's megawatts in
the panel now moves the results. **Status:** fixed.

## E-064 — The gas behind TYNDP 2024's neighbour profiles is a blend at 7.5–10.9 €/GJ, not natural gas at 5.7–6.3

**Found:** 2026-10-05 (night), reading the market model's inputs for D-072 ·
`app/src/worker/view.ts` (`NEIGHBOURS_FUEL`), methodology §10, `fuel_paths` `tyndp2024_matrix` ·
**Status:** fixed for Distributed Energy and Global Ambition; open for National Trends and
National Trends+ (their level stays the nearest documented)

The fossil level of R-SMR-5 (D-037) priced a combined-cycle plant on TYNDP 2024's price matrix:
natural gas at 6.29 (2030) and 5.65 €/GJ (2040), all of it paying for CO₂ — 87.7 €/MWh in 2035.
The market model's plants do not burn that gas. The final supply inputs give them a blend of
natural gas, biomethane and synthetic methane at 7.50 €/GJ in 2030 and 10.86 (Distributed Energy)
or 9.79 (Global Ambition) in 2040, of which 90 %, 61 % and 68 % is fossil and pays for CO₂; the
model's hydrogen outputs confirm it to within one euro (a reformer's marginal cost of 73, 72 and
79 €/MWh of hydrogen against 73.5, 72.2 and 79.1 computed on the blend, 66 on the natural-gas
row; `docs/research/2026-10-05_neighbour_fuel_reindex.md`). The price matrix's rows are what the
workbook says and stay; what was wrong is taking its natural-gas row for the plants' fuel.

**Effect:** the level is 90.4 €/MWh, not 87.7 (the market model's most efficient gas plant,
60 %, on the blend). Estonia's hours with a fossil price on the opening state: 8.2, 6.8, 4.3 and
1.9 % for *Elering: gas* and one, two and three units, against 9.4, 7.6, 4.9 and 2.3 %
(`spikes/neighbour-fuel/fossil.ts`). No price, flow or energy moves. The owner's memo of
2026-10-05 (not in the repository) carries the same reading in its figure 2 and section 6: a
gas-plant cost of 88 → 141 €/MWh where the inputs give 90 → 133.

**Fix:** `build.ts` `neighbourGasCost`, read by the worker for the two profiles; the blend, its
fossil share and the hydrogen parameters are documentary rows with code verification
(`boundary.reprice.tyndp2024.*`); methodology §5.9 and §10; the page's explanation of the figure.

## E-065 — The markup's joint fit is not identified by its fit years, and Estonia's schedule reached 1 364 MW it was not fitted on

**Found:** 2026-10-05 (night), refitting the register in the round of D-073 ·
`app/scripts/fit_markup.ts` (D-023 item 2), methodology §7.2 · **Status:** fixed — D-073,
accepted by the owner on 2026-10-06 (D-078), merged into `main`

Three findings about the utilisation markup of R-SUP-6 as fitted since M3 — one descent on both
fit years, a schedule of four markups per zone:

1. *Twelve parameters are not pinned down.* Descents from five starting points end between 81.31
   and 81.91 €/MWh (the fit years' sum of MAE) with schedules as different as Lithuania 0 / 220 /
   360 / 460 and 45 / 445 / 645 / 845. Fitted on one fit year and scored on the other, a schedule
   per zone gives 84.40, one schedule for Latvia and Lithuania 84.17.
2. *The descent can leave the market.* For one common schedule the joint descent ends at 20 /
   980 / 1 100 / 1 140 €/MWh, a fit-year sum of 81.95, and 27.7 / 27.6 / 29.0 €/MWh on the blind
   year: the fit years seldom need the upper half of the gas fleets, so pricing it out costs
   them nothing.
3. *Estonia's schedule* (80 / 160 / 200 / 200 on the register of D-044) was fitted on the 13–15
   MW of gas Estonia had in 2023–2024, moved 6–10 MW in the replays, and was applied by the same
   code to the 1 364 MW of gas of the scenario of 2035.

**Effect:** on the replays, none that the register did not already show (its schedule was one
of the bounded ones: 60.64 on the blind year, where the candidates lie between 59.9 and 62.6).
On the scenario view: *Elering: gas* 56.9 / 45.5 / 45.6 €/MWh with Estonia's markup, 55.9 / 44.6 /
44.6 on the register of D-073 (which also moves the Latvian and Lithuanian schedule), 55.1 / 43.8 /
43.8 with no markup at all (`spikes/validation-round2/scenario_markup.ts`).

**Fix (D-073 item 3):** one schedule for the Latvian and Lithuanian gas, none for Estonia's;
each fit year's own descent, scored on the other; the register holds their mean. Methodology
§7.2 gives the two schedules, the left-out scores and the reasons.

## E-066 — In a scenario Auvere ran as must-run: the Narva plants' heat floor on the one oil-shale unit left

**Found:** 2026-10-05 (night), auditing the opening scenario's energy by class ·
`app/src/engine/build.ts` `applyChpFloor` (D-022 item 2, D-042) · **Status:** fixed — D-074,
accepted by the owner on 2026-10-06 (D-078), merged into `main`

The fitted floor of Estonian oil shale — 116.4 MW + 12.29 MW per K below 8 °C, the output of
1 330 MW of Narva plants in the below-cost hours of 2023–2024 — was laid on the oil-shale class
of a scenario as on a replay's. The scenario of 2035 (Elering and TalTech's S1) has one such
class, the 270 MW of Auvere, a condensing unit that sells no heat: the floor held it at 116–270
MW in every hour, 1.44 TWh a year at a bid of 213 €/MWh and a CO₂ price of 197.5 €/t.

**Effect:** every scenario result since the scenario view opened on S1 (D-036) had 165 MW of
must-run supply in Estonia that the scenario does not have. Without it *Elering: gas* clears at
58.2 / 46.0 / 46.1 €/MWh (EE / LV / LT) against 55.9 / 44.6 / 44.6, *2 SMR* at 48.1 / 42.2 / 42.3
against 44.2 / 41.4 / 41.5 (on the register of D-073; `spikes/scenario-audit/sens.ts`): the
plant's effect on Estonia's price was overstated by about 1.6 €/MWh for two units. About 1.4 Mt
of CO₂ a year were counted that S1 does not emit. No replay is affected.

**Fix (D-074 item 1):** the oil-shale floor applies in replays only.

## E-067 — In a scenario the waste plants were dispatched on a bid of 152 €/MWh and hardly ran

**Found:** 2026-10-05 (night), in the same audit · `app/src/engine/build.ts` (the scenario
branch of the class loop) · **Status:** fixed — D-074, accepted by the owner on 2026-10-06
(D-078), merged into `main`

A replay takes the waste plants' observed output as given (D-013): 0.09–0.13 TWh a year in
Estonia and 0.42–0.72 in Lithuania, in every hour. A scenario built the class as a thermal offer
at its short-run cost, and with CO₂ at 197.5 €/t on the fossil share of the waste (40 kg/GJ at an
electric efficiency of 22.6 %) that is 152 €/MWh: 0.01 TWh in each country.

**Effect:** about 0.6 TWh of baseload missing from the scenario; with it every opening price is
0.3 €/MWh lower.

**Fix (D-074 item 2):** given output at the megawatts less the technology's outages (0.943).

## E-068 — Since the Nordic flow-based go-live SE4's zone price is not the price at NordBalt's Swedish end

**Found:** 2026-10-05 (night), reading 2025's error by month and by border · R-BND-3,
`export/years.py` (`boundary.<zone>.observed`), methodology §7.1 · **Status:** fixed —
D-075, accepted by the owner on 2026-10-06 (D-078), merged into `main`; specification revision 1.9

R-BND-3 and D-042 rest on an observation of 2023–2024: where a cable is below its limit the two
zones clear at one price, to the cent. For NordBalt that ended on 29 October 2024. From the
Nordic flow-based go-live the cable is coupled at the virtual hub SE4_NB, and Lithuania's price
equals SE4's in 5–11 % of the hours the cable's schedule lies inside its capacity (98 % before),
the hub's in 72–99 %. The night of 2026-10-04 saw the symptom ("LT / SE4 … in 2025 another 11 %
within about one per cent above 1 … the cause was not looked for") and D-042's text gives the
falling shares of equal prices without the reason.

**Effect:** the replays from November 2024 take SE4's price where the market took the hub's:
more than 1 €/MWh apart in 34–43 % of hours, by about 4–7 €/MWh there, on average 0.2–0.9 €/MWh
too high. With the hub's price the hourly MAE of the blind year 2025 falls by 0.5 / 0.7 / 0.8
€/MWh (EE / LV / LT), of January–August 2026 by 0.1 / 0.3 / 0.9, of 2024 by 0.1; the "observed"
congested shares of LT–SE4 in 2025 (73 % and 24 %) were measured against a price the cable did
not see (58 % and 11 % against the hub's). EstLink's hub stands within a euro of Finland's
price; nothing material there. No scenario figure is affected.

**Fix (proposed, D-075):** the boundary price at the virtual hub from JAO's shadow prices and
PTDFs, the cable's own constraints left out.

## E-069 — Poland's zone price is not the price at LitPol's Polish end when Poland's allocation constraint binds

**Found:** 2026-10-06 (night), checking LitPol for what E-068 found on NordBalt · R-BND-3,
`export/years.py` (`boundary.PL.observed`), methodology §7.1 · **Status:** fixed — D-076,
accepted by the owner on 2026-10-06 (D-078), merged into `main`; specification revision 1.9

R-BND-3 takes Poland's day-ahead price as the price at the Polish end of LitPol Link, and D-042
read the hours in which Lithuania's price differed from it with the link below its limit — the
record's "LT = PL in 28, 37 and 20 %" — without asking why they were so many. PSE's allocation
constraint limits Poland's net position in the day-ahead coupling; when it binds, Poland's
interconnectors clear at a price that is not Poland's. It bound in 41, 35 and 29 % of the hours
of 2023, 2024 and 2025 on the import side, by 7–10 €/MWh on the year's average, and in 72 % of
the hours of June–December 2022 on the export side, by 100.

**Effect:** every replay from June 2022 traded LitPol at a price the cable did not see. In the
1 500–1 660 hours a year of 2023–2024 with the link inside its capacity and Lithuania below Poland
the model's Lithuanian price was 15 €/MWh too high; the markup of the Latvian and Lithuanian gas
was fitted on those replays (15 / 145 / 235 / 255 where the corrected ones give 40 / 195 / 315 /
335), and through it the scenario figures stood 0.2–0.5 €/MWh lower than the corrected fit puts
them. Hourly MAE of 2023 11.9 / 12.9 / 12.4 where the corrected replay gives 9.6 / 9.4 / 8.9; of
2024 14.1 / 15.6 / 15.5 against 10.9 / 12.0 / 12.0; of 2022 22.2 / 33.8 / 32.1 against 21.3 / 20.2 /
17.1. The "observed" congested shares of LT–PL and the breaches counted on its net flow in every
year were measured against that price too.

**Fix (proposed, D-076):** Poland's price less the allocation constraint's shadow price, derived
from JAO's Core publication (price spread, shadow prices and PTDFs, net position, limits).

## E-070 — LV–LT's published capacity is already without the balancing allocation the replays took off it

**Found:** 2026-10-06 (night), reading 2026's error by zone after D-076 (Estonia and Latvia
13 €/MWh too low, Lithuania not) · R-LINK-5, `export/years.py` (`borders.LV-LT.reserved_*`),
methodology §4.1, §7.1 · **Status:** fixed — D-077, accepted by the owner on 2026-10-06 (D-078),
merged into `main`; specification revision 1.9

R-LINK-5 subtracts the cross-border capacity allocated to balancing from the A31 of both AC
borders. Nobody had checked that A31 holds it on both. On EE–LV it does; on LV–LT the day-ahead
schedule is held at A31 itself in every congested hour that sits at a capacity, and lay above
"A31 less the allocation" in 307, 187 and 1 387 hours of February–September 2025, October–December
2025 and January–August 2026 — a quarter of the last period, by 195 MW on average.

**Effect:** the replays from 5 February 2025 gave LV–LT 264–383 MW too little. The model parted
Latvia's price from Lithuania's in 14 % of the hours of 2025 and 34 % of January–August 2026
(2 and 6 % in the record) and held Estonia and Latvia too cheap behind the border: hourly MAE of
2026 15.1 / 16.3 / 10.7 where the corrected replay gives 14.1 / 10.3 / 9.2, of 2025 20.0 / 18.8 /
18.0 against 19.6 / 17.7 / 17.5. The batteries' Δ, fitted on the replay of 2026, was 61 where the
corrected replay gives 67 €/MWh; scenario figures move by at most 0.1 €/MWh. D-042's and D-073's
readings of 2026 ("Estonia's and Latvia's mean prices are 13–14 €/MWh too low") carried it.

**Fix (proposed, D-077):** the allocation is taken off EE–LV's A31 alone.

## E-071 — The preset tick under a slider stood at the preset's share of the track, not under the thumb's centre

**Found:** 2026-10-06 by the owner ("the slider's circle sticks by default in a different position relative to the tick mark") · `app/src/ui/panel.ts` `slider` · **Status:** fixed

The tick marking a slider's preset was placed at (preset − min) / (max − min) of the track's
width. A native range thumb does not travel the whole track: its centre runs from half its width
to the track's width less half its width, so the thumb at the preset sat left of the tick near
the track's end and right of it near its start, by up to 8 px. **Effect:** none on any figure;
the thumb and the tick did not meet at the preset. **Fix:** the tick stands at
THUMB / 2 + share × (track − THUMB), THUMB the native thumb's 16 px in Chrome and Safari.

## E-072 — `make deploy DRY_RUN=1` failed in the shell after a successful dry run

**Found:** 2026-10-06 by the executor, rehearsing D-085's deploy · `Makefile` `deploy` ·
**Status:** fixed

The dry run's message "deploy: dry run, nothing sent" sat inside `$(if …)`, whose arguments are
separated by commas: the comma split it, and the shell received an unterminated quote after
rsync's dry run had passed. **Effect:** none on any figure or on a real deploy; the dry run ended
with an error. **Fix:** the message reads "deploy: dry run; nothing sent".

## E-073 — A31's missing hours copied last week's capacity into a cable's forced outage

**Found:** 2026-10-07 by the executor, reading the blind year's worst days · `export/years.py`
`_ntc` · **Status:** fixed — D-091, accepted by the owner on 2026-10-07 (D-095)

ENTSO-E publishes no offered capacity (A31) for NordBalt in 47 hours of 30 March – 1 April 2025;
the export filled them with the same hour of the week before (D-013), 700 MW each way. NordBalt
was out: a forced outage at 0 MW is published for 29 March 06:30 – 2 April 13:20 (A78), and the
scheduled exchange is 0 in every hour of 30 March – 1 April. **Effect:** the 2025 replay
imported up to 700 MW from SE4 that the market did not have on those three days; on 31 March
the model cleared Latvia and Lithuania at 114–168 €/MWh against 240–640 observed. **Fix:** an
hour the weekly rule fills inside a published forced outage of the border and direction takes
no more than the outage's available capacity. Planned outages are not used: their records can
outlive cancelled work — NordBalt carried 448 MW on 10 September 2025 inside a planned week
published at 0 MW. Only 2025 changes (2 × 47 hours); its MAE moves by −0.04 / +0.01 / +0.01
€/MWh (EE / LV / LT), the weekly storage plans around the outage shifting the neighbouring days.

## E-074 — Poland's day-ahead prices before 2020 read in złoty as euros

**Found:** 2026-10-07 by the executor, fetching 2016–2019 for the Statistics page (D-092) ·
`pipeline/sources/entsoe.py` `parse` · **Status:** fixed on branch `night/2026-10-07`

ENTSO-E's Polish day-ahead documents before 2020 are in euros from January 2016 to February 2017,
with too many hours missing for any month to reach nine tenths, and in złoty (PLN) alone from March
2017 to 19 November 2019 (`currency_Unit.name`; five days carry both); the parser took every series
as euros, so the 2018 mean read 222.6 "€/MWh". *(Corrected 2026-10-07 by the night's review: this
paragraph first said each day was published twice.)* **Effect:** none on any figure of the model —
no replay year reaches back before 2020, and the 2020–2026 documents carry euros alone; the
Statistics page's first export of the night would have shown it. **Fix:** a price series in another
currency than the euro is left out; Poland's series on the page starts in December 2019, the first
month with nine tenths of its hours in euros.

## E-075 — Hand-set bids: an unreadable text, a wrong base at 0, an empty box above 999, a sub-euro move, the focus on the wrong box

**Found:** 2026-10-07 by an independent review of the commits of 2026-10-06 (the night run's audit) · `app/src/state/text.ts` `toMap`, `app/src/engine/build.ts` `bidParts`, `app/src/ui/panel.ts`
· **Status:** fixed on branch `night/2026-10-07`

Five faults of D-090 (and one of D-089). (1) A bid on a class the zone's fleet does not have
went into the scenario text, which the parser then refused: a scenario button that changes a
zone's fleet keeps the bids, and Lithuania's Litgrid fleet, which has no gas, still shows a gas
row; the share link and the panel's text failed to load. (2) The box's base, the costs' bid, was
taken as the bid less the offset, wrong once the bid is held at 0: with the bid at 0 and gas at
20 €/MWh the tip said the costs gave 189 where they gave 146, and the next typed bid stored the
wrong offset. (3) A bid of 1 000 €/MWh or more showed an empty box — the thousands space of the
display format is no number. (4) Typing back the whole euros the box showed stored a sub-euro
offset (Auvere: +0.5) and marked the bid moved. (5) After a typed bid the focus went to the first
of Estonia's four gas boxes, and an editable bid's tip did not show on keyboard focus. **Effect:**
no figure of a run that loaded; a moved bid could not be shared. **Fix:** the text writes a bid
only for a class the zone's fleet has; `bidParts` returns the costs' bid as `cost`, the box's
base; the box holds the rounded bid as a plain number; a typed bid within half a euro of the
costs' is no move (`bidOffset`); each box has its own id, and the tip shows while the box has the
focus.

## E-076 — A scenario button under National Trends+ set the zones' demand to Elering's and ERAA's

**Found:** 2026-10-07 by an independent review of the commits of 2026-10-06 (the night run's audit) · `app/src/ui/panel.ts` `choose` · **Status:** fixed on branch `night/2026-10-07`

D-081's reset took `opening()`'s zones, whose demand is Elering's S1 and ERAA's. Under the
neighbours' profile National Trends+ of the run's year the family's own demand applies (D-046):
the text and the demand's *i* then named S1 while the engine, reading the family, ran its own.
**Effect:** none on the run's figures; the panel and the text named the wrong demand. **Fix:** the
reset goes through `withProfile`, which gives each zone the family's demand.

## E-077 — The Weather table ranked the hydro inflow out of 38 years where 36 have a figure

**Found:** 2026-10-07 by an independent review of the commits of 2026-10-06 (the night run's audit) · `app/src/ui/weather.ts` · **Status:** fixed on branch `night/2026-10-07`

The table printed the Daugava's 1995 inflow as "1.37 (24/38)" while the bars, rightly, said 24/36:
TYNDP 2024's hydro inflows end in 2017. **Fix:** a rank is out of the years that have a figure.

## E-078 — Retort gas had no icon in the validation view

**Found:** 2026-10-07 by an independent review of the commits of 2026-10-06 (the night run's audit) · `app/src/ui/icons.ts` · **Status:** fixed on branch `night/2026-10-07`

D-083 keyed the icon `oil_shale_retort_gas`; the class is `retort_gas`, so its row in every
observed Estonian year lost the icon row's layout and its bid tag dropped below the slider.
**Fix:** `retort_gas` takes the oil shale's icon.

## E-079 — Two rules of the scenario table never took effect

**Found:** 2026-10-07 by an independent review of the commits of 2026-10-06 (the night run's audit) · `app/src/ui/theme.css` · **Status:** fixed on branch `night/2026-10-07`

The selected scenario's accent border asked for `td.n.sel:first-of-type`, which no value cell is
(the label is the row's first cell); the hovered cell's 42 % fill lost to the row's and the
column's lighter fills, which are more specific (D-082). **Fix:** the border on `td.n.sel:not(.d)`;
the hovered cell's fill takes precedence.

## E-080 — Lithuania's run-of-river inflow carried the Daugava's note on the Weather page

**Found:** 2026-10-07 by an independent review of the commits of 2026-10-06 (the night run's audit) · `export/tables.py` `climate_years` · **Status:** fixed on branch `night/2026-10-07`

One note — the engine scales the Daugava's inflow by D-070's factor — was attached to every hydro
series. **Fix:** each cascade its own: Lithuania's run-of-river is given output.

## E-081 — The observed years' CO₂ price averaged the aviation allowances' auctions in

**Found:** 2026-10-07 by the executor, auditing the Statistics page's CO₂ series (the night run's audit) · `pipeline/sources/eex.py` `parse` · **Status:** fixed — D-094, accepted by the owner on 2026-10-07 (D-095)

EEX's yearly auction reports list the auctions of general allowances (EUA) and, five to eight
times a year in 2017–2024, of aviation allowances (EUAA), a product of its own with its own
clearing price (2023's mean 80.75 €/t against the EUA's 83.70). `parse` kept every successful
auction, so the month's mean CO₂ price — the bids of every observed year (R-SUP-3), the 2024
reference the oil-shale premiums are set against (R-SUP-4) and the Statistics page — averaged
them in. **Effect:** a month's mean moves by at most 0.04 / 0.03 / 0.34 / 0.19 / 0.17 €/t in
2020 / 2021 / 2022 / 2023 / 2024; the 2024 reference from 64.757 to 64.754 €/t and the premiums by
at most 0.003 €/MWh; every replay's hourly MAE by at most 0.002 €/MWh; the golden fixture's 2024
replay changes. The reports of 2025 and 2026 list no EUAA auction. **Fix:** `parse` leaves out
the auctions whose name starts with "EUAA".

## E-082 — The specification still names three scenarios and two or three units after D-058

**Found:** 2026-10-07 by the executor, checking the specification against the decisions since D-079 (the night run's audit) · SPECIFICATION.md `R-SMR-1`, `R-APP-1`, `R-APP-5` · **Status:** fixed in SPECIFICATION revision 2.6 (D-095)

D-058 (accepted 2026-10-05) added *1 SMR* — four scenarios, twelve runs — and left R-SMR-1's text
to the owner; revision 2.0, the full revision of 2026-10-06, did not carry it. R-SMR-1 still reads
"0, 2 or 3 units"; R-APP-1's paragraph of revision 1.6 lists the panel's scenarios as *Elering:
gas*, *2 SMR* and *3 SMR* and shows "the three scenarios side by side"; R-APP-5 compares "the
scenario view's three scenarios". The application, the methodology (§8, §11) and the FAQ have
four, as one table (D-082). **Effect:** none on a figure; a reader of the specification alone
misses the one-unit case. **Fix (proposed):** the next revision reads "0, 1, 2 or 3 units" in
R-SMR-1 and "the four scenarios, as one table" in R-APP-1 and R-APP-5, citing D-058 and D-082.

## E-083 — A rebuild of a database made before a parser change keeps the rows the parser now drops

**Found:** 2026-10-07 by an independent review of the night's commits · `db/build.py`
`load_commodity`, `load_entsoe_a44` · **Status:** fixed on branch `night/2026-10-07`

The loaders insert or replace and never delete. After D-094 the EEX parser leaves out the aviation
allowances' auctions, and after E-074 the A44 parser leaves out prices in złoty; but `make db` on a
database built before either change keeps the rows the parser no longer yields — 23 days with an
aviation auction alone in 2022–2024, at its price, and Poland's złoty hours of 2016–2019. Only
`make check`'s rebuild would see it (`make deploy` runs the check without the rebuild). **Effect:**
none on the committed figures — the database of the branch was rebuilt from the raw cache and
`make check` finds it identical to a fresh build. **Fix:** the EEX rows are deleted before the
reports are loaded again, and an A44 file's rows before the file is loaded again.

## E-084 — A capacity held by a forced outage named every outage file of the year as its source

**Found:** 2026-10-07 by an independent review of the night's commits · `export/years.py`
`_outage_cap` (D-091) · **Status:** fixed on branch `night/2026-10-07`

`_outage_cap` gathered the lineage of every forced event of the border and direction that
overlapped the year, and `_ntc` attached all of it once any filled hour was held — including
events in hours A31 publishes, which change nothing. **Effect:** none on a figure; on the branch's
data both 2025 NordBalt events sit in one A78 file, so the lineage was right by chance. **Fix:**
per hour, the event that sets the least capacity is kept, and only the events that hold a filled
hour are named.

## E-085 — No CO₂ price in 2024 raised the wrong error

**Found:** 2026-10-07 by an independent review of the night's commits · `export/tables.py`
`oil_shale` (E-060's fix) · **Status:** fixed on branch `night/2026-10-07`

Over no rows the database's `list(price)` comes back as a missing value, so the check meant to say
"no EUA prices in 2024" raised a `TypeError` on its length. **Effect:** none with the data; a
confusing message on an empty database. **Fix:** the query counts its rows and the check reads
the count.

## E-086 — The 105 MW of Estonia's solar added in 2025 had no source link on the Statistics page

**Found:** 2026-10-07 by an independent review of the night's commits · `app/src/ui/statistics.ts`
`estoniaSolar` (D-093) · **Status:** fixed on branch `night/2026-10-07`

The note under the solar figures printed the renewable-energy chamber's 105 MW added in 2025 but
linked only the sources of the 1 210 and 1 430 MW. **Fix:** the note links the third row's
document too; a test looks for it.

## E-087 — Two descriptions in the night's own records

**Found:** 2026-10-07 by an independent review of the night's commits · DECISIONS D-092, D-093,
ERRATA E-074, methodology §8.7, the Statistics page, `docs/research/2026-10-06_statistics.md` §6 ·
**Status:** corrected on branch `night/2026-10-07`

D-093 said SE4 "added 2 577 MW of wind by the end of 2025": 2 577 MW is what it held then. And the
records and the page said ENTSO-E published Poland's prices before 2020 "in złoty, with euros on a
few days only" (E-074: "each day twice"): read again file by file, they are in euros from January
2016 to February 2017 with too many hours missing for any month to reach nine tenths, in złoty
alone from March 2017 to 19 November 2019, and five days carry both. **Effect:** none on a figure;
the export's rule already kept those months out. **Fix:** the wording.

## E-088 — The doughnuts' tooltips were cut off and the hole's figures painted over them

**Found:** 2026-10-07 by an independent review of the day's commits (the night run's audit) ·
`app/src/ui/charts.ts` `drawPies`, `centre` (D-097, D-098) · **Status:** fixed on branch
`night/2026-10-08`

Chart.js draws a tooltip inside its canvas, and a doughnut's canvas is 93 to 229 px wide at windows
of 1 100 to 1 920 px. At 1 440 px every one of the three rings' 21 tooltips was wider than its
149 px (150–249 px) and lost its figures: the line repeated the slice's name under the title and
carried the colour box. The hole's figures were drawn after the tooltip (`afterDraw`, which runs
after Chart.js's own), so they covered any tooltip that crossed the hole; on canvases under about
110 px they ran up to 5.5 px into the ring. The legend under the three listed the groups against
the ring's order. **Effect:** none on a figure; the slice's TWh and share, which D-097 promises on
the pointer, could not be read at common widths. **Fix:** the tooltip's line is the TWh and the
share alone, in 11 px, without the colour box; the hole is drawn with the slices, under the
tooltip, its text scaled down in a hole narrower than 44 px; the legend follows the ring.
Measured on a recording canvas: no tooltip wider than its canvas from 122 px up (windows from
about 1 280 px), 3 of 21 at 100–110 px; the hole's text inside the hole down to 93 px.

## E-089 — The price duration curve never said where its axis was cut

**Found:** 2026-10-07 by an independent review of the day's commits · `app/src/ui/charts.ts`
`drawCharts` · **Status:** fixed on branch `night/2026-10-08`

The title was looked up as the canvas's previous sibling; since 2026-09-26 (commit 8881746) each
canvas stands alone in its plot box, so the title stayed "Price duration curve" and methodology §8's
"says how many hours lie beyond" did not hold — while every replay year's axis is cut (2022: at
800 €/MWh, 3 hours above it). **Effect:** none on a figure; the reader was not told the curve was
cut. **Fix:** the title is the chart's heading, as D-097 found for the energy mix's.

## E-090 — The battery's icon stopped a scenario run on Safari 15.4–15.6 and Firefox 94–111

**Found:** 2026-10-07 by an independent review of the day's commits · `app/src/ui/icons.ts`
`drawIcon` (D-098) · **Status:** fixed on branch `night/2026-10-08`

The battery glyph's body is a rounded rectangle drawn with `Path2D.roundRect`, which Safari has
from 16 and Firefox from 112, while the rest of the application runs from Safari 15.4 and
Firefox 94. The default scenarios' storage slice is large enough for its icon, so there the
exception reached the run and the page said "The run failed", without the later charts and the
sensitivities. **Effect:** none on a figure; on those browsers no scenario showed. **Fix:** a
square-cornered rectangle where the method is missing; a test draws every icon without it.

## E-091 — The charts took their kind from the run the panel was about to compute

**Found:** 2026-10-07 by an independent review of the day's commits · `app/src/main.ts`
`showHeadline`, `drawChartsNow`, the charts' tabs (D-097) · **Status:** fixed on branch
`night/2026-10-08`

Doughnuts or bars, and the actual line, were chosen from the panel's run kind, which changes the
moment the reader clicks *Validation* or *Scenario*, while the results change only when the run
ends. In between, a theme change or a print left the doughnuts as they were, their hole's figures
in the other theme's colour, and a click on a year, zone or border tab drew a scenario's results
as bars. **Effect:** none on a figure; a wrong chart for a few seconds. **Fix:** the kind is the
one of the run whose results are shown.

## E-092 — Two statements of D-097 and D-098, an amendment in place, the specification's header

**Found:** 2026-10-07 by an independent review of the day's commits · DECISIONS D-097, D-098;
SPECIFICATION.md's header · **Status:** corrected here and in the header on branch
`night/2026-10-08`

D-097 says the hole holds "the figure of the card's 'CO₂' row for the same run": the card weights
the three weather years, the hole holds the year shown — methodology §8 says so. D-098 item 1 says
the ring "is what the zone used": so only for a net importer; a net exporter's ring is its
generation, more than it used. D-098 was amended in place the same day at the owner's request (the
icons always white), where AGENTS.md asks for a new record that supersedes. The specification's
header gave revision 2.1 of 2026-10-06 since revision 2.2. **Effect:** none on a figure. **Fix:**
the decisions stay as written and this entry corrects them; the header reads revision 2.7 of
2026-10-07.

## E-093 — A negative figure printed with a hyphen

**Found:** 2026-10-07 by the executor, testing the Vite 8 build in the browser (the night run's
audit) · `app/src/ui/labels.ts` `fmt` · **Status:** fixed on branch `night/2026-10-08`

The scenarios' table showed 3 SMR's Estonian net import as "-0.59 TWh" where its differences and
the cards' balances print "−": `fmt` passed on the locale's hyphen-minus, and a figure rounding to
zero from below came out "-0.00". **Effect:** none on a figure. **Fix:** `fmt` prints the minus
sign (U+2212) and no sign on a figure that rounds to zero; a test.

## E-094 — A load of an archive that failed half-way was kept as whole by the next build

**Found:** 2026-10-07 by an independent review of the export's and the database's code (the night run's audit) · `db/build.py` `_archive_unchanged` (E-056) · **Status:** fixed on branch `night/2026-10-08`

The record of the archive's hash (`loaded_archive`) was written before the archive's rows: a load
that failed or was interrupted after the deletes left a part of the rows, and the next `make db`
found the hash, printed "archive unchanged" and kept the part — the reviewer's case, a PECD archive
whose second member is unreadable, kept Estonia's rows alone. Nothing would have caught it: the
year schema asks for one boundary profile at least, and `make deploy` runs `db.check --fast`,
without the rebuild. **Effect:** none on the committed figures; the branch's database is a fresh
build. **Fix:** each archive loader runs in one transaction (`_atomic`), so its deletes, its rows
and its hash record go in together or not at all; a test interrupts one.

## E-095 — A row taken out of a documentary CSV stayed in the database

**Found:** 2026-10-07 by an independent review of the export's and the database's code (the night run's audit) · `db/build.py` `load_documentary`, `load_tech_parameters`, `load_links`,
`load_parameters`, `load_fuel_paths` · **Status:** fixed on branch `night/2026-10-08`

The five documentary tables were loaded by insert-or-replace, so a row deleted from its CSV, or
one whose key was renamed, stayed beside the new one: `capacity.gas` renamed `capacity.natural_gas`
gave the class twice its megawatts. E-083 had fixed the same for two raw tables. **Effect:** none
on the committed figures: every table matched its CSV in the branch's database. **Fix:** each
table is emptied before its file is loaded (`_replace`); a test.

## E-096 — An ENTSO-E file that could not be read did not fail the build

**Found:** 2026-10-07 by an independent review of the export's and the database's code (the night run's audit) · `db/build.py` `load_entsoe` · **Status:** fixed on branch `night/2026-10-08`

The loader printed "FAILED" for a file it could not read and went on, and `make db` ended in
success: the month became a gap the export fills by persistence (A31) or a run of zeros (flows,
schedules and net positions in the validation files), and the full check's rebuild failed the same
way and so agreed. **Effect:** none: no file fails (the night's fresh build). **Fix:** every file
is still tried, and then the build stops with the files that failed; a test.

## E-097 — The lineage check's first part compared the database with itself

**Found:** 2026-10-07 by an independent review of the export's and the database's code (the night run's audit) · `db/check.py` `check_lineage` · **Status:** fixed on branch `night/2026-10-08`

"Fact rows without a record" joined the fact tables to the database's own `lineage` table, to
which the schema's foreign keys already hold every row, so it could not fail; the record files
were compared with the raw files only. **Effect:** none: the 6 477 record files match the
database's rows. **Fix:** the fact tables' lineage ids are checked against the record files.

## E-098 — A Baltic reservoir week was dated the Sunday before it

**Found:** 2026-10-07 by an independent review of the export's and the database's code (the night run's audit) · `db/build.py` `load_entsoe_a72` · **Status:** fixed on branch `night/2026-10-08`

A72's weeks start at Monday 00:00 local time: Sunday 23:00 UTC in CET, 22:00 in the Baltic EET,
21:00 in its summer time. The loader added one hour, right for CET only, so all 683 Latvian and
Lithuanian rows of the `reservoir` table were dated the Sunday. **Effect:** none: nothing reads the
table. **Fix:** three hours, the Monday in each; a test.

## E-099 — In a leap climate year the hydro inflow's weeks ran a day ahead of the layout's

**Found:** 2026-10-07 by an independent review of the export's and the database's code (the night
run's audit) · `db/build.py` `load_hydro_inflow` (R-TIME-6) · **Status:** fixed on branch
`night/2026-10-08`; the scenarios' figures move by up to 0.06 €/MWh — with the branch's sign-off

PEMMDB's daily hydro sheets hold 366 days: in a leap year the 60th is 29 February, in another the
366th is empty. The loader cut them into weeks of seven from the first day, while the climate
years' layout has no 29 February (`axis.drop_feb29`), so in climate year 2008 — the one leap year
of the three — weeks 9 to 52 ran a day ahead of the layout's and week 53, one day long in the
layout, took two days of water (the Daugava 5.19 GWh against 2.53). In 1995 and 2009 the empty
366th day halved PEMMDB's week-53 "maximum generating power", which the engine does not read for
the Daugava (D-070). **Effect:** `cy2008.json.gz`'s weekly energy of the Daugava and of Lithuania's
run-of-river (a week by up to 11.5 GWh, 18 %, for the Daugava, about 2 GWh for the river);
`cy1995` and `cy2009` in week 53's maximum power only. The opening state, weighted over the three
years (`spikes/export-review/effects.ts`):

| €/MWh, EE / LV / LT | before | after |
|---|---|---|
| Elering: gas | 72.70 / 58.17 / 58.22 | 72.72 / 58.21 / 58.26 |
| 1 SMR | 67.44 / 56.08 / 56.14 | 67.44 / 56.10 / 56.17 |
| 2 SMR | 60.60 / 54.46 / 54.56 | 60.61 / 54.51 / 54.61 |
| 3 SMR | 51.75 / 53.39 / 53.49 | 51.76 / 53.45 / 53.55 |

Estonia's net import and the CO₂ do not move at two decimals. **Fix:** a sheet's day is put on
the layout's (`_layout_week`): 29 February goes into the 28th and the days after it move up one, so
a year keeps its water and D-070's ratio, which compares whole years, does not move; the empty
366th day goes. A test.

## E-100 — The panel named the observed 2025 profile by the zones' plain average price

**Found:** 2026-10-07 by an independent review of the export's and the database's code (the night
run's audit) · `export/tables.py` `boundary` (`mean_price`; D-047, D-051) · **Status:** fixed on
branch `night/2026-10-08`

The panel's "Other" list names each neighbours' profile with its average price. For the observed
2025 profile the figure was the zones' day-ahead average (A44), while the series the climate-year
files carry, and a run takes, is the price at each zone's end of the cable (D-075, D-076): Poland
104.30 €/MWh against the series' 96.86, SE4 60.43 against 60.29, Finland 40.49 against 40.52; its
source link named the 13 A44 records and not the 12 JAO files beside them. **Effect:** none on a
run; Poland's label read 7.4 €/MWh high. **Fix:** the average of the series itself, with its
lineage (`presets.json` regenerated).

## E-101 — The neighbours' observed 2025 prices ran two weekdays off the climate years

**Found:** 2026-10-07 by an independent review of the export's and the database's code (the night
run's audit) · `export/years.py` `climate` (D-051) · **Status:** fixed on branch `night/2026-10-08`
as D-100 proposes — awaiting the owner's sign-off

The climate-year files begin on a Monday; the observed profile of 2025 was copied in from
1 January 2025, a Wednesday, so its weekends — Finland's and SE4's prices half their weekday's —
fell on the layout's Thursdays and Fridays, where the Baltic demand is a working day's, and its
Mondays and Tuesdays on the layout's weekend. The correlation of the Baltic daily demand with the
neighbours' daily price fell to 0.05 (Finland), 0.10 (SE4) and 0.31 (Poland) from 0.22, 0.32 and
0.55 aligned. **Effect:** none on the opening state or any TYNDP profile; a run on the observed
profile sold more at the Baltic weekends and bought more on Thursdays and Fridays than the year it
copies — Estonia's price with it up to 1.0 €/MWh off (D-100's table). **Fix:** D-100.

## E-102 — The pinned packages need Python 3.12 where the README promised 3.11

**Found:** 2026-10-08 by an independent review of the night's own commits · `constraints.txt` (ea4793d), `README.md`, `pyproject.toml` · **Status:** fixed on branch
`night/2026-10-08`

The README and `requires-python` said Python 3.11 or later, but the pins install numpy 2.5.3,
which needs 3.12: `make setup` would fail on a Python the README called supported. **Effect:** none
on this machine (3.13). **Fix:** both say 3.12 or later and why.

## E-103 — The night's fix of the leap-day hydro weeks moved series that have no 29 February

**Found:** 2026-10-08 by an independent review of the night's own commits · `db/build.py` `_layout_week`, `load_hydro_inflow` (f75c8be, E-099) · **Status:** fixed on
branch `night/2026-10-08`

E-099's fix folded 29 February into the 28th for every daily series of a leap climate year. Only
the inflow holds 366 days there: PEMMDB gives the Daugava's turbine limits and reservoir levels
alike in every climate year, with an empty day 366 even in a leap year, so the fix shifted them a
day and left their week 53 at the empty day (the maximum power 0 in all nine leap years
1984–2016). E-099's account was loose with it: "the empty 366th day goes" held for those series
only where nothing was shifted, and its 5.19 against 2.53 GWh are PEMMDB's figures while its 11.5
GWh is the export's, after D-070's factor of 1.95. **Effect:** none on a run — the engine reads
neither series in a scenario — and `cy2008`'s week-53 maximum power of the Daugava was 0 instead of
127 MW. **Fix:** a series is folded only where its day 366 holds a value in a leap climate year;
any other drops its empty day 366 and keeps its dates. Against `main`, `cy1995`, `cy2008` and
`cy2009` now differ in the week-53 maximum power (+126 MW, the empty day no longer averaged in) and
`cy2008` in its inflow's weeks 9 to 53; the scenarios' figures are E-099's.

## E-104 — The duration curve's title counted the model's hours beyond the cut, not the actual year's

**Found:** 2026-10-08 by an independent review of the night's own commits · `app/src/ui/charts.ts` `drawCharts` · **Status:** fixed on branch `night/2026-10-08`

E-089 made the title visible again, and with it its count: the model's hours above the cut, where
in a replay the actual line is cut too. In the 2022 replay Lithuania's axis stops at 900 €/MWh with
no hour of the model above it and six of the record; the title said "0 hours above". **Effect:**
none on a figure. **Fix:** a replay's title counts both lines ("model 0, actual 6 hours above").

## E-105 — Four descriptions of the night's changes

**Found:** 2026-10-08 by an independent review of the night's own commits · the import-price page (`app/src/ui/importprice.ts`), methodology §1 and §10, D-100,
`spikes/protocol-windows/README.md` · **Status:** corrected on branch `night/2026-10-08`

The import-price page and methodology §10 described the observed 2025 profile as the zones'
day-ahead prices (A44) taken in unchanged, where it is each zone's price at its end of the cable
(D-075, D-076) and, with D-100, begins at the year's first Monday — so its months on that page are
the layout's, a few days off the calendar's. Methodology §1 still said a row removed from a
documentary CSV stays in the database until a clean build, which E-095 ended. D-100 quoted D-051's
"hour by hour of that year", where D-051 reads "hour by hour, the series the 2025 replay takes".
The spike's README gave 120 runs for each variant, where V2 took 167. **Fix:** the wording.

## E-106 — The observed profile's fill records did not move with it

**Found:** 2026-10-08 by an independent review of the night's own commits · `export/years.py` `climate` (6fbf977, D-100) · **Status:** fixed on branch
`night/2026-10-08`

D-100 rolled the observed series to its first Monday after its fills, if any, had been recorded on
the unrolled hours, so a year file's `meta.filled` would point 120 hours off. **Effect:** none:
the observed 2025 series have no fill in any climate year. **Fix:** `_from_first_monday` moves the
fills' hours with the series; a test.

## E-107 — Two of the night's loader fixes reached a database only through a clean build

**Found:** 2026-10-08 by an independent review of the night's own commits · `db/build.py` `load_entsoe_a72` (E-098), `load_hydro_inflow` (E-099) · **Status:** A72
fixed on branch `night/2026-10-08`; the hydro archive documented

`make db` upserts an A72 file's rows, so on a database built before E-098 the Sunday rows stayed
beside the Monday ones; and an archive is not read again while its hash is unchanged, so on a
database loaded before E-099 `make db` kept the old weeks and `make export` would write them back.
**Effect:** none on the committed files: the branch's database is built from scratch. **Fix:** an
A72 file's rows are deleted before it is loaded again (as A44's, E-083), with a test; for a change
to how an archive is read, methodology §1 says a clean build is needed.

## E-108 — Re-priced, the import-price page's hint multiplied the published profile

**Found:** 2026-10-08 by an independent review of the application's data path (the night run's audit) · `app/src/ui/importprice.ts` `ipHint`, `duration`; `app/src/main.ts` `drawImport` (D-072,
D-079) · **Status:** fixed on branch `night/2026-10-08`

The hint under the level read "weighted average × level = price", with the published profile's
average on the left and the re-priced profile's on the right: on the opening state "39.9 €/MWh ×
1.00 = 50.7 €/MWh" for Finland (SE4 45.9 → 60.2, Poland 57.2 → 78.6), a sum that does not hold
since D-079 made re-pricing the default. The duration chart drew the published curve only when the
level moved, so at level 1 it hid the difference. **Effect:** none on a run; the page's arithmetic
was wrong where the panel's level mark (50.7) was right. **Fix:** re-priced, the hint reads
"published 39.9 €/MWh, re-priced to the scenario's gas and CO₂ 50.7 €/MWh × 1.00 = 50.7 €/MWh", and
the published curve is drawn beside the price; a test.

## E-109 — A scenario's "median price" card averaged the climate years' medians

**Found:** 2026-10-08 by an independent review of the application's data path (the night run's audit) · `app/src/ui/results.ts` `cardsHtml` · **Status:** fixed on branch `night/2026-10-08`

The card's help says half of the hours were cheaper and half dearer, but for a scenario the figure
was the weighted average of the three climate years' medians — on the opening state Estonia 61.2
€/MWh where the median of the weighted hours is 61.6, Latvia and Lithuania 52.4 against 53.7; the
gap ran from 0.2 to 2.0 €/MWh over the four scenarios. **Effect:** the median row of a scenario's
cards; a replay's (one year) was right. **Fix:** the median of the set's hours, each year's hours
weighing its weight over its hours (`weightedMedian`); a set of one keeps its year's median; a test.

## E-110 — TYNDP 2024 gives the Daugava's 2050 inflow at a 53rd of 2030's and 2040's

**Found:** 2026-10-08 by an independent review of the application's data path (the night run's audit) · `data/export/years/cy*.json.gz` (`zones.LV.hydro_weekly_mwh.daugava.2050`), the source
`tyndp2024.Hydro-Inflows`, `PEMMDB_LV00_Hydro_Inflows_2050.xlsx` · **Status:** open — not read by
any run; recorded

The 2050 workbook's "Energy Inflow [GWh/day]" for the LV00 pondage node is the 2030 and 2040
workbooks' divided by 53.07 in every day of every climate year (climate year 2009: 30.14 GWh in the
year against 1 599.61; its first day 0.0443 against 2.3491), so the export's 2050 series holds
0.05–0.06 TWh a year against 2.7–3.4 for 2030 and 2040. The loader reads the workbook as it is; the
other nodes' 2050 rows are in line. **Effect:** none: the scenarios run the Baltic side of 2035,
which reads 2030 and 2040; a run of a later target year would take the series as it stands.
**Fix:** none yet; a target year after 2040 for the Baltic side would first have to decide what
stands in for it.

## E-111 — A net position's hour that held both signs was the sum of two averages

**Found:** 2026-10-08 by an independent review of the sources' parsers (the night run's audit) · `db/build.py` `load_entsoe_a25` · **Status:** fixed on branch `night/2026-10-08`

ENTSO-E's A25 gives a zone's net position as two series, export and import, each MTU in its
sign's series alone. The loader averaged each series over the hour and added the two averages,
which is right while an hour holds one point; with quarter-hours, from October 2025, an hour can
hold both signs: Lithuania on 2026-08-13 at 17:00 UTC exported 262.8 MW in one quarter-hour and
imported about 100 in the other three, an hour of −10.0 MW that the loader made +161.9. 145 hours
of Estonia's, 354 of Latvia's and 447 of Lithuania's were off, by up to 99, 111 and 172 MW, about
nothing on average. **Effect:** the observed net positions of the 2025 and 2026 validation files;
no run reads them. **Fix:** the hour is the average of its signed points; a test on that hour.

## E-112 — A flow's quarter-hour the other direction reported was left out of the hour's average

**Found:** 2026-10-08 by an independent review of the sources' parsers (the night run's audit) · `db/build.py` `load_entsoe_a11` · **Status:** fixed on branch `night/2026-10-08`

Since May 2026 the LV–LT and LT–SE4 directions of A11 leave out the quarter-hours in which the
power ran the other way, where earlier files gave them as 0, so the hour's average ran over the
quarter-hours present and came out high: six hours of LV–LT in July 2026 by up to 196 MW, three
of LT–SE4 in June by up to 34. Latvia's energy balance in those hours closes to 4 MW with the left-out
quarter-hours as 0 and misses by 83 MW without (the reviewer's check). **Effect:** the observed
flows of the 2026 validation file in those hours; the record of 2026 (`data/derived/validation/
2026.json`) moves in its sixth digit. **Fix:** a quarter-hour the other direction's file reports
is 0 in this one; one that neither reports stays missing — on 2026-08-19 at 04:00 both directions
give one quarter-hour only, and the hour keeps its 594.5 MW. A test.

## E-113 — A weekly period across the spring clock change lost its last week

**Found:** 2026-10-08 by an independent review of the sources' parsers (the night run's audit) · `pipeline/sources/entsoe.py` `parse` · **Status:** fixed on branch `night/2026-10-08`

A period's point count was the truncated quotient of its length by its resolution; a weekly
period across the spring clock change is an hour short of whole weeks, so A72's March 2024 lost
the week of 25 March for Latvia and Lithuania. The quotient is rounded now; over every raw file
only 12 weekly periods are read differently. **Effect:** two rows of the `reservoir` table, which
nothing reads. A test.

## E-114 — A quarter-hour with no binding Nordic constraint was averaged as missing, not as 0

**Found:** 2026-10-08 by an independent review of the sources' parsers (the night run's audit) · `pipeline/sources/jao.py` `hub_spreads` (D-075) · **Status:** fixed on branch
`night/2026-10-08`

The month of `fbDomainShadowPrice` is asked for the binding constraints only, so an MTU without
one is absent from it, and with quarter-hours the hour's spread averaged the ones present: in 40
hours from November 2025 the hub's price stood off by up to 1.46 €/MWh (SE4_NB on 2026-05-24 at
06:00), Finland's by 0.02 at most. **Effect:** SE4's observed price in ten hours of 2026 and
Finland's in five, by up to 1.45 €/MWh; no replay's MAE moves at two decimals, and 2024's year file
only in its notes' hour counts — its prices and the golden fixture do not move. **Fix:** the
month's MTUs are its `maxNetPos`'s, and an MTU without a binding constraint has a spread of 0; a
test.

## E-115 — Open-Meteo's radiation was stored an hour late

**Found:** 2026-10-08 by an independent review of the sources' parsers (the night run's audit) · `pipeline/sources/openmeteo.py` `parse` · **Status:** fixed on branch `night/2026-10-08`

`shortwave_radiation` is the preceding hour's average, labelled at the hour's end; it was stored
as the hour that begins there (Tallinn's June 2024 radiation centred at 10.83 h UTC against a
solar noon near 10.36). **Effect:** none: only the temperature, an instantaneous value, is read
downstream. **Fix:** the radiation moves back an hour to the hour it covers; a test.

## E-116 — The Statistics and Weather pages' "in Sources" links went nowhere

**Found:** 2026-10-08 by an independent review of the reference pages (the night run's audit) · `app/src/main.ts` (the `data-goto` handler), `app/src/ui/statistics.ts`,
`app/src/ui/weather.ts` · **Status:** fixed on branch `night/2026-10-08`

Both pages link a figure to its source by its lineage id (`ecb.exr.USD-EUR.M.2026-09`), while the
Sources view's rows carry a family's or a document's id (`src-ecb`); the handler looked the
lineage id up as it stood, so all 53 links — 34 on Statistics, 19 on Weather — opened the view at
its top with no row marked. The panel's links resolve the id first, and worked. **Effect:** none on
a figure; R-APP-9's link from a figure to its source was broken on two pages. **Fix:** the handler
resolves every link as the panel does (`gotoRow`); a test follows all 53.

## E-117 — The Weather page's demand peaks were not at one annual energy

**Found:** 2026-10-08 by an independent review of the reference pages (the night run's audit) · `export/tables.py` `climate_years`, `export/years.py` `ranks`, `app/src/ui/weather.ts` ·
**Status:** fixed on branch `night/2026-10-08`

The page gave each climate year's National Trends peak as the profile holds it and said the
profiles "hold the same annual energy in every climate year"; they do not — Estonia's runs from 9.64
to 10.22 TWh — and a run scales every year to the scenario's energy, so the peak a year brings is
its shape's. At 2009's energy Estonia's 2008 peak is 1 769 MW, not 1 721, and ranks 9th of 38, not
6th; 2009 ranks 18th, not 21st; the scenario view's year chips read their demand-peak rank the same
way. **Effect:** none on a run. **Fix:** the peaks are at 2009's annual energy, ranked on it, and
the note and the methodology (§8.6) say so.

## E-118 — The Weather page ranked rounded values

**Found:** 2026-10-08 by an independent review of the reference pages (the night run's audit) · `app/src/ui/weather.ts` `rankOf`, `export/tables.py` `climate_years` · **Status:** fixed on branch `night/2026-10-08`

The ranks were counted on the figures as exported — capacity factors to three decimals, MW whole,
TWh to two — so rounding made ties, and a tie took the lower rank: 13 of the table's ranks were off
by one to four places (Estonia's solar of 1995 13th where it is 16th, as the year chips say;
Lithuania's solar of 2008 6th where it is 10th). The note's "the three years sit at the edges of
PECD's years" held for onshore wind and not for solar or the peaks. **Effect:** none on a run.
**Fix:** the export ranks the unrounded values and the page shows those ranks; the note says where
the years sit; a test.

## E-119 — The Ofgem/GHD rate of cable failures per kilometre was rounded up 4 %

**Found:** 2026-10-08 by an independent review of the reference pages (the night run's audit) · `export/tables.py` `adequacy` (`_v`), `app/src/adequacy/sampler.ts` · **Status:** fixed on branch `night/2026-10-08`

The export rounds its scalars to four decimals, which made 0.00021 + 0.00027 = 0.00048 failures a
kilometre a year 0.0005: the Adequacy tab's choice read "0.050 a year per 100 km" where the source
and R-LINK-7 say 0.048, and the sampler drew EstLink 1 at 0.0525 failures a year for 0.0504,
NordBalt at 0.225 for 0.216. Only the per-kilometre choice is touched; the default rate (0.17 a
cable) is not. **Effect:** the Adequacy tab's distributions with that choice. **Fix:** the rate is
exported to eight decimals.

## E-120 — The Calibration page's border spread carried no sign, and the page's other spread the opposite one

**Found:** 2026-10-08 by an independent review of the reference pages (the night run's audit) · `app/src/ui/calibration.ts` `borders` · **Status:** fixed on branch `night/2026-10-08`

The borders table's "median spread" is the second zone's price less the first's, so EE–FI read
−16.3 / −18.5 €/MWh in 2024, while the EstLink table on the same page gives "EE–FI spread over the
year" as Estonia's less Finland's, 37.4 / 41.7 (R-VAL-6). A reader of the first had Estonia cheaper
than Finland. **Fix:** the column reads "median price difference, second zone − first".

## E-121 — The Adequacy tab's percentiles stood one rank high

**Found:** 2026-10-08 by an independent review of the reference pages (the night run's audit) · `app/src/ui/adequacy.ts` `stats` · **Status:** fixed on branch `night/2026-10-08`

`s[floor(f·n)]` made the 20 samples' P10 the 3rd lowest, P50 the 11th and P90 the 19th, and with
ten samples or fewer P90 was the highest. **Fix:** nearest rank — the 2nd, 10th and 18th of 20; a
test.

## E-122 — The Sources view named one licence per family

**Found:** 2026-10-08 by an independent review of the reference pages (the night run's audit) · `app/src/ui/docs.ts` `sourcesHtml` · **Status:** fixed on branch `night/2026-10-08`

The licence column took a family's first record's: JAO's row showed the Nordic tool's terms and not
the Core tool's, which 51 of its 74 records carry; the catalogues' row left out Statistics Finland's
CC BY 4.0. **Fix:** every licence a family's records carry; a test.

## E-123 — Two descriptions of the reference pages

**Found:** 2026-10-08 by an independent review of the reference pages (the night run's audit) · `docs/methodology.md` §8.2, `app/src/ui/statistics.ts` · **Status:** corrected on branch
`night/2026-10-08`

Methodology §8.2 said 49 figures of 2023–2025 lie outside their thresholds; the committed files and
the Calibration page give 34 (9, 10 and 15), as §7.3 does. The Statistics page called Finland's,
SE4's and Poland's day-ahead prices "the prices it takes": the replays take them as they stand until
the flow-based go-lives and at each cable's end after (D-075, D-076) — Poland's zone price ran 7.9
€/MWh above in 2024 and 7.4 in 2025, the same mislabel E-100 corrected on the panel. **Fix:** the
wording.

## E-124 — The engine of record took the preview's whole steps for its stores and cycle budgets

**Found:** 2026-10-08 by an independent review of the engine's features the test weeks do not reach (the night run's audit) · `app/src/engine/build.ts` (storage), `app/src/engine/lp.ts`, `reference/lp.py` ·
**Status:** fixed with D-106 (D-101 applied, the register refitted; accepted, D-107), with its patch (`spikes/exact-storage/`)

The preview's dynamic programme needs whole steps, so the problem rounds a store's hours and its
discharge budget to whole hours at full power, and the engine of record took the same rounded
values: the cycles-per-day slider moves the batteries only in half-cycles for a two-hour store (1.0
and 1.2 build one programme, 1.3 to 1.7 another), R-PAR-5's own alternatives 1.2 and 1.4 cannot be
run, Kruonis's store in a scenario is 938 MW × 12 h = 11 256 MWh where the record is 10 800, and a
replay's weekly Kruonis budget is the week's output rounded to a whole hour at full power.
**Effect, measured with the patch:** the replays' MAE by 0.003 €/MWh at most; the opening state by
0.04 at most (*Elering: gas* 72.72 / 58.21 / 58.26 → 72.74 / 58.22 / 58.27); `make gap` 8 of 8
weeks at 0.000; the golden fixture's engine-of-record replay changes; and a refit on the corrected
engine moves the markup to 42.5 / 197.5 / 317.5 / 337.5 €/MWh (fit MAE 62.80 against 62.82), Δ
staying 67. **Fix:** D-101.

## E-125 — A sampled year took out of NordBalt's spread three times the outage hours it drew

**Found:** 2026-10-08 by an independent review of the engine's features the test weeks do not reach (the night run's audit) · `app/src/engine/build.ts` (`sampled`), `app/src/adequacy/sampler.ts` · **Status:** fixed
on branch `night/2026-10-08`

A sampled year replaces a cable's documented disturbance share with its sampled trips, but the
sampler caps a trip at 36 hours (R-LINK-7's "hours to 1.5 days"), and NordBalt's documented trips
average 79.7 hours: the build removed 159.4 hours a year from the spread where the trips drew 48.3
on average (EstLink 2 55.2 against 49.5). **Effect:** the Adequacy tab only: on climate year 2009,
seed 1, ten samples, NordBalt's average import capacity 604.4 MW instead of 612.5 and Estonia's
sampled price 86.53 €/MWh instead of 86.48; methodology §9.1's figures move by up to 0.1 and are
re-run. **Fix:** the spread loses only the share the capped trips draw on average (`tripShare`); a
test holds it to 3 000 sampled years.

## E-126 — Methodology §5.7 said the programme's weeks start on Monday

**Found:** 2026-10-08 by an independent review of the engine's features the test weeks do not reach (the night run's audit) · `docs/methodology.md` §5.7 · **Status:** corrected on branch `night/2026-10-08`

The weekly programmes start at the run's first hour (R-ENG-8), 1 January 00:00 UTC — a Sunday in
2023, a Monday in 2024, a Wednesday in 2025; the text said every week starts on Monday. **Fix:** the
wording.


## E-127 — Re-priced, the import-price duration chart's caption did not name its faint lines

**Found:** 2026-10-08 by the night run's final review of its own commits · `app/src/ui/importprice.ts` `ipBody` (E-108) · **Status:** fixed on branch `night/2026-10-08`

E-108 drew the published profile beside a re-priced one at every level, but the caption that names
the faint lines still followed the level alone: at level 1 a re-priced profile's chart showed faint
lines its caption did not mention, and at another level the caption called them the profile
"before the level" where they are also before the re-pricing. **Effect:** the page's wording only.
**Fix:** the caption names them as the profile as published, before the re-pricing and the level;
a test.

## E-128 — The Weather page's note overstated the ranks, and a chart's caption missed E-117's energy

**Found:** 2026-10-08 by the night run's final review of its own commits · `app/src/ui/weather.ts` (E-117) · **Status:** fixed on branch `night/2026-10-08`

The note said solar and the demand peak put the three selected years "nearer the middle"; they do
not — all three sit in the lower half for the demand peak in every Baltic zone (ranks 3 to 18 of
38), and 2008 is among the dullest years for solar in Estonia (2nd) and Latvia (5th). The demand
peak's bar chart was captioned "Demand peak, MW (National Trends profile)" where E-117 made its
figures the peaks at 2009's annual energy. **Effect:** the page's wording only. **Fix:** the note
says the other series are mixed and gives both readings, the caption names 2009's energy; a test
holds the note's reading to the export's ranks in all three zones.

## E-129 — The Sources view joined a family's licences with the separator their own text uses

**Found:** 2026-10-08 by the night run's final review of its own commits · `app/src/ui/docs.ts` `sourcesHtml` (E-122) · **Status:** fixed on branch `night/2026-10-08`

E-122 listed every licence a family's records carry, joined by "; ", but JAO's two terms each carry
a semicolon of their own ("…Art. 25; free access"), so the row read as four clauses, not two
licences, and E-122's test counted semicolons, which one licence alone passes. **Effect:** the
page's wording only. **Fix:** one licence per line; the test asks for both of JAO's terms whole.

## E-130 — E-112's and E-114's fixes did nothing when the companion file was missing

**Found:** 2026-10-08 by the night run's final review of its own commits · `db/build.py` `load_entsoe_a11`, `pipeline/sources/jao.py` `hub_spreads` · **Status:** fixed on branch `night/2026-10-08`

Both fixes read a second raw file of the same month — A11's other direction, JAO's `maxNetPos` —
and fell back to the old reading without a word when it was not in the cache, while the Core
spread (`core_spread`) stops on a missing companion. A month of `fbDomainShadowPrice` in which no
constraint bound returned no rows at all, where every MTU's spread is 0. **Effect:** none on the
cache as it stands: all 800 A11 files and all 23 Nordic months have their companion, and no month
is empty. **Fix:** both stop with the missing file's name, and an empty month gives every MTU of
its `maxNetPos` a spread of 0; tests.

## E-131 — The 2026 replay counts AST's reserve battery in Latvia's fleet

**Found:** 2026-10-08 by an independent review of the engine's features the test weeks do not reach (raised as a lead), followed up by the night run and corrected by its last review (E-132) · `app/src/engine/build.ts` (the observed fleet's `battery`), D-020 item 3, R-STO-7, R-STO-8 · **Status:** fixed with D-106 (D-102 items 1–3 applied, the register refitted; accepted, D-107)

R-STO-8 keeps the TSOs' own batteries out of the day-ahead fleet, and E-055 keeps AST's 80 MW out of
the scenarios, but the 2026 replay takes A68's batteries whole into the fleet, and D-020 item 3 left
their subtraction to "the battery evidence of M3", which no code does. A68 counts batteries from
2026 only; Latvia's 90 MW reads as the sum of AST's 80 MW at Rēzekne (60 MW / 120 MWh) and Tume (20
MW / 40 MWh), announced to enter the balancing capacity market on 2025-10-29 and to deliver reserves
from 2025-10-30 (ESS News, 2025-10-30), and Utilitas' 10 MW at Targale (2024-11-01) — A68 does not
name its units. Whether Lithuania's 426 MW counts Energy Cells' 200 MW is not known. The fleet first
holds the zone's procured FCR and aFRR-up (R-STO-7): of Latvia's 90 MW, 70.8 on average, so 19.2 MW
reach the day-ahead market. **Effect, measured** (`spikes/tso-batteries/`): without AST's battery
Latvia's day-ahead battery is 0, and 0.04 MW with AST's reserve share out of the need as well, since
the need left (35.8 MW on average) still exceeds Utilitas' 10 MW; the 2026 replay's MAE moves by
0.02 €/MWh at most (Estonia 14.08 → 14.06, Latvia 10.28 → 10.26, Lithuania 9.21 → 9.20) and Δ's
refit from 67.21 to 67.70 €/MWh unrounded (67 → 67.5 on the register's half-euro steps); without
Energy Cells and its 40 MW of aFRR as well, Lithuania's day-ahead battery goes from 364.5 to 203.7
MW, the MAE by 0.07 and Δ to 67.78. Only 2026 moves: A68 has no battery before it. **Fix:** D-102,
proposed.

## E-132 — E-131 misdescribed what the replay does with AST's battery, and E-128's note left offshore wind out

**Found:** 2026-10-08 by the night run's last review of its own commits · `docs/ERRATA.md` E-131, `docs/DECISIONS.md` D-102, `spikes/tso-batteries/`, `app/src/ui/weather.ts` · **Status:** corrected on branch `night/2026-10-08`

E-131 and D-102 said the 2026 replay puts AST's battery in the day-ahead market and that D-102 takes
80 MW out of it; but R-STO-7 holds Latvia's procured reserve on the fleet first, so 19.2 MW of the
90 reach the market, and D-102 as written took them to 0 while leaving AST's own reserve service to
Utilitas' 10 MW — the reserve counted twice. The 80 + 10 reading of A68's 90 MW was stated as fact
in places, AST's market entry as done where the source announced it, and Δ's refit quoted on the
edge of its rounding (67.5 against 68 unresolved at the fit's tolerance). E-128's note called the
series other than onshore wind "mixed", but offshore wind mostly follows onshore (2009 6th, 11th and
10th of 38 in Estonia, Latvia and Lithuania; 2008 33rd or 34th). **Effect:** none on a run. **Fix:**
E-131 and D-102 restated with the day-ahead figures, D-102 taking AST's reserve share out of the
need with its battery; the spike measures that and gives Δ unrounded; the note names offshore wind,
and its test holds it.

## E-133 — A weather scenario's results did not say its temperature is a climatology

**Found:** 2026-10-08 by the night run's audit of deferred commitments · `app/src/ui/results.ts` `yearLabel` (D-015) · **Status:** fixed on branch `night/2026-10-08`

D-015 runs TYNDP 2026's weather scenarios with each zone's 2020–2025 average temperature at the hour
of the year, the package having none, and said "results of the family say so": the CHP floors that
follow the temperature never see a cold spell. The export records the proxy among a year's fills,
but nothing on the page shows it; the year's label named only the solar proxy. **Effect:** none on a
figure; the reader was not told. **Fix:** the label of every weather scenario ends "its temperature,
and with it the heat-driven floors, the 2020–2025 average at each hour, without cold spells
(D-015)"; a test.

## E-134 — A sampled year was said to take the waste units out, and never did

**Found:** 2026-10-08 by the night run's audit of deferred commitments · `app/src/engine/build.ts` (the waste class), `export/tables.py` `UNIT_CLASSES`, D-074 item 2 · **Status:** the code's account corrected on branch `night/2026-10-08`; D-074 item 2's sampling not done

D-074 item 2 says a sampled year of the Adequacy tab takes the waste units out instead of their
average outage, and the builder looked for sampled waste units, but the sampler draws units for oil
shale, gas and nuclear only (`UNIT_CLASSES`), so the lookup found none and every sampled year ran
waste at its average availability — which is what methodology §9.1 says ("as in the headline").
**Effect:** the Adequacy tab's waste plants (about 17 MW in Estonia, 60 in Lithuania) never fail
together in a sample; negligible beside oil shale and gas. **Fix:** the dead lookup is removed and
the comment says what the code does; adding waste to the sampler's classes, as D-074 promised, is
the owner's to ask (a re-export and the Adequacy figures of methodology §9.1 re-run).

## E-135 — Scenario years leave AST's share of the reserve on Latvia's market batteries

**Found:** 2026-10-08 by the night run's audit of deferred commitments · `app/src/engine/build.ts` `reserveNeed` (scenario years), R-STO-7, R-STO-8, E-055 · **Status:** closed by D-104: R-STO-8 dates AST's reserve to 2028, so no scenario year credits it

A scenario year's reserve need is the Baltic need of 2026 shared among the zones as they procured it
in 2025, and R-STO-7 holds each zone's FCR and aFRR-up on its batteries. E-055 keeps AST's 80 MW
battery out of Latvia's fleet, but its share of the reserve — 8 MW of FCR and 32 of aFRR, as R-STO-8
credits it — stays in the need the market batteries hold, so Latvia's day-ahead battery in a
scenario is up to 40 MW smaller than R-STO-8 implies. This holds if AST's battery still serves that
reserve in the target years: R-STO-8 dates the share to 2028, and the scenarios run 2035–2050
(corrected by E-137). **Effect:** Latvia's need for fast reserve in a scenario is 60.2 MW, so its
420 MW of batteries in the opening scenario would gain the full 40 MW on the day-ahead market in
every hour; prices not measured. **Fix:** proposed as D-102 item 4.

## E-136 — TYNDP 2024's DE and GA 2040 price profiles run a day late on the layout

**Found:** 2026-10-08 by the night run's audit of deferred commitments, running the diagnostic PLAN §3.1 and M1 promised · `data/export/years/cy*.json.gz` `boundary.*.{DE,GA}_2040`, `db/build.py` `load_tyndp_price`, `pipeline/sources/tyndp.py` `parse_mm_prices_xlsb` · **Status:** fixed by D-103 (accepted, D-104)

The layout's weeks start on Monday (D-013), and the neighbours' price profiles must keep its
weekdays, as D-100 asks of the observed one (E-101). Averaged by weekday and set against the Baltic
demand's week, every TYNDP 2024 profile with a clear week follows it best at no shift — but 17 of
the 18 Distributed Energy and Global Ambition 2040 series follow it one day later (the 18th, GA 2040
for Finland in 2009, has no clear week): their weekend falls on the layout's Sunday and Monday. The
hours are the workbooks' rows 1 to 8 736 and the sheet's dates read "01JAN00:00" without a year or
weekday, so the source names no calendar; but inside the 2040 workbooks the model's own demand is
lowest on the layout's Sunday and Monday for Germany, France and Poland and on its Saturday and
Sunday for the Baltic nodes, where in 2035 and 2050 every node's is lowest on Saturday and Sunday
(read from the workbooks by the night's last review; 1 January 2050 is a Saturday, so it is not each
target year's calendar): the lag is in the continental demand those runs were fed, not in the
loader. **Effect, measured** (`spikes/tyndp-2040-weekdays/`): the opening state's four scenarios
with the neighbours' profile DE 2040 (the panel's "Other" target year, D-046) clear 1.0–1.15 €/MWh
higher in Latvia and Lithuania and up to 0.8 higher in Estonia once the profile is moved a day
earlier; with GA 2040, 0.7–0.9 and up to 0.5. The default profile (DE 2035) is aligned and does not
move. **Fix:** D-103, proposed; a test holds every other profile to the layout's weekdays, and one
marked as an expected failure holds the 2040 profiles, so that the fix must remove its mark.

## E-137 — E-135, E-136 and D-102, D-103 as first written; a weather set's note said its temperature three times

**Found:** 2026-10-08 by the night run's last review of its own commits · `docs/ERRATA.md` E-135, E-136, `docs/DECISIONS.md` D-102, D-103, `app/src/ui/results.ts`, `docs/methodology.md` §9.1 · **Status:** corrected on branch `night/2026-10-08`

E-136 set beside its finding the calendars of 2035 and 2040, as if each run had used its target
year's; the 2050 profiles are aligned though 1 January 2050 is a Saturday, and the 2040 workbooks'
own demand shows the lag in the continental nodes only. D-103 moved the profiles on the 8 760 layout
hours, which leaves the copied last day a Sunday of theirs. E-135 and D-102 item 4 credited AST's
reserve in the target years 2035–2050 where R-STO-8 dates it to 2028, and D-102 said scenario runs
move only through Δ where item 4 gives Latvia's batteries 40 MW more in every hour. E-133's label
repeated its temperature note for each year of a set, and methodology §9.1 said no run takes planned
maintenance where waste's given output does (D-074, E-134). **Effect:** none on a run. **Fix:** each
restated; the set's note says it once (`setNote`, tested), §9.1 names waste's exception.

## E-138 — The night's first records of D-106 and OPEN-2: a fleet a year old, a claim too wide, a caption on the wrong table

**Found:** 2026-10-08 by the night run's review of its own commits (the night of 2026-10-09) · `docs/research/2026-10-08_open2_pecd.md` (first committed as `2026-10-09_open2_pecd.md`), `spikes/open2-pecd/pecd.ts`, `docs/DECISIONS.md` D-106, `docs/methodology.md` §6 and §7, `export/years.py` `_without_ast` · **Status:** corrected on branch `night/2026-10-09`

The OPEN-2 note's option "by vintage" took Lithuania's fleet at the end of 2025 as A68's 2025
figure, 1 683 MW, but A68 counts 1 January: the end of 2025 is A68 2026, 2 507 MW, and the factor
0.823, not 0.881 (+5.5 €/MWh in Latvia and Lithuania, not +3.9). Its reading — that the gap measures
an old fleet new turbines would close — has no support in the record: 2023 and 2024, with half or
more of the fleet new, gave 0.261 and 0.252 against PECD's 0.410; and two effects the note had left
out (curtailment counted twice, the capacity of fast-building years overstated) may push the
measured ratio down. The recommendation is restated: Lithuania at 0.80, a round interim judgement.
D-106 said the replays' MAE did not move at one decimal; in the diagnostic years 2020–2021 it rose
by 0.1–0.2, and the duration curves there and Estonia's of 2026 by up to 0.27; methodology §7.5
quoted 2020–2021 as before. Methodology's gap section gave its table of D-076's register the new Δ
while the table itself was out of date (the preview now misses CY2009's winter week by 200 €/MWh:
since D-105 its storage runs short there and it reaches the price cap in two hours, where the LP
peaks at 297). `_without_ast` had no test and no end, though R-STO-8 holds AST's battery in reserve
to 2028 only. D-106 had no table of the fixture before and after, and three records were dated
2026-10-09 for work of the 8th. **Effect:** none on a run. **Fix:** the note re-measured and
restated, D-106's consequences given year by year with the fixture's table, the methodology's
figures and gap table rebuilt from the records, `_without_ast` limited to 2028 and tested, the dates
corrected.

## E-139 — The replays part Estonia from Latvia too often: Estonian oil shale above the record

**Found:** 2026-10-10, at the owner's question ("check how the model separates Estonia from Latvia") ·
`spikes/ee-split/`, `docs/methodology.md` §7.5 · **Status:** fixed — the first fix, the floor, in
force since D-109 (accepted, D-110); the second, oil shale's market entry and storage without
perfect foresight, since D-112 and D-113 (accepted with oil shale's start on the megawatts
available, D-114): the replay parts Estonia from Latvia where the record does not in 13.1 % of the
hours of January–September 2026, against 17.5 % of January–August before D-109

Estonia's price left Latvia's in 2.8 % of the hours of 2024, 21.4 % of 2025 and 42.9 % of
January–August 2026, nearly always below it; the replays part them in 4.7 %, 30.8 % and 54.1 %. The
hours the model parts them and the record does not, 14.3 % of 2025 and 17.5 % of 2026, carry 30 %
and 44 % of Estonia's absolute error: Estonia is 34.7 and 32.5 €/MWh too low there, because the
model makes EE–LV the bottleneck where the record had EstLink's (FI→EE at its limit in 76 % and
73 % of those hours, against 37 % and 38 % in the model). EE–LV's capacity is not the cause (where
both part, the model sends 452 and 408 MW south against 471 and 401 scheduled); Estonia's oil shale
is: the replays run 199 and 208 MW on average against the record's 162 and 136, the floor alone
(R-SUP-5's, fitted on 2023–2024 for Narva's heat, D-022 item 2, with D-073's least output) 145 and
157, the offers 53 and 52. Methodology §7.5 put 2026's 1.21 TWh on the floor; its share is 0.92.
**Effect, measured** (diagnoses that read the hour's output from the record, not models): with the
floor cut to the record Estonia is apart in 28.0 % and 50.7 % of hours (2025, 2026), its MAE 19.5
and 13.6 €/MWh (19.6 and 14.0 as it is), its bias −3.2 and −8.9 (−4.7 and −11.0); with oil shale
run exactly as recorded, 24.8 % and 45.9 %, MAE 20.4 and 13.3, bias −1.0 and −6.8. 2024 moves by
less than a point. Oil shale explains most of the excess of split hours and little of the error:
about one hour in ten still parts in one and not in the other. **Fix (proposed, the owner's):**
whether a replay's oil-shale floor should follow the year's record, as D-073's least output does,
rather than 2023–2024's fit (it moves the register only if 2023–2024's floors move; scenario runs
have no oil-shale floor, D-074); and, for the rest, oil shale's market entry and storage without
perfect foresight, D-099's next steps. The methodology's sentence is corrected.

## E-140 — The site would have listed Nord Pool's curves among its sources at the next export

**Found:** 2026-10-10, in the export the proposal of D-109 rebuilt · `export/tables.py` `sources`,
`data/export/sources.json.gz` · **Status:** fixed

D-108 added Nord Pool's data portal to the source register (`pipeline/register.py`), and the
export's source list took every family of the register, used or not: the next export would have
named the collection of the curves, with its purpose, on the site's documentation page, which D-108
keeps them off. No export had been made or deployed since D-108. **Effect:** none on a figure or on
/v5. **Fix:** the export lists the source families its data uses — every one but Nord Pool's, so
the site's list is as it was; a test.


## E-141 — With oil shale's entry, the results left the committed minimum load out of the generation

**Found:** 2026-10-10, by the night's independent review of its code (D-113, proposed) ·
`app/src/engine/lp.ts` `runLP`, `app/src/engine/entry.ts`, `spikes/commitment/commit.ts` `twoPass` ·
**Status:** fixed

`runLP` cleared the committed problem in its second pass and returned its results, which every
caller pairs with the problem it holds — the one as built: `summarise`, the worker's view,
`validate_fit`'s `evaluate`, the scoreboards. In the committed problem a class that runs holds its
minimum load as fixed output and offers only the rest; the problem as built has no such fixed output,
so the minimum load above the record's floor dropped out of the zone's generation, its CO₂, the day's
stacks and the energy balance (up to 411 MW in an hour of the 2024 replay). Prices were right. The
prototype's two passes (`spikes/commitment/commit.ts`) paired them the same way, which is why the
prototype and the engine agreed. No test cleared a problem with an entry against the balance.
**Effect:** on the night's branch only, nothing deployed or accepted. Every price, MAE, duration
curve and fit (the markup and Δ) stands; Estonian oil shale ran 16–28 % below its record as scored
and runs within 6 % of it as cleared (2023–2026: 1.87, 1.75, 1.39, 0.94 TWh against 2.00, 1.70,
1.42, 0.89), and the oil-shale breach of R-VAL-5 the night reported in each year was this: D-112
and D-113 give 8 / 5 / 9 breaches in 2023 / 2024 / 2025, not 9 / 6 / 10. **Fix:** `runLP` returns
the results of the problem it was given, the committed minimum load above the floor in its class's
offer (`asCleared`, shared with the prototype); tests that every zone balances with an entry, that
the second pass reads the entry's zone's price (the toy's zones apart), the minimum time on at its
boundary, a slice keeping the entry, and a weekly discharge budget shared by the hours left; the
validation files, the golden fixture's record replay (provisional) and the spikes' scoreboards
re-scored (`spikes/commitment/rescore.ts`; `spikes/foresight/refit.ts` with a register given).

## E-142 — In a scenario, the reserve held on Auvere vanishes on the days its entry leaves it off

**Found:** 2026-10-10, by the night's independent review of its code (D-113, proposed) ·
`app/src/engine/build.ts` (the reserve headroom of R-STO-7), `app/src/engine/entry.ts` ·
**Status:** fixed (D-114)

A scenario holds the reserve the batteries do not (R-STO-7) as headroom on the zone's thermal
offers, each scaled down in proportion before the run; Auvere is one of them. D-113's entry decides
afterwards that Auvere stays off on some days: its offer goes to nothing, and the headroom it held
goes with it — the zone then holds less reserve than it needs, and `reserveUnmet` does not say so.
Replays are not affected (they hold no reserve on oil shale). **Effect:** not measured; Auvere's
share of the headroom on the days it is off, a few tens of MW at most in the opening scenario, held
by nobody. Measured on the opening state: Auvere held 34.5 MW (*Elering: gas*) to 71.5 MW (*3
SMR*) on average and was off on 363–365 of the 365 days of each climate year. **Fix (D-114):** the
headroom stands on the thermal offers that run continuously — gas and biomass, which have room for
all of it in every scenario of the opening view (`reserveUnmet` stays 0) — and none on the classes
that enter by the day; a test (`build.test.ts`). Every observed year file carries the weekly
maxima, net of the reserve already, so no replay moves.

## E-143 — The night's documents: rounded twice, stale where the engine changed, claims beyond the measurements

**Found:** 2026-10-10, by the night's independent review of its documents (D-111 to D-113, proposed)
· `docs/DECISIONS.md` D-112, D-113; `docs/methodology.md`; `docs/SPECIFICATION.md` revision 2.8;
`README.md`; `spikes/foresight/README.md`, `spikes/commitment/README.md` · **Status:** fixed

Every figure of the night's decisions and tables re-derived from the validation files, the
scoreboards and the scenario outputs. Wrong: Kruonis in D-112's table rounded twice from the
scoreboard's three decimals (2023's record 0.53, not 0.54; D-111's 0.36 and 0.37, not 0.37 and
0.38); "two breaches fewer" for three; CY2009's winter week missed by 312 €/MWh on D-111's data,
not 310 (D-109's); Latvian gas "now" at D-076's figures; the lead over v4 (5.7–6.4 and 0.5–1.7, not
5.6–6.4 and 1.0–1.2); revision 1.3, not 2.0, wrote August's 21.11 USD/mmbtu; D-112 and D-113 dated
the night's name where the records carry the day. Stale: the weekly programme's perfect foresight,
the reference's week and the weeks' independence described as current in the methodology and in
the specification's §5 and R-ENG-8; §7's head on D-078's register; the dear hours' bias not re-run
(now 76–110 €/MWh too low above 250); R-DATA-10 saying no program read the curves before Nord Pool's
consent, where D-108 kept the collector's first run of 2026-10-08. Beyond the measurements: D-112's
cause of Kruonis's gap; the cause of oil shale's shortfall (itself E-141's); R-ENG-7 "met" where only
the bench meets it; the record's campaigns from a computation not kept (now
`spikes/commitment/record.ts`: off on 11–40 % of days, campaigns of 9–17 days at the median);
runs quoted and not kept (another commitment round and bidding at cost now in `rounds.ts`).
**Effect:** none on a model figure. **Fix:** corrected where they stand.

## E-144 — The dear hours: a bias chosen by the record's price, read as the model's; the price setter's stores tested against their nameplate

**Found:** 2026-10-11, by the dear-hours research (`docs/research/2026-10-11_dear_hours.md`) and its
independent review · `docs/methodology.md` §7.3; `spikes/validation-round2/setter.ts`;
`docs/SPECIFICATION.md` (its header) · **Status:** fixed

Methodology §7.3 read the bias in the hours the market cleared above 250 €/MWh — 77–112 €/MWh in
Lithuania — as what is left of the model's error: "What is left sits in the dear hours". The hours
are chosen by the record's price, and a choice by the outcome carries the outcome's surprises: a
model right on average given its own price, with this model's noise, shows −59 to −111 €/MWh in the
same hours (`spikes/dear-hours/tail.ts`: the record replaced by the model plus residuals drawn
within the model's price deciles, demeaned). Chosen by the model's own price, the three zones are
too high in 2023's and 2025's dearest hours (+34.5 to +57.6 €/MWh on D-114's register), where the model
finds 54 and 40 % of the record's dearest hours; in 2024's Estonia is right on average (+1.0) and
Latvia and Lithuania are 33 too low (15 at 150–250 €/MWh). `setter.ts` counted a store as setting
the price when it ran below its nameplate, where the programme bounds it by the hour's power (a
replay's weekly maximum, D-073), so a store at that bound counted as part-loaded; recounted, no
published figure moves (2025: Kruonis sets Lithuania's price in 93 of the 247 hours above 250 either
way). The specification's header still named revision 2.7 of 2026-10-07 after revision 2.8's
approval on 2026-10-11, and its table of revisions listed 2.8 before 2.7. **Effect:** none on a
model figure; the reading of §7.3. **Fix:** §7.3 gives the bias both ways with the artefact beside
it; `setter.ts` tests the hour's limits; the header names the revision in force and the table runs
in order.

## E-145 — D-115's documents: the steps misworded, Estonia's own dear hours, the gate's dependence on the step unstated, figures rounded twice or stale

**Found:** 2026-10-11, by the independent review of the branch's documents against the validation,
gap and register files · `docs/DECISIONS.md` D-115; `docs/ERRATA.md` E-144;
`docs/SPECIFICATION.md` R-ENG-5 (revision 2.9, proposed); `docs/methodology.md` header, §6, §7.1,
§7.2, §7.3, §7.4, §8; `docs/research/2026-10-11_dear_hours.md` §1, §7, §8 · **Status:** fixed

- *The steps.* "The j-th costing j × the step" reads as 60 / 120 / 180 / 240 €/MWh; the code
  (`kruonisSteps`, j from 0) gives the first quarter at the plant's cost and each further one a
  step more, 0 / 60 / 120 / 180. The CHANGELOG, §5.7 and the specification's revision row had it
  right.
- *Estonia.* E-144 and the log's §1 had the model right on average in Estonia's own dear hours in
  every year; on D-114's register it is +34.5 (2023), +1.0 (2024) and +57.6 €/MWh (2025). Latvia
  and Lithuania are +37 to +52 too high in 2023's and 2025's, not 37–50.
- *Claims beyond the measurements.* D-115 did not say that 2024's share met holds at step 60 alone
  (at 45, within 0.04 on the fit years, Latvia is 3.02 points short), that a third of the fit
  years' gain comes in the cheap hours where Kruonis pumps less than before and than the record,
  that 2025's ninth breach passes at the band's edge, that 2023's duration-curve RMSE rises from
  1.4–1.8 to 3.1–3.4, or that Kruonis's generation misses by more (61–72 % short against 31–52 %).
  It read A75's surplus over the model as the reserve units' activations, which nothing measures;
  had one Δ for the plant at "half the gain" where refitted it takes three quarters (60.18 against
  59.51 and 62.16); and gave the folds' 135 and 45 as the steps' where they were measured on the
  four units' form. The log's §7 named 2025's share among the reasons for the form, against the
  rule that 2025 is reported and never chosen on. Methodology §7.3 had Kruonis in steps giving the
  dearest hours "what the record shows": 126 / 205 / 121 MW against 184 / 224 / 142.
- *Rounded twice.* 2020's MAE in Latvia 17.3 (17.35 written 17.4); Lithuania's 2025 share 1.4
  points short (1.42, not 1.5); 2024's share 2.3–2.5 short (Estonia 2.25, not 2.2); D-115's sums
  26.47 (2023) and 34.37 (2026 on D-114's register), not 26.46 and 34.36 (D-114's own record, which
  is not edited, keeps its 34.36); FI→EE congested 22
  points more in the outage, from 49.3 to 71.5 %, not 23. The log's refit table gives `refit.ts`'s
  sums (59.56 and 60.33 at 45 and 60 crossed), which the production fit's differ from in the second
  decimal; and its 141–176 MW is 142–176.
- *Stale.* The methodology's header gave 9–12 / 18–19 €/MWh on D-111 to D-114 where the README and
  the app give D-115's 8–11 / 17–18; §7.3 the lead over v4 on D-114's register; §6's caption Δ 71;
  §8 the bench's timings before D-115. §7.1 gave the record's running hours twice on different
  thresholds (any output, above 1 MW) without saying so.

**Effect:** none on a model figure; the reading of D-115 and of the dear hours. **Fix:** the texts
above corrected; D-115 gains its limits (the step's choice and the gate, the cheap hours' share of
the gain, Kruonis's volume) and a rollback naming the branch's commits.

## E-146 — The FAQ quoted the gate and the engine as they stood before D-078

**Found:** 2026-10-11, by the review of the dear-hours documents · `docs/faq.md`, which the site
shows as *Questions and answers* · **Status:** fixed

The FAQ gave the gate as 9–12 €/MWh in 2023–2024 and 17–20 in the blind year 2025 on the register
of D-073 with D-075 to D-077 (D-078), where the register in force gives 8–11 and 17–18 (D-115,
D-116). It described a weekly programme whose hydro plants "see a whole week ahead", where since
D-112 each day is cleared in a window of that day and the next. It said the model had "no unit
commitment", where oil shale has entered the market by the day since D-113, and it put the misses
in the dear hours without E-144's reading. It gave EstLink 2's effect as +24 €/MWh, the figure
before D-076, where R-VAL-6 measures 19.5. It gave Estonia's price in the gas scenario without the
re-pricing as 73 → 58 €/MWh, where it is 84.7 → 69.3. Nothing held the FAQ's figures to the files,
as a test holds the README's and the page's gate lines (R-PUB-4). **Effect:** none on a model
figure; the site's FAQ read figures two to five registers old. **Fix:** the FAQ's figures and
statements on the register in force; `calibration.test.ts` holds the FAQ's gate line to the
validation files as it holds the README's.

## E-147 — R-SUP-6 described a markup on the fleet's utilisation; the code bins each gas offer's remainder

**Found:** 2026-10-11, by the dear-hours research (`docs/research/2026-10-11_dear_hours.md` §5) ·
`docs/SPECIFICATION.md` R-SUP-6; `app/src/engine/build.ts` (`applyMarkup`, `MARKUP_EDGES`);
`app/scripts/fit_markup.ts`; `docs/methodology.md` §7.2 · **Status:** fixed

R-SUP-6 binned "the utilisation of its flexible thermal fleet (… % of the week's maximum)" and gave
each zone a schedule of its own. `applyMarkup` splits each gas offer into tranches at those shares
of the weekly maximum of what the offer has left after the must-run floors (R-SUP-5; in a replay
also D-073's weekly 10th-percentile hour) and, in a scenario, the reserve headroom (R-STO-7). Since
D-073 one schedule has served Latvia and Lithuania, and Estonia's gas carries none. Where a floor
varies within the week, as Latvia's heat floor follows temperature, a cold hour's remainder falls
into the low tranches only. The register has always been fitted on the code's form. The text's
form, built and refitted, fits the fit years 2.3 €/MWh worse (64.48 against 62.16).
**Effect:** none on a figure; the specification described a markup the model never ran.
**Fix:** revision 2.10 words R-SUP-6 as the code draws its bins (D-117). The comments of
`build.ts` and `fit_markup.ts` and methodology §7.2 say the same.

## E-148 — A replay's cards pushed the actual year's column out of them in a narrower window

**Found:** 2026-10-11, by the owner on the page · `app/src/ui/theme.css` (`.cards`),
`app/src/ui/results.ts` · **Status:** fixed

The three cards of a replay — Estonia, Latvia, Lithuania, the model and the actual year side by side —
stood in a grid of columns at least 220 px wide. Their table needs 254 px folded and 260 px with all
figures. Where the main area was 680–870 px wide, three cards of 220–280 px stood in a row, and the
actual year's figures ran out of each card, hidden under the next. In a 1 230 px window the overflow
was 35 px. A scenario's cards, without the actual column, need 147–153 px and were not affected.
**Effect:** none on a figure; the actual year's figures and units cut off on the page. **Fix:** a
replay's cards (`paired`) take columns of at least 290 px and wrap to the next row before their
figures overflow.

## E-149 — The slow-build sensitivities multiplied an already re-priced Polish profile by 1.4

**Found:** 2026-10-11, by the research on the neighbours' prices
(`docs/research/2026-10-11_boundary_prices.md`) · `app/src/state/model.ts` (`sensitivities`) ·
**Status:** fixed (approved by the owner 2026-10-17, D-124)

The standard sensitivities (a) and (b) set Poland's level factor to 1.4021. R-BND-5 derived that
factor so the published Distributed Energy 2035 profile, 57.2 €/MWh, would reach Svenska kraftnät's
lowest 2040 price, 77.8. Since D-079 the application opens on the profile re-priced to the
scenario's gas and CO₂, which already averages 78.6. The factor lifted it to 110.1. On *Elering:
gas*, EE / LV / LT €/MWh:

| Sensitivity | With Poland ×1.4021 | With the floor at 77.8 | Change |
|---|---|---|---|
| (a) | 98.4 / 104.0 / 103.2 | 87.3 / 87.6 / 86.7 | +13.7 / +23.1 / +22.3 → +2.6 / +6.7 / +5.8 |
| (b) | 97.1 / 99.0 / 99.1 | 86.1 / 82.5 / 82.5 | +12.4 / +18.1 / +18.2 → +1.4 / +1.6 / +1.6 |

The slow build of the Baltic wind and batteries moves the Baltic prices by a few euros. Most of
what the page showed was Poland counted twice.

**Effect:** the standard sensitivities (a) and (b), on the page and in the exports; no headline.

**Fix:** the sensitivities hold Poland's average at least at 77.8 €/MWh by one factor on every hour
of a run where the profile's average is lower (`Scenario.meanFloor`, `build.ts`). This is the
meaning R-BND-5 gave the factor, whatever the profile and its re-pricing. Specification revision
2.11, proposed.

## E-150 — The documents said Finland's and SE4's prices stay the headline's in the gas shock; re-priced, they follow it

**Found:** 2026-10-11, by the same research · `docs/SPECIFICATION.md` R-APP-11; `docs/faq.md`;
`app/src/ui/results.ts` (`sensAbout`) · **Status:** fixed (approved by the owner 2026-10-17, D-124)

Sensitivity (d) raises the run's gas to the 2026 shock. Since D-079 the neighbours' profiles are
re-priced to the run's gas (`gasFloor` reaches `repriceKnots`), so Finland's, SE4's and Poland's
prices rise with it: Poland's average goes from 78.6 to 105.5 €/MWh on *Elering: gas*. The
specification, the FAQ and the card's "i" said Finland and SE4 stay the headline's in all four.
They do in (a)–(c).

**Effect:** none on a figure; the text of three places.

**Fix:** the texts say what the engine does — the neighbours' gas plants and reformers would face
the shock too.


## E-151 — The bench's Node worker built a scenario's year without the sensitivities' floors

**Found:** 2026-10-18, by the night's plan for faster computing · `app/scripts/lp_worker.ts` ·
**Status:** fixed (D-128)

The Node worker that `scripts/bench.ts` runs through the browser's pool built a job's problem from
the panel's state with no gas floor and no mean floor, where the browser's worker builds it with the
sensitivity's (`scenarioOf`). It also answered a year's last job without the view. The bench never
ran a sensitivity, so its times were the headline's as the page computes them.

**Effect:** none on a figure: the bench reports times, and no figure came from it. Its jobs could not
stand for the page's, which the night's checks of the pool needed.

**Fix:** the browser's job handler moves to `src/worker/job.ts`; the browser's worker and Node's run
the same code, floors, views and samples included. `test/worker.test.ts` runs a scenario year and its
sensitivity (d) on Node workers through the pool and finds the whole year's view to the bit.

## E-152 — The export read the clock for its last year and for whether a year was whole

**Found:** 2026-10-18, by the review of the code · `export/__main__.py`, `export/years.py` ·
**Status:** fixed (the review's Python commit, 74922d3)

The export took its last observed year from the date it ran, and counted a year whole once the date
had passed it. The history fetch takes complete months only, so on 2027-01-01 the export would have
asked for every hour of 2026 before December was loaded and failed, and then built 2027 with no day of
data and failed again, until February. `make check` and the fit's refresh rebuild the export, so they
would have failed with it. The same database also gave a different export on another day (R-DATA-5).

**Effect:** none on a figure so far: the clock and the data agree in October 2026, and the export is
the same file for file.

**Fix:** the last observed year is the latest year of the core zones' load whose core series all reach
a whole day. A year before it is whole. `tests/test_export_years.py` adds hours of the next year and
finds the span move with the data.

## E-153 — The comparison CHP fit would have written over the register's floors

**Found:** 2026-10-18, by the review of the code · `validate/chp_fit.py` · **Status:** fixed (74922d3)

M3's fit of the CHP floor is kept for comparison (D-042). Run as its docstring said, it still wrote the
`chp_floor` section of `data/derived/fitted_parameters.json` and the lineage records of the five floors
D-042's fit holds. It also added a floor for Estonian oil shale, which D-109 and D-110 removed. The next
export would have published that.

**Effect:** none: nobody ran it after D-042.

**Fix:** it prints its fit and writes nothing.

## E-154 — TYNDP 2024's Latvian pondage inflow for 2050 is a 53rd of 2030's and 2040's in the source

**Found:** 2026-10-18, by the review of the code · `data/raw/tyndp2024/tyndp2024.Hydro-Inflows.zip`,
`PEMMDB_LV00_Hydro_Inflows_2050.xlsx`, sheet "Pondage - Year Dependent" · **Status:** closed, nothing
to change (D-136)

ENTSO-E's workbook gives Latvia's pondage inflow for target year 2050 at about 1/53 of the values for
2030 and 2040:
- day 1 of 1982 has 0.056 GWh against 2.97;
- climate year 2009's weeks sum to 30.1 GWh against 1 599.6.

The export carries it as given (`years/cy*.json.gz`, `hydro_weekly_mwh.daugava["2050"]`). A scenario
with target year 2050 would run the Daugava on almost no water.

**Effect:** none. Since specification revision 1.6 the application runs the target year 2035 only, and
the text's parser refuses any other. No state reads 2050's inflow. This entry first said a scenario's
text could name 2050; the schema lists the year, but the parser does not take it (corrected
2026-10-18, D-136).

**Decision (D-136):** nothing changes; the export keeps ENTSO-E's figures. Should the application run
another target year, the Daugava's 2050 inflow is to be taken as 2030's and 2040's, which are the same:
the inflow belongs to the climate year.

## E-155 — A link held at 0 MW counted every hour as congested against its direction

**Found:** 2026-10-18, by the review of the code · `app/src/engine/results.ts`,
`app/scripts/validate_fit.ts` · **Status:** fixed (D-135, accepted with D-136)

An internal link with a limit of 0 and no flow is saturated by the engine's test, and the summaries
filed every such hour as congested against the link's direction, whichever zone was dearer. The
external borders count an hour only when something flows.

**Effect:** replay 2025's EE–LV moves one hour from against to along (3.73 → 3.72 % and 21.38 →
21.39 %); no figure the page shows changes at the precision it shows them, and no other published
state has such an hour. A what-if holding EE–LV at 0 MW through January 2025 filed its 744 hours as
against: 12.09 % against and 21.38 % along, where the prices give 9.20 and 24.11.

**Fix:** the way the flow runs, else the way the prices pull, else neither.

## E-156 — The review said its engine commit moved no figure; it moved one week of two of 3 SMR's sensitivities

**Found:** 2026-10-18, comparing the site's computed files after the deploy of main 4e130a8 with those it
replaced (D-136) · `app/src/engine/lp.ts` (`sameWeek`), commit 9549615 · **Status:** closed; the owner kept
the new figures (D-137)

The review made D-130's reuse hold also in the hours a window only looks ahead to: a week whose window of
the first clearing ran a class of oil shale's entry at any hour it solved is cleared anew
(`Results.entryRan`). Its commit, the review's report and the changelog said no figure moved. That was
checked on the golden fixture and on 39 years — the opening view's twelve, the two tight profiles'
twenty-four, the replays 2023–2025 — and not on the sensitivities the site computes when it is built
(D-129).

After the deploy the opening view and 44 of the 46 presentation sets were the same, the run times aside.
The other two are 3 SMR's sensitivities (a) "slow build, scenario demand" and (b) "slow build, slow
demand" in the opening state. In climate year 1995 the first clearing's week 47, counted from 0
(26 November – 2 December), was taken before and is cleared anew now: a window of that week ran an entry
class in its looked-ahead hours only. The year took 48 of its 53 weeks from the first clearing before, 47
now.

**Effect:**
- (b): Estonia's price moves in 3 of the year's 8 760 hours, by 21.9 €/MWh at most (47.15 → 69.02 on
  30 November); its 1995 average 50.275 → 50.283 €/MWh, the weighted average 57.783 → 57.785.
  - The card's change against 3 SMR, +0.857 → +0.859, shows +0.9 as before; the plant's effect,
    −28.253 → −28.251, shows −28.3.
  - The export's line for (b) gives Estonia's average 57.78 → 57.79 €/MWh.
- (a): no zone's average price moves in its fourth decimal. Latvia's gas output, the flows and the LV–LT
  congestion move in their fifth figure; the page shows none of them for a sensitivity.
- Nothing else the site serves moved.

**Why the new figures:** D-130's argument — the week's programmes differ from the first clearing's by the
entry's columns alone, at zero in its solution — needs those columns at zero in every hour a window
solves. The hours it only looks ahead to shape the day it commits, through storage and water. Before the
review the condition was checked on the committed hours. The new figures are the second clearing's own
optimum for that week.

**Fix:** none in the engine. The comparison that found it is `app/scripts/compare_sets.ts`, to be run with
the golden fixture before an engine change is said to move no figure (D-137).

## E-157 — The documents still placed v3 at energiamudel.ee and v3's ported code in this repository

**Found:** 2026-10-18, by the comparison of v3 and v5 · `README.md`, `PROVENANCE.md`,
`docs/SPECIFICATION.md` (the header's "Predecessors") · **Status:** README and PROVENANCE fixed; the
specification's line held for its next revision

Two kinds of statement had gone stale:
- **Where v3 lives.** README and the specification's header said v3 is deployed at energiamudel.ee.
  Since 2026-10-17 it is archived at v3.energiamudel.ee, and v5 serves the root (D-125).
- **What v5 still holds of v3.** README and PROVENANCE said v5 ports v3's clearing and storage
  primitives. Those files went with the two-pass engine on 2026-10-18 (D-132). v3's shortage probe
  remains as a test of the engine of record.

The specification's header also calls v4 "to be archived"; it is.

**Effect:** none on a figure.

**Fix:**
- README and PROVENANCE say where v3 is and what of it remains, and README points to the comparison
  of accuracy (`docs/research/2026-10-18_v3_v5_accuracy.md`).
- The specification's "Predecessors" line is corrected at its next revision, as the earlier wording
  errata were.

## E-158 — The sources dated the fitted markup and the batteries' Δ by a refit that was not adopted

**Found:** 2026-10-19, the rehearsal of `make freeze` (the rebuild check of `make check`) ·
`data/lineage/pipeline.markup.2023-2024.json`, `data/lineage/pipeline.battery_delta.EE.2026.json` ·
**Status:** closed (D-147)

The export's sources (`data/export/sources.json.gz`) gave the two records' date as 2026-10-17, the date of
a refit under the new solver that was not adopted (D-131 kept D-115's register, fitted 2026-10-11). The
refit had written its records over those of the fit in force; `data/lineage` is not in the repository, so
putting the refit's parameters back did not put the records back. The page shows no date for a record
the pipeline derived; the file carries it.

**Effect:** no figure. Two dates in the sources' file, 2026-10-17 → 2026-10-11, from the next deploy;
the export's hash moves a3355e3bb877 → 3b45bfff392b.

## E-159 — The daily generation chart drew a day of net charging as a wedge over every layer

**Found:** 2026-10-19, by the owner on the live site · `app/src/ui/charts.ts` (`ch-stack`) · **Status:**
closed

A day on which the batteries charge a little more than they give back — their losses — has a storage
output just below zero (−0.00 GWh; 34 days of Estonia's climate year 2009 in the opening state).
Chart.js stacks negative values apart from the positive ones, from zero: the storage line fell to zero
on those days, and its fill and the net import's above it covered every layer under them, a dark
wedge from the axis up. The value axis now stacks both signs as one (`stacked: "single"`).

**Effect:** the chart's drawing only; no figure.

## E-160 — Oil shale's entry can leave a class off whose absence clears a day at the price cap

**Found:** 2026-10-22, by the research on one gas bid (`docs/research/2026-10-22_single_gas_bid.md` §6,
`spikes/single-gas-bid/cap_hours.ts`) · `app/src/engine/entry.ts` (`commitEntry`) · **Status:** fixed (D-165)

The entry rule of D-113 commits a class for a UTC day on the first pass's price, which assumes the class free to
run. A class that was off the day before and whose margin at that price does not pay its warm start stays off, and
the second pass may then run short. Under one markup of 50 €/MWh the circulating-fluidised-bed class (288 MW, bid
66 €/MWh) stayed off on 10 June 2020 although the first pass priced every hour of the day at or above its bid, and
16 hours cleared at 4 000 €/MWh with 238 / 438 / 104 MWh shed in Estonia / Latvia / Lithuania. The mend the log
proposes: a class kept off for a day whose second pass reaches the cap comes on and the day clears again — in both
the whole-year path (`runLP`) and the page's parts (`split.ts`), which must stay bit-identical.

**Effect:** none on the register in force. At the fitted adder of D-164 no replay of 2020–2026 has an hour at the
cap that the ladder had not (2021's three are the ladder's too), and no set of 2035 leaves energy unserved; a
variant or a later refit can meet it again.

**Fix (D-165):** a day the second pass clears at the cap in the entry's zone while a class kept off had megawatts
available that day is committed again with every such class on — its minimum stable load all day, the rest at its
bid — and its week clears again, until no such day is left; the next day decides as the rule does. The workers'
parts do the same and carry their forced days, so the year in parts stays `runLP`'s to the bit. The two weeks of
2020 to 16 June at an adder of 50 now clear no hour at the cap (`test/entry.test.ts`). No published figure moves:
the validation, the golden fixture, the site's sets and the adequacy samples of methodology §9.1 have no day to
mend.

## E-161 — Under one gas bid the order in which the zones' gas runs is the solver's tie-break, not cost

**Found:** 2026-10-23, by the night's independent review of the code · `app/src/engine/build.ts` (`applyGasBid`),
`app/src/engine/lp.ts` (the tie-break perturbation of R-ENG-9) · **Status:** fixed by D-168, signed by D-169 at the
owner's delegation of 2026-10-23

Since D-164 every gas offer of the three zones bids exactly one price. Where the internal links do not bind, the
programme is indifferent between Estonia's, Latvia's and Lithuania's gas, and the perturbation that breaks ties
— under 0.001 €/MWh, taken from a hash of each offer's name — decides which runs: at the opening state Estonia's
`gas_ocgt` draws 0.000949, Latvia's `gas_ccgt` 0.000435 and Lithuania's 0.000888, so Estonia's runs last. Renamed
— its bid moved by less than 0.001 €/MWh — Estonia's gas in the climate year 2009 at 0 SMR runs 1 252 hours
instead of 628, its CO₂ 0.58 Mt instead of 0.34, its net import 5.79 TWh instead of 6.28 and its balance 581 M€
instead of 675, while every price moves by 0.02 €/MWh at most. Latvia's and Lithuanian combined-cycle gas were
tied the same way before (one class, one markup; about 0.1 TWh between them in the 2024 replay).

**Effect:** none on what is shown. The names' order happens to be the cost order — Estonia's open-cycle gas last,
behind Latvia's and Lithuania's combined cycle — and a tie-break by cost (each gas offer's bid plus 0.001 × its
class's cost above a combined-cycle plant's, `spikes/gas-order/order.ts`) gives the opening state's figures to the
hour: Estonia's gas 371 / 293 / 217 / 109 hours with no, one, two and three units against 373 / 295 / 217 / 108,
its CO₂, net import and balance in euros unchanged at the precision shown, every price unchanged to 0.01 €/MWh,
and the replays of 2023–2026 unchanged. The figures hold by that coincidence: a renamed offer, a class added to
a zone's gas or a solver release that perturbs otherwise would move them, prices aside.

## E-162 — An old share link that moved one zone's gas moved the one bid of all three

**Found:** 2026-10-23, by the night's review · `app/src/state/text.ts` (`parse`) · **Status:** fixed (the night of
2026-10-23)

D-164 refuses a text written before it that moved the zones' gas apart. The parse compared only the gas keys the
text held: `bid.LV.gas_ccgt=20` alone — the live site's link after a change of Latvia's gas — loaded as the one
bid moved by 20 €/MWh for the three zones, and `bid.gas` beside disagreeing old keys dropped them silently.
**Fix:** every gas class the three fleets hold is compared, a class the text leaves out at 0 as the panel then
wrote an untouched box; apart, or the one bid against old keys that disagree, the text is refused with the
notice. `test/state.test.ts` holds the cases.

## E-163 — The mend of a day at the cap would clear a week forever for a class whose minimum load is all it has

**Found:** 2026-10-23, by the night's review · `app/src/engine/lp.ts` (`clearWeek`, D-165) · **Status:** fixed
(the night of 2026-10-23)

D-165's loop ends because a forced class offers something above its must-run, which `capDays` reads as on. A class
with a minimum stable load of 1 offers nothing above it, so a day still at the cap is found again and the week
clears again without end. ERAA's rows are 0.5, so no run reached it. **Fix:** a day forced already is not forced
again; the loop is bounded by the week's seven days whatever the class. No figure moves (`test/entry.test.ts`).

## E-164 — The register's check passed without the gas bid every run needs

**Found:** 2026-10-23, by the night's review · `db/check.py` (`check_fit`) · **Status:** fixed (the night of
2026-10-23)

`check_fit` compared the gas bid with its record only when the register had one; a register without it passed
`make check`, while every run of the engine stops on it (`fitted()` in `build.ts`). The markup's check had the same
gap. **Fix:** a register without `gas_bid` fails the check (`tests/test_fitted.py`).

## E-165 — The Presentation page's base of 2025 leaves out plant that stands: Kiisa, and Latvia's and Lithuania's batteries

**Found:** 2026-10-23, by the night's independent numeric audit of the Presentation page · `app/src/main.ts`
(`fleet2025`), `app/src/ui/presentation.ts` (`capexHtml`, the inputs' growth) · **Status:** fixed by D-172, at the
owner's delegation of 2026-10-23

The inputs' change from 2025 and the capital cost of what is built above 2025 take ENTSO-E's A68 capacity of 2025
as the base. A68 lists the market's plant: Kiisa's 250 MW of emergency reserve gas, which S1's "existing 263 MW"
holds (methodology §8.1), is not in it, so Estonia's gas reads ×41 against 2025 and 250 MW of standing plant is
priced as built (+143 M€ to 2035, +330 M€ over the plant's life); A68's "other" of Estonia (20 MW) and Lithuania
(37 MW) is counted as gas (11 M€); and A68 of 2025 lists no Latvian or Lithuanian battery, so their 420 and 1 750
MW read as new and are priced in full on the Model view (A68 of 2026 lists 10 and 426 MW). The panel's own growth
marks compare with 2026 first (D-057), so the two pages give one source two changes.

**Effect:** none on the model's figures. Estonia's capital cost to 2035 at 0 SMR, 2 832 M€, would be 2 688 with
Kiisa as standing plant; the Baltic total moves more with the batteries.

**Fixed** (D-172): Kiisa's 250 MW stand in the reference fleets of 2025 and 2026, so the panel's marks and the
Presentation page alike read Estonia's gas +381 % (×41); Latvia's and Lithuania's batteries take A68 of 2026 as their
base. Estonia's capital cost to 2035 at 0 SMR is 2 688 M€ (2 832), the Baltic total 12 611 (13 008). The class
map's "other" stays as R-SUP-1 has it.

## E-166 — Six small faults of the Presentation and import-price pages and the language switch

**Found:** 2026-10-23, by the night's review of the interface · `app/src/ui/presentation.ts`, `app/src/main.ts`,
`app/src/ui/theme.css` · **Status:** fixed (the night of 2026-10-23)

1. The inputs' bid of a line read the first weather year only: the Daugava's water value, which moves by year
   (75–103 €/MWh in single years), showed as 85–91; weighted over the years it is 84–92.
2. The language switch reloaded the page on the Model view: a talk switching to Estonian on the Presentation page
   lost it. The view now travels with the switch (`?view=`).
3. A view's button pressed before the data were in threw a TypeError; it now waits for them.
4. The change of CO₂, shown in whole per cent, took its colour from the change in Mt: a "−1 %" could stand
   uncoloured. The colour now follows the figure shown.
5. The units beside the changes were drawn at 75 % opacity, about 3.4–3.9 : 1 against the background at 10 px; they
   now take the change's own colour in full.
6. On the import-price page the months' table cut its row heads — "averag", "keskmi" — to the plot's margin it
   aligns with; they now run into the margin.

**Effect:** no figure of the model moves; the Latvian hydro's bid on the inputs reads 84–92 €/MWh.

## E-167 — Gas prices on two calorific bases: the record's per gross MWh, the plants' efficiencies and ERAA's price per net

**Found:** 2026-10-23, by the night's check of the talk's facts (fuel and CO₂) · `export` (the Pink Sheet's TTF,
USD/MMBtu × FX / 0.293071), `data/documentary/tech_parameters.csv` (ERAA's efficiencies, "NCV") · **Status:** fixed by
D-171, at the owner's delegation of 2026-10-23

The replays price gas at the World Bank's TTF, quoted per MMBtu of gross calorific value, converted to €/MWh as it
is, and divide it by ERAA 2025's efficiencies, which are on net calorific value; natural gas's gross value is about
1.108 times its net. The replays' fuel cost of a combined-cycle plant is so about 10 % low — some 6–7 €/MWh at the
fit years' gas prices — and the fitted adder of D-164 takes it up. A scenario prices gas at ERAA's 2035 path, 38.2
€/MWh, which the check reads as per net MWh (ERAA 2025 Annex 1, Table 8, 2024 euros): there the cost is on one
basis, and the adder fitted on the replays would lift the 2035 gas bid by what it took up. Sensitivity (d) puts
the year's dearest monthly TTF, per gross MWh, where ERAA's net price stood.

**Effect:** not yet measured. If the bases are as read, the 2035 gas bid is up to about 6–7 €/MWh too high and
Estonia's price in the hours gas sets it as much; the average less. To do: confirm ERAA's basis from the
document, convert the record's TTF to net value (× 1.108) in the replays, refit, and compare.

**Measured** (2026-10-23, branch `research/gas-calorific-basis`, 9911276; its log
`docs/research/2026-10-23_gas_calorific_basis.md`). ERAA's efficiencies and its emission factor for gas are on net
calorific value, and its sheet of fuel prices names no other basis. With the record's TTF × 1.108, both fit years
choose an adder of 42.5 €/MWh (51.25), the fit years' sum of MAE is 61.31 (61.30), every replay year moves by
0.01 €/MWh at most, and the breaches stay 7 / 8 / 11: the replays cannot tell the bases apart. 2035 can. The bid
falls to about 185 €/MWh, and Estonia comes out at 84.4 / 75.7 / 66.5 / 56.3 €/MWh (85.4 / 76.4 / 67.1 / 56.6). The
plant's effect is −8.8 / −17.9 / −28.2, the contract 33 / 114 / 250 M€ a year, and Estonia's gas runs 440 hours (373).
Sensitivity (d), its floor on the same basis (83.5 €/MWh), gives 107.9 / 81.8 (104.6 / 79.8).

**Fixed** (D-171): ERAA's Annex 1 states its fuel prices in "€2024/net GJ" (Table 8, p. 23). A replay divides the
record's gas price by 0.9 (IPCC 2006: gas's NCV about 10 % below its GCV), sensitivity (d) its shock too, and
`make fit` refits the adder to 42.5 €/MWh and the gas CHP floors. With the day's D-169 and D-170, Estonia's 2035
average is 83.6 / 75.1 / 66.3 / 56.2 €/MWh with no to three units; the replays hold (breaches 7 / 8 / 11).

## E-168 — D-166 gave the present value of what two units keep in Estonia as 11.3 bn €; it is 11.4

**Found:** 2026-10-23, by the night's audit of the built Presentation page against the independent recomputation ·
`docs/DECISIONS.md` (D-166, Consequences) · **Status:** fixed in the methodology and the CHANGELOG; the record stands

D-166 took the difference of the rounded present values, 16.2 − 4.9 = 11.3. The unrounded bills give (587.0 − 176.5)
M€ × 27.68 = 11.36, 11.4 bn €, which the page shows. The other figures of the record hold (6.1 and 15.7).

**Effect:** none on the page. On the night's audit the import-price page's months' table at 1280 px still cut its
corner head "€/MWh" (E-166, item 6); it now runs into the margin as the row heads do.

## E-169 — The deploy of 2026-10-22 served its new files unreadable for about a minute

**Found:** 2026-10-22 22:25, by the deploy's own checks (a bundle fetched over HTTPS answered 403) · the night's
deploy procedure · **Status:** fixed the same minute; the procedure corrected

The night's deploy ran `make deploy` in a shell whose file-creation mask was 077, set for the copy of the deploy key.
The build and the sets it made were readable by their owner alone, and `rsync`, which leaves an existing file's mode on
the server as it is but gives a new file its source's, gave the 17 files new to the server — the hashed bundle, the
workers, the year files, the documents — the same mode. The deploy's check, the data manifest, is a file the server
already had, readable as before, and passed. From
22:25:30 the page loaded and its scripts did not: a visitor saw an empty page. At 22:26:34 the files were made
readable (`chmod 644`), every file on the server checked readable, the bundle fetched again (200).

**Effect:** about a minute of a page without its scripts. **Fix:** `make deploy` makes the build readable to all
before it sends it (`chmod -R a+rX app/dist`), whatever the mask of the shell that built it — the Mac's `openrsync`
has no `--chmod`; the key's mask is set in a subshell around its copy alone.

## E-170 — Harmony Link is modelled as an HVDC cable; it is to be built as an AC overland line

**Found:** 2026-10-23, by the night's check of the talk's facts (the Baltic market), confirmed on PSE's notice of
15 July 2024 · `docs/methodology.md` R-LINK-3, the typical availability of the cables and the adequacy samples ·
**Status:** fixed by D-170, at the owner's word of 2026-10-23

PSE and Litgrid agreed on 15 July 2024 to build Harmony Link as a new double-circuit 220 kV AC line overland, Ełk
Bis to a new substation near Gižai, to be energised by the end of 2030; the subsea HVDC tenders were cancelled in
April 2023. The model keeps ERAA 2025's step for the line (700 MW from 2030), which is the line's capacity whatever
its kind, but gives it what it gives an HVDC cable without history: a typical availability of 94 % (ERAA's HVDC
forced-outage rate of 6 %) and, in the adequacy samples, two poles of half the line each failing at 6 % with 7
days' repair. An AC line's outages are of another kind; the 6 % is ERAA's rate for HVDC links.

**Effect:** not measured. Lithuania–Poland carries on average about 42 MW less than the line's step in a scenario
year (6 % of 700 MW) and the adequacy samples take Harmony Link's outages out of the line's hours; a small effect in
Lithuania, smaller in Estonia. To do: read the AC lines' treatment in ERAA 2025 and give Harmony Link the AC line's
availability, in the methodology's words and in the samples.

**Measured** (2026-10-23, branch `research/gas-calorific-basis`, daab31e, its log §5). At 100 %, Estonia's 2035
average falls by 0.30 €/MWh without the plant and by 0.03 with three units, and the plant's effect is 0.1–0.3 €/MWh
smaller. The adequacy samples were not run.

**Fixed** (D-170, "make it correct, as it is being built"): Harmony Link is an AC line, at ERAA's
forced-outage rate for HVAC, 0 % (ERAA 2025, Annex 2, §2.2, p. 17), at its 700 MW in every hour, and not sampled.
LitPol went with it (E-172).

## E-171 — The Estonian pages: a decimal point in the calibration page's header, and the new strings' words

**Found:** 2026-10-23, by the night's proofreading of the Estonian added since d12317c (`et.ts`, `methodology_et`,
`faq_et`) and a scan of every Estonian view of the deployed build for a decimal point · **Status:** fixed (next deploy)

- The calibration page's generation table heads its column "± 10 % üle 0.2 TWh": the threshold went into the text
  as a number, not through `fmt`, so it kept its point in Estonian. It now reads 0,2. The Presentation page has
  none; the weather page's weights stand inside ENTSO-E's quoted English and keep theirs.
- The strings of D-164 called a combined-cycle plant "kombitsükliga jaam"; the panel names the class "Gaas,
  kombineeritud tsükkel", and the strings and `methodology_et` now say "kombineeritud tsükliga jaam". The bid's
  note had no verb ("gaasijaamade ühine pakkumine … kulud pluss lisa"); the capital cost's note said that every
  *ehitus* lasts a lifetime. Both now read as Estonian.

**Effect:** words only; no figure.

## E-172 — LitPol is modelled as the HVDC back-to-back link it was until February 2025

**Found:** 2026-10-23, while fixing E-170 · `export/tables.py` (`LINES`, the adequacy's cables), R-LINK-3, R-LINK-7 ·
**Status:** fixed by D-170

LitPol ran through the back-to-back converter at Alytus from 2015. On 9 February 2025 the Baltic states joined the
Continental European synchronous area through it (Litgrid: through this link the Baltic states operate at the
Continental European frequency), so it has run as an AC line since. A converter cannot hold two systems in step. The
model still gave LitPol, in every scenario year, the converter's statistics of 2019–2024 (available technical
capacity 90.9 %, planned maintenance 4.4 % from 1 June). The adequacy tab drew its converter's trips (3.2 a year).

**Effect** (with E-170, D-170): Lithuania–Poland carries about 90 MW more on average in 2035 (1 200 MW in every hour
against 1 112 on average). Estonia's average falls by 0.78 €/MWh without the plant and by 0.07 with three units. The
replays are unchanged: an observed year takes A31's offered capacity.


## E-173 — On the net basis one test week's prices are not unique in eleven hours, and R-ENG-8's gate reads them apart

**Found:** 2026-10-23, by `make gap` after D-171 · `reference/gap.py`, `app/scripts/gap_weeks.ts`, R-ENG-8, R-ENG-9 ·
**Status:** fixed by D-175 (2026-10-23, the owner's word): the gate meets a week whose prices differ on the same optimum

On the record's gas price per net MWh, the replay of 2023's week 3 has, in 11 hours of its last day, more than one
optimal price. The engine of record prices them at 86.29 €/MWh, the bid of Estonia's biomass CHP; the reference
LP, solved as configured with the dual simplex, at 99.94, in all three zones alike. Both are optima of the same
programme: the window's objective is 72 359.2743 on either, the storage discharge (7 365 MWh) and the Daugava's
release (150 702 MWh) are the same, and the reference solved with the primal simplex returns the engine's 86.29 in
those hours. R-ENG-8's gate, which compares prices (R-ENG-9), reads the week's average gap as 0.894 / 0.894 / 0.650
€/MWh against 0.1 and fails it: met on 7 of 8 weeks. The other seven weeks agree to 0.000 €/MWh.

**Effect:** none that the replays show beyond 0.02 €/MWh: the other optimum would move 2023's MAE in Estonia by at
most 11 hours × 13.6 €/MWh over the year. The Calibration page shows the gate as not met until it is settled. Two
ways out, the owner's to choose: a gate that compares the objective, the volumes and the prices where they are unique;
or a rule for an indeterminate price applied by both programmes, as the day-ahead market's algorithm has one.

**Fixed (D-175, specification revision 2.36):** a test week whose prices differ beyond the gate meets it when every
window's objective is the reference's within 10⁻⁶ and the storage within ±1 %. The hours apart are listed. On 2023's
week 3 the objectives agree to 2.4 × 10⁻¹⁴, and the 11 hours' days, solved again by the primal simplex from the same
state, give the engine's price in all 11. `make gap`: 8 of 8 weeks.

## E-174 — Since D-183 the JSON export's sensitivities fail the published schema

**Found:** 2026-10-27 (night), by a read of the schemas against the code · `schema/results.schema.json`,
`app/src/ui/export.ts`, `app/test/export.test.ts`, R-APP-9, R-APP-11 · **Status:** fixed 2026-10-28

D-183 gave the standard sensitivities the ids "1" to "4". The results schema kept the enum "a" to "e" and its text
"the five standard sensitivities", the generated type followed it, a cast in `export.ts` hid the mismatch, and the
export's test still built its sensitivities with ids "a" to "d". Every JSON export saved since D-183 failed the schema
it names, and CI stayed green.

**Effect:** no figure; a reader who checks an export against `results.schema.json` finds it invalid.

**Fixed:** the enum is "1" to "4", the descriptions name the owner's price pairs, the cast takes the generated type, and
the test builds its sensitivities as the page does and checks the ids `sensitivities()` gives. The presets schema's
description of the prices of 2026 says what still reads them. The schemas are part of the export's code hash: the
export is written again, its data unchanged.

## E-175 — Without the site's password `make deploy` ends in an error and `make freeze` would stop at its comparison

**Found:** 2026-10-27, at the deploys of that day, and by a read of the freeze's recipe · `Makefile`,
`validate/deployed.py`, `app/scripts/compare_sets.ts`, R-DEP-5, D-145, D-178 · **Status:** fixed 2026-10-28

Since D-178 the site sits behind HTTP Basic Auth. Its password was changed on 2026-10-27 08:17. From then
`validate.deployed`, the last step of `make deploy`, met 401: every deploy of that day ended in an error after the
files were up, and each was checked by hand over ssh and through D-179's cookie. `make freeze` fetches the live site's
sets over HTTPS for its comparison, and would have stopped there after some 25 minutes of rebuilding.

**Effect:** none on the site; four deploys recorded as failed that were not.

**Fixed:**
- `validate.deployed` sends D-179's cookie when `DEPLOY_SSO` holds the token, beside `DEPLOY_AUTH` where the password is
  at hand. `make deploy` reads the token over ssh into the environment, never into make's echo; a test checks the
  header.
- `make freeze` mirrors the live site's `data/` over ssh first — not its document root, whose `.htaccess` holds the
  token — and compares the sets with the mirror (`data/raw-aside/<date>/live`). It needs `DEPLOY_TARGET` and stops at
  once without it.

## E-176 — The talk's figures took the neighbours' averages at level 1

**Found:** 2026-10-27 (night), by a read of the talk's pack · `spikes/presentation-2026-11/figures.ts`, slide 8 ·
**Status:** fixed 2026-10-28

`figures.ts` wrote each profile's neighbours' averages from the profile at level 1. Since D-182 the opening runs at
the owner's levels, so slide 8's table would have shown 50.7 / 60.2 / 78.6 €/MWh for the 75 / 90 / 120 the runs took.

**Fixed:** the averages are taken at the state's level — the owner's on Distributed Energy 2035, ×1 on the tight
profiles (D-190).

## E-177 — The rollback copies of the site held the token of the way in without the password

**Found:** 2026-10-27 (night), by a read of `data/raw-aside/` · D-179 · **Status:** fixed 2026-10-28

The deploys since D-179 kept a rollback copy of the whole document root (`data/raw-aside/live-<commit>/`, ignored by
git). The server's `.htaccess` holds the token in place of its placeholder, so four copies held it in plain text on
the Mac, and the token is the cookie's value.

**Effect:** none found outside the Mac. The token was found nowhere else in the repository or the session's files.

**Fixed:**
- The four copies' `.htaccess` hold the placeholder again: a rollback from them restores the password-only file, and
  `make deploy`'s step sets the token again.
- A copy is taken with `--exclude=.htaccess` from now on, and a rollback is run with the same exclusion.

Changing the site's password does not close the way in without it; that takes a new token in
the file `.sso-token-v5` above the document root and on the tools page. The owner's to decide.

## E-178 — The waste rows' megawatts under their bid's box

**Found:** 2026-11-02, by the owner on the Model view's panel, with a picture of a waste row: "MW goes under the plate" · D-198 · **Status:** fixed 2026-11-02

Since D-198 a source's number box and its bid's box share a line: the number box 96 px wide with its unit, the bid's
box at the line's end with its own unit. A waste plant's bid reads in words, *antud* / *toodang* (given / output),
wider than a bid in euros, and on Estonia's and Lithuania's waste rows the line was 6 px short: the unit MW stood under
the bid's box. The rows with a three-figure bid in euros were 1 px from it. **Effect on results:** none.

**Fixed:** the number box is 72 px wide, as a typed bid's box, its figures 8 px from its edges where they were 12. On
every source row of the three zones the unit stands 18 px or more from the bid's box in Estonian and 25 px or more in
English, and a five-figure number fits its box (measured in the browser).

## E-179 — The import-price page's preset line stood left of the knob

**Found:** 2026-11-03, by the owner on the import-price page, with a picture of Finland's level at ×1: "the slider snaps off the middle; check every
slider for such errors" · D-198 · **Status:** fixed 2026-11-03

D-198 gave the sliders an 18 px knob and put the panel's preset line under the knob's centre: the knob travels the
track less its own width, so its centre at a share of the range is 9 px + share × (track − 18 px). The import-price
page's level slider kept the line of the fill bars before D-198, which had no knob: share × track. At ×1, a fifth of
0.5–3, the line stood 5.4 px left of the knob's centre, where the slider snaps. **Effect on results:** none; the snap
itself went to ×1.

**Fixed:** one helper (`panel.ts` `tickLeft`) places every slider's preset line, the panel's and the import-price
page's. Measured in the browser on every slider that has a preset line — the panel's in Estonia, Latvia and Lithuania
and the import-price page's, 39 — the line within 0.01 px of the knob's centre at the preset. The Presentation page's
level and fuel sliders are the browser's own, with no preset line drawn.

## E-180 — The line map's streaks stood still in Safari

**Found:** 2026-11-03, by the owner: "the lines' animation on the map
does not work in Safari" · D-208 · **Status:** fixed 2026-11-03

D-208 moved each streak's gradient by SMIL on its `gradientTransform` (`animateTransform`). WebKit, Safari's engine,
runs that animation's clock and draws the gradient where it started. Measured in WebKit 26.5 (Playwright) on the live
site as it stood (f82498d, served from its rollback copy): the 14 streaks drawn (hiding them changes 1,840 px), the
map's clock going on (2.05 to 3.52 s), and not a pixel of the map changed in 0.3 s, where Chromium 149 changed some
3,200; on a page with the map's markup a gradient without `spreadMethod="repeat"` stood still as well. **Effect on
results:** none; in Safari the streaks stood still on the site since f82498d.

**Fixed:** the gradient's four ends, `x1`, `y1`, `x2` and `y2`, are moved by SMIL instead, a period along its way in
the same time (`panel.ts` `streaks`): the same picture at every moment, which WebKit draws. Of the four ways tried on
that page — the ends moved, the line moved with its dash holding it over the cable by SMIL or by CSS, the transform set
from a script each frame — every one moved in WebKit; the ends are the smallest change. Measured on the site in the
dev server: 3,542 px of the map changed in 0.3 s in WebKit, 3,200 in Chromium, the two engines' frames alike, and after
a switch redrew the panel the map's clock stood at the page's (1.698 s in WebKit). The panel's test reads each
gradient's four ends moved and no `gradientTransform`.

## E-181 — The tips cut by their box's scrolling and covered by a sticky column

**Found:** 2026-11-03, by the owner, with a picture of the tip of the hours with a fossil price in Estonia lying under
the next row's name and the weather years' table's scenario names: "an overlap problem; check every other tip in the project" · D-029, D-089 · **Status:** fixed
2026-11-03

A "?"'s tip (D-029) and a bid's (D-089) were drawn inside their mark (`::after`), so each lived in its mark's boxes.
The scenarios' table and the weather years' table keep their first column in view (`position: sticky; z-index: 1`), each
of its cells a layer of its own, so the cells after a tip's own covered it. Every box that scrolls a table sideways in a
narrow window (`overflow-x: auto`: the scenarios' card, the sensitivities, Calibration, the import price, the
Presentation page's cards) and the panel, which scrolls (`overflow-y: auto`), cut a tip at its edge, and a tip near the
window's side ran past it. Measured by hovering every tip of every view (each country's panel on Model, the folds
opened) in Chromium 149 and WebKit 26.5 (Playwright) and hit-testing 7×7 points inside each: at 1,440 px 26 of the 77
tips in Chromium and 22 in WebKit were covered, cut or past the window. **Effect on results:** none; tips that could not
be read whole.

**Fixed:** one box over the page (`main.ts` `placeTip`, `theme.css` `.tipbox`, fixed in the window), placed by
`wiring.ts` `tipPlace`: 4 px under its mark from the mark's left edge (a bid's from its right edge), 8 px inside the
window's sides, above the mark where only above has room; it moves with its mark when the page or a box scrolls. It
shows as the tips did: while the mark or the box is under the pointer, while the mark has the keyboard's focus (a bid
any focus, its field's too), or once a "?" is opened by a click or tap, until tapped again or Escape (WCAG 1.4.13).
Hovered again: none of the 77 covered, cut or past the window, in Chromium and WebKit, at 1,440 px, at 1,280 px (the
page a phone shows since D-149) and at 800 px; Tab (Option-Tab in WebKit) and Escape, a click kept open and closed by a
click elsewhere, and a bid's field focused, checked in both. The wiring test reads the box's places.

## E-182 — The Statistics page's "the model, 2035" for Estonia is S1's fleet, not the opening's

**Found:** 2026-11-04, while drawing each country's installed wind and solar on the Statistics page (D-214), whose
diamonds mark the model's figures · D-182, D-087 · **Status:** fixed 2026-11-04, at the owner's word on the fix
proposed ("Yes, fix", "yes, fix it")

Since D-182 (2026-10-27) the scenario view's Estonian fleet of 2035 is Elering and TalTech's S1 with the owner's onshore
wind and solar in place of S1's: 1,300 MW and 2,500 MW (`model.ts` `OPENING_EE_MW`, applied in `fleetOf`). The
Statistics page reads the model's column straight from the export's fleet (`statistics.ts` `assumed`). Its tables'
column "the model, 2035" and the new figures' diamonds therefore show S1's own 1,244 MW of onshore wind and 1,785 MW of
solar for Estonia, while the page's text says the column is the scenario view's fleets. Latvia, Lithuania and the year
2040 are unaffected. **Effect on results:** none on the model; two figures of the Statistics page, Estonia's onshore
wind and solar of 2035, 56 MW and 715 MW below what the scenario view runs.

**Fixed:** the core zones' figures of 2035 are the opening's megawatts, which `fleetOf` sets (`statistics.ts`
`assumed`): Estonia's onshore wind 1,300 MW and solar 2,500 MW in the column and the diamonds, Latvia's, Lithuania's
and Estonia's other classes as before. The source stays S1's document, and the note under the onshore wind's and the
solar's tables says, in the panel's words, that Estonia's figure is the owner's value for the opening in place of
S1's 1,244 and 1,785 MW. The statistics test reads both cells, both notes, Latvia's figures and offshore wind's
unchanged, and Estonia's solar diamond at 2,500 MW.

## E-183 — The deck's 2040 milestone said the regulation is in force since March 2026

**Found:** 2026-11-09, the night's check of the deck's sources against EUR-Lex (D-221) · D-220 · **Status:** fixed
2026-11-09, under the owner's word for the night ("fix the facts, propose the wordings", "correct facts, propose
wording")

Slide 9 of the deck (D-220) captions the EU's 2040 milestone "Regulation (EU) 2026/667, in force since March 2026" in
both languages, as v3's slide did. The regulation, which writes the 2040 target of −90 % net emissions against 1990
into the European Climate Law, was signed on 11 March 2026 and published in the Official Journal on 18 March 2026, and
it entered into force on the twentieth day after its publication, 7 April 2026 (EUR-Lex, ELI `reg/2026/667/oj`; the
Commission's Climate Law page says the same). **Effect on results:** none; one month in one caption.

**Fixed:** the caption reads "in force since April 2026" / "jõustunud aprillis 2026" (`deck.ts`, `et.ts`); the
comment above the slide gives the three dates, and the deck test reads the caption. The methodology's §8.9 names the
dates too.

## E-184 — Safari reported a ResizeObserver loop when the deck opened

**Found:** 2026-11-09, the night's regression of the views in WebKit 26.5 (D-221) · D-220 · **Status:** fixed 2026-11-09

Opening the Presentation 2 view in WebKit raised, now and then, the window error "ResizeObserver loop completed with
undelivered notifications": the deck's frame is observed for its width (`main.ts` `paintDeck`, a `ResizeObserver` on
`.deck-wrap`), and `fitDeck`, run inside the observer's delivery, set the stage's transform while the same frame's
layout was still settling — the view's pane unhidden, the panel folded away (`.app.full`), the page's scroll bar
coming or going — so WebKit found the frame's size changed again after its depth had been delivered and reported the
loop. Chromium was silent. Seen on the deployed d0d7eda served by `vite preview` in two of four WebKit walks of the
views and on the night's build in one of four, never in Chromium. **Effect on results:** none; the stage was fitted all
the same; an error in Safari's console on every opening it struck.

**Fixed:** the observer defers the fit to the next animation frame (`requestAnimationFrame(fitDeck)`), after the loop has
completed; a change of full screen still fits at once. Checked in WebKit on the dev server: the views walked twice at
1 440 and 1 280 px, the deck opened each time, no page error.

## E-185 — D-224 said the site states the declaration of interest nowhere; its questions and answers do, and the documents still described what the day's edits removed

**Found:** 2026-11-09, the night's sweep of the documents after the day's edits (D-224 … D-229) · D-224, D-226 ·
**Status:** fixed 2026-11-09, on the night's branch (`night/2026-11-10`)

D-224 took the footer off the page and the closing text off the deck's last slide. Its record says under Consequences
that "the site no longer carries the declaration of interest anywhere on its pages; README does", and R-PUB-2's
revision 2.72 that "README alone states it". Neither is so: the questions and answers' "Who made it?" (`docs/faq.md`,
`docs/faq_et.md`), which the Documentation view shows in both languages, state it in D-193's wording, and D-224 did not
touch them. The same sweep found the documents that still described what the day removed or changed:

- the questions and answers, in both languages: "the panel lists the levels as changed" — since D-226 the opening's
  levels are the baseline, neither amber nor starred;
- the methodology: §8.4 ("the footer and the README carry the declaration of interest"), §8 ("what differs from the
  presets is listed above the cards"), and nothing of D-225 … D-229 in §8.1 and §8.9;
- `docs/PRODUCT.md` ("declares it on every page");
- the specification: R-BND-5 ("the factor is shown next to the result"; the opening's levels "listed as changed from
  the profile as published"), R-DEM-3 and R-DEM-4 ("shown with the result") and R-UI-6, which D-224 and D-226 changed
  without a revision note; R-APP-16 without D-227 and D-228;
- the talk pack: the Q&A's K35 answers that the declaration is "on slide 2 and in the site's footer", its opening list
  names the footer's declaration among the Estonian texts to review, K54 and the demo script's step 7b count thirteen
  slides.

**Effect on results:** none; no figure is involved. Until corrected the record understated where the site declares the
author's interest, the site's own questions and answers described marks the panel no longer shows, and the talk's
prepared answer to "what is your relation to Fermi Energia?" (K35) pointed at a footer the night's branch does not have.

**Fixed:** specification revision 2.74 (R-PUB-2, R-BND-5, R-DEM-3, R-DEM-4, R-UI-6, R-APP-16); a correcting line under
D-224 and a note under D-226; the questions and answers name the factor beside each level's box (▲ ×1.88) in place of
"listed as changed"; the methodology's §8, §8.1, §8.4 and §8.9; `docs/PRODUCT.md`; `PROVENANCE.md` (slide 13 is v5's
own); the Q&A's K35, K54, K57 and opening list and the demo script's step 7b. The declaration's wording is untouched.
**Left to the owner:** D-193's declaration says the author's assumptions on wind, solar and the neighbours' prices are
"each marked as such in the panel". Since D-224 and D-226 the neighbours' levels are marked by their factor on the
profile as published alone (▲ ×1.88 beside each box), no longer by the amber box, the star in the scenario text and
the list under the cards. Whether that mark is enough, or the levels get a line of their own as wind and solar have
("the owner's value at the opening"), is the owner's to say (the night report, §4).

## E-186 — A key could not bring a neighbour's level back to its default

**Found:** 2026-11-09, the night's check of the day's edits in the browsers · D-226, D-180 · **Status:** fixed 2026-11-09

The neighbours' default levels on Distributed Energy 2035 — ×1.8786, ×1.9607 and ×2.0982 — lie off the sliders' grid
of 0.01. A pointer comes back to them through the snap, where D-226 put the line; a key moves one step of the grid and
does not snap (WCAG 2.1.1, D-029), so one step right and one step left ended at ×1.88, not at ×1.8786: a state a hair
off the opening's, its box amber, which the page computed in the browser where the sets computed at the build would
have returned. The Presentation page's three level sliders (D-180) did the same. **Effect on results:** none on a
published figure; with the keyboard alone the opening's levels could be left but not found again, short of choosing
the profile anew or loading the page again.

**Fixed:** a key's step that lands on the grid's value nearest the preset takes the preset (`panel.ts` `keyStep`, used
by the panel's and the Presentation page's sliders; `test/ui.test.ts`). Checked in Chromium and WebKit, both languages:
right and then left on Finland's slider ends at the default, the box not amber.

## E-187 — The deck's F and N keys did nothing under a keyboard layout without Latin letters

**Found:** 2026-11-09, noted in the morning's hand-over and taken up in the night's sweep · D-221, D-222 (R-APP-16) ·
**Status:** fixed 2026-11-09

The deck's key handler compared the letter typed (`KeyboardEvent.key`) with "f" and "n". Under a Russian layout the
same keys type Cyrillic letters, so F did not go to full screen and N did not show the notes; the arrows, PageUp and
PageDown, Home, End and the space bar worked, being no letters, and so did the bar's buttons. **Effect on results:**
none; the two keys of a talk dead whenever the layout was not a Latin one.

**Fixed:** a key that types no Latin letter is read by its place on the keyboard (`KeyboardEvent.code`, `KeyF` and
`KeyN`); where the layout types a Latin letter that letter still decides, so that another Latin layout's F stays F
(`main.ts`). Checked in Chromium with trusted key events through the DevTools protocol — the Cyrillic letter on N's key shows and hides
the note, the one on F's key enters and leaves full screen, another Russian letter does nothing, a Latin "n" works as
before — and in WebKit for N.

## E-188 — The full methodology scrolled the page sideways in a window 1 280 px wide

**Found:** 2026-11-09, the night's regression of the views, the first to measure sideways scroll on each · R-APP-9 ·
**Status:** fixed 2026-11-09

At 1 280 px the Documentation view's text column is 378 px wide, and three of the methodology's seventeen tables are
wider — the first, PECD against the observed capacity factors, by 117 px — so the whole page scrolled sideways by
85 px: in English on the Methodology tab, in Estonian on the full methodology's. At 1 440 px they fit. Older than the
day's edits. **Effect on results:** none.

**Fixed:** a table of the documentation's text that is wider than its column scrolls in its own box
(`theme.css`, `.doc:not(.wide) table.md`); the Sources tab's tables, which fill their column, are as they were. Checked
at 1 280 and 1 440 px: no view scrolls sideways.

## E-189 — The words under the energy mix's bars stayed English in the Estonian interface

**Found:** 2026-11-09, the night's sweep of the Estonian interface (the owner's picture of the validation run's charts
shows it) · D-141, D-142 (R-APP-2) · **Status:** fixed 2026-11-09

In a validation run the energy mix draws a pair of bars per zone, the model's and the observed year's, and writes a word
under each. The words were the stacks' own names, "model" and "actual", drawn on the canvas as they are, so the
Estonian page read "model  actual" under bars whose title and legend are Estonian. The interface test cannot see it:
the words are not written through the dictionary and are not in the page's markup. **Effect on results:** none.

**Fixed:** the words go through the dictionary (`charts.ts` `STACK_WORD`): "mudel" and "tegelik", the two words the
cards' columns and the charts' legends already use. The sweep's other findings are not errors of the interface: the
sources' titles and the publishers' outage messages are English as published, and the full methodology is English by
decision (D-142). Four fragments of the validation run's outage list — "planned", "outage", "MW left" and "of" — have
no Estonian yet; their wording is put to the owner in the night report.

## E-190 — The browser's store held the sensitivities of one state and a half; the methodology's example of the clause was out of date

**Found:** 2026-11-10, the research of the page's speed (`docs/research/2026-11-10_page_speed.md`) · D-128, D-134,
D-184 (R-ENG-7) · **Status:** fixed 2026-11-10 (D-232, signed that day)

D-128 gave the browser's store room for twenty-four sensitivity sets, when a state had four of them, or eight with the
plant: three to six states. D-184 made them sixteen a state — the four price pairs for each of the four scenarios — and
left the budget as it was, so the store held one state and a half: a reader who came back to a value two changes back
saw the table at once and waited 24 s for sensitivities the page had computed minutes before. The methodology (§8,
"Results computed before") still gave D-134's example in the figures of its day — turning the clause on with 2 SMR
shown computes "twelve sensitivity years instead of twenty-four" — where since D-184 it is thirty-six instead of
forty-eight. **Effect on results:** none; time.

**Fixed:** the methodology's sentence, with this record; the store by D-232, which keeps each set by what it computes
from, the sets last used up to a budget of bytes (192 MB: about fourteen states' tables and sensitivities).

## E-191 — The page waited without end for a browser's store that did not answer

**Found:** 2026-11-10, by the owner on the site an hour after the deploy of D-232 … D-237: the sensitivities' table
showed 0 SMR's row and "computing…" in every other, and stayed so ("it computes and gives no results") · D-126, D-232
(R-ENG-7) · **Status:** fixed 2026-11-10, on the site since 17:29

The page asked the browser's store for a set before it read the build's file of it or computed it, and waited for the
answer whatever it took. A store that never answers therefore held up everything behind it: on the opening state the
twelve sensitivity sets of the other scenarios — the table and 0 SMR's row come from the opening view's file, which
asks no store — and on any other state the table itself. D-232 made such a store likely where it had been rare: it
kept its sets in version 3 of the database `energiamudel-results`, and a browser opens a later version only when every
page that holds the old one has let go of it — another tab of the site, or the page before a reload, which a browser
may keep for its back button — and does not always say that it waits. The same wait stood in the code since D-126
(`recall` before a file or a run), with nothing to set it off. Reproduced with a store whose `open`, or whose
requests, fire no event: the deployed page showed the owner's picture exactly and computed no change; the owner's own
browser could not be looked into (the site asks its password there). Three cases of a reader coming back — the old
tab closed, open beside the new one, reloaded — did not reproduce it in Playwright's Chromium and WebKit, so which
browser state set it off for the owner is not known. **Effect on results:** none; a page that showed part of its
results and computed nothing more.

**Fixed:** the store spares a computation and no longer holds one up (`stored.ts`): a store that has not opened, or a
request that has not answered, within 1.5 s (`PATIENCE_MS`, `within`) is done without for the life of the page, which
then reads the build's files and computes as if it had none; reading a set no longer waits behind the store's writes
(the reading apart from the marking of its use). The sets are kept in a database of their own name,
`energiamudel-sets`, not in a later version of the old one, so that no page holding the old one is waited for; the
old database is deleted when no page holds it (this corrects D-232 item 3's "version 3"). Checked in Chromium and
WebKit: with a store that never opens and with one whose requests never answer, the opening state's sensitivities are
in after 2.1 s and a change computes; the three cases of a reader coming back; a year kept and read back after a
reload; the journeys `lines`, `replay` and `deckreload` as before. Until the deploy, `?nostore` in the address showed
the page without its store.

*Deployed* 2026-11-10 17:25–17:29 at the owner's word ("Yes, deploy it"): main 691400b, the rollback copy
`data/raw-aside/live-3e26bb76b1a0/` (.htaccess left out), the sets 223 years in 126 s (54 files, 18.20 MB), the manifest
equal, the live check all equal to the build (bundle index-DMWiUswB.js, opening 691400b56750 under the engine id
0fa0012f56bd), compare_sets 53 sets, none differing, the offline copy refreshed, the key's copy deleted; the live page
in Chromium and WebKit through the cookie: with a store that never answers the sensitivities are in after 2.2 and
2.3 s; a year computed there is kept in `energiamudel-sets` and read back after a reload; fourteen slides clean, no
page error. The owner, asked whether the sensitivities now come in in his browser: "Yes, it works".

## E-192 — A store slow to open once was given up for the life of the page

**Found:** 2026-11-10, by `make browser-check` on D-239's working tree, on a machine busy with other work: in WebKit
a year the site does not hold was computed and not kept, and after a reload computed again · D-232, D-238, E-191
(R-ENG-7) · **Status:** fixed 2026-11-10, on the site since 21:53

E-191's fix let nobody wait for the browser's store longer than 1.5 s, and a store that had not opened by then was
done without for the life of the page (`stored.ts` `open`). A store's first opening is not always a matter of
milliseconds: measured in Playwright's WebKit on this Mac while other work ran, 2.8 s for the working tree and 4.3 s
for the deployed build, where a later opening takes 0.1 s. The page whose first opening overran then read nothing kept
and kept nothing it computed until it was loaded again — no wrong figure, and no wait; every return to a state
computed before was computed again, which is what D-232 was to spare. The deployed build does the same: with the
opening held back three seconds it keeps nothing (`browser_check.py` against the offline copy of daa8fd0, Chromium).
A phone or a busy laptop is where it would be met; on a quiet machine the store opens in tens of milliseconds, which
is why the checks of E-191 and D-238 passed.

**Fix:** the wait stays bounded as it was; the opening itself is no longer abandoned. A store that opens after the
1.5 s is used from then on (`open`: the opening's own answer replaces the "without"), so the first askers compute and
the later ones read and keep. A store whose request does not answer is still done without for the life of the page.
`make browser-check` holds the case: a store that opens three seconds late, a year computed after that is kept — it
fails on the deployed build and passes on this one, in Chromium and in WebKit; its wait for a kept year is now a
poll, not one second. No figure moves: 53 presentation sets equal the site's.

*Deployed* 2026-11-10 21:49–21:53 at the owner's word ("Yes, deploy it"), D-239 and ERRATA E-192 together: main
e28f219, the rollback copy `data/raw-aside/live-daa8fd01b224/` (.htaccess left out), the sets 223 years in 117 s (54
files, 18.20 MB), the manifest equal, the live check all equal to the build (bundle index-BPwBVHv2.js, opening
e28f2193cad5 under the engine id 1de529a3a34f), compare_sets 53 sets, none differing, the offline copy refreshed, the
key's copy deleted; the live page in Chromium and WebKit through the cookie: a year computed there kept and read back
after a reload; with a store that never answers the sensitivities in after 2.0 and 2.2 s; with a store that opens
three seconds late a year computed after it is kept; fourteen slides clean, no page error.

## E-193 — The Weather page's notes on the hydro inflow stayed in English in the Estonian view, their fix on a branch never merged

**Found:** 2026-11-02, while the pages were being redesigned (branch `design/fermi-style`), and fixed that day on a
session's branch, `claude/xenodochial-antonelli-1abaee` (a3907c3), under the number E-178, which main gave the same day
to the waste rows' error; found unmerged on 2026-11-11, when the owner asked what was left undone · `app/src/ui/weather.ts`
(R-NFR-9) · **Status:** fixed 2026-11-11, on the site since 15:30

The charts of the Daugava's inflow and of Lithuania's run-of-river inflow carry a note from the export (`presets.json`
`climate_years`, one per cascade since E-080). The page printed it without the dictionary, so in the Estonian view both
captions ended in an English sentence, against R-NFR-9 (revision 2.22: every view in Estonian). The fix of 2 November
stayed on its branch: the design branch went into main the next day (f82498d) with its own E-178, and the site's
Estonian view still shows the two notes in English.

**Fix:** the branch's change, ported to main. The page passes the notes through the dictionary, `et.ts` holds the two
notes' Estonian keyed by the export's English, and the export stays in English, as R-NFR-9 keeps the data: nothing is
rebuilt. The dictionary's test reads the export's notes as it reads the classes' names, so a note changed in the export
fails `make ci` until it has its Estonian. The branch's number is not reused. Before a session's branch is cleared,
`git cherry main <branch>` lists the commits it holds that main does not.

**Effect:** words only; no figure. The English view is unchanged.

## E-194 — The methodology's EstLink paragraph quotes the figures of D-164, not those of D-171 in force

**Found:** 2026-11-11, while the freeze's validation output was read against the documents · `docs/methodology.md`
§7.4 · **Status:** fixed 2026-11-11, on the site since 16:03

§7.4 gives the model's EE–FI weekly spreads around February 2025 as 72, 83, 66, 103 and 94 €/MWh and the annual
spreads as 36.1 (2025) and 38.3 (2024). Those are the figures of `data/derived/validation/estlink2.json` as D-164 left
it (237ca17: week 7 102.5, 36.14 and 38.28). D-171 (e0d1e8e, 2026-10-23) computed the file again — week 7 99.0, the
annual spreads 35.83 and 37.96 — and the paragraph was not read again. The Calibration page reads the file and shows
the right figures; only the methodology's text is behind. The paragraph's other figures were not checked.

**Effect:** words in one document; no figure of the model or the page. **Fix:** the paragraph read again against the
file in force.

*Fixed* 2026-11-11, at the owner's word ("Yes, fix it"): every figure of §7.4 read against the file of D-171 to its
third decimal. The table and the opening paragraph's history were right; the prose under the table was D-164's in six
places and is now D-171's, D-164's kept in parentheses as the paragraph keeps every earlier register's:

- the 2024 effect 19.1 €/MWh (19.2), +6 % against Elering's ≈ 18 (+7 %);
- by month Apr–Jun 5.0–21.1 (5.1–21.1) and July 32.6 (32.7);
- the outage hours' Baltic price 4.2 €/MWh below the record, 78.9 against 83.0 (3.8, 79.2);
- the weekly spreads of 2025 72, 83, 66, 99 and 94 (week 7 103);
- the annual spreads 35.8 for 2025 and 38.0 for 2024 (36.1, 38.3).

The FI→EE share in the outage rises by 22 points, from 49.2 to 71.6 %, where the text said 23. E-145 had corrected the
same 23 to 22 on 2026-10-11 (315c20a); D-166's edit of the paragraph (c43e879, 2026-10-22) counted the rounded 49 and 72
and brought 23 back. Two of the table's per cents sit on a half, 2024's observed congestion over the year (0.645, shown
64) and 2025's loading (0.785, shown 79), and are left as they were.

*Deployed* 2026-11-11 15:53–16:03 at the owner's word ("Yes, deploy it"): main 88864e5, the rollback copy
`data/raw-aside/live-5d82ac173646/` (.htaccess left out), the gate green, the sets 223 years in 453 s on a busy machine
(54 files, 18.20 MB), the deployed manifest equal to the build's, the live check all equal (bundle index-CakJZ4CI.js,
opening 88864e5fbc1f under the engine id 1de529a3a34f, 401 without the cookie), compare_sets 53 sets, none differing,
the offline copy refreshed, the key's copy deleted. The live Documentation view in Chromium and WebKit holds §7.4 as
corrected, and the pages of the deploy before read as they did.

## E-195 — Fingrid ended its day-ahead EstLink capacities; their October zeros reached the database

**Found:** 2026-11-11, by `make ci` after the freeze's export (`test_a31_estlink_capacity_agrees_with_fingrids`: in
2026 A31 and Fingrid's capacity 740 hours apart, all but 18 of them in October) · `pipeline/sources/fingrid.py`,
`db/build.py` `load_tso_series`, `export/years.py` (R-DATA-11, R-LINK-2) · **Status:** fixed 2026-11-11, on the site
since 15:30

Fingrid's datasets 112 and 115, the official day-ahead capacity EE→FI and FI→EE, have been "inactive" in its catalogue
since 5 October 2026: "This time series will not be updated after 29.9.2026". For October they serve 95 hours of 0 MW
on three stretches of days, which is not a capacity: A31 gives 1 016 MW in the same hours, and the EstLink flow
(Fingrid 55) runs on. The history fetched them, the database held the zeros, and the validation export carried them
over the month, so the 2026 cross-check read 0 MW from 1 October 22:00 UTC. The engine's input did not take them —
R-DATA-11 fills an hour A31 misses with Fingrid's capacity, and A31 missed no hour of EE-FI in 2026 — but an hour A31
had missed in October would have closed EstLink at 0 MW.

**Fix:** the series end where Fingrid ended them. The parser keeps no row from 30 September 2026 on, the history asks
for no later month, the database's loader deletes a file's rows before it loads it again (as ENTSO-E's loaders do,
E-083), and the validation's cross-check stops at Fingrid's last hour of the year (29 September 21:00 UTC). From
October 2026 an hour A31 misses on EE-FI takes the same hour of the nearest week with data, as on every other border;
Fingrid's catalogue names no successor. The test compares A31 with Fingrid over the hours Fingrid published, and a
test of the parser holds the end.

**Effect:** no figure of the model; the 2026 validation file's cross-check ends on 29 September.

*Deployed* 2026-11-11 15:26–15:30 at the owner's word ("Yes, deploy it"), ERRATA E-193 and E-195 with October's data
(PLAN §9's freeze): main 5d82ac1, the rollback copy `data/raw-aside/live-e28f2193cad5/` (.htaccess left out), the gate
green (pytest 153, the application's 237, the five golden cases unchanged in V8 and JavaScriptCore, `db.check --fast`),
the sets 223 years in 115 s (54 files, 18.20 MB), the deployed manifest equal to the build's, the live check all equal
(rsync -c with nothing left to send, the way in's token set, 401 without the cookie, eight files with the build's
sha256: bundle index-BVEoI2ac.js, worker engine.worker-DkZdr23u.js, opening 5d82ac173646 under the engine id
1de529a3a34f), compare_sets 53 sets, none differing, the offline copy refreshed, the key's copy deleted. The live pages
in Chromium and WebKit through the cookie: the Weather page's two hydro notes in Estonian, the Calibration page's 2026
row EE 15.8 €/MWh, the Statistics page to October 2026, the deck's accuracy slide "2026 1. jaanuar – 31. oktoober 15,8
12,5 11,8"; no page error in Chromium, and in WebKit only the fetches a navigation cancels, which it reports as "due to
access control checks".

## E-196 — The icons' licence was not served on the site: the host keeps /icons/ for its own

**Found:** 2026-11-12, by the deploy's new check of every built file as the site serves it (`validate.deployed`), on
its first run against the live site · D-060, D-125 · `app/public/icons/ISC-lucide.txt` (R-PUB-1) · **Status:** fixed
2026-11-12, on the site since 09:56

Lucide's paths, which the panel's glyphs draw, are under the ISC licence, and since D-060 the site carries its text as
`icons/ISC-lucide.txt`. Since v5 moved to the domain's root on 2026-10-17 (D-125) the address `/icons/` is not the
site's: the host's Apache maps it to a directory of its own, as Apache's stock configuration does (`/icons/blank.gif`
and `/icons/README` are served from it), so `/icons/ISC-lucide.txt` answers 404 though the file is on the server as
built. Under `/v5/` before then the mapping did not reach it. Each of the build's other 141 files is served as built.

**Effect:** no figure. From 2026-10-17 the licence's text was on the server but could not be read on the site; the
footer and the source register name Lucide and its licence as before (D-060).

**Fix:** the file moves to the build's root, `app/public/ISC-lucide.txt`, served at `/ISC-lucide.txt`, an address the
host does not map elsewhere: before the deploy it answers with the host's page for a file that is not there. The
deploy's check of every file holds it there.

*Deployed* 2026-11-12 09:52–09:58 at the owner's word ("Yes, deploy it"), the first deploy with its own checks (main
919eb3b): the gate green (pytest 154, the application's 237, the golden fixture's five cases unchanged in V8 and
JavaScriptCore, `db.check --fast`), the sets 223 years in 118 s under the engine id 1de529a3a34f, the site as it stood
kept in `data/raw-aside/live-88864e5fbc1f/`, compare_sets 53 sets with none differing, the deployed manifest equal and
all 142 files of the build served as built, `/ISC-lucide.txt` among them, 401 without the password or the cookie, the
offline copy made; then `make live-check`, every check of the pages passed in Chromium and WebKit.

## E-197 — The deck's map left out Harmony Link

**Found:** 2026-11-12, by a look at the deployed deck after D-240's deploy: the second slide's map drew six lines in
Chromium and WebKit where the panel's draws seven in service · D-240 · `app/src/main.ts`, `app/src/ui/panel.ts`
`lineKeys` (R-APP-16) · **Status:** fixed 2026-11-12, on the site since 11:20

The second slide's map is the panel's (`linesSvg`), given the lines to draw. It was given those a replay's panel lists,
the lines that stood in the observed years (`existingLines`), where a scenario's panel lists every line, the planned
ones among them, each drawn as the scenario has it. Harmony Link, planned and in service in 2035, was left out; EstLink
3 and the fourth Estonia–Latvia line, planned and not in service then, were left out as D-240 wants. The deck's test
switched a line off and found it gone, but asked for no planned line.

**Effect:** no figure; from 10:35 the deck on the site showed the Lithuania–Poland border with LitPol alone.

**Fix:** `lineKeys` gives a scenario's lines or a replay's, and the deck asks for the state's kind, as the panel's two
boxes do (the scenario box's own sorting folded into it). The test asks for Harmony Link on the slide's map and for no
EstLink 3.

*Deployed* 2026-11-12 11:17–11:22 at the owner's word ("Yes, deploy it"): main bb2bde4, the rollback copy
`data/raw-aside/live-68f6fd41eff1/`, the gate green (pytest 154, the application's 236, the golden fixture unchanged),
the sets 223 years in 111 s under the engine id 1de529a3a34f, compare_sets 53 sets with none differing, all 142 files
served as built, 401 without the password or the cookie, the offline copy made, `make live-check` passed in Chromium
and WebKit; the second slide's map on the site draws the seven lines in service, Harmony Link among them, in both.

## E-198 — The neighbours' slides overstated three things, and the closing note said the reverse in Estonian

**Found:** 2026-11-24, by an independent check of the sixteen slides against their cached documents (the night's
report, `docs/research/2026-11-24_night_report.md`) · D-268, D-279, D-222 · `app/src/ui/deck.ts`, `app/src/ui/et.ts`
(R-APP-16) · **Status:** fixed 2026-11-24

- Sweden's slide counted Brookfield's Strängnäs as an investment decision (D-279). Its release announces «up to SEK 95
  billion» and says Brookfield «will sign» a land allocation agreement: an announcement, not a decision. Sweden's
  «decided» was 1 350 MW; it is the 600 MW of Borlänge alone, planning 2 200.
- Borlänge's 600 MW («potentially scaling to 600MW») and Skellefteå's 1 GW («up to 1 GW … subject to regulatory
  approvals») stood as final capacities like the others; they are ceilings.
- Finland's «507 MW» link put the deck's own words («— half of the plant's two reactors») inside Fortum's quotation
  marks (D-268).
- The closing slide's Estonian note read «Huvid hoiavad arvudest eemal kaks asja» — «the interests keep two things
  away from the figures», the reverse of the English (D-222).
- The Data Center Dynamics document's registered title read «deal to lease» and «€1.2bn»; the page's own title is
  «$1.2bn deal to build».

**Effect:** no figure of the model; Sweden's sums by stage and the wording of four slides.

**Fix:** Strängnäs is planning; the two ceilings show «up to / kuni» before their megawatts (`NbProject.upTo`); the
507 MW tip ends where Fortum's words end; the note reads «Kaks asja hoiavad huvid arvudest eemal»; the document's title
is the page's. The deck's tests ask for each.

## E-199 — From 7 October 2026 the balancing reservation on the Baltic AC borders was counted twice

**Found:** 2026-11-24, by a diagnostic of Estonia's 2026 bias (`spikes/ee-bias-2026/run.ts`, the night's report): in
452 of October's 744 hours the market scheduled more from Estonia to Latvia than the replay let the link carry, by 236
MW on average · R-LINK-5 · `export/years.py` `_reserved` · **Status:** fixed 2026-11-24

From 7 October 2026 22:00 UTC the Baltic Transparency Dashboard's report `allocated_cb_capacity` carries a third
product, «FRR», beside aFRR and mFRR on both borders and in both directions; it is the two together (hour by hour a
correlation of 0.93–1.00 with their sum, the mean difference 0–13 MW). The export summed every product of an hour, so
from then on the capacity withheld for balancing was about twice what it is: EE→LV kept 900 − 539 MW where it had
900 − 281.

**Effect:** the replay of 2026 alone; the scenarios take the average of 2025 (`reserve_2025`), before the product
existed. Estonia's 2026 MAE 15.8 €/MWh and bias −9.3 (October −29.3) where they are 14.9 and −6.6 (October −2.9);
Latvia 12.5 → 11.5, Lithuania 11.8 → 10.7. The Calibration view, the deck's fourth slide and the replays of 2026 on
the site showed the former.

**Fix:** an hour's reservation is aFRR + mFRR; «FRR» counts only in an hour with neither. Validation of 2026 run again.

## E-200 — A link on a slide also paged the deck

**Found:** 2026-11-24, by the owner: "if I click on the link on the slide on the name of the data centre project then at the same time the slide switches and the link is followed" · D-221, D-270, D-278 · `app/src/main.ts`, the deck's click
handler (R-APP-16) · **Status:** fixed 2026-11-24

A click on the slide pages the deck (its left third back, the rest forward, D-221). The links of the neighbours'
slides (D-270, D-276, D-278) sit on the slide, so a click on one opened its document and paged the deck at once.

**Effect:** no figure; the slide shown moved under the reader's click.

**Fix:** a click on a link on the slide opens its document in a window of its own (the owner: "a click on the link must open a new window") and leaves the slide where it is; a click elsewhere on the slide pages as before.
Checked in the browser: the link's click opens one window with its address and the slide stays; a click on the slide's
right part pages forward.


## E-201 — One dropped request for the build's index left the page computing what the build holds

**Found:** 2026-11-25, the night's `make browser-check` failing in Chromium one run in two or three, on main as on the
branch · D-129, D-232, D-238 · `app/src/main.ts` (`fromSite`), `spikes/page-speed/browser_check.py` (R-ENG-7) ·
**Status:** fixed 2026-11-25

The page fetches the index of the sets the build computed (`sets.json.gz`) once, when first needed, and keeps the
answer for its life. A request that failed — the check's local server, with Python's default backlog of five, reset
connections when Chromium sent a burst of them — was kept as «no index», so every later state the build holds was
computed in the browser instead («one year in 0.4 s» where «when the site was built» was due). The check's two
failures («a validation year the site holds comes without a run», then the store's count) were this, not a race in
the check.

**Effect:** no figure; a page that lost that one request computed for the rest of its life what the build had ready,
slower and on the reader's machine. The live site's server queues far more than five, so the check found it before
a reader did.

**Fix:** an index that did not come is asked for again next time (a build of other sources, the other cause of «no
index», costs one small request per ask). The check's server queues 128 connections. Checked: four runs in both
engines pass; with the old backlog of five, four Chromium runs pass, one of them after the index's request was reset.

## E-202 — A page went on telling Google its views after the reader withdrew consent

**Found:** 2026-11-26, the owner's check of the visit statistics on the live site · D-338 · `app/src/ui/consent.ts`
(R-NFR-1) · **Status:** fixed 2026-11-26

**What:** a reader who had agreed and then chose «decline» through the Documentation view's link had Google's cookies
removed and consent mode set to denied — but the script was loaded, and consent mode with consent denied still sends
"cookieless pings". Each view shown afterwards sent its page view (`gcs=G100`) until the page was reloaded; from the
next load on, nothing was sent, as decided. Agreeing again on the same page did not restore consent either: the script
being loaded, the choice changed nothing, and the views went as pings.

**Effect:** against D-338's word that without consent nothing is sent: between a withdrawal and the next reload the
page's views reached Google without a cookie or a client id. A reader who declined at the banner's first showing was
never affected — the script is not loaded then. No figure.

**Fix:** the choice is put into force in one place (`apply`): Google's own switch `ga-disable-<id>` follows it, so
gtag sends nothing while consent is withdrawn; the page queues no page view then; agreeing again updates consent and
resumes. A test holds the three steps. Checked in the browser: after «decline» two views and a scroll send nothing;
after «agree» the next view goes with `gcs=G101`. A page view queued while consent stood may still leave a moment
after the withdrawal.

## E-203 — The deck's note still said a change of the settings computes its figures again

**Found:** 2026-11-27, the check of the deck's figures after D-343 and D-344, at the owner's word · D-340 ·
`app/src/ui/deck.ts` (R-APP-16) · **Status:** fixed 2026-11-27

**What:** the line above the slides read "Every figure is the model's, computed for the settings shown; a change
computes them again" — true while the deck followed the state shown, and left as it was when D-340 pinned the deck to
the opening state on 2026-11-26. Since then a change on the Model view moves no slide, and the line said the opposite.

**Effect:** a sentence of the page, in both languages; a reader who moved a slider and opened the deck was told its
figures were for the settings, when they were the opening's. No figure: every figure of the seventeen slides was
computed again by the engine for the check — the three scenarios with every cable, without EstLink 2 and without both
EstLinks — and each agrees with the live site.

**Fix:** the line reads "Every figure is the model's, computed for its opening scenarios; changes on the Model view do
not move the slides", with its Estonian.

**Deployed:** 2026-11-27 at the owner's word ("Yes, deploy"), main 84be7aa: the rollback copy
`data/raw-aside/live-f4571dceae46/`; the opening view and the presentation's 42 sets none differing; 132 files as
built, all four headers sent; `make live-check` passed in Chromium and WebKit. On the live site the note reads as
fixed in both languages, the slides' figures as before.

