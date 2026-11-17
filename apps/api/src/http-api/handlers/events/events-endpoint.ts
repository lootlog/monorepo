import type { ReauthenticationRequired } from "#src/contracts/api-shared";
import { EventTimersError } from "#src/events/respawn/event-timers.port";
import {
  statusCodeResponse,
  reauthenticationRequiredResponse,
} from "#src/shared/http/handler-response";
import { ApplicationError } from "#src/shared/http/http-errors";
import { Effect, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import type { HttpApiEndpoint } from "effect/http-api";
import { applicationErrorResponse } from "../../application-error-response.js";
import { LootlogApi } from "../../lootlog-api.js";
import { operationIdentifiers } from "../../operation-identifiers.js";
import {
  EventsAccessDenied,
  EventsNotFound,
  type AuthorizedEventCaller,
  type EventAuthorizationRequirement,
  type EventsAuthorization,
} from "./events-authorization.js";

type EventEndpoints = typeof LootlogApi.groups.events.endpoints;

type EventEndpointIdentifier = keyof EventEndpoints;

export type EventEndpointHandlers = {
  readonly [Identifier in EventEndpointIdentifier]?: HttpApiEndpoint.Handler<
    EventEndpoints[Identifier],
    HttpApiEndpoint.MiddlewareError<EventEndpoints[Identifier]>,
    never
  >;
};

class EventsBadRequest extends TaggedErrorClass<EventsBadRequest>()(
  "EventsBadRequest",
  { status: Schema.Literal(400), code: Schema.String },
) {}

class EventsDataError extends TaggedErrorClass<EventsDataError>()(
  "EventsDataError",
  { cause: Schema.Defect() },
) {}

type EventsHttpFailure =
  | ApplicationError
  | EventsAccessDenied
  | EventsBadRequest
  | EventsDataError
  | EventsNotFound
  | ReauthenticationRequired;

const operationIds = operationIdentifiers(LootlogApi.groups.events.endpoints);

const operationFailure = (cause: unknown): EventsHttpFailure => {
  if (cause instanceof EventTimersError) return operationFailure(cause.cause);

  if (
    cause instanceof EventsAccessDenied ||
    cause instanceof EventsBadRequest ||
    cause instanceof EventsDataError ||
    cause instanceof EventsNotFound
  ) {
    return cause;
  }

  if (cause instanceof ApplicationError) return cause;

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

export const stringParameter = (value: unknown, key: string) =>
  typeof value === "string" && value.length > 0
    ? Effect.succeed(value)
    : Effect.fail(
        new EventsBadRequest({
          status: 400,
          code: `INVALID_${key.toUpperCase()}`,
        }),
      );

const toHttpResponse = <A, R>(effect: Effect.Effect<A, EventsHttpFailure, R>) =>
  Effect.catchTags(effect, {
    ApplicationError: applicationErrorResponse,
    EventsAccessDenied: statusCodeResponse,
    ReauthenticationRequired: reauthenticationRequiredResponse,
    EventsBadRequest: statusCodeResponse,
    EventsDataError: (error) => Effect.die(error.cause),
    EventsNotFound: statusCodeResponse,
  });

export const eventEndpointBuilders = (
  authorization: EventsAuthorization["Service"],
) => {
  const authorized = <A>(
    endpoint: EventEndpointIdentifier,
    requirement: Omit<EventAuthorizationRequirement, "guildId">,
    guildId: string | undefined,
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
    );
  };

  const event = <A>(
    endpoint: EventEndpointIdentifier,
    requirement: Omit<EventAuthorizationRequirement, "guildId">,
    params: {
      readonly guildId: string | undefined;
      readonly eventId: unknown;
    },
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

  return { authorized, event };
};

export type EventEndpointBuilders = ReturnType<typeof eventEndpointBuilders>;
