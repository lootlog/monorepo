import { statusCodeResponse } from "#src/shared/http/handler-response";
import { applicationErrorResponse } from "../../application-error-response.js";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";

import { HttpApiBuilder } from "effect/http-api";
import { LootlogApi } from "../../lootlog-api.js";
import {
  NotificationGoingResponse,
  SentNotificationResponse,
  type NotificationGoingRequest,
  type SendNotificationRequest,
  type VolunteerForPartyRequest,
} from "#src/contracts/messaging/schemas";

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
      payload: SendNotificationRequest,
    ) => Effect.Effect<unknown, MessagingOperationError>;
    readonly volunteer: (
      discordId: string,
      notificationId: string,
      payload: VolunteerForPartyRequest,
    ) => Effect.Effect<void, MessagingOperationError>;
    readonly going: (
      caller: MessagingCaller,
      notificationId: string,
      payload: NotificationGoingRequest,
    ) => Effect.Effect<unknown, MessagingOperationError>;
  }
>()("@lootlog/api/http-api/messaging/data") {}

const caller = Effect.flatMap(MessagingIdentity, (identity) => identity.caller);

export const sendNotification = (payload: SendNotificationRequest) =>
  Effect.gen(function* () {
    const authenticated = yield* caller;
    const data = yield* MessagingData;
    const result = yield* data.sendNotification(authenticated, payload);

    return yield* Schema.decodeUnknownEffect(SentNotificationResponse)(
      result,
    ).pipe(Effect.mapError((cause) => new MessagingOperationError({ cause })));
  });

const volunteerForNotification = (
  notificationId: string,
  payload: VolunteerForPartyRequest,
) =>
  Effect.gen(function* () {
    const authenticated = yield* caller;
    const data = yield* MessagingData;
    yield* data.volunteer(authenticated.discordId, notificationId, payload);
  });

export const answerNotificationGoing = (
  notificationId: string,
  payload: NotificationGoingRequest,
) =>
  Effect.gen(function* () {
    const authenticated = yield* caller;
    const data = yield* MessagingData;

    const result = yield* data.going(authenticated, notificationId, payload);

    return yield* Schema.decodeUnknownEffect(NotificationGoingResponse)(
      result,
    ).pipe(Effect.mapError((cause) => new MessagingOperationError({ cause })));
  });

type MessagingHttpFailure = MessagingAccessDenied | MessagingOperationError;

const orDieHttpFailure = <A, R>(
  effect: Effect.Effect<A, MessagingHttpFailure, R>,
) =>
  Effect.catchTags(effect, {
    MessagingAccessDenied: statusCodeResponse,
    MessagingOperationError: (error) => applicationErrorResponse(error.cause),
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
      )
      .handle("MessagingControllerGoing", ({ params, payload }) =>
        orDieHttpFailure(
          answerNotificationGoing(params.notificationId, payload),
        ),
      ),
);
