export const AUTO_CLOSE_BUFFER_MS = 5 * 60 * 1000;
export const AUTO_CLOSE_RESCHEDULE_DELAY_MS = 2 * 60 * 60 * 1000;
export const AUTO_CLOSE_MAX_EXTENSIONS = 12;
export const AUTO_CLOSE_EVENT_END_BUFFER_MS = 30 * 60 * 1000;

export const RESPAWN_AUTO_CLOSE_JOB_NAME = "auto-close-respawn-window";

export function buildRespawnAutoCloseJobId(
  heroId: string,
  maxSpawnTime: Date,
): string {
  return `respawn-close-${heroId}-${maxSpawnTime.getTime()}`;
}

export function getRespawnAutoCloseDelay(maxSpawnTime: Date): number {
  const delay = maxSpawnTime.getTime() - Date.now() + AUTO_CLOSE_BUFFER_MS;
  return Math.max(0, delay);
}
