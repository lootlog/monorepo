import { Schema } from "effect";

export const OpenApiDocumentSchema = Schema.Struct({
  components: Schema.optionalKey(
    Schema.Struct({
      schemas: Schema.optionalKey(Schema.Record(Schema.String, Schema.Json)),
    }),
  ),
  paths: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.Record(Schema.String, Schema.Json)),
  ),
});
export type OpenApiDocument = typeof OpenApiDocumentSchema.Type;
export type JsonValue = typeof Schema.Json.Type;
export const decodeOpenApiDocument = Schema.decodeUnknownSync(
  OpenApiDocumentSchema,
  { onExcessProperty: "preserve" },
);

export const isJsonObject = (
  value: JsonValue | undefined,
): value is { [key: string]: JsonValue } =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const isJsonArray = (
  value: JsonValue | undefined,
): value is readonly JsonValue[] => Array.isArray(value);
