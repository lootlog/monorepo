import { DEFAULT_TIMERS_FILTERS } from "@/hooks/api/use-timers-settings";
import type { NpcType } from "@/hooks/api/use-npcs";

type FiltersConfig = {
  minLvl: number;
  maxLvl: number;
  selectedNpcTypes: NpcType[];
  selectedColors: string[];
};

export const checkFiltersActive = (
  searchText: string,
  hiddenTimersCount: number,
  filters: FiltersConfig,
): boolean => {
  const hasSearchText = !!searchText;
  const hasHiddenTimers = hiddenTimersCount > 0;
  const hasCustomLvlRange =
    filters.minLvl !== DEFAULT_TIMERS_FILTERS.minLvl ||
    filters.maxLvl !== DEFAULT_TIMERS_FILTERS.maxLvl;
  const hasCustomNpcTypes =
    filters.selectedNpcTypes.length !==
      DEFAULT_TIMERS_FILTERS.selectedNpcTypes.length ||
    !filters.selectedNpcTypes.every((type) =>
      DEFAULT_TIMERS_FILTERS.selectedNpcTypes.includes(type),
    );
  const hasColorFilters = filters.selectedColors.length > 0;

  return (
    hasSearchText ||
    hasHiddenTimers ||
    hasCustomLvlRange ||
    hasCustomNpcTypes ||
    hasColorFilters
  );
};
