# The calibration round of 2026-10-11

The research log is `docs/research/2026-10-11_calibration_round.md`. It holds the questions, the
rule written before scoring, and the results. Run everything from `app/`.

- `node scripts/fit_markup.ts --objective=bias|dur > candidate.json` fits a candidate register (A1,
  A2). The objective adds each zone's |average bias|, or its duration-curve RMSE, to its MAE. The
  register in force is fitted on the MAE alone, which is the default.
- `node ../spikes/calibration-round/score.ts candidate.json` scores a candidate on the replays
  2020–2026: MAE, average bias, duration-curve RMSE, the share of dear hours and the breaches. It
  also crosses each fold's schedule onto the other fit year.
- `node ../spikes/calibration-round/kruonis.ts [candidate.json]` runs the opening view with a
  scenario's Kruonis three ways: as installed (B0), at the record's power (B1), and with the step per
  megawatt (B2). Without a candidate it uses the register in force.
