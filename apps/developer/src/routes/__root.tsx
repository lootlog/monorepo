import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import appCss from "~/styles/app.css?url";
import { DocsLayout } from "~/components/docs-layout";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lootlog Developer Portal" },
      {
        name: "description",
        content: "Dokumentacja i zasoby dla deweloperów Lootlog",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="pl" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <DocsLayout>
          <Outlet />
        </DocsLayout>
        <Scripts />
      </body>
    </html>
  );
}
