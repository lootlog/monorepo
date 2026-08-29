import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { ItemRarity } from "#src/generated/prisma/client";

const UpdateLootlogConfigNpcSchema = z.object({
  allowedRarities: z.array(z.nativeEnum(ItemRarity)),
});

export class UpdateLootlogConfigNpcDto extends createZodDto(
  UpdateLootlogConfigNpcSchema,
) {}
