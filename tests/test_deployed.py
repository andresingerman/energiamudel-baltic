"""R-DEP-5: the deployed manifest is compared with the build's."""

import validate.deployed as deployed
from validate.deployed import check


def test_the_deployed_manifest_must_be_the_builds(tmp_path):
    local = tmp_path / "manifest.json"
    local.write_bytes(b'{"export": "abc"}')
    seen = []

    def served(body):
        def get(url, auth):
            seen.append((url, auth))
            return body
        return get

    ok, line = check("https://v5.example/", "u:p", local, served(b'{"export": "abc"}'))
    assert ok and " = build " in line
    assert seen[0] == ("https://v5.example/data/manifest.json", "u:p")
    ok, line = check("https://v5.example", None, local, served(b'{"export": "old"}'))
    assert not ok and " != build " in line


def test_a_fetch_sends_the_password_where_given_and_no_cookie(monkeypatch):
    """The open site is fetched as any reader fetches it; DEPLOY_AUTH logs in where a site is
    shut (D-331)."""
    sent = []

    class Served:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def read(self):
            return b"{}"

    def urlopen(req, timeout):
        sent.append(dict(req.header_items()))
        return Served()

    monkeypatch.setattr(deployed, "urlopen", urlopen)
    deployed.fetch("https://v5.example/data/manifest.json", None)
    assert sent[0] == {}  # no cookie since the way in without the password went (D-331)
    deployed.fetch("https://v5.example/data/manifest.json", "u:p")
    assert "Cookie" not in sent[1] and sent[1]["Authorization"].startswith("Basic ")


def test_every_file_of_the_build_is_served_as_built(tmp_path):
    """The build's files fetched one by one: .htaccess, which the server does not serve, left
    out, a file served otherwise or not at all named."""
    from urllib.error import HTTPError

    built = {"index.html": b"page", "data/a.json": b"a", "data/b.json": b"b", "gone.js": b"g",
             ".htaccess": b"rules"}
    for name, body in built.items():
        (tmp_path / name).parent.mkdir(exist_ok=True)
        (tmp_path / name).write_bytes(body)
    served = {"index.html": b"page", "data/a.json": b"a", "data/b.json": b"old"}

    def get(url, auth):
        rel = url.removeprefix("https://v5.example/")
        if rel not in served:
            raise HTTPError(url, 404, "Not Found", {}, None)  # type: ignore[arg-type]
        return served[rel]

    n, bad = deployed.differing("https://v5.example/", None, tmp_path, get)
    assert (n, bad) == (4, ["data/b.json", "gone.js"])


def test_the_site_must_send_its_security_headers():
    """D-331: the status a reader gets, and the headers of .htaccess the page comes without."""

    class Page:
        status = 200

        def __init__(self, headers):
            self.headers = headers

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    def served(headers):
        return lambda site, timeout: Page(headers)

    full = {"Strict-Transport-Security": "max-age=31536000", "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY", "Referrer-Policy": "strict-origin-when-cross-origin"}
    assert deployed.answer("https://v5.example", served(full)) == (200, [])
    assert deployed.answer("https://v5.example", served({})) == (200, list(deployed.HEADERS))
    # a header with another value is as good as none: frame options that allow the site's own
    other = {**full, "X-Frame-Options": "SAMEORIGIN"}
    assert deployed.answer("https://v5.example", served(other)) == (200, ["X-Frame-Options"])
