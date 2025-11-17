import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useSession } from "@/hooks/auth/use-session";
import { Game } from "@/lib/game";
import { useNotificationsStore } from "@/store/notifications.store";
import type { GameNpc } from "@/types/margonem/npcs";
import { useEffect, useRef } from "react";

export type Notification = {
  npc?: GameNpc & { location: string; name: string };
  message?: string;
  discordId: string;
  guildId: string;
  notificationId: string;
  world: string;
  createdAt: string;
};

export const useNotifications = () => {
  const { connected, socket } = useSocket();
  const pushNotification = useNotificationsStore(
    (state) => state.pushNotification,
  );
  const { data: sessionData } = useSession();
  const characterId = String(Game.hero.id);
  const { settings: notificationsSettings } = useNotificationsStore();
  const settings = notificationsSettings[characterId];

  const settingsRef = useRef(settings);
  const sessionDataRef = useRef(sessionData);

  sessionDataRef.current = sessionData;
  settingsRef.current = settings;

  useEffect(() => {
    if (socket?.hasListeners(GatewayEvent.NOTIFICATION) || !connected) return;

    socket?.on(GatewayEvent.NOTIFICATION, (data: Notification) => {
      // @ts-ignore
      if (data.discordId === sessionDataRef.current?.user.discordId) return;

      pushNotification({ ...data, servers: [data.guildId] });
    });
  }, [connected, socket, pushNotification]);
};
