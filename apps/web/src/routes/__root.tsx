import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { GlobalContextProvider } from "@/contexts/global-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { persister } from "@/lib/query-client";
import type { RouterContext } from "@/App";
import { RukiaFrostOverlay } from "@/components/effects/rukia-frost-overlay";

import "@lootlog/ui/globals.css";
import "@/i18n/config";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
    >
      <ThemeProvider>
        <NuqsAdapter>
          <GlobalContextProvider>
            <Outlet />
            <RukiaFrostOverlay />
            <ReactQueryDevtools initialIsOpen={false} />
          </GlobalContextProvider>
        </NuqsAdapter>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});
