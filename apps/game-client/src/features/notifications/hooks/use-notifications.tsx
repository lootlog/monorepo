import { GatewayEvent } from "@/config/gateway";
import { useSession } from "@/hooks/auth/use-session";
import { useGateway } from "@/hooks/gateway/use-gateway";
import { useGlobalStore } from "@/store/global.store";
import {
  PickedNpcType,
  useNotificationsStore,
} from "@/store/notifications.store";
import { GameNpc } from "@/types/margonem/npcs";
import { getNpcTypeByWt } from "@/utils/game/npcs/get-npc-type-by-wt";
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
  const { characterId, world } = useGlobalStore((state) => state.gameState);
  const { settings } = useNotificationsStore();
  const settingsByNpcType = settings[characterId!];

  const settingsByNpcTypeRef = useRef(settingsByNpcType);
  const sessionDataRef = useRef(sessionData);

  sessionDataRef.current = sessionData;
  settingsByNpcTypeRef.current = settingsByNpcType;

  useEffect(() => {
    if (socket?.hasListeners(GatewayEvent.NOTIFICATION) || !connected) return;

    socket?.on(GatewayEvent.NOTIFICATION, (data: Notification) => {
      const npcType = getNpcTypeByWt(data.npc?.wt!);
      // if (data.discordId === sessionDataRef.current?.user.discordId) return;

      if (
        data.world !== world &&
        settingsByNpcTypeRef.current[npcType as PickedNpcType].ignoreOtherWorlds
      )
        return;

      pushNotification(data);
    });
  }, [connected]);
};
