import { IsoDateTime } from "@lootlog/schema/primitives";
import { Schema, SchemaTransformation } from "effect";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | ReadonlyArray<JsonValue>
  | { readonly [key: string]: JsonValue };

export const isoDatetimeCodec = IsoDateTime;
export const nullableIsoDatetimeCodec = Schema.NullOr(IsoDateTime);

const DateOrIsoString = Schema.Union([Schema.Date, Schema.String]);

export const flexibleIsoDatetimeCodec = Schema.String.pipe(
  Schema.decodeTo(
    DateOrIsoString,
    SchemaTransformation.transform({
      decode: (value): Date | string => new Date(value),
      encode: (value: Date | string) =>
        value instanceof Date ? value.toISOString() : value,
    }),
  ),
);

export const nullableFlexibleIsoDatetimeCodec = Schema.NullOr(
  flexibleIsoDatetimeCodec,
);

export const unknownRecordSchema = Schema.Record(Schema.String, Schema.Unknown);

export const jsonValueSchema: Schema.Codec<JsonValue> = Schema.suspend(
  (): Schema.Codec<JsonValue> =>
    Schema.Union([
      Schema.String,
      Schema.Number,
      Schema.Boolean,
      Schema.Null,
      Schema.Array(jsonValueSchema),
      Schema.Record(Schema.String, jsonValueSchema),
    ]),
);
