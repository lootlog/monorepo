import { Effect, Schema } from "effect";

/** Reads a stored value that fails its schema as `fallback`. */
export const withFallback = <S extends Schema.Top>(fallback: S["Type"]) =>
  Schema.catchDecoding<S>(() => Effect.succeedSome(fallback));

/**
 * An optional stored field that reads an invalid value as `undefined`, so one
 * corrupt field falls back to its default without discarding its neighbours.
 */
export const optionalOrUndefined = <S extends Schema.Top>(schema: S) =>
  Schema.optional(schema).pipe(withFallback(undefined));

/** A stored object that keeps keys written by other releases or add-ons. */
export const looseStruct = <const Fields extends Schema.Struct.Fields>(
  fields: Fields,
) =>
  Schema.StructWithRest(Schema.Struct(fields), [
    Schema.Record(Schema.String, Schema.Unknown),
  ]);
