import { PUBLIC_SITE_ORIGINS } from "@lootlog/domain/public-sites";
import { docsPaths } from "../lib/docs-paths";
import { writeSitemap } from "../../../scripts/sitemap.mjs";

await writeSitemap(
  "dist/client/sitemap.xml",
  docsPaths.map((path) => `${PUBLIC_SITE_ORIGINS.docs}${path}`),
);
