import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@lootlog/ui/components/sonner";
import { preventIosFocusZoom } from "@lootlog/ui/lib/ios-focus-zoom";
import { portalText } from "@/lib/translations";
import { DeveloperError } from "@/components/developer-error";
import { DeveloperNotFound } from "@/components/developer-not-found";
import { PortalNav } from "@/components/portal-nav";
import {
  COMMUNITY_LINKS,
  PUBLIC_SITE_ORIGINS,
} from "@lootlog/domain/public-sites";
import appCss from "@/styles/app.css?url";
import favicon from "@/assets/favicon.svg?no-inline";
import appleTouchIcon from "@/assets/lootlog-apple-touch.png?no-inline";

const structuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: portalText.title,
  url: `${PUBLIC_SITE_ORIGINS.developer}/`,
  description: portalText.description,
  inLanguage: "en",
  publisher: {
    "@type": "Organization",
    name: "Lootlog",
    url: PUBLIC_SITE_ORIGINS.web,
    sameAs: [COMMUNITY_LINKS.github],
  },
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#060607" },
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
  shellComponent: RootComponent,
  notFoundComponent: DeveloperNotFound,
  errorComponent: DeveloperError,
});

function RootComponent({ children }: { children: ReactNode }) {
  useEffect(preventIosFocusZoom, []);

  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col bg-background text-foreground antialiased">
        <RootProvider
          theme={{ enabled: false }}
          search={{ options: { api: `${import.meta.env.BASE_URL}api/search` } }}
        >
          <PortalNav />
          <div
            id="portal-content"
            tabIndex={-1}
            className="flex-1 outline-none"
          >
            {children}
          </div>
          <Toaster toastOptions={{ closeButtonAriaLabel: portalText.close }} />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
