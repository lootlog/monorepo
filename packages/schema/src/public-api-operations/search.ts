import type { PublicApiOperation } from "../public-api-policy.js";

/** Search service operations. */
export const SEARCH_OPERATIONS = [
  {
    service: "search",
    method: "GET",
    path: "/healthz",
    operationId: "HealthzController_healthCheck",
    access: "session-only",
    data: "public",
  },
  {
    service: "search",
    method: "GET",
    path: "/players",
    operationId: "PlayersController_getPlayers",
    access: "read",
    data: "public",
  },
  {
    service: "search",
    method: "GET",
    path: "/npcs",
    operationId: "NpcsController_getNpcs",
    access: "read",
    data: "public",
  },
  {
    service: "search",
    method: "GET",
    path: "/items",
    operationId: "ItemsController_getItems",
    access: "read",
    data: "public",
  },
  {
    service: "search",
    method: "GET",
    path: "/all",
    operationId: "AllController_searchAll",
    access: "read",
    data: "public",
  },
  {
    service: "search",
    method: "GET",
    path: "/public/catalog/items",
    operationId: "CatalogController_getItems",
    access: "read",
    data: "public",
  },
  {
    service: "search",
    method: "GET",
    path: "/public/catalog/npcs",
    operationId: "CatalogController_getNpcs",
    access: "read",
    data: "public",
  },
] as const satisfies readonly PublicApiOperation[];
