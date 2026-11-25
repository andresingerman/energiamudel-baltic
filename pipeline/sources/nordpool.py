"""Nord Pool data portal: the day-ahead auction's aggregated bid curves (D-108).

Page:   https://data.nordpoolgroup.com/auction/day-ahead/aggregated-bid-curves
API:    https://dataportal-api.nordpoolgroup.com/api/AggregatedBidCurves
        ?date=<delivery day>&marketCode=NPSDA&clusterName=<cluster>
        what the page itself asks for; no key. Only today's delivery day and, once the auction
        has cleared, tomorrow's answer; earlier days answer HTTP 401 (the history is sold).
Curves: the supply and the demand curve of every 15-minute MTU, as price and quantity pairs,
        aggregated over every NEMO of the cluster: BALTIC (EE + LV + LT), FI, SE (Sweden's
        four areas together; SE4 alone has none) and PL — a cluster's realised block volumes
        and its net import or export are folded into the curves (the page's note).
Terms:  the website's terms do not permit automatic extraction; Nord Pool's reply to the
        owner's inquiry (OPEN-10) of 2026-10-09 lets the open information be saved, the history
        paid (D-108). For the owner's calibration only (R-SUP-6, R-BND-6): never committed,
        published or redistributed.
Fetch:  `nordpool_fetch.py`, which launchd runs twice a day from a copy outside ~/Documents and
        which keeps every day in its spool; `make nordpool` fetches the same way and imports the
        spool here with lineage. The files cannot be fetched again: the spool and
        data/raw/nordpool belong in a backup.
"""

from __future__ import annotations

import gzip
import json
import sys
from datetime import UTC, date, datetime
from pathlib import Path

import pandas as pd

from .. import lineage
from . import nordpool_fetch, raw_dir
from .nordpool_fetch import SPOOL, URL, params

RAW = "nordpool"
SOURCE = "Nord Pool data portal"
LICENCE = ("Nord Pool data portal, the latest delivery day as the portal shows it publicly; "
           "saved with Nord Pool's consent for the owner's research, not redistributed (D-108)")


def import_spool(spool: Path = SPOOL) -> list[Path]:
    """Every day the spool holds and data/raw does not, with its lineage record; the record's
    time is when the day was fetched, not imported."""
    new = []
    for f in sorted(spool.glob("nordpool.abc.*.gz")):
        path = raw_dir(RAW) / f.name
        if path.exists():
            continue
        ds = f.name.removesuffix(".gz")
        _, _, cluster, day = ds.split(".")
        content = f.read_bytes()
        n = len(json.loads(gzip.decompress(content))["aggregatedPoints"])
        rec = lineage.measured(dataset=ds, source=SOURCE, endpoint=URL,
                               params=params(cluster, date.fromisoformat(day)), content=content,
                               licence=LICENCE, notes=f"{n} MTUs, gzipped as received")
        rec.fetched_at = datetime.fromtimestamp(f.stat().st_mtime, UTC).replace(
            microsecond=0).isoformat()
        path.write_bytes(content)
        rec.write()
        new.append(path)
    return new


def parse(path: Path) -> pd.DataFrame:
    """Long form (cluster, start, end, side, step, price, mw): every MTU's supply and demand
    curve as its price and quantity pairs, in the order the portal gives them; start and end
    UTC, naive."""
    d = json.loads(gzip.decompress(path.read_bytes()))
    rows = []
    for p in d["aggregatedPoints"]:
        start = pd.Timestamp(p["deliveryStart"]).tz_localize(None)
        end = pd.Timestamp(p["deliveryEnd"]).tz_localize(None)
        for i, s in enumerate(p["seriesData"]):
            for side in ("supply", "demand"):
                if s.get(f"{side}Price") is not None and s.get(f"{side}Quantity") is not None:
                    rows.append((d["aggregatedBiddingArea"], start, end, side, i,
                                 float(s[f"{side}Price"]), float(s[f"{side}Quantity"])))
    return pd.DataFrame(rows, columns=["cluster", "start", "end", "side", "step", "price", "mw"])


def main() -> int:
    """`make nordpool`: fetch as the schedule does, then import the spool."""
    rc = nordpool_fetch.main()
    print(f"{len(import_spool())} day(s) imported into data/raw/{RAW}")
    return rc


if __name__ == "__main__":
    sys.exit(main())
