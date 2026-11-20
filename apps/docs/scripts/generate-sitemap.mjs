import { PUBLIC_SITE_ORIGINS, sitemapXml } from "@lootlog/domain/public-sites";
import { docsPaths } from "../src/lib/docs-paths";

await Bun.write(
  "dist/client/sitemap.xml",
  sitemapXml(docsPaths.map((path) => `${PUBLIC_SITE_ORIGINS.docs}${path}`)),
);
