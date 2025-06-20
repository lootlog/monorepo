import { GatewayEvent } from "@/config/gateway";
import { useGateway } from "@/hooks/gateway/use-gateway";
import { useNotificationsStore } from "@/store/notifications.store";
import { GameNpc } from "@/types/margonem/npcs";
import { useEffect } from "react";

export type Notification = {
  npc?: GameNpc & { location: string };
  message?: string;
  discordId: string;
  guildId: string;
  notificationId: string;
  world: string;
};

export const useNotifications = () => {
  const { socket, connected } = useGateway();
  const { pushNotification } = useNotificationsStore();

  useEffect(() => {
    if (socket?.hasListeners(GatewayEvent.NOTIFICATION) || !connected) return;

    socket?.on(GatewayEvent.NOTIFICATION, (data: Notification) => {
      pushNotification(data);
    });
  }, [connected]);
};
