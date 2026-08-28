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

export const getTimerEpoch = (timestamp: string): number => {
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

export const getTimerTimeLeft = (
  timer: Timer,
  now = Date.now(),
): Pick<TimerWithTimeLeft, "maxTimeLeft" | "minTimeLeft"> => {
  const deletedAt = timer.deletedAt ? getTimerEpoch(timer.deletedAt) : null;

  if (deletedAt !== null) {
    const deletedTimeLeft = deletedAt - now;

    return {
      maxTimeLeft: deletedTimeLeft,
      minTimeLeft: deletedTimeLeft,
    };
  }

  return {
    maxTimeLeft: getTimerEpoch(timer.maxSpawnTime) - now,
    minTimeLeft: getTimerEpoch(timer.minSpawnTime) - now,
  };
};

export const filterTimersByRemovalTime = (
  timers: TimerWithTimeLeft[],
  removeTimerAfterMs: number,
): TimerWithTimeLeft[] => {
  return timers.filter((t) => t.maxTimeLeft > -removeTimerAfterMs);
};
