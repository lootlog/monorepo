import { NpcType } from "@/api/npcs.api";
import { getNpcType, isHeroTrackerName } from "@lootlog/domain/npc-type";
import type {
  NotificationType,
  NotificationsSettings,
} from "@lootlog/schema/account-preferences";

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

/**
 * Whether the game account's settings let a notification through: its
 * category is shown, it comes from this world when the category is limited to
 * it, and its Lootlog is one the account receives from.
 */
export const isAllowedByNotificationSettings = (
  notification: { guildId: string; world: string },
  settingsKey: string,
  settings: Partial<NotificationsSettings>,
  world: string | undefined,
) => {
  const categorySettings = isNotificationSettingsKey(settingsKey)
    ? settings[settingsKey]
    : undefined;

  if (categorySettings) {
    if (!categorySettings.show) return false;

    if (categorySettings.ignoreOtherWorlds && notification.world !== world) {
      return false;
    }
  }

  return settings.guildIds?.includes(notification.guildId) !== false;
};
