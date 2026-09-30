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
  snapshotHash: Schema.optional(Schema.String),
});

export const IndexNpcsPayload = Schema.Array(IndexNpc);

export type IndexNpcsCommand = { readonly npcs: typeof IndexNpcsPayload.Type };
