import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import type {
  NotificationGoingRequest,
  NotificationGoingResponse,
  SendNotificationRequest,
  SentNotificationResponse,
  VolunteerForPartyRequest,
} from "#src/contracts/messaging/schemas";

export type MessagingCaller = {
  readonly userId: string;
  readonly discordId: string;
};

export class MessagingOperationError extends TaggedErrorClass<MessagingOperationError>()(
  "MessagingOperationError",
  { cause: Schema.Defect() },
) {}

export class MessagingData extends Context.Service<
  MessagingData,
  {
    readonly sendNotification: (
      caller: MessagingCaller,
      payload: SendNotificationRequest,
    ) => Effect.Effect<SentNotificationResponse, MessagingOperationError>;
    readonly volunteer: (
      discordId: string,
      notificationId: string,
      payload: VolunteerForPartyRequest,
    ) => Effect.Effect<void, MessagingOperationError>;
    readonly going: (
      caller: MessagingCaller,
      notificationId: string,
      payload: NotificationGoingRequest,
    ) => Effect.Effect<NotificationGoingResponse, MessagingOperationError>;
  }
>()("@lootlog/api/http-api/messaging/data") {}
