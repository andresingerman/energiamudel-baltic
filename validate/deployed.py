"""R-DEP-5: after a deploy, the deployed site against the build.

`python -m validate.deployed <site url>` fetches <site>/data/manifest.json — with DEPLOY_AUTH
(user:password, from the environment) where a site sits behind Basic Auth (D-085, and again
since D-178), or with DEPLOY_SSO, the token of the way in without the password (D-179), sent as
the cookie sso.php would set; `make deploy` reads it over ssh so that the check needs no password
(ERRATA E-175) — and exits 1 unless its SHA-256 equals that of data/export/manifest.json.
Then every file of the build in app/dist as the site serves it, byte for byte, and the site's
answer to a reader with neither the password nor the cookie, 200 since the site opened again
(D-318; 401 while it was shut, D-178): the checks the deploys
of 2026-10-27 to 2026-11-11 ran from a script of their own. The lines it prints are the deploy
log's record. The token is never printed.
"""

from __future__ import annotations

import base64
import hashlib
import os
import sys
from collections.abc import Callable
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / "data" / "export" / "manifest.json"
DIST = ROOT / "app" / "dist"


def fetch(url: str, auth: str | None) -> bytes:
    req = Request(url)
    if auth:
        req.add_header("Authorization", "Basic " + base64.b64encode(auth.encode()).decode())
    if sso := os.environ.get("DEPLOY_SSO"):  # the cookie's value is the token itself: never printed
        req.add_header("Cookie", f"energiamudel_sso={sso}")
    with urlopen(req, timeout=30) as r:
        return r.read()


def check(site: str, auth: str | None = None, local: Path = LOCAL,
          get: Callable[[str, str | None], bytes] = fetch) -> tuple[bool, str]:
    want = hashlib.sha256(local.read_bytes()).hexdigest()
    got = hashlib.sha256(get(site.rstrip("/") + "/data/manifest.json", auth)).hexdigest()
    sign = "=" if got == want else "!="
    return got == want, f"deployed manifest {got} {sign} build {want} ({site})"


def differing(site: str, auth: str | None = None, dist: Path = DIST,
              get: Callable[[str, str | None], bytes] = fetch) -> tuple[int, list[str]]:
    """The build's files and those of them the site does not serve as built: every file of
    app/dist but .htaccess, which holds the token on the server (ERRATA E-177), and sso.php,
    which the server runs."""
    files = [p for p in sorted(dist.rglob("*"))
             if p.is_file() and p.name != ".htaccess" and p.suffix != ".php"]
    bad = []
    for p in files:
        rel = p.relative_to(dist).as_posix()
        try:
            same = get(f"{site.rstrip('/')}/{rel}", auth) == p.read_bytes()
        except HTTPError:
            same = False
        if not same:
            bad.append(rel)
    return len(files), bad


def answer(site: str) -> int:
    """The status the site gives a reader with neither the password nor the cookie."""
    try:
        with urlopen(site, timeout=30) as r:
            return int(r.status)
    except HTTPError as e:
        return e.code


if __name__ == "__main__":
    site, auth = sys.argv[1], os.environ.get("DEPLOY_AUTH")
    ok, line = check(site, auth)
    print(line)
    n, bad = differing(site, auth)
    print(f"deployed files: {n} of the build, "
          + (f"{len(bad)} not as built: {', '.join(bad)}" if bad else "every one as built"))
    status = answer(site)
    print(f"without the password or the cookie: {status} (open, D-318)")
    sys.exit(0 if ok and not bad and status == 200 else 1)
