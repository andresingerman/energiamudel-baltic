"""The model's vocabulary: zones, technologies, borders (SPECIFICATION.md §2, R-DATA-2).

The single machine-readable statement of v5's zone graph. The database reference tables are
built from it (db/build.py), the fetchers iterate over it, and tests/test_config.py enforces
its invariants: three core zones joined in a chain, three boundary zones each attached to one
core zone by one border.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class Tier(StrEnum):
    CORE = "core"            # EE, LV, LT: supply, demand, storage and price computed (D2, D4)
    BOUNDARY = "boundary"    # FI, SE4, PL: exogenous hourly price profile + hourly NTC (D2)


@dataclass(frozen=True)
class Zone:
    code: str
    tier: Tier
    eic: str
    name: str


ZONES: dict[str, Zone] = {z.code: z for z in [
    Zone("EE", Tier.CORE, "10Y1001A1001A39I", "Estonia"),
    Zone("LV", Tier.CORE, "10YLV-1001A00074", "Latvia"),
    Zone("LT", Tier.CORE, "10YLT-1001A0008Q", "Lithuania"),
    Zone("FI", Tier.BOUNDARY, "10YFI-1--------U", "Finland"),
    Zone("SE4", Tier.BOUNDARY, "10Y1001A1001A47J", "Sweden SE4 Malmö"),
    Zone("PL", Tier.BOUNDARY, "10YPL-AREA-----S", "Poland"),
]}


@dataclass(frozen=True)
class Tech:
    code: str
    psr_type: str | None     # ENTSO-E production type (A75/A68), None for model-only techs
    name: str
    category: str            # vres | hydro | nuclear | thermal | storage | other


TECHS: dict[str, Tech] = {t.code: t for t in [
    Tech("wind_onshore", "B19", "Wind onshore", "vres"),
    Tech("wind_offshore", "B18", "Wind offshore", "vres"),
    Tech("solar", "B16", "Solar", "vres"),
    Tech("hydro_ror", "B11", "Hydro run-of-river and poundage", "hydro"),
    Tech("hydro_reservoir", "B12", "Hydro water reservoir", "hydro"),
    Tech("hydro_ps", "B10", "Hydro pumped storage", "storage"),
    Tech("nuclear", "B14", "Nuclear", "nuclear"),
    Tech("biomass", "B01", "Biomass", "thermal"),
    Tech("gas", "B04", "Fossil gas", "thermal"),
    Tech("coal_gas", "B03", "Fossil coal-derived gas", "thermal"),
    Tech("hard_coal", "B05", "Fossil hard coal", "thermal"),
    Tech("brown_coal", "B02", "Fossil brown coal / lignite", "thermal"),
    Tech("oil", "B06", "Fossil oil", "thermal"),
    Tech("oil_shale", "B07", "Fossil oil shale", "thermal"),
    Tech("peat", "B08", "Fossil peat", "thermal"),
    Tech("waste", "B17", "Waste", "thermal"),
    Tech("geothermal", "B09", "Geothermal", "other"),
    Tech("marine", "B13", "Marine", "other"),
    Tech("other_renewable", "B15", "Other renewable", "other"),
    Tech("other", "B20", "Other", "other"),
    Tech("battery", "B25", "Energy storage", "storage"),
]}

PSR_TO_TECH: dict[str, str] = {t.psr_type: t.code for t in TECHS.values() if t.psr_type}


@dataclass(frozen=True)
class Border:
    code: str          # "<from>-<to>"; direction 'fwd' means from_zone -> to_zone
    from_zone: str
    to_zone: str
    internal: bool     # True: between two core zones; False: a core zone and a boundary zone
    name: str = ""


def _b(code: str, internal: bool, name: str = "") -> Border:
    a, b = code.split("-")
    return Border(code, a, b, internal, name)


BORDERS: dict[str, Border] = {b.code: b for b in [
    _b("EE-FI", False, "EstLink 1 + 2"),
    _b("EE-LV", True),
    _b("LV-LT", True),
    _b("LT-SE4", False, "NordBalt"),
    _b("LT-PL", False, "LitPol (+ Harmony Link, planned)"),
]}

# The boundary zones' observed fleet shown beside the market model's on the import-price page
# (D-256): ENTSO-E's installed capacity (A68) of this year, the capacity on its 1 January — the
# fleet at the end of the year before. The first year SE4 has a document for.
BOUNDARY_FLEET_YEAR = 2026


def zones(tier: Tier | None = None) -> list[Zone]:
    return [z for z in ZONES.values() if tier is None or z.tier == tier]


def core_zones() -> list[str]:
    return [z.code for z in zones(Tier.CORE)]


def borders(internal: bool | None = None) -> list[Border]:
    return [b for b in BORDERS.values() if internal is None or b.internal == internal]
