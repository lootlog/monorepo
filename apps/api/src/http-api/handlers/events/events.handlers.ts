import type { AccessPolicy } from "@lootlog/domain/access-policy";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import { Context, Effect, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder, OpenApi } from "effect/unstable/httpapi";
import type {
  guildTable,
  memberTable,
  roleTable,
} from "#src/database/drizzle/schema";
import {
  EventMutationResponse,
  EventOverviewResponse,
  EventRankingResponse,
  EventsListResponse,
  EventTimersResponse,
  PendingParticipationConfirmationsResponse,
} from "#src/events/catalog/event-response.schema";
import { EventCoordinationResponse } from "#src/events/coordination/event-coordination-response.schema";
import {
  EventHeroStatsResponse,
  EventKillHistoryResponse,
  EventMemberKillHistoryResponse,
  KillDetailResponse,
} from "#src/events/kills/event-kill-response.schema";
import {
  CoverageGapResponse,
  HeroCoverageGapResponse,
  HeroPresenceStatsResponse,
  HeroRespawnConfigResponse,
  KillTimelineMapResponse,
  NullableCoverageGapResponse,
} from "#src/events/monitoring/event-monitoring-response.schema";
import { PinnedEventResponse } from "#src/events/pins/pinned-event-response.schema";
import { applicationErrorStatusOrUndefined } from "#src/shared/http/http-errors";
import { encodeUnknownResponse } from "#src/shared/schema/encode-response";
import { LootlogApi } from "../../lootlog-api.js";
import { EventOperations } from "./events.data-layer.js";

type Guild = typeof guildTable.$inferSelect;
type Member = typeof memberTable.$inferSelect;
type Role = typeof roleTable.$inferSelect;
type EventEndpointIdentifier = keyof typeof LootlogApi.groups.events.endpoints;

export interface AuthorizedEventCaller {
  readonly discordId: string;
  readonly userId: string;
  readonly guild: Guild;
  readonly member: Member;
  readonly accessPolicy: AccessPolicy;
  readonly roles: ReadonlyArray<Role>;
}

export class EventsAccessDenied extends TaggedErrorClass<EventsAccessDenied>()(
  "EventsAccessDenied",
  { status: Schema.Literals([401, 403]), code: Schema.String },
) {}

export class EventsNotFound extends TaggedErrorClass<EventsNotFound>()(
  "EventsNotFound",
  { status: Schema.Literal(404), code: Schema.String },
) {}

class EventsBadRequest extends TaggedErrorClass<EventsBadRequest>()(
  "EventsBadRequest",
  { status: Schema.Literal(400), code: Schema.String },
) {}

class EventsConflict extends TaggedErrorClass<EventsConflict>()(
  "EventsConflict",
  { status: Schema.Literal(409), code: Schema.String },
) {}

class EventsDataError extends TaggedErrorClass<EventsDataError>()(
  "EventsDataError",
  { cause: Schema.Defect() },
) {}

type EventsHttpFailure =
  | EventsAccessDenied
  | EventsBadRequest
  | EventsConflict
  | EventsDataError
  | EventsNotFound;

export interface EventAuthorizationRequirement {
  readonly guildId: string;
  readonly capabilities: ReadonlyArray<PermissionValue>;
  readonly mode: "all" | "any";
}

export class EventsAuthorization extends Context.Service<
  EventsAuthorization,
  {
    readonly requireGuild: (
      requirement: EventAuthorizationRequirement,
    ) => Effect.Effect<
      AuthorizedEventCaller,
      EventsAccessDenied | EventsNotFound
    >;
  }
>()("@lootlog/api/http-api/events/authorization") {}

const read = {
  capabilities: [Permission.LOOTLOG_EVENTS_READ],
  mode: "all",
} as const;
const write = {
  capabilities: [Permission.LOOTLOG_EVENTS_WRITE],
  mode: "all",
} as const;
const manage = {
  capabilities: [Permission.LOOTLOG_EVENTS_MANAGE],
  mode: "all",
} as const;
const owner = {
  capabilities: [Permission.OWNER, Permission.ADMIN],
  mode: "any",
} as const;
const timers = {
  capabilities: [Permission.LOOTLOG_TIMERS_READ],
  mode: "all",
} as const;

const operationIds = Object.fromEntries(
  Object.entries(LootlogApi.groups.events.endpoints).map(
    ([identifier, endpoint]) => [
      identifier,
      Context.getOrUndefined(endpoint.annotations, OpenApi.Identifier) ??
        identifier,
    ],
  ),
) as Record<EventEndpointIdentifier, string>;

const operationFailure = (cause: unknown): EventsHttpFailure => {
  if (
    cause instanceof EventsAccessDenied ||
    cause instanceof EventsBadRequest ||
    cause instanceof EventsConflict ||
    cause instanceof EventsDataError ||
    cause instanceof EventsNotFound
  ) {
    return cause;
  }
  const status = applicationErrorStatusOrUndefined(cause);
  if (status === 400)
    return new EventsBadRequest({ status, code: "BAD_REQUEST" });
  if (status === 403)
    return new EventsAccessDenied({ status, code: "FORBIDDEN" });
  if (status === 404) return new EventsNotFound({ status, code: "NOT_FOUND" });
  if (status === 409) return new EventsConflict({ status, code: "CONFLICT" });
  return new EventsDataError({ cause });
};

const operation = <A>(
  endpoint: EventEndpointIdentifier,
  effect: Effect.Effect<A, unknown>,
) =>
  effect.pipe(
    Effect.mapError(operationFailure),
    Effect.withSpan(operationIds[endpoint], {
      attributes: { adapter: "events", retryCount: 0 },
    }),
  );

const stringParameter = (value: unknown, key: string) =>
  typeof value === "string" && value.length > 0
    ? Effect.succeed(value)
    : Effect.fail(
        new EventsBadRequest({
          status: 400,
          code: `INVALID_${key.toUpperCase()}`,
        }),
      );

const optionalString = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const statusResponse = (error: { readonly status: number }) =>
  Effect.succeed(HttpServerResponse.empty({ status: error.status }));

const toHttpResponse = <A, R>(effect: Effect.Effect<A, EventsHttpFailure, R>) =>
  Effect.catchTags(effect, {
    EventsAccessDenied: statusResponse,
    EventsBadRequest: statusResponse,
    EventsConflict: statusResponse,
    EventsDataError: (error) => Effect.die(error.cause),
    EventsNotFound: statusResponse,
  });

export const EventsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "events",
  Effect.fn(function* (handlers) {
    const authorization = yield* EventsAuthorization;
    const operations = yield* EventOperations;

    const authorized = <A>(
      endpoint: EventEndpointIdentifier,
      requirement: Omit<EventAuthorizationRequirement, "guildId">,
      guildId: unknown,
      run: (caller: AuthorizedEventCaller) => Effect.Effect<A, unknown>,
    ) => {
      const caller =
        typeof guildId === "string"
          ? authorization.requireGuild({ guildId, ...requirement })
          : Effect.fail(
              new EventsAccessDenied({
                status: 403,
                code: "ORGANIZATION_SCOPE_REQUIRED",
              }),
            );
      return toHttpResponse(
        Effect.flatMap(caller, (value) => operation(endpoint, run(value))),
      ) as Effect.Effect<never, never>;
    };

    const event = <A>(
      endpoint: EventEndpointIdentifier,
      requirement: Omit<EventAuthorizationRequirement, "guildId">,
      params: { readonly guildId: unknown; readonly eventId: unknown },
      run: (
        caller: AuthorizedEventCaller,
        eventId: string,
      ) => Effect.Effect<A, unknown>,
    ) =>
      authorized(endpoint, requirement, params.guildId, (caller) =>
        Effect.flatMap(stringParameter(params.eventId, "eventId"), (eventId) =>
          run(caller, eventId),
        ),
      );

    return handlers.handleAll({
      listEvents: ({ params, query }) =>
        authorized("listEvents", read, params.guildId, (caller) =>
          operations.catalog
            .getEvents(
              caller.guild,
              caller.accessPolicy,
              optionalString(query.world),
              optionalString(query.activeOnly),
              [...caller.roles],
            )
            .pipe(
              Effect.map((value) =>
                encodeUnknownResponse(EventsListResponse, value),
              ),
            ),
        ),
      createEvent: ({ params, payload }) =>
        authorized("createEvent", manage, params.guildId, (caller) =>
          operations.catalog
            .createEvent(payload, caller.guild)
            .pipe(
              Effect.map((value) =>
                encodeUnknownResponse(EventMutationResponse, value),
              ),
            ),
        ),
      showEvent: ({ params }) =>
        event("showEvent", read, params, (caller, eventId) =>
          operations.catalog
            .getEvent(
              caller.guild,
              eventId,
              [...caller.roles],
              caller.accessPolicy,
            )
            .pipe(
              Effect.map((value) =>
                encodeUnknownResponse(EventOverviewResponse, value),
              ),
            ),
        ),
      deleteEvent: ({ params }) =>
        event("deleteEvent", owner, params, (caller, eventId) =>
          operations.catalog.deleteEvent(caller.guild, eventId),
        ),
      updateEvent: ({ params, payload }) =>
        event("updateEvent", manage, params, (caller, eventId) =>
          operations.catalog
            .updateEvent(caller.guild, eventId, payload)
            .pipe(
              Effect.map((value) =>
                encodeUnknownResponse(EventMutationResponse, value),
              ),
            ),
        ),
      showEventOverview: ({ params }) =>
        event("showEventOverview", read, params, (caller, eventId) =>
          operations.catalog
            .getEventOverview(
              caller.guild,
              eventId,
              [...caller.roles],
              caller.accessPolicy,
            )
            .pipe(
              Effect.map((value) =>
                encodeUnknownResponse(EventOverviewResponse, value),
              ),
            ),
        ),
      showEventWrapped: ({ params }) =>
        event("showEventWrapped", read, params, (caller, eventId) =>
          operations.catalog.getWrapped(
            caller.guild,
            eventId,
            [...caller.roles],
            caller.accessPolicy,
          ),
        ),
      listEventMaps: ({ params }) =>
        event("listEventMaps", read, params, (caller, eventId) =>
          operations.catalog.getEventMaps(
            caller.guild,
            eventId,
            [...caller.roles],
            caller.accessPolicy,
          ),
        ),
      recalculateEventPoints: ({ params }) =>
        event("recalculateEventPoints", manage, params, (caller, eventId) =>
          operations.catalog.recalculatePoints(caller.guild, eventId),
        ),
      EventsAssignmentControllerAssignMember: ({ params, payload }) =>
        event(
          "EventsAssignmentControllerAssignMember",
          manage,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.mapId, "mapId"), (mapId) =>
              operations.assignment.assignMember(
                caller.guild,
                eventId,
                mapId,
                payload,
              ),
            ),
        ),
      EventsAssignmentControllerUnassignMember: ({ params, query }) =>
        event(
          "EventsAssignmentControllerUnassignMember",
          manage,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.mapId, "mapId"), (mapId) =>
              operations.assignment.unassignMember(
                caller.guild,
                eventId,
                mapId,
                optionalString(query.memberId),
              ),
            ),
        ),
      EventsAssignmentControllerSelfAssignMember: ({ params }) =>
        event(
          "EventsAssignmentControllerSelfAssignMember",
          write,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.mapId, "mapId"), (mapId) =>
              operations.assignment.selfAssignMember(
                caller.guild,
                eventId,
                mapId,
                caller.member,
                [...caller.roles],
                caller.accessPolicy,
              ),
            ),
        ),
      EventsAssignmentControllerSelfUnassignMember: ({ params }) =>
        event(
          "EventsAssignmentControllerSelfUnassignMember",
          write,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.mapId, "mapId"), (mapId) =>
              operations.assignment.selfUnassignMember(
                caller.guild,
                eventId,
                mapId,
                caller.member,
                [...caller.roles],
                caller.accessPolicy,
              ),
            ),
        ),
      EventsAssignmentControllerAddHero: ({ params, payload }) =>
        event(
          "EventsAssignmentControllerAddHero",
          manage,
          params,
          (caller, eventId) =>
            operations.assignment.addHero(caller.guild, eventId, payload),
        ),
      EventsAssignmentControllerDeleteHero: ({ params }) =>
        event(
          "EventsAssignmentControllerDeleteHero",
          manage,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
              operations.assignment.deleteHero(caller.guild, eventId, heroId),
            ),
        ),
      EventsAssignmentControllerUpdateHero: ({ params, payload }) =>
        event(
          "EventsAssignmentControllerUpdateHero",
          manage,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
              operations.assignment.updateHero(
                caller.guild,
                eventId,
                heroId,
                payload,
              ),
            ),
        ),
      EventsAssignmentControllerAddMap: ({ params, payload }) =>
        event(
          "EventsAssignmentControllerAddMap",
          manage,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
              operations.assignment.addMap(
                caller.guild,
                eventId,
                heroId,
                payload,
              ),
            ),
        ),
      EventsAssignmentControllerDeleteMap: ({ params }) =>
        event(
          "EventsAssignmentControllerDeleteMap",
          manage,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
              Effect.flatMap(stringParameter(params.mapId, "mapId"), (mapId) =>
                operations.assignment.deleteMap(
                  caller.guild,
                  eventId,
                  heroId,
                  mapId,
                ),
              ),
            ),
        ),
      EventsAssignmentControllerGetLocations: ({ params }) =>
        event(
          "EventsAssignmentControllerGetLocations",
          read,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
              operations.assignment.getLocations(
                caller.guild,
                eventId,
                heroId,
                [...caller.roles],
                caller.accessPolicy,
              ),
            ),
        ),
      EventsAssignmentControllerCreateLocation: ({ params, payload }) =>
        event(
          "EventsAssignmentControllerCreateLocation",
          manage,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
              operations.assignment.createLocation(
                caller.guild,
                eventId,
                heroId,
                payload,
              ),
            ),
        ),
      EventsAssignmentControllerDeleteLocation: ({ params }) =>
        event(
          "EventsAssignmentControllerDeleteLocation",
          manage,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
              Effect.flatMap(
                stringParameter(params.locationId, "locationId"),
                (locationId) =>
                  operations.assignment.deleteLocation(
                    caller.guild,
                    eventId,
                    heroId,
                    locationId,
                  ),
              ),
            ),
        ),
      EventsAssignmentControllerUpdateLocation: ({ params, payload }) =>
        event(
          "EventsAssignmentControllerUpdateLocation",
          manage,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
              Effect.flatMap(
                stringParameter(params.locationId, "locationId"),
                (locationId) =>
                  operations.assignment.updateLocation(
                    caller.guild,
                    eventId,
                    heroId,
                    locationId,
                    payload,
                  ),
              ),
            ),
        ),
      EventsAssignmentControllerReorderLocations: ({ params, payload }) =>
        event(
          "EventsAssignmentControllerReorderLocations",
          manage,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
              operations.assignment.reorderLocations(
                caller.guild,
                eventId,
                heroId,
                payload,
              ),
            ),
        ),
      EventsAssignmentControllerAssignMapToLocation: ({ params, payload }) =>
        event(
          "EventsAssignmentControllerAssignMapToLocation",
          manage,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
              Effect.flatMap(stringParameter(params.mapId, "mapId"), (mapId) =>
                operations.assignment.assignMapToLocation(
                  caller.guild,
                  eventId,
                  heroId,
                  mapId,
                  payload,
                ),
              ),
            ),
        ),
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
        event("updateRankingPoints", owner, params, (caller, eventId) =>
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
          ),
        ),
      listEventHeroTimers: ({ params, query }) =>
        event("listEventHeroTimers", timers, params, (caller, eventId) =>
          operations.ranking
            .getEventHeroTimers(
              caller.guild,
              eventId,
              optionalString(query.world) ?? "",
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
      EventsRankingControllerGetEventKillHistory: ({ params, query }) =>
        event(
          "EventsRankingControllerGetEventKillHistory",
          read,
          params,
          (caller, eventId) =>
            operations.ranking
              .getEventKillHistory(
                caller.guild,
                eventId,
                caller.accessPolicy,
                optionalString(query.limit),
                optionalString(query.cursor),
                optionalString(query.heroId),
                [...caller.roles],
              )
              .pipe(
                Effect.map((value) =>
                  encodeUnknownResponse(EventKillHistoryResponse, value),
                ),
              ),
        ),
      EventsRankingControllerGetMemberKillHistory: ({ params, query }) =>
        event(
          "EventsRankingControllerGetMemberKillHistory",
          read,
          params,
          (caller, eventId) =>
            Effect.flatMap(
              stringParameter(params.memberId, "memberId"),
              (memberId) =>
                operations.ranking
                  .getMemberKillHistory(
                    caller.guild,
                    eventId,
                    memberId,
                    caller.accessPolicy,
                    optionalString(query.limit),
                    optionalString(query.cursor),
                    optionalString(query.heroId),
                    [...caller.roles],
                  )
                  .pipe(
                    Effect.map((value) =>
                      encodeUnknownResponse(
                        EventMemberKillHistoryResponse,
                        value,
                      ),
                    ),
                  ),
            ),
        ),
      EventsRankingControllerGetHeroKillHistory: ({ params, query }) =>
        event(
          "EventsRankingControllerGetHeroKillHistory",
          read,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
              operations.ranking
                .getHeroKillHistory(
                  caller.guild,
                  eventId,
                  heroId,
                  caller.accessPolicy,
                  optionalString(query.limit),
                  optionalString(query.cursor),
                  [...caller.roles],
                )
                .pipe(
                  Effect.map((value) =>
                    encodeUnknownResponse(EventKillHistoryResponse, value),
                  ),
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
              Effect.flatMap(
                stringParameter(params.killId, "killId"),
                (killId) =>
                  operations.ranking
                    .getKillDetail(
                      caller.guild,
                      eventId,
                      heroId,
                      killId,
                      [...caller.roles],
                      caller.accessPolicy,
                    )
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
          owner,
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
            ),
        ),
      EventsMonitoringControllerGetCoordination: ({ params }) =>
        event(
          "EventsMonitoringControllerGetCoordination",
          read,
          params,
          (caller, eventId) =>
            operations.monitoring
              .getCoordination(caller.guild, eventId)
              .pipe(
                Effect.map((value) =>
                  encodeUnknownResponse(EventCoordinationResponse, value),
                ),
              ),
        ),
      EventsMonitoringControllerGetKillTimelineData: ({ params }) =>
        event(
          "EventsMonitoringControllerGetKillTimelineData",
          read,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
              Effect.flatMap(
                stringParameter(params.killId, "killId"),
                (killId) =>
                  operations.monitoring
                    .getKillTimelineData(
                      caller.guild,
                      eventId,
                      heroId,
                      killId,
                      [...caller.roles],
                      caller.accessPolicy,
                    )
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
      EventsMonitoringControllerGetHeroCoverageGaps: ({ params }) =>
        event(
          "EventsMonitoringControllerGetHeroCoverageGaps",
          read,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
              operations.monitoring
                .getHeroCoverageGaps(
                  caller.guild,
                  eventId,
                  heroId,
                  [...caller.roles],
                  caller.accessPolicy,
                )
                .pipe(
                  Effect.map((values) =>
                    values.map((value) =>
                      encodeUnknownResponse(HeroCoverageGapResponse, value),
                    ),
                  ),
                ),
            ),
        ),
      EventsMonitoringControllerGetMapCoverageGaps: ({ params }) =>
        event(
          "EventsMonitoringControllerGetMapCoverageGaps",
          read,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.mapId, "mapId"), (mapId) =>
              operations.monitoring
                .getMapCoverageGaps(caller.guild, eventId, mapId)
                .pipe(
                  Effect.map((values) =>
                    values.map((value) =>
                      encodeUnknownResponse(CoverageGapResponse, value),
                    ),
                  ),
                ),
            ),
        ),
      EventsMonitoringControllerGetActiveGapForMap: ({ params }) =>
        event(
          "EventsMonitoringControllerGetActiveGapForMap",
          read,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.mapId, "mapId"), (mapId) =>
              operations.monitoring
                .getActiveGapForMap(caller.guild, eventId, mapId)
                .pipe(
                  Effect.map((value) =>
                    encodeUnknownResponse(NullableCoverageGapResponse, value),
                  ),
                ),
            ),
        ),
      EventsMonitoringControllerGetActiveGapsForHero: ({ params }) =>
        event(
          "EventsMonitoringControllerGetActiveGapsForHero",
          read,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
              operations.monitoring
                .getActiveGapsForHero(
                  caller.guild,
                  eventId,
                  heroId,
                  [...caller.roles],
                  caller.accessPolicy,
                )
                .pipe(
                  Effect.map((values) =>
                    values.map((value) =>
                      encodeUnknownResponse(CoverageGapResponse, value),
                    ),
                  ),
                ),
            ),
        ),
      EventsMonitoringControllerGetHeroPresenceStats: ({ params }) =>
        event(
          "EventsMonitoringControllerGetHeroPresenceStats",
          read,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
              operations.monitoring
                .getHeroPresenceStats(
                  caller.guild,
                  eventId,
                  heroId,
                  [...caller.roles],
                  caller.accessPolicy,
                )
                .pipe(
                  Effect.map((value) =>
                    encodeUnknownResponse(HeroPresenceStatsResponse, value),
                  ),
                ),
            ),
        ),
      EventsMonitoringControllerGetHeroRespawnConfig: ({ params }) =>
        event(
          "EventsMonitoringControllerGetHeroRespawnConfig",
          read,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
              operations.monitoring
                .getHeroRespawnConfig(
                  caller.guild,
                  eventId,
                  heroId,
                  [...caller.roles],
                  caller.accessPolicy,
                )
                .pipe(
                  Effect.map((value) =>
                    encodeUnknownResponse(HeroRespawnConfigResponse, value),
                  ),
                ),
            ),
        ),
      EventsMonitoringControllerCloseRespawnWindow: ({ params, payload }) =>
        event(
          "EventsMonitoringControllerCloseRespawnWindow",
          manage,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
              operations.monitoring.closeRespawnWindow(
                caller.guild,
                eventId,
                heroId,
                payload,
              ),
            ),
        ),
      EventsMonitoringControllerOpenRespawnWindow: ({ params, payload }) =>
        event(
          "EventsMonitoringControllerOpenRespawnWindow",
          manage,
          params,
          (caller, eventId) =>
            Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
              operations.monitoring.openRespawnWindow(
                caller.guild,
                eventId,
                heroId,
                payload,
              ),
            ),
        ),
      listPinnedEvents: ({ params }) =>
        authorized("listPinnedEvents", read, params.guildId, (caller) =>
          operations.pins
            .listPinnedEvents(caller.userId, caller.guild)
            .pipe(
              Effect.map((values) =>
                values.map((value) =>
                  encodeUnknownResponse(PinnedEventResponse, value),
                ),
              ),
            ),
        ),
      pinEvent: ({ params }) =>
        event("pinEvent", read, params, (caller, eventId) =>
          operations.pins
            .pinEvent(caller.userId, caller.guild, eventId)
            .pipe(
              Effect.map((value) =>
                encodeUnknownResponse(PinnedEventResponse, value),
              ),
            ),
        ),
      unpinEvent: ({ params }) =>
        event("unpinEvent", read, params, (caller, eventId) =>
          operations.pins.unpinEvent(caller.userId, caller.guild, eventId),
        ),
    });
  }),
);
