// The documentation views (R-APP-9): the Markdown reader on what the documents use, and a Sources
// row for every source a panel value names.
import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { EXPORT, presets, readJson } from "../scripts/data.ts";
import type { Sources } from "../src/ui/labels.ts";
import { docsHtml, gotoRow, markdown, sourceRow, sourcesHtml } from "../src/ui/docs.ts";
import { statisticsHtml } from "../src/ui/statistics.ts";
import { weatherHtml } from "../src/ui/weather.ts";

test("the Markdown reader: headings, lists with continued lines, tables, inline marks, escaping", () => {
  const h = markdown(["# Title", "", "A *word* and **more** with `<year>` and [a link](https://x.ee/a?b=1&c=2).", "",
    "1. one", "   continued", "2. two", "", "| a | b |", "|---|---|", "| 1 | <2> |"].join("\n"));
  assert.ok(h.includes('<h1 id="title">Title</h1>'));
  assert.ok(h.includes("<em>word</em>") && h.includes("<strong>more</strong>") && h.includes("<code>&lt;year&gt;</code>"));
  assert.ok(h.includes('<a href="https://x.ee/a?b=1&amp;c=2" target="_blank" rel="noopener">a link</a>'));
  assert.ok(h.includes("<ol><li>one continued</li><li>two</li></ol>"));
  assert.ok(h.includes("<th>a</th><th>b</th>") && h.includes("<td>&lt;2&gt;</td>"));
});

test("the Markdown reader always moves on: a separator-only table, a heading with U+2028, a lone '#'", () => {
  assert.equal(markdown("|---|---|\n\nafter"), "<p>after</p>");
  assert.equal(markdown("# a\u2028b"), '<h1 id="a-b">a b</h1>');
  assert.equal(markdown("#"), "<p>#</p>"); // no heading text: a paragraph, not a loop
});

test("a check's status chip, the contents rail of a long text, the Sources' documents by letter with a search box (D-197)", () => {
  const h = markdown("- [✗ not met] The gate.\n- [✓ met] The cable.\n- plain [x] item");
  assert.ok(h.includes('<li><span class="st bad">✗ not met</span> The gate.</li>'));
  assert.ok(h.includes('<li><span class="st ok">✓ met</span> The cable.</li>'));
  assert.ok(h.includes("<li>plain [x] item</li>"));
  const page = docsHtml("methodology", markdown("# T\n\n## One\n\nx\n\n## Two\n\n### Two a\n\n## Three"));
  assert.equal((page.match(/class="toc-link" data-toc="/g) ?? []).length, 3); // the sections; a subsection only in the full text
  assert.equal((docsHtml("full", markdown("# T\n\n## One\n\n## Two\n\n### Two a\n\n## Three")).match(/class="toc-link"/g) ?? []).length, 4);
  const src = readJson<Sources>(join(EXPORT, "sources.json.gz"));
  const html = sourcesHtml(src);
  assert.doesNotMatch(docsHtml("sources", html), /class="doc-toc"/);
  assert.match(html, /<input type="search" id="src-find"/);
  const letters = [...html.matchAll(/<tr class="src-letter" id="src-letter-([^"]+)">/g)].map((m) => m[1]);
  assert.ok(letters.length > 10 && letters[0] === "A", letters.join(""));
  assert.equal((html.match(/class="toc-letter"/g) ?? []).length, letters.length);
});

test("every source a panel value names has its row in the Sources view", () => {
  const src = readJson<Sources>(join(EXPORT, "sources.json.gz"));
  const html = sourcesHtml(src);
  const ids = new Set<string>();
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) { if (k === "src" && Array.isArray(v)) v.forEach((id) => ids.add(String(id))); else walk(v); }
  };
  walk(presets());
  assert.ok(ids.size > 100, `${ids.size} ids`);
  const missing = [...ids].filter((id) => { const r = sourceRow(src, id); return !r || !html.includes(`id="${r}"`); });
  assert.deepEqual(missing, []);
});

test("every Sources link on the Statistics and Weather pages reaches its row, and a family names all its licences", () => {
  const src = readJson<Sources>(join(EXPORT, "sources.json.gz"));
  const html = sourcesHtml(src);
  const p = presets();
  const goto = [...statisticsHtml(p, src).matchAll(/data-goto="([^"]+)"/g), ...weatherHtml(p, src).matchAll(/data-goto="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(goto.length > 40, `${goto.length} links`);
  assert.deepEqual(goto.filter((id) => !html.includes(`id="${gotoRow(src, id)}"`)), []);
  assert.equal(gotoRow(src, "src-ecb"), "src-ecb"); // a row's own id, as the panel's links carry it
  const jao = html.match(/<tr id="src-jao">.*?<\/tr>/)?.[0] ?? "";
  // each licence on its own line: JAO's own terms carry semicolons (E-129)
  const terms = [...new Set(Object.entries(src.records).filter(([k]) => k.startsWith("jao.")).map(([, r]) => r.licence))];
  assert.equal(terms.length, 2, "JAO's two tools' terms");
  assert.ok(jao.includes(`<td>${terms.join("<br>")}</td>`), jao);
});
