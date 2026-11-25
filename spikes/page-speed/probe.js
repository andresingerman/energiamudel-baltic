// Injected before the page's own scripts (Playwright add_init_script): records what the page asks its workers to
// compute, what it fetches, what it reads from and writes to its IndexedDB store, and how long the main thread is held —
// without a change to the page. A job's identity is what the engine computes from: the year, the panel's state less the
// strike and less a clause no plant reads (as `jobKey`, D-134), and the sensitivity's floors.
(() => {
  const now = () => performance.now();
  const P = (window.__probe = { jobs: [], fetches: [], idb: [], long: [], parse: [], states: {}, open: 0, fetching: 0, last: 0 });
  const hash = (s) => { // cyrb53
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  };
  P.hash = hash;
  const UNITS = { gas: 0, smr1: 1, smr2: 2, smr3: 3 };
  const seen = new WeakMap(); // the state object of a set is posted with each of its jobs: hashed once
  const ident = (m) => {
    const s = m.state;
    if (!s) return {};
    let sh = seen.get(s);
    if (!sh) {
      const plant = s.run === "scenario" && UNITS[s.scenario] > 0;
      const canon = { ...s, smr: { clause: plant && s.smr.clause } };
      // keys sorted: a state read from the address after a reload lists them in another order than one the panel made
      const sorted = (x) => (Array.isArray(x) ? x.map(sorted) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sorted(x[k])])) : x);
      const text = JSON.stringify(sorted(canon));
      sh = hash(text);
      if (!P.states[sh]) P.states[sh] = canon;
      seen.set(s, sh);
    }
    return { state: sh, set: hash(`${sh}|${JSON.stringify(m.gasFloor ?? null)}|${JSON.stringify(m.meanFloor ?? null)}`) };
  };
  const W = window.Worker;
  let n = 0;
  window.Worker = class extends W {
    constructor(url, opts) {
      super(url, opts);
      const w = n++;
      let cur = null;
      const post = this.postMessage.bind(this);
      this.postMessage = (m, t) => {
        const kind = m.warm ? "warm" : m.sample ? "sample" : m.finish ? "finish" : m.part ? (m.part.price ? "second" : "first") : "whole";
        cur = { w, id: m.id, key: m.key, kind, tag: m.tag ?? "", k: m.part?.k ?? null, n: m.part?.n ?? null, sample: m.sample?.index ?? null, ...ident(m), t0: now(), t1: null, err: null };
        P.jobs.push(cur);
        P.open++;
        P.last = now();
        return post(m, t);
      };
      this.addEventListener("message", (e) => {
        if (cur && cur.t1 === null && (!e.data.id || e.data.id === cur.id)) { cur.t1 = now(); cur.err = e.data.error ?? null; P.open--; }
        P.last = now();
      });
    }
  };
  const f = window.fetch;
  window.fetch = async (...a) => {
    const url = String(a[0]?.url ?? a[0]), t0 = now();
    P.fetching++;
    try {
      const r = await f(...a);
      P.fetches.push({ url, t0, t1: now(), status: r.status, len: Number(r.headers.get("content-length")) || null });
      return r;
    } catch (e) {
      P.fetches.push({ url, t0, t1: now(), status: -1, len: null });
      throw e;
    } finally { P.fetching--; P.last = now(); }
  };
  try {
    const get = IDBObjectStore.prototype.get, put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.get = function (k) {
      const t0 = now(), r = get.call(this, k);
      r.addEventListener("success", () => { P.idb.push({ op: "get", key: hash(String(k)), sens: String(k).includes("|sens|"), hit: r.result !== undefined, t0, t1: now() }); P.last = now(); });
      return r;
    };
    IDBObjectStore.prototype.put = function (v, k) {
      P.idb.push({ op: "put", key: hash(String(k)), sens: String(k).includes("|sens|"), hit: null, t0: now(), t1: now() });
      return put.call(this, v, k);
    };
  } catch { /* no IndexedDB */ }
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) P.long.push({ t0: e.startTime, d: e.duration }); }).observe({ type: "longtask", buffered: true }); } catch { /* WebKit has none */ }
  const parse = JSON.parse;
  JSON.parse = function (text, reviver) {
    const t0 = now(), out = parse.call(this, text, reviver), d = now() - t0;
    if (d > 4) P.parse.push({ t0, d, len: text.length, reviver: !!reviver });
    return out;
  };
  /** Resolves once nothing has been computing, fetching or answering for `quiet` ms. */
  P.idle = (quiet = 1000, limit = 600000) => new Promise((res, rej) => {
    const t0 = now();
    const tick = () => {
      const chip = document.getElementById("computing");
      const busy = P.open > 0 || P.fetching > 0 || (chip && !chip.hidden);
      if (!busy && now() - P.last >= quiet) return res(Math.round(P.last));
      if (now() - t0 > limit) return rej(new Error(`not idle after ${limit} ms: open ${P.open}, fetching ${P.fetching}`));
      setTimeout(tick, 50);
    };
    tick();
  });
  // when the cards first hold results after the navigation
  const cards = () => { if (document.getElementById("cards")?.firstElementChild) P.cardsAt = now(); else requestAnimationFrame(cards); };
  requestAnimationFrame(cards);
  P.take = () => {
    const out = { jobs: P.jobs.splice(0), fetches: P.fetches.splice(0), idb: P.idb.splice(0), long: P.long.splice(0), parse: P.parse.splice(0), now: now() };
    return out;
  };
})();
