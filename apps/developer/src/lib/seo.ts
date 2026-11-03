import ogImage from "~/assets/og-image.png?no-inline";
import { portalText } from "~/lib/translations";

export const PORTAL_ORIGIN = "https://developer.lootlog.pl";

/**
 * Head tags shared by every page: one title and description for search
 * results, link previews and the canonical production URL. Development hosts
 * are kept out of search engines by robots.txt, so they share the same tags.
 */
export function pageHead({
  path,
  title,
  description,
  noindex = false,
  type = "website",
}: {
  path: string;
  title: string;
  description: string;
  noindex?: boolean;
  type?: "website" | "article";
}) {
  const url = `${PORTAL_ORIGIN}${path}`;

  const fullTitle =
    title === portalText.title ? title : `${title} | ${portalText.title}`;

  const image = `${PORTAL_ORIGIN}${ogImage}`;

  return {
    meta: [
      { title: fullTitle },
      { name: "description", content: description },
      ...(noindex ? [{ name: "robots", content: "noindex, follow" }] : []),
      { property: "og:type", content: type },
      { property: "og:site_name", content: portalText.title },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: portalText.ogImageAlt },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: fullTitle },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
