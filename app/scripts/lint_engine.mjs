// R-NFR-5, PLAN §3.5: the engine uses + − × ÷, comparisons, Math.floor/ceil/round/abs/min/max and
// typed arrays only — libm results (exp, log, pow, sqrt, sin …) differ between V8 and
// JavaScriptCore, and a clock, randomness, locale or I/O would make a run depend on more than its
// inputs. This scans src/engine/ and fails on any of them.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..", "src");
const FORBIDDEN = [
  [/\bMath\.(random|exp|expm1|log|log1p|log2|log10|pow|sqrt|cbrt|hypot|sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|asinh|acosh|atanh|fround)\b/, "libm or randomness"],
  [/\*\*/, "the ** operator (pow)"],
  [/\bDate\b|\bperformance\b|\bsetTimeout\b|\bsetInterval\b/, "a clock"],
  [/\btoLocale\w*|\blocaleCompare\b|\bIntl\b/, "locale-dependent formatting or ordering"],
  [/\bfetch\b|\bdocument\b|\bwindow\b|\bXMLHttpRequest\b|\bprocess\b|\bcrypto\b/, "I/O or the host"],
  [/from\s+["']node:/, "a Node module"],
  [/for\s*\(\s*(const|let|var)\s+\w+\s+in\b/, "for…in (iteration order)"],
];

/** The code without comments and string text, lines kept: one pass, so that a "//" inside a string
 * hides nothing and a template's `${…}` expressions stay code to be checked. A regular-expression
 * literal with a quote or a "//" in it would be misread; the engine's one (build.ts, a profile's
 * name) has neither. */
function scan(src, i, inExpr) {
  let out = "";
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    if (c === "/" && d === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && d === "*") {
      const j = src.indexOf("*/", i + 2);
      const end = j < 0 ? src.length : j + 2;
      out += src.slice(i, end).replace(/[^\n]/g, "");
      i = end;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
      out += '""';
      i = j + 1;
      continue;
    }
    if (c === "`") {
      out += '"';
      i++;
      while (i < src.length && src[i] !== "`") {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === "$" && src[i + 1] === "{") {
          const [expr, j] = scan(src, i + 2, true);
          out += ` ${expr} `;
          i = j;
          continue;
        }
        if (src[i] === "\n") out += "\n";
        i++;
      }
      out += '"';
      i++;
      continue;
    }
    if (inExpr && c === "{") depth++;
    if (inExpr && c === "}") {
      if (depth === 0) return [out, i + 1];
      depth--;
    }
    out += c;
    i++;
  }
  return [out, i];
}
export const strip = (src) => scan(src, 0, false)[0];

// the stripper's own check: a template's expression stays code, a "//" in a string hides nothing, a
// block comment keeps its lines (so the line numbers reported stay right)
const selfCheck = [
  ["x = `t ${Date.now()} u`;", /Date\.now\(\)/],
  ['u = "https://x.ee"; Math.exp(1);', /Math\.exp/],
  ["/* a\nb */ k = 1;", /^\n k = 1;$/],
];
for (const [src, want] of selfCheck) if (!want.test(strip(src))) throw new Error(`lint_engine: strip(${JSON.stringify(src)}) gave ${JSON.stringify(strip(src))}`);

if (process.argv[1]?.endsWith("lint_engine.mjs")) lint(); // by name: a path through a link still runs it

function lint() {
let bad = 0;
for (const dir of ["engine"]) {
  const d = join(root, dir);
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d).filter((x) => x.endsWith(".ts")).sort()) {
    const lines = strip(readFileSync(join(d, f), "utf8")).split("\n");
    lines.forEach((line, i) => {
      for (const [re, why] of FORBIDDEN) {
        if (re.test(line)) {
          console.error(`src/${dir}/${f}:${i + 1}: ${why}: ${line.trim()}`);
          bad++;
        }
      }
    });
  }
}
if (bad) process.exit(1);
console.log("engine lint: clean");
}
