import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { isNotificationMuted } from "@/features/notifications/utils/notification-mutes";
import { useSession } from "@/hooks/auth/use-session";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useCurrentUserNotificationMutes } from "@/hooks/use-current-user-notification-mutes";
import { useSoundPlayback } from "@/hooks/use-sound-playback";
import { useBufferedSocketIngress } from "@/hooks/use-buffered-socket-ingress";
import { Game } from "@/lib/game";
import {
  useNotificationsStore,
  type PartyGatheringNotification,
} from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import { useRef } from "react";
import type { PartyGatheringSession } from "@/store/party-finder.store";

type PartyGatheringPayload = PartyGatheringSession & { guildId: string };

export const usePartyGatheringSocket = () => {
  const { socket, connected } = useSocket();
  const pushNotification = useNotificationsStore((s) => s.pushNotification);
  const removeNotification = useNotificationsStore((s) => s.removeNotification);
  const setOpen = useWindowsStore((s) => s.setOpen);
  const { data: sessionData } = useSession();
  const { accountId, isReady, settings } =
    useCurrentGameAccountNotificationSettings();
  const { isReady: areMutesReady, mutes } = useCurrentUserNotificationMutes();
  const world = Game.hero ? Game.getWorldName() : undefined;
  const { playSound } = useSoundPlayback();
  const settingsRef = useRef(settings);
  const mutesRef = useRef(mutes);
  const sessionDataRef = useRef(sessionData);
  const worldRef = useRef(world);
  const processNotificationRef = useRef<(data: PartyGatheringPayload) => void>(
    () => undefined,
  );

  settingsRef.current = settings;
  mutesRef.current = mutes;
  sessionDataRef.current = sessionData;
  worldRef.current = world;
  processNotificationRef.current = (data: PartyGatheringPayload) => {
    if (data.discordId === sessionDataRef.current?.user?.discordId) return;
    if (isNotificationMuted(data, mutesRef.current)) return;

    const currentSettings = settingsRef.current;
    const typeSettings = currentSettings?.["party-gathering"];

    if (typeSettings) {
      if (!typeSettings.show) return;
      if (typeSettings.ignoreOtherWorlds && data.world !== worldRef.current) {
        return;
      }
      if (
        Array.isArray(typeSettings.guildIds) &&
        !typeSettings.guildIds.includes(data.guildId)
      ) {
        return;
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

    pushNotification(notification);
    setOpen("notifications", true);

    if (typeSettings?.sound) {
      playSound("notifications", "party-gathering");
    }
  };

  useBufferedSocketIngress({
    socket,
    connected,
    accountId,
    isReady: isReady && areMutesReady,
    event: GatewayEvent.PARTY_GATHERING_SEND,
    cancelEvent: GatewayEvent.PARTY_GATHERING_CANCEL,
    onProcess: (data: PartyGatheringPayload) =>
      processNotificationRef.current(data),
    onCancel: (data: { notificationId: string }) => {
      removeNotification(data.notificationId);
    },
    getPayloadId: (data: PartyGatheringPayload) => data.notificationId,
    getCancelId: (data: { notificationId: string }) => data.notificationId,
  });
};
