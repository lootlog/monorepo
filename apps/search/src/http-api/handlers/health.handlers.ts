import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { SearchApi } from "../search-api.js";

export const HealthHandlers = HttpApiBuilder.group(
  SearchApi,
  "health",
  (handlers) =>
    handlers.handle("HealthzControllerHealthCheck", () => Effect.void),
);
