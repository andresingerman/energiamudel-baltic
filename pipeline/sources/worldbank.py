"""World Bank Commodity Price Data ("Pink Sheet"): monthly gas, coal and oil benchmarks.

Source: https://www.worldbank.org/en/research/commodity-markets
File:   CMO-Historical-Data-Monthly.xlsx, sheet "Monthly Prices", header on row 5, labels on
        row 6 (units), data from row 7; period index like "2025M01". Confirmed 2026-09-14.
Access: free, no key. The document URL carries a hash that changes with every monthly update,
so fetch() reads the current link off the landing page and records it in the lineage.
"""

from __future__ import annotations

import re
from pathlib import Path

import pandas as pd
import requests

from . import cached_get, raw_dir, whole_vintage

SOURCE = "World Bank Commodity Price Data (Pink Sheet)"
LICENCE = "CC BY 4.0 (World Bank open data)"
RAW = "worldbank"
LANDING = "https://www.worldbank.org/en/research/commodity-markets"
_LINK = re.compile(r"https://thedocs\.worldbank\.org/[^\"' ]*CMO-Historical-Data-Monthly\.xlsx")

COMMODITIES = {
    # our code : (column label prefix on the sheet, unit)
    "gas_ttf": ("Natural gas, Europe", "USD/mmbtu"),
    "coal_aus": ("Coal, Australian", "USD/mt"),
    "coal_saf": ("Coal, South African", "USD/mt"),
    "oil_brent": ("Crude oil, Brent", "USD/bbl"),
}


def current_url() -> str:
    html = requests.get(LANDING, timeout=60).text
    m = _LINK.search(html)
    if not m:
        raise RuntimeError("worldbank: monthly workbook link not found on the landing page")
    return m.group(0)


def fetch(vintage: str | None = None) -> Path:
    """Cache the monthly workbook. `vintage` (YYYY-MM) names the dataset; default: this month."""
    vintage = vintage or pd.Timestamp.now(tz="UTC").strftime("%Y-%m")
    ds = f"worldbank.cmo_monthly.ALL.{vintage}"
    path = raw_dir(RAW) / f"{ds}.xlsx"
    if not path.exists():
        path = cached_get(raw=RAW, dataset=ds, ext="xlsx", url=current_url(),
                          params={"landing": LANDING}, source=SOURCE, licence=LICENCE)
    return whole_vintage(path, parse(path)["ts"].max(), vintage)


def parse(path: Path) -> pd.DataFrame:
    """(commodity, ts, value, unit) rows, ts = first day of the month, from 2015 on."""
    df = pd.read_excel(path, sheet_name="Monthly Prices", header=4, skiprows=[5])
    df = df.rename(columns={df.columns[0]: "period"})
    df = df[df["period"].astype(str).str.match(r"^\d{4}M\d{2}$")]
    ts = pd.to_datetime(df["period"].astype(str), format="%YM%m")
    rows = []
    for code, (label, unit) in COMMODITIES.items():
        col = next(c for c in df.columns if str(c).startswith(label))
        vals = pd.to_numeric(df[col], errors="coerce")
        rows.append(pd.DataFrame({"commodity": code, "ts": ts, "value": vals, "unit": unit}))
    out = pd.concat(rows).dropna(subset=["value"])
    return out[out["ts"] >= "2015-01-01"].reset_index(drop=True)
