import type { ProfessionEnum as Profession } from "@lootlog/schema/loot";

export type LootPlayerDto = {
  id: string;
  name: string;
  lvl: number | null;
  prof: Profession | null;
  icon: string | null;
  characterId: number | null;
  accountId: number | null;
  hpp: number | null;
};
