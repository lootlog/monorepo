import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useNotificationPresenter } from "@/features/notifications/hooks/use-notification-presenter";
import { isNotificationMuted } from "@/features/notifications/utils/notification-mutes";
import { useSession } from "@/hooks/auth/use-session";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useCurrentUserNotificationMutes } from "@/hooks/use-current-user-notification-mutes";
import { useBufferedSocketIngress } from "@/hooks/use-buffered-socket-ingress";
import { useGameStore } from "@/store/game.store";
import {
  useNotificationsStore,
  type PartyGatheringNotification,
} from "@/store/notifications.store";
import { useRef } from "react";
import type { PartyGatheringSession } from "@/types/party-gathering";

type PartyGatheringPayload = PartyGatheringSession & { guildId: string };

export const usePartyGatheringSocket = () => {
  const { socket, connected } = useSocket();
  const removeNotification = useNotificationsStore((s) => s.removeNotification);
  const { presentNotifications } = useNotificationPresenter();
  const { data: sessionData } = useSession();
  const { accountId, isReady, settings } =
    useCurrentGameAccountNotificationSettings();
  const { isReady: areMutesReady, mutes } = useCurrentUserNotificationMutes();
  const world = useGameStore((state) => state.game?.world);
  const settingsRef = useRef(settings);
  const mutesRef = useRef(mutes);
  const sessionDataRef = useRef(sessionData);
  const worldRef = useRef(world);
  const processNotificationsRef = useRef<
    (notifications: readonly PartyGatheringPayload[]) => void
  >(() => undefined);

  settingsRef.current = settings;
  mutesRef.current = mutes;
  sessionDataRef.current = sessionData;
  worldRef.current = world;
  processNotificationsRef.current = (notifications) => {
    const requests = notifications.flatMap((data) => {
      if (data.discordId === sessionDataRef.current?.user?.discordId) {
        return [];
      }
      if (isNotificationMuted(data, mutesRef.current)) return [];

      const currentSettings = settingsRef.current;
      const typeSettings = currentSettings?.["party-gathering"];

      if (typeSettings) {
        if (!typeSettings.show) return [];
        if (typeSettings.ignoreOtherWorlds && data.world !== worldRef.current) {
          return [];
        }
        if (
          Array.isArray(typeSettings.guildIds) &&
          !typeSettings.guildIds.includes(data.guildId)
        ) {
          return [];
        }
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

      return [{ notification }];
    });

    presentNotifications(requests);
  };

  useBufferedSocketIngress({
    socket,
    connected,
    accountId,
    isReady: isReady && areMutesReady,
    event: GatewayEvent.PARTY_GATHERING_SEND,
    cancelEvent: GatewayEvent.PARTY_GATHERING_CANCEL,
    onProcessBatch: (notifications: readonly PartyGatheringPayload[]) =>
      processNotificationsRef.current(notifications),
    onCancel: (data: { notificationId: string }) => {
      removeNotification(data.notificationId);
    },
    getPayloadId: (data: PartyGatheringPayload) => data.notificationId,
    getCancelId: (data: { notificationId: string }) => data.notificationId,
  });
};
