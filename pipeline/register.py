"""Render docs/SOURCE_REGISTER.md: every source, its link, access, licence and use (R-DOC-5).

Run:  make register        (commit the result; never edit the output by hand)

The register answers the question an independent reviewer asks first: which source produced
which number, under what licence, and where the model uses it. Counts, endpoints, licences and
fetch dates come from the lineage records; the purpose column is the one hand-maintained part
and lives in `PURPOSE` below and in `pipeline/sources/documents.py`. A source is not read by
any code before it is here (R-DATA-6).
"""

from __future__ import annotations

import re
from collections import defaultdict

import pandas as pd

from . import DATA_DIR, ROOT, lineage
from .sources import documents

OUT = ROOT / "docs" / "SOURCE_REGISTER.md"

# lineage prefix -> (name, home page or API root, access, what v5 does with it, tables)
PURPOSE = {
    "entsoe": ("ENTSO-E Transparency Platform", "https://transparency.entsoe.eu",
               "free, API token",
               "Day-ahead prices (A44) of the six zones: the core zones' calibration target and "
               "the boundary zones' observed price profile (R-BND-3); load (A65), generation per "
               "type (A75), installed capacity (A68, A71), reservoir filling (A72) and generation "
               "outages (A80) of the core zones; the boundary zones' installed capacity on "
               "1 January 2026 (A68), the fleet beside the market model's on the import-price "
               "page (D-256); physical flows (A11), offered day-ahead "
               "capacity (A31, the hourly NTC of R-LINK-2), transmission outages (A78) and "
               "scheduled exchanges (A09) of the five borders; net positions (A25); the "
               "Estonian oil-shale units with their nominal power (A95, R-SUP-4); the "
               "day-ahead forecasts of load (A65, process A01) and of wind and solar (A69) of "
               "the core zones, what the market cleared on, read by the dear-hours research "
               "(docs/research/2026-10-11_dear_hours.md).",
               "price, load, generation, capacity, unit, reservoir, flow, ntc, unavailability, "
               "scheduled_exchange, net_position"),
    "fingrid": ("Fingrid Open Data", "https://data.fingrid.fi/en", "free, API key",
                "Official day-ahead EstLink capacity per direction (datasets 112, 115) and the "
                "EstLink flow (55): the Finnish-side cross-check of A31 (R-LINK-2).",
                "tso_series"),
    "jao": ("JAO Nordic CCR Publication Tool", "https://publicationtool.jao.eu/nordic/",
            "free, open API",
            "Min/max net positions of the virtual hub FI_EL (EstLink) and the other Nordic "
            "hubs, and the maximum bilateral exchanges, since the Nordic flow-based go-live "
            "(2024-10-29): the Finnish-side EstLink limit (R-DATA-11, R-BND-7). The shadow "
            "prices and PTDFs of the constraints that bound each market result: the price at "
            "the virtual hubs SE4_NB and FI_EL against their zones' (R-BND-3, D-075). From the "
            "Core CCR's tool (publicationtool.jao.eu/core/, since 2022-06-09): shadow prices, "
            "price spreads, Poland's Core net position and PSE's allocation limits — the price "
            "Poland's interconnectors clear at when the limit binds (D-076).",
            "jao_series"),
    "nordpool": ("Nord Pool data portal",
                 "https://data.nordpoolgroup.com/auction/day-ahead/aggregated-bid-curves",
                 "free view of the latest delivery day only (earlier days answer 401); no key",
                 "The day-ahead auction's aggregated supply and demand curves of the Baltic "
                 "cluster (EE + LV + LT), Finland, Sweden and Poland per 15-minute MTU, collected "
                 "twice a day with Nord Pool's consent for calibrating the gas bid (R-SUP-6, "
                 "OPEN-10) and the neighbours' price response (R-BND-6); for the owner's "
                 "research, never redistributed, not refetchable — kept in a backup (D-108).",
                 "none yet (raw files)"),
    "umm": ("Nord Pool REMIT UMM", "https://umm.nordpoolgroup.com", "free, open API (read)",
            "Transmission-unavailability messages for EE, LV and LT: the reasons behind the A31 "
            "capacity profile, shown as labels (R-LINK-6).", "umm_message"),
    "btd": ("Baltic Transparency Dashboard", "https://baltic.transparency-dashboard.eu",
            "free, open API",
            "Balancing capacity procured per Baltic zone and product, held out of the "
            "day-ahead market (R-STO-5, R-STO-6); cross-border capacity on EE-LV and LV-LT "
            "allocated to balancing, subtracted from the AC borders' NTC (R-LINK-5).",
            "reserve_procured, balancing_cb"),
    "openmeteo": ("Open-Meteo historical weather (ECMWF IFS / ERA5)", "https://open-meteo.com",
                  "free, open (non-commercial terms)",
                  "Hourly temperature per core zone, the heat proxy of the CHP must-run fit "
                  "(R-SUP-5).", "weather"),
    "eex": ("EEX EU ETS primary auctions", "https://www.eex.com", "free, open",
            "The CO2 price of every thermal bid in observed years (R-SUP-3); its monthly average "
            "since 2017 on the Statistics page (R-APP-14).", "commodity"),
    "worldbank": ("World Bank Commodity Price Data (Pink Sheet)",
                  "https://www.worldbank.org/en/research/commodity-markets", "free, open",
                  "Monthly TTF gas (and coal, oil) prices behind the fuel cost of thermal "
                  "bids in observed years (R-SUP-3); the gas price's last ten years on the "
                  "Statistics page (R-APP-14).", "commodity"),
    "ecb": ("ECB Data Portal, exchange rates",
            "https://data.ecb.europa.eu/data/datasets/EXR/EXR.M.USD.EUR.SP00.A",
            "free, open (reuse with the source acknowledged)",
            "The monthly US dollar / euro reference rate that turns the Pink Sheet's dollar "
            "prices of gas, coal and oil into euros (R-SUP-3, OPEN-13, ERRATA E-024).",
            "commodity"),
    "tyndp2024": ("ENTSO-E / ENTSOG TYNDP 2024 scenarios",
                  "https://2024.entsos-tyndp-scenarios.eu/download/", "free, CC BY 4.0",
                  "Market-model hourly prices of FI, SE4, PL (the scenario years' boundary "
                  "profiles, R-BND-5) and EE, LV, LT (benchmark); PECD capacity factors, "
                  "demand profiles and hydro inflows of the climate years (R-TIME-2); PEMMDB "
                  "fleet, DSR bands and electrolysers, and its thermal units per type (the "
                  "adequacy tab's unit sizes, R-LINK-7); CO2 factors; the reference grid.",
                  "tyndp_price, pecd_profile, demand_profile, hydro_inflow, thermal_unit, "
                  "scenario_assumption, tech_parameter, scenario_link"),
    "tyndp2026": ("ENTSO-E / ENTSOG TYNDP 2026 scenarios",
                  "https://2026.entsos-tyndp-scenarios.eu/download/",
                  "free, CC BY 4.0 (attribution: TYNDP 2026 Scenarios)",
                  "The second scenario family (D-010): National Trends+ hourly prices of FI, "
                  "SE4, PL (boundary) and EE, LV, LT (benchmark) on the three weather scenarios "
                  "of each target year, with their weights; the core zones' PECD 4.2 capacity "
                  "factors, demand and hydro inflow of the same weather scenarios; PEMMDB 2.X "
                  "thermal units per type (the adequacy tab's unit sizes, R-LINK-7).",
                  "tyndp2026_weather, tyndp2026_price, tyndp2026_pecd, tyndp2026_demand, "
                  "tyndp2026_hydro, thermal_unit"),
    "eraa2025": ("ENTSO-E ERAA 2025", "https://www.entsoe.eu/eraa/2025/modelling-data/",
                 "free, open",
                 "The 2035 fleet and demand of the core zones, the thermal characteristics "
                 "behind every marginal cost, the hourly NTC profile per border and target year "
                 "(R-LINK-3), the DSR bands (R-DEM-6).",
                 "scenario_assumption, tech_parameter, scenario_link, scenario_link_hourly"),
    "irena": ("IRENA, IRENASTAT Online Query Tool",
              "https://pxweb.irena.org/pxweb/en/IRENASTAT/",
              "free, open API (© IRENA 2026, attribution required)",
              "Installed onshore wind, offshore wind and solar capacity at the end of each year "
              "2015-2025 in Estonia, Latvia, Lithuania, Finland, Sweden and Poland: the build "
              "rates, trends and extrapolations of the Statistics page (R-APP-14, D-087).",
              "capacity_stat"),
    "energimyndigheten": ("Energimyndigheten (Swedish Energy Agency), wind power statistics",
                          "https://pxexternal.energimyndigheten.se/pxweb/sv/"
                          "Energimyndighetens_statistikdatabas/",
                          "free, open API (official statistics of Sweden)",
                          "Installed wind capacity by Swedish bidding area, 2003-2025: SE4, the "
                          "model's neighbour, and Sweden's own count beside IRENA's on the "
                          "Statistics page (R-APP-14, D-093).", "capacity_area"),
    "pipeline": ("energiamudel v5's own derived datasets", "https://energiamudel.ee/",
                 "the repository's code and its registered inputs",
                 "Datasets this repository computes from registered sources and keeps with their "
                 "code: the neighbours' tight boundary profiles of the research on Finland, Sweden "
                 "and Poland (R-BND-5, D-121); the calibration's fitted gas bid, Kruonis's step, "
                 "CHP floors and battery delta.",
                 "research_price"),
    "catalogue": ("Danish Energy Agency technology data (generation; energy storage); Statistics "
                  "Finland fuel classification",
                  "https://ens.dk/en/analyses-and-statistics/technology-data-generation-"
                  "electricity-and-district-heating", "free, open",
                  "Efficiency, variable cost and CO2 factors of the plant classes ERAA does not "
                  "cover: biomass, waste, peat, CHP (R-SUP-3); the investment of what the "
                  "presentation page's capital cost prices, the batteries' from the storage "
                  "catalogue (D-157).", "tech_parameter"),
}

SOFTWARE = [
    ("DuckDB", "https://duckdb.org", "MIT", ">=1.1 (pyproject.toml)",
     "The build-time database (`make db`).", ""),
    ("pandas", "https://pandas.pydata.org", "BSD-3-Clause", ">=2.2 (pyproject.toml)",
     "Every table between the raw files and the database.", ""),
    ("NumPy", "https://numpy.org", "BSD-3-Clause", ">=1.26 (pyproject.toml)",
     "The export's hourly arrays (`make export`).", ""),
    ("jsonschema", "https://python-jsonschema.readthedocs.io", "MIT", ">=4.20 (pyproject.toml)",
     "Validates every export file against `schema/` before it is written (R-NFR-7).", ""),
    ("json-schema-to-typescript", "https://github.com/bcherny/json-schema-to-typescript", "MIT",
     "^15.0.4 (app/package.json, development only)",
     "Generates the TypeScript contract types in `app/src/contract/` from `schema/` (R-NFR-7).",
     ""),
    ("openpyxl, pyxlsb, xlrd", "https://openpyxl.readthedocs.io", "MIT; LGPL-3.0; BSD-3-Clause",
     ">=3.1; >=1.0.10; >=2.0 (pyproject.toml)",
     "Read the ERAA and TYNDP workbooks (`xlsx`, `xlsb`) and EEX's auction reports of "
     "2017-2019 (`xls`).", ""),
    ("TypeScript", "https://www.typescriptlang.org", "Apache-2.0",
     "^7.0.2 (app/package.json, development only)",
     "Strict type checking of the engine and the site (`npm run lint`); Node runs the sources "
     "by type stripping (DECISIONS D-020).", ""),
    ("Vite", "https://vite.dev", "MIT", "8.3.4 (app/package.json, development only)",
     "Serves and builds the static site (`npm run dev`, `npm run build`; D14, R-NFR-6).", ""),
    ("Chart.js", "https://www.chartjs.org", "MIT", "4.5.1 (app/package.json, runtime)",
     "The application's charts (`app/src/ui/charts.ts`, R-APP-1, R-NFR-6).", ""),
    ("Montserrat", "https://github.com/JulietaUla/Montserrat", "SIL OFL 1.1",
     "9.000, weights 400 to 800, latin and latin-ext subsets as Google Fonts serves them "
     "(app/public/fonts, from Fermi's `sise` repository at a49f7532)",
     "The interface's face for text and numbers, tabular figures for the numbers "
     "(R-UI-2, D-197); the wordmark is drawn from its ExtraBold's outlines; licence in "
     "`app/public/fonts/OFL-Montserrat.txt`.", ""),
    ("HiGHS", "https://highs.dev", "MIT",
     "highs-js 1.15.4 (app/package.json, runtime); highspy 1.15 (pyproject.toml extra "
     "`reference`)",
     "The engine of record in the browser and in Node (`app/src/engine/lp.ts`, R-ENG-8, "
     "revision 1.4) and the offline reference (`reference/lp.py`).",
     "Huangfu, Hall (2018), Parallelizing the dual revised simplex method, Mathematical "
     "Programming Computation 10, 119–142, https://doi.org/10.1007/s12532-017-0130-5"),
]


def _pages(s: pd.Series) -> str:
    seen = list(dict.fromkeys(str(p) for p in s.dropna() if str(p)))
    return "; ".join(seen[:4]) + (" …" if len(seen) > 4 else "")


def document_use() -> dict[str, list[str]]:
    """Document key -> what the model takes from it, read off the documentary CSVs."""
    doc = DATA_DIR / "documentary"
    use: dict[str, list[str]] = defaultdict(list)
    for name, label in (("scenarios", "scenario"), ("fuel_paths", "fuel and CO2 path"),
                        ("links", "transfer capacities"), ("parameters", "parameters")):
        path = doc / f"{name}.csv"
        if not path.exists():
            continue
        d = pd.read_csv(path)
        if "scenario" in d.columns:
            group = d["scenario"]
        else:                                   # parameters: by the first two parts of the key
            group = d["key"].str.split(".").str[:2].str.join(".")
        for (src, what), g in d.assign(what=group).dropna(subset=["source"]).groupby(
                ["source", "what"]):
            use[src].append(f"{label} `{what}` ({len(g)} rows) — {_pages(g.page)}")
    d = pd.read_csv(doc / "tech_parameters.csv")
    for (src, pset), g in d.dropna(subset=["doc_source"]).groupby(["doc_source", "source"]):
        use[src].append(f"plant parameters `{pset}` ({len(g)} rows) — {_pages(g.page)}")
    # documents a row's note names (e.g. the source that identifies a unit)
    named: dict[str, int] = defaultdict(int)
    for path in doc.glob("*.csv"):
        d = pd.read_csv(path, dtype=str, keep_default_na=False)
        for note in d.get("notes", []):
            for k in set(re.findall(r"[a-z0-9_]+", note)) & set(documents.DOCS):
                named[k] += 1
    for k, n in sorted(named.items()):
        use[k].append(f"named in the notes of {n} rows")
    return use


def entries() -> dict:
    """The register as data: measured sources, documents, software."""
    recs = {r.dataset: r for r in lineage.read_all()}
    agg: dict[str, dict] = defaultdict(lambda: {"n": 0, "licences": set(), "last": ""})
    for r in recs.values():
        a = agg[r.dataset.split(".")[0]]
        a["n"] += 1
        a["licences"].add(r.licence)
        a["last"] = max(a["last"], r.fetched_at[:10])
    measured = [{"id": src, "name": name, "url": url, "access": access, "use": purpose,
                 "tables": tables, "datasets": agg[src]["n"], "last": agg[src]["last"],
                 "licences": sorted(agg[src]["licences"])}
                for src, (name, url, access, purpose, tables) in PURPOSE.items()]
    use = document_use()
    docs = []
    for key, d in documents.DOCS.items():
        rec = recs.get(documents.dataset_id(key))
        pages = sum(1 for ds in recs if ds.startswith(f"doc.{key}."))
        docs.append({"id": key, "title": d["title"], "url": d["url"],
                     "original": d.get("original", ""),
                     "fetched": (rec.fetched_at or "")[:10] if rec else "not cached",
                     "sha256": (rec.sha256 or "")[:12] if rec else "",
                     "pages": pages, "use": use.get(key, [])})
    software = [{"name": n, "url": u, "licence": lic, "version": v, "use": w, "cite": c}
                for n, u, lic, v, w, c in SOFTWARE]
    return {"measured": measured, "documents": docs, "software": software}


def render() -> str:
    e = entries()
    lines = [
        "# Source register", "",
        "Every source v5 uses, what it is used for, and where its licence lets it go. "
        "Generated by `make register` from the lineage records; the purpose column lives in "
        "`pipeline/register.py` and `pipeline/sources/documents.py`. The single fetch behind "
        "a number is `data/lineage/<dataset>.json` (git-ignored; `make history` refetches).", "",
        "## Measured sources (fetched from an API or a published file)", "",
        "| Source | Link / API root | Access | Datasets | Last fetch | What v5 uses it for | "
        "Tables |", "|---|---|---|---|---|---|---|"]
    for m in e["measured"]:
        lines.append(f"| {m['name']} | [{m['url']}]({m['url']}) | {m['access']} | "
                     f"{m['datasets'] or '—'} | {m['last'] or '—'} | {m['use']} | "
                     f"{m['tables']} |")
    lines += ["", "Licences as recorded in the lineage records:", ""]
    lines += [f"- **{m['name']}**: {'; '.join(m['licences']) or '—'}" for m in e["measured"]]
    lines += ["", "## Published documents (cached as files; values cited per page)", "",
              "Each document is a file in `data/raw/doc/` with a measured lineage record "
              "(SHA-256); every value read from it is a row of `data/documentary/*.csv` with its "
              "page, and the page's documentary lineage record names the file record.", "",
              "| Document | Link | Fetched | SHA-256 | Page records | What v5 takes from it |",
              "|---|---|---|---|---|---|"]
    for d in e["documents"]:
        link = f"[link]({d['url']})" + (f" (original, now dead: {d['original']})"
                                        if d["original"] else "")
        lines.append(f"| {d['title']} (`{d['id']}`) | {link} | {d['fetched']} | "
                     f"`{d['sha256']}` | {d['pages']} | {'<br>'.join(d['use']) or '—'} |")
    own = pd.read_csv(DATA_DIR / "documentary" / "parameters.csv", dtype=str,
                      keep_default_na=False)
    own = own[own.source == "specification"]
    lines += ["", "## Owner's assumptions", "",
              "Parameters no published source gives. Each is the owner's, labelled so here and "
              "in the interface, and cited to the specification section that sets it "
              "(R-PROV-2). The owner's scenario presets (`fermi_*` in `scenarios.csv`, from v3) "
              "are labelled likewise.", "",
              "| Parameter | Value | Set by | Why |", "|---|---|---|---|"]
    lines += [f"| `{r.key}` | {r.value} {r.unit} | SPECIFICATION.md {r.page} | {r.notes} |"
              for r in own.itertuples()]
    lines += ["", "## Software", "",
              "| Software | Link | Licence | Version | Role | Cite as |",
              "|---|---|---|---|---|---|"]
    for w in e["software"]:
        lines.append(f"| {w['name']} | [{w['url']}]({w['url']}) | {w['licence']} | "
                     f"{w['version']} | {w['use']} | {w['cite'] or '—'} |")
    lines += ["", "## What may be redistributed", "",
              "- **Code, documentation and the documentary CSVs**: this repository's licences "
              "(`LICENSE`, `LICENSE-docs`).",
              "- **Raw API responses and cached documents in `data/raw`**: git-ignored; "
              "third-party material under the terms listed above. `make history` refetches "
              "them from the publishers.",
              "- **Nord Pool aggregated bidding curves**: never committed, in any form; only "
              "parameters derived from them, with the date they were read (R-DATA-10).", ""]
    return "\n".join(lines) + "\n"


def main() -> int:
    OUT.write_text(render())
    print(OUT.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
