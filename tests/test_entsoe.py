from datetime import datetime

from pipeline.sources import entsoe

NS = 'xmlns="urn:iec62325.351:tc57wg16:451-6:generationloaddocument:3:0"'


def _doc(periods: str, psr: str = "", curve: str = "A01") -> bytes:
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<GL_MarketDocument {NS}>
  <TimeSeries>
    <in_Domain.mRID codingScheme="A01">10Y1001A1001A39I</in_Domain.mRID>
    <curveType>{curve}</curveType>
    {psr}
    {periods}
  </TimeSeries>
</GL_MarketDocument>""".encode()


def _period(start, end, res, points):
    pts = "".join(f"<Point><position>{p}</position><quantity>{q}</quantity></Point>"
                  for p, q in points)
    return (f"<Period><timeInterval><start>{start}</start><end>{end}</end></timeInterval>"
            f"<resolution>{res}</resolution>{pts}</Period>")


def test_hourly_period_parses_to_utc_starts(tmp_path):
    xml = _doc(_period("2025-01-01T00:00Z", "2025-01-01T03:00Z", "PT60M",
                       [(1, 10), (2, 20), (3, 30)]))
    p = tmp_path / "x.xml"
    p.write_bytes(xml)
    df = entsoe.parse(p)
    assert list(df["value"]) == [10.0, 20.0, 30.0]
    assert df["ts"].iloc[0] == datetime(2025, 1, 1, 0, 0)
    assert df["ts"].iloc[2] == datetime(2025, 1, 1, 2, 0)
    assert df["minutes"].unique().tolist() == [60]


def test_quarter_hour_resamples_to_hourly_mean(tmp_path):
    xml = _doc(_period("2025-10-01T00:00Z", "2025-10-01T02:00Z", "PT15M",
                       [(i, v) for i, v in enumerate([1, 2, 3, 4, 10, 10, 10, 10], start=1)]))
    p = tmp_path / "x.xml"
    p.write_bytes(xml)
    hourly = entsoe.to_hourly(entsoe.parse(p), by=())
    assert len(hourly) == 2
    assert hourly["value"].tolist() == [2.5, 10.0]


def test_a03_curve_fills_omitted_positions_forward(tmp_path):
    # A03: positions 2 and 3 are omitted because their value repeats position 1.
    xml = _doc(_period("2025-01-01T00:00Z", "2025-01-01T04:00Z", "PT60M",
                       [(1, 5), (4, 7)]), curve="A03")
    p = tmp_path / "x.xml"
    p.write_bytes(xml)
    df = entsoe.parse(p)
    assert df["value"].tolist() == [5.0, 5.0, 5.0, 7.0]


def test_psr_type_maps_to_model_tech(tmp_path):
    xml = _doc(_period("2025-01-01T00:00Z", "2025-01-01T01:00Z", "PT60M", [(1, 1)]),
               psr="<MktPSRType><psrType>B19</psrType></MktPSRType>")
    p = tmp_path / "x.xml"
    p.write_bytes(xml)
    df = entsoe.parse(p)
    assert df["psr_type"].iloc[0] == "B19"
    assert df["tech"].iloc[0] == "wind_onshore"


def test_build_params_maps_zone_and_border_domains():
    p = entsoe.build_params("A44", zone="SE4", start=datetime(2025, 1, 1), end=datetime(2025, 2, 1))
    assert p["in_Domain"] == p["out_Domain"] == "10Y1001A1001A47J"
    assert p["periodStart"] == "202501010000" and p["periodEnd"] == "202502010000"
    f = entsoe.build_params("A11", border="EE-FI")
    assert f["out_Domain"] == "10Y1001A1001A39I" and f["in_Domain"] == "10YFI-1--------U"
    r = entsoe.build_params("A11", border="EE-FI", reverse=True)
    assert r["out_Domain"] == "10YFI-1--------U" and r["in_Domain"] == "10Y1001A1001A39I"
    lo = entsoe.build_params("A65", zone="PL")
    assert lo["outBiddingZone_Domain"] == "10YPL-AREA-----S" and lo["processType"] == "A16"
    npos = entsoe.build_params("A25", zone="EE")
    assert npos["in_Domain"] == npos["out_Domain"] == "10Y1001A1001A39I"
    assert npos["businessType"] == "B09" and npos["contract_MarketAgreement.Type"] == "A01"
    units = entsoe.build_params("A95", zone="EE", start=datetime(2026, 1, 1),
                                end=datetime(2027, 1, 1))
    assert units["BiddingZone_Domain"] == "10Y1001A1001A39I" and "periodStart" not in units
    assert units["Implementation_DateAndOrTime"] == "2026-01-01"


def test_dataset_id_convention():
    s = datetime(2025, 3, 1)
    assert entsoe.dataset_id("A44", "EE", None, False, s) == "entsoe.A44.EE.2025-03"
    assert entsoe.dataset_id("A11", None, "LT-SE4", True, s) == "entsoe.A11.LT-SE4.rev.2025-03"


def test_month_window_handles_december():
    assert entsoe.month_window(2024, 12) == (datetime(2024, 12, 1), datetime(2025, 1, 1))


def test_generating_units_one_row_per_unit(tmp_path):
    """A95: a production unit with two generating units gives two rows with their own power."""
    unit = """<GeneratingUnit_PowerSystemResources><mRID codingScheme="A01">{c}</mRID>
      <name>{n}</name><nominalP unit="MAW">{p}</nominalP>
      <generatingUnit_PSRType.psrType>B07</generatingUnit_PSRType.psrType>
      </GeneratingUnit_PowerSystemResources>"""
    ns = "urn:iec62325.351:tc57wg16:451-6:configurationdocument:3:0"
    xml = f"""<Configuration_MarketDocument xmlns="{ns}">
      <TimeSeries><registeredResource.mRID codingScheme="A01">38W-X</registeredResource.mRID>
      <registeredResource.name>Eesti Elektrijaam</registeredResource.name>
      <MktPSRType><psrType>B07</psrType>
      <nominalIP_PowerSystemResources.nominalP unit="MAW">358
      </nominalIP_PowerSystemResources.nominalP>
      {unit.format(c="G5", n="Eesti Elektrijaam- TG5", p=164)}
      {unit.format(c="G8", n="Eesti Elektrijaam- TG8", p=194)}
      </MktPSRType></TimeSeries></Configuration_MarketDocument>"""
    path = tmp_path / "a95.xml"
    path.write_text(xml)
    df = entsoe.parse_generating_units(path)
    assert list(df.name) == ["Eesti Elektrijaam- TG5", "Eesti Elektrijaam- TG8"]
    assert list(df.mw) == [164.0, 194.0] and set(df.production) == {"Eesti Elektrijaam"}
    assert set(df.tech) == {entsoe.PSR_TO_TECH["B07"]}


def test_a_price_series_in_another_currency_is_left_out(tmp_path):
    # Poland's day-ahead documents before 2020 hold each day twice, in PLN and in EUR (E-074)
    per = _period("2018-05-01T00:00Z", "2018-05-01T02:00Z", "PT60M", [(1, 40), (2, 42)])
    pln = _period("2018-05-01T00:00Z", "2018-05-01T02:00Z", "PT60M", [(1, 170), (2, 180)])
    xml = (_doc(per).decode()
           .replace("<curveType>", "<currency_Unit.name>EUR</currency_Unit.name><curveType>", 1)
           .replace("</TimeSeries>", "</TimeSeries><TimeSeries><currency_Unit.name>PLN"
                    "</currency_Unit.name><curveType>A01</curveType>" + pln + "</TimeSeries>", 1))
    p = tmp_path / "pl.xml"
    p.write_text(xml)
    assert list(entsoe.parse(p)["value"]) == [40.0, 42.0]


def test_a_weekly_period_across_the_spring_clock_change_keeps_its_last_week(tmp_path):
    # Monday 00:00 EET to Monday 00:00 EEST: five weeks less an hour (A72)
    xml = _doc(_period("2024-02-25T22:00Z", "2024-03-31T21:00Z", "P7D",
                       [(i, 1000 * i) for i in range(1, 6)]))
    p = tmp_path / "x.xml"
    p.write_bytes(xml)
    assert entsoe.parse(p)["value"].tolist() == [1000.0, 2000.0, 3000.0, 4000.0, 5000.0]



def test_a_month_so_far_has_an_id_of_its_own(tmp_path, monkeypatch):
    """D-257: the month in progress to a day is cached apart from the whole month, so that the whole
    month is still fetched once complete and, sorting after it, replaces its hours; a day outside
    the month is refused."""
    import pytest
    monkeypatch.setenv("ENERGIAMUDEL_RAW", str(tmp_path))
    (tmp_path / "entsoe").mkdir()
    cached = tmp_path / "entsoe" / "entsoe.A44.EE.2026-11.to-2026-11-23.xml"
    cached.write_text("<cached/>")                  # an existing file is returned, no request
    assert entsoe.fetch("A44", 2026, 11, zone="EE", until=datetime(2026, 11, 23)) == cached
    assert sorted([cached.name, "entsoe.A44.EE.2026-11.xml"])[-1] == "entsoe.A44.EE.2026-11.xml"
    with pytest.raises(ValueError, match="not inside the month"):
        entsoe.fetch("A44", 2026, 11, zone="EE", until=datetime(2026, 12, 1))
