import { db as prismaDb } from "#src/prisma/db";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const ItemRarity = prismaDb.nativeEnums.public.ItemRarity.members;
type ItemRarity = (typeof ItemRarity)[keyof typeof ItemRarity];
const NpcType = prismaDb.nativeEnums.public.NpcType.members;
type NpcType = (typeof NpcType)[keyof typeof NpcType];

const LootlogConfigNpcResponseSchema = z.object({
  id: z.number(),
  npcType: z.nativeEnum(NpcType),
  allowedRarities: z.array(z.nativeEnum(ItemRarity)),
});

export class LootlogConfigNpcResponseDto extends createZodDto(
  LootlogConfigNpcResponseSchema,
) {}
