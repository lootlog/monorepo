import { MapPlayersSnapshot } from "#src/contracts/loots/map-players-snapshot";
import {
  LootItemResponse,
  LootPlayerResponse,
  LootNpcResponse,
  LootShareResponse,
} from "@lootlog/protocol/loot-summary";
import { LootSourceSchema } from "@lootlog/schema/loot";
import { Schema } from "effect";
import { isoDatetimeCodec } from "#src/shared/schema/response-codecs";

const LootSubmissionMemberResponse = Schema.Struct({
  name: Schema.String,
  avatar: Schema.optionalKey(Schema.NullOr(Schema.String)),
  userId: Schema.String,
});

const LootSubmissionResponse = Schema.Struct({
  guildId: Schema.String,
  memberId: Schema.Number,
  lootId: Schema.Number,
  member: LootSubmissionMemberResponse,
});

export type LootShare = Record<string, string[]>;

export const LootResponse = Schema.Struct({
  id: Schema.Number,
  uniqueId: Schema.String,
  world: Schema.String,
  source: LootSourceSchema,
  location: Schema.String,
  items: Schema.Array(LootItemResponse),
  players: Schema.Array(LootPlayerResponse),
  mapPlayersSnapshot: Schema.NullOr(MapPlayersSnapshot),
  npcs: Schema.Array(LootNpcResponse),
  lootShare: LootShareResponse,
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
  submissions: Schema.optionalKey(Schema.Array(LootSubmissionResponse)),
  commentsCount: Schema.Number,
});
export type LootResponse = typeof LootResponse.Type;

export const NullableLootResponse = Schema.NullOr(LootResponse);
export const NullableLootItemResponse = Schema.NullOr(LootItemResponse);
