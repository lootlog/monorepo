import type { ChangeEvent, MouseEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import { NpcType } from "@/api/npcs.api";
import { clamp } from "@/lib/clamp";
import {
  DEFAULT_TIMERS_FILTERS,
  useTimerFiltersStore,
} from "@/features/timers/timer-filters.store";

export const TIMER_FILTER_NPC_TYPES = [
  NpcType.ELITE2,
  NpcType.ELITE3,
  NpcType.HERO,
  NpcType.TITAN,
] as const;

export const TIMER_FILTER_MAX_LVL = 500;

export const TIMER_FILTER_MIN_LVL = 0;

/** Reads and writes the local timer filters of one settings key; shared by both layouts' filter bars. */
export const useTimersFiltersController = (filtersKey: string) => {
  const { filters, searchText, setSearchText, setTimersFilters } =
    useTimerFiltersStore(
      useShallow((state) => ({
        filters: state.timersFilters[filtersKey] ?? DEFAULT_TIMERS_FILTERS,
        searchText: state.searchText,
        setSearchText: state.setSearchText,
        setTimersFilters: state.setTimersFilters,
      })),
    );

  const selectedNpcTypes = new Set(filters.selectedNpcTypes);
  const selectedColors = new Set(filters.selectedColors);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };

  const handleLevelChange = (
    field: "minLvl" | "maxLvl",
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const numericValue = Number(event.target.value);

    if (Number.isNaN(numericValue)) return;
    setTimersFilters(filtersKey, {
      ...filters,
      [field]: clamp(numericValue, TIMER_FILTER_MIN_LVL, TIMER_FILTER_MAX_LVL),
    });
  };

  const toggleNpcType = (npcType: NpcType) => {
    setTimersFilters(filtersKey, {
      ...filters,
      selectedNpcTypes: selectedNpcTypes.has(npcType)
        ? filters.selectedNpcTypes.filter((type) => type !== npcType)
        : [...filters.selectedNpcTypes, npcType],
    });
  };

  /** Right click keeps only that type, the usual "solo" gesture of the game. */
  const selectOnlyNpcType = (
    event: MouseEvent<HTMLButtonElement>,
    npcType: NpcType,
  ) => {
    event.preventDefault();
    setTimersFilters(filtersKey, { ...filters, selectedNpcTypes: [npcType] });
  };

  const toggleColor = (colorId: string) => {
    setTimersFilters(filtersKey, {
      ...filters,
      selectedColors: selectedColors.has(colorId)
        ? filters.selectedColors.filter((id) => id !== colorId)
        : [...filters.selectedColors, colorId],
    });
  };

  return {
    filters,
    searchText,
    selectedNpcTypes,
    selectedColors,
    handleSearchChange,
    handleLevelChange,
    toggleNpcType,
    selectOnlyNpcType,
    toggleColor,
    clearSearch: () => setSearchText(""),
  };
};
