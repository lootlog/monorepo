import { GameVersionSchema } from "@lootlog/schema/game-version";
import { Schema } from "effect";

/** A calendar day in Poland, as `YYYY-MM-DD`. */
const Day = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/));

/**
 * One change the game made to an item, between the day its old revision was
 * last looted and the day the new one was first looted.
 */
export const ItemRevision = Schema.Struct({
  name: Schema.String,
  icon: Schema.String,
  lvl: Schema.Number,
  stat: Schema.String,
  previousName: Schema.String,
  previousIcon: Schema.String,
  previousStat: Schema.String,
  changedAfter: Day,
  changedBy: Day,
});

/** An item's changes, oldest first; the list is all of them. */
export const ItemRevisions = Schema.Struct({
  gameVersion: GameVersionSchema,
  id: Schema.Number,
  revisions: Schema.Array(ItemRevision),
});

export const ItemRevisionsPayload = Schema.Array(ItemRevisions);

export type ItemRevisionsCommand = {
  readonly items: typeof ItemRevisionsPayload.Type;
};
