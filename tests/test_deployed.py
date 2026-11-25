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


def test_the_way_in_without_the_password_goes_as_its_cookie(monkeypatch):
    """E-175: `make deploy` checks through D-179's cookie when the password is not at hand."""
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
    monkeypatch.setenv("DEPLOY_SSO", "ab" * 32)
    deployed.fetch("https://v5.example/data/manifest.json", None)
    assert sent[0] == {"Cookie": "energiamudel_sso=" + "ab" * 32}
    monkeypatch.delenv("DEPLOY_SSO")
    deployed.fetch("https://v5.example/data/manifest.json", "u:p")
    assert "Cookie" not in sent[1] and sent[1]["Authorization"].startswith("Basic ")


def test_every_file_of_the_build_is_served_as_built(tmp_path):
    """The build's files fetched one by one: .htaccess (the token on the server, E-177) and
    sso.php (run by the server) left out, a file served otherwise or not at all named."""
    from urllib.error import HTTPError

    built = {"index.html": b"page", "data/a.json": b"a", "data/b.json": b"b", "gone.js": b"g",
             ".htaccess": b"rules", "sso.php": b"<?php"}
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
