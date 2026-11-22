import { CSPProvider } from "@base-ui/react/csp-provider";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  redirect,
} from "@tanstack/react-router";
import { ErrorPanel } from "@/components/error-panel";
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
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/sign-in") return { operator: undefined };

    const access = await getOperatorAccess();

    if (access.status !== "admin")
      throw redirect({ to: "/sign-in", search: { reason: access.status } });

    return { operator: { userId: access.userId, name: access.name } };
  },
  component: RootComponent,
  notFoundComponent: () => (
    <ErrorPanel
      title={text.notFoundTitle}
      description={text.notFoundDescription}
    />
  ),
  errorComponent: () => (
    <ErrorPanel title={text.errorTitle} description={text.errorDescription} />
  ),
});

const navLink =
  "rounded-control px-3 py-1.5 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[status=active]:bg-secondary data-[status=active]:text-foreground";

function RootComponent() {
  const { operator } = Route.useRouteContext();

  return (
    <html lang="pl" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-control focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          {text.skipToContent}
        </a>
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 md:px-6">
            <span className="text-sm font-semibold">{text.title}</span>
            {operator === undefined ? null : (
              <>
                <nav aria-label={text.title} className="flex gap-1">
                  <Link
                    to="/"
                    activeOptions={{ exact: true, includeSearch: false }}
                    className={navLink}
                  >
                    {text.navUsers}
                  </Link>
                  <Link to="/audit" className={navLink}>
                    {text.navAudit}
                  </Link>
                </nav>
                <p className="ml-auto text-xs text-muted-foreground">
                  {text.operator}:{" "}
                  <span className="text-foreground">{operator.name}</span>
                </p>
              </>
            )}
          </div>
        </header>
        <main
          id="content"
          className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-6"
        >
          <CSPProvider nonce={requestNonce()}>
            <Outlet />
          </CSPProvider>
        </main>
        <Scripts />
      </body>
    </html>
  );
}
