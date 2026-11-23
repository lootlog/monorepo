import { CSPProvider } from "@base-ui/react/csp-provider";
import {
  HeadContent,
  Scripts,
  createRootRoute,
  redirect,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import favicon from "@/assets/favicon.svg?no-inline";
import { AdminError } from "@/components/admin-error";
import { AdminHeader } from "@/components/admin-header";
import { AdminNotFound } from "@/components/admin-not-found";
import { text } from "@/lib/messages";
import { requestNonce } from "@/lib/request-nonce";
import { getOperatorAccess } from "@/server/queries";
import appCss from "@/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "color-scheme", content: "dark" },
      { name: "robots", content: "noindex, nofollow" },
      { title: text.title },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: favicon, type: "image/svg+xml" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/sign-in") return { operator: undefined };

    const access = await getOperatorAccess();

    if (access.status !== "admin")
      throw redirect({ to: "/sign-in", search: { reason: access.status } });

    return { operator: { userId: access.userId, name: access.name } };
  },
  shellComponent: RootDocument,
  notFoundComponent: AdminNotFound,
  errorComponent: AdminError,
});

function RootDocument({ children }: { children: ReactNode }) {
  const { operator } = Route.useRouteContext();

  return (
    <html lang="pl" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <CSPProvider nonce={requestNonce()}>
          <AdminHeader operator={operator?.name} />
          <main
            id="content"
            tabIndex={-1}
            className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 outline-none md:px-6"
          >
            {children}
          </main>
        </CSPProvider>
        <Scripts />
      </body>
    </html>
  );
}
