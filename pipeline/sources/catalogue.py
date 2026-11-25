"""Technology catalogues for plant classes ENTSO-E does not parameterise (D-022).

Danish Energy Agency, Technology Data for Generation of Electricity and District Heating,
data sheet (May 2025): https://ens.dk/en/analyses-and-statistics/technology-data-generation-electricity-and-district-heating
  file https://ens.dk/media/8615/download — sheet `alldata_long`, one row per technology,
  parameter, estimate ('ctrl' = central) and year (2015/2020/2030/2050).
Danish Energy Agency, Technology Data for Energy Storage, data sheet:
  https://ens.dk/en/analyses-and-statistics/technology-data-energy-storage
  file https://ens.dk/media/6589/download — the grid-scale lithium-ion battery's investment.
Statistics Finland, Fuel classification and default CO2 emission factors 2025:
  https://www.stat.fi/static/media/uploads/tup/khkinv/khkaasut_polttoaineluokitus_2025.xlsx —
  sheet `Fuel classification 2025`, fossil and biogenic CO2 in t/TJ (= kg/GJ), NCV basis.
Both are public documents fetched as files, so they get measured lineage records.
"""

from __future__ import annotations

from pathlib import Path

from . import cached_get

RAW = "catalogue"
FILES = {
    "dea_el_dh_2025": ("https://ens.dk/media/8615/download", "xlsx",
                       "Danish Energy Agency technology data, electricity and district heating",
                       "Danish Energy Agency; free re-use with attribution"),
    # the batteries' investment for the presentation page's capital cost (D-157)
    "dea_storage_2025": ("https://ens.dk/media/6589/download", "xlsx",
                         "Danish Energy Agency technology data, energy storage (data sheet)",
                         "Danish Energy Agency, CC BY 4.0"),
    "statfi_fuels_2025": ("https://www.stat.fi/static/media/uploads/tup/khkinv/"
                          "khkaasut_polttoaineluokitus_2025.xlsx", "xlsx",
                          "Statistics Finland fuel classification 2025", "CC BY 4.0"),
}
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/128.0 Safari/537.36"}


def fetch(item: str) -> Path:
    url, ext, source, licence = FILES[item]
    return cached_get(raw=RAW, dataset=f"catalogue.{item}", ext=ext, url=url,
                      params={"file": item}, source=source, licence=licence, headers=UA)
