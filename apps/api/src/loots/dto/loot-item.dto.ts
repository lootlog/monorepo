import { ItemRarity, Profession } from "prisma/generated/client";

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
