import { GatewayEvent } from "@/config/gateway";
import { useSession } from "@/hooks/auth/use-session";
import { useGateway } from "@/hooks/gateway/use-gateway";
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
};

export const useNotifications = () => {
  const { socket, connected } = useGateway();
  const { pushNotification } = useNotificationsStore();
  const { data: sessionData } = useSession();

  const sessionDataRef = useRef(sessionData);

  sessionDataRef.current = sessionData;

  useEffect(() => {
    if (socket?.hasListeners(GatewayEvent.NOTIFICATION) || !connected) return;

    socket?.on(GatewayEvent.NOTIFICATION, (data: Notification) => {
      // @ts-ignore
      // if (data.discordId === sessionDataRef.current?.user.discordId) return;
      pushNotification(data);
    });
  }, [connected]);
};
