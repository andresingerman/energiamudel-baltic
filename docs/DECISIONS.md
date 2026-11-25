# Decisions

Append-only (SPECIFICATION.md R-DOC-2). One record per decision: date, status, context,
decision, consequences, sources. A superseded record is marked, never edited. At most one page
each. The seventeen decisions of the grilling session are in SPECIFICATION.md §4 (D1–D17) and
are not repeated here; this log starts with their adoption.

## D-001 — Adopt SPECIFICATION revision 1.0

**Status:** Accepted · 2026-09-24 · owner

**Context:** The grilling session of 2026-09-24 settled the design of v5 (SPECIFICATION.md §4,
D1–D17), with the evidence in `docs/research/2026-09-24_*.md`.

**Decision:** The owner signed SPECIFICATION.md revision 1.0 on 2026-09-24 ("I sign off, we start stage 2") and opened Stage 2 (data).

**Consequences:** Every change from here on traces to a requirement of revision 1.0 or to a
later record in this file.

## D-002 — Data scope of v5 (what is migrated, fetched and imported)

**Status:** Accepted · 2026-09-24 · executor, on SPECIFICATION.md R-DATA-2 and R-DATA-6;
reversible by the owner

**Context:** v4 fetched nine modelled zones, ten boundary zones and 21 borders. v5 computes
three zones and reads three boundary zones as price profiles (D2), so most of v4's cache and
some of the files R-REPO-2 lists serve no v5 requirement.

**Decision:** v5 holds: ENTSO-E prices of EE, LV, LT, FI, SE4, PL; load, generation, capacity
and units of EE, LV, LT, FI; reservoir filling of LV, LT; generation outages and net positions
of EE, LV, LT; flows, offered capacity (A31), transmission outages and scheduled exchanges of
EE-FI, EE-LV, LV-LT, LT-SE4, LT-PL; Fingrid datasets 55, 112, 115; BTD; Open-Meteo for EE, LV,
LT; EEX; the World Bank Pink Sheet; the TYNDP 2024 package; ERAA 2025; the DEA and Statistics
Finland catalogues; JAO Nordic; Nord Pool UMM; the documents of `pipeline/sources/documents.py`.
Not held, although R-REPO-2 lists their fetchers: Energimyndigheten (Swedish wind per zone) and
the ECB EUR/PLN rate (which converted the Polish coal index) — both served fleets v5 does not
model. Also not held: `coal_pscmi.csv`, the `v3_meta` rows of `tech_parameters.csv` (v3's
calibrated bids, "for comparison only", superseded by D8), ENTSO-E A61 (empty on v5's borders),
PSE, Svenska kraftnät and Energinet prices, Fingrid's nuclear, CHP and FI-SE datasets. The
documentary CSVs keep the rows of EE, LV, LT and of the five borders only.

**Consequences:** The v4 cache stays where it is for everything else. Any of these sources
returns with a fetcher, a register entry and a requirement that reads it.

## D-003 — Migrate v4's cache by APFS clone; no full refetch in Stage 2

**Status:** Accepted · 2026-09-24 · executor

**Context:** The disk holds 11 GB free of 460 GB. A plain copy of the 5.6 GB v5 subset, or a
full refetch of 5 GB from the publishers for an "empty clone" test, could fill it.

**Decision:** `make migrate-v4` clones each lineage-bearing file (`cp -c`, copy-on-write: a
1.36 GB file took 16 KB), copies its lineage record unchanged and accepts the file only if the
SHA-256 of the copy equals the record's. The empty-clone proof of §14 is run on a scoped slice
(one month of every monthly source, the small archives) instead of the full history.

**Consequences:** 4 393 files, 5.63 GB, 0 mismatches, 0 files without a record
(`docs/research/2026-09-24_v4_migration.md`). A full refetch remains possible with `make
history` on a disk with ~8 GB free.

## D-004 — New sources: which endpoints and why

**Status:** Accepted · 2026-09-24 · executor, on SPECIFICATION.md Appendix A.2

**Decision:** JAO Nordic: `maxNetPos`, `maxExchanges`, `referenceNetPosition`, month by month
from two-day windows (the API refuses more), fields of the hubs FI, FI_EL, SE4, SE4_NB, SE4_SP
and the exchanges touching EE, LT, PL. The flow-based domain (`finalComputation`,
`fbDomainShadowPrice`) answers HTTP 500 and v5 models no Nordic grid: not fetched. Nord Pool
UMM: all current transmission messages for EE, LV, LT, as a monthly snapshot. ENTSO-E A25/B09
net positions of the core zones and A09 scheduled exchanges of the five borders. BTD procured
reserves and allocated capacity through the last complete month (v4 stopped at 2025).

**Consequences:** `make smoke` proves all twelve checks against the live services
(2026-09-24).

## D-005 — PECD versus observed capacity factors: overlap years 2015-2019

**Status:** Accepted · 2026-09-24 · executor; fixes ERRATA E-002

**Context:** R-TIME-5 asks for the ratio of observed to PECD capacity factors "for the same
calendar years 2020-2025"; PECD 3.1 in TYNDP 2024 ends in 2019.

**Decision:** Fetch ENTSO-E A75 and A68 of EE, LV, LT for 2015-2019 and compare those years;
compare 2020-2025 against the PECD climatology (1982-2019) as a second, distributional check.

**Consequences:** About 200 extra requests. The result goes to `docs/methodology.md`; whether a
correction is applied stays OPEN-2 (end of M3).

## D-006 — How the documentary rows are verified

**Status:** Accepted · 2026-09-24 · executor, on SPECIFICATION.md R-DATA-7 and §14

**Context:** §14 asks that the documentary CSVs be "re-verified page by page". Their rows are of
two kinds: extracted from a fetched archive or API file (a `lineage_id` names the file), or read
by a person off a document page (document, edition, page).

**Decision:** One record per row in `data/documentary/verification.csv`: the value in the CSV,
the value read, the page cited and the page found, a verdict, the evidence and the method.

- **code** — rows extracted from ERAA 2025, TYNDP 2024, the technology catalogues or an ENTSO-E
  file are re-extracted by `validate/documentary_eraa.py`, `validate/documentary_tyndp.py` and
  `validate/documentary.py` on every run (`.venv/bin/python -m validate.documentary`); their
  records are rewritten each time.
- **page** — rows read off a page were re-read on the cached edition by a second reader, an AI
  assistant (Claude), page by page. Rows added in Stage 2 (`parameters.csv`) were extracted by one
  reader and confirmed by another pass: a script found the printed value on the cited page of
  the cached file, and where the text layer cannot be read (the tables and charts of the ENTSO-E
  HVDC statistics) a separate reader re-read the page images.

Verdicts: `ok`; `corrected` (the CSV was changed to agree with the document; the evidence names
the change). Anything else fails `make check`, as does a row without a record or a row whose
value changed after it was verified.

**Consequences:** On 2026-09-24, 1 617 records: 950 rows re-extracted by code, all `ok`; 667
rows read on the page, 595 `ok` and 72 `corrected`. All 72 corrections are citations (a page,
section or date). Values the checks found wrong were fixed in the CSVs before these records were
made (ERRATA E-006, E-009, E-014, E-018); wrong labels and provenance likewise (E-007, E-008,
E-010, E-011). The owner or an outside expert can re-read any row on the cached file; such a
reading is recorded with its own method line ("page: read by <name>").

## D-007 — TYNDP boundary prices in the database; the choice of OPEN-8 goes to the owner

**Status:** Proposed · 2026-09-24 · executor; decision is the owner's (ERRATA E-003). Option 1
accepted by the owner on 2026-09-25 (D-011)

**Context:** R-BND-5 takes the 2035 boundary price profiles of FI, SE4 and PL (and TYNDP's own
Baltic prices, for comparison) from the TYNDP 2024 market model, weather-coherent with the three
Baltic climate years of D3. `tyndp_price` now holds all published outputs for the six zones:
National Trends 2030 and 2040 (climate year 2009 only), Distributed Energy and Global Ambition
2035, 2040 and 2050 (climate years 1995, 2008, 2009); 8 736 hours each.

Mean prices (€/MWh), climate year 2009:

| Scenario | EE | FI | SE4 | PL |
|---|---|---|---|---|
| National Trends 2030 | 52.4 | 41.2 | 45.0 | 78.1 |
| National Trends 2040 | 94.9 | 119.3 | 113.3 | 205.5 |
| Distributed Energy 2035 | 54.2 | 44.9 | 51.1 | 62.2 |
| Global Ambition 2035 | 49.3 | 40.0 | 42.4 | 54.9 |
| Observed 2025 (ENTSO-E A44) | 80.4 | 40.5 | 60.4 | 104.3 |

National Trends 2040 has 226 (EE) to 458 (PL) hours at or above 500 €/MWh and up to 149 hours at
TYNDP's 3 000 €/MWh cap; its medians are ordinary (33-93 €/MWh). No other scenario reaches
500 €/MWh.

**Options:**

1. **Distributed Energy 2035 for all three climate years (recommended), Global Ambition 2035 as
   the sensitivity.** Weather-coherent with D3; 2035 is a published target year, so nothing is
   interpolated.
2. **National Trends, 2035 blended from 2030 and 2040 (v4's way).** Only climate year 2009
   exists, so 1995 and 2008 would run on 2009 prices (breaks D3), and the blend carries the
   scarcity hours of 2040 into 2035.
3. **National Trends 2030 for the near years, option 1 for 2035.** Two sources in one series of
   runs; only if the owner wants the Member States' own plans in the near years.

**Consequences:** Whatever the owner chooses, the profiles are already in `tyndp_price` with
their lineage; the choice is one parameter of the boundary module (M2).

## D-008 — ENTSO-E unit master data (A95) for the oil-shale classes

**Status:** Accepted · 2026-09-24 · executor, on SPECIFICATION.md R-SUP-4 and R-DATA-1

**Context:** R-SUP-4 splits Estonian oil shale into classes by boiler technology. The size of
the circulating-fluidised-bed class came from Wikipedia (ERRATA E-014). ENTSO-E A71 gives
plants, not units.

**Decision:** Fetch ENTSO-E's production and generation units (documentType A95, businessType
B11) for EE on 1 January of every year from 2020 (`pipeline/sources/entsoe.py`,
`parse_generating_units`). It enters no table; `tech_parameters.csv` reads the class size from
it and `validate/documentary.py` re-reads it on every run. Which units are fluidised-bed is
Eesti Energia's statement of 2004 (cached document `eesti_energia_balti11_cfb`).

**Consequences:** Seven requests. `make smoke` checks A95. The seven registered oil-shale units
(Auvere 270; Balti TG11 192; Eesti TG3, TG4 164 each, TG5, TG6 173 each, TG8 194 MW) are the
same in every year 2020-2026.

## D-009 — Adopt SPECIFICATION revision 1.1

**Status:** Accepted · 2026-09-24 · owner

**Context:** Stage 2 found errors and gaps in revision 1.0 (ERRATA E-001 to E-003, E-010,
E-012 to E-017, E-019 to E-022). The owner agreed on 2026-09-24 to correct them before Stage 3
("agreed on: Revision of the specification 1.1 … and the other findings that are important").

**Decision:** SPECIFICATION.md revision 1.1 (§0 lists the changes). The decisions D1–D17 stand;
their stated facts are corrected (D6 unit size, D7 LitPol source, D8 curve access, D17 price
cap). Two defaults change because the old ones were infeasible or unsourced: OPEN-8 (Distributed
Energy 2035, because National Trends exists for one climate year only) and OPEN-10 (no Nord Pool
curve history until access is bought or granted).

**Consequences:** Stage 3 plans against revision 1.1. OPEN-1, OPEN-8 and OPEN-10 wait for the
owner; each has a working default.

## D-010 — Two scenario families: TYNDP 2024 and TYNDP 2026

**Status:** Accepted · 2026-09-24 · owner ("We accept two families of scenarios, download TYNDP 2026")

**Context:** D3 sets scenario years on the TYNDP 2024 climate years 1995, 2008 and 2009, where
only Distributed Energy and Global Ambition are published for all three; National Trends exists
for 2009 alone (ERRATA E-003, D-007). TYNDP 2026 (June–July 2026) publishes its central scenario
National Trends+ (NT+) for 2030, 2035, 2040 and 2050, each on three weather scenarios with
probability weights: modelled years of CMIP6 SSP2-4.5 projections in PECD 4.2, chosen by
k-means from 30 candidates per target year (Methodology Report, Annex III, Tables 33 and 36).

**Decision:** Scenario years run in one of two families, each weather-coherent inside itself:

1. **TYNDP 2024:** boundary prices from Distributed Energy or Global Ambition (National Trends
   2030/2040 on climate year 2009 as a labelled single-year option); Baltic weather, demand
   shape and hydro from PECD 3.1 and the TYNDP 2024 profiles of 1995, 2008, 2009; weights
   0.233 / 0.367 / 0.400.
2. **TYNDP 2026:** boundary prices from NT+; Baltic weather, demand shape and hydro from the
   TYNDP 2026 inputs of the same weather scenarios (2035: WS032, WS037, WS059); weights from
   Table 36 (2035: 0.24, 0.43, 0.33).

A run never mixes the families. Only NT+ is fetched from TYNDP 2026, not its economic variants.

**Consequences:** About 3.5 GB of new raw data (`pipeline/sources/tyndp2026.py`) and tables for
the second family; SPECIFICATION revision 1.2 (D3, R-TIME-2 … R-TIME-4, R-BND-5, OPEN-8).
The 2026 weather scenarios are not historical years and are labelled by code, climate model
and year. The TYNDP 2026 scenarios report was still a draft when fetched; lineage fixes the
date.

## D-011 — Adopt SPECIFICATION revision 1.3: OPEN-1, OPEN-8, OPEN-10 and the research proposals

**Status:** Accepted · 2026-09-25 · owner ("I agree with all the recommendations, enter them into the specification rev 1.3")

**Context:** On 2026-09-25 the executor listed what Stage 2 left open, with a recommendation for
each item, and the research of 2026-09-24 proposed changes to the presets
(`docs/research/2026-09-24_demand_and_buildout_realism.md` §5): demand has been flat for five
years in all six countries, onshore wind in Estonia and offshore wind outside Poland are well
behind the scenarios, and no Baltic electrolyser project with an investment decision was found. The owner
accepted all the recommendations.

**Decision:**

1. OPEN-1: an SMR unit offers 300 MW to the market, GE Vernova's net output to grid; the gross
   ~315 MWe is shown beside it.
2. OPEN-8: D-007's option 1 stands. The application opens on TYNDP 2024 Distributed Energy 2035
   on 1995/2008/2009; Global Ambition 2035 is the sensitivity and TYNDP 2026 National Trends+ the
   second family.
3. OPEN-10: the owner asks Nord Pool for research terms through its inquiry form; the paid curve
   API (Baltic cluster and Finland, €430 per year each) is bought only if they are refused.
4. Every fleet preset gets a delivery variant: onshore wind capped by WindEurope's 2030 path and
   the build rate of 2021–2025, offshore wind only from awarded projects, batteries capped by the
   installed and contracted fleet (R-SUP-9).
5. Electrolysis is off by default in every preset, one switch away; Estonian demand comes from
   Elering's plan 2026–2035 (R-DEM-1, R-DEM-5).
6. Boundary: a documented slow-build level factor of 1.4 for Poland, used only by the
   sensitivities; every profile is shown with the demand it assumes; the Finnish and SE4 National
   Trends+ profiles of 2035–2040 are never presented as a low-price case (R-BND-5, R-BND-8).
7. Every scenario result carries four standard sensitivities: slow build with scenario demand,
   slow build with slow demand, storage above the scenario, gas at the 2026 shock (R-APP-11).

**Consequences:** SPECIFICATION revision 1.3 (§0 lists the sections). The default state of the
application is the official presets without their electrolysis. M1 adds and verifies the rows
the revision needs (Appendix A.5). The sensitivities run in background workers, outside the
interactive path. The delivery variant holds Estonian batteries at 227 MW in every target year,
a lower bound. OPEN-12 stays with the owner. Writing the revision exposed a gap, the exchange
rate for the Pink Sheet's dollar prices (ERRATA E-024); OPEN-13 gives it a default, which the
owner may change.

## D-012 — Adopt the implementation plan (Stage 3)

**Status:** Accepted · 2026-09-25 · owner (plan approved in the session that produced it)

**Context:** §14 makes Stage 3 a plan written by Fable 5.1 with milestones M1–M7, each with its
test, reviewed by the owner. The plan was written against SPECIFICATION revision 1.3 after a
read-only survey of v5's data layer, of v3's engine primitives (`engine.js`, `coupler.js` at
commit `328aa9b`) and of v4's model formulas and calibration record, and was reviewed once
against the requirement index of Appendix C before submission.

**Decision:** `docs/PLAN.md` is the Stage 3 deliverable: a working document subordinate to the
specification (where they disagree, the specification wins) and to `AGENTS.md` on process. By
approving it the owner also confirmed the ten choices its §5 lists, each to be recorded in its
milestone: the owner, as author of v3, releases the ported functions under v5's AGPL-3.0-or-later
(O-1); no reserve headroom before 2025-02-04 beyond the TSO-owned assets (O-2); Kruonis as
closed-loop pumped storage with the observed weekly generation as a cap in calibration years, and
an ERRATA entry on R-ENG-5's "TYNDP inflow" for it (O-3); UTC days for storage caps and DSR hours
(O-4); Global Ambition 2035 as a selectable alternative boundary profile, not a fifth standard
sensitivity (O-5); zero net exchange as the FI slope's reference point (O-6); the 8 736 → 8 760
fill and the labelled family-2026 proxies (O-7); full-scenario share links, one family per
Compare view, the layout additions (O-8); the LP-in-workers fallback after one tuning round if
R-ENG-8 fails (O-9); PEMMDB `MIN_TURB` as the Daugava minimum flow and the class map's exclusions
(O-10).

**Consequences:** Stage 4 starts with M1 on Opus 5.5; its first commits record the ERRATA
candidates of the plan's §6. The plan is not edited afterwards except to mark milestones done;
changes of substance go through DECISIONS records. Stage 3 closed on 2026-09-25.

## D-013 — The export: time axes, fills and layout (M1)

**Status:** Accepted · 2026-09-25 · executor, on PLAN §3.1-3.2 and O-4, O-7, O-8 (D-012)

**Context:** The engine reads one file per year (R-DATA-8). The database's tables use different
hour conventions (PLAN §3.1), some observed series have gaps, and the offered transfer capacity
(A31) has publication gaps of days to weeks (LV-LT: 60 days in 2020; EE-FI: December 2020).

**Decision:**
1. Axes: observed years on the UTC calendar year; TYNDP 2024 climate years and TYNDP 2026 weather
   scenarios on the 8 760-hour layout (1 January a Monday, no 29 February). Days and weeks are
   UTC (`hour // 24`, `hour // 168`; the 53rd week is short). A past year is always whole; the
   current year ends at the last hour every core series has reached (2026: 5 832 hours).
2. Fills, each listed in the file's `meta.filled`: gaps of up to 12 hours inside a series are
   linear (the plan said 6; the longest gap in the data is 7 hours, EE load on 2026-08-10); a
   longer gap stops the export. A31 gaps take Fingrid's official EstLink capacity where it
   exists, then the same hour of the nearest week with data (up to 10 weeks). TYNDP 2024's
   8 736-hour prices take the layout's last Monday for their missing day (O-7). A technology
   ENTSO-E reports for less than 90 % of a year's hours is left out and named in `meta.notes`
   (Latvian solar in 2023: 2 hours).
3. What a year file carries: output the engine takes as given (wind, solar, small hydro, waste,
   other); weekly hydro energy (Daugava, Kruonis); reserves from the balancing capacity market's
   first hour, 2025-02-04 23:00 UTC, and 0 before (O-2); monthly gas in euros (ECB rate,
   OPEN-13), EUA; boundary prices; offered capacity. What the model is measured against goes to
   the validation files, which the engine never loads: core prices, all generation, flows,
   exchanges, net positions.
4. Layout: `schema/` (year, presets, links, manifest), `export/`, `data/export/` (committed),
   `app/package.json` with the generated contract types (`npm run contract`, `npm run
   contract:check`); the scenario and results schemas come with the engine (M2). Oil prices are
   not exported: no oil capacity runs in the core zones (EE 52 MW in 2022 only, no A75 output).

**Consequences:** `make export` writes 22 year files and their validation files; `make check`
gains an export gate (lengths, no core price, 3 MB, lineage of every array, byte-identical
rebuild).

## D-014 — The class map and where revision 1.3's numbers live (M1)

**Status:** Accepted · 2026-09-25 · executor, on PLAN §3.3 and §3.9

**Context:** The documentary presets use 48 capacity keys; the engine bids R-SUP-1's classes.
Revision 1.3 added delivery caps, a slow-build factor, loss shares and new demand rows.

**Decision:**
1. `export/classes.py` maps every key to a class and a technology row, or excludes it with the
   reason (TSO reserve assets, Elering's need for controllable capacity, Litgrid's aggregate
   thermal). Oil shale fills Auvere 270 MW, the fluidised-bed units 386 MW, then pulverised
   firing; PEMMDB's "new" oil shale is the fluidised-bed technology, "old" pulverised firing.
   Latvia's run-of-river in the owner's presets is the Daugava cascade.
2. Documentary rows hold what documents print; everything computed from them is computed in the
   export with the lineage of every input. The delivery variant of R-SUP-9 is therefore not a
   `delivery_path` scenario of `scenarios.csv` (as PLAN §4 sketched) but `parameters.csv`
   rows `delivery.*` (WindEurope, IRENA, the battery projects) from which the export derives
   the caps: onshore wind 920 / 1 350 / 4 230 MW in 2030 plus 78 / 11 / 394 MW a year after;
   Lithuanian offshore 630 MW by 2030 (WindEurope) and 700 MW after (the first project, as
   Litgrid's slower scenario counts it); batteries EE 226.5 MW / 453.1 MWh, LT 2 390 MW
   (installed 690 plus the 1 700 MW of the capex scheme, which may overlap and so errs high).
3. HVDC losses (R-BND-4) are each border direction's losses / (transmission + losses) of 2024
   (ERRATA E-028); the AC borders lose nothing in the model.
4. The power-to-heat ceiling (R-DEM-5) is built from DEA's wood-chip heat-only boiler
   (efficiency 1.149, the heat it displaces) and electric boiler (0.99) with the fuel path's
   biomass price, not v4's 1/0.9.
5. Two parameters no source gives are the owner's, cited to the specification and listed in the
   register (R-PROV-2): the mFRR share held by batteries (0.5, OPEN-3) and the storage hours of
   a battery preset that gives no energy (2 h, R-STO-1).
6. The Polish slow-build factor is derived: Svenska kraftnät's lowest 2040 Polish price over the
   weather-weighted NT+ 2040 wholesale mean.

**Consequences:** 41 parameter rows, 4 scenario rows and 2 technology rows added and verified
(45 page records; 953 code records); the export's `presets.json` carries every value with its
lineage ids.

## D-015 — TYNDP 2026 family: the labelled proxies (M1)

**Status:** Accepted · 2026-09-25 · executor, on PLAN O-7 and methodology §3

**Context:** The TYNDP 2026 package has no temperature series for its modelled weather years and
no Estonian solar series (methodology §3).

**Decision:** A weather-scenario file takes, for each zone, the mean 2020-2025 temperature at the
same hour of the year, and for Estonian solar the Latvian solar series of the same weather
scenario; both are listed in `meta.filled` as proxies. The 2030 weather scenarios have no
offshore-wind series in the package; their files carry none (NT+ has no offshore wind in 2030).

**Consequences:** The CHP must-run of a family-2026 run rests on a climatological temperature,
which flattens cold spells; results of the family say so.

## D-016 — v3's clearing and battery functions ported under AGPL-3.0-or-later (M2)

**Status:** Accepted · 2026-09-25 · owner (PLAN O-1, approved with the plan, D-012)

**Context:** R-REPO-2 ports v3's battery dynamic programme and tree-clearing primitives. The v3
repository (`andresingerman/energiamudel`) has no licence file. The git history of the two files
at commit `328aa9b` shows the ported functions written in commits under the owner's name or by
AI assistants working for him; the one commit under another identity changed per-country demand
lines that were not ported.

**Decision:** The owner, as the author of v3, releases `blockMW`, `clearSegment`, `solveHour`
(`app/src/coupler.js`) and `simulateBattery`, `simulateBatteryCapped` (`app/src/engine.js`) under
this repository's AGPL-3.0-or-later. The TypeScript ports (`app/src/engine/clearing.ts`,
`storage.ts`) carry an attribution header naming the commit, file and lines; `PROVENANCE.md`
lists them with the blob hashes.

**Consequences:** No v3 code enters otherwise; v3 is not modified.

## D-017 — Clearing: shortfall and surplus assigned before the flows are read (M2)

**Status:** Accepted · 2026-09-25 · executor, on PLAN §3.4

**Context:** v3's `clearSegment` priced a whole segment at VOLL as soon as it was short at VOLL,
before checking its links, and attributed the shortfall afterwards; its own probe (Estonia 1 900
MW long behind 500 MW links, Latvia and Lithuania 1 500 MW short each) gave 1 100 MW unserved
where 2 500 MW are. PLAN §3.4 reorders the steps (bisection, flows, then the deficit only where
no link is violated), but a segment short at VOLL then reads flows that carry energy nobody
produces: a short zone appears to export (ERRATA E-035).

**Decision:** `clearing.ts` clears a segment in three cases. Short at VOLL: the price is VOLL,
the shortfall is assigned to the zones in proportion to each zone's own deficit at VOLL
(`R-ENG-2`), and the flows are read on what is then served. Long at the floor: the surplus is
spilled where it arises and the flows are read after it. Otherwise: bisection on [floor, VOLL]
to double precision (at most 60 halvings), the upper bracket is the price. In all three cases
the worst link over its limit is fixed at the limit and both halves are cleared again.

**Consequences:** v3's probe gives 2 500 MW unserved with Estonia at the floor
(`app/test/clearing.test.ts`); every zone-hour balances to 1e-6 MW (`engine.test.ts`).

## D-018 — Storage and hydro in the two passes, as built (M2)

**Status:** Accepted · 2026-09-25 · executor, on PLAN §3.4 and O-2, O-3, O-9 (the tuning round)

**Context:** R-ENG-3…5 and PLAN §3.4 define the two passes. The first measurement against the
LP (D-019) showed the plan's Daugava rule leaving two thirds of a week's water unsold and
Kruonis buying energy it could not sell back, full for most of 2024 (47 of 520 GWh scheduled
discharged). O-9 allows one tuning round of the pass-two bids.

**Decision:**
1. *Batteries and Kruonis.* Pass one: v3's programme against p⁰ (`storage.ts`); charge steps are
   matched to discharge steps first in, first out. Pass two, in a scheduled discharge hour: up
   to the planned step, capped by the energy held, at (average price paid for the energy held +
   Δ) / η — the programme's own gate, Δ being a cost per MWh charged (ERRATA E-034). In a
   scheduled charge hour: up to the step, capped by the room left, at η × (the price of the
   matched discharge hour with every storage unit discharging at full power) − Δ; that price
   comes from one extra clearing and replaces p⁰ of that hour, which assumed a discharge that
   does not move the price (the tuning round). No third pass.
2. *Kruonis:* 12 hours of storage (10.8 GWh / 900 MW), η 0.74 applied on discharge (666 MW to
   the grid; the observed output exceeds that in 1–2 hours a year), no cycling cost (Δ is the
   batteries' wear, R-PAR-6); a budget of discharge steps per week equal to the observed weekly
   output in observed years, the daily cap of R-PAR-5 in scenario years (O-3).
3. *Daugava:* the water value of `hydro.ts` (two pass-one clearings, at the minimum flow and at
   the turbine limit; λ uses the week's budget on the line between them); pass two offers the
   scheduled release and what earlier hours did not take, to run in full at λ (ERRATA E-033).
4. *Reserves:* none before 2025-02-04 23:00 UTC (O-2); a battery's day-ahead power is its
   capacity less its mean reserve over the run, because the programme needs one power.
5. The programme's bound is the size of its table (hours × states ≤ 2^24), not PLAN's K ≤ 24,
   D ≤ 2K: Kruonis's weekly budget needs up to 168 steps.

**Consequences:** The 2024 replay discharges 286 GWh from Kruonis, none held at the year's
end; the Daugava sells 3.05 of its 3.19 TWh. The gate is still not met (D-019).

## D-019 — The R-ENG-8 gate is not met

**Status:** Decided · 2026-09-25 · the owner chose option (c) (D-021); proposed by the executor
(PLAN O-9, §4 M2 gate)

**Context:** `make gap` (methodology §6) runs the engine and the LP on eight test weeks. After
the tuning round of D-018, one week meets the gate (price within 3 €/MWh in every zone and
storage discharge within ±15 %). Prices fail in four weeks (up to 21 €/MWh in the winter week
of climate year 2009 with ERAA 2035's 3.7 GW of batteries); storage discharge falls 10–69 %
short of the LP's in six. The cause is structural: the programme schedules full-power steps
against a price no storage has moved, while Kruonis (900 MW in a zone of 1.2–2 GW) and the 2035
battery fleets move it; the LP runs them at part load. A spike that schedules each unit against
the prices its own full-power steps would meet (`spikes/storage-impact/`) did not close the
gap (61 €/MWh in the same winter week).

**Options for the owner:** (a) the LP-in-workers path of D4 (exact by construction; measured
on the test weeks in WebAssembly 52–130 ms per week, about 1–1.3 s per year on four workers and
3–4 s for a set of three years, beyond R-ENG-7's 1 s; `highs.wasm` adds 1.2 MB gzipped;
`spikes/wasm-solver/`); (b) a specification revision of R-ENG-3/4 for a price-aware storage
heuristic, with no assurance of meeting the gate; (c) the engine as a live preview and the LP
for the published figures of the same run; (d) a different gate.

**Consequences:** M3 does not start until the owner decides (SPECIFICATION §14).

## D-020 — What the engine's builder assumes, and the M2 toolchain (M2)

**Status:** Accepted · 2026-09-25 · executor

**Context:** `app/src/engine/build.ts` turns a year file, the presets and a scenario into the
problem the engine clears. Some inputs have no direct counterpart in the data.

**Decision:**
1. A scenario run's hourly shapes (PECD capacity factors, National Trends demand, hydro inflow
   and weekly maximum) are the target year's own; else linear between the two nearest target
   years of the same weather year (2035 = the hourly mean of 2030 and 2040). Fuel paths the
   same, by year; biomass from Svenska kraftnät's path where the chosen path has none.
2. Scenario transfer capacity: ERAA 2025's hourly NTC of the target year or the latest year
   before it (2040 and 2050 take 2035). The AC borders' balancing reservation (R-LINK-5) enters
   scenario runs with M5.
3. Observed years take biomass at Svenska kraftnät's 2023 price (23.1 €/MWh thermal) and the
   floor of −500 €/MWh in force before 2026-05-28; batteries of 2026's A68 as reported (the TSO
   assets of R-STO-8 are subtracted with the battery evidence of M3).
4. Thermal availability is installed capacity (no planned or forced outage derating); M3
   decides with the calibration evidence.
5. In scenario runs `other` bids as a gas engine CHP and `other_renewable` as a biomass CHP
   (v4's choice; in observed years both are given output); small hydro outside Lithuania runs
   at Lithuania's weekly run-of-river capacity factor.
6. The scenario reserve need is the midpoint of Elering's published range times each zone's
   2025 share of procurement.
7. The plant's outage window (R-SMR-2) is placed on the Baltic total surplus.
8. Toolchain: Node runs the TypeScript sources by type stripping (Node ≥ 22.18); tests use
   `node:test` (R-NFR-6 allows it) and `tsc --strict` checks the types; PLAN §2's vitest and tsx
   are not needed. The reference LP uses highspy (extra `reference`). The scenario and results
   schemas of D-013 item 4 come when those shapes leave the engine: the share link (M4) and
   the export (M7).

**Consequences:** Each item is listed in methodology §5.1 and reported with the results.

## D-021 — The weekly LP is the engine of record; the two-pass engine is its preview

**Status:** Accepted · 2026-09-25 · owner ("C: at once + exactly", option (c) of D-019); specification
revision 1.4; item 2 superseded by D-026 (revision 1.5)

**Context:** D-019: the two-pass engine does not meet R-ENG-8 (one test week of eight); the weekly
LP in WebAssembly takes 52–130 ms a week, about 1–1.3 s a year and 3–4 s a set of three years on
four workers (`spikes/wasm-solver/`). The owner asked for the problem and the choices in plain
words and chose the option that keeps the interface live and makes the figures exact.

**Decision:**
1. Every published, exported and calibrated figure comes from the weekly LP of R-ENG-8
   (revision 1.4): one linear programme per UTC week of the run, storage empty at each week's
   start and end, solved by HiGHS in WebAssembly (highs-js, version pinned) on up to four Web
   Workers; prices are the duals of the zone-hour balances. It builds the same problem the
   preview clears (`app/src/engine/build.ts`), so the two cannot drift apart in their inputs.
2. The two-pass engine of M2 answers at once and is marked as a preview until the LP's result
   replaces it; its gap to the LP is published without a gate.
3. The gate of R-ENG-8 becomes: on every test week the engine of record reproduces the offline
   reference (`reference/lp.py`, highspy) within 0.1 €/MWh mean absolute price per zone and ±1 %
   storage discharge (OPEN-7 decided).
4. highs-js is the second runtime dependency (R-NFR-6), its WebAssembly module (1.2 MB
   compressed) outside the bundle limit of R-NFR-4; R-ENG-7 sets ≤ 2 s a year and ≤ 6 s a set of
   three years for the engine of record.

**Consequences:** M2 continues with the engine of record (`lp.ts`), its gate against the
reference, its golden fixture and benchmark; M3 calibrates on it; M4 shows the preview and the
result. The four standard sensitivities (R-APP-11) run on it in the background. Built the same
day: the model is passed to HiGHS as arrays, not as LP text, and a week solves in 15–30 ms; the
engine of record reproduces the reference on all eight test weeks (0.000 €/MWh, same storage
discharge) and takes 0.35 s for the 2024 replay, 0.56 s for climate year 2009 with ERAA 2035's
fleet and 1.45 s for a set of three climate years on four workers (`app/scripts/bench.ts`).


## D-022 — What the replays take from the record (M3)

**Status:** Accepted · 2026-09-25 · executor, under the calibration protocol of PLAN §4 M3 (one
change per full-year run of 2023–2025, kept only if the Baltic MAE falls)

**Context:** On M2's provisional parameters the replays missed hourly prices by 26–42 €/MWh
(methodology §5.6). D-020 item 4 left thermal availability to M3; D-018 item 2 gave Kruonis no
cycling cost, D-018 and PLAN O-10 the Daugava PEMMDB's minimum flow. Each step below was run on
the engine of record for all three years (`docs/research/2026-09-25_calibration_m3.md`).

**Decision:**
1. *Thermal availability in observed years* is each technology's weekly maximum A75 output,
   shared among its classes, oil shale newest first (`capAvailability`); R-SUP-6's "week's
   maximum" is read the same way. The observed maxima are net of the reserve the plants held, so
   the headroom of R-SUP-7 is not taken off them again. Year files carry
   `zones.<zone>.thermal_weekly_max_mw`. Supersedes D-020 item 4 for observed years; scenario
   runs keep installed capacity.
2. *The CHP floor of R-SUP-5 covers Estonia's oil-shale classes* as well as gas and biomass CHP:
   Narva's plants supply the town's district heat, and their A75 output has the same
   temperature-driven lower envelope. A reading of R-SUP-5, whose list names gas and biomass.
3. *Kruonis bids its cycle cost,* Δ = 60 €/MWh (R-PAR-6's prior), as v4 did (v4 D-053).
   Supersedes D-018 item 2's "no cycling cost": without it the plant pumped on any spread above
   its losses and flattened the daily price profile.
4. *The Daugava's minimum flow in observed years* is its observed weekly minimum output (A75
   run-of-river, Latvia; `zones.LV.hydro_weekly_min_mw.daugava`); scenario runs keep PEMMDB's
   MIN_TURB (PLAN O-10). The minimum becomes one value per week in the problem, the engine of
   record and the reference LP.
5. *The Daugava stays weekly,* as R-ENG-5 specifies, although the observed daily output as its
   budget lowered the MAE by another 1–3 €/MWh (5 with a daily minimum); D-024 puts it to the
   owner.

**Consequences:** Hourly MAE 25.6–29.1 → 19.1–20.2 €/MWh (2023), 32.9–35.7 → 21.8–24.6 (2024),
38.2–42.1 → 28.6–34.0 (2025, blind) before the markup of D-023 (methodology §7). The engine of
record still reproduces the reference on all eight test weeks (`make gap`).

## D-023 — The fits, and the register frozen on 2023–2024 (M3)

**Status:** Accepted · 2026-09-25 · executor; item 3 decided by the owner in D-025 (OPEN-3)

**Context:** R-VAL-1 allows four fitted parameters: the markup schedule (R-SUP-6), the CHP
temperature fit (R-SUP-5), Δ (R-STO-9) and a PECD correction if adopted. PLAN §3.7 names the
methods; the markup rule does not converge on the engine of record (ERRATA E-039), and the
battery data R-STO-9 relies on begin in March 2026 (ERRATA E-038).

**Decision:**
1. *CHP floor* (`validate/chp_fit.py`, 2023–2024): per zone and technology the 10th percentile
   of hourly A75 output per 1 °C bin, a line on heating degree-hours (a, b ≥ 0), T_ref from
   {8, 10, 12, 15} °C with 90 % of hours at or above the floor — v4's method (`chp_floor.py`).
2. *Utilisation markup* (`app/scripts/fit_markup.ts`, 2023–2024): the four bins of R-SUP-6 as
   shares of each gas offer's weekly maximum, gas classes only (oil shale carries its entry
   premium, R-SUP-4; biomass is heat-driven; retort gas is a by-product); fitted by coordinate
   descent on the non-negative increments, minimising the sum of the three zones' hourly MAE
   over both fit years. Supersedes PLAN §3.7's residual rule. Result: EE 0 / 0 / 0 / 0, LV 0 / 50 /
   130 / 170, LT 0 / 0 / 55 / 75 €/MWh.
3. *Δ is not refitted into use.* `fit_delta.ts` fits it on 2026-03-12 → 2026-08-31 for three mFRR
   shares (0.5: bound at 0, −36.5 %; 0.25: 42 €/MWh; 0: 65.5 €/MWh) and the register records
   them as evidence; the batteries keep the prior of 60 €/MWh until OPEN-3 is decided.
4. *OPEN-2* (PECD correction) and *OPEN-4* (Finnish slope) run on their defaults: no correction,
   5 €/MWh per GW. *OPEN-10:* no access to Nord Pool's curves, so R-SUP-6's cross-check is
   reported as not done.
5. The register (`data/derived/fitted_parameters.json`, `make fit`) is frozen: a change is a new
   fit round of the whole protocol with its own record (R-VAL-1). Each fit writes a derived
   lineage record naming its inputs (`pipeline.chp_floor.*`, `pipeline.markup.2023-2024`,
   `pipeline.battery_delta.EE.2026`; R-PROV-4).

**Consequences:** The 2023 MAE of Estonia and Lithuania rises by 0.05 and 0.13 €/MWh with the
markup while 2024 falls by 0.9–1.3 in every zone; the protocol's rule "no Baltic zone's MAE
rises" gives way to R-SUP-6, which requires the schedule, and the exception is put to the owner
(D-024). Methodology §7.2 is the register with its blind-year residuals.

## D-024 — M3's gates: R-VAL-6 met, R-VAL-5 not met

**Status:** Decided · 2026-09-25 · owner ("I agree with all the recommendations, we start M4"): every
item as recommended; the consequences in D-025 (PLAN §4 M3 gate)

**Context:** `make validate` after the fits of D-023 (methodology §7.3, §7.4).

**Decision (proposed):**
1. *R-VAL-6 is met:* the 2024 effect of EstLink 2's outage on Estonia's mean price is 18.3
   €/MWh (gate 15–30, Elering ≈ 18); FI→EE at its limit 86 % against 68 % without the outage;
   the February 2025 weekly EE–FI spreads 57–96 €/MWh (observed 72–114) and the 2025 annual spread
   45.7 against 39.9; Finland's price is the boundary, so the effect is not symmetric.
2. *R-VAL-5 is not met:* MAE 19.1–20.2 (2023), 20.9–23.3 (2024) and 28.0–32.8 €/MWh (2025)
   against 15; duration-curve RMSE 16.5–37.3 against 10; 14, 18 and 17 breaches. The error sits
   in the tails of the price distribution, which a short-run-cost merit order does not produce
   (methodology §7.3). By §14 the UI milestones continue under the gate-status header; M4
   proceeds unless the owner stops it. What could still move the figures, each a change to the
   specification or the protocol and the owner's to allow: a daily Daugava budget (item 3),
   an observed daily committed minimum and scarcity steps as in v4, a fitted Kruonis bid.
3. *Daugava weekly or daily* (R-ENG-5): the recommendation is to keep weekly — a daily budget is
   observation where the release is behaviour, and the TYNDP 2024 climate years give weekly
   inflows only, so replays and those scenario runs would follow different rules.
4. *OPEN-3:* the recommendation is mFRR share 0 with Δ = 65.5 €/MWh (residual −1.6 %), because it
   leaves the batteries their observed discharge with a Δ near the prior; 0.25 with 42 €/MWh fits
   as well; the default 0.5 cannot be reconciled with the observed discharge. R-STO-9's window is
   ERRATA E-038.
5. *The markup's 2023 exception* (D-023, Consequences) is confirmed or the schedule is refitted
   with the rule as a constraint.
6. *Golden re-baseline (R-VAL-8):* the 2024 replay of both engines moves to the calibrated
   register — MAE 32.9 / 35.7 / 35.5 → 20.9 / 23.3 / 22.7 €/MWh, duration-curve RMSE 39.0 / 48.4 /
   48.3 → 24.0 / 27.9 / 26.9, mean price 80.9 / 77.5 / 77.4 → 91.0 / 88.1 / 88.6 (observed 87.3 /
   87.4 / 87.3), Latvian gas 4.29 → 1.39 TWh (observed 1.60); SHA-256 of the engine of record's
   run 2cf0c4d4… → 46db3e34…, of the preview's 26c26c22… → e60e2017…; the synthetic week is
   unchanged. The fixture is written; the owner signs off or it is reverted.
7. *R-VAL-8's CI step:* `validate_fit --check` exits 1 while the gate is not met, so `make ci` does
   not call it yet; `make validate` runs it. It joins `make ci` when the gate is met or the owner
   rules on item 2. The golden fixture in `make ci` already fails on any movement of the replay.

**Consequences:** Methodology, README and the calibration page carry the gate status. Nothing
with the plant is computed before Stage 5 (R-SMR-8).

## D-025 — The owner's decisions on M3's gates; OPEN-3 decided

**Status:** Accepted · 2026-09-25 · owner ("I agree with all the recommendations, we start M4"), on
D-024's recommendations

**Context:** D-024 put seven items to the owner after `make validate`; the owner accepted every
recommendation.

**Decision:**
1. R-VAL-5 is not met; M4 proceeds, and every page and document carries the gate status (§14).
2. The Daugava keeps its weekly budget (R-ENG-5).
3. *OPEN-3:* the batteries hold no mFRR (share 0); their cycling cost is the fit at that share,
   Δ = 65.5 €/MWh (`fit_delta.ts`, 2026-03-12 → 2026-08-31, residual −1.6 %), for every zone's
   batteries. The register marks the fit adopted (`fitted_parameters.json`, `battery_delta`;
   `make fit` writes it) and the scenario defaults take share and Δ from there
   (`app/src/state/scenario.ts`); the documentary rows `reserve.mfrr_battery_share` (0.5) and
   `battery.cycling_cost_prior_eur_mwh` (60) stay as the specification's default and prior until
   its next revision (ERRATA E-038). Kruonis keeps the prior of 60 €/MWh (D-022 item 3).
4. The markup's 2023 exception (D-023) stands.
5. The golden fixture's re-baseline of the 2024 replay is signed off (R-VAL-8).
6. `validate_fit --check` joins `make ci` when R-VAL-5 is met.

**Consequences:** Batteries exist in the replays only from 2026 (A68), so 2020–2025 and the golden
replay do not move. 2026, January–August: MAE 18.62 / 21.86 / 15.94 €/MWh (was 18.6 / 21.8 /
15.9), duration-curve RMSE 18.0 / 26.7 / 20.0; Estonian battery discharge in the fit window
22 978 MWh against 23 342 observed. Scenario runs hold more battery power in the day-ahead
market: in CY2009's winter test week the engine of record discharges 15 039 MWh from storage
(was 13 834) and still reproduces the reference (`make gap`, 8 of 8).

## D-026 — The application shows the engine of record only (specification revision 1.5)

**Status:** Accepted · 2026-09-25 · owner ("search the internet for data on how to supplement it with information or fix it", then "Remove, only the exact calculation"); specification revision 1.5

**Context:** ERRATA E-040: with M3's observed availability the two-pass preview misses whole years
by 40–50 €/MWh. The owner asked for a search of how to fix or supplement it
(`docs/research/2026-09-25_preview_fix.md`). Two corrections were built and measured: the
Daugava's price response from five pass-one clearings instead of two, and each storage unit
planned in six slices, each against the prices the earlier slices leave. Together they bring the
preview's Estonian annual mean within 0.8–4.1 €/MWh of the engine of record (2024 92.6 against
91.0; climate year 2009 with ERAA 2035's fleet 86.3 against 85.5), but take 0.7–0.8 s a year
against the old 0.2 s — no faster than the engine of record with its weeks on four workers
(0.35 s a year, 1.45 s a set).

**Decision:**
1. The application runs the engine of record only; a progress indication shows while it runs
   and its result replaces the previous one (R-ENG-7, revision 1.5). Supersedes D-021 item 2.
2. The two-pass engine stays in the repository unchanged, as the documented baseline of §5 and
   `make gap`, whose gap to the engine of record is published without a gate; the corrections
   above are not built into it. Deleting it is a later owner's decision.
3. Revision 1.5 also writes the decisions of D-025 into the specification: OPEN-3 decided,
   R-STO-9's window and Δ, R-PAR-6, R-VAL-1 (ERRATA E-038).

**Consequences:** M4's workers run the engine of record; nothing in the interface is computed by
the two-pass engine. R-ENG-7's preview target (≤ 1.0 s) is gone; the engine of record's (≤ 2 s a
year, ≤ 6 s a set) stays.

## D-027 — The opening state and the scenario's text (M4)

**Status:** Accepted · 2026-09-25 · executor, on D-011, PLAN §4 M4 and O-8; the owner sees it at
M4's first look

**Context:** R-BND-5 and D-011 fix the opening family, profile, climate years and Estonian demand
and switch electrolysis off; R-PUB-3 puts the official presets first but does not say which fleet
and which Latvian and Lithuanian demand open. R-APP-10 asks for a share link that carries the full
scenario and is validated on import; PLAN §4 M4 sketches its text; D-013 item 4 moved the scenario
schema to M4.

**Decision:**
1. *Opening state:* ERAA 2025 National Trends 2035 fleets in all three zones — the only official
   preset that covers the three alike and the fleet behind the European boundary prices —; demand
   from Elering's plan 2026–2035 in Estonia (D-011) and from ERAA 2025 in Latvia and Lithuania,
   whose TSOs give several scenarios and no central one; ERAA's DSR bands and fuel path; the
   batteries of D-025; electrolysis off; no plant.
2. *The text:* `v=1`, then sorted `key=value` lines with every default written out; the keys of the
   run kind only (a replay carries its year, the level factors, slope, battery and reserve
   parameters and the multipliers and firm blocks); `schema/scenario.schema.json` holds every key's
   type and range, `presets.json` the preset and class names. The share link is `#s=` and the
   text's UTF-8 in base64url. Import rejects an unknown key, a value out of range, a name the
   presets do not have, a key twice or a missing one, and says which.
3. *Changed from preset* is judged against the chosen preset (class MW, battery energy) and the
   defaults (1 for multipliers and level factors, 0 for firm blocks, electrolysis, power-to-heat and
   the slope; the fitted battery values): amber in the panel, `*` in the text, and listed with the
   result (R-BND-5, R-DEM-3, R-DEM-4, R-UI-6).

**Consequences:** A link written today opens the same scenario after any later export as long as
its presets and classes still exist; a later key set is a new version (`v=2`) with a reader for
`v=1`. The owner may change the opening presets; they are one place (`opening`,
`app/src/state/model.ts`).

## D-028 — The engine of record in the browser: workers and priorities (M4)

**Status:** Accepted · 2026-09-25 · executor, on R-ENG-7, R-NFR-2 and PLAN §3.6; revision 1.5

**Context:** Revision 1.5 runs the engine of record alone (D-026). PLAN §3.6 foresaw the headline
set on three workers, the sensitivities below it, a control change cancelling what is below the
headline, a debounce of about 70 ms and a progress indication after 300 ms.

**Decision:**
1. A pool of min(4, cores − 1) module workers, each loading the solver's WebAssembly, the presets,
   the scenario links and the year files it is given once and keeping them. A job is one year of a
   set: the worker builds the problem from the page's state and solves its weeks one after the
   other; the page gets the run's view (`view.ts`), not the hourly dispatch.
2. Priorities: the headline set first, the four sensitivities' sets after it. A change of a
   control starts a new generation: queued jobs of older generations are dropped and the results
   of running ones discarded; a running solve is not interrupted, so its worker keeps its data.
3. Debounce 70 ms; the progress line after 300 ms; the result replaces the previous one when the
   whole set is in.

**Consequences:** A replay year takes 0.8–1.1 s and a set 1.7–2.0 s on the development machine;
sharing a year's weeks among workers (0.35 s a replay year in `app/scripts/bench.ts`) is the next
step if slower machines need it. Nothing is sent anywhere (R-NFR-1).

## D-029 — The owner's first look at the Model view (M4)

**Status:** Accepted · 2026-09-26 · owner (the list of requests of 2026-09-26); executor for how

**Context:** The owner looked at the Model view of D-027/D-028 and asked: why a replay does not
show every source of generation with its price by country; flags on the country switchers; a
slider that sticks at the real value on its way back; the daily generation chart at double width
with a colour per source and its legend on the right in the order of the stack; colours in the
energy mix; the monthly mean and median on separate charts; the cards with the actual values
beside the model's, and flags.

**Decision:**
1. *A replay's fleet:* the worker reports every class a run had — capacity (the observed A68 in a
   replay, the scenario's in a scenario run), the hours' mean of its lowest bid, its generation —
   and a replay's panel shows it per country (`FleetRow`, `fleetHtml`); given output, storage and
   the Daugava's water value are named as such. The replay's fleet stays as observed.
2. *Colours of the generation groups:* the dataviz reference palette's eight hues by meaning — oil
   shale red, nuclear violet, biomass and waste green, wind blue, gas orange, hydro aqua, solar
   yellow, storage magenta, other grey —, each theme its own steps; the stack order, bottom to top
   oil shale, nuclear, biomass and waste, wind, gas, hydro, solar, storage, was chosen by searching
   all orders for those whose neighbouring layers stay apart for colour-blind readers in both
   themes (colour-blind ΔE ≥ 8 and normal-vision ΔE ≥ 15 on the validator's scale). Legends list
   the groups top of the stack first. The energy mix is a stacked bar per zone in the same colours,
   the model beside the actual year.
3. *Flags* (CSS only) on the country switchers, the cards and the charts' zone tabs, marked
   `aria-hidden` beside the written code.
4. *Sliders* stick to their preset — the real value in a replay, the preset's in a scenario run —
   within 2 % of their range.
5. *Cards:* the model's figures beside the actual year's: the replayed year, or in a scenario run
   the last complete year of the export (2025) for reference, labelled; prices and scheduled
   exchanges (A09) from the validation file; CO₂, curtailment, unserved energy and hours at a
   border's limit have no record and show "–". A scenario's price charts still draw no observed
   line (R-APP-2); the 2025 bars in its mix are a labelled reference.
6. The monthly mean and median are two charts; the daily generation chart spans both columns.

**Consequences:** R-UI-4 ("colour encodes state and sign only") no longer describes the charts and
the switchers: technology identity and flags are the owner's choice (ERRATA E-043; the text at the
next revision).

## D-030 — M4 closed after the owner's first look

**Status:** Accepted · 2026-09-29 · owner ("Close M4")

**Context:** D-029 recorded the owner's first list of requests (2026-09-26). More rounds followed on
2026-09-26 and 2026-09-29, each built, checked in the browser and committed with `make ci` green:
the energy mix grouped by country with one legend entry per group; the daily chart's lines over its
areas and its axis in months; the trade balance on the cards, green when positive and red when
negative, and a "?" explaining each row of the Estonian card; the cards folded to the mean price and
the two balances behind one button; MAE and RMSE under the model's column; each month's price over
its point on the monthly charts; the round-trip efficiency in per cent; the year's demand in TWh
under the multiplier and the border zone's mean price under its "Price level factor" (was "Level
factor"); the replay called "Validation" on the page, the scenario text keeping `run=replay`.

**Decision:** M4 is done, with those rounds and with the departures PLAN §4 records for it; the
per-line link switches and outage what-ifs move to M5 as planned.

**Consequences:** Stage 4 continues with M5 (borders, outages, adequacy; OPEN-5). The specification
text of ERRATA E-042 and E-043 waits for the next revision. Open on the owner's side: OPEN-9 and
OPEN-11 before M7, OPEN-10's outcome, and OPEN-12 — the workspace invariant still requires every
`AGENTS.md` to be a pointer without rules, which this project's `AGENTS.md` is not.

## D-031 — Planned lines on ERAA 2025's years (M5)

**Status:** Accepted · 2026-09-29 · owner (the question of 2026-09-29: "ERAA 2025 dates")

**Context:** R-LINK-1 makes EstLink 3, Harmony Link and the fourth EE–LV line switchable with their
commissioning year and source but names no default. ERAA 2025's NTC has EstLink 3 (+700 MW) and the
fourth EE–LV line from target year 2035 and Harmony Link from 2030; their builders date them later:
Elering's security of supply report 2025 puts EstLink 3 in 2038, the fourth EE–LV line in 2036 and
Harmony Link in 2031, and Svenska kraftnät's LMA 2026 has EstLink 3 (+684 MW) from 2038. The choice
moves the opening scenario (TYNDP 2024 DE 2035): with M5's other defaults the Estonian mean price is
44 €/MWh on ERAA's years and 63 on the TSOs' — EstLink 3 alone is worth about 21 €/MWh.

**Decision:** A planned line is in service when ERAA 2025's first target year with it is not after
the run's target year: in 2035 all three are, in 2030 Harmony Link only. The panel shows ERAA's year
and the TSO's beside each line, and each line switches.

**Consequences:** The opening scenario keeps ERAA's grid, as M4 had it. A text written for 2035 with
a line switched off stays so (`line.<id>.on`); changing the target year resets the switches to
ERAA's years, as it resets the fleets.

## D-032 — The borders from their lines, the balancing reservation, the what-ifs (M5; OPEN-5)

**Status:** Accepted · 2026-09-29 · executor, on R-LINK-1, R-LINK-3 … R-LINK-6, R-APP-3 and OPEN-5's
default ("built from ENTSO-E HVDC statistics 2015–2024 as documented"); D-031 for the years

**Context:** M4 ran a scenario year on ERAA 2025's hourly NTC as published (D-020). R-LINK-3 asks
for a nameplate or a typical availability profile per link from the ENTSO-E HVDC statistics, with
LitPol held to Litgrid's plan 2026–2035; R-LINK-5 for the 2025 mean balancing reservation on the AC
borders; R-LINK-4 for a what-if per line in both kinds of run.

**Decision:**
1. *Lines* (`presets.links.lines`, `export/tables.py`): a line per HVDC cable (EstLink 1 350 MW,
   EstLink 2 650, NordBalt 700, LitPol 500 at the statistics' ratings; EstLink 3 700 and Harmony Link
   700 from ERAA's NTC), the AC lines in service as one group per border (their NTC is set jointly),
   the fourth EE–LV line as ERAA's step. A planned line's capacity is ERAA's step: its first target
   year's NTC less the one before, hour by hour.
2. *Scenario year* (`scenarioLines`, `build.ts`): ERAA's NTC of the target year less the planned
   lines it holds is what the lines in service carry — on EE-FI and LT-SE4 shared among the cables
   by rating, on an AC border as one group; each planned line in service adds its step. LT-PL is
   LitPol and Harmony Link at their ratings, held to Litgrid's plan of the year (2035's beyond it)
   unless the choice lifts it; ERAA's LT-PL NTC (150 MW in 2028, 700 from 2030) is not used.
3. *Typical availability* (OPEN-5): per cable, the mean available technical capacity and planned-
   maintenance share of 2019–2024, the years the statistics break unavailability down, without
   EstLink 2's 2024 (a cable failure, which the adequacy tab samples): EstLink 1 97.5 % and 1.9 %,
   EstLink 2 98.1 % and 1.1 %, NordBalt 94.0 % and 1.9 %, LitPol 90.9 % and 4.4 %. The planned share
   is one outage from 1 June, a border's cables one after the other; the rest of the unavailability
   is spread evenly, so the year's mean is the documented availability. A line without history
   (EstLink 3, Harmony Link) is at ERAA's default HVDC forced-outage rate, 6 %, without a planned
   outage. The AC groups have no statistics and keep ERAA's hourly NTC.
4. *Balancing reservation* (R-LINK-5): a scenario year takes off each AC border the 2025 mean
   allocation from the market's first hour, both directions averaged — EE-LV 265 MW, LV-LT 272 — one
   editable value per border.
5. *What-ifs* (R-LINK-4): per line, "at most MW from one day to another", both included, written
   `MW@MM-DD..MM-DD` (`line.<id>.whatif`, 29 February is the 28th on a 365-day axis). In a scenario
   year the held line is capped. In an observed year a line alone on its border and an AC group cap
   the offered capacity; a cable beside another (EstLink 1 and 2) takes what it loses — its share of
   the year's highest offer, by rating, less what it keeps — off the offered capacity: right while
   it was in service, too much in hours it was out already, which the outage labels show.
6. *The text* becomes version 2 (D-027's rule for a new key set): `links.profile`, `links.plan`,
   `links.reserve.<border>`, `line.<id>.on` for a planned line, `line.<id>.whatif` for every line a
   run has. A version-1 text opens with the borders at their defaults.
7. *The border panel* (R-APP-3): per border and direction the mean capacity in use, the hours at the
   limit and the energy sent, with the net flow and the congestion rent of `summarise` (R-BND-7), a
   day-by-day chart, and in a validation run the A78 and UMM events of a day or longer (R-LINK-6).
8. The scripts' runs (`runs.ts`, the gap weeks, the golden fixture) build without a link choice and
   keep ERAA's NTC as given, so the committed gap evidence and the fixture stay what they were.

**Consequences:** The opening scenario's mean prices move from 49.2, 48.3 and 48.2 €/MWh (EE, LV,
LT) to 44.5, 44.8 and 44.9, most of it from LT-PL at Litgrid's 1 200 MW in place of ERAA's 700; at
nameplate they are 43.9, 44.5 and 44.6. Validation runs are unchanged without a what-if.

## D-033 — The adequacy sampler (M5; R-LINK-7, R-APP-8)

**Status:** Accepted · 2026-09-29 · executor, on R-LINK-7, R-APP-8, R-NFR-5 and PLAN §3.4; the default
for the cables' long failures is the owner's (D-034)

**Context:** R-LINK-7 asks for seeded, reproducible sampling of the cables' short trips and long
failures, ERAA's default for a line without history, and the forced outages of generating units,
with distributions of the annual mean price, the hours at the price cap and the unserved energy per
climate year, in a worker and never in the deterministic path. PLAN §3.4 draws every duration from a
quantile table so that the browser computes no logarithm. The scenario fleets are per class; unit
sizes had no row.

**Decision:**
1. *Data.* PEMMDB's National Trends "Thermal" sheets (TYNDP 2024 and 2026, already cached) give per
   fuel and plant type the capacity and the number of units (`thermal_unit`, `db/build.py`); the
   ENTSO-E HVDC statistics 2024, Table 3.2, give the cable lengths (EstLink 1 105 km, EstLink 2 157,
   NordBalt 450; LitPol is a back-to-back station without a cable; four rows of `parameters.csv`,
   verified on the page). `presets.adequacy` carries a 1 024-point table of unit-exponential
   quantiles, each cable's trips, each class's unit size and ERAA's rates.
2. *Cables.* Short trips: the mean disturbance outages a year of 2019–2024 (EstLink 2 without 2024),
   each of the cable's mean disturbance hours per trip, 1 to 36 hours (R-LINK-7's "hours to 1.5
   days"). Long failures, for a cable with a cable: Ofgem/GHD 2016's 0.05 a year per 100 km, or one
   rate for every cable, with a mean repair of 65 days (Ofgem/GHD), 90 (its high) or 106.5 (CIGRE TB
   815's 3.5 months). A line without history (EstLink 3, Harmony Link) is two poles of half the line,
   each at ERAA's default of 6 % and 7 days. A sampled year keeps the typical profile's planned
   maintenance and its unavailability other than disturbances (LitPol's limitations); the sampled
   outages replace the disturbance share, all of it for a line without history.
3. *Units.* The classes PEMMDB counts — oil shale, gas combined cycle, open cycle and steam, nuclear
   — are round(MW / unit size) units: PEMMDB's MW per unit of the zone's types (oil shale 226 MW, gas
   combined cycle 129–133, open cycle 143, steam 52), a zone without the type at the Baltic mean, a
   zone without nuclear units at the plant's own 300 MW (the class is the SMR option). Each unit is up
   and down in turn with ERAA 2025's forced-outage rate and mean repair time (oil shale 7.5 % for
   Auvere, 10 % for the older units, 1 day; gas 5–8 %, 1 day; nuclear 5 %, 7 days). The other
   classes — CHP, biomass, waste, retort gas — run as in the headline, and so does planned plant
   maintenance, which the headline has not either.
4. *Draws.* xoshiro128** seeded by splitmix32 from the seed, the year of the set and the sample's
   number; every gap and duration an index into the quantile table times its mean, rounded to the
   hour; a process enters the year down with its share of time down. The same seed gives the same
   samples in every browser (`app/src/adequacy/`, `app/test/adequacy.test.ts`).
5. *Runs.* The samples run after the headline and its sensitivities (priority 2), carry a tag the
   Cancel drops, and stop when the scenario changes. Per year of the set and zone the tab shows the
   headline beside the samples' mean, P10, P50, P90 and highest mean price, hours at the price cap
   and unserved energy, the share of samples that leave demand unserved, and the sorted mean prices.
   The seed, the count and the long-failure choice are the tab's, not the scenario text's.

**Consequences:** A sample costs one run of the engine of record (1–2 s a year on one thread); 20
samples of the three climate years take about half a minute on four workers. The SMR's outages join
in M6.

## D-034 — The adequacy tab opens on the Baltic record of long cable failures (M5)

**Status:** Accepted · 2026-09-29 · owner (the question of 2026-09-29: "History of the Baltics: 0,17 per year, 107 days")

**Context:** R-LINK-7 lists the long failures of submarine cables without a default: 0.10–0.17 a year
(two EstLink 2 failures in 12 years of service), Ofgem/GHD 2016's 0.048 per 100 km-year with 65
days' repair (90 high), CIGRE TB 815's mean submarine outage of 3.5 months. On the opening scenario,
20 samples per climate year (seed 1), the Estonian mean price over the samples was 46.8 €/MWh with
plant outages and short trips alone, 48.0 with Ofgem/GHD per km and 65 days, 48.7 with 0.10 a year
and 65 days, and 50.9 with 0.17 a year and 106.5 days — against 44.5 in the headline, which samples
nothing; Estonia's hours at the price cap 1.2, 2.9, 3.6 and 6.0 a year; samples leaving demand
unserved 8, 22, 23 and 25 %.

**Decision:** The tab opens on one rate for every cable with a cable, 0.17 a year
(`outage.submarine_cable_failures_per_year_high`, R-LINK-7), and CIGRE's 106.5 days of repair; the
other rates and repair times are one click away.

**Consequences:** The tab's first figures are the Baltic record's, the most demanding of the listed
choices. The headline and its sensitivities are unaffected.

## D-035 — M5 closed after the owner's look

**Status:** Accepted · 2026-09-29 · owner ("we close m5")

**Context:** M5 was built on 2026-09-29 (D-031 … D-034): a scenario year's borders from their lines,
the cables' typical availability and the AC borders' balancing reservation, the what-ifs per line,
the border panel with the outage labels, the adequacy tab. The owner's look followed the same day,
each round built, checked in the browser and committed with `make ci` green: the Links box as v4
drew it (a map where a click switches a line, the capacity into Estonia and into the Baltics, a
switch per line); an observed what-if on EstLink reading the cables' own A78 events (ERRATA E-046)
and splitting each hour's offer between the two cables before holding either (E-047); the what-if
editor called "Limit a line for some dates"; a "?" with a plain explanation beside each battery and
reserve setting; the mFRR share in per cent; the batteries' cycle control no longer moving Kruonis,
whose store, round trip and limit the panel now shows (E-048).

**Decision:** M5 is done, with those rounds and with the departures PLAN §4 records for it.

**Consequences:** Stage 4 continues with M6 (the SMR pair, the contract card, the plant's forced
outages in the sampler; OPEN-6). Offered and not taken: a separate switch for the LV–LT upgrade of
2035 as v4 had; delivering storage output up to the rated power instead of the programme's P × η
(Kruonis at most 666 MW, methodology §5; on the opening scenario the change moved prices by
0.01–0.02 €/MWh). Open on the owner's side as in D-030: OPEN-9 and OPEN-11 before M7, OPEN-10's
outcome, OPEN-12.

## D-036 — The scenario view narrowed to the owner's three scenarios of 2035 (specification revision 1.6)

**Status:** Accepted · 2026-09-29 · owner ("the plan suits me, only keep the price multiplier for the neighbours";
"get started"; on the lines: "let them be switched off, but we will keep the possibility to switch them on")

**Context:** The owner found the scenario panel overloaded: most of its controls are the model's
calibration settings (the batteries' cycling cost, the mFRR share, the cables' profile, the AC
reservation), not the question v5 exists for — what an Estonian SMR does in 2035 against the gas
Elering plans for its firm capacity. Elering and TalTech published on 2026-09-28 the base scenario
S1 of their PLEXOS analysis for public consultation to 2026-10-12: Estonia's fleet and demand to
2050, agreed with Elering, with the firm capacity of 2035 as gas.

**Decision:**
1. The application's scenario runs take 2035 only, in three scenarios computed together:
   *Elering: gas* — Estonia's fleet and demand of S1 for 2035, Latvia's and Lithuania's of ERAA 2025
   National Trends 2035; *2 SMR* and *3 SMR* — the same with two or three 300 MW units, each
   replacing 300 MW of the Estonian gas, so the three hold the same firm capacity.
2. The panel: the scenario; the neighbours' profile — TYNDP 2024 Distributed Energy 2035 (opening)
   or Global Ambition 2035, or TYNDP 2026 National Trends+ 2035, which switches the run to that
   family's weather scenarios and Baltic demand — with a level factor per boundary zone (the owner's
   amendment); the fuel and CO₂ path; per core zone the capacity of onshore wind, offshore wind,
   solar, batteries, gas and, in Estonia, oil shale, and the annual demand (the multiplier shown in
   TWh); the line switches, EstLink 3 and the fourth EE–LV line off by default in 2035 as in S1 (the
   owner, for this view over D-031's ERAA dates; the switches stay).
3. Every other setting keeps its default and stays in the scenario text: family and target year,
   the DSR bands, electrolysis and power-to-heat (off), the firm block (0), the batteries' and
   Kruonis's parameters, the mFRR share, the reserve, the cables' profile (typical), Litgrid's plan
   (held), the AC reservation (2025 mean), the Finnish slope (price-taker).
4. Results: the three scenarios side by side (price per zone, net import, CO₂, the difference to
   *Elering: gas*); the contract card in the plant's scenarios; the charts and the four
   sensitivities of the scenario shown.
5. The validation view is unchanged.

**Consequences:** Specification revision 1.6 records the change (R-BND-5, R-BND-6, R-TIME-2,
R-DEM-1 … R-DEM-6, R-SUP-1, R-SMR-1, R-SMR-5, R-SMR-8, R-LINK-3, R-LINK-4, R-APP-1, R-APP-11, §14).
S1 enters `scenarios.csv` as `elering_taltech_s1_2035` with its document cached. S1's gas — existing
263, reserve procurement 186, the distributed restoration tender 900 and the future capacity
mechanism 15 MW — enters as the peaking class, in the market, as S1 enters the last two "simply as
gas plants"; ERR's report of the tender (2026-04-23) describes a restoration service paid outside the
market, so following S1 gives the gas its largest market role, the cautious side for the plant. The
scenario text becomes version 3 (the scenario shown and the plant's contract); a text of another
target year than 2035 no longer opens. M6 is built in this view. Compare and Outlook (R-APP-5,
R-APP-6, M7) are revisited when M7 starts: the side-by-side view covers part of them.

## D-037 — What counts as a fossil price in the pair (R-SMR-5; M6)

**Status:** Accepted · 2026-09-29 · the implementer (Claude), for the owner's confirmation when M6
closes

**Context:** R-SMR-5 reports, beside each scenario with the plant, the hours "in which a fossil unit
or a fossil-priced import sets the price". v4 tagged the unit running inside its bounds at the
zone's price and followed an import into the modelled neighbour that sent it (v4
`week.price_setter`, R-REF-15). v5 has no neighbours' fleets: Finland, SE4 and Poland are price
profiles (R-BND-1), so an import cannot be followed to the plant behind it, and on the opening state
about seven Estonian hours in ten take a neighbour's price through lines that do not part the
prices. The two sides also price fuel differently: the Baltic plants bid on the run's fuel path
(ERAA 2025 for 2035: gas 38.17 €/MWh thermal, CO₂ 197.51 €/t, so a gas combined-cycle plant at
142.1 €/MWh), while TYNDP 2024 modelled the neighbours' profiles on its own price matrix (2035,
between its 2030 and 2040 rows: gas 21.50 €/MWh thermal, CO₂ 130.20 €/t, the same plant at
87.7 €/MWh).

**Decision:**
1. The price of a zone's hour is set by the offer running part-loaded at that price (within
   0.005 €/MWh, above the LP's perturbation) in the zone, or in a zone the links do not part from it
   in price, the zone's own first; when there is none, storage, the Daugava, shedding or spilling
   set it (`app/src/worker/view.ts`, `marginal`).
2. A fossil unit is a Baltic gas or oil-shale class: the groups *gas* (with `other`, which bids as a
   gas engine) and *oil shale* (with retort gas). Waste and biomass are not counted.
3. A fossil-priced import is an hour whose price a neighbour's import or export sets at or above
   the short-run cost of a gas combined-cycle plant — the class `gas_ccgt`, ERAA 2025's present
   plant (efficiency 0.56, 57 kg CO₂/GJ, 1.6 €/MWh variable cost) — on TYNDP 2024's price matrix
   for the target year: the fuel and CO₂ prices behind the neighbours' profiles, and for TYNDP
   2026's profiles the nearest documented ones (TYNDP 2026's own were not collected). In 2035,
   87.7 €/MWh. The level does not move with the run's fuel path or with the gas-shock
   sensitivity, as the neighbours' prices do not.
4. The three scenarios show Estonia's share of such hours, weighted over the weather years, with its
   difference to *Elering: gas*; the tip gives the part a neighbour's price makes up.

**Alternatives:** The run's own lowest Baltic fossil bid as the level (142.1 €/MWh on the opening
fuel path): it moves with the Baltic fuel path while the neighbours' prices stay, and counts almost
none of their hours. On the opening state it gives 5.3, 3.0 and 1.1 % of Estonia's hours for
*Elering: gas*, *2 SMR* and *3 SMR*, against 13.4, 7.4 and 3.3 % by the rule chosen (of which a
neighbour's price 9.1, 5.2 and 2.5 points); Baltic units alone give 4.3, 2.2 and 0.8 %.

**Consequences:** On the neighbours' side the figure is an estimate: an hour a neighbour's own gas
plant or its water value priced below that cost is missed, and a neighbour's scarcity price above it
is counted. Results with the plant stay internal (R-SMR-8). methodology §10 describes the rule.

## D-038 — M6 closed

**Status:** Accepted · 2026-09-29 · owner ("we close m6 and move on to m7")

**Context:** M6 was built on 2026-09-29 in the scenario view of specification revision 1.6 (D-036):
Elering and TalTech's S1 as *Elering: gas*, the plant's scenarios *2 SMR* and *3 SMR*, the contract
card with its four designs and the clause, the plant's forced outages in the adequacy tab,
Estonia's hours with a fossil price (D-037) and the sensitivities as a pair. Before closing, the
owner was given the choices M6 runs on and a list of what to check (2026-09-29).

**Decision:** M6 is done. The owner closed it without changing those choices, so they stand as
built: OPEN-6's defaults — one planned outage of 336 h per unit a year, a minimum stable load of
50 % — take effect as §15 provides for an item not decided by its stage; S1's gas in the market,
the restoration tender included (D-036); each unit replacing 300 MW of Estonian gas; the clause's
zero at 0.01 €/MWh; the strike's default of 90 €/MWh (the owner's, R-SMR-3); D-037's level for a
neighbour's fossil price.

**Consequences:** Stage 4 continues with M7. PLAN §4 records M6's departures. Open on the owner's
side: OPEN-9 and OPEN-11 before staging, OPEN-10's outcome, OPEN-12.

## D-039 — M7's scope after revision 1.6: the three scenarios stand for Compare and Outlook; no deployment yet

**Status:** Accepted · 2026-09-29 · owner (on Compare and Outlook: "The three replaces them"; on the
test site while the validation gate is unmet: "Do not deploy for now")

**Context:** D-036 left Compare and Outlook (R-APP-5, R-APP-6) to be revisited when M7 starts: the
scenario view already computes three scenarios together on one time base, weighted over the weather
years, with each year's weight and rank labels. R-DEP-1 wants a password-protected staging site from
the first deployable build, but R-DEP-2's gate cannot pass while R-VAL-5 is unmet, and R-PUB-4 and
R-SMR-8 keep results with the plant inside the repository (ERRATA E-049). The owner was offered: the
trio standing for both views, a Compare view of any three pinned scenarios, or both views as
written; and for the site, a staging build without the plant's scenarios, everything behind the
password, or no deployment yet.

**Decision:**
1. The scenario view's three scenarios are Compare and Outlook; each weather year's Estonian price
   is shown beside the weighted one. No separate views.
2. Nothing is deployed until the owner decides. M7 prepares the deployment — `make deploy` with its
   gate, the `.htaccess`, the workflows — and checks it without deploying; `make deploy` refuses
   while the gate is unmet.

**Consequences:** Specification revision 1.7 (R-APP-5, R-APP-6, R-DEP-1, §14). M7 builds the
Calibration page, the Methodology, FAQ and Sources views, the export, the print stylesheet, the
declaration of interest and the deployment tooling. OPEN-9 takes its default before any deployment;
OPEN-11 stays with the owner.

## D-040 — An import-price page: the neighbours' prices as the model takes them, and what they rest on

**Status:** Accepted · 2026-09-30 · owner ("create a separate tab for calibrating the import price … a slider … similar to the one we already apply … when we move FI price level"; on the slider: "The same as in the panel"; on the generation behind the prices: "I allow the export into db but it is not used in the main model, we simply display it on the calibration page so that it is clear where the prices are formed from by default")

**Context:** The model takes each neighbour's price as given (R-BND-1, R-BND-2): the profile of the
chosen neighbours' scenario times a level factor per zone (R-BND-5). The owner looked at Finland's
Distributed Energy 2035 profile outside the application (monthly statistics, the profile by hour of
the day, the duration curve, the zero-price hours) and at the Finnish generation of the TYNDP 2024
market model behind it, and asked for the same on a page of the application, with the level slider.
The generation was not in the export: the database had the demand behind each profile only.

**Decision:**
1. A fifth view, *Import price*: for the boundary zone chosen (FI, SE4, PL) and each year of the set
   shown, the hourly price as the clearing takes it — one function of the engine, `boundaryPrice`,
   serves both — with its monthly maximum, mean, median and minimum, its hours at zero, below zero
   and above 100 €/MWh, its profile by hour of the day and its duration curve.
2. The page's slider is the panel's level factor: moving it moves the scenario and reruns the model.
3. For a TYNDP 2024 profile the page shows the zone's annual generation in the market model, its
   loads, net export and dumped energy (`scenario_boundary_generation`, exported to
   `presets.json` `boundary.generation`). It is context: the engine does not read it, and the level
   moves the price alone. TYNDP 2026 National Trends+ has none on the page.

**Consequences:** Specification revision 1.8 (`R-APP-12`, `R-BND-8`). The database gains a table
and the export a field; the year files do not change.

## D-041 — The import-price page shows the installed capacity too; the electric cars' batteries apart

**Status:** Accepted · 2026-09-30 · owner ("yes, add the capacities to the tab")

**Context:** D-040 put the TYNDP 2024 generation behind a boundary profile on the import-price page.
The same 'Yearly Outputs' sheet holds each node's installed capacity. Summed over a zone's nodes, its
battery row mixes the stationary stores with the electric cars' nodes ('FI00 EV Passenger Prosumer',
'… Street'): Finland's Distributed Energy 2035 has 4 GW of batteries and 129 GW of car batteries,
and 3.1 of its 4.1 TWh of battery discharge are the cars'; Poland's battery rows are all cars'.

**Decision:**
1. The page shows the zone's installed capacity by the generation's groups, the electrolysers and
   heat pumps, and each climate year's full-load hours.
2. The pipeline sums the electric cars' nodes apart from the rest of the zone, in the generation as
   in the capacity (labels prefixed 'EV: '); the page shows them as their own group. The table
   `scenario_boundary_output` (generation, capacity, net export, dumped energy) replaces
   `scenario_boundary_generation`; `presets.json` gains `boundary.capacity`.

**Consequences:** Specification revision 1.8 names the capacity in `R-APP-12` and `R-BND-8`. The
engine reads none of it.


## D-042 — A second calibration round: the loss wedge, the Daugava's weekly maximum, the floor from below-cost hours (proposed)

**Status:** Decided · 2026-10-05 · owner ("I accept D-042 and D-044 + your proposals, yes, switch it off and recalculate the scenarios"): accepted as
proposed, item 5 decided as recommended; the consequences in D-045. Proposed on 2026-10-04 by the
executor, on the owner's instruction for an unattended night ("Full cycle": change the
parameters, draft the decisions and errata, prepare the re-baseline for signature), on branch
`night-2026-10-04` (R-VAL-1: a new fit round is recorded here and re-runs the whole protocol; R-VAL-8)

**Context:** After M3 the gate R-VAL-5 stood at MAE 19.1–20.2 (2023), 20.9–23.3 (2024) and
28.0–32.8 €/MWh (2025) against 15 (D-024, D-025). Read against the record hour by hour
(`docs/research/2026-10-04_calibration_night.md`), the replays departed from the market in three
ways that are errors of the replay, not limits of the model class (ERRATA E-056, E-057):

- Observed, the Baltic price equals a neighbour's to the cent wherever a cable is not at its
  limit (EE = FI in 40–54 % of the hours with both prices above 20 €/MWh). The replay put
  R-BND-4's losses on the importing side, so an uncongested import cleared 1.6–4.3 % above the
  neighbour, and the model almost never landed on a neighbour's price.
- In the hours the market cleared at or below 10 €/MWh the model ran a third of the thermal
  output the record shows (Estonia 56–95 MW against 140–174 in 2024) and its cheap hours were
  24–33 €/MWh too dear: the floor was a lower envelope (the 10th percentile), not what runs.
- The Daugava was free up to its installed 1 588 MW; its weekly maximum output was 758 MW on
  average in 2024, and the programme placed the week's water in the dearest hours at the
  nameplate.

**Decision (proposed), one change per full-year run of 2023, 2024 and 2025, each kept because no
zone's MAE rose** (hourly MAE, €/MWh, EE / LV / LT):

| Step | Change | 2023 | 2024 | 2025 (blind) |
|---|---|---|---|---|
| S6 | M3's register (D-025) | 19.12 / 20.19 / 19.09 | 20.92 / 23.28 / 22.72 | 32.79 / 32.66 / 27.98 |
| S7 | Replays clear without the cables' losses (item 1) | 16.69 / 18.26 / 16.79 | 19.53 / 22.31 / 21.66 | 31.01 / 31.49 / 26.65 |
| S8 | The Daugava's turbine limit = its observed weekly maximum output (item 2) | 15.21 / 16.23 / 15.50 | 17.99 / 20.17 / 20.10 | 28.33 / 28.28 / 25.25 |
| S9 | The heat-driven floor from the fit years' below-cost hours (item 3) | 12.86 / 14.63 / 13.68 | 16.24 / 18.68 / 18.56 | 24.45 / 25.47 / 22.68 |
| S10 | The markup refitted on that floor (item 4) | 12.85 / 14.34 / 13.61 | 15.53 / 17.34 / 17.33 | 23.90 / 24.44 / 22.75 |

1. *No loss wedge in the replays.* `replay` sets the losses off: the day-ahead coupling applies
   no loss factor on EstLink, NordBalt or LitPol, as the record shows; the losses are bought by
   the system operators outside the market. R-BND-4's parameter and its default stay for the
   scenario runs (item 5).
2. *The Daugava's weekly maximum.* The year file of an observed year carries
   `hydro_weekly_max_mw.daugava` beside the weekly minimum of D-022; the replay's turbine limit is
   the lesser of it and the installed capacity. The budget stays weekly (D-025 item 2 stands).
3. *The floor of R-SUP-5 is what ran unpaid.* For each zone and technology of D-022/D-023, the
   mean output per 1 °C bin in the hours of 2023–2024 whose observed zone price was below the
   technology's cheapest bid in the engine, as a line on heating degree-hours
   (`app/scripts/fit_floor.ts`; methodology §7.2). It uses the observed prices of the fit years
   only, as the markup's fit does; 2025 sees the frozen line. `validate/chp_fit.py` stays in the
   repository as M3's method and no longer writes the register.
4. *The markup refitted* by D-023's method on the new floor: LV 40 / 400 / 560 / 560, LT 0 / 280 /
   480 / 520, EE 0 (methodology §7.2). The fit years' sum of MAE falls from 100.70 to 90.99, every
   zone in both years. The blind year's Lithuanian MAE rises by 0.07 €/MWh at this step (EE −0.55,
   LV −1.03): the same exception D-023 took for the markup, R-SUP-6's required element, and the
   owner's to confirm again. **What the owner should know before signing:** at 280–560 €/MWh over
   cost the upper half of the two gas fleets is offered at scarcity prices, and Latvian gas falls
   to 1.07–1.11 TWh against 1.57–1.60 observed in 2024–2025 (the class breaches ±10 % in every
   year; on M3's register it breached in 2023–2024 by less). The alternative is to keep M3's
   schedule on the new floor (S9's row): 0.7–1.3 €/MWh more MAE in 2024 and up to 1.0 in 2025,
   the gas classes nearer the record, but a register that `make fit` would not reproduce.
5. *Open for the owner — the scenario runs' losses.* The same coupling clears the scenario years,
   so the evidence of item 1 argues for R-BND-4's default off there too. That moves every
   scenario result and is not done; the scenario runs keep the default, on.
6. *The batteries' Δ follows the fit* (R-STO-9, `make fit`): at the owner's share of 0 the fit on
   the 2026 replay gives 58.5 €/MWh (65.5 on M3's register; residual −0.1 %). Scenario runs take
   it from the register. The scenario figures quoted in methodology §8–§10 and in the application's
   documents were computed at 65.5 and are not re-run here; `make gap` is re-run and met (8 of 8).
7. *Golden re-baseline (R-VAL-8)*, the 2024 replay of both engines, written and awaiting the
   owner's sign-off:

   | 2024 replay, EE / LV / LT | D-025's register | D-042's register | Observed |
   |---|---|---|---|
   | MAE, €/MWh | 20.9 / 23.3 / 22.7 | 15.5 / 17.3 / 17.3 | |
   | Duration-curve RMSE | 24.0 / 27.9 / 26.9 | 14.7 / 17.1 / 17.4 | |
   | Mean price | 91.0 / 88.1 / 88.6 | 87.7 / 86.3 / 86.3 | 87.3 / 87.4 / 87.3 |
   | Hours ≥ 150 €/MWh, % | 6.2 / 5.3 / 5.8 | 7.5 / 7.0 / 6.9 | 11.3 / 11.4 / 11.3 |
   | Latvian gas, TWh | 1.39 | 1.07 | 1.60 |
   | FI→EE at its limit, % | 79 | 72 | 65 |
   | SHA-256, engine of record | 46db3e34… | facdbed3… | |
   | SHA-256, preview | e60e2017… | 95ebd960… | |

   The synthetic week is unchanged.
8. *Evidence, not adopted* (the precedent of D-023's Δ; the research log has the tables):
   a fitted Kruonis bid — the fit years' sum of MAE is least at Δ ≈ 160 €/MWh (83.8 against 91.0
   at the prior of 60), where Kruonis all but leaves the day-ahead market (0.02–0.06 TWh against
   0.48–0.57 observed) and the blind year's Estonian MAE rises by 0.1 €/MWh (at Δ = 120 the blind
   year gains 0.2–0.7 and Kruonis generates 0.06–0.11 TWh); and the Daugava's limit as a share of
   its weekly maximum (at 0.8–0.9 the three years' sum falls from 162.1 to 157.7–157.8, and in
   2023 the cascade can no longer pass its week's water). Both say the
   same thing — hydro in the record is less free at the peak than a programme with a week's
   foresight — and both trade a generation figure for a price figure. A daily band on the
   Daugava's release (a day within 0.65–1.35 of the week's daily mean, the record's 5th–95th
   percentile) moved the sum by 2 and was dropped.

**Consequences:** *R-VAL-5 is still not met.* 2023 meets the three price thresholds in every
zone (MAE 12.9 / 14.3 / 13.6, duration-curve RMSE 6.5 / 8.3 / 8.2); 2024 misses the MAE by 0.5–2.3
and 2025 by 8–9 €/MWh; 8, 17 and 20 breaches (14, 18 and 17 before: the price metrics gained, gas
and oil-shale output lost). *R-VAL-6 stays met:* the 2024 effect of EstLink 2's outage is 23.4
€/MWh (gate 15–30; 18.3 before), July 40.4 against Eesti Energia's +42, FI→EE at its limit 54 %
with the cable and 80 % without it; the EE–FI annual spread 42.2 against 41.7 observed (45.4
before). Diagnostics: 2021 falls from 22.2 / 23.0 / 22.0 to 13.2 / 13.8 / 12.8, 2022 from 32.2 /
42.5 / 40.7 to 24.9 / 36.4 / 34.1, 2026 from 18.6 / 21.9 / 15.9 to 15.4 / 18.9 / 13.2; 2020 rises
from 14.3 / 14.0 / 14.1 to 14.5 / 15.2 / 15.2. `make ci` and `make gap` pass on the branch. The
specification's text follows at its next revision if the owner signs (R-BND-4, R-ENG-5, R-SUP-5,
R-STO-9; ERRATA E-056 to E-058). If the owner refuses, the branch is dropped; nothing on `main`
moved.

## D-043 — The import-price page shows the generation and capacity behind TYNDP 2026's prices too

**Status:** Accepted · 2026-10-04 · owner (the night's scope, "Plus TYNDP 2026 for FI/SE4/PL"), on
D-040 and D-041; built by the executor on branch `night-2026-10-04`

**Context:** D-040 and D-041 put the market model's generation and installed capacity of FI, SE4
and PL behind every TYNDP 2024 profile on the import-price page; for TYNDP 2026 National Trends+
the page said the export held none. The package's hourly dashboards hold both: every node's
hourly generation and load by category, and an 'Installed Capacity' sheet per country.

**Decision:**
1. `tyndp2026.parse_output_member` reads, per country workbook and weather scenario, the annual
   generation and loads by category of the zone's market node and its prosumer node, the net
   export, the dumped energy and the installed capacity; `scenario_boundary_output` and the
   export's `boundary.generation` and `boundary.capacity` carry them as family `tyndp2026`,
   scenario `NTplus`, weather `WS…`, for the boundary zones only.
2. The categories take TYNDP 2024's labels where they are the same thing, so one page and one
   grouping read both families. Demand stays in `scenario_boundary` (the electric cars' charging
   is demand there), and the page's identity — generation = demand + electrolysers + other
   loads + net export — closes in every one of the 36 zone-weather sets.
3. The page shows the two tables for a National Trends+ profile, with a note on what differs
   (the cars' charging in demand, no capacity for the cars, the prosumer node's adequacy units).

**Consequences:** `R-APP-12` and `R-BND-8` name TYNDP 2024 only; the text follows at the next
revision (ERRATA E-059). The engine reads none of it. `make db` reloads
`scenario_boundary_output` from the 36 workbooks (about five minutes with the TYNDP 2024
archives).

## D-044 — The Daugava in a replay runs between its weekly deciles (proposed)

**Status:** Decided · 2026-10-05 · owner ("I accept D-042 and D-044 + your proposals, yes, switch it off and recalculate the scenarios"): accepted as
proposed (D-045). Proposed on 2026-10-04 by the executor, in the night's round after D-042, as
its own commit on branch `night-2026-10-04`, so that it could be refused alone
(R-VAL-1, R-VAL-8, R-ENG-5)

**Context:** After D-042 the largest gap between the replays' quantities and the record's was
the Daugava's placement within the week. Held to its observed weekly minimum and maximum (D-022
item 4, D-042 item 2), the programme, which sees the whole week, sat at those bounds in most
hours: in the hours Lithuania cleared at or above 150 €/MWh it ran 526–629 MW of the cascade
against 363–454 observed (2024–2025), and in the hours of 2025 that cleared at or below 30 €/MWh
142–156 MW against 245–282. A week's minimum and maximum are two hours of 168; the record spends
most of the week well inside them. D-025 item 2 keeps the budget weekly, and this keeps it.

**Decision (proposed):**
1. In a replay the cascade's hourly release lies between the 10th and the 90th percentile hour
   of the week's observed output (`hydro_weekly_p10_mw`, `hydro_weekly_p90_mw` in the observed
   year files; `export/axis.py` `weekly_quantile`; `build.ts`), the upper bound never below the
   week's mean so that the budget passes. Five bands were run (5–95, 10–90, 15–85, 20–80 and
   30–70 %). The protocol's rule — no zone's MAE rises in any of the three years — is met by
   5–95 and 10–90 only (15–85 and 20–80 raise Lithuania's 2025, 30–70 every zone's); of the two,
   10–90 has the lower sum (154.20 against 156.35 over the three years; 86.11 against 87.45 on
   the fit years alone). On the fit years alone 20–80 would be chosen (84.44). **The blind year
   was therefore seen in choosing the band**, as the keep rule requires of every step; for this
   one choice 2025 is a test of the rule, not a blind test of the value.
2. `make fit` is rerun on it: markup EE 80 / 160 / 200 / 200, LV 35 / 275 / 355 / 435, LT 0 / 80 /
   400 / 520 €/MWh; the batteries' Δ = 61 €/MWh at the owner's share of 0.

| Step | Change | 2023 | 2024 | 2025 (blind) |
|---|---|---|---|---|
| S10 | The register of D-042 | 12.85 / 14.34 / 13.61 | 15.53 / 17.34 / 17.33 | 23.90 / 24.44 / 22.75 |
| S11 | The Daugava between its weekly deciles | 12.10 / 13.32 / 12.90 | 14.87 / 16.40 / 16.52 | 23.10 / 22.61 / 22.38 |
| S12 | `make fit` rerun (markup, Δ) | 12.01 / 13.26 / 12.84 | 14.88 / 16.53 / 16.71 | 22.08 / 21.75 / 21.11 |

*Hourly MAE, €/MWh, EE / LV / LT.* S11 lowers every zone in every year. S12 against S11 raises
2024 by 0.01–0.19 €/MWh: the markup's coordinate descent starts from zero and stops at a
schedule whose fit-year sum (86.23) is 0.12 above what D-042's schedule gives on the same band
(86.11); the two are equal within the method's 5 €/MWh step, and the register holds the one
`make fit` reproduces (D-023's method, unchanged). Against S10, S11 and S12 together lower every
zone in every year.

3. *Golden re-baseline (R-VAL-8)*, the 2024 replay of both engines, written and awaiting the
   owner's sign-off:

   | 2024 replay, EE / LV / LT | D-042's register | D-044's register | Observed |
   |---|---|---|---|
   | MAE, €/MWh | 15.5 / 17.3 / 17.3 | 14.9 / 16.5 / 16.7 | |
   | Duration-curve RMSE | 14.7 / 17.1 / 17.4 | 12.1 / 15.3 / 16.1 | |
   | Mean price | 87.7 / 86.3 / 86.3 | 87.6 / 86.4 / 86.1 | 87.3 / 87.4 / 87.3 |
   | Hours ≥ 150 €/MWh, % | 7.5 / 7.0 / 6.9 | 8.4 / 8.1 / 8.0 | 11.3 / 11.4 / 11.3 |
   | Latvian gas, TWh | 1.07 | 1.13 | 1.60 |
   | SHA-256, engine of record | facdbed3… | 0043cc36… | |
   | SHA-256, preview | 95ebd960… | 29288d9a… | |

**Consequences:** *R-VAL-5 is still not met*, and nearer: 2023 meets its price thresholds in
every zone (MAE 12.0 / 13.3 / 12.8); in 2024 Estonia meets the MAE (14.9), Latvia and Lithuania
miss it by 1.5–1.7 €/MWh; the blind year 2025 misses it by 6–7 (22.1 / 21.7 / 21.1), with the
duration-curve RMSE down from 18.4 / 19.9 / 15.5 to 15.1 / 14.6 / 14.4. 9, 15 and 20 breaches.
*R-VAL-6 stays met* (23.3 €/MWh). 2026, January–August: 14.8 / 16.9 / 12.2. `make gap` met, 8 of
8. *What it costs:* the replays now hold the Daugava to a band the scenario runs do not have —
there it is free between PEMMDB's turbine limits, so a scenario year's prices are flatter than
the calibrated replays would make them (methodology §5.7). A rule that carries over — the band
as shares of the week's mean release — was tried: at 0.6–1.8 of the mean it gives 158.2 on the
three years against 154.2 for the observed deciles, and raises 2023; it is the owner's to
ask for. The evidence of D-042 item 8 on Kruonis stands unchanged on this register (Δ = 90:
150.24; Δ = 120: 150.07 against 154.20, Kruonis generating 0.07–0.25 TWh).

## D-045 — The owner's decisions on the night's calibration round; scenario runs clear without the loss wedge

**Status:** Accepted · 2026-10-05 · owner ("I accept D-042 and D-044 + your proposals, yes, switch it off and recalculate the scenarios"), on D-042 and
D-044 and on the recommendation of D-042 item 5

**Context:** D-042 and D-044 put a second calibration round to the owner, with the golden
re-baseline of the 2024 replay written and one question left open: whether scenario runs should
keep R-BND-4's losses, which the replays had dropped. Asked what the evidence was, the executor
checked the market's own list — Nord Pool applies its loss functionality on Baltic Cable, NorNed,
NordLink, North Sea Link, Storebælt, Skagerrak and Konti-Skan, and not on EstLink, NordBalt or
LitPol (nordpoolgroup.com, "Loss functionality", read 2026-10-05) — and the record again: in the
hours with EstLink below its limit either way, Estonia's price equals Finland's in 99.4 % (2023)
and 92.4 % (2024); from October 2025, with the 15-minute market, the hourly means differ by a
quarter of a per cent in more hours, and no hours gather near the cable's loss of 3.6 %.

**Decision:**
1. D-042 is accepted as proposed, with the exception it asks for (item 4: the markup's refit
   raises Lithuania's blind-year MAE by 0.07 €/MWh).
2. D-044 is accepted as proposed, the owner informed that the blind year was seen in choosing
   the band and that the markup's refit raises 2024 by 0.01–0.19 €/MWh against the step before.
3. The golden fixture's re-baselines of the 2024 replay are signed off (R-VAL-8; the tables of
   D-042 and D-044).
4. *Scenario runs clear without the loss wedge* (D-042 item 5): `common` sets the losses off for
   every run. The engine's scenario keeps the field; the application has no control for it
   (R-BND-4's "may be set to 0 by the user" was never built as a control, and now the default is 0).
5. The scenario figures the documents quote are recomputed on the register in force
   (methodology §6, §7.1, §9, §9.1, §10; `spikes/night-calibration/scenario_docs.ts`).

**Consequences:** The opening scenario's weighted prices move from 61.1 / 50.3 / 50.3 to 59.8 /
49.2 / 49.2 €/MWh (EE / LV / LT), 2 SMR from 46.4 / 44.9 / 44.9 to 45.5 / 44.4 / 44.4, 3 SMR from
37.9 / 43.8 / 43.8 to 37.3 / 43.4 / 43.4 (Distributed Energy 2035, batteries at Δ = 61 €/MWh); on
National Trends+ 2035 Estonia moves by +0.1 to +0.9. The replays, the fits and the golden fixture
do not move. `make ci`, `make gap` (8 of 8) and the tests pass. R-VAL-5 is still not met (2023
meets its price thresholds; 2024 misses the MAE by up to 1.7 €/MWh, the blind year by 6–7), so
§14's rule stands: results with the plant stay inside the repository (R-SMR-8). The branch is
merged into `main`. The specification's text follows at its next revision: R-BND-4 (losses off
by default, why), R-ENG-5 (the Daugava's band in replays), R-SUP-5 (the floor's definition),
R-STO-9 (Δ as the fit of the register in force), R-APP-12 and R-BND-8 (both TYNDP families) —
ERRATA E-056 to E-059. Left open, each the owner's to ask for: a fitted Kruonis bid, a
multi-start for the markup's descent, the Daugava's band in scenario years, the order of the
monthly fuel means (E-060).

## D-046 — "Other": the scenario of 2035 against any neighbours' profile the year files hold

**Status:** Accepted · 2026-10-05 · owner ("add an other button for Neighbours' prices where in the drop-down list there will appear …" with the list below), on D-036

**Context:** Since revision 1.6 (D-036) the panel offers three neighbours' profiles, all of 2035.
The year files hold more: TYNDP 2024 Distributed Energy and Global Ambition 2035, 2040 and 2050,
National Trends 2030 and 2040 (climate year 2009 only, D-007), TYNDP 2026 National Trends+ 2030,
2035, 2040 and 2050.

**Decision:**
1. The neighbours' box gets a fourth button, *Other*, which opens a list of the twelve, named as
   the owner wrote them ("tyndp2024 / DE (Distributed Energy): 2040"). Choosing one sets the
   boundary profile and its year; the three buttons return to 2035.
2. The run stays the scenario of 2035: the Baltic fleets, demand, fuel and CO₂ path and lines do
   not move. The state carries the profile's year beside the target year (`profileYear`); the
   years of the set follow the profile (the climate years; 2009 alone for National Trends; the
   weather scenarios of the profile's year for National Trends+). National Trends+ of 2035 still
   brings its own Baltic demand (R-TIME-2); of another year it brings its weather and leaves the
   scenario's demand.
3. The share text and link carry `profile_year` when it is not the target year; older links read
   as before (`schema/scenario.schema.json`).
4. National Trends+ 2030 is shown and disabled: its weather scenarios hold no offshore wind
   capacity factors, and Latvia's and Lithuania's fleets of 2035 have 1 000 and 1 400 MW of
   offshore wind. Running it would take a proxy series, which is the owner's to ask for.

**Consequences:** A profile of another year is a what-if on the neighbours, not a scenario of
that year, and the panel's note says so; with National Trends+ 2040 the opening scenario's
Estonian price is 112 €/MWh against 59.8 with Distributed Energy 2035, most of it the profile's
scarcity hours (`docs/research/2026-10-04_boundary_price_scarcity.md`). The import-price page
follows the chosen profile and year. Revision 1.6's text ("the neighbours' profile (TYNDP 2024
Distributed Energy or Global Ambition 2035, TYNDP 2026 National Trends+ 2035)") follows at the
next revision (ERRATA E-061).

## D-047 — The "Other" list names each profile with its mean price in Finland, SE4 and Poland

**Status:** Accepted · 2026-10-05 · owner ("add to the scenario description the average price by region FI, SE4, PL"), on D-046

**Decision:** Each line of the list ends with the profile's mean price per neighbour, €/MWh to
the whole euro: the mean of its hours, weighted over its weather years as the runs weight them
(R-TIME-3; National Trends on climate year 2009 alone), before the panel's price level. The export
carries them as `boundary.mean_price` in `presets.json` (`export/tables.py` `boundary`), from
`tyndp_price` and `tyndp2026_price` with their lineage.

**Consequences:** The figures are the ones the price-level hints show for the chosen profile at
level 1 (National Trends+ 2035: FI 72.9, SE4 49.4, PL 64.3). A mean hides what lifts it: National
Trends 2040 and National Trends+ 2040 and 2050 carry scarcity hours of 2 000–3 000 €/MWh
(`docs/research/2026-10-04_boundary_price_scarcity.md`); the import-price page shows the median
and the hours beside it.

## D-048 — The neighbours' buttons name their year and their mean prices

**Status:** Accepted · 2026-10-05 · owner ("add to the button which year it is about and the average prices too"), on D-046 and D-047

**Decision:** Each of the three profile buttons carries its target year after its name and, on a
second line, the profile's mean price in Finland, SE4 and Poland (D-047's figures). With a
profile of the *Other* list chosen, the *Other* button names it the same way ("Other: National
Trends 2040", its three means beneath).

**Consequences:** The figures are before the price level; the hints under the level sliders show
the mean after it.

## D-049 — The neighbours' mean prices are marked by small flags, not codes

**Status:** Accepted · 2026-10-05 · owner ("add small flags instead of Fi and the other country designations"), on D-047 and D-048

**Decision:** On the profile buttons each mean price follows its zone's flag as the panel draws
flags elsewhere (`flag`, CSS), with the zone's code kept in the text a screen reader reads; in the
*Other* list, whose lines can hold text alone, the flags are the emoji. SE4 carries Sweden's flag.

**Consequences:** R-UI-4 has flags beside country codes (E-043); here the visible code gives way
to the flag at the owner's request, and the code stays for assistive technology. An emoji flag is
drawn by the reader's system and may show as two letters where the system has no flag glyphs.

## D-050 — National Trends+ 2030 leaves the "Other" list

**Status:** Accepted · 2026-10-05 · owner ("remove NTplus 2030"), superseding D-046 item 4

**Context:** D-046 listed National Trends+ 2030 disabled, since its weather scenarios (WS003,
WS021, WS029) hold capacity factors for onshore wind and solar only, and the fleets of 2035 have
1 000 MW of offshore wind in Latvia and 1 400 MW in Lithuania. Asked what the problem was, the
executor offered a proxy series; the owner chose to drop the line.

**Decision:** The list holds eleven profiles; National Trends+ is offered for 2035, 2040 and 2050
(`PROFILE_YEARS`). A share text naming `profile_year=2030` with National Trends+ is refused.

**Consequences:** The profile's prices stay in the export (`boundary.mean_price`, the year
files); nothing reads them in the panel.

## D-051 — The neighbours' actual prices of 2025 as a profile of the "Other" list

**Status:** Accepted · 2026-10-05 · owner ("let's also add the real profile for the year 2025"), on
D-046

**Context:** Every neighbours' profile so far is a market model's. The owner asked for the prices
that happened in 2025 beside them.

**Decision:**
1. The list gets "observed / REAL (actual prices): 2025": Finland's, SE4's and Poland's day-ahead
   prices of 2025 (ENTSO-E A44) hour by hour, the series the 2025 replay takes.
2. The export writes them into each TYNDP 2024 climate-year file as `REAL_2025`
   (`export/years.py`, `REAL_YEARS`), with their lineage, and their means into
   `boundary.mean_price` (40, 60 and 104 €/MWh). The scenario of 2035 runs on its three climate
   years as before; the neighbours' series is the same in all three.
3. *What was not done:* running the Baltic side on 2025's own weather, which would keep the
   weather and the prices together. The 2025 record has no offshore wind series, which the fleets
   of 2035 need — the case of D-050 — so it would rest on a proxy.

**Consequences:** This profile breaks the rule the others keep: the boundary prices are not
those of the Baltic weather year (D3, R-TIME-2). Baltic wind and the neighbours' prices move
together in the record and in a TYNDP profile, and here they do not, so the value of Baltic wind
and the hours of congestion are not those of a coherent year; the panel's note and the
import-price page say so. No observed price of a core zone enters (R-BND-3). On the opening
scenario the weighted prices are 73.2 / 61.2 / 61.2 €/MWh (EE / LV / LT) against 59.8 / 49.2 /
49.2 with Distributed Energy 2035; 2 SMR 47.9 and 3 SMR 35.2 in Estonia. The specification's text
follows with E-061.

## D-052 — The scenario's capacity sliders name their growth from the fleet of 2025

**Status:** Accepted · 2026-10-05 · owner ("add the growth percentages for each energy source in scenario in our interface")

**Context:** The panel showed each class's capacity in 2035 and its preset, not how far that is
from the fleet in service today.

**Decision:**
1. Under each capacity slider of the scenario view the panel writes the change from 2025: "+82 %
   from 2025 (682 MW)"; "×56" where the capacity is ten times the base or more; "new since 2025"
   where 2025 had none; nothing where neither year has any or 2025 has no figure.
2. The base is the observed fleet the 2025 replay runs with (ENTSO-E A68 by class,
   `observedClasses`), read from the 2025 year file after the page has started. Batteries, which
   A68 does not report, take Elering's count (`elering_vka_2025_actual`: Estonia 27 MW); Latvia
   and Lithuania have no count, so their battery slider says nothing.
3. A68 does not split gas or oil shale as a scenario does, so those sliders compare all gas and
   all oil shale of the zone, and say so ("all gas 1 364 MW, ×101 from 2025 (14 MW)").

**Consequences:** A hint, not an input: no run reads it and no result moves. Estonia's gas base
is A68's 13.5 MW, not the 263 MW Elering's S1 calls existing gas (which counts plants A68 lists
elsewhere or not at all, the Kiisa reserve plant among them), so its factor reads large. Demand
has no such line.

## D-053 — The generation groups take v3's colours

**Status:** Accepted · 2026-10-05 · owner ("replace the colours on the chart with less bright ones like on https://energiamudel.ee"), on D-029

**Context:** D-029 gave the generation groups the dataviz reference palette's hues. The owner
found them too bright and pointed to the deployed v3.

**Decision:** The nine groups take v3's technology colours (`energiamudel-v3`,
`app/src/ui/techColors.js`): oil shale #7f5539, nuclear #9b59b6, biomass and waste #6ab04c
(v3's biomass), wind #4aa3df (onshore), gas #e74c3c, hydro #3bb2b8 (run-of-river), solar
#f6c343, storage #e84393 (battery), other #95a5a6 — the same in the dark, light and print themes
(`theme.css`, `--g-*`). Every chart and legend that shows a group follows. The stacked areas and
the energy-mix bars fill at two-thirds opacity, as v3's do (`charts.ts`, `fillOf`; the owner, on a
screenshot of v3's chart: "here the colours look better, less contrasty").

**Consequences:** The colour-blind checks D-029 cites for neighbouring layers held for the
former hues and were not rerun; gas (red) and oil shale (brown) are the pair to look at if that
matters again. Text colours and their 4.5:1 contrast are untouched.

## D-054 — A banner while the headline run computes

**Status:** Accepted · 2026-10-05 · owner ("add a big header to the interface if the model is running calculations so that it is clear that the process is going on and the result is not final yet"), on R-ENG-7

**Context:** A scenario's nine runs take about five seconds. Until they end the page shows the
previous settings' figures, and only the small status line said so.

**Decision:** While the headline run computes — from 300 ms after it starts, R-ENG-7's delay, so
that a fast run does not flash — a banner stays at the top of the window: "Computing 9 years…
The results below are from the previous settings and are not final." The results under it are
dimmed. Both go when the run ends, fails or is superseded by a result already held
(`main.ts` `setBusy`, `index.html` `#computing`, `theme.css`).

**Consequences:** The banner covers the headline run only. The standard sensitivities, which run
after it, keep their own "computing…" in their cards, and the adequacy tab its progress line.

## D-055 — The panel shows Elering's base mix S1 for Estonia row by row

**Status:** Accepted · 2026-10-05 · owner ("let's show on the left the base mix S1 for Estonia for the year 2035 as Elering proposes")

**Context:** The scenario starts from Elering and TalTech's S1 (D-036), but the panel showed it
only through the sliders, where the class map has folded its four rows of gas into one class and
left biomass, waste and run-of-river hydro to a note.

**Decision:**
1. The export keeps, beside each fleet preset's classes, the source's own capacity rows
   (`presets.json` `fleets.*.*.*.rows`: the key of `scenarios.csv` without `capacity.`, the value
   and its lineage; `export/tables.py`, `presets.schema.json`). The engine does not read them.
2. The scenario panel gets a box above the capacity sliders, "Elering's base mix S1 — Estonia,
   2035": onshore wind 1 244, solar 1 785, batteries 1 500, oil shale 270, natural gas existing
   263, reserve procurement 186, the distributed restoration tender 900, the future capacity
   mechanism 15, biomass 152, waste 17, run-of-river hydro 8 MW; demand 11.6 TWh, peak 2 300 MW,
   controllable capacity required 2 100 MW — each with its source — and a line that the model
   enters the four gas rows as 1 364 MW of peaking gas (`panel.ts` `s1Box`).

**Consequences:** The box is the document's mix, not the scenario's state: it does not follow
the sliders, and it is shown for whichever zone the capacity box holds. The banner of D-054 no
longer speaks of previous settings on the first run, when there are none.

## D-056 — The capacity box: demand first, a constant load, a number box at each slider's end

**Status:** Accepted · 2026-10-05 · owner ("let Demand go first in the Generation and demand block and make the slider a different colour … after it add a slider of constant consumption (for example data centers) … at the end of the sliders there was a box where the MW will be, for consumption put TWh")

**Context:** In the scenario view demand stood last in the box, in the colour of the generation
sliders; the firm block of R-DEM-4 had a slider in the validation view only; a value could be set
by dragging alone.

**Decision:**
1. The box opens with *Demand*: the demand slider, then "Constant load (e.g. data centres)" —
   the firm block of R-DEM-4, a flat load in every hour, 0–2 000 MW in steps of 10 — then the
   line with the year's TWh; *Generation* follows. Demand's two sliders are drawn in the ink of
   the charts' consumption line, generation's in the accent.
2. Each slider of the box ends in a number box. Generation and the constant load: megawatts, not
   below 0 and free above the slider's range, which grows on the redraw. Demand: the year's TWh
   the multiplier makes of the run's load, typed TWh setting the multiplier within its range
   0.5–2; the box waits, disabled, until a run has reported the load (`panel.ts` `slider`,
   `typed`; `theme.css` `.nbox`, `.row.dem`).

**Consequences:** The state and the scenario text are unchanged: demand stays a multiplier
(`EE.multiplier`) and the constant load `EE.firm_mw`. The TWh in the box is the demand before
the constant load; the line under the two sliders gives their sum. Elering's S10 (data centres,
about 500 MW and 5 TWh from 2030) can be set with the new slider; its hourly profile, which
Elering has yet to fix, is taken flat.

## D-057 — A growth mark beside each number box, measured from 2026 or else 2025

**Status:** Accepted · 2026-10-05 · owner ("to the left of the box with MW or TWh put a small percentage with an arrow denoting the growth relative to the year 2026, if there is no data then to the year 2025. If the growth is positive then green, if negative then red"), on D-052 and D-056

**Decision:**
1. Left of each number box of the capacity box stands a small mark: an arrow and the change from
   the reference year, green up, red down ("▲ 79 %", "▼ 78 %"; "×101" from ten times up; "▲ new"
   where the reference year has none; nothing where there is no figure). Its tooltip names the
   year and the figure it is measured from.
2. The reference is the latest observed year that has the figure. Capacity: the fleet the 2026
   replay runs with (ENTSO-E A68 of 2026, which counts batteries — Estonia 218, Latvia 90,
   Lithuania 426 MW), else 2025's (D-052). Demand: 2026 holds January–August only, so the year's
   TWh is measured from the load of 2025 (Estonia 7.94 TWh). The constant load has no mark.
3. The line under each slider (D-052) follows the same reference and now reads "from 2026".

**Consequences:** D-052's figures against 2025 are superseded where 2026 has the fleet: Estonian
batteries read +588 % from 218 MW, not ×56 from 27. Demand's mark is the demand before the
constant load. Both year files are fetched after the page starts (`main.ts`, `Reference`).

## D-058 — A fourth scenario, 1 SMR, and the plant's units first among Estonia's sources

**Status:** Accepted · 2026-10-05 · owner ("add SMR as the first generation source, for Estonia one can choose 0, 1, 2, 3 SMR"), on D-036

**Context:** D-036 set three scenarios — Elering: gas, 2 SMR, 3 SMR — chosen by the buttons of
the run box. The capacity box, where every other source is set, did not show the plant except in
a note.

**Decision:**
1. The scenario set gains *1 SMR*: one unit of 300 MW replacing 300 MW of Estonia's peaking gas
   (1 064 MW of it left on the opening state), as the others do (`model.ts` `SCENARIOS`, `UNITS`;
   `scenario.schema.json`). The four run together: twelve runs on the three climate years.
2. Estonia's *Generation* opens with "SMR units": the buttons 0, 1, 2, 3, the megawatts they make
   and how much peaking gas is left. They choose the scenario shown, as the run box's buttons do;
   the two stay in step. Under the gas slider stands the gas left in the market with the units
   chosen.

**Consequences:** The scenario text takes `scenario=smr1`; texts with the former three load
unchanged. A full run takes 5.8 s in the development server against 5.4 s for nine runs. On the
opening state 1 SMR gives Estonia 53.4 €/MWh (−6.5 from Elering: gas) and Latvia and Lithuania
46.2 (−2.9), the plant's capture price 54.3 €/MWh. The specification's text on R-SMR-1 names two
and three units; its revision is the owner's. Results with the plant stay inside the repository
while R-VAL-5 is unmet (R-SMR-8), one unit included.

## D-059 — Estonia's capacity box has a slider for every source of Elering's base mix

**Status:** Accepted · 2026-10-05 · owner ("let there be sliders on the left for all the sources that Elering mentions as base mix"), on D-055 and D-056

**Context:** The capacity box had sliders for wind, solar, batteries, the peaking gas as one
class and Auvere. S1's four rows of gas were one slider, and its biomass, waste and run-of-river
hydro stood in a note as "kept as the preset".

**Decision:**
1. In Estonia's box every class a row of the fleet preset's source feeds gets a slider: after
   wind, solar, batteries and oil shale come the gas rows, then biomass CHP, waste and
   run-of-river hydro.
2. A class the source gives in two or more rows gets a slider per row instead of one — for S1
   the peaking gas: natural gas existing 263, reserve procurement 186, the distributed
   restoration tender 900, the future capacity mechanism 15 MW. The class's MW is their sum; the
   engine sees the class as before.
3. The export names, for each source row, the class it is folded into (`presets.json`
   `fleets.*.rows.*.cls`). The state keeps the rows once one is moved (`ZoneState.parts`), and
   the scenario text then carries them as `EE.part.<row>`; a text without them opens with the
   preset's rows in the proportion that makes the class's MW, and a text whose rows do not make
   the class's MW is refused (`model.ts` `partsOf`, `text.ts`, `scenario.schema.json`).

**Consequences:** A scenario nobody has moved a row in serialises as before, so earlier texts and
links are unchanged. The plant's units still replace 300 MW each of the class as a whole
(D-058). Latvia and Lithuania keep their boxes: ERAA's rows are many and not Elering's.
First use, on the question whether S1's 263 MW of existing gas counts the Kiisa reserve plant
(250 MW, outside the market): with that row at 13 MW Estonia's price in *Elering: gas* is 60.0
against 59.8 €/MWh and in *2 SMR* 45.6 against 45.5 — read off the page, not a recorded result.

## D-060 — Icons for the sources of the panel

**Status:** Accepted · 2026-10-05 · owner ("add icons for the sources on the left")

**Decision:** Each row of the scenario panel's capacity box and of the box of Elering's base mix
opens with a small stroked glyph of its source, in the colour of its generation group (D-053):
an atom for the plant's units, wind, wind over a wave for offshore, a sun, a battery, a mine cart
for oil shale, a flame for each row of gas, a leaf for biomass, a bin for waste, a drop for
hydro; demand has a bolt and the constant load a server, in the ink (`app/src/ui/icons.ts`,
ported from v3's `techIcons.js`). The glyphs replace the colour squares of the base-mix box.
In a slider's row the glyph is large (30 px) and stands left of the label and the track, as tall as
the two; the track starts after it (the owner, the same day: "let the icon be bigger and take up the height of both the slider and the caption; the slider must start after the icon"). In the base-mix
table it stays small, before the name.

**Consequences:** The paths are Lucide's, under the ISC licence, which the site now carries
(`app/public/icons/ISC-lucide.txt`) and the footer and the source register name; the mine cart
and the wave are the project's. The icons are decoration: every row keeps its text label.

## D-061 — The box of Elering's base mix leaves the panel

**Status:** Accepted · 2026-10-05 · owner ("delete the block Elering's base mix S1 — Estonia, 2035 on the left"), on D-055 and D-059

**Context:** Since D-059 every source of the mix has its own slider, with the document's value
as the slider's preset mark and its source behind the *i* button. The box of D-055 repeated them.

**Decision:** The box "Elering's base mix S1 — Estonia, 2035" is removed from the scenario panel
(`panel.ts` `s1Box`). The export keeps the source rows (`fleets.*.rows`): the sliders of D-059
are built from them.

**Consequences:** Three figures of the document are no longer on the panel: the peak demand
(2 300 MW), the controllable capacity required (2 100 MW) and the demand in TWh as a row of its
own — the last stands in the demand slider's box. The line that the model enters the four gas
rows as one class is gone with the box; the sum stays under the four sliders.

## D-062 — The growth lines under the capacity sliders are removed

**Status:** Accepted · 2026-10-05 · owner ("remove the captions under the sliders: '+45 % from 2026 (1 231 MW)'"), on D-052 and D-057

**Decision:** The line of D-052 under each capacity slider goes. The mark left of the number box
(D-057) carries the growth, and its tooltip the year and the figure it is measured from. Under
the sliders of a class given row by row — S1's gas — one line stays: the class's MW, the rows'
sum, with the class's mark ("all gas 1 364 MW ▲ ×101"), and with units chosen the gas left in the
market (`panel.ts` `sumHint`; `growthHint` is removed).

**Consequences:** The figure a growth is measured from is on hover only.

## D-063 — Generation's icons in one colour; the plant's unit buttons across the row

**Status:** Accepted · 2026-10-05 · owner ("paint the Generation icons in one colour; stretch the SMR buttons wider"), on D-060 and D-058

**Decision:** In the capacity box the glyphs of the generation rows are all drawn in the accent,
the colour of their sliders; demand's two stay in the ink of theirs. The buttons 0, 1, 2, 3 of
the plant's units share the row's width equally (`theme.css`).

**Consequences:** In the panel a source's glyph no longer repeats its colour on the charts
(D-060); its shape and its label name it.

## D-064 — The fuel-path buttons give way to two prices to type: CO₂ and gas

**Status:** Accepted · 2026-10-05 · owner ("replace Fuel and CO₂ path with two tiles that can be changed; set by default CO₂ 197.5 €/t, gas 38.2 €/MWh thermal"), on R-SUP-8

**Context:** The scenario panel chose one of three fuel and CO₂ paths (ERAA 2025, Svenska
kraftnät's LMA 2026, TYNDP 2024's matrix) and showed its gas and CO₂ prices as a note.

**Decision:**
1. The box becomes "CO₂ and gas prices": two boxes to type in, CO₂ in €/t and gas in €/MWh
   thermal. They open at ERAA 2025's values for 2035 — 197.5 €/t and 38.2 €/MWh thermal (10.6
   €/GJ) — each with its source, the path's value beside it and, once changed, a way back.
2. The state holds the two prices (`fuelGas`, `fuelEua`), the scenario text carries them as
   `price.gas` and `price.eua`, and the engine bids on them in place of the path's
   (`Scenario.gasPrice`, `euaPrice`; `build.ts` `pathPrices`). A text without the two keys opens
   at its path's prices, so earlier texts and links give the results they gave.
3. The fuel path stays in the state and the text (`fuel`): it gives every other commodity —
   biomass, uranium, hydrogen — and the default of the two. The panel no longer offers the other
   two paths; a text can still name them.

**Consequences:** The opening results are unchanged (the defaults are the path's own values,
unrounded). The neighbours' prices do not follow the two boxes: they are the profile's, computed
on TYNDP's own fuel prices (the gap the memo of 2026-10-05 on the neighbours' prices describes),
and the "hours with a fossil price" keep measuring a neighbour's price against a gas plant on
TYNDP 2024's prices. The gas-shock sensitivity still raises the gas price to its floor where the
box is lower. Read off the page: gas at 60 €/MWh thermal moves Estonia's price in *Elering: gas*
from 59.8 to 61.6 €/MWh.

## D-065 — Each generation row shows its source's bid

**Status:** Accepted · 2026-10-05 · owner ("add an icon for the bids of the energy sources to the right of the slider, taking up the height of the slider and the upper caption"), on R-APP-1

**Decision:** Right of each generation row of the capacity box — its label and its track, and as
tall as the two — stands a tag with what the source asks for a MWh, in €/MWh:
- a thermal class and the plant: `impliedBid` — fuel, CO₂ and running costs at the two prices of
  D-064, before the scarcity markup (on the opening state: the plant 16, Auvere 213, peaking gas
  189, biomass CHP 111, waste 152);
- wind, solar and run-of-river hydro: 0;
- batteries: no bid of their own, so the spread they need before they cycle (the cycling cost,
  61 €/MWh charged).
The tag's tooltip says which of the three it is. The tags follow the two price boxes.

**Consequences:** The four rows of S1's gas show the same bid: the model enters them as one
class of peaking plant (D-059). The figure is the class's bid on the energy it may offer freely;
the heat-driven floor of the CHP classes (R-SUP-5) runs below it, and the markup of the last
megawatts (§7) above it — neither is in the tag. Demand's rows have none.

## D-066 — The neighbours' profiles in one list, their levels with a mean-price box; Estonia's run-of-river hydro capped

**Status:** Accepted · 2026-10-05 · owner ("for Estonia make 8 MW Hydro run-of-river the maximum; let all the Neighbours' prices scenarios be in a drop-down list, remove the buttons; also in the Neighbours' prices block add on the right boxes with the €/MWh value on the same principle as in Generation and demand"), on D-046, D-048, D-056 and D-059

**Decision:**
1. *Neighbours' prices* chooses the profile from one list, always shown, of every profile and
   year the year files hold (the twelve of D-046 and D-051), each with its mean prices; the list
   opens on the profile in force. The three buttons of D-048 and the *Other* button are removed.
2. Each neighbour's price level ends in a number box with the mean price the level makes of the
   run's — Finland 39.9, SE4 45.9, Poland 57.2 €/MWh on the opening state. A price typed sets
   the level, within its range 0.5–2; the box waits until a run has reported the mean, as
   demand's TWh does (`panel.ts`: the boxes of D-056 now take TWh or €/MWh).
3. Estonia's run-of-river hydro cannot exceed the preset's 8 MW: the slider ends there and a
   typed value is held to it.

**Consequences:** The scenario text, the state and every result are as before; a text that
names more run-of-river hydro still loads and runs, and the slider then reaches to it. The level
remains a uniform factor on every hour of the profile, with the weakness the memo of 2026-10-05
describes; the box only shows and sets it by the mean it makes.

## D-067 — The lines under the neighbours' level sliders are removed

**Status:** Accepted · 2026-10-05 · owner ("remove the captions under the neighbours' price sliders"), on D-066

**Decision:** In the scenario panel the line under each neighbour's level ("mean price 57.2
€/MWh × 1.40 = 80.0 €/MWh") goes: the box of D-066 holds the mean price the level makes. The
validation view keeps its line, where the level has no box.

**Consequences:** The profile's mean before the level is no longer beside the slider; the list of
profiles gives it, rounded, and the slider's mark stands at it.

## D-068 — The neighbours' price boxes carry their multiplier as a mark

**Status:** Accepted · 2026-10-05 · owner ("add a multiplier for the neighbours' prices the same way as the percentages for Generation"), on D-057 and D-066

**Decision:** Left of each neighbour's mean-price box stands the level as a mark, as the growth
marks of generation stand: "×1.00" in the muted colour at the profile's own prices, "▲ ×1.40"
green above them, "▼ ×0.80" red below. Its tooltip names the profile's mean and says that every
hour is multiplied. It follows the slider and the box as they move (`panel.ts` `growthMark`).

**Consequences:** With D-067 the factor had left the panel; it is back, beside the price it makes.

## D-069 — Latvia's and Lithuania's capacity boxes take the form of Estonia's

**Status:** Accepted · 2026-10-05 · owner ("bring Latvia and Lithuania to a similar look as Estonia"),
on D-059, D-060 and D-065

**Decision:** In Latvia's and Lithuania's boxes too, every class a row of the fleet preset's
source (ERAA 2025) feeds gets a slider, with its icon, its number box, its growth mark and its
bid: Latvia gains biomass CHP and the Daugava cascade; Lithuania biomass CHP, waste,
run-of-river hydro and Kruonis. The note "kept as the preset" is empty for both. Differences
from Estonia, kept on purpose:
- a class is one slider even where ERAA gives it in several rows (its two or three rows of
  solar): the row-by-row sliders of D-059 are for Elering's document;
- the plant's units and the ceiling on run-of-river hydro are Estonia's alone;
- the bid tag of Kruonis is the spread it needs to cycle (60 €/MWh pumped), that of the Daugava
  "water value": neither has a bid of its own.

**Consequences:** Checked in the browser, each slider of the two zones moved and put back with
the run awaited: all move the results and return them to 59.8 / 49.2 / 49.2 €/MWh, except the
Daugava cascade, whose megawatts change nothing — see ERRATA E-063.

## D-070 — The scenario's Daugava: no weekly power limit, and TYNDP 2024's inflow at the record's level

**Status:** Decided · 2026-10-05 · owner ("I accept D-070, make the change and recalculate"):
accepted as proposed and carried out the same day (see *Carried out* below). Proposed earlier
that day by the executor, on ERRATA E-063 (the owner: "yes, sort out the Daugava")

**Context:** In a TYNDP 2024 scenario run the Daugava cascade is given half the water the record
shows and is held to a weekly limit of at most 507 MW, a third of its 1 592 MW; both come from
ENTSO-E's PEMMDB 3.5 workbook, read as labelled, and both are wrong against the record and against
TYNDP 2026's data for the same node (`docs/research/2026-10-05_daugava_scenario.md`).

**Proposed decision:**
1. A scenario run no longer takes the workbook's "maximum generating power" as a limit on the
   cascade: its megawatts and PEMMDB's minimum flow bound it (`build.ts`; the export keeps the
   series, unread).
2. TYNDP 2024's weekly inflow of the node is multiplied by 1.95, the mean ratio of the record's
   output to that inflow in the climate years 2015–2017, as a parameter with its derivation and
   lineage (`data/derived` or `parameters`, to be placed); TYNDP 2026's inflow is left as it is.
3. The golden fixture is re-baselined and the methodology (§5.5, §8.1, §10) and the headline
   figures follow in the same commit.

**Consequences, measured on the opening state:** *Elering: gas* 55.4 / 44.3 / 44.5 €/MWh (EE /
LV / LT) against 59.8 / 49.2 / 49.2; *2 SMR* 43.9 / 40.6 / 41.1 against 45.5 / 44.4 / 44.4; the
cascade delivers 3.10 TWh against 1.49. Two units then lower Estonia's price by 11.5 €/MWh, not
14.3. No validation figure and no fitted parameter moves.

**Alternatives not proposed:** each half alone (little effect: the limit spills the added water,
and without the water there is little to place); a band on the cascade's hourly output taken from
the record, as the replays have (D-044) — stricter, and worth a second step; leaving it and
saying so (the results then rest on a hydro year no record shows).

**Carried out (D-070), 2026-10-05:**
- `app/src/engine/build.ts`: a scenario's cascade is bounded by its megawatts; the weekly
  "maximum generating power" is no longer read (the year files keep it).
- `export/years.py` `daugava_inflow_factor`: the factor is derived from the database, not typed —
  the mean of Latvia's observed hydro output (ENTSO-E A75) over TYNDP 2024's inflow in the climate
  years the record covers in full (2015: 1.934, 2016: 1.990, 2017: 1.918), to two decimals: 1.95.
  The climate-year files carry the inflow times it, with both sources in their lineage;
  `presets.json` `hydro.daugava_inflow_factor` gives the factor, its sources and the three ratios.
- The item 2 "to be placed" is thereby placed in the export; item 3's golden fixture needed no
  re-baseline: its four cases are replays, which take the cascade's observed output.
- Results as the application opens, EE / LV / LT in €/MWh: *Elering: gas* 55.4 / 44.3 / 44.5,
  *1 SMR* 50.2 / 42.0 / 42.3, *2 SMR* 43.9 / 40.6 / 41.1, *3 SMR* 36.7 / 39.8 / 40.5; the plant's
  capture price 51.0, 44.6 and 37.1 €/MWh; Estonia's hours with a fossil price 7.4, 6.0, 3.9 and
  2.1 %. The methodology's §5.5, §9, §9.1 and §10 carry the new figures beside the former ones.
- Figures quoted in earlier records (D-058's 53.4, D-059's and D-064's 59.8 → 60.0 and 61.6,
  D-066's 67.9) were measured before this decision and stand as dated.

## D-071 — The scenario's Daugava is held to the record's weekly band

**Status:** Decided · 2026-10-05 · owner ("make the corridor the default"), on D-044 and D-070

**Context:** After D-070 a scenario's cascade was free between PEMMDB's minimum flow and its
megawatts, where a replay's is held to its own week's band (D-044). The markup and the battery's
cycling cost were fitted on replays with the band; a scenario without it runs those parameters in
another model, and its week's foresight places the water more freely than any recorded week.

**Decision:**
1. A scenario run holds the cascade's hourly output to the band the record shows for a week of
   the same mean output. The export derives it from the database (`export/years.py`
   `daugava_band`): the full weeks of 2020–2025 with a mean above 20 MW (311) are split into
   thirds by their mean, and each third gives the median ratio of the week's 10th and of its 90th
   percentile hour to that mean, to two decimals — up to 181 MW 0.00 and 2.99; up to 365 MW 0.00
   and 2.11; above 0.56 and 1.43 (`presets.json` `hydro.daugava_band`, with its lineage).
2. In the engine (`build.ts`) a week's upper limit is the smaller of the megawatts and the upper
   ratio times the week's mean (never below the mean, so that the water passes), its lower limit
   the larger of PEMMDB's minimum flow and the lower ratio times the mean. It applies to both
   TYNDP families.
3. The free cascade stays as a field of the engine's scenario, `daugavaBand: false`, for a
   sensitivity; the panel has no control for it.

**Consequences, as the application opens** (EE / LV / LT, €/MWh): *Elering: gas* 56.9 / 45.5 /
45.6 against 55.4 / 44.3 / 44.5 with the free cascade; *1 SMR* 51.4 / 43.2 / 43.2; *2 SMR* 44.5 /
41.7 / 41.7 against 43.9 / 40.6 / 41.1; *3 SMR* 36.7 / 40.7 / 40.8. Two units lower Estonia's
price by 12.4 €/MWh (11.5 free; 14.3 before D-070). The plant's capture price: 52.3, 45.2 and
37.2 €/MWh; Estonia's hours with a fossil price 9.4, 7.6, 4.9 and 2.3 %. No validation figure and
no fitted parameter moves; the golden fixture's cases are replays and stand.
The band is the cascade's behaviour of 2020–2025. With dearer peaks its operator may move more
water than then, so the free cascade is the lower edge of the scenario's prices and the band the
upper; the truth lies between, nearer the band. In the panel the cascade's megawatts now matter
only where they are lower than the band's upper limit.

## D-072 — The neighbours' profile on the scenario's gas and CO₂ prices: built as an option, the default the owner's

**Status:** Accepted · 2026-10-06 · owner ("I accept everything", D-078); proposed in the night of 2026-10-05 by the executor, on the owner's
instruction for the night ("Neighbours' prices by fuel", "Full cycle": change the code, record the
decision as proposed). Items 1–3 are built and off by default, so no result moves until the
owner decides item 4. Evidence: `docs/research/2026-10-05_neighbour_fuel_reindex.md`.

**Context:** The owner doubts the level of TYNDP's neighbour prices and has one level factor per
zone to raise them (R-BND-5), which no assumption explains. The market model behind the
profiles ran on other gas and CO₂ prices than the scenario's Baltic plants pay. Reading its
inputs and hydrogen outputs showed which (ERRATA E-064: a gas blend at 33.0 €/MWh thermal of
which 76 % pays for CO₂, CO₂ at 130 €/t, in Distributed Energy 2035) and what they set: besides
the gas plants' hours, the hours in which electrolysers displace hydrogen from steam methane
reformers — 89 % of Finland's hours above 5 €/MWh sit on the electrolyser's relation to the
hydrogen price.

**Decision (proposed):**
1. A scenario run may take a TYNDP 2024 Distributed Energy or Global Ambition profile re-priced
   to its own gas and CO₂ prices (the panel's two boxes, D-064). `build.ts` `repriceKnots`: the
   cost of four steps — electrolysers against reformer hydrogen, electrolysers against imported
   synthetic fuel (which does not move), the market model's most and least efficient gas plant —
   is computed on the model's prices and on the run's; the steps are paired in order of cost; a
   price between two steps moves in proportion; a price at 0 or from 500 €/MWh (the scarcity
   steps of D-007) stays. Every parameter is the market model's own input, read from its
   archives into `parameters.csv` (`boundary.reprice.tyndp2024.*`, 25 rows, each re-extracted by
   `validate/documentary_tyndp.py`); the gas plants' efficiencies are ERAA 2025's standard
   classes, which TYNDP shares. On the run's side all of the gas pays for CO₂, as the Baltic
   plants' does.
2. The level factor stays and multiplies the re-priced profile (the owner kept it in revision
   1.6). The panel's box "Re-price to the scenario's CO₂ and gas prices" stands above the three
   levels; the scenario text carries `neighbours.fuel=scenario` when ticked and nothing
   otherwise, so every earlier text and link means what it meant. National Trends, National
   Trends+ and the actual prices of 2025 have no map; the box is disabled for them.
3. The level from which a neighbour's price counts as fossil (R-SMR-5, D-037) is the market
   model's best gas plant on its own prices, or on the run's when re-priced (E-064).
4. **The owner's:** whether the application opens with the box ticked. It would re-issue every
   scenario figure (below) and needs the specification's R-BND-5 to say so at its next revision;
   R-BND-5 already allows "any other profile … a documented option, labelled as such", which
   covers items 1–2 as an option.

**Consequences if ticked** (opening state, EE / LV / LT, €/MWh): *Elering: gas* 72.1 / 58.2 /
58.2 against 56.9 / 45.5 / 45.6; *1 SMR* 65.4 / 55.8 / 55.9; *2 SMR* 56.5 / 54.3 / 54.4 against
44.5 / 41.7 / 41.7; *3 SMR* 46.1 / 53.3 / 53.4. Two units lower Estonia's price by 15.6 €/MWh
(12.4 as published). The neighbours' means: Finland 50.7 (39.9), SE4 60.2 (45.9), Poland 78.6
(57.2) — factors of 1.27, 1.31 and 1.37, derived, where the specification's slow-build factor
for Poland is 1.4. A plain level factor of the same means gives nearly the same Baltic means
(71.6 / 58.0 / 58.1) and a narrower spread (Estonia's P95 − P5 172 against 180 €/MWh).

**What it does not do:** dispatch the neighbours again (the hours on each step and the fleets —
Finland's 15 GW of electrolysers — are TYNDP's); correct a build-out the owner finds too fast
(the profiles of another target year and the actual prices of 2025 serve that, D-046, D-051);
move coal and oil plants by their own fuels (they move as gas does).

**Alternatives not proposed:** the level factor alone (unexplained; raises scarcity hours and
leaves zero hours, as now); a map with a judged "middle band" (the memo of 2026-10-05; the
hydrogen outputs make the judgement unnecessary); modelling the neighbours (R-BND-1 forbids it).

## D-073 — The replays' third round: the week's least output, Kruonis's weekly power, and the markup as one schedule for Latvia and Lithuania

**Status:** Accepted · 2026-10-06 · owner ("I accept everything", D-078); proposed in the night of 2026-10-05 by the executor, on the owner's
instruction for the night ("Accuracy of Validation", "Full cycle"). The code, the register, the
golden fixture and the documents on this branch carry it; nothing of it is in force until the
owner accepts it, in whole or by item (items 1, 2 and 3 can be taken apart: the steps of the log
are measured one by one). Log: `docs/research/2026-10-05_validation_round3.md`.

**Context:** On the register of D-042 and D-044 the replays miss the hourly price by 12.0–16.7
€/MWh in the fit years and 21.1–22.1 in the blind year 2025 (R-VAL-5: 15). The error was read by
what sets the model's price in the hours it is wrong. In 2025's cheap hours Lithuania's gas ran
110–240 MW in the record against 43–63 in the model, a unit held on line through the
synchronisation; in the dearest hours Kruonis delivered twice the record's megawatts; and the
markup's fit turned out not to be identified by its two fit years (ERRATA E-065).

**Decision (proposed):**
1. *The week's least output.* In a replay each thermal technology runs at least the
   10th-percentile hour of its week's observed output (A75; `thermal_weekly_p10_mw` in the year
   file, `applyObservedFloor` in `build.ts`), where the fitted floor of R-SUP-5 asks for less.
   The decile is D-044's convention for the Daugava; nothing is fitted. Scenario runs keep the
   fitted floor alone.
2. *Kruonis's weekly power.* In a replay Kruonis delivers at most its week's maximum observed
   output and pumps at most that over its round-trip efficiency (`hydro_weekly_max_mw.kruonis`;
   `Storage.dischargeMax`, `chargeMax`; the engine of record and the reference, not the preview).
   It is D-022's reading of a weekly maximum, applied to the one dispatched plant that had its
   nameplate. Scenario runs keep the installed megawatts.
3. *The markup's form and fit* (supersedes D-023 item 2's method; R-SUP-6 keeps its table zone ×
   bin). One schedule for the Latvian and the Lithuanian gas fleet, none for Estonia's gas; each
   fit year gives a schedule alone by D-023's descent and is scored on the other; the register
   holds the mean of the two: 15 / 145 / 235 / 255 €/MWh (`app/scripts/fit_markup.ts`). Δ follows
   from `make fit`: 61.5 €/MWh (61).
4. The golden fixture's 2024 replay is re-baselined on this register (R-VAL-8).

**Before and after** (hourly MAE / duration-curve RMSE, €/MWh; breaches of R-VAL-5):

| Year | Zone | D-042 and D-044 | D-073 |
|---|---|---|---|
| 2023 | EE | 12.0 / 5.3 | 11.9 / 4.2 |
| 2023 | LV | 13.3 / 7.3 | 12.9 / 5.6 |
| 2023 | LT | 12.8 / 7.3 | 12.4 / 5.4 |
| 2024 | EE | 14.9 / 12.1 | 14.2 / 9.9 |
| 2024 | LV | 16.5 / 15.3 | 15.7 / 12.4 |
| 2024 | LT | 16.7 / 16.1 | 15.7 / 12.4 |
| 2025 (blind) | EE | 22.1 / 15.1 | 20.9 / 15.8 |
| 2025 (blind) | LV | 21.7 / 14.6 | 20.5 / 15.5 |
| 2025 (blind) | LT | 21.1 / 14.4 | 19.4 / 15.5 |
| Breaches, 2023 / 2024 / 2025 | | 9 / 15 / 20 | 6 / 14 / 17 |
| 2026, Jan–Aug (no thresholds) | EE / LV / LT | 14.8 / 16.9 / 12.2 | 15.2 / 17.0 / 11.3 |
| Latvian gas, TWh (observed 1.35 / 1.60 / 1.57) | | 1.13 / 1.13 / 1.17 | 1.30 / 1.51 / 1.43 |
| EstLink 2 effect 2024, €/MWh (gate 15–30) | | 23.3 | 24.1 |
| Golden fixture, 2024 replay: MAE; duration-curve RMSE; Latvian gas | | 14.9 / 16.5 / 16.7; 12.1 / 15.3 / 16.1; 1.13 TWh | 14.2 / 15.7 / 15.7; 9.9 / 12.4 / 12.4; 1.51 TWh |

**What the owner should know before signing:**
- The gate is still not met. 2023 holds; 2024 misses the MAE by 0.7 €/MWh in Latvia and
  Lithuania; the blind year misses it by 4–6.
- The blind year's dear hours did not gain: its share of hours at or above 150 €/MWh fell from
  9.3–10.8 to 7.6–9.0 % (observed 14.0–14.4), its duration-curve RMSE rose by 0.7–1.1, and
  Estonia's mean price is 5.9 €/MWh too low (0.9 before). More plant held running lowers peaks
  as well as cheap hours.
- The second blind year does not confirm item 1: January–August 2026 has Estonia 0.3 and Latvia
  and Lithuania 0.1–0.2 €/MWh worse with it, where the model's prices are already too low.
  Items 2 and 3 help that year (−1.0 on its sum).
- Item 3 is a choice of method, not a better fit: on the fit years its schedule gives 82.77
  where the former `make fit` gives 81.32 — and 60.81 against 61.88 on the blind year, 43.49
  against 45.99 on 2026. The log's table has every candidate.
- The scenario view moves with the register: *Elering: gas* opens at 55.9 / 44.6 / 44.6 €/MWh
  (56.9 / 45.5 / 45.6), *1 SMR* 50.9 / 42.8 / 42.8, *2 SMR* 44.2 / 41.4 / 41.5 (44.5 / 41.7 / 41.7),
  *3 SMR* 36.7 / 40.7 / 40.7; two units lower Estonia's price by 11.7 €/MWh (12.4). Estonia's
  former markup, fitted on 6–10 MW of gas engines, was carried by the 1 364 MW of gas of S1.
  Estonia's hours with a fossil price: 9.3, 7.3, 4.5 and 2.1 % (8.2, 6.8, 4.3 and 1.9 after
  E-064). With the neighbours' profile re-priced (D-072): 70.1 / 56.9 / 56.9 and, for *2 SMR*,
  55.7 / 53.9 / 54.0.
- Each item takes more from the record (R-VAL-3 lists what a replay takes): a quantity, never a
  price of a core zone (R-BND-3).

**Alternatives not proposed:** the former `make fit` on items 1–2 (above); the week's least
output in place of the fitted floor (worse in 2023–2025, better in 2026); a megawatt figure for
Kruonis (a knob); a higher Kruonis Δ (the plant stops running); the Daugava held to each day's
energy (no gain in MAE). All in the log.

## D-074 — A scenario's oil shale carries no heat floor, and its waste plants run as given output

**Status:** Accepted · 2026-10-06 · owner ("I accept everything", D-078); proposed in the night of 2026-10-05 by the executor, on the owner's
instruction for the night ("Audit of the TYNDP data", "Full cycle"), on ERRATA E-066 and E-067.
Built on this branch after D-073; the two items can be taken apart. Evidence:
`docs/research/2026-10-05_scenario_inputs_audit.md`.

**Context:** The audit set the opening scenario's energy by class beside the record. Two classes
did what no plant of theirs does: Auvere ran 1.44 TWh a year as must-run at a CO₂ price of
197.5 €/t, and the waste plants ran at 2–4 % of their capacity.

**Decision (proposed):**
1. The fitted floor of the oil-shale classes (D-022 item 2) applies in replays only
   (`applyChpFloor`). It is the record of the Narva plants — the town's heat and the minimum load
   of committed units; a scenario's oil shale is the 270 MW of Auvere, a condensing unit, which
   runs on its bid. The floors of gas and biomass CHP stay in scenario runs (R-SUP-5).
2. In a scenario run the waste class is given output, as in a replay (D-013): its megawatts
   times (1 − forced-outage rate) × (1 − planned weeks / 52) of its technology row (DEA: 1 % and
   2.58 weeks, 0.943). A sampled year of the adequacy tab takes its units out instead. The panel
   shows "given output" where the class's bid stood.

**Consequences** (opening state, EE / LV / LT, €/MWh; before = D-073's register alone):

| | Before | After |
|---|---|---|
| *Elering: gas* | 55.9 / 44.6 / 44.6 | 57.6 / 45.3 / 45.3 |
| *1 SMR* | 50.9 / 42.8 / 42.8 | 53.3 / 43.2 / 43.2 |
| *2 SMR* | 44.2 / 41.4 / 41.5 | 47.7 / 41.6 / 41.7 |
| *3 SMR* | 36.7 / 40.7 / 40.7 | 40.9 / 40.5 / 40.6 |
| Two units lower Estonia's price by | 11.7 | 9.9 |
| Estonia's hours with a fossil price, % | 9.3 / 7.3 / 4.5 / 2.1 | 9.8 / 8.1 / 6.2 / 3.7 |
| Estonian oil shale, TWh | 1.44 | 0.00 |
| Waste, Estonia and Lithuania, TWh | 0.01 and 0.01 | 0.14 and 0.49 |
| The plant's output under the clause, 2 SMR, TWh (1995 / 2008 / 2009; 5.05 without) | 4.55 / 4.67 / 4.73 | 4.62 / 4.72 / 4.77 |
| D-072's box ticked: *Elering: gas*; *2 SMR* | 70.1 / 56.9 / 56.9; 55.7 / 53.9 / 54.0 | 71.9 / 57.4 / 57.4; 60.2 / 53.9 / 54.0 |

Item 1 alone: 58.2 / 46.0 / 46.1 and, for *2 SMR*, 48.1 / 42.2 / 42.3; item 2 alone lowers every
price by 0.3. No replay moves: the validation figures, the register and the golden fixture are
those of D-073.

**What the owner should know:** the plant's effect on the Estonian price is smaller without
Auvere's must-run output beside it — 9.9 €/MWh for two units where every figure quoted so far
(14.3, 12.4, 11.7) had it. The audit's largest finding is not in this decision: Lithuania's
onshore wind at PECD's capacity factor, 0.61 of which the record's fleet delivers (OPEN-2); at
0.80 of the factor Latvia's and Lithuania's opening price is 5 €/MWh higher.

**Alternatives not proposed:** a must-run share for Auvere fitted on its own record (it has
none apart from the fleet's); waste at the record's capacity factor per zone (the scenario's
megawatts are not the record's plants); a factor on Lithuania's run-of-river inflow, which
TYNDP 2024 puts 1.4 times above the record's mean (one overlapping year; the effect is 0.2–0.3
€/MWh).

## D-075 — From the Nordic flow-based go-live a boundary price is the virtual hub's at the Nordic end of the cable

**Status:** Accepted · 2026-10-06 · owner ("I accept everything", D-078); proposed in the night of 2026-10-05 by the executor, in the round of D-073
("Accuracy of Validation", "Full cycle"; the owner allowed new APIs for the night: "you can connect any api to reach the goal"). In its own commit, so that it can be refused alone.
**It touches a hard rule** — AGENTS.md §2 and R-BND-3: "Boundary zones use their own observed
prices in calibration years and nothing else" — and therefore needs the owner's ruling, not
only his acceptance of a figure. Log: `docs/research/2026-10-05_validation_round3.md` (S16).

**Context:** R-BND-3 takes a boundary zone's observed day-ahead price (ENTSO-E A44) as the price
at the Baltic end of its cable. That held to the cent wherever a cable was below its limit
until 29 October 2024. Since the Nordic flow-based go-live the market couples NordBalt and
EstLink at virtual hubs (SE4_NB, FI_EL), and the hub's price is the zone's less the binding
constraints' shadow prices times the difference of their PTDFs. Lithuania's price has equalled
SE4's in 5–11 % of the hours NordBalt's schedule lay inside its capacity, and the hub's in
72–99 %. The replays of November 2024 onwards therefore traded at a price the cable did not
see: off by more than 1 €/MWh in a third of hours, by about 4–7 €/MWh where it is.

**Decision (proposed):**
1. In a replay the boundary price of SE4 and of Finland is, from 2024-10-29, the price at the
   virtual hub: the zone's A44 price plus the network constraints' part of the hub's spread,
   − Σ shadow price × (PTDF_hub − PTDF_zone) over the constraints JAO reports as binding, hourly
   means of the market time units. The cable's own constraints — those named for the hub or
   lying between it and its zone: capacity, ramping, allocation limits — are left out: the model
   has them as the transfer capacity, and with them the "boundary price" would be the Baltic
   price itself.
2. Source: JAO's Nordic publication tool, endpoint `fbDomainShadowPrice` with the filter
   `HasShadowPrice` (the source is registered; 23 monthly files, 526 MB of raw cache, each with
   its lineage record; `pipeline/sources/jao.py` `hub_spreads`, `db/build.py`, `jao_series`
   `spread_SE4_NB` and `spread_FI_EL`; `export/years.py` adds it to `boundary.<zone>.observed`
   and says so in the year file's notes).
3. R-BND-3's sentence to read, at the next revision: "In calibration years P_k is the observed
   price at the boundary zone's end of the link: the zone's day-ahead price (ENTSO-E A44) and,
   where the market couples the link at a virtual hub of a flow-based region, that hub's price
   as the region's published shadow prices and PTDFs give it, the link's own constraints left
   out." No observed price, flow or schedule of a core zone enters it.
4. The profile of actual prices of 2025 (D-051) stays the series that year's replay takes, so
   it is the hub's price too (the SE4 mean of 2025 moves by −0.17 €/MWh). TYNDP's profiles and
   Poland are not touched.

**Before and after** (D-073's register in both columns; `make fit` returns the same markup and
Δ, so no scenario figure moves):

| Hourly MAE / duration-curve RMSE, €/MWh | Zone prices at the cables | The hub's price (D-075) |
|---|---|---|
| 2023, EE / LV / LT | 11.9 / 12.9 / 12.4; 4.2 / 5.6 / 5.4 | the same |
| 2024 | 14.2 / 15.7 / 15.7; 9.9 / 12.4 / 12.4 | 14.1 / 15.6 / 15.5; 10.1 / 12.6 / 12.6 |
| 2025 (blind) | 20.9 / 20.5 / 19.4; 15.8 / 15.5 / 15.5 | 20.5 / 19.8 / 18.6; 15.4 / 15.1 / 14.8 |
| 2026, Jan–Aug | 15.2 / 17.0 / 11.3 | 15.2 / 16.6 / 10.4 |
| Breaches, 2023 / 2024 / 2025 | 6 / 14 / 17 | 6 / 15 / 14 |
| Golden fixture, 2024 replay | 14.2 / 15.7 / 15.7; 9.9 / 12.4 / 12.4 | 14.1 / 15.6 / 15.5; 10.1 / 12.6 / 12.6 |

**What the owner should weigh:**
- *For:* it is the price the cable trades at, published by the Nordic capacity calculator and
  computed from Nordic quantities alone; it restores for 2025–2026 exactly what R-BND-3 gave
  before the go-live (equality to the cent where the cable is free); every zone and year gains
  or stands, the blind years most.
- *Against:* it is a second observed input beside A44 on that border, and a derived one
  (526 MB of JAO files behind one hourly number); where a cable is free the hub's price *is* the
  Baltic price by the market's own construction — as SE4's was until 2024, but a reader who
  counts inputs will count this one. Estonia's duration curve of 2024 crosses its threshold by
  0.1 with it.
- The observed congested shares change with the yardstick: against the hub's price NordBalt was
  at its limit towards Lithuania in 58 % of 2025's hours (73 % against SE4's price) and EstLink
  towards Estonia in 65 % (68 %).

**Alternatives not proposed:** the whole spread, with the cable's own constraints (the Baltic
price itself where the coupling is free: fit by construction, which D2 forbids); the day-ahead
schedule as the cable's capacity in the hours a network constraint binds (R-BND-1: no observed
flow enters); leaving it and saying so (the replays of 2025–2026 then carry an error the
record explains).

## D-076 — From the Core flow-based go-live Poland's boundary price is the price its interconnectors clear at, net of Poland's allocation constraint

**Status:** Accepted · 2026-10-06 · owner ("I accept everything", D-078); proposed in the night of 2026-10-06 by the executor, in the round of D-073
("Accuracy of Validation", "Full cycle"; the owner allowed new APIs for the night). In its own
commit, so that it can be refused alone. **It touches the same hard rule as D-075** — AGENTS.md
§2 and R-BND-3: "Boundary zones use their own observed prices in calibration years and nothing
else" — and goes one step further than D-075: the quantity it adds is not published as such but
derived from four published series. It needs the owner's ruling. Log:
`docs/research/2026-10-05_validation_round3.md` (S17); ERRATA E-069.

**Context:** PSE limits Poland's net import and export in the day-ahead coupling (the
"allocation constraint"; JAO publishes the two limits per hour, and the import limit was 0 MW in
a quarter of the hours of 2024). The limit is on Poland's net position over all its borders, not
on any border, so when it binds Poland's price parts from the price its interconnectors clear
at, and transit through Poland is not restricted (Magnus Energy, "Core Flow-Based Market
Coupling 18 months since go-live", 2023-12-21, which counts it limiting in 78 % of the hours of
2022, 72 % for export, and 47 % of 2023, 40 % for import). The record shows it on LitPol: in the
hours the link's schedule lay inside its capacity Lithuania's price was within 1 €/MWh of
Poland's in 53, 64 and 76 % (2023, 2024, January–September 2025), and in a fifth of all hours
of 2023–2024 the link was not full while Lithuania cleared 27–33 €/MWh below Poland — sometimes
importing from it. The replays took Poland's zone price (A44) there, and in those hours the
model's Lithuanian price was 15 €/MWh too high (`spikes/validation-round2/litpol.ts` at the
commit before this one).

**Decision (proposed):**
1. In a replay Poland's boundary price is, from 2022-06-09 (the Core flow-based go-live), its
   A44 price less the shadow price of Poland's allocation constraint, hourly means of the market
   time units.
2. The shadow price is derived, since no publication gives it: Poland's price less Germany's
   (JAO Core `priceSpread`, border_DE_PL) less the network's part of that spread,
   Σ shadow price × (PTDF_DE − PTDF_PL) over the Core constraints that bound the hour
   (`shadowPrices`). It is read only where the published limit could bind — where Poland's Core
   net position (`netPos`) lies within 1 100 MW, the rated power of SwePol Link and LitPol Link
   together, of the import limit (a positive shadow price) or of the export limit (a negative
   one; `allocationConstraint`) — and is 0 elsewhere. The guard has no fitted number: at 1 200
   and 1 500 MW the test below gives the same shares within half a point.
3. Source: JAO's Core publication tool, registered with the Nordic one (208 monthly files,
   292 MB of raw cache, each with its lineage record; `pipeline/sources/jao.py` `core_spread`,
   `db/build.py`, `jao_series` `spread_PL`; `export/years.py` adds it to `boundary.PL.observed`
   and says so in the year file's notes).
4. R-BND-3's sentence, as D-075 item 3 words it, to gain at the next revision: "…and, for a
   zone whose net position the market limits by an allocation constraint, the zone's price less
   that constraint's shadow price as the region's published prices, shadow prices, PTDFs, net
   positions and limits give it." No observed price, flow or schedule of a core zone enters it.
5. The profile of actual prices of 2025 (D-051) stays the series that year's replay takes, so
   Poland's is the clearing price too (its mean of 2025 moves by −7.4 €/MWh). TYNDP's profiles
   are not touched: its market model has no such limit.
6. `make fit` ran on the new replays, as after every change of them. The markup of the Latvian
   and Lithuanian gas moves from 15 / 145 / 235 / 255 to 40 / 195 / 315 / 335 €/MWh (each fit
   year alone: 40 / 70 / 190 / 190 and 40 / 320 / 440 / 480; left-out sum 83.79 → 63.61) and the
   batteries' Δ from 61.5 to 61. The scenario figures move with the markup.

**The test** (`spikes/validation-round2/pl_check.py`; Lithuania's price is compared here, never
fed in):

| | 2022 from 9 June | 2023 | 2024 | 2025 to September |
|---|---|---|---|---|
| The limit binds: import / export, share of hours | 7 / 72 % | 41 / 7 % | 35 / 3 % | 26 / 2 % |
| Clearing price less Poland's, mean €/MWh | +101.5 | −10.3 | −7.9 | −7.6 |
| LitPol inside its capacity: LT within 1 €/MWh of Poland's price | 22 % | 53 % | 64 % | 76 % |
| … of the clearing price | 75 % | 86 % | 90 % | 91 % |
| LitPol at its import limit: LT not below Poland's price / the clearing price | 95 / 98 % | 70 / 92 % | 72 / 96 % | 81 / 96 % |
| LitPol at its export limit: LT not above Poland's price / the clearing price | 37 / 99 % | 95 / 98 % | 96 / 97 % | 95 / 95 % |

From October 2025 the hourly means of the 15-minute market are not comparable (31 and 40 %).

**Before and after** (before: the head of the night's branch, D-073 with D-075; after: this
decision with the register refitted on it):

| Hourly MAE / duration-curve RMSE, €/MWh | Poland's zone price | The clearing price (D-076) |
|---|---|---|
| 2023, EE / LV / LT | 11.9 / 12.9 / 12.4; 4.2 / 5.6 / 5.4 | 9.6 / 9.4 / 8.9; 3.5 / 3.2 / 2.9 |
| 2024 | 14.1 / 15.6 / 15.5; 10.1 / 12.6 / 12.6 | 10.9 / 12.0 / 12.0; 8.0 / 10.1 / 10.0 |
| 2025 (blind) | 20.5 / 19.8 / 18.6; 15.4 / 15.1 / 14.8 | 20.0 / 18.8 / 18.0; 12.5 / 11.4 / 10.9 |
| 2026, Jan–Aug | 15.2 / 16.6 / 10.4 | 15.1 / 16.3 / 10.7 |
| 2022 (diagnostic) | 22.2 / 33.8 / 32.1 | 21.3 / 20.2 / 17.1 |
| 2020; 2021 (diagnostic, no clearing price: the markup alone) | 12.8 / 13.9 / 13.9; 11.6 / 12.0 / 10.9 | 15.1 / 16.6 / 16.6; 12.9 / 14.1 / 12.9 |
| Breaches, 2023 / 2024 / 2025 | 6 / 15 / 14 | 9 / 10 / 14 |
| EstLink 2 effect, 2024 (gate 15–30) | 24.1 | 19.9 |
| Markup, LV and LT gas; Δ | 15 / 145 / 235 / 255; 61.5 | 40 / 195 / 315 / 335; 61 |
| *Elering: gas*, EE / LV / LT | 57.6 / 45.3 / 45.3 | 58.1 / 45.8 / 45.8 |
| *1 SMR*; *2 SMR*; *3 SMR* | 53.3 / 43.2 / 43.2; 47.7 / 41.6 / 41.7; 40.9 / 40.5 / 40.6 | 53.7 / 43.6 / 43.7; 48.0 / 41.9 / 42.0; 41.1 / 40.8 / 40.8 |
| Two units lower Estonia's price by | 9.9 | 10.1 |
| With D-072's box ticked: gas; 2 SMR | 71.9 / 57.4 / 57.4; 60.2 / 53.9 / 54.0 | 72.5 / 58.0 / 58.1; 60.5 / 54.4 / 54.5 |
| Golden fixture, 2024 replay | 14.1 / 15.6 / 15.5; 10.1 / 12.6 / 12.6 | 10.9 / 12.0 / 12.0; 8.0 / 10.1 / 10.0 |

On the first test, a scratch download of 2024 with the markup as it was, the clearing price
alone gave 11.2 / 12.5 / 12.4 for 2024: most of the gain is the price, not the refit. The other
way round, Poland's zone price put back into the replays on the refitted register (after D-077)
gives 20.3 / 18.7 / 18.5 for 2025 against 19.6 / 17.7 / 17.5 and 14.1 / 10.4 / 9.4 for 2026
against 14.1 / 10.3 / 9.2: the price helps both blind years on its own; what 2026 lost in the
table above (10.4 → 10.7 in Lithuania) was the markup.

**What the owner should weigh:**
- *For:* it is the price the cable trades at, and the largest single gain of the calibration
  since M3: the fit years now meet the MAE threshold in every zone, 2022 becomes readable, and
  the model is ahead of v4 in every zone of every year. LT–PL's net flow, which missed in every
  year, holds in 2024 and 2025. The mechanism is documented by a third party and the limits are
  published by the TSO that sets them; nothing Baltic enters.
- *Against, the rule:* this is a derived quantity. Its chain — a spread, less a sum over
  published constraints, kept where a feasibility test passes — is longer than D-075's, and its
  proof that the chain is right is the Lithuanian price itself (the table above). The figure
  is not fitted to that price, but it was accepted because it matches it. Where LitPol is free
  the clearing price *is* Lithuania's price by the market's construction, as with D-075.
- *Against, the side effects:* (a) the refitted markup holds Latvian gas at 1.13 / 1.34 / 1.29 TWh
  against 1.35 / 1.60 / 1.57 observed — outside the tolerance in every year, where it held before
  — and Lithuanian gas misses in all three; 2023 has 9 breaches, not 6. (b) The model's mean
  price is now 2–5 €/MWh too low in 2023–2024 (it was within 2.5 either way): Poland's zone price had been
  lifting it. (c) The EstLink 2 effect of 2024 falls from 24.1 to 19.9 €/MWh — inside the gate,
  nearer Elering's 18 — and the model's Estonian price in the outage hours is 78.1 against 83.0
  observed, where it had matched. (d) 2020 and 2021, without a clearing price, lose 1–3 €/MWh to
  the higher markup. (e) The blind year gains little (0.5–1.0): the gate R-VAL-5 stays unmet on
  2025.
- The scenario figures move by 0.2–0.5 €/MWh through the markup only.

**Alternatives not proposed:** the unguarded residual (it reads the Core's unexplained spreads
as the constraint in about 640 hours of 2024 and spoils 400 hours in which Lithuania cleared at
Poland's price; 82.7 % within 1 €/MWh against the guarded 89–90 %); a threshold on the published
limit chosen for the best match (fitted to the Baltic price: D2 forbids it); Poland's total net
position, which decides exactly whether the limit binds (it needs LitPol's own schedule: no
observed flow of a core zone enters, R-BND-1); keeping the register of D-073 with the new price
(the register is what `make fit` gives on the replays as they are).

## D-077 — A replay does not take the balancing allocation off LV–LT's published capacity

**Status:** Accepted · 2026-10-06 · owner ("I accept everything", D-078); proposed in the night of 2026-10-06 by the executor, in the round of D-073
("Accuracy of Validation", "Full cycle"). In its own commit, so that it can be refused alone.
**It narrows a requirement of the specification** — R-LINK-5: the allocation "is subtracted from
the AC borders' NTC in observed years" — to the one border where the record supports it, and
needs the owner's word for that. Log: `docs/research/2026-10-05_validation_round3.md` (S18);
ERRATA E-070.

**Context:** since the Baltic balancing capacity market (2025-02-05) the Baltic Transparency
Dashboard reports cross-border capacity allocated to aFRR and mFRR on EE–LV and LV–LT, and
R-LINK-5 has a replay take it off both borders' A31. In the replay of January–August 2026 LV–LT
then parted its two prices in 34 % of hours where the record does in 6 %, and Estonia's and
Latvia's prices stood 13 €/MWh too low. The record's day-ahead schedules say which capacity the
market stopped at (`spikes/validation-round2/reserve_check.py`; hours within 1 MW, in brackets
those in which the receiving zone was the dearer):

| | EE→LV, at A31 | at A31 less the allocation | above that | LV→LT, at A31 | at A31 less the allocation | above that |
|---|---|---|---|---|---|---|
| 2025-02-05 to 2025-09 (5 712 h) | 0 | 696 (681) | 291 | 25 (25) | 5 (0) | 307 |
| 2025-10 to 2025-12 | 1 | 73 (65); less mFRR alone 264 (262) | 866 | 0 | 1 (0) | 187 |
| 2026-01 to 2026-08 (5 832 h) | 0 | 905 (897) | 698 | 125 (125) | 15 (0) | 1 387 |

EE–LV's schedule never reaches A31 and is held at A31 less the allocation; LV–LT's is held at
A31 itself (towards Latvia too: 104 of 107 congested hours of February–September 2025, 39 of 71
in 2026), never at A31 less the allocation, and lies above that in a quarter of the hours of
2026 by 195 MW on average. LV–LT's A31 is published without the allocation; EE–LV's with it.

**Decision (proposed):**
1. A replay takes the balancing allocation off EE–LV's A31 and not off LV–LT's
   (`export/years.py` `RESERVED_BORDERS`; the year file no longer carries
   `borders.LV-LT.reserved_*`).
2. R-LINK-5 to read, at the next revision: "…allocated to balancing on EE–LV is subtracted from
   that border's NTC in observed years; LV–LT's published NTC is already without it."
3. Scenario years are not changed (R-LINK-5's means of 2025 off the capacities built from the
   lines): without LV–LT's 272 MW the opening scenarios give the same prices to 0.1 €/MWh.
4. `make fit` ran: the markup is unchanged (its fit years have no allocation); the batteries'
   Δ, fitted on the replay of 2026, moves from 61 to 67 €/MWh, and with it the scenario figures
   by at most 0.1 €/MWh.

**Before and after** (before: D-076's commit):

| Hourly MAE / duration-curve RMSE, €/MWh | Allocation off both borders | Off EE–LV alone (D-077) |
|---|---|---|
| 2023; 2024 | 9.6 / 9.4 / 8.9; 10.9 / 12.0 / 12.0 | the same |
| 2025 (blind) | 20.0 / 18.8 / 18.0; 12.5 / 11.4 / 10.9 | 19.6 / 17.7 / 17.5; 12.1 / 11.1 / 11.3 |
| 2026, Jan–Aug | 15.1 / 16.3 / 10.7 | 14.1 / 10.3 / 9.2 |
| LV–LT's two prices apart, model / record: 2025; 2026 | 14 / 2 %; 34 / 6 % | 2 / 2 %; 6 / 6 % |
| Breaches, 2023 / 2024 / 2025 | 9 / 10 / 14 | 9 / 10 / 15 |
| EstLink 2 effect, 2024; 2025 | 19.9; 39.9 | 19.9; 39.3 |
| Δ of the batteries | 61 | 67 |
| *Elering: gas*; *2 SMR*, EE / LV / LT | 58.1 / 45.8 / 45.8; 48.0 / 41.9 / 42.0 | 58.2 / 45.9 / 45.9; 48.0 / 42.0 / 42.1 |
| Two units lower Estonia's price by | 10.1 | 10.2 |
| Golden fixture, 2024 replay | 10.9 / 12.0 / 12.0; 8.0 / 10.1 / 10.0 | the same at this rounding |

**What the owner should weigh:**
- *For:* the published capacity is the input the specification means, and the question here is
  only what the published number already contains; the record answers it in every period and
  both directions. The second blind year gains 6.0 €/MWh in Latvia and the first 1.2.
- *Against:* the evidence is the record's own day-ahead schedule of a core border — used to
  read the definition of an input, not as an input, as D-042 used the cables' prices. Lithuania's
  duration curve of 2025 rises by 0.4 and LV–LT's net flow of 2025 (0.18 against 0.29 TWh)
  becomes the year's fifteenth breach. Why Litgrid's and AST's A31 differs from Elering's and
  AST's in this was not looked up; a line from the TSOs would settle it.
- *Not done:* on EE–LV the schedule lies above A31 less the allocation in 290–870 hours of each
  period, by 30–45 MW, and in October–December 2025 it was held at A31 less mFRR alone: the aFRR
  part is not always taken. Left as it is; in 2026 EE→LV is at its limit in 49 % of the model's
  hours against 37 % of the record's.

**Alternatives not proposed:** taking half of it (no reading of the record supports a share);
dropping it on both borders (EE–LV's schedule never reaches A31).

## D-078 — The owner accepts the night's six decisions; specification revision 1.9

**Status:** Accepted · 2026-10-06 · owner ("I accept everything"), on D-072 to D-077

**Context:** The night of 2026-10-05/06 put six decisions to the owner on branch
`night/2026-10-05`, each in its own commit: the neighbours' profile re-priced to the scenario's
gas and CO₂, built and off by default (D-072); the replays' third round — the week's least
output, Kruonis's weekly power, one markup for Latvia and Lithuania (D-073); a scenario's oil
shale without the heat floor and its waste plants as given output (D-074); the price at the
Nordic end of NordBalt and EstLink (D-075); the price at the Polish end of LitPol net of
Poland's allocation constraint (D-076); the balancing allocation taken off EE–LV's published
capacity and not off LV–LT's (D-077). The morning report named the four rulings they asked
for: R-BND-3's reading (D-075 and D-076, the second a derived quantity), R-LINK-5's narrowing
(D-077), D-072's default, and the refitted register that the corrected replays give. Asked
"what do I need to decide?", the owner answered "I accept everything".

**Decision:**
1. D-072 to D-077 are accepted as proposed. D-072 stays off by default, as proposed; whether
   it becomes the default is a separate question the owner has not answered.
2. The golden fixture's re-baselines of the 2024 replay are signed off (R-VAL-8; the tables of
   D-073, D-075 and D-076).
3. The register in force is the one `make fit` gives on the replays as they are: the markup
   of the Latvian and Lithuanian gas 40 / 195 / 315 / 335 €/MWh, Estonia's none, the batteries'
   Δ = 67 €/MWh (D-073's method, D-076's and D-077's replays).
4. Specification revision 1.9 records the rulings: R-BND-3 as D-075 item 3 and D-076 item 4
   word it, R-LINK-5 as D-077 item 2 words it, R-SUP-4 and R-SUP-5 for a scenario's oil shale
   and waste (D-074), R-BND-5 for the re-priced profile (D-072). AGENTS.md's hard rule follows
   R-BND-3. The other wording corrections the errata hold for "the next revision" (E-029 to
   E-061) are not in 1.9; they wait for a fuller revision the owner asks for.
5. The branch is fast-forwarded into `main`; nothing is pushed.

**Consequences:** The figures of methodology §6, §7, §9, §9.1 and §10 are those of the branch
(D-076's and D-077's tables): hourly MAE 9.6 / 9.4 / 8.9 (2023), 10.9 / 12.0 / 12.0 (2024), 19.6 /
17.7 / 17.5 (blind 2025), 14.1 / 10.3 / 9.2 (January–August 2026); R-VAL-5 is met in the fit
years and not in the blind year, so results with the plant stay inside the repository (R-SMR-8);
R-VAL-6 and R-ENG-8 are met. *Elering: gas* opens at 58.2 / 45.9 / 45.9 €/MWh, *2 SMR* at 48.0 /
42.0 / 42.1. ERRATA E-064 to E-070 are closed by the merge. Left with the owner, named in the
morning report: Estonian oil shale's bids since the strategic reserve (research log, "Where
Estonia's error sits since September 2025"), the markup's form (February 2025), OPEN-2, the
electrolysers of D-011, the hours above 250 €/MWh.

## D-079 — The application opens with the neighbours' profile re-priced to the scenario's gas and CO₂ prices; specification revision 2.0

**Status:** Accepted · 2026-10-06 · owner ("D-072 — switch on the recalculation of the neighbours' prices by default. A full revision of the specification. get started"), on D-072 and D-078

**Context:** D-072 built the re-priced profile and left it off by default; D-078 accepted it as
built. The memo of 2026-10-06 (`docs/research/2026-10-06_neighbour_price_memo_v2.pdf`) put the
default to the owner with a recommendation to switch it on: with it both sides of a border
clear on one gas and one CO₂ price, and the level factor is no longer the only way to express
the doubt about TYNDP 2024's fuel prices; against it, the neighbours are not dispatched again
and the headline figures move away from the published TYNDP prices. The owner chose the
default on, and asked at the same time for the fuller revision of the specification that D-078
item 4 had left for him to call.

**Decision:**
1. The opening state carries `neighbourFuel: true` (`app/src/state/model.ts` `opening`). The
   choice is kept when the user changes the profile; the engine applies it to the profiles it
   can re-price (TYNDP 2024 Distributed Energy and Global Ambition) and to no other
   (`engineScenario`, `REPRICED`). A replay cannot re-price.
2. The scenario text always carries `neighbours.fuel=scenario|published` for a scenario run; a
   text without the key reads as published, so older share links keep their meaning.
3. The figures the documents publish for the three scenarios are on the re-priced profile; the
   published profile's figures stand beside them where the methodology compares the two (§5.9).
4. Specification revision 2.0: R-BND-5 names the default; the wording corrections held since
   revision 1.8 are carried (R-BND-4, R-ENG-5, R-SUP-5, R-STO-9, R-SMR-4, R-APP-11, R-APP-12,
   R-BND-8, R-APP-1; ERRATA E-038, E-054, E-055, E-056, E-057, E-058, E-059, E-061 closed).

**Consequences** (EE / LV / LT, €/MWh; the register of D-078): *Elering: gas* opens at 72.7 / 58.2
/ 58.2 (58.2 / 45.9 / 45.9 as published), *1 SMR* 67.4 / 56.1 / 56.1, *2 SMR* 60.6 / 54.5 / 54.6
(48.0 / 42.0 / 42.1), *3 SMR* 51.8 / 53.4 / 53.5; two units lower Estonia's price by 12.1 instead
of 10.2; the neighbours' means are Finland 50.7, SE4 60.2 and Poland 78.6 (39.9, 45.9 and 57.2 as
published). The hours with a fossil price in Estonia are 9.7, 8.0, 6.1 and 3.5 % of the four
scenarios, of which a neighbour's price makes up 5.0, 4.4, 3.6 and 2.4 points, at the re-priced
level of 132.8 €/MWh (9.9, 8.3, 6.3 and 3.7 % at the published level). The adequacy, link and
contract figures of methodology §9, §9.1 and §10 are recomputed on the new opening state. No
replay, fit or validation figure moves; the golden fixture is untouched.

## D-080 — A scenario run shows no actual year: the cards and the energy mix carry the model alone

**Status:** Accepted · 2026-10-06 · owner ("remove from the Energy mix, TWh charts in scenario and from the country tiles at the top — actual 2025. since in scenario planning there is no actual"), on D-029
item 5

**Context:** D-029 item 5 put the last complete year of the export, 2025, beside a scenario's
model figures in the country cards and as a second bar in the energy mix, labelled "2025
actual", for reference. The owner now finds the reference out of place: a scenario of 2035 has
no actual year to stand beside.

**Decision:** in a scenario run the application loads no validation file; the cards show the
model's column alone (the third column is not rendered) and the energy mix one bar per country
(`app/src/main.ts`, `app/src/ui/results.ts` `cardsHtml`). A replay keeps the actual year in
both, as before. The *Other* list's "observed / REAL (actual prices): 2025" is a neighbours'
profile, not an actual year, and stays.

**Consequences:** none on any figure; methodology §8 reworded.

## D-081 — Choosing a scenario returns the demand and capacity sliders to the scenario's presets

**Status:** Accepted · 2026-10-06 · owner ("it is needed that when I switch scenarios the model resets the sliders to those set by default in the scenario"), on D-036 and D-058

**Context:** The scenario chips (*Elering: gas*, *1 SMR*, *2 SMR*, *3 SMR*, in the run box and
as the unit chips of Estonia's capacity box) changed the scenario alone and kept every slider
the user had moved. A January of climate year 2008 at 23 €/MWh, asked about on 2026-10-06, came
from 1 001 MW of Estonian offshore wind left on the sliders from an earlier exploration; the
owner wants a scenario to open on its own presets.

**Decision:** a scenario chip sets the scenario and returns every zone's demand (preset,
multiplier, firm block) and capacities (fleet, megawatts, battery energy, electrolysis,
power-to-heat) to the opening state's (`panel.ts` `choose`: `zones = opening(p).zones`). The
neighbours' profile, levels and re-price choice, the fuel path and prices, the links, the storage
parameters and the contract settings stay as the user left them. The hint under the unit chips
says so.

**Consequences:** none on any figure. A user who moves a slider to see its effect across the
plant's scenarios reads it from the four-scenario table, which runs the four on the current
sliders (D-036); the chips are for choosing the scenario shown.

## D-082 — The four scenarios are one table, not four cards

**Status:** Accepted · 2026-10-06 · owner ("wouldn't it be better to make it as a table, it will be more compact than starting every tile the same way"), on D-036 and D-058

**Decision:** the scenario view's four-scenario comparison is one table: a row per figure (the
three zones' prices, Estonia's net import, CO₂, curtailment, the hours with a fossil price in
Estonia, the plant's capture price), a column pair per scenario — its figure and, except for
*Elering: gas*, the difference to it — with the scenario's button at the head of its pair and
the scenario shown marked by its column (`results.ts` `trioHtml`, `theme.css` `.trio`). The
figures and their weighting are unchanged. The same day the owner asked for the table as wide
as the results, the unit inside each cell, differences coloured by whether they move the good
way — green when the price, the import, the CO₂, the curtailment or the share of fossil hours
falls, red when it rises — and the row and column under the pointer lit as a crosshair, the cell
itself most ("stretch the table to the width of the window … crosshair highlighting … units … in red or green"; "units of measurement … inside the cells"; "the most central cell is highlighted the most"; "let a price decrease be green … let an increase of wind and solar curtailed be red"): done in the same place.

**Consequences:** none on any figure; methodology §8.1 reworded.

## D-083 — The validation view's generation block has the scenario's form

**Status:** Accepted · 2026-10-06 · owner ("harmonise so that validation has the same generation block as scenario"), on D-029 and D-069

**Context:** The scenario view's "Generation and demand" box shows each source as a row with
its icon, a slider, its megawatts, its bid tag and a hint; the validation view showed the
observed year's fleet as a table (class, MW, bid, TWh) under its own heading.

**Decision:** the validation view's zone box is the same "Generation and demand" block: the
zone chips, the demand sliders with their icons, and under "Generation in <year>" a row per
class of the observed fleet in the scenario's order and form — its icon, its installed
megawatts (ENTSO-E A68) on a slider that does not move (the inputs are disabled: a replay keeps
the fleet as it was, R-VAL-1), the bid tag the run gave the class (its fuel, CO₂ and running
costs at the year's prices; "given output" for wind, solar, run-of-river, waste and other;
the storage spread for batteries and Kruonis; "water value" for the Daugava), and under each
row the TWh the model ran (`panel.ts` `zoneBoxes`, `fleetHtml`; `SliderOpt.readonly`). The
table is gone.

**Consequences:** none on any figure; methodology §8 reworded.

## D-084 — The Weather page: where the three climate years come from, and what they are in the Baltic states

**Status:** Accepted · 2026-10-06 · owner ("do a study of how the climate years 1995, 2008, 2009 were chosen and why exactly these years; what data is given by year and what data we use in our model; use the information in a new top tab weather"), on D3,
R-TIME-2 … R-TIME-4

**Context:** The application runs every scenario of the TYNDP 2024 family on the climate years
1995, 2008 and 2009 with ENTSO-E's weights, labels each year by its Estonian rank (R-TIME-4),
and said nowhere why these years. The owner asked for the investigation and for a page that
tells it. The research is `docs/research/2026-10-06_climate_years.md`: the years were selected
by ENTSO-E for TYNDP 2022 among the thirty PECD years 1987–2016 by the residual-load method of
the System Needs Study guidelines (§6.2–6.3: residual load per region and hour, delta
indicators against the thirty, a Euclidean filter to the best 1 % of 4 060 combinations, the
K-Medoids clustering score to choose among them), kept for TYNDP 2024 with the weights 0.233 /
0.367 / 0.400 (7, 11 and 12 years of 30, on the medoid reading), and 2009 named the most
representative; by the guidelines' Dunkelflaute ranking 2009 is Europe's second most stressful
year of thirty, 1995 the fifth, 2008 the twenty-fourth. For Estonia the three sit at the
edges of PECD's 38 years: 1995 and 2008 the windiest but one, 2009 the calmest; 2008 the
second-dullest solar year. The market-model prices of the neighbours exist for these three
years alone, which is why the family can run on no other.

**Decision:**
1. A top-level view *Weather* (`app/src/ui/weather.ts`; R-APP-13, specification revision
   2.1) tells, in ENTSO-E's words with the page cited, where the years and the weights come
   from; shows for each core zone the three years' place among the 38 — onshore and offshore
   wind and solar capacity factors at the 2030 layout, the National Trends demand peak, TYNDP
   2024's hydro inflow, the ERA5 temperature — each with its rank and its lineage id, as bars
   over the 38 years with the three in the accent; and lists what a climate-year file holds
   against what the engine reads. The TYNDP 2026 family's weather scenarios are described for
   contrast. The page is static, drawn once from `presets.json`.
2. The export gains `presets.climate_years` (`export/tables.py` `climate_years`): every PECD
   climate year's figures per zone with lineage, the three selected years' weights, and the
   documentary rows on the selection.
3. Three documents are registered and cached (`pipeline/sources/documents.py`
   `tyndp2022_sbg`, `tyndp2022_iosn_ig`, `tyndp2024_methodology`) and nine rows added to
   `parameters.csv` with their verification records: the Dunkelflaute ranks of 1995, 2008,
   2009 and 2012 (Scenario Building Guidelines, Table 20), the selection's thirty candidate
   years, 4 060 combinations and 1 % preferred share (IoSN guidelines, pp. 42–47), the 2024
   guidelines' "out of 35", and 2009 as the most representative year.

**Consequences:** none on any figure. Methodology §8.6, the research note; R-TIME-2 names the
candidate set at revision 2.1.

## D-085 · 2026-10-06 · v5 deployed at energiamudel.ee/v5, behind the site's password, before the gate

**Context:** the owner: "do the deploy at the address https://energiamudel.ee/v5". D16 and R-DEP-1
put staging on the subdomain `v5.energiamudel.ee` behind HTTP Basic Auth; the vhost was never
created (OPEN-11), and D-039 held every deploy until the owner decided. The validation gate
R-VAL-5 is not met (replays 9–12 and 17–20 €/MWh against 15), so `make deploy`, which required
`make validate`, could not pass. The whole of energiamudel.ee is behind v3's Basic Auth (realm
"Energiamudel", the shared `.htpasswd` above the document roots), so a sub-path of it is as
closed as the subdomain would have been — D16's condition for showing results before the gate.

**Decision:**
1. Staging is `https://energiamudel.ee/v5`, the directory `htdocs/v5` of the v3 site; the
   build's own `.htaccess` keeps the password on it.
2. The build is relative (`base: "./"` in `app/vite.config.ts`), so the same `dist/` runs at any
   path; the fonts, data and workers resolve under `/v5/`.
3. `make deploy` requires `make ci` and the provenance check, not `make validate`, while the site
   stays behind the password; `DEPLOY_URL` is `https://energiamudel.ee/v5`. Opening the site to
   the public still waits for the gate (R-DEP-3, R-SMR-8).
4. v3's production workflow writes `htdocs/` with `rsync --delete`; it must protect `v5/`
   (`--filter='P /v5/'`) or the next v3 deploy deletes v5. The change is v3's
   (`.github/workflows/deploy.yml`), committed there, pushed by the owner.

**Consequences:** none on any figure. R-DEP-1 at specification revision 2.2; OPEN-11 closed by
this decision. The upload itself is the owner's (the server's SSH key is not on this machine).

## D-086 · 2026-10-06 · Each standard sensitivity names what it changes, under an "i"

**Context:** the owner, on the sensitivities' cards: "add an i, hovering over which will show what the scenario proposes". The cards carried a label only; the definitions were in R-APP-11 and a
five-line answer of the FAQ, without the figures.

**Decision:** each card's title has an "i" (the panel's hover tip, `tip(text, "i")`) whose text
is built from the two states, the scenario shown and the sensitivity's (`sensAbout`,
`app/src/ui/results.ts`): a sentence on the sensitivity's rule, then each zone's classes that
move with their megawatts before and after (onshore and offshore wind, batteries, electrolysis),
Poland's level factor, the gas price against the shock's, and that Finland and SE4 stay the
headline's. A class that does not move is not named. The right-hand cards open the tip leftwards.

**Consequences:** none on any figure. It shows what the label hid: on *Elering: gas*, sensitivity
(a) switches on the fleet preset's electrolysis (LV 1 000, LT 1 300 MW), which the headline has
off (D-011), so (a) against (b) is the electrolysis's effect. FAQ and methodology §8 say so.

## D-087 · 2026-10-06 · A Statistics page: ten years of gas, CO₂ and wind and solar build-out, with trend lines to 2040

**Context:** the owner: "add a Statistics tab at the top: the gas price over the last 10 years and a trend line and an extrapolation to the years 2035 and 2040; the CO₂ price …; the commissioning of new wind capacities (onshore and offshore separately) and solar capacities by year in EE, LV, LT, FI, SWE, PL over the last 10 years and a trend line and an extrapolation to the years 2035 and 2040 if the pace is kept … first do a study". The research (`docs/research/2026-10-06_statistics.md`) found the gas series in
the database (World Bank, from 2015), the CO₂ series only from 2020 (EEX auctions; EEX's public
archive holds 2017 on), and no capacity statistics for Sweden and Poland; IRENASTAT's open API has
year-end capacity 2000–2025 for all six countries, onshore and offshore wind apart. Two methods
moved the extrapolated figures by up to a factor of two, so the owner was asked; the answers:
for the capacity "Both options", for the prices "Both lines".

**Decision:**
1. A top-level view *Statistics* (`app/src/ui/statistics.ts`; R-APP-14, specification revision
   2.3). Prices: the monthly TTF price in €/MWh of gas (World Bank at the ECB rate) over the last
   120 months to the Pink Sheet's last month, and the monthly mean EEX auction price of EU
   allowances over the same window from January 2017; for each the least-squares line with its
   R² and the Theil–Sen line, carried to 2040, their values in 2030, 2035 and 2040 beside the fuel
   paths the project holds (ERAA 2025, TYNDP 2024, Svenska kraftnät LMA 2026).
2. Capacity: each year's net addition, 2016–2025, of onshore wind, offshore wind and solar in
   Estonia, Latvia, Lithuania, Finland, Sweden (the whole country) and Poland, from IRENASTAT;
   the least-squares line through the ten additions, carried to 2040; the installed capacity at
   the end of 2035 and 2040 read two ways — *trend*: each year adds the line's value, nothing
   where it is below zero; *pace*: each year adds the mean of 2021–2025 (R-SUP-9's rate) — beside
   the model's assumptions (the scenario view's fleets for 2035 and TYNDP 2024 National Trends for
   2040 in the core zones; TYNDP 2024 Distributed Energy for Finland and Poland; none for Sweden).
3. Data: a new source `irena` (`pipeline/sources/irena.py`, table `capacity_stat`, registered);
   EEX's reports of 2017–2019 fetched (`xlrd` reads their `.xls`; reports without a status column
   count every priced auction); the export's `presets.statistics` (`export/tables.py`
   `statistics`). The page states the IRENA copyright (© IRENA 2026).

**Consequences:** none on any figure of the model: the commodity rows of 2017–2019 lie outside
every replay and scenario, and no other export section changed. The research note compares
IRENA with Eurostat and the national counts: Estonia's solar and Sweden's wind of 2025 run low in
IRENA, and the page says so. Methodology §8.7, FAQ, README (seven views).

## D-088 · 2026-10-06 · "Other" in the run box once the zones leave the scenario's presets

**Context:** the owner: "let it be that if we change something in the scenario then an other button appears instead of the scenario choice". The run box kept *Elering: gas* (or an SMR scenario) pressed after a slider had
moved a zone's demand or capacities away from that scenario's presets, so the button named a
scenario the run no longer was.

**Decision:** while any zone's demand or capacity line of the scenario text differs from the
presets (the lines R-UI-6 marks with `*` that start `EE.`, `LV.` or `LT.`), none of the four
scenario buttons is pressed and a pressed *Other* follows them (`panel.ts` `scenarioChips`).
*Other* does nothing when clicked; a scenario button returns the zones to its presets (D-081),
and *Other* goes. The neighbours, fuel, links and storage settings a scenario button keeps do not
press *Other*. The SMR unit buttons in the generation block still show the units.

**Consequences:** none on any figure. Methodology §8.1.

## D-089 · 2026-10-06 · A bid's tip shows what it is made of

**Context:** the owner: "make it so that on hovering over the bid price it shows what the bid consists of: the CO₂ component and the gas price". The bid tag beside each generation slider gave the total alone.

**Decision:** a thermal class's bid tag shows, on hover and on keyboard focus, the bid taken apart
at the panel's gas and CO₂ prices: the fuel's price per MWh of fuel over the efficiency, the CO₂
price times the tonnes a MWh emits, the running costs and, for oil shale, the unit's premium —
the terms the engine sums (`build.ts` `bidParts`, which `impliedBid` now returns the total of;
`panel.ts` `bidText`). The other tags (batteries, Kruonis, the Daugava, waste, wind and solar)
show their existing explanation the same way. The scarcity markup is not in the tip; it says so.

**Consequences:** none on any figure. Methodology §8.1.

## D-090 · 2026-10-06 · A thermal bid set by hand, kept as an offset to its costs

**Context:** the owner asked whether a source's bid could be set by hand, and answered the four
questions put:
1. thermal sources only; 2. the hand-set bid replaces the cost base, the markup stays on top;
3. "let the link be kept" — the bid keeps following the gas and CO₂ prices; 4. scenarios only.

**Decision:**
1. In a scenario run every thermal class of a core zone's fleet — gas, oil shale, retort gas,
   biomass, `other`, `other_renewable` — shows its bid as a box (`panel.ts` `bidTag`). Waste,
   which runs whatever the price (D-074), and the plant, whose units run as must-run (R-SMR-1),
   keep a plain tag (`model.ts` `bidEditable`).
2. A bid typed into the box is kept as its offset to the cost-based bid at the panel's prices
   (`State.bids`, `<zone>.<class>` → €/MWh); a change of the gas or CO₂ price moves the bid by the
   cost's change, the offset staying. An empty box, or the cost's own figure, removes the offset.
3. The engine adds the offset to the class's hourly bid before the utilisation markup and holds
   the bid at 0 or above (`build.ts` `thermalOffer`, `Scenario.bidAdj`); the bid tag's tip shows
   the offset beside the cost terms (D-089).
4. The scenario text carries a moved bid as `bid.<zone>.<class>=<offset>` (schema: −1 000 to
   4 000 €/MWh); a text is rejected for a class that is not editable or not in the zone's fleet,
   and a replay's text has no such key. A moved bid is marked as changed (R-UI-6) and, like the
   fuel prices, stays when a scenario button is pressed (D-081), so it does not press *Other*
   (D-088); the four scenarios and the sensitivities run with it.

**Consequences:** none on any figure until a bid is moved. Specification revision 2.4
(`R-SUP-3`); methodology §8.1. Example: Estonia's peaking gas at 120 €/MWh in place of 189 takes
the Estonian 2035 price of *Elering: gas* from 72.7 to 66.4 €/MWh.

## D-091 · 2026-10-07 · A published forced outage bounds the capacity filled for the hours A31 leaves out

**Status:** Accepted · 2026-10-07 · owner (D-095); proposed in the night of 2026-10-07 by the executor.

**Context:** the night's diagnosis of the blind year (`docs/research/2026-10-07_calibration_2025.md`)
found NordBalt open in the model on three days it was out (ERRATA E-073).

**Decision (proposed):** in `years._ntc`, after Fingrid's EstLink capacity and the weekly rule of
D-013, an hour filled by the weekly rule that lies inside a forced (unplanned) transmission outage
of the border and direction (ENTSO-E A78, `unavailability`) takes the least of its filled value and
the outage's available capacity; the fill is listed in `meta.filled` with the A78 record's lineage.
Planned outages are left out (E-073). Hours A31 publishes are never changed.

**Consequences:** 2025 alone: 47 hours of NordBalt each way at 0 MW instead of 700; the blind
year's MAE 19.60 / 17.66 / 17.46 against 19.56 / 17.67 / 17.47 (EE / LV / LT); the EstLink 2
test's effect of 2025 (R-VAL-6, gated on 2024 only) 39.7 €/MWh against 39.3, March's 39.3 against
37.5; 2020–2024 and the golden fixture unchanged. The fix is for the record's sake, not the gate's.

## D-092 · 2026-10-07 · The Statistics page: ten years of the six zones' day-ahead prices

**Status:** done on the night run of 2026-10-07 within the owner's plan of 2026-10-06 ("Statistics and data … 10 years of day-ahead prices of the six zones with a trend"); it changes no figure of the model.

**Context:** the Statistics page (D-087) showed the fuels and the build-out; the prices the model
computes and takes were not on it. The database held day-ahead prices from 2020.

**Decision:**
1. ENTSO-E's day-ahead prices (A44) of EE, LV, LT, FI, SE4 and PL for 2016–2019 are fetched through
   the pipeline (`pipeline/history.py`, `STATISTICS_FIRST_YEAR`); no replay year reads them.
2. The export's `presets.statistics.prices` holds each zone's monthly mean (UTC months, the exact
   sum of the month's hours, `math.fsum`) over the page's window, September 2016 – August 2026; a
   month counts with nine tenths of its hours in euros. Poland's series starts in December 2019:
   ENTSO-E publishes its prices in złoty from March 2017 to 19 November 2019, and its euro prices
   of 2016 – February 2017 miss too many hours for any month to reach nine tenths (ERRATA E-074).
3. The page draws each zone's months with the two lines of D-087 to 2040 and tables them (the
   last twelve months, both slopes, R², 2030 / 2035 / 2040), with TYNDP 2024 Distributed Energy's
   mean price as published beside the neighbours — the profile the scenarios take before it is
   re-priced (D-072, D-079).
4. The month's mean of the fuels is computed the same exact way (ERRATA E-060's lesson); the CO₂
   series moves by at most a cent.

**Consequences:** none on the model. The lines say what the fuels' lines say: a decade that
starts low and holds 2022 rises (Estonia +7.92 €/MWh a year by least squares, R² 0.18; 186 €/MWh
in 2035, 150 by Theil–Sen) far above every scenario's 2035. Methodology §8.7, FAQ.

## D-093 · 2026-10-07 · The countries' own counts beside IRENA's: Sweden by bidding area, Estonia's solar

**Status:** done on the night run of 2026-10-07 within the owner's plan of 2026-10-06 ("national sources … Sweden by zone SE4"); it changes no figure of the model.

**Context:** IRENA runs low for Estonia's solar and for Sweden's wind of 2025
(`docs/research/2026-10-06_statistics.md` §2), and the model's Swedish neighbour is SE4, not the
country.

**Decision:**
1. A new source, Energimyndigheten's official wind statistics by bidding area (PxWeb table
   EN0105_2; `pipeline/sources/energimyndigheten.py`, table `capacity_area`, registered): SE1–SE4,
   2003–2025, onshore and offshore together. The export carries SE4's series and the national sum.
2. The page shows SE4's additions with the trend, both readings of 2035 and 2040 and TYNDP 2024
   Distributed Energy's SE4 (onshore and offshore) beside them, and Sweden's own count of 2025
   beside IRENA's: 18 127 MW (+1 307 in the year) against 17 381 (+562).
3. Estonia's solar: two documentary rows each with its document cached and verified — Elering's
   1 210 MW connected at the end of 2024 and the Estonian Chamber of Renewable Energy's about
   1 430 MW at the end of 2025, 105 MW added in the year (pv magazine, 2026-03-04) — shown beside
   IRENA's 877 and 984 in a note; the lines stay IRENA's, one source for all six countries.

**Consequences:** none on the model. SE4 held 2 577 MW of wind at the end of 2025, adding 186 MW
a year in 2021–2025; at that pace 4 432 MW in 2035, against TYNDP 2024 Distributed Energy's 7 450.
Methodology §8.7.

## D-094 · 2026-10-07 · The CO₂ price is the general allowances' auction price

**Status:** Accepted · 2026-10-07 · owner (D-095); proposed in the night of 2026-10-07 by the
executor (it changes the observed years' CO₂ price, the register's floors in their second
decimal, every replay's figures in the second or third decimal and the golden fixture).

**Context:** EEX's auction reports hold the aviation allowances' (EUAA) auctions beside the general
allowances' (EUA), and the series averaged both (ERRATA E-081).

**Decision (proposed):**
1. The commodity series `eua` is the month's mean clearing price of EEX's successful primary
   auctions of general allowances — the allowances the stationary installations the model prices
   surrender; the EUAA auctions (five to eight a year in 2017–2024, none in the reports of 2025
   and 2026) are left out (`pipeline/sources/eex.py`).
2. The database's EUA rows are reloaded from the cached reports (nothing is fetched) and the export
   regenerated; the golden fixture's 2024 replay is re-baselined in a commit of its own (R-VAL-8).
3. The register is re-fitted on the replays as they now are (`make fit`, D-078 item 3): the
   heat-driven floors of Estonia's oil shale and of the Latvian and Lithuanian gas move, because a
   bid's CO₂ part decides which hours were below cost; the markup schedule and the batteries' Δ
   come out as they were.

**Consequences:**

| | Before | After |
|---|---|---|
| Month's mean CO₂ price, largest change in 2020 / 2021 / 2022 / 2023 / 2024, €/t | | 0.04 / 0.03 / 0.34 / 0.19 / 0.17 |
| 2024 reference of the oil-shale premiums (R-SUP-4), €/t | 64.757 | 64.754 |
| Premiums, Auvere / fluidised bed / pulverised firing, €/MWh | 1.2833 / 8.7220 / 81.8292 | 1.2858 / 8.7249 / 81.8326 |
| Floors re-fitted, below-cost hours; a, MW; b, MW/K: EE oil shale | 10 993; 116.38; 12.288 | 10 996; 116.35; 12.308 |
| … LV gas | 9 294; 46.24; 19.479 | 9 297; 46.36; 19.450 |
| … LT gas | 9 637; 44.92; 0.413 | 9 639; 44.96; 0.411 |
| Markup LV/LT gas; Δ of the batteries | 40 / 195 / 315 / 335; 67 | the same |
| Sum of the fit years' MAE | 62.81 | 62.82 |
| Hourly MAE of every replay, 2020–2026 | | the same within 0.002 €/MWh on the prices; within 0.011 after the re-fit (2021's Estonia 12.917 → 12.906) |
| Golden fixture, 2024 replay: MAE; duration-curve RMSE | 10.91 / 12.03 / 11.99; 8.04 / 10.09 / 10.01 | the same at this rounding |
| Golden digests `replay_2024`; `replay_2024_record` | a368d02…; b0805fe… | e3b6f0c…; b0a5ac5… (d80a176…; 43f2891… before the re-fit) |

A scenario's oil shale takes the same premiums, so its bids move by at most 0.003 €/MWh. The
Statistics page's CO₂ line is now the EUA's alone (45 of its 116 months move). The EstLink 2
test (R-VAL-6) and the gap weeks (R-ENG-8) are re-run on the re-fitted register and hold.
Methodology §4, §5.1, §7.2 and §8.7.

## D-095 · 2026-10-07 · The night's proposals accepted, its open questions closed, v5 redeployed

**Status:** Accepted · 2026-10-07 · owner. To the executor's recommendations on the night's report
(`docs/research/2026-10-07_night_report.md` §4, §9: sign all three; change the protocol's windows;
storage and hydro without perfect foresight later; keep February 2025; no Δ of Kruonis's own; keep
four workers) the owner answered: "we upload to https://energiamudel.ee/v5/ · I am not planning v3 in the near future · a phone version is not needed, we work only from desktop · do everything else as you see fit".

**Decision:**
1. D-091 and D-094 are accepted as proposed, with the register re-fitted on D-094's replays (its
   table: three heat-driven floors in their second decimal; the markup 40 / 195 / 315 / 335 and
   Δ 67 unchanged). The golden fixture's re-baselines of the 2024 replay are signed off (R-VAL-8):
   its replay cases carry `provisional: false`.
2. The branch `night/2026-10-07` is fast-forwarded into `main`, and the build is deployed to
   energiamudel.ee/v5 behind the site's password (D-085), with everything since 2026-10-06's
   deploy (D-086 to D-094).
3. Desktop only, as R-UI-3 has had it since 2026-09-24: no phone layout.
4. February 2025 stays in the blind year; Kruonis keeps the batteries' Δ; the worker pool stays
   min(4, cores − 1).
5. Specification revision 2.6 names the fourth scenario where the text still had three (ERRATA
   E-082).
6. The protocol's windows — the executor's recommendation, to fit on 2024 and the first half of
   2025 and score the second half and 2026 — come next, as a proposal of their own with their
   figures: they change what meeting R-VAL-5 means, and with it when results with the plant may
   leave the repository (R-SMR-8); under the declaration of interest that step is shown before it
   takes effect. Storage and hydro without perfect foresight (an engine change) follow it.

**Consequences:** the register in force is D-078's with D-094's floors; the replays' figures are
the night report's §3 (2025: 19.60 / 17.66 / 17.46, the gate R-VAL-5 not met; R-VAL-6 met). v3's
workflow still deletes `/v5` on its next deploy unless its commit 8814cc5 goes first; the owner
plans no v3 deploy soon.

## D-096 · 2026-10-07 · "Average" for "mean" in the interface and the documents

**Status:** Accepted · 2026-10-07 · owner ("why do you use the word Mean instead of average?" … "replace mean with average everywhere in the project").

**Context:** the interface and the documents said "mean" (the specification's word, R-APP-1: "mean
and median price"); the owner reads "average", the word the exchanges and the TSOs use. The figure
is the same either way: a price's arithmetic average over the year's hours, each hour counting
alike (`app/src/engine/results.ts`), and over the weather years by their weights.

**Decision:**
1. "Average" for "mean" in every text a reader sees or a developer reads: the interface (labels,
   notes, tips, chart titles, the CSV export's comment lines), the exported texts (a year file's
   notes and fill rules, the fitted parameters' method), the specification (revision 2.7), the
   methodology, the FAQ, the plan, the generated source register, code comments, docstrings and
   test names.
2. Unchanged: fixed terms with an abbreviation or a name — mean absolute error (MAE), root mean
   square error (RMSE), mean time to repair (MTTR), k-means; the verb "to mean"; ERAA's own column
   "Mean time to repair"; code identifiers and data keys (`mean`, `meanEurMwh`, `mean_price`,
   `ntc_mean` — a rename would change the export's and the JSON export's contracts for no reader);
   the dated records — DECISIONS, ERRATA, CHANGELOG entries, the specification's revision log,
   `docs/research/` notes and `spikes/` — which keep the words they were written in; the
   documentary CSVs, which quote their sources; `LICENSE`.

**Consequences:** no figure moves. The fitted parameters' method text is rewritten by `make fit`
(the same register), so the export, the derived lineage records and the database's lineage rows
follow; the golden fixture is unchanged.

## D-097 · 2026-10-07 · A scenario's energy mix: a doughnut per country, its CO₂ in the hole

**Status:** Accepted · 2026-10-07 · owner ("replace the charts in scenario Energy mix, TWh. With a pie, an empty space in the middle and write the amount of CO2 emissions in there").

**Context:** the mix was one bar chart of the three zones, a stacked bar each, made to stand the
model beside the actual year (D-029); a scenario has no actual year (D-080), so its chart held three
lone bars.

**Decision:** in a scenario run the mix is three doughnuts, Estonia, Latvia and Lithuania, each
with the zone's generation by group of the year shown (TWh; the group's colour, D-029) and in its
hole the zone's CO₂ of that year, Mt — the figure of the card's "CO₂" row for the same run; the
pointer over a slice gives the group's TWh and share; one legend under the three. A replay keeps
the bars, model beside actual (`app/src/ui/charts.ts` `drawPies`, `drawMixBars`;
`app/src/ui/results.ts` `chartsHtml`).

**Consequences:** none on a figure. The replay's chart title, which was meant to name the year and
its actual one, now does (its heading was looked up in the wrong element). Methodology §8.

## D-098 · 2026-10-07 · The doughnuts gain the net import, the sources' icons and the generation

**Status:** Accepted · 2026-10-07 · owner ("add transparent import to the donuts, also source icons on the sectors where they fit, inside the donut besides CO2 emissions add the total generation in the country in TWh"), on D-097.

**Decision:**
1. Each doughnut takes a transparent slice, outlined in dashes: the zone's net import of the year
   shown, its import less its export when that is above zero, so that the ring is what the zone
   used; a net exporter shows none. The pointer gives a slice's share of generation and net
   import together.
2. A source's icon — the panel's glyph of the group's main source (D-060), drawn from the same
   paths — stands on its slice where the ring is thick enough and the slice long enough at its
   middle for it, white on every fill. *(Amended the same day at the owner's request, "let the colour of the icons on the donut always be white": the first version chose dark or white by the fill.)*
3. The hole holds the zone's generation, TWh — the sum of the slices bar the import — over its CO₂,
   Mt, both of the year shown.

**Consequences:** none on a figure (`app/src/ui/charts.ts` `drawPies`, `centre`, `sliceIcons`;
`app/src/ui/icons.ts` `drawIcon`, `GROUP_ICON`). Methodology §8.

## D-099 · 2026-10-08 · The protocol's windows stay where they are (proposed)

**Status:** Accepted · 2026-10-08 · the owner (D-104). On D-095 item 6 (the
windows' figures before the step takes effect) and the owner's instruction for the night of
2026-10-07 ("Yes, if there is time left").

**Context:** D-095 item 6 asked for the figures of fitting on 2024 and the first half of 2025 and
scoring the second half and 2026, because the gate decides when results with the plant may leave
the repository (R-SMR-8). `docs/research/2026-10-08_protocol_windows.md` fits the register by the
protocol's own steps on those windows (V1) and on 2023–2025 (V2) and scores both beside the
register in force (R0): 2025's second half misses R-VAL-5's MAE under all three (Estonia 18.8–19.5
€/MWh, its error in October and November); 2026's eight months meet the MAE under all three, R0
included (14.08 / 10.28 / 9.21), and miss the whole gate under all three — 11 breaches with R0, 14
with V1, 13 with V2 (Estonia's duration curve, its hours at 150 €/MWh or more and its oil shale,
EstLink's congestion, the flows over EstLink and NordBalt; V1 and V2 add Latvia's and Lithuania's
duration curves, flattened by their lower markup).

**Decision (proposed):**
1. R-VAL-1's windows stay: every parameter fitted on 2023–2024, 2025 the blind year, 2026 the
   second blind year as it completes. Moving them meets the gate nowhere, and the one threshold
   2026 meets it meets without a refit; the months now seen cannot serve as a test chosen after
   the fact (the note's §5).
2. D-095 item 6's first step is closed without a change; its second — storage and hydro without
   perfect foresight, an engine change — becomes the next, with a documented market entry of the
   oil-shale units in the regimes of 2025–2026 beside it (`2026-10-07_calibration_2025.md` §6).

**Consequences:** none on a figure: the register, the export, the golden fixture and the
specification stay as they are. The experiment is `spikes/protocol-windows/` (its outputs beside it).

## D-100 · 2026-10-08 · The observed neighbours' profile begins at its first Monday (proposed)

**Status:** Accepted · 2026-10-08 · the owner (D-104). On ERRATA E-101,
found by the independent review of the export's code in the night of 2026-10-08.

**Context:** D-051 put Finland's, SE4's and Poland's observed prices of 2025 into the climate-year
files hour by hour of that year. The files are laid out on TYNDP's year, whose 1 January is a
Monday (PLAN §3.1), and their Baltic demand has its weekends on the layout's Saturdays and Sundays;
1 January 2025 was a Wednesday, so 2025's weekends fell on the layout's Thursdays and Fridays.
Finland's price, by the layout's weekday from Monday: 48.1 47.3 47.4 **21.7 22.6** 50.1 46.2
€/MWh; SE4's 73.8 67.2 61.2 **39.1 40.6** 69.2 70.6; Poland's 105.0 101.1 100.3 **81.1 73.1** 109.4
107.9 (`cy2009.json.gz`).

**Decision (proposed):**
1. The profile begins at 2025's first Monday, 6 January; 1–5 January close the layout's year. The
   neighbours' cheap weekends meet the Baltic weekends (Finland 50.5 46.2 47.8 46.8 47.5 **21.5
   23.1**), and a year's average does not move. The five days at the end fall one weekday late, the
   cost of laying a 365-day year on a 52-week cycle; holidays move five days earlier.
2. D-051's "hour by hour, the series the 2025 replay takes" reads "hour by hour from the year's
   first Monday"; methodology §10 and the import-price page say so (`export/years.py` `climate`).

**Consequences:** the opening state and every TYNDP profile do not move. A scenario run on the
observed profile does (`spikes/export-review/effects.ts`, weighted over the climate years; EE / LV
/ LT €/MWh):

| | before | after |
|---|---|---|
| Elering: gas | 69.54 / 54.03 / 54.06 | 68.51 / 54.46 / 54.47 |
| 1 SMR | 60.61 / 50.86 / 50.92 | 60.03 / 51.20 / 51.27 |
| 2 SMR | 50.77 / 48.27 / 48.38 | 50.69 / 48.96 / 49.06 |
| 3 SMR | 40.96 / 46.55 / 46.68 | 41.72 / 47.55 / 47.66 |

Estonia's net import moves by 0.01 TWh at most. The golden fixture does not move. If the owner
declines, the commit that carries this record is reverted and the export regenerated.

## D-101 · 2026-10-08 · The engine of record takes stores and cycle budgets exactly (proposed)

**Status:** Accepted · 2026-10-08 · the owner (D-104); applied with the calibration round of D-106 (accepted, D-107). On ERRATA E-124.

**Context:** the engine of record took the preview's whole steps for a store's hours and its
discharge budget (E-124), so the cycles-per-day control works in half-cycles only and Kruonis's
store and weekly budget are off the record by up to an hour at full power.

**Decision (proposed):**
1. The problem carries a store's exact hours and its exact budget per period beside the whole steps
   the preview's table needs (`Storage.exactHours`, `exactBudget`); the engine of record and the
   offline reference take the exact ones, the preview the whole steps
   (`spikes/exact-storage/exact-storage.patch`, which applies to the branch as it stands).
2. Taken together with the next calibration round, so that the register is refitted once: on the
   corrected engine the markup's descent gives 42.5 / 197.5 / 317.5 / 337.5 €/MWh (fit MAE 62.80
   against 62.82), Δ stays 67; the golden fixture's engine-of-record replay is re-baselined.

**Consequences:** the replays' MAE by 0.003 €/MWh at most, the opening state by 0.04 at most, the
cycles control in steps of 0.1 as the panel offers it; `make gap` stays at 0.000 on its eight weeks.
Nothing changes until it is accepted.


## D-102 · 2026-10-08 · The observed fleet leaves out AST's reserve battery and its reserve (proposed)

**Status:** Accepted · 2026-10-08 · the owner (D-104): items 1–3 applied with the calibration round of D-106 (accepted, D-107), item 4 withdrawn. On ERRATA E-131 (as
corrected by E-132).

**Context:** the 2026 replay takes A68's batteries whole into the fleet, Latvia's 90 MW among them,
which reads as AST's 80 MW reserve battery and Utilitas' 10 MW (A68 does not name its units); the
fleet first holds Latvia's procured FCR and aFRR-up (R-STO-7), 70.8 MW on average, and 19.2 MW
reach the day-ahead market (E-131). R-STO-8 keeps the TSO's battery out of that fleet and credits
it with 8 MW of FCR and 32 MW of aFRR; D-020 item 3 left the subtraction to M3, and it was never
made.

**Decision (proposed):**
1. An observed year's battery fleet leaves out AST's 80 MW in Latvia from 2025-10-30, the day its
   reserves were announced to begin, and the reserve the fleet holds leaves out AST's share as
   R-STO-8 credits it (8 MW FCR, 32 MW aFRR); a documentary parameter carries them with their
   sources.
2. Energy Cells' 200 MW stays in Lithuania's fleet until a source says A68 counts it (the
   measurement of E-131 gives both cases).
3. Taken with the next calibration round, so that the register is refitted once.
4. Scenario years likewise: while AST's battery is held out of the fleet (E-055), its share of the
   reserve (8 MW FCR, 32 MW aFRR) leaves the need Latvia's market batteries hold (E-135). R-STO-8
   dates that share to 2028, so for the target years 2035–2050 this assumes AST's battery still
   serves it — the same question as Kiisa's (the night's report, §10 item 5); decided with it.

**Consequences:** Latvia's day-ahead battery in the 2026 replay goes from 19.2 MW to 0.04 — the need
left, 35.8 MW on average, still exceeds Utilitas' 10 MW; the 2026 MAE by 0.02 €/MWh at most; Δ
refits from 67.21 to 67.70 €/MWh unrounded (67 → 67.5 on the register's steps), and through it
every scenario run moves (not measured here); item 4 moves the scenario runs directly as well:
Latvia's need for fast reserve in a scenario is 60.2 MW, so its batteries gain the full 40 MW on
the day-ahead market in every hour (not measured in prices); the replays of 2023–2025 and the golden fixture do
not move (A68 has no battery before 2026). To decline is to keep the replay as it is: its reserve
holding already keeps 70.8 of Latvia's 90 MW off the day-ahead market. Nothing changes until it is
accepted.

## D-103 · 2026-10-08 · TYNDP 2024's 2040 price profiles keep the layout's weekdays (proposed)

**Status:** Accepted · 2026-10-08 · the owner (D-104); applied. On ERRATA E-136.

**Context:** the Distributed Energy and Global Ambition 2040 price profiles follow the Baltic
demand's week one day late on the 364-day layout; every other TYNDP 2024 profile is aligned
(E-136). D-100 proposes the same alignment for the observed neighbours' profile.

**Decision (proposed):**
1. The export moves the DE and GA 2040 profiles one day earlier on their 8 736 source hours, before
   the layout's last day is copied from its last Monday — so that the copy, a Sunday of theirs
   today, is a Monday — with a fill record naming the move; the expected
   failure of `tests/test_export_diagnostics.py` then passes and loses its mark.
2. Decided together with D-100, so that every neighbours' profile keeps the layout's weekdays by
   one rule.

**Consequences:** runs with a 2040 neighbours' profile clear up to 1.15 €/MWh higher in Latvia and
Lithuania (DE 2040; GA 2040 up to 0.9) and up to 0.8 in Estonia; the default profile, the replays
and the golden fixture do not move. Nothing changes until it is accepted.

## D-104 · 2026-10-08 · The owner accepts the night's recommendations; Kiisa after 2028

**Status:** Accepted · 2026-10-08 · the owner: "I accept your recommendations, put it up on https://energiamudel.ee/v5/", on the recommendations of the night run (its report,
`docs/research/2026-10-08_night_report.md`).

**Decision:**
1. In force: D-099 (the protocol's windows kept), D-100 and D-103 (every neighbours' profile on
   the layout's weekdays; D-103 applied now), the fixes E-099 and E-125, and the toolchain (TypeScript
   7, Vite 8, Python's packages pinned in `constraints.txt`).
2. Accepted, applied with the next calibration round so that the register is refitted once: D-101
   (exact store hours and cycle budgets) and D-102 items 1–3 (AST's reserve battery and its reserve
   share out of the observed fleet).
3. Kiisa follows R-STO-8's period: held out of the market to November 2028, peaking gas in a later
   preset year (`export/classes.py`, PLAN §3.3). Only Elering's base fleet of 2035 lists it (250 MW),
   reachable through the scenario text: with it, the *Elering: gas* scenario clears 123.73 → 92.03
   €/MWh in Estonia and 72.39 → 65.52 in Latvia and Lithuania; the SMR scenarios and the opening
   state do not move (`spikes/kiisa/`).
4. By the same reading D-102 item 4 is withdrawn: R-STO-8 dates AST's reserve service to 2028, so no
   scenario year credits it (E-135 closed). AST's battery itself stays out of the scenario fleets as
   the presets' own sources list it (ERAA's "out of market", AST's "TSO reserve"; E-055).
5. Still open: whether Lithuania's A68 batteries count Energy Cells' 200 MW (a question for Litgrid);
   the specification's stale defaults wait for its next revision; v3's commit 8814cc5 is the
   owner's to push before v3's next deploy.
6. The branch `night/2026-10-08` is merged into `main` and deployed to /v5.
7. Checked at the owner's request: S1's "natural gas, existing" 263 MW (the opening scenario) is
   Kiisa's 250 MW, counted by Elering for 2035 (security-of-supply report 2025, Table 2.4), and the
   13.5 MW of gas ENTSO-E A68 gives Estonia in 2025–2026 (Kiisa, a reserve, is outside A68): 263.5.
   S1 names no plant, so this is read from the sum; Kiisa plus fossil CHP (23 MW) would be 273. The
   opening scenario has therefore run Kiisa in the market in 2035 all along, as item 3's rule now
   says, and counts it once.

## D-105 · 2026-10-08 · No offshore wind in Latvia's or Lithuania's scenarios

**Status:** Accepted · 2026-10-08 · the owner: "remove offshore wind from all scenarios (LV, LT)".

**Decision:** every fleet preset leaves out Latvia's and Lithuania's offshore wind — the class
map excludes `wind_offshore` and `wind_offshore_fixed` there, with a note on the preset
(`export/classes.py`). Fifteen presets carried it: ERAA 2025 National Trends 2035 (LV 1 000, LT
1 400 MW), AST's three, Litgrid's two, PEMMDB's 2030 and 2040, and the owner's two (at 0).
Estonia's is kept. The panel still lets a user add it by hand. R-SUP-9's delivery cap on
Lithuanian offshore wind keeps reading the first Litgrid project from its source row.

**Consequences** (the opening state, re-priced neighbours, weighted over the climate years):
*Elering: gas* 72.72 / 58.21 / 58.26 → 80.15 / 74.81 / 74.80 €/MWh (EE / LV / LT), *1 SMR*
67.44 / 56.10 / 56.17 → 72.89 / 71.94 / 71.94, *2 SMR* 60.61 / 54.51 / 54.61 → 64.74 / 70.00 /
70.01, *3 SMR* 51.76 / 53.45 / 53.55 → 55.08 / 68.74 / 68.75; Estonia's net import 6.23 → 6.07
TWh in *Elering: gas*. The replays and the golden fixture do not move. Methodology quotes the new
headline; its sensitivities and the Adequacy tab's figures were measured before this decision.

## D-106 · 2026-10-08 · The calibration round of D-101 and D-102: the register refitted once (proposed)

**Status:** Accepted · 2026-10-08 · the owner (D-107); executor (the night run of 2026-10-09). On
D-101 and D-102, accepted to be applied with the next calibration round (D-104).

**Context:** D-101 (the engine of record takes a store's exact hours and discharge budgets, ERRATA
E-124) and D-102 items 1–3 (AST's reserve battery and the reserve R-STO-8 credits it with out of the
observed fleet, E-131) both move the fitted register; the owner asked for them to be applied
together, so that it is refitted once.

**Decision (proposed):**
1. D-101 applied as its patch gave it (`spikes/exact-storage/`), unchanged.
2. D-102 applied in the export: where A68 counts Latvia's batteries (2026 on) AST's 80 MW leaves
   them and its 8 MW of FCR and 32 of aFRR leave the procured reserve the fleet holds
   (`export/years.py` `_without_ast`; `parameters.csv` `tso.ast_battery.*`, from R-STO-8). D-102's
   date, 2025-10-30, needs no row: A68 has no battery before 2026.
3. The register refitted by `make fit`: the floors do not move; the markup of the Latvian and
   Lithuanian gas becomes 42.5 / 197.5 / 317.5 / 337.5 €/MWh (40 / 195 / 315 / 335; the fit years
   alone 45 / 75 / 195 / 195 and 40 / 320 / 440 / 480), its sum of MAE 62.80 (62.82); Δ 67.5 €/MWh
   (67; 37.5 and 0 at the other shares, as before).
4. The golden fixture's 2024 replays re-baselined, marked provisional.

**Consequences:**

| | Before (D-078's register, D-094's floors) | After |
|---|---|---|
| Markup LV/LT gas, €/MWh; Δ of the batteries | 40 / 195 / 315 / 335; 67 | 42.5 / 197.5 / 317.5 / 337.5; 67.5 |
| Floors | — | the same |
| Sum of the fit years' MAE | 62.82 | 62.80 |
| Hourly MAE, 2022–2026, €/MWh | 2022 21.34 / 20.18 / 17.13, 2023 9.59 / 9.39 / 8.90, 2024 10.91 / 12.03 / 11.99, 2025 19.59 / 17.66 / 17.46, 2026 14.08 / 10.28 / 9.21 | the same at one decimal (2022 21.33 / 20.18 / 17.11, 2025 19.62 / 17.69 / 17.49) |
| … 2020 and 2021, two of the diagnostic years 2020–2022 | 15.15 / 16.61 / 16.61; 12.91 / 14.09 / 12.90 | 15.30 / 16.83 / 16.83; 13.02 / 14.30 / 13.11 |
| Duration-curve RMSE, 2023–2025 | 3.50 / 3.16 / 2.87; 8.04 / 10.09 / 10.01; 12.06 / 11.09 / 11.33 | 3.40 / 3.05 / 2.77; 7.94 / 9.96 / 9.89; 11.75 / 10.68 / 10.96 |
| … 2020–2021 and 2026 | 2020 18.49–20.23, 2021 9.85–11.77, 2026 15.93 / 8.90 / 8.62 | up by 0.07–0.27; 2026 16.02 / 8.81 / 8.55 |
| Breaches of R-VAL-5, 2023 / 2024 / 2025 | 9 / 10 / 15 | 9 / 8 / 16 |
| Golden fixture, 2024 replay: MAE; duration-curve RMSE | 10.91 / 12.03 / 11.99; 8.04 / 10.09 / 10.01 | 10.92 / 12.03 / 11.99; 7.94 / 9.96 / 9.89 |
| Golden digests `replay_2024`; `replay_2024_record` | e3b6f0c…; b0a5ac5… | aaaa9f9…; af781d9… (provisional) |
| Opening state, *Elering: gas*, €/MWh | 80.15 / 74.81 / 74.80 | 80.28 / 74.90 / 74.88 |

Latvia's and Lithuania's duration curves of 2024 now meet R-VAL-5; LT–PL's net flow of 2025 (0.30
against 0.35 TWh) falls just outside its ±15 %. R-VAL-5 stays unmet (the blind year's MAE),
R-VAL-6 met, `make gap` 8 of 8 weeks at 0.000; the synthetic golden cases do not move. The opening
state moves by 0.13 €/MWh at most in every scenario. To decline: revert this round's commits; the
register, the fixture and the export return with them.

## D-107 · 2026-10-08 · The owner signs D-106 off and decides OPEN-2: Lithuania's onshore wind at 0.80 of PECD's factor

**Status:** Accepted · 2026-10-08 · the owner: "I accept, put it up on /v5", on the executor's
recommendations (the night's report, `docs/research/2026-10-09_night_report.md` §3): sign D-106
off; Lithuania's onshore wind at 0.80 of PECD, interim; one deploy with D-105, D-106 and this.

**Decision:**
1. D-106 accepted: its register in force, the golden fixture's 2024 replays signed off (no longer
   provisional).
2. OPEN-2: Lithuania's onshore wind runs at 0.80 of PECD 3.1's capacity factor in the climate years
   of TYNDP 2024 (`PECD_FACTOR`, `app/src/engine/build.ts`) — a factor on the capacity factor, not
   on the megawatts the panel shows and the delivery cap reads; interim and round, to be replaced by
   a measurement with curtailment added back and capacity by commissioning month
   (`docs/research/2026-10-08_open2_pecd.md`). Latvia and Estonia are not corrected; TYNDP 2026's
   own factors are left as they are (Lithuania 0.28–0.35 on average, nearer the record's 0.25). The
   note under a climate-year set says so in the application.
3. `night/2026-10-09` merged into `main` and deployed to /v5 with D-105 and D-106.

**Consequences:** the opening state, *Elering: gas*, 80.3 / 74.9 / 74.9 → 84.1 / 80.9 / 80.9 €/MWh
(EE / LV / LT); *2 SMR* 64.8 / 70.1 / 70.1 → 66.8 / 75.7 / 75.7; the Adequacy tab 87.4 €/MWh
against 84.1, two samples of 2009 now with unserved demand at the default. The replays, their
validation, the register and the golden fixture do not move (they run on observed factors); `make
gap` 8 of 8 weeks at 0.000, the preview's miss in CY2009's winter week 311 €/MWh. The specification's
OPEN-2 row at its next revision.

## D-108 · 2026-10-09 · Nord Pool's aggregated bid curves collected twice a day, with Nord Pool's consent

**Status:** Accepted · 2026-10-09 · the owner, reporting Nord Pool's written reply to his inquiry
(OPEN-10): "open information on the site is available for saving, so we can scrape, they don't mind" — the history alone is paid.

**Context:** R-DATA-10 kept the curves to a person's view: the website's terms say "Nord Pool does
not permit automatic extraction of data" (read again on 2026-10-08), so the collector written that
day was parked (f050a18) until Nord Pool answered. The portal serves today's delivery day and,
after the auction, tomorrow's; earlier days answer 401. The history since October 2021 is sold
(the curve API: €430 a year for the Baltic cluster, €1 650 for the Nordics and Baltics) and is not
bought.

**Decision:**
1. The aggregated bid curves of the Baltic cluster (EE + LV + LT), Finland, Sweden and Poland are
   fetched by program from the portal's public view at 15:00 and 23:30: today's and tomorrow's
   delivery day, each asked for until it is held and never after — at most eight requests a run.
2. launchd may not read ~/Documents (tried: "Operation not permitted"), so the fetch is a plain
   script for macOS's own Python (`pipeline/sources/nordpool_fetch.py`) that `make
   nordpool-schedule` copies to ~/Library/Application Support/energiamudel/ and schedules (launch
   agent `ee.energiamudel.nordpool`, log ~/Library/Logs/energiamudel-nordpool.log). Its spool
   there keeps every day fetched; `make nordpool` fetches the same way and imports the spool into
   data/raw/nordpool with lineage, the record's time the fetch's. A run that gets nothing, fails
   twice or gets an incomplete day shows a macOS notification; an incomplete day is kept aside
   (`.partial`), never as the day.
3. The curves are the owner's: never committed (data/raw is outside git), shown or redistributed,
   on /v5 or anywhere else; used only to derive and cross-check parameters (R-SUP-6's markup,
   R-BND-6's slope), as R-DATA-10's other clauses say.
4. The files cannot be fetched again: the spool and data/raw/nordpool belong in the owner's backup.
5. The specification's R-DATA-10 (its sentence on automatic extraction) and OPEN-10's row at its
   next revision: daily collection of the public days with Nord Pool's consent; the history paid
   and not bought.

**Consequences:** No figure moves; the methodology's two lines on OPEN-10 reach /v5 with the next
deploy. The curves accumulate from 2026-10-08
(the collector's first run kept); a calibration against them needs at least a winter of days. A
day is lost only if the Mac misses the evening run before it and both runs on it (a run missed in
sleep runs on waking). To stop: `launchctl bootout gui/$(id -u)/ee.energiamudel.nordpool` and
delete ~/Library/LaunchAgents/ee.energiamudel.nordpool.plist.

## D-109 · 2026-10-10 · Estonian oil shale without a fitted floor in the replays (proposed)

**Status:** Accepted · 2026-10-10 · the owner (D-110); proposed the same day at the owner's request
("prepare option 1 with the figures before and after"), the first of ERRATA E-139's two fixes.

**Context:** R-SUP-5's floor, fitted on 2023–2024, held Estonia's oil shale at 0.92 of the 1.21 TWh
the 2026 replay ran against the record's 0.79, and the replays parted Estonia from Latvia in 54.1 %
of 2026's hours against 42.9 % on the exchange (E-139). Since D-073 a replay also runs every
fuel-burning technology at least at the week's 10th-percentile hour of its record.

**Decision (proposed):**
1. Estonian oil shale carries no fitted floor (`applyChpFloor`, `app/scripts/fit_floor.ts`): in a
   replay the week's least output of its record holds the Narva plants' must-run (D-073); a
   scenario's oil shale runs on its bid, as before (D-074). D-022 item 2 is withdrawn.
2. The register refitted on it (`make fit`): the floors of gas and biomass and the markup as they
   were (LV/LT 42.5 / 197.5 / 317.5 / 337.5 €/MWh, the fit's sum of MAE 62.80 → 62.74); Δ 67.5 →
   69.5 €/MWh (37.5 → 44 at OPEN-3's share of 0.25, kept as evidence).
3. The golden fixture's 2024 replays re-baselined, provisional until the owner's sign-off.

**Figures, before → after** (the replays; the share of hours Estonia's price is apart from Latvia's
is the price's, as `spikes/ee-split/` measures it):

| Year | MAE EE / LV / LT, €/MWh | Estonia's bias | Estonian oil shale, TWh (record) | Estonia apart, % of hours (record) | R-VAL-5 breaches |
|---|---|---|---|---|---|
| 2020 | 15.3 / 16.8 / 16.8 → 16.2 / 17.5 / 17.5 | 14.9 → 15.9 | 2.19 → 1.85 (2.20) | — | diagnostic |
| 2021 | 13.0 / 14.3 / 13.1 → 14.2 / 15.4 / 14.2 | 9.9 → 11.4 | 3.58 → 3.25 (3.72) | — | diagnostic |
| 2022 | 21.3 / 20.2 / 17.1 → 21.5 / 20.4 / 17.4 | 1.3 → 2.5 | 4.62 → 4.46 (4.15) | — | diagnostic |
| 2023 | 9.6 / 9.4 / 8.9 → 9.4 / 9.2 / 8.8 | −2.4 → 0.1 | 2.18 → 1.78 (2.00) | — | 9 → 11 |
| 2024 | 10.9 / 12.0 / 12.0 → 11.1 / 12.2 / 12.1 | −4.2 → −2.3 | 2.10 → 1.69 (1.70) | 4.7 → 4.3 (2.8) | 8 → 9 |
| 2025 | 19.6 / 17.7 / 17.5 → 19.6 / 18.1 / 17.9 | −4.7 → −1.6 | 1.74 → 1.44 (1.42) | 30.8 → 26.0 (21.4) | 16 → 15 |
| 2026 | 14.1 / 10.3 / 9.2 → 13.8 / 10.1 / 9.3 | −11.0 → −6.7 | 1.21 → 0.84 (0.79) | 54.1 → 48.7 (42.9) | no threshold |

The opening state (the cables' losses off, D-045) moves by Δ alone, by 0.1 €/MWh at most:
*Elering: gas* 84.1 / 80.9 / 80.9 → 84.2 / 81.0 / 81.0 (EE / LV / LT), *1 SMR* 75.7 / 77.7 / 77.7
→ 75.8 / 77.8 / 77.8, *2 SMR* 66.8 / 75.7 / 75.7 as it was, *3 SMR* 56.5 / 74.4 / 74.4 → 56.6 / 74.5
/ 74.5. `make gap` 8 of 8 weeks at 0.000; R-VAL-6 met.

**Reading:** oil shale now runs what the record shows in 2024–2026 (within 0.05 TWh, from 0.3–0.4
above it), Estonia's price is less low (2026's bias −11.0 → −6.7) and the hours the model alone
parts Estonia fall from 14.3 % to 11.4 % of 2025 and from 17.5 % to 14.5 % of 2026; the prices are
no closer: MAE moves within ±0.4 €/MWh in 2023–2026, better in 2023 and in Estonia and Latvia in
2026, worse in 2024 and in Latvia and Lithuania in 2025. 2023 now runs oil shale 0.22 TWh short (a new breach): a week's 10th
percentile holds less than the must-run of a year in which oil shale ran more. The diagnostic
years 2020–2021, already too dear, lose about 1 €/MWh. R-VAL-5's breaches in 2023–2025: 33 → 35.

**On acceptance:** the branch merged, the fixture signed off, the methodology's figures re-run
(§7.2–§7.5, §9, the gap table). **On decline:** the branch deleted; on `main`, `make fit` restores
D-106's register and its derived lineage records, then the database is built from scratch.

## D-110 · 2026-10-10 · The owner accepts D-109

**Status:** Accepted · 2026-10-10 · the owner: "I accept, merge into main", on the executor's
recommendation (accept: the replays' oil shale as the record shows it, the forecasts unmoved, the
base the second fix of E-139 needs).

**Decision:**
1. D-109 in force: in a replay Estonian oil shale's must-run is the week's least output of its
   record; the register as refitted on it (Δ 69.5 €/MWh, the markup and the other floors as they
   were). `proposal/oil-shale-floor` merged into `main`.
2. The golden fixture's 2024 replays, re-baselined on it, signed off (no longer provisional).
3. The methodology's figures re-run on it: the gap section and table (§6), the register (§7.2),
   the results and their breaches (§7.3), the EstLink 2 gate (§7.4), 2026 and 2020–2022 (§7.5),
   the open items and the fixture (§7.6) and the scenario figures (§5.9, §9, §9.1).

**Consequences:** The opening state moves by 0.1 €/MWh at most (*Elering: gas* 84.2 / 81.0 / 81.0
€/MWh); /v5 changes only when the owner asks for a deploy. E-139 stays open for its second fix:
oil shale's market entry and storage without perfect foresight (D-099's next steps). Methodology
§7.6's line on OPEN-2, left at "the default" since D-107, is corrected with them.

## D-111 · 2026-10-10 · September 2026 in the data, and Δ refitted on it (proposed)

**Status:** Accepted · 2026-10-11 · the owner (D-114); proposed the night of 2026-10-11, at the
owner's choice of its blocks ("September 2026 in the data").

**Context:** The data ended with August 2026: `make history` fetches each month once it is complete,
and a partial current-year file (Open-Meteo's three of 2026, EEX's auction report of 2026, fetched
on 2026-09-14) is refreshed only when it is deleted. R-VAL-1 freezes Δ, fitted on 2026's battery
output, until a recorded round fits it again.

**Decision (proposed):**
1. September 2026 fetched through the pipeline (`make history`: 62 ENTSO-E series, Fingrid, JAO,
   BTD; the October snapshots of the World Bank, the ECB and UMM, which the newest fetch serves);
   Open-Meteo's and EEX's partial files of 2026 set aside and fetched again (the weather now to
   2026-10-09, the auctions to date); the database built from scratch. 2026's year file runs
   January–September, 6 552 hours; the years before it do not change.
2. The register refitted (`make fit`): the floors and the markup as they were, the fit years
   unchanged; Δ 69.5 → 63.5 €/MWh (Estonia's batteries discharged 31.0 GWh in March–September
   against 23.3 in March–August; 34.5 at OPEN-3's share of 0.25, kept as evidence).

**Figures, before → after:** 2026's replay (January–August → January–September): MAE 13.8 / 10.1 /
9.3 → 13.8 / 10.8 / 10.1 €/MWh (EE / LV / LT), bias −6.7 / −3.3 / −3.3 → −6.6 / −4.1 / −4.1,
duration-curve RMSE 14.0 / 8.6 / 8.5 → 13.9 / 9.8 / 9.7; Estonia apart from Latvia in 49.5 % of the
hours against 44.7 on the exchange (48.7 against 42.9); Estonian oil shale 0.93 TWh against 0.89.
2020–2025 do not move (their replays have no batteries). The opening state (losses off): *Elering:
gas* 84.2 / 81.0 / 81.0 → 84.0 / 80.8 / 80.8 €/MWh, *1 SMR* 75.8 / 77.8 / 77.8 → 75.6 / 77.6 / 77.6,
*2 SMR* 66.8 / 75.7 / 75.7 → 66.7 / 75.6 / 75.6, *3 SMR* 56.6 / 74.5 / 74.5 → 56.5 / 74.3 / 74.3.
`make gap` 8 of 8 weeks; R-VAL-6 met; the golden fixture does not move (no battery in 2024). The
gas sensitivity's highest monthly TTF price of 2026 is September's, 75.3 €/MWh thermal (the World
Bank's 25.42 USD/mmbtu at the ECB's 1.1513), where it was August's 62.1; the panel shows the
batteries' bid as 64 (70 before).

**On acceptance:** the methodology's "January–August 2026" figures and the Statistics page's ten
years (to September 2026) re-run; the specification's "to August 2026" at its next revision.
**On decline:** revert this commit; the raw files of September stay in the cache, so move the ones
whose lineage records are dated 2026-10-10 out of `data/raw` (and their records out of
`data/lineage`) before the next `make db` and `make export`, or that export carries September again.

## D-112 · 2026-10-10 · The engine of record sees the day and the next, not the week (proposed)

**Status:** Accepted · 2026-10-11 · the owner (D-114); proposed the night of 2026-10-11, at the
owner's choice of its blocks ("Build it in fully" if the prototype shows a benefit), after D-111.

**Context:** ERRATA E-139's second fix, D-099's next step. The engine of record cleared each UTC
week as one programme (D-021): every store and the Daugava planned the week with all of its hours
known, and where Kruonis or the Daugava ran part-loaded it held the price at its water value
(methodology §7.3). A prototype (`spikes/foresight/`) cleared each day in a window of 24, 48 or 72
hours, kept the day and carried the stores' state, and refitted the register on the windows of 48
and 72 hours (`spikes/foresight/refit.ts`, which reproduces the register in force exactly on the
weekly programme); 48 hours did best, and 24, scored on the register in force, worse than both. Scored on the night's scoreboard (`spikes/foresight/score.ts`).

**Decision (proposed):**
1. The engine of record clears each day of a UTC week in a window of the day and the next, 48
   hours within the week, keeps the day, and carries the stores' energy and the week's unused
   budgets to the next day's window (`runLP` with `DAY_AHEAD`, `runWeek`, the state of
   `weekModel`; `WEEKLY` is the programme of D-021 and reproduces its results bit for bit). A
   window's stores end it empty; a discharge budget whose period runs past the window, and the
   Daugava's weekly budget, give the window its share of what the week has left, by hours. Nothing
   reads an observed Baltic price (R-BND-3).
2. The offline reference clears the same windows (`reference/lp.py`): `make gap` 8 of 8 weeks at
   0.000.
3. The register refitted on it: the floors as they were; the markup 42.5 / 197.5 / 317.5 / 337.5
   → 30 / 142.5 / 232.5 / 252.5 €/MWh (the fit's sum of MAE 62.74 → 62.93, the folds 40 / 65 /
   125 / 125 and 20 / 220 / 340 / 380); Δ 63.5 €/MWh as it was.
4. The golden fixture's engine-of-record cases and the 2024 replay re-baselined, provisional.

**Figures, before (D-111) → after:**

| Year | MAE EE / LV / LT, €/MWh | Sum | R-VAL-5 breaches | Lithuania above 250 €/MWh, bias | Kruonis, TWh (record) |
|---|---|---|---|---|---|
| 2023 | 9.38 / 9.23 / 8.80 → 9.51 / 9.28 / 8.84 | 27.41 → 27.63 | 11 → 10 | −78.9 → −78.1 | 0.31 → 0.24 (0.53) |
| 2024 | 11.06 / 12.16 / 12.10 → 11.11 / 12.13 / 12.06 | 35.32 → 35.30 | 9 → 7 | −104.5 → −107.6 | 0.36 → 0.31 (0.57) |
| 2025 | 19.58 / 18.11 / 17.88 → 18.97 / 17.73 / 17.56 | 55.57 → 54.26 | 15 → 15 | −116.5 → −116.3 | 0.37 → 0.31 (0.48) |
| 2026 | 13.75 / 10.81 / 10.13 → 13.93 / 10.89 / 10.13 | 34.69 → 34.95 | no threshold | −67.3 → −67.8 | 0.38 → 0.32 (0.43) |

The opening state (losses off): *Elering: gas* 84.0 / 80.8 / 80.8 → 83.8 / 80.5 / 80.5 €/MWh,
*1 SMR* 75.6 / 77.6 / 77.6 → 75.5 / 77.5 / 77.5, *2 SMR* 66.7 / 75.6 / 75.6 → 66.6 / 75.4 / 75.4,
*3 SMR* 56.5 / 74.3 / 74.3 → 56.4 / 74.2 / 74.3. R-VAL-6 met (19.3 €/MWh). R-ENG-7 met on the
bench, whose four workers split a year's weeks: 0.56 s for 2024, 0.86 s for CY2009 and 2.3 s for a
set of three years; on one thread, as the application gives a worker a year, 1.3 and 2.6 s, above
its 2 s for a climate year.

**Reading:** the blind year 2025 gains 1.3 in sum, 2026 loses 0.3, the fit years 0.2; three
breaches fewer. Kruonis, already short of its record, falls further: a day's window gives it less
to move than the week. Alone a
modest step; with oil shale's market entry (D-113) the blind year's six breaches of the price
distribution go (D-113's table).

**On acceptance:** the specification's R-ENG-5 and R-ENG-8 (revision 2.8, proposed), the
methodology's §5.8 and figures. **On decline:** revert D-112's commits, `make fit` on the state
without them, the database built from scratch.

## D-113 · 2026-10-10 · Oil shale enters the market by the day (proposed)

**Status:** Accepted · 2026-10-11 · the owner (D-114), item 1's start charged on the megawatts
available (the variant measured below); proposed the night of 2026-10-11, at the owner's choice
("The past and the scenarios": the same rule in replays and scenarios), after D-111 and D-112.

**Context:** ERRATA E-139's second fix, D-099's next step. Oil shale was three continuous offers at
their cost and Eesti Energia's entry premium (R-SUP-4): a class ran a few peak hours at its bid and
was gone the next, which no Narva unit does — the record keeps the fleet off (no hour above 50 MW)
on 11–40 % of the days of 2023–2026 and runs it in campaigns of 9–17 days at the median, a day on's
least hour at 57–63 % of its highest (`spikes/commitment/record.ts`). ERAA 2025's commitment figures were in the presets and unused.

**Decision (proposed):**
1. `runLP` clears a problem with an entry in two passes (`app/src/engine/entry.ts`): the first
   decides, for each oil-shale class and UTC day, whether the class runs — when the first pass's
   price reaches its bid in at least ERAA's minimum time on (8 h new, 11 h old) and, when it was off
   the day before, the day's margin over the bid pays a warm start of its megawatts (ERAA: 42 and
   60 €/MW and 18 GJ/MW of start fuel at the oil-shale fuel price the bids use, 92 and 110 €/MW in
   all); on, it runs at least ERAA's minimum stable load (0.5) all day and offers the rest at its
   bid; off, it offers nothing; a replay's weekly least output of the record (D-073) stays beneath
   as must-run. The second pass clears the committed problem, and its results are the problem's as
   built, the committed minimum load in its class's offer (ERRATA E-141). Replays and scenarios
   alike (a scenario's oil shale is Auvere); nothing reads an observed Baltic price (R-BND-3).
2. `build` carries each oil-shale class's megawatts and ERAA's figures (`Problem.entry`); the test
   weeks of `make gap` are written as their first pass committed them, so the reference clears what
   the second pass clears: 8 of 8 weeks at 0.000.
3. The register refitted on it (with D-112): the markup 37.5 / 150 / 240 / 260 €/MWh, Δ 71.
4. The golden fixture's replays re-baselined, provisional.

**Figures** (the sum of the three zones' MAE, €/MWh; R-VAL-5's breaches 2023 / 2024 / 2025):

| | 2023 | 2024 | 2025 | 2026 | Breaches | Oil shale 2023 / 2025, TWh (record 2.00 / 1.42) | Opening state, *Elering: gas* |
|---|---|---|---|---|---|---|---|
| D-111 | 27.41 | 35.32 | 55.57 | 34.69 | 11 / 9 / 15 | 1.78 / 1.44 | 84.0 / 80.8 / 80.8 |
| D-112 (the day ahead) | 27.63 | 35.30 | 54.26 | 34.95 | 10 / 7 / 15 | 1.79 / 1.42 | 83.8 / 80.5 / 80.5 |
| **D-112 and D-113** | 27.82 | 34.75 | 55.19 | 34.37 | **8 / 5 / 9** | 1.87 / 1.39 | 84.7 / 81.1 / 81.0 |
| D-113 on the weekly programme (D-112 declined) | 27.52 | 34.21 | 54.74 | 34.16 | 10 / 8 / 13 | 1.85 / 1.40 | — |

The weekly variant's register: the markup 40 / 195 / 315 / 355, Δ 72 (`spikes/foresight/refit.ts
weekly+engine`). With both changes the blind year 2025 loses its six breaches of the price
distribution — the duration-curve RMSE and the share of hours ≥ 150 €/MWh in each zone — and
keeps MAE above 15 in each zone, Latvian and Lithuanian gas, Kruonis, two net flows and Estonian
biomass; 2024 meets its three price thresholds; Estonian oil shale runs within 6 % of its record
in 2023–2026 (1.87, 1.75, 1.39 and 0.94 TWh against 2.00, 1.70, 1.42 and 0.89), and 2023 loses the
oil-shale breach it had on D-111 (1.78). As first written, the results left the committed minimum
load out (ERRATA E-141): oil shale read 16–28 % below its record, a breach in each year, and the
breaches 9 / 6 / 10 (11 / 9 / 14 on the weekly programme).
The other scenarios: *1 SMR* 76.3 / 77.9 / 78.0, *2 SMR* 67.2 / 75.9 / 75.9, *3 SMR* 57.0 / 74.7 /
74.7. R-VAL-6 met (19.7 €/MWh).

**A variant, measured and not built: the warm start on the megawatts available.** Item 1 charges a
start on the class's installed megawatts while its margin counts the megawatts available, which in
a replay are far fewer (the fluidised-bed class 94–129 MW of 386 on average, pulverised firing
4–10 of 674), so the fluidised-bed class pays three to four times ERAA's start per megawatt that
can run, and pulverised firing cannot start at all (the night's review of its code). Charged on the day's highest available hour instead, and refitted
(the markup 37.5 / 147.5 / 237.5 / 257.5, Δ 71): 27.71 / 34.45 / 54.11 / 34.36, the fit years 0.4
and the blind years 1.1 better than item 1's, oil shale 1.88 / 1.77 / 1.41 / 0.95 TWh, breaches 8 /
7 / 9 — 2024's two more are Latvia's and Lithuania's share of dear hours, 3.1 and 3.0 points short
against the 3 allowed (`spikes/foresight/result.json` `refit_48_24_engine_available`). A scenario's
Auvere has nearly all of its megawatts available, so the scenarios would move little (not
measured).

**Speed:** two passes of the day-ahead engine. In Node a replayed year takes 2.4 s on one thread
(0.8 s for D-111's one weekly pass); on the built site a validation year takes 2.4–2.8 s and the
opening view's twelve years 15.7–16.4 s (about 9 before), against R-ENG-7's 2 s a year — which the
bench's four workers, splitting a year's weeks, meet (0.8 s; the bench commits each week on its
own, the day before a week not carried, so its figure is the speed and not the results) and the
application, a year per worker, does not. The weekly variant takes two weekly passes, about 1.6 s a year in Node. Solving
a year's weeks on all four workers (both passes, the entry decided between them) would meet R-ENG-7;
not built.

**Reading:** the two changes together make the price distribution of the blind year right and its
average no worse; the entry alone on the weekly programme makes the average best (fit years −1.0,
blind years −1.4) and the distribution little better, and keeps Kruonis near its record (0.38
against 0.48 TWh in 2025, where the day ahead gives 0.33). The executor's recommendation is in the
night's report.

**On acceptance:** the specification's R-SUP-4 (revision 2.8, proposed), the methodology's
figures. **On decline:** revert D-113's commit; `make fit` on D-112's state (or on the weekly
programme, if D-112 is declined too), the database built from scratch. **D-113 without D-112:**
`runLP`'s default horizon `WEEKLY` and `reference/lp.py`'s default window and day 168, then
`make fit` (the markup 40 / 195 / 315 / 355, Δ 72 as measured), `make validate`, `make gap`, the
fixture and the figures.


## D-114 · 2026-10-11 · The owner accepts the night of 2026-10-11, oil shale's start on the megawatts available; the scenario's reserve off oil shale; a year's weeks on every worker

**Status:** Accepted · 2026-10-11 · the owner: "I agree with your proposals, write the plan and get started", on the executor's recommendations (accept D-111; D-112 and D-113 with oil shale's
start on the megawatts available, the variant measured in D-113; fix ERRATA E-142 with them; share
a year's weeks among the workers; sign revision 2.8 off; deploy after); and, to the question that
sharing the weeks shortens a year but not the opening view, "Up to 7 threads + splitting".

**Decision:**
1. D-111 in force: September 2026 in the data, Δ refitted on it.
2. D-112 in force: the engine of record clears each day in a window of the day and the next.
3. D-113 in force, item 1 amended: a class off pays its warm start on the megawatts it has
   available that day (the day's highest hour of its capacity), not on its installed megawatts
   (`entry.ts`). The register refitted on it: the markup 37.5 / 147.5 / 237.5 / 257.5 €/MWh (the fit
   years' sum 71.64 → 62.16; the folds 40 / 60 / 120 / 120 and 35 / 235 / 355 / 395), Δ 71.
4. ERRATA E-142 fixed: a scenario's reserve headroom stands on the thermal offers that run
   continuously, none on the classes that enter the market by the day (`build.ts`).
5. The workers: one less than the machine's cores, at most eight (D-028's and D-095's four
   replaced); each year's weeks shared by all of them — the first clearing in parts, oil shale
   committed once on its joined price, the second in parts, one worker putting the year together
   (`split.ts`, `runYear` in `pool.ts`) — bit for bit `runLP`'s; the adequacy samples stay whole
   years.
6. Revision 2.8 of the specification approved, with R-SUP-4's start, R-STO-7's reserve and
   R-ENG-8's workers.
7. The golden fixture, re-baselined on items 3 and 5, signed off (not provisional).
8. The methodology's figures re-run on it; `night/2026-10-11` merged into `main` and deployed to /v5.

**Figures** (the sum of the three zones' MAE, €/MWh; R-VAL-5's breaches 2023 / 2024 / 2025):

| | 2023 | 2024 | 2025 | 2026 | Breaches | Oil shale 2023 / 2024 / 2025, TWh (record 2.00 / 1.70 / 1.42) | Opening state, *Elering: gas* |
|---|---|---|---|---|---|---|---|
| D-113 as proposed | 27.82 | 34.75 | 55.19 | 34.37 | 8 / 5 / 9 | 1.87 / 1.75 / 1.39 | 84.7 / 81.1 / 81.0 |
| **D-114** | 27.71 | 34.45 | 54.11 | 34.36 | **8 / 7 / 9** | 1.88 / 1.77 / 1.41 | 84.8 / 81.1 / 81.1 |

2024's two more breaches are Latvia's and Lithuania's share of hours at or above 150 €/MWh, 3.1 and
3.0 points short against the 3 allowed. The other scenarios: *1 SMR* 76.4 / 78.0 / 78.0, *2 SMR*
67.5 / 75.9 / 76.0, *3 SMR* 57.2 / 74.7 / 74.7 €/MWh. R-VAL-6 met (19.5 €/MWh); `make gap` 8 of 8
weeks at 0.000; `make check` on a database built from scratch, every check OK. E-142 alone moves
the opening state by 0.1 €/MWh at most: Auvere held 35–72 MW of headroom on average and was off on
363–365 days of each climate year.

**Speed:** on the built site (eight cores, seven workers, the files cached) a validation year takes
0.7 s (2.4–2.8 with a year to a worker) and the opening view's twelve years 11.3 s (15.7–16.4).
The bench, running the browser's pool and `runYear` on Node workers: 1.0 s for the 2024 replay,
0.9 s for climate year 2009 and 2.3 s for a set on four workers — R-ENG-7 met — and the opening
view 16.9 s on four workers, 12.7–13.2 s on six to eight: about 60 s of solving, which six
concurrent solvers saturate on this machine, so the executor's estimate of 9–10 s was too low.

**Consequences:** /v5 runs the accepted model. E-139 closes with its two fixes (D-109, D-112 and
D-113). Open: the dear hours above 250 €/MWh, 77–112 €/MWh too low in Lithuania, and the blind
year's MAE, 2.6–3.7 above the threshold.

## D-115 · 2026-10-11 · Kruonis's output in an hour runs in steps of its power, the step fitted with the markup (proposed)

**Status:** Accepted · 2026-10-11 · the owner (D-116); drafted on the work on the dear hours the
owner asked for on 2026-10-11 ("plan the work on the expensive hours", with leave to re-plan on the
way); the research log is `docs/research/2026-10-11_dear_hours.md`, the scripts `spikes/dear-hours/`.

**Context:** In the hours the market cleared above 250 €/MWh the engine of record stood 77–112
€/MWh below the record (Lithuania, bins of the observed price), and 2024's share of hours at or
above 150 €/MWh missed R-VAL-5 in Latvia and Lithuania. Most of that bias is the choice of hours by
the record's price: a model right on average given its own price, with this model's noise, shows
−59 to −111 in the same hours (ERRATA E-144). What is the model's own: Kruonis, scheduled as a
price-taker with the day and the next in view, shaves the peaks the market did not shave. It sets
Lithuania's price in 93 of 2025's 247 hours above 250 (219 €/MWh against 356 recorded), runs at the
week's power limit in 435–559 of its 900–1 311 generating hours a year where the record's plant
runs 2 600–3 200 hours at 173–184 MW, and gives the record's dearest hours 55–86 MW more than the
plant did; run as recorded (an oracle), it halves 2024's bias and removes 2025's. Two of its four
units are Litgrid's mFRR reserve, and its owner holds most of Lithuania's dispatchable plant: an
owner who weighs what its output does to the price holds storage back and flattens the peaks less
than a welfare-maximising dispatch (Schill and Kemfert, *The Energy Journal* 32 (3), 2011;
Sioshansi, *The Energy Journal* 31 (2), 2010).

**Decision (proposed):**
1. Kruonis's output in an hour runs in four equal segments of the power it has that hour, the first
   at the plant's cost and each further one a step more — at the fitted 60 €/MWh, 0 / 60 / 120 / 180
   above it (`Storage.dischargeSteps`, `kruonisSteps` in `build.ts`; `lp.ts` and its reference
   `reference/lp.py` alike); its reservoir, its pumping at the plant's Δ and its budgets
   stay one. The programme spreads the water it has pumped over more hours at part load. Replays
   and scenarios alike; nothing reads an observed Baltic price (R-BND-3).
2. The step is fitted with the markup on 2023–2024 (R-VAL-1): at each step of a grid (0, 15, 30,
   45, 60, 90 €/MWh) the schedule as before (D-073), and the step whose register fits the two years
   best kept (`app/scripts/fit_markup.ts`, the grid's steps on worker threads). The grid's sums of
   MAE on the fit years: 62.16, 61.01, 60.09, 59.55, **59.51**, 60.23. The register: the markup LV/LT
   32.5 / 80 / 220 / 260 €/MWh (the folds 30 / 70 / 110 / 110 and 35 / 90 / 330 / 410, crossed
   60.34 against 64.02), Kruonis's step 60 €/MWh, Δ 71.5 (`fitted_parameters.json` `kruonis_output`).
   At step 0 the fit returns D-114's register to the euro: the programme without steps is the one in
   force.
3. The calibration page lists the step with its grid.
4. The golden fixture's 2024 replays re-baselined, provisional.
5. Specification revision 2.9 (proposed): `R-ENG-5`, `R-VAL-1`, `R-PAR-10`.

**Figures** (the sum of the three zones' MAE, €/MWh; R-VAL-5's breaches 2023 / 2024 / 2025):

| | 2023 | 2024 | 2025 | 2026 | Breaches | Hours ≥ 150, LV / LT 2024 (record 1 002 / 992) | Kruonis 2023 / 2024 / 2025, TWh (record 0.53 / 0.57 / 0.48) |
|---|---|---|---|---|---|---|---|
| D-114 | 27.71 | 34.45 | 54.11 | 34.37 | 8 / 7 / 9 | 732 / 725 | 0.26 / 0.33 / 0.33 |
| **D-115** | 26.47 | 33.04 | 51.42 | 33.60 | **8 / 5 / 8** | 781 / 774 | 0.15 / 0.18 / 0.19 |

- **MAE** falls in every year, the blind one included (EE / LV / LT 2025: 18.03 / 16.77 / 16.62
  against 18.70 / 17.80 / 17.61), and in 2020–2022 (2020: 16.3 / 17.3 / 17.4 against 17.4 / 18.8 /
  18.8). 2024 meets the share of dear hours in both zones (2.5 points short against 3.1 and 3.0);
  2025 keeps it (EE 2.5, LV 1.4, LT 1.4 points short). 2025's ninth breach before, Latvian gas,
  passes at the band's edge (1.415 against 1.572 TWh, 9.9998 % short). The duration-curve RMSE
  stays under 10, but 2023's rises from 1.4–1.8 to 3.1–3.4 €/MWh.
- **Where the gain is.** Of the fit years' 2.65, 1.41 comes in the hours Lithuania cleared at
  150–250 €/MWh, 0.96 at or below 30 and 0.30 above 250 (by the record's price; above 250 the sum
  loses 0.10 in 2023 and 0.33 in 2025). The cheap hours' part comes with Kruonis pumping less there
  — 83–115 MW against 142–176 before and 157–234 recorded: the compensation for which the four
  stores were not kept (below), at about half its size.
- **The tail.** Lithuania's 99th percentile 224 / 289 / 306 €/MWh in 2023–2025 against 244 / 256 /
  293 before and 250 / 300 / 313 recorded. Chosen by the record's price the dear hours barely move
  (above 250: −80.1 / −99.9 / −114.1 against −76.8 / −105.2 / −111.6), as E-144 expects; chosen by
  the model's own price, 2023's dear hours are right on average (+3.9 against +36.6) and 2025's less
  too high (+42.8 against +49.5).
- **Kruonis** runs as the record's plant does in kind: 1 362–1 752 generating hours a year at
  106–135 MW (900–1 311 at 251–323 before; the record 2 607–3 230 at 173–184), at the week's limit
  in 9–23 of them, and gives the record's hours above 250 126 / 205 / 121 MW (240 / 310 / 197
  before; 184 / 224 / 142 recorded). It cycles less: 0.15–0.19 TWh against 0.26–0.33 before and
  0.48–0.57 in A75 (pumping 0.21–0.25 TWh against the record's 0.64–0.78). A75 may count the reserve
  units' activations, which the day-ahead market never scheduled; that is not measured (BTD's
  activations would tell). The generation check on Kruonis failed in every year before and fails
  by more now: 61–72 % short against 31–52 %.
- **The average price** falls with the refitted markup: the bias 2023 −1.5 / −1.9 / −1.8 €/MWh
  (−0.9 / −1.1 / −1.0 before), 2024 −3.5 / −5.1 / −5.0 (−3.4 / −4.6 / −4.6), 2025 −2.7 / −1.2 / −1.3
  (−2.4 / +0.3 / +0.1).
- **The opening state** moves little: *Elering: gas* 84.7 / 80.9 / 80.9 €/MWh (84.8 / 81.1 / 81.1
  before), *1 SMR* 76.3 / 77.9 / 77.9 (76.4 / 78.0 / 78.0), *2 SMR* 67.1 / 75.8 / 75.9 (67.5 / 75.9 /
  76.0), *3 SMR* 56.9 / 74.6 / 74.6 (57.2 / 74.7 / 74.7).
- R-VAL-6 met (19.5 €/MWh in 2024, as before; 37.6 in 2025 against 39.1); `make gap` 8 of 8 weeks
  at 0.000 with the reference running the steps; `make check` on a database built from scratch.
- **Speed:** four columns of Kruonis's output an hour where there was one cost about 5 %: the bench
  gives 1.0 s for the 2024 replay, 0.9 s for climate year 2009 and 2.4 s for a set on four workers
  (R-ENG-7 met), the opening view 17.1 s on four workers and 13.6 on seven (16.9 and 13.0 before).
  `make fit` takes about a quarter of an hour with its grid on six worker threads.

**Limits.** In a replay a segment is a quarter of the week's power, about 106 MW at the median of
the fit years; in a scenario a quarter of the plant's full output, 166–187 MW for the fleets'
900–1 010 MW. The step fitted on the replays therefore holds a scenario's Kruonis back 35–45 % less
per megawatt. Whether a scenario's Kruonis should keep Litgrid's two reserve units out of the
day-ahead market, as the record's weekly power does, is the owner's question (D-073 kept the
installed megawatts for scenarios). The step is weakly identified: 45 and 60 €/MWh fit the years
within 0.04, against a noise margin of 0.6 (E-065), and the gain holds over 30–60 (methodology
§7.2's grid). The gate's figures hang on that choice: at 45, on its own register (37.5 / 70 / 220 /
280), Latvia's 2024 share of dear hours is 3.02 points short and the breaches are 8 / 6 / 9; at 30
(20 / 110 / 210 / 230) they are 7 / 4 / 8, but Estonia's 2025 share is 3.7 points short. Crossed, 45
scores better than 60 (60.06 against 60.33 in `refit.ts`). The step was kept by the rule written
before (the fit years' sum); 2024's share met is that choice's luck, not a finding. The form — steps
of one store's output rather than four stores — rests on the mechanism and the fit years: the four
stores fit and cross better (59.04 and 60.06, within the margin) by hardly pumping at night, where
the record's plant pumps as much as ever. The research log's §7 also named 2025's share among the
reasons, against its own rule (2025 is reported, never chosen on); struck there (ERRATA E-145).
Kruonis keeps the batteries' Δ, as D-095 decided; the step is a cost of its own all the same, which
D-095's recommendation did not foresee.

**Not kept** (the research log): replays on the TSOs' day-ahead forecasts (worse on the fit years,
the dear hours lower still); oil shale's and gas's hourly availability or commitment (oracles: at
most 17 €/MWh on the dear hours); the markup on the fleet's weekly maximum, R-SUP-6's words (2.3
worse on the fit years) and v4's split of each hour (its 2024 fold runs away); Kruonis's power at
its week's 90th-percentile running hour (1.0 worse; with the fleet's maximum a lucky point its
neighbours do not keep); one Δ for the plant (refitted at 90: 60.18 on the fit years, 61.11 crossed,
breaches 8 / 5 — three quarters of the gain with one number, but a Δ of Kruonis's own, which D-095
declined); Kruonis as four stores, each charging a step more (59.04 on the fit years and 60.06
crossed, within the margin of this form, but it gains in the cheap hours by hardly pumping at night
— 53–66 MW against the record's 157–234 — and lowers the average price by 1.2–2.4 €/MWh); the step
as a fifth coordinate of the descent (measured on the four units' form: the folds ask for 135 and
45).

**Rollback:** declined, the branch is not merged and main keeps D-114. The research alone
(ebc5c80: the spikes, the TSOs' day-ahead forecasts in the pipeline) can be taken without it, with
E-144's reading of §7.3 rewritten on D-114's figures. Merged and then undone: revert the engine's
commits (465d160, 5fba645) and D-115's documents, then `make fit` (without the steps it returns
D-114's register to the euro), a fresh database (`ENERGIAMUDEL_DB=<scratch> make db`, swap), `make
check`, `make validate`, `make gap`, and `node app/scripts/golden.ts` against the reverted fixture,
D-114's (03ce01e).

## D-116 · 2026-10-11 · The owner accepts D-115

**Status:** Accepted · 2026-10-11 · the owner: "I accept D-115, merge into main", on the executor's
recommendation (accept: the hourly error falls out of sample in every year — 2020–2022, the blind
year 2025 and January–September 2026 — and the scenarios hardly move; 2024's share of dear hours
met is not to be read as a finding, since it holds at the step of 60 alone).

**Decision:**
1. D-115 in force: Kruonis's output in an hour runs in four equal segments of the power it has that
   hour, the first at the plant's cost and each further one a step more, the step fitted with the
   markup on a grid. The register: the markup LV/LT 32.5 / 80 / 220 / 260 €/MWh, the step 60 €/MWh,
   Δ 71.5. `research/dear-hours` merged into `main`.
2. Revision 2.9 of the specification approved: `R-ENG-5`, `R-VAL-1`, `R-PAR-10`.
3. The golden fixture's 2024 replays, re-baselined on it, signed off (no longer provisional).
4. ERRATA E-144 and E-145 stand as fixed. The methodology's figures have been D-115's since the
   branch: the gate's status, §5.5, §6, §7.1–§7.6, §8, §9 and §9.1.

**Consequences:** /v5 runs D-114 until the owner asks for a deploy. The opening state moves by
0.4 €/MWh at most (*Elering: gas* 84.7 / 80.9 / 80.9 €/MWh). The blind year still misses R-VAL-5's
MAE by 1.6–3.0 €/MWh. Open, the owner's to decide, as D-115's limits leave them: whether a
scenario's Kruonis keeps Litgrid's two reserve units out of the day-ahead market; whether the fit
weighs the average price or the tail beside the MAE (R-VAL-2); R-SUP-6's words against
`applyMarkup`. The FAQ's figures, stale since D-078, are to be brought up to date.

## D-117 · 2026-10-11 · R-SUP-6 says what the code does; the FAQ brought up to date; D-115 deployed

**Status:** Accepted · 2026-10-11 · the owner: "yes, do 1–3, deploy too", on the executor's
recommendations: deploy D-115 to /v5; bring the FAQ up to date; have the specification say what
`applyMarkup` does rather than change the code to the specification's words.

**Decision:**
1. Revision 2.10 of the specification: R-SUP-6's bins are the shares of what each gas offer has
   left after the must-run floors and, in a scenario, the reserve headroom, against that remainder's
   weekly maximum; one schedule for Latvia and Lithuania, none for Estonia (D-073). No figure moves
   (ERRATA E-147).
2. The FAQ on the register in force (ERRATA E-146); `calibration.test.ts` holds its gate line to the
   validation files, as it holds the README's.
3. `main`, with D-115 and D-116, deployed to /v5.

**Consequences:** The site runs D-115's model. Open, as D-116 left them: whether a scenario's
Kruonis keeps Litgrid's two reserve units out of the day-ahead market, and the fit's objective
(R-VAL-2). The executor recommends one calibration round to settle both, measured before anything
is built. It would test a fit that weighs the average price, on which the plant's revenue rests,
against the MAE alone, which pulls a right-skewed price towards its median. It would also measure
a scenario's Kruonis at the installed power, at the record's power and with the step per megawatt.

## D-118 · 2026-10-11 · The calibration round: the fit stays on the MAE, a scenario's Kruonis keeps its installed megawatts (proposed)

**Status:** Accepted · 2026-10-11 · the owner (D-119). The calibration round the owner asked for on
2026-10-11 ("yes, start the calibration round"). The research log is
`docs/research/2026-10-11_calibration_round.md`, the scripts `spikes/calibration-round/`. The rule
was written and committed before anything was scored (1adad7b).

**Context:** D-116 left two questions to the owner:
- whether the fit should weigh the average price beside the hourly MAE (R-VAL-2), since the plant's
  revenue rests on the average;
- whether a scenario's Kruonis should keep Litgrid's reserve units out of the day-ahead market, as a
  replay's weekly power does (D-073).

**Decision (proposed):**
1. The register stays fitted on the sum of the three zones' hourly MAE. Neither alternative passes
   the rule:
   - On the MAE and the |average bias| (A1), the register halves the fit years' lean. But it fits
     their hours 8.30 €/MWh worse, adds a breach in each fit year and turns 2025's average to
     +5 €/MWh.
   - On the MAE and the duration-curve RMSE (A2), it fits the hours 1.83 €/MWh worse and also adds a
     breach in each fit year.
   - `fit_markup.ts` keeps `--objective=bias|dur` to reproduce the round; its default is the MAE.
2. A scenario's Kruonis keeps its installed megawatts. At the record's power (0.636 of its output)
   or with the step per megawatt, the opening view moves by 0.12 €/MWh at most, under the rule's 0.5.
3. Methodology §10 states the price level the contract settles on:
   - the replays' average lean: 1.2–6.5 €/MWh below the record in 2023–2026, 10–17 above it in
     2020–2021;
   - the opening view rises by only 0.4–1.2 €/MWh under either other objective.

**Figures:** in the research log's §3 and §4. No figure of the model moves, and the golden fixture
is not re-baselined.

**Rollback:** nothing in the model to undo. Declining D-118 reopens the two questions.

## D-119 · 2026-10-11 · The owner accepts D-118

**Status:** Accepted · 2026-10-11 · the owner: "I accept D-118, merge into main and deploy".

**Decision:**
1. D-118 in force: the register stays fitted on the sum of the three zones' hourly MAE; a
   scenario's Kruonis keeps its installed megawatts; methodology §10 states the price level the
   contract settles on and its uncertainty. No figure of the model moves.
2. `calibration/objective-kruonis` merged into `main` and deployed to /v5.

**Consequences:** The two questions D-116 left open are closed. The blind year still misses
R-VAL-5's MAE by 1.6–3.0 €/MWh. The executor's next candidate is 2025's regime: since
synchronisation the balancing capacity market holds part of the gas and the stores out of the
day-ahead market, which a replay's weekly maximum does not see. It awaits the owner's word.

## D-120 · 2026-10-11 · The owner's look at the interface

**Status:** Accepted · 2026-10-11 · the owner, who asked for each item in the session of
2026-10-11 ("let's work on the interface").

**Decision:**
1. The scenario text and share link stay, folded at the panel's foot in a replay as in a scenario
   (R-UI-6, R-APP-10): the owner chose "keep, but collapse everywhere".
2. A replay's cards take columns of at least 290 px and wrap before the actual year's column
   overflows them (ERRATA E-148).
3. The daily chart of generation against consumption fills the net import over the generation by
   default; a switch like the lines' ON/OFF turns it into the dashed line ("make the fill the default and let the switch be a toggle").
4. The Borders block carries the countries' flags on its tabs, its directions and its chart's
   title, and the border's chart writes its two directions on the plot: "▲ EE → FI" at the top,
   "▼ FI → EE" at the foot.
5. The Links box drops the capacities into Estonia and into the Baltics from outside and the note
   under them ("remove the text block"), which D-035 listed among the box's parts. Its map fills the
   panel's width ("rotate the lines so that they take up the freed space"), first turned a
   quarter to the left, then, at the owner's word ("place it so that it looks more like the cartographic position of the countries"), with each node where its country lies: north up, Helsinki,
   the Baltic countries' middles, southern Sweden and Warsaw by latitude and longitude, stretched
   across the width — Sweden west across the sea, Poland south-west of Lithuania.

**Consequences:** No figure moves. The Adequacy tab's place (R-APP-8) is still the owner's to
decide.


## D-121 · 2026-10-13 · The neighbours tight: the research's two profiles in the app; the branch chain into main

**Status:** Accepted · 2026-10-13 · the owner: "1. we add the variant 'all
neighbours dear'; 2. we lay in the neighbours' hourly prices; 3. we move it into the main branch; 4. let it
stay" and "bring the variant 'all
dear at once' to a stable result"; to the questions that followed: "Both, as two options" (both, as two
options), "we need an hourly price
series for Finland, Sweden's SE4 and Poland", "One row for all scenarios" (one series for all scenarios),
"Yes, the whole chain" (the whole branch chain).

**Decision:**
1. Two profiles of 2035 enter the neighbours' list (R-BND-5, specification revision 2.12), on TYNDP 2024's
   three climate years, beside the opening profile, which stays:
   - `TIGHT_2035`, *tight case, each on its own*: Finland's case C as its research ran it
     (`docs/research/2026-10-11_finland_2035.md` §4), coupled with the Baltic states through EstLink;
     SE4 and Poland their standalone case C (`docs/research/2026-10-12_sweden_poland_2035.md` §4).
   - `TIGHTJ_2035`, *tight case, all at once*: the three countries' case C solved together and coupled
     with the Baltic states (Sweden and Poland §5, §8), with the jointly sized response (Finland 3.5 GW,
     Sweden 12.5 GW, Poland 5.25 GW) bidding as new CCGTs at 132.8 €/MWh.
2. Each is one hourly series per zone and climate year: the series of the opening scenario, *Elering:
   gas*, which the app holds fixed in all four scenarios. They keep the fuels they were computed with,
   ERAA 2025's of 2035 (gas 38.2 €/MWh, CO₂ 197.5 €/t); the re-pricing of D-072 does not apply to them.
3. The series are kept in `data/research/neighbours_tight_2035.json.gz`, written by
   `spikes/neighbours-2035/series.py`. They enter the database as `research_price` with the derived
   lineage record `pipeline.neighbours_tight_2035`, which names their inputs and the file's SHA-256; the
   register gains the family "pipeline". The year files carry them as `TIGHT_2035` and `TIGHTJ_2035`,
   and `presets.json` their averages (`boundary.mean_price`, family "research").
4. The coupled runs average the flows they pass from round to round (step 1/(k+1)) and stop when the
   averages move by less than 0.5 €/MWh, within 20 rounds. Every run of both profiles converged, in 7 to
   12 rounds.
5. The branch chain merges into `main`, locally: `ui/2026-10-11` (D-120), `research/boundary-prices`
   (specification revision 2.11 proposed; ERRATA E-149, E-150), `research/finland-2035` and
   `research/sweden-poland-2035`. Nothing is pushed or deployed. *Added 2026-10-13:* deployed to /v5 at
   the owner's word "upload to v5" (main 9d2e719); still not pushed.
6. The Open-TYNDP archive on the external disk stays.

**The figures** (climate years weighted, €/MWh). The neighbours are the profiles' own (*Elering: gas*);
Estonia is the coupled run of each scenario and, after the arrow, the profile held fixed as the app holds it:

| Profile | FI | SE4 | PL | EE, gas | EE, 1 SMR | EE, 2 SMR | EE, 3 SMR |
|---|---|---|---|---|---|---|---|
| In force (DE 2035, re-priced) | 50.7 | 60.2 | 78.6 | 84.7 | 76.3 | 67.1 | 56.9 |
| `TIGHT_2035` | 97.5 | 82.6 | 113.9 | 122.8 | 110.6 → 113.1 | 99.8 → 104.7 | 87.9 → 95.5 |
| `TIGHTJ_2035` | 102.5 | 97.5 | 105.7 | 120.8 | 112.9 → 114.4 | 105.1 → 108.3 | 95.9 → 100.5 |

**Consequences:**
- The opening view, its figures and the golden fixture do not move; the two profiles are options of the
  list, each labelled as a conditional case.
- The app reproduces the fixed runs: Estonia 122.8 / 113.1 / 104.8 / 95.5 €/MWh on `TIGHT_2035` and 120.8 /
  114.4 / 108.3 / 100.5 on `TIGHTJ_2035` (gas / 1 / 2 / 3 SMR), within 0.1 of the research's runs, whose
  series the file rounds to 0.01 €/MWh.
- A profile held fixed cannot see an SMR lower its neighbours' prices through the cables. With the plant
  it overstates Estonia by +2.5 / +4.9 / +7.6 €/MWh (`TIGHT`) and +1.5 / +3.2 / +4.6 (`TIGHTJ`) with 1 / 2
  / 3 SMR, and the CfD's receipts with it: with 3 SMR, `TIGHT`'s coupled CfD costs the state 5.1 M€ a year,
  its fixed profile has the state receive 52.7 M€.
- The response's type is the joint case's largest choice (Sweden and Poland §5, §8). By DEA's costs the
  CCGT is the cheaper plant where the response runs more than 850–1 190 hours a year: Finland's runs
  2 100–3 200 hours, Poland's 350–1 070 and SE4's about 400. SE4's dear hours are therefore understated in
  `TIGHTJ`.
- `TIGHT`'s SE4 and Poland bid their response as OCGTs at 189.0 €/MWh, so its Estonia has twice
  `TIGHTJ`'s dear hours (3 617 against 1 844 hours at or above 150 €/MWh with gas) at a similar average.

## D-122 · 2026-10-17 · D-121 deployed to /v5 (2026-10-13), recorded as its own decision

**Status:** Accepted · 2026-10-13 · the owner: "upload to v5".

**Decision:** `main` 9d2e719 (D-121) was deployed to /v5 on 2026-10-13: the gate passed (`make ci`,
`db.check --fast`), and `index.html`, the manifest, presets, sources and the three climate-year files
matched the build by SHA-256 over SSH. Not pushed.

**Consequences:** The deploy was first recorded by a sentence added to D-121's item 5 after that record
was committed (2ebc8b5), which AGENTS.md does not allow ("never edit an old one, supersede it"). This
record supersedes that sentence; D-121 is not edited again.

## D-123 · 2026-10-17 · The validation as it stands is accepted for release; the presentation of 10 November

**Status:** Accepted · 2026-10-17 · the owner, to the question how to treat the plant's results at his
public presentation of the model on 10 November 2026 if the validation gate is not met: "we set it so; a deviation of 17–18 €/MWh is acceptable". The
presentation: in Estonian, 10–15 minutes, for energy specialists, officials and the public and press.

**Context:** R-VAL-5 is not met. The hourly price MAE is 8.4–9.2 €/MWh in 2023, 10.3–11.4 in 2024 and
16.6–18.0 in the blind year 2025, against 15. The protocol's other breaches: 2023 (8) EE biomass,
LV gas, LV biomass, LT hydro_ps, the net flows EE–LV, LV–LT and LT–PL, LT–SE4's congested share;
2024 (5) EE biomass, LV gas, LT hydro_ps, the net flows EE–LV and LV–LT; 2025 (8) the three MAEs,
EE biomass, LT gas, LT hydro_ps, the net flows LV–LT and LT–PL. R-PUB-4 and R-SMR-8 kept every result
with the plant inside the repository until the gate.

**Decision:**
1. The protocol's results as they stand are accepted for release, the plant's included. R-SMR-8 and
   R-PUB-4 now read: the gate, or the owner's acceptance of the results as they stand (specification
   revision 2.13).
2. R-VAL-5's thresholds stay the target. Every release states the validation beside its figures: the
   page's gate line, the Calibration page, the exports and the presentation.
3. The site stays behind the password until the owner promotes it (R-DEP-3); the repository stays
   private (R-PUB-6).

**Consequences:** No figure moves. The gate line of every page, the contract card's note, the README,
the FAQ and the methodology say so.

## D-124 · 2026-10-17 · Revision 2.11 approved, the declaration confirmed, v5 promoted before 10 November

**Status:** Accepted · 2026-10-17 · the owner, to the questions of that day: on revision 2.11
"Accept (Recommended)"; on the declaration of interest "I approve as is"; on the site
"Full move to energiamudel.ee"; on the presentation's form "PowerPoint (.pptx)".

**Decision:**
1. Specification revision 2.11 is approved: the standard sensitivities (a) and (b) hold Poland's average
   at least at Svenska kraftnät's lowest 2040 price, 77.8 €/MWh (`Scenario.meanFloor`, in the code since
   0429408); a re-priced profile follows (d)'s gas. ERRATA E-149 and E-150 stand fixed. No figure moves:
   the page has shown the fixed sensitivities since that commit.
2. OPEN-9 is decided: the declaration of interest as it stands in the README and the footer (R-PUB-2);
   the presentation carries it in Estonian.
3. v5 is promoted before the presentation (R-DEP-3): v5 to `energiamudel.ee`, without the password; v3
   archived at `v3.energiamudel.ee`, so that links already given out keep working; `energiamudel.ee/v5`
   redirects to the root. The owner creates `v3.energiamudel.ee` in the zone panel and moves v3's own
   deployment there; the cut-over is set with the owner (planned 8–9 November).
4. The presentation is a PowerPoint deck (.pptx, with a PDF), in Estonian, 10–15 minutes (D-123).

**Consequences:** The repository stays private (R-PUB-6) and nothing is pushed by Claude. Until the
cut-over v3's deployment must not run unless its commit 8814cc5 (`--filter='P /v5/'`) is pushed, or it
deletes `/v5`.

## D-125 · 2026-10-17 · v5 promoted to energiamudel.ee; v3 3.5.0 archived at v3.energiamudel.ee

**Status:** Accepted · 2026-10-17 · the owner: "do the move now: v3.5.0 to https://v3.energiamudel.ee, and v5 on the main site" —
the cut-over of D-124, brought forward from 8–9 November.

**Decision and what was done:**
1. Backups on the server, outside the document roots: `~/cutover-2026-10-17/htdocs-before.tar.gz` (v3
   3.5.0 at the root with v5's staging copy) and `v3-dev-2026-07-20.tar.gz` (the July build of v3's
   branch `v3` that `v3.energiamudel.ee` held).
2. v3 3.5.0 (the root's build of 2026-09-24) copied into `www.energiamudel.ee/v3`, the subdomain's
   document root, keeping its `.htaccess`: `v3.energiamudel.ee` answers 401 with the site's realm,
   and its files equal the root's as they were.
3. v5 (`main` 1e9f057) deployed to `htdocs/` without the password: the gate passed (`make ci`,
   `db.check --fast`), `validate.deployed` found the public manifest equal to the build's, and seven
   files matched by SHA-256 over SSH. `https://energiamudel.ee` answers 200; `/v5/…` redirects to
   `/…`; `/stat/` to `https://v3.energiamudel.ee/stat/`.
4. `app/public/.htaccess` is the public file from now on, so that no later deploy puts the password
   back; the staging switch goes. The deployed copy differs from it in its first comment only.

**Consequences:** The model is public: R-PUB-2's declaration and D-123's gate line are on every page.
The repository stays private (R-PUB-6). v3's production deployment still writes `htdocs/` until the
owner pushes v3's commit e501c63 (ADR-035), which points it at the archive: until then a run of it
would replace v5 at the root.

## D-126 · 2026-10-17 · The opening view computed when the site is built; a browser's sets kept in it

**Status:** Accepted · 2026-10-17 · the owner: "why does the model compute again every time we open the page,
when we have changed nothing yet — isn't it better to show the data at once and compute when something
changes", and on the proposal "yes, do it and deploy".

**Context:** Every visit computed the opening view in the visitor's browser — the four scenarios on three
climate years, twelve runs, then the twelve runs of the standard sensitivities — 11–16 s on the
development machine before the cards showed (methodology §11), longer on a slower one. For the same
build, export and settings the figures are the same every time: the engine of record is deterministic
(methodology §5.5).

**Decision:**
1. `make deploy` computes the opening view after the build (`app/scripts/opening.ts`): the four
   scenarios' sets of the opening state and the shown scenario's four sensitivities, each climate year
   built and cleared whole by the engine of record — `split.test.ts` proves the workers' parts give the
   same result — and assembled by the worker's own code (`app/src/worker/assemble.ts`). It writes
   `data/opening.json.gz` with the commit the bundle was built from, the export's hash and the run's
   settings (`runKey`: the scenario shown and the strike move no dispatch).
2. The page shows that file without a run when the commit and the settings are its own, and its status
   line says the years were computed by the engine of record when the site was built. Another commit,
   other settings or no file: the page computes, as before.
3. A set the browser computes is kept in its IndexedDB under the commit, the export's hash and the
   settings, the last twelve, and shown again without a run when those settings come back. A
   development build keeps nothing.
4. Any change of a control computes in the browser as before (R-ENG-7). Specification revision 2.15
   says so.

**Consequences:** On the built site the cards show 1.9 s after the load (`vite preview`, the 2.8 MB file
fetched and decoded) instead of 11–16 s, with the same figures: Estonia 84.7 / 76.3 / 67.1 / 56.9 €/MWh,
the sensitivities +2.6 / +1.4 / −0.2 / +20.4. A change computes as before (twelve years in 11.9 s, Finland's
level at 1.05). The file is written by every deploy, so it cannot outlive its code; the deploy takes about
two minutes longer. The page keeps results in the visitor's browser and sends nothing (R-NFR-1); the FAQ
says so.

## D-127 · 2026-10-18 · The scenario shown computed first and drawn when it is in; the table fills as the others come

**Status:** Accepted · 2026-10-17 · the owner, asked before the night of 2026-10-17/18 whether the
scenario shown should be computed first and shown as soon as its three years are in, the other three
filled in as they come, the figures unchanged: "yes, as they become
ready"; with "definitely include a speed-up". On R-ENG-7;
specification revision 2.16.

**Context:** A change of a control computes the four scenarios' twelve years — about 60 s of solving
on one thread — and showed nothing until all twelve were in: 11.0–11.7 s on the built site
(the night report, 2026-10-18). The scenario shown had no precedence: Elering: gas came first only
because it is the first of `SCENARIOS`, and 2 SMR shown waited for all four. Of the table's figures
only the differences need another scenario, Elering: gas.

**Decision:**
1. The scenario view computes its four scenarios in `scenarioOrder` (`ui/wiring.ts`): the one shown,
   then Elering: gas, then the others in the table's order, at the pool's priorities 0, ¼, ½ and ¾.
   A scenario's first clearings wait behind the one before it and a year's later jobs go ahead of
   the queue (`runYear`), so each scenario's years finish before the next one's, whose first
   clearings fill the workers' gaps meanwhile (`pool.test`).
2. The scenario shown is drawn when its three years are in — the cards, the charts, the contract
   card — and its standard sensitivities start then, behind the others (`runTrio` in `main.ts`).
   Each other scenario fills its columns of the table as it comes in, and only the table is
   redrawn, so that a strike in the reader's hand stays there; until then its cells say
   "computing…" and the differences wait for Elering: gas (`trioHtml`).
3. The banner of D-054 says "Computing n years… The results below are from the previous settings
   and are not final." until the scenario shown is in, the results dimmed under it; then "Computing
   the other scenarios, n years…", nothing dimmed. The status line names the scenario shown's time
   beside the whole run's.
4. Showing another scenario while the run computes shows it at once if it is in, else when it comes
   in; its sensitivities replace the previous scenario's, whose queued and running jobs are dropped
   by their tag (`pool.cancel("sens")`) rather than by a new generation, which would drop the
   table's others too. A run of other settings in flight when the reader returns to the table's
   settings is superseded, as before; a table left incomplete by a superseded run is no answer for
   its settings.
5. The browser's store keeps a table only when all four scenarios are in (D-126); a saved file holds
   the scenarios in at the moment, the others left out (`schema/results.schema.json`).

6. The sensitivities still run when the table is in (D-028): started with the scenario shown, they
   took the gaps the table's last scenario left and delayed it by about a second, and finished no
   sooner themselves (the app's browser pane, Elering: gas shown: the table 11.8–12.4 s, the
   sensitivities 22.1–23.0 s).

**Consequences:** No figure moves: the order of the jobs changes, not what a job computes, and parts
are independent of their order (`split.test`). On the built site in a headless Chrome (this Mac,
eight cores, seven workers; `spikes/site-timing/`), a change of a control draws the scenario shown
after 3.8–3.9 s with Elering: gas shown and 3.7–3.8 s with 2 SMR (11.1–11.3 and 10.8–10.9 s before),
4.6 s on the first change after the page opens (12.3 s); the table is complete after 11.0–11.1 s
and the sensitivities after 21.8–22.0 s and 32.0–32.3 s, as before. This supersedes D-028 item 3
("the result replaces the previous one when the whole set is in") for the scenario view and amends
D-054's banner; a replay, one year, is unchanged.

## D-129 · 2026-10-18 · The presentation's states computed when the site is built

**Status:** Accepted · 2026-10-17 · the owner, asked before the night of 2026-10-17/18 what else to
take on: "the presentation's sets precomputed" — the states the
presentation of 10 November shows, so that a live demonstration does not wait for the engine. On
R-ENG-7; specification revision 2.17.

**Context:** Since D-126 the opening view comes with the site, but showing another scenario computes
its sensitivities (12 years, 24 with the plant, 11–21 s), and the neighbours' two tight profiles
(D-121), which the deck shows (`spikes/presentation-2026-11/figures.ts`), compute their four
scenarios and sensitivities (about 22 s). The deck's states are a handful, known in advance.

**Decision:**
1. `make deploy` computes after the build (`app/scripts/opening.ts`), on Node workers running the
   page's own job handler (`job.ts`, D-128), each year cleared whole: the opening view as before
   (`data/opening.json.gz`); the opening state's sensitivities for each other scenario shown; and
   for `TIGHT_2035` and `TIGHTJ_2035` taken from the opening state the four scenarios and each
   scenario's sensitivities. 180 years, about 2.6 minutes on seven workers.
2. Each set is a file, `data/sets/<n>.json.gz`, listed by the page's own id of it — the run key
   (D-126), with `|sens|scenario|id` for a sensitivity — in `data/sets.json.gz` with the bundle's
   commit and the export's hash. The page fetches the index when it first needs it and a set when
   it is asked for, after its own store and before computing (`known`, `runSensitivities`); its
   status line says the years were computed by the engine of record when the site was built.
3. The script fails beyond 2.5 MB for a table of four scenarios, 0.6 MB for a sensitivity, 30 MB in
   all; it wrote 47 files, 23.8 MB, the tight profiles' tables 1.7 MB each.

**Consequences:** No figure moves. A set from the site equals what the page computes in parts, to
the bit (the night's check on the tight profile's four scenarios and 2 SMR's sensitivity (a);
`test/worker.test.ts` for the pool). In a headless Chrome: a tight profile's cards after 0.3 s and
its sensitivities after 0.4–0.6 s (about 11 and 22 s computed), another scenario's sensitivities
after 0.04 s. A visitor fetches a state's files only when showing it: 2.8–4.2 MB for a profile.
Settings changed from these states compute as before. Each deploy writes the files again, so they
cannot outlive their code.

## D-128 · 2026-10-18 · Bit-identical speed-ups of the engine's scheduling; a problem cache tried and left out

**Status:** Accepted · 2026-10-17 · the owner: "definitely
include a speed-up", and on what may change "prepare for sign-off" for
the levers that move figures (D-130, proposed) — so here only what leaves every result to the bit.
On R-ENG-7, R-NFR-2, R-NFR-5.

**Context:** A change of a control solves 8,760 programmes, about 60 s on one thread; HiGHS's own
`run()` is 86–91 % of it, the page's code around it the rest (the exploration of 2026-10-17). Six
concurrent solvers saturate this Mac's performance cores (D-114). The golden fixture pinned no
scenario year.

**Decision:**
1. The opening view's climate year 2009 pinned bit for bit in the golden fixture, Elering: gas and 2
   SMR whole and 2 SMR's sensitivity (a), before any change (`scripts/golden_cases.ts`).
2. One job handler for the browser's workers and Node's (`src/worker/job.ts`): the bench and the
   build compute the page's jobs, floors and views included (ERRATA E-151); `test/worker.test.ts`
   finds the pool's year the whole year's to the bit.
3. A year's second clearing in parts as the first's come in: part k on the first's price up to its
   end (`secondPart`, `runYear`), since the commitment decides each day on that day and the day
   before and a part reads only its own weeks; `split.test` proves it for 1, 4, 7 and 12 parts. The
   pool gives a freed worker its next job once the answer's continuation has queued what follows.
4. After a view computed before is shown, each worker loads the solver and the years' files at the
   lowest priority (`warm` jobs); the engine does not run.
5. The browser's store opens once and keeps the newest twelve tables and twenty-four sensitivity
   sets apart (supersedes D-126 item 3's "the last twelve"), its index by time read without the sets.
6. Left out, with the reason:
   - *a cache of built problems in the worker* (an LRU of three): it would have saved about seven of
     a year's fifteen builds (3–4 % of a change), but with it Node 26.4's workers built, now and then,
     a sensitivity's problem with another class's CO₂ intensity — biomass and gas at Auvere's 0.923
     t/MWh — so that the year's CO₂ came out 1.02 Mt instead of 0.43, prices and dispatch the same: in
     3 runs of 10, never with V8's mid-tier compiler off (`--no-maglev`, 18 of 18) nor without the
     cache (8 of 8). No engine code writes a CO₂ intensity; the hazard is the JIT's, with this
     pattern of reuse, and the cache is not worth it;
   - twice as many parts: slower (the table 13.1–13.5 s against 12.2–12.4), each part building its
     year whole;
   - one HiGHS model per worker (0–3 %), the weekModel's constants per problem (about 0.2 %),
     transfer lists and part-sized arrays (under 0.5 %): not worth a change to how the solver or
     the engine is called.

**Consequences:** No figure moves: golden (seven cases) and golden:jsc to the bit, the pool test, the
worker test and the split test. On the built site in a headless Chrome (this Mac, seven workers;
with D-127): a change of a control draws the scenario shown after 3.2–3.6 s and 3.9 s on the first
change after the page opens (11.0–11.3 and 12.3 s before the night), the table after 11.0–11.1 s and
the sensitivities after 21.8–21.9 s and 32.2–32.5 s, as before. The ceiling is the solving itself;
what remains is in D-130.

## D-130 · 2026-10-18 · Solving less: HiGHS without presolve, and the first clearing's weeks kept where the commitment changes nothing — proposed

**Status:** Proposed — awaiting the owner's sign-off · 2026-10-18 · prepared at the owner's answer
before the night of 2026-10-17/18, "prepare for sign-off", to the
question whether to take the speed-ups that move figures. Branch `research/solver-speed`; nothing of
it is in main. On R-ENG-7, R-ENG-8, R-ENG-9, R-SUP-4; specification revision 2.18, proposed.

**Context:** After D-127 to D-129 a change of a control is bound by the solving itself: 8,760
programmes, about 60 s on one thread. Where an hour's optimum is not unique — the programmes are
degenerate (R-ENG-9) — the path HiGHS takes decides which optimum it returns, so any change to that
path moves single hours' prices: presolve off moved them in 333 of 26,352 zone-hours of the 2024 replay
(the night report of 2026-10-11, rejected then for that reason, before anyone measured what it meant
for the averages and the protocol). `spikes/solver-speed/` measured three levers on the opening view's
twelve years and the replays 2023–2025, on one thread:

| Lever | Speed | Zone-hours moved | Largest move | Averages | Replay MAE |
|---|---|---|---|---|---|
| presolve off | 1.75× | 1.27 % | 86 €/MWh | within 0.03 €/MWh | 2024 −0.13, 2025 +0.09 to +0.14 |
| warm start from the day before's basis | 1.45× | 0.30 % | 49 €/MWh | within 0.05 | unchanged |
| both | 1.75× | 1.36 % | 86 €/MWh | within 0.04 | as presolve off |

The second clearing of a year with oil shale's entry (D-113) solves 365 programmes again. In a
scenario year of 2035 the commitment keeps Auvere off in 45–52 of 53 weeks, and in those the first
clearing ran it at no hour: the week's programmes differ from the first clearing's by Auvere's columns
alone, at zero in its solution — which is so one of the committed week's optima. In a replay oil shale
runs and almost no week qualifies (0–6 of 53).

**Proposal:**
1. HiGHS solves with presolve off, in the engine (`app/src/worker/solver.ts`) and the reference
   (`reference/lp.py`) alike; a programme it leaves unsolved — status 15, met once, where the fit
   explores other markups — is solved again with presolve as before, so that no setting fails.
2. The second clearing takes the first's solution for a week in which the commitment keeps every
   entry class off — nothing offered, its must-run the problem's own floor — and the first clearing
   ran none of them at any hour (`sameWeek`, `copyWeek` in `lp.ts`; the parts as `runLP`, the first
   clearing's part sent with the second's, `split.test` to the bit). Other weeks are cleared anew.
3. The register in force is kept. `make fit` under the proposed solver lands on 37.5/70/220/280 and
   Kruonis's step 45, and scores worse on the protocol than the register in force under the same
   solver: the fit years' MAE sum 59.17 against 59.13, 2025's breaches 9 against 8.
4. The golden fixture is re-baselined, its engine-of-record cases provisional until the owner signs.
   `golden:jsc` agrees.

**Evidence** (the branch's `make ci` green; the tables in `docs/research/2026-10-18_night_report.md` §4):
- **Speed.**
  - Node bench, seven workers, a change of a control: the scenario shown after 1.7–1.8 s
    (3.7 s on the night branch), the table after 5.4–5.5 s (12.2–12.4), the sensitivities after
    11.2–11.5 s and 17.0–17.3 s (24.2–25.4 and 36.3–37.1).
  - One thread: the deck's 60 years in 114 s.
- **Figures.**
  - The opening view's averages move by at most 0.13 €/MWh. At the deck's precision:
    - 2 SMR's Estonia 67.1 → 67.2;
    - the tight profile's gas 122.8 → 122.9, its 1 SMR 113.1 → 113.2 (Latvia and Lithuania
      107.6 → 107.5), its 2 SMR 104.8 → 104.9;
    - the joint tight profile's 1 SMR 114.4 → 114.5;
    - sensitivity (d) with 2 SMR: 80.1 → 80.3 €/MWh, its capture price 81.6 → 81.8 and the CfD
      42.5 → 41.5 M€ a year.
  - Every other deck figure as it is.
- **Validation.**
  - The hourly MAE moves by −0.13 to +0.14 €/MWh: 2024 from 10.3 / 11.4 / 11.3 to 10.1 / 11.3 /
    11.2, 2025 from 18.0 / 16.8 / 16.6 to 18.1 / 16.9 / 16.8.
  - The breaches stay 8 / 5 / 8. The gate line's "8–18 €/MWh" stands.
  - EstLink 2's effect: 19.5 → 19.8 €/MWh, within 15–30.
  - The gap gate: 0.000 €/MWh on all 8 weeks, the reference on the same options.

**On sign-off:** merge `research/solver-speed` after `night/2026-10-18`. The golden cases lose
`provisional`; the deck is rebuilt (`figures.ts`, `deck.py`) before the freeze of 3 November; deploy
at the owner's word.

**On decline:** leave the branch unmerged. The night branch stands alone, every figure as it is.
Either part can go without the other: presolve off alone (the branch's first commit) gives the table
in 8.3–8.8 s.

## D-131 · 2026-10-18 · D-130 signed off: HiGHS without presolve and the first clearing's weeks kept, in main and on the site

**Status:** Accepted · 2026-10-18 · the owner: "I sign D-130, merge and
deploy", after D-130 was explained in plain words.

**Decision:**
1. D-130 is accepted as proposed:
   - HiGHS solves with presolve off, in the engine and the reference alike, solving again with
     presolve a programme it leaves unsolved;
   - the second clearing keeps the first's solution for a week in which the commitment keeps every
     entry class off and the first ran none of them;
   - the register in force is kept.
2. Specification revision 2.18 is approved (R-ENG-9, R-SUP-4).
3. The golden fixture's engine-of-record cases lose `provisional`; their digests are D-130's.
4. `research/solver-speed` goes into main and the site is deployed.
5. The documents restate the figures D-130 moved:
   - the validation table (§7.3) and EstLink 2's effect (§7.4, 19.5 → 19.8 €/MWh; the FAQ);
   - the opening state's 2 SMR (67.1 → 67.2 €/MWh, §5.9, §9);
   - the link variants on the profile as published (§9);
   - the adequacy samples (§9.1), re-run on the new engine.

   Each figure before D-130 stays in the trail beside the new one.

**Consequences:**
- A change of a control's table computes in 4.2–4.6 s on the built site (11 s before the night). The
  scenario shown comes after 1.4–1.7 s, the sensitivities after 9 and 13.5 s.
- The deck's figures move by 0.1 in a handful of places (D-130's list). Deck v2, built on the figures
  frozen on 3 November as planned (PLAN §9), carries them.
- The night report keeps D-130 as it was proposed.

## D-132 · 2026-10-18 · The two-pass engine removed from the repository

**Status:** Accepted · 2026-10-18 · the owner, asked at the start of the review of the code whether
the two-pass engine stays as the documented baseline: "remove". Supersedes D-026 item 2
("Deleting it is a later owner's decision"). Specification revision 2.19.

**Context:** The two-pass engine (D-016 to D-018) was the application's preview in revision 1.4
(D-021) and, since revision 1.5, a baseline the application does not run (D-026). It still cost:
- its own clearing, storage programme and Daugava rule (`clearing.ts`, `storage.ts`, `hydro.ts`
  and the two passes in `index.ts`) and their tests;
- two of the golden fixture's cases, a column of `make gap`, a timing in the bench;
- R-ENG-2 … R-ENG-5's text about it.

Its last gap to the programme was 3–10 €/MWh in the observed test weeks and 307 €/MWh in climate
year 2009's winter week (methodology §6).

**Decision:**
1. The engine goes, with:
   - its tests (the stack's in `clearing.test.ts`, `storage.test.ts`, `engine.test.ts`);
   - its golden cases (`synthetic_168h`, `replay_2024`);
   - its column of the gap report and its timing in the bench.
2. `index.ts` keeps the result types. The fields only the two-pass engine filled (`price0`,
   `planned`, `unhonoured`, `shortfallMwh`) stay, filled by the engine of record with its price and
   zeros as before, so that the golden digests and the stored views keep their bytes. The offers'
   ramp band (`width`, `RAMP`), which nothing else read, goes.
3. What its tests held of the market rather than of the method moves to the engine of record:
   - `clearing.test.ts`: v3's shortage probe, a boundary's price, a saturated import, losses on
     the importing side, prices apart only across a saturated link, a surplus spilled at the floor;
   - `lp.test.ts`: prices equal across an unsaturated link and DSR's hours per day among the
     random problems' invariants, a store's energy account, the Daugava's minimum flow and turbine
     limit.
4. Specification revision 2.19:
   - R-ENG-2 … R-ENG-4 retired, their text kept as it read;
   - R-ENG-1, R-ENG-5, R-ENG-8 and R-STO-3 name the engine of record alone;
   - the test weeks stay, as R-ENG-8's gate's.
5. The methodology keeps §5.2–5.4 and §6's last gap table as history. The code as it last stood
   is at 74b62c0; `spikes/storage-impact/` and `spikes/preview-fix/` run on it.

**Consequences:** No figure moves:
- the engine of record's five golden cases are unchanged in V8 and in JavaScriptCore;
- `make gap`'s report is the same less the two-pass column (8 of 8 weeks at 0.000 €/MWh);
- the app's tests pass, 191 of 191.

About 1 000 lines of code and tests go.

## D-133 · 2026-10-18 · The golden digests take the Daugava's water value, spill and water left

**Status:** Accepted · 2026-10-18 · executor, on the owner's instruction to close the code's debts
("let's review the code and close the technical debts"); no figure moves. The owner sees it before
the branch is merged.

**Context:** The review of the code found that the golden fixture's digests left out three
figures a run returns:
- the Daugava's weekly water value, which the page shows;
- the cascade's spill;
- the water the cascade left unreleased.

D-130's reuse copies all three from the first clearing (`copyWeek`), and the split test compares
two paths that both copy them, so an error there passed every check.

**Decision:**
1. The digests hash them after the arrays they hashed before (`scripts/golden_cases.ts` `arrays`,
   one list for V8 and JavaScriptCore).
2. The five cases are re-baselined. The engine is the same commit's (9549615), whose digests of
   the old list were unchanged, so only the hashes' input moved:

   | Case | Before | After |
   |---|---|---|
   | synthetic_168h_record | 35337af9… | c8980220… |
   | replay_2024_record | 42485fb4… | e2362947… |
   | opening_cy2009_gas_record | 6e62e024… | afd57272… |
   | opening_cy2009_smr2_record | 869a4f2d… | 235958ab… |
   | opening_cy2009_smr2_sens_a_record | ecfc8987… | ae94fc2f… |

3. `scripts/golden.ts` fails on a fixture case it no longer computes, as `golden_jsc.ts` did.
   `golden_jsc.ts` fails where it cannot run under CI, and the inert workflow runs on macOS,
   which has the jsc shell.

**Consequences:** JavaScriptCore gives the new digests as V8 does. A change to the water value, the
spill or the water left now fails the fixture.

## D-134 · 2026-10-18 · Sets taken again by what they compute from: the clause without the plant, a gas floor under the gas

**Status:** Accepted · 2026-10-18 · the owner, at the start of the review of the code, among its extras:
"sets reused when the clause changes". On R-ENG-7, R-NFR-2;
no figure moves.

**Context:** The page kept sets by the run's settings (`runKey`, D-126). Turning the plant's clause on or
off changed that key, so the whole table and every sensitivity were computed again. That included
Elering: gas, which has no plant and so never reads the clause (`build.ts` reads it under the plant's
units). Likewise, sensitivity (d)'s gas floor changes nothing where the scenario's gas price is already
at or above it: a scenario's gas price is the same every hour, and the floor only raises a price that is
lower.

**Decision:**
1. A set's key is what it computes from (`jobKey`, `app/src/state/text.ts`): the settings, the gas floor
   and the boundary floors, less
   - the strike;
   - the clause in a run without the plant;
   - a gas floor at or under the scenario's gas price.
2. The page keeps its twenty-four latest sets by that key, seeded from the sets it shows from the build
   or the browser, and takes a set from there before computing it.
3. Proof: the built problem with the clause on and off for Elering: gas, and with the gas floor under
   the gas and without it, are the same to the bit, and so is the neighbours' gas level the view reads;
   the key keeps the clause for a scenario with the plant and a floor above the gas
   (`test/state.test.ts`).

**Consequences:** No figure moves: every set comes from the same engine input, to the bit. With 2 SMR
shown, the clause turned on computes nine years of the table instead of twelve and twelve sensitivity
years instead of twenty-four. In a headless Chrome on the development machine (seven workers) the
table took 3.5–3.7 s and the sensitivities 8.1–8.4 s, against 4.9 s and 14.4 s for a change of
Finland's level. Turning it off again was already instant: the browser's store has those settings
(D-126).

## D-135 · 2026-10-18 · A link held at 0 MW is congested the way the prices pull — proposed

**Status:** Proposed · 2026-10-18 · executor, from the review of the code. It moves a stored figure,
so it waits for the owner's word on a branch of its own (`research/review-figures`), as the owner asked
for such findings ("Errors found that shift the figures"), and as D-130 was. On R-BND-7, R-VAL-4.

**Context:** The engine marks an internal link saturated in an hour when its flow is within 1e-6 MW of
a limit. With a limit of 0 and no flow, that is true of every such hour. The summaries
(`results.ts summarise`, `scripts/validate_fit.ts evaluate`) then filed every saturated hour without a
positive flow as congested against the link's direction, whichever way the prices pointed. The
external borders count an hour only when something flows, so the two kinds of border disagreed.

**Decision (proposed):** an internal link's saturated hour counts
- the way its flow runs;
- with no flow, the way the prices pull, towards the dearer zone;
- with equal prices (within 0.005 €/MWh), neither (`congestedWay`).

**Before and after** — EE–LV, share of the year's hours congested, % (the replay as published, and a
what-if of the panel):

| | Along (EE→LV), before → after | Against, before → after |
|---|---|---|
| Replay 2025 | 21.38 → 21.39 | 3.73 → 3.72 |
| Replay 2025, EE–LV at 0 MW through January | 21.38 → 24.11 | 12.09 → 9.20 |

Every other state the site publishes has no such hour, and its figures do not move:
- the opening view's twelve years;
- the two tight profiles' twenty-four;
- the replays 2020–2024 and 2026.

**Consequences:** One stored figure moves: replay 2025's EE–LV, where one hour (Latvia dearer, the link
out) moves from against to along in `data/derived/validation/2025.json`. The page shows it to a
decimal in the border table (21.4 and 3.7 %) and to a whole per cent on the Calibration page (21 and
4 %), unchanged in both. No breach changes. A what-if that holds a link at 0 MW now counts its hours
the way the prices pull.

**On decline:** revert the branch's commit; `2025.json` returns as it was.

## D-136 · 2026-10-18 · The review in main: D-135 accepted, E-154 closed, the lineage dates kept

**Status:** Accepted · 2026-10-18 · the owner: "merge the
debt branch into main and deploy it". On the three points left to them, they wrote "on D-135 decide yourself", "E-154 decide yourself" and "decide D-135 / E-154 / the two
dates yourself". The executor decides as below.

**Decision:**
1. `debt/2026-10-18` goes into main by fast-forward and to the site.
2. D-135 is accepted, and `research/review-figures` goes with it:
   - the internal links now count congestion as the external borders do, and as the prices say;
   - the one figure the site publishes that it moves is replay 2025's EE–LV, by one hour, and no view
     shows it at the precision that hour changes;
   - a what-if that holds a link at 0 MW was filing its hours the wrong way: in D-135's example,
     against 12.09 → 9.20 % and along 21.38 → 24.11 %.
3. E-154 is closed with no change:
   - since revision 1.6 the application runs the target year 2035 only, and the text's parser refuses
     any other target;
   - so no state reads 2050's inflow. The review's "a scenario's text can name 2050" was wrong: the
     schema lists the year, the parser does not take it;
   - the export keeps ENTSO-E's figures as published;
   - if the application ever runs another target year, the Daugava's inflow for 2050 is to be taken
     as 2030's and 2040's, which are the same: the inflow belongs to the climate year.
4. The two lineage records' dates stay as the database holds them, 2026-10-17:
   - a derived record's date is when it was last written, and the night of D-130 re-wrote both with
     the register in force, its values the same;
   - putting back 2026-10-11 would mean editing provenance records by hand;
   - the export stays what the database gives (R-DATA-5), as `make check`'s rebuild finds it;
   - the page names a derived record's inputs, not its date (R-APP-9).

**Consequences:** D-135's table stands. The deploy computes the opening view and the presentation's
states anew for main's commit, and they are compared with the files the site served before it.

## D-137 · 2026-10-18 · E-156's figures kept: a first clearing's week is taken only if no window of it ran an entry class at any hour it solved

**Status:** Accepted · 2026-10-18 · the owner: "we keep the new
figures of E-156", after the report of the deploy of main 4e130a8.

**Context:** The review's engine commit 9549615 made D-130's reuse check every hour a window of the
first clearing solved, the hours it only looks ahead to included; before, it checked the hours the
windows committed. The commit was said to move no figure. The comparison after the deploy (D-136)
found that it moved week 47 of climate year 1995 in 3 SMR's sensitivities (a) and (b) of the opening
state (ERRATA E-156). No figure the page shows moved; the export's line for (b) gives Estonia's
average 57.78 → 57.79 €/MWh.

**Decision:**
1. The stricter condition stays, and the figures it gives are the model's. They have been on the site
   since the deploy of 4e130a8.
2. It is the condition D-130's argument needs: the entry's columns at zero in every hour a window
   solves. R-SUP-4's text since revision 2.18, "the first pass ran none of them", already says so, and
   the specification is not revised. The methodology (§5.8) names the looked-ahead hours.
3. An engine change is said to move no figure only after `app/scripts/compare_sets.ts` also finds the
   site's sets the same, beside the golden fixture.

**Consequences:** E-156 is closed. Nothing on the site changes. The methodology's added words reach
the site with its next deploy.

## D-138 · 2026-10-18 · The two-pass engine's leftovers removed: the result's unused fields and the stores' rounded values

**Status:** Accepted · 2026-10-18 · executor, at the owner's choice of the day's work, "Loose ends of the review"
(the review's open items that move no figure); on `day/2026-10-18`, which the owner sees before it is
merged. No figure moves.

**Context:** D-132 removed the two-pass engine and kept what only it had used, so that the golden
digests and the stored views kept their bytes (the review's report, "Left open"):
- the result's `price0`, the price again; each store's `planned`, all zeros, and its `unhonoured` and
  `shortfallMwh`, both 0;
- each store's `hours` and `budget` rounded to whole steps, beside the exact `exactHours` and
  `exactBudget` that the engine of record and the reference take (ERRATA E-124).

**Decision:**
1. The four result fields go. The digests stop hashing `price0` and `planned`. The five golden cases
   were re-baselined on the engine before the removal, and the removal leaves them to the bit, in V8
   and in JavaScriptCore:

   | Case | Before | After |
   |---|---|---|
   | synthetic_168h_record | c8980220… | c2d2fce0… |
   | replay_2024_record | e2362947… | a3b154e8… |
   | opening_cy2009_gas_record | afd57272… | ae437193… |
   | opening_cy2009_smr2_record | 235958ab… | dc855602… |
   | opening_cy2009_smr2_sens_a_record | ae94fc2f… | 67ba20b5… |

2. A store's `hours` and `budget` are the exact values. `exactHours` and `exactBudget` go from the
   engine, the gap's problem files and the reference. The golden fixture is unchanged by it, and
   `make gap` writes the same `gap.json`.
3. A stored view's store summary loses `unhonoured` and `shortfallMwh`, zeros the page never showed.
   The browser's store and the site's files are read only for the commit that computed them (D-126),
   so no view crosses the change. `app/scripts/compare_sets.ts` takes `--drop=` for such fields.

**Consequences:** The engine's types say what it computes. Against the sets computed at af0026b, the
next deploy's differ by the two dropped fields only (the day's report).

## D-139 · 2026-10-18 · A 2035 scenario keeps Kruonis whole in the day-ahead market

**Status:** Accepted · 2026-10-18 · executor, at the owner's "do
everything you think is right", on the question D-073 and the dear hours' research left to them.

**Context:** In a replay Kruonis delivers at most what the record shows a week's units delivered (D-073),
and Litgrid holds two of its four units, about 400 MW, as mFRR reserve. A 2035 scenario offers the whole
plant, 938 MW in the opening state. Whether a scenario should hold the reserve units out was left open
(`docs/research/2026-10-11_dear_hours.md` §9).

**Decision:** The scenarios keep the whole plant. Held out, the 400 MW move every opening-state figure by
0.1 €/MWh at most, and the contract at 90 by 0.4 M€ a year. That is within the solver's own spread between
optima (D-130), so a second assumption would add a control and no information
(`docs/research/2026-10-18_kruonis_balancing.md`; `spikes/kruonis-balancing/reserve_units.ts`).

**Consequences:** No figure moves. The question is closed for the scenarios. The replays' weekly power
(D-073) stays as it is.

## D-140 · 2026-10-18 · A fifth standard sensitivity: CO₂ at its 2026 price

**Status:** Accepted · 2026-10-18 · the owner's choice of the day's long work, "CO₂ as a sensitivity", offered as a fifth standard sensitivity beside (a)–(d) with a revision of R-APP-11.

**Context:** The scenarios take ERAA 2025's CO₂ price, 197.5 €/t in 2035. That price alone puts Estonia's
2035 price at 84.7 €/MWh where Ea Energy's study for the Ministry of Climate, on about 97 €/t, finds 54.
Run on Ea's CO₂ and gas, this model gives 57.8, and with Ea's demand 54.9
(`docs/research/2026-10-18_ea_energy_comparison.md`). The standard sensitivities moved the gas price
(d) and never the CO₂ price.

**Decision:**
1. **(e) CO₂ at its 2026 price.** The run's CO₂ price is set to the EU allowance's average price in
   2026's EEX auctions, to the last day the export holds: 78.1 €/t to 9 October 2026. The export fixes
   it with its lineage, as (d)'s gas (`export/tables.py` `sensitivity`, `presets.sensitivity.co2_2026`).
   Gas is unchanged, and the neighbours' re-priced profiles follow the CO₂ as they follow (d)'s gas
   (D-072, ERRATA E-150).
2. **Specification revision 2.20** writes it into R-APP-11.
3. **Where it shows.** The page shows five cards. The export's sensitivities, the CSV's header lines
   and the presentation's states carry (e) like the others.

**Consequences:**
- No figure of the headline or of (a)–(d) moves.
- The build computes more years for the presentation's states.
- The value follows the auctions until the freeze of 3 November, as (d)'s month does.

## D-141 · 2026-10-18 · The interface in Estonian

**Status:** Accepted · 2026-10-18 · the owner's choice of the day's long work, "an Estonian interface", with the presentation of 10 November in Estonian; specification revision 2.21.

**Context:** R-NFR-9 put everything in English, the interface text included. The presentation of
10 November is to Estonian experts, its deck and its questions and answers are in Estonian
(`spikes/presentation-2026-11/`), and the live model is part of it.

**Decision:**
1. **The reader chooses.** The header's button, or `?lang=et` in the address, loads the page in
   Estonian; the choice is kept in the browser and the button switches back. English stays the default.
2. **The English text is the key.** The code passes its English text through `t()` (`app/src/ui/i18n.ts`);
   `app/src/ui/et.ts` holds the Estonian of each, and a text without an entry shows in English. A test
   holds every text the code translates to an entry with the same places to fill (`test/i18n.test.ts`).
3. **What is translated:** the page's shell, the gate line and the declaration of interest, the Model
   view — panel, cards, the scenarios' table, the contract card, the sensitivities, the charts, the
   borders — and the validation run. Numbers take the decimal comma. The other views (Adequacy,
   Calibration, Import price, Weather, Statistics) and the Sources keep their English for now.
4. **The documents:** the questions and answers in a short Estonian translation (`docs/faq_et.md`),
   shown in their place; the methodology stays in English and its tab says so. Where the two languages
   differ, the English text binds.

**Consequences:**
- No figure moves; English pages are as they were.
- The Estonian of the gate line and of the declaration of interest is a translation of texts the owner
  confirmed in English (D-123, D-124); the owner reviews it before 10 November.
- A change of an English text without its Estonian fails the test, so the two stay together.

## D-142 · 2026-10-19 · Every view in Estonian, and the methodology's short Estonian summary

**Status:** Accepted · 2026-10-19 · the owner's choice for the night of 2026-10-18/19, "Estonian: the remaining tabs" with "Brief summary" for the methodology; specification revision 2.22 (R-NFR-9).

**Context:** D-141 translated the Model view, the validation run and the questions and answers; the
other views and the Sources stayed English, and the methodology's tab said it was English.

**Decision:**
1. **The other views in Estonian:** Adequacy, Calibration, Import price, Weather, Statistics and the
   Sources view, by the same `t()` and dictionary (`app/src/ui/et.ts`); the test of D-141 covers them.
   Quotations of ENTSO-E's documents stay in their English, marked as quoted; the sources' own
   descriptions stay as their publishers give them, and the Sources view says so.
2. **The methodology:** `docs/methodology_et.md`, a short Estonian summary (what the model does, its
   inputs, the bids, the validation, how to read the results, the limits), on the tab "Metoodika
   lühidalt"; the full methodology, in English, on a tab beside it. Where the two differ, the English
   binds.

**Consequences:** No figure moves. The month names of the charts and of the import-price tables follow
the language, and so do the charts' axis figures (Estonian writes "0,5" and "15 000"). English pages are
as they were but for one drawing: the import-price page's generation bars leave room on their right for
the longest label in either language, so they are about 1 % shorter than before (the Estonian label was
cut off there).


## D-143 · 2026-10-19 · The pages readable on a phone

**Status:** Accepted · 2026-10-19 · the owner's choice for the night of 2026-10-18/19, "phones and an offline copy"; specification revision 2.22 (R-UI-3). It supersedes
D-095 §3 ("desktop only … no phone layout", 2026-10-07).

**Context:** R-UI-3 designs the site for a desktop, usable from a 960 px window, and D-095 kept it so.
The presentation of 10 November sends its audience to energiamudel.ee, many on their phones. At 375 px
the page was 709 px wide and scrolled sideways: the header did not wrap, the controls kept their 360 px
column beside the results, and the legends beside the narrow charts were cut off.

**Decision:**
1. **One column under 900 px.** The header wraps — the title with the language and theme buttons, the
   views, the run — the results come first and the controls under them, and nothing is wider than the
   screen. A wide table scrolls in its own box; the scenarios' table and the weather years' table keep
   their labels in view while they scroll.
2. **The charts** put their legend under the plot when the page is narrow, and the time axis names
   every other month where every month's name does not fit (Estonian's names are longer).
3. **Pop-ups** — sources, explanations, a bid's parts — are no wider than the screen.
4. From 901 px up the pages are as they were, but for the time axis of point 2 where it is narrow.

**Consequences:** No figure moves. The keyboard's order stays the document's, the controls first; on a
phone the results show first, an order of display only. The night report gives the checks: 375 and
768 px, both themes and both languages, and WebKit with an iPhone's screen.

## D-144 · 2026-10-19 · The engine runs in Node without Maglev

**Status:** Accepted · 2026-10-19 · the executor, within the owner's choice for the night "the release of 3 November, reliable", which asked for the root cause of the worker
test's rare failures. No figure moves (finding 3).

**Context:** Since the night of 2026-10-18 the worker test (`app/test/worker.test.ts`) failed now and
then under load, and a cache of built problems was dropped for the same signature (D-128). The runs
are in `docs/research/2026-10-19_maglev_hazard.md`.

**Findings:**
1. Under load, Node 26.4.0 (V8 14.6.202.34-node.21) computed a wrong year in 10 of 140 runs of the
   test: a unit with another unit's CO₂ intensity, class or capacity, a store in another store's
   place. With `--no-maglev` — V8's mid-tier compiler off, its top tier on — none in 400 runs. The
   main thread failed as well as the workers: a read compiled wrong, not a race of ours.
2. The browsers did not show it: Chrome 155 and WebKit 26.5 gave every year equal to the references.
3. The live site's computed sets, computed again without Maglev, are the same: the opening view and
   all 57 presentation sets (`scripts/compare_sets.ts`).

**Decision:**
1. Every engine run in Node goes with `--no-maglev`: the tests, golden, golden:jsc, bench and replay
   (`app/package.json`), gap, validate and the deploy's precompute (`Makefile`), the fit
   (`validate/fit.py`).
2. `app/scripts/highs.ts`, which every engine run in Node loads, throws when the flag is missing, so
   that no script computes with Maglev by mistake.
3. `scripts/compare_sets.ts` also reads a site's sets by its address, for the freeze (D-145) and
   after a deploy.
4. The browsers' engines are left as they are.

**Consequences:** About 3 % more CPU and no more time: the deploy's precompute took 92 s without
Maglev and 93 s with it, golden 5.7 s against 5.6 s. On an upgrade of Node, the research note's test
runs 400 times with the default flags before the flag is dropped.

## D-145 · 2026-10-19 · The freeze in one command, and the site without the network

**Status:** Accepted · 2026-10-19 · the owner's choices for the night of 2026-10-18/19, "the release of 3 November, reliable" and "phones and an offline copy".

**Context:** The rehearsal of 2026-10-18 (`docs/research/2026-10-18_freeze_rehearsal.md`) ran the
freeze's steps by hand and set their order for 3 November. The presentation of 10 November shows the
live model, and a hall's network may fail.

**Decision:**
1. **`make freeze`** runs the rehearsal's order from a clean commit: the year's partial weather and
   auction files set aside (D-111) in `data/raw-aside/<date>/`; `make history` and `make nordpool`;
   `make db`, `make export` and `make check`; the validation tables and the EstLink 2 gate; the site
   built with its sets and compared with the live site's; the deck's figures and a preview of the
   deck, `data/derived/presentation/kulmutatud_<date>.pptx` — never the owner's file. It stops at the
   first failure, and commits and deploys nothing: both stay the owner's. `FETCH=0` leaves the fetches
   out and runs the rest on the data as they are.
2. **`make offline`**, after a deploy, copies the site as deployed to `data/derived/offline/` with
   `energiamudel.command`, which serves it on the Mac when double-clicked and opens it in Estonian. The
   page needs nothing from the network: its code, data, fonts and sets are in the copy.

**Consequences:** No figure moves. Its rehearsal on the data of 2026-10-19 (`make freeze FETCH=0`) is
in `docs/research/2026-10-19_night_report.md`.

## D-146 · 2026-10-19 · The workers warmed by a week; a phone holds two workers

**Status:** Accepted · 2026-10-19 · the executor, within the owner's choice for the night "phones and an offline copy" (Safari's speed on an iPhone). No figure moves.

**Context:** Since D-128, while a view computed before is shown, each worker loads the solver and the
year files, the engine not running; a warm-up that ran the engine was left out, Chrome gaining nothing
measurable from it. This night measured Safari's engine — Playwright's WebKit 26.5 with an iPhone 15's
screen and touch, on the 8-core development Mac:
- its first change took 3.8–3.9 s to the scenario shown, against 1.4–1.5 s for the changes after it;
- its content process held 1.1 GB with the view open and 2.5 GB while seven workers computed: about a
  quarter of a gigabyte a worker (1.07 GB with one, 1.65 GB with three).
An iPhone has two fast cores, and Safari closes a page that holds too much memory.

**Decision:**
1. **The warm-up clears a week.** The warm-up job carries the state shown; after loading, each worker
   builds the first year, clears its first week (`clearPart`, 1 of 52) and drops it, at the lowest
   priority, so that a change made at once still goes first.
2. **A phone holds two workers at the most:** a page narrower than 900 px with a coarse pointer — a
   touch screen — starts min(2, cores − 1) workers; any other page min(8, cores − 1), as before.

**Consequences:**
- No figure moves: a year does not depend on how many workers share it (`split.test.ts`), and the
  worker test now warms each worker first and holds the years after it to the bit.
- WebKit's first change: 3.8 → 2.5 s to the scenario shown, 7.2 → 5.9 s to all four, 13.4 → 12.4 s to
  the sensitivities; Chrome's 1.9 → 1.7 s to the scenario shown; later changes as before.
- With an iPhone's profile and two workers: at most 1.2 GB; a change took 3.8 s to the scenario shown,
  11 s to all four and 28–44 s to the sensitivities on this Mac's cores. A real phone was not tried.

## D-147 · 2026-10-19 · The fit's records as the register in force; the freeze builds the database afresh

**Status:** Accepted · 2026-10-19 · the executor, from the rehearsal of `make freeze` (D-145) within the
owner's choice for the night "the release of 3 November, reliable". No figure moves.

**Context:** The rehearsal (`make freeze FETCH=0`, 2026-10-18 evening) stopped at `make check`: a
database built afresh differed from `data/energiamudel.duckdb` in its `lineage` table, with the same
7 268 rows. Two records differed, the fitted markup (`pipeline.markup.2023-2024`) and the batteries' Δ
(`pipeline.battery_delta.EE.2026`):
- the database held them as the fit of 2026-10-11 wrote them, whose register is in force (D-115:
  markup 32.5 / 80 / 220 / 260 €/MWh at Kruonis's step 60, Δ 71.5; D-131);
- the files in `data/lineage` held a refit of 2026-10-17 that was not adopted (step 45, markup 37.5 /
  70 / 220 / 280). Its parameters were put back in `data/derived/fitted_parameters.json`, which the
  repository holds; its records stayed, as `data/lineage` is not in the repository.
- `make db` loads the records with `ON CONFLICT DO NOTHING` (a fact row's key cannot be replaced
  under DuckDB's foreign keys), so a record written again keeps its old row in an existing database,
  and only a new one takes it.

**Decision:**
1. The two records are written back from the database's rows: the fit of 2026-10-11, whose register
   the engine uses. The refit's are kept in `data/raw-aside/2026-10-19-lineage/`.
2. `make freeze` builds the database afresh (`make clean db`), so that the records it fetches again on
   3 November — the year's weather and auction files (D-111) — reach the database.

**Consequences:** No figure moves. With the database built afresh `make check` passes every check: the
rebuild identical in every table, the export rebuilt byte for byte. The export changes in two dates:
the sources date the two records 2026-10-11 again (ERRATA E-158), and its hash moves a3355e3bb877 →
3b45bfff392b, so the next deploy computes the sets anew, as every deploy does.

## D-148 · 2026-10-19 · A line limited by dates in the scenario view too

**Status:** Accepted · 2026-10-19 · the owner: "bring this
function back to the scenario too", on the limits of a line by dates; specification revision 2.23
(R-LINK-4).

**Context:** R-LINK-4 lets the reader hold a line at most at some MW from one date to another.
Revision 1.6 (D-036) kept a switch per line in the scenario view and left the limits by dates to the
validation view. The engine caps a held line in a scenario year as in an observed one (methodology,
"What-ifs").

**Decision:** The scenario view's Links box has the same editor under its switches: a line, at most
how many MW, from and to which date of 2035; the holds are listed with a button to remove each. A
held line is dashed amber on the map, as in validation.

**Consequences:** No figure moves: the opening state holds no line. A held state is not among the
states the site computes before (D-129), so the page computes it. Checked: EstLink 2 at 0 MW from
1 January to 31 March 2035 puts Estonia's 2035 average under Elering: gas at 93.9 €/MWh against
84.7.

## D-149 · 2026-10-21 · Desktop only

**Status:** Accepted · 2026-10-21 · the owner: "we
drop the mobile version, desktop only", and, asked what a phone should show, "desktop
only" (the desktop page, no notice); specification revision 2.24 (R-UI-3). Supersedes D-143's phone
layout.

**Context:** D-143 (revision 2.22) made the pages readable from 360 px wide: under 900 px one column,
the results above the controls, the header in three rows. The panel's rows have since become tiles beside
fill bars, and longer names (the oil-shale classes by their units, the same day) cost a narrow column
lines; every change was checked twice, at a desktop's width and at a phone's. Before D-143 the
specification asked for a desktop only (D12, the owner on 2026-09-24).

**Decision:** The page is laid out for a desktop browser from 960 px. The viewport is fixed at 1 280 px,
so a phone shows the desktop page zoomed out; there is no notice. The phone's one-column rules are
removed. A phone still holds two workers at the most (D-146), told now by a touch screen under 900 px on
its shorter side, since the page's width no longer tells it; the scenarios' table keeps its labels in view
when a narrow window scrolls it.

**Consequences:** No figure moves. On a phone the page is small and the computing slow; the states
computed when the site is built show at once. The FAQ, the methodology (§8), the questions and answers
(K47, the checklist's item 7) and the demo script no longer invite the audience to open the site on a
phone.

## D-150 · 2026-10-21 · The plant bids at the market's floor

**Status:** Accepted · 2026-10-21 · the owner: "for correctness the lowest possible bid should be set after all", then
"accept" on the figures below. On R-SMR-4 and R-PAR-2.

**Context:** Under a plain contract the engine entered the plant as a fixed output: its available power
in every hour, whatever the price. Its tile on the panel showed its running cost, 15.6 €/MWh (uranium
2.2 €/MWh of fuel ÷ 0.33 + 9.0 running costs, ERAA 2025's common data), which no dispatch used.
R-SMR-4 already says the plant "produces whenever the price is above the floor".

**Decision:** Under a plain contract the plant bids all it has available at the market's floor, the
SDAC minimum of −600 €/MWh (R-PAR-2), so it runs unless the price falls to the floor itself; under the
negative-price clause nothing changes (its minimum load fixed, the rest at 0.01 €/MWh). The tile shows
the bid, −600 (0 under the clause), the running cost in its tip.

**Consequences:** The plant's output is the same to the megawatt-hour in every set the site computes;
the solver, given an offer in place of a fixed output, picks other optima in hours where the optimum is
not unique (as D-130 found). The opening table's figures are unchanged at the precision shown (Estonia's
average 76.256 → 76.275, 67.168 → 67.157, 56.926 → 56.927 €/MWh with one, two and three units; Gas &
RES and its five sensitivities identical); the hours of gas show 430 and 170 for 429 and 169 with one
and three units. Over the 57 presentation sets the largest change of a weighted average price is
0.11 €/MWh, of one year's 0.19, at most 144 hours of a year move, one shortage hour by up to
223 €/MWh, and one sensitivity's unserved energy by 90 MWh a year. The golden fixture's two 2 SMR
cases are re-baselined; the site's sets are computed again at the next deploy.

## D-151 · 2026-10-21 · The four scenarios on one base; the gas scenario named 0 SMR

**Status:** Accepted · 2026-10-21 · the owner: "let all
scenarios have the same base and differ only in the number of reactors; rename the scenario 'Gaas ja
taastuvenergia' to 0 SMR"; specification revision 2.25 (R-SMR-1, D6). Supersedes D-036's rule that each
unit replaces 300 MW of the Estonian peaking gas.

**Context:** Since D-036 each unit took its 300 MW off Estonia's peaking gas (1 364 MW in S1), so the
four scenarios held the same firm capacity. A run with the units on top of the gas (`spikes/smr-on-top`,
the same day) gave Estonia's average 0.6–0.7 €/MWh lower in the plant's scenarios, and no unserved energy
either way: the gas the units displaced ran a few hundred hours a year, and with it Estonia met its
dearest hours itself at the flat 189 €/MWh of its gas rather than from Latvia's and Lithuania's marked-up
gas (R-SUP-6).

**Decision:** The plant's units come on top of the scenario's fleet (`engineScenario` no longer takes
the gas off); the four scenarios share one base — S1 with all its gas — and differ only in their units.
The scenario without the plant is named *0 SMR* in both languages (it was *Gas & RES*, *Gaas ja
taastuvenergia*; until that morning *Elering: gas*); its figures do not move. The SMR row's tip says the
units are added; the gas row's hint of the gas left in the market is gone.

**Consequences:** The plant's scenarios move (weighted over the climate years, opening state):

| | before (in place of gas) | after (on top) |
|---|---|---|
| Estonia's average, 1 / 2 / 3 SMR, €/MWh | 76.3 / 67.2 / 56.9 | 75.6 / 66.5 / 56.3 |
| Latvia's | 77.9 / 75.8 / 74.6 | 77.7 / 75.6 / 74.5 |
| the plant's capture price, €/MWh | 77.6 / 68.2 / 57.7 | 77.0 / 67.5 / 57.0 |
| the contract (a) at 90 €/MWh, M€ a year | 31.3 / 110.2 / 244.8 | 32.9 / 113.9 / 249.8 |
| hours Estonia's gas ran | 430 / 302 / 170 | 423 / 292 / 147 |
| the tight profile, 2 SMR: Estonia's average; the contract | 104.9; −83.1 | 99.1; −52.9 |

*0 SMR* and its five sensitivities are unchanged; 2 SMR's sensitivities move by up to 0.9 €/MWh (slow build and slow demand 67.8 → 66.9, gas shock
80.3 → 80.0, CO₂ at its 2026 price 50.1 → 50.1). The golden fixture's two 2 SMR cases are re-baselined;
every set the site holds is computed again at the next deploy. The deck's figures are recomputed at the
freeze (`figures.ts`); the demo script and the questions and answers carry the new figures. Research
computed before this decision with the units in place of gas — the plant's robustness over 300 input
combinations (deck slide L4), Finland's slope (R-BND-6), the Ea Energy comparison, the CO₂ sweep (slide
L5) — stands as computed under D-036's rule; its effects are about 0.6–0.7 €/MWh smaller than the units on
top would give.


## D-152 · 2026-10-21 · A Presentation page: the four scenarios of 2035 on one page

**Status:** Accepted · 2026-10-21 · the owner: "make a presentation tab at the top with a
summary of the findings on one page: …"; specification revision 2.26 (R-APP-15).

**Context:** The Model view shows one scenario's cards and charts and the four scenarios' table; the
presentation of 10 November needs the four side by side with what they assume. D13 dropped in-app
presentation decks so that a deck's numbers cannot drift from the model.

**Decision:** A top-level view *Presentation*, after *Model* (`app/src/ui/presentation.ts`; its charts
`drawPresentation` in `app/src/ui/charts.ts`). The page takes the window's width, the panel folded away
while it shows. It computes nothing: it reads the four sets the Model view computed for the settings shown
and redraws as each comes in.
1. *Inputs:* each Baltic zone's demand in TWh — the weather years' base load, weighted, times the
   multiplier, plus the constant load, as the panel's hint gives it — and its installed MW by source as
   the runs had them, wind on land and at sea apart, Estonia's nuclear as the four scenarios' 0/300/600/900;
   the neighbours' level factor and the average price it makes; the scenario's gas and CO₂ prices.
2. *Estonia's figures,* weighted over the weather years as the Model view's table is, each with its
   difference to *0 SMR* under it: the average price; the net import balance, TWh; the net import in
   euros, each hour's import less its export at Estonia's price, M€; CO₂ of Estonia alone, Mt; the hours its
   natural gas ran.
3. *Charts of Estonia,* the scenarios on one blue ramp, the more of the plant the stronger (an ordinal
   ramp checked against both themes' surfaces): the monthly average price, each month the years'
   averages weighted; the energy mix by source with the net import on top; the price duration curve of
   the years' hours weighted together.

A validation run has no scenarios, and the page says so.

**Consequences:** No figure moves. The page is not a deck: its figures are the run's own, drawn by the
page as every other view's, so D13 stands and the deck of 10 November is still generated outside the
application. Two figures differ from the Model view's on purpose: CO₂ is Estonia's alone (the table
sums the three zones), and the duration curve is one per scenario with the years weighted together (the
Model view draws each year's).

## D-153 · 2026-10-21 · The Presentation page as the owner reviewed it

**Status:** Accepted · 2026-10-21 · the owner: "remove the level column; put the changes in red and green in columns of their own; draw
the monthly average as the validation's chart; going from validation to the presentation hangs".
Supersedes D-152's "a validation run has no scenarios, and the page says so"; R-APP-15 says so in
revision 2.26.

**Context:** Opened from a validation run, the page did not hang: it showed one line under its title, that
a validation run has no scenarios, while the panel with the switch back to them was folded away. It took
under 0.1 s in Chrome and in WebKit.

**Decision:**
1. The neighbours' table gives each border zone's average price as its level makes it, without the factor.
2. Estonia's figures stand with their difference to *0 SMR* in a column of their own, green where the figure
   falls and red where it rises; the units once, in the row's name.
3. The monthly average price is drawn as the validation's chart is: a line per scenario with its points,
   each month's highest and lowest figure written beside them. Of more than two lines only those two are
   labelled, so that no two labels meet; the others are in the tooltip. The validation's two lines are
   labelled as before.
4. Opened from a validation run, the page returns to the scenario view's opening state, as the panel's
   switch does, and says "computing…" until the scenarios are in.

**Consequences:** No figure moves.

## D-154 · 2026-10-22 · Units beside every figure of the Presentation page

**Status:** Accepted · 2026-10-22 · the owner: "put the units
beside the figures in the tables". Supersedes D-153's "the units once, in the row's name".

**Decision:** Every figure of the page's three tables carries its unit after it — the inputs' TWh and MW, the
neighbours' €/MWh, Estonia's figures and their differences to *0 SMR* — and the rows' names no longer do. To
keep the three tables side by side at 1 440 px, the inputs and the neighbours are as wide as their tables and
Estonia's figures take the rest, in a slightly smaller type; a window narrower than 1 360 px puts Estonia's
figures under the other two.

**Consequences:** No figure moves.

## D-155 · 2026-10-22 · The Presentation page: the neighbours among the inputs, the scenarios apart, the mix as doughnuts

**Status:** Accepted · 2026-10-22 · the owner: "put the neighbours' price level and the CO₂ and gas prices among the inputs; part the scenarios
in Estonia's figures more clearly, they run together; make the energy sources chart doughnuts". Supersedes
D-152's stacked bars of the energy mix.

**Decision:**
1. The neighbours' prices and the gas and CO₂ prices stand in the inputs' card, beside the zones' table.
2. A rule before each scenario in Estonia's figures, so that a difference is not read as the next scenario's.
3. The energy mix is drawn as the Model view's doughnuts (D-097): one per scenario in a row, each scenario's
   mix weighted over its weather years, its generation and CO₂ in the hole, the net import a transparent
   slice, one legend under the four. The Model view's doughnuts and these are drawn by one function.

**Consequences:** No figure moves.

## D-156 · 2026-10-22 · The Presentation page: bids and growth from 2025 among the inputs, and an impact table

**Status:** Accepted · 2026-10-22 · the owner: "move Naabrite hinnatase and CO₂- ja gaasihind under the generation sisend; add bids for the generation sources, and also the percentage growth against the 2025 actual (increase or decrease in installed capacity); in Naabrite hinnatase it is worth specifying that this is aasta keskmine and the scenario it is taken from; in the table Eesti stsenaariumide kaupa put percentages for the changes in EE CO₂; below add an impact table: how much an average household will save on electricity per year, how much money will stay in Estonia's economy over 60 years". Asked how to count, the owner chose the saving with VAT ("With VAT 24 %") and the contract's cost on a row of
its own ("Yes, as a separate line"), and asked for discounting to be explained before choosing it; until then the
sum over 60 years is undiscounted. Specification revision 2.27 (R-APP-15).

**Decision:**
1. The inputs' table gives, for each source in each Baltic zone, its capacity, its change from the observed
   fleet of 2025 — A68's, its batteries Elering's count where A68 has none, as the panel's marks measure it
   (D-057) — and its bid: the hours' average of each class's lowest bid as the run had it, a line of several
   classes bidding apart as their range, and gas carrying its zone's markup from its lowest step to its cost
   plus the highest markup (R-SUP-6; at the opening state Latvia's and Lithuania's 175–402 €/MWh, Estonia's,
   which carries none, 189; the owner asked for the range the same day: "yes, make the range 175–402"). The neighbours' prices and the fuel prices stand under the table, the
   neighbours' headed as their annual average and followed by the profile they are of.
2. Estonia's CO₂ differs from *0 SMR* in per cent.
3. An impact table, for each of the plant's scenarios against *0 SMR*, each figure weighted over the weather
   years:
   - an average household's saving a year: the fall of Estonia's average price × 3 030 kWh, the average
     consumption per household of 2024 that ACER reports from the regulators' data (CHEST, Figure 16), × (1 +
     24 %), the standard VAT rate from 1 July 2025 (Maksu- ja Tolliamet);
   - the money kept in Estonia over the plant's life: the net import bill avoided — the fall of the net
     import in euros, each hour at Estonia's price — × 60 years, the BWRX-300's design life (GE Vernova
     Hitachi, General Description, p. 123, Table 21-2), the figures of 2035 held and undiscounted;
   - what the state pays a year under the contract (a) at the strike, as the contract card computes it.
   The three values are parameters with their sources (`household.ee.average_consumption_kwh`,
   `tax.ee.vat_standard_rate`, `smr.bwrx300.design_life_years`); the two new documents are registered and
   cached, and each value was found again on its page by script.

**Consequences:** No figure of the model moves; the export's presets and sources gain the three parameters,
and no year file changes. At the opening state the household's saving is 34 / 68 / 107 € a year with one,
two and three units, the bill avoided over 60 years 12.5 / 23.3 / 32.4 bn €, and the state pays 33 / 114 /
250 M€ a year at 90 €/MWh. The saving is on the average of all hours, not on a household's own hours, and
reaches a household whose contract follows the exchange price. Held for 60 years, the figures of 2035 are an
assumption of the table, not a result of the model.

## D-157 · 2026-10-22 · The Presentation page: the capital cost of the energy mix to 2035

**Status:** Accepted · 2026-10-22 · the owner: "add energymix capex for Estonia, Latvia, Lithuania. The condition: we take 2025 as the basis, as capacity already built, and then we calculate the cost of the capacity that needs to be built by 2035, which we are calculating"; asked for the plant's cost, "the cost of two reactors is 4,6 billion"; asked for the year of
the prices, the estimate for 2030 ("Estimate for 2030"). Specification revision 2.28 (R-APP-15).

**Decision:** A table on the Presentation page gives, for each Baltic zone and source, the capacity the scenario
holds above the observed fleet of 2025 — the line's growth as the inputs measure it, never below zero, batteries
and pumped hydro apart — and the cost of building it, in 2025 EUR:
1. *Generation:* the Danish Energy Agency's technology data for electricity and district heating (the catalogue
   the model already reads), 'Nominal investment (*total)', central estimate for 2030 — onshore wind (sheet 20),
   offshore wind (21, fixed AC), utility-scale solar (22), OCGT (52), combined cycle (05, for CCGT and gas CHP),
   wood-chip CHP (09a, for biomass); a line of several classes at its classes' cost weighted by their megawatts.
2. *Batteries:* the Danish Energy Agency's energy storage data sheet, sheet '180 Lithium Ion Battery', central
   estimate for 2030: the power component per MW, and the energy component and other project costs per MWh at
   the zone's hours. The data sheet is registered and cached (`catalogue.dea_storage_2025`).
3. *Prices:* the catalogues' 2020 EUR — the solar sheet's note N and its long table, against the Intro's "2025
   EURO for sheets 22x" — brought to 2025 EUR by the euro area's HICP, 128.75 / 105.06 (Eurostat
   `prc_hicp_aind`, registered and cached).
4. *The plant:* the owner's 4 600 M€ for two BWRX-300 units, 2 300 M€ a unit, an owner's assumption
   (`smr.bwrx300.capex_two_units_meur`) labelled so on the page and in the source register.
5. A line without a catalogue figure — pumped hydro, run-of-river hydro, oil shale, waste — is shown unpriced and
   named under the table, and kept out of the totals.

**Consequences:** No figure of the model moves. At the opening state the three zones build for 13 008 M€ without
the plant (EE 2 832, LV 1 578, LT 8 598), 15 308 / 17 608 / 19 908 M€ with one, two and three units; unpriced are
Kruonis's 38 MW and 4 MW of Latvian hydro. The growth is net of the fleet of 2025: what retires and is replaced
before 2035 is not counted, nor are the grid, the financing during construction or the rooftop's dearer solar.
The catalogues' figures are Danish and European; the plant's is the owner's, not a published estimate.

## D-158 · 2026-10-22 · The capital cost over the plant's 60 years, with each source's rebuilds

**Status:** Accepted · 2026-10-22 · the owner: "count the capital cost over 60 years, with the wind turbines, the solar panels
and the batteries to be replaced". Specification revision 2.28 (R-APP-15), beside D-157.

**Decision:** The table of D-157 gives, beside the cost to 2035, the cost of keeping each new source for the
plant's design life, 60 years (`smr.bwrx300.design_life_years`, GE Vernova): built in 2030 at the catalogue's
estimate for 2030, rebuilt as each lifetime ends at its estimate for 2050 — every rebuild comes in 2050 or later,
the catalogues' last year — every build lasting the technical lifetime of one built in 2030, the last rebuild's
share the years it serves within the 60, undiscounted. The lifetimes are the Danish Energy Agency's: onshore and
offshore wind 30 years, utility-scale solar 40, gas turbines and combined cycle 25, wood-chip CHP 25, the
lithium-ion battery 20 — the catalogue gives 30 for one built in 2050, and the owner held every build at 20
("set 20 years"); the plant is built once. The lifetimes of 2030 and the estimates for 2050 are rows of
`tech_parameters.csv`, re-extracted by code.

**Consequences:** No figure of the model moves. At the opening state the three zones' new sources cost 25 656 M€
over 60 years against 13 008 M€ built (onshore wind ×1.95, solar ×1.41, batteries ×2.77, gas ×2.30); with the
plant 27 956 / 30 256 / 32 556 M€. Estonia's: 6 276 M€ without the plant, 8 576 / 10 876 / 13 176 M€ with one, two
and three units. The rebuilds' later and cheaper estimates and the last rebuild's share keep the sum below a
count of whole rebuilds; what a discount rate would make of a sum spent decades apart is the owner's open
question of D-156.

## D-159 · 2026-10-22 · The impact in the columns of Estonia's figures

**Status:** Accepted · 2026-10-22 · the owner: "set the
impact table so that the scenarios' borders lie exactly under Estonia's table, and add the changes in green as
there". Supersedes the layout of D-156's impact table; its figures stand.

**Decision:** The impact's rows join Estonia's table under a heading of their own, in its columns: each scenario's
level and, beside the plant's, its change against *0 SMR*, coloured as Estonia's figures are — green where it falls,
red where it rises:
1. an average household's electricity a year at Estonia's average price, with VAT: 318 € at 0 SMR, its change
   −34 / −68 / −107 € the saving of D-156;
2. Estonia's net import bill over the plant's life: 33.3 bn € at 0 SMR, its change −12.5 / −23.3 / −32.4 bn € the
   money kept in Estonia of D-156;
3. what the state pays a year under the contract: none at 0 SMR, +33 / +114 / +250 M€, red as every rise.

**Consequences:** No figure moves. The household's figure is its electricity at the exchange price alone, without
the network, the seller or the excise; its change is what the price does.

## D-160 · 2026-10-22 · The capital cost by source on the Model view, its totals on the presentation

**Status:** Accepted · 2026-10-22 · the owner: "move the capital cost table to the Model tab,
and on the presentation give the totals by country". Specification revision 2.28 (R-APP-15).

**Decision:** The table of D-157 and D-158 by source — each zone's new megawatts, their cost to 2035 and over the
plant's 60 years, the lifetimes, the plant's units, the totals — stands on the Model view under the scenarios'
table, scrolled within its card where the column is narrow. The presentation gives each zone's totals and the
Baltic states', to 2035 and over 60 years, for each of the four scenarios, the plant in Estonia's; the notes on the
sources and the unpriced lines stay under both. One function draws both (`capexHtml` in
`app/src/ui/presentation.ts`), so the two cannot disagree.

**Consequences:** No figure moves.

## D-161 · 2026-10-22 · The Presentation page read from a projector

**Status:** Accepted · 2026-10-22 · the owner: "using
the design skills, put the Esitlus tab in order", and their answers the same day: the page is read from a projector
at the talk of 10 November; its character a strict research report; it must look neither like an advertisement for
nuclear power nor like a bare spreadsheet.

**Decision:**
- The design context is written down in `docs/PRODUCT.md` — its readers, purpose, personality, anti-references,
  principles and accessibility — for the design tools to read.
- A sentence of findings under the title: against *0 SMR*, with one, two and three units, Estonia's average price,
  net import, CO₂ in per cent, and what the state pays a year under the contract at the strike. The figures are the
  table's, in its order, with no adjective.
- Type for the back of the room: the page at 15 px, the title at 24, the findings at 17, Estonia's figures at 20; the
  charts' ticks, legends and point labels at 12 px, the line charts' legends drawn as lines, the charts 300 px high,
  the doughnuts 256.
- Each bid muted beside its capacity, secondary to it.
- The notes on the impact and on the capital cost gathered under *Assumptions and sources*, beside the capital
  cost's totals, instead of under each table.
- The duration curve on a linear axis of hours, ticked every thousand hours (two thousand on a narrow plot) and at
  8 760, never slanted.
- Where the row stacks (up to 1 640 px wide), the neighbours' and the fuel prices beside the zones' table, so the
  inputs card is not half empty.

**Consequences:** No figure moves, and no requirement changes: the findings repeat the table's figures. The
presentation test checks the findings sentence and the notes block.

## D-162 · 2026-10-22 · The Presentation page as the owner reviewed it: no findings line, the balance in euros, Estonia's capital cost

**Status:** Accepted · 2026-10-22 · the owner, on the page of D-161: "remove the caption 'Võrreldes stsenaariumiga 0 SMR …' and '12 aastat 13,5 s-ga; näidatud stsenaarium 2 SMR 10,9 s-ga' from the esitlus page", with the line under it naming
the neighbours' profile and the weather years ("remove the caption … and the timing line from the Esitlus page");
"in Estonia's figures, replace *EE
net import in euros* with *balance in euros*"; "in the capital cost of the energy mix, keep only Estonia". Specification revision 2.29 (R-APP-15).

**Decision:**
- The page opens on its title: D-161's sentence of findings goes, and with it the line naming the neighbours'
  profile and the weather years. The profile stays under the neighbours' prices; the weather years' weights go
  behind the "?" of Estonia's figures. The run's status line, its timing, is not shown on the page; an error is.
- The row of Estonia's net import in euros is named *balance in euros* (*saldo eurodes*): the same figure, each
  hour's import less its export at Estonia's price.
- The capital cost on the presentation gives Estonia's totals alone, to 2035 and over 60 years, the plant in
  them; its notes name Estonia's unpriced lines only. The Model view keeps the three zones' table by source
  (D-160).

**Consequences:** No figure moves. The presentation test checks that neither line is there, the row's name, and
that the capital cost names no other zone.

## D-163 · 2026-10-22 · Estonia's figures say whose balance, which life and which strike

**Status:** Accepted · 2026-10-22 · the owner, on Estonia's figures of the Presentation page: "*balance in euros* should say whose balance and of what"; on the net
import bill "say how many years"; on the state's payment "say which strike".

**Decision:** The rows name what they are: *EE net import balance in euros* (*EE netoimpordi saldo eurodes*), each
hour's import less its export at Estonia's price, as the row above it in TWh; *Estonia's net import bill over the
plant's 60-year life* (the design life, `smr.bwrx300.design_life_years`); *the state pays under the contract, a
year; strike 90 €/MWh* (the strike of the settings shown, with the negative-price clause named when it is on). The
specification is not revised: its revision 2.29 names the same row the balance in euros.

**Consequences:** No figure moves. The presentation test checks the three names.

## D-164 · 2026-10-22 · One bid for the gas of Estonia, Latvia and Lithuania

**Status:** Accepted · 2026-10-22 · the owner: "the aim is to simplify the model; study what one gas bid for the three
countries, without the ladder, does to it"; on the research, "and if the gas of the three
countries had the same bid, without markups, so that we see the gas bid in the panel and it applies to the three
countries?"; and on its answer, "do the one bid". Research log:
`docs/research/2026-10-22_single_gas_bid.md`, §10 for the form adopted. Specification revision 2.30 (R-SUP-6,
R-SUP-3).

**Context:** R-SUP-6's utilisation markup split what each Latvian and Lithuanian gas offer had left after the floors
and the headroom into four tranches by share of its weekly maximum, bidding its cost plus 32.5 / 80 / 220 / 260
€/MWh (D-115); Estonia's gas bid its cost. The two fit years disagree threefold on its top bins (2023 alone 110,
2024 alone 330–410), and the presentation showed the gas bids as 189 in Estonia and 175–402 in Latvia and
Lithuania. At a plant's bare cost the replays miss the averages by 7–10 €/MWh (the log's §3), so one bid needs one
fitted adder; one adder on each plant's own cost would put Estonia's open-cycle peakers 47 €/MWh above Latvia's and
Lithuania's combined-cycle plants in 2035 (§4), where one price for all keeps them level (§10).

**Decision:**
1. Every gas offer of the three zones — what the floors and the headroom leave of it — bids one price in every
   hour: a combined-cycle plant's cost as the run prices it (fuel over its efficiency, CO₂, running costs; class
   `gas_ccgt`) plus one adder, whatever the plant's own efficiency (`applyGasBid`, `build.ts`). The tranches, their
   edges and the zone schedules go; the register holds `gas_bid` in place of `markup`.
2. The adder is fitted as the schedule was: each fit year's own on a grid of 10 €/MWh and then 2.5 around its best,
   the register their average, at each step of Kruonis's grid, the step whose register fits the two years best kept
   (`app/scripts/fit_gas_bid.ts`, `validate/fit.py`). 2023 alone gives 50, 2024 alone 52.5: **51.25 €/MWh**, at
   Kruonis's step 60 as before. The fit years' sum of MAE is 61.30 (71.98 at cost and step 0; the ladder's 59.13 on
   today's engine), 61.33 left out. Δ refitted on it: 71.5 €/MWh, unchanged (31 297 MWh against 31 015 recorded).
3. The panel shows the gas plants' bid once, under the gas and CO₂ prices — 193 €/MWh at the opening state, 142.1
   + 51.25 — in a box that moves it for every gas plant of the three zones, kept as an offset that follows the two
   prices (D-090); each zone's gas row shows it as a plain tag. A scenario's text carries it as `bid.gas`; a text
   written before, with each zone's gas class moved alike, moves the one bid by their offset, and one that moved
   them apart is refused.
4. The presentation's inputs show each zone's gas at the one bid; the Calibration page shows the adder and its fit.

**Consequences:**
- *Validation* (`data/derived/validation/`): MAE 9.2 / 9.0 / 8.6 €/MWh in 2023, 10.5 / 12.1 / 12.0 in 2024, 17.9 /
  17.0 / 16.9 in the blind year 2025 and 13.7 / 11.2 / 10.6 in 2026 (on the ladder 9.2 / 8.9 / 8.4, 10.1 / 11.3 /
  11.2, 18.1 / 16.9 / 16.8 and 13.3 / 10.5 / 9.8). R-VAL-5's breaches 7 / 8 / 11 (8 / 5 / 8): Latvian gas in 2023
  and 2024 now within its band; new the duration curve's RMSE (Latvia and Lithuania in 2024, 10.8 and 10.6; all
  three in 2025, 14.4–15.9) and the hours at 150 €/MWh or more in 2024 (Latvia and Lithuania 3.3 points short).
  One price lifts no hour by the gas in use: Latvia has 105 hours above 250 €/MWh in 2025 against 197 on the
  ladder and the record's 251. EstLink 2's effect 19.2 €/MWh (19.8), R-VAL-6 met. The gate line reads 9–18.
- *2035, the opening state:* Estonia 85.4 / 76.4 / 67.1 / 56.6 €/MWh with no, one, two and three units (84.7 /
  75.6 / 66.5 / 56.3); the plant's effect −9.0 / −18.3 / −28.8 (−9.0 / −18.2 / −28.4); the state pays 31 / 111 /
  248 M€ a year at 90 €/MWh (33 / 114 / 250); an average household saves 34 / 69 / 108 € a year (34 / 68 / 107);
  Estonia's gas runs 373 hours without the plant (543), its CO₂ 0.23 Mt (0.30), its net import 6.10 TWh (5.97), its
  balance 587 M€ (555). TIGHT 123.6 / 109.9 / 99.5 / 89.2 (122.9 / 109.2 / 99.1 / 89.0), TIGHTJ 121.7 / 113.3 /
  106.4 / 98.0 (120.8 / 112.4 / 105.7 / 97.7). No set leaves energy unserved.
- The golden fixture's four engine cases re-baselined, V8 and JavaScriptCore alike; the synthetic week builds no
  gas and keeps its digest. Without the tranches a year solves 6–18 % faster (the log's §5).
- The fault of oil shale's entry the research found (the log's §6, ERRATA E-160) does not show at the fitted adder:
  no replay of 2020–2026 clears at the price cap where the ladder did not.
- The presentation's figures, the deck's and the site's sets move with it; they are computed again at the freeze
  and the next deploy. Nothing is deployed.

## D-165 · 2026-10-22 · A day at the price cap with an oil-shale class kept off: the class comes on and the week clears again

**Status:** Accepted · 2026-10-22 · the owner, on ERRATA E-160: "sort it out". Specification revision
2.31 (R-SUP-4).

**Context:** Oil shale's entry (D-113, D-114) commits each class for a UTC day on the first clearing's price, which
assumes the class free to run. A class off the day before whose margin at that price does not pay its warm start
stays off, and the second clearing can then run short. Under one gas adder of 50 €/MWh the circulating fluidised bed
(288 MW, bid 66 €/MWh) stayed off on 10 June 2020 although the first clearing priced every hour of the day at or
above its bid, and 16 hours cleared at 4 000 €/MWh with 780 MWh shed in the three zones (ERRATA E-160;
`docs/research/2026-10-22_single_gas_bid.md` §6). A unit with megawatts to sell does not stay cold through a day
priced at the cap; the rule decided on a price its own absence had not yet moved. The research proposed the mend.

**Decision:**
1. After the second clearing of a week, a day on which the entry's zone clears at the price cap while the
   commitment keeps off a class — nothing offered all day — that had megawatts available that day comes on: every
   such class runs its minimum stable load all day and offers the rest at its bid, and the week clears again on
   that commitment, its water sums as before it (`capDays`, `clearWeek` in `lp.ts`; `commitEntry`'s forced days in
   `entry.ts`). The check repeats on the week cleared again until no such day is left; each pass forces a day it
   had not, so a week clears again at most seven times.
2. A forced day is a start the rule did not pay for: the next day decides as the rule does, on the first
   clearing's price and on whether the rule, not the force, had the class on.
3. The workers' parts mend the weeks they clear in the same way and send their forced days with them; the year put
   back together commits on all of them, bit for bit what `runLP` gives (`split.ts`, `Part.forced`).

**Consequences:**
- No published figure moves. The validation's files are byte for byte as before (`make validate`: MAE, breaches
  and EstLink 2's 19.25 €/MWh); the golden fixture's five cases are unchanged, V8 and JavaScriptCore alike. None of
  the 216 years of the site's sets (the opening state's four scenarios and their sensitivities, the neighbours'
  two tight profiles with theirs) and none of the 240 samples of methodology §9.1 (four long-failure settings, 20
  per climate year, seed 1) has a day to mend: of them, only TIGHT's sensitivities (a) and (b) without the plant
  (1995: 9 hours, 2009: 1) and one default sample of 2009 (1 hour) put Estonia at the cap, each with every
  available class on.
- The case of E-160: the two weeks of 2020 to 16 June at an adder of 50 clear no hour at the cap; whole and in two
  or three parts alike (`test/entry.test.ts`).
- The test weeks of the gap (R-ENG-8) compare the programme the first clearing committed, written by
  `gap_weeks.ts`; the mend changes which commitment a week clears, not how its programme is written.
- ERRATA E-160 is fixed. Nothing is deployed.

## D-166 · 2026-10-23 · The presentation's sums over the plant's life at their present value, at 3 %

**Status:** Accepted · 2026-10-22 · the owner, asked before the night of 2026-10-22/23 for the discount rate of the
present-value row left open by D-156: «3 %». Specification revision 2.32 (R-APP-15).

**Context:** D-156 gave the net import bill avoided over the plant's 60-year design life undiscounted, and asked for
discounting to be explained before choosing it; D-158's capital cost over the same life is undiscounted too, so a
rebuild in 2060 counts as much as a build in 2030. A sum spent or saved decades apart reads differently at its
present value, and the audience of 10 November will ask for it.

**Decision:**
1. The rate: 3 % a year, real (`finance.discount_rate_real`, an owner's choice cited to R-APP-15). The scenario's
   prices of 2035 hold no inflation and the capital cost is in 2025 euros, so the rate is applied to real money.
2. The year of the present values: 2035, the plant's first. The net import bill of 2035 is held for each of the
   60 years and paid at each year's end: its present value is the yearly bill times the annuity factor
   (1 − 1.03⁻⁶⁰) / 0.03 = 27.68 (`annuity`, `app/src/ui/presentation.ts`).
3. The capital cost: the builds to 2035 at their cost; each rebuild, in the year the builds' lifetimes after 2030
   place it, discounted from that year to 2035, the last rebuild's share of it included (`lifeCost` with a rate);
   the plant's units at the owner's 4 600 M€ for two as their cost in 2035, without interest during construction.
4. The presentation shows both: a row "the same, its present value in 2035 at 3 % a year" under the bill over the
   plant's life, and a column "present value, 3 %" beside Estonia's capital cost over the life; a note at the
   page's foot states the conventions. The Model view's table by source keeps the undiscounted sums.

**Consequences:** No figure of the model moves; the precomputed sets are unchanged (the rows are the page's
arithmetic on them). At the opening state Estonia's net import bill over the 60 years is 35.2 / 21.9 / 10.6 /
1.1 bn € with no, one, two and three units, worth 16.2 / 10.1 / 4.9 / 0.5 bn € in 2035: the money kept in Estonia,
13.3 / 24.6 / 34.1 bn € undiscounted, is worth 6.1 / 11.3 / 15.7 bn € in 2035.

## D-167 · 2026-10-23 · The dear hours under one gas bid: nothing to adopt — proposed

**Status:** Proposed — awaiting the owner · 2026-10-23 · the owner, asked before the night whether to do work that
moves figures: "Yes: expensive hours". Research log `docs/research/2026-10-23_dear_hours_one_bid.md` and scripts
`spikes/dear-hours-one-bid/` on branch `research/dear-hours-one-bid` (100cfce), not merged.

**Context:** one gas bid (D-164) lost the dear hours: R-VAL-5's breaches 7 / 8 / 11 against 8 / 5 / 8, the duration
curve and 2024's share of hours at or above 150 €/MWh out of their bands, Latvia 105 hours above 250 €/MWh in 2025
against the record's 251.

**Proposal:** keep one gas bid as it is. The rule was written and committed before any candidate was scored (the
2026-10-11 protocol: the fit years within the refit's noise, a breach family removed and none added, the blind
year 2025 a veto of 0.2 €/MWh, at most two new numbers). No candidate passes it:
- the TSOs' reserve of 2025 held out of the gas (R1) is not in the record — gas runs more, not less, in the hours
  more reserve is bought — and is dropped without prices;
- the duration curve in the fit's objective (R0) lifts the adder to 66–74 €/MWh and the fit years' MAE by 1.1–1.3;
- two numbers on each gas offer's top quarter (R2, 45 / 300) bring the dear hours back — breaches 8 / 5 / 10, the
  duration curve within in every year, Latvia 202 hours above 250 in 2025, the fit years 1.06 €/MWh better — and
  lose the blind year by 0.66–0.89 €/MWh of MAE, four times the veto.
Weighing the distribution above the hour-by-hour error would be a change of the rule, the owner's to make; with R2
the plant's effect moves by 0.3 €/MWh at most (Estonia 85.3 / 76.4 / 66.7 / 56.4).

**On acceptance:** nothing changes. **On a change of the rule in R2's favour:** the log's last section lists the work.

## D-168 · 2026-10-23 · Among the gas plants' equal bids, the cheaper plant first — proposed

**Status:** Proposed — awaiting the owner · 2026-10-23 · from the night's review (ERRATA E-161).

**Context:** since D-164 every gas offer of the three zones bids one price, and where the links do not bind the
order in which the zones' gas runs is set by the solver's tie-break, a hash of each offer's name (E-161). The names'
order happens to be the cost order; the figures hold by that coincidence.

**Proposal:** each gas offer's bid, hour by hour, plus 0.001 × its class's cost above a combined-cycle plant's
(`applyGasBid`): among equal bids the plant cheaper to run runs first, whatever its name, and no price moves by more
than that term — 0.05 €/MWh for Estonia's open-cycle gas at the opening state. The panel's bid and the text stay
one number.

**Consequences, measured (`spikes/gas-order/order.ts`):** Estonia's gas 371 / 293 / 217 / 109 hours with no, one, two
and three units (373 / 295 / 217 / 108), its CO₂, net import and balance in euros unchanged at the precision shown,
every price unchanged to 0.01 €/MWh, the replays of 2023–2026 unchanged. The golden fixture's scenario cases would be
re-baselined. **On decline:** nothing changes; E-161 stays open, its figures the cost order's by the names.

## D-169 · 2026-10-23 · D-168 signed: among the gas plants' equal bids, the cheaper plant first

**Status:** Accepted · 2026-10-23 · at the owner's delegation, in answer to the night's report
(`docs/research/2026-10-23_night_report.md` §1): "E-170: make it correct, as it is being built; the other decisions at your
discretion".

**Decision:**
1. D-168 is accepted as proposed. Each gas offer's bid, hour by hour, is D-164's one bid plus 0.001 × its class's
   cost above a combined-cycle plant's (`GAS_ORDER`, `applyGasBid`). Among equal bids the plant cheaper to run runs
   first, whatever its name.
2. Specification revision 2.33 is approved (R-SUP-6), and ERRATA E-161 is fixed.
3. The change of branch `proposal/gas-order` (d61a3f9) goes into main. The golden fixture's three scenario cases
   take its digests.

**Why:** the figures shown held by a coincidence of the offers' names. The term makes them hold by cost. It moves
Estonia's gas by 2 hours at most and no price by more than 0.05 €/MWh.

**Consequences:**
- Estonia's gas runs 371 / 293 / 217 / 109 hours with no, one, two and three units (373 / 295 / 217 / 108).
- Every other figure of the opening state is unchanged at the precision shown.
- The replays and the validation files are unchanged.
- The documents restate the gas hours at their next refresh.

## D-170 · 2026-10-23 · The Lithuania–Poland lines as they are built and run: AC

**Status:** Accepted · 2026-10-23 · the owner, on ERRATA E-170: "make it correct, as it is being built". LitPol (ERRATA E-172) goes with it under the same day's
delegation, "the other decisions at your discretion": the same fault on the same border.

**Context:**
- Harmony Link is to be a double-circuit 220 kV AC line overland, Ełk Bis to a new substation near Gižai, energised
  by the end of 2030 (PSE and Litgrid, 15 July 2024). The subsea HVDC tenders were cancelled in April 2023.
- LitPol has run as an AC line since 9 February 2025, when the Baltic states joined the Continental European
  synchronous area through it; its back-to-back converter has left the path (Litgrid).
- ERAA 2025 applies a forced-outage rate of 0 % to HVAC interconnectors and 6 % to HVDC, where the TSOs give none
  (Annex 2, §2.2, p. 17).
- The model gave Harmony Link an HVDC cable's 94 % without history, and LitPol its converter's statistics of
  2019–2024: 90.9 % available, 4.4 % planned maintenance. The adequacy tab drew outages for both.

**Decision:**
1. LitPol and Harmony Link are AC lines (`export/tables.py` `LINES`). Both carry ERAA's HVAC rate of 0 %: each at its
   MW in every hour of a scenario year — Harmony Link 700, ERAA's LT-PL NTC from 2030; LitPol 500, Litgrid's market
   capacity of 2027–2030 before Harmony Link — held to Litgrid's plan (1 200 MW from 2031) unless the user lifts it.
2. The adequacy tab samples neither. LitPol's converter statistics leave the sampler's cables.
3. Observed years are unchanged: they take A31's offered capacity, whatever the line.
4. Specification revision 2.34 (R-LINK-1, R-LINK-3, R-LINK-7). The golden fixture's three scenario cases are
   re-baselined.

**Consequences** (the opening state, weighted over the weather years; before → after, with D-169's gas order):

| | Before | After |
|---|---|---|
| Lithuania–Poland in 2035, MW on average | 1 112 | 1 200 |
| Estonia, 0 / 1 / 2 / 3 SMR, €/MWh | 85.39 / 76.43 / 67.08 / 56.57 | 84.61 / 75.95 / 66.84 / 56.50 |
| Latvia | 81.45 / 78.10 / 75.91 / 74.59 | 80.70 / 77.70 / 75.68 / 74.43 |
| The plant's effect in Estonia | −9.0 / −18.3 / −28.8 | −8.7 / −17.8 / −28.1 |
| The contract at 90 €/MWh, M€ a year | 30.8 / 110.6 / 247.5 | 32.1 / 111.8 / 248.1 |
| Estonia's gas, hours a year | 373 / 295 / 217 / 108 | 355 / 286 / 211 / 103 |

The replays and the validation files are unchanged. Every set the site holds is computed again at the next deploy.
The documents, the presentation's figures and the talk's pack are restated with the day's other decisions.

## D-171 · 2026-10-23 · The gas price on one calorific basis: the record's TTF per net MWh

**Status:** Accepted · 2026-10-23 · at the owner's delegation the same day: "the other decisions at your discretion", on ERRATA E-167 as the night's report put it
(`docs/research/2026-10-23_night_report.md` §1, item 2). It was measured on branch `research/gas-calorific-basis` (9911276).

**Context:**
- The replays priced gas at the record's TTF — the World Bank Pink Sheet's "Natural gas, Europe", per MMBtu, which
  the export converts to €/MWh as it is: a price per gross MWh, as TTF trades.
- The plants' efficiencies and emission factors are ERAA 2025's, stated "in NCV terms" (Common Data, Standard
  thermal characteristics). ERAA's own fuel prices are "€2024/net GJ" (Annex 1, Table 8, p. 23).
- A replay's fuel cost of a gas plant was therefore about 10 % short. D-164's adder, fitted on the replays, took the
  shortfall up and carried it into 2035, where the scenario's gas, ERAA's, is already per net MWh.

**Decision:**
1. A replay divides the record's gas price by 0.9, gas's net calorific value per gross: "for most forms of natural and
   manufactured gas, the NCV is about 10 percent less" (IPCC 2006 Guidelines, Volume 2, Chapter 1, §1.4.1.2,
   p. 1.16). The factor is `fuel.gas.ncv_per_gcv`, a documentary parameter with its verification record, and the
   document is cached (`ipcc_2006_v2_ch1`). The record itself is kept as the Pink Sheet quotes it.
2. Sensitivity (d)'s shock, the record's dearest month of 2026, goes on the same basis: September's 75.3 €/MWh per
   gross MWh is a floor of 83.7 per net MWh. The card says so.
3. A scenario's price, ERAA's, is used as it is.
4. `make fit` refits what is fitted against the engine's bids:
   - the gas adder: both fit years choose 42.5 €/MWh (D-164: 50 and 52.5, register 51.25); Kruonis's step stays
     60 and the batteries' Δ 71.5;
   - the gas CHP floors of R-SUP-5, fitted on the hours priced below the technology's cheapest bid: Latvia a 46.4 →
     50.5 MW, b 19.5 → 21.1 MW/K; Lithuania a 45.0 → 47.1 MW, b 0.41 → 0.25 MW/K, T_ref 12 → 15 °C.
5. Specification revision 2.35 (R-SUP-3, R-APP-11, R-SUP-6). The validation files, the golden fixture's replay and
   scenario cases and the export are rebuilt.

**Consequences:**
- The replays hold: the fit years' sum of MAE is 61.43 against 61.30. R-VAL-5's breaches stay 7 / 8 / 11. The MAEs
  move by 0.1 €/MWh at most: 2023 9.2 / 9.1 / 8.6, 2024 10.5 / 12.1 / 12.0, 2025 17.8 / 16.9 / 16.8, 2026 13.7 /
  11.2 / 10.6. EstLink 2's effect is 19.1 €/MWh (19.2).
- 2035 moves, the gas bid lower by about 9 €/MWh. The opening state, weighted over the weather years, after the day's
  D-169 and D-170 too:

| | Deployed (D-164) | After D-169, D-170 | After D-171 |
|---|---|---|---|
| Estonia, 0 / 1 / 2 / 3 SMR, €/MWh | 85.39 / 76.43 / 67.08 / 56.57 | 84.61 / 75.95 / 66.84 / 56.50 | 83.63 / 75.11 / 66.25 / 56.16 |
| Latvia | 81.45 / 78.10 / 75.91 / 74.59 | 80.70 / 77.70 / 75.68 / 74.43 | 79.85 / 77.02 / 75.16 / 74.06 |
| The plant's effect in Estonia | −9.0 / −18.3 / −28.8 | −8.7 / −17.8 / −28.1 | −8.5 / −17.4 / −27.5 |
| The contract at 90 €/MWh, M€ a year | 30.8 / 110.6 / 247.5 | 32.1 / 111.8 / 248.1 | 34.3 / 115.0 / 250.8 |
| Estonia's gas, hours a year | 373 / 295 / 217 / 108 | 355 / 286 / 211 / 103 | 424 / 342 / 257 / 128 |
| (d), the gas shock: Estonia, 0 / 2 SMR | 104.6 / 79.8 | — | 107.1 / 81.8 |
| (e), CO₂ at 2026's price: Estonia, 0 / 2 SMR | 64.9 / 50.9 | — | 63.5 / 50.4 |

Every set the site holds is computed again at the next deploy. The documents, the presentation's figures and the
talk's pack are restated with the day's decisions.

## D-172 · 2026-10-23 · The base of 2025 holds the plant that stood: Kiisa, and the batteries A68 lists first in 2026

**Status:** Accepted · 2026-10-23 · at the owner's delegation the same day: "the other decisions at your discretion", on ERRATA E-165.

**Context:** the panel's growth marks (D-057) and the Presentation page's growth and capital cost measure the
scenario's fleet from ENTSO-E's A68 of 2025 and 2026. A68 lists the market's plant:
- Estonia's emergency reserve at Kiisa, 250 MW of gas engines, stands outside it in both years. Estonia's gas read
  33.5 MW (13.5 of gas and 20 of "other", which the class map counts as gas), ×41 against the scenario's 1 364,
  and 250 MW of standing plant was priced as built.
- A68 of 2025 lists no battery in Latvia or Lithuania. Their batteries were priced as new in full on the Model view.

**Decision:**
1. The reference fleets add Kiisa's 250 MW to Estonia's gas, in 2025 and 2026 alike (`reserve.tso_asset.kiisa.mfrr_up_mw`,
   Elering's figure). The panel's marks and the Presentation page move together.
2. The Presentation page's base of 2025 takes a zone's batteries from A68 of 2025, else Elering's count for 2025 (Estonia),
   else A68 of 2026, the first year it lists them (Latvia 10 MW, Lithuania 426).
3. No figure of the model moves.

**Consequences:** the capital cost of the energy mix to 2035 and over the plant's 60 years, M€
(before → after):

| | Estonia | Latvia | Lithuania | The Baltic states |
|---|---|---|---|---|
| To 2035, 0 SMR | 2 832 → 2 688 | 1 578 → 1 572 | 8 598 → 8 351 | 13 008 → 12 611 |
| Over 60 years, 0 SMR | 6 276 → 5 946 | 2 946 → 2 930 | 16 434 → 15 748 | 25 656 → 24 624 |
| To 2035, 1 / 2 / 3 SMR | 5 132 / 7 432 / 9 732 → 4 988 / 7 288 / 9 588 | | | |

Estonia's gas reads +381 % against 2025 (×41 before), its new gas 1 081 MW (1 331). Latvia's new batteries are
410 MW (420) and Lithuania's 1 324 (1 750).

## D-173 · 2026-10-23 · D-167 signed: one gas bid kept; the validation under it accepted for release

**Status:** Accepted · 2026-10-23 · at the owner's delegation the same day: "the other decisions at your discretion", on the night's report (§1, items 5 and 9).

**Decision:**
1. D-167 is accepted as proposed: the gas plants keep one bid. No candidate for the dear hours passed the rule
   written before scoring, and changing the rule is not taken up. Branch `research/dear-hours-one-bid` stays a record
   and is not merged.
2. The validation as it stands under one bid is accepted for release, as D-123 accepted it under the ladder:
   R-VAL-5's breaches 7 / 8 / 11 (D-123: 8 / 5 / 8), the hourly error of 2023–2025 9–18 €/MWh against 15, the
   blind year 2025 at 16.8–17.8 within the 17–18 D-123 found acceptable, R-VAL-6 met. The gate line and every
   release state it, as R-PUB-4 asks.

**Why:** D-123's acceptance was of the validation as it stood on 2026-10-17. D-164 changed the breaches' count and
families; the release of 2026-10-22 rested on the owner's words for D-164 and on their answer before the night. This
record makes the acceptance explicit.

## D-174 · 2026-10-23 · The declaration of interest names Fermi Energia's plant as its public plan has it: two units

**Status:** Accepted · 2026-10-23 · at the owner's delegation the same day: "the other decisions at your discretion", on the night's report (§1, item 6).

**Context:** the declaration confirmed by D-124 says that Fermi Energia develops "an Estonian nuclear plant of two or
three BWRX-300 units". Its public plan is two units: construction from 2032, the first 300 MW unit from 2036, the
second from 2038 (ERR, 18 June 2026). The state's special plan is for a 600 MW plant (riigiplaneering.ee, 15 May
2026). The model's three-unit scenario is a scenario, not the company's plan.

**Decision:** the declaration reads "an Estonian nuclear plant of two BWRX-300 units (about 300 MW net each, 315 MW
gross)", in Estonian "kahe BWRX-300 plokiga tuumajaama". It changes in the README, the page's footer and its
Estonian, the FAQ in both languages and the deck's declaration slide. Nothing else of it changes.

## D-175 · 2026-10-23 · R-ENG-8's gate meets a week whose prices differ where the optimum is the same (ERRATA E-173)

**Status:** Accepted · 2026-10-23 · the owner's word on the recommendation for E-173: "yes, do (a) and deploy".

**Context:** since D-171, `make gap` met R-ENG-8's gate on 7 of 8 test weeks. On 2023's week 3, 11 hours of the last
day have more than one optimal price: 86.29 €/MWh from the engine, 99.94 from the reference as configured. Both
are optima of the same programme: every window's objective is the same, and so are the storage and the Daugava's
release. The gate compares prices, so it read the week's gap as 0.894 / 0.894 / 0.650 €/MWh and failed it. A rule
that picks one of an hour's optimal prices (option (b)) would change the engine and the reference and move every
figure by hundredths, for 11 hours of one test week; the owner chose (a).

**Decision:**
1. A test week meets the gate as before: the average absolute price difference within 0.1 €/MWh in every zone, the
   storage discharge within ±1 %. Where the prices differ beyond it, the week meets the gate on the same optimum:
   every window's objective — Σ cost × value as each side's solver returned it, the perturbation included — within
   10⁻⁶ of the reference's, the storage within ±1 %. The hours whose prices differ by more than 0.01 €/MWh are
   listed, and so is the gap outside them.
2. For such a week the report also solves those hours' days again with HiGHS's primal simplex, the days before them
   as before, so that each starts from the same state. It counts the hours whose price the reference then gives as
   the engine does. This is a confirmation, not a part of the gate.
3. `app/scripts/gap_weeks.ts` writes each window's objective with the engine's answer, `reference/lp.py` returns its
   own and takes options by the window, and `reference/gap.py` applies the rule. The Calibration page states the
   gate and marks the week. Specification revision 2.36 (`R-ENG-8`).
4. No figure of the model moves: the engine is unchanged.

**Consequences:** `make gap` meets the gate on 8 of 8 weeks. On 2023's week 3 every window's objective agrees to
2.4 × 10⁻¹⁴. In 11 hours the price is not unique, and the primal simplex gives the engine's price in all 11; outside
them the prices agree to 0.000 €/MWh.

## D-176 · 2026-10-24 · The Presentation page shows the Daugava's bid as 0, its water value behind a tip

**Status:** Accepted · 2026-10-24 · the owner, after the research of the same day (`docs/research/2026-10-24_daugava_bid.md`):
"we keep the model as it is; put 0 in the bid with a tip".

**Context:** the Presentation page's inputs showed Latvia's hydro at "83–90 €/MWh". The figure was the Daugava
cascade's water value, the dual of a week's water budget, which the view carries in the cascade's bid. In the
programme the cascade's release costs nothing. A cascade bidding 0 in every hour — a price-taker releasing its water
evenly — was measured and not adopted: the record shows the cascade moving its water to the dear hours, the replays
get worse, and 2025 runs short.

**Decision:**
1. The model is unchanged.
2. The page's bid for the cascade is its cost, 0 €/MWh. A tip beside it, in both languages, says that it has no fuel
   and that water is its limit: each week's inflow goes to the week's dearest hours, so in effect it runs where the
   price is above its water value — the four scenarios' range of it, the weather years weighted (83–90 €/MWh at the
   opening state), and 0 in the weeks of the spring flood.
3. Specification revision 2.37 (`R-APP-15`). No figure of the model moves.

## D-177 · 2026-10-26 · The Presentation page: the capital cost at the top, a block for each neighbours' profile

**Status:** Accepted · 2026-10-26 · the owner: "on the presentation tab move CAPITAL COST OF THE ENERGY MIX TO
2035 to the top. also make several blocks as in the screenshot, differing only in SCENARIO OF THE NEIGHBOURS'
PRICES. Add GA 2035, add NT 2040, add Tight, add TightJ".

**Decision:**
1. **The capital cost of the energy mix to 2035 stands at the top**, under the page's title. The fleet is the same
   under every neighbours' profile, so it stands once.
2. **The page repeats its summary in a block for each neighbours' profile**, each block named "Neighbours' prices: …"
   with its inputs, Estonia's figures and impact, and the three charts. The rest of the state is the same.
   - The state's own profile comes first: the opening's TYNDP 2024 Distributed Energy 2035.
   - Then TYNDP 2024 Global Ambition 2035, TYNDP 2024 National Trends 2040, and the research's two tight cases of
     2035, each on its own (`TIGHT`) and all at once (`TIGHTJ`) (D-121).
   - National Trends 2040 exists for the climate year 2009 alone (D-007); its block says so in its name.
   - Its neighbours' prices are those ENTSO-E's market model published: Finland 119.3, SE4 113.3 and Poland
     205.5 €/MWh on average. The re-pricing to the scenario's gas and CO₂ applies to Distributed Energy and Global
     Ambition alone (D-072).
3. **The assumptions and sources stand once, at the foot.**
4. **The blocks' sets.**
   - `make deploy` computes the four scenarios of Global Ambition 2035 and National Trends 2040 with the rest of the
     opening's sets (`app/scripts/opening.ts`, D-129); the tight profiles' were already there.
   - The sets' cap rises from 30 to 35 MB.
   - A state other than the opening's computes its blocks in the browser while the page is shown, behind the page's
     own runs (priority 2 and after), from this browser's store when it has them.
5. Specification revision 2.38 (`R-APP-15`). No figure of the model moves.

**Consequences:** at the opening state Estonia's average price without the plant reads 83.6 (Distributed Energy),
77.2 (Global Ambition), 148.8 (National Trends 2040, the climate year 2009), 122.2 (`TIGHT`) and 120.3 €/MWh
(`TIGHTJ`). The state pays under the contract with two units 115 and 145 M€ a year in the first two; it receives
163, 47 and 84 M€ in the last three. Computed in the browser on the development build, the five blocks took 32 s;
the deployed site brings them with its sets.

## D-178 · 2026-10-26 · energiamudel.ee behind a password again

**Status:** Accepted · 2026-10-26 · the owner: "close the site
behind a login …" (with the password given in the same message).

**Context:** since D-125 (2026-10-17) v5 has been public at the root of `energiamudel.ee`; the v3 archive at
`v3.energiamudel.ee` keeps v3's own password.

**Decision:**
1. **The whole site asks for HTTP Basic Auth.** `app/public/.htaccess` requires a valid user of the password file
   `.htpasswd-v5`, kept one directory above the document root.
2. **The credentials stay out of the repository.**
   - The password file sits one directory above the document roots, beside v3's `.htpasswd`, which is not touched.
     It is outside the deploy's `rsync --delete` and never served.
   - It holds the password as a bcrypt hash; the password itself is in neither the repository nor its files.
3. **The checks log in.** `validate.deployed` and `app/scripts/compare_sets.ts` read `DEPLOY_AUTH` (user:password)
   from the environment, as the staging's did (D-085). `make deploy` and `make freeze` need it set.
4. Specification revision 2.39 (`R-DEP-3`). No figure moves.

**Consequences:**
- **The redirects keep working, after the password.** `/v5` goes to the root and v3's `/stat/` to the archive.
- **The talk's material still invites the audience to open the site:** the deck's slides 1, 9 and 12 and the demo's
  last step («avage see oma arvutis»). They need the password, or the site opened before the talk; the owner's
  choice.

## D-179 · 2026-10-26 · A way in from the team's tools page without the password

**Status:** Accepted · 2026-10-26 · the owner, on the team's page of tools: "remove the link to version 3, the archive; add the
button 'Open without password →'".

**Context:**
- The team's tools page lets its readers into the sites of `fermi.ee` without their passwords. It sets
  a cookie, `fermi_sso`, on `.fermi.ee`, and each site's `.htaccess` lets in the password or the cookie.
- A cookie of `.fermi.ee` does not reach `energiamudel.ee`, which has asked for a password since D-178.

**Decision:**
1. **The button posts a token.** The page's button posts a token of energiamudel's own, 64 hex and not
   `fermi.ee`'s, to `https://energiamudel.ee/sso.php`, in the request's body, never its address.
2. **`sso.php` sets the cookie.** When the posted token equals the one kept one directory above the document root
   (`.sso-token-v5`, 644 as the password files), it sets the cookie `energiamudel_sso` (30 days; Secure, HttpOnly,
   SameSite=Lax) for this site. Every answer is the same redirect to the site, so nothing tells a right token
   from a wrong one. `sso.php` itself answers without the password.
3. **`.htaccess` lets in the password or the cookie.** The cookie's branch compares it with a placeholder that
   `make deploy` replaces on the server, after its `rsync`, with the token from that file. Unreplaced, the branch
   cannot be met — the cookie must be 64 hex and equal the placeholder at once — so the password alone lets in.
4. **The authorisation loses its `<IfModule>` wrapper**, as fermi.ee's sites have it: without the module the
   wrapper would open the site with 200, where now it fails closed with 500.
5. **The token stays out of the repository and its files.** It is on the server, on the tools page, which is
   itself behind its password, and in the owner's register of access. Specification revision 2.40 (`R-DEP-3`).
   No figure moves.

## D-180 · 2026-10-27 · The Presentation page's own price-level sliders for Finland, Sweden and Poland

**Status:** Accepted · 2026-10-27 · the owner: "add multiplier sliders for Finland, Sweden and Poland to the esitlus tab; they must at once change all the
import prices in all the scenarios shown on the page".

**Decision:**
1. **The page carries three sliders of its own**, one per neighbour, in a card at the top beside the capital
   cost: ×0.5 … ×2 in steps of 0.01, a pointer snapping to ×1 as the panel's sliders snap to their preset, a
   key moving one step.
2. **They are the panel's own setting** (`level.FI`, `level.SE4`, `level.PL`, the engine's multiplier on the
   neighbour's hourly prices): one state, so the page's sliders, the panel's and the share link agree, and
   every block and scenario of the page follows — the profiles of D-177 among them.
3. **What moves at once, and what computes.** The figure beside each slider and every block's neighbour
   averages follow the pointer. The scenarios' results follow as the engine computes them: away from ×1 the
   page leaves the sets computed when the site was built, and the blocks compute in the browser behind the
   page's own runs, each shown as it lands ("computing…" until then). At ×1 the built sets return.
4. The sliders stay while the page computes, and they show the live state, not the shown run's, so a redraw
   mid-run does not snap a drag back. Specification revision 2.41 (`R-APP-15`). No figure of the model moves.

## D-181 · 2026-10-27 · The Presentation page's gas and CO₂ sliders, beside the price level's

**Status:** Accepted · 2026-10-27 · the owner, after D-180: "add in the same way the choice of the CO₂ and gas price".

**Decision:**
1. **A second card at the top, "CO₂ and gas prices"**, holds two sliders: the scenario's gas price
   (10 … 120 €/MWh thermal, steps of 0.1) and its CO₂ price (0 … 300 €/t, steps of 0.5).
2. **They are the panel's own setting** (`fuelGas`, `fuelEua`, D-064): one state, so the page, the panel's boxes
   and the share link agree, and every block and scenario follows — the Baltic plants' costs and, where the
   profile can be re-priced (Distributed Energy, Global Ambition, D-072), the neighbours' re-priced hours too.
3. **As D-180 moves:** the figure beside each slider and every block's gas and CO₂ figures follow the pointer;
   the results follow as the engine computes them in the browser; a pointer snaps to the fuel path's own value,
   where the sets computed when the site was built return; a key moves one step.
4. Specification revision 2.42 (`R-APP-15`). No figure of the model moves.

## D-182 · 2026-10-27 · The owner's opening: Estonia's onshore wind and solar, the neighbours' price levels

**Status:** Accepted · 2026-10-27 · the owner, with a screenshot of the panel set as they wanted it: "make the new import prices the default on the main Model tab, and change Estonia's wind and solar; take
the data from the screenshot".

**Decision:**
1. **Estonia's onshore wind 1 300 MW and solar 2 500 MW** in place of S1's 1 244 and 1 785, as the scenario's
   preset (`fleetOf`, S1, EE, 2035; `OPENING_EE_MW`), so that the scenario's chips, the panel's marks, the capital
   cost and the opening agree. The sliders' note gives S1's own figure; the source stays S1's document.
2. **The neighbours' price levels of the opening:** Finland ×1.4783 (typed as 75.0 €/MWh on the profile's 50.7),
   Sweden's SE4 ×1.5, Poland ×1.53 (`OPENING_LEVEL`). The panel lists them as changed from the profile as
   published.
3. **Not taken from the screenshot:** the gas plants' bid moved by hand there (`bid.gas = 35.4`, 220 €/MWh), which
   the owner did not name; it stays the fitted one.
4. **Old share links keep their meaning:** a state's text carries every value, its levels and megawatts among them.
5. Specification revision 2.43 (`R-BND-5`, `R-SMR-8`). The golden fixture's opening cases are re-baselined with a
   note. **The model's opening figures move**; the replays, the validation and the fitted register do not.

**Consequences:** at the opening, Estonia's 2035 average is 107.1 / 96.2 / 86.7 / 76.1 €/MWh with no to three units
(83.6 / 75.1 / 66.2 / 56.2); the plant's effect is −10.9 / −20.4 / −31.0 (−8.5 / −17.4 / −27.5); the contract with
1 / 2 / 3 units pays the state 19 M€ a year, costs it 11 and 99 (costs 34 / 115 / 251); Latvia 109.0 → 105.5 with two
units. The levels apply to every profile the Presentation page shows (D-180), the tight ones too: TIGHT 152.5 and
TIGHTJ 159.3 €/MWh without the plant (122.2, 120.3).

## D-183 · 2026-10-27 · The standard sensitivities become four price pairs of LNG and CO₂

**Status:** Accepted · 2026-10-27 · the owner, with a table: "replace the standard sensitivities with what I added in the screenshot" — LNG 30 / 45 / 60 / 75 €/MWh with CO₂ 80 /
95 / 120 / 150 €/t.

**Decision:**
1. **Four sensitivities in place of the five of R-APP-11** (slow build with and without electrolysis, storage above
   the scenario, the gas shock of 2026, CO₂ at its 2026 price, D-140). Each is the scenario at one price pair, the
   scenario's gas and CO₂ (`fuelGas`, `fuelEua`), everything else the headline's: (1) 30 / 80, (2) 45 / 95,
   (3) 60 / 120, (4) 75 / 150. The LNG price is the scenario's gas price, per net MWh as ERAA's (D-171).
2. **The neighbours follow** where their profile is re-priced (D-072), as the cards' "i" says; with the plant,
   each is run with and without it, as before.
3. **What stays:**
   - The engine's gas floor and Poland's floor, which (d) and (b) used, stay; the worker test exercises them
     directly.
   - The slow build of (a) stays as `slowBuild`, so the golden fixture's case of it is unchanged.
   - The talk's slide L5 computes CO₂ at its 2026 price on its own (`figures.ts`, `co2_2026`).
4. Specification revision 2.44 (`R-APP-11`). No figure of the headline moves; the sensitivities' do.

**Consequences:** at the opening, Estonia's 2035 average without the plant is 73.4 / 92.6 / 107.3 / 121.6 €/MWh at
the four pairs (107.1 at the scenario's 38.2 / 197.5), and with two units 59.7 / 75.4 / 86.3 / 95.7; the contract with
two units costs the state 149 / 69 / 13 M€ a year and pays it 36 at the dearest pair.

## D-184 · 2026-10-27 · The sensitivities' cards: Estonia alone, in the four scenarios

**Status:** Accepted · 2026-10-27 · the owner: "for the standard sensitivities, instead of the three countries keep only Estonia and the
scenarios 0, 1, 2, 3 SMR".

**Decision:**
1. **Each card is one price pair (D-183)** with a row per scenario, 0 to 3 SMR. Each row gives Estonia's average
   price at the pair and, beside it, the change against the same scenario's headline. Latvia and Lithuania leave
   the cards, and so does the column of the plant's effect.
2. **The page computes every scenario's set at each pair** — the scenario shown first, then 0 SMR, then the rest.
   That is 48 years for four pairs, where it was 12, or 24 with the plant. At the opening they come from the sets
   computed when the site was built, which already hold every scenario's. Each row says "computing…" until its set
   is in.
3. **The export keeps its fields:** the scenario shown's set and 0 SMR's, the four now under `by`.
4. Specification revision 2.45 (`R-APP-11`). No figure moves.

## D-185 · 2026-10-27 · The opening's SE4 at 90 and Poland at 120 €/MWh

**Status:** Accepted · 2026-10-27 · the owner: "make Sweden's
SE4 90 and Poland 120 the default".

**Decision:**
1. **The opening's price levels of SE4 and Poland are the ones that give those averages** in the panel's boxes, on
   the opening's re-priced Distributed Energy 2035 profile: SE4 ×1.4943 (90.0 on 60.2 €/MWh), Poland ×1.5276 (120.0
   on 78.6), in place of D-182's ×1.5 and ×1.53 (90.3 and 120.2). Finland stays ×1.4783 (75.0).
2. **The opening's figures move by 0.1 at most:** Estonia 107.0 / 96.1 / 86.6 / 76.1 €/MWh with no to three units
   (107.1 / 96.2 / 86.7 / 76.1), the plant's effect −10.9 / −20.4 / −30.9.
3. The golden fixture's three opening cases are re-baselined with a note. The FAQ in both languages gives the three
   averages. Specification revision 2.46 (`R-BND-5`).

## D-186 · 2026-10-27 · The gas plants' bid in each sensitivity's description

**Status:** Accepted · 2026-10-27 · the owner: "add the bid's price to
the sensitivities' description".

**Decision:**
1. **Each card's "i" gives the gas plants' one bid (D-164) at the headline's prices and at the pair's**, after the
   gas and CO₂ lines: a combined-cycle plant's cost plus the fitted adder, with an offset moved by hand kept. At the
   opening, 184.6 €/MWh becomes 127.0 / 159.3 / 195.2 / 233.0 at the four pairs (30 / 0.56 + 80 × 0.366 + 1.6 +
   42.5 = 127.0 for the first).
2. Specification revision 2.47 (`R-APP-11`). No figure moves.

## D-187 · 2026-10-27 · The gas plants' bid in each sensitivity's name

**Status:** Accepted · 2026-10-27 · the owner: "let it be
inside (1) LNG 30 €/MWh, CO₂ 80 €/t".

**Decision:** each card's name carries the gas plants' one bid at its pair, rounded as the panel's box: "(1) LNG 30
€/MWh, CO₂ 80 €/t, gas plants' bid 127 €/MWh", then 159, 195 and 233 at the opening. D-186's line in the "i" stays,
with the headline's bid beside the pair's. Specification revision 2.48 (`R-APP-11`). No figure moves.

## D-188 · 2026-10-27 · The net gain or cost of the lower price and the contract, in the sensitivities

**Status:** Accepted · 2026-10-27 · the owner: "add to the sensitivities the net gain or cost of the electricity
price reduction and the price-gap mechanism at different prices and volumes".

**Decision:**
1. **Under the four cards, a table by price pair (the prices) and by 1, 2 and 3 SMR (the volumes)**, M€ a year,
   three figures each:
   - *the lower price*: the fall of Estonia's average price against 0 SMR at the same pair, times Estonia's demand
     as the Presentation page gives it (11.6 TWh at the opening) — what its consumers pay less at the exchange;
   - *the contract*: what the state receives (+) or pays (−) under the contract (a), settled hourly at the panel's
     strike (90 €/MWh by default) and clause, on the pair's run with the plant, as the Presentation page's row;
   - *the net*, the two together.
2. **The price is the hours' average, not weighted by the load**, as every price figure of the page; the demand
   leaves out electrolysis and storage charging. The tip says so in both languages.
3. At the opening (strike 90): the net is +17 / +9 / −42 M€ a year with one to three units at pair (1), +82 / +130
   / +125 at (2), +140 / +230 / +259 at (3), +203 / +335 / +394 at (4).
4. `statePaysOf` (results.ts) is the contract's yearly sum the Presentation page's row already used. Specification
   revision 2.49 (`R-APP-11`). No figure of the model moves.

## D-189 · 2026-10-27 · Each unit 315 MW

**Status:** Accepted · 2026-10-27 · the owner: "let each reactor
in the model now be 315 MW".

**Decision:**
1. **The unit offers 315 MW** (`smr.bwrx300.net_output_mw`), GE Vernova Hitachi's "~315 MWe" gross power (General
   Description, Rev. J, p. 53, §5), in place of D-011's "~300 MWe (net to grid)" (Table 21-2, p. 123). The
   parameter keeps its key; its row and verification name the new page (found again by pdftotext). The net 300 MW
   stays in the specification beside it (`R-SMR-1`), and the adequacy sampler's units follow the same parameter.
2. **The figures with the plant move; 0 SMR does not** (its problem is identical, checked). At the opening Estonia
   reads 107.0 / 95.6 / 85.6 / 74.6 €/MWh with no to three units (107.0 / 96.1 / 86.6 / 76.1), the plant's effect
   −11.4 / −21.4 / −32.4. The net table of D-188 at the opening: +18 / +5 / −53 M€ a year at LNG 30 / CO₂ 80 and
   +211 / +343 / +398 at LNG 75 / CO₂ 150.
3. The capital cost stays per unit (4 600 M€ for two, D-157). The golden fixture's 2 SMR cases are re-baselined with
   a note (0 SMR unchanged); the build test counts 315 MW. Specification revision 2.50 (`R-SMR-1`); the FAQ and the
   methodology in both languages.

## D-190 · 2026-10-28 · The neighbours' price levels belong to Distributed Energy 2035 alone

**Status:** Accepted · 2026-10-27 (late evening) · the owner, asked before the night's work whether the levels of
D-182 and D-185 (×1.4783 / ×1.4943 / ×1.5276) should also multiply the tight profiles, Global Ambition and National
Trends: "Only on DE 2035" — the other profiles as built or published (×1), the Presentation page's sliders moving
them against their own ×1.

**Decision:**
1. **Each profile opens at its own level** (`presetLevel`, `state/model.ts`): the owner's on TYNDP 2024 Distributed
   Energy 2035, the opening's profile; ×1 on every other — Distributed Energy of 2040 and 2050, Global Ambition,
   National Trends, National Trends+, the observed prices and the research's two tight profiles.
2. **A level carries over between profiles by its share** (`withProfile`): the level on the new profile is the old
   level × the new profile's own ÷ the old profile's own. At the opening the other profiles open at ×1; a level
   moved to ×1.6 on Distributed Energy 2035 is ×1.6 ÷ 1.4783 = ×1.082 on another; the way back is exact. A share
   link carries every value, as before.
3. **The Presentation page** shows the levels of its top block on its sliders; each other block moves by its share
   of them, its neighbours' averages with the pointer (`data-base` scaled by the share). A pointer snaps to the top
   block's own level, where the sets computed when the site was built return — before, it snapped to ×1, where
   none were left since D-182. The slider's tip says so in both languages.
4. **The figures move only where a profile other than Distributed Energy 2035 is shown.** At the opening:
   - tight, each on its own: 119.1 / 105.4 / 94.6 / 84.3 €/MWh with no to three units (152.5 without the plant
     under D-182's levels);
   - tight, all together: 117.8 / 109.5 / 102.0 / 94.0;
   - Global Ambition 2035: 75.7 / 66.8 / 57.8 / 48.0;
   - National Trends 2040 (2009 only): 145.6 / 127.3 / 117.1 / 107.7.

   Distributed Energy 2035 — the headline, the sensitivities, the golden fixture — does not move.
5. Specification revision 2.51 (`R-BND-5`, `R-APP-15`).

## D-191 · 2026-10-28 · The robustness study's ranges at the owner's assumptions

**Status:** Accepted · 2026-10-27 (late evening) · the owner, asked before the night's work which ranges the Monte
Carlo of the plant's effect (`spikes/smr-robustness/`, the talk's slide L4) should draw from, now that the opening's
levels of ×1.48–1.53 lay outside its ×0.8–1.4: "By your assumptions".

**Decision:**
1. **The neighbours' level ×1.0–2.0** — the profile as published to twice it, the owner's levels within. Until then
   ×0.8–1.4.
2. **Gas 30–75 €/MWh thermal**, the owner's four LNG prices (D-183, per net MWh, D-192). Until then 25–50.
3. **CO₂ 80–200 €/t, Estonia's demand ×0.85–1.10, onshore wind 1 000–2 500 MW and solar 1 500–3 000 MW** as they
   were (the owner's 1 300 and 2 500 within).
4. The same 300 samples of a Latin hypercube from the same seed, on the opening state as it is (D-182 … D-190). The
   deck's slide L4 reads the ranges from the study's own file. A research figure; nothing on the site.

## D-192 · 2026-10-28 · The owner's LNG prices are per MWh of net calorific value

**Status:** Accepted · 2026-10-27 (late evening) · the owner, asked whether the four LNG prices of D-183 (30 / 45 / 60
/ 75 €/MWh) are market quotes, which are per MWh of gross calorific value, and told what the difference means: "Already on the lower heating value".

**Decision:** the four prices stand as the panel's gas box takes them, per MWh of the gas's net calorific value —
the basis of the plants' efficiencies and of the opening's 38.2 (TTF's 34.35 per gross MWh ÷ 0.9, D-171). The gas
plants' bid at the four pairs stays 127 / 159 / 195 / 233 €/MWh. Each card's "i" says the basis in both languages. No
figure moves.

## D-193 · 2026-10-28 · The declaration of interest names the base case as it is

**Status:** Accepted · 2026-10-28 · the owner, asked how the declaration should read now that the default state holds
the owner's wind, solar and neighbours' prices (D-182, D-185): "Clarify the wording".

**Decision:** the declaration (R-PUB-2; the footer, README, the FAQ in both languages, the deck's slide 2) no longer
calls the default "the official scenario … the TSO's own case". It says the scenario without the plant is the TSO's
base scenario S1 with the author's assumptions on wind, solar and the neighbours' prices, each marked as such in
the panel, and is the default, shown before any case with the plant. The rest of D-124's wording stands. No figure
moves.

## D-194 · 2026-10-28 · The neighbours' profiles as published: the re-pricing removed

**Status:** Accepted · 2026-10-28 · the owner: "remove the box *Re-price to the scenario's CO₂ and gas prices*, and the function
altogether", with the table of D-195, whose every figure is the model's with the box unticked and the neighbours'
averages at 75 / 90 / 120 €/MWh.

**Decision:**
1. **Every neighbours' profile is taken as published, times its level** (`boundaryPrice`, `build.ts`). The
   re-pricing of D-072 — the map from the market model's gas and CO₂ prices to the scenario's (`repriceKnots`),
   the default since D-079 — is removed with:
   - its box in the panel and its state (`neighbourFuel`) and its line in the scenario text;
   - the sentence of the sensitivities' description, the Presentation page's tip on the gas and CO₂ sliders;
   - the import-price page's hint and chart caption (E-108, E-127), the Weather page's line, the Statistics
     page's note.

   The scenario's gas and CO₂ prices move the Baltic plants alone; the neighbours' prices are their profile's.
2. **The owner's levels keep their averages**: Finland ×1.8786, SE4 ×1.9607 and Poland ×2.0982 on the profile as
   published (39.9 / 45.9 / 57.2 €/MWh, weighted over the climate years) give 75.0 / 90.0 / 120.0, as D-182 and
   D-185 set them, in place of ×1.4783 / ×1.4943 / ×1.5276 on the re-priced profile (50.7 / 60.2 / 78.6). The
   owner's table was computed so. The level reaches ×3 — the scenario schema and the panel's, the Presentation
   page's and the import-price page's sliders — since Poland's is above 2.
3. **A text that names `neighbours.fuel` still reads**, as published, so that a share link made before loads; the
   scenario schema keeps the key for that, described as ignored.
4. **The neighbours' fossil level** (R-SMR-5, E-064) stays the market model's best gas plant on its own gas blend
   and CO₂ price (`neighbourGasCost`), as it was for a profile not re-priced: the same to the sixth decimal as the
   code before, for Distributed Energy and Global Ambition 2030–2050. Its two parameters keep their keys
   (`boundary.reprice.tyndp2024.gas_blend`, `.methane_share`). The electrolyser, synthetic-fuel and reformer rows
   that only the map used stay in `parameters.csv` as the record of D-072.
5. **At the opening** Estonia reads 108.1 / 96.2 / 86.0 / 75.0 €/MWh with no to three units (107.0 / 95.6 / 85.6 /
   74.6 before), Latvia 109.5 / 107.4 / 106.0 / 105.3, Lithuania 109.9 / 107.7 / 106.5 / 105.7. Under the contract
   at 90 €/MWh the state receives 20 M€ a year with one unit and pays 15 with two and 113 with three (+19 / −17 /
   −117 before). The price pairs move the most, as the neighbours no longer follow the gas and CO₂: Estonia without
   the plant 90.7 / 98.9 / 106.3 / 112.5 €/MWh at the four pairs (73.4 / 92.5 / 107.2 / 121.4 before). The tight
   profiles and National Trends were never re-priced, and their figures stand; Global Ambition's move with Distributed
   Energy's.
6. **Neither the validation nor the calibration moves**: a replay never re-priced. The golden fixture's three
   scenario cases are re-baselined with a note; the synthetic week and the 2024 replay are unchanged:

   | Case | Before | After |
   |---|---|---|
   | `opening_cy2009_gas_record` | `1cd8b286…` | `abd22a53…` |
   | `opening_cy2009_smr2_record` | `82defdb1…` | `456e6d67…` |
   | `opening_cy2009_smr2_sens_a_record` | `7fcf08a2…` | `32a3f27e…` |
7. The research spikes that re-price (`spikes/boundary-prices/`, `spikes/neighbour-fuel/`,
   `spikes/neighbours-2035/cases.ts`, `spikes/finland/v5.ts`) run as of their own commits; the talk's `figures.ts`
   reads the profile as published. Specification revision 2.53 (`R-BND-5`).

## D-195 · 2026-10-28 · The standard sensitivities as the owner's table

**Status:** Accepted · 2026-10-28 · the owner, with a picture of the table: "in place of the blocks
… put a table as in the picture".

**Decision:**
1. **One table in place of the four cards (D-184 … D-187) and the net table (D-188)**, under the heading *Standard
   sensitivities* and its tip, a column per price pair:
   - at the head, on a band of the accent: LNG, CO₂ and the gas plants' one bid at the pair;
   - *Electricity price without nuclear* (0 SMR) and *With x TWh of nuclear* for one to three units, named by their
     output in a year (2.7 / 5.3 / 8.0 TWh at the opening), each with Estonia's average price, its row on the
     surface;
   - under each, *Baltic gas plants set the price*: the share of the year's hours in which a gas plant of Estonia,
     Latvia or Lithuania set Estonia's price, weighted over the climate years;
   - for the units, *the gain from the lower electricity price*, *the contract for difference* at the strike and
     *the consumers' net gain*, M€ a year, as D-188 computes them; the net tinted by its sign.
2. **The gas plants' hours are a new count of the run's view** (`ZoneView.fossil.gas`, `worker/view.ts`): of the
   hours whose price a Baltic fossil plant set (`fossil.unit`, R-SMR-5), those of a gas plant, `other` counted as
   gas as it bids (D-020). A view stored before shows "–".
3. **The table is the model's**: on the opening of D-194 it gives the owner's picture again, 58 of its 68 figures
   to the last digit and the other ten one apart in it — the picture's levels were exact where the opening's are
   kept to four decimals (83.9 against 84.0), and its sums were of rounded figures (128 + 18 = 146 where the page
   sums 127.6 and 17.8 to 145).
4. The tip gives the method in both languages; the cards' "i", which listed each pair's changes (`sensAbout`), goes,
   the table's head saying the same. The exports are unchanged. Specification revision 2.54 (`R-APP-11`).

## D-196 · 2026-10-28 · One theme, the light one

**Status:** Accepted · 2026-10-28 · the owner: "remove the switch to the dark theme, it is no longer needed".

**Decision:**
1. **The interface has one theme, the light one, whatever the system's preference** (`theme.css`): its tokens are
   `:root`'s, `color-scheme: light`; the dark tokens of v4's panel, the `prefers-color-scheme` rule and the
   `data-theme` blocks go. Print keeps its own block, the same on white surfaces.
2. **The header's ☀ | ☾ switch goes** (`index.html`, `main.ts`), with its Estonian label. A choice kept in a browser
   from before is no longer read.
3. **Printing still draws the charts again** as it begins and ends, for the print layout, wider without the panel
   (Chart.js does not resize for print); it no longer has a theme to change.
4. The contrast test checks the light theme and print, and that no dark theme or system rule is left. The Presentation
   page's scenario ramp is the light theme's, darker with more of the plant. The demo script's line on the toggle is
   rewritten. Specification revision 2.55 (`R-UI-1`, `R-UI-5`, D12). No figure moves.

## D-197 · 2026-11-02 · The look of Fermi's projects

**Status:** Accepted · 2026-11-02 · the owner: «lets update design. create new brunch. design should be based on
projects we used in fermi folder project. lets work step by step. create project in design space» — each view drawn
on a claude.ai Design canvas and reviewed in turn, the logo «d6 - flat», the canvas's sixteen proposals decided one by
one the same day, then «Yes, start».

**Decision:**
1. **The interface takes the look of Fermi's projects** (the slides, posters, memos and sites under `Projects/Fermi`):
   the page #F6F7F9 under white cards, plates #EFEEF7, rules #DEDCEA, ink #1C1B29, muted #5A5870, headings in navy
   #03084C, an indigo accent #2303BD whose tint #F0EDFA marks the view shown; the views as pills; the panel's boxes and
   the results' cards white, 12 px corners, 8 px for a control. Montserrat sets text and numbers, tabular figures for
   the numbers, weights 400 to 800 self-hosted with its licence (`app/public/fonts`, the files of Fermi's `sise`
   repository at `a49f7532`, as Google Fonts serves them); D-DIN and JetBrains Mono go; code and the scenario's text
   take the system's monospace. Specification revision 2.56 (`R-UI-1`, `R-UI-2`, D12).
2. **The wordmark is D6, "flat":** ENERGIAMUDEL in Montserrat ExtraBold capitals in the accent, then a tile of Fermi's
   green #15C75D with V5 in the accent — no shadow, no icon before the word, no full stop. It is the glyphs' outlines
   (`app/index.html`), not a font load; the favicon is the tile. The canvas set it in Archivo Expanded, which the Mac
   does not hold: the owner chose Montserrat ExtraBold over downloading it. energiamudel.ee stays a neutral site — no
   Fermi logo — and the declaration of interest is unchanged.
3. **The validation's state on an amber plate** with a warning sign (`R-PUB-4`'s words unchanged: the gate not met,
   released at the owner's decision). The canvas first drew it green with a tick and "met": the error was found on the
   canvas before any code and corrected there.
4. **A sign's colour on a light fill of its own** — green on #E3F7EC, red on #FDE8E8 — for the scenarios'
   differences, the sensitivities' net gain and the Presentation's differences (the owner on the canvas, after the
   tables of Fermi's memo *Nuclear energy developments, decisions and benefits for Estonia*).
5. **The generation groups' hues and the scenarios' ramp are checked** with the dataviz palette validator on white:
   oil shale #9A5B2E, biomass and waste #6AA84F, wind #2A78D6, gas #EB6834, hydro #1BAF7A, solar #EDA100, storage
   #E87BA4, nuclear #6250D6, other #A9ABBA (colour-blind separation of neighbours 9.1, normal vision 19.6; the four
   under 3:1 against white carry legends and labels); 0 to 3 SMR #A99CF4, #7A66EC, #4C2FDC, #2303BD as an ordinal ramp.
   They replace v3's technology colours of D-053.
6. **The owner's decisions on the canvas's proposals**, each implemented in a step of its own that cites this record:
   - Model: the daily stack becomes weekly columns; the mixes' doughnuts horizontal bars; the average and the median
     one chart; the climate years a colour each — 1995 #0E9F6E, 2008 #D9600B, 2009 #4C2FDC, validated on white (the
     accent fails the categorical band's lightness) — wherever the three years are series: the Model's duration
     curves (the owner's choice over "2009 in the accent, the others grey"), and, for one colour per year across the
     site, the Adequacy page's sorted samples, the import-price page's duration curves and the Weather page's picked
     years.
   - Presentation: the inputs table once, above the blocks — it is the same in every block, so this supersedes that
     part of D-177; the results and the impact one table per block.
   - Adequacy: the three years' tables one grouped table.
   - Every view but the Model: the panel's long sections folded, the top ones open.
   - Import price: Finland's five small sources one band, "other".
   - Weather: the picked years' values in a line above each chart, not on the bars.
   - Statistics: offshore wind a sentence and its table; the six empty charts go.
   - Documentation: a contents rail beside the long texts; ✓/✗ chips on the short methodology's checks; the Sources
     in three columns (access under the source's name), the documents grouped by their first letter with an index of
     letters and a search box, which searches in the page and sends nothing.
7. **This record's first step** is items 1 to 5: tokens, fonts, the header, the gate's plate, cards, the signs' fills
   and the palettes. The register lists Montserrat in place of the two faces; the export is rebuilt for the register's
   new code hash and its content is unchanged (`export` ff8290850e8a). No figure moves.

## D-198 · 2026-11-02 · The panel's sliders thin, under their boxes, the preset red

**Status:** Accepted · 2026-11-02 · the owner, with a picture of the canvas's battery row: "make the scales narrower and the dashed
line where it snaps red; place the scales under MW and €/MWh, as in the picture".

**Decision:**
1. **A slider is a thin track with a round knob** (`theme.css`): the track 6 px, filled in the accent up to the knob —
   which hides where the fill ends —, the knob 18 px; until now a 22 px fill bar with no knob (design F of
   `spikes/slider-designs`, the owner's choice of 2026-10-21). The preset's line stands under the knob's centre
   (`panel.ts`, `THUMB` 18).
2. **The preset, where a pointer snaps, is a red dashed line** across the track (it was the ink's, faint).
3. **A source's row reads down** (`.row.ic`): its name and its change from the reference year; under them its number
   and its bid in boxes, each unit beside its box; the slider under the two the row's width; the glyph left of all
   three (D-060). A changed number keeps its amber box. Specification revision 2.60 (`R-APP-1`, `R-UI-6`). No figure
   moves.

## D-199 · 2026-11-02 · Estonia's results in bold in the scenarios' table

**Status:** Accepted · 2026-11-02 · the owner: "in
Scenarios, 2035 set the Estonian results in bold".

**Decision:** In the Model view's table of the four scenarios (`trioHtml`), Estonia's rows — its average price, its
net import, its hours with a fossil price and the hours its natural gas ran — set their name and figures in bold; the
differences to *0 SMR* keep their chips, and the rows of Latvia and Lithuania and the sums of the three zones (CO₂, the
wind and solar curtailed) stay as they were (`R-APP-1`). No figure moves.

## D-200 · 2026-11-02 · The sensitivities' table with rounded corners

**Status:** Accepted · 2026-11-02 · the owner: "I liked the rounded corners of the filled tables as in the design; do it in the standard
sensitivities".

**Decision:** The standard sensitivities' table (`R-APP-11`) stands in a white card with the design's 12 px corners and a
hairline round it, as the canvas drew it: its wrapper clips the indigo head's corners, also as it scrolls a narrow
window; the groups stay apart by white space in the card, and the last row has no rule under it. No figure moves.

## D-201 · 2026-11-02 · The validation's banner off the pages; the threshold stays 15

**Status:** Accepted · 2026-11-02 · the owner, asked to raise the hourly threshold to 18 and told that the errors are
known (17.8 at most, 2025), that raising it now reads as moving the goalposts and that the gate would stay not met on
the other measures (23 of its 26 breaches): "we keep 15, but take the notice off the interface's page; keep it only inside the system".
Specification revision 2.61 (`R-PUB-4`). Takes back, for the pages, D-123's condition that the validation be stated
beside every released figure.

**Decision:**
1. **R-VAL-5's hourly price threshold stays 15 €/MWh**; nothing in the validation moves.
2. **The banner that stated the validation at the top of every page goes** (`index.html`, its styles in `theme.css`).
3. **Its words stay inside the system:** every export's gate line — CSV and JSON — reads them from the code
   (`calibration.ts` `gateNote`, in the page's language) where it read them off the page; the Calibration page keeps
   its three gates with their verdicts; the methodology, the README and the FAQ keep the figures. The site check no
   longer needs to allow the banner's sign's SVG namespace.

## D-202 · 2026-11-02 · The monthly price chart's average or median at a switch

**Status:** Accepted · 2026-11-02 · the owner: "on the chart Kuu keskmine ja mediaanhind put a toggle switch between the average and the
median". Specification revision 2.62 (`R-APP-1`). Amends D-197, item 6, the two on one chart.

**Decision:** A scenario's monthly price chart on the Model view shows the average or the median, not both: a bar a
month in the accent with its figure over it, the legend naming the measure and the year. A switch on the chart's title
line, as the header's language switch, picks the one shown; the average comes first. The axis is drawn for both, so
that the switch moves only the bars, and the switch keeps to the title's height, so that the plot stays level with its
neighbour's. The choice holds while the page is open, as the weekly chart's switch does; the address does not carry
it. A replay keeps the average and the median on two charts, each beside the actual year's. No figure moves.

## D-203 · 2026-11-02 · The source rows' boxes as low as the neighbours' price boxes

**Status:** Accepted · 2026-11-02 · the owner, with pictures of a neighbour's price box and of the batteries' row:
"I like the height of
the boxes in Neighbours' prices; put such ones in Generation and demand".

**Decision:** The number and bid boxes of the panel's source rows — generation, demand and flexibility, and the SMR
units' tile among them — are 26 px high, as the neighbours' price boxes are, where D-198 made them 38 px; their width,
type and figures stay (`R-APP-1`). No figure moves.

## D-204 · 2026-11-02 · Estonia's oil shale and gas folded, as the canvas drew them

**Status:** Accepted · 2026-11-02 · the owner: "make the
folding for gas and oil shale as in the design". Specification revision 2.63 (`R-APP-1`).

**Decision:** In the scenario view's *Generation and demand*, Estonia's four rows of oil shale — Auvere, Eesti 8 and
Balti 11, Eesti 3–6 and retort gas — and its four rows of gas fold under a line each, as the canvas drew them: a
chevron, the group's name and how many rows it holds, its change from the reference year and its megawatts, and under
gas's line its one bid (D-164). A fold is closed until opened, its line a button; it stays as left while the page is
open, across the zones and the panel drawn again, and the address does not carry it. The megawatts are the sum of the
fold's rows and move with a slider inside it. The change is the family's from the reference year, as the rows' sum line
gave it (D-057), which the fold's line replaces: for oil shale its three blocks, retort gas keeping its own on its row.
Latvia's and Lithuania's gas is one row each and stays a row. The marks keep the panel's green and red, not the canvas's
amber chips. No figure moves.

## D-205 · 2026-11-02 · The scenarios' differences as chips, as the canvas drew them

**Status:** Accepted · 2026-11-02 · the owner: "let the green and red differences in the table Scenarios, 2035 be in the style of the design".

**Decision:** In the Model view's table of the four scenarios (`trioHtml`) each difference to *0 SMR* is a chip, as the
canvas drew it: 6 px corners, 52 px at least, its figure in semibold, green on the light green fill where it falls and
red on the light red one where it rises (a fall the good way on every row, the owner's of 2026-10-06), a difference
of none in muted ink without a fill. The chip carries no unit, which stands beside the figure in the same pair of
columns, where the whole cell was filled and held the unit too (D-197). Under 760 px of table the chips lose their
least width, as the cells did (`R-APP-1`). No figure moves.

## D-206 · 2026-11-03 · The line map with Estonia's islands

**Status:** Accepted · 2026-11-03 · the owner: "improve the
map: Estonia has lost Hiiumaa and Saaremaa"; the download of the file below at the owner's yes the same day.

**Decision:** The land under the Links box's line map is Natural Earth's 1:50m countries (public domain; version 5.1.1,
`ne_50m_admin_0_countries.zip`, 799 734 bytes, sha256 5fed4333…b853139, from naciscdn.org), where it was the 1:110m
file that ships with pyogrio's tests and has none of Estonia's islands. Estonia has its mainland, Saaremaa, Hiiumaa and
Muhu; Gotland, Öland, Åland and Bornholm come with the finer file. `spikes/basemap/basemap.py` reads the file from where
it is unzipped, outside the repository, and simplifies each outline by 0.02°, under a pixel at the map's scale, so that
`app/src/ui/basemap.ts` is 9 KB where it was 3; the map's projection is unchanged, so the lines and their nodes stand
where they stood (`R-APP-1`). No figure moves.

## D-207 · 2026-11-03 · The Baltic states' borders on the line map

**Status:** Accepted · 2026-11-03 · the owner: "let it be.
Estonia, Latvia and Lithuania should have their border visible"; "let it be" answered the offer to bring D-206 to main
before the freeze: it stays on the branch.

**Decision:** On the Links box's map the three modelled zones keep their stronger fill and have their outlines drawn in
the accent at 45 % on white, 0.8 px, where every country had the hairline's colour, 0.6 px, which on their fill did not
show; so the borders between Estonia, Latvia and Lithuania show, and theirs with their neighbours and their coasts. The
three are drawn after their neighbours so that no neighbour's fill or line covers their borders (`R-APP-1`). No figure
moves.

## D-208 · 2026-11-03 · A streak both ways along the lines in service

**Status:** Accepted · 2026-11-03 · the owner, after the line-glow bench (`spikes/line-glow`): "we put in C1 Streak, speed 1, strength 90", on the bench's switch as it stood, both ways at one pace —
the owner's word before it: "let the flows go both ways along
the cable's edges".

**Decision:** Each line in service on the Links map carries two light streaks, one each way along an edge of its cable,
each on the right of its way as on a two-way road: a white gradient patch every 48 map units, at 90 % at its peak,
moving 27 units a second (an SVG gradient moved by SMIL), over the cable and under the pointer, which goes through to
the line. A line switched off or held has none. Where the reader asked the system for less motion
(`prefers-reduced-motion`) there are none. The panel is drawn again on every change, and a new map's clock is set to
the page's, so that the streaks go on where they were rather than from their start. The streaks say a line is in
service and that a line carries both ways; they do not say how much each way carried, which the bench showed as an
option and the owner did not take. WCAG 2.2.2 (level A) would ask for a way to pause motion that runs longer than five
seconds beside other content; R-UI-5 does not name it, the owner chose the motion knowing it (the bench's tags said
so), and reduced motion stops it (`R-APP-1`, `R-UI-5`). No figure moves.

## D-209 · 2026-11-03 · The computing banner as a line and a chip

**Status:** Accepted · 2026-11-03 · the owner, after the computing-banner bench (`spikes/busy-banner`): "let's improve the 'arvutatakse' plate that appears at
the top while the model computes", then «change to B A line and a chip». Amends D-054's form; its message stays.

**Decision:** While the headline run computes, the amber banner over the page (D-054) gives way to two signs. A 3 px
line slides under the header in the accent, sticky, so that it stays in view as the page scrolls. A chip takes the
status line's place over the results, the line hidden while it shows: a turning ring, «Arvutatakse 12 aastat…» and, in
a second voice, «eelmiste seadete tulemused» while the results are the previous settings' (when there are any); once
the scenario shown is in, «Arvutatakse teisi stsenaariume, 9 aastat…» with «tulemused on selle arvutuse omad»
(D-127). The results stay dimmed while they are the previous settings'; the chip is not. A narrow column takes the note
to a line of its own, whole. Nothing on the page moves when the run starts or ends, where the banner pushed it down by
some 50 px. The chip is the live region (`role="status"`, polite); the line is hidden from assistive technology. Under
reduced motion the line stands still and the ring does not turn (`R-UI-5`). The bench's tag said B is quieter than
D-054's "big header"; the owner chose it knowing that. No figure moves.

## D-210 · 2026-11-03 · The Presentation page's sliders in the panel's form

**Status:** Accepted · 2026-11-03 · the owner, told with E-179 that the Presentation page's sliders were the browser's own
with no preset line, and asked whether to give them the panel's form: "yes, align them".

**Decision:** The Presentation page's five sliders — Finland's, SE4's and Poland's price levels (D-180) and the
scenario's gas and CO₂ prices (D-181) — take the panel's form (D-198): a thin track filled in the accent to the knob,
an 18 px knob, and the value a pointer snaps to — the state's own level or price, where the built sets return — drawn
as a red dashed line under the knob's centre by the panel's helper (`tickLeft`, E-179). Their rows keep their three
columns, the name, the slider and its figure. The fill follows a drag through the page's one handler for every
slider (`R-APP-15`). No figure moves.

## D-211 · 2026-11-03 · The contract's strike snaps to 90 €/MWh, its red line drawn

**Status:** Accepted · 2026-11-03 · the owner: "add the red snapping line on the contract for difference card at the value 90".

**Decision:** The contract card's strike slider (40–160 €/MWh) carries the panel's red dashed line at the owner's
strike, 90 €/MWh (`STRIKE`, R-SMR-3), under the knob's centre by the panel's helper (`tickLeft`, E-179), and a pointer
snaps to it within 2 % of the range, 2.4 €/MWh, as the panel's sliders snap to their presets (D-029); a key moves one
step. The line stands at 90 whatever strike is set (`R-SMR-3`, `R-APP-4`). No figure moves.

## D-212 · 2026-11-03 · The weather years' weighted column in bold

**Status:** Accepted · 2026-11-03 · the owner: «make weighted column bold in ESTONIA'S PRICE BY WEATHER YEAR, €/MWH
table».

**Decision:** In the Model view's table of Estonia's price by weather year, under the scenarios' table (`trioHtml`),
the weighted column — its heading and each scenario's weighted price, the figure the scenarios' table above shows — is
set in bold; the unit stays regular, as in Estonia's bold rows (D-199), and the weather years' columns stay as they were
(`R-APP-1`). No figure moves.

## D-213 · 2026-11-04 · The Statistics page in five tabs

**Status:** Accepted · 2026-11-04 · the owner: "make several sub-folders in the Statistics tab: one
for wind, one for solar, one for gas and one for CO₂". Asked before the night's work, they answered: the six zones'
day-ahead prices, which belong to none of the four, in a fifth tab, "prices"; the page's order as it stood,
gas first; the tab chosen kept while the page is open, as the documentation's are; the tabs as the documentation's
pills. Specification revision 2.64 (`R-APP-14`).

**Decision:** The *Statistics* view (`R-APP-14`) keeps its title, its "?" and *About this page*, and shows its parts in
five tabs on the documentation's track of pills (D-197): *Gas* (the TTF price), *CO₂* (EEX's auction price of EU
allowances), *Wind* (onshore and offshore wind, and SE4's wind by bidding area), *Solar* (with Estonia's own counts)
and *Prices* (the six zones' day-ahead prices). Gas shows first. The page is still drawn once: a tab shows its part and
hides the others, so the tab chosen stays while the page is open, through the other views and the Sources links, and a
reload opens Gas again. The note on what the capacity statistics count and how the table reads them serves wind and
solar alike, so it heads both tabs, under "Wind: what was built" and "Solar: what was built" in place of the one
heading "Wind and solar: what was built". The research note's line stays under the tabs. No figure moves.

Three details are the night's own, within those answers, for the owner's look before the merge. The fifth tab is
named *Prices* / *Hinnad*, as the answer's preview showed it: *Day-ahead prices* / *Päev-ette hinnad* wrapped the
track to a second line in a window of 800 px. The two headings are new. The shared note is repeated in each tab.

## D-214 · 2026-11-04 · Data centres and new industry on the Statistics page; each country's installed wind and solar

**Status:** Accepted · 2026-11-04 · the owner, after looking at D-213's five tabs: "add data centers and industry too". Asked what the two should show, from which sources and where, they
answered:
- data centres: a table by country of consumption, requests, what is firm and the operators' plans;
- industry: the new industrial loads (hydrogen, steel, e-fuels), not industry's consumption;
- sources: "you have full access to the internet, APIs and so
  on";
- place: both before Prices.

Then: "do the research and add the statistics to the tabs; also add charts of the total installed
capacity for wind and, separately, for solar". Specification revision 2.65 (`R-APP-14`).

**Decision:**
1. **Two tabs, *Data centres* and *Industry*,** between Solar and Prices.
   - Each is a table by country: a heading row per country, then one row per figure giving what it counts, the figure
     with its unit, its date, and its source linked to its row in Sources (`R-APP-9`).
   - The figures are documentary rows (`statistics.dc.*` and `statistics.ind.*`, 55 of them) beside the model's own
     research rows for 2035 (`se2035.*`, `pl2035.*`, D-121).
   - Each was found again by script on its cited page of the cached document; a sum was recomputed from the cached
     table. A figure from the press says so in its row.
   - The research note `docs/research/2026-11-04_datacentres_industry.md` gives the sources, what is soft and what was
     left out.
2. **The Wind and Solar tabs open with each country's installed capacity** at every year's end, 2015–2025 (IRENASTAT,
   the series behind the additions).
   - Wind is onshore and offshore together.
   - Each figure carries the table's two readings to 2040, trend and pace, summed over the technologies.
   - The model's figures for 2035 and 2040 are hollow diamonds, where the model has one for every technology summed.
   - Estonia's diamonds of 2035, like the tables' column "the model, 2035", showed S1's fleet, not the opening's
     (ERRATA E-182, fixed the same day at the owner's word: the opening's figures, S1's own in a note).
3. **The track of pills has a radius of half its height.** A window too narrow for seven tabs on one line wraps them in
   a rounded box, not a pill.
4. **The register admits a cached document as CSV or as a workbook** (`tests/test_register.py`), as D-157 admitted
   JSON: two of Eurostat's tables come as SDMX-CSV, and PSE's list of connections as a workbook.

No figure of the model moves.

The night's own choices, within those answers, for the owner's look before the merge:
- "total" read as the installed capacity (the stock) rather than the yearly additions the tabs already showed, per
  country, with wind as onshore and offshore summed;
- which figures each table holds;
- the wording of each row.

## D-215 · 2026-11-04 · The Statistics page's diamonds name their scenario under the pointer

**Status:** Accepted · 2026-11-04 · the owner, after asking what the diamonds of the installed capacity's charts mean:
"let the
diamonds be interactive: on hover a note should say which scenario it is about".

**Decision:**
1. **Every diamond of the Statistics page shows its tip in the page's box under the pointer** (E-181's box,
   `data-tip`; `statistics.ts` `diamond`): the figure and the scenario it is of. The SVG title it had, which the
   browser showed late and only on the outline, is gone.
2. **What each tip names:**
   - the installed capacity's diamonds: for Estonia, Latvia and Lithuania in 2035 "the Model view's scenarios" and
     their fleet — Elering and TalTech's S1 for Estonia, with the owner's value in place of S1's figure (D-182), and
     ERAA 2025 for Latvia and Lithuania; in 2040 TYNDP 2024 National Trends; for Finland and Poland TYNDP 2024
     Distributed Energy, whose prices the model's neighbours take; on wind, the onshore and offshore parts of the sum;
   - the fuels' diamonds on Gas and CO₂: the fuel path, as the table under the chart names it;
   - the neighbours' prices on Prices: TYNDP 2024 Distributed Energy's average price, 2035's as the neighbours'
     profile the Model view takes before its price levels.
3. **The diamond takes the pointer over its hollow inside and fills under it;** a reading's figure written over it
   lets the pointer through (`theme.css`).

No figure moves.

The executor's own choices, within the word, for the owner's look: the tips on the fuels' and the prices' diamonds
as well as the capacity's (the word named the diamonds, not a tab), and each tip's wording.

## D-216 · 2026-11-04 · A red dot for the value the model has set now

**Status:** Accepted · 2026-11-04 · the owner, after the diamonds' tips: "add a red dot on the chart for the value currently set in the
model". Specification revision 2.66 (`R-APP-14`).

**Decision:**
1. **A red dot on each chart of the Statistics page where the panel sets the value,** at the value set now in the
   scenario view (`statistics.ts` `dot`, the page's `state`):
   - the installed capacity of Estonia, Latvia and Lithuania at the run's year: the zone's megawatts of the
     technologies the chart sums (wind onshore and offshore, solar);
   - the gas and CO₂ charts: the scenario's gas and CO₂ prices at the run's year;
   - the Prices tab: Finland's, SE4's and Poland's average price as the model sets it, the profile's average as the
     panel's list gives it (`mean_price`, D-047) times the level, at the profile's year.
   The dot's tip in the page's box (E-181) gives the figure; the key under each chart names it, "set in the model now".
2. **The dot moves with the panel:** the page is drawn again when the panel changes a value a dot reads (`main.ts`
   `drawStats`, `setKey`), on the tab open. Measured in the dev server: 31–50 ms an input event with the page open,
   the panel's own work included.
3. **Where there is none:** a validation run (its fleets and prices are the observed year's); Finland's, Sweden's and
   Poland's capacity, which the model does not set; the Baltic zones' prices, which the model computes.
4. **The dot is drawn under the diamond:** at the scenario's preset it sits inside the diamond, whose tip, naming the
   scenario, stays under the pointer.
5. **The page no longer dims while the model computes** (`theme.css` `.results.stale`): its dots are the panel's at
   once, and nothing on it waits for a run.

No figure moves.

The executor's own choices, within the word, for the owner's look: the dot on every chart with a value the panel sets
(the word named "the chart"), the neighbours' price as average times level, the dot under the diamond, and the page
undimmed while a run computes.

## D-217 · 2026-11-04 · Onshore and offshore wind in tabs of their own

**Status:** Accepted · 2026-11-04 · the owner: "put offshore and
onshore wind in separate folders". Specification revision 2.67 (`R-APP-14`).

**Decision:**
1. **The Wind tab becomes two in its place, *Onshore wind* and *Offshore wind*:** eight tabs — Gas, CO₂, Onshore wind,
   Offshore wind, Solar, Data centres, Industry, Prices.
2. **Each holds its technology's part as Solar does** (`statistics.ts` `part`):
   - the method's note under "{tech}: what was built";
   - each country's installed capacity at every year's end with the two readings, the model's diamonds and the panel's
     red dot (D-214 to D-216);
   - the net additions and their table.
   SE4's wind by bidding area stays with onshore wind, which SE4 built; its TYNDP figures sum both.
3. **Each technology's capacity is its own figure:** the figures of onshore and offshore wind summed (D-214) are gone,
   and with them the tips' parts.
4. **The track keeps the documentation's pills:** one line at 1,440 px (782 × 44 px), two at 1,280, three at 800, as
   D-214 set a narrow window to wrap.

No figure moves.

## D-218 · 2026-11-04 · Wind's installed capacity and net additions side by side

**Status:** Accepted · 2026-11-04 · the owner: "in the wind folders let each country's installed capacity chart and its net
additions a year chart stand side by side".

**Decision:**
1. **On the Onshore wind tab each country's two figures stand side by side,** installed capacity then net additions, a
   country to a row, under one heading: "Onshore wind: installed capacity at the year's end and net additions a year,
   MW" (`statistics.ts` `part`, `capCells`, `addCells`). The table and its notes follow.
   - Two to a row while the column holds two figures of 280 px; one above the other below that (`theme.css`
     `.st-pairs`).
   - Measured: two at 1,440 and 1,280 px, one at 800 px.
2. **The additions' figure is captioned with the country's pace,** the capacity figure's dotted line: "+78 MW a year on
   average in 2021–2025". The key under the heading names the bars.
3. **What keeps its two sections:** offshore wind, which no country built (D-197), so it has no additions' figures to
   pair; and solar, which the word did not name. (Superseded by D-219 the same day: both pair too.)

No figure moves.

The executor's own choices, within the word, for the owner's look: the additions' caption, the one heading, solar left
as it was.

## D-219 · 2026-11-04 · Offshore wind's empty figures and solar's beside their capacity

**Status:** Accepted · 2026-11-04 · the owner, after D-218: "offshore wind: put the empty charts beside them too; do the same for solar".

**Decision:**
1. **Every technology's tab pairs its figures,** as Onshore wind since D-218 (`statistics.ts` `part`): each country's
   installed capacity, then its net additions, a country to a row, under the heading "{tech}: installed capacity at
   the year's end and net additions a year, MW". The table and its notes follow.
2. **Offshore wind's six additions figures are drawn again, empty** (Sweden's below zero, the retirements). The
   sentence that stood in their place since D-197 stays, above them.
3. **What goes:** the separate capacity and additions sections and their headings, and the additions' old captions.
   `capSection` is removed, and `techSection` is the table alone.
4. **A capacity figure with a tick of six digits has a wider left margin** (`capFig`, 56 in place of 46). Poland's
   solar, up to 200 000 MW, had "100 000" to "200 000" run up to 4 px past the figure's edge since D-214. Measured
   after the fix in Chromium and WebKit: every label of the three tabs starts inside its figure.

D-218's item 3 is superseded; D-197's sentence is kept, its six empty figures are back. No figure moves.

## D-220 · 2026-11-08 · Presentation 2: v3's press deck inside the application, every figure the model's

**Status:** Accepted · 2026-11-08 · the owner: "make a tab in v5 named estitlus2 and put a presentation there like the Fermi deck; take the slides from v3's
presentation, replace the figures with v5's current ones". The task reverses D13, so it was asked before any work
(AGENTS.md §1), and the owner chose: D13's drop of in-app decks superseded for a deck that reads every figure from
the runs ("Yes, D-220, live figures"); the slides in the page's language ("As the site's language"); the cables' slide computed
in the browser ("Calculate in the browser"). Specification revision 2.68 (R-APP-16).

**Context:** D13 dropped presentation decks inside the application so that a deck's figures could not drift from the
model; D-152 kept the Presentation page because it is not a deck. v3's deck (energiamudel-v3, its ADR-032 and
ADR-034) was drawn in the Fermi deck's visual system on a frozen snapshot of v3's results (`presentation_numbers.js`):
the drift D13 guards against.

**Decision:**
1. **A view *Presentation 2*** (Estonian *Esitlus 2*), after *Presentation* (`app/src/ui/deck.ts`; `main.ts`
   `drawDeck`, `paintDeck`, `fitDeck`). One slide at a time on a white 1920×1080 stage — the Fermi deck's frame:
   Montserrat, the heading 72 px in the accent, the subtitle 36 px, the foot "PUBLIC" and ENERGIAMUDEL.EE — scaled to
   the column's width and no taller than the window; a full-screen button scales it to the screen on black. ‹ and ›,
   the arrow, page, Home, End and space keys, and a click on the slide (its left third back, the rest forward) page
   it. The panel folds away, as on Presentation; a validation run gives way to the opening state, as there.
2. **v3's twelve slides, ported** (`PROVENANCE.md`): the title; why another model; how it works; the weather years;
   the scenarios; the price and what its gap means; imports and the hours gas sets the price; the Finnish cables out;
   CO₂ and the EU's targets; the capital cost; the trilemma; try it yourself. Their layouts, lucide's marks, the Fermi
   deck's salmon for gas and v3's atom per reactor are kept.
3. **Every figure is the model's, read from the runs the page shows,** never a snapshot: the state's four scenarios,
   each figure weighted over the climate years (R-TIME-4), its whisker the lowest and the highest year; the fleet, the
   demand, the neighbours' levels and the fuel prices of the same runs and state; the capital cost from the Model
   view's table (`capexRowsOf`, split out of `capexHtml`, which reads it too). A slide whose runs are not in says
   "computing…". D13's reason is kept; its letter is superseded.
4. **v5's scenarios in v3's frame:** 0 SMR (S1 with its gas) and one, two or three units on the same fleet (D-151).
   v3's gas card and nuclear card become the fleet the four share and the plant they differ by; v3's six weather years
   become the state's climate years with their weights, its median the weighted average. Every sentence that states a
   result is written from the figures — the per cent cheaper, a net exporter or importer, how many times fewer hours
   gas sets the price, each outage's change in price — so none can say what the figures do not.
5. **The cables' slide** runs the four scenarios with EstLink 2 out all year and with EstLinks 1 and 2 out (the
   what-if of R-LINK-3, `0@01-01..12-31`) in the browser behind the page's own runs while the deck shows (`loadTrio`,
   the Presentation page's loader made general); their cells read "…" until they are in.
6. **The text is the page's language:** v3's English deck gives the keys, its Estonian the dictionary (`et.ts`), both
   adapted where v5 differs. The literature beside the model's figures keeps v3's sources, named on the slide but not
   linked as v3 linked them, since the built site holds no third-party address (R-NFR-1, `site_check.ts`): IPCC AR5 WG
   III Annex III's direct emissions (its DOI checked against Crossref and given in the methodology, §8.9), Regulations
   (EU) 2021/1119 and 2026/667, EstLink 2's outages of 2024–2025 from Fingrid's and Elering's notices. The last slide
   carries the declaration of interest.
7. **The header keeps one line at 1 440 px** with nine views: the views' buttons 7 px a side (10 until now), 12 px
   between the header's parts (16) and the scenario's line at least 120 px (140). Measured in Chromium with a scroll
   bar: in Estonian the header stays 78 px high; in English, whose view names are longer, the scenario's line wraps to
   four lines and the header is 96 px high (78 before). At 1 280 px it wraps to two lines, as before.

**Consequences:** No figure moves. A slide's figures are those of the settings shown, as on the Presentation page;
the owner's PowerPoint deck of 10 November (`spikes/presentation-2026-11/deck.py`) is unchanged. Not ported: v3's
snapshot and its generator, and its two photographs (no licence is recorded for the BWRX-300 render). The build
does not precompute the outages' runs (`opening.ts`), so the cables' slide computes them each time the deck opens.

## D-221 · 2026-11-09 · The deck checked and improved overnight

**Status:** Accepted · 2026-11-11 · signed by the owner: "do 1, 2, 3, 4", to a list of what was left
undone whose fourth item was this record's signature ("D-221 is not signed", "D-221 is not signed"); deployed since
2026-11-08 22:12. Proposed 2026-11-09 on the owner's word for the night of 2026-11-08/09: "plan the night's work and tests in
detail … a special focus on the Esitlus 2 presentation: checks, and work through proposals for improvement", with the
answers asked before he left: the night's work deployed at its end if everything is green ("Publish at the end of the night, if green"); small improvements implemented as separate commits marked Proposed, large ones written up ("Implement the small ones, describe the large ones"); facts on the slides corrected, wording only proposed ("Correct the facts, propose the wordings"); the
offline copy refreshed, the demo script and Q&A extended, the other views regressed ("Update the offline copy, Demo script and Q&A, Regression of the other tabs"). Specification revision 2.69 (R-APP-16). The night's record, with
the proposals not implemented: `docs/research/2026-11-09_night_report.md`.

**Context:** D-220 (deployed 2026-11-08 21:22) put v3's twelve press slides into the application with every figure
read from the runs. The night checked the deployed deck before changing it. (a) The twelve slides rendered on Node
from the build's own sets (`opening.json.gz`) and from the outages' trios computed on Node workers carry, number for
number, what Chromium showed, in both languages (slides 4 to 11: 43, 48, 48, 64, 89, 37, 58 and 33 figures each). (b) A
probe of every fragment of text — outside the stage, into the footer, overlapping another, clipped by an overflow box —
found nothing on any slide in Chromium 149 and WebKit 26.5, English and Estonian, at 1 440, 1 280, 800 and 375 px. (c)
The keys, the click zones and full screen (headless Chromium) behave as D-220 says; the console is clean, but for
WebKit's "ResizeObserver loop" error on the deck's opening, now and then, which the regression of the views found and
ERRATA E-184 fixes. (d) On the
dev server the price slide is drawn 6.5–10.5 s after the load and the cables' slide 44–61 s after it, its two trios
(24 years) computing behind the page's own runs. (e) The header's view switch runs past the window at 800 and 375 px
(53–93 and 478–518 px) on every view — seen at 800 px on 2026-11-04, before D-220; the site is desktop-only (D-149).
(f) Beside v3's slides (its dev server, screenshots), the port lost the two photographs of slide 5, which filled the
cards' upper halves: the slide's lower half stands empty. The faces the deck asks for, 500 to 800, are the site's own;
800 is used elsewhere only by the documentation's headings. (g) The sources: Regulation (EU) 2026/667's date was wrong
by a month (ERRATA E-183); EstLink 2's outages (26 January – 4 September 2024, Fingrid's notice; 25 December 2024 – 20
June 2025, Fingrid's notice of 18 June 2025), NordBalt's three weeks of September 2023 (2–22 September, Litgrid and
Nord Pool), EstLink 1's converter 1–24 September 2025 (Elering, ERR) and IPCC AR5's 350 / 370 / 490 g/kWh hold; the
declaration's "about 300 MW net each, 315 MW gross" is the FAQ's wording (D-189).

**Decision:**
1. **The slide in the address.** The page's address carries the view shown as the language switch wrote it (`view=…`,
   absent on Model) and, on the deck, the slide (`slide=7`), written with `history.replaceState` on every change of
   view or slide (`main.ts` `placeInAddress`) and read at the start, so that a reload, a link passed on and the
   language switch open the same slide; the language switch itself now changes only the language. The scenario stays
   in the hash as before (R-APP-10).
2. **F, a swipe, and the fonts warmed.** F toggles full screen (the button's title names the key); a sideways swipe of
   40 px or more on the slide pages it on a touch screen (`touch-action: pan-y` on the frame), the click a mouse's
   drag still fires within 0.3 s let go; the 800 face is loaded before the deck's first slide, at most 0.4 s, as v3
   warmed its faces, so that the title does not flash in the fallback font.
3. **The cables' outages computed at the build.** `opening.ts` computes, beside the opening's sets, the four scenarios of
   the opening state with EstLink 2 out and with both EstLinks out (`deck.ts` `OUTAGES` and `without`, which the page
   uses too), two files under the run keys the page asks for: 220 years in 110 s on seven workers, 51 files, 28.55 MB
   against the cap of 35 (196 years, 49 files, 25.77 MB before). On the site the cables' slide of the opening state
   opens full at once, where it waited about 40 s (D-220's open point); any other state's outages compute in the
   browser as before. The deck test reads the outages' what-if and their run keys.
4. **The scenarios' slide fills the stage.** v3's slide 5 carried a photograph in the upper half of each card; the port
   left them out (no licence recorded, D-220), and the slide stood half empty below two short cards. The two cards now
   take the stage's height (612 px of the body's 740) with their rows spread evenly, and the rows are a size up — labels
   28 px (26), figures 32 (28), the gas fleet's 46 (40), the plant's 42 (36), the zone cells 28 (26) — so the slide reads
   from the back of a room; the bottom lines (the neighbours' levels, the fuel prices, the growth mark's key) 24 and 22 px
   (22 and 20). Nothing is added or removed from the slide.

**Consequences:** No figure moves. The build's sets grow by two files and 2.8 MB, `make deploy` by about 15 s. Deployed
2026-11-08 22:09–22:12 under the owner's word for the night, main fast-forwarded to da3ef0a; the rollback copy of the live
d0d7eda is `data/raw-aside/live-d0d7edabb723/`; the sets compared, none of the old differs. The night's report records the
checks and the proposals not implemented.

## D-222 · 2026-11-09 · The deck's speaker notes

**Status:** Accepted · 2026-11-10 · signed by the owner: "I sign D-222, D-223, D-225; publish D-230". Proposed 2026-11-09 as the first of the proposals the night's report left unbuilt
(`docs/research/2026-11-09_night_report.md` §3, "Speaker notes and a presenter view"), taken up the day before the talk
in the smaller of its two sizes, a notes panel under the stage. The presenter window kept in step over
`BroadcastChannel` is not built: the owner decides that later. Specification revision 2.70 (R-APP-16).

**Context:** The talk of 10 November has its sentences in the talk pack (`spikes/presentation-2026-11/`): the demo
script's steps, the Q&A's answers with their cautions, the PowerPoint's speaker notes (`deck.py`). The deck on the site
(D-220, D-221) has none, so whoever presents from the live slides reads the pack beside them. Two things bound what a
note on the page may be. It stands beside figures that are read from the runs, and D13's reason, which D-220 keeps, is
that nothing on a deck may drift from the model. And the page is public: a note is read by whoever asks for it, not by
the speaker alone.

**Decision:**
1. **A note to each of the twelve slides** (`app/src/ui/deck.ts` `NOTES`), in the page's language: the English the key,
   the Estonian in `et.ts`, as every text. A note is what is said with the slide — which chart is which, how a figure
   reads and what it is not (a difference between scenarios and not a forecast; the exchange's price and not the bill;
   the neighbours' prices given and not computed; the emissions of generation in Estonia and not of its imports; the
   plant's price an assumption) — in the speaker's first person, as the demo script speaks. The notes stand in the
   slides' order, one to a slide: a slide added later takes its note at its own place in the list, not at the end — the deck test counts the notes
   against the slides, and a count cannot see a note under the wrong slide.
2. **Text only: no figure, and no result of the runs.** The figures stay on the slide, where they are read from the
   runs; a note that named one, or said which way one goes, could contradict its slide on a changed state. The deck
   test holds every note, in both languages, to no digit and no markup.
3. **The Estonian is the talk pack's own**, shortened where it carried figures: slide 1 the PowerPoint's opening note
   and the demo script's step 7b; 2 the Q&A's K3 and, for where the declaration stands, K35; 3 K16, K7, the demo
   script's step 1 and the PowerPoint's note to how the model works; 4 K27; 5 the demo script's step 2, K32 and the cautions of K22 and K25; 6 K1, K3 and K43; 7 K55's
   caution and K12; 8 K56; 10 K50, K34 and K6; 11 K29; 12 the demo script's step 9, the PowerPoint's closing note and
   K35; slide 9's note is new, the pack having no sentence on emissions. Where the pack has no sentence for
   what a slide shows, the note says it in new words written from the slide and the code: which part of a slide is
   which (slides 6, 7, 9, 10 and 11), that the cables' rows take a cable out for the whole year where the real faults
   lasted months (8), that the emissions are those of the electricity generated in Estonia (9; `engine/results.ts`
   sums a zone's own generation). The declaration of interest is not worded a second time: slide 2's note says where
   it stands — the last slide and the site's footer — and that its place is before the figures.
4. **The panel under the frame**, shown and hidden by the N key or the *Notes* button of the deck's bar (`main.ts`
   `toggleNotes`, `paintNotes`). The notes are off whenever the page opens: neither the address nor the browser keeps
   them. The stage keeps its size, and the note is scrolled into the window with its slide when it is shown and on a
   change of slide (`scrollIntoView`, nearest), a longer note otherwise running past the window's foot. The bar's
   fourth button must not move the slide: the deck's column is the page's whatever the bar holds (`minmax(0, 1fr)`;
   in a window narrower than 440 px the bar's least width had widened the grid's track, and the slide with it), and
   the bar's buttons keep their width, its sentence giving way (at 960 × 600 the two labels were pressed into their
   borders).
5. **Never in full screen**, so that a room does not see them: the panel stands outside the frame that fills the
   screen; N does nothing in full screen; and going full screen puts the notes away, so that leaving it in front of
   the room does not bring them back — N shows them again.
6. **Not built:** the presenter window; and the next slide's title, which the report named with it and which belongs
   to that view.

**Consequences:** No figure moves and no slide changes. Checked in Playwright on the dev server, Chromium 149 and
WebKit 26.5, Estonian and English. (a) The last commit's app beside the branch's at 1 440 × 900, both computing the
opening state: the twelve slides' markup is equal and every line of text stands in the same place on the stage
(659 lines of text in Estonian and 663 in English in Chromium, 658 and 663 in WebKit; the largest move 0.0001 px),
and the same again with the notes shown; no text leaves the stage. (b) The slide's frame and its scale are equal in the two builds
at seven window sizes from 1 440 × 900 down to 375 × 812. From 800 px of window up the bar is as it was, a button
longer; below 440 px — a width the page is not laid out for (from 960 px, R-UI-3; a phone shows it at 1 280 px, D-149)
— its buttons run past its end by up to 102 px, where the bar of three still fitted. (c) At 1 440 × 900 and
1 280 × 720: the panel starts hidden; N, Shift+N, the button and the space key on it show and hide the note of the
slide shown, each of the twelve its own; the stage keeps its scale (0.675 and 0.508) and the address is untouched;
the note ends inside the window on every slide with the whole frame above it (the tallest note 122 and 146 px);
Ctrl+N is left to the browser and a click on the note does nothing; F with the notes on puts them away, N does
nothing in full screen, leaving it does not bring them back, and N then shows them; another view and back finds them
as left; no page error. `make ci` is green (pytest 152, the app's 220 tests, the five golden cases unchanged on V8 and
JavaScriptCore, the contract, the site check 0 breaches). The notes are new sentences on a public page in the owner's
voice: their wording is the owner's to edit, in `deck.ts` and `et.ts` together (the i18n test holds the two in
step). Slide 12's note, as its slide, invites the room to open energiamudel.ee, which stands behind a password
(D-178): the demo script's caution holds for the note too. N follows F's way of reading the key (`KeyboardEvent.key`):
under a keyboard layout with no Latin letter on that key, Russian's among them, N and F do nothing and the bar's
buttons do. The demo script's step 7b and the Q&A's K57 name the key and the button. Deployed 2026-11-09 09:08–09:11 at the owner's word ("publish", after he had looked at the assembled branch `integration/deck-notes-accuracy`), together with D-223's slide: main fast-forwarded 2326f52 → 6d0787e; the rollback copy of the live da3ef0a is `data/raw-aside/live-da3ef0af0716/`; the manifest equal, the sets compared, none differs; on the live site in Chromium and WebKit, Estonian and English, the thirteen slides' geometry probe finds nothing, each slide shows its own note under N, none in full screen, no page error. The status stays Proposed until the owner signs the wording.

## D-223 · 2026-11-09 · A slide on the model's accuracy in the deck

**Status:** Accepted · 2026-11-10 · signed by the owner: "I sign D-222, D-223, D-225; publish D-230". Proposed 2026-11-09, drafted from the night report's proposal 4
(`docs/research/2026-11-09_night_report.md` §3), which the night wrote up and did not build, the owner having asked that
larger changes be proposed and not made ("Implement the small ones, describe the large ones", D-221). On the branch
`claude/zen-davinci-ca493f`, neither merged nor deployed: both are the owner's acts, and so is the slide's wording — what
the deck says of the model's accuracy is his to word (R-PUB-4, D-123, D-201). Specification revision 2.71 (R-APP-16).
D-222 and revision 2.70 are the deck's speaker notes, the report's proposal 1, proposed the same morning on a branch of
its own: the two branches touch the same files, and whichever is merged second gives the other's new slide its note
or takes this slide's count into its tests.

**Context:** The audience of 10 November will ask how good the model is (the Q&A's §II, K7 to K15,
`spikes/presentation-2026-11/kusimused_ja_vastused.md`), and the deck (D-220) says nothing of the validation. D-201 took
the validation's banner off the pages and kept its words in every export's gate line, on the Calibration view and in the
documents. A slide the speaker turns to is not a banner on every page, but it does put the validation back on a page
that states results, so it is the owner's to accept or to decline; this record does not amend D-201. The figures exist:
`validate_fit` writes each observed year's metrics to `data/derived/validation/<year>.json` (R-VAL-3 to R-VAL-5) and the
Calibration view shows them (R-APP-7).

**Decision (proposed):**
1. **A thirteenth slide, "How accurate is the model?"** (Estonian "Kui täpne on mudel?"), v5's own, on the deck's frame
   (`app/src/ui/deck.ts` `s12`). It stands twelfth, before "Try it yourself", not after "How does the model work?":
   slides 1 to 11 keep the numbers the demo script and the Q&A name (5, 6, 8, 10 and 11), the day before the talk, and
   only the last becomes 13.
2. **The table:** the protocol's hourly mean absolute error of price (R-VAL-3) for Estonia, Latvia and Lithuania in each
   year the thresholds bind in (R-VAL-5; `GATE_YEARS`, 2023 to 2025) and in the part year after them, 2026, under the
   dates its data reach — the first day and the day of the last hour, read from the year file's `meta.hours` ("1 January
   – 30 September" on the data in the repository). A figure above the threshold is red and carries a cross, a sign and
   not colour alone, as the Calibration view marks its breaches; 2026 carries none, having no threshold. The
   diagnostics of 2020 to 2022 stay on the Calibration view.
3. **No figure is typed in.** The page loads the tables as the Calibration view does (one loader for both, `main.ts`
   `evaluations`) when the deck first shows, and takes 2026's hours from the year file the panel's marks load already;
   the slide says "computing…" until both are in, as a slide whose runs are not in does. The threshold is
   `THRESHOLD.maeEurMwh`, the years `GATE_YEARS` and `FIT_YEARS`, the count of figures outside their thresholds the
   Calibration view's (`breaches`), the year not forecast the state's target. A year after the gate's is shown only
   with its reach known, so a part year can never stand as a whole one. A new validation — the freeze — changes the
   slide without an edit.
4. **The sentences, each for the owner's wording.** English keys, Estonian in `et.ts`:
   - *The title and its line:* "How accurate is the model?" — "Past years computed again and compared with the
     market's prices, hour by hour".
   - *The measure:* "AVERAGE ERROR OF THE HOURLY PRICE, €/MWh — how far the model's price of an hour is from the
     market's, on average (the mean absolute error)".
   - *The years:* 2023 and 2024 "parameters fitted on it"; 2025 "no parameter fitted on it" (R-VAL-1) — the narrower
     claim, not "blind year": the Q&A's K10 says that 2025 was watched when changes of the model were chosen. 2026
     carries its dates and no such word: the batteries' Δ is fitted on its battery output (R-STO-9).
   - *The threshold:* "The protocol's threshold in 2023–2025 is 15 €/MWh; ✗ marks a figure above it."
   - *What is compared:* "The model runs each past year again on that year's own fleet, weather, demand, fuel prices,
     transfer capacities and neighbours' prices — never on the Baltic prices it is measured against. Each hour's price
     is set beside the exchange's day-ahead price." The Calibration view's sentence, shortened; "weather" is the demo
     script's word for what a replay takes of the year's weather: the observed output of wind and solar, the Daugava's
     band and the temperature behind the CHP floor (methodology §7.1).
   - *The whole protocol:* "Beside the price error the protocol checks the price duration curve, the share of dear
     hours, generation by technology, net flows and congested hours." (K9's sentence), then the Calibration view's own
     line, "{n} figures of 2023–2025 outside their thresholds; the hourly price error reaches {worst} €/MWh against
     {x}." — 26 and 17.8 against 15 on the tables in the repository — "The Calibration view lists every one.", and, while
     that count is above zero, the gate line's first sentence in bold: "Validation gate not met; released at the
     owner's decision." (R-PUB-4).
   - *Not a forecast:* "The model does not forecast the price of 2035. It shows what the plant changes when everything
     else is the same. The difference between the scenarios is the result; the price level itself depends on the
     assumptions." (K3's words; the year is the state's.)
5. **Left off the slide, the owner's to add or leave:** that the model's average price lay below the market's (K14; the
   tables' `bias`), that it underestimates the dearest hours (K12; `share150`), why 2025 misses (K8), K10's sentence on
   2025, and the EstLink 2 test, which is met (`estlink2.json`, which the deck does not load).
6. **The slide's note, should D-222's speaker notes be merged too:** at index 11 of `NOTES`, before the closing slide's,
   text with no figure and no markup, as that branch's test asks, and the owner's to word like the slide:
   - English: "The model computes the past years again on their own data, and each hour's price is compared with the
     market's. The table shows how far apart the two are on average, by year and by country. The slide says which years
     the model's parameters were fitted on; a red figure is above the protocol's threshold. The price error is one
     measure of several: the validation as a whole does not meet its gate, I accepted it as it stands, and every
     deviation is listed on the Calibration view. None of this makes the scenarios a forecast."
   - Estonian: "Mudel arvutab möödunud aastad nende endi andmetega uuesti läbi ja iga tunni hinda võrreldakse
     börsihinnaga. Tabel näitab, kui kaugel need teineteisest keskmiselt on, aastate ja riikide kaupa. Slaidil on kirjas,
     milliste aastate põhjal mudeli parameetrid sobitati; punane arv ületab protokolli lävendi. Hinnaviga on üks näitaja
     mitmest: valideerimine tervikuna oma lävendit ei täida, võtsin selle vastu sellisena, nagu see on, ja iga
     kõrvalekalle on kirjas vaates „Kalibreerimine“. Stsenaariume see prognoosiks ei tee."
   Placed so where the two meet (the branch `integration/deck-notes-accuracy`, 2026-11-09, at the owner's word to
   assemble them), with the deck test holding the order: the twelfth note is this slide's, the last the closing one's.

**Checks:** The deck test reads the tables as they are committed and finds each year's three figures on the slide in
order, the cross on those above the threshold, the count as `validate_fit` counted its breaches, the gate's sentence
only with a count above zero, a part year's dates (290 days end on 17 October), no cross outside the gate's years, no
row for a year whose reach is not known, and "computing…" without the tables. The night's probe of every fragment of
text (outside the stage, into the footer, overlapping another by more than 2 px both ways, clipped), with one test more,
a box narrower than its text, finds nothing on the new slide in Chromium 149 and WebKit 26.5, English and Estonian, at
1 440, 1 280 and 800 px. Walked over all thirteen slides at 1 440 px in both engines and languages, it finds nothing on
eleven of them, the new slide and the last among them; on slide 4 three year labels' boxes stand 4 px into the next
row's "weighted" label, the ink apart, and on slide 10 the present-value column's heading is 2 to 9 px wider than its
cell and, in Estonian, one total 2 px wider than its own — both the same on the base commit 2326f52, in code this change
does not touch, and left for the owner's eye. The Calibration view draws as before from the shared loader. `make ci` is
green: 152 Python tests, the application's 221, the five golden cases unchanged on V8 and JavaScriptCore, the contract,
the site check with no breach.

**Consequences:** No figure moves; the engine, the data and the validation are untouched. The deck has thirteen slides:
`slide=12` in an address is the new one and `slide=13` the last. Opening the deck fetches the seven year tables, 3 to
4 kB each, the Calibration view's own chunks; the bundle grows by 6.6 kB, to 627. The talk pack's passages on the site's
deck say thirteen on this branch (the demo script's step 7b, the Q&A's K7 and K54, the pack's README). If the owner
declines the slide the branch is dropped and nothing on main changes. Deployed 2026-11-09 09:08–09:11 at the owner's word ("publish", after he had looked at the assembled branch `integration/deck-notes-accuracy`), together with D-222's notes: main fast-forwarded 2326f52 → 6d0787e; the rollback copy of the live da3ef0a is `data/raw-aside/live-da3ef0af0716/`; the manifest equal, the sets compared, none differs; on the live site in Chromium and WebKit, Estonian and English, the thirteen slides' geometry probe finds nothing, each slide shows its own note under N, none in full screen, no page error. The status stays Proposed until the owner signs the wording.


## D-224 · 2026-11-09 · Four texts off the page, LNG in the fuel box, the cards say what is traded

**Status:** Accepted · 2026-11-09 · the owner: "remove from the header the caption: Stsenaarium 2035: 0 SMR — naabrid: TYNDP 2024 Distributed Energy … remove the caption under the tiles: 'Muudetud vaikeväärtustest: …' … remove from the footer: 'Kood AGPL-3.0-or-later … Huvide deklaratsioon. …' … At the end of the presentation remove the text 'Metoodika ja iga allikas … Mudeli lõi Andres Ingerman' … on the left, in the block CO₂- JA GAASIHIND, replace 'Gaas' with 'LNG' … it needs to be specified import of what, eksport of what, saldo of what"; specification revision 2.72 (R-PUB-2, R-APP-16).

**Decision:**
1. The header no longer shows the scenario's line ("Scenario 2035: 0 SMR — neighbours …"); a validation run keeps its
   line, which says the page shows an observed year. The panel shows the scenario and the neighbours' profile.
2. The note under the cards listing what differs from the presets is gone; the panel still marks each changed control
   in amber (R-UI-6) and the JSON export still carries the state.
3. The application's footer is gone: the licences' line and the declaration of interest. README keeps both (R-DOC-8,
   R-PUB-1); R-PUB-2 now asks the declaration of README only.
4. The deck's last slide loses its closing text (the sources' line, the declaration, the author's name); slide 2's note
   no longer says where the declaration stands on the page, only that its place in the talk is before the figures.
5. The fuel box names its gas price *LNG* in both languages (it was *Gas*, *Gaas*); the gas plants' bid keeps its name.
6. The cards name what their trade rows count: *electricity import*, *electricity import cost*, *electricity export*,
   *electricity export revenue*, *electricity balance*, *electricity trade balance* (Estonian *elektri import*,
   *elektri impordi kulu*, *elektri eksport*, *elektri ekspordi tulu*, *elektri saldo*, *elektrikaubanduse saldo*).

**Consequences:** No figure moves; the engine, the data and the sets are untouched. The site no longer carries the
declaration of interest anywhere on its pages; README does. Not deployed.

*Corrected by ERRATA E-185 (2026-11-09, the night's sweep):* the site still states the declaration — the questions and
answers' "Who made it?" (the Documentation view, both languages) carry it in D-193's wording, untouched by this
decision; "anywhere on its pages" above was wrong, and R-PUB-2 reads so since revision 2.74.

*Deployed, with D-225 … D-229,* 2026-11-10 07:41–07:44 at the owner's word ("Yes, deploy it"): main fast-forwarded 2bb480a → 9e4bfa9 (the night's
branch, D-224 … D-229 and E-185 … E-189 with the talk pack), the rollback copy `data/raw-aside/live-6d0787e5a53d/`
(.htaccess left out), the sets 223 years in 123 s (54 files, 29.01 MB), the manifest equal through the SSO cookie, the
live check all equal to the build (bundle index-CKeCdBUi.js, CSS index-CN0Ep1j0.css, worker engine.worker-BTVQODu4.js,
opening 9e4bfa93c332), compare_sets 53 sets with the three replays new and none of the old differing, the offline copy
refreshed, the key's copy deleted; the live page in Chromium and WebKit through the cookie: no footer, no scenario line,
LNG, the list's short line, fourteen slides with the geometry clean and a note to each, no page error.

## D-225 · 2026-11-09 · The neighbours' list: a short line closed, the averages only when open

**Status:** Accepted · 2026-11-10 · signed by the owner: "I sign D-222, D-223, D-225; publish D-230". Proposed 2026-11-09 on the owner's word on the list's line «tyndp2024 / DE (Distributed
Energy): 2035 — 🇫🇮 40 🇸🇪 46 🇵🇱 57»: "propose a more concise version of the caption … Show average prices only when the list is selected". The second half is the owner's word; the short line's wording is proposed.

**Decision:** Each profile's line reads *who made it · its name and year*: "TYNDP 2024 · Distributed Energy 2035",
"TYNDP 2026 · National Trends+ 2035", "Actual prices 2025" (the record needs no maker), "Research · tight case, all at
once 2035"; the profile's code (DE, NT, …) is gone, the name says it. Closed, the list shows this line alone: its own
text is transparent and the short line lies over it (`.sel-over`, `.sel-short`). Open, each option reads as before,
the line and the averages ("… — 🇫🇮 40 🇸🇪 46 🇵🇱 57 €/MWh"). Swapping the options' text on opening was tried and
dropped: a native list says when it opens but not when it closes unchanged, so the averages stayed on the closed list.

**Consequences:** No figure moves. The panel test holds the full option and the short line over the list. A screen
reader reads the full option, the short line being hidden from it.

## D-226 · 2026-11-09 · The neighbours' level sliders snap to the default levels

**Status:** Accepted · 2026-11-09 · the owner, with a picture of the three level sliders, their red marks at ×1:
"place the red lines for the slider's snapping at the values that we have by default".

**Decision:** Each neighbour's level slider has its red mark and its snap at the profile's default level
(`presetLevel`, D-190): on Distributed Energy 2035 the owner's ×1.8786, ×1.9607 and ×2.0982 (75, 90 and 120 €/MWh),
on every other profile ×1 as before. The same levels are the baseline of "changed from the preset" (`baseline`), so
at the opening the three boxes are no longer amber and the scenario text marks no level with `*`; D-182's note that
the opening's levels are listed as changed no longer holds. (The night's sweep, ERRATA E-185: the questions and answers said "the panel lists the levels as
changed"; they now name the factor beside each box. D-193's declaration says the author's assumptions on the neighbours'
prices are "marked as such in the panel": the mark left is that factor, ▲ ×1.88 — put to the owner in the night report.) The arrow and factor beside each box (▲ ×1.88) still say
how far the level stands from the profile as published. The validation's border sliders keep ×1.

**Consequences:** No figure moves; the opening state is the same. The panel test holds each mark's place.

## D-227 · 2026-11-09 · The deck's title asks about the nuclear plant alone

**Status:** Accepted · 2026-11-09 · the owner: "replace 'What happens to the energy system if Estonia builds gas plants or a nuclear plant?' with What happens to the energy system if Estonia builds a nuclear plant?".

**Decision:** Slide 1 of *Presentation 2* asks "What happens to the energy system if Estonia builds a nuclear plant?"
(Estonian "Mis juhtub energiasüsteemiga, kui Eesti ehitab tuumajaama?"). The four scenarios share one base with all
its gas and differ only in the units (D-151), so the gas plants are not a choice the deck compares.

**Consequences:** No figure moves.

## D-228 · 2026-11-09 · The deck's demand row shows its growth from 2025

**Status:** Accepted · 2026-11-09 · the owner, with a picture of slide 5 ("Four scenarios for 2035"): "add the growth in consumption compared with 2025".

**Decision:** Slide 5's demand row carries each zone's growth mark beside its TWh, as the capacity rows do (D-221):
the scenario's demand (`demandTwh`, the base load weighted over the climate years times the multiplier, plus the
constant load) against the observed load of 2025, the sum of the year file's hourly load — the same full year the
panel's demand mark compares with (D-057). The mark is the slide's own (a green disc and arrow up, grey down; a factor
from ×10). The page passes the load as `load2025` beside `fleet2025`; until the reference years load, the row shows
the TWh alone. The slide's legend "= growth from 2025" covers the new marks.

**Consequences:** No figure moves. The deck test holds the marks against a load it sets.

## D-229 · 2026-11-09 · A slide of the past years beside the market, Estonia

**Status:** Accepted · 2026-11-09 · the owner, with a picture of the Model view's four charts of the replay of 2025
(energy sources, price duration curve, monthly average and median price): "let's make a slide about validation on which to show the years with these charts for Estonia"; specification revision 2.73 (R-APP-16).

**Decision:**
1. *Presentation 2* gains a slide after the accuracy slide (D-223), the thirteenth of fourteen; "Try it yourself" is the
   fourteenth. Title "Past years: model and market" ("Möödunud aastad: mudel ja turg"); the subtitle gives the year's
   hourly price error for Estonia from the validation's table, as the accuracy slide reads it.
2. Four charts of Estonia, drawn as SVG for the stage (`deck.ts` s13): the energy sources of the model's replay and of
   the market's record, a stacked bar each in the Model view's group colours with the TWh in each segment and the
   total; the price duration curve, cut at 400 €/MWh with the hours above it counted for each; the monthly average and
   the monthly median price (`charts.ts` `monthly`, now exported). The model's line is solid, the market's dashed.
3. Buttons 2023, 2024 and 2025 on the slide choose the year; the gate's years, each a whole year of record. The slide
   stays in place; the address keeps the slide, not the year (2025 when the page opens).
4. The replays are the Model view's validation runs (`replayState`), independent of the scenario shown; the market's
   side is the year's validation file (`actualOf`). The build computes the three replays with its sets (`opening.ts`),
   so the live site shows a year at once; without them (the dev server) the page computes the year, about a minute.
   The page asks for the year once the slide or one next to it is shown.
5. A speaker note in both languages, no figure in it, placed at the slide's own index.

**Consequences:** No figure of the model moves; three sets more on the site. The demo script (step 7b), the talk pack's
README and the README name the slide; the closing slide is now 14. Checked in Playwright, Chromium and WebKit,
Estonian and English, at 1 440 × 900: the geometry probe finds nothing on 2025 and on 2023 after its button, the
slide number stays 13 / 14, no page error.

*Deployed, with D-224 … D-228,* 2026-11-10 07:41–07:44 at the owner's word ("Yes, deploy it"): main fast-forwarded 2bb480a → 9e4bfa9 (the night's
branch, D-224 … D-229 and E-185 … E-189 with the talk pack), the rollback copy `data/raw-aside/live-6d0787e5a53d/`
(.htaccess left out), the sets 223 years in 123 s (54 files, 29.01 MB), the manifest equal through the SSO cookie, the
live check all equal to the build (bundle index-CKeCdBUi.js, CSS index-CN0Ep1j0.css, worker engine.worker-BTVQODu4.js,
opening 9e4bfa93c332), compare_sets 53 sets with the three replays new and none of the old differing, the offline copy
refreshed, the key's copy deleted; the live page in Chromium and WebKit through the cookie: no footer, no scenario line,
LNG, the list's short line, fourteen slides with the geometry clean and a note to each, no page error.

## D-230 · 2026-11-10 · Room between the weather slide's rows; the outage list in the page's language

**Status:** Accepted · 2026-11-10 · signed by the owner: "I sign D-222, D-223, D-225; publish D-230". Proposed 2026-11-10 from the night's checks (`docs/research/2026-11-10_night_report.md` §3); built
on the branch `night/2026-11-10-proposals`, on top of the night's branch, so that the night's branch can go out without it.

**Context:** The night's geometry probe, run for the first time on slide 4 in its full state (its "computing…" is an SVG
text the earlier checks did not wait for), finds each row's lowest-year label standing on the next row's weighted label:
"1995 · 100,4" right above "kaalutud 96,2", three times, their boxes overlapping by 3–5 px of the stage at every window
size, and the last row's labels on the axis line. The Estonian sweep finds four words of the validation run's outage list
in English: "planned", "outage", "MW left", "of".

**Proposal:**
1. Slide 4's rows 96 px apart (88), the year labels 34 px under a row (40) and the weighted label 30 px above it (28); the
   top block a little tighter (the years' chips 100 px high, the arrows 34 and 38 px, the bar from 140, the heading at
   308) so that the axis and its labels keep inside the stage. The figures and their sources are untouched.
2. The outage list's words through the dictionary: *plaaniline*, *katkestus*, "{x} MW alles", "{a} MW {b}-st"; the
   publishers' reasons stay as published. The wording is the owner's to confirm.

**Checked:** Chromium and WebKit on the dev server, Estonian and English, 1 440 × 900 and 800 × 600: the fourteen
slides' probe finds nothing, slide 4 included; the gap between a row's year labels and the next row's weighted label is
9 px of the stage (−3 before). No figure moves; the deck, links and i18n tests green.

*Deployed* 2026-11-10 11:15–11:19 at the owner's word ("publish D-230"), with the signatures of D-222, D-223 and
D-225: main a53ff34 (D-230 taken onto main from `night/2026-11-10-proposals`), the rollback copy
`data/raw-aside/live-9e4bfa93c332/` (.htaccess left out), the sets 223 years in 139 s (54 files, 29.01 MB), the manifest
equal, the live check all equal to the build (bundle index-IcaKtXGL.js, worker engine.worker-DFSFDy-2.js, opening
a53ff34540da), compare_sets 53 sets, none differing, the offline copy refreshed, the key's copy deleted; the live page in
Chromium and WebKit through the cookie: fourteen slides with the geometry clean and a note to each, no page error.

## D-231 · 2026-11-10 · The owner's levels marked as such under the level sliders

**Status:** Accepted · 2026-11-10 · the owner, on the night report's question of D-193 (§4): "on D-193 add a line".
Specification revision 2.75 (R-BND-5).

**Context:** D-193's declaration says the author's assumptions are each marked as such in the panel. Wind's and solar's
opening values carry a line "the owner's value for the opening"; since D-224 and D-226 the neighbours' levels carried only
their factor beside each box (▲ ×1.88), which a reader may take for any moved slider's.

**Decision:** On the profile whose default levels are the owner's (Distributed Energy 2035, `presetLevel`), a line under
the three level sliders: "the owner's levels for the opening; the profile as published averages 39.9 / 45.9 / 57.2 €/MWh"
(ET "omaniku hinnatasemed algvaate jaoks; avaldatud profiili keskmised 39,9 / 45,9 / 57,2 €/MWh"), the averages read from
the profile's own records (`mean_price`). Every other profile, at ×1, has no line.

**Consequences:** No figure moves. The questions and answers name the line in both languages. Checked: panel and i18n
tests green, the line under Poland's slider on the dev server in Estonian.


*Deployed* 2026-11-10 12:07–12:11 at the owner's word ("Yes, deploy it"): main 1a4fe28, the rollback copy
`data/raw-aside/live-a53ff34540da/` (.htaccess left out), the sets 223 years in 121 s (54 files, 29.01 MB), the manifest
equal, the live check all equal to the build (opening 1a4fe28e3f26), compare_sets 53 sets, none differing, the offline
copy refreshed, the key's copy deleted; the live page in Chromium and WebKit through the cookie: the line under the level
sliders as decided, fourteen slides with the geometry clean and a note to each, no page error.

## D-232 · 2026-11-10 · One store of sets for every page, by what each computes from

**Status:** Accepted · 2026-11-10 · signed by the owner the same day, asked whether he signs D-232 … D-237: "yes, all six". Proposed that day on the owner's word: "start a research into
how to make the page faster. In particular the many places where the system computes its results anew each time though
the user has changed nothing. It is more logical, where the inputs have not changed, to keep them and answer at once".
Built on the branch `research/page-speed`; merged and deployed only at the owner's word. The research and its
measurements: `docs/research/2026-11-10_page_speed.md`. On R-ENG-7; specification revision 2.76.

**Context:** The page kept what it computed in three places that did not know of each other: the 24 sets last computed,
in its memory (D-134); in the browser's store the newest twelve tables of four scenarios and twenty-four sensitivity
sets (D-126, D-128); and the build's files for the opening state (D-126, D-129). Since D-184 a state has sixteen
sensitivity sets, so the store's twenty-four held one state and a half; the presentation's blocks (D-177), the deck's
outages (D-220) and a validation run's year were written to no store, and one state's table and sensitivities fill the
memory's 24. Measured on the site as deployed (a headless Chromium on this Mac, seven workers), with nothing asked that
the page had not computed before:

| The reader | The page | Time |
|---|---|---|
| returns to a value two changes back | computed 48 years of sensitivities again | 24 s |
| returns to a changed state on the Presentation page | computed 40 years of its blocks again | 16–18 s |
| loads the Presentation page again on a changed state | computed the 40 years again | 17–20 s |
| loads the deck's cables' slide again on a changed state | computed 24 years of its outages again | 14.5 s |
| switches to a validation run, or loads the page again on one | computed the year, which the site holds (D-229) | 0.7–1.1 s |
| returns to the opening state | fetched 12 to 16 of the build's files again and decoded them | 4–9 MB, 0.4–0.8 s |

**Proposal:**
1. Every set the page shows — the table's four, the sensitivities, the presentation's blocks, the deck's outages and
   replays, a validation run's year — is asked of one store by what it computes from (`jobKey`, D-134): the page's
   memory, then this browser's store, then the build's files under their ids as before, and only then computed; a set
   computed is kept in both (`main.ts` `kept`, `known`, `runSet`, `computeSet`).
2. The page's memory keeps the sets last used up to 96 MB of their arrays, 32 MB on a phone (`stored.ts` `Lru`,
   `bytesOf`): a set of three years weighs 0.66 MB, a state with every page shown forty-four sets. This supersedes
   D-134's twenty-four sets.
3. The browser's store keeps each set under the build, the export's hash and the set's job, with when it was last used
   and its bytes beside it; the longest unused go beyond 192 MB, and the sets of another build at the first write
   (`stored.ts` `recall`, `remember`, `excess`; the database's version 3, a store of version 2 dropped, its sets
   computed again once). This supersedes D-128 item 5 (twelve tables and twenty-four sensitivity sets) and D-127 item 5
   (a table kept only when its four scenarios are in): a set is kept when it is in.
4. A validation run's year is read from the store and from the site's replays (D-229) before it is computed; its
   status line then says where the year came from.
5. Left as it is, measured: a scenario shown while its sensitivities compute drops the years in flight (three years,
   12 of the change's 257 worker-seconds); and the same set asked for twice at once is computed twice, which can only
   happen when an outage the deck's slide shows is already set in the panel.

**Consequences:** No figure moves: a set read from the store is the set the engine computed, array for array, and the
build's 53 sets equal the deployed site's (`compare_sets`). On the branch a value two changes back shows in 0.2 s with
nothing computed (48 years, 24 s); the Presentation page on a changed state it has seen in 0.5 s (40 years, 16–18 s),
and loaded again in 1.1 s (17–20 s); the deck's cables' slide loaded again in 0.2 s (14.5 s); a validation year the
site holds in 0.2 s (0.7 s), and after a reload in 0.5 s (1.1 s); the opening state comes back with nothing fetched.
The same in WebKit. A state never seen is computed as before: the table after 4.3–4.9 s, the sensitivities after
27–31 s. A browser holds at most 192 MB of sets (47 MB until now at its fullest); a browser that refuses the room
keeps nothing, and the page computes. Checked in Chromium and WebKit: a store of version 2 is dropped and opened as
version 3; a year computed is kept and read back after a reload. Tests: `stored.test.ts` (the memory's and the
store's budgets), the journeys of `spikes/page-speed/`.

## D-233 · 2026-11-10 · The sensitivities wait behind the sets of the page shown

**Status:** Accepted · 2026-11-10 · signed by the owner with D-232 ("yes, all six"); proposed that day from the same
research and on the same branch. On R-ENG-7, R-NFR-2; specification revision 2.76.

**Context:** The standard sensitivities are shown on the Model view alone. They ran at the pool's priority 1, the
presentation's blocks and the deck's outages at 2, whatever page was shown: a control moved on the Presentation page
(D-180, D-181) computed the table's 12 years, then 48 years of sensitivities nobody on that page sees, and only then
the 40 years of its blocks. Measured: the page whole after 49.4 and 55.2 s; and with the deck's cables' slide shown,
after a control moved in the panel, the slide whole after 47.6 s.

**Proposal:** While another page than the Model view is shown, the sensitivities' jobs wait at priority 2.9: behind the
presentation's blocks, the deck's outages and replays and the adequacy tab's samples, ahead of the warm-up alone. A
change of page moves the jobs still queued (`pool.ts` `shift`); a year already started ends at the priority it was
given. On the Model view they run at 1 as before. The deck's replays go from 3 to 2.5, ahead of them.

**Consequences:** No figure moves: the order of the jobs changes, not what a job computes (`split.test`). A control
moved on the Presentation page shows the page whole after 18.4 and 19.8 s (49.4 and 55.2 s), the deck's cables' slide
after 15.0 s (47.6 s); the sensitivities are in after 41–45 s (32–35 s), kept, and there when the reader goes back to
the Model view. Test: `pool.test.ts`.

## D-234 · 2026-11-10 · The adequacy tab keeps the samples it computed

**Status:** Accepted · 2026-11-10 · signed by the owner with D-232 ("yes, all six"); proposed that day from the same
research and on the same branch. On R-APP-8, R-LINK-7.

**Context:** A sample is drawn from the seed, the year and its own number and computed from the settings (R-LINK-7:
seeded, reproducible). Run pressed a second time with nothing changed computed its 60 samples again: 22.5 s.

**Proposal:** The page keeps, in its memory, the samples of the last four settings sampled, by what each is drawn and
computed from: the settings that decide the dispatch, the seed, the long failures' settings, the year and the sample's
number (`main.ts` `aqDone`). Run takes a sample kept and computes the others: pressed again without a change it
computes nothing; for more samples, the new ones.

**Consequences:** No figure moves: a sample kept is the sample computed. Run pressed a second time shows its 60
samples at once (22.5 s). Nothing is kept beyond the page's life.

## D-235 · 2026-11-10 · The Presentation page draws again only the part that changed

**Status:** Accepted · 2026-11-10 · signed by the owner with D-232 ("yes, all six"); proposed that day from the same
research and on the same branch. On R-APP-15, R-UI-5.

**Context:** Each set that came in — sixteen for the page's four other profiles — drew the whole page again: five
blocks, fifteen charts, twenty duration curves each sorted from a set's 26 280 hours, about 270 ms a time. Measured:
4.2–4.4 s of long tasks on the main thread while the blocks came in, 0.32 s every time the page was shown again with
nothing changed, 0.95–1.44 s when first shown.

**Proposal:**
1. The page is written in parts — the sliders with the capital cost, the inputs, a block per neighbours' profile, the
   notes at the foot (`presentation.ts` `presentationParts`) — and a part whose markup and sets are as they were when
   last drawn is left as it stands; a block that changed is replaced with its three charts (`main.ts` `drawPres`,
   `redraw.ts` `swap`, which keeps the focus as `redraw` does). The page is drawn whole when first shown, when a part
   comes or goes, and for print.
2. A set's duration curve is kept with the set (`charts.ts`).

**Consequences:** No figure moves. Long tasks while the blocks come in 0.5–0.7 s (4.2–4.4 s); none when the page is
shown again (0.32 s); first shown, whole after 0.44–0.50 s with D-236 (1.5 s). Checked in Chromium and WebKit: the
fifteen charts hold their drawings and fit their boxes after the page is hidden and shown again and after the window is
narrowed while it is hidden.

## D-236 · 2026-11-10 · The build's sets as packs of the arrays' own bytes

**Status:** Accepted · 2026-11-10 · signed by the owner with D-232 ("yes, all six"); proposed that day from the same
research and on the same branch. On R-ENG-7, R-NFR-4, R-DEP-4.

**Context:** The build wrote each set as JSON text, a typed array as a list of its numbers, gzipped (D-126). The page
read it back through a reviver called for every number: 0.38 s of the main thread for the opening view's 17.8 MB of
text, 0.74–0.77 s for all it reads when it opens — more than half of the 1.1–1.3 s the opening view took — and
0.4 s for each of the presentation's and the deck's files.

**Proposal:**
1. A set is written as a pack (`stored.ts` `pack`, `unpack`): the magic "EMR1", the length of a header, the header —
   the set as JSON, each typed array replaced by its type, its place and its length, every other number exact as
   before — and after it the arrays' own bytes, each at a multiple of its element's size, little-endian; gzipped as
   before. The page reads a pack or the JSON form by the file's first bytes (`read`).
2. The files are `data/opening.bin.gz` and `data/sets/<n>.bin.gz`; the list of the sets, `data/sets.json.gz`, stays
   JSON. `.htaccess` revalidates `.bin.gz` as it does `.json.gz` (R-DEP-4). `compare_sets` reads both forms, so a build
   can be compared with a site deployed before this.

**Consequences:** No figure moves: the 53 sets of the branch equal the deployed site's through the change of form
(`compare_sets`: none differs). The opening view's file 1.61 MB (2.82), its twelve sensitivity files 2.43 MB (4.21),
all the build's sets 18.2 MB (29.0, against a cap of 35). Reading the opening view 4 ms (380 ms); the cards 0.28–0.43 s
after the navigation (0.56–0.68 s), in WebKit 0.27–0.47 s (0.50–0.55 s). A machine that is not little-endian reads no pack, and its page computes. Test:
`stored.test.ts` (a pack keeps the arrays' types and bytes, NaN's too, and every number; a pack and the JSON form read
alike).

## D-237 · 2026-11-10 · A set is valid for the sources that compute it; the development server keeps its sets

**Status:** Accepted · 2026-11-10 · signed by the owner with D-232 ("yes, all six"); proposed that day from the same
research and on the same branch. On R-ENG-7, R-NFR-5; specification revision 2.76. It supersedes D-126 item 3 in
what a set is kept under (the commit) and in "a development build keeps nothing".

**Context:** A set kept in a browser, and a set the build computed, was read only for the build's commit (D-126). So
every deploy emptied every reader's store, whether or not it touched what computes a set — three deploys on 10 November,
each of the interface alone — and a development build, whose tree is seldom a commit, kept nothing: every load of the
development server computed its 60 years, 35–39 s, and the Presentation page and the deck theirs. What a set depends on
is narrower than the commit: the sources that compute it, the data, and its job.

**Proposal:**
1. The engine id (`app/scripts/engine_id.ts`): a hash of every source file under `src/adequacy`, `src/contract`,
   `src/data`, `src/engine`, `src/state` and `src/worker` — the engine, the worker with its job, pool and view, the
   state and its text, the store, the contract's types, the sampler — of the scenario schema and of the solver's
   version as `package-lock.json` pins it. The build gives it to the page (`vite.config.ts`, the module
   `virtual:engine-id`) and writes it into the opening view's file and the list of the sets.
2. The page reads the build's files only for its engine id, and keeps its own sets under the engine id, the export's
   hash and the job (D-232's key with the id in the commit's place). The export's hash is the opening view's or, where
   the site has none, the manifest's.
3. The development server keeps its sets as the site does. An edit under the id's directories gives the page a new id
   and loads the page again (`vite.config.ts`), so that it never shows a set the old sources computed.
4. `test/engine_id.test.ts` finds every import of the worker, the pool, the store and the job's key — type-only ones
   too — among the id's files, and the solver the one package they name: a source outside them fails the test. To that
   end the worker no longer imports the interface: a year's result and its labels moved to `worker/assemble.ts`, the
   outage file's shape and masks to `worker/outages.ts` (the interface's modules name them as before), and the page,
   the build and the tests put a set together in one place (`assemble.ts` `setOf`).
5. `?nostore` in the page's address keeps nothing and reads nothing kept.

**Consequences:** No figure moves. A deploy that leaves the id's files as they were keeps every reader's sets, and its
own sets' validity is what it was: the files are written by every deploy. The development server's second load shows
the cards after 0.26 s with nothing computed (60 years, 35–39 s). Checked on the development server: with an engine
file edited the next load computed its 60 years and kept them under the new id; edited while the page was open, the
page loaded again and computed; the edit undone, the id was the first one again. The worker's script is 156 kB (299 kB:
the Estonian dictionary was in it) and no longer changes with the interface's texts. The risk it carries is a source
that moves a set from outside the id's files; the test, the build's comparison of its sets with the site's at every
deploy (`compare_sets`) and `?nostore` stand against it.

*Deployed, D-232 … D-237,* 2026-11-10 15:39–15:42 at the owner's word ("Yes, deploy it"): main fast-forwarded f078d33 →
3e26bb7 (the branch `research/page-speed`), the rollback copy `data/raw-aside/live-1a4fe28e3f26/` (.htaccess left out),
the sets 223 years in 111 s (54 files, 18.20 MB as packs; 29.01 MB before), the manifest equal, the live check all
equal to the build (bundle index-C4kc6qKl.js, worker engine.worker-CNZZxg9d.js, opening 3e26bb76b1a0 under the engine id
e074a39a847c; the old form's files gone from the site), compare_sets 53 sets through the change of form, none
differing, the offline copy refreshed, the key's copy deleted; the live page in Chromium and WebKit through the cookie:
the opening view from the build's packs (13 files, 4.05 MB, none in the old form; 7.03 MB before), the validation year
2025 from the site's replays without a run, 2026 computed by the live worker, kept, and read back after a reload ("in
this browser before"), the store's version 3, fourteen slides with the geometry clean and a note to each, no page error.

## D-238 · 2026-11-10 · The page's waits have limits; the built site is checked in browsers

**Status:** Accepted · 2026-11-10 · the owner, asked after ERRATA E-191 what was left to do, and given a list — an
independent review of the day's commits, the browser checks into the repository, the page's other waits without a
limit —: "go ahead". On R-ENG-7, R-NFR-8.

**Context:** E-191 was a wait without a limit — for a browser's store — and reached the site because `make ci` has no
browser: Node has no page, no workers and no IndexedDB, and the checks that would have shown it were written that day
in a session's scratch folder. Two more waits of the same kind stood in the page: a job a worker never answers — a
browser puts a worker down without a word when a phone runs short of memory — left its table at "computing…" for
ever; and a file of the build's sets that never arrives held up what it would have spared.

**Decision:**
1. *A worker that does not answer is given up* (`pool.ts` `JOB_MS`, `silent`): a job unanswered for 120 s fails, saying
   so — the status line shows "The run failed: a worker did not answer in 120 s and was given up" — its worker is let
   go of and gets no other job, and an answer that comes after all is not read. The other workers go on; with none
   left every job fails with "no worker is left: load the page again". The build's and the bench's Node pool waits 30
   minutes: no reader waits there, and a build must not drop a year on a loaded machine.
2. *A file of the build's sets that has not come in 30 s is done without* (`stored.ts` `FILE_MS`): the page computes,
   as it does where the site holds no such file.
3. *The built site is checked in browsers* by `make browser-check` (`spikes/page-speed/browser_check.py`): the site
   built with its sets, served under the site's own caching, in Chromium and WebKit — a store that never opens and one
   whose requests never answer (E-191), the store's round trip (a year the site holds without a run; a year it does
   not hold computed once, kept and read back after a reload; `?nostore`), the Presentation page's fifteen charts
   after it is hidden and shown and after the window is narrowed, and no page error. It needs a Python with
   Playwright (`PLAYWRIGHT_PYTHON`), which is no dependency of the repository, so it is not part of `make ci`: it is
   run before a deploy that touches the page's store, its workers or its sets.

**Consequences:** No figure moves. A reader whose worker dies sees an error after two minutes instead of "computing…"
without end, and the next change computes on the workers left. Tests: `pool.test.ts` (a silent worker given up, the
others going on, a late answer not read, the last worker lost), `stored.test.ts`; `make browser-check` passes in both
engines.

*The review's findings* (the same day; an independent reading of the commits of D-232 … D-237 and E-191, asked to
look for a wrong or stale result first, then for a wait without end, then for races). Fixed with this record:
1. *A set kept under another state's job* (`main.ts` `runSensitivities`): an older call, superseded while the store
   answered, asked the build's file by the newer call's settings and kept it under its own job, so that back on the
   first state the sensitivities' table could show the other state's figures for the life of the page. A window of
   tens of milliseconds, not seen to happen. The file is now asked for by the call's own settings, and kept only while
   the call is the latest.
2. *A year computed without its outage file, kept* (`engine.worker.ts`): a what-if on EstLink 1 or 2 in a validation
   run reads the year's outage file; a file that did not load read as "the year has none", and since D-232 that year
   was kept in the browser. A file that is not there (404) still reads as none; one that fails to load fails the job.
3. *The Presentation page out of step with its sliders* (`main.ts`): what the sliders' handler writes into the page —
   the figure beside a slider, each block's levels — was not what `drawPres` remembered having drawn (D-235), so a
   control moved there and set back on the Model view could show the pointer's value over the state's results. The
   handler's writing makes the next drawing one of every part; `browser_check.py` checks the case.
4. *A year's later clearings not moved with the sensitivities* (`pool.ts` `shift`): the move of D-233 reached the
   queued jobs alone, so a year started behind another page's sets ended there after the reader was back on the Model
   view. The pool now keeps a tag's place for the jobs asked for from then on.
5. *A block left at "computing…"* (`main.ts` `loadTrio`): a block whose sets a new run superseded was asked for again
   only when the page was next drawn, which could be never; it is asked for again at once.
6. *A full store that stayed full* (`stored.ts` `remember`): a write refused for want of room undid the dropping of the
   oldest with it; the store is emptied then, and fills again.
7. *A set's file named by its number* (`opening.ts`): a page that read the list of the sets before a deploy and asked
   for a file after it got whatever then had that number. A file is named by a hash of the sources' id, the export
   and the set's id, so that the page gets the same set or none.
8. The manifest the store's key may need is waited for 30 s at the most.

Left as they are: a single reading slower than the store's 1.5 s turns the store off for the page's life (the page
then computes); the progress line appears once the store and the build's files have answered, not before.

*Deployed, D-238,* 2026-11-10 20:24–20:28 at the owner's word ("Yes, deploy it"): main daa8fd0, the rollback copy
`data/raw-aside/live-691400b56750/` (.htaccess left out), the sets 223 years in 129 s (54 files, 18.20 MB, named by
what they hold), the manifest equal, the live check all equal to the build (opening daa8fd01b224 under the engine id
dfdf1e78c142), compare_sets 53 sets, none differing, the offline copy refreshed, the key's copy deleted; the live page
in Chromium and WebKit through the cookie: the opening view from the build's sets, a validation year from the site's
replays, a year computed there kept and read back after a reload, with a store that never answers the sensitivities
in after 2.2 and 2.6 s, fourteen slides clean, no page error. Playwright's WebKit was slow that evening (the opening
view after 9 s, a year in 22 s), as it was for the build before.

## D-239 · 2026-11-10 · Where a set comes from is a module of its own, with its tests

**Status:** Accepted · 2026-11-10 · the owner, told after D-238 that one large debt was left — the store's logic
lived in `main.ts`, the page's own module, where no unit test reaches it —: "go ahead". On R-ENG-7,
R-NFR-8.

**Context:** What decides where a set comes from — the page's memory, the browser's store, the build's files, a run —
and what each asker may keep was written into `main.ts` among the page's drawing (D-232, D-238). ERRATA E-191 and the
first of D-238's findings were both in that logic, and both were found by other means than a test: `make ci` has no
page, and `main.ts` cannot be loaded without one.

**Decision:** The logic moves to `app/src/data/sets.ts`, which knows neither the page nor IndexedDB: `Sets` — the
page's memory with the store behind it (`keep`, `peek`, `kept`, `put`), and `found`, the lookup of an asker that may
be superseded while the answers come — and `known`, the sets of a state when all of them are had: the opening view,
the memory and the store, the build's file. `main.ts` gives them the store's key, the store's reading and writing and
the build's files, and keeps what is the page's: which state is asked for, and the words of the status line.
`test/sets.test.ts` asks them with a Map for a store and functions for files: a set computed is written once and read
back by a later page; without the store's key nothing is written or read; the memory lets go by bytes and the store
still has it; a state is known only when all its sets are, the answer the browser's when one of them is; a superseded
asker keeps nothing.

**Consequences:** No figure moves and the page behaves as before: the 53 sets equal the site's, `make ci` and `make
browser-check` pass. The module lies under the engine id's directories (D-237), so the id changes with it.

*Deployed* 2026-11-10 21:49–21:53 at the owner's word ("Yes, deploy it"), D-239 and ERRATA E-192 together: main
e28f219, the rollback copy `data/raw-aside/live-daa8fd01b224/` (.htaccess left out), the sets 223 years in 117 s (54
files, 18.20 MB), the manifest equal, the live check all equal to the build (bundle index-BPwBVHv2.js, opening
e28f2193cad5 under the engine id 1de529a3a34f), compare_sets 53 sets, none differing, the offline copy refreshed, the
key's copy deleted; the live page in Chromium and WebKit through the cookie: a year computed there kept and read back
after a reload; with a store that never answers the sensitivities in after 2.0 and 2.2 s; with a store that opens
three seconds late a year computed after it is kept; fourteen slides clean, no page error.

## D-240 · 2026-11-12 · The deck as the owner reviewed it: thirteen slides, the model's own map on the second

**Status:** Accepted · 2026-11-12 · the owner's list of edits to *Presentation 2*, slide by slide ("slide number 2 / remove the subheading 'eesti elektrituru järgmine...' …"). The list names a slide by its number and by its words; where the two
disagree the words are followed: its "slide 4" and "slide 5" are the fifth and the sixth («Sama tarbimine…»,
«KOGU EESTI MAJANDUS»), and the title «Kui täpne on mudel» goes to the past years' slide, the thirteenth until now, which
followed the accuracy slide the list takes out — the fourteenth is the closing slide, «Proovige ise». On R-APP-16.

**Context:** The deck is v3's twelve press slides with v5's figures (D-220, D-221), its notes (D-222), the accuracy
slide (D-223) and the past years beside the market (D-229), fourteen slides. The owner reviewed it after the talk of
10 November.

**Decision:**
1. The second slide (why another model) has no subtitle. Its second point says what the solutions on the market cost
   today, "tens, hundreds of thousands of euros" — tens to hundreds of thousands of euros, the owner's statement — in place of the two
   paths, gas plants or a nuclear plant. Its picture is the panel's map of the lines (`panel.ts` `linesSvg`, the Links
   box's own: the land, the zones' nodes and flags, each line the state runs with and its streaks), in place of v3's
   schematic of the zones; a line switched off is left out, nothing on it switches, and its gradients are named apart
   from the panel's, which the page holds at the same time.
2. The third (how the model works) has no subtitle; its real data name the installed capacity and the bids, no longer the
   capacity factor; the flows with the neighbours move from the result's box into the simulation's.
3. The fourth (the weather years) no longer says that no single year is "the price of 2035", and its marks are gone.
4. The fifth (the four scenarios) has no subtitle and no factory before "in all four scenarios"; each zone's figures are a
   column of their own width, so that the flags stand under each other.
5. The sixth (the price gap) holds the scenarios' names under its bars, which its chart cut by 7 px; "the whole Estonian
   economy" and "one household" are as bold as their figures; the economy's line is the calculation alone, without
   "= the electricity bill's saving against gas".
6. The eighth names the EstLink cables, not the Finnish cables, in its title and its note.
7. The accuracy slide is taken out. The past years' slide is titled "How accurate is the model?", its subtitle the
   year's hourly error as before, and its note says what the accuracy slide's said: the price error is one measure of
   several, the validation as a whole does not meet its gate and was accepted as it stands, every deviation is on the
   Calibration view, and none of it makes the scenarios a forecast.

**Consequences:** No figure moves; thirteen slides, the closing one the thirteenth. The deck no longer shows the
protocol's count of figures outside their thresholds and the gate's state (R-PUB-4's "each release states the
validation beside its figures"): they stay on the Calibration view and in the exports' gate line, where D-201 put
them, and the past years' slide's note says them aloud. The second point's figure is the owner's and the slide gives no
source for it. The deck's tests count thirteen slides, and a test holds the map: no switch, a line switched off left
out, its streaks' gradients its own. Specification revision 2.77.

*Deployed* 2026-11-12 10:31–10:37 at the owner's word ("Yes, deploy it"): main 68f6fd4, the rollback copy
`data/raw-aside/live-919eb3bad0de/`, the gate green (pytest 154, the application's 236, the golden fixture unchanged in
V8 and JavaScriptCore, `db.check --fast`), the sets 223 years in 108 s under the engine id 1de529a3a34f, compare_sets 53
sets with none differing, the manifest equal and all 142 files served as built, 401 without the password or the
cookie, the offline copy made, `make live-check` passed in Chromium and WebKit. The deck on the site in both engines:
thirteen slides, the second without its subtitle and with the map, the eighth's and the twelfth's titles the owner's.
The map left out Harmony Link, in service in 2035 (ERRATA E-197).

## D-241 · 2026-11-12 · The second slide's three points in the owner's words

**Status:** Accepted · 2026-11-12 · the owner on *Presentation 2*'s second slide: "first point, a solution is needed that can quickly test different energy mixes and their effect on the price. second point, it is worth specifying that this is about software for modelling energy systems. in the third point it is worth noting that the model must calculate the three countries at once, since we are one market", and then "swap points 2 and three". On R-APP-16; it supersedes D-240's item 1 where that item
words the second point.

**Decision:** The second slide (why another model) says: 1. a solution is needed that can quickly test different energy
mixes and their effect on the price — in place of Estonia's need for dispatchable capacity beside wind and solar; 2.
the Baltic electricity market is one whole, so the model has to compute Estonia, Latvia and Lithuania at once — in
place of "Estonia's price cannot be computed apart from Latvia and Lithuania", and second where it stood third; 3.
energy system modelling software on the market today costs tens to hundreds of thousands of euros — D-240's second
point, now naming what costs it, and third. The Estonian says «energiamiks», the word the Model view's capital cost
uses.

**Consequences:** No figure moves; the slide's speaker note stands as it is.

## D-242 · 2026-11-12 · The third slide shows the panel's own controls

**Status:** Accepted · 2026-11-12 · the owner on *Presentation 2*'s third slide: "add design elements from the real model. illustrating. the consumption slider, the installed capacity sliders and the cable switching toggles". On R-APP-16.

**Decision:** Under the pipeline of the third slide (how the model works), moved up to the body's top, a band titled
"The panel: assumptions you can change" draws three of the panel's sliders and four of its line switches as the panel
holds them for the state shown (`panel.ts` `panelControls`): Estonia's demand — its multiplier on the panel's range of
0.5–2, the preset 1, the box giving the year's demand in TWh as the fifth slide reads it — and its onshore wind and solar,
each slider's value, preset and top by the panel's own rule (twice the preset, a fifth over the value, at least
2 000 MW); and the first four lines of the panel's list, EstLink 1 to 3 and the Estonia–Latvia lines, each switch on or
off with the line's MW. They are drawn in the panel's design at the stage's size — the track filled up to the knob, the
preset a red dashed line, the number in its box, a switch green "ON" or red "OFF" — and nothing on them can be pressed.
A dashed arrow takes the band into the simulation's box.

**Consequences:** No figure moves. The slide's controls change with the panel: a slider moved or a cable switched on the
panel shows on the slide, as every figure of the deck follows the runs and the state shown (D-220). The panel's rule for
a source's top is one function the panel and the slide share. Specification revision 2.78.

## D-243 · 2026-11-12 · Slides 4 to 6 as the owner trimmed them

**Status:** Accepted · 2026-11-12 · the owner on *Presentation 2*: "on slide 4 remove the right panel. entirely. / on slide 5 put the percentage badges, the arrows in a column, aligned one under another. / on slide 6 remove 'Hinnavahe 0 SMR ja 3 SMR vahel 33,1 €/MWh 108,1 - 75,0 €/MWh' / move the explanation down that 33,1 €/MWh is Hinnavahe 0 SMR ja 3 SMR vahel".
On R-APP-16.

**Decision:**
1. The fourth slide (the weather years) loses its right column — what the year brings and how the answers become one —
   and its chart takes the body's width.
2. On the fifth (the four scenarios) each zone's figure and unit stand at fixed widths in their column, so that the
   growth marks after them stand under each other from row to row.
3. The sixth (the price gap) loses the gap's block at the top of its right column; its footnote, now always shown, says
   what the gap is: "{gap} €/MWh is the price gap between 0 SMR and 3 SMR, the gap between the two weighted averages",
   followed as before by the range within each weather year.

**Consequences:** No figure moves. The weighting the fourth slide's column explained stays in its note (D-222).

## D-244 · 2026-11-12 · How accurate the model is: three years side by side, fourth in the deck

**Status:** Accepted · 2026-11-12 · the owner on *Presentation 2*'s twelfth slide: "put the charts in a column and under each year. add the numbers of the average and median price to the charts. make the slide so that it is number 4", and, asked which
charts and which figures, "All four charts" and "Every month". On R-APP-16; it supersedes D-229's year chosen on
the slide.

**Decision:** The slide on how accurate the model is (D-229, D-240) shows the gate's three years at once, each in a
column of its own under the year and its hourly error against the market (the validation's table): the energy sources
of the model and of the record, the price duration curve, and the monthly average and median price, every month's
figure by its point — the model's and the market's, over the higher of the two lines and under the lower. The year's
buttons are gone; the lines' and the energy groups' keys stand once, in the slide's upper right. The slide is the
fourth, after how the model works; its note moves with it and no longer speaks of buttons.

**Consequences:** No figure moves. The page asks for the three replays whenever the slide is near, not one year's; the
build's sets hold them, so the site shows them at once. The slides after the third are one place later.

## D-245 · 2026-11-12 · What a weather year is, LNG, the impact headings, no present value on the deck

**Status:** Accepted · 2026-11-12 · the owner on *Presentation 2*: "on slide 5 it is worth writing in more detail what 1995 means, that it is ilmaastat, and more specifically that these are coefficients / inside the chart add units of measurement / on slide 6 replace gaas with LNG and remove the word soojust / on slide 7 make kogu eesti majandus and üks kodumajapidamine in the same style as the bold blue figure below / on slide 1 remove the column nüüdisväärtus". The last names the eleventh slide, the capital cost's,
the only one with that column. On R-APP-16.

**Decision:**
1. The fifth slide (the weather years) says, in the gaps beside its middle year, what a weather year is — one year's
   weather from ENTSO-E's climate data, wind, sun, water and temperature hour by hour, laid over the same scenario — and
   what its weight is — ENTSO-E's weight for the year, how much of the climate data's spread of weather it stands for,
   the answers averaged with these weights into one (the weights of TYNDP 2024's Implementation Guidelines, R-TIME-4).
   Its chart carries its unit: each weighted figure in €/MWh, the axis's numbers under "€/MWh".
2. The sixth (the four scenarios) gives the gas price as LNG's, without "thermal": "LNG {gas} €/MWh · CO₂ {eua} €/t".
3. The seventh's two headings, "the whole Estonian economy" and "one household", are set in the blue and the weight of
   the figures under them, a size up.
4. The eleventh (the capital cost) loses its present value's column.

**Consequences:** No figure moves. The present value at the owner's rate stays on the Model view's capital-cost table
(D-166). The words on what a weight means are a plain reading of ENTSO-E's selection, for the owner to word otherwise.

## D-246 · 2026-11-12 · A slide on the plant's account for the state over 60 years

**Status:** Accepted · 2026-11-12 · the owner: "add a slide after 12 where we give the calculations, the final cost for the state as applied to the nuclear power plant. taking into account the savings in the electricity price, the money that will stay in the country since import will decrease, the costs of the CFD and also the construction cost. We look over a horizon of 60 years". On R-APP-16.

**Decision:** A slide after the trilemma, the thirteenth of fourteen, sets out for one, two and three units, each
against 0 SMR, the four lines the owner named and their sum over the plant's design life (60 years,
`smr.bwrx300.design_life_years`):
1. what consumers save on the lower price — Estonia's demand times the gap of the weighted average prices, the
   seventh slide's figure;
2. the money that stays in Estonia — the fall of Estonia's net import bill, imports less exports in euros, the
   Presentation page's impact row (D-163);
3. the contract for difference's cost to the state — what the state pays a year under contract (a) settled hourly at
   the panel's strike, with the clause if set (`results.ts` `statePaysOf`, the contract card's); a year in which the
   operator pays back counts as a gain;
4. the plant's construction, once, at the owner's assumed price (D-157).
The yearly figures are the model year's, held for each of the 60 years and undiscounted, as the Presentation page's
impact holds them; each cell gives the 60-year figure in bn € with its calculation under it, and the sum is the four
lines added as they are listed.

**Consequences:** No figure of the model moves; the slide reads the runs the deck already has. The sum is the owner's
composition and not a welfare figure, and two of its pairs overlap: the saving on the price and the smaller import bill
both hold the cheaper imports, which raises the sum; the contract's payments repay a plant its investor builds, so
counting the construction beside them counts part of the plant twice, which lowers it. The slide's footnote says the
lines are added as listed and that the two gains partly count the same money; its note says both overlaps and that the
sum is an order of magnitude, no forecast. Specification revision 2.80.

## D-247 · 2026-11-12 · The plant's account sums the saving less the contract; the import bill and the construction for reference

**Status:** Accepted · 2026-11-12 · the owner, asked whether the sum of D-246 should keep its double counts, asked
where they were ("where is the double counting?") and, shown them, decided: "calculate the total as savings minus CfD, with import and construction for reference". It supersedes D-246's sum of four lines. On R-APP-16.

**Context:** D-246 added four lines. Two pairs counted the same money: the consumers' saving and the fall of the net
import bill both held the cheaper imports, and the rest of the saving is a transfer from Estonia's own generators; the
contract's payments repay a plant its investor builds, so the construction beside them counted part of the plant twice.

**Decision:** The slide's sum is the consumers' and the taxpayers' account, as the sensitivities' net row has it
(D-188): what consumers save on the lower price less what the state pays under the contract for difference at the
strike, over the plant's 60 years. Under the sum, marked "for reference, not in the sum" and set smaller: the fall of
Estonia's net import bill, with the words that it holds part of the consumers' saving, and the plant's construction,
with the words that it is the investor's cost, which the strike repays. The footnote keeps the basis — against 0 SMR,
the model year held for each year, undiscounted, the strike, the plant's price — and the note says the same.

**Consequences:** On the opening state the sum is +9.5, +14.5 and +16.3 bn € for one, two and three units, where
D-246's four lines gave +22.0, +37.5 and +48.6. No figure of the model moves. A country-wide account is not drawn: the
model has no running costs of the plant to set against the import bill. Specification revision 2.81.

*Deployed* 2026-11-12 12:38–12:44 at the owner's word ("Yes, deploy it"), with D-241 to D-246: main a2de585, the rollback
copy `data/raw-aside/live-bb2bde4f8bb3/`, the gate green (pytest 154, the application's 238, the golden fixture unchanged
in V8 and JavaScriptCore, `db.check --fast`), the sets 223 years in 111 s under the engine id 1de529a3a34f, compare_sets
53 sets with none differing, the manifest equal and all 142 files served as built, 401 without the password or the
cookie, the offline copy made, `make live-check` passed in Chromium and WebKit. The deck on the site in both engines:
fourteen slides, the third with the panel's controls, the fourth the three years side by side, the thirteenth the
plant's account; no page error.

## D-248 · 2026-11-12 · The scenarios' slide gives Latvia's and Lithuania's gas plants and the sources' icons

**Status:** Accepted · 2026-11-12 · the owner on *Presentation 2*'s sixth slide: "add to slide 6 the data for Latvia and Lithuania and icons denoting the sources". On R-APP-16.

**Decision:** The sixth slide (the four scenarios) gives the gas plants of all three zones in a row like the others —
each zone's MW and its growth from the fleet of 2025 — where it gave Estonia's alone in a large row; the other rows
already gave the three zones. Each row's label stands after the panel's icon of its source (`icons.ts`): gas plants,
onshore and offshore wind, solar, storage in the accent, demand in the ink, as the panel draws them. The zones' columns
narrow from 264 to 256 px and the figures' from 86 to 80 to leave the label its icon; the growth marks stay in columns.

**Consequences:** No figure moves.

*Deployed* 2026-11-12 12:47–12:52 at the owner's word ("Yes, deploy it"): main 3065034, the rollback copy
`data/raw-aside/live-a2de58511d48/`, the gate green (pytest 154, the application's 238, the golden fixture unchanged),
the sets 223 years in 100 s under the engine id 1de529a3a34f, compare_sets 53 sets with none differing, all 142 files
served as built, 401 without the password or the cookie, the offline copy made, `make live-check` passed in Chromium
and WebKit; the sixth slide on the site in both engines: five rows, gas plants first, each with its icon and the three
zones, no page error.

## D-249 · 2026-11-12 · The Presentation page out; the deck named Presentation

**Status:** Accepted · 2026-11-12 · the owner: "delete the esitlus tab and rename the esitlus 2 tab to Esitlus". On
R-APP-15 and R-APP-16; it supersedes D-152's page and those of the decisions on it since (D-153 … D-163, D-176 …
D-181, D-190 where they shape the page), and D-220's name for the deck.

**Decision:** The *Presentation* view of D-152 — the four scenarios of 2035 on one page, a block per neighbours'
profile with the inputs, Estonia's figures, the impact and three charts, and its sliders of the neighbours' levels
and of gas and CO₂ — is taken out of the page: its tab, its section, its drawing and its sliders, the charts it drew
(`charts.ts` `drawPresentation`) and its test. The deck takes its name: *Presentation*, «Esitlus», in place of
*Presentation 2*; its address stays `view=deck`, so that links passed on keep their slide, and the former page's
address, `view=presentation`, opens the deck. Kept: the capital cost of the energy mix, the Model view's table
(`capexHtml`, D-157 … D-160, D-166), with its test; the helpers the deck reads the runs with (`presentation.ts`
`mwOf`, `weightedOf`, `capexRowsOf`, `PresContext`); and among the build's sets the two neighbours' profiles of the
page's blocks, Global Ambition 2035 and National Trends 2040, which a switch of the profile on the Model view finds
ready. The browser check loses its section on the page's charts (D-235, D-238).

**Consequences:** No figure moves and the build's sets are the same; eight views. The settings the page's sliders set
— the neighbours' levels, the scenario's gas and CO₂ — stay the panel's. Specification revision 2.82.

*Deployed* 2026-11-13 13:50–13:55 with D-251 (main 674454d); see there.

## D-250 · 2026-11-13 · The deck without three units; the zones' prices, the year's error in per cent, the contract's term

**Status:** Accepted · 2026-11-13 · the owner: "on slide 2 add the average prices for the 6 zones shown for the year 2026. on slide 4 replace the average hourly deviation, put the deviation in percent for the year. on all slides remove the scenario with three reactors. slide 13 the cfd will be in force for 40 years, then the nuclear power plant will trade on the market". On
R-APP-16; it supersedes D-151's four scenarios on the deck (not on the Model view), D-240's and D-244's hourly error
under the accuracy slide's years and D-246's contract over the plant's whole life.

**Decision:** Four edits of the deck.

1. *Three units on no slide.* The deck shows 0 SMR, 1 SMR and 2 SMR (`deck.ts` `SC`); every chart, table and
   sentence that had three units loses them, and what was told for three units — the price gap and its money, the
   gas hours' "times fewer", the net exporter's balance, the cables' verdict, the footnotes — is told for two (`TOP`).
   The scenarios' slide and the capital cost's say three scenarios, the closing slide offers 0, 1 or 2 SMR, the notes
   say one and two units. The Model view, its table of the four and the build's sets keep three units; the deck no
   longer waits for their runs.
2. *The six zones' prices on the second slide.* After each zone's code on the map stands its average day-ahead price
   from January to the last month the Statistics page's ENTSO-E series reach for all six (R-APP-14, D-092): each
   month's average weighted by its days (`yearPrices`), under a title with the year and its months. With October's
   data in: Estonia 80, Latvia 99, Lithuania 100, Finland 57, Sweden's SE4 93, Poland 123 €/MWh, January to October
   2026. The page reads the months it already loads, so the figure follows the data with no edit.
3. *The year's error in per cent on the accuracy slide.* Under each year, in place of the hourly mean absolute error:
   how far the model's average price of the year is from the market's, in per cent of the market's — the replay's
   mean against the record's, the arrays the slide's charts draw: 1.8, 4.2 and 5.0 % below for 2023, 2024 and 2025.
   The hourly errors stay on the Calibration view. The deck no longer loads the validation's tables.
4. *The contract for 40 years.* The plant's account counts what the state pays under the contract for difference
   over its first 40 years alone, then the plant sells at the market price and the state pays nothing; the consumers'
   saving runs the plant's 60 years. The term is the owner's assumption, a parameter (`finance.cfd_term_years`, 40,
   cited to R-APP-16 with its verification record); the contract's row, the footnote and the note say so. On the
   opening state the sum is +9.1 and +14.8 bn € for one and two units (+9.5 and +14.5 with the contract over all 60
   years): one unit's contract is a gain, 20 M€ a year the operator pays back, two units' a cost of 15 M€ a year.

**Consequences:** No figure of the model moves; the build's sets are the same, and the export gains one parameter.
Specification revision 2.83; methodology §8.9.

*Deployed* 2026-11-13 13:50–13:55 with D-251 (main 674454d); see there.

## D-251 · 2026-11-13 · The map's units and size, the years' averages, the cables' blocks spread, the capital cost's slide out

**Status:** Accepted · 2026-11-13 · the owner: "slide 2 label the units of measurement, make a margin from the edges in the caption in the top left corner. Make the map itself bigger. on slide 4 write the average price for the year in the model and in reality and the percentage of deviation. slide 9 spread apart the blocks on the left with the scenarios so that it is not so crowded. delete slide 11". On R-APP-16; it
supersedes D-250's line under the accuracy slide's years and D-157's slide of the capital cost in the deck.

**Decision:** The second slide's map gives each zone's price with its unit, €/MWh, after the figure; the map's box
reaches east to the land's edge and Estonia's label stands left of its node, so that the units fit; its title
stands clear of the corner, and the map is drawn
larger, 680 px wide (490), the columns nearer even and the right column's heading on one line. Under each year of the
accuracy slide stand the model's and the market's average price of the year and their difference in per cent of the
market's: 89.2 against 90.8 €/MWh, −1.8 % for 2023; 83.6 against 87.3, −4.2 % for 2024; 76.3 against 80.4, −5.0 %
for 2025. The cables' slide spreads its three scenarios' blocks down its left column. The slide of the capital cost
of the new capacity, the eleventh, is taken out with its note; its table stays the Model view's (D-157).

**Consequences:** Thirteen slides. No figure moves. Specification revision 2.84.

*Deployed* 2026-11-13 13:50–13:55 at the owner's word ("Yes, deploy it"), with D-249 and D-250: main 674454d, the
rollback copy `data/raw-aside/live-3065034c9396/`, the gate green (pytest 154, the application's 239, the golden
fixture unchanged), the sets 223 years in 102 s under the engine id 1de529a3a34f, compare_sets 53 sets with none
differing, all 142 files served as built, 401 without the password or the cookie, the offline copy made, `make
live-check` passed in Chromium and WebKit; the deployed build's slides 2, 4 and 9 in both engines and both languages:
thirteen slides, the map 680 px wide, nothing outside the body.

## D-252 · 2026-11-13 · Estonia's price right of its node on the second slide's map

**Status:** Accepted · 2026-11-13 · the owner on the deck's second slide: "slide 2 move Estonia's price to the right like Latvia's and Lithuania's". On R-APP-16.

**Decision:** Estonia's flag, code and price stand right of its node, as every other zone's but Sweden's, where D-251
put them left of it. Right of the node the label ends 368 to 369 of the projection's units (Chromium, WebKit), past the
land's edge at 362.7, where basemap.py clipped Natural Earth a degree east of the box. The clip now reaches a degree and
a half east (374.0); the file is the one D-206 recorded (799 734 bytes, sha256 5fed4333…b853139), fetched again from
naciscdn.org at the owner's word, and the generator with the old clip reproduced basemap.ts byte for byte before the
change. Only Russia's and Belarus' outlines change, at that edge. The deck's map moves twelve units east (its view
12 to 374, 362 wide as before), so the map keeps its size; the Links box's map shows 0 to 340 as before.

**Consequences:** No figure moves. Every label of the slide falls inside the map in both engines.

*Deployed* 2026-11-17 13:01–13:05 with D-256 (main 2d1c1b5); see there.

## D-253 · 2026-11-13 · 2026 on the slide on how accurate the model is

**Status:** Accepted · 2026-11-13 · the owner on the deck's fourth slide: "add to slide 4 - the year 2026". On R-APP-16.

**Decision:** The fourth slide shows 2026 in a fourth column beside 2023, 2024 and 2025, with the same head and charts:
the model's replay of the year against the market's record over the hours the record reaches (January to October,
7 296 hours, when written), the months it holds named under the year («jaan–okt»), the monthly charts ending at the
last of them. `REPLAY_YEARS` gains 2026, so the build computes its replay with the others' (one set more). The columns
narrow from 560 to 416 px, four across the body's 1 760 with 32 between; the year's head a size down to fit (the year
30 px, its line 15 px), and the monthly charts name each month by its initial, a month having 30 px. 2026 is the second
blind year (§7): its figures are not fitted. On its ten months the model's average price is 71.1 €/MWh against the
market's 80.4, 11.6 % below; in the gate years 1.8, 4.2 and 5.0 % below.

**Consequences:** No figure of the model moves; the build gains 2026's replay (224 years, 55 files). The browser check
(`spikes/page-speed/browser_check.py`), which switched to 2026 as a year the site does not hold, switches to 2022. The
slide's note says the last column is this year as far as its months are in. Specification revision 2.85.

*Deployed* 2026-11-17 13:01–13:05 with D-256 (main 2d1c1b5); see there.

## D-254 · 2026-11-13 · The links in service on the scenarios' slide

**Status:** Accepted · 2026-11-13 · the owner on the deck's sixth slide: "add to slide 6 the interconnections that operate in the scenario". On R-APP-16.

**Decision:** Under the plant's card the sixth slide gives a card «LINKS IN SERVICE» («TÖÖTAVAD ÜHENDUSED»): the lines
the state runs with, the same in the three scenarios, a row per border along the chain with both zones' flags, the
lines' names and their MW summed, as the panel's switches hold them (`panelControls` for every line, a line's border
added to its toggle); a line switched off is left out, as on the second slide's map. On the opening state: EstLink 1
and 2, 1 000 MW; the EE–LV lines, 1 035; the LV–LT lines, 1 750; NordBalt, 700; Harmony Link and LitPol, 1 200;
EstLink 3 and the fourth EE–LV line, out of service in 2035 (S1), are not listed. The plant's rows a size down (the
MW 30 px, 42 before) so that both cards fit the column's 612 px; the plant's card its rows' height, the links' the rest.

**Consequences:** No figure moves. The slide's note names the card. Specification revision 2.85.

*Deployed* 2026-11-17 13:01–13:05 with D-256 (main 2d1c1b5); see there.

## D-255 · 2026-11-13 · The market solid, the model dashed on the accuracy slide

**Status:** Accepted · 2026-11-13 · the owner on the deck's fourth slide: "on slide 4 the model should be a dashed line, and reality a solid line". On R-APP-16.

**Decision:** On the fourth slide's price charts — the duration curve and the monthly average and median price — the
market's line is solid and the model's dashed, the other way round since D-229; each keeps its colour and width, and the
keys in the corner and the slide's note say so. The Model view's charts are unchanged.

**Consequences:** No figure moves.

*Deployed* 2026-11-17 13:01–13:05 with D-256 (main 2d1c1b5); see there.

## D-256 · 2026-11-16 · The neighbours' fleet at the end of 2025 beside the market model's, and the change in per cent

**Status:** Accepted · 2026-11-16 · the owner on the import-price page's table of installed capacity: "add the percentage growth relative to 2025 and the data for 2025". On R-APP-12, R-BND-8.

**Decision:** The import-price page's table of installed capacity gains two columns: before the market model's MW,
«MW 2025», the zone's fleet in service at the end of 2025; after it, the change from that fleet to the market model's in
per cent. The market model's column names its target year («MW 2035»).

The fleet is ENTSO-E's installed capacity per production type (A68) on 1 January 2026 — the end of 2025, the day the
Statistics page counts a year at — and not the document of 2025, the fleet on 1 January 2025: that one gives Finland
46.6 MW of solar (IRENASTAT: 1 219 MW at the end of 2024) and no batteries, and SE4 has no document before 2026. The
pipeline fetches A68 of 2026 for SE4 and Poland (`BOUNDARY_FLEET_YEAR`; Finland's was fetched with the core zones'),
the export writes the three zones' rows as `boundary.fleet`, and the page gathers ENTSO-E's types into the market
model's groups: biomass, geothermal, marine and other renewable under other renewable; the three hydro types under
hydro; hard coal and lignite under coal and lignite; coal-derived gas, oil, oil shale, peat, waste and "other" under
other thermal.

Finland's and Poland's onshore wind, offshore wind and solar are instead the Statistics page's series at the end of
2025 (IRENASTAT, `statistics.capacity`), so that the two pages show one figure: ENTSO-E's documents list no offshore
wind for either country (Finland has 32 MW; Poland's is a reported zero in IRENASTAT), and Poland's solar stands a year
behind in A68 (20 734 MW against IRENASTAT's 25 421; 21 721 at the end of 2024). Where both count the same thing they
agree: Finland's onshore wind 9 330 MW (A68) against 9 351, its solar 1 512 against 1 566; Poland's onshore wind
10 700 against 10 602. SE4 is no country of the Statistics page's (it holds Sweden), so SE4 keeps its document alone.

A type no source lists shows «–» and no change is given from it: not reported is not zero. A reported zero the market
model builds on is «new»; a group the fleet has and the market model has closed keeps its row, at −100 %. The loads
(electrolysers, heat pumps), demand response and the electric cars have no observed figure.

**Consequences:** No figure of the model moves: the engine does not read the rows, and the export differs from the
committed one by `boundary.fleet` (28 rows) and the two new datasets in `sources.json.gz` alone. On Distributed Energy
2035: Finland's onshore wind 9 351 → 46 000 MW (+392 %), solar 1 566 → 21 265 (+1 258 %), nuclear 4 371 → 3 250
(−26 %), coal 1 081 → 0 (−100 %); Poland's onshore wind 10 602 → 29 500 (+178 %), solar 25 421 → 36 740 (+45 %), coal
and lignite 25 494 → 10 810 (−58 %), offshore wind 0 → 9 380 (new), nuclear «–» → 2 220. SE4's document lists hydro
(347 MW), onshore wind (2 134) and one "other" (2 160) for everything else: its change is given for hydro and onshore
wind, and under other thermal for a remainder the two sources do not count alike; solar, offshore wind and batteries
show «–», and the page says so. Specification revision 2.86.

*Deployed* 2026-11-17 13:01–13:05 at the owner's word («commit and deploy»), with D-252 to D-255: main 2d1c1b5, the
rollback copy `data/raw-aside/live-674454de8e4d/`, the gate green (pytest 154, the application's 240, the golden fixture
unchanged), the sets 224 years in 122 s under the engine id f397f5212824, compare_sets 54 sets with none differing but
one new (2026's replay, D-253), all 143 files served as built, 401 without the password or the cookie, the offline copy
made, `make live-check` passed in Chromium and WebKit.

## D-257 · 2026-11-23 · The second slide's prices over the year so far, the month in progress included

**Status:** Accepted · 2026-11-23 · the owner on the deck's second slide: "update the data of slide 2 the average price for 2026 including the available November data". On R-APP-16.

**Decision:** The second slide's map gives each zone's average day-ahead price over every hour of the year so far, from
1 January to the last hour all six zones reach, the month in progress included; until now it took the Statistics
page's whole months (D-250). The export writes the averages as `statistics.ytd` (the first and last hour, the hours, and
per zone the value with its datasets); the slide's title names the last day («2026 jaan–23 nov»), the year alone once a
year is whole. `make prices-to-date` fetches the current month's ENTSO-E A44 of the six zones to today's UTC midnight,
the delivery day in progress included, under a dataset id of its own (`….2026-11.to-2026-11-23`), so that the whole
month, fetched by `make history` once it is complete, loads after it and replaces its hours; each run caches a file of
its own.

**Consequences:** On 2026-11-23, 1 January to 23 November (7 847 hours): Estonia 86.0 €/MWh (80 on January to October),
Latvia 107.2 (99), Lithuania 108.8 (100), Finland 58.0 (57), SE4 103.4 (93), Poland 130.7 (123). No figure of the model
moves: the year files are unchanged, since an observed year ends with the core zones' load and generation, which stop
at October; the Statistics page's months are unchanged, November holding under nine tenths of its hours. The datasets
of the month's first hour (31 October 23:00 UTC, the first CET hour of November) are the new file's, as with any month.
Specification revision 2.87.

*Deployed* 2026-11-23 at the owner's word («Yes, deploy»): main f70c544, the rollback copy
`data/raw-aside/live-2d1c1b5939a7/`, the gate green, the sets 224 years in 107 s under the engine id f397f5212824,
compare_sets 54 sets with none differing, all 143 files served as built, 401 without the password or the cookie, the
offline copy made, `make live-check` passed in Chromium and WebKit.

## D-258 · 2026-11-23 · The accuracy slide without the difference in per cent

**Status:** Accepted · 2026-11-23 · the owner on the deck's fourth slide: "on slide 4 remove the indication of the difference in percent. leave only mudel and turg". On R-APP-16.

**Decision:** Under each year of the fourth slide the line gives the model's and the market's average price of the year
alone («mudel 89,2 · turg 90,8»); their difference in per cent of the market's (D-250, D-251) is out. The slide's note
says the line gives the two averages. The Calibration view's errors are unchanged.

**Consequences:** No figure moves. Specification revision 2.88.

## D-259 · 2026-11-23 · The deck's second, third, fourth and sixth slides at the owner's word

**Status:** Accepted · 2026-11-23 · the owner on the deck: "on slide 2, highlight the average prices with a box. on slide 3 replace 'ja pakkumised' replace with tootmine. on slide 3 at the bottom in eeldused it is worth making it impersonal not writing the specific sources but simply writing source also it is worth adding bid there as we have it. on slide 4 make the figures mudel ja turg bigger. on slide 6 it is worth adding which scenario we took for the neighbours", and on the third slide's sources: "you have wind and solar there I do not want to specify the sources". On R-APP-16.

**Decision:**
1. The second slide's map draws each zone's label — flag, code, price and unit — in a white box edged in the accent; the
   page fits each box to its drawn text (`fitPriceBoxes`, once the slide is in and again once the fonts are), from a width
   estimated from the figures' sizes. The Links box's map, which carries no prices, has none.
2. The third slide's first box says «Installed capacity and generation» («Installitud võimsused ja tootmine»), «and bids»
   out.
3. The third slide's panel names no technology: onshore wind's and solar's sliders give way to one «Generation source»
   («Tootmisallikas», onshore wind's slider standing for any) and the gas plants' one bid («Pakkumine», €/MWh) as the
   panel sets it, its preset the opening's (`panelControls().bid`, D-164: 185 €/MWh at the opening state).
4. The fourth slide's averages under each year are 24 px (15 before), the line's words as they were.
5. The sixth slide's line on the neighbours names their scenario as the panel's list does, «Naabrite hinnad: TYNDP 2024 ·
   Distributed Energy 2035; keskmine €/MWh» (`profileName`), before the levels and averages.

**Consequences:** No figure moves. Specification revision 2.89.

## D-260 · 2026-11-23 · The deck's third, sixth and twelfth slides at the owner's word

**Status:** Accepted · 2026-11-23 · the owner on the deck: "on the third slide remove the separate slider pakkumine, make it as in the model bid also make ühendusedused impersonal put simply ühendused. on slide 6 put põlevkivi only for Estonia. and put tarbimine at the top. at the bottom in naabrite hinnad put the units of measurement. and in general tidy up the lower part. on slide 12 remove the row jaama ehitus". On R-APP-16. Supersedes D-259's third point.

**Decision:**
1. The third slide's panel has two sliders, each the half of its width: demand, and one «Generation source»
   («Tootmisallikas») — Estonia's gas plants summed, as the panel's gas fold sums them (`panelControls().gas`) — with its
   MW and its bid in two boxes side by side, as the model's panel gives a source's row (185 €/MWh at the opening state);
   the bid's slider of its own is out. Its four switches are named «Link 1» to «Link 4» («Ühendus 1–4»), their MW and
   states as before.
2. The sixth slide's shared card begins with demand, and gains a row of oil shale after the gas plants, Estonia's alone
   (270 MW at the opening state).
3. The sixth slide's foot is two labelled rows above a rule: «NEIGHBOURS' PRICES» — the scenario, then each neighbour's
   average with its unit and its level («FI 75,0 €/MWh · ×1,88») — and «FUEL AND CO₂» — LNG and CO₂ — with the growth
   mark's key at the right.
4. The twelfth slide's row on building the plant is out, with the plant's price in its footnote and the sentence on it
   in its note; the money that stays in Estonia stays for reference.

**Consequences:** No figure moves. Specification revision 2.90.

## D-261 · 2026-11-23 · The twelfth slide's contract row and total named for the state

**Status:** Accepted · 2026-11-23 · the owner on the deck's twelfth slide: "on slide 12 in cfd it is worth putting tulu/kulu riigil. At the bottom add to kokku tulu riigile 60 aasta jookusö". On R-APP-16.

**Decision:** The contract's row reads «The contract for difference: gain or cost to the state» («Hinnavahemehhanism
(CfD): tulu/kulu riigile»), since it is a gain in a year the market price is above the strike (+0.8 bn € for one unit
at the opening state) and a cost below it (−0.6 for two); the sum reads «Total gain to the state over 60 years» («Kokku
tulu riigile 60 aasta jooksul»). The figures and the row's mark are unchanged.

**Consequences:** No figure moves. Specification revision 2.91.

## D-262 · 2026-11-23 · The twelfth slide without the plus and minus marks

**Status:** Accepted · 2026-11-23 · the owner: "remove the green plus and the red minus from the slide". On R-APP-16.

**Decision:** The twelfth slide's rows of the consumers' saving and of the contract carry no mark before their label;
the figures keep their signs. The contract's label fits one line without it.

**Consequences:** No figure moves. Specification revision 2.92.

## D-263 · 2026-11-23 · A slide on why the neighbours' prices stand above the scenario's

**Status:** Accepted · 2026-11-23 · the owner: "add a slide after slide 6 about the data centres and industry that will be built in Finland, Sweden, Poland the goal is to justify our price multiplier TYNDP 2024 DE35". On R-APP-16,
R-BND-8.

**Decision:** The deck gains a seventh slide of fourteen, after the scenarios', «Why are the neighbours' prices
higher?» («Miks on naabrite hinnad kõrgemad?»): a card each for Finland, Sweden (price zone SE4) and Poland.
1. **The price**, three lines: the profile's average as published (`setInputs().price`, the panel's name of the
   profile), the market's average of the year to date (D-257) and the model's — the level and the product (Finland
   39.9 → ×1.88 → 75.0 €/MWh, against 58.0 on the market in 2026 to 23 November; SE4 45.9 → ×1.96 → 90.0, 103.4; Poland
   57.2 → ×2.10 → 120.0, 130.7).
2. **Data centres and industry**, each as consumption in 2024 (Eurostat) against the plan the row names, with a line on
   the queue, every figure a documentary value of the Statistics page's two tabs (D-214; `NB_KEYS`, handed in by the
   page): Finland's data centres 2.3 → 35 TWh in 2035 and industry 33.5 → 62 (Fingrid's High Growth), agreements signed
   5 GW of some 100 GW of enquiries; Sweden's data centres 2.6 → 16 TWh and hydrogen production 18.4 TWh on top of
   industry's 44.6 (the operator's central path, the model's research, D-121), 7.3 GW of data centres and 14.6 GW of
   industry in Svenska kraftnät's queue; Poland's data centres 0.5 → 17.4 TWh in 2036 and 15 TWh of new industrial loads
   on top of 53.4 (PSE's draft plan), conditions issued for 9.2 GW and none yet an agreement.
3. **What it is and is not**, under the cards: the scenario's low prices assume that generation is built as fast as
   this demand comes — Finland's onshore wind 9.4 GW at the end of 2025 against 46.0 GW in the scenario (D-256's
   figures; left out where the profile has no fleet) — a request or a plan is not yet consumption, and the levels are
   the owner's assumption, which the sliders change. The note says the same, and that Sweden's applications are in the
   north, none in SE4.

The slide argues for an assumption and does not derive it: the levels stay the owner's (D-194), no figure of the
research's tight profiles is claimed for them, and nothing on the slide is a forecast.

**Consequences:** No figure moves; fourteen slides, the slides after the sixth one place later. Specification revision
2.93.

## D-264 · 2026-11-23 · The seventh slide for Finland alone, with the large data centres planned

**Status:** Accepted · 2026-11-23 · the owner on D-263's slide: "let's leave only Finland on the new slide 7. give a list as a table of the data centres that are planned to be built". On R-APP-16, R-BND-8. Supersedes D-263's Swedish and
Polish cards.

**Decision:**
1. **Finland alone.** The slide is «Why is Finland's price higher?» («Miks on Soome hind kõrgem?»): Finland's card of
   D-263 at the left — the profile's price, the market's of the year to date, the model's with its level; the data
   centres and the industry of Fingrid's plan — and Sweden's and Poland's cards out; the note says their levels rest on
   the same reasoning and that their figures are on the Statistics page.
2. **The large data centres planned, project by project**, at the right: the ten projects of Germany Trade & Invest's
   table «Ausgewählte Datenzentrumsprojekte in Finnland (nach Investitionssumme)» of 28 August 2026 (document
   `gtai_fi_datacentres_2026`), a row each — a dot and a word for the stage, the place, who builds it, the year the first
   phase is due, the megawatts as a bar and a figure — the firmest first: an investment decision with building begun
   (Microsoft at Espoo, Kirkkonummi and Vihti 480 MW; Amp Tank at Utajärvi 300; Compute Nordic at Mikkeli 212), an
   investment decision (XTX Markets at Kajaani 250; DayOne for TikTok at Lahti 128), planning or studies (Pure DC at
   Seinäjoki 550, which the table gives as planning and investment decision both and the slide counts as planning;
   Prime Data Centers at Järvenpää 550; FCDC at Rovaniemi 500; QTS and Blackstone at Forssa 450; Nebius at Lappeenranta
   310). Under them the sums: 360 MW in operation today (the industry association's count, D-214), 1 370 MW decided,
   2 360 MW in planning, 3 730 MW the ten together.
3. **The megawatts are documentary values** (`statistics.dc.fi.project.*_mw`, ten rows of `parameters.csv` with their
   verification records): each the developer's planned capacity as the table's cell gives it — a first phase and its
   later extensions summed (Seinäjoki 110 + 440, Utajärvi 100 + 200, Microsoft's three sites 175 + 130 + 175; Lahti
   the 128 MW it is extended to from 50) — not a grid allocation. The stage, the investor and the year are the table's
   words, held in the slide's code and in each row's note.
4. **The document's copy.** gtai.de answered the pipeline's request with a bot-check page, and the Internet Archive holds
   no copy; the cached file is the page as served to one plain request on 2026-11-23, recorded with its lineage through
   `cached_get`'s `content`. The check was not worked around: while the file is cached the page is not requested again,
   and a cache built afresh would need the page fetched by hand.

**Consequences:** No figure of the model moves: the export gains the ten parameters and the document in
`sources.json.gz`, and nothing else. The selection is the source's, by investment: it is not every project (the
operator counts nearly 5 GW of agreements signed), and a project's megawatts are its developer's. Specification
revision 2.94.

## D-265 · 2026-11-23 · The planned data centres' megawatts as figures alone

**Status:** Accepted · 2026-11-23 · the owner on the seventh slide's table, asked what the bars meant: "remove the bars, leave only the figures". On R-APP-16.

**Decision:** The table of the large data centres planned gives each project's megawatts as a figure, the bars of D-264
out; the stage keeps its dot and its word, and the columns take the room the bars leave.

**Consequences:** No figure moves.

## D-266 · 2026-11-23 · The planned data centres' table corrected and extended from the projects' own documents

**Status:** Accepted · 2026-11-23 · the owner, with Fermi Energia's fact-check of 14 November 2026 («Kas Soomes valmib
2027. aastal 1 858 MW andmekeskusi?») in hand: "study the report whether the finished table should be supplemented or corrected", then «Yes,
fix table». On R-APP-16, R-BND-8. Corrects D-264's table.

**Context:** The fact-check reads the projects' own documents — the environmental impact assessments (KMH), company
releases, EUDCA's report — and finds that a chart of seven projects «completing in 2027» sets each campus's final
megawatts beside its first phase's year. D-264's table, from Germany Trade & Invest's selection, had the same two
columns side by side and differed from those documents in two rows.

**Decision:**
1. **Two rows corrected.** Microsoft's three sites are 615 MW together, as their environmental impact assessments
   give the electrical power — Vihti about 265, Espoo about 200, Kirkkonummi about 150 — where the trade agency's table
   gave 175 + 130 + 175 = 480. Amp Tank's Utajärvi is 200 MW (its announcement of 11 June 2026: building permits and a
   binding grid agreement) with no completion year, where the table gave 100 + 200 MW and 2027.
2. **Two projects added.** atNorth's FIN04 campus at Myllykoski, Kouvola, 430 MW in all, the building YIT builds due by
   the end of 2027 (YIT's release of 21 July 2026); Hyperco's site at Kouvola, 150 MW for TikTok, its first 50 MW
   due in 2027 (the study the two commissioned, as reported on 8 September 2026). Twelve rows.
3. **A column for the first phase.** Each row gives the first phase — its year and, where published, its megawatts
   (Kajaani 22.5 MW of IT power in 2026; Kouvola 50 and Lahti 50 in 2027; Seinäjoki 110) — beside the campus's final
   capacity, the two columns named, so that a year is not read as the year the megawatts come. XTX Markets' Kajaani,
   whose first building is under construction, counts as decided and building.
4. **The sums.** Decided 1 985 MW (building begun 1 857, an investment decision 128), planning 2 360, the twelve
   together 4 345 MW of final capacity; beside them Finland's IT power, 362 MW in 2025 and 556 MW forecast for 2027
   (EUDCA, State of European Data Centres 2026: colocation 293 + hyperscale-owned 263), in place of the 360 MW «in
   operation» — a measure of its own, IT power against the sites' electrical power, and the slide's footnote says that
   the megawatts are final capacities built over years and that 2027 brings the first phases.
5. **The documents** (seven, each cached with its lineage: the three assessments' notices, YIT's release, XTX Markets'
   release, the two reports on AmpTank and on TikTok and Hyperco, EUDCA's report) and twelve documentary rows with their
   verification records, each value found again in its cached document by script; the trade agency's rows on
   Microsoft and Utajärvi are withdrawn, its other eight stay. Two documents of the fact-check were not taken: the
   City of Kouvola's overview (its address answers 404) and EK's database, an interactive page.

**Consequences:** No figure of the model moves: the export's parameters and its list of documents alone. What stays
soft: Hyperco's 150 MW and XTX Markets' 22.5 MW are IT power, the others electrical; TikTok's and AmpTank's figures
come from reports of the companies' own announcements; XTX Markets' 250 MW and the five projects in planning rest on
the trade agency's table. Specification revision 2.95.

## D-267 · 2026-11-23 · Arctial's aluminium smelter in the seventh slide's industry block

**Status:** Accepted · 2026-11-23 · the owner: "add Arctial to slide 7 in the tööstus card, the capacity in MW is a must".
On R-APP-16, R-BND-8.

**Decision:** Finland's card names under its industry the largest single load planned, by its megawatts: «Arctial,
aluminium smelter at Kokkola: 1 050 MW of steady load (environmental assessment, 2026)». The figure is a documentary
value (`statistics.ind.fi.arctial_mw`, with its verification record): the environmental impact assessment's report of
28 May 2026, p. 61, «Laitoskokonaisuus tarvitsee tasaisesti noin 1 050 MW sähkötehoa» — the document was in the cache
already (D-121's research on Finland).

**Consequences:** No figure of the model moves. The smelter has no investment decision; the slide names the
assessment, not a date. Whether Fingrid's plan of 62 TWh for industry in 2035 counts it the plan does not say, and the
slide does not add the two.

## D-268 · 2026-11-23 · Google on the seventh slide: half of Loviisa under contract, three sites with no megawatts

**Status:** Accepted · 2026-11-23 · the owner, who asked for the research ("do research on the data centres of google as far as I know they will take half of the production of the Loviisa nuclear power plant") and then for the slide: «Yes, add». On R-APP-16,
R-BND-8.

**Decision:**
1. **The contract**, under Finland's data centres: «Google: up to 50 % of the Loviisa nuclear plant in 2030–2049,
   507 MW of existing generation». Fortum's stock exchange release of 9 September 2026: the
   power purchase agreement «will start in 2028 with a smaller capacity and will reach 50% of the Loviisa nuclear power
   plant's capacity in 2030–2049»; the megawatts are half of the plant's two reactors, «507 MWe each». An existing
   plant, its lifetime extended to 2050 by the investments the contract secures: new demand met from generation the
   system already has, with 10 MW of uprate enabled beside the 38 MW under way.
2. **The three new sites**, a thirteenth row of the table: Kajaani · Muhos · Vaala, Google, in planning, with the
   13 bn € the company announced for 2027–2028 where the megawatts would stand, since it has published none; the row is
   in no sum, and the total is named «final capacity together». Planning, since the environmental impact assessments
   are under way and the supervisory authority halted the preparatory works at Muhos and Kajaani for them in October
   2026 (press reports; not a documentary value).
3. **Room for both:** the cards 660 px high (612), the footnote two lines — the megawatts as final capacities and the
   first phases in a sentence, EUDCA named in the sums' label.

Three documentary rows with their verification records (the share, a reactor's megawatts, the investment), one
document (`fortum_google_loviisa_2026`).

**Consequences:** No figure of the model moves. The contract's megawatt-hours are not published; 507 MW is the share
of the plant's capacity, not a load of Google's. Specification revision 2.96.

## D-269 · 2026-11-23 · Google's investment in Finland's card, not the table

**Status:** Accepted · 2026-11-23 · the owner: "remove 13 billion from the table and put it on the left". On R-APP-16.

**Decision:** The 13 bn € Google announced for 2027–2028 leaves the table's megawatt column, where the row of its
three sites now shows «–», and stands in Finland's card with the contract: «Google: 13 bn € in 2027–2028; up to 50 % of
the Loviisa nuclear plant in 2030–2049, 507 MW of existing generation». The cards are 676 px high (660) with 14 px of
padding (16 and 18) for the line's third row.

**Consequences:** No figure moves.

## D-270 · 2026-11-23 · Fingrid's own words on the seventh slide, as a link to the page

**Status:** Accepted · 2026-11-23 · the owner on the two rows that said «Fingrid's plan»: "where you write finridi kava give a link to the primary source and the exact quote in the slide itself make the link clickable". On R-APP-16.

**Decision:** Under the data centres' and the industry's figures of 2035 the slide gives, where it said «Fingrid's
plan», «Fingrid, Q3/2026:» and the forecast's own words for the figure as a link — «11–35 terawatt-hours by 2035» and
«35–62 terawatt-hours by 2035» — to *Prospects for electricity production and consumption Q3/2026*, opened at page 6
in a tab of its own; the link's tip holds the whole sentence. The words show what the label hid: 35 and 62 TWh are
the tops of the forecast's ranges, its High Growth scenario, the bottoms 11 and 35.

The address is not in the site's code: the bundle holds no third-party address (R-NFR-1, `site_check.ts`), so the
slide takes it from the site's sources (`sources.json`, the document `fingrid_prospects_q3_2026_en`), as the
Documentation's, the Statistics page's and the panel's source links do, and without it shows the words unlinked. A
link the reader opens requests nothing until clicked.

**Consequences:** No figure moves. The seventh slide is the first with a link out of the site.

## D-271 · 2026-11-23 · The seventh slide's title and its main conclusion

**Status:** Accepted · 2026-11-23 · the owner: "Title: justification of the price multiplier of import from Finland. below the main conclusion should be written: The colossal addition of consumption by data centres and decarbonisation of industry will worsen Finland's energy deficit, which will lead to a rise in prices." On R-APP-16.

**Decision:** The seventh slide is titled «The case for Finland's import price multiplier» («Soome impordihinna kordaja
põhjendus»), and under the title, as its main conclusion, the owner's words: «The vast new consumption of data centres
and the decarbonisation of industry will deepen Finland's energy deficit, and that will push prices up.»
(«Andmekeskuste tohutu lisatarbimine ja tööstuse süsinikuheite vähendamine süvendavad Soome energiapuudust ning see
tõstab hindu.») — 28 px in two lines, the head's 160 px filled in both languages.

**Consequences:** No figure moves. The conclusion is the owner's reading of the slide's figures, not a result of the
model, which takes Finland's price and does not compute Finland's balance.

*Revised* 2026-11-23 at the owner's word («anmekeskuste ehituse buum ja rasketööstuse dekarbonieerimine»): the
conclusion's subject is «Andmekeskuste ehituse buum ja rasketööstuse dekarboniseerimine» (EN «The data-centre building
boom and the decarbonisation of heavy industry»), the rest as before.

## D-272 · 2026-11-23 · The seventh slide without its footnote

**Status:** Accepted · 2026-11-23 · the owner, on the footnote under the cards («Stsenaariumi madalad hinnad eeldavad…»):
"delete". On R-APP-16.

**Decision:** The footnote is out — Finland's onshore wind at the end of 2025 against the scenario's, that a plan is not
yet consumption, that the megawatts are final capacities and 2027 brings first phases, that the level is the owner's
assumption — and with it the onshore wind the page handed the slide (`DeckInput.nb.wind`). The cards take the body's
740 px. The table keeps its two named columns, the first phase beside the final capacity, and the speaker's note keeps
the caveats.

**Consequences:** No figure moves.

## D-273 · 2026-11-23 · The planned data centres' table without the first phase

**Status:** Accepted · 2026-11-23 · the owner: "delete the column esimene etapp". On R-APP-16. Supersedes D-266's third
point.

**Decision:** The table's column of the first phase — its year and, where published, its megawatts — is out; a row
gives the stage, the place, who builds it and the campus's final capacity, under «FINAL CAPACITY» («LÕPPVÕIMSUS»). The
first phases' four documentary rows (`statistics.dc.fi.project.*_first_mw`) stay in the export, read by no slide.

**Consequences:** No figure moves. With the footnote out (D-272), the slide no longer says on its face that the
megawatts are final capacities built over years; the column's heading names them, the speaker's note says the rest.

## D-274 · 2026-11-23 · Finland's three prices on the seventh slide, compact

**Status:** Accepted · 2026-11-23 · the owner on the three lines under Finland's name: "make it more compact: DE 2035 prognoos: etc." On R-APP-16.

**Decision:** Each line is a short label and its figure beside it: «DE 2035 prognoos: 39,9 €/MWh», «Turg 2026:
58,0 €/MWh», «Mudel 2035: ×1,88 → 75,0 €/MWh» (EN «DE 2035 forecast:», «Market 2026:», «Model 2035:»), the figures 22 px
and the model's 30 (24 and 40 before). The profile's label is its code and year (`s.profile`), «forecast» the owner's
word for the published profile.

**Consequences:** No figure moves. Elsewhere the site calls the profile a modelled price, not a forecast; the slide
uses the owner's word.

## D-275 · 2026-11-23 · The seventh slide's industry row without its line on hydrogen and boilers

**Status:** Accepted · 2026-11-23 · the owner: "remove the caption sh vesinik...". On R-APP-16.

**Decision:** Under the industry's figures the line «hydrogen and e-fuels included; electric boilers built or under
construction over 3 GW» is out; Fingrid's quote and Arctial's line stay. The value it read
(`statistics.ind.fi.boilers_gw`) stays on the Statistics page.

**Consequences:** No figure moves.

## D-276 · 2026-11-23 · Every figure of Finland's card linked to its document

**Status:** Accepted · 2026-11-23 · the owner on «liitumislepinguid sõlmitud 5 GW; päringuid 100 GW, mittesiduvad»:
"remove the word mittesiduvad, and add links on the words to the primary sources". On R-APP-16.

**Decision:**
1. «mittesiduvad» («not binding») is out of the line.
2. Each figure of the card's lines is a link to the document it comes from, the source's own words its tip, opened in a
   tab of its own: 5 GW to Fingrid's news of 18 August 2026; 100 GW to Fingrid's forecast Q3/2026 at page 3;
   Google's 13 bn €, 50 % and 507 MW to Fortum's stock exchange release of 9 September 2026; Arctial's 1 050 MW to its
   environmental impact assessment's report at page 61 — beside the two quotes of D-270 to the forecast's page 6.
3. The addresses come from the site's sources (`sources.json`, four documents, `NB_DOCS`), as D-270's did
   (`DeckInput.nb.urls` in place of `nb.url`); without them the figures stand unlinked.

**Consequences:** No figure moves. The 2024 consumptions (Eurostat) and the table's projects are not linked: the first
come from Eurostat's data interface, not a page to read, and the table names its sources in D-264 and D-266.

## D-277 · 2026-11-23 · Finland's price in one line: the forecast, the multiplier, the model's price

**Status:** Accepted · 2026-11-23 · the owner: "remove turg 2026 and put the multiplier right after the forecast figure and an arrow to 75". On R-APP-16. Supersedes D-274's three lines.

**Decision:** Under Finland's name one line: «DE 2035 prognoos: 39,9 ×1,88 → 75,0 €/MWh» — the profile's average, the
multiplier right after it, an arrow to the price the model takes. The market's year to date (D-263) is out of the card;
it stays on the second slide's map.

**Consequences:** No figure moves.

## D-278 · 2026-11-23 · The planned data centres: green where building, each place linked to its source

**Status:** Accepted · 2026-11-23 · the owner: "change the colour of the dots of the projects to green for those that are under construction, grey for the others. also make the projects clickable so that one can look at the primary source where the information is from". On
R-APP-16.

**Decision:**
1. A project's dot is green where building has begun (six rows), grey for an investment decision or planning (seven);
   the stage's word stays in its column.
2. Each place is a link to the document its megawatts come from, opened in a tab of its own at the page its lineage
   record names, the document's title the tip: Microsoft's three sites each to its environmental impact assessment
   (Espoo and Vihti p. 1, Kirkkonummi p. 12), Myllykoski to YIT's release, Utajärvi to the report on AmpTank's
   announcement, Kouvola to the report on the TikTok–Hyperco study, the eight rows from Germany Trade & Invest to its
   table, and Google's three sites, which carry no megawatts, to Fortum's release. The page reads each value's
   document from its lineage record in the site's sources (`DeckInput.nb.refs`), the bundle holding no address.

**Consequences:** No figure moves.

## D-279 · 2026-11-23 · Sweden's and Poland's slides after Finland's

**Status:** Accepted · 2026-11-23 · the owner: "make similar slides for Sweden and Poland". On R-APP-16.

**Decision:**
1. The deck has sixteen slides: after Finland's (the seventh) stand Sweden's and Poland's, each the same two cards —
   the country's profile price, the owner's level and the model's price over its data centres and its industry, and the
   data centres on their way, a row a project. One function draws the three from a country's record (`NB`, deck.ts).
2. **Sweden** (the model's neighbour is SE4). Data centres 2.6 TWh in 2024 (Eurostat) against 16 TWh in 2035, industry
   44.6 TWh against 18.4 TWh of hydrogen production added by 2035: both read off Figure 5 of Svenska kraftnät's
   long-term market analysis 2026 (scenario MM), the midpoint of its 2030 and 2040 — the values the research on the
   neighbours already holds (`se2035.*`); the link's tip says so, and the words stand without quotation marks. Under
   them Svenska kraftnät's queue at 1 October 2026 (data centres 7.3 GW, industry 14.6 GW, 11.0 GW of it in SE1), the
   3.5 GW reserved for data centres (press, quoting the operator), Brookfield's investment of up to SEK 95 billion and
   Stegra's 700 MW of electrolysers. The table: five campuses announced, 2 800 MW of final capacity — Borlänge
   (EcoDataCenter, Mistral AI; building, up to 600 MW), Strängnäs (Brookfield, 750 MW), Skellefteå (EdgeConneX, up to
   1 GW), Sollefteå (atNorth, 300 MW), Smedjebacken (EcoDataCenter, 150 MW) — from the developers' releases and the
   trade press on them, since the operator names no project; each place carries its bidding area.
3. **Poland.** Data centres 0.5 TWh in 2024 against 17.4 TWh in 2036, industry 53.4 TWh against 15 TWh of new
   industrial loads by 2036: PSE's draft development plan 2027–2036 (Tab. 4.3, Rys. 4-1). Under them PSE's public list
   of connection requests at 30 September 2026: conditions issued for 9.2 GW of data centres and requests for 2.1 GW,
   hydrogen's 1 620 MW of conditions, the 923 MW of industrial agreements in force, and the plan's 1 500 MW of
   electrolysers. The table is every data-centre row of that list, a project's stages summed: thirteen rows,
   11 284 MW, each «conditions issued» or «request». Beside the sums stands what PSE's own plan takes for 2036:
   3 093 MW.
4. The values are documentary rows with verification records: `statistics.dc.se.project.*_mw` (5),
   `statistics.dc.se.brookfield_invest_bn_sek`, `statistics.dc.pl.project.*_mw` (16) and
   `statistics.dc.pl.plan_2036_mw`; six documents registered and cached (Brookfield's and atNorth's releases, the trade
   press on EdgeConneX, on EcoDataCenter at Borlänge and at Smedjebacken, EcoDataCenter's release with Mistral AI).
5. Each slide has its note, in both languages, with the caveats the slide itself cannot carry.

**What the slides do not show, said in the notes and here:**
- None of Sweden's five campuses stands in SE4, and Svenska kraftnät's queue holds no data centre and no industry
  there. The slide argues through the country's balance — load in the north and the middle leaves less to flow south
  — and that step is the owner's reasoning, not a figure of a source.
- Sweden's megawatts are final capacities and two of them ceilings («up to», «potentially»); one campus is building.
  The 600 MW at Borlänge and the 1 GW at Skellefteå come from the trade press, not the developers' own text.
- Poland's list holds no agreement and nothing building; 6 990 MW of the 9 185 MW of conditions stand under one
  developer's names (WBS Power), which the card says; PSE's plan counts on about a third of the conditions.
- The plan's figures for Sweden are the midpoints of two chart readings, not published values for 2035.

**Consequences:** No figure of the model moves; the levels stay the owner's assumption (D-194). The slides after the
ninth move two places on; `make ci` green.

## D-280 · 2026-11-24 · The slides after an independent check: what is fixed, what waits for the owner

**Status:** Accepted for the fixes, by the owner's standing word for the night ("plan the night work" with the
independent check of the slides chosen, 2026-11-23); the items under *Proposed* await the owner. On R-APP-16.

**Decision (done):** besides E-198,
1. Sweden's card names its zone, SE4, beside the country, and its queue line says none of it is in SE4 («none in SE4 /
   SE4-s mitte ühtegi»); the reserved capacity reads «allocated or reserved», the source's words.
2. Stegra's electrolysers read «ordered in 2023»: the figure is the supplier's order of May 2023, and a report of
   September 2026 in the repository's cache says the plant still lacks financing.
3. Poland's electrolysers read «in 2036: 1 500 MW», the year and the figure apart.
4. The fourth slide's eleventh-slide sentence says Estonia's imports and exports «roughly balance» when the net
   position is within ±0.5 TWh, where the sign means nothing at the slide's precision (2 SMR: +0.1 TWh, its years
   0.0–0.2).
5. Wording: the tips' page mark is «lk» in Estonian; «otsus tehtud, ehitamisel»; slide 2 «Iga eeldust saab ekraanil
   liuguriga muuta»; slide 3 «(pakkumiste järjestus)»; slide 13 «Climate neutrality … net emissions»
   («Kliimaneutraalsus … netoheide»), as the regulation cited says; slide 16 «Proovi ise» and «Ava», one register
   with its steps; Finland's note «the smaller part by megawatts».
6. Layout, English: the tables' last column 150 px and a non-breaking space before GW and MW in the cards' links;
   slide 3's weather line and the titles of slides 14 and 15 shortened, so that nothing crosses its box and both
   titles keep to one line; the airport project's developer «Central Airport DC».

**Proposed — awaiting the owner** (the owner's own words or choices, left as they stand; the first and the fourth
settled by D-281):
- Slide 7's conclusion «will deepen Finland's energy deficit» (D-271): Fingrid's forecast, the slide's source, has
  Finland a net exporter by 2035 (9 TWh in High Growth, 18 in Moderate, p. 10); its point is that new generation lags
  new demand. A wording that holds: «… Finland's demand grows faster than its new generation, and that will push
  prices up.»
- Slide 7's 35 and 62 TWh are the top of Fingrid's ranges (11–35, 35–62), the 2024 bases Eurostat's; «up to» or the
  range would say so.
- «DE 2035 prognoos / forecast» (D-274) names a scenario a forecast; «stsenaarium / scenario» would not.
- Slide 15's «Kokku tulu riigile» (D-246, D-247) adds consumers' savings to the state's contract; «Kokku kasu Eestile
  (tarbijad ja riik)» would say what it adds.
- Utajärvi is «decided, building» on the fact-check's and the trade agency's word, while the document it links to
  expects building to begin in the second half of 2026.
- Sweden's 16 TWh of data centres in 2035 (`se2035.datacentres_twh.a`) is the midpoint of 6 and 27, which is 16.5; the
  value is a research input, so its change waits for the owner.
- Estonia's remaining 2026 bias (−6.6 €/MWh after E-199) sits mostly in 674 hours in which the replay separates
  Estonia from Latvia — the EE–LV link full, Estonia cheaper — and the market did not; in them the replay exports more
  from Estonia than the market scheduled. E-139's study (`spikes/ee-split`) found oil shale above the record there and
  EstLink less often at its limit; its next steps (D-099: oil shale's entry, storage without perfect foresight) are
  the proposal, run again on 2026 to October; no parameter moves without the owner.
- The robustness study's range for the neighbours' level, ×1.0–2.0 (D-191), was chosen on the re-priced profile; on
  the profile as published (D-194) it reaches the owner's levels only at its top, and the contract with two units costs
  the state in 99 % of the samples (median 123 M€ a year; the study's section of 2026-11-24). Whether to move it, for
  instance to ×1.5–2.5, is the owner's.
- The three neighbours' slides show demand rising, not what TYNDP's DE 2035 already assumes for it; a line per
  country with the scenario's own 2035 demand would show whether the profile's price misses it.

**Consequences:** no figure of the model moves; Sweden's sums by stage are decided 600 MW, planning 2 200.

*Deployed* 2026-11-24, finished 02:19, with the night's branch (main 14611e9, which carries D-258 … D-280 and E-198, E-199)
at the owner's word given before the night ("Yes, if ci is green"): the rollback copy `data/raw-aside/live-f70c5449f959/`,
the gate green, the sets 224 years in 98 s, all 143 files as built, 401 without the password or the cookie, the offline
copy made, `make live-check` passed in Chromium and WebKit.

## D-281 · 2026-11-24 · Slide 7's conclusion as Fingrid has it; slide 15 counted for Estonia

**Status:** Accepted · 2026-11-24 · the owner on two of D-280's proposals: "Soome tarbimine kasvab kiiremini kui uus tootmine - I agree" and, on slide 15's total adding consumers' savings to the state's money, "fix it". On R-APP-16.

**Decision:**
1. Slide 7's conclusion reads «Andmekeskuste ehitusbuumi ja rasketööstuse dekarboniseerimisega kasvab Soome tarbimine
   kiiremini kui uus tootmine ning see tõstab hindu.» (EN «With the data-centre building boom and the decarbonisation
   of heavy industry, Finland's demand grows faster than its new generation, and that will push prices up.») in place
   of «… süvendavad Soome energiapuudust …»: Fingrid's forecast, the slide's source, has Finland a net exporter by
   2035; its point is that generation lags demand.
2. Slide 15 counts for Estonia: its title «Tuumajaama lõpparve Eestile {years} aasta vaates» («The plant's account for
   Estonia over {years} years»), its total «Kokku kasu Eestile {years} aasta jooksul: tarbijad ja riik» («Total gain to
   Estonia over {years} years: consumers and state»), explained «tarbijate sääst pluss riigi tulu või kulu
   hinnavahemehhanismist». The contract's row keeps «tulu/kulu riigile»: it is the state's.

**Consequences:** no figure moves. D-280's two items are settled; the others still wait.

*Deployed* 2026-11-24, finished 09:30, at the owner's word ("Yes, deploy it"): main f1e9f62, the rollback copy
`data/raw-aside/live-14611e94b16a/`, the gate green, 54 presentation sets with none differing, all 143 files as built,
401 without the password or the cookie, the offline copy made, `make live-check` passed in Chromium and WebKit.

## D-282 · 2026-11-24 · The neighbours' slides: the flag in the title, one type scale, the space shared evenly

**Status:** Accepted · 2026-11-24 · the owner: "move the flag into the title of slides 7,8,9. Remove the country name from the card below. assess the slides from the point of view of typography and fix it so that the space is distributed evenly". On R-APP-16.

**What the review found:** the left card's text was set at 17–19 px with gaps of 50–64 px between its blocks; the
right card's table packed Finland's thirteen rows and left 80 px empty above and below Sweden's five; the two cards'
heads differed (the country's name at 30 px against the list's 26 px capitals); Sweden's and Poland's Estonian leads
kept «ehituse buum» where Finland's read «ehitusbuum».

**Decision:**
1. The country's flag stands before the slide's title (72 × 48 px); the country's name is out of the card. The English
   titles read «The case for {country}'s price multiplier», short enough to keep one line beside the flag; the Estonian
   ones are unchanged.
2. The left card has a head like the right card's, «HIND JA NÕUDLUS» / «PRICE AND DEMAND» (24 px capitals; out by D-283), and three
   blocks under ruled heads alike — «IMPORDIHIND» (with «· SE4» on Sweden's, which the card's name carried), «ANDMEKESKUSED»,
   «TÖÖSTUS» — on one scale: heads 18 px, the figures 32 → 42 px, the source and the lines under it 18–19 px. The card is
   600 px wide (560), so that the price's one line (D-277) fits at the larger size.
3. The table's rows take equal shares of the card's height, whatever their number; the text columns split 1.1 : 0.9 so
   that no developer's name or stage is clipped in either language; the totals' line one step smaller (14 / 20 / 26 px).
4. Sweden's and Poland's Estonian leads read «Andmekeskuste ehitusbuum …», as Finland's.

**Consequences:** no figure moves. Measured headless at 1 920 × 1 080 in both languages: no text clipped, the head on
one line, the left card's gaps equal within each slide (19–30 px against 50–64), the right card's 10–19 px.

## D-283 · 2026-11-24 · The neighbours' slides: no head over the left card, «Elektri keskmine hind»

**Status:** Accepted · 2026-11-24 · the owner: "remove the label hind ja nõudlus. replace impordihind with elektri keskmine hind". On R-APP-16.

**Decision:** the left card of slides 7–9 has no head (D-282's «HIND JA NÕUDLUS» out); its first block's head reads
«ELEKTRI KESKMINE HIND» («AVERAGE ELECTRICITY PRICE»), with «· SE4» on Sweden's. The card's three blocks keep
D-282's scale and share its height evenly (gaps 39–64 px, equal within each slide).

**Consequences:** no figure moves; nothing clipped in either language.

## D-284 · 2026-11-24 · The neighbours' slides: the 2024 figures linked to Eurostat

**Status:** Accepted · 2026-11-24 · the owner, asked where Finland's 2.3 TWh of 2024 comes from and told it is
Eurostat's measured consumption (isoc_env_ict_nrg, DATAC, FI, 2024: 2 347 GWh): "make it a link". On R-APP-16.

**Decision:** on slides 7–9 each 2024 figure — the data centres' and the industry's — is a link to Eurostat's data
browser page of its table (`isoc_env_ict_nrg`, `nrg_bal_c`), opened in a window of its own (E-200), its tip the value in
GWh with the table, the country and the year. The page, not the API's file the values are read from: the file
downloads where the reader wants to see the table. The two pages are registered and cached as documents
(`eurostat_db_isoc_env_ict_nrg`, `eurostat_db_nrg_bal_c`); their addresses come with the site's sources (R-NFR-1).

**Consequences:** no figure moves. Every figure in the cards' rows now opens its source.

## D-285 · 2026-11-24 · The neighbours' slides: a company's line set apart from its block

**Status:** Accepted · 2026-11-24 · the owner: "move the google and arctial blocks a little apart from the main blocks they are in". On R-APP-16.

**Decision:** in the left card of slides 7–9 the line on a company — Google and Arctial on Finland's, Brookfield and
Stegra on Sweden's, WBS Power and ArcelorMittal's agreements on Poland's — stands 16 px below the block's own lines
(6 before). The blocks keep sharing the card's height evenly (gaps 31–55 px, equal within each slide).

**Consequences:** no figure moves; nothing clipped in either language.

## D-286 · 2026-11-24 · Finland's slide: Arctial's rendering over the industry block

**Status:** Accepted · 2026-11-24 · the owner, with a screenshot: "in this link … Arctial ympäristövaikutusten arviointiselostus there is a photo I made a screenshot insert it as the header for the tööstus tab on the slide about Finland". On R-APP-16.

**Decision:** over the industry block of slide 7 stands Arctial's rendering of the smelter planned at Kokkola, from the
environmental impact assessment report the slide's 1 050 MW already cite (`arctial_eia_report_2026`): the owner's
screenshot, cropped at the banner's proportions to its whole width and its band from 130 to 370 px (1 294 × 240 px),
so that the stacks and the halls stand in the middle (the owner: "align it so that the plant is in the centre", "raise the centre of the picture a little higher so that more of the plant is in the frame") and saved as `app/public/img/arctial_kokkola.webp` (WebP, 69 kB), shown
100 px high with the corners of the cards. No caption on it (the owner: "remove the caption inside the picture"): the picture
itself links to the report, «Arctial, keskkonnamõju hindamise aruanne, 2026» its tip, and its alternative text names
it. The Arctial line drops its own «(keskkonnamõju hindamine, 2026)», so that the card keeps room; its 1 050 MW link to
the same report.

**Consequences:** no figure moves; the left card's three blocks still share its height evenly (9 px between them, nothing
clipped in either language). The picture is Arctial's, shown with its source as the report publishes it.

## D-287 · 2026-11-24 · The neighbours' slides: the plan's source line in italics

**Status:** Accepted · 2026-11-24 · the owner: "make the caption about fingrid less bold remove the blue highlighting make it italic". On R-APP-16.

**Decision:** the line naming the plan's source under each block's figures — «Fingrid, Q3/2026: «11–35 terawatt-hours by
2035»», and likewise Svenska kraftnät's and PSE's on slides 8 and 9 — is set in italics at regular weight (400, was 600)
in the text's colour; its link keeps its underline, no longer blue.

**Consequences:** no figure moves; nothing clipped in either language.

## D-288 · 2026-11-24 · Finland's slide: Google's 50 % in blue, the 507 MW out

**Status:** Accepted · 2026-11-24 · the owner: "remove 507MW from the slide instead of that highlight 50% in blue". On R-APP-16.

**Decision:** the Google line reads «Google: 13 mld € aastatel 2027–2028; kuni 50 % Loviisa tuumajaamast aastatel
2030–2049», its «50 %» set in the brand's blue at 22 px (as the other figures the lines stress) and linked to Fortum's
release; the megawatts that half of the plant's two units make (507 MW, D-268) are out of the slide. The documentary
value `statistics.dc.fi.loviisa_unit_mw` stays in the repository; the slide no longer reads it.

**Consequences:** no figure moves; the left card gains a line, its blocks 20 px apart.

## D-289 · 2026-11-24 · Finland's slide: the bases Fingrid's own, 2025

**Status:** Accepted · 2026-11-24 · the owner, on the industry's 33.5 TWh (Eurostat, 2024): "put 36 for the year 2025 from the fingrid document", and on the data centres' 2.3: "replace … with 2 in 2025 from the fingrid data the same document where it speaks about the growth of 2035". On R-APP-16.

**Decision:** slide 7's two rows start from Fingrid's base year, from the same sentences of its forecast (Q3/2026, p. 6)
as their 2035 figures: data centres «approximately 2 terawatt-hours in 2025» → 35 TWh, industry «approximately 36
terawatt-hours in 2025» (excluding data centers) → 62 TWh. Two documentary rows with verification records,
`statistics.dc.fi.fingrid_2025_twh` (2) and `statistics.ind.fi.fingrid_2025_twh` (36); each base links to the page with
its own words as the tip (`NbRow.base`). Sweden's and Poland's rows keep Eurostat's 2024. Eurostat's Finnish values stay
in the repository (the Statistics page reads them).

**Consequences:** no figure of the model moves. The arrow now compares one source with itself: the industry's rise
reads 36 → 62, not 33.5 → 62; the 2035 figures are still the tops of Fingrid's ranges (11–35, 35–62; D-280).

## D-290 · 2026-11-24 · The neighbours' slides: whole TWh without a decimal

**Status:** Accepted · 2026-11-24 · the owner: "remove ,0 if the number is whole". On R-APP-16.

**Decision:** the rows' TWh figures show one decimal, a whole number none: Finland 2 → 35 and 36 → 62, Sweden 2,6 → 16,
Poland +15; 2,6, 44,6, +18,4, 0,5, 17,4 and 53,4 keep theirs. The price line keeps its decimal (75,0 is 39,9 × 1,88,
not a whole number).

**Consequences:** no figure moves.

## D-291 · 2026-11-24 · The neighbours' slides: the prices whole, the multiplier as it is

**Status:** Accepted · 2026-11-24 · the owner: "round the price too but not the multiplier on slides 7,8,9". On R-APP-16.

**Decision:** the price line reads the profile's average and the model's price to the euro, the level to two decimals:
«DE 2035 prognoos: 40 ×1,88 → 75 €/MWh», «46 ×1,96 → 90», «57 ×2,10 → 120». The product is computed unrounded
(39,9 × 1,88 = 75,0), so the line may differ from the rounded figures' product by a unit.

**Consequences:** no figure moves.

## D-292 · 2026-11-24 · Sweden's slide: the price SE4's, the rest all Sweden's, said so

**Status:** Accepted · 2026-11-24 · the owner: "for slide 8 of Sweden we consider the price only for SE4 but everything else we look at for Sweden as a whole". On R-APP-16.

**Decision:** the blocks under Sweden's price carry «· KOGU ROOTSI» («· ALL SWEDEN») beside their heads, as the price's
carries «· SE4»: the data centres' and the industry's consumption, Svenska kraftnät's plan and queue and the companies
are the country's, the price the model trades with is SE4's. The table's places keep their bidding areas.

*Deployed* 2026-11-24, finished 10:54, at the owner's word ("Yes, deploy it"), with E-200 and D-282 … D-291: main 27069ea,
the rollback copy `data/raw-aside/live-f1e9f625d3ee/`, the gate green, 54 presentation sets with none differing, all 144
files as built (the picture `img/arctial_kokkola.webp` among them), 401 without the password or the cookie, the offline
copy made, `make live-check` passed in Chromium and WebKit.

**Consequences:** no figure moves. Why the country's demand bears on SE4's price — SE4 has little generation of its own
and takes what flows south over cuts 2 and 4 — stays in the speaker's note and the Q&A (C7).

## D-293 · 2026-11-24 · «Kes selle tegi?»: the author, his role and his address

**Status:** Accepted · 2026-11-24 · the owner: "Kes selle tegi? replace with Andres Ingerman / Fermi Energia Head of AI and Digital communication / andres.ingerman@fermi.ee". On R-PUB-2.

**Decision:** the questions and answers' last answer, in both languages, is three lines: «Andres Ingerman», «Fermi
Energia Head of AI and Digital communication», «andres.ingerman@fermi.ee». The paragraph it replaces — the declaration
of interest in the wording confirmed for the release (OPEN-9, D-124, D-193) — stays in the README and on the deck's
second slide; on the site the author's role at Fermi Energia now stands in its place.

**Consequences:** no figure moves. The site names the author's role and address where it named the relation and the
two properties meant to keep it out of the numbers.

## D-294 · 2026-11-24 · The contract card out of the Model view

**Status:** Accepted · 2026-11-24 · the owner, with a screenshot of the card «Hinnavahe leping: 1 SMR»: "delete this element from mudel". On R-APP-4.

**Decision:** the Model view no longer shows the contract card — its strike slider (40–160 €/MWh), the negative-price
clause's box, the plant's output and capture price, and the four designs' table (hourly and monthly CfD, the two
collars). `app/src/ui/contract.ts` and its test are removed, the questions and answers' «What is the contract card?» /
«Mis on hinnavahe lepingu kaart?» too. The strike (90 €/MWh) and the clause stay in the state and its address; the
deck's fifteenth slide and the sensitivities' money rows still compute the hourly contract with them
(`engine/contract.ts`, `statePaysOf`). The strike can no longer be moved on the page.

**Consequences:** no figure moves.

## D-295 · 2026-11-24 · The deck: the scenarios before the weather years

**Status:** Accepted · 2026-11-24 · the owner: "in esitlus swap slides 5 and 6". On R-APP-16.

**Decision:** the scenarios' slide («Kolm stsenaariumi aastaks 2035») is the fifth, the weather years' («3 ilmaaastat, üks
stsenaarium») the sixth; their speaker notes move with them. The talk's text (`kone_10min.md`) and the Q&A's list of the
slides follow; the neighbours' slides 7–9 now come after the weather years.

**Consequences:** no figure moves.

## D-296 · 2026-11-24 · The deck: the weather years after the neighbours' slides

**Status:** Accepted · 2026-11-24 · the owner: "move slide 6 after slide 9". On R-APP-16.

**Decision:** the weather years' slide («3 ilmaaastat, üks stsenaarium») moves from sixth to ninth, after Poland's: the
order runs 5 the scenarios, 6–8 Finland, Sweden and Poland, 9 the weather years, 10 the price gap — the weather years now
stand right before the weighted prices they explain. Its speaker note moves with it. The talk's text, the Q&A's
references to the slides («slaidid 6–8») and the FAQ's follow; the Q&A's «slaid 9» for the price result, wrong since the
neighbours' slides came in, reads «slaid 10».

**Consequences:** no figure moves.

## D-297 · 2026-11-24 · Poland's slide without WBS Power's line

**Status:** Accepted · 2026-11-24 · the owner, on «WBS Power, üks arendaja: 6 990 MW väljastatud tingimustest»: "remove this line". On R-APP-16.

**Decision:** the data centres' block of Poland's slide (the eighth) ends with PSE's queue, «liitumistingimusi
väljastatud 9,2 GW; taotlusi 2,1 GW»; the line that 6 990 MW of the conditions are WBS Power's (D-279) is out. The
figure stays in the Q&A (C10) and in Poland's speaker note as a caution for questions.

**Consequences:** no figure moves.

## D-298 · 2026-11-24 · Poland's data centres from PSE's own base

**Status:** Accepted · 2026-11-24 · the owner, on the slide's «0,5 TWh · 2024»: "replace with the data from the same document from which 17,4 is taken". On R-APP-16.

**Decision:** the base of Poland's data centres on the eighth slide is PSE's own 2024 figure, 0,6 TWh, from the same
table as its 17,4 TWh of 2036 (PRSP 2027–2036, draft after consultation, p. 29, Tab. 4.3: «Szacowane zapotrzebowanie na
energię elektryczną [TWh] 0,6 17,4 29,4»), as Finland's and its industry's bases are Fingrid's own (D-289). The figure
links to that page and quotes the row. New documentary row `statistics.dc.pl.pse_2024_twh` with its verification; the
Statistics page keeps Eurostat's 0.459 TWh (isoc_env_ict_nrg, DATAC, 2024 its first year with a figure for Poland).

**Consequences:** the slide reads 0,6 instead of 0,5; the talk's text follows. No model figure moves.

## D-299 · 2026-11-24 · Poland's slide without its duplicates

**Status:** Accepted · 2026-11-24 · the owner, on «PSE, 2026: 17,4 TWh (2036) → 29,4 TWh (2040)»: "remove the end of 2040"; on the list's «tingimused väljastatud 9 185 MW · taotlused 2 099 MW»: "remove it as it is a duplicate". On R-APP-16.

**Decision:** on Poland's slide (the eighth) the data centres' line under the base reads «PSE, 2026: 17,4 TWh (2036)»,
without PSE's 2040; the tip keeps the table's whole row. The list of connections ends with «PSE kavas aastaks 2036
3 093 MW» and «kokku 11 284 MW»; the two sums by stage are out, the left card gives them as 9,2 and 2,1 GW.

**Consequences:** no figure moves.

## D-300 · 2026-11-24 · Poland's industry without the agreements' line

**Status:** Accepted · 2026-11-24 · the owner, on «ArcelorMittal, ANWIL, RE Alloys: kehtivad liitumislepingud, 923 MW»:
"remove". On R-APP-16.

**Decision:** the industry block of Poland's slide (the eighth) ends with hydrogen's connection conditions and PSE's
electrolysers of 2036; the line on the three connection agreements in force (923 MW) is out. The figure stays on the
Statistics page and in the Q&A (C11).

**Consequences:** no figure moves; the left card's three blocks spread over the freed height.

## D-301 · 2026-11-24 · Poland's slide without its conclusion

**Status:** Accepted · 2026-11-24 · the owner, on «Andmekeskuste ehitusbuum ja rasketööstuse dekarboniseerimine
kasvatavad Poola elektritarbimist ning see tõstab hindu.»: "delete the label". On R-APP-16.

**Decision:** Poland's slide (the eighth) has its title alone; the conclusion under it (D-271) is out in both languages.
Finland's and Sweden's slides keep theirs. The head keeps its height, so the cards stand where they stand on slides 6
and 7.

**Consequences:** no figure moves.

## D-302 · 2026-11-24 · Poland's slide filled

**Status:** Accepted · 2026-11-24 · the owner, on the eighth slide after D-299 … D-301: "harmonise the Polish slide a lot of empty space". On R-APP-16.

**Decision:** with no conclusion under its title, Poland's cards rise into the title's band (800 px high instead of
740). Its left card, now three short blocks, is set at 1.25 times the size (CSS `zoom` on each block, the card's
padding unchanged), the price's label on its own line above the figures. Every figure linked in a block's lines is
kept on one line (all three neighbours' slides). Measured at 1 920 × 1 080 in Chromium and WebKit, both languages: the
blocks 35–49 px apart (Sweden's 31–52, Finland's 20, before 100), nothing clipped. Finland's and Sweden's slides
unchanged.

**Consequences:** no figure moves.

## D-303 · 2026-11-24 · Poland's data centres with 2040 again

**Status:** Accepted · 2026-11-24 · the owner, on «PSE, 2026: 17,4 TWh (2036)»: "bring back 2040". On R-APP-16. Reverses
D-299's first part; its second part (the list's two sums out) stands.

**Decision:** the data centres' line on Poland's slide reads again «PSE, 2026: 17,4 TWh (2036) → 29,4 TWh (2040)», as
the industry's line does. Measured in Chromium and WebKit in both languages at D-302's size: it fits, nothing clipped.

**Consequences:** no figure moves.

## D-304 · 2026-11-24 · Poland's sub-lines one fact a line

**Status:** Accepted · 2026-11-24 · the owner, on «liitumistingimusi väljastatud 9,2 GW; taotlusi 2,1 GW» and «vesinik:
liitumistingimusi väljastatud 1 620 MW; elektrolüüsereid aastal 2036: 1 500 MW»: "make the wrapping line by line". On R-APP-16.

**Decision:** on Poland's slide each fact under a block's source line stands on its own line: «liitumistingimusi
väljastatud 9,2 GW» / «taotlusi 2,1 GW»; «vesinik:» / «liitumistingimusi väljastatud 1 620 MW» / «elektrolüüsereid
aastal 2036: 1 500 MW» (the hydrogen line at D-302's size does not fit beside its label, so the label stands above
both). Both languages; measured in Chromium and WebKit, nothing clipped, the blocks' spacing unchanged.

**Consequences:** no figure moves.

## D-305 · 2026-11-24 · The lists' totals restyled

**Status:** Accepted · 2026-11-24 · the owner, on Poland's «PSE kavas aastaks 2036 3 093 MW»: "it is laid out in an ugly way". On
R-APP-16.

**Decision:** on the three neighbours' slides a total's label ends with a colon, so that a year in the label no longer
runs into the figure («PSE kavas aastaks 2036: 3 093 MW»). Poland's line holds two totals alone and is set larger,
label and figure in proportion (18 px label, 26 px figure, the total 30 px; before 14, 20 and 26); Finland's and
Sweden's four totals keep their sizes, the line being full. Measured in Chromium and WebKit in both languages,
nothing clipped.

**Consequences:** no figure moves.

## D-306 · 2026-11-24 · Sweden's queue line without SE4

**Status:** Accepted · 2026-11-24 · the owner, on «liitumisjärjekorras 7,3 GW, SE4-s mitte ühtegi; eraldatud või
reserveeritud 3,5 GW»: "remove the mentions of the se4 zone". On R-APP-16. Takes back D-280's «none in SE4» on the slide.

**Decision:** the data centres' line on Sweden's slide (the seventh) reads «liitumisjärjekorras 7,3 GW» / «eraldatud või
reserveeritud 3,5 GW», one fact a line as on Poland's (D-304). The price's head keeps «· SE4» (D-282, the owner's word
that the price is SE4's and the rest all Sweden's); the Statistics page and the speaker note keep their SE4.

**Consequences:** no figure moves.

## D-307 · 2026-11-24 · Sweden's queue at 1 November

**Status:** Accepted · 2026-11-24 · the owner, on the slide's «liitumisjärjekorras 7,3 GW» beside Svenska kraftnät's page
showing «Datacenter 8 200 MW»: "if I follow the link I see something different what is the problem?", then "Yes, update". On R-APP-9 and
R-APP-16.

**Decision:** Svenska kraftnät replaced its queue pages about 10 November: the statistics now stand at 1 November 2026
(«Granskad 10 november 2026») and are rounded to 50–100 MW. Both pages cached again through the pipeline
(`svk_connections_2026_11_01`, `svk_connections_area_2026_11_01`; the copies of 1 October kept), and three rows follow:
the data centres in the queue 8 200 MW (was 7 326), industry 14 200 MW (SE1 10 950, SE2 2 100, SE3 1 150; was
14 612), industry in SE1 10 950 MW (unchanged); none in SE4, as before. Each found again by script in the new copies,
the industry's sum equal to the national table. Sweden's slide reads 8,2 GW and 14,2 GW, its list's total «Svenska
kraftnäti järjekorras: 8 200 MW»; the Statistics page shows the same rows.

**Consequences:** no model figure moves; the research note of 4 November keeps its figures of 1 October as dated.

## D-308 · 2026-11-24 · Brookfield's investment in euros

**Status:** Accepted · 2026-11-24 · the owner, on «Brookfield: kuni 95 mld SEK Strängnäsis 10–15 aastaga»: "do it following the example with Finland and google, the price in euros". On R-APP-16.

**Decision:** Sweden's slide gives Brookfield's investment in euros, as Finland's gives Google's: «Brookfield: kuni
8,7 mld € Strängnäsis 10–15 aastaga». The figure is derived: the release's «up to SEK 95 billion» (4 June 2025) at
the ECB's euro reference rate of that day, 10.9475 SEK per euro (cached as `ecb_exr_sek_2025_06_04`), 95 / 10.9475 =
8.678 bn € (row `statistics.dc.se.brookfield_invest_bn_eur`, recomputed by script). The link's tip quotes the release
and names the rate after the quotation. The krona row stays for the Statistics page.

**Consequences:** no model figure moves.

## D-309 · 2026-11-24 · Sweden's slide without its conclusion

**Status:** Accepted · 2026-11-24 · the owner, on «Andmekeskuste ehitusbuum ja rasketööstuse dekarboniseerimine
kahandavad Rootsi elektri ülejääki ning see tõstab hindu.»: "delete the label". On R-APP-16; as D-301 for Poland.

**Decision:** Sweden's slide (the seventh) has its title alone in both languages; its cards rise into the title's band
as Poland's (D-302). Its left card, fuller than Poland's, is set at 1.06 times, as large as its longest lines allow,
the price still on one line (the label above the figures only from 1.2 times); the industry's queue line on two lines,
one fact a line (D-304). Measured in Chromium and WebKit, both languages: blocks 40–52 px apart, nothing clipped.
Finland's slide keeps its conclusion.

**Consequences:** no figure moves.

## D-310 · 2026-11-24 · Sweden's plan figures as the report prints them

**Status:** Accepted · 2026-11-24 · the owner, on «Svenska kraftnät: 6 TWh (2030) → 27 TWh (2040)»: "I cannot find it in the primary source", then, of the two ways offered, "The figures from the table". On R-APP-16.

**Decision:** the figures 6 and 27 (and hydrogen's 10.0 and 26.7) were read off Figure 5's bars (p. 42); the report
prints neither, and its «27 TWh» stands beside 2050. Sweden's slide now quotes what Table 4 (p. 43) prints, scenario
MM: data centres «2,5 TWh (2026) → 27,1 TWh (2050)», hydrogen production «0,1 TWh (2026) → 35,4 TWh (2050)», each
linked to p. 43, the tip quoting the table's row. The slide's 2035 figures (16 and +18.4 TWh) stay the model's inputs,
the midpoint of MM's 2030 and 2040 read off Figure 5; the tip says so. Measured on the PDF's vectors on 24 November:
MM's data centres 6.3 TWh in 2030 and 26.6 in 2040, so 16 is the midpoint to a whole TWh.

**Consequences:** no figure moves.

## D-311 · 2026-11-24 · Sweden's data centres from Svenska kraftnät's own base

**Status:** Accepted · 2026-11-24 · the owner, on the slide's «2,6 TWh · 2024»: "replace with 2,5 from Svenska". On R-APP-16;
as D-298 for Poland.

**Decision:** the base of Sweden's data centres on the seventh slide is Svenska kraftnät's own, 2,5 TWh in 2026, from
the table of its 2050 figures (Långsiktig marknadsanalys 2026, p. 43, Tabell 4: «Datacenter 2,5 8,8 27,1 40,9 40,9»);
it links to that page and quotes the row. New documentary row `statistics.dc.se.svk_2026_twh` with its verification;
the Statistics page keeps Eurostat's 2.640 TWh of 2024. The talk's text follows (2,5).

**Consequences:** no model figure moves.

## D-312 · 2026-11-24 · Sweden's industry without the north's share

**Status:** Accepted · 2026-11-24 · the owner, on «sellest 11,0 GW põhjas (SE1)»: "remove". On R-APP-16.

**Decision:** the industry block of Sweden's slide reads «liitumisjärjekorras 14,2 GW» alone; the share in SE1
(10 950 MW) stays on the Statistics page.

**Consequences:** no figure moves.

## D-313 · 2026-11-24 · Sweden's industry without its figure line

**Status:** Accepted · 2026-11-24 · the owner, on «44,6 TWh · 2024 → +18,4 TWh · 2035 vesinik»: "remove". On R-APP-16.

**Decision:** the industry block of Sweden's slide has no figure line (a row's `noFig`). The plan's line beneath it
now says what its figures are, since the figure line's «vesinik» no longer does: «Svenska kraftnät, vesiniku tootmine:»
and on the next line «0,1 TWh (2026) → 35,4 TWh (2050)» (Table 4, D-310), then the queue and Stegra. The model's
+18.35 TWh of hydrogen (se2035.hydrogen_twh.a) and Eurostat's 44.6 TWh stay as rows, the latter on the Statistics page.

**Consequences:** no figure moves.

## D-314 · 2026-11-24 · Sweden's industry block: Table 4's new loads

**Status:** Accepted · 2026-11-24 · the owner: "take from the table 2026–2050 … Fossilfritt stål, stålverk; Fossilfritt cement; Raffinaderier; Elfordon; Vätgasproduktion and put it into tööstus". On R-APP-16.

**Decision:** the industry block of Sweden's slide shows, under «Svenska kraftnät, stsenaarium MM, TWh, 2026 → 2050:»,
five rows of Svenska kraftnät's Table 4 (Långsiktig marknadsanalys 2026, p. 43), each figure pair linked to the page
with the table's row as its tip: fossil-free steel 0,1 → 9,6; fossil-free cement 0,0 → 3,0; refineries 0,9 → 2,4;
electric vehicles 3,2 → 23,8; hydrogen production 0,1 → 35,4. The table counts electric vehicles outside industry
(«Elfordon» beside «Industri»); they stand here at the owner's word. Then the queue (14,2 GW) and Stegra, as before.
Measured in Chromium and WebKit, both languages: nothing clipped, blocks 26–38 px apart.

**Consequences:** no figure moves.

## D-315 · 2026-11-24 · Sweden's industry table with units and years

**Status:** Accepted · 2026-11-24 · the owner, on the table's «0,1 → 9,6 … 0,1 → 35,4»: "add the units of measurement and the years". On R-APP-16.

**Decision:** D-314's table has a column for each year, «2026» and «2050» above the figures in the slide's small capitals,
and «TWh» beside each figure; the source line above reads «Svenska kraftnät, stsenaarium MM:». Each figure links to
p. 43 with the table's row as its tip. Measured in Chromium and WebKit, both languages: nothing clipped.

**Consequences:** no figure moves.

## D-316 · 2026-11-25 · The night's check of Finland's and Poland's slides: what was fixed

**Status:** Accepted · 2026-11-25 · under the owner's answers before the night of 24–25 November ("Recheck of FI and PL", "Fix in the branch"). On R-APP-16 and R-APP-9.

**Decision:** two independent checks read every figure, quote, stage, zone and link of the sixth and eighth slides
against the cached documents and fetched the live ones (docs/research/2026-11-25_night_report.md §1). No figure is
wrong and no source has a newer version (Fingrid's Prospects Q3/2026, the Fortum, GTAI, YIT, EUDCA, XTX and
environmental-assessment documents; PSE's list, still «stan na 30.09.2026», byte for byte; the PRSP still the draft
after consultation; Eurostat's two files). Fixed:
- Poland's electrolysers' tip quotes PSE's table verbatim, with its en dash («KSE – łącznie»); so does the row's note.
- Amp Tank's Utajärvi «building» rested on a June article expecting construction later; Kaleva's of 8 October 2026,
  «Amp Tankin datakeskuksen rakentaminen on käynnistynyt Utajärvellä», is cached (`kaleva_2026_10_08_utajarvi`) and
  cited in the row's note. The stage stands.
- PSE's list's title no longer says the file is replaced every month (the state of 30 September was published on
  26 October and is still current).
- The Q&A follows (C6).

**Consequences:** no figure moves.

## D-317 · 2026-11-25 · Proposed: the night's open points on slides 6–8 and the studies

**Status:** Proposed — awaiting the owner's sign-off · 2026-11-25.

**Proposal (each the owner's choice):**
1. Finland's conclusion («… Soome tarbimine kasvab kiiremini kui uus tootmine …», D-281) reads against its source for
   2035: Fingrid's Prospects (p. 10) has production growing faster than consumption in the 2030s and Finland a net
   exporter by 2035 (9–18 TWh); the same page supports it for today («Investment in electricity production in Finland
   is currently lagging behind investment in consumption»). Suggested: «… investeeringud tootmisse jäävad praegu
   tarbimise omadest maha …», or the Nordic surplus falling (p. 9: Sweden's and Norway's from about 50 to 5–15 TWh).
2. Finland's 35 and 62 TWh are the tops of Fingrid's ranges (11–35, 35–62), the ranges quoted beside them; «kuni 35»
   and «kuni 62» would say so on the figure itself.
3. Poland's list may miss two data centres: Lightsource Development Polska's «Węzeł Usług Telekomunikacyjnych» at
   Plewiska Komorniki (300 MW) and Polkowice (250 MW), conditions issued; counted, conditions become 9 735 MW
   (still 9,7 GW against 9,2) and the total 11 834 MW.
4. Poland's hydrogen 1 620 MW counts Orlen's «GGR HyFly Gdańsk» (840 MW) by its name alone.
5. HiPark Piaseczno's conditions (80 MW) are dated 14.11.2024; with the usual two years they may have lapsed by PSE's
   next list.
6. The robustness study at the neighbours' ×1.5–2.5, around the owner's ×1.88–2.10, gives two units 14.1–23.1 €/MWh
   in 90 % of 300 samples (median 19.0) and the contract costing the state in 65 % (×1.0–2.0: 99 %); whether the
   study's range should move.
7. The coupled «each tight on its own» run, on the model since D-194: Estonia 114.0 / 96.5 / 83.3 / 70.7 €/MWh for
   0–3 units against the site's TIGHT profile 119.1 / 105.4 / 94.6 / 84.3 — the fixed profile overstates Estonia by
   5–14 €/MWh and understates two units' effect (30.7 coupled, 24.5 fixed), Finland's price falling 87.1 → 80.7 with
   two units.

## D-318 · 2026-11-25 · energiamudel.ee open to everyone again

**Status:** Accepted · 2026-11-25 · the owner: "remove the password
from the site, it is now open to everyone". On R-DEP-3 and R-DEP-5; it ends D-178.

**Decision:**
1. **`app/public/.htaccess` asks for no password.** The Basic Auth of D-178 and the cookie's branch of D-179 are gone;
   the redirects (`/v5`, `/stat/`) and the caching stay.
2. **`sso.php` stays.** The button «Ava ilma paroolita» of the team's tools page still posts to it and lands on the site; its
   cookie gates nothing now. `make deploy` no longer writes the token into the deployed `.htaccess`.
3. **`validate.deployed` wants 200 from a reader with neither the password nor the cookie**, where it wanted 401. The
   checks still send the cookie; it does no harm.
4. The password file `.htpasswd-v5` and the token `.sso-token-v5` above the document root are left as they are: unused,
   never served. The v3 archive at `v3.energiamudel.ee` keeps its own password.
5. Specification revision 2.132 (`R-DEP-3`). No figure moves.

**Consequences:** D-178's caution about the talk's material holds no longer: the slides' and the demo's invitation to
open the site works for anyone.

## D-319 · 2026-11-25 · The nuclear projects' map in the deck

**Status:** Accepted · 2026-11-25 · the owner: "add to the energiamudel deck, after slide 15, slide 127 of the slides project". On R-APP-16.

**Decision:**
1. **Slide 127 of the Fermi deck** («Tuumaprojektid maailmas» —
   the nuclear projects of Europe and North America by stage, each with its technology and the sites named) **is the
   deck's sixteenth slide**, after the plant's account and before «Try it yourself». Seventeen slides.
2. **A picture, not a port.** The map is drawn by that deck's own component from Natural Earth's geometry; it is shot
   from its dev server at 3840 × 2160 (device scale 2) in Estonian and in English and kept as
   `app/public/img/projects_map_et.webp` and `projects_map_en.webp` (WebP, about 320 kB each); the slide shows the
   page's language. Its frame is that deck's: its own «PUBLIC» and the Fermi wordmark, and a QR code to the Fermi deck's
   page of sources, which is open without the password.
3. **It states no result of the runs**, so the rule that every figure on a slide is read from the runs (D-220) does not
   reach it; its stages and sources are the slides project's, and a change there needs the picture shot again.
4. The talk's note to the slide says what the map is and whose it is, without a figure (D-222).
5. Specification revision 2.133 (`R-APP-16`). No figure moves.

## D-320 · 2026-11-25 · The Adequacy tab taken out

**Status:** Accepted · 2026-11-25 · the owner: "remove the tab", after asking what the Adequacy tab
(Varustuskindlus) is for and pointing at the panel's «Piira liini mõneks kuupäevaks». On R-APP-8 and R-LINK-7; it ends
the view of D-033.

**Context:** no figure of the site, no slide and no set used the tab: it sampled random outages of cables and units in
the browser, on demand. The question it answered for the talk — what if a cable fails — the panel's limit of a line for
some dates (R-LINK-4) answers for a chosen line and dates, and the cables' slide for EstLink 2 and both EstLinks out all
year.

**Decision:**
1. **The page has no Adequacy view:** its button, its section, its module (`app/src/ui/adequacy.ts`), its chart, its
   styles and its Estonian strings are gone. An address with `view=adequacy` opens the Model view, as any view the page
   does not have.
2. **The sampler stays in the engine** (`src/adequacy`, the job's sample path, the presets' outage data, its tests),
   unused by the page: taking it out would change the engine's id and every set's key for no figure. It can go when the
   engine is next changed for another reason.
3. The trilemma slide's talk note points to the panel's limit of a line in place of the view; the Q&A's S33 does the
   same and no longer quotes the sampled figures of 24 November, which the site cannot show again.
4. Specification revision 2.134 (`R-APP-8`, `R-LINK-7`). No figure moves.

## D-321 · 2026-11-25 · The deck's notes taken out

**Status:** Accepted · 2026-11-25 · the owner: "remove the notes from the deck". On
R-APP-16; it ends D-222's notes on the page.

**Decision:**
1. **The deck has no notes:** the bar's «Märkmed» button, the N key, the panel under the frame and its styles are gone,
   and so are the seventeen notes (`NOTES` in `app/src/ui/deck.ts`) and their Estonian. The full-screen button keeps
   its place at the bar's right end.
2. The talk's sentences stay where D-222 took them from, the talk pack (`spikes/presentation-2026-11`); the notes of
   D-319 and D-320 went with the rest.
3. Specification revision 2.135 (`R-APP-16`). No figure moves.

## D-322 · 2026-11-25 · The Calibration page explains itself

**Status:** Accepted · 2026-11-25 · the owner, after an explanation of the page in chat: "you described it well, put such explanations inside the tab". On R-APP-7.

**Decision:**
1. **Eight short paragraphs on the page**, in English and Estonian: one under the page's title (what the replay is
   given and what it is measured against; the scenarios' result is a difference, not a price level), one above the
   three gates, and one under each section's heading — prices, generation, borders, the EstLink 2 counterfactual,
   the engine against the reference, the fitted parameters.
2. **No figure of the data in them.** The words say what a measure means, never what it came to — the tables say
   that — so that a new replay cannot leave the words wrong; a test holds them to it. The page's «About this page»
   stays as it was.
3. Specification revision 2.136 (`R-APP-7`). No figure moves.

## D-323 · 2026-11-25 · Preparing the repository for publication: quotes, prepared answers, internal hosts

**Status:** Accepted · 2026-11-25 · the owner, starting to prepare the repository for GitHub as an open one, to three
points of the audit: "remove all my quotes", "remove the prepared answers to journalists", and the mentions of two
internal hosts. On R-PUB-5 and R-PUB-6.

**Decision:**
1. **The owner's words stand in English.** Every quotation of the owner in the tracked files — 666 of them in 51
   files: this log, the specification, the changelog, the errata, the plan, the research reports, the spikes' comments
   — is replaced by its English translation in plain quotation marks; where a translation already stood in
   parentheses after the original, that translation is kept and the original dropped. The translations are literal;
   interface labels, file names, figures and units are as they were. No tracked text file holds a Cyrillic letter. The
   commit messages before this decision still quote the originals: whether the public repository carries that history
   is the owner's to decide.
2. **The prepared answers are out of the repository.** `spikes/presentation-2026-11/kusimused_ja_vastused.md` is
   untracked and git-ignored; it stays on the owner's machine. The talk's script loses its section of three prepared
   answers. Earlier records that name the file refer to a file kept outside the repository.
3. **Two internal hosts are not named.** The team's tools page and the Fermi deck are called so in comments and
   documents; no code used either host's name. The map slide's picture (D-319) still carries a QR code to the Fermi
   deck's open page of sources: a picture, the owner's to keep or to shoot again.
4. Specification revision 2.137 (`R-PUB-5`). No figure moves.

## D-324 · 2026-11-25 · The public repository starts with a fresh history

**Status:** Accepted · 2026-11-25 · the owner, asked whether the public repository should carry the full history or a
fresh one: "Fresh history". On R-PUB-6, R-REPO-5 and R-PROV-6.

**Context:** the files are clean of what D-323 took out, the history is not: 166 of its commit messages quote the
owner's words in the original, and its earlier trees hold those quotations, the two hosts' names and the prepared
answers. Cleaning one tree can be checked; cleaning 650 commits cannot.

**Decision:**
1. **The public repository carries snapshots of the tree.** `make public` writes main's tree as one commit on the
   local branch `public`; a later call adds one further snapshot on top. The branch is what the owner pushes; `main`
   and its history stay on the owner's machine.
2. **The target checks before it commits:** nothing uncommitted, and no Cyrillic letter and neither host's name in any
   tracked text file (D-323). It pushes nothing.
3. **No snapshot is made yet.** A first snapshot would stay in the public history for good, so it waits until the
   audit's other points are settled: the three pictures that are not the author's, the README, the hosting details in
   the records, the files not tracked.
4. **What the history carried is said in words.** `PROVENANCE.md` notes that the import commit and the later changes
   are in the private history and that commit hashes named in the documents refer to it.
5. Specification revision 2.138 (`R-PUB-6`). No figure moves.

## D-325 · 2026-11-25 · The README rewritten for a reader who meets the repository first

**Status:** Accepted · 2026-11-25 · the owner, to the audit's point that the README was stale and read as a log of the
development: "Rewrite README". On R-DOC-8 and R-PUB-2.

**Decision:**
1. **The front page says what the model is, where it runs and how far to trust it**, in that order: the model in a
   paragraph and four points, the live site, the validation's state in the protocol's own figures, the seven views, how
   to run the application and to rebuild the data, what is where, the documents in the order to read them, the
   predecessors, the licences.
2. **The declaration of interest stands word for word** as the owner confirmed it (D-124, D-193).
3. **The log of milestones and decisions leaves the README**: the status paragraph's history of the gate's figures and
   of each day's changes is in this log, the changelog and the plan, where it was already. The stages' table goes too.
4. **It states what D-324 decided**: the public repository starts from a snapshot, and the documents are the record
   of the history.
5. No requirement changes: R-DOC-8 asked for a front page of this kind. No figure moves.

## D-326 · 2026-11-25 · The owner's edits of the new README

**Status:** Accepted · 2026-11-25 · the owner, on the README of D-325: remove from the declaration everything after
"two BWRX-300 units"; give the first public date as 26 November 2026; remove the paragraph on the validation; remove
the section on the history and the predecessors. On R-DOC-8, R-PUB-2 and R-PUB-4.

**Decision:**
1. **README's declaration of interest is one sentence:** the author works with Fermi Energia, the company developing
   an Estonian nuclear plant of two BWRX-300 units. The questions and answers' "Who made it?" keeps its own wording.
2. **The first public date is 26 November 2026**, the day the public repository is planned for; the site's own
   history (public 17 October, behind a password 26 October – 25 November, D-125, D-178, D-318) stays in this log.
3. **README no longer states the validation gate's figures.** The exports' gate line, the questions and answers and
   the Calibration view still do (R-PUB-4); the test that read the figures in README reads them in the others only.
4. **README no longer names the predecessors or the fresh history**; `PROVENANCE.md` and D-324 keep both.
5. Specification revision 2.139 (`R-PUB-2`, `R-PUB-4`). No figure moves.

## D-327 · 2026-11-25 · Preparing for publication: hosting and machine details out, working files ignored

**Status:** Accepted · 2026-11-25 · the owner, to the audit's last two points — the hosting details in the records and
the files not tracked: "remove the internal workings". On R-PUB-5.

**Decision:**
1. **The documents no longer carry the hosting's own details:** the hosting account's name and the server's paths
   (the password file and the token's file are said to stand above the document root), the site's former login name,
   the hosting company's name (R-NFR-1 says «the existing shared host»), and the name of the owner's external disk.
2. **Two spikes find the predecessors' checkouts beside this one**, by a relative path, in place of the machine's own
   absolute paths (`spikes/finland/prep.py`, `spikes/v3-comparison/accuracy.ts`).
3. **Left as they are:** `sso.php` and the Makefile's lines on the token — working code of the deploy, which hold the
   token's file name and no token; and the Nord Pool collector's `~/Library` paths, the same on any Mac.
4. **The owner's working files are git-ignored**, none committed: `reports/`, `research_notes/`, the PDFs in
   `docs/research/`, `.impeccable/`, `app/stress.html` and `app/stress.ts`, `data/derived/solver-speed/`. They stay on
   the owner's machine.
5. The pictures that are not the author's (Arctial's rendering, the map of nuclear projects) stay, at the owner's
   word: `LICENSE-docs` names what CC BY covers, and `app/public/img/` is not in that list.
6. Specification revision 2.140 (`R-NFR-1`'s wording of the host). No figure moves.

## D-328 · 2026-11-25 · A clean sheet for the public repository: the sampler, the reports, unused prototypes

**Status:** Accepted · 2026-11-25 · the owner, asked what else could be cleaned before the first public snapshot:
"old tests and reports, start from a clean sheet", and, to the set proposed, "Yes, remove it". On R-LINK-7, R-APP-8,
R-DOC-6 and R-PUB-5.

**Decision:**
1. **The outage sampler leaves the engine** (`app/src/adequacy/`, the job's sample path, the three branches of
   `build.ts` a sampled year took, its test). The deterministic path never entered it: its one function read from
   `build.ts`, `tripShare`, was called for a sampled cable only. The statistics it read stay in the presets and the
   export, with their sources. The engine's id moves f397f5212824 → 6594ed7b8a66, so every set is computed again at
   the next deploy.
2. **No figure moves, and it is checked:** the golden fixture is unchanged in V8 and in JavaScriptCore, and the
   opening view and the presentation's 54 sets, computed again (224 years), are the deployed site's to the bit
   (`compare_sets`: none differs).
3. **Out of the repository:** the fifteen night and day reports; nine research notes and seventeen prototype folders
   of `spikes/` that no kept file refers to. A note or a prototype that the site, the methodology, the specification,
   the data's sources, the code or another kept note names stays. This log and the errata still name the removed
   files: they are in the author's private history.
4. **The changelog starts again** at the first public release; the development's log of 2 800 lines stays in the
   private history.
5. **Kept, against the first proposal:** `PLAN.md` — the code cites its design sections (§3) some thirty times; the
   specification's founding research of 2026-09-24; and the tests, which are the live suite, not old ones — the one
   test of a removed thing, the sampler's, went with it.
6. Specification revision 2.141. The methodology's §9.1 says what the Adequacy view was and that it is gone.

## D-329 · 2026-11-25 · The GitHub repository: energiamudel-baltic, private first

**Status:** Accepted · 2026-11-25 · the owner: "create the repository on GitHub yourself"; asked for its name and its
visibility, the owner chose `energiamudel-baltic` and "private first". On R-PUB-6 and R-REPO-5.

**Decision:**
1. **The repository is `andresingerman/energiamudel-baltic`** (https://github.com/andresingerman/energiamudel-baltic), created empty and private by the executor at the
   owner's word — the plan's "never created by the agent" gives way to it. The package's and the citation's name stays
   `energiamudel-v5`.
2. **Private first:** the owner looks at it on GitHub after the first push and makes it public. While it is private,
   the workflow's macOS runs are charged against the account's minutes.
3. **Only the snapshot leaves the machine.** The local remote `github` pushes `public` to the repository's `main` and
   nothing else, and a local `pre-push` hook refuses any other branch — `main` named outright and `--all` included.
   The hook and the remote are this checkout's settings, not files of the repository. Pushing stays the owner's act.
4. **The address is in the first snapshot:** `LICENSE-docs`'s attribution line and `CITATION.cff`'s
   `repository-code`; the snapshot of D-324's first run (817dced), never pushed, is made again with them.
5. Specification revision 2.142 (`R-PUB-6`). No figure moves.

**Done:** the snapshot 5518402 pushed to the private repository's `main` on 2026-11-25 at the owner's word ("Yes, push it"): one commit without parents, the repository's only branch; nothing of `main`'s history left the machine.

## D-330 · 2026-11-25 · The check for vulnerabilities before the repository opens

**Status:** Accepted · 2026-11-25 · the owner: "check it for vulnerabilities", and to the findings "Yes, fix and push".
On R-NFR-10 and R-PUB-6.

**Found:**
1. **`certifi` 2026.7.22, pinned in `constraints.txt`, carries a critical advisory** (GHSA-6q48-6c7w-9gw2): its bundle
   trusts a root whose intermediate keys are compromised, so an attacker on the path who holds one can forge an HTTPS
   connection. It reaches the data pipeline alone — its fetches, and the ENTSO-E token they carry — never the page.
2. Nothing else known: the application's 78 npm packages (`npm audit`) and the other 33 Python packages (the OSV
   database) are clean.
3. The page's code: no `eval` or the like; the one outside input, the scenario text of a link, is held to the schema
   — an enumeration or lower-case letters, digits and underscores for every text field — and its error is shown as
   text; every outside link opens with `noopener`; no request leaves the page's origin.
4. The Python: no shell, no unpickling, archives read member by member; SQL takes table names of its own.
5. The live site serves no dot file and redirects to HTTPS, and sends no security header (HSTS, `nosniff`, a content
   security policy, frame options). GitHub's own protections are off while the repository is private.

**Decision:**
1. **`certifi` is pinned at 2026.10.19**, which the advisory names as fixed and the database knows nothing against.
2. **The workflow states its permissions:** `contents: read`, the account's default written down.
3. **Left for the owner's word, each needing a deploy or the repository public:** the site's security headers;
   `sso.php`, which gates nothing since D-318; and on GitHub, once public — alerts for dependencies, secret scanning
   with push protection, protection of `main`, private reports of vulnerabilities.
4. No figure moves.

## D-331 · 2026-11-25 · Security headers on the site; sso.php taken out

**Status:** Accepted · 2026-11-25 · the owner, on the two points D-330 left for the site: "do the headers; sso.php is
not needed". On R-DEP-3, R-DEP-5 and R-NFR-1.

**Decision:**
1. **The site sends four headers with every answer** (`app/public/.htaccess`):
   `Strict-Transport-Security: max-age=31536000` — HTTPS only from the first visit on, for a year, this host alone;
   `X-Content-Type-Options: nosniff` — a file is what the server says it is (the server's types for the scripts, the
   styles and the WebAssembly were checked: they are right); `X-Frame-Options: DENY` — no other site shows this one
   in a frame; `Referrer-Policy: strict-origin-when-cross-origin`.
2. **No content security policy yet.** The page's WebAssembly, its workers and its inline styles would each need an
   exception, and a wrong one stops the computation; it waits for a test of its own.
3. **`sso.php` is gone**, with what served it: the Makefile no longer reads the token over ssh, `validate.deployed`
   and the browser check send no cookie and fetch the site as any reader does. `DEPLOY_AUTH` still logs in where a
   site is shut. The files `.sso-token-v5` and `.htpasswd-v5` above the document root are the owner's to delete; the
   button of the team's tools page that posted to `sso.php` will find no page, and is that page's to change.
4. **The deploy checks the headers:** `validate.deployed` fails when the live page comes without one of the four
   (a test holds it to that), so a host's change that drops them is seen at the next deploy.
5. Specification revision 2.143. No figure moves. The headers reach the site at the next deploy, the owner's word.

**Done:** deployed on 2026-11-25 at the owner's word ("Yes, deploy"), main c04fac9: the rollback copy `data/raw-aside/live-0969630d3722/`; the sets computed again under the engine's id 6594ed7b8a66 (D-328), the opening view and the presentation's 54 sets none differing from the site's before; 146 files as built, 200 to a reader, all four headers sent; `make live-check` passed in Chromium and WebKit; `sso.php` answers 404.

## D-332 · 2026-11-25 · The repository is public

**Status:** Accepted · 2026-11-25 · the owner: "make the repository public". On R-PUB-6; it closes the preparation of
D-323 to D-331.

**Decision:**
1. **`andresingerman/energiamudel-baltic` is public** since 2026-11-25. It holds three snapshot commits on `main`
   (5518402, 1004101, 864d57f), each under the noreply address, and nothing of the development history.
2. **Checked before the switch:** each of the three commits scanned again — no key of `.env`, no private key or
   token, no personal address or path, no hosting detail, no Cyrillic letter, neither internal host; GitHub's `main`
   the local `public` to the commit; one branch, no tag. The workflow had passed on all three.
3. **Checked after it, as a reader without a login:** the page and the README answer, the licence is read as
   AGPL-3.0, one branch and three commits are seen, and an anonymous clone brings 481 files.
4. **Still the owner's to decide:** GitHub's protections that a public repository may have — alerts for dependencies,
   secret scanning with push protection, protection of `main`, private reports of vulnerabilities (D-330).
5. Specification revision 2.144 (`R-PUB-6`). No figure moves.

**Done, the same day at the owner's word ("Yes, turn them on"):** alerts for vulnerable dependencies (alerts alone, no automatic pull requests); secret scanning with push protection; `main` protected against force pushes and deletion, the owner included, which a snapshot's ordinary push passes; private reports of vulnerabilities. GitHub showed no alert of either kind when they were turned on. To rewrite the public history the protection of `main` would have to be lifted first.

## D-333 · 2026-11-25 · The open repository on the deck's last slide

**Status:** Accepted · 2026-11-25 · the owner: "add a notice of the open repository on GitHub on the last slide, and
a QR". On R-APP-16.

**Decision:**
1. **Under the three steps of «Try it yourself»** the last slide says that the model's code is open on GitHub, in
   the page's language: a kicker, a headline, the address `github.com/andresingerman/energiamudel-baltic` and a line
   on what is there. The address and the code are links to the repository.
2. **The address as a QR code**, 231 px a side on the stage (7 px a module), drawn as an inline SVG of the code's
   dark modules: version 4, error correction M. It was made once from the address with the library `uqr`, which is
   no dependency of the application, and is kept in `deck.ts` as the shape; a browser's own reader scanned it back
   to the address. A test holds the shape to the address, so a new address needs a new code.
3. The slides' rule that no third-party address stands in their markup (R-NFR-1) holds: the repository is the
   model's own, and the test lets that one address through.
4. Specification revision 2.145 (`R-APP-16`). No figure moves.

## D-334 · 2026-11-25 · The Documentation view names the repository

**Status:** Accepted · 2026-11-25 · the owner: "make a mention of GitHub in the Documentation view". On the
Documentation view's requirement and R-PUB-6.

**Decision:**
1. **One line under the view's tabs, on each of them** — the short methodology, the full one, the questions and
   answers, the sources — says that the model's code, data and documents are open on GitHub and links to
   `github.com/andresingerman/energiamudel-baltic`, in the page's language. The link opens in a tab of its own.
2. The address is written once (`REPO` in `app/src/ui/labels.ts`) for this line and the deck's last slide (D-333).
3. The questions and answers are left as the owner cut them (D-293): no question on the code is added.
4. Specification revision 2.146. No figure moves.

**Done:** D-333 and D-334 deployed on 2026-11-25 at the owner's word ("Yes, deploy"), main 8ed4123: the rollback copy `data/raw-aside/live-c04fac91338d/`; the opening view and the presentation's 54 sets none differing; 146 files as built, 200 to a reader, all four headers sent; `make live-check` passed in Chromium and WebKit. On the live site the last slide's code scanned back to the repository's address and the Documentation view's line linked to it.

## D-335 · 2026-11-25 · The short Estonian methodology checked against the model

**Status:** Accepted · 2026-11-25 · the owner: "check the correctness of what is written in «Metoodika lühidalt»",
and to the five points found, "Yes, fix them". On the methodology's requirement and R-PUB-4.

**Checked:** every claim of `docs/methodology_et.md` against the opening state, the presets, the validation's files
and the page — the two-day window, oil shale's entry by the day, the fleets and the owner's wind and solar beside
S1's own, the unit's 315 MW, the weather years and their weights, the fuel and CO₂ prices, the neighbours' levels
and averages, the lines out in 2035, the bids, the gas bid's adder and its level in 2035, Kruonis's four steps, the
validation's errors and the EstLink 2 effect, the sensitivity table's rows, the limits. About thirty hold.

**Corrected, five:**
1. **The contract card** it named left the Model view on 2026-11-24 (D-294): the text now names the sensitivity
   table's row and the deck's slide, which compute the state's payment from the run with the plant.
2. **The average price below the record:** "1–5 €/MWh" read 2–6 in 2023–2025 by the validation's files, and up to 7
   in 2026.
3. **Kruonis:** "about half as much" understated it — two to three times less than on the day-ahead market in
   2023–2025.
4. **The links:** ERAA's hourly capacities are the land borders' alone; the submarine cables run at their ratings
   with the typical availability of ENTSO-E's HVDC statistics, Lithuania–Poland on Litgrid's plan, Harmony Link in
   service.
5. **Its date,** 28 October, is 25 November.

And one in the English methodology it defers to: the replays' average below the record, 1.4–7.0 €/MWh with 2024's and
2026's figures of an earlier run, is 1.6–6.6 with the figures the Calibration view shows.

No requirement changes. No figure of the model moves.

## D-336 · 2026-11-25 · The full methodology checked against the repository

**Status:** Accepted · 2026-11-25 · the owner: "now check the full methodology", and to the findings, "Yes, fix them".
On the methodology's requirement and R-PUB-4. One finding is left open for the owner: point 5.

**Checked:** `docs/methodology.md`, all of it, in six parts by six readers who were given the code and the committed
files and not each other's conclusions — about 700 claims, of which about 610 held. The engine's section was the
cleanest: the gap table and the opening's prices were computed again and came out as written. The 67 findings were
drafted as 83 exact replacements, checked together — each occurring once, none overlapping — and applied in one pass.

**Corrected:**
1. **Wrong facts.** No slide of the deck states the declaration of interest (the text said the second did); the
   table of the four scenarios has no capture-price row; the storage of the gap test's weeks is 4.6 GW, not 4.0;
   waste's availability factor is 0.941, not 0.943; the model's average in 2020–2021 is 11–16 €/MWh above the record,
   not 12–17; a lineage record of a page no longer cited stays until its file is deleted, a clean build does not drop
   it; the replay of 2020 does meet the case of E-160 at the register's adder, and D-165's mend acts there.
2. **What the page no longer has**, each now told as the past it is: the contract card with its strike's slider and
   four designs (D-294), the deck's notes (D-321), the one-page Presentation's blocks (D-249), the panel's chips of
   family, target year and presets, the sensitivities as cards (D-195), the banner of the validation's state (D-201).
3. **The deck as it stands:** seventeen slides in the present order, the neighbours' slides as the code draws them,
   the map of nuclear projects (D-319), the repository's notice and QR code (D-333).
4. **Figures of the run before D-171** given as current in the calibration's section — Kruonis's grid, the Δ table,
   2020–2022's errors, the margin over v4, 2024's duration curve — are the committed files' now, the earlier ones
   attributed to D-164's gross basis.
5. **The batteries' cycling cost Δ — a finding about the model, left open.** The register's 71.5 €/MWh is the fit of
   2026-03-12 to 2026-09-30. `fit_delta.ts` fits to the end of the year's data, and on the data as they stand, with
   October in, gives 60.5. The text said `make fit` rewrites the same values; it now says what is true. **The refit is
   not adopted:** the register and every figure of the site stay on 71.5 until the owner decides.
6. **Since today:** the workflow runs on the public repository (D-329, D-332); the Calibration view's words (D-322)
   and the Documentation view's line on the repository (D-334) are described; the lines' variants on the opening
   scenario were computed again on the present opening, 101.7 / 100.6 / 103.5 €/MWh with both planned lines in service
   and 107.5 / 109.0 / 109.3 at nameplate.
7. Three stale lines outside it: the Makefile's help for `browser-check` and `deploy`, and the workflow's header.

**Not touched:** the sensitivity table's figures in §8, which no reader computed again; three figures of §3 and §4
that need the raw workbooks; the dated timings. No requirement changes. No figure of the model moves.

## D-337 · 2026-11-25 · The questions and answers taken out

**Status:** Accepted · 2026-11-25 · the owner: "remove the questions and answers" (the Documentation view's tab
«Küsimused ja vastused»). On R-APP-9, R-PUB-2 and R-PUB-4; it ends the questions and answers of D-293.

**Decision:**
1. **The Documentation view has three tabs in Estonian and two in English:** the short methodology and the full one
   (Estonian), the methodology (English), and the Sources. The tab of the questions and answers is gone.
2. **`docs/faq.md` and `docs/faq_et.md` leave the repository.** README's reading order starts with the methodology.
3. **What the questions and answers alone carried goes with them, and is said here so that it is the owner's choice
   and not an oversight:** "Who made it?" was the one place on the site that named the author, his role at Fermi
   Energia and his address, and with it the declaration of interest. README still states the declaration, in the
   owner's one sentence (D-326); the site itself now states neither. The validation gate's figures, which the
   questions and answers quoted, stay in the exports' gate line, the methodology's gate status and the Calibration
   view; the test that read them in the questions and answers reads the methodology's head.
4. The short Estonian methodology's last section no longer points to the tab, and says where the code is.
5. Specification revision 2.147. No figure moves.

**Done:** D-335, D-336 and D-337 deployed on 2026-11-25 at the owner's word ("Yes, deploy"), main 0abd186: the rollback copy `data/raw-aside/live-8ed412314716/`; the opening view and the presentation's 54 sets none differing; 144 files as built, 200 to a reader, all four headers sent. `make live-check` passed in Chromium. In WebKit the browser's own process crashed twice right after the deploy, at two different steps ("Target crashed", then the page closed while it waited), with no failed check before either; run again three times, it passed all sixteen checks each time. Nothing of the page's computing changed with this deploy, and the crash was not met again: it is set down as seen, its cause not found. On the live site the Documentation view shows three tabs in Estonian and both methodologies as corrected.

