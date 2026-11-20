import { describe, expect, it } from "bun:test";
import { sitemapXml } from "./public-sites.js";

describe("sitemaps of the public sites", () => {
  it("escapes each address so a query string keeps the document valid XML", () => {
    expect(
      sitemapXml(["https://wiki.lootlog.pl/items?rarity=unique&page=2"]),
    ).toBe(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://wiki.lootlog.pl/items?rarity=unique&amp;page=2</loc></url>
</urlset>
`,
    );
  });
});
