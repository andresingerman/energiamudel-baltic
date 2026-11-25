"""R-NFR-7, R-DATA-8: the committed export meets its contract — presets.json, links.json.gz and
manifest.json validate against schema/, a sample of the year files against year.schema.json, and the
manifest names the code that wrote it (ERRATA E-050)."""

import json

import jsonschema
import pytest

from export import write
from export.__main__ import code_hash
from pipeline import DATA_DIR, ROOT

OUT = DATA_DIR / "export"


def _schema(name):
    return json.loads((ROOT / "schema" / name).read_text())


@pytest.mark.parametrize(("file", "schema"), [("presets.json", "presets.schema.json"),
                                              ("links.json.gz", "links.schema.json"),
                                              ("manifest.json", "manifest.schema.json"),
                                              ("years/2024.json.gz", "year.schema.json"),
                                              ("years/cy2009.json.gz", "year.schema.json"),
                                              ("years/ws037.json.gz", "year.schema.json")])
def test_committed_export_files_meet_their_schema(file, schema):
    jsonschema.validate(write.read(OUT / file), _schema(schema))


def test_manifest_names_the_code_that_wrote_it():
    assert write.read(OUT / "manifest.json")["code"] == code_hash()


def test_the_site_lists_only_the_source_families_its_data_uses(tmp_path, monkeypatch):
    """D-108: Nord Pool's curves are in the register but never in the export, so not on the site."""
    from export import tables
    from pipeline import lineage
    monkeypatch.setenv("ENERGIAMUDEL_LINEAGE", str(tmp_path))
    lineage.measured(dataset="entsoe.A44.EE.2026-08", source="ENTSO-E", endpoint="https://x",
                     params={}, content=b"x", licence="open").write()
    out = tables.sources(None, {"entsoe.A44.EE.2026-08"})
    assert set(out["families"]) == {"entsoe"} and "nordpool" in tables.PURPOSE
