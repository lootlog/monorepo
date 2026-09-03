import { Context, Effect } from "effect";
import { OpenApi } from "effect/unstable/httpapi";
import type { EventsAssignment } from "#src/events/coordination/events-assignment.operations";
import type { EventsCatalog } from "#src/events/catalog/events-catalog.operations";
import type { EventsMonitoring } from "#src/events/monitoring/events-monitoring.operations";
import type { EventsPins } from "#src/events/pins/events-pins.operations";
import type { EventsRanking } from "#src/events/ranking/events-ranking.operations";
import {
  EventMutationResponse,
  EventOverviewResponse,
  EventsListResponse,
  EventRankingResponse,
  EventTimersResponse,
  PendingParticipationConfirmationsResponse,
} from "#src/events/catalog/event-response.schema";
import { PinnedEventResponse } from "#src/events/pins/pinned-event-response.schema";
import {
  EventHeroStatsResponse,
  EventKillHistoryResponse,
  EventMemberKillHistoryResponse,
  KillDetailResponse,
} from "#src/events/kills/event-kill-response.schema";
import { EventCoordinationResponse } from "#src/events/coordination/event-coordination-response.schema";
import {
  CoverageGapResponse,
  HeroCoverageGapResponse,
  HeroPresenceStatsResponse,
  HeroRespawnConfigResponse,
  KillTimelineMapResponse,
  NullableCoverageGapResponse,
} from "#src/events/monitoring/event-monitoring-response.schema";
import { encodeUnknownResponse } from "#src/shared/schema/encode-response";
import { applicationErrorStatusOrUndefined } from "#src/shared/http/http-errors";
import { LootlogApi } from "../../lootlog-api.js";
import {
  EventsAccessDenied,
  EventsBadRequest,
  EventsConflict,
  EventsData,
  EventsDataError,
  EventsNotFound,
  type EventEndpointIdentifier,
  type EventRequest,
} from "./events.handlers.js";

export interface EventDataOperations {
  readonly assignment: EventsAssignment;
  readonly catalog: EventsCatalog;
  readonly monitoring: EventsMonitoring;
  readonly pins: EventsPins;
  readonly ranking: EventsRanking;
}

type EventFailure =
  | EventsAccessDenied
  | EventsBadRequest
  | EventsConflict
  | EventsDataError
  | EventsNotFound;

const operationIds = Object.fromEntries(
  Object.entries(LootlogApi.groups.events.endpoints).map(
    ([identifier, endpoint]) => [
      identifier,
      Context.getOrUndefined(endpoint.annotations, OpenApi.Identifier) ??
        identifier,
    ],
  ),
) as Record<EventEndpointIdentifier, string>;

const operationFailure = (cause: unknown): EventFailure => {
  const status = applicationErrorStatusOrUndefined(cause);

  if (status === 400) {
    return new EventsBadRequest({ status, code: "BAD_REQUEST" });
  }
  if (status === 403) {
    return new EventsAccessDenied({ status, code: "FORBIDDEN" });
  }
  if (status === 404) {
    return new EventsNotFound({ status, code: "NOT_FOUND" });
  }
  if (status === 409) {
    return new EventsConflict({ status, code: "CONFLICT" });
  }
  return new EventsDataError({ cause });
};

const effectOperation = <A, E>(
  endpoint: EventEndpointIdentifier,
  effect: Effect.Effect<A, E>,
) =>
  effect.pipe(
    Effect.mapError(operationFailure),
    Effect.withSpan(operationIds[endpoint], {
      attributes: { adapter: "events", retryCount: 0 },
    }),
  );

const requireStringParameter = (request: EventRequest, key: string) => {
  const value = request.params?.[key];
  return typeof value === "string" && value.length > 0
    ? Effect.succeed(value)
    : Effect.fail(
        new EventsBadRequest({
          status: 400,
          code: `INVALID_${key.toUpperCase()}`,
        }),
      );
};

const optionalString = (
  source: Readonly<Record<string, unknown>> | undefined,
  key: string,
) => {
  const value = source?.[key];
  return typeof value === "string" ? value : undefined;
};

const payload = <A>(request: EventRequest): A => request.payload as A;

export const eventDataLayer = (operations: EventDataOperations) =>
  EventsData.layer({
    execute: (endpoint, request, caller) =>
      // oxlint-disable-next-line eslint/complexity -- Exhaustive dispatch keeps every generated operation explicit and contract-checkable.
      Effect.gen(function* () {
        const eventId =
          endpoint === "listEvents" ||
          endpoint === "createEvent" ||
          endpoint === "listPinnedEvents"
            ? undefined
            : yield* requireStringParameter(request, "eventId");

        switch (endpoint) {
          case "listEvents":
            return yield* effectOperation(
              endpoint,
              operations.catalog.getEvents(
                caller.guild,
                caller.accessPolicy,
                optionalString(request.query, "world"),
                optionalString(request.query, "activeOnly"),
                [...caller.roles],
              ),
            ).pipe(
              Effect.map((events) =>
                encodeUnknownResponse(EventsListResponse, events),
              ),
            );
          case "createEvent":
            return yield* effectOperation(
              endpoint,
              operations.catalog.createEvent(payload(request), caller.guild),
            ).pipe(
              Effect.map((event) =>
                encodeUnknownResponse(EventMutationResponse, event),
              ),
            );
          case "showEvent":
            return yield* effectOperation(
              endpoint,
              operations.catalog.getEvent(
                caller.guild,
                eventId,
                [...caller.roles],
                caller.accessPolicy,
              ),
            ).pipe(
              Effect.map((event) =>
                encodeUnknownResponse(EventOverviewResponse, event),
              ),
            );
          case "deleteEvent":
            return yield* effectOperation(
              endpoint,
              operations.catalog.deleteEvent(caller.guild, eventId),
            );
          case "updateEvent":
            return yield* effectOperation(
              endpoint,
              operations.catalog.updateEvent(
                caller.guild,
                eventId,
                payload(request),
              ),
            ).pipe(
              Effect.map((event) =>
                encodeUnknownResponse(EventMutationResponse, event),
              ),
            );
          case "showEventOverview":
            return yield* effectOperation(
              endpoint,
              operations.catalog.getEventOverview(
                caller.guild,
                eventId,
                [...caller.roles],
                caller.accessPolicy,
              ),
            ).pipe(
              Effect.map((event) =>
                encodeUnknownResponse(EventOverviewResponse, event),
              ),
            );
          case "showEventWrapped":
            return yield* effectOperation(
              endpoint,
              operations.catalog.getWrapped(
                caller.guild,
                eventId,
                [...caller.roles],
                caller.accessPolicy,
              ),
            );
          case "listEventMaps":
            return yield* effectOperation(
              endpoint,
              operations.catalog.getEventMaps(
                caller.guild,
                eventId,
                [...caller.roles],
                caller.accessPolicy,
              ),
            );
          case "recalculateEventPoints":
            return yield* effectOperation(
              endpoint,
              operations.catalog.recalculatePoints(caller.guild, eventId),
            );
          case "EventsAssignmentControllerAssignMember": {
            const mapId = yield* requireStringParameter(request, "mapId");
            return yield* effectOperation(
              endpoint,
              operations.assignment.assignMember(
                caller.guild,
                eventId,
                mapId,
                payload(request),
              ),
            );
          }
          case "EventsAssignmentControllerUnassignMember": {
            const mapId = yield* requireStringParameter(request, "mapId");
            return yield* effectOperation(
              endpoint,
              operations.assignment.unassignMember(
                caller.guild,
                eventId,
                mapId,
                optionalString(request.query, "memberId"),
              ),
            );
          }
          case "EventsAssignmentControllerSelfAssignMember": {
            const mapId = yield* requireStringParameter(request, "mapId");
            return yield* effectOperation(
              endpoint,
              operations.assignment.selfAssignMember(
                caller.guild,
                eventId,
                mapId,
                caller.member,
                [...caller.roles],
                caller.accessPolicy,
              ),
            );
          }
          case "EventsAssignmentControllerSelfUnassignMember": {
            const mapId = yield* requireStringParameter(request, "mapId");
            return yield* effectOperation(
              endpoint,
              operations.assignment.selfUnassignMember(
                caller.guild,
                eventId,
                mapId,
                caller.member,
                [...caller.roles],
                caller.accessPolicy,
              ),
            );
          }
          case "EventsAssignmentControllerAddHero":
            return yield* effectOperation(
              endpoint,
              operations.assignment.addHero(
                caller.guild,
                eventId,
                payload(request),
              ),
            );
          case "EventsAssignmentControllerDeleteHero": {
            const heroId = yield* requireStringParameter(request, "heroId");
            return yield* effectOperation(
              endpoint,
              operations.assignment.deleteHero(caller.guild, eventId, heroId),
            );
          }
          case "EventsAssignmentControllerUpdateHero": {
            const heroId = yield* requireStringParameter(request, "heroId");
            return yield* effectOperation(
              endpoint,
              operations.assignment.updateHero(
                caller.guild,
                eventId,
                heroId,
                payload(request),
              ),
            );
          }
          case "EventsAssignmentControllerAddMap": {
            const heroId = yield* requireStringParameter(request, "heroId");
            return yield* effectOperation(
              endpoint,
              operations.assignment.addMap(
                caller.guild,
                eventId,
                heroId,
                payload(request),
              ),
            );
          }
          case "EventsAssignmentControllerDeleteMap": {
            const heroId = yield* requireStringParameter(request, "heroId");
            const mapId = yield* requireStringParameter(request, "mapId");
            return yield* effectOperation(
              endpoint,
              operations.assignment.deleteMap(
                caller.guild,
                eventId,
                heroId,
                mapId,
              ),
            );
          }
          case "EventsAssignmentControllerGetLocations": {
            const heroId = yield* requireStringParameter(request, "heroId");
            return yield* effectOperation(
              endpoint,
              operations.assignment.getLocations(
                caller.guild,
                eventId,
                heroId,
                [...caller.roles],
                caller.accessPolicy,
              ),
            );
          }
          case "EventsAssignmentControllerCreateLocation": {
            const heroId = yield* requireStringParameter(request, "heroId");
            return yield* effectOperation(
              endpoint,
              operations.assignment.createLocation(
                caller.guild,
                eventId,
                heroId,
                payload(request),
              ),
            );
          }
          case "EventsAssignmentControllerDeleteLocation": {
            const heroId = yield* requireStringParameter(request, "heroId");
            const locationId = yield* requireStringParameter(
              request,
              "locationId",
            );
            return yield* effectOperation(
              endpoint,
              operations.assignment.deleteLocation(
                caller.guild,
                eventId,
                heroId,
                locationId,
              ),
            );
          }
          case "EventsAssignmentControllerUpdateLocation": {
            const heroId = yield* requireStringParameter(request, "heroId");
            const locationId = yield* requireStringParameter(
              request,
              "locationId",
            );
            return yield* effectOperation(
              endpoint,
              operations.assignment.updateLocation(
                caller.guild,
                eventId,
                heroId,
                locationId,
                payload(request),
              ),
            );
          }
          case "EventsAssignmentControllerReorderLocations": {
            const heroId = yield* requireStringParameter(request, "heroId");
            return yield* effectOperation(
              endpoint,
              operations.assignment.reorderLocations(
                caller.guild,
                eventId,
                heroId,
                payload(request),
              ),
            );
          }
          case "EventsAssignmentControllerAssignMapToLocation": {
            const heroId = yield* requireStringParameter(request, "heroId");
            const mapId = yield* requireStringParameter(request, "mapId");
            return yield* effectOperation(
              endpoint,
              operations.assignment.assignMapToLocation(
                caller.guild,
                eventId,
                heroId,
                mapId,
                payload(request),
              ),
            );
          }
          case "listPendingParticipationConfirmations":
            return yield* effectOperation(
              endpoint,
              operations.ranking.getPendingParticipationConfirmations(
                caller.guild,
                eventId,
                caller.member,
              ),
            ).pipe(
              Effect.map((value) =>
                encodeUnknownResponse(
                  PendingParticipationConfirmationsResponse,
                  value,
                ),
              ),
            );
          case "acknowledgeExpiredParticipationConfirmations":
            return yield* effectOperation(
              endpoint,
              operations.ranking.acknowledgeExpiredParticipationConfirmations(
                caller.guild,
                eventId,
                caller.member,
                payload(request),
              ),
            );
          case "confirmParticipationForKill": {
            const killId = yield* requireStringParameter(request, "killId");
            return yield* effectOperation(
              endpoint,
              operations.ranking.confirmParticipationForKill(
                caller.guild,
                eventId,
                killId,
                caller.member,
              ),
            );
          }
          case "listEventRanking":
            return yield* effectOperation(
              endpoint,
              operations.ranking.getRanking(
                caller.guild,
                eventId,
                [...caller.roles],
                caller.accessPolicy,
              ),
            ).pipe(
              Effect.map((ranking) =>
                encodeUnknownResponse(EventRankingResponse, ranking),
              ),
            );
          case "updateRankingPoints": {
            const rankingId = yield* requireStringParameter(
              request,
              "rankingId",
            );
            return yield* effectOperation(
              endpoint,
              operations.ranking.updateRankingPoints(
                caller.guild,
                eventId,
                rankingId,
                payload(request),
                caller.userId,
              ),
            );
          }
          case "listEventHeroTimers":
            return yield* effectOperation(
              endpoint,
              operations.ranking.getEventHeroTimers(
                caller.guild,
                eventId,
                optionalString(request.query, "world") ?? "",
                [...caller.roles],
                caller.accessPolicy,
              ),
            ).pipe(
              Effect.map((timers) =>
                encodeUnknownResponse(EventTimersResponse, timers),
              ),
            );
          case "EventsRankingControllerGetEventHeroStats":
            return yield* effectOperation(
              endpoint,
              operations.ranking.getEventHeroStats(
                caller.guild,
                eventId,
                [...caller.roles],
                caller.accessPolicy,
              ),
            ).pipe(
              Effect.map((stats) =>
                stats.map((stat) =>
                  encodeUnknownResponse(EventHeroStatsResponse, stat),
                ),
              ),
            );
          case "EventsRankingControllerGetEventKillHistory":
            return yield* effectOperation(
              endpoint,
              operations.ranking.getEventKillHistory(
                caller.guild,
                eventId,
                caller.accessPolicy,
                optionalString(request.query, "limit"),
                optionalString(request.query, "cursor"),
                optionalString(request.query, "heroId"),
                [...caller.roles],
              ),
            ).pipe(
              Effect.map((history) =>
                encodeUnknownResponse(EventKillHistoryResponse, history),
              ),
            );
          case "EventsRankingControllerGetMemberKillHistory": {
            const memberId = yield* requireStringParameter(request, "memberId");
            return yield* effectOperation(
              endpoint,
              operations.ranking.getMemberKillHistory(
                caller.guild,
                eventId,
                memberId,
                caller.accessPolicy,
                optionalString(request.query, "limit"),
                optionalString(request.query, "cursor"),
                optionalString(request.query, "heroId"),
                [...caller.roles],
              ),
            ).pipe(
              Effect.map((history) =>
                encodeUnknownResponse(EventMemberKillHistoryResponse, history),
              ),
            );
          }
          case "EventsRankingControllerGetHeroKillHistory": {
            const heroId = yield* requireStringParameter(request, "heroId");
            return yield* effectOperation(
              endpoint,
              operations.ranking.getHeroKillHistory(
                caller.guild,
                eventId,
                heroId,
                caller.accessPolicy,
                optionalString(request.query, "limit"),
                optionalString(request.query, "cursor"),
                [...caller.roles],
              ),
            ).pipe(
              Effect.map((history) =>
                encodeUnknownResponse(EventKillHistoryResponse, history),
              ),
            );
          }
          case "EventsRankingControllerGetKillDetail": {
            const heroId = yield* requireStringParameter(request, "heroId");
            const killId = yield* requireStringParameter(request, "killId");
            return yield* effectOperation(
              endpoint,
              operations.ranking.getKillDetail(
                caller.guild,
                eventId,
                heroId,
                killId,
                [...caller.roles],
                caller.accessPolicy,
              ),
            ).pipe(
              Effect.map((detail) =>
                encodeUnknownResponse(KillDetailResponse, detail),
              ),
            );
          }
          case "EventsRankingControllerUpdateKillPoint": {
            const killId = yield* requireStringParameter(request, "killId");
            const killPointId = yield* requireStringParameter(
              request,
              "killPointId",
            );
            return yield* effectOperation(
              endpoint,
              operations.ranking.updateKillPoint(
                caller.guild,
                eventId,
                killId,
                killPointId,
                payload(request),
                caller.userId,
              ),
            );
          }
          case "EventsMonitoringControllerGetCoordination":
            return yield* effectOperation(
              endpoint,
              operations.monitoring.getCoordination(caller.guild, eventId),
            ).pipe(
              Effect.map((coordination) =>
                encodeUnknownResponse(EventCoordinationResponse, coordination),
              ),
            );
          case "EventsMonitoringControllerGetKillTimelineData": {
            const heroId = yield* requireStringParameter(request, "heroId");
            const killId = yield* requireStringParameter(request, "killId");
            return yield* effectOperation(
              endpoint,
              operations.monitoring.getKillTimelineData(
                caller.guild,
                eventId,
                heroId,
                killId,
                [...caller.roles],
                caller.accessPolicy,
              ),
            ).pipe(
              Effect.map((maps) =>
                maps.map((map) =>
                  encodeUnknownResponse(KillTimelineMapResponse, map),
                ),
              ),
            );
          }
          case "EventsMonitoringControllerGetHeroCoverageGaps": {
            const heroId = yield* requireStringParameter(request, "heroId");
            return yield* effectOperation(
              endpoint,
              operations.monitoring.getHeroCoverageGaps(
                caller.guild,
                eventId,
                heroId,
                [...caller.roles],
                caller.accessPolicy,
              ),
            ).pipe(
              Effect.map((gaps) =>
                gaps.map((gap) =>
                  encodeUnknownResponse(HeroCoverageGapResponse, gap),
                ),
              ),
            );
          }
          case "EventsMonitoringControllerGetMapCoverageGaps": {
            const mapId = yield* requireStringParameter(request, "mapId");
            return yield* effectOperation(
              endpoint,
              operations.monitoring.getMapCoverageGaps(
                caller.guild,
                eventId,
                mapId,
              ),
            ).pipe(
              Effect.map((gaps) =>
                gaps.map((gap) =>
                  encodeUnknownResponse(CoverageGapResponse, gap),
                ),
              ),
            );
          }
          case "EventsMonitoringControllerGetActiveGapForMap": {
            const mapId = yield* requireStringParameter(request, "mapId");
            return yield* effectOperation(
              endpoint,
              operations.monitoring.getActiveGapForMap(
                caller.guild,
                eventId,
                mapId,
              ),
            ).pipe(
              Effect.map((gap) =>
                encodeUnknownResponse(NullableCoverageGapResponse, gap),
              ),
            );
          }
          case "EventsMonitoringControllerGetActiveGapsForHero": {
            const heroId = yield* requireStringParameter(request, "heroId");
            return yield* effectOperation(
              endpoint,
              operations.monitoring.getActiveGapsForHero(
                caller.guild,
                eventId,
                heroId,
                [...caller.roles],
                caller.accessPolicy,
              ),
            ).pipe(
              Effect.map((gaps) =>
                gaps.map((gap) =>
                  encodeUnknownResponse(CoverageGapResponse, gap),
                ),
              ),
            );
          }
          case "EventsMonitoringControllerGetHeroPresenceStats": {
            const heroId = yield* requireStringParameter(request, "heroId");
            return yield* effectOperation(
              endpoint,
              operations.monitoring.getHeroPresenceStats(
                caller.guild,
                eventId,
                heroId,
                [...caller.roles],
                caller.accessPolicy,
              ),
            ).pipe(
              Effect.map((stats) =>
                encodeUnknownResponse(HeroPresenceStatsResponse, stats),
              ),
            );
          }
          case "EventsMonitoringControllerGetHeroRespawnConfig": {
            const heroId = yield* requireStringParameter(request, "heroId");
            return yield* effectOperation(
              endpoint,
              operations.monitoring.getHeroRespawnConfig(
                caller.guild,
                eventId,
                heroId,
                [...caller.roles],
                caller.accessPolicy,
              ),
            ).pipe(
              Effect.map((config) =>
                encodeUnknownResponse(HeroRespawnConfigResponse, config),
              ),
            );
          }
          case "EventsMonitoringControllerCloseRespawnWindow": {
            const heroId = yield* requireStringParameter(request, "heroId");
            return yield* effectOperation(
              endpoint,
              operations.monitoring.closeRespawnWindow(
                caller.guild,
                eventId,
                heroId,
                payload(request),
              ),
            );
          }
          case "EventsMonitoringControllerOpenRespawnWindow": {
            const heroId = yield* requireStringParameter(request, "heroId");
            return yield* effectOperation(
              endpoint,
              operations.monitoring.openRespawnWindow(
                caller.guild,
                eventId,
                heroId,
                payload(request),
              ),
            );
          }
          case "listPinnedEvents":
            return yield* effectOperation(
              endpoint,
              operations.pins.listPinnedEvents(caller.userId, caller.guild),
            ).pipe(
              Effect.map((events) =>
                events.map((event) =>
                  encodeUnknownResponse(PinnedEventResponse, event),
                ),
              ),
            );
          case "pinEvent":
            return yield* effectOperation(
              endpoint,
              operations.pins.pinEvent(caller.userId, caller.guild, eventId),
            ).pipe(
              Effect.map((event) =>
                encodeUnknownResponse(PinnedEventResponse, event),
              ),
            );
          case "unpinEvent":
            return yield* effectOperation(
              endpoint,
              operations.pins.unpinEvent(caller.userId, caller.guild, eventId),
            );
        }
      }),
  });
