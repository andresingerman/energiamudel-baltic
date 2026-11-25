# How robust the plant's price effect is (2026-10-18)

**Why.** The owner asked what else could be done with v5 and chose, among four tasks, the plant
effect's robustness ("Robustness of the SMR effect"). The site shows one point: the opening state, where
two units take 17.5 €/MWh off Estonia's 2035 price. The Ea Energy comparison showed that the effect
shrinks as fuel and CO₂ get cheaper (`docs/research/2026-10-18_ea_energy_comparison.md`). This is the
measurement over the whole range of the inputs the result leans on.

**Answer.** The effect's sign and size hold.
- **Two units** lower Estonia's 2035 average price by 12–20 €/MWh in 90 % of 300 combinations of the
  inputs, and by 10.0–21.7 in all of them. The median is 15.6.
- **The size follows fuel and CO₂.** Gas and CO₂ explain 88 % of the effect's variance. The more
  fossil power costs, the more the plant saves.
- **The contract at a strike of 90 €/MWh costs the state money in every sample** with two or three
  units: for two, 71–232 M€ a year (90 %), median 157. The opening view's 110 is on the cheap side,
  because its CO₂ price, ERAA's 197.5 €/t, is at the top of the range.

## Method

`spikes/smr-robustness/montecarlo.ts`, from `app/`. It runs the opening state's four scenarios over
a Latin hypercube of six inputs: 300 samples, seed 20261018. That is 3 600 year-runs, 25 minutes on
seven workers (part of it beside another run).
- **The same computation as the page.** Each year is cleared by the page's own job handler through
  the worker pool, as `scripts/opening.ts` precomputes the site. The climate years are weighted as
  the page weighs them, and the contract card's account (`engine/contract.ts`) is applied to each
  plant scenario.
- **Checked against the site.** `montecarlo.ts opening` runs the opening state through the same
  account. It gives Estonia 84.65 €/MWh, 67.17 with two units and a contract cost of 110.19 M€ a
  year, as the site shows.

**The inputs.** Each is drawn uniform and independent of the others; everything else is the opening
state's.

| Input | Range | The opening state | Why this range |
|---|---|---|---|
| CO₂ in 2035 | 80–200 €/t | 197.5 | Today's allowance (about 85 €/t in October 2026's EEX auctions, 78 on the year's average) to ERAA 2025's 197.5 |
| Gas in 2035 | 25–50 €/MWh thermal | 38.2 | Ea Energy's 27 to above ERAA 2025's 38.2 |
| The neighbours' level | ×0.8–1.4 | ×1 | One factor on Finland, SE4 and Poland together. Their profile is first re-priced to the sample's gas and CO₂ (D-079) |
| Estonia's demand | ×0.85–1.10 (9.9–12.8 TWh) | ×1 (11.6 TWh) | Holds Ea's 10.2 and the S1 scenario's 11.6 |
| Estonia's onshore wind | 1 000–2 500 MW | 1 244 | Holds S1's 1 244 and the recent pace's 1 481 (`docs/research/2026-10-06_statistics.md`) |
| Estonia's solar | 1 500–3 000 MW | 1 785 | Holds S1's 1 785 and the recent pace's 2 537 |

The contract is the card's: two-sided, hourly, strike 90 €/MWh, without the negative-price clause.
A positive cost is what the state pays.

`analyse.py` reads `montecarlo.json` and writes `summary.json` beside it (from the repository's root).

## Results

**Estonia's 2035 average price, €/MWh** (percentiles of the 300 samples):

| Scenario | 5 % | 25 % | 50 % | 75 % | 95 % | The opening state |
|---|---|---|---|---|---|---|
| Elering: gas | 57.1 | 64.8 | 73.5 | 82.2 | 93.2 | 84.7 (79th percentile) |
| 1 SMR | 50.1 | 57.4 | 66.0 | 74.1 | 84.1 | 76.3 |
| 2 SMR | 43.4 | 50.3 | 58.0 | 65.7 | 74.8 | 67.2 |
| 3 SMR | 37.2 | 43.5 | 50.4 | 57.6 | 65.7 | 56.9 |

**The plant's effect on Estonia's price**, the scenario less Elering: gas in the same sample, €/MWh:

| Units | 5 % | 50 % | 95 % | Range | The opening state | Share of the price taken off (median) |
|---|---|---|---|---|---|---|
| 1 | −10.0 | −7.7 | −5.6 | −11.1 … −4.9 | −8.4 | 11 % |
| 2 | −19.9 | −15.6 | −12.0 | −21.7 … −10.0 | −17.5 | 22 % |
| 3 | −29.4 | −23.2 | −17.8 | −32.0 … −14.7 | −27.7 | 31 % |

Latvia's and Lithuania's prices move far less: two units take 2.2–5.0 €/MWh off Latvia's (median 3.4).

**The contract at 90 €/MWh, M€ a year:**

| Units | 5 % | 50 % | 95 % | Range | The opening state | Samples where the state pays |
|---|---|---|---|---|---|---|
| 1 | 11 | 58 | 98 | −23 … 121 | 31 | 98 % |
| 2 | 71 | 157 | 232 | 7 … 271 | 110 | 100 % |
| 3 | 179 | 296 | 395 | 102 … 449 | 245 | 100 % |

The plant's capture price falls as it lowers the price it sells at. With two units it is 44–76
€/MWh (90 %, median 58.9); no sample with two or three units reaches the strike.

## What drives each

The share of each result's variance each input explains: the squared standardised regression
coefficients, which add up to the linear fit's R² when the inputs are independent.

| Result | CO₂ | Gas | Neighbours | Demand | Onshore | Solar | R² |
|---|---|---|---|---|---|---|---|
| Estonia's price, Elering: gas | 0.29 | 0.24 | **0.45** | 0.04 | 0.05 | 0.01 | 0.99 |
| The effect of 2 SMR | **0.43** | **0.45** | 0.06 | 0.08 | 0.00 | 0.00 | 0.97 |
| The contract's cost, 2 SMR | 0.23 | 0.17 | **0.53** | 0.09 | 0.06 | 0.01 | 0.99 |

- **The price level** follows the neighbours most, then CO₂ and gas.
- **The plant's effect** follows CO₂ and gas. By quarter of the CO₂ range, two units take 13.8, 15.1,
  16.3 and 17.5 €/MWh off; by quarter of the gas range 14.2, 15.5, 15.5 and 18.1. More demand makes
  the effect a little smaller (Spearman +0.28).
- **The contract's cost** follows the price level, so the neighbours most. Every input that lowers
  the price raises it.
- Estonia's wind and solar within these ranges hardly matter to any of the three.

## What it shows

1. **The effect is robust in sign and order of magnitude.** Every sample gives two units between
   10.0 and 21.7 €/MWh in Estonia. The headline's 17.5 is at the 25th percentile: three
   samples in four give less, because its CO₂ price is at the top of the range.
2. **The plant takes a share of the price, not a fixed amount.** Two units take about a fifth of
   Estonia's price off (18–25 %, 90 %). The share holds better than the euros: the euros follow the
   fossil price that sets Estonia's price in the hours the plant displaces.
3. **Cheaper fossil power means a smaller effect and a dearer contract.** The two move together:
   where gas and CO₂ are cheap the plant saves least, and its capture price falls further below the
   strike. A strike of 90 is above every sample's capture price with two or three units.
4. **The neighbours set the contract's cost more than the plant's effect.** Their price level
   moves the effect little (Spearman −0.23) but the contract's cost a lot (−0.69): the plant sells
   at the region's price.

## Limits

- **Independent inputs.** Gas and CO₂ prices tend to move together. Correlated, they would widen the
  spread of the price and of the effect; the medians would hold.
- **The rest is the opening state's.** Latvia's and Lithuania's fleets, the batteries, the cables,
  Kruonis and the shape of the neighbours' profile stay as they are; only the neighbours' level and
  their re-pricing to the sample's fuel move.
- **The neighbours are price-takers** (R-BND-6). With the plant, Estonia exports more, and a
  price-taker Finland takes it at its own price, which does not fall. Where Finland's price would
  fall too, Estonia's falls further: the effect here leans low, and the contract's cost with it.
  D-121's coupled runs put the gap at 2.5 / 4.9 / 7.6 €/MWh for one, two and three units in the
  `TIGHT` profile (1.5 / 3.2 / 4.6 in `TIGHTJ`). In the official profile, where Finland clears with
  Sweden in 81–86 % of hours, it is small (`docs/research/2026-10-17_curve_slopes.md`). It is not
  sampled here.
- **The plant runs as the card has it:** must-run under a plain contract. The clause, the strike and
  the plant's cost are the owner's inputs, not sampled. The model computes no cost of the plant.
- **The model's own error** applies to every sample: the replays' hourly error is 8–18 €/MWh
  (methodology §7.3). Scenario years have no record to check against.

## What changes

- **The figures:** nothing. This is a measurement around the opening state.
- **For the presentation:** a new answer, K46, in `spikes/presentation-2026-11/kusimused_ja_vastused.md`.

## Re-run on the gas plants' one bid (2026-10-23)

The same 300 samples (the same seed and ranges) run again on main 6912017 — the units on top of the gas (D-151),
every Baltic gas plant at one bid (D-164) — with `montecarlo.ts` and `analyse.py` unchanged (`montecarlo.json` and
`summary.json` rewritten). In brackets the run above.

| Estonia's 2035 average, €/MWh | 5 % | 25 % | 50 % | 75 % | 95 % | The opening state |
|---|---|---|---|---|---|---|
| 0 SMR | 58.2 (57.1) | 66.2 | 74.9 (73.5) | 83.5 | 93.7 (93.2) | 85.4 (78th percentile) |
| 1 SMR | 50.8 (50.1) | 58.6 | 66.7 (66.0) | 75.1 | 84.8 (84.1) | 76.4 |
| 2 SMR | 43.7 (43.4) | 50.8 | 58.4 (58.0) | 66.2 | 74.9 (74.8) | 67.1 |
| 3 SMR | 37.3 (37.2) | 43.5 | 50.3 (50.4) | 57.7 | 65.2 (65.7) | 56.6 |

| Units | The plant's effect, 5 % / 50 % / 95 % | Range | The opening state | Contract at 90 €/MWh, M€, 5 % / 50 % / 95 % | Range | The state pays in |
|---|---|---|---|---|---|---|
| 1 | −10.4 / −8.2 / −6.4 (−10.0 / −7.7 / −5.6) | −11.4 … −5.5 | −9.0 | 10 / 56 / 97 (11 / 58 / 98) | −24 … 118 | 98 % |
| 2 | −20.7 / −16.6 / −13.2 (−19.9 / −15.6 / −12.0) | −22.4 … −11.8 | −18.3 | 70 / 155 / 230 (71 / 157 / 232) | 9 … 267 | 100 % |
| 3 | −30.3 / −24.5 / −19.5 (−29.4 / −23.2 / −17.8) | −32.8 … −17.1 | −28.8 | 181 / 296 / 395 (179 / 296 / 395) | 105 … 445 | 100 % |

The effect is about 1 €/MWh deeper across the distribution, mostly from D-151's units on top of the gas (0.6–0.7 at
the opening state; D-164 adds 0.1 there). Two units take 13–21 €/MWh off Estonia's price in 90 %
of the samples (12–20 before) and 22 % of it at the median. Latvia's falls by 2.6–5.3 (median 3.9). The plant's capture
price with two units is 44–76 €/MWh (median 59.3), and no sample with two or three units reaches the strike. The
drivers are as above: CO₂ and gas deepen the effect, demand flattens it. The conclusions stand; the questions and
answers (K46) and the deck's reserve slide L4 carry the new ranges.

## Re-run on the corrections of 2026-10-23 (D-169 to D-171)

The same 300 samples run again on main 98a69de: the cheaper gas plant first among equal bids (D-169), the
Lithuania–Poland lines AC (D-170), and the record's gas price per net MWh with the adder refitted to 42.5 €/MWh
(D-171). `montecarlo.ts` and `analyse.py` are unchanged; `montecarlo.json` and `summary.json` are rewritten. In
brackets, the run on one bid above.

| Estonia's 2035 average, €/MWh | 5 % | 25 % | 50 % | 75 % | 95 % | The opening state |
|---|---|---|---|---|---|---|
| 0 SMR | 56.9 (58.2) | 64.8 | 73.7 (74.9) | 82.2 | 92.5 (93.7) | 83.6 (77th percentile) |
| 1 SMR | 50.0 (50.8) | 57.4 | 65.8 (66.7) | 74.1 | 83.7 (84.8) | 75.1 |
| 2 SMR | 43.3 (43.7) | 50.0 | 57.8 (58.4) | 65.6 | 74.3 (74.9) | 66.2 |
| 3 SMR | 37.1 (37.3) | 43.4 | 50.1 (50.3) | 57.6 | 64.9 (65.2) | 56.2 |

| Units | The plant's effect, 5 % / 50 % / 95 % | Range | The opening state | Contract at 90 €/MWh, M€, 5 % / 50 % / 95 % | Range | The state pays in |
|---|---|---|---|---|---|---|
| 1 | −10.0 / −7.8 / −5.9 (−10.4 / −8.2 / −6.4) | −11.0 … −5.1 | −8.5 | 12 / 58 / 99 (10 / 56 / 97) | −22 … 120 | 99 % |
| 2 | −19.8 / −15.8 / −12.4 (−20.7 / −16.6 / −13.2) | −21.3 … −11.0 | −17.4 | 73 / 158 / 233 (70 / 155 / 230) | 8 … 270 | 100 % |
| 3 | −29.2 / −23.3 / −18.5 (−30.3 / −24.5 / −19.5) | −32.2 … −16.2 | −27.5 | 182 / 297 / 396 (181 / 296 / 395) | 104 … 446 | 100 % |

Estonia's price without the plant is about 1.2 €/MWh lower across the distribution, with three units 0.2–0.3. The
plant's effect is 0.4–1.2 €/MWh smaller, as at the opening state (−17.4 against −18.3 with two units). At the opening
state about half of that comes from the Lithuania–Poland lines at their full capacity (D-170) and half from the lower
gas adder (D-171).

Two units take 12–20 €/MWh off Estonia's price in 90 % of the samples (13–21 on one bid), 22 % of it at the median.
Latvia's price falls by 2.2–4.7 (median 3.4). The plant's capture price with two units is 44–76 €/MWh (median 58.7), and
no sample with two or three units reaches the strike.

CO₂ and gas explain 82 % of the variance of two units' effect (43 and 39 %), the neighbours 13 %. The conclusions
stand. K46 and the deck's reserve slide L4 carry the new ranges.

## Addendum, 2026-10-28: on the owner's opening and ranges (D-191)

Run again on the owner's opening (D-182 to D-190) with the ranges at the owner's word (D-191): the neighbours'
level ×1.0–2.0 (it was ×0.8–1.4, which left the opening's ×1.48–1.53 outside) and gas 30–75 €/MWh thermal (it
was 25–50). CO₂, demand, wind and solar are as before. 300 samples, the same seed, 3 600 years in 29 minutes on
seven workers.

**Two units' effect on Estonia: 15.4–24.8 €/MWh in 90 % of the samples, median 19.9, all of them 11.7–27.1.**
- One unit takes 7.4–13.2 (median 10.1) and three take 22.0–35.3 (median 28.5); no sample changes the sign.
- Gas and CO₂ explain 94 % of the variance of two units' effect (67 and 27 %); the neighbours' level 1 %.
- The neighbours' level sets the price itself: Estonia without the plant is 76.6–128.1 €/MWh in 90 % of the
  samples, and the level explains 55 % of its variance.

**The contract (a) at 90 €/MWh, two units: the state pays in 69 % of the samples.**
- In 90 % of them the state's cash flow is −164 … +95 M€ a year, median −50 (negative: the state pays).
- With one unit the state pays in 48 % (median +3 for the state); with three in 86 % (median −140).
- The opening's 17 M€ with two units lies on the cheap side, its CO₂ at the top of the range.

The conclusions stand: the effect is of one sign and of the same order in every sample, larger where fossil
electricity is dearer. The contract's sign is now the samples' to decide. K46 and the deck's reserve slide L4 carry
these figures; the slide reads the ranges from `montecarlo.json`.

## Re-run on the profile as published (night of 2026-11-24, after D-194)

Run again on the model as it stands since D-194 (2026-10-28): the neighbours' profile is taken as published and the
level multiplies it; until then the level multiplied a profile re-priced to the sample's fuel. The ranges are D-191's,
unchanged: the level ×1.0–2.0 (one for Finland, SE4 and Poland), CO₂ 80–200 €/t, gas 30–75 €/MWh thermal, demand
×0.85–1.10, onshore 1 000–2 500 MW, solar 1 500–3 000 MW. 300 samples, the same seed, 3 600 years in 23 minutes.
The previous run is the file's version of 2026-10-28 in git.

**Two units' effect on Estonia: 14.8–21.6 €/MWh in 90 % of the samples, median 17.8, all of them 11.5–23.2.**
- One unit takes 7.1–11.0 (median 8.9), three 21.8–30.7 (median 25.8); no sample changes the sign.
- Gas and CO₂ explain 62 % of the variance of two units' effect (44 and 18 %), the neighbours' level 22 %: the
  lower the neighbours' prices, the smaller the effect (×1.0–1.5: median 17.1; ×1.85–2.0: 19.6).
- Estonia without the plant is 65.1–103.1 €/MWh in 90 % of the samples (median 84.2); the level explains 89 % of it.

**The contract (a) at 90 €/MWh, two units: the state pays in 99 % of the samples**, median 123 M€ a year, 90 % of
them 30–214. One unit: the state pays in 88 % (median 37); three: in all (median 247).
- By the level: ×1.0–1.5, the state pays in every sample (median 168 M€); ×1.5–1.85, in every one (89); ×1.85–2.0,
  in 93 % (50).
- The opening (−15 M€ with two units) lies on the edge: its level ×1.88–2.10 is at the range's top and its CO₂,
  197.5 €/t, at the top of 80–200.

**What changed against 2026-10-28.** D-194 lowered what a given level means: ×1.0–2.0 on the profile as published is
Finland at 40–80 €/MWh, where on the re-priced profile it was 51–101. The range now reaches the owner's levels only
at its top, so most samples have cheaper neighbours than the opening, a smaller effect and a dearer contract. Whether
the range should move with D-194 — for instance ×1.5–2.5 around the owner's ×1.88–2.10 — is the owner's choice
(D-280, proposed). The conclusion on the effect stands — one sign, of the same order in every sample — and the
contract's cost to the state is, on these ranges, the rule rather than the exception.
