"""Deterministic files of the export (SPECIFICATION.md R-DATA-5, R-DATA-8).

The same database gives the same bytes: keys sorted, no whitespace, no NaN, numbers rounded to
the precision each series carries, gzip without a timestamp. Every file written is recorded in
the manifest with its SHA-256, its size and the lineage ids of every series in it.
"""

from __future__ import annotations

import gzip
import hashlib
import json
import math
from pathlib import Path

import numpy as np

# decimals kept per kind of series; MW and MWh are whole numbers
PRECISION = {"mw": 0, "mwh": 0, "price": 2, "cf": 4, "temperature": 1, "share": 4}


def series(values, kind: str) -> list:
    """An array as a JSON list at the precision of its kind; NaN or infinity is an error."""
    a = np.asarray(values, dtype=float)
    if not np.isfinite(a).all():
        raise ValueError(f"non-finite value in a {kind} series")
    d = PRECISION[kind]
    if d == 0:
        return [int(v) for v in np.rint(a)]
    r = np.round(a, d)
    return [float(v) if v != int(v) else int(v) for v in r]


def scalar(value: float, decimals: int = 3) -> float | int:
    if not math.isfinite(value):
        raise ValueError("non-finite scalar")
    r = round(float(value), decimals)
    return int(r) if r == int(r) else r


def dumps(obj) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), allow_nan=False,
                      ensure_ascii=False).encode("utf-8")


def write(path: Path, obj, compress: bool) -> dict:
    """Write one export file; return its manifest entry (sha256 and size of the bytes on disk)."""
    raw = dumps(obj)
    data = gzip.compress(raw, compresslevel=9, mtime=0) if compress else raw
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return {"sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}


def read(path: Path):
    data = path.read_bytes()
    if data[:2] == b"\x1f\x8b":
        data = gzip.decompress(data)
    return json.loads(data)
