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
] as const satisfies readonly PublicApiOperation[];
