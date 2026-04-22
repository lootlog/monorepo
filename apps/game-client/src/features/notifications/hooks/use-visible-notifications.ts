import { useEffect, useMemo, useRef } from "react";
import {
  type MentionNotification,
  type StoredNotification,
  useNotificationsStore,
  type PartyGatheringNotification,
} from "@/store/notifications.store";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { getNpcTypeByWt } from "@lootlog/types";
import type { Notification } from "@/features/notifications/hooks/use-notifications";
import { NpcType } from "@/api/npcs.api";
import { Game } from "@/lib/game";

interface UseVisibleNotificationsOptions {
  autoCleanup?: boolean;
}

interface UseVisibleNotificationsResult {
  notifications: StoredNotification[];
  all: StoredNotification[];
}

const getKey = (n: Notification | PartyGatheringNotification) => {
  if ("type" in n && n.type === "party-gathering")
    return "party-gathering" as const;
  const notification = n as Notification;
  if (!notification.npc || !notification.npc.wt) return "message" as const;
  return getNpcTypeByWt(NpcType, notification.npc.wt);
};

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
  const key = getKey(notification);
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

  const visible = useMemo(() => {
    return notifications.filter((n) => {
      if (isMentionNotification(n)) {
        return true;
      }

      const key = getKey(n) as keyof typeof settings;
      const s = settings[key];
      if (!s) return false;
      if (!s.show) return false;
      if (s.ignoreOtherWorlds && n.world !== world) return false;
      if (Array.isArray(s.guildIds) && !s.guildIds.includes(n.guildId))
        return false;
      return true;
    });
  }, [notifications, settings, world]);

  return { notifications: visible, all: notifications };
};
