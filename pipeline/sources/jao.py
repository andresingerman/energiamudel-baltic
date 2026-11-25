"""JAO Nordic CCR Publication Tool: flow-based day-ahead capacity since the Nordic go-live.

Page:   https://publicationtool.jao.eu/nordic/  (handbook v1.5, 2026-01-07: Nordic CCM Art. 25)
API:    https://publicationtool.jao.eu/nordic/api/data/<endpoint>?FromUtc=..&ToUtc=..
        no key; at most two days per request (HTTP 400 "The requested range exceeds 2 day(s)").
        Probed 2026-09-24.
From:   2024-10-29, the day-ahead go-live of Nordic flow-based market coupling.

Endpoints v5 reads (SPECIFICATION.md R-DATA-11, R-LINK-2, R-BND-7):
  maxNetPos             min_<hub> / max_<hub> per MTU: the net-position range of every hub,
                        including the virtual hubs at the Nordic end of each HVDC link —
                        FI_EL (EstLink), SE4_NB (NordBalt), SE4_SP (SwePol)
  maxExchanges          border_<A>_<B>: the maximum bilateral exchange (MaxBex), incl. FI_EE,
                        EE_FI, SE4_LT, LT_SE4, SE4_PL, PL_SE4
  referenceNetPosition  globalNetPosition_<hub>: the net positions assumed for the common grid
                        model (not the market result)
  fbDomainShadowPrice   the constraints of the flow-based domain that bound the market result,
                        each with its shadow price and its PTDF per hub (asked for with
                        `Filter={"HasShadowPrice":true}`, `Skip`, `Take`; without the filter the
                        endpoint returns every constraint of every MTU, about 1.6 MB an hour).
                        v5 models no Nordic network (D2) and reads one thing from it: how far
                        the price at the virtual hub of an HVDC link stands from its zone's
                        (`hub_spreads`; R-BND-3 as D-075 reads it). Answered HTTP 500 without
                        `Take` when probed on 2026-09-24; probed again 2026-10-05.
The domain before the market result (finalComputation) is not read.

The Core CCR's tool (https://publicationtool.jao.eu/core/, same API under /core/api/data, the
same two-day limit, `Skip` and `Take` required; from the Core flow-based go-live, delivery day
2022-06-09; probed 2026-10-06) is read for one thing, Poland's allocation constraint (D-076):
  shadowPrices          the Core constraints that bound the market result, each with its shadow
                        price and its PTDF per hub (`hub_<zone>`)
  priceSpread           border_<A>_<B>: the day-ahead price of B less that of A
  netPos                hub_<zone>: the zone's net position inside the Core region (export +)
  allocationConstraint  limitDown_PL / limitUp_PL: the import and export limits PSE sets on
                        Poland's net position in the day-ahead coupling (the import limit was
                        0 MW in a quarter of the hours of 2024)
The limit is on Poland's net position over all its borders, so when it binds Poland's price
parts from the price its interconnectors clear at, and no publication gives that shadow price.
`core_spread` derives it: Poland's price less Germany's, less what the network's constraints
explain, where Poland's Core net position says the limit could bind.
"""

from __future__ import annotations

import json
import time
from datetime import date, datetime, timedelta
from pathlib import Path

import pandas as pd
import requests

from . import cached_get, raw_dir

SOURCE = "JAO Nordic CCR Publication Tool"
LICENCE = "JAO publication tool data, published under the Nordic CCM Art. 25; free access"
CORE_SOURCE = "JAO Core CCR Publication Tool"
CORE_LICENCE = "JAO publication tool data, published under the Core day-ahead CCM; free access"
RAW = "jao"
BASE_URL = "https://publicationtool.jao.eu/nordic/api/data"
ENDPOINTS = ("maxNetPos", "maxExchanges", "referenceNetPosition")
FB_ENDPOINT = "fbDomainShadowPrice"
FB_PARAMS = {"Skip": 0, "Take": 10_000_000, "Filter": '{"HasShadowPrice":true}'}
# the virtual hub at the Nordic end of each Baltic HVDC link, and the bidding zone it stands in
HUB_ZONE = {"SE4_NB": "SE4", "FI_EL": "FI"}
FIRST_DAY = date(2024, 10, 29)
CORE_URL = "https://publicationtool.jao.eu/core/api/data"
CORE_ENDPOINTS = ("shadowPrices", "priceSpread", "netPos", "allocationConstraint")
# SwePol Link and LitPol Link, Poland's two interconnectors outside the Core region, at rated
# power: 600 MW (the largest exchange JAO's Nordic tool offers on SE4-PL) and 500 MW
# (parameters.csv hvdc.litpol.rated_mw)
PL_CABLES_MW = 600.0 + 500.0
CORE_FIRST_DAY = date(2022, 6, 9)
CORE_PARAMS = {"Skip": 0, "Take": 10_000_000}
_STEP = timedelta(days=2)


def _get(url: str, params: dict) -> list[dict]:
    for attempt in range(6):
        r = requests.get(url, params=params, timeout=120)
        if r.status_code == 200:
            return r.json()["data"]
        if r.status_code in (429, 500, 502, 503, 504) and attempt < 5:
            time.sleep(10 * (attempt + 1))
            continue
        raise RuntimeError(f"jao {url}: HTTP {r.status_code}: {r.text[:200]!r}")
    raise RuntimeError(f"jao {url}: gave up")


def fetch(endpoint: str, year: int, month: int) -> Path:
    """One month of one endpoint, joined from two-day windows, cached as one JSON array."""
    core = endpoint in CORE_ENDPOINTS
    ccr, first = ("CORE", CORE_FIRST_DAY) if core else ("NORDIC", FIRST_DAY)
    extra = CORE_PARAMS if core else FB_PARAMS if endpoint == FB_ENDPOINT else {}
    ds = f"jao.{endpoint}.{ccr}.{year}-{month:02d}"
    path = raw_dir(RAW) / f"{ds}.json"
    if path.exists():
        return path
    start = max(datetime(year, month, 1), datetime.combine(first, datetime.min.time()))
    end = datetime(year + (month == 12), month % 12 + 1, 1)
    if start >= end:
        raise ValueError(f"{ds}: before the {ccr} flow-based go-live {first}")
    url = f"{CORE_URL if core else BASE_URL}/{endpoint}"
    rows: list[dict] = []
    t, n = start, 0
    while t < end:
        u = min(t + _STEP, end)
        rows += _get(url, {"FromUtc": f"{t:%Y-%m-%dT%H:%M:%S}.000Z",
                           "ToUtc": f"{u:%Y-%m-%dT%H:%M:%S}.000Z", **extra})
        t, n = u, n + 1
        time.sleep(0.3)
    body = json.dumps(rows, separators=(",", ":")).encode()
    params = {"FromUtc": f"{start:%Y-%m-%dT%H:%M:%S}.000Z",
              "ToUtc": f"{end:%Y-%m-%dT%H:%M:%S}.000Z", "windows": "two days per request",
              **extra}
    return cached_get(raw=RAW, dataset=ds, ext="json", url=url, params=params,
                      source=CORE_SOURCE if core else SOURCE,
                      licence=CORE_LICENCE if core else LICENCE, content=body,
                      notes=f"{n} two-day windows joined")


def parse(path: Path) -> pd.DataFrame:
    """Long form (ts, column, value): ts = `dateTimeUtc` naive, every numeric field except the
    row id; one row per MTU and field. Duplicate MTUs of overlapping windows are dropped."""
    rows = json.loads(path.read_text())
    if not rows:
        return pd.DataFrame(columns=["ts", "column", "value"])
    df = pd.DataFrame(rows).drop(columns=["id", "lastModifiedOn"], errors="ignore")
    df["ts"] = pd.to_datetime(df.pop("dateTimeUtc"), utc=True).dt.tz_localize(None)
    df = df.drop_duplicates("ts")
    long = df.melt(id_vars="ts", var_name="column", value_name="value").dropna(subset=["value"])
    return long.astype({"value": float}).sort_values(["column", "ts"]).reset_index(drop=True)


def hub_spreads(path: Path) -> pd.DataFrame:
    """Long form (ts, column, value) from a month of `fbDomainShadowPrice`: per MTU and virtual
    hub of HUB_ZONE, `spread_<hub>` = the hub's price less its zone's, EUR/MWh, as the flow-based
    clearing gives it from the network's constraints: − Σ shadow price × (PTDF_hub − PTDF_zone)
    over the constraints that bound the result, the link's own left out — those whose name or
    whose two bidding zones name the hub: the cable's capacity, ramping and allocation limits,
    which v5 models as the link's transfer capacity. An MTU with no such constraint has a spread
    of 0: the month's MTUs are those of its `maxNetPos` beside it, since the request asks for the
    binding constraints only and an MTU without one is absent from this file."""
    cols = ["ts", "column", "value"]
    every = path.with_name(path.name.replace(f".{FB_ENDPOINT}.", ".maxNetPos."))
    if not every.exists():
        raise FileNotFoundError(f"{path.name}: its month of maxNetPos, which gives the "
                                "month's MTUs, is not in the cache")
    mtus = _mtu(every, []).index
    rows = json.loads(path.read_text())
    if not rows:   # no constraint bound all month: every hub's spread is 0
        return pd.DataFrame([(t, f"spread_{h}", 0.0) for h in HUB_ZONE for t in mtus], columns=cols)
    df = pd.DataFrame(rows)
    df["ts"] = pd.to_datetime(df["dateTimeUtc"], utc=True).dt.tz_localize(None)
    df = df[df["shadowPrice"].notna() & (df["shadowPrice"] != 0)].drop_duplicates(
        ["ts", "cnecName", "contName"] if "contName" in df.columns else ["ts", "cnecName"])
    mtus = mtus.union(pd.Index(sorted(df["ts"].unique())))
    out = []
    for hub, zone in HUB_ZONE.items():
        own = (df["cnecName"].str.contains(hub, regex=False) | (df["biddingZoneFrom"] == hub)
               | (df["biddingZoneTo"] == hub))
        x = df[~own]
        s = -(x["shadowPrice"] * (x[f"ptdf_{hub}"].fillna(0.0) - x[f"ptdf_{zone}"].fillna(0.0)))
        per = s.groupby(x["ts"]).sum().reindex(mtus).fillna(0.0)
        out.append(pd.DataFrame({"ts": mtus, "column": f"spread_{hub}", "value": per.to_numpy()}))
    return pd.concat(out, ignore_index=True)[cols]


def _mtu(path: Path, fields: list[str]) -> pd.DataFrame:
    """The named fields of a Core endpoint with one row per MTU, indexed by naive UTC."""
    df = pd.DataFrame(json.loads(path.read_text()), columns=["dateTimeUtc", *fields])
    df["ts"] = pd.to_datetime(df.pop("dateTimeUtc"), utc=True).dt.tz_localize(None)
    return df.drop_duplicates("ts").set_index("ts").sort_index().astype(float)


def core_spread(shadow: Path) -> pd.DataFrame:
    """Long form (ts, column, value) from a month of the Core tool's `shadowPrices` and the
    same month of `priceSpread`, `netPos` and `allocationConstraint` beside it: per MTU
    `spread_PL` = the price Poland's interconnectors clear at less Poland's day-ahead price,
    EUR/MWh — minus the shadow price of Poland's allocation constraint. That shadow price is
    Poland's price less Germany's (border_DE_PL) less the network's part of it,
    Σ shadow price × (PTDF_DE − PTDF_PL) over the constraints that bound the result; it is
    read only where the published limit could bind — where Poland's Core net position and
    its two cables at any loading (PL_CABLES_MW) can reach the import limit (a positive shadow
    price) or the export limit (a negative one) — and is 0 elsewhere, where the residual is
    not the allocation constraint's. An MTU any of the three series lacks is absent."""
    cols = ["ts", "column", "value"]
    beside = lambda ep: shadow.with_name(shadow.name.replace(".shadowPrices.", f".{ep}."))  # noqa: E731
    missing = [ep for ep in CORE_ENDPOINTS[1:] if not beside(ep).exists()]
    if missing:
        raise FileNotFoundError(f"{shadow.name}: its month of {', '.join(missing)} is not in the "
                                "cache; `make history` fetches all four Core endpoints together")
    df = _mtu(beside("priceSpread"), ["border_DE_PL"]).join(
        [_mtu(beside("netPos"), ["hub_PL"]),
         _mtu(beside("allocationConstraint"), ["limitDown_PL", "limitUp_PL"])], how="inner"
    ).dropna()
    if df.empty:
        return pd.DataFrame(columns=cols)
    sp = pd.DataFrame(json.loads(shadow.read_text()))
    net = pd.Series(0.0, index=df.index)
    if not sp.empty:
        sp["ts"] = pd.to_datetime(sp["dateTimeUtc"], utc=True).dt.tz_localize(None)
        sp = sp[sp["shadowPrice"].notna()].drop_duplicates("id")
        part = sp["shadowPrice"] * (sp["hub_DE"].fillna(0.0) - sp["hub_PL"].fillna(0.0))
        net = part.groupby(sp["ts"]).sum().reindex(df.index).fillna(0.0)
    mu = df["border_DE_PL"] - net
    # what the two cables together would have to carry into (out of) Poland for the limit to bind
    need_in = df["hub_PL"] + df["limitDown_PL"]
    need_out = df["limitUp_PL"] - df["hub_PL"]
    binds = ((mu > 0) & (need_in.abs() <= PL_CABLES_MW)) | ((mu < 0)
                                                           & (need_out.abs() <= PL_CABLES_MW))
    return pd.DataFrame({"ts": df.index, "column": "spread_PL",
                         "value": (-mu.where(binds, 0.0)).to_numpy()})[cols]
