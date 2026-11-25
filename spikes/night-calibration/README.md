# Night calibration experiments (2026-10-04)

Working tools of the calibration round of DECISIONS D-042; not held to the repository's standards
(AGENTS.md §3). Each run changes one thing on the built problem or the presets and replays 2023,
2024 and 2025 with the engine of record. The log and the results are in
`docs/research/2026-10-04_calibration_night.md`.

    node spikes/night-calibration/exp_night.ts [key=value …] [years=2023,2024]
    node spikes/night-calibration/diag_night.ts 2024     # the record's quantities by price bin
    node spikes/night-calibration/diag_regime.ts 2024    # which price sets the Baltic price

Keys of `exp_night.ts`: `pumped` (Kruonis Δ, €/MWh), `dmax` (the Daugava's limit as a share of its
weekly maximum, read from the validation file), `floor` (scale of the register's floors),
`revealed` (the floor from below-cost hours, margin in €/MWh; `rq` a quantile instead of the
mean), `noloss`, `nomarkup`, `avail`, `availgas`, `addgas`, `addshale`, `addbio`, `ntc`,
`shale` (a markup on Estonian oil shale, four values), `peak` (what is unused in the hours
Lithuania cleared at or above the value), `diag` (the protocol's breakdown for a zone).
Observed series come from the validation files only (R-BND-3).
