import { Schema } from "effect";
export const IndexPlayer = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  lvl: Schema.Number,
  prof: Schema.String,
  icon: Schema.String,
  characterId: Schema.Number,
  accountId: Schema.Number,
  world: Schema.String,
});
export const IndexPlayersPayload = Schema.Array(IndexPlayer);
export type IndexPlayersCommand = {
  readonly players: typeof IndexPlayersPayload.Type;
};
export const decodeIndexPlayersPayload =
  Schema.decodeUnknownSync(IndexPlayersPayload);
