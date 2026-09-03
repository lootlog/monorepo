import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import { HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { encodeDomainJson } from "../../domain-json.schema.js";
import { LootlogApi } from "../../lootlog-api.js";
import {
  MessagingControllerSendNotification201,
  type CreateNotificationDto,
  type CreateVolunteerDto,
} from "../../contracts/messaging/schemas.js";

export type MessagingCaller = {
  readonly userId: string;
  readonly discordId: string;
};

export class MessagingAccessDenied extends TaggedErrorClass<MessagingAccessDenied>()(
  "MessagingAccessDenied",
  { status: Schema.Literal(401), code: Schema.String },
) {}

export class MessagingOperationError extends TaggedErrorClass<MessagingOperationError>()(
  "MessagingOperationError",
  { cause: Schema.Defect() },
) {}

export class MessagingIdentity extends Context.Service<
  MessagingIdentity,
  { readonly caller: Effect.Effect<MessagingCaller, MessagingAccessDenied> }
>()("@lootlog/api/http-api/messaging/identity") {}

export class MessagingData extends Context.Service<
  MessagingData,
  {
    readonly sendNotification: (
      caller: MessagingCaller,
      payload: CreateNotificationDto,
    ) => Effect.Effect<unknown, MessagingOperationError>;
    readonly volunteer: (
      discordId: string,
      notificationId: string,
      payload: CreateVolunteerDto,
    ) => Effect.Effect<void, MessagingOperationError>;
  }
>()("@lootlog/api/http-api/messaging/data") {}

const caller = Effect.flatMap(MessagingIdentity, (identity) => identity.caller);

export const sendNotification = (payload: CreateNotificationDto) =>
  Effect.gen(function* () {
    const authenticated = yield* caller;
    const data = yield* MessagingData;
    const result = yield* data.sendNotification(authenticated, payload);
    return yield* encodeDomainJson(result).pipe(
      Effect.flatMap(
        Schema.decodeUnknownEffect(MessagingControllerSendNotification201),
      ),
      Effect.mapError((cause) => new MessagingOperationError({ cause })),
    );
  });

export const volunteerForNotification = (
  notificationId: string,
  payload: CreateVolunteerDto,
) =>
  Effect.gen(function* () {
    const authenticated = yield* caller;
    const data = yield* MessagingData;
    yield* data.volunteer(authenticated.discordId, notificationId, payload);
  });

type MessagingHttpFailure = MessagingAccessDenied | MessagingOperationError;

const orDieHttpFailure = <A, R>(
  effect: Effect.Effect<A, MessagingHttpFailure, R>,
) =>
  Effect.catchTags(effect, {
    MessagingAccessDenied: (error) =>
      Effect.succeed(HttpServerResponse.empty({ status: error.status })),
    MessagingOperationError: (error) => Effect.die(error.cause),
  });

export const MessagingHandlers = HttpApiBuilder.group(
  LootlogApi,
  "messaging",
  (handlers) =>
    handlers
      .handle("MessagingControllerSendNotification", ({ payload }) =>
        orDieHttpFailure(sendNotification(payload)),
      )
      .handle("MessagingControllerVolunteer", ({ params, payload }) =>
        orDieHttpFailure(
          volunteerForNotification(params.notificationId, payload),
        ),
      ),
);
