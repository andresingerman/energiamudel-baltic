# A rehearsal of the freeze of 3 November (2026-10-18)

**Why.** The owner chose a rehearsal of the freeze for the day's work ("Freeze rehearsal"). PLAN §9
puts October's data in on 1–3 November, freezes the figures on 3 November and gives the deck its
numbers from them. The rehearsal ran every step two weeks early, with October so far, to find what
breaks while there is time to fix it.

**Setup.** The rehearsal ran in a worktree of `day/2026-10-18` outside the repository. It had its own
copy of `data/raw`, `data/lineage` and the database, made as APFS clones: instant, and taking no
space until written. Main's data, cache and export were not touched. Three changes were made to
the worktree alone; none of them is committed:
- `make history` fetched the month in progress, October 1–18;
- the export's current year ended where the weather does;
- October's two monthly prices were taken as September's (below).

## The steps, timed

The machine is the development Mac, 8 cores, with other work running at the same time.

| Step | Time | Result |
|---|---|---|
| Set aside the current year's Open-Meteo (3) and EEX (1) files, as D-111 says | — | Fetched again by the next step |
| `make history` | 89 s | 85 files new: 68 ENTSO-E, 8 JAO, 3 Fingrid, 2 BTD for October, and the 4 set aside. **One failure** (finding 1) |
| `make db` | 6.6 min | 2026's prices to 18 October |
| `make export` | 36 s | **Stopped twice** (findings 2 and 3), then passed |
| `make validate` | 16 s | 2026's row moves (finding 4); `make validate` exits 1 while 2025's gate is unmet, as it does now |
| `make check` | 13.6 min | Every check passes. The rebuild differs by the two price rows of finding 3, which only the rehearsal's database holds |
| Build, then `node scripts/opening.ts` | 79 s | **The opening view and all 46 presentation sets are the same as before** (`compare_sets.ts` against af0026b's) |
| `node ../spikes/presentation-2026-11/figures.ts` | 114 s | The deck's figures as on the site |
| `python3 spikes/presentation-2026-11/deck.py` | 0.3 s | 12 slides; needs the `python3` on PATH (finding 5) |
| `make nordpool`, import only | 0.6 s | The spool's 44 days are all in `data/raw` already |

That is about 25 minutes of machine time, plus the deploy at the owner's word: the gate, the sets in
about 85 s, and the copy.

## Findings

1. **`make history` failed on every run.** TGE's OTF quotes of 9 October 2026 refuse the fetcher's
   connection. The research cites the document and the register marks it as not cached. So the
   freeze's `make history && make db` would stop.
   **Fixed** (623bf65): the document is marked `cacheable=False` and the history leaves it out; a
   test.
2. **A part-day of data stops the export.** The core series reached 18 October and the weather only
   the 17th. This is the rehearsal's own doing: on 1–3 November the history fetches whole months, and
   Open-Meteo's archive runs to yesterday with no gap. No change.
3. **October's monthly prices come on 3 November.** The export needs each month's TTF gas price,
   from the World Bank's Pink Sheet, and the ECB's monthly USD/EUR. The World Bank's page says:
   "Next update: November 3, 2026." Both files are cached under the month they are fetched in. A
   `make history` on 1 or 2 November would therefore have cached a November file without October,
   and it would never have been fetched again: the export would stop on "monthly prices missing"
   until someone deleted the file.
   **Fixed** (4751fe1): a vintage that lacks the month before it is not kept, and the fetch fails
   until the release.
   **The freeze runs on 3 November, after the release.** To let the chain run on, the rehearsal
   took September's prices for October. Only the 2026 replay's October reads them.
4. **2026's validation row moves, and Estonia's error grows.** With October 1–17, the error for 2026
   is EE / LV / LT 14.1 / 11.0 / 10.4 €/MWh, against 13.3 / 10.5 / 9.8 to September; Estonia's bias is
   −7.4. Estonia is near the target of 15. The deck's slide 5 says "2026: täidetud", and its numbers
   come from the frozen files: the claim has to be read again after the freeze. The experts' answers
   (K11) say so.
5. **The deck needs the `python3` on PATH.** That is python.org's 3.13, which has python-pptx 1.0.2.
   `/usr/bin/python3` lacks it, as does the repository's `.venv`.
6. **What October's data move.**
   - They do move: the 2026 replay (the Calibration page's 2026 row, its attribution), the Statistics
     page (its window and series), and the sources' register.
   - They do not move the scenarios, the sensitivities, the tight profiles, the contract, or anything
     else the opening view and the presentation's states compute. The presets change in their
     `statistics` section only.

     So the deck's headline figures are already the frozen ones, unless the code changes before
     3 November.

## The order for 1–3 November

1. **Before 3 November:** nothing that fetches. The figures cannot move but for code.
2. **On 3 November, after the World Bank's update** (the afternoon in Tallinn):
   1. set aside `data/raw/openmeteo/openmeteo.archive.{EE,LV,LT}.2026.json` and
      `data/raw/eex/eex.eua_auction.EU.2026.xlsx` (D-111);
   2. `make history`. Should the Pink Sheet or the ECB's month be late, it now says so, and nothing is
      cached;
   3. `make nordpool` — the curves of 3 November, and the spool;
   4. `make db`, `make export`, `make check`, `make validate`;
   5. commit the export and the validation files, then `make deploy` at the owner's word;
   6. the deck: `node ../spikes/presentation-2026-11/figures.ts` from `app/`, then
      `python3 spikes/presentation-2026-11/deck.py`. Read slide 5's 2026 claim.
3. **The curves' November step** (R-SUP-6's cross-check; `docs/research/2026-10-17_curve_slopes.md`)
   needs October's curves and is research, not part of the freeze.

## Addendum, 2026-10-28: the order as it stands

- **One command.** The order above is `make freeze` since D-145/D-147, which commits and deploys nothing.
- **Access.** Since D-178 the site sits behind a password. `make freeze` mirrors the live site's `data/` over ssh first
  and compares the sets with the mirror (`data/raw-aside/<date>/live`), so it needs `DEPLOY_TARGET` and the deploy key
  in `RSYNC_RSH`, as `make deploy` does (ERRATA E-175). `make deploy` checks through the way in without the password.
- **Size.** The sets are now the opening and 48 others — the price pairs of LNG and CO₂ for every scenario (D-183,
  D-184), Global Ambition 2035 and National Trends 2040 (D-177) — 196 years in about 110 s, 49 files, 29.9 MB
  against a cap of 35.
- **What moves.** The code moved figures after the rehearsal: the owner's opening (D-182, D-185), units of 315 MW
  (D-189) and the levels on Distributed Energy 2035 alone (D-190). The freeze compares with the live site, which
  carries them once they are deployed. A set that differs then is October's data or code since that deploy.
