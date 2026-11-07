import { configureApiClients } from "@lootlog/client/transport";
import { createIsomorphicFn } from "@tanstack/react-start";
import type { RuntimeConfig } from "@/config/runtime-config";
import { readCatalogUpstream } from "@/lib/catalog-upstream";

// A server render waits this long for a query before it leaves the query
// to the browser.
const SERVER_TIMEOUT_MS = 1500;

/** Where the browser reads the catalog: the Worker, which holds the token. */
export const CATALOG_PROXY_PATH = "/api/catalog";

let isConfigured = false;

/**
 * Points the browser's generated clients at this environment's services.
 * Requests to the main API carry the shared auth cookie, which its edge
 * authentication requires; catalog requests stay on the wiki's own origin.
 */
export const configureWikiApiClients = (config: RuntimeConfig) => {
  if (isConfigured || typeof window === "undefined") return;

  isConfigured = true;

  configureApiClients({
    main: { baseUrl: config.apiUrl, credentials: "include" },
    catalog: {
      baseUrl: new URL(CATALOG_PROXY_PATH, window.location.origin).toString(),
    },
  });
};

let isServerConfigured = false;

/**
 * Points the server's renders at the catalog, the only service they query.
 * It needs no User, so the server sends the Worker's token, not a cookie.
 */
export const configureWikiServerApiClients = createIsomorphicFn()
  .server(() => {
    if (isServerConfigured) return;

    isServerConfigured = true;

    const { baseUrl, headers } = readCatalogUpstream();

    configureApiClients({
      catalog: {
        baseUrl,
        timeoutMs: SERVER_TIMEOUT_MS,
        getHeaders: () => headers,
      },
    });
  })
  .client(() => {});
