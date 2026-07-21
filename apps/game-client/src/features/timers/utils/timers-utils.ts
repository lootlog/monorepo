import { NpcType } from "@/api/npcs.api";
import type { Timer } from "@/api/timers.api";
import type { GuildMember } from "@/types/guild-member";

export type TimerWithTimeLeft = Timer & {
  maxTimeLeft: number;
  minTimeLeft: number;
  members?: GuildMember[];
  mergedGuildIds?: Array<{
    guildId: string;
    npcId: number;
    timerKey?: string;
  }>;
};

const MANUAL_TIMER_MARGONEM_TYPE = 999;

const TIMER_EPOCH_CACHE_LIMIT = 20_000;
const timerEpochByTimestamp = new Map<string, number>();

export const clearTimerEpochCache = (): void => {
  timerEpochByTimestamp.clear();
};

const getTimerEpoch = (timestamp: string): number => {
  const cachedEpoch = timerEpochByTimestamp.get(timestamp);

  if (cachedEpoch !== undefined) {
    return cachedEpoch;
  }

  const epoch = new Date(timestamp).getTime();

  if (timerEpochByTimestamp.size >= TIMER_EPOCH_CACHE_LIMIT) {
    const oldestTimestamp = timerEpochByTimestamp.keys().next().value;

    if (oldestTimestamp !== undefined) {
      timerEpochByTimestamp.delete(oldestTimestamp);
    }
  }

  timerEpochByTimestamp.set(timestamp, epoch);
  return epoch;
};

export const isManualTimer = (timer: Timer) =>
  Number(timer.npc.margonemType) === MANUAL_TIMER_MARGONEM_TYPE;

const getTimerKey = (timer: Timer): string => {
  if (isManualTimer(timer)) {
    return `manual_${timer.npc.name}_${timer.world}_${timer.npc.margonemType}`;
  }
  return `timer_${timer.timerKey}`;
};

const getTimerMembers = (timer: Timer): GuildMember[] => {
  return timer.member ? [timer.member] : [];
};

const getTimerActorCharactersByMemberId = (
  timer: Timer,
): NonNullable<Timer["actorCharactersByMemberId"]> => {
  return timer.actorCharactersByMemberId ?? {};
};

const getMergedGuildEntry = (timer: Timer) => {
  return {
    guildId: timer.guildId,
    npcId: timer.npcId,
    timerKey: timer.timerKey,
  };
};

const createMergedTimer = (timer: Timer): TimerWithTimeLeft => {
  return {
    ...timer,
    members: getTimerMembers(timer),
    actorCharactersByMemberId: getTimerActorCharactersByMemberId(timer),
    minTimeLeft: 0,
    maxTimeLeft: 0,
    mergedGuildIds: [getMergedGuildEntry(timer)],
  };
};

export const mergeTimers = (timers: Timer[]): TimerWithTimeLeft[] => {
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
    const key = getTimerKey(timer);
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

export const calculateTimeLeft = (
  timers: TimerWithTimeLeft[],
  now = Date.now(),
): TimerWithTimeLeft[] => {
  return timers.map((timer) => {
    const deletedAt = timer.deletedAt ? getTimerEpoch(timer.deletedAt) : null;

    if (deletedAt !== null) {
      const deletedTimeLeft = deletedAt - now;

      return {
        ...timer,
        maxTimeLeft: deletedTimeLeft,
        minTimeLeft: deletedTimeLeft,
      };
    }

    return {
      ...timer,
      maxTimeLeft: getTimerEpoch(timer.maxSpawnTime) - now,
      minTimeLeft: getTimerEpoch(timer.minSpawnTime) - now,
    };
  });
};

export const filterTimersByRemovalTime = (
  timers: TimerWithTimeLeft[],
  removeTimerAfterMs: number,
): TimerWithTimeLeft[] => {
  return timers.filter((t) => t.maxTimeLeft > -removeTimerAfterMs);
};

export const filterTimersByExpiredVisibility = (
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

export const filterTimersByGuild = (
  timers: TimerWithTimeLeft[],
  guildId: string,
): TimerWithTimeLeft[] => {
  return timers.filter((t) => t.guildId === guildId);
};

export const filterTimersByVisibility = (
  timers: TimerWithTimeLeft[],
  hiddenTimers: string[],
  showHiddenTimers: boolean,
): TimerWithTimeLeft[] => {
  if (showHiddenTimers) return timers;
  const hiddenTimerNames = new Set(hiddenTimers);
  return timers.filter((timer) => !hiddenTimerNames.has(timer.npc?.name));
};

export const filterTimersBySearchText = (
  timers: TimerWithTimeLeft[],
  searchText: string,
): TimerWithTimeLeft[] => {
  if (!searchText) return timers;
  const normalizedSearchText = searchText.toLowerCase();
  return timers.filter((timer) =>
    timer.npc.name.toLowerCase().includes(normalizedSearchText),
  );
};

export const filterTimersByNpcType = (
  timers: TimerWithTimeLeft[],
  selectedNpcTypes: string[],
): TimerWithTimeLeft[] => {
  const selectedNpcTypeSet = new Set(selectedNpcTypes);
  return timers.filter(
    (timer) =>
      selectedNpcTypeSet.has(timer.npc.type) ||
      timer.npc.lvl === 0 ||
      timer.npc.type === NpcType.NPC,
  );
};

export const filterTimersByLevel = (
  timers: TimerWithTimeLeft[],
  minLvl: number,
  maxLvl: number,
): TimerWithTimeLeft[] => {
  return timers.filter(
    (t) => (t.npc.lvl >= minLvl && t.npc.lvl <= maxLvl) || t.npc.lvl === 0,
  );
};

export const filterTimersByColor = (
  timers: TimerWithTimeLeft[],
  selectedColors: string[],
  timersColors: Record<string, string>,
): TimerWithTimeLeft[] => {
  if (selectedColors.length === 0) return timers;
  const selectedColorSet = new Set(selectedColors);
  return timers.filter((timer) => {
    const timerColor = timersColors[timer.npc.name] ?? "white";
    return timerColor && selectedColorSet.has(timerColor);
  });
};

export const sortTimersByPinnedAndTime = (
  timers: TimerWithTimeLeft[],
  pinnedTimers: string[],
  sortOrder: "asc" | "desc",
  expiredTimersAtBottom = false,
  removeTimerAfterMs = 0,
): TimerWithTimeLeft[] => {
  const pinnedTimerNames = new Set(pinnedTimers);
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
    (order: "asc" | "desc") => (a: TimerWithTimeLeft, b: TimerWithTimeLeft) => {
      const pinA = pinnedTimerNames.has(a.npc.name);
      const pinB = pinnedTimerNames.has(b.npc.name);
      if (pinA && !pinB) return -1;
      if (!pinA && pinB) return 1;

      const timeA = spawnTimeByTimer.get(a);
      const timeB = spawnTimeByTimer.get(b);
      if (timeA === undefined || timeB === undefined) return 0;

      return order === "asc" ? timeA - timeB : timeB - timeA;
    };

  if (!expiredTimersAtBottom) {
    return [...timers].sort(sortByPinnedAndTime(sortOrder));
  }

  const expiredSortOrder = sortOrder === "asc" ? "desc" : "asc";

  const activeTimers: TimerWithTimeLeft[] = [];
  const expiredTimers: TimerWithTimeLeft[] = [];
  const expiredAtBottomThreshold = -removeTimerAfterMs;

  for (const timer of timers) {
    if (timer.maxTimeLeft <= expiredAtBottomThreshold) {
      expiredTimers.push(timer);
      continue;
    }

    activeTimers.push(timer);
  }

  return [
    ...activeTimers.sort(sortByPinnedAndTime(sortOrder)),
    ...expiredTimers.sort(sortByPinnedAndTime(expiredSortOrder)),
  ];
};
