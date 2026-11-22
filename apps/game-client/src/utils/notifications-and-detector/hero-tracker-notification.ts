type HeroTrackerNotificationState =
  | { state: "unclaimed" }
  | { state: "open"; entranceClosesAt: string };

type HeroTrackerNotificationSource = {
  heroTracker?: HeroTrackerNotificationState;
};

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

export const getHeroTrackerEntranceClosesAtMs = (
  notification: HeroTrackerNotificationSource,
): number | undefined =>
  notification.heroTracker?.state === "open"
    ? Date.parse(notification.heroTracker.entranceClosesAt)
    : undefined;

export const getHeroTrackerGroupKeySuffix = (
  notification: HeroTrackerNotificationSource,
) => (notification.heroTracker?.state === "open" ? ":open" : "");
