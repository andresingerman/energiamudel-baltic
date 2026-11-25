"""M3's fits in order (SPECIFICATION.md R-VAL-1/2, R-SUP-5/6, R-STO-9, R-PROV-4; docs/PLAN.md §3.7):

  1. the heat-driven floor (`app/scripts/fit_floor.ts`: A75 output and ERA5 temperature in the
     hours priced below the technology's cheapest bid, D-042; `validate/chp_fit.py` is M3's
     lower-envelope fit, kept for comparison and no longer in the register),
  2. the gas plants' one bid (`app/scripts/fit_gas_bid.ts`, the engine of record on the 2023 and
     2024 replays with the floor of step 1): the adder over a combined-cycle plant's cost (D-164),
     which replaced the utilisation markup of Latvia and Lithuania,
  3. the batteries' cycling cost Δ (`app/scripts/fit_delta.ts`, 2026) at the three mFRR shares
     of OPEN-3; the owner chose 0 (DECISIONS D-025), and the fit at that share is adopted — the
     others stay in the register as evidence.

Each step writes its section of data/derived/fitted_parameters.json and a derived lineage record
naming its inputs; the export is rebuilt whenever the register differs from presets.json, so the
next step and the site see it. Run: make fit (needs Node and the database).
"""

from __future__ import annotations

import json
import subprocess
import sys

from export.tables import fitted_section
from pipeline import DATA_DIR, ROOT, lineage

from . import fitted

APP = ROOT / "app"
MANIFEST = DATA_DIR / "export" / "manifest.json"
PRESETS = DATA_DIR / "export" / "presets.json"
DELTA_SHARES = (0.5, 0.25, 0.0)        # OPEN-3's options: the specification's default first
ADOPTED_SHARE = 0.0                     # OPEN-3 as the owner decided it (D-025)


def node(script: str, *args: str) -> dict:
    out = subprocess.run(["node", "--no-maglev", f"scripts/{script}", *args], cwd=APP, check=True,
                         capture_output=True, text=True).stdout
    return json.loads(out.strip().splitlines()[-1])


def refresh_export() -> None:
    """Rebuilds the export when presets.json does not carry the register as it stands."""
    if json.loads(PRESETS.read_text()).get("fitted") != fitted_section():
        subprocess.run([sys.executable, "-m", "export"], cwd=ROOT, check=True)


def record(dataset: str, files: list[str], series: list[str], notes: str,
           extra: tuple[str, ...] | list[str] = ()) -> None:
    """A derived record: its inputs are the named series of the named export files (lineage ids
    from the manifest) and `extra`; the notes pin the files by their SHA-256."""
    m = json.loads(MANIFEST.read_text())["files"]
    ids = sorted({i for f in files for s in series for i in m[f]["series"].get(s, [])} | set(extra))
    pins = "; ".join(f"{f} sha256 {m[f]['sha256'][:16]}" for f in files)
    rec = lineage.derived(dataset, ids, notes=f"{notes}; engine inputs {pins}")
    if not rec.path().exists() or (
            (old := lineage.LineageRecord.read(rec.path())).notes != rec.notes
            or old.derived_from != rec.derived_from):
        rec.write()                            # a rerun with the same result keeps its record


FLOOR_METHOD = ("average hourly A75 generation, per 1 °C bin (bins of ≥ 50 h), of the fit years' "
                "hours whose observed zone price was below the technology's cheapest bid in the "
                "engine (before the floor and the markup); least-squares line on the bins' average "
                "heating degree-hours weighted by their hours, a, b ≥ 0; T_ref of {8, 10, 12, 15} "
                "°C with the least squared error")


def floor() -> None:
    """R-SUP-5 as the record reveals it (D-042): `app/scripts/fit_floor.ts` on the export."""
    res = node("fit_floor.ts")
    years = res["years"]
    out: dict = {}
    for zone, techs in res["fits"].items():
        for tech, f in techs.items():
            ds = f"pipeline.chp_floor.{zone}.{tech}.{years[0]}-{years[-1]}"
            record(ds, [f"years/{y}.json.gz" for y in years]
                   + [f"validation/{y}.json.gz" for y in years],
                   [f"zones.{zone}.temperature_c", f"validation.gen.{zone}.{tech}",
                    f"validation.price.{zone}"], f"{FLOOR_METHOD}; result {f}")
            out.setdefault(zone, {})[tech] = {**f, "years": years, "method": FLOOR_METHOD,
                                              "lineage_id": ds}
            print(f"{zone} {tech:9s} T_ref {f['t_ref_c']:4.0f} °C  a {f['a_mw']:7.1f} MW  "
                  f"b {f['b_mw_per_k']:6.2f} MW/K  below-cost hours {f['hours']}")
    fitted.write("chp_floor", out)


def gas_bid() -> None:
    """R-SUP-6 since D-164: one bid for the three zones' gas, a combined-cycle plant's cost plus an
    adder, fitted with Kruonis's step (D-115); the utilisation markup it replaced leaves the
    register."""
    res = node("fit_gas_bid.ts")
    years = res["years"]
    ds = f"pipeline.gas_bid.{years[0]}-{years[-1]}"
    floors = [t["lineage_id"] for z in fitted.read()["chp_floor"].values() for t in z.values()]
    folds = "; ".join(f"{f['year']} alone {f['eur_mwh']} ({f['mae_sum_fitted']} on it, "
                      f"{f['mae_sum_left_out']} on the other)" for f in res["folds"])
    grid = "; ".join(f"step {g['step']}: {g['eur_mwh']}, {g['mae_sum']}"
                     for g in res["kruonis_step_grid"])
    method = ("one bid for every gas offer of Estonia, Latvia and Lithuania, a combined-cycle "
              f"plant's cost ({res['reference']}) plus one adder: the average of the adders each "
              "fit year gives alone on a grid of 10 EUR/MWh from 0 to 150 and of 2.5 EUR/MWh "
              f"around its best, objective {res['objective']} of that year; engine of record; at "
              f"Kruonis's step {res['kruonis_step_eur_mwh']} EUR/MWh, the step of the grid whose "
              f"register fits the two years best (D-115, D-164; the grid: {grid}); {folds}; "
              f"left-out sum {res['mae_sum_left_out']}")
    record(ds, [f"years/{y}.json.gz" for y in years] + [f"validation/{y}.json.gz" for y in years],
           [f"validation.price.{z}" for z in ("EE", "LV", "LT")],
           f"{method}; result {{'eur_mwh': {res['eur_mwh']}}}; MAE sum {res['mae_sum_before']} -> "
           f"{res['mae_sum_after']}", extra=floors)
    fitted.write("gas_bid", {"eur_mwh": res["eur_mwh"], "reference": res["reference"],
                             "zones": ["EE", "LV", "LT"], "years": years, "method": method,
                             "lineage_id": ds, "folds": res["folds"],
                             "mae_sum_before": res["mae_sum_before"],
                             "mae_sum_after": res["mae_sum_after"],
                             "mae_sum_left_out": res["mae_sum_left_out"]})
    fitted.write("markup", None)
    fitted.write("kruonis_output", {"step_eur_mwh": res["kruonis_step_eur_mwh"],
                                    "segments": res["kruonis_segments"],
                                    "grid": res["kruonis_step_grid"], "years": years,
                                    "method": method, "lineage_id": ds})
    print(f"gas bid {res['reference']} + {res['eur_mwh']}, Kruonis's step "
          f"{res['kruonis_step_eur_mwh']} "
          f"(MAE sum {res['mae_sum_before']} -> {res['mae_sum_after']})")


def delta() -> None:
    fits = [node("fit_delta.ts", str(s)) for s in DELTA_SHARES]
    use = next(f for f in fits if f["mfrr_share"] == ADOPTED_SHARE)
    ds = f"pipeline.battery_delta.EE.{fits[0]['year']}"
    method = ("bisection on the cycling cost until the engine of record's Estonian batteries "
              "discharge what A75 reports from the week of its first report; per mFRR share")
    record(ds, [f"years/{fits[0]['year']}.json.gz", f"validation/{fits[0]['year']}.json.gz"],
           ["validation.gen.EE.battery", "zones.EE.capacity.battery"],
           f"{method}; results {fits}")
    fitted.write("battery_delta", {"EE": {
        "adopted": True, "mfrr_share": ADOPTED_SHARE, "eur_mwh": use["eur_mwh"],
        "why": "OPEN-3 decided by the owner (D-025): the batteries hold no mFRR, and their "
        "cycling cost is the fit at that share; it applies to every zone's batteries",
        "fits": fits, "method": method, "lineage_id": ds}})
    for f in fits:
        print(f"delta at mFRR share {f['mfrr_share']}: {f['eur_mwh']} EUR/MWh, "
              f"residual {f['residual_share']:+.1%}")


def main() -> int:
    floor()
    refresh_export()
    gas_bid()
    refresh_export()
    delta()
    refresh_export()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
