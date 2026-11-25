// Is the machine quiet enough to time the page? A fixed integer loop on one thread, then on eight at once. On the
// development Mac (M1 Pro, six fast cores and two slow) a quiet machine prints about 380 ms and 430–520 ms; a journey
// measured while it prints more — a backup, the indexer, another browser at work — is thrown away.
// `node spikes/page-speed/quiet.mjs`; exits 1 when one thread takes over 450 ms or any of the eight over 620 ms.
import { Worker, isMainThread, parentPort } from "node:worker_threads";
const work = () => { const t0 = performance.now(); let x = 0; for (let i = 0; i < 4e8; i++) x = (x + (i ^ (x >>> 3))) | 0; return performance.now() - t0; };
if (!isMainThread) parentPort.postMessage(work());
else {
  const one = work();
  const many = await Promise.all(Array.from({ length: 8 }, () => new Promise((r) => new Worker(new URL(import.meta.url)).on("message", r))));
  console.log(`one thread ${one.toFixed(0)} ms; eight at once ${many.map((m) => m.toFixed(0)).join(" ")} ms`);
  process.exitCode = one <= 450 && many.every((m) => m <= 620) ? 0 : 1;
}
