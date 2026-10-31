import { GameVersionSchema } from "@lootlog/schema/game-version";
import { Schema } from "effect";

/** A map a monster is fought on, with the share of its latest fights there. */
export const MonsterLocation = Schema.Struct({
  map: Schema.String,
  share: Schema.Number,
});

/** The maps a monster is fought on; the list is all of them. */
export const MonsterLocations = Schema.Struct({
  gameVersion: GameVersionSchema,
  name: Schema.String,
  type: Schema.NullOr(Schema.String),
  locations: Schema.Array(MonsterLocation),
});

export const MonsterLocationsPayload = Schema.Array(MonsterLocations);

export type MonsterLocationsCommand = {
  readonly monsters: typeof MonsterLocationsPayload.Type;
};
