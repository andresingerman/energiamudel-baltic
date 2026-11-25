import json

import pytest

from pipeline import lineage


def test_measured_record_round_trips(tmp_path):
    body = b"<xml>hello</xml>"
    rec = lineage.measured(
        dataset="entsoe.A44.EE.2025-01", source="ENTSO-E", endpoint="https://x/api",
        params={"documentType": "A44"}, content=body, licence="terms", rows=744,
    )
    p = rec.write(tmp_path)
    assert p.name == "entsoe.A44.EE.2025-01.json"
    back = lineage.LineageRecord.read(p)
    assert back == rec
    assert back.sha256 == lineage.sha256_of(body)
    assert back.is_measured
    assert back.fetched_at.endswith("+00:00")


def test_documentary_record_requires_page(tmp_path):
    rec = lineage.documentary(
        dataset="fingrid.scenario2035.FI", source="Fingrid", url="https://x/report.pdf",
        page="p. 12, table 3", licence="Fingrid",
    )
    rec.write(tmp_path)
    rec.page = None
    with pytest.raises(ValueError, match="page"):
        rec.validate()


def test_measured_record_rejects_page():
    rec = lineage.measured("a.b", "s", "e", {}, b"x", "l")
    rec.page = "p. 1"
    with pytest.raises(ValueError, match="page"):
        rec.validate()


def test_dataset_id_must_be_dotted_source_first():
    with pytest.raises(ValueError):
        lineage.measured("entsoe", "s", "e", {}, b"x", "l").validate()
    with pytest.raises(ValueError):
        lineage.measured("ENTSOE.A44", "s", "e", {}, b"x", "l").validate()


def test_derived_record_links_inputs(tmp_path):
    rec = lineage.derived("pipeline.cf.wind_onshore.EE.2025",
                          ["entsoe.A75.EE.2025-01", "entsoe.A68.EE.2025"], notes="gen / cap")
    rec.write(tmp_path)
    d = json.loads(rec.path(tmp_path).read_text())
    assert d["derived_from"] == ["entsoe.A75.EE.2025-01", "entsoe.A68.EE.2025"]


def test_read_all_is_sorted_and_validated(tmp_path):
    lineage.measured("b.two", "s", "e", {}, b"2", "l").write(tmp_path)
    lineage.measured("a.one", "s", "e", {}, b"1", "l").write(tmp_path)
    assert [r.dataset for r in lineage.read_all(tmp_path)] == ["a.one", "b.two"]
