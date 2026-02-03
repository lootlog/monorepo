import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useNotificationsStore, type PartyGatheringNotification } from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import { useEffect } from "react";
import type { PartyGatheringSession } from "@/store/party-finder.store";

type PartyGatheringPayload = PartyGatheringSession & { guildId: string };

export const usePartyGatheringSocket = () => {
  const { socket, connected } = useSocket();
  const pushNotification = useNotificationsStore((s) => s.pushNotification);
  const setOpen = useWindowsStore((s) => s.setOpen);

  useEffect(() => {
    if (!socket || !connected) return;

    const handler = (data: PartyGatheringPayload) => {
      const notification: PartyGatheringNotification = {
        notificationId: data.notificationId,
        guildId: data.guildId,
        discordId: data.discordId,
        world: data.world,
        createdAt: data.createdAt,
        character: data.character,
        description: data.description,
        minLvl: data.minLvl,
        maxLvl: data.maxLvl,
        servers: [data.guildId],
        type: "party-gathering",
      };

      pushNotification(notification);
      setOpen("notifications", true);
    };

    socket.on(GatewayEvent.PARTY_GATHERING_SEND, handler);
    return () => {
      socket.off(GatewayEvent.PARTY_GATHERING_SEND, handler);
    };
  }, [socket, connected, pushNotification, setOpen]);
};
