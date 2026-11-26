// The Feedback view: the reader's text reaches the author's address whole, through the reader's own e-mail program.
import assert from "node:assert/strict";
import { test } from "node:test";
import { FEEDBACK_TO, feedbackHtml, footHtml, mailto } from "../src/ui/feedback.ts";

test("the feedback button's address carries the text as written: spaces, lines, & and Estonian letters", () => {
  const text = "Hind & tarbimine:\nõige või vale?";
  const u = new URL(mailto(text));
  assert.equal(u.protocol, "mailto:");
  assert.equal(u.pathname, FEEDBACK_TO);
  assert.equal(new URLSearchParams(u.search.replace(/\+/g, "%2B")).get("body"), text);
});

test("the view is a form with a required text and one button, and names the repository's issues", () => {
  const html = feedbackHtml();
  assert.match(html, /<textarea[^>]*required/);
  assert.equal(html.match(/<button/g)?.length, 1);
  assert.match(html, /energiamudel-baltic\/issues/);
});

test("the footer names the author behind a link, and both licences with their files", () => {
  const html = footHtml();
  assert.match(html, /<a href="https:\/\/www\.linkedin\.com\/in\/andresingerman"[^>]*>Andres Ingerman<\/a>/);
  assert.match(html, /blob\/main\/LICENSE"[^>]*>AGPL-3\.0-or-later/);
  assert.match(html, /blob\/main\/LICENSE-docs"[^>]*>CC BY 4\.0/);
});
