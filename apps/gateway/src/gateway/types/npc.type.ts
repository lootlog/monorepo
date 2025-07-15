import { NpcType } from 'src/gateway/enums/npc-type.enum';

export type Npc = {
  id: number;
  name: string;
  lvl: number;
  prof: string;
  type: NpcType;
  margonemType: number;
  location: string;
  wt: number;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
  lootId: number | null;
};
