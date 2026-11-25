"""Open-Meteo Historical Weather API: temperature (the CHP heat proxy, R-SUP-5), wind, radiation.

Docs:   https://open-meteo.com/en/docs/historical-weather-api
API:    https://archive-api.open-meteo.com/v1/archive?latitude=..&longitude=..&start_date=..
        &end_date=..&hourly=temperature_2m,wind_speed_10m,shortwave_radiation&timezone=UTC
Auth:   none for non-commercial use; a commercial plan exists (docs/SOURCE_REGISTER.md).
Model:  default `best_match` (ECMWF IFS for these years); the v3 project verified this by
        matching its files hour-for-hour against the API (v3 sources.md §7).

One grid point per zone: the largest city of the zone (D-012). Population-weighted centroids
would be marginally better for the heat proxy; the city is what v3 used for EE/LV/LT and keeps
the series comparable.
"""

from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

from . import cached_get

SOURCE = "Open-Meteo Historical Weather API"
LICENCE = "CC BY 4.0 (Open-Meteo, non-commercial); commercial plan if required"
RAW = "openmeteo"
BASE_URL = "https://archive-api.open-meteo.com/v1/archive"
HOURLY = "temperature_2m,wind_speed_10m,shortwave_radiation"

# zone -> (lat, lon) grid point
POINTS: dict[str, tuple[float, float]] = {
    "EE": (59.4376, 24.8064),   # Tallinn, as v3
    "LV": (56.9772, 24.1139),   # Riga, as v3
    "LT": (54.7276, 25.2569),   # Vilnius, as v3
}


def fetch(zone: str, year: int) -> Path:
    lat, lon = POINTS[zone]
    # The archive ends yesterday; a partial current year is cached under the year's id and
    # refreshed only by deleting that file (the same rule as every other raw file).
    last = min(date(year, 12, 31), date.today() - timedelta(days=1))
    params = {"latitude": lat, "longitude": lon, "start_date": f"{year}-01-01",
              "end_date": last.isoformat(), "hourly": HOURLY, "timezone": "UTC",
              "wind_speed_unit": "ms"}
    return cached_get(raw=RAW, dataset=f"openmeteo.archive.{zone}.{year}", ext="json",
                      url=BASE_URL, params=params, source=SOURCE, licence=LICENCE)


def parse(path: Path) -> pd.DataFrame:
    """(ts, temperature_c, wind_ms, radiation_wm2), hourly UTC."""
    h = json.loads(path.read_text())["hourly"]
    return pd.DataFrame({
        "ts": pd.to_datetime(h["time"]),
        "temperature_c": h["temperature_2m"],
        "wind_ms": h["wind_speed_10m"],
        # the preceding hour's average, labelled at the hour's end: moved to the hour it covers
        "radiation_wm2": pd.Series(h["shortwave_radiation"], dtype=float).shift(-1),
    })
