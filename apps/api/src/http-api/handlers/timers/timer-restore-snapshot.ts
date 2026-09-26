import {
  TimerHistoryAction,
  type TimerHistoryEntry,
} from "#src/timers/timers.types";

export const getTimerRestoreSnapshot = (entry: TimerHistoryEntry) => {
  if (
    entry.action !== TimerHistoryAction.DELETE ||
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
