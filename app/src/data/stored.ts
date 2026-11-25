// Results computed before (R-ENG-7, D-126, D-129). The opening view and the presentation's states,
// computed by the engine of record when the site is built (scripts/opening.ts → data/opening.bin.gz,
// read at once, and data/sets.json.gz with data/sets/, fetched when first asked for), and the sets
// this browser computed since, kept in IndexedDB. Each is keyed by the id of the sources that compute a
// set (scripts/engine_id.ts, D-237; the build's commit until then), the export's hash and what the set
// computes from, so a result is reused only for the code, the data and the settings it was computed
// from; anything amiss — no file, other sources, no IndexedDB — reads as "not computed", and the page
// computes. The build's sets are written as a pack (`pack`, D-236): the
// typed arrays' own bytes after a small JSON header, a third smaller than JSON text and read in
// milliseconds; the list of the sets stays JSON.
import { inflate, isGzip } from "./loader.ts";

const TYPED = { Float64Array, Float32Array, Int32Array, Uint32Array, Int16Array, Uint16Array, Int8Array, Uint8Array };
type TypedName = keyof typeof TYPED;

/** JSON that keeps typed arrays' types and every number exact, NaN, the infinities and −0 included. */
export function encode(x: unknown): string {
  const num = (v: number) => (Number.isFinite(v) && !Object.is(v, -0) ? v : { $n: Object.is(v, -0) ? "-0" : String(v) });
  return JSON.stringify(x, (_k, v) => {
    if (ArrayBuffer.isView(v) && !(v instanceof DataView)) return { $t: v.constructor.name, d: Array.from(v as unknown as ArrayLike<number>, num) };
    return typeof v === "number" ? num(v) : v;
  });
}

export function decode<T>(text: string): T {
  const num = (v: unknown) => (v && typeof v === "object" && "$n" in v ? Number((v as { $n: string }).$n) : v as number);
  return JSON.parse(text, (_k, v) => {
    if (v && typeof v === "object" && "$n" in v) return num(v);
    if (v && typeof v === "object" && typeof v.$t === "string" && Array.isArray(v.d) && v.$t in TYPED) return TYPED[v.$t as TypedName].from(v.d.map(num));
    return v;
  }) as T;
}

const MAGIC = 0x454d5231; // "EMR1"
const LITTLE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
/** A file's bytes are a pack. */
export const isPack = (b: Uint8Array): boolean => b.byteLength >= 8 && new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(0) === MAGIC;

/** A value as a pack (D-236): the magic "EMR1", the header's length, the header — the value as JSON, each typed
 * array replaced by its type, its place and its length, every other number exact as `encode` writes it — and after
 * it the arrays' own bytes, each at a multiple of its element's size, in the byte order every machine the page meets
 * has (little-endian; a big-endian one neither writes nor reads a pack, and the page computes). */
export function pack(x: unknown): Uint8Array {
  if (!LITTLE) throw new Error("a pack is written on a little-endian machine");
  const num = (v: number) => (Number.isFinite(v) && !Object.is(v, -0) ? v : { $n: Object.is(v, -0) ? "-0" : String(v) });
  const chunks: Uint8Array[] = [];
  let at = 0;
  const head = new TextEncoder().encode(JSON.stringify(x, (_k, v) => {
    if (ArrayBuffer.isView(v) && !(v instanceof DataView)) {
      const a = v as unknown as Uint8Array & { BYTES_PER_ELEMENT: number };
      const pad = (a.BYTES_PER_ELEMENT - (at % a.BYTES_PER_ELEMENT)) % a.BYTES_PER_ELEMENT;
      if (pad) chunks.push(new Uint8Array(pad));
      chunks.push(new Uint8Array(a.buffer, a.byteOffset, a.byteLength));
      at += pad + a.byteLength;
      return { $b: [a.constructor.name, at - a.byteLength, a.length] };
    }
    return typeof v === "number" ? num(v) : v;
  }));
  const base = 8 + head.length + ((8 - (head.length % 8)) % 8);
  const out = new Uint8Array(base + at);
  const view = new DataView(out.buffer);
  view.setUint32(0, MAGIC);
  view.setUint32(4, head.length);
  out.set(head, 8);
  let o = base;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/** A pack's value: each typed array a copy of its bytes, in a buffer of its own. */
export function unpack<T>(b: Uint8Array): T {
  if (!LITTLE || !isPack(b)) throw new Error("not a pack this machine reads");
  const n = new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(4), base = b.byteOffset + 8 + n + ((8 - (n % 8)) % 8);
  return JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n)), (_k, v) => {
    if (!v || typeof v !== "object") return v;
    if ("$n" in v) return Number((v as { $n: string }).$n);
    if (!Array.isArray(v.$b)) return v;
    const [type, at, length] = v.$b as [TypedName, number, number];
    if (!(type in TYPED)) throw new Error(`a pack of an unknown array type ${String(type)}`);
    return new TYPED[type]((b.buffer as ArrayBuffer).slice(base + at, base + at + length * TYPED[type].BYTES_PER_ELEMENT));
  }) as T;
}

/** A file's value, inflated already: a pack's, or JSON's as `encode` wrote it (the list of the sets; a set of a
 * site built before D-236). */
export const read = <T>(b: Uint8Array): T => (isPack(b) ? unpack<T>(b) : decode<T>(new TextDecoder().decode(b)));

/** How long the page waits for a file of the build's sets — the largest is 1.6 MB — before it computes instead. */
export const FILE_MS = 30_000;

/** What the build computed for the opening view: the four scenarios' sets and the shown scenario's
 * sensitivities, keyed `${scenario}|${id}` as the page keys them. */
export interface Opening<S> { commit: string; engine: string; export: string; key: string; trio: Record<string, S>; sens: Record<string, S> }

/** A file the build wrote, decoded; null when it cannot be had. */
async function built<T>(base: string, file: string): Promise<T | null> {
  // a file that has not come in FILE_MS is done without, as a store that does not answer is (D-238): the page computes
  return within((async () => {
    const r = await fetch(new URL(file, base).href);
    if (!r.ok) return null;
    const b = new Uint8Array(await r.arrayBuffer());
    return read<T>(isGzip(b) ? await inflate(b) : b);
  })(), null, FILE_MS);
}

/** The opening view the build computed, for the sources the page was built from (`engine`: scripts/engine_id.ts,
 * D-237; the commit until then), or null. */
export async function loadOpening<S>(base: string, engine: string): Promise<Opening<S> | null> {
  const o = await built<Opening<S>>(base, "opening.bin.gz");
  return o?.engine === engine ? o : null;
}

/** A set's id, the build's and the page's alike (D-129): the run's settings (`runKey`), and for a
 * sensitivity its scenario and its own id after them. */
export const setId = (key: string, sens?: string): string => (sens ? `${key}|sens|${sens}` : key);

/** The presentation's states the build computed (D-129): each set's file by the page's own id of it. */
export interface SiteSets { commit: string; engine: string; export: string; sets: Record<string, string> }

export async function loadIndex(base: string, engine: string): Promise<SiteSets | null> {
  const o = await built<SiteSets>(base, "sets.json.gz");
  return o?.engine === engine ? o : null;
}

/** The set the build computed under `id`, or null. */
export async function loadSet<T>(base: string, index: SiteSets | null, id: string): Promise<T | null> {
  const file = index?.sets[id];
  return file ? built<T>(base, file) : null;
}

/** The bytes of a value's typed arrays: what a set weighs in the page's memory and in the browser's store (its
 * other fields are a few hundred numbers and names). */
export function bytesOf(x: unknown): number {
  if (ArrayBuffer.isView(x)) return x.byteLength;
  if (Array.isArray(x)) return x.reduce((a: number, v) => a + bytesOf(v), 0);
  if (x && typeof x === "object") return Object.values(x).reduce((a: number, v) => a + bytesOf(v), 0);
  return 0;
}

/** The entries last used, up to a budget of bytes: reading one makes it the newest, and adding one drops the oldest
 * beyond the budget — never the one just added, however large. */
export class Lru<V> {
  private map = new Map<string, { v: V; bytes: number }>();
  private budget: number;
  bytes = 0;
  constructor(budget: number) { this.budget = budget; }
  get size(): number { return this.map.size; }
  get(k: string): V | undefined {
    const e = this.map.get(k);
    if (!e) return undefined;
    this.map.delete(k);
    this.map.set(k, e);
    return e.v;
  }
  set(k: string, v: V, bytes: number): void {
    const old = this.map.get(k);
    if (old) { this.bytes -= old.bytes; this.map.delete(k); }
    this.map.set(k, { v, bytes });
    this.bytes += bytes;
    for (const [key, e] of this.map) {
      if (this.bytes <= this.budget || key === k) break;
      this.map.delete(key);
      this.bytes -= e.bytes;
    }
  }
}

const DB = "energiamudel-sets", SETS = "sets", META = "meta";
/** The database of D-126 and D-128, tables of four scenarios under their settings: dropped, its sets computed again. */
const OLD_DB = "energiamudel-results";
/** The browser's budget: the bytes of the sets it keeps, those last used. A set of three years weighs about 0.66 MB,
 * a state's table and sensitivities twenty of them, its presentation blocks and the deck's outages twenty-four more:
 * room for about seven states with everything shown, or fourteen with the Model view alone (D-232).
 * ponytail: a fixed budget; a browser short of room refuses the write, and the page computes again. */
export const STORE_BYTES = 192e6;
/** How long the page waits for the browser's store before it goes on without it (ERRATA E-191): the store spares a
 * computation and must never hold one up. A store on this machine answers in milliseconds. */
export const PATIENCE_MS = 1500;

/** `p`'s value, or `otherwise` when `p` has not answered in `ms` or fails. */
export function within<T>(p: Promise<T>, otherwise: T, ms = PATIENCE_MS): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(otherwise), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, () => { clearTimeout(t); resolve(otherwise); });
  });
}

let opened: Promise<IDBDatabase | null> | null = null;
/** The page goes on without its store from here: every later call answers at once — until a store that was only
 * slow to open has opened (`open`). */
const without = (): void => { opened = Promise.resolve(null); };

/** The browser's store, opened once (D-128): each set under what it computes from, with when it was last used and
 * its bytes beside it, so that the oldest go without being read (D-232). A database of its own name, not a later
 * version of the old one: opening a later version waits for every page that holds the old one — another tab of the
 * site, or the page before a reload that the browser keeps for its back button — and a browser may never say so
 * (ERRATA E-191). Nobody waits longer than PATIENCE_MS for it to open; a store that opens after that — a first
 * opening on a busy machine or a phone takes seconds — is used from then on (ERRATA E-192). */
function open(): Promise<IDBDatabase | null> {
  if (opened) return opened;
  const raw = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore(SETS);
        r.result.createObjectStore(META);
      };
      r.onsuccess = () => {
        // a later version of the page opening the store: this page lets go of it, and computes from then on
        r.result.onversionchange = () => r.result.close();
        // a database of this name without its two stores is not this page's: done without
        resolve(r.result.objectStoreNames.contains(SETS) && r.result.objectStoreNames.contains(META) ? r.result : null);
      };
      r.onerror = r.onblocked = () => resolve(null);
      // the old database goes when no page holds it any more; nothing waits for it
      try { indexedDB.deleteDatabase(OLD_DB); } catch { /* as it is */ }
    } catch {
      resolve(null);
    }
  });
  void raw.then((db) => { if (db) opened = Promise.resolve(db); });
  return (opened = within(raw, null).then((db) => { if (!db) without(); return db; }));
}

/** A set this browser kept under `id`, or null — null too when the store does not answer in PATIENCE_MS, and the
 * page then does without it; a set read is marked as used now, apart from the reading. */
export async function recall<T>(id: string): Promise<T | null> {
  const db = await open();
  if (!db) return null;
  const MISSED = Symbol("the store did not answer");
  const got = await within(new Promise<T | null>((resolve) => {
    try {
      const q = db.transaction(SETS).objectStore(SETS).get(id);
      q.onsuccess = () => resolve((q.result as T | undefined) ?? null);
      q.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  }), MISSED as unknown as T | null);
  if ((got as unknown) === MISSED) { without(); return null; }
  if (got !== null) {
    try {
      const meta = db.transaction(META, "readwrite").objectStore(META), m = meta.get(id);
      m.onsuccess = () => meta.put({ ...(m.result as { bytes: number } | undefined ?? { bytes: bytesOf(got) }), t: Date.now() }, id);
    } catch { /* not marked: it goes a little sooner */ }
  }
  return got;
}

/** The ids to drop of those kept, each with when it was last used and its bytes: every set of another build or
 * export — its id does not start with `prefix` — and then the longest unused beyond `budget` bytes, the one last
 * used never. */
export function excess(seen: [id: string, t: number, bytes: number][], prefix: string, budget: number): string[] {
  const drop = seen.filter(([k]) => !k.startsWith(prefix)).map(([k]) => k);
  let bytes = 0;
  seen.filter(([k]) => k.startsWith(prefix)).sort((a, b) => b[1] - a[1]).forEach(([k, , b], i) => {
    bytes += b;
    if (i > 0 && bytes > budget) drop.push(k);
  });
  return drop;
}

/** Keep `v` under `id`, which starts with the build's `prefix`; the sets of other builds and the longest unused
 * beyond the budget are dropped. */
export async function remember(id: string, v: unknown, prefix: string, budget = STORE_BYTES): Promise<void> {
  const db = await open();
  if (!db) return;
  try {
    const tx = db.transaction([SETS, META], "readwrite");
    const sets = tx.objectStore(SETS), meta = tx.objectStore(META);
    // a write the browser refuses for want of room undoes the dropping below with it, and a full store would stay
    // full: it is emptied, and fills again with what is computed from now on (D-238)
    tx.onabort = () => {
      if (tx.error?.name !== "QuotaExceededError") return;
      try { const again = db.transaction([SETS, META], "readwrite"); again.objectStore(SETS).clear(); again.objectStore(META).clear(); } catch { /* as it is */ }
    };
    sets.put(v, id);
    meta.put({ t: Date.now(), bytes: bytesOf(v) }, id);
    const seen: [string, number, number][] = [];
    const c = meta.openCursor();
    c.onsuccess = () => {
      const cur = c.result;
      if (cur) { const m = cur.value as { t: number; bytes: number }; seen.push([String(cur.primaryKey), m.t, m.bytes]); cur.continue(); return; }
      for (const k of excess(seen, prefix, budget)) { sets.delete(k); meta.delete(k); }
    };
  } catch { /* storage refused: the page computes again next time */ }
}
