import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { isNotificationMuted } from "@/features/notifications/utils/notification-mutes";
import { useSession } from "@/hooks/auth/use-session";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useCurrentUserNotificationMutes } from "@/hooks/use-current-user-notification-mutes";
import { useBufferedSocketIngress } from "@/hooks/use-buffered-socket-ingress";
import { Game } from "@/lib/game";
import { useNotificationsStore } from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import type { GameNpc } from "@lootlog/margonem/npcs";
import { useRef } from "react";
import { useSoundPlayback } from "@/hooks/use-sound-playback";
import {
  getNotificationSettingsKey,
  isNotificationSettingsKey,
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
};

export const useNotifications = () => {
  const { connected, socket } = useSocket();
  const pushNotification = useNotificationsStore(
    (state) => state.pushNotification,
  );
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { data: sessionData } = useSession();
  const { accountId, isReady, settings } =
    useCurrentGameAccountNotificationSettings();
  const { isReady: areMutesReady, mutes } = useCurrentUserNotificationMutes();
  const world = Game.getWorldName();
  const { playSound } = useSoundPlayback();
  const settingsRef = useRef(settings);
  const mutesRef = useRef(mutes);
  const sessionDataRef = useRef(sessionData);
  const worldRef = useRef(world);
  const processNotificationRef = useRef<(data: Notification) => void>(
    () => undefined,
  );

  sessionDataRef.current = sessionData;
  mutesRef.current = mutes;
  settingsRef.current = settings;
  worldRef.current = world;
  processNotificationRef.current = (data: Notification) => {
    if (data.discordId === sessionDataRef.current?.user?.discordId) return;

    if (isNotificationMuted(data, mutesRef.current)) {
      return;
    }

    const currentSettings = settingsRef.current;
    const notificationSettingsKey = getNotificationSettingsKey(data);

    if (!isNotificationSettingsKey(notificationSettingsKey)) {
      setOpen("notifications", true);
      pushNotification({ ...data, servers: [data.guildId] });
      return;
    }

    const typeSettings = currentSettings[notificationSettingsKey];

    if (!typeSettings.show) return;
    if (typeSettings.ignoreOtherWorlds && data.world !== worldRef.current)
      return;
    if (!typeSettings.guildIds.includes(data.guildId)) return;

    setOpen("notifications", true);
    pushNotification({ ...data, servers: [data.guildId] });

    if (typeSettings.sound) {
      playSound("notifications", notificationSettingsKey);
    }
  };

  useBufferedSocketIngress({
    socket,
    connected,
    accountId,
    isReady: isReady && areMutesReady,
    event: GatewayEvent.NOTIFICATION,
    onProcess: (data: Notification) => processNotificationRef.current(data),
  });
};
