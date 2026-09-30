import { writeSitemap } from "../../../scripts/sitemap.mjs";
import { landingDocumentPaths } from "../src/config/links.ts";

await writeSitemap(
  "dist/client/sitemap.xml",
  landingDocumentPaths.map((path) => `https://lootlog.pl${path}`),
);
