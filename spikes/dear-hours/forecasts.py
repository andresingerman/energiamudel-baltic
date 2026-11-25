"""The day-ahead forecasts the market cleared on (docs/research/2026-10-11_dear_hours.md, Phase 1.7):
ENTSO-E A69 (wind and solar, process A01) and A65 with process A01 (total load) of EE, LV and LT,
from the cached raw files, as hourly MW per year (hour 0 = 1 January 00:00 UTC; quarter-hours
averaged; a missing hour is null) -> the path given, gzip JSON. Not committed: rebuilt from the raw
cache, whose lineage the pipeline keeps.

Run:  .venv/bin/python spikes/dear-hours/forecasts.py <out.json.gz>
"""

from __future__ import annotations

import gzip
import json
import sys
from datetime import datetime

import pandas as pd

from pipeline.sources import entsoe, raw_dir


def hourly(doc: str, zone: str, year: int) -> dict[str, list]:
    frames = []
    for m in range(1, 13):
        path = raw_dir(entsoe.RAW) / f"entsoe.{doc}.{zone}.{year}-{m:02d}.xml"
        if path.exists():
            frames.append(entsoe.parse(path))
    if not frames:
        return {}
    df = pd.concat(frames)
    df["hour"] = df["ts"].dt.floor("h")
    df["key"] = df["tech"].fillna("load") if doc == "A69" else "load"
    start = datetime(year, 1, 1)
    hours = (datetime(year + 1, 1, 1) - start).days * 24
    idx = pd.date_range(start, periods=hours, freq="h")
    out = {}
    for key, g in df.groupby("key"):
        s = g.groupby("hour")["value"].mean().reindex(idx)
        out[key] = [None if pd.isna(x) else round(float(x), 1) for x in s]
    return out


def main(dest: str) -> None:
    out: dict = {}
    for year in (2023, 2024, 2025, 2026):
        out[year] = {}
        for zone in ("EE", "LV", "LT"):
            series = hourly("A69", zone, year)
            series["load"] = hourly("A65DA", zone, year).get("load", [])
            out[year][zone] = series
            print(year, zone, {k: sum(x is not None for x in v) for k, v in series.items()})
    with gzip.open(dest, "wt") as f:
        json.dump(out, f)


if __name__ == "__main__":
    main(sys.argv[1])
