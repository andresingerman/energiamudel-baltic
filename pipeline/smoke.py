"""Prove every configured source with one small real fetch (SPECIFICATION.md R-DATA-6).

Run:  make smoke        (reads .env)

Each check fetches the smallest meaningful request into a temporary raw cache and lineage
directory, so it proves the network path, the credential and the parser today, and never
touches data/raw. Outcomes:

    OK     fetched, parsed, lineage written
    SKIP   the credential is not set
    FAIL   the request or the parse failed; the message says why
"""

from __future__ import annotations

import os
import sys
import tempfile
import traceback

from dotenv import load_dotenv

from .sources import (
    MissingCredential,
    btd,
    documents,
    ecb,
    eex,
    energimyndigheten,
    entsoe,
    fingrid,
    irena,
    jao,
    openmeteo,
    tyndp2026,
    umm,
    worldbank,
)


def _entsoe(doc: str, **kw) -> str:
    df = entsoe.parse(entsoe.fetch(doc, 2025, 1, **kw))
    if df.empty:
        raise RuntimeError("no points")
    return f"{len(df)} points, first {df['ts'].min()}"


def _rows(mod, *args, parse=None, **kw) -> str:
    df = (parse or mod.parse)(mod.fetch(*args, **kw))
    if len(df) == 0:
        raise RuntimeError("no rows")
    first = df["ts"].min() if "ts" in df else ""
    return f"{len(df)} rows {first}".strip()


def _tyndp2026() -> str:
    import zipfile
    p = tyndp2026.fetch("input/model-input/national-trends/Nodes.zip")
    return f"{len(zipfile.ZipFile(p).namelist())} members in {p.name}"


def _document() -> str:
    p = documents.fetch("tyndp2024_ig")
    return f"{p.stat().st_size} bytes, PDF"


CHECKS = {
    "entsoe A44": lambda: _entsoe("A44", zone="EE"),
    "entsoe A25": lambda: _entsoe("A25", zone="EE"),
    "entsoe A69": lambda: _entsoe("A69", zone="LT"),
    "entsoe A65DA": lambda: _entsoe("A65DA", zone="EE"),
    "entsoe A09": lambda: _entsoe("A09", border="EE-FI", reverse=True),
    "entsoe A31": lambda: _entsoe("A31", border="LT-SE4"),
    "entsoe A95": lambda: _rows(entsoe, "A95", 2026, 1, zone="EE", whole_year=True,
                                parse=entsoe.parse_generating_units),
    "fingrid": lambda: _rows(fingrid, "da_cap_fi_ee_mw", 2025, 1),
    "btd": lambda: _rows(btd, "procured_reserves", 2026, 6, parse=btd.parse_reserves),
    "jao": lambda: _rows(jao, "maxNetPos", 2024, 10),
    "umm": lambda: _rows(umm, "EE", "smoke"),
    "openmeteo": lambda: _rows(openmeteo, "EE", 2025),
    "eex": lambda: _rows(eex, 2025),
    "worldbank": lambda: _rows(worldbank),
    "ecb": lambda: _rows(ecb),
    "irena": lambda: _rows(irena),
    "energimyndigheten": lambda: _rows(energimyndigheten),
    "tyndp2026": _tyndp2026,
    "document": _document,
}


def main() -> int:
    load_dotenv()
    width = max(len(k) for k in CHECKS)
    failures = 0
    with tempfile.TemporaryDirectory() as tmp:
        os.environ["ENERGIAMUDEL_RAW"] = os.path.join(tmp, "raw")
        os.environ["ENERGIAMUDEL_LINEAGE"] = os.path.join(tmp, "lineage")
        for name, check in CHECKS.items():
            try:
                detail, status = check(), "OK  "
            except MissingCredential as e:
                status, detail = "SKIP", f"credential: {e}"
            except Exception as e:  # noqa: BLE001 - every source is reported
                status, detail = "FAIL", f"{type(e).__name__}: {str(e)[:200]}"
                failures += 1
                if "-v" in sys.argv:
                    traceback.print_exc()
            print(f"{status}  {name:<{width}}  {detail}", flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
