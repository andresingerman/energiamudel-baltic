"""The export's gate (SPECIFICATION.md §14 M1, R-DATA-5, R-DATA-8, R-NFR-4, R-BND-3; PLAN §4 M1):
called by `make check`.

  lengths    every hourly array equals meta.hours, weekly arrays 53 or fewer, monthly 12 or fewer
  no price   no year file carries a price of EE, LV or LT (R-BND-3)
  size       every year file is at most 3 MB compressed (R-NFR-4)
  lineage    every array in a year file is covered by a manifest series with lineage ids
  rebuild    a fresh export from the same database is byte-identical (R-DATA-5)
"""

from __future__ import annotations

import tempfile
from pathlib import Path

from pipeline import DATA_DIR

from . import write

OUT = DATA_DIR / "export"
MAX_BYTES = 3 * 1024 * 1024
CORE = ("EE", "LV", "LT")


def _arrays(obj, path=""):
    """(path, list) for every list of numbers in an object."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from _arrays(v, f"{path}.{k}" if path else k)
    elif isinstance(obj, list) and obj and all(isinstance(x, (int, float)) for x in obj):
        yield path, obj


def year_problems(obj: dict) -> list[str]:
    bad = []
    hours = obj["meta"]["hours"]
    for path, a in _arrays({k: obj[k] for k in ("zones", "boundary", "borders")}):
        if ".hydro_weekly_" in f".{path}." or ".thermal_weekly_" in f".{path}.":
            if len(a) > 53:
                bad.append(f"{path}: {len(a)} weeks")
        elif len(a) != hours:
            bad.append(f"{path}: {len(a)} hours, meta says {hours}")
    for path, a in _arrays(obj.get("fuel", {})):
        if len(a) > 12:
            bad.append(f"fuel.{path}: {len(a)} months")
    if any(z in obj["boundary"] for z in CORE):
        bad.append("a core zone in boundary")
    for z in CORE:
        if "price" in obj["zones"][z]:
            bad.append(f"zones.{z}.price present (R-BND-3)")
    return bad


def covered(path: str, series: dict) -> bool:
    """A year-file array is covered when a manifest series names it or a prefix of it."""
    parts = path.split(".")
    return any(".".join(parts[:i]) in series for i in range(len(parts), 0, -1))


def check(out: Path = OUT, rebuild: bool = True) -> tuple[bool, str]:
    from .__main__ import code_hash  # here, not at the top: __main__ imports this module

    manifest = write.read(out / "manifest.json")
    problems = []
    # the manifest names the code that wrote it (R-DATA-8); a schema or export module changed since
    # the last `make export` leaves the files intact and only this field stale (ERRATA E-050)
    if manifest["code"] != code_hash():
        problems.append("manifest.json: code hash is not the export code's; run make export")
    years_ = {k: v for k, v in manifest["files"].items() if k.startswith("years/")}
    for rel, entry in sorted(years_.items()):
        obj = write.read(out / rel)
        problems += [f"{rel}: {p}" for p in year_problems(obj)]
        if entry["bytes"] > MAX_BYTES:
            problems.append(f"{rel}: {entry['bytes']:,} bytes > 3 MB")
        for path, _ in _arrays({k: obj[k] for k in ("zones", "boundary", "borders", "fuel")
                                if k in obj}):
            if not covered(path, entry["series"]):
                problems.append(f"{rel}: {path} has no lineage")
    if problems:
        return False, "; ".join(problems[:6]) + (f" (+{len(problems) - 6})"
                                                 if len(problems) > 6 else "")
    largest = max(e["bytes"] for e in years_.values())
    msg = (f"{len(manifest['files'])} files, {len(years_)} year files, largest "
           f"{largest / 1e6:.2f} MB, every array with lineage, no core price")
    if rebuild:
        from .__main__ import build
        with tempfile.TemporaryDirectory() as tmp:
            fresh = build(Path(tmp), last_year=max(int(k[6:10]) for k in years_
                                                   if k[6:10].isdigit()))
        diff = sorted(k for k in set(fresh["files"]) | set(manifest["files"])
                      if fresh["files"].get(k, {}).get("sha256")
                      != manifest["files"].get(k, {}).get("sha256"))
        if diff:
            return False, f"rebuild differs in {diff[:5]}"
        msg += "; rebuild byte-identical"
    return True, msg
