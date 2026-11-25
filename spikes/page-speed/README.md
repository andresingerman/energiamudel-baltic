# page-speed

**Question** (the owner, 2026-11-10): where does the page compute again what it computed before, though the reader
changed nothing — and what would make it answer at once when the inputs are the same?

**What it does.** `probe.js` is injected before the page's own scripts (Playwright `add_init_script`), so the page is
measured as built, unchanged. It records every job the page posts to its workers — the year, the kind (a part of a
clearing, a year's finish, an adequacy sample, a warm-up), its tag, and the identity of what the engine computes from
(the panel's state less the strike and less a clause no plant reads, the sensitivity's floors: `jobKey`'s rule,
D-134) — and the page's fetches, the reads and writes of its IndexedDB store, every `JSON.parse` over 4 ms and the main
thread's long tasks. `journeys.py` walks a reader's journeys, each in a fresh browser profile, and waits after each
step until nothing has computed, fetched or answered for a second. Per step it prints and saves: seconds to the
scenario shown, to the table, to the sensitivities, to the Presentation page or the deck being whole, and to idle;
the year-runs completed and how many of them repeat a year of an input computed earlier in the journey; the year-runs
abandoned mid-way; worker seconds; megabytes fetched; the store's hits, misses and writes; milliseconds of JSON decoded
and of long tasks.

**Run.** Serve a built site with its computed sets — `data/derived/offline/site` is the last deploy's copy
(`python3 -m http.server 4180 --bind 127.0.0.1 --directory data/derived/offline/site`), or `app/dist` after
`npm run build && node --no-maglev scripts/opening.ts` from a clean commit (`npm --prefix app run preview -- --port
4173`) — then, with a Python that has Playwright and its Chromium and WebKit (here the system Python 3.13):

    python3 -I spikes/page-speed/journeys.py http://127.0.0.1:4180 out.json [journey ...]
    BROWSER=webkit python3 -I spikes/page-speed/journeys.py http://127.0.0.1:4180 out-webkit.json change

Journeys: `open`, `change`, `chips`, `pres`, `presprio`, `deck`, `deckreload`, `replay`, `adequacy`, `views`, `lines`. A journey
takes one to six minutes; run them one after another, never two at once (each takes every core).

**A quiet machine.** `node spikes/page-speed/quiet.mjs` times a fixed loop on one thread and on eight at once and
exits 1 when the machine is busy. Run it before and after a journey: on 2026-11-10, with a backup, the indexer, the
virus scanner and another browser at work, the same journeys ran two to six times slower and one stood still, though
nothing in the page had changed. A step whose own times are off beside its neighbours' is measured again.

**The browser check.** `browser_check.py` is no measurement but a check, kept here with the probe it uses: the built
site in Chromium and WebKit with a store that never answers, the store's round trip and every view of the header
(the Presentation page's charts until the page went, D-249) (its docstring has the list). `make browser-check PLAYWRIGHT_PYTHON=<a Python with
Playwright>` builds the site with its sets and runs it; `make ci` cannot, having no browser (ERRATA E-191). Given the
site's address in place of a directory, it checks the deployed site: `make live-check` runs it so after a deploy.

**Result.** `docs/research/2026-11-10_page_speed.md`.

Disposable: not held to the repository's standards (AGENTS.md §3).
