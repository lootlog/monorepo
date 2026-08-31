import { db as prismaDb } from "#src/prisma/db";
import type { Contract } from "../../prisma/contract.js";
import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const ItemRarity = prismaDb.nativeEnums.public.ItemRarity.members;
type ItemRarity =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["ItemRarity"]["values"][number];

const UpdateLootlogConfigNpcSchema = z.object({
  allowedRarities: z.array(z.nativeEnum(ItemRarity)),
});

export class UpdateLootlogConfigNpcDto extends createZodDto(
  UpdateLootlogConfigNpcSchema,
) {}
