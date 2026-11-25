# The page's speed: what it computes again, and what keeps it (2026-11-10)

**Question** (the owner, 2026-11-10): "start a research into how to make the page faster. In particular the many places where the system computes its results anew each time though the user has changed nothing. It is more logical, where the inputs have not changed, to keep them and answer at once" — how to make the page faster; in particular the many
places where it computes its results anew though the reader has changed nothing; where the inputs are the same, keep
the results and answer at once.

**Answer in short.** The page already kept much of what it computed (D-126, D-128, D-129, D-134), but in three places
that did not know of each other, sized when a state had four sensitivity sets and not sixteen, and two of its pages and
the validation run stood outside them. Measured on the site as deployed on 10 November, a reader who asked for nothing
new still waited: 24 s for the sensitivities of a value two changes back; 16–20 s whenever the Presentation page met a
changed state again, and after every reload of it; 14.5 s for the deck's cables' slide after a reload; about a second
for a validation year the site already holds; 22 s for the adequacy tab's samples on a second press of Run; and
35–39 s on every load of the development server, where nothing was kept at all. Three things besides computing cost
time: the opening view spent 0.75 s of its 1.2 s turning JSON text back into numbers; the Presentation page held the
main thread for 4.2–4.4 s while its blocks came in, drawing all five again for each of sixteen arrivals; and after a
change made on that page its blocks waited behind 48 years of sensitivities that the page does not show, so it was
whole after 49–55 s where 18–20 s do.

Six changes that cure these are built on the branch `research/page-speed`, each a proposed decision (D-232 … D-237),
none in main, none deployed. None moves a figure: what is kept is the set the engine computed, array for array, and the
build's 53 sets are equal to the deployed site's (`compare_sets`). What they do not change is the price of a state
never seen before: its table still takes 4.3–4.9 s and its sensitivities 27–31 s on this Mac — that is the solving
itself (D-130).

## 1. How it was measured

`spikes/page-speed/` (its README has the commands). `probe.js` is injected before the page's scripts, so the page is
measured as built: it records each job the page posts to its workers with the identity of what the engine computes from
— the year, the panel's state less the strike and less a clause no plant reads, the sensitivity's floors, which is
`jobKey`'s rule (D-134) — and the page's fetches, the reads and writes of its IndexedDB store, every `JSON.parse` over
4 ms and the main thread's long tasks (over 50 ms). `journeys.py` walks a reader's journeys, each in a fresh browser
profile, and waits after every step until nothing has computed, fetched or answered for a second.

"Before" is the copy of the deploy of 12:11 (`data/derived/offline/site`, commit 1a4fe28); "with the branch" is the
branch built with its sets (the sources of its last commit: engine id e074a39a847c). Both are served from this machine by the same
server, so a fetch costs its bytes and its decoding, not a network. Playwright's Chromium 149 (headless) and WebKit
26.5, 1 440 × 900, an Apple M1 Pro with six fast and two slow cores and 16 GB, seven workers. One run of each journey;
a change's times repeat within about a second (the table of three changes in a row after 4.3, 4.3 and 4.7 s). A
*year-run* is one year of one set cleared by the engine: a scenario's set is three, a validation run one.

**A quiet machine.** Between 13:20 and 14:40 a backup, the indexer, the virus scanner and a browser playing media were
at work on this Mac: the same journeys ran two to six times slower and one stood still, though nothing in the page
had changed. Those runs are thrown away. `spikes/page-speed/quiet.mjs` times a fixed loop on one thread and on eight
at once; every run kept here has it at its quiet speed before and after (about 390 ms and 470–560 ms). The baseline's
`open`, `change`, `deck`, `replay`, `adequacy`, `views` and `lines` were measured between 11:30 and 13:20, everything
else, and all of the branch's last build, after 14:55. With other programs open that afternoon a fresh change's
sensitivities took 30–38 s where the morning had 27–29 s; the two builds were measured in the same hour for every row
that compares times.

## 2. What one change costs

A set of three years is 0.66 MB of typed arrays, 0.35 MB as the build's gzipped JSON.

| Shown | Sets | Year-runs | On this Mac |
|---|---|---|---|
| The table: four scenarios | 4 | 12 | the scenario shown after 1.5–2.0 s, the table after 4.3–4.9 s |
| The sensitivities: four price pairs for each scenario (D-184) | 16 | 48 | 23–26 s more: in after 27–31 s |
| The Presentation page: four more neighbours' profiles, four scenarios each (D-177) | 16 | 40 | 14–19 s when alone |
| The deck's cables' slide: two outages, four scenarios each (D-221) | 8 | 24 | 10–12 s when alone |
| A validation run | 1 | 1 | 0.7 s (1.2 s in WebKit) |
| The adequacy tab: 20 samples a year | — | 60 samples | 22–23 s |

A state looked at on every page is 44 sets, 124 year-runs and about 29 MB. For the opening state the build computes
them all (53 sets with the two tight profiles' sensitivities and three replays; D-126, D-129, D-177, D-221, D-229).

## 3. Where the same input was computed again

Each row is a step in which the reader asked for nothing that the page had not computed before.

| The reader | Before | With the branch |
|---|---|---|
| returns to a value two changes back (`change`) | 48 year-runs, 24 s | none, 0.2 s |
| returns to the opening state (`change`, `lines`) | nothing computed; 12 files fetched again, 4.2 MB, 0.4 s decoding | nothing fetched, 0.2 s |
| on the Presentation page returns to a changed state (`pres`) | 40 year-runs, 16–18 s | none, 0.5 s |
| on the Presentation page returns to the opening state | 16 files fetched again, 9.3 MB, 0.7–0.8 s decoding | nothing fetched, 0.5 s |
| loads the Presentation page again on a changed state | 40 year-runs, 17–20 s | none, 1.1 s (36 sets read from the store) |
| loads the deck's cables' slide again on a changed state (`deckreload`) | 24 year-runs, 14.5 s | none, 0.2 s |
| switches to a validation run (`replay`) | the year, 0.7 s, though the site holds it (D-229) | none, 0.2 s |
| loads the page again on a validation run | the year again, 1.1 s | none, 0.5 s |
| presses Run on the adequacy tab a second time (`adequacy`) | 60 samples, 22.5 s | none |
| loads the development server's page again (localhost:5173) | 60 year-runs, 35–39 s | none, 0.7 s |

In WebKit the same holds: before, the validation year 1.2 s and again 2.5 s after a reload, 4.2 MB fetched again on
each return to the opening state; with the branch none of the three.

Why, before: the browser's store kept twelve tables and twenty-four sensitivity sets (D-128). A state had four to
eight sensitivity sets then; since D-184 it has sixteen, so the store held one state and a half (ERRATA E-190). The
presentation's blocks, the deck's outages and a validation run's year were never written to it — only the 24 sets of
the page's memory held them, which one state's table and sensitivities fill (20). The build's files were read again
whenever the page came back to the opening state, because nothing remembered them once the memory's 24 had turned
over. The adequacy tab kept its last run alone, and dropped it on any change. The development server kept nothing by
decision (D-126): its results would have outlived an edit to the engine.

Two smaller repeats were measured and left as they are. Showing another scenario while the sensitivities compute
drops the years in flight and starts them in the new order: three year-runs, 11–12 of the change's 234–257
worker-seconds (`chips`, before and with the branch). And the same set asked for twice at once is computed twice — it
can only happen when an outage that the deck's slide shows is already set in the panel.

## 4. What cost time besides computing

| What | Before | With the branch |
|---|---|---|
| The opening view: cards after the navigation | 0.56–0.68 s | 0.28–0.43 s |
| … decoding the build's files on the main thread | 0.73–0.77 s for the opening view and 12 sensitivity files | 0.006–0.021 s |
| … bytes fetched | 8.58 MB, 7.03 MB of them results | 5.60 MB, 4.05 MB of them results |
| The Presentation page first shown, opening state: whole after | 1.5 s, 0.95–1.44 s of long tasks | 0.44–0.50 s, 0.33–0.37 s |
| The Presentation page while its 16 sets come in: long tasks | 4.2–4.4 s | 0.5–0.7 s |
| The Presentation page shown again, nothing changed | 0.32 s of long task | none |
| A control moved on the Presentation page: the page whole after (`presprio`) | 49.4 s, 55.2 s | 18.4 s, 19.8 s |
| A control moved in the panel, the deck's cables' slide shown: the slide whole after | 47.6 s | 15.0 s |
| The worker's script, loaded by each of seven workers | 299 kB, the interface's texts in it | 156 kB |
| All the build's sets | 29.0 MB | 18.2 MB |

WebKit: the cards after 0.50–0.55 s before and 0.27–0.47 s with the branch; decoding 0.53–0.66 s and 0.01–0.04 s; a
fresh change the same in both (the table after 6.9–7.3 s, the sensitivities after 30.5–30.9 s).

- **Decoding.** The build wrote typed arrays as JSON text; reading them back went through a reviver that is called for
  every number, 0.38 s for the opening view's 17.8 MB of text. A pack (D-236) keeps the arrays' own bytes after a
  small JSON header: 4 ms, and 35–43 % fewer bytes after gzip.
- **Drawing.** Each arriving set drew the whole Presentation page again — five blocks, fifteen charts, twenty curves
  each sorted from 26 280 hours — about 270 ms a time. Now only the block whose sets changed is drawn, and a set's
  curve is kept with the set (D-235).
- **Order.** The sensitivities ran at priority 1, the presentation's blocks and the deck's outages at 2, whatever page
  was shown. While another page than the Model view is shown they now wait at 2.9 (D-233): on the Presentation page the
  table comes first, then its blocks, then the sensitivities (in after 41–45 s there, 32–35 s before), which are in
  the store when the reader goes back. The adequacy tab's samples go ahead of them in the same way.

## 5. The six proposals

Each is a record in `docs/DECISIONS.md` awaiting the owner's word; this is their sum.

1. **D-232 — one store of sets for every page.** Every set is asked of one store by what it computes from (`jobKey`):
   the page's memory (the sets last used, up to 96 MB, 32 MB on a phone), this browser's IndexedDB (each set with
   when it was last used; the longest unused go beyond 192 MB), the build's files, and only then the engine. The
   presentation's blocks, the deck's outages and replays and a validation run's year go through it as the table and the
   sensitivities do. Supersedes the 24 sets of D-134 and the 12 + 24 of D-128.
2. **D-233 — the sensitivities behind the page shown's own sets**, as above.
3. **D-234 — the adequacy tab keeps its samples** of the last four settings in the page's memory, by the settings, the
   seed, the year and the sample's number: Run pressed again computes nothing, Run for more samples only the new ones.
4. **D-235 — the Presentation page draws again only the part that changed.**
5. **D-236 — the build's sets as packs** of the arrays' own bytes (`opening.bin.gz`, `sets/<n>.bin.gz`); the list of
   the sets stays JSON; `compare_sets` reads both forms, so a deploy can still be compared with the site before it.
6. **D-237 — a set is valid for the sources that compute it.** Until now a set was kept under the build's commit, so
   every deploy emptied every reader's store — three times on 10 November, none of them moving a figure — and the
   development server kept nothing. The proposal keeps a set under an *engine id*: a hash of every source file under
   the six directories that compute, split, keep or name a set (the engine, the worker, the state and its text, the
   store, the contract's types, the adequacy sampler), of the scenario schema and of the solver's pinned version. A
   test finds every import of the worker, the pool, the store and the job's key inside those directories, and the
   worker no longer imports two interface modules that pulled the Estonian dictionary into it. On the development
   server an edit under those directories gives the page a new id and loads it again: checked by editing an engine
   file with the page closed and with it open — the page computed its 60 years anew both times; the edit undone, the
   id was the first one. `?nostore` in the address keeps nothing and reads nothing kept.

**What guards the figures.** A stored set is read only under the engine id, the export's hash and the job's key; a
change to any of the three is another key. The store holds the engine's own output, never something derived from it.
The build's sets are compared with the deployed site's at every deploy (`compare_sets`: the 53 sets of this branch
equal those of 1a4fe28 through the change of file form). The page's own status line says where the years came from:
"computed … when the site was built", "… in this browser before", or "in n s".

## 6. Checked besides the times

- `make ci` on the branch: 230 tests, the lints, the golden fixture's five cases unchanged in V8 and JavaScriptCore,
  the contract, the built site (its JavaScript and fonts 1.34 MB, 1.47 MB before: the worker's script).
- The store in Chromium and WebKit: a store of version 2 as the deployed site leaves it is dropped and opened as
  version 3; a validation year the site does not hold (2026) is computed once, kept with its bytes and time, and read
  back after a reload ("the year computed … in this browser before"); with `?nostore` it is computed again and
  nothing is written.
- The Presentation page in Chromium and WebKit: its fifteen charts hold their drawings and fit their boxes after the
  page is hidden and shown again and after the window is narrowed while it is hidden; the same canvas stands — it is
  not drawn again.
- The development server: the first load computes its 60 years (34 s), the second none (cards after 0.26 s).

Not done: a real iPhone and a real Safari (Playwright's WebKit stands in, as before); the journeys were run once each.

## 7. Looked at and left out

- **A cache under the set** — a year's weeks. Every control but a line's dated what-if changes every week's programme,
  so a week kept would serve only that one control.
- **The solver** — warm starts and presolve were measured for D-130; nothing new here.
- **Brotli for the packs.** Brotli finds what gzip's 32 kB window cannot — the four scenarios' near-equal arrays — and
  packs the opening view into 0.49 MB where gzip needs 1.61 MB. A browser reads it only as a `Content-Encoding`, which
  the host would have to send for pre-compressed files; a decoder in the page would be a new dependency. An option
  for readers on slow lines: 3.5 of the 4.1 MB of a first visit's results.
- **The opening file without its sensitivities**, so that the cards wait for 0.8 MB and not 1.6: a little on a slow
  line, nothing on a fast one.
- **Sensitivities only when their table is on screen.** They run behind everything else already and are kept once
  computed; holding them back would make the reader wait for them later.
- **More states computed by the build.** Each costs about 4 MB of packs and 40 s of the build. With D-232 a state
  opened once in a browser is kept in that browser, which serves a prepared demonstration as well.
- **Keeping the years in flight when another scenario is shown**, and **one computation for two askers of the same
  set**: 5 % of a change at most, and rarely.

## 8. What awaits the owner

1. The six records' sign-off, together or apart. D-237 changes what a kept result is valid for (D-126: "under the
   commit"), so it is the one to read with most care; without it the other five stand as built, the store keyed by the
   commit as before and empty on the development server.
2. A deploy, at the owner's word, after the sign-off: it replaces `opening.json.gz` and the sets' files by packs and
   opens a new store in each reader's browser (the old one, version 2, is dropped; a set kept under it is computed
   again once). A rollback to a copy of the site before it finds the new store and computes without one.

**The owner's answer** (2026-11-10, to the question whether he signs D-232 … D-237): "yes, all six". The six records
are accepted and specification revision 2.76 approved; the branch goes into main and onto the site at his word.
Merged into main and deployed the same day, 15:39–15:42, at the owner's "Yes, deploy it" (main 3e26bb7): the site's 53
sets equal those before through the change of form; on the live site the opening view fetches 13 packs, 4.05 MB, and a
validation year computed there was kept and read back after a reload, in Chromium and in WebKit.
