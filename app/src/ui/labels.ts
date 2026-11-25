// Interface text: names of paths, profiles and groups, and the source behind a lineage id (R-UI-6,
// R-APP-9) read from sources.json.
import { lang, t } from "./i18n.ts";

/** Text into HTML: the five characters that would otherwise be markup (every innerHTML sink). */
export const esc = (t: string): string => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);


export const FUEL: Record<string, string> = {
  eraa2025_final: "ERAA 2025", svk_lma_2026: "Svenska kraftnät LMA 2026", tyndp2024_matrix: t("TYNDP 2024 price matrix"),
};
export const PROFILE: Record<string, string> = {
  DE: "Distributed Energy", GA: "Global Ambition", NT: "National Trends", NTplus: "National Trends+", REAL: t("actual prices"),
  TIGHT: t("tight case, each on its own"), TIGHTJ: t("tight case, all at once"),
};
export const FAMILY: Record<string, string> = { tyndp2024: "TYNDP 2024", tyndp2026: "TYNDP 2026" };
export const GROUP_LABEL: Record<string, string> = {
  nuclear: t("nuclear"), wind: t("wind"), solar: t("solar"), hydro: t("hydro"), storage: t("storage"), oil_shale: t("oil shale"),
  gas: t("gas"), bio_waste: t("biomass and waste"), other: t("other"),
};

export interface Sources {
  documents: Record<string, { key: string; title: string; url: string }>;
  families: Record<string, { name: string; url: string; access: string; purpose: string }>;
  records: Record<string, { source: string; endpoint: string; page: string | null; fetched: string; licence: string; derived_from: string[] }>;
}

/** One line per lineage id: what it is and where to find it. */
export function describe(src: Sources, id: string): { text: string; url: string | null } {
  const r = src.records[id];
  if (!r) return { text: id, url: null };
  const doc = r.derived_from.map((d) => src.documents[d]).find(Boolean);
  if (doc) return { text: `${doc.title}${r.page ? `, ${r.page}` : ""}`, url: r.endpoint || doc.url };
  const fam = src.families[id.split(".")[0]];
  if (r.source === "pipeline") return { text: t("derived by the pipeline from {n} input(s): {id}", { n: r.derived_from.length, id }), url: null };
  return { text: `${fam?.name ?? r.source} (${id}, ${t("fetched")} ${r.fetched})`, url: r.endpoint || fam?.url || null };
}

export const fmt = (x: number, digits = 1): string => {
  if (!Number.isFinite(x)) return "–";
  // thousands apart by a space; the decimal point a comma in Estonian
  const g = Math.abs(x).toLocaleString("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replaceAll(",", " ");
  const t = lang === "et" ? g.replace(".", ",") : g;
  // the typographic minus the signed figures carry; none on a figure that rounds to zero
  return x < 0 && /[1-9]/.test(t) ? `−${t}` : t;
};

/** A change or a balance with its sign, + or −; none on one that rounds to zero ("+0", "−0.0"). */
export const signed = (x: number, digits = 1): string => {
  const t = fmt(Math.abs(x), digits);
  return /[1-9]/.test(t) ? `${x > 0 ? "+" : "−"}${t}` : t;
};
