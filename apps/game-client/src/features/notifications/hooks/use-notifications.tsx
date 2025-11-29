import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useSession } from "@/hooks/auth/use-session";
import { Game } from "@/lib/game";
import { useNotificationsStore } from "@/store/notifications.store";
import type { GameNpc } from "@/types/margonem/npcs";
import { useEffect, useRef } from "react";
import { getNpcTypeByWt } from "@/utils/game/npcs/get-npc-type-by-wt";
import { useSoundPlayback } from "@/hooks/use-sound-playback";

export type Notification = {
  npc?: GameNpc & { location: string; name: string };
  message?: string;
  discordId: string;
  guildId: string;
  notificationId: string;
  world: string;
  createdAt: string;
};

const getNotificationType = (n: Notification) => {
  if (!n.npc || !n.npc.wt) return "message" as const;
  return getNpcTypeByWt(n.npc.wt);
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
  const world = Game.getWorldName();

  const { playSound } = useSoundPlayback();

  const settingsRef = useRef(settings);
  const sessionDataRef = useRef(sessionData);
  const worldRef = useRef(world);

  sessionDataRef.current = sessionData;
  settingsRef.current = settings;
  worldRef.current = world;

  useEffect(() => {
    if (socket?.hasListeners(GatewayEvent.NOTIFICATION) || !connected) return;

    socket?.on(GatewayEvent.NOTIFICATION, (data: Notification) => {
      // if (data.discordId === sessionDataRef.current?.user?.discordId) return;

      const currentSettings = settingsRef.current;
      if (!currentSettings) {
        pushNotification({ ...data, servers: [data.guildId] });
        return;
      }

      const notificationType = getNotificationType(data);
      const typeSettings =
        currentSettings[notificationType as keyof typeof currentSettings];

      if (!typeSettings) {
        pushNotification({ ...data, servers: [data.guildId] });
        return;
      }

      if (!typeSettings.show) return;
      if (typeSettings.ignoreOtherWorlds && data.world !== worldRef.current)
        return;
      if (!typeSettings.guildIds.includes(data.guildId)) return;

      pushNotification({ ...data, servers: [data.guildId] });

      if (typeSettings.sound) {
        playSound("notifications", notificationType);
        console.log("Playing sound for notification", notificationType);
      }
    });
  }, [connected, socket, pushNotification, playSound]);
};
