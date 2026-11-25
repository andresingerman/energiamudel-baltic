// One small stroked glyph per source, for the panel's rows (the owner asked, 2026-10-05; D-060).
// Ported from v3 (`energiamudel`, app/src/ui/techIcons.js): the paths are Lucide's (ISC,
// app/public/ISC-lucide.txt, at the site's root: the host keeps /icons/ for its own, ERRATA E-196)
// except the mine cart of oil shale and the two wind turbines, which
// are drawn here. Each takes the colour of its generation group through the theme's
// custom properties, so the charts and the panel name a source by the same colour.
// a wind turbine: hub, three blades at 120°, the tower (the owner asked, 2026-10-21); plain paths, which drawIcon reads
const ROTOR = '<circle cx="12" cy="9" r="1.3"/><path d="M12 7.6V2"/><path d="M13.2 9.7l4.9 2.8"/><path d="M10.8 9.7l-4.9 2.8"/>';
const WIND = ROTOR + '<path d="M12 10.4V22"/><path d="M8.5 22h7"/>';

const ICONS: Record<string, [paths: string, colour: string]> = {
  nuclear: ['<circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>'
    + '<path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/>'
    + '<path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/>', "--g-nuclear"],
  wind_onshore: [WIND, "--g-wind"],
  // the turbine standing in the sea: a shorter tower over a wave
  wind_offshore: [ROTOR + '<path d="M12 10.4V18"/><path d="M2 20.5c1.7-1.5 3.3-1.5 5 0s3.3 1.5 5 0 3.3-1.5 5 0 3.3 1.5 5 0"/>', "--g-wind"],
  solar: ['<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>', "--g-solar"],
  battery: ['<rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 11v2"/><path d="M6 11v2M10 11v2"/>', "--g-storage"],
  // oil shale is mined: a loaded mine cart, hand-drawn in v3
  oil_shale: ['<path d="M6.5 9.5 8.5 7l2 2 2-2.5 2 3 2-1.5"/><path d="M3.5 11h17l-2 5.5h-13z"/><circle cx="8.5" cy="19.2" r="1.7"/><circle cx="15.5" cy="19.2" r="1.7"/>', "--g-oil_shale"],
  gas: ['<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>', "--g-gas"],
  biomass: ['<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.7 4.5-7.5C9 11.7 12 10 14 8"/>', "--g-bio_waste"],
  waste: ['<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6M14 11v6"/>', "--g-bio_waste"],
  hydro: ['<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>', "--g-hydro"],
  // CO₂: Lucide's cloud
  co2: ['<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>', "--ink"],
  demand: ['<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>', "--ink"],
  // a constant load, data centres for one: a server
  load: ['<rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 6h.01M6 18h.01"/>', "--ink"],
};

/** The icon of an engine class or of a row of a fleet preset's source; none for one without. */
const KEY: Record<string, string> = {
  oil_shale_auvere: "oil_shale", oil_shale_cfb: "oil_shale", oil_shale_pf: "oil_shale", capacity_mechanism: "gas",
  biomass_chp: "biomass", hydro_ror: "hydro", hydro_daugava: "hydro", hydro_ps: "hydro",
  // the observed years' other classes (D-083): retort gas burns with the oil shale, the rest are small thermal plants
  retort_gas: "oil_shale", other: "gas", other_renewable: "biomass", peat: "biomass", oil: "gas", coal_gas: "oil_shale",
};

export function icon(key: string, size = 15): string {
  const k = ICONS[key] ? key : KEY[key] ?? (key.startsWith("gas_") ? "gas" : "");
  const i = ICONS[k];
  return i ? `<svg class="ico" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color:var(${i[1]})" aria-hidden="true">${i[0]}</svg>` : "";
}

/** A generation group's glyph on the charts (D-097): the panel's icon of the group's main source. */
export const GROUP_ICON: Record<string, string> = {
  oil_shale: "oil_shale", nuclear: "nuclear", bio_waste: "biomass", wind: "wind_onshore", gas: "gas", hydro: "hydro", solar: "solar", storage: "battery",
};

/** An icon's strokes on a canvas, centred at (x, y), `size` pixels across, in `colour`: the same
 * paths as the panel's SVG, so the two cannot drift apart. */
export function drawIcon(ctx: CanvasRenderingContext2D, key: string, x: number, y: number, size: number, colour: string): void {
  const i = ICONS[key];
  if (!i) return;
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  for (const m of i[0].matchAll(/<(path|circle|rect)([^>]*)\/>/g)) {
    const a: Record<string, string> = Object.fromEntries([...m[2].matchAll(/([\w-]+)="([^"]*)"/g)].map((x) => [x[1], x[2]]));
    const n = (k: string) => Number(a[k] ?? 0);
    const path = new Path2D();
    if (m[1] === "path") path.addPath(new Path2D(a.d));
    else if (m[1] === "circle") path.arc(n("cx"), n("cy"), n("r"), 0, 2 * Math.PI);
    // Path2D.roundRect is Safari 16's and Firefox 112's; before them the battery is square-cornered
    else if (path.roundRect) path.roundRect(n("x"), n("y"), n("width"), n("height"), n("rx"));
    else path.rect(n("x"), n("y"), n("width"), n("height"));
    if (a.fill === "currentColor") ctx.fill(path);
    else ctx.stroke(path);
  }
  ctx.restore();
}

