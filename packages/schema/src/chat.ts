import { Schema } from "effect";
import { DateTimeString } from "./http-scalars.js";
import { NonNegativeInt } from "./primitives.js";

export const CHAT_MESSAGE_LIMIT = 300;

export const GLOBAL_CHAT_MESSAGE_LIMIT = 2000;

export const GLOBAL_CHAT_PAGE_SIZE = 100;

export const GLOBAL_CHAT_MESSAGE_MAX_LENGTH = 128;

export const GLOBAL_CHAT_SEND_COOLDOWN_SECONDS = 3;

export const GLOBAL_CHAT_MUTE_DURATIONS_MINUTES = [
  5, 15, 30, 60, 180, 360, 720, 1440, 4320, 10080, 43200,
] as const;

export const GlobalChatMessageText = Schema.String.check(
  Schema.isTrimmed(),
  Schema.isMinLength(1),
  Schema.isMaxLength(GLOBAL_CHAT_MESSAGE_MAX_LENGTH),
);

export const GlobalChatWorld = Schema.NonEmptyString.check(
  Schema.isMaxLength(64),
);

export const GlobalChatMessageSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  displayName: Schema.NonEmptyString,
  message: GlobalChatMessageText,
  timestamp: DateTimeString,
  world: Schema.optionalKey(GlobalChatWorld),
  originWorld: Schema.optionalKey(GlobalChatWorld),
  isAdmin: Schema.optionalKey(Schema.Boolean),
});

export type GlobalChatMessage = typeof GlobalChatMessageSchema.Type;

export const GlobalChatChannelUpdateSchema = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("deleted"),
    world: Schema.optionalKey(GlobalChatWorld),
    id: Schema.NonEmptyString,
  }),
  Schema.Struct({
    type: Schema.Literal("pinned"),
    world: Schema.optionalKey(GlobalChatWorld),
    message: Schema.NullOr(GlobalChatMessageSchema),
  }),
]);

export type GlobalChatChannelUpdate = typeof GlobalChatChannelUpdateSchema.Type;

export const GlobalChatStatsSchema = Schema.Struct({
  world: Schema.optionalKey(GlobalChatWorld),
  online: NonNegativeInt,
  listeners: NonNegativeInt,
});

export type GlobalChatStats = typeof GlobalChatStatsSchema.Type;
