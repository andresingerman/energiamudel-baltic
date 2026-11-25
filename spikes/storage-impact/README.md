# storage-impact

**Question** (R-ENG-8, DECISIONS D-019): does the gap between the engine and the LP close if each
storage unit is scheduled against the prices its own full-power steps would meet, one unit
after another (the year cleared with the units already scheduled and this one charging, then
discharging, at full power), instead of against the price with no storage?

**Run:** `node spikes/storage-impact/impact.ts <out dir>`, then compare with the LP as
`reference/gap.py` does (`python -m reference.gap <out dir>`; it rewrites
`data/derived/gap/gap.json`, so run `make gap` afterwards).

**Since D-132** the two-pass engine this spike drives is removed from the repository; run it on a
commit before that decision (e.g. `git worktree add /tmp/pre-d132 74b62c0`).

**Result** (2026-09-25): no. Kruonis, seeing the price effect of its full 900 MW, barely cycles
(0–666 MWh against the LP's 3 316–8 456 in four observed weeks); in the winter week of climate
year 2009 the batteries discharge what the LP does in total, but in other hours, and prices
differ by 61 €/MWh. Full-power steps are the obstacle: the LP runs storage at part load.
Disposable: not held to the repository's standards (AGENTS.md §3).
