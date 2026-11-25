"""ENTSO-E ERAA 2025: the data release behind the European Resource Adequacy Assessment.

Page:  https://www.entsoe.eu/eraa/2025/modelling-data/   (public download portal)
Files: dashboard raw data (installed capacity per node, technology and target year 2028/2030/
       2033/2035; annual demand; commodity prices), economic and technical investment
       parameters, and the explanatory note. Cached under data/raw/eraa2025 with one lineage
       record each; the documentary layer cites these records (docs/SOURCE_REGISTER.md).
Members: single files read out of the multi-GB PECD packages with HTTP range requests (the
       zip's directory, then the member's bytes), so the cache holds only what is cited.
NTCs:  `ntc_profiles` reads the hourly NTC of every model border out of the cached NTC package
       (scenario_link_hourly, D-085); the ntc_max and ntc_mean rows of
       data/documentary/links.csv are that profile's maximum and average.
"""

from __future__ import annotations

import io
import re
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd
import requests

from . import cached_get

SOURCE = "ENTSO-E ERAA 2025"
LICENCE = "ENTSO-E public data; free re-use with attribution"
RAW = "eraa2025"
PAGE = "https://www.entsoe.eu/eraa/2025/modelling-data/"
BASE = ("https://eepublicdownloads.blob.core.windows.net/public-cdn-container/clean-documents/"
        "sdc-documents/ERAA/")
FILES = {
    "dashboard_raw_data": "ERAA_2025_Dashboard_RawData.zip",
    "investment_parameters": "ERAA_2025_EconomicTechnicalInvestmentParameters.zip",
    "explanatory_note": "ERAA_2025_ExplanatoryNoteOnDataRelease.pdf",
    "common_data": "ERAA_2025_CommonData.zip",
    "other_data": "ERAA_2025_OtherData.zip",
    "ntcs": "ERAA_2025_NTCs.zip",
}
# item -> (package, member): one file out of a package too large to cache whole
MEMBERS = {
    # 36 weather scenarios = 3 C3S climate models x projection years 2025-2036 (PECD 4.1)
    "weather_scenarios_mapping": ("ERAA_2025_PECDWeather.zip",
                                  "PECD - weather/WeatherScenarios_Mapping.xlsx"),
}


class _Ranged(io.RawIOBase):
    """A seekable read-only view of a remote file; every read is one HTTP range request."""

    def __init__(self, get, size: int):
        self.get, self.size, self.pos = get, size, 0

    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.pos

    def seek(self, off, whence=0):
        self.pos = {0: off, 1: self.pos + off, 2: self.size + off}[whence]
        return self.pos

    def readinto(self, b):
        n = min(len(b), self.size - self.pos)
        if n <= 0:
            return 0
        data = self.get(self.pos, self.pos + n - 1)
        b[:len(data)] = data
        self.pos += len(data)
        return len(data)


def zip_member(get, size: int, member: str) -> bytes:
    """The bytes of `member` from a zip of `size` bytes, read through `get(start, end)`."""
    with zipfile.ZipFile(io.BufferedReader(_Ranged(get, size), 1 << 16)) as z:
        return z.read(member)


def _http_range(url: str):
    def get(start: int, end: int) -> bytes:
        r = requests.get(url, headers={"Range": f"bytes={start}-{end}"}, timeout=300)
        if r.status_code != 206:
            raise RuntimeError(f"{url}: no range support (HTTP {r.status_code})")
        return r.content
    return get


def fetch(item: str) -> Path:
    name = FILES[item]
    return cached_get(raw=RAW, dataset=f"eraa2025.{item}", ext=name.rsplit(".", 1)[-1].lower(),
                      url=BASE + name, params={"page": PAGE, "file": name}, source=SOURCE,
                      licence=LICENCE, timeout=1800)


def fetch_member(item: str) -> Path:
    package, member = MEMBERS[item]
    url, dataset = BASE + package, f"eraa2025.{item}"
    ext = member.rsplit(".", 1)[-1].lower()
    params = {"page": PAGE, "file": package, "member": member}
    from . import raw_dir
    if (raw_dir(RAW) / f"{dataset}.{ext}").exists():         # idempotent, no request
        return raw_dir(RAW) / f"{dataset}.{ext}"
    size = int(requests.head(url, timeout=60).headers["Content-Length"])
    return cached_get(raw=RAW, dataset=dataset, ext=ext, url=url, params=params, source=SOURCE,
                      licence=LICENCE, content=zip_member(_http_range(url), size, member),
                      notes=f"member {member!r} of {package} ({size} bytes), read by HTTP range")


# ERAA market nodes -> model zones, for the NTC profiles. Poland's synchronous borders pass the
# virtual nodes PLE0 (export) and PLI0 (import) (D-072): PLE0 is Poland only as a sending node
# and PLI0 only as a receiving one; the columns the other way round are 0 MW in every hour, and
# PL00-PLE0 / PLI0-PL00 are the joint limit (`sync_profile_max`), constant at 3 000 MW. ERAA's
# southern Norway node is NOS1, not mapped: SE3-NO1 comes from TYNDP's reference grid (D-070).
NTC_NODE = {"EE00": "EE", "LV00": "LV", "LT00": "LT", "FI00": "FI", "SE01": "SE1",
            "SE02": "SE2", "SE03": "SE3", "SE04": "SE4", "PL00": "PL", "NON1": "NO4",
            "NOM1": "NO3", "DKE1": "DK2", "DKW1": "DK1", "DE00": "DE", "CZ00": "CZ", "SK00": "SK"}
NTC_FROM, NTC_TO = {**NTC_NODE, "PLE0": "PL"}, {**NTC_NODE, "PLI0": "PL"}
NTC_SHEETS = ("HVAC", "HVDC")
NTC_MEMBER = re.compile(r"NTCs/NTCs Consolidated TY(\d{4})\.xlsx$")
HOURS = 8760


def ntc_profiles(path: Path, borders) -> pd.DataFrame:
    """The hourly NTC of each of `borders` (codes A-B) per direction and target year, out of the
    NTC package: columns border, direction (fwd = A->B), target_year, hour (1..8760), mw. The
    HVAC and HVDC columns of one border and direction add up. A leap target year (2028, 8 784
    rows) loses 29 February, so hour h falls on the same calendar day in every target year and
    in the model's 2018 calendar (as E-048 did for temperature); the others have 8 760 rows."""
    import openpyxl
    borders = set(borders)
    frames = []
    with zipfile.ZipFile(path) as z:
        for name in sorted(z.namelist()):
            m = NTC_MEMBER.match(name)
            if not m:
                continue
            wb = openpyxl.load_workbook(io.BytesIO(z.read(name)), read_only=True, data_only=True)
            acc: dict[tuple[str, str], np.ndarray] = {}
            for sheet in NTC_SHEETS:
                rows = list(wb[sheet].iter_rows(values_only=True))
                head = {r[0]: i for i, r in enumerate(rows[:30]) if r and r[0]}
                frm, to = rows[head["From:"]], rows[head["To:"]]
                data = [r for r in rows[head["Date"] + 1:]
                        if isinstance(r[1], (int, float)) and r[0] != "29.02."]
                if len(data) != HOURS:
                    raise ValueError(f"{name} {sheet}: {len(data)} hours, not {HOURS}")
                for j in range(2, len(frm)):
                    a, b = NTC_FROM.get(frm[j]), NTC_TO.get(to[j])
                    key = ((f"{a}-{b}", "fwd") if f"{a}-{b}" in borders else
                           (f"{b}-{a}", "rev") if f"{b}-{a}" in borders else None)
                    if key is None:
                        continue
                    mw = np.array([r[j] for r in data], dtype=float)
                    if np.isnan(mw).any():
                        raise ValueError(f"{name} {sheet} {frm[j]}-{to[j]}: empty hours")
                    acc[key] = acc.get(key, 0.0) + mw
            wb.close()
            frames += [pd.DataFrame({"border": b, "direction": d, "target_year": int(m[1]),
                                     "hour": range(1, HOURS + 1), "mw": mw})
                       for (b, d), mw in sorted(acc.items())]
    return pd.concat(frames, ignore_index=True)
