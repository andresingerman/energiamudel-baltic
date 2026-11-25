// Two builds' computed sets compared (D-126, D-129; ERRATA E-156): the opening view's scenarios and
// sensitivities and every presentation set, deep-equal with the run times (`ms`) left out. The check
// before saying an engine change moves no figure, beside the golden fixture: the site's sets hold
// sensitivities that no golden case or headline year does. `before` and `after` are a build's `data/`
// directories — `app/dist/data` after `npm run build && node --no-maglev scripts/opening.ts` at each
// commit — or a site's by its address, https://energiamudel.ee/data for the live one. From app/: `node --no-maglev scripts/compare_sets.ts <before> <after>
// [--drop=key,…]`, `--drop` leaving out fields a change removed on purpose (D-138); exits 1 when a set
// differs. A site behind Basic Auth (D-178) is read with DEPLOY_AUTH (user:password) from the environment,
// as validate.deployed reads it.
import { isDeepStrictEqual } from "node:util";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { read as value } from "../src/data/stored.ts";

const [before, after] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!before || !after) throw new Error("usage: node scripts/compare_sets.ts <before data dir> <after data dir> [--drop=key,…]");
const drop = new Set(["ms", ...(process.argv.find((a) => a.startsWith("--drop="))?.slice(7).split(",") ?? [])]);
const read = async (dir: string, f: string): Promise<Record<string, unknown>> => {
  const auth = process.env.DEPLOY_AUTH;
  const headers: Record<string, string> = auth ? { Authorization: `Basic ${Buffer.from(auth).toString("base64")}` } : {};
  const get = async (url: string) => { const r = await fetch(url, { headers }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return Buffer.from(await r.arrayBuffer()); };
  const b = /^https?:/.test(dir) ? await get(`${dir}/${f}`) : readFileSync(join(dir, f));
  return value(b[0] === 0x1f ? gunzipSync(b) : b); // a pack since D-236, JSON before it
};
/** The opening view's file: a pack since D-236, JSON on a site built before it. */
const opening = async (dir: string) => {
  const packed = /^https?:/.test(dir) ? await read(dir, "opening.bin.gz").catch(() => null) : existsSync(join(dir, "opening.bin.gz")) ? await read(dir, "opening.bin.gz") : null;
  return packed ?? read(dir, "opening.json.gz");
};
const strip = (x: unknown): unknown => {
  if (Array.isArray(x)) return x.map(strip);
  if (x && typeof x === "object" && !ArrayBuffer.isView(x)) return Object.fromEntries(Object.entries(x).filter(([k]) => !drop.has(k)).map(([k, v]) => [k, strip(v)]));
  return x;
};
const differ: string[] = [];
const a = await opening(before), b = await opening(after);
for (const part of ["trio", "sens"]) {
  const x = a[part] as Record<string, unknown>, y = b[part] as Record<string, unknown>;
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) if (!isDeepStrictEqual(strip(x[k]), strip(y[k]))) differ.push(`opening ${part} ${k}`);
}
const ia = ((await read(before, "sets.json.gz")).sets ?? {}) as Record<string, string>, ib = ((await read(after, "sets.json.gz")).sets ?? {}) as Record<string, string>;
const ids = new Set([...Object.keys(ia), ...Object.keys(ib)]);
for (const id of ids) {
  const name = id.split("\n").filter((l) => /^profile=|^\|sens\|/.test(l)).join(" ") || "the opening state";
  if (!ia[id] || !ib[id]) differ.push(`only ${ia[id] ? "before" : "after"}: ${name}`);
  else if (!isDeepStrictEqual(strip(await read(before, ia[id])), strip(await read(after, ib[id])))) differ.push(`${ib[id]} (${name})`);
}
console.log(`opening view: commit ${String(a.commit)} → ${String(b.commit)}; presentation sets: ${ids.size}, ${differ.length ? `differing: ${differ.join("; ")}` : "none differs"}`);
process.exitCode = differ.length ? 1 : 0;
