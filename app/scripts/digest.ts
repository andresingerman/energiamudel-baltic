// SHA-256 of every array a run returns (the golden fixture, R-VAL-8, R-NFR-5), in the order
// golden_cases.ts `arrays` gives them, as JavaScriptCore's copy hashes them (scripts/jsc/golden.ts).
import { createHash } from "node:crypto";
import type { Results } from "../src/engine/index.ts";
import { arrays } from "./golden_cases.ts";

export function digest(r: Results): string {
  const h = createHash("sha256");
  for (const a of arrays(r)) h.update(new Uint8Array(a.buffer, a.byteOffset, a.byteLength));
  return h.digest("hex");
}
