import { Schema } from "effect";

const OpenApiDocumentSchema = Schema.StructWithRest(
  Schema.Struct({
    components: Schema.optionalKey(
      Schema.StructWithRest(
        Schema.Struct({
          schemas: Schema.optionalKey(
            Schema.Record(Schema.String, Schema.Json),
          ),
        }),
        [Schema.Record(Schema.String, Schema.Unknown)],
      ),
    ),
    paths: Schema.optionalKey(
      Schema.Record(Schema.String, Schema.Record(Schema.String, Schema.Json)),
    ),
  }),
  [Schema.Record(Schema.String, Schema.Unknown)],
);

export type JsonValue = typeof Schema.Json.Type;

export const decodeOpenApiDocument = Schema.decodeUnknownSync(
  OpenApiDocumentSchema,
);

export const isJsonObject = (
  value: JsonValue | undefined,
): value is { [key: string]: JsonValue } =>
  value !== null && typeof value === "object" && !Array.isArray(value);
