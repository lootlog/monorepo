import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { GatewayProvider } from "@/contexts/gateway-context";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QUERY_CLIENT_CACHE_TIME_MS } from "@/constants/query-client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: QUERY_CLIENT_CACHE_TIME_MS,
    },
  },
});

const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
});

persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: QUERY_CLIENT_CACHE_TIME_MS,
});

ReactDOM.createRoot(
  (() => {
    const app = document.createElement("div");
    app.id = "lootlog-root";
    app.className =
      "ll-absolute ll-top-0 ll-left-0 ll-z-20 ll-h-screen ll-w-screen ll-pointer-events-none";
    document.body.append(app);
    return app;
  })()
).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark-theme" storageKey="lootlog-theme">
      <QueryClientProvider client={queryClient}>
        <GatewayProvider>
          <App />
        </GatewayProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);
