"""The built site in real browsers: what `make ci` cannot see, because Node has no page, no workers and no IndexedDB.
Found wanting on 2026-11-10, when a browser's store that did not answer left the live page at "computing…" (ERRATA
E-191). Serves a built site with its computed sets under the site's own caching (app/public/.htaccess) and checks, in
Chromium and in WebKit:

1. a store that never opens, and one whose requests never answer: the opening state's sensitivities still come in,
   and a change still computes (E-191); a store that opens three seconds late is used once it has opened (E-192);
2. the store's round trip: a validation year the site holds comes without a run; one it does not hold is computed
   once, kept, and read back after a reload; `?nostore` computes again and writes nothing (D-232, D-237);
3. every view of the header shown, with text and nothing left computing — the Presentation page and its charts' checks
   (D-235, D-238) went with the page (D-249);
4. no page error anywhere.

    python3 -I spikes/page-speed/browser_check.py [built site, default app/dist]      BROWSERS="chromium webkit"
    DEPLOY_SSO=<token> python3 -I spikes/page-speed/browser_check.py https://energiamudel.ee

Given an address, it checks that site as deployed instead, through the way in without the password (D-179): the
token in DEPLOY_SSO, sent as the cookie, never printed. `make live-check` runs it so after a deploy, as the deploys
of 2026-10-27 to 2026-11-11 checked their live pages from a script of their own.

The site must hold its sets: `cd app && npm run build && node --no-maglev scripts/opening.ts`. Needs a Python with
Playwright and its browsers (`make browser-check` names it). About a minute on a quiet machine; exits 1 when a check
fails. The limits are two minutes, for a hang and not for a time: on 2026-11-10 Playwright's WebKit, starved by other
work on the machine, took 16–30 s and once over 60 s for what takes two — the deployed build and the working tree
alike — so a failure in WebKit alone is first run again on a quiet machine."""
import email.utils
import http.server
import os
import sys
import threading
import time

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = sys.argv[1] if len(sys.argv) > 1 else f"{HERE}/../../app/dist"
LIVE = TARGET.startswith(("http://", "https://"))
ROOT = os.path.abspath(TARGET)
PROBE = open(f"{HERE}/probe.js").read()
BROWSERS = os.environ.get("BROWSERS", "chromium webkit").split()
SSO = os.environ.get("DEPLOY_SSO")  # the cookie's value is the token itself: never printed
if not LIVE and not os.path.exists(f"{ROOT}/data/sets.json.gz"):
    sys.exit(f"{ROOT} holds no computed sets: cd app && npm run build && node --no-maglev scripts/opening.ts")


class Site(http.server.SimpleHTTPRequestHandler):
    """The site's caching: hashed assets immutable, the page and the data files revalidated on every load."""

    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        p = self.path.split("?")[0]
        if p.endswith((".js", ".css", ".wasm", ".woff2", ".woff")):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        elif p.endswith((".html", ".json", ".json.gz", ".bin.gz", "/")):
            self.send_header("Cache-Control", "no-cache, must-revalidate")
        self.send_header("Date", email.utils.formatdate(usegmt=True))
        super().end_headers()

    def log_message(self, *a):
        pass


if LIVE:
    server, URL = None, TARGET.rstrip("/") + "/"
else:
    # a backlog of 5 (the module's default) reset Chromium's bursts of requests now and then, and a reset index of the
    # build's sets left the page computing what the build holds (ERRATA E-201); a real server queues far more
    http.server.ThreadingHTTPServer.request_queue_size = 128
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Site)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    URL = f"http://127.0.0.1:{server.server_address[1]}/"

SILENT_OPEN = "IDBFactory.prototype.open = function () { return {}; };"
SILENT_REQUESTS = """(() => { const tx = IDBDatabase.prototype.transaction; IDBDatabase.prototype.transaction = function (...a) { const t = tx.apply(this, a);
  const os = t.objectStore.bind(t); t.objectStore = (n) => { const s = os(n); s.get = () => ({}); s.put = () => ({}); return s; }; return t; }; })();"""
LATE_OPEN = """(() => { const open = IDBFactory.prototype.open; IDBFactory.prototype.open = function (...a) { const fake = {}, self = this;
  setTimeout(() => { const r = open.apply(self, a);
    for (const k of ['onupgradeneeded', 'onsuccess', 'onerror', 'onblocked']) r[k] = (e) => { try { fake.result = r.result; } catch { /* none yet */ } fake[k]?.(e); }; }, 3000);
  return fake; }; })();"""
STATUS = "document.getElementById('status').textContent"
SENS_IN = "!/…/.test(document.getElementById('sens').textContent || '…')"
CARDS = "document.getElementById('cards')?.firstElementChild"
RUN = "document.querySelector('#panel button[data-set=\"run\"]').click()"
# a year the site does not hold: 2022 since D-253, whose replay of 2026 the build computes with the gate years'
YEAR_OFF = "document.querySelector('#panel button[data-set=\"year\"][data-v=\"2022\"]').click()"
STORE = """() => new Promise((res) => { const r = indexedDB.open('energiamudel-sets');
  r.onsuccess = () => { const db = r.result, names = [...db.objectStoreNames], out = { version: db.version, stores: names, sets: 0, bytes: [] };
    if (!names.includes('meta')) { db.close(); return res(out); }
    const tx = db.transaction(['sets', 'meta']);
    tx.objectStore('sets').count().onsuccess = (e) => { out.sets = e.target.result; };
    tx.objectStore('meta').getAll().onsuccess = (e) => { out.bytes = e.target.result.map((m) => m.bytes); };
    out.y2022 = []; tx.objectStore('meta').openCursor().onsuccess = (e) => { const c = e.target.result; if (c) { if (String(c.key).split(String.fromCharCode(10)).includes('year=2022')) out.y2022.push(c.value.bytes); c.continue(); } };
    tx.oncomplete = () => { db.close(); res(out); }; };
  r.onerror = () => res({ error: String(r.error) }); })"""
view = lambda v: f"document.querySelector('header .views button[data-view=\"{v}\"]').click()"
# a view is shown when it has text and no element of it says only "computing…", as a figure still to come does; the
# documentation quotes the word in its prose
SHOWN = "(v) => { const e = document.getElementById(v); return !e.hidden && e.innerText.length > 100 && ![...e.querySelectorAll('*')].some((x) => !x.childElementCount && x.textContent.trim() === 'computing…'); }"
years = lambda rec: sum(1 for j in rec["jobs"] if j["kind"] in ("finish", "whole") and j["t1"] is not None)

failures = []


def need(ok, what, got=None):
    print(f"  {'ok  ' if ok else 'FAIL'} {what}" + ("" if ok or got is None else f": {str(got)[:240]}"), flush=True)
    if not ok:
        failures.append(what)


def page(browser, script=None):
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    if SSO:
        ctx.add_cookies([{"name": "energiamudel_sso", "value": SSO, "url": URL}])
    ctx.add_init_script(PROBE)
    if script:
        ctx.add_init_script(script)
    p = ctx.new_page()
    errors = []
    p.on("pageerror", lambda e: errors.append(str(e)[:200]))
    return ctx, p, errors


with sync_playwright() as pw:
    for name in BROWSERS:
        print(f"{name}", flush=True)
        b = getattr(pw, name).launch()

        # 1. a store that does not answer
        for label, script in (("a store that never opens", SILENT_OPEN), ("a store whose requests never answer", SILENT_REQUESTS)):
            ctx, p, errors = page(b, script)
            t0 = time.time()
            p.goto(URL)
            p.wait_for_function(CARDS, timeout=120000)
            try:
                p.wait_for_function(SENS_IN, timeout=120000)  # a hang is looked for, not a time
                need(True, f"{label}: the sensitivities in after {time.time() - t0:.1f} s")
            except Exception:
                need(False, f"{label}: the sensitivities stay at computing")
            p.evaluate(RUN)
            p.wait_for_function(f"/^the year computed|one year in/.test({STATUS})", timeout=120000)
            p.evaluate(YEAR_OFF)
            try:
                p.wait_for_function(f"/one year in/.test({STATUS})", timeout=90000)
                need(True, f"{label}: a change computes")
            except Exception:
                need(False, f"{label}: a change computes", p.evaluate(STATUS))
            need(not errors, f"{label}: no page error", errors)
            ctx.close()

        # a store that opens after the page has stopped waiting for it is used from then on (E-192)
        ctx, p, errors = page(b, LATE_OPEN)
        p.goto(URL)
        p.wait_for_function(f"{CARDS} && {SENS_IN}", timeout=120000)
        time.sleep(4.0)
        p.evaluate(RUN)
        p.wait_for_function(f"/^the year computed|one year in/.test({STATUS})", timeout=120000)
        p.evaluate(YEAR_OFF)
        p.wait_for_function(f"/one year in/.test({STATUS})", timeout=120000)
        for _ in range(8):
            st = p.evaluate(STORE)
            if st.get("y2022"):
                break
        need(len(st.get("y2022", [])) == 1, "a store that opens late: a year computed after it opened is kept", st)
        need(not errors, "a store that opens late: no page error", errors)
        ctx.close()

        # 2. the store's round trip
        ctx, p, errors = page(b)
        p.goto(URL)
        p.wait_for_function(f"{CARDS} && {SENS_IN}", timeout=120000)
        need("when the site was built" in p.evaluate(STATUS), "the opening view from the build's sets", p.evaluate(STATUS))
        p.evaluate("window.__probe.take()")
        p.evaluate(RUN)
        p.wait_for_function(f"/^the year computed|one year in/.test({STATUS})", timeout=120000)
        need(p.evaluate(STATUS).startswith("the year computed by the engine of record when the site was built") and years(p.evaluate("window.__probe.take()")) == 0,
             "a validation year the site holds comes without a run", p.evaluate(STATUS))
        p.evaluate(YEAR_OFF)
        p.wait_for_function(f"/one year in/.test({STATUS})", timeout=120000)
        for _ in range(60):  # the write follows the status line; a slow engine takes its time over it
            st = p.evaluate(STORE)
            if st.get("y2022"):
                break
            time.sleep(0.5)
        # the year's own set, by its key: the opening's sensitivities, run in the background, may be stored meanwhile (a
        # race the check lost on a fast machine, the night of 2026-11-24)
        need(years(p.evaluate("window.__probe.take()")) == 1 and len(st.get("y2022", [])) == 1 and st["y2022"][0] > 100000, "a year the site does not hold is computed once and kept", st)
        p.reload()
        p.wait_for_function(f"window.__probe && /^the year computed|one year in/.test({STATUS})", timeout=120000)
        need("in this browser before" in p.evaluate(STATUS) and years(p.evaluate("window.__probe.take()")) == 0, "after a reload the year comes from the store", p.evaluate(STATUS))
        u = p.url
        p.goto(u.replace("/#", "/?nostore#") if "/#" in u else u + "?nostore")
        p.wait_for_function(f"window.__probe && /^the year computed|one year in/.test({STATUS})", timeout=120000)
        time.sleep(0.5)
        rec = p.evaluate("window.__probe.take()")
        need("one year in" in p.evaluate(STATUS) and years(rec) == 1 and not any(x["op"] == "put" for x in rec["idb"]), "?nostore computes again and writes nothing", p.evaluate(STATUS))
        need(not errors, "the store's round trip: no page error", errors)
        ctx.close()

        # 3. every view of the header but the Model view, which the checks above hold, shown in turn
        ctx, p, errors = page(b)
        p.goto(URL)
        p.wait_for_function(f"{CARDS} && {SENS_IN}", timeout=120000)
        stuck = []
        for v in p.evaluate("[...document.querySelectorAll('header .views button')].map((b) => b.dataset.view).filter((v) => document.getElementById(v))"):
            p.evaluate(view(v))
            try:
                p.wait_for_function(SHOWN, arg=v, timeout=120000)
            except Exception:
                stuck.append(v)
        need(not stuck, "every view shown, nothing left computing", stuck)
        need(not errors, "every view: no page error", errors)
        ctx.close()
        b.close()

if server:
    server.shutdown()
print("BROWSER CHECK PASS" if not failures else f"BROWSER CHECK FAILED: {len(failures)}")
sys.exit(1 if failures else 0)
