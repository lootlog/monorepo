import { db as prismaDb } from "#src/prisma/db";
import type { Contract } from "../../prisma/contract.js";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const ItemRarity = prismaDb.nativeEnums.public.ItemRarity.members;
type ItemRarity =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["ItemRarity"]["values"][number];
const NpcType = prismaDb.nativeEnums.public.NpcType.members;
type NpcType =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["NpcType"]["values"][number];

const LootlogConfigNpcResponseSchema = z.object({
  id: z.number(),
  npcType: z.nativeEnum(NpcType),
  allowedRarities: z.array(z.nativeEnum(ItemRarity)),
});

export class LootlogConfigNpcResponseDto extends createZodDto(
  LootlogConfigNpcResponseSchema,
) {}
