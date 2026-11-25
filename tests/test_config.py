"""The zone graph must stay as SPECIFICATION.md §2 and D2 describe it."""

from pipeline.config import BORDERS, PSR_TO_TECH, TECHS, ZONES, Tier, borders, core_zones


def test_zones_as_specified():
    assert core_zones() == ["EE", "LV", "LT"]
    assert {z.code for z in ZONES.values() if z.tier == Tier.BOUNDARY} == {"FI", "SE4", "PL"}


def test_every_border_joins_known_zones_once():
    seen = set()
    for b in BORDERS.values():
        assert b.from_zone in ZONES and b.to_zone in ZONES and b.from_zone != b.to_zone, b
        assert b.code == f"{b.from_zone}-{b.to_zone}", b
        key = frozenset((b.from_zone, b.to_zone))
        assert key not in seen, b
        seen.add(key)


def test_internal_borders_join_core_zones_in_a_chain():
    assert [b.code for b in borders(internal=True)] == ["EE-LV", "LV-LT"]
    for b in borders(internal=True):
        assert ZONES[b.from_zone].tier == ZONES[b.to_zone].tier == Tier.CORE, b


def test_each_boundary_zone_hangs_on_one_core_zone():
    attach = {}
    for b in borders(internal=False):
        tiers = [ZONES[b.from_zone].tier, ZONES[b.to_zone].tier]
        assert sorted(tiers) == [Tier.BOUNDARY, Tier.CORE], b
        boundary = b.to_zone if ZONES[b.to_zone].tier == Tier.BOUNDARY else b.from_zone
        assert boundary not in attach, b
        attach[boundary] = b.from_zone if boundary == b.to_zone else b.to_zone
    assert attach == {"FI": "EE", "SE4": "LT", "PL": "LT"}


def test_eic_codes_unique_and_well_formed():
    eics = [z.eic for z in ZONES.values()]
    assert len(eics) == len(set(eics))
    assert all(len(e) == 16 and e.startswith("10Y") for e in eics)


def test_tech_psr_mapping_is_one_to_one():
    psrs = [t.psr_type for t in TECHS.values() if t.psr_type]
    assert len(psrs) == len(set(psrs))
    assert PSR_TO_TECH["B19"] == "wind_onshore" and PSR_TO_TECH["B25"] == "battery"
