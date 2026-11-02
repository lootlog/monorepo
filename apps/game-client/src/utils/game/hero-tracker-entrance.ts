/**
 * When a Hero Tracker's colossus entrance closes. Margonem sends the
 * remaining seconds once a player claims the tracker and 0 or nothing in
 * other updates, which keep the countdown already running.
 */
export const getEntranceClosesAt = (
  killSeconds: number | undefined,
  current: number | undefined,
  now = Date.now(),
): number | undefined =>
  killSeconds !== undefined && killSeconds > 0
    ? now + killSeconds * 1000
    : current;
