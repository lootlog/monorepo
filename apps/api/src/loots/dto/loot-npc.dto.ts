import { NpcType, Profession } from 'generated/client';

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
