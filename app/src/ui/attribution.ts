// R-LINK-6: the reasons behind an observed year's offered capacity, as labels beside the border
// panel (R-APP-3): ENTSO-E A78 events and Nord Pool UMM messages, deduplicated and without the
// RU/BY/KAL borders in the export (R-DATA-11). They explain the profile; they do not alter it.

import { t } from "./i18n.ts";
import { fmt } from "./labels.ts";

import type { Attribution } from "../worker/outages.ts";
import { utc } from "../worker/outages.ts";

// the file's shape and the what-ifs' masks are the worker's (worker/outages.ts), so that the worker holds no
// interface text (D-237); they are named here as before
export type { A78, Attribution } from "../worker/outages.ts";
export { outMasks } from "../worker/outages.ts";

interface Label { start: string; end: string; what: string; ways: string[]; reason: string | null }

const hours = (a: string, b: string) => (utc(b) - utc(a)) / 3_600_000;

/** A border's events of at least `min` hours, the longest `max` of them by start; the two
 * directions of one event are one label. */
export function labels(att: Attribution, border: string, min = 24, max = 12): { items: Label[]; more: number } {
  const [a, b] = border.split("-");
  const way = (fwd: boolean) => (fwd ? `${a}→${b}` : `${b}→${a}`);
  const all = new Map<string, Label>();
  const put = (key: string, start: string, end: string, what: string, w: string, reason: string | null) => {
    const l = all.get(key) ?? { start, end, what, ways: [], reason };
    if (!l.ways.includes(w)) l.ways.push(w);
    all.set(key, l);
  };
  for (const e of att.a78) {
    if (e.border !== border || hours(e.start, e.end) < min) continue;
    const left = e.mw_available === null ? "" : ` ${t("{x} MW left", { x: fmt(e.mw_available, 0) })}`;
    put(`a78|${e.asset}|${e.start}|${e.end}|${e.planned}`, e.start, e.end, `${e.asset}, ${e.planned ? t("planned") : t("outage")}`, `${way(e.direction === "fwd")}${left}`, e.reason);
  }
  for (const u of att.umm) {
    const fwd = u.from === a && u.to === b;
    if (!(fwd || (u.from === b && u.to === a)) || hours(u.start, u.stop) < min) continue;
    const mw = u.available_mw === null ? "" : ` ${u.installed_mw === null ? `${fmt(u.available_mw, 0)} MW` : t("{a} of {b} MW", { a: fmt(u.available_mw, 0), b: fmt(u.installed_mw, 0) })}`;
    put(`umm|${u.start}|${u.stop}|${u.reason}`, u.start, u.stop, "UMM", `${way(fwd)}${mw}`, u.reason);
  }
  const longest = [...all.values()].sort((x, y) => hours(y.start, y.end) - hours(x.start, x.end) || x.start.localeCompare(y.start));
  return { items: longest.slice(0, max).sort((x, y) => x.start.localeCompare(y.start)), more: Math.max(0, longest.length - max) };
}
