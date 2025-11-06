import { BattlesList } from "@/features/battle-panel/battle-panel-battles-list/components/battles-list";
import { useQueryStates } from "nuqs";
import type { BattleFilters } from "./components/battles-list-filters";
import { useBattles } from "@/hooks/api/battle-log/use-battles";
import { useBattleCharacters } from "@/hooks/api/battle-log/use-battle-characters";
import { battleQueryParsers } from "./battle-query-parsers";

export const BattlePanelBattlesList = () => {
  const [queryState, setQueryState] = useQueryStates(battleQueryParsers);
  const pageSize = 20;

  // Fetch battles and characters
  const { data: battlesResponse, isLoading: isBattlesLoading } = useBattles({
    cursor: queryState.cursor ?? undefined,
    size: pageSize,
    includeTotal: true,
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

  const handleCursorChange = (cursor: string | undefined) => {
    setQueryState({ cursor: cursor ?? null });
  };

  const handleFiltersChange = (newFilters: BattleFilters) => {
    // Reset to first page when filters change (clear cursor)
    setQueryState({
      cursor: null,
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
          cursor: queryState.cursor ?? undefined,
          size: pageSize,
          world: filters.world,
          type: filters.type,
          search: filters.search,
          result: filters.result,
          ph: filters.ph,
          characterId: filters.characterId,
        }}
        onCursorChange={handleCursorChange}
        onFiltersChange={handleFiltersChange}
        showPagination
        showFilters
        isLoading={isBattlesLoading}
        enableScrollToTop
      />
    </div>
  );
};
