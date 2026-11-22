import { Effect, Option, Schema } from "effect";

export const withFallback = <S extends Schema.Top>(fallback: S["Type"]) =>
  Schema.catchDecoding<S>(() => Effect.succeedSome(fallback));

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

export const optionalOrUndefined = <S extends Schema.Top>(schema: S) =>
  Schema.optional(schema).pipe(withFallback(undefined));

export const looseStruct = <const Fields extends Schema.Struct.Fields>(
  fields: Fields,
) =>
  Schema.StructWithRest(Schema.Struct(fields), [
    Schema.Record(Schema.String, Schema.Unknown),
  ]);
