// The export's files, fetched when first needed and kept in memory (R-NFR-3). A file may arrive
// gzipped (served as stored) or already inflated (served with Content-Encoding); the magic bytes
// decide, and the platform's DecompressionStream inflates — no library (R-NFR-6).

export const isGzip = (b: Uint8Array): boolean => b.length > 1 && b[0] === 0x1f && b[1] === 0x8b;

export async function inflate(b: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([b as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function parse<T>(b: Uint8Array): Promise<T> {
  return JSON.parse(new TextDecoder().decode(isGzip(b) ? await inflate(b) : b)) as T;
}

const cache = new Map<string, Promise<unknown>>();

/** `path` relative to the export's root, `base` its absolute URL (a worker resolves relative URLs
 * against its own script, so the page passes the base down). */
export function load<T>(path: string, base: string): Promise<T> {
  const url = new URL(path, base).href;
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then(async (r) => {
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
      return parse<T>(new Uint8Array(await r.arrayBuffer()));
    });
    p.catch(() => cache.delete(url)); // a failed fetch is tried again next time
    cache.set(url, p);
  }
  return p as Promise<T>;
}
