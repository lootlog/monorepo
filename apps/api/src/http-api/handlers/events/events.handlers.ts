import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { LootlogApi } from "../../lootlog-api.js";
import { EventOperations } from "./events.data-layer.js";
import { eventAssignmentHandlers } from "./events-assignment.handlers.js";
import { EventsAuthorization } from "./events-authorization.js";
import { eventCatalogHandlers } from "./events-catalog.handlers.js";
import { eventEndpointBuilders } from "./events-endpoint.js";
import { eventKillHandlers } from "./events-kills.handlers.js";
import { eventMonitoringHandlers } from "./events-monitoring.handlers.js";
import { eventPinHandlers } from "./events-pins.handlers.js";
import { eventRankingHandlers } from "./events-ranking.handlers.js";

export const EventsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "events",
  Effect.fn(function* (handlers) {
    const authorization = yield* EventsAuthorization;
    const operations = yield* EventOperations;
    const endpoints = eventEndpointBuilders(authorization);

    // Spread order is route registration order.
    return handlers.handleAll({
      ...eventCatalogHandlers(endpoints, operations),
      ...eventAssignmentHandlers(endpoints, operations),
      ...eventRankingHandlers(endpoints, operations),
      ...eventKillHandlers(endpoints, operations),
      ...eventMonitoringHandlers(endpoints, operations),
      ...eventPinHandlers(endpoints, operations),
    });
  }),
);
