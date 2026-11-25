"""R-DEP-5: after a deploy, the deployed site against the build.

`python -m validate.deployed <site url>` fetches <site>/data/manifest.json — with DEPLOY_AUTH
(user:password, from the environment) where a site sits behind Basic Auth (D-085, D-178) — and
exits 1 unless its SHA-256 equals that of data/export/manifest.json. Then every file of the
build in app/dist as the site serves it, byte for byte; the site's answer to a reader without
a password, 200 since the site opened again (D-318; 401 while it was shut, D-178); and the
security headers the site sends with its page (D-331). The lines it prints are the deploy
log's record. The way in without the password and its token (D-179) went with sso.php (D-331).
"""

from __future__ import annotations

import base64
import hashlib
import os
import sys
from collections.abc import Callable
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / "data" / "export" / "manifest.json"
DIST = ROOT / "app" / "dist"


def fetch(url: str, auth: str | None) -> bytes:
    req = Request(url)
    if auth:
        req.add_header("Authorization", "Basic " + base64.b64encode(auth.encode()).decode())
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
    app/dist but .htaccess, which the server reads and does not serve."""
    files = [p for p in sorted(dist.rglob("*")) if p.is_file() and p.name != ".htaccess"]
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


# what the site tells a browser about itself (app/public/.htaccess, D-331), each by a word its
# value must hold
HEADERS = {"Strict-Transport-Security": "max-age=", "X-Content-Type-Options": "nosniff",
           "X-Frame-Options": "DENY", "Referrer-Policy": "strict-origin"}


def answer(site: str, get: Callable[..., Any] = urlopen) -> tuple[int, list[str]]:
    """The status the site gives a reader without a password, and the security headers of
    HEADERS its page comes without."""
    try:
        with get(site, timeout=30) as r:
            sent = r.headers
            missing = [h for h, want in HEADERS.items() if want not in (sent.get(h) or "")]
            return int(r.status), missing
    except HTTPError as e:
        return e.code, list(HEADERS)


if __name__ == "__main__":
    site, auth = sys.argv[1], os.environ.get("DEPLOY_AUTH")
    ok, line = check(site, auth)
    print(line)
    n, bad = differing(site, auth)
    print(f"deployed files: {n} of the build, "
          + (f"{len(bad)} not as built: {', '.join(bad)}" if bad else "every one as built"))
    status, missing = answer(site)
    print(f"without a password: {status} (open, D-318)")
    sent = f"missing {', '.join(missing)}" if missing else f"all {len(HEADERS)} sent"
    print(f"security headers: {sent} (D-331)")
    sys.exit(0 if ok and not bad and status == 200 and not missing else 1)
