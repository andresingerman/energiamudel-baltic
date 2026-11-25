"""Swedish Energy Agency (Energimyndigheten), wind power statistics by bidding area (D-093).

API:    PxWeb, https://pxexternal.energimyndigheten.se/api/v1/sv/
        Energimyndighetens_statistikdatabas/Officiell_energistatistik/Vindkraftsstatistik/
        EN0105_2.px — "Antal verk, installerad effekt och vindkraftproduktion per elområde,
        2003-", updated 2026-04-15. A data query is a POST of a JSON selection; the answer is
        CSV in ISO-8859-1. Confirmed 2026-10-07.
Series: installed wind power capacity (MW, onshore and offshore together) at the end of each
        year in SE1, SE2, SE3, SE4, and a supplementary source not distributed by area; the four
        areas and the supplementary row sum to the national figure. The model's neighbour is SE4.
Access: free, no key. Official statistics of Sweden; reuse with the source acknowledged.
"""

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

import pandas as pd
import requests

from . import cached_get, raw_dir

SOURCE = "Energimyndigheten, Vindkraftsstatistik (official statistics of Sweden)"
LICENCE = "Official statistics of Sweden; free reuse with the source acknowledged"
RAW = "energimyndigheten"
TABLE = "EN0105_2"
URL = ("https://pxexternal.energimyndigheten.se/api/v1/sv/Energimyndighetens_statistikdatabas/"
       "Officiell_energistatistik/Vindkraftsstatistik/" + TABLE + ".px")
QUERY: dict[str, Any] = {                                  # 1: Installerad effekt, MW
    "query": [{"code": "Kategori", "selection": {"filter": "item", "values": ["1"]}}],
    "response": {"format": "csv"}}
UNASSIGNED = "SE_unassigned"


def fetch() -> Path:
    ds = f"energimyndigheten.wind.{TABLE}"
    if (raw_dir(RAW) / f"{ds}.csv").exists():
        return raw_dir(RAW) / f"{ds}.csv"
    r = requests.post(URL, json=QUERY, timeout=120)
    if r.status_code >= 400:
        raise RuntimeError(f"{ds}: HTTP {r.status_code}: {r.content[:200]!r}")
    return cached_get(raw=RAW, dataset=ds, ext="csv", url=URL, params={"query": json.dumps(QUERY)},
                      source=SOURCE, licence=LICENCE, content=r.content)


def parse(path: Path) -> pd.DataFrame:
    """(area, year, mw): SE1…SE4 and SE_unassigned (the supplementary source); "." is no figure."""
    df = pd.read_csv(io.BytesIO(path.read_bytes()), encoding="iso-8859-1", dtype=str)
    if len(df.columns) != 3:
        raise RuntimeError(f"{path.name}: expected year, area, MW (columns {list(df.columns)})")
    df.columns = ["year", "area", "mw"]
    df["area"] = df["area"].where(df["area"].str.match(r"^SE[1-4]$"), UNASSIGNED)
    df["mw"] = pd.to_numeric(df["mw"].str.strip().replace(".", None), errors="coerce")
    out = df.dropna(subset=["mw"]).assign(year=lambda d: d["year"].astype(int))
    if out.empty or not {"SE4"} <= set(out["area"]):
        raise RuntimeError(f"{path.name}: no SE4 rows")
    return out[["area", "year", "mw"]].sort_values(["area", "year"]).reset_index(drop=True)
