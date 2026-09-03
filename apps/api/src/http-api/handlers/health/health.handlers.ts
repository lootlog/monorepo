import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LootlogApi } from "../../lootlog-api.js";
import {
  healthCheck,
  toPublicSystemHttpResponse,
} from "../public-system/public-system.operations.js";

export const HealthHandlers = HttpApiBuilder.group(
  LootlogApi,
  "health",
  (handlers) =>
    handlers.handle("HealthzControllerHealthCheck", () =>
      toPublicSystemHttpResponse(healthCheck()),
    ),
);
