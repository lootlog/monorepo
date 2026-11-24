export const PUBLIC_SITE_ORIGINS = {
  web: "https://lootlog.pl",
  docs: "https://docs.lootlog.pl",
  developer: "https://developer.lootlog.pl",
  wiki: "https://wiki.lootlog.pl",
} as const;

export const COMMUNITY_LINKS = {
  github: "https://github.com/lootlog/monorepo",
  latestRelease: "https://github.com/lootlog/monorepo/releases/latest",
  discord: "https://discord.gg/mPcczaeYMu",
} as const;

export const WEB_SIGN_IN_PATH = "/signin";

export const WEB_SIGN_IN_ERROR_PATH = "/signin/error";

export const webSignInErrorUrl = (webOrigin: string, retryUrl: string) => {
  const url = new URL(WEB_SIGN_IN_ERROR_PATH, webOrigin);
  url.searchParams.set("retry", retryUrl);

  return url.toString();
};

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

export const sitemapXml = (urls: readonly string[]): string => {
  const entries = urls
    .map((url) => `  <url><loc>${escapeXml(url)}</loc></url>\n`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}</urlset>
`;
};
