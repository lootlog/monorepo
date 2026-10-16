import { useNavigate } from "@tanstack/react-router";
import type { StatisticsSearch, StatisticsSortTab } from "./statistics-search";
import { StatisticsCharacterSelect } from "./statistics-character-select";
import { StatisticsQuerySearch } from "./statistics-query-search";

type StatisticsBarSearchProps = {
  search: StatisticsSearch;
  /** A ranking tab, which a name search narrows. */
  rankingTab: StatisticsSortTab | undefined;
};

/** The leading part of the statistics filter bar: a ranking's search and the character. */
export function StatisticsBarSearch({
  search,
  rankingTab,
}: StatisticsBarSearchProps) {
  const navigate = useNavigate({ from: "/@me/statistics" });

  return (
    <>
      {rankingTab && <StatisticsQuerySearch tab={rankingTab} search={search} />}
      <StatisticsCharacterSelect
        characterId={search.characterId}
        world={search.world}
        onCharacterChange={(character) =>
          void navigate({
            search: (current) => ({
              ...current,
              characterId: character?.characterId,
              world: character ? character.world : current.world,
            }),
          })
        }
      />
    </>
  );
}
