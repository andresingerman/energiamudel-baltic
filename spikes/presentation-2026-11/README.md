# The presentation of 10 November 2026

The owner's public presentation of the model (docs/PLAN.md §9; DECISIONS D-123, D-124): Estonian, 10–15
minutes, a PowerPoint deck. The deck's every figure is computed as the application computes it, so the
deck is rebuilt on the frozen figures (3 November) with two commands:

- From `app/`: `node --no-maglev ../spikes/presentation-2026-11/figures.ts` — the opening view and the two research
  profiles, the four scenarios each, built and cleared as the worker does and weighted as the page weighs
  them; the four standard sensitivities, the owner's price pairs of LNG and CO₂, in the four scenarios (D-183,
  D-184); CO₂ at Ea Energy's and at 2026's price; Estonia's price-duration curves and demand, the neighbours'
  averages at the state's level, the unit's MW and the opening's wind and solar.
  Writes `data/derived/presentation/figures.json`.
- From the root, with the `python3` on PATH (python.org's 3.13 has python-pptx; `/usr/bin/python3` and the
  repository's `.venv` do not): `python3 spikes/presentation-2026-11/deck.py` —
  nine slides and five in reserve, with speaker notes, read from `figures.json`, the protocol's results
  (`data/derived/validation/`) and the robustness research's `spikes/smr-robustness/summary.json`. Writes the path
  given as its argument — a preview beside the owner's `data/derived/presentation/energiamudel_2026-11-10.pptx`,
  which it writes only while that file does not exist: the owner edits it.

`data/derived/presentation/` is not committed. The slide text is the owner's to edit.

On 3 November `make freeze` runs both commands after October's data and the checks, and writes the preview as
`data/derived/presentation/kulmutatud_<date>.pptx` (D-145).

**The deck on the site** (D-220, 2026-11-08; D-221, the night of 2026-11-09): the view *Esitlus 2* shows the same twelve slides
and, proposed (D-223), a thirteenth on the model's accuracy as its slide 12, then (D-229) Estonia's past years beside the market as
its slide 13, with every figure read from the runs the page shows
or the validation's tables, in the page's language, with a full-screen button and the F key; the
address carries the slide (`?lang=et&view=deck&slide=7`). It is the live alternative to the PowerPoint deck for a talk with a
network or the offline copy; its sentences are written from the figures, where the PowerPoint's are the owner's. The demo
script's step 7b covers it.

`demo_skript.md` — the live demonstration in Estonian, about three and a half minutes: what to click, what to say and the
figures that show, the Presentation page among them, with what to do if something goes wrong (2026-10-19; the figures of
D-164 and the Presentation page since 2026-10-23, and of the same day's corrections, D-169 to D-172).

**Without the network** (D-145): after the deploy of the frozen figures, `make offline` copies the site as deployed to
`data/derived/offline/`. Double-clicking `energiamudel.command` there serves it on the Mac and opens it in Estonian; the
folder can go on a stick. The copy computes as the site does and needs nothing from the network.

The owner's prepared answers to the likely questions of the talk are kept outside the repository (D-323).

`deck.py` reads its figures from `figures.json`, the protocol's results, the robustness study's `summary.json` and
`montecarlo.json` (its ranges) and the coupled tight run's newest `each_C_d*.json`; its axes and the sentences that
compare figures follow them (2026-10-28). The slide text is the owner's: what it says about the base case and the
neighbours is the owner's to word (D-193).

`kone_10min.md` — the talk itself, ten minutes over the site's sixteen slides, in simple spoken Estonian for a speaker
who is not a native one (2026-11-24, at the owner's word): short sentences, rounded figures, no declined numerals, the
figures in words at its end, what to drop if time runs short, and the three likeliest questions.
