"""Verification records of the documentary CSVs (SPECIFICATION.md R-DATA-7; DECISIONS.md D-006).

Run:  .venv/bin/python -m validate.documentary

Two kinds of record live in data/documentary/verification.csv, one per documentary row:
  code    rows extracted from a fetched archive (lineage_id set) are re-extracted by
          validate/documentary_eraa.py and validate/documentary_tyndp.py on every run; their
          records are rewritten here
  page    rows a person read off a document page (lineage_id empty) were re-read on the cached
          document; those records are kept as they are and only a changed row loses its record
The run exits 1 if any code record is not ok.
"""

from __future__ import annotations

import io
import sys
from datetime import date

import pandas as pd

from pipeline import DATA_DIR

DOC = DATA_DIR / "documentary"
OUT = DOC / "verification.csv"
# documentary file -> (columns that identify a row, column holding its value)
KEYS = {"scenarios.csv": (["scenario", "zone", "year", "key"], "value"),
        "links.csv": (["scenario", "border", "direction", "year", "kind"], "mw"),
        "fuel_paths.csv": (["scenario", "year", "commodity"], "price"),
        "tech_parameters.csv": (["source", "tech_class", "parameter"], "value"),
        "parameters.csv": (["key"], "value")}
FILES = tuple(KEYS)
# rows whose value is the sum of named generating units in ENTSO-E's A95 master data
A95_UNITS = {"oil_shale_classes|oil_shale_cfb|mw": ("Balti Elektrijaam -TG11",
                                                     "Eesti Elektrijaam- TG8")}
COLS = ["file", "row_key", "value_csv", "value_document", "unit", "page_cited", "page_found",
        "verdict", "evidence", "method", "verified_on"]


def read(name: str) -> pd.DataFrame:
    """A documentary file as strings, with its row keys and values (bytes: mixed line ends)."""
    d = pd.read_csv(io.BytesIO((DOC / name).read_bytes()), dtype=str, keep_default_na=False)
    cols, val = KEYS[name]
    return d.assign(row_key=d[cols].agg("|".join, axis=1), row_value=d[val])


def documentary_rows() -> pd.DataFrame:
    parts = [read(n).assign(file=n) for n in FILES if (DOC / n).exists()]
    return pd.concat(parts, ignore_index=True).fillna("")


def entsoe_results(rows: pd.DataFrame) -> pd.DataFrame:
    """Rows whose value is ENTSO-E data (lineage_id entsoe.*), re-read from the raw file: A68 by
    the technology the row names, A95 as the sum of the units in A95_UNITS."""
    from pipeline.sources import entsoe, raw_dir
    out = []
    for r in rows.itertuples():
        path = raw_dir(entsoe.RAW) / f"{r.lineage_id}.xml"
        doc = r.lineage_id.split(".")[1]
        if doc == "A68":
            tech = r.row_key.rsplit(".", 1)[-1]                 # ...|capacity.<tech>
            d = entsoe.parse(path)
            got, where = d.loc[d.tech == tech, "value"].iloc[0], f"{path.name}, {tech}"
        else:
            names = A95_UNITS[r.row_key]
            d = entsoe.parse_generating_units(path)
            got = d.loc[d.name.isin(names), "mw"].sum()
            where = f"{path.name}, nominalP of {' + '.join(names)}"
        ok = abs(float(r.row_value) - got) < 0.05
        out.append({"file": r.file, "row_key": r.row_key, "value_csv": r.row_value,
                    "value_document": f"{got:g}", "unit": r.unit, "page_cited": r.lineage_id,
                    "page_found": where, "verdict": "ok" if ok else "differs",
                    "evidence": "re-read from the cached ENTSO-E file"})
    return pd.DataFrame(out)


def main() -> int:
    from . import documentary_eraa, documentary_tyndp
    rows = documentary_rows()
    today = date.today().isoformat()
    era = rows[rows.lineage_id.str.startswith("eraa2025.")]
    oth = rows[rows.lineage_id.str.split(".").str[0].isin(["tyndp2024", "catalogue"])]
    ent = rows[rows.lineage_id.str.startswith("entsoe.")]
    code = pd.concat([
        documentary_eraa.results(era).assign(method="code: validate/documentary_eraa.py"),
        pd.DataFrame(documentary_tyndp.results(oth.to_dict("records"))).assign(
            method="code: validate/documentary_tyndp.py"),
        entsoe_results(ent).assign(method="code: validate/documentary.py (ENTSO-E)")
    ]).assign(verified_on=today)
    keep = pd.read_csv(OUT, dtype=str, keep_default_na=False) if OUT.exists() else \
        pd.DataFrame(columns=COLS)
    keep = keep[~keep.method.str.startswith("code:")]
    # a row now re-read by code drops any record a person made of it earlier
    keep = keep[~(keep.file + "|" + keep.row_key).isin(code.file + "|" + code.row_key)]
    out = pd.concat([keep, code], ignore_index=True)[COLS]
    out = out.sort_values(["file", "row_key"], kind="stable")
    out.to_csv(OUT, index=False, lineterminator="\n")
    bad = code[code.verdict != "ok"]
    print(f"{len(code)} rows re-extracted by code: {len(code) - len(bad)} ok, {len(bad)} not ok;"
          f" {len(keep)} page records kept -> {OUT.relative_to(DATA_DIR.parent)}")
    for b in bad.itertuples():
        print(f"  {b.verdict}: {b.file} {b.row_key}: csv {b.value_csv}, "
              f"document {b.value_document or '-'} | {b.evidence}")
    return 1 if len(bad) else 0


if __name__ == "__main__":
    sys.exit(main())
