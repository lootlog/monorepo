import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";
import { isoDatetimeCodec } from "./zod-response-codecs.js";

const MapTemplateMapItemResponseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});
export const MapTemplateMapsResponseSchema = z.array(
  MapTemplateMapItemResponseSchema,
);
export type MapTemplateMaps = z.infer<typeof MapTemplateMapsResponseSchema>;

const MapTemplateResponseSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  name: z.string(),
  maps: MapTemplateMapsResponseSchema,
  createdAt: isoDatetimeCodec,
});

export class MapTemplateResponseDto extends createSchemaClass(
  MapTemplateResponseSchema,
  {
    codec: true,
  },
) {}
