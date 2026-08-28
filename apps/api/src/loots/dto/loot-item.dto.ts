import type { ItemRarity, Profession } from "src/db/domain";

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
