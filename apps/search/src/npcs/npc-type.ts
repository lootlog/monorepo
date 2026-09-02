import { NpcTypeEnum } from "@lootlog/schema/npc-type";

export const getNpcTypeByWt = (
  wt: number,
  prof?: string,
  type?: number,
): NpcTypeEnum => {
  if (type === 0 && wt > 29 && wt < 80) return NpcTypeEnum.ELITE3;
  if ((type === 5 || type === 0) && !prof) return NpcTypeEnum.NPC;
  if (wt > 99) return NpcTypeEnum.TITAN;
  if (wt > 89) return NpcTypeEnum.COLOSSUS;
  if (wt > 79) return NpcTypeEnum.HERO;
  if (wt > 29) return NpcTypeEnum.ELITE3;
  if (wt > 19) return NpcTypeEnum.ELITE2;
  if (wt > 9) return NpcTypeEnum.ELITE;
  return NpcTypeEnum.COMMON;
};
