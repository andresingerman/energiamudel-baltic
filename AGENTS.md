# AGENTS.md — rules for anyone working in this repository

Binding for humans and agents alike. This is the only agent-instruction file; there is no `CLAUDE.md`. It is short on purpose: the substance is `docs/SPECIFICATION.md`.

## 1. Read first

1. `docs/SPECIFICATION.md` — the binding requirements (identifiers `R-…`, decisions D1–D17, gates). Where this file and the specification disagree on a requirement, the specification wins; on process, this file wins.
2. `docs/DECISIONS.md` — what is settled. Never silently reverse a decision; if your task conflicts with one, say so and ask the owner (Andres).
3. `docs/ERRATA.md` — every error found so far. Read it before quoting a number.
4. `docs/research/` — the evidence behind the specification (grilling log and data research of 2026-09-24).

## 2. Hard rules

- **Every number has a source.** Every model input traces to a lineage record (measured data) or to a document and page in `data/documentary/*.csv`. A parameter without a source exists only as "owner's assumption", labelled so in the register and in the interface. CI fails below 100 % coverage.
- **Every literature justification carries a full reference and a DOI link.** References marked "verify" in the specification are checked against Crossref before `methodology.md` cites them.
- **A source is not read until it is registered** in `pipeline/register.py` with purpose, licence and access conditions, in the same commit as the fetcher or CSV that uses it.
- **No secrets in the repository.** Tokens and keys live in `.env` (git-ignored); `.env.example` lists the names; lineage records strip tokens.
- **Timestamps are UTC and mark the start of the interval**, everywhere. Convert to local time only at display.
- **The engine is pure and deterministic**: no DOM, no fetch, no clock, no randomness, no hidden state. Identical inputs, byte-identical outputs. The adequacy sampler is seeded.
- **The database and the exports are build artefacts**, rebuilt from the raw cache and the lineage records by one command, never edited by hand. A rebuild that does not reproduce the committed exports is a finding for `ERRATA.md`, not a state to paper over.
- **No observed price of a core zone enters the model for the year under test.** Boundary zones use the observed price at their end of the cable in calibration years — their own day-ahead price, or the price the capacity calculators' publications give for the cable — and nothing else (`R-BND-3`).
- **Imported code is listed in `PROVENANCE.md`** with source repository, commit hash and path. v4's `model/` is not imported.
- **Everything in English.** Code, comments, documents, commit messages, interface text.
- **Commits are permitted; pushing, deploying and publishing are the owner's acts.** Commits are authored under the GitHub noreply address. Each commit updates the documents that describe the change.
- **Five claims the model must not make** are in `docs/SPECIFICATION.md` §5. Do not make them in code, documents, or messages to the owner.

## 3. Working method

- Requirements are the unit of work: every change names the `R-…` identifier it serves. No matching requirement means the work is out of scope or the specification needs a revision first.
- Gates are not worked around. A gate not met returns to the owner with the evidence (`docs/SPECIFICATION.md` §14).
- Open parameters have defaults (`docs/SPECIFICATION.md` §15). Proceed on the default; do not invent a different one.
- Prove before you build on it: a source enters the schema only after `make smoke` reports it OK; an endpoint parameter or a licence is "verify" until a real response is cached with its lineage record.
- Record errors the day they are found in `docs/ERRATA.md` with their effect on results; entries are never deleted. Record decisions in `docs/DECISIONS.md` as new dated records; never edit an old one, supersede it.
- Documents are updated in the same commit as the code they describe. Documentation drift is an error.
- Prototypes go to `spikes/<name>/` with their own README and are not held to the standards below.

## 4. Standards for code

- `make ci` (the Python and engine tests, the lints — ruff, mypy, TypeScript and the engine's — the golden fixture, the contract types, the built site) passes before any hand-off. Every contract you touch gets a test (a fetcher: a parser test on a hand-written sample; a loader: a fixture database; the engine: the invariants of `R-NFR-8`).
- Loaders fail loudly on zero rows and on a missing archive.
- The data contract (`schema/`) is the single definition of the year-JSON, scenario and result shapes; Python validates its output against it, the engine validates its input.
- New runtime dependencies need a `docs/DECISIONS.md` record. Build-time Python dependencies are declared in `pyproject.toml`.
- Mark deliberate simplifications in code with a comment that names the ceiling and the upgrade path.

## 5. Definition of done

A change is done when it satisfies its requirement, its tests pass, the documents that describe it are updated in the same commit, lineage coverage is still 100 %, every new source is in the register, the result reads correctly to a stranger who has only this repository, and any movement of a calibration figure is either absent or a deliberate re-baseline with a before/after table and the owner's sign-off.
