import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const MapPingSendSchema = z.object({
  expectedMapId: z.number().int().nonnegative(),
  x: z.number().int().min(0).max(65_535),
  y: z.number().int().min(0).max(65_535),
});

export class MapPingSendDto extends createZodDto(MapPingSendSchema) {}
