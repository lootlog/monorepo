import { UserFeedItem } from "./feed.js";
import { LootSnapshot } from "./loot-summary.js";
import { NonNegativeInt } from "@lootlog/schema/primitives";
import { Schema } from "effect";

/*
 * Loot and reservation events that RabbitMQ carries and the realtime gateway
 * forwards to browsers. They live apart from the RabbitMQ catalogue so the
 * realtime protocol does not bundle every server-only event schema.
 */

export const GuildLootEventNpc = Schema.Struct({
  lvl: Schema.optional(Schema.NullOr(Schema.Number)),
  prof: Schema.optional(Schema.NullOr(Schema.String)),
  type: Schema.optional(
    Schema.NullOr(Schema.Union([Schema.Number, Schema.String])),
  ),
  wt: Schema.optional(
    Schema.NullOr(Schema.Union([Schema.Number, Schema.String])),
  ),
});

export const GuildLootCreatedEventV2 = Schema.Struct({
  feedEntry: Schema.optional(UserFeedItem),
  version: Schema.Literal(2),
  guildId: Schema.NonEmptyString,
  lootId: NonNegativeInt,
  npcs: Schema.Array(GuildLootEventNpc),
});

export type GuildLootCreatedEventV2 = typeof GuildLootCreatedEventV2.Type;

// Publishers before the snapshot omit `loot`; web clients then read the loot back.
export const GuildLootCreatedMessageV2 = Schema.Struct({
  ...GuildLootCreatedEventV2.fields,
  loot: Schema.optional(LootSnapshot),
});

export type GuildLootCreatedMessageV2 = typeof GuildLootCreatedMessageV2.Type;

export const GuildLootShareUpdatedEventV2 = Schema.Struct({
  ...GuildLootCreatedEventV2.fields,
  lootShare: Schema.Record(Schema.String, Schema.Array(Schema.String)),
});

export type GuildLootShareUpdatedEventV2 =
  typeof GuildLootShareUpdatedEventV2.Type;

export const ReservationChangedEventV2 = Schema.Struct({
  version: Schema.Literal(2),
  action: Schema.Literals(["created", "updated", "deleted", "sharing-changed"]),
  sourceGuildId: Schema.NonEmptyString,
  audienceGuildIds: Schema.Array(Schema.NonEmptyString),
  reservationId: Schema.NullOr(NonNegativeInt),
  spotId: Schema.NullOr(Schema.String),
});

export type ReservationChangedEventV2 = typeof ReservationChangedEventV2.Type;
