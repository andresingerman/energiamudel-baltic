// Builds index.html from template.html with the Links map as the application draws it: app/src/ui/panel.ts's own
// SVG for the opening scenario's Estonian panel, and each line's border and name from the presets. Run from the
// repository's root:
//   node --no-maglev spikes/line-glow/build.ts
import { readFileSync, writeFileSync } from "node:fs";
import { presets } from "../../app/scripts/data.ts";
import { opening } from "../../app/src/state/model.ts";
import { panelHtml } from "../../app/src/ui/panel.ts";

const p = presets();
const html = panelHtml({ p, sources: { documents: {}, families: {}, records: {} }, state: opening(p), country: "EE", set() {}, select() {} });
// the map's own </svg>, not a flag's: the switches' list follows it
const map = html.match(/<svg class="lmap"[\s\S]*?<\/svg>(?=\s*<div class="lswitches")/)![0];
const keys = [...map.matchAll(/data-switch="([^"]+)"/g)].map((m) => m[1]);
const lines = Object.fromEntries(keys.map((k) => [k, { border: p.links.lines[k].border, name: p.links.lines[k].name }]));
const here = new URL(".", import.meta.url);
const out = readFileSync(new URL("template.html", here), "utf8")
  .replace("/*MAP*/", () => JSON.stringify(map)).replace("/*LINES*/", () => JSON.stringify(lines));
writeFileSync(new URL("index.html", here), out);
console.log(`index.html: ${keys.length} lines, ${out.length} characters`);
