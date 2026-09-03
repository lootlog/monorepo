import { Schema } from "effect";

export type JsonValue =
  | boolean
  | number
  | string
  | null
  | ReadonlyArray<JsonValue>
  | { readonly [key: string]: JsonValue };

export const JsonValueSchema: Schema.Codec<JsonValue> = Schema.suspend(
  (): Schema.Codec<JsonValue> =>
    Schema.Union([
      Schema.String,
      Schema.Number,
      Schema.Boolean,
      Schema.Null,
      Schema.Array(JsonValueSchema),
      Schema.Record(Schema.String, JsonValueSchema),
    ]),
);

export const GuildDocumentContentSchema = Schema.Record(
  Schema.String,
  JsonValueSchema,
).check(
  Schema.makeFilter(
    (value) => {
      const root = value.root;
      return typeof root === "object" && root !== null && !Array.isArray(root)
        ? undefined
        : "Invalid Lexical editor state";
    },
    { expected: "a Lexical editor state" },
  ),
);

export type GuildDocumentContent = typeof GuildDocumentContentSchema.Type;
