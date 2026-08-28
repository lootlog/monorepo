import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { CookieConsent } from "@/src/components/cookie-consent";
import { I18nProvider } from "@/src/components/i18n-provider";
import { MotionProvider } from "@/src/components/motion-provider";
import landingTranslations from "@/src/i18n/translations/landing.json";
import uiCss from "@lootlog/ui/globals.css?url";
import landingCss from "@/src/styles/landing.css?url";

const { seo } = landingTranslations;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "description", content: seo.description },
      { name: "keywords", content: seo.keywords.join(", ") },
      { name: "author", content: "Lootlog.pl Team" },
      { name: "creator", content: "Lootlog.pl Team" },
      { name: "robots", content: "index, follow" },
      { name: "googlebot", content: "index, follow" },
      { property: "og:title", content: seo.title },
      { property: "og:description", content: seo.description },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pl_PL" },
      { property: "og:site_name", content: "Lootlog.pl" },
      { property: "og:url", content: "https://lootlog.pl" },
      {
        property: "og:image",
        content: "https://lootlog.pl/brand/lootlog-social.png",
      },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: seo.socialImageAlt },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: seo.title },
      { name: "twitter:description", content: seo.description },
      {
        name: "twitter:image",
        content: "https://lootlog.pl/brand/lootlog-social.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: uiCss },
      { rel: "stylesheet", href: landingCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/apple-icon.png" },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="pl" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body
        className="bg-[#070908] text-[#e9e7de] antialiased"
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        <I18nProvider>
          <MotionProvider>
            <Outlet />
            <CookieConsent />
          </MotionProvider>
        </I18nProvider>
        <Scripts />
      </body>
    </html>
  );
}
