import { NpcTypeSchema } from "@lootlog/schema/npc-type";
import { GameVersionSchema } from "@lootlog/schema/game-version";
import { NpcIdentityNamespaceSchema } from "@lootlog/schema/npc-identity";
import { Schema } from "effect";

export const NpcHit = Schema.Struct({
  id: Schema.Number,
  identityNamespace: NpcIdentityNamespaceSchema,
  prof: Schema.String,
  icon: Schema.String,
  name: Schema.String,
  lvl: Schema.Number,
  wt: Schema.Number,
  type: NpcTypeSchema,
  margonemType: Schema.Number,
  world: Schema.String,
  gameVersion: Schema.NullOr(GameVersionSchema),
});

export type NpcHit = typeof NpcHit.Type;
