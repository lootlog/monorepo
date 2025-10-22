import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { GlobalContextProvider } from "@/contexts/global-context";
import { GatewayProvider } from "@/contexts/gateway-context";
import { ThemeProvider } from "@/contexts/theme-context";

import "@lootlog/ui/globals.css";
import "@/i18n/config";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <NuqsAdapter>
          <GlobalContextProvider>
            <GatewayProvider>
              <Outlet />
              <ReactQueryDevtools initialIsOpen={false} />
            </GatewayProvider>
          </GlobalContextProvider>
        </NuqsAdapter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
