/** Input and output schemas for the cross-Organization global chat. */
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

/** What the caller may do in the global chat. */
export const GlobalChatViewer = Schema.Struct({
  isAdmin: Schema.Boolean,
  muted: Schema.Boolean,
  /** When the caller's mute ends; null while not muted or muted until lifted. */
  mutedUntil: Schema.NullOr(DateTimeString),
}).annotate({ identifier: "GlobalChatViewer" });

export type GlobalChatViewer = typeof GlobalChatViewer.Type;

export const GlobalChatMessagesResponse = Schema.Struct({
  /** Oldest first, ending with the newest message older than the cursor. */
  messages: Schema.Array(GlobalChatMessageResponse),
  /** Pass as `before` to read the previous page; null at the oldest kept message. */
  nextCursor: Schema.NullOr(Schema.String),
  // Inline, since OpenAPI 3.0 ignores `nullable` beside a `$ref`.
  pinned: Schema.NullOr(Schema.Struct(GlobalChatMessageResponse.fields)),
  viewer: GlobalChatViewer,
}).annotate({ identifier: "GlobalChatMessagesResponse" });

export type GlobalChatMessagesResponse = typeof GlobalChatMessagesResponse.Type;

/** Omitting `world` names the channel every world shares. */
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
  /** Worlds with their own channel, alphabetically. */
  worlds: Schema.Array(Schema.String),
}).annotate({ identifier: "GlobalChatWorldsResponse" });

export type GlobalChatWorldsResponse = typeof GlobalChatWorldsResponse.Type;

export const SendGlobalChatMessageRequest = Schema.Struct({
  message: GlobalChatMessageText,
  world: Schema.optionalKey(GlobalChatWorld),
  /** The sender's current world, tagged on messages in the shared channel. */
  originWorld: Schema.optionalKey(GlobalChatWorld),
  /**
   * Global chat admins only: also posts a copy to the shared channel and every
   * world's channel. The response is the copy in the channel `world` names.
   */
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
  /** Null mutes until an admin lifts it. */
  mutedUntil: Schema.NullOr(DateTimeString),
  createdAt: DateTimeString,
}).annotate({ identifier: "GlobalChatMuteResponse" });

export type GlobalChatMuteResponse = typeof GlobalChatMuteResponse.Type;

export const GlobalChatMutesResponse = Schema.Struct({
  /** Active mutes, the ones ending soonest first and lasting ones last. */
  mutes: Schema.Array(GlobalChatMuteResponse),
}).annotate({ identifier: "GlobalChatMutesResponse" });

export type GlobalChatMutesResponse = typeof GlobalChatMutesResponse.Type;

/** Mutes the sender of a message kept in the channel. */
export const MuteGlobalChatSenderRequest = Schema.Struct({
  world: Schema.optionalKey(GlobalChatWorld),
  messageId: Schema.NonEmptyString,
  /** Null mutes until an admin lifts it. */
  durationMinutes: Schema.NullOr(
    Schema.Literals(GLOBAL_CHAT_MUTE_DURATIONS_MINUTES),
  ),
}).annotate({ identifier: "MuteGlobalChatSenderRequest" });

export type MuteGlobalChatSenderRequest =
  typeof MuteGlobalChatSenderRequest.Type;

export const GlobalChatMuteParams = Schema.Struct({
  muteId: Schema.NonEmptyString,
});
