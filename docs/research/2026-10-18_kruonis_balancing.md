# Kruonis's recorded output and Lithuania's balancing activations (2026-10-18)

**Why.** The owner chose, for the day's work, a study of Kruonis ("Kruonis and 2025"). The validation
finds the model's Kruonis far below the record. In 2025 it delivers 0.19 TWh against 0.48 in ENTSO-E
A75, and the class fails its ±10 % band in every year (methodology §7.3). The documents suggested a
reason they had not measured: A75 counts every MWh the plant delivered, the reserve units' balancing
activations included, while the engine clears the day-ahead market only
(`docs/research/2026-10-11_dear_hours.md` §9). If that were so, the check would compare different
quantities.

**Result: the explanation is ruled out.** Balancing activations account for at most 20 % of
Kruonis's 2025 output and 14 % of 2026's. Its day-ahead output was at least 0.39 TWh in 2025 against
the model's 0.19. The model's shortfall is its own.

## Data

- **Lithuania's activated balancing energy**, MWh per quarter-hour, upward and downward, from the
  Baltic Transparency Dashboard for January 2025 to September 2026. There are four reports:
  - `activations_afrr`;
  - `normal_activations_da_mfrr` (mFRR activated directly);
  - `normal_activations_sa_mfrr` (mFRR activated on schedule);
  - `special_activations_total_mfrr`.

  The older `normal_activations_total` and `normal_activations_mfrr` are empty in 2025. Each report's
  id was read from its page on the dashboard. The spike fetches the 84 monthly files into its own
  cache, never into `data/raw`, so the database and the export do not read them.
- **Kruonis's output and pumping**: ENTSO-E A75, B10 hydro pumped storage, Lithuania, quarter-hourly
  in every month of the span. These are the cached files the validation reads.
- **Lithuania's day-ahead price**, from the database.

## Method

In a quarter-hour, the energy the plant delivered for balancing is at most the smaller of two
things: its output, and Lithuania's upward activations from all providers (Kruonis, the batteries,
the gas units, demand). Likewise its balancing pumping is at most the smaller of its pumping and the
downward activations. Summed over the year, these give an upper bound on the balancing part of the
record. The real share is lower wherever another provider was activated.

`spikes/kruonis-balancing/kruonis.py`: run `fetch`, then run it again with no argument. It writes
`summary.json`, which holds the month-by-month figures.

## Results

| | 2025 | 2026, January–September |
|---|---|---|
| Kruonis output, A75 | 0.480 TWh | 0.433 TWh |
| Kruonis pumping, A75 | 0.639 TWh | 0.588 TWh |
| Lithuania's upward activations, all providers | 0.182 TWh | 0.122 TWh |
| Lithuania's downward activations, all providers | 0.430 TWh | 0.220 TWh |
| Output that could have been balancing, at most | 0.094 TWh (20 %) | 0.063 TWh (14 %) |
| Pumping that could have been balancing, at most | 0.170 TWh (27 %) | 0.085 TWh (14 %) |
| **Day-ahead output, at least** | **0.386 TWh** | **0.371 TWh** |
| The model's output (the replay) | 0.19 TWh | 0.20 TWh |

- Lithuania's upward activations in all of 2025 came to less than half of Kruonis's output.
- In no month does the bound exceed 36 % of the plant's output. February 2025, the month of the
  synchronisation, reaches 12.7 of 35.4 GWh.
- 8 175 of the 9 904 quarter-hours in which Kruonis ran in 2025 had some upward activation in
  Lithuania. Activations are frequent, but small beside the plant's output.

## What it means

- **The generation check compares like with like closely enough.** Taking the bound off the record
  would leave at least 0.39 TWh against the model's 0.19, so the check would still fail. It stays as
  it is.
- **The model uses Kruonis too little in the day-ahead market.** The earlier measurements point to
  two causes:
  - **D-115's steps.** The output runs in four segments of its power, each 60 €/MWh dearer. This
    took the 2025 replay from 0.33 TWh, as a price-taker at one cost, to 0.19. The steps improve the
    prices of the dear hours (D-115) at the cost of the plant's volume.
  - **The model's flat day.** Without the steps it still delivers less than the record's day-ahead
    floor. Its hourly prices spread less within a day than the market's, and that spread is what
    the plant lives on (`docs/research/2026-10-07_calibration_2025.md`, the dear hours above).
- **Intraday trading is not measured here.** Since October 2025 the day-ahead market clears quarter
  hours, and XBID's intraday market trades them all day. Kruonis's intraday energy is in A75 and in
  none of the activation reports.

## What changes

- **The figures:** nothing.
- **The documents:**
  - methodology §7.3 now says the activations were measured, and what they bound;
  - the answer at a presentation is the table above.
- **For the owner (D-073), measured the same day:** Kruonis's power in a 2035 scenario. Litgrid holds
  two of the four units as mFRR reserve (about 400 MW; the dear hours §3), and in 2025–2026 Lithuania
  procured 340 MW of upward mFRR on average. A scenario offers the whole plant to the day-ahead market:
  938 MW in the opening state. Held out, the 400 MW change almost nothing (D-139).

## The reserve units out of a 2035 scenario

The opening state's four scenarios, Kruonis at 938 MW and at 538 MW, its store unchanged
(`spikes/kruonis-balancing/reserve_units.ts`, which writes `reserve_units.json`; from `app/`):

| Scenario | EE | LV | LT | The plant's capture price | The CfD at 90, M€ a year |
|---|---|---|---|---|---|
| Elering: gas | 84.7 → 84.8 | 80.9 → 81.0 | 80.9 → 81.0 | — | — |
| 1 SMR | 76.3 → 76.3 | 77.9 → 77.9 | 77.9 → 77.9 | 77.6 → 77.6 | 31.3 → 31.3 |
| 2 SMR | 67.2 → 67.1 | 75.8 → 75.9 | 75.9 → 75.9 | 68.2 → 68.1 | 110.2 → 110.5 |
| 3 SMR | 56.9 → 56.9 | 74.6 → 74.7 | 74.6 → 74.7 | 57.7 → 57.7 | 244.8 → 245.2 |

In 2035 the batteries carry the region's flexibility: Lithuania's 1 750 MW and Estonia's 1 500. Kruonis
also runs in D-115's steps. A tenth of a euro is within the solver's own noise between optima
(D-130). The scenario keeps the plant whole: D-139.
