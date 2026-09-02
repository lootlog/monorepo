import { createZodDto } from "nestjs-zod";
import * as z from "zod";
import { LootlogConfigNpcResponseDto } from "./lootlog-config-npc-response.dto.js";

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
