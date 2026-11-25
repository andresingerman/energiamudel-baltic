// An observed year's outage file (R-LINK-6, R-DATA-11) as the worker reads it: its shape, and the hours each cable
// was out, by which a what-if on EstLink 1 or 2 splits an offer between the two (ERRATA E-046, E-047). The labels the
// page shows beside a border are the interface's (ui/attribution.ts); this file holds no interface text, so that the
// worker's bundle does not change with it (D-237).

export interface A78 { asset: string; border: string; direction: "fwd" | "rev"; start: string; end: string; mw_available: number | null; planned: boolean; reason: string | null }
export interface Umm { from: string; to: string; start: string; stop: string; available_mw: number | null; installed_mw: number | null; reason: string | null }
export interface Attribution { a78: A78[]; umm: Umm[] }

export const utc = (t: string) => Date.parse(`${t.replace(" ", "T")}Z`);

/** A line's own A78 events in each hour of an observed year, per direction — 0 none, 1 planned,
 * 2 forced — by which the what-ifs split an offer between two cables (ERRATA E-046, E-047). A78
 * names a cable as "Estlink1", the catalogue as "estlink1". */
export function outMasks(att: Attribution, year: number, hours: number, keys: string[]): Record<string, { fwd: Uint8Array; rev: Uint8Array }> {
  const t0 = Date.UTC(year, 0, 1);
  const out: Record<string, { fwd: Uint8Array; rev: Uint8Array }> = {};
  for (const k of keys) out[k] = { fwd: new Uint8Array(hours), rev: new Uint8Array(hours) };
  for (const e of att.a78) {
    const k = e.asset.toLowerCase().replace(/\s+/g, "");
    if (!out[k]) continue;
    const from = Math.max(0, Math.floor((utc(e.start) - t0) / 3_600_000));
    const to = Math.min(hours, Math.ceil((utc(e.end) - t0) / 3_600_000));
    const kind = e.planned ? 1 : 2;
    for (let h = from; h < to; h++) if (out[k][e.direction][h] < kind) out[k][e.direction][h] = kind;
  }
  return out;
}
