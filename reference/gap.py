"""The engine of record against the offline reference on the test weeks (R-ENG-8, revision 1.4;
docs/methodology.md §6).

`python -m reference.gap <weeks dir>` reads the weeks app/scripts/gap_weeks.ts wrote (each week's
problem and the engine of record's answer), solves each with reference.lp, prints the table, writes
data/derived/gap/gap.json and exits 1 when the gate is not met. Gate (R-ENG-8, OPEN-7 as decided in
revision 1.4): on every test week the engine of record's average absolute price difference to the
reference ≤ 0.1 €/MWh in every zone and its storage discharge within ±1 %. Where the prices differ
beyond it, the week meets the gate on the same optimum — every window's objective within 1e-6 of
the reference's, the storage within ±1 % — its hours' prices not unique (revision 2.36, D-175);
those hours are listed, and their days solved again by the primal simplex from the same state show
how many of them the reference then prices as the engine. The two-pass engine's gap was published
beside it until the engine was removed (D-132).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import highspy
import numpy as np

from . import lp

PRICE_GATE = 0.1      # €/MWh, R-ENG-8 (revision 1.4)
STORAGE_GATE = 0.01   # share of the reference's discharge, R-ENG-8 (revision 1.4)
STORAGE_FLOOR = 1.0   # MWh: below this both sides count as no storage use
OBJECTIVE_GATE = 1e-6  # each window's objective, relative to the reference's (D-175)
APART = 0.01          # €/MWh: an hour whose prices differ by more in any zone is listed
PRIMAL = {**lp.OPTIONS, "solver": "simplex", "simplex_strategy": 4}  # HiGHS's primal simplex
COMMIT = 24           # hours a window keeps: the day an hour's window starts (lp.solve)
ZONES = ("EE", "LV", "LT")
OUT = Path(__file__).resolve().parents[1] / "data" / "derived" / "gap" / "gap.json"


def metrics(engine: dict, ref: dict) -> dict:
    """One week's comparison: price difference per zone and the hours whose prices differ, each
    window's objective (the largest relative difference), storage and hydro energy, rents."""
    d = np.abs(np.array(engine["price"]) - np.array(ref["price"]))
    apart = np.flatnonzero(d.max(axis=0) > APART)
    rest = np.delete(d, apart, axis=1)
    eo, ro = engine.get("objective"), ref.get("objective")
    e, r = sum(engine["storage"].values()), sum(ref["storage"].values())
    return {
        "price_mae": {z: round(float(d[i].mean()), 3) for i, z in enumerate(ZONES)},
        "hours_apart": [int(h) for h in apart],
        "price_mae_rest": ({z: round(float(rest[i].mean()), 3) for i, z in enumerate(ZONES)}
                           if rest.shape[1] else None),
        "objective_rel": (max(abs(a - b) / max(1.0, abs(b)) for a, b in zip(eo, ro, strict=True))
                          if eo and ro and len(eo) == len(ro) else None),
        "storage": {"engine_mwh": round(e, 1), "lp_mwh": round(r, 1),
                    "share": round((e - r) / r, 4) if r > STORAGE_FLOOR else None,
                    "units": {k: {"engine_mwh": round(v, 1), "lp_mwh": round(ref["storage"][k], 1)}
                              for k, v in engine["storage"].items()}},
        "hydro_mwh": ({"engine": round(engine["reservoir"], 1), "lp": round(ref["reservoir"], 1)}
                      if engine["reservoir"] is not None else None),
        "rent_eur": {k: {"engine": round(v), "lp": round(ref["rent"][k])}
                     for k, v in engine["rent"].items()},
    }


def same_optimum(m: dict) -> bool:
    """Every window's objective as the reference's: prices that differ are other optima."""
    return m["objective_rel"] is not None and m["objective_rel"] <= OBJECTIVE_GATE


def failures(m: dict) -> list[str]:
    out = [] if same_optimum(m) else [f"{z} price {v:.3f} > {PRICE_GATE}"
                                      for z, v in m["price_mae"].items() if v > PRICE_GATE]
    e, r = m["storage"]["engine_mwh"], m["storage"]["lp_mwh"]
    if abs(e - r) > STORAGE_GATE * r + STORAGE_FLOOR:
        out.append(f"storage {e:.0f} MWh vs {r:.0f} ({(e - r) / max(r, STORAGE_FLOOR):+.1%})")
    return out


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("usage: python -m reference.gap <weeks dir>", file=sys.stderr)
        return 2
    d = Path(argv[0])
    weeks = []
    for name in json.loads((d / "index.json").read_text()):
        case = json.loads((d / f"{name}.json").read_text())
        if case.get("lp") is None:
            print(f"{name}: no answer of the engine of record", file=sys.stderr)
            return 2
        ref = lp.solve(case["problem"])
        record = metrics(case["lp"], ref)
        fail = failures(record)
        week = {"case": name, "record": record, "pass": not fail, "failures": fail}
        note = ""
        if not fail and any(v > PRICE_GATE for v in record["price_mae"].values()):
            # met on the same optimum (D-175): the days of the hours apart solved again by the
            # primal simplex, the days before them as before, so that each starts from the same
            # state
            hours = record["hours_apart"]

            def by_day(h0: int, days: frozenset[int] = frozenset(h // COMMIT * COMMIT
                                                                 for h in hours)) -> dict:
                return PRIMAL if h0 in days else lp.OPTIONS

            alt = lp.solve(case["problem"], options=by_day)
            diff = np.abs(np.array(case["lp"]["price"])[:, hours]
                          - np.array(alt["price"])[:, hours])
            week["same_optimum"] = {"hours": len(hours),
                                    "primal_as_engine": int((diff.max(axis=0) <= APART).sum())}
            note = (f"   the same optimum (objective within {record['objective_rel']:.1e}): "
                    f"{len(hours)} hours' prices not unique, the primal simplex prices "
                    f"{week['same_optimum']['primal_as_engine']} of them as the engine")
        weeks.append(week)
        s = record["storage"]
        print(f"{name:11s} record |Δp| " + " ".join(f"{record['price_mae'][z]:.3f}" for z in ZONES)
              + f", storage {s['engine_mwh']:7.0f}/{s['lp_mwh']:7.0f} MWh"
              + ("" if not fail else "   FAIL: " + "; ".join(fail)) + note)
    passed = all(w["pass"] for w in weeks)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "gate": {"price_mae_eur_mwh": PRICE_GATE, "storage_share": STORAGE_GATE,
                 "objective_rel": OBJECTIVE_GATE, "applies_to": "record"},
        "passed": passed, "highs": highspy.Highs().version(), "options": lp.OPTIONS,
        "weeks": weeks}, indent=1, ensure_ascii=False) + "\n")
    print(f"R-ENG-8 gate {'met' if passed else 'NOT met'}: "
          f"{sum(w['pass'] for w in weeks)} of {len(weeks)} weeks within it")
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
