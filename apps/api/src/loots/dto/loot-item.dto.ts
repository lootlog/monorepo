import { db as prismaDb } from "../../prisma/db.js";
const ItemRarity = prismaDb.nativeEnums.public.ItemRarity.members;
type ItemRarity = (typeof ItemRarity)[keyof typeof ItemRarity];
const Profession = prismaDb.nativeEnums.public.Profession.members;
type Profession = (typeof Profession)[keyof typeof Profession];

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
