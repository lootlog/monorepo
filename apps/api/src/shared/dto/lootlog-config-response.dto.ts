import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { LootlogConfigNpcResponseDto } from "./lootlog-config-npc-response.dto";

const LootlogConfigResponseSchema = z.object({
  id: z.string(),
  npcs: z.array(LootlogConfigNpcResponseDto.schema),
});

export class LootlogConfigResponseDto extends createZodDto(
  LootlogConfigResponseSchema,
) {}

export class NullableLootlogConfigResponseDto extends createZodDto(
  LootlogConfigResponseSchema.nullable(),
) {}
