// The built site (`npm run build`) against R-NFR-1 and R-NFR-4: no third-party address in its
// HTML, CSS or JavaScript — the site requests nothing outside itself — and its JavaScript and
// fonts within v3's plus 30 % (the solver's WebAssembly is outside the limit, revision 1.4); its
// .htaccess present (R-DEP-1).
// `node --no-maglev scripts/site_check.ts` exits 1 on a breach.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = join(fileURLToPath(new URL(".", import.meta.url)), "..", "dist");
/** v3's dist at 328aa9b (2026-09-24): JavaScript 1 915 056 bytes, fonts 518 660. */
export const V3_BUNDLE = 1_915_056 + 518_660;
/** Addresses that are text, not requests: a documentation link in HiGHS's error messages; the
 * scenario schema's own identifiers ($schema, $id — an identifier, so it keeps the staging path of
 * D-085), which Vite 8 bundles with the rest of the JSON where Vite 7 left out the keys the code does
 * not read. */
const ALLOWED = new Set([
  // Google's tag, loaded only after the reader's consent (D-338, R-NFR-1 revision 2.148); the minifier joins the
  // address and its "?id=" into one literal
  "https://www.googletagmanager.com/gtag/js",
  "https://www.googletagmanager.com/gtag/js?id=",
  // the author's page behind the name in the footer: a link the reader follows, not a request
  "https://www.linkedin.com/in/andresingerman",
  "http://web.mit.edu/lpsolve/doc/CPLEX-format.htm",
  "https://json-schema.org/draft/2020-12/schema",
  "https://energiamudel.ee/v5/schema/scenario.schema.json",
]);

const files = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? files(join(d, f)) : [join(d, f)]));
const all = files(DIST).filter((f) => !f.includes(`${DIST}/data/`));
const failures: string[] = [];
/** The documents' text (methodology.md and its Estonian summary; R-APP-9): its addresses are references for the
 * reader — the literature's DOIs, the sources' pages — not requests the site makes. */
const TEXT = /\/assets\/(methodology|methodology_et)-[\w-]+\.js$/;
for (const f of all.filter((f) => /\.(html|css|js)$/.test(f) && !TEXT.test(f))) {
  // any address a request could go to: http(s), websockets, and protocol-relative "//host.tld"
  for (const m of readFileSync(f, "utf8").matchAll(/(?:(?:https?|wss?):)?\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+[^\s"'`)<>]*/gi)) {
    if (!ALLOWED.has(m[0])) failures.push(`${f.slice(DIST.length + 1)}: ${m[0]}`);
  }
}
// the redirects of the former paths and the caching go with the build (R-DEP-3, R-DEP-4)
if (!all.includes(join(DIST, ".htaccess"))) failures.push(".htaccess missing");
const size = all.filter((f) => /\.(js|woff2)$/.test(f)).reduce((s, f) => s + statSync(f).size, 0);
if (size > 1.3 * V3_BUNDLE) failures.push(`bundle ${size} bytes over v3's ${V3_BUNDLE} + 30 %`);
console.log(`site: JavaScript and fonts ${size.toLocaleString("en")} bytes (limit ${Math.round(1.3 * V3_BUNDLE).toLocaleString("en")}), ${failures.length} breach(es)`);
for (const x of failures) console.error(`  ${x}`);
if (failures.length) process.exit(1);
