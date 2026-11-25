"""The schema must load, accept the vocabulary, enforce its keys, and round-trip a fetch."""

from datetime import datetime

import pandas as pd
import pytest

from db import build, connect
from pipeline import DATA_DIR, lineage
from pipeline.config import BORDERS, TECHS, ZONES


@pytest.fixture
def con():
    c = connect(":memory:")
    build.load_vocabulary(c)
    yield c
    c.close()


def test_schema_creates_every_table(con):
    """Every table db/check.py counts exists after the schema runs (ERRATA E-025)."""
    from db.check import TABLES
    tables = {r[0] for r in con.execute("SHOW TABLES").fetchall()}
    for t in TABLES + ("loaded_archive", "schema_version"):
        assert t in tables, t


def test_vocabulary_matches_config(con):
    assert con.execute("SELECT count(*) FROM zone").fetchone()[0] == len(ZONES)
    assert con.execute("SELECT count(*) FROM tech").fetchone()[0] == len(TECHS)
    assert con.execute("SELECT count(*) FROM border").fetchone()[0] == len(BORDERS)
    assert con.execute(
        "SELECT count(*) FROM border WHERE internal").fetchone()[0] == 2


def test_fact_row_requires_lineage(con):
    with pytest.raises(Exception, match="lineage|Constraint|foreign key"):
        con.execute("INSERT INTO price VALUES ('EE', '2025-01-01 00:00', 50.0, 'missing.record')")


def test_a44_loader_end_to_end(con, tmp_path, monkeypatch):
    """Raw XML -> parse -> hourly -> price table, with the lineage row present."""
    monkeypatch.setenv("ENERGIAMUDEL_LINEAGE", str(tmp_path / "lineage"))
    xml = b"""<?xml version="1.0"?>
<Publication_MarketDocument xmlns="urn:iec62325.351:tc57wg16:451-3:publicationdocument:7:3">
  <TimeSeries><in_Domain.mRID>10Y1001A1001A39I</in_Domain.mRID><curveType>A01</curveType>
  <Period><timeInterval><start>2025-01-01T00:00Z</start><end>2025-01-01T02:00Z</end></timeInterval>
  <resolution>PT60M</resolution>
  <Point><position>1</position><price.amount>41.5</price.amount></Point>
  <Point><position>2</position><price.amount>39.0</price.amount></Point>
  </Period></TimeSeries></Publication_MarketDocument>"""
    raw = tmp_path / "entsoe.A44.EE.2025-01.xml"
    raw.write_bytes(xml)
    ds = raw.stem
    lineage.measured(ds, "ENTSO-E", "https://x", {"documentType": "A44"}, xml, "terms").write()
    build.load_lineage(con)
    n = build.load_entsoe_a44(con, raw, ds, "EE")
    assert n == 2
    rows = con.execute("SELECT zone, ts, eur_mwh, lineage_id FROM price ORDER BY ts").fetchall()
    assert rows[0] == ("EE", datetime(2025, 1, 1, 0, 0), 41.5, ds)
    assert rows[1][2] == 39.0
    # rerunning the loader is idempotent
    assert build.load_entsoe_a44(con, raw, ds, "EE") == 2
    assert con.execute("SELECT count(*) FROM price").fetchone()[0] == 2
    # a row the file (or a corrected parser) no longer yields leaves the table (ERRATA E-083)
    second = b"<Point><position>2</position><price.amount>39.0</price.amount></Point>"
    raw.write_bytes(xml.replace(second, b""))
    assert build.load_entsoe_a44(con, raw, ds, "EE") == 1
    assert con.execute("SELECT count(*) FROM price").fetchone()[0] == 1


def test_flow_directions_net_to_view_and_reload_is_idempotent(con, tmp_path, monkeypatch):
    monkeypatch.setenv("ENERGIAMUDEL_LINEAGE", str(tmp_path / "lineage"))
    fwd, rev = "entsoe.A11.EE-FI.fwd.2025-01", "entsoe.A11.EE-FI.rev.2025-01"
    for ds in (fwd, rev):
        lineage.measured(ds, "ENTSO-E", "https://x", {}, b"x", "terms").write()
        (tmp_path / f"{ds}.xml").write_text("x")
    build.load_lineage(con)
    df = pd.DataFrame({"ts": [datetime(2025, 1, 1, 0)], "value": [300.0], "minutes": [60],
                       "psr_type": [None], "tech": [None],
                       "in_domain": [None], "out_domain": [None]})
    monkeypatch.setattr(build.entsoe, "parse",
                        lambda p: df if "fwd" in str(p) else df.assign(value=100.0))
    build.load_entsoe_a11(con, tmp_path / f"{fwd}.xml", fwd, "EE-FI", False)
    build.load_entsoe_a11(con, tmp_path / f"{rev}.xml", rev, "EE-FI", True)
    build.load_entsoe_a11(con, tmp_path / f"{fwd}.xml", fwd, "EE-FI", False)   # rerun
    assert con.execute("SELECT mw FROM v_flow_net").fetchone()[0] == 200.0


def test_annual_and_weekly_loaders_align_to_cet(con, tmp_path, monkeypatch):
    """A68's year comes from the dataset id, A72's week_start is the CET Monday."""
    monkeypatch.setenv("ENERGIAMUDEL_LINEAGE", str(tmp_path / "lineage"))
    a68, a72 = "entsoe.A68.FI.2025", "entsoe.A72.FI.2020-01"
    for ds in (a68, a72):
        lineage.measured(ds, "ENTSO-E", "https://x", {}, b"x", "terms").write()
    build.load_lineage(con)
    row = dict(minutes=525600, psr_type="B14", tech="nuclear", in_domain=None, out_domain=None)
    monkeypatch.setattr(build.entsoe, "parse", lambda p: pd.DataFrame(
        [{"ts": datetime(2024, 12, 31, 23), "value": 4364.0, **row}]))
    build.load_entsoe_a68(con, tmp_path / f"{a68}.xml", a68, "FI")
    assert con.execute("SELECT year, mw FROM capacity").fetchone() == (2025, 4364.0)
    monkeypatch.setattr(build.entsoe, "parse", lambda p: pd.DataFrame(
        [{"ts": datetime(2019, 12, 29, 23), "value": 3235000.0, **row}]))
    build.load_entsoe_a72(con, tmp_path / f"{a72}.xml", a72, "FI")
    wk, gwh = con.execute("SELECT week_start, gwh FROM reservoir").fetchone()
    assert (wk.isoformat(), gwh) == ("2019-12-30", 3235.0)
    # the Baltic zones' weeks start at Monday 00:00 EET, Sunday 22:00 UTC (21:00 in summer)
    for start in (datetime(2019, 12, 29, 22), datetime(2020, 6, 28, 21)):
        monkeypatch.setattr(build.entsoe, "parse", lambda p, start=start: pd.DataFrame(
            [{"ts": start, "value": 1000.0, **row}]))
        build.load_entsoe_a72(con, tmp_path / f"{a72}.xml", a72, "LV")
        # the file anew: no row of an earlier reading stays beside it (E-098)
        assert con.execute("SELECT dayname(week_start) FROM reservoir").fetchall() == [("Monday",)]


def test_a75_drops_pumping_consumption_series(con, tmp_path, monkeypatch):
    """Kruonis appears twice in A75: generation (inBiddingZone) and pumping (outBiddingZone)."""
    monkeypatch.setenv("ENERGIAMUDEL_LINEAGE", str(tmp_path / "lineage"))
    ds = "entsoe.A75.LT.2020-03"
    lineage.measured(ds, "ENTSO-E", "https://x", {}, b"x", "terms").write()
    build.load_lineage(con)
    xml = b"""<?xml version="1.0"?>
<GL_MarketDocument xmlns="urn:iec62325.351:tc57wg16:451-6:generationloaddocument:3:0">
  <TimeSeries><inBiddingZone_Domain.mRID>10YLT-1001A0008Q</inBiddingZone_Domain.mRID>
  <MktPSRType><psrType>B10</psrType></MktPSRType><Period>
  <timeInterval><start>2020-03-01T00:00Z</start><end>2020-03-01T01:00Z</end></timeInterval>
  <resolution>PT60M</resolution><Point><position>1</position><quantity>600</quantity></Point>
  </Period></TimeSeries>
  <TimeSeries><outBiddingZone_Domain.mRID>10YLT-1001A0008Q</outBiddingZone_Domain.mRID>
  <MktPSRType><psrType>B10</psrType></MktPSRType><Period>
  <timeInterval><start>2020-03-01T00:00Z</start><end>2020-03-01T01:00Z</end></timeInterval>
  <resolution>PT60M</resolution><Point><position>1</position><quantity>200</quantity></Point>
  </Period></TimeSeries></GL_MarketDocument>"""
    raw = tmp_path / f"{ds}.xml"
    raw.write_bytes(xml)
    assert build.load_entsoe_a75(con, raw, ds, "LT") == 1
    assert con.execute("SELECT tech, mw FROM generation").fetchall() == [("hydro_ps", 600.0)]


def test_outage_zip_loads_available_capacity(con, tmp_path, monkeypatch):
    import io
    import zipfile
    monkeypatch.setenv("ENERGIAMUDEL_LINEAGE", str(tmp_path / "lineage"))
    ds = "entsoe.A80.EE.2025-01"
    lineage.measured(ds, "ENTSO-E", "https://x", {}, b"x", "terms").write()
    build.load_lineage(con)
    xml = b"""<?xml version="1.0"?>
<Unavailability_MarketDocument xmlns="urn:iec62325.351:tc57wg16:451-6:outagedocument:3:0">
<mRID>doc1</mRID><type>A80</type>
<TimeSeries><businessType>A53</businessType>
<biddingZone_Domain.mRID>10Y1001A1001A39I</biddingZone_Domain.mRID>
<production_RegisteredResource.mRID>38W-KTJ-AUVERE-Z</production_RegisteredResource.mRID>
<production_RegisteredResource.pSRType.powerSystemResources.nominalP>270</production_RegisteredResource.pSRType.powerSystemResources.nominalP>
<Available_Period><timeInterval><start>2025-01-06T19:00Z</start><end>2025-01-07T06:00Z</end></timeInterval>
<resolution>PT1M</resolution>
<Point><position>1</position><quantity>180</quantity></Point>
<Point><position>61</position><quantity>100</quantity></Point>
</Available_Period></TimeSeries></Unavailability_MarketDocument>"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("001-event.xml", xml)
    raw = tmp_path / f"{ds}.zip"
    raw.write_bytes(buf.getvalue())
    assert build.load_entsoe_outage(con, raw, ds, "EE", "generation") == 2
    rows = con.execute("SELECT zone, start_ts, end_ts, mw_available, mw_nominal, planned "
                       "FROM unavailability ORDER BY start_ts").fetchall()
    assert rows[0] == ("EE", datetime(2025, 1, 6, 19), datetime(2025, 1, 6, 20), 180.0, 270.0, True)
    assert rows[1][1:4] == (datetime(2025, 1, 6, 20), datetime(2025, 1, 7, 6), 100.0)


def test_documentary_scenarios_load_with_page_lineage(con, tmp_path, monkeypatch):
    monkeypatch.setenv("ENERGIAMUDEL_LINEAGE", str(tmp_path / "lineage"))
    # rows extracted from fetched files point at those files' measured records
    for ds in ("eraa2025.dashboard_raw_data", "eraa2025.other_data", "tyndp2024.PEMMDB2",
               "entsoe.A68.EE.2026"):
        lineage.measured(ds, "x", "https://x", {}, b"x", "terms").write()
    n = build.load_documentary(con)
    assert n > 200
    row = con.execute("""SELECT a.value, a.unit, l.page, l.endpoint FROM scenario_assumption a
        JOIN lineage l ON l.dataset = a.lineage_id
        WHERE a.scenario = 'ast_a_2035' AND a.zone = 'LV' AND a.key = 'demand.twh'""").fetchone()
    assert row[0] == 8.95 and row[1] == "TWh" and row[2].startswith("p. 29-31")
    assert row[3].startswith("https://www.ast.lv/")
    assert build.load_documentary(con) == n          # idempotent
    lineage.measured("tyndp2024.Prices", "x", "https://x", {}, b"x", "terms").write()
    m = build.load_fuel_paths(con)
    assert m > 100
    eua = con.execute("""SELECT price, unit FROM scenario_fuel
        WHERE scenario = 'svk_lma_2026' AND year = 2040 AND commodity = 'eua'""").fetchone()
    assert eua == (145.6, "EUR/t")
    for ds in ("eraa2025.common_data", "tyndp2024.CO2-emission-factors-in-TYNDP2024-v2-xlsx",
               "catalogue.dea_el_dh_2025", "catalogue.dea_storage_2025",
               "catalogue.statfi_fuels_2025", "entsoe.A95.EE.2026"):
        lineage.measured(ds, "x", "https://x", {}, b"x", "terms").write()
    assert build.load_tech_parameters(con) > 600
    eff = con.execute("""SELECT value FROM tech_parameter WHERE source = 'eraa2025_common'
        AND tech_class = 'gas_ccgt_new' AND parameter = 'efficiency'""").fetchone()
    assert eff == (0.6,)
    for ds in ("eraa2025.ntcs", "tyndp2024.Line-data"):
        lineage.measured(ds, "x", "https://x", {}, b"x", "terms").write()
    assert build.load_links(con) > 150
    ee_fi = con.execute("""SELECT mw FROM scenario_link WHERE scenario = 'eraa2025_ntc'
        AND border = 'EE-FI' AND direction = 'fwd' AND year = 2035
        AND kind = 'ntc_max'""").fetchone()
    assert ee_fi == (1716.0,)


def test_an_archive_table_reloads_when_its_archive_changes(con, tmp_path, capsys):
    """E-056, D-076: a table loaded from an archive is kept while the archive file is the one
    it was loaded from, and emptied for reloading when the file changes."""
    ds, f = "t", tmp_path / "a.zip"
    con.execute("""INSERT INTO lineage (dataset, source, endpoint, params, fetched_at, licence)
                   VALUES (?, 't', 'x', '{}', now(), 'none')""", [ds])
    f.write_bytes(b"one")
    assert not build._archive_unchanged(con, "demand_profile", {ds: f})     # never loaded
    con.execute("INSERT INTO demand_profile VALUES ('EE', 'nt', 2040, 2009, 1, 900, ?)", [ds])
    assert build._archive_unchanged(con, "demand_profile", {ds: f})         # same file: kept
    assert "kept 1 rows, archive unchanged" in capsys.readouterr().out
    f.write_bytes(b"two")
    assert not build._archive_unchanged(con, "demand_profile", {ds: f})     # changed: reload
    assert con.execute("SELECT count(*) FROM demand_profile").fetchone()[0] == 0


def test_reopening_a_current_database_does_not_write_it(tmp_path, monkeypatch):
    """E-084: a read-write open of a database that already carries this schema.sql leaves the
    file as it was (its mtime is part of the scenario code stamp); a changed schema.sql still
    reaches it on the next open."""
    import os
    import time

    import db
    monkeypatch.delenv("ENERGIAMUDEL_READ_ONLY", raising=False)
    p = tmp_path / "t.duckdb"
    connect(p).close()
    before = os.stat(p).st_mtime_ns
    time.sleep(0.05)
    connect(p).close()
    assert os.stat(p).st_mtime_ns == before
    changed = tmp_path / "schema.sql"
    changed.write_text(db.SCHEMA.read_text() + "\nCREATE OR REPLACE VIEW v_new AS SELECT 1 AS x;\n")
    monkeypatch.setattr(db, "SCHEMA", changed)
    con = connect(p)
    assert con.execute("SELECT x FROM v_new").fetchone() == (1,)
    con.close()
    assert os.stat(p).st_mtime_ns != before


def test_a25_net_position_sign(con, tmp_path, monkeypatch):
    """A25: the zone as in_Domain is an import series, as out_Domain an export series; the
    table stores their sum with + = net export."""
    monkeypatch.setenv("ENERGIAMUDEL_LINEAGE", str(tmp_path / "lineage"))
    ds = "entsoe.A25.EE.2025-01"
    lineage.measured(ds, "ENTSO-E", "https://x", {}, b"x", "terms").write()
    build.load_lineage(con)
    ee, reg = "10Y1001A1001A39I", "REGION_CODE-----"
    df = pd.DataFrame({"ts": [datetime(2025, 1, 1, 0), datetime(2025, 1, 1, 1)],
                       "value": [300.0, 120.0], "minutes": [60, 60], "psr_type": [None] * 2,
                       "tech": [None] * 2, "in_domain": [ee, reg], "out_domain": [reg, ee]})
    monkeypatch.setattr(build.entsoe, "parse", lambda p: df)
    assert build.load_entsoe_a25(con, tmp_path / f"{ds}.xml", ds, "EE") == 2
    assert con.execute("SELECT mw FROM net_position ORDER BY ts").fetchall() == [(-300.0,),
                                                                                  (120.0,)]


def test_transmission_outage_keeps_direction_and_drops_republished_events(con, tmp_path,
                                                                          monkeypatch):
    """R-DATA-11: the same A78 event published in two documents is one row per direction."""
    monkeypatch.setenv("ENERGIAMUDEL_LINEAGE", str(tmp_path / "lineage"))
    ev = dict(kind="transmission", asset="Estlink2", zone=None,
              start_ts=datetime(2024, 1, 25, 22), end_ts=datetime(2024, 9, 3, 22),
              mw_available=358.0, mw_nominal=None, planned=False, reason=None)
    twice = pd.DataFrame([{"id": "docA.1", **ev}, {"id": "docB.1", **ev}])
    monkeypatch.setattr(build.entsoe, "parse_unavailability", lambda p: twice)
    for d in ("fwd", "rev"):
        ds = f"entsoe.A78.EE-FI.{d}.2024-01"
        lineage.measured(ds, "ENTSO-E", "https://x", {}, b"x", "terms").write()
        build.load_lineage(con)
        build.load_entsoe_outage(con, tmp_path / f"{ds}.zip", ds, "EE-FI", "transmission", d)
        build.load_entsoe_outage(con, tmp_path / f"{ds}.zip", ds, "EE-FI", "transmission", d)
    rows = con.execute("SELECT direction, mw_available FROM unavailability ORDER BY 1").fetchall()
    assert rows == [("fwd", 358.0), ("rev", 358.0)]


def test_parameters_load_with_page_lineage(con, tmp_path, monkeypatch):
    monkeypatch.setenv("ENERGIAMUDEL_LINEAGE", str(tmp_path / "lineage"))
    # the rows read from fetched archives name those archives' records (D-072)
    for ds in ("tyndp2024.20231103-Final-Supply-Inputs-for-TYNDP-2024-Scenarios-xlsx",
               "tyndp2024.Hydrogen", "tyndp2024.Investment-Datasets"):
        lineage.measured(ds, "x", "https://x", {}, b"x", "terms").write()
    assert build.load_parameters(con) > 300
    blend = con.execute("""SELECT p.value, p.unit, p.lineage_id FROM parameter p
        WHERE p.key = 'boundary.reprice.tyndp2024.gas_blend.DE.2040'""").fetchone()
    assert blend == (10.8625, "EUR/GJ",
                     "tyndp2024.20231103-Final-Supply-Inputs-for-TYNDP-2024-Scenarios-xlsx")
    cap = con.execute("""SELECT p.value, l.page, l.source FROM parameter p
        JOIN lineage l ON l.dataset = p.lineage_id
        WHERE p.key = 'market.price_cap_eur_mwh'""").fetchone()
    assert cap == (4000.0, "p. 5, Art. 3(1)", "acer_hmmcp_da_2026_annex")    # ERRATA E-012


def test_a_referenced_weather_scenario_reloads_in_place(con):
    """ERRATA E-026: a second `make db` must not replace tyndp2026_weather rows that prices
    point at; identical rows are kept, a changed one asks for a clean build."""
    con.execute("INSERT INTO lineage (dataset, source, endpoint, params, fetched_at, licence) "
                "VALUES ('t.w', 's', 'e', '{}', '2026-09-25 00:00:00', 'open')")
    row = pd.DataFrame({"code": ["WS037"], "target_year": [2035], "climate_model": ["CMR5"],
                        "climate_year": [2036], "weight": [0.43], "lineage_id": ["t.w"]})
    assert build._insert_parent(con, "tyndp2026_weather", row, key="code") == 1
    con.execute("INSERT INTO tyndp2026_price VALUES ('EE', 'WS037', 1, 50.0, 't.w')")
    assert build._insert_parent(con, "tyndp2026_weather", row, key="code") == 0
    with pytest.raises(RuntimeError, match="clean build|make clean"):
        build._insert_parent(con, "tyndp2026_weather", row.assign(weight=0.5), key="code")


def test_thermal_units_carry_the_fuel_and_read_the_rate_in_per_cent(con, tmp_path, monkeypatch):
    """M5 (R-LINK-7): a PEMMDB Thermal sheet — a fuel named on its group's first row holds for the
    rows below, a row without a plant type takes its fuel's name, the rate in per cent becomes a
    fraction and a rate of 0 is taken as not given."""
    import io
    import zipfile
    rows: list[list] = [[None] * 33 for _ in range(14)]
    rows[7][3] = "Number of units"
    for i, (fuel, kind, mw, units, rate) in enumerate([("Oil shale", "new", 658, 3, 7.5),
                                                        (None, "old", 173, 1, 10),
                                                        ("Gas", "CCGT new", 250, 0, 0),
                                                        ("Nuclear", None, 1000, 1, 5)]):
        rows[10 + i][:4] = [fuel, kind, mw, units]
        rows[10 + i][32] = rate
    buf = io.BytesIO()
    pd.DataFrame(rows).to_excel(buf, sheet_name="Thermal", header=False, index=False)
    with zipfile.ZipFile(tmp_path / "p.zip", "w") as z:
        z.writestr("PEMMDB2/2030/PEMMDB_EE00_NationalTrends_2030.xlsx", buf.getvalue())
    con.execute("""INSERT INTO lineage (dataset, source, endpoint, params, fetched_at, licence)
                   VALUES ('t.p', 't', 'x', '{}', now(), 'none')""")
    monkeypatch.setattr(build, "raw_dir", lambda d: tmp_path)
    monkeypatch.setattr(build, "THERMAL_ZIPS", {"t.p": ("tyndp2024", "p.zip", "PEMMDB2")})
    assert build.load_thermal_unit(con) == 4
    assert con.execute("SELECT fuel, plant_type, mw, units, forced_outage_rate FROM thermal_unit "
                       "ORDER BY mw DESC").fetchall() == [
        ("Nuclear", "Nuclear", 1000.0, 1, 0.05), ("Oil shale", "new", 658.0, 3, 0.075),
        ("Gas", "CCGT new", 250.0, 0, None), ("Oil shale", "old", 173.0, 1, 0.1)]


def test_an_archive_load_that_fails_leaves_the_table_as_it_was(con, tmp_path):
    """A load interrupted after its deletes and its `loaded_archive` record keeps neither: the
    next build sees no record and loads the archive again (the review of 2026-10-08)."""
    ds, f = "t", tmp_path / "a.zip"
    con.execute("""INSERT INTO lineage (dataset, source, endpoint, params, fetched_at, licence)
                   VALUES (?, 't', 'x', '{}', now(), 'none')""", [ds])
    con.execute("INSERT INTO demand_profile VALUES ('EE', 'nt', 2040, 2009, 1, 900, ?)", [ds])
    f.write_bytes(b"new")

    def load(c):
        assert not build._archive_unchanged(c, "demand_profile", {ds: f})    # deletes, records
        c.execute("INSERT INTO demand_profile VALUES ('EE', 'nt', 2040, 2009, 2, 950, ?)", [ds])
        raise ValueError("the archive's second member is unreadable")

    with pytest.raises(ValueError, match="second member"):
        build._atomic(con, load)
    assert con.execute("SELECT hour, mw FROM demand_profile").fetchall() == [(1, 900.0)]
    assert con.execute("SELECT count(*) FROM loaded_archive").fetchone()[0] == 0


def test_the_build_runs_every_archive_loader_it_calls_through_atomic(monkeypatch):
    """E-094: an archive loader skips an archive it has recorded as loaded, so build() runs each
    one in a transaction; the loaders are stubs here and the database is empty."""
    import inspect
    loaders = {n: f for n, f in vars(build).items()
               if n.startswith("load_") and inspect.isfunction(f)}
    archive = {n for n, f in loaders.items() if "_archive_unchanged(" in inspect.getsource(f)}
    called, atomic = [], []

    def stub(name):
        def f(*a):
            called.append(name)
            return {} if name in ("load_entsoe", "load_tyndp2026") else 0
        f.__name__ = name
        return f

    for n in loaders:
        monkeypatch.setattr(build, n, stub(n))
    def atomic_load(con, load, *a):
        atomic.append(load.__name__)
        return load(con, *a)

    monkeypatch.setattr(build, "_atomic", atomic_load)
    monkeypatch.setattr(build, "connect", lambda path=None: connect(":memory:"))
    build.build()
    direct = archive & set(called)
    assert len(direct) == 9 and direct <= set(atomic), sorted(direct - set(atomic))


@pytest.mark.parametrize("loader, table, csv", [
    ("load_documentary", "scenario_assumption", "scenarios.csv"),
    ("load_tech_parameters", "tech_parameter", "tech_parameters.csv"),
    ("load_links", "scenario_link", "links.csv"),
    ("load_parameters", "parameter", "parameters.csv"),
    ("load_fuel_paths", "scenario_fuel", "fuel_paths.csv"),
])
def test_a_documentary_table_drops_a_row_its_csv_no_longer_has(con, tmp_path, monkeypatch,
                                                                loader, table, csv):
    """E-095: each of the five tables is its one CSV as it now stands."""
    monkeypatch.setenv("ENERGIAMUDEL_LINEAGE", str(tmp_path / "lineage"))
    named = pd.read_csv(DATA_DIR / "documentary" / csv, dtype=str, keep_default_na=False)
    for ds in set(named["lineage_id"]) - {""}:   # the fetched files some rows are read from
        lineage.measured(ds, "x", "https://x", {}, b"x", "terms").write()
    load = getattr(build, loader)
    n = load(con)
    row = con.execute(f"SELECT * FROM {table} LIMIT 1").fetchdf()
    first = row.columns[0]                       # a key column of free text in every one
    build._upsert(con, table, row.assign(**{first: row[first] + ".renamed.since"}))
    assert load(con) == n
    assert con.execute(f"SELECT count(*) FROM {table}").fetchone()[0] == n


def test_an_entsoe_file_that_cannot_be_read_fails_the_build(con, tmp_path, monkeypatch):
    raw = tmp_path / "entsoe"
    raw.mkdir()
    (raw / "entsoe.A31.EE-FI.fwd.2025-01.xml").write_text("<truncated")
    (raw / "entsoe.A31.EE-FI.fwd.2025-02.xml").write_text("<truncated")
    monkeypatch.setattr(build, "raw_dir", lambda d: raw)
    with pytest.raises(RuntimeError, match="2 ENTSO-E file"):
        build.load_entsoe(con)


def test_hydro_days_on_the_layout_keep_a_leap_years_water():
    """The PEMMDB sheets' 366 days on the 365-day layout (E-099): a leap year's inflow puts 29
    February into week 9 and keeps its water; a series whose day 366 is empty keeps its dates."""
    day = pd.Series(list(range(1, 367)) * 2)
    full = pd.Series([True] * 366 + [False] * 366)      # a leap inflow; a constant variable
    weeks = pd.DataFrame({"full": full, "week": build._layout_week(day, full)}).dropna()
    n = weeks.groupby(["full", "week"]).size()
    assert n[True][9] == 8 and n[True][53] == 1 and n[True].sum() == 366
    assert n[False][9] == 7 and n[False][53] == 1 and n[False].sum() == 365
    assert list(build._layout_week(pd.Series([59, 60, 61, 365]), pd.Series([False] * 4))) == \
        [9, 9, 9, 53]                                     # dates kept where nothing is folded

def test_a_daily_sheet_folds_only_the_series_whose_leap_day_366_holds_a_value():
    """E-099, E-103: per variable and climate year — a leap year's inflow folds 29 February in,
    a variable with an empty day 366 in the same year keeps its dates, as does a common year."""
    rows = [("INFLOW", 2008, d, 1.0) for d in range(1, 367)]
    rows += [("P_MAX", 2008, d, 5.0 if d < 366 else 0.0) for d in range(1, 367)]
    rows += [("INFLOW", 2009, d, 1.0) for d in range(1, 366)]
    long = pd.DataFrame(rows, columns=["variable", "climate_year", "period", "value"])
    n = build._daily_weeks(long).groupby(["variable", "climate_year", "week"]).size()
    assert (n["INFLOW", 2008, 9], n["INFLOW", 2008].sum()) == (8, 366)
    assert (n["P_MAX", 2008, 9], n["P_MAX", 2008].sum()) == (7, 365)
    assert (n["INFLOW", 2009, 9], n["INFLOW", 2009].sum()) == (7, 365)


def test_the_lineage_check_fails_on_a_fact_row_without_a_record_file(con, tmp_path, monkeypatch):
    """E-097: the database's own lineage table cannot stand in for the record files."""
    from db import check

    monkeypatch.setenv("ENERGIAMUDEL_LINEAGE", str(tmp_path / "lineage"))
    monkeypatch.setenv("ENERGIAMUDEL_RAW", str(tmp_path / "raw"))
    (tmp_path / "raw").mkdir()
    con.execute("""INSERT INTO lineage (dataset, source, endpoint, params, fetched_at, licence)
                   VALUES ('gone.record', 't', 'x', '{}', now(), 'none')""")
    con.execute("INSERT INTO price VALUES ('EE', '2025-01-01 00:00', 50.0, 'gone.record')")
    ok, detail = check.check_lineage(con)
    assert not ok and detail.startswith("1 fact rows without a record")
    lineage.derived("gone.record", [], notes="now on file").write()
    ok, detail = check.check_lineage(con)
    assert ok, detail


def test_the_hours_check_counts_a_missing_hour(con):
    from db import check

    con.execute("""INSERT INTO lineage (dataset, source, endpoint, params, fetched_at, licence)
                   VALUES ('p', 't', 'x', '{}', now(), 'none')""")
    con.execute("""INSERT INTO price SELECT 'EE', ts, 1.0, 'p' FROM generate_series(
                   TIMESTAMP '2023-01-01', TIMESTAMP '2023-12-31 22:00', INTERVAL 1 HOUR) t(ts)""")
    ok, detail = check.check_hours(con)
    assert not ok and "price EE 2023: 8759 hours, 8760 expected" in detail


def test_a_net_position_hour_holding_both_signs_is_its_signed_average(con, tmp_path, monkeypatch):
    """A25 with quarter-hours: each MTU stands in its sign's series; LT on 2026-08-13 at 17:00
    exported in one quarter-hour and imported in three (the review of 2026-10-08)."""
    monkeypatch.setenv("ENERGIAMUDEL_LINEAGE", str(tmp_path / "lineage"))
    ds = "entsoe.A25.LT.2026-08"
    lineage.measured(ds, "ENTSO-E", "https://x", {}, b"x", "terms").write()
    build.load_lineage(con)
    lt, other = ZONES["LT"].eic, "10YLV-1001A00074"
    q = [(0, -107.8), (15, 262.8), (30, -89.5), (45, -105.4)]
    rows = [{"ts": datetime(2026, 8, 13, 17, m), "value": abs(v), "minutes": 15, "psr_type": None,
             "tech": None, "out_domain": lt if v > 0 else other,
             "in_domain": other if v > 0 else lt} for m, v in q]
    monkeypatch.setattr(build.entsoe, "parse", lambda p: pd.DataFrame(rows))
    build.load_entsoe_a25(con, tmp_path / f"{ds}.xml", ds, "LT")
    assert con.execute("SELECT mw FROM net_position").fetchone()[0] == pytest.approx(-9.975)


def test_a_flow_quarter_hour_the_other_direction_reports_is_zero(con, tmp_path, monkeypatch):
    """A11 with quarter-hours (2026): a direction leaves out the quarter-hours the power ran the
    other way; the other direction's file reports them. A quarter-hour neither reports is missing,
    not zero (the review of 2026-10-08)."""
    monkeypatch.setenv("ENERGIAMUDEL_LINEAGE", str(tmp_path / "lineage"))
    fwd, rev = "entsoe.A11.LV-LT.fwd.2026-08", "entsoe.A11.LV-LT.rev.2026-08"
    for ds in (fwd, rev):
        lineage.measured(ds, "ENTSO-E", "https://x", {}, b"x", "terms").write()
        (tmp_path / f"{ds}.xml").write_text("x")
    build.load_lineage(con)
    q = lambda pts: pd.DataFrame([{"ts": datetime(2026, 8, 19, h, m), "value": v, "minutes": 15}  # noqa: E731
                                  for h, m, v in pts])
    sides = {"fwd": q([(3, 0, 100.0), (3, 15, 100.0), (4, 45, 594.5)]),
             "rev": q([(3, 30, 60.0), (3, 45, 60.0), (4, 45, 0.0)])}
    monkeypatch.setattr(build.entsoe, "parse",
                        lambda p: sides["fwd" if ".fwd." in p.name else "rev"])
    build.load_entsoe_a11(con, tmp_path / f"{fwd}.xml", fwd, "LV-LT", False)
    build.load_entsoe_a11(con, tmp_path / f"{rev}.xml", rev, "LV-LT", True)
    got = dict(((d, ts.hour), mw) for d, ts, mw in con.execute(
        "SELECT direction, ts, mw FROM flow ORDER BY ALL").fetchall())
    assert got == {("fwd", 3): 50.0, ("rev", 3): 30.0, ("fwd", 4): 594.5, ("rev", 4): 0.0}
    # without the other direction's file its quarter-hours cannot be told apart from a gap
    (tmp_path / f"{rev}.xml").unlink()
    with pytest.raises(FileNotFoundError, match="other direction"):
        build.load_entsoe_a11(con, tmp_path / f"{fwd}.xml", fwd, "LV-LT", False)
