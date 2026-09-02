import { ItemRaritySchema } from "@lootlog/schema/item-rarity";
import { LootSourceSchema, ProfessionSchema } from "@lootlog/schema/loot";
import { NpcTypeSchema } from "@lootlog/schema/npc-type";
import { Schema } from "effect";
import { isoDatetimeCodec } from "#src/shared/schema/response-codecs";

const LootItemResponse = Schema.Struct({
  id: Schema.Number,
  hid: Schema.String,
  name: Schema.String,
  icon: Schema.String,
  stat: Schema.String,
  type: Schema.NullOr(Schema.String),
  rarity: Schema.NullOr(ItemRaritySchema),
  lvl: Schema.Number,
  prof: Schema.Array(ProfessionSchema),
});

const LootPlayerResponse = Schema.Struct({
  id: Schema.Union([Schema.String, Schema.Number]),
  name: Schema.String,
  lvl: Schema.NullOr(Schema.Number),
  prof: Schema.NullOr(ProfessionSchema),
  icon: Schema.NullOr(Schema.String),
  characterId: Schema.NullOr(Schema.Number),
  accountId: Schema.NullOr(Schema.Number),
  hpp: Schema.NullOr(Schema.Number),
});

const LootNpcResponse = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  wt: Schema.NullOr(Schema.Number),
  lvl: Schema.NullOr(Schema.Number),
  prof: Schema.NullOr(ProfessionSchema),
  icon: Schema.NullOr(Schema.String),
  type: Schema.NullOr(NpcTypeSchema),
  margonemType: Schema.NullOr(Schema.Number),
});

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

export const LootShareResponse = Schema.Record(
  Schema.String,
  Schema.Array(Schema.String),
);
export type LootShare = Record<string, string[]>;

export const LootResponse = Schema.Struct({
  id: Schema.Number,
  uniqueId: Schema.String,
  world: Schema.String,
  source: LootSourceSchema,
  location: Schema.String,
  items: Schema.Array(LootItemResponse),
  players: Schema.Array(LootPlayerResponse),
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
