"""Fingrid Open Data: the Finnish side of EstLink (SPECIFICATION.md R-LINK-2, R-DATA-11).

Docs:   https://data.fingrid.fi/en/instructions
API:    https://data.fingrid.fi/api/datasets/{id}/data?startTime=..&endTime=..
Auth:   header `x-api-key` from FINGRID_API_KEY (free after registration).
Limits: 10 000 requests/day, one request per 2 s (HTTP 429 otherwise: `cached_get` waits as told
        and makes three attempts).
Adds beyond ENTSO-E: the official day-ahead EstLink capacity per direction, which
cross-checks the A31 offered capacity (A61 is empty for EE-FI), and the EstLink flow.

Dataset ids confirmed against the catalogue on 2026-09-14. EstLink 1 and 2 are not published
per cable; 55 is the total.
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

import pandas as pd
import requests

from . import MissingCredential, cached_get, raw_dir
from .entsoe import month_window

SOURCE = "Fingrid Open Data"
LICENCE = "CC BY 4.0 (Fingrid open data licence)"
RAW = "fingrid"
BASE_URL = "https://data.fingrid.fi/api/datasets"

DATASETS = {
    "estlink_mw": 55,             # Transmission FI-EE, 15 min, EstLink 1+2 total
    "da_cap_ee_fi_mw": 112,       # Day-ahead transmission capacity EE-FI - official
    "da_cap_fi_ee_mw": 115,       # Day-ahead transmission capacity FI-EE - official
}
# Fingrid ended the two day-ahead capacities: since 2026-10-05 the catalogue marks 112 and 115
# "inactive", "This time series will not be updated after 29.9.2026" (read 2026-11-11). What they
# serve after it is 0 MW on scattered days, not a capacity, so their rows stop at the end and later
# months are not asked for (ERRATA E-195).
ENDED = {"da_cap_ee_fi_mw": pd.Timestamp("2026-09-30"),
         "da_cap_fi_ee_mw": pd.Timestamp("2026-09-30")}


def ended(series: str, year: int, month: int) -> bool:
    """The month begins after the series' end: Fingrid publishes nothing for it."""
    end = ENDED.get(series)
    return end is not None and pd.Timestamp(year, month, 1) >= end


def _key() -> str:
    k = os.environ.get("FINGRID_API_KEY")
    if not k:
        raise MissingCredential("FINGRID_API_KEY is not set (see .env.example)")
    return k


def _get(url: str, params: dict) -> dict:
    for _attempt in range(3):
        r = requests.get(url, params=params, headers={"x-api-key": _key()}, timeout=60)
        if r.status_code == 429:
            time.sleep(2.5)
            continue
        r.raise_for_status()
        return r.json()
    raise RuntimeError(f"fingrid: rate-limited three times on {url}")


def fetch(series: str, year: int, month: int) -> Path:
    ds = f"fingrid.{DATASETS[series]}.{series}.{year}-{month:02d}"
    start, end = month_window(year, month)
    url = f"{BASE_URL}/{DATASETS[series]}/data"
    params = {"startTime": f"{start:%Y-%m-%dT%H:%M:%S}Z", "endTime": f"{end:%Y-%m-%dT%H:%M:%S}Z",
              "format": "json", "pageSize": 10000, "sortOrder": "asc"}
    if (raw_dir(RAW) / f"{ds}.json").exists():
        return raw_dir(RAW) / f"{ds}.json"
    rows, page = [], 1
    while True:
        payload = _get(url, {**params, "page": page})
        rows.extend(payload.get("data", []))
        nxt = (payload.get("pagination") or {}).get("nextPage")
        if not nxt:
            break
        page = nxt
        time.sleep(2.1)
    body = json.dumps(rows, separators=(",", ":")).encode()
    return cached_get(raw=RAW, dataset=ds, ext="json", url=url, params=params, source=SOURCE,
                      licence=LICENCE, content=body, notes=f"{page} page(s) joined")


def parse(path: Path) -> pd.DataFrame:
    """(ts, value) with ts = interval start, UTC, at the source resolution; nothing after the end
    of a series Fingrid ended (ENDED)."""
    rows = json.loads(path.read_text())
    df = pd.DataFrame(rows, columns=["startTime", "value"])
    df["ts"] = pd.to_datetime(df["startTime"], utc=True).dt.tz_localize(None)
    end = next((e for s, e in ENDED.items() if f".{s}." in path.name), None)
    if end is not None:
        df = df[df["ts"] < end]
    return df[["ts", "value"]].astype({"value": float})
