import { requiredWithFallback } from "@lootlog/schema/stored-value";
import { Schema, SchemaGetter, SchemaTransformation } from "effect";

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

export const CoercedFinite = Schema.Unknown.pipe(
  Schema.decodeTo(Schema.Finite, {
    decode: SchemaGetter.Number(),
    encode: SchemaGetter.passthrough({ strict: false }),
  }),
);
