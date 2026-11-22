import * as Schema from "effect/Schema";
import {
  GLOBAL_CHAT_MUTE_DURATIONS_MINUTES,
  GlobalChatMessageSchema,
  GlobalChatMessageText,
  GlobalChatWorld,
} from "@lootlog/schema/chat";
import { DateTimeString } from "@lootlog/schema/http-scalars";

export const GlobalChatMessageResponse = Schema.Struct({
  ...GlobalChatMessageSchema.fields,
  isAdmin: Schema.Boolean,
  isOwn: Schema.Boolean,
}).annotate({ identifier: "GlobalChatMessageResponse" });

export type GlobalChatMessageResponse = typeof GlobalChatMessageResponse.Type;

const GlobalChatViewer = Schema.Struct({
  isAdmin: Schema.Boolean,
  muted: Schema.Boolean,
  mutedUntil: Schema.NullOr(DateTimeString),
}).annotate({ identifier: "GlobalChatViewer" });

export const GlobalChatMessagesResponse = Schema.Struct({
  messages: Schema.Array(GlobalChatMessageResponse),
  nextCursor: Schema.NullOr(Schema.String),
  pinned: Schema.NullOr(Schema.Struct(GlobalChatMessageResponse.fields)),
  viewer: GlobalChatViewer,
}).annotate({ identifier: "GlobalChatMessagesResponse" });

export type GlobalChatMessagesResponse = typeof GlobalChatMessagesResponse.Type;

export const GlobalChatChannelQuery = Schema.Struct({
  world: Schema.optionalKey(GlobalChatWorld),
});

export const GlobalChatMessagesQuery = Schema.Struct({
  ...GlobalChatChannelQuery.fields,
  before: Schema.optionalKey(
    Schema.String.check(Schema.isPattern(/^[1-9]\d{0,15}$/)),
  ),
});

export const GlobalChatWorldsResponse = Schema.Struct({
  worlds: Schema.Array(Schema.String),
}).annotate({ identifier: "GlobalChatWorldsResponse" });

export type GlobalChatWorldsResponse = typeof GlobalChatWorldsResponse.Type;

export const SendGlobalChatMessageRequest = Schema.Struct({
  message: GlobalChatMessageText,
  world: Schema.optionalKey(GlobalChatWorld),
  originWorld: Schema.optionalKey(GlobalChatWorld),
  allWorlds: Schema.optionalKey(Schema.Boolean),
}).annotate({ identifier: "SendGlobalChatMessageRequest" });

export type SendGlobalChatMessageRequest =
  typeof SendGlobalChatMessageRequest.Type;

export const GlobalChatMessageParams = Schema.Struct({
  messageId: Schema.NonEmptyString,
});

export const PinGlobalChatMessageRequest = Schema.Struct({
  world: Schema.optionalKey(GlobalChatWorld),
  messageId: Schema.NonEmptyString,
}).annotate({ identifier: "PinGlobalChatMessageRequest" });

export type PinGlobalChatMessageRequest =
  typeof PinGlobalChatMessageRequest.Type;

export const GlobalChatMuteResponse = Schema.Struct({
  id: Schema.String,
  displayName: Schema.String,
  mutedUntil: Schema.NullOr(DateTimeString),
  createdAt: DateTimeString,
}).annotate({ identifier: "GlobalChatMuteResponse" });

export type GlobalChatMuteResponse = typeof GlobalChatMuteResponse.Type;

export const GlobalChatMutesResponse = Schema.Struct({
  mutes: Schema.Array(GlobalChatMuteResponse),
}).annotate({ identifier: "GlobalChatMutesResponse" });

export type GlobalChatMutesResponse = typeof GlobalChatMutesResponse.Type;

export const MuteGlobalChatSenderRequest = Schema.Struct({
  world: Schema.optionalKey(GlobalChatWorld),
  messageId: Schema.NonEmptyString,
  durationMinutes: Schema.NullOr(
    Schema.Literals(GLOBAL_CHAT_MUTE_DURATIONS_MINUTES),
  ),
}).annotate({ identifier: "MuteGlobalChatSenderRequest" });

export type MuteGlobalChatSenderRequest =
  typeof MuteGlobalChatSenderRequest.Type;

export const GlobalChatMuteParams = Schema.Struct({
  muteId: Schema.NonEmptyString,
});
