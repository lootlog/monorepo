import {
  toggleBattleSearchWarrior,
  createBattleFilterHandlers,
  type BattleFilters,
} from "@/features/user/battle-panel/battle-panel-battles-list/utils/battle-filter-handlers";
import { BattlesList } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-list";
import { useResetRejectedBattlePanelCursor } from "@/features/user/battle-panel/components/use-reset-rejected-battle-panel-cursor";
import { BattlesListStackedFilters } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-list-stacked-filters";
import { BattlesListFilterToolbar } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-list-filter-toolbar";
import { WarriorSearchFilter } from "@/components/filters/warrior-search-filter";
import {
  buildBattleListFilterLabels,
  getResetBattleListFilters,
  removeBattleListFilter,
} from "@/features/user/battle-panel/components/battle-panel-active-filter-helpers";
import { useQueryStates } from "nuqs";

import {
  battlePanelBattlesSearchParsers,
  getBattlePanelCursorPaginationForCursor,
  getBattlePanelPageIndex,
  getSelectedWarriorsFromSearch,
  resetBattlePanelCursorPagination,
} from "@/features/user/battle-panel/battle-panel-search";
import {
  useBattlesControllerGetDashboardBattles,
  useBattlesControllerGetUserWorlds,
} from "@lootlog/client/battlelog";
import type { SearchWarrior } from "@/lib/api/battlelog-types";
import { useTranslation } from "react-i18next";
import { upperFirst } from "es-toolkit";

const optionalQueryValue = <Value,>(value: Value | null | undefined) =>
  value ?? undefined;

export const BattlePanelBattlesList = () => {
  const { t } = useTranslation();

  const [queryState, setQueryState] = useQueryStates(
    battlePanelBattlesSearchParsers,
  );

  const pageSize = 20;
  const pageIndex = getBattlePanelPageIndex(queryState.page);

  const selectedWarriors = getSelectedWarriorsFromSearch(
    optionalQueryValue(queryState.search),
  );

  const {
    data: battlesResponse,
    error: battlesError,
    isLoading: isBattlesLoading,
    isPlaceholderData: isBattlesRefreshing,
  } = useBattlesControllerGetDashboardBattles({
    cursor: optionalQueryValue(queryState.cursor),
    size: pageSize,
    includeTotal: true,
    world: optionalQueryValue(queryState.world),
    type: optionalQueryValue(queryState.type),
    search: optionalQueryValue(queryState.search),
    result: optionalQueryValue(queryState.result),
    ph: optionalQueryValue(queryState.ph),
    characterId: optionalQueryValue(queryState.characterId),
    startDate: optionalQueryValue(queryState.startDate),
    endDate: optionalQueryValue(queryState.endDate),
    minLevel: queryState.minLevel,
    maxLevel: queryState.maxLevel,
  });

  useResetRejectedBattlePanelCursor({
    cursor: queryState.cursor,
    error: battlesError,
    reset: () => void setQueryState(resetBattlePanelCursorPagination()),
  });

  const { data: worldsResponse } = useBattlesControllerGetUserWorlds();
  const worlds = worldsResponse?.worlds ?? [];

  const filters: BattleFilters = {
    world: optionalQueryValue(queryState.world),
    type: optionalQueryValue(queryState.type),
    search: optionalQueryValue(queryState.search),
    result: optionalQueryValue(queryState.result),
    ph: optionalQueryValue(queryState.ph),
    characterId: optionalQueryValue(queryState.characterId),
    minLevel: queryState.minLevel,
    maxLevel: queryState.maxLevel,
  };

  const handleCursorChange = (cursor: string | undefined) => {
    setQueryState(
      getBattlePanelCursorPaginationForCursor({
        currentPage: queryState.page,
        nextCursor: battlesResponse?.pagination.nextCursor,
        previousCursor: battlesResponse?.pagination.previousCursor,
        targetCursor: cursor,
      }),
    );
  };

  const handleFiltersChange = (newFilters: BattleFilters) => {
    setQueryState({
      ...resetBattlePanelCursorPagination(),
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

  const {
    handleCharacterChange,
    handleTypeChange,
    handleResultChange,
    handlePhToggle,
    handleMinLevelChange,
    handleMaxLevelChange,
    handleWorldChange,
  } = createBattleFilterHandlers(filters, handleFiltersChange);

  const handleClearFilters = () => {
    handleFiltersChange(getResetBattleListFilters());
  };

  const handleWarriorToggle = (warrior: SearchWarrior) => {
    const newSelectedWarriors = toggleBattleSearchWarrior(
      selectedWarriors,
      warrior,
    );

    const warriorNames = newSelectedWarriors.map((w) => w.name);
    handleFiltersChange({
      ...filters,
      search: warriorNames.length > 0 ? warriorNames.join(",") : undefined,
    });
  };

  const activeFilterChips = buildBattleListFilterLabels({
    filters,
    formatWorld: upperFirst,
    selectedWarriorsCount: selectedWarriors.length,
    translate: t,
  }).map((chip) => ({
    ...chip,
    onRemove: () =>
      handleFiltersChange(removeBattleListFilter(filters, chip.id)),
  }));

  const tableToolbar = (
    <BattlesListFilterToolbar
      filters={filters}
      onCharacterChange={handleCharacterChange}
      onMinLevelChange={handleMinLevelChange}
      onMaxLevelChange={handleMaxLevelChange}
      onPhToggle={handlePhToggle}
      onResultChange={handleResultChange}
      onTypeChange={handleTypeChange}
      onWorldChange={handleWorldChange}
      worlds={worlds}
    />
  );

  return (
    <BattlesList
      activeFilterChips={activeFilterChips}
      battlesResponse={battlesResponse}
      clearFiltersLabel={t("battlePanel.filters.clear")}
      params={{
        cursor: optionalQueryValue(queryState.cursor),
        size: pageSize,
        world: filters.world,
        type: filters.type,
        search: filters.search,
        result: filters.result,
        ph: filters.ph,
        characterId: filters.characterId,
        startDate: optionalQueryValue(queryState.startDate),
        endDate: optionalQueryValue(queryState.endDate),
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
      isRefreshing={isBattlesRefreshing}
      enableScrollToTop
      search={
        <WarriorSearchFilter
          selectedWarriors={selectedWarriors}
          onWarriorToggle={handleWarriorToggle}
        />
      }
      toolbar={tableToolbar}
      stackedFilters={
        <BattlesListStackedFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          worlds={worlds}
        />
      }
    />
  );
};
