import { GameVersionSchema } from "@lootlog/schema/game-version";
import { Schema } from "effect";

/**
 * The items a monster no longer drops and how often its kills drop each
 * item; both lists are all of them.
 */
export const MonsterDrops = Schema.Struct({
  gameVersion: GameVersionSchema,
  name: Schema.String,
  type: Schema.NullOr(Schema.String),
  retiredItemIds: Schema.Array(Schema.Number),
  dropRates: Schema.Array(
    Schema.Struct({
      itemId: Schema.Number,
      drops: Schema.Number,
      kills: Schema.Number,
    }),
  ),
});

export const MonsterDropsPayload = Schema.Array(MonsterDrops);

export type MonsterDropsCommand = {
  readonly monsters: typeof MonsterDropsPayload.Type;
};
