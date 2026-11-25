"""The register names every source's use and the software behind the numbers (R-DOC-5)."""

from pipeline import register
from pipeline.sources import documents


def test_every_measured_source_and_document_has_a_purpose():
    for src, (name, url, access, purpose, _tables) in register.PURPOSE.items():
        assert name and url.startswith("https://") and access and len(purpose) > 40, src
    for key, d in documents.DOCS.items():
        assert d["url"].startswith("https://") and d["title"], key
        assert d["ext"] in ("pdf", "html", "json", "csv", "xlsx"), key  # csv, xlsx: D-214


def test_software_section_renders():
    assert any(w[0] == "HiGHS" for w in register.SOFTWARE)
    assert all(w[1].startswith("https://") and w[2] for w in register.SOFTWARE)
    assert "## Software" in register.render()
