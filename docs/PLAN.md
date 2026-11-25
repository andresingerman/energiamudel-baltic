# energiamudel v5 — Implementation plan (Stage 3)

*Written by Claude (Fable 5.1) on 2026-09-25 against SPECIFICATION.md revision 1.3 and adopted by the owner the same day (DECISIONS D-012). This is the Stage 3 deliverable of §14: a working document subordinate to the specification (where they disagree, the specification wins) and to `AGENTS.md` on process. Stage 4 implements it on Opus 5.5, milestone by milestone; each milestone's decisions become DECISIONS records, and this file is not edited afterwards except to mark a milestone done.*

## Context

Stages 1 and 2 are closed: the specification is signed and revised to 1.3 (D-011), and the data layer holds every source the model needs (`make check` 7/7, 39 tables, 1 621 verified documentary rows). Nothing of the model exists yet: no `schema/`, `export/`, `reference/`, `app/`, no `validate_fit`, no `faq.md`. §14 names seven milestones M1–M7, each delivered with its test, documents updated in the same commit, ERRATA current. This plan says, per milestone, what is built, in which files, reusing what, tested how, and what the owner decides when.

Three findings from the exploration shape it:

1. **The v3 primitives are worth porting, but not blindly.** `simulateBattery` (exact dynamic programme over hour × state of charge) and `clearSegment` (bisection on a path, split on congestion, recurse) are sound and fast: 0.6 ms per DP, 213 ms for 8 760 hourly clearings. Three defects must not travel: the whole-chain shortage branch (v3 `coupler.js:283`) prices every node at VOLL before checking link limits and understates unserved energy; there are no input guards (a missing slope gives NaN prices everywhere); the battery DP allocates memory without bounds. v3's "damped fixed point" never converged on its own data (always the 6-pass cap); v5 uses the two-pass design of R-ENG-3/4 instead, as specified. v3 has no LICENSE file; its author is the owner.
2. **v4's formulas transfer, its code does not.** Marginal cost, utilisation-markup tranches, reserve headroom, flexible loads as buy offers, DSR bands with daily caps, the CHP temperature envelope, the oil-shale premium, the crc32 cost perturbation — each is cited below with its v4 origin. v4 never had a Daugava storage model, a battery in calibration or a duration-curve metric; v5 builds these.
3. **The database's hour conventions differ per table** (`tyndp_price` 8 736 h; `pecd_profile` and `demand_profile` 8 760 h on a Monday-start layout; `scenario_link_hourly` 8 760 h with 29 February dropped; `tyndp2026_*` 8 760 h; hydro weekly or daily). The export owns one axis per year kind and records every fill.

## 1. Ground rules for Stage 4

- **Kickoff reading:** `AGENTS.md`, this plan, `SPECIFICATION.md` §§4–9, §14–15, `DECISIONS.md` D-010/D-011, `ERRATA.md`; then `make check` must be 7/7 before the first commit.
- **Unit of work = a requirement.** Every commit names the `R-…` ids it serves. No id → out of scope or a specification revision first.
- **Documents move with code.** A milestone's last commit updates `methodology.md` (every formula names its function), `DECISIONS.md`, `ERRATA.md`, `CHANGELOG.md`, `README.md` status, `SOURCE_REGISTER.md` (`make register`), `PROVENANCE.md`. Working documents with numbers open with the gate-status line (R-PUB-4).
- **Gates are not worked around.** R-ENG-8 (M2) and R-VAL-5/6 (M3) return to the owner with evidence when unmet; UI milestones continue under the gate-status header (§14).
- **Defaults of §15 are used as written.** Due inside Stage 4: OPEN-13 (M1), OPEN-7 (M2), OPEN-2/3/4 and the OPEN-10 outcome (M3), OPEN-5 (M5), OPEN-6 (M6), OPEN-9 and OPEN-11 (before M7).
- **Never:** push, create a remote, deploy, publish; commit `.env`; modify v3 or v4; put an observed core-zone price into an engine input (R-BND-3); release a result with the plant before Stage 5 (R-SMR-8).
- **`make test` needs no Node; `npm test` needs no Python.** `make ci` (from M2) = test + lint + golden; from M3 also `validate_fit --check` and provenance coverage. "CI" in this plan means that target; the GitHub workflow of M7 only calls it.
- **Commit author** Andres Ingerman `<261725719+andresingerman@users.noreply.github.com>`, trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; on `main`.
- **Loud failure everywhere:** zero rows, missing archives, NaN, unknown keys, unmapped classes all fail (v4 E-039/E-041/E-043/E-073 were silent).

## 2. Architecture at a glance

```
DuckDB (Stage 2) ──export/ (Python)──► data/export/*.json.gz + manifest.json ──► app/ (Vite + TS, browser, Web Workers)
                                          │ validated against schema/*.schema.json          ▲
reference/ (Python, highspy) ◄── same year files ──► app/scripts/*.ts (Node via tsx: same engine source)
```

Layout added by Stage 4 (R-REPO-4, additions recorded in D-013):

```
schema/        year.schema.json presets.schema.json links.schema.json scenario.schema.json results.schema.json manifest.schema.json README.md
export/        __init__.py __main__.py axis.py classes.py observed.py climate.py weather.py presets.py links.py validation.py attribution.py sources.py write.py check.py
reference/     lp.py weeks.py gap.py README.md   (built as lp.py and gap.py; the weeks are chosen in app/scripts/gap_weeks.ts, and no README was written)
validate/      (existing) chp_fit.py fit.py protocol.py fitted.py golden.fixture.json   ← validate_fit entry point and the fixture live here (R-REPO-4)
app/           package.json vite.config.ts tsconfig.json .nvmrc index.html
  public/      fonts/ (Montserrat and its OFL licence, D-197)  .htaccess  data → ../../data/export (symlink; resolves R-REPO-4 vs the §6 diagram)
  src/contract/  generated *.ts from schema/ + guards.ts
  src/engine/    index.ts axis.ts stack.ts boundary.ts clearing.ts storage.ts hydro.ts flex.ts reserve.ts smr.ts contract.ts links.ts results.ts
  src/adequacy/  prng.ts chains.ts sampler.ts      ← outside engine/: it draws, the engine does not
  src/worker/    engine.worker.ts pool.ts controller.ts
  src/state/     scenario.ts (defaults, presets, canonical text) share.ts
  src/data/      loader.ts manifest.ts
  src/ui/        panel/ cards/ charts/ tabs/ theme.ts a11y.ts
  scripts/       validate_fit.ts fit_markup.ts fit_delta.ts golden.ts gap_weeks.ts replay.ts bench.ts lint_engine.mjs   ← TypeScript CLIs live under app/ to share the engine source
  test/          *.test.ts (vitest)
data/derived/    fitted_parameters.json validation/*.json gap/*.json   (committed, R-PUB-5)
data/export/     years/ validation/ attribution/ presets.json links.json.gz sources.json.gz manifest.json (committed; the year, validation and attribution files gzipped)
.github/workflows/ ci.yml deploy.yml   (inert until the owner creates a remote; `make deploy` runs the same gate locally. Built: ci.yml only — the deployment runs on the owner's machine, where the database is, D-039)
docs/PLAN.md docs/faq.md
```

Site runtime dependency: **Chart.js 4 only** (R-NFR-6). Dev: vite, typescript, vitest, tsx, json-schema-to-typescript. Python: `jsonschema` in the base dependencies; extra `[reference]`: `highspy`, `numpy`. Node 22 LTS pinned.

## 3. Cross-cutting designs

### 3.1 Time axes (`export/axis.py`, `app/src/engine/axis.ts`)

| Year kind | Axis | Alignment and fills |
|---|---|---|
| Observed Y (2020–2025; 2026 partial, replay-only) | 8 760 / 8 784 hourly UTC from `Y-01-01T00:00Z` | every `ts` table; A44 (per CET day) sliced to the UTC year; gaps ≤ 6 h interpolated linearly and listed in the manifest (`filled`); a longer gap fails the export (EE load: 7 h in 2025, 8 h in 2026) |
| Climate year CY ∈ {1995, 2008, 2009} (TYNDP 2024) | hour-of-year 1…8 760; weekday = TYNDP's layout (1 January = Monday) | `pecd_profile`, `demand_profile` as stored; `tyndp_price` hours 8 737–8 760 filled with 8 569–8 592 (the layout's last Monday; `filled`); ERA5 temperature of CY aligned by day-of-year with 29 February dropped; hydro week 53 = 24 h; fuel month = the non-leap month of the hour-of-year. Diagnostic in M1: the low-demand days of `tyndp_price` fall on the layout's weekends |
| Weather scenario WSxxx (TYNDP 2026) | 8 760 h as in the package | `tyndp2026_*` as stored; hydro daily → weekly sums; temperature: no series exists for modelled years → M1 checks the PECD 4.2 package, else exports the zone's 2020–2025 hour-of-year average as a **labelled proxy**; the same rule gives Estonia's solar proxy (methodology §3) |

**Days are UTC days, `day = floor(h/24)`, for every year kind** (R-DATA-4, AGENTS §2; no `Date` in the engine, R-NFR-5). Baltic midnight lies 2–3 h later; documented. Nothing is wrapped by index (R-TIME-6).

### 3.2 Data contract (`schema/`)

Hand-written JSON Schema is the single definition (R-NFR-7). Python validates the year files, presets, links and manifest as the export writes them (`jsonschema`), and a test validates the committed ones (the validation, attribution and sources files have no schema); `npm run contract` generates `app/src/contract/*.ts` (committed; a test fails when stale); the engine runs `guards.ts` on load (array lengths = axis, all finite, capacities ≥ 0, K ≤ 24) — no schema library in the bundle.

**`years/<key>.json.gz`** (`2024`, `cy1995`, `ws037`): engine input only.
- `meta`: kind, family, key, hours, axis, `filled`, ranks of R-TIME-4 (per climate year: EE onshore-wind CF, solar CF and demand-shape peak among the 38 PECD years; per WS: its EE wind and solar CF), export code hash.
- `zones.{EE,LV,LT}`: `load` (observed) or `shape.{NT_2030,NT_2040}` normalised to an average of 1; `gen.<tech>` hourly MW (observed); `cf.{wind_onshore,wind_offshore,solar}` (observed A75/A68; PECD, per target year only where series differ); `capacity.<tech>` (A68); `temperature_c`; `reserve.{FCR.sym,aFRR.up/down,mFRR.up/down}` (observed from 2025-02-04, else absent); `hydro.daugava.weekly_budget_mwh[53]`, `hydro.daugava.min_turb_mw`, `hydro.kruonis.{p_mw,e_mwh,weekly_budget_mwh}`; family 2026 `demand.{market,prosumer,ev_market,ev_prosumer}`.
- `boundary.{FI,SE4,PL}.price.<profile>`: `observed`; family 2024 `DE_2035|DE_2040|DE_2050|GA_…|NT_2030|NT_2040` (NT for CY2009 only); family 2026 `NTplus_<target>`.
- `borders.<code>`: observed `ntc.{fwd,rev}` (A31) and `reserved.{fwd,rev}` (BTD allocation on AC borders, R-LINK-5).
- `fuel`: monthly `gas_ttf_eur_mwh_th`, `eua_eur_t`, `oil_light_eur_mwh_th`, `fx_usd_eur`.
- **Never present:** an observed price of EE, LV or LT (R-BND-3); a test asserts it on every year file.

**`validation/<year>.json.gz`**: observed core prices, A11 flows, A09 exchanges, A25 net positions, battery discharge, Fingrid 112/115 and JAO `FI_EL` cross-checks — read by the Calibration page and `validate_fit`, never by the Worker.

**`attribution/<year>.json`**: deduplicated A78 events and UMM messages of the five borders; RU/BY/KAL rows filtered (R-LINK-1).

**`presets.json`**: every documentary value the panel offers as `{value, unit, lineage_id, source, page}` (R-UI-6): fleets and demand through the class map (§3.3), delivery-path rows (R-SUP-9), fuel paths, tech parameters, `parameter` rows, the engine-parameter checklist of §3.9, derived values with `pipeline` lineage, fitted parameters once M3 exists, and the adequacy quantile tables (§3.4).

**`links.json`**: `scenario_link` rows, ERAA hourly NTC per border/direction/target year (independent of climate year), Litgrid's LitPol plan, nameplates with commissioning years and sources. **`sources.json`**: from `lineage` + `register.PURPOSE`. **`manifest.json`**: per file SHA-256, per series its lineage ids, the export's own hash (R-DATA-8, R-PROV-1).

**Size:** an observed year ≈ 85 hourly series × 12–20 KB gzipped ≈ 1.0–1.7 MB; a climate year ≈ 50 series ≈ 0.6–1.0 MB; limit 3 MB enforced by `export/check.py` (R-NFR-4). Deterministic bytes: integers for MW, prices at 0.01, `json.dumps(sort_keys=True, separators=(',',':'), allow_nan=False)`, `gzip` with `mtime=0` (R-DATA-5).

### 3.3 Class map and bids (`export/classes.py`; methodology §4)

Every documentary `capacity.*` key maps once to an R-SUP-1 class with a reason, or is excluded with a reason; an unmapped key fails the export. Rules that need stating: a generic `oil_shale` total splits into `oil_shale_auvere` 270, `oil_shale_cfb` 386, remainder `oil_shale_pf` (R-SUP-4); `oil_shale_new → auvere`, `oil_shale_old → cfb then pf`; `coal_gas → retort_gas`; `kiisa → excluded while R-STO-8 holds it outside the market, else gas_peaking`; `battery_*_out_of_market|battery_tso_reserve → excluded (R-STO-8)`; `dsr → DSR MW`, `electrolyser → flexible load`; `hydro_daugava|pondage|run_of_river|hydro_ror|hydro_small → hydro classes`; `controllable_need|thermal → note only`. Short-run marginal cost (v4 `week.py:159`): `fuel/η + EUA·co2(kg/GJ)·3.6/1000/η + VOM`; `gas_ttf USD/mmbtu → EUR/MWh_th = price·FX / 0.293071` (1 MMBtu = 1.05505585 GJ; `unit.*` rows in `parameters.csv` with source). Oil-shale classes carry the fixed premium `entry − cost(EUA average 2024)` so the CO₂ part moves and the premium does not (v4 `week.py:179`).

### 3.4 Engine (`app/src/engine/`) — definitions an implementer must not guess

- **Topology.** Price nodes EE–LV–LT on a path; internal links EE–LV, LV–LT; FI at EE, SE4 and PL at LT as **boundary blocks** inside the node's net-export function (R-BND-2): `inj_k(p) = NTC_imp·clamp(p − P_k, 0, 1) − NTC_exp·clamp(P_k − p, 0, 1)`; optional FI slope (R-BND-6): `inj = clamp((p − P_k)·1000/s, −NTC_exp, NTC_imp)`, reference point zero net exchange (owner item O-6). HVDC losses (R-BND-4) on the importing side: the receiving node gets `(1 − loss)·flow`, the loss is a documented per-link parameter.
- **Net export of a node:** `mustrun + Σ blockMW(b,p) + Σ inj_k(p) − load − Σ flexDemand(p) − Σ storageDemand(p) + Σ storageSupply(p) + Σ dsrShed(p)`; `blockMW` ramps over 1 €/MWh (v3 `coupler.js:211`). Every term is non-decreasing in `p` (demand blocks at a ceiling, DSR at band prices, storage bids at fixed prices), so bisection is valid; headroom is price-independent.
- **Clearing** (`clearSegment`, v3 `coupler.js:272` re-ordered): (1) bisection on `[floor, VOLL]`, tolerance 1e-6 €/MWh, ≤ 60 iterations, upper bracket returned; (2) cumulative flows at that price; worst NTC violation (> 1e-6 MW) → link fixed at ±NTC, recurse on both sides; (3) a segment with no violation and `balance(VOLL) < 0` is a deficit zone: nodes at VOLL, shortfall attributed per node by `max(0, load − localGen(VOLL) − imports(VOLL))`; `balance(floor) > 0` → floor, spill recorded. Regression = v3's probe (EE +1 900 MW behind 500 MW links, LV and LT 1 500 MW short → 2 500 MW unserved, EE at the floor).
- **Storage pass one** (R-ENG-3): v3 `simulateBattery`/`simulateBatteryCapped` (engine.js 143–226) with bounds (K ≤ 24, Dmax ≤ 2K, H ≤ 8 784; guard rejects the rest), efficiency on discharge, Δ per charged MWh, daily cap on discharge steps, UTC days. A unit never charges and discharges in the same hour (a property of the DP schedule; asserted).
- **Storage pass two** (R-ENG-4): the DP's charge steps are matched FIFO to its discharge steps. In a scheduled discharge hour the unit offers `q_dis` at `avgChargePricePaid/η + Δ` (running average of realised pass-two charging prices of the energy now in store); in a scheduled charge hour it demands `q_chg` at `η·p⁰(matched discharge hour) − Δ`. State of charge is tracked sequentially; `q_dis ≤ stored energy`; an hour whose schedule cannot be honoured is counted; residual MWh per unit is a result. No third pass.
- **Kruonis** (LT, closed-loop pumped storage): the pass-one schedule is the DP with `K = round(E/P)` (900 MW, 10.8 GWh → 12 h), cycle efficiency 0.74 (R-PAR-7); in calibration years the weekly discharge is capped at the observed weekly generation (this is R-ENG-5's "weekly budget" read as a constraint; the DP is the release rule); in scenario years the cycle cap is R-PAR-5's 1.5 per day unless a source gives Kruonis's own. R-ENG-5's "TYNDP inflow" for Kruonis goes to ERRATA (owner item O-3).
- **Daugava** (LV, PEMMDB category `pondage`): weekly budget = observed weekly generation (calibration), TYNDP inflow of the climate year, or daily `tyndp2026_hydro` summed; released within the UTC week to the highest pass-one prices subject to `P_NOM_TURB` and `MIN_TURB` (both PEMMDB rows, code-verified); storage value = the lowest pass-one price served (0 if every hour is served); pass two offers the release at that value; water not taken is re-offered in the remaining scheduled hours up to turbine max, the leftover reported as residual.
- **Flexible demand** (R-ENG-6, R-DEM-5/6): electrolysis and power-to-heat as demand blocks at their documented ceilings; DSR bands as shed blocks at band prices with hours-per-day counted sequentially per UTC day; a preset's electrolysis energy leaves the inflexible total exactly once (E-022) and is off by default (D-011).
- **Reserve headroom** (R-SUP-7, R-STO-5…8): hourly need `R_z` = observed procurement (from 2025-02-04) or the documented 2026 need allocated by 2025 shares (scenario years); **hours before 2025-02-04 carry `R_z = 0` beyond the TSO-owned assets of R-STO-8** (no balancing capacity market then; owner item O-2). `reserved_batt = min(installed, FCR + aFRR + share_mFRR·mFRR)`; battery day-ahead power = installed − reserved, energy scaled with it; the remainder is pro-rata headroom on flexible thermal availability; if flexible thermal cannot cover it, the unmet reserve is reported per hour, not enforced.
- **CHP must-run** (R-SUP-5): `floor(T) = max(0, a + b·max(0, T_ref − T))` per zone and class (v4 `chp_floor.py:8`), fitted in M3, capped at capacity, 0 above `T_ref`.
- **Utilisation markup** (R-SUP-6): tranches per bin of the week's maximum flexible thermal output (v4 `week.py:356`), schedule from `fitted_parameters.json`.
- **SMR** (R-SMR-1…8): 0/2/3 × 300 MW (0 to 3 units since D-058; 315 MW each since D-189); a 336 h planned outage per unit placed at the window of largest must-run+RES surplus over demand using pre-clearing data; the gap between one unit's outage end and the next unit's start ≥ 168 h; plain CfD → must-run; negative-price clause → 50 % must-run plus the rest as a block at 0 €/MWh; variable cost = uranium price/η + VOM (ERAA rows).
- **Contract account** (R-SMR-3/6), all on the with-plant run, written once in methodology §10: (a) hourly two-sided `Σ_h (S − p_h)·q_h`; (b) monthly `Σ_m (S − p̄_m)·Q_m` with `p̄_m` the simple monthly average; (c) collar 80–100 hourly: pays `(80 − p_h)·q_h` when `p_h < 80`, receives `(p_h − 100)·q_h` when `p_h > 100`; (d) collar 70–110 likewise; clause "no difference paid in hours whose price is ≤ 0": those hours settle at market price and are excluded from (b)'s average. Eight rows (4 × 2); D6's "six" → ERRATA. Per climate year and weighted; operator €/MWh; count of settlement periods each side pays.
- **Results** (`results.ts`): per zone hourly price, dispatch per class, curtailment, deficit, spill, SoC per unit; per border flow, saturated flag, spread, congestion rent (R-BND-7); KPIs of R-APP-1; CO₂ = Σ MWh × factor; the plant's capture price.
- **Adequacy** (`app/src/adequacy/`, R-LINK-7): `prng.ts` = xoshiro128** on `Math.imul`/`>>>`; every duration and inter-arrival draw is an integer index into a **quantile table** (1 024 points per distribution, computed in Python from the documented parameters — λ, MTTR 65/90 d, trip durations — and shipped in `presets.json`), so no `Math.log/exp` anywhere in the browser code; per cable a two-regime chain (short trips, long failures), generator and SMR forced outages → hourly availability arrays → the deterministic engine; distributions per climate year.

### 3.5 Determinism (R-ENG-1, R-NFR-5)

Engine code uses `+ − × ÷`, comparisons, `Math.floor/ceil/round/abs/min/max`, typed arrays. **Forbidden in `app/src/engine/` and `app/src/adequacy/`:** `Math.random`, `Date`, `Math.exp/log/pow/sqrt/sin`, `**`, `toLocale*`, `Intl`, `fetch`, DOM (libm results differ between V8 and JavaScriptCore). `scripts/lint_engine.mjs` scans for them in `npm run lint`. Iteration order is fixed (arrays by zone index, never `for…in`). Golden fixture: SHA-256 of the full result of a synthetic 168 h case (frozen for good) and of the 2024 replay (re-baselined once at the end of M3 with a before/after table and the owner's sign-off, R-VAL-8).

### 3.6 Workers and the interactive budget (R-ENG-7, R-NFR-2, R-APP-2/11)

- **Replay:** one year run per control change. **Scenario:** the headline is the *set* of three climate years or weather scenarios (six runs with the plant), run in parallel on three workers, weighted card with a per-year toggle; wall time ≈ one run.
- Priority queue in `controller.ts`: headline set → the four standard sensitivities (12 runs; 24 with the plant; since D-184 the owner's four price pairs in each of the four scenarios, 48 years) → adequacy samples on request; a control change cancels everything below the headline; ≈ 70 ms debounce; a progress indication appears when a run exceeds 300 ms (R-ENG-7).
- Pool `min(4, max(1, hardwareConcurrency − 1))` workers; year data transferred once per worker and cached there. On a machine with fewer workers than runs in the set, the set runs sequentially and the progress indication covers it.
- Budget: v3's 213 ms for 8 760 clearings; two passes plus DPs → 0.45–0.7 s per run estimated, measured in M2 (`scripts/bench.ts`) and on the built site in M7. Fallback (D4, owner decides): LP in workers via highs-js (52 ms per weekly block, 0.7–1 s per year on four workers).

### 3.7 Fitting and validation toolchain (R-REPO-4: `validate/` is the entry point)

- Python: `validate/chp_fit.py` (2023–2024 generation vs temperature, 10 % envelope per 1 °C bin, `T_ref ∈ {8,10,12,15}` chosen so ≈ 90 % of hours lie above the floor; v4 method), `validate/fit.py` (runs the Node steps, writes `data/derived/fitted_parameters.json` with fit records — data, years, method, value, residual — and a `lineage.derived` record each, R-PROV-4), `validate/protocol.py` (thresholds of R-VAL-5 read from the `validation.*` parameters; the EstLink 2 gate), `validate/fitted.py` (methodology tables, R-VAL-2).
- Node (`app/scripts/`, run with `tsx`): `fit_markup.ts` (2023–2024 replays; per bin `m ← max(m + average(observed − model in bin), 0)`, non-decreasing across bins; stop when no bin moves > 0.5 €/MWh or after 10 rounds; v4 `markup.py:55`), `fit_delta.ts` (Δ on 2025 with reserves removed, against A75 battery discharge, EE median 127 MWh/day), `validate_fit.ts` (metrics R-VAL-3/4 per zone-year and border-year; `--check` exits 1 on a breach), `gap_weeks.ts` (engine on the R-ENG-8 weeks in isolation, SoC 0 → 0), `golden.ts`, `replay.ts`, `bench.ts`.
- **EstLink 2 counterfactual (R-VAL-6):** inside the A78 EstLink 2 outage windows `NTC_cf[h] = min(rated_EE-FI, A31[h] + 650)`, outside the observed A31; Fingrid 112/115 as cross-check.
- Structural test: no fit script writes an observed core price into an engine input (the year files have none; the scripts read `validation/` only for comparison).
- Crossref check of the 16 "verify" references (R-PROV-3) before any methodology chapter cites one — first at M2.

### 3.8 Reference LP (`reference/`)

`lp.py` builds one weekly LP directly in `highspy`: dispatch per block-hour, boundary import/export, internal flows, storage charge/discharge/SoC, Daugava release, flexible demand, DSR, shed, spill; zone-hour balance (duals = prices), flows ≤ NTC per direction, SoC(0) = SoC(168) = 0, weekly hydro budget and min flow, reserve headroom, daily cycle cap, DSR hours/day, electrolysis cap; objective = bids incl. markups, VOLL on shed, floor on spill; crc32 cost perturbation per unit (v4 `week.py:672`); HiGHS options recorded. `weeks.py` fixes the set (one winter and one summer week of 2023, 2024, 2025; the same weeks of CY2009 with the ERAA 2035 Estonian fleet incl. 1 500 MW batteries). `gap.py` → average |Δprice| per zone, storage discharge, congestion rent per border → methodology table; exit 1 when R-ENG-8 fails. Expected systematic offset ≈ 0.5 €/MWh from the engine's ramp; documented.

### 3.9 Parameters the engine needs and where each comes from (M1 checklist; R-PROV-2 = 100 %)

| Parameter | Row today | M1 action |
|---|---|---|
| VOLL 4 000, floor −600, climate-year weights, SMR net/gross/min load/outages, reserve demand 2026, hvdc statistics, validation targets | `parameters.csv` | none |
| HVDC loss per link (R-BND-4) | missing | `hvdc.<link>.loss_share` from the ENTSO-E HVDC statistics (cached) |
| Electrolysis ceiling ≈ 44 €/MWh (R-DEM-5) | fuel rows (SvK `hydrogen_import`, ERAA `hydrogen`) + `efficiency.electrolyser` 0.68 | derived row `flex.electrolysis.ceiling_eur_mwh` with `pipeline` lineage naming both inputs |
| Power-to-heat ceiling ≈ 33 €/MWh | biomass price row (TYNDP matrix / SvK) ÷ boiler η 0.9 | derived row; if no source for η, labelled "owner's assumption" |
| DSR bands (price, MW, h/day) | `flex.dsr.*`, `flex.dsr_hours.*` for ERAA presets | verify coverage per zone; a preset without bands takes ERAA's bands for its zone, labelled |
| mFRR battery share 50 % (R-STO-7) | missing | row labelled "estimate" |
| Battery hours default 2 h (R-STO-1), round-trip efficiency (R-PAR-4) | `battery.round_trip_efficiency` exists | add `battery.default_hours` (DEA row or "estimate") |
| Kruonis 900 MW, 10.8 GWh, η 0.74 | `entsoe_p1009` (GWh, η), A68 hydro_ps LT (MW) | derived row for `E/P`; cycle cap source or R-PAR-5 |
| Daugava `P_NOM_TURB`, `MIN_TURB` | `hydro_inflow` LV `pondage`, `climate_year = 0` | exported as is (code lineage) |
| SMR variable cost | ERAA `uranium` price, `nuclear` η and VOM | derived row |
| Unit constants (MMBtu → MWh, bbl → MWh, light oil over Brent) | missing | `unit.*` rows with sources (NIST for Btu; TYNDP price matrix for the oil ratio, else labelled) |
| ERAA 2025 demand: electrolysis inside or outside? (E-022) | done: `eraa2025_nt_2035`'s demand rows note that ERAA models electrolysers as a demand of their own, activated below a threshold price | — |
| PL slow-build factor 1.4, delivery paths, Elering 2026–2035 demand | missing | rows of D-011 (M1 item 2) |

## 4. Milestones

Each milestone ends with `make ci` green (`make test lint check`; from M2 also `npm test`, `npm run lint`, `npm run build`), documents updated, a DECISIONS record for every choice not literally in the specification.

### M1 — Data contract, export, revision-1.3 rows

*Done 2026-09-25: `make export`, the export gate in `make check`, DECISIONS D-013 to D-015, ERRATA E-025 to E-032.*

**Requirements:** R-DATA-2/5/7/8/11, R-NFR-4/7, R-PROV-1/2, R-SUP-3 (FX), R-SUP-9 and R-DEM-1 rows, R-BND-5 factor row, R-BND-8 rows, R-BND-3 (by construction), R-LINK-2/5 (observed series), R-TIME-2/4/6 (axes, ranks), OPEN-13; §14 M1 gate.

**Work:**
1. `pipeline/sources/ecb.py` (`cached_get` to `https://data-api.ecb.europa.eu/service/data/EXR/M.USD.EUR.SP00.A?format=csvdata`), `register.PURPOSE['ecb']`, `smoke.CHECKS`, `history.jobs`, loader into `commodity` (`fx_usd_eur`); Open-Meteo for 1995/2008/2009 × EE/LV/LT (existing fetcher, new jobs).
2. Documents of Appendix A.5 into `documents.DOCS` and cached; rows: `scenarios.csv` scenario `delivery_path` (EE/LV/LT × 2030/2035: `capacity.wind_onshore`, `capacity.wind_offshore_awarded`, `capacity.battery`, `capacity.battery_mwh`), `elering_plan_2026_2035` (EE 2030/2035 `demand.twh`, `demand.peak_mw`, note on losses), `parameters.csv` `boundary.pl.slow_build_factor = 1.4` and the rows of §3.9; every row verified (`validate/documentary.py`), `make check` green.
3. `scenario_boundary(family, scenario, target_year, zone, demand_twh, electrolysis_twh, lineage_id)` loaded by code from the TYNDP 2024 market-model outputs (per node) and the cached NT+ KPI dashboard (R-BND-8); fallback if the 2024 archives carry no per-node demand: country tables of the scenario report as documentary rows.
4. `schema/`, `export/`, `make export`; `make check` extended with: export rebuild byte-identical, every series has lineage ids, no core observed price in `years/`, gzip ≤ 3 MB per file, schema valid, class map complete, ranks present.
5. `app/package.json` and `npm run contract` only (generated types committed; staleness test).
6. Cleanups of §6.

**Tests:** ECB parser; FX and MMBtu conversion; axis alignment (8 736 → 8 760 fill, 29 Feb drop, gap ≤ 6 h interpolated, longer fails, UTC day index); class map covers every documentary key incl. the oil-shale split; export determinism (two runs identical); schema validation of every file; end-to-end export from an in-memory fixture DB (`connect(":memory:") + load_vocabulary`); manifest coverage 100 %; "no core price" assertion; rank computation against `pecd_profile`.

**Documents:** methodology §4 "Export: axes, fills, class map, unit constants, weekend diagnostic"; D-013 (axes, fills, layout additions incl. the `data/export` symlink), D-014 (class map), D-015 (family-2026 proxies); ERRATA E-025… (§6); README; register (ECB, software rows).

**Owner touchpoint:** the fill rule and the proxies of D-013/D-015 are shown to the owner with the first `manifest.json`.

### M2 — Engine, golden fixture, LP reference and gap

*Done 2026-09-25: the engine, the LP reference, `make gap`, `make ci`, DECISIONS D-016 to D-021, ERRATA E-033 to E-037, the Crossref check. The gate as planned was not met after one tuning round (O-9, D-019); the owner chose the fallback in the form of option C (D-021, specification revision 1.4): the weekly LP in the browser is the engine of record, this plan's two-pass engine its preview, and the gate — the engine of record against the reference — is met. What this changes for M3–M7: calibration runs on the engine of record (`app/src/engine/lp.ts` with `app/scripts/highs.ts` in Node); M4's worker pool shares a set's weeks among its workers and shows the preview first; highs-js is a runtime dependency.*

**Requirements:** R-ENG-1…9, R-BND-1/2/4/6/7, R-SUP-1/2/3/4/7/8/9 (variant), R-DEM-2…6, R-STO-1…8, R-TIME-6, R-PAR-1…9, R-NFR-5/6/8/9, R-PROV-3/6, R-REPO-2 (v3 import), OPEN-7.

**Work:**
1. Port from v3 `328aa9b`: `simulateBattery`, `simulateBatteryCapped` (engine.js 143–226), `blockMW`, `clearSegment`, `solveHour` (coupler.js 211–431) with attribution headers and the changes of §3.4; `PROVENANCE.md` rows with blob hashes; D-016 records the owner's licence statement (owner item O-1).
2. `stack.ts`, `boundary.ts`, `storage.ts`, `hydro.ts`, `flex.ts`, `reserve.ts`, `smr.ts` (units and outage placement only; the contract card is M6), `results.ts`, `index.ts` `run(yearData, scenario) → results`; `state/scenario.ts` defaults from `presets.json`; `scripts/replay.ts`, `scripts/bench.ts`; `make ci`.
3. Golden fixture (`validate/golden.fixture.json`): synthetic 168 h case + 2024 replay on provisional parameters (markup 0, Δ 60, CHP floor off), each labelled provisional.
4. `reference/` LP, `make gap`, methodology gap table, OPEN-7 defaults.
5. Crossref check of the "verify" references; methodology §5 cites only verified ones.

**Tests (vitest, Python):** R-NFR-8 invariants on seeded random stacks (zone-hour balance ≤ 1e-6 MW incl. losses, flows within NTC, prices within [floor, VOLL], divergence only at saturated borders, SoC within bounds, CO₂ identity); v3's five battery tests re-expressed; the shortage probe; unsaturated price = boundary price ± 1; saturated EE–FI import ⇒ EE > FI; loss applied on the importing side; pass two never discharges more than stored, never charges and discharges in one hour; DSR daily hours; Daugava budget conserved and `MIN_TURB` honoured; CHP floor 0 above `T_ref` and capped; battery day-ahead power = installed − reserved; `R_z = 0` before 2025-02-04; oil-shale premium constant under a CO₂ change; monotonicity property of every net-export term; determinism (same input twice → same hash); guards; `lint_engine.mjs`; LP builder on a two-hour toy problem with known duals; gap threshold logic.

**Gate:** average |Δprice| ≤ 3 €/MWh and storage discharge within ±15 % on every test week. Not met → owner with the table; if the owner chooses the fallback, the storage layer moves to LP-in-workers before M4.

**Documents:** methodology §5 "Engine", §6 "Reference LP and gap"; D-016 (v3 licence), D-017 (deficit-branch correction), D-018 (pass-two matching rule, Kruonis and Daugava rules, pre-market reserves), D-019 (gap result); PROVENANCE; register software rows.

### M3 — Calibration protocol on 2023–2025

**Requirements:** R-VAL-1…8, R-SUP-5/6, R-STO-9, R-TIME-1/5, R-PROV-4, R-LINK-8, OPEN-2/3/4, OPEN-10 outcome.

**Work:** the toolchain of §3.7; `data/derived/fitted_parameters.json` + lineage; `data/derived/validation/{2020..2026}.json`; methodology fitted-parameter register and results; the EstLink 2 counterfactual; PECD-correction evidence (OPEN-2; `validate/pecd_cf.py` exists); diagnostics 2020–2022 (R-VAL-7) and the breakdowns by price bin, hour and month (v4 `diagnose.py`, re-implemented); `make ci` gains `validate_fit --check` and provenance coverage. Protocol rules (v4 `CALIBRATION_2025.md`): one change per full-year run; a change kept only if no Baltic zone's MAE rises; a 2025 gain that costs 2023 or 2024 more than 1 €/MWh is overfitting; no per-zone multipliers; no replay of prices or flows. The milestone ends with the golden re-baseline of the 2024 replay (before/after table, owner sign-off).

**Tests:** metric functions on toy series (MAE, duration-curve RMSE on 100 quantiles, share ≥ 150, congested-hour share, congestion rent); threshold evaluation and exit codes; markup fit monotone and floored, stop rule; CHP fit recovers a, b, T_ref from a synthetic relation; counterfactual NTC construction; fitted register round-trips through lineage; the structural "no core price" test on the fit scripts.

**Gate:** R-VAL-5 on 2023, 2024 and blind 2025; R-VAL-6 sign and magnitude. Not met → owner with the diagnostics; UI milestones proceed under the gate-status header.

**Documents:** methodology §7 "Calibration" (register, results, EstLink 2); D-020 (fitted values frozen), D-021 (OPEN-2 evidence and decision), D-022 (OPEN-3/4), D-023 (OPEN-10 outcome; cross-check done or "not done"); ERRATA for what the blind year exposes.

*Done 2026-09-25, gates returned to the owner (D-024): `make fit` (`validate/fit.py`: CHP floor, markup, Δ evidence) into `data/derived/fitted_parameters.json` with lineage; `make validate` (`validate_fit.ts` on 2020–2026 with the breakdowns, `estlink2.ts`); methodology §7; DECISIONS D-022 to D-024 (M2 had taken D-020 and D-021); ERRATA E-038, E-039; `docs/research/2026-09-25_calibration_m3.md`. R-VAL-6 is met, R-VAL-5 is not (MAE 19–33 €/MWh). Departures: the markup is fitted by coordinate descent (E-039); Δ is recorded as evidence only, its data beginning in March 2026 (E-038, OPEN-3); `validate_fit --check` stays out of `make ci` while the gate fails (D-024 item 7); the markup's stop rule and monotonicity hold by construction (non-negative increments), and no year file holds a core price by the export gate's own check. The owner decided D-024 as recommended the same day (D-025).*

### M4 — Model view, panel, set runner

**Requirements:** R-APP-1/2/10 (share link)/11 (compute path), R-UI-1…6, R-NFR-1/3/4/9, R-PUB-3/4, R-PROV-1, R-DEM-1/3/4 (controls), R-BND-5 opening state, D12/D14.

**Work:** Vite + TypeScript site; `theme.ts` (R-UI-1 tokens: dark default, light on `prefers-color-scheme`, manual toggle, print light); D-DIN (v4 spike `fonts/`, SIL OFL) and JetBrains Mono self-hosted with licences (PROVENANCE); left panel in v4's information architecture (country switcher → demand → fleet → flexibility → fuel/CO₂ path → links → canonical text); amber "changed from preset" marks with the preset tick on sliders; right column cards and charts (generation stack vs load, mix, monthly average/median with the observed line in replays, price duration curve); replay/scenario header and the gate-status header; **opening state = TYNDP 2024 family, Distributed Energy 2035 on 1995/2008/2009, official presets, electrolysis off, no plant** (D-011); `share.ts`; `loader.ts` (fetch on demand; inflate with `DecompressionStream` only when the bytes start with `1f 8b`, otherwise the host already inflated them); `controller.ts` + pool with the set runner and priorities of §3.6; sensitivities strip (four differences, R-APP-11); "sensitivity" marker whenever `s < ∞` (R-BND-6); source popover per control (R-UI-6).

**Canonical text and share link (R-APP-1/10):** the text is the full scenario as sorted `key=value` lines under a `v=<schema version>` header, defaults included (so a preset change never breaks a link); the link is `#s=` + base64url(UTF-8 text); parsing is strict: unknown key → reject, every value range-checked against `scenario.schema.json`, array lengths bounded; the panel shows the same text with display-only `*` marks on changed values.

**Tests:** share-link round trip and rejection cases; text ↔ scenario bijection; opening-state test (family, profile, years, electrolysis off, no plant, official presets first); controller cancels superseded jobs and runs the set in parallel (fake workers); loader magic-byte branch; token contrast ≥ 4.5:1 computed in a test; every control has an accessible name (jsdom); `dist/` contains no external URL (R-NFR-1); bundle ≤ v3 + 30 %; the 300 ms progress state; manual preview verification with the browser pane (screenshots for the owner).

**Documents:** methodology §8 "Application" (what runs where; the text grammar); D-024 (share-link format), D-025 (worker budget and priorities); README quick start.

**Owner touchpoint:** first look at the panel on the local preview; label wording.

*Done 2026-09-29, closed by the owner after the first look and its rounds (D-029, D-030); built 2026-09-25 (D-027, D-028): the Model view in `app/`, the scenario text and share link, the worker pool, the sensitivities strip, methodology §8. Departures: the engine of record is the only engine the page runs (specification revision 1.5, D-026); one year per job rather than a year's weeks shared among workers; `share.ts`, `controller.ts` and `theme.ts` became `state/text.ts`, `main.ts` and `ui/theme.css`; accessibility is tested on the panel's HTML rather than with jsdom; the per-line link switches wait for M5 as planned.*

### M5 — Borders, outages, adequacy

**Requirements:** R-LINK-1/3/4/5/6/7, R-APP-3/8, R-BND-7 display, OPEN-5.

**Work:** `links.ts` profiles — nameplate; typical availability from `hvdc.*` (planned maintenance share placed in May–October per link, forced-outage hours from the documented counts); Litgrid's LitPol plan by year; ERAA hourly NTC by target year; the 2025 average AC-border reservation in scenario years — what-if per line (R-LINK-4) shown in header and exports; border panel per direction (R-APP-3) with attribution labels (R-LINK-6); adequacy tab (R-APP-8): seed, sample count, progress, cancel, distributions per climate year, in the pool; SMR forced outages enter the sampler in M6.

**Tests:** profile construction reproduces the documented availability; what-if application to NTC arrays; attribution join by window; RU/BY/KAL exclusion; LitPol plan-by-year selection; PRNG reproducibility against a reference vector; quantile-table draws reproduce the documented averages within 5 % over 1 000 sampled years; adequacy determinism for a fixed seed and count.

**Documents:** methodology §9 "Interconnectors and adequacy" (chain parameters with sources, quantile tables); D-026 (OPEN-5).

*Done 2026-09-29, built and closed by the owner the same day (D-031 … D-035): borders from their lines, the what-ifs, the border panel with the outage labels, the adequacy tab, methodology §9. Departures: a cable's planned maintenance is one block from 1 June, the cables of a border one after another, and its forced outages a uniform derate to the 2019–2024 average availability (D-032); OPEN-5 is decided in D-032 rather than a D-026 (D-026 went to specification revision 1.5); the what-ifs are listed with the result's changes and in the border panel, the exports wait for M7 (R-APP-10); the Links box took v4's map and switches at the owner's request; an observed what-if on EstLink splits each hour's offer between the cables by their A78 events (ERRATA E-046, E-047).*

### M6 — SMR pair and contract card

**Requirements:** R-SMR-1…8, R-APP-4, R-LINK-7 (SMR outages in the sampler), OPEN-6, D6.

**Work:** `smr.ts` dispatch by contract design; `contract.ts` (the eight rows of §3.4); paired runs (lever on → the same scenario without the plant computed too; differences within the pair only); the card recomputed instantly on strike change from the stored run (R-APP-4); publication order and the gate header on every plant result; SMR forced outages in `adequacy/`.

**Tests:** outage placement picks the max-surplus window with the ≥ 168 h gap; under the clause the plant curtails to 50 % in hours priced ≤ 0 and not otherwise; the eight account rows on three-hour toy cases; pairing invariant (lever off ⇒ identical to the plain run); capture price ≤ average price on the 2024 replay with 2 units.

**Documents:** methodology §10 "Nuclear and the contract" (formulas of §3.4); ERRATA "D6 six vs R-SMR-3 eight"; D-027 (OPEN-6).

*Revision 1.6 (D-036): M6 is built in the scenario view the owner simplified — the three scenarios of 2035 (Elering: gas, 2 SMR, 3 SMR; each unit replaces 300 MW of Estonian gas), run together, the plant's scenarios reported against Elering: gas rather than against the same scenario without the plant; before the plant's work: Elering and TalTech's S1 in `scenarios.csv`, the panel of R-APP-1's revision 1.6, the scenario text version 3.*

*Done 2026-09-29, built and closed by the owner the same day (D-036 … D-038): in the scenario view of specification revision 1.6 — the three scenarios of 2035, the contract card, the plant's forced outages in the sampler, Estonia's hours with a fossil price, the sensitivities as a pair, methodology §10. Departures: the plant's scenarios are reported against Elering: gas, the same firm capacity as gas, rather than against the same scenario without the plant (D-036); the card and its checks run on the scenarios of 2035, since the plant has no replay (§7's "2024 replay with 2 units" gives way); the dispatch by contract design lives in `build.ts` beside `smr.ts`'s outage placement; the clause's "at or below 0" is the model's zero, 0.01 €/MWh; a neighbour's price counts as fossil from a gas plant's cost on TYNDP 2024's prices (D-037); OPEN-6 closes on its defaults in D-038 rather than a D-027.*

### M7 — Compare, Outlook, Calibration page, export, staging

**Requirements:** R-APP-5/6/7/9/10/11 (views), R-TIME-3/4 (weights and labels, both families), R-DOC-4/6/8, R-DEP-1…5, R-PUB-1/2/5/6, R-NFR-4, OPEN-9, OPEN-11.

**Work:** Compare (three scenarios on one time base; refuses mixed families, R-TIME-2), Outlook (the set with weights and rank labels, weighted headline, GA 2035 selectable as the alternative boundary profile — owner item O-5, sensitivities beside the headline), Calibration page from `data/derived/validation/*.json` and the gap table (R-APP-7), Methodology/FAQ/Sources tabs from `methodology.md`, `faq.md` (new) and `sources.json`, CSV/JSON export with code version, manifest hash and lineage ids (R-APP-10), print stylesheet, declaration of interest in README and footer (OPEN-9 default: v4's paragraph with the 300/315 wording), `.htaccess` (Basic Auth, cache headers as v3), `ci.yml` calling `make ci`, `deploy.yml` and `make deploy` (rsync to `v5.energiamudel.ee` after the same gate; post-deploy manifest-hash check, R-DEP-5), performance measured on the built site (R-ENG-7).

**Tests:** weights sum to 1 per family and target year; rank labels equal the manifest's; Outlook headline = weighted average of the runs; Compare refuses mixed families; export JSON validates against `results.schema.json`, CSV rows = hours; `make deploy` refuses on a failed gate (dry run); `.htaccess` in `dist/`.

**Documents:** `faq.md`; methodology §11 "Deployment and verification"; D-028 (staging); CHANGELOG `0.5.0-staging`; README front page. *(Built: D-039 took the place of the staging record — D-028 went to M4's workers — and the CHANGELOG keeps "Unreleased" until M7 closes.)*

*Revision 1.7 (D-039): the scenario view's three scenarios stand for Compare and Outlook, with each weather year's Estonian price beside the weighted one; nothing is deployed until the owner decides — M7 prepares `make deploy`, the `.htaccess` and the workflows and checks them without deploying (ERRATA E-049).*

## 5. Owner decisions and owner-side work

**Decisions taken by this plan that the owner confirms by approving it** (each becomes a DECISIONS record when its milestone lands):

| # | Decision | Where | Alternative |
|---|---|---|---|
| O-1 | The owner, as author of v3, releases the ported functions under v5's AGPL-3.0-or-later (v3 has no licence file) | M2, D-016 | leave v3 code unused and rewrite the primitives |
| O-2 | Hours before 2025-02-04 carry no reserve headroom beyond the TSO-owned assets (no balancing capacity market then) | M2, D-018 | apply the 2026 need to 2023–2024 (contradicts R-VAL-7 and biases the markup fit) |
| O-3 | Kruonis runs as closed-loop pumped storage (DP, 12 h, η 0.74) with the observed weekly generation as a cap in calibration years; R-ENG-5's "TYNDP inflow" for Kruonis → ERRATA | M2, D-018 | a weekly release budget for a plant that has no inflow |
| O-4 | UTC days for storage caps and DSR hours (Baltic midnight 2–3 h later) | M1/M2, D-013 | local days (needs `Date`, breaks R-NFR-5) |
| O-5 | "Global Ambition 2035 is the sensitivity" (R-BND-5) = an alternative boundary profile the user selects in Outlook (revision 1.7: in the panel's neighbours' profile), not a fifth background run of R-APP-11 → clarification in ERRATA | M7 | a fifth standard sensitivity |
| O-6 | The FI slope's reference point is zero net exchange (R-BND-6 "relative to the profile"; no observed flow may anchor it, R-BND-3) | M2 | a documented exchange level per profile |
| O-7 | `tyndp_price` hours 8 737–8 760 filled with the layout's last Monday; family-2026 temperature and Estonian solar as labelled proxies | M1, D-013/D-015 | drop to 8 736 h (breaks R-TIME-6) |
| O-8 | Share links carry the full scenario text; Compare holds one family; layout additions `data/derived/`, `app/scripts/`, `.github/`, `app/src/adequacy/` | M1/M4/M7 | — |
| O-9 | If R-ENG-8 fails after one tuning round of the pass-two bids, the storage layer moves to LP-in-workers (D4) | M2 | a second tuning round |
| O-10 | Daugava minimum flow = PEMMDB `MIN_TURB`; the class map's exclusions (Kiisa, TSO batteries) | M1, D-014 | — |

**Owner-side, outside Stage 4:** Nord Pool research-terms inquiry (OPEN-10; outcome recorded in M3); OPEN-12 (workspace `CLAUDE.md` invariant); the GitHub remote (never created by the agent); vhost `v5` and `.htpasswd` (OPEN-11, before M7); declaration-of-interest wording (OPEN-9, before M7); switching the session model to Opus 5.5 for Stage 4 and back to Fable for reviews; Stage 5 acceptance and Stage 6 promotion.

**When the owner is asked during Stage 4:** M1 end (fills and proxies); M2 end (gap table; fallback if failed); M3 end (calibration evidence, OPEN-2, Nord Pool outcome, golden re-baseline); M4 (panel look); M6 (contract card wording); before M7 (OPEN-9, OPEN-11, first `make deploy`).

## 6. Findings to record at the start of M1 (ERRATA and cleanups)

- D6 "six designs" vs R-SMR-3 four designs × clause (eight) → ERRATA, resolved in M6.
- R-REPO-4 `data/export/` vs the §6 diagram's `app/public/data/` → the symlink (D-013).
- R-ENG-5 "TYNDP inflow" for Kruonis (O-3); R-BND-5 "GA 2035 is the sensitivity" (O-5) → ERRATA clarifications.
- Code and schema comments: `db/__init__.py` cites `make export` and v4's `model.scenario.code_stamp`; `schema.sql` names a non-existent `fingrid_central_2035`, `fuel.gas_ttf`, `v3_meta`, and 1982–2019 for `hydro_inflow` (actual 1982–2017); `test_schema_creates_every_table` omits the `tyndp2026_*` tables; `ENERGIAMUDEL_READ_ONLY` undocumented; `umm_message` holds RU/BY/KAL rows (the export filters them); the NT+ KPI dashboard and PEMMDB are cached but unloaded (M1 loads the dashboard for R-BND-8); `pyproject` lacks numpy and the new packages.
- E-024/OPEN-13 (no exchange rate) closes with M1.

## 7. How the owner verifies each milestone

M1: `make export && make check` green; `manifest.json` lists every file with lineage ids; no `EE|LV|LT` price key in `years/`. M2: `npm test`, `npm run lint`, `make gap` with every week within thresholds, `bench.ts` per-year time, fixture committed. M3: `make validate` prints the R-VAL-5 table with pass/fail per cell and the EstLink 2 gate; methodology §7 holds the register; no calibration figure moved without a DECISIONS record. M4–M6: `npm run build` size report; the preview in the browser pane; a share link that round-trips; the contract card on the 2024 replay with 2 units. M7: `vite preview` of `dist/` with `.htaccess`; `make deploy DRY_RUN=1` shows the gate; the Calibration page shows protocol results and gate status.

## 8. Requirement coverage (Appendix C → milestone; Stage 2 items marked done)

| Group | Done (Stage 2) | M1 | M2 | M3 | M4 | M5 | M6 | M7 |
|---|---|---|---|---|---|---|---|---|
| R-DATA-1…11 | 1, 3, 4, 6, 9, 10 | 2, 5, 7, 8, 11 | | | | | | |
| R-BND-1…8 | | 3 (by construction), 5 (factor row), 8 (rows) | 1, 2, 4, 6, 7 | | 5 (opening state), 8 (display) | 7 (panel) | | 5 (Outlook) |
| R-TIME-1…6 | 3 (weights loaded) | 2, 4 (ranks), 6 (axes) | 6 | 1, 5 | | | | 3, 4 (labels) |
| R-ENG-1…9 | | | 1…9 | | 7 (progress) | | | 7 (site) |
| R-SUP-1…9 | 4 (data) | 3 (FX), 9 (rows) | 1, 2, 3, 4, 7, 8, 9 | 5, 6 | | | | |
| R-DEM-1…6 | | 1 (rows), 5 (ERAA note) | 2, 5, 6 | | 1, 3, 4 (controls) | | | |
| R-STO-1…9 | 6 (data) | | 1…8 | 9 | | | | |
| R-SMR-1…8 | | | 1, 2 (units, outages) | | | | 1…8 | |
| R-LINK-1…8 | | 2, 5 (observed series) | | 8 | | 1, 3, 4, 5, 6, 7 | 7 (SMR outages) | |
| R-PAR-1…9 | 1, 2 (rows) | (rows of §3.9) | 1…9 | 6 (Δ) | | | | |
| R-VAL-1…8 | | | 8 (golden) | 1…8 | | | | 8 (page) |
| R-PROV-1…6 | 5 | 1, 2 | 3, 6 | 4 | 1 (UI) | | | |
| R-DOC-1…8 | 1, 2, 3, 5, 7 | 4, 6 | 4 | 4 | 4 | 4 | 4 | 4, 6, 8, faq |
| R-APP-1…11 | | | | | 1, 2, 10 (link), 11 (compute) | 3, 8 | 4 | 5, 6, 7, 9, 10, 11 (views) |
| R-UI-1…6 | | | | | 1…6 | | | print |
| R-NFR-1…10 | 10 | 4, 7 | 5, 6, 8, 9 | 8 | 1, 2, 3, 4 | | | 4 |
| R-REPO-1…5 | 1, 3, 5 | 4 | 2 (v3) | | | | | |
| R-PUB-1…6 | | | | | 3, 4 | | 3 | 1, 2, 5, 6 |
| R-DEP-1…5 | | | | | | | | 1…5 |
| OPEN-1…13 | 1, 8, 10 route (D-011) | 13 | 7 | 2, 3, 4, 10 outcome | | 5 | 6 | 9, 11 |

OPEN-12 is owner-side (§5).

## 9. Release and the public presentation of 10 November 2026 (D-123, D-124)

The owner's goal (2026-10-17): "on 10 November I give a public
presentation of the model; by then the model must be ready, and a presentation must be prepared". The
owner accepted the validation as it stands for release (D-123) and decided the rest on the same day
(D-124): revision 2.11 approved, the declaration of interest as it stands, v5 promoted to
`energiamudel.ee`, the deck in PowerPoint, in Estonian, 10–15 minutes, for specialists, officials and the
public and press.

| Dates | The model | The presentation | The owner |
|---|---|---|---|
| 17–20 Oct | Decisions recorded (D-123, D-124); a release audit of every view — done 2026-10-18 (`docs/research/2026-10-18_release_audit.md`) | The story and the slide list | Re-point v3's deployment (below) |
| 21–31 Oct | The audit's fixes, the documents | Deck v1 in Estonian, on the model's figures | Review the story |
| 1–3 Nov | October's data (`make history`, `make export`, `make nordpool`) on 3 November, after the World Bank's Pink Sheet of October comes out that day — the order and its times in `docs/research/2026-10-18_freeze_rehearsal.md`, which found that October's data move the 2026 replay and the Statistics page, no scenario figure; the curves' November step (R-SUP-6's cross-check); **3 Nov: figures frozen**, deployed to energiamudel.ee at the owner's word | Deck v2 on the frozen figures | — |
| 4–7 Nov | ~~Promotion rehearsed~~ done 17 Oct (D-125) | Speaker notes, the likely questions with answers, a PDF | Review the deck |
| 8–9 Nov | ~~Cut-over~~ done 17 Oct (D-125) | Final check against the live site (behind its password since D-178: through the team's tools page's way in, D-179) | ~~Push v3's deploy change~~ done 17 Oct |
| 10 Nov | — | The presentation | — |

**Freeze.** From 3 November no figure moves: the deck's numbers are the site's. A fix found after it
goes into the deck's notes, not the model, unless the owner decides otherwise. *Done late, on 2026-11-11, after the
talk: `make freeze` had never run. October's data moved the 2026 replay and the Statistics page only, as the
rehearsal said (CHANGELOG).*

**The cut-over (R-DEP-3) — done on 2026-10-17 at the owner's word (D-125),** ahead of the dates above;
the steps as planned. The owner pushed v3's commit e501c63 the same day: its run (39048965236) deployed v3
to the archive, which still answers 401, and left the root untouched (the public manifest unchanged). Before it the whole of
`energiamudel.ee` was behind the site's Basic Auth: v3 at the root of `htdocs/`, v5 in `htdocs/v5/`.
1. `v3.energiamudel.ee` exists (checked 2026-10-17): the zone panel made it on 2026-07-20 as v3's
   development instance, document root `www.energiamudel.ee/v3/`, the site's password and a valid
   certificate; v3's branch `v3` deploys there (`deploy-v3.yml`) and it holds that branch's July build.
   v3's production deployment (`deploy.yml`, branch `main`) still writes `htdocs/`: before the cut-over
   it is re-pointed to `v3/` or switched off, and `deploy-v3.yml` switched off, so that neither
   overwrites the archive or v5 (v3's repository; the push is the owner's).
2. The production v3 is copied on the server from `htdocs/` to `v3/` (`v5/` and `.htaccess` left out),
   replacing the July build, so v3 stays behind its password there.
3. v5 is deployed to `htdocs/` with `make deploy PUBLIC=1 DEPLOY_TARGET=…/htdocs/`: `PUBLIC=1` puts
   `app/htaccess.public` in place of the staging `.htaccess` — no password, `/v5/…` redirected to `/…`
   and v3's `/stat/` to the archive — and checks `https://energiamudel.ee`; the deploy's `rsync --delete`
   then removes v3's files from the root and `htdocs/v5/`. Rehearsed first with `DRY_RUN=1`.
4. Checked: `https://energiamudel.ee` serves v5 without a password and `validate.deployed` passes
   (R-DEP-5); `/v5` redirects; `v3.energiamudel.ee` serves v3.
5. The documents that name the staging site (README, methodology §11, FAQ) say the site is public.

Since 2026-10-26 (D-178) the site is behind HTTP Basic Auth again, with a way in from the team's tools page (D-179);
`PUBLIC=1` and `app/htaccess.public` are gone, and `make deploy` and `make freeze` check through ssh and that way in
(ERRATA E-175).

Until step 1, v3's deployment must not run unless its commit 8814cc5 (`--filter='P /v5/'`) is pushed:
its `rsync --delete` of `htdocs/` would remove `/v5`.
