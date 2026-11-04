import { createRouter, RouterProvider } from "@tanstack/react-router";
import { Button } from "@lootlog/ui/components/button";
import { UiLabelsProvider } from "@lootlog/ui/components/ui-labels";
import { useTranslation } from "react-i18next";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "@/lib/query-client";
import type { QueryClient } from "@tanstack/react-query";
import type { SessionData } from "@/hooks/auth/use-session";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { AppErrorBoundary } from "@/components/router/app-error-boundary";
import { RouteErrorState } from "@/components/router/route-error-state";
import { RouteRetryButton } from "@/components/router/route-retry-button";
import { ROUTES } from "@/config/routes";
import { releaseStartupScreenOnFirstResolve } from "@/lib/startup-screen";
import { parseSearch, stringifySearch } from "@/lib/router/search-string";

export interface RouterContext {
  queryClient: QueryClient;
  session?: SessionData | null;
}

const router = createRouter({
  routeTree,
  context: {
    queryClient,
    session: undefined,
  },
  parseSearch,
  stringifySearch,
  defaultPendingComponent: PageSkeleton,
  defaultPreload: "intent",
  // A click answers within a frame or two with the target page's skeleton.
  // Placeholders reveal themselves late (`animate-skeleton`), so a fast
  // response still never flashes one and no minimum pending time is needed.
  // The router renders whatever has resolved when this timer fires, so it
  // stays above zero: parent layouts with cached data need a tick to settle,
  // otherwise their generic skeleton wins over the page's own.
  defaultPendingMs: 50,
  defaultPendingMinMs: 0,
  scrollRestoration: true,
});

releaseStartupScreenOnFirstResolve(router);

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }

  interface HistoryState {
    restoreFallback?: boolean;
  }
}

function App() {
  const { t } = useTranslation();

  return (
    <UiLabelsProvider
      labels={{
        close: t("common.close"),
        sidebarTitle: t("common.uiLabels.sidebarTitle"),
        sidebarDescription: t("common.uiLabels.sidebarDescription"),
        toggleSidebar: t("common.uiLabels.toggleSidebar"),
        commandPaletteTitle: t("common.uiLabels.commandPaletteTitle"),
        commandPaletteDescription: t(
          "common.uiLabels.commandPaletteDescription",
        ),
        pagination: t("common.uiLabels.pagination"),
        previousPage: t("common.uiLabels.previousPage"),
        nextPage: t("common.uiLabels.nextPage"),
        previous: t("common.uiLabels.previous"),
        next: t("common.uiLabels.next"),
        morePages: t("common.uiLabels.morePages"),
      }}
    >
      <AppErrorBoundary
        fallback={(reset) => (
          <div className="flex min-h-dvh bg-background">
            <RouteErrorState
              status={500}
              description={t("common.routeErrors.global.description")}
              primaryAction=<RouteRetryButton onRetry={reset} />
              secondaryAction={
                <Button
                  variant="outline"
                  onClick={() => window.location.assign(ROUTES.user.dashboard)}
                >
                  {t("common.routeErrors.actions.goToDashboard")}
                </Button>
              }
            />
          </div>
        )}
      >
        <RouterProvider router={router} />
      </AppErrorBoundary>
    </UiLabelsProvider>
  );
}

export default App;
