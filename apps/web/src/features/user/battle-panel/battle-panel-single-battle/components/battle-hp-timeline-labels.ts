type BattleHpTimelineLabelWarrior = {
  name: string;
  team: number;
};

export const getBattleHpTimelineTeamLabel = (
  warriors: BattleHpTimelineLabelWarrior[],
  team: number,
  fallback: string,
) => {
  const names: string[] = [];

  for (const warrior of warriors) {
    if (warrior.team !== team) continue;
    const name = warrior.name.trim();

    if (name) names.push(name);
  }

  if (names.length === 0) {
    return fallback;
  }

  return names.join(", ");
};
