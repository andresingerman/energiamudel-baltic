// The charts of R-APP-1 (Chart.js 4, only the parts used): generation by week against
// consumption (the full width), the energy mix of the three zones (a horizontal bar each with its CO₂ in
// a scenario, D-197; bars beside the actual year's in a replay), the price duration curve, and the
// monthly average and median price — one chart in a scenario, the average or the median as bars at a
// switch (D-202; both on it, D-197), each on its own with the observed price in a replay (R-APP-2). The
// generation groups wear their own colours (the owner's request, D-029) in a stack order that keeps
// neighbours apart for colour-blind readers; every legend lists the groups top of the stack first. The
// three climate years wear a colour each wherever they are series (D-197).

import {
  BarController, BarElement, CategoryScale, Chart, Filler, Legend, LinearScale, LineController,
  LineElement, PointElement, Tooltip,
} from "chart.js";
import type { BorderView, Group, RunView, ZoneView } from "../worker/view.ts";
import { GROUPS } from "../worker/view.ts";
import { GROUP_LABEL, fmt } from "./labels.ts";
import { lang, t } from "./i18n.ts";

Chart.register(BarController, BarElement, CategoryScale, Filler, Legend, LinearScale, LineController,
  LineElement, PointElement, Tooltip);

const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const color = (g: Group) => css(`--g-${g}`);
/** A climate year's own colour (theme.css `--y-1995` …, D-197), else the fallback: an actual year, a set of other years. */
const yearColour = (label: string, fallback: string) => css(`--y-${label}`) || fallback;
/** The net import's texture (D-197): not a generation group, so a hatch of the muted ink rather than a hue of its own. */
function hatch(colour: string): CanvasPattern | string {
  const c = document.createElement("canvas");
  c.width = c.height = 6;
  const x = c.getContext("2d");
  if (!x) return colour;
  x.strokeStyle = colour;
  x.lineWidth = 1;
  x.beginPath();
  for (const o of [-6, 0, 6]) { x.moveTo(o, 6); x.lineTo(o + 6, 0); }
  x.stroke();
  return x.createPattern(c, "repeat") ?? colour;
}
/** A #rrggbb token with an alpha, for a fill under a line. */
const alpha = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; };
/** A generation group's fill: its colour at v3's two-thirds opacity (charts.js, `c + 'aa'`; D-053). */
const fillOf = (g: Group) => alpha(color(g), 0.67);

const charts = new Map<string, { destroy(): void }>();

function draw(id: string, config: ConstructorParameters<typeof Chart>[1]): void {
  // the chart drawn before goes first, also when its canvas has gone with the view that held it
  charts.get(id)?.destroy();
  charts.delete(id);
  const canvas = document.getElementById(id) as HTMLCanvasElement | null;
  if (!canvas) return;
  Chart.defaults.color = css("--muted");
  Chart.defaults.borderColor = css("--line");
  Chart.defaults.font.family = css("--num");
  Chart.defaults.font.size = 11;
  if (lang === "et") Chart.defaults.locale = "et"; // the axes' figures as the page writes them: "0,5", "15 000"
  const own = (config.options?.plugins?.legend ?? {}) as { labels?: object; position?: "right" };
  // a narrow window's chart has no room for a legend beside it (D-143)
  const under = own.position === "right" && globalThis.matchMedia?.("(max-width: 900px)").matches;
  const legend = { ...own, ...(under ? { position: "bottom" as const } : {}), labels: { color: css("--ink"), boxWidth: 12, ...(own.labels ?? {}) } };
  charts.set(id, new Chart(canvas, { ...config, options: { animation: false, responsive: true, maintainAspectRatio: false, ...config.options,
    plugins: { ...config.options?.plugins, legend } } }));
}

/** Legend order: the groups from the top of the stack down, then everything else as given. */
const TOP_FIRST = [...GROUPS].reverse().map((g) => GROUP_LABEL[g]);
const legendRight = {
  position: "right" as const,
  labels: {
    sort: (a: { text: string; datasetIndex?: number }, b: { text: string; datasetIndex?: number }) => {
      const r = (t: string) => { const i = TOP_FIRST.indexOf(t); return i < 0 ? 100 : i; };
      return r(a.text) - r(b.text) || (a.datasetIndex ?? 0) - (b.datasetIndex ?? 0);
    },
  },
};

const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
const LEAP_START = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335, 366];

/** Monthly average and median of an hourly series; months the series does not reach are null. */
export function monthly(price: ArrayLike<number>): { mean: (number | null)[]; median: (number | null)[] } {
  const days = Math.round(price.length / 24);
  const start = days >= 366 ? LEAP_START : MONTH_START;
  const mean: (number | null)[] = [], median: (number | null)[] = [];
  for (let m = 0; m < 12; m++) {
    const a = Array.from(price).slice(start[m] * 24, Math.min(price.length, start[m + 1] * 24)).sort((x, y) => x - y);
    if (!a.length) { mean.push(null); median.push(null); continue; }
    mean.push(a.reduce((s, x) => s + x, 0) / a.length);
    median.push(a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2);
  }
  return { mean, median };
}

export const MONTHS = lang === "et" ? ["jaan", "veebr", "märts", "apr", "mai", "juuni", "juuli", "aug", "sept", "okt", "nov", "dets"]
  : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONGEST = Math.max(...MONTHS.map((m) => m.length));

/** A daily series as weekly means (D-197): weeks of seven days, the year's last day or two in its last week; a part
 * year's last week as long as what is left. */
export function weekly(a: ArrayLike<number>): number[] {
  const n = Math.max(1, Math.round(a.length / 7)), out: number[] = [];
  for (let w = 0; w < n; w++) {
    const end = w === n - 1 ? a.length : Math.min(a.length, 7 * (w + 1));
    let s = 0;
    for (let d = 7 * w; d < end; d++) s += a[d];
    out.push(end > 7 * w ? s / (end - 7 * w) : 0);
  }
  return out;
}

/** Day d of the year (0-based) as "12 Feb", and whether it is the first of a month. */
function dayLabels(days: number): { label: string[]; first: boolean[] } {
  const start = days >= 366 ? LEAP_START : MONTH_START;
  const label: string[] = [], first: boolean[] = [];
  let m = 0;
  for (let d = 0; d < days; d++) {
    while (m < 11 && d >= start[m + 1]) m++;
    label.push(`${d - start[m] + 1} ${MONTHS[m]}`);
    first.push(d === start[m]);
  }
  return { label, first };
}

/** The countries' flags as stripes, top to bottom (a canvas cannot use the page's CSS flags). */
const STRIPES: Record<string, string[]> = {
  EE: ["#0072CE", "#000000", "#FFFFFF"],
  LV: ["#9E3039", "#9E3039", "#FFFFFF", "#9E3039", "#9E3039"],
  LT: ["#FDB913", "#006A44", "#C1272D"],
};

/** The border's two directions, flags and all, written on the plot: the way above zero at the top of
 * its area, the way below at its foot; placed again whenever the chart lays itself out. */
const dirLabels = {
  id: "dirLabels",
  afterLayout(chart: Chart) {
    const a = chart.chartArea, box = chart.canvas.parentElement;
    const up = box?.querySelector<HTMLElement>(".dir.up"), down = box?.querySelector<HTMLElement>(".dir.down");
    if (!a || !up || !down) return;
    up.style.left = down.style.left = `${a.left + 6}px`;
    up.style.top = `${a.top + 4}px`;
    down.style.bottom = "auto"; // the stylesheet's place before the first layout
    down.style.top = `${a.bottom - 4 - down.offsetHeight}px`;
  },
};

/** Under the mix's bars: "model" and "actual" under each bar, then the country's flag and code
 * under the pair (D-029). */
/** The words under a zone's pair of bars, in the page's language: the stacks' own names are keys (ERRATA E-189). */
const STACK_WORD: Record<string, string> = { model: t("model"), actual: t("actual") };
const mixLabels = {
  id: "mixLabels",
  afterDraw(chart: Chart) {
    const { ctx, chartArea } = chart;
    const word = (stack: string) => STACK_WORD[stack] ?? stack;
    const bars = new Map<string, { x: number; stack: string; k: number }>();
    chart.data.datasets.forEach((d, i) => {
      const stack = String((d as { stack?: string }).stack);
      chart.getDatasetMeta(i).data.forEach((el, k) => {
        const key = `${stack}:${k}`;
        if (!bars.has(key)) bars.set(key, { x: (el as unknown as { x: number }).x, stack, k });
      });
    });
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `10px ${css("--num")}`;
    ctx.fillStyle = css("--muted");
    // a pair's words run outward from its middle, so that narrow bars do not run them together
    const labels = chart.data.labels as string[];
    labels.forEach((_, k) => {
      const pair = [...bars.values()].filter((b) => b.k === k).sort((a, b) => a.x - b.x);
      if (pair.length === 1) { ctx.textAlign = "center"; ctx.fillText(word(pair[0].stack), pair[0].x, chartArea.bottom + 4); return; }
      const mid = (pair[0].x + pair[pair.length - 1].x) / 2;
      ctx.textAlign = "right";
      ctx.fillText(word(pair[0].stack), mid - 3, chartArea.bottom + 4);
      ctx.textAlign = "left";
      ctx.fillText(word(pair[pair.length - 1].stack), mid + 3, chartArea.bottom + 4);
    });
    ctx.textAlign = "center";
    ctx.font = `11px ${css("--num")}`;
    ctx.fillStyle = css("--ink");
    labels.forEach((code, k) => {
      const xs = [...bars.values()].filter((b) => b.k === k).map((b) => b.x);
      if (!xs.length) return;
      const cx = xs.reduce((s, x) => s + x, 0) / xs.length;
      const w = ctx.measureText(code).width;
      const left = cx - (15 + 5 + w) / 2;
      const top = chartArea.bottom + 20;
      const stripes = STRIPES[code] ?? [];
      stripes.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(left, top + (i * 10) / stripes.length, 15, 10 / stripes.length + 0.5); });
      ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(left + 0.25, top + 0.25, 14.5, 9.5);
      ctx.fillStyle = css("--ink");
      ctx.textAlign = "left";
      ctx.fillText(code, left + 20, top - 1);
      ctx.textAlign = "center";
    });
    ctx.restore();
  },
};

/** Each month's price over its point (the owner asked, 2026-09-29). Beside the actual line, a
 * month's higher point is labelled above and the lower below, so the two never meet; the model's
 * figures in ink, the actual's muted. Of more lines (the presentation's four scenarios) only the
 * highest and the lowest are labelled, for the same reason; the others' figures are in the tooltip. */
const pointLabels = {
  id: "pointLabels",
  // `size`: the figures' type, 10 px unless a chart's `plugins.pointLabels` asks for more (the presentation's)
  afterDatasetsDraw(chart: Chart, _args: unknown, opts?: { size?: number }) {
    const { ctx } = chart;
    const shown = chart.data.datasets.map((_, i) => i).filter((i) => chart.isDatasetVisible(i));
    ctx.save();
    ctx.font = `${opts?.size ?? 10}px ${css("--num")}`;
    ctx.textAlign = "center";
    // bars: each figure above its own bar; points: the higher above, the lower below
    const bars = (chart.config as { type?: string }).type === "bar";
    (chart.data.labels as string[]).forEach((_, k) => {
      const pts = shown
        .map((i) => ({ i, v: chart.data.datasets[i].data[k] as number | null, pt: chart.getDatasetMeta(i).data[k] as unknown as { x: number; y: number } }))
        .filter((p) => p.v !== null && p.pt)
        .sort((a, b) => a.pt.y - b.pt.y);
      pts.forEach((p, j) => {
        if (!bars && j > 0 && j < pts.length - 1) return;
        ctx.fillStyle = css(p.i === 0 ? "--ink" : "--muted");
        const up = bars || j === 0;
        const text = fmt(Math.round(p.v!) || 0, 0); // `|| 0`: no "-0"
        ctx.textBaseline = up ? "bottom" : "top";
        ctx.fillText(text, p.pt.x, p.pt.y + (up ? (bars ? -3 : -5) : 5));
      });
    });
    ctx.restore();
  },
};

/** The duration curve's title: where its axis is cut, and the hours beyond the cut — of the model
 * and of the actual year in a replay, of the one year in a set of one (E-104). */
export function curveTitle(top: number, cut: boolean, model: ArrayLike<number>, observed: ArrayLike<number> | null, years: number): string {
  const over = (a: ArrayLike<number>) => Array.from(a).filter((x) => x > top).length;
  const above = observed ? t("model {m}, actual {a} hours above", { m: over(model), a: over(observed) }) : years === 1 ? t("{m} hours above", { m: over(model) }) : null;
  return t("Price duration curve") + (cut ? t(" (axis cut at {top} €/MWh{above})", { top, above: above ? `; ${above}` : "" }) : "");
}

/** A mix bar's end, the doughnut's hole until D-197: its generation and its CO₂, each figure bold with its unit, the
 * words between them muted; `short` leaves out the word "generation" where a narrow chart has no room. */
export function mixEnd(genTwh: number, co2Mt: number, short = false): [text: string, strong: boolean][] {
  return [[`${fmt(genTwh, 1)} TWh`, true], [short ? " · CO₂ " : ` ${t("generation")} · CO₂ `, false], [`${fmt(co2Mt, 2)} Mt`, true]];
}

interface MixRow { label: string; stripes?: string[]; mix: Record<Group, number>; net: number; co2: number }

/** Each bar's generation and CO₂ written after its end (D-197). */
const mixEnds = (rows: MixRow[], gen: number[], short: boolean) => ({
  id: "mixEnds",
  afterDatasetsDraw(chart: Chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    rows.forEach((r, k) => {
      // the bar's end: the furthest of its shown segments; its middle from any segment
      let x = chart.chartArea.left, y: number | null = null;
      chart.data.datasets.forEach((d, i) => {
        const el = chart.getDatasetMeta(i).data[k] as unknown as { x: number; y: number } | undefined;
        if (!el) return;
        y ??= el.y;
        if (chart.isDatasetVisible(i) && Number(d.data[k]) > 0) x = Math.max(x, el.x);
      });
      if (y === null) return;
      let at = x + 6;
      for (const [text, strong] of mixEnd(gen[k], r.co2, short)) {
        ctx.font = `${strong ? "700 " : ""}11px ${css("--num")}`;
        ctx.fillStyle = css(strong ? "--ink" : "--muted");
        ctx.fillText(text, at, y);
        at += ctx.measureText(text).width;
      }
    });
    ctx.restore();
  },
});

/** A zone's flag before its code on the bars' axis (R-UI-4, D-029): a canvas cannot use the page's CSS flags. */
const rowFlags = (rows: MixRow[]) => ({
  id: "rowFlags",
  afterDraw(chart: Chart) {
    const s = chart.scales.y, { ctx } = chart;
    ctx.save();
    ctx.font = `600 12px ${css("--num")}`;
    rows.forEach((r, k) => {
      if (!r.stripes) return;
      const y = s.getPixelForTick(k), left = s.right - 8 - ctx.measureText(r.label).width - 21;
      r.stripes.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(left, y - 5 + (i * 10) / r.stripes!.length, 15, 10 / r.stripes!.length + 0.5); });
      ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(left + 0.25, y - 4.75, 14.5, 9.5);
    });
    ctx.restore();
  },
});

/** The mix as horizontal bars (D-197; a doughnut each until then, D-097): a bar per zone or per scenario of its
 * generation by group and, hatched, its net import; its generation and CO₂ after its end. `room`: the axis's length
 * over the longest bar, the rest for the words. */
function mixRows(id: string, rows: MixRow[], present: Group[], room: number, short: boolean): void {
  const muted = css("--muted"), surface = css("--surface");
  const gen = rows.map((r) => present.reduce((s, g) => s + r.mix[g], 0)), imp = rows.map((r) => Math.max(0, r.net));
  const max = Math.max(1, ...rows.map((_, k) => gen[k] + imp[k]));
  const bar = { borderColor: surface, borderWidth: 1, barPercentage: 0.72, categoryPercentage: 0.92 };
  draw(id, {
    type: "bar",
    data: {
      labels: rows.map((r) => r.label),
      datasets: [
        ...present.map((g) => ({ label: GROUP_LABEL[g], data: rows.map((r) => r.mix[g]), backgroundColor: fillOf(g), ...bar })),
        { label: t("net import"), data: imp, backgroundColor: hatch(muted), ...bar, borderColor: muted },
      ],
    },
    options: {
      indexAxis: "y",
      layout: { padding: { left: rows.some((r) => r.stripes) ? 22 : 0 } },
      scales: {
        x: { stacked: true, max: Math.ceil((max * room) / 5) * 5, title: { display: true, text: "TWh" } },
        y: { stacked: true, grid: { display: false }, ticks: { color: css("--ink"), font: { size: 12, weight: 600 } } },
      },
      plugins: {
        legend: { position: "top" as const, labels: { boxWidth: 10, boxHeight: 10 } },
        tooltip: { callbacks: { label: (x: { dataset: { label?: string }; parsed: { x: number }; dataIndex: number }) =>
          `${x.dataset.label}: ${fmt(x.parsed.x, 2)} TWh, ${fmt((100 * x.parsed.x) / (gen[x.dataIndex] + imp[x.dataIndex] || 1), 0)} %` } },
      },
    },
    plugins: [mixEnds(rows, gen, short), rowFlags(rows)],
  } as ConstructorParameters<typeof Chart>[1]);
}

/** A scenario's mix (D-197): a bar per zone, its flag and code before it. */
function drawMixRows(c: ChartInput): void {
  const present = GROUPS.filter((g) => c.run.zones.some((zz) => zz.mix[g] > 0));
  mixRows("ch-mix", c.run.zones.map((zz) => ({ label: zz.zone, stripes: STRIPES[zz.zone], mix: zz.mix, net: zz.importTwh - zz.exportTwh, co2: zz.co2Mt })), present, 1.6, false);
  const title = document.getElementById("ch-mix")?.closest(".chart")?.querySelector("h3");
  if (title) title.textContent = t("Energy mix, TWh, and CO₂: model {year}", { year: c.label });
}

export interface ChartInput {
  pies: boolean; // a scenario run: the mix as a horizontal bar per zone (D-197), the average or the median one chart (D-202); a replay keeps the bars beside the actual
  zone: number; // 0 EE, 1 LV, 2 LT
  run: RunView; // the year shown
  label: string; // its name
  set: { label: string; view: RunView }[]; // every year of the set, for the duration curves
  observed: number[] | null; // the observed hourly price, in a replay only (R-APP-2)
  actualMix: { label: string; zones: Record<Group, number>[] } | null; // TWh by group, the actual year
  border: BorderView | null; // the border shown (R-APP-3)
  imp?: "line" | "fill"; // net import in the weekly chart: hatched over the generation (the default), or a dashed line
  monthly?: "mean" | "median"; // a scenario's monthly chart: the average (the default) or the median (D-202)
}

/** A replay's mix: per country a stacked bar of the model and beside it the actual year's. */
function drawMixBars(c: ChartInput): void {
  const surface = css("--surface");
  const kinds: [string, (i: number) => Record<Group, number> | undefined][] = [["model", (i) => c.run.zones[i].mix]];
  if (c.actualMix) kinds.push(["actual", (i) => c.actualMix!.zones[i]]);
  const present = GROUPS.filter((g) => kinds.some(([, f]) => [0, 1, 2].some((i) => (f(i)?.[g] ?? 0) > 0)));
  draw("ch-mix", {
    type: "bar",
    data: {
      labels: c.run.zones.map((zz) => zz.zone),
      datasets: present.flatMap((g) => kinds.map(([stack, f]) => ({
        label: GROUP_LABEL[g], stack, data: [0, 1, 2].map((i) => f(i)?.[g] ?? 0),
        backgroundColor: fillOf(g), borderColor: surface, borderWidth: 1, categoryPercentage: 0.7, barPercentage: 0.94,
      }))),
    },
    options: {
      layout: { padding: { top: 4, bottom: 36 } },
      scales: { x: { stacked: true, ticks: { display: false } }, y: { stacked: true, title: { display: true, text: "TWh" } } },
      plugins: {
        legend: {
          ...legendRight,
          labels: { ...legendRight.labels, filter: (item: { datasetIndex?: number }, data: { datasets: { stack?: string }[] }) => data.datasets[item.datasetIndex ?? 0].stack === "model" },
          onClick: (_e: unknown, item: { text: string; datasetIndex?: number }, legend: { chart: Chart }) => {
            const ch = legend.chart;
            const show = !ch.isDatasetVisible(item.datasetIndex ?? 0);
            ch.data.datasets.forEach((d, i) => { if (d.label === item.text) ch.setDatasetVisibility(i, show); });
            ch.update();
          },
        },
      },
    },
    plugins: [mixLabels],
  });
  const mixTitle = document.getElementById("ch-mix")?.closest(".chart")?.querySelector("h3");
  if (mixTitle) mixTitle.textContent = t("Energy mix, TWh: model {year}", { year: c.label }) + (c.actualMix ? t(" and {actual}", { actual: c.actualMix.label }) : "");
}

export function drawCharts(c: ChartInput): void {
  const z: ZoneView = c.run.zones[c.zone];
  const ink = css("--ink"), accent = css("--accent"), red = css("--red");
  const { label: days, first } = dayLabels(z.consumption.length);
  const months = {
    ticks: { autoSkip: false, maxRotation: 0, callback: function (this: { width: number }, _v: unknown, i: number) {
      if (!first[i]) return "";
      const name = days[i].split(" ")[1];
      // an axis too narrow for every month's name (a phone, or Estonian's longer names): every other month (D-143)
      return this.width / 12 < LONGEST * 7 + 6 && MONTHS.indexOf(name) % 2 ? "" : name;
    } },
    grid: { color: (c: { index: number }) => (first[c.index] ? css("--line") : "transparent") },
  };
  // the generation by week (D-197; by day until then): each week's average day, a column of the groups, the net
  // import hatched on top up to the consumption, whose line runs over the columns; a week of export leaves the
  // generation above the line by what was sent, and its import is 0
  const gwh = (a: ArrayLike<number>) => weekly(a).map((x) => x / 1e3);
  const wk = gwh(z.consumption).length;
  const monthIn = Array.from({ length: wk }, (_, w) => first.slice(7 * w, w === wk - 1 ? first.length : 7 * w + 7).indexOf(true));
  const col = { categoryPercentage: 0.88, barPercentage: 0.92, order: 1 };
  draw("ch-stack", {
    type: "bar",
    data: {
      labels: Array.from({ length: wk }, (_, w) => t("week from {day}", { day: days[7 * w] })),
      datasets: [
        ...GROUPS.filter((g) => z.daily[g].some((x) => x > 0)).map((g) => ({ label: GROUP_LABEL[g], data: gwh(z.daily[g]), stack: "gen", backgroundColor: fillOf(g), borderWidth: 0, ...col })),
        ...(c.imp !== "line" ? [{ label: t("net import"), data: gwh(z.netImport).map((x) => Math.max(0, x)), stack: "gen", backgroundColor: hatch(css("--muted")), borderColor: css("--muted"), borderWidth: 1, ...col }] : []),
        // the lines are drawn over the columns (a lower order is drawn later)
        { type: "line" as const, label: t("consumption"), data: gwh(z.consumption), borderColor: ink, backgroundColor: ink, borderWidth: 2, pointRadius: 0, stack: "use", order: 0 },
        ...(c.imp !== "line" ? [] : [{ type: "line" as const, label: t("net import (+)"), data: gwh(z.netImport), borderColor: red, backgroundColor: red, borderWidth: 2, borderDash: [5, 3], pointRadius: 0, stack: "trade", order: 0 }]),
      ],
    },
    options: {
      interaction: { mode: "index", intersect: false },
      scales: {
        // a month's name under the week its first day falls in
        x: { stacked: true, grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, callback: function (this: { width: number }, _v: unknown, i: number) {
          if (monthIn[i] < 0) return "";
          const name = days[7 * i + monthIn[i]].split(" ")[1];
          // an axis too narrow for every month's name (Estonian's longer names): every other month (D-143)
          return this.width / 12 < LONGEST * 7 + 6 && MONTHS.indexOf(name) % 2 ? "" : name;
        } } },
        // one stack for both signs: a week the batteries charge more than they give back is a little below zero,
        // and Chart.js would stack it apart from zero, over every layer
        y: { stacked: "single" as const, title: { display: true, text: t("GWh a day, the week's average") } },
      },
      plugins: { legend: legendRight },
    },
  } as ConstructorParameters<typeof Chart>[1]);
  // the mix: in a scenario a horizontal bar per country; in a replay per country a stacked bar of the
  // model and beside it the actual year's, the two closer to each other than to the next country;
  // the legend names each group once and hides or shows it in both bars
  if (c.pies) drawMixRows(c);
  else drawMixBars(c);
  const mm = monthly(z.price);
  const obs = c.observed ? monthly(c.observed) : null;
  // a scenario's average or median by month, as the switch over the chart says (D-202; both on one chart, D-197):
  // the months as bars with their figures, the axis drawn for both so that the switch moves only the bars
  if (!obs) {
    const both = [...mm.mean, ...mm.median].filter((x) => x !== null) as number[];
    const hi = Math.max(...both), median = c.monthly === "median";
    draw("ch-mean", {
      type: "bar",
      data: { labels: MONTHS, datasets: [{ label: median ? t("median, model {year}", { year: c.label }) : t("average, model {year}", { year: c.label }),
        data: median ? mm.median : mm.mean, backgroundColor: accent, borderRadius: 2, pointStyle: "rect" }] },
      options: {
        interaction: { mode: "index", intersect: false },
        // room for the labels above the highest bar
        scales: { y: { suggestedMin: Math.min(0, ...both), suggestedMax: hi + 0.12 * (hi || 20), title: { display: true, text: "€/MWh" } } },
        plugins: { legend: { labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8 } } },
      },
      plugins: [pointLabels],
    } as ConstructorParameters<typeof Chart>[1]);
  }
  // a replay's model and actual year as lines, the average and the median each on its own chart, as they were
  if (obs) for (const [id, key, name] of [["ch-mean", "mean", "average"], ["ch-median", "median", "median"]] as const) {
    // room for the labels above the highest point and below the lowest
    const vals = [...mm[key], ...obs[key]].filter((x) => x !== null) as number[];
    const lo = Math.min(...vals), hi = Math.max(...vals);
    draw(id, {
      type: "line",
      data: {
        labels: MONTHS,
        datasets: [
          { label: t(`${name}, model {year}`, { year: c.label }), data: mm[key], borderColor: accent, backgroundColor: accent, pointRadius: 3, borderWidth: 2 },
          { label: t(`${name}, actual {year}`, { year: c.label }), data: obs[key], borderColor: ink, backgroundColor: ink, pointRadius: 3, borderWidth: 2, borderDash: [4, 3] },
        ],
      },
      options: {
        interaction: { mode: "index", intersect: false },
        // January and December off the edges, so that their labels stay inside
        scales: { x: { offset: true }, y: { suggestedMax: hi + 0.15 * (hi - lo || 20), suggestedMin: lo - 0.15 * (hi - lo || 20), title: { display: true, text: "€/MWh" } } },
        plugins: { legend: { labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 7, boxHeight: 7 } } }, // round, as the points
      },
      plugins: [pointLabels],
    });
  }
  const curve = (a: ArrayLike<number>) => Array.from(a).sort((x, y) => y - x).filter((_, i) => i % 24 === 0);
  const series = c.observed
    ? [{ label: t("model {year}", { year: c.label }), data: curve(z.price), borderColor: accent }, { label: t("actual {year}", { year: c.label }), data: curve(c.observed), borderColor: ink }]
    : c.set.map((s) => ({ label: s.label, data: curve(s.view.zones[c.zone].price), borderColor: yearColour(s.label, accent) }));
  series.forEach((s, i) => { if (!c.observed && c.set.length > 1) (s as { borderDash?: number[] }).borderDash = [[], [6, 3], [2, 2]][i % 3]; });
  // scarcity hours at the price cap would flatten the rest: the axis stops above the 99th
  // percentile and the title says how many hours lie beyond it
  const all = series.flatMap((d) => d.data);
  const p99 = [...all].sort((x, y) => x - y)[Math.floor(all.length * 0.99)];
  const top = Math.max(150, Math.ceil((p99 * 1.25) / 50) * 50);
  const title = document.getElementById("ch-curve")?.closest(".chart")?.querySelector("h3");
  if (title) title.textContent = curveTitle(top, all.some((x) => x > top), z.price, c.observed, c.set.length);
  draw("ch-curve", {
    type: "line",
    data: { labels: series[0].data.map((_, i) => String(i * 24)), datasets: series.map((d) => ({ ...d, pointRadius: 0, borderWidth: 2 })) },
    options: { interaction: { mode: "index", intersect: false }, scales: { x: { ticks: { maxTicksLimit: 10 }, title: { display: true, text: t("hours at or above the price") } }, y: { max: top, title: { display: true, text: "€/MWh" } } } },
  });
  // the border: its capacity each way as a grey band around zero, the net flow over it (R-APP-3)
  if (c.border) {
    const b = c.border;
    const [a, to] = b.border.split("-");
    const grey = css("--muted");
    draw("ch-border", {
      type: "line",
      data: {
        labels: days,
        datasets: [
          { label: t("capacity {a}→{b}", { a, b: to }), data: Array.from(b.dailyCapFwd), borderColor: grey, backgroundColor: alpha(grey, 0.25), fill: "origin", pointRadius: 0, borderWidth: 1, order: 1 },
          { label: t("capacity {a}→{b}, below zero", { a: to, b: a }), data: Array.from(b.dailyCapRev, (x) => -x), borderColor: grey, backgroundColor: alpha(grey, 0.12), borderDash: [4, 3], fill: "origin", pointRadius: 0, borderWidth: 1, order: 1 },
          { label: t("net flow, + = {a}→{b}", { a, b: to }), data: Array.from(b.dailyFlow), borderColor: accent, pointRadius: 0, borderWidth: 2, fill: false, order: 0 },
        ],
      },
      options: { interaction: { mode: "index", intersect: false }, scales: { x: months, y: { title: { display: true, text: "MW" } } } },
      plugins: [dirLabels],
    });
  }
}
