import { DEFAULT_TIMERS_FILTERS } from "@/store/timers.store";
import type { NpcType } from "@/hooks/api/use-npcs";

type FiltersConfig = {
  minLvl: number;
  maxLvl: number;
  selectedNpcTypes: NpcType[];
  selectedColors: string[];
};

const hasCustomNpcTypes = (selectedNpcTypes: NpcType[]): boolean => {
  const defaultSelectedNpcTypes = DEFAULT_TIMERS_FILTERS.selectedNpcTypes;

  return (
    selectedNpcTypes.length !== defaultSelectedNpcTypes.length ||
    !selectedNpcTypes.every((npcType) =>
      defaultSelectedNpcTypes.includes(npcType),
    )
  );
};

export const checkFiltersActive = (
  searchText: string,
  hiddenTimersCount: number,
  filters: FiltersConfig,
): boolean => {
  if (searchText) {
    return true;
  }

  if (hiddenTimersCount > 0) {
    return true;
  }

  if (
    filters.minLvl !== DEFAULT_TIMERS_FILTERS.minLvl ||
    filters.maxLvl !== DEFAULT_TIMERS_FILTERS.maxLvl
  ) {
    return true;
  }

  if (hasCustomNpcTypes(filters.selectedNpcTypes)) {
    return true;
  }

  return filters.selectedColors.length > 0;
};
