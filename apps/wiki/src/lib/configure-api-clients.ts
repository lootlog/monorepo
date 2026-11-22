import { configureApiClients } from "@lootlog/client/transport";
import { createIsomorphicFn } from "@tanstack/react-start";
import type { RuntimeConfig } from "@/config/runtime-config";
import { readCatalogUpstream } from "@/lib/catalog-upstream";

const SERVER_TIMEOUT_MS = 1500;

const CATALOG_PROXY_PATH = "/api/catalog";

let isConfigured = false;

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
