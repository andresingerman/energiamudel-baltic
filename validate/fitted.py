"""The fitted-parameter register (SPECIFICATION.md R-VAL-2, R-PROV-4): `data/derived/
fitted_parameters.json` holds every fitted parameter with its fit record — the data it was fitted
on, the years, the method, the values and the residual — and the lineage id of the derived record
that names its inputs. The export copies it into `presets.json` (`fitted`), from where the
engine takes it; nothing else in the supply side is fitted (R-SUP-6).
"""

from __future__ import annotations

import json
from pathlib import Path

from pipeline import DATA_DIR

PATH = DATA_DIR / "derived" / "fitted_parameters.json"
FIT_YEARS = (2023, 2024)      # R-VAL-1: fitted on these, frozen, tested blind on 2025


def read(path: Path = PATH) -> dict:
    return json.loads(path.read_text()) if path.exists() else {"contract": 1}


def write(section: str, value: dict | None, path: Path = PATH) -> None:
    """Replaces one section (a fitted parameter family), keeps the others; None removes it."""
    reg = read(path)
    if value is None:
        reg.pop(section, None)
    else:
        reg[section] = value
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(reg, indent=1, sort_keys=True, ensure_ascii=False) + "\n")
