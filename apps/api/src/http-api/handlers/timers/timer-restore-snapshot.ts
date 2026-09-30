import {
  TimerHistoryAction,
  type TimerHistoryEntry,
} from "#src/timers/timers.types";
import type { timerTable } from "#src/database/drizzle/schema";
import { isEqual } from "es-toolkit";

export const getTimerHistoryValues = (
  timer: typeof timerTable.$inferSelect,
) => ({
  npcId: timer.npcId,
  npc: timer.npc,
  minSpawnTime: timer.minSpawnTime,
  maxSpawnTime: timer.maxSpawnTime,
  latestRespBaseSeconds: timer.latestRespBaseSeconds,
  latestRespawnRandomness: timer.latestRespawnRandomness,
  wasReset: timer.wasReset,
  windowOpenedAt: timer.windowOpenedAt,
  timerCreatedById: timer.createdById,
  timerActorCharacterSnapshotId: timer.actorCharacterSnapshotId,
  timerActorCharacterLvl: timer.actorCharacterLvl,
});

export const getTimerHistorySnapshot = (entry: TimerHistoryEntry) => {
  if (
    entry.timerCreatedById === null ||
    entry.minSpawnTime === null ||
    entry.maxSpawnTime === null ||
    entry.latestRespBaseSeconds === null ||
    entry.latestRespawnRandomness === null
  ) {
    return undefined;
  }

  return {
    createdById: entry.timerCreatedById,
    npcId: entry.npcId,
    minSpawnTime: entry.minSpawnTime,
    maxSpawnTime: entry.maxSpawnTime,
    latestRespBaseSeconds: entry.latestRespBaseSeconds,
    latestRespawnRandomness: entry.latestRespawnRandomness,
    wasReset: entry.wasReset ?? false,
    npc: entry.npc,
    windowOpenedAt: entry.windowOpenedAt,
    actorCharacterSnapshotId: entry.timerActorCharacterSnapshotId,
    actorCharacterLvl: entry.timerActorCharacterLvl,
  };
};

export const getTimerRestoreSnapshot = (entry: TimerHistoryEntry) =>
  entry.action === TimerHistoryAction.DELETE
    ? getTimerHistorySnapshot(entry)
    : undefined;

export const isCurrentTimerReset = (
  entry: TimerHistoryEntry,
  current: typeof timerTable.$inferSelect | null | undefined,
  latest: TimerHistoryEntry | undefined,
) => {
  if (
    entry.action !== TimerHistoryAction.RESET ||
    latest?.id !== entry.id ||
    !current ||
    current.deletedAt !== null
  ) {
    return false;
  }

  const resetSnapshot = getTimerHistorySnapshot(entry);

  return (
    resetSnapshot !== undefined &&
    isEqual(resetSnapshot, {
      createdById: current.createdById,
      npcId: current.npcId,
      minSpawnTime: current.minSpawnTime,
      maxSpawnTime: current.maxSpawnTime,
      latestRespBaseSeconds: current.latestRespBaseSeconds,
      latestRespawnRandomness: current.latestRespawnRandomness,
      wasReset: current.wasReset,
      npc: current.npc,
      windowOpenedAt: current.windowOpenedAt,
      actorCharacterSnapshotId: current.actorCharacterSnapshotId,
      actorCharacterLvl: current.actorCharacterLvl,
    })
  );
};

export const getTimerResetRollbackSnapshot = (
  entry: TimerHistoryEntry,
  current: typeof timerTable.$inferSelect | null | undefined,
  latest: TimerHistoryEntry | undefined,
  previous: TimerHistoryEntry | undefined,
) => {
  if (
    !isCurrentTimerReset(entry, current, latest) ||
    !previous ||
    previous.guildId !== entry.guildId ||
    previous.world !== entry.world ||
    previous.timerKey !== entry.timerKey ||
    previous.action === TimerHistoryAction.DELETE
  ) {
    return undefined;
  }

  return getTimerHistorySnapshot(previous);
};
