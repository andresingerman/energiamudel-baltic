# Empty-clone test, scoped (Stage 2)

DECISIONS.md D-003: the full refetch (about 5.6 GB) is not repeated in Stage 2; a slice of
every source is refetched into an empty clone instead, and each file is compared with the
main cache.

## Procedure (2026-09-24)

1. `git clone` of commit `7eec44b` into a scratch directory: `data/raw` and `data/lineage`
   hold only `.gitkeep`.
2. A new virtual environment, `pip install -e '.[dev]'`; `make test` (47 passed) and
   `make lint` (clean) in the clone.
3. With `ENERGIAMUDEL_RAW` and `ENERGIAMUDEL_LINEAGE` pointing at the clone's empty
   directories: one month of every monthly source, one year of every annual one, the World Bank
   file, today's UMM snapshot and all 45 documents, each through the repository's own fetcher.
4. Each file's SHA-256 against the main cache's record for the same dataset; where the bytes
   differ, the parsed content (API data) or the visible text (web pages) is compared.

## Result

65 fetches, 0 failures; 65 lineage records written.

| Source | Fetched | Bytes identical | Content identical where bytes differ |
|---|---|---|---|
| ENTSO-E (A44, A25, A65, A75, A68, A71, A95, A72, A11, A09, A31, A80, A78) | 13 | 0 | 13 of 13 (parsed rows equal) |
| Fingrid, JAO, EEX, World Bank, UMM | 5 | 5 | — |
| BTD, Open-Meteo | 2 | 0 | 2 of 2 (parsed rows equal) |
| Documents: PDF | 28 | 28 | — |
| Documents: web pages | 17 | 6 | 7 of 11 visible text equal; 4 differ in page furniture only |

Why bytes differ although the data do not:

- **ENTSO-E** stamps every response with a new document `mRID` and `createdDateTime`.
- **BTD and Open-Meteo** return the same rows with a different generation stamp.
- **Web pages**: the four whose visible text differs (ERR's gas-tender article 98.3 % similar,
  the Yahoo mirror of the Enefit press release 98.5 %, Modo 99.97 %, Yle 98.9 %) differ in news
  tickers, stock quotes, reading-time counters and "most read" lists; the article bodies are
  the same.

A reader who reruns `make history` therefore gets the same data, while lineage records the
SHA-256 of the exact bytes each fetch returned. The cached copy stays the reference for page
citations.

## Not refetched

The TYNDP 2024, ERAA 2025, PECD and catalogue archives (about 5 GB), which `make db` requires
(D-003). They were migrated from v4 with SHA-256 checks against their records
(`2026-09-24_v4_migration.md`); `make history` refetches them on a disk with about 8 GB free.
