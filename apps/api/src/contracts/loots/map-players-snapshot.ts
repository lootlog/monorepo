import {
  NonEmptyString,
  PositiveSafeInteger,
} from "@lootlog/schema/http-scalars";
import { ProfessionSchema } from "@lootlog/schema/loot";
import { Schema } from "effect";

export const MapPlayersSnapshot = Schema.Array(
  Schema.Struct({
    accountId: PositiveSafeInteger,
    characterId: PositiveSafeInteger,
    name: NonEmptyString,
    prof: Schema.NullOr(ProfessionSchema),
    icon: Schema.NullOr(Schema.String),
  }),
).check(Schema.isMinLength(1));

export type MapPlayersSnapshot = typeof MapPlayersSnapshot.Type;
