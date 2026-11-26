// The Feedback view and the page's footer. The view: a note to the model's author through the reader's own e-mail
// program — the site itself sends and stores nothing — and the repository's issues for a reader who uses GitHub.
import { t } from "./i18n.ts";
import { REPO, esc } from "./labels.ts";

/** Where feedback goes: the author's address, as the site named it before (D-293). */
export const FEEDBACK_TO = "andres.ingerman@fermi.ee";
/** The author's page, behind the name in the footer: a link for the reader, not a request the site makes. */
export const AUTHOR_URL = "https://www.linkedin.com/in/andresingerman";

/** The footer under every view: who made the model, and the licences it is under (README, LICENSE, LICENSE-docs). */
export function footHtml(): string {
  const a = (href: string, text: string) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
  return `${t("Model by")} ${a(AUTHOR_URL, "Andres Ingerman")}, Fermi Energia Head of AI and Digital communication · <a href="mailto:${FEEDBACK_TO}">${FEEDBACK_TO}</a>`
    + ` · ${t("Licence: code")} ${a(`https://${REPO}/blob/main/LICENSE`, "AGPL-3.0-or-later")}, ${t("documents and data")} ${a(`https://${REPO}/blob/main/LICENSE-docs`, "CC BY 4.0")}`;
}

/** The address the button opens: the reader's text as the letter's body. */
export const mailto = (text: string): string =>
  `mailto:${FEEDBACK_TO}?subject=${encodeURIComponent(`energiamudel.ee: ${t("Feedback")}`)}&body=${encodeURIComponent(text)}`;

export function feedbackHtml(): string {
  return `<section class="ip fb">
    <h2>${t("Feedback")}</h2>
    <p>${t("Found an error, or have a question or an idea about the model? Write it here.")}</p>
    <form class="fb-form">
      <textarea class="fb-text" name="text" rows="8" required aria-label="${esc(t("Your message"))}"></textarea>
      <button type="submit" class="seg">${t("Send by e-mail")}</button>
    </form>
    <p class="note">${t("The button opens your e-mail program with the text, addressed to {to}. This site itself sends and stores nothing.", { to: FEEDBACK_TO })}</p>
    <p class="note">${t("Or open an issue on GitHub:")} <a href="https://${REPO}/issues" target="_blank" rel="noopener">${REPO}/issues</a></p>
  </section>`;
}
