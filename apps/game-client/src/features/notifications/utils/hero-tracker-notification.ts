/** As delivered: the API stamps an open entrance's close time on its clock. */
export type HeroTrackerNotificationState =
  | { state: "unclaimed" }
  | { state: "open"; entranceClosesAt: string };

type HeroTrackerNotificationSource = {
  heroTracker?: HeroTrackerNotificationState;
};

/**
 * Moves an open entrance's close time from the server clock onto this
 * device's clock: the time left when the server sent it starts now, so a
 * skewed local clock neither drops nor stretches the countdown.
 */
export const toLocalEntranceDeadline = <
  T extends HeroTrackerNotificationSource & { createdAt: string },
>(
  notification: T,
  now = Date.now(),
): T =>
  notification.heroTracker?.state === "open"
    ? {
        ...notification,
        heroTracker: {
          state: "open",
          entranceClosesAt: new Date(
            now +
              Date.parse(notification.heroTracker.entranceClosesAt) -
              Date.parse(notification.createdAt),
          ).toISOString(),
        },
      }
    : notification;

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
