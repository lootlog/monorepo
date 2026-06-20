import { BattlesList } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-list";
import { FiltersSidebar } from "@/features/user/battle-panel/battle-panel-battles-list/components/filters-sidebar";
import { BattlesListFilterToolbar } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-list-filter-toolbar";
import {
  buildBattleListFilterLabels,
  getResetBattleListFilters,
  removeBattleListFilter,
} from "@/features/user/battle-panel/components/battle-panel-active-filter-helpers";
import { BattlePanelMobileFiltersDrawer } from "@/features/user/battle-panel/components/battle-panel-mobile-filters-drawer";
import { useQueryStates } from "nuqs";
import type { BattleFilters } from "./components/battles-list-filters";
import { getSelectedWarriorsFromSearch } from "@/features/user/battle-panel/battle-panel-statistics-search";
import {
  useBattlesControllerGetDashboardBattles,
  useBattlesControllerGetUserCharacters,
  useBattlesControllerGetUserWorlds,
} from "@/lib/api/generated/battlelog/battles/battles";
import { battleQueryParsers } from "./battle-query-parsers";
import { useState } from "react";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import type { SearchWarrior } from "@/lib/api/battlelog-types";
import { useTranslation } from "react-i18next";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";

export const BattlePanelBattlesList = () => {
  const { t } = useTranslation();
  const [queryState, setQueryState] = useQueryStates(battleQueryParsers);
  const pageSize = 20;
  const isMobile = useIsMobile();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const selectedWarriors = getSelectedWarriorsFromSearch(
    queryState.search ?? undefined,
  );

  const { data: battlesResponse, isLoading: isBattlesLoading } =
    useBattlesControllerGetDashboardBattles({
      cursor: queryState.cursor ?? undefined,
      size: pageSize,
      includeTotal: true,
      world: queryState.world ?? undefined,
      type: queryState.type ?? undefined,
      search: queryState.search ?? undefined,
      result: queryState.result ?? undefined,
      ph: queryState.ph ?? undefined,
      matchmaking: queryState.matchmaking ?? undefined,
      characterId: queryState.characterId ?? undefined,
      minLevel: queryState.minLevel,
      maxLevel: queryState.maxLevel,
    });
  const { data: charactersResponse } = useBattlesControllerGetUserCharacters();
  const { data: worldsResponse } = useBattlesControllerGetUserWorlds();
  const characters = charactersResponse?.characters;
  const worlds = worldsResponse?.worlds ?? [];

  const filters: BattleFilters = {
    world: queryState.world ?? undefined,
    type: queryState.type ?? undefined,
    search: queryState.search ?? undefined,
    result: queryState.result ?? undefined,
    ph: queryState.ph ?? undefined,
    matchmaking: queryState.matchmaking ?? undefined,
    characterId: queryState.characterId ?? undefined,
    minLevel: queryState.minLevel,
    maxLevel: queryState.maxLevel,
  };

  const handleCursorChange = (cursor: string | undefined) => {
    if (!cursor) {
      setPageIndex(0);
    } else if (cursor === battlesResponse?.pagination.nextCursor) {
      setPageIndex((currentPageIndex) => currentPageIndex + 1);
    } else if (cursor === battlesResponse?.pagination.previousCursor) {
      setPageIndex((currentPageIndex) => Math.max(currentPageIndex - 1, 0));
    }

    setQueryState({ cursor: cursor ?? null });
  };

  const handleFiltersChange = (newFilters: BattleFilters) => {
    setPageIndex(0);
    setQueryState({
      cursor: null,
      world: newFilters.world ?? null,
      type: newFilters.type ?? null,
      search: newFilters.search ?? null,
      result: newFilters.result ?? null,
      ph: newFilters.ph ?? null,
      matchmaking: newFilters.matchmaking ?? null,
      characterId: newFilters.characterId ?? null,
      minLevel: newFilters.minLevel ?? 1,
      maxLevel: newFilters.maxLevel ?? 500,
    });
  };

  const handleClearFilters = () => {
    handleFiltersChange(getResetBattleListFilters());
  };

  const handleWarriorToggle = (warrior: SearchWarrior) => {
    const isSelected = selectedWarriors.some((w) => w.name === warrior.name);
    const newSelectedWarriors = isSelected
      ? selectedWarriors.filter((w) => w.name !== warrior.name)
      : [...selectedWarriors, warrior];

    const warriorNames = newSelectedWarriors.map((w) => w.name);
    handleFiltersChange({
      ...filters,
      search: warriorNames.length > 0 ? warriorNames.join(",") : undefined,
    });
  };

  const handleCharacterChange = (value: string) => {
    const currentCharacters = filters.characterId ?? [];
    const newCharacters = currentCharacters.includes(value)
      ? currentCharacters.filter((id) => id !== value)
      : [...currentCharacters, value];

    handleFiltersChange({
      ...filters,
      characterId: newCharacters.length > 0 ? newCharacters : undefined,
    });
  };

  const handleTypeChange = (value: "solo" | "group") => {
    const currentTypes = filters.type ?? [];
    const newTypes = currentTypes.includes(value)
      ? currentTypes.filter((type) => type !== value)
      : [...currentTypes, value];

    handleFiltersChange({
      ...filters,
      type: newTypes.length > 0 ? newTypes : undefined,
    });
  };

  const handleResultChange = (value: "won" | "lost" | "flee") => {
    const currentResults = filters.result ?? [];
    const newResults = currentResults.includes(value)
      ? currentResults.filter((result) => result !== value)
      : [...currentResults, value];

    handleFiltersChange({
      ...filters,
      result: newResults.length > 0 ? newResults : undefined,
    });
  };

  const handleWorldChange = (value: string) => {
    handleFiltersChange({
      ...filters,
      world: filters.world === value ? undefined : value,
    });
  };

  const handleMinLevelChange = (value: number | undefined) => {
    handleFiltersChange({
      ...filters,
      minLevel: value,
    });
  };

  const handleMaxLevelChange = (value: number | undefined) => {
    handleFiltersChange({
      ...filters,
      maxLevel: value,
    });
  };

  const handlePhToggle = (checked: boolean) => {
    handleFiltersChange({
      ...filters,
      ph: checked ? true : undefined,
    });
  };

  const handleMatchmakingToggle = (checked: boolean) => {
    handleFiltersChange({
      ...filters,
      matchmaking: checked ? true : undefined,
    });
  };

  const activeFilterChips = buildBattleListFilterLabels({
    filters,
    formatWorld: capitalizeFirstLetter,
    selectedWarriorsCount: selectedWarriors.length,
    translate: t,
  }).map((chip) => ({
    ...chip,
    onRemove: () =>
      handleFiltersChange(removeBattleListFilter(filters, chip.id)),
  }));

  const tableToolbar = (
    <BattlesListFilterToolbar
      characters={characters ?? []}
      filters={filters}
      isMobile={isMobile}
      onCharacterChange={handleCharacterChange}
      onMatchmakingToggle={handleMatchmakingToggle}
      onMinLevelChange={handleMinLevelChange}
      onMaxLevelChange={handleMaxLevelChange}
      onMobileFiltersOpen={() => setIsMobileFiltersOpen(true)}
      onPhToggle={handlePhToggle}
      onResultChange={handleResultChange}
      onTypeChange={handleTypeChange}
      onWarriorToggle={handleWarriorToggle}
      onWorldChange={handleWorldChange}
      selectedWarriors={selectedWarriors}
      worlds={worlds}
    />
  );

  return (
    <>
      {isMobile && (
        <BattlePanelMobileFiltersDrawer
          open={isMobileFiltersOpen}
          onOpenChange={setIsMobileFiltersOpen}
          contentClassName="p-0"
          title={t("battlePanel.filters.battlesTitle")}
        >
          <FiltersSidebar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            characters={characters}
            className="h-auto w-full border-l-0 p-0"
          />
        </BattlePanelMobileFiltersDrawer>
      )}

      <div className="w-full min-w-0 flex flex-col h-full overflow-hidden bg-background/50">
        <div className="flex-1 min-w-0 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden p-3">
            <BattlesList
              activeFilterChips={activeFilterChips}
              battlesResponse={battlesResponse}
              clearFiltersLabel={t("battlePanel.filters.clear")}
              characters={characters}
              params={{
                cursor: queryState.cursor ?? undefined,
                size: pageSize,
                world: filters.world,
                type: filters.type,
                search: filters.search,
                result: filters.result,
                ph: filters.ph,
                matchmaking: filters.matchmaking,
                characterId: filters.characterId,
                minLevel: filters.minLevel,
                maxLevel: filters.maxLevel,
              }}
              onClearFilters={handleClearFilters}
              onCursorChange={handleCursorChange}
              onFiltersChange={handleFiltersChange}
              pageIndex={pageIndex}
              pageSize={pageSize}
              showPagination
              isLoading={isBattlesLoading}
              enableScrollToTop
              toolbar={tableToolbar}
            />
          </div>
        </div>
      </div>
    </>
  );
};
