import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
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
      <body>
        <RootProvider
          theme={{ enabled: false }}
          i18n={{ locale: "pl", translations: polishTranslations }}
          search={{ SearchDialog: DocsSearchDialog }}
        >
          <Outlet />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
