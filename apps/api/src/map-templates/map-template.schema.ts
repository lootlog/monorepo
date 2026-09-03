import { IsoDateTime } from "@lootlog/schema/primitives";
import { Schema } from "effect";

const SafeInteger = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(Number.MIN_SAFE_INTEGER),
  Schema.isLessThanOrEqualTo(Number.MAX_SAFE_INTEGER),
);

export const MapTemplateMapSchema = Schema.Struct({
  id: SafeInteger,
  name: Schema.String,
});

export const CreateMapTemplateSchema = Schema.Struct({
  name: Schema.String,
  maps: Schema.Array(MapTemplateMapSchema).check(Schema.isMinLength(1)),
}).annotate({ identifier: "CreateMapTemplateDto" });
export type CreateMapTemplate = typeof CreateMapTemplateSchema.Type;
export type EncodedCreateMapTemplate = typeof CreateMapTemplateSchema.Encoded;

export const MapTemplateResponseSchema = Schema.Struct({
  id: Schema.String,
  guildId: Schema.String,
  name: Schema.String,
  maps: Schema.Array(MapTemplateMapSchema),
  createdAt: IsoDateTime,
}).annotate({ identifier: "MapTemplateResponseDto" });

export type MapTemplateResponse = typeof MapTemplateResponseSchema.Type;
export type EncodedMapTemplateResponse =
  typeof MapTemplateResponseSchema.Encoded;
