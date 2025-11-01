import {
  filterTimersByGuild,
  filterTimersByVisibility,
  filterTimersBySearchText,
  filterTimersByNpcType,
  filterTimersByLevel,
  filterTimersByColor,
  sortTimersByPinnedAndTime,
  type TimerWithTimeLeft,
} from "../utils/timers-utils";

type UseTimersFilteringProps = {
  calculatedTimers: TimerWithTimeLeft[];
  isGrouping: boolean;
  guildId: string;
  hiddenTimers: string[];
  showHiddenTimers: boolean;
  searchText: string;
  selectedNpcTypes: string[];
  minLvl: number;
  maxLvl: number;
  selectedColors: string[];
  timersColors: Record<string, string>;
  pinnedTimers: string[];
  sortOrder: "asc" | "desc";
};

export const useTimersFiltering = ({
  calculatedTimers,
  isGrouping,
  guildId,
  hiddenTimers,
  showHiddenTimers,
  searchText,
  selectedNpcTypes,
  minLvl,
  maxLvl,
  selectedColors,
  timersColors,
  pinnedTimers,
  sortOrder,
}: UseTimersFilteringProps) => {
  let filtered = calculatedTimers;

  if (!isGrouping) {
    filtered = filterTimersByGuild(filtered, guildId);
  }

  filtered = filterTimersByVisibility(filtered, hiddenTimers, showHiddenTimers);
  filtered = filterTimersBySearchText(filtered, searchText);
  filtered = filterTimersByNpcType(filtered, selectedNpcTypes);
  filtered = filterTimersByLevel(filtered, minLvl, maxLvl);
  filtered = filterTimersByColor(filtered, selectedColors, timersColors);

  const sorted = sortTimersByPinnedAndTime(filtered, pinnedTimers, sortOrder);

  return sorted;
};
