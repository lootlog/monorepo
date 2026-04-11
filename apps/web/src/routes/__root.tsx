import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useReducedMotion } from "framer-motion";
import { GlobalContextProvider } from "@/contexts/global-context";
import { ThemeProvider } from "@/contexts/theme-context";
import type { RouterContext } from "@/App";
import { CatSpinnerProvider } from "@/contexts/cat-spinner-provider";
import { ThemedRukiaFrostOverlay } from "@/components/effects/themed-rukia-frost-overlay";
import { RootRouteError } from "@/components/router/root-route-error";
import { RootRouteNotFound } from "@/components/router/root-route-not-found";

import "@lootlog/ui/globals.css";
import "@/i18n/config";

const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((module) => ({
    default: module.ReactQueryDevtools,
  })),
);

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const prefersReducedMotion = useReducedMotion();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CatSpinnerProvider>
          <NuqsAdapter>
            <GlobalContextProvider>
              <Outlet />
              {!prefersReducedMotion && <ThemedRukiaFrostOverlay />}
              {import.meta.env.DEV ? (
                <Suspense fallback={null}>
                  <ReactQueryDevtools initialIsOpen={false} />
                </Suspense>
              ) : null}
            </GlobalContextProvider>
          </NuqsAdapter>
        </CatSpinnerProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  errorComponent: RootRouteError,
  notFoundComponent: RootRouteNotFound,
});
