// The documentation views (R-APP-9): methodology.md rendered in the page (the questions and answers until D-337), and the Sources
// view from sources.json — the register the export generates from the lineage records — with a row
// per source family and per document that the panel's source buttons link to. The Markdown reader
// covers what the documents use: headings, paragraphs, lists with continued lines, pipe tables,
// **bold**, *italic*, `code` and [links](https://…), and a list item opened by [✓ …] or [✗ …] as a
// check's status (D-197); HTML in the text is escaped. No dependency (R-NFR-6).

import { lang, t } from "./i18n.ts";
import type { Sources } from "./labels.ts";
import { REPO, esc } from "./labels.ts";
import { GA_ID } from "./consent.ts";

const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function inline(t: string): string {
  const code: string[] = [];
  return esc(t)
    .replace(/`([^`]+)`/g, (_, c: string) => `\u0000${code.push(c) - 1}\u0000`)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?![\w*])/g, "$1<em>$2</em>")
    .replace(/\u0000(\d+)\u0000/g, (_, i: string) => `<code>${code[Number(i)]}</code>`);
}

const ITEM = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
/** A list item opened by [✓ met] or [✗ not met]: the check's status as a chip on its sign's fill (D-197). */
function item(t: string): string {
  const m = /^\[([✓✗]) ([^\]]+)\]\s*(.*)$/.exec(t);
  return m ? `<span class="st ${m[1] === "✓" ? "ok" : "bad"}">${m[1]} ${esc(m[2])}</span> ${inline(m[3])}` : inline(t);
}
const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function markdown(src: string): string {
  // JavaScript's "." stops at U+2028 and U+2029: as spaces they cannot leave a heading unmatched
  const lines = src.replace(/\r/g, "").replace(/[\u2028\u2029]/g, " ").split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length;) {
    const l = lines[i];
    const h = /^(#{1,4})\s+(.*)$/.exec(l);
    if (!l.trim()) i++;
    else if (h) { out.push(`<h${h[1].length} id="${slug(h[2])}">${inline(h[2])}</h${h[1].length}>`); i++; }
    else if (/^-{3,}\s*$/.test(l)) { out.push("<hr>"); i++; }
    else if (l.startsWith("|")) {
      const rows: string[][] = [];
      for (; i < lines.length && lines[i].startsWith("|"); i++) if (!/^\|[\s|:-]+\|?\s*$/.test(lines[i])) rows.push(cells(lines[i]));
      const [head, ...body] = rows;
      if (!head) continue; // only a separator line: nothing to show
      out.push(`<table class="md"><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) =>
        `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
    } else if (ITEM.test(l)) {
      const [, indent, mark] = ITEM.exec(l)!;
      const items: string[] = [];
      for (; i < lines.length; i++) {
        const m = ITEM.exec(lines[i]);
        if (m && m[1].length === indent.length) items.push(m[3]);
        else if (items.length && /^\s+\S/.test(lines[i])) items[items.length - 1] += ` ${lines[i].trim()}`;
        else break;
      }
      const tag = /\d/.test(mark) ? "ol" : "ul";
      out.push(`<${tag}>${items.map((t) => `<li>${item(t)}</li>`).join("")}</${tag}>`);
    } else {
      const para: string[] = [];
      for (; i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\|)/.test(lines[i]) && !ITEM.test(lines[i]); i++) para.push(lines[i].trim());
      if (!para.length) para.push(lines[i++].trim()); // a line no rule above took: text, and the reader moves on
      out.push(`<p>${inline(para.join(" "))}</p>`);
    }
  }
  return out.join("\n");
}

/** Values no published source gives (R-PROV-2): the owner's, as the register lists them. */
const OWN: Record<string, string> = {
  specification: t("The specification (docs/SPECIFICATION.md): a value the owner set, cited to the section that sets it"),
  v3_presets: t("v3's presets (data/documentary/v3_presets.json): the owner's scenarios carried over from v3, labelled as the owner's"),
};

/** The Sources row of a lineage id: its document's, the owner's assumptions, its family's, else its
 * first input's (a value the pipeline derived). */
export function sourceRow(src: Sources, id: string, depth = 0): string | null {
  const r = src.records[id];
  if (!r) return null;
  const doc = r.derived_from.find((d) => src.documents[d]);
  if (doc) return `src-${doc}`;
  if (OWN[r.source]) return `src-${r.source}`;
  const fam = id.split(".")[0];
  if (src.families[fam]) return `src-${fam}`;
  return depth < 3 && r.derived_from.length ? sourceRow(src, r.derived_from[0], depth + 1) : null;
}

/** The Sources view's row a link names: a lineage id resolved as the panel's links are, a row's own
 * id as it stands (the Statistics and Weather pages link by lineage id). */
export const gotoRow = (src: Sources, id: string): string => sourceRow(src, id) ?? id;

export function sourcesHtml(src: Sources): string {
  // every licence a family's records carry, not its first record's (JAO's Nordic and Core tools)
  const licence = new Map<string, Set<string>>();
  for (const [id, r] of Object.entries(src.records)) {
    const fam = id.split(".")[0];
    if (!licence.has(fam)) licence.set(fam, new Set());
    if (r.licence) licence.get(fam)!.add(r.licence);
  }
  const link = (url: string, text: string) => (url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text));
  const fams = Object.entries(src.families).sort(([, a], [, b]) => a.name.localeCompare(b.name));
  const docs = Object.entries(src.documents).sort(([, a], [, b]) => a.title.localeCompare(b.title));
  // the documents grouped by their title's first letter under an index of the letters, and a search box that keeps the
  // rows holding every word typed — in the page, nothing sent (D-197)
  const groups: [string, typeof docs][] = [];
  for (const e of docs) {
    const first = e[1].title[0].toUpperCase();
    if (groups.at(-1)?.[0] !== first) groups.push([first, []]);
    groups.at(-1)![1].push(e);
  }
  const pills: [string, string, number][] = [["measured", t("Measured sources"), fams.length], ["own", t("The owner's assumptions"), Object.keys(OWN).length], ["documents", t("Published documents"), docs.length]];
  return `<h1>${t("Sources")}</h1>
    <p>${t("Every source the model uses, from the lineage records the pipeline writes at each fetch (<code>data/lineage/</code>); the same register is <code>docs/SOURCE_REGISTER.md</code> in the repository. A panel's <em>i</em> button names a value's source and links to its row here.")}${lang === "et" ? ` ${t("The sources' descriptions are in English, as their publishers give them.")}` : ""}</p>
    <nav class="src-pills" aria-label="${t("Contents")}">${pills.map(([id, label, n]) => `<button type="button" class="toc-pill" data-toc="${id}">${label}<span>${n}</span></button>`).join("")}</nav>
    <h2 id="measured">${t("Measured sources: fetched from an API or a published file ({n})", { n: fams.length })}</h2>
    <table class="md src3"><thead><tr><th>${t("source and access")}</th><th>${t("what the model uses it for")}</th><th>${t("licence")}</th></tr></thead><tbody>${fams.map(([k, f]) =>
    `<tr id="src-${esc(k)}"><td>${link(f.url, f.name)}<span class="src-access">${esc(f.access)}</span></td><td>${esc(f.purpose)}</td><td>${[...(licence.get(k) ?? [])].map(esc).join("<br>")}</td></tr>`).join("")}</tbody></table>
    <h2 id="own">${t("The owner's assumptions")}</h2>
    <table class="md"><thead><tr><th>${t("source")}</th><th>${t("values, by where they are set")}</th></tr></thead><tbody>${Object.entries(OWN).map(([k, text]) =>
    `<tr id="src-${k}"><td>${esc(text)}</td><td class="src-vals">${[...new Set(Object.values(src.records).filter((r) => r.source === k).map((r) => r.page ?? ""))].sort().map((v) => `<code>${esc(v)}</code>`).join(" ")}</td></tr>`).join("")}</tbody></table>
    <h2 id="documents">${t("Published documents: cached, each value cited to its page ({n})", { n: docs.length })}</h2>
    <div class="src-find"><input type="search" id="src-find" placeholder="${t("Search a document or its key")}" aria-label="${t("Search a document or its key")}">
      <nav class="src-letters" aria-label="${t("Letters")}">${groups.map(([l]) => `<button type="button" class="toc-letter" data-toc="src-letter-${esc(l)}">${esc(l)}</button>`).join("")}</nav></div>
    <table class="md src-docs"><thead><tr><th>${t("document")}</th><th>${t("key")}</th></tr></thead>${groups.map(([l, rows]) =>
    `<tbody><tr class="src-letter" id="src-letter-${esc(l)}"><th colspan="2">${esc(l)}<span>${rows.length}</span></th></tr>${rows.map(([k, d]) =>
      `<tr id="src-${esc(k)}"><td>${link(d.url, d.title)}</td><td><code>${esc(d.key)}</code></td></tr>`).join("")}</tbody>`).join("")}</table>`;
}

/** The Sources view's search (D-197): a document's row stays when its title or key holds every word typed, a letter's
 * group when one of its rows stays. */
export function filterSources(root: ParentNode, q: string): void {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  for (const g of root.querySelectorAll<HTMLElement>(".src-docs tbody")) {
    let any = false;
    for (const r of g.querySelectorAll<HTMLElement>("tr:not(.src-letter)")) {
      const text = (r.textContent ?? "").toLowerCase();
      r.hidden = !words.every((w) => text.includes(w));
      any ||= !r.hidden;
    }
    g.hidden = !any;
  }
}

export type DocTab = "methodology" | "full" | "sources";
/** In Estonian the methodology's short summary first and the full text, in English, beside it (D-142). */
const DOC_TABS: [DocTab, string][] = [["methodology", t("Methodology")], ...(lang === "et" ? [["full", t("The full methodology")] as [DocTab, string]] : []),
  ["sources", t("Sources")]];

export function docsHtml(tab: DocTab, body: string): string {
  // under the tabs, on each of them, where the model's code is (D-334)
  // a contents rail beside the long texts (D-197): the sections, and the full methodology's subsections under them;
  // buttons, so that the page's address keeps the scenario
  const heads = [...body.matchAll(/<h([23]) id="([^"]+)">(.*?)<\/h\1>/g)].filter((m) => m[1] === "2" || tab === "full");
  const rail = tab !== "sources" && heads.length >= 3 ? `<nav class="doc-toc" aria-label="${t("Contents")}"><p class="doc-toc-h">${t("Contents")}</p><ol>${heads.map(([, level, id, text]) =>
    `<li class="l${level}"><button type="button" class="toc-link" data-toc="${id}">${text}</button></li>`).join("")}</ol></nav>` : "";
  return `<div class="tabs" role="group" aria-label="${t("Document shown")}">${DOC_TABS.map(([k, label]) =>
    `<button type="button" class="seg" data-doc="${k}" aria-pressed="${k === tab}">${label}</button>`).join("")}</div>
    <p class="note doc-repo">${t("The model's code, data and documents are open on GitHub:")} <a href="https://${REPO}" target="_blank" rel="noopener">${REPO}</a>${GA_ID ? ` · <button type="button" class="linkish" data-act="consent">${t("Visit statistics: your choice")}</button>` : ""}</p>
    <div class="doc-card">${rail}<article class="doc${tab === "sources" ? " wide" : ""}">${body}</article></div>`;
}
