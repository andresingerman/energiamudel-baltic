"""Build the export: the files the browser engine and the panel read (SPECIFICATION.md R-DATA-8;
docs/PLAN.md §3.2; DECISIONS D-013 to D-015).

Run:  make export        (reads data/energiamudel.duckdb; writes data/export/)

  years/<key>.json.gz        engine input per year: 2020 ... this year (observed), cy1995, cy2008,
                             cy2009 (TYNDP 2024), ws003 ... ws106 (TYNDP 2026 NT+)
  validation/<key>.json.gz   what the model is measured against; never an engine input
  attribution/<year>.json.gz labels behind the observed transfer capacity (R-LINK-6)
  presets.json               every documentary value the panel offers, with its lineage ids
  links.json.gz              scenario transfer capacities (R-LINK-3)
  sources.json.gz            what every lineage id named anywhere in the export is (R-APP-9)
  manifest.json              per file: SHA-256, size, and the lineage ids of every series

Every year file is validated against schema/year.schema.json before it is written. The same
database gives the same bytes (R-DATA-5): `make check` rebuilds the export and compares.
"""

from __future__ import annotations

import ast
import hashlib
import json
import sys
from pathlib import Path

import duckdb
import jsonschema

from db import db_path
from pipeline import DATA_DIR, ROOT

from . import tables, write, years

OUT = DATA_DIR / "export"
SCHEMA = ROOT / "schema"
FIRST_YEAR = 2020
CLIMATE_YEARS = (1995, 2008, 2009)


PACKAGES = ("db", "export", "pipeline", "reference", "validate")


def code_hash() -> str:
    """The export's code and contract: every file that decides the bytes of the output — the
    export's modules and every module of the repository they import (the register's purposes, the
    documents, the configuration), the schemas, and the fitted register they read."""
    h = hashlib.sha256()
    fitted = DATA_DIR / "derived" / "fitted_parameters.json"
    for p in sorted({*_imported(ROOT / "export"), *SCHEMA.glob("*.json"), fitted}):
        h.update(p.relative_to(ROOT).as_posix().encode() + b"\0" + p.read_bytes())
    return h.hexdigest()


def _imported(package: Path) -> set[Path]:
    """`package`'s modules and the repository's modules they import, directly or through one
    another, read off the source (the same in every process, whatever else it imported)."""
    todo, seen = sorted(package.glob("*.py")), set()
    while todo:
        f = todo.pop()
        if f in seen:
            continue
        seen.add(f)
        for node in ast.walk(ast.parse(f.read_text())):
            if isinstance(node, ast.Import):
                names = [a.name for a in node.names]
            elif isinstance(node, ast.ImportFrom):
                parts = f.parent.relative_to(ROOT).parts      # a relative import goes up level − 1
                pkg = list(parts[: len(parts) - node.level + 1]) if node.level else []
                base = ".".join([*pkg, *([node.module] if node.module else [])])
                names = [base, *(f"{base}.{a.name}" for a in node.names)]
            else:
                continue
            for n in names:
                if n.split(".")[0] in PACKAGES:
                    stem = ROOT.joinpath(*n.split("."))
                    todo += [c for c in (stem.with_suffix(".py"), stem / "__init__.py")
                             if c.exists()]
    return seen


def _validator(name: str) -> jsonschema.Draft202012Validator:
    return jsonschema.Draft202012Validator(json.loads((SCHEMA / name).read_text()))


def build(out: Path = OUT, con=None, last_year: int | None = None) -> dict:
    own = con is None
    if own:                                   # read-only: the export never writes the database
        con = duckdb.connect(str(db_path()), read_only=True)
    year_v = _validator("year.schema.json")
    params = tables.parameters(con)
    files: dict = {}

    def put(rel: str, obj, lin, compress: bool = True, validator=None):
        if validator is not None:
            errors = sorted(validator.iter_errors(obj), key=lambda e: list(e.path))
            if errors:
                e = errors[0]
                raise ValueError(f"{rel}: {'/'.join(map(str, e.path))}: {e.message[:200]}")
        files[rel] = {**write.write(out / rel, obj, compress), "series": lin.as_json()}
        print(f"{rel}: {files[rel]['bytes']:,} bytes", flush=True)

    last = last_year or years.last_observed_year(con)
    for y in range(FIRST_YEAR, last + 1):
        obj, lin, _ = years.observed(con, y, params)
        put(f"years/{y}.json.gz", obj, lin, validator=year_v)
        val, vlin = years.validation_observed(con, y, obj["meta"]["hours"])
        put(f"validation/{y}.json.gz", val, vlin)
        att, alin = years.attribution(con, y)
        put(f"attribution/{y}.json.gz", att, alin)
    labels = years.ranks(con)
    for cy in CLIMATE_YEARS:
        obj, lin, _ = years.climate(con, cy, params, labels[cy])
        put(f"years/cy{cy}.json.gz", obj, lin, validator=year_v)
        val, vlin = years.validation_scenario(con, f"cy{cy}", "tyndp2024", cy)
        put(f"validation/cy{cy}.json.gz", val, vlin)
    codes = [r[0] for r in con.execute("SELECT code FROM tyndp2026_weather ORDER BY code")
             .fetchall()]
    for code in codes:
        obj, lin, _ = years.weather(con, code, params)
        put(f"years/{code.lower()}.json.gz", obj, lin, validator=year_v)
        val, vlin = years.validation_scenario(con, code.lower(), "tyndp2026", code)
        put(f"validation/{code.lower()}.json.gz", val, vlin)
    pre, plin = tables.presets(con, params)
    put("presets.json", pre, plin, compress=False, validator=_validator("presets.schema.json"))
    lnk, llin = tables.links(con)
    put("links.json.gz", lnk, llin, validator=_validator("links.schema.json"))
    ids = {i for f in files.values() for v in f["series"].values() for i in v}
    src = tables.sources(con, ids)
    put("sources.json.gz", src, years.Lineage())
    manifest = {"contract": 1, "code": code_hash(),
                "export": hashlib.sha256(write.dumps(
                    {k: v["sha256"] for k, v in sorted(files.items())})).hexdigest(),
                "files": files}
    errors = list(_validator("manifest.schema.json").iter_errors(manifest))
    if errors:
        raise ValueError(f"manifest.json: {errors[0].message[:200]}")
    write.write(out / "manifest.json", manifest, compress=False)
    if own:
        con.close()
    return manifest


def main() -> int:
    m = build()
    print(f"manifest.json: {len(m['files'])} files, export {m['export'][:12]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
