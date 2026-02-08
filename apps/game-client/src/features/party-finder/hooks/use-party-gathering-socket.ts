import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useSession } from "@/hooks/auth/use-session";
import { useSoundPlayback } from "@/hooks/use-sound-playback";
import { Game } from "@/lib/game";
import { useNotificationsStore, type PartyGatheringNotification } from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import { useEffect, useRef } from "react";
import type { PartyGatheringSession } from "@/store/party-finder.store";

type PartyGatheringPayload = PartyGatheringSession & { guildId: string };

export const usePartyGatheringSocket = () => {
  const { socket, connected } = useSocket();
  const pushNotification = useNotificationsStore((s) => s.pushNotification);
  const removeNotification = useNotificationsStore((s) => s.removeNotification);
  const setOpen = useWindowsStore((s) => s.setOpen);
  const { data: sessionData } = useSession();
  const { settings: notificationsSettings } = useNotificationsStore();
  const characterId = String(Game.hero.id);
  const settings = notificationsSettings[characterId];
  const world = Game.getWorldName();
  const { playSound } = useSoundPlayback();

  const settingsRef = useRef(settings);
  const sessionDataRef = useRef(sessionData);
  const worldRef = useRef(world);

  settingsRef.current = settings;
  sessionDataRef.current = sessionData;
  worldRef.current = world;

  useEffect(() => {
    if (!socket || !connected) return;

    const handler = (data: PartyGatheringPayload) => {
      if (data.discordId === sessionDataRef.current?.user?.discordId) return;

      const currentSettings = settingsRef.current;
      const typeSettings = currentSettings?.["party-gathering"];

      if (typeSettings) {
        if (!typeSettings.show) return;
        if (typeSettings.ignoreOtherWorlds && data.world !== worldRef.current)
          return;
        if (
          Array.isArray(typeSettings.guildIds) &&
          !typeSettings.guildIds.includes(data.guildId)
        )
          return;
      }

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

      if (typeSettings?.sound) {
        playSound("notifications", "party-gathering");
      }
    };

    const cancelHandler = (data: { notificationId: string }) => {
      removeNotification(data.notificationId);
    };

    socket.on(GatewayEvent.PARTY_GATHERING_SEND, handler);
    socket.on(GatewayEvent.PARTY_GATHERING_CANCEL, cancelHandler);

    return () => {
      socket.off(GatewayEvent.PARTY_GATHERING_SEND, handler);
      socket.off(GatewayEvent.PARTY_GATHERING_CANCEL, cancelHandler);
    };
  }, [socket, connected, pushNotification, removeNotification, setOpen, playSound]);
};
