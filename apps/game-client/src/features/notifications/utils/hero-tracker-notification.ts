import type { CreateNotificationDtoHeroTracker } from "@lootlog/client/main";

export type HeroTrackerNotificationState = CreateNotificationDtoHeroTracker;

type HeroTrackerNotificationSource = {
  heroTracker?: HeroTrackerNotificationState;
};

/** Epoch ms when an open Hero Tracker entrance closes, if it is open. */
export const getHeroTrackerEntranceClosesAtMs = (
  notification: HeroTrackerNotificationSource,
): number | undefined =>
  notification.heroTracker?.state === "open"
    ? Date.parse(notification.heroTracker.entranceClosesAt)
    : undefined;

/**
 * An opened entrance is news of its own, so it gets a separate row (and its
 * sound) instead of joining the row that announced the unclaimed tracker.
 */
export const getHeroTrackerGroupKeySuffix = (
  notification: HeroTrackerNotificationSource,
) => (notification.heroTracker?.state === "open" ? ":open" : "");
