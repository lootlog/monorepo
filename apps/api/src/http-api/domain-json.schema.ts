import { IsoDateTime } from "@lootlog/schema/primitives";
import { Effect, Schema } from "effect";

export type DomainJsonValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | ReadonlyArray<DomainJsonValue>
  | { readonly [key: string]: DomainJsonValue };

export const DomainJsonValue: Schema.Codec<DomainJsonValue> = Schema.suspend(
  (): Schema.Codec<DomainJsonValue> =>
    Schema.Union([
      IsoDateTime,
      Schema.String,
      Schema.Finite,
      Schema.Boolean,
      Schema.Null,
      Schema.Undefined,
      Schema.Array(DomainJsonValue),
      Schema.Record(Schema.String, DomainJsonValue),
    ]),
);

const encodeDomainJson = Schema.encodeUnknownEffect(DomainJsonValue);

export const decodeDomainJson = <A, I, R>(
  schema: Schema.Codec<A, I, R>,
  value: unknown,
) =>
  encodeDomainJson(value).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(schema)),
  );
