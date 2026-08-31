import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { ItemRarity, NpcType } from "#src/db/domain";

const UpdateLootlogConfigNpcsSchema = z.object({
  npcType: z.nativeEnum(NpcType),
  allowedRarities: z.array(z.nativeEnum(ItemRarity)),
});

const UpdateLootlogConfigSchema = z.object({
  npcs: z.array(UpdateLootlogConfigNpcsSchema),
});

export class UpdateLootlogConfigDto extends createZodDto(
  UpdateLootlogConfigSchema,
) {}
