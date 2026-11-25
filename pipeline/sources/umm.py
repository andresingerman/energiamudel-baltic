"""Nord Pool REMIT UMM: urgent market messages on transmission unavailability (R-LINK-6).

API:    GET https://ummapi.nordpoolgroup.com/messages  (public read; `limit` <= 2000, `skip`
        pages; HTTP 413 above 2000). Docs:
        https://developers.nordpoolgroup.com/reference/umm-api-messages-search.md
        Probed 2026-09-24: 1 332 transmission messages for Estonia alone.
Scope:  messageTypes=TransmissionUnavailability for each core zone's area EIC; current versions
        only (IncludeOutdated defaults to false): the last version of a message is the record
        of the event.
Use:    labels the reasons behind the A31 capacity profile in the interface ("EstLink 2 cable
        fault, 2024-01-26 -> 2024-09-03"); never alters the profile. A cross-check of A78.

The messages are revised and new ones appear, so a fetch is a snapshot: the dataset id carries
the month it was taken (like the World Bank vintage); a later snapshot is a new dataset.
Codes (from the messages themselves; the API reference does not list them, so 'verify'):
messageType 3 = transmission unavailability; unavailabilityType 1 = unplanned, 2 = planned.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import pandas as pd
import requests

from ..config import ZONES
from . import cached_get, raw_dir

SOURCE = "Nord Pool REMIT UMM"
LICENCE = "Nord Pool UMM platform, public REMIT inside information; free access"
RAW = "umm"
BASE_URL = "https://ummapi.nordpoolgroup.com/messages"
PAGE = 2000


def fetch(zone: str, vintage: str | None = None) -> Path:
    """Every current transmission-unavailability message touching `zone`'s area."""
    vintage = vintage or pd.Timestamp.now(tz="UTC").strftime("%Y-%m")
    ds = f"umm.transmission.{zone}.{vintage}"
    path = raw_dir(RAW) / f"{ds}.json"
    if path.exists():
        return path
    params: dict[str, str | int] = {"messageTypes": "TransmissionUnavailability",
                                    "areas": ZONES[zone].eic, "limit": PAGE}
    items: list[dict] = []
    total = None
    while total is None or len(items) < total:
        r = requests.get(BASE_URL, params={**params, "skip": len(items)}, timeout=120)
        r.raise_for_status()
        payload = r.json()
        total = payload["total"]
        items += payload["items"]
        if not payload["items"]:
            break
        time.sleep(0.5)
    if len(items) != total:
        raise RuntimeError(f"{ds}: {len(items)} messages read, the API reports {total}")
    body = json.dumps(items, separators=(",", ":"), ensure_ascii=False).encode()
    return cached_get(raw=RAW, dataset=ds, ext="json", url=BASE_URL, params=params,
                      source=SOURCE, licence=LICENCE, content=body,
                      notes=f"{total} messages, snapshot {vintage}")


def parse(path: Path) -> pd.DataFrame:
    """One row per message x transmission unit x time period."""
    rows = []
    for m in json.loads(path.read_text()):
        assets = "; ".join(a.get("name", "") for a in m.get("assets") or [])
        for u in m.get("transmissionUnits") or []:
            for p in u.get("timePeriods") or []:
                rows.append({
                    "message_id": m["messageId"], "version": m.get("version"),
                    "published": m.get("publicationDate"), "event_status": m.get("eventStatus"),
                    "unavailability_type": m.get("unavailabilityType"),
                    "reason_code": m.get("reasonCode"),
                    "reason": m.get("unavailabilityReason"), "remarks": m.get("remarks"),
                    "assets": assets, "unit": u.get("name"),
                    "out_area": u.get("outAreaEic"), "in_area": u.get("inAreaEic"),
                    "installed_mw": u.get("installedCapacity"),
                    "unavailable_mw": p.get("unavailableCapacity"),
                    "available_mw": p.get("availableCapacity"),
                    "start": p.get("eventStart"), "stop": p.get("eventStop")})
    df = pd.DataFrame(rows)
    for c in ("published", "start", "stop"):
        if c in df:
            df[c] = pd.to_datetime(df[c], utc=True, format="ISO8601").dt.tz_localize(None)
    return df
