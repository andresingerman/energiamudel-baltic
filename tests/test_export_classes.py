"""The class map (PLAN §3.3): every documentary capacity key has a rule, oil shale splits by
R-SUP-4, exclusions become notes, nothing is dropped silently."""

import pandas as pd
import pytest

from export import classes
from pipeline import DATA_DIR

SIZES = {"oil_shale_auvere": 270.0, "oil_shale_cfb": 386.0}


def test_every_documentary_capacity_key_is_mapped():
    d = pd.read_csv(DATA_DIR / "documentary" / "scenarios.csv", dtype=str,
                    keep_default_na=False)
    cap = d[d.key.str.startswith("capacity.")]
    for zone, key in set(zip(cap.zone, cap.key, strict=True)):
        classes.rule(zone, key)                          # KeyError = an unmapped key


def test_unknown_key_stops_the_export():
    with pytest.raises(KeyError, match="not in the class map"):
        classes.rule("EE", "capacity.fusion")


@pytest.mark.parametrize("mw, want", [
    (300, {"oil_shale_auvere": 270, "oil_shale_cfb": 30}),
    (658, {"oil_shale_auvere": 270, "oil_shale_cfb": 386, "oil_shale_pf": 2}),
    (100, {"oil_shale_auvere": 100}),
])
def test_oil_shale_fills_newest_first(mw, want):
    assert classes.split_oil_shale(mw, SIZES) == want


def test_fleet_maps_classes_energy_flex_and_notes():
    rows: dict[str, float] = {"capacity.battery": 420, "capacity.battery_tso_reserve": 80,
            "capacity.hydro_ror": 1588, "capacity.electrolyser": 1000,
            "capacity.battery_mwh": 840, "capacity.oil_shale_new": 658,
            "capacity.oil_shale_old": 173}
    cls, energy, flex, notes = classes.fleet("LV", rows, SIZES)
    assert cls["battery"] == 420 and cls["hydro_daugava"] == 1588
    assert cls["oil_shale_pf"] == 175                     # 2 from the split + 173 old
    assert energy == {"battery": 840} and flex == {"electrolysis": 1000}
    assert len(notes) == 1 and "R-STO-8" in notes[0]


def test_every_class_names_a_known_technology_row():
    d = pd.read_csv(DATA_DIR / "documentary" / "tech_parameters.csv", dtype=str,
                    keep_default_na=False)
    have = set(zip(d.source, d.tech_class, strict=True))
    for name, (_, params) in classes.CLASSES.items():
        assert params is None or params in have, name
    for key, r in classes.KEYS.items():
        assert r.params is None or r.params in have, key


def test_kiisa_is_out_of_the_market_to_2028_and_peaking_gas_after():
    """R-STO-8 holds Kiisa in the TSO's reserve to November 2028; a later preset year runs it as
    peaking gas (PLAN §3.3, D-104)."""
    assert classes.rule("EE", "capacity.kiisa").target == "exclude"
    assert classes.rule("EE", "capacity.kiisa", 2028).target == "exclude"
    assert classes.rule("EE", "capacity.kiisa", 2035).target == "gas_ocgt"
    cls, _, _, notes = classes.fleet("EE", {"capacity.kiisa": 250.0}, SIZES, 2035)
    assert cls == {"gas_ocgt": 250.0} and notes == []


def test_latvia_and_lithuania_build_no_offshore_wind():
    """The owner, 2026-10-08 (D-105): every preset's offshore wind there is out; Estonia's stays."""
    for z in ("LV", "LT"):
        for k in ("capacity.wind_offshore", "capacity.wind_offshore_fixed"):
            assert classes.rule(z, k).target == "exclude"
    assert classes.rule("EE", "capacity.wind_offshore").target == "wind_offshore"
