export type Npc = {
  id: number;
  name: string;
  lvl: number;
  x: number;
  y: number;
  prof: string;
  type: string;
  margonemType: string;
  location: string;
  wt: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
  lootId: number | null;
};
