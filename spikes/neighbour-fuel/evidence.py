"""What sets the hours of TYNDP 2024's Distributed Energy and Global Ambition price profiles
(DECISIONS D-072; docs/research/2026-10-05_neighbour_fuel_reindex.md).

Run:  .venv/bin/python spikes/neighbour-fuel/evidence.py > spikes/neighbour-fuel/evidence.txt

Reads the market model's hydrogen outputs from the cached archives (data/raw/tyndp2024) and the
electricity prices from the database. Prints:
  1. the hydrogen marginal cost of a zone whose reformer is always marginal (EE, zone 1) against the
     cost of a steam methane reformer on the model's gas blend and CO2 price;
  2. the hydrogen marginal cost at the synthetic-fuel import parity;
  3. the electricity price against the hydrogen marginal cost, hour by hour (the electrolyser);
  4. the share of each boundary zone's hours that sit on that relation.
"""

from __future__ import annotations

import io
import tempfile
import zipfile

import duckdb
import numpy as np
from pyxlsb import open_workbook

RAW = "data/raw/tyndp2024"
CASES = [("DE", 2035), ("GA", 2035), ("DE", 2040), ("DE", 2050)]
ZONES = {"FI": "FI", "SE4": "SE", "PL": "PL"}
# Final Supply Inputs, sheets 3.1 and 3.2 (data/documentary/parameters.csv, boundary.reprice.*)
BLEND = {2030: 7.497, ("DE", 2040): 10.8625, ("DE", 2050): 17.9315, ("GA", 2040): 9.7861,
         ("GA", 2050): 15.7665}
SHARE = {2030: 0.9048, ("DE", 2040): 0.6095, ("DE", 2050): 0.0461, ("GA", 2040): 0.6818,
         ("GA", 2050): 0.2077}
CO2 = {2030: 113.4, 2040: 147.0, 2050: 168.0}
EFUEL = {2030: 137.9, 2035: 131.28, 2040: 124.66, 2050: 104.16}
ETA = {2030: 0.69, 2035: 0.70, 2040: 0.71, 2050: 0.74}
HEAT_RATE, VOM, GAS_KG_GJ, H2_TO_FUEL = 4.74, 3.38, 57.0, 0.72


def at(table, sc, year):
    def v(y):
        return table.get((sc, y), table.get(y))
    if v(year) is not None:
        return v(year)
    return (v(2030) + v(2040)) / 2          # 2035: the model's own interpolation


def h2_costs(sc: str, year: int) -> dict[str, np.ndarray]:
    name = f"{RAW}/tyndp2024.{sc}{year}CY2009.zip"
    with zipfile.ZipFile(name) as z:
        member = next(m for m in z.namelist() if "_H2_" in m and "MACOSX" not in m)
        data = io.BytesIO(z.read(member))
    rows = []
    with tempfile.NamedTemporaryFile(suffix=".xlsb") as tmp:
        tmp.write(data.getvalue())
        tmp.flush()
        with open_workbook(tmp.name) as wb, wb.get_sheet("Hourly H2 Data") as sh:
            for r in sh.rows():
                rows.append([c.v for c in r])
    code = rows[12]
    return {n: np.array([r[j] if r[j] is not None else np.nan for r in rows[13:13 + 8736]], float)
            for j, n in enumerate(code) if isinstance(n, str) and n.endswith("_Mgl Cost")}


def main() -> None:
    con = duckdb.connect("data/energiamudel.duckdb", read_only=True)
    for sc, year in CASES:
        mc = h2_costs(sc, year)
        blend, share, co2 = at(BLEND, sc, year), at(SHARE, sc, year), at(CO2, sc, year)
        smr = HEAT_RATE * blend + HEAT_RATE * GAS_KG_GJ / 1000 * share * co2 + VOM
        ee = mc["EEH2Z1_Mgl Cost"]
        u, n = np.unique(np.round(ee), return_counts=True)
        print(f"== {sc} {year}: gas blend {blend:.3f} EUR/GJ, fossil share {share:.3f}, "
              f"CO2 {co2:.1f} EUR/t")
        print(f"1. reformer cost computed {smr:.1f} EUR/MWh H2; EE zone 1 marginal cost: mode "
              f"{u[n.argmax()]:.0f} in {n.max()} of {len(ee)} hours")
        par = at(EFUEL, sc, year) * H2_TO_FUEL
        z2 = np.round(mc["FIH2Z2_Mgl Cost"])
        near = int((np.abs(z2 - par) <= 3).sum())
        print(f"2. synthetic-fuel parity computed {par:.1f} EUR/MWh H2; FI zone 2 within 3 of it "
              f"in {near} hours")
        for zone, hz in ZONES.items():
            p = np.array([x[0] for x in con.execute(
                "select eur_mwh from tyndp_price where zone=? and scenario=? and target_year=? "
                "and climate_year=2009 order by hour", [zone, sc, year]).fetchall()])
            on = np.zeros(len(p), bool)
            fits = []
            for zn in ("Z1", "Z2"):
                m = mc[f"{hz}H2{zn}_Mgl Cost"]
                k = (m > 30) & (m < 125) & (np.abs(p / np.where(m > 1, m, np.nan) - 0.65) < 0.05)
                a, b = np.linalg.lstsq(np.vstack([m[k], np.ones(k.sum())]).T, p[k], rcond=None)[0]
                fits.append(f"{zn}: price = {a:.3f} x H2 {b:+.2f} ({int(k.sum())} h)")
                on |= k
            print(f"3. {zone}: {'; '.join(fits)}; input efficiency {at(ETA, sc, year):.3f}")
            print(f"4. {zone}: {int(on.sum())} of {int((p > 5).sum())} hours above 5 EUR/MWh sit "
                  f"on the electrolyser relation; {int((p <= 5).sum())} hours at or below 5")


if __name__ == "__main__":
    main()
