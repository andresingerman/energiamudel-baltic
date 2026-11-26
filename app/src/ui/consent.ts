// Google Analytics behind the reader's consent (D-338, R-NFR-1 revision 2.148). Nothing goes to Google until the
// reader agrees: the banner asks once, the choice is kept in the browser, and only then is Google's script loaded.
// Advertising storage and signals stay off; the page tells Google which view is shown and never the scenario's
// text, which lives in the address's hash.
import { lang, t } from "./i18n.ts";
import { esc } from "./labels.ts";

/** The GA4 measurement id of the property energiamudel.ee (account Fermi Energia, stream https://energiamudel.ee).
 * Empty, the page has no analytics: no banner and no request to Google. */
export const GA_ID = "G-YNNGZW3REW";
const GTAG = "https://www.googletagmanager.com/gtag/js";
const KEY = "analytics-consent";
type Choice = "granted" | "denied";

/** The address a view's page view tells Google: the page with its view, language and slide, nothing else. */
export function pageLocation(href: string): string {
  const u = new URL(href);
  const kept = new URL(u.origin + u.pathname);
  for (const k of ["view", "lang", "slide"]) {
    const v = u.searchParams.get(k);
    if (v) kept.searchParams.set(k, v);
  }
  return kept.href;
}

const read = (): Choice | null => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null; // storage refused: ask again next time
  }
};
const write = (c: Choice): void => {
  try { localStorage.setItem(KEY, c); } catch { /* the choice lasts the page */ }
};

type Gtag = (...args: unknown[]) => void;
const g = globalThis as unknown as { dataLayer?: unknown[]; gtag?: Gtag };
let loaded = false;

function load(id: string): void {
  if (loaded) return;
  loaded = true;
  g.dataLayer = g.dataLayer ?? [];
  // gtag.js reads its queue as `arguments` objects, as Google's own snippet pushes them
  g.gtag = function gtag() { g.dataLayer!.push(arguments); } as Gtag;
  g.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  g.gtag("js", new Date());
  // the stream's page view on load is Google's own (its "page loads" cannot be turned off): it carries the address
  // without its hash, which Google drops, so the scenario's text stays in the page while a campaign's utm_ parameters
  // reach the statistics; every later view is sent by `pageView`, its address cut by `pageLocation`
  g.gtag("config", id, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const s = document.createElement("script");
  s.async = true;
  s.src = GTAG + "?id=" + encodeURIComponent(id);
  document.head.append(s);
}

/** Google's cookies gone when the reader withdraws, on the host and its parent domain. */
function dropCookies(): void {
  const host = location.hostname;
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0].trim();
    if (!/^_ga/.test(name)) continue;
    for (const domain of ["", `; domain=${host}`, `; domain=.${host.replace(/^www\./, "")}`]) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
    }
  }
}

/** The banner's markup: what is counted, by whom, and two buttons of equal weight. */
export function bannerHtml(): string {
  return `<div class="consent" role="dialog" aria-modal="false" aria-labelledby="consent-h" lang="${lang}">
    <p class="consent-h" id="consent-h">${t("Visit statistics")}</p>
    <p>${t("May we count visits with Google Analytics? It tells us how many people use the model, which views they open and where they come from. Google sets cookies for it; the scenario you build is never sent. The model works the same either way.")}</p>
    <div class="consent-b"><button type="button" class="seg" data-consent="granted">${esc(t("Agree"))}</button><button type="button" class="seg" data-consent="denied">${esc(t("Decline"))}</button></div>
  </div>`;
}

function showBanner(id: string): void {
  document.querySelector(".consent")?.remove();
  const wrap = document.createElement("div");
  wrap.innerHTML = bannerHtml();
  const el = wrap.firstElementChild as HTMLElement;
  el.addEventListener("click", (e) => {
    const c = (e.target as HTMLElement).closest<HTMLElement>("[data-consent]")?.dataset.consent as Choice | undefined;
    if (!c) return;
    write(c);
    el.remove();
    if (c === "granted") load(id);
    else if (loaded) { g.gtag?.("consent", "update", { analytics_storage: "denied" }); dropCookies(); }
    else dropCookies();
  });
  document.body.append(el);
}

/** At the page's start: Google's script if the reader agreed before, the banner if the reader has not chosen. */
export function initAnalytics(id = GA_ID): void {
  if (!id) return;
  const c = read();
  if (c === "granted") load(id);
  else if (c === null) showBanner(id);
}

/** A view shown: one page view, the address cleaned (the stream counts no history changes of its own). */
export function pageView(): void {
  if (loaded) g.gtag?.("event", "page_view", { page_location: pageLocation(location.href), page_title: document.title });
}

/** The reader's way back to the choice (the Documentation view's link). */
export function reopenConsent(id = GA_ID): void {
  if (id) showBanner(id);
}
