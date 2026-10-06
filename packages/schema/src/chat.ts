import { Schema } from "effect";
import { DateTimeString } from "./http-scalars.js";
import { NonNegativeInt } from "./primitives.js";

export const CHAT_MESSAGE_LIMIT = 300;

/** Messages each global chat channel keeps; every send trims older ones. */
export const GLOBAL_CHAT_MESSAGE_LIMIT = 2000;

export const GLOBAL_CHAT_PAGE_SIZE = 100;

export const GLOBAL_CHAT_MESSAGE_MAX_LENGTH = 128;

/** One User sends at most one global chat message in this window, across channels. */
export const GLOBAL_CHAT_SEND_COOLDOWN_SECONDS = 3;

/** How long an admin may mute a sender; `null` mutes until an admin lifts it. */
export const GLOBAL_CHAT_MUTE_DURATIONS_MINUTES = [
  5, 15, 30, 60, 180, 360, 720, 1440, 4320, 10080, 43200,
] as const;

export const GlobalChatMessageText = Schema.String.check(
  Schema.isTrimmed(),
  Schema.isMinLength(1),
  Schema.isMaxLength(GLOBAL_CHAT_MESSAGE_MAX_LENGTH),
);

/**
 * A Margonem world with its own global chat channel. Wherever a channel is
 * named, an absent world means the channel every world shares.
 */
export const GlobalChatWorld = Schema.NonEmptyString.check(
  Schema.isMaxLength(64),
);

/**
 * A global chat message as every Member sees it. It crosses Organization
 * boundaries, so it names the sender only by their Discord display name and
 * never carries a User, Discord, Organization or character identifier.
 *
 * `isAdmin` and the worlds are optional only for messages published before
 * channels existed; the API sets `isAdmin` on every message it stores.
 */
export const GlobalChatMessageSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  displayName: Schema.NonEmptyString,
  message: GlobalChatMessageText,
  timestamp: DateTimeString,
  /** The channel's world; absent in the channel every world shares. */
  world: Schema.optionalKey(GlobalChatWorld),
  /** In the shared channel only: the world the sender wrote from. */
  originWorld: Schema.optionalKey(GlobalChatWorld),
  isAdmin: Schema.optionalKey(Schema.Boolean),
});

export type GlobalChatMessage = typeof GlobalChatMessageSchema.Type;

/** An admin removed a message, or pinned or unpinned one, in a channel. */
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

/** Live counts the gateway sends to a channel's subscribers. */
export const GlobalChatStatsSchema = Schema.Struct({
  world: Schema.optionalKey(GlobalChatWorld),
  /**
   * Unique Users with a live Game client across every Organization: on the
   * channel's world, or on any world in the shared channel.
   */
  online: NonNegativeInt,
  /** Unique Users following this channel. */
  listeners: NonNegativeInt,
});

export type GlobalChatStats = typeof GlobalChatStatsSchema.Type;
