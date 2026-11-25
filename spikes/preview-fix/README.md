# preview-fix

**Question** (ERRATA E-040, DECISIONS D-026): can the two-pass preview be corrected so that, with
M3's inputs, it lands near the engine of record over whole years — and is it then still fast?

**Run:** `node spikes/preview-fix/fix.ts` (Estonian annual mean and mean absolute hourly difference
against the engine of record; K = the Daugava's pass-one clearings, N = slices per storage unit).

**Since D-132** the two-pass engine this spike drives is removed from the repository; run it on a
commit before that decision (e.g. `git worktree add /tmp/pre-d132 74b62c0`).

**Result** (2026-09-25; Estonia, €/MWh, one thread on the development machine):

| Case | Engine of record | Preview as built (E-040) | K5 N1 | K5 N6 |
|---|---|---|---|---|
| 2024 replay | 91.0 | 136.7 | 92.3, \|Δ\| 3.1, 0.38 s | 92.6, \|Δ\| 3.2, 0.71 s |
| 2025 replay | 86.2 | 128.1 | 88.2, \|Δ\| 3.0, 0.45 s | 88.4, \|Δ\| 3.1, 0.78 s |
| CY2009, ERAA 2035 | 85.5 | 122.6 | 99.1, \|Δ\| 41.0, 0.43 s | 86.3, \|Δ\| 33.7, 0.76 s |
| CY1995, ERAA 2035 | 40.2 | 54.1 | 47.2, \|Δ\| 8.7, 0.42 s | 44.3, \|Δ\| 5.8, 0.77 s |

The Daugava's response from five clearings fixes the replays: with the thermal fleet at its
observed weekly maximum, the line between two clearings (minimum flow and turbine limit) runs
through scarcity prices and sets the water value far too high. In scenario runs with GW-scale
batteries the storage plan is the obstacle, as in `spikes/storage-impact/`: planned in slices, each
against the prices the earlier ones leave, the fleet runs at part load and the annual mean comes
within 1–4 €/MWh, but hourly prices still differ by 6–34 €/MWh. Both corrections together take
0.7–0.8 s a year, no faster than the engine of record with its weeks on four workers (0.35 s a
year, 1.45 s a set, M2's benchmark), so the owner dropped the preview from the application
(D-026). Disposable: not held to the repository's standards (AGENTS.md §3).
