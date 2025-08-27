import { useEffect, useMemo, useRef, useState } from "react";
import {
  useNotificationsStore,
  NotificationWithServers,
} from "@/store/notifications.store";
import { useGlobalStore } from "@/store/global.store";
import { getNpcTypeByWt } from "@/utils/game/npcs/get-npc-type-by-wt";
import { Notification } from "@/features/notifications/hooks/use-notifications";

export interface UseVisibleNotificationsOptions {
  autoCleanup?: boolean;
  tickMs?: number;
}

export interface UseVisibleNotificationsResult {
  notifications: NotificationWithServers[];
  all: NotificationWithServers[];
  now: number;
}

const getKey = (n: Notification) => {
  if (!n.npc || !n.npc.wt) return "message" as const;
  return getNpcTypeByWt(n.npc.wt);
};

export const useVisibleNotifications = ({
  autoCleanup = true,
  tickMs = 1000,
}: UseVisibleNotificationsOptions = {}): UseVisibleNotificationsResult => {
  const { notifications, settings, removeNotification } =
    useNotificationsStore();
  const { characterId, world } = useGlobalStore((s) => s.gameState);

  const [now, setNow] = useState(() => Date.now());

  const needsTick = useMemo(() => {
    if (!characterId) return false;
    const charSettings = settings[characterId];
    if (!charSettings) return false;
    return notifications.some((n) => {
      const key = getKey(n) as keyof typeof charSettings;
      const s = charSettings[key];
      return !!s?.autoHideTimeout && s.autoHideTimeout > 0;
    });
  }, [notifications, settings, characterId]);

  useEffect(() => {
    if (!needsTick) return;
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [needsTick, tickMs]);

  const removeRef = useRef(removeNotification);
  removeRef.current = removeNotification;

  const visible = useMemo(() => {
    if (!characterId) return [] as NotificationWithServers[];
    const charSettings = settings[characterId];
    if (!charSettings) return [] as NotificationWithServers[];

    return notifications.filter((n) => {
      const key = getKey(n) as keyof typeof charSettings;
      const s = charSettings[key];
      if (!s) return false;
      if (!s.show) return false;
      if (s.ignoreOtherWorlds && n.world !== world) return false;
      if (!s.guildIds.includes(n.guildId)) return false;
      const timeout = s.autoHideTimeout || 0;
      if (timeout > 0) {
        const createdAtMs = new Date(n.createdAt).getTime();
        if (!Number.isNaN(createdAtMs)) {
          if (now >= createdAtMs + timeout * 1000) return false;
        }
      }
      return true;
    });
  }, [notifications, settings, characterId, world, now]);

  useEffect(() => {
    if (!autoCleanup || !characterId) return;
    const charSettings = settings[characterId];
    if (!charSettings) return;
    notifications.forEach((n) => {
      const key = getKey(n) as keyof typeof charSettings;
      const s = charSettings[key];
      if (!s?.autoHideTimeout) return;
      if (s.autoHideTimeout <= 0) return;
      const createdAtMs = new Date(n.createdAt).getTime();
      if (Number.isNaN(createdAtMs)) return;
      if (now >= createdAtMs + s.autoHideTimeout * 1000) {
        removeRef.current(n.notificationId);
      }
    });
  }, [autoCleanup, now, notifications, settings, characterId]);

  return { notifications: visible, all: notifications, now };
};
