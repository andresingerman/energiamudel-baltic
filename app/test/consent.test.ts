// Visit statistics behind consent (D-338): what Google is told of the address, the banner's controls, the id's form.
import assert from "node:assert/strict";
import { test } from "node:test";
import { GA_ID, apply, bannerHtml, pageLocation, pageView } from "../src/ui/consent.ts";
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
  assert.match(h, /[Tt]he scenario you build is never sent/);
  assert.match(h, /Google signals/); // what the wider consent covers is said (D-342)
  assert.match(h, /advertising cookie/);
});

test("the measurement id is a GA4 id, or empty for no analytics at all", () => {
  assert.match(GA_ID, /^(G-[A-Z0-9]{6,12})?$/);
});

test("a withdrawn consent stops everything: Google's own switch is on and no page view is queued; agreeing again resumes (E-202)", () => {
  // the page's globals, as far as the module touches them
  const G = globalThis as unknown as Record<string, unknown>;
  G.document = { createElement: () => ({}), head: { append() {} }, cookie: "", title: "t" };
  G.location = { hostname: "energiamudel.ee", href: "https://energiamudel.ee/?view=docs#s=abc" };
  const id = "G-TEST000";
  const queued = (what: string) => ((G.dataLayer as ArrayLike<unknown>[] | undefined) ?? []).filter((a) => a[0] === what);
  apply("granted", id);
  pageView();
  assert.equal(G[`ga-disable-${id}`], false);
  assert.equal(queued("event").length, 1);
  // what signals needs with the consent, ad personalisation never (D-342)
  assert.deepEqual(queued("consent")[0][2], { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "denied" });
  apply("denied", id);
  pageView();
  assert.equal(G[`ga-disable-${id}`], true);
  assert.equal(queued("event").length, 1); // nothing more
  assert.deepEqual(queued("consent").at(-1)![2], { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied" });
  apply("granted", id);
  pageView();
  assert.equal(G[`ga-disable-${id}`], false);
  assert.deepEqual(queued("consent").at(-1)![2], { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted" });
  assert.equal(queued("event").length, 2);
});
