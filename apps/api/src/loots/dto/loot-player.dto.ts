import { db as prismaDb } from "../../prisma/db.js";
const Profession = prismaDb.nativeEnums.public.Profession.members;
type Profession = (typeof Profession)[keyof typeof Profession];

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
