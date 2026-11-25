# Oil shale's market entry (the night of 2026-10-11; D-113, ERRATA E-139)

Today oil shale is three continuous offers, each at its cost plus Eesti Energia's entry premium.
A class runs a few peak hours at its bid and is gone the next hour, which no Narva unit does.

## The record

`record.ts` reads A75, the zone's sum of the units; a day is off when none of its hours is above
50 MW, below any unit's minimum stable load. In 2023, 2024, 2025 and January–September 2026:
- off on 11, 11, 22 and 40 % of days;
- on in campaigns with a median of 10, 11, 17 and 9 days, the longest 183, 101, 117 and 54;
- within a day on, the least hour at a median of 59, 57, 63 and 59 % of the day's highest.

The night's first figures (off on 10–37 % of days, campaigns of 6–12 days at the median) came from a
computation that was not kept; these are `record.ts`'s.

## The rule

Two passes, the same in replays and scenarios, run by `commit.ts`:

1. **Pass 1** clears the problem.
2. **Commitment.** Each of the seven A95 units is considered for each UTC day: Auvere 270 MW;
   Balti TG11 192; Eesti TG8 194; Eesti TG3 and TG4 164; Eesti TG5 and TG6 173. A unit is
   committed when:
   - pass 1's Estonian price reaches its class's bid for at least its minimum time on (ERAA 2025:
     8 h for the new units, 11 h for the old);
   - and, if it was not on the day before, the day's margin pays its warm start (ERAA's cost plus
     the start fuel, at the oil-shale fuel price the bids use).
3. **The committed day.** A committed unit runs at least its minimum stable load (0.5) all day and
   offers the rest at its bid. A unit not committed offers nothing.
4. **Must-run.** In a replay, the record's weekly least output (D-073) stays beneath as must-run.
5. **Pass 2** clears the committed problem; its results are the problem's as built, the committed
   minimum load in its class's offer (`asCleared`, ERRATA E-141).

The units of a class share its bid and its availability, so they decide alike: the engine's rule
(D-113, `app/src/engine/entry.ts`) commits the class, and gives the same figures.

## Variants

`score_commit.ts` scored the variants on the weekly programme and D-111's register, without a
refit; `rescore.ts` scored them again after ERRATA E-141, which moved no price (the sums below
are as first run) and every oil-shale figure. `rounds.ts` scores the last two on 48 h with the
refitted register. `result.json` holds the runs.

| Rule | 2023 | 2024 | 2025 | 2026 | Breaches | Oil shale 2023 / 2025, TWh (record 2.00 / 1.42) |
|---|---|---|---|---|---|---|
| none (D-111) | 27.41 | 35.32 | 55.57 | 34.69 | 11 / 9 / 15 | 1.78 / 1.44 |
| minimum time on, no start cost | 27.41 | 34.90 | 54.64 | 34.13 | 10 / 8 / 14 | 1.88 / 1.47 |
| minimum time on and a warm start | 27.54 | 34.22 | 54.87 | 34.14 | 10 / 8 / 12 | 1.85 / 1.40 |
| profit: margin less the minimum load's loss pays a start | 28.13 | 34.48 | 59.21 | 33.77 | 11 / 6 / 12 | 1.70 / 1.27 |
| campaign: on stays on while ≥ 1 h pays | 27.86 | 34.63 | 54.41 | 34.19 | 9 / 9 / 13 | 1.96 / 1.52 |
| campaign: on stays on while ≥ 4 h pay | 27.53 | 34.52 | 54.51 | 34.19 | 9 / 8 / 13 | 1.91 / 1.48 |

On 48 hours with the refitted register (`rounds.ts`), against one round at the entry price (27.82
/ 34.75 / 55.19 / 34.37, 8 / 5 / 9, the engine's figures):
- **another round** (the units decided again on pass 2's price): 28.14 / 34.48 / 55.59 / 34.23,
  8 / 5 / 10;
- **a committed unit bidding its cost**, the premium left to the decision to come on: 27.66 /
  34.71 / 55.22 / 34.37, 8 / 7 / 9.

## Reading

- **The entry helps the prices,** most of all in the dear hours and with 48 hours (`../foresight/`).
- **It keeps oil shale near its record:** within 6 % in 2023–2026 under the rule of D-113. The
  first scoring (before ERRATA E-141) read 16–28 % below it; that was the minimum load left out.
- **Neither another round nor bidding at cost** improves on the rule.
