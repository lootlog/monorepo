type NpcTypeValues<TNpcType extends string> = {
  COMMON: TNpcType;
  ELITE: TNpcType;
  ELITE2: TNpcType;
  ELITE3: TNpcType;
  HERO: TNpcType;
  EVENT_HERO: TNpcType;
  COLOSSUS: TNpcType;
  TITAN: TNpcType;
  NPC: TNpcType;
};

export const getNpcTypeByWt = <TNpcType extends string>(
  npcTypes: NpcTypeValues<TNpcType>,
  wt: number,
  prof?: string,
  type?: number,
): TNpcType => {
  if (type === 0 && wt > 29 && wt < 80) {
    return npcTypes.ELITE3;
  }

  if ((type === 5 || type === 0) && !prof) {
    return npcTypes.NPC;
  }

  if (wt > 99) return npcTypes.TITAN;
  if (wt > 89) return npcTypes.COLOSSUS;
  if (wt > 79) return npcTypes.HERO;
  if (wt > 29) return npcTypes.ELITE3;
  if (wt > 19) return npcTypes.ELITE2;
  if (wt > 9) return npcTypes.ELITE;

  return npcTypes.COMMON;
};
