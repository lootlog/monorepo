import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { DocsError } from "@/components/docs-error";
import { DocsFooter } from "@/components/docs-footer";
import { DocsHeader } from "@/components/docs-header";
import { DocsNotFound } from "@/components/docs-not-found";
import { DocsSearchDialog } from "@/components/docs-search-dialog";
import {
  docsTranslations,
  polishTranslations,
} from "@/lib/polish-translations";
import appleTouchIcon from "@/assets/apple-touch-icon.png?no-inline";
import favicon from "@/assets/favicon.svg?no-inline";
import docsCss from "@/styles/global.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#060607" },
      { name: "color-scheme", content: "dark" },
      { title: docsTranslations.metadata.title },
      {
        name: "description",
        content: docsTranslations.metadata.description,
      },
    ],
    links: [
      { rel: "stylesheet", href: docsCss },
      { rel: "icon", href: favicon, type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: appleTouchIcon },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: DocsNotFound,
  errorComponent: DocsError,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col bg-background text-foreground antialiased">
        <RootProvider
          theme={{ enabled: false }}
          i18n={{ locale: "pl", translations: polishTranslations }}
          search={{ SearchDialog: DocsSearchDialog }}
        >
          <DocsHeader />
          <div
            id="portal-content"
            tabIndex={-1}
            className="flex-1 outline-none"
          >
            {children}
          </div>
          <DocsFooter />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
