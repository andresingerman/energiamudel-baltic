// Google Analytics behind the reader's consent (D-338, R-NFR-1 revision 2.148). Nothing goes to Google until the
// reader agrees: the banner asks once, the choice is kept in the browser, and only then is Google's script loaded.
// Since D-342 the consent covers Google signals too — the visit linked to a signed-in reader's Google account, for
// age groups, gender and interests as totals — which needs Google's advertising storage and its consent for user
// data; the banner says so. Ad personalisation stays off. The page tells Google which view is shown and never the
// scenario's text, which lives in the address's hash.
import { lang, t } from "./i18n.ts";
import { esc } from "./labels.ts";

/** The GA4 measurement id of the property energiamudel.ee (account Fermi Energia, stream https://energiamudel.ee).
 * Empty, the page has no analytics: no banner and no request to Google. */
export const GA_ID = "G-YNNGZW3REW";
const GTAG = "https://www.googletagmanager.com/gtag/js";
// the choice under D-342's wider question; a «decline» under D-338's narrower one still stands, an «agree» is asked again
const KEY = "analytics-consent-2", KEY_338 = "analytics-consent";
export type Choice = "granted" | "denied";

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
    return v === "granted" || v === "denied" ? v : localStorage.getItem(KEY_338) === "denied" ? "denied" : null;
  } catch {
    return null; // storage refused: ask again next time
  }
};
const write = (c: Choice): void => {
  try { localStorage.setItem(KEY, c); } catch { /* the choice lasts the page */ }
};

type Gtag = (...args: unknown[]) => void;
const g = globalThis as unknown as { dataLayer?: unknown[]; gtag?: Gtag };
let loaded = false; // Google's script asked for
let on = false; // the reader's consent in force

function load(id: string): void {
  if (loaded) return;
  loaded = true;
  g.dataLayer = g.dataLayer ?? [];
  // gtag.js reads its queue as `arguments` objects, as Google's own snippet pushes them
  g.gtag = function gtag() { g.dataLayer!.push(arguments); } as Gtag;
  // Google signals needs advertising storage and the consent to send user data to Google (D-342; tried in the browser:
  // with either denied the tag sends no signals request); ad personalisation is not asked for and stays denied
  g.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "denied" });
  g.gtag("js", new Date());
  // the stream's page view on load is Google's own (its "page loads" cannot be turned off): it carries the address
  // without its hash, which Google drops, so the scenario's text stays in the page while a campaign's utm_ parameters
  // reach the statistics; every later view is sent by `pageView`, its address cut by `pageLocation`
  g.gtag("config", id, { allow_ad_personalization_signals: false });
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
    if (!/^_(ga|gcl)/.test(name)) continue;
    for (const domain of ["", `; domain=${host}`, `; domain=.${host.replace(/^www\./, "")}`]) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
    }
  }
}

/** The banner's markup: what is counted, by whom, and two buttons of equal weight. */
export function bannerHtml(): string {
  return `<div class="consent" role="dialog" aria-modal="false" aria-labelledby="consent-h" lang="${lang}">
    <p class="consent-h" id="consent-h">${t("Visit statistics")}</p>
    <p>${t("May we count visits with Google Analytics? It tells us how many people use the model, which views they open and where they come from. For visitors signed in to Google who allow it in their Google account, Google also links the visit to that account and shows us age groups, gender and interests as totals (Google signals). Google sets cookies for it, an advertising cookie among them; we show no ads. The scenario you build is never sent. The model works the same either way.")}</p>
    <div class="consent-b"><button type="button" class="seg" data-consent="granted">${esc(t("Agree"))}</button><button type="button" class="seg" data-consent="denied">${esc(t("Decline"))}</button></div>
  </div>`;
}

/** The reader's choice put into force. Google's own switch (`ga-disable-<id>`) goes with it: while it is true gtag
 * sends nothing at all. Consent mode alone is not enough — with the script loaded and consent withdrawn it still sends
 * "cookieless pings" (found on the live site, ERRATA E-202: the page views after «decline» went out with gcs=G100),
 * and the page promises that without consent nothing is sent. */
export function apply(c: Choice, id = GA_ID): void {
  on = c === "granted";
  (g as Record<string, unknown>)[`ga-disable-${id}`] = !on;
  if (loaded) g.gtag?.("consent", "update", { analytics_storage: c, ad_storage: c, ad_user_data: c });
  else if (on) load(id);
  if (!on) dropCookies();
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
    apply(c, id);
  });
  document.body.append(el);
}

/** At the page's start: Google's script if the reader agreed before, the banner if the reader has not chosen. */
export function initAnalytics(id = GA_ID): void {
  if (!id) return;
  const c = read();
  if (c === "granted") apply(c, id);
  else if (c === null) showBanner(id);
}

/** A view shown: one page view, the address cleaned (the stream counts no history changes of its own). */
export function pageView(): void {
  if (on) g.gtag?.("event", "page_view", { page_location: pageLocation(location.href), page_title: document.title });
}

/** The reader's way back to the choice (the Documentation view's link). */
export function reopenConsent(id = GA_ID): void {
  if (id) showBanner(id);
}
