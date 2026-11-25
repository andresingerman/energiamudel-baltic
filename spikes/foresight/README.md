# Storage without perfect foresight (the night of 2026-10-11; D-112, ERRATA E-139)

The engine of record cleared each UTC week as one programme, so every store and the Daugava
planned the week with all of its hours known (D-021). E-139's second fix, D-099's next step:
limited foresight.

## Scripts

- `score.ts`: the night's scoreboard, run by every variant. It reports, per replay year:
  - the zones' MAE and its sum;
  - the error in the dear hours;
  - Estonia's split from Latvia;
  - Kruonis, the batteries and oil shale;
  - R-VAL-5's breaches.
- `rolling.ts`: the prototype. Each day of a week is cleared in a window of W hours, the day is
  kept, and the stores' energy and the week's budgets are carried forward. `--same` checks that
  a window of a week reproduces the weekly programme (difference 0).
- `refit.ts`: the register refitted on a variant, by copies of `app/scripts/fit_markup.ts` and
  `fit_delta.ts`. The weekly variant reproduces the register in force exactly (42.5 / 197.5 /
  317.5 / 337.5, Δ 69.5). Given a register (`m1,m2,m3,m4,Δ`), it scores it without the fit.
- `compare.ts`: the candidates' breaches by name, and the opening state's four scenarios.

`result.json` holds every run of the table below. The first prototype's runs quoted in the text
(without a refit, a day's window, whole budgets) were not kept.

## Results

Each variant was refitted on the data to September 2026 (D-111). The table gives the sum of the
three zones' MAE in €/MWh, and R-VAL-5's breaches in 2023 / 2024 / 2025.

| Clearing | 2023 | 2024 | 2025 (blind) | 2026 (blind) | Breaches |
|---|---|---|---|---|---|
| weekly (D-111) | 27.41 | 35.32 | 55.57 | 34.69 | 11 / 9 / 15 |
| 48 h, the day kept | 27.63 | 35.30 | 54.26 | 34.95 | 10 / 7 / 15 |
| 72 h, the day kept | 27.71 | 35.10 | 55.84 | 34.83 | 10 / 9 / 13 |
| 48 h + oil shale's entry by the day (`../commitment/`, minimum time on) | 27.82 | 34.75 | 55.19 | 34.37 | 8 / 5 / 9 |
| 48 h + oil shale's entry in campaigns | 27.82 | 34.87 | 55.20 | 34.77 | 8 / 7 / 9 |
| weekly + oil shale's entry in campaigns | 27.46 | 34.49 | 54.40 | 34.21 | 8 / 7 / 13 |
| weekly + the engine's entry (D-113 without D-112; `refit.ts weekly+engine`) | 27.52 | 34.21 | 54.74 | 34.16 | 10 / 8 / 13 |
| 48 h + the engine's entry, the start on the megawatts available (measured, not built) | 27.71 | 34.45 | 54.11 | 34.36 | 8 / 7 / 9 |

The rows with oil shale's entry were scored again after ERRATA E-141 (`refit.ts` with each
register given): no price moved, so the sums are as fitted; each year lost one breach, oil
shale's own. The engine of record with D-112 and D-113 (`rescore_48_24_engine`) gives the first of
them to the cent.

- **The registers:**
  - 48 h: markup 30 / 142.5 / 232.5 / 252.5, Δ 63.5;
  - 72 h: markup 32.5 / 182.5 / 302.5 / 322.5, Δ 64;
  - 48 h with entry: markup 37.5 / 150 / 240 / 260, Δ 71 (minimum time on) and 69.5 (campaigns).
  - weekly with the engine's entry: markup 40 / 195 / 315 / 355, Δ 72;
  - 48 h with the engine's entry, the start on the megawatts available: markup 37.5 / 147.5 /
    237.5 / 257.5, Δ 71.
- **Without a refit**, 48 h on D-110's register made the blind year worse (2025: 57.62) and 2024 a
  little better (35.08). The markup fitted under perfect foresight overprices once the stores stop
  shaving the peaks.
- **Not shown:** a window of a day alone (24 h, too short) and budgets left whole to the first
  window (the Daugava empties itself in the week's first days) are worse still.
- **The opening state** moves by 0.7 €/MWh at most under every candidate `compare.ts` ran (not
  72 h, not the weekly programme with the engine's entry).

## Reading

- **48 hours alone** gains the blind year 2025 1.3 in sum and loses 2026 0.3.
- **Kruonis** falls further short of its record (0.24–0.32 TWh against the record's 0.43–0.57; 0.31–0.38
  on the weekly programme).
- **With oil shale's entry, by the day or in campaigns,** the blind year's six breaches of the price
  distribution go: its duration-curve RMSE and its share of hours ≥ 150 €/MWh, in each zone.
  Neither 48 hours nor the entry does that alone.
- **Oil shale under the entry rule** stays within 6 % of its record in 2023–2026 (as first scored,
  before ERRATA E-141, it read 16–28 % below). See `../commitment/`.
