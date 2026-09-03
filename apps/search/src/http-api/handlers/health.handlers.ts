import { Effect } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { SearchApi } from "../search-api.js";

export const HealthHandlers = HttpApiBuilder.group(
  SearchApi,
  "health",
  (handlers) =>
    handlers.handle("HealthzControllerHealthCheck", () => Effect.void),
);
