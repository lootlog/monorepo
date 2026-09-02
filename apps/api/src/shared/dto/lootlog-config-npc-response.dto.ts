import { createSchemaClass } from "#src/shared/validation/schema-class";
import { ItemRarityEnum as ItemRarity } from "@lootlog/schema/item-rarity";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import * as z from "zod";

const LootlogConfigNpcResponseSchema = z.object({
  id: z.number(),
  npcType: z.nativeEnum(NpcType),
  allowedRarities: z.array(z.nativeEnum(ItemRarity)),
});

export class LootlogConfigNpcResponseDto extends createSchemaClass(
  LootlogConfigNpcResponseSchema,
) {}
