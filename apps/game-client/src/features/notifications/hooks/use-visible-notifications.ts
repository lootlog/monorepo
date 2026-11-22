import { useEffect, useRef, useState } from "react";
import type { NotificationsSettings } from "@lootlog/schema/account-preferences";
import { useShallow } from "zustand/react/shallow";
import {
  isMentionNotification,
  type NotificationAutoHideState,
  type StoredNotification,
  useNotificationsStore,
} from "@/store/notifications.store";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useGameStore } from "@/store/game.store";
import {
  getNotificationSettingsKey,
  isAllowedByNotificationSettings,
  isNotificationSettingsKey,
} from "@/features/notifications/utils/get-notification-settings-key";
import { getNotificationAutoHideDeadlineMs } from "@/features/notifications/notification-auto-hide";
import { getHeroTrackerEntranceClosesAtMs } from "@/utils/notifications-and-detector/hero-tracker-notification";

interface UseVisibleNotificationsOptions {
  autoCleanup?: boolean;
}

interface UseVisibleNotificationsResult {
  notifications: StoredNotification[];
  all: StoredNotification[];
  settings: Partial<NotificationsSettings>;
}

type NotificationAutoHideStates = Record<string, NotificationAutoHideState>;

type ScheduledExpiration = {
  notificationId: string;
  expirationTimeMs: number;
};

type VisibleNotificationsInput = {
  notifications: StoredNotification[];
  notificationAutoHideByListKey: NotificationAutoHideStates;
  settings: Partial<NotificationsSettings>;
  world: string;
};

type VisibleNotificationsSelection = {
  input: VisibleNotificationsInput;
  visible: StoredNotification[];
  scheduledExpirations: ScheduledExpiration[];
  nearestExpirationTimeMs: number | null;
};

type VisibleNotificationsCacheOwner = {
  selection?: VisibleNotificationsSelection;
};

const getScheduledExpirationTimeMs = ({
  notification,
  notificationAutoHideByListKey,
  settings,
}: {
  notification: StoredNotification;
  notificationAutoHideByListKey: NotificationAutoHideStates;
  settings: Partial<NotificationsSettings>;
}) => {
  const key = getNotificationSettingsKey(notification);

  if (!isNotificationSettingsKey(key)) {
    return null;
  }

  const autoHideDeadlineMs = getNotificationAutoHideDeadlineMs({
    autoHideState: notificationAutoHideByListKey[notification.listKey],
    durationMs: (settings[key]?.autoHideTimeout ?? 0) * 1000,
    receivedAtMs: notification.receivedAtMs,
  });

  const entranceClosesAtMs =
    "heroTracker" in notification
      ? getHeroTrackerEntranceClosesAtMs(notification)
      : undefined;

  if (entranceClosesAtMs === undefined) return autoHideDeadlineMs;

  return autoHideDeadlineMs === null
    ? entranceClosesAtMs
    : Math.min(autoHideDeadlineMs, entranceClosesAtMs);
};

const isNotificationVisible = ({
  notification,
  settings,
  world,
}: {
  notification: StoredNotification;
  settings: Partial<NotificationsSettings>;
  world: string;
}) => {
  if (isMentionNotification(notification)) {
    return true;
  }

  const key = getNotificationSettingsKey(notification);

  return (
    isNotificationSettingsKey(key) &&
    settings[key] !== undefined &&
    isAllowedByNotificationSettings(notification, key, settings, world)
  );
};

const haveSameMembers = (
  previous: readonly StoredNotification[],
  next: readonly StoredNotification[],
) =>
  previous.length === next.length &&
  previous.every((notification, index) => notification === next[index]);

const isSameInput = (
  previous: VisibleNotificationsInput,
  next: VisibleNotificationsInput,
) =>
  previous.notifications === next.notifications &&
  previous.notificationAutoHideByListKey ===
    next.notificationAutoHideByListKey &&
  previous.settings === next.settings &&
  previous.world === next.world;

const selectVisibleNotifications = (
  cacheOwner: VisibleNotificationsCacheOwner,
  input: VisibleNotificationsInput,
): VisibleNotificationsSelection => {
  const cached = cacheOwner.selection;

  if (cached && isSameInput(cached.input, input)) {
    return cached;
  }

  const { notifications, notificationAutoHideByListKey, settings, world } =
    input;

  const nextVisible = notifications.filter((notification) =>
    isNotificationVisible({ notification, settings, world }),
  );

  const visible =
    cached && haveSameMembers(cached.visible, nextVisible)
      ? cached.visible
      : nextVisible;

  const scheduledExpirations: ScheduledExpiration[] = [];
  let nearestExpirationTimeMs: number | null = null;

  for (const notification of notifications) {
    const expirationTimeMs = getScheduledExpirationTimeMs({
      notification,
      notificationAutoHideByListKey,
      settings,
    });

    if (expirationTimeMs === null) continue;

    scheduledExpirations.push({
      notificationId: notification.notificationId,
      expirationTimeMs,
    });

    if (
      nearestExpirationTimeMs === null ||
      expirationTimeMs < nearestExpirationTimeMs
    ) {
      nearestExpirationTimeMs = expirationTimeMs;
    }
  }

  const selection = {
    input,
    visible,
    scheduledExpirations,
    nearestExpirationTimeMs,
  };

  cacheOwner.selection = selection;

  return selection;
};

export const useVisibleNotifications = ({
  autoCleanup = true,
}: UseVisibleNotificationsOptions = {}): UseVisibleNotificationsResult => {
  const { notifications, notificationAutoHideByListKey, removeNotifications } =
    useNotificationsStore(
      useShallow((state) => ({
        notifications: state.notifications,
        notificationAutoHideByListKey: state.notificationAutoHideByListKey,
        removeNotifications: state.removeNotifications,
      })),
    );

  const { settings } = useCurrentGameAccountNotificationSettings();
  const world = useGameStore((state) => state.game?.world ?? "unknown");
  const [cacheOwner] = useState<VisibleNotificationsCacheOwner>(() => ({}));

  const { visible, scheduledExpirations, nearestExpirationTimeMs } =
    selectVisibleNotifications(cacheOwner, {
      notifications,
      notificationAutoHideByListKey,
      settings,
      world,
    });

  const scheduledExpirationsRef = useRef(scheduledExpirations);

  useEffect(() => {
    scheduledExpirationsRef.current = scheduledExpirations;
  }, [scheduledExpirations]);

  useEffect(() => {
    if (!autoCleanup || nearestExpirationTimeMs === null) {
      return;
    }

    let timeoutId = 0;

    function arm(expirationTimeMs: number) {
      timeoutId = window.setTimeout(
        sweep,
        Math.max(1, expirationTimeMs - Date.now()),
      );
    }

    function sweep() {
      const currentTimeMs = Date.now();
      const expiredNotificationIds: string[] = [];
      let nextExpirationTimeMs: number | null = null;

      for (const {
        expirationTimeMs,
        notificationId,
      } of scheduledExpirationsRef.current) {
        if (currentTimeMs >= expirationTimeMs) {
          expiredNotificationIds.push(notificationId);

          continue;
        }

        if (
          nextExpirationTimeMs === null ||
          expirationTimeMs < nextExpirationTimeMs
        ) {
          nextExpirationTimeMs = expirationTimeMs;
        }
      }

      if (expiredNotificationIds.length > 0) {
        removeNotifications(expiredNotificationIds);
      }

      if (nextExpirationTimeMs !== null) {
        arm(nextExpirationTimeMs);
      }
    }

    function sweepWhenVisible() {
      if (document.hidden) return;

      window.clearTimeout(timeoutId);
      sweep();
    }

    arm(nearestExpirationTimeMs);
    document.addEventListener("visibilitychange", sweepWhenVisible);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", sweepWhenVisible);
    };
  }, [autoCleanup, nearestExpirationTimeMs, removeNotifications]);

  return { notifications: visible, all: notifications, settings };
};
