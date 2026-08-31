import { db as prismaDb } from "#src/prisma/db";
import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const ItemRarity = prismaDb.nativeEnums.public.ItemRarity.members;
type ItemRarity = (typeof ItemRarity)[keyof typeof ItemRarity];
const NpcType = prismaDb.nativeEnums.public.NpcType.members;
type NpcType = (typeof NpcType)[keyof typeof NpcType];

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
