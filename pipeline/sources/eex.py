"""EEX EU ETS primary auction results: the model's CO2 price series (R-DATA-4).

Source: https://public.eex-group.com/eex/eua-auction-report/  (one workbook per year, 2017→;
        2017-2019 are .xls, 2020→ .xlsx; the directory holds nothing earlier). Confirmed
        2026-09-14 and 2026-10-06.
Series: auction clearing price, EUR per allowance, per auction date, successful auctions of general
        allowances only (EUA; the aviation allowances' EUAA auctions are left out, D-094).
        The model reads 2020 on (observed years); the Statistics page reads 2017 on (D-087).
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from . import cached_get

SOURCE = "EEX EU ETS auction results"
LICENCE = "EEX market data terms; public auction reports, attribution required"
RAW = "eex"
BASE_URL = "https://public.eex-group.com/eex/eua-auction-report"


def fetch(year: int) -> Path:
    ext = "xlsx" if year >= 2020 else "xls"
    url = f"{BASE_URL}/emission-spot-primary-market-auction-report-{year}-data.{ext}"
    return cached_get(raw=RAW, dataset=f"eex.eua_auction.EU.{year}", ext=ext, url=url,
                      params={"year": year}, source=SOURCE, licence=LICENCE)


def parse(path: Path) -> pd.DataFrame:
    """(ts, value, auction) with ts = auction date, value = clearing price EUR/tCO2."""
    df = pd.read_excel(path, header=5)
    if "Status" in df:              # the reports of 2020 on; 2017-2019 list no status column
        df = df[df["Status"].astype(str).str.lower() == "successful"]
    df = df[pd.to_numeric(df["Auction Price €/tCO2"], errors="coerce").notna()]
    # general allowances only: the aviation allowances (EUAA) are a product of their own, auctioned
    # a few times a year at their own price (ERRATA E-081, D-094)
    df = df[~df["Auction Name"].astype(str).str.startswith("EUAA")]
    out = pd.DataFrame({
        "ts": pd.to_datetime(df["Date"]).dt.normalize(),
        "value": df["Auction Price €/tCO2"].astype(float),
        "auction": df["Auction Name"].astype(str),
    })
    return out.sort_values("ts").reset_index(drop=True)
