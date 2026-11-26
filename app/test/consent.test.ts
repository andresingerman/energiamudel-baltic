// Visit statistics behind consent (D-338): what Google is told of the address, the banner's controls, the id's form.
import assert from "node:assert/strict";
import { test } from "node:test";
import { GA_ID, bannerHtml, pageLocation } from "../src/ui/consent.ts";
import { assertNamed } from "./named.ts";

test("Google is told the page, its view, language and slide — never the scenario's text nor another parameter", () => {
  assert.equal(pageLocation("https://energiamudel.ee/?lang=et&view=deck&slide=4#s=djE9MwpydW49c2NlbmFyaW8="),
    "https://energiamudel.ee/?view=deck&lang=et&slide=4");
  assert.equal(pageLocation("https://energiamudel.ee/#s=abc"), "https://energiamudel.ee/");
  assert.equal(pageLocation("https://energiamudel.ee/?nostore&email=x%40y.ee&view=docs"), "https://energiamudel.ee/?view=docs");
});

test("the banner asks with two buttons of equal weight, each named, and says the scenario is never sent", () => {
  const h = bannerHtml();
  assertNamed(h, "consent banner");
  assert.equal((h.match(/data-consent="(granted|denied)"/g) ?? []).length, 2);
  assert.equal((h.match(/class="seg"/g) ?? []).length, 2); // neither button styled to win
  assert.match(h, /the scenario you build is never sent/);
});

test("the measurement id is a GA4 id, or empty for no analytics at all", () => {
  assert.match(GA_ID, /^(G-[A-Z0-9]{6,12})?$/);
});
