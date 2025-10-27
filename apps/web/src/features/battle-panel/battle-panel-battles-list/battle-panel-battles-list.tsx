import { BattlesList } from "@/features/battle-panel/battle-panel-battles-list/components/battles-list";
import { useQueryStates } from "nuqs";
import type { BattleFilters } from "./components/battles-list-filters";
import { useBattles } from "@/hooks/api/battle-log/use-battles";
import { useBattleCharacters } from "@/hooks/api/battle-log/use-battle-characters";
import { battleQueryParsers } from "./battle-query-parsers";

export const BattlePanelBattlesList = () => {
  const [queryState, setQueryState] = useQueryStates(battleQueryParsers);
  const pageLimit = 20;

  // Fetch battles and characters
  const { data: battlesResponse, isLoading: isBattlesLoading } = useBattles({
    page: queryState.page,
    limit: pageLimit,
    world: queryState.world ?? undefined,
    type: queryState.type ?? undefined,
    search: queryState.search ?? undefined,
    result: queryState.result ?? undefined,
    ph: queryState.ph ?? undefined,
    characterId: queryState.characterId ?? undefined,
  });
  const { data: characters } = useBattleCharacters();

  // Build filters object
  const filters: BattleFilters = {
    world: queryState.world ?? undefined,
    type: queryState.type ?? undefined,
    search: queryState.search ?? undefined,
    result: queryState.result ?? undefined,
    ph: queryState.ph ?? undefined,
    characterId: queryState.characterId ?? undefined,
  };

  const handlePageChange = (page: number) => {
    setQueryState({ page });
  };

  const handleFiltersChange = (newFilters: BattleFilters) => {
    // Reset to first page when filters change
    setQueryState({
      page: 1,
      world: newFilters.world ?? null,
      type: newFilters.type ?? null,
      search: newFilters.search ?? null,
      result: newFilters.result ?? null,
      ph: newFilters.ph ?? null,
      characterId: newFilters.characterId ?? null,
    });
  };

  return (
    <div className="h-full">
      <BattlesList
        battlesResponse={battlesResponse}
        characters={characters}
        params={{
          page: queryState.page,
          limit: pageLimit,
          world: filters.world,
          type: filters.type,
          search: filters.search,
          result: filters.result,
          ph: filters.ph,
          characterId: filters.characterId,
        }}
        onPageChange={handlePageChange}
        onFiltersChange={handleFiltersChange}
        showPagination
        showFilters
        isLoading={isBattlesLoading}
      />
    </div>
  );
};
