import { Schema } from "effect";
export const PlayerHit = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  lvl: Schema.Number,
  prof: Schema.String,
  icon: Schema.String,
  characterId: Schema.Number,
  accountId: Schema.Number,
  world: Schema.String,
});
export type PlayerHit = typeof PlayerHit.Type;
