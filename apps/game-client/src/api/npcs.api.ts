import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";

export { NpcType };

export type Npc = {
  id: number;
  name: string;
  lvl: number;
  prof: string;
  icon: string;
  wt: number;
  type: NpcType;
  location?: string;
  margonemType: number;
};
