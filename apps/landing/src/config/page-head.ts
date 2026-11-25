import {
  LOOTLOG_SOCIAL_IMAGE,
  PUBLIC_SITE_ORIGINS,
  publicPageHead,
  type SocialImage,
} from "@lootlog/domain/public-sites";
import translations from "../i18n/translations/landing.json" with { type: "json" };

export function landingPageHead({
  path,
  title,
  documentTitle,
  description,
  image = { ...LOOTLOG_SOCIAL_IMAGE, alt: translations.seo.socialImageAlt },
  type,
}: {
  path: string;
  title: string;
  documentTitle?: string;
  description: string;
  image?: SocialImage;
  type?: "website" | "article";
}) {
  return publicPageHead({
    url:
      path === "/"
        ? PUBLIC_SITE_ORIGINS.web
        : `${PUBLIC_SITE_ORIGINS.web}${path}`,
    siteName: "Lootlog.pl",
    title,
    documentTitle,
    description,
    image,
    type,
  });
}
