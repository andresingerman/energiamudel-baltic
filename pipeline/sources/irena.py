"""IRENA, IRENASTAT: installed electricity capacity per country, technology and year (D-087).

API:    PxWeb, https://pxweb.irena.org/api/v1/en/IRENASTAT/Power%20Capacity%20and%20Generation/
        Country_ELECSTAT_2026_H2_PX.px — "Electricity statistics by Country/area, Technology, Data
        Type, Grid connection and Year", updated 2026-09-28; years 2000-2025. A data query is a
        POST of a JSON selection; the answer is CSV. Confirmed 2026-10-06.
Series: Electrical Installed Capacity (MW) at the end of each year, all grid connections, for
        onshore wind, offshore wind and solar photovoltaic in the three core countries and the
        three neighbours (Sweden as a whole: the statistics have no bidding zones). The same
        figures as IRENA's Renewable capacity statistics 2026 (doc.irena_capacity_2026); for
        2015-2024 mostly Eurostat's nrg_inf_epcrw, IRENA's main source for the EU, with a few
        series differing (docs/research/2026-10-06_statistics.md §2).
Access: free, no key. Licence: "Material ... may be freely used, shared, copied, reproduced,
        printed and/or stored, provided that all such material is clearly attributed to IRENA and
        bears a notation that it is subject to copyright (© IRENA), with the year of the copyright."
"""

from __future__ import annotations

import io
import json
import tempfile
from pathlib import Path

import pandas as pd
import requests

from . import cached_get, raw_dir

SOURCE = "IRENA, IRENASTAT Online Query Tool"
LICENCE = "© IRENA 2026; free use with attribution to IRENA and the copyright notation"
RAW = "irena"
TABLE = "Country_ELECSTAT_2026_H2_PX.px"
URL = ("https://pxweb.irena.org/api/v1/en/IRENASTAT/Power%20Capacity%20and%20Generation/"
       + TABLE)
COUNTRIES = {"EST": "EE", "LVA": "LV", "LTU": "LT", "FIN": "FI", "SWE": "SE", "POL": "PL"}
TECHS = {"5": ("Onshore wind energy", "wind_onshore"),
         "21": ("Offshore wind energy", "wind_offshore"),
         "4": ("Solar photovoltaic", "solar")}
FIRST, LAST = 2015, 2025          # 2015 so that 2016 has a net addition: ten years, 2016-2025

# Since its certificate of 2026-09-06 IRENA's server sends GoDaddy's DV intermediate of the new TLS
# root R1 but not the certificate that links R1 to GoDaddy's root G2, and R1 itself awaits Mozilla's
# approval (bug 2035858), so certifi cannot build the chain. This cross-certificate — GoDaddy's
# repository, gd_tls_root-r1-cross-g2.crt.pem, SHA-256 7B:CB:0F:2F:…:81:29:8C, valid to 2037 —
# completes it to G2, which certifi trusts: nothing new is trusted.
# ponytail: drop it once certifi carries "GoDaddy TLS Root CA - R1".
R1_CROSS_G2 = """\
-----BEGIN CERTIFICATE-----
MIIFhjCCBG6gAwIBAgIRAJDebH+ztQs8BhdyT8E0Aq0wDQYJKoZIhvcNAQELBQAw
gYMxCzAJBgNVBAYTAlVTMRAwDgYDVQQIEwdBcml6b25hMRMwEQYDVQQHEwpTY290
dHNkYWxlMRowGAYDVQQKExFHb0RhZGR5LmNvbSwgSW5jLjExMC8GA1UEAxMoR28g
RGFkZHkgUm9vdCBDZXJ0aWZpY2F0ZSBBdXRob3JpdHkgLSBHMjAeFw0yNTA5MjQx
MjAwMDBaFw0zNzEyMzEyMzU5NTlaMEYxCzAJBgNVBAYTAlVTMRQwEgYDVQQKEwtH
b0RhZGR5LmNvbTEhMB8GA1UEAxMYR29EYWRkeSBUTFMgUm9vdCBDQSAtIFIxMIIC
IjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAwutyndeeSeRO9j0jUjOxADwr
++nlMlGJiwJlYyK1fEYf7IPX50+4LmdXO7oEuVdZnx/sTtyzuUYFR7KB5vYKysRL
HW4W0HxHclHhQ4Aw0T8quVgXAcHJ0XUmFy20wQSSiMGq30h/4qzwajYF7isgCPj3
nIXMCsA9zwDHaTIaCp/1KXRLVJRvGS681Giaxve42D6txJaDjNRWLFCKMhmbYAgH
E1b2DNqCGzp2eiDquCrAFgqTtY2Fk58BOSr8YdT2CWeaKIwx4U8raSqj1g1aTXs3
MRiasGnoQsnAzCG66lcuJ+ag4AvZrG+Q7VyLrpYoHE8Hk4+DLlZ92FinuXYDPx30
wMpYJjA9OlGPB/jUCAYqGvAyMQn4f+0b7C7u9YfQGT4F+XaAG03IaO85sYkcyAm6
w8BINtZOEFrDg+sDqwpM09pAJi1UJiLqH8lcHf0/aKVOLF4L2GIQWY+TCmWCN/+3
/sK8XpegJEgWRTa9Rg3lZD26kthFMxkhWsc7Ec5zF6+9sPaNK4jPZnJ1ZZ3BLOhB
vyDn9uaF+tfAs+UIBmGHH4TmWMz84uWRrJKiLfmYYTgxU5+V33gnubXVR5jvq3jd
EgZbQcXt/CbnnoLe2F3vRFncpbBKI4ElAbMMzONj5HneQmdSWM9KVKoN6ZQTV+wb
t684+CtlJdzys/ZZMDECAwEAAaOCAS8wggErMA4GA1UdDwEB/wQEAwIBhjATBgNV
HSUEDDAKBggrBgEFBQcDATAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBTsUhGV
cHMZyN7KSEOXSxw1JCJDUDAfBgNVHSMEGDAWgBQ6moUHEGcotu/2vQVBbiDBlNoP
3jBUBggrBgEFBQcBAQRIMEYwRAYIKwYBBQUHMAKGOGh0dHA6Ly9jZXJ0aWZpY2F0
ZXMuZ29kYWRkeS5jb20vcmVwb3NpdG9yeS9nZHJvb3QtZzIuY3J0MCYGA1UdIAQf
MB0wCAYGZ4EMAQIBMAgGBmeBDAECAjAHBgVngQwBATA1BgNVHR8ELjAsMCqgKKAm
hiRodHRwOi8vY3JsLmdvZGFkZHkuY29tL2dkcm9vdC1nMi5jcmwwDQYJKoZIhvcN
AQELBQADggEBAEhbCwX1uaC5L9mJ+D6X4P/VH6Q2+zfX+dXnEBNNoE/xqboBmdFg
4SPi0+cRl1DBGELmn7L3wXdzuTh+e4bHIgvbzoZL8UJjQbTfE5w/EUU9tn0vsPxh
MgN2uWpme0gEGNTwUoX9D36vh1cDardevHaSbNYXRPR40Hrv5dHgoP0FVeaCZ09u
q2mtRVg6PSIQE5ycT2gPrbFxfo+lF/zxCy6BXkf46toy8AVz30rAYkVBNSqGANO0
rAeYLisohAJC59e+sjjxyFL9i8iYuD1PjUUYTNtQPPeOQKAhAmEphJ0iWPt98lrI
NaewsVVCcxYIgvifrn/Ptta4PPW7Z35c+Yc=
-----END CERTIFICATE-----
"""


def query() -> dict:
    """The PxWeb selection: the table's codes, years as their positions from 2000."""
    sel = lambda code, values: {"code": code, "selection": {"filter": "item", "values": values}}  # noqa: E731
    return {"query": [sel("Country/area", list(COUNTRIES)), sel("Technology", list(TECHS)),
                      sel("Data Type", ["1"]),                    # Installed Capacity (MW)
                      sel("Grid connection", ["0"]),              # All
                      sel("Year", [str(y - 2000) for y in range(FIRST, LAST + 1)])],
            "response": {"format": "csv"}}


def fetch() -> Path:
    ds = f"irena.capacity.{TABLE.removesuffix('_PX.px')}"
    if (raw_dir(RAW) / f"{ds}.csv").exists():
        return raw_dir(RAW) / f"{ds}.csv"
    q = query()
    with tempfile.TemporaryDirectory() as d:
        bundle = Path(d) / "ca.pem"
        bundle.write_text(Path(requests.certs.where()).read_text() + "\n" + R1_CROSS_G2)
        r = requests.post(URL, json=q, timeout=120, verify=str(bundle))
    if r.status_code >= 400:
        raise RuntimeError(f"{ds}: HTTP {r.status_code}: {r.content[:200]!r}")
    return cached_get(raw=RAW, dataset=ds, ext="csv", url=URL, params={"query": json.dumps(q)},
                      source=SOURCE, licence=LICENCE, content=r.content)


def parse(path: Path) -> pd.DataFrame:
    """(country, tech, year, mw): ISO 3166 alpha-2, the tech vocabulary, year-end MW. IRENASTAT
    prints ".." where a country has no figure; for these three technologies that is a country
    without the plant (Eurostat's nrg_inf_epcrw gives 0 for the same cells), so it is 0 MW."""
    df = pd.read_csv(io.BytesIO(path.read_bytes()), encoding="utf-8-sig", dtype=str)
    if not {"Country/area", "Technology", "Year"} <= set(df.columns):
        raise RuntimeError(f"{path.name}: not an IRENASTAT CSV (columns {list(df.columns)[:6]})")
    value = df.columns[-1]
    country = {name: iso for iso, name in (("EE", "Estonia"), ("LV", "Latvia"),
                                           ("LT", "Lithuania"), ("FI", "Finland"),
                                           ("SE", "Sweden"), ("PL", "Poland"))}
    tech = {label: code for label, code in TECHS.values()}
    unknown = (set(df["Country/area"]) - set(country)) | (set(df["Technology"]) - set(tech))
    if unknown:
        raise RuntimeError(f"{path.name}: unexpected rows {sorted(unknown)}")
    out = pd.DataFrame({
        "country": df["Country/area"].map(country),
        "tech": df["Technology"].map(tech),
        "year": df["Year"].astype(int),
        "mw": pd.to_numeric(df[value].str.strip().replace("..", "0"), errors="raise"),
    })
    return out.sort_values(["country", "tech", "year"]).reset_index(drop=True)
