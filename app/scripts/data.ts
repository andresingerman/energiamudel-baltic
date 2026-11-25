// Reads the committed export (data/export/) for the Node scripts and tests; the browser has its
// own loader (src/data/loader.ts). Gzip is recognised by its magic bytes, as that loader does.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import type { Links } from "../src/contract/links.ts";
import type { Presets } from "../src/contract/presets.ts";
import type { Year } from "../src/contract/year.ts";
import type { Validation as ActualFile } from "../src/ui/actual.ts";

export const EXPORT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "data", "export");

export function readJson<T>(path: string): T {
  const b = readFileSync(path);
  return JSON.parse((b[0] === 0x1f && b[1] === 0x8b ? gunzipSync(b) : b).toString("utf8")) as T;
}

export const year = (key: string): Year => readJson<Year>(join(EXPORT, "years", `${key}.json.gz`));
export const presets = (): Presets => readJson<Presets>(join(EXPORT, "presets.json"));
export const links = (): Links => readJson<Links>(join(EXPORT, "links.json.gz"));

/** A validation file (data/export/validation/): the page's part of it (src/ui/actual.ts) and the rest. */
export interface Validation extends ActualFile {
  hours: number;
  load: Record<string, number[]>;
  flow: Record<string, { fwd: number[]; rev: number[] }>;
}
export const validation = (key: string): Validation => readJson<Validation>(join(EXPORT, "validation", `${key}.json.gz`));
