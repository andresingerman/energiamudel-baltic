# OPEN-2: PECD's onshore wind factor corrected, four options (docs/research/2026-10-08_open2_pecd.md)

`node spikes/open2-pecd/pecd.ts` (about 80 s) runs the opening state's four scenarios with
Latvia's and Lithuania's onshore wind scaled by each option's factor — none, Lithuania at 0.80, by
vintage (the fleet at the end of 2025, A68 of 1 January 2026, at the record's ratio and the rest at
PECD: 0.964 and 0.823), and the record's ratio on the whole fleet — and prints the zones' prices
weighted over the climate years and Lithuania's wind output. `result.json` is its output on
`night/2026-10-09` (D-105 and D-106 in).
