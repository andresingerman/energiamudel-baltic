"""Kruonis's hourly generation and pumping from the cached A75 files (the database keeps the
generation only, db/build.py load_entsoe_a75) -> spikes/validation-round2/kruonis_record.json:
per year the hourly MW of both, hour 0 = 1 January 00:00 UTC.

Run:  .venv/bin/python spikes/validation-round2/kruonis_record.py
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from pipeline.sources import entsoe, raw_dir

OUT = Path(__file__).with_name("kruonis_record.json")


def main() -> None:
    out = {}
    for year in (2023, 2024, 2025, 2026):
        parts = []
        for m in range(1, 13):
            path = raw_dir(entsoe.RAW) / f"entsoe.A75.LT.{year}-{m:02d}.xml"
            if not path.exists():                  # a year still running
                continue
            raw = entsoe.parse(path)
            raw = raw[raw["tech"] == "hydro_ps"]
            for name, sel in (("gen", raw["in_domain"].notna()), ("pump", raw["in_domain"].isna())):
                h = entsoe.to_hourly(raw[sel], by=("tech",))
                parts.append(h.assign(kind=name))
        d = pd.concat(parts)
        d = d[(d.ts >= f"{year}-01-01") & (d.ts < f"{year + 1}-01-01")]
        idx = pd.date_range(f"{year}-01-01", f"{year + 1}-01-01", freq="h", inclusive="left")
        rec = {}
        for kind in ("gen", "pump"):
            s = d[d.kind == kind].groupby("ts")["value"].sum().reindex(idx).fillna(0.0)
            rec[kind] = [round(float(x), 1) for x in s]
            print(year, kind, f"{s.sum() / 1e6:.3f} TWh, max {s.max():.0f} MW, hours > 0: {(s > 0).sum()}")
        out[str(year)] = rec
    OUT.write_text(json.dumps(out))


if __name__ == "__main__":
    main()
