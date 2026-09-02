import type { AccessPolicy } from "@lootlog/domain/access-policy";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import { Context, Effect, Layer, Schema } from "effect";
import { HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import type {
  guildTable,
  memberTable,
  roleTable,
} from "#src/database/drizzle/schema";
import { LootlogApi } from "../../lootlog-api.generated.js";

type Guild = typeof guildTable.$inferSelect;
type Member = typeof memberTable.$inferSelect;
type Role = typeof roleTable.$inferSelect;

export const eventEndpointIdentifiers = [
  "listEvents",
  "createEvent",
  "showEvent",
  "deleteEvent",
  "updateEvent",
  "showEventOverview",
  "showEventWrapped",
  "listEventMaps",
  "recalculateEventPoints",
  "EventsAssignmentControllerAssignMember",
  "EventsAssignmentControllerUnassignMember",
  "EventsAssignmentControllerSelfAssignMember",
  "EventsAssignmentControllerSelfUnassignMember",
  "EventsAssignmentControllerAddHero",
  "EventsAssignmentControllerDeleteHero",
  "EventsAssignmentControllerUpdateHero",
  "EventsAssignmentControllerAddMap",
  "EventsAssignmentControllerDeleteMap",
  "EventsAssignmentControllerGetLocations",
  "EventsAssignmentControllerCreateLocation",
  "EventsAssignmentControllerDeleteLocation",
  "EventsAssignmentControllerUpdateLocation",
  "EventsAssignmentControllerReorderLocations",
  "EventsAssignmentControllerAssignMapToLocation",
  "listPendingParticipationConfirmations",
  "acknowledgeExpiredParticipationConfirmations",
  "confirmParticipationForKill",
  "listEventRanking",
  "updateRankingPoints",
  "listEventHeroTimers",
  "EventsRankingControllerGetEventHeroStats",
  "EventsRankingControllerGetEventKillHistory",
  "EventsRankingControllerGetMemberKillHistory",
  "EventsRankingControllerGetHeroKillHistory",
  "EventsRankingControllerGetKillDetail",
  "EventsRankingControllerUpdateKillPoint",
  "EventsMonitoringControllerGetCoordination",
  "EventsMonitoringControllerGetKillTimelineData",
  "EventsMonitoringControllerGetHeroCoverageGaps",
  "EventsMonitoringControllerGetMapCoverageGaps",
  "EventsMonitoringControllerGetActiveGapForMap",
  "EventsMonitoringControllerGetActiveGapsForHero",
  "EventsMonitoringControllerGetHeroPresenceStats",
  "EventsMonitoringControllerGetHeroRespawnConfig",
  "EventsMonitoringControllerCloseRespawnWindow",
  "EventsMonitoringControllerOpenRespawnWindow",
  "listPinnedEvents",
  "pinEvent",
  "unpinEvent",
] as const;

export type EventEndpointIdentifier = (typeof eventEndpointIdentifiers)[number];

export interface AuthorizedEventCaller {
  readonly discordId: string;
  readonly userId: string;
  readonly guild: Guild;
  readonly member: Member;
  readonly accessPolicy: AccessPolicy;
  readonly roles: ReadonlyArray<Role>;
}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class EventsAccessDenied extends Schema.TaggedError<EventsAccessDenied>()(
  "EventsAccessDenied",
  {
    status: Schema.Literals([401, 403]),
    code: Schema.String,
  },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class EventsNotFound extends Schema.TaggedError<EventsNotFound>()(
  "EventsNotFound",
  { status: Schema.Literal(404), code: Schema.String },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class EventsBadRequest extends Schema.TaggedError<EventsBadRequest>()(
  "EventsBadRequest",
  { status: Schema.Literal(400), code: Schema.String },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class EventsConflict extends Schema.TaggedError<EventsConflict>()(
  "EventsConflict",
  { status: Schema.Literal(409), code: Schema.String },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class EventsDataError extends Schema.TaggedError<EventsDataError>()(
  "EventsDataError",
  { cause: Schema.Defect() },
) {}

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
    ) => Effect.Effect<AuthorizedEventCaller, EventsAccessDenied>;
  }
>()("@lootlog/api/http-api/events/authorization") {}

export interface EventRequest {
  readonly params?: Readonly<Record<string, unknown>>;
  readonly query?: Readonly<Record<string, unknown>>;
  readonly payload?: unknown;
}

export class EventsData extends Context.Service<
  EventsData,
  {
    readonly execute: (
      endpoint: EventEndpointIdentifier,
      request: EventRequest,
      caller: AuthorizedEventCaller,
    ) => Effect.Effect<
      unknown,
      EventsBadRequest | EventsConflict | EventsDataError | EventsNotFound
    >;
  }
>()("@lootlog/api/http-api/events/data") {
  static layer(service: EventsData["Service"]) {
    return Layer.succeed(EventsData, EventsData.of(service));
  }

  static layerLegacy(
    execute: (
      endpoint: EventEndpointIdentifier,
      request: EventRequest,
      caller: AuthorizedEventCaller,
    ) => PromiseLike<unknown> | unknown,
  ) {
    return EventsData.layer({
      execute: (endpoint, request, caller) =>
        Effect.tryPromise({
          try: () => Promise.resolve(execute(endpoint, request, caller)),
          catch: (cause) => new EventsDataError({ cause }),
        }),
    });
  }
}

const readRequirement = {
  capabilities: [Permission.LOOTLOG_EVENTS_READ],
  mode: "all",
} as const;
const writeRequirement = {
  capabilities: [Permission.LOOTLOG_EVENTS_WRITE],
  mode: "all",
} as const;
const manageRequirement = {
  capabilities: [Permission.LOOTLOG_EVENTS_MANAGE],
  mode: "all",
} as const;
const ownerRequirement = {
  capabilities: [Permission.OWNER, Permission.ADMIN],
  mode: "any",
} as const;
const timersRequirement = {
  capabilities: [Permission.LOOTLOG_TIMERS_READ],
  mode: "all",
} as const;

const requirementFor = (
  endpoint: EventEndpointIdentifier,
): Omit<EventAuthorizationRequirement, "guildId"> => {
  if (
    endpoint === "deleteEvent" ||
    endpoint === "updateRankingPoints" ||
    endpoint === "EventsRankingControllerUpdateKillPoint"
  ) {
    return ownerRequirement;
  }
  if (endpoint === "listEventHeroTimers") return timersRequirement;
  if (
    endpoint === "EventsAssignmentControllerSelfAssignMember" ||
    endpoint === "EventsAssignmentControllerSelfUnassignMember" ||
    endpoint === "confirmParticipationForKill"
  ) {
    return writeRequirement;
  }
  if (
    endpoint === "createEvent" ||
    endpoint === "updateEvent" ||
    endpoint === "recalculateEventPoints" ||
    (endpoint.startsWith("EventsAssignmentController") &&
      endpoint !== "EventsAssignmentControllerGetLocations") ||
    endpoint === "EventsMonitoringControllerCloseRespawnWindow" ||
    endpoint === "EventsMonitoringControllerOpenRespawnWindow"
  ) {
    return manageRequirement;
  }
  return readRequirement;
};

const guildIdFrom = (request: EventRequest) => {
  const guildId = request.params?.guildId;
  return typeof guildId === "string"
    ? Effect.succeed(guildId)
    : Effect.fail(
        new EventsAccessDenied({
          status: 403,
          code: "ORGANIZATION_SCOPE_REQUIRED",
        }),
      );
};

export const executeEventEndpoint = Effect.fn("events.execute")(function* (
  endpoint: EventEndpointIdentifier,
  request: EventRequest,
) {
  const guildId = yield* guildIdFrom(request);
  const requirement = requirementFor(endpoint);
  const caller = yield* Effect.flatMap(EventsAuthorization, (authorization) =>
    authorization.requireGuild({ guildId, ...requirement }),
  );
  return yield* Effect.flatMap(EventsData, (events) =>
    events.execute(endpoint, request, caller),
  );
});

const toHttpResponse = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) => {
    if (
      error instanceof EventsAccessDenied ||
      error instanceof EventsBadRequest ||
      error instanceof EventsConflict ||
      error instanceof EventsNotFound
    ) {
      return Effect.succeed(HttpServerResponse.empty({ status: error.status }));
    }
    return Effect.die(error);
  });

// The generated group supplies the concrete success type at every call site.
// This boundary is validated by the generated schemas before a response is sent.
const handle = (endpoint: EventEndpointIdentifier, request: EventRequest) =>
  toHttpResponse(executeEventEndpoint(endpoint, request)) as Effect.Effect<
    never,
    never,
    EventsAuthorization | EventsData
  >;

export const EventsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "events",
  (handlers) =>
    handlers
      .handle("listEvents", ({ params, query }) =>
        handle("listEvents", { params, query }),
      )
      .handle("createEvent", ({ params, payload }) =>
        handle("createEvent", { params, payload }),
      )
      .handle("showEvent", ({ params }) => handle("showEvent", { params }))
      .handle("deleteEvent", ({ params }) => handle("deleteEvent", { params }))
      .handle("updateEvent", ({ params, payload }) =>
        handle("updateEvent", { params, payload }),
      )
      .handle("showEventOverview", ({ params }) =>
        handle("showEventOverview", { params }),
      )
      .handle("showEventWrapped", ({ params }) =>
        handle("showEventWrapped", { params }),
      )
      .handle("listEventMaps", ({ params }) =>
        handle("listEventMaps", { params }),
      )
      .handle("recalculateEventPoints", ({ params }) =>
        handle("recalculateEventPoints", { params }),
      )
      .handle("EventsAssignmentControllerAssignMember", ({ params, payload }) =>
        handle("EventsAssignmentControllerAssignMember", { params, payload }),
      )
      .handle("EventsAssignmentControllerUnassignMember", ({ params, query }) =>
        handle("EventsAssignmentControllerUnassignMember", { params, query }),
      )
      .handle("EventsAssignmentControllerSelfAssignMember", ({ params }) =>
        handle("EventsAssignmentControllerSelfAssignMember", { params }),
      )
      .handle("EventsAssignmentControllerSelfUnassignMember", ({ params }) =>
        handle("EventsAssignmentControllerSelfUnassignMember", { params }),
      )
      .handle("EventsAssignmentControllerAddHero", ({ params, payload }) =>
        handle("EventsAssignmentControllerAddHero", { params, payload }),
      )
      .handle("EventsAssignmentControllerDeleteHero", ({ params }) =>
        handle("EventsAssignmentControllerDeleteHero", { params }),
      )
      .handle("EventsAssignmentControllerUpdateHero", ({ params, payload }) =>
        handle("EventsAssignmentControllerUpdateHero", { params, payload }),
      )
      .handle("EventsAssignmentControllerAddMap", ({ params, payload }) =>
        handle("EventsAssignmentControllerAddMap", { params, payload }),
      )
      .handle("EventsAssignmentControllerDeleteMap", ({ params }) =>
        handle("EventsAssignmentControllerDeleteMap", { params }),
      )
      .handle("EventsAssignmentControllerGetLocations", ({ params }) =>
        handle("EventsAssignmentControllerGetLocations", { params }),
      )
      .handle(
        "EventsAssignmentControllerCreateLocation",
        ({ params, payload }) =>
          handle("EventsAssignmentControllerCreateLocation", {
            params,
            payload,
          }),
      )
      .handle("EventsAssignmentControllerDeleteLocation", ({ params }) =>
        handle("EventsAssignmentControllerDeleteLocation", { params }),
      )
      .handle(
        "EventsAssignmentControllerUpdateLocation",
        ({ params, payload }) =>
          handle("EventsAssignmentControllerUpdateLocation", {
            params,
            payload,
          }),
      )
      .handle(
        "EventsAssignmentControllerReorderLocations",
        ({ params, payload }) =>
          handle("EventsAssignmentControllerReorderLocations", {
            params,
            payload,
          }),
      )
      .handle(
        "EventsAssignmentControllerAssignMapToLocation",
        ({ params, payload }) =>
          handle("EventsAssignmentControllerAssignMapToLocation", {
            params,
            payload,
          }),
      )
      .handle("listPendingParticipationConfirmations", ({ params }) =>
        handle("listPendingParticipationConfirmations", { params }),
      )
      .handle(
        "acknowledgeExpiredParticipationConfirmations",
        ({ params, payload }) =>
          handle("acknowledgeExpiredParticipationConfirmations", {
            params,
            payload,
          }),
      )
      .handle("confirmParticipationForKill", ({ params }) =>
        handle("confirmParticipationForKill", { params }),
      )
      .handle("listEventRanking", ({ params }) =>
        handle("listEventRanking", { params }),
      )
      .handle("updateRankingPoints", ({ params, payload }) =>
        handle("updateRankingPoints", { params, payload }),
      )
      .handle("listEventHeroTimers", ({ params, query }) =>
        handle("listEventHeroTimers", { params, query }),
      )
      .handle("EventsRankingControllerGetEventHeroStats", ({ params }) =>
        handle("EventsRankingControllerGetEventHeroStats", { params }),
      )
      .handle(
        "EventsRankingControllerGetEventKillHistory",
        ({ params, query }) =>
          handle("EventsRankingControllerGetEventKillHistory", {
            params,
            query,
          }),
      )
      .handle(
        "EventsRankingControllerGetMemberKillHistory",
        ({ params, query }) =>
          handle("EventsRankingControllerGetMemberKillHistory", {
            params,
            query,
          }),
      )
      .handle(
        "EventsRankingControllerGetHeroKillHistory",
        ({ params, query }) =>
          handle("EventsRankingControllerGetHeroKillHistory", {
            params,
            query,
          }),
      )
      .handle("EventsRankingControllerGetKillDetail", ({ params }) =>
        handle("EventsRankingControllerGetKillDetail", { params }),
      )
      .handle("EventsRankingControllerUpdateKillPoint", ({ params, payload }) =>
        handle("EventsRankingControllerUpdateKillPoint", { params, payload }),
      )
      .handle("EventsMonitoringControllerGetCoordination", ({ params }) =>
        handle("EventsMonitoringControllerGetCoordination", { params }),
      )
      .handle("EventsMonitoringControllerGetKillTimelineData", ({ params }) =>
        handle("EventsMonitoringControllerGetKillTimelineData", { params }),
      )
      .handle("EventsMonitoringControllerGetHeroCoverageGaps", ({ params }) =>
        handle("EventsMonitoringControllerGetHeroCoverageGaps", { params }),
      )
      .handle("EventsMonitoringControllerGetMapCoverageGaps", ({ params }) =>
        handle("EventsMonitoringControllerGetMapCoverageGaps", { params }),
      )
      .handle("EventsMonitoringControllerGetActiveGapForMap", ({ params }) =>
        handle("EventsMonitoringControllerGetActiveGapForMap", { params }),
      )
      .handle("EventsMonitoringControllerGetActiveGapsForHero", ({ params }) =>
        handle("EventsMonitoringControllerGetActiveGapsForHero", { params }),
      )
      .handle("EventsMonitoringControllerGetHeroPresenceStats", ({ params }) =>
        handle("EventsMonitoringControllerGetHeroPresenceStats", { params }),
      )
      .handle("EventsMonitoringControllerGetHeroRespawnConfig", ({ params }) =>
        handle("EventsMonitoringControllerGetHeroRespawnConfig", { params }),
      )
      .handle(
        "EventsMonitoringControllerCloseRespawnWindow",
        ({ params, payload }) =>
          handle("EventsMonitoringControllerCloseRespawnWindow", {
            params,
            payload,
          }),
      )
      .handle(
        "EventsMonitoringControllerOpenRespawnWindow",
        ({ params, payload }) =>
          handle("EventsMonitoringControllerOpenRespawnWindow", {
            params,
            payload,
          }),
      )
      .handle("listPinnedEvents", ({ params }) =>
        handle("listPinnedEvents", { params }),
      )
      .handle("pinEvent", ({ params }) => handle("pinEvent", { params }))
      .handle("unpinEvent", ({ params }) => handle("unpinEvent", { params })),
);
