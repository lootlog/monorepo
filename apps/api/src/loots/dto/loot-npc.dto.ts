import type { NpcType, Profession } from "#src/db/domain";

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
