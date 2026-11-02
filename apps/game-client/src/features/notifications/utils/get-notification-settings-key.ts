import { NpcType } from "@/api/npcs.api";
import { getNpcType, isHeroTrackerName } from "@lootlog/domain/npc-type";
import type { NotificationType } from "@lootlog/schema/account-preferences";

const notificationSettingsKeys = [
  NpcType.ELITE2,
  NpcType.HERO,
  NpcType.EVENT_HERO,
  NpcType.COLOSSUS,
  NpcType.TITAN,
  NpcType.HERO_TRACKER,
  "message",
  "party-gathering",
] as const satisfies readonly NotificationType[];

const notificationSettingsKeySet = new Set<string>(notificationSettingsKeys);

type NotificationSettingsKeySource = {
  type?: string;
  npc?: {
    wt?: number | null;
    icon?: string;
    isHeroFromEvent?: boolean;
    name?: string;
  } | null;
};

export const isNotificationSettingsKey = (
  key: string,
): key is NotificationType => {
  return notificationSettingsKeySet.has(key);
};

export const getNotificationSettingsKey = (
  notification: NotificationSettingsKeySource,
) => {
  if (notification.type === "party-gathering") {
    return "party-gathering";
  }

  // A Hero Tracker has no weight, which would otherwise mark a plain message.
  if (notification.npc?.name && isHeroTrackerName(notification.npc.name)) {
    return NpcType.HERO_TRACKER;
  }

  if (!notification.npc?.wt) {
    return "message";
  }

  return getNpcType(NpcType, {
    wt: notification.npc.wt,
    icon: notification.npc.icon,
    isHeroFromEvent: notification.npc.isHeroFromEvent,
  });
};
