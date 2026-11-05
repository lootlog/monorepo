import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { DocsHeader } from "@/components/docs-header";
import { DocsSearchDialog } from "@/components/docs-search-dialog";
import {
  docsTranslations,
  polishTranslations,
} from "@/lib/polish-translations";
import docsCss from "@/src/styles/global.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#081421" },
      { name: "color-scheme", content: "dark" },
      { title: docsTranslations.metadata.title },
      {
        name: "description",
        content: docsTranslations.metadata.description,
      },
    ],
    links: [
      { rel: "stylesheet", href: docsCss },
      { rel: "icon", href: "/brand/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/brand/lootlog-apple-touch.png" },
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
      <body className="min-h-screen bg-background text-foreground antialiased">
        <RootProvider
          theme={{ enabled: false }}
          i18n={{ locale: "pl", translations: polishTranslations }}
          search={{ SearchDialog: DocsSearchDialog }}
        >
          <DocsHeader />
          <div id="portal-content" tabIndex={-1} className="outline-none">
            <Outlet />
          </div>
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
