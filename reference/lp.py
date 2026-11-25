"""One week of the engine's problem as linear programmes, solved with HiGHS (R-ENG-8, R-ENG-9;
docs/methodology.md §6): each day of the week in a window of the hours that follow it, the day
kept, the stores' energy and the week's budgets carried to the next day (D-112; a window and a
day of 168 hours are the whole week at once, D-021).

The input is the problem the engine cleared, written by app/scripts/gap_weeks.ts, so both sides
see the same offers, fixed output, links, storage, reservoir, DSR limits and reserve headroom.
Variables: every offer's quantity in every hour, load shed (at VOLL) and fixed output spilled
(at the floor), the two internal flows, each storage unit's charge, discharge and energy, and the
Daugava's release. Rows: the zone-hour balance (its dual is the price), the storage energy balance
(the week starts and ends empty), the storage discharge budget per period, the Daugava's weekly
budget, the DSR hours per day. A window starts from the energy the stores hold and ends with them
empty; a budget whose period runs past the window, and the Daugava's, gives the window its share
of what the week has left, by hours. Minimised: bids of supply, minus bids of demand, delta per MWh
charged, VOLL per MWh shed, minus the floor per MWh spilled.

The LP is degenerate; R-ENG-9's perturbation, as v4's R-REF-5: every supply offer and every
storage unit's charge costs crc32(zone:name) mod 1000 × 1e-6 €/MWh more, and a storage unit's
discharge 1e-4 €/MWh more at a window's end than at its start; demand offers are left alone so
that nothing can arbitrage the perturbation. Prices, not volumes, are the primary comparison; each
window's objective tells an hour whose price is not unique from a different optimum (D-175).
"""

from __future__ import annotations

import zlib
from collections.abc import Callable

import highspy
import numpy as np

PERTURB_STEP, PERTURB_BUCKETS, PERTURB_HOUR = 1e-6, 1000, 1e-4
# HiGHS's own defaults written out, so that another build with other defaults cannot change a
# result unnoticed — but presolve, off as the engine has it since D-130 (D-131); one thread, so
# that the solve is reproducible.
OPTIONS: dict[str, bool | int | float | str] = {
    "solver": "choose", "presolve": "off", "run_crossover": "on", "threads": 1, "random_seed": 0,
    "primal_feasibility_tolerance": 1e-7, "dual_feasibility_tolerance": 1e-7, "output_flag": False}


def perturbation(name: str) -> float:
    return zlib.crc32(name.encode()) % PERTURB_BUCKETS * PERTURB_STEP


class _Model:
    """Columns and rows collected as triplets, passed to HiGHS once."""

    def __init__(self) -> None:
        self.cost: list[float] = []
        self.lo: list[float] = []
        self.hi: list[float] = []
        self.rlo: list[float] = []
        self.rhi: list[float] = []
        self.entries: list[tuple[int, int, float]] = []

    def var(self, cost: float, lo: float, hi: float) -> int:
        self.cost.append(cost)
        self.lo.append(lo)
        self.hi.append(hi)
        return len(self.cost) - 1

    def row(self, lo: float, hi: float, terms: list[tuple[int, float]]) -> int:
        r = len(self.rlo)
        self.rlo.append(lo)
        self.rhi.append(hi)
        self.entries.extend((r, c, v) for c, v in terms)
        return r

    def solve(self, options: dict) -> tuple[np.ndarray, np.ndarray, float]:
        lp = highspy.HighsLp()
        n, m = len(self.cost), len(self.rlo)
        lp.num_col_, lp.num_row_ = n, m
        lp.col_cost_ = np.array(self.cost)
        lp.col_lower_ = np.array(self.lo)
        lp.col_upper_ = np.array(self.hi)
        lp.row_lower_ = np.array(self.rlo)
        lp.row_upper_ = np.array(self.rhi)
        order = sorted(range(len(self.entries)),
                       key=lambda k: (self.entries[k][1], self.entries[k][0]))
        cols = np.array([self.entries[k][1] for k in order], dtype=np.int32)
        lp.a_matrix_.format_ = highspy.MatrixFormat.kColwise
        lp.a_matrix_.start_ = np.searchsorted(cols, np.arange(n + 1)).astype(np.int32)
        lp.a_matrix_.index_ = np.array([self.entries[k][0] for k in order], dtype=np.int32)
        lp.a_matrix_.value_ = np.array([self.entries[k][2] for k in order])
        # as the engine: a programme left unsolved without presolve is solved again with it (D-130)
        for opts in (options, {**options, "presolve": "choose"}):
            h = highspy.Highs()
            for k, v in opts.items():
                h.setOptionValue(k, v)
            h.passModel(lp)
            h.run()
            status = h.getModelStatus()
            if status == highspy.HighsModelStatus.kOptimal:
                break
        if status != highspy.HighsModelStatus.kOptimal:
            raise RuntimeError(f"HiGHS: {h.modelStatusToString(status)}")
        sol = h.getSolution()
        x = np.array(sol.col_value)
        return x, np.array(sol.row_dual), float(np.dot(self.cost, x))


def solve(pb: dict, window: int = 48, commit: int = 24,
          options: Callable[[int], dict] | None = None) -> dict:
    """Prices per zone-hour, storage discharge per unit, the Daugava's release, each border's
    congestion rent and each window's objective, from one week's problem as gap_weeks.ts writes it,
    day by day; `options(h0)` gives the HiGHS options of the window from hour h0 (the primal
    simplex on the days whose prices are not unique, D-175)."""
    W, Z = pb["hours"], len(pb["zones"])
    if W > 168:
        raise ValueError("one week at most")
    state = {"e0": [0.0] * len(pb["storage"]), "used": [{} for _ in pb["storage"]],
             "released": 0.0}
    out = {"price": [[0.0] * W for _ in range(Z)],
           "storage": {u["name"]: 0.0 for u in pb["storage"]},
           "reservoir": 0.0 if pb["reservoir"] else None,
           "rent": {k: 0.0 for k in ("EE-LV", "LV-LT")} | {b["code"]: 0.0 for b in pb["borders"]},
           "objective": []}
    for h0 in range(0, W, commit):
        _window(pb, h0, min(W, h0 + window), min(commit, W - h0), state, out,
                options(h0) if options else OPTIONS)
    return out


def _window(pb: dict, h0: int, h1: int, C: int, st: dict, out: dict, options: dict) -> None:
    """Hours h0..h1−1 of the week as one programme from its state; the first C hours into `out`."""
    T, Z, W = h1 - h0, len(pb["zones"]), pb["hours"]
    m = _Model()
    bal: list[list[list[tuple[int, float]]]] = [[[] for _ in range(T)] for _ in range(Z)]
    offer_vars: list[list[list[int | None]]] = []
    for z, zone in enumerate(pb["zones"]):
        per_offer: list[list[int | None]] = []
        for o in zone["offers"]:
            eps = 0.0 if o["demand"] else perturbation(f"{z}:{o['name']}")
            cols: list[int | None] = []
            for t in range(T):
                mw = o["mw"][h0 + t]
                if mw <= 0:
                    cols.append(None)
                    continue
                c = m.var(-o["bid"][h0 + t] if o["demand"] else o["bid"][h0 + t] + eps, 0.0, mw)
                bal[z][t].append((c, -1.0 if o["demand"] else 1.0))
                cols.append(c)
            per_offer.append(cols)
            if o["hoursPerDay"] > 0:
                for d0 in range(0, T, 24):
                    terms = [(col, 1.0 / o["mw"][h0 + t]) for t in range(d0, min(d0 + 24, T))
                             if (col := cols[t]) is not None]
                    if terms:
                        m.row(-np.inf, o["hoursPerDay"], terms)
        offer_vars.append(per_offer)
        for t in range(T):
            bal[z][t].append((m.var(pb["voll"], 0.0, zone["load"][h0 + t]), 1.0))  # shed
            bal[z][t].append((m.var(-pb["floor"], 0.0, np.inf), -1.0))            # spill
    flows = []
    for i, link in enumerate(pb["links"]):
        f = [m.var(0.0, -link["rev"][h0 + t], link["fwd"][h0 + t]) for t in range(T)]
        for t in range(T):
            bal[i][t].append((f[t], -1.0))
            bal[i + 1][t].append((f[t], 1.0))
        flows.append(f)
    ramp = np.linspace(0.0, PERTURB_HOUR, T)
    discharge = {}
    for k, u in enumerate(pb["storage"]):
        z, mw, eff, K = u["zone"], u["mw"], u["eff"], u["hours"]
        eps = perturbation(f"{z}:{u['name']}")
        # a replay's Kruonis is held to the power its record shows that week (D-073)
        cmax, dmax = u.get("chargeMax"), u.get("dischargeMax")
        ch = [m.var(u["delta"] + eps, 0.0, min(mw, cmax[h0 + t]) if cmax else mw) for t in range(T)]
        # the output in equal segments of the hour's power, each at its step (D-115; one without)
        steps = u.get("dischargeSteps") or [0.0]
        n = len(steps)
        d = [[m.var(float(ramp[t]) + steps[j], 0.0,
                    (min(mw * eff, dmax[h0 + t]) if dmax else mw * eff) / n) for j in range(n)]
             for t in range(T)]
        e = [m.var(0.0, 0.0, 0.0 if t == T - 1 else mw * K) for t in range(T)]
        for t in range(T):
            terms = [(e[t], 1.0), (ch[t], -1.0)] + [(x, 1.0 / eff) for x in d[t]]
            if t > 0:
                terms.append((e[t - 1], -1.0))
            e0 = st["e0"][k] if t == 0 else 0.0  # the energy the store holds as the window opens
            m.row(e0, e0, terms)
            bal[z][t] += [(x, 1.0) for x in d[t]] + [(ch[t], -1.0)]
        budget = u["budget"]
        if budget is not None:
            P = u["period"]
            for p0 in range(h0 // P * P, h1, P):
                a, b = max(p0, h0) - h0, min(p0 + P, h1) - h0
                left = budget[p0 // P] * mw - st["used"][k].get(p0 // P, 0.0)
                rest = min(p0 + P, W) - h0 - a
                cap = left * (b - a) / rest if b - a < rest else left
                m.row(-np.inf, max(0.0, cap), [(x, 1.0 / eff) for t in range(a, b) for x in d[t]])
        discharge[u["name"]] = (k, d, e)
    release = None
    if pb["reservoir"]:
        r = pb["reservoir"]
        z = r["zone"]
        left = max(0.0, r["budget"][0] - st["released"])
        budget = left * T / (W - h0) if T < W - h0 else left
        base = min(r["pmin"][0], budget / T)
        release = [m.var(0.0, min(base, r["pmax"][0]), r["pmax"][0]) for t in range(T)]
        m.row(-np.inf, budget, [(c, 1.0) for c in release])
        for t, c in enumerate(release):
            bal[z][t].append((c, 1.0))
    net = [[zone["load"][h0 + t] - zone["fixed"][h0 + t] for t in range(T)] for zone in pb["zones"]]
    rows = [[m.row(net[z][t], net[z][t], bal[z][t]) for t in range(T)] for z in range(Z)]
    x, dual, objective = m.solve(options)
    out["objective"].append(objective)
    price = [[float(dual[rows[z][t]]) for t in range(C)] for z in range(Z)]
    for z in range(Z):
        out["price"][z][h0:h0 + C] = price[z]
    for name, (k, d, e) in discharge.items():
        u = pb["storage"][k]
        for t in range(C):
            v = float(sum(x[c] for c in d[t]))
            out["storage"][name] += v
            per = (h0 + t) // u["period"]
            st["used"][k][per] = st["used"][k].get(per, 0.0) + v / u["eff"]
        st["e0"][k] = float(x[e[C - 1]])
    if release is not None:
        used = float(sum(x[c] for c in release[:C]))
        out["reservoir"] += used
        st["released"] += used
    rent = out["rent"]
    for i, f in enumerate(flows):
        rent[("EE-LV", "LV-LT")[i]] += float(sum(abs(x[f[t]] * (price[i + 1][t] - price[i][t]))
                                                 for t in range(C)))
    for b in pb["borders"]:
        z = b["zone"]
        k = b["code"].split("-")[1]
        offers = pb["zones"][z]["offers"]
        ji = next(j for j, o in enumerate(offers) if o["name"] == f"import:{k}")
        je = next(j for j, o in enumerate(offers) if o["name"] == f"export:{k}")
        total = 0.0
        for t in range(C):
            got = x[offer_vars[z][ji][t]] if offer_vars[z][ji][t] is not None else 0.0
            sold = x[offer_vars[z][je][t]] if offer_vars[z][je][t] is not None else 0.0
            sent = got / (1 - b["lossImp"])
            bp = b["price"][h0 + t]
            total += (got * price[z][t] - sent * bp + sold * (1 - b["lossExp"]) * bp
                      - sold * price[z][t])
        rent[b["code"]] += total
