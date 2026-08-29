import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { ItemRarity, NpcType } from "#src/generated/prisma/client";

const LootlogConfigNpcResponseSchema = z.object({
  id: z.number(),
  npcType: z.nativeEnum(NpcType),
  allowedRarities: z.array(z.nativeEnum(ItemRarity)),
});

export class LootlogConfigNpcResponseDto extends createZodDto(
  LootlogConfigNpcResponseSchema,
) {}
