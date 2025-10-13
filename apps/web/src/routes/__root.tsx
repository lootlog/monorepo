import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { GlobalContextProvider } from "@/contexts/global-context";
import { ThemeProvider } from "next-themes";

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
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <NuqsAdapter>
        <GlobalContextProvider>
          <QueryClientProvider client={queryClient}>
            <Outlet />
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </GlobalContextProvider>
      </NuqsAdapter>
    </ThemeProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
