"""The export's time axes (R-DATA-4, R-TIME-6; PLAN §3.1): lengths, fills, days and weeks."""

import numpy as np
import pandas as pd
import pytest

from export import axis


def test_observed_axis_is_the_utc_calendar_year():
    assert axis.hours_of(2024) == 8784 and axis.hours_of(2025) == 8760
    idx = axis.observed_index(2025)
    assert idx[0] == pd.Timestamp("2025-01-01 00:00")
    assert idx[-1] == pd.Timestamp("2025-12-31 23:00")


def test_short_gap_is_interpolated_and_reported():
    idx = axis.observed_index(2025)[:48]
    s = pd.Series(np.arange(48, dtype=float), index=idx).drop(idx[10:13])
    out, fill = axis.align_observed(s, idx, "zones.EE.load")
    assert fill is not None
    assert np.allclose(out, np.arange(48)) and fill.hours == (10, 11, 12)
    assert fill.as_json()["count"] == 3


@pytest.mark.parametrize("drop", [slice(10, 23), slice(0, 1), slice(47, 48)])
def test_long_or_edge_gap_fails(drop):
    idx = axis.observed_index(2025)[:48]
    s = pd.Series(1.0, index=idx).drop(idx[drop])
    with pytest.raises(ValueError, match="missing hours"):
        axis.align_observed(s, idx, "x")


def test_tyndp_prices_fill_the_last_day_with_the_last_monday():
    a = np.arange(axis.TYNDP_PRICE_HOURS, dtype=float)
    out, fill = axis.tyndp_price_to_layout(a, "boundary.FI.DE_2035")
    assert out.shape == (8760,)
    assert np.array_equal(out[8736:], a[8568:8592])          # hours 8 569-8 592, 1-based
    # the layout starts on a Monday: day 357 (the copied one) and day 364 (the filled one) too
    assert (8568 // 24) % 7 == 0 and (8736 // 24) % 7 == 0
    assert fill.hours[0] == 8736 and len(fill.hours) == 24
    with pytest.raises(ValueError):
        axis.tyndp_price_to_layout(a[:-1], "x")


def test_a_late_tyndp_run_moves_a_day_earlier_before_its_last_monday_is_copied():
    """D-103, E-136: the DE and GA 2040 runs' week is a day late; the first day goes to the end."""
    a = np.arange(axis.TYNDP_PRICE_HOURS, dtype=float)
    out, fill = axis.tyndp_price_to_layout(a, "boundary.FI.DE_2040", late=True)
    assert np.array_equal(out[:8712], a[24:]) and np.array_equal(out[8712:8736], a[:24])
    assert np.array_equal(out[8736:], a[8592:8616])  # its own last Monday, a day on
    assert fill.hours[0] == 8712 and len(fill.hours) == 48 and "D-103" in fill.rule
    assert ("DE", 2040) in axis.TYNDP_LATE and ("DE", 2035) not in axis.TYNDP_LATE


def test_layout_series_refuses_a_wrong_length_or_nan():
    axis.layout_series(np.zeros(8760), "ok")
    with pytest.raises(ValueError):
        axis.layout_series(np.zeros(8784), "leap")
    bad = np.zeros(8760)
    bad[5] = np.nan
    with pytest.raises(ValueError):
        axis.layout_series(bad, "nan")


def test_feb29_is_dropped_from_a_leap_climate_year():
    idx = axis.observed_index(2008)
    assert axis.drop_feb29(idx).sum() == 8760


def test_utc_weeks_and_days():
    w = axis.weekly_sums(np.ones(8760))
    assert len(w) == 53 and w[0] == 168 and w[-1] == 24
    assert len(axis.weekly_sums(np.ones(8784))) == 53
    d = axis.daily_to_weekly(np.ones(365))
    assert d.sum() == 365 and d[-1] == 1


def test_writer_is_deterministic_and_refuses_nan(tmp_path):
    from export import write
    obj = {"b": write.series([1.234567, 2], "cf"), "a": write.series([1.4, 2.6], "mw")}
    e1 = write.write(tmp_path / "x.json.gz", obj, compress=True)
    e2 = write.write(tmp_path / "y.json.gz", obj, compress=True)
    assert e1 == e2 and write.read(tmp_path / "x.json.gz") == {"a": [1, 3], "b": [1.2346, 2]}
    with pytest.raises(ValueError):
        write.series([float("nan")], "price")


def test_ntc_gaps_take_the_same_hour_of_the_nearest_week():
    idx = axis.observed_index(2025)[:24 * 7 * 4]
    s = pd.Series(np.tile(np.arange(168.0), 4), index=idx)
    gap = s.drop(idx[200:400])                       # 200 hours, longer than a week
    out, fill = axis.fill_weekly(gap, idx, "borders.LT-SE4.ntc_fwd")
    assert fill is not None
    assert np.array_equal(out, s.to_numpy()) and len(fill.hours) == 200
    with pytest.raises(ValueError, match="no value within"):
        axis.fill_weekly(s.drop(idx[:]), idx, "x")


def test_weekly_quantile_takes_the_nearest_rank_of_each_week():
    """D-044: the 10th and 90th percentile hour of a week, the last week short."""
    hourly = np.concatenate([np.arange(168.0), np.full(24, 7.0)])      # a full week and a day
    assert axis.weekly_quantile(hourly, 0.1).tolist() == [17.0, 7.0]   # 0.1 · 167 = 16.7 → rank 17
    assert axis.weekly_quantile(hourly, 0.9).tolist() == [150.0, 7.0]  # 0.9 · 167 = 150.3
    assert axis.weekly_quantile(hourly[::-1].copy(), 0.0)[0] == 7.0    # order within a week is free
