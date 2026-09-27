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
