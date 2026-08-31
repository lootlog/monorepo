import type { Profession } from "#src/db/domain";

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
