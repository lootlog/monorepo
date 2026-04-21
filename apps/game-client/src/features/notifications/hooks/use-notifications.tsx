import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { isNotificationMuted } from "@/features/notifications/utils/notification-mutes";
import { useSession } from "@/hooks/auth/use-session";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useCurrentUserNotificationMutes } from "@/hooks/use-current-user-notification-mutes";
import { Game } from "@/lib/game";
import { useNotificationsStore } from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import type { GameNpc } from "@lootlog/margonem";
import { useEffect, useRef } from "react";
import { getNpcTypeByWt } from "@lootlog/types";
import { NpcType } from "@/api/npcs.api";
import { useSoundPlayback } from "@/hooks/use-sound-playback";

export type Notification = {
  npc?: GameNpc & { location: string; name: string };
  message?: string;
  discordId: string;
  guildId: string;
  notificationId: string;
  world: string;
  createdAt: string;
  isGatheringParty?: boolean;
};

const MAX_PENDING_NOTIFICATIONS = 100;

const getNotificationType = (n: Notification) => {
  if (!n.npc || !n.npc.wt) return "message" as const;
  return getNpcTypeByWt(NpcType, n.npc.wt);
};

export const useNotifications = () => {
  const { connected, socket } = useSocket();
  const pushNotification = useNotificationsStore(
    (state) => state.pushNotification,
  );
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { data: sessionData } = useSession();
  const { accountId, isReady, settings } =
    useCurrentGameAccountNotificationSettings();
  const { isReady: areMutesReady, mutes } = useCurrentUserNotificationMutes();
  const world = Game.getWorldName();

  const { playSound } = useSoundPlayback();

  const settingsRef = useRef(settings);
  const isReadyRef = useRef(isReady);
  const mutesRef = useRef(mutes);
  const areMutesReadyRef = useRef(areMutesReady);
  const sessionDataRef = useRef(sessionData);
  const worldRef = useRef(world);
  const pendingNotificationsRef = useRef<Notification[]>([]);
  const previousAccountIdRef = useRef<string | null>(accountId);
  const processNotificationRef = useRef<(data: Notification) => void>(
    () => undefined,
  );

  sessionDataRef.current = sessionData;
  isReadyRef.current = isReady;
  mutesRef.current = mutes;
  areMutesReadyRef.current = areMutesReady;
  settingsRef.current = settings;
  worldRef.current = world;
  processNotificationRef.current = (data: Notification) => {
    if (data.discordId === sessionDataRef.current?.user?.discordId) return;

    if (isNotificationMuted(data, mutesRef.current)) {
      return;
    }

    const currentSettings = settingsRef.current;
    const notificationType = getNotificationType(data);
    const typeSettings =
      currentSettings[notificationType as keyof typeof currentSettings];

    if (!typeSettings) {
      setOpen("notifications", true);
      pushNotification({ ...data, servers: [data.guildId] });
      return;
    }

    if (!typeSettings.show) return;
    if (typeSettings.ignoreOtherWorlds && data.world !== worldRef.current)
      return;
    if (!typeSettings.guildIds.includes(data.guildId)) return;

    setOpen("notifications", true);
    pushNotification({ ...data, servers: [data.guildId] });

    if (typeSettings.sound) {
      playSound("notifications", notificationType);
    }
  };

  useEffect(() => {
    if (
      previousAccountIdRef.current !== null &&
      previousAccountIdRef.current !== accountId
    ) {
      pendingNotificationsRef.current = [];
    }

    previousAccountIdRef.current = accountId;
  }, [accountId]);

  useEffect(() => {
    if (!socket || !connected) return;

    const handler = (data: Notification) => {
      if (!isReadyRef.current || !areMutesReadyRef.current) {
        if (
          pendingNotificationsRef.current.length >= MAX_PENDING_NOTIFICATIONS
        ) {
          pendingNotificationsRef.current.shift();
        }

        pendingNotificationsRef.current.push(data);
        return;
      }

      processNotificationRef.current(data);
    };

    socket.on(GatewayEvent.NOTIFICATION, handler);

    return () => {
      socket.off(GatewayEvent.NOTIFICATION, handler);
    };
  }, [connected, socket]);

  useEffect(() => {
    if (
      !isReady ||
      !areMutesReady ||
      pendingNotificationsRef.current.length === 0
    ) {
      return;
    }

    const pendingNotifications = [...pendingNotificationsRef.current];
    pendingNotificationsRef.current = [];

    pendingNotifications.forEach((notification) => {
      processNotificationRef.current(notification);
    });
  }, [areMutesReady, isReady]);
};
