import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useReducedMotion } from "framer-motion";
import { GlobalContextProvider } from "@/contexts/global-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { persister } from "@/lib/query-client";
import type { RouterContext } from "@/App";
import { CatSpinnerProvider } from "@/contexts/cat-spinner-provider";
import { ThemedRukiaFrostOverlay } from "@/components/effects/themed-rukia-frost-overlay";

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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
    >
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
    </PersistQueryClientProvider>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});
