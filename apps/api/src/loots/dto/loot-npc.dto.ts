import { db as prismaDb } from "../../prisma/db.js";
const NpcType = prismaDb.nativeEnums.public.NpcType.members;
type NpcType = (typeof NpcType)[keyof typeof NpcType];
const Profession = prismaDb.nativeEnums.public.Profession.members;
type Profession = (typeof Profession)[keyof typeof Profession];

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
