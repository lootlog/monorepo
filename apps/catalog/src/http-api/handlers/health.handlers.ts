import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { CatalogApi } from "../catalog-api.js";

export const HealthHandlers = HttpApiBuilder.group(
  CatalogApi,
  "health",
  (handlers) =>
    handlers.handle("HealthzControllerHealthCheck", () => Effect.void),
);
