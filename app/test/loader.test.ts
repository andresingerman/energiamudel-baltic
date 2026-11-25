// The loader's two paths: gzip by its magic bytes, plain JSON otherwise (R-NFR-3).
import assert from "node:assert/strict";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { isGzip, parse } from "../src/data/loader.ts";

test("gzip is recognised by its magic bytes and inflated; plain JSON is read as it is", async () => {
  const text = JSON.stringify({ a: [1, 2, 3], b: "õ" });
  const gz = new Uint8Array(gzipSync(Buffer.from(text)));
  const plain = new TextEncoder().encode(text);
  assert.ok(isGzip(gz) && !isGzip(plain));
  assert.deepEqual(await parse(gz), JSON.parse(text));
  assert.deepEqual(await parse(plain), JSON.parse(text));
});
