# site-timing

**Question** (the night of 2026-10-18, D-127): how long does the built site take, from a change of a
control to the scenario shown drawn, to the table complete and to the sensitivities in, when the
Claude app's browser pane cannot be trusted with times — it is throttled while the screen is idle?

**Run:** serve `app/dist` (`npm --prefix app run preview -- --port 4173`, after `npm run build` and
`node --no-maglev scripts/opening.ts` in `app/`), then from the repository `node spikes/site-timing/measure.ts
[url] [label]`. It starts the installed Google Chrome headless with a fresh profile, clears the
origin's data, opens the page, waits for the opening view, changes Finland's price level seven times
(four with Elering: gas shown, three with 2 SMR) and prints one JSON line: the opening view's time
after the navigation and, per change, (a) the scenario shown drawn, (b) the table complete, (c) the
last sensitivity in. Nothing is installed; the DevTools protocol goes over Node's own WebSocket.

**Result** (2026-10-18, 8-core Mac, Chrome 155, seven workers): see D-127 and methodology §11.
Disposable: not held to the repository's standards (AGENTS.md §3).
