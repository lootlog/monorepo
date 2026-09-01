import { Schema } from "effect";

export const NonEmptyString = Schema.NonEmptyString;
export const NonNegativeInt = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(0),
);
