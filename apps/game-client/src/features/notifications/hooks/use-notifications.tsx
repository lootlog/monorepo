import { GatewayEvent } from "@/config/gateway";
import { useSession } from "@/hooks/auth/use-session";
import { useGateway } from "@/hooks/gateway/use-gateway";
import { useGlobalStore } from "@/store/global.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { GameNpc } from "@/types/margonem/npcs";
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
  const { socket, connected } = useGateway();
  const { pushNotification } = useNotificationsStore();
  const { data: sessionData } = useSession();
  const { characterId, world } = useGlobalStore((state) => state.gameState);
  const { settings: notificationsSettings } = useNotificationsStore();
  const settings = notificationsSettings[characterId!];

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
  }, [connected]);
};
