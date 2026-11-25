"""An observed year exported end to end from a synthetic database (PLAN §4 M1): the contract
holds, no core price leaks in (R-BND-3), gaps are filled only by the documented rules."""

import json

import numpy as np
import pandas as pd
import pytest

from db import build, connect
from export import axis, check, tables, years
from pipeline import ROOT

YEAR = 2025
IDX = pd.date_range(f"{YEAR}-01-01", f"{YEAR + 1}-01-01", freq="h", inclusive="left")
H = len(IDX)


def _lineage(con, ids):
    con.executemany("INSERT INTO lineage (dataset, source, endpoint, params, fetched_at, licence) "
                    "VALUES (?, 's', 'e', '{}', '2026-09-25 00:00:00', 'open')",
                    [(i,) for i in ids])


def _hourly(value, ts=IDX, **cols):
    return pd.DataFrame({"ts": ts, **cols, "mw": value})


@pytest.fixture
def con():
    c = connect(":memory:")
    build.load_vocabulary(c)
    _lineage(c, ["t.load", "t.gen", "t.price", "t.ntc", "t.w", "t.cap", "t.com", "t.res",
                 "t.cb", "t.param", "t.jao"])
    rng = np.random.default_rng(1)
    for z in ("EE", "LV", "LT"):
        build._upsert(c, "load", _hourly(1000 + rng.random(H), zone=z, lineage_id="t.load"))
        for tech in ("wind_onshore", "solar", "gas", "battery"):
            build._upsert(c, "generation", _hourly(rng.random(H) * 100, zone=z, tech=tech,
                                                   lineage_id="t.gen"))
        build._upsert(c, "capacity", pd.DataFrame({"zone": [z], "tech": ["wind_onshore"],
                                                   "year": [YEAR], "mw": [300.0],
                                                   "lineage_id": ["t.cap"]}))
        w = pd.DataFrame({"zone": z, "ts": IDX, "temperature_c": 5.0, "wind_ms": 1.0,
                          "radiation_wm2": 0.0, "lineage_id": "t.w"})
        build._upsert(c, "weather", w)
        start = IDX[IDX >= pd.Timestamp("2025-02-04 23:00")]
        for prod, direction in years.RESERVES:
            build._upsert(c, "reserve_procured", _hourly(10.0, ts=start, zone=z, product=prod,
                                                         direction=direction,
                                                         lineage_id="t.res"))
    build._upsert(c, "generation", _hourly(50.0, zone="LV", tech="hydro_ror", lineage_id="t.gen"))
    build._upsert(c, "generation", _hourly(20.0, zone="LT", tech="hydro_ps", lineage_id="t.gen"))
    for z in ("EE", "LV", "LT", "FI", "SE4", "PL"):
        build._upsert(c, "price", pd.DataFrame({"zone": z, "ts": IDX, "eur_mwh": 50.0,
                                                "lineage_id": "t.price"}))
    for b in years.BORDERS:
        for d in ("fwd", "rev"):
            keep = IDX if b != "LT-SE4" else IDX.delete(slice(2000, 2030))   # a 30-hour gap
            build._upsert(c, "ntc", _hourly(700.0, ts=keep, border=b, direction=d,
                                            lineage_id="t.ntc"))
    build._upsert(c, "balancing_cb", _hourly(30.0, ts=IDX[IDX >= "2025-02-05"], border="EE-LV",
                                            direction="fwd", product="mFRR", lineage_id="t.cb"))
    build._upsert(c, "balancing_cb", _hourly(40.0, ts=IDX[IDX >= "2025-02-05"], border="LV-LT",
                                            direction="fwd", product="mFRR", lineage_id="t.cb"))
    months = pd.date_range(f"{YEAR}-01-01", periods=12, freq="MS").date
    for com, v, unit in (("gas_ttf", 12.0, "USD/mmbtu"), ("eua", 70.0, "EUR/tCO2"),
                         ("usd_per_eur", 1.1, "USD/EUR")):
        build._upsert(c, "commodity", pd.DataFrame({"commodity": com, "ts": months, "price": v,
                                                    "unit": unit, "lineage_id": "t.com"}))
    # ten hours in which the network's constraints put NordBalt's Swedish hub 3 EUR/MWh above SE4
    build._upsert(c, "jao_series", pd.DataFrame({"endpoint": "fbDomainShadowPrice",
                                                 "field": "spread_SE4_NB", "ts": IDX[100:110],
                                                 "value": 3.0, "lineage_id": "t.jao"}))
    # ... and Poland's import limit put its cables' price 7 EUR/MWh below Poland's (D-076)
    build._upsert(c, "jao_series", pd.DataFrame({"endpoint": "shadowPrices",
                                                 "field": "spread_PL", "ts": IDX[100:110],
                                                 "value": -7.0, "lineage_id": "t.jao"}))
    build._upsert(c, "parameter", pd.DataFrame({"key": ["unit.j_per_btu_it"], "value": [1055.056],
                                                "unit": ["J"], "lineage_id": ["t.param"]}))
    yield c
    c.close()


def test_observed_year_meets_the_contract(con):
    import jsonschema
    obj, lin, fills = years.observed(con, YEAR, tables.parameters(con))
    schema = json.loads((ROOT / "schema" / "year.schema.json").read_text())
    jsonschema.validate(obj, schema)
    assert check.year_problems(obj) == []
    assert obj["meta"]["hours"] == H and obj["meta"]["complete"]
    # only given output reaches the engine: wind and solar, not gas or batteries (R-SUP-2)
    assert set(obj["zones"]["EE"]["gen"]) == {"wind_onshore", "solar"}
    assert "hydro_ror" not in obj["zones"]["LV"]["gen"]            # the Daugava runs weekly
    assert len(obj["zones"]["LV"]["hydro_weekly_mwh"]["daugava"]) == 53
    assert obj["zones"]["LV"]["hydro_weekly_mwh"]["daugava"][0] == 50 * 168
    # the cascade's observed weekly minimum and maximum bound its release in the replay (D-042)
    assert obj["zones"]["LV"]["hydro_weekly_min_mw"]["daugava"][0] == 50
    assert obj["zones"]["LV"]["hydro_weekly_max_mw"]["daugava"] == [50.0] * 53
    assert obj["zones"]["LV"]["hydro_weekly_p10_mw"]["daugava"] == [50.0] * 53   # D-044
    assert obj["zones"]["LV"]["hydro_weekly_p90_mw"]["daugava"] == [50.0] * 53
    # what a replay holds a plant to beside its weekly maximum (D-073): a thermal technology's
    # 10th-percentile hour of the week as its least output, Kruonis's weekly maximum as its power
    gas = obj["zones"]["EE"]["thermal_weekly_p10_mw"]["gas"]
    top = obj["zones"]["EE"]["thermal_weekly_max_mw"]["gas"]
    assert len(gas) == 53 and all(0 <= lo <= hi for lo, hi in zip(gas, top, strict=True))
    assert 5 < gas[0] < 15                                         # uniform on 0-100 MW
    assert obj["zones"]["LT"]["hydro_weekly_max_mw"]["kruonis"] == [20.0] * 53
    # the price at NordBalt's Nordic end is the virtual hub's where JAO gives its spread (D-075)
    se4 = obj["boundary"]["SE4"]["observed"]
    assert se4[99] == 50 and se4[100] == 53 and se4[109] == 53 and se4[110] == 50
    assert set(obj["boundary"]["FI"]["observed"]) == {50}
    pl = obj["boundary"]["PL"]["observed"]
    assert pl[99] == 50 and pl[100] == 43 and pl[110] == 50
    assert "t.jao" in lin.map["boundary.SE4.observed"]
    assert "t.jao" not in lin.map["boundary.FI.observed"]
    assert any(n.startswith("boundary.SE4.observed: from 2025-01-05 04:00 UTC")
               for n in obj["meta"]["notes"])
    # the balancing allocation is taken off EE-LV's capacity and not off LV-LT's, whose A31 is
    # already without it (R-LINK-5, D-077)
    assert max(obj["borders"]["EE-LV"]["reserved_fwd"]) == 30
    assert "reserved_fwd" not in obj["borders"]["LV-LT"]
    # reserves are 0 before the market opened (PLAN O-2)
    r0 = obj["meta"]["reserve_start_hour"]
    assert r0 == 34 * 24 + 23                                      # 2025-02-04 23:00 UTC
    assert obj["zones"]["EE"]["reserve"]["mFRR_up"][r0 - 1] == 0
    assert obj["zones"]["EE"]["reserve"]["mFRR_up"][r0] == 10
    # the NTC gap took the same hours of the week before
    gap = [f for f in fills if f.series == "borders.LT-SE4.ntc_fwd"]
    assert len(gap) == 1 and len(gap[0].hours) == 30
    # gas: 12 USD/mmbtu at 1.1 USD/EUR = 37.2 EUR/MWh thermal
    assert obj["fuel"]["gas_eur_mwh_th"][0] == pytest.approx(12 / 1.1 / 0.2930711, abs=0.01)
    for path, _ in check._arrays({k: obj[k] for k in ("zones", "boundary", "borders", "fuel")}):
        assert check.covered(path, lin.as_json()), path


def test_the_last_year_and_its_hours_come_from_the_data_not_the_clock(con):
    """H1 of the review (2026-10-18): the export's span read off the clock failed every January."""
    assert years.last_observed_year(con) == YEAR
    assert years.observed_hours(con, YEAR) == H
    nxt = pd.date_range(f"{YEAR + 1}-01-01", periods=48, freq="h")
    for z in ("EE", "LV", "LT"):        # the new year's load alone: no whole day of every series
        build._upsert(con, "load", _hourly(1000.0, ts=nxt[:30], zone=z, lineage_id="t.load"))
    assert years.last_observed_year(con) == YEAR
    for z in ("EE", "LV", "LT"):
        build._upsert(con, "load", _hourly(1000.0, ts=nxt, zone=z, lineage_id="t.load"))
        build._upsert(con, "generation", _hourly(10.0, ts=nxt, zone=z, tech="gas",
                                                 lineage_id="t.gen"))
    for z in ("FI", "SE4", "PL"):
        build._upsert(con, "price", pd.DataFrame({"zone": z, "ts": nxt, "eur_mwh": 50.0,
                                                  "lineage_id": "t.price"}))
    assert years.last_observed_year(con) == YEAR + 1
    assert years.observed_hours(con, YEAR + 1) == 48
    assert years.observed_hours(con, YEAR) == H     # over: whole, whatever its own series reach


def test_a_balancing_allocation_missing_an_hour_after_its_first_is_a_reported_zero(con):
    """L4 of the review (2026-10-18): the allocation's gaps became 0 without a word."""
    lin, fills = years.Lineage(), list[axis.Fill]()
    whole = years._reserved(con, "EE-LV", "fwd", IDX, "borders.EE-LV.reserved_fwd", lin, fills)
    assert whole is not None and fills == []          # before its first hour: 0, nothing to report
    con.execute("DELETE FROM balancing_cb WHERE border='EE-LV' AND ts >= ? AND ts < ?",
                [IDX[5000], IDX[5003]])
    a = years._reserved(con, "EE-LV", "fwd", IDX, "borders.EE-LV.reserved_fwd", lin, fills)
    assert a is not None and [f.hours for f in fills] == [(5000, 5001, 5002)]


def test_no_core_price_can_reach_a_year_file(con):
    obj, _, _ = years.observed(con, YEAR, tables.parameters(con))
    assert set(obj["boundary"]) == {"FI", "SE4", "PL"}
    obj["zones"]["EE"]["price"] = [1.0] * H
    assert any("R-BND-3" in p for p in check.year_problems(obj))


def test_validation_file_holds_what_the_engine_must_not_see(con):
    val, lin = years.validation_observed(con, YEAR, H)
    assert set(val["price"]) == {"EE", "LV", "LT"} and "battery" in val["gen"]["EE"]
    assert "validation.price.EE" in lin.as_json()


def test_oil_shale_premium_lifts_each_class_to_its_entry_price(con):
    """R-SUP-4: at the 2024 average EUA price a class's cost plus its premium is its entry price."""
    _lineage(con, ["eex.test"])
    con.execute("DELETE FROM commodity WHERE commodity = 'eua'")
    con.execute("INSERT INTO commodity (commodity, ts, price, unit, lineage_id) VALUES "
                "('eua', '2024-03-15', 60.0, 'EUR/t', 'eex.test'), "
                "('eua', '2024-09-15', 70.0, 'EUR/t', 'eex.test')")
    row = lambda v: {"value": v, "unit": "x", "src": ["doc.t"]}  # noqa: E731
    tech = {f"oil_shale_classes|{c}": {"efficiency": row(eff), "co2_factor": row(100),
                                       "vom": row(3.3), "market_entry_price": row(entry)}
            for c, eff, entry in (("oil_shale_auvere", 0.39, 90), ("oil_shale_cfb", 0.34, 110),
                                  ("oil_shale_pf", 0.29, 200))}
    fuel = {"svk_lma_2026": {"2030": {"oil_shale": row(10.0)}}}
    out = tables.oil_shale(con, tech, fuel)
    assert out["eua_reference_eur_t"]["value"] == 65.0
    for c, eff, entry in (("oil_shale_auvere", 0.39, 90), ("oil_shale_cfb", 0.34, 110),
                          ("oil_shale_pf", 0.29, 200)):
        cost = 10 / eff + 65 * 100 * 3.6 / 1000 / eff + 3.3
        assert out[c]["value"] == pytest.approx(entry - cost, abs=1e-4)
        assert "eex.test" in out[c]["src"]


def test_daugava_inflow_factor_is_the_record_over_tyndp_in_the_years_both_cover(con):
    """D-070: None without TYNDP 2024's inflow; the average ratio over full years of the record."""
    assert years.daugava_inflow_factor(con) is None
    _lineage(con, ["t.hyd"])
    # two climate years of inflow, 100 GWh a week; the record (50 MW all year) covers YEAR alone
    rows = [{"zone": "LV", "target_year": 2030, "category": "pondage", "variable": "INFLOW",
             "climate_year": cy, "week": w, "value": 100.0, "lineage_id": "t.hyd"}
            for cy in (YEAR, YEAR - 1) for w in range(1, 3)]
    build._upsert(con, "hydro_inflow", pd.DataFrame(rows))
    got = years.daugava_inflow_factor(con)
    assert got is not None
    factor, ids, ratios = got
    assert list(ratios) == [YEAR] and ids == ["t.gen", "t.hyd"]
    assert factor == round(50.0 * H / 200_000, 2)
    # no climate year in common with the record: no factor can be derived, and that is an error
    con.execute("DELETE FROM hydro_inflow WHERE climate_year = ?", [YEAR])
    with pytest.raises(ValueError, match="cannot be derived"):
        years.daugava_inflow_factor(con)


def test_daugava_band_reads_the_two_ratios_off_the_record_by_thirds_of_the_weeks_mean(con):
    """D-071: the fixture's cascade runs flat at 50 MW, so every week's band is its average."""
    years.BAND_YEARS, keep = range(YEAR, YEAR + 1), years.BAND_YEARS
    try:
        band = years.daugava_band(con)
    finally:
        years.BAND_YEARS = keep
    assert band is not None
    assert band["weeks"] == 52 and band["years"] == [YEAR, YEAR] and band["src"] == ["t.gen"]
    assert band["bins"] == [{"up_to_mw": 50, "p10": 1.0, "p90": 1.0}] * 3


def test_a_forced_outage_holds_the_hours_a31_does_not_publish_planned_ones_do_not(con):
    """ERRATA E-073, D-091: inside the fixture's 30-hour gap of LT-SE4 a forced outage at 0 MW
    closes ten hours that last week's value would open; a planned record at 0 MW, which can
    outlive cancelled work, leaves its hours to the weekly rule."""
    _lineage(con, ["t.a78"])
    ev = pd.DataFrame({
        "id": ["f.rev", "p.rev"], "kind": "transmission", "asset": "NordBalt", "zone": None,
        "border": "LT-SE4", "direction": "rev",
        "start_ts": [IDX[2010] + pd.Timedelta(minutes=30), IDX[2020]],
        "end_ts": [IDX[2019] + pd.Timedelta(minutes=20), IDX[2026]],
        "mw_available": 0.0, "mw_nominal": None, "planned": [False, True], "reason": None,
        "lineage_id": "t.a78"})
    build._upsert(con, "unavailability", ev)
    lin, fills = years.Lineage(), list[axis.Fill]()
    a = years._ntc(con, "LT-SE4", "rev", IDX, "borders.LT-SE4.ntc_rev", lin, fills)
    assert (a[2000:2010] == 700).all() and (a[2010:2020] == 0).all() and (a[2020:2030] == 700).all()
    held = [f for f in fills if "A78" in f.rule]
    assert len(held) == 1 and held[0].hours == tuple(range(2010, 2020))
    fwd = years._ntc(con, "LT-SE4", "fwd", IDX, "borders.LT-SE4.ntc_fwd", years.Lineage(), [])
    assert (fwd[2000:2030] == 700).all()                     # the other direction has no event


def test_a_months_mean_price_does_not_depend_on_the_order_of_its_rows(con):
    """ERRATA E-060: four auction prices whose average, 50.225, sits on a rounding edge; summed in
    the order they were inserted the database's avg() gives 50.23 one way round and 50.22 the
    other."""
    params = {"unit.j_per_btu_it": {"value": 1055.056, "lineage_id": "t.param"}}
    xs = [32.85, 55.82, 42.75, 69.48]
    got = []
    for order in (xs, xs[::-1]):
        con.execute(f"DELETE FROM commodity WHERE commodity = 'eua' AND ts < '{YEAR}-02-01'")
        con.executemany("INSERT INTO commodity (commodity, ts, price, unit, lineage_id) VALUES "
                        "('eua', ?, ?, 'EUR/tCO2', 't.com')",
                        [(f"{YEAR}-01-{d:02d}", x) for d, x in enumerate(order, start=1)])
        got.append(years._fuel(con, YEAR, [1], years.Lineage(), params)["eua_eur_t"])
    assert got[0] == got[1] == [50.22]


def test_a_held_hour_names_the_outage_that_holds_it_and_no_other(con):
    """ERRATA E-084: a forced event in hours A31 publishes holds nothing and is not a source."""
    _lineage(con, ["t.a78.mar", "t.a78.jul"])
    ev = pd.DataFrame({
        "id": ["in.gap", "published"], "kind": "transmission", "asset": "NordBalt", "zone": None,
        "border": "LT-SE4", "direction": "rev", "start_ts": [IDX[2010], IDX[5000]],
        "end_ts": [IDX[2020], IDX[5010]], "mw_available": 0.0, "mw_nominal": None,
        "planned": False, "reason": None, "lineage_id": ["t.a78.mar", "t.a78.jul"]})
    build._upsert(con, "unavailability", ev)
    lin = years.Lineage()
    a = years._ntc(con, "LT-SE4", "rev", IDX, "borders.LT-SE4.ntc_rev", lin, [])
    assert (a[2010:2020] == 0).all() and (a[5000:5010] == 700).all()
    assert "t.a78.mar" in lin.map["borders.LT-SE4.ntc_rev"]
    assert "t.a78.jul" not in lin.map["borders.LT-SE4.ntc_rev"]


def test_no_co2_price_in_the_entry_year_says_so(con):
    """ERRATA E-085: over no rows the query's list is missing; the message names the year."""
    con.execute("DELETE FROM commodity WHERE commodity = 'eua'")
    with pytest.raises(ValueError, match="no EUA prices in 2024"):
        tables.oil_shale(con, {}, {})


def test_a_year_from_its_first_monday_moves_its_fills_with_it():
    """D-100: 2025 began on a Wednesday; its series starts five days in, and a fill recorded on
    its first hours moves to the end of the layout's year with them."""
    a = np.arange(8760.0)
    f = axis.Fill("s", "rule", (0, 1, 130))
    b, (g,) = years._from_first_monday(a, pd.Timestamp("2025-01-01"), [f])
    assert b[0] == 120 and b[-1] == 119 and len(b) == 8760
    assert g.hours == (10, 8640, 8641) and (g.series, g.rule) == ("s", "rule")
    c, _ = years._from_first_monday(a, pd.Timestamp("2018-01-01"), [])    # a Monday: unchanged
    assert (c == a).all()


def test_the_ranks_read_the_peak_at_2009s_energy_and_the_unrounded_factors():
    """E-117: a year's demand peak is its shape's at 2009's annual energy, not as profiled;
    E-118: the ranks come from the unrounded values, so two factors equal at three decimals
    still rank apart."""
    con = connect(":memory:")
    build.load_vocabulary(con)
    _lineage(con, ["t"])
    for cy, cf in ((2008, 0.3004), (2009, 0.3001)):
        for tech in ("wind_onshore", "solar"):
            con.execute("INSERT INTO pecd_profile VALUES ('EE', ?, 2030, ?, 1, ?, 't')",
                        [tech, cy, cf])
    # 2008: a high peak in a big year (300 of 600, a flat shape); 2009: a lower peak, a sharper one
    for cy, mws in ((2008, (300.0, 300.0)), (2009, (90.0, 110.0))):
        for h, mw in enumerate(mws, 1):
            con.execute("INSERT INTO demand_profile VALUES "
                        "('EE', 'national_trends', 2030, ?, ?, ?, 't')", [cy, h, mw])
    r = years.ranks(con)
    assert (r[2008]["ee_demand_peak_mw"], r[2009]["ee_demand_peak_mw"]) == (100, 110)
    assert (r[2008]["ee_demand_peak_rank"], r[2009]["ee_demand_peak_rank"]) == (1, 2)
    assert r[2008]["ee_wind_onshore_cf"] == r[2009]["ee_wind_onshore_cf"] == 0.3
    assert (r[2008]["ee_wind_onshore_rank"], r[2009]["ee_wind_onshore_rank"]) == (2, 1)


def test_asts_reserve_battery_and_its_reserve_leave_the_observed_latvian_fleet():
    """D-102 (R-STO-8): AST's 80 MW leaves A68's Latvian batteries, its 8 MW of FCR and 32 of aFRR
    the procured reserve the fleet holds, floored at 0; the parameters' lineage goes with them."""
    p = {"tso.ast_battery.mw": {"value": 80.0, "lineage_id": "doc.specification.r-sto-8"},
         "tso.ast_battery.fcr_mw": {"value": 8.0, "lineage_id": "doc.specification.r-sto-8"},
         "tso.ast_battery.afrr_mw": {"value": 32.0, "lineage_id": "doc.specification.r-sto-8"}}
    def run(year):
        zone = {"capacity": {"battery": 90}}
        res = {"FCR_sym": [17.0, 5.0], "aFRR_up": [60.0, 20.0], "mFRR_up": [100.0, 100.0]}
        lin = years.Lineage()
        years._without_ast(zone, res, p, lin, year)
        return zone, res, lin.as_json()

    zone, res, lin = run(2026)
    assert zone["capacity"]["battery"] == 10
    assert res == {"FCR_sym": [9.0, 0.0], "aFRR_up": [28.0, 0.0], "mFRR_up": [100.0, 100.0]}
    assert lin["zones.LV.capacity.battery"] == ["doc.specification.r-sto-8"]
    assert lin["zones.LV.reserve.aFRR_up"] == ["doc.specification.r-sto-8"]
    # R-STO-8 holds it in reserve to 2028: a later observed year keeps A68's figure whole
    zone, res, lin = run(2029)
    assert zone["capacity"]["battery"] == 90 and res["FCR_sym"] == [17.0, 5.0] and lin == {}


def test_reserved_counts_frr_only_without_its_parts():
    """ERRATA E-199: BTD's «FRR» is aFRR + mFRR; an hour with the two counts them alone, an hour
    with FRR alone counts FRR."""
    import duckdb
    db = duckdb.connect()
    db.execute("CREATE TABLE balancing_cb (border VARCHAR, direction VARCHAR, ts TIMESTAMP, "
               "product VARCHAR, mw DOUBLE, lineage_id VARCHAR)")
    t0, t1 = pd.Timestamp("2026-10-08 00:00"), pd.Timestamp("2026-10-08 01:00")
    db.executemany("INSERT INTO balancing_cb VALUES ('EE-LV', 'fwd', ?, ?, ?, 'btd')",
                   [(t0, "aFRR", 30.0), (t0, "mFRR", 250.0), (t0, "FRR", 280.0),
                    (t1, "FRR", 270.0)])
    idx = pd.DatetimeIndex([t0, t1])
    got = years._reserved(db, "EE-LV", "fwd", idx, "reserved", years.Lineage(), [])
    assert [round(x) for x in got] == [280, 270]
