import { BattlesList } from "@/features/battle-panel/battle-panel-battles-list/components/battles-list";
import { useQueryStates } from "nuqs";
import type { BattleFilters } from "./components/battles-list-filters";
import { useBattles } from "@/hooks/api/battle-log/use-battles";
import { useBattleCharacters } from "@/hooks/api/battle-log/use-battle-characters";
import { battleQueryParsers } from "./battle-query-parsers";
import { useBattleFiltersStore } from "@/store/battle-filters.store";
import { useEffect } from "react";

export const BattlePanelBattlesList = () => {
  const [queryState, setQueryState] = useQueryStates(battleQueryParsers);
  const pageSize = 20;

  const currentCharacterId = useBattleFiltersStore(
    (state) => state.currentCharacterId,
  );
  const setCurrentCharacterId = useBattleFiltersStore(
    (state) => state.setCurrentCharacterId,
  );
  const updateFilters = useBattleFiltersStore((state) => state.updateFilters);

  useEffect(() => {
    if (queryState.characterId && queryState.characterId.length > 0) {
      const firstCharId = queryState.characterId[0];
      if (firstCharId !== currentCharacterId) {
        setCurrentCharacterId(firstCharId);
      }
    }
  }, [queryState.characterId, currentCharacterId, setCurrentCharacterId]);

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
    minLevel: queryState.minLevel,
    maxLevel: queryState.maxLevel,
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
    minLevel: queryState.minLevel,
    maxLevel: queryState.maxLevel,
  };

  const handleCursorChange = (cursor: string | undefined) => {
    setQueryState({ cursor: cursor ?? null });
  };

  const handleFiltersChange = (newFilters: BattleFilters) => {
    updateFilters(currentCharacterId, {
      world: newFilters.world,
      type: newFilters.type,
      result: newFilters.result,
      ph: newFilters.ph,
      minLevel: newFilters.minLevel,
      maxLevel: newFilters.maxLevel,
    });

    setQueryState({
      cursor: null,
      world: newFilters.world ?? null,
      type: newFilters.type ?? null,
      search: newFilters.search ?? null,
      result: newFilters.result ?? null,
      ph: newFilters.ph ?? null,
      characterId: newFilters.characterId ?? null,
      minLevel: newFilters.minLevel ?? 1,
      maxLevel: newFilters.maxLevel ?? 500,
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
          minLevel: filters.minLevel,
          maxLevel: filters.maxLevel,
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
