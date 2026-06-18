type BattleHpTimelineLabelWarrior = {
  name: string;
  team: number;
};

export const getBattleHpTimelineTeamLabel = (
  warriors: BattleHpTimelineLabelWarrior[],
  team: number,
  fallback: string,
) => {
  const names = warriors
    .filter((warrior) => warrior.team === team)
    .map((warrior) => warrior.name.trim())
    .filter(Boolean);

  if (names.length === 0) {
    return fallback;
  }

  return names.join(", ");
};
