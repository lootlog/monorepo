import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { GlobalContextProvider } from "@/contexts/global-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { setupApiInterceptors } from "@/lib/api-client/api-client";
import type { RouterContext } from "@/App";

import "@lootlog/ui/globals.css";
import "@/i18n/config";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <NuqsAdapter>
          <GlobalContextProvider>
            <Outlet />
            <ReactQueryDevtools initialIsOpen={false} />
          </GlobalContextProvider>
        </NuqsAdapter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: () => {
    setupApiInterceptors();
  },
  component: RootComponent,
});
