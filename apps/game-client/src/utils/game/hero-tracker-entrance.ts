export const getEntranceClosesAt = (
  killSeconds: number | undefined,
  current: number | undefined,
  now = Date.now(),
): number | undefined =>
  killSeconds !== undefined && killSeconds > 0
    ? now + killSeconds * 1000
    : current;
