import { Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import type { MessagingService } from "#src/messaging/messaging.service";
import {
  LootlogApi,
  MessagingControllerSendNotification201,
  type CreateNotificationDto,
  type CreateVolunteerDto,
} from "../../lootlog-api.generated.js";

export type MessagingCaller = {
  readonly userId: string;
  readonly discordId: string;
};

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class MessagingAccessDenied extends Schema.TaggedError<MessagingAccessDenied>()(
  "MessagingAccessDenied",
  { status: Schema.Literal(401), code: Schema.String },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class MessagingOperationError extends Schema.TaggedError<MessagingOperationError>()(
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
>()("@lootlog/api/http-api/messaging/data") {
  static layerService(service: MessagingService) {
    const attempt = <A>(operation: () => A | PromiseLike<A>) =>
      Effect.tryPromise({
        try: () => Promise.resolve(operation()),
        catch: (cause) => new MessagingOperationError({ cause }),
      });
    const mutable = <A>(value: unknown): A =>
      JSON.parse(JSON.stringify(value)) as A;

    return Layer.succeed(
      MessagingData,
      MessagingData.of({
        sendNotification: ({ userId, discordId }, payload) =>
          attempt(() =>
            service.sendNotification(userId, discordId, mutable(payload)),
          ),
        volunteer: (discordId, notificationId, payload) =>
          attempt(() =>
            service.volunteer(discordId, notificationId, mutable(payload)),
          ),
      }),
    );
  }
}

const caller = Effect.flatMap(MessagingIdentity, (identity) => identity.caller);

export const sendNotification = (payload: CreateNotificationDto) =>
  Effect.gen(function* () {
    const authenticated = yield* caller;
    const data = yield* MessagingData;
    const result = yield* data.sendNotification(authenticated, payload);
    return yield* Schema.decodeUnknownEffect(
      MessagingControllerSendNotification201,
    )(JSON.parse(JSON.stringify(result))).pipe(
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

const defectCause = (error: unknown) =>
  error instanceof MessagingOperationError ? error.cause : error;
const orDieHttpFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) => Effect.die(defectCause(error)));

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
