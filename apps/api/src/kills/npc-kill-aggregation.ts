export interface NpcKillTotal {
  npcId: number;
  npcName: string;
  npcType: string;
  npcLvl: number;
  npcProf: string | null;
  npcIcon: string | null;
  totalKills: number;
}

export const addNpcKills = (
  npcMap: Map<number, NpcKillTotal>,
  stat: Omit<NpcKillTotal, "totalKills">,
  kills: number,
) => {
  const existing = npcMap.get(stat.npcId);
  if (existing) {
    existing.totalKills += kills;
    if (stat.npcLvl > existing.npcLvl) {
      existing.npcLvl = stat.npcLvl;
      existing.npcName = stat.npcName;
      existing.npcProf = stat.npcProf;
      existing.npcIcon = stat.npcIcon;
    }
  } else {
    npcMap.set(stat.npcId, {
      npcId: stat.npcId,
      npcName: stat.npcName,
      npcType: stat.npcType,
      npcLvl: stat.npcLvl,
      npcProf: stat.npcProf,
      npcIcon: stat.npcIcon,
      totalKills: kills,
    });
  }
};
