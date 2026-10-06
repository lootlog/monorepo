import { Schema } from "effect";
import { DateTimeString } from "./http-scalars.js";

export const CHAT_MESSAGE_LIMIT = 300;

/** Messages the global chat keeps; every send trims older ones. */
export const GLOBAL_CHAT_MESSAGE_LIMIT = 2000;

export const GLOBAL_CHAT_PAGE_SIZE = 100;

export const GLOBAL_CHAT_MESSAGE_MAX_LENGTH = 128;

/** One User sends at most one global chat message in this window. */
export const GLOBAL_CHAT_SEND_COOLDOWN_SECONDS = 3;

export const GlobalChatMessageText = Schema.String.check(
  Schema.isTrimmed(),
  Schema.isMinLength(1),
  Schema.isMaxLength(GLOBAL_CHAT_MESSAGE_MAX_LENGTH),
);

/**
 * A global chat message as every Member sees it. It crosses Organization
 * boundaries, so it names the sender only by their Discord display name and
 * never carries a User, Discord, Organization or character identifier.
 */
export const GlobalChatMessageSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  displayName: Schema.NonEmptyString,
  message: GlobalChatMessageText,
  timestamp: DateTimeString,
});

export type GlobalChatMessage = typeof GlobalChatMessageSchema.Type;
