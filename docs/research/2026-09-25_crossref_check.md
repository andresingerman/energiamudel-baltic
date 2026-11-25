# Crossref check of the SPECIFICATION.md §17.2 references marked "verify"

Checked 2026-09-25 against the Crossref REST API (`api.crossref.org`) by an AI assistant (Claude) for M2 (R-PROV-3, PLAN §3.7), with no e-mail, token or `mailto` parameter and at most about 2 requests per second. The results are recorded in ERRATA E-037 and in the reference list of `docs/methodology.md`.

Secondary sources were used only where Crossref cannot answer. For [L25], the arXiv API and DataCite: arXiv DOIs are DataCite DOIs. For [L33], the arXiv API, to check the subtitle against the abstract.

Conventions:
- "Year" is Crossref `issued`. None of these Elsevier records carries a `published-online` date. Where the printed year differs, the DOI registration date (`created`) is given as context only.
- "Issue: not given by Crossref" means the field is absent from the record.
- DOIs are case-insensitive. Crossref returns them in lower case.
- Typographic differences (em dash vs en dash vs hyphen, non-breaking spaces, `&amp;` entities, curly apostrophes) are noted but not counted as errors.
- The raw JSON and XML responses were not kept; the query URLs below reproduce them.

Headline: 4 of the 16 are correct as printed (L6, L7, L8, L27), and L25 is correct as a preprint. Real errors:
- **L9** has a DOI that resolves to a different paper.
- **L30** lists an author (Wagner, F.) who is not on the paper.
- **L12** misses an author (Eicke, A.) and has the wrong year.
- **L31, L32, L33** have paraphrased titles and wrong first-author initials or first authors.

---

## [L6]

**As printed in the spec:**

> [L6] Ergemen, Y.E., Haldrup, N., Rodríguez-Caballero, C.V. (2016). Common long-range dependence in a panel of hourly Nord Pool electricity prices and loads. *Energy Economics*, 60, 79–96. https://doi.org/10.1016/j.eneco.2016.09.008 — verify

**Crossref record:**

> Ergemen, Y.E., Haldrup, N., Rodríguez-Caballero, C.V. (2016). Common long-range dependence in a panel of hourly Nord Pool electricity prices and loads. *Energy Economics*, 60, 79–96. https://doi.org/10.1016/j.eneco.2016.09.008

**Verdict:** **Verified as printed.**

- Authors (Crossref, in order): Yunus Emre Ergemen; Niels Haldrup; Carlos Vladimir Rodríguez-Caballero — match.
- Year: issued 2016-11 — match. Volume 60 — match. Issue: not given by Crossref. Pages 79-96 — match.
- Title — match (Crossref stores a non-breaking space in "and loads"; typographic only).

**Query URLs:**

- <https://api.crossref.org/works/10.1016/j.eneco.2016.09.008>

---

## [L7]

**As printed in the spec:**

> [L7] Rinne, S. (2019). Radioinactive: Do nuclear power plant outages in France affect the German electricity prices? *Energy Economics*, 84, 104593. https://doi.org/10.1016/j.eneco.2019.104593 — verify

**Crossref record:**

> Rinne, S. (2019). Radioinactive: Do nuclear power plant outages in France affect the German electricity prices? *Energy Economics*, 84, 104593. https://doi.org/10.1016/j.eneco.2019.104593

**Verdict:** **Verified as printed.**

- Author: Sonja Rinne (sole author) — match.
- Year: issued 2019-10 — match. Volume 84, article number 104593 — match. Issue: not given by Crossref.
- Title — match.

**Query URLs:**

- <https://api.crossref.org/works/10.1016/j.eneco.2019.104593>

---

## [L8]

**As printed in the spec:**

> [L8] Keles, D., Dehler-Holland, J., Densing, M., Panos, E., Hack, F. (2020). Cross-border effects in interconnected electricity markets — an analysis of the Swiss electricity prices. *Energy Economics*, 90, 104802. https://doi.org/10.1016/j.eneco.2020.104802 — verify

**Crossref record:**

> Keles, D., Dehler-Holland, J., Densing, M., Panos, E., Hack, F. (2020). Cross-border effects in interconnected electricity markets - an analysis of the Swiss electricity prices. *Energy Economics*, 90, 104802. https://doi.org/10.1016/j.eneco.2020.104802

**Verdict:** **Verified as printed.**

- Authors: Dogan Keles; Joris Dehler-Holland; Martin Densing; Evangelos Panos; Felix Hack — match, same order.
- Year: issued 2020-08 — match. Volume 90, article number 104802 — match. Issue: not given by Crossref.
- Title — match. Crossref has a hyphen "-" where the spec has an em dash "—" before "an analysis"; typographic only.

**Query URLs:**

- <https://api.crossref.org/works/10.1016/j.eneco.2020.104802>

---

## [L9]

**As printed in the spec:**

> [L9] Beran, P., Pape, C., Weber, C. (2019). Modelling German electricity wholesale spot prices with a parsimonious fundamental model — Validation & application. *Utilities Policy*, 58, 27–39. https://doi.org/10.1016/j.jup.2019.04.001 — verify

**Crossref record:**

> Beran, P., Pape, C., Weber, C. (2019). Modelling German electricity wholesale spot prices with a parsimonious fundamental model – Validation & application. *Utilities Policy*, 58, 27–39. https://doi.org/10.1016/j.jup.2019.01.008

**Verdict:** **Verified with corrections — the printed DOI is wrong.**

- **DOI:** printed `10.1016/j.jup.2019.04.001` resolves in Crossref to a *different* article: Lindberg, K.B., Seljom, P., Madsen, H., Fischer, D., Korpås, M. (2019). Long-term electricity load forecasting: Current and future trends. *Utilities Policy*, 58, 102–119. Correct DOI: **10.1016/j.jup.2019.01.008**.
- Authors: Philip Beran; Christian Pape; Christoph Weber — match. Year: issued 2019-06 — match. Journal *Utilities Policy*, volume 58, pages 27-39 — match. Issue: not given by Crossref.
- Title — match. Crossref uses an en dash "–" (spec: em dash "—") and stores "&" as the HTML entity `&amp;`; typographic only.
- Also in Crossref, not to be confused with it: an SSRN version of the same title, 10.2139/ssrn.3110850 (2018).

**Query URLs:**

- <https://api.crossref.org/works/10.1016/j.jup.2019.04.001>
- <https://api.crossref.org/works?query.bibliographic=Modelling%20German%20electricity%20wholesale%20spot%20prices%20with%20a%20parsimonious%20fundamental%20model%20Validation%20application%20Beran%20Pape%20Weber&rows=5>
- <https://api.crossref.org/works/10.1016/j.jup.2019.01.008>

---

## [L11]

**As printed in the spec:**

> [L11] Unger, E.A., Ulfarsson, G.F., Gardarsson, S.M., Matthiasson, T. (2017). A long-term analysis studying the effect of changes in the Nordic electricity supply on Danish and Finnish electricity prices. *Economic Analysis and Policy*, 56, 37–50. — DOI verify

**Crossref record:**

> Unger, E.A., Ulfarsson, G.F., Gardarsson, S.M., Matthiasson, T. (2017). A long-term analysis studying the effect of changes in the Nordic electricity supply on Danish and Finnish electricity prices. *Economic Analysis and Policy*, 56, 37–50. https://doi.org/10.1016/j.eap.2017.06.001

**Verdict:** **Verified with corrections — DOI missing.**

- **DOI:** missing → **10.1016/j.eap.2017.06.001**.
- Authors: Elizabeth A. Unger; Gudmundur F. Ulfarsson; Sigurdur M. Gardarsson; Thorolfur Matthiasson — match, same order.
- Year: issued 2017-12 — match. Volume 56, pages 37-50 — match. Issue: not given by Crossref. Title — match.

**Query URLs:**

- <https://api.crossref.org/works?query.bibliographic=A%20long-term%20analysis%20studying%20the%20effect%20of%20changes%20in%20the%20Nordic%20electricity%20supply%20on%20Danish%20and%20Finnish%20electricity%20prices%20Unger&rows=5>
- <https://api.crossref.org/works/10.1016/j.eap.2017.06.001>

---

## [L12]

**As printed in the spec:**

> [L12] Stiewe, C., Xu, A.L., Hirth, L. (2024). Cross-border cannibalization: Spillover effects of wind and solar energy on interconnected European electricity markets. *Energy Economics*. — DOI verify

**Crossref record:**

> Stiewe, C., Xu, A.L., Eicke, A., Hirth, L. (2025). Cross-border cannibalization: Spillover effects of wind and solar energy on interconnected European electricity markets. *Energy Economics*, 143, 108251. https://doi.org/10.1016/j.eneco.2025.108251

**Verdict:** **Verified with corrections — an author is missing, and the year, volume, article number and DOI are wrong or missing.**

- **Authors:** Crossref lists four: Clemens Stiewe; Alice Lixuan Xu; **Anselm Eicke**; Lion Hirth. The spec omits Eicke, A. (third author).
- **Year:** printed 2024 → Crossref issued **2025-03**. Crossref gives no 2024 date: there is no published-online field, and the DOI was registered (`created`) 2025-01-31.
- **Volume / article number:** missing → **143 / 108251**. Issue: not given by Crossref.
- **DOI:** missing → **10.1016/j.eneco.2025.108251**.
- Title and journal — match.
- **Erratum on record:** the Crossref record has `updated-by` type *erratum* → Stiewe, C., Xu, A.L., Eicke, A., Hirth, L. (2026). Corrigendum to "Cross-border cannibalization: Spillover effects of wind and solar energy on interconnected European electricity markets" [Energy Economics, 143, March 2025, 108251]. *Energy Economics*, 155, 109167. https://doi.org/10.1016/j.eneco.2026.109167. Read it before quoting numbers from the article.

**Query URLs:**

- <https://api.crossref.org/works?query.bibliographic=Cross-border%20cannibalization%3A%20Spillover%20effects%20of%20wind%20and%20solar%20energy%20on%20interconnected%20European%20electricity%20markets%20Stiewe&rows=5>
- <https://api.crossref.org/works/10.1016/j.eneco.2025.108251>
- <https://api.crossref.org/works/10.1016/j.eneco.2026.109167>

---

## [L25]

**As printed in the spec:**

> [L25] Brown, T., Neumann, F., Riepin, I. (2024). Price formation without fuel costs: the interaction of demand elasticity with storage bidding. arXiv:2407.21409. https://doi.org/10.48550/arXiv.2407.21409 — authors verify

**Crossref record:**

> Preprint (arXiv / DataCite; not in Crossref): Brown, T., Neumann, F., Riepin, I. (2024). Price formation without fuel costs: the interaction of demand elasticity with storage bidding. arXiv:2407.21409. https://doi.org/10.48550/arXiv.2407.21409  
> Journal version (Crossref): Brown, T., Neumann, F., Riepin, I. (2025). Price formation without fuel costs: The interaction of demand elasticity with storage bidding. *Energy Economics*, 147, 108483. https://doi.org/10.1016/j.eneco.2025.108483

**Verdict:** **Verified as printed** (as a preprint). The authors were checked against arXiv and DataCite, because arXiv DOIs are registered with DataCite, not Crossref. A peer-reviewed version exists in Crossref; cite it instead of, or alongside, the preprint.

- Crossref lookup of the printed DOI `10.48550/arXiv.2407.21409` → HTTP 404 "Resource not found". This is expected: it is a DataCite DOI, not a sign of an error.
- arXiv API (2407.21409v2; v1 2024-07-31, updated 2025-02-03): authors Tom Brown; Fabian Neumann; Iegor Riepin — match, same order. Title — exact match. The arXiv record links DOI 10.1016/j.eneco.2025.108483.
- DataCite: DOI 10.48550/arxiv.2407.21409, creators Brown, Tom; Neumann, Fabian; Riepin, Iegor; publicationYear 2024; relation `IsVersionOf` 10.1016/j.eneco.2025.108483.
- Crossref journal version: same three authors in the same order; issued 2025-06; *Energy Economics* volume 147, article number 108483; issue not given. Title differs only in the capital "The" after the colon.

**Query URLs:**

- <https://api.crossref.org/works/10.48550/arXiv.2407.21409>
- <https://export.arxiv.org/api/query?id_list=2407.21409>
- <https://api.datacite.org/dois/10.48550/arXiv.2407.21409>
- <https://api.crossref.org/works?query.bibliographic=Price%20formation%20without%20fuel%20costs%3A%20the%20interaction%20of%20demand%20elasticity%20with%20storage%20bidding%20Brown&rows=5>
- <https://api.crossref.org/works/10.1016/j.eneco.2025.108483>

---

## [L26]

**As printed in the spec:**

> [L26] Emmanuel, M., Denholm, P. (2022). A market feedback framework for improved estimates of the arbitrage value of energy storage using price-taker models. *Applied Energy*, 310. — DOI verify

**Crossref record:**

> Ikechi Emmanuel, M., Denholm, P. (2022). A market feedback framework for improved estimates of the arbitrage value of energy storage using price-taker models. *Applied Energy*, 310, 118250. https://doi.org/10.1016/j.apenergy.2021.118250

**Verdict:** **Verified with corrections — DOI and article number missing; Crossref records the first author's surname differently.**

- **DOI:** missing → **10.1016/j.apenergy.2021.118250**. **Article number:** missing → **118250**. Issue: not given by Crossref.
- **First author:** Crossref has given name "Michael" and family name "**Ikechi Emmanuel**". The spec has "Emmanuel, M.". Crossref alone cannot show whether "Ikechi" is part of the surname or a middle name; check the article's title page before settling the form.
- Second author Paul Denholm — match. Year: issued 2022-03 — match. Journal *Applied Energy*, volume 310 — match. Title — match.

**Query URLs:**

- <https://api.crossref.org/works?query.bibliographic=A%20market%20feedback%20framework%20for%20improved%20estimates%20of%20the%20arbitrage%20value%20of%20energy%20storage%20using%20price-taker%20models%20Emmanuel%20Denholm&rows=5>
- <https://api.crossref.org/works/10.1016/j.apenergy.2021.118250>

---

## [L27]

**As printed in the spec:**

> [L27] Brijs, T., Geth, F., Siddiqui, S., Hobbs, B.F., Belmans, R. (2016). Price-based unit commitment electricity storage arbitrage with piecewise linear price-effects. *Journal of Energy Storage*, 7, 52–62. https://doi.org/10.1016/j.est.2016.05.005 — verify

**Crossref record:**

> Brijs, T., Geth, F., Siddiqui, S., Hobbs, B.F., Belmans, R. (2016). Price-based unit commitment electricity storage arbitrage with piecewise linear price-effects. *Journal of Energy Storage*, 7, 52–62. https://doi.org/10.1016/j.est.2016.05.005

**Verdict:** **Verified as printed.**

- Authors: Tom Brijs; Frederik Geth; Sauleh Siddiqui; Benjamin F. Hobbs; Ronnie Belmans — match, same order.
- Year: issued 2016-08 — match. Volume 7, pages 52-62 — match. Issue: not given by Crossref. Title — exact match.

**Query URLs:**

- <https://api.crossref.org/works/10.1016/j.est.2016.05.005>

---

## [L28]

**As printed in the spec:**

> [L28] Veenstra, A.T., Mulder, M. (2025). Profitability of batteries in day-ahead and intraday electricity markets: Assessment of operation strategies with endogenous prices. *Energy Economics*, 148. — DOI verify

**Crossref record:**

> Veenstra, A.T., Mulder, M. (2025). Profitability of batteries in day-ahead and intraday electricity markets: Assessment of operation strategies with endogenous prices. *Energy Economics*, 148, 108608. https://doi.org/10.1016/j.eneco.2025.108608

**Verdict:** **Verified with corrections — article number and DOI missing.**

- **DOI:** missing → **10.1016/j.eneco.2025.108608**. **Article number:** missing → **108608**. Issue: not given by Crossref.
- Authors: Arjen T. Veenstra; Machiel Mulder — match. Year: issued 2025-08 — match. Volume 148 — match. Title — match.
- Also in Crossref: an SSRN version of the same title, 10.2139/ssrn.5081715 (2025).

**Query URLs:**

- <https://api.crossref.org/works?query.bibliographic=Profitability%20of%20batteries%20in%20day-ahead%20and%20intraday%20electricity%20markets%3A%20Assessment%20of%20operation%20strategies%20with%20endogenous%20prices%20Veenstra%20Mulder&rows=5>
- <https://api.crossref.org/works/10.1016/j.eneco.2025.108608>

---

## [L29]

**As printed in the spec:**

> [L29] Torralba-Díaz, L. et al. (2024). Iterative coupling of a fundamental electricity market model and an agent-based simulation model. *Energy*. — DOI verify

**Crossref record:**

> Torralba-Díaz, L., Schimeczek, C., Kochems, J., Hufendiek, K. (2024). Iterative coupling of a fundamental electricity market model and an agent-based simulation model to reduce the efficiency gap. *Energy*, 310, 133192. https://doi.org/10.1016/j.energy.2024.133192

**Verdict:** **Verified with corrections — title truncated; authors, volume, article number and DOI missing.**

- **Title:** the printed title is truncated. The full title ends "... agent-based simulation model **to reduce the efficiency gap**".
- **Authors:** "et al." → Laura Torralba-Díaz; Christoph Schimeczek; Johannes Kochems; Kai Hufendiek.
- **Volume / article number:** missing → **310 / 133192**. Issue: not given by Crossref.
- **DOI:** missing → **10.1016/j.energy.2024.133192**.
- Year: issued 2024-11 — match. Journal *Energy* — match.
- Not to be confused with an earlier paper by the same group: Torralba-Díaz, L. et al. (2020). Identification of the Efficiency Gap by Coupling a Fundamental Electricity Market Model and an Agent-Based Simulation Model. *Energies*, 13(15), 3920. https://doi.org/10.3390/en13153920.

**Query URLs:**

- <https://api.crossref.org/works?query.bibliographic=Iterative%20coupling%20of%20a%20fundamental%20electricity%20market%20model%20and%20an%20agent-based%20simulation%20model%20Torralba-Diaz&rows=5>
- <https://api.crossref.org/works/10.1016/j.energy.2024.133192>

---

## [L30]

**As printed in the spec:**

> [L30] Zakeri, B., Syri, S., Wagner, F. (2016). Value of energy storage in the Nordic power market — benefits from price arbitrage and ancillary services. *13th International Conference on the European Energy Market (EEM)*. https://doi.org/10.1109/EEM.2016.7521275 — verify

**Crossref record:**

> Zakeri, B., Syri, S. (2016). Value of energy storage in the Nordic Power market - benefits from price arbitrage and ancillary services. *2016 13th International Conference on the European Energy Market (EEM)*, 1–5. https://doi.org/10.1109/eem.2016.7521275

**Verdict:** **Verified with corrections — wrong author list; pages missing.**

- **Authors:** Crossref lists only **Behnam Zakeri; Sanna Syri**. Remove "Wagner, F." The author-constrained search shows the likely source of the mix-up: Friedrich Wagner co-authored a *different* paper, Zakeri, B., Syri, S., Wagner, F. (2017). Economics of energy storage in the German electricity and reserve markets. *2017 14th International Conference on the European Energy Market (EEM)*, 1–6. https://doi.org/10.1109/eem.2017.7981914.
- **Pages:** missing → **1–5**.
- DOI — match; DOIs are case-insensitive, and Crossref returns it in lower case. Year: issued 2016-06 — match (event: Porto, Portugal, 6–9 June 2016). Proceedings: 13th EEM — match.
- Title — match, apart from capitalisation ("Nordic Power market") and a hyphen in place of the em dash.

**Query URLs:**

- <https://api.crossref.org/works/10.1109/EEM.2016.7521275>
- <https://api.crossref.org/works?query.author=Zakeri%20Syri%20Wagner&query.bibliographic=energy%20storage%20Nordic%20price%20arbitrage%20ancillary%20services&rows=10>

---

## [L31]

**As printed in the spec:**

> [L31] Khezri, R. et al. (2025). Profit benchmarking of battery energy storage in Sweden's day-ahead and FCR markets. — journal and DOI verify

**Crossref record:**

> Mirzaei Alavijeh, N., Khezri, R., Mazidi, M., Steen, D., Le, A.T. (2025). Profit benchmarking and degradation analysis for revenue stacking of batteries in Sweden’s day-ahead electricity and frequency containment reserve markets. *Applied Energy*, 381, 125151. https://doi.org/10.1016/j.apenergy.2024.125151

**Verdict:** **Verified with corrections — wrong first author and a paraphrased title; journal, volume, article number and DOI missing.** The match rests on the title only (Crossref holds no abstract for this record); confirm it is the intended work.

- **First author:** printed "Khezri, R. et al." → the first author is **Nima Mirzaei Alavijeh**. Rahmat Khezri is second of five: Mirzaei Alavijeh, N.; Khezri, R.; Mazidi, M.; Steen, D.; Le, A.T.
- **Title:** the printed title is a paraphrase. Crossref: "Profit benchmarking and degradation analysis for revenue stacking of batteries in Sweden’s day-ahead electricity and frequency containment reserve markets".
- **Journal / volume / article number:** missing → ***Applied Energy*, 381, 125151**. Issue: not given by Crossref.
- **DOI:** missing → **10.1016/j.apenergy.2024.125151**. The "2024" in the DOI is the registration year: the DOI was created 2024-12-24 and the article issued 2025-03.
- Year 2025 — match.
- Why this record: the author-constrained search (query.author=Khezri, 10 rows) found no Khezri-first-author work with this title, and this is the only record combining profit benchmarking, batteries, Sweden, day-ahead and FCR.

**Query URLs:**

- <https://api.crossref.org/works?query.bibliographic=Profit%20benchmarking%20of%20battery%20energy%20storage%20in%20Sweden%27s%20day-ahead%20and%20FCR%20markets%20Khezri&rows=5>
- <https://api.crossref.org/works?query.author=Khezri&query.bibliographic=battery%20energy%20storage%20Sweden%20day-ahead%20FCR%20profit&rows=10>
- <https://api.crossref.org/works/10.1016/j.apenergy.2024.125151>

---

## [L32]

**As printed in the spec:**

> [L32] Paulauskas, V. et al. (2024). Battery scheduling optimization for residential storage price arbitrage on the Nord Pool day-ahead market. — journal and DOI verify

**Crossref record:**

> Paulauskas, N., Kapustin, V. (2024). Battery Scheduling Optimization and Potential Revenue for Residential Storage Price Arbitrage. *Batteries*, 10(7), 251. https://doi.org/10.3390/batteries10070251

**Verdict:** **Verified with corrections — wrong first-author initial and a paraphrased title; co-author, journal, volume, issue, article number and DOI missing.**

- **First author:** printed "Paulauskas, V." → **Nerijus** Paulauskas (N.). "et al." is one co-author: **Vsevolod Kapustin** (V.).
- **Title:** the printed "... for residential storage price arbitrage on the Nord Pool day-ahead market" is not the title. Crossref: "Battery Scheduling Optimization and Potential Revenue for Residential Storage Price Arbitrage".
- **Journal / volume(issue) / number:** missing → ***Batteries*, 10(7), 251**. Crossref puts 251 in the `page` field (the MDPI article number) and has no separate article-number field.
- **DOI:** missing → **10.3390/batteries10070251**.
- Year: issued (published online) 2024-07-16 — match.
- Content check: the Crossref abstract confirms this is the intended work (optimal scheduling of residential batteries on Nord Pool day-ahead prices, north-western European price zones, 2023, highest revenue in the Baltic states).

**Query URLs:**

- <https://api.crossref.org/works?query.bibliographic=Battery%20scheduling%20optimization%20for%20residential%20storage%20price%20arbitrage%20on%20the%20Nord%20Pool%20day-ahead%20market%20Paulauskas&rows=5>
- <https://api.crossref.org/works?query.author=Paulauskas&query.bibliographic=battery%20residential%20storage%20price%20arbitrage%20Nord%20Pool%20day-ahead&rows=10>
- <https://api.crossref.org/works/10.3390/batteries10070251>

---

## [L33]

**As printed in the spec:**

> [L33] Karkossa, M. et al. (2026). Can optimal dispatch models recreate reality? A PyPSA-Eur hindcast 2020–2024. *22nd EEM*. — DOI verify

**Crossref record:**

> Karkossa, L., Saretta, M., Gullach, F.E., Victoria, M. (2026). Can Optimal Dispatch Models Recreate Reality? A Retrospective Analysis of Europe’s 2022 Energy Crisis Using PyPSA-Eur. *2026 22nd International Conference on the European Energy Market (EEM)*, 1–6. https://doi.org/10.1109/eem68581.2026.11589899

**Verdict:** **Verified with corrections — wrong first-author initial and wrong subtitle; co-authors, pages and DOI missing.**

- **First author:** printed "Karkossa, M." → **Lukas** Karkossa (L.). "et al." → Marco Saretta; Frederik Erhard Gullach; Marta Victoria.
- **Subtitle:** printed "A PyPSA-Eur hindcast 2020–2024" → Crossref: "**A Retrospective Analysis of Europe’s 2022 Energy Crisis Using PyPSA-Eur**". The main title matches.
- **Proceedings / pages:** "22nd EEM" → *2026 22nd International Conference on the European Energy Market (EEM)* (Trondheim, Norway, 22–24 June 2026), pages **1–6**.
- **DOI:** missing → **10.1109/eem68581.2026.11589899**. Upper-case form, as used for [L13]: 10.1109/EEM68581.2026.11589899.
- Year: issued 2026-06-22 — match.
- Crossref holds no abstract. The arXiv preprint with the same title (arXiv:2606.16486; comment "Conference Paper EEM26"; same four authors) describes hourly hindcasts for 35 countries, 2020–2024, with PyPSA-Eur. So the printed subtitle describes the content, not the title.

**Query URLs:**

- <https://api.crossref.org/works?query.bibliographic=Can%20optimal%20dispatch%20models%20recreate%20reality%3F%20A%20PyPSA-Eur%20hindcast%202020-2024%20Karkossa&rows=5>
- <https://api.crossref.org/works?query.author=Karkossa&query.bibliographic=PyPSA-Eur%20hindcast%20optimal%20dispatch&rows=10>
- <https://api.crossref.org/works/10.1109/eem68581.2026.11589899>
- <https://export.arxiv.org/api/query?search_query=au:Karkossa&max_results=10>

---

## [L34]

**As printed in the spec:**

> [L34] Mendes, C. et al. (2024). EuroMod: Modelling European power markets with improved price granularity. *Energy Economics*. — DOI verify

**Crossref record:**

> Mendes, C., Staffell, I., Green, R. (2024). EuroMod: Modelling European power markets with improved price granularity. *Energy Economics*, 131, 107343. https://doi.org/10.1016/j.eneco.2024.107343

**Verdict:** **Verified with corrections — authors, volume, article number and DOI missing.**

- **Authors:** "et al." → Carla Mendes; Iain Staffell; Richard Green.
- **Volume / article number:** missing → **131 / 107343**. Issue: not given by Crossref.
- **DOI:** missing → **10.1016/j.eneco.2024.107343**.
- Year: issued 2024-03 — match. Journal *Energy Economics* — match. Title — exact match.
- Also in Crossref: an SSRN version "Euromod: ...", 10.2139/ssrn.4523084 (2023).

**Query URLs:**

- <https://api.crossref.org/works?query.bibliographic=EuroMod%3A%20Modelling%20European%20power%20markets%20with%20improved%20price%20granularity%20Mendes&rows=5>
- <https://api.crossref.org/works/10.1016/j.eneco.2024.107343>

---

## Summary

| id | verdict | corrected DOI |
|---|---|---|
| L6 | verified as printed | 10.1016/j.eneco.2016.09.008 (as printed) |
| L7 | verified as printed | 10.1016/j.eneco.2019.104593 (as printed) |
| L8 | verified as printed | 10.1016/j.eneco.2020.104802 (as printed) |
| L9 | verified with corrections — **printed DOI points to another paper** | **10.1016/j.jup.2019.01.008** |
| L11 | verified with corrections — DOI added | **10.1016/j.eap.2017.06.001** |
| L12 | verified with corrections — 3rd author Eicke, A. missing; year 2025 not 2024; vol 143, art. 108251; corrigendum on record | **10.1016/j.eneco.2025.108251** (corrigendum 10.1016/j.eneco.2026.109167) |
| L25 | verified as printed (arXiv/DataCite; not a Crossref DOI); journal version exists | 10.48550/arXiv.2407.21409 (as printed); journal version **10.1016/j.eneco.2025.108483** |
| L26 | verified with corrections — DOI, art. 118250; Crossref surname "Ikechi Emmanuel" | **10.1016/j.apenergy.2021.118250** |
| L27 | verified as printed | 10.1016/j.est.2016.05.005 (as printed) |
| L28 | verified with corrections — art. 108608, DOI | **10.1016/j.eneco.2025.108608** |
| L29 | verified with corrections — title truncated; 4 authors; vol 310, art. 133192 | **10.1016/j.energy.2024.133192** |
| L30 | verified with corrections — **remove Wagner, F.** (2 authors); pages 1–5 | 10.1109/EEM.2016.7521275 (as printed) |
| L31 | verified with corrections — first author is Mirzaei Alavijeh, N. (Khezri 2nd); real title; *Applied Energy* 381, 125151 | **10.1016/j.apenergy.2024.125151** |
| L32 | verified with corrections — Paulauskas, **N.**, Kapustin, V.; real title; *Batteries* 10(7), 251 | **10.3390/batteries10070251** |
| L33 | verified with corrections — Karkossa, **L.** + 3 authors; subtitle differs; pp. 1–6 | **10.1109/EEM68581.2026.11589899** |
| L34 | verified with corrections — authors Mendes, Staffell, Green; vol 131, art. 107343 | **10.1016/j.eneco.2024.107343** |
