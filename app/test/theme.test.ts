// R-UI-5: every text colour of the theme and of print against every surface it sits on, at least 4.5:1
// (WCAG 2 relative luminance), read off src/ui/theme.css itself.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../src/ui/theme.css", import.meta.url), "utf8");

function tokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]));
}
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

test("text colours reach 4.5:1 on every surface, on the screen and in print; one theme, the light one (D-196)", () => {
  const screen = tokens(css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {"))));
  const print = tokens(css.slice(css.indexOf("@media print"), css.indexOf("}", css.indexOf("@media print") + 20)));
  for (const [name, t] of [["screen", screen], ["print", print]] as const) {
    for (const fg of ["ink", "muted", "accent", "amber", "green", "red"]) {
      for (const bg of ["bg", "surface", "surface2"]) {
        const r = contrast(t[fg], t[bg]);
        assert.ok(r >= 4.5, `${name}: ${fg} on ${bg} is ${r.toFixed(2)}:1`);
      }
    }
  }
  assert.ok(contrast(screen["on-accent"], screen.accent) >= 4.5);
  // the words inside the lines' switches: ON on green, OFF on red (the v4 panel, 2026-09-29)
  for (const bg of ["green", "red"]) assert.ok(contrast(screen["on-accent"], screen[bg]) >= 4.5, `on-accent on ${bg}`);
  // no dark theme left to switch to, nor the system's to follow
  assert.doesNotMatch(css, /prefers-color-scheme|data-theme/);
  assert.doesNotMatch(readFileSync(new URL("../index.html", import.meta.url), "utf8"), /id="theme"/);
});
