import { GameVersionSchema } from "@lootlog/schema/game-version";
import { NpcIdentityNamespaceSchema } from "@lootlog/schema/npc-identity";
import { Schema } from "effect";

/** The NPC a fight's items dropped from, in its catalog identity. */
export const IndexDropSource = Schema.Struct({
  id: Schema.Number,
  identityNamespace: NpcIdentityNamespaceSchema,
  name: Schema.String,
  lvl: Schema.NullOr(Schema.Number),
  icon: Schema.NullOr(Schema.String),
  type: Schema.NullOr(Schema.String),
  margonemType: Schema.NullOr(Schema.Number),
  gameVersion: GameVersionSchema,
});

export const IndexItem = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  icon: Schema.String,
  stat: Schema.String,
  lvl: Schema.Number,
  rarity: Schema.NullOr(Schema.String),
  type: Schema.NullOr(Schema.String),
  world: Schema.optional(Schema.String),
  worlds: Schema.optional(Schema.Array(Schema.String)),
  gameVersion: GameVersionSchema,
  // When the API accepted the loot; older publishers omit it.
  observedAt: Schema.optional(Schema.String),
  // Absent for lootboxes, dialogs and fights without one boss.
  droppedBy: Schema.optional(IndexDropSource),
});

export const IndexItemsPayload = Schema.Array(IndexItem);

export type IndexItemsCommand = {
  readonly items: typeof IndexItemsPayload.Type;
};
