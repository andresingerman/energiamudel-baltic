"""One module per data provider.

Each module exposes, where it applies, the same four things so smoke.py and db/build.py can
treat them alike:

    SOURCE   : str            human name used in lineage records
    LICENCE  : str            licence text used in lineage records
    fetch(...) -> Path        performs one request, writes data/raw/<source>/<dataset>.<ext>,
                              writes the lineage record, returns the raw path; idempotent
    parse(path) -> DataFrame  turns one raw file into tidy rows with a UTC `ts` column

`cached_get` is the shared fetch-cache-record step: every module that talks HTTP goes through
it so the raw cache and the lineage record are written the same way everywhere.
"""

from __future__ import annotations

import os
import re
import time
from pathlib import Path

import requests

from .. import DATA_DIR, lineage


def raw_dir(source: str) -> Path:
    root = Path(os.environ.get("ENERGIAMUDEL_RAW", DATA_DIR / "raw"))
    p = root / source
    p.mkdir(parents=True, exist_ok=True)
    return p


def whole_vintage(path: Path, latest, vintage: str) -> Path:
    """A monthly vintage (YYYY-MM) must hold the month before it. Fetched before the publisher's
    release — the World Bank's Pink Sheet on a month's second business day, the ECB's monthly
    average after the month — a file would be cached under the new month with the old months only
    and never fetched again: the file and its record go, and the fetch fails until the release
    (the freeze's rehearsal, 2026-10-18). `latest` is the series' last month (a date)."""
    y, m = map(int, vintage.split("-"))
    want = (y, m - 1) if m > 1 else (y - 1, 12)
    if (latest.year, latest.month) >= want:
        return path
    path.unlink()
    (lineage.lineage_dir() / f"{path.stem}.json").unlink(missing_ok=True)
    raise RuntimeError(f"{path.stem}: the series ends {latest.year}-{latest.month:02d}, not "
                       f"{want[0]}-{want[1]:02d}: the month is not published yet; fetch it later")


class MissingCredential(RuntimeError):
    """Raised when a source needs a token that is not in the environment."""


def cached_get(*, raw: str, dataset: str, ext: str, url: str, params: dict | None,
               source: str, licence: str, headers: dict | None = None,
               content: bytes | None = None, notes: str | None = None,
               timeout: int = 120) -> Path:
    """Fetch `url` once, cache the body under data/raw/<raw>/<dataset>.<ext>, record lineage.

    Idempotent: an existing raw file is returned without a request. `content` lets a caller
    that already assembled the body (e.g. several pages joined) record it through the same
    path; `params` are what goes into the lineage record and must never hold a credential.
    """
    path = raw_dir(raw) / f"{dataset}.{ext}"
    if path.exists():
        return path
    status = 200
    if content is None:
        for _attempt in range(3):
            r = requests.get(url, params=params, headers=headers, timeout=timeout)
            content, status = r.content, r.status_code
            if status != 429:
                break
            # Energinet and Fingrid say how long to wait; honour it, capped at five minutes.
            m = re.search(r"(\d+) seconds", content.decode("utf-8", "replace"))
            time.sleep(min(int(m.group(1)) if m else 60, 300) + 1)
    assert content is not None      # the loop made three attempts and kept the last one's body
    if status >= 400:
        # Nothing is cached: a failed response must not masquerade as data on the next run.
        raise RuntimeError(f"{dataset}: HTTP {status}: {content[:200]!r}")
    if ext == "json" and not content.lstrip().startswith((b"{", b"[")):
        # A 200 that is not JSON (an HTML shell, a maintenance page) is not data either.
        raise RuntimeError(f"{dataset}: expected JSON, got {content[:80]!r}")
    if ext == "pdf" and not content.startswith(b"%PDF"):
        # A 200 that is not a PDF (a moved page, a bot challenge) is not the document.
        raise RuntimeError(f"{dataset}: expected a PDF, got {content[:80]!r}")
    path.write_bytes(content)
    lineage.measured(dataset=dataset, source=source, endpoint=url, params=params or {},
                     content=content, licence=licence, http_status=status, notes=notes).write()
    return path
