// A region redrawn with innerHTML keeps what the reader was doing (R-UI-5): the control that had the
// focus gets it back when the new markup holds the same control — found by its id, or else by its
// data attributes (a chip, a tab, a scenario's button) and its place among the controls that share
// them (a choice offered in two groups, a source cited twice) — so a keyboard user can keep moving a
// slider or walking a group of chips while the page recomputes.

/** A selector that finds the same control in fresh markup, or null. */
function focusKey(el: Element): string | null {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const data = el.getAttributeNames().filter((a) => a.startsWith("data-"));
  if (!data.length) return null;
  return el.tagName.toLowerCase() + data.map((a) => `[${a}="${CSS.escape(el.getAttribute(a) ?? "")}"]`).join("");
}

export function redraw(root: HTMLElement, html: string): void {
  const active = document.activeElement;
  const key = active && active !== document.body && root.contains(active) ? focusKey(active) : null;
  const nth = key ? Array.prototype.indexOf.call(root.querySelectorAll(key), active) : -1;
  root.innerHTML = html;
  if (key) (root.querySelectorAll<HTMLElement>(key)[Math.max(0, nth)] ?? root.querySelector<HTMLElement>(key))?.focus({ preventScroll: true });
}

/** An element replaced by its new self — `html` holds one element — keeping the focus as `redraw` does: a part of a
 * page drawn again without the parts around it (D-235). */
export function swap(el: HTMLElement, html: string): HTMLElement {
  const active = document.activeElement;
  const key = active && active !== document.body && el.contains(active) ? focusKey(active) : null;
  const nth = key ? Array.prototype.indexOf.call(el.querySelectorAll(key), active) : -1;
  const box = document.createElement("template");
  box.innerHTML = html;
  const fresh = box.content.firstElementChild as HTMLElement;
  el.replaceWith(fresh);
  if (key) (fresh.querySelectorAll<HTMLElement>(key)[Math.max(0, nth)] ?? fresh.querySelector<HTMLElement>(key))?.focus({ preventScroll: true });
  return fresh;
}
