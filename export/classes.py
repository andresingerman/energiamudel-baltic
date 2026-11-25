"""The class map: every documentary capacity key → one class of SPECIFICATION.md R-SUP-1, or an
exclusion with its reason (docs/PLAN.md §3.3; DECISIONS D-014).

A class is what the panel shows one control for and what the engine bids as one stack of blocks.
`params` names the technology row (tech_parameters.csv: source, tech_class) whose efficiency,
CO2 factor and variable cost the class bids with; classes without fuel (wind, solar, hydro,
storage) have none. A key that is neither mapped nor excluded stops the export: v4 dropped such
rows silently (v4 ERRATA E-039).

Oil shale follows R-SUP-4: three classes filled newest first. A generic `oil_shale` total fills
Auvere (270 MW), then the circulating-fluidised-bed units (386 MW), then pulverised firing;
PEMMDB's `oil_shale_new` is the fluidised-bed technology (Auvere 270 + Balti 11 and Eesti 8,
386 MW: 656 MW against PEMMDB's 658) and fills the same way; `oil_shale_old` is pulverised firing.
"""

from __future__ import annotations

from dataclasses import dataclass

# class -> (label, technology row it bids with: (tech_parameters source, tech_class) or None)
CLASSES: dict[str, tuple[str, tuple[str, str] | None]] = {
    "wind_onshore": ("Wind onshore", None),
    "wind_offshore": ("Wind offshore", None),
    "solar": ("Solar PV", None),
    "hydro_ror": ("Hydro run-of-river", None),
    "hydro_daugava": ("Daugava hydro cascade", None),
    "hydro_ps": ("Pumped storage (Kruonis)", None),
    "nuclear": ("Nuclear (SMR)", ("eraa2025_common", "nuclear")),
    "oil_shale_auvere": ("Oil shale, Auvere", ("oil_shale_classes", "oil_shale_auvere")),
    "oil_shale_cfb": ("Oil shale, fluidised bed", ("oil_shale_classes", "oil_shale_cfb")),
    "oil_shale_pf": ("Oil shale, pulverised firing", ("oil_shale_classes", "oil_shale_pf")),
    "retort_gas": ("Oil-shale retort gas", ("retort_gas", "retort_gas")),
    "gas_ccgt": ("Gas, combined cycle", ("eraa2025_common", "gas_ccgt_present_1")),
    "gas_conventional": ("Gas, steam turbine", ("eraa2025_common", "gas_conventional_old_2")),
    "gas_ocgt": ("Gas, peaking", ("eraa2025_common", "gas_ocgt_new")),
    "gas_chp": ("Gas CHP", ("dea_2025", "gas_ccgt_chp_extraction")),
    "biomass_chp": ("Biomass CHP", ("dea_2025", "wood_chips_chp_medium")),
    "waste": ("Waste", ("dea_2025", "waste_chp_medium")),
    # in observed years both are given output; in scenario years they bid as v4 did (D-020)
    "other_renewable": ("Other renewable (biogas)", ("dea_2025", "wood_chips_chp_medium")),
    "other": ("Other", ("dea_2025", "gas_engine_chp")),
    "battery": ("Batteries", None),
}


def eraa_row(cls: str) -> str:
    """The ERAA technology row a class's parameters come from; a class without one is an error."""
    eraa = CLASSES[cls][1]
    if eraa is None:
        raise ValueError(f"{cls}: no ERAA technology row")
    return eraa[1]


OIL_SHALE_ORDER = ("oil_shale_auvere", "oil_shale_cfb", "oil_shale_pf")


@dataclass(frozen=True)
class Rule:
    """What a documentary key becomes: `target` is a class, 'split:oil_shale', 'flex:<kind>',
    'energy:battery', or 'exclude'; `params` overrides the class's technology row where the
    key names a more specific one; `why` is shown in the methodology table."""
    target: str
    why: str
    params: tuple[str, str] | None = None


_TSO = "TSO-owned reserve asset, outside the day-ahead market (R-STO-8)"

# documentary key (without the `capacity.` prefix) -> rule; zone-specific rules below win
KEYS: dict[str, Rule] = {
    "wind_onshore": Rule("wind_onshore", "as named"),
    "wind_offshore": Rule("wind_offshore", "as named"),
    "wind_offshore_fixed": Rule("wind_offshore", "ERAA's fixed-bottom offshore wind"),
    "solar": Rule("solar", "as named"),
    "solar_pv_utility_non_tracking": Rule("solar", "ERAA utility-scale PV"),
    "solar_pv_rooftop_industrial": Rule("solar", "ERAA rooftop PV (behind the meter, R-DEM-2)"),
    "solar_pv_rooftop_residential": Rule("solar", "ERAA rooftop PV (behind the meter, R-DEM-2)"),
    "solar_thermal_without_storage": Rule("solar", "ERAA solar thermal without storage "
                                                   "produces on the solar profile"),
    "hydro_ror": Rule("hydro_ror", "as named"),
    "run_of_river": Rule("hydro_ror", "ERAA run-of-river"),
    "hydro_small": Rule("hydro_ror", "small hydro runs on its inflow"),
    "hydro_daugava": Rule("hydro_daugava", "as named"),
    "pondage": Rule("hydro_daugava", "PEMMDB/ERAA pondage: in Latvia, the Daugava cascade"),
    "hydro_ps": Rule("hydro_ps", "as named"),
    "closed_loop_pumping": Rule("hydro_ps", "ERAA closed-loop pumped storage: Kruonis"),
    "auvere": Rule("oil_shale_auvere", "Elering names the Auvere plant"),
    "oil_shale": Rule("split:oil_shale", "R-SUP-4: Auvere, then fluidised bed, then "
                                         "pulverised firing"),
    "oil_shale_new": Rule("split:oil_shale", "PEMMDB's new oil shale is the fluidised-bed "
                                             "technology: Auvere, then Balti 11 and Eesti 8"),
    "oil_shale_old": Rule("oil_shale_pf", "PEMMDB's old oil shale is pulverised firing"),
    "coal_gas": Rule("retort_gas", "ENTSO-E's coal-derived gas in Estonia is oil-shale retort "
                                   "gas (R-SUP-4)"),
    "gas": Rule("gas_ccgt", "the owner's generic gas fleet bids as a present CCGT"),
    "natural_gas": Rule("gas_ccgt", "ERAA's aggregate natural-gas capacity bids as a present "
                                    "CCGT"),
    "gas_ccgt_new": Rule("gas_ccgt", "PEMMDB class", ("eraa2025_common", "gas_ccgt_new")),
    "gas_ccgt_present_1": Rule("gas_ccgt", "PEMMDB class", ("eraa2025_common",
                                                           "gas_ccgt_present_1")),
    "gas_ccgt_present_2": Rule("gas_ccgt", "PEMMDB class", ("eraa2025_common",
                                                           "gas_ccgt_present_2")),
    "gas_conventional_old_2": Rule("gas_conventional", "PEMMDB class"),
    "gas_ocgt": Rule("gas_ocgt", "Elering's gas tender: fast peaking units"),
    "chp_fossil": Rule("gas_chp", "Elering's fossil CHP (gas engines)",
                       ("dea_2025", "gas_engine_chp")),
    "gas_chp_small": Rule("gas_chp", "AST's small gas CHP (engines)",
                          ("dea_2025", "gas_engine_chp")),
    "chp_riga_tec1": Rule("gas_chp", "Riga TEC-1, combined-cycle CHP"),
    "chp_riga_tec2": Rule("gas_chp", "Riga TEC-2, combined-cycle CHP"),
    "biomass": Rule("biomass_chp", "biomass in the Baltic fleets is CHP"),
    "small_biomass": Rule("biomass_chp", "ERAA small biomass (CHP)"),
    "chp_bio": Rule("biomass_chp", "Elering's biomass CHP"),
    "biogas": Rule("other_renewable", "biogas engines run as other renewable"),
    "waste": Rule("waste", "as named"),
    "other": Rule("other", "as named"),
    "other_renewable": Rule("other_renewable", "as named"),
    "battery": Rule("battery", "as named"),
    "battery_utility_scale": Rule("battery", "ERAA utility-scale batteries in the market"),
    "battery_mwh": Rule("energy:battery", "battery energy of the preset"),
    "battery_tso_reserve": Rule("exclude", _TSO),
    "battery_utility_scale_out_of_market": Rule("exclude", _TSO),
    "oil": Rule("exclude", "ENTSO-E A68 lists 8 MW (2020) and 52 MW (2022) of oil in Estonia "
                           "and no output of it (D-013)"),
    "kiisa": Rule("exclude", "Kiisa emergency reserve plant: " + _TSO),
    "gas_existing": Rule("gas_ocgt", "S1's existing natural gas names no technology; with the rest "
                                     "of S1's gas as peaking (D-036)"),
    "gas_reserve_procurement": Rule("gas_ocgt", "S1's reserve procurement: fast gas units (D-036)"),
    "gas_restoration": Rule("gas_ocgt", "S1's distributed restoration tender, entered 'simply as "
                                        "gas plants' (D-036)"),
    "capacity_mechanism": Rule("gas_ocgt", "S1's future capacity mechanism, entered 'simply as "
                                           "gas plants' (D-036)"),
    "controllable_need": Rule("exclude", "Elering's need for controllable capacity, not a fleet "
                                         "(shown as a note)"),
    "thermal": Rule("exclude", "Litgrid's aggregate thermal capacity names no technology; the "
                               "Lithuanian presets take their thermal classes from ERAA "
                               "(shown as a note)"),
    "dsr": Rule("flex:dsr", "explicit demand response (R-DEM-6)"),
    "electrolyser": Rule("flex:electrolysis", "electrolysers are flexible demand (R-DEM-5)"),
}

# Latvia's run-of-river is the Daugava cascade in the owner's presets (1 588 MW, as AST's
# hydro_daugava); its small hydro is AST's `hydro_small`.
ZONE_KEYS: dict[tuple[str, str], Rule] = {
    ("LV", "hydro_ror"): Rule("hydro_daugava", "in Latvia the 1 588 MW of run-of-river are the "
                                               "Daugava cascade (AST: hydro_daugava)"),
    # the owner, 2026-10-08: no scenario of Latvia or Lithuania builds offshore wind (D-105)
    **{(z, k): Rule("exclude", "offshore wind, which the owner leaves out of Latvia's and "
                               "Lithuania's scenarios (D-105)")
       for z in ("LV", "LT") for k in ("wind_offshore", "wind_offshore_fixed")},
}


# Kiisa is held out of the market to November 2028 (R-STO-8); a later year runs it as peaking gas
# (PLAN §3.3, D-104)
KIISA_LAST_RESERVE_YEAR = 2028
KIISA_AFTER = Rule("gas_ocgt", "Kiisa, out of R-STO-8's reserve after November 2028: peaking gas "
                               "(PLAN §3.3, D-104)")


def rule(zone: str, key: str, year: int | None = None) -> Rule:
    """The rule for a documentary key in a preset's year; KeyError if the key is not mapped (the
    export stops)."""
    k = key.removeprefix("capacity.")
    if k == "kiisa" and year is not None and year > KIISA_LAST_RESERVE_YEAR:
        return KIISA_AFTER
    if (zone, k) in ZONE_KEYS:
        return ZONE_KEYS[(zone, k)]
    if k not in KEYS:
        raise KeyError(f"capacity.{k} ({zone}) is not in the class map (export/classes.py)")
    return KEYS[k]


def split_oil_shale(mw: float, sizes: dict[str, float]) -> dict[str, float]:
    """Fill the oil-shale classes newest first: Auvere, fluidised bed, then the rest as
    pulverised firing (R-SUP-4). `sizes` holds the first two classes' MW."""
    out, left = {}, float(mw)
    for c in OIL_SHALE_ORDER:
        take = left if c == "oil_shale_pf" else min(left, sizes[c])
        if take > 0:
            out[c] = take
        left -= take
    return out


def fleet(zone: str, rows: dict[str, float], sizes: dict[str, float], year: int | None = None
          ) -> tuple[dict[str, float], dict[str, float], dict[str, float], list[str]]:
    """Map one preset-zone-year's capacity rows (key -> MW) to (classes MW, battery energy MWh,
    flexible loads MW, notes). Excluded keys become notes; nothing is dropped silently."""
    cls: dict[str, float] = {}
    energy: dict[str, float] = {}
    flex: dict[str, float] = {}
    notes: list[str] = []
    for key in sorted(rows):
        r, mw = rule(zone, key, year), rows[key]
        if r.target == "exclude":
            notes.append(f"{key.removeprefix('capacity.')} {mw:g} MW: {r.why}")
        elif r.target == "split:oil_shale":
            for c, v in split_oil_shale(mw, sizes).items():
                cls[c] = cls.get(c, 0.0) + v
        elif r.target.startswith("flex:"):
            kind = r.target.split(":", 1)[1]
            flex[kind] = flex.get(kind, 0.0) + mw
        elif r.target.startswith("energy:"):
            energy[r.target.split(":", 1)[1]] = energy.get(r.target.split(":", 1)[1], 0.0) + mw
        else:
            if r.target not in CLASSES:
                raise KeyError(f"rule for {key} names an unknown class {r.target}")
            cls[r.target] = cls.get(r.target, 0.0) + mw
    return cls, energy, flex, notes
