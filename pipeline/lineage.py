"""Provenance records: the contract of SPECIFICATION.md R-DATA-3.

Every dataset the pipeline writes gets one JSON record here, and every row that reaches the
database carries that record's id. Two classes of input share one record shape:

- measured (fetched from an API): `sha256` of the response body is required, `page` is absent
- documentary (read from a published document by a person): `page` is required, `sha256` absent

The record is deliberately boring. Its value is that it exists for 100 % of inputs, is written
at the moment of fetching rather than reconstructed later, and can be walked backwards through
`derived_from` from any engine input to the API call it came from.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from . import DATA_DIR

_ID_RE = re.compile(r"^[a-z0-9]+(\.[A-Za-z0-9_-]+)+$")


def lineage_dir() -> Path:
    return Path(os.environ.get("ENERGIAMUDEL_LINEAGE", DATA_DIR / "lineage"))


@dataclass
class LineageRecord:
    dataset: str                    # e.g. "entsoe.A44.SE4.2025-01"; dotted, source first
    source: str                     # human name of the provider
    endpoint: str                   # API URL (measured) or document URL (documentary)
    params: dict                    # request parameters, or {"page": .., "table": ..}
    fetched_at: str                 # ISO-8601 UTC
    licence: str
    http_status: int | None = None  # measured only
    sha256: str | None = None       # measured only, required
    page: str | None = None         # documentary only, required
    rows: int | None = None
    derived_from: list[str] = field(default_factory=list)
    notes: str | None = None

    @property
    def is_measured(self) -> bool:
        return self.sha256 is not None

    def validate(self) -> None:
        if not _ID_RE.match(self.dataset):
            raise ValueError(f"dataset id {self.dataset!r} must be dotted, source first")
        if self.is_measured and self.page is not None:
            raise ValueError(f"{self.dataset}: a measured record must not carry a page")
        if not self.is_measured and not self.page:
            raise ValueError(f"{self.dataset}: a documentary record must carry the page")
        if not self.licence:
            raise ValueError(f"{self.dataset}: licence is required")
        for d in self.derived_from:
            if not _ID_RE.match(d):
                raise ValueError(f"{self.dataset}: bad derived_from id {d!r}")

    def path(self, root: Path | None = None) -> Path:
        return (root or lineage_dir()) / f"{self.dataset}.json"

    def write(self, root: Path | None = None) -> Path:
        self.validate()
        p = self.path(root)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(asdict(self), indent=2, ensure_ascii=False) + "\n")
        return p

    @classmethod
    def read(cls, path: Path) -> LineageRecord:
        rec = cls(**json.loads(path.read_text()))
        rec.validate()
        return rec


def now_utc() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def sha256_of(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def measured(
    dataset: str,
    source: str,
    endpoint: str,
    params: dict,
    content: bytes,
    licence: str,
    http_status: int = 200,
    rows: int | None = None,
    derived_from: list[str] | None = None,
    notes: str | None = None,
) -> LineageRecord:
    """Build the record for an API response. Call it with the raw bytes as received."""
    return LineageRecord(
        dataset=dataset, source=source, endpoint=endpoint, params=params,
        fetched_at=now_utc(), licence=licence, http_status=http_status,
        sha256=sha256_of(content), rows=rows, derived_from=list(derived_from or []), notes=notes,
    )


def documentary(
    dataset: str,
    source: str,
    url: str,
    page: str,
    licence: str,
    table: str | None = None,
    derived_from: list[str] | None = None,
    notes: str | None = None,
) -> LineageRecord:
    """Build the record for a value taken from a published document."""
    params = {"page": page}
    if table:
        params["table"] = table
    return LineageRecord(
        dataset=dataset, source=source, endpoint=url, params=params,
        fetched_at=now_utc(), licence=licence, page=page,
        derived_from=list(derived_from or []), notes=notes,
    )


def derived(
    dataset: str,
    derived_from: list[str],
    notes: str,
    licence: str = "derived; see inputs",
) -> LineageRecord:
    """Build the record for a dataset computed from other datasets (CF profiles, budgets, …)."""
    rec = LineageRecord(
        dataset=dataset, source="pipeline", endpoint="pipeline", params={},
        fetched_at=now_utc(), licence=licence, page="n/a", derived_from=list(derived_from),
        notes=notes,
    )
    return rec


def read_all(root: Path | None = None) -> list[LineageRecord]:
    root = root or lineage_dir()
    return [LineageRecord.read(p) for p in sorted(root.glob("*.json"))]
