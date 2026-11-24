import {
  PUBLIC_SITE_ORIGINS,
  publicPageHead,
} from "@lootlog/domain/public-sites";
import ogImage from "@/assets/og-image.png?no-inline";
import { portalText } from "@/lib/translations";

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
  const fullTitle =
    title === portalText.title ? title : `${title} | ${portalText.title}`;

  return publicPageHead({
    url: `${PUBLIC_SITE_ORIGINS.developer}${path}`,
    siteName: portalText.title,
    title: fullTitle,
    description,
    image: {
      url: `${PUBLIC_SITE_ORIGINS.developer}${ogImage}`,
      width: 1200,
      height: 630,
      alt: portalText.ogImageAlt,
    },
    type,
    locale: "en_US",
    noindex,
  });
}
