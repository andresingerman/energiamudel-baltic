"""Baltic Transparency Dashboard: cross-border capacity withheld for balancing reserves.

API:    https://api-baltic.transparency-dashboard.eu/api/v1/export?id=<report>&start_date=..
        &end_date=..&output_time_zone=UTC&output_format=json   (no key; times "YYYY-MM-DDTHH:MM")
Docs:   https://baltic.transparency-dashboard.eu/documentation/api
Report `allocated_cb_capacity`: MW of EE–LV and LV–LT capacity reserved for aFRR and mFRR,
per direction, 15-minute, values from 2025. This is v3's `reserved_cb_mw` corridor derating,
measured (SPECIFICATION.md R-LINK-5; table `balancing_cb`). Confirmed 2026-09-14.
Report `allocated_cb_capacity_legacy`: the same quantity, hourly, February–September 2025; the
15-minute report is null before September 2025 (v4 E-071).
Reports `procured_reserves_legacy` (hourly, February–September 2025) and `procured_reserves`
(15-minute, from October 2025): MW of FCR, aFRR and mFRR procured per Baltic zone and direction
in the Baltic balancing capacity market — capacity held out of the day-ahead market (D-044 (i),
D-055). Confirmed 2026-09-18; table `reserve_procured` (SPECIFICATION.md R-STO-6).
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from . import cached_get
from .entsoe import month_window

SOURCE = "Baltic Transparency Dashboard"
LICENCE = "Baltic TSOs open data (Elering, AST, Litgrid); free re-use with attribution"
RAW = "btd"
BASE_URL = "https://api-baltic.transparency-dashboard.eu/api/v1/export"

_BORDER = {"EE to LV": ("EE-LV", "fwd"), "LV to EE": ("EE-LV", "rev"),
           "LV to LT": ("LV-LT", "fwd"), "LT to LV": ("LV-LT", "rev")}


def fetch(report: str, year: int, month: int) -> Path:
    start, end = month_window(year, month)
    params = {"id": report, "start_date": f"{start:%Y-%m-%dT%H:%M}",
              "end_date": f"{end:%Y-%m-%dT%H:%M}", "output_time_zone": "UTC",
              "output_format": "json"}
    return cached_get(raw=RAW, dataset=f"btd.{report}.BALTIC.{year}-{month:02d}", ext="json",
                      url=BASE_URL, params=params, source=SOURCE, licence=LICENCE)


def parse(path: Path) -> pd.DataFrame:
    """(ts, border, direction, product, value) at 15-min resolution; nulls dropped."""
    payload = json.loads(path.read_text())
    if payload.get("error"):
        raise RuntimeError(f"{path.name}: {payload.get('message')}")
    d = payload["data"]
    cols = [(_BORDER.get(c["group_level_0"], (c["group_level_0"], "")), c["label"])
            for c in d["columns"]]
    rows = []
    for r in d["timeseries"]:
        ts = pd.Timestamp(r["from"]).tz_convert("UTC").tz_localize(None)
        for ((border, direction), product), v in zip(cols, r["values"], strict=True):
            if v is not None:
                rows.append({"ts": ts, "border": border, "direction": direction,
                             "product": product, "value": float(v)})
    return pd.DataFrame(rows, columns=["ts", "border", "direction", "product", "value"])


_ZONE = {"Estonia": "EE", "Latvia": "LV", "Lithuania": "LT"}
_DIR = {"Upward": "up", "Downward": "down", "Symetric": "sym"}


def parse_reserves(path: Path) -> pd.DataFrame:
    """(ts, zone, product, direction, mw), hourly averages of the 15-minute values; nulls
    dropped."""
    payload = json.loads(path.read_text())
    if payload.get("error"):
        raise RuntimeError(f"{path.name}: {payload.get('message')}")
    d = payload["data"]
    cols = [(_ZONE[c["group_level_0"]], c["group_level_1"].split()[0], _DIR[c["label"]])
            for c in d["columns"]]
    rows = []
    for r in d["timeseries"]:
        ts = pd.Timestamp(r["from"]).tz_convert("UTC").tz_localize(None)
        for (zone, product, direction), v in zip(cols, r["values"], strict=True):
            if v is not None:
                rows.append({"ts": ts, "zone": zone, "product": product, "direction": direction,
                             "mw": float(v)})
    df = pd.DataFrame(rows, columns=["ts", "zone", "product", "direction", "mw"])
    df["mw"] = df["mw"].astype(float)
    df["ts"] = pd.to_datetime(df["ts"]).dt.floor("h")
    return df.groupby(["ts", "zone", "product", "direction"], as_index=False)["mw"].mean()
