import {
  getTimerSortTimeLeft,
  type TimerTimeLeft,
} from "@lootlog/domain/timers";
import type { UserTimerSettings } from "@lootlog/schema/timer-settings";
import { NpcType } from "@/api/npcs.api";
import type { Timer } from "@/api/timers.api";
import {
  getTimerEpoch,
  getTimerTimeLeft,
  isManualTimer,
  type TimerWithTimeLeft,
} from "@/features/timers/utils/timers-utils";
import { DEFAULT_TIMERS_FILTERS } from "@/store/timers.store";

type TimerListFilters = {
  maxLvl: number;
  minLvl: number;
  searchText: string;
  selectedColors: string[];
  selectedLists: string[];
  selectedNpcTypes: NpcType[];
  showHiddenTimers: boolean;
};

type TimerListPreferences = {
  alwaysVisibleExpiredTimers: Record<string, string[]>;
  colorFiltersEnabled: boolean;
  customLists: UserTimerSettings["customLists"];
  hiddenTimers: string[];
  pinnedTimers: string[];
  removeTimerAfterMs: number;
  sortOrder: "asc" | "desc";
  timersColors: UserTimerSettings["timersColors"];
};

type ProjectTimerListInput = {
  context: {
    guildId: string;
    isGrouping: boolean;
  };
  epoch: number;
  filters: TimerListFilters;
  preferences: TimerListPreferences;
  /** From `getListedTimers`. */
  timers: TimerWithTimeLeft[];
};

export const getTimerGroupingKey = (timer: Timer): string => {
  if (isManualTimer(timer)) {
    return `manual_${timer.npc.name}_${timer.world}_${timer.npc.margonemType}`;
  }

  return `timer_${timer.timerKey}`;
};

/** One timer per grouping key: the latest maximum spawn time, with every report's members. */
const mergeTimers = (timers: Timer[]): TimerWithTimeLeft[] => {
  const timerGroups = new Map<
    string,
    Required<
      Pick<
        TimerWithTimeLeft,
        "actorCharactersByMemberId" | "members" | "mergedGuildIds"
      >
    > & { baseTimer: Timer; maxSpawnTimeMs: number }
  >();

  for (const timer of timers) {
    const key = getTimerGroupingKey(timer);
    const maxSpawnTimeMs = getTimerEpoch(timer.maxSpawnTime);

    const group = timerGroups.get(key) ?? {
      actorCharactersByMemberId: {},
      baseTimer: timer,
      maxSpawnTimeMs,
      members: [],
      mergedGuildIds: [],
    };

    timerGroups.set(key, group);

    if (timer.member) group.members.push(timer.member);
    Object.assign(
      group.actorCharactersByMemberId,
      timer.actorCharactersByMemberId,
    );
    group.mergedGuildIds.push({
      guildId: timer.guildId,
      npcId: timer.npcId,
      timerKey: timer.timerKey,
    });

    if (maxSpawnTimeMs > group.maxSpawnTimeMs) {
      group.baseTimer = timer;
      group.maxSpawnTimeMs = maxSpawnTimeMs;
    }
  }

  return Array.from(
    timerGroups.values(),
    ({ baseTimer, actorCharactersByMemberId, members, mergedGuildIds }) => ({
      ...baseTimer,
      actorCharactersByMemberId,
      members,
      mergedGuildIds,
    }),
  );
};

type TimedTimer = TimerWithTimeLeft & TimerTimeLeft;

const calculateTimerTimes = (
  timers: TimerWithTimeLeft[],
  epoch: number,
): TimedTimer[] =>
  timers.map((timer) => ({
    ...timer,
    ...getTimerTimeLeft(timer, epoch),
  }));

const filterExpiredTimers = (
  timers: TimedTimer[],
  removeTimerAfterMs: number,
  alwaysVisibleExpiredTimers: Record<string, string[]>,
): TimedTimer[] => {
  const alwaysVisibleTimerKeysByWorld = new Map(
    Object.entries(alwaysVisibleExpiredTimers).map(([world, timerKeys]) => [
      world,
      new Set(timerKeys),
    ]),
  );

  return timers.filter((timer) => {
    const alwaysVisibleTimerKeys = alwaysVisibleTimerKeysByWorld.get(
      timer.world,
    );

    if (!isManualTimer(timer) && alwaysVisibleTimerKeys?.has(timer.timerKey)) {
      return true;
    }

    return timer.maxTimeLeft > -removeTimerAfterMs;
  });
};

/**
 * Monster names of the selected lists, or `null` when no list filters the
 * view. A selected list deleted meanwhile (here or on another device) no
 * longer filters, so a stale selection cannot hide every timer.
 */
const getSelectedListNpcNames = (
  selectedLists: string[],
  customLists: TimerListPreferences["customLists"],
): Set<string> | null => {
  const lists = selectedLists.flatMap((id) => customLists[id] ?? []);

  if (lists.length === 0) return null;

  return new Set(lists.flatMap((list) => list.npcNames));
};

const filterTimers = (
  timers: TimedTimer[],
  context: ProjectTimerListInput["context"],
  filters: TimerListFilters,
  preferences: TimerListPreferences,
  listNpcNames: Set<string> | null,
): TimedTimer[] => {
  const hiddenTimerNames = new Set(preferences.hiddenTimers);
  const selectedNpcTypes = new Set<string>(filters.selectedNpcTypes);
  const selectedColors = new Set(filters.selectedColors);
  const normalizedSearchText = filters.searchText.toLowerCase();

  return timers.filter((timer) => {
    if (!context.isGrouping && timer.guildId !== context.guildId) return false;

    if (!filters.showHiddenTimers && hiddenTimerNames.has(timer.npc.name)) {
      return false;
    }

    if (
      normalizedSearchText &&
      !timer.npc.name.toLowerCase().includes(normalizedSearchText)
    ) {
      return false;
    }

    if (
      !selectedNpcTypes.has(timer.npc.type) &&
      timer.npc.lvl !== 0 &&
      timer.npc.type !== NpcType.NPC
    ) {
      return false;
    }

    if (
      timer.npc.lvl !== 0 &&
      (timer.npc.lvl < filters.minLvl || timer.npc.lvl > filters.maxLvl)
    ) {
      return false;
    }

    if (listNpcNames && !listNpcNames.has(timer.npc.name)) return false;

    if (!preferences.colorFiltersEnabled || selectedColors.size === 0) {
      return true;
    }

    const timerColor = preferences.timersColors[timer.npc.name] ?? "white";

    return selectedColors.has(timerColor);
  });
};

const sortTimers = (
  timers: TimedTimer[],
  preferences: TimerListPreferences,
): TimedTimer[] => {
  const pinnedTimerNames = new Set(preferences.pinnedTimers);

  const sortByPinnedAndTime =
    (order: "asc" | "desc") =>
    (firstTimer: TimedTimer, secondTimer: TimedTimer) => {
      const firstPinned = pinnedTimerNames.has(firstTimer.npc.name);
      const secondPinned = pinnedTimerNames.has(secondTimer.npc.name);

      if (firstPinned && !secondPinned) return -1;

      if (!firstPinned && secondPinned) return 1;

      const firstTime = getTimerSortTimeLeft(firstTimer);
      const secondTime = getTimerSortTimeLeft(secondTimer);

      return order === "asc" ? firstTime - secondTime : secondTime - firstTime;
    };

  const activeTimers: TimedTimer[] = [];
  const expiredTimers: TimedTimer[] = [];
  const expiredAtBottomThreshold = -preferences.removeTimerAfterMs;

  for (const timer of timers) {
    if (timer.maxTimeLeft <= expiredAtBottomThreshold) {
      expiredTimers.push(timer);
    } else {
      activeTimers.push(timer);
    }
  }

  const expiredSortOrder = preferences.sortOrder === "asc" ? "desc" : "asc";

  return [
    ...activeTimers.sort(sortByPinnedAndTime(preferences.sortOrder)),
    ...expiredTimers.sort(sortByPinnedAndTime(expiredSortOrder)),
  ];
};

const hasCustomNpcTypes = (selectedNpcTypes: NpcType[]): boolean => {
  const defaultNpcTypes = new Set(DEFAULT_TIMERS_FILTERS.selectedNpcTypes);

  return (
    selectedNpcTypes.length !== defaultNpcTypes.size ||
    !selectedNpcTypes.every((npcType) => defaultNpcTypes.has(npcType))
  );
};

const areTimerFiltersActive = (
  filters: TimerListFilters,
  hiddenTimersCount: number,
  isListFilterActive: boolean,
): boolean => {
  if (filters.searchText || hiddenTimersCount > 0 || isListFilterActive) {
    return true;
  }

  if (
    filters.minLvl !== DEFAULT_TIMERS_FILTERS.minLvl ||
    filters.maxLvl !== DEFAULT_TIMERS_FILTERS.maxLvl
  ) {
    return true;
  }

  if (hasCustomNpcTypes(filters.selectedNpcTypes)) return true;

  return filters.selectedColors.length > 0;
};

const getDeduplicatedTimers = (timers: Timer[]) => {
  const timersByCompositeKey = new Map<string, Timer>();

  for (const timer of timers) {
    timersByCompositeKey.set(
      `${timer.guildId}_${timer.world}_${timer.timerKey}`,
      timer,
    );
  }

  return Array.from(timersByCompositeKey.values());
};

/** The timers the list shows, one per tile: merged across guilds when grouping. */
export const getListedTimers = (
  timers: Timer[],
  isGrouping: boolean,
): TimerWithTimeLeft[] =>
  isGrouping
    ? mergeTimers(timers)
    : getDeduplicatedTimers(timers).map((timer) => ({
        ...timer,
        members: timer.member ? [timer.member] : [],
      }));

export const projectTimerList = ({
  context,
  epoch,
  filters,
  preferences,
  timers,
}: ProjectTimerListInput) => {
  const activeTimers = filterExpiredTimers(
    calculateTimerTimes(timers, epoch),
    preferences.removeTimerAfterMs,
    preferences.alwaysVisibleExpiredTimers,
  );

  const listNpcNames = getSelectedListNpcNames(
    filters.selectedLists,
    preferences.customLists,
  );

  const sortedTimers = sortTimers(
    filterTimers(activeTimers, context, filters, preferences, listNpcNames),
    preferences,
  );

  return {
    areFiltersActive: areTimerFiltersActive(
      filters,
      filters.showHiddenTimers ? 0 : preferences.hiddenTimers.length,
      listNpcNames !== null,
    ),
    timers: sortedTimers,
  };
};
