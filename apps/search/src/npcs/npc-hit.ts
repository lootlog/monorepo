import { NpcTypeSchema } from "@lootlog/schema/npc-type";
import { Schema } from "effect";
export const NpcHit = Schema.Struct({
  id: Schema.Number,
  prof: Schema.String,
  icon: Schema.String,
  name: Schema.String,
  lvl: Schema.Number,
  wt: Schema.Number,
  type: NpcTypeSchema,
  margonemType: Schema.Number,
  world: Schema.String,
});
export type NpcHit = typeof NpcHit.Type;
