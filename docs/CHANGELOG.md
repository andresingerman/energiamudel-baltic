# Changelog

Versions and what changed in them (`SPECIFICATION.md` R-DOC-6). The log kept during the development, before the first
public release, is in the author's private history (DECISIONS D-328); what was decided and why is in
[`DECISIONS.md`](DECISIONS.md), every error found in [`ERRATA.md`](ERRATA.md).

## Unreleased

- Deployed 2026-11-26 (main b3bcf3a: ERRATA E-202's fix, D-342's Google signals): every set as before; the live check
  passed in Chromium and WebKit.

- The visit statistics' consent covers Google signals: age groups, gender and interests as totals, for readers signed
  in to Google who allow it; the banner says so and asks those who had agreed again (D-342, specification 2.152).

- Withdrawing consent stops the visit statistics at once, not at the next reload (ERRATA E-202).

- Deployed 2026-11-26 (main 2771a96: D-341's Feedback view and footer): every set as before; the live check passed in
  Chromium and WebKit.

- A Feedback view in the header, and a footer under every view with the author and the licences (D-341,
  specification 2.151).

- Deployed 2026-11-26 (main a2cf2c2: D-340's deck on the opening state): every set as before; the live check passed
  in Chromium and WebKit.

- The deck is always of the opening state: a change on the Model view moves no slide (D-340, specification 2.150).

- Deployed 2026-11-26 (main a708c87: D-338's visit statistics behind consent, D-339's table out): every set as
  before; the live check passed in Chromium and WebKit.

- The table of the energy mix's investments to 2035 is taken off the Model view (D-339, specification 2.149).

- Visit statistics with Google Analytics 4, behind the reader's consent (D-338, specification 2.148): a banner in
  both languages, Google's script only after «agree», the scenario never sent, the choice changeable.

- Deployed 2026-11-25 (main 0abd186: D-335 and D-336's methodologies, D-337's questions and answers out): every
  set as before; the live check passed in Chromium, and in WebKit after the browser's process had crashed twice.

- The questions and answers are taken out: their tab of the Documentation view, `docs/faq.md` and `docs/faq_et.md`
  (D-337, specification 2.147). README alone states the declaration of interest.

- The full methodology checked against the repository and corrected in 67 places (D-336): wrong facts, what the
  page no longer has, the deck as it stands, the calibration's figures of an earlier run. The batteries' cycling
  cost would refit to 60.5 €/MWh on today's data against the register's 71.5: stated, not adopted.

- The short Estonian methodology checked against the model and corrected in five places (D-335): the contract
  card it named, the price bias, Kruonis, the links, its date; the English methodology's bias figures too.

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
