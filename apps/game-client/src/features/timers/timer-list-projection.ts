import { NpcType } from "@/api/npcs.api";
import type { Timer } from "@/api/timers.api";
import { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import { getDefaultColorName } from "@/features/timers/utils/get-default-color-name";
import {
  getTimerEpoch,
  getTimerTimeLeft,
  isManualTimer,
  type TimerWithTimeLeft,
} from "@/features/timers/utils/timers-utils";
import { DEFAULT_TIMERS_FILTERS } from "@/store/timers.store";
import type { GuildMember } from "@/types/guild-member";

type TimerListFilters = {
  maxLvl: number;
  minLvl: number;
  searchText: string;
  selectedColors: string[];
  selectedNpcTypes: NpcType[];
  showHiddenTimers: boolean;
};

type CustomColor = {
  id: string;
  name: string;
  backgroundColor: string;
  borderColor: string;
};

type TimerListPreferences = {
  alwaysVisibleExpiredTimers: Record<string, string[]>;
  colorFiltersEnabled: boolean;
  customColors: Record<string, CustomColor>;
  defaultColorNames: Record<string, string>;
  hiddenTimers: string[];
  overriddenDefaultColors: Record<
    string,
    { backgroundColor: string; borderColor: string }
  >;
  pinnedTimers: string[];
  removeTimerAfterMs: number;
  sortOrder: "asc" | "desc";
  timersColors: Record<string, string>;
};

type ProjectTimerListInput = {
  context: {
    guildId: string;
    isGrouping: boolean;
  };
  epoch: number;
  filters: TimerListFilters;
  preferences: TimerListPreferences;
  timers: Timer[];
};

const getTimerMembers = (timer: Timer): GuildMember[] => {
  return timer.member ? [timer.member] : [];
};

const getTimerActorCharactersByMemberId = (
  timer: Timer,
): NonNullable<Timer["actorCharactersByMemberId"]> => {
  return timer.actorCharactersByMemberId ?? {};
};

const getMergedGuildEntry = (timer: Timer) => ({
  guildId: timer.guildId,
  npcId: timer.npcId,
  timerKey: timer.timerKey,
});

const getTimerGroupingKey = (timer: Timer): string => {
  if (isManualTimer(timer)) {
    return `manual_${timer.npc.name}_${timer.world}_${timer.npc.margonemType}`;
  }

  return `timer_${timer.timerKey}`;
};

const createMergedTimer = (timer: Timer): TimerWithTimeLeft => ({
  ...timer,
  actorCharactersByMemberId: getTimerActorCharactersByMemberId(timer),
  maxTimeLeft: 0,
  members: getTimerMembers(timer),
  mergedGuildIds: [getMergedGuildEntry(timer)],
  minTimeLeft: 0,
});

const mergeTimers = (timers: Timer[]): TimerWithTimeLeft[] => {
  const timerGroups = new Map<
    string,
    {
      actorCharactersByMemberId: NonNullable<
        Timer["actorCharactersByMemberId"]
      >;
      baseTimer: Timer;
      maxSpawnTimeMs: number;
      members: GuildMember[];
      mergedGuildIds: NonNullable<TimerWithTimeLeft["mergedGuildIds"]>;
    }
  >();

  for (const timer of timers) {
    const key = getTimerGroupingKey(timer);
    const existingGroup = timerGroups.get(key);
    const maxSpawnTimeMs = getTimerEpoch(timer.maxSpawnTime);

    if (!existingGroup) {
      timerGroups.set(key, {
        actorCharactersByMemberId: {
          ...getTimerActorCharactersByMemberId(timer),
        },
        baseTimer: timer,
        maxSpawnTimeMs,
        members: getTimerMembers(timer),
        mergedGuildIds: [getMergedGuildEntry(timer)],
      });
      continue;
    }

    existingGroup.members.push(...getTimerMembers(timer));
    Object.assign(
      existingGroup.actorCharactersByMemberId,
      getTimerActorCharactersByMemberId(timer),
    );
    existingGroup.mergedGuildIds.push(getMergedGuildEntry(timer));
    if (maxSpawnTimeMs > existingGroup.maxSpawnTimeMs) {
      existingGroup.baseTimer = timer;
      existingGroup.maxSpawnTimeMs = maxSpawnTimeMs;
    }
  }

  return Array.from(timerGroups.values(), (group) => ({
    ...createMergedTimer(group.baseTimer),
    actorCharactersByMemberId: group.actorCharactersByMemberId,
    members: group.members,
    mergedGuildIds: group.mergedGuildIds,
  }));
};

const calculateTimerTimes = (
  timers: TimerWithTimeLeft[],
  epoch: number,
): TimerWithTimeLeft[] =>
  timers.map((timer) => ({
    ...timer,
    ...getTimerTimeLeft(timer, epoch),
  }));

const filterExpiredTimers = (
  timers: TimerWithTimeLeft[],
  removeTimerAfterMs: number,
  alwaysVisibleExpiredTimers: Record<string, string[]>,
): TimerWithTimeLeft[] => {
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

const filterTimers = (
  timers: TimerWithTimeLeft[],
  context: ProjectTimerListInput["context"],
  filters: TimerListFilters,
  preferences: TimerListPreferences,
): TimerWithTimeLeft[] => {
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
    if (!preferences.colorFiltersEnabled || selectedColors.size === 0) {
      return true;
    }

    const timerColor = preferences.timersColors[timer.npc.name] ?? "white";
    return selectedColors.has(timerColor);
  });
};

const sortTimers = (
  timers: TimerWithTimeLeft[],
  preferences: TimerListPreferences,
): TimerWithTimeLeft[] => {
  const pinnedTimerNames = new Set(preferences.pinnedTimers);
  const spawnTimeByTimer = new Map<TimerWithTimeLeft, number>();
  for (const timer of timers) {
    spawnTimeByTimer.set(
      timer,
      timer.deletedAt !== null && timer.deletedAt !== undefined
        ? getTimerEpoch(timer.deletedAt)
        : getTimerEpoch(timer.maxSpawnTime),
    );
  }

  const sortByPinnedAndTime =
    (order: "asc" | "desc") =>
    (firstTimer: TimerWithTimeLeft, secondTimer: TimerWithTimeLeft) => {
      const firstPinned = pinnedTimerNames.has(firstTimer.npc.name);
      const secondPinned = pinnedTimerNames.has(secondTimer.npc.name);
      if (firstPinned && !secondPinned) return -1;
      if (!firstPinned && secondPinned) return 1;

      const firstTime = spawnTimeByTimer.get(firstTimer);
      const secondTime = spawnTimeByTimer.get(secondTimer);
      if (firstTime === undefined || secondTime === undefined) return 0;

      return order === "asc" ? firstTime - secondTime : secondTime - firstTime;
    };

  const activeTimers: TimerWithTimeLeft[] = [];
  const expiredTimers: TimerWithTimeLeft[] = [];
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
  const defaultNpcTypes = DEFAULT_TIMERS_FILTERS.selectedNpcTypes;
  return (
    selectedNpcTypes.length !== defaultNpcTypes.length ||
    !selectedNpcTypes.every((npcType) => defaultNpcTypes.includes(npcType))
  );
};

const areTimerFiltersActive = (
  filters: TimerListFilters,
  hiddenTimersCount: number,
): boolean => {
  if (filters.searchText || hiddenTimersCount > 0) return true;
  if (
    filters.minLvl !== DEFAULT_TIMERS_FILTERS.minLvl ||
    filters.maxLvl !== DEFAULT_TIMERS_FILTERS.maxLvl
  ) {
    return true;
  }
  if (hasCustomNpcTypes(filters.selectedNpcTypes)) return true;

  return filters.selectedColors.length > 0;
};

const calculateColorStatistics = (
  timers: TimerWithTimeLeft[],
  preferences: TimerListPreferences,
) => {
  const statistics: Record<
    string,
    {
      active: number;
      bgColor?: string;
      borderColor?: string;
      name: string;
      total: number;
    }
  > = {};

  for (const color of Object.keys(TIMERS_COLORS)) {
    const overriddenColor = preferences.overriddenDefaultColors[color];
    statistics[color] = {
      active: 0,
      bgColor: overriddenColor?.backgroundColor,
      borderColor: overriddenColor?.borderColor,
      name: preferences.defaultColorNames[color] ?? getDefaultColorName(color),
      total: 0,
    };
  }
  for (const color of Object.values(preferences.customColors)) {
    statistics[color.id] = {
      active: 0,
      bgColor: color.backgroundColor,
      borderColor: color.borderColor,
      name: color.name,
      total: 0,
    };
  }
  for (const color of Object.values(preferences.timersColors)) {
    if (color && statistics[color]) statistics[color].total++;
  }
  for (const timer of timers) {
    const color = preferences.timersColors[timer.npc.name];
    if (color && statistics[color]) statistics[color].active++;
  }

  return Object.entries(statistics)
    .filter(([, statistic]) => statistic.total > 0)
    .map(([color, statistic]) => ({ color, ...statistic }));
};

const getDeduplicatedTimers = (timers: Timer[], isGrouping: boolean) => {
  if (isGrouping) return timers;

  const timersByCompositeKey = new Map<string, Timer>();
  for (const timer of timers) {
    timersByCompositeKey.set(
      `${timer.guildId}_${timer.world}_${timer.timerKey}`,
      timer,
    );
  }

  return Array.from(timersByCompositeKey.values());
};

const normalizeUngroupedTimers = (timers: Timer[]): TimerWithTimeLeft[] =>
  timers.map((timer) => ({
    ...timer,
    members: timer.member ? [timer.member] : [],
    actorCharactersByMemberId:
      timer.member && timer.actorCharacter
        ? { [String(timer.member.id)]: timer.actorCharacter }
        : timer.actorCharactersByMemberId,
    minTimeLeft: 0,
    maxTimeLeft: 0,
  }));

export const getTimerListRemovalTimers = (
  timers: Timer[],
  isGrouping: boolean,
): TimerWithTimeLeft[] => {
  const deduplicatedTimers = getDeduplicatedTimers(timers, isGrouping);

  return isGrouping
    ? mergeTimers(deduplicatedTimers)
    : normalizeUngroupedTimers(deduplicatedTimers);
};

export const projectTimerList = ({
  context,
  epoch,
  filters,
  preferences,
  timers,
}: ProjectTimerListInput) => {
  const normalizedTimers = getTimerListRemovalTimers(
    timers,
    context.isGrouping,
  );
  const activeTimers = filterExpiredTimers(
    calculateTimerTimes(normalizedTimers, epoch),
    preferences.removeTimerAfterMs,
    preferences.alwaysVisibleExpiredTimers,
  );
  const sortedTimers = sortTimers(
    filterTimers(activeTimers, context, filters, preferences),
    preferences,
  );

  return {
    areFiltersActive: areTimerFiltersActive(
      filters,
      filters.showHiddenTimers ? 0 : preferences.hiddenTimers.length,
    ),
    colorStatistics: calculateColorStatistics(sortedTimers, preferences),
    timers: sortedTimers,
  };
};
