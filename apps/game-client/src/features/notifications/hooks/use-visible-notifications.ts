import { useEffect, useMemo, useRef } from "react";
import {
  type StoredNotification,
  useNotificationsStore,
  type PartyGatheringNotification,
} from "@/store/notifications.store";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { getNpcTypeByWt } from "@lootlog/types";
import type { Notification } from "@/features/notifications/hooks/use-notifications";
import { NpcType } from "@/hooks/api/use-npcs";
import { Game } from "@/lib/game";

interface UseVisibleNotificationsOptions {
  autoCleanup?: boolean;
  tickMs?: number;
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

const getExpirationTimeMs = (
  notification: StoredNotification,
  timeoutSeconds: number,
) => {
  if (timeoutSeconds <= 0) return null;
  return notification.receivedAtMs + timeoutSeconds * 1000;
};

export const useVisibleNotifications = ({
  autoCleanup = true,
  tickMs = 1000,
}: UseVisibleNotificationsOptions = {}): UseVisibleNotificationsResult => {
  const { notifications, removeNotification } = useNotificationsStore();
  const { settings } = useCurrentGameAccountNotificationSettings();
  const world = Game.getWorldName();
  const removeRef = useRef(removeNotification);
  removeRef.current = removeNotification;

  const needsTick = useMemo(() => {
    return notifications.some((n) => {
      const key = getKey(n) as keyof typeof settings;
      const s = settings[key];
      return !!s?.autoHideTimeout && s.autoHideTimeout > 0;
    });
  }, [notifications, settings]);

  useEffect(() => {
    if (!autoCleanup || !needsTick) return;

    const id = window.setInterval(() => {
      const currentTimeMs = Date.now();

      notifications.forEach((n) => {
        const key = getKey(n) as keyof typeof settings;
        const s = settings[key];
        if (!s?.autoHideTimeout) return;
        if (s.autoHideTimeout <= 0) return;
        const expirationTimeMs = getExpirationTimeMs(n, s.autoHideTimeout);
        if (expirationTimeMs !== null && currentTimeMs >= expirationTimeMs) {
          removeRef.current(n.notificationId);
        }
      });
    }, tickMs);

    return () => clearInterval(id);
  }, [autoCleanup, needsTick, notifications, settings, tickMs]);

  const visible = useMemo(() => {
    return notifications.filter((n) => {
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
