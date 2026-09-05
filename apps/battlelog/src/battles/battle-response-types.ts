import { DateTime, Option, Schema } from "effect";

export const DateTimeString = Schema.String.check(
  Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u),
  Schema.makeFilter((value) => Option.isSome(DateTime.make(value)), {
    expected: "a valid UTC date-time string",
  }),
);

export type DeepMutable<T> =
  T extends ReadonlyArray<infer Item>
    ? Array<DeepMutable<Item>>
    : T extends object
      ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> }
      : T;
