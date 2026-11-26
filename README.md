# energiamudel v5

An hourly day-ahead market model of the Baltic bidding zones — Estonia, Latvia and Lithuania — that runs in the browser. Finland, Sweden (SE4) and Poland are hourly price profiles given to the model, not computed by it. It is built to show, under assumptions the user sets and can see, what a small modular nuclear plant in Estonia does to prices, imports and a contract for difference, and what interconnector outages do to prices.

The application is live at <https://energiamudel.ee>, in English and Estonian. Nothing is installed: the page computes in the reader's browser. With the reader's consent it counts visits with Google Analytics; without it, nothing is sent anywhere.

**Declaration of interest.** The author works with Fermi Energia, the company developing an Estonian nuclear plant of two BWRX-300 units.

## What the model is

- **A linear programme of the market, hour by hour.** Every plant, store and interconnector of the three zones bids into each hour; the programme clears a week at a time and is solved in the browser by HiGHS compiled to WebAssembly. The same problem solved by an offline reference gives the same answer on eight test weeks (`make gap`).
- **Scenarios of 2035 on one base.** *0 SMR* is the transmission system operator's base scenario for Estonia with the author's assumptions on wind, solar and the neighbours' prices, each marked as such; *1 SMR*, *2 SMR* and *3 SMR* add units of 315 MW to the same fleet. Each scenario runs on the climate years 1995, 2008 and 2009 and is shown as their weighted average.
- **Every input has a source.** A measured series carries a lineage record naming the API call it came from; a figure read from a document names the document and the page. The register of sources, with each one's licence, is [`docs/SOURCE_REGISTER.md`](docs/SOURCE_REGISTER.md).
- **Checked against the past.** The model replays 2020–2026 on each year's own fleet, demand, fuel prices and transfer capacities — never the Baltic prices it is measured against — and its hourly prices are set beside the exchange's.

## Status

Version `0.1.0-dev`. The model first went public on 26 November 2026.

## The application

Seven views:

| View | What it shows |
|---|---|
| *Model* | The scenarios of 2035 and the replays of past years: the panel of assumptions, the results, the charts. |
| *Presentation* | A deck of seventeen slides whose every figure is read from the runs the page shows. |
| *Calibration* | The validation: prices, generation and border flows against the record, the EstLink 2 test, the engine against the reference, the fitted parameters. |
| *Import price* | The neighbours' prices as the model takes them, and the generation and capacity behind them. |
| *Weather* | Why the climate years 1995, 2008 and 2009, and what they are in the Baltic states. |
| *Statistics* | Ten years of gas, CO₂ and day-ahead prices and of wind and solar build-out, with the data centres and new industrial loads by country. |
| *Documentation* | The methodology and the sources. |

The scenario is in the address bar (`#s=…`): a link opens the same run. *Export CSV* and *export JSON* save the results with their provenance ([`docs/methodology.md`](docs/methodology.md) §8.4).

## Run the application

Node 22.18 or later. The committed export (`data/export/`) is all it needs.

```bash
cd app && npm ci
npm run dev      # the application at http://localhost:5173, computed in the browser
npm run build    # the static site in app/dist/
```

The page keeps the sets it has computed in the browser, so a second load shows them without a run; `?nostore` in the address keeps nothing and reads nothing kept.

## Rebuild the data

Python 3.12 or later. Two free keys go in `.env` (see [`.env.example`](.env.example)): an ENTSO-E Transparency Platform token and a Fingrid Open Data key. The raw data are not in the repository; `make history` fetches them from their publishers.

```bash
make setup      # .venv at the versions of constraints.txt, and app/'s packages
make smoke      # one real request per source
make history    # fetch every source into data/raw with its lineage record (about 9 GB)
make db         # build data/energiamudel.duckdb
make export     # write data/export/: the files the browser engine reads
make fit        # the fitted parameters
make validate   # the replays against the validation's thresholds; fails while a gate is not met
make check      # the data gate: lineage, register, hours, tables, verification, rebuilds, export
make ci         # Python and engine tests, lints, the golden fixture, the contract types, the built site
```

`make help` lists every target.

## What is where

| Path | Content |
|---|---|
| `app/` | The site: Vite and TypeScript. `app/src/engine/` is the engine, free of the page. |
| `pipeline/` | The fetchers of each source, the lineage records, the register. |
| `db/` | The database's schema, its build and its checks. |
| `export/` | The writer of the per-year files the browser reads, with their manifest. |
| `reference/` | The offline linear programme the engine is checked against. |
| `validate/` | The validation protocol, the fits, the golden fixture. |
| `schema/` | The data contract: JSON Schema and the TypeScript types made from it. |
| `data/` | `documentary/` and `export/` are committed; `raw/` and `lineage/` are fetched, not committed. |
| `docs/` | The specification, the decisions, the method, the sources, the research behind them. |
| `spikes/` | Disposable prototypes and studies, each with its own note. |

## Read in this order

1. [`docs/methodology.md`](docs/methodology.md) — how the model works and how it is validated.
2. [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md) — the binding document: objectives, requirements with identifiers, the validation protocol, the gates.
3. [`docs/DECISIONS.md`](docs/DECISIONS.md) and [`docs/ERRATA.md`](docs/ERRATA.md) — what was decided and why, and every error found.
4. [`docs/SOURCE_REGISTER.md`](docs/SOURCE_REGISTER.md) and [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — every source with its licence, and what changed.
5. [`AGENTS.md`](AGENTS.md) and [`docs/PLAN.md`](docs/PLAN.md) — the rules for anyone working here, people and coding agents alike, and the implementation plan.
6. [`docs/research/`](docs/research/) — the evidence behind the specification and the studies made on the way.

## Licences

Code AGPL-3.0-or-later ([`LICENSE`](LICENSE)); documentation and derived data CC BY 4.0 ([`LICENSE-docs`](LICENSE-docs)); third-party data under their publishers' own terms, per source in [`docs/SOURCE_REGISTER.md`](docs/SOURCE_REGISTER.md). Cite as in [`CITATION.cff`](CITATION.cff).
