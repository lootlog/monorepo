import type { PublicApiOperation } from "../public-api-policy.js";

/** Catalog service operations: game facts with no Organization behind them. */
export const CATALOG_OPERATIONS = [
  {
    service: "catalog",
    method: "GET",
    path: "/healthz",
    operationId: "HealthzController_healthCheck",
    access: "session-only",
    data: "public",
  },
  {
    service: "catalog",
    method: "GET",
    path: "/catalog/items",
    operationId: "CatalogController_getItems",
    access: "read",
    data: "public",
  },
  {
    service: "catalog",
    method: "GET",
    path: "/catalog/npcs",
    operationId: "CatalogController_getNpcs",
    access: "read",
    data: "public",
  },
  {
    service: "catalog",
    method: "GET",
    path: "/catalog/events",
    operationId: "CatalogController_getEvents",
    access: "read",
    data: "public",
  },
  {
    service: "catalog",
    method: "GET",
    path: "/catalog/index",
    operationId: "CatalogController_getIndex",
    access: "read",
    data: "public",
  },
] as const satisfies readonly PublicApiOperation[];
