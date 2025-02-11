import { NpcType } from '@prisma/client';

export const getNpcTypeByWt = (
  wt: number,
  prof?: string,
  type?: number,
): NpcType => {
  if ((type === 5 || type === 0) && !prof) {
    return NpcType.NPC;
  }

  if (wt > 99) return NpcType.TITAN;
  else if (wt > 89) return NpcType.COLOSSUS;
  else if (wt > 79) return NpcType.HERO;
  else if (wt > 29) return NpcType.ELITE3;
  else if (wt > 19) return NpcType.ELITE2;
  else if (wt > 9) return NpcType.ELITE;

  return NpcType.COMMON;
};
