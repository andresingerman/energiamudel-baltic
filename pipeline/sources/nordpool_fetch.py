"""Nord Pool's aggregated bid curves into a spool outside the repository (D-108).

A plain script for macOS's own /usr/bin/python3 (3.9, the standard library only): launchd may not
read ~/Documents, so `make nordpool-schedule` copies this file to ~/Library/Application Support/
energiamudel/ and runs it there at 15:00 and 23:30 (launch agent ee.energiamudel.nordpool; log
~/Library/Logs/energiamudel-nordpool.log). `make nordpool` runs it too and then imports the spool
into data/raw/nordpool with lineage (`nordpool.py`).

The portal serves today's delivery day and, once the auction has cleared, tomorrow's; earlier days
answer 401 (the history is sold). A day is asked for until it is held, never after; a day not
fetched while it is served is lost. A run that gets nothing, fails twice or gets an incomplete
day says so in a macOS notification; an incomplete day is kept as .partial, never as the day.
"""

from __future__ import annotations

import gzip
import json
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

URL = "https://dataportal-api.nordpoolgroup.com/api/AggregatedBidCurves"
MARKET = "NPSDA"
CLUSTERS = ("BALTIC", "FI", "SE", "PL")
SPOOL = Path.home() / "Library" / "Application Support" / "energiamudel" / "nordpool"
MARKET_TZ = ZoneInfo("Europe/Oslo")     # delivery days are the market's days, CET
HEADERS = {"Origin": "https://data.nordpoolgroup.com",
           "Referer": "https://data.nordpoolgroup.com/",
           "User-Agent": "energiamudel-v5/0.1 (personal research collector; one request per "
                         "cluster and day)"}


def dataset_id(cluster: str, day: date) -> str:
    return f"nordpool.abc.{cluster}.{day:%Y-%m-%d}"


def params(cluster: str, day: date) -> dict:
    return {"date": f"{day:%Y-%m-%d}", "marketCode": MARKET, "clusterName": cluster}


def expected_mtus(day: date) -> int:
    """The delivery day's 15-minute MTUs in market time: 92, 96 or 100."""
    a, b = (datetime(d.year, d.month, d.day, tzinfo=MARKET_TZ).timestamp()
            for d in (day, day + timedelta(days=1)))
    return round((b - a) / 900)


def fetch(cluster: str, day: date, spool: Path = SPOOL) -> str:
    """One cluster's curves for one delivery day into the spool, gzipped as received: 'held',
    'fetched', 'not served' or 'incomplete (…)'."""
    path = spool / f"{dataset_id(cluster, day)}.gz"
    if path.exists():
        return "held"
    req = urllib.request.Request(f"{URL}?{urllib.parse.urlencode(params(cluster, day))}",
                                 headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            body = r.read()
    except urllib.error.HTTPError as e:
        if e.code in (401, 404):
            return "not served"
        raise
    n = len(json.loads(body).get("aggregatedPoints") or []) if body.strip() else 0
    if n == 0:
        return "not served"
    spool.mkdir(parents=True, exist_ok=True)
    want = expected_mtus(day)
    if n != want:                       # held as the day, it would never be asked for again
        path.with_suffix(".partial").write_bytes(gzip.compress(body, mtime=0))
        return f"incomplete ({n} of {want} MTUs)"
    tmp = path.with_suffix(".tmp")
    tmp.write_bytes(gzip.compress(body, mtime=0))
    tmp.replace(path)                   # a run cut short leaves no half file that looks held
    return "fetched"


def run(spool: Path) -> list:
    today = datetime.now(MARKET_TZ).date()
    said = []
    for day in (today, today + timedelta(days=1)):
        for c in CLUSTERS:
            said.append(fetch(c, day, spool))
            print(f"{datetime.now():%Y-%m-%d %H:%M} {dataset_id(c, day)}: {said[-1]}", flush=True)
    return said


def main(spool: Path = SPOOL) -> int:
    for attempt in (1, 2):
        try:
            said = run(spool)
            break
        except (OSError, ValueError) as e:  # the network, the server, a body that is not JSON
            print(f"{datetime.now():%Y-%m-%d %H:%M} attempt {attempt}: {e!r}", flush=True)
            said = ["error"]
            if attempt == 1:
                time.sleep(300)             # just woken, say, and the network not up yet
    if any(s in ("held", "fetched") for s in said) and not any(
            s.startswith(("incomplete", "error")) for s in said):
        return 0
    subprocess.run(["/usr/bin/osascript", "-e", 'display notification "Nord Pool curves not '
                    'collected: see ~/Library/Logs/energiamudel-nordpool.log" with title '
                    '"energiamudel"'], check=False)
    return 1


if __name__ == "__main__":
    sys.exit(main())
