import type { NotificationAutoHideState } from "@/store/notifications.store";

type NotificationAutoHideTiming = {
  autoHideState?: NotificationAutoHideState;
  durationMs: number;
  receivedAtMs: number;
};

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
