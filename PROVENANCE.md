# Provenance of imported files

SPECIFICATION.md R-PROV-6, R-REPO-2: every file this repository took from a predecessor is
listed here with its source repository, commit and path. The import commit adds the files
exactly as they were at the source commit; any later change is visible with
`git log -p -- <path>` and summarised in the last column.

The public repository starts from a snapshot of the tree, not from the development history (DECISIONS D-324): the
import commit and the later changes are in the author's private history, so in the public repository the last column
is the record of what changed, and the commit hashes of this repository named in the documents (`main 9d5326c` and the
like) refer to that private history.

Source repositories:

- **v4** — local repository `energiamudel-v4` (reference model, to be archived read-only),
  commit `57ed24a3070346b6ab179d8d4e4372471c7e9eed` (2026-09-23).
- **v3** — `andresingerman/energiamudel`, commit `328aa9b50f692165560dba429f6900edef92a95a`
  (2026-09-24), written by Andres Ingerman; the repository has no licence file, and its author
  releases the ported functions under this repository's AGPL-3.0-or-later (DECISIONS D-016). Its
  functions were ported to TypeScript, not copied (R-REPO-2); the blob hashes identify the files.
  The deck (D-220) is ported from the same repository's commit
  `e501c633dbd45319344744ed6a210a82e3e9ea58` (2026-10-17), read from the local checkout `energiamudel-v3.nosync`.

| Path here | Source | Path there | Change in v5 |
|---|---|---|---|
| `pipeline/__init__.py` | v4 `57ed24a3` | `pipeline/__init__.py` | docstring for v5 (Stage 2, R-DATA-3) |
| `pipeline/lineage.py` | v4 `57ed24a3` | `pipeline/lineage.py` | docstring requirement id only (R-DATA-3) |
| `pipeline/sources/__init__.py` | v4 `57ed24a3` | `pipeline/sources/__init__.py` | `cached_get` refuses a 200 response that is not a PDF when a PDF is expected |
| `pipeline/sources/entsoe.py` | v4 `57ed24a3` | `pipeline/sources/entsoe.py` | A25 net positions and A95 unit master data added; the Sweden country code removed |
| `pipeline/sources/tyndp.py` | v4 `57ed24a3` | `pipeline/sources/tyndp.py` | nodes of v5's six zones; `mm_meta` returns the scenario; DE/GA `.xlsb` parser added |
| `pipeline/sources/tyndp_files.txt` | v4 `57ed24a3` | `pipeline/sources/tyndp_files.txt` | unchanged |
| `pipeline/sources/eraa.py` | v4 `57ed24a3` | `pipeline/sources/eraa.py` | unchanged |
| `pipeline/sources/btd.py` | v4 `57ed24a3` | `pipeline/sources/btd.py` | docstring (tables and requirement ids) |
| `pipeline/sources/fingrid.py` | v4 `57ed24a3` | `pipeline/sources/fingrid.py` | datasets narrowed to EstLink (55, 112, 115) |
| `pipeline/sources/openmeteo.py` | v4 `57ed24a3` | `pipeline/sources/openmeteo.py` | grid points narrowed to EE, LV, LT |
| `pipeline/sources/eex.py` | v4 `57ed24a3` | `pipeline/sources/eex.py` | unchanged |
| `pipeline/sources/worldbank.py` | v4 `57ed24a3` | `pipeline/sources/worldbank.py` | unchanged |
| `pipeline/sources/catalogue.py` | v4 `57ed24a3` | `pipeline/sources/catalogue.py` | unchanged |
| `pipeline/register.py` | v4 `57ed24a3` | `pipeline/register.py` | rewritten: v5 purposes, per-document rows, software list |
| `pipeline/history.py` | v4 `57ed24a3` | `pipeline/history.py` | rewritten: v5 job list (D-002, D-004, D-005) |
| `pipeline/smoke.py` | v4 `57ed24a3` | `pipeline/smoke.py` | rewritten: real fetches into a temporary cache |
| `db/__init__.py` | v4 `57ed24a3` | `db/__init__.py` | unchanged |
| `db/schema.sql` | v4 `57ed24a3` | `db/schema.sql` | v5 tables: boundary_price and chp_floor dropped; tyndp_price, scheduled_exchange, net_position, balancing_cb, tso_series, jao_series, umm_message, parameter added; direction on transmission outages |
| `db/build.py` | v4 `57ed24a3` | `db/build.py` | loaders for the new tables, A78 direction and de-duplication (R-DATA-11), page records linked to their document; loaders of dropped sources removed |
| `db/check.py` | v4 `57ed24a3` | `db/check.py` | rewritten: the Stage 2 gate |
| `tests/test_lineage.py` | v4 `57ed24a3` | `tests/test_lineage.py` | unchanged |
| `tests/test_entsoe.py` | v4 `57ed24a3` | `tests/test_entsoe.py` | A25 and A95 parameters and the A95 parser test added |
| `tests/test_config.py` | v4 `57ed24a3` | `tests/test_config.py` | rewritten for v5's zone graph |
| `tests/test_sources.py` | v4 `57ed24a3` | `tests/test_sources.py` | tests of dropped sources removed; TYNDP, ERAA tests on v5 borders; JAO, UMM, xlsb, migration tests added |
| `tests/test_db.py` | v4 `57ed24a3` | `tests/test_db.py` | v5 tables and documentary rows; net-position sign and outage de-duplication tests added |
| `tests/test_register.py` | v4 `57ed24a3` | `tests/test_register.py` | rewritten for v5's register |
| `data/documentary/scenarios.csv` | v4 `57ed24a3` | `data/documentary/scenarios.csv` | rows of EE, LV, LT only; owner-preset rows point at data/documentary/v3_presets.json (D-002); corrections and additions of the page check (ERRATA E-007, E-010, E-018) |
| `data/documentary/links.csv` | v4 `57ed24a3` | `data/documentary/links.csv` | rows of the five v5 borders only (D-002); page citations corrected (E-011) |
| `data/documentary/fuel_paths.csv` | v4 `57ed24a3` | `data/documentary/fuel_paths.csv` | unchanged |
| `data/documentary/tech_parameters.csv` | v4 `57ed24a3` | `data/documentary/tech_parameters.csv` | the 44 `v3_meta` rows removed (D-002); corrections of the re-extraction and page checks (E-006, E-008, E-009, E-010, E-014) |
| `LICENSE` | v4 `57ed24a3` | `LICENSE` | unchanged at import |
| `pipeline/config.py` | v4 `57ed24a3` | `pipeline/config.py` | derived: the technology table unchanged; zones, tiers and borders rewritten for v5 (D2) |
| `data/documentary/v3_presets.json` | v4 `57ed24a3` | `reference/v3_presets.json` | unchanged (itself transcribed from v3 `77a51b0`, see its `origin` block) |
| `LICENSE-docs` | v4 `57ed24a3` | `LICENSE-docs` | rewritten for v5 (work name, repository URL left to publication) |
| `CITATION.cff` | v4 `57ed24a3` | `CITATION.cff` | rewritten for v5 |
| `.gitignore`, `.env.example`, `pyproject.toml`, `Makefile` | v4 `57ed24a3` | same | rewritten for v5's scope |
| `app/src/engine/clearing.ts` | v3 `328aa9b` | `app/src/coupler.js` (blob `ea7a49d1`), `blockMW` lines 211–216, `clearSegment` 272–341, `solveHour` 343–433 | ported to TypeScript (M2, R-ENG-2): the boundary zones are offers of their core zone instead of v3's elastic neighbour anchored at the observed flow (R-BND-3); a segment short at VOLL or long at the floor assigns its shortfall or surplus to its zones before the flows are read, so the split on a link limit holds there too (D-017); removed with the two-pass engine on 2026-10-18 (D-132), the shortage probe kept as `app/test/clearing.test.ts` |
| `app/src/engine/storage.ts` | v3 `328aa9b` | `app/src/engine.js` (blob `98cd4263`), `simulateBattery` lines 143–189, `simulateBatteryCapped` 191–226 | ported to TypeScript (M2, R-ENG-3): one programme for both, the cap a budget of discharge steps per period (a day, or Kruonis's week); value-to-go kept for two hours; sizes bounded; buy and sell prices may differ; FIFO matching and the pass-two store added (R-ENG-4, D-018); removed with the two-pass engine on 2026-10-18 (D-132) |
| `app/src/ui/deck.ts` | v3 `e501c63` | `app/src/presentation_slides.js` (blob `0f36e561`), `app/src/presentation_slides_en.js` (blob `bea83df8`), `app/src/presentation.js` (blob `ef70ef3b`) | ported to TypeScript (D-220, R-APP-16): the twelve slides' layouts, marks and palette; every figure read from the runs shown in place of v3's snapshot (`presentation_numbers.js`, not ported); v5's four scenarios in place of v3's gas and nuclear; the stage in the page with a full-screen button in place of v3's overlay; the text through `et.ts`. The slide on the model's accuracy (`s12`, D-223, proposed) and the slide of the past years beside the market (`s13`, D-229) are v5's own, not ported |

**Not imported from v4** (SPECIFICATION.md R-REPO-3 and DECISIONS.md D-002): `model/`, `docs/`,
`spikes/`, `reference/`, `pipeline/inventory.py`, `db/export.py`, the fetchers of sources v5
does not use (PSE, Svenska kraftnät, Energinet, Energimyndigheten, ECB, Nord Pool) and
`data/documentary/coal_pscmi.csv`.

**Raw data** migrated from v4's cache is not a file of this repository (it is git-ignored);
its provenance is each file's lineage record, checked by SHA-256 on migration
(`pipeline/migrate_v4.py`, R-DATA-9).
| `app/public/fonts/D-DIN.woff2` | v4 `57ed24a3` | `spikes/left-panel/fonts/D-DIN.woff2` | unchanged (SHA-256 41b210fa…); SIL OFL 1.1, Datto Inc.; removed with the move to Montserrat on 2026-11-02 (D-197) |
| `app/public/fonts/D-DIN-Bold.woff2` | v4 `57ed24a3` | `spikes/left-panel/fonts/D-DIN-Bold.woff2` | unchanged (SHA-256 90072887…); removed on 2026-11-02 (D-197) |
| `app/public/fonts/OFL-D-DIN.txt` | v4 `57ed24a3` | `spikes/left-panel/fonts/COPYING.txt` | renamed; the licence of D-DIN; removed on 2026-11-02 (D-197) |
| `app/public/fonts/montserrat-{400,500,600,700,800}-{latin,latin-ext}.woff2` | Fermi `sise` `a49f7532` | `public/fonts/` (the same names) | unchanged: Montserrat 9.000 as Google Fonts serves it, SIL OFL 1.1, The Montserrat Project Authors (D-197) |
| `app/public/fonts/OFL-Montserrat.txt` | — | — | the SIL OFL 1.1 text under Montserrat's copyright line (D-197) |
| `app/index.html` (the wordmark's `<svg>`), `app/public/favicon.svg` | — | Montserrat ExtraBold 9.000 | the glyphs' outlines drawn by fontTools' `SVGPathPen` for ENERGIAMUDEL and V5, the tile in Fermi's green #15C75D (D-197) |
