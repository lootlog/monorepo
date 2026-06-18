export const BATTLE_HP_TIMELINE_COLORS = {
  friendly: "#4ade80",
  enemy: "#f87171",
} as const;

type BattleHpTimelineColorWarrior = {
  originalId: string;
  team: number;
};

export const getBattleHpTimelinePlayerTeam = (
  warriors: BattleHpTimelineColorWarrior[],
  characterId: string | null | undefined,
) => {
  if (!characterId) {
    return null;
  }

  return (
    warriors.find((warrior) => warrior.originalId === characterId)?.team ?? null
  );
};

export const getBattleHpTimelineTeamColor = (
  team: number,
  playerTeam: number | null,
) => {
  if (playerTeam === null) {
    return team === 1
      ? BATTLE_HP_TIMELINE_COLORS.friendly
      : BATTLE_HP_TIMELINE_COLORS.enemy;
  }

  return team === playerTeam
    ? BATTLE_HP_TIMELINE_COLORS.friendly
    : BATTLE_HP_TIMELINE_COLORS.enemy;
};
