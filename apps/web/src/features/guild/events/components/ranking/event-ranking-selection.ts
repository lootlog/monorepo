export const getRankingSelection = <
  Hero extends { npcName: string },
  Ranking extends { heroNpcName: string },
>(
  heroes: Hero[],
  rankings: Ranking[],
  selectedHeroName: string | null,
) => {
  const heroNamesWithRankings = new Set(
    rankings.map((ranking) => ranking.heroNpcName),
  );

  const defaultHeroName =
    heroes.find((hero) => heroNamesWithRankings.has(hero.npcName))?.npcName ??
    heroes[0]?.npcName ??
    null;

  const effectiveSelectedHeroName =
    selectedHeroName && heroes.some((hero) => hero.npcName === selectedHeroName)
      ? selectedHeroName
      : defaultHeroName;

  return {
    effectiveSelectedHeroName,
    filteredRankings: effectiveSelectedHeroName
      ? rankings.filter(
          (ranking) => ranking.heroNpcName === effectiveSelectedHeroName,
        )
      : rankings,
  };
};

/**
 * The leaders by points, plus the member's own place when it falls outside
 * them.
 */
export const getRankingLeaders = <
  Ranking extends { totalPoints: number; memberId: number },
>(
  rankings: Ranking[],
  limit: number,
  currentMemberId: number | undefined,
) => {
  const placed = [...rankings]
    .sort((left, right) => right.totalPoints - left.totalPoints)
    .map((ranking, index) => ({ ranking, place: index + 1 }));

  return {
    leaders: placed.slice(0, limit),
    own: placed
      .slice(limit)
      .find(({ ranking }) => ranking.memberId === currentMemberId),
  };
};
