import type { CreateNotificationDtoHeroTracker } from "@lootlog/client/main";

export type HeroTrackerNotificationState = CreateNotificationDtoHeroTracker;

type HeroTrackerNotificationSource = {
  heroTracker?: HeroTrackerNotificationState;
};

/** Milliseconds until an open Hero Tracker entrance closes, if it is open. */
export const getHeroTrackerEntranceRemainingMs = (
  notification: HeroTrackerNotificationSource,
  now = Date.now(),
): number | undefined =>
  notification.heroTracker?.state === "open"
    ? Date.parse(notification.heroTracker.entranceClosesAt) - now
    : undefined;

/**
 * An opened entrance is news of its own, so it gets a separate row (and its
 * sound) instead of joining the row that announced the unclaimed tracker.
 */
export const getHeroTrackerGroupKeySuffix = (
  notification: HeroTrackerNotificationSource,
) => (notification.heroTracker?.state === "open" ? ":open" : "");
