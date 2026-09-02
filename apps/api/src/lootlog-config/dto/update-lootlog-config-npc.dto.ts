import * as z from "zod";
import { createZodDto } from "nestjs-zod";
import { ItemRarityEnum as ItemRarity } from "@lootlog/schema/item-rarity";

const UpdateLootlogConfigNpcSchema = z.object({
  allowedRarities: z.array(z.nativeEnum(ItemRarity)),
});

export class UpdateLootlogConfigNpcDto extends createZodDto(
  UpdateLootlogConfigNpcSchema,
) {}
