export const DEFAULT_RESPAWN_RANDOMNESS = 10;

export const MIN_RESP_BASE_SECONDS = 2;

export type TimerRespawn = {
  readonly respBaseSeconds: number;
  readonly respawnRandomness: number;
};

export type SpawnWindowOffsets = {
  readonly minOffsetMs: number;
  readonly maxOffsetMs: number;
};

export const HERO_TRACKER_RESP_BASE_SECONDS = 90 * 60;

export const getHeroTrackerRespBaseSeconds = (
  npcRespawnMultiplier: number,
): number => Math.round(HERO_TRACKER_RESP_BASE_SECONDS / npcRespawnMultiplier);

export const spawnWindowFromRespawn = ({
  respBaseSeconds,
  respawnRandomness,
}: TimerRespawn): SpawnWindowOffsets => {
  const baseMs = respBaseSeconds * 1000;
  const varianceMs = Math.round(baseMs * (respawnRandomness / 100));

  return { minOffsetMs: baseMs - varianceMs, maxOffsetMs: baseMs + varianceMs };
};

export const respawnFromSpawnWindow = (
  minSeconds: number,
  maxSeconds: number,
): TimerRespawn => {
  const min = Math.max(minSeconds, 0);
  const max = Math.max(maxSeconds, min);
  const respBaseSeconds = Math.round((min + max) / 2);

  return {
    respBaseSeconds,
    respawnRandomness:
      respBaseSeconds > 0
        ? Math.round(((max - min) / 2 / respBaseSeconds) * 100)
        : 0,
  };
};

export type TimerIdentity = {
  readonly guildId: string;
  readonly world: string;
  readonly timerKey: string;
};

export const isSameTimer = (
  first: TimerIdentity,
  second: TimerIdentity,
): boolean =>
  first.timerKey === second.timerKey &&
  first.guildId === second.guildId &&
  first.world === second.world;

export const upsertTimerInCollection = <Timer extends TimerIdentity>(
  timers: Timer[] | undefined,
  timer: Timer,
): Timer[] | undefined => {
  if (timers === undefined) return undefined;

  const updated = [...timers];
  const index = updated.findIndex((entry) => isSameTimer(entry, timer));

  if (index === -1) {
    updated.push(timer);
  } else {
    updated[index] = timer;
  }

  return updated;
};

export const removeTimerFromCollection = <Timer extends TimerIdentity>(
  timers: Timer[] | undefined,
  timer: TimerIdentity,
): Timer[] | undefined => timers?.filter((entry) => !isSameTimer(entry, timer));

export type TimerSpawnTimes = {
  readonly minSpawnTime: string;
  readonly maxSpawnTime: string;
  readonly deletedAt?: string | null;
  readonly entranceClosesAt?: string | null;
};

export type TimerTimeLeft = {
  readonly minTimeLeft: number;
  readonly maxTimeLeft: number;
  readonly entranceTimeLeft?: number;
};

export const getTimerTimeLeft = (
  timer: TimerSpawnTimes,
  now: number,
  toEpoch: (timestamp: string) => number = Date.parse,
): TimerTimeLeft => {
  if (timer.deletedAt) {
    const deletedTimeLeft = toEpoch(timer.deletedAt) - now;

    return { maxTimeLeft: deletedTimeLeft, minTimeLeft: deletedTimeLeft };
  }

  const timeLeft = {
    maxTimeLeft: toEpoch(timer.maxSpawnTime) - now,
    minTimeLeft: toEpoch(timer.minSpawnTime) - now,
  };

  return timer.entranceClosesAt
    ? {
        ...timeLeft,
        entranceTimeLeft: toEpoch(timer.entranceClosesAt) - now,
      }
    : timeLeft;
};

const isEntranceOpen = ({ entranceTimeLeft }: TimerTimeLeft) =>
  entranceTimeLeft !== undefined && entranceTimeLeft > 0;

export type TimerPhase =
  | "entrance"
  | "waiting"
  | "window"
  | "overdue"
  | "expired";

export const getTimerPhase = (
  timeLeft: TimerTimeLeft,
  removeTimerAfterMs: number,
): TimerPhase => {
  const { minTimeLeft, maxTimeLeft } = timeLeft;

  if (isEntranceOpen(timeLeft)) return "entrance";

  if (maxTimeLeft <= -removeTimerAfterMs) return "expired";

  if (maxTimeLeft < 0) return "overdue";

  if (minTimeLeft < 0) return "window";

  return "waiting";
};

export type TimerCountdownMode = "min" | "max";

export const getTimerCountdownMs = (
  timeLeft: TimerTimeLeft,
  countdownMode: TimerCountdownMode,
) => {
  const { minTimeLeft, maxTimeLeft, entranceTimeLeft } = timeLeft;

  if (entranceTimeLeft !== undefined && isEntranceOpen(timeLeft)) {
    return entranceTimeLeft;
  }

  return countdownMode === "max" || minTimeLeft < 0 ? maxTimeLeft : minTimeLeft;
};

export const canResetTimerNpc = (npc: { readonly type?: string | null }) =>
  npc.type !== "HERO_TRACKER";

export const getTimerSortTimeLeft = (timeLeft: TimerTimeLeft): number =>
  timeLeft.entranceTimeLeft !== undefined && isEntranceOpen(timeLeft)
    ? timeLeft.entranceTimeLeft
    : timeLeft.maxTimeLeft;

const SAME_HERO_TRACKER_ENTRANCE_TOLERANCE_MS = 60_000;

export const isSameHeroTrackerEntrance = (
  closesAtMs: number,
  otherClosesAtMs: number,
): boolean =>
  Math.abs(closesAtMs - otherClosesAtMs) <
  SAME_HERO_TRACKER_ENTRANCE_TOLERANCE_MS;

export const getTimerIdentityKey = ({
  guildId,
  world,
  timerKey,
}: TimerIdentity): string => `${guildId}:${world}:${timerKey}`;

export const getTimerRemovalAt = (
  timer: Pick<TimerSpawnTimes, "maxSpawnTime" | "deletedAt">,
  removeTimerAfterMs: number,
  toEpoch: (timestamp: string) => number = Date.parse,
): number =>
  toEpoch(timer.deletedAt ?? timer.maxSpawnTime) + removeTimerAfterMs;

export const isTimerListed = (
  timer: Pick<TimerSpawnTimes, "maxSpawnTime" | "deletedAt">,
  removeTimerAfterMs: number,
  now: number,
  toEpoch: (timestamp: string) => number = Date.parse,
): boolean => now < getTimerRemovalAt(timer, removeTimerAfterMs, toEpoch);
