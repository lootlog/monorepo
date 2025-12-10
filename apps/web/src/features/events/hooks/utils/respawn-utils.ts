/**
 * Format seconds to a human-readable duration string (e.g., "1h 30m")
 */
export const formatRespawnDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}min`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}min`;
  }
};

/**
 * Calculate min and max spawn times from base seconds and randomness
 */
export const calculateSpawnTimes = (
  respBaseSeconds: number,
  respRandomness: number,
  fromDate: Date = new Date(),
): { minSpawnTime: Date; maxSpawnTime: Date } => {
  const baseMs = respBaseSeconds * 1000;
  const variance = Math.round(baseMs * (respRandomness / 100));

  return {
    minSpawnTime: new Date(fromDate.getTime() + baseMs - variance),
    maxSpawnTime: new Date(fromDate.getTime() + baseMs + variance),
  };
};
