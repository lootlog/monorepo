import { db as prismaDb } from "#src/prisma/db";
import type { Contract } from "../../prisma/contract.js";
import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const ItemRarity = prismaDb.nativeEnums.public.ItemRarity.members;
type ItemRarity =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["ItemRarity"]["values"][number];
const NpcType = prismaDb.nativeEnums.public.NpcType.members;
type NpcType =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["NpcType"]["values"][number];

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
