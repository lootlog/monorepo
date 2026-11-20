/**
 * Production origins and links of the public Lootlog sites. Vite configs load
 * this module with Node, so it imports nothing.
 */
export const PUBLIC_SITE_ORIGINS = {
  /** The landing page and the Web app share one origin. */
  web: "https://lootlog.pl",
  docs: "https://docs.lootlog.pl",
  developer: "https://developer.lootlog.pl",
  wiki: "https://wiki.lootlog.pl",
} as const;

export const COMMUNITY_LINKS = {
  github: "https://github.com/lootlog/monorepo",
  latestRelease: "https://github.com/lootlog/monorepo/releases/latest",
  discord: "https://discord.gg/mPcczaeYMu",
  sdkPackage: "https://www.npmjs.com/package/@lootlog/sdk",
} as const;

/** The Web app route that completes Discord sign-in and opens the dashboard. */
export const WEB_SIGN_IN_PATH = "/signin";

/** A page of the player guide; the slug `index` is the guide's start page. */
export const docsPagePath = (slug: string) =>
  slug === "index" ? "/docs" : `/docs/${slug}`;

export const docsPageUrl = (slug: string) =>
  `${PUBLIC_SITE_ORIGINS.docs}${docsPagePath(slug)}`;

const XML_ENTITIES = new Map([
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&apos;"],
]);

const escapeXml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (character) => XML_ENTITIES.get(character) ?? character,
  );

/** A sitemap listing `urls`, each escaped for XML. */
export const sitemapXml = (urls: readonly string[]): string => {
  const entries = urls
    .map((url) => `  <url><loc>${escapeXml(url)}</loc></url>\n`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}</urlset>
`;
};
