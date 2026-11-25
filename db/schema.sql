-- Energiamudel v5 database schema (DuckDB): the contract between the pipeline (writes), the
-- database (stores) and the export (reads). Changing it requires a record in
-- docs/DECISIONS.md (SPECIFICATION.md R-NFR-7).
--
-- Conventions
--   * every timestamp is UTC and marks the START of its interval; the column is a plain
--     TIMESTAMP, never TIMESTAMPTZ, so nothing depends on the session time zone
--   * hourly resolution unless a table says otherwise; sub-hourly sources are resampled
--     to hourly averages before insertion (R-DATA-4)
--   * every fact row carries lineage_id -> lineage.dataset (R-DATA-3)
--   * zone, tech and border codes are the ones in pipeline/config.py
--   * flow and ntc sign / direction: + and 'fwd' mean border.from_zone -> border.to_zone

-- ---------------------------------------------------------------- provenance
CREATE TABLE IF NOT EXISTS lineage (
  dataset       VARCHAR PRIMARY KEY,
  source        VARCHAR NOT NULL,
  endpoint      VARCHAR NOT NULL,
  params        JSON    NOT NULL,
  fetched_at    TIMESTAMP NOT NULL,          -- UTC
  licence       VARCHAR NOT NULL,
  http_status   INTEGER,
  sha256        VARCHAR,                     -- measured inputs
  page          VARCHAR,                     -- documentary inputs
  rows          INTEGER,
  derived_from  VARCHAR[],
  notes         VARCHAR
);

-- which schema.sql the file was last brought up to: SHA-1 of this file's text, written by
-- db.connect, which runs this file only when it differs (v4 E-084: rerunning DDL on a current file
-- rewrites it and moves the mtime the scenario code stamp hashes). One row; no lineage, no data.
CREATE TABLE IF NOT EXISTS schema_version (
  sha1          VARCHAR NOT NULL
);

-- ---------------------------------------------------------------- vocabulary
CREATE TABLE IF NOT EXISTS zone (
  code            VARCHAR PRIMARY KEY,
  tier            VARCHAR NOT NULL CHECK (tier IN ('core', 'boundary')),
  eic             VARCHAR NOT NULL UNIQUE,
  name            VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS tech (
  code      VARCHAR PRIMARY KEY,
  psr_type  VARCHAR UNIQUE,
  name      VARCHAR NOT NULL,
  category  VARCHAR NOT NULL CHECK (category IN ('vres','hydro','nuclear','thermal','storage','other'))
);

CREATE TABLE IF NOT EXISTS border (
  code       VARCHAR PRIMARY KEY,
  from_zone  VARCHAR NOT NULL REFERENCES zone(code),
  to_zone    VARCHAR NOT NULL REFERENCES zone(code),
  internal   BOOLEAN NOT NULL,                  -- both ends core zones
  name       VARCHAR
);

-- ---------------------------------------------------------------- measured, hourly
CREATE TABLE IF NOT EXISTS price (
  zone        VARCHAR NOT NULL REFERENCES zone(code),
  ts          TIMESTAMP NOT NULL,
  eur_mwh     DOUBLE NOT NULL,
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (zone, ts)
);

CREATE TABLE IF NOT EXISTS load (
  zone        VARCHAR NOT NULL REFERENCES zone(code),
  ts          TIMESTAMP NOT NULL,
  mw          DOUBLE NOT NULL,
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (zone, ts)
);

CREATE TABLE IF NOT EXISTS generation (
  zone        VARCHAR NOT NULL REFERENCES zone(code),
  tech        VARCHAR NOT NULL REFERENCES tech(code),
  ts          TIMESTAMP NOT NULL,
  mw          DOUBLE NOT NULL,
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (zone, tech, ts)
);

CREATE TABLE IF NOT EXISTS flow (                   -- A11, one row per direction
  border      VARCHAR NOT NULL REFERENCES border(code),
  direction   VARCHAR NOT NULL CHECK (direction IN ('fwd', 'rev')),
  ts          TIMESTAMP NOT NULL,
  mw          DOUBLE NOT NULL,                -- physical flow in that direction, >= 0
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (border, direction, ts)
);

CREATE TABLE IF NOT EXISTS ntc (                    -- A31 offered capacity (R-LINK-2)
  border      VARCHAR NOT NULL REFERENCES border(code),
  direction   VARCHAR NOT NULL CHECK (direction IN ('fwd', 'rev')),
  ts          TIMESTAMP NOT NULL,
  mw          DOUBLE NOT NULL,
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (border, direction, ts)
);

CREATE TABLE IF NOT EXISTS scheduled_exchange (     -- A09 day-ahead commercial schedule
  border      VARCHAR NOT NULL REFERENCES border(code),
  direction   VARCHAR NOT NULL CHECK (direction IN ('fwd', 'rev')),
  ts          TIMESTAMP NOT NULL,
  mw          DOUBLE NOT NULL,
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (border, direction, ts)
);

CREATE TABLE IF NOT EXISTS net_position (           -- A25/B09 day-ahead implicit net position
  zone        VARCHAR NOT NULL REFERENCES zone(code),
  ts          TIMESTAMP NOT NULL,
  mw          DOUBLE NOT NULL,                  -- + = net export from the zone
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (zone, ts)
);

CREATE TABLE IF NOT EXISTS tyndp_price (            -- TYNDP 2024 market-model output (R-BND-5)
  zone          VARCHAR NOT NULL REFERENCES zone(code),
  scenario      VARCHAR NOT NULL CHECK (scenario IN ('NT', 'DE', 'GA')),
  target_year   INTEGER NOT NULL,              -- 2030 | 2035 | 2040 | 2050
  climate_year  INTEGER NOT NULL,              -- 1995 | 2008 | 2009
  hour          INTEGER NOT NULL,              -- 1..8736 (52 weeks), the model's hour from 1 January
  eur_mwh       DOUBLE NOT NULL,               -- node marginal cost; the model caps at 3 000
  lineage_id    VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (zone, scenario, target_year, climate_year, hour)
);

CREATE TABLE IF NOT EXISTS balancing_cb (           -- BTD allocated_cb_capacity (R-LINK-5)
  border      VARCHAR NOT NULL REFERENCES border(code),
  direction   VARCHAR NOT NULL CHECK (direction IN ('fwd', 'rev')),
  ts          TIMESTAMP NOT NULL,
  product     VARCHAR NOT NULL,                 -- as the dashboard labels it (aFRR, mFRR, ...)
  mw          DOUBLE NOT NULL,                  -- hourly average
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (border, direction, ts, product)
);

CREATE TABLE IF NOT EXISTS tso_series (             -- Fingrid EstLink cross-checks (R-LINK-2)
  source      VARCHAR NOT NULL,                 -- fingrid
  series      VARCHAR NOT NULL,                 -- da_cap_fi_ee_mw | da_cap_ee_fi_mw | estlink_mw
  ts          TIMESTAMP NOT NULL,
  value       DOUBLE NOT NULL,                  -- hourly average
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (source, series, ts)
);

CREATE TABLE IF NOT EXISTS jao_series (             -- JAO Nordic, EstLink/NordBalt/SwePol fields
  endpoint    VARCHAR NOT NULL,                 -- maxNetPos | maxExchanges | referenceNetPosition
  field       VARCHAR NOT NULL,                 -- e.g. max_FI_EL, border_FI_EE
  ts          TIMESTAMP NOT NULL,
  value       DOUBLE NOT NULL,                  -- hourly average of the MTU values
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (endpoint, field, ts)
);

CREATE TABLE IF NOT EXISTS umm_message (            -- Nord Pool UMM, transmission (R-LINK-6)
  message_id          VARCHAR NOT NULL,
  version             INTEGER,
  published           TIMESTAMP,
  event_status        INTEGER,
  unavailability_type INTEGER,                  -- 1 unplanned, 2 planned (verify)
  reason_code         INTEGER,
  reason              VARCHAR,
  remarks             VARCHAR,
  assets              VARCHAR,
  unit                VARCHAR NOT NULL,         -- e.g. 'EE → LV'
  out_area            VARCHAR,
  in_area             VARCHAR,
  installed_mw        DOUBLE,
  unavailable_mw      DOUBLE,
  available_mw        DOUBLE,
  start_ts            TIMESTAMP NOT NULL,
  stop_ts             TIMESTAMP NOT NULL,
  lineage_id          VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (message_id, unit, start_ts, stop_ts)
);

CREATE TABLE IF NOT EXISTS reserve_procured (       -- Baltic balancing capacity market (R-STO-6)
  zone        VARCHAR NOT NULL REFERENCES zone(code),
  ts          TIMESTAMP NOT NULL,
  product     VARCHAR NOT NULL CHECK (product IN ('FCR', 'aFRR', 'mFRR')),
  direction   VARCHAR NOT NULL CHECK (direction IN ('up', 'down', 'sym')),
  mw          DOUBLE NOT NULL,
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (zone, ts, product, direction)
);

CREATE TABLE IF NOT EXISTS weather (
  zone            VARCHAR NOT NULL REFERENCES zone(code),
  ts              TIMESTAMP NOT NULL,
  temperature_c   DOUBLE,
  wind_ms         DOUBLE,
  radiation_wm2   DOUBLE,
  lineage_id      VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (zone, ts)
);

-- ---------------------------------------------------------------- measured, other resolutions
CREATE TABLE IF NOT EXISTS capacity (               -- annual (A68)
  zone        VARCHAR NOT NULL REFERENCES zone(code),
  tech        VARCHAR NOT NULL REFERENCES tech(code),
  year        INTEGER NOT NULL,
  mw          DOUBLE NOT NULL,
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (zone, tech, year)
);

CREATE TABLE IF NOT EXISTS capacity_area (          -- national statistics by bidding area (D-093)
  area        VARCHAR NOT NULL,                     -- SE1…SE4, SE_unassigned (not distributed by area)
  tech        VARCHAR NOT NULL,                     -- wind: onshore and offshore together
  year        INTEGER NOT NULL,
  mw          DOUBLE NOT NULL,
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (area, tech, year)
);

CREATE TABLE IF NOT EXISTS capacity_stat (          -- IRENASTAT year-end capacity per country (D-087)
  country     VARCHAR NOT NULL,                     -- ISO 3166 alpha-2: a country, not a bidding zone (SE)
  tech        VARCHAR NOT NULL REFERENCES tech(code),
  year        INTEGER NOT NULL,
  mw          DOUBLE NOT NULL,
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (country, tech, year)
);

CREATE TABLE IF NOT EXISTS unit (                   -- generation units (A71)
  code        VARCHAR PRIMARY KEY,
  zone        VARCHAR NOT NULL REFERENCES zone(code),
  tech        VARCHAR NOT NULL REFERENCES tech(code),
  name        VARCHAR NOT NULL,
  mw          DOUBLE NOT NULL,
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset)
);

CREATE TABLE IF NOT EXISTS unavailability (         -- A80 generation, A78 transmission
  id              VARCHAR PRIMARY KEY,              -- document mRID + period position (+ direction)
  kind            VARCHAR NOT NULL CHECK (kind IN ('generation', 'transmission')),
  asset           VARCHAR NOT NULL,                 -- resource EIC (generation) or asset name
  zone            VARCHAR REFERENCES zone(code),    -- generation only
  border          VARCHAR REFERENCES border(code),  -- transmission only
  direction       VARCHAR CHECK (direction IN ('fwd', 'rev')),  -- transmission only
  start_ts        TIMESTAMP NOT NULL,
  end_ts          TIMESTAMP NOT NULL,
  mw_available    DOUBLE NOT NULL,                  -- what the TSO says remains available
  mw_nominal      DOUBLE,                           -- unit nameplate (generation only)
  planned         BOOLEAN,                          -- businessType A53 planned, A54 forced
  reason          VARCHAR,
  lineage_id      VARCHAR NOT NULL REFERENCES lineage(dataset)
);

CREATE TABLE IF NOT EXISTS reservoir (              -- weekly (A72)
  zone        VARCHAR NOT NULL REFERENCES zone(code),
  week_start  DATE NOT NULL,
  gwh         DOUBLE NOT NULL,
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (zone, week_start)
);

CREATE TABLE IF NOT EXISTS commodity (              -- daily or monthly fuel and CO2 prices
  commodity   VARCHAR NOT NULL,                     -- gas_ttf | coal_aus | coal_saf | oil_brent | eua
  ts          DATE NOT NULL,
  price       DOUBLE NOT NULL,
  unit        VARCHAR NOT NULL,
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (commodity, ts)
);

-- ---------------------------------------------------------------- documentary (2035 presets)
CREATE TABLE IF NOT EXISTS scenario_assumption (
  scenario    VARCHAR NOT NULL,                     -- e.g. eraa2025_nt_2035
  zone        VARCHAR NOT NULL REFERENCES zone(code),
  year        INTEGER NOT NULL,
  key         VARCHAR NOT NULL,                     -- e.g. capacity.wind_onshore, demand.twh, flex.dsr.500
  value       DOUBLE NOT NULL,
  unit        VARCHAR NOT NULL,
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (scenario, zone, year, key)
);

CREATE TABLE IF NOT EXISTS scenario_fuel (              -- fuel and CO2 paths per source (R-SUP-8)
  scenario    VARCHAR NOT NULL,                     -- e.g. svk_lma_2026, eraa2025_final, tyndp2024_matrix
  year        INTEGER NOT NULL,
  commodity   VARCHAR NOT NULL,                     -- eua | gas | hard_coal | brown_coal | oil_light | ...
  price       DOUBLE NOT NULL,
  unit        VARCHAR NOT NULL,                     -- as published: EUR/GJ, EUR/MWh (thermal), EUR/t
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (scenario, year, commodity)
);

CREATE TABLE IF NOT EXISTS tech_parameter (             -- per plant class, per source (R-SUP-3)
  source      VARCHAR NOT NULL,                     -- eraa2025_common | dea_2025 | oil_shale_classes | ...
  tech_class  VARCHAR NOT NULL,                     -- PEMMDB class, e.g. gas_ccgt_new, hard_coal_old_1
  parameter   VARCHAR NOT NULL,                     -- efficiency | co2_factor | vom | min_time_on | ...
  value       DOUBLE NOT NULL,
  unit        VARCHAR NOT NULL,                     -- fraction, kg/GJ, EUR/MWh, h, GJ/MW, EUR/MW, days
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (source, tech_class, parameter)
);

CREATE TABLE IF NOT EXISTS scenario_link (              -- future transfer capacity per source (R-LINK-1)
  scenario    VARCHAR NOT NULL,                     -- eraa2025_ntc | tyndp2024_refgrid | litgrid_2026_2035 | svk_lma_2026 | elering_*
  border      VARCHAR NOT NULL REFERENCES border(code),
  direction   VARCHAR NOT NULL CHECK (direction IN ('fwd', 'rev')),
  year        INTEGER NOT NULL,
  mw          DOUBLE NOT NULL,
  kind        VARCHAR NOT NULL,                     -- ntc | ntc_mean | ntc_max | ttc_winter | commissioning_year | sync_profile_max (v4 D-072)
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (scenario, border, direction, year, kind)
);

CREATE TABLE IF NOT EXISTS parameter (                  -- scalar parameters and targets (R-PAR, R-VAL)
  key         VARCHAR PRIMARY KEY,                  -- dotted, e.g. market.price_cap_eur_mwh
  value       DOUBLE NOT NULL,
  unit        VARCHAR NOT NULL,
  lineage_id  VARCHAR NOT NULL REFERENCES lineage(dataset)
);

CREATE TABLE IF NOT EXISTS scenario_link_hourly (       -- ERAA hourly NTC profile (R-LINK-3)
  scenario     VARCHAR NOT NULL,                    -- eraa2025_ntc
  border       VARCHAR NOT NULL REFERENCES border(code),
  direction    VARCHAR NOT NULL CHECK (direction IN ('fwd', 'rev')),
  target_year  INTEGER NOT NULL,                    -- 2028 | 2030 | 2033 | 2035
  hour         INTEGER NOT NULL,                    -- 1 .. 8760, UTC, 29 February dropped
  mw           DOUBLE NOT NULL,                     -- its max and average are scenario_link's ntc_max, ntc_mean
  lineage_id   VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (scenario, border, direction, target_year, hour)
);

CREATE TABLE IF NOT EXISTS pecd_profile (               -- PECD 3.1 capacity factors (R-TIME-2)
  zone          VARCHAR NOT NULL REFERENCES zone(code),
  tech          VARCHAR NOT NULL REFERENCES tech(code), -- wind_onshore | wind_offshore | solar
  target_year   INTEGER NOT NULL,                    -- fleet vintage the profile is built for
  climate_year  INTEGER NOT NULL,                    -- 1982 .. 2019
  hour          INTEGER NOT NULL,                    -- 1 .. 8760, PECD calendar (1 Jan = Monday)
  cf            DOUBLE NOT NULL,
  lineage_id    VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (zone, tech, target_year, climate_year, hour)
);

CREATE TABLE IF NOT EXISTS hydro_inflow (               -- PEMMDB hydro inflows (R-ENG-5)
  zone          VARCHAR NOT NULL REFERENCES zone(code),
  target_year   INTEGER NOT NULL,                    -- 2030 | 2040 | 2050
  category      VARCHAR NOT NULL,                    -- reservoir | ror | pondage | ps_open | ps_closed
  variable      VARCHAR NOT NULL,                    -- INFLOW, MIN_TURB, MAX_TURB, RES_LEVEL_DAY, ... P_NOM_TURB, E_MAX_TURB
  climate_year  INTEGER NOT NULL,                    -- 1982 .. 2017; 0 for the uniform (climate-independent) rows
  week          INTEGER NOT NULL,                    -- 1 .. 53 (daily categories aggregated to 7-day weeks)
  value         DOUBLE NOT NULL,                     -- GWh/week for energies, MW for powers, [0,1] for levels
  lineage_id    VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (zone, target_year, category, variable, climate_year, week)
);

CREATE TABLE IF NOT EXISTS thermal_unit (               -- PEMMDB thermal units per type (R-LINK-7)
  source             VARCHAR NOT NULL,                  -- tyndp2024 | tyndp2026: National Trends
  zone               VARCHAR NOT NULL REFERENCES zone(code),
  target_year        INTEGER NOT NULL,                  -- 2030 | 2040 | 2050
  fuel               VARCHAR NOT NULL,                  -- as the sheet names it: Oil shale, Gas, Nuclear, ...
  plant_type         VARCHAR NOT NULL,                  -- as the sheet names it: CCGT new, old, new, OCGT new, ...
  mw                 DOUBLE NOT NULL,                   -- net generating capacity
  units              INTEGER NOT NULL,                  -- number of units; 0 where the sheet gives none
  forced_outage_rate DOUBLE,                            -- annual, a fraction (the sheet: per cent); NULL where 0 or none
  lineage_id         VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (source, zone, target_year, fuel, plant_type)
);

CREATE TABLE IF NOT EXISTS demand_profile (             -- TYNDP 2024 hourly demand (R-DEM-2)
  zone          VARCHAR NOT NULL REFERENCES zone(code),
  scenario      VARCHAR NOT NULL,                    -- national_trends
  target_year   INTEGER NOT NULL,                    -- 2030 | 2040
  climate_year  INTEGER NOT NULL,                    -- 1982 .. 2019
  hour          INTEGER NOT NULL,                    -- 1 .. 8760, calendar year 2018 layout
  mw            DOUBLE NOT NULL,
  lineage_id    VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (zone, scenario, target_year, climate_year, hour)
);

-- ---------------------------------------------------------------- TYNDP 2026 family (D-010)
-- The second scenario family: National Trends+ on three weather scenarios per target year.
-- A weather scenario is a modelled year of a CMIP6 SSP2-4.5 projection (PECD 4.2), not a
-- historical year; every table of the family is keyed by its code.

CREATE TABLE IF NOT EXISTS tyndp2026_weather (          -- Methodology Report, Tables 33 and 36
  code          VARCHAR PRIMARY KEY,                 -- WS003 .. WS106
  target_year   INTEGER NOT NULL,                    -- 2030 | 2035 | 2040 | 2050
  climate_model VARCHAR NOT NULL,                    -- CMR5 | MEHR | ECE3
  climate_year  INTEGER NOT NULL,                    -- the modelled year of the projection
  weight        DOUBLE NOT NULL,                     -- probability weight within the target year
  lineage_id    VARCHAR NOT NULL REFERENCES lineage(dataset)
);

CREATE TABLE IF NOT EXISTS tyndp2026_price (            -- NT+ hourly marginal cost (R-BND-5)
  zone          VARCHAR NOT NULL REFERENCES zone(code),
  weather       VARCHAR NOT NULL REFERENCES tyndp2026_weather(code),
  hour          INTEGER NOT NULL,                    -- 1 .. 8760 (8784 in a leap target year)
  eur_mwh       DOUBLE NOT NULL,
  lineage_id    VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (zone, weather, hour)
);

CREATE TABLE IF NOT EXISTS tyndp2026_pecd (             -- PECD 4.2 capacity factors (R-TIME-2)
  zone          VARCHAR NOT NULL REFERENCES zone(code),
  tech          VARCHAR NOT NULL REFERENCES tech(code), -- wind_onshore | wind_offshore | solar
  series        VARCHAR NOT NULL,                    -- onshore | offshore | utility | rooftop
  weather       VARCHAR NOT NULL REFERENCES tyndp2026_weather(code),
  hour          INTEGER NOT NULL,                    -- 1 .. 8760
  cf            DOUBLE NOT NULL,
  lineage_id    VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (zone, tech, series, weather, hour)
);

CREATE TABLE IF NOT EXISTS tyndp2026_demand (           -- NT+ hourly electricity demand (R-DEM-2)
  zone          VARCHAR NOT NULL REFERENCES zone(code),
  component     VARCHAR NOT NULL,                    -- market | prosumer | ev_market | ev_prosumer
  weather       VARCHAR NOT NULL REFERENCES tyndp2026_weather(code),
  hour          INTEGER NOT NULL,                    -- 1 .. 8760
  mw            DOUBLE NOT NULL,
  lineage_id    VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (zone, component, weather, hour)
);

CREATE TABLE IF NOT EXISTS tyndp2026_hydro (            -- daily hydro inflow (R-ENG-5)
  zone          VARCHAR NOT NULL REFERENCES zone(code),
  category      VARCHAR NOT NULL,                    -- ror | pondage | reservoir | ps_open | ps_closed
  weather       VARCHAR NOT NULL REFERENCES tyndp2026_weather(code),
  day           INTEGER NOT NULL,                    -- 1 .. 365
  mwh           DOUBLE NOT NULL,                     -- per day (the package states no unit)
  lineage_id    VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (zone, category, weather, day)
);

-- What each scenario profile's prices rest on (R-BND-8): the zone's annual demand and the
-- electrolysis beside it, per scenario, target year and climate year / weather scenario, read
-- from the same model outputs as the prices (tyndp_price, tyndp2026_price).
CREATE TABLE IF NOT EXISTS scenario_boundary (
  family           VARCHAR NOT NULL,                  -- tyndp2024 | tyndp2026
  scenario         VARCHAR NOT NULL,                  -- NT | DE | GA | NTplus
  target_year      INTEGER NOT NULL,
  weather          VARCHAR NOT NULL,                  -- climate year ('2009') or 'WS037'
  zone             VARCHAR NOT NULL REFERENCES zone(code),
  demand_twh       DOUBLE NOT NULL,                   -- native demand of all the zone's nodes
  electrolysis_twh DOUBLE NOT NULL,                   -- electrolyser load, not in demand_twh
  lineage_id       VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (family, scenario, target_year, weather, zone)
);

-- What a boundary profile's prices come from (R-BND-8, D-040, D-041, D-043): the zone's annual
-- generation (TWh) and installed capacity (MW) per row of TYNDP 2024's 'Yearly Outputs' sheet (its
-- loads among them, labelled so by the sheet; the electric cars' nodes apart, prefixed 'EV: '),
-- its net export and its dumped energy (TWh); and the same from the TYNDP 2026 NT+ hourly
-- dashboards per weather scenario, under TYNDP 2024's labels where the category is the same
-- (tyndp2026.parse_output_member). Shown on the import-price page; the engine does not read it.
-- It replaces scenario_boundary_generation (generation only).
DROP TABLE IF EXISTS scenario_boundary_generation;
CREATE TABLE IF NOT EXISTS scenario_boundary_output (
  family           VARCHAR NOT NULL,                  -- tyndp2024 | tyndp2026
  scenario         VARCHAR NOT NULL,                  -- NT | DE | GA | NTplus
  target_year      INTEGER NOT NULL,
  weather          VARCHAR NOT NULL,                  -- climate year ('2009') | weather scenario ('WS037')
  zone             VARCHAR NOT NULL REFERENCES zone(code),
  output           VARCHAR NOT NULL,                  -- the sheet's row or section label
  measure          VARCHAR NOT NULL,                  -- twh | mw
  value            DOUBLE NOT NULL,                   -- summed over the zone's nodes
  lineage_id       VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (family, scenario, target_year, weather, zone, output, measure)
);

-- ---------------------------------------------------------------- convenience views
CREATE OR REPLACE VIEW v_flow_net AS                -- + = from_zone -> to_zone
SELECT border, ts,
       sum(CASE WHEN direction = 'fwd' THEN mw ELSE -mw END) AS mw
FROM flow GROUP BY border, ts;

CREATE OR REPLACE VIEW v_coverage AS
SELECT 'price' AS tbl, zone, year(ts) AS year, count(*) AS rows_ FROM price GROUP BY ALL
UNION ALL
SELECT 'load', zone, year(ts), count(*) FROM load GROUP BY ALL
UNION ALL
SELECT 'generation', zone, year(ts), count(*) FROM generation GROUP BY ALL
ORDER BY tbl, zone, year;

-- which archive, by sha256, the rows of an archive-loaded table came from (v4 E-056, D-076); a
-- table is reloaded when its archive file changes
CREATE TABLE IF NOT EXISTS loaded_archive (
  tbl      VARCHAR NOT NULL,
  dataset  VARCHAR NOT NULL,
  sha256   VARCHAR,
  PRIMARY KEY (tbl, dataset)
);

-- the neighbours' boundary profiles computed by energiamudel's own research on Finland, Sweden and
-- Poland (R-BND-5, D-121), from data/research/: hourly on the climate years' layout, frozen at the
-- fuels they were computed with
CREATE TABLE IF NOT EXISTS research_price (
  profile       VARCHAR NOT NULL,              -- TIGHT | TIGHTJ
  target_year   INTEGER NOT NULL,              -- 2035
  climate_year  INTEGER NOT NULL,              -- 1995 | 2008 | 2009
  zone          VARCHAR NOT NULL REFERENCES zone(code),
  hour          INTEGER NOT NULL,              -- 1..8760, the layout's hour
  eur_mwh       DOUBLE NOT NULL,
  lineage_id    VARCHAR NOT NULL REFERENCES lineage(dataset),
  PRIMARY KEY (profile, target_year, climate_year, zone, hour)
);
