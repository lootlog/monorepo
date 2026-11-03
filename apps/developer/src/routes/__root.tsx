import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { useEffect } from "react";
import { preventIosFocusZoom } from "@lootlog/ui/lib/ios-focus-zoom";
import { portalText } from "~/lib/translations";
import { PortalNav } from "~/components/portal-nav";
import { PORTAL_ORIGIN } from "~/lib/seo";
import appCss from "~/styles/app.css?url";
import favicon from "~/assets/favicon.svg?no-inline";
import appleTouchIcon from "~/assets/lootlog-apple-touch.png?no-inline";

const structuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: portalText.title,
  url: `${PORTAL_ORIGIN}/`,
  description: portalText.description,
  inLanguage: "en",
  publisher: {
    "@type": "Organization",
    name: "Lootlog",
    url: "https://lootlog.pl",
    sameAs: ["https://github.com/lootlog/monorepo"],
  },
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#081421" },
      { name: "color-scheme", content: "dark" },
      { title: portalText.title },
      { name: "description", content: portalText.description },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: favicon, type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: appleTouchIcon },
    ],
    scripts: [{ type: "application/ld+json", children: structuredData }],
  }),
  component: RootComponent,
});

function RootComponent() {
  useEffect(preventIosFocusZoom, []);

  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <RootProvider
          theme={{ enabled: false }}
          search={{ options: { api: `${import.meta.env.BASE_URL}api/search` } }}
        >
          <PortalNav />
          <div id="portal-content" tabIndex={-1} className="outline-none">
            <Outlet />
          </div>
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
