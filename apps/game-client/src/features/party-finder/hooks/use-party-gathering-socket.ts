import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { isNotificationMuted } from "@/features/notifications/utils/notification-mutes";
import { useSession } from "@/hooks/auth/use-session";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useCurrentUserNotificationMutes } from "@/hooks/use-current-user-notification-mutes";
import { useSoundPlayback } from "@/hooks/use-sound-playback";
import { Game } from "@/lib/game";
import {
  useNotificationsStore,
  type PartyGatheringNotification,
} from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import { useEffect, useRef } from "react";
import type { PartyGatheringSession } from "@/store/party-finder.store";

type PartyGatheringPayload = PartyGatheringSession & { guildId: string };

const MAX_PENDING_NOTIFICATIONS = 100;
const MAX_PENDING_CANCELLED_NOTIFICATION_IDS = 100;

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

  const isReadyRef = useRef(isReady);
  const areMutesReadyRef = useRef(areMutesReady);
  const settingsRef = useRef(settings);
  const mutesRef = useRef(mutes);
  const sessionDataRef = useRef(sessionData);
  const worldRef = useRef(world);
  const pendingNotificationsRef = useRef<PartyGatheringPayload[]>([]);
  const cancelledNotificationIdsRef = useRef<Set<string>>(new Set());
  const previousAccountIdRef = useRef<string | null>(accountId);
  const processNotificationRef = useRef<(data: PartyGatheringPayload) => void>(
    () => undefined,
  );

  isReadyRef.current = isReady;
  areMutesReadyRef.current = areMutesReady;
  settingsRef.current = settings;
  mutesRef.current = mutes;
  sessionDataRef.current = sessionData;
  worldRef.current = world;
  processNotificationRef.current = (data: PartyGatheringPayload) => {
    if (cancelledNotificationIdsRef.current.has(data.notificationId)) {
      cancelledNotificationIdsRef.current.delete(data.notificationId);
      return;
    }

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

  useEffect(() => {
    if (
      previousAccountIdRef.current !== null &&
      previousAccountIdRef.current !== accountId
    ) {
      pendingNotificationsRef.current = [];
      cancelledNotificationIdsRef.current.clear();
    }

    previousAccountIdRef.current = accountId;
  }, [accountId]);

  useEffect(() => {
    if (!socket || !connected) return;

    const handler = (data: PartyGatheringPayload) => {
      if (!isReadyRef.current || !areMutesReadyRef.current) {
        if (
          pendingNotificationsRef.current.length >= MAX_PENDING_NOTIFICATIONS
        ) {
          pendingNotificationsRef.current.shift();
        }

        pendingNotificationsRef.current.push(data);
        return;
      }

      processNotificationRef.current(data);
    };

    const cancelHandler = (data: { notificationId: string }) => {
      if (!isReadyRef.current || !areMutesReadyRef.current) {
        if (
          cancelledNotificationIdsRef.current.size >=
          MAX_PENDING_CANCELLED_NOTIFICATION_IDS
        ) {
          const oldestNotificationId = cancelledNotificationIdsRef.current
            .values()
            .next().value;

          if (oldestNotificationId) {
            cancelledNotificationIdsRef.current.delete(oldestNotificationId);
          }
        }

        cancelledNotificationIdsRef.current.add(data.notificationId);
        pendingNotificationsRef.current =
          pendingNotificationsRef.current.filter(
            (pendingNotification) =>
              pendingNotification.notificationId !== data.notificationId,
          );
        return;
      }

      removeNotification(data.notificationId);
    };

    socket.on(GatewayEvent.PARTY_GATHERING_SEND, handler);
    socket.on(GatewayEvent.PARTY_GATHERING_CANCEL, cancelHandler);

    return () => {
      socket.off(GatewayEvent.PARTY_GATHERING_SEND, handler);
      socket.off(GatewayEvent.PARTY_GATHERING_CANCEL, cancelHandler);
    };
  }, [
    socket,
    connected,
    pushNotification,
    removeNotification,
    setOpen,
    playSound,
  ]);

  useEffect(() => {
    if (
      !isReady ||
      !areMutesReady ||
      pendingNotificationsRef.current.length === 0
    ) {
      return;
    }

    const pendingNotifications = pendingNotificationsRef.current.filter(
      (notification) =>
        !cancelledNotificationIdsRef.current.has(notification.notificationId),
    );

    pendingNotificationsRef.current = [];
    cancelledNotificationIdsRef.current.clear();

    pendingNotifications.forEach((notification) => {
      processNotificationRef.current(notification);
    });
  }, [areMutesReady, isReady]);
};
