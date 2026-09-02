import type { ItemRarityEnum as ItemRarity } from "@lootlog/schema/item-rarity";
import type { ProfessionEnum as Profession } from "@lootlog/schema/loot";

export type LootItemDto = {
  id: number;
  hid: string;
  name: string;
  icon: string;
  stat: string;
  type: string | null;
  rarity: ItemRarity | null;
  lvl: number;
  prof: Profession[];
};
