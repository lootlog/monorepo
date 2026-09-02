import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";
import { ItemRarityEnum as ItemRarity } from "@lootlog/schema/item-rarity";

const UpdateLootlogConfigNpcSchema = z.object({
  allowedRarities: z.array(z.nativeEnum(ItemRarity)),
});

export class UpdateLootlogConfigNpcDto extends createSchemaClass(
  UpdateLootlogConfigNpcSchema,
) {}
