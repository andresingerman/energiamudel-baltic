// The browser's pool on Node workers speaking the browser worker's protocol (scripts/lp_worker.ts,
// src/worker/job.ts): for the bench and for the sets computed when the site is built (D-128, D-129).
import { Worker } from "node:worker_threads";
import type { Port } from "../src/worker/pool.ts";
import { Pool } from "../src/worker/pool.ts";

export function nodePool(workers: number): { pool: Pool; close: () => Promise<unknown> } {
  const ws = Array.from({ length: workers }, () => new Worker(new URL("./lp_worker.ts", import.meta.url)));
  const pool = new Pool(ws.map((w) => {
    const port: Port = { onmessage: null, postMessage: (m) => w.postMessage(m) };
    w.on("message", (data) => port.onmessage?.({ data }));
    w.on("error", (e) => port.onerror?.({ message: e.message }));
    return port;
  }), 30 * 60_000); // no reader waits here: a whole year under a loaded machine is not given up (pool.ts JOB_MS, D-238)
  return { pool, close: () => Promise.all(ws.map((w) => w.terminate())) };
}
