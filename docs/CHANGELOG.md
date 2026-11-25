# Changelog

Versions and what changed in them (`SPECIFICATION.md` R-DOC-6). The log kept during the development, before the first
public release, is in the author's private history (DECISIONS D-328); what was decided and why is in
[`DECISIONS.md`](DECISIONS.md), every error found in [`ERRATA.md`](ERRATA.md).

## Unreleased

- Deployed 2026-11-25 (main 8ed4123: D-333's last slide, D-334's line in the Documentation view): every set as
  before, `make live-check` passed.

- The Documentation view names the public repository under its tabs, with a link (D-334, specification 2.146).

- The deck's last slide names the public repository on GitHub, its address a link and a QR code (D-333,
  specification 2.145).

- The repository `andresingerman/energiamudel-baltic` is public since 2026-11-25 (D-332).

- Deployed 2026-11-25 (main c04fac9: D-328's engine without the sampler, D-331's headers, `sso.php` gone): every
  set as before, the four security headers sent, `make live-check` passed.

- The site sends four security headers and `sso.php` is gone (D-331, specification 2.143); the deploy's check wants
  the headers.

- `certifi` raised to 2026.10.19 against GHSA-6q48-6c7w-9gw2 (the data pipeline's HTTPS; D-330); the workflow states
  its permissions.

- The repository's address, `andresingerman/energiamudel-baltic`, in `LICENSE-docs` and `CITATION.cff` (D-329).

## 0.1.0-dev — the first public release, 26 November 2026

- The model as [`README.md`](../README.md) describes it: the hourly market model of Estonia, Latvia and Lithuania in
  the browser, the scenarios of 2035 with 0 to 3 SMR units, the replays of 2020–2026 against the record, and the
  application's seven views.
