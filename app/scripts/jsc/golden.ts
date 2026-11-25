// The golden fixture's cases (scripts/golden_cases.ts) recomputed in JavaScriptCore, bundled by
// scripts/golden_jsc.ts and run in the jsc shell: one "case sha256" line per case. The shell lacks
// what Safari has and the engine uses outside its arithmetic — console and TextEncoder (the LP's
// perturbation hashes the offers' names) — and a SHA-256, so they are written out here.
import type { Highs } from "highs";
import highsLoader from "highs";
import type { Links } from "../../src/contract/links.ts";
import type { Presets } from "../../src/contract/presets.ts";
import type { Year } from "../../src/contract/year.ts";
import type { Results } from "../../src/engine/index.ts";
import { makeSolver } from "../../src/worker/solver.ts";
import { arrays, goldenRuns } from "../golden_cases.ts";

declare const __DIR__: string;
declare function read(path: string): string;
declare function read(path: string, mode: "binary"): Uint8Array<ArrayBuffer>;
declare const print: (s: string) => void;
declare const preciseTime: () => number; // the shell's clock, s

const g = globalThis as Record<string, unknown>;
g.console ??= { log: print, warn: print, error: print };
g.TextEncoder ??= class {
  encode(s: string): Uint8Array {
    const out: number[] = [];
    for (const ch of s) {
      const c = ch.codePointAt(0) as number;
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return new Uint8Array(out);
  }
};

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** SHA-256 (FIPS 180-4) of the arrays' bytes, as scripts/digest.ts feeds node's. */
function sha256(arrays: (Float64Array | Uint8Array | Int8Array)[]): string {
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const buf = new Uint8Array(64);
  let n = 0;
  let len = 0;
  const block = () => {
    for (let i = 0; i < 16; i++) w[i] = (buf[4 * i] << 24) | (buf[4 * i + 1] << 16) | (buf[4 * i + 2] << 8) | buf[4 * i + 3];
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15];
      const y = w[i - 2];
      w[i] = (w[i - 16] + (((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3)) + w[i - 7] + (((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10))) | 0;
    }
    let [a, b, c, d, e, f, gg, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & gg)) + K[i] + w[i]) | 0;
      const t2 = ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      hh = gg; gg = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += gg; h[7] += hh;
  };
  const push = (x: number) => { buf[n++] = x; if (n === 64) { block(); n = 0; } };
  for (const a of arrays) {
    const bytes = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
    for (let i = 0; i < bytes.length; i++) push(bytes[i]);
    len += bytes.length;
  }
  push(0x80);
  while (n !== 56) push(0);
  const bits = len * 8;
  for (let i = 7; i >= 0; i--) push(Math.floor(bits / 2 ** (8 * i)) & 255);
  return Array.from(h, (x) => x.toString(16).padStart(8, "0")).join("");
}

const presets = JSON.parse(read(`${__DIR__}/presets.json`)) as Presets;
const links = JSON.parse(read(`${__DIR__}/links.json`)) as Links;
const year = (key: string): Year => JSON.parse(read(`${__DIR__}/${key}.json`)) as Year;
// the module would fetch its WebAssembly; the shell has no fetch, so it is instantiated here
const wasm = read(`${__DIR__}/highs.wasm`, "binary");
const highs = await (highsLoader as unknown as (m: object) => Promise<Highs>)({
  instantiateWasm: (imports: WebAssembly.Imports, done: (i: WebAssembly.Instance) => void) => {
    void WebAssembly.instantiate(wasm, imports).then((r) => done(r.instance));
    return {};
  },
});
const solve = makeSolver(highs);
const cases: Record<string, () => Results> = goldenRuns(presets, year, links, solve);
// each case's digest and the milliseconds its run took (scripts/golden_jsc.ts --time)
for (const [k, f] of Object.entries(cases)) {
  const t = preciseTime();
  const r = f();
  const ms = (preciseTime() - t) * 1000;
  print(`${k} ${sha256(arrays(r))} ${ms.toFixed(0)}`);
}
