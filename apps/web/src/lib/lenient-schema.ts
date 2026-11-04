import {
  Effect,
  Option,
  Schema,
  SchemaGetter,
  SchemaTransformation,
} from "effect";

/**
 * Decodes with `schema`, or yields `fallback` when the value is missing or
 * does not decode, so untrusted input (search params, storage, payloads)
 * degrades to a default instead of failing.
 */
export const withFallback = <S extends Schema.Top>(
  schema: S,
  fallback: S["Type"],
) =>
  schema.pipe(
    Schema.middlewareDecoding((decoded) =>
      decoded.pipe(
        Effect.map(Option.orElseSome(() => fallback)),
        Effect.catchEager(() => Effect.succeed(Option.some(fallback))),
      ),
    ),
  );

/** An optional key whose malformed value decodes to `undefined`. */
export const optionalWithFallback = <S extends Schema.Top>(schema: S) =>
  Schema.optional(
    Schema.UndefinedOr(schema).pipe(
      Schema.catchDecoding(() => Effect.succeed(Option.some(undefined))),
    ),
  );

/**
 * A list that drops the entries `entry` cannot read; a value that is not a
 * list reads as empty.
 */
export const readableEntries = <S extends Schema.Top>(entry: S) =>
  withFallback(
    Schema.Array(withFallback(Schema.NullOr(entry), null)).pipe(
      Schema.decodeTo(
        Schema.Array(Schema.toType(entry)),
        SchemaTransformation.transform<
          ReadonlyArray<S["Type"]>,
          ReadonlyArray<S["Type"] | null>
        >({
          decode: (entries) => entries.filter((value) => value !== null),
          encode: (entries) => entries,
        }),
      ),
    ),
    [],
  );

/** A number read with `Number()`, as from a search param or chart payload. */
export const CoercedFinite = Schema.Unknown.pipe(
  Schema.decodeTo(Schema.Finite, {
    decode: SchemaGetter.Number(),
    encode: SchemaGetter.passthrough({ strict: false }),
  }),
);
