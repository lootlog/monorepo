import { PUBLIC_SITE_ORIGINS, sitemapXml } from "@lootlog/domain/public-sites";
import { landingDocumentPaths } from "../src/config/links.ts";

await Bun.write(
  "dist/client/sitemap.xml",
  sitemapXml(
    landingDocumentPaths.map((path) => `${PUBLIC_SITE_ORIGINS.web}${path}`),
  ),
);
