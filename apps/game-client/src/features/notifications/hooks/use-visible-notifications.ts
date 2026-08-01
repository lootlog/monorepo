import { useEffect, useRef } from "react";
import type { NotificationsSettings } from "@lootlog/types";
import { useShallow } from "zustand/react/shallow";
import {
  type MentionNotification,
  type StoredNotification,
  useNotificationsStore,
} from "@/store/notifications.store";
import { setMeasuredTimeout } from "@/lib/performance-monitoring/measured-callback";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useGameStore } from "@/store/game.store";
import {
  getNotificationSettingsKey,
  isNotificationSettingsKey,
} from "@/features/notifications/utils/get-notification-settings-key";

interface UseVisibleNotificationsOptions {
  autoCleanup?: boolean;
}

interface UseVisibleNotificationsResult {
  notifications: StoredNotification[];
  all: StoredNotification[];
  settings: Partial<NotificationsSettings>;
}

type NotificationAutoHideStates = Record<
  string,
  {
    deadlineMs: number | null;
    pausedRemainingMs: number | null;
    durationMs: number;
  }
>;

const isMentionNotification = (
  notification: StoredNotification,
): notification is StoredNotification & MentionNotification => {
  return "type" in notification && notification.type === "chat-mention";
};

const getExpirationTimeMs = (
  notification: StoredNotification,
  timeoutSeconds: number,
) => {
  if (timeoutSeconds <= 0) return null;
  return notification.receivedAtMs + timeoutSeconds * 1000;
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

  const notificationSettings = settings[key];

  if (!notificationSettings?.autoHideTimeout) {
    return null;
  }

  if (notificationSettings.autoHideTimeout <= 0) {
    return null;
  }

  const autoHideState = notificationAutoHideByListKey[notification.listKey];

  if (autoHideState && autoHideState.pausedRemainingMs !== null) {
    return null;
  }

  return (
    autoHideState?.deadlineMs ??
    getExpirationTimeMs(notification, notificationSettings.autoHideTimeout)
  );
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

  if (!isNotificationSettingsKey(key)) {
    return false;
  }

  const notificationSettings = settings[key];

  if (!notificationSettings) {
    return false;
  }

  if (!notificationSettings.show) {
    return false;
  }

  if (notificationSettings.ignoreOtherWorlds && notification.world !== world) {
    return false;
  }

  if (
    Array.isArray(notificationSettings.guildIds) &&
    !notificationSettings.guildIds.includes(notification.guildId)
  ) {
    return false;
  }

  return true;
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
  const removeRef = useRef(removeNotifications);

  useEffect(() => {
    removeRef.current = removeNotifications;
  }, [removeNotifications]);

  useEffect(() => {
    if (!autoCleanup) {
      return;
    }

    const scheduledExpirations = notifications
      .map((notification) => ({
        notification,
        expirationTimeMs: getScheduledExpirationTimeMs({
          notification,
          notificationAutoHideByListKey,
          settings,
        }),
      }))
      .filter(
        (
          entry,
        ): entry is {
          notification: StoredNotification;
          expirationTimeMs: number;
        } => entry.expirationTimeMs !== null,
      );

    if (scheduledExpirations.length === 0) {
      return;
    }

    const nearestExpirationTimeMs = Math.min(
      ...scheduledExpirations.map((entry) => entry.expirationTimeMs),
    );
    const timeoutId = setMeasuredTimeout(
      "notifications.auto-hide",
      () => {
        const currentTimeMs = Date.now();

        const expiredNotificationIds = scheduledExpirations.flatMap(
          ({ expirationTimeMs, notification }) => {
            if (currentTimeMs < expirationTimeMs) {
              return [];
            }

            return [notification.notificationId];
          },
        );

        removeRef.current(expiredNotificationIds);
      },
      Math.max(0, nearestExpirationTimeMs - Date.now()),
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoCleanup, notificationAutoHideByListKey, notifications, settings]);

  const visible = notifications.filter((notification) =>
    isNotificationVisible({ notification, settings, world }),
  );

  return { notifications: visible, all: notifications, settings };
};
