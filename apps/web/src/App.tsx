import { createRouter, RouterProvider } from "@tanstack/react-router";
import { Button } from "@lootlog/ui/components/button";
import { useTranslation } from "react-i18next";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "@/lib/query-client";
import type { QueryClient } from "@tanstack/react-query";
import type { SessionData } from "@/hooks/auth/use-session";
import { RouteSectionLoading } from "@/components/ui/route-section-loading";
import { AppErrorBoundary } from "@/components/router/app-error-boundary";
import { RouteErrorState } from "@/components/router/route-error-state";
import { RouteRetryButton } from "@/components/router/route-retry-button";
import { ROUTES } from "@/config/routes";

export interface RouterContext {
  queryClient: QueryClient;
  session?: SessionData | null;
}

const parseSearchValue = (values: string[]) => {
  if (values.length > 1) {
    return values;
  }

  return values[0] ?? "";
};

const parseSearch = (searchString: string) => {
  const normalizedSearch = searchString.startsWith("?")
    ? searchString.slice(1)
    : searchString;
  const searchParams = new URLSearchParams(normalizedSearch);
  const parsedSearch = Object.create(null) as Record<string, string | string[]>;
  const seenKeys = new Set<string>();

  for (const key of searchParams.keys()) {
    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);

    const values = searchParams.getAll(key);
    parsedSearch[key] = parseSearchValue(values);
  }

  return parsedSearch;
};

const stringifySearch = (search: Record<string, unknown>) => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(search)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === null || item === undefined) {
          continue;
        }

        searchParams.append(key, String(item));
      }

      continue;
    }

    searchParams.set(key, String(value));
  }

  const serializedSearch = searchParams.toString();
  return serializedSearch ? `?${serializedSearch}` : "";
};

const router = createRouter({
  routeTree,
  context: {
    queryClient,
    session: undefined,
  },
  parseSearch,
  stringifySearch,
  defaultPendingComponent: RouteSectionLoading,
  defaultPreload: "intent",
  defaultPendingMs: 250,
  defaultPendingMinMs: 150,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const { t } = useTranslation();

  return (
    <AppErrorBoundary
      fallback={(reset) => (
        <div className="flex min-h-dvh bg-background">
          <RouteErrorState
            status={500}
            description={t("common.routeErrors.global.description")}
            primaryAction={<RouteRetryButton onRetry={reset} />}
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
  );
}

export default App;
