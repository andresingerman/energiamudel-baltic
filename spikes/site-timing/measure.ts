// The built site's times in a headless Chrome over the DevTools protocol, so that they do not depend on
// a window being in view (the Claude app's browser pane is throttled while the screen is idle). For
// each change of Finland's price level: (a) the scenario shown drawn — the status line says it is in,
// or the whole run is done — (b) all four scenarios in, (c) the last sensitivity in; and the opening
// view's time after the navigation. Site data are cleared first, so the browser's store starts empty.
// Serve app/dist first (`npm --prefix app run preview -- --port 4173`), then from the repository:
// `node --no-maglev spikes/site-timing/measure.ts [url] [label]`; prints one JSON line.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const URL_ = process.argv[2] ?? "http://localhost:4173/";
const LABEL = process.argv[3] ?? "";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
const profile = mkdtempSync(join(tmpdir(), "site-timing-"));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--no-first-run",
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "about:blank"], { stdio: "ignore" });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function target(): Promise<string> {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json() as { type: string; webSocketDebuggerUrl: string }[];
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(100);
  }
  throw new Error("Chrome did not start");
}

const ws = new WebSocket(await target());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const waiting = new Map<number, (v: unknown) => void>();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(String(e.data)) as { id?: number; result?: unknown; error?: unknown };
  if (m.id !== undefined && waiting.has(m.id)) { waiting.get(m.id)!(m.error ? { error: m.error } : m.result); waiting.delete(m.id); }
});
const send = (method: string, params: Record<string, unknown> = {}) => new Promise<unknown>((r) => { waiting.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression: string) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }) as { result?: { value: unknown }; exceptionDetails?: unknown; error?: unknown };
  if (r.exceptionDetails || r.error) throw new Error(JSON.stringify(r.exceptionDetails ?? r.error));
  return r.result?.value;
};

// in the page: the same probe as the night's measurements by hand
const PROBE = `(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const status = document.getElementById('status'), sens = document.getElementById('sens');
  const st = () => status.textContent || '';
  const pend = () => /…/.test(sens.textContent || '');
  const waitFor = (el, ok) => new Promise(res => { if (ok()) return res(performance.now()); const o = new MutationObserver(() => { if (ok()) { o.disconnect(); res(performance.now()); } }); o.observe(el, { childList: true, subtree: true, characterData: true, attributes: true }); });
  const out = { opened: Math.round(await waitFor(status, () => /when the site was built|in this browser before|years in/.test(st()))), runs: [] };
  await waitFor(sens, () => !pend());
  await sleep(3000);
  async function change(v, label) {
    const el = [...document.querySelectorAll('input[type=range]')].find(x => (x.getAttribute('aria-label') || '').startsWith('FI price level'));
    status.textContent = '';
    const t0 = performance.now();
    el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    const ta = await waitFor(status, () => /scenario shown is in|^\\d+ years in [\\d.]+ s/.test(st()));
    const tb = await waitFor(status, () => /^\\d+ years in [\\d.]+ s/.test(st()));
    await sleep(50);
    const tc = await waitFor(sens, () => !pend());
    const r = (t) => +((t - t0) / 1000).toFixed(2);
    out.runs.push({ label, v, a: r(ta), b: r(tb), c: r(tc) });
  }
  await change(1.05, 'd first change');
  for (const v of [1.1, 1.15, 1.2]) { await sleep(1000); await change(v, 'warm, gas shown'); }
  document.querySelector('button[data-scenario="smr2"]').click();
  await sleep(300);
  await waitFor(sens, () => !pend());
  for (const v of [1.25, 1.3, 1.35]) { await sleep(1000); await change(v, 'warm, 2 SMR shown'); }
  return out;
})()`;

try {
  await send("Page.enable");
  await send("Storage.clearDataForOrigin", { origin: new URL(URL_).origin, storageTypes: "all" });
  await send("Page.navigate", { url: URL_ });
  await sleep(500);
  const cores = await evaluate("navigator.hardwareConcurrency");
  const out = await evaluate(PROBE);
  console.log(JSON.stringify({ label: LABEL, url: URL_, browser: "headless Chrome 155", cores, ...(out as object) }));
} finally {
  ws.close();
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
