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

const mergeTimerCollections = (
  existingTimer: TimerWithTimeLeft,
  timer: Timer,
) => {
  return {
    members: [...(existingTimer.members ?? []), ...getTimerMembers(timer)],
    actorCharactersByMemberId: {
      ...(existingTimer.actorCharactersByMemberId ?? {}),
      ...getTimerActorCharactersByMemberId(timer),
    },
    mergedGuildIds: [
      ...(existingTimer.mergedGuildIds ?? []),
      getMergedGuildEntry(timer),
    ],
  };
};

export const mergeTimers = (timers: Timer[]): TimerWithTimeLeft[] => {
  const map = new Map<string, TimerWithTimeLeft>();

  for (const timer of timers) {
    const key = getTimerKey(timer);
    const existingTimer = map.get(key);

    if (!existingTimer) {
      map.set(key, createMergedTimer(timer));
      continue;
    }

    const mergedCollections = mergeTimerCollections(existingTimer, timer);

    if (new Date(timer.maxSpawnTime) > new Date(existingTimer.maxSpawnTime)) {
      map.set(key, {
        ...createMergedTimer(timer),
        ...mergedCollections,
      });
      continue;
    }

    map.set(key, {
      ...existingTimer,
      ...mergedCollections,
    });
  }

  return Array.from(map.values());
};

export const calculateTimeLeft = (
  timers: TimerWithTimeLeft[],
): TimerWithTimeLeft[] => {
  const now = Date.now();

  return timers.map((timer) => {
    const deletedAt = timer.deletedAt
      ? new Date(timer.deletedAt).getTime()
      : null;

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
      maxTimeLeft: new Date(timer.maxSpawnTime).getTime() - now,
      minTimeLeft: new Date(timer.minSpawnTime).getTime() - now,
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
  return timers.filter((timer) => {
    const alwaysVisibleTimerKeys =
      alwaysVisibleExpiredTimers[timer.world] ?? [];

    if (
      !isManualTimer(timer) &&
      alwaysVisibleTimerKeys.includes(timer.timerKey)
    ) {
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
  return timers.filter((t) => !hiddenTimers.includes(t.npc?.name));
};

export const filterTimersBySearchText = (
  timers: TimerWithTimeLeft[],
  searchText: string,
): TimerWithTimeLeft[] => {
  if (!searchText) return timers;
  return timers.filter((t) =>
    t.npc.name.toLowerCase().includes(searchText.toLowerCase()),
  );
};

export const filterTimersByNpcType = (
  timers: TimerWithTimeLeft[],
  selectedNpcTypes: string[],
): TimerWithTimeLeft[] => {
  return timers.filter(
    (t) =>
      selectedNpcTypes.includes(t.npc.type) ||
      t.npc.lvl === 0 ||
      t.npc.type === NpcType.NPC,
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
  return timers.filter((t) => {
    const timerColor = timersColors[t.npc.name] ?? "white";
    return timerColor && selectedColors.includes(timerColor);
  });
};

export const sortTimersByPinnedAndTime = (
  timers: TimerWithTimeLeft[],
  pinnedTimers: string[],
  sortOrder: "asc" | "desc",
  expiredTimersAtBottom = false,
  removeTimerAfterMs = 0,
): TimerWithTimeLeft[] => {
  const sortByPinnedAndTime =
    (order: "asc" | "desc") => (a: TimerWithTimeLeft, b: TimerWithTimeLeft) => {
      const pinA = pinnedTimers.includes(a.npc.name);
      const pinB = pinnedTimers.includes(b.npc.name);
      if (pinA && !pinB) return -1;
      if (!pinA && pinB) return 1;

      const timeA = new Date(a.deletedAt ?? a.maxSpawnTime).getTime();
      const timeB = new Date(b.deletedAt ?? b.maxSpawnTime).getTime();

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
