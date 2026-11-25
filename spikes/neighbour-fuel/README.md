# The fuel behind the neighbours' profiles (DECISIONS D-072, ERRATA E-064)

The finding and the figures are in `docs/research/2026-10-05_neighbour_fuel_reindex.md`.

- `evidence.py` reads the market model's hydrogen outputs from the cached TYNDP 2024 archives and
  sets them beside the electricity prices of the database: the reformer's marginal cost against
  the cost computed on the gas blend, the synthetic-fuel parity, the electrolyser's relation
  between the two prices, and how many hours of each boundary zone lie on it. From the repository
  root: `.venv/bin/python spikes/neighbour-fuel/evidence.py > spikes/neighbour-fuel/evidence.txt`
  (about four minutes; `evidence.txt` is the run of 2026-10-05).
- `headline.ts` runs the opening state's four scenarios with the profile as published, re-priced
  (D-072), and at one level factor per zone of the same mean. From `app/`:
  `node ../spikes/neighbour-fuel/headline.ts [GA]`.
- `fossil.ts` gives Estonia's hours with a fossil price at the level in use before E-064, at the
  corrected one, and re-priced. From `app/`: `node ../spikes/neighbour-fuel/fossil.ts`.
