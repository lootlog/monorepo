import { GameVersionSchema } from "@lootlog/schema/game-version";
import { NpcIdentityNamespaceSchema } from "@lootlog/schema/npc-identity";
import { Schema } from "effect";

const IndexNpc = Schema.Struct({
  id: Schema.Number,
  // Older publishers omit it; their ids are legacy.
  identityNamespace: Schema.optional(NpcIdentityNamespaceSchema),
  prof: Schema.NullishOr(Schema.String),
  icon: Schema.String,
  name: Schema.String,
  lvl: Schema.Number,
  wt: Schema.Number,
  type: Schema.String,
  margonemType: Schema.Number,
  world: Schema.String,
  gameVersion: GameVersionSchema,
  snapshotHash: Schema.optional(Schema.String),
  // The loot that observed it; older publishers omit it.
  lootId: Schema.optional(Schema.Number),
});

export const IndexNpcsPayload = Schema.Array(IndexNpc);

export type IndexNpcsCommand = { readonly npcs: typeof IndexNpcsPayload.Type };
