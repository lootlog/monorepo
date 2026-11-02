import { canReadNotification } from "@/features/notifications/notification-access-policy";
import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useNotificationPresenter } from "@/features/notifications/hooks/use-notification-presenter";
import { isNotificationMuted } from "@/features/notifications/utils/notification-mutes";
import { isOwnNotification } from "@/features/notifications/utils/is-own-notification";
import { useSession } from "@/hooks/auth/use-session";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useCurrentUserNotificationMutes } from "@/features/settings/persistence/use-notification-mutes";
import { useBufferedSocketIngress } from "@/hooks/use-buffered-socket-ingress";
import { useGameStore } from "@/store/game.store";
import type { GameNpc } from "@lootlog/margonem/npcs";
import type { PartyGatheringCharacterBase } from "@/types/party-gathering";
import {
  toLocalEntranceDeadline,
  type HeroTrackerNotificationState,
} from "@/features/notifications/utils/hero-tracker-notification";
import {
  getNotificationSettingsKey,
  isAllowedByNotificationSettings,
} from "@/features/notifications/utils/get-notification-settings-key";

export type Notification = {
  npc?: GameNpc & { location: string; name: string };
  message?: string;
  discordId: string;
  guildId: string;
  notificationId: string;
  world: string;
  createdAt: string;
  isGatheringParty?: boolean;
  /** The organizer character of a party gathering report. */
  character?: PartyGatheringCharacterBase;
  heroTracker?: HeroTrackerNotificationState;
};

export const useNotifications = () => {
  const { connected, socket } = useSocket();
  const { presentNotifications } = useNotificationPresenter();
  const { data: sessionData } = useSession();

  const { accountId, isReady, settings } =
    useCurrentGameAccountNotificationSettings();

  const { isReady: areMutesReady, mutes } = useCurrentUserNotificationMutes();
  const world = useGameStore((state) => state.game?.world ?? "unknown");

  // The ingress keeps the latest callback, so it reads current settings.
  const processNotifications = (notifications: readonly Notification[]) => {
    const requests = notifications.flatMap((data) =>
      isOwnNotification(
        data.discordId,
        sessionData?.user?.discordId,
        data.isGatheringParty ? data.character : undefined,
      ) ||
      isNotificationMuted(data, mutes) ||
      !isAllowedByNotificationSettings(
        data,
        getNotificationSettingsKey(data),
        settings,
        world,
      )
        ? []
        : [
            {
              notification: {
                ...toLocalEntranceDeadline(data),
                servers: [data.guildId],
              },
            },
          ],
    );

    presentNotifications(requests);
  };

  useBufferedSocketIngress({
    socket,
    connected,
    accountId,
    isPayloadAllowed: (notification) =>
      canReadNotification(socket?.getAccessPolicy?.(), notification),
    isReady: isReady && areMutesReady,
    event: GatewayEvent.NOTIFICATION,
    onProcessBatch: processNotifications,
  });
};
