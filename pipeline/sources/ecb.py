"""ECB Data Portal: the monthly US dollar / euro reference rate (SPECIFICATION.md OPEN-13, R-SUP-3).

API:    https://data-api.ecb.europa.eu/service/data/EXR/M.USD.EUR.SP00.A?format=csvdata
Series: EXR.M.USD.EUR.SP00.A — monthly average of the daily ECB reference rate, US dollars per
        euro. The World Bank Pink Sheet prices gas, coal and oil in US dollars; this rate turns
        them into euros month by month (ERRATA E-024).
Access: free, no key. Reuse is free with the source acknowledged (ECB statistics usage policy,
        https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html).
Confirmed 2026-09-25: CSV with TIME_PERIOD (YYYY-MM) and OBS_VALUE columns.
"""

from __future__ import annotations

import io
from pathlib import Path

import pandas as pd

from . import cached_get, whole_vintage

SOURCE = "ECB Data Portal, exchange rates"
LICENCE = "ECB statistics: free reuse with the source acknowledged (ECB usage policy)"
RAW = "ecb"
URL = "https://data-api.ecb.europa.eu/service/data/EXR/M.USD.EUR.SP00.A"
FIRST = "2015-01"                     # the commodity series start in 2015 (worldbank.parse)


def fetch(vintage: str | None = None) -> Path:
    """Cache the whole monthly series. `vintage` (YYYY-MM) names the dataset; default: this month.

    The series is revised only by appending months, so one vintage per month is enough; a new
    month is picked up by fetching a new vintage, and the loader reads the newest.
    """
    vintage = vintage or pd.Timestamp.now(tz="UTC").strftime("%Y-%m")
    ds = f"ecb.exr.USD-EUR.M.{vintage}"
    path = cached_get(raw=RAW, dataset=ds, ext="csv", url=URL,
                      params={"format": "csvdata", "startPeriod": FIRST},
                      source=SOURCE, licence=LICENCE)
    return whole_vintage(path, parse(path)["ts"].max(), vintage)


def parse(path: Path) -> pd.DataFrame:
    """(ts, value): ts = first day of the month, value = US dollars per euro."""
    df = pd.read_csv(io.BytesIO(path.read_bytes()))
    if not {"TIME_PERIOD", "OBS_VALUE", "KEY"} <= set(df.columns):
        raise RuntimeError(f"{path.name}: not an ECB SDMX CSV (columns {list(df.columns)[:6]})")
    if set(df["KEY"]) != {"EXR.M.USD.EUR.SP00.A"}:
        raise RuntimeError(f"{path.name}: unexpected series {sorted(set(df['KEY']))}")
    out = pd.DataFrame({"ts": pd.to_datetime(df["TIME_PERIOD"], format="%Y-%m"),
                        "value": pd.to_numeric(df["OBS_VALUE"], errors="coerce")})
    out = out.dropna().sort_values("ts").reset_index(drop=True)
    if out.empty:
        raise RuntimeError(f"{path.name}: no observations")
    return out
