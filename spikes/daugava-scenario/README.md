# The scenario's Daugava (ERRATA E-063)

`exp_daugava.ts` runs the opening state's four scenarios with the Daugava cascade as built,
without TYNDP 2024's weekly "maximum generating power", with its inflow rescaled, and with both.
It changes the year files in memory only. Run from `app/`:
`node ../spikes/daugava-scenario/exp_daugava.ts [factor]` (default 1.95).

The finding and the figures are in `docs/research/2026-10-05_daugava_scenario.md`.

`exp_band.ts` sizes the second step D-070 names: the record's weekly band of the cascade's hourly
output (2020–2025, as ratios of the week's mean by terciles of that mean) laid on the scenario's
weekly water. Measured on 2026-10-05, after D-070: *Elering: gas* 57.0 / 45.6 / 45.6 €/MWh (EE /
LV / LT) against 55.4 / 44.3 / 44.5; *2 SMR* 44.5 / 41.7 / 41.8 against 43.9 / 40.6 / 41.1;
Latvia's P95−P5 price spread 142 against 134 €/MWh. Not adopted: the owner's decision.
