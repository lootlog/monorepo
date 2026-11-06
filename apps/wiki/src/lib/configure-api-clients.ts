import { configureApiClients } from "@lootlog/client/transport";
import { createIsomorphicFn } from "@tanstack/react-start";
import type { RuntimeConfig } from "@/config/runtime-config";

// A server render waits this long for a query before it leaves the query
// to the browser.
const SERVER_TIMEOUT_MS = 1500;

let isConfigured = false;

/**
 * Points the generated clients at this environment's services. Requests carry
 * the shared auth cookie, which the services' edge authentication requires.
 */
export const configureWikiApiClients = (config: RuntimeConfig) => {
  if (isConfigured || typeof window === "undefined") return;

  isConfigured = true;

  configureApiClients({
    main: { baseUrl: config.apiUrl, credentials: "include" },
    search: { baseUrl: config.searchApiUrl, credentials: "include" },
  });
};

let isServerConfigured = false;

/**
 * Points the server's renders at the public catalog, the only service they
 * query: it needs no User, so the server sends no cookie.
 */
export const configureWikiServerApiClients = createIsomorphicFn()
  .server(() => {
    if (isServerConfigured) return;

    isServerConfigured = true;

    configureApiClients({
      search: {
        baseUrl: process.env.VITE_SEARCH_API_URL ?? "",
        timeoutMs: SERVER_TIMEOUT_MS,
      },
    });
  })
  .client(() => {});
