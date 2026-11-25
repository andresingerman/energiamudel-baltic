# How the replays part Estonia from Latvia (ERRATA E-139)

The owner's question of 2026-10-10. Estonia's day-ahead price left Latvia's in 2.8 % of the hours
of 2024, 21.4 % of 2025 and 42.9 % of January–August 2026, nearly always below it. `node
spikes/ee-split/split.ts` (a few seconds) replays 2024–2026 as `make validate` does and compares,
hour by hour, a split (|EE − LV| > 0.01 €/MWh) in the model's prices and in the record's, in three
runs: the replay as it is; Estonia's oil-shale must-run (R-SUP-5's floor fitted on 2023–2024 and
D-073's least output) cut to the hour's A75 output where it is above it; and Estonia's oil shale
run exactly as recorded. The last two are diagnoses, not models: they read the hour's output from
the record. `result.json` is its output on `main` 540abd7.

| Run | Estonia apart from Latvia, model / record (2024 · 2025 · 2026) | Estonia's MAE, €/MWh (2025 · 2026) | Estonia's bias (2025 · 2026) | Oil shale, MW, model / record (2025 · 2026) |
|---|---|---|---|---|
| as it is | 4.7 / 2.8 · 30.8 / 21.4 · 54.1 / 42.9 % | 19.6 · 14.0 | −4.7 · −11.0 | 199 / 162 · 208 / 136 |
| floor cut to the record | 4.5 · 28.0 · 50.7 % | 19.5 · 13.6 | −3.2 · −8.9 | 180 · 167 |
| oil shale as recorded | 3.9 · 24.8 · 45.9 % | 20.4 · 13.3 | −1.0 · −6.8 | 161 · 136 |

As it is, the hours the model parts Estonia and the record does not are 14.3 % of 2025 and 17.5 %
of 2026; Estonia is 34.7 and 32.5 €/MWh too low there, 30 % and 44 % of its absolute error. In
those hours the record had EstLink at its limit (Finland cheaper) in 76 % and 73 % of them and
Estonia at Latvia's price; the model has EstLink at its limit in 37 % and 38 % and Estonia at
Finland's. EE–LV's capacity is not the cause: where both part, the model sends 452 and 408 MW
south against 471 and 401 scheduled. Estonia's oil shale is: the floor alone holds 145 and 157 MW
on average (2025, 2026), the offers add 53 and 52.

Reading: oil shale explains most of the excess of split hours (in 2026, 11.2 points of 54.1 − 42.9
fall to 3.0 with oil shale as recorded) but little of Estonia's error, since about one hour in ten
still parts in one and not in the other. The remaining candidates are D-099's next steps:
oil shale's market entry and storage without perfect foresight.
