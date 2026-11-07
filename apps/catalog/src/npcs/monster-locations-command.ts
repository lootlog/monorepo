import { GameVersionSchema } from "@lootlog/schema/game-version";
import { Schema } from "effect";

/** A map a monster is fought on, with the share of its latest fights there. */
export const MonsterLocation = Schema.Struct({
  map: Schema.String,
  share: Schema.Number,
});

/** A level a monster had before, until the day its next version appeared. */
export const MonsterFormerLevel = Schema.Struct({
  lvl: Schema.Number,
  until: Schema.String,
});

/**
 * The maps a monster is fought on and the levels it had before; each list is
 * all of them. Former levels are absent from older publishers.
 */
export const MonsterLocations = Schema.Struct({
  gameVersion: GameVersionSchema,
  name: Schema.String,
  type: Schema.NullOr(Schema.String),
  locations: Schema.Array(MonsterLocation),
  formerLevels: Schema.optionalKey(Schema.Array(MonsterFormerLevel)),
});

export const MonsterLocationsPayload = Schema.Array(MonsterLocations);

export type MonsterLocationsCommand = {
  readonly monsters: typeof MonsterLocationsPayload.Type;
};
