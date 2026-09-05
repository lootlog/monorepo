import { Schema } from "effect";
import { FiniteNumber, NonEmptyString } from "@lootlog/schema/http-scalars";

const GameCharacterClan = Schema.Struct({
  id: Schema.optionalKey(FiniteNumber),
  name: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(255).annotate({
        expected: "a value with a length of at most 255",
      }),
    ),
  ),
});
export const GameCharacter = Schema.Struct({
  lvl: FiniteNumber,
  nick: NonEmptyString.check(
    Schema.isMaxLength(255).annotate({
      expected: "a value with a length of at most 255",
    }),
  ),
  accountId: NonEmptyString.check(
    Schema.isMaxLength(255).annotate({
      expected: "a value with a length of at most 255",
    }),
  ),
  characterId: NonEmptyString.check(
    Schema.isMaxLength(255).annotate({
      expected: "a value with a length of at most 255",
    }),
  ),
  prof: NonEmptyString.check(
    Schema.isMaxLength(100).annotate({
      expected: "a value with a length of at most 100",
    }),
  ),
  icon: NonEmptyString.check(
    Schema.isMaxLength(2048).annotate({
      expected: "a value with a length of at most 2048",
    }),
  ),
  clan: Schema.optionalKey(GameCharacterClan),
});
