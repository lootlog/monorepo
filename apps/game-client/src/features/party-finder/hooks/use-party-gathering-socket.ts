import { canReadNotification } from "@/features/notifications/notification-access-policy";
import { useSocket } from "@/contexts/socket-context";
import { useNotificationPresenter } from "@/features/notifications/hooks/use-notification-presenter";
import { isNotificationMuted } from "@/features/notifications/utils/notification-mutes";
import { isOwnNotification } from "@/features/notifications/utils/is-own-notification";
import { isAllowedByNotificationSettings } from "@/features/notifications/utils/get-notification-settings-key";
import { useSession } from "@/hooks/auth/use-session";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useCurrentUserNotificationMutes } from "@/features/settings/persistence/use-notification-mutes";
import { useBufferedSocketIngress } from "@/hooks/use-buffered-socket-ingress";
import { useGameStore } from "@/store/game.store";
import {
  useNotificationsStore,
  type PartyGatheringNotification,
} from "@/store/notifications.store";
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

  // The ingress keeps the latest callback, so it reads current settings.
  const processNotifications = (
    notifications: readonly PartyGatheringPayload[],
  ) => {
    const requests = notifications.flatMap((data) => {
      if (
        isOwnNotification(
          data.discordId,
          sessionData?.user?.discordId,
          data.character,
        ) ||
        isNotificationMuted(data, mutes) ||
        !isAllowedByNotificationSettings(
          data,
          "party-gathering",
          settings,
          world,
        )
      ) {
        return [];
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
    isPayloadAllowed: (notification) =>
      canReadNotification(socket?.getAccessPolicy?.(), notification),
    isReady: isReady && areMutesReady,
    event: "party-gathering.updated",
    cancelEvent: "party-gathering.cancelled",
    onProcessBatch: processNotifications,
    onCancel: (data: { notificationId: string }) => {
      removeNotification(data.notificationId);
    },
    getPayloadId: (data: PartyGatheringPayload) => data.notificationId,
    getCancelId: (data: { notificationId: string }) => data.notificationId,
  });
};
