"""Fetch every dataset v5 needs, 2020 to the last complete month (Stage 2).

Run:  make history          (reads .env; idempotent: only missing raw files are requested)

A failed fetch is printed and the run goes on; the exit status is 1 if any fetch failed, and
every failure is listed again at the end, so `make history && make db` stops before building a
database with holes in it. The scope is SPECIFICATION.md R-DATA-1/R-DATA-2 as narrowed by
DECISIONS.md D-002:

  ENTSO-E    prices of the six zones; load, generation, capacity and units of EE, LV, LT, FI;
             reservoir filling of LV, LT; generation outages and net positions of EE, LV, LT;
             flows, offered capacity, transmission outages and scheduled exchanges of the five
             borders; generation and capacity of EE, LV, LT 2015-2019 (R-TIME-5, D-006)
  Fingrid    EstLink official day-ahead capacity per direction and EstLink flow
  BTD        reserves procured and cross-border capacity allocated to balancing, 2025 ->
  JAO        Nordic flow-based limits since 2024-10-29 (FI_EL = EstLink)
  UMM        Nord Pool transmission-unavailability messages for EE, LV, LT (a snapshot)
  weather    Open-Meteo, EE, LV, LT, 2020 -> and the climate years 1995, 2008, 2009;
             EEX EUA auctions; World Bank Pink Sheet; ECB USD/EUR rate
  archives   TYNDP 2024 package, ERAA 2025, DEA and Statistics Finland catalogues
  documents  every published document the documentary CSVs cite (pipeline/sources/documents.py)
"""

from __future__ import annotations

import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime

import requests
from dotenv import load_dotenv

from .config import BORDERS, BOUNDARY_FLEET_YEAR, ZONES, core_zones
from .sources import (
    btd,
    catalogue,
    documents,
    ecb,
    eex,
    energimyndigheten,
    entsoe,
    eraa,
    fingrid,
    irena,
    jao,
    openmeteo,
    tyndp,
    tyndp2026,
    umm,
    worldbank,
)

FIRST_YEAR = 2020
EEX_FIRST_YEAR = 2017                   # EEX's public archive begins here (D-087)
STATISTICS_FIRST_YEAR = 2016            # the Statistics page's ten years of prices (D-092)
OVERLAP_YEARS = range(2015, 2020)       # PECD 3.1 ends in 2019 (R-TIME-5, ERRATA E-002)
CLIMATE_YEARS = (1995, 2008, 2009)      # TYNDP 2024's climate years (R-TIME-2)
CORE = core_zones()
CORE_FI = CORE + ["FI"]


def months(first=(FIRST_YEAR, 1)):
    now = datetime.now(UTC)
    y, m = first
    while (y, m) < (now.year, now.month):
        yield y, m
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


def years(first_year: int = FIRST_YEAR):
    return range(first_year, datetime.now(UTC).year + 1)


_local = threading.local()


def session() -> requests.Session:
    """The calling thread's own session: one Session is not safe in the pool's several threads."""
    if not hasattr(_local, "s"):
        _local.s = requests.Session()
    return _local.s


def jobs():
    """Yield (label, callable) for every dataset the cache should hold."""
    def e(doc, y, m, **kw):
        return lambda: entsoe.fetch(doc, y, m, session=session(), **kw)

    for y, m in months():
        for z in ZONES:
            yield f"entsoe A44 {z} {y}-{m:02d}", e("A44", y, m, zone=z)
        for z in CORE_FI:
            for doc in ("A65", "A75"):
                yield f"entsoe {doc} {z} {y}-{m:02d}", e(doc, y, m, zone=z)
        for z in ("LV", "LT"):
            yield f"entsoe A72 {z} {y}-{m:02d}", e("A72", y, m, zone=z)
        for z in CORE:
            for doc in ("A80", "A25", "A69", "A65DA"):
                yield f"entsoe {doc} {z} {y}-{m:02d}", e(doc, y, m, zone=z)
        for b in BORDERS:
            for doc in ("A11", "A31", "A78", "A09"):
                for rev in (False, True):
                    yield (f"entsoe {doc} {b} {'rev' if rev else 'fwd'} {y}-{m:02d}",
                           e(doc, y, m, border=b, reverse=rev))
        for series in fingrid.DATASETS:
            if fingrid.ended(series, y, m):          # Fingrid ended it (ERRATA E-195)
                continue
            yield f"fingrid {series} {y}-{m:02d}", lambda sr=series, y=y, m=m: fingrid.fetch(
                sr, y, m)
    for y, m in months((2025, 1)):
        for rep in ("allocated_cb_capacity", "procured_reserves"):
            yield f"btd {rep} {y}-{m:02d}", lambda r=rep, y=y, m=m: btd.fetch(r, y, m)
    for y, m in [(2025, m) for m in range(1, 13)]:
        yield f"btd procured_reserves_legacy {y}-{m:02d}", lambda y=y, m=m: btd.fetch(
            "procured_reserves_legacy", y, m)
    for y, m in [(2025, m) for m in range(2, 10)]:
        yield f"btd allocated_cb_capacity_legacy {y}-{m:02d}", lambda y=y, m=m: btd.fetch(
            "allocated_cb_capacity_legacy", y, m)
    for y, m in months((jao.FIRST_DAY.year, jao.FIRST_DAY.month)):
        for ep in (*jao.ENDPOINTS, jao.FB_ENDPOINT):
            yield f"jao {ep} {y}-{m:02d}", lambda ep=ep, y=y, m=m: jao.fetch(ep, y, m)
    for y, m in months((jao.CORE_FIRST_DAY.year, jao.CORE_FIRST_DAY.month)):
        for ep in jao.CORE_ENDPOINTS:
            yield f"jao {ep} {y}-{m:02d}", lambda ep=ep, y=y, m=m: jao.fetch(ep, y, m)
    for y in years():
        for z in CORE_FI:
            for doc in ("A68", "A71"):
                yield f"entsoe {doc} {z} {y}", lambda d=doc, z=z, y=y: entsoe.fetch(
                    d, y, 1, zone=z, session=session(), whole_year=True)
        # which oil-shale units exist on 1 January, with nominal power (R-SUP-4)
        yield f"entsoe A95 EE {y}", lambda y=y: entsoe.fetch(
            "A95", y, 1, zone="EE", session=session(), whole_year=True)
        for z in CORE:
            yield f"openmeteo {z} {y}", lambda z=z, y=y: openmeteo.fetch(z, y)
        yield f"eex {y}", lambda y=y: eex.fetch(y)
    # the boundary zones' fleet beside the market model's (D-256); Finland's is fetched above
    for z in ("SE4", "PL"):
        yield f"entsoe A68 {z} {BOUNDARY_FLEET_YEAR}", lambda z=z: entsoe.fetch(
            "A68", BOUNDARY_FLEET_YEAR, 1, zone=z, session=session(), whole_year=True)
    for y in OVERLAP_YEARS:
        for z in CORE:
            yield f"entsoe A68 {z} {y}", lambda z=z, y=y: entsoe.fetch(
                "A68", y, 1, zone=z, session=session(), whole_year=True)
            for m in range(1, 13):
                yield f"entsoe A75 {z} {y}-{m:02d}", e("A75", y, m, zone=z)
    for y in range(EEX_FIRST_YEAR, FIRST_YEAR):   # the CO2 price's ten years (D-087)
        yield f"eex {y}", lambda y=y: eex.fetch(y)
    for y in range(STATISTICS_FIRST_YEAR, FIRST_YEAR):  # the day-ahead prices' ten years (D-092)
        for m in range(1, 13):
            for z in ZONES:
                yield f"entsoe A44 {z} {y}-{m:02d}", e("A44", y, m, zone=z)
    yield "worldbank", worldbank.fetch
    yield "ecb", ecb.fetch
    yield "irena", irena.fetch
    yield "energimyndigheten", energimyndigheten.fetch
    for y in CLIMATE_YEARS:                  # temperature of the climate years (R-SUP-5)
        for z in CORE:
            yield f"openmeteo {z} {y}", lambda z=z, y=y: openmeteo.fetch(z, y)
    for z in CORE:
        yield f"umm {z}", lambda z=z: umm.fetch(z)
    for url in tyndp.FILES:
        yield f"tyndp {url.rsplit('/', 1)[-1]}", lambda u=url: tyndp.fetch(u)
    for rel in tyndp2026.FILES:                      # the second scenario family (D-010)
        yield f"tyndp2026 {rel.rsplit('/', 1)[-1]}", lambda r=rel: tyndp2026.fetch(r)
    for item in eraa.FILES:
        yield f"eraa {item}", lambda i=item: eraa.fetch(i)
    for item in eraa.MEMBERS:
        yield f"eraa {item}", lambda i=item: eraa.fetch_member(i)
    for item in catalogue.FILES:
        yield f"catalogue {item}", lambda i=item: catalogue.fetch(i)
    for key, d in documents.DOCS.items():
        if d.get("cacheable", True):           # one TGE refuses the fetcher: cited, never cached
            yield f"document {key}", lambda k=key: documents.fetch(k)


def _run(label, job) -> str | None:
    try:
        job()
        return None
    except Exception as e:  # noqa: BLE001 - report and continue
        return f"FAIL {label}: {type(e).__name__}: {str(e)[:160]}"


def prices_to_date() -> int:
    """The current month's day-ahead prices of the six zones so far, to today's UTC midnight
    (`make prices-to-date`, D-257): the deck's year-to-date averages reach the days in. Each run
    caches a file of its own (`.to-<day>`); the whole month, once `make history` fetches it,
    replaces their hours."""
    load_dotenv()
    now = datetime.now(UTC)
    today = datetime(now.year, now.month, now.day)
    if today.day == 1:
        print("prices-to-date: the month began today; nothing to fetch")
        return 0
    failures = [msg for z in ZONES if (msg := _run(
        f"entsoe A44 {z} {today:%Y-%m} to {today:%Y-%m-%d}",
        lambda z=z: entsoe.fetch("A44", today.year, today.month, zone=z, session=session(),
                                 until=today)))]
    for msg in failures:
        print(msg, flush=True)
    return 1 if failures else 0


def main(workers: int = 4) -> int:
    load_dotenv()
    # Fingrid allows one request per 2 s and JAO answers bursts with errors: both run serially;
    # everything else in a pool (ENTSO-E is paced to 150 requests/minute inside entsoe.py).
    serial_src = ("fingrid", "jao")
    all_jobs = list(jobs())
    serial = [(lb, j) for lb, j in all_jobs if lb.startswith(serial_src)]
    pooled = [(lb, j) for lb, j in all_jobs if not lb.startswith(serial_src)]
    failures = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futs = [pool.submit(_run, lb, j) for lb, j in pooled]
        for lb, j in serial:
            if (msg := _run(lb, j)):
                failures.append(msg)
                print(msg, flush=True)
        for f in as_completed(futs):
            if (msg := f.result()):
                failures.append(msg)
                print(msg, flush=True)
    print(f"done: {len(all_jobs) - len(failures)} datasets present, {len(failures)} failed",
          flush=True)
    for msg in sorted(failures):
        print(msg, flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    import sys
    raise SystemExit(prices_to_date() if sys.argv[1:] == ["prices-to-date"] else main())
