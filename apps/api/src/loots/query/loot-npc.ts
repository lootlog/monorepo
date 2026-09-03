import type { ProfessionEnum as Profession } from "@lootlog/schema/loot";
import type { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";

export type LootNpcDto = {
  id: number;
  name: string;
  wt: number | null;
  lvl: number | null;
  prof: Profession | null;
  icon: string | null;
  type: NpcType | null;
  margonemType: number | null;
};
