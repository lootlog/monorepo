import { KillHistoryResponse } from "#src/events/history/event-kill-history.schema";
import { KillDetailResponse } from "#src/events/kills/event-kill-response.schema";
import { KillTimelineMapResponse } from "#src/events/monitoring/event-monitoring-response.schema";
import { encodeUnknownResponse } from "#src/shared/schema/encode-response";
import { Effect } from "effect";
import type { EventDataOperations } from "./events.data-layer.js";
import {
  eventRequirements,
  type AuthorizedEventCaller,
} from "./events-authorization.js";
import {
  stringParameter,
  type EventEndpointBuilders,
  type EventEndpointHandlers,
} from "./events-endpoint.js";

const { read, administer } = eventRequirements;

const historyContext = (caller: AuthorizedEventCaller, eventId: string) => ({
  guildId: caller.guild.id,
  eventId,
  roles: [...caller.roles],
  accessPolicy: caller.accessPolicy,
});

export const eventKillHandlers = (
  { event }: EventEndpointBuilders,
  operations: Pick<EventDataOperations, "history" | "ranking">,
) =>
  ({
    listEventKillHistory: ({ params, query }) =>
      event("listEventKillHistory", read, params, (caller, eventId) =>
        operations.history
          .list(historyContext(caller, eventId), query)
          .pipe(
            Effect.map((value) =>
              encodeUnknownResponse(KillHistoryResponse, value),
            ),
          ),
      ),
    EventsRankingControllerGetKillDetail: ({ params }) =>
      event(
        "EventsRankingControllerGetKillDetail",
        read,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
            Effect.flatMap(stringParameter(params.killId, "killId"), (killId) =>
              operations.history
                .detail(historyContext(caller, eventId), { heroId, killId })
                .pipe(
                  Effect.map((value) =>
                    encodeUnknownResponse(KillDetailResponse, value),
                  ),
                ),
            ),
          ),
      ),
    EventsRankingControllerUpdateKillPoint: ({ params, payload }) =>
      event(
        "EventsRankingControllerUpdateKillPoint",
        administer,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.killId, "killId"), (killId) =>
            Effect.flatMap(
              stringParameter(params.killPointId, "killPointId"),
              (killPointId) =>
                operations.ranking.updateKillPoint(
                  caller.guild,
                  eventId,
                  killId,
                  killPointId,
                  payload,
                  caller.userId,
                ),
            ),
          ).pipe(Effect.asVoid),
      ),
    EventsMonitoringControllerGetKillTimelineData: ({ params }) =>
      event(
        "EventsMonitoringControllerGetKillTimelineData",
        read,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
            Effect.flatMap(stringParameter(params.killId, "killId"), (killId) =>
              operations.history
                .timeline(historyContext(caller, eventId), {
                  heroId,
                  killId,
                })
                .pipe(
                  Effect.map((values) =>
                    values.map((value) =>
                      encodeUnknownResponse(KillTimelineMapResponse, value),
                    ),
                  ),
                ),
            ),
          ),
      ),
  }) satisfies EventEndpointHandlers;
