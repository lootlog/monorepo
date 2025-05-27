import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { GlobalContextProvider } from "./contexts/global-context";
import { Auth0ProviderWithConfig } from "./providers/auth0-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { GatewayContext, GatewayProvider } from "@/contexts/gateway-context";

const queryClient = new QueryClient();

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
        <Auth0ProviderWithConfig>
          <GlobalContextProvider>
            <GatewayProvider>
              <App />
            </GatewayProvider>
          </GlobalContextProvider>
        </Auth0ProviderWithConfig>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);
