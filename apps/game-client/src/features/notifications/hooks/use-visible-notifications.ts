import { useEffect, useRef } from "react";
import {
  type MentionNotification,
  type StoredNotification,
  useNotificationsStore,
} from "@/store/notifications.store";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { Game } from "@/lib/game";
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
}

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
  notificationAutoHideByListKey: Record<
    string,
    {
      deadlineMs: number | null;
      pausedRemainingMs: number | null;
      durationMs: number;
    }
  >;
  settings: Record<string, { autoHideTimeout?: number }>;
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

export const useVisibleNotifications = ({
  autoCleanup = true,
}: UseVisibleNotificationsOptions = {}): UseVisibleNotificationsResult => {
  const { notifications, notificationAutoHideByListKey, removeNotification } =
    useNotificationsStore();
  const { settings } = useCurrentGameAccountNotificationSettings();
  const world = Game.getWorldName();
  const removeRef = useRef(removeNotification);
  removeRef.current = removeNotification;

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
    const timeoutId = window.setTimeout(
      () => {
        const currentTimeMs = Date.now();

        scheduledExpirations.forEach(({ expirationTimeMs, notification }) => {
          if (currentTimeMs >= expirationTimeMs) {
            removeRef.current(notification.notificationId);
          }
        });
      },
      Math.max(0, nearestExpirationTimeMs - Date.now()),
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoCleanup, notificationAutoHideByListKey, notifications, settings]);

  const visible = notifications.filter((n) => {
    if (isMentionNotification(n)) {
      return true;
    }

    const key = getNotificationSettingsKey(n);

    if (!isNotificationSettingsKey(key)) {
      return false;
    }

    const s = settings[key];
    if (!s) return false;
    if (!s.show) return false;
    if (s.ignoreOtherWorlds && n.world !== world) return false;
    if (Array.isArray(s.guildIds) && !s.guildIds.includes(n.guildId))
      return false;
    return true;
  });

  return { notifications: visible, all: notifications };
};
