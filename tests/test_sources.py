"""One check per non-trivial parser, on synthetic raw files; no network."""

import json
from collections.abc import Iterator
from typing import cast

import pandas as pd
import pytest
import requests

from pipeline import history, lineage
from pipeline.sources import (
    btd,
    documents,
    ecb,
    eex,
    energimyndigheten,
    fingrid,
    irena,
    jao,
    openmeteo,
    umm,
    worldbank,
)


def test_eex_keeps_successful_general_allowance_auctions_only(tmp_path):
    p = tmp_path / "eex.xlsx"
    head = pd.DataFrame([[None] * 4] * 5)
    body = pd.DataFrame([
        ["Date", "Auction Name", "Status", "Auction Price €/tCO2"],
        ["2025-01-08", "Auction 4. Period DE", "successful", 75.5],
        ["2025-01-09", "Auction 4. Period CAP3 EU", "cancelled", None],
        ["2025-01-10", "EUAA Auction CAP3 EU", "successful", 70.1],   # aviation allowances (E-081)
    ])
    pd.concat([head, body]).to_excel(p, header=False, index=False)
    df = eex.parse(p)
    assert len(df) == 1 and df.loc[0, "value"] == 75.5
    assert df.loc[0, "ts"] == pd.Timestamp("2025-01-08")


def test_eex_reports_without_a_status_column_keep_the_priced_auctions(tmp_path):
    # the reports of 2017-2019 list no status; an auction without a price did not clear (D-087)
    p = tmp_path / "eex2018.xlsx"
    head = pd.DataFrame([[None] * 3] * 5)
    body = pd.DataFrame([
        ["Date", "Auction Name", "Auction Price €/tCO2"],
        ["2018-03-01", "Auction 3. Period EU", 9.8],
        ["2018-03-02", "Auction 3. Period PL", None],
    ])
    pd.concat([head, body]).to_excel(p, header=False, index=False)
    df = eex.parse(p)
    assert list(df.value) == [9.8] and df.loc[0, "ts"] == pd.Timestamp("2018-03-01")


def test_irena_capacity_long_form(tmp_path):
    p = tmp_path / "irena.csv"
    p.write_text('\ufeff"Country/area","Technology","Data Type","Grid connection","Year",'
                 '"Electricity statistics"\n'
                 '"Estonia","Onshore wind energy","Electrical Installed Capacity (MW)","All",'
                 '"2024","693.05"\n'
                 '"Estonia","Offshore wind energy","Electrical Installed Capacity (MW)","All",'
                 '"2024",".."\n'
                 '"Sweden","Solar photovoltaic","Electrical Installed Capacity (MW)","All",'
                 '"2025","5500"\n', encoding="utf-8")
    df = irena.parse(p)
    assert list(df.columns) == ["country", "tech", "year", "mw"]
    got = {(r.country, r.tech, r.year): r.mw for r in df.itertuples()}
    assert got == {("EE", "wind_onshore", 2024): 693.05, ("EE", "wind_offshore", 2024): 0.0,
                   ("SE", "solar", 2025): 5500.0}            # ".." is a country without the plant
    bad = tmp_path / "bad.csv"
    bad.write_text(p.read_text(encoding="utf-8").replace("Sweden", "Norway"), encoding="utf-8")
    with pytest.raises(RuntimeError, match="unexpected rows"):
        irena.parse(bad)


def test_energimyndigheten_wind_by_area(tmp_path):
    # ISO-8859-1 as served; "." where the supplementary source has no figure (D-093)
    p = tmp_path / "em.csv"
    p.write_bytes('"År","Elområde","Installerad effekt, MW"\n"2025","SE4",2576.72\n'
                  '"2025","SE1",3291.0\n"2025","Kompletterande källa, ej geografiskt fördelad",.\n'
                  .encode("iso-8859-1"))
    df = energimyndigheten.parse(p)
    assert list(df.columns) == ["area", "year", "mw"]
    assert {(r.area, r.year): r.mw for r in df.itertuples()} == {("SE1", 2025): 3291.0,
                                                               ("SE4", 2025): 2576.72}


def test_worldbank_long_format(tmp_path):
    p = tmp_path / "cmo.xlsx"
    rows: list[list] = [[None] * 5] * 4
    rows += [[None, "Natural gas, Europe", "Coal, Australian", "Coal, South African **",
              "Crude oil, Brent"],
             [None, "($/mmbtu)", "($/mt)", "($/mt)", "($/bbl)"],
             ["2014M12", 9.0, 60.0, 60.0, 60.0],
             ["2025M01", 14.2, 117.0, 104.0, 78.0]]
    pd.DataFrame(rows).to_excel(p, sheet_name="Monthly Prices", header=False, index=False)
    df = worldbank.parse(p)
    assert len(df) == 4                       # 2014 dropped, four commodities in 2025M01
    gas = df[df.commodity == "gas_ttf"].iloc[0]
    assert gas.ts == pd.Timestamp("2025-01-01") and gas.value == 14.2 and gas.unit == "USD/mmbtu"


def test_ecb_monthly_usd_per_eur(tmp_path):
    """OPEN-13: the SDMX CSV's TIME_PERIOD and OBS_VALUE become (month start, USD per EUR)."""
    p = tmp_path / "ecb.exr.USD-EUR.M.2026-09.csv"
    p.write_text("KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE\n"
                 "EXR.M.USD.EUR.SP00.A,M,USD,EUR,SP00,A,2025-12,1.1708714285714283\n"
                 "EXR.M.USD.EUR.SP00.A,M,USD,EUR,SP00,A,2025-11,1.15602\n")
    df = ecb.parse(p)
    assert list(df["ts"]) == [pd.Timestamp("2025-11-01"), pd.Timestamp("2025-12-01")]
    assert df["value"].iloc[0] == 1.15602


def test_ecb_rejects_another_series(tmp_path):
    p = tmp_path / "x.csv"
    p.write_text("KEY,TIME_PERIOD,OBS_VALUE\nEXR.M.GBP.EUR.SP00.A,2025-12,0.85\n")
    with pytest.raises(RuntimeError, match="unexpected series"):
        ecb.parse(p)


def test_commodity_loader_adds_the_newest_ecb_vintage(tmp_path, monkeypatch):
    """The rate enters `commodity` as usd_per_eur, newest vintage only, with its lineage id."""
    from db import build, connect
    raw = tmp_path / "raw"
    monkeypatch.setenv("ENERGIAMUDEL_RAW", str(raw))
    monkeypatch.setenv("ENERGIAMUDEL_LINEAGE", str(tmp_path / "lineage"))
    head = "KEY,TIME_PERIOD,OBS_VALUE\n"
    for vintage, value in (("2026-08", "1.10"), ("2026-09", "1.16")):
        ds = f"ecb.exr.USD-EUR.M.{vintage}"
        body = (head + f"EXR.M.USD.EUR.SP00.A,2026-07,{value}\n").encode()
        (raw / "ecb").mkdir(parents=True, exist_ok=True)
        (raw / "ecb" / f"{ds}.csv").write_bytes(body)
        lineage.measured(ds, "ECB", "https://example", {}, body, "open").write()
    con = connect(":memory:")
    build.load_vocabulary(con)
    build.load_lineage(con)
    build.load_commodity(con)
    rows = con.execute("SELECT price, unit, lineage_id FROM commodity "
                       "WHERE commodity = 'usd_per_eur'").fetchall()
    assert rows == [(1.16, "USD/EUR", "ecb.exr.USD-EUR.M.2026-09")]


def test_openmeteo_shape(tmp_path):
    o = tmp_path / "o.json"
    o.write_text(json.dumps({"hourly": {"time": ["2025-01-01T00:00", "2025-01-01T01:00"],
                                        "temperature_2m": [-3.1, -3.0],
                                        "wind_speed_10m": [4.0, 4.1],
                                        "shortwave_radiation": [0.0, 12.0]}}))
    df = openmeteo.parse(o)
    assert df.loc[0, "temperature_c"] == -3.1 and df.loc[0, "ts"] == pd.Timestamp("2025-01-01")
    # radiation is the preceding hour's average, labelled at the hour's end: 00:00-01:00 got 12
    assert df.loc[0, "radiation_wm2"] == 12.0 and pd.isna(df.loc[1, "radiation_wm2"])


def test_parse_tyndp_market_model_prices(tmp_path):
    """D-059: each node block's 'Marginal Cost' column, hours from row 14, mapped nodes only, and
    every mapped node there (as the xlsb reader requires)."""
    import zipfile

    import openpyxl

    from pipeline.sources import tyndp

    def archive(nodes):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Hourly Market Data"
        for _ in range(10):
            ws.append([None])
        ws.append([None, "Category"] + ["Nuclear [MW]", "Marginal Cost [€]"] * len(nodes))
        ws.append([None, "Country"] + [n for n in nodes for _ in range(2)])
        ws.append([None])
        ws.append([1, "01JAN00:00"] + [500, 61.5] * len(nodes))
        ws.append([2, "01JAN01:00"] + [400, 3000] * len(nodes))
        xlsx = tmp_path / "MMStandardOutputFile_NT2040_Plexos_CY2009_2.5_v40.xlsx"
        wb.save(xlsx)
        arc = tmp_path / "tyndp2024.MMStandardOutputFile_NT2040_Plexos_CY2009_2-5_v40-xlsx.zip"
        with zipfile.ZipFile(arc, "w") as z:
            z.write(xlsx, xlsx.name)
        return arc

    every = ["EE00", "LV00", "LT00", "FI00", "SE04", "PL00"]
    arc = archive(every + ["XX00"])
    df = tyndp.parse_mm_prices(arc)
    ee = df[df.zone == "EE"]
    assert ee.to_dict("list") == {"zone": ["EE", "EE"], "hour": [1, 2], "eur_mwh": [61.5, 3000.0]}
    assert sorted(df.zone.unique()) == ["EE", "FI", "LT", "LV", "PL", "SE4"]
    assert tyndp.mm_meta(arc) == ("NT", 2040, 2009)
    with pytest.raises(ValueError, match="price columns"):
        tyndp.parse_mm_prices(archive(every[:-1]))


def test_eraa_zip_member_is_read_by_range(tmp_path):
    import io
    import zipfile

    from pipeline.sources import eraa
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("big.bin", bytes(200_000))
        z.writestr("PECD - weather/map.xlsx", b"mapping")
    data, asked = buf.getvalue(), []

    def get(start, end):
        asked.append(end - start + 1)
        return data[start:end + 1]
    assert eraa.zip_member(get, len(data), "PECD - weather/map.xlsx") == b"mapping"
    assert sum(asked) < len(data)      # the large member was never read


def _ntc_zip(path, ty=2028):
    """A hand-written ERAA NTC package in the layout of 'NTCs Consolidated TY<year>.xlsx': a
    header block (Interconnection / From: / To: / Date rows) over one row per hour, HVAC and
    HVDC sheets. Target year 2028 is a leap year, as in the real package (8 784 rows)."""
    import zipfile

    import openpyxl
    days = pd.date_range(f"{ty}-01-01", f"{ty}-12-31", freq="D")
    cols = {"HVAC": [("EE00", "LV00"), ("LV00", "EE00"), ("PLE0", "DE00"), ("DE00", "PLE0"),
                     ("PL00", "PLE0"), ("XX00", "EE00"), ("SE03", "SE04")],
            "HVDC": [("SE03", "SE04"), ("DKW1", "SE03")]}

    def mw(sheet, j, day, hour):
        f, t = cols[sheet][j]
        if (f, t) == ("EE00", "LV00"):          # seasonal, with a marker on 29 February
            return 9999 if (day.month, day.day) == (2, 29) else 1000 + day.dayofyear + hour
        return {("LV00", "EE00"): 800, ("PLE0", "DE00"): 3000, ("DE00", "PLE0"): 0,
                ("PL00", "PLE0"): 3000, ("XX00", "EE00"): 5, ("SE03", "SE04"):
                100 if sheet == "HVAC" else 200, ("DKW1", "SE03"): 715}[(f, t)]
    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    for sheet, pairs in cols.items():
        ws = wb.create_sheet(sheet)
        ws.append(["ENTSO-E Market Modelling Database: Deterministic estimates of NTCs"])
        ws.append([None])
        ws.append(["Interconnection", "ID"] + [f"{f}-{t}" for f, t in pairs])
        ws.append(["From:", "FROM"] + [f for f, _ in pairs])
        ws.append(["To:", "TO"] + [t for _, t in pairs])
        ws.append(["Date", "Hour"] + [f"Hourly values {f}-{t}" for f, t in pairs])
        for day in days:
            for h in range(1, 25):
                ws.append([day.strftime("%d.%m."), h]
                          + [mw(sheet, j, day, h) for j in range(len(pairs))])
    xlsx = path / "x.xlsx"
    wb.save(xlsx)
    arc = path / "eraa2025.ntcs.zip"
    with zipfile.ZipFile(arc, "w") as z:
        z.write(xlsx, f"NTCs/NTCs Consolidated TY{ty}.xlsx")
    return arc


def test_eraa_ntc_profiles_per_border_and_direction(tmp_path):
    """D-085: one 8 760-hour profile per model border and direction; HVAC and HVDC add up;
    Poland's synchronous borders through PLE0 (export) / PLI0 (import) only; 29 February of a
    leap target year is dropped, so hour h is the same calendar day in every year."""
    from pipeline.config import BORDERS
    from pipeline.sources import eraa
    df = eraa.ntc_profiles(_ntc_zip(tmp_path), BORDERS)
    got = df.groupby(["border", "direction"]).mw.agg(["count", "min", "max"])
    assert set(got.index) == {("EE-LV", "fwd"), ("EE-LV", "rev")}   # v5's borders only
    assert (got["count"] == 8760).all() and set(df.target_year) == {2028}
    assert got.loc[("EE-LV", "rev"), "min"] == got.loc[("EE-LV", "rev"), "max"] == 800
    ee = df[(df.border == "EE-LV") & (df.direction == "fwd")].set_index("hour").mw
    assert ee.max() < 9999                                    # 29 February is gone
    assert ee[59 * 24 + 1] == 1000 + 61 + 1                   # hour 1417 is 1 March, day 61 of 2028
    assert ee[8760] == 1000 + 366 + 24                        # the year ends on 31 December


def test_link_hourly_loader_checks_the_documentary_rows(tmp_path, monkeypatch):
    """D-085, F3-5: scenario_link's ntc_max / ntc_mean must be the profile's maximum and average;
    a row that is not, or has no profile, stops the build."""
    import pytest

    from db import build, connect
    monkeypatch.setenv("ENERGIAMUDEL_RAW", str(tmp_path))
    monkeypatch.setattr(build, "load_lineage", lambda con: 0)
    (tmp_path / "eraa2025").mkdir()
    _ntc_zip(tmp_path / "eraa2025")
    con = connect(":memory:")
    build.load_vocabulary(con)
    con.execute("""INSERT INTO lineage (dataset, source, endpoint, params, fetched_at, licence)
                   VALUES ('eraa2025.ntcs', 's', 'e', '{}', '2026-01-01', 'l')""")
    for kind, mw in (("ntc_max", 800.0), ("ntc_mean", 800.0), ("sync_profile_max", 1.0)):
        con.execute("INSERT INTO scenario_link VALUES ('eraa2025_ntc', 'EE-LV', 'rev', 2028,"
                    " ?, ?, 'eraa2025.ntcs')", [mw, kind])
    assert build.load_link_hourly(con) == 2 * 8760
    assert build.load_link_hourly(con) == 0                  # archive unchanged: kept
    con.execute("UPDATE scenario_link SET mw = 799 WHERE kind = 'ntc_mean'")
    with pytest.raises(ValueError, match="EE-LV"):
        build.load_link_hourly(con)
    con.execute("UPDATE scenario_link SET mw = 800 WHERE kind = 'ntc_mean'")
    con.execute("INSERT INTO scenario_link VALUES ('eraa2025_ntc', 'EE-FI', 'fwd', 2028, 1, "
                "'ntc_max', 'eraa2025.ntcs')")
    with pytest.raises(ValueError, match="EE-FI"):          # a row with no profile
        build.load_link_hourly(con)


def test_parse_tyndp_xlsb_prices(tmp_path, monkeypatch):
    """R-BND-5: DE/GA workbooks: the 'Category' row, the node row under it, numeric hours;
    sub-nodes ('EE00 SRES') and other columns are not read; a missing zone stops the parse."""
    import zipfile

    import pytest
    import pyxlsb

    from pipeline.sources import tyndp
    rows: list[list] = [
        ["Scenario", "DE35"],
        [None, "Category", "Nuclear [MW]", "Marginal Cost [€]", "Marginal Cost [€]"]
        + ["Marginal Cost [€]"] * 5,
        [None, "Country", "EE00", "EE00", "EE00 SRES", "LV00", "LT00", "FI00", "SE04", "PL00"],
        ["Hour", "Date /Code"], [1.0, "01JAN00:00", 5, 40.0, 1, 41, 42, 30, 35, 90],
        [2.0, "01JAN01:00", 5, 3000.0, 1, 41, 42, 30, 35, 90]]

    class Cell:
        def __init__(self, v):
            self.v = v

    class Sheet:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def rows(self):
            return [[Cell(v) for v in r] for r in rows]

    class Book(Sheet):
        def get_sheet(self, name):
            assert name == "Hourly Market Data emarket"
            return Sheet()

    monkeypatch.setattr(pyxlsb, "open_workbook", lambda f: Book())
    arc = tmp_path / "tyndp2024.DE2035CY1995.zip"
    with zipfile.ZipFile(arc, "w") as z:
        z.writestr("DE2035CY1995/MMStandardOutputFile_DE2035_Plexos_CY1995_v11_SoS.xlsb", b"x")
        z.writestr("DE2035CY1995/MMStandardOutputFile_DE2035_Plexos_CY1995_H2_v11_SoS.xlsb", b"")
    df = tyndp.parse_mm_prices_xlsb(arc)
    assert tyndp.mm_meta(arc) == ("DE", 2035, 1995)
    ee = df[df.zone == "EE"].sort_values("hour")
    assert ee.eur_mwh.tolist() == [40.0, 3000.0] and len(df) == 12
    rows[2][6] = "XX00"                                  # LT00 missing
    with pytest.raises(ValueError, match="price columns"):
        tyndp.parse_mm_prices_xlsb(arc)


def test_jao_long_form_drops_overlapping_windows(tmp_path):
    p = tmp_path / "j.json"
    row = {"id": 1, "dateTimeUtc": "2025-01-15T00:00:00Z", "lastModifiedOn": "x",
           "min_FI_EL": -358.0, "max_FI_EL": 358.0}
    p.write_text(json.dumps([row, {**row, "id": 2}]))
    df = jao.parse(p)
    assert len(df) == 2 and set(df["column"]) == {"min_FI_EL", "max_FI_EL"}
    assert df["ts"].iloc[0] == pd.Timestamp("2025-01-15 00:00")


def test_umm_one_row_per_unit_and_period(tmp_path):
    p = tmp_path / "u.json"
    p.write_text(json.dumps([{
        "messageId": "m1", "version": 2, "publicationDate": "2026-09-23T07:26:48.4155550Z",
        "eventStatus": 1, "unavailabilityType": 2, "reasonCode": 2, "unavailabilityReason": "r",
        "remarks": "L377", "assets": [{"name": "L377 Kullamaa-Lihula"}],
        "transmissionUnits": [
            {"name": "EE → LV", "inAreaEic": "10Y1001A1001A39I", "outAreaEic": "10YLV-1001A00074",
             "installedCapacity": 922, "timePeriods": [
                 {"unavailableCapacity": 22, "availableCapacity": 900,
                  "eventStart": "2026-10-01T03:00:00.0000000Z",
                  "eventStop": "2026-10-07T15:00:00.0000000Z"}]},
            {"name": "LV → EE", "inAreaEic": "10YLV-1001A00074", "outAreaEic": "10Y1001A1001A39I",
             "installedCapacity": 1272, "timePeriods": [
                 {"unavailableCapacity": 322, "availableCapacity": 950,
                  "eventStart": "2026-10-01T03:00:00.0000000Z",
                  "eventStop": "2026-10-07T15:00:00.0000000Z"}]}]}]))
    df = umm.parse(p)
    assert df["unit"].tolist() == ["EE → LV", "LV → EE"]
    assert df["available_mw"].tolist() == [900, 950]
    assert df["start"].iloc[0] == pd.Timestamp("2026-10-01 03:00")


def test_migration_scope():
    """R-DATA-9 / D-002: what the v4 migration keeps."""
    from pipeline.migrate_v4 import wanted
    keep = ["entsoe.A44.PL.2025-01", "entsoe.A31.LT-SE4.rev.2024-03", "entsoe.A72.LV.2020-01",
            "fingrid.115.da_cap_fi_ee_mw.2025-01", "openmeteo.archive.EE.2025",
            "tyndp2024.PECD", "btd.procured_reserves.BALTIC.2025-01",
            "svk.langsiktig_marknadsanalys_2026"]
    drop = ["entsoe.A44.NO1.2025-01", "entsoe.A61.EE-FI.fwd.2025-01",
            "entsoe.A11.SE3-SE4.fwd.2025-01",
            "entsoe.A72.FI.2020-01", "fingrid.188.nuclear_mw.2025-01", "openmeteo.archive.SE3.2025",
            "pse.kse-load.PL.2025-01", "ecb.eur_pln.2025", "doc.svk_lma_2026.p-53-tabell-9"]
    assert all(wanted(ds)[0] for ds in keep)
    assert not any(wanted(ds)[0] for ds in drop)


def test_tyndp2026_weather_and_hydro(tmp_path):
    """Weights come from T35, model and year from T32; a year whose weights do not sum to 1
    is refused; hydro keeps only the selected scenarios of each target year."""
    import zipfile

    import openpyxl
    import pytest

    from pipeline.sources import tyndp2026

    def tables(weights):
        wb = openpyxl.Workbook()
        t32 = wb.active
        t32.title = "T32"
        t32.append(["Table 32"])
        t32.append(["Code name", "SSP", "Model", "Climate year", "Target"])
        t35 = wb.create_sheet("T35")
        t35.append(["Table 35"])
        t35.append(["Target", "Cluster", "Year", "Weight", "Size"])
        for i, (code, w) in enumerate(weights.items()):
            t32.append([f"{code}\xa0", "SSP245", "CMR5", 2031 + i, "2035\xa0"])
            t35.append(["2035", str(i), code, f"{w}\xa0", "10"])
        p = tmp_path / f"t{len(list(tmp_path.iterdir()))}.xlsx"
        wb.save(p)
        return p

    w = tyndp2026.parse_weather(tables({"WS032": 0.24, "WS037": 0.43, "WS059": 0.33}))
    assert {x["code"]: (x["weight"], x["climate_year"]) for x in w} == {
        "WS032": (0.24, 2031), "WS037": (0.43, 2032), "WS059": (0.33, 2033)}
    with pytest.raises(ValueError):
        tyndp2026.parse_weather(tables({"WS032": 0.24, "WS037": 0.43, "WS059": 0.30}))

    z = tmp_path / "hydro.zip"
    csv = "DAY,WS031,WS032,WS037,WS059\n1,1,2,3,4\n2,5,6,7,8\n"
    with zipfile.ZipFile(z, "w") as f:
        f.writestr("Hydro-Inflow/Hydro Inflows/2035/LV00_Hydro_Inflows_HPI_2035.csv", csv)
        f.writestr("Hydro-Inflow/Hydro Inflows/2035/DE00_Hydro_Inflows_HRR_2035.csv", csv)
    h = tyndp2026.parse_hydro(z, tyndp2026.selected(w))
    assert set(h.weather) == {"WS032", "WS037", "WS059"} and set(h.zone) == {"LV"}
    assert set(h.category) == {"pondage"} and h.mwh.sum() == 2 + 6 + 3 + 7 + 4 + 8


def test_tyndp2026_prices_and_pecd(tmp_path):
    """Prices: only the marginal cost of the project's node (SE04 in Sweden's workbook), hour
    from column A. PECD: the selected scenarios of each file, hour from the row order."""
    import io
    import zipfile

    import openpyxl

    from pipeline.sources import tyndp2026

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "E-Market"
    for _ in range(5):
        ws.append(["x"])
    ws.append(["Market Zone", None, "SE03", "SE04", "SE04"])
    ws.append(["Category", None, "Marginal Cost [€/MWh_e]", "Wind Onshore [MW_e]",
               "Marginal Cost [€/MWh_e]"])
    for _ in range(3):
        ws.append(["h"])
    ws.append([1, "01. Jan. 00:00", 10.0, 500.0, 20.0])
    ws.append([2, "01. Jan. 01:00", 11.0, 600.0, 21.0])
    buf = io.BytesIO()
    wb.save(buf)
    z = tmp_path / "hourly.zip"
    member = ("NT+_TimeSeriesDashboard/2035/Weather scenario 037/"
              "SE_TimeSeriesDashboard_TY2035_WS037_SoS.xlsx")
    with zipfile.ZipFile(z, "w") as f:
        f.writestr(member, buf.getvalue())
        f.writestr(member.replace("SE_", "DE_"), buf.getvalue())       # not a project country
    assert tyndp2026.price_members(z) == [(member, 2035, "WS037")]
    assert tyndp2026.parse_price_member(z, member) == [("SE4", 1, 20.0), ("SE4", 2, 21.0)]

    header = "\n".join([",,"] * 10) + "\nDate,Hour,WS031,WS037,WS059,WS032\n"
    body = "".join(f"01.01.,{h % 24 + 1},0.1,0.2,0.3,0.4\n" for h in range(8760))
    p = tmp_path / "pecd.zip"
    with zipfile.ZipFile(p, "w") as f:
        f.writestr("PECD/2035/EE00_CapacityFactors_Wind_Onshore_2035.csv", header + body)
        f.writestr("PECD/2035/Solar PV Rooftop LV00.csv", header + body)
        f.writestr("PECD/2035/Solar PV Utility FI00.csv", header + body)   # not a core zone
    d = tyndp2026.parse_pecd(p, {2035: {"WS032", "WS037", "WS059"}})
    assert set(zip(d.zone, d.tech, d.series, strict=True)) == {("EE", "wind_onshore", "onshore"),
                                                  ("LV", "solar", "rooftop")}
    assert len(d) == 2 * 3 * 8760 and d.hour.max() == 8760
    assert d[d.weather == "WS032"].cf.eq(0.4).all()


def test_tyndp2026_demand(tmp_path):
    """One sheet per node; only the selected scenarios' columns are read; a short year fails."""
    import io
    import zipfile

    import openpyxl
    import pytest

    from pipeline.sources import tyndp2026

    def book(hours):
        wb = openpyxl.Workbook()
        wb.remove(wb.active)
        for node in ("EE00", "LV00", "LT00", "FI00"):
            ws = wb.create_sheet(node)
            for _ in range(10):
                ws.append([None])
            ws.append(["Date", "Hour", "WS031", "WS032", "WS037", "WS059"])
            for h in range(hours):
                ws.append(["01.01.", h % 24 + 1, None, 1.0, 2.0, 3.0])
        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue()

    sel = {2035: {"WS032", "WS037", "WS059"}}
    z = tmp_path / "demand.zip"
    with zipfile.ZipFile(z, "w") as f:
        f.writestr("Demand/2035/ELECTRICITY_MARKET 2035.xlsx", book(8760))
        f.writestr("Demand/2035/Hydrogen_Zone 1_2035.xlsx", book(8760))       # not read
    d = tyndp2026.parse_demand(z, sel)
    assert set(d.zone) == {"EE", "LV", "LT"} and set(d.component) == {"market"}
    assert len(d) == 3 * 3 * 8760 and d[d.weather == "WS059"].mw.eq(3.0).all()
    bad = tmp_path / "short.zip"
    with zipfile.ZipFile(bad, "w") as f:
        f.writestr("Demand/2035/ELECTRICITY_PROSUMER 2035.xlsx", book(100))
    with pytest.raises(ValueError):
        tyndp2026.parse_demand(bad, sel)


def test_tyndp2024_yearly_demand_sums_the_zone_nodes(tmp_path):
    """R-BND-8: native demand and electrolyser load summed over every node of a zone."""
    import zipfile

    import openpyxl

    from pipeline.sources import tyndp
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Yearly Outputs"
    ws.append(["Scenario", "NT30"])
    ws.append(["Output type", "Output type", "FI00", "FI00 EV Passenger Street", "FI00RETE",
               "SE04", "PL00"])
    ws.append(["Annual generation [GWh]", "Nuclear", 30000, 0, 0, 0, 0])
    ws.append([None, "Electrolyser (load)", 9000, 0, 0, 100, 0])
    ws.append(["Native Demand (excl. Pump load & Battery charge) [GWh]", None, 80000, 2000,
               30000, 25000, 180000])
    xlsx = tmp_path / "MMStandardOutputFile_NT2030_Plexos_CY2009_2.5_v40.xlsx"
    wb.save(xlsx)
    arc = tmp_path / "tyndp2024.MMStandardOutputFile_NT2030_Plexos_CY2009_2-5_v40-xlsx.zip"
    with zipfile.ZipFile(arc, "w") as z:
        z.write(xlsx, xlsx.name)
    df = tyndp.parse_mm_yearly(arc, nodes={"FI00": "FI", "SE04": "SE4", "PL00": "PL"})
    got = {r.zone: (r.demand_twh, r.electrolysis_twh) for r in df.itertuples()}
    assert got == {"FI": (112.0, 9.0), "SE4": (25.0, 0.1), "PL": (180.0, 0.0)}


def test_tyndp2024_outputs_sum_the_zone_nodes(tmp_path):
    """R-BND-8, D-040, D-041: every non-zero generation and capacity row and the two balance
    sections, summed over a zone's nodes, the electric cars' nodes apart; an empty cell counts as
    0, a zero row is left out, a missing section fails."""
    import zipfile

    import openpyxl

    from pipeline.sources import tyndp

    def archive(with_dump: bool):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Yearly Outputs"
        ws.append(["Output type", "Output type", "FI00", "FI00 EV Passenger Street", "FI00RETE",
                   "SE04", "PL00"])
        ws.append(["Annual generation [GWh]", "Wind Onshore", 140000, 0, None, 5000, 0])
        ws.append([None, "Solar (Photovoltaic)", 5000, 0, 14000, 0, 0])
        ws.append([None, "Battery Storage discharge (gen.)", 600, 3100, 400, 0, 0])
        ws.append([None, "Electrolyser (load)", 72000, 0, 0, 0, 0])
        ws.append([None, "Lignite old 1", 0, 0, 0, 0, 0])
        ws.append(["Total hydro generation excluding pumping [GWh]", None, 12000, 0, 0, 0, 0])
        ws.append([tyndp.BALANCE[0], None, 41000, -1000, -29000, -100, 2000])
        if with_dump:
            ws.append([tyndp.BALANCE[1], None, 4700, 0, 100, 0, 0])
        ws.append([tyndp.CAPACITY, "Wind Onshore", 46000, 0, 0, 3250, 0])
        ws.append([None, "Battery Storage discharge (gen.)", 2214, 38726, 1786, 0, 0])
        xlsx = tmp_path / "MMStandardOutputFile_NT2030_Plexos_CY2009_2.5_v40.xlsx"
        wb.save(xlsx)
        arc = tmp_path / f"tyndp2024.MMStandardOutputFile_NT2030_Plexos_CY2009_{with_dump}.zip"
        with zipfile.ZipFile(arc, "w") as z:
            z.write(xlsx, xlsx.name)
        return arc

    df = tyndp.parse_mm_outputs(archive(True))
    got = {(r.zone, r.output, r.measure): r.value for r in df.itertuples()}
    bat, ev = "Battery Storage discharge (gen.)", "EV: Battery Storage discharge (gen.)"
    assert got == {("FI", "Wind Onshore", "twh"): 140.0, ("SE4", "Wind Onshore", "twh"): 5.0,
                   ("FI", "Solar (Photovoltaic)", "twh"): 19.0, ("FI", bat, "twh"): 1.0,
                   ("FI", ev, "twh"): 3.1, ("FI", "Electrolyser (load)", "twh"): 72.0,
                   ("FI", tyndp.BALANCE[0], "twh"): 12.0, ("FI", ev.replace(bat, tyndp.BALANCE[0]),
                                                          "twh"): -1.0,
                   ("SE4", tyndp.BALANCE[0], "twh"): -0.1, ("PL", tyndp.BALANCE[0], "twh"): 2.0,
                   ("FI", tyndp.BALANCE[1], "twh"): 4.8,
                   ("FI", "Wind Onshore", "mw"): 46000, ("SE4", "Wind Onshore", "mw"): 3250,
                   ("FI", bat, "mw"): 4000, ("FI", ev, "mw"): 38726}
    with pytest.raises(ValueError):
        tyndp.parse_mm_outputs(archive(False))


def test_tyndp2026_balance_reads_both_sheets(tmp_path):
    """R-BND-8: native, fixed and EV demand of the node on 'E-Market' and 'Prosumer', and the
    node's electrolyser load; another node's columns are ignored."""
    import io
    import zipfile

    import openpyxl

    from pipeline.sources import tyndp2026

    def sheet(wb, title, cols):
        ws = wb.create_sheet(title)
        for _ in range(5):
            ws.append(["x"])
        ws.append(["Market Zone", None] + [c[0] for c in cols])
        ws.append(["Category", None] + [c[1] for c in cols])
        ws.append(["Element", None] + [c[2] for c in cols])
        ws.append(["gen/load"])
        ws.append(["Hour of Year"])
        for h in range(1, 8761):
            ws.append([h, "t"] + [c[3] for c in cols])

    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    sheet(wb, "E-Market", [("FI00", "Native Demand [MW_e]", "FI00", 1000.0),
                           ("FI00", "Fixed Demand [MW_e]", "FI00", 100.0),
                           ("FI00", "EV charge (load) [MW_e]", "FI00 Street Fixed", 10.0),
                           ("FI00", "Electrolyzers to H2 Zone 2 [MW_e]",
                            "FI00-FIh2-P2G_emarket", 500.0),
                           ("FI00", "Marginal Cost [€/MWh_e]", "FI00", 40.0),
                           ("SE01", "Native Demand [MW_e]", "SE01", 9999.0)])
    sheet(wb, "Prosumer", [("FI00", "Native Demand [MW_e]", "FI00 Prosumer", 50.0)])
    buf = io.BytesIO()
    wb.save(buf)
    member = ("NT+_TimeSeriesDashboard/2035/Weather scenario 037/"
              "FI_TimeSeriesDashboard_TY2035_WS037_SoS.xlsx")
    z = tmp_path / "hourly.zip"
    with zipfile.ZipFile(z, "w") as f:
        f.writestr(member, buf.getvalue())
    [(zone, demand, electro)] = tyndp2026.parse_balance_member(z, member)
    assert zone == "FI"
    assert demand == pytest.approx(1160 * 8760 / 1e6) and electro == pytest.approx(500 * 8760 / 1e6)


def test_tyndp2026_outputs_close_the_balance_under_tyndp2024_labels(tmp_path):
    """R-BND-8, D-043: generation and loads by category over both sheets of the node, the net
    export from the 'Balance' columns, the dumped energy of each sheet's own node, and capacity
    from 'Installed Capacity' in MW; demand columns, another node's columns and hydrogen rows are
    left out; the labels are TYNDP 2024's."""
    import io
    import zipfile

    import openpyxl

    from pipeline.sources import tyndp2026

    def sheet(wb, title, cols):
        ws = wb.create_sheet(title)
        for _ in range(5):
            ws.append(["x"])
        ws.append(["Market Zone", None] + [c[0] for c in cols])
        ws.append(["Category", None] + [c[1] for c in cols])
        ws.append(["Element", None] + [c[2] for c in cols])
        ws.append(["Generation/Load", None] + [c[3] for c in cols])
        ws.append(["Hour of Year"])
        for h in range(1, 8761):
            ws.append([h, "t"] + [c[4] for c in cols])

    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    sheet(wb, "E-Market", [
        ("FI00", "Wind Onshore [MW_e]", "FI00 Wind Onshore", "Generation", 2000.0),
        ("FI00", "EV discharge (gen.) [MW_e]", "FI00 Street Fixed", "Generation", 10.0),
        ("FI00", "Battery Storage charge (load) [MW_e]", "FI00 Li-Ion", "Load", 20.0),
        ("FI00", "EV charge (load) [MW_e]", "FI00 Street Fixed", "Load", 30.0),
        ("FI00", "Electrolyzers to H2 Zone 2 [MW_e]", "FI00-FIh2-P2G_emarket", "Load", 500.0),
        ("FI00", "Native Demand [MW_e]", "FI00", "Load", 1000.0),
        ("FI00", "Balance [MW_e]", "Balance", "Generation - Load", 460.0),
        ("FI00", "RES curtailment [MW_e]", "FI00 Dump Energy", "Other", 5.0),
        ("FI00", "Marginal Cost [€/MWh_e]", "FI00", "Other", 40.0),
        ("SE01", "Wind Onshore [MW_e]", "SE01 Wind Onshore", "Generation", 9999.0)])
    sheet(wb, "Prosumer", [
        ("FI00RETE", "Solar (Photovoltaic) [MW_e]", "FI00RETE Solar PV Rooftop", "Generation",
         100.0),
        ("FI00RETE", "Native Demand [MW_e]", "FI00RETE", "Load", 300.0),
        ("FI00RETE", "Balance [MW_e]", "Balance", "Generation - Load", -200.0),
        ("FI00RETE", "RES curtailment [MW_e]", "FI00RETE Dump Energy", "Other", 1.0),
        ("FI00RETE", "RES curtailment [MW_e]", "FI00 Dump Energy", "Other", 777.0)])
    cap = wb.create_sheet("Installed Capacity")
    for row in [("Name", "E-Market", "Prosumer", "H2 Zone 2", "E-Market"),
                ("Zone", "FI00", "FI00RETE", "FIh2", "SE01"),
                ("Wind Onshore [GW_e]", 46.0, None, None, 5.0),
                ("Solar (Photovoltaic) [GW_e]", 14.0, 5.0, None, None),
                ("Li-Ion Battery Capacity [GW_e]", 6.36, None, None, None),
                ("Li-Ion Battery Volume [GWh_e]", 15.9, None, None, None),
                ("Electrolyzers P2G [GW_e]", 18.6, None, None, None),
                ("SMR [GW_H2]", None, None, 0.33, None)]:
        cap.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    member = ("NT+_TimeSeriesDashboard/2035/Weather scenario 037/"
              "FI_TimeSeriesDashboard_TY2035_WS037_SoS.xlsx")
    z = tmp_path / "hourly.zip"
    with zipfile.ZipFile(z, "w") as f:
        f.writestr(member, buf.getvalue())
    rows = tyndp2026.parse_output_member(z, member)
    assert {r[0] for r in rows} == {"FI"}
    twh = {r[1]: r[3] for r in rows if r[2] == "twh"}
    mw = {r[1]: r[3] for r in rows if r[2] == "mw"}
    k = 8760 / 1e6
    assert twh == pytest.approx({
        "Wind Onshore": 2000 * k, "EV: Battery Storage discharge (gen.)": 10 * k,
        "Solar (Photovoltaic)": 100 * k, "Battery Storage charge (load)": 20 * k,
        "Electrolyser (load)": 500 * k, tyndp2026.NET_EXPORT: 260 * k, tyndp2026.DUMP: 6 * k})
    assert mw == pytest.approx({"Wind Onshore": 46000, "Solar (Photovoltaic)": 19000,
                                "Battery Storage discharge (gen.)": 6360,
                                "Electrolyser (load)": 18600})
    # generation = demand (native and the cars' charging, parse_balance_member) + loads + export
    [(_, demand, _)] = tyndp2026.parse_balance_member(z, member)
    generation = (2000 + 10 + 100) * k
    assert generation == pytest.approx(demand + (20 + 500) * k + twh[tyndp2026.NET_EXPORT])


def test_jao_hub_spread_is_the_network_constraints_part(tmp_path):
    """D-075: the hub's price less its zone's from the constraints that bound the result, the
    link's own left out by name or by its two bidding zones; an MTU with none has 0."""
    base = {"cnecType": "BRANCH", "contName": "", "biddingZoneFrom": "SE3", "biddingZoneTo": "SE4",
            "ptdf_SE4": 0.0, "ptdf_SE4_NB": 0.0, "ptdf_FI": 0.0, "ptdf_FI_EL": 0.0}
    rows = [
        # 10:00 - a Swedish line the hub loads less than its zone: the hub is 50 x 0.1 = 5 dearer
        {**base, "dateTimeUtc": "2025-02-12T10:00:00Z", "cnecName": "line A", "shadowPrice": 50.0,
         "ptdf_SE4": 0.3, "ptdf_SE4_NB": 0.2},
        # ... the cable's own limit, anonymised: left out by its bidding zones
        {**base, "dateTimeUtc": "2025-02-12T10:00:00Z", "cnecName": "5248e56a",
         "shadowPrice": 300.0, "biddingZoneFrom": "SE4", "biddingZoneTo": "SE4_NB",
         "ptdf_SE4_NB": -1.0},
        # ... and EstLink's export limit: left out by its name
        {**base, "dateTimeUtc": "2025-02-12T10:00:00Z", "cnecName": "FI_PTC_FI_EL_EXPORT",
         "shadowPrice": 303.0, "biddingZoneFrom": "FI", "biddingZoneTo": "FI", "ptdf_FI_EL": -1.0},
        # 11:00 - only a Danish line, with no PTDF on either hub or zone
        {**base, "dateTimeUtc": "2025-02-12T11:00:00Z", "cnecName": "line DK", "shadowPrice": 9.0},
        # a constraint without a shadow price is not read
        {**base, "dateTimeUtc": "2025-02-12T11:00:00Z", "cnecName": "line B", "shadowPrice": None,
         "ptdf_SE4": 0.5},
    ]
    p = tmp_path / "jao.fbDomainShadowPrice.NORDIC.2025-02.json"
    p.write_text(json.dumps(rows))
    # an MTU with no binding constraint is absent from the file (the request asks for binding
    # ones): the month's maxNetPos gives every MTU, so without it the month is not read
    with pytest.raises(FileNotFoundError, match="maxNetPos"):
        jao.hub_spreads(p)
    (tmp_path / "jao.maxNetPos.NORDIC.2025-02.json").write_text(json.dumps(
        [{"dateTimeUtc": f"2025-02-12T{h}:00:00Z", "max_SE4_NB": 700.0} for h in (10, 11, 12)]))
    df = jao.hub_spreads(p).set_index(["column", "ts"]).value
    assert df["spread_SE4_NB", pd.Timestamp("2025-02-12 10:00")] == pytest.approx(5.0)
    assert df["spread_SE4_NB", pd.Timestamp("2025-02-12 11:00")] == 0.0
    assert df["spread_FI_EL", pd.Timestamp("2025-02-12 10:00")] == 0.0
    assert df["spread_SE4_NB", pd.Timestamp("2025-02-12 12:00")] == 0.0 and len(df) == 6
    # a month in which no constraint bound: every MTU at 0, not an empty month
    p.write_text("[]")
    df = jao.hub_spreads(p)
    assert len(df) == 6 and (df.value == 0).all()


def test_jao_core_spread_is_the_allocation_constraints_shadow_price(tmp_path):
    """D-076: what Poland's price stands above Germany's by, less the network constraints' part,
    is the shadow price of Poland's allocation constraint where the limit can bind; the cables
    clear that much lower."""
    t = "2024-01-28T0{}:00:00Z".format
    spread = [{"dateTimeUtc": t(1), "border_DE_PL": 20.0},    # the import limit binds
              {"dateTimeUtc": t(2), "border_DE_PL": 6.0},     # the network alone
              {"dateTimeUtc": t(3), "border_DE_PL": -4.0},    # the export limit binds
              {"dateTimeUtc": t(4), "border_DE_PL": 9.0},     # the import limit is out of reach
              {"dateTimeUtc": t(5), "border_DE_PL": None}]    # not published
    shadow = [{"id": 1, "dateTimeUtc": t(1), "shadowPrice": 30.0, "hub_DE": 0.1, "hub_PL": -0.1},
              {"id": 2, "dateTimeUtc": t(2), "shadowPrice": 30.0, "hub_DE": 0.1, "hub_PL": -0.1},
              {"id": 2, "dateTimeUtc": t(2), "shadowPrice": 30.0, "hub_DE": 0.1,   # a window's
               "hub_PL": -0.1},                                                    # overlap
              {"id": 3, "dateTimeUtc": t(2), "shadowPrice": 5.0, "hub_DE": None, "hub_PL": None}]
    # Core net position (export +) and the limits: 01:00 exports 200 with no import allowed, the
    # cables can bring the 200 in; 03:00 exports 3 000 of an allowed 3 500; 04:00 imports 1 000
    # of an allowed 5 000, which two cables of 1 100 MW cannot fill
    netpos = [{"dateTimeUtc": t(h), "hub_PL": v}
              for h, v in ((1, 200.0), (2, 0.0), (3, 3000.0), (4, -1000.0), (5, 0.0))]
    limits = [{"dateTimeUtc": t(h), "limitDown_PL": lo, "limitUp_PL": up}
              for h, lo, up in ((1, 0, 6000), (2, 0, 6000), (3, 2000, 3500), (4, 5000, 6000),
                                (5, 0, 0))]
    for ep, rows in (("priceSpread", spread), ("shadowPrices", shadow), ("netPos", netpos),
                     ("allocationConstraint", limits)):
        (tmp_path / f"jao.{ep}.CORE.2024-01.json").write_text(json.dumps(rows))
    df = jao.core_spread(tmp_path / "jao.shadowPrices.CORE.2024-01.json").set_index("ts").value
    assert df[pd.Timestamp("2024-01-28 01:00")] == pytest.approx(-14.0)
    assert df[pd.Timestamp("2024-01-28 02:00")] == pytest.approx(0.0)
    assert df[pd.Timestamp("2024-01-28 03:00")] == pytest.approx(4.0)
    assert df[pd.Timestamp("2024-01-28 04:00")] == 0.0
    assert len(df) == 4


def _btd(path, columns, rows):
    cols = [{"index": i, "col": i, "res": "PT15M", **c} for i, c in enumerate(columns)]
    path.write_text(json.dumps({"error": False, "message": "", "data": {
        "columns": cols, "timeseries": [{"from": f, "values": v} for f, v in rows]}}))
    return path


def test_btd_balancing_capacity_per_border_direction_and_product(tmp_path):
    cols = [{"label": p, "group_level_0": g} for p, g in (
        ("aFRR", "EE to LV"), ("mFRR", "LV to EE"), ("aFRR", "LV to LT"), ("mFRR", "LT to LV"))]
    p = _btd(tmp_path / "btd.json", cols, [("2025-10-01T00:00:00+00:00", [112, 242, None, 320]),
                                           ("2025-10-01T03:15:00+03:00", [1.5, 0, 36, None])])
    df = btd.parse(p)
    got = {(r.ts, r.border, r.direction, r.product): r.value for r in df.itertuples()}
    t0, t1 = pd.Timestamp("2025-10-01 00:00"), pd.Timestamp("2025-10-01 00:15")
    assert got == {(t0, "EE-LV", "fwd", "aFRR"): 112.0, (t0, "EE-LV", "rev", "mFRR"): 242.0,
                   (t0, "LV-LT", "rev", "mFRR"): 320.0, (t1, "EE-LV", "fwd", "aFRR"): 1.5,
                   (t1, "EE-LV", "rev", "mFRR"): 0.0, (t1, "LV-LT", "fwd", "aFRR"): 36.0}
    with pytest.raises(ValueError):                       # a row shorter than the columns
        btd.parse(_btd(tmp_path / "short.json", cols, [("2025-10-01T00:00:00+00:00", [1, 2])]))
    (tmp_path / "err.json").write_text(json.dumps({"error": True, "message": "no such report"}))
    with pytest.raises(RuntimeError, match="no such report"):
        btd.parse(tmp_path / "err.json")


def test_btd_reserves_hourly_average_of_the_quarters_held(tmp_path):
    cols = [{"label": "Symetric", "group_level_0": "Estonia", "group_level_1": "FCR reserves"},
            {"label": "Upward", "group_level_0": "Lithuania", "group_level_1": "mFRR reserves"}]
    quarters = [("2025-10-01T00:00:00+00:00", [20, 100]), ("2025-10-01T00:15:00+00:00", [22, None]),
                ("2025-10-01T00:30:00+00:00", [24, 110]), ("2025-10-01T00:45:00+00:00", [26, 120]),
                ("2025-10-01T01:00:00+00:00", [30, None])]
    df = btd.parse_reserves(_btd(tmp_path / "res.json", cols, quarters))
    got = {(r.ts, r.zone, r.product, r.direction): r.mw for r in df.itertuples()}
    h0, h1 = pd.Timestamp("2025-10-01 00:00"), pd.Timestamp("2025-10-01 01:00")
    assert got == {(h0, "EE", "FCR", "sym"): 23.0, (h0, "LT", "mFRR", "up"): 110.0,
                   (h1, "EE", "FCR", "sym"): 30.0}      # an hour without a value has no row


def test_fingrid_interval_start_in_utc(tmp_path):
    p = tmp_path / "fingrid.json"
    p.write_text(json.dumps([{"datasetId": 112, "startTime": "2020-01-01T00:00:00.000Z",
                              "endTime": "2020-01-01T01:00:00.000Z", "value": 358},
                             {"datasetId": 112, "startTime": "2020-03-29T01:00:00.000Z",
                              "endTime": "2020-03-29T02:00:00.000Z", "value": 0}]))
    df = fingrid.parse(p)
    assert list(df.columns) == ["ts", "value"] and df.value.dtype == float
    assert list(df.ts) == [pd.Timestamp("2020-01-01 00:00"), pd.Timestamp("2020-03-29 01:00")]
    assert list(df.value) == [358.0, 0.0]


def test_fingrid_series_ended_keeps_nothing_after_its_end(tmp_path):
    """Fingrid ended 112 and 115 on 29 September 2026; the 0 MW it serves after that is not a
    capacity (ERRATA E-195)."""
    rows = [{"datasetId": 112, "startTime": t, "endTime": t, "value": v}
            for t, v in (("2026-09-29T21:00:00.000Z", 1016), ("2026-10-01T22:00:00.000Z", 0))]
    p = tmp_path / "fingrid.112.da_cap_ee_fi_mw.2026-10.json"
    p.write_text(json.dumps(rows))
    assert list(fingrid.parse(p).value) == [1016.0]
    q = tmp_path / "fingrid.55.estlink_mw.2026-10.json"      # the flow goes on
    q.write_text(json.dumps(rows))
    assert len(fingrid.parse(q)) == 2
    assert fingrid.ended("da_cap_fi_ee_mw", 2026, 10)
    assert not fingrid.ended("da_cap_fi_ee_mw", 2026, 9)
    assert not fingrid.ended("estlink_mw", 2030, 1)


def test_irena_cross_certificate_links_its_root_to_one_certifi_trusts():
    # R1, signed by G2 (the chain IRENA's server leaves incomplete); G2 is among certifi's roots
    import ssl

    import requests

    ctx = ssl.create_default_context(cafile=requests.certs.where())
    ctx.load_verify_locations(cadata=irena.R1_CROSS_G2)
    cn = [dict(x[0] for x in cast(tuple, c["subject"])).get("commonName")
          for c in ctx.get_ca_certs()]
    assert "GoDaddy TLS Root CA - R1" in cn and "Go Daddy Root Certificate Authority - G2" in cn


def test_nordpool_curves_parse_both_sides_of_every_mtu_and_skip_a_missing_side(tmp_path):
    """The portal pairs a supply and a demand point in each row of `seriesData`; a row may
    lack one side."""
    import gzip

    from pipeline.sources import nordpool
    body = {"marketCode": "NPSDA", "aggregatedBiddingArea": "BALTIC", "deliveryDate": "2026-10-08",
            "aggregatedPoints": [{"deliveryStart": "2026-10-07T22:00:00Z",
                                  "deliveryEnd": "2026-10-07T22:15:00Z", "hourOfDay": 1,
                                  "seriesData": [
                                      {"demandPrice": 4000, "supplyPrice": -600,
                                       "demandQuantity": 2093.8, "supplyQuantity": 1908.9},
                                      {"demandPrice": 100, "supplyPrice": None,
                                       "demandQuantity": 2200.0, "supplyQuantity": None}]}]}
    p = tmp_path / "nordpool.abc.BALTIC.2026-10-08.gz"
    p.write_bytes(gzip.compress(json.dumps(body).encode()))
    df = nordpool.parse(p)
    assert len(df) == 3 and set(df.side) == {"supply", "demand"}
    assert df.start.iloc[0] == pd.Timestamp("2026-10-07 22:00")
    sup = df[df.side == "supply"].iloc[0]
    assert (sup.price, sup.mw, sup.cluster) == (-600.0, 1908.9, "BALTIC")


def test_nordpool_fetch_holds_only_a_complete_day_and_asks_for_it_once(tmp_path, monkeypatch):
    """D-108: a day held is never asked for again, so an incomplete one is kept aside."""
    import io
    from datetime import date

    from pipeline.sources import nordpool_fetch as nf
    bodies: Iterator[dict] = iter([{"aggregatedPoints": [{}] * 95},
                                   {"aggregatedPoints": [{}] * 96}])
    monkeypatch.setattr(nf.urllib.request, "urlopen",
                        lambda req, timeout: io.BytesIO(json.dumps(next(bodies)).encode()))
    day = date(2026, 10, 9)
    assert nf.fetch("FI", day, tmp_path) == "incomplete (95 of 96 MTUs)"
    assert [p.name for p in tmp_path.iterdir()] == ["nordpool.abc.FI.2026-10-09.partial"]
    assert nf.fetch("FI", day, tmp_path) == "fetched"
    assert nf.fetch("FI", day, tmp_path) == "held"      # no third body: no request
    assert [nf.expected_mtus(date(2026, 10, d)) for d in (24, 25, 26)] == [96, 100, 96]
    assert nf.expected_mtus(date(2027, 3, 28)) == 92


def test_nordpool_spool_import_keeps_the_fetch_time_and_skips_held_days(tmp_path, monkeypatch):
    import gzip
    import os
    from datetime import UTC, datetime

    from pipeline.sources import nordpool
    monkeypatch.setenv("ENERGIAMUDEL_RAW", str(tmp_path / "raw"))
    monkeypatch.setenv("ENERGIAMUDEL_LINEAGE", str(tmp_path / "lineage"))
    spool = tmp_path / "spool"
    spool.mkdir()
    f = spool / "nordpool.abc.FI.2026-10-09.gz"
    f.write_bytes(gzip.compress(json.dumps({"aggregatedPoints": [{}] * 96}).encode()))
    (spool / "nordpool.abc.FI.2026-10-10.partial").write_bytes(b"incomplete")
    t = datetime(2026, 10, 8, 21, 30, tzinfo=UTC).timestamp()
    os.utime(f, (t, t))
    assert [p.name for p in nordpool.import_spool(spool)] == [f.name]
    rec = json.loads((tmp_path / "lineage" / "nordpool.abc.FI.2026-10-09.json").read_text())
    assert rec["fetched_at"] == "2026-10-08T21:30:00+00:00"
    assert rec["params"]["clusterName"] == "FI" and rec["notes"].startswith("96 MTUs")
    assert nordpool.import_spool(spool) == []


def test_entsoe_outage_pages_stop_at_the_acknowledgement_and_fail_on_anything_else(monkeypatch):
    """M5 of the review (2026-10-18): a failed page ended the paging; the partial zip was kept."""
    import io
    import zipfile

    from pipeline.sources import entsoe

    def page(names):
        b = io.BytesIO()
        with zipfile.ZipFile(b, "w") as z:
            for n in names:
                z.writestr(f"x-{n}.xml", "<doc/>")
        return b.getvalue()

    class Reply:
        def __init__(self, content, status=200):
            self.content, self.status_code, self.ok = content, status, status < 400

    ack = b"<Acknowledgement_MarketDocument><Reason><text>No matching data found</text></Reason>"
    monkeypatch.setattr(entsoe, "_pace", lambda: None)
    monkeypatch.setattr(entsoe, "_token", lambda: "t")
    for replies, ok in (([page("ab"), page("c")], 3), ([page("ab"), Reply(ack, 200)], 2),
                        ([page("ab"), Reply(b"<html>busy</html>", 503)], None)):
        class Session:
            def __init__(self, replies):
                self.replies = iter(r if isinstance(r, Reply) else Reply(r) for r in replies)

            def get(self, *a, **k):
                return next(self.replies)

        session = Session(replies)
        if ok is None:
            with pytest.raises(RuntimeError, match="HTTP 503"):
                entsoe._paged_zip(cast(requests.Session, session), {}, page=2)
        else:
            with zipfile.ZipFile(io.BytesIO(entsoe._paged_zip(cast(requests.Session, session), {},
                                                               page=2))) as z:
                assert len(z.namelist()) == ok


def test_history_leaves_out_a_document_that_cannot_be_cached():
    """`make history` exits 1 on any failure; a document the publisher refuses is not one."""
    labels = {label for label, _ in history.jobs()}
    for key, d in documents.DOCS.items():
        assert (f"document {key}" in labels) == d.get("cacheable", True), key
    assert "document tge_otf_2026_10_09" not in labels


def test_a_monthly_vintage_without_the_month_before_is_not_kept(tmp_path, monkeypatch):
    """Fetched before the release, a vintage would be cached with the old months for good."""
    monkeypatch.setenv("ENERGIAMUDEL_RAW", str(tmp_path / "raw"))
    monkeypatch.setenv("ENERGIAMUDEL_LINEAGE", str(tmp_path / "lineage"))
    ds = "ecb.exr.USD-EUR.M.2026-10"
    raw = tmp_path / "raw" / "ecb" / f"{ds}.csv"
    raw.parent.mkdir(parents=True)
    for last, kept in (("2026-08", False), ("2026-09", True)):
        body = f"KEY,TIME_PERIOD,OBS_VALUE\nEXR.M.USD.EUR.SP00.A,{last},1.15\n".encode()
        raw.write_bytes(body)
        rec = lineage.measured(ds, "ECB", "https://example", {}, body, "open")
        rec.write()
        if kept:
            assert ecb.fetch("2026-10") == raw
        else:
            with pytest.raises(RuntimeError, match="not published yet"):
                ecb.fetch("2026-10")
        assert raw.exists() == kept and rec.path().exists() == kept
