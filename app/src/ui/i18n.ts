// The interface's language (the owner's choice of 2026-10-18, an Estonian interface): English, or
// Estonian with `?lang=et`. The English text is the key, so the code reads as before and a string
// with no Estonian entry shows in English. The choice is kept in the browser and changed by reloading
// the page (the header's button), so everything drawn after the load is in one language. Node's tests
// have no page and run in English.
import { ET } from "./et.ts";

export type Lang = "en" | "et";

function chosen(): Lang {
  // a worker or Node has no page to translate, and Node warns when its storage is touched
  if (typeof document === "undefined") return "en";
  try {
    const q = new URLSearchParams(globalThis.location?.search ?? "").get("lang");
    if (q === "et" || q === "en") {
      globalThis.localStorage?.setItem("lang", q);
      return q;
    }
    return globalThis.localStorage?.getItem("lang") === "et" ? "et" : "en";
  } catch {
    return "en"; // storage blocked: the default
  }
}

export const lang: Lang = chosen();

/** The text in the page's language, `{name}` filled from `vars`. */
export function t(en: string, vars?: Record<string, string | number>): string {
  let s = lang === "et" ? ET[en] ?? en : en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
