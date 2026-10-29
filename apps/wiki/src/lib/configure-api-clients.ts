import { configureApiClients } from "@lootlog/client/transport";
import type { RuntimeConfig } from "@/config/runtime-config";

let isConfigured = false;

/**
 * Points the generated clients at this environment's services. Requests carry
 * the shared auth cookie, which the services' edge authentication requires.
 * Queries run only in the browser, so the server never configures them.
 */
export const configureWikiApiClients = (config: RuntimeConfig) => {
  if (isConfigured || typeof window === "undefined") return;

  isConfigured = true;

  configureApiClients({
    main: { baseUrl: config.apiUrl, credentials: "include" },
    search: { baseUrl: config.searchApiUrl, credentials: "include" },
  });
};
