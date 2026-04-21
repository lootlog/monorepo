import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { isoDatetimeCodec } from "./zod-response-codecs";

const MapTemplateMapItemResponseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

const MapTemplateResponseSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  name: z.string(),
  maps: z.array(MapTemplateMapItemResponseSchema),
  createdAt: isoDatetimeCodec,
});

export class MapTemplateResponseDto extends createZodDto(
  MapTemplateResponseSchema,
  {
    codec: true,
  },
) {}
