"""Time axes of the export: one hourly axis per year kind, and the fills that align every table
to it (SPECIFICATION.md R-DATA-4, R-TIME-2, R-TIME-6; docs/PLAN.md §3.1; DECISIONS D-013).

observed Y   hours of the UTC calendar year, 8 760 or 8 784, from Y-01-01T00:00Z
climate CY   hour-of-year 1..8 760 of TYNDP 2024's layout (1 January = Monday, no 29 February)
weather WS   the 8 760 hours of the TYNDP 2026 package

Days are UTC days, `day = hour // 24`, for every kind; weeks are `hour // 168`, so a year has 53
weeks and the last is short (24 h, or 48 h in a leap year). Nothing is wrapped by index: a
series of the wrong length fails here, and the only fills are the documented ones below, each
reported back to the caller so the manifest can list it.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

LAYOUT_HOURS = 8760              # TYNDP 2024 profiles and the TYNDP 2026 package
TYNDP_PRICE_HOURS = 8736         # TYNDP 2024 market-model output: 52 weeks
MAX_GAP = 12                     # hours an observed series may be interpolated over
WEEKS_BACK = 10                  # how far a weekly-persistence fill may look (NTC gaps)


@dataclass(frozen=True)
class Fill:
    """A documented fill of one series: which hours were not in the source and how they were
    made. `hours` are 0-based indices on the axis."""
    series: str
    rule: str
    hours: tuple[int, ...]

    def as_json(self) -> dict:
        return {"series": self.series, "rule": self.rule, "count": len(self.hours),
                "first": self.hours[0], "last": self.hours[-1]}


def observed_index(year: int) -> pd.DatetimeIndex:
    """The hourly UTC axis of a calendar year (naive timestamps, as the database stores them)."""
    return pd.date_range(f"{year}-01-01", f"{year + 1}-01-01", freq="h", inclusive="left")


def hours_of(year: int) -> int:
    return len(observed_index(year))


def weeks(hours: int) -> int:
    return -(-hours // 168)


def align_observed(s: pd.Series, index: pd.DatetimeIndex, name: str,
                   max_gap: int = MAX_GAP) -> tuple[np.ndarray, Fill | None]:
    """Reindex an hourly series (indexed by naive UTC timestamps) on `index`. Gaps of up to
    `max_gap` hours are filled linearly between their neighbours and reported; a longer gap, or a
    gap at either end, raises: the export never invents a day of data."""
    s = s[~s.index.duplicated(keep="first")].reindex(index)
    missing = np.flatnonzero(s.isna().to_numpy())
    if not len(missing):
        return s.to_numpy(dtype=float), None
    runs = np.split(missing, np.flatnonzero(np.diff(missing) > 1) + 1)
    for run in runs:
        if len(run) > max_gap or run[0] == 0 or run[-1] == len(index) - 1:
            raise ValueError(f"{name}: {len(run)} missing hours from {index[run[0]]} "
                             f"(the export fills at most {max_gap} inner hours)")
    filled = s.interpolate(method="linear", limit_area="inside")
    return filled.to_numpy(dtype=float), Fill(name, f"linear over gaps of <= {max_gap} h",
                                              tuple(int(h) for h in missing))


def fill_weekly(s: pd.Series, index: pd.DatetimeIndex, name: str,
                weeks_back: int = WEEKS_BACK) -> tuple[np.ndarray, Fill | None]:
    """Reindex a series on `index` and fill each missing hour with the same hour one week
    earlier, two weeks earlier, … (then later) — the rule for publication gaps of the offered
    capacity (A31), whose value follows the weekly auction pattern and outages that last days,
    not a line between two hours (DECISIONS D-013). Only observed values are copied, never a
    filled one; an hour with nothing within `weeks_back` weeks either way raises."""
    s = s[~s.index.duplicated(keep="first")].reindex(index)
    have = s.to_numpy(dtype=float)
    out = have.copy()
    missing = np.flatnonzero(np.isnan(have))
    if not len(missing):
        return out, None
    for h in missing:
        for k in [-w for w in range(1, weeks_back + 1)] + list(range(1, weeks_back + 1)):
            j = h + 168 * k
            if 0 <= j < len(have) and not np.isnan(have[j]):
                out[h] = have[j]
                break
        else:
            raise ValueError(f"{name}: no value within {weeks_back} weeks of {index[h]}")
    return out, Fill(name, f"same hour of the nearest week with data (<= {weeks_back} weeks)",
                     tuple(int(h) for h in missing))


def layout_series(values, name: str) -> np.ndarray:
    """A TYNDP layout series (hour 1..8 760 of a table, in hour order) as an array; any other
    length is an error here, not a silent truncation (R-TIME-6)."""
    a = np.asarray(values, dtype=float)
    if a.shape != (LAYOUT_HOURS,):
        raise ValueError(f"{name}: {a.shape[0]} hours, expected {LAYOUT_HOURS}")
    if not np.isfinite(a).all():
        raise ValueError(f"{name}: non-finite values")
    return a


# the TYNDP 2024 runs whose week follows the Baltic demand's a day late (ERRATA E-136, D-103)
TYNDP_LATE = {("DE", 2040), ("GA", 2040)}


def tyndp_price_to_layout(values, name: str, late: bool = False) -> tuple[np.ndarray, Fill]:
    """TYNDP 2024 market-model prices cover 8 736 hours (52 weeks from Monday 1 January). The
    layout's last day (hours 8 737-8 760, a Monday) is filled with the last Monday the file
    holds (hours 8 569-8 592), which keeps the weekday of the fill (PLAN O-7, DECISIONS D-013).
    A run whose week is a day late (`late`, D-103) is first moved a day earlier, its first day to
    the end of the 52 weeks, so that its days and the copied Monday are the layout's."""
    a = np.asarray(values, dtype=float)
    if a.shape != (TYNDP_PRICE_HOURS,):
        raise ValueError(f"{name}: {a.shape[0]} hours, expected {TYNDP_PRICE_HOURS}")
    if not np.isfinite(a).all():
        raise ValueError(f"{name}: non-finite values")
    rule, first = "hours 8737-8760 copied from hours 8569-8592 (the last Monday)", TYNDP_PRICE_HOURS
    if late:
        a = np.concatenate([a[24:], a[:24]])
        rule, first = "moved a day earlier, its first day to hours 8713-8736 (D-103); " + rule, \
            TYNDP_PRICE_HOURS - 24
    tail = a[TYNDP_PRICE_HOURS - 7 * 24:TYNDP_PRICE_HOURS - 6 * 24]      # hours 8 569-8 592
    out = np.concatenate([a, tail])
    return out, Fill(name, rule, tuple(range(first, LAYOUT_HOURS)))


def drop_feb29(index: pd.DatetimeIndex) -> np.ndarray:
    """Boolean mask that keeps every hour of `index` except 29 February: how a calendar-year
    series (ERA5 temperature of a climate year) meets the 8 760-hour layout."""
    return ~((index.month == 2) & (index.day == 29))


def weekly_sums(hourly: np.ndarray) -> np.ndarray:
    """Sum an hourly series into UTC weeks of 168 h (the last one short)."""
    n = weeks(len(hourly))
    pad = np.zeros(n * 168)
    pad[:len(hourly)] = hourly
    return pad.reshape(n, 168).sum(axis=1)


def weekly_min(hourly: np.ndarray) -> np.ndarray:
    """The minimum of an hourly series in each UTC week of 168 h (the last one short)."""
    n = weeks(len(hourly))
    pad = np.full(n * 168, np.inf)
    pad[:len(hourly)] = hourly
    return pad.reshape(n, 168).min(axis=1)


def weekly_max(hourly: np.ndarray) -> np.ndarray:
    """The maximum of an hourly series in each UTC week of 168 h (the last one short)."""
    n = weeks(len(hourly))
    pad = np.full(n * 168, -np.inf)
    pad[:len(hourly)] = hourly
    return pad.reshape(n, 168).max(axis=1)


def weekly_quantile(hourly: np.ndarray, q: float) -> np.ndarray:
    """The q-quantile of an hourly series in each UTC week of 168 h (the last one short): the
    value at the nearest rank, q·(n − 1) rounded half up, of the week's sorted hours."""
    n = weeks(len(hourly))
    out = np.empty(n)
    for w in range(n):
        a = np.sort(np.asarray(hourly[w * 168:(w + 1) * 168], dtype=float))
        out[w] = a[int(np.floor(q * (len(a) - 1) + 0.5))]
    return out


def daily_to_weekly(daily: np.ndarray) -> np.ndarray:
    """Sum 365 daily values into the 53 layout weeks (7, 7, …, 7, 1 days)."""
    d = np.asarray(daily, dtype=float)
    if d.shape != (365,):
        raise ValueError(f"expected 365 days, got {d.shape[0]}")
    pad = np.zeros(53 * 7)
    pad[:365] = d
    return pad.reshape(53, 7).sum(axis=1)

