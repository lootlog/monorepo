import { ItemRaritySchema } from "@lootlog/schema/item-rarity";
import { ProfessionSchema } from "@lootlog/schema/loot";
import { NpcTypeSchema } from "@lootlog/schema/npc-type";
import { Schema } from "effect";
import { FiniteNumber } from "@lootlog/schema/http-scalars";

export const LootItemResponse = Schema.Struct({
  id: FiniteNumber,
  hid: Schema.String,
  name: Schema.String,
  icon: Schema.String,
  stat: Schema.String,
  type: Schema.NullOr(Schema.String),
  rarity: Schema.NullOr(ItemRaritySchema),
  lvl: FiniteNumber,
  prof: Schema.Array(ProfessionSchema),
});

export const LootPlayerResponse = Schema.Struct({
  id: Schema.Union([Schema.String, FiniteNumber]),
  name: Schema.String,
  lvl: Schema.NullOr(FiniteNumber),
  prof: Schema.NullOr(ProfessionSchema),
  icon: Schema.NullOr(Schema.String),
  characterId: Schema.NullOr(FiniteNumber),
  accountId: Schema.NullOr(FiniteNumber),
  hpp: Schema.NullOr(FiniteNumber),
});

export const LootNpcResponse = Schema.Struct({
  id: FiniteNumber,
  name: Schema.String,
  wt: Schema.NullOr(FiniteNumber),
  lvl: Schema.NullOr(FiniteNumber),
  prof: Schema.NullOr(ProfessionSchema),
  icon: Schema.NullOr(Schema.String),
  type: Schema.NullOr(NpcTypeSchema),
  margonemType: Schema.NullOr(FiniteNumber),
});

export const LootShareResponse = Schema.Record(
  Schema.String,
  Schema.Array(Schema.String),
);
export const LootSummary = Schema.Struct({
  items: Schema.Array(LootItemResponse),
  players: Schema.Array(LootPlayerResponse),
  npcs: Schema.Array(LootNpcResponse),
  lootShare: LootShareResponse,
  location: Schema.String,
});
export type LootSummary = typeof LootSummary.Type;
