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

  if (settings.guildIds?.includes(notification.guildId) === false) {
    return false;
  }

  return true;
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

/**
 * Derives the visible list and the auto-hide schedule from the store
 * selection. The visible array keeps its identity while its members are the
 * same references in the same order, so the list and its memoized rows can
 * skip work when only unrelated store state (a paused deadline, another
 * world's notification) changed.
 */
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
  const removeRef = useRef(removeNotifications);

  const { visible, scheduledExpirations, nearestExpirationTimeMs } =
    selectVisibleNotifications(cacheOwner, {
      notifications,
      notificationAutoHideByListKey,
      settings,
      world,
    });

  const scheduledExpirationsRef = useRef(scheduledExpirations);

  useEffect(() => {
    removeRef.current = removeNotifications;
    scheduledExpirationsRef.current = scheduledExpirations;
  }, [removeNotifications, scheduledExpirations]);

  // The timer is armed for the nearest deadline only; when it fires it reads
  // the latest schedule from the ref, so notifications arriving with later
  // deadlines do not tear down and re-arm the timeout.
  useEffect(() => {
    if (!autoCleanup || nearestExpirationTimeMs === null) {
      return;
    }

    const timeoutId = window.setTimeout(
      () => {
        const currentTimeMs = Date.now();

        const expiredNotificationIds = scheduledExpirationsRef.current.flatMap(
          ({ expirationTimeMs, notificationId }) => {
            if (currentTimeMs < expirationTimeMs) {
              return [];
            }

            return [notificationId];
          },
        );

        removeRef.current(expiredNotificationIds);
      },
      Math.max(0, nearestExpirationTimeMs - Date.now()),
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoCleanup, nearestExpirationTimeMs]);

  return { notifications: visible, all: notifications, settings };
};
