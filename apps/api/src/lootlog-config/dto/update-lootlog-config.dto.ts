import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";
import { ItemRarityEnum as ItemRarity } from "@lootlog/schema/item-rarity";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";

const UpdateLootlogConfigNpcsSchema = z.object({
  npcType: z.nativeEnum(NpcType),
  allowedRarities: z.array(z.nativeEnum(ItemRarity)),
});

const UpdateLootlogConfigSchema = z.object({
  npcs: z.array(UpdateLootlogConfigNpcsSchema),
});

export class UpdateLootlogConfigDto extends createSchemaClass(
  UpdateLootlogConfigSchema,
) {}
