export type EventRespawnWindowStatus = "OPEN" | "WAITING" | "OVERDUE" | "NONE";

interface EventRespawnWindowTimer {
  minSpawnTime: Date;
  maxSpawnTime: Date;
}

export function getEventRespawnWindowStatus(
  timer: EventRespawnWindowTimer | null,
  now: Date,
): EventRespawnWindowStatus {
  if (!timer) {
    return "NONE";
  }

  if (now >= timer.maxSpawnTime) {
    return "OVERDUE";
  }

  if (now >= timer.minSpawnTime) {
    return "OPEN";
  }

  return "WAITING";
}
