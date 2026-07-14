import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { MAP_PING_TYPES } from "@lootlog/types";

const MapPingSendSchema = z.object({
  expectedMapId: z.number().int().nonnegative(),
  type: z.enum(MAP_PING_TYPES),
  x: z.number().int().min(0).max(65_535),
  y: z.number().int().min(0).max(65_535),
});

export class MapPingSendDto extends createZodDto(MapPingSendSchema) {}
