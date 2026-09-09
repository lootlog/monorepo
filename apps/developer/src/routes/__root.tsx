import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { portalText } from "~/lib/translations";
import { PortalNav } from "~/components/portal-nav";
import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: portalText.title },
      {
        name: "description",
        content: portalText.description,
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
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
