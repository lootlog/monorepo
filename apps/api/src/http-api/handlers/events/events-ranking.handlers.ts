import {
  EventRankingResponse,
  EventTimersResponse,
  PendingParticipationConfirmationsResponse,
} from "#src/events/catalog/event-response.schema";
import { EventHeroStatsResponse } from "#src/events/kills/event-kill-response.schema";
import { encodeUnknownResponse } from "#src/shared/schema/encode-response";
import { Effect } from "effect";
import type { EventDataOperations } from "#src/events/events.data-layer";
import { eventRequirements } from "./events-authorization.js";
import {
  stringParameter,
  type EventEndpointBuilders,
  type EventEndpointHandlers,
} from "./events-endpoint.js";

const { read, write, administer, timers } = eventRequirements;

export const eventRankingHandlers = (
  { event }: EventEndpointBuilders,
  operations: Pick<EventDataOperations, "ranking">,
) =>
  ({
    listPendingParticipationConfirmations: ({ params }) =>
      event(
        "listPendingParticipationConfirmations",
        read,
        params,
        (caller, eventId) =>
          operations.ranking
            .getPendingParticipationConfirmations(
              caller.guild,
              eventId,
              caller.member,
            )
            .pipe(
              Effect.map((value) =>
                encodeUnknownResponse(
                  PendingParticipationConfirmationsResponse,
                  value,
                ),
              ),
            ),
      ),
    acknowledgeExpiredParticipationConfirmations: ({ params, payload }) =>
      event(
        "acknowledgeExpiredParticipationConfirmations",
        read,
        params,
        (caller, eventId) =>
          operations.ranking.acknowledgeExpiredParticipationConfirmations(
            caller.guild,
            eventId,
            caller.member,
            payload,
          ),
      ),
    confirmParticipationForKill: ({ params }) =>
      event("confirmParticipationForKill", write, params, (caller, eventId) =>
        Effect.flatMap(stringParameter(params.killId, "killId"), (killId) =>
          operations.ranking.confirmParticipationForKill(
            caller.guild,
            eventId,
            killId,
            caller.member,
          ),
        ),
      ),
    listEventRanking: ({ params }) =>
      event("listEventRanking", read, params, (caller, eventId) =>
        operations.ranking
          .getRanking(
            caller.guild,
            eventId,
            [...caller.roles],
            caller.accessPolicy,
          )
          .pipe(
            Effect.map((value) =>
              encodeUnknownResponse(EventRankingResponse, value),
            ),
          ),
      ),
    updateRankingPoints: ({ params, payload }) =>
      event("updateRankingPoints", administer, params, (caller, eventId) =>
        Effect.flatMap(
          stringParameter(params.rankingId, "rankingId"),
          (rankingId) =>
            operations.ranking.updateRankingPoints(
              caller.guild,
              eventId,
              rankingId,
              payload,
              caller.userId,
            ),
        ).pipe(Effect.asVoid),
      ),
    listEventHeroTimers: ({ params, query }) =>
      event("listEventHeroTimers", timers, params, (caller, eventId) =>
        operations.ranking
          .getEventHeroTimers(
            caller.guild,
            eventId,
            query.world,
            [...caller.roles],
            caller.accessPolicy,
          )
          .pipe(
            Effect.map((value) =>
              encodeUnknownResponse(EventTimersResponse, value),
            ),
          ),
      ),
    EventsRankingControllerGetEventHeroStats: ({ params }) =>
      event(
        "EventsRankingControllerGetEventHeroStats",
        read,
        params,
        (caller, eventId) =>
          operations.ranking
            .getEventHeroStats(
              caller.guild,
              eventId,
              [...caller.roles],
              caller.accessPolicy,
            )
            .pipe(
              Effect.map((values) =>
                values.map((value) =>
                  encodeUnknownResponse(EventHeroStatsResponse, value),
                ),
              ),
            ),
      ),
  }) satisfies EventEndpointHandlers;
