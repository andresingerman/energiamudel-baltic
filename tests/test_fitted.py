"""M3's fits: the CHP floor recovers a known floor, the register round-trips into presets
(R-SUP-5, R-VAL-2, R-PROV-4)."""

import numpy as np
import pandas as pd

from export import tables
from validate import chp_fit, fitted


def test_chp_fit_recovers_a_known_floor():
    rng = np.random.default_rng(0)
    t = rng.uniform(-20, 25, 20_000)
    mw = 30 + 12 * np.clip(10 - t, 0, None) + rng.uniform(0, 50, t.size)  # 10th pct: floor + 5
    r = chp_fit.fit_at(pd.DataFrame({"mw": mw, "temperature_c": t}), 10.0)
    assert abs(r["a_mw"] - 35) < 2 and abs(r["b_mw_per_k"] - 12) < 0.3
    assert abs(r["share_above_floor"] - 0.9) < 0.02


def test_register_round_trips_and_names_its_lineage(tmp_path, monkeypatch):
    path = tmp_path / "fitted.json"
    fitted.write("markup", {"EE": {"eur_mwh": [0, 5, 10, 20], "lineage_id": "pipeline.m"}}, path)
    fitted.write("gas_bid", {"eur_mwh": 50, "lineage_id": "pipeline.g"}, path)
    fitted.write("chp_floor", {"LV": {"gas": {"a_mw": 1.0, "lineage_id": "pipeline.c"}}}, path)
    fitted.write("markup", None, path)  # a section replaced by another goes (D-164)
    reg = fitted.read(path)
    assert "markup" not in reg and reg["gas_bid"]["eur_mwh"] == 50 and reg["contract"] == 1
    monkeypatch.setattr(fitted, "read", lambda: reg)
    out = tables.fitted_section()
    assert "contract" not in out
    assert out["gas_bid"]["src"] == ["pipeline.g"]
    assert out["chp_floor"]["LV"]["gas"]["src"] == ["pipeline.c"]


def test_check_fit_finds_a_record_that_states_another_register():
    """D-147: a refit put back by hand left its lineage records; the check names them."""
    from types import SimpleNamespace as R

    from db.check import check_fit
    fit = {"mfrr_share": 0, "eur_mwh": 71.5, "model_mwh": 31161}
    reg = {"gas_bid": {"eur_mwh": 51.25, "lineage_id": "m"},
           "battery_delta": {"EE": {"lineage_id": "b", "fits": [fit]}},
           "kruonis_output": {"step_eur_mwh": 60, "lineage_id": "m"}}
    good = {"m": R(notes="at Kruonis's step 60 EUR/MWh; result {'eur_mwh': 51.25}; MAE"),
            "b": R(notes=f"per mFRR share; results [{fit}]; engine")}
    assert check_fit(reg, good)[0]
    refit = dict(good, m=R(notes="at Kruonis's step 45 EUR/MWh; result {'eur_mwh': 47.5}; MAE"))
    ok, msg = check_fit(reg, refit)
    assert not ok and "gas bid" in msg and "Kruonis" in msg
    stale = dict(good, b=R(notes=f"results [{dict(fit, model_mwh=31072)}]"))
    assert not check_fit(reg, stale)[0]
    # ERRATA E-164: a register without the gas bid every run needs fails the check
    no_bid = {k: v for k, v in reg.items() if k != "gas_bid"}
    ok, msg = check_fit(no_bid, good)
    assert not ok and "gas bid" in msg
