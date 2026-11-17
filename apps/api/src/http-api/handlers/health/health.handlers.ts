import { Effect } from "effect";
import {
  PublicSystemData,
  toPublicSystemHttpResponse,
} from "../../access/public-system.access.js";
import { HttpApiBuilder } from "effect/http-api";
import { LootlogApi } from "../../lootlog-api.js";

export const healthCheck = Effect.fn("HealthzControllerHealthCheck")(
  function* () {
    const data = yield* PublicSystemData;
    yield* data.healthCheck;
  },
);

export const HealthHandlers = HttpApiBuilder.group(
  LootlogApi,
  "health",
  (handlers) =>
    handlers.handle("HealthzControllerHealthCheck", () =>
      toPublicSystemHttpResponse(healthCheck()),
    ),
);
