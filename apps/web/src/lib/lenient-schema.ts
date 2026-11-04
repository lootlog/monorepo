import { requiredWithFallback } from "@lootlog/schema/stored-value";
import { Schema, SchemaGetter, SchemaTransformation } from "effect";

/**
 * A list that drops the entries `entry` cannot read; a value that is not a
 * list reads as empty.
 */
export const readableEntries = <S extends Schema.Top>(entry: S) =>
  requiredWithFallback(
    Schema.Array(requiredWithFallback(Schema.NullOr(entry), null)).pipe(
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
