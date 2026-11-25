"""The build-time database.

DuckDB, one file, git-ignored, rebuilt from data/raw + data/lineage by `make db`. It is a
maintainer tool in exactly the sense that the pipeline is: nothing on the site reads it. The
site reads the compact exports written by `make export`.
"""

from __future__ import annotations

import hashlib
import os
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = Path(__file__).resolve().parent / "schema.sql"


def db_path() -> Path:
    return Path(os.environ.get("ENERGIAMUDEL_DB", ROOT / "data" / "energiamudel.duckdb"))


def connect(path: Path | str | None = None) -> duckdb.DuckDBPyConnection:
    """Open (or create) the database and make sure the schema exists.

    The schema runs only when the file does not already record this `schema.sql` (its SHA-1 in
    `schema_version`): a new database, or a schema changed since the file last saw it. v4 E-084:
    running it on a current file rewrote the file (DuckDB writes on every DDL, even
    `CREATE ... IF NOT EXISTS` and an unchanged `CREATE OR REPLACE VIEW`), and v4's run stamp
    hashed the file's mtime, so a read-only check invalidated every stored run."""
    p = ":memory:" if path == ":memory:" else str(path or db_path())
    if p != ":memory:" and os.environ.get("ENERGIAMUDEL_READ_ONLY"):
        # readers only: several can share the file (the export, checks beside a build)
        return duckdb.connect(p, read_only=True)
    con = duckdb.connect(p)
    sql = SCHEMA.read_text()
    sha = hashlib.sha1(sql.encode()).hexdigest()
    try:
        have = con.execute("SELECT sha1 FROM schema_version").fetchall()
    except duckdb.CatalogException:           # a new file, or one from before E-084
        have = []
    if have != [(sha,)]:
        con.execute(sql)
        con.execute("DELETE FROM schema_version")
        con.execute("INSERT INTO schema_version VALUES (?)", [sha])
    return con
