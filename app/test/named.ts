// R-UI-5's check of a view's controls, shared by the tests of the panel and the import-price page.
import assert from "node:assert/strict";

/** Every control in `html` has an accessible name: its aria-label, a <label for>, or — a checkbox —
 * the text of the <label> around it, whose first control it must be (a "?" button before it would
 * take the label's name and click). */
export function assertNamed(html: string, where: string): void {
  const labelled = new Set([...html.matchAll(/<label for="([^"]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
    const attrs = m[2];
    const id = /id="([^"]+)"/.exec(attrs)?.[1];
    let named = /aria-label="[^"]+"/.test(attrs) || (id !== undefined && labelled.has(id));
    if (!named && /type="checkbox"/.test(attrs)) {
      const open = html.lastIndexOf("<label", m.index);
      const close = html.indexOf("</label>", m.index);
      const before = html.slice(open, m.index);
      named = open >= 0 && !before.includes("</label>") && !before.includes("<button") && html.slice(open, close).replace(/<[^>]+>/g, "").trim().length > 0;
    }
    assert.ok(named, `${where}: <${m[1]}${attrs}> has no name`);
  }
  for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    assert.ok(/aria-label="[^"]+"/.test(m[1]) || m[2].replace(/<[^>]+>/g, "").trim().length > 0, `${where}: a button without a name`);
  }
}
