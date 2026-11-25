import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import "@/i18n/config";
import { SiteNotFound } from "@/components/site-not-found";
import landingTranslations from "@/i18n/translations/landing.json";
import uiCss from "@lootlog/ui/globals.css?url";
import landingCss from "@/styles/landing.css?url";

const { seo } = landingTranslations;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0e0e0f" },
      { name: "color-scheme", content: "dark" },
      { name: "keywords", content: seo.keywords.join(", ") },
      { name: "author", content: "Lootlog.pl Team" },
      { name: "creator", content: "Lootlog.pl Team" },
      { name: "robots", content: "index, follow" },
      { name: "googlebot", content: "index, follow" },
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
  notFoundComponent: SiteNotFound,
});

function RootDocument() {
  return (
    <html lang="pl" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background font-sans text-foreground antialiased">
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
