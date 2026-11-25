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

export type SocialImage = {
  url: string;
  width?: number;
  height?: number;
  alt: string;
};

export const LOOTLOG_SOCIAL_IMAGE: SocialImage = {
  url: `${PUBLIC_SITE_ORIGINS.web}/brand/lootlog-social.png`,
  width: 1200,
  height: 630,
  alt: "Lootlog",
};

const LARGE_CARD_MIN_WIDTH = 600;

export const publicPageHead = ({
  url,
  siteName,
  title,
  documentTitle = title,
  description,
  image,
  type = "website",
  locale = "pl_PL",
  noindex = false,
}: {
  url: string;
  siteName: string;
  title: string;
  documentTitle?: string;
  description: string;
  image: SocialImage;
  type?: "website" | "article";
  locale?: "pl_PL" | "en_US";
  noindex?: boolean;
}) => ({
  meta: [
    { title: documentTitle },
    { name: "description", content: description },
    ...(noindex ? [{ name: "robots", content: "noindex, follow" }] : []),
    { property: "og:type", content: type },
    { property: "og:locale", content: locale },
    { property: "og:site_name", content: siteName },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: image.url },
    ...(image.width && image.height
      ? [
          { property: "og:image:width", content: String(image.width) },
          { property: "og:image:height", content: String(image.height) },
        ]
      : []),
    { property: "og:image:alt", content: image.alt },
    {
      name: "twitter:card",
      content:
        (image.width ?? 0) >= LARGE_CARD_MIN_WIDTH
          ? "summary_large_image"
          : "summary",
    },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image.url },
  ],
  links: [{ rel: "canonical", href: url }],
});
