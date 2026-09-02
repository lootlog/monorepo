import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";
import { LootlogConfigNpcResponseDto } from "./lootlog-config-npc-response.dto.js";

const LootlogConfigResponseSchema = z.object({
  id: z.string(),
  npcs: z.array(LootlogConfigNpcResponseDto.schema),
});

export class LootlogConfigResponseDto extends createSchemaClass(
  LootlogConfigResponseSchema,
) {}

export class NullableLootlogConfigResponseDto extends createSchemaClass(
  LootlogConfigResponseSchema.nullable(),
) {}
