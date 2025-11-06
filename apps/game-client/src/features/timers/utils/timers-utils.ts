import type { Timer } from "@/hooks/api/use-timers";
import type { GuildMember } from "@/hooks/api/use-guild-members";
import { NpcType } from "@/hooks/api/use-npcs";

export type TimerWithTimeLeft = Timer & {
  maxTimeLeft: number;
  minTimeLeft: number;
  members?: GuildMember[];
  mergedGuildIds?: Array<{ guildId: string; npcId: number }>;
};

const MANUAL_TIMER_MARGONEM_TYPE = 999;

const getTimerKey = (timer: Timer): string => {
  if (timer.npc.margonemType === MANUAL_TIMER_MARGONEM_TYPE) {
    return `manual_${timer.npc.name}_${timer.world}_${timer.npc.margonemType}`;
  }
  return `npc_${timer.npcId}`;
};

export const mergeTimers = (timers: Timer[]): TimerWithTimeLeft[] => {
  const map = new Map<string, TimerWithTimeLeft>();

  for (const timer of timers) {
    const key = getTimerKey(timer);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        ...timer,
        members: timer.member ? [timer.member] : [],
        minTimeLeft: 0,
        maxTimeLeft: 0,
        mergedGuildIds: [{ guildId: timer.guildId, npcId: timer.npcId }],
      });
    } else {
      if (new Date(timer.maxSpawnTime) > new Date(existing.maxSpawnTime)) {
        map.set(key, {
          ...timer,
          members: [
            ...(existing.members || []),
            ...(timer.member ? [timer.member] : []),
          ],
          minTimeLeft: 0,
          maxTimeLeft: 0,
          mergedGuildIds: [
            ...(existing.mergedGuildIds || []),
            { guildId: timer.guildId, npcId: timer.npcId },
          ],
        });
      } else {
        existing.members = [
          ...(existing.members || []),
          ...(timer.member ? [timer.member] : []),
        ];
        existing.mergedGuildIds = [
          ...(existing.mergedGuildIds || []),
          { guildId: timer.guildId, npcId: timer.npcId },
        ];
      }
    }
  }

  return Array.from(map.values());
};

export const calculateTimeLeft = (
  timers: TimerWithTimeLeft[],
): TimerWithTimeLeft[] => {
  const now = Date.now();

  return timers.map((timer) => ({
    ...timer,
    maxTimeLeft: new Date(timer.maxSpawnTime).getTime() - now,
    minTimeLeft: new Date(timer.minSpawnTime).getTime() - now,
  }));
};

export const filterTimersByRemovalTime = (
  timers: TimerWithTimeLeft[],
  removeTimerAfterMs: number,
): TimerWithTimeLeft[] => {
  return timers.filter((t) => t.maxTimeLeft > -removeTimerAfterMs);
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
  return timers.filter((t) => !hiddenTimers.includes(t.npc.name));
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
): TimerWithTimeLeft[] => {
  return [...timers].sort((a, b) => {
    const pinA = pinnedTimers.includes(a.npc.name);
    const pinB = pinnedTimers.includes(b.npc.name);
    if (pinA && !pinB) return -1;
    if (!pinA && pinB) return 1;

    const timeA = new Date(a.maxSpawnTime).getTime();
    const timeB = new Date(b.maxSpawnTime).getTime();

    return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
  });
};
