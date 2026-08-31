import { db as prismaDb } from "#src/prisma/db";
import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const ItemRarity = prismaDb.nativeEnums.public.ItemRarity.members;
type ItemRarity = (typeof ItemRarity)[keyof typeof ItemRarity];

const UpdateLootlogConfigNpcSchema = z.object({
  allowedRarities: z.array(z.nativeEnum(ItemRarity)),
});

export class UpdateLootlogConfigNpcDto extends createZodDto(
  UpdateLootlogConfigNpcSchema,
) {}
