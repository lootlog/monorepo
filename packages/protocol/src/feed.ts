import { LootSummary } from "./loot-summary.js";
import {
  FiniteNumber,
  PositiveSafeInteger,
} from "@lootlog/schema/http-scalars";
import { Schema } from "effect";

const FeedNpc = Schema.Struct({
  id: FiniteNumber,
  name: Schema.String,
  type: Schema.NullOr(Schema.String),
  lvl: Schema.NullOr(FiniteNumber),
  icon: Schema.NullOr(Schema.String),
  prof: Schema.optionalKey(Schema.NullOr(Schema.String)),
});
const common = {
  id: Schema.String,
  version: PositiveSafeInteger,
  groupKey: Schema.optionalKey(Schema.String),
  occurredAt: Schema.String,
  world: Schema.String,
  guild: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    vanityUrl: Schema.NullOr(Schema.String),
  }),
  npc: Schema.NullOr(FeedNpc),
};
export const UserFeedItem = Schema.Union([
  Schema.Struct({
    ...common,
    type: Schema.Literal("kill"),
    npc: FeedNpc,
    count: PositiveSafeInteger,
  }),
  Schema.Struct({
    ...common,
    type: Schema.Literal("loot"),
    lootId: PositiveSafeInteger,
    summary: Schema.optionalKey(LootSummary),
    additionalItemsCount: FiniteNumber,
    items: Schema.Array(
      Schema.Struct({
        id: FiniteNumber,
        name: Schema.String,
        icon: Schema.String,
        rarity: Schema.NullOr(Schema.String),
        stat: Schema.optionalKey(Schema.String),
        type: Schema.optionalKey(Schema.NullOr(Schema.String)),
        lvl: Schema.optionalKey(Schema.NullOr(FiniteNumber)),
      }),
    ),
  }),
]);
export type UserFeedItem = typeof UserFeedItem.Type;
