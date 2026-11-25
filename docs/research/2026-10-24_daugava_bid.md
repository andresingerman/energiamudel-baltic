# The Daugava at a bid of 0

*2026-10-24 · executor · the owner: "look into whether we
can set the Daugava's bid to 0" · `spikes/daugava-bid/run.ts` (from `app/`, `node --no-maglev`), its
`result.json` · on main 0c63675, the site's engine. Nothing here changes a figure.*

## The question

The Presentation page's inputs show Latvia's hydro, the Daugava cascade of 1 592 MW, at "83–90 €/MWh". Estonia's
and Lithuania's hydro show none. Can the cascade bid 0?

## What the engine does

- **The cascade's release already costs nothing.** In the programme each hour's release is a column at cost 0,
  between the minimum flow and the turbines' megawatts (`lp.ts`). What limits it is water:
  - each week's release is held to the week's inflow, the budget row, at the record's level (D-070);
  - each hour's output is held to the band the record shows for a week of that average output (D-071).
- **The page's figure is not an input.** It is the cascade's water value: the dual of the week's budget, the
  price at which one more MWh of the week's water would be used. In effect it is the price of the dearest hours the
  water does not reach, where it would displace gas or imports. The page averages the year's weeks and weights the
  climate years. The range is the four scenarios': 90.2 €/MWh with no unit, 86.7, 83.6 and 82.6 with three.
- **In 6–7 % of the weeks the water value is below 1 €/MWh.** These are the spring floods: there is more water
  than the turbines can pass, and the cascade does run at a bid of 0.
- **This is the usual treatment of a reservoir in a market model.** Its offer is the value of its water, not its
  running cost, because water used now is water not used in a dearer hour later.

## A bid of 0 in every hour

A cascade that offers its output at 0 in every hour, as a price-taker, does not choose its hours: it releases the
week's water as it comes. The spike runs that as **flat** — each week's water spread evenly over its hours, at most
the turbines' megawatts. It also runs **half**: half the water even, half moved by its value within the same band.
Both run beside the engine as it is.

### The record against the engine

**How the shaping is measured:** the cascade's output in each week's dearest quarter of hours against its
cheapest quarter, averaged over the weeks. The record (ENTSO-E A75, Latvia's hydro) is ranked by the record's
price; the replays by their own price.

| Year | The record | The engine as it is | Half |
|---|---|---|---|
| 2023 | 508 / 349 MW, ×1.45 | 589 / 285 MW, ×2.06 | ×1.80 |
| 2024 | 481 / 272 MW, ×1.77 | 552 / 200 MW, ×2.76 | ×2.17 |
| 2025 | 458 / 233 MW, ×1.97 | 520 / 169 MW, ×3.08 | ×2.60 |

**The real cascade moves its water to the dear hours, and more so each year.** A cascade at a bid of 0 would not
(×1.00).

**The engine moves more than the record does.** It sees the day and the next with certainty and runs between the
week's 10th and 90th percentile hour, where the real cascade holds reserves and cannot know the prices ahead.

### The replays (R-VAL-5's metrics)

| Year | Hourly MAE EE / LV / LT, as it is | Half | Flat | Duration-curve RMSE, as it is | Flat | Breaches: as it is / half / flat |
|---|---|---|---|---|---|---|
| 2023 | 9.2 / 9.1 / 8.6 | 9.4 / 9.3 / 8.9 | 10.3 / 10.1 / 9.7 | 3.8 / 4.2 / 4.0 | 4.9 / 5.1 / 4.9 | 7 / 8 / 7 |
| 2024 | 10.5 / 12.1 / 12.0 | 10.6 / 12.2 / 12.1 | 13.4 / 14.7 / 14.7 | 8.0 / 10.9 / 10.7 | 4.1 / 5.7 / 5.7 | 8 / 9 / 4 |
| 2025 | 17.8 / 16.9 / 16.8 | 17.8 / 16.8 / 16.7 | 31.1 / 45.0 / 41.7 | 14.4 / 15.6 / 15.8 | 7.3 / 361.4 / 361.0 | 11 / 13 / 10 |

**Flat worsens the hourly error in every year and zone:** by about 1.1 €/MWh in 2023, by 2.6–2.9 in 2024.

**In 2025 flat breaks.** Without the cascade's peak, Latvia and Lithuania run short: 124 zone-hours at the price cap
(15 in 2024, none as it is). The hourly error rises to 31–45 €/MWh.

**Flat's duration curve is closer to the record's in 2024, and its breaches fewer.** The dear hours come back
because the cascade no longer shaves them. But they come at the wrong hours, which is why the hourly error grows.

**Half changes nothing material.** The hourly error moves by ±0.3 €/MWh and the breaches rise to 8 / 9 / 13. Moving
less water is no lever on the dear hours.

### 2035, the opening state

| | Estonia, 0 / 1 / 2 / 3 SMR | Latvia, 0 / 3 SMR | Two units' effect on Estonia | The contract, two units, M€ a year |
|---|---|---|---|---|
| As it is | 83.6 / 75.1 / 66.2 / 56.2 | 79.8 / 74.1 | −17.4 | 115 |
| Half | 83.9 / 75.2 / 66.3 / 56.2 | 80.2 / 74.3 | −17.6 | 115 |
| Flat | 84.6 / 75.6 / 66.6 / 56.2 | 80.9 / 75.0 | −18.0 | 113 |

A flat cascade raises the prices by up to about 1 €/MWh and makes the plant's effect 0.5–0.9 €/MWh larger: the
cascade no longer shaves the dear hours the plant then cuts.

## Conclusion

- **The cascade already bids 0 in the programme.** The 83–90 €/MWh on the page is its water value, the outcome of a
  week's water being short of its turbines.
- **A bid of 0 in every hour is not proposed.** It would make the cascade a price-taker that does not move its
  water. The record shows it does (×1.45–1.97), the replays get worse, and 2025 runs short. The 2035 figures would
  rise by up to 1 €/MWh.
- **The engine moves more water than the real cascade.** Moving less (half) changes neither the error nor the dear
  hours.
- **What the page can do is say what the figure is.** For example, a tip on the Presentation page's inputs, in both
  languages: "The Daugava has no fuel: its running cost is 0. Its figure is the value of its water — the price above
  which a week's water is worth using; a range is the four scenarios'". The owner's choice.

**Decided (D-176, 2026-10-24):** "we keep the model as it is; put 0 in the bid with a tip". The model stays as it is.
The Presentation page shows the cascade's bid as 0 €/MWh, with a tip in both languages that gives its water value
(83–90 €/MWh at the opening state) and says why the cascade runs only above it.
