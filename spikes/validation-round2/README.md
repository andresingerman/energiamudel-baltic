# Validation round of D-073 (night of 2026-10-05)

Working tools of the calibration round of DECISIONS D-073; not held to the repository's standards
(AGENTS.md §3). The log and the results are in `docs/research/2026-10-05_validation_round3.md`.
All scripts run from `app/` on the committed export; observed series come from the validation
files only (R-BND-3), except Kruonis's pumping, read from the cached A75 files.

    node ../spikes/validation-round2/exp.ts [key=value …] [years=2023,2024,2025] [bins]
    node ../spikes/validation-round2/setter.ts 2025 [lo hi] [zone]   # what sets the model's price in a bin
    node ../spikes/validation-round2/gap.ts 2025 [split hour]        # model against record by technology
    node ../spikes/validation-round2/ntc.ts 2025                     # capacities against schedules
    node ../spikes/validation-round2/markup_starts.ts 0,100,100,100  # the joint descent from another start
    node ../spikes/validation-round2/markup_cv.ts zone 2023 2024     # a form fitted on one year, scored on another
    node ../spikes/validation-round2/scenario_markup.ts              # the markup register in the 2035 scenarios
    node ../spikes/validation-round2/months.ts 2025                  # MAE and bias by month
    node ../spikes/validation-round2/peaks.ts 2025 [250]             # the dearest observed hours by the model's regime
    node ../spikes/validation-round2/litpol.ts 2024                  # Lithuania's error by the state of LitPol
    .venv/bin/python spikes/validation-round2/pl_check.py            # (repository root) D-076's test
    node ../spikes/validation-round2/links.ts 2026                   # the internal borders' capacities against schedules
    node ../spikes/validation-round2/reserve.ts 2026 LV-LT           # a replay without the reservation on a border
    .venv/bin/python spikes/validation-round2/reserve_check.py       # (repository root) D-077's test
    .venv/bin/python spikes/validation-round2/kruonis_record.py      # (repository root) -> kruonis_record.json

Keys of `exp.ts` (each changes the built problem of the engine as it stands, so after D-073 they
act on its register): `pumped` (Kruonis Δ), `mk` (a markup schedule, `EE;LV;LT`), `oldmk` and
`olddelta` (the register of D-044), `kq` (Kruonis's power as a weekly quantile of the record's
pumping and output, `kdir=d|c|sym` one direction or the output alone), `kmw` (a megawatt
figure), `kfix` (Kruonis as recorded), `tmin` (a weekly quantile as each thermal technology's
least output, `tt=` technologies, `tz=` zones), `hub=net|all` (the Nordic virtual hubs' spread
added to the boundary price from `hub_spread.json`, a scratch file of the first test of D-075;
the engine now takes the network part from the export). The trials of the log that compare with the
engine before D-073 were run before its two rules were built in.
