import { docsPaths } from "../lib/docs-chapters";
import { writeSitemap } from "../../../scripts/sitemap.mjs";

await writeSitemap(
  "dist/client/sitemap.xml",
  docsPaths.map((path) => `https://docs.lootlog.pl${path}`),
);
