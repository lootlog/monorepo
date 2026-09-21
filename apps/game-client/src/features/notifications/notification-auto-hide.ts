import type { NotificationAutoHideState } from "@/store/notifications.store";

type NotificationAutoHideTiming = {
  autoHideState?: NotificationAutoHideState;
  durationMs: number;
  receivedAtMs: number;
};

/**
 * The one deadline the countdown ring and the cleanup sweep share.
 *
 * A notification presented before its category settings loaded carries no
 * stored auto-hide state, so the deadline falls back to the moment it arrived
 * rather than to "now": otherwise the ring restarts a full countdown that the
 * sweep does not honour and the row vanishes mid-animation. Returns null while
 * the countdown is paused or auto-hide is off.
 */
export const getNotificationAutoHideDeadlineMs = ({
  autoHideState,
  durationMs,
  receivedAtMs,
}: NotificationAutoHideTiming) => {
  if (durationMs <= 0) {
    return null;
  }

  if (autoHideState && autoHideState.pausedRemainingMs !== null) {
    return null;
  }

  return autoHideState?.deadlineMs ?? receivedAtMs + durationMs;
};
