"""ENTSO-E Transparency Platform REST API.

Docs: https://transparency.entsoe.eu/content/static_content/Static%20content/web%20api/Guide.html
Auth: `securityToken` query parameter, from ENTSOE_TOKEN. Limits: ~400 requests/minute; one
request may span at most one year; responses are XML.

Document types this project uses (SPECIFICATION.md R-DATA-1). Each entry is a request template;
`make smoke` proves the parameters before anything is built on them.
"""

from __future__ import annotations

import io
import os
import re
import threading
import time
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import requests

from .. import lineage
from ..config import PSR_TO_TECH, ZONES
from . import MissingCredential, raw_dir

SOURCE = "ENTSO-E Transparency Platform"
LICENCE = "ENTSO-E Transparency Platform terms of use; free re-use with attribution"
BASE_URL = "https://web-api.tp.entsoe.eu/api"
RAW = "entsoe"

# name -> (documentType, fixed params, how the zone/border maps onto domain params)
DOCS: dict[str, dict] = {
    "A44": {"documentType": "A44", "domain": "in_out",
            "desc": "day-ahead prices"},
    "A25": {"documentType": "A25", "businessType": "B09", "contract_MarketAgreement.Type": "A01",
            "domain": "in_out",
            "desc": "day-ahead net position, implicit allocation (12.1.E); one series per sign"},
    "A65": {"documentType": "A65", "processType": "A16", "domain": "outBiddingZone",
            "desc": "actual total load"},
    "A75": {"documentType": "A75", "processType": "A16", "domain": "in",
            "desc": "actual generation per production type"},
    "A69": {"documentType": "A69", "processType": "A01", "domain": "in",
            "desc": "day-ahead forecast of wind and solar generation"},
    # the key carries no dot: db/build.py dispatches on the dataset id's second part
    "A65DA": {"documentType": "A65", "processType": "A01", "domain": "outBiddingZone",
              "desc": "day-ahead total load forecast"},
    "A68": {"documentType": "A68", "processType": "A33", "domain": "in",
            "desc": "installed capacity per production type (annual)"},
    "A73": {"documentType": "A73", "processType": "A16", "domain": "in",
            "desc": "actual generation per generation unit (>= 100 MW)"},
    "A71": {"documentType": "A71", "processType": "A33", "domain": "in",
            "desc": "installed capacity per generation unit"},
    "A11": {"documentType": "A11", "domain": "border",
            "desc": "physical cross-border flows (one direction per request)"},
    "A09": {"documentType": "A09", "contract_MarketAgreement.Type": "A01", "domain": "border",
            "desc": "scheduled commercial exchanges, day-ahead (one direction per request)"},
    "A61": {"documentType": "A61", "contract_MarketAgreement.Type": "A01", "domain": "border",
            "desc": "forecasted transfer capacities, day-ahead (one direction per request)"},
    "A31": {"documentType": "A31", "contract_MarketAgreement.Type": "A01", "auction.Type": "A01",
            "domain": "border",
            "desc": "offered capacity, implicit day-ahead allocation (NordBalt; A61 is empty)"},
    "A80": {"documentType": "A80", "domain": "biddingZone", "zip": True,
            "desc": "generation unavailability (planned + forced); zip of one XML per event"},
    "A78": {"documentType": "A78", "domain": "border", "zip": True,
            "desc": "transmission unavailability; zip of one XML per event"},
    "A72": {"documentType": "A72", "processType": "A16", "domain": "in",
            "desc": "reservoir filling (weekly)"},
    "A95": {"documentType": "A95", "businessType": "B11", "domain": "BiddingZone", "at_date": True,
            "desc": "production and generation units (master data): nominal power per "
                    "generating unit as registered on the implementation date"},
}


# ENTSO-E allows ~400 requests/minute and answers a burst above that with a silent freeze of
# ten minutes or more. One process-wide pacer keeps every thread under 150/minute together.
_PACE_S = 0.4
_pace_lock = threading.Lock()
_pace_next = 0.0


def _pace() -> None:
    global _pace_next
    with _pace_lock:
        wait = _pace_next - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        _pace_next = max(_pace_next, time.monotonic()) + _PACE_S


def _eic(zone: str) -> str:
    return ZONES[zone].eic


def _token() -> str:
    t = os.environ.get("ENTSOE_TOKEN")
    if not t:
        raise MissingCredential("ENTSOE_TOKEN is not set (see .env.example)")
    return t


def _period(start: datetime, end: datetime) -> dict:
    fmt = "%Y%m%d%H%M"
    return {"periodStart": start.strftime(fmt), "periodEnd": end.strftime(fmt)}


def build_params(doc: str, zone: str | None = None, border: str | None = None,
                 reverse: bool = False, start: datetime | None = None,
                 end: datetime | None = None) -> dict:
    """Assemble the query for one document type and one zone or border.

    Times are UTC. For a border, the request covers ONE direction: from_zone -> to_zone, or the
    reverse when `reverse=True`; the dataset id records which.
    """
    spec = DOCS[doc]
    p = {k: v for k, v in spec.items() if k not in ("domain", "desc", "zip", "at_date")}
    kind = spec["domain"]
    if kind == "border":
        if not border:
            raise ValueError(f"{doc} needs a border")
        a, b = border.split("-")
        if reverse:
            a, b = b, a
        p["out_Domain"], p["in_Domain"] = _eic(a), _eic(b)
    else:
        if not zone:
            raise ValueError(f"{doc} needs a zone")
        eic = _eic(zone)
        if kind == "in_out":
            p["in_Domain"] = p["out_Domain"] = eic
        elif kind == "in":
            p["in_Domain"] = eic
        elif kind == "outBiddingZone":
            p["outBiddingZone_Domain"] = eic
        elif kind == "biddingZone":
            p["biddingZone_Domain"] = eic
        elif kind == "BiddingZone":            # A95 spells it with a capital B
            p["BiddingZone_Domain"] = eic
    if start and end:
        # master data is a snapshot on one date, not a period
        p.update({"Implementation_DateAndOrTime": f"{start:%Y-%m-%d}"} if spec.get("at_date")
                 else _period(start, end))
    return p


def dataset_id(doc: str, zone: str | None, border: str | None, reverse: bool,
               start: datetime) -> str:
    where = border if border else zone
    if border:
        where = f"{where}.{'rev' if reverse else 'fwd'}"
    return f"entsoe.{doc}.{where}.{start:%Y-%m}"


def month_window(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1)
    end = datetime(year + (month == 12), (month % 12) + 1, 1)
    return start, end


def fetch(doc: str, year: int, month: int, zone: str | None = None,
          border: str | None = None, reverse: bool = False,
          session: requests.Session | None = None, whole_year: bool = False,
          until: datetime | None = None) -> Path:
    """Fetch one document for one month, cache the raw XML, write its lineage record.

    `whole_year=True` requests January to December in one call (annual documents such as
    A68 installed capacity); the dataset id then carries the year only.

    `until` (a UTC midnight inside the month) requests the month so far, up to that day: the
    dataset id gains `.to-<day>` (`entsoe.A44.EE.2026-11.to-2026-11-23`), so that the whole month,
    fetched once it is complete, has an id of its own and loads after it, its hours replacing these
    (D-257).

    Idempotent: an existing raw file is returned without a request, so re-running the pipeline
    never re-downloads and the lineage record keeps the original fetch time.
    """
    start, end = (datetime(year, 1, 1), datetime(year + 1, 1, 1)) if whole_year \
        else month_window(year, month)
    ds = dataset_id(doc, zone, border, reverse, start)
    if whole_year:
        ds = ds[:-3]                       # "....2025-01" -> "....2025"
    if until is not None:
        if not start < until < end:
            raise ValueError(f"{ds}: until {until:%Y-%m-%d} is not inside the month")
        ds, end = f"{ds}.to-{until:%Y-%m-%d}", until
    raw = raw_dir(RAW) / f"{ds}.{'zip' if DOCS[doc].get('zip') else 'xml'}"
    if raw.exists():
        return raw
    params = build_params(doc, zone, border, reverse, start, end)
    s = session or requests.Session()
    _pace()
    r = s.get(BASE_URL, params={**params, "securityToken": _token()}, timeout=120)
    content = r.content
    if not r.ok and DOCS[doc].get("zip") and b"exceeds the allowed maximum" in content:
        # More than 200 outage events in the window: page with `offset` and merge the zips.
        content = _paged_zip(s, params)
    elif not r.ok:
        # Nothing is cached: a failed response must not masquerade as data on the next run.
        raise RuntimeError(f"{ds}: HTTP {r.status_code}: {_reason(content)}")
    raw.write_bytes(content)
    # The token must never reach the lineage record; params above do not contain it.
    lineage.measured(dataset=ds, source=SOURCE, endpoint=BASE_URL, params=params,
                     content=content, licence=LICENCE, http_status=r.status_code).write()
    return raw


def _paged_zip(s: requests.Session, params: dict, page: int = 200) -> bytes:
    """Unavailability documents come at most 200 per request; `offset` pages through them."""
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as merged:
        offset, n = 0, 0
        while True:
            _pace()
            r = s.get(BASE_URL, params={**params, "offset": offset, "securityToken": _token()},
                      timeout=120)
            if not r.content.startswith(b"PK"):
                if b"no matching data" in r.content.lower():
                    break                   # the acknowledgement past the last page
                # anything else is a failure, not the end: a partial zip must not be cached as whole
                raise RuntimeError(f"outages from offset {offset}: HTTP {r.status_code}: "
                                   f"{_reason(r.content)}")
            with zipfile.ZipFile(io.BytesIO(r.content)) as part:
                names = part.namelist()
                for name in names:
                    n += 1
                    merged.writestr(f"{n:04d}-{name.split('-', 1)[-1]}", part.read(name))
            if len(names) < page:
                break
            offset += page
    return out.getvalue()


# ----------------------------------------------------------------------------- parsing
# P1Y: annual documents (A68) carry one point per period; 365 days is only used for pos 1.
_RES = {"PT1M": 1, "PT15M": 15, "PT30M": 30, "PT60M": 60, "P1D": 1440, "P7D": 10080,
        "P1Y": 525600}


def _local(tag: str) -> str:
    return tag.split("}", 1)[-1]


def _find(el: ET.Element, name: str) -> ET.Element | None:
    for child in el.iter():
        if _local(child.tag) == name:
            return child
    return None


def _first(el: ET.Element, *names: str) -> ET.Element | None:
    """First of several tag names that exists. (An empty Element is falsy: never use `or`.)"""
    for n in names:
        found = _find(el, n)
        if found is not None:
            return found
    return None


def _findall(el: ET.Element, name: str) -> list[ET.Element]:
    return [c for c in el.iter() if _local(c.tag) == name]


def _strip(el: ET.Element) -> str:
    """An element's text, stripped; an element the document gives without text is an error."""
    if el.text is None:
        raise ValueError(f"<{_local(el.tag)}> without text")
    return el.text.strip()


def _text(el: ET.Element, *names: str) -> str:
    """The text of the first of `names` under `el`, which the document must hold."""
    found = _first(el, *names)
    if found is None:
        raise ValueError(f"no {' or '.join(names)} in <{_local(el.tag)}>")
    return _strip(found)


def _reason(content: bytes) -> str:
    try:
        root = ET.fromstring(content)
        r = _find(root, "text")
        return (r.text or "").strip() if r is not None else "no reason text"
    except ET.ParseError:
        return content[:200].decode("utf-8", "replace")


def parse(path: Path) -> pd.DataFrame:
    """Generic parser for the time-series documents (A44, A65, A75, A11, A61, A72).

    Returns one row per point with columns:
        ts        naive UTC timestamp of the interval START
        value     the point's quantity or price.amount
        minutes   resolution of the period the point belongs to
        psr_type  ENTSO-E production type if present (A75/A68), else None
        tech      model technology code mapped from psr_type, else None
        in_domain / out_domain  EIC codes as given in the TimeSeries

    Curve type A03 (variable resolution) omits positions whose value repeats the previous one;
    those are filled forward so every interval in the period is present.
    """
    root = ET.fromstring(path.read_bytes())
    rows: list[dict] = []
    for ts_el in _findall(root, "TimeSeries"):
        # a price series in another currency is the same prices again: Poland's day-ahead
        # documents before 2020 carry each day in PLN beside EUR (ERRATA E-074)
        cur = _find(ts_el, "currency_Unit.name")
        if cur is not None and (cur.text or "").strip() not in ("", "EUR"):
            continue
        psr = _find(ts_el, "psrType")
        psr_type = psr.text.strip() if psr is not None and psr.text else None
        # A44/A11/A61 name the domains in_Domain / out_Domain; the generation and load
        # documents (A75, A65, A72) name them inBiddingZone_Domain / outBiddingZone_Domain.
        # For A75 an outBiddingZone series is consumption (pumping of a pumped-storage plant).
        in_d = _first(ts_el, "in_Domain.mRID", "inBiddingZone_Domain.mRID")
        out_d = _first(ts_el, "out_Domain.mRID", "outBiddingZone_Domain.mRID")
        curve = _find(ts_el, "curveType")
        a03 = curve is not None and (curve.text or "").strip() == "A03"
        for per in _findall(ts_el, "Period"):
            start_el = _find(per, "start")
            res_el = _find(per, "resolution")
            if start_el is None or res_el is None:
                continue
            start = _parse_utc(_strip(start_el))
            minutes = _RES.get(_strip(res_el))
            if minutes is None:
                raise ValueError(f"{path.name}: unsupported resolution {res_el.text}")
            end_el = _find(per, "end")
            n = None
            if end_el is not None:
                # rounded: a weekly period across the spring clock change is an hour short of
                # whole weeks, and truncating it lost its last week (A72)
                n = round((_parse_utc(_strip(end_el)) - start) / timedelta(minutes=minutes))
            points: dict[int, float] = {}
            for pt in _findall(per, "Point"):
                points[int(_text(pt, "position"))] = float(_text(pt, "quantity", "price.amount"))
            if n is None:
                n = max(points) if points else 0
            last = None
            for pos in range(1, n + 1):
                v = points.get(pos)
                if v is None:
                    if not a03:
                        continue
                    v = last
                last = v
                rows.append({
                    "ts": start + timedelta(minutes=minutes * (pos - 1)),
                    "value": v,
                    "minutes": minutes,
                    "psr_type": psr_type,
                    "tech": PSR_TO_TECH.get(psr_type) if psr_type else None,
                    "in_domain": _strip(in_d) if in_d is not None else None,
                    "out_domain": _strip(out_d) if out_d is not None else None,
                })
    return pd.DataFrame(rows, columns=["ts", "value", "minutes", "psr_type", "tech",
                                       "in_domain", "out_domain"])


_UTC_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})Z$")


def _parse_utc(s: str) -> datetime:
    m = _UTC_RE.match(s)
    if not m:
        raise ValueError(f"expected ENTSO-E UTC time like 2025-01-01T00:00Z, got {s!r}")
    return datetime.fromisoformat(f"{m.group(1)}T{m.group(2)}:{m.group(3)}:00")


def to_hourly(df: pd.DataFrame, by: tuple[str, ...] = ("tech",)) -> pd.DataFrame:
    """Resample sub-hourly points to hourly averages, per group (R-DATA-5).

    Points already at 60 minutes pass through unchanged. Groups are the columns that
    distinguish series inside one document (technology for A75, nothing for A44/A65).
    """
    if df.empty:
        return df
    keys = [k for k in by if k in df.columns and df[k].notna().any()]
    df = df.copy()
    df["hour"] = df["ts"].dt.floor("h")
    out = (df.groupby(keys + ["hour"], dropna=False)["value"].mean()
             .reset_index().rename(columns={"hour": "ts"}))
    return out


# ----------------------------------------------------------------------------- outages (A80, A78)
# docStatus of an outage document that did not take place; an active one has A05 or none
OUTAGE_NOT_HELD = {"A09", "A13"}


def parse_unavailability(path: Path) -> pd.DataFrame:
    """A80 / A78: one row per availability period of each event.

    Columns: id (document mRID + period position), kind ('generation' | 'transmission'),
    asset (resource mRID or asset name), zone, start_ts, end_ts (UTC, naive), mw_available,
    mw_nominal (A80 only), planned (businessType A53), reason.
    The zip holds one XML per event; a non-zip file is an acknowledgement with no events.
    A document whose docStatus is A09 (cancelled) or A13 (withdrawn) is skipped: the outage did
    not take place, and the API returns it alongside the active ones (ERRATA E-065).
    """
    rows: list[dict] = []
    if not path.read_bytes().startswith(b"PK"):
        return pd.DataFrame(columns=["id", "kind", "asset", "zone", "start_ts", "end_ts",
                                     "mw_available", "mw_nominal", "planned", "reason"])
    with zipfile.ZipFile(path) as z:
        for name in sorted(z.namelist()):
            root = ET.fromstring(z.read(name))
            status = _find(root, "docStatus")
            if status is not None and "".join(status.itertext()).strip() in OUTAGE_NOT_HELD:
                continue
            kind = "generation" if _text(root, "type") == "A80" else "transmission"
            doc_id = _text(root, "mRID")
            for ts_el in _findall(root, "TimeSeries"):
                bt = _find(ts_el, "businessType")
                planned = bt is not None and (bt.text or "").strip() == "A53"
                zone_el = _find(ts_el, "biddingZone_Domain.mRID")
                zone = _strip(zone_el) if zone_el is not None else None
                if kind == "generation":
                    res = _find(ts_el, "production_RegisteredResource.mRID")
                    nom = _find(ts_el, "production_RegisteredResource.pSRType"
                                       ".powerSystemResources.nominalP")
                else:
                    res = _find(ts_el, "name")
                    nom = None
                asset = res.text.strip() if res is not None and res.text else name
                nominal = float(nom.text) if nom is not None and nom.text else None
                reason_el = _find(ts_el, "text")
                reason = (reason_el.text or "").strip() if reason_el is not None else None
                for per in _findall(ts_el, "Available_Period"):
                    start = _parse_utc(_text(per, "start"))
                    end = _parse_utc(_text(per, "end"))
                    minutes = _RES[_text(per, "resolution")]
                    pts = sorted((int(_text(pt, "position")), float(_text(pt, "quantity")))
                                 for pt in _findall(per, "Point"))
                    for i, (pos, q) in enumerate(pts):
                        seg_start = start + timedelta(minutes=minutes * (pos - 1))
                        seg_end = start + timedelta(minutes=minutes * (pts[i + 1][0] - 1)) \
                            if i + 1 < len(pts) else end
                        rows.append({"id": f"{doc_id}.{pos}", "kind": kind, "asset": asset,
                                     "zone": zone, "start_ts": seg_start, "end_ts": seg_end,
                                     "mw_available": q, "mw_nominal": nominal,
                                     "planned": planned, "reason": reason})
    return pd.DataFrame(rows)


# ----------------------------------------------------------------------------- units (A71)
def parse_units(path: Path) -> pd.DataFrame:
    """A71 installed capacity per generation unit: (code, name, psr_type, tech, mw)."""
    root = ET.fromstring(path.read_bytes())
    rows = []
    for ts_el in _findall(root, "TimeSeries"):
        psr = _find(ts_el, "psrType")
        code = _find(ts_el, "registeredResource.mRID")
        name = _find(ts_el, "registeredResource.name")
        q = _find(ts_el, "quantity")
        if q is None or code is None:
            continue
        psr_type = psr.text.strip() if psr is not None and psr.text else None
        rows.append({"code": _strip(code),
                     "name": (name.text or "").strip() if name is not None else _strip(code),
                     "psr_type": psr_type, "tech": PSR_TO_TECH.get(psr_type) if psr_type else None,
                     "mw": float(_strip(q))})
    # A unit can appear in several TimeSeries of one document; the unit is the same.
    return (pd.DataFrame(rows, columns=["code", "name", "psr_type", "tech", "mw"])
              .drop_duplicates("code").reset_index(drop=True))


# ----------------------------------------------------------------------------- units (A95)
def parse_generating_units(path: Path) -> pd.DataFrame:
    """A95 master data: one row per generating unit with its production unit, production type
    and nominal power (production, unit, name, psr_type, tech, mw)."""
    root = ET.fromstring(path.read_bytes())
    rows = []
    for ts_el in _findall(root, "TimeSeries"):
        production = _text(ts_el, "registeredResource.name")
        for gu in _findall(ts_el, "GeneratingUnit_PowerSystemResources"):
            psr = _text(gu, "generatingUnit_PSRType.psrType")
            rows.append({"production": production, "unit": _text(gu, "mRID"),
                         "name": _text(gu, "name"), "psr_type": psr,
                         "tech": PSR_TO_TECH.get(psr), "mw": float(_text(gu, "nominalP"))})
    return pd.DataFrame(rows, columns=["production", "unit", "name", "psr_type", "tech", "mw"])
