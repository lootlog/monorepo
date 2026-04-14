import { useEffect, useMemo, useRef, useState } from "react";
import {
  useNotificationsStore,
  type NotificationWithServers,
  type PartyGatheringNotification,
} from "@/store/notifications.store";
import { getNpcTypeByWt } from "@lootlog/types";
import type { Notification } from "@/features/notifications/hooks/use-notifications";
import { NpcType } from "@/hooks/api/use-npcs";
import { Game } from "@/lib/game";

interface UseVisibleNotificationsOptions {
  autoCleanup?: boolean;
  tickMs?: number;
}

interface UseVisibleNotificationsResult {
  notifications: NotificationWithServers[];
  all: NotificationWithServers[];
  now: number;
}

const getKey = (n: Notification | PartyGatheringNotification) => {
  if ("type" in n && n.type === "party-gathering")
    return "party-gathering" as const;
  const notification = n as Notification;
  if (!notification.npc || !notification.npc.wt) return "message" as const;
  return getNpcTypeByWt(NpcType, notification.npc.wt);
};

export const useVisibleNotifications = ({
  autoCleanup = true,
  tickMs = 1000,
}: UseVisibleNotificationsOptions = {}): UseVisibleNotificationsResult => {
  const { notifications, settings, removeNotification } =
    useNotificationsStore();
  const characterId = String(Game.hero.id);
  const world = Game.getWorldName();

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
      if (Array.isArray(s.guildIds) && !s.guildIds.includes(n.guildId))
        return false;
      const timeout = s.autoHideTimeout ?? 0;
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
