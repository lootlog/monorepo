import { Effect, Option, Schema } from "effect";

/** Reads a stored value that fails its schema as `fallback`. */
export const withFallback = <S extends Schema.Top>(fallback: S["Type"]) =>
  Schema.catchDecoding<S>(() => Effect.succeedSome(fallback));

/**
 * A required value that reads as `fallback` when it is missing or fails its
 * schema, so untrusted input (search params, payloads) degrades to a default.
 * Unlike `withFallback`, it also fills a missing struct key.
 */
export const requiredWithFallback = <S extends Schema.Top>(
  schema: S,
  fallback: S["Type"],
) =>
  schema.pipe(
    Schema.middlewareDecoding((decoded) =>
      decoded.pipe(
        Effect.map(Option.orElseSome(() => fallback)),
        Effect.catchEager(() => Effect.succeedSome(fallback)),
      ),
    ),
  );

/**
 * An optional stored field that reads an invalid value as `undefined`, so one
 * corrupt field falls back to its default without discarding its neighbours.
 */
export const optionalOrUndefined = <S extends Schema.Top>(schema: S) =>
  Schema.optional(schema).pipe(withFallback(undefined));

/** An object that keeps the keys it does not name, such as keys written by other releases or add-ons. */
export const looseStruct = <const Fields extends Schema.Struct.Fields>(
  fields: Fields,
) =>
  Schema.StructWithRest(Schema.Struct(fields), [
    Schema.Record(Schema.String, Schema.Unknown),
  ]);
