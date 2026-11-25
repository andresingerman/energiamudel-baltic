"""What the page computes, fetches and reads from its store on each step of a reader's journey — and what of it
it had computed before in the same session (the same year of the same engine input). The page is not changed: probe.js
is injected before its scripts. Usage (system Python 3.13 with Playwright):

    python3 -I journeys.py <url> <out.json> [journey ...]     BROWSER=chromium|webkit, LANG_=en|et

A journey is a fresh browser profile; its steps run in order and each waits until nothing computes, fetches or
answers for a second. Per step: seconds to the scenario shown, to the table, to the sensitivities and to idle;
year-runs completed and how many of them repeat an input computed earlier in the journey; year-runs abandoned
(superseded or cancelled mid-way) with the worker seconds they took; worker seconds in all; the page's fetches, its
store's hits and misses, the JSON decoded and the main thread's long tasks."""
import json
import os
import sys
import time
from collections import Counter, defaultdict

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
PROBE = open(f"{HERE}/probe.js").read()
URL = sys.argv[1].rstrip("/") + "/"
OUT = sys.argv[2]
ONLY = sys.argv[3:]
BROWSER = os.environ.get("BROWSER", "chromium")

# in the page: clear the status line, do the step, then watch for the scenario shown, the table and the sensitivities
WATCH = """async ([js, expectRun, fresh]) => {
  const P = window.__probe, status = document.getElementById('status'), sens = document.getElementById('sens');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  if (fresh) P.take();
  if (expectRun) status.textContent = '';
  const t0 = fresh ? performance.now() : 0;
  await (0, eval)(js);
  const out = { t0, shown: null, table: null, sens: null, view: null, idle: null };
  // the Presentation page or the deck, when one of them is shown: in once nothing on it says it is computing
  const page = () => [document.getElementById('presentation'), document.getElementById('deck')].find((e) => e && !e.hidden);
  const pending = () => /computing…|arvutatakse…/.test(page()?.textContent || '');
  const st = () => status.textContent || '';
  const done = () => /years? in [\\d.,]+ s|computed by the engine of record|aasta(t)? [\\d.,]+ s|arvutas arvestusmootor|arvutatud/.test(st());
  const first = () => done() || /scenario shown is in|näidatav stsenaarium on valmis/.test(st());
  const tick = async () => {
    for (;;) {
      const now = performance.now();
      if (expectRun) {
        if (out.shown === null && first()) out.shown = now - t0;
        if (out.table === null && done()) out.table = now - t0;
        if (out.table !== null && out.sens === null && !/…/.test(sens.textContent || '')) out.sens = now - t0;
      }
      if (page() && now - t0 > 150 && (!expectRun || out.table !== null)) { if (pending()) out.view = null; else if (out.view === null) out.view = now - t0; }
      const chip = document.getElementById('computing');
      const busy = P.open > 0 || P.fetching > 0 || (chip && !chip.hidden) || (expectRun && out.table === null);
      if (!busy && now - Math.max(P.last, t0) >= 1000) { out.idle = Math.max(P.last, t0) - t0; return; }
      if (now - t0 > 900000) throw new Error('not idle after 15 min: ' + st());
      await sleep(20);
    }
  };
  await tick();
  return { ...out, status: st(), cardsAt: P.cardsAt ?? null, ...P.take() };
}"""

SET = """(k, v) => { const el = document.querySelector(`#panel input[type=range][data-k="${k}"]`); if (!el) throw new Error('no slider ' + k);
  el.dispatchEvent(new Event('pointerdown', { bubbles: true })); el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }"""
slider = lambda k, v: f"({SET})({json.dumps(k)}, {json.dumps(v)})"
click = lambda sel: f"(() => {{ const el = document.querySelector({json.dumps(sel)}); if (!el) throw new Error('no ' + {json.dumps(sel)}); el.dispatchEvent(new MouseEvent('click', {{ bubbles: true, cancelable: true }})); }})()"
view = lambda v: click(f'header .views button[data-view="{v}"]')
RELOAD = "__reload__"


class Journey:
    def __init__(self, pw, name):
        self.name = name
        self.browser = getattr(pw, BROWSER).launch()
        self.ctx = self.browser.new_context(viewport={"width": 1440, "height": 900})
        self.ctx.add_init_script(PROBE)
        self.pg = self.ctx.new_page()
        self.errors = []
        self.pg.on("pageerror", lambda e: self.errors.append(str(e)[:200]))
        self.done = Counter()      # (set, year) → year-runs completed so far in the journey
        self.steps = []
        self.states = {}

    def open(self, url=URL, label="open"):
        t0 = time.time()
        self.pg.goto(url)
        self.pg.wait_for_function("window.__probe && document.getElementById('status')?.textContent.length > 0", timeout=120000)
        # the navigation's own clock: the page's performance.now() starts at the navigation
        rec = self.pg.evaluate(WATCH, ["0", False, False])
        rec["shown"] = rec["cardsAt"]
        return self._sum(label, rec, wall=time.time() - t0)

    def step(self, label, js, run=True):
        if js == RELOAD:
            self.pg.reload()
            self.pg.wait_for_function("window.__probe && document.getElementById('status')?.textContent.length > 0", timeout=120000)
            rec = self.pg.evaluate(WATCH, ["0", False, False])
            rec["shown"] = rec["cardsAt"]
            return self._sum(label, rec)
        rec = self.pg.evaluate(WATCH, [js, run, True])
        return self._sum(label, rec)

    def _sum(self, label, rec, wall=None):
        t0 = rec["t0"]
        jobs = rec["jobs"]
        years = defaultdict(list)
        for j in jobs:
            if j["kind"] in ("first", "second", "finish", "whole"):
                years[(j.get("set"), j["key"], j["tag"])].append(j)
        completed, repeats, abandoned, wasted = 0, 0, 0, 0.0
        by_tag = Counter()
        for (st, key, tag), js in years.items():
            ended = [j for j in js if j["kind"] in ("finish", "whole") and j["t1"] is not None and not j["err"]]
            busy = sum((j["t1"] or rec["now"]) - j["t0"] for j in js) / 1000
            n = len(ended)
            completed += n
            by_tag[tag or "table"] += n
            # the same year of the same input, computed before in this journey — or twice within the step
            before = self.done[(st, key)]
            repeats += max(0, n - (0 if before else 1)) if n else 0
            self.done[(st, key)] += n
            firsts = sum(1 for j in js if j["kind"] == "first" and j["k"] == 0)
            if firsts > n:
                abandoned += firsts - n
                wasted += busy * (firsts - n) / max(firsts, 1)
        busy_all = sum(((j["t1"] or rec["now"]) - j["t0"]) for j in jobs if j["kind"] != "warm") / 1000
        fetches = [f for f in rec["fetches"]]
        s = {
            "step": label,
            "shown_s": None if rec.get("shown") is None else round(rec["shown"] / 1000, 2),
            "table_s": None if rec.get("table") is None else round(rec["table"] / 1000, 2),
            "sens_s": None if rec.get("sens") is None else round(rec["sens"] / 1000, 2),
            "view_s": None if rec.get("view") is None else round(rec["view"] / 1000, 2),
            "idle_s": None if rec.get("idle") is None else round(rec["idle"] / 1000, 2),
            "year_runs": completed, "by_tag": dict(by_tag), "repeated": repeats, "abandoned": abandoned, "wasted_worker_s": round(wasted, 1),
            "worker_s": round(busy_all, 1), "samples": sum(1 for j in jobs if j["kind"] == "sample"),
            "fetches": len(fetches), "fetch_mb": round(sum(f["len"] or 0 for f in fetches) / 1e6, 2),
            "sets_fetched": sum(1 for f in fetches if "/sets/" in f["url"]),
            "idb_hit": sum(1 for x in rec["idb"] if x["op"] == "get" and x["hit"]), "idb_miss": sum(1 for x in rec["idb"] if x["op"] == "get" and not x["hit"]),
            "idb_put": sum(1 for x in rec["idb"] if x["op"] == "put"),
            "parse_ms": round(sum(x["d"] for x in rec["parse"])), "long_ms": round(sum(x["d"] for x in rec["long"])), "long_max_ms": round(max([x["d"] for x in rec["long"]] or [0])),
            "status": rec.get("status", "")[:110],
        }
        if wall is not None:
            s["wall_s"] = round(wall, 2)
        self.steps.append(s)
        print(f"  {label:44s} shown {s['shown_s']} table {s['table_s']} sens {s['sens_s']} view {s['view_s']} idle {s['idle_s']} | years {completed} {dict(by_tag)} repeated {repeats} abandoned {abandoned} ({s['wasted_worker_s']} s) worker {s['worker_s']} s | fetch {s['fetches']} ({s['fetch_mb']} MB, sets {s['sets_fetched']}) idb {s['idb_hit']}/{s['idb_miss']}/{s['idb_put']} parse {s['parse_ms']} long {s['long_ms']} ms", flush=True)
        return s

    def close(self):
        self.browser.close()
        return {"journey": self.name, "errors": self.errors, "steps": self.steps}


def j_open(j):
    j.open()
    j.step("reload", RELOAD)


def j_change(j):
    """One control moved, moved back, moved again; three more values and back to the first."""
    j.open()
    j.step("FI level 1.50", slider("FI.level", 1.5))
    j.step("FI level back to its default", slider("FI.level", 1.88))
    j.step("FI level 1.50 again", slider("FI.level", 1.5))
    j.step("FI level 1.60", slider("FI.level", 1.6))
    j.step("FI level 1.70", slider("FI.level", 1.7))
    j.step("FI level 1.50 a third time", slider("FI.level", 1.5))
    j.step("FI level 1.60 again", slider("FI.level", 1.6))
    j.step("reload on FI level 1.60", RELOAD)


def j_chips(j):
    """The scenario shown changed while the sensitivities compute."""
    j.open()
    j.step("wind 1500 MW, then 2 SMR shown at the table", slider("EE.mw.wind_onshore", 1500) + "; (async () => { const s = document.getElementById('status'); for (;;) { if (/years in/.test(s.textContent)) break; await new Promise(r => setTimeout(r, 20)); } document.querySelector('#cards button[data-scenario=\"smr2\"]').click(); await new Promise(r => setTimeout(r, 1500)); document.querySelector('#cards button[data-scenario=\"smr3\"]').click(); })()")
    j.step("0 SMR shown again", click('#cards button[data-scenario="gas"]'), run=False)


def j_pres(j):
    """The Presentation page on a changed state, left and shown again, the state changed and changed back."""
    j.open()
    j.step("Presentation shown (opening state)", view("presentation"), run=False)
    j.step("Model shown", view("model"), run=False)
    j.step("solar 2000 MW", slider("EE.mw.solar", 2000))
    j.step("Presentation shown (solar 2000)", view("presentation"), run=False)
    j.step("Model shown", view("model"), run=False)
    j.step("Presentation shown again", view("presentation"), run=False)
    j.step("solar back to 2500 on the Presentation page", slider("EE.mw.solar", 2500))
    j.step("solar 2000 again on the Presentation page", slider("EE.mw.solar", 2000))
    j.step("reload (Presentation, solar 2000)", RELOAD)


def j_presprio(j):
    """A control moved on the Presentation page and on the deck: how long until the page shown is whole."""
    j.open()
    j.step("Presentation shown (opening state)", view("presentation"), run=False)
    j.step("FI level 1.50 on the Presentation page", "(() => { const el = document.querySelector('#presentation input[data-pres-level=\"FI\"]'); el.dispatchEvent(new Event('pointerdown', { bubbles: true })); el.value = '1.5'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); })()")
    j.step("deck shown (FI level 1.50)", view("deck"), run=False)
    j.step("Model shown", view("model"), run=False)
    # the cables' slide, which says "computing…" until its two outages' sets are in
    to8 = "(() => { const n = () => Number(document.querySelector('.deck-n').textContent.split(' / ')[0]); let g = 0; while (n() !== 8 && g++ < 30) document.querySelector(n() < 8 ? '[data-deck=\"next\"]' : '[data-deck=\"prev\"]').click(); })()"
    j.step("deck shown at its cables' slide", view("deck") + "; " + to8, run=False)
    j.step("FI level 1.60 from the panel, the cables' slide shown", slider("FI.level", 1.6))


def j_deck(j):
    """The deck on the opening state and on a changed one, its slides walked."""
    j.open()
    j.step("deck shown (opening state)", view("deck"), run=False)
    for i in (4, 8, 13):
        j.step(f"deck slide {i}", f"(() => {{ const n = () => Number(document.querySelector('.deck-n').textContent.split(' / ')[0]); let g = 0; while (n() !== {i} && g++ < 30) document.querySelector(n() < {i} ? '[data-deck=\"next\"]' : '[data-deck=\"prev\"]').click(); }})()", run=False)
    j.step("deck slide 13, year 2023", click('[data-deck="year"][data-year="2023"]'), run=False)
    j.step("Model shown", view("model"), run=False)
    j.step("solar 2000 MW", slider("EE.mw.solar", 2000))
    j.step("deck shown (solar 2000)", view("deck"), run=False)
    j.step("Model shown", view("model"), run=False)
    j.step("solar back to 2500", slider("EE.mw.solar", 2500))
    j.step("solar 2000 again", slider("EE.mw.solar", 2000))
    j.step("deck shown again (solar 2000)", view("deck"), run=False)


def j_deckreload(j):
    """The deck's cables' slide on a changed state, the page loaded again there."""
    j.open()
    j.step("solar 2000 MW", slider("EE.mw.solar", 2000))
    # the deck's frame is drawn a moment after the view is chosen (its font first): wait for it, then page to the slide
    to8 = "(async () => { while (!document.querySelector('.deck-n')) await new Promise((r) => setTimeout(r, 20)); const n = () => Number(document.querySelector('.deck-n').textContent.split(' / ')[0]); let g = 0; while (n() !== 8 && g++ < 30) document.querySelector(n() < 8 ? '[data-deck=\"next\"]' : '[data-deck=\"prev\"]').click(); })()"
    j.step("deck shown at its cables' slide (solar 2000)", view("deck") + "; " + to8, run=False)
    j.step("reload (the cables' slide, solar 2000)", RELOAD)


def j_replay(j):
    """The validation run switched on and off."""
    j.open()
    j.step("validation 2025", click('#panel button[data-set="run"]'))
    j.step("back to the scenario", click('#panel button[data-set="run"]'))
    j.step("validation 2025 again", click('#panel button[data-set="run"]'))
    j.step("reload on the validation run", RELOAD)


def j_adequacy(j):
    j.open()
    j.step("Adequacy shown", view("adequacy"), run=False)
    j.step("Run (20 samples a year)", click('[data-act="aq-run"]'), run=False)
    j.step("Run again, nothing changed", click('[data-act="aq-run"]'), run=False)


def j_views(j):
    """Every view shown twice, nothing changed."""
    j.open()
    for v in ("presentation", "deck", "adequacy", "calibration", "import", "weather", "statistics", "docs", "model"):
        j.step(f"{v} shown", view(v), run=False)
    for v in ("presentation", "deck", "adequacy", "calibration", "import", "weather", "statistics", "docs", "model"):
        j.step(f"{v} shown again", view(v), run=False)


def j_lines(j):
    """A planned line switched on and off; the clause on and off with 2 SMR shown."""
    j.open()
    j.step("EstLink 3 on", click('#panel [data-switch="estlink3"]'))
    j.step("EstLink 3 off", click('#panel [data-switch="estlink3"]'))
    j.step("EstLink 3 on again", click('#panel [data-switch="estlink3"]'))
    j.step("EstLink 3 off again", click('#panel [data-switch="estlink3"]'))
    j.step("2 SMR shown", click('#cards button[data-scenario="smr2"]'), run=False)


JOURNEYS = {"open": j_open, "change": j_change, "chips": j_chips, "pres": j_pres, "presprio": j_presprio, "deck": j_deck, "deckreload": j_deckreload, "replay": j_replay, "adequacy": j_adequacy, "views": j_views, "lines": j_lines}

if __name__ == "__main__":
    out = []
    with sync_playwright() as pw:
        for name, f in JOURNEYS.items():
            if ONLY and name not in ONLY:
                continue
            print(f"== {name} ({BROWSER}, {URL})", flush=True)
            j = Journey(pw, name)
            try:
                f(j)
            except Exception as e:  # a journey that fails says so and the others go on
                print("  FAILED:", str(e)[:400], flush=True)
                j.errors.append(str(e)[:400])
            out.append(j.close())
            if out[-1]["errors"]:
                print("  errors:", out[-1]["errors"][:3], flush=True)
    json.dump({"url": URL, "browser": BROWSER, "journeys": out}, open(OUT, "w"), indent=1)
