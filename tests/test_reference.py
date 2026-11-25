"""The reference LP on a toy with known prices, and the gap gate (R-ENG-8)."""

import pytest

pytest.importorskip("highspy")

from reference import gap, lp  # noqa: E402


def _toy() -> dict:
    """Two hours, everything in EE, links wide open: 150 MW then 500 MW of load, a cheap block of
    300 MW at 20 and a dear one at 80, a 100 MW one-hour store without losses or delta."""
    z = lambda load, offers=(): {"load": load, "fixed": [0, 0], "offers": list(offers)}  # noqa: E731
    offers = [{"name": "cheap", "cls": "x", "demand": False, "bid": [20, 20], "mw": [300, 300],
               "hoursPerDay": 0},
              {"name": "dear", "cls": "x", "demand": False, "bid": [80, 80], "mw": [1000, 1000],
               "hoursPerDay": 0}]
    return {"hours": 2, "voll": 4000, "floor": -600,
            "zones": [z([150, 500], offers), z([0, 0]), z([0, 0])],
            "links": [{"fwd": [1e4, 1e4], "rev": [1e4, 1e4]}] * 2, "borders": [],
            "storage": [{"name": "s", "zone": 0, "mw": 100, "hours": 1, "eff": 1.0, "delta": 0.0,
                         "period": 24, "budget": None}],
            "reservoir": None}


def test_toy_prices_are_the_marginal_bids():
    r = lp.solve(_toy())
    for z in range(3):
        assert r["price"][z][0] == pytest.approx(20, abs=0.01)
        assert r["price"][z][1] == pytest.approx(80, abs=0.01)
    assert r["storage"]["s"] == pytest.approx(100)
    # the window's objective: 250 MWh at 20, then 300 at 20 and 100 at 80 (D-175)
    assert r["objective"] == [pytest.approx(19000, abs=1)]


def test_the_primal_simplex_by_the_day():
    """D-175: options by the window's first hour; the toy has one optimum, so the same prices."""
    r = lp.solve(_toy(), options=lambda h0: gap.PRIMAL)
    assert r["price"][0][0] == pytest.approx(20, abs=0.01)
    assert r["price"][0][1] == pytest.approx(80, abs=0.01)


def test_a_store_is_held_to_its_hourly_limits():
    """D-073: a replay's Kruonis charges and delivers no more than its record's power."""
    toy = _toy()
    toy["storage"][0] |= {"chargeMax": [40, 40], "dischargeMax": [40, 40]}
    assert lp.solve(toy)["storage"]["s"] == pytest.approx(40)
    toy["storage"][0] |= {"chargeMax": None, "dischargeMax": None}
    assert lp.solve(toy)["storage"]["s"] == pytest.approx(100)


def test_gate():
    week = {"price": [[80.0] * 2] * 3, "storage": {"s": 1000.0}, "reservoir": None, "rent": {}}
    ok = gap.metrics(week, {**week, "price": [[80.05] * 2] * 3, "storage": {"s": 1005.0}})
    assert gap.failures(ok) == []
    bad = gap.metrics(week, {**week, "price": [[80.5] * 2] * 3, "storage": {"s": 1100.0}})
    assert len(gap.failures(bad)) == 4


def test_gate_on_the_same_optimum():
    """D-175: prices apart beyond the gate meet it when every window's objective is the reference's;
    the hours apart are listed and the gap outside them kept."""
    week = {"price": [[80.0] * 2] * 3, "storage": {"s": 1000.0}, "reservoir": None, "rent": {},
            "objective": [5000.0]}
    other = {**week, "price": [[90.0, 80.0]] * 3}
    m = gap.metrics(week, other)
    assert m["hours_apart"] == [0] and m["price_mae_rest"] == {"EE": 0.0, "LV": 0.0, "LT": 0.0}
    assert gap.failures(m) == []
    assert len(gap.failures(gap.metrics(week, {**other, "objective": [5001.0]}))) == 3
    assert len(gap.failures(gap.metrics({**week, "objective": None}, other))) == 3
    slow = gap.metrics(week, {**other, "storage": {"s": 1100.0}})
    assert gap.failures(slow) == [f"storage 1000 MWh vs 1100 ({-100 / 1100:+.1%})"]
