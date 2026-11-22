import { describe, expect, it } from "bun:test";
import { catalogSlug } from "./catalog-slug.js";
import { normalizeVanityUrl } from "./organization-vanity-url.js";

describe("persisted slugs", () => {
  it.each([
    ["Zażółć gęślą jaźń", "zazolc-gesla-jazn", "za-g-l-ja"],
    ["ĄĆĘŁŃÓŚŹŻ", "acelnoszz", ""],
    ["Straße Æsir Øre Œuvre", "strasse-aesir-ore-oeuvre", "stra-e-sir-re-uvre"],
    [
      "  Mixed   CASE, punctuation!?  ",
      "mixed-case-punctuation",
      "mixed-case-punctuation",
    ],
    ["Łowca-Smoków_2 (II)", "lowca-smokow-2-ii", "owca-smok-w-2-ii"],
    ["a\tb\nc", "a-b-c", "a-b-c"],
  ])("slugs %j", (input, catalog, vanity) => {
    expect(catalogSlug(input)).toBe(catalog);
    expect(normalizeVanityUrl(input)).toBe(vanity);
  });
});
