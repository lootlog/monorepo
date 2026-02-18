export const AUTO_CLOSE_BUFFER_MS = 5 * 60 * 1000;

export const RESPAWN_AUTO_CLOSE_JOB_NAME = 'auto-close-respawn-window';

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
