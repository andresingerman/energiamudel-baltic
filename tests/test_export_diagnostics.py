"""The diagnostics PLAN §3.1 and M1 promised, over the committed export (the audit of the night
of 2026-10-08): TYNDP 2024's price profiles keep the layout's weekdays, and the EstLink capacity
A31 gives agrees with Fingrid's datasets 112/115 (R-LINK-2, R-DATA-11)."""

from __future__ import annotations

import pytest

from export import write
from pipeline import DATA_DIR

OUT = DATA_DIR / "export"
PROFILES = ("DE_2035", "GA_2035", "DE_2040", "GA_2040", "DE_2050", "GA_2050", "NT_2030", "NT_2040")
LAYOUT_DAYS = 364  # the layout's last day is a copy of its last Monday (axis.py)


def _by_weekday(a: list[float]) -> list[float]:
    """The average of each weekday, 0 = the layout's Monday."""
    s, n = [0.0] * 7, [0] * 7
    for h, v in enumerate(a[: LAYOUT_DAYS * 24]):
        s[(h // 24) % 7] += v
        n[(h // 24) % 7] += 1
    return [s[i] / n[i] for i in range(7)]


def _corr(a: list[float], b: list[float]) -> float:
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    num = sum((x - ma) * (y - mb) for x, y in zip(a, b, strict=True))
    den = (sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b)) ** 0.5
    return num / den


def _shifts() -> dict[tuple[str, str, str], int]:
    """(climate year, profile, zone) -> the shift in days at which the profile's week best follows
    the Baltic demand's, for every series with a clear week (r ≥ 0.5 there)."""
    out = {}
    for key in ("cy1995", "cy2008", "cy2009"):
        y = write.read(OUT / "years" / f"{key}.json.gz")
        dem = [sum(v) / 3 for v in zip(*(_by_weekday(y["zones"][z]["demand"]["nt_profile"]["2030"])
                                         for z in ("EE", "LV", "LT")), strict=True)]
        for zone, profiles in y["boundary"].items():
            for prof in PROFILES:
                if prof not in profiles:
                    continue
                p = _by_weekday(profiles[prof])
                r = {k: _corr([p[(d + k) % 7] for d in range(7)], dem) for k in (-1, 0, 1)}
                best = max(r, key=lambda k: r[k])
                if r[best] >= 0.5:
                    out[key, prof, zone] = best
    return out


def test_tyndp_price_profiles_keep_the_layouts_weekdays():
    s = _shifts()
    assert len(s) >= 30
    assert sorted(k for k, d in s.items() if d != 0 and not k[1].endswith("_2040")) == []


def test_tyndp_2040_price_profiles_keep_the_layouts_weekdays_too():
    """E-136, D-103: moved a day earlier in the export."""
    assert sorted(k for k, d in _shifts().items() if d != 0 and k[1].endswith("_2040")) == []


def test_the_baltic_demand_of_every_scenario_year_is_lowest_on_the_layouts_weekend():
    """The layout's day 0 is a Monday (D-013): in every climate year (TYNDP 2024) and weather
    scenario (TYNDP 2026) the Baltic demand is lowest on its Saturday and Sunday — what a calendar
    slip in a package would break. The neighbours' prices are checked above; TYNDP 2026's carry
    too little week beside their scarcity hours to test (the night of 2026-10-09)."""
    files = sorted((OUT / "years").glob("[cw][ys]*.json.gz"))
    assert len(files) >= 15                                  # three climate years, twelve scenarios
    for f in files:
        y = write.read(f)
        if y["meta"]["kind"] == "climate":
            series = [y["zones"][z]["demand"]["nt_profile"]["2030"] for z in ("EE", "LV", "LT")]
        else:
            t = next(iter(y["boundary"]["FI"])).split("_")[1]
            series = [y["zones"][z]["demand"]["market"][t] for z in ("EE", "LV", "LT")]
        week = [sum(v) for v in zip(*(_by_weekday(a) for a in series), strict=True)]
        assert set(sorted(range(7), key=week.__getitem__)[:2]) == {5, 6}, f.name


@pytest.mark.parametrize("year", [2023, 2024, 2025, 2026])
def test_a31_estlink_capacity_agrees_with_fingrids(year):
    """Observed: at most 1.0 % of the hours more than 10 MW apart, the averages within 5.8 MW —
    over the hours Fingrid published, which end on 29 September 2026 (ERRATA E-195)."""
    y = write.read(OUT / "years" / f"{year}.json.gz")
    v = write.read(OUT / "validation" / f"{year}.json.gz")
    for key, fingrid in (("ntc_fwd", "fingrid_da_cap_ee_fi_mw"),
                         ("ntc_rev", "fingrid_da_cap_fi_ee_mw")):
        a, f = y["borders"]["EE-FI"][key], v["estlink"][fingrid]
        assert len(a) == y["meta"]["hours"]
        # Fingrid's series ends with September 2026 at the latest (6 528 h; E-195)
        assert len(f) == len(a) or (year == 2026 and len(f) <= 6528)
        a = a[:len(f)]
        apart = sum(abs(x - z) > 10 for x, z in zip(a, f, strict=True))
        assert apart <= 0.02 * len(a), (key, apart)
        assert abs(sum(a) - sum(f)) / len(a) <= 10, key
