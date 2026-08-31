import type { Contract } from "../../prisma/contract.js";

type ItemRarity =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["ItemRarity"]["values"][number];
type Profession =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Profession"]["values"][number];

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
